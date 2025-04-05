
# ملفات الدوال البرمجية PHP

**الوصف**: هذا الملف يحتوي على جميع الدوال والوظائف البرمجية الأساسية المستخدمة في نظام الدردشة المشفر.

**المسار**: مجلد `/includes` الذي يحتوي على ملفات الدوال المختلفة.

## الكود الكامل

### 1. ملف التكوين - config.php

```php
<?php
/**
 * ملف التكوين الرئيسي
 * يحتوي على إعدادات الاتصال بقاعدة البيانات ومفاتيح التشفير والإعدادات الأساسية للنظام
 */

// منع الوصول المباشر للملف
defined('BASEPATH') or define('BASEPATH', true);

// إعدادات التطبيق
define('APP_NAME', 'نظام الدردشة المشفر');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'http://localhost/secure-chat'); // تعديل هذا حسب رابط التطبيق الخاص بك

// إعدادات قاعدة البيانات
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'secure_chat_rbac');

// مفاتيح التشفير - هامة للأمان
// يجب تغيير هذه المفاتيح في بيئة الإنتاج
define('ENCRYPTION_KEY', 'your_secret_encryption_key_change_in_production');
define('CIPHER_METHOD', 'aes-256-cbc');
define('CSRF_TOKEN_SECRET', 'your_csrf_secret_key_change_in_production');

// المنطقة الزمنية
date_default_timezone_set('Asia/Riyadh');

// معالجة الأخطاء
ini_set('display_errors', 1); // ضع 0 في بيئة الإنتاج
ini_set('display_startup_errors', 1); // ضع 0 في بيئة الإنتاج
error_reporting(E_ALL);

// دالة اتصال قاعدة البيانات
function getDbConnection() {
    static $conn = null;
    
    if ($conn === null) {
        try {
            $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            $conn->set_charset("utf8mb4");
            
            // التحقق من وجود خطأ في الاتصال
            if ($conn->connect_error) {
                throw new Exception("فشل الاتصال بقاعدة البيانات: " . $conn->connect_error);
            }
        } catch (Exception $e) {
            // تسجيل الخطأ في ملف السجل بدلاً من عرضه للمستخدم في بيئة الإنتاج
            error_log($e->getMessage());
            die("حدث خطأ في الاتصال بقاعدة البيانات. يرجى الاتصال بمسؤول النظام.");
        }
    }
    
    return $conn;
}

// دالة تنفيذ الاستعلام مع الحماية من حقن SQL
function executeQuery($sql, $params = [], $types = "") {
    $conn = getDbConnection();
    
    if ($stmt = $conn->prepare($sql)) {
        if (!empty($params)) {
            // إذا لم يتم تحديد أنواع البارامترات، يتم تحديدها تلقائياً
            if (empty($types)) {
                $types = str_repeat("s", count($params));
            }
            
            $stmt->bind_param($types, ...$params);
        }
        
        if ($stmt->execute()) {
            $result = $stmt->get_result();
            $stmt->close();
            return $result;
        }
        
        $error = $stmt->error;
        $stmt->close();
        throw new Exception("فشل تنفيذ الاستعلام: " . $error);
    }
    
    throw new Exception("فشل إعداد الاستعلام: " . $conn->error);
}

// دالة تحميل الإعدادات من قاعدة البيانات
function loadSettings() {
    static $settings = null;
    
    if ($settings === null) {
        try {
            $result = executeQuery("SELECT * FROM system_settings");
            $settings = [];
            
            while ($row = $result->fetch_assoc()) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
        } catch (Exception $e) {
            error_log($e->getMessage());
            $settings = [];
        }
    }
    
    return $settings;
}

// تحميل الإعدادات عند بدء التطبيق
$GLOBALS['settings'] = loadSettings();

// التحقق من إجبار HTTPS
if (isset($GLOBALS['settings']['enforce_https']) && $GLOBALS['settings']['enforce_https'] == 1) {
    if (!isset($_SERVER['HTTPS']) || $_SERVER['HTTPS'] !== 'on') {
        // إعادة توجيه إلى HTTPS
        header("Location: https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']);
        exit();
    }
}
```

### 2. ملف دوال المصادقة - auth_functions.php

