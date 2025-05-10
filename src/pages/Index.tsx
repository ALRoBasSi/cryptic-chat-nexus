
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { LockKeyholeIcon, ShieldIcon, ShieldCheckIcon } from "lucide-react";

const MatrixRainEffect = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {Array.from({ length: 40 }).map((_, index) => (
        <div 
          key={index}
          className="matrix-char text-hacker opacity-30"
          style={{ 
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`, 
            animationDuration: `${5 + Math.random() * 10}s` 
          }}
        >
          {String.fromCharCode(0x30A0 + Math.random() * 96)}
        </div>
      ))}
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();

  // التحقق من حالة المستخدم عند تحميل الصفحة
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      // إذا كان المستخدم مسجل الدخول بالفعل، وجهه إلى الصفحة المناسبة
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/chat');
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-hacker-dark-bg relative">
      <MatrixRainEffect />
      
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 flex items-center justify-center mb-4">
            <ShieldIcon className="w-16 h-16 text-hacker animate-pulse-neon" />
          </div>
          
          <h1 className="text-4xl font-bold glitch-text mb-2" data-text="نظام المحادثة المشفر">
            نظام المحادثة المشفر
          </h1>
          
          <div className="flex items-center gap-2 mb-4">
            <LockKeyholeIcon className="w-4 h-4 text-hacker" />
            <p className="text-hacker-text text-sm">تشفير من طرف إلى طرف</p>
            <ShieldCheckIcon className="w-4 h-4 text-hacker" />
          </div>
          
          <p className="text-hacker-text mt-2 max-w-md mx-auto text-center opacity-80 text-sm">
            منصة آمنة للتواصل مع نظام صلاحيات متقدم وتشفير قوي لضمان خصوصية المحادثات
          </p>
        </div>
        
        <div className="relative z-10 w-full">
          <LoginForm />
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-hacker-text text-xs opacity-50">
            &copy; {new Date().getFullYear()} نظام المحادثة المشفر | جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
