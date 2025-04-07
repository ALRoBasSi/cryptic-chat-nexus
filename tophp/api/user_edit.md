
# صفحة تعديل بيانات المستخدم

**الوصف**: صفحة تتيح للمسؤول تعديل بيانات مستخدم موجود في النظام.

**المسار**: `/pages/admin/user_edit.php`

## الكود الكامل

```php
<?php
/**
 * صفحة تعديل بيانات المستخدم
 * تتيح للمسؤول تعديل معلومات مستخدم موجود وتغيير صلاحياته
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

// التحقق من معرف المستخدم في URL
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    setFlashMessage('error', 'معرف المستخدم غير صالح');
    redirect('users.php');
    exit;
}

$user_id = intval($_GET['id']);

// منع تعديل المستخدم لحسابه الخاص من هذه الصفحة
if ($user_id == $_SESSION['user_id']) {
    setFlashMessage('error', 'لا يمكنك تعديل حسابك من هذه الصفحة. يرجى استخدام صفحة الملف الشخصي.');
    redirect('users.php');
    exit;
}

// جلب بيانات المستخدم من قاعدة البيانات
$user = getUserById($user_id);

// التحقق من وجود المستخدم
if (!$user) {
    setFlashMessage('error', 'المستخدم غير موجود');
    redirect('users.php');
    exit;
}

// معالجة طلب تعديل المستخدم
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $errors[] = 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    } else {
        // تنظيف وتحقق من البيانات المدخلة
        $username = cleanInput($_POST['username'] ?? '');
        $email = cleanInput($_POST['email'] ?? '');
        $full_name = cleanInput($_POST['full_name'] ?? '');
        $role = cleanInput($_POST['role'] ?? 'client');
        $is_active = isset($_POST['is_active']) ? 1 : 0;
        $change_password = isset($_POST['change_password']) ? 1 : 0;
        $password = $_POST['password'] ?? '';
        
        // التحقق من صحة البيانات
        if (empty($username)) {
            $errors[] = 'يرجى إدخال اسم المستخدم';
        } elseif (strlen($username) < 3 || strlen($username) > 50) {
            $errors[] = 'يجب أن يكون اسم المستخدم بين 3 و 50 حرف';
        } elseif (!preg_match('/^[a-zA-Z0-9_.\-]+$/', $username)) {
            $errors[] = 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام ورموز _ . - فقط';
        }
        
        if (empty($email)) {
            $errors[] = 'يرجى إدخال البريد الإلكتروني';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'البريد الإلكتروني غير صالح';
        }
        
        if ($role != 'admin' && $role != 'client') {
            $errors[] = 'الدور غير صالح';
        }
        
        // التحقق من كلمة المرور إذا تم اختيار تغييرها
        if ($change_password) {
            if (empty($password)) {
                $errors[] = 'يرجى إدخال كلمة المرور الجديدة';
            } elseif (strlen($password) < 8) {
                $errors[] = 'يجب أن تكون كلمة المرور 8 أحرف على الأقل';
            }
        }
        
        // التحقق مما إذا كان اسم المستخدم موجودًا بالفعل (إلا إذا كان نفس الاسم الحالي للمستخدم)
        if (!empty($username) && $username !== $user['username'] && isUsernameExists($username)) {
            $errors[] = 'اسم المستخدم موجود بالفعل. يرجى اختيار اسم آخر.';
        }
        
        // التحقق مما إذا كان البريد الإلكتروني موجودًا بالفعل (إلا إذا كان نفس البريد الحالي للمستخدم)
        if (!empty($email) && $email !== $user['email'] && isEmailExists($email)) {
            $errors[] = 'البريد الإلكتروني موجود بالفعل. يرجى استخدام بريد إلكتروني آخر.';
        }
        
        // إذا لم تكن هناك أخطاء، قم بتحديث المستخدم
        if (empty($errors)) {
            $update_success = false;
            
            if ($change_password) {
                // تشفير كلمة المرور الجديدة
                $hashed_password = password_hash($password, PASSWORD_BCRYPT);
                
                // تحديث بيانات المستخدم مع كلمة المرور الجديدة
                $update_success = updateUserWithPassword($user_id, $username, $email, $full_name, $role, $is_active, $hashed_password);
            } else {
                // تحديث بيانات المستخدم بدون تغيير كلمة المرور
                $update_success = updateUser($user_id, $username, $email, $full_name, $role, $is_active);
            }
            
            if ($update_success) {
                // تسجيل النشاط
                logAdminActivity("تعديل بيانات المستخدم: {$username}");
                
                // إعادة التوجيه إلى صفحة إدارة المستخدمين مع رسالة نجاح
                setFlashMessage('success', 'تم تعديل بيانات المستخدم بنجاح');
                redirect('users.php');
                exit;
            } else {
                $errors[] = 'حدث خطأ أثناء تعديل بيانات المستخدم. يرجى المحاولة مرة أخرى.';
            }
        }
    }
}

// إنشاء رمز CSRF جديد
$csrf_token = generateCsrfToken();

/**
 * دالة لجلب بيانات مستخدم من قاعدة البيانات بواسطة المعرف
 * 
 * @param int $id معرف المستخدم
 * @return array|bool مصفوفة تحتوي على بيانات المستخدم أو خطأ إذا لم يتم العثور عليه
 */
function getUserById($id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("SELECT * FROM users WHERE id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            return false;
        }
    } catch (PDOException $e) {
        error_log("خطأ في جلب بيانات المستخدم: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة للتحقق من وجود اسم المستخدم في قاعدة البيانات
 * 
 * @param string $username اسم المستخدم المراد التحقق منه
 * @return bool عودة صحيح إذا كان الاسم موجودًا، خطأ إذا لم يكن موجودًا
 */
function isUsernameExists($username) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = :username");
        $stmt->bindParam(':username', $username);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من اسم المستخدم: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة للتحقق من وجود البريد الإلكتروني في قاعدة البيانات
 * 
 * @param string $email البريد الإلكتروني المراد التحقق منه
 * @return bool عودة صحيح إذا كان البريد موجودًا، خطأ إذا لم يكن موجودًا
 */
function isEmailExists($email) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = :email");
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من البريد الإلكتروني: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة لتحديث بيانات مستخدم في قاعدة البيانات بدون تغيير كلمة المرور
 * 
 * @param int $id معرف المستخدم
 * @param string $username اسم المستخدم
 * @param string $email البريد الإلكتروني
 * @param string $full_name الاسم الكامل
 * @param string $role دور المستخدم (admin أو client)
 * @param int $is_active حالة نشاط المستخدم (1=نشط، 0=غير نشط)
 * @return bool عودة صحيح إذا تم التحديث بنجاح، خطأ إذا حدث خطأ
 */
function updateUser($id, $username, $email, $full_name, $role, $is_active) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            UPDATE users 
            SET username = :username, 
                email = :email, 
                full_name = :full_name, 
                role = :role, 
                is_active = :is_active, 
                updated_at = NOW()
            WHERE id = :id
        ");
        
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':username', $username);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':full_name', $full_name);
        $stmt->bindParam(':role', $role);
        $stmt->bindParam(':is_active', $is_active);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تحديث بيانات المستخدم: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة لتحديث بيانات مستخدم في قاعدة البيانات مع تغيير كلمة المرور
 * 
 * @param int $id معرف المستخدم
 * @param string $username اسم المستخدم
 * @param string $email البريد الإلكتروني
 * @param string $full_name الاسم الكامل
 * @param string $role دور المستخدم (admin أو client)
 * @param int $is_active حالة نشاط المستخدم (1=نشط، 0=غير نشط)
 * @param string $password كلمة المرور المشفرة
 * @return bool عودة صحيح إذا تم التحديث بنجاح، خطأ إذا حدث خطأ
 */
function updateUserWithPassword($id, $username, $email, $full_name, $role, $is_active, $password) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            UPDATE users 
            SET username = :username, 
                email = :email, 
                full_name = :full_name, 
                role = :role, 
                is_active = :is_active, 
                password = :password, 
                updated_at = NOW()
            WHERE id = :id
        ");
        
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':username', $username);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':full_name', $full_name);
        $stmt->bindParam(':role', $role);
        $stmt->bindParam(':is_active', $is_active);
        $stmt->bindParam(':password', $password);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تحديث بيانات المستخدم مع كلمة المرور: " . $e->getMessage());
        return false;
    }
}

// حساب إحصائيات المستخدم
$userStats = getUserStats($user_id);

/**
 * دالة لجلب إحصائيات المستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @return array مصفوفة تحتوي على إحصائيات المستخدم
 */
function getUserStats($user_id) {
    global $conn;
    
    try {
        // عدد الرسائل التي أرسلها المستخدم
        $stmt = $conn->prepare("SELECT COUNT(*) as messages_count FROM messages WHERE user_id = :user_id");
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        $messagesCount = $stmt->fetch(PDO::FETCH_ASSOC)['messages_count'];
        
        // عدد غرف الدردشة التي ينتمي إليها المستخدم
        $stmt = $conn->prepare("SELECT COUNT(*) as rooms_count FROM room_users WHERE user_id = :user_id");
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        $roomsCount = $stmt->fetch(PDO::FETCH_ASSOC)['rooms_count'];
        
        // تاريخ آخر نشاط للمستخدم
        $stmt = $conn->prepare("SELECT last_activity FROM users WHERE id = :user_id");
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        $lastActivity = $stmt->fetch(PDO::FETCH_ASSOC)['last_activity'];
        
        // تاريخ آخر تسجيل دخول للمستخدم
        $stmt = $conn->prepare("SELECT last_login FROM users WHERE id = :user_id");
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        $lastLogin = $stmt->fetch(PDO::FETCH_ASSOC)['last_login'];
        
        return [
            'messages_count' => $messagesCount,
            'rooms_count' => $roomsCount,
            'last_activity' => $lastActivity,
            'last_login' => $lastLogin
        ];
    } catch (PDOException $e) {
        error_log("خطأ في جلب إحصائيات المستخدم: " . $e->getMessage());
        return [
            'messages_count' => 0,
            'rooms_count' => 0,
            'last_activity' => null,
            'last_login' => null
        ];
    }
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تعديل بيانات المستخدم - نظام الدردشة المشفر</title>
    
    <!-- Bootstrap RTL CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
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
                    <h1 class="h2">تعديل بيانات المستخدم</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <a href="users.php" class="btn btn-sm btn-outline-secondary">
                            <i class="fas fa-arrow-right ms-1"></i> العودة إلى قائمة المستخدمين
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
                
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card mb-4">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">معلومات المستخدم</h5>
                            </div>
                            <div class="card-body">
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>المعرف</span>
                                        <span class="badge bg-primary rounded-pill"><?php echo $user['id']; ?></span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>تاريخ التسجيل</span>
                                        <span><?php echo formatDate($user['created_at']); ?></span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>آخر تسجيل دخول</span>
                                        <span><?php echo $userStats['last_login'] ? formatDate($userStats['last_login']) : 'لم يسجل دخوله بعد'; ?></span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>آخر نشاط</span>
                                        <span><?php echo $userStats['last_activity'] ? formatDate($userStats['last_activity']) : 'لا يوجد نشاط'; ?></span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>عدد الرسائل</span>
                                        <span class="badge bg-success rounded-pill"><?php echo $userStats['messages_count']; ?></span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>عدد الغرف</span>
                                        <span class="badge bg-info rounded-pill"><?php echo $userStats['rooms_count']; ?></span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">الإجراءات السريعة</h5>
                            </div>
                            <div class="card-body">
                                <div class="d-grid gap-2">
                                    <a href="user_rooms.php?id=<?php echo $user_id; ?>" class="btn btn-outline-primary">
                                        <i class="fas fa-door-open me-1"></i> إدارة غرف المستخدم
                                    </a>
                                    <a href="user_messages.php?id=<?php echo $user_id; ?>" class="btn btn-outline-info">
                                        <i class="fas fa-comments me-1"></i> عرض رسائل المستخدم
                                    </a>
                                    <a href="user_activities.php?id=<?php echo $user_id; ?>" class="btn btn-outline-secondary">
                                        <i class="fas fa-history me-1"></i> سجل نشاطات المستخدم
                                    </a>
                                    <button type="button" class="btn btn-outline-danger" data-bs-toggle="modal" data-bs-target="#deleteUserModal">
                                        <i class="fas fa-trash-alt me-1"></i> حذف المستخدم
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <i class="fas fa-user-edit me-1"></i> تعديل بيانات المستخدم
                            </div>
                            <div class="card-body">
                                <form action="" method="POST" id="userForm">
                                    <!-- رمز CSRF للحماية -->
                                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="username" class="form-label">اسم المستخدم <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="username" name="username" 
                                                value="<?php echo htmlspecialchars($user['username']); ?>" required>
                                            <div class="form-text">اسم المستخدم يجب أن يكون فريدًا ويتراوح بين 3 و 50 حرف.</div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <label for="email" class="form-label">البريد الإلكتروني <span class="text-danger">*</span></label>
                                            <input type="email" class="form-control" id="email" name="email" 
                                                value="<?php echo htmlspecialchars($user['email']); ?>" required>
                                            <div class="form-text">البريد الإلكتروني يجب أن يكون صالحًا وفريدًا.</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="full_name" class="form-label">الاسم الكامل</label>
                                            <input type="text" class="form-control" id="full_name" name="full_name" 
                                                value="<?php echo htmlspecialchars($user['full_name'] ?? ''); ?>">
                                            <div class="form-text">الاسم الكامل للمستخدم (اختياري).</div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <label for="role" class="form-label">الدور <span class="text-danger">*</span></label>
                                            <select class="form-select" id="role" name="role" required>
                                                <option value="client" <?php echo ($user['role'] == 'client') ? 'selected' : ''; ?>>مستخدم عادي</option>
                                                <option value="admin" <?php echo ($user['role'] == 'admin') ? 'selected' : ''; ?>>مسؤول</option>
                                            </select>
                                            <div class="form-text">دور المستخدم يحدد صلاحياته في النظام.</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-12">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="is_active" name="is_active" <?php echo $user['is_active'] ? 'checked' : ''; ?>>
                                                <label class="form-check-label" for="is_active">تفعيل الحساب</label>
                                            </div>
                                            <div class="form-text">إذا تم تفعيل الحساب، يمكن للمستخدم تسجيل الدخول. إذا لم يتم تفعيله، لن يتمكن من الوصول إلى النظام.</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-12">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="change_password" name="change_password">
                                                <label class="form-check-label" for="change_password">تغيير كلمة المرور</label>
                                            </div>
                                            <div class="form-text">اختر هذا الخيار إذا كنت ترغب في تغيير كلمة مرور المستخدم.</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3" id="passwordField" style="display:none;">
                                        <div class="col-md-6">
                                            <label for="password" class="form-label">كلمة المرور الجديدة <span class="text-danger">*</span></label>
                                            <div class="input-group">
                                                <input type="password" class="form-control" id="password" name="password">
                                                <button class="btn btn-outline-secondary" type="button" id="togglePassword">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                            </div>
                                            <div class="form-text">كلمة المرور يجب أن تكون 8 أحرف على الأقل.</div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <label for="password_confirm" class="form-label">تأكيد كلمة المرور <span class="text-danger">*</span></label>
                                            <input type="password" class="form-control" id="password_confirm">
                                            <div class="form-text">يجب أن تتطابق مع كلمة المرور.</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mt-4">
                                        <div class="col-md-12 text-start">
                                            <button type="submit" class="btn btn-primary">
                                                <i class="fas fa-save me-1"></i> حفظ التغييرات
                                            </button>
                                            <a href="users.php" class="btn btn-secondary">
                                                <i class="fas fa-times me-1"></i> إلغاء
                                            </a>
                                        </div>
                                    </div>
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
                                <p>هل أنت متأكد من رغبتك في حذف المستخدم "<?php echo htmlspecialchars($user['username']); ?>"؟</p>
                                <div class="alert alert-danger">
                                    <i class="fas fa-exclamation-triangle me-1"></i> تحذير: سيؤدي هذا الإجراء إلى حذف جميع البيانات المرتبطة بهذا المستخدم (الرسائل، العضويات في الغرف، إلخ) بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <form action="user_delete.php" method="POST">
                                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                    <input type="hidden" name="user_id" value="<?php echo $user_id; ?>">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                                    <button type="submit" class="btn btn-danger">نعم، حذف المستخدم</button>
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
    
    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- سكريبت للتعامل مع النموذج -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // استهداف النموذج والحقول
            const form = document.getElementById('userForm');
            const changePasswordCheckbox = document.getElementById('change_password');
            const passwordField = document.getElementById('passwordField');
            const passwordInput = document.getElementById('password');
            const passwordConfirmInput = document.getElementById('password_confirm');
            const togglePasswordButton = document.getElementById('togglePassword');
            
            // تبديل عرض حقل كلمة المرور استنادًا إلى حالة تغيير كلمة المرور
            changePasswordCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    passwordField.style.display = 'flex';
                    passwordInput.required = true;
                    passwordConfirmInput.required = true;
                } else {
                    passwordField.style.display = 'none';
                    passwordInput.required = false;
                    passwordConfirmInput.required = false;
                }
            });
            
            // تبديل عرض كلمة المرور (إظهار/إخفاء)
            togglePasswordButton.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const icon = this.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
            
            // التحقق من النموذج قبل الإرسال
            form.addEventListener('submit', function(event) {
                let isValid = true;
                
                // التحقق من اسم المستخدم
                const usernameInput = document.getElementById('username');
                if (!usernameInput.value.trim()) {
                    isValid = false;
                    usernameInput.classList.add('is-invalid');
                    showValidationError(usernameInput, 'يرجى إدخال اسم المستخدم');
                } else if (usernameInput.value.length < 3 || usernameInput.value.length > 50) {
                    isValid = false;
                    usernameInput.classList.add('is-invalid');
                    showValidationError(usernameInput, 'يجب أن يكون اسم المستخدم بين 3 و 50 حرف');
                } else if (!(/^[a-zA-Z0-9_.\-]+$/).test(usernameInput.value)) {
                    isValid = false;
                    usernameInput.classList.add('is-invalid');
                    showValidationError(usernameInput, 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام ورموز _ . - فقط');
                } else {
                    usernameInput.classList.remove('is-invalid');
                    usernameInput.classList.add('is-valid');
                }
                
                // التحقق من البريد الإلكتروني
                const emailInput = document.getElementById('email');
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailInput.value.trim()) {
                    isValid = false;
                    emailInput.classList.add('is-invalid');
                    showValidationError(emailInput, 'يرجى إدخال البريد الإلكتروني');
                } else if (!emailRegex.test(emailInput.value)) {
                    isValid = false;
                    emailInput.classList.add('is-invalid');
                    showValidationError(emailInput, 'البريد الإلكتروني غير صالح');
                } else {
                    emailInput.classList.remove('is-invalid');
                    emailInput.classList.add('is-valid');
                }
                
                // التحقق من كلمة المرور إذا تم اختيار تغييرها
                if (changePasswordCheckbox.checked) {
                    if (!passwordInput.value) {
                        isValid = false;
                        passwordInput.classList.add('is-invalid');
                        showValidationError(passwordInput, 'يرجى إدخال كلمة المرور');
                    } else if (passwordInput.value.length < 8) {
                        isValid = false;
                        passwordInput.classList.add('is-invalid');
                        showValidationError(passwordInput, 'يجب أن تكون كلمة المرور 8 أحرف على الأقل');
                    } else {
                        passwordInput.classList.remove('is-invalid');
                        passwordInput.classList.add('is-valid');
                    }
                    
                    // التحقق من تطابق كلمة المرور
                    if (passwordInput.value !== passwordConfirmInput.value) {
                        isValid = false;
                        passwordConfirmInput.classList.add('is-invalid');
                        showValidationError(passwordConfirmInput, 'كلمات المرور غير متطابقة');
                    } else if (passwordInput.value) {
                        passwordConfirmInput.classList.remove('is-invalid');
                        passwordConfirmInput.classList.add('is-valid');
                    }
                }
                
                // منع إرسال النموذج إذا كان هناك أخطاء
                if (!isValid) {
                    event.preventDefault();
                }
            });
            
            // دالة لعرض رسالة خطأ التحقق
            function showValidationError(inputElement, message) {
                // إزالة رسائل الخطأ السابقة
                const existingFeedback = inputElement.nextElementSibling;
                if (existingFeedback && existingFeedback.classList.contains('invalid-feedback')) {
                    existingFeedback.remove();
                }
                
                // إضافة رسالة خطأ جديدة
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = message;
                
                // إضافة الرسالة بعد الحقل
                if (inputElement.parentNode.classList.contains('input-group')) {
                    inputElement.parentNode.parentNode.appendChild(feedback);
                } else {
                    inputElement.parentNode.appendChild(feedback);
                }
            }
            
            // إزالة تنسيقات التحقق عند تغيير قيمة الحقول
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('input', function() {
                    this.classList.remove('is-invalid');
                    this.classList.remove('is-valid');
                    
                    // إزالة رسائل الخطأ
                    const parent = this.parentNode.classList.contains('input-group') ? this.parentNode.parentNode : this.parentNode;
                    const feedback = parent.querySelector('.invalid-feedback');
                    if (feedback) {
                        feedback.remove();
                    }
                });
            });
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الوظائف الرئيسية**:
   - عرض معلومات المستخدم الحالية
   - تعديل بيانات المستخدم (اسم المستخدم، البريد الإلكتروني، الاسم الكامل، الدور، الحالة)
   - خيار تغيير كلمة المرور
   - عرض إحصائيات المستخدم (عدد الرسائل، عدد الغرف، آخر نشاط، آخر تسجيل دخول)
   - إجراءات سريعة (إدارة غرف المستخدم، عرض رسائل المستخدم، سجل النشاطات، حذف المستخدم)

2. **ميزات الأمان**:
   - التحقق من تسجيل الدخول وصلاحيات المسؤول
   - منع المستخدم من تعديل حسابه من هذه الصفحة (يجب استخدام صفحة الملف الشخصي)
   - التحقق من رمز CSRF لمنع هجمات تزوير الطلبات
   - تنظيف المدخلات لمنع هجمات XSS
   - استخدام Prepared Statements لمنع هجمات SQL Injection
   - تشفير كلمات المرور باستخدام خوارزمية Bcrypt
   - التحقق من فريدية اسم المستخدم والبريد الإلكتروني

3. **متطلبات الصفحة**:
   - ملفات التكوين (config.php)
   - ملفات الدوال المساعدة (auth_functions.php, admin_functions.php, general_functions.php)
   - Bootstrap RTL للتصميم المستجيب ودعم اللغة العربية
   - Font Awesome للأيقونات
   - القائمة الجانبية للوحة تحكم المسؤول (admin_sidebar.php)
   - JavaScript للتحقق من صحة النموذج وتحسين تجربة المستخدم

4. **التحقق من الصحة**:
   - التحقق من معرف المستخدم في URL
   - التحقق من اسم المستخدم (غير فارغ، الطول بين 3 و 50 حرف، الأحرف المسموح بها، غير مكرر)
   - التحقق من البريد الإلكتروني (غير فارغ، صيغة صحيحة، غير مكرر)
   - التحقق من الدور (admin أو client)
   - التحقق من كلمة المرور الجديدة إذا تم اختيار تغييرها (طول 8 أحرف على الأقل، تطابق التأكيد)
   - عرض رسائل خطأ واضحة في حالة وجود مشاكل
