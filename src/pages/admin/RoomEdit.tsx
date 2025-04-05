
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { ChevronRight, MessageSquare, Users, Calendar } from "lucide-react";
import { getRoom, Room, addUserToRoom, removeUserFromRoom } from "@/lib/chat";
import { getAllUsers, User } from "@/lib/auth";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RoomEdit() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!roomId) return;
    
    // جلب بيانات الغرفة
    const roomData = getRoom(roomId);
    if (!roomData) {
      toast({
        title: "خطأ",
        description: "الغرفة غير موجودة",
        variant: "destructive"
      });
      navigate("/admin/dashboard");
      return;
    }
    
    setRoom(roomData);
    setIsPrivate(roomData.isPrivate);
    
    // جلب المستخدمين المتاحين للإضافة
    const allUsers = getAllUsers() || [];
    const filteredUsers = allUsers.filter(user => 
      user.role !== 'admin' && !roomData.allowedUsers.includes(user.id)
    );
    setAvailableUsers(filteredUsers);
  }, [roomId, navigate]);

  const handleAddUser = () => {
    if (!selectedUser || !roomId || !room) return;
    
    const success = addUserToRoom(roomId, selectedUser);
    if (success && room) {
      // تحديث حالة الغرفة والمستخدمين المتاحين
      const updatedRoom = { 
        ...room, 
        allowedUsers: [...room.allowedUsers, selectedUser] 
      };
      setRoom(updatedRoom);
      setAvailableUsers(availableUsers.filter(user => user.id !== selectedUser));
      setSelectedUser("");
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (!roomId || !room) return;
    
    const success = removeUserFromRoom(roomId, userId);
    if (success && room) {
      // تحديث حالة الغرفة
      const updatedRoom = { 
        ...room, 
        allowedUsers: room.allowedUsers.filter(id => id !== userId) 
      };
      setRoom(updatedRoom);
      
      // إعادة المستخدم إلى قائمة المتاحين
      const user = getAllUsers()?.find(u => u.id === userId);
      if (user && user.role !== 'admin') {
        setAvailableUsers([...availableUsers, user]);
      }
    }
  };

  const getUsernameById = (userId: string): string => {
    const user = getAllUsers()?.find(u => u.id === userId);
    return user ? user.username : 'غير معروف';
  };

  // لو لم نجد الغرفة، نعرض رسالة تحميل
  if (!room) {
    return (
      <div className="min-h-screen bg-hacker-bg flex justify-center items-center">
        <div className="text-hacker animate-pulse-neon">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hacker-bg">
      <header className="bg-hacker-dark-bg border-b border-hacker/20 py-4">
        <div className="container flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-hacker font-bold text-xl font-mono">تعديل الغرفة: {room.name}</h1>
          </div>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <Button 
              asChild 
              variant="ghost"
              className="text-hacker-text"
            >
              <Link to="/admin/dashboard">
                العودة للوحة التحكم
                <ChevronRight className="w-4 h-4 mr-2 rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center space-x-2 rtl:space-x-reverse mb-6">
          <Link to="/admin/dashboard" className="text-hacker-text hover:text-hacker">لوحة التحكم</Link>
          <span className="text-hacker-text">/</span>
          <Link to="/admin/dashboard" className="text-hacker-text hover:text-hacker">الغرف</Link>
          <span className="text-hacker-text">/</span>
          <span className="text-hacker">تعديل الغرفة</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hacker-card shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <MessageSquare className="w-6 h-6 text-hacker ml-2" />
                <CardTitle className="text-hacker text-xl">معلومات الغرفة</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-hacker-text">اسم الغرفة</Label>
                  <Input 
                    id="name" 
                    value={room.name} 
                    readOnly
                    className="bg-hacker-dark-bg border-hacker/30 text-hacker-text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-hacker-text">وصف الغرفة</Label>
                  <Textarea 
                    id="description" 
                    value={room.description} 
                    readOnly
                    className="bg-hacker-dark-bg border-hacker/30 text-hacker-text resize-none h-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-hacker-text">تاريخ الإنشاء</Label>
                  <div className="flex items-center bg-hacker-dark-bg border border-hacker/30 rounded-md p-2 text-hacker-text">
                    <Calendar className="w-4 h-4 ml-2 text-hacker-text" />
                    {new Date(room.createdAt).toLocaleString('ar-SA')}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isPrivate" className="text-hacker-text">
                    نوع الغرفة
                  </Label>
                  <div className="text-hacker-text">
                    {isPrivate ? 'غرفة خاصة' : 'غرفة عامة'}
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    asChild
                    className="cyber-button"
                  >
                    <Link to={`/chat/${room.id}`}>
                      الانتقال إلى الغرفة
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hacker-card shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <Users className="w-6 h-6 text-hacker ml-2" />
                <CardTitle className="text-hacker text-xl">
                  {isPrivate ? 'إدارة المستخدمين المسموح لهم' : 'الوصول للغرفة'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {!isPrivate ? (
                <div className="text-hacker-text p-4 border border-hacker/20 rounded-md bg-hacker/5">
                  هذه غرفة عامة متاحة لجميع المستخدمين.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="bg-hacker-dark-bg border-hacker/30 text-hacker-text flex-1">
                        <SelectValue placeholder="اختر مستخدمًا" />
                      </SelectTrigger>
                      <SelectContent className="bg-hacker-dark-bg border-hacker/30">
                        {availableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id} className="text-hacker-text">
                            {user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      onClick={handleAddUser}
                      className="cyber-button"
                      disabled={!selectedUser}
                    >
                      إضافة
                    </Button>
                  </div>

                  {room.allowedUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-hacker">اسم المستخدم</TableHead>
                          <TableHead className="text-hacker w-24">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {room.allowedUsers.map(userId => (
                          <TableRow key={userId} className="border-b border-hacker/10">
                            <TableCell className="text-hacker-text">{getUsernameById(userId)}</TableCell>
                            <TableCell>
                              <Button 
                                type="button" 
                                onClick={() => handleRemoveUser(userId)}
                                variant="ghost" 
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                حذف
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-sm">لم تتم إضافة أي مستخدمين بعد.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
