
<?php
/**
 * ملف إعدادات النظام
 * يحتوي على معلومات الاتصال بقاعدة البيانات ومفاتيح التشفير
 */

// إعدادات قاعدة البيانات
define('DB_HOST', 'localhost');
define('DB_USERNAME', 'root');
define('DB_PASSWORD', '');
define('DB_NAME', 'secure_chat_rbac');
define('DB_CHARSET', 'utf8mb4');

// مفتاح التشفير الرئيسي للنظام (يجب تغييره في بيئة الإنتاج)
define('ENCRYPTION_KEY', 'Lkw4^8tMn@p61S#xQzVf!yC3g7Dj2E9a');

// إعدادات عامة
define('SITE_NAME', 'نظام الدردشة المشفر');
define('SITE_URL', 'http://localhost/secure-chat-rbac');

// إعدادات الجلسة
define('SESSION_NAME', 'secure_chat_session');
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // تعيين إلى 1 في بيئة HTTPS

// دالة الاتصال بقاعدة البيانات باستخدام PDO
function connectDB() {
    try {
        $dsn = "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=".DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ];
        
        $conn = new PDO($dsn, DB_USERNAME, DB_PASSWORD, $options);
        return $conn;
    } catch (PDOException $e) {
        // تسجيل الخطأ بدلاً من عرضه مباشرة للمستخدم (أكثر أماناً)
        error_log("فشل الاتصال بقاعدة البيانات: " . $e->getMessage());
        die("حدث خطأ في الاتصال بقاعدة البيانات. يرجى التحقق من السجلات أو الاتصال بمسؤول النظام.");
    }
}

// تعيين المنطقة الزمنية
date_default_timezone_set('Asia/Riyadh');

/**
 * دالة تنظيف المدخلات لمنع هجمات XSS
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
 * دالة لإنشاء رمز CSRF جديد
 * 
 * @return string رمز CSRF
 */
function generateCsrfToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    
    return $_SESSION['csrf_token'];
}

/**
 * دالة للتحقق من صحة رمز CSRF
 * 
 * @param string $token الرمز المراد التحقق منه
 * @return bool عودة صحيح إذا كان الرمز صالحًا، خطأ إذا لم يكن صالحًا
 */
function verifyCsrfToken($token) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['csrf_token']) || empty($token) || $token !== $_SESSION['csrf_token']) {
        return false;
    }
    
    return true;
}

/**
 * دالة لتعيين رسالة فلاش تظهر مرة واحدة
 * 
 * @param string $type نوع الرسالة (نجاح، خطأ، تحذير، معلومات)
 * @param string $message محتوى الرسالة
 * @return void
 */
function setFlashMessage($type, $message) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $_SESSION['flash_message'] = [
        'type' => $type,
        'message' => $message
    ];
}

/**
 * دالة لعرض رسالة الفلاش إذا كانت موجودة
 * 
 * @return string|null HTML الخاص برسالة الفلاش، أو null إذا لم تكن هناك رسالة
 */
function getFlashMessage() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (isset($_SESSION['flash_message'])) {
        $message = $_SESSION['flash_message'];
        unset($_SESSION['flash_message']);
        
        $type = $message['type'];
        $text = $message['message'];
        
        // تحديد لون التنبيه حسب النوع
        $alertClass = 'alert-info';
        if ($type === 'success') $alertClass = 'alert-success';
        if ($type === 'error' || $type === 'danger') $alertClass = 'alert-danger';
        if ($type === 'warning') $alertClass = 'alert-warning';
        
        // إنشاء HTML للتنبيه
        return '<div class="alert ' . $alertClass . ' alert-dismissible fade show" role="alert">
                    ' . $text . '
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
                </div>';
    }
    
    return null;
}

/**
 * دالة إعادة التوجيه إلى صفحة أخرى
 * 
 * @param string $url المسار المراد التوجيه إليه
 * @return void
 */
function redirect($url) {
    header("Location: " . $url);
    exit;
}

/**
 * دالة التعامل مع طلبات API
 * 
 * @param string $method طريقة الطلب (GET, POST, PUT, DELETE)
 * @return bool عودة صحيح إذا كانت الطريقة مطابقة
 */
function handleApiRequest($method) {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        header('HTTP/1.1 405 Method Not Allowed');
        echo json_encode(['error' => 'Method Not Allowed']);
        exit;
    }
    
    return true;
}

/**
 * دالة لإرجاع استجابة API بتنسيق JSON
 * 
 * @param array $data البيانات المراد إرجاعها
 * @param int $status_code رمز الحالة HTTP
 * @return void
 */
function jsonResponse($data, $status_code = 200) {
    http_response_code($status_code);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
?>
