
<?php
/**
 * ملف دوال المصادقة وإدارة الحسابات
 * يحتوي على الدوال المتعلقة بتسجيل الدخول وإدارة المستخدمين
 */

// تضمين ملف التكوين إذا لم يتم تضمينه سابقًا
if (!defined('DB_HOST')) {
    require_once 'config.php';
}

/**
 * دالة تسجيل الدخول للمستخدم
 * 
 * @param string $username اسم المستخدم
 * @param string $password كلمة المرور
 * @return bool|array مصفوفة تحتوي على بيانات المستخدم في حالة النجاح، false في حالة الفشل
 */
function loginUser($username, $password) {
    try {
        $conn = connectDB();
        
        // التحقق من عدد محاولات تسجيل الدخول الفاشلة
        if (checkLoginAttempts($_SERVER['REMOTE_ADDR'])) {
            // تجاوز العدد المسموح، يتم منع المستخدم مؤقتًا
            return false;
        }
        
        // البحث عن المستخدم في قاعدة البيانات
        $stmt = $conn->prepare("SELECT * FROM users WHERE username = :username AND active = TRUE AND (banned = FALSE OR bannedUntil < NOW())");
        $stmt->bindParam(':username', $username);
        $stmt->execute();
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // التحقق من وجود المستخدم وصحة كلمة المرور
        if ($user && password_verify($password, $user['password'])) {
            // تسجيل محاولة تسجيل الدخول الناجحة
            logLoginAttempt($username, $_SERVER['REMOTE_ADDR'], true);
            
            // تحديث وقت آخر تسجيل دخول
            updateLastLogin($user['id']);
            
            // بدء الجلسة وتخزين معلومات المستخدم
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['last_activity'] = time();
            
            // تسجيل النشاط
            logActivity($user['id'], 'تسجيل دخول', 'تسجيل دخول ناجح للنظام');
            
            return $user;
        } else {
            // تسجيل محاولة تسجيل الدخول الفاشلة
            logLoginAttempt($username, $_SERVER['REMOTE_ADDR'], false);
            return false;
        }
    } catch (PDOException $e) {
        error_log("خطأ في تسجيل الدخول: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة تسجيل الخروج للمستخدم
 * 
 * @return void
 */
function logoutUser() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // تسجيل نشاط الخروج إذا كان المستخدم مسجل دخوله
    if (isset($_SESSION['user_id'])) {
        logActivity($_SESSION['user_id'], 'تسجيل خروج', 'تسجيل خروج من النظام');
    }
    
    // تدمير الجلسة وحذف البيانات
    session_unset();
    session_destroy();
    
    // حذف ملف تعريف الارتباط للجلسة
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }
}

/**
 * دالة للتحقق من تسجيل دخول المستخدم
 * 
 * @return bool عودة صحيح إذا كان المستخدم مسجل دخوله، خطأ إذا لم يكن كذلك
 */
function isLoggedIn() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // التحقق من وجود معرف المستخدم في الجلسة
    if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
        return false;
    }
    
    // التحقق من مدة الخمول
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > 3600)) {
        // انتهت مدة الجلسة
        logoutUser();
        return false;
    }
    
    // تحديث وقت آخر نشاط
    $_SESSION['last_activity'] = time();
    
    return true;
}

/**
 * دالة للتحقق من صلاحيات المسؤول
 * 
 * @return bool عودة صحيح إذا كان المستخدم مسؤولًا، خطأ إذا لم يكن كذلك
 */
function isAdmin() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

/**
 * دالة للتحقق من صلاحية محددة للمستخدم
 * 
 * @param string $permission الصلاحية المطلوبة
 * @param string|null $userId معرف المستخدم (اختياري، يستخدم المستخدم الحالي إذا لم يتم تحديده)
 * @return bool عودة صحيح إذا كان لدى المستخدم الصلاحية، خطأ إذا لم يكن كذلك
 */
