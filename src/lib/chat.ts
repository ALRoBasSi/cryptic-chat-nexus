
import { User, encryptData, decryptData, getCurrentUser, checkPermission } from "./auth";
import { toast } from "@/components/ui/use-toast";

export interface Room {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  isPrivate: boolean;
  allowedUsers: string[];
}

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

// تهيئة نظام الدردشة
export const initializeChat = () => {
  if (!localStorage.getItem('rooms')) {
    const defaultRooms: Room[] = [
      {
        id: "room1",
        name: "غرفة عامة",
        description: "غرفة محادثة عامة لجميع المستخدمين",
        createdBy: "admin1",
        createdAt: new Date().toISOString(),
        isPrivate: false,
        allowedUsers: []
      }
    ];
    localStorage.setItem('rooms', JSON.stringify(defaultRooms));
  }
  
  if (!localStorage.getItem('messages')) {
    const welcomeMessage: Message = {
      id: "msg1",
      roomId: "room1",
      senderId: "admin1",
      senderName: "المسؤول",
      content: encryptData("مرحباً بكم في نظام الدردشة المشفر الخاص!"),
      timestamp: new Date().toISOString(),
      isEncrypted: true,
      hasAttachment: false
    };
    localStorage.setItem('messages', JSON.stringify([welcomeMessage]));
  }
};

// الحصول على قائمة الغرف
export const getRooms = (): Room[] => {
  initializeChat();
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  
  const rooms = JSON.parse(localStorage.getItem('rooms') || '[]') as Room[];
  
  // المسؤول يرى جميع الغرف
  if (currentUser.role === 'admin') {
    return rooms;
  }
  
  // المستخدم العادي يرى الغرف العامة والغرف الخاصة المصرح له بها
  return rooms.filter(room => 
    !room.isPrivate || room.allowedUsers.includes(currentUser.id)
  );
};

// الحصول على غرفة محددة
export const getRoom = (roomId: string): Room | null => {
  const rooms = getRooms();
  return rooms.find(room => room.id === roomId) || null;
};

// إنشاء غرفة جديدة
export const createRoom = (room: Omit<Room, 'id' | 'createdBy' | 'createdAt'>): Room | null => {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;
  
  // التحقق من الصلاحية
  if (currentUser.role !== 'admin' && !checkPermission('canCreateRoom')) {
    toast({
      title: "غير مصرح",
      description: "ليس لديك صلاحية لإنشاء غرف جديدة",
      variant: "destructive"
    });
    return null;
  }
  
  const rooms = JSON.parse(localStorage.getItem('rooms') || '[]') as Room[];
  
  const newRoom: Room = {
    ...room,
    id: `room${Date.now()}`,
    createdBy: currentUser.id,
    createdAt: new Date().toISOString()
  };
  
  rooms.push(newRoom);
  localStorage.setItem('rooms', JSON.stringify(rooms));
  
  toast({
    title: "تم الإنشاء",
    description: `تم إنشاء الغرفة ${room.name} بنجاح`,
  });
  
  return newRoom;
};