```php
<?php
/**
 * دوال المصادقة والتحقق من الصلاحيات
 * يحتوي على دوال التسجيل وتسجيل الدخول والتحقق من صلاحيات المستخدمين
 */

// منع الوصول المباشر للملف
defined('BASEPATH') or define('BASEPATH', true);

/**
 * تسجيل دخول المستخدم
 * 
 * @param string $username اسم المستخدم
 * @param string $password كلمة المرور
 * @return bool نجاح/فشل تسجيل الدخول
 */
function loginUser($username, $password) {
    try {
        // فحص عدد محاولات تسجيل الدخول الفاشلة
        checkLoginAttempts($_SERVER['REMOTE_ADDR']);
        
        // جلب بيانات المستخدم من قاعدة البيانات
        $sql = "SELECT id, username, password, role, is_active FROM users WHERE username = ?";
        $result = executeQuery($sql, [$username], "s");
        
        if ($result && $result->num_rows > 0) {
            $user = $result->fetch_assoc();
            
            // التحقق مما إذا كان الحساب نشطاً
            if (!$user['is_active']) {
                // تسجيل محاولة فاشلة
                recordFailedLogin($_SERVER['REMOTE_ADDR']);
                return false;
            }
            
            // التحقق من صحة كلمة المرور
            if (password_verify($password, $user['password'])) {
                // تسجيل الدخول بنجاح
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role'] = $user['role'];
                $_SESSION['logged_in'] = true;
                $_SESSION['login_time'] = time();
                
                // تحديث آخر تسجيل دخول
                updateLastLogin($user['id']);
                
                // إعادة تعيين محاولات تسجيل الدخول الفاشلة
                resetFailedLogins($_SERVER['REMOTE_ADDR']);
                
                return true;
            }
        }
        
        // تسجيل محاولة فاشلة
        recordFailedLogin($_SERVER['REMOTE_ADDR']);
        return false;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * تحديث آخر وقت تسجيل دخول للمستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @return bool نجاح/فشل التحديث
 */
function updateLastLogin($user_id) {
    try {
        $sql = "UPDATE users SET last_login = NOW() WHERE id = ?";
        executeQuery($sql, [$user_id], "i");
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * التحقق من محاولات تسجيل الدخول الفاشلة
 * 
 * @param string $ip عنوان IP للمستخدم
 * @throws Exception عند تجاوز الحد الأقصى لمحاولات تسجيل الدخول الفاشلة
 */
function checkLoginAttempts($ip) {
    $settings = $GLOBALS['settings'];
    $max_attempts = isset($settings['max_login_attempts']) ? (int) $settings['max_login_attempts'] : 5;
    $lockout_time = isset($settings['lockout_time']) ? (int) $settings['lockout_time'] : 15;
    
    try {
        $sql = "SELECT COUNT(*) as attempts, MAX(attempt_time) as last_attempt FROM login_attempts WHERE ip_address = ? AND success = 0";
        $result = executeQuery($sql, [$ip], "s");
        $row = $result->fetch_assoc();
        
        if ($row['attempts'] >= $max_attempts) {
            // التحقق مما إذا كانت فترة القفل لا تزال سارية
            $last_attempt = strtotime($row['last_attempt']);
            $lockout_seconds = $lockout_time * 60;
            $time_passed = time() - $last_attempt;
            
            if ($time_passed < $lockout_seconds) {
                $minutes_left = ceil(($lockout_seconds - $time_passed) / 60);
                throw new Exception("تم قفل الحساب بسبب محاولات تسجيل دخول فاشلة متكررة. يرجى المحاولة مرة أخرى بعد {$minutes_left} دقيقة.");
            } else {
                // إعادة تعيين المحاولات بعد انتهاء فترة القفل
                resetFailedLogins($ip);
            }
        }
    } catch (Exception $e) {
        if (strpos($e->getMessage(), "تم قفل الحساب") !== false) {
            throw $e;
        }
        error_log($e->getMessage());
    }
}

/**
 * تسجيل محاولة تسجيل دخول فاشلة
 * 
 * @param string $ip عنوان IP للمستخدم
 * @return bool نجاح/فشل التسجيل
 */
function recordFailedLogin($ip) {
    try {
        $sql = "INSERT INTO login_attempts (ip_address, success) VALUES (?, 0)";
        executeQuery($sql, [$ip], "s");
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * إعادة تعيين محاولات تسجيل الدخول الفاشلة
 * 
 * @param string $ip عنوان IP للمستخدم
 * @return bool نجاح/فشل إعادة التعيين
 */
function resetFailedLogins($ip) {
    try {
        $sql = "DELETE FROM login_attempts WHERE ip_address = ?";
        executeQuery($sql, [$ip], "s");
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * تسجيل خروج المستخدم
 * 
 * @return bool نجاح/فشل تسجيل الخروج
 */
function logoutUser() {
    // حفظ بعض المعلومات قبل حذف الجلسة
    $user_id = $_SESSION['user_id'] ?? null;
    
    // إزالة كل متغيرات الجلسة
    $_SESSION = [];
    
    // إزالة كوكيز الجلسة
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    // تدمير الجلسة
    session_destroy();
    
    // تسجيل عملية تسجيل الخروج إذا كان معرف المستخدم متاحاً
    if ($user_id) {
        try {
            $sql = "INSERT INTO activity_log (user_id, activity_type, description) VALUES (?, 'logout', 'تسجيل خروج من النظام')";
            executeQuery($sql, [$user_id], "i");
        } catch (Exception $e) {
            error_log($e->getMessage());
        }
    }
    
    return true;
}

/**
 * إنشاء حساب مستخدم جديد
 * 
 * @param array $userData بيانات المستخدم
 * @return int|bool معرف المستخدم الجديد أو false في حالة الفشل
 */
function createUser($userData) {
    try {
        // التحقق من وجود المستخدم بنفس اسم المستخدم أو البريد الإلكتروني
        $sql = "SELECT id FROM users WHERE username = ? OR email = ?";
        $result = executeQuery($sql, [$userData['username'], $userData['email']], "ss");
        
        if ($result->num_rows > 0) {
            throw new Exception("اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل");
        }
        
        // تشفير كلمة المرور
        $hashed_password = password_hash($userData['password'], PASSWORD_DEFAULT);
        
        // إدراج المستخدم الجديد
        $sql = "INSERT INTO users (username, password, email, full_name, role, is_active, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())";
        
        executeQuery($sql, [
            $userData['username'],
            $hashed_password,
            $userData['email'],
            $userData['full_name'],
            $userData['role'] ?? 'client',
            $userData['is_active'] ?? 1
        ], "sssssi");
        
        $user_id = getDbConnection()->insert_id;
        
        // تسجيل النشاط
        logActivity($user_id, 'user_created', "تم إنشاء حساب جديد");
        
        return $user_id;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * تحديث بيانات المستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @param array $userData بيانات المستخدم
 * @return bool نجاح/فشل التحديث
 */
function updateUser($user_id, $userData) {
    try {
        // التحقق من وجود المستخدم بنفس اسم المستخدم أو البريد الإلكتروني (باستثناء المستخدم الحالي)
        if (isset($userData['username']) || isset($userData['email'])) {
            $sql = "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?";
            $params = [
                $userData['username'] ?? '',
                $userData['email'] ?? '',
                $user_id
            ];
            $result = executeQuery($sql, $params, "ssi");
            
            if ($result->num_rows > 0) {
                throw new Exception("اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل");
            }
        }
        
        // بناء استعلام التحديث ديناميكياً
        $updateFields = [];
        $params = [];
        $types = "";
        
        // إعداد الحقول المطلوب تحديثها
        if (isset($userData['username'])) {
            $updateFields[] = "username = ?";
            $params[] = $userData['username'];
            $types .= "s";
        }
        
        if (isset($userData['email'])) {
            $updateFields[] = "email = ?";
            $params[] = $userData['email'];
            $types .= "s";
        }
        
        if (isset($userData['full_name'])) {
            $updateFields[] = "full_name = ?";
            $params[] = $userData['full_name'];
            $types .= "s";
        }
        
        if (isset($userData['password']) && !empty($userData['password'])) {
            $hashed_password = password_hash($userData['password'], PASSWORD_DEFAULT);
            $updateFields[] = "password = ?";
            $params[] = $hashed_password;
            $types .= "s";
        }
        
        if (isset($userData['role'])) {
            $updateFields[] = "role = ?";
            $params[] = $userData['role'];
            $types .= "s";
        }
        
        if (isset($userData['is_active'])) {
            $updateFields[] = "is_active = ?";
            $params[] = $userData['is_active'];
            $types .= "i";
        }
        
        // إذا لم تكن هناك حقول للتحديث، نعيد true
        if (empty($updateFields)) {
            return true;
        }
        
        // إضافة معرف المستخدم إلى البارامترات
        $params[] = $user_id;
        $types .= "i";
        
        // تنفيذ استعلام التحديث
        $sql = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
        executeQuery($sql, $params, $types);
        
        // تسجيل النشاط
        logActivity($user_id, 'user_updated', "تم تحديث بيانات المستخدم");
        
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * حذف مستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @return bool نجاح/فشل الحذف
 */
function deleteUser($user_id) {
    try {
        // حذف جميع الروابط بغرف الدردشة
        $sql = "DELETE FROM user_rooms WHERE user_id = ?";
        executeQuery($sql, [$user_id], "i");
        
        // حذف جميع رسائل المستخدم
        $sql = "DELETE FROM messages WHERE user_id = ?";
        executeQuery($sql, [$user_id], "i");
        
        // حذف سجلات نشاط المستخدم
        $sql = "DELETE FROM activity_log WHERE user_id = ?";
        executeQuery($sql, [$user_id], "i");
        
        // حذف المستخدم نفسه
        $sql = "DELETE FROM users WHERE id = ?";
        executeQuery($sql, [$user_id], "i");
        
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * التحقق من تسجيل دخول المستخدم
 * يستخدم كدالة حماية للصفحات التي تتطلب تسجيل الدخول
 * 
 * @return bool نجاح/فشل التحقق
 */
function checkLogin() {
    // التحقق من تسجيل الدخول
    if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
        // إعادة توجيه إلى صفحة تسجيل الدخول
        setFlashMessage('error', 'يرجى تسجيل الدخول للوصول إلى هذه الصفحة');
        redirect('../index.php');
        return false;
    }
    
    // التحقق من صلاحية الجلسة
    $settings = $GLOBALS['settings'];
    $session_lifetime = isset($settings['session_lifetime']) ? (int) $settings['session_lifetime'] : 120;
    $session_age = time() - $_SESSION['login_time'];
    
    if ($session_age > ($session_lifetime * 60)) {
        // تسجيل الخروج لانتهاء صلاحية الجلسة
        logoutUser();
        setFlashMessage('error', 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى');
        redirect('../index.php');
        return false;
    }
    
    // تحديث وقت تسجيل الدخول للجلسة الحالية
    $_SESSION['login_time'] = time();
    
    return true;
}

/**
 * التحقق من صلاحية المسؤول
 * يستخدم كدالة حماية للصفحات التي تتطلب صلاحيات المسؤول
 * 
 * @return bool نجاح/فشل التحقق
 */
function checkAdmin() {
    // التحقق من تسجيل الدخول أولاً
    if (!checkLogin()) {
        return false;
    }
    
    // التحقق من صلاحية المسؤول
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
        // إعادة توجيه إلى صفحة غير مصرح
        setFlashMessage('error', 'غير مصرح لك بالوصول إلى هذه الصفحة');
        redirect('../chat/rooms.php');
        return false;
    }
    
    return true;
}

/**
 * التحقق مما إذا كان المستخدم مسجل دخوله
 * 
 * @return bool نعم/لا
 */
function isLoggedIn() {
    return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

/**
 * التحقق مما إذا كان المستخدم مسؤولاً
 * 
 * @return bool نعم/لا
 */
function isAdmin() {
    return isLoggedIn() && isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}
```

