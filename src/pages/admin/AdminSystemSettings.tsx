import { Card } from "@/components/ui/card";
import { Cog, Wrench, Bell, Mail } from "lucide-react";

export default function AdminSystemSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Advanced system configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 border-dashed border-2 border-muted-foreground/20 flex flex-col items-center justify-center text-center min-h-[200px]">
          <Wrench className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-muted-foreground">Maintenance Mode</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Coming soon — toggle maintenance mode</p>
        </Card>

        <Card className="p-6 border-dashed border-2 border-muted-foreground/20 flex flex-col items-center justify-center text-center min-h-[200px]">
          <Mail className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-muted-foreground">Email Templates</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Coming soon — manage email templates</p>
        </Card>

        <Card className="p-6 border-dashed border-2 border-muted-foreground/20 flex flex-col items-center justify-center text-center min-h-[200px]">
          <Bell className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-muted-foreground">Push Notifications</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Coming soon — push notification settings</p>
        </Card>

        <Card className="p-6 border-dashed border-2 border-muted-foreground/20 flex flex-col items-center justify-center text-center min-h-[200px]">
          <Cog className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-muted-foreground">Feature Flags</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Coming soon — enable/disable features</p>
        </Card>
      </div>
    </div>
  );
}
