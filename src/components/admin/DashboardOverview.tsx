
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@/lib/auth";
import { Room } from "@/lib/chat";
import { 
  MessageSquare, 
  Users, 
  BarChart3,
  LockKeyhole
} from "lucide-react";

interface DashboardOverviewProps {
  users: User[];
  rooms: Room[];
}

export function DashboardOverview({ users, rooms }: DashboardOverviewProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hacker-card shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-hacker text-lg">المستخدمين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-4xl font-bold text-hacker">{users.length}</div>
              <Users className="w-8 h-8 text-hacker opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="hacker-card shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-hacker text-lg">غرف الدردشة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-4xl font-bold text-hacker">{rooms.length}</div>
              <MessageSquare className="w-8 h-8 text-hacker opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="hacker-card shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-hacker text-lg">الصلاحيات النشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-4xl font-bold text-hacker">
                {users.filter(u => u.permissions.canCreateRoom || u.permissions.canUploadFiles).length}
              </div>
              <LockKeyhole className="w-8 h-8 text-hacker opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="hacker-card shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-hacker text-lg">النشاط اليومي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-4xl font-bold text-hacker">
                {Math.floor(Math.random() * 100)}
              </div>
              <BarChart3 className="w-8 h-8 text-hacker opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hacker-card shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-hacker text-xl">آخر المستخدمين</CardTitle>
              <Button asChild variant="ghost" className="text-hacker hover:bg-hacker/10">
                <Link to="/admin/dashboard?tab=users">عرض الكل</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-right border-b border-hacker/20">
                    <th className="p-3 text-hacker">اسم المستخدم</th>
                    <th className="p-3 text-hacker">الدور</th>
                    <th className="p-3 text-hacker">آخر تسجيل دخول</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 5).map(user => (
                    <tr key={user.id} className="border-b border-hacker/10 hover:bg-hacker/5">
                      <td className="p-3 text-hacker-text">{user.username}</td>
                      <td className="p-3 text-hacker-text">
                        {user.role === 'admin' ? 'مسؤول' : 'مستخدم عادي'}
                      </td>
                      <td className="p-3 text-hacker-text">
                        {new Date(user.lastLogin).toLocaleString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hacker-card shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-hacker text-xl">آخر الغرف</CardTitle>
              <Button asChild variant="ghost" className="text-hacker hover:bg-hacker/10">
                <Link to="/admin/dashboard?tab=rooms">عرض الكل</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-right border-b border-hacker/20">
                    <th className="p-3 text-hacker">اسم الغرفة</th>
                    <th className="p-3 text-hacker">النوع</th>
                    <th className="p-3 text-hacker">تاريخ الإنشاء</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.slice(0, 5).map(room => (
                    <tr key={room.id} className="border-b border-hacker/10 hover:bg-hacker/5">
                      <td className="p-3 text-hacker-text">{room.name}</td>
                      <td className="p-3">
                        {room.isPrivate ? (
                          <span className="text-yellow-500">خاصة</span>
                        ) : (
                          <span className="text-hacker">عامة</span>
                        )}
                      </td>
                      <td className="p-3 text-hacker-text">
                        {new Date(room.createdAt).toLocaleString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
