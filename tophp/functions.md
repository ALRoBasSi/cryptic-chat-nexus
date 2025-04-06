
# الدوال البرمجية PHP

**الوصف**: هذا الملف يحتوي على جميع الدوال البرمجية المستخدمة في النظام، مقسمة حسب الفئة والوظيفة.

**المسار**: `/includes/` (يتم تقسيمها إلى عدة ملفات حسب النوع)

## 1. دوال المصادقة وإدارة الحسابات (`auth_functions.php`)

```php
<?php
/**
 * دوال المصادقة وإدارة المستخدمين
 * 
 * هذا الملف يحتوي على جميع الدوال المتعلقة بتسجيل الدخول والخروج
 * وإدارة الحسابات والتحقق من الصلاحيات
 */

/**
 * دالة للتحقق من صحة بيانات تسجيل الدخول ومنح الجلسة
 * 
 * @param string $username اسم المستخدم
 * @param string $password كلمة المرور
 * @return bool نجاح أو فشل عملية تسجيل الدخول
 */
function loginUser($username, $password) {
    $db = connectDB();
    
    // تنظيف المدخلات
    $username = mysqli_real_escape_string($db, $username);
    
    // الاستعلام عن المستخدم باستخدام اسم المستخدم
    $query = "SELECT id, username, password, role, is_active FROM users WHERE username = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "s", $username);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($result) == 1) {
        $user = mysqli_fetch_assoc($result);
        
        // التحقق من حالة الحساب (نشط أم لا)
        if (!$user['is_active']) {
            return false;
        }
        
        // التحقق من صحة كلمة المرور
        if (password_verify($password, $user['password'])) {
            // حفظ معلومات المستخدم في الجلسة
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['logged_in'] = true;
            
            // تحديث آخر تسجيل دخول
            $updateQuery = "UPDATE users SET last_login = NOW(), last_activity = NOW() WHERE id = ?";
            $updateStmt = mysqli_prepare($db, $updateQuery);
            mysqli_stmt_bind_param($updateStmt, "i", $user['id']);
            mysqli_stmt_execute($updateStmt);
            mysqli_stmt_close($updateStmt);
            
            // تسجيل نشاط تسجيل الدخول
            logUserActivity($user['id'], 'login', 'تسجيل الدخول إلى النظام');
            
            return true;
        }
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return false;
}

/**
 * دالة تسجيل خروج المستخدم
 * 
 * @return void
 */
function logoutUser() {
    // تسجيل نشاط تسجيل الخروج إذا كان المستخدم مسجل دخوله
    if (isset($_SESSION['user_id'])) {
        logUserActivity($_SESSION['user_id'], 'logout', 'تسجيل الخروج من النظام');
    }
    
    // حذف متغيرات الجلسة
    $_SESSION = array();
    
    // حذف كوكيز الجلسة
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    // إنهاء الجلسة
    session_destroy();
}

/**
 * دالة للتحقق مما إذا كان المستخدم مسجل دخوله
 * 
 * @return bool حالة تسجيل الدخول
 */
function isLoggedIn() {
    return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

/**
 * دالة للتحقق مما إذا كان المستخدم الحالي مسؤولاً
 * 
 * @return bool حالة المسؤول
 */
function isAdmin() {
    return isLoggedIn() && isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

/**
 * دالة للتحقق من تسجيل الدخول وإعادة التوجيه إذا لم يكن كذلك
 * 
 * @return void
 */
function checkLogin() {
    if (!isLoggedIn()) {
        setFlashMessage('warning', 'يرجى تسجيل الدخول للوصول إلى هذه الصفحة');
        redirect('../index.php');
        exit;
    }
    
    // تحديث وقت آخر نشاط
    updateLastActivity();
}

/**
 * دالة للتحقق من صلاحيات المسؤول وإعادة التوجيه إذا لم تكن كافية
 * 
 * @return void
 */
function checkAdmin() {
    if (!isAdmin()) {
        setFlashMessage('error', 'لا تملك الصلاحيات الكافية للوصول إلى هذه الصفحة');
        if (isLoggedIn()) {
            redirect('../pages/chat/rooms.php');
        } else {
            redirect('../index.php');
        }
        exit;
    }
}

/**
 * دالة لتحديث وقت آخر نشاط للمستخدم المسجل دخوله
 * 
 * @return void
 */
function updateLastActivity() {
    if (isLoggedIn()) {
        $db = connectDB();
        $user_id = $_SESSION['user_id'];
        
        $query = "UPDATE users SET last_activity = NOW() WHERE id = ?";
        $stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($stmt, "i", $user_id);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        mysqli_close($db);
    }
}

/**
 * دالة للتحقق من صلاحية الوصول إلى غرفة معينة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @return bool صلاحية الوصول
 */
function canAccessRoom($user_id, $room_id) {
    // المسؤولين لهم وصول كامل لجميع الغرف
    if ($_SESSION['role'] === 'admin') {
        return true;
    }
    
    $db = connectDB();
    
    $query = "SELECT * FROM room_users 
              WHERE user_id = ? AND room_id = ? AND can_read = 1";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "ii", $user_id, $room_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $canAccess = mysqli_num_rows($result) > 0;
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $canAccess;
}

/**
 * دالة للتحقق من صلاحية الكتابة في غرفة معينة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @return bool صلاحية الكتابة
 */
function canWriteInRoom($user_id, $room_id) {
    // المسؤولين لهم صلاحية الكتابة في جميع الغرف
    if ($_SESSION['role'] === 'admin') {
        return true;
    }
    
    $db = connectDB();
    
    $query = "SELECT * FROM room_users 
              WHERE user_id = ? AND room_id = ? AND can_write = 1";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "ii", $user_id, $room_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $canWrite = mysqli_num_rows($result) > 0;
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $canWrite;
}

/**
 * دالة لإنشاء مستخدم جديد
 * 
 * @param array $userData بيانات المستخدم (username, password, email, full_name, role)
 * @return int|false معرف المستخدم الجديد أو false في حالة الفشل
 */
function createUser($userData) {
    $db = connectDB();
    
    // تشفير كلمة المرور
    $hashedPassword = password_hash($userData['password'], PASSWORD_DEFAULT);
    
    $query = "INSERT INTO users (username, password, email, full_name, role) 
              VALUES (?, ?, ?, ?, ?)";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param(
        $stmt, 
        "sssss", 
        $userData['username'], 
        $hashedPassword, 
        $userData['email'], 
        $userData['full_name'], 
        $userData['role']
    );
    
    $success = mysqli_stmt_execute($stmt);
    $user_id = $success ? mysqli_insert_id($db) : false;
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    if ($user_id) {
        logUserActivity($_SESSION['user_id'], 'user_create', "إنشاء مستخدم جديد: {$userData['username']}");
    }
    
    return $user_id;
}

/**
 * دالة لتحديث بيانات مستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @param array $userData بيانات المستخدم المراد تحديثها
 * @return bool نجاح أو فشل عملية التحديث
 */
function updateUser($user_id, $userData) {
    $db = connectDB();
    
    // البداية ببناء جملة الاستعلام
    $updateFields = [];
    $params = [];
    $types = "";
    
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
    
    // إذا تم تقديم كلمة مرور جديدة، قم بتشفيرها وإضافتها
    if (!empty($userData['password'])) {
        $hashedPassword = password_hash($userData['password'], PASSWORD_DEFAULT);
        $updateFields[] = "password = ?";
        $params[] = $hashedPassword;
        $types .= "s";
    }
    
    // إذا لم تكن هناك حقول للتحديث
    if (empty($updateFields)) {
        return false;
    }
    
    // إضافة معرف المستخدم إلى المعلمات
    $params[] = $user_id;
    $types .= "i";
    
    // بناء جملة الاستعلام النهائية
    $query = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    
    // ربط المعلمات بالاستعلام
    mysqli_stmt_bind_param($stmt, $types, ...$params);
    
    $success = mysqli_stmt_execute($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    if ($success) {
        logUserActivity($_SESSION['user_id'], 'user_update', "تحديث بيانات المستخدم رقم: {$user_id}");
    }
    
    return $success;
}

/**
 * دالة لحذف مستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @return bool نجاح أو فشل عملية الحذف
 */
function deleteUser($user_id) {
    // لا يمكن حذف المستخدم الحالي
    if ($user_id == $_SESSION['user_id']) {
        return false;
    }
    
    $db = connectDB();
    
    // الحصول على اسم المستخدم للتسجيل
    $query = "SELECT username FROM users WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "i", $user_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $username);
    mysqli_stmt_fetch($stmt);
    mysqli_stmt_close($stmt);
    
    // حذف المستخدم
    $query = "DELETE FROM users WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "i", $user_id);
    $success = mysqli_stmt_execute($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    if ($success) {
        logUserActivity($_SESSION['user_id'], 'user_delete', "حذف المستخدم: {$username}");
    }
    
    return $success;
}

/**
 * دالة لتسجيل نشاط المستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @param string $activity_type نوع النشاط
 * @param string $description وصف النشاط
 * @return int|false معرف النشاط الجديد أو false في حالة الفشل
 */
function logUserActivity($user_id, $activity_type, $description) {
    $db = connectDB();
    
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    
    $query = "INSERT INTO user_activities (user_id, activity_type, description, ip_address, user_agent) 
              VALUES (?, ?, ?, ?, ?)";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "issss", $user_id, $activity_type, $description, $ip_address, $user_agent);
    
    $success = mysqli_stmt_execute($stmt);
    $activity_id = $success ? mysqli_insert_id($db) : false;
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $activity_id;
}

/**
 * دالة لتغيير كلمة المرور للمستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @param string $current_password كلمة المرور الحالية
 * @param string $new_password كلمة المرور الجديدة
 * @return bool نجاح أو فشل عملية تغيير كلمة المرور
 */
function changePassword($user_id, $current_password, $new_password) {
    $db = connectDB();
    
    // التحقق من كلمة المرور الحالية
    $query = "SELECT password FROM users WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "i", $user_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $stored_hash);
    mysqli_stmt_fetch($stmt);
    mysqli_stmt_close($stmt);
    
    // التحقق من صحة كلمة المرور الحالية
    if (!password_verify($current_password, $stored_hash)) {
        return false;
    }
    
    // تشفير كلمة المرور الجديدة
    $new_hash = password_hash($new_password, PASSWORD_DEFAULT);
    
    // تحديث كلمة المرور
    $query = "UPDATE users SET password = ? WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "si", $new_hash, $user_id);
    $success = mysqli_stmt_execute($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    if ($success) {
        logUserActivity($user_id, 'password_change', "تغيير كلمة المرور");
    }
    
    return $success;
}
?>
```

