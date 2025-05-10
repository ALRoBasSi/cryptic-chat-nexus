
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarProvider,
  SidebarRail,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Users,
  MessageSquare,
  Settings,
  Shield,
  ChevronLeft,
  LogOut,
  LayoutDashboard,
  BarChart3,
} from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  children: React.ReactNode;
}

export default function AdminSidebar({ children }: AdminSidebarProps) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // تحديد الصفحة الحالية من المسار
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes("/users")) return "users";
    if (path.includes("/rooms")) return "rooms";
    if (path.includes("/settings")) return "settings";
    if (path.includes("/reports")) return "reports";
    return "dashboard";
  };

  const menuItems = [
    {
      title: "لوحة القيادة",
      id: "dashboard",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    },
    {
      title: "إدارة المستخدمين",
      id: "users",
      icon: Users,
      path: "/admin/dashboard?tab=users",
    },
    {
      title: "إدارة الغرف",
      id: "rooms",
      icon: MessageSquare,
      path: "/admin/dashboard?tab=rooms",
    },
    {
      title: "إعدادات النظام",
      id: "settings",
      icon: Settings,
      path: "/admin/dashboard?tab=settings",
    },
    {
      title: "التقارير والإحصائيات",
      id: "reports",
      icon: BarChart3,
      path: "/admin/dashboard?tab=reports",
    },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-hacker-dark-bg">
        <Sidebar side="right" className="border-l border-hacker/30">
          <SidebarHeader>
            <div className="flex items-center gap-2 p-4">
              <Shield className="h-6 w-6 text-hacker" />
              <div className="font-bold text-hacker text-lg">
                نظام المحادثة المشفر
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          activeTab === item.id || 
                          getCurrentTab() === item.id
                        }
                        tooltip={item.title}
                        onClick={() => setActiveTab(item.id)}
                      >
                        <Link to={item.path} className="flex flex-row-reverse">
                          <item.icon className="ml-2" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <Button
              onClick={logoutUser}
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start flex flex-row-reverse"
            >
              <LogOut className="ml-2 h-5 w-5" />
              تسجيل الخروج
            </Button>
            <div className="p-4 text-xs text-center text-hacker-text opacity-50">
              &copy; {new Date().getFullYear()} نظام المحادثة المشفر
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="overflow-y-auto p-0">
          <div className="w-full">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hacker/20 bg-hacker-dark-bg p-4">
              <div className="flex-1"></div>
              <div className="flex-1 text-center">
                <h1 className="text-xl font-bold text-hacker">لوحة تحكم المسؤول</h1>
              </div>
              <div className="flex items-center justify-end flex-1">
                <SidebarTrigger className="text-hacker">
                  <ChevronLeft className="h-5 w-5" />
                </SidebarTrigger>
              </div>
            </header>
            <main className="p-4 md:p-6">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
