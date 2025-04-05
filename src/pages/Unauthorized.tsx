
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/lib/auth";

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-hacker-bg">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-destructive mb-4">403</h1>
        <h2 className="text-xl text-hacker-text mb-8">غير مصرح بالوصول</h2>
        <p className="text-hacker-text/70 mb-8 max-w-md mx-auto">
          ليست لديك الصلاحيات الكافية للوصول إلى هذه الصفحة.
          إذا كنت تعتقد أن هذا خطأ، يرجى الاتصال بالمسؤول.
        </p>
        <div className="space-x-4 flex justify-center rtl:space-x-reverse">
          <Button 
            onClick={logoutUser} 
            variant="destructive"
          >
            تسجيل الخروج
          </Button>
          <Button asChild className="cyber-button">
            <Link to="/">العودة إلى الصفحة الرئيسية</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
