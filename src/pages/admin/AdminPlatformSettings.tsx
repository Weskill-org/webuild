import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Settings, Megaphone, Percent, Save, Gift, Coins, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminPlatformSettings() {
  const [loading, setLoading] = useState(true);

  const [siteConfig, setSiteConfig] = useState({
    name: "Webuild", email: "support@webuild.com", phone: "", logo: "",
  });

  const [banner, setBanner] = useState({
    active: false, message: "", type: "info" as "info" | "warning" | "destructive", link: "", linkText: "",
  });

  const [commission, setCommission] = useState({ rate: 10 });

  const [referralConfig, setReferralConfig] = useState({
    amount: 150, enabled: true, max_referrals_per_user: 50,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("platform_settings").select("*");
      if (error) {
        console.error("Error fetching platform settings:", error);
      } else if (data) {
        const config = data.find((s: any) => s.key === "site_config")?.value;
        if (config) setSiteConfig((prev) => ({ ...prev, ...config }));
        const b = data.find((s: any) => s.key === "banner")?.value;
        if (b) setBanner((prev) => ({ ...prev, ...b }));
        const c = data.find((s: any) => s.key === "commission")?.value;
        if (c) setCommission((prev) => ({ ...prev, ...c }));
        const r = data.find((s: any) => s.key === "referral_reward")?.value;
        if (r) setReferralConfig((prev) => ({ ...prev, ...r }));
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async (key: string, value: any) => {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${key.replace(/_/g, " ")} updated successfully` });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure global platform settings</p>
      </div>

      {/* General Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">General Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Site Name</label>
            <Input value={siteConfig.name} onChange={(e) => setSiteConfig({ ...siteConfig, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Support Email</label>
            <Input value={siteConfig.email} onChange={(e) => setSiteConfig({ ...siteConfig, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Support Phone</label>
            <Input value={siteConfig.phone} onChange={(e) => setSiteConfig({ ...siteConfig, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Logo URL</label>
            <Input value={siteConfig.logo} onChange={(e) => setSiteConfig({ ...siteConfig, logo: e.target.value })} />
          </div>
        </div>
        <Button className="mt-6" onClick={() => handleSave("site_config", siteConfig)}>
          <Save className="w-4 h-4 mr-2" /> Save General Settings
        </Button>
      </Card>

      {/* Announcement Banner */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold">Announcement Banner</h2>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-muted-foreground">Active</span>
             <Switch checked={banner.active} onCheckedChange={(v) => setBanner({ ...banner, active: v })} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Banner Message</label>
            <Textarea value={banner.message} onChange={(e) => setBanner({ ...banner, message: e.target.value })} placeholder="E.g. We are undergoing maintenance on Sunday..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Banner Type</label>
              <Select value={banner.type} onValueChange={(v) => setBanner({ ...banner, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information (Blue)</SelectItem>
                  <SelectItem value="warning">Warning (Amber)</SelectItem>
                  <SelectItem value="destructive">Critical (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Text (Optional)</label>
              <Input value={banner.linkText} onChange={(e) => setBanner({ ...banner, linkText: e.target.value })} placeholder="E.g. Learn More" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Link (Optional)</label>
              <Input value={banner.link} onChange={(e) => setBanner({ ...banner, link: e.target.value })} placeholder="E.g. /blog/maintenance" />
            </div>
          </div>
        </div>
        <Button className="mt-6" onClick={() => handleSave("banner", banner)}>
          <Save className="w-4 h-4 mr-2" /> Save Banner Settings
        </Button>
      </Card>

      {/* Finance Settings */}
      <Card className="p-6 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-6">
          <Percent className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Finance & Commission</h2>
        </div>
        <div className="max-w-xs space-y-2">
          <label className="text-sm font-medium">Platform Commission Rate (%)</label>
          <div className="flex items-center gap-3">
            <Input type="number" value={commission.rate} onChange={(e) => setCommission({ rate: Number(e.target.value) })} className="font-bold text-lg" />
            <span className="text-xl font-bold text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">This rate is applied automatically to all project payouts.</p>
        </div>
        <Button className="mt-6" onClick={() => handleSave("commission", commission)}>
          <Save className="w-4 h-4 mr-2" /> Update Commission Rate
        </Button>
      </Card>

      {/* Referral Reward Settings */}
      <Card className="p-6 border-green-500/20 bg-green-500/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold">Referral Reward Settings</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Enabled</span>
            <Switch checked={referralConfig.enabled} onCheckedChange={(v) => setReferralConfig({ ...referralConfig, enabled: v })} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reward Per Referral (coins)</label>
            <div className="flex items-center gap-3">
              <Input type="number" value={referralConfig.amount} onChange={(e) => setReferralConfig({ ...referralConfig, amount: Number(e.target.value) })} className="font-bold text-lg" min={0} />
              <Coins className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Both referrer and referred user receive this amount.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Referrals Per User</label>
            <Input type="number" value={referralConfig.max_referrals_per_user} onChange={(e) => setReferralConfig({ ...referralConfig, max_referrals_per_user: Number(e.target.value) })} min={1} />
            <p className="text-xs text-muted-foreground">Maximum number of successful referrals a single user can make.</p>
          </div>
        </div>
        <Button className="mt-6" onClick={() => handleSave("referral_reward", { ...referralConfig, currency: "INR" })}>
          <Save className="w-4 h-4 mr-2" /> Update Referral Settings
        </Button>
      </Card>
    </div>
  );
}
