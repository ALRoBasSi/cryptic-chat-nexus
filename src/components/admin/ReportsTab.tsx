
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ReportsTab() {
  return (
    <Card className="hacker-card shadow-lg">
      <CardHeader>
        <CardTitle className="text-hacker text-xl">التقارير والإحصائيات</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-hacker-text mb-6">
          تقارير النظام والإحصائيات عن استخدام المنصة.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4 hacker-card border-hacker/10">
            <h3 className="text-hacker font-bold mb-4">تقرير النشاط</h3>
            <div className="h-40 bg-hacker/10 rounded-md flex items-center justify-center">
              <p className="text-hacker-text">بيانات الرسم البياني هنا</p>
            </div>
          </Card>
          
          <Card className="p-4 hacker-card border-hacker/10">
            <h3 className="text-hacker font-bold mb-4">استخدام النظام</h3>
            <div className="h-40 bg-hacker/10 rounded-md flex items-center justify-center">
              <p className="text-hacker-text">بيانات الرسم البياني هنا</p>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
