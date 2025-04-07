
# صفحة إضافة مستخدم جديد

**الوصف**: صفحة تتيح للمسؤول إضافة مستخدم جديد إلى النظام.

**المسار**: `/pages/admin/user_add.php`

## الكود الكامل

```php
<?php
/**
 * صفحة إضافة مستخدم جديد
 * تتيح للمسؤول إنشاء حساب مستخدم جديد مع تحديد الدور والصلاحيات
 */

// تضمين ملفات المشروع الضرورية
require_once '../../includes/config.php';
require_once '../../includes/auth_functions.php';
require_once '../../includes/admin_functions.php';
require_once '../../includes/general_functions.php';

// بدء الجلسة
session_start();

// التحقق من تسجيل الدخول وصلاحيات المسؤول
if (!isLoggedIn() || !isAdmin()) {
    // إعادة التوجيه إلى صفحة تسجيل الدخول إذا لم يكن المستخدم مسجل دخوله أو ليس لديه صلاحيات المسؤول
    redirect('../index.php');
    exit;
}

// إنشاء متغيرات للحقول
$username = '';
$email = '';
$full_name = '';
$role = 'client';
$is_active = 1;
$auto_generate_password = 1;
$password = '';

// مصفوفة لتخزين رسائل الخطأ
$errors = [];

// معالجة طلب إنشاء المستخدم
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $errors[] = 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    } else {
        // تنظيف وتحقق من البيانات المدخلة
        $username = cleanInput($_POST['username'] ?? '');
        $email = cleanInput($_POST['email'] ?? '');
        $full_name = cleanInput($_POST['full_name'] ?? '');
        $role = cleanInput($_POST['role'] ?? 'client');
        $is_active = isset($_POST['is_active']) ? 1 : 0;
        $auto_generate_password = isset($_POST['auto_generate_password']) ? 1 : 0;
        $password = $_POST['password'] ?? '';
        
        // التحقق من صحة البيانات
        if (empty($username)) {
            $errors[] = 'يرجى إدخال اسم المستخدم';
        } elseif (strlen($username) < 3 || strlen($username) > 50) {
            $errors[] = 'يجب أن يكون اسم المستخدم بين 3 و 50 حرف';
        } elseif (!preg_match('/^[a-zA-Z0-9_.\-]+$/', $username)) {
            $errors[] = 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام ورموز _ . - فقط';
        }
        
        if (empty($email)) {
            $errors[] = 'يرجى إدخال البريد الإلكتروني';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'البريد الإلكتروني غير صالح';
        }
        
        if ($role != 'admin' && $role != 'client') {
            $errors[] = 'الدور غير صالح';
        }
        
        // التحقق من كلمة المرور إذا لم يتم اختيار توليد كلمة مرور تلقائية
        if (!$auto_generate_password) {
            if (empty($password)) {
                $errors[] = 'يرجى إدخال كلمة المرور';
            } elseif (strlen($password) < 8) {
                $errors[] = 'يجب أن تكون كلمة المرور 8 أحرف على الأقل';
            }
        } else {
            // توليد كلمة مرور عشوائية إذا تم اختيار ذلك
            $password = generateRandomPassword();
        }
        
        // التحقق مما إذا كان اسم المستخدم موجودًا بالفعل
        if (!empty($username) && isUsernameExists($username)) {
            $errors[] = 'اسم المستخدم موجود بالفعل. يرجى اختيار اسم آخر.';
        }
        
        // التحقق مما إذا كان البريد الإلكتروني موجودًا بالفعل
        if (!empty($email) && isEmailExists($email)) {
            $errors[] = 'البريد الإلكتروني موجود بالفعل. يرجى استخدام بريد إلكتروني آخر.';
        }
        
        // إذا لم تكن هناك أخطاء، قم بإنشاء المستخدم
        if (empty($errors)) {
            // تشفير كلمة المرور
            $hashed_password = password_hash($password, PASSWORD_BCRYPT);
            
            // إدخال بيانات المستخدم في قاعدة البيانات
            if (createUser($username, $hashed_password, $email, $full_name, $role, $is_active)) {
                // تسجيل النشاط
                logAdminActivity("إنشاء مستخدم جديد: {$username}");
                
                // إعادة التوجيه إلى صفحة إدارة المستخدمين مع رسالة نجاح
                setFlashMessage('success', 'تم إنشاء المستخدم بنجاح' . ($auto_generate_password ? ' مع كلمة المرور: ' . $password : ''));
                redirect('users.php');
                exit;
            } else {
                $errors[] = 'حدث خطأ أثناء إنشاء المستخدم. يرجى المحاولة مرة أخرى.';
            }
        }
    }
}

// إنشاء رمز CSRF جديد
$csrf_token = generateCsrfToken();

/**
 * دالة للتحقق من وجود اسم المستخدم في قاعدة البيانات
 * 
 * @param string $username اسم المستخدم المراد التحقق منه
 * @return bool عودة صحيح إذا كان الاسم موجودًا، خطأ إذا لم يكن موجودًا
 */
function isUsernameExists($username) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = :username");
        $stmt->bindParam(':username', $username);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        error_log("خطأ في التحقق من اسم المستخدم: " . $e->getMessage());
        return false;
    }
}

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
 * دالة لإنشاء مستخدم جديد في قاعدة البيانات
 * 
 * @param string $username اسم المستخدم
 * @param string $password كلمة المرور المشفرة
 * @param string $email البريد الإلكتروني
 * @param string $full_name الاسم الكامل
 * @param string $role دور المستخدم (admin أو client)
 * @param int $is_active حالة نشاط المستخدم (1=نشط، 0=غير نشط)
 * @return bool عودة صحيح إذا تم الإنشاء بنجاح، خطأ إذا حدث خطأ
 */
function createUser($username, $password, $email, $full_name, $role, $is_active) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO users (username, password, email, full_name, role, is_active, created_at) 
            VALUES (:username, :password, :email, :full_name, :role, :is_active, NOW())
        ");
        
        $stmt->bindParam(':username', $username);
        $stmt->bindParam(':password', $password);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':full_name', $full_name);
        $stmt->bindParam(':role', $role);
        $stmt->bindParam(':is_active', $is_active);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في إنشاء مستخدم جديد: " . $e->getMessage());
        return false;
    }
}

/**
 * دالة لتوليد كلمة مرور عشوائية
 * 
 * @param int $length طول كلمة المرور (افتراضيًا 10)
 * @return string كلمة المرور العشوائية
 */
function generateRandomPassword($length = 10) {
    // تعريف الأحرف المسموح بها في كلمة المرور
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_-+=';
    $password = '';
    
    // توليد كلمة المرور باختيار أحرف عشوائية
    for ($i = 0; $i < $length; $i++) {
        $index = rand(0, strlen($characters) - 1);
        $password .= $characters[$index];
    }
    
    return $password;
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إضافة مستخدم جديد - نظام الدردشة المشفر</title>
    
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
                    <h1 class="h2">إضافة مستخدم جديد</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <a href="users.php" class="btn btn-sm btn-outline-secondary">
                            <i class="fas fa-arrow-right ms-1"></i> العودة إلى قائمة المستخدمين
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
                
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-user-plus me-1"></i> معلومات المستخدم الجديد
                    </div>
                    <div class="card-body">
                        <form action="" method="POST" id="userForm">
                            <!-- رمز CSRF للحماية -->
                            <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="username" class="form-label">اسم المستخدم <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="username" name="username" 
                                        value="<?php echo htmlspecialchars($username); ?>" required>
                                    <div class="form-text">اسم المستخدم يجب أن يكون فريدًا ويتراوح بين 3 و 50 حرف.</div>
                                </div>
                                
                                <div class="col-md-6">
                                    <label for="email" class="form-label">البريد الإلكتروني <span class="text-danger">*</span></label>
                                    <input type="email" class="form-control" id="email" name="email" 
                                        value="<?php echo htmlspecialchars($email); ?>" required>
                                    <div class="form-text">البريد الإلكتروني يجب أن يكون صالحًا وفريدًا.</div>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="full_name" class="form-label">الاسم الكامل</label>
                                    <input type="text" class="form-control" id="full_name" name="full_name" 
                                        value="<?php echo htmlspecialchars($full_name); ?>">
                                    <div class="form-text">الاسم الكامل للمستخدم (اختياري).</div>
                                </div>
                                
                                <div class="col-md-6">
                                    <label for="role" class="form-label">الدور <span class="text-danger">*</span></label>
                                    <select class="form-select" id="role" name="role" required>
                                        <option value="client" <?php echo ($role == 'client') ? 'selected' : ''; ?>>مستخدم عادي</option>
                                        <option value="admin" <?php echo ($role == 'admin') ? 'selected' : ''; ?>>مسؤول</option>
                                    </select>
                                    <div class="form-text">دور المستخدم يحدد صلاحياته في النظام.</div>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="is_active" name="is_active" <?php echo $is_active ? 'checked' : ''; ?>>
                                        <label class="form-check-label" for="is_active">تفعيل الحساب</label>
                                    </div>
                                    <div class="form-text">إذا تم تفعيل الحساب، يمكن للمستخدم تسجيل الدخول. إذا لم يتم تفعيله، لن يتمكن من الوصول إلى النظام.</div>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="auto_generate_password" name="auto_generate_password" <?php echo $auto_generate_password ? 'checked' : ''; ?>>
                                        <label class="form-check-label" for="auto_generate_password">توليد كلمة مرور تلقائيًا</label>
                                    </div>
                                    <div class="form-text">إذا تم تحديد هذا الخيار، سيتم إنشاء كلمة مرور عشوائية وإظهارها بعد إنشاء الحساب.</div>
                                </div>
                            </div>
                            
                            <div class="row mb-3" id="passwordField" <?php echo $auto_generate_password ? 'style="display:none;"' : ''; ?>>
                                <div class="col-md-6">
                                    <label for="password" class="form-label">كلمة المرور <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <input type="password" class="form-control" id="password" name="password" value="<?php echo htmlspecialchars($password); ?>">
                                        <button class="btn btn-outline-secondary" type="button" id="togglePassword">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                    <div class="form-text">كلمة المرور يجب أن تكون 8 أحرف على الأقل.</div>
                                </div>
                                
                                <div class="col-md-6">
                                    <label for="password_confirm" class="form-label">تأكيد كلمة المرور <span class="text-danger">*</span></label>
                                    <input type="password" class="form-control" id="password_confirm">
                                    <div class="form-text">يجب أن تتطابق مع كلمة المرور.</div>
                                </div>
                            </div>
                            
                            <div class="row mt-4">
                                <div class="col-md-12 text-start">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save me-1"></i> إنشاء المستخدم
                                    </button>
                                    <a href="users.php" class="btn btn-secondary">
                                        <i class="fas fa-times me-1"></i> إلغاء
                                    </a>
                                </div>
                            </div>
                        </form>
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
    
    <!-- سكريبت للتعامل مع النموذج -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // استهداف النموذج والحقول
            const form = document.getElementById('userForm');
            const autoGeneratePasswordCheckbox = document.getElementById('auto_generate_password');
            const passwordField = document.getElementById('passwordField');
            const passwordInput = document.getElementById('password');
            const passwordConfirmInput = document.getElementById('password_confirm');
            const togglePasswordButton = document.getElementById('togglePassword');
            
            // تبديل عرض حقل كلمة المرور استنادًا إلى حالة التوليد التلقائي
            autoGeneratePasswordCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    passwordField.style.display = 'none';
                    passwordInput.required = false;
                    passwordConfirmInput.required = false;
                } else {
                    passwordField.style.display = 'flex';
                    passwordInput.required = true;
                    passwordConfirmInput.required = true;
                }
            });
            
            // تبديل عرض كلمة المرور (إظهار/إخفاء)
            togglePasswordButton.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const icon = this.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
            
            // التحقق من النموذج قبل الإرسال
            form.addEventListener('submit', function(event) {
                let isValid = true;
                
                // التحقق من اسم المستخدم
                const usernameInput = document.getElementById('username');
                if (!usernameInput.value.trim()) {
                    isValid = false;
                    usernameInput.classList.add('is-invalid');
                    showValidationError(usernameInput, 'يرجى إدخال اسم المستخدم');
                } else if (usernameInput.value.length < 3 || usernameInput.value.length > 50) {
                    isValid = false;
                    usernameInput.classList.add('is-invalid');
                    showValidationError(usernameInput, 'يجب أن يكون اسم المستخدم بين 3 و 50 حرف');
                } else if (!(/^[a-zA-Z0-9_.\-]+$/).test(usernameInput.value)) {
                    isValid = false;
                    usernameInput.classList.add('is-invalid');
                    showValidationError(usernameInput, 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام ورموز _ . - فقط');
                } else {
                    usernameInput.classList.remove('is-invalid');
                    usernameInput.classList.add('is-valid');
                }
                
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
                
                // التحقق من كلمة المرور إذا لم يتم اختيار التوليد التلقائي
                if (!autoGeneratePasswordCheckbox.checked) {
                    if (!passwordInput.value) {
                        isValid = false;
                        passwordInput.classList.add('is-invalid');
                        showValidationError(passwordInput, 'يرجى إدخال كلمة المرور');
                    } else if (passwordInput.value.length < 8) {
                        isValid = false;
                        passwordInput.classList.add('is-invalid');
                        showValidationError(passwordInput, 'يجب أن تكون كلمة المرور 8 أحرف على الأقل');
                    } else {
                        passwordInput.classList.remove('is-invalid');
                        passwordInput.classList.add('is-valid');
                    }
                    
                    // التحقق من تطابق كلمة المرور
                    if (passwordInput.value !== passwordConfirmInput.value) {
                        isValid = false;
                        passwordConfirmInput.classList.add('is-invalid');
                        showValidationError(passwordConfirmInput, 'كلمات المرور غير متطابقة');
                    } else if (passwordInput.value) {
                        passwordConfirmInput.classList.remove('is-invalid');
                        passwordConfirmInput.classList.add('is-valid');
                    }
                }
                
                // منع إرسال النموذج إذا كان هناك أخطاء
                if (!isValid) {
                    event.preventDefault();
                }
            });
            
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
                if (inputElement.parentNode.classList.contains('input-group')) {
                    inputElement.parentNode.parentNode.appendChild(feedback);
                } else {
                    inputElement.parentNode.appendChild(feedback);
                }
            }
            
            // إزالة تنسيقات التحقق عند تغيير قيمة الحقول
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('input', function() {
                    this.classList.remove('is-invalid');
                    this.classList.remove('is-valid');
                    
                    // إزالة رسائل الخطأ
                    const parent = this.parentNode.classList.contains('input-group') ? this.parentNode.parentNode : this.parentNode;
                    const feedback = parent.querySelector('.invalid-feedback');
                    if (feedback) {
                        feedback.remove();
                    }
                });
            });
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الوظائف الرئيسية**:
   - إنشاء نموذج لإدخال بيانات المستخدم الجديد
   - التحقق من صحة البيانات المدخلة (في الخادم والمتصفح)
   - خيار لتوليد كلمة مرور عشوائية تلقائيًا
   - تخزين بيانات المستخدم في قاعدة البيانات مع تشفير كلمة المرور

2. **ميزات الأمان**:
   - التحقق من تسجيل الدخول وصلاحيات المسؤول
   - التحقق من رمز CSRF لمنع هجمات تزوير الطلبات
   - تنظيف المدخلات لمنع هجمات XSS
   - استخدام Prepared Statements لمنع هجمات SQL Injection
   - تشفير كلمات المرور باستخدام خوارزمية Bcrypt
   - التحقق من فريدية اسم المستخدم والبريد الإلكتروني

3. **متطلبات الصفحة**:
   - ملفات التكوين (config.php)
   - ملفات الدوال المساعدة (auth_functions.php, admin_functions.php, general_functions.php)
   - Bootstrap RTL للتصميم المستجيب ودعم اللغة العربية
   - Font Awesome للأيقونات
   - القائمة الجانبية للوحة تحكم المسؤول (admin_sidebar.php)
   - JavaScript للتحقق من صحة النموذج وتحسين تجربة المستخدم

4. **التحقق من الصحة**:
   - التحقق من اسم المستخدم (غير فارغ، الطول بين 3 و 50 حرف، الأحرف المسموح بها، غير مكرر)
   - التحقق من البريد الإلكتروني (غير فارغ، صيغة صحيحة، غير مكرر)
   - التحقق من الدور (admin أو client)
   - التحقق من كلمة المرور (طول 8 أحرف على الأقل، تطابق التأكيد)
   - عرض رسائل خطأ واضحة في حالة وجود مشاكل
