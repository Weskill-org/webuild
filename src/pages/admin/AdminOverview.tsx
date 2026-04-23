import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Briefcase, DollarSign, Activity, AlertTriangle, Flag, Loader2,
} from "lucide-react";

const inr = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalRevenue: number;
  activeProjects: number;
  openDisputes: number;
  pendingReports: number;
  usersByRole: Record<string, number>;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [profilesRes, projectsRes, walletsRes, disputesRes, reportsRes, activityRes] =
        await Promise.all([
          supabase.from("profiles").select("role"),
          supabase.from("projects").select("status"),
          supabase.from("wallets").select("balance"),
          supabase.from("disputes").select("status"),
          supabase.from("reports").select("status"),
          supabase.from("activity_feed").select("*").order("created_at", { ascending: false }).limit(10),
        ]);

      const roles: Record<string, number> = {};
      (profilesRes.data ?? []).forEach((p: any) => {
        const r = p.role || "unknown";
        roles[r] = (roles[r] || 0) + 1;
      });

      setStats({
        totalUsers: (profilesRes.data ?? []).length,
        totalProjects: (projectsRes.data ?? []).length,
        totalRevenue: (walletsRes.data ?? []).reduce((s: number, w: any) => s + (w.balance ?? 0), 0),
        activeProjects: (projectsRes.data ?? []).filter((p: any) => p.status === "open" || p.status === "in_progress").length,
        openDisputes: (disputesRes.data ?? []).filter((d: any) => d.status === "open").length,
        pendingReports: (reportsRes.data ?? []).filter((r: any) => r.status === "pending").length,
        usersByRole: roles,
      });
      setActivity(activityRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "Total Projects", value: stats.totalProjects, icon: Briefcase, color: "text-accent" },
    { label: "Active Projects", value: stats.activeProjects, icon: Activity, color: "text-green-500" },
    { label: "Platform Balance", value: inr(stats.totalRevenue), icon: DollarSign, color: "text-amber-500" },
    { label: "Open Disputes", value: stats.openDisputes, icon: AlertTriangle, color: "text-destructive" },
    { label: "Pending Reports", value: stats.pendingReports, icon: Flag, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor platform health and key metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((s) => (
          <Card key={s.label} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Users by Role</h2>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(stats.usersByRole).map(([role, count]) => (
            <Badge key={role} variant="secondary" className="text-sm px-3 py-1.5 capitalize">
              {role}: {count}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="flex justify-between items-center text-sm border-b border-border pb-2">
                <span className="capitalize">{a.action.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground text-xs">
                  {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
