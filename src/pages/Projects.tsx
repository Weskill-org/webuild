import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Briefcase, DollarSign, Clock, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import useRealtime from "@/hooks/use-realtime";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import type { Project } from "@/types/database";

const Projects = () => {
  const { projects } = useRealtime();
  const { profile } = useAuth();
  const navigate = useNavigate();

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

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

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

        <div className="grid gap-4">
          {myProjects.length > 0 ? (
            myProjects.map((project) => (
              <Card key={project.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold mb-1 truncate">{project.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  </div>
                  <Badge variant={
                    project.status === "open" ? "default" :
                    project.status === "in_progress" ? "secondary" :
                    project.status === "completed" ? "outline" : "destructive"
                  } className="ml-3 shrink-0">
                    {project.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    ${project.budget_min}–${project.budget_max}
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

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${project.id}`)}>
                    View Details
                  </Button>
                  {isCompany && project.owner_id === profile?.id && (
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
          <div className="space-y-4">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Project title" />
            <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" rows={4} />
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
