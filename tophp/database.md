
# هيكل قاعدة البيانات

**الوصف**: يوضح هذا الملف هيكل قاعدة البيانات والجداول المستخدمة في نظام الدردشة المشفر مع نظام الصلاحيات (RBAC).

**المسار**: `/database_schema.sql` (ملف SQL يمكن استيراده في phpMyAdmin)

## هيكل قاعدة البيانات الكامل

```sql
-- إنشاء قاعدة البيانات إذا لم تكن موجودة
CREATE DATABASE IF NOT EXISTS `secure_chat_rbac` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `secure_chat_rbac`;

-- جدول المستخدمين
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `role` enum('admin','client') NOT NULL DEFAULT 'client',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول غرف الدردشة
CREATE TABLE `rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `encryption_key` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول العلاقة بين المستخدمين والغرف
CREATE TABLE `user_rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_activity` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_room_unique` (`user_id`,`room_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `user_rooms_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_rooms_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول الرسائل
CREATE TABLE `messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول محاولات تسجيل الدخول
CREATE TABLE `login_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 0,
  `attempt_time` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ip_address` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول سجل النشاطات
CREATE TABLE `activity_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `activity_type` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `activity_type` (`activity_type`),
  CONSTRAINT `activity_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول إعدادات النظام
CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إدراج بيانات أولية - مستخدمين افتراضيين
INSERT INTO `users` (`username`, `password`, `email`, `full_name`, `role`, `is_active`) VALUES
('المسؤول', '$2y$10$V4yfVjDd7NSdSjF3EfI6PeRSgPOCVpnC60lF8YcBsrm/ZpZFghg.G', 'admin@example.com', 'مستخدم مسؤول', 'admin', 1),
('مستخدم عادي', '$2y$10$V4yfVjDd7NSdSjF3EfI6PeRSgPOCVpnC60lF8YcBsrm/ZpZFghg.G', 'user@example.com', 'مستخدم عادي', 'client', 1);
-- ملاحظة: كلمة المرور هي "password" لكلا المستخدمين

-- إدراج بيانات أولية - إعدادات النظام
INSERT INTO `system_settings` (`setting_key`, `setting_value`) VALUES
('site_name', 'نظام الدردشة المشفر'),
('site_description', 'نظام دردشة آمن ومشفر مع نظام صلاحيات RBAC'),
('admin_email', 'admin@example.com'),
('enable_registration', '1'),
('max_messages_per_user', '100'),
('messages_pagination_limit', '50'),
('enable_file_sharing', '1'),
('allowed_file_types', 'jpg,jpeg,png,gif,pdf,doc,docx'),
('max_file_size', '2'),
('password_min_length', '8'),
('encryption_method', 'aes-256-cbc'),
('session_lifetime', '120'),
('max_login_attempts', '5'),
('lockout_time', '15'),
('enforce_https', '0'),
('theme', 'default'),
('language', 'ar'),
('date_format', 'Y-m-d'),
('time_format', 'H:i:s');

