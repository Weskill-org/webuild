import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Gift, Copy, Check, Share2, Users, Coins, ArrowRight,
  MessageCircle, Mail, Twitter, Loader2, IndianRupee,
  Sparkles, TrendingUp, UserPlus, Wallet,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import useRealtime from "@/hooks/use-realtime";
import type { Referral } from "@/types/database";

const ReferEarn = () => {
  const { profile } = useAuth();
  const { walletBalance } = useRealtime();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(150);

  const referralCode = profile?.referral_code || "";
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const referralLink = `${siteUrl}/signup?ref=${referralCode}`;

  useEffect(() => {
    if (!profile?.id) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch referrals
      const { data: refData } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", profile.id)
        .order("created_at", { ascending: false });

      setReferrals((refData as unknown as Referral[]) ?? []);

      // Fetch reward settings
      const { data: settingsData } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "referral_reward")
        .single();

      if (settingsData?.value) {
        const val = settingsData.value as any;
        setRewardAmount(val.amount || 150);
      }

      setLoading(false);
    };

    fetchData();
  }, [profile?.id]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Please copy manually" });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast({ title: "Copied!", description: "Referral link copied to clipboard" });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Please copy manually" });
    }
  };

  const handleShare = (platform: string) => {
    const message = `Join Webuild and start earning! Use my referral code "${referralCode}" to get ${rewardAmount} coins instantly. Sign up here:`;
    const encodedMessage = encodeURIComponent(message);
    const encodedLink = encodeURIComponent(referralLink);

    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodedMessage}%20${encodedLink}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedLink}`,
      email: `mailto:?subject=${encodeURIComponent(`Join Webuild & get ${rewardAmount} coins!`)}&body=${encodedMessage}%20${encodedLink}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], "_blank");
    }
  };

  const completedReferrals = referrals.filter((r) => r.status === "completed").length;
  const totalEarned = referrals
    .filter((r) => r.status === "completed" && r.referrer_credited)
    .reduce((sum, r) => sum + (r.referrer_reward ?? 0), 0);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 md:p-8 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhoLTEydjJoMTJ6TTI0IDI0aDEydi0ySDI0djJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md hover:bg-white/30">
                <Sparkles className="w-3 h-3 mr-1" /> Refer & Earn
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Invite Friends, Earn {rewardAmount} Coins Each!
            </h1>
            <p className="text-white/80 text-sm md:text-base max-w-lg">
              Share your unique referral code with friends. When they sign up, you both get{" "}
              <span className="font-bold text-yellow-300">{rewardAmount} coins</span> credited to your wallets instantly.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 text-center bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-card border-green-200/50 dark:border-green-800/30">
            <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-2">
              <Coins className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">{totalEarned}</p>
            <p className="text-xs text-muted-foreground">Coins Earned</p>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-card border-blue-200/50 dark:border-blue-800/30">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mx-auto mb-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{completedReferrals}</p>
            <p className="text-xs text-muted-foreground">Successful</p>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-card border-amber-200/50 dark:border-amber-800/30">
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{referrals.length}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-b from-purple-50 to-white dark:from-purple-950/20 dark:to-card border-purple-200/50 dark:border-purple-800/30">
            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-2">
              <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{walletBalance.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
          </Card>
        </div>

        {/* Referral Code Card */}
        <Card className="p-6 border-2 border-dashed border-primary/30 bg-primary/5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" /> Your Referral Code
          </h2>

          {/* Code Display */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-background rounded-xl border-2 border-primary/20 p-4 text-center">
              <p className="text-2xl md:text-3xl font-black tracking-[0.3em] text-primary font-mono">
                {referralCode || "Loading..."}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-14 w-14 shrink-0 rounded-xl border-2 border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={handleCopyCode}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>

          {/* Referral Link */}
          <div className="flex items-center gap-2 mb-5">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-xs bg-background"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant={copiedLink ? "default" : "outline"}
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copiedLink ? "Copied" : "Copy Link"}
            </Button>
          </div>

          {/* Share Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-1">
              <Share2 className="w-4 h-4 inline mr-1" />Share via:
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare("whatsapp")}
              className="gap-1.5 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-950/30 dark:hover:bg-green-900/40 dark:border-green-800 dark:text-green-400"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare("twitter")}
              className="gap-1.5 bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-700 dark:bg-sky-950/30 dark:hover:bg-sky-900/40 dark:border-sky-800 dark:text-sky-400"
            >
              <Twitter className="w-4 h-4" /> Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare("email")}
              className="gap-1.5 bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:hover:bg-orange-900/40 dark:border-orange-800 dark:text-orange-400"
            >
              <Mail className="w-4 h-4" /> Email
            </Button>
          </div>
        </Card>

        {/* How It Works */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-5">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: 1,
                icon: Share2,
                title: "Share Your Code",
                desc: "Copy your referral code or link and share it with friends via any channel.",
                color: "text-violet-600 dark:text-violet-400",
                bg: "bg-violet-100 dark:bg-violet-900/40",
              },
              {
                step: 2,
                icon: UserPlus,
                title: "Friend Signs Up",
                desc: "Your friend creates an account on Webuild using your referral code.",
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-100 dark:bg-blue-900/40",
              },
              {
                step: 3,
                icon: Coins,
                title: "Both Earn Coins",
                desc: `You and your friend each get ${rewardAmount} coins in your wallets!`,
                color: "text-green-600 dark:text-green-400",
                bg: "bg-green-100 dark:bg-green-900/40",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center text-center p-4 rounded-xl bg-muted/30"
              >
                {i < 2 && (
                  <ArrowRight className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground/40 z-10" />
                )}
                <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center mb-3`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mb-2">
                  {item.step}
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Referral History */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Referral History
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No referrals yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Share your referral code with friends to start earning coins together!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        ref.status === "completed"
                          ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
                          : ref.status === "revoked"
                          ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400"
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Friend referred</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ref.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        ref.status === "completed" ? "default" :
                        ref.status === "revoked" ? "destructive" : "secondary"
                      }
                      className="capitalize"
                    >
                      {ref.status === "completed" ? "✓ Completed" :
                       ref.status === "revoked" ? "Revoked" : "Pending"}
                    </Badge>
                    {ref.status === "completed" && (
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center">
                        +{ref.referrer_reward} <Coins className="w-3 h-3 ml-0.5" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReferEarn;
