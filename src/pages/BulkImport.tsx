import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle, XCircle, FileSpreadsheet, Link2, UserPlus, AlertTriangle, Download } from "lucide-react";
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

interface StudentResult {
  email: string;
  status: "invited" | "linked" | "already_enrolled" | "error";
  message: string;
}

interface ImportResult {
  total: number;
  invited: number;
  linked: number;
  already_enrolled: number;
  errors: number;
  results: StudentResult[];
}

export default function BulkStudentImport() {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (!profile) return;
    supabase.from("batches").select("id, name").eq("campus_id", profile.id).then(({ data }) => {
      setBatches((data ?? []) as any[]);
    });
  }, [profile]);

  const downloadTemplate = () => {
    const csvContent = "email,name,phone\nstudent1@example.com,John Doe,+919876543210\nstudent2@example.com,Jane Smith,+919876543211\n";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBatch || !profile) return;

    setImporting(true);
    setResult(null);
    setProgress("Reading file...");

    try {
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

      // Skip header if present
      const startIndex = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      const dataLines = lines.slice(startIndex);

      if (dataLines.length === 0) {
        toast({ title: "Empty file", description: "No student data found in CSV", variant: "destructive" });
        setImporting(false);
        return;
      }

      if (dataLines.length > 200) {
        toast({
          title: "Too many rows",
          description: "Maximum 200 students per import. Please split your file.",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      // Parse CSV rows
      const students: { email: string; full_name: string; phone?: string }[] = [];
      const parseErrors: string[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        const parts = dataLines[i].split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
        const email = parts[0] || "";
        const fullName = parts[1] || "";
        const phone = parts[2] || "";

        if (!email || !email.includes("@")) {
          parseErrors.push(`Row ${i + startIndex + 1}: Invalid email "${email}"`);
          continue;
        }

        if (!fullName) {
          parseErrors.push(`Row ${i + startIndex + 1}: Name is required for ${email}`);
          continue;
        }

        students.push({
          email,
          full_name: fullName,
          ...(phone ? { phone } : {}),
        });
      }

      if (students.length === 0) {
        toast({
          title: "No valid rows",
          description: `Found ${parseErrors.length} errors. Check your CSV format.`,
          variant: "destructive",
        });
        setResult({
          total: dataLines.length,
          invited: 0,
          linked: 0,
          already_enrolled: 0,
          errors: parseErrors.length,
          results: parseErrors.map((err) => ({ email: "", status: "error" as const, message: err })),
        });
        setImporting(false);
        return;
      }

      setProgress(`Processing ${students.length} students...`);

      // Call the edge function in bulk mode
      const { data, error } = await supabase.functions.invoke("invite-student", {
        body: {
          mode: "bulk",
          students,
          campus_id: profile.id,
          batch_id: selectedBatch,
        },
      });

      if (error) throw error;

      const summary = data?.summary;
      const results: StudentResult[] = data?.results ?? [];

      // Add parse errors to results
      const allResults = [
        ...results,
        ...parseErrors.map((err) => ({ email: "", status: "error" as const, message: err })),
      ];

      const importResult: ImportResult = {
        total: dataLines.length,
        invited: summary?.invited ?? 0,
        linked: summary?.linked ?? 0,
        already_enrolled: summary?.already_enrolled ?? 0,
        errors: (summary?.errors ?? 0) + parseErrors.length,
        results: allResults,
      };

      setResult(importResult);
      toast({
        title: "Import Complete",
        description: `${importResult.invited} invited, ${importResult.linked} linked, ${importResult.errors} errors`,
      });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      setProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "invited":
        return <UserPlus className="w-3.5 h-3.5 text-green-500" />;
      case "linked":
        return <Link2 className="w-3.5 h-3.5 text-blue-500" />;
      case "already_enrolled":
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
      default:
        return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "invited":
        return "Invited";
      case "linked":
        return "Linked";
      case "already_enrolled":
        return "Already Enrolled";
      default:
        return "Error";
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Bulk Student Import</h1>
            <p className="text-sm text-muted-foreground">
              Upload a CSV to invite and add students to a batch
            </p>
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
            <p className="text-sm text-muted-foreground mb-1">
              Upload a CSV file with columns: <strong>email, name, phone</strong>
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              New students will receive an email invite to join the platform.
              Existing students will be linked to your batch.
            </p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <div className="flex gap-2 justify-center">
              <Button onClick={() => fileRef.current?.click()} disabled={importing || !selectedBatch}>
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {importing ? progress || "Importing..." : "Choose CSV File"}
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Template
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">CSV Format:</p>
            <pre className="bg-secondary p-2 rounded text-xs">email,name,phone{"\n"}student@example.com,John Doe,+919876543210{"\n"}another@example.com,Jane Smith,+919876543211</pre>
            <p className="mt-2 text-xs">
              <strong>Note:</strong> Phone number is optional. Maximum 200 students per import.
            </p>
          </div>
        </Card>

        {result && (
          <Card className="p-5 mt-4">
            <h3 className="font-semibold mb-3">Import Results</h3>

            {/* Summary badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary">Total: {result.total}</Badge>
              {result.invited > 0 && (
                <Badge className="gap-1 bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25">
                  <UserPlus className="w-3 h-3" /> {result.invited} Invited
                </Badge>
              )}
              {result.linked > 0 && (
                <Badge className="gap-1 bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25">
                  <Link2 className="w-3 h-3" /> {result.linked} Linked
                </Badge>
              )}
              {result.already_enrolled > 0 && (
                <Badge className="gap-1 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/25">
                  <AlertTriangle className="w-3 h-3" /> {result.already_enrolled} Already Enrolled
                </Badge>
              )}
              {result.errors > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="w-3 h-3" /> {result.errors} Errors
                </Badge>
              )}
            </div>

            {/* Detailed results */}
            {result.results.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {result.results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs p-2 rounded ${
                      r.status === "invited"
                        ? "bg-green-500/5"
                        : r.status === "linked"
                        ? "bg-blue-500/5"
                        : r.status === "already_enrolled"
                        ? "bg-yellow-500/5"
                        : "bg-destructive/5"
                    }`}
                  >
                    {getStatusIcon(r.status)}
                    <span className="font-medium min-w-[60px]">{getStatusLabel(r.status)}</span>
                    <span className="text-muted-foreground truncate">
                      {r.email ? `${r.email} — ` : ""}
                      {r.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
