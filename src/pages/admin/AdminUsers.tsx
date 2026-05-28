import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, Eye, CheckCircle, XCircle, Loader2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PlatformUser {
  id: string; full_name: string | null; company_name: string | null;
  university: string | null; role: string | null; email: string | null;
  verified: boolean | null; created_at: string; logo_url: string | null;
}

const PAGE_SIZE = 50;

export default function AdminUsers() {
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

  // ⚡ Bolt Optimization: Memoized filter pipeline
  // 🎯 Why: Re-filtering the entire users list on every keystroke (or unrelated render) was expensive.
  // 📊 Impact: Filtering execution only happens when `search`, `roleFilter` or `users` change.
  const { filtered, totalPages } = useMemo(() => {
    const f = users.filter((u) => {
      const name = u.full_name || u.company_name || u.university || u.email || "";
      return (!search || name.toLowerCase().includes(search.toLowerCase())) &&
             (roleFilter === "all" || u.role === roleFilter);
    });
    return {
      filtered: f,
      totalPages: Math.ceil(f.length / PAGE_SIZE)
    };
  }, [users, search, roleFilter]);

  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  const handleRoleAction = async (userId: string, role: string, action: string) => {
    const finalRole = action === "grant" ? role : "user";
    const { error } = await supabase.rpc("admin_update_user_role", {
      target_user_id: userId,
      new_role: finalRole
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setUsers(users.map(u => u.id === userId ? { ...u, role: finalRole } : u));
    toast({ title: `${action === "grant" ? "Granted" : "Revoked"} ${role} role` });
  };

  const handleToggleVerified = async (userId: string, currentStatus: boolean | null) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.rpc("admin_toggle_user_verified", {
      target_user_id: userId,
      new_status: newStatus
    });
    
    if (error) { 
      toast({ title: "Error", description: error.message || "Failed to verify user", variant: "destructive" });
      return; 
    }
    
    setUsers(users.map(u => u.id === userId ? { ...u, verified: newStatus } : u));
    toast({ title: `User ${newStatus ? "verified" : "unverified"} successfully` });
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">User Management</h1><p className="text-muted-foreground text-sm mt-1">Manage platform users and roles</p></div>
      <Card className="p-4">
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
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <>
            <div className="overflow-x-auto">
              <Table><TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>
                <TableHead>Verified</TableHead><TableHead>Joined</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader><TableBody>
                {paged.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell><div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
                        {u.logo_url ? <img src={u.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" /> :
                        <span className="text-primary-foreground text-xs font-medium">{(u.full_name || u.company_name || "?")[0]?.toUpperCase()}</span>}
                      </div>
                      <span className="font-medium text-sm">{u.full_name || u.company_name || u.university || "—"}</span>
                    </div></TableCell>
                    <TableCell className="text-sm">{u.email || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{u.role || "—"}</Badge></TableCell>
                    <TableCell>{u.verified ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</TableCell>
                     <TableCell><div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/profile/${u.id}`)}><Eye className="w-3 h-3 mr-1" /> View</Button>
                      <Button size="sm" variant="outline" onClick={() => handleRoleAction(u.id, "admin", "grant")}><Shield className="w-3 h-3 mr-1" /> Admin</Button>
                      <Button size="sm" variant="outline" onClick={() => handleRoleAction(u.id, "moderator", "grant")}>Mod</Button>
                      <Button 
                        size="sm" 
                        variant={u.verified ? "ghost" : "outline"}
                        className={u.verified ? "text-green-500 hover:text-green-600 hover:bg-green-50" : ""}
                        onClick={() => handleToggleVerified(u.id, u.verified)}
                      >
                        {u.verified ? <CheckCircle className="w-3 h-3 mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                        {u.verified ? "Verified" : "Verify"}
                      </Button>
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody></Table>
            </div>
            {totalPages > 1 && <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages} ({filtered.length} users)</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>}
          </>
        )}
      </Card>
    </div>
  );
}
