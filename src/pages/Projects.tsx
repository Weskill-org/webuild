import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Briefcase, IndianRupee, Clock, Pencil, Trash2, Send, Eye, CheckCircle2, File as FileIcon, Filter, X, Layers, Tag, Search } from "lucide-react";
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
import { PROJECT_TYPES, getSubCategories, getCategoryColor } from "@/lib/projectCategories";
import type { Project, Profile } from "@/types/database";
import { formatProjectBudget } from "@/lib/projectUtils";
import { sanitizeUrl } from "@/lib/utils";

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

  const myProjects = useMemo(() => {
    return isCompany ? projects.filter(p => p.owner_id === profile?.id) : projects;
  }, [projects, isCompany, profile?.id]);

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBudgetMin, setEditBudgetMin] = useState(0);
  const [editBudgetMax, setEditBudgetMax] = useState(0);
  const [editCommissionType, setEditCommissionType] = useState<"percentage" | "fixed">("percentage");
  const [editCommissionMin, setEditCommissionMin] = useState(0);
  const [editCommissionMax, setEditCommissionMax] = useState(0);
  const [editPricingType, setEditPricingType] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editProjectType, setEditProjectType] = useState("");
  const [editSubCategory, setEditSubCategory] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState(initialTab);
  const [search, setSearch] = useState("");

  // Category filters
  const [filterType, setFilterType] = useState("all");
  const [filterSubCategory, setFilterSubCategory] = useState("all");
  const filterSubCategories = filterType !== "all" ? getSubCategories(filterType) : [];
  const hasActiveFilters = filterType !== "all" || filterSubCategory !== "all" || search !== "";

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
  }, [profile?.id, projects.length, myProjects.filter(p => p.status === 'submitted').length]);

  const openEdit = (project: Project) => {
    setEditProject(project);
    setEditTitle(project.title);
    setEditDescription(project.description ?? "");
    setEditBudgetMin(project.budget_min);
    setEditBudgetMax(project.budget_max);
    setEditPricingType(project.pricing_type);
    setEditCommissionType(project.commission_type || "percentage");
    setEditCommissionMin(project.commission_min || 0);
    setEditCommissionMax(project.commission_max || 0);
    setEditDuration(project.duration ?? "");
    setEditProjectType(project.project_type ?? "");
    setEditSubCategory(project.sub_category ?? "");
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
        pricing_type: editPricingType,
        commission_type: ["commission", "fixed_plus_commission"].includes(editPricingType) ? editCommissionType : null,
        commission_min: ["commission", "fixed_plus_commission"].includes(editPricingType) ? editCommissionMin : 0,
        commission_max: ["commission", "fixed_plus_commission"].includes(editPricingType) ? editCommissionMax : 0,
        duration: editDuration || null,
        project_type: editProjectType || null,
        sub_category: editSubCategory || null,
        category: editProjectType || null,
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

  const clearFilters = () => {
    setFilterType("all");
    setFilterSubCategory("all");
    setSearch("");
  };

  // ⚡ Bolt: Wrapped project filtering and sorting in useMemo
  // 🎯 Why: Project filtering and sorting are expensive array operations. Without memoization, they recalculate on every render (even when filters/search haven't changed, e.g., during unrelated UI updates).
  // 📊 Impact: Prevents unnecessary recalculations and keeps typing in the search bar smooth.
  const filteredProjects = useMemo(() => {
    return myProjects
      .filter(p => filter === "all" || p.status === filter)
      .filter(p => {
        if (filterType !== "all" && p.project_type !== filterType) return false;
        if (filterSubCategory !== "all" && p.sub_category !== filterSubCategory) return false;
        if (search) {
          const q = search.toLowerCase();
          const matchesTitle = p.title.toLowerCase().includes(q);
          const matchesDesc = p.description?.toLowerCase().includes(q);
          const matchesSkills = (p.required_skills ?? []).some(s => s.toLowerCase().includes(q));
          if (!matchesTitle && !matchesDesc && !matchesSkills) return false;
        }
        return true;
      });
  }, [myProjects, filter, filterType, filterSubCategory, search]);

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

        <Tabs value={filter} className="w-full mb-4" onValueChange={setFilter}>
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

        {/* Category Filter Bar — LinkedIn-style */}
        <Card className="p-3 mb-6 border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">Filters</span>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm bg-background/50"
              />
            </div>

            {/* Project Type */}
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setFilterSubCategory("all"); }}>
              <SelectTrigger className={`w-auto min-w-[140px] h-9 text-sm ${filterType !== "all" ? getCategoryColor(filterType) + " border font-medium" : "bg-background/50"}`}>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <SelectValue placeholder="All Types" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PROJECT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sub-Category — only visible when type selected */}
            {filterType !== "all" && (
              <Select value={filterSubCategory} onValueChange={setFilterSubCategory}>
                <SelectTrigger className={`w-auto min-w-[160px] h-9 text-sm animate-in fade-in slide-in-from-left-2 duration-200 ${filterSubCategory !== "all" ? "border-primary/30 bg-primary/5 font-medium" : "bg-background/50"}`}>
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <SelectValue placeholder="All Sub-Categories" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Categories</SelectItem>
                  {filterSubCategories.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 animate-in fade-in duration-200"
              >
                <X className="w-3 h-3" />
                Clear
              </Button>
            )}
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Active:</span>
              {filterType !== "all" && (
                <Badge variant="secondary" className={`text-xs gap-1 ${getCategoryColor(filterType)}`}>
                  {filterType}
                  <button onClick={() => { setFilterType("all"); setFilterSubCategory("all"); }} className="ml-0.5 hover:opacity-70">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              )}
              {filterSubCategory !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 border-primary/20 bg-primary/5">
                  {filterSubCategory}
                  <button onClick={() => setFilterSubCategory("all")} className="ml-0.5 hover:opacity-70">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              )}
              {search && (
                <Badge variant="secondary" className="text-xs gap-1">
                  "{search}"
                  <button onClick={() => setSearch("")} className="ml-0.5 hover:opacity-70">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredProjects.length} result{filteredProjects.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </Card>

        <div className="grid gap-6">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
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

                {/* Project Type & Sub-Category Badges */}
                {(project.project_type || project.sub_category) && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {project.project_type && (
                      <Badge variant="outline" className={`text-xs font-medium ${getCategoryColor(project.project_type)}`}>
                        <Layers className="w-3 h-3 mr-1" />
                        {project.project_type}
                      </Badge>
                    )}
                    {project.sub_category && (
                      <Badge variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {project.sub_category}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {formatProjectBudget(project)}
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
                            href={sanitizeUrl(file.file_url)}
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
                {hasActiveFilters
                  ? "No projects match your filters"
                  : isCompany ? "You haven't posted any projects yet" : "No projects available"}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              ) : isCompany ? (
                <Button onClick={() => navigate("/projects/new")}>Post Your First Project</Button>
              ) : null}
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

            {/* Project Type & Sub-Category */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" /> Project Classification
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Project Type</Label>
                  <Select value={editProjectType} onValueChange={(v) => { setEditProjectType(v); setEditSubCategory(""); }}>
                    <SelectTrigger className={editProjectType ? getCategoryColor(editProjectType) + " border font-medium text-sm" : "text-sm"}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sub-Category</Label>
                  <Select value={editSubCategory} onValueChange={setEditSubCategory} disabled={!editProjectType}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={editProjectType ? "Select" : "—"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(editProjectType ? getSubCategories(editProjectType) : []).map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pricing Type</Label>
                <Select value={editPricingType} onValueChange={setEditPricingType}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="commission">Commission Based</SelectItem>
                    <SelectItem value="fixed_plus_commission">Fixed + Commission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="e.g. 2 weeks" />
              </div>
            </div>

            {["commission", "fixed_plus_commission"].includes(editPricingType) && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Commission Details
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Commission Type</Label>
                    <Select 
                      value={editCommissionType} 
                      onValueChange={(v: any) => setEditCommissionType(v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Min {editCommissionType === 'percentage' ? '%' : '₹'}</Label>
                      <Input
                        type="number"
                        value={editCommissionMin}
                        onChange={(e) => setEditCommissionMin(Number(e.target.value))}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max {editCommissionType === 'percentage' ? '%' : '₹'}</Label>
                      <Input
                        type="number"
                        value={editCommissionMax}
                        onChange={(e) => setEditCommissionMax(Number(e.target.value))}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {editPricingType !== "commission" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    {editPricingType === "fixed_plus_commission" ? "Fixed Base Min (₹)" : "Budget Min (₹)"}
                  </Label>
                  <Input type="number" value={editBudgetMin} onChange={(e) => setEditBudgetMin(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {editPricingType === "fixed_plus_commission" ? "Fixed Base Max (₹)" : "Budget Max (₹)"}
                  </Label>
                  <Input type="number" value={editBudgetMax} onChange={(e) => setEditBudgetMax(Number(e.target.value))} />
                </div>
              </div>
            )}
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
