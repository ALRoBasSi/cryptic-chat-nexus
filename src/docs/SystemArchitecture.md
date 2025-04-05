
# المخطط المعماري لنظام الدردشة المشفر

## النموذج الأولي (الحالي)

```mermaid
flowchart TD
    subgraph Frontend
        UI[واجهة المستخدم React + TailwindCSS]
        Auth[مكونات المصادقة]
        Chat[مكونات الدردشة]
        Admin[لوحة تحكم المسؤول]
    end
    
    subgraph Storage/State
        LS[localStorage]
        State[React Query State]
    end
    
    subgraph Security
        Encrypt[وحدة التشفير AES-256]
        RBAC[نظام التحكم في الصلاحيات]
    end
    
    Frontend <--> Storage/State
    Frontend <--> Security
    
    UI --> Auth & Chat & Admin
    LS --> Encrypt
    State --> RBAC
```

## الهيكل المعماري المقترح للإنتاج

```mermaid
flowchart TD
    subgraph Frontend
        UI[واجهة المستخدم React + TailwindCSS]
        Auth[مكونات المصادقة]
        Chat[مكونات الدردشة]
        Admin[لوحة تحكم المسؤول]
    end
    
    subgraph Backend
        API[واجهة برمجة التطبيقات RESTful]
        Auth_Service[خدمة المصادقة والتحقق]
        Chat_Service[خدمة الدردشة]
        Admin_Service[خدمة إدارة النظام]
        Security_Service[خدمة الأمان والتشفير]
    end
    
    subgraph Realtime
        WebSockets[خدمة WebSockets]
        Notifications[خدمة الإشعارات]
    end
    
    subgraph Database
        MySQL[(قاعدة بيانات MySQL)]
        Redis[(Redis للجلسات والتخزين المؤقت)]
    end
    
    UI <--> API
    UI <--> WebSockets
    
    API --> Auth_Service & Chat_Service & Admin_Service & Security_Service
    WebSockets --> Chat_Service & Notifications
    
    Auth_Service & Chat_Service & Admin_Service & Security_Service <--> MySQL
    Auth_Service & Notifications <--> Redis
    
    subgraph Security_Layer
        SSL[طبقة SSL/TLS]
        Encryption[تشفير البيانات]
        JWT[توثيق JWT]
        RBAC[نظام التحكم بالصلاحيات]
        Rate_Limiting[تقييد معدل الطلبات]
    end
    
    UI --> SSL
    API --> SSL
    WebSockets --> SSL
    
    Auth_Service --> JWT & RBAC
    Security_Service --> Encryption
    API --> Rate_Limiting
```

## مخطط تدفق المستخدم للمصادقة

```mermaid
sequenceDiagram
    actor User as المستخدم
    participant UI as واجهة المستخدم
    participant API as واجهة برمجة التطبيقات
    participant Auth as خدمة المصادقة
    participant DB as قاعدة البيانات
    
    User->>UI: إدخال اسم المستخدم وكلمة المرور
    UI->>API: إرسال بيانات تسجيل الدخول
    API->>Auth: التحقق من البيانات
    Auth->>DB: البحث عن المستخدم
    DB-->>Auth: معلومات المستخدم
    Auth->>Auth: التحقق من كلمة المرور
    Auth->>Auth: إنشاء JWT token
    Auth-->>API: إعادة الرمز وبيانات المستخدم
    API-->>UI: إعادة الرمز وبيانات المستخدم
    UI->>UI: تخزين الرمز في localStorage
    UI-->>User: إعادة توجيه المستخدم حسب الدور
```

## مخطط تدفق إرسال الرسائل المشفرة

```mermaid
sequenceDiagram
    actor User as المستخدم
    participant UI as واجهة المستخدم
    participant WS as WebSockets
    participant Chat as خدمة الدردشة
    participant Security as خدمة الأمان
    participant DB as قاعدة البيانات
    
    User->>UI: كتابة رسالة
    User->>UI: إرسال الرسالة
    UI->>WS: إرسال محتوى الرسالة
    WS->>Chat: معالجة الرسالة
    Chat->>Security: تشفير محتوى الرسالة
    Security-->>Chat: الرسالة المشفرة
    Chat->>DB: تخزين الرسالة المشفرة
    Chat->>WS: إرسال الرسالة لجميع المستخدمين في الغرفة
    WS-->>UI: استقبال الرسالة
    UI-->>User: عرض الرسالة
```

## نموذج قاعدة البيانات (ER Diagram)

```mermaid
erDiagram
    USERS ||--o{ PERMISSIONS : has
    USERS ||--o{ ROOMS : creates
    USERS ||--o{ MESSAGES : sends
    USERS }|--o{ ROOM_USERS : joins
    ROOMS ||--o{ MESSAGES : contains
    ROOMS }|--o{ ROOM_USERS : includes
    USERS ||--o{ AUDIT_LOG : generates
    USERS ||--o{ USER_SESSIONS : authenticates
    SYSTEM_SETTINGS ||--o| SYSTEM : configures

    USERS {
        string id PK
        string username
        string password
        enum role
        timestamp createdAt
        timestamp lastLogin
        boolean active
        boolean banned
        timestamp bannedUntil
    }

    PERMISSIONS {
        string userId PK,FK
        boolean canCreateRoom
        boolean canUploadFiles
        boolean canDeleteMessages
        boolean canBanUsers
    }

    ROOMS {
        string id PK
        string name
        string description
        string createdBy FK
        timestamp createdAt
        boolean isPrivate
    }

    ROOM_USERS {
        string roomId PK,FK
        string userId PK,FK
    }

    MESSAGES {
        string id PK
        string roomId FK
        string senderId FK
        string content
        timestamp timestamp
        boolean isEncrypted
        boolean hasAttachment
        string attachmentUrl
    }

    SYSTEM_SETTINGS {
        int id PK
        string settingKey
        string settingValue
        timestamp updatedAt
    }

    AUDIT_LOG {
        int id PK
        string userId FK
        string action
        string details
        timestamp timestamp
        string ipAddress
    }

    USER_SESSIONS {
        string id PK
        string userId FK
        string ipAddress
        string userAgent
        timestamp createdAt
        timestamp expiresAt
    }
```
