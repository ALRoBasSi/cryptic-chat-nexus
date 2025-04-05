
# صفحة إعدادات النظام

**الوصف**: صفحة إعدادات النظام للمسؤول، تتيح تعديل الإعدادات العامة للنظام وخيارات التشفير والأمان.

**المسار**: `/pages/admin/settings.php`

## الكود الكامل

```php
<?php
/**
 * صفحة إعدادات النظام
 * تتيح للمسؤول تعديل الإعدادات العامة للنظام وخيارات التشفير والأمان
 */

// تضمين ملفات التكوين والدوال
require_once '../../includes/config.php';
require_once '../../includes/auth_functions.php';
require_once '../../includes/admin_functions.php';
require_once '../../includes/general_functions.php';

// بدء الجلسة والتحقق من تسجيل الدخول وصلاحيات المسؤول
session_start();
checkLogin();
checkAdmin();

// الحصول على الإعدادات الحالية
$settings = getSystemSettings();

// تعريف متغيرات الخطأ والنجاح
$errors = [];
$success = false;

// معالجة طلب حفظ الإعدادات
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // التحقق من رمز CSRF للحماية من هجمات CSRF
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        $errors[] = 'خطأ في التحقق من أمان النموذج. يرجى المحاولة مرة أخرى.';
    } else {
        // جمع البيانات من النموذج
        $new_settings = [
            // إعدادات عامة
            'site_name' => cleanInput($_POST['site_name'] ?? ''),
            'site_description' => cleanInput($_POST['site_description'] ?? ''),
            'admin_email' => cleanInput($_POST['admin_email'] ?? ''),
            'enable_registration' => isset($_POST['enable_registration']) ? 1 : 0,
            
            // إعدادات الدردشة
            'max_messages_per_user' => (int) cleanInput($_POST['max_messages_per_user'] ?? 100),
            'messages_pagination_limit' => (int) cleanInput($_POST['messages_pagination_limit'] ?? 50),
            'enable_file_sharing' => isset($_POST['enable_file_sharing']) ? 1 : 0,
            'allowed_file_types' => cleanInput($_POST['allowed_file_types'] ?? 'jpg,jpeg,png,gif,pdf,doc,docx'),
            'max_file_size' => (int) cleanInput($_POST['max_file_size'] ?? 2),
            
            // إعدادات الأمان والتشفير
            'password_min_length' => (int) cleanInput($_POST['password_min_length'] ?? 8),
            'encryption_method' => cleanInput($_POST['encryption_method'] ?? 'aes-256-cbc'),
            'session_lifetime' => (int) cleanInput($_POST['session_lifetime'] ?? 120),
            'max_login_attempts' => (int) cleanInput($_POST['max_login_attempts'] ?? 5),
            'lockout_time' => (int) cleanInput($_POST['lockout_time'] ?? 15),
            'enforce_https' => isset($_POST['enforce_https']) ? 1 : 0,
            
            // إعدادات الظهور
            'theme' => cleanInput($_POST['theme'] ?? 'default'),
            'language' => cleanInput($_POST['language'] ?? 'ar'),
            'time_format' => cleanInput($_POST['time_format'] ?? 'H:i:s'),
            'date_format' => cleanInput($_POST['date_format'] ?? 'Y-m-d'),
        ];
        
        // التحقق من صحة البيانات
        if (empty($new_settings['site_name'])) {
            $errors[] = 'اسم الموقع مطلوب';
        }
        
        if (!empty($new_settings['admin_email']) && !filter_var($new_settings['admin_email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'البريد الإلكتروني للمسؤول غير صالح';
        }
        
        if ($new_settings['max_messages_per_user'] < 1) {
            $errors[] = 'يجب أن يكون الحد الأقصى للرسائل لكل مستخدم أكبر من صفر';
        }
        
        if ($new_settings['messages_pagination_limit'] < 10 || $new_settings['messages_pagination_limit'] > 100) {
            $errors[] = 'يجب أن يكون حد الصفحات للرسائل بين 10 و 100';
        }
        
        if ($new_settings['password_min_length'] < 6) {
            $errors[] = 'يجب أن يكون الحد الأدنى لطول كلمة المرور 6 أحرف على الأقل';
        }
        
        if ($new_settings['session_lifetime'] < 10) {
            $errors[] = 'يجب أن تكون مدة الجلسة 10 دقائق على الأقل';
        }
        
        // إذا لم تكن هناك أخطاء، قم بحفظ الإعدادات
        if (empty($errors)) {
            if (saveSystemSettings($new_settings)) {
                $success = true;
                $settings = $new_settings; // تحديث الإعدادات المعروضة
            } else {
                $errors[] = 'حدث خطأ أثناء حفظ الإعدادات';
            }
        }
    }
}

// إنشاء رمز CSRF جديد
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إعدادات النظام - نظام الدردشة المشفر</title>
    
    <!-- Bootstrap RTL CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- ملف CSS الخاص بالنظام -->
    <link rel="stylesheet" href="../../assets/css/admin.css">
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- تضمين القائمة الجانبية -->
            <?php include '../../includes/admin_sidebar.php'; ?>
            
            <!-- المحتوى الرئيسي -->
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2"><i class="fas fa-cogs me-2"></i>إعدادات النظام</h1>
                </div>
                
                <!-- عرض رسائل النجاح والخطأ -->
                <?php if ($success): ?>
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        <i class="fas fa-check-circle me-1"></i> تم حفظ الإعدادات بنجاح!
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
                    </div>
                <?php endif; ?>
                
                <?php if (!empty($errors)): ?>
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <ul class="mb-0">
                            <?php foreach ($errors as $error): ?>
                                <li><?php echo $error; ?></li>
                            <?php endforeach; ?>
                        </ul>
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
                    </div>
                <?php endif; ?>
                
                <!-- نموذج الإعدادات -->
                <form method="POST" action="" class="needs-validation" novalidate>
                    <!-- رمز CSRF -->
                    <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">
                    
                    <!-- علامات التبويب -->
                    <div class="card mb-4">
                        <div class="card-header bg-white">
                            <ul class="nav nav-tabs card-header-tabs" id="settingsTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="general-tab" data-bs-toggle="tab" data-bs-target="#general" type="button" role="tab" aria-controls="general" aria-selected="true">
                                        <i class="fas fa-sliders-h me-1"></i> إعدادات عامة
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="chat-tab" data-bs-toggle="tab" data-bs-target="#chat" type="button" role="tab" aria-controls="chat" aria-selected="false">
                                        <i class="fas fa-comments me-1"></i> إعدادات الدردشة
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="security-tab" data-bs-toggle="tab" data-bs-target="#security" type="button" role="tab" aria-controls="security" aria-selected="false">
                                        <i class="fas fa-shield-alt me-1"></i> الأمان والتشفير
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="appearance-tab" data-bs-toggle="tab" data-bs-target="#appearance" type="button" role="tab" aria-controls="appearance" aria-selected="false">
                                        <i class="fas fa-palette me-1"></i> المظهر
                                    </button>
                                </li>
                            </ul>
                        </div>
                        <div class="card-body">
                            <div class="tab-content" id="settingsTabsContent">
                                <!-- الإعدادات العامة -->
                                <div class="tab-pane fade show active" id="general" role="tabpanel" aria-labelledby="general-tab">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="site_name" class="form-label">اسم الموقع <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="site_name" name="site_name" value="<?php echo htmlspecialchars($settings['site_name'] ?? 'نظام الدردشة المشفر'); ?>" required>
                                            <div class="form-text">اسم النظام الذي سيظهر في العنوان والترويسة.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="admin_email" class="form-label">البريد الإلكتروني للمسؤول</label>
                                            <input type="email" class="form-control" id="admin_email" name="admin_email" value="<?php echo htmlspecialchars($settings['admin_email'] ?? ''); ?>">
                                            <div class="form-text">سيتم استخدامه لإرسال إشعارات النظام وتنبيهات الأمان.</div>
                                        </div>
                                        
                                        <div class="col-md-12 mb-3">
                                            <label for="site_description" class="form-label">وصف الموقع</label>
                                            <textarea class="form-control" id="site_description" name="site_description" rows="3"><?php echo htmlspecialchars($settings['site_description'] ?? 'نظام دردشة آمن ومشفر مع نظام صلاحيات RBAC'); ?></textarea>
                                            <div class="form-text">وصف موجز للنظام.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="enable_registration" name="enable_registration" <?php echo isset($settings['enable_registration']) && $settings['enable_registration'] ? 'checked' : ''; ?>>
                                                <label class="form-check-label" for="enable_registration">تفعيل التسجيل للمستخدمين الجدد</label>
                                            </div>
                                            <div class="form-text">إذا تم تعطيل هذا الخيار، سيمكن للمسؤولين فقط إنشاء حسابات جديدة.</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- إعدادات الدردشة -->
                                <div class="tab-pane fade" id="chat" role="tabpanel" aria-labelledby="chat-tab">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="max_messages_per_user" class="form-label">الحد الأقصى للرسائل لكل مستخدم</label>
                                            <input type="number" class="form-control" id="max_messages_per_user" name="max_messages_per_user" value="<?php echo (int) ($settings['max_messages_per_user'] ?? 100); ?>" min="1">
                                            <div class="form-text">الحد الأقصى لعدد الرسائل التي يمكن للمستخدم إرسالها في اليوم الواحد (0 للسماح بعدد غير محدود).</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="messages_pagination_limit" class="form-label">عدد الرسائل في الصفحة الواحدة</label>
                                            <input type="number" class="form-control" id="messages_pagination_limit" name="messages_pagination_limit" value="<?php echo (int) ($settings['messages_pagination_limit'] ?? 50); ?>" min="10" max="100">
                                            <div class="form-text">عدد الرسائل التي سيتم عرضها في الصفحة الواحدة (10-100).</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="enable_file_sharing" name="enable_file_sharing" <?php echo isset($settings['enable_file_sharing']) && $settings['enable_file_sharing'] ? 'checked' : ''; ?>>
                                                <label class="form-check-label" for="enable_file_sharing">تفعيل مشاركة الملفات</label>
                                            </div>
                                            <div class="form-text">السماح للمستخدمين بمشاركة الملفات في غرف الدردشة.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="max_file_size" class="form-label">الحد الأقصى لحجم الملف (ميجابايت)</label>
                                            <input type="number" class="form-control" id="max_file_size" name="max_file_size" value="<?php echo (int) ($settings['max_file_size'] ?? 2); ?>" min="1">
                                            <div class="form-text">الحد الأقصى لحجم الملف المسموح به (بالميجابايت).</div>
                                        </div>
                                        
                                        <div class="col-md-12 mb-3">
                                            <label for="allowed_file_types" class="form-label">أنواع الملفات المسموح بها</label>
                                            <input type="text" class="form-control" id="allowed_file_types" name="allowed_file_types" value="<?php echo htmlspecialchars($settings['allowed_file_types'] ?? 'jpg,jpeg,png,gif,pdf,doc,docx'); ?>">
                                            <div class="form-text">امتدادات الملفات المسموح بها، مفصولة بفواصل (مثال: jpg,png,pdf).</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- الأمان والتشفير -->
                                <div class="tab-pane fade" id="security" role="tabpanel" aria-labelledby="security-tab">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="password_min_length" class="form-label">الحد الأدنى لطول كلمة المرور</label>
                                            <input type="number" class="form-control" id="password_min_length" name="password_min_length" value="<?php echo (int) ($settings['password_min_length'] ?? 8); ?>" min="6">
                                            <div class="form-text">الحد الأدنى لعدد الأحرف المطلوبة في كلمة المرور.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="encryption_method" class="form-label">طريقة التشفير</label>
                                            <select class="form-select" id="encryption_method" name="encryption_method">
                                                <option value="aes-128-cbc" <?php echo isset($settings['encryption_method']) && $settings['encryption_method'] === 'aes-128-cbc' ? 'selected' : ''; ?>>AES-128-CBC</option>
                                                <option value="aes-256-cbc" <?php echo !isset($settings['encryption_method']) || $settings['encryption_method'] === 'aes-256-cbc' ? 'selected' : ''; ?>>AES-256-CBC (موصى به)</option>
                                                <option value="aes-256-gcm" <?php echo isset($settings['encryption_method']) && $settings['encryption_method'] === 'aes-256-gcm' ? 'selected' : ''; ?>>AES-256-GCM</option>
                                            </select>
                                            <div class="form-text">طريقة التشفير المستخدمة لتشفير محتوى الرسائل.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="session_lifetime" class="form-label">مدة الجلسة (دقائق)</label>
                                            <input type="number" class="form-control" id="session_lifetime" name="session_lifetime" value="<?php echo (int) ($settings['session_lifetime'] ?? 120); ?>" min="10">
                                            <div class="form-text">مدة صلاحية جلسة المستخدم بالدقائق قبل أن يتم تسجيل الخروج تلقائياً.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="max_login_attempts" class="form-label">الحد الأقصى لمحاولات تسجيل الدخول</label>
                                            <input type="number" class="form-control" id="max_login_attempts" name="max_login_attempts" value="<?php echo (int) ($settings['max_login_attempts'] ?? 5); ?>" min="3">
                                            <div class="form-text">عدد محاولات تسجيل الدخول الفاشلة قبل قفل الحساب مؤقتاً.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="lockout_time" class="form-label">مدة قفل الحساب (دقائق)</label>
                                            <input type="number" class="form-control" id="lockout_time" name="lockout_time" value="<?php echo (int) ($settings['lockout_time'] ?? 15); ?>" min="5">
                                            <div class="form-text">المدة التي سيتم قفل الحساب خلالها بعد تجاوز الحد الأقصى لمحاولات تسجيل الدخول.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="enforce_https" name="enforce_https" <?php echo isset($settings['enforce_https']) && $settings['enforce_https'] ? 'checked' : ''; ?>>
                                                <label class="form-check-label" for="enforce_https">فرض استخدام HTTPS</label>
                                            </div>
                                            <div class="form-text">إعادة توجيه جميع الطلبات إلى HTTPS لضمان اتصال آمن (يتطلب شهادة SSL).</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- إعدادات المظهر -->
                                <div class="tab-pane fade" id="appearance" role="tabpanel" aria-labelledby="appearance-tab">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="theme" class="form-label">السمة</label>
                                            <select class="form-select" id="theme" name="theme">
                                                <option value="default" <?php echo !isset($settings['theme']) || $settings['theme'] === 'default' ? 'selected' : ''; ?>>الافتراضية</option>
                                                <option value="dark" <?php echo isset($settings['theme']) && $settings['theme'] === 'dark' ? 'selected' : ''; ?>>الوضع الداكن</option>
                                                <option value="light" <?php echo isset($settings['theme']) && $settings['theme'] === 'light' ? 'selected' : ''; ?>>الوضع الفاتح</option>
                                                <option value="custom" <?php echo isset($settings['theme']) && $settings['theme'] === 'custom' ? 'selected' : ''; ?>>مخصصة</option>
                                            </select>
                                            <div class="form-text">سمة النظام المستخدمة في جميع الصفحات.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="language" class="form-label">اللغة الافتراضية</label>
                                            <select class="form-select" id="language" name="language">
                                                <option value="ar" <?php echo !isset($settings['language']) || $settings['language'] === 'ar' ? 'selected' : ''; ?>>العربية</option>
                                                <option value="en" <?php echo isset($settings['language']) && $settings['language'] === 'en' ? 'selected' : ''; ?>>الإنجليزية</option>
                                            </select>
                                            <div class="form-text">اللغة الافتراضية للنظام.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="date_format" class="form-label">تنسيق التاريخ</label>
                                            <select class="form-select" id="date_format" name="date_format">
                                                <option value="Y-m-d" <?php echo !isset($settings['date_format']) || $settings['date_format'] === 'Y-m-d' ? 'selected' : ''; ?>>2023-01-31</option>
                                                <option value="d/m/Y" <?php echo isset($settings['date_format']) && $settings['date_format'] === 'd/m/Y' ? 'selected' : ''; ?>>31/01/2023</option>
                                                <option value="d-m-Y" <?php echo isset($settings['date_format']) && $settings['date_format'] === 'd-m-Y' ? 'selected' : ''; ?>>31-01-2023</option>
                                                <option value="j F, Y" <?php echo isset($settings['date_format']) && $settings['date_format'] === 'j F, Y' ? 'selected' : ''; ?>>31 يناير، 2023</option>
                                            </select>
                                            <div class="form-text">تنسيق عرض التاريخ في جميع أنحاء النظام.</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="time_format" class="form-label">تنسيق الوقت</label>
                                            <select class="form-select" id="time_format" name="time_format">
                                                <option value="H:i:s" <?php echo !isset($settings['time_format']) || $settings['time_format'] === 'H:i:s' ? 'selected' : ''; ?>>14:30:00 (24 ساعة)</option>
                                                <option value="h:i:s A" <?php echo isset($settings['time_format']) && $settings['time_format'] === 'h:i:s A' ? 'selected' : ''; ?>>02:30:00 PM (12 ساعة)</option>
                                                <option value="H:i" <?php echo isset($settings['time_format']) && $settings['time_format'] === 'H:i' ? 'selected' : ''; ?>>14:30 (24 ساعة)</option>
                                                <option value="h:i A" <?php echo isset($settings['time_format']) && $settings['time_format'] === 'h:i A' ? 'selected' : ''; ?>>02:30 PM (12 ساعة)</option>
                                            </select>
                                            <div class="form-text">تنسيق عرض الوقت في جميع أنحاء النظام.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer bg-white">
                            <div class="d-flex justify-content-between">
                                <button type="reset" class="btn btn-outline-secondary">إعادة تعيين</button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save me-1"></i> حفظ الإعدادات
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
                
                <!-- تذييل الصفحة -->
                <footer class="mt-5">
                    <div class="text-center">
                        <p class="text-muted small">
                            &copy; <?php echo date('Y'); ?> نظام الدردشة المشفر - جميع الحقوق محفوظة
                        </p>
                    </div>
                </footer>
            </main>
        </div>
    </div>
    
    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- سكريبت للتحقق من صحة النموذج -->
    <script>
        // سكريبت للتحقق من صحة النموذج
        document.addEventListener('DOMContentLoaded', function() {
            const forms = document.querySelectorAll('.needs-validation');
            
            Array.from(forms).forEach(form => {
                form.addEventListener('submit', event => {
                    if (!form.checkValidity()) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    
                    form.classList.add('was-validated');
                }, false);
            });
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **ملفات الدوال المطلوبة**:
   - `includes/admin_functions.php`: يحتوي على دوال خاصة بالإعدادات مثل:
     - `getSystemSettings()`: لجلب إعدادات النظام من قاعدة البيانات
     - `saveSystemSettings()`: لحفظ إعدادات النظام في قاعدة البيانات
   
   - `includes/general_functions.php`: يحتوي على دوال عامة مثل:
     - `cleanInput()`: لتنظيف المدخلات من الأكواد الضارة
     - `displayFlashMessages()`: لعرض رسائل النظام

2. **ملفات القوالب**:
   - `includes/admin_sidebar.php`: قالب القائمة الجانبية للمسؤول

3. **ملاحظات مهمة**:
   - تم تنظيم الإعدادات في علامات تبويب لتسهيل الاستخدام.
   - تم إضافة تحقق من رمز CSRF لمنع هجمات CSRF.
   - تم التحقق من صحة المدخلات قبل حفظها.
   - تم تضمين وصف توضيحي لكل إعداد تحته مباشرة.

4. **الحماية والأمان**:
   - التحقق من رمز CSRF في النموذج.
   - تنظيف المدخلات لمنع هجمات XSS.
   - التحقق من صلاحيات المسؤول قبل عرض الصفحة.
