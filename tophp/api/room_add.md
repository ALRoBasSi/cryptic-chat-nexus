
# صفحة إضافة غرفة دردشة جديدة

**الوصف**: صفحة تتيح للمسؤول إنشاء غرفة دردشة جديدة في النظام.

**المسار**: `/pages/admin/room_add.php`

## الكود الكامل

```php
<?php
/**
 * صفحة إضافة غرفة دردشة جديدة
 * تتيح للمسؤول إنشاء غرفة جديدة وتحديد خصائصها
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

// إنشاء متغيرات للحقول
$name = '';
$description = '';
$is_active = 1;

// مصفوفة لتخزين رسائل الخطأ
$errors = [];

// معالجة طلب إنشاء الغرفة
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // التحقق من وجود رمز CSRF صالح
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $errors[] = 'خطأ في التحقق من الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    } else {
        // تنظيف وتحقق من البيانات المدخلة
        $name = cleanInput($_POST['name'] ?? '');
        $description = cleanInput($_POST['description'] ?? '');
        $is_active = isset($_POST['is_active']) ? 1 : 0;
        
        // التحقق من صحة البيانات
        if (empty($name)) {
            $errors[] = 'يرجى إدخال اسم الغرفة';
        } elseif (strlen($name) < 3 || strlen($name) > 100) {
            $errors[] = 'يجب أن يكون اسم الغرفة بين 3 و 100 حرف';
        }
        
        // التحقق مما إذا كان اسم الغرفة موجودًا بالفعل
        if (!empty($name) && isRoomNameExists($name)) {
            $errors[] = 'اسم الغرفة موجود بالفعل. يرجى اختيار اسم آخر.';
        }
        
        // إذا لم تكن هناك أخطاء، قم بإنشاء الغرفة
        if (empty($errors)) {
            // إنشاء مفتاح تشفير جديد للغرفة
            $encryption_key = generateEncryptionKey();
            
            // إدخال بيانات الغرفة في قاعدة البيانات
            if (createRoom($name, $description, $encryption_key, $is_active, $_SESSION['user_id'])) {
                // تسجيل النشاط
                logAdminActivity("إنشاء غرفة جديدة: {$name}");
                
                // إعادة التوجيه إلى صفحة إدارة الغرف مع رسالة نجاح
                setFlashMessage('success', 'تم إنشاء الغرفة بنجاح');
                redirect('rooms.php');
                exit;
            } else {
                $errors[] = 'حدث خطأ أثناء إنشاء الغرفة. يرجى المحاولة مرة أخرى.';
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
 * دالة لإنشاء غرفة جديدة في قاعدة البيانات
 * 
 * @param string $name اسم الغرفة
 * @param string $description وصف الغرفة
 * @param string $encryption_key مفتاح التشفير الخاص بالغرفة
 * @param int $is_active حالة نشاط الغرفة (1=نشطة، 0=غير نشطة)
 * @param int $created_by معرف المستخدم الذي أنشأ الغرفة
 * @return bool عودة صحيح إذا تم الإنشاء بنجاح، خطأ إذا حدث خطأ
 */
function createRoom($name, $description, $encryption_key, $is_active, $created_by) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO rooms (name, description, encryption_key, is_active, created_by, created_at) 
            VALUES (:name, :description, :encryption_key, :is_active, :created_by, NOW())
        ");
        
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':encryption_key', $encryption_key);
        $stmt->bindParam(':is_active', $is_active);
        $stmt->bindParam(':created_by', $created_by);
        
        return $stmt->execute();
    } catch (PDOException $e) {
        error_log("خطأ في إنشاء غرفة جديدة: " . $e->getMessage());
        return false;
    }
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إضافة غرفة جديدة - نظام الدردشة المشفر</title>
    
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
                    <h1 class="h2">إضافة غرفة دردشة جديدة</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
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
                
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-plus-circle me-1"></i> معلومات الغرفة الجديدة
                    </div>
                    <div class="card-body">
                        <form action="" method="POST">
                            <!-- رمز CSRF للحماية -->
                            <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                            
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <label for="name" class="form-label">اسم الغرفة <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="name" name="name" 
                                        value="<?php echo htmlspecialchars($name); ?>" required>
                                    <div class="form-text">اسم الغرفة يجب أن يكون فريدًا ويتراوح بين 3 و 100 حرف.</div>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <label for="description" class="form-label">وصف الغرفة</label>
                                    <textarea class="form-control" id="description" name="description" rows="3"><?php echo htmlspecialchars($description); ?></textarea>
                                    <div class="form-text">وصف موجز للغرفة وموضوعها.</div>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="is_active" name="is_active" <?php echo $is_active ? 'checked' : ''; ?>>
                                        <label class="form-check-label" for="is_active">تفعيل الغرفة</label>
                                    </div>
                                    <div class="form-text">إذا تم تفعيل الغرفة، يمكن للمستخدمين الوصول إليها. إذا لم يتم تفعيلها، لن تظهر في قائمة الغرف.</div>
                                </div>
                            </div>
                                                        
                            <div class="row mt-4">
                                <div class="col-md-12">
                                    <div class="alert alert-info">
                                        <i class="fas fa-info-circle me-1"></i> عند إنشاء الغرفة، سيتم إنشاء مفتاح تشفير خاص بها تلقائيًا لضمان أمان المحادثات.
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row mt-3">
                                <div class="col-md-12 text-start">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save me-1"></i> إنشاء الغرفة
                                    </button>
                                    <a href="rooms.php" class="btn btn-secondary">
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
    
    <!-- سكريبت للتحقق من النموذج بواسطة JavaScript -->
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
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الوظائف الرئيسية**:
   - التحقق من تسجيل الدخول وصلاحيات المسؤول
   - عرض نموذج لإدخال بيانات الغرفة الجديدة
   - التحقق من صحة البيانات المدخلة (في الخادم والمتصفح)
   - إنشاء مفتاح تشفير للغرفة بشكل تلقائي
   - إضافة الغرفة إلى قاعدة البيانات

2. **ميزات الأمان**:
   - التحقق من رمز CSRF لمنع هجمات تزوير الطلبات
   - تنظيف المدخلات لمنع هجمات XSS
   - استخدام Prepared Statements لمنع هجمات SQL Injection
   - التحقق من صحة البيانات قبل إدخالها في قاعدة البيانات

3. **متطلبات الصفحة**:
   - ملفات التكوين (config.php)
   - ملفات الدوال المساعدة (auth_functions.php, admin_functions.php, encryption_functions.php)
   - Bootstrap RTL للتصميم المستجيب ودعم اللغة العربية
   - Font Awesome للأيقونات
   - القائمة الجانبية للوحة تحكم المسؤول (admin_sidebar.php)

4. **التحقق من الصحة**:
   - التحقق من اسم الغرفة (غير فارغ، الطول بين 3 و 100 حرف، غير مكرر)
   - التحقق من تفعيل الغرفة
   - عرض رسائل خطأ واضحة في حالة وجود مشاكل
