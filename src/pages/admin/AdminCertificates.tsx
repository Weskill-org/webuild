import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";

export default function AdminCertificates() {
  const [certs, setCerts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cRes, pRes] = await Promise.all([
        supabase.from("certificates").select("*").order("issued_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name"),
      ]);
      setCerts(cRes.data ?? []);
      const map: Record<string, string> = {};
      (pRes.data ?? []).forEach((p: any) => { map[p.id] = p.full_name || "—"; });
      setProfiles(map);
      setLoading(false);
    })();
  }, []);

  const filtered = certs.filter((c) => {
    const name = profiles[c.student_id] || c.project_title || c.certificate_uid || "";
    return !search || name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Certificates Management</h1><p className="text-muted-foreground text-sm mt-1">View all issued certificates</p></div>
      <Card className="p-4">
        <div className="mb-4 max-w-sm relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search certificates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>Student</TableHead><TableHead>Project</TableHead><TableHead>Company</TableHead>
            <TableHead>UID</TableHead><TableHead>Issued</TableHead>
          </TableRow></TableHeader><TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm font-medium">{profiles[c.student_id] || "—"}</TableCell>
                <TableCell className="text-sm">{c.project_title || "—"}</TableCell>
                <TableCell className="text-sm">{c.company_name || "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="font-mono text-xs">{c.display_id || c.certificate_uid}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.issued_at ? new Date(c.issued_at).toLocaleDateString() : "—"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No certificates found.</TableCell></TableRow>}
          </TableBody></Table></div>
        )}
      </Card>
    </div>
  );
}
