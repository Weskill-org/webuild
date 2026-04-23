import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminReports() {
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
    const { error } = await supabase.from("reports").update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setReports(reports.map((r) => r.id === id ? { ...r, status } : r));
    toast({ title: `Report marked as ${status}` });
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Reports & Analytics</h1><p className="text-muted-foreground text-sm mt-1">Review user reports and content flags</p></div>
      <Card className="p-4">
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>Target Type</TableHead><TableHead>Reason</TableHead><TableHead>Reporter</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="capitalize text-sm">{r.target_type}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                <TableCell className="text-sm">{profiles[r.reporter_id] || "—"}</TableCell>
                <TableCell><Badge variant={r.status === "pending" ? "destructive" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{r.status === "pending" && <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleAction(r.id, "reviewed")}>Review</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleAction(r.id, "dismissed")}>Dismiss</Button>
                </div>}</TableCell>
              </TableRow>
            ))}
            {reports.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No reports found.</TableCell></TableRow>}
          </TableBody></Table></div>
        )}
      </Card>
    </div>
  );
}
