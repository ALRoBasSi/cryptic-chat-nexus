
# صفحة إدارة المستخدمين

**الوصف**: صفحة إدارة المستخدمين للمسؤول، تتيح عرض وإضافة وتعديل وحذف المستخدمين وتعيين صلاحياتهم.

**المسار**: `/pages/admin/users.php`

## الكود الكامل

```php
<?php
/**
 * صفحة إدارة المستخدمين
 * تتيح للمسؤول عرض، إضافة، تعديل، وحذف المستخدمين وتعيين صلاحياتهم
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
$sort_by = 'username';
$sort_order = 'ASC';
$role_filter = '';

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
    if (isset($_GET['sort_by']) && in_array($_GET['sort_by'], ['username', 'full_name', 'email', 'role', 'last_login', 'created_at'])) {
        $sort_by = $_GET['sort_by'];
    }
    
    if (isset($_GET['sort_order']) && in_array(strtoupper($_GET['sort_order']), ['ASC', 'DESC'])) {
        $sort_order = strtoupper($_GET['sort_order']);
    }
    
    // معالجة تصفية الدور
    if (isset($_GET['role']) && in_array($_GET['role'], ['admin', 'client', ''])) {
        $role_filter = $_GET['role'];
    }
}

// حذف مستخدم إذا تم طلب ذلك
if (isset($_GET['action']) && $_GET['action'] === 'delete' && isset($_GET['id'])) {
    $user_id = (int) $_GET['id'];
    
    // التحقق من عدم حذف المستخدم نفسه
    if ($user_id === (int) $_SESSION['user_id']) {
        setFlashMessage('error', 'لا يمكنك حذف حسابك الخاص!');
    } else {
        // محاولة حذف المستخدم
        if (deleteUser($user_id)) {
            setFlashMessage('success', 'تم حذف المستخدم بنجاح');
        } else {
            setFlashMessage('error', 'فشل في حذف المستخدم');
        }
    }
    
    // إعادة التوجيه لتجنب إعادة العملية عند تحديث الصفحة
    redirect('users.php');
}

// الحصول على قائمة المستخدمين مع الترتيب والتصفية والبحث
$users_data = getUsers($search, $current_page, $records_per_page, $sort_by, $sort_order, $role_filter);
$users = $users_data['users'];
$total_users = $users_data['total'];

// حساب عدد الصفحات
$total_pages = ceil($total_users / $records_per_page);

// التحقق من عدم تجاوز رقم الصفحة المطلوب للعدد الإجمالي للصفحات
if ($current_page > $total_pages && $total_pages > 0) {
    redirect("users.php?page={$total_pages}");
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إدارة المستخدمين - نظام الدردشة المشفر</title>
    
    <!-- Bootstrap RTL CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- ملف CSS الخاص بالنظام -->
    <link rel="stylesheet" href="../../assets/css/admin.css">
    
    <!-- سكريبت للتأكيد قبل الحذف -->
    <script>
        function confirmDelete(username) {
            return confirm(`هل أنت متأكد من رغبتك في حذف المستخدم "${username}"؟ هذا الإجراء لا يمكن التراجع عنه.`);
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
                    <h1 class="h2"><i class="fas fa-users me-2"></i>إدارة المستخدمين</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <a href="user_add.php" class="btn btn-sm btn-primary">
                            <i class="fas fa-user-plus me-1"></i> إضافة مستخدم جديد
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
                                <input type="text" class="form-control" id="search" name="search" placeholder="اسم المستخدم، البريد الإلكتروني، الاسم..." value="<?php echo htmlspecialchars($search); ?>">
                            </div>
                            
                            <div class="col-md-3">
                                <label for="role" class="form-label">الدور</label>
                                <select class="form-select" id="role" name="role">
                                    <option value="" <?php echo $role_filter === '' ? 'selected' : ''; ?>>جميع الأدوار</option>
                                    <option value="admin" <?php echo $role_filter === 'admin' ? 'selected' : ''; ?>>مسؤول</option>
                                    <option value="client" <?php echo $role_filter === 'client' ? 'selected' : ''; ?>>مستخدم عادي</option>
                                </select>
                            </div>
                            
                            <div class="col-md-2">
                                <label for="sort_by" class="form-label">ترتيب حسب</label>
                                <select class="form-select" id="sort_by" name="sort_by">
                                    <option value="username" <?php echo $sort_by === 'username' ? 'selected' : ''; ?>>اسم المستخدم</option>
                                    <option value="full_name" <?php echo $sort_by === 'full_name' ? 'selected' : ''; ?>>الاسم الكامل</option>
                                    <option value="email" <?php echo $sort_by === 'email' ? 'selected' : ''; ?>>البريد الإلكتروني</option>
                                    <option value="role" <?php echo $sort_by === 'role' ? 'selected' : ''; ?>>الدور</option>
                                    <option value="last_login" <?php echo $sort_by === 'last_login' ? 'selected' : ''; ?>>آخر تسجيل دخول</option>
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
                
                <!-- جدول المستخدمين -->
                <div class="card mb-4">
                    <div class="card-header bg-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">قائمة المستخدمين</h5>
                        <span class="badge bg-primary"><?php echo $total_users; ?> مستخدم</span>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th scope="col">#</th>
                                        <th scope="col">المستخدم</th>
                                        <th scope="col">البريد الإلكتروني</th>
                                        <th scope="col">الدور</th>
                                        <th scope="col">آخر تسجيل دخول</th>
                                        <th scope="col">الحالة</th>
                                        <th scope="col">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if (empty($users)): ?>
                                        <tr>
                                            <td colspan="7" class="text-center py-4">
                                                <p class="text-muted mb-0">لا توجد نتائج مطابقة لبحثك</p>
                                            </td>
                                        </tr>
                                    <?php else: ?>
                                        <?php foreach ($users as $index => $user): ?>
                                            <tr>
                                                <td><?php echo ($current_page - 1) * $records_per_page + $index + 1; ?></td>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <div class="avatar me-2 bg-primary text-white rounded-circle text-center" style="width: 40px; height: 40px; line-height: 40px;">
                                                            <?php echo substr($user['username'], 0, 1); ?>
                                                        </div>
                                                        <div>
                                                            <div class="fw-bold"><?php echo htmlspecialchars($user['username']); ?></div>
                                                            <div class="small text-muted"><?php echo htmlspecialchars($user['full_name']); ?></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><?php echo htmlspecialchars($user['email']); ?></td>
                                                <td>
                                                    <?php if ($user['role'] === 'admin'): ?>
                                                        <span class="badge bg-danger">مسؤول</span>
                                                    <?php else: ?>
                                                        <span class="badge bg-info">مستخدم عادي</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td>
                                                    <?php
                                                    if (!empty($user['last_login'])) {
                                                        echo formatTimeAgo($user['last_login']);
                                                    } else {
                                                        echo '<span class="text-muted">لم يسجل الدخول بعد</span>';
                                                    }
                                                    ?>
                                                </td>
                                                <td>
                                                    <?php if ($user['is_active']): ?>
                                                        <span class="badge bg-success">نشط</span>
                                                    <?php else: ?>
                                                        <span class="badge bg-secondary">غير نشط</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td>
                                                    <div class="btn-group btn-group-sm">
                                                        <a href="user_edit.php?id=<?php echo $user['id']; ?>" class="btn btn-outline-primary" title="تعديل">
                                                            <i class="fas fa-edit"></i>
                                                        </a>
                                                        <?php if ((int) $user['id'] !== (int) $_SESSION['user_id']): ?>
                                                            <a href="users.php?action=delete&id=<?php echo $user['id']; ?>" class="btn btn-outline-danger" 
                                                               onclick="return confirmDelete('<?php echo htmlspecialchars($user['username']); ?>')" title="حذف">
                                                                <i class="fas fa-trash-alt"></i>
                                                            </a>
                                                        <?php else: ?>
                                                            <button class="btn btn-outline-danger" disabled title="لا يمكن حذف حسابك الخاص">
                                                                <i class="fas fa-trash-alt"></i>
                                                            </button>
                                                        <?php endif; ?>
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
                                        <a class="page-link" href="?page=<?php echo $current_page - 1; ?>&search=<?php echo urlencode($search); ?>&role=<?php echo $role_filter; ?>&sort_by=<?php echo $sort_by; ?>&sort_order=<?php echo $sort_order; ?>" aria-label="السابق">
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
                                            <a class="page-link" href="?page=1&search=<?php echo urlencode($search); ?>&role=<?php echo $role_filter; ?>&sort_by=<?php echo $sort_by; ?>&sort_order=<?php echo $sort_order; ?>">1</a>
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
                                            <a class="page-link" href="?page=<?php echo $i; ?>&search=<?php echo urlencode($search); ?>&role=<?php echo $role_filter; ?>&sort_by=<?php echo $sort_by; ?>&sort_order=<?php echo $sort_order; ?>"><?php echo $i; ?></a>
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
                                            <a class="page-link" href="?page=<?php echo $total_pages; ?>&search=<?php echo urlencode($search); ?>&role=<?php echo $role_filter; ?>&sort_by=<?php echo $sort_by; ?>&sort_order=<?php echo $sort_order; ?>"><?php echo $total_pages; ?></a>
                                        </li>
                                    <?php endif; ?>
                                    
                                    <!-- زر الصفحة التالية -->
                                    <li class="page-item <?php echo $current_page >= $total_pages ? 'disabled' : ''; ?>">
                                        <a class="page-link" href="?page=<?php echo $current_page + 1; ?>&search=<?php echo urlencode($search); ?>&role=<?php echo $role_filter; ?>&sort_by=<?php echo $sort_by; ?>&sort_order=<?php echo $sort_order; ?>" aria-label="التالي">
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
   - `includes/admin_functions.php`: يحتوي على دوال خاصة بإدارة المستخدمين مثل:
     - `getUsers()`: لجلب قائمة المستخدمين مع دعم البحث والتصفية والترتيب
     - `deleteUser()`: لحذف مستخدم
   
   - `includes/general_functions.php`: يحتوي على دوال عامة مثل:
     - `formatTimeAgo()`: لتنسيق الوقت المنقضي بصيغة "منذ × دقيقة"
     - `displayFlashMessages()`: لعرض رسائل النظام

2. **ملفات القوالب**:
   - `includes/admin_sidebar.php`: قالب القائمة الجانبية للمسؤول

3. **صفحات إضافية مرتبطة**:
   - `pages/admin/user_add.php`: لإضافة مستخدم جديد
   - `pages/admin/user_edit.php`: لتعديل بيانات مستخدم موجود

4. **ملاحظات مهمة**:
   - تم إضافة دعم للبحث والتصفية والترتيب والتقسيم إلى صفحات لسهولة التعامل مع قوائم كبيرة من المستخدمين.
   - تم التحقق من عدم حذف المستخدم لحسابه الخاص.
   - يتم حماية البيانات من XSS باستخدام `htmlspecialchars()`.