## 2. دوال الدردشة وإدارة الغرف (`chat_functions.php`)

```php
<?php
/**
 * دوال الدردشة وإدارة الغرف
 * 
 * هذا الملف يحتوي على جميع الدوال المتعلقة بالدردشة وإدارة الغرف
 * وإرسال واستقبال الرسائل والتعامل مع المستخدمين النشطين
 */

/**
 * دالة لإنشاء غرفة جديدة
 * 
 * @param array $roomData بيانات الغرفة (name, description)
 * @param int $created_by معرف المستخدم المنشئ
 * @return int|false معرف الغرفة الجديدة أو false في حالة الفشل
 */
function createRoom($roomData, $created_by) {
    $db = connectDB();
    
    // إنشاء مفتاح تشفير للغرفة
    $encryption_key = generateEncryptionKey();
    
    // إدخال بيانات الغرفة
    $query = "INSERT INTO rooms (name, description, encryption_key, created_by) 
              VALUES (?, ?, ?, ?)";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param(
        $stmt, 
        "sssi", 
        $roomData['name'], 
        $roomData['description'], 
        $encryption_key, 
        $created_by
    );
    
    $success = mysqli_stmt_execute($stmt);
    $room_id = $success ? mysqli_insert_id($db) : false;
    
    mysqli_stmt_close($stmt);
    
    // إذا تم إنشاء الغرفة بنجاح، أضف المستخدم المنشئ كمسؤول للغرفة
    if ($room_id) {
        $query = "INSERT INTO room_users (room_id, user_id, can_read, can_write, is_admin) 
                  VALUES (?, ?, 1, 1, 1)";
        $stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($stmt, "ii", $room_id, $created_by);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        
        // تسجيل نشاط إنشاء الغرفة
        logRoomActivity($room_id, $created_by, 'room_create', "تم إنشاء الغرفة: {$roomData['name']}");
    }
    
    mysqli_close($db);
    
    return $room_id;
}

/**
 * دالة لتحديث بيانات غرفة
 * 
 * @param int $room_id معرف الغرفة
 * @param array $roomData بيانات الغرفة المراد تحديثها
 * @return bool نجاح أو فشل عملية التحديث
 */
function updateRoom($room_id, $roomData) {
    $db = connectDB();
    
    // البداية ببناء جملة الاستعلام
    $updateFields = [];
    $params = [];
    $types = "";
    
    if (isset($roomData['name'])) {
        $updateFields[] = "name = ?";
        $params[] = $roomData['name'];
        $types .= "s";
    }
    
    if (isset($roomData['description'])) {
        $updateFields[] = "description = ?";
        $params[] = $roomData['description'];
        $types .= "s";
    }
    
    if (isset($roomData['is_active'])) {
        $updateFields[] = "is_active = ?";
        $params[] = $roomData['is_active'];
        $types .= "i";
    }
    
    // إذا لم تكن هناك حقول للتحديث
    if (empty($updateFields)) {
        return false;
    }
    
    // إضافة معرف الغرفة إلى المعلمات
    $params[] = $room_id;
    $types .= "i";
    
    // بناء جملة الاستعلام النهائية
    $query = "UPDATE rooms SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    
    // ربط المعلمات بالاستعلام
    mysqli_stmt_bind_param($stmt, $types, ...$params);
    
    $success = mysqli_stmt_execute($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    if ($success) {
        logRoomActivity($room_id, $_SESSION['user_id'], 'room_update', "تم تحديث بيانات الغرفة");
    }
    
    return $success;
}

/**
 * دالة لحذف غرفة
 * 
 * @param int $room_id معرف الغرفة
 * @return bool نجاح أو فشل عملية الحذف
 */
function deleteRoom($room_id) {
    $db = connectDB();
    
    // الحصول على اسم الغرفة للتسجيل
    $query = "SELECT name FROM rooms WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "i", $room_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $room_name);
    mysqli_stmt_fetch($stmt);
    mysqli_stmt_close($stmt);
    
    // حذف الغرفة (سيتم حذف جميع السجلات المرتبطة بها بسبب قيود المفاتيح الخارجية)
    $query = "DELETE FROM rooms WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "i", $room_id);
    $success = mysqli_stmt_execute($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    if ($success) {
        logUserActivity($_SESSION['user_id'], 'room_delete', "تم حذف الغرفة: {$room_name}");
    }
    
    return $success;
}

/**
 * دالة لتبديل حالة الغرفة (نشطة/غير نشطة)
 * 
 * @param int $room_id معرف الغرفة
 * @return bool نجاح أو فشل عملية التبديل
 */
function toggleRoomStatus($room_id) {
    $db = connectDB();
    
    // الحصول على الحالة الحالية للغرفة
    $query = "SELECT is_active, name FROM rooms WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "i", $room_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $is_active, $room_name);
    mysqli_stmt_fetch($stmt);
    mysqli_stmt_close($stmt);
    
    // تبديل الحالة
    $new_status = $is_active ? 0 : 1;
    $status_text = $new_status ? 'نشطة' : 'غير نشطة';
    
    // تحديث حالة الغرفة
    $query = "UPDATE rooms SET is_active = ? WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "ii", $new_status, $room_id);
    $success = mysqli_stmt_execute($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    if ($success) {
        logRoomActivity($room_id, $_SESSION['user_id'], 'room_status_change', "تم تغيير حالة الغرفة {$room_name} إلى {$status_text}");
    }
    
    return $success;
}

/**
 * دالة للحصول على غرفة بواسطة المعرف
 * 
 * @param int $room_id معرف الغرفة
 * @return array|false بيانات الغرفة أو false إذا لم توجد
 */
function getRoomById($room_id) {
    $db = connectDB();
    
    $query = "SELECT r.*, 
                     COUNT(DISTINCT ru.user_id) AS users_count, 
                     COUNT(DISTINCT m.id) AS messages_count
              FROM rooms r
              LEFT JOIN room_users ru ON r.id = ru.room_id
              LEFT JOIN messages m ON r.id = m.room_id
              WHERE r.id = ?
              GROUP BY r.id";
    
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "i", $room_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $room = mysqli_fetch_assoc($result);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $room;
}

/**
 * دالة للحصول على قائمة الغرف المتاحة للمستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @return array قائمة الغرف المتاحة
 */
function getUserAvailableRooms($user_id) {
    $db = connectDB();
    
    $is_admin = isAdmin();
    
    if ($is_admin) {
        // المسؤول يمكنه الوصول إلى جميع الغرف
        $query = "SELECT r.*, 
                         COUNT(DISTINCT m.id) AS unread_count
                  FROM rooms r
                  LEFT JOIN messages m ON r.id = m.room_id AND m.created_at > (
                      SELECT COALESCE(MAX(last_activity), '1970-01-01') 
                      FROM user_activities 
                      WHERE user_id = ? AND activity_type = 'room_visit' AND description LIKE CONCAT('%room_id:', r.id, '%')
                  )
                  GROUP BY r.id
                  ORDER BY r.name ASC";
        
        $stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($stmt, "i", $user_id);
    } else {
        // المستخدم العادي يمكنه الوصول فقط إلى الغرف المصرح له بها
        $query = "SELECT r.*, 
                         COUNT(DISTINCT m.id) AS unread_count
                  FROM rooms r
                  INNER JOIN room_users ru ON r.id = ru.room_id AND ru.user_id = ? AND ru.can_read = 1
                  LEFT JOIN messages m ON r.id = m.room_id AND m.created_at > (
                      SELECT COALESCE(MAX(last_activity), '1970-01-01') 
                      FROM user_activities 
                      WHERE user_id = ? AND activity_type = 'room_visit' AND description LIKE CONCAT('%room_id:', r.id, '%')
                  )
                  WHERE r.is_active = 1
                  GROUP BY r.id
                  ORDER BY r.name ASC";
        
        $stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($stmt, "ii", $user_id, $user_id);
    }
    
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $rooms = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $rooms[] = $row;
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $rooms;
}

/**
 * دالة لحفظ رسالة جديدة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @param string $encrypted_message الرسالة المشفرة
 * @return int|false معرف الرسالة الجديدة أو false في حالة الفشل
 */
function saveMessage($user_id, $room_id, $encrypted_message) {
    $db = connectDB();
    
    $query = "INSERT INTO messages (room_id, user_id, message, is_encrypted) 
              VALUES (?, ?, ?, 1)";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "iis", $room_id, $user_id, $encrypted_message);
    
    $success = mysqli_stmt_execute($stmt);
    $message_id = $success ? mysqli_insert_id($db) : false;
    
    mysqli_stmt_close($stmt);
    
    if ($message_id) {
        // تسجيل نشاط إرسال الرسالة
        logRoomActivity($room_id, $user_id, 'message_send', "تم إرسال رسالة جديدة");
        
        // تحديث قائمة المستخدمين الذين لم يقرأوا الرسالة
        $query = "INSERT INTO message_read_status (message_id, user_id, is_read)
                  SELECT ?, ru.user_id, IF(ru.user_id = ?, 1, 0)
                  FROM room_users ru
                  WHERE ru.room_id = ? AND ru.can_read = 1";
        $stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($stmt, "iii", $message_id, $user_id, $room_id);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
    }
    
    mysqli_close($db);
    
    return $message_id;
}

/**
 * دالة للحصول على رسائل الغرفة المشفرة
 * 
 * @param int $room_id معرف الغرفة
 * @param int $limit عدد الرسائل (اختياري)
 * @return array قائمة الرسائل المشفرة
 */
function getRoomMessages($room_id, $limit = 50) {
    $db = connectDB();
    
    $query = "SELECT m.*, u.username 
              FROM messages m
              INNER JOIN users u ON m.user_id = u.id
              WHERE m.room_id = ?
              ORDER BY m.created_at DESC
              LIMIT ?";
    
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "ii", $room_id, $limit);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $messages = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $messages[] = $row;
    }
    
    // عكس ترتيب الرسائل لتكون من الأقدم إلى الأحدث
    $messages = array_reverse($messages);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $messages;
}

/**
 * دالة للحصول على رسائل الغرفة مع فك التشفير
 * 
 * @param int $room_id معرف الغرفة
 * @param string $encryption_key مفتاح التشفير
 * @param int $limit عدد الرسائل (اختياري)
 * @return array قائمة الرسائل بعد فك التشفير
 */
function getDecryptedRoomMessages($room_id, $encryption_key, $limit = 50) {
    $messages = getRoomMessages($room_id, $limit);
    
    foreach ($messages as &$message) {
        if ($message['is_encrypted']) {
            $message['message'] = decryptMessage($message['message'], $encryption_key);
        }
    }
    
    // تعليم الرسائل كمقروءة للمستخدم الحالي
    markMessagesAsRead($room_id, $_SESSION['user_id']);
    
    return $messages;
}

/**
 * دالة لتعليم الرسائل كمقروءة
 * 
 * @param int $room_id معرف الغرفة
 * @param int $user_id معرف المستخدم
 * @return bool نجاح أو فشل العملية
 */
function markMessagesAsRead($room_id, $user_id) {
    $db = connectDB();
    
    $query = "UPDATE message_read_status mrs
              INNER JOIN messages m ON mrs.message_id = m.id
              SET mrs.is_read = 1, mrs.read_at = NOW()
              WHERE m.room_id = ? AND mrs.user_id = ? AND mrs.is_read = 0";
    
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "ii", $room_id, $user_id);
    $success = mysqli_stmt_execute($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $success;
}

/**
 * دالة للحصول على الرسائل الجديدة في غرفة بعد وقت محدد
 * 
 * @param int $room_id معرف الغرفة
 * @param string $last_time الوقت الأخير للرسائل المستلمة
 * @param string $encryption_key مفتاح التشفير
 * @return array قائمة الرسائل الجديدة
 */
function getNewMessages($room_id, $last_time, $encryption_key) {
    $db = connectDB();
    
    $query = "SELECT m.*, u.username, UNIX_TIMESTAMP(m.created_at) AS created_at_timestamp
              FROM messages m
              INNER JOIN users u ON m.user_id = u.id
              WHERE m.room_id = ? AND m.created_at > ?
              ORDER BY m.created_at ASC";
    
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "is", $room_id, $last_time);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $messages = [];
    while ($row = mysqli_fetch_assoc($result)) {
        if ($row['is_encrypted']) {
            $row['message'] = decryptMessage($row['message'], $encryption_key);
        }
        $row['formatted_time'] = formatTime($row['created_at']);
        $messages[] = $row;
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    // تعليم الرسائل الجديدة كمقروءة للمستخدم الحالي
    if (!empty($messages)) {
        markMessagesAsRead($room_id, $_SESSION['user_id']);
    }
    
    return $messages;
}

/**
 * دالة للحصول على المستخدمين النشطين في غرفة
 * 
 * @param int $room_id معرف الغرفة
 * @return array قائمة المستخدمين النشطين
 */
function getActiveUsersInRoom($room_id) {
    $db = connectDB();
    
    // اعتبار المستخدم نشطًا إذا كان آخر نشاط له منذ أقل من 5 دقائق
    $active_threshold = date('Y-m-d H:i:s', strtotime('-5 minutes'));
    
    $query = "SELECT u.id, u.username, u.full_name
              FROM users u
              INNER JOIN room_users ru ON u.id = ru.user_id
              WHERE ru.room_id = ? AND u.last_activity > ? AND u.is_active = 1
              ORDER BY u.username ASC";
    
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "is", $room_id, $active_threshold);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $users = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $users[] = $row;
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $users;
}

/**
 * دالة لتحديث نشاط المستخدم في غرفة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @return bool نجاح أو فشل العملية
 */
function updateUserRoomActivity($user_id, $room_id) {
    return logRoomActivity($room_id, $user_id, 'room_visit', "زيارة الغرفة room_id:{$room_id}");
}

/**
 * دالة لتسجيل نشاط في غرفة
 * 
 * @param int $room_id معرف الغرفة
 * @param int $user_id معرف المستخدم
 * @param string $activity_type نوع النشاط
 * @param string $description وصف النشاط
 * @return int|false معرف النشاط الجديد أو false في حالة الفشل
 */
function logRoomActivity($room_id, $user_id, $activity_type, $description) {
    $db = connectDB();
    
    $query = "INSERT INTO room_activities (room_id, user_id, activity_type, description) 
              VALUES (?, ?, ?, ?)";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "iiss", $room_id, $user_id, $activity_type, $description);
    
    $success = mysqli_stmt_execute($stmt);
    $activity_id = $success ? mysqli_insert_id($db) : false;
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $activity_id;
}

/**
 * دالة للحصول على الغرف مع خيارات البحث والتصفية
 * 
 * @param string $search نص البحث
 * @param int $page رقم الصفحة
 * @param int $per_page عدد العناصر في الصفحة
 * @param string $sort_by حقل الترتيب
 * @param string $sort_order اتجاه الترتيب
 * @param string $status_filter تصفية الحالة
 * @return array مصفوفة تحتوي على الغرف والعدد الإجمالي
 */
function getRooms($search = '', $page = 1, $per_page = 10, $sort_by = 'name', $sort_order = 'ASC', $status_filter = '') {
    $db = connectDB();
    
    // حساب نقطة البداية للنتائج
    $start = ($page - 1) * $per_page;
    
    // بناء شرط البحث
    $where_conditions = [];
    $params = [];
    $types = "";
    
    if (!empty($search)) {
        $where_conditions[] = "(r.name LIKE ? OR r.description LIKE ?)";
        $search_param = "%{$search}%";
        $params[] = $search_param;
        $params[] = $search_param;
        $types .= "ss";
    }
    
    // إضافة تصفية الحالة
    if ($status_filter === 'active') {
        $where_conditions[] = "r.is_active = 1";
    } elseif ($status_filter === 'inactive') {
        $where_conditions[] = "r.is_active = 0";
    }
    
    // بناء جملة WHERE
    $where_clause = empty($where_conditions) ? "" : "WHERE " . implode(" AND ", $where_conditions);
    
    // التحقق من صحة حقل الترتيب
    $allowed_sort_fields = ['name', 'users_count', 'messages_count', 'created_at'];
    if (!in_array($sort_by, $allowed_sort_fields)) {
        $sort_by = 'name';
    }
    
    // التحقق من صحة اتجاه الترتيب
    $sort_order = strtoupper($sort_order) === 'DESC' ? 'DESC' : 'ASC';
    
    // استعلام عدد الغرف الإجمالي
    $count_query = "SELECT COUNT(*) 
                   FROM rooms r 
                   {$where_clause}";
                   
    $count_stmt = mysqli_prepare($db, $count_query);
    if (!empty($params)) {
        mysqli_stmt_bind_param($count_stmt, $types, ...$params);
    }
    mysqli_stmt_execute($count_stmt);
    mysqli_stmt_bind_result($count_stmt, $total_rooms);
    mysqli_stmt_fetch($count_stmt);
    mysqli_stmt_close($count_stmt);
    
    // استعلام جلب الغرف
    $query = "SELECT r.*, 
                     (SELECT COUNT(*) FROM room_users ru WHERE ru.room_id = r.id) AS users_count,
                     (SELECT COUNT(*) FROM messages m WHERE m.room_id = r.id) AS messages_count
              FROM rooms r
              {$where_clause}
              ORDER BY {$sort_by} {$sort_order}
              LIMIT ?, ?";
    
    $stmt = mysqli_prepare($db, $query);
    
    // إضافة معلمات الصفحة
    $params[] = $start;
    $params[] = $per_page;
    $types .= "ii";
    
    mysqli_stmt_bind_param($stmt, $types, ...$params);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $rooms = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $rooms[] = $row;
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return [
        'rooms' => $rooms,
        'total' => $total_rooms
    ];
}

/**
 * دالة لإضافة مستخدم إلى غرفة
 * 
 * @param int $room_id معرف الغرفة
 * @param int $user_id معرف المستخدم
 * @param bool $can_read صلاحية القراءة
 * @param bool $can_write صلاحية الكتابة
 * @param bool $is_admin صلاحية الإدارة
 * @return bool نجاح أو فشل العملية
 */
function addUserToRoom($room_id, $user_id, $can_read = true, $can_write = true, $is_admin = false) {
    $db = connectDB();
    
    // التحقق من وجود المستخدم في الغرفة مسبقًا
    $query = "SELECT id FROM room_users WHERE room_id = ? AND user_id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "ii", $room_id, $user_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($result) > 0) {
        // إذا كان المستخدم موجودًا بالفعل، قم بتحديث صلاحياته
        $row = mysqli_fetch_assoc($result);
        $query = "UPDATE room_users SET can_read = ?, can_write = ?, is_admin = ? WHERE id = ?";
        $stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($stmt, "iiii", $can_read, $can_write, $is_admin, $row['id']);
    } else {
        // إذا لم يكن المستخدم موجودًا، أضفه إلى الغرفة
        $query = "INSERT INTO room_users (room_id, user_id, can_read, can_write, is_admin) VALUES (?, ?, ?, ?, ?)";
        $stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($stmt, "iiiii", $room_id, $user_id, $can_read, $can_write, $is_admin);
    }
    
    $success = mysqli_stmt_execute($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    if ($success) {
        logRoomActivity($room_id, $_SESSION['user_id'], 'user_access_change', "تم تعديل صلاحيات المستخدم ID:{$user_id} للغرفة");
    }
    
    return $success;
}

/**
 * دالة لإزالة مستخدم من غرفة
 * 
 * @param int $room_id معرف الغرفة
 * @param int $user_id معرف المستخدم
 * @return bool نجاح أو فشل العملية
 */
function removeUserFromRoom($room_id, $user_id) {
    $db = connectDB();
    
    $query = "DELETE FROM room_users WHERE room_id = ? AND user_id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "ii", $room_id, $user_id);
    
    $success = mysqli_stmt_execute($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    if ($success) {
        logRoomActivity($room_id, $_SESSION['user_id'], 'user_removed', "تم إزالة المستخدم ID:{$user_id} من الغرفة");
    }
    
    return $success;
}

/**
 * دالة للحصول على المستخدمين في غرفة مع صلاحياتهم
 * 
 * @param int $room_id معرف الغرفة
 * @return array قائمة المستخدمين مع صلاحياتهم
 */
function getRoomUsers($room_id) {
    $db = connectDB();
    
    $query = "SELECT ru.*, u.username, u.full_name, u.email, u.role
              FROM room_users ru
              INNER JOIN users u ON ru.user_id = u.id
              WHERE ru.room_id = ?
              ORDER BY u.username ASC";
    
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "i", $room_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $users = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $users[] = $row;
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $users;
}
?>
```

