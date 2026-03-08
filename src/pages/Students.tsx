import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, PlusCircle, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import type { Profile } from "@/types/database";

interface Batch {
  id: string;
  name: string;
}

interface BatchStudent {
  id: string;
  batch_id: string;
  student_id: string;
  joined_at: string | null;
}

const Students = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<(BatchStudent & { profile?: Profile })[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [addBatchId, setAddBatchId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: batchData } = await supabase.from("batches").select("id, name").eq("campus_id", profile.id);
      setBatches((batchData as unknown as Batch[]) ?? []);
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile || batches.length === 0) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const batchIds = selectedBatch === "all" ? batches.map((b) => b.id) : [selectedBatch];
      const { data: bsData } = await supabase.from("batch_students").select("*").in("batch_id", batchIds);
      const bsList = (bsData as unknown as BatchStudent[]) ?? [];

      if (bsList.length > 0) {
        const ids = [...new Set(bsList.map((bs) => bs.student_id))];
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
        const profileMap: Record<string, Profile> = {};
        (profiles ?? []).forEach((p: any) => (profileMap[p.id] = p as Profile));
        setStudents(bsList.map((bs) => ({ ...bs, profile: profileMap[bs.student_id] })));
      } else {
        setStudents([]);
      }
      setLoading(false);
    })();
  }, [profile, batches, selectedBatch]);

  const handleAddStudent = async () => {
    if (!addBatchId || !studentEmail.trim()) return;
    setSubmitting(true);
    try {
      // Find student by looking up profiles (email not stored in profiles, so we search by name)
      // In reality, you'd use an admin API or edge function. For now, search profiles.
      const { data: found } = await supabase.from("profiles").select("id").eq("role", "student").limit(50);
      // Simplified: try to find by full_name match
      const { data: matchData } = await supabase.from("profiles").select("id, full_name").ilike("full_name", `%${studentEmail}%`).eq("role", "student").limit(5);
      
      if (!matchData || matchData.length === 0) {
        toast({ variant: "destructive", title: "Student not found", description: "No student found with that name." });
        return;
      }

      const studentId = matchData[0].id;
      const { error } = await supabase.from("batch_students").insert({ batch_id: addBatchId, student_id: studentId });
      if (error) throw error;
      toast({ title: "Student added to batch!" });
      setAddOpen(false);
      setStudentEmail("");
      // Refresh
      setSelectedBatch((prev) => prev);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = students.filter((s) =>
    !search || s.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground">Manage students enrolled in your batches</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2" disabled={batches.length === 0}>
            <PlusCircle className="w-4 h-4" />
            Add Student
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No students found</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((s) => {
              const batchName = batches.find((b) => b.id === s.batch_id)?.name;
              return (
                <Card key={s.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                      <span className="text-primary-foreground font-medium text-sm">
                        {s.profile?.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("") || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{s.profile?.full_name || "Unknown"}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {batchName && <Badge variant="outline" className="text-xs">{batchName}</Badge>}
                        {s.profile?.skills && s.profile.skills.slice(0, 3).map((sk, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{sk}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Joined {s.joined_at ? new Date(s.joined_at).toLocaleDateString() : "—"}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student to Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Batch *</Label>
              <Select value={addBatchId} onValueChange={setAddBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Student Name *</Label>
              <Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="Search by student name..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStudent} disabled={submitting || !addBatchId || !studentEmail.trim()}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Students;
