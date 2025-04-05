
import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentUser, logoutUser } from "@/lib/auth";
import { getRooms, getRoom, getRoomMessages, sendMessage, Message, Room } from "@/lib/chat";
import { MessageSquare, Send, Plus, Settings, LogOut } from "lucide-react";

export default function Chat() {
  const { roomId } = useParams<{ roomId: string }>();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  // جلب الغرف
  useEffect(() => {
    const fetchedRooms = getRooms();
    setRooms(fetchedRooms);
    
    // في حالة عدم وجود معرف غرفة، انتقل إلى أول غرفة
    if (!roomId && fetchedRooms.length > 0) {
      navigate(`/chat/${fetchedRooms[0].id}`);
    }
    
    setLoading(false);
  }, [roomId, navigate]);
  
  // جلب الغرفة الحالية والرسائل عند تغيير معرف الغرفة
  useEffect(() => {
    if (roomId) {
      // جلب معلومات الغرفة
      const room = getRoom(roomId);
      setCurrentRoom(room);
      
      if (room) {
        // جلب رسائل الغرفة
        const fetchedMessages = getRoomMessages(roomId);
        setMessages(fetchedMessages);
      } else {
        toast({
          title: "خطأ",
          description: "الغرفة غير موجودة",
          variant: "destructive"
        });
        navigate('/chat');
      }
    }
  }, [roomId, navigate, toast]);
  
  // التمرير إلى أسفل عند استلام رسائل جديدة
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  // محاكاة تحديث الرسائل كل 10 ثوانٍ
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (roomId) {
        const fetchedMessages = getRoomMessages(roomId);
        setMessages(fetchedMessages);
      }
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [roomId]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !roomId || !currentUser) return;
    
    // إرسال الرسالة
    const sentMessage = sendMessage(roomId, newMessage);
    
    if (sentMessage) {
      // إضافة الرسالة إلى القائمة
      setMessages([...messages, sentMessage]);
      // مسح مربع الإدخال
      setNewMessage("");
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-hacker-bg">
        <div className="text-hacker animate-pulse-neon">جاري التحميل...</div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-hacker-bg">
      {/* الشريط الجانبي */}
      <div className="w-64 bg-hacker-dark-bg border-l border-hacker/20 flex flex-col">
        <div className="p-4 border-b border-hacker/20">
          <h2 className="text-hacker font-bold text-lg">غرف الدردشة</h2>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {rooms.map(room => (
              <Button
                key={room.id}
                asChild
                variant="ghost"
                className={`w-full justify-start text-right p-2 ${room.id === roomId ? 'bg-hacker/20 text-hacker' : 'text-hacker-text hover:bg-hacker/10 hover:text-hacker'}`}
              >
                <Link to={`/chat/${room.id}`}>
                  <MessageSquare className="w-4 h-4 ml-2 rtl:ml-2 rtl:mr-0" />
                  <span className="truncate">{room.name}</span>
                  {room.isPrivate && (
                    <span className="mr-2 text-xs bg-hacker/20 text-hacker px-1 rounded">خاص</span>
                  )}
                </Link>
              </Button>
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-hacker/20">
          <div className="space-y-2">
            {currentUser?.role === 'admin' && (
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-right text-hacker-text hover:bg-hacker/10 hover:text-hacker"
              >
                <Link to="/admin/dashboard">
                  <Settings className="w-4 h-4 ml-2 rtl:ml-2 rtl:mr-0" />
                  لوحة التحكم
                </Link>
              </Button>
            )}
            <Button
              onClick={logoutUser}
              variant="ghost"
              className="w-full justify-start text-right text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 ml-2 rtl:ml-2 rtl:mr-0" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
      
      {/* منطقة الدردشة الرئيسية */}
      <div className="flex-1 flex flex-col">
        {currentRoom ? (
          <>
            <header className="bg-hacker-dark-bg border-b border-hacker/20 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-hacker font-bold">{currentRoom.name}</h2>
                  <p className="text-hacker-text text-sm opacity-80">{currentRoom.description}</p>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-hacker-text">
                    مرحباً بك، {currentUser?.username}
                  </span>
                </div>
              </div>
            </header>
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea ref={scrollRef} className="h-full p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex justify-center items-center h-32">
                      <p className="text-hacker-text opacity-60">لا توجد رسائل بعد. كن أول من يرسل رسالة!</p>
                    </div>
                  ) : (
                    messages.map(message => (
                      <div 
                        key={message.id}
                        className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <Card 
                          className={`max-w-[80%] ${
                            message.senderId === currentUser?.id 
                              ? 'hacker-card border-hacker/40' 
                              : 'bg-hacker-light-bg border-hacker/10'
                          }`}
                        >
                          <CardHeader className="p-3 pb-0">
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-bold ${
                                message.senderId === currentUser?.id ? 'text-hacker' : 'text-hacker-text'
                              }`}>
                                {message.senderName}
                              </span>
                              <span className="text-xs text-hacker-text opacity-60">
                                {new Date(message.timestamp).toLocaleTimeString('ar-SA')}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 pt-2">
                            <p className="text-hacker-text whitespace-pre-wrap">{message.content}</p>
                            {message.hasAttachment && (
                              <div className="mt-2 p-2 bg-hacker-bg/50 rounded border border-hacker/10">
                                <p className="text-xs text-hacker">مرفق: {message.attachmentUrl?.replace('fake-url://', '')}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            
            <footer className="p-4 border-t border-hacker/20 bg-hacker-dark-bg">
              <form onSubmit={handleSendMessage} className="flex space-x-2 rtl:space-x-reverse">
                <Input
                  className="cyber-input"
                  placeholder="اكتب رسالتك هنا..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" className="cyber-button">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-hacker opacity-30 mx-auto mb-4" />
              <h2 className="text-hacker-text text-xl font-bold mb-2">لم يتم تحديد غرفة</h2>
              <p className="text-hacker-text opacity-60 mb-4">يرجى اختيار غرفة من القائمة الجانبية</p>
              {rooms.length > 0 && (
                <Button asChild className="cyber-button">
                  <Link to={`/chat/${rooms[0].id}`}>
                    فتح غرفة الدردشة الافتراضية
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