## 3. دوال التشفير وفك التشفير (`encryption_functions.php`)

```php
<?php
/**
 * دوال التشفير وفك التشفير
 * 
 * هذا الملف يحتوي على جميع الدوال المتعلقة بالتشفير وفك التشفير
 * وإدارة مفاتيح التشفير
 */

/**
 * دالة لتوليد مفتاح تشفير عشوائي
 * 
 * @param int $length طول المفتاح (اختياري)
 * @return string مفتاح التشفير
 */
function generateEncryptionKey($length = 32) {
    $bytes = openssl_random_pseudo_bytes($length);
    return bin2hex($bytes);
}

/**
 * دالة لتشفير رسالة
 * 
 * @param string $message الرسالة المراد تشفيرها
 * @param string $key مفتاح التشفير
 * @return string الرسالة المشفرة (بترميز base64)
 */
function encryptMessage($message, $key) {
    $method = 'AES-256-CBC';
    
    // توليد متجه التهيئة العشوائي (IV)
    $iv_length = openssl_cipher_iv_length($method);
    $iv = openssl_random_pseudo_bytes($iv_length);
    
    // تشفير الرسالة
    $encrypted = openssl_encrypt($message, $method, $key, 0, $iv);
    
    // دمج متجه التهيئة مع الرسالة المشفرة
    $result = base64_encode($iv . $encrypted);
    
    return $result;
}

/**
 * دالة لفك تشفير رسالة
 * 
 * @param string $encrypted الرسالة المشفرة (بترميز base64)
 * @param string $key مفتاح التشفير
 * @return string الرسالة الأصلية بعد فك التشفير
 */
function decryptMessage($encrypted, $key) {
    $method = 'AES-256-CBC';
    
    // فك ترميز base64
    $encrypted = base64_decode($encrypted);
    
    // استخراج متجه التهيئة (IV)
    $iv_length = openssl_cipher_iv_length($method);
    $iv = substr($encrypted, 0, $iv_length);
    
    // استخراج الرسالة المشفرة
    $encrypted = substr($encrypted, $iv_length);
    
    // فك تشفير الرسالة
    $decrypted = openssl_decrypt($encrypted, $method, $key, 0, $iv);
    
    return $decrypted;
}

/**
 * دالة للتحقق من صحة مفتاح التشفير
 * 
 * @param string $key مفتاح التشفير المراد التحقق منه
 * @return bool صحة المفتاح
 */
function validateEncryptionKey($key) {
    // التحقق من طول المفتاح
    if (strlen($key) != 64) {
        return false;
    }
    
    // التحقق من أن المفتاح يحتوي فقط على أحرف سداسية عشرية
    return ctype_xdigit($key);
}

/**
 * دالة لتوليد توقيع رقمي للرسالة
 * 
 * @param string $data البيانات المراد توقيعها
 * @param string $key مفتاح التوقيع
 * @return string التوقيع الرقمي
 */
function generateSignature($data, $key) {
    return hash_hmac('sha256', $data, $key);
}

/**
 * دالة للتحقق من صحة التوقيع الرقمي
 * 
 * @param string $data البيانات الأصلية
 * @param string $signature التوقيع الرقمي
 * @param string $key مفتاح التوقيع
 * @return bool صحة التوقيع
 */
function verifySignature($data, $signature, $key) {
    $expected_signature = generateSignature($data, $key);
    return hash_equals($expected_signature, $signature);
}

/**
 * دالة لتشفير وتوقيع البيانات معًا
 * 
 * @param string|array $data البيانات المراد تشفيرها
 * @param string $key مفتاح التشفير
 * @return string البيانات المشفرة والموقعة
 */
function encryptAndSign($data, $key) {
    // تحويل المصفوفة إلى سلسلة JSON إذا كانت البيانات مصفوفة
    if (is_array($data)) {
        $data = json_encode($data);
    }
    
    // تشفير البيانات
    $encrypted = encryptMessage($data, $key);
    
    // توليد التوقيع
    $signature = generateSignature($encrypted, $key);
    
    // دمج البيانات المشفرة والتوقيع
    $result = [
        'data' => $encrypted,
        'signature' => $signature
    ];
    
    return base64_encode(json_encode($result));
}

/**
 * دالة لفك تشفير البيانات والتحقق من التوقيع
 * 
 * @param string $encrypted البيانات المشفرة والموقعة
 * @param string $key مفتاح التشفير
 * @param bool $as_json إرجاع البيانات كمصفوفة JSON (اختياري)
 * @return string|array|false البيانات الأصلية أو false في حالة فشل التحقق
 */
function verifyAndDecrypt($encrypted, $key, $as_json = false) {
    // فك ترميز base64
    $data = json_decode(base64_decode($encrypted), true);
    
    if (!isset($data['data']) || !isset($data['signature'])) {
        return false;
    }
    
    // التحقق من صحة التوقيع
    if (!verifySignature($data['data'], $data['signature'], $key)) {
        return false;
    }
    
    // فك تشفير البيانات
    $decrypted = decryptMessage($data['data'], $key);
    
    // تحويل البيانات إلى مصفوفة JSON إذا كان مطلوبًا
    if ($as_json && isJson($decrypted)) {
        return json_decode($decrypted, true);
    }
    
    return $decrypted;
}

/**
 * دالة للتحقق مما إذا كانت السلسلة بتنسيق JSON صالح
 * 
 * @param string $string السلسلة المراد التحقق منها
 * @return bool صحة تنسيق JSON
 */
function isJson($string) {
    json_decode($string);
    return (json_last_error() == JSON_ERROR_NONE);
}
?>
```

