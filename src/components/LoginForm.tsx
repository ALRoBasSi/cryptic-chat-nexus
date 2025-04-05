
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { authenticateUser, initializeAuth } from "@/lib/auth";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    <div className="mx-auto hacker-card p-6 w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold hacker-text mb-2">تسجيل الدخول</h2>
        <p className="text-hacker-text opacity-80 text-sm">
          الدخول إلى نظام الدردشة المشفر
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-hacker">اسم المستخدم</Label>
          <Input
            id="username"
            className="cyber-input"
            placeholder="أدخل اسم المستخدم"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-hacker">كلمة المرور</Label>
          <Input
            id="password"
            className="cyber-input"
            placeholder="أدخل كلمة المرور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="text-xs text-hacker-text mt-1 opacity-60">
            ملاحظة: استخدم "المسؤول" و"password" للدخول كمسؤول، أو "مستخدم عادي" و"password" للدخول كمستخدم عادي
          </p>
        </div>
        
        <Button 
          type="submit" 
          className="cyber-button w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="animate-pulse">جاري التحقق...</span>
          ) : (
            "دخول"
          )}
        </Button>
      </form>
      
      <div className="mt-6 text-center text-xs text-hacker-text opacity-60">
        <p>نظام الدردشة المشفر | جميع الحقوق محفوظة &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
