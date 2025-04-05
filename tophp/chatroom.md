
# صفحة غرفة الدردشة

**الوصف**: صفحة الدردشة الرئيسية حيث يمكن للمستخدمين إرسال واستقبال الرسائل المشفرة.

**المسار**: `/pages/chat/room.php`

## الكود الكامل

```php
<?php
/**
 * صفحة غرفة الدردشة
 * تتيح للمستخدمين إرسال واستقبال الرسائل المشفرة ضمن غرفة محددة
 */

// تضمين ملفات التكوين والدوال
require_once '../../includes/config.php';
require_once '../../includes/auth_functions.php';
require_once '../../includes/chat_functions.php';
require_once '../../includes/encryption_functions.php';
require_once '../../includes/general_functions.php';

// بدء الجلسة والتحقق من تسجيل الدخول
session_start();
checkLogin();

// التحقق من معرف الغرفة
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    setFlashMessage('error', 'معرف الغرفة غير صالح');
    redirect('rooms.php');
}

$room_id = (int) $_GET['id'];
$user_id = $_SESSION['user_id'];
$username = $_SESSION['username'];

// التحقق من وجود الغرفة وصلاحيات الوصول
$room = getRoomById($room_id);

if (!$room) {
    setFlashMessage('error', 'الغرفة غير موجودة');
    redirect('rooms.php');
}

// التحقق من صلاحية الوصول
if (!canAccessRoom($user_id, $room_id)) {
    setFlashMessage('error', 'ليس لديك صلاحية للوصول إلى هذه الغرفة');
    redirect('rooms.php');
}

// تحديث حالة المستخدم كنشط في الغرفة
updateUserRoomActivity($user_id, $room_id);

// معالجة إرسال رسالة جديدة
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['message'])) {
    $message = cleanInput($_POST['message']);
    
    if (!empty($message)) {
        // تشفير الرسالة قبل الحفظ
        $encrypted_message = encryptMessage($message, $room['encryption_key']);
        
        // حفظ الرسالة في قاعدة البيانات
        $result = saveMessage($user_id, $room_id, $encrypted_message);
        
        if (!$result) {
            setFlashMessage('error', 'حدث خطأ أثناء إرسال الرسالة');
        }
    }
    
    // إعادة توجيه لتجنب إعادة إرسال النموذج عند تحديث الصفحة
    redirect("room.php?id={$room_id}");
}

// جلب قائمة المستخدمين النشطين في الغرفة
$active_users = getActiveUsersInRoom($room_id);

// جلب الرسائل السابقة في الغرفة (مع فك التشفير)
$messages = getDecryptedRoomMessages($room_id, $room['encryption_key']);

// تحديث عنوان الصفحة
$page_title = 'غرفة ' . htmlspecialchars($room['name']);
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $page_title; ?> - نظام الدردشة المشفر</title>
    
    <!-- Bootstrap RTL CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- ملف CSS الخاص بالنظام -->
    <link rel="stylesheet" href="../../assets/css/chat.css">
</head>
<body class="bg-light">
    <!-- شريط التنقل العلوي -->
    <?php include '../../includes/chat_header.php'; ?>
    
    <div class="container-fluid mt-3">
        <div class="row">
            <!-- القائمة الجانبية للغرف -->
            <div class="col-md-3 col-lg-2 d-md-block sidebar collapse">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0"><i class="fas fa-comments me-2"></i>الغرف المتاحة</h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="list-group list-group-flush">
                            <?php
                            $available_rooms = getUserAvailableRooms($user_id);
                            foreach ($available_rooms as $r):
                                $active_class = ($r['id'] == $room_id) ? 'active bg-primary text-white' : '';
                            ?>
                                <a href="room.php?id=<?php echo $r['id']; ?>" class="list-group-item list-group-item-action <?php echo $active_class; ?>">
                                    <div class="d-flex align-items-center">
                                        <i class="fas fa-hashtag me-2"></i>
                                        <div>
                                            <?php echo htmlspecialchars($r['name']); ?>
                                            <?php if ($r['unread_count'] > 0 && $r['id'] != $room_id): ?>
                                                <span class="badge bg-danger rounded-pill ms-2"><?php echo $r['unread_count']; ?></span>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </a>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    <div class="card-footer bg-white">
                        <a href="rooms.php" class="btn btn-sm btn-outline-primary d-block">جميع الغرف</a>
                    </div>
                </div>
                
                <!-- قائمة المستخدمين النشطين -->
                <div class="card mt-3">
                    <div class="card-header bg-success text-white">
                        <h5 class="mb-0"><i class="fas fa-users me-2"></i>المستخدمون النشطون</h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="list-group list-group-flush" id="activeUsersList">
                            <?php foreach ($active_users as $active_user): ?>
                                <div class="list-group-item">
                                    <div class="d-flex align-items-center">
                                        <div class="status-indicator online me-2"></div>
                                        <div class="user-name"><?php echo htmlspecialchars($active_user['username']); ?></div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- منطقة الدردشة الرئيسية -->
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <div class="chat-container">
                    <!-- رأس الغرفة -->
                    <div class="chat-header card">
                        <div class="card-body d-flex justify-content-between align-items-center py-2">
                            <div>
                                <h4 class="mb-0">
                                    <i class="fas fa-hashtag me-2"></i>
                                    <?php echo htmlspecialchars($room['name']); ?>
                                </h4>
                                <p class="text-muted small mb-0"><?php echo htmlspecialchars($room['description']); ?></p>
                            </div>
                            <div>
                                <span class="badge bg-info me-2">
                                    <i class="fas fa-lock me-1"></i>مشفرة
                                </span>
                                <span class="badge bg-success">
                                    <i class="fas fa-users me-1"></i><?php echo count($active_users); ?> نشط
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- محتوى الدردشة -->
                    <div class="chat-messages card mt-3" id="messageContainer">
                        <div class="card-body p-0">
                            <div class="messages-list p-3" id="messages">
                                <?php if (empty($messages)): ?>
                                    <div class="text-center text-muted my-5">
                                        <i class="fas fa-comments fa-4x mb-3 opacity-25"></i>
                                        <p>لا توجد رسائل بعد. كن أول من يبدأ المحادثة!</p>
                                    </div>
                                <?php else: ?>
                                    <?php foreach ($messages as $msg): ?>
                                        <div class="message-item <?php echo ($msg['user_id'] == $user_id) ? 'message-outgoing' : 'message-incoming'; ?>">
                                            <div class="message-info">
                                                <span class="message-username"><?php echo htmlspecialchars($msg['username']); ?></span>
                                                <span class="message-time"><?php echo formatTime($msg['created_at']); ?></span>
                                            </div>
                                            <div class="message-content">
                                                <?php echo htmlspecialchars($msg['message']); ?>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                    
                    <!-- نموذج إرسال الرسائل -->
                    <div class="chat-input card mt-3">
                        <div class="card-body">
                            <form method="POST" action="" id="messageForm">
                                <div class="input-group">
                                    <input type="text" class="form-control" name="message" id="message" placeholder="اكتب رسالتك هنا..." autocomplete="off" required>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-paper-plane me-1"></i>إرسال
                                    </button>
                                </div>
                                <div class="form-text text-muted">
                                    <i class="fas fa-lock-alt me-1"></i>
                                    جميع الرسائل مشفرة باستخدام معيار AES-256.
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
    
    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- سكريبت تحديث الرسائل والمستخدمين النشطين -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const messageContainer = document.getElementById('messages');
            const activeUsersList = document.getElementById('activeUsersList');
            const messageForm = document.getElementById('messageForm');
            const messageInput = document.getElementById('message');
            const roomId = <?php echo $room_id; ?>;
            
            // التمرير إلى آخر الرسائل عند تحميل الصفحة
            scrollToBottom();
            
            // وظيفة للتمرير إلى أسفل محتوى الدردشة
            function scrollToBottom() {
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
            
            // تحديث الرسائل الجديدة كل 3 ثوانٍ
            setInterval(fetchNewMessages, 3000);
            
            // تحديث المستخدمين النشطين كل 10 ثوانٍ
            setInterval(fetchActiveUsers, 10000);
            
            // جلب الرسائل الجديدة باستخدام AJAX
            function fetchNewMessages() {
                const lastMessageTime = getLastMessageTime();
                
                fetch(`../../api/get_new_messages.php?room_id=${roomId}&last_time=${lastMessageTime}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success' && data.messages.length > 0) {
                            appendNewMessages(data.messages);
                            scrollToBottom();
                        }
                    })
                    .catch(error => {
                        console.error('خطأ في جلب الرسائل الجديدة:', error);
                    });
            }
            
            // جلب المستخدمين النشطين باستخدام AJAX
            function fetchActiveUsers() {
                fetch(`../../api/get_active_users.php?room_id=${roomId}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            updateActiveUsersList(data.users);
                        }
                    })
                    .catch(error => {
                        console.error('خطأ في جلب المستخدمين النشطين:', error);
                    });
            }
            
            // الحصول على توقيت آخر رسالة
            function getLastMessageTime() {
                const messageElements = document.querySelectorAll('.message-item');
                if (messageElements.length === 0) {
                    return 0;
                }
                
                const lastMessage = messageElements[messageElements.length - 1];
                return lastMessage.dataset.time || 0;
            }
            
            // إضافة الرسائل الجديدة إلى الصفحة
            function appendNewMessages(messages) {
                const userId = <?php echo $user_id; ?>;
                
                messages.forEach(msg => {
                    const messageType = (msg.user_id == userId) ? 'message-outgoing' : 'message-incoming';
                    
                    const messageHtml = `
                        <div class="message-item ${messageType}" data-time="${msg.created_at_timestamp}">
                            <div class="message-info">
                                <span class="message-username">${msg.username}</span>
                                <span class="message-time">${msg.formatted_time}</span>
                            </div>
                            <div class="message-content">
                                ${msg.message}
                            </div>
                        </div>
                    `;
                    
                    messageContainer.insertAdjacentHTML('beforeend', messageHtml);
                });
            }
            
            // تحديث قائمة المستخدمين النشطين
            function updateActiveUsersList(users) {
                let html = '';
                
                users.forEach(user => {
                    html += `
                        <div class="list-group-item">
                            <div class="d-flex align-items-center">
                                <div class="status-indicator online me-2"></div>
                                <div class="user-name">${user.username}</div>
                            </div>
                        </div>
                    `;
                });
                
                activeUsersList.innerHTML = html;
            }
            
            // إرسال الرسالة عبر AJAX (بدلاً من إعادة تحميل الصفحة)
            messageForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const message = messageInput.value.trim();
                if (!message) return;
                
                // تعطيل زر الإرسال أثناء المعالجة
                const submitButton = this.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                
                // إنشاء بيانات النموذج
                const formData = new FormData();
                formData.append('message', message);
                formData.append('room_id', roomId);
                
                // إرسال الطلب
                fetch('../../api/send_message.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        // مسح حقل الإدخال وإضافة الرسالة إلى الصفحة
                        messageInput.value = '';
                        appendNewMessages([data.message]);
                        scrollToBottom();
                    } else {
                        alert('حدث خطأ أثناء إرسال الرسالة: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('خطأ في إرسال الرسالة:', error);
                    alert('حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.');
                })
                .finally(() => {
                    // إعادة تفعيل زر الإرسال
                    submitButton.disabled = false;
                    messageInput.focus();
                });
            });
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الملفات المطلوبة**:
   - `includes/chat_functions.php`: يحتوي على دوال متعلقة بالدردشة مثل:
     - `getRoomById()`: لجلب معلومات الغرفة
     - `canAccessRoom()`: للتحقق من صلاحية الوصول
     - `updateUserRoomActivity()`: لتحديث نشاط المستخدم
     - `saveMessage()`: لحفظ الرسائل
     - `getActiveUsersInRoom()`: لجلب المستخدمين النشطين
     - `getDecryptedRoomMessages()`: لجلب الرسائل مع فك التشفير
     - `getUserAvailableRooms()`: لجلب الغرف المتاحة للمستخدم
   
   - `includes/encryption_functions.php`: يحتوي على دوال التشفير مثل:
     - `encryptMessage()`: لتشفير الرسائل
     - `decryptMessage()`: لفك تشفير الرسائل

2. **ملف CSS**:
   - `assets/css/chat.css`: لتنسيق صفحة الدردشة

3. **ملفات API**:
   - `api/get_new_messages.php`: لجلب الرسائل الجديدة
   - `api/get_active_users.php`: لجلب المستخدمين النشطين
   - `api/send_message.php`: لإرسال رسالة جديدة

4. **ملف القالب**:
   - `includes/chat_header.php`: لعرض شريط التنقل العلوي
