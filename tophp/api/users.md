
# صفحة إدارة المستخدمين

**الوصف**: صفحة تتيح للمسؤول عرض وإدارة جميع المستخدمين في النظام.

**المسار**: `/pages/admin/users.php`

## الكود الكامل

```php
<?php
/**
 * صفحة إدارة المستخدمين
 * تعرض قائمة بجميع المستخدمين مع إمكانية إدارتهم
 */

// تضمين ملفات المشروع الضرورية
require_once '../../includes/config.php';
require_once '../../includes/auth_functions.php';
require_once '../../includes/admin_functions.php';
require_once '../../includes/general_functions.php';

// بدء الجلسة
session_start();

// التحقق من تسجيل الدخول وصلاحيات المسؤول
if (!isLoggedIn() || !isAdmin()) {
    // إعادة التوجيه إلى صفحة تسجيل الدخول إذا لم يكن المستخدم مسجل دخوله أو ليس لديه صلاحيات المسؤول
    redirect('../index.php');
    exit;
}

// معالجة الإجراءات السريعة
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        setFlashMessage('error', 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    } else {
        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        
        // التحقق من وجود المستخدم
        if ($user_id > 0 && userExists($user_id)) {
            // منع المستخدم من تعديل حالة حسابه الخاص
            if ($user_id == $_SESSION['user_id']) {
                setFlashMessage('error', 'لا يمكنك تعديل حالة حسابك الخاص من هذه الصفحة.');
            } else {
                switch ($_POST['action']) {
                    case 'activate':
                        // تفعيل حساب المستخدم
                        if (updateUserStatus($user_id, 1)) {
                            $username = getUsernameById($user_id);
                            logAdminActivity("تفعيل حساب المستخدم: {$username}");
                            setFlashMessage('success', 'تم تفعيل حساب المستخدم بنجاح');
                        } else {
                            setFlashMessage('error', 'حدث خطأ أثناء تفعيل حساب المستخدم');
                        }
                        break;
                        
                    case 'deactivate':
                        // تعطيل حساب المستخدم
                        if (updateUserStatus($user_id, 0)) {
                            $username = getUsernameById($user_id);
                            logAdminActivity("تعطيل حساب المستخدم: {$username}");
                            setFlashMessage('success', 'تم تعطيل حساب المستخدم بنجاح');
                        } else {
                            setFlashMessage('error', 'حدث خطأ أثناء تعطيل حساب المستخدم');
                        }
                        break;
                }
            }
        } else {
            setFlashMessage('error', 'المستخدم غير موجود');
        }
    }
    
    // إعادة التوجيه للتخلص من بيانات النموذج
    redirect('users.php');
    exit;
}

// الحصول على رسائل الخطأ والنجاح
$error_message = getFlashMessage('error');
$success_message = getFlashMessage('success');

// جلب قائمة المستخدمين
$users = getAllUsers();

// إنشاء رمز CSRF جديد
$csrf_token = generateCsrfToken();

/**
 * دالة للتحقق من وجود المستخدم في قاعدة البيانات
 * 
 * @param int $id معرف المستخدم
 * @return bool عودة صحيح إذا كان المستخدم موجودًا، خطأ إذا لم يكن موجودًا
 */
function userExists($id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("SELECT id FROM users WHERE id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من وجود المستخدم: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة لتحديث حالة المستخدم (نشط أو غير نشط)
 * 
 * @param int $id معرف المستخدم
 * @param int $status الحالة الجديدة (1=نشط، 0=غير نشط)
 * @return bool عودة صحيح إذا تم التحديث بنجاح، خطأ إذا حدث خطأ
 */
function updateUserStatus($id, $status) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            UPDATE users 
            SET is_active = :status, 
                updated_at = NOW()
            WHERE id = :id
        ");
        
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':status', $status);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تحديث حالة المستخدم: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة لجلب جميع المستخدمين من قاعدة البيانات
 * 
 * @return array مصفوفة تحتوي على بيانات جميع المستخدمين
 */
function getAllUsers() {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            SELECT u.*, 
                  (SELECT COUNT(*) FROM messages WHERE user_id = u.id) as messages_count,
                  (SELECT COUNT(*) FROM room_users WHERE user_id = u.id) as rooms_count
            FROM users u
            ORDER BY u.username
        ");
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("خطأ في جلب قائمة المستخدمين: " . $e->getMessage());
        return [];
    }
}

/**
 * دالة لجلب اسم المستخدم بواسطة المعرف
 * 
 * @param int $id معرف المستخدم
 * @return string اسم المستخدم
 */
function getUsernameById($id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("SELECT username FROM users WHERE id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC)['username'];
        } else {
            return 'مستخدم غير معروف';
        }
    } catch (PDOException $e) {
        error_log("خطأ في جلب اسم المستخدم: " . $e->getMessage());
        return 'مستخدم غير معروف';
    }
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
    
    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.1/css/dataTables.bootstrap5.min.css">
    
    <!-- ملف CSS الخاص باللوحة -->
    <link rel="stylesheet" href="../../assets/css/admin.css">
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- القائمة الجانبية -->
            <?php include '../../includes/admin_sidebar.php'; ?>
            
            <!-- المحتوى الرئيسي -->
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">إدارة المستخدمين</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <a href="user_add.php" class="btn btn-sm btn-primary">
                            <i class="fas fa-user-plus ms-1"></i> إضافة مستخدم جديد
                        </a>
                    </div>
                </div>
                
                <?php if (!empty($error_message)): ?>
                    <div class="alert alert-danger alert-dismissible fade show">
                        <i class="fas fa-exclamation-triangle me-1"></i> <?php echo $error_message; ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
                    </div>
                <?php endif; ?>
                
                <?php if (!empty($success_message)): ?>
                    <div class="alert alert-success alert-dismissible fade show">
                        <i class="fas fa-check-circle me-1"></i> <?php echo $success_message; ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
                    </div>
                <?php endif; ?>
                
                <!-- بطاقات الإحصائيات السريعة -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-primary text-white mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h5 class="card-title mb-0">إجمالي المستخدمين</h5>
                                    </div>
                                    <div>
                                        <i class="fas fa-users fa-2x opacity-50"></i>
                                    </div>
                                </div>
                                <h2 class="mt-3 mb-0"><?php echo count($users); ?></h2>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-3">
                        <div class="card bg-success text-white mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h5 class="card-title mb-0">المستخدمون النشطون</h5>
                                    </div>
                                    <div>
                                        <i class="fas fa-user-check fa-2x opacity-50"></i>
                                    </div>
                                </div>
                                <h2 class="mt-3 mb-0">
                                    <?php
                                        $activeUsers = array_filter($users, function($user) {
                                            return $user['is_active'] == 1;
                                        });
                                        echo count($activeUsers);
                                    ?>
                                </h2>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-3">
                        <div class="card bg-danger text-white mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h5 class="card-title mb-0">المستخدمون غير النشطين</h5>
                                    </div>
                                    <div>
                                        <i class="fas fa-user-times fa-2x opacity-50"></i>
                                    </div>
                                </div>
                                <h2 class="mt-3 mb-0">
                                    <?php
                                        $inactiveUsers = array_filter($users, function($user) {
                                            return $user['is_active'] == 0;
                                        });
                                        echo count($inactiveUsers);
                                    ?>
                                </h2>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-3">
                        <div class="card bg-info text-white mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h5 class="card-title mb-0">المسؤولون</h5>
                                    </div>
                                    <div>
                                        <i class="fas fa-user-shield fa-2x opacity-50"></i>
                                    </div>
                                </div>
                                <h2 class="mt-3 mb-0">
                                    <?php
                                        $adminUsers = array_filter($users, function($user) {
                                            return $user['role'] == 'admin';
                                        });
                                        echo count($adminUsers);
                                    ?>
                                </h2>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-users me-1"></i> قائمة المستخدمين
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover" id="usersTable">
                                <thead>
                                    <tr>
                                        <th>اسم المستخدم</th>
                                        <th>البريد الإلكتروني</th>
                                        <th>الاسم الكامل</th>
                                        <th>الدور</th>
                                        <th>الحالة</th>
                                        <th>عدد الرسائل</th>
                                        <th>تاريخ التسجيل</th>
                                        <th>آخر تسجيل دخول</th>
                                        <th>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($users as $user): ?>
                                        <tr>
                                            <td><?php echo htmlspecialchars($user['username']); ?></td>
                                            <td><?php echo htmlspecialchars($user['email']); ?></td>
                                            <td><?php echo htmlspecialchars($user['full_name'] ?: '-'); ?></td>
                                            <td>
                                                <?php if ($user['role'] == 'admin'): ?>
                                                    <span class="badge bg-danger">مسؤول</span>
                                                <?php else: ?>
                                                    <span class="badge bg-info">مستخدم</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <?php if ($user['is_active']): ?>
                                                    <span class="badge bg-success">نشط</span>
                                                <?php else: ?>
                                                    <span class="badge bg-danger">غير نشط</span>
                                                <?php endif; ?>
                                            </td>
                                            <td><?php echo $user['messages_count']; ?></td>
                                            <td><?php echo formatDate($user['created_at']); ?></td>
                                            <td><?php echo $user['last_login'] ? formatDate($user['last_login']) : 'لم يسجل دخوله بعد'; ?></td>
                                            <td>
                                                <div class="btn-group btn-group-sm">
                                                    <a href="user_edit.php?id=<?php echo $user['id']; ?>" class="btn btn-outline-primary" title="تعديل">
                                                        <i class="fas fa-edit"></i>
                                                    </a>
                                                    
                                                    <?php if ($user['id'] != $_SESSION['user_id']): ?>
                                                        <?php if ($user['is_active']): ?>
                                                            <button type="button" class="btn btn-outline-warning" title="تعطيل" data-bs-toggle="modal" data-bs-target="#deactivateUserModal" data-id="<?php echo $user['id']; ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>">
                                                                <i class="fas fa-user-slash"></i>
                                                            </button>
                                                        <?php else: ?>
                                                            <button type="button" class="btn btn-outline-success" title="تفعيل" data-bs-toggle="modal" data-bs-target="#activateUserModal" data-id="<?php echo $user['id']; ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>">
                                                                <i class="fas fa-user-check"></i>
                                                            </button>
                                                        <?php endif; ?>
                                                        
                                                        <button type="button" class="btn btn-outline-danger" title="حذف" data-bs-toggle="modal" data-bs-target="#deleteUserModal" data-id="<?php echo $user['id']; ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>">
                                                            <i class="fas fa-trash-alt"></i>
                                                        </button>
                                                    <?php endif; ?>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- نافذة تأكيد تفعيل المستخدم -->
                <div class="modal fade" id="activateUserModal" tabindex="-1" aria-labelledby="activateUserModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="activateUserModalLabel">تأكيد تفعيل المستخدم</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                            </div>
                            <div class="modal-body">
                                <p>هل أنت متأكد من رغبتك في تفعيل حساب المستخدم <strong id="activate_username"></strong>؟</p>
                            </div>
                            <div class="modal-footer">
                                <form action="" method="POST">
                                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                    <input type="hidden" name="action" value="activate">
                                    <input type="hidden" name="user_id" id="activate_user_id">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                                    <button type="submit" class="btn btn-success">تفعيل</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- نافذة تأكيد تعطيل المستخدم -->
                <div class="modal fade" id="deactivateUserModal" tabindex="-1" aria-labelledby="deactivateUserModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="deactivateUserModalLabel">تأكيد تعطيل المستخدم</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                            </div>
                            <div class="modal-body">
                                <p>هل أنت متأكد من رغبتك في تعطيل حساب المستخدم <strong id="deactivate_username"></strong>؟</p>
                                <div class="alert alert-warning">
                                    <i class="fas fa-exclamation-triangle me-1"></i> تعطيل الحساب سيمنع المستخدم من تسجيل الدخول إلى النظام.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <form action="" method="POST">
                                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                    <input type="hidden" name="action" value="deactivate">
                                    <input type="hidden" name="user_id" id="deactivate_user_id">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                                    <button type="submit" class="btn btn-warning">تعطيل</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- نافذة تأكيد حذف المستخدم -->
                <div class="modal fade" id="deleteUserModal" tabindex="-1" aria-labelledby="deleteUserModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="deleteUserModalLabel">تأكيد حذف المستخدم</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                            </div>
                            <div class="modal-body">
                                <p>هل أنت متأكد من رغبتك في حذف المستخدم <strong id="delete_username"></strong>؟</p>
                                <div class="alert alert-danger">
                                    <i class="fas fa-exclamation-triangle me-1"></i> تحذير: سيؤدي هذا الإجراء إلى حذف جميع البيانات المرتبطة بهذا المستخدم (الرسائل، العضويات في الغرف، إلخ) بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <form action="user_delete.php" method="POST">
                                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                    <input type="hidden" name="user_id" id="delete_user_id">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                                    <button type="submit" class="btn btn-danger">حذف</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                
                <footer class="pt-3 mt-4 text-muted border-top">
                    <div class="text-center">
                        &copy; <?php echo date('Y'); ?> نظام الدردشة المشفر - لوحة تحكم المسؤول
                    </div>
                </footer>
            </main>
        </div>
    </div>
    
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- DataTables JS -->
    <script src="https://cdn.datatables.net/1.13.1/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.1/js/dataTables.bootstrap5.min.js"></script>
    
    <!-- سكريبت للتعامل مع النوافذ المنبثقة وجدول البيانات -->
    <script>
        $(document).ready(function() {
            // تهيئة جدول DataTables
            $('#usersTable').DataTable({
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.13.1/i18n/ar.json'
                },
                "order": [[0, "asc"]],
                "columnDefs": [
                    { "orderable": false, "targets": [8] } // منع فرز عمود الإجراءات
                ]
            });
            
            // تعيين بيانات المستخدم في نوافذ التأكيد
            $('#activateUserModal').on('show.bs.modal', function (event) {
                const button = $(event.relatedTarget);
                const userId = button.data('id');
                const username = button.data('username');
                
                $('#activate_user_id').val(userId);
                $('#activate_username').text(username);
            });
            
            $('#deactivateUserModal').on('show.bs.modal', function (event) {
                const button = $(event.relatedTarget);
                const userId = button.data('id');
                const username = button.data('username');
                
                $('#deactivate_user_id').val(userId);
                $('#deactivate_username').text(username);
            });
            
            $('#deleteUserModal').on('show.bs.modal', function (event) {
                const button = $(event.relatedTarget);
                const userId = button.data('id');
                const username = button.data('username');
                
                $('#delete_user_id').val(userId);
                $('#delete_username').text(username);
            });
            
            // إخفاء التنبيهات تلقائيًا بعد 5 ثوانٍ
            setTimeout(function() {
                $('.alert-dismissible').alert('close');
            }, 5000);
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الوظائف الرئيسية**:
   - عرض قائمة بجميع المستخدمين في النظام
   - إمكانية تفعيل/تعطيل حسابات المستخدمين
   - رابط لإضافة مستخدم جديد
   - روابط لتعديل بيانات المستخدمين وحذفهم
   - عرض إحصائيات سريعة (إجمالي المستخدمين، النشطين، غير النشطين، المسؤولين)
   - عرض معلومات تفصيلية عن كل مستخدم

2. **ميزات الأمان**:
   - التحقق من تسجيل الدخول وصلاحيات المسؤول
   - منع المستخدم من تعديل حالة حسابه الخاص
   - التحقق من رمز CSRF لمنع هجمات تزوير الطلبات
   - تنظيف المدخلات لمنع هجمات XSS
   - استخدام Prepared Statements لمنع هجمات SQL Injection
   - استخدام نوافذ تأكيد قبل إجراء العمليات الحساسة

3. **متطلبات الصفحة**:
   - ملفات التكوين (config.php)
   - ملفات الدوال المساعدة (auth_functions.php, admin_functions.php, general_functions.php)
   - Bootstrap RTL للتصميم المستجيب ودعم اللغة العربية
   - Font Awesome للأيقونات
   - DataTables لعرض وتنظيم جداول البيانات
   - jQuery للتفاعلات في واجهة المستخدم
   - القائمة الجانبية للوحة تحكم المسؤول (admin_sidebar.php)

4. **ميزات الواجهة**:
   - قائمة قابلة للبحث والفرز باستخدام DataTables
   - بطاقات إحصائيات ملونة للاطلاع السريع
   - أزرار إجراءات مع أيقونات واضحة
   - رسائل تأكيد ونجاح لجميع العمليات
   - توافق كامل مع الهواتف المحمولة والأجهزة اللوحية
