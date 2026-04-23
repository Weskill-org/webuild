import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminDisputes() {
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
    const { error } = await supabase.from("disputes").update({ status: "resolved", resolution, resolved_at: new Date().toISOString() }).eq("id", resolveId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setDisputes(disputes.map((d) => d.id === resolveId ? { ...d, status: "resolved", resolution } : d));
    setResolveId(null); setResolution("");
    toast({ title: "Dispute resolved" });
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Disputes</h1><p className="text-muted-foreground text-sm mt-1">Review and resolve platform disputes</p></div>
      <Card className="p-4">
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>Reason</TableHead><TableHead>Raised By</TableHead><TableHead>Against</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {disputes.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-sm max-w-[200px] truncate">{d.reason}</TableCell>
                <TableCell className="text-sm">{profiles[d.raised_by] || "—"}</TableCell>
                <TableCell className="text-sm">{profiles[d.against] || "—"}</TableCell>
                <TableCell><Badge variant={d.status === "open" ? "destructive" : "secondary"} className="capitalize">{d.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{d.status === "open" && <Button size="sm" variant="outline" onClick={() => setResolveId(d.id)}>Resolve</Button>}</TableCell>
              </TableRow>
            ))}
            {disputes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No disputes found.</TableCell></TableRow>}
          </TableBody></Table></div>
        )}
      </Card>
      <Dialog open={!!resolveId} onOpenChange={() => setResolveId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Resolve Dispute</DialogTitle></DialogHeader>
          <Textarea placeholder="Enter resolution details..." value={resolution} onChange={(e) => setResolution(e.target.value)} rows={4} />
          <DialogFooter><Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={!resolution.trim()}>Submit Resolution</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
