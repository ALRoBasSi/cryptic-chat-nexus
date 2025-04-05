
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { ChevronRight, MessageSquare } from "lucide-react";
import { createRoom } from "@/lib/chat";
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

export default function RoomAdd() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>(() => {
    const allUsers = getAllUsers() || [];
    return allUsers.filter(user => user.role !== 'admin');
  });

  const handleAddUser = () => {
    if (!selectedUser) return;
    
    // التحقق من أن المستخدم غير موجود بالفعل
    if (allowedUsers.includes(selectedUser)) {
      toast({
        title: "تنبيه",
        description: "المستخدم موجود بالفعل في قائمة المسموح لهم",
      });
      return;
    }
    
    setAllowedUsers([...allowedUsers, selectedUser]);
    setSelectedUser("");
  };

  const handleRemoveUser = (userId: string) => {
    setAllowedUsers(allowedUsers.filter(id => id !== userId));
  };

  const getUsernameById = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user ? user.username : 'غير معروف';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من صحة البيانات
    if (!name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الغرفة",
        variant: "destructive"
      });
      return;
    }

    // إنشاء الغرفة
    const newRoom = createRoom({
      name,
      description,
      isPrivate,
      allowedUsers: isPrivate ? allowedUsers : [],
    });

    if (newRoom) {
      navigate("/admin/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-hacker-bg">
      <header className="bg-hacker-dark-bg border-b border-hacker/20 py-4">
        <div className="container flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-hacker font-bold text-xl font-mono">إنشاء غرفة جديدة</h1>
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
          <span className="text-hacker">إنشاء غرفة</span>
        </div>

        <Card className="hacker-card shadow-lg max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center">
              <MessageSquare className="w-6 h-6 text-hacker ml-2" />
              <CardTitle className="text-hacker text-xl">إنشاء غرفة دردشة جديدة</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-hacker-text">اسم الغرفة</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="أدخل اسم الغرفة"
                  className="bg-hacker-dark-bg border-hacker/30 text-hacker-text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-hacker-text">وصف الغرفة</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="أدخل وصفًا للغرفة"
                  className="bg-hacker-dark-bg border-hacker/30 text-hacker-text resize-none h-24"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isPrivate" className="text-hacker-text cursor-pointer">
                  غرفة خاصة
                </Label>
                <Switch 
                  id="isPrivate" 
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  className="data-[state=checked]:bg-hacker"
                />
              </div>

              {isPrivate && (
                <div className="space-y-4 p-4 border border-hacker/20 rounded-md bg-hacker/5">
                  <h3 className="text-hacker font-medium">المستخدمين المسموح لهم</h3>
                  
                  <div className="flex gap-2">
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="bg-hacker-dark-bg border-hacker/30 text-hacker-text flex-1">
                        <SelectValue placeholder="اختر مستخدمًا" />
                      </SelectTrigger>
                      <SelectContent className="bg-hacker-dark-bg border-hacker/30">
                        {users.map(user => (
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

                  {allowedUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-hacker">اسم المستخدم</TableHead>
                          <TableHead className="text-hacker w-24">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allowedUsers.map(userId => (
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

              <div className="flex justify-end gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/admin/dashboard")}
                  className="text-hacker-text border-hacker/30 hover:bg-hacker/10"
                >
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  className="cyber-button"
                >
                  إنشاء الغرفة
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