function hasPermission($permission, $userId = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // استخدام معرف المستخدم الحالي إذا لم يتم تحديد معرف
    if ($userId === null && isset($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
    }
    
    if (!$userId) {
        return false;
    }
    
    try {
        $conn = connectDB();
        
        // المسؤولين لديهم جميع الصلاحيات تلقائيًا
        $stmt = $conn->prepare("SELECT role FROM users WHERE id = :userId");
        $stmt->bindParam(':userId', $userId);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && $user['role'] === 'admin') {
            return true;
        }
        
        // التحقق من صلاحية محددة
        $stmt = $conn->prepare("SELECT $permission FROM permissions WHERE userId = :userId");
        $stmt->bindParam(':userId', $userId);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result && $result[$permission] == 1;
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من الصلاحيات: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة للتحقق من صلاحية الوصول إلى غرفة محددة
 * 
 * @param string $roomId معرف الغرفة
 * @param string|null $userId معرف المستخدم (اختياري، يستخدم المستخدم الحالي إذا لم يتم تحديده)
 * @return bool عودة صحيح إذا كان المستخدم لديه صلاحية الوصول للغرفة، خطأ إذا لم يكن كذلك
 */
function canAccessRoom($roomId, $userId = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // استخدام معرف المستخدم الحالي إذا لم يتم تحديد معرف
    if ($userId === null && isset($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
    }
    
    if (!$userId) {
        return false;
    }
    
    try {
        $conn = connectDB();
        
        // المسؤولين لديهم وصول لجميع الغرف
        $stmt = $conn->prepare("SELECT role FROM users WHERE id = :userId");
        $stmt->bindParam(':userId', $userId);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && $user['role'] === 'admin') {
            return true;
        }
        
        // التحقق من نوع الغرفة (عامة أو خاصة)
        $stmt = $conn->prepare("SELECT isPrivate FROM rooms WHERE id = :roomId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$room) {
            // الغرفة غير موجودة
            return false;
        }
        
        if (!$room['isPrivate']) {
            // الغرفة عامة، يمكن للجميع الوصول إليها
            return true;
        }
        
        // التحقق من وصول المستخدم للغرفة الخاصة
        $stmt = $conn->prepare("SELECT COUNT(*) FROM room_users WHERE roomId = :roomId AND userId = :userId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->bindParam(':userId', $userId);
        $stmt->execute();
        
        return $stmt->fetchColumn() > 0;
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من صلاحيات الغرفة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة تحديث آخر وقت تسجيل دخول للمستخدم
 * 
 * @param string $userId معرف المستخدم
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function updateLastLogin($userId) {
    try {
        $conn = connectDB();
        
        $stmt = $conn->prepare("UPDATE users SET lastLogin = NOW() WHERE id = :userId");
        $stmt->bindParam(':userId', $userId);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تحديث وقت آخر تسجيل دخول: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة تسجيل محاولة تسجيل الدخول
 * 
 * @param string $username اسم المستخدم
 * @param string $ipAddress عنوان IP للمستخدم
 * @param bool $success نجاح أو فشل محاولة تسجيل الدخول
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function logLoginAttempt($username, $ipAddress, $success) {
    try {
        $conn = connectDB();
        
        $stmt = $conn->prepare("INSERT INTO login_attempts (username, ipAddress, timestamp, success) VALUES (:username, :ipAddress, NOW(), :success)");
        $stmt->bindParam(':username', $username);
        $stmt->bindParam(':ipAddress', $ipAddress);
        $stmt->bindParam(':success', $success, PDO::PARAM_BOOL);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تسجيل محاولة الدخول: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة التحقق من عدد محاولات تسجيل الدخول الفاشلة
 * 
 * @param string $ipAddress عنوان IP للمستخدم
 * @param int $maxAttempts العدد الأقصى للمحاولات الفاشلة (افتراضيًا 5)
 * @param int $timeWindow الفترة الزمنية بالدقائق للتحقق (افتراضيًا 15)
 * @return bool عودة صحيح إذا تجاوز المستخدم العدد المسموح، خطأ إذا لم يتجاوز
 */
function checkLoginAttempts($ipAddress, $maxAttempts = 5, $timeWindow = 15) {
    try {
        $conn = connectDB();
        
        $stmt = $conn->prepare("SELECT COUNT(*) FROM login_attempts WHERE ipAddress = :ipAddress AND success = FALSE AND timestamp > DATE_SUB(NOW(), INTERVAL :timeWindow MINUTE)");
        $stmt->bindParam(':ipAddress', $ipAddress);
        $stmt->bindParam(':timeWindow', $timeWindow, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchColumn() >= $maxAttempts;
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من محاولات تسجيل الدخول: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة تسجيل نشاط المستخدم
 * 
 * @param string $userId معرف المستخدم
 * @param string $action نوع النشاط
 * @param string $details تفاصيل النشاط
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function logActivity($userId, $action, $details = '') {
    try {
        $conn = connectDB();
        
        $ipAddress = $_SERVER['REMOTE_ADDR'];
        
        $stmt = $conn->prepare("INSERT INTO audit_log (userId, action, details, timestamp, ipAddress) VALUES (:userId, :action, :details, NOW(), :ipAddress)");
        $stmt->bindParam(':userId', $userId);
        $stmt->bindParam(':action', $action);
        $stmt->bindParam(':details', $details);
        $stmt->bindParam(':ipAddress', $ipAddress);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تسجيل نشاط المستخدم: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة تسجيل نشاط المسؤول
 * 
 * @param string $details تفاصيل النشاط
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function logAdminActivity($details) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['user_id']) || !isAdmin()) {
        return false;
    }
    
    return logActivity($_SESSION['user_id'], 'admin_action', $details);
}

/**
 * دالة إنشاء مستخدم جديد
 * 
 * @param string $username اسم المستخدم
 * @param string $password كلمة المرور
 * @param string $role دور المستخدم (admin/client)
 * @param array $permissions صلاحيات المستخدم (اختياري)
 * @return bool|string معرف المستخدم في حالة النجاح، false في حالة الفشل
 */
function createUser($username, $password, $role = 'client', $permissions = []) {
    try {
        $conn = connectDB();
        
        // التحقق من وجود اسم المستخدم
        $stmt = $conn->prepare("SELECT COUNT(*) FROM users WHERE username = :username");
        $stmt->bindParam(':username', $username);
        $stmt->execute();
        
        if ($stmt->fetchColumn() > 0) {
            // اسم المستخدم موجود بالفعل
            return false;
        }
        
        // تشفير كلمة المرور
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // إنشاء معرف فريد
        $userId = uniqid('user_');
        
        // إنشاء حساب المستخدم
        $stmt = $conn->prepare("INSERT INTO users (id, username, password, role, createdAt, active) VALUES (:userId, :username, :password, :role, NOW(), TRUE)");
        $stmt->bindParam(':userId', $userId);
        $stmt->bindParam(':username', $username);
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':role', $role);
        
        if (!$stmt->execute()) {
            return false;
        }
        
        // تعيين الصلاحيات الافتراضية
        $defaultPermissions = [
            'canCreateRoom' => false,
            'canUploadFiles' => false,
            'canDeleteMessages' => false,
            'canBanUsers' => false
        ];
        
        // دمج الصلاحيات الافتراضية مع الصلاحيات المحددة
        $userPermissions = array_merge($defaultPermissions, $permissions);
        
        // إضافة صلاحيات المستخدم
        $stmt = $conn->prepare("INSERT INTO permissions (userId, canCreateRoom, canUploadFiles, canDeleteMessages, canBanUsers) VALUES (:userId, :canCreateRoom, :canUploadFiles, :canDeleteMessages, :canBanUsers)");
        $stmt->bindParam(':userId', $userId);
        $stmt->bindParam(':canCreateRoom', $userPermissions['canCreateRoom'], PDO::PARAM_BOOL);
        $stmt->bindParam(':canUploadFiles', $userPermissions['canUploadFiles'], PDO::PARAM_BOOL);
        $stmt->bindParam(':canDeleteMessages', $userPermissions['canDeleteMessages'], PDO::PARAM_BOOL);
        $stmt->bindParam(':canBanUsers', $userPermissions['canBanUsers'], PDO::PARAM_BOOL);
        
        if (!$stmt->execute()) {
            // حذف المستخدم في حالة فشل إضافة الصلاحيات
            $deleteStmt = $conn->prepare("DELETE FROM users WHERE id = :userId");
            $deleteStmt->bindParam(':userId', $userId);
            $deleteStmt->execute();
            
            return false;
        }
        
        return $userId;
    } catch (PDOException $e) {
        error_log("خطأ في إنشاء مستخدم جديد: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة تحديث كلمة مرور المستخدم
 * 
 * @param string $userId معرف المستخدم
 * @param string $newPassword كلمة المرور الجديدة
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function updatePassword($userId, $newPassword) {
    try {
        $conn = connectDB();
        
        // تشفير كلمة المرور الجديدة
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // تحديث كلمة المرور
        $stmt = $conn->prepare("UPDATE users SET password = :password WHERE id = :userId");
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':userId', $userId);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تحديث كلمة المرور: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة للتحقق من صحة كلمة المرور الحالية
 * 
 * @param string $userId معرف المستخدم
 * @param string $password كلمة المرور المراد التحقق منها
 * @return bool عودة صحيح إذا كانت كلمة المرور صحيحة، خطأ إذا لم تكن كذلك
 */
function verifyCurrentPassword($userId, $password) {
    try {
        $conn = connectDB();
        
        // جلب كلمة المرور المشفرة من قاعدة البيانات
        $stmt = $conn->prepare("SELECT password FROM users WHERE id = :userId");
        $stmt->bindParam(':userId', $userId);
        $stmt->execute();
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return false;
        }
        
        // التحقق من صحة كلمة المرور
        return password_verify($password, $user['password']);
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من كلمة المرور: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة حظر المستخدم
 * 
 * @param string $userId معرف المستخدم المراد حظره
 * @param string|null $until تاريخ انتهاء الحظر (اختياري، إذا كان null فسيكون الحظر دائمًا)
 * @param string|null $adminId معرف المسؤول الذي قام بالحظر (اختياري)
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function banUser($userId, $until = null, $adminId = null) {
    try {
        $conn = connectDB();
        
        // إذا كان تاريخ انتهاء الحظر محددًا
        if ($until) {
            $stmt = $conn->prepare("UPDATE users SET banned = TRUE, bannedUntil = :until WHERE id = :userId");
            $stmt->bindParam(':until', $until);
        } else {
            // حظر دائم
            $stmt = $conn->prepare("UPDATE users SET banned = TRUE, bannedUntil = NULL WHERE id = :userId");
        }
        
        $stmt->bindParam(':userId', $userId);
        
        if ($stmt->execute()) {
            // تسجيل نشاط الحظر
            if ($adminId) {
                logActivity($adminId, 'حظر مستخدم', "تم حظر المستخدم: $userId" . ($until ? " حتى $until" : " بشكل دائم"));
            }
            return true;
        }
        
        return false;
    } catch (PDOException $e) {
        error_log("خطأ في حظر المستخدم: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة إلغاء حظر المستخدم
 * 
 * @param string $userId معرف المستخدم المراد إلغاء حظره
 * @param string|null $adminId معرف المسؤول الذي قام بإلغاء الحظر (اختياري)
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function unbanUser($userId, $adminId = null) {
    try {
        $conn = connectDB();
        
        $stmt = $conn->prepare("UPDATE users SET banned = FALSE, bannedUntil = NULL WHERE id = :userId");
        $stmt->bindParam(':userId', $userId);
        
        if ($stmt->execute()) {
            // تسجيل نشاط إلغاء الحظر
            if ($adminId) {
                logActivity($adminId, 'إلغاء حظر مستخدم', "تم إلغاء حظر المستخدم: $userId");
            }
            return true;
        }
        
        return false;
    } catch (PDOException $e) {
        error_log("خطأ في إلغاء حظر المستخدم: " . $e->getMessage());
        return false;
    }
}
?>
