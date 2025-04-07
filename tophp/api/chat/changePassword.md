
# صفحة تغيير كلمة المرور

**الوصف**: صفحة تتيح للمستخدم تغيير كلمة المرور الخاصة به.

**المسار**: `/pages/chat/changePassword.php`

## الكود الكامل

```php
<?php
/**
 * صفحة تغيير كلمة المرور
 * تتيح للمستخدم تغيير كلمة المرور الخاصة به
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

// معالجة طلب تغيير كلمة المرور
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $errors[] = 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    } else {
        // تنظيف وتحقق من البيانات المدخلة
        $current_password = $_POST['current_password'] ?? '';
        $new_password = $_POST['new_password'] ?? '';
        $confirm_password = $_POST['confirm_password'] ?? '';
        
        // التحقق من صحة البيانات
        if (empty($current_password)) {
            $errors[] = 'يرجى إدخال كلمة المرور الحالية';
        }
        
        if (empty($new_password)) {
            $errors[] = 'يرجى إدخال كلمة المرور الجديدة';
        } elseif (strlen($new_password) < 8) {
            $errors[] = 'يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل';
        }
        
        if ($new_password !== $confirm_password) {
            $errors[] = 'كلمة المرور الجديدة وتأكيدها غير متطابقين';
        }
        
        // التحقق من صحة كلمة المرور الحالية
        if (!empty($current_password) && !verifyCurrentPassword($current_user['id'], $current_password)) {
            $errors[] = 'كلمة المرور الحالية غير صحيحة';
        }
        
        // إذا لم تكن هناك أخطاء، قم بتغيير كلمة المرور
        if (empty($errors)) {
            // تشفير كلمة المرور الجديدة
            $hashed_password = password_hash($new_password, PASSWORD_BCRYPT);
            
            // تحديث كلمة المرور في قاعدة البيانات
            if (updatePassword($current_user['id'], $hashed_password)) {
                // تسجيل النشاط
                logUserActivity($current_user['id'], 'password_change', 'تم تغيير كلمة المرور');
                
                // تعيين متغير النجاح
                $success = true;
            } else {
                $errors[] = 'حدث خطأ أثناء تغيير كلمة المرور. يرجى المحاولة مرة أخرى.';
            }
        }
    }
}

// إنشاء رمز CSRF جديد
$csrf_token = generateCsrfToken();

/**
 * دالة للتحقق من صحة كلمة المرور الحالية
 * 
 * @param int $user_id معرف المستخدم
 * @param string $password كلمة المرور المدخلة
 * @return bool عودة صحيح إذا كانت كلمة المرور صحيحة، خطأ إذا كانت غير صحيحة
 */
function verifyCurrentPassword($user_id, $password) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("SELECT password FROM users WHERE id = :user_id");
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            return password_verify($password, $user['password']);
        }
        
        return false;
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من كلمة المرور الحالية: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة لتحديث كلمة المرور في قاعدة البيانات
 * 
 * @param int $user_id معرف المستخدم
 * @param string $hashed_password كلمة المرور المشفرة
 * @return bool عودة صحيح إذا تم التحديث بنجاح، خطأ إذا حدث خطأ
 */
function updatePassword($user_id, $hashed_password) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            UPDATE users 
            SET password = :password, 
                updated_at = NOW()
            WHERE id = :user_id
        ");
        
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':password', $hashed_password);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في تحديث كلمة المرور: " . $e->getMessage());
        return false;
    }
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تغيير كلمة المرور - نظام الدردشة المشفر</title>
    
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
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card shadow">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">
                            <i class="fas fa-key me-1"></i> تغيير كلمة المرور
                        </h5>
                    </div>
                    <div class="card-body">
                        <?php if ($success): ?>
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle me-1"></i> تم تغيير كلمة المرور بنجاح.
                            </div>
                            <div class="text-center mt-3">
                                <a href="rooms.php" class="btn btn-primary">
                                    <i class="fas fa-door-open me-1"></i> العودة إلى غرف الدردشة
                                </a>
                            </div>
                        <?php else: ?>
                            <?php if (!empty($errors)): ?>
                                <div class="alert alert-danger">
                                    <ul class="mb-0">
                                        <?php foreach ($errors as $error): ?>
                                            <li><?php echo $error; ?></li>
                                        <?php endforeach; ?>
                                    </ul>
                                </div>
                            <?php endif; ?>
                            
                            <form action="" method="POST" id="passwordForm">
                                <!-- رمز CSRF للحماية -->
                                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                
                                <div class="mb-3">
                                    <label for="current_password" class="form-label">كلمة المرور الحالية <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <input type="password" class="form-control" id="current_password" name="current_password" required>
                                        <button class="btn btn-outline-secondary toggle-password" type="button" data-target="current_password">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="new_password" class="form-label">كلمة المرور الجديدة <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <input type="password" class="form-control" id="new_password" name="new_password" required>
                                        <button class="btn btn-outline-secondary toggle-password" type="button" data-target="new_password">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                    <div class="form-text">يجب أن تكون كلمة المرور 8 أحرف على الأقل.</div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="confirm_password" class="form-label">تأكيد كلمة المرور الجديدة <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
                                        <button class="btn btn-outline-secondary toggle-password" type="button" data-target="confirm_password">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <div class="alert alert-info">
                                        <i class="fas fa-info-circle me-1"></i> نصائح لكلمة مرور قوية:
                                        <ul class="mt-2 mb-0">
                                            <li>استخدم 8 أحرف على الأقل</li>
                                            <li>استخدم مزيجًا من الأحرف الكبيرة والصغيرة</li>
                                            <li>استخدم أرقامًا ورموزًا خاصة مثل !@#$%^&*</li>
                                            <li>تجنب استخدام معلومات شخصية يمكن تخمينها</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save me-1"></i> تغيير كلمة المرور
                                    </button>
                                    <a href="rooms.php" class="btn btn-secondary">
                                        <i class="fas fa-times me-1"></i> إلغاء
                                    </a>
                                </div>
                            </form>
                        <?php endif; ?>
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
            const form = document.getElementById('passwordForm');
            if (form) {
                form.addEventListener('submit', function(event) {
                    let isValid = true;
                    
                    // التحقق من كلمة المرور الحالية
                    const currentPasswordInput = document.getElementById('current_password');
                    if (!currentPasswordInput.value.trim()) {
                        isValid = false;
                        currentPasswordInput.classList.add('is-invalid');
                        showValidationError(currentPasswordInput, 'يرجى إدخال كلمة المرور الحالية');
                    } else {
                        currentPasswordInput.classList.remove('is-invalid');
                    }
                    
                    // التحقق من كلمة المرور الجديدة
                    const newPasswordInput = document.getElementById('new_password');
                    if (!newPasswordInput.value.trim()) {
                        isValid = false;
                        newPasswordInput.classList.add('is-invalid');
                        showValidationError(newPasswordInput, 'يرجى إدخال كلمة المرور الجديدة');
                    } else if (newPasswordInput.value.length < 8) {
                        isValid = false;
                        newPasswordInput.classList.add('is-invalid');
                        showValidationError(newPasswordInput, 'يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل');
                    } else {
                        newPasswordInput.classList.remove('is-invalid');
                    }
                    
                    // التحقق من تأكيد كلمة المرور
                    const confirmPasswordInput = document.getElementById('confirm_password');
                    if (!confirmPasswordInput.value.trim()) {
                        isValid = false;
                        confirmPasswordInput.classList.add('is-invalid');
                        showValidationError(confirmPasswordInput, 'يرجى تأكيد كلمة المرور الجديدة');
                    } else if (confirmPasswordInput.value !== newPasswordInput.value) {
                        isValid = false;
                        confirmPasswordInput.classList.add('is-invalid');
                        showValidationError(confirmPasswordInput, 'كلمة المرور الجديدة وتأكيدها غير متطابقين');
                    } else {
                        confirmPasswordInput.classList.remove('is-invalid');
                    }
                    
                    // منع إرسال النموذج إذا كان هناك أخطاء
                    if (!isValid) {
                        event.preventDefault();
                    }
                });
                
                // تبديل عرض كلمة المرور (إظهار/إخفاء)
                const toggleButtons = document.querySelectorAll('.toggle-password');
                toggleButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const targetId = this.getAttribute('data-target');
                        const targetInput = document.getElementById(targetId);
                        
                        const type = targetInput.getAttribute('type') === 'password' ? 'text' : 'password';
                        targetInput.setAttribute('type', type);
                        
                        const icon = this.querySelector('i');
                        icon.classList.toggle('fa-eye');
                        icon.classList.toggle('fa-eye-slash');
                    });
                });
                
                // إزالة تنسيقات التحقق عند تغيير قيمة الحقول
                const inputs = form.querySelectorAll('input');
                inputs.forEach(input => {
                    input.addEventListener('input', function() {
                        this.classList.remove('is-invalid');
                        
                        // إزالة رسائل الخطأ
                        const parent = this.parentNode;
                        const feedback = parent.querySelector('.invalid-feedback');
                        if (feedback) {
                            feedback.remove();
                        }
                    });
                });
            }
            
            // دالة لعرض رسالة خطأ التحقق
            function showValidationError(inputElement, message) {
                // إزالة رسائل الخطأ السابقة
                const parent = inputElement.parentNode;
                const existingFeedback = parent.nextElementSibling;
                if (existingFeedback && existingFeedback.classList.contains('invalid-feedback')) {
                    existingFeedback.remove();
                }
                
                // إضافة رسالة خطأ جديدة
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback d-block';
                feedback.textContent = message;
                
                // إضافة الرسالة بعد الحقل
                parent.parentNode.insertBefore(feedback, parent.nextElementSibling);
            }
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الوظائف الرئيسية**:
   - عرض نموذج لتغيير كلمة المرور
   - التحقق من كلمة المرور الحالية
   - التحقق من توافق كلمة المرور الجديدة مع معايير الأمان
   - التحقق من تطابق كلمة المرور الجديدة وتأكيدها
   - تحديث كلمة المرور في قاعدة البيانات
   - عرض تنبيه بنجاح العملية

2. **ميزات الأمان**:
   - التحقق من تسجيل الدخول
   - التحقق من رمز CSRF لمنع هجمات تزوير الطلبات
   - التحقق من صحة كلمة المرور الحالية قبل السماح بالتغيير
   - تشفير كلمة المرور الجديدة باستخدام خوارزمية Bcrypt
   - تسجيل نشاط تغيير كلمة المرور في سجل النشاطات
   - إمكانية إظهار/إخفاء كلمة المرور أثناء الإدخال

3. **متطلبات الصفحة**:
   - ملفات التكوين (config.php)
   - ملفات الدوال المساعدة (auth_functions.php, general_functions.php)
   - Bootstrap RTL للتصميم المستجيب ودعم اللغة العربية
   - Font Awesome للأيقونات
   - ترويسة صفحات الدردشة (chat_header.php)
   - JavaScript للتحقق من صحة النموذج وتحسين تجربة المستخدم

4. **التحقق من الصحة**:
   - التحقق من كلمة المرور الحالية (غير فارغة، صحيحة)
   - التحقق من كلمة المرور الجديدة (غير فارغة، الطول 8 أحرف على الأقل)
   - التحقق من تطابق كلمة المرور الجديدة وتأكيدها
   - عرض رسائل خطأ واضحة في حالة وجود مشاكل

5. **ميزات إضافية**:
   - عرض نصائح لإنشاء كلمة مرور قوية
   - أزرار لإظهار/إخفاء كلمة المرور أثناء الإدخال
   - التحقق من صحة النموذج في المتصفح قبل الإرسال
   - عرض شاشة تأكيد بعد نجاح العملية