## 4. الدوال العامة المساعدة (`general_functions.php`)

```php
<?php
/**
 * الدوال العامة المساعدة
 * 
 * هذا الملف يحتوي على دوال عامة مساعدة تستخدم في أنحاء مختلفة من النظام
 */

/**
 * دالة لتنظيف وتأمين المدخلات
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
 * دالة لإعادة التوجيه إلى صفحة أخرى
 * 
 * @param string $url الرابط المراد التوجيه إليه
 * @return void
 */
function redirect($url) {
    header("Location: {$url}");
    exit;
}

/**
 * دالة لوضع رسالة في الجلسة (Flash Message)
 * 
 * @param string $type نوع الرسالة (success, error, warning, info)
 * @param string $message نص الرسالة
 * @return void
 */
function setFlashMessage($type, $message) {
    $_SESSION['flash_messages'][$type][] = $message;
}

/**
 * دالة لعرض رسائل الجلسة (Flash Messages)
 * 
 * @return void
 */
function displayFlashMessages() {
    if (isset($_SESSION['flash_messages']) && !empty($_SESSION['flash_messages'])) {
        foreach ($_SESSION['flash_messages'] as $type => $messages) {
            foreach ($messages as $message) {
                $alert_class = 'alert-info';
                $icon_class = 'fa-info-circle';
                
                switch ($type) {
                    case 'success':
                        $alert_class = 'alert-success';
                        $icon_class = 'fa-check-circle';
                        break;
                    case 'error':
                        $alert_class = 'alert-danger';
                        $icon_class = 'fa-times-circle';
                        break;
                    case 'warning':
                        $alert_class = 'alert-warning';
                        $icon_class = 'fa-exclamation-triangle';
                        break;
                }
                
                echo '<div class="alert ' . $alert_class . ' alert-dismissible fade show" role="alert">';
                echo '<i class="fas ' . $icon_class . ' me-2"></i>';
                echo $message;
                echo '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>';
                echo '</div>';
            }
        }
        
        // مسح رسائل الجلسة بعد عرضها
        unset($_SESSION['flash_messages']);
    }
}

/**
 * دالة لتنسيق التاريخ والوقت
 * 
 * @param string $datetime التاريخ والوقت بصيغة قاعدة البيانات
 * @param string $format صيغة التنسيق (اختياري)
 * @return string التاريخ والوقت المنسق
 */
function formatDate($datetime, $format = 'Y-m-d h:i A') {
    $date = new DateTime($datetime);
    return $date->format($format);
}

/**
 * دالة لتنسيق الوقت فقط
 * 
 * @param string $datetime التاريخ والوقت بصيغة قاعدة البيانات
 * @return string الوقت المنسق
 */
function formatTime($datetime) {
    $date = new DateTime($datetime);
    return $date->format('h:i A');
}

/**
 * دالة لحساب الوقت المنقضي منذ تاريخ معين بصيغة "منذ × دقيقة"
 * 
 * @param string $datetime التاريخ والوقت
 * @return string الوقت المنقضي بصيغة مقروءة
 */
function formatTimeAgo($datetime) {
    $time = strtotime($datetime);
    $now = time();
    $diff = $now - $time;
    
    if ($diff < 60) {
        return 'منذ لحظات';
    } elseif ($diff < 3600) {
        $minutes = floor($diff / 60);
        return 'منذ ' . $minutes . ' ' . ($minutes > 1 ? 'دقائق' : 'دقيقة');
    } elseif ($diff < 86400) {
        $hours = floor($diff / 3600);
        return 'منذ ' . $hours . ' ' . ($hours > 1 ? 'ساعات' : 'ساعة');
    } elseif ($diff < 604800) {
        $days = floor($diff / 86400);
        return 'منذ ' . $days . ' ' . ($days > 1 ? 'أيام' : 'يوم');
    } elseif ($diff < 2592000) {
        $weeks = floor($diff / 604800);
        return 'منذ ' . $weeks . ' ' . ($weeks > 1 ? 'أسابيع' : 'أسبوع');
    } elseif ($diff < 31536000) {
        $months = floor($diff / 2592000);
        return 'منذ ' . $months . ' ' . ($months > 1 ? 'أشهر' : 'شهر');
    } else {
        $years = floor($diff / 31536000);
        return 'منذ ' . $years . ' ' . ($years > 1 ? 'سنوات' : 'سنة');
    }
}

/**
 * دالة للتحقق من صحة البريد الإلكتروني
 * 
 * @param string $email البريد الإلكتروني
 * @return bool صحة البريد الإلكتروني
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * دالة للتحقق من وجود مستخدم بنفس اسم المستخدم أو البريد الإلكتروني
 * 
 * @param string $username اسم المستخدم
 * @param string $email البريد الإلكتروني
 * @param int $exclude_id معرف المستخدم المستثنى (اختياري)
 * @return array|false مصفوفة تحتوي على نتائج التحقق أو false إذا لم يكن هناك تكرار
 */
function checkUserExists($username, $email, $exclude_id = 0) {
    $db = connectDB();
    
    $result = [
        'username_exists' => false,
        'email_exists' => false
    ];
    
    // التحقق من وجود اسم المستخدم
    $query = "SELECT id FROM users WHERE username = ? AND id != ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "si", $username, $exclude_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_store_result($stmt);
    
    if (mysqli_stmt_num_rows($stmt) > 0) {
        $result['username_exists'] = true;
    }
    
    mysqli_stmt_close($stmt);
    
    // التحقق من وجود البريد الإلكتروني
    $query = "SELECT id FROM users WHERE email = ? AND id != ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "si", $email, $exclude_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_store_result($stmt);
    
    if (mysqli_stmt_num_rows($stmt) > 0) {
        $result['email_exists'] = true;
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    if ($result['username_exists'] || $result['email_exists']) {
        return $result;
    }
    
    return false;
}

/**
 * دالة للتحقق من وجود غرفة بنفس الاسم
 * 
 * @param string $room_name اسم الغرفة
 * @param int $exclude_id معرف الغرفة المستثناة (اختياري)
 * @return bool وجود غرفة بنفس الاسم
 */
function checkRoomExists($room_name, $exclude_id = 0) {
    $db = connectDB();
    
    $query = "SELECT id FROM rooms WHERE name = ? AND id != ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "si", $room_name, $exclude_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_store_result($stmt);
    
    $exists = mysqli_stmt_num_rows($stmt) > 0;
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $exists;
}

/**
 * دالة للحصول على قيمة إعداد من قاعدة البيانات
 * 
 * @param string $key مفتاح الإعداد
 * @param mixed $default القيمة الافتراضية إذا لم يوجد الإعداد
 * @return mixed قيمة الإعداد
 */
function getSetting($key, $default = null) {
    $db = connectDB();
    
    $query = "SELECT setting_value FROM settings WHERE setting_key = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "s", $key);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $value);
    
    $found = mysqli_stmt_fetch($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $found ? $value : $default;
}

/**
 * دالة لتحديث قيمة إعداد في قاعدة البيانات
 * 
 * @param string $key مفتاح الإعداد
 * @param mixed $value قيمة الإعداد
 * @return bool نجاح أو فشل العملية
 */
function updateSetting($key, $value) {
    $db = connectDB();
    
    // التحقق من وجود الإعداد
    $query = "SELECT id FROM settings WHERE setting_key = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "s", $key);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_store_result($stmt);
    
    if (mysqli_stmt_num_rows($stmt) > 0) {
        // تحديث الإعداد الموجود
        $query = "UPDATE settings SET setting_value = ? WHERE setting_key = ?";
        $update_stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($update_stmt, "ss", $value, $key);
        $success = mysqli_stmt_execute($update_stmt);
        mysqli_stmt_close($update_stmt);
    } else {
        // إضافة إعداد جديد
        $query = "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)";
        $insert_stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($insert_stmt, "ss", $key, $value);
        $success = mysqli_stmt_execute($insert_stmt);
        mysqli_stmt_close($insert_stmt);
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $success;
}

/**
 * دالة لإنشاء رمز مميز (Token) عشوائي
 * 
 * @param int $length طول الرمز (اختياري)
 * @return string الرمز المميز
 */
function generateToken($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

/**
 * دالة لإنشاء كود تحقق عشوائي
 * 
 * @param int $length طول الكود (اختياري)
 * @return string كود التحقق
 */
function generateVerificationCode($length = 6) {
    return substr(str_shuffle('0123456789'), 0, $length);
}

/**
 * دالة لاختصار النص وإضافة علامات الحذف
 * 
 * @param string $text النص المراد اختصاره
 * @param int $length الطول المطلوب
 * @param string $append النص المضاف عند الاختصار (اختياري)
 * @return string النص المختصر
 */
function truncateText($text, $length, $append = '...') {
    if (mb_strlen($text, 'UTF-8') > $length) {
        $text = mb_substr($text, 0, $length, 'UTF-8') . $append;
    }
    return $text;
}

/**
 * دالة للتحقق من وجود صلاحية CSRF في النموذج
 * 
 * @return bool صحة رمز CSRF
 */
function validateCSRFToken() {
    return isset($_POST['csrf_token']) && isset($_SESSION['csrf_token']) && 
           $_POST['csrf_token'] === $_SESSION['csrf_token'];
}

/**
 * دالة لإنشاء رمز CSRF وتخزينه في الجلسة
 * 
 * @return string رمز CSRF
 */
function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * دالة لإدراج حقل CSRF في النماذج
 * 
 * @return string كود HTML لحقل CSRF
 */
function csrfField() {
    $token = generateCSRFToken();
    return '<input type="hidden" name="csrf_token" value="' . $token . '">';
}

/**
 * دالة لتحويل حجم الملف إلى صيغة مقروءة
 * 
 * @param int $size حجم الملف بالبايت
 * @return string الحجم بصيغة مقروءة
 */
function formatFileSize($size) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $i = 0;
    while ($size >= 1024 && $i < count($units) - 1) {
        $size /= 1024;
        $i++;
    }
    return round($size, 2) . ' ' . $units[$i];
}

/**
 * دالة لتوليد كلمة مرور عشوائية
 * 
 * @param int $length طول كلمة المرور (اختياري)
 * @return string كلمة المرور العشوائية
 */
function generateRandomPassword($length = 10) {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
    $password = '';
    $max = strlen($chars) - 1;
    
    for ($i = 0; $i < $length; $i++) {
        $password .= $chars[random_int(0, $max)];
    }
    
    return $password;
}
?>
```

