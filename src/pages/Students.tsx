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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, PlusCircle, Loader2, Search, Mail, Phone, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { FileSpreadsheet } from "lucide-react";
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
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  // New student form fields
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [addBatchId, setAddBatchId] = useState("");

  // Result feedback
  const [addResult, setAddResult] = useState<{
    status: "invited" | "linked" | "already_enrolled" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: batchData } = await supabase.from("batches").select("id, name").eq("campus_id", profile.id);
      setBatches((batchData as unknown as Batch[]) ?? []);
    })();
  }, [profile]);

  const fetchStudents = async () => {
    if (!profile || batches.length === 0) {
      setLoading(false);
      return;
    }
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
  };

  useEffect(() => {
    fetchStudents();
  }, [profile, batches, selectedBatch]);

  const handleAddStudent = async () => {
    if (!addBatchId || !newStudentEmail.trim() || !newStudentName.trim()) return;
    if (!profile) return;

    setSubmitting(true);
    setAddResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("invite-student", {
        body: {
          mode: "single",
          email: newStudentEmail.trim(),
          full_name: newStudentName.trim(),
          phone: newStudentPhone.trim() || undefined,
          campus_id: profile.id,
          batch_id: addBatchId,
        },
      });

      if (error) throw error;

      const result = data?.results?.[0];
      if (result) {
        setAddResult({ status: result.status, message: result.message });

        if (result.status === "invited") {
          toast({
            title: "Invite Sent! ✉️",
            description: `An invitation email has been sent to ${newStudentEmail.trim()}`,
          });
        } else if (result.status === "linked") {
          toast({
            title: "Student Linked! 🔗",
            description: result.message,
          });
        } else if (result.status === "already_enrolled") {
          toast({
            variant: "destructive",
            title: "Already Enrolled",
            description: result.message,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.message,
          });
        }

        // Refresh students list if succeeded
        if (result.status === "invited" || result.status === "linked") {
          setTimeout(() => {
            fetchStudents();
            setAddOpen(false);
            resetForm();
          }, 1500);
        }
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setAddResult({ status: "error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewStudentEmail("");
    setNewStudentName("");
    setNewStudentPhone("");
    setAddBatchId("");
    setAddResult(null);
  };

  const handleDialogClose = (open: boolean) => {
    setAddOpen(open);
    if (!open) resetForm();
  };

  const filtered = students.filter((s) =>
    !search ||
    s.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.profile?.phone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground">Manage students enrolled in your batches</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setBulkImportOpen(true)}
              className="gap-2"
              disabled={batches.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Bulk Import
            </Button>
            <Button onClick={() => setAddOpen(true)} className="gap-2" disabled={batches.length === 0}>
              <PlusCircle className="w-4 h-4" />
              Add Student
            </Button>
          </div>
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
            <p className="text-sm text-muted-foreground mt-1">Add students by inviting them via email</p>
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
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        {batchName && <Badge variant="outline" className="text-xs">{batchName}</Badge>}
                        {s.profile?.phone && (
                          <span className="flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3" />
                            {s.profile.phone}
                          </span>
                        )}
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

      {/* Add Student Dialog — Invite-Based */}
      <Dialog open={addOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Student
            </DialogTitle>
            <DialogDescription>
              Invite a new student by email. They'll receive a login link to join the platform.
              If a student with this email already exists, they'll be linked to your batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-batch">Batch *</Label>
              <Select value={addBatchId} onValueChange={setAddBatchId}>
                <SelectTrigger id="add-batch">
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
              <Label htmlFor="student-email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="student-email"
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="pl-9"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-name">Full Name *</Label>
              <Input
                id="student-name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="John Doe"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="student-phone"
                  type="tel"
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="pl-9"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Result feedback */}
            {addResult && (
              <div
                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  addResult.status === "invited"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : addResult.status === "linked"
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {addResult.status === "invited" || addResult.status === "linked" ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <p>{addResult.message}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={submitting || !addBatchId || !newStudentEmail.trim() || !newStudentName.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Invite Student
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        batches={batches}
        onSuccess={() => {
          fetchStudents();
        }}
      />
    </DashboardLayout>
  );
};

export default Students;
