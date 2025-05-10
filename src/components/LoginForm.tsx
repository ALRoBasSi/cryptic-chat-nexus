
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { authenticateUser, initializeAuth } from "@/lib/auth";
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon, LogInIcon } from "lucide-react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // تشغيل البيانات الافتراضية عند تحميل المكون
  initializeAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const user = authenticateUser(username, password);
      
      if (user) {
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: `مرحباً بك، ${user.username}!`,
        });
        
        // توجيه المستخدم حسب دوره
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/chat');
        }
      } else {
        toast({
          title: "فشل تسجيل الدخول",
          description: "اسم المستخدم أو كلمة المرور غير صحيحة",
          variant: "destructive",
        });
      }
      
      setIsLoading(false);
    }, 1000); // محاكاة تأخير الشبكة
  };

  return (
    <Card className="backdrop-blur-lg bg-hacker-dark-bg/90 border border-hacker/30 shadow-[0_0_15px_rgba(10,207,131,0.3)]">
      <CardHeader className="space-y-1 text-center pb-2">
        <CardTitle className="text-2xl font-bold text-hacker">تسجيل الدخول</CardTitle>
        <CardDescription className="text-hacker-text opacity-80">
          الدخول الآمن إلى نظام الدردشة المشفر
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-3">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="username" className="text-hacker-text">اسم المستخدم</Label>
            </div>
            <div className="relative">
              <UserIcon className="absolute right-3 top-2.5 h-4 w-4 text-hacker-text opacity-70" />
              <Input
                id="username"
                className="cyber-input pr-9 border-hacker/40 focus:border-hacker focus:ring-hacker/30"
                placeholder="أدخل اسم المستخدم"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-hacker-text">كلمة المرور</Label>
            </div>
            <div className="relative">
              <LockIcon className="absolute right-3 top-2.5 h-4 w-4 text-hacker-text opacity-70" />
              <Input
                id="password"
                className="cyber-input pr-9 border-hacker/40 focus:border-hacker focus:ring-hacker/30"
                placeholder="أدخل كلمة المرور"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute left-3 top-2.5"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4 text-hacker-text opacity-70" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-hacker-text opacity-70" />
                )}
              </button>
            </div>
            <p className="text-xs text-hacker-text mt-1 opacity-60">
              ملاحظة: استخدم "المسؤول" و"password" للدخول كمسؤول، أو "مستخدم عادي" و"password" للدخول كمستخدم عادي
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-hacker hover:bg-hacker/90 text-black font-bold flex items-center gap-2 relative overflow-hidden group transition-all duration-300 shadow-[0_0_10px_rgba(10,207,131,0.5)]"
            disabled={isLoading}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (
                <span className="animate-pulse">جاري التحقق...</span>
              ) : (
                <>
                  <LogInIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </span>
            <span className="absolute inset-0 bg-hacker-light opacity-0 group-hover:opacity-20 transition-opacity"></span>
          </Button>
        </form>
      </CardContent>
      
      <CardFooter className="border-t border-hacker/10 px-6 py-3">
        <div className="w-full text-center">
          <p className="text-xs text-hacker-text opacity-60">
            نظام محمي بتقنيات التشفير المتقدمة
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