### 3. ملف دوال الدردشة - chat_functions.php

```php
<?php
/**
 * دوال الدردشة
 * تتضمن وظائف إدارة الغرف والرسائل ومستخدمي الغرف
 */

// منع الوصول المباشر للملف
defined('BASEPATH') or define('BASEPATH', true);

/**
 * إنشاء غرفة دردشة جديدة
 * 
 * @param array $data بيانات الغرفة
 * @return int|bool معرف الغرفة أو false في حالة الفشل
 */
function createRoom($data) {
    try {
        // إنشاء مفتاح تشفير فريد للغرفة
        $encryption_key = bin2hex(random_bytes(16));
        
        // إدراج الغرفة
        $sql = "INSERT INTO rooms (name, description, created_by, encryption_key, is_active, created_at) 
                VALUES (?, ?, ?, ?, ?, NOW())";
        
        executeQuery($sql, [
            $data['name'],
            $data['description'] ?? '',
            $data['created_by'],
            $encryption_key,
            $data['is_active'] ?? 1
        ], "ssisi");
        
        $room_id = getDbConnection()->insert_id;
        
        // إضافة منشئ الغرفة كمستخدم لها
        addUserToRoom($data['created_by'], $room_id);
        
        // تسجيل النشاط
        logActivity($data['created_by'], 'room_created', "تم إنشاء غرفة جديدة: {$data['name']}");
        
        return $room_id;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * تحديث بيانات غرفة
 * 
 * @param int $room_id معرف الغرفة
 * @param array $data بيانات الغرفة
 * @return bool نجاح/فشل التحديث
 */
function updateRoom($room_id, $data) {
    try {
        // بناء استعلام التحديث ديناميكياً
        $updateFields = [];
        $params = [];
        $types = "";
        
        // إعداد الحقول المطلوب تحديثها
        if (isset($data['name'])) {
            $updateFields[] = "name = ?";
            $params[] = $data['name'];
            $types .= "s";
        }
        
        if (isset($data['description'])) {
            $updateFields[] = "description = ?";
            $params[] = $data['description'];
            $types .= "s";
        }
        
        if (isset($data['is_active'])) {
            $updateFields[] = "is_active = ?";
            $params[] = $data['is_active'];
            $types .= "i";
        }
        
        // إذا لم تكن هناك حقول للتحديث، نعيد true
        if (empty($updateFields)) {
            return true;
        }
        
        // إضافة معرف الغرفة إلى البارامترات
        $params[] = $room_id;
        $types .= "i";
        
        // تنفيذ استعلام التحديث
        $sql = "UPDATE rooms SET " . implode(", ", $updateFields) . " WHERE id = ?";
        executeQuery($sql, $params, $types);
        
        // تسجيل النشاط
        $current_user_id = $_SESSION['user_id'] ?? 0;
        logActivity($current_user_id, 'room_updated', "تم تحديث الغرفة: {$data['name']}");
        
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * حذف غرفة ومحتوياتها
 * 
 * @param int $room_id معرف الغرفة
 * @return bool نجاح/فشل الحذف
 */
function deleteRoom($room_id) {
    try {
        // حذف جميع رسائل الغرفة
        $sql = "DELETE FROM messages WHERE room_id = ?";
        executeQuery($sql, [$room_id], "i");
        
        // حذف جميع مستخدمي الغرفة
        $sql = "DELETE FROM user_rooms WHERE room_id = ?";
        executeQuery($sql, [$room_id], "i");
        
        // حذف الغرفة نفسها
        $sql = "DELETE FROM rooms WHERE id = ?";
        executeQuery($sql, [$room_id], "i");
        
        // تسجيل النشاط
        $current_user_id = $_SESSION['user_id'] ?? 0;
        logActivity($current_user_id, 'room_deleted', "تم حذف غرفة");
        
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * تبديل حالة الغرفة بين نشطة وغير نشطة
 * 
 * @param int $room_id معرف الغرفة
 * @return bool نجاح/فشل التحديث
 */
function toggleRoomStatus($room_id) {
    try {
        // جلب الحالة الحالية
        $sql = "SELECT is_active, name FROM rooms WHERE id = ?";
        $result = executeQuery($sql, [$room_id], "i");
        
        if ($result->num_rows === 0) {
            return false;
        }
        
        $room = $result->fetch_assoc();
        $new_status = $room['is_active'] ? 0 : 1;
        
        // تحديث الحالة
        $sql = "UPDATE rooms SET is_active = ? WHERE id = ?";
        executeQuery($sql, [$new_status, $room_id], "ii");
        
        // تسجيل النشاط
        $current_user_id = $_SESSION['user_id'] ?? 0;
        $status_text = $new_status ? "تفعيل" : "تعطيل";
        logActivity($current_user_id, 'room_status_changed', "تم {$status_text} الغرفة: {$room['name']}");
        
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * إضافة مستخدم إلى غرفة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @return bool نجاح/فشل الإضافة
 */
function addUserToRoom($user_id, $room_id) {
    try {
        // التحقق مما إذا كان المستخدم موجوداً بالفعل في الغرفة
        $sql = "SELECT id FROM user_rooms WHERE user_id = ? AND room_id = ?";
        $result = executeQuery($sql, [$user_id, $room_id], "ii");
        
        if ($result->num_rows > 0) {
            return true; // المستخدم موجود بالفعل
        }
        
        // إضافة المستخدم إلى الغرفة
        $sql = "INSERT INTO user_rooms (user_id, room_id, joined_at) VALUES (?, ?, NOW())";
        executeQuery($sql, [$user_id, $room_id], "ii");
        
        // تسجيل النشاط
        $current_user_id = $_SESSION['user_id'] ?? 0;
        
        // إذا كان المستخدم المضاف هو نفسه المستخدم الحالي
        if ($user_id == $current_user_id) {
            logActivity($current_user_id, 'room_joined', "انضم إلى غرفة جديدة");
        } else {
            // جلب اسم المستخدم وعنوان الغرفة
            $sql = "SELECT u.username, r.name FROM users u, rooms r WHERE u.id = ? AND r.id = ?";
            $result = executeQuery($sql, [$user_id, $room_id], "ii");
            $info = $result->fetch_assoc();
            
            logActivity($current_user_id, 'user_added_to_room', "تمت إضافة {$info['username']} إلى غرفة {$info['name']}");
        }
        
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * إزالة مستخدم من غرفة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @return bool نجاح/فشل الإزالة
 */
function removeUserFromRoom($user_id, $room_id) {
    try {
        // إزالة المستخدم من الغرفة
        $sql = "DELETE FROM user_rooms WHERE user_id = ? AND room_id = ?";
        executeQuery($sql, [$user_id, $room_id], "ii");
        
        // تسجيل النشاط
        $current_user_id = $_SESSION['user_id'] ?? 0;
        
        // جلب اسم المستخدم وعنوان الغرفة
        $sql = "SELECT u.username, r.name FROM users u, rooms r WHERE u.id = ? AND r.id = ?";
        $result = executeQuery($sql, [$user_id, $room_id], "ii");
        
        if ($result->num_rows > 0) {
            $info = $result->fetch_assoc();
            
            if ($user_id == $current_user_id) {
                logActivity($current_user_id, 'room_left', "غادر غرفة {$info['name']}");
            } else {
                logActivity($current_user_id, 'user_removed_from_room', "تمت إزالة {$info['username']} من غرفة {$info['name']}");
            }
        }
        
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * حفظ رسالة جديدة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @param string $message نص الرسالة
 * @return int|bool معرف الرسالة أو false في حالة الفشل
 */
function saveMessage($user_id, $room_id, $message) {
    try {
        // التحقق من وصول المستخدم للغرفة
        if (!canAccessRoom($user_id, $room_id)) {
            return false;
        }
        
        // إدراج الرسالة
        $sql = "INSERT INTO messages (user_id, room_id, message, created_at) VALUES (?, ?, ?, NOW())";
        executeQuery($sql, [$user_id, $room_id, $message], "iis");
        
        $message_id = getDbConnection()->insert_id;
        
        // تحديث وقت نشاط المستخدم في الغرفة
        updateUserRoomActivity($user_id, $room_id);
        
        return $message_id;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * جلب رسائل غرفة
 * 
 * @param int $room_id معرف الغرفة
 * @param int $limit عدد الرسائل
 * @param int $offset بداية من
 * @return array|bool مصفوفة الرسائل أو false في حالة الفشل
 */
function getRoomMessages($room_id, $limit = 50, $offset = 0) {
    try {
        $sql = "SELECT m.id, m.user_id, m.message, m.created_at, u.username 
                FROM messages m 
                JOIN users u ON m.user_id = u.id 
                WHERE m.room_id = ? 
                ORDER BY m.created_at DESC 
                LIMIT ? OFFSET ?";
        
        $result = executeQuery($sql, [$room_id, $limit, $offset], "iii");
        
        $messages = [];
        while ($row = $result->fetch_assoc()) {
            $messages[] = $row;
        }
        
        return $messages;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * جلب رسائل غرفة مع فك تشفيرها
 * 
 * @param int $room_id معرف الغرفة
 * @param string $encryption_key مفتاح التشفير
 * @param int $limit عدد الرسائل
 * @param int $offset بداية من
 * @return array|bool مصفوفة الرسائل أو false في حالة الفشل
 */
function getDecryptedRoomMessages($room_id, $encryption_key, $limit = 50, $offset = 0) {
    $messages = getRoomMessages($room_id, $limit, $offset);
    
    if (!$messages) {
        return false;
    }
    
    // فك تشفير الرسائل
    foreach ($messages as &$message) {
        $message['message'] = decryptMessage($message['message'], $encryption_key);
    }
    
    return $messages;
}

/**
 * جلب رسائل جديدة منذ وقت محدد
 * 
 * @param int $room_id معرف الغرفة
 * @param string $last_time آخر وقت
 * @param string $encryption_key مفتاح التشفير
 * @return array|bool مصفوفة الرسائل أو false في حالة الفشل
 */
function getNewMessages($room_id, $last_time, $encryption_key) {
    try {
        $sql = "SELECT m.id, m.user_id, m.message, m.created_at, u.username 
                FROM messages m 
                JOIN users u ON m.user_id = u.id 
                WHERE m.room_id = ? AND m.created_at > ?
                ORDER BY m.created_at ASC";
        
        $result = executeQuery($sql, [$room_id, $last_time], "is");
        
        $messages = [];
        while ($row = $result->fetch_assoc()) {
            // فك تشفير الرسالة
            $row['message'] = decryptMessage($row['message'], $encryption_key);
            $messages[] = $row;
        }
        
        return $messages;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * جلب معلومات غرفة
 * 
 * @param int $room_id معرف الغرفة
 * @return array|bool معلومات الغرفة أو false في حالة الفشل
 */
function getRoomById($room_id) {
    try {
        $sql = "SELECT r.*, u.username as creator_name, 
                (SELECT COUNT(*) FROM user_rooms WHERE room_id = r.id) as users_count,
                (SELECT COUNT(*) FROM messages WHERE room_id = r.id) as messages_count
                FROM rooms r 
                JOIN users u ON r.created_by = u.id 
                WHERE r.id = ?";
        
        $result = executeQuery($sql, [$room_id], "i");
        
        if ($result->num_rows === 0) {
            return false;
        }
        
        return $result->fetch_assoc();
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * جلب الغرف المتاحة للمستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @return array|bool مصفوفة الغرف أو false في حالة الفشل
 */
function getUserAvailableRooms($user_id) {
    try {
        $sql = "SELECT r.*, 
                (SELECT COUNT(*) FROM messages m WHERE m.room_id = r.id AND m.created_at > 
                    IFNULL((SELECT last_activity FROM user_rooms WHERE user_id = ? AND room_id = r.id), '1970-01-01')
                ) as unread_count
                FROM rooms r 
                JOIN user_rooms ur ON r.id = ur.room_id 
                WHERE ur.user_id = ? AND r.is_active = 1
                ORDER BY r.name ASC";
        
        $result = executeQuery($sql, [$user_id, $user_id], "ii");
        
        $rooms = [];
        while ($row = $result->fetch_assoc()) {
            $rooms[] = $row;
        }
        
        return $rooms;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * جلب جميع الغرف
 * 
 * @param string $search نص البحث
 * @param int $page رقم الصفحة
 * @param int $per_page عدد العناصر في الصفحة
 * @param string $sort_by ترتيب حسب
 * @param string $sort_order اتجاه الترتيب
 * @param string $status_filter تصفية حسب الحالة
 * @return array مصفوفة تحتوي على الغرف والعدد الإجمالي
 */
function getRooms($search = '', $page = 1, $per_page = 10, $sort_by = 'name', $sort_order = 'ASC', $status_filter = '') {
    try {
        // حساب الإزاحة
        $offset = ($page - 1) * $per_page;
        
        // بناء شروط الاستعلام
        $where_clauses = [];
        $params = [];
        $types = "";
        
        if (!empty($search)) {
            $where_clauses[] = "(r.name LIKE ? OR r.description LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $types .= "ss";
        }
        
        if ($status_filter === 'active') {
            $where_clauses[] = "r.is_active = 1";
        } elseif ($status_filter === 'inactive') {
            $where_clauses[] = "r.is_active = 0";
        }
        
        // دمج شروط الاستعلام
        $where_sql = empty($where_clauses) ? "" : "WHERE " . implode(" AND ", $where_clauses);
        
        // التحقق من صحة حقل الفرز
        $allowed_sort_fields = ['name', 'users_count', 'messages_count', 'created_at'];
        if (!in_array($sort_by, $allowed_sort_fields)) {
            $sort_by = 'name';
        }
        
        // التحقق من صحة اتجاه الفرز
        $sort_order = ($sort_order === 'DESC') ? 'DESC' : 'ASC';
        
        // استعلام العدد الإجمالي
        $count_sql = "SELECT COUNT(*) as total FROM rooms r {$where_sql}";
        $count_result = executeQuery($count_sql, $params, $types);
        $total = $count_result->fetch_assoc()['total'];
        
        // استعلام جلب الغرف
        $sql = "SELECT r.*, 
                (SELECT COUNT(*) FROM user_rooms WHERE room_id = r.id) as users_count,
                (SELECT COUNT(*) FROM messages WHERE room_id = r.id) as messages_count,
                u.username as creator_name
                FROM rooms r 
                JOIN users u ON r.created_by = u.id 
                {$where_sql}
                ORDER BY {$sort_by} {$sort_order}
                LIMIT ? OFFSET ?";
        
        // إضافة بارامترات الحد والإزاحة
        $params[] = $per_page;
        $params[] = $offset;
        $types .= "ii";
        
        $result = executeQuery($sql, $params, $types);
        
        $rooms = [];
        while ($row = $result->fetch_assoc()) {
            $rooms[] = $row;
        }
        
        return [
            'rooms' => $rooms,
            'total' => $total
        ];
    } catch (Exception $e) {
        error_log($e->getMessage());
        return [
            'rooms' => [],
            'total' => 0
        ];
    }
}

/**
 * التحقق مما إذا كان المستخدم يمكنه الوصول إلى غرفة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @return bool يمكن/لا يمكن الوصول
 */
function canAccessRoom($user_id, $room_id) {
    try {
        // المسؤولون يمكنهم الوصول إلى جميع الغرف
        if (isAdmin()) {
            return true;
        }
        
        $sql = "SELECT id FROM user_rooms WHERE user_id = ? AND room_id = ?";
        $result = executeQuery($sql, [$user_id, $room_id], "ii");
        
        return $result->num_rows > 0;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * تحديث وقت نشاط المستخدم في غرفة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @return bool نجاح/فشل التحديث
 */
function updateUserRoomActivity($user_id, $room_id) {
    try {
        $sql = "UPDATE user_rooms SET last_activity = NOW() WHERE user_id = ? AND room_id = ?";
        executeQuery($sql, [$user_id, $room_id], "ii");
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * جلب المستخدمين النشطين في غرفة
 * 
 * @param int $room_id معرف الغرفة
 * @param int $active_minutes الدقائق التي يعتبر بعدها المستخدم غير نشط
 * @return array|bool مصفوفة المستخدمين النشطين أو false في حالة الفشل
 */
function getActiveUsersInRoom($room_id, $active_minutes = 5) {
    try {
        $sql = "SELECT u.id, u.username 
                FROM users u 
                JOIN user_rooms ur ON u.id = ur.user_id 
                WHERE ur.room_id = ? AND ur.last_activity > DATE_SUB(NOW(), INTERVAL ? MINUTE)
                ORDER BY u.username ASC";
        
        $result = executeQuery($sql, [$room_id, $active_minutes], "ii");
        
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
        
        return $users;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}
```

