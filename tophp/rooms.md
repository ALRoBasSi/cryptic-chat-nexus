
# صفحة إدارة غرف الدردشة

**الوصف**: صفحة إدارة غرف الدردشة للمسؤول، تتيح عرض وإضافة وتعديل وحذف الغرف وتعيين الصلاحيات عليها.

**المسار**: `/pages/admin/rooms.php`

## الكود الكامل

```php
<?php
/**
 * صفحة إدارة غرف الدردشة
 * تتيح للمسؤول عرض، إضافة، تعديل، وحذف غرف الدردشة وتعيين الصلاحيات عليها
 */

// تضمين ملفات التكوين والدوال
require_once '../../includes/config.php';
require_once '../../includes/auth_functions.php';
require_once '../../includes/admin_functions.php';
require_once '../../includes/general_functions.php';

// بدء الجلسة والتحقق من تسجيل الدخول وصلاحيات المسؤول
session_start();
checkLogin();
checkAdmin();

// تعريف المتغيرات الأولية
$search = '';
$current_page = 1;
$records_per_page = 10;
$sort_by = 'name';
$sort_order = 'ASC';
$status_filter = '';

// معالجة البحث والتصفية والترتيب
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // معالجة مصطلح البحث
    if (isset($_GET['search'])) {
        $search = cleanInput($_GET['search']);
    }
    
    // معالجة رقم الصفحة
    if (isset($_GET['page']) && is_numeric($_GET['page'])) {
        $current_page = (int) $_GET['page'];
    }
    
    // معالجة الترتيب
    if (isset($_GET['sort_by']) && in_array($_GET['sort_by'], ['name', 'users_count', 'messages_count', 'created_at'])) {
        $sort_by = $_GET['sort_by'];
    }
    
    if (isset($_GET['sort_order']) && in_array(strtoupper($_GET['sort_order']), ['ASC', 'DESC'])) {
        $sort_order = strtoupper($_GET['sort_order']);
    }
    
    // معالجة تصفية الحالة
    if (isset($_GET['status']) && in_array($_GET['status'], ['active', 'inactive', ''])) {
        $status_filter = $_GET['status'];
    }
}

// حذف غرفة إذا تم طلب ذلك
if (isset($_GET['action']) && $_GET['action'] === 'delete' && isset($_GET['id'])) {
    $room_id = (int) $_GET['id'];
    
    // محاولة حذف الغرفة
    if (deleteRoom($room_id)) {
        setFlashMessage('success', 'تم حذف الغرفة ورسائلها بنجاح');
    } else {
        setFlashMessage('error', 'فشل في حذف الغرفة');
    }
    
    // إعادة التوجيه لتجنب إعادة العملية عند تحديث الصفحة
    redirect('rooms.php');
}

// تغيير حالة الغرفة إذا تم طلب ذلك
if (isset($_GET['action']) && $_GET['action'] === 'toggle_status' && isset($_GET['id'])) {
    $room_id = (int) $_GET['id'];
    
    // محاولة تغيير حالة الغرفة
    if (toggleRoomStatus($room_id)) {
        setFlashMessage('success', 'تم تغيير حالة الغرفة بنجاح');
    } else {
        setFlashMessage('error', 'فشل في تغيير حالة الغرفة');
    }
    
    // إعادة التوجيه لتجنب إعادة العملية عند تحديث الصفحة
    redirect('rooms.php');
}

// الحصول على قائمة الغرف مع الترتيب والتصفية والبحث
$rooms_data = getRooms($search, $current_page, $records_per_page, $sort_by, $sort_order, $status_filter);
$rooms = $rooms_data['rooms'];
$total_rooms = $rooms_data['total'];

// حساب عدد الصفحات
$total_pages = ceil($total_rooms / $records_per_page);

// التحقق من عدم تجاوز رقم الصفحة المطلوب للعدد الإجمالي للصفحات
if ($current_page > $total_pages && $total_pages > 0) {
    redirect("rooms.php?page={$total_pages}");
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إدارة غرف الدردشة - نظام الدردشة المشفر</title>
    
    <!-- Bootstrap RTL CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- ملف CSS الخاص بالنظام -->
    <link rel="stylesheet" href="../../assets/css/admin.css">
    
    <!-- سكريبت للتأكيد قبل الحذف -->
    <script>
        function confirmDelete(roomName) {
            return confirm(`هل أنت متأكد من رغبتك في حذف غرفة "${roomName}"؟ سيتم حذف جميع الرسائل المرتبطة بها. هذا الإجراء لا يمكن التراجع عنه.`);
        }
    </script>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- تضمين القائمة الجانبية -->
            <?php include '../../includes/admin_sidebar.php'; ?>
            
            <!-- المحتوى الرئيسي -->
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2"><i class="fas fa-comments me-2"></i>إدارة الغرف</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <a href="room_add.php" class="btn btn-sm btn-primary">
                            <i class="fas fa-plus-circle me-1"></i> إنشاء غرفة جديدة
                        </a>
                    </div>
                </div>
                
                <!-- عرض رسائل النظام -->
                <?php displayFlashMessages(); ?>
                
                <!-- نموذج البحث والتصفية -->
                <div class="card mb-4">
                    <div class="card-body">
                        <form method="GET" action="" class="row g-3">
                            <div class="col-md-4">
                                <label for="search" class="form-label">بحث</label>
                                <input type="text" class="form-control" id="search" name="search" placeholder="اسم الغرفة أو الوصف..." value="<?php echo htmlspecialchars($search); ?>">
                            </div>
                            
                            <div class="col-md-2">
                                <label for="status" class="form-label">الحالة</label>
                                <select class="form-select" id="status" name="status">
                                    <option value="" <?php echo $status_filter === '' ? 'selected' : ''; ?>>جميع الغرف</option>
                                    <option value="active" <?php echo $status_filter === 'active' ? 'selected' : ''; ?>>نشطة</option>
                                    <option value="inactive" <?php echo $status_filter === 'inactive' ? 'selected' : ''; ?>>غير نشطة</option>
                                </select>
                            </div>
                            
                            <div class="col-md-3">
                                <label for="sort_by" class="form-label">ترتيب حسب</label>
                                <select class="form-select" id="sort_by" name="sort_by">
                                    <option value="name" <?php echo $sort_by === 'name' ? 'selected' : ''; ?>>اسم الغرفة</option>
                                    <option value="users_count" <?php echo $sort_by === 'users_count' ? 'selected' : ''; ?>>عدد المستخدمين</option>
                                    <option value="messages_count" <?php echo $sort_by === 'messages_count' ? 'selected' : ''; ?>>عدد الرسائل</option>
                                    <option value="created_at" <?php echo $sort_by === 'created_at' ? 'selected' : ''; ?>>تاريخ الإنشاء</option>
                                </select>
                            </div>
                            
                            <div class="col-md-2">
                                <label for="sort_order" class="form-label">اتجاه الترتيب</label>
                                <select class="form-select" id="sort_order" name="sort_order">
                                    <option value="ASC" <?php echo $sort_order === 'ASC' ? 'selected' : ''; ?>>تصاعدي</option>
                                    <option value="DESC" <?php echo $sort_order === 'DESC' ? 'selected' : ''; ?>>تنازلي</option>
                                </select>
                            </div>
                            
                            <div class="col-md-1 d-flex align-items-end">
                                <button type="submit" class="btn btn-primary w-100">تطبيق</button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- جدول الغرف -->
                <div class="card mb-4">
                    <div class="card-header bg-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">قائمة الغرف</h5>
                        <span class="badge bg-primary"><?php echo $total_rooms; ?> غرفة</span>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th scope="col">#</th>
                                        <th scope="col">الغرفة</th>
                                        <th scope="col">المستخدمين</th>
                                        <th scope="col">الرسائل</th>
                                        <th scope="col">تاريخ الإنشاء</th>
                                        <th scope="col">الحالة</th>
                                        <th scope="col">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if (empty($rooms)): ?>
                                        <tr>
                                            <td colspan="7" class="text-center py-4">
                                                <p class="text-muted mb-0">لا توجد غرف متاحة</p>
                                            </td>
                                        </tr>
                                    <?php else: ?>
                                        <?php foreach ($rooms as $index => $room): ?>
                                            <tr>
                                                <td><?php echo ($current_page - 1) * $records_per_page + $index + 1; ?></td>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <div class="avatar me-2 bg-primary text-white rounded-circle text-center" style="width: 40px; height: 40px; line-height: 40px;">
                                                            <i class="fas fa-comments"></i>
                                                        </div>
                                                        <div>
                                                            <div class="fw-bold"><?php echo htmlspecialchars($room['name']); ?></div>
                                                            <div class="small text-muted">
                                                                <?php
                                                                $description = htmlspecialchars($room['description']);
                                                                echo strlen($description) > 50 ? substr($description, 0, 50) . '...' : $description;
                                                                ?>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="badge bg-info rounded-pill">
                                                        <i class="fas fa-users me-1"></i>
                                                        <?php echo $room['users_count']; ?>
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="badge bg-secondary rounded-pill">
                                                        <i class="fas fa-envelope me-1"></i>
                                                        <?php echo $room['messages_count']; ?>
                                                    </span>
                                                </td>
                                                <td>
                                                    <i class="far fa-calendar-alt me-1 text-muted"></i>
                                                    <?php echo formatDate($room['created_at']); ?>
                                                </td>
                                                <td>
                                                    <?php if ($room['is_active']): ?>
                                                        <span class="badge bg-success">نشطة</span>
                                                    <?php else: ?>
                                                        <span class="badge bg-danger">غير نشطة</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td>
                                                    <div class="btn-group btn-group-sm">
                                                        <!-- زر الانتقال إلى الغرفة -->
                                                        <a href="../chat/room.php?id=<?php echo $room['id']; ?>" class="btn btn-outline-secondary" title="عرض الغرفة" target="_blank">
                                                            <i class="fas fa-eye"></i>
                                                        </a>
                                                        
                                                        <!-- زر تعديل الغرفة -->
                                                        <a href="room_edit.php?id=<?php echo $room['id']; ?>" class="btn btn-outline-primary" title="تعديل">
                                                            <i class="fas fa-edit"></i>
                                                        </a>
                                                        
                                                        <!-- زر تبديل حالة الغرفة -->
                                                        <a href="rooms.php?action=toggle_status&id=<?php echo $room['id']; ?>" class="btn btn-outline-<?php echo $room['is_active'] ? 'warning' : 'success'; ?>" title="<?php echo $room['is_active'] ? 'تعطيل' : 'تفعيل'; ?>">
                                                            <i class="fas fa-<?php echo $room['is_active'] ? 'pause' : 'play'; ?>"></i>
                                                        </a>
                                                        
                                                        <!-- زر إدارة المستخدمين في الغرفة -->
                                                        <a href="room_users.php?id=<?php echo $room['id']; ?>" class="btn btn-outline-info" title="إدارة المستخدمين">
                                                            <i class="fas fa-user-cog"></i>
                                                        </a>
                                                        
                                                        <!-- زر حذف الغرفة -->
                                                        <a href="rooms.php?action=delete&id=<?php echo $room['id']; ?>" class="btn btn-outline-danger" 
                                                           onclick="return confirmDelete('<?php echo htmlspecialchars($room['name']); ?>')" title="حذف">
                                                            <i class="fas fa-trash-alt"></i>
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- ترقيم الصفحات -->
                    <?php if ($total_pages > 1): ?>
                        <div class="card-footer bg-white">
                            <nav aria-label="Page navigation">
                                <ul class="pagination justify-content-center mb-0">
                                    <!-- زر الصفحة السابقة -->
                                    <li class="page-item <?php echo $current_page <= 1 ? 'disabled' : ''; ?>">
                                        <a class="page-link" href="?page=<?php echo $current_page - 1; ?>&search=<?php echo urlencode($search); ?>&status=<?php echo $status_filter; ?>&sort_by=<?php echo $sort_by; ?>&sort_order=<?php echo $sort_order; ?>" aria-label="السابق">
                                            <span aria-hidden="true">&laquo;</span>
                                        </a>
                                    </li>
                                    
                                    <!-- أرقام الصفحات -->
                                    <?php
                                    $start_page = max(1, $current_page - 2);
                                    $end_page = min($total_pages, $current_page + 2);
                                    
                                    // إضافة الصفحة الأولى إذا لم تكن مرئية
                                    if ($start_page > 1):
                                    ?>
                                        <li class="page-item">
                                            <a class="page-link" href="?page=1&search=<?php echo urlencode($search); ?>&status=<?php echo $status_filter; ?>&sort_by=<?php echo $sort_by; ?>&sort_order=<?php echo $sort_order; ?>">1</a>
                                        </li>
                                        <?php if ($start_page > 2): ?>
                                            <li class="page-item disabled">
                                                <span class="page-link">...</span>
                                            </li>
                                        <?php endif; ?>
                                    <?php endif; ?>
                                    
                                    <!-- عرض أرقام الصفحات المحيطة بالصفحة الحالية -->
                                    <?php for ($i = $start_page; $i <= $end_page; $i++): ?>
                                        <li class="page-item <?php echo $i == $current_page ? 'active' : ''; ?>">
                                            <a class="page-link" href="?page=<?php echo $i; ?>&search=<?php echo urlencode($search); ?>&status=<?php echo $status_filter; ?>&sort_by=<?php echo $sort_by; ?>&sort_order=<?php echo $sort_order; ?>"><?php echo $i; ?></a>
                                        </li>
                                    <?php endfor; ?>
                                    
                                    <!-- إضافة الصفحة الأخيرة إذا لم تكن مرئية -->
                                    <?php if ($end_page < $total_pages): ?>
                                        <?php if ($end_page < $total_pages - 1): ?>
                                            <li class="page-item disabled">
                                                <span class="page-link">...</span>
                                            </li>
                                        <?php endif; ?>
                                        <li class="page-item">
                                            <a class="page-link" href="?page=<?php echo $total_pages; ?>&search=<?php echo urlencode($search); ?>&status=<?php echo $status_filter; ?>&sort_by=<?php echo $sort_by; ?>&sort_order=<?php echo $sort_order; ?>"><?php echo $total_pages; ?></a>
                                        </li>
                                    <?php endif; ?>
                                    
                                    <!-- زر الصفحة التالية -->
                                    <li class="page-item <?php echo $current_page >= $total_pages ? 'disabled' : ''; ?>">
                                        <a class="page-link" href="?page=<?php echo $current_page + 1; ?>&search=<?php echo urlencode($search); ?>&status=<?php echo $status_filter; ?>&sort_by=<?php echo $sort_by; ?>&sort_order=<?php echo $sort_order; ?>" aria-label="التالي">
                                            <span aria-hidden="true">&raquo;</span>
                                        </a>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    <?php endif; ?>
                </div>
                
                <!-- تذييل الصفحة -->
                <footer class="mt-5">
                    <div class="text-center">
                        <p class="text-muted small">
                            &copy; <?php echo date('Y'); ?> نظام الدردشة المشفر - جميع الحقوق محفوظة
                        </p>
                    </div>
                </footer>
            </main>
        </div>
    </div>
    
    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **ملفات الدوال المطلوبة**:
   - `includes/admin_functions.php`: يحتوي على دوال خاصة بإدارة الغرف مثل:
     - `getRooms()`: لجلب قائمة الغرف مع دعم البحث والتصفية والترتيب
     - `deleteRoom()`: لحذف غرفة ورسائلها
     - `toggleRoomStatus()`: لتفعيل أو تعطيل غرفة
   
   - `includes/general_functions.php`: يحتوي على دوال عامة مثل:
     - `formatDate()`: لتنسيق التاريخ والوقت
     - `displayFlashMessages()`: لعرض رسائل النظام

2. **ملفات القوالب**:
   - `includes/admin_sidebar.php`: قالب القائمة الجانبية للمسؤول

3. **صفحات إضافية مرتبطة**:
   - `pages/admin/room_add.php`: لإنشاء غرفة جديدة
   - `pages/admin/room_edit.php`: لتعديل معلومات غرفة موجودة
   - `pages/admin/room_users.php`: لإدارة المستخدمين في الغرفة
   - `pages/chat/room.php`: لعرض صفحة الغرفة للدردشة

4. **ملاحظات مهمة**:
   - تم إضافة ميزة تبديل حالة الغرفة (نشطة/غير نشطة) بدلاً من حذفها مباشرة.
   - تم إضافة زر لإدارة المستخدمين في الغرفة لسهولة تعيين الصلاحيات.
