
# مستند المرجع البرمجي (API Reference)

## مرجع واجهة برمجة التطبيقات (API) لنظام الدردشة المشفر

هذا المستند يوضح واجهات برمجة التطبيقات (APIs) المتاحة في النسخة الحالية من النظام والتي يمكن استخدامها لتطوير واجهات أو تكاملات إضافية.

## 🔐 وحدة المصادقة والأمان (auth.ts)

### المستخدمين والأدوار

```typescript
// أنواع المستخدمين والأدوار
export type UserRole = 'admin' | 'client';

// تعريف الصلاحيات
export interface Permission {
  canCreateRoom: boolean;
  canUploadFiles: boolean;
  canDeleteMessages: boolean;
  canBanUsers: boolean;
}

// تعريف المستخدم
export interface User {
  id: string;
  username: string;
  role: UserRole;
  permissions: Permission;
  createdAt: string;
  lastLogin: string;
  active: boolean;
  banned: boolean;
  bannedUntil?: string;
}
```

### دوال المصادقة

#### تهيئة النظام
```typescript
// تهيئة نظام المصادقة
export const initializeAuth = (): void
```
تقوم بتهيئة نظام المصادقة وإنشاء المستخدمين الافتراضيين إذا لم تكن موجودة.

#### تسجيل الدخول
```typescript
// دالة المصادقة
export const authenticateUser = (username: string, password: string): User | null
```
تتحقق من صحة بيانات المستخدم وترجع كائن المستخدم في حالة نجاح تسجيل الدخول.

#### تسجيل الخروج
```typescript
// تسجيل خروج المستخدم
export const logoutUser = (): void
```
تقوم بإزالة بيانات جلسة المستخدم الحالي وإعادة التوجيه إلى صفحة تسجيل الدخول.

#### الحصول على المستخدم الحالي
```typescript
// الحصول على المستخدم الحالي
export const getCurrentUser = (): User | null
```
ترجع بيانات المستخدم الذي قام بتسجيل الدخول حالياً.

#### التحقق من الصلاحيات
```typescript
// التحقق من صلاحيات المستخدم
export const checkPermission = (permission: keyof Permission): boolean
```
تتحقق ما إذا كان المستخدم الحالي يملك صلاحية محددة.

### إدارة المستخدمين

#### إضافة مستخدم جديد
```typescript
// إضافة مستخدم جديد (للمسؤول فقط)
export const addUser = (newUser: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): boolean
```
تضيف مستخدم جديد إلى النظام (متاحة للمسؤول فقط).

#### تحديث صلاحيات المستخدم
```typescript
// تحديث صلاحيات المستخدم (للمسؤول فقط)
export const updateUserPermissions = (userId: string, permissions: Permission): boolean
```
تقوم بتحديث صلاحيات مستخدم محدد.

#### حظر/إلغاء حظر مستخدم
```typescript
// حظر/إلغاء حظر مستخدم (للمسؤول فقط)
export const toggleUserBan = (userId: string, ban: boolean, until?: Date): boolean
```
تقوم بحظر أو إلغاء حظر مستخدم محدد.

#### الحصول على جميع المستخدمين
```typescript
// الحصول على جميع المستخدمين (للمسؤول فقط)
export const getAllUsers = (): User[] | null
```
ترجع قائمة بجميع المستخدمين المسجلين في النظام.

### وظائف التشفير

#### تشفير البيانات
```typescript
// تشفير البيانات
export const encryptData = (data: string): string
```
تقوم بتشفير البيانات المدخلة.

#### فك تشفير البيانات
```typescript
// فك تشفير البيانات
export const decryptData = (encryptedData: string): string
```
تقوم بفك تشفير البيانات المشفرة.

## 💬 وحدة الدردشة (chat.ts)

### تعريف الكائنات

```typescript
// تعريف غرفة الدردشة
export interface Room {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  isPrivate: boolean;
  allowedUsers: string[];
}

// تعريف الرسالة
export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isEncrypted: boolean;
  hasAttachment: boolean;
  attachmentUrl?: string;
}
```

### إدارة الغرف

#### تهيئة نظام الدردشة
```typescript
// تهيئة نظام الدردشة
export const initializeChat = (): void
```
تقوم بتهيئة نظام الدردشة وإنشاء الغرف الافتراضية إذا لم تكن موجودة.

#### الحصول على قائمة الغرف
```typescript
// الحصول على قائمة الغرف
export const getRooms = (): Room[]
```
ترجع قائمة بالغرف المتاحة للمستخدم الحالي.

#### الحصول على غرفة محددة
```typescript
// الحصول على غرفة محددة
export const getRoom = (roomId: string): Room | null
```
ترجع بيانات غرفة محددة بواسطة المعرف.

