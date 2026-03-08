import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Briefcase,
  DollarSign,
  Activity,
  Search,
  Shield,
  ShieldAlert,
  Loader2,
  Ban,
  CheckCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PlatformUser {
  id: string;
  full_name: string | null;
  company_name: string | null;
  university: string | null;
  role: string | null;
  created_at: string;
  logo_url: string | null;
}

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalRevenue: number;
  activeProjects: number;
  usersByRole: Record<string, number>;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProjects: 0,
    totalRevenue: 0,
    activeProjects: 0,
    usersByRole: {},
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Check admin role
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
    })();
  }, [user]);

  // Fetch data
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      const [profilesRes, projectsRes, walletsRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("projects").select("*"),
        supabase.from("wallets").select("balance"),
      ]);

      const allUsers = (profilesRes.data ?? []) as PlatformUser[];
      const allProjects = projectsRes.data ?? [];

      const roleCount: Record<string, number> = {};
      allUsers.forEach((u) => {
        const r = u.role || "unknown";
        roleCount[r] = (roleCount[r] || 0) + 1;
      });

      setUsers(allUsers);
      setStats({
        totalUsers: allUsers.length,
        totalProjects: allProjects.length,
        totalRevenue: (walletsRes.data ?? []).reduce((s: number, w: any) => s + (w.balance ?? 0), 0),
        activeProjects: allProjects.filter((p: any) => p.status === "open" || p.status === "in_progress").length,
        usersByRole: roleCount,
      });
      setLoading(false);
    })();
  }, [isAdmin]);

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
          <p className="text-muted-foreground mb-4">You don't have admin privileges to access this page.</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  const filteredUsers = users.filter((u) => {
    const name = u.full_name || u.company_name || u.university || "";
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleGrantAdmin = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Admin role granted" });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
            { label: "Total Projects", value: stats.totalProjects, icon: Briefcase, color: "text-accent" },
            { label: "Active Projects", value: stats.activeProjects, icon: Activity, color: "text-green-500" },
            { label: "Platform Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-amber-500" },
          ].map((s) => (
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

        {/* Role breakdown */}
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

        {/* Users table */}
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <Card className="p-4">
              <div className="flex gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="campus">Campus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
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
                              <span className="font-medium text-sm">
                                {u.full_name || u.company_name || u.university || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{u.role || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/profile/${u.id}`)}>
                                View
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleGrantAdmin(u.id)}>
                                <Shield className="w-3 h-3 mr-1" /> Admin
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
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <Card className="p-6 text-center text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Project moderation panel — view all projects, flag/remove inappropriate ones.</p>
              <p className="text-xs mt-1">Coming with extended moderation features.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
