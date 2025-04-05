
# لوحة تحكم المسؤول

**الوصف**: صفحة لوحة التحكم الرئيسية للمسؤول، تعرض إحصائيات النظام والروابط السريعة.

**المسار**: `/pages/admin/dashboard.php`

## الكود الكامل

```php
<?php
/**
 * لوحة تحكم المسؤول
 * تعرض إحصائيات النظام والروابط السريعة لإدارة النظام
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

// الحصول على الإحصائيات
$totalUsers = getTotalUsers();
$totalRooms = getTotalRooms();
$totalMessages = getTotalMessages();
$activeUsers = getActiveUsers();
$recentActivities = getRecentActivities(5); // آخر 5 أنشطة
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم - نظام الدردشة المشفر</title>
    
    <!-- Bootstrap RTL CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
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
                    <h1 class="h2"><i class="fas fa-tachometer-alt me-2"></i>لوحة التحكم</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="exportDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-download me-1"></i>
                                تصدير
                            </button>
                            <ul class="dropdown-menu" aria-labelledby="exportDropdown">
                                <li><a class="dropdown-item" href="#" id="exportPDF">PDF</a></li>
                                <li><a class="dropdown-item" href="#" id="exportExcel">Excel</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- بطاقات الإحصائيات -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card text-white bg-primary">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="card-title">المستخدمون</h6>
                                        <h2 class="card-text"><?php echo $totalUsers; ?></h2>
                                    </div>
                                    <div>
                                        <i class="fas fa-users fa-3x opacity-50"></i>
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <a href="users.php" class="text-white text-decoration-none small">
                                        عرض التفاصيل <i class="fas fa-arrow-circle-left"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-3">
                        <div class="card text-white bg-success">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="card-title">غرف الدردشة</h6>
                                        <h2 class="card-text"><?php echo $totalRooms; ?></h2>
                                    </div>
                                    <div>
                                        <i class="fas fa-comments fa-3x opacity-50"></i>
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <a href="rooms.php" class="text-white text-decoration-none small">
                                        عرض التفاصيل <i class="fas fa-arrow-circle-left"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-3">
                        <div class="card text-white bg-info">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="card-title">الرسائل</h6>
                                        <h2 class="card-text"><?php echo $totalMessages; ?></h2>
                                    </div>
                                    <div>
                                        <i class="fas fa-envelope fa-3x opacity-50"></i>
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <a href="messages.php" class="text-white text-decoration-none small">
                                        عرض التفاصيل <i class="fas fa-arrow-circle-left"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-3">
                        <div class="card text-white bg-warning">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="card-title">المستخدمون النشطون</h6>
                                        <h2 class="card-text"><?php echo $activeUsers; ?></h2>
                                    </div>
                                    <div>
                                        <i class="fas fa-user-clock fa-3x opacity-50"></i>
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <a href="active_users.php" class="text-white text-decoration-none small">
                                        عرض التفاصيل <i class="fas fa-arrow-circle-left"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- الرسم البياني والأنشطة الأخيرة -->
                <div class="row mb-4">
                    <div class="col-md-8">
                        <div class="card mb-4">
                            <div class="card-header bg-white">
                                <h5 class="card-title mb-0">إحصائيات النشاط</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="activityChart" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header bg-white">
                                <h5 class="card-title mb-0">الأنشطة الأخيرة</h5>
                            </div>
                            <div class="card-body p-0">
                                <ul class="list-group list-group-flush">
                                    <?php foreach ($recentActivities as $activity): ?>
                                    <li class="list-group-item">
                                        <div class="d-flex w-100 justify-content-between">
                                            <h6 class="mb-1"><?php echo htmlspecialchars($activity['description']); ?></h6>
                                            <small class="text-muted"><?php echo formatTimeAgo($activity['created_at']); ?></small>
                                        </div>
                                        <p class="mb-1 small text-muted">
                                            <i class="fas fa-user-circle me-1"></i>
                                            <?php echo htmlspecialchars($activity['username']); ?>
                                        </p>
                                    </li>
                                    <?php endforeach; ?>
                                </ul>
                            </div>
                            <div class="card-footer bg-white text-center">
                                <a href="activities.php" class="btn btn-sm btn-outline-secondary">عرض جميع الأنشطة</a>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- الروابط السريعة -->
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header bg-white">
                                <h5 class="card-title mb-0">إجراءات سريعة</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <a href="user_add.php" class="btn btn-light d-block p-3 text-center h-100">
                                            <i class="fas fa-user-plus fa-2x mb-2 text-primary"></i>
                                            <div>إضافة مستخدم جديد</div>
                                        </a>
                                    </div>
                                    <div class="col-md-3">
                                        <a href="room_add.php" class="btn btn-light d-block p-3 text-center h-100">
                                            <i class="fas fa-plus-circle fa-2x mb-2 text-success"></i>
                                            <div>إنشاء غرفة جديدة</div>
                                        </a>
                                    </div>
                                    <div class="col-md-3">
                                        <a href="settings.php" class="btn btn-light d-block p-3 text-center h-100">
                                            <i class="fas fa-cogs fa-2x mb-2 text-warning"></i>
                                            <div>إعدادات النظام</div>
                                        </a>
                                    </div>
                                    <div class="col-md-3">
                                        <a href="reports.php" class="btn btn-light d-block p-3 text-center h-100">
                                            <i class="fas fa-chart-bar fa-2x mb-2 text-info"></i>
                                            <div>التقارير</div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
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
    
    <!-- سكريبت الرسم البياني -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // بيانات للرسم البياني - يمكن استبدالها ببيانات حقيقية من قاعدة البيانات
            const ctx = document.getElementById('activityChart').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                    datasets: [{
                        label: 'رسائل الدردشة',
                        data: [65, 59, 80, 81, 56, 55],
                        borderColor: 'rgba(13, 110, 253, 0.8)',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'تسجيلات الدخول',
                        data: [28, 48, 40, 19, 86, 27],
                        borderColor: 'rgba(40, 167, 69, 0.8)',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            rtl: true,
                            textDirection: 'rtl'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            // أزرار التصدير
            document.getElementById('exportPDF').addEventListener('click', function() {
                alert('سيتم تصدير التقرير بصيغة PDF');
                // هنا يمكن إضافة كود التصدير الفعلي
            });
            
            document.getElementById('exportExcel').addEventListener('click', function() {
                alert('سيتم تصدير التقرير بصيغة Excel');
                // هنا يمكن إضافة كود التصدير الفعلي
            });
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **ملفات الـ CSS**:
   - قم بإنشاء ملف `assets/css/admin.css` للأنماط الخاصة بلوحة التحكم.

2. **ملفات الدوال المطلوبة**:
   - `includes/admin_functions.php`: يحتوي على دوال خاصة بالمسؤول مثل:
     - `getTotalUsers()`: للحصول على عدد المستخدمين
     - `getTotalRooms()`: للحصول على عدد الغرف
     - `getTotalMessages()`: للحصول على عدد الرسائل
     - `getActiveUsers()`: للحصول على عدد المستخدمين النشطين
     - `getRecentActivities()`: للحصول على آخر الأنشطة

3. **ملفات القوالب**:
   - `includes/admin_sidebar.php`: قالب القائمة الجانبية للمسؤول