## 5. دوال لوحة تحكم المسؤول (`admin_functions.php`)

```php
<?php
/**
 * دوال لوحة تحكم المسؤول
 * 
 * هذا الملف يحتوي على دوال خاصة بلوحة تحكم المسؤول
 * مثل الإحصائيات والتقارير وإدارة المستخدمين والغرف
 */

/**
 * دالة للحصول على إجمالي عدد المستخدمين
 * 
 * @return int عدد المستخدمين
 */
function getTotalUsers() {
    $db = connectDB();
    
    $query = "SELECT COUNT(*) AS total FROM users";
    $result = mysqli_query($db, $query);
    $row = mysqli_fetch_assoc($result);
    
    mysqli_free_result($result);
    mysqli_close($db);
    
    return $row['total'];
}

/**
 * دالة للحصول على إجمالي عدد الغرف
 * 
 * @return int عدد الغرف
 */
function getTotalRooms() {
    $db = connectDB();
    
    $query = "SELECT COUNT(*) AS total FROM rooms";
    $result = mysqli_query($db, $query);
    $row = mysqli_fetch_assoc($result);
    
    mysqli_free_result($result);
    mysqli_close($db);
    
    return $row['total'];
}

/**
 * دالة للحصول على إجمالي عدد الرسائل
 * 
 * @return int عدد الرسائل
 */
function getTotalMessages() {
    $db = connectDB();
    
    $query = "SELECT COUNT(*) AS total FROM messages";
    $result = mysqli_query($db, $query);
    $row = mysqli_fetch_assoc($result);
    
    mysqli_free_result($result);
    mysqli_close($db);
    
    return $row['total'];
}

/**
 * دالة للحصول على عدد المستخدمين النشطين
 * 
 * @param int $minutes عدد الدقائق للاعتبار كنشط (اختياري)
 * @return int عدد المستخدمين النشطين
 */
function getActiveUsers($minutes = 10) {
    $db = connectDB();
    
    $active_threshold = date('Y-m-d H:i:s', strtotime("-{$minutes} minutes"));
    
    $query = "SELECT COUNT(*) AS total FROM users WHERE last_activity > ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "s", $active_threshold);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $total);
    mysqli_stmt_fetch($stmt);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $total;
}

/**
 * دالة للحصول على آخر الأنشطة في النظام
 * 
 * @param int $limit عدد الأنشطة المطلوبة
 * @return array قائمة بآخر الأنشطة
 */
function getRecentActivities($limit = 5) {
    $db = connectDB();
    
    $query = "SELECT ua.*, u.username 
              FROM user_activities ua
              INNER JOIN users u ON ua.user_id = u.id
              ORDER BY ua.created_at DESC
              LIMIT ?";
    
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "i", $limit);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $activities = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $activities[] = $row;
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $activities;
}

/**
 * دالة للحصول على المستخدمين مع خيارات البحث والتصفية
 * 
 * @param string $search نص البحث
 * @param int $page رقم الصفحة
 * @param int $per_page عدد العناصر في الصفحة
 * @param string $sort_by حقل الترتيب
 * @param string $sort_order اتجاه الترتيب
 * @param string $role_filter تصفية الدور
 * @return array مصفوفة تحتوي على المستخدمين والعدد الإجمالي
 */
function getUsers($search = '', $page = 1, $per_page = 10, $sort_by = 'username', $sort_order = 'ASC', $role_filter = '') {
    $db = connectDB();
    
    // حساب نقطة البداية للنتائج
    $start = ($page - 1) * $per_page;
    
    // بناء شرط البحث
    $where_conditions = [];
    $params = [];
    $types = "";
    
    if (!empty($search)) {
        $where_conditions[] = "(username LIKE ? OR full_name LIKE ? OR email LIKE ?)";
        $search_param = "%{$search}%";
        $params[] = $search_param;
        $params[] = $search_param;
        $params[] = $search_param;
        $types .= "sss";
    }
    
    // إضافة تصفية الدور
    if (!empty($role_filter)) {
        $where_conditions[] = "role = ?";
        $params[] = $role_filter;
        $types .= "s";
    }
    
    // بناء جملة WHERE
    $where_clause = empty($where_conditions) ? "" : "WHERE " . implode(" AND ", $where_conditions);
    
    // التحقق من صحة حقل الترتيب
    $allowed_sort_fields = ['username', 'full_name', 'email', 'role', 'last_login', 'created_at'];
    if (!in_array($sort_by, $allowed_sort_fields)) {
        $sort_by = 'username';
    }
    
    // التحقق من صحة اتجاه الترتيب
    $sort_order = strtoupper($sort_order) === 'DESC' ? 'DESC' : 'ASC';
    
    // استعلام عدد المستخدمين الإجمالي
    $count_query = "SELECT COUNT(*) FROM users {$where_clause}";
    $count_stmt = mysqli_prepare($db, $count_query);
    if (!empty($params)) {
        mysqli_stmt_bind_param($count_stmt, $types, ...$params);
    }
    mysqli_stmt_execute($count_stmt);
    mysqli_stmt_bind_result($count_stmt, $total_users);
    mysqli_stmt_fetch($count_stmt);
    mysqli_stmt_close($count_stmt);
    
    // استعلام جلب المستخدمين
    $query = "SELECT * FROM users {$where_clause} ORDER BY {$sort_by} {$sort_order} LIMIT ?, ?";
    
    $stmt = mysqli_prepare($db, $query);
    
    // إضافة معلمات الصفحة
    $params[] = $start;
    $params[] = $per_page;
    $types .= "ii";
    
    mysqli_stmt_bind_param($stmt, $types, ...$params);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $users = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $users[] = $row;
    }
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return [
        'users' => $users,
        'total' => $total_users
    ];
}

/**
 * دالة للحصول على إحصائيات الرسائل الشهرية
 * 
 * @param int $months عدد الأشهر المطلوبة
 * @return array إحصائيات الرسائل الشهرية
 */
function getMonthlyMessagesStats($months = 6) {
    $db = connectDB();
    
    $stats = [];
    
    // الحصول على الأشهر المطلوبة
    for ($i = $months - 1; $i >= 0; $i--) {
        $month_start = date('Y-m-01', strtotime("-{$i} months"));
        $month_end = date('Y-m-t', strtotime("-{$i} months"));
        $month_label = date('F Y', strtotime($month_start));
        
        $query = "SELECT COUNT(*) AS count FROM messages WHERE created_at BETWEEN ? AND ?";
        $stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($stmt, "ss", $month_start, $month_end);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_bind_result($stmt, $count);
        mysqli_stmt_fetch($stmt);
        mysqli_stmt_close($stmt);
        
        $stats[] = [
            'month' => $month_label,
            'count' => $count
        ];
    }
    
    mysqli_close($db);
    
    return $stats;
}

/**
 * دالة للحصول على إحصائيات تسجيل الدخول الشهرية
 * 
 * @param int $months عدد الأشهر المطلوبة
 * @return array إحصائيات تسجيل الدخول الشهرية
 */
function getMonthlyLoginStats($months = 6) {
    $db = connectDB();
    
    $stats = [];
    
    // الحصول على الأشهر المطلوبة
    for ($i = $months - 1; $i >= 0; $i--) {
        $month_start = date('Y-m-01', strtotime("-{$i} months"));
        $month_end = date('Y-m-t', strtotime("-{$i} months"));
        $month_label = date('F Y', strtotime($month_start));
        
        $query = "SELECT COUNT(*) AS count FROM user_activities 
                  WHERE activity_type = 'login' AND created_at BETWEEN ? AND ?";
        $stmt = mysqli_prepare($db, $query);
        mysqli_stmt_bind_param($stmt, "ss", $month_start, $month_end);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_bind_result($stmt, $count);
        mysqli_stmt_fetch($stmt);
        mysqli_stmt_close($stmt);
        
        $stats[] = [
            'month' => $month_label,
            'count' => $count
        ];
    }
    
    mysqli_close($db);
    
    return $stats;
}

/**
 * دالة للحصول على إحصائيات الغرف
 * 
 * @return array إحصائيات الغرف
 */
function getRoomsStatistics() {
    $db = connectDB();
    
    $query = "SELECT r.name, 
                     COUNT(DISTINCT ru.user_id) AS user_count, 
                     COUNT(DISTINCT m.id) AS message_count
              FROM rooms r
              LEFT JOIN room_users ru ON r.id = ru.room_id
              LEFT JOIN messages m ON r.id = m.room_id
              GROUP BY r.id
              ORDER BY message_count DESC
              LIMIT 5";
    
    $result = mysqli_query($db, $query);
    
    $stats = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $stats[] = $row;
    }
    
    mysqli_free_result($result);
    mysqli_close($db);
    
    return $stats;
}

/**
 * دالة للحصول على إحصائيات المستخدمين النشطين
 * 
 * @return array إحصائيات المستخدمين النشطين
 */
function getActiveUsersStatistics() {
    $db = connectDB();
    
    $query = "SELECT u.username, u.full_name, 
                     COUNT(m.id) AS message_count, 
                     MAX(u.last_activity) AS last_activity
              FROM users u
              LEFT JOIN messages m ON u.id = m.user_id
              GROUP BY u.id
              ORDER BY message_count DESC
              LIMIT 5";
    
    $result = mysqli_query($db, $query);
    
    $stats = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $stats[] = $row;
    }
    
    mysqli_free_result($result);
    mysqli_close($db);
    
    return $stats;
}

/**
 * دالة للحصول على معلومات مستخدم بواسطة المعرف
 * 
 * @param int $user_id معرف المستخدم
 * @return array|false معلومات المستخدم أو false إذا لم يوجد
 */
function getUserById($user_id) {
    $db = connectDB();
    
    $query = "SELECT * FROM users WHERE id = ?";
    $stmt = mysqli_prepare($db, $query);
    mysqli_stmt_bind_param($stmt, "i", $user_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $user = mysqli_fetch_assoc($result);
    
    mysqli_stmt_close($stmt);
    mysqli_close($db);
    
    return $user;
}

/**
 * دالة لإنشاء نسخة احتياطية لقاعدة البيانات
 * 
 * @return string|false مسار ملف النسخة الاحتياطية أو false في حالة الفشل
 */
function createDatabaseBackup() {
    $backup_dir = __DIR__ . '/../../backups/';
    
    // التأكد من وجود مجلد النسخ الاحتياطية
    if (!is_dir($backup_dir)) {
        mkdir($backup_dir, 0755, true);
    }
    
    $date = date('Y-m-d_H-i-s');
    $backup_file = $backup_dir . "backup_{$date}.sql";
    
    // تنفيذ أمر النسخ الاحتياطي
    $command = "mysqldump --user=" . DB_USERNAME . " --password=" . DB_PASSWORD . 
               " --host=" . DB_HOST . " " . DB_NAME . " > " . $backup_file;
    
    $output = [];
    $return_var = 0;
    exec($command, $output, $return_var);
    
    if ($return_var !== 0) {
        // فشل إنشاء النسخة الاحتياطية
        return false;
    }
    
    // تسجيل نشاط إنشاء النسخة الاحتياطية
    logUserActivity($_SESSION['user_id'], 'database_backup', "تم إنشاء نسخة احتياطية لقاعدة البيانات: {$backup_file}");
    
    return $backup_file;
}

/**
 * دالة للحصول على قائمة النسخ الاحتياطية
 * 
 * @return array قائمة النسخ الاحتياطية
 */
function getBackupsList() {
    $backup_dir = __DIR__ . '/../../backups/';
    
    // التأكد من وجود مجلد النسخ الاحتياطية
    if (!is_dir($backup_dir)) {
        return [];
    }
    
    $backups = [];
    $files = scandir($backup_dir);
    
    foreach ($files as $file) {
        if ($file === '.' || $file === '..' || !str_ends_with($file, '.sql')) {
            continue;
        }
        
        $full_path = $backup_dir . $file;
        $backups[] = [
            'filename' => $file,
            'size' => filesize($full_path),
            'created_at' => date('Y-m-d H:i:s', filemtime($full_path))
        ];
    }
    
    // ترتيب النسخ الاحتياطية من الأحدث إلى الأقدم
    usort($backups, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });
    
    return $backups;
}

/**
 * دالة لاستعادة قاعدة البيانات من نسخة احتياطية
 * 
 * @param string $backup_file اسم ملف النسخة الاحتياطية
 * @return bool نجاح أو فشل عملية الاستعادة
 */
function restoreDatabaseFromBackup($backup_file) {
    $backup_dir = __DIR__ . '/../../backups/';
    $full_path = $backup_dir . $backup_file;
    
    // التحقق من وجود الملف
    if (!file_exists($full_path) || !str_ends_with($backup_file, '.sql')) {
        return false;
    }
    
    // تنفيذ أمر استعادة النسخة الاحتياطية
    $command = "mysql --user=" . DB_USERNAME . " --password=" . DB_PASSWORD . 
               " --host=" . DB_HOST . " " . DB_NAME . " < " . $full_path;
    
    $output = [];
    $return_var = 0;
    exec($command, $output, $return_var);
    
    if ($return_var !== 0) {
        // فشل استعادة النسخة الاحتياطية
        return false;
    }
    
    // تسجيل نشاط استعادة النسخة الاحتياطية
    logUserActivity($_SESSION['user_id'], 'database_restore', "تم استعادة قاعدة البيانات من النسخة الاحتياطية: {$backup_file}");
    
    return true;
}
?>
```

