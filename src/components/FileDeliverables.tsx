import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, File, Trash2, Loader2, Download, Send, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Deliverable {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploader_id: string;
  created_at: string;
}

interface Props {
  projectId: string;
  milestoneId?: string;
  canUpload?: boolean;
  projectStatus?: string;
  onStatusChange?: () => void;
}

export default function FileDeliverables({ projectId, milestoneId, canUpload = true, projectStatus, onStatusChange }: Props) {
  const { profile } = useAuth();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch deliverables
  useEffect(() => {
    const fetchDeliverables = async () => {
      setLoading(true);
      let query = supabase.from("deliverables").select("*").eq("project_id", projectId);
      if (milestoneId) query = query.eq("milestone_id", milestoneId);
      const { data } = await query.order("created_at", { ascending: false });
      setDeliverables((data as unknown as Deliverable[]) ?? []);
      setLoading(false);
    };

    if (projectId) {
      fetchDeliverables();
    }
  }, [projectId, milestoneId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 20MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const filePath = `${profile.id}/${projectId}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("deliverables").upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("deliverables").getPublicUrl(filePath);

      const { data: row, error: insertErr } = await supabase.from("deliverables").insert({
        project_id: projectId,
        milestone_id: milestoneId || null,
        uploader_id: profile.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        description: description || null,
      }).select().single();

      if (insertErr) throw insertErr;
      setDeliverables((prev) => [row as unknown as Deliverable, ...prev]);
      setDescription("");
      toast({ title: "File uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (d: Deliverable) => {
    await supabase.from("deliverables").delete().eq("id", d.id);
    setDeliverables((prev) => prev.filter((x) => x.id !== d.id));
    toast({ title: "File deleted" });
  };

  const handleSubmitProject = async () => {
    if (!profile || !projectId) return;
    setSubmitting(true);
    try {
      // 1. Update project status to submitted (awaiting company review)
      const { error: updateErr } = await supabase
        .from("projects")
        .update({ status: "submitted" })
        .eq("id", projectId);

      if (updateErr) throw updateErr;

      // 2. Fetch project owner to notify
      const { data: projectData } = await supabase
        .from("projects")
        .select("owner_id, title")
        .eq("id", projectId)
        .single();

      if (projectData) {
        // 3. Send notification to owner
        await supabase.functions.invoke("send-notification", {
          body: {
            event: "project_completed",
            project_id: projectId,
            user_id: projectData.owner_id,
            data: { project_title: projectData.title }
          },
        });
      }

      setIsSubmitted(true);
      toast({ 
        title: "Project Submitted!", 
        description: "The company has been notified. Great work!",
      });
      
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Submission failed", 
        description: err.message 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <File className="w-4 h-4" /> Deliverables & Files
      </h3>

      {canUpload && (
        <Card className="p-4 space-y-3">
          <Textarea
            placeholder="File description (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              accept="*/*"
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload File
            </Button>
            <p className="text-xs text-muted-foreground">Max 20MB</p>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : deliverables.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No files uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {deliverables.map((d) => (
            <Card key={d.id} className="p-3 flex items-center gap-3">
              <File className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(d.file_size)} · {d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}
                </p>
                {d.description && <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" asChild>
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
                {d.uploader_id === profile?.id && (
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(d)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {canUpload && projectStatus !== "completed" && projectStatus !== "submitted" && deliverables.length > 0 && (
        <div className="pt-8 mt-4 border-t border-border/50 flex justify-center w-full">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="w-full max-w-sm relative overflow-hidden group bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-500 scale-100 hover:scale-[1.02] active:scale-[0.98] h-12"
                disabled={submitting || isSubmitted}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin text-white" />
                ) : isSubmitted ? (
                  <CheckCircle2 className="w-5 h-5 mr-2 animate-in zoom-in text-white" />
                ) : (
                  <Send className="w-4 h-4 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500 text-white" />
                )}
                <span className="font-semibold tracking-wide">
                  {isSubmitted ? "Submitted Successfully" : "Submit Project"}
                </span>
                
                {/* Professional gloss finish */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10 skew-x-[-20deg] transition-transform duration-1000 group-hover:translate-x-full -translate-x-full" />
                
                {/* Pulsing ring animation when not submitted */}
                {!isSubmitted && !submitting && (
                  <div className="absolute inset-0 border border-white/20 rounded-lg animate-pulse" />
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Final Submission
                </DialogTitle>
                <DialogDescription className="text-muted-foreground pt-2">
                  Ready to hand over your work? This will formally notify the company that your project is complete and ready for review.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3">
                <div className="text-sm p-4 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm">
                  <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <File className="w-3 h-3" />
                    Files to be Handed Over:
                  </p>
                  <ul className="space-y-1.5">
                    {deliverables.map(d => (
                      <li key={d.id} className="text-sm truncate flex items-center gap-2 text-foreground/80">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                        {d.file_name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <DialogFooter className="sm:justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" className="text-muted-foreground hover:bg-muted font-medium">
                  Go Back
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSubmitProject} 
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/20 ring-1 ring-white/10"
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Confirm & Hand Over"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
