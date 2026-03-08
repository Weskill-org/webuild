import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Handshake, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";

interface Partnership {
  id: string;
  company_id: string;
  campus_id: string;
  message: string | null;
  status: string;
  created_at: string;
  partner_name?: string;
}

export default function Partnerships() {
  const { profile } = useAuth();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isCompany = profile?.role === "company";
  const isCampus = profile?.role === "campus";

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from("partnership_requests").select("*").order("created_at", { ascending: false });
      const items = (data as unknown as Partnership[]) ?? [];

      // Fetch partner names
      const partnerIds = items.map((p) => (p.company_id === profile.id ? p.campus_id : p.company_id));
      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, company_name, university").in("id", partnerIds);
        const nameMap: Record<string, string> = {};
        (profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.company_name || p.university || p.full_name || "User"; });
        items.forEach((p) => { p.partner_name = nameMap[p.company_id === profile.id ? p.campus_id : p.company_id]; });
      }

      setPartnerships(items);

      if (isCompany) {
        const { data: campusProfiles } = await supabase.from("profiles").select("id, university").eq("role", "campus");
        setCampuses((campusProfiles ?? []).map((c: any) => ({ id: c.id, name: c.university || "Campus" })));
      }

      setLoading(false);
    })();
  }, [profile]);

  const handleRequest = async () => {
    if (!profile || !selectedCampus) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("partnership_requests").insert({
        company_id: profile.id,
        campus_id: selectedCampus,
        message: message || null,
      }).select().single();
      if (error) throw error;
      setPartnerships((prev) => [data as unknown as Partnership, ...prev]);
      setSelectedCampus("");
      setMessage("");
      toast({ title: "Partnership request sent!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await supabase.from("partnership_requests").update({ status }).eq("id", id);
    setPartnerships((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    toast({ title: `Partnership ${status}` });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Handshake className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Partnerships</h1>
            <p className="text-sm text-muted-foreground">{isCompany ? "Request partnerships with campuses" : "Manage partnership requests"}</p>
          </div>
        </div>

        {isCompany && (
          <Card className="p-5 mb-6 space-y-4">
            <h3 className="font-semibold">Request Partnership</h3>
            <Select value={selectedCampus} onValueChange={setSelectedCampus}>
              <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
              <SelectContent>
                {campuses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
            <Button onClick={handleRequest} disabled={submitting || !selectedCampus}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Request
            </Button>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : partnerships.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No partnerships yet</Card>
        ) : (
          <div className="space-y-3">
            {partnerships.map((p) => (
              <Card key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.partner_name || "Partner"}</p>
                  {p.message && <p className="text-sm text-muted-foreground mt-1">{p.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.status === "pending" && isCampus ? (
                    <>
                      <Button size="sm" onClick={() => handleUpdateStatus(p.id, "accepted")}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(p.id, "rejected")}>Reject</Button>
                    </>
                  ) : (
                    <Badge variant={p.status === "accepted" ? "default" : "secondary"} className="capitalize">{p.status}</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