### 4. ملف دوال التشفير - encryption_functions.php

```php
<?php
/**
 * دوال التشفير
 * تتضمن وظائف تشفير وفك تشفير البيانات
 */

// منع الوصول المباشر للملف
defined('BASEPATH') or define('BASEPATH', true);

/**
 * تشفير رسالة باستخدام خوارزمية AES
 * 
 * @param string $plaintext النص المراد تشفيره
 * @param string $key مفتاح التشفير
 * @return string النص المشفر
 */
function encryptMessage($plaintext, $key) {
    try {
        // جلب طريقة التشفير من الإعدادات أو استخدام القيمة الافتراضية
        $cipher = $GLOBALS['settings']['encryption_method'] ?? CIPHER_METHOD;
        
        // إنشاء متجه التهيئة (IV) بطول مناسب للخوارزمية
        $ivlen = openssl_cipher_iv_length($cipher);
        $iv = openssl_random_pseudo_bytes($ivlen);
        
        // تشفير النص
        $ciphertext = openssl_encrypt($plaintext, $cipher, $key, 0, $iv);
        
        // دمج IV مع النص المشفر لاستخدامه لاحقًا في فك التشفير
        $encrypted = base64_encode($iv . base64_decode($ciphertext));
        
        return $encrypted;
    } catch (Exception $e) {
        error_log("خطأ في التشفير: " . $e->getMessage());
        return $plaintext; // في حالة الفشل نعيد النص الأصلي بدون تشفير
    }
}

/**
 * فك تشفير رسالة مشفرة باستخدام خوارزمية AES
 * 
 * @param string $encrypted النص المشفر
 * @param string $key مفتاح التشفير
 * @return string النص الأصلي بعد فك التشفير
 */
function decryptMessage($encrypted, $key) {
    try {
        // جلب طريقة التشفير من الإعدادات أو استخدام القيمة الافتراضية
        $cipher = $GLOBALS['settings']['encryption_method'] ?? CIPHER_METHOD;
        
        // فك ترميز النص المشفر
        $encrypted_data = base64_decode($encrypted);
        
        // استخراج متجه التهيئة (IV) من بداية النص المشفر
        $ivlen = openssl_cipher_iv_length($cipher);
        $iv = substr($encrypted_data, 0, $ivlen);
        
        // استخراج النص المشفر (بدون IV)
        $ciphertext = base64_encode(substr($encrypted_data, $ivlen));
        
        // فك تشفير النص
        $plaintext = openssl_decrypt($ciphertext, $cipher, $key, 0, $iv);
        
        return $plaintext;
    } catch (Exception $e) {
        error_log("خطأ في فك التشفير: " . $e->getMessage());
        return "[ رسالة غير قابلة للقراءة ]"; // في حالة الفشل نعيد رسالة خطأ
    }
}

/**
 * تشفير كلمة المرور باستخدام خوارزمية bcrypt
 * 
 * @param string $password كلمة المرور
 * @return string كلمة المرور المشفرة
 */
function encryptPassword($password) {
    // استخدام password_hash مع bcrypt لتشفير كلمة المرور
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * التحقق من صحة كلمة المرور
 * 
 * @param string $password كلمة المرور غير المشفرة
 * @param string $hash كلمة المرور المشفرة
 * @return bool صحيحة/غير صحيحة
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * إنشاء توقيع HMAC للبيانات
 * 
 * @param string $data البيانات المراد توقيعها
 * @param string $key المفتاح السري
 * @return string التوقيع
 */
function createHmacSignature($data, $key = CSRF_TOKEN_SECRET) {
    return hash_hmac('sha256', $data, $key);
}

/**
 * التحقق من صحة توقيع HMAC
 * 
 * @param string $data البيانات
 * @param string $signature التوقيع المقدم
 * @param string $key المفتاح السري
 * @return bool صحيح/غير صحيح
 */
function verifyHmacSignature($data, $signature, $key = CSRF_TOKEN_SECRET) {
    $expected = createHmacSignature($data, $key);
    return hash_equals($expected, $signature);
}
```

