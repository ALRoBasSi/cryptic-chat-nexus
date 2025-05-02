
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { addUser, UserRole } from "@/lib/auth";
import { Link } from "react-router-dom";
import { ChevronRight, Users, Eye, EyeOff } from "lucide-react";

export default function UserAdd() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("client");
  const [permissions, setPermissions] = useState({
    canCreateRoom: false,
    canUploadFiles: false,
    canDeleteMessages: false,
    canBanUsers: false
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من صحة البيانات
    if (!username.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المستخدم",
        variant: "destructive"
      });
      return;
    }

    if (!password.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال كلمة المرور",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "خطأ",
        description: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
        variant: "destructive"
      });
      return;
    }

    // إضافة المستخدم
    const success = addUser({
      username,
      password,
      role,
      permissions,
      active: true,
      banned: false
    });

    if (success) {
      toast({
        title: "تم بنجاح",
        description: "تمت إضافة المستخدم بنجاح",
      });
      navigate("/admin/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-hacker-bg">
      <header className="bg-hacker-dark-bg border-b border-hacker/20 py-4">
        <div className="container flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-hacker font-bold text-xl font-mono">إضافة مستخدم جديد</h1>
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
          <span className="text-hacker">إضافة مستخدم</span>
        </div>

        <Card className="hacker-card shadow-lg max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center">
              <Users className="w-6 h-6 text-hacker ml-2" />
              <CardTitle className="text-hacker text-xl">إضافة مستخدم جديد</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-hacker-text">اسم المستخدم</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="أدخل اسم المستخدم"
                  className="bg-hacker-dark-bg border-hacker/30 text-hacker-text"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-hacker-text">كلمة المرور</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="أدخل كلمة المرور"
                    className="bg-hacker-dark-bg border-hacker/30 text-hacker-text pr-10"
                  />
                  <button 
                    type="button" 
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-hacker"
                    onClick={togglePasswordVisibility}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-hacker-text">دور المستخدم</Label>
                <Select 
                  value={role} 
                  onValueChange={(value: UserRole) => setRole(value)}
                >
                  <SelectTrigger id="role" className="bg-hacker-dark-bg border-hacker/30 text-hacker-text">
                    <SelectValue placeholder="اختر دور المستخدم" />
                  </SelectTrigger>
                  <SelectContent className="bg-hacker-dark-bg border-hacker/30">
                    <SelectItem value="admin" className="text-hacker-text">مسؤول</SelectItem>
                    <SelectItem value="client" className="text-hacker-text">مستخدم عادي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-hacker-text">الصلاحيات</Label>
                
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
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/admin/dashboard")}
                  className="text-hacker-text border-hacker/30 hover:bg-hacker/10"
                >
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  className="cyber-button"
                >
                  إضافة المستخدم
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
