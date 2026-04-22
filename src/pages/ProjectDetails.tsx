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
  IndianRupee,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  Users,
  Send,
  Star,
  MessageSquare,
  File as FileIcon,
  Award,
  Layers,
  Tag,
  GraduationCap,
  Megaphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import ReviewDialog from "@/components/ReviewDialog";
import { sendNotification } from "@/lib/notifications";
import ReviewsSection from "@/components/ReviewsSection";
import { getCategoryColor } from "@/lib/projectCategories";
import FileDeliverables from "@/components/FileDeliverables";
import IssueCertificateDialog from "@/components/IssueCertificateDialog";
import ReleasePayoutDialog from "@/components/ReleasePayoutDialog";
import type { Project, ProjectMilestone, ProjectApplication, Profile, Review } from "@/types/database";
import { formatProjectBudget } from "@/lib/projectUtils";

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
  const [confirming, setConfirming] = useState(false);
  const [issueCertOpen, setIssueCertOpen] = useState(false);
  const [releasePayoutOpen, setReleasePayoutOpen] = useState(false);

  const isOwner = profile?.id === project?.owner_id;
  const isStudent = profile?.role === "student";

  const fetchProjectData = async () => {
    if (!id) return;
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

    // Check if user already left a review and find accepted applicant
    if (profile && projRes.data) {
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("*")
        .eq("project_id", id)
        .eq("reviewer_id", profile.id)
        .maybeSingle();
      if (existingReview) setMyReview(existingReview as unknown as Review);

      // Find accepted applicant for review targeting
      const accepted = apps.find((a) => a.status === "accepted");
      if (accepted) {
        const { data: accProfile } = await supabase.from("profiles").select("*").eq("id", accepted.applicant_id).single();
        if (accProfile) setAcceptedApplicant(accProfile as unknown as Profile);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProjectData();
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
      
      await sendNotification("new_application", { project_id: project.id });

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

    const app = applications.find(a => a.id === appId);
    if (app) {
      await sendNotification(
        status === "accepted" ? "application_accepted" : "application_rejected",
        { project_id: project!.id, user_id: app.applicant_id }
      );
    }
  };

  const handleToggleMilestone = async (msId: string, completed: boolean) => {
    const { error } = await supabase.from("project_milestones").update({ completed }).eq("id", msId);
    if (!error) {
      setMilestones((prev) => prev.map((m) => (m.id === msId ? { ...m, completed } : m)));
      
      if (completed && acceptedApplicant && project) {
        await sendNotification("milestone_completed", { 
          project_id: project.id, 
          user_id: acceptedApplicant.id 
        });
      }
    }
  };

  const handleIssueCertificate = async () => {
    if (!project || !acceptedApplicant || !owner) return undefined;
    
    // Generate WB-YYYYMMDD-HHMMSS-RAND ID
    const date = new Date();
    const ds = date.toISOString().replace(/[-T:]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const displayId = `WB-${ds.slice(0,8)}-${ds.slice(8)}-${rand}`;

    const { data, error } = await supabase.from("certificates").insert({
      project_id: project.id,
      student_id: acceptedApplicant.id,
      company_name: owner.company_name || owner.full_name,
      project_title: project.title,
      course_name: project.category || "Project",
      display_id: displayId,
      payout_amount: project.budget_max, 
    }).select().single();

    if (error) {
      toast({ variant: "destructive", title: "Failed to issue certificate", description: error.message });
      return undefined;
    }

    await supabase.from("projects").update({ certificate_issued: true } as any).eq("id", project.id);
    
    await sendNotification("certificate_issued", {
      project_id: project.id,
      user_id: acceptedApplicant.id,
    });
    
    setProject({ ...project, certificate_issued: true });
    toast({ title: "Certificate issued!" });
    
    return data.certificate_uid;
  };

  const handleReleasePayout = async (amount: number) => {
    if (!project || !acceptedApplicant || !profile) return;

    // Get student's wallet
    const { data: wallets } = await supabase.from("wallets").select("*").eq("owner_id", acceptedApplicant.id);
    if (!wallets || wallets.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Student wallet not found." });
      return;
    }
    const wallet = wallets[0];

    // Create transaction & update project & wallet balance in a way
    // For simplicity here, we insert transaction and update project. Wallet trigger handles balance.
    const { error: txError } = await supabase.from("transactions").insert({
      wallet_id: wallet.id,
      type: "credit",
      amount: amount,
      description: `Payment for project: ${project.title}`,
    });

    if (txError) {
      toast({ variant: "destructive", title: "Failed to release payout", description: txError.message });
      return;
    }

    await supabase.from("projects").update({ payout_released: true } as any).eq("id", project.id);
    
    await sendNotification("payment_received", {
      project_id: project.id,
      user_id: acceptedApplicant.id,
    });

    setProject({ ...project, payout_released: true });
    toast({ title: "Payout released successfully!" });
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
                <button 
                  onClick={() => document.getElementById("status-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  title="View Status Details"
                >
                  <Badge 
                    variant={project.status === "open" ? "default" : project.status === "submitted" ? "outline" : "secondary"}
                    className={project.status === "submitted" ? "border-orange-500 text-orange-500" : ""}
                  >
                    {project.status === "submitted" ? "Submitted – Awaiting Review" : project.status}
                  </Badge>
                </button>
                {project.project_type && (
                  <button 
                    onClick={() => document.getElementById("category-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    title="View Category Details"
                  >
                    <Badge variant="outline" className={`font-medium ${getCategoryColor(project.project_type)}`}>
                      <Layers className="w-3 h-3 mr-1" />
                      {project.project_type}
                    </Badge>
                  </button>
                )}
                {project.sub_category && (
                  <Badge variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {project.sub_category}
                  </Badge>
                )}
                <button 
                  onClick={() => document.getElementById("milestone-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  title="View Pricing & Milestones"
                >
                  <Badge variant="outline" className="capitalize">{project.pricing_type?.replace(/_/g, ' ')}</Badge>
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {isStudent && !myApplication && project.status === "open" && (
                <Button onClick={() => setApplyOpen(true)} className="gap-2">
                  <Send className="w-4 h-4" />
                  Apply Now
                </Button>
              )}
              {myApplication && (
                <Badge variant="secondary" className="text-sm capitalize self-end">
                  Applied: {myApplication.status}
                </Badge>
              )}
              {profile && !isOwner && (
                <Button variant="outline" onClick={() => navigate(`/messages?partner=${project.owner_id}`)} className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card className="p-6" id="category-section">
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

            {/* Eligibility Criteria */}
            {(project.eligibility_criteria?.length ?? 0) > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="font-semibold">Eligibility Criteria</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.eligibility_criteria!.map((criteria, i) => (
                    <Badge key={i} variant="outline" className="bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                      <GraduationCap className="w-3 h-3 mr-1" />
                      {criteria}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Influencer Marketing Pricing */}
            {project.sub_category === "Influencer Marketing" && project.influencer_pricing_model && (
              <Card className="p-6 border-purple-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Megaphone className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="font-semibold">Influencer Pricing</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1">Pricing Model</p>
                    <p className="font-medium capitalize">{project.influencer_pricing_model === 'per_post' ? 'Per Post' : 'Monthly Retainer'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1">
                      {project.influencer_pricing_model === 'per_post' ? 'Rate per Post' : 'Monthly Rate'}
                    </p>
                    <p className="font-medium text-purple-600">₹{(project.influencer_rate || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Follower Requirement</p>
                    <p className="font-medium text-purple-600">{project.influencer_min_followers || 100}+ Followers</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <Card className="p-6" id="milestone-section">
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => navigate(`/messages?partner=${app.applicant_id}`)}
                            className="text-muted-foreground hover:text-primary"
                            title="Message Applicant"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
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

            {/* File Deliverables */}
            {(isOwner || myApplication?.status === "accepted") && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileIcon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Deliverables & Files</h3>
                </div>
                <FileDeliverables 
                  projectId={project.id} 
                  canUpload={myApplication?.status === "accepted" && !isOwner} 
                  projectStatus={project.status}
                  onStatusChange={fetchProjectData}
                />

                {/* Company: Confirm & Complete submission */}
                {isOwner && project.status === "submitted" && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="p-3 rounded-full bg-orange-500/10">
                        <CheckCircle2 className="w-8 h-8 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">Student Has Submitted Their Work</h4>
                        <p className="text-sm text-muted-foreground mt-1 max-w-md">Review the uploaded deliverables above. If you're satisfied, confirm the submission to mark the project as complete.</p>
                      </div>
                      <Button
                        size="lg"
                        className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20 transition-all duration-300 scale-100 hover:scale-[1.02] active:scale-[0.98] px-8"
                        onClick={async () => {
                          setConfirming(true);
                          try {
                            const { error } = await supabase
                              .from("projects")
                              .update({ status: "completed", completed: true })
                              .eq("id", project.id);
                            if (error) throw error;

                            // Notify the student
                            if (acceptedApplicant) {
                              await sendNotification("project_completed", {
                                project_id: project.id,
                                user_id: acceptedApplicant.id,
                              });
                            }

                            toast({ title: "Project Confirmed!", description: "The project has been marked as complete. Great collaboration!" });
                            fetchProjectData();
                          } catch (err: any) {
                            toast({ variant: "destructive", title: "Error", description: err.message });
                          } finally {
                            setConfirming(false);
                          }
                        }}
                        disabled={confirming}
                      >
                        {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Confirm & Complete Project
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Company: Release Panel */}
                {isOwner && project.status === "completed" && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">Project Completed</h4>
                          <p className="text-sm text-muted-foreground">Release the final deliverables to the student.</p>
                        </div>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Card className="p-4 border-primary/20 bg-primary/5 flex flex-col justify-between">
                          <div>
                            <h5 className="font-semibold flex items-center gap-2 mb-1">
                              <Award className="w-4 h-4 text-primary" /> Certificate
                            </h5>
                            <p className="text-sm text-muted-foreground mb-4">
                              Issue a verified professional certificate of completion.
                            </p>
                          </div>
                          <Button 
                            className="w-full" 
                            disabled={project.certificate_issued}
                            onClick={() => setIssueCertOpen(true)}
                          >
                            {project.certificate_issued ? "Certificate Issued ✓" : "Issue Certificate"}
                          </Button>
                        </Card>
                        
                        <Card className="p-4 border-green-500/20 bg-green-500/5 flex flex-col justify-between">
                          <div>
                            <h5 className="font-semibold flex items-center gap-2 mb-1">
                              <IndianRupee className="w-4 h-4 text-green-600" /> Payout
                            </h5>
                            <p className="text-sm text-muted-foreground mb-4">
                              Release the final payment to the student's wallet.
                            </p>
                          </div>
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700 text-white" 
                            disabled={project.payout_released}
                            onClick={() => setReleasePayoutOpen(true)}
                          >
                            {project.payout_released ? "Payout Released ✓" : "Release Payout"}
                          </Button>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Reviews Section */}
            <ReviewsSection projectId={id} title="Project Reviews" />

            {/* Leave Review Button */}
            {project.status === "completed" && profile && !myReview && (
              (() => {
                const canReview =
                  (isOwner && acceptedApplicant) ||
                  (!isOwner && myApplication?.status === "accepted");
                if (!canReview) return null;
                const target = isOwner
                  ? { id: acceptedApplicant!.id, name: acceptedApplicant!.full_name || "Student" }
                  : { id: project.owner_id, name: owner?.company_name || owner?.full_name || "Company" };
                return (
                  <Card className="p-6 text-center">
                    <Star className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                    <p className="font-semibold mb-1">How was your experience?</p>
                    <p className="text-sm text-muted-foreground mb-4">Leave a review for {target.name}</p>
                    <Button onClick={() => { setReviewTarget(target); setReviewOpen(true); }}>
                      <Star className="w-4 h-4 mr-2" /> Leave Review
                    </Button>
                  </Card>
                );
              })()
            )}
            {myReview && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <p className="text-sm text-muted-foreground">✓ You've already reviewed this project</p>
              </Card>
            )}
          </div>

          {/* Sidebar info */}
          <div className="space-y-4" id="status-section">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Compensation:</span>
                <span className="font-medium">{formatProjectBudget(project)}</span>
              </div>
              {project.sub_category === "Influencer Marketing" && project.influencer_pricing_model && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Megaphone className="w-4 h-4 text-purple-500" />
                    <span className="text-muted-foreground">
                      {project.influencer_pricing_model === 'per_post' ? 'Per Post:' : 'Monthly:'}
                    </span>
                    <span className="font-medium text-purple-600">₹{(project.influencer_rate || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="text-muted-foreground">Min. Followers:</span>
                    <span className="font-medium text-purple-600">{project.influencer_min_followers || 100}+</span>
                  </div>
                </>
              )}
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
              {(project.eligibility_criteria?.length ?? 0) > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <GraduationCap className="w-4 h-4 text-emerald-500" />
                    <span className="text-muted-foreground">Eligibility:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {project.eligibility_criteria!.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
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
                    <Link to={`/profile/${owner.id}`} className="font-medium truncate hover:text-primary transition-colors">
                      {owner.company_name || owner.full_name}
                    </Link>
                    {owner.website && (
                      <a href={owner.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block">
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

      {/* Review Dialog */}
      {reviewTarget && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          projectId={project.id}
          reviewerId={profile!.id}
          revieweeId={reviewTarget.id}
          revieweeName={reviewTarget.name}
          onReviewSubmitted={(review) => setMyReview(review)}
        />
      )}

      {/* Issue Certificate Dialog */}
      {isOwner && acceptedApplicant && owner && (
        <IssueCertificateDialog
          open={issueCertOpen}
          onOpenChange={setIssueCertOpen}
          studentName={acceptedApplicant.full_name || "Student"}
          projectName={project.title}
          companyName={owner.company_name || owner.full_name || "Company"}
          onConfirm={handleIssueCertificate}
        />
      )}

      {/* Release Payout Dialog */}
      {isOwner && (
        <ReleasePayoutDialog
          open={releasePayoutOpen}
          onOpenChange={setReleasePayoutOpen}
          project={project}
          onConfirm={handleReleasePayout}
        />
      )}
    </DashboardLayout>
  );
};

export default ProjectDetails;
