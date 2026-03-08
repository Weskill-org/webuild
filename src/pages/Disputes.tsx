import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";

interface Dispute {
  id: string;
  project_id: string;
  raised_by: string;
  against: string;
  reason: string;
  description: string | null;
  status: string;
  resolution: string | null;
  created_at: string;
}

export default function Disputes() {
  const { profile } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [againstId, setAgainstId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myProjects, setMyProjects] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from("disputes").select("*").order("created_at", { ascending: false });
      setDisputes((data as unknown as Dispute[]) ?? []);

      // Get projects user is involved in
      const { data: projData } = await supabase
        .from("projects")
        .select("id, title")
        .or(`owner_id.eq.${profile.id}`);
      setMyProjects((projData ?? []) as any[]);

      setLoading(false);
    })();
  }, [profile]);

  const handleSubmit = async () => {
    if (!profile || !projectId || !reason) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("disputes").insert({
        project_id: projectId,
        raised_by: profile.id,
        against: againstId || profile.id,
        reason,
        description: description || null,
      }).select().single();
      if (error) throw error;
      setDisputes((prev) => [data as unknown as Dispute, ...prev]);
      setShowForm(false);
      setReason("");
      setDescription("");
      toast({ title: "Dispute raised", description: "An admin will review your dispute." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === "open") return "destructive";
    if (s === "resolved") return "default";
    return "secondary";
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-destructive" />
            <div>
              <h1 className="text-2xl font-bold">Disputes</h1>
              <p className="text-sm text-muted-foreground">Resolve conflicts with structured mediation</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
            <Flag className="w-4 h-4 mr-2" /> {showForm ? "Cancel" : "Raise Dispute"}
          </Button>
        </div>

        {showForm && (
          <Card className="p-5 mb-6 space-y-4">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {myProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="non-payment">Non-payment</SelectItem>
                <SelectItem value="poor-quality">Poor quality work</SelectItem>
                <SelectItem value="missed-deadline">Missed deadline</SelectItem>
                <SelectItem value="communication">Communication issues</SelectItem>
                <SelectItem value="scope-change">Scope change</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Describe the issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            <Button onClick={handleSubmit} disabled={submitting || !projectId || !reason}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Submit Dispute
            </Button>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : disputes.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No disputes</Card>
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium capitalize">{d.reason.replace("-", " ")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={statusColor(d.status) as any} className="capitalize">{d.status}</Badge>
                </div>
                {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                {d.resolution && (
                  <div className="mt-2 p-2 bg-secondary rounded text-sm">
                    <strong>Resolution:</strong> {d.resolution}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
