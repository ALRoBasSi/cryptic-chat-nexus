
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, User } from "@/lib/auth";

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // التحقق من حالة المستخدم
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  if (loading) {
    // عرض شاشة التحميل أثناء التحقق من المستخدم
    return (
      <div className="flex items-center justify-center min-h-screen bg-hacker-bg">
        <div className="text-hacker animate-pulse-neon">جاري التحميل...</div>
      </div>
    );
  }

  // إذا لم يكن المستخدم مسجل الدخول، توجيهه إلى صفحة تسجيل الدخول
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // إذا كان هناك أدوار محددة، تحقق مما إذا كان المستخدم له الصلاحية
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // إذا كان المسؤول يحاول الوصول إلى صفحة المستخدم العادي، وجهه إلى لوحة التحكم
    if (user.role === 'admin' && allowedRoles.includes('client')) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    
    // إذا كان المستخدم العادي يحاول الوصول إلى صفحة الإدارة، وجهه إلى صفحة الدردشة
    if (user.role === 'client' && allowedRoles.includes('admin')) {
      return <Navigate to="/chat" replace />;
    }
    
    // في حالات أخرى، وجهه إلى صفحة غير مصرح
    return <Navigate to="/unauthorized" replace />;
  }

  // إذا وصل إلى هنا، فالمستخدم مصرح له بالوصول إلى الصفحة
  return <>{children}</>;
}
