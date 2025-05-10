
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllUsers, User, toggleUserBan } from "@/lib/auth";
import { getRooms, Room } from "@/lib/chat";
import { MessageSquare, Users, Lock, Settings, BarChart3, UserPlus, PlusCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import AdminSidebar from "@/components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  
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
      
      toast({
        title: isBanned ? "تم إلغاء الحظر بنجاح" : "تم حظر المستخدم بنجاح",
        description: isBanned ? "يمكن للمستخدم الآن الوصول إلى النظام" : "تم منع المستخدم من الوصول إلى النظام",
      });
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };
  
  const DashboardOverview = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        
        <Card className="hacker-card shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-hacker text-lg">النشاط اليومي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-4xl font-bold text-hacker">
                {Math.floor(Math.random() * 100)}
              </div>
              <BarChart3 className="w-8 h-8 text-hacker opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hacker-card shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-hacker text-xl">آخر المستخدمين</CardTitle>
              <Button asChild variant="ghost" className="text-hacker hover:bg-hacker/10">
                <Link to="/admin/dashboard?tab=users">عرض الكل</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-right border-b border-hacker/20">
                    <th className="p-3 text-hacker">اسم المستخدم</th>
                    <th className="p-3 text-hacker">الدور</th>
                    <th className="p-3 text-hacker">آخر تسجيل دخول</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 5).map(user => (
                    <tr key={user.id} className="border-b border-hacker/10 hover:bg-hacker/5">
                      <td className="p-3 text-hacker-text">{user.username}</td>
                      <td className="p-3 text-hacker-text">
                        {user.role === 'admin' ? 'مسؤول' : 'مستخدم عادي'}
                      </td>
                      <td className="p-3 text-hacker-text">
                        {new Date(user.lastLogin).toLocaleString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hacker-card shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-hacker text-xl">آخر الغرف</CardTitle>
              <Button asChild variant="ghost" className="text-hacker hover:bg-hacker/10">
                <Link to="/admin/dashboard?tab=rooms">عرض الكل</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-right border-b border-hacker/20">
                    <th className="p-3 text-hacker">اسم الغرفة</th>
                    <th className="p-3 text-hacker">النوع</th>
                    <th className="p-3 text-hacker">تاريخ الإنشاء</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.slice(0, 5).map(room => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const UsersTab = () => (
    <Card className="hacker-card shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-hacker text-xl">المستخدمين</CardTitle>
          <Button asChild className="cyber-button">
            <Link to="/admin/users/add">
              <UserPlus className="ml-2 h-4 w-4" />
              إضافة مستخدم جديد
            </Link>
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
  );

  const RoomsTab = () => (
    <Card className="hacker-card shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-hacker text-xl">غرف الدردشة</CardTitle>
          <Button asChild className="cyber-button">
            <Link to="/admin/rooms/add">
              <PlusCircle className="ml-2 h-4 w-4" />
              إنشاء غرفة جديدة
            </Link>
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
  );

  const SettingsTab = () => (
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
  );

  const ReportsTab = () => (
    <Card className="hacker-card shadow-lg">
      <CardHeader>
        <CardTitle className="text-hacker text-xl">التقارير والإحصائيات</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-hacker-text mb-6">
          تقارير النظام والإحصائيات عن استخدام المنصة.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4 hacker-card border-hacker/10">
            <h3 className="text-hacker font-bold mb-4">تقرير النشاط</h3>
            <div className="h-40 bg-hacker/10 rounded-md flex items-center justify-center">
              <p className="text-hacker-text">بيانات الرسم البياني هنا</p>
            </div>
          </Card>
          
          <Card className="p-4 hacker-card border-hacker/10">
            <h3 className="text-hacker font-bold mb-4">استخدام النظام</h3>
            <div className="h-40 bg-hacker/10 rounded-md flex items-center justify-center">
              <p className="text-hacker-text">بيانات الرسم البياني هنا</p>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersTab />;
      case 'rooms':
        return <RoomsTab />;
      case 'settings':
        return <SettingsTab />;
      case 'reports':
        return <ReportsTab />;
      default:
        return <DashboardOverview />;
    }
  };
  
  return (
    <AdminSidebar>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-hacker-dark-bg border border-hacker/30 w-full justify-center mb-6 rounded-xl overflow-hidden">
          <TabsTrigger 
            value="dashboard" 
            className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker rounded-none flex-1"
          >
            <LayoutDashboard className="w-4 h-4 ml-2" />
            الرئيسية
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker rounded-none flex-1"
          >
            <Users className="w-4 h-4 ml-2" />
            المستخدمين
          </TabsTrigger>
          <TabsTrigger 
            value="rooms" 
            className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker rounded-none flex-1"
          >
            <MessageSquare className="w-4 h-4 ml-2" />
            الغرف
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker rounded-none flex-1"
          >
            <Settings className="w-4 h-4 ml-2" />
            الإعدادات
          </TabsTrigger>
          <TabsTrigger 
            value="reports" 
            className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker rounded-none flex-1"
          >
            <BarChart3 className="w-4 h-4 ml-2" />
            التقارير
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {renderContent()}
        </TabsContent>
      </Tabs>
    </AdminSidebar>
  );
}