-- إدراج بيانات أولية - غرفة دردشة عامة
INSERT INTO `rooms` (`name`, `description`, `created_by`, `encryption_key`, `is_active`) VALUES
('غرفة عامة', 'غرفة مناقشة عامة للجميع', 1, 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', 1);

-- إضافة المستخدمين إلى الغرفة العامة
INSERT INTO `user_rooms` (`user_id`, `room_id`) VALUES
(1, 1),
(2, 1);
```

## شرح العلاقات والجداول

### 1. جدول المستخدمين (users)

- **الوصف**: يخزن معلومات جميع مستخدمي النظام
- **الحقول الرئيسية**:
  - `id`: المعرف الفريد (مفتاح أساسي)
  - `username`: اسم المستخدم (فريد)
  - `password`: كلمة المرور المشفرة باستخدام bcrypt
  - `email`: البريد الإلكتروني (فريد)
  - `role`: دور المستخدم (مسؤول/مستخدم عادي)
  - `is_active`: حالة الحساب (نشط/غير نشط)

### 2. جدول غرف الدردشة (rooms)

- **الوصف**: يخزن معلومات غرف الدردشة
- **الحقول الرئيسية**:
  - `id`: المعرف الفريد (مفتاح أساسي)
  - `name`: اسم الغرفة
  - `created_by`: معرف المستخدم الذي أنشأ الغرفة (مفتاح أجنبي يشير إلى جدول users)
  - `encryption_key`: مفتاح التشفير الخاص بالغرفة (لتشفير الرسائل)
  - `is_active`: حالة الغرفة (نشطة/غير نشطة)

### 3. جدول المستخدمين والغرف (user_rooms)

- **الوصف**: يربط بين المستخدمين والغرف (علاقة many-to-many)
- **الحقول الرئيسية**:
  - `id`: المعرف الفريد (مفتاح أساسي)
  - `user_id`: معرف المستخدم (مفتاح أجنبي يشير إلى جدول users)
  - `room_id`: معرف الغرفة (مفتاح أجنبي يشير إلى جدول rooms)
  - `last_activity`: آخر نشاط للمستخدم في هذه الغرفة (يستخدم لتتبع المستخدمين النشطين وعدد الرسائل غير المقروءة)

### 4. جدول الرسائل (messages)

- **الوصف**: يخزن جميع رسائل الدردشة المشفرة
- **الحقول الرئيسية**:
  - `id`: المعرف الفريد (مفتاح أساسي)
  - `user_id`: معرف المستخدم المرسل (مفتاح أجنبي يشير إلى جدول users)
  - `room_id`: معرف الغرفة (مفتاح أجنبي يشير إلى جدول rooms)
  - `message`: نص الرسالة المشفرة
  - `created_at`: وقت إنشاء الرسالة

### 5. جدول محاولات تسجيل الدخول (login_attempts)

- **الوصف**: يسجل محاولات تسجيل الدخول للحماية من هجمات كسر كلمة المرور
- **الحقول الرئيسية**:
  - `id`: المعرف الفريد (مفتاح أساسي)
  - `ip_address`: عنوان IP للمستخدم
  - `success`: نجاح أو فشل المحاولة
  - `attempt_time`: وقت محاولة تسجيل الدخول

### 6. جدول سجل النشاطات (activity_log)

- **الوصف**: يسجل جميع الأنشطة المهمة في النظام للتتبع والمراقبة
- **الحقول الرئيسية**:
  - `id`: المعرف الفريد (مفتاح أساسي)
  - `user_id`: معرف المستخدم (مفتاح أجنبي يشير إلى جدول users)
  - `activity_type`: نوع النشاط (تسجيل دخول، إنشاء غرفة، إلخ)
  - `description`: وصف النشاط
  - `ip_address`: عنوان IP للمستخدم
  - `created_at`: وقت النشاط

### 7. جدول إعدادات النظام (system_settings)

- **الوصف**: يخزن إعدادات النظام القابلة للتخصيص
- **الحقول الرئيسية**:
  - `id`: المعرف الفريد (مفتاح أساسي)
  - `setting_key`: مفتاح الإعداد (فريد)
  - `setting_value`: قيمة الإعداد
  - `updated_at`: آخر تحديث للإعداد

## الفهارس والمفاتيح الأجنبية

تم إنشاء الفهارس (Indexes) على الأعمدة التي يتم البحث والفرز عليها بشكل متكرر لتحسين الأداء:

1. **المفاتيح الأساسية** (Primary Keys) على عمود `id` في جميع الجداول.

2. **المفاتيح الفريدة** (Unique Keys):
   - `username` و `email` في جدول `users`
   - `user_id` و `room_id` في جدول `user_rooms` (لضمان عدم إضافة المستخدم إلى نفس الغرفة مرتين)
   - `setting_key` في جدول `system_settings`

3. **المفاتيح الأجنبية** (Foreign Keys):
   - `created_by` في جدول `rooms` يشير إلى `id` في جدول `users`
   - `user_id` في جدول `user_rooms` يشير إلى `id` في جدول `users`
   - `room_id` في جدول `user_rooms` يشير إلى `id` في جدول `rooms`
   - `user_id` و `room_id` في جدول `messages` يشيران إلى `id` في جدولي `users` و `rooms`
   - `user_id` في جدول `activity_log` يشير إلى `id` في جدول `users`

4. **فهارس إضافية** (Additional Indexes):
   - `ip_address` في جدول `login_attempts`
   - `activity_type` في جدول `activity_log`

## الحذف المتتابع (CASCADE)

تم تكوين المفاتيح الأجنبية باستخدام خاصية `ON DELETE CASCADE` لضمان تنظيف البيانات تلقائياً:

- عند حذف مستخدم، يتم حذف جميع الغرف التي أنشأها، ومشاركاته في الغرف، ورسائله، وسجلات نشاطه.
- عند حذف غرفة، يتم حذف جميع العلاقات مع المستخدمين والرسائل المرتبطة بها.

## ملاحظات على النموذج المستخدم

### 1. دعم اللغة العربية

تم استخدام `utf8mb4_unicode_ci` كترميز (Collation) لجميع الجداول والحقول لضمان دعم كامل للغة العربية وجميع الأحرف الخاصة والرموز التعبيرية.

### 2. الأمان والتشفير

- كلمات المرور مخزنة باستخدام خوارزمية bcrypt (PHP `password_hash`)
- يتم تشفير محتوى الرسائل قبل تخزينها باستخدام AES-256
- كل غرفة لها مفتاح تشفير خاص بها

### 3. نظام الصلاحيات RBAC

تم تنفيذ نظام الصلاحيات (Role-Based Access Control) من خلال:
- استخدام حقل `role` في جدول `users` لتحديد دور المستخدم
- استخدام جدول `user_rooms` لتحديد الغرف التي يمكن للمستخدم الوصول إليها
- التحقق من الصلاحيات في كل مكان في التطبيق قبل السماح بالوصول

### 4. تتبع النشاط

- يتم تسجيل جميع الأنشطة المهمة في جدول `activity_log`
- يتم تسجيل محاولات تسجيل الدخول (الناجحة والفاشلة) في جدول `login_attempts`
- يتم تحديث `last_activity` في جدول `user_rooms` عند إرسال أو استلام الرسائل
