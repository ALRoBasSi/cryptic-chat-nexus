
# صفحة التقارير وإحصائيات النظام

**الوصف**: صفحة لعرض تقارير وإحصائيات مختلفة عن استخدام النظام والنشاطات.

**المسار**: `/pages/admin/reports.php`

## الكود الكامل

```php
<?php
/**
 * صفحة التقارير والإحصائيات
 * تعرض إحصائيات متنوعة عن النظام واستخدامه
 */

// تضمين الملفات اللازمة
require_once '../../includes/config.php';
require_once '../../includes/auth_functions.php';
require_once '../../includes/admin_functions.php';
require_once '../../includes/general_functions.php';

// بدء جلسة جديدة أو متابعة الجلسة الحالية
session_start();

// التحقق من تسجيل الدخول وصلاحيات المسؤول
if (!isLoggedIn() || !isAdmin()) {
    // إعادة التوجيه إلى صفحة تسجيل الدخول إذا لم يكن المستخدم مسجل دخوله أو ليس لديه صلاحيات المسؤول
    redirect('../index.php');
    exit;
}

// الحصول على الإحصائيات من قاعدة البيانات
$statsData = getSystemStatistics();

// تحديد نوع التقرير المطلوب (الافتراضي: 'general')
$reportType = isset($_GET['type']) ? cleanInput($_GET['type']) : 'general';

// تحديد الفترة الزمنية (الافتراضي: 'month')
$timePeriod = isset($_GET['period']) ? cleanInput($_GET['period']) : 'month';

// تحديد التاريخ المخصص (إذا كان متوفرًا)
$fromDate = isset($_GET['from_date']) ? cleanInput($_GET['from_date']) : '';
$toDate = isset($_GET['to_date']) ? cleanInput($_GET['to_date']) : '';

// الحصول على بيانات التقرير حسب النوع والفترة
$reportData = generateReport($reportType, $timePeriod, $fromDate, $toDate);

// تنسيق البيانات للعرض في المخطط (إذا كان مطلوبًا)
$chartData = formatDataForChart($reportData);

// الحصول على قائمة أنواع التقارير المتاحة
$availableReports = [
    'general' => 'إحصائيات عامة',
    'users' => 'نشاط المستخدمين',
    'messages' => 'إحصائيات الرسائل',
    'rooms' => 'نشاط غرف الدردشة',
    'security' => 'تقرير الأمان والوصول'
];

// دالة للحصول على إحصائيات النظام العامة
function getSystemStatistics() {
    global $conn;
    
    try {
        // إجمالي عدد المستخدمين
        $stmt = $conn->prepare("SELECT COUNT(*) as total FROM users");
        $stmt->execute();
        $totalUsers = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // إجمالي عدد المستخدمين النشطين في آخر 24 ساعة
        $stmt = $conn->prepare("SELECT COUNT(*) as active FROM users WHERE last_activity > DATE_SUB(NOW(), INTERVAL 24 HOUR)");
        $stmt->execute();
        $activeUsers = $stmt->fetch(PDO::FETCH_ASSOC)['active'];
        
        // إجمالي عدد الغرف
        $stmt = $conn->prepare("SELECT COUNT(*) as total FROM rooms");
        $stmt->execute();
        $totalRooms = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // إجمالي عدد الرسائل
        $stmt = $conn->prepare("SELECT COUNT(*) as total FROM messages");
        $stmt->execute();
        $totalMessages = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // متوسط عدد الرسائل في اليوم (آخر 7 أيام)
        $stmt = $conn->prepare("SELECT COUNT(*) as total FROM messages WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)");
        $stmt->execute();
        $messagesLast7Days = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        $avgMessagesPerDay = round($messagesLast7Days / 7);
        
        // جمع الإحصائيات في مصفوفة واحدة
        return [
            'totalUsers' => $totalUsers,
            'activeUsers' => $activeUsers,
            'totalRooms' => $totalRooms,
            'totalMessages' => $totalMessages,
            'avgMessagesPerDay' => $avgMessagesPerDay,
            'activeUsersPercent' => ($totalUsers > 0) ? round(($activeUsers / $totalUsers) * 100) : 0
        ];
        
    } catch (PDOException $e) {
        // تسجيل الخطأ وإعادة مصفوفة فارغة
        error_log('خطأ في الحصول على إحصائيات النظام: ' . $e->getMessage());
        return [
            'totalUsers' => 0,
            'activeUsers' => 0,
            'totalRooms' => 0,
            'totalMessages' => 0,
            'avgMessagesPerDay' => 0,
            'activeUsersPercent' => 0
        ];
    }
}

// دالة لإنشاء تقرير حسب النوع والفترة الزمنية
function generateReport($type, $period, $fromDate = '', $toDate = '') {
    global $conn;
    
    // تحديد تاريخ البداية حسب الفترة المحددة
    $startDate = '';
    
    if ($fromDate && $toDate) {
        // استخدام التواريخ المخصصة إذا كانت متوفرة
        $startDate = $fromDate;
        $endDate = $toDate;
    } else {
        // تحديد تاريخ البداية حسب الفترة
        switch ($period) {
            case 'day':
                $startDate = date('Y-m-d 00:00:00');
                break;
            case 'week':
                $startDate = date('Y-m-d 00:00:00', strtotime('-7 days'));
                break;
            case 'month':
                $startDate = date('Y-m-d 00:00:00', strtotime('-30 days'));
                break;
            case 'year':
                $startDate = date('Y-m-d 00:00:00', strtotime('-365 days'));
                break;
            default:
                $startDate = date('Y-m-d 00:00:00', strtotime('-30 days'));
        }
        
        $endDate = date('Y-m-d 23:59:59');
    }
    
    try {
        // بناء الاستعلام حسب نوع التقرير
        switch ($type) {
            case 'users':
                // تقرير نشاط المستخدمين
                $query = "SELECT DATE(created_at) as date, COUNT(*) as count 
                          FROM user_activities 
                          WHERE created_at BETWEEN :start_date AND :end_date 
                          GROUP BY DATE(created_at) 
                          ORDER BY date";
                break;
                
            case 'messages':
                // تقرير إحصائيات الرسائل
                $query = "SELECT DATE(created_at) as date, COUNT(*) as count 
                          FROM messages 
                          WHERE created_at BETWEEN :start_date AND :end_date 
                          GROUP BY DATE(created_at) 
                          ORDER BY date";
                break;
                
            case 'rooms':
                // تقرير نشاط غرف الدردشة
                $query = "SELECT r.name as room_name, COUNT(m.id) as message_count 
                          FROM rooms r 
                          LEFT JOIN messages m ON r.id = m.room_id AND m.created_at BETWEEN :start_date AND :end_date 
                          GROUP BY r.id 
                          ORDER BY message_count DESC";
                break;
                
            case 'security':
                // تقرير الأمان والوصول
                $query = "SELECT activity_type, COUNT(*) as count 
                          FROM user_activities 
                          WHERE created_at BETWEEN :start_date AND :end_date 
                          AND (activity_type LIKE '%login%' OR activity_type LIKE '%access%' OR activity_type LIKE '%fail%') 
                          GROUP BY activity_type 
                          ORDER BY count DESC";
                break;
                
            default:
                // تقرير عام - يجمع بين عدة إحصائيات
                $query = "SELECT 'messages' as type, DATE(created_at) as date, COUNT(*) as count 
                          FROM messages 
                          WHERE created_at BETWEEN :start_date AND :end_date 
                          GROUP BY type, DATE(created_at) 
                          UNION ALL 
                          SELECT 'activities' as type, DATE(created_at) as date, COUNT(*) as count 
                          FROM user_activities 
                          WHERE created_at BETWEEN :start_date AND :end_date 
                          GROUP BY type, DATE(created_at) 
                          ORDER BY date, type";
        }
        
        // تنفيذ الاستعلام
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();
        
        // جلب البيانات
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } catch (PDOException $e) {
        // تسجيل الخطأ وإعادة مصفوفة فارغة
        error_log('خطأ في إنشاء التقرير: ' . $e->getMessage());
        return [];
    }
}

// دالة لتنسيق البيانات للعرض في المخططات
function formatDataForChart($data) {
    // تنسيق البيانات حسب هيكل مكتبة الرسوم البيانية المستخدمة
    $formattedData = [];
    
    foreach ($data as $row) {
        if (isset($row['date'])) {
            // تنسيق التاريخ
            $formattedDate = date('Y-m-d', strtotime($row['date']));
            
            if (isset($row['type'])) {
                // إذا كان هناك نوع (مثل التقرير العام)
                if (!isset($formattedData[$formattedDate])) {
                    $formattedData[$formattedDate] = [
                        'date' => $formattedDate,
                        'messages' => 0,
                        'activities' => 0
                    ];
                }
                
                $formattedData[$formattedDate][$row['type']] = intval($row['count']);
            } else {
                // للتقارير الأخرى
                $formattedData[] = [
                    'date' => $formattedDate,
                    'count' => intval($row['count'])
                ];
            }
        } elseif (isset($row['room_name'])) {
            // لتقرير غرف الدردشة
            $formattedData[] = [
                'name' => $row['room_name'],
                'value' => intval($row['message_count'])
            ];
        } elseif (isset($row['activity_type'])) {
            // لتقرير الأمان
            $formattedData[] = [
                'name' => $row['activity_type'],
                'value' => intval($row['count'])
            ];
        }
    }
    
    // تحويل المصفوفة المترابطة إلى مصفوفة عادية (إذا لزم الأمر)
    if (isset($row['type'])) {
        $formattedData = array_values($formattedData);
    }
    
    return $formattedData;
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>التقارير والإحصائيات - نظام الدردشة المشفر</title>
    
    <!-- Bootstrap RTL CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Chart.js للرسوم البيانية -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.css">
    
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
                    <h1 class="h2">التقارير والإحصائيات</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <div class="btn-group me-2">
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.print()">
                                <i class="fas fa-print"></i> طباعة التقرير
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" id="exportBtn">
                                <i class="fas fa-download"></i> تصدير CSV
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- بطاقات الإحصائيات السريعة -->
                <div class="row mb-4">
                    <div class="col-md-4 col-xl-3">
                        <div class="card bg-primary text-white mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h5 class="card-title mb-0">إجمالي المستخدمين</h5>
                                        <small>جميع المستخدمين المسجلين</small>
                                    </div>
                                    <div>
                                        <i class="fas fa-users fa-2x opacity-50"></i>
                                    </div>
                                </div>
                                <h2 class="mt-3 mb-0"><?php echo $statsData['totalUsers']; ?></h2>
                                <div class="mt-2">
                                    <span class="badge bg-light text-primary">
                                        <?php echo $statsData['activeUsers']; ?> نشط (<?php echo $statsData['activeUsersPercent']; ?>%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 col-xl-3">
                        <div class="card bg-success text-white mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h5 class="card-title mb-0">إجمالي الرسائل</h5>
                                        <small>كل الرسائل المتبادلة</small>
                                    </div>
                                    <div>
                                        <i class="fas fa-comments fa-2x opacity-50"></i>
                                    </div>
                                </div>
                                <h2 class="mt-3 mb-0"><?php echo $statsData['totalMessages']; ?></h2>
                                <div class="mt-2">
                                    <span class="badge bg-light text-success">
                                        <?php echo $statsData['avgMessagesPerDay']; ?> متوسط يومي (آخر 7 أيام)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 col-xl-3">
                        <div class="card bg-info text-white mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h5 class="card-title mb-0">غرف الدردشة</h5>
                                        <small>جميع الغرف المتاحة</small>
                                    </div>
                                    <div>
                                        <i class="fas fa-door-open fa-2x opacity-50"></i>
                                    </div>
                                </div>
                                <h2 class="mt-3 mb-0"><?php echo $statsData['totalRooms']; ?></h2>
                                <div class="mt-2">
                                    <span class="badge bg-light text-info">
                                        <?php echo round($statsData['totalMessages'] / ($statsData['totalRooms'] ?: 1)); ?> رسالة/غرفة
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- مرشحات التقرير -->
                <div class="card mb-4">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">تخصيص التقرير</h5>
                    </div>
                    <div class="card-body">
                        <form method="GET" action="" class="row g-3">
                            <div class="col-md-3">
                                <label for="reportType" class="form-label">نوع التقرير</label>
                                <select class="form-select" id="reportType" name="type">
                                    <?php foreach ($availableReports as $key => $label): ?>
                                        <option value="<?php echo $key; ?>" <?php echo ($reportType == $key) ? 'selected' : ''; ?>>
                                            <?php echo $label; ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            
                            <div class="col-md-3">
                                <label for="timePeriod" class="form-label">الفترة الزمنية</label>
                                <select class="form-select" id="timePeriod" name="period">
                                    <option value="day" <?php echo ($timePeriod == 'day') ? 'selected' : ''; ?>>اليوم</option>
                                    <option value="week" <?php echo ($timePeriod == 'week') ? 'selected' : ''; ?>>آخر 7 أيام</option>
                                    <option value="month" <?php echo ($timePeriod == 'month') ? 'selected' : ''; ?>>آخر 30 يوم</option>
                                    <option value="year" <?php echo ($timePeriod == 'year') ? 'selected' : ''; ?>>آخر سنة</option>
                                    <option value="custom" <?php echo ($fromDate && $toDate) ? 'selected' : ''; ?>>مخصص</option>
                                </select>
                            </div>
                            
                            <div class="col-md-3 custom-date-range" <?php echo (!$fromDate || !$toDate) ? 'style="display:none;"' : ''; ?>>
                                <label for="fromDate" class="form-label">من تاريخ</label>
                                <input type="date" class="form-control" id="fromDate" name="from_date" value="<?php echo $fromDate; ?>">
                            </div>
                            
                            <div class="col-md-3 custom-date-range" <?php echo (!$fromDate || !$toDate) ? 'style="display:none;"' : ''; ?>>
                                <label for="toDate" class="form-label">إلى تاريخ</label>
                                <input type="date" class="form-control" id="toDate" name="to_date" value="<?php echo $toDate; ?>">
                            </div>
                            
                            <div class="col-12">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-filter"></i> تطبيق الفلتر
                                </button>
                                <a href="reports.php" class="btn btn-outline-secondary">
                                    <i class="fas fa-undo"></i> إعادة ضبط
                                </a>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- عرض التقرير والرسوم البيانية -->
                <div class="card mb-4">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <?php echo $availableReports[$reportType]; ?>
                        </h5>
                        <div class="btn-group btn-group-sm chart-toggle">
                            <button type="button" class="btn btn-outline-primary active" data-chart-type="line">
                                <i class="fas fa-chart-line"></i>
                            </button>
                            <button type="button" class="btn btn-outline-primary" data-chart-type="bar">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                            <button type="button" class="btn btn-outline-primary" data-chart-type="pie">
                                <i class="fas fa-chart-pie"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <?php if (empty($reportData)): ?>
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle"></i> لا توجد بيانات متاحة للفترة المحددة.
                            </div>
                        <?php else: ?>
                            <div class="chart-container" style="position: relative; height:400px;">
                                <canvas id="reportChart"></canvas>
                            </div>
                            
                            <!-- جدول البيانات -->
                            <div class="table-responsive mt-4">
                                <table class="table table-striped table-hover">
                                    <thead>
                                        <?php if ($reportType == 'general'): ?>
                                            <tr>
                                                <th>التاريخ</th>
                                                <th>الرسائل</th>
                                                <th>النشاطات</th>
                                                <th>المجموع</th>
                                            </tr>
                                        <?php elseif ($reportType == 'users' || $reportType == 'messages'): ?>
                                            <tr>
                                                <th>التاريخ</th>
                                                <th>العدد</th>
                                            </tr>
                                        <?php elseif ($reportType == 'rooms'): ?>
                                            <tr>
                                                <th>اسم الغرفة</th>
                                                <th>عدد الرسائل</th>
                                            </tr>
                                        <?php elseif ($reportType == 'security'): ?>
                                            <tr>
                                                <th>نوع النشاط</th>
                                                <th>العدد</th>
                                            </tr>
                                        <?php endif; ?>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($reportData as $row): ?>
                                            <?php if ($reportType == 'general'): ?>
                                                <?php if (isset($row['date']) && isset($row['type'])): ?>
                                                    <?php 
                                                        if (!isset($tableData[$row['date']])) {
                                                            $tableData[$row['date']] = [
                                                                'messages' => 0,
                                                                'activities' => 0
                                                            ];
                                                        }
                                                        $tableData[$row['date']][$row['type']] = $row['count'];
                                                    ?>
                                                <?php endif; ?>
                                            <?php elseif ($reportType == 'users' || $reportType == 'messages'): ?>
                                                <tr>
                                                    <td><?php echo date('Y-m-d', strtotime($row['date'])); ?></td>
                                                    <td><?php echo $row['count']; ?></td>
                                                </tr>
                                            <?php elseif ($reportType == 'rooms'): ?>
                                                <tr>
                                                    <td><?php echo htmlspecialchars($row['room_name']); ?></td>
                                                    <td><?php echo $row['message_count']; ?></td>
                                                </tr>
                                            <?php elseif ($reportType == 'security'): ?>
                                                <tr>
                                                    <td><?php echo htmlspecialchars($row['activity_type']); ?></td>
                                                    <td><?php echo $row['count']; ?></td>
                                                </tr>
                                            <?php endif; ?>
                                        <?php endforeach; ?>
                                        
                                        <?php if ($reportType == 'general' && isset($tableData)): ?>
                                            <?php foreach ($tableData as $date => $data): ?>
                                                <tr>
                                                    <td><?php echo $date; ?></td>
                                                    <td><?php echo $data['messages']; ?></td>
                                                    <td><?php echo $data['activities']; ?></td>
                                                    <td><?php echo $data['messages'] + $data['activities']; ?></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        <?php endif; ?>
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
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
    
    <!-- سكريبت للتعامل مع التقارير والرسوم البيانية -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // إعداد البيانات للرسوم البيانية
            const chartData = <?php echo json_encode($chartData); ?>;
            const reportType = '<?php echo $reportType; ?>';
            let chart;
            
            // إظهار/إخفاء حقول التاريخ المخصص عند تغيير الفترة الزمنية
            document.getElementById('timePeriod').addEventListener('change', function() {
                const customFields = document.querySelectorAll('.custom-date-range');
                if (this.value === 'custom') {
                    customFields.forEach(field => field.style.display = 'block');
                } else {
                    customFields.forEach(field => field.style.display = 'none');
                }
            });
            
            // إنشاء الرسم البياني
            function createChart(type = 'line') {
                const ctx = document.getElementById('reportChart').getContext('2d');
                
                // تحديد الإعدادات حسب نوع الرسم البياني ونوع التقرير
                let config = {
                    type: type,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            title: {
                                display: true,
                                text: '<?php echo $availableReports[$reportType]; ?>'
                            }
                        }
                    }
                };
                
                // تحديد البيانات حسب نوع التقرير
                if (reportType === 'general') {
                    // تقرير عام - عرض الرسائل والنشاطات
                    config.data = {
                        labels: chartData.map(item => item.date),
                        datasets: [
                            {
                                label: 'الرسائل',
                                data: chartData.map(item => item.messages),
                                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                borderColor: 'rgba(54, 162, 235, 1)',
                                borderWidth: 1
                            },
                            {
                                label: 'النشاطات',
                                data: chartData.map(item => item.activities),
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgba(255, 99, 132, 1)',
                                borderWidth: 1
                            }
                        ]
                    };
                } else if (reportType === 'users' || reportType === 'messages') {
                    // تقرير المستخدمين أو الرسائل حسب التاريخ
                    config.data = {
                        labels: chartData.map(item => item.date),
                        datasets: [{
                            label: 'العدد',
                            data: chartData.map(item => item.count),
                            backgroundColor: reportType === 'users' ? 'rgba(54, 162, 235, 0.5)' : 'rgba(75, 192, 192, 0.5)',
                            borderColor: reportType === 'users' ? 'rgba(54, 162, 235, 1)' : 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    };
                } else if (reportType === 'rooms' || reportType === 'security') {
                    // تقرير الغرف أو الأمان
                    config.data = {
                        labels: chartData.map(item => item.name),
                        datasets: [{
                            label: 'العدد',
                            data: chartData.map(item => item.value),
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.5)',
                                'rgba(54, 162, 235, 0.5)',
                                'rgba(255, 206, 86, 0.5)',
                                'rgba(75, 192, 192, 0.5)',
                                'rgba(153, 102, 255, 0.5)',
                                'rgba(255, 159, 64, 0.5)'
                            ],
                            borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                                'rgba(255, 159, 64, 1)'
                            ],
                            borderWidth: 1
                        }]
                    };
                }
                
                // التأكد من تدمير الرسم البياني السابق إذا كان موجودًا
                if (chart) {
                    chart.destroy();
                }
                
                // إنشاء الرسم البياني الجديد
                chart = new Chart(ctx, config);
            }
            
            // إنشاء الرسم البياني الأولي
            if (chartData.length > 0) {
                createChart('line');
            }
            
            // تبديل نوع الرسم البياني عند النقر على الأزرار
            document.querySelectorAll('.chart-toggle button').forEach(button => {
                button.addEventListener('click', function() {
                    // إزالة الكلاس النشط من جميع الأزرار
                    document.querySelectorAll('.chart-toggle button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // إضافة الكلاس النشط للزر المختار
                    this.classList.add('active');
                    
                    // تحديث الرسم البياني
                    const chartType = this.getAttribute('data-chart-type');
                    createChart(chartType);
                });
            });
            
            // تصدير البيانات كملف CSV
            document.getElementById('exportBtn').addEventListener('click', function() {
                exportTableToCSV('تقرير_<?php echo $reportType; ?>_<?php echo date('Y-m-d'); ?>.csv');
            });
            
            // دالة لتصدير جدول البيانات كملف CSV
            function exportTableToCSV(filename) {
                const csv = [];
                const rows = document.querySelectorAll('table tr');
                
                for (let i = 0; i < rows.length; i++) {
                    const row = [], cols = rows[i].querySelectorAll('td, th');
                    
                    for (let j = 0; j < cols.length; j++) {
                        // استبدال الفواصل المنقوطة لتجنب مشاكل التنسيق
                        let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/;/g, ',');
                        row.push('"' + data + '"');
                    }
                    
                    csv.push(row.join(';'));
                }
                
                // تحميل ملف CSV
                const csvFile = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(csvFile);
                downloadLink.setAttribute('download', filename);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
        });
    </script>
</body>
</html>
```

