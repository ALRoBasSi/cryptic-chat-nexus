
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";

const MatrixRainEffect = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, index) => (
        <div 
          key={index}
          className="matrix-char text-hacker"
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-hacker-bg relative">
      <MatrixRainEffect />
      
      <div className="relative z-10 text-center mb-8">
        <h1 className="text-4xl font-bold glitch-text" data-text="نظام المحادثة المشفر">
          نظام المحادثة المشفر
        </h1>
        <p className="text-hacker-text mt-4 max-w-md mx-auto">
          نظام دردشة آمن ومشفر مع نظام صلاحيات متقدم،
          صمم خصيصًا للتواصل السري
        </p>
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
};

export default Index;
