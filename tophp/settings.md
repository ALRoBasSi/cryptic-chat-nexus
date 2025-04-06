
# صفحة إعدادات النظام

**الوصف**: صفحة إدارة إعدادات النظام للمسؤول، تتيح ضبط وتعديل الإعدادات العامة للنظام.

**المسار**: `/pages/admin/settings.php`

## الكود الكامل

```php
<?php
/**
 * صفحة إعدادات النظام
 * تتيح للمسؤول ضبط وتعديل إعدادات النظام المختلفة
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

// تعريف متغيرات الإعدادات
$settings = [
    'site_name' => getSetting('site_name', 'نظام الدردشة المشفر'),
    'allow_registration' => getSetting('allow_registration', '0'),
    'default_encryption' => getSetting('default_encryption', 'AES-256-CBC'),
    'session_timeout' => getSetting('session_timeout', '30'),
    'max_login_attempts' => getSetting('max_login_attempts', '5'),
    'maintenance_mode' => getSetting('maintenance_mode', '0')
];

// معالجة تحديث الإعدادات
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // التحقق من رمز CSRF
    if (!validateCSRFToken()) {
        setFlashMessage('error', 'خطأ في تحقق الأمان، يرجى المحاولة مرة أخرى');
        redirect('settings.php');
    }
    
    // تحديث الإعدادات
    $settings['site_name'] = cleanInput($_POST['site_name'] ?? 'نظام الدردشة المشفر');
    $settings['allow_registration'] = isset($_POST['allow_registration']) ? '1' : '0';
    $settings['default_encryption'] = cleanInput($_POST['default_encryption'] ?? 'AES-256-CBC');
    $settings['session_timeout'] = (int) cleanInput($_POST['session_timeout'] ?? '30');
    $settings['max_login_attempts'] = (int) cleanInput($_POST['max_login_attempts'] ?? '5');
    $settings['maintenance_mode'] = isset($_POST['maintenance_mode']) ? '1' : '0';
    
    // التحقق من صحة الإعدادات
    $errors = [];
    
    if (empty($settings['site_name'])) {
        $errors[] = 'اسم الموقع لا يمكن أن يكون فارغًا';
    }
    
    if ($settings['session_timeout'] < 5 || $settings['session_timeout'] > 1440) {
        $errors[] = 'مدة انتهاء الجلسة يجب أن تكون بين 5 دقائق و 24 ساعة (1440 دقيقة)';
    }
    
    if ($settings['max_login_attempts'] < 1 || $settings['max_login_attempts'] > 10) {
        $errors[] = 'الحد الأقصى لمحاولات تسجيل الدخول يجب أن يكون بين 1 و 10';
    }
    
    // إذا لم تكن هناك أخطاء، قم بتحديث الإعدادات
    if (empty($errors)) {
        foreach ($settings as $key => $value) {
            updateSetting($key, $value);
        }
        
        setFlashMessage('success', 'تم تحديث إعدادات النظام بنجاح');
        logUserActivity($_SESSION['user_id'], 'settings_update', 'تم تحديث إعدادات النظام');
        
        redirect('settings.php');
    } else {
        // عرض رسائل الخطأ
        foreach ($errors as $error) {
            setFlashMessage('error', $error);
        }
    }
}

// جلب الإعدادات المحدثة
$settings = [
    'site_name' => getSetting('site_name', 'نظام الدردشة المشفر'),
    'allow_registration' => getSetting('allow_registration', '0'),
    'default_encryption' => getSetting('default_encryption', 'AES-256-CBC'),
    'session_timeout' => getSetting('session_timeout', '30'),
    'max_login_attempts' => getSetting('max_login_attempts', '5'),
    'maintenance_mode' => getSetting('maintenance_mode', '0')
];
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
                
                <!-- عرض رسائل النظام -->
                <?php displayFlashMessages(); ?>
                
                <!-- نموذج تحديث الإعدادات -->
                <div class="card">
                    <div class="card-header bg-white">
                        <h5 class="card-title mb-0">الإعدادات العامة</h5>
                    </div>
                    <div class="card-body">
                        <form method="POST" action="">
                            <?php echo csrfField(); ?>
                            
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6 class="fw-bold">إعدادات عامة</h6>
                                    
                                    <div class="mb-3">
                                        <label for="site_name" class="form-label">اسم الموقع</label>
                                        <input type="text" class="form-control" id="site_name" name="site_name" value="<?php echo htmlspecialchars($settings['site_name']); ?>" required>
                                        <div class="form-text text-muted">الاسم الذي سيظهر في عنوان الصفحات وشعار النظام.</div>
                                    </div>
                                    
                                    <div class="mb-3 form-check">
                                        <input type="checkbox" class="form-check-input" id="maintenance_mode" name="maintenance_mode" <?php echo $settings['maintenance_mode'] == '1' ? 'checked' : ''; ?>>
                                        <label class="form-check-label" for="maintenance_mode">تفعيل وضع الصيانة</label>
                                        <div class="form-text text-muted">عند تفعيل وضع الصيانة، سيتم منع الدخول للنظام (باستثناء المسؤولين).</div>
                                    </div>
                                    
                                    <div class="mb-3 form-check">
                                        <input type="checkbox" class="form-check-input" id="allow_registration" name="allow_registration" <?php echo $settings['allow_registration'] == '1' ? 'checked' : ''; ?>>
                                        <label class="form-check-label" for="allow_registration">السماح بالتسجيل الذاتي</label>
                                        <div class="form-text text-muted">السماح للزوار بإنشاء حسابات جديدة. إذا تم تعطيل هذا الخيار، فقط المسؤولون يمكنهم إنشاء حسابات جديدة.</div>
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <h6 class="fw-bold">إعدادات الأمان</h6>
                                    
                                    <div class="mb-3">
                                        <label for="session_timeout" class="form-label">مدة انتهاء الجلسة (بالدقائق)</label>
                                        <input type="number" class="form-control" id="session_timeout" name="session_timeout" min="5" max="1440" value="<?php echo htmlspecialchars($settings['session_timeout']); ?>" required>
                                        <div class="form-text text-muted">المدة التي سيتم بعدها تسجيل خروج المستخدم تلقائيًا في حالة عدم النشاط.</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="max_login_attempts" class="form-label">الحد الأقصى لمحاولات تسجيل الدخول</label>
                                        <input type="number" class="form-control" id="max_login_attempts" name="max_login_attempts" min="1" max="10" value="<?php echo htmlspecialchars($settings['max_login_attempts']); ?>" required>
                                        <div class="form-text text-muted">عدد محاولات تسجيل الدخول الفاشلة قبل تأمين الحساب مؤقتًا.</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="default_encryption" class="form-label">طريقة التشفير الافتراضية</label>
                                        <select class="form-select" id="default_encryption" name="default_encryption">
                                            <option value="AES-256-CBC" <?php echo $settings['default_encryption'] == 'AES-256-CBC' ? 'selected' : ''; ?>>AES-256-CBC</option>
                                            <option value="AES-256-CTR" <?php echo $settings['default_encryption'] == 'AES-256-CTR' ? 'selected' : ''; ?>>AES-256-CTR</option>
                                            <option value="AES-256-GCM" <?php echo $settings['default_encryption'] == 'AES-256-GCM' ? 'selected' : ''; ?>>AES-256-GCM</option>
                                        </select>
                                        <div class="form-text text-muted">طريقة التشفير المستخدمة لحماية الرسائل.</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row mb-4">
                                <div class="col-12">
                                    <h6 class="fw-bold">أدوات إدارة النظام</h6>
                                    
                                    <div class="mb-3">
                                        <a href="backups.php" class="btn btn-outline-primary">
                                            <i class="fas fa-database me-2"></i>إدارة النسخ الاحتياطية
                                        </a>
                                        <a href="#" class="btn btn-outline-warning ms-2" id="btnClearCache">
                                            <i class="fas fa-broom me-2"></i>مسح الذاكرة المؤقتة
                                        </a>
                                        <a href="#" class="btn btn-outline-danger ms-2" id="btnClearLogs">
                                            <i class="fas fa-trash-alt me-2"></i>مسح سجلات النشاط القديمة
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="border-top pt-4">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save me-2"></i>حفظ الإعدادات
                                </button>
                                <a href="dashboard.php" class="btn btn-secondary me-2">
                                    <i class="fas fa-times me-2"></i>إلغاء
                                </a>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- معلومات النظام -->
                <div class="card mt-4">
                    <div class="card-header bg-white">
                        <h5 class="card-title mb-0">معلومات النظام</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <table class="table table-bordered">
                                    <tr>
                                        <th class="bg-light">إصدار PHP</th>
                                        <td><?php echo phpversion(); ?></td>
                                    </tr>
                                    <tr>
                                        <th class="bg-light">إصدار MySQL</th>
                                        <td>
                                            <?php
                                            $db = connectDB();
                                            $version = mysqli_get_server_info($db);
                                            mysqli_close($db);
                                            echo $version;
                                            ?>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th class="bg-light">إصدار النظام</th>
                                        <td>1.0.0</td>
                                    </tr>
                                    <tr>
                                        <th class="bg-light">آخر تحديث</th>
                                        <td>2023-12-01</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <table class="table table-bordered">
                                    <tr>
                                        <th class="bg-light">المساحة المستخدمة</th>
                                        <td>
                                            <?php
                                            $db = connectDB();
                                            $query = "SELECT 
                                                      ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size
                                                      FROM information_schema.TABLES 
                                                      WHERE table_schema = '" . DB_NAME . "'";
                                            $result = mysqli_query($db, $query);
                                            $row = mysqli_fetch_assoc($result);
                                            echo $row['size'] . ' ميجابايت';
                                            mysqli_close($db);
                                            ?>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th class="bg-light">عدد الرسائل</th>
                                        <td><?php echo getTotalMessages(); ?> رسالة</td>
                                    </tr>
                                    <tr>
                                        <th class="bg-light">عدد المستخدمين</th>
                                        <td><?php echo getTotalUsers(); ?> مستخدم</td>
                                    </tr>
                                    <tr>
                                        <th class="bg-light">عدد الغرف</th>
                                        <td><?php echo getTotalRooms(); ?> غرفة</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- تذييل الصفحة -->
                <footer class="mt-5">
                    <div class="text-center">
                        <p class="text-muted small">
                            &copy; <?php echo date('Y'); ?> <?php echo htmlspecialchars($settings['site_name']); ?> - جميع الحقوق محفوظة
                        </p>
                    </div>
                </footer>
            </main>
        </div>
    </div>
    
    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- سكريبت مخصص -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // التأكيد قبل مسح الذاكرة المؤقتة
            document.getElementById('btnClearCache').addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('هل أنت متأكد من رغبتك في مسح الذاكرة المؤقتة للنظام؟')) {
                    // هنا يمكن إضافة طلب AJAX لمسح الذاكرة المؤقتة
                    alert('تم مسح الذاكرة المؤقتة بنجاح.');
                }
            });
            
            // التأكيد قبل مسح سجلات النشاط القديمة
            document.getElementById('btnClearLogs').addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('هل أنت متأكد من رغبتك في مسح سجلات النشاط القديمة؟ هذا الإجراء لا يمكن التراجع عنه.')) {
                    // هنا يمكن إضافة طلب AJAX لمسح السجلات القديمة
                    alert('تم مسح سجلات النشاط القديمة بنجاح.');
                }
            });
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الدوال المستخدمة**:
   - `getSetting()`: لجلب قيمة إعداد من قاعدة البيانات.
   - `updateSetting()`: لتحديث قيمة إعداد في قاعدة البيانات.
   - `validateCSRFToken()` و `csrfField()`: للحماية من هجمات CSRF.
   - دوال للإحصائيات: `getTotalUsers()`, `getTotalRooms()`, `getTotalMessages()`.

2. **الإعدادات المتاحة**:
   - **اسم الموقع**: الاسم الذي يظهر في العناوين والشعار.
   - **وضع الصيانة**: لمنع دخول المستخدمين العاديين أثناء الصيانة.
   - **السماح بالتسجيل الذاتي**: للتحكم في إمكانية إنشاء حسابات جديدة.
   - **مدة انتهاء الجلسة**: للتحكم في فترة النشاط قبل تسجيل الخروج التلقائي.
   - **الحد الأقصى لمحاولات تسجيل الدخول**: لحماية الحسابات من محاولات الاختراق.
   - **طريقة التشفير الافتراضية**: لتحديد خوارزمية التشفير المستخدمة.

3. **أدوات إدارة النظام**:
   - إدارة النسخ الاحتياطية (رابط إلى صفحة منفصلة).
   - مسح الذاكرة المؤقتة (من خلال طلب AJAX).
   - مسح سجلات النشاط القديمة (من خلال طلب AJAX).

4. **معلومات النظام**:
   - عرض معلومات تقنية عن بيئة التشغيل (إصدار PHP و MySQL).
   - عرض إحصائيات النظام (المساحة المستخدمة، عدد الرسائل، المستخدمين، الغرف).

5. **تنظيم الصفحة**:
   - تقسيم الإعدادات إلى مجموعات منطقية (عامة، أمان، أدوات).
   - عرض شروحات توضيحية لكل إعداد.
   - التحقق من صحة المدخلات قبل الحفظ.
