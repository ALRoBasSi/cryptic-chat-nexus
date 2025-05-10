
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Room } from "@/lib/chat";
import { PlusCircle } from "lucide-react";

interface RoomsTabProps {
  rooms: Room[];
}

export function RoomsTab({ rooms }: RoomsTabProps) {
  return (
    <Card className="hacker-card shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-hacker text-xl">غرف الدردشة</CardTitle>
          <Button asChild className="cyber-button">
            <Link to="/admin/rooms/add">
              <PlusCircle className="ml-2 h-4 w-4" />
              إنشاء غرفة جديدة
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-right border-b border-hacker/20">
                <th className="p-3 text-hacker">اسم الغرفة</th>
                <th className="p-3 text-hacker">النوع</th>
                <th className="p-3 text-hacker">تاريخ الإنشاء</th>
                <th className="p-3 text-hacker">المستخدمين</th>
                <th className="p-3 text-hacker">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
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
                  <td className="p-3 text-hacker-text">
                    {room.isPrivate ? room.allowedUsers.length : 'الكل'}
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      <Button asChild size="sm" className="text-hacker-text bg-transparent hover:bg-hacker/20 border border-hacker/40">
                        <Link to={`/admin/rooms/edit/${room.id}`}>تعديل</Link>
                      </Button>
                      <Button asChild size="sm" className="text-hacker bg-hacker-dark-bg hover:bg-hacker/20 border border-hacker/40">
                        <Link to={`/chat/${room.id}`}>فتح</Link>
                      </Button>
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
