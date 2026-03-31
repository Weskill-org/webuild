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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Flag, User, Briefcase, Calendar, Info } from "lucide-react";
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
  project?: { title: string };
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
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [myProjects, setMyProjects] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data: disputesData } = await supabase
        .from("disputes")
        .select("*, project:projects(title)")
        .order("created_at", { ascending: false });

      if (disputesData) {
        setDisputes(disputesData as any);
      }

      // Get projects user is involved in
      const { data: projData } = await supabase
        .from("projects")
        .select("id, title")
        .eq("owner_id", profile.id);
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
      
      // Re-fetch disputes to get the newly added one with enriched data
      const { data: disputesData } = await supabase
        .from("disputes")
        .select("*, project:projects(title)")
        .order("created_at", { ascending: false });

      if (disputesData) {
        setDisputes(disputesData as any);
      }
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
                  <Badge 
                    variant={statusColor(d.status) as any} 
                    className="capitalize cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedDispute(d)}
                  >
                    {d.status}
                  </Badge>
                </div>
                {d.description && <p className="text-sm text-muted-foreground line-clamp-1">{d.description}</p>}
                {d.resolution && (
                  <div className="mt-2 p-2 bg-secondary/50 rounded text-sm italic">
                    Resolved
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Dispute Details
              </DialogTitle>
              <DialogDescription>
                Detailed information about the raised conflict.
              </DialogDescription>
            </DialogHeader>

            {selectedDispute && (
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Info className="w-3 h-3" /> Reason
                    </p>
                    <p className="font-medium capitalize">{selectedDispute.reason.replace("-", " ")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Info className="w-3 h-3" /> Status
                    </p>
                    <Badge variant={statusColor(selectedDispute.status) as any} className="capitalize">
                      {selectedDispute.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Project
                  </p>
                  <p className="font-medium">{selectedDispute.project?.title || "Unknown Project"}</p>
                </div>



                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Info className="w-3 h-3" /> Description
                  </p>
                  <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {selectedDispute.description || "No description provided."}
                  </div>
                </div>

                {selectedDispute.resolution && (
                  <div className="space-y-2 p-4 bg-primary/5 rounded-md border border-primary/20">
                    <p className="text-xs font-bold text-primary uppercase">Resolution</p>
                    <p className="text-sm">{selectedDispute.resolution}</p>
                  </div>
                )}

                <div className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Raised on {new Date(selectedDispute.created_at).toLocaleDateString()}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDispute(null)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
