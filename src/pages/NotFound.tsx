
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-hacker-bg">
      <div className="text-center">
        <h1 className="text-6xl font-bold hacker-text mb-4">404</h1>
        <h2 className="text-xl text-hacker-text mb-8">الصفحة غير موجودة</h2>
        <p className="text-hacker-text/70 mb-8 max-w-md mx-auto">
          يبدو أنك حاولت الوصول إلى صفحة غير موجودة في النظام.
          هذا قد يعني أنك لا تملك الصلاحيات الكافية أو أن الرابط غير صحيح.
        </p>
        <Button asChild className="cyber-button">
          <Link to="/">العودة إلى الصفحة الرئيسية</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
