
-- إنشاء قاعدة البيانات
CREATE DATABASE secure_chat_rbac CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE secure_chat_rbac;

-- جدول المستخدمين
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastLogin TIMESTAMP NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    banned BOOLEAN NOT NULL DEFAULT FALSE,
    bannedUntil TIMESTAMP NULL
);

-- جدول الصلاحيات
CREATE TABLE permissions (
    userId VARCHAR(36) PRIMARY KEY,
    canCreateRoom BOOLEAN NOT NULL DEFAULT FALSE,
    canUploadFiles BOOLEAN NOT NULL DEFAULT FALSE,
    canDeleteMessages BOOLEAN NOT NULL DEFAULT FALSE,
    canBanUsers BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول الغرف
CREATE TABLE rooms (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    createdBy VARCHAR(36) NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isPrivate BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- جدول المستخدمين المسموح لهم في الغرف الخاصة
CREATE TABLE room_users (
    roomId VARCHAR(36) NOT NULL,
    userId VARCHAR(36) NOT NULL,
    PRIMARY KEY (roomId, userId),
    FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول الرسائل
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    roomId VARCHAR(36) NOT NULL,
    senderId VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isEncrypted BOOLEAN NOT NULL DEFAULT TRUE,
    hasAttachment BOOLEAN NOT NULL DEFAULT FALSE,
    attachmentUrl VARCHAR(255) NULL,
    FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (senderId) REFERENCES users(id)
);

-- جدول إعدادات النظام
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    settingKey VARCHAR(255) NOT NULL UNIQUE,
    settingValue TEXT,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- جدول سجل المراقبة
CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ipAddress VARCHAR(45),
    FOREIGN KEY (userId) REFERENCES users(id)
);

-- جدول جلسات المستخدمين
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    ipAddress VARCHAR(45) NOT NULL,
    userAgent TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiresAt TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول محاولات تسجيل الدخول
CREATE TABLE login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    ipAddress VARCHAR(45) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL
);

-- إنشاء المستخدم المسؤول الافتراضي
INSERT INTO users (id, username, password, role, createdAt, active)
VALUES ('admin1', 'المسؤول', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NOW(), TRUE);

-- إضافة صلاحيات المسؤول
INSERT INTO permissions (userId, canCreateRoom, canUploadFiles, canDeleteMessages, canBanUsers)
VALUES ('admin1', TRUE, TRUE, TRUE, TRUE);

-- إنشاء مستخدم عادي افتراضي
INSERT INTO users (id, username, password, role, createdAt, active)
VALUES ('client1', 'مستخدم عادي', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client', NOW(), TRUE);

-- إضافة صلاحيات المستخدم العادي
INSERT INTO permissions (userId, canCreateRoom, canUploadFiles, canDeleteMessages, canBanUsers)
VALUES ('client1', FALSE, FALSE, FALSE, FALSE);

-- إنشاء غرفة عامة افتراضية
INSERT INTO rooms (id, name, description, createdBy, createdAt, isPrivate)
VALUES ('room1', 'غرفة عامة', 'غرفة محادثة عامة لجميع المستخدمين', 'admin1', NOW(), FALSE);

-- إضافة رسالة ترحيب افتراضية (محتوى مشفر وهمي)
INSERT INTO messages (id, roomId, senderId, content, timestamp, isEncrypted)
VALUES ('msg1', 'room1', 'admin1', 'ZW5jcnlwdGVkOm1lcmhhYmFuIGJpa29tIGZpIG5pZGhhbSBhbGRyZHNoYSBhbG1zaGZy', NOW(), TRUE);

-- إضافة إعدادات النظام الافتراضية
INSERT INTO system_settings (settingKey, settingValue) VALUES 
('encryptionAlgorithm', 'AES-256'),
('messageRetentionDays', '30'),
('enableAuditLog', 'true'),
('defaultPermissions', '{"canCreateRoom":false,"canUploadFiles":false,"canDeleteMessages":false,"canBanUsers":false}');

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_messages_room ON messages(roomId);
CREATE INDEX idx_messages_sender ON messages(senderId);
CREATE INDEX idx_rooms_creator ON rooms(createdBy);
CREATE INDEX idx_audit_log_user ON audit_log(userId);
CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ipAddress);
CREATE INDEX idx_user_sessions_user ON user_sessions(userId);
