
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { ChevronRight, Shield, Key, Database, FileText } from "lucide-react";

// نموذج مبسط لإعدادات النظام (في تطبيق حقيقي يتم تخزينها في localStorage أو قاعدة بيانات)
interface SystemSettings {
  encryptionKey: string;
  encryptionAlgorithm: string;
  defaultPermissions: {
    canCreateRoom: boolean;
    canUploadFiles: boolean;
    canDeleteMessages: boolean;
    canBanUsers: boolean;
  };
  messageRetentionDays: number;
  enableAuditLog: boolean;
}

export default function SystemSettings() {
  // في تطبيق حقيقي، سنقوم بجلب الإعدادات من قاعدة البيانات
  const [settings, setSettings] = useState<SystemSettings>({
    encryptionKey: "********",
    encryptionAlgorithm: "AES-256",
    defaultPermissions: {
      canCreateRoom: false,
      canUploadFiles: false,
      canDeleteMessages: false,
      canBanUsers: false
    },
    messageRetentionDays: 30,
    enableAuditLog: true
  });

  const handleSaveEncryptionSettings = () => {
    // في تطبيق حقيقي، سنقوم بحفظ الإعدادات في قاعدة البيانات
    toast({
      title: "تم الحفظ",
      description: "تم حفظ إعدادات التشفير بنجاح"
    });
  };

  const handleSaveDefaultPermissions = () => {
    // في تطبيق حقيقي، سنقوم بحفظ الإعدادات في قاعدة البيانات
    toast({
      title: "تم الحفظ",
      description: "تم حفظ إعدادات الصلاحيات الافتراضية بنجاح"
    });
  };

  const handleSaveSystemSettings = () => {
    // في تطبيق حقيقي، سنقوم بحفظ الإعدادات في قاعدة البيانات
    toast({
      title: "تم الحفظ",
      description: "تم حفظ إعدادات النظام بنجاح"
    });
  };

  const regenerateEncryptionKey = () => {
    // في تطبيق حقيقي، سنقوم بإنشاء مفتاح تشفير جديد
    setSettings({
      ...settings,
      encryptionKey: "********"
    });
    
    toast({
      title: "تم التحديث",
      description: "تم إنشاء مفتاح تشفير جديد بنجاح"
    });
  };

  return (
    <div className="min-h-screen bg-hacker-bg">
      <header className="bg-hacker-dark-bg border-b border-hacker/20 py-4">
        <div className="container flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-hacker font-bold text-xl font-mono">إعدادات النظام</h1>
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
          <span className="text-hacker">إعدادات النظام</span>
        </div>

        <div className="space-y-6">
          <Card className="hacker-card shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <Key className="w-6 h-6 text-hacker ml-2" />
                <CardTitle className="text-hacker text-xl">إعدادات التشفير</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="encryptionKey" className="text-hacker-text">مفتاح التشفير</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="encryptionKey" 
                      value={settings.encryptionKey} 
                      type="password"
                      readOnly
                      className="bg-hacker-dark-bg border-hacker/30 text-hacker-text flex-1"
                    />
                    <Button 
                      onClick={regenerateEncryptionKey}
                      className="cyber-button"
                    >
                      إعادة إنشاء
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    تحذير: إعادة إنشاء المفتاح ستمنع قراءة الرسائل المشفرة السابقة.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="algorithm" className="text-hacker-text">خوارزمية التشفير</Label>
                  <Select 
                    value={settings.encryptionAlgorithm}
                    onValueChange={(value) => setSettings({...settings, encryptionAlgorithm: value})}
                  >
                    <SelectTrigger id="algorithm" className="bg-hacker-dark-bg border-hacker/30 text-hacker-text">
                      <SelectValue placeholder="اختر خوارزمية التشفير" />
                    </SelectTrigger>
                    <SelectContent className="bg-hacker-dark-bg border-hacker/30">
                      <SelectItem value="AES-128" className="text-hacker-text">AES-128</SelectItem>
                      <SelectItem value="AES-256" className="text-hacker-text">AES-256</SelectItem>
                      <SelectItem value="RSA-2048" className="text-hacker-text">RSA-2048</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveEncryptionSettings}
                    className="cyber-button"
                  >
                    حفظ إعدادات التشفير
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hacker-card shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <Shield className="w-6 h-6 text-hacker ml-2" />
                <CardTitle className="text-hacker text-xl">إعدادات الصلاحيات الافتراضية</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-hacker-text">
                  هذه الصلاحيات سيتم تطبيقها تلقائيًا على المستخدمين الجدد عند إنشاء حساباتهم.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="createRoom" className="text-hacker-text cursor-pointer">
                      إنشاء غرف دردشة
                    </Label>
                    <Switch 
                      id="createRoom" 
                      checked={settings.defaultPermissions.canCreateRoom}
                      onCheckedChange={(checked) => 
                        setSettings({
                          ...settings, 
                          defaultPermissions: {
                            ...settings.defaultPermissions,
                            canCreateRoom: checked
                          }
                        })
                      }
                      className="data-[state=checked]:bg-hacker"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="uploadFiles" className="text-hacker-text cursor-pointer">
                      رفع ملفات مرفقة
                    </Label>
                    <Switch 
                      id="uploadFiles" 
                      checked={settings.defaultPermissions.canUploadFiles}
                      onCheckedChange={(checked) => 
                        setSettings({
                          ...settings, 
                          defaultPermissions: {
                            ...settings.defaultPermissions,
                            canUploadFiles: checked
                          }
                        })
                      }
                      className="data-[state=checked]:bg-hacker"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="deleteMessages" className="text-hacker-text cursor-pointer">
                      حذف الرسائل
                    </Label>
                    <Switch 
                      id="deleteMessages" 
                      checked={settings.defaultPermissions.canDeleteMessages}
                      onCheckedChange={(checked) => 
                        setSettings({
                          ...settings, 
                          defaultPermissions: {
                            ...settings.defaultPermissions,
                            canDeleteMessages: checked
                          }
                        })
                      }
                      className="data-[state=checked]:bg-hacker"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="banUsers" className="text-hacker-text cursor-pointer">
                      حظر المستخدمين
                    </Label>
                    <Switch 
                      id="banUsers" 
                      checked={settings.defaultPermissions.canBanUsers}
                      onCheckedChange={(checked) => 
                        setSettings({
                          ...settings, 
                          defaultPermissions: {
                            ...settings.defaultPermissions,
                            canBanUsers: checked
                          }
                        })
                      }
                      className="data-[state=checked]:bg-hacker"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveDefaultPermissions}
                    className="cyber-button"
                  >
                    حفظ الصلاحيات الافتراضية
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hacker-card shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <Database className="w-6 h-6 text-hacker ml-2" />
                <CardTitle className="text-hacker text-xl">إعدادات النظام العامة</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="retention" className="text-hacker-text">مدة الاحتفاظ بالرسائل (بالأيام)</Label>
                  <Input 
                    id="retention" 
                    type="number"
                    min="1"
                    max="365"
                    value={settings.messageRetentionDays}
                    onChange={(e) => setSettings({
                      ...settings,
                      messageRetentionDays: parseInt(e.target.value) || 30
                    })}
                    className="bg-hacker-dark-bg border-hacker/30 text-hacker-text w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    سيتم حذف الرسائل تلقائيًا بعد انقضاء هذه المدة. 0 تعني الاحتفاظ إلى الأبد.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auditLog" className="text-hacker-text cursor-pointer">
                    تمكين سجل المراقبة
                  </Label>
                  <Switch 
                    id="auditLog" 
                    checked={settings.enableAuditLog}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings, 
                        enableAuditLog: checked
                      })
                    }
                    className="data-[state=checked]:bg-hacker"
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveSystemSettings}
                    className="cyber-button"
                  >
                    حفظ إعدادات النظام
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hacker-card shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-hacker ml-2" />
                <CardTitle className="text-hacker text-xl">سجل النظام</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 font-mono text-xs text-hacker-text bg-hacker-dark-bg border border-hacker/30 rounded-md h-40 overflow-auto whitespace-pre">
{`[2025-04-05 10:15:32] حاول المستخدم "client1" الوصول إلى صفحة الإدارة. تم رفض الوصول.
[2025-04-05 09:45:12] قام المسؤول "admin1" بتغيير صلاحيات المستخدم "client1".
[2025-04-05 09:30:05] قام المسؤول "admin1" بإنشاء غرفة دردشة جديدة "غرفة خاصة".
[2025-04-05 09:15:23] تم تسجيل دخول المسؤول "admin1" بنجاح.
[2025-04-05 08:55:07] محاولة تسجيل دخول فاشلة لحساب "client1".
[2025-04-04 22:10:45] تم حذف 47 رسالة قديمة بواسطة نظام تنظيف البيانات التلقائي.
[2025-04-04 19:20:18] قام المستخدم "client1" برفع ملف في الغرفة "غرفة عامة".
[2025-04-04 15:35:09] قام المسؤول "admin1" بإضافة مستخدم جديد "مستخدم عادي".`}
              </div>
              
              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline"
                  className="text-hacker-text border-hacker/30 hover:bg-hacker/10"
                >
                  تنزيل السجل الكامل
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
