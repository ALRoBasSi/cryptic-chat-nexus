
<?php
/**
 * ملف دوال الدردشة وإدارة الغرف
 * يحتوي على الدوال المتعلقة بإدارة غرف الدردشة والرسائل
 */

// تضمين ملفي التكوين والمصادقة إذا لم يتم تضمينهما سابقًا
if (!defined('DB_HOST')) {
    require_once 'config.php';
}

if (!function_exists('isLoggedIn')) {
    require_once 'auth_functions.php';
}

/**
 * دالة جلب قائمة الغرف المتاحة للمستخدم
 * 
 * @param string|null $userId معرف المستخدم (اختياري، يستخدم المستخدم الحالي إذا لم يتم تحديده)
 * @param bool $includePrivate تضمين الغرف الخاصة (اختياري، افتراضيًا true)
 * @return array مصفوفة تحتوي على الغرف المتاحة
 */
function getUserRooms($userId = null, $includePrivate = true) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // استخدام معرف المستخدم الحالي إذا لم يتم تحديد معرف
    if ($userId === null && isset($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
    }
    
    if (!$userId) {
        return [];
    }
    
    try {
        $conn = connectDB();
        $rooms = [];
        
        // المسؤول يمكنه رؤية جميع الغرف
        if (isAdmin()) {
            $stmt = $conn->prepare("
                SELECT rooms.*, users.username as creatorName
                FROM rooms 
                LEFT JOIN users ON rooms.createdBy = users.id
                ORDER BY rooms.name ASC
            ");
            $stmt->execute();
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // غرف عامة
            $stmt = $conn->prepare("
                SELECT rooms.*, users.username as creatorName
                FROM rooms 
                LEFT JOIN users ON rooms.createdBy = users.id
                WHERE rooms.isPrivate = FALSE
                ORDER BY rooms.name ASC
            ");
            $stmt->execute();
            $publicRooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $rooms = $publicRooms;
            
            // غرف خاصة للمستخدم
            if ($includePrivate) {
                $stmt = $conn->prepare("
                    SELECT rooms.*, users.username as creatorName
                    FROM rooms 
                    LEFT JOIN users ON rooms.createdBy = users.id
                    INNER JOIN room_users ON rooms.id = room_users.roomId
                    WHERE rooms.isPrivate = TRUE AND room_users.userId = :userId
                    ORDER BY rooms.name ASC
                ");
                $stmt->bindParam(':userId', $userId);
                $stmt->execute();
                $privateRooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // دمج الغرف العامة والخاصة
                $rooms = array_merge($publicRooms, $privateRooms);
            }
        }
        
        // إضافة عدد المستخدمين النشطين لكل غرفة
        foreach ($rooms as &$room) {
            $room['activeUsers'] = countActiveRoomUsers($room['id']);
            $room['messagesCount'] = countRoomMessages($room['id']);
        }
        
        return $rooms;
    } catch (PDOException $e) {
        error_log("خطأ في جلب غرف المستخدم: " . $e->getMessage());
        return [];
    }
}

/**
 * دالة جلب معلومات غرفة محددة
 * 
 * @param string $roomId معرف الغرفة
 * @return array|null معلومات الغرفة أو null إذا لم تكن الغرفة موجودة
 */
function getRoomInfo($roomId) {
    try {
        $conn = connectDB();
        
        $stmt = $conn->prepare("
            SELECT rooms.*, users.username as creatorName
            FROM rooms 
            LEFT JOIN users ON rooms.createdBy = users.id
            WHERE rooms.id = :roomId
        ");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($room) {
            $room['activeUsers'] = countActiveRoomUsers($roomId);
            $room['messagesCount'] = countRoomMessages($roomId);
        }
        
        return $room;
    } catch (PDOException $e) {
        error_log("خطأ في جلب معلومات الغرفة: " . $e->getMessage());
        return null;
    }
}

/**
 * دالة إنشاء غرفة جديدة
 * 
 * @param string $name اسم الغرفة
 * @param string $description وصف الغرفة (اختياري)
 * @param bool $isPrivate إذا كانت الغرفة خاصة (اختياري، افتراضيًا false)
 * @param string|null $createdBy معرف المستخدم الذي أنشأ الغرفة (اختياري)
 * @return string|false معرف الغرفة في حالة النجاح، false في حالة الفشل
 */
function createRoom($name, $description = '', $isPrivate = false, $createdBy = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // استخدام معرف المستخدم الحالي إذا لم يتم تحديد معرف
    if ($createdBy === null && isset($_SESSION['user_id'])) {
        $createdBy = $_SESSION['user_id'];
    }
    
    if (!$createdBy) {
        return false;
    }
    
    try {
        $conn = connectDB();
        
        // التحقق من وجود اسم الغرفة
        $stmt = $conn->prepare("SELECT COUNT(*) FROM rooms WHERE name = :name");
        $stmt->bindParam(':name', $name);
        $stmt->execute();
        
        if ($stmt->fetchColumn() > 0) {
            // اسم الغرفة موجود بالفعل
            return false;
        }
        
        // إنشاء معرف فريد للغرفة
        $roomId = uniqid('room_');
        
        // إنشاء الغرفة
        $stmt = $conn->prepare("
            INSERT INTO rooms (id, name, description, createdBy, createdAt, isPrivate) 
            VALUES (:roomId, :name, :description, :createdBy, NOW(), :isPrivate)
        ");
        
        $stmt->bindParam(':roomId', $roomId);
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':createdBy', $createdBy);
        $stmt->bindParam(':isPrivate', $isPrivate, PDO::PARAM_BOOL);
        
        if ($stmt->execute()) {
            // إذا كانت الغرفة خاصة، أضف المنشئ كمستخدم مصرح له
            if ($isPrivate) {
                $stmt = $conn->prepare("INSERT INTO room_users (roomId, userId) VALUES (:roomId, :userId)");
                $stmt->bindParam(':roomId', $roomId);
                $stmt->bindParam(':userId', $createdBy);
                $stmt->execute();
            }
            
            // تسجيل نشاط إنشاء الغرفة
            logActivity($createdBy, 'إنشاء غرفة', "تم إنشاء غرفة جديدة: $name");
            
            return $roomId;
        }
        
        return false;
    } catch (PDOException $e) {
        error_log("خطأ في إنشاء غرفة جديدة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة تحديث معلومات غرفة
 * 
 * @param string $roomId معرف الغرفة
 * @param string $name اسم الغرفة الجديد
 * @param string $description وصف الغرفة الجديد
 * @param bool $isPrivate إذا كانت الغرفة خاصة
 * @param string|null $updatedBy معرف المستخدم الذي قام بالتحديث (اختياري)
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function updateRoom($roomId, $name, $description, $isPrivate, $updatedBy = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // استخدام معرف المستخدم الحالي إذا لم يتم تحديد معرف
    if ($updatedBy === null && isset($_SESSION['user_id'])) {
        $updatedBy = $_SESSION['user_id'];
    }
    
    if (!$updatedBy) {
        return false;
    }
    
    try {
        $conn = connectDB();
        
        // التحقق من وجود اسم الغرفة (باستثناء الغرفة الحالية)
        $stmt = $conn->prepare("SELECT COUNT(*) FROM rooms WHERE name = :name AND id != :roomId");
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        
        if ($stmt->fetchColumn() > 0) {
            // اسم الغرفة موجود بالفعل
            return false;
        }
        
        // الحصول على معلومات الغرفة القديمة للتحقق من التغييرات
        $stmt = $conn->prepare("SELECT isPrivate FROM rooms WHERE id = :roomId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        $oldRoom = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$oldRoom) {
            return false;
        }
        
        // تحديث الغرفة
        $stmt = $conn->prepare("
            UPDATE rooms 
            SET name = :name, description = :description, isPrivate = :isPrivate 
            WHERE id = :roomId
        ");
        
        $stmt->bindParam(':roomId', $roomId);
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':isPrivate', $isPrivate, PDO::PARAM_BOOL);
        
        if ($stmt->execute()) {
            // تحديث الصلاحيات إذا تم تغيير نوع الغرفة من خاصة إلى عامة
            if ($oldRoom['isPrivate'] && !$isPrivate) {
                // تم تغيير الغرفة من خاصة إلى عامة، قم بحذف سجلات المستخدمين المصرح لهم
                $stmt = $conn->prepare("DELETE FROM room_users WHERE roomId = :roomId");
                $stmt->bindParam(':roomId', $roomId);
                $stmt->execute();
            }
            
            // تسجيل نشاط تحديث الغرفة
            logActivity($updatedBy, 'تحديث غرفة', "تم تحديث الغرفة: $name");
            
            return true;
        }
        
        return false;
    } catch (PDOException $e) {
        error_log("خطأ في تحديث الغرفة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة حذف غرفة
 * 
 * @param string $roomId معرف الغرفة المراد حذفها
 * @param string|null $deletedBy معرف المستخدم الذي قام بالحذف (اختياري)
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function deleteRoom($roomId, $deletedBy = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // استخدام معرف المستخدم الحالي إذا لم يتم تحديد معرف
    if ($deletedBy === null && isset($_SESSION['user_id'])) {
        $deletedBy = $_SESSION['user_id'];
    }
    
    try {
        $conn = connectDB();
        
        // الحصول على اسم الغرفة قبل الحذف (للتسجيل)
        $stmt = $conn->prepare("SELECT name FROM rooms WHERE id = :roomId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$room) {
            return false;
        }
        
        // بدء المعاملة
        $conn->beginTransaction();
        
        // حذف جميع الرسائل في الغرفة
        $stmt = $conn->prepare("DELETE FROM messages WHERE roomId = :roomId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        
        // حذف سجلات المستخدمين المصرح لهم (للغرف الخاصة)
        $stmt = $conn->prepare("DELETE FROM room_users WHERE roomId = :roomId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        
        // حذف الغرفة
        $stmt = $conn->prepare("DELETE FROM rooms WHERE id = :roomId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        
        // إتمام المعاملة
        if ($conn->commit()) {
            // تسجيل نشاط حذف الغرفة
            if ($deletedBy) {
                logActivity($deletedBy, 'حذف غرفة', "تم حذف الغرفة: " . $room['name']);
            }
            
            return true;
        }
        
        return false;
    } catch (PDOException $e) {
        // التراجع عن المعاملة في حالة حدوث خطأ
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        
        error_log("خطأ في حذف الغرفة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة إرسال رسالة في غرفة
 * 
 * @param string $roomId معرف الغرفة
 * @param string $content محتوى الرسالة
 * @param string|null $senderId معرف المرسل (اختياري، يستخدم المستخدم الحالي إذا لم يتم تحديده)
 * @param bool $isEncrypted هل الرسالة مشفرة (اختياري، افتراضيًا true)
 * @param bool $hasAttachment هل الرسالة تحتوي على مرفق (اختياري، افتراضيًا false)
 * @param string|null $attachmentUrl رابط المرفق (اختياري)
 * @return string|false معرف الرسالة في حالة النجاح، false في حالة الفشل
 */
function sendMessage($roomId, $content, $senderId = null, $isEncrypted = true, $hasAttachment = false, $attachmentUrl = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // استخدام معرف المستخدم الحالي إذا لم يتم تحديد معرف
    if ($senderId === null && isset($_SESSION['user_id'])) {
        $senderId = $_SESSION['user_id'];
    }
    
    if (!$senderId) {
        return false;
    }
    
    // التحقق من صلاحية الوصول إلى الغرفة
    if (!canAccessRoom($roomId, $senderId)) {
        return false;
    }
    
    try {
        $conn = connectDB();
        
        // إنشاء معرف فريد للرسالة
        $messageId = uniqid('msg_');
        
        // إدخال الرسالة
        $stmt = $conn->prepare("
            INSERT INTO messages (id, roomId, senderId, content, timestamp, isEncrypted, hasAttachment, attachmentUrl) 
            VALUES (:messageId, :roomId, :senderId, :content, NOW(), :isEncrypted, :hasAttachment, :attachmentUrl)
        ");
        
        $stmt->bindParam(':messageId', $messageId);
        $stmt->bindParam(':roomId', $roomId);
        $stmt->bindParam(':senderId', $senderId);
        $stmt->bindParam(':content', $content);
        $stmt->bindParam(':isEncrypted', $isEncrypted, PDO::PARAM_BOOL);
        $stmt->bindParam(':hasAttachment', $hasAttachment, PDO::PARAM_BOOL);
        $stmt->bindParam(':attachmentUrl', $attachmentUrl);
        
        if ($stmt->execute()) {
            return $messageId;
        }
        
        return false;
    } catch (PDOException $e) {
        error_log("خطأ في إرسال رسالة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة جلب الرسائل في غرفة محددة
 * 
 * @param string $roomId معرف الغرفة
 * @param int $limit عدد الرسائل المطلوب جلبها (اختياري، افتراضيًا 50)
 * @param int $offset ترتيب البداية (اختياري، افتراضيًا 0)
 * @param string|null $lastMessageId معرف آخر رسالة تم جلبها (اختياري، للتحديث المباشر)
 * @return array مصفوفة تحتوي على الرسائل
 */
function getRoomMessages($roomId, $limit = 50, $offset = 0, $lastMessageId = null) {
    // التحقق من صلاحية الوصول إلى الغرفة
    if (!canAccessRoom($roomId)) {
        return [];
    }
    
    try {
        $conn = connectDB();
        
        // إعداد الاستعلام
        $query = "
            SELECT messages.*, users.username as senderName
            FROM messages 
            LEFT JOIN users ON messages.senderId = users.id
            WHERE messages.roomId = :roomId 
        ";
        
        // إضافة شرط لجلب الرسائل الجديدة فقط (للتحديث المباشر)
        if ($lastMessageId) {
            $query .= " AND messages.id > :lastMessageId";
        }
        
        // ترتيب الرسائل
        $query .= " ORDER BY messages.timestamp ASC";
        
        // إضافة حد للنتائج
        if ($limit > 0) {
            $query .= " LIMIT :offset, :limit";
        }
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':roomId', $roomId);
        
        if ($lastMessageId) {
            $stmt->bindParam(':lastMessageId', $lastMessageId);
        }
        
        if ($limit > 0) {
            $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
        }
        
        $stmt->execute();
        
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $messages;
    } catch (PDOException $e) {
        error_log("خطأ في جلب رسائل الغرفة: " . $e->getMessage());
        return [];
    }
}

/**
 * دالة حذف رسالة
 * 
 * @param string $messageId معرف الرسالة المراد حذفها
 * @param string|null $deletedBy معرف المستخدم الذي قام بالحذف (اختياري)
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function deleteMessage($messageId, $deletedBy = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // استخدام معرف المستخدم الحالي إذا لم يتم تحديد معرف
    if ($deletedBy === null && isset($_SESSION['user_id'])) {
        $deletedBy = $_SESSION['user_id'];
    }
    
    if (!$deletedBy) {
        return false;
    }
    
    try {
        $conn = connectDB();
        
        // جلب معلومات الرسالة قبل الحذف
        $stmt = $conn->prepare("SELECT roomId, senderId FROM messages WHERE id = :messageId");
        $stmt->bindParam(':messageId', $messageId);
        $stmt->execute();
        
        $message = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$message) {
            return false;
        }
        
        // التحقق من الصلاحية (يمكن للمستخدم حذف رسائله فقط، ويمكن للمسؤول حذف أي رسالة)
        if ($message['senderId'] !== $deletedBy && !isAdmin() && !hasPermission('canDeleteMessages')) {
            return false;
        }
        
        // حذف الرسالة
        $stmt = $conn->prepare("DELETE FROM messages WHERE id = :messageId");
        $stmt->bindParam(':messageId', $messageId);
        
        if ($stmt->execute()) {
            // تسجيل نشاط حذف الرسالة
            logActivity($deletedBy, 'حذف رسالة', "تم حذف رسالة في الغرفة: " . $message['roomId']);
            
            return true;
        }
        
        return false;
    } catch (PDOException $e) {
        error_log("خطأ في حذف الرسالة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة إضافة مستخدم إلى غرفة خاصة
 * 
 * @param string $roomId معرف الغرفة
 * @param string $userId معرف المستخدم المراد إضافته
 * @param string|null $addedBy معرف المستخدم الذي قام بالإضافة (اختياري)
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function addUserToRoom($roomId, $userId, $addedBy = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // استخدام معرف المستخدم الحالي إذا لم يتم تحديد معرف
    if ($addedBy === null && isset($_SESSION['user_id'])) {
        $addedBy = $_SESSION['user_id'];
    }
    
    try {
        $conn = connectDB();
        
        // التحقق من أن الغرفة خاصة
        $stmt = $conn->prepare("SELECT isPrivate, name FROM rooms WHERE id = :roomId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$room || !$room['isPrivate']) {
            // الغرفة غير موجودة أو ليست خاصة
            return false;
        }
        
        // التحقق من وجود المستخدم في الغرفة بالفعل
        $stmt = $conn->prepare("SELECT COUNT(*) FROM room_users WHERE roomId = :roomId AND userId = :userId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->bindParam(':userId', $userId);
        $stmt->execute();
        
        if ($stmt->fetchColumn() > 0) {
            // المستخدم موجود بالفعل في الغرفة
            return true;
        }
        
        // إضافة المستخدم إلى الغرفة
        $stmt = $conn->prepare("INSERT INTO room_users (roomId, userId) VALUES (:roomId, :userId)");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->bindParam(':userId', $userId);
        
        if ($stmt->execute()) {
            // تسجيل نشاط إضافة المستخدم إلى الغرفة
            if ($addedBy) {
                logActivity($addedBy, 'إضافة مستخدم إلى غرفة', "تمت إضافة المستخدم $userId إلى الغرفة " . $room['name']);
            }
            
            return true;
        }
        
        return false;
    } catch (PDOException $e) {
        error_log("خطأ في إضافة مستخدم إلى غرفة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة إزالة مستخدم من غرفة خاصة
 * 
 * @param string $roomId معرف الغرفة
 * @param string $userId معرف المستخدم المراد إزالته
 * @param string|null $removedBy معرف المستخدم الذي قام بالإزالة (اختياري)
 * @return bool عودة صحيح في حالة النجاح، خطأ في حالة الفشل
 */
function removeUserFromRoom($roomId, $userId, $removedBy = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // استخدام معرف المستخدم الحالي إذا لم يتم تحديد معرف
    if ($removedBy === null && isset($_SESSION['user_id'])) {
        $removedBy = $_SESSION['user_id'];
    }
    
    try {
        $conn = connectDB();
        
        // التحقق من أن الغرفة خاصة
        $stmt = $conn->prepare("SELECT isPrivate, name FROM rooms WHERE id = :roomId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$room || !$room['isPrivate']) {
            // الغرفة غير موجودة أو ليست خاصة
            return false;
        }
        
        // حذف المستخدم من الغرفة
        $stmt = $conn->prepare("DELETE FROM room_users WHERE roomId = :roomId AND userId = :userId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->bindParam(':userId', $userId);
        
        if ($stmt->execute()) {
            // تسجيل نشاط إزالة المستخدم من الغرفة
            if ($removedBy) {
                logActivity($removedBy, 'إزالة مستخدم من غرفة', "تمت إزالة المستخدم $userId من الغرفة " . $room['name']);
            }
            
            return true;
        }
        
        return false;
    } catch (PDOException $e) {
        error_log("خطأ في إزالة مستخدم من غرفة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة جلب قائمة المستخدمين المصرح لهم في غرفة خاصة
 * 
 * @param string $roomId معرف الغرفة
 * @return array مصفوفة تحتوي على المستخدمين المصرح لهم
 */
function getRoomUsers($roomId) {
    try {
        $conn = connectDB();
        
        // التحقق من أن الغرفة خاصة
        $stmt = $conn->prepare("SELECT isPrivate FROM rooms WHERE id = :roomId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$room || !$room['isPrivate']) {
            // الغرفة غير موجودة أو ليست خاصة
            return [];
        }
        
        // جلب المستخدمين المصرح لهم
        $stmt = $conn->prepare("
            SELECT users.id, users.username, users.role, users.lastLogin
            FROM room_users
            JOIN users ON room_users.userId = users.id
            WHERE room_users.roomId = :roomId
            ORDER BY users.username ASC
        ");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("خطأ في جلب مستخدمي الغرفة: " . $e->getMessage());
        return [];
    }
}

/**
 * دالة جلب قائمة المستخدمين النشطين في غرفة
 * 
 * @param string $roomId معرف الغرفة
 * @param int $activeWindow نافذة النشاط بالدقائق (افتراضيًا 5 دقائق)
 * @return array مصفوفة تحتوي على المستخدمين النشطين
 */
function getActiveRoomUsers($roomId, $activeWindow = 5) {
    try {
        $conn = connectDB();
        
        // جلب المستخدمين النشطين في الغرفة
        $query = "
            SELECT DISTINCT users.id, users.username, users.role, 
                   (SELECT MAX(timestamp) FROM messages WHERE senderId = users.id AND roomId = :roomId) as lastActivity
            FROM messages
            JOIN users ON messages.senderId = users.id
            WHERE messages.roomId = :roomId
            AND messages.timestamp > DATE_SUB(NOW(), INTERVAL :activeWindow MINUTE)
            ORDER BY lastActivity DESC
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':roomId', $roomId);
        $stmt->bindParam(':activeWindow', $activeWindow, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("خطأ في جلب المستخدمين النشطين: " . $e->getMessage());
        return [];
    }
}

/**
 * دالة عد المستخدمين النشطين في غرفة
 * 
 * @param string $roomId معرف الغرفة
 * @param int $activeWindow نافذة النشاط بالدقائق (افتراضيًا 5 دقائق)
 * @return int عدد المستخدمين النشطين
 */
function countActiveRoomUsers($roomId, $activeWindow = 5) {
    try {
        $conn = connectDB();
        
        // عد المستخدمين النشطين في الغرفة
        $query = "
            SELECT COUNT(DISTINCT senderId) as activeCount
            FROM messages
            WHERE roomId = :roomId
            AND timestamp > DATE_SUB(NOW(), INTERVAL :activeWindow MINUTE)
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':roomId', $roomId);
        $stmt->bindParam(':activeWindow', $activeWindow, PDO::PARAM_INT);
        $stmt->execute();
        
        return (int)$stmt->fetchColumn();
    } catch (PDOException $e) {
        error_log("خطأ في عد المستخدمين النشطين: " . $e->getMessage());
        return 0;
    }
}

/**
 * دالة عد الرسائل في غرفة
 * 
 * @param string $roomId معرف الغرفة
 * @return int عدد الرسائل
 */
function countRoomMessages($roomId) {
    try {
        $conn = connectDB();
        
        // عد الرسائل في الغرفة
        $stmt = $conn->prepare("SELECT COUNT(*) FROM messages WHERE roomId = :roomId");
        $stmt->bindParam(':roomId', $roomId);
        $stmt->execute();
        
        return (int)$stmt->fetchColumn();
    } catch (PDOException $e) {
        error_log("خطأ في عد الرسائل: " . $e->getMessage());
        return 0;
    }
}
?>
