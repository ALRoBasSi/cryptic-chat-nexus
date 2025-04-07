
# صفحة غرف الدردشة

**الوصف**: صفحة تعرض قائمة غرف الدردشة المتاحة للمستخدم ويتيح له الانضمام إليها.

**المسار**: `/pages/chat/rooms.php`

## الكود الكامل

```php
<?php
/**
 * صفحة غرف الدردشة
 * تعرض قائمة غرف الدردشة المتاحة للمستخدم ويتيح له الانضمام إليها
 */

// تضمين ملفات المشروع الضرورية
require_once '../../includes/config.php';
require_once '../../includes/auth_functions.php';
require_once '../../includes/chat_functions.php';
require_once '../../includes/general_functions.php';

// بدء الجلسة
session_start();

// التحقق من تسجيل الدخول
if (!isLoggedIn()) {
    // إعادة التوجيه إلى صفحة تسجيل الدخول إذا لم يكن المستخدم مسجل دخوله
    redirect('../../index.php');
    exit;
}

// الحصول على معلومات المستخدم الحالي
$current_user = getCurrentUser();

// متغير للإشارة إلى نجاح العملية
$success_message = '';
$error_message = '';

// معالجة طلب الانضمام إلى غرفة جديدة
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'join_room') {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $error_message = 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    } else {
        $room_id = isset($_POST['room_id']) ? intval($_POST['room_id']) : 0;
        
        // التحقق من وجود الغرفة ونشاطها
        if ($room_id > 0) {
            $room = getRoomById($room_id);
            
            if ($room && $room['is_active']) {
                // التحقق مما إذا كان المستخدم منضمًا بالفعل إلى الغرفة
                if (!isUserInRoom($current_user['id'], $room_id)) {
                    // إضافة المستخدم إلى الغرفة
                    if (addUserToRoom($current_user['id'], $room_id)) {
                        // تسجيل النشاط
                        logUserActivity($current_user['id'], 'join_room', "انضم إلى غرفة: {$room['name']}");
                        logRoomActivity($room_id, $current_user['id'], 'user_joined', "انضم المستخدم {$current_user['username']} إلى الغرفة");
                        
                        $success_message = "تم الانضمام إلى غرفة \"{$room['name']}\" بنجاح.";
                    } else {
                        $error_message = 'حدث خطأ أثناء الانضمام إلى الغرفة. يرجى المحاولة مرة أخرى.';
                    }
                } else {
                    $error_message = 'أنت منضم بالفعل إلى هذه الغرفة.';
                }
            } else {
                $error_message = 'الغرفة غير موجودة أو غير نشطة.';
            }
        } else {
            $error_message = 'معرف الغرفة غير صالح.';
        }
    }
}

// الحصول على قائمة الغرف المتاحة للمستخدم
$available_rooms = getAvailableRooms($current_user['id']);

// الحصول على قائمة الغرف التي ينتمي إليها المستخدم
$user_rooms = getUserRooms($current_user['id']);

// إنشاء رمز CSRF جديد
$csrf_token = generateCsrfToken();

/**
 * دالة للحصول على معلومات غرفة من قاعدة البيانات بواسطة المعرف
 * 
 * @param int $room_id معرف الغرفة
 * @return array|bool مصفوفة تحتوي على معلومات الغرفة أو خطأ إذا لم يتم العثور عليها
 */
function getRoomById($room_id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            SELECT r.*, u.username as created_by_username 
            FROM rooms r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.id = :room_id
        ");
        $stmt->bindParam(':room_id', $room_id);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            return false;
        }
    } catch (PDOException $e) {
        error_log("خطأ في الحصول على معلومات الغرفة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة للتحقق مما إذا كان المستخدم منضمًا بالفعل إلى الغرفة
 * 
 * @param int $user_id معرف المستخدم
 * @param int $room_id معرف الغرفة
 * @return bool عودة صحيح إذا كان المستخدم منضمًا، خطأ إذا لم يكن منضمًا
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
 * @return bool عودة صحيح إذا تمت الإضافة بنجاح، خطأ إذا حدث خطأ
 */
function addUserToRoom($user_id, $room_id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO room_users (room_id, user_id, can_read, can_write, created_at) 
            VALUES (:room_id, :user_id, 1, 1, NOW())
        ");
        
        $stmt->bindParam(':room_id', $room_id);
        $stmt->bindParam(':user_id', $user_id);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في إضافة المستخدم إلى الغرفة: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة للحصول على قائمة الغرف المتاحة للمستخدم (غير المنضم إليها)
 * 
 * @param int $user_id معرف المستخدم
 * @return array مصفوفة تحتوي على قائمة الغرف المتاحة
 */
function getAvailableRooms($user_id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            SELECT r.*, u.username as created_by_username,
                  (SELECT COUNT(*) FROM room_users WHERE room_id = r.id) as users_count,
                  (SELECT COUNT(*) FROM messages WHERE room_id = r.id) as messages_count
            FROM rooms r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.is_active = 1
            AND r.id NOT IN (
                SELECT room_id 
                FROM room_users 
                WHERE user_id = :user_id
            )
            ORDER BY r.created_at DESC
        ");
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("خطأ في الحصول على قائمة الغرف المتاحة: " . $e->getMessage());
        return [];
    }
}

/**
 * دالة للحصول على قائمة الغرف التي ينتمي إليها المستخدم
 * 
 * @param int $user_id معرف المستخدم
 * @return array مصفوفة تحتوي على قائمة غرف المستخدم
 */
function getUserRooms($user_id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            SELECT r.*, ru.can_read, ru.can_write, ru.is_admin,
                  (SELECT COUNT(*) FROM room_users WHERE room_id = r.id) as users_count,
                  (SELECT COUNT(*) FROM messages WHERE room_id = r.id) as messages_count,
                  (SELECT MAX(created_at) FROM messages WHERE room_id = r.id) as last_message_time
            FROM rooms r
            JOIN room_users ru ON r.id = ru.room_id
            WHERE ru.user_id = :user_id
            AND r.is_active = 1
            ORDER BY last_message_time DESC NULLS LAST, r.created_at DESC
        ");
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("خطأ في الحصول على قائمة غرف المستخدم: " . $e->getMessage());
        return [];
    }
}

// تحديث آخر نشاط للمستخدم
updateUserLastActivity($current_user['id']);
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>غرف الدردشة - نظام الدردشة المشفر</title>
    
    <!-- Bootstrap RTL CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- ملف CSS الخاص بالدردشة -->
    <link rel="stylesheet" href="../../assets/css/chat.css">
</head>
<body>
    <!-- شريط التنقل العلوي -->
    <?php include '../../includes/chat_header.php'; ?>
    
    <div class="container py-4">
        <div class="row mb-4">
            <div class="col-md-6">
                <h1 class="h3 mb-0">
                    <i class="fas fa-comments text-primary me-1"></i> غرف الدردشة
                </h1>
            </div>
            <div class="col-md-6 text-md-end mt-2 mt-md-0">
                <p class="mb-0">
                    <i class="fas fa-user me-1"></i> مرحبًا، <?php echo htmlspecialchars($current_user['full_name'] ?: $current_user['username']); ?>
                </p>
            </div>
        </div>
        
        <?php if (!empty($success_message)): ?>
            <div class="alert alert-success alert-dismissible fade show">
                <i class="fas fa-check-circle me-1"></i> <?php echo $success_message; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
            </div>
        <?php endif; ?>
        
        <?php if (!empty($error_message)): ?>
            <div class="alert alert-danger alert-dismissible fade show">
                <i class="fas fa-exclamation-triangle me-1"></i> <?php echo $error_message; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
            </div>
        <?php endif; ?>
        
        <!-- غرف المستخدم -->
        <div class="card shadow mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                    <i class="fas fa-door-open me-1"></i> غرف الدردشة الخاصة بك (<?php echo count($user_rooms); ?>)
                </h5>
            </div>
            <div class="card-body">
                <?php if (empty($user_rooms)): ?>
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-1"></i> أنت لست منضمًا إلى أي غرفة حاليًا. انضم إلى غرفة من قائمة الغرف المتاحة أدناه.
                    </div>
                <?php else: ?>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                        <?php foreach ($user_rooms as $room): ?>
                            <div class="col">
                                <div class="card h-100 room-card">
                                    <div class="card-header">
                                        <h5 class="card-title mb-0">
                                            <?php echo htmlspecialchars($room['name']); ?>
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <p class="card-text">
                                            <?php if (!empty($room['description'])): ?>
                                                <?php echo nl2br(htmlspecialchars(substr($room['description'], 0, 100))); ?>
                                                <?php echo (strlen($room['description']) > 100) ? '...' : ''; ?>
                                            <?php else: ?>
                                                <span class="text-muted">لا يوجد وصف</span>
                                            <?php endif; ?>
                                        </p>
                                        <div class="d-flex justify-content-between mt-3">
                                            <small class="text-muted">
                                                <i class="fas fa-users me-1"></i> <?php echo $room['users_count']; ?> مستخدم
                                            </small>
                                            <small class="text-muted">
                                                <i class="fas fa-comments me-1"></i> <?php echo $room['messages_count']; ?> رسالة
                                            </small>
                                        </div>
                                    </div>
                                    <div class="card-footer d-grid">
                                        <a href="room.php?id=<?php echo $room['id']; ?>" class="btn btn-primary">
                                            <i class="fas fa-sign-in-alt me-1"></i> دخول الغرفة
                                        </a>
                                    </div>
                                    <div class="card-footer bg-light">
                                        <div class="d-flex justify-content-between">
                                            <small class="text-muted">
                                                <?php if ($room['last_message_time']): ?>
                                                    <i class="fas fa-clock me-1"></i> آخر نشاط: <?php echo formatDateDiff($room['last_message_time']); ?>
                                                <?php else: ?>
                                                    <i class="fas fa-clock me-1"></i> لا توجد رسائل بعد
                                                <?php endif; ?>
                                            </small>
                                            <div>
                                                <?php if ($room['can_read']): ?>
                                                    <span class="badge bg-success" title="يمكنك القراءة"><i class="fas fa-eye"></i></span>
                                                <?php endif; ?>
                                                
                                                <?php if ($room['can_write']): ?>
                                                    <span class="badge bg-primary" title="يمكنك الكتابة"><i class="fas fa-pen"></i></span>
                                                <?php endif; ?>
                                                
                                                <?php if ($room['is_admin']): ?>
                                                    <span class="badge bg-warning text-dark" title="أنت مسؤول الغرفة"><i class="fas fa-crown"></i></span>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- الغرف المتاحة -->
        <div class="card shadow">
            <div class="card-header bg-success text-white">
                <h5 class="mb-0">
                    <i class="fas fa-globe me-1"></i> الغرف المتاحة (<?php echo count($available_rooms); ?>)
                </h5>
            </div>
            <div class="card-body">
                <?php if (empty($available_rooms)): ?>
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-1"></i> لا توجد غرف متاحة للانضمام حاليًا.
                    </div>
                <?php else: ?>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                        <?php foreach ($available_rooms as $room): ?>
                            <div class="col">
                                <div class="card h-100 room-card available">
                                    <div class="card-header">
                                        <h5 class="card-title mb-0">
                                            <?php echo htmlspecialchars($room['name']); ?>
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <p class="card-text">
                                            <?php if (!empty($room['description'])): ?>
                                                <?php echo nl2br(htmlspecialchars(substr($room['description'], 0, 100))); ?>
                                                <?php echo (strlen($room['description']) > 100) ? '...' : ''; ?>
                                            <?php else: ?>
                                                <span class="text-muted">لا يوجد وصف</span>
                                            <?php endif; ?>
                                        </p>
                                        <div class="d-flex justify-content-between mt-3">
                                            <small class="text-muted">
                                                <i class="fas fa-users me-1"></i> <?php echo $room['users_count']; ?> مستخدم
                                            </small>
                                            <small class="text-muted">
                                                <i class="fas fa-comments me-1"></i> <?php echo $room['messages_count']; ?> رسالة
                                            </small>
                                        </div>
                                    </div>
                                    <div class="card-footer d-grid">
                                        <form action="" method="POST">
                                            <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                            <input type="hidden" name="action" value="join_room">
                                            <input type="hidden" name="room_id" value="<?php echo $room['id']; ?>">
                                            <button type="submit" class="btn btn-success w-100">
                                                <i class="fas fa-plus-circle me-1"></i> انضم إلى الغرفة
                                            </button>
                                        </form>
                                    </div>
                                    <div class="card-footer bg-light">
                                        <small class="text-muted">
                                            <i class="fas fa-user me-1"></i> أنشأها: <?php echo htmlspecialchars($room['created_by_username']); ?>
                                        </small>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    
    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- سكريبت لإخفاء التنبيهات تلقائيًا بعد فترة -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // إخفاء التنبيهات تلقائيًا بعد 5 ثوانٍ
            setTimeout(function() {
                const alerts = document.querySelectorAll('.alert-dismissible');
                alerts.forEach(function(alert) {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                });
            }, 5000);
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الوظائف الرئيسية**:
   - عرض قائمة الغرف التي ينتمي إليها المستخدم
   - عرض قائمة الغرف المتاحة للانضمام
   - إمكانية الانضمام إلى غرف جديدة
   - عرض معلومات الغرف (الوصف، عدد المستخدمين، عدد الرسائل، آخر نشاط)
   - إمكانية الدخول إلى الغرف المنضم إليها

2. **ميزات الأمان**:
   - التحقق من تسجيل الدخول
   - التحقق من رمز CSRF لمنع هجمات تزوير الطلبات
   - التحقق من وجود الغرفة ونشاطها قبل الانضمام إليها
   - تسجيل الأنشطة (انضمام المستخدم إلى غرفة)
   - تحديث آخر نشاط للمستخدم

3. **متطلبات الصفحة**:
   - ملفات التكوين (config.php)
   - ملفات الدوال المساعدة (auth_functions.php, chat_functions.php, general_functions.php)
   - Bootstrap RTL للتصميم المستجيب ودعم اللغة العربية
   - Font Awesome للأيقونات
   - ترويسة صفحات الدردشة (chat_header.php)
   - JavaScript لتحسين تجربة المستخدم

4. **ميزات واجهة المستخدم**:
   - تصميم بطاقات للغرف مع معلومات مفصلة
   - ترتيب الغرف حسب آخر نشاط فيها
   - عرض شارات توضح صلاحيات المستخدم في كل غرفة
   - تنبيهات نجاح وخطأ لتوفير تغذية راجعة للمستخدم
   - تصميم متجاوب يعمل على مختلف أحجام الشاشات

5. **الوظائف الإضافية**:
   - التحقق مما إذا كان المستخدم منضمًا بالفعل إلى غرفة قبل الانضمام
   - عرض عدد المستخدمين وعدد الرسائل في كل غرفة
   - عرض وقت آخر نشاط في كل غرفة
   - عرض منشئ الغرفة في الغرف المتاحة
