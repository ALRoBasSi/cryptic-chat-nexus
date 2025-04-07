
# صفحة إدارة مستخدمي الغرفة

**الوصف**: صفحة تتيح للمسؤول إدارة المستخدمين المصرح لهم بالوصول إلى غرفة دردشة محددة وتحديد صلاحياتهم.

**المسار**: `/pages/admin/room_users.php`

## الكود الكامل

```php
<?php
/**
 * صفحة إدارة مستخدمي الغرفة
 * تتيح للمسؤول إضافة وإزالة المستخدمين من غرفة معينة وتحديد صلاحياتهم
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

// مصفوفة لتخزين رسائل الخطأ
$errors = [];
$successMessage = '';

// التحقق من معرف الغرفة في URL
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    setFlashMessage('error', 'معرف الغرفة غير صالح');
    redirect('rooms.php');
    exit;
}

$room_id = intval($_GET['id']);

// جلب بيانات الغرفة من قاعدة البيانات
$room = getRoomById($room_id);

// التحقق من وجود الغرفة
if (!$room) {
    setFlashMessage('error', 'الغرفة غير موجودة');
    redirect('rooms.php');
    exit;
}

// معالجة طلب إضافة مستخدم
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_user') {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $errors[] = 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    } else {
        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        $can_read = isset($_POST['can_read']) ? 1 : 0;
        $can_write = isset($_POST['can_write']) ? 1 : 0;
        $is_admin = isset($_POST['is_admin']) ? 1 : 0;
        
        // التحقق من وجود المستخدم
        if ($user_id <= 0 || !userExists($user_id)) {
            $errors[] = 'المستخدم غير موجود';
        }
        
        // التحقق مما إذا كان المستخدم موجودًا بالفعل في الغرفة
        if ($user_id > 0 && isUserInRoom($user_id, $room_id)) {
            $errors[] = 'المستخدم موجود بالفعل في الغرفة';
        }
        
        // إذا لم تكن هناك أخطاء، قم بإضافة المستخدم إلى الغرفة
        if (empty($errors)) {
            if (addUserToRoom($user_id, $room_id, $can_read, $can_write, $is_admin)) {
                // تسجيل النشاط
                $username = getUsernameById($user_id);
                logAdminActivity("إضافة مستخدم '{$username}' إلى غرفة '{$room['name']}'");
                
                $successMessage = 'تم إضافة المستخدم إلى الغرفة بنجاح';
            } else {
                $errors[] = 'حدث خطأ أثناء إضافة المستخدم إلى الغرفة';
            }
        }
    }
}

// معالجة طلب تعديل صلاحيات مستخدم
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_permissions') {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $errors[] = 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    } else {
        $room_user_id = isset($_POST['room_user_id']) ? intval($_POST['room_user_id']) : 0;
        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        $can_read = isset($_POST['can_read']) ? 1 : 0;
        $can_write = isset($_POST['can_write']) ? 1 : 0;
        $is_admin = isset($_POST['is_admin']) ? 1 : 0;
        
        // التحقق من معرف السجل
        if ($room_user_id <= 0) {
            $errors[] = 'معرف سجل المستخدم غير صالح';
        }
        
        // إذا لم تكن هناك أخطاء، قم بتحديث الصلاحيات
        if (empty($errors)) {
            if (updateUserPermissions($room_user_id, $can_read, $can_write, $is_admin)) {
                // تسجيل النشاط
                $username = getUsernameById($user_id);
                logAdminActivity("تحديث صلاحيات المستخدم '{$username}' في غرفة '{$room['name']}'");
                
                $successMessage = 'تم تحديث صلاحيات المستخدم بنجاح';
            } else {
                $errors[] = 'حدث خطأ أثناء تحديث صلاحيات المستخدم';
            }
        }
    }
}

// معالجة طلب إزالة مستخدم
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'remove_user') {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $errors[] = 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    } else {
        $room_user_id = isset($_POST['room_user_id']) ? intval($_POST['room_user_id']) : 0;
        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        
        // التحقق من معرف السجل
        if ($room_user_id <= 0) {
            $errors[] = 'معرف سجل المستخدم غير صالح';
        }
        
        // إذا لم تكن هناك أخطاء، قم بإزالة المستخدم
        if (empty($errors)) {
            if (removeUserFromRoom($room_user_id)) {
                // تسجيل النشاط
                $username = getUsernameById($user_id);
                logAdminActivity("إزالة مستخدم '{$username}' من غرفة '{$room['name']}'");
                
                $successMessage = 'تم إزالة المستخدم من الغرفة بنجاح';
            } else {
                $errors[] = 'حدث خطأ أثناء إزالة المستخدم من الغرفة';
            }
        }
    }
}

// جلب قائمة المستخدمين في الغرفة
$roomUsers = getRoomUsers($room_id);

// جلب قائمة المستخدمين غير الموجودين في الغرفة
$availableUsers = getAvailableUsers($room_id);

// إنشاء رمز CSRF جديد
$csrf_token = generateCsrfToken();

/**
 * دالة لجلب بيانات غرفة من قاعدة البيانات بواسطة المعرف
 * 
 * @param int $id معرف الغرفة
 * @return array|bool مصفوفة تحتوي على بيانات الغرفة أو خطأ إذا لم يتم العثور عليها
 */
function getRoomById($id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            SELECT r.*, u.username as created_by_username 
            FROM rooms r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.id = :id
        ");
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            return false;
        }
    } catch (PDOException $e) {
        error_log("خطأ في جلب بيانات الغرفة: " . $e->getMessage());
        return false;
    }
}

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
 * دالة للتحقق مما إذا كان المستخدم موجودًا بالفعل في الغرفة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @return bool عودة صحيح إذا كان المستخدم موجودًا في الغرفة، خطأ إذا لم يكن موجودًا
 */
function isUserInRoom($user_id, $room_id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            SELECT id 
            FROM room_users 
            WHERE user_id = :user_id AND room_id = :room_id
        ");
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':room_id', $room_id);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من وجود المستخدم في الغرفة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة لإضافة مستخدم إلى غرفة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @param int $can_read صلاحية القراءة (1=يمكنه القراءة، 0=لا يمكنه القراءة)
 * @param int $can_write صلاحية الكتابة (1=يمكنه الكتابة، 0=لا يمكنه الكتابة)
 * @param int $is_admin صلاحية الإدارة (1=مسؤول، 0=غير مسؤول)
 * @return bool عودة صحيح إذا تمت الإضافة بنجاح، خطأ إذا حدث خطأ
 */
function addUserToRoom($user_id, $room_id, $can_read, $can_write, $is_admin) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO room_users (room_id, user_id, can_read, can_write, is_admin, created_at) 
            VALUES (:room_id, :user_id, :can_read, :can_write, :is_admin, NOW())
        ");
        
        $stmt->bindParam(':room_id', $room_id);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':can_read', $can_read);
        $stmt->bindParam(':can_write', $can_write);
        $stmt->bindParam(':is_admin', $is_admin);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في إضافة مستخدم إلى غرفة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة لتحديث صلاحيات مستخدم في غرفة
 * 
 * @param int $room_user_id معرف سجل المستخدم في الغرفة
 * @param int $can_read صلاحية القراءة (1=يمكنه القراءة، 0=لا يمكنه القراءة)
 * @param int $can_write صلاحية الكتابة (1=يمكنه الكتابة، 0=لا يمكنه الكتابة)
 * @param int $is_admin صلاحية الإدارة (1=مسؤول، 0=غير مسؤول)
 * @return bool عودة صحيح إذا تم التحديث بنجاح، خطأ إذا حدث خطأ
 */
function updateUserPermissions($room_user_id, $can_read, $can_write, $is_admin) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            UPDATE room_users 
            SET can_read = :can_read, 
                can_write = :can_write, 
                is_admin = :is_admin, 
                updated_at = NOW()
            WHERE id = :id
        ");
        
        $stmt->bindParam(':id', $room_user_id);
        $stmt->bindParam(':can_read', $can_read);
        $stmt->bindParam(':can_write', $can_write);
        $stmt->bindParam(':is_admin', $is_admin);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تحديث صلاحيات المستخدم: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة لإزالة مستخدم من غرفة
 * 
 * @param int $room_user_id معرف سجل المستخدم في الغرفة
 * @return bool عودة صحيح إذا تمت الإزالة بنجاح، خطأ إذا حدث خطأ
 */
function removeUserFromRoom($room_user_id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("DELETE FROM room_users WHERE id = :id");
        $stmt->bindParam(':id', $room_user_id);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في إزالة مستخدم من غرفة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة لجلب قائمة المستخدمين في غرفة معينة
 * 
 * @param int $room_id معرف الغرفة
 * @return array مصفوفة تحتوي على بيانات المستخدمين في الغرفة
 */
function getRoomUsers($room_id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            SELECT ru.*, u.username, u.email, u.full_name, u.role 
            FROM room_users ru
            JOIN users u ON ru.user_id = u.id
            WHERE ru.room_id = :room_id
            ORDER BY u.username
        ");
        $stmt->bindParam(':room_id', $room_id);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("خطأ في جلب قائمة المستخدمين في الغرفة: " . $e->getMessage());
        return [];
    }
}

/**
 * دالة لجلب قائمة المستخدمين غير الموجودين في غرفة معينة
 * 
 * @param int $room_id معرف الغرفة
 * @return array مصفوفة تحتوي على بيانات المستخدمين غير الموجودين في الغرفة
 */
function getAvailableUsers($room_id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            SELECT u.id, u.username, u.email, u.full_name, u.role
            FROM users u
            WHERE u.id NOT IN (
                SELECT user_id 
                FROM room_users 
                WHERE room_id = :room_id
            )
            AND u.is_active = 1
            ORDER BY u.username
        ");
        $stmt->bindParam(':room_id', $room_id);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("خطأ في جلب قائمة المستخدمين المتاحين: " . $e->getMessage());
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
    <title>إدارة مستخدمي الغرفة - نظام الدردشة المشفر</title>
    
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
                    <h1 class="h2">إدارة مستخدمي الغرفة "<?php echo htmlspecialchars($room['name']); ?>"</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <a href="room_edit.php?id=<?php echo $room_id; ?>" class="btn btn-sm btn-outline-secondary ms-2">
                            <i class="fas fa-edit ms-1"></i> تعديل الغرفة
                        </a>
                        <a href="rooms.php" class="btn btn-sm btn-outline-secondary">
                            <i class="fas fa-arrow-right ms-1"></i> العودة إلى قائمة الغرف
                        </a>
                    </div>
                </div>
                
                <?php if (!empty($errors)): ?>
                    <div class="alert alert-danger">
                        <ul class="mb-0">
                            <?php foreach ($errors as $error): ?>
                                <li><?php echo $error; ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>
                
                <?php if (!empty($successMessage)): ?>
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle me-1"></i> <?php echo $successMessage; ?>
                    </div>
                <?php endif; ?>
                
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">
                                    <i class="fas fa-user-plus me-1"></i> إضافة مستخدم جديد للغرفة
                                </h5>
                            </div>
                            <div class="card-body">
                                <?php if (empty($availableUsers)): ?>
                                    <div class="alert alert-info">
                                        <i class="fas fa-info-circle me-1"></i> جميع المستخدمين النشطين مضافون بالفعل إلى هذه الغرفة.
                                    </div>
                                <?php else: ?>
                                    <form action="" method="POST">
                                        <!-- رمز CSRF للحماية -->
                                        <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                        <input type="hidden" name="action" value="add_user">
                                        
                                        <div class="mb-3">
                                            <label for="user_id" class="form-label">اختر المستخدم</label>
                                            <select class="form-select" id="user_id" name="user_id" required>
                                                <option value="">-- اختر مستخدمًا --</option>
                                                <?php foreach ($availableUsers as $user): ?>
                                                    <option value="<?php echo $user['id']; ?>">
                                                        <?php echo htmlspecialchars($user['username']); ?> 
                                                        (<?php echo htmlspecialchars($user['full_name'] ?: $user['email']); ?>)
                                                    </option>
                                                <?php endforeach; ?>
                                            </select>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="can_read" name="can_read" checked>
                                                <label class="form-check-label" for="can_read">صلاحية القراءة</label>
                                            </div>
                                            <div class="form-text">يمكن للمستخدم قراءة الرسائل في الغرفة.</div>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="can_write" name="can_write" checked>
                                                <label class="form-check-label" for="can_write">صلاحية الكتابة</label>
                                            </div>
                                            <div class="form-text">يمكن للمستخدم إرسال رسائل في الغرفة.</div>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="is_admin" name="is_admin">
                                                <label class="form-check-label" for="is_admin">صلاحية الإدارة</label>
                                            </div>
                                            <div class="form-text">يمكن للمستخدم إدارة الغرفة (إضافة مستخدمين، إزالة رسائل).</div>
                                        </div>
                                        
                                        <div class="d-grid gap-2">
                                            <button type="submit" class="btn btn-primary">
                                                <i class="fas fa-plus-circle me-1"></i> إضافة المستخدم
                                            </button>
                                        </div>
                                    </form>
                                <?php endif; ?>
                            </div>
                        </div>
                        
                        <div class="card mt-4">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">
                                    <i class="fas fa-info-circle me-1"></i> معلومات الغرفة
                                </h5>
                            </div>
                            <div class="card-body">
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>اسم الغرفة</span>
                                        <span class="fw-bold"><?php echo htmlspecialchars($room['name']); ?></span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>الحالة</span>
                                        <?php if ($room['is_active']): ?>
                                            <span class="badge bg-success">نشطة</span>
                                        <?php else: ?>
                                            <span class="badge bg-danger">غير نشطة</span>
                                        <?php endif; ?>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>تاريخ الإنشاء</span>
                                        <span><?php echo formatDate($room['created_at']); ?></span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>تم الإنشاء بواسطة</span>
                                        <span><?php echo htmlspecialchars($room['created_by_username']); ?></span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>عدد المستخدمين</span>
                                        <span class="badge bg-primary rounded-pill"><?php echo count($roomUsers); ?></span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-users me-1"></i> المستخدمون في الغرفة
                                </h5>
                            </div>
                            <div class="card-body">
                                <?php if (empty($roomUsers)): ?>
                                    <div class="alert alert-warning">
                                        <i class="fas fa-exclamation-triangle me-1"></i> لا يوجد مستخدمون في هذه الغرفة حاليًا.
                                    </div>
                                <?php else: ?>
                                    <div class="table-responsive">
                                        <table class="table table-striped table-hover" id="roomUsersTable">
                                            <thead>
                                                <tr>
                                                    <th>اسم المستخدم</th>
                                                    <th>الاسم الكامل</th>
                                                    <th>الدور</th>
                                                    <th>الصلاحيات</th>
                                                    <th>تاريخ الإضافة</th>
                                                    <th>الإجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <?php foreach ($roomUsers as $user): ?>
                                                    <tr>
                                                        <td><?php echo htmlspecialchars($user['username']); ?></td>
                                                        <td><?php echo htmlspecialchars($user['full_name'] ?: '-'); ?></td>
                                                        <td>
                                                            <?php if ($user['role'] == 'admin'): ?>
                                                                <span class="badge bg-danger">مسؤول</span>
                                                            <?php else: ?>
                                                                <span class="badge bg-info">مستخدم</span>
                                                            <?php endif; ?>
                                                        </td>
                                                        <td>
                                                            <div class="d-flex gap-1">
                                                                <?php if ($user['can_read']): ?>
                                                                    <span class="badge bg-success">قراءة</span>
                                                                <?php endif; ?>
                                                                
                                                                <?php if ($user['can_write']): ?>
                                                                    <span class="badge bg-primary">كتابة</span>
                                                                <?php endif; ?>
                                                                
                                                                <?php if ($user['is_admin']): ?>
                                                                    <span class="badge bg-warning text-dark">إدارة</span>
                                                                <?php endif; ?>
                                                            </div>
                                                        </td>
                                                        <td><?php echo formatDate($user['created_at']); ?></td>
                                                        <td>
                                                            <button type="button" class="btn btn-sm btn-outline-primary edit-user" 
                                                                data-bs-toggle="modal" data-bs-target="#editUserModal" 
                                                                data-id="<?php echo $user['id']; ?>"
                                                                data-user-id="<?php echo $user['user_id']; ?>"
                                                                data-username="<?php echo htmlspecialchars($user['username']); ?>"
                                                                data-can-read="<?php echo $user['can_read']; ?>"
                                                                data-can-write="<?php echo $user['can_write']; ?>"
                                                                data-is-admin="<?php echo $user['is_admin']; ?>">
                                                                <i class="fas fa-edit"></i>
                                                            </button>
                                                            
                                                            <button type="button" class="btn btn-sm btn-outline-danger remove-user" 
                                                                data-bs-toggle="modal" data-bs-target="#removeUserModal" 
                                                                data-id="<?php echo $user['id']; ?>"
                                                                data-user-id="<?php echo $user['user_id']; ?>"
                                                                data-username="<?php echo htmlspecialchars($user['username']); ?>">
                                                                <i class="fas fa-user-minus"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- نافذة تعديل صلاحيات المستخدم -->
                <div class="modal fade" id="editUserModal" tabindex="-1" aria-labelledby="editUserModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="editUserModalLabel">تعديل صلاحيات المستخدم</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                            </div>
                            <form action="" method="POST">
                                <div class="modal-body">
                                    <!-- رمز CSRF للحماية -->
                                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                    <input type="hidden" name="action" value="update_permissions">
                                    <input type="hidden" name="room_user_id" id="edit_room_user_id">
                                    <input type="hidden" name="user_id" id="edit_user_id">
                                    
                                    <p>تعديل صلاحيات المستخدم <strong id="edit_username"></strong>:</p>
                                    
                                    <div class="mb-3">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" id="edit_can_read" name="can_read">
                                            <label class="form-check-label" for="edit_can_read">صلاحية القراءة</label>
                                        </div>
                                        <div class="form-text">يمكن للمستخدم قراءة الرسائل في الغرفة.</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" id="edit_can_write" name="can_write">
                                            <label class="form-check-label" for="edit_can_write">صلاحية الكتابة</label>
                                        </div>
                                        <div class="form-text">يمكن للمستخدم إرسال رسائل في الغرفة.</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" id="edit_is_admin" name="is_admin">
                                            <label class="form-check-label" for="edit_is_admin">صلاحية الإدارة</label>
                                        </div>
                                        <div class="form-text">يمكن للمستخدم إدارة الغرفة (إضافة مستخدمين، إزالة رسائل).</div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                                    <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <!-- نافذة تأكيد إزالة المستخدم -->
                <div class="modal fade" id="removeUserModal" tabindex="-1" aria-labelledby="removeUserModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="removeUserModalLabel">تأكيد إزالة المستخدم</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                            </div>
                            <form action="" method="POST">
                                <div class="modal-body">
                                    <!-- رمز CSRF للحماية -->
                                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                    <input type="hidden" name="action" value="remove_user">
                                    <input type="hidden" name="room_user_id" id="remove_room_user_id">
                                    <input type="hidden" name="user_id" id="remove_user_id">
                                    
                                    <p>هل أنت متأكد من رغبتك في إزالة المستخدم <strong id="remove_username"></strong> من الغرفة؟</p>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                                    <button type="submit" class="btn btn-danger">إزالة المستخدم</button>
                                </div>
                            </form>
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
            $('#roomUsersTable').DataTable({
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.13.1/i18n/ar.json'
                },
                "order": [[0, "asc"]]
            });
            
            // معالجة نقر زر تعديل المستخدم
            $('.edit-user').click(function() {
                // تعيين القيم في النموذج
                $('#edit_room_user_id').val($(this).data('id'));
                $('#edit_user_id').val($(this).data('user-id'));
                $('#edit_username').text($(this).data('username'));
                $('#edit_can_read').prop('checked', $(this).data('can-read') == 1);
                $('#edit_can_write').prop('checked', $(this).data('can-write') == 1);
                $('#edit_is_admin').prop('checked', $(this).data('is-admin') == 1);
            });
            
            // معالجة نقر زر إزالة المستخدم
            $('.remove-user').click(function() {
                // تعيين القيم في النموذج
                $('#remove_room_user_id').val($(this).data('id'));
                $('#remove_user_id').val($(this).data('user-id'));
                $('#remove_username').text($(this).data('username'));
            });
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الوظائف الرئيسية**:
   - عرض قائمة المستخدمين في الغرفة
   - إضافة مستخدمين جدد إلى الغرفة
   - تعديل صلاحيات المستخدمين (القراءة، الكتابة، الإدارة)
   - إزالة المستخدمين من الغرفة
   - عرض معلومات الغرفة (الاسم، الحالة، تاريخ الإنشاء، إلخ)

2. **ميزات الأمان**:
   - التحقق من تسجيل الدخول وصلاحيات المسؤول
   - التحقق من رمز CSRF لمنع هجمات تزوير الطلبات
   - تنظيف المدخلات لمنع هجمات XSS
   - استخدام Prepared Statements لمنع هجمات SQL Injection
   - استخدام نوافذ تأكيد قبل إزالة المستخدمين

3. **متطلبات الصفحة**:
   - ملفات التكوين (config.php)
   - ملفات الدوال المساعدة (auth_functions.php, admin_functions.php)
   - Bootstrap RTL للتصميم المستجيب ودعم اللغة العربية
   - Font Awesome للأيقونات
   - DataTables لعرض وتنظيم جداول البيانات
   - jQuery للتفاعلات في واجهة المستخدم
   - القائمة الجانبية للوحة تحكم المسؤول (admin_sidebar.php)

4. **التحقق من الصحة**:
   - التحقق من معرف الغرفة في URL
   - التحقق من وجود المستخدم قبل إضافته إلى الغرفة
   - التحقق مما إذا كان المستخدم موجودًا بالفعل في الغرفة
   - التحقق من معرف السجل عند تعديل الصلاحيات أو إزالة المستخدم
   - عرض رسائل خطأ واضحة في حالة وجود مشاكل
