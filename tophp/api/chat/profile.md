
# صفحة الملف الشخصي للمستخدم

**الوصف**: صفحة تتيح للمستخدم عرض وتعديل معلومات ملفه الشخصي.

**المسار**: `/pages/chat/profile.php`

## الكود الكامل

```php
<?php
/**
 * صفحة الملف الشخصي
 * تتيح للمستخدم عرض وتعديل بياناته الشخصية
 */

// تضمين ملفات المشروع الضرورية
require_once '../../includes/config.php';
require_once '../../includes/auth_functions.php';
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

// مصفوفة لتخزين رسائل الخطأ
$errors = [];

// متغير للإشارة إلى نجاح العملية
$success = false;

// معالجة طلب تحديث الملف الشخصي
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $errors[] = 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    } else {
        // تنظيف وتحقق من البيانات المدخلة
        $email = cleanInput($_POST['email'] ?? '');
        $full_name = cleanInput($_POST['full_name'] ?? '');
        
        // التحقق من صحة البيانات
        if (empty($email)) {
            $errors[] = 'يرجى إدخال البريد الإلكتروني';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'البريد الإلكتروني غير صالح';
        }
        
        // التحقق مما إذا كان البريد الإلكتروني موجودًا بالفعل (إلا إذا كان نفس البريد الحالي للمستخدم)
        if (!empty($email) && $email !== $current_user['email'] && isEmailExists($email)) {
            $errors[] = 'البريد الإلكتروني موجود بالفعل. يرجى استخدام بريد إلكتروني آخر.';
        }
        
        // إذا لم تكن هناك أخطاء، قم بتحديث الملف الشخصي
        if (empty($errors)) {
            if (updateProfile($current_user['id'], $email, $full_name)) {
                // تسجيل النشاط
                logUserActivity($current_user['id'], 'profile_update', 'تم تحديث الملف الشخصي');
                
                // تحديث بيانات المستخدم الحالي
                $current_user['email'] = $email;
                $current_user['full_name'] = $full_name;
                
                // تعيين متغير النجاح
                $success = true;
            } else {
                $errors[] = 'حدث خطأ أثناء تحديث الملف الشخصي. يرجى المحاولة مرة أخرى.';
            }
        }
    }
}

// إنشاء رمز CSRF جديد
$csrf_token = generateCsrfToken();

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
 * دالة لتحديث الملف الشخصي في قاعدة البيانات
 * 
 * @param int $user_id معرف المستخدم
 * @param string $email البريد الإلكتروني
 * @param string $full_name الاسم الكامل
 * @return bool عودة صحيح إذا تم التحديث بنجاح، خطأ إذا حدث خطأ
 */
function updateProfile($user_id, $email, $full_name) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            UPDATE users 
            SET email = :email, 
                full_name = :full_name, 
                updated_at = NOW()
            WHERE id = :user_id
        ");
        
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':full_name', $full_name);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تحديث الملف الشخصي: " . $e->getMessage());
        return false;
    }
}

// الحصول على إحصائيات المستخدم
$userStats = getUserStats($current_user['id']);

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
        
        return [
            'messages_count' => $messagesCount,
            'rooms_count' => $roomsCount
        ];
    } catch (PDOException $e) {
        error_log("خطأ في جلب إحصائيات المستخدم: " . $e->getMessage());
        return [
            'messages_count' => 0,
            'rooms_count' => 0
        ];
    }
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>الملف الشخصي - نظام الدردشة المشفر</title>
    
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
    
    <div class="container py-5">
        <div class="row">
            <div class="col-md-4">
                <div class="card shadow mb-4">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">
                            <i class="fas fa-user me-1"></i> معلومات الحساب
                        </h5>
                    </div>
                    <div class="card-body text-center">
                        <div class="avatar-container mb-3">
                            <img src="../../assets/images/avatar.png" alt="صورة المستخدم" class="rounded-circle img-thumbnail" style="width: 120px; height: 120px;">
                        </div>
                        
                        <h5 class="card-title"><?php echo htmlspecialchars($current_user['username']); ?></h5>
                        <p class="card-text">
                            <?php if ($current_user['role'] == 'admin'): ?>
                                <span class="badge bg-danger">مسؤول</span>
                            <?php else: ?>
                                <span class="badge bg-info">مستخدم</span>
                            <?php endif; ?>
                        </p>
                        
                        <hr>
                        
                        <div class="user-stats">
                            <div class="row text-center">
                                <div class="col-6">
                                    <h5><?php echo $userStats['messages_count']; ?></h5>
                                    <p class="text-muted">الرسائل</p>
                                </div>
                                <div class="col-6">
                                    <h5><?php echo $userStats['rooms_count']; ?></h5>
                                    <p class="text-muted">الغرف</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-3">
                            <a href="changePassword.php" class="btn btn-outline-primary w-100">
                                <i class="fas fa-key me-1"></i> تغيير كلمة المرور
                            </a>
                        </div>
                    </div>
                    <div class="card-footer bg-light">
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i> تاريخ التسجيل: <?php echo formatDate($current_user['created_at']); ?>
                        </small>
                    </div>
                </div>
                
                <div class="card shadow">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">
                            <i class="fas fa-link me-1"></i> روابط سريعة
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="list-group">
                            <a href="rooms.php" class="list-group-item list-group-item-action">
                                <i class="fas fa-comments me-1"></i> غرف الدردشة
                            </a>
                            <?php if ($current_user['role'] == 'admin'): ?>
                                <a href="../admin/dashboard.php" class="list-group-item list-group-item-action">
                                    <i class="fas fa-tachometer-alt me-1"></i> لوحة التحكم
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-8">
                <div class="card shadow">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">
                            <i class="fas fa-edit me-1"></i> تعديل الملف الشخصي
                        </h5>
                    </div>
                    <div class="card-body">
                        <?php if ($success): ?>
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle me-1"></i> تم تحديث الملف الشخصي بنجاح.
                            </div>
                        <?php endif; ?>
                        
                        <?php if (!empty($errors)): ?>
                            <div class="alert alert-danger">
                                <ul class="mb-0">
                                    <?php foreach ($errors as $error): ?>
                                        <li><?php echo $error; ?></li>
                                    <?php endforeach; ?>
                                </ul>
                            </div>
                        <?php endif; ?>
                        
                        <form action="" method="POST" id="profileForm">
                            <!-- رمز CSRF للحماية -->
                            <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                            
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <label for="username" class="form-label">اسم المستخدم</label>
                                    <input type="text" class="form-control" id="username" value="<?php echo htmlspecialchars($current_user['username']); ?>" readonly>
                                    <div class="form-text">لا يمكن تغيير اسم المستخدم.</div>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <label for="email" class="form-label">البريد الإلكتروني <span class="text-danger">*</span></label>
                                    <input type="email" class="form-control" id="email" name="email" value="<?php echo htmlspecialchars($current_user['email']); ?>" required>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <label for="full_name" class="form-label">الاسم الكامل</label>
                                    <input type="text" class="form-control" id="full_name" name="full_name" value="<?php echo htmlspecialchars($current_user['full_name'] ?? ''); ?>">
                                    <div class="form-text">الاسم الكامل اختياري، ولكنه يساعد المستخدمين الآخرين في التعرف عليك.</div>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="role" class="form-label">الدور</label>
                                    <input type="text" class="form-control" id="role" value="<?php echo ($current_user['role'] == 'admin') ? 'مسؤول' : 'مستخدم'; ?>" readonly>
                                </div>
                                
                                <div class="col-md-6">
                                    <label for="created_at" class="form-label">تاريخ التسجيل</label>
                                    <input type="text" class="form-control" id="created_at" value="<?php echo formatDate($current_user['created_at']); ?>" readonly>
                                </div>
                            </div>
                            
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save me-1"></i> حفظ التغييرات
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="card shadow mt-4">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">
                            <i class="fas fa-shield-alt me-1"></i> أمان الحساب
                        </h5>
                    </div>
                    <div class="card-body">
                        <p class="mb-3">يمكنك تعزيز أمان حسابك باتباع النصائح التالية:</p>
                        
                        <ul class="list-group mb-3">
                            <li class="list-group-item">
                                <i class="fas fa-check-circle text-success me-1"></i> استخدم كلمة مرور قوية وفريدة
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-check-circle text-success me-1"></i> قم بتغيير كلمة المرور بشكل دوري
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-check-circle text-success me-1"></i> لا تشارك معلومات حسابك مع أي شخص
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-check-circle text-success me-1"></i> تأكد من تسجيل الخروج بعد الانتهاء من استخدام النظام
                            </li>
                        </ul>
                        
                        <div class="d-grid">
                            <a href="changePassword.php" class="btn btn-outline-primary">
                                <i class="fas fa-key me-1"></i> تغيير كلمة المرور
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- سكريبت للتعامل مع النموذج -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // التحقق من النموذج قبل الإرسال
            const form = document.getElementById('profileForm');
            if (form) {
                form.addEventListener('submit', function(event) {
                    let isValid = true;
                    
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
                    
                    // منع إرسال النموذج إذا كان هناك أخطاء
                    if (!isValid) {
                        event.preventDefault();
                    }
                });
                
                // إزالة تنسيقات التحقق عند تغيير قيمة الحقول
                const inputs = form.querySelectorAll('input');
                inputs.forEach(input => {
                    input.addEventListener('input', function() {
                        this.classList.remove('is-invalid');
                        this.classList.remove('is-valid');
                        
                        // إزالة رسائل الخطأ
                        const feedback = this.nextElementSibling;
                        if (feedback && feedback.classList.contains('invalid-feedback')) {
                            feedback.remove();
                        }
                    });
                });
            }
            
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
                inputElement.parentNode.insertBefore(feedback, inputElement.nextElementSibling);
            }
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الوظائف الرئيسية**:
   - عرض معلومات الملف الشخصي للمستخدم
   - تعديل البريد الإلكتروني والاسم الكامل
   - عرض إحصائيات المستخدم (عدد الرسائل، عدد الغرف)
   - روابط لتغيير كلمة المرور والعودة لغرف الدردشة
   - نصائح لتعزيز أمان الحساب

2. **ميزات الأمان**:
   - التحقق من تسجيل الدخول
   - التحقق من رمز CSRF لمنع هجمات تزوير الطلبات
   - تنظيف المدخلات لمنع هجمات XSS
   - التحقق من فريدية البريد الإلكتروني
   - تسجيل نشاط تحديث الملف الشخصي في سجل النشاطات

3. **متطلبات الصفحة**:
   - ملفات التكوين (config.php)
   - ملفات الدوال المساعدة (auth_functions.php, general_functions.php)
   - Bootstrap RTL للتصميم المستجيب ودعم اللغة العربية
   - Font Awesome للأيقونات
   - ترويسة صفحات الدردشة (chat_header.php)
   - JavaScript للتحقق من صحة النموذج وتحسين تجربة المستخدم

4. **التحقق من الصحة**:
   - التحقق من البريد الإلكتروني (غير فارغ، صيغة صحيحة، غير مكرر)
   - عرض رسائل خطأ واضحة في حالة وجود مشاكل
   - التحقق من صحة النموذج في المتصفح قبل الإرسال

5. **ميزات واجهة المستخدم**:
   - تصميم مقسم إلى قسمين: معلومات الحساب وتعديل الملف الشخصي
   - عرض إحصائيات المستخدم بشكل واضح
   - صورة افتراضية للمستخدم
   - روابط سريعة للوصول إلى الميزات الرئيسية
   - نصائح لتعزيز أمان الحساب
   - تنسيق متجاوب يعمل على مختلف أحجام الشاشات
