import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { BookOpen, PlusCircle, Loader2, Users, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

interface Batch {
  id: string;
  campus_id: string;
  name: string;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
}

const Batches = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const deptParam = searchParams.get("dept");
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", department: "", start_date: "", end_date: "" });
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [viewStudentsOpen, setViewStudentsOpen] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);


  const fetchBatches = async () => {
    if (!profile) return;
    setLoading(true);
    let query = supabase.from("batches").select("*").eq("campus_id", profile.id);
    
    if (deptParam) {
      query = query.eq("department", deptParam);
    }

    const { data } = await query.order("created_at", { ascending: false });
    const batchList = (data as unknown as Batch[]) ?? [];
    setBatches(batchList);

    // Get student counts
    if (batchList.length > 0) {
      const counts: Record<string, number> = {};
      for (const b of batchList) {
        const { count } = await supabase.from("batch_students").select("*", { count: "exact", head: true }).eq("batch_id", b.id);
        counts[b.id] = count ?? 0;
      }
      setStudentCounts(counts);
    }
    setLoading(false);
  };

  const fetchBatchStudents = async (batch: Batch) => {
    setSelectedBatch(batch);
    setViewStudentsOpen(true);
    setFetchingStudents(true);
    try {
      const { data, error } = await supabase
        .from("batch_students")
        .select(`
          student_id,
          profiles:student_id (
            id,
            full_name,
            email,
            university
          )
        `)
        .eq("batch_id", batch.id);

      if (error) throw error;
      setBatchStudents(data?.map(item => item.profiles) || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error fetching students", description: err.message });
    } finally {
      setFetchingStudents(false);
    }
  };


  useEffect(() => {
    fetchBatches();
  }, [profile, deptParam]);

  const handleCreate = async () => {
    if (!profile || !form.name.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("batches").insert({
        campus_id: profile.id,
        name: form.name,
        department: form.department || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      if (error) throw error;
      toast({ title: "Batch created!" });
      setCreateOpen(false);
      setForm({ name: "", department: "", start_date: "", end_date: "" });
      fetchBatches();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("batches").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    setBatches((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "Batch deleted" });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Batches</h1>
            <p className="text-muted-foreground">Manage your campus batches and student groups</p>
          </div>
          <div className="flex items-center gap-3">
            {deptParam && (
              <Button variant="ghost" size="sm" onClick={() => setSearchParams({})} className="text-muted-foreground h-8 px-2">
                Clear: {deptParam} ×
              </Button>
            )}
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <PlusCircle className="w-4 h-4" />
              New Batch
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : batches.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-3">No batches created yet</p>
            <Button onClick={() => setCreateOpen(true)}>Create Your First Batch</Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {batches.map((batch) => (
              <Card key={batch.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 
                      className="text-lg font-semibold cursor-pointer hover:text-primary hover:underline transition-all"
                      onClick={() => fetchBatchStudents(batch)}
                    >
                      {batch.name}
                    </h3>

                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {batch.department && <span>{batch.department}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {studentCounts[batch.id] ?? 0} students
                      </span>
                    </div>
                    {(batch.start_date || batch.end_date) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {batch.start_date && new Date(batch.start_date).toLocaleDateString()}
                        {batch.start_date && batch.end_date && " → "}
                        {batch.end_date && new Date(batch.end_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(batch.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Batch Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., CS Batch 2026" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g., Computer Science" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.name.trim()}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewStudentsOpen} onOpenChange={setViewStudentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedBatch?.name} - Assigned Students</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {fetchingStudents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : batchStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No students assigned to this batch yet.</p>
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">University</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {batchStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{student.full_name || "N/A"}</td>
                        <td className="p-3 text-muted-foreground">{student.email || "N/A"}</td>
                        <td className="p-3 text-muted-foreground">{student.university || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewStudentsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>

  );
};

export default Batches;
