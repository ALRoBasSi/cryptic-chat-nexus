
# صفحة تعديل غرفة الدردشة

**الوصف**: صفحة تتيح للمسؤول تعديل معلومات غرفة دردشة موجودة.

**المسار**: `/pages/admin/room_edit.php`

## الكود الكامل

```php
<?php
/**
 * صفحة تعديل غرفة دردشة
 * تتيح للمسؤول تعديل معلومات غرفة دردشة موجودة
 */

// تضمين ملفات المشروع الضرورية
require_once '../../includes/config.php';
require_once '../../includes/auth_functions.php';
require_once '../../includes/admin_functions.php';
require_once '../../includes/general_functions.php';
require_once '../../includes/encryption_functions.php';

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

// معالجة طلب تعديل الغرفة
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $errors[] = 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    } else {
        // تنظيف وتحقق من البيانات المدخلة
        $name = cleanInput($_POST['name'] ?? '');
        $description = cleanInput($_POST['description'] ?? '');
        $is_active = isset($_POST['is_active']) ? 1 : 0;
        $regenerate_key = isset($_POST['regenerate_key']) ? 1 : 0;
        
        // التحقق من صحة البيانات
        if (empty($name)) {
            $errors[] = 'يرجى إدخال اسم الغرفة';
        } elseif (strlen($name) < 3 || strlen($name) > 100) {
            $errors[] = 'يجب أن يكون اسم الغرفة بين 3 و 100 حرف';
        }
        
        // التحقق مما إذا كان اسم الغرفة موجودًا بالفعل (إلا إذا كان نفس الاسم الحالي للغرفة)
        if (!empty($name) && $name !== $room['name'] && isRoomNameExists($name)) {
            $errors[] = 'اسم الغرفة موجود بالفعل. يرجى اختيار اسم آخر.';
        }
        
        // إذا لم تكن هناك أخطاء، قم بتحديث الغرفة
        if (empty($errors)) {
            // تحديد ما إذا كان يجب إعادة إنشاء مفتاح التشفير
            $encryption_key = $room['encryption_key'];
            if ($regenerate_key) {
                $encryption_key = generateEncryptionKey();
            }
            
            // تحديث بيانات الغرفة في قاعدة البيانات
            if (updateRoom($room_id, $name, $description, $encryption_key, $is_active)) {
                // تسجيل النشاط
                logAdminActivity("تعديل غرفة: {$name}");
                
                // تحديث متغير الغرفة للعرض
                $room['name'] = $name;
                $room['description'] = $description;
                $room['is_active'] = $is_active;
                $room['encryption_key'] = $encryption_key;
                
                // إعادة التوجيه إلى صفحة إدارة الغرف مع رسالة نجاح
                setFlashMessage('success', 'تم تعديل الغرفة بنجاح');
                redirect('rooms.php');
                exit;
            } else {
                $errors[] = 'حدث خطأ أثناء تعديل الغرفة. يرجى المحاولة مرة أخرى.';
            }
        }
    }
}

// إنشاء رمز CSRF جديد
$csrf_token = generateCsrfToken();

/**
 * دالة للتحقق من وجود اسم الغرفة في قاعدة البيانات
 * 
 * @param string $name اسم الغرفة المراد التحقق منه
 * @return bool عودة صحيح إذا كان الاسم موجودًا، خطأ إذا لم يكن موجودًا
 */
function isRoomNameExists($name) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("SELECT id FROM rooms WHERE name = :name");
        $stmt->bindParam(':name', $name);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من اسم الغرفة: " . $e->getMessage());
        return false;
    }
}

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
 * دالة لتحديث بيانات غرفة في قاعدة البيانات
 * 
 * @param int $id معرف الغرفة
 * @param string $name اسم الغرفة
 * @param string $description وصف الغرفة
 * @param string $encryption_key مفتاح التشفير الخاص بالغرفة
 * @param int $is_active حالة نشاط الغرفة (1=نشطة، 0=غير نشطة)
 * @return bool عودة صحيح إذا تم التحديث بنجاح، خطأ إذا حدث خطأ
 */
function updateRoom($id, $name, $description, $encryption_key, $is_active) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            UPDATE rooms 
            SET name = :name, 
                description = :description, 
                encryption_key = :encryption_key, 
                is_active = :is_active, 
                updated_at = NOW()
            WHERE id = :id
        ");
        
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':encryption_key', $encryption_key);
        $stmt->bindParam(':is_active', $is_active);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تحديث بيانات الغرفة: " . $e->getMessage());
        return false;
    }
}

// حساب إحصائيات الغرفة
$roomStats = getRoomStats($room_id);

/**
 * دالة لجلب إحصائيات الغرفة
 * 
 * @param int $room_id معرف الغرفة
 * @return array مصفوفة تحتوي على إحصائيات الغرفة
 */
function getRoomStats($room_id) {
    global $conn;
    
    try {
        // عدد المستخدمين في الغرفة
        $stmt = $conn->prepare("SELECT COUNT(*) as users_count FROM room_users WHERE room_id = :room_id");
        $stmt->bindParam(':room_id', $room_id);
        $stmt->execute();
        $usersCount = $stmt->fetch(PDO::FETCH_ASSOC)['users_count'];
        
        // عدد الرسائل في الغرفة
        $stmt = $conn->prepare("SELECT COUNT(*) as messages_count FROM messages WHERE room_id = :room_id");
        $stmt->bindParam(':room_id', $room_id);
        $stmt->execute();
        $messagesCount = $stmt->fetch(PDO::FETCH_ASSOC)['messages_count'];
        
        // آخر نشاط في الغرفة
        $stmt = $conn->prepare("
            SELECT MAX(created_at) as last_activity 
            FROM messages 
            WHERE room_id = :room_id
        ");
        $stmt->bindParam(':room_id', $room_id);
        $stmt->execute();
        $lastActivity = $stmt->fetch(PDO::FETCH_ASSOC)['last_activity'];
        
        return [
            'users_count' => $usersCount,
            'messages_count' => $messagesCount,
            'last_activity' => $lastActivity
        ];
    } catch (PDOException $e) {
        error_log("خطأ في جلب إحصائيات الغرفة: " . $e->getMessage());
        return [
            'users_count' => 0,
            'messages_count' => 0,
            'last_activity' => null
        ];
    }
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تعديل غرفة الدردشة - نظام الدردشة المشفر</title>
    
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
                    <h1 class="h2">تعديل غرفة الدردشة</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <a href="room_users.php?id=<?php echo $room_id; ?>" class="btn btn-sm btn-outline-primary me-2">
                            <i class="fas fa-users ms-1"></i> إدارة المستخدمين
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
                
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card mb-4">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">معلومات الغرفة</h5>
                            </div>
                            <div class="card-body">
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>المعرف</span>
                                        <span class="badge bg-primary rounded-pill"><?php echo $room['id']; ?></span>
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
                                        <span class="badge bg-info rounded-pill"><?php echo $roomStats['users_count']; ?></span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>عدد الرسائل</span>
                                        <span class="badge bg-success rounded-pill"><?php echo $roomStats['messages_count']; ?></span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>آخر نشاط</span>
                                        <span><?php echo $roomStats['last_activity'] ? formatDate($roomStats['last_activity']) : 'لا يوجد نشاط'; ?></span>
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
                                    <a href="room_users.php?id=<?php echo $room_id; ?>" class="btn btn-outline-primary">
                                        <i class="fas fa-users me-1"></i> إدارة المستخدمين
                                    </a>
                                    <a href="messages.php?room_id=<?php echo $room_id; ?>" class="btn btn-outline-info">
                                        <i class="fas fa-comments me-1"></i> عرض الرسائل
                                    </a>
                                    <button type="button" class="btn btn-outline-danger" data-bs-toggle="modal" data-bs-target="#deleteRoomModal">
                                        <i class="fas fa-trash-alt me-1"></i> حذف الغرفة
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <i class="fas fa-edit me-1"></i> تعديل معلومات الغرفة
                            </div>
                            <div class="card-body">
                                <form action="" method="POST">
                                    <!-- رمز CSRF للحماية -->
                                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-12">
                                            <label for="name" class="form-label">اسم الغرفة <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="name" name="name" 
                                                value="<?php echo htmlspecialchars($room['name']); ?>" required>
                                            <div class="form-text">اسم الغرفة يجب أن يكون فريدًا ويتراوح بين 3 و 100 حرف.</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-12">
                                            <label for="description" class="form-label">وصف الغرفة</label>
                                            <textarea class="form-control" id="description" name="description" rows="3"><?php echo htmlspecialchars($room['description']); ?></textarea>
                                            <div class="form-text">وصف موجز للغرفة وموضوعها.</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-12">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="is_active" name="is_active" <?php echo $room['is_active'] ? 'checked' : ''; ?>>
                                                <label class="form-check-label" for="is_active">تفعيل الغرفة</label>
                                            </div>
                                            <div class="form-text">إذا تم تفعيل الغرفة، يمكن للمستخدمين الوصول إليها. إذا لم يتم تفعيلها، لن تظهر في قائمة الغرف.</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-12">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="regenerate_key" name="regenerate_key">
                                                <label class="form-check-label" for="regenerate_key">إعادة إنشاء مفتاح التشفير</label>
                                            </div>
                                            <div class="form-text text-warning">
                                                <i class="fas fa-exclamation-triangle me-1"></i> تحذير: إعادة إنشاء مفتاح التشفير ستؤدي إلى عدم القدرة على فك تشفير الرسائل القديمة. استخدم هذا الخيار فقط إذا كنت متأكدًا من ذلك.
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-12">
                                            <label for="current_key" class="form-label">مفتاح التشفير الحالي</label>
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="current_key" value="<?php echo htmlspecialchars(substr($room['encryption_key'], 0, 10) . '...'); ?>" readonly>
                                                <button class="btn btn-outline-secondary" type="button" id="showKeyBtn">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                            </div>
                                            <div class="form-text">هذا المفتاح يستخدم لتشفير وفك تشفير الرسائل في هذه الغرفة.</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mt-4">
                                        <div class="col-md-12 text-start">
                                            <button type="submit" class="btn btn-primary">
                                                <i class="fas fa-save me-1"></i> حفظ التغييرات
                                            </button>
                                            <a href="rooms.php" class="btn btn-secondary">
                                                <i class="fas fa-times me-1"></i> إلغاء
                                            </a>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- نافذة تأكيد حذف الغرفة -->
                <div class="modal fade" id="deleteRoomModal" tabindex="-1" aria-labelledby="deleteRoomModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="deleteRoomModalLabel">تأكيد حذف الغرفة</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="إغلاق"></button>
                            </div>
                            <div class="modal-body">
                                <p>هل أنت متأكد من رغبتك في حذف غرفة "<?php echo htmlspecialchars($room['name']); ?>"؟</p>
                                <div class="alert alert-danger">
                                    <i class="fas fa-exclamation-triangle me-1"></i> تحذير: سيؤدي هذا الإجراء إلى حذف جميع الرسائل والنشاطات المرتبطة بهذه الغرفة بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <form action="room_delete.php" method="POST">
                                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                    <input type="hidden" name="room_id" value="<?php echo $room_id; ?>">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                                    <button type="submit" class="btn btn-danger">نعم، حذف الغرفة</button>
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
    
    <!-- سكريبت للتعامل مع النموذج وعرض المفتاح -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // استهداف النموذج
            const form = document.querySelector('form');
            
            // التحقق من النموذج قبل الإرسال
            form.addEventListener('submit', function(event) {
                let isValid = true;
                const nameInput = document.getElementById('name');
                
                // التحقق من اسم الغرفة
                if (!nameInput.value.trim()) {
                    isValid = false;
                    nameInput.classList.add('is-invalid');
                    
                    // إنشاء عنصر تغذية راجعة للخطأ إذا لم يكن موجودًا
                    if (!nameInput.nextElementSibling || !nameInput.nextElementSibling.classList.contains('invalid-feedback')) {
                        const feedback = document.createElement('div');
                        feedback.className = 'invalid-feedback';
                        feedback.textContent = 'يرجى إدخال اسم الغرفة';
                        nameInput.parentNode.insertBefore(feedback, nameInput.nextElementSibling);
                    }
                } else if (nameInput.value.length < 3 || nameInput.value.length > 100) {
                    isValid = false;
                    nameInput.classList.add('is-invalid');
                    
                    // إنشاء عنصر تغذية راجعة للخطأ إذا لم يكن موجودًا
                    if (!nameInput.nextElementSibling || !nameInput.nextElementSibling.classList.contains('invalid-feedback')) {
                        const feedback = document.createElement('div');
                        feedback.className = 'invalid-feedback';
                        feedback.textContent = 'يجب أن يكون اسم الغرفة بين 3 و 100 حرف';
                        nameInput.parentNode.insertBefore(feedback, nameInput.nextElementSibling);
                    }
                } else {
                    nameInput.classList.remove('is-invalid');
                    nameInput.classList.add('is-valid');
                }
                
                // تحذير عند اختيار إعادة إنشاء مفتاح التشفير
                const regenerateKeyCheckbox = document.getElementById('regenerate_key');
                if (regenerateKeyCheckbox.checked) {
                    if (!confirm('هل أنت متأكد من رغبتك في إعادة إنشاء مفتاح التشفير؟ سيؤدي ذلك إلى عدم القدرة على فك تشفير الرسائل القديمة.')) {
                        event.preventDefault();
                        return;
                    }
                }
                
                // منع إرسال النموذج إذا كان هناك أخطاء
                if (!isValid) {
                    event.preventDefault();
                }
            });
            
            // إزالة تنسيقات التحقق عند تغيير قيمة الحقل
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', function() {
                    this.classList.remove('is-invalid');
                    this.classList.remove('is-valid');
                    
                    // إزالة عنصر تغذية راجعة للخطأ إذا كان موجودًا
                    const feedback = this.nextElementSibling;
                    if (feedback && feedback.classList.contains('invalid-feedback')) {
                        feedback.remove();
                    }
                });
            });
            
            // عرض مفتاح التشفير كاملاً
            const showKeyBtn = document.getElementById('showKeyBtn');
            const currentKeyInput = document.getElementById('current_key');
            
            showKeyBtn.addEventListener('click', function() {
                const currentValue = currentKeyInput.value;
                const fullKey = '<?php echo htmlspecialchars($room['encryption_key']); ?>';
                
                if (currentValue.includes('...')) {
                    currentKeyInput.value = fullKey;
                    showKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    currentKeyInput.value = '<?php echo htmlspecialchars(substr($room['encryption_key'], 0, 10) . '...'); ?>';
                    showKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
                }
            });
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الوظائف الرئيسية**:
   - عرض معلومات الغرفة الحالية
   - تعديل معلومات الغرفة (الاسم، الوصف، الحالة)
   - إمكانية إعادة إنشاء مفتاح التشفير مع تحذير المستخدم
   - عرض إحصائيات الغرفة (عدد المستخدمين، عدد الرسائل، آخر نشاط)
   - إجراءات سريعة (إدارة المستخدمين، عرض الرسائل، حذف الغرفة)

2. **ميزات الأمان**:
   - التحقق من تسجيل الدخول وصلاحيات المسؤول
   - التحقق من رمز CSRF لمنع هجمات تزوير الطلبات
   - تنظيف المدخلات لمنع هجمات XSS
   - استخدام Prepared Statements لمنع هجمات SQL Injection
   - إخفاء مفتاح التشفير بشكل افتراضي مع إمكانية إظهاره

3. **متطلبات الصفحة**:
   - ملفات التكوين (config.php)
   - ملفات الدوال المساعدة (auth_functions.php, admin_functions.php, encryption_functions.php)
   - Bootstrap RTL للتصميم المستجيب ودعم اللغة العربية
   - Font Awesome للأيقونات
   - القائمة الجانبية للوحة تحكم المسؤول (admin_sidebar.php)

4. **التحقق من الصحة**:
   - التحقق من معرف الغرفة في URL
   - التحقق من اسم الغرفة (غير فارغ، الطول بين 3 و 100 حرف، غير مكرر)
   - التحقق من تفعيل الغرفة
   - تأكيد إضافي عند إعادة إنشاء مفتاح التشفير
   - عرض رسائل خطأ واضحة في حالة وجود مشاكل