### 5. ملف الدوال العامة - general_functions.php

```php
<?php
/**
 * دوال عامة
 * تتضمن وظائف مساعدة تستخدم في جميع أنحاء التطبيق
 */

// منع الوصول المباشر للملف
defined('BASEPATH') or define('BASEPATH', true);

/**
 * تنظيف المدخلات لمنع هجمات XSS و SQL Injection
 * 
 * @param string $input النص المراد تنظيفه
 * @return string النص بعد التنظيف
 */
function cleanInput($input) {
    $input = trim($input);
    $input = stripslashes($input);
    $input = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
    return $input;
}

/**
 * إعادة التوجيه إلى مسار محدد
 * 
 * @param string $location المسار المطلوب التوجيه إليه
 * @param int $status_code كود الحالة HTTP
 */
function redirect($location, $status_code = 302) {
    header("Location: {$location}", true, $status_code);
    exit;
}

/**
 * تعيين رسالة فلاش ليتم عرضها في الطلب التالي
 * 
 * @param string $type نوع الرسالة (success, error, warning, info)
 * @param string $message نص الرسالة
 */
function setFlashMessage($type, $message) {
    if (!isset($_SESSION['flash_messages'])) {
        $_SESSION['flash_messages'] = [];
    }
    
    $_SESSION['flash_messages'][] = [
        'type' => $type,
        'message' => $message
    ];
}

/**
 * عرض رسائل الفلاش وإزالتها
 */
function displayFlashMessages() {
    if (isset($_SESSION['flash_messages']) && !empty($_SESSION['flash_messages'])) {
        foreach ($_SESSION['flash_messages'] as $message) {
            $type = isset($message['type']) ? $message['type'] : 'info';
            $text = isset($message['message']) ? $message['message'] : '';
            
            // تحويل النوع إلى فئة Bootstrap المناسبة
            $class = 'info';
            $icon = 'fa-info-circle';
            
            switch ($type) {
                case 'success':
                    $class = 'success';
                    $icon = 'fa-check-circle';
                    break;
                case 'error':
                    $class = 'danger';
                    $icon = 'fa-exclamation-circle';
                    break;
                case 'warning':
                    $class = 'warning';
                    $icon = 'fa-exclamation-triangle';
                    break;
            }
            
            echo '<div class="alert alert-' . $class . ' alert-dismissible fade show" role="alert">';
            echo '<i class="fas ' . $icon . ' me-1"></i> ' . $text;
            echo '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>';
            echo '</div>';
        }
        
        // إزالة رسائل الفلاش بعد عرضها
        unset($_SESSION['flash_messages']);
    }
}

/**
 * تسجيل نشاط في سجل النشاطات
 * 
 * @param int $user_id معرف المستخدم
 * @param string $activity_type نوع النشاط
 * @param string $description وصف النشاط
 * @return bool نجاح/فشل التسجيل
 */
function logActivity($user_id, $activity_type, $description) {
    try {
        $sql = "INSERT INTO activity_log (user_id, activity_type, description, ip_address, created_at) 
                VALUES (?, ?, ?, ?, NOW())";
        
        executeQuery($sql, [
            $user_id,
            $activity_type,
            $description,
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ], "isss");
        
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * جلب آخر الأنشطة من سجل النشاطات
 * 
 * @param int $limit عدد الأنشطة
 * @return array|bool مصفوفة الأنشطة أو false في حالة الفشل
 */
function getRecentActivities($limit = 10) {
    try {
        $sql = "SELECT a.*, u.username 
                FROM activity_log a 
                JOIN users u ON a.user_id = u.id 
                ORDER BY a.created_at DESC 
                LIMIT ?";
        
        $result = executeQuery($sql, [$limit], "i");
        
        $activities = [];
        while ($row = $result->fetch_assoc()) {
            $activities[] = $row;
        }
        
        return $activities;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * تنسيق الوقت المنقضي منذ تاريخ معين
 * 
 * @param string $datetime التاريخ والوقت
 * @return string النص المنسق (مثال: "منذ 5 دقائق")
 */
function formatTimeAgo($datetime) {
    $time = strtotime($datetime);
    $time_diff = time() - $time;
    
    if ($time_diff < 60) {
        return 'منذ لحظات';
    } elseif ($time_diff < 3600) {
        $minutes = round($time_diff / 60);
        return 'منذ ' . $minutes . ' ' . ($minutes > 1 ? 'دقائق' : 'دقيقة');
    } elseif ($time_diff < 86400) {
        $hours = round($time_diff / 3600);
        return 'منذ ' . $hours . ' ' . ($hours > 1 ? 'ساعات' : 'ساعة');
    } elseif ($time_diff < 604800) {
        $days = round($time_diff / 86400);
        return 'منذ ' . $days . ' ' . ($days > 1 ? 'أيام' : 'يوم');
    } elseif ($time_diff < 2592000) {
        $weeks = round($time_diff / 604800);
        return 'منذ ' . $weeks . ' ' . ($weeks > 1 ? 'أسابيع' : 'أسبوع');
    } elseif ($time_diff < 31536000) {
        $months = round($time_diff / 2592000);
        return 'منذ ' . $months . ' ' . ($months > 1 ? 'أشهر' : 'شهر');
    } else {
        $years = round($time_diff / 31536000);
        return 'منذ ' . $years . ' ' . ($years > 1 ? 'سنوات' : 'سنة');
    }
}

/**
 * تنسيق التاريخ والوقت
 * 
 * @param string $datetime التاريخ والوقت
 * @param string $format صيغة التنسيق
 * @return string التاريخ والوقت المنسق
 */
function formatDateTime($datetime, $format = null) {
    $settings = $GLOBALS['settings'];
    
    if ($format === null) {
        $date_format = isset($settings['date_format']) ? $settings['date_format'] : 'Y-m-d';
        $time_format = isset($settings['time_format']) ? $settings['time_format'] : 'H:i:s';
        $format = $date_format . ' ' . $time_format;
    }
    
    $timestamp = strtotime($datetime);
    return date($format, $timestamp);
}

/**
 * تنسيق التاريخ فقط
 * 
 * @param string $datetime التاريخ والوقت
 * @return string التاريخ المنسق
 */
function formatDate($datetime) {
    $settings = $GLOBALS['settings'];
    $format = isset($settings['date_format']) ? $settings['date_format'] : 'Y-m-d';
    
    $timestamp = strtotime($datetime);
    return date($format, $timestamp);
}

/**
 * تنسيق الوقت فقط
 * 
 * @param string $datetime التاريخ والوقت
 * @return string الوقت المنسق
 */
function formatTime($datetime) {
    $settings = $GLOBALS['settings'];
    $format = isset($settings['time_format']) ? $settings['time_format'] : 'H:i:s';
    
    $timestamp = strtotime($datetime);
    return date($format, $timestamp);
}

/**
 * اختصار النص إلى طول محدد
 * 
 * @param string $text النص
 * @param int $length الطول المطلوب
 * @param string $suffix اللاحقة عند الاختصار
 * @return string النص المختصر
 */
function truncateText($text, $length = 100, $suffix = '...') {
    if (mb_strlen($text, 'UTF-8') <= $length) {
        return $text;
    }
    
    return mb_substr($text, 0, $length, 'UTF-8') . $suffix;
}

/**
 * التحقق من صحة البريد الإلكتروني
 * 
 * @param string $email البريد الإلكتروني
 * @return bool صحيح/غير صحيح
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * إنشاء اسم ملف فريد للتحميل
 * 
 * @param string $filename اسم الملف الأصلي
 * @return string اسم الملف الفريد
 */
function generateUniqueFilename($filename) {
    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    $unique_name = uniqid('file_', true);
    return $unique_name . '.' . $ext;
}

/**
 * التحقق من امتداد الملف المسموح به
 * 
 * @param string $filename اسم الملف
 * @param array $allowed_extensions الامتدادات المسموح بها
 * @return bool مسموح/غير مسموح
 */
function isAllowedFileExtension($filename, $allowed_extensions = null) {
    if ($allowed_extensions === null) {
        // جلب الامتدادات المسموح بها من الإعدادات
        $settings = $GLOBALS['settings'];
        $allowed_types = isset($settings['allowed_file_types']) ? $settings['allowed_file_types'] : 'jpg,jpeg,png,gif,pdf,doc,docx';
        $allowed_extensions = explode(',', $allowed_types);
    }
    
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($ext, $allowed_extensions);
}
```

