
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { ChevronRight, User, AlertTriangle } from "lucide-react";
import { getAllUsers, updateUserPermissions, toggleUserBan, User as UserType } from "@/lib/auth";

export default function UserEdit() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [permissions, setPermissions] = useState({
    canCreateRoom: false,
    canUploadFiles: false,
    canDeleteMessages: false,
    canBanUsers: false
  });

  useEffect(() => {
    // جلب بيانات المستخدم
    const users = getAllUsers();
    if (users) {
      const foundUser = users.find(u => u.id === userId);
      if (foundUser) {
        setUser(foundUser);
        setPermissions(foundUser.permissions);
      } else {
        toast({
          title: "خطأ",
          description: "المستخدم غير موجود",
          variant: "destructive"
        });
        navigate("/admin/dashboard");
      }
    }
  }, [userId, navigate]);

  const handleUpdatePermissions = () => {
    if (!userId) return;

    const success = updateUserPermissions(userId, permissions);
    if (success) {
      toast({
        title: "تم التحديث",
        description: "تم تحديث صلاحيات المستخدم بنجاح"
      });
      
      // تحديث بيانات المستخدم محليًا
      if (user) {
        setUser({
          ...user,
          permissions
        });
      }
    }
  };

  const handleToggleBan = () => {
    if (!user || !userId) return;
    
    // تبديل حالة الحظر
    const banUntil = user.banned ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 يوم
    const success = toggleUserBan(userId, !user.banned, banUntil);
    
    if (success) {
      setUser({
        ...user,
        banned: !user.banned,
        bannedUntil: user.banned ? undefined : banUntil?.toISOString()
      });
    }
  };

  // لو لم نجد المستخدم، نعرض رسالة تحميل
  if (!user) {
    return (
      <div className="min-h-screen bg-hacker-bg flex justify-center items-center">
        <div className="text-hacker animate-pulse-neon">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hacker-bg">
      <header className="bg-hacker-dark-bg border-b border-hacker/20 py-4">
        <div className="container flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-hacker font-bold text-xl font-mono">تعديل المستخدم: {user.username}</h1>
          </div>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <Button 
              asChild 
              variant="ghost"
              className="text-hacker-text"
            >
              <Link to="/admin/dashboard">
                العودة للوحة التحكم
                <ChevronRight className="w-4 h-4 mr-2 rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center space-x-2 rtl:space-x-reverse mb-6">
          <Link to="/admin/dashboard" className="text-hacker-text hover:text-hacker">لوحة التحكم</Link>
          <span className="text-hacker-text">/</span>
          <Link to="/admin/dashboard" className="text-hacker-text hover:text-hacker">المستخدمين</Link>
          <span className="text-hacker-text">/</span>
          <span className="text-hacker">تعديل المستخدم</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hacker-card shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <User className="w-6 h-6 text-hacker ml-2" />
                <CardTitle className="text-hacker text-xl">معلومات المستخدم</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4 text-hacker-text">
                <div className="flex justify-between">
                  <dt className="font-medium">اسم المستخدم:</dt>
                  <dd>{user.username}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">الدور:</dt>
                  <dd>{user.role === 'admin' ? 'مسؤول' : 'مستخدم عادي'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">تاريخ الإنشاء:</dt>
                  <dd>{new Date(user.createdAt).toLocaleString('ar-SA')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">آخر تسجيل دخول:</dt>
                  <dd>{new Date(user.lastLogin).toLocaleString('ar-SA')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">الحالة:</dt>
                  <dd className={user.banned ? "text-destructive" : "text-hacker"}>
                    {user.banned ? 'محظور' : 'نشط'}
                  </dd>
                </div>
                {user.banned && user.bannedUntil && (
                  <div className="flex justify-between">
                    <dt className="font-medium">ينتهي الحظر في:</dt>
                    <dd className="text-destructive">
                      {new Date(user.bannedUntil).toLocaleString('ar-SA')}
                    </dd>
                  </div>
                )}
              </dl>

              {user.role !== 'admin' && (
                <div className="mt-6">
                  <Button 
                    onClick={handleToggleBan}
                    variant={user.banned ? "outline" : "destructive"}
                    className={user.banned ? "border-hacker/30 hover:bg-hacker/10" : ""}
                  >
                    {user.banned ? 'إلغاء الحظر' : 'حظر المستخدم'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hacker-card shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <AlertTriangle className="w-6 h-6 text-hacker ml-2" />
                <CardTitle className="text-hacker text-xl">الصلاحيات</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {user.role === 'admin' ? (
                <div className="text-hacker-text p-4 border border-hacker/20 rounded-md bg-hacker/5">
                  المسؤولون يمتلكون جميع الصلاحيات تلقائيًا ولا يمكن تعديلها.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="createRoom" className="text-hacker-text cursor-pointer">
                        إنشاء غرف دردشة
                      </Label>
                      <Switch 
                        id="createRoom" 
                        checked={permissions.canCreateRoom}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, canCreateRoom: checked})
                        }
                        className="data-[state=checked]:bg-hacker"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="uploadFiles" className="text-hacker-text cursor-pointer">
                        رفع ملفات مرفقة
                      </Label>
                      <Switch 
                        id="uploadFiles" 
                        checked={permissions.canUploadFiles}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, canUploadFiles: checked})
                        }
                        className="data-[state=checked]:bg-hacker"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="deleteMessages" className="text-hacker-text cursor-pointer">
                        حذف الرسائل
                      </Label>
                      <Switch 
                        id="deleteMessages" 
                        checked={permissions.canDeleteMessages}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, canDeleteMessages: checked})
                        }
                        className="data-[state=checked]:bg-hacker"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="banUsers" className="text-hacker-text cursor-pointer">
                        حظر المستخدمين
                      </Label>
                      <Switch 
                        id="banUsers" 
                        checked={permissions.canBanUsers}
                        onCheckedChange={(checked) => 
                          setPermissions({...permissions, canBanUsers: checked})
                        }
                        className="data-[state=checked]:bg-hacker"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleUpdatePermissions}
                      className="cyber-button"
                    >
                      حفظ الصلاحيات
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