// الحصول على رسائل غرفة معينة
export const getRoomMessages = (roomId: string): Message[] => {
  initializeChat();
  const messages = JSON.parse(localStorage.getItem('messages') || '[]') as Message[];
  
  // ترجيع الرسائل الخاصة بالغرفة المحددة بعد فك تشفيرها
  return messages
    .filter(msg => msg.roomId === roomId)
    .map(msg => ({
      ...msg,
      content: msg.isEncrypted ? decryptData(msg.content) : msg.content,
      isEncrypted: false // بعد فك التشفير نضع القيمة كـ false
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

// إرسال رسالة جديدة
export const sendMessage = (
  roomId: string, 
  content: string, 
  attachment?: File
): Message | null => {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;
  
  const room = getRoom(roomId);
  if (!room) {
    toast({
      title: "خطأ",
      description: "الغرفة غير موجودة",
      variant: "destructive"
    });
    return null;
  }
  
  // التحقق من الصلاحية إذا كانت غرفة خاصة
  if (room.isPrivate && 
      currentUser.role !== 'admin' && 
      !room.allowedUsers.includes(currentUser.id)) {
    toast({
      title: "غير مصرح",
      description: "ليس لديك صلاحية للمشاركة في هذه الغرفة",
      variant: "destructive"
    });
    return null;
  }
  
  // التحقق من صلاحية إرسال مرفقات
  if (attachment && !checkPermission('canUploadFiles') && currentUser.role !== 'admin') {
    toast({
      title: "غير مصرح",
      description: "ليس لديك صلاحية لإرسال ملفات مرفقة",
      variant: "destructive"
    });
    return null;
  }
  
  // تشفير محتوى الرسالة
  const encryptedContent = encryptData(content);
  
  const messages = JSON.parse(localStorage.getItem('messages') || '[]') as Message[];
  
  // في النسخة الحقيقية، نقوم برفع الملف إلى الخادم
  let attachmentUrl = undefined;
  if (attachment) {
    // محاكاة عنوان URL للملف المرفق (في النسخة الحقيقية سيكون هذا رابط حقيقي)
    attachmentUrl = `fake-url://${attachment.name}`;
  }
  
  const newMessage: Message = {
    id: `msg${Date.now()}`,
    roomId,
    senderId: currentUser.id,
    senderName: currentUser.username,
    content: encryptedContent,
    timestamp: new Date().toISOString(),
    isEncrypted: true,
    hasAttachment: !!attachment,
    attachmentUrl
  };
  
  messages.push(newMessage);
  localStorage.setItem('messages', JSON.stringify(messages));
  
  // إرجاع نسخة غير مشفرة من الرسالة للعرض
  return {
    ...newMessage,
    content, // نسخة واضحة للعرض
    isEncrypted: false
  };
};

// حذف رسالة
export const deleteMessage = (messageId: string): boolean => {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  
  // فقط المسؤول أو مستخدم لديه صلاحية حذف الرسائل
  if (currentUser.role !== 'admin' && !checkPermission('canDeleteMessages')) {
    toast({
      title: "غير مصرح",
      description: "ليس لديك صلاحية لحذف الرسائل",
      variant: "destructive"
    });
    return false;
  }
  
  const messages = JSON.parse(localStorage.getItem('messages') || '[]') as Message[];
  const messageIndex = messages.findIndex(msg => msg.id === messageId);
  
  if (messageIndex === -1) {
    toast({
      title: "خطأ",
      description: "الرسالة غير موجودة",
      variant: "destructive"
    });
    return false;
  }
  
  // المستخدم العادي يمكنه فقط حذف رسائله الشخصية
  if (currentUser.role !== 'admin' && messages[messageIndex].senderId !== currentUser.id) {
    toast({
      title: "غير مصرح",
      description: "لا يمكنك حذف رسائل المستخدمين الآخرين",
      variant: "destructive"
    });
    return false;
  }
  
  // حذف الرسالة
  messages.splice(messageIndex, 1);
  localStorage.setItem('messages', JSON.stringify(messages));
  
  toast({
    title: "تم الحذف",
    description: "تم حذف الرسالة بنجاح",
  });
  
  return true;
};

// إضافة مستخدم إلى غرفة خاصة
export const addUserToRoom = (roomId: string, userId: string): boolean => {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    toast({
      title: "غير مصرح",
      description: "ليس لديك صلاحية لإدارة الغرف",
      variant: "destructive"
    });
    return false;
  }
  
  const rooms = JSON.parse(localStorage.getItem('rooms') || '[]') as Room[];
  const roomIndex = rooms.findIndex(room => room.id === roomId);
  
  if (roomIndex === -1) {
    toast({
      title: "خطأ",
      description: "الغرفة غير موجودة",
      variant: "destructive"
    });
    return false;
  }
  
  // التحقق من أن الغرفة خاصة
  if (!rooms[roomIndex].isPrivate) {
    toast({
      title: "خطأ",
      description: "لا داعي لإضافة مستخدمين إلى غرفة عامة",
      variant: "destructive"
    });
    return false;
  }
  
  // التحقق من أن المستخدم غير موجود بالفعل
  if (rooms[roomIndex].allowedUsers.includes(userId)) {
    toast({
      title: "تنبيه",
      description: "المستخدم موجود بالفعل في هذه الغرفة",
    });
    return false;
  }
  
  // إضافة المستخدم إلى الغرفة
  rooms[roomIndex].allowedUsers.push(userId);
  localStorage.setItem('rooms', JSON.stringify(rooms));
  
  toast({
    title: "تمت الإضافة",
    description: "تمت إضافة المستخدم إلى الغرفة بنجاح",
  });
  
  return true;
};

// إزالة مستخدم من غرفة خاصة
export const removeUserFromRoom = (roomId: string, userId: string): boolean => {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    toast({
      title: "غير مصرح",
      description: "ليس لديك صلاحية لإدارة الغرف",
      variant: "destructive"
    });
    return false;
  }
  
  const rooms = JSON.parse(localStorage.getItem('rooms') || '[]') as Room[];
  const roomIndex = rooms.findIndex(room => room.id === roomId);
  
  if (roomIndex === -1) {
    toast({
      title: "خطأ",
      description: "الغرفة غير موجودة",
      variant: "destructive"
    });
    return false;
  }
  
  // التحقق من أن الغرفة خاصة
  if (!rooms[roomIndex].isPrivate) {
    toast({
      title: "خطأ",
      description: "لا داعي لإزالة مستخدمين من غرفة عامة",
      variant: "destructive"
    });
    return false;
  }
  
  // حذف المستخدم من قائمة المسموح لهم
  const userIndex = rooms[roomIndex].allowedUsers.indexOf(userId);
  if (userIndex === -1) {
    toast({
      title: "تنبيه",
      description: "المستخدم غير موجود في هذه الغرفة",
    });
    return false;
  }
  
  rooms[roomIndex].allowedUsers.splice(userIndex, 1);
  localStorage.setItem('rooms', JSON.stringify(rooms));
  
  toast({
    title: "تمت الإزالة",
    description: "تمت إزالة المستخدم من الغرفة بنجاح",
  });
  
  return true;
};
