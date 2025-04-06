
# هيكل قاعدة البيانات

**الوصف**: هذا الملف يوثق هيكل قاعدة البيانات المستخدمة في نظام الدردشة المشفر، ويشرح الجداول والعلاقات بينها والأعمدة الرئيسية.

## الكود الكامل لإنشاء قاعدة البيانات

```sql
-- إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS `secure_chat` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `secure_chat`;

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
  `last_activity` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول غرف الدردشة
CREATE TABLE `rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `encryption_key` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول الصلاحيات على الغرف
CREATE TABLE `room_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `can_read` tinyint(1) NOT NULL DEFAULT 1,
  `can_write` tinyint(1) NOT NULL DEFAULT 1,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_user` (`room_id`,`user_id`),
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول الرسائل
CREATE TABLE `messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_encrypted` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `room_time` (`room_id`,`created_at`),
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول حالة قراءة الرسائل
CREATE TABLE `message_read_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `message_user` (`message_id`,`user_id`),
  FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول نشاطات المستخدمين
CREATE TABLE `user_activities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `activity_type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_time` (`user_id`,`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول نشاطات الغرف
CREATE TABLE `room_activities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `activity_type` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `room_time` (`room_id`,`created_at`),
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول الإعدادات العامة
CREATE TABLE `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text NOT NULL,
  `setting_description` text DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إدخال بيانات أولية للمستخدمين
INSERT INTO `users` (`username`, `password`, `email`, `full_name`, `role`) VALUES
('admin', '$2y$10$DtOdsiTi1y5LmAxgxrIUEuNoCmECKVi7Za/PiPdXGncyd7uYQziry', 'admin@example.com', 'مدير النظام', 'admin'),
('user', '$2y$10$3WdTH5OZJZhJS9GZfFq9SO9mQpxpZklBHGMdkYNn8lCzHuXuLaVlW', 'user@example.com', 'مستخدم عادي', 'client');

-- إدخال بيانات أولية للإعدادات
INSERT INTO `settings` (`setting_key`, `setting_value`, `setting_description`, `is_public`) VALUES
('site_name', 'نظام الدردشة المشفر', 'اسم الموقع', 1),
('allow_registration', '0', 'السماح بالتسجيل الذاتي للمستخدمين الجدد', 0),
('default_encryption', 'AES-256-CBC', 'طريقة التشفير الافتراضية', 0),
('session_timeout', '30', 'مدة انتهاء الجلسة بالدقائق', 0),
('max_login_attempts', '5', 'الحد الأقصى لمحاولات تسجيل الدخول قبل تأمين الحساب', 0),
('maintenance_mode', '0', 'وضع الصيانة', 1);

-- إنشاء غرفة دردشة افتراضية
INSERT INTO `rooms` (`name`, `description`, `encryption_key`, `created_by`) VALUES
('الغرفة العامة', 'غرفة عامة للنقاشات المختلفة', SUBSTRING(MD5(RAND()), 1, 32), 1);

-- منح صلاحيات للمستخدمين على الغرفة الافتراضية
INSERT INTO `room_users` (`room_id`, `user_id`, `can_read`, `can_write`, `is_admin`) VALUES
(1, 1, 1, 1, 1),
(1, 2, 1, 1, 0);
```

## شرح جداول قاعدة البيانات

### 1. جدول المستخدمين (`users`)

يخزن معلومات جميع مستخدمي النظام:

- `id`: معرف فريد للمستخدم (مفتاح أساسي).
- `username`: اسم المستخدم (فريد).
- `password`: كلمة المرور مشفرة باستخدام bcrypt.
- `email`: البريد الإلكتروني (فريد).
- `full_name`: الاسم الكامل للمستخدم.
- `role`: دور المستخدم (مسؤول أو مستخدم عادي).
- `is_active`: حالة نشاط الحساب (نشط=1، غير نشط=0).
- `last_login`: تاريخ ووقت آخر تسجيل دخول.
- `last_activity`: تاريخ ووقت آخر نشاط في النظام.
- `created_at`: تاريخ ووقت إنشاء الحساب.
- `updated_at`: تاريخ ووقت آخر تحديث لبيانات الحساب.

### 2. جدول غرف الدردشة (`rooms`)

يخزن معلومات غرف الدردشة:

- `id`: معرف فريد للغرفة (مفتاح أساسي).
- `name`: اسم الغرفة (فريد).
- `description`: وصف الغرفة.
- `encryption_key`: مفتاح التشفير الخاص بالغرفة.
- `is_active`: حالة نشاط الغرفة (نشطة=1، غير نشطة=0).
- `created_by`: معرف المستخدم الذي أنشأ الغرفة (مفتاح خارجي).
- `created_at`: تاريخ ووقت إنشاء الغرفة.
- `updated_at`: تاريخ ووقت آخر تحديث لبيانات الغرفة.

### 3. جدول الصلاحيات على الغرف (`room_users`)

يربط بين المستخدمين والغرف ويحدد صلاحياتهم:

- `id`: معرف فريد للسجل (مفتاح أساسي).
- `room_id`: معرف الغرفة (مفتاح خارجي).
- `user_id`: معرف المستخدم (مفتاح خارجي).
- `can_read`: صلاحية قراءة الرسائل في الغرفة.
- `can_write`: صلاحية كتابة رسائل في الغرفة.
- `is_admin`: صلاحية إدارة الغرفة (مسؤول الغرفة).
- `created_at`: تاريخ ووقت منح الصلاحية.
- `updated_at`: تاريخ ووقت آخر تحديث للصلاحيات.

### 4. جدول الرسائل (`messages`)

يخزن جميع رسائل الدردشة:

- `id`: معرف فريد للرسالة (مفتاح أساسي).
- `room_id`: معرف الغرفة (مفتاح خارجي).
- `user_id`: معرف المستخدم المرسل (مفتاح خارجي).
- `message`: نص الرسالة (مشفر).
- `is_encrypted`: مؤشر ما إذا كانت الرسالة مشفرة.
- `created_at`: تاريخ ووقت إرسال الرسالة.

### 5. جدول حالة قراءة الرسائل (`message_read_status`)

يتتبع حالة قراءة الرسائل لكل مستخدم:

- `id`: معرف فريد للسجل (مفتاح أساسي).
- `message_id`: معرف الرسالة (مفتاح خارجي).
- `user_id`: معرف المستخدم (مفتاح خارجي).
- `is_read`: مؤشر ما إذا كانت الرسالة مقروءة.
- `read_at`: تاريخ ووقت قراءة الرسالة.

### 6. جدول نشاطات المستخدمين (`user_activities`)

يسجل نشاطات المستخدمين في النظام:

- `id`: معرف فريد للنشاط (مفتاح أساسي).
- `user_id`: معرف المستخدم (مفتاح خارجي).
- `activity_type`: نوع النشاط (تسجيل دخول، تعديل بيانات، إلخ).
- `description`: وصف النشاط.
- `ip_address`: عنوان IP للمستخدم.
- `user_agent`: معلومات متصفح المستخدم.
- `created_at`: تاريخ ووقت النشاط.

### 7. جدول نشاطات الغرف (`room_activities`)

يسجل النشاطات التي تحدث في الغرف:

- `id`: معرف فريد للنشاط (مفتاح أساسي).
- `room_id`: معرف الغرفة (مفتاح خارجي).
- `user_id`: معرف المستخدم (مفتاح خارجي).
- `activity_type`: نوع النشاط (إنشاء، تعديل، دخول، خروج).
- `description`: وصف النشاط.
- `created_at`: تاريخ ووقت النشاط.

### 8. جدول الإعدادات العامة (`settings`)

يخزن إعدادات النظام العامة:

- `id`: معرف فريد للإعداد (مفتاح أساسي).
- `setting_key`: مفتاح الإعداد (فريد).
- `setting_value`: قيمة الإعداد.
- `setting_description`: وصف الإعداد.
- `is_public`: مؤشر ما إذا كان الإعداد عامًا (مرئي للجميع).
- `created_at`: تاريخ ووقت إنشاء الإعداد.
- `updated_at`: تاريخ ووقت آخر تحديث للإعداد.

## العلاقات بين الجداول

1. **علاقة المستخدمين والغرف**:
   - المستخدم يمكنه الوصول إلى عدة غرف من خلال جدول `room_users`.
   - الغرفة يمكن أن يصل إليها عدة مستخدمين من خلال جدول `room_users`.
   - علاقة متعددة-لمتعددة (Many-to-Many).

2. **علاقة المستخدمين والرسائل**:
   - المستخدم يمكنه إرسال عدة رسائل.
   - الرسالة ترتبط بمستخدم واحد فقط (المرسل).
   - علاقة واحد-لمتعدد (One-to-Many).

3. **علاقة الغرف والرسائل**:
   - الغرفة يمكن أن تحتوي على عدة رسائل.
   - الرسالة تنتمي إلى غرفة واحدة فقط.
   - علاقة واحد-لمتعدد (One-to-Many).

4. **علاقة الرسائل وحالة القراءة**:
   - الرسالة يمكن أن يكون لها عدة سجلات قراءة (لكل مستخدم).
   - سجل القراءة يرتبط برسالة واحدة ومستخدم واحد.
   - علاقة واحد-لمتعدد (One-to-Many).

5. **علاقة النشاطات**:
   - المستخدم يمكن أن يكون له عدة نشاطات.
   - الغرفة يمكن أن يكون لها عدة نشاطات.
   - علاقة واحد-لمتعدد (One-to-Many).

## ملاحظات حول قاعدة البيانات

1. **التشفير**:
   - كلمات المرور تُخزن مشفرة باستخدام bcrypt.
   - الرسائل تُخزن مشفرة باستخدام AES-256-CBC.
   - كل غرفة لها مفتاح تشفير خاص بها.

2. **الفهارس (Indexes)**:
   - تم إنشاء فهارس على الحقول المستخدمة بكثرة في عمليات البحث لتحسين الأداء.
   - تم استخدام فهارس مركبة في بعض الحالات (مثل `room_time` في جدول الرسائل).

3. **القيود (Constraints)**:
   - تم استخدام قيود المفاتيح الخارجية مع خاصية `ON DELETE CASCADE` لضمان سلامة البيانات.
   - تم استخدام قيود الحقول الفريدة (UNIQUE) لمنع تكرار البيانات المهمة.

4. **توافق Unicode**:
   - تم استخدام مجموعة الأحرف `utf8mb4` مع الترتيب `utf8mb4_unicode_ci` لدعم كامل لجميع أحرف Unicode، بما في ذلك الأحرف العربية وال Emojis.

5. **البيانات الأولية**:
   - تم إضافة بيانات أولية تشمل حسابين (مسؤول ومستخدم عادي) وغرفة افتراضية واحدة.
   - كلمات المرور الافتراضية: `admin123` للمسؤول و `user123` للمستخدم العادي.
