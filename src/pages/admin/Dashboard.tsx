
import { useState, useEffect } from "react";
import { getAllUsers, User, toggleUserBan } from "@/lib/auth";
import { getRooms, Room } from "@/lib/chat";
import { 
  MessageSquare, 
  Users, 
  Settings, 
  BarChart3,
  LayoutDashboard,
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";

// استيراد المكونات المنفصلة
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { UsersTab } from "@/components/admin/UsersTab";
import { RoomsTab } from "@/components/admin/RoomsTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { ReportsTab } from "@/components/admin/ReportsTab";

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  
  useEffect(() => {
    const allUsers = getAllUsers();
    if (allUsers) {
      setUsers(allUsers);
    }
    
    setRooms(getRooms());
  }, []);
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersTab users={users} setUsers={setUsers} />;
      case 'rooms':
        return <RoomsTab rooms={rooms} />;
      case 'settings':
        return <SettingsTab />;
      case 'reports':
        return <ReportsTab />;
      default:
        return <DashboardOverview users={users} rooms={rooms} />;
    }
  };
  
  return (
    <AdminSidebar>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-hacker-dark-bg border border-hacker/30 w-full justify-center mb-6 rounded-xl overflow-hidden">
          <TabsTrigger 
            value="dashboard" 
            className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker rounded-none flex-1"
          >
            <LayoutDashboard className="w-4 h-4 ml-2" />
            الرئيسية
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker rounded-none flex-1"
          >
            <Users className="w-4 h-4 ml-2" />
            المستخدمين
          </TabsTrigger>
          <TabsTrigger 
            value="rooms" 
            className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker rounded-none flex-1"
          >
            <MessageSquare className="w-4 h-4 ml-2" />
            الغرف
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker rounded-none flex-1"
          >
            <Settings className="w-4 h-4 ml-2" />
            الإعدادات
          </TabsTrigger>
          <TabsTrigger 
            value="reports" 
            className="data-[state=active]:bg-hacker/20 data-[state=active]:text-hacker rounded-none flex-1"
          >
            <BarChart3 className="w-4 h-4 ml-2" />
            التقارير
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {renderContent()}
        </TabsContent>
      </Tabs>
    </AdminSidebar>
  );
}