### 6. ملف دوال المسؤول - admin_functions.php

```php
<?php
/**
 * دوال المسؤول
 * تتضمن وظائف خاصة بإدارة النظام ولوحة تحكم المسؤول
 */

// منع الوصول المباشر للملف
defined('BASEPATH') or define('BASEPATH', true);

/**
 * جلب جميع المستخدمين مع دعم البحث والتصفية والترتيب
 * 
 * @param string $search نص البحث
 * @param int $page رقم الصفحة
 * @param int $per_page عدد العناصر في الصفحة
 * @param string $sort_by ترتيب حسب
 * @param string $sort_order اتجاه الترتيب
 * @param string $role_filter تصفية حسب الدور
 * @return array مصفوفة تحتوي على المستخدمين والعدد الإجمالي
 */
function getUsers($search = '', $page = 1, $per_page = 10, $sort_by = 'username', $sort_order = 'ASC', $role_filter = '') {
    try {
        // حساب الإزاحة
        $offset = ($page - 1) * $per_page;
        
        // بناء شروط الاستعلام
        $where_clauses = [];
        $params = [];
        $types = "";
        
        if (!empty($search)) {
            $where_clauses[] = "(username LIKE ? OR email LIKE ? OR full_name LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $types .= "sss";
        }
        
        if (!empty($role_filter)) {
            $where_clauses[] = "role = ?";
            $params[] = $role_filter;
            $types .= "s";
        }
        
        // دمج شروط الاستعلام
        $where_sql = empty($where_clauses) ? "" : "WHERE " . implode(" AND ", $where_clauses);
        
        // التحقق من صحة حقل الفرز
        $allowed_sort_fields = ['username', 'full_name', 'email', 'role', 'last_login', 'created_at'];
        if (!in_array($sort_by, $allowed_sort_fields)) {
            $sort_by = 'username';
        }
        
        // التحقق من صحة اتجاه الفرز
        $sort_order = ($sort_order === 'DESC') ? 'DESC' : 'ASC';
        
        // استعلام العدد الإجمالي
        $count_sql = "SELECT COUNT(*) as total FROM users {$where_sql}";
        $count_result = executeQuery($count_sql, $params, $types);
        $total = $count_result->fetch_assoc()['total'];
        
        // استعلام جلب المستخدمين
        $sql = "SELECT * FROM users {$where_sql} ORDER BY {$sort_by} {$sort_order} LIMIT ? OFFSET ?";
        
        // إضافة بارامترات الحد والإزاحة
        $params[] = $per_page;
        $params[] = $offset;
        $types .= "ii";
        
        $result = executeQuery($sql, $params, $types);
        
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
        
        return [
            'users' => $users,
            'total' => $total
        ];
    } catch (Exception $e) {
        error_log($e->getMessage());
        return [
            'users' => [],
            'total' => 0
        ];
    }
}

/**
 * جلب العدد الإجمالي للمستخدمين
 * 
 * @return int العدد الإجمالي
 */
function getTotalUsers() {
    try {
        $sql = "SELECT COUNT(*) as total FROM users";
        $result = executeQuery($sql);
        return $result->fetch_assoc()['total'];
    } catch (Exception $e) {
        error_log($e->getMessage());
        return 0;
    }
}

/**
 * جلب العدد الإجمالي للغرف
 * 
 * @return int العدد الإجمالي
 */
function getTotalRooms() {
    try {
        $sql = "SELECT COUNT(*) as total FROM rooms";
        $result = executeQuery($sql);
        return $result->fetch_assoc()['total'];
    } catch (Exception $e) {
        error_log($e->getMessage());
        return 0;
    }
}

/**
 * جلب العدد الإجمالي للرسائل
 * 
 * @return int العدد الإجمالي
 */
function getTotalMessages() {
    try {
        $sql = "SELECT COUNT(*) as total FROM messages";
        $result = executeQuery($sql);
        return $result->fetch_assoc()['total'];
    } catch (Exception $e) {
        error_log($e->getMessage());
        return 0;
    }
}

/**
 * جلب عدد المستخدمين النشطين
 * 
 * @param int $active_minutes الدقائق التي يعتبر بعدها المستخدم غير نشط
 * @return int عدد المستخدمين النشطين
 */
function getActiveUsers($active_minutes = 15) {
    try {
        $sql = "SELECT COUNT(DISTINCT user_id) as total 
                FROM user_rooms 
                WHERE last_activity > DATE_SUB(NOW(), INTERVAL ? MINUTE)";
        
        $result = executeQuery($sql, [$active_minutes], "i");
        return $result->fetch_assoc()['total'];
    } catch (Exception $e) {
        error_log($e->getMessage());
        return 0;
    }
}

/**
 * جلب إعدادات النظام
 * 
 * @return array|bool مصفوفة الإعدادات أو false في حالة الفشل
 */
function getSystemSettings() {
    try {
        $sql = "SELECT setting_key, setting_value FROM system_settings";
        $result = executeQuery($sql);
        
        $settings = [];
        while ($row = $result->fetch_assoc()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        
        return $settings;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * حفظ إعدادات النظام
 * 
 * @param array $settings مصفوفة الإعدادات
 * @return bool نجاح/فشل الحفظ
 */
function saveSystemSettings($settings) {
    try {
        $conn = getDbConnection();
        
        // بدء المعاملة
        $conn->begin_transaction();
        
        foreach ($settings as $key => $value) {
            // التحقق من وجود الإعداد
            $sql = "SELECT COUNT(*) as count FROM system_settings WHERE setting_key = ?";
            $result = executeQuery($sql, [$key], "s");
            $exists = $result->fetch_assoc()['count'] > 0;
            
            if ($exists) {
                // تحديث الإعداد الموجود
                $sql = "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?";
                executeQuery($sql, [$value, $key], "ss");
            } else {
                // إضافة إعداد جديد
                $sql = "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)";
                executeQuery($sql, [$key, $value], "ss");
            }
        }
        
        // إتمام المعاملة
        $conn->commit();
        
        // تحديث الإعدادات العالمية
        $GLOBALS['settings'] = loadSettings();
        
        return true;
    } catch (Exception $e) {
        // التراجع عن المعاملة في حالة حدوث خطأ
        $conn->rollback();
        error_log($e->getMessage());
        return false;
    }
}

/**
 * إنشاء نسخة احتياطية لقاعدة البيانات
 * 
 * @return string|bool مسار ملف النسخة الاحتياطية أو false في حالة الفشل
 */
function backupDatabase() {
    try {
        // إنشاء مجلد النسخ الاحتياطية إذا لم يكن موجوداً
        $backup_dir = __DIR__ . '/../../backups';
        if (!file_exists($backup_dir)) {
            mkdir($backup_dir, 0755, true);
        }
        
        // إنشاء اسم ملف فريد للنسخة الاحتياطية
        $filename = 'backup_' . date('Y-m-d_H-i-s') . '.sql';
        $backup_file = $backup_dir . '/' . $filename;
        
        // إنشاء أمر النسخ الاحتياطي
        $command = sprintf(
            'mysqldump --user=%s --password=%s --host=%s %s > %s',
            escapeshellarg(DB_USER),
            escapeshellarg(DB_PASS),
            escapeshellarg(DB_HOST),
            escapeshellarg(DB_NAME),
            escapeshellarg($backup_file)
        );
        
        // تنفيذ الأمر
        system($command, $result_code);
        
        if ($result_code !== 0) {
            throw new Exception('فشل في إنشاء النسخة الاحتياطية');
        }
        
        // تسجيل النشاط
        $current_user_id = $_SESSION['user_id'] ?? 0;
        logActivity($current_user_id, 'database_backup', 'تم إنشاء نسخة احتياطية لقاعدة البيانات');
        
        return $backup_file;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * استعادة قاعدة البيانات من نسخة احتياطية
 * 
 * @param string $backup_file مسار ملف النسخة الاحتياطية
 * @return bool نجاح/فشل الاستعادة
 */
function restoreDatabase($backup_file) {
    try {
        // التحقق من وجود الملف
        if (!file_exists($backup_file)) {
            throw new Exception('ملف النسخة الاحتياطية غير موجود');
        }
        
        // إنشاء أمر استعادة النسخة الاحتياطية
        $command = sprintf(
            'mysql --user=%s --password=%s --host=%s %s < %s',
            escapeshellarg(DB_USER),
            escapeshellarg(DB_PASS),
            escapeshellarg(DB_HOST),
            escapeshellarg(DB_NAME),
            escapeshellarg($backup_file)
        );
        
        // تنفيذ الأمر
        system($command, $result_code);
        
        if ($result_code !== 0) {
            throw new Exception('فشل في استعادة النسخة الاحتياطية');
        }
        
        // تسجيل النشاط
        $current_user_id = $_SESSION['user_id'] ?? 0;
        logActivity($current_user_id, 'database_restore', 'تم استعادة قاعدة البيانات من نسخة احتياطية');
        
        return true;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}

/**
 * إنشاء تقرير عن نشاط النظام
 * 
 * @param string $start_date تاريخ البداية
 * @param string $end_date تاريخ النهاية
 * @param string $type نوع التقرير (users, messages, logins)
 * @return array|bool بيانات التقرير أو false في حالة الفشل
 */
function generateReport($start_date, $end_date, $type = 'messages') {
    try {
        $report_data = [];
        
        switch ($type) {
            case 'users':
                // تقرير عن المستخدمين الجدد
                $sql = "SELECT DATE(created_at) as date, COUNT(*) as count 
                        FROM users 
                        WHERE created_at BETWEEN ? AND ? 
                        GROUP BY DATE(created_at) 
                        ORDER BY date ASC";
                
                $result = executeQuery($sql, [$start_date, $end_date], "ss");
                
                while ($row = $result->fetch_assoc()) {
                    $report_data[$row['date']] = $row['count'];
                }
                break;
                
            case 'messages':
                // تقرير عن الرسائل
                $sql = "SELECT DATE(created_at) as date, COUNT(*) as count 
                        FROM messages 
                        WHERE created_at BETWEEN ? AND ? 
                        GROUP BY DATE(created_at) 
                        ORDER BY date ASC";
                
                $result = executeQuery($sql, [$start_date, $end_date], "ss");
                
                while ($row = $result->fetch_assoc()) {
                    $report_data[$row['date']] = $row['count'];
                }
                break;
                
            case 'logins':
                // تقرير عن تسجيلات الدخول
                $sql = "SELECT DATE(created_at) as date, COUNT(*) as count 
                        FROM activity_log 
                        WHERE activity_type = 'login' AND created_at BETWEEN ? AND ? 
                        GROUP BY DATE(created_at) 
                        ORDER BY date ASC";
                
                $result = executeQuery($sql, [$start_date, $end_date], "ss");
                
                while ($row = $result->fetch_assoc()) {
                    $report_data[$row['date']] = $row['count'];
                }
                break;
                
            default:
                throw new Exception('نوع تقرير غير صالح');
        }
        
        return $report_data;
    } catch (Exception $e) {
        error_log($e->getMessage());
        return false;
    }
}
```

## ملاحظات هامة

1. **تنظيم الدوال**: تم تنظيم الدوال في عدة ملفات منفصلة حسب الوظيفة لسهولة الصيانة والتطوير.

2. **الحماية والأمان**:
   - استخدام Prepared Statements لمنع هجمات SQL Injection
   - تنظيف المدخلات ضد هجمات XSS
   - تشفير كلمات المرور باستخدام bcrypt
   - تشفير محتوى الرسائل باستخدام AES-256
   - حماية النماذج ضد هجمات CSRF

3. **التوافق**:
   - يعمل الكود مع PHP 7.4 وأحدث
   - يستخدم الميزات الجديدة مثل Null Coalescing Operator (??)
   - يتعامل مع أحرف Unicode بشكل صحيح للغة العربية

4. **موقع الملفات**:
   - يجب وضع جميع ملفات الدوال في مجلد `/includes`
   - يمكن تضمينها في الصفحات حسب الحاجة