#### إنشاء غرفة جديدة
```typescript
// إنشاء غرفة جديدة
export const createRoom = (room: Omit<Room, 'id' | 'createdBy' | 'createdAt'>): Room | null
```
تنشئ غرفة دردشة جديدة.

### إدارة الرسائل

#### الحصول على رسائل غرفة معينة
```typescript
// الحصول على رسائل غرفة معينة
export const getRoomMessages = (roomId: string): Message[]
```
ترجع قائمة بالرسائل الموجودة في غرفة محددة.

#### إرسال رسالة جديدة
```typescript
// إرسال رسالة جديدة
export const sendMessage = (
  roomId: string, 
  content: string, 
  attachment?: File
): Message | null
```
تقوم بإرسال رسالة جديدة إلى غرفة محددة، مع إمكانية إرفاق ملف.

#### حذف رسالة
```typescript
// حذف رسالة
export const deleteMessage = (messageId: string): boolean
```
تقوم بحذف رسالة محددة (للمسؤول أو صاحب الرسالة مع صلاحية الحذف).

### إدارة المستخدمين في الغرف

#### إضافة مستخدم إلى غرفة خاصة
```typescript
// إضافة مستخدم إلى غرفة خاصة
export const addUserToRoom = (roomId: string, userId: string): boolean
```
تضيف مستخدم إلى غرفة خاصة.

#### إزالة مستخدم من غرفة خاصة
```typescript
// إزالة مستخدم من غرفة خاصة
export const removeUserFromRoom = (roomId: string, userId: string): boolean
```
تزيل مستخدم من غرفة خاصة.

## 💻 مكونات واجهة المستخدم

### صفحات النظام

#### صفحة تسجيل الدخول (Index.tsx)
الصفحة الرئيسية للنظام والتي تحتوي على نموذج تسجيل الدخول.

#### لوحة تحكم المسؤول (Dashboard.tsx)
لوحة تحكم كاملة للمسؤول تتيح له إدارة المستخدمين والغرف.

#### صفحة الدردشة (Chat.tsx)
صفحة للدردشة في الغرف المتاحة للمستخدم.

#### صفحة إضافة مستخدم (UserAdd.tsx)
صفحة لإضافة مستخدم جديد بواسطة المسؤول.

#### صفحة تعديل بيانات المستخدم (UserEdit.tsx)
صفحة لتعديل بيانات وصلاحيات مستخدم موجود.

#### صفحة إضافة غرفة (RoomAdd.tsx)
صفحة لإنشاء غرفة دردشة جديدة.

#### صفحة تعديل غرفة (RoomEdit.tsx)
صفحة لتعديل بيانات غرفة موجودة.

#### صفحة إعدادات النظام (SystemSettings.tsx)
صفحة لضبط إعدادات النظام المختلفة.

## 🔄 دورة حياة الطلبات

### تسجيل الدخول
1. يقوم المستخدم بإدخال اسم المستخدم وكلمة المرور
2. يتم استدعاء `authenticateUser` للتحقق من البيانات
3. في حالة النجاح، يتم تخزين بيانات المستخدم في `localStorage`
4. يتم توجيه المستخدم إلى الصفحة المناسبة حسب دوره

### إرسال رسالة
1. يقوم المستخدم بكتابة رسالة وإرسالها
2. يتم استدعاء `sendMessage` لإرسال الرسالة
3. يتم تشفير محتوى الرسالة باستخدام `encryptData`
4. يتم تخزين الرسالة المشفرة في `localStorage`
5. يتم عرض الرسالة في واجهة المستخدم

### إدارة المستخدمين
1. يقوم المسؤول بإضافة مستخدم جديد أو تعديل بيانات مستخدم موجود
2. يتم استدعاء `addUser` أو `updateUserPermissions`
3. يتم تحديث بيانات المستخدمين في `localStorage`
4. يتم عرض رسالة تأكيد للمسؤول

## 🚀 التطوير المستقبلي

### واجهات برمجة إضافية مقترحة
- واجهة برمجة للمصادقة الثنائية (2FA)
- واجهة برمجة للإشعارات في الوقت الحقيقي
- واجهة برمجة لمكالمات الفيديو والصوت
- واجهة برمجة للنسخ الاحتياطي واستعادة البيانات

### تحسينات مقترحة
- تحويل النظام من استخدام `localStorage` إلى قاعدة بيانات حقيقية
- إضافة دعم WebSockets للاتصال في الوقت الحقيقي
- تحسين أمان النظام باستخدام تقنيات أكثر تقدماً
- إضافة دعم للمصادقة الخارجية (OAuth, OpenID)
