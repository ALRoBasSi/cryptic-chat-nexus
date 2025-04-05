
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import Chat from "./pages/Chat";
import AdminDashboard from "./pages/admin/Dashboard";
import UserAdd from "./pages/admin/UserAdd";
import UserEdit from "./pages/admin/UserEdit";
import RoomAdd from "./pages/admin/RoomAdd";
import RoomEdit from "./pages/admin/RoomEdit";
import SystemSettings from "./pages/admin/SystemSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* صفحة الدخول المتاحة للجميع */}
          <Route path="/" element={<Index />} />
          
          {/* صفحات غير مصرح */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* صفحات المسؤول */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users/add" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserAdd />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users/edit/:userId" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserEdit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/rooms/add" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RoomAdd />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/rooms/edit/:roomId" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RoomEdit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SystemSettings />
              </ProtectedRoute>
            } 
          />
          
          {/* صفحات الدردشة */}
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat/:roomId" 
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } 
          />
          
          {/* صفحة خطأ 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
