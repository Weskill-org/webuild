import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle, XCircle, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export default function BulkStudentImport() {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from("batches").select("id, name").eq("campus_id", profile.id).then(({ data }) => {
      setBatches((data ?? []) as any[]);
    });
  }, [profile]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBatch || !profile) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

      // Skip header if present
      const startIndex = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      const emails = lines.slice(startIndex);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const line of emails) {
        const parts = line.split(",").map((s) => s.trim().replace(/"/g, ""));
        const email = parts[0];
        const fullName = parts[1] || "";

        if (!email || !email.includes("@")) {
          errors.push(`Invalid email: ${email}`);
          failed++;
          continue;
        }

        // Check if user exists in profiles by looking up the auth
        const { data: existingProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("full_name", fullName)
          .limit(1);

        if (existingProfiles && existingProfiles.length > 0) {
          // Add to batch
          const { error } = await supabase.from("batch_students").insert({
            batch_id: selectedBatch,
            student_id: existingProfiles[0].id,
          });
          if (error) {
            if (error.code === "23505") {
              errors.push(`${email} already in batch`);
            } else {
              errors.push(`${email}: ${error.message}`);
            }
            failed++;
          } else {
            success++;
          }
        } else {
          errors.push(`${email}: User not found on platform`);
          failed++;
        }
      }

      setResult({ total: emails.length, success, failed, errors });
      toast({ title: "Import complete", description: `${success} added, ${failed} failed` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Bulk Student Import</h1>
            <p className="text-sm text-muted-foreground">Upload a CSV to add students to a batch</p>
          </div>
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Batch</label>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger><SelectValue placeholder="Choose a batch" /></SelectTrigger>
              <SelectContent>
                {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">Upload a CSV file with columns: email, name</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button onClick={() => fileRef.current?.click()} disabled={importing || !selectedBatch}>
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {importing ? "Importing..." : "Choose CSV File"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">CSV Format:</p>
            <pre className="bg-secondary p-2 rounded text-xs">email,name{"\n"}student@example.com,John Doe{"\n"}another@example.com,Jane Smith</pre>
          </div>
        </Card>

        {result && (
          <Card className="p-5 mt-4">
            <h3 className="font-semibold mb-3">Import Results</h3>
            <div className="flex gap-4 mb-3">
              <Badge variant="secondary">Total: {result.total}</Badge>
              <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" /> {result.success}</Badge>
              {result.failed > 0 && <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> {result.failed}</Badge>}
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto text-xs text-muted-foreground space-y-1">
                {result.errors.map((e, i) => <p key={i}>• {e}</p>)}
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
