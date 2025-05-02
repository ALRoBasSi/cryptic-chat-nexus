
import { toast } from "@/components/ui/use-toast";

// تعريف أنواع المستخدمين والأدوار
export type UserRole = 'admin' | 'client';

export interface Permission {
  canCreateRoom: boolean;
  canUploadFiles: boolean;
  canDeleteMessages: boolean;
  canBanUsers: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string; // إضافة حقل كلمة المرور كحقل اختياري
  role: UserRole;
  permissions: Permission;
  createdAt: string;
  lastLogin: string;
  active: boolean;
  banned: boolean;
  bannedUntil?: string;
}

// مستخدمين افتراضيين للنظام
const defaultUsers: User[] = [
  {
    id: "admin1",
    username: "المسؤول",
    role: "admin",
    permissions: {
      canCreateRoom: true,
      canUploadFiles: true,
      canDeleteMessages: true,
      canBanUsers: true
    },
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    active: true,
    banned: false
  },
  {
    id: "client1",
    username: "مستخدم عادي",
    role: "client",
    permissions: {
      canCreateRoom: false,
      canUploadFiles: false,
      canDeleteMessages: false,
      canBanUsers: false
    },
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    active: true,
    banned: false
  }
];

// محاكاة قاعدة بيانات بسيطة باستخدام localStorage
export const initializeAuth = () => {
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify(defaultUsers));
  }
};

// دالة المصادقة
export const authenticateUser = (username: string, password: string): User | null => {
  // في بيئة حقيقية، نتحقق من كلمة المرور باستخدام bcrypt
  // هنا، نستخدم محاكاة بسيطة للتوضيح

  initializeAuth();
  const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
  
  // تحويل كلمة المرور إلى كلمة مرور ثابتة "password" لأغراض العرض التوضيحي
  // في التطبيق الحقيقي، نقوم بالتحقق من تجزئة كلمة المرور بشكل آمن
  if (password !== "password") {
    return null;
  }
  
  const user = users.find(u => u.username === username && u.active && !u.banned);
  
  if (user) {
    // تحديث وقت آخر تسجيل دخول
    user.lastLogin = new Date().toISOString();
    localStorage.setItem('users', JSON.stringify(users));
    // تخزين المستخدم في الجلسة الحالية
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  }
  
  return null;
};

// تسجيل خروج المستخدم
export const logoutUser = () => {
  localStorage.removeItem('currentUser');
  window.location.href = '/';
};

// الحصول على المستخدم الحالي
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('currentUser');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
};

// التحقق من صلاحيات المستخدم
export const checkPermission = (permission: keyof Permission): boolean => {
  const user = getCurrentUser();
  if (!user) return false;
  
  // المسؤول يملك جميع الصلاحيات
  if (user.role === 'admin') return true;
  
  // التحقق من صلاحية محددة
  return user.permissions[permission] || false;
};

// إضافة مستخدم جديد (للمسؤول فقط)
export const addUser = (newUser: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): boolean => {
  const currentUser = getCurrentUser();
  
  if (!currentUser || currentUser.role !== 'admin') {
    toast({
      title: "غير مصرح",
      description: "ليس لديك صلاحية لإضافة مستخدمين جدد",
      variant: "destructive"
    });
    return false;
  }
  
  const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
  
  // التحقق من وجود اسم المستخدم
  if (users.some(u => u.username === newUser.username)) {
    toast({
      title: "خطأ",
      description: "اسم المستخدم موجود بالفعل",
      variant: "destructive"
    });
    return false;
  }
  
  const userToAdd: User = {
    ...newUser,
    id: `user${Date.now()}`,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  
  users.push(userToAdd);
  localStorage.setItem('users', JSON.stringify(users));
  
  toast({
    title: "تمت الإضافة",
    description: `تمت إضافة المستخدم ${newUser.username} بنجاح`,
  });
  
  return true;
};

// تحديث صلاحيات المستخدم (للمسؤول فقط)
export const updateUserPermissions = (userId: string, permissions: Permission): boolean => {
  const currentUser = getCurrentUser();
  
  if (!currentUser || currentUser.role !== 'admin') {
    toast({
      title: "غير مصرح",
      description: "ليس لديك صلاحية لتعديل صلاحيات المستخدمين",
      variant: "destructive"
    });
    return false;
  }
  
  const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    toast({
      title: "خطأ",
      description: "المستخدم غير موجود",
      variant: "destructive"
    });
    return false;
  }
  
  users[userIndex].permissions = permissions;
  localStorage.setItem('users', JSON.stringify(users));
  
  toast({
    title: "تم التحديث",
    description: "تم تحديث صلاحيات المستخدم بنجاح",
  });
  
  return true;
};

// حظر/إلغاء حظر مستخدم (للمسؤول فقط)
export const toggleUserBan = (userId: string, ban: boolean, until?: Date): boolean => {
  const currentUser = getCurrentUser();
  
  if (!currentUser || currentUser.role !== 'admin') {
    toast({
      title: "غير مصرح",
      description: "ليس لديك صلاحية لحظر المستخدمين",
      variant: "destructive"
    });
    return false;
  }
  
  const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    toast({
      title: "خطأ",
      description: "المستخدم غير موجود",
      variant: "destructive"
    });
    return false;
  }
  
  // لا يمكن حظر المسؤول
  if (users[userIndex].role === 'admin') {
    toast({
      title: "خطأ",
      description: "لا يمكن حظر حساب المسؤول",
      variant: "destructive"
    });
    return false;
  }
  
  users[userIndex].banned = ban;
  users[userIndex].bannedUntil = until ? until.toISOString() : undefined;
  
  localStorage.setItem('users', JSON.stringify(users));
  
  toast({
    title: ban ? "تم الحظر" : "تم إلغاء الحظر",
    description: ban 
      ? `تم حظر المستخدم ${users[userIndex].username} بنجاح` 
      : `تم إلغاء حظر المستخدم ${users[userIndex].username} بنجاح`,
  });
  
  return true;
};

// الحصول على جميع المستخدمين (للمسؤول فقط)
export const getAllUsers = (): User[] | null => {
  const currentUser = getCurrentUser();
  
  if (!currentUser || currentUser.role !== 'admin') {
    toast({
      title: "غير مصرح",
      description: "ليس لديك صلاحية لعرض قائمة المستخدمين",
      variant: "destructive"
    });
    return null;
  }
  
  return JSON.parse(localStorage.getItem('users') || '[]') as User[];
};

// محاكاة تشفير البيانات (في النسخة الحقيقية نستخدم خوارزميات تشفير قوية)
export const encryptData = (data: string): string => {
  // محاكاة تشفير بسيط (لا تستخدم هذا في الإنتاج)
  // تعديل الوظيفة لتتعامل مع النصوص العربية
  return btoa(unescape(encodeURIComponent(`encrypted:${data}`)));
};

// محاكاة فك تشفير البيانات
export const decryptData = (encryptedData: string): string => {
  try {
    // محاكاة فك تشفير بسيط (لا تستخدم هذا في الإنتاج)
    // تعديل الوظيفة لتتعامل مع النصوص العربية
    const decoded = decodeURIComponent(escape(atob(encryptedData)));
    return decoded.startsWith('encrypted:') 
      ? decoded.substring(10) 
      : decoded;
  } catch {
    return encryptedData;
  }
};
