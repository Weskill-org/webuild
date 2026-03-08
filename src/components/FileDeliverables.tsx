import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, File, Trash2, Loader2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
}

export default function FileDeliverables({ projectId, milestoneId, canUpload = true }: Props) {
  const { profile } = useAuth();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch deliverables
  useState(() => {
    (async () => {
      let query = supabase.from("deliverables").select("*").eq("project_id", projectId);
      if (milestoneId) query = query.eq("milestone_id", milestoneId);
      const { data } = await query.order("created_at", { ascending: false });
      setDeliverables((data as unknown as Deliverable[]) ?? []);
      setLoading(false);
    })();
  });

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
    </div>
  );
}
