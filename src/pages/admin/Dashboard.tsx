
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllUsers, User, logoutUser, toggleUserBan } from "@/lib/auth";
import { getRooms, Room } from "@/lib/chat";
import { MessageSquare, Users, Lock, Settings } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  useEffect(() => {
    const allUsers = getAllUsers();
    if (allUsers) {
      setUsers(allUsers);
    }
    
    setRooms(getRooms());
  }, []);
  
  const handleToggleBan = (userId: string, isBanned: boolean) => {
    const banUntil = isBanned ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 يوم
    const success = toggleUserBan(userId, !isBanned, banUntil);
    
    if (success) {
      // تحديث قائمة المستخدمين بعد تغيير الحالة
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, banned: !isBanned, bannedUntil: isBanned ? undefined : banUntil?.toISOString() } 
          : user
      ));
    }
  };
  
  return (
    <div className="min-h-screen bg-hacker-bg">
      <header className="bg-hacker-dark-bg border-b border-hacker/20 py-4">
        <div className="container flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-hacker font-bold text-xl font-mono">لوحة تحكم المسؤول</h1>
          </div>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <Button 
              asChild 
              className="text-hacker-text bg-transparent hover:bg-hacker/20 border border-hacker/40"
            >
              <Link to="/chat">
                <MessageSquare className="w-4 h-4 ml-2" />
                غرف الدردشة
              </Link>
            </Button>
            <Button 
              onClick={logoutUser} 
              variant="destructive" 
              size="sm"
            >
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hacker-card shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-hacker text-lg">المستخدمين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-4xl font-bold text-hacker">{users.length}</div>
                <Users className="w-8 h-8 text-hacker opacity-70" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="hacker-card shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-hacker text-lg">غرف الدردشة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-4xl font-bold text-hacker">{rooms.length}</div>
                <MessageSquare className="w-8 h-8 text-hacker opacity-70" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="hacker-card shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-hacker text-lg">الصلاحيات النشطة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-4xl font-bold text-hacker">
                  {users.filter(u => u.permissions.canCreateRoom || u.permissions.canUploadFiles).length}
                </div>
                <Lock className="w-8 h-8 text-hacker opacity-70" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-hacker-dark-bg border border-hacker/30 w-full justify-start mb-6">
            <TabsTrigger value="users" className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker">
              <Users className="w-4 h-4 ml-2" />
              إدارة المستخدمين
            </TabsTrigger>
            <TabsTrigger value="rooms" className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker">
              <MessageSquare className="w-4 h-4 ml-2" />
              إدارة الغرف
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker">
              <Settings className="w-4 h-4 ml-2" />
              إعدادات النظام
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-0">
            <Card className="hacker-card shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-hacker text-xl">المستخدمين</CardTitle>
                  <Button asChild className="cyber-button">
                    <Link to="/admin/users/add">إضافة مستخدم جديد</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-right border-b border-hacker/20">
                        <th className="p-3 text-hacker">اسم المستخدم</th>
                        <th className="p-3 text-hacker">الدور</th>
                        <th className="p-3 text-hacker">الحالة</th>
                        <th className="p-3 text-hacker">آخر تسجيل دخول</th>
                        <th className="p-3 text-hacker">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b border-hacker/10 hover:bg-hacker/5">
                          <td className="p-3 text-hacker-text">{user.username}</td>
                          <td className="p-3 text-hacker-text">
                            {user.role === 'admin' ? 'مسؤول' : 'مستخدم عادي'}
                          </td>
                          <td className="p-3">
                            {user.banned ? (
                              <span className="text-destructive">محظور</span>
                            ) : user.active ? (
                              <span className="text-hacker">نشط</span>
                            ) : (
                              <span className="text-yellow-500">غير نشط</span>
                            )}
                          </td>
                          <td className="p-3 text-hacker-text">
                            {new Date(user.lastLogin).toLocaleString('ar-SA')}
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2 rtl:space-x-reverse">
                              <Button asChild size="sm" className="text-hacker-text bg-transparent hover:bg-hacker/20 border border-hacker/40">
                                <Link to={`/admin/users/edit/${user.id}`}>تعديل</Link>
                              </Button>
                              {user.role !== 'admin' && (
                                <Button 
                                  onClick={() => handleToggleBan(user.id, user.banned)}
                                  variant="destructive" 
                                  size="sm"
                                >
                                  {user.banned ? 'إلغاء الحظر' : 'حظر'}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rooms" className="mt-0">
            <Card className="hacker-card shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-hacker text-xl">غرف الدردشة</CardTitle>
                  <Button asChild className="cyber-button">
                    <Link to="/admin/rooms/add">إنشاء غرفة جديدة</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-right border-b border-hacker/20">
                        <th className="p-3 text-hacker">اسم الغرفة</th>
                        <th className="p-3 text-hacker">النوع</th>
                        <th className="p-3 text-hacker">تاريخ الإنشاء</th>
                        <th className="p-3 text-hacker">المستخدمين</th>
                        <th className="p-3 text-hacker">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(room => (
                        <tr key={room.id} className="border-b border-hacker/10 hover:bg-hacker/5">
                          <td className="p-3 text-hacker-text">{room.name}</td>
                          <td className="p-3">
                            {room.isPrivate ? (
                              <span className="text-yellow-500">خاصة</span>
                            ) : (
                              <span className="text-hacker">عامة</span>
                            )}
                          </td>
                          <td className="p-3 text-hacker-text">
                            {new Date(room.createdAt).toLocaleString('ar-SA')}
                          </td>
                          <td className="p-3 text-hacker-text">
                            {room.isPrivate ? room.allowedUsers.length : 'الكل'}
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2 rtl:space-x-reverse">
                              <Button asChild size="sm" className="text-hacker-text bg-transparent hover:bg-hacker/20 border border-hacker/40">
                                <Link to={`/admin/rooms/edit/${room.id}`}>تعديل</Link>
                              </Button>
                              <Button asChild size="sm" className="text-hacker bg-hacker-dark-bg hover:bg-hacker/20 border border-hacker/40">
                                <Link to={`/chat/${room.id}`}>فتح</Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="mt-0">
            <Card className="hacker-card shadow-lg">
              <CardHeader>
                <CardTitle className="text-hacker text-xl">إعدادات النظام</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-hacker-text mb-6">
                  من هنا يمكنك تعديل إعدادات النظام وتغيير السياسات والخصائص المختلفة.
                </p>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-hacker font-bold">إعدادات الأمان</h3>
                    <Card className="p-4 hacker-card border-hacker/10">
                      <p className="text-hacker-text mb-4">
                        جميع البيانات والرسائل المرسلة مشفرة باستخدام خوارزمية تشفير متقدمة
                      </p>
                      <Button asChild className="cyber-button">
                        <Link to="/admin/settings">تعديل إعدادات الأمان</Link>
                      </Button>
                    </Card>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-hacker font-bold">إعدادات الصلاحيات الافتراضية</h3>
                    <Card className="p-4 hacker-card border-hacker/10">
                      <p className="text-hacker-text mb-4">
                        تعديل الصلاحيات الافتراضية للمستخدمين الجدد
                      </p>
                      <Button asChild className="cyber-button">
                        <Link to="/admin/settings">تعديل الصلاحيات الافتراضية</Link>
                      </Button>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
