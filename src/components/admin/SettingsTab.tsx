
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsTab() {
  return (
    <Card className="hacker-card shadow-lg">
      <CardHeader>
        <CardTitle className="text-hacker text-xl">إعدادات النظام</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-hacker-text mb-6">
          من هنا يمكنك تعديل إعدادات النظام وتغيير السياسات والخصائص المختلفة.
        </p>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-hacker font-bold">إعدادات الأمان</h3>
            <Card className="p-4 hacker-card border-hacker/10">
              <p className="text-hacker-text mb-4">
                جميع البيانات والرسائل المرسلة مشفرة باستخدام خوارزمية تشفير متقدمة
              </p>
              <Button asChild className="cyber-button">
                <Link to="/admin/settings">تعديل إعدادات الأمان</Link>
              </Button>
            </Card>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-hacker font-bold">إعدادات الصلاحيات الافتراضية</h3>
            <Card className="p-4 hacker-card border-hacker/10">
              <p className="text-hacker-text mb-4">
                تعديل الصلاحيات الافتراضية للمستخدمين الجدد
              </p>
              <Button asChild className="cyber-button">
                <Link to="/admin/settings">تعديل الصلاحيات الافتراضية</Link>
              </Button>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
