
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, toggleUserBan } from "@/lib/auth";
import { UserPlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface UsersTabProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

export function UsersTab({ users, setUsers }: UsersTabProps) {
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

  return (
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
}
