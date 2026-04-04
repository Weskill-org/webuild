import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Briefcase, IndianRupee, Clock, Pencil, Trash2, Send, Eye, CheckCircle2, File as FileIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useRealtime from "@/hooks/use-realtime";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import type { Project, Profile } from "@/types/database";

interface Deliverable {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  description: string | null;
  created_at: string;
}

const Projects = () => {
  const { projects } = useRealtime();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab") || "all";

  const isCompany = profile?.role === "company";
  const myProjects = isCompany ? projects.filter(p => p.owner_id === profile?.id) : projects;

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBudgetMin, setEditBudgetMin] = useState(0);
  const [editBudgetMax, setEditBudgetMax] = useState(0);
  const [editDuration, setEditDuration] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState(initialTab);
  const [search, setSearch] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deliverables, setDeliverables] = useState<Record<string, Deliverable[]>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Fetch deliverables for my projects
  useEffect(() => {
    const fetchDeliverables = async () => {
      if (myProjects.length === 0) return;
      const { data, error } = await supabase
        .from('deliverables')
        .select('*')
        .in('project_id', myProjects.map(p => p.id));
      
      if (data) {
        const grouped = data.reduce((acc: Record<string, Deliverable[]>, d: Deliverable) => {
          if (!acc[d.project_id]) acc[d.project_id] = [];
          acc[d.project_id].push(d);
          return acc;
        }, {});
        setDeliverables(grouped);
      }
    };
    if (profile?.id) {
      fetchDeliverables();
    }
  }, [profile?.id, projects.length, myProjects.filter(p => p.status === 'submitted').length]); // Refresh when submitted count changes

  const openEdit = (project: Project) => {
    setEditProject(project);
    setEditTitle(project.title);
    setEditDescription(project.description ?? "");
    setEditBudgetMin(project.budget_min);
    setEditBudgetMax(project.budget_max);
    setEditDuration(project.duration ?? "");
    setEditCategory(project.category ?? "");
    setEditSkills((project.required_skills ?? []).join(", "));
    setEditStatus(project.status);
  };

  const handleSave = async () => {
    if (!editProject) return;
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({
        title: editTitle,
        description: editDescription,
        budget_min: editBudgetMin,
        budget_max: editBudgetMax,
        duration: editDuration || null,
        category: editCategory || null,
        required_skills: editSkills.split(",").map(s => s.trim()).filter(Boolean),
        status: editStatus,
      })
      .eq("id", editProject.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Project updated" });
      setEditProject(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Project deleted" });
      setDeleteTarget(null);
    }
  };

  const handleConfirmProject = async (projectId: string) => {
    setConfirmingId(projectId);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: "completed" })
        .eq("id", projectId);
      
      if (error) throw error;

      toast({ title: "Project Confirmed!", description: "The project has been marked as complete." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{isCompany ? "My Projects" : "Projects"}</h1>
            <p className="text-muted-foreground">{isCompany ? "Manage your posted projects" : "Browse and manage projects"}</p>
          </div>
          {isCompany && (
            <Button onClick={() => navigate("/projects/new")} className="gap-2">
              <PlusCircle className="w-4 h-4" />
              New Project
            </Button>
          )}
        </div>

        <Tabs value={filter} className="w-full mb-8" onValueChange={setFilter}>
          <TabsList className="grid w-full max-w-xl grid-cols-5 h-11 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">All</TabsTrigger>
            <TabsTrigger value="open" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Open</TabsTrigger>
            <TabsTrigger value="in_progress" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm truncate">In Progress</TabsTrigger>
            <TabsTrigger value="submitted" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              Submitted
              {myProjects.filter(p => p.status === "submitted").length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-6">
          {myProjects
            .filter(p => filter === "all" || p.status === filter)
            .length > 0 ? (
            myProjects
              .filter(p => filter === "all" || p.status === filter)
              .map((project) => (
              <Card key={project.id} className="p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors truncate">{project.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{project.description}</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="ml-4 shrink-0 transition-transform active:scale-95"
                  >
                    <Badge variant={
                      project.status === "open" ? "default" :
                      project.status === "in_progress" ? "secondary" :
                      project.status === "submitted" ? "outline" :
                      project.status === "completed" ? "outline" : "destructive"
                    } className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                      project.status === "submitted" ? "border-orange-500 text-orange-500" : ""
                    }`}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" />
                    ₹{project.budget_min}–₹{project.budget_max}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {project.duration || "Flexible"}
                  </span>
                  <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(project.required_skills ?? []).slice(0, 5).map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                  ))}
                </div>

                {/* Received Deliverables Section (Only for Submitted status) */}
                {isCompany && project.status === "submitted" && deliverables[project.id]?.length > 0 && (
                  <div className="mb-6 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    <h4 className="text-sm font-bold text-orange-600 mb-3 flex items-center gap-2">
                      <FileIcon className="w-4 h-4" />
                      Deliverables & Files
                    </h4>
                    <div className="grid gap-2 mb-4">
                      {deliverables[project.id].map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/50 text-sm">
                          <div className="flex items-center gap-2 truncate pr-4">
                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="truncate">{file.file_name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase whitespace-nowrap">
                              ({file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : "FILE"})
                            </span>
                          </div>
                          <a 
                            href={file.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-xs font-medium whitespace-nowrap"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-3 border-t border-orange-500/10">
                      <p className="text-xs text-orange-600/70">Review the files. If satisfied, confirm the project as complete.</p>
                      <Button 
                        size="sm"
                        className="gap-1.5 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20"
                        onClick={() => handleConfirmProject(project.id)}
                        disabled={confirmingId === project.id}
                      >
                        {confirmingId === project.id ? (
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Confirm & Complete
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">

                  {isCompany && project.status === "submitted" && (
                    <Button 
                      size="sm" 
                      className="gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 transition-all duration-300"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review Submission
                    </Button>
                  )}
                  {isCompany && project.owner_id === profile?.id && project.status !== "submitted" && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => openEdit(project)} className="gap-1">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(project)} className="gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                      {project.status === "open" && (
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${project.id}`)}>View Applicants</Button>
                      )}
                    </>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">
                {isCompany ? "You haven't posted any projects yet" : "No projects available"}
              </p>
              {isCompany && (
                <Button onClick={() => navigate("/projects/new")}>Post Your First Project</Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProject} onOpenChange={(o) => !o && setEditProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update your project details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Project title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Budget Min (₹)</Label>
                <Input type="number" value={editBudgetMin} onChange={(e) => setEditBudgetMin(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Budget Max (₹)</Label>
                <Input type="number" value={editBudgetMax} onChange={(e) => setEditBudgetMax(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="e.g. 2 weeks" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="e.g. Web Development" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Required Skills (comma-separated)</Label>
              <Input value={editSkills} onChange={(e) => setEditSkills(e.target.value)} placeholder="React, TypeScript, Node.js" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProject(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !editTitle.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The project and all related data will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Projects;
