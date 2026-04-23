import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatProjectBudget } from "@/lib/projectUtils";

export default function AdminProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    return (!search || p.title.toLowerCase().includes(search.toLowerCase())) &&
           (statusFilter === "all" || p.status === statusFilter);
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("projects").delete().eq("id", deleteId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProjects(projects.filter((p) => p.id !== deleteId));
    setDeleteId(null);
    toast({ title: "Project deleted successfully" });
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Project Management</h1><p className="text-muted-foreground text-sm mt-1">View and manage all platform projects</p></div>
      <Card className="p-4">
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
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>Title</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead>
            <TableHead>Budget</TableHead><TableHead>Category</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-sm max-w-[200px] truncate">{p.title}</TableCell>
                <TableCell className="text-sm">{profiles[p.owner_id] || "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{p.status}</Badge></TableCell>
                <TableCell className="text-sm">{formatProjectBudget(p)}</TableCell>
                <TableCell className="text-sm">{p.category || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell><div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${p.id}`)}><Eye className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3 h-3" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No projects found.</TableCell></TableRow>}
          </TableBody></Table></div>
        )}
      </Card>
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete Project</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to permanently delete this project? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
