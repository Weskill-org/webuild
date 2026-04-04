import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Briefcase, DollarSign, Activity, Search, Shield, ShieldAlert,
  Loader2, AlertTriangle, Flag, Gift, Award, Wallet,
  Plus, Trash2, Eye, CheckCircle, XCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformUser {
  id: string;
  full_name: string | null;
  company_name: string | null;
  university: string | null;
  role: string | null;
  email: string | null;
  verified: boolean | null;
  created_at: string;
  logo_url: string | null;
}

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalRevenue: number;
  activeProjects: number;
  openDisputes: number;
  pendingReports: number;
  usersByRole: Record<string, number>;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const inr = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const PAGE_SIZE = 50;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Auth / admin gate
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user]);

  // ── Active tab ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");

  if (isAdmin === null) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-20 text-center">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Admin Console</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="giftcards">Gift Cards</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="projects"><ProjectsTab /></TabsContent>
          <TabsContent value="disputes"><DisputesTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
          <TabsContent value="giftcards"><GiftCardsTab /></TabsContent>
          <TabsContent value="certificates"><CertificatesTab /></TabsContent>
          <TabsContent value="wallets"><WalletsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab() {
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

  if (loading || !stats) return <Loader className />;

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "Total Projects", value: stats.totalProjects, icon: Briefcase, color: "text-accent" },
    { label: "Active Projects", value: stats.activeProjects, icon: Activity, color: "text-green-500" },
    { label: "Platform Balance", value: inr(stats.totalRevenue), icon: DollarSign, color: "text-amber-500" },
    { label: "Open Disputes", value: stats.openDisputes, icon: AlertTriangle, color: "text-destructive" },
    { label: "Pending Reports", value: stats.pendingReports, icon: Flag, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <s.icon className={`w-8 h-8 ${s.color} opacity-80`} />
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

// ═══════════════════════════════════════════════════════════════════════════════
// 2. USERS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function UsersTab() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("profiles").select("id, full_name, company_name, university, role, email, verified, created_at, logo_url");
      setUsers((data ?? []) as PlatformUser[]);
      setLoading(false);
    })();
  }, []);

  const filtered = users.filter((u) => {
    const name = u.full_name || u.company_name || u.university || u.email || "";
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleRoleAction = async (userId: string, role: "admin" | "moderator", action: "grant" | "revoke") => {
    if (action === "grant") {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    }
    toast({ title: `${action === "grant" ? "Granted" : "Revoked"} ${role} role` });
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="campus">Campus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoaderBlock /> : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
                          {u.logo_url ? (
                            <img src={u.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-primary-foreground text-xs font-medium">
                              {(u.full_name || u.company_name || "?")[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-sm">{u.full_name || u.company_name || u.university || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.email || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{u.role || "—"}</Badge></TableCell>
                    <TableCell>
                      {u.verified ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/profile/${u.id}`)}>
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRoleAction(u.id, "admin", "grant")}>
                          <Shield className="w-3 h-3 mr-1" /> Admin
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRoleAction(u.id, "moderator", "grant")}>
                          Mod
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages} ({filtered.length} users)</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PROJECTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ProjectsTab() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pRes, prRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, company_name"),
      ]);
      setProjects(pRes.data ?? []);
      const map: Record<string, string> = {};
      (prRes.data ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.company_name || "—"; });
      setProfiles(map);
      setLoading(false);
    })();
  }, []);

  const filtered = projects.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project permanently?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setProjects(projects.filter((p) => p.id !== id));
    toast({ title: "Project deleted" });
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoaderBlock /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">{p.title}</TableCell>
                  <TableCell className="text-sm">{profiles[p.owner_id] || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{p.status}</Badge></TableCell>
                  <TableCell className="text-sm">{p.budget_min || p.budget_max ? `${inr(p.budget_min ?? 0)} – ${inr(p.budget_max ?? 0)}` : "—"}</TableCell>
                  <TableCell className="text-sm">{p.category || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${p.id}`)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DISPUTES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function DisputesTab() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [dRes, pRes] = await Promise.all([
        supabase.from("disputes").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, company_name"),
      ]);
      setDisputes(dRes.data ?? []);
      const map: Record<string, string> = {};
      (pRes.data ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.company_name || "—"; });
      setProfiles(map);
      setLoading(false);
    })();
  }, []);

  const handleResolve = async () => {
    if (!resolveId || !resolution.trim()) return;
    const { error } = await supabase
      .from("disputes")
      .update({ status: "resolved", resolution, resolved_at: new Date().toISOString() })
      .eq("id", resolveId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setDisputes(disputes.map((d) => d.id === resolveId ? { ...d, status: "resolved", resolution } : d));
    setResolveId(null);
    setResolution("");
    toast({ title: "Dispute resolved" });
  };

  return (
    <Card className="p-4 mt-4">
      {loading ? <LoaderBlock /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Raised By</TableHead>
                <TableHead>Against</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm max-w-[200px] truncate">{d.reason}</TableCell>
                  <TableCell className="text-sm">{profiles[d.raised_by] || "—"}</TableCell>
                  <TableCell className="text-sm">{profiles[d.against] || "—"}</TableCell>
                  <TableCell><Badge variant={d.status === "open" ? "destructive" : "secondary"} className="capitalize">{d.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {d.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => setResolveId(d.id)}>Resolve</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {disputes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No disputes found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!resolveId} onOpenChange={() => setResolveId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Dispute</DialogTitle></DialogHeader>
          <Textarea placeholder="Enter resolution details..." value={resolution} onChange={(e) => setResolution(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={!resolution.trim()}>Submit Resolution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. REPORTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ReportsTab() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [rRes, pRes] = await Promise.all([
        supabase.from("reports").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, company_name"),
      ]);
      setReports(rRes.data ?? []);
      const map: Record<string, string> = {};
      (pRes.data ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.company_name || "—"; });
      setProfiles(map);
      setLoading(false);
    })();
  }, []);

  const handleAction = async (id: string, status: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setReports(reports.map((r) => r.id === id ? { ...r, status } : r));
    toast({ title: `Report marked as ${status}` });
  };

  return (
    <Card className="p-4 mt-4">
      {loading ? <LoaderBlock /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="capitalize text-sm">{r.target_type}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                  <TableCell className="text-sm">{profiles[r.reporter_id] || "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "pending" ? "destructive" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {r.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleAction(r.id, "reviewed")}>Review</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleAction(r.id, "dismissed")}>Dismiss</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No reports found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GIFT CARDS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function GiftCardsTab() {
  const { user } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("gift_cards").select("*").order("created_at", { ascending: false });
      setCards(data ?? []);
      setLoading(false);
    })();
  }, []);

  const handleCreate = async () => {
    const code = newCode.trim().toUpperCase();
    const amount = parseFloat(newAmount);
    if (!code || isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid input", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("gift_cards")
      .insert({ code, amount, created_by: user?.id })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setCards([data, ...cards]);
    setNewCode("");
    setNewAmount("");
    setShowCreate(false);
    toast({ title: "Gift card created" });
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">Gift Cards</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Create</Button>
      </div>

      {loading ? <LoaderBlock /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Redeemed</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.code}</TableCell>
                  <TableCell className="text-sm">{inr(c.amount)}</TableCell>
                  <TableCell>
                    {c.redeemed ? <Badge variant="secondary">Redeemed</Badge> : <Badge variant="outline">Available</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {cards.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No gift cards yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Gift Card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Code (e.g. GIFT100)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
            <Input placeholder="Amount (₹)" type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. CERTIFICATES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function CertificatesTab() {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("certificates").select("*").order("issued_at", { ascending: false });
      setCerts(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="p-4 mt-4">
      {loading ? <LoaderBlock /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UID</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.certificate_uid || c.display_id || "—"}</TableCell>
                  <TableCell className="text-sm">{c.project_title || "—"}</TableCell>
                  <TableCell className="text-sm">{c.company_name || "—"}</TableCell>
                  <TableCell className="text-sm">{c.course_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.issued_at ? new Date(c.issued_at).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
              {certs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No certificates issued yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. WALLETS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function WalletsTab() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [wRes, pRes] = await Promise.all([
        supabase.from("wallets").select("*").order("balance", { ascending: false }),
        supabase.from("profiles").select("id, full_name, company_name"),
      ]);
      setWallets(wRes.data ?? []);
      const map: Record<string, string> = {};
      (pRes.data ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.company_name || "—"; });
      setProfiles(map);
      setLoading(false);
    })();
  }, []);

  const totalBalance = wallets.reduce((s, w) => s + (w.balance ?? 0), 0);

  return (
    <div className="space-y-4 mt-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Platform Balance</p>
            <p className="text-3xl font-bold mt-1">{inr(totalBalance)}</p>
          </div>
          <Wallet className="w-10 h-10 text-primary opacity-80" />
        </div>
      </Card>

      <Card className="p-4">
        {loading ? <LoaderBlock /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-sm font-medium">{profiles[w.owner_id] || "—"}</TableCell>
                    <TableCell className="text-sm">{inr(w.balance ?? 0)}</TableCell>
                    <TableCell className="text-sm">{w.currency || "INR"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.updated_at ? new Date(w.updated_at).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared loader
// ═══════════════════════════════════════════════════════════════════════════════

function LoaderBlock() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}