## 6. ملاحظات على الدوال

### العلاقة بين الملفات

تم تقسيم الدوال حسب وظيفتها لتسهيل الصيانة وتنظيم الكود:

1. **دوال المصادقة وإدارة الحسابات**: التعامل مع تسجيل الدخول/الخروج، إدارة المستخدمين، التحقق من الصلاحيات.
2. **دوال الدردشة وإدارة الغرف**: إنشاء وإدارة الغرف، إرسال واستقبال الرسائل، تتبع المستخدمين النشطين.
3. **دوال التشفير وفك التشفير**: تشفير وفك تشفير الرسائل، إدارة مفاتيح التشفير، التوقيع الرقمي.
4. **الدوال العامة المساعدة**: تنظيف المدخلات، تنسيق التاريخ والوقت، رسائل الجلسة، إعادة التوجيه.
5. **دوال لوحة تحكم المسؤول**: الإحصائيات، التقارير، النسخ الاحتياطية.

### ملاحظات مهمة للتطبيق

1. **استخدام Prepared Statements**: جميع الاستعلامات تستخدم Prepared Statements لمنع هجمات SQL Injection.
2. **تنظيف المدخلات**: دالة `cleanInput()` تستخدم لتنظيف وتأمين جميع المدخلات من المستخدم.
3. **تشفير كلمات المرور**: يتم استخدام `password_hash()` و `password_verify()` للتعامل مع كلمات المرور.
4. **تشفير الرسائل**: يتم استخدام `openssl_encrypt()` و `openssl_decrypt()` لتشفير وفك تشفير الرسائل.
5. **توثيق الدوال**: تم توثيق جميع الدوال بتعليقات تشرح الغرض من الدالة، المعلمات المدخلة، والقيمة المرجعة.
6. **معالجة الأخطاء**: يتم التحقق من صحة المدخلات والعمليات ورد نتائج مناسبة.
7. **تسجيل الأنشطة**: يتم تسجيل جميع الأنشطة المهمة (تسجيل الدخول، التعديلات، إلخ) لأغراض المراقبة والتدقيق.
