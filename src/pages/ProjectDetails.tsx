import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  DollarSign,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  Users,
  Send,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import ReviewDialog from "@/components/ReviewDialog";
import ReviewsSection from "@/components/ReviewsSection";
import type { Project, ProjectMilestone, ProjectApplication, Profile, Review } from "@/types/database";

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [applicantProfiles, setApplicantProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myApplication, setMyApplication] = useState<ProjectApplication | null>(null);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string } | null>(null);
  const [acceptedApplicant, setAcceptedApplicant] = useState<Profile | null>(null);

  const isOwner = profile?.id === project?.owner_id;
  const isStudent = profile?.role === "student";

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [projRes, msRes, appRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("project_milestones").select("*").eq("project_id", id).order("order_index"),
        supabase.from("project_applications").select("*").eq("project_id", id),
      ]);

      if (projRes.data) {
        setProject(projRes.data as unknown as Project);
        const ownerRes = await supabase.from("profiles").select("*").eq("id", projRes.data.owner_id).single();
        if (ownerRes.data) setOwner(ownerRes.data as unknown as Profile);
      }
      setMilestones((msRes.data as unknown as ProjectMilestone[]) ?? []);
      const apps = (appRes.data as unknown as ProjectApplication[]) ?? [];
      setApplications(apps);

      // Find my application
      if (profile) {
        const mine = apps.find((a) => a.applicant_id === profile.id);
        if (mine) setMyApplication(mine);
      }

      // Fetch applicant profiles for owner view
      if (apps.length > 0 && projRes.data?.owner_id === profile?.id) {
        const ids = apps.map((a) => a.applicant_id);
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
        if (profiles) {
          const map: Record<string, Profile> = {};
          profiles.forEach((p: any) => (map[p.id] = p as Profile));
          setApplicantProfiles(map);
        }
      }

      setLoading(false);
    })();
  }, [id, profile]);

  const handleApply = async () => {
    if (!profile || !project) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("project_applications")
        .insert({
          project_id: project.id,
          applicant_id: profile.id,
          cover_letter: coverLetter || null,
        })
        .select()
        .single();
      if (error) throw error;
      setMyApplication(data as unknown as ProjectApplication);
      setApplications((prev) => [data as unknown as ProjectApplication, ...prev]);
      setApplyOpen(false);
      setCoverLetter("");
      toast({ title: "Application submitted!", description: "The company will review your application." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to apply", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplicationStatus = async (appId: string, status: string) => {
    const { error } = await supabase.from("project_applications").update({ status }).eq("id", appId);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: status as ProjectApplication["status"] } : a)));
    toast({ title: `Application ${status}` });
  };

  const handleToggleMilestone = async (msId: string, completed: boolean) => {
    const { error } = await supabase.from("project_milestones").update({ completed }).eq("id", msId);
    if (!error) {
      setMilestones((prev) => prev.map((m) => (m.id === msId ? { ...m, completed } : m)));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const completedMs = milestones.filter((m) => m.completed).length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={project.status === "open" ? "default" : "secondary"}>
                  {project.status}
                </Badge>
                {project.category && <Badge variant="outline">{project.category}</Badge>}
                <Badge variant="outline" className="capitalize">{project.pricing_type}</Badge>
              </div>
            </div>
            {isStudent && !myApplication && project.status === "open" && (
              <Button onClick={() => setApplyOpen(true)} className="gap-2 shrink-0">
                <Send className="w-4 h-4" />
                Apply Now
              </Button>
            )}
            {myApplication && (
              <Badge variant="secondary" className="text-sm capitalize shrink-0">
                Applied: {myApplication.status}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card className="p-6">
              <h2 className="font-semibold mb-3">Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {project.description || "No description provided."}
              </p>
            </Card>

            {/* Skills */}
            {(project.required_skills?.length ?? 0) > 0 && (
              <Card className="p-6">
                <h2 className="font-semibold mb-3">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {project.required_skills!.map((skill, i) => (
                    <Badge key={i} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Milestones</h2>
                  <span className="text-sm text-muted-foreground">{completedMs}/{milestones.length} done</span>
                </div>
                <div className="space-y-3">
                  {milestones.map((ms) => (
                    <div
                      key={ms.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        ms.completed ? "bg-primary/5 border-primary/20" : "border-border"
                      }`}
                    >
                      <button
                        onClick={() => isOwner && handleToggleMilestone(ms.id, !ms.completed)}
                        disabled={!isOwner}
                        className="mt-0.5 shrink-0"
                      >
                        {ms.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${ms.completed ? "line-through text-muted-foreground" : ""}`}>
                          {ms.title}
                        </p>
                        {ms.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{ms.description}</p>
                        )}
                      </div>
                      {ms.due_date && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(ms.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Applicants (owner only) */}
            {isOwner && applications.length > 0 && (
              <Card className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Applicants ({applications.length})
                </h2>
                <div className="space-y-3">
                  {applications.map((app) => {
                    const ap = applicantProfiles[app.applicant_id];
                    return (
                      <div key={app.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border">
                        <div className="min-w-0">
                          <p className="font-medium">{ap?.full_name || "Student"}</p>
                          {ap?.skills && ap.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ap.skills.slice(0, 4).map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          )}
                          {app.cover_letter && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{app.cover_letter}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {app.status === "pending" ? (
                            <>
                              <Button size="sm" onClick={() => handleApplicationStatus(app.id, "accepted")}>
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleApplicationStatus(app.id, "rejected")}>
                                Reject
                              </Button>
                            </>
                          ) : (
                            <Badge variant={app.status === "accepted" ? "default" : "secondary"} className="capitalize">
                              {app.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-medium">${project.budget_min}–${project.budget_max}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{project.duration || "Flexible"}</span>
              </div>
              {project.start_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Starts:</span>
                  <span className="font-medium">{new Date(project.start_date).toLocaleDateString()}</span>
                </div>
              )}
              {project.end_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ends:</span>
                  <span className="font-medium">{new Date(project.end_date).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Applicants:</span>
                <span className="font-medium">{applications.length}</span>
              </div>
            </Card>

            {/* Company info */}
            {owner && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-3">Posted by</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
                    {owner.logo_url ? (
                      <img src={owner.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-primary-foreground font-bold text-sm">
                        {owner.company_name?.[0] || owner.full_name?.[0] || "?"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{owner.company_name || owner.full_name}</p>
                    {owner.website && (
                      <a href={owner.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        {owner.website}
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to: {project.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cover Letter (optional)</Label>
              <Textarea
                rows={5}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Tell the company why you're a great fit for this project..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ProjectDetails;