## ملاحظات التنفيذ

1. **الوظائف الرئيسية**:
   - عرض إحصائيات عامة عن النظام (المستخدمين، الغرف، الرسائل)
   - إنشاء تقارير مختلفة حسب نوع التقرير والفترة الزمنية
   - عرض البيانات في رسوم بيانية متعددة (خطية، أعمدة، دائرية)
   - إمكانية تصدير البيانات كملف CSV

2. **أنواع التقارير**:
   - التقرير العام: يجمع بين إحصائيات الرسائل والنشاطات
   - تقرير المستخدمين: يعرض نشاط المستخدمين حسب التاريخ
   - تقرير الرسائل: يعرض إحصائيات الرسائل حسب التاريخ
   - تقرير الغرف: يعرض نشاط غرف الدردشة وعدد الرسائل فيها
   - تقرير الأمان: يعرض محاولات الوصول ونشاطات الأمان

3. **المتطلبات**:
   - مكتبة Chart.js: تستخدم لإنشاء الرسوم البيانية
   - Bootstrap RTL: للتصميم المستجيب والدعم الكامل للغة العربية
   - Font Awesome: للأيقونات المستخدمة في الصفحة

4. **إعدادات الحماية**:
   - التحقق من تسجيل الدخول وصلاحيات المسؤول
   - تنظيف البيانات المدخلة لمنع هجمات SQL Injection
   - استخدام Prepared Statements في استعلامات قاعدة البيانات
