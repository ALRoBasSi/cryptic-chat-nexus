
# صفحة تسجيل الدخول الرئيسية

**الوصف**: صفحة البداية للمستخدمين حيث يتم تسجيل الدخول للنظام.

**المسار**: `/index.php` (الملف الرئيسي في جذر المشروع)

## الكود الكامل

```php
<?php
/**
 * صفحة تسجيل الدخول الرئيسية
 * تُستخدم للتحقق من هوية المستخدم وتوجيهه إلى الصفحة المناسبة
 */

// تضمين ملف التكوين وملفات الدوال الأساسية
require_once 'includes/config.php';
require_once 'includes/auth_functions.php';
require_once 'includes/general_functions.php';

// بدء جلسة جديدة أو متابعة الجلسة الحالية
session_start();

// التحقق مما إذا كان المستخدم مسجل دخوله بالفعل
if (isLoggedIn()) {
    // توجيه المستخدم إلى الصفحة المناسبة حسب دوره
    if (isAdmin()) {
        redirect('pages/admin/dashboard.php');
    } else {
        redirect('pages/chat/rooms.php');
    }
}

// معالجة طلب تسجيل الدخول
$errors = [];
$username = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // تنظيف وتحقق من المدخلات
    $username = cleanInput($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    // التحقق من صحة البيانات
    if (empty($username)) {
        $errors[] = 'يرجى إدخال اسم المستخدم';
    }
    
    if (empty($password)) {
        $errors[] = 'يرجى إدخال كلمة المرور';
    }
    
    // إذا لم تكن هناك أخطاء، حاول تسجيل الدخول
    if (empty($errors)) {
        if (loginUser($username, $password)) {
            // توجيه المستخدم إلى الصفحة المناسبة بعد تسجيل الدخول
            if (isAdmin()) {
                redirect('pages/admin/dashboard.php');
            } else {
                redirect('pages/chat/rooms.php');
            }
        } else {
            $errors[] = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        }
    }
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسجيل الدخول - نظام الدردشة المشفر</title>
    
    <!-- Bootstrap RTL CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- ملف CSS الخاص بالنظام -->
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="bg-light">
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-5">
                <div class="card shadow">
                    <div class="card-body p-5">
                        <div class="text-center mb-4">
                            <img src="assets/images/logo.png" alt="شعار النظام" class="img-fluid mb-3" style="max-height: 100px;">
                            <h2 class="fw-bold text-primary">نظام الدردشة المشفر</h2>
                            <p class="text-muted">يرجى تسجيل الدخول للوصول إلى النظام</p>
                        </div>
                        
                        <?php if (!empty($errors)): ?>
                            <div class="alert alert-danger" role="alert">
                                <ul class="mb-0">
                                    <?php foreach ($errors as $error): ?>
                                        <li><?php echo $error; ?></li>
                                    <?php endforeach; ?>
                                </ul>
                            </div>
                        <?php endif; ?>
                        
                        <form method="POST" action="">
                            <div class="mb-3">
                                <label for="username" class="form-label">اسم المستخدم</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fas fa-user"></i></span>
                                    <input type="text" class="form-control" id="username" name="username" value="<?php echo htmlspecialchars($username); ?>" required>
                                </div>
                            </div>
                            
                            <div class="mb-4">
                                <label for="password" class="form-label">كلمة المرور</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                    <input type="password" class="form-control" id="password" name="password" required>
                                    <button class="btn btn-outline-secondary" type="button" id="togglePassword">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary btn-lg">تسجيل الدخول</button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="text-center mt-3">
                    <p class="text-muted small">
                        &copy; <?php echo date('Y'); ?> نظام الدردشة المشفر - جميع الحقوق محفوظة
                    </p>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- سكريبت لعرض/إخفاء كلمة المرور -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const togglePasswordButton = document.getElementById('togglePassword');
            const passwordInput = document.getElementById('password');
            
            togglePasswordButton.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const icon = this.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **ملفات الـ CSS**:
   - قم بإنشاء مجلد `assets/css` وأضف ملف `style.css` للأنماط المخصصة.

2. **ملفات الصور**:
   - قم بإنشاء مجلد `assets/images` وضع فيه شعار النظام `logo.png`.

3. **ملفات التكوين والدوال**:
   - تأكد من إنشاء الملفات المشار إليها في التضمينات:
     - `includes/config.php`
     - `includes/auth_functions.php`
     - `includes/general_functions.php`
