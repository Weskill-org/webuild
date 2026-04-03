import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, DollarSign, Clock, Search, ChevronRight, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Project, ProjectApplication } from "@/types/database";

type ApplicationWithProject = ProjectApplication & {
  projects: Project;
};

const StudentProjects = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") || "applied";

  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationWithProject[]>([]);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!profile?.id) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from("project_applications")
        .select(`
          *,
          projects (*)
        `)
        .eq("applicant_id", profile.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setApplications(data as unknown as ApplicationWithProject[]);
      }
      setLoading(false);
    };

    fetchApplications();
  }, [profile?.id]);

  const handleSubmitProject = async (projectId: string) => {
    if (!profile?.id) return;
    setSubmittingId(projectId);
    try {
      // 1. Update project status to completed
      const { error: updateErr } = await supabase
        .from("projects")
        .update({ status: "completed" })
        .eq("id", projectId);

      if (updateErr) throw updateErr;

      // 2. Fetch project owner to notify
      const { data: projectData } = await supabase
        .from("projects")
        .select("owner_id, title")
        .eq("id", projectId)
        .single();

      if (projectData) {
        // 3. Send notification to owner
        await supabase.functions.invoke("send-notification", {
          body: {
            event: "project_completed",
            project_id: projectId,
            user_id: projectData.owner_id,
            data: { project_title: projectData.title }
          },
        });
      }

      toast.success("Project submitted successfully!");
      
      // Update local state to move project to "Completed" tab
      setApplications(prev => prev.map(app => 
        app.project_id === projectId ? { ...app, projects: { ...app.projects, status: "completed" as any } } : app
      ));
    } catch (err: any) {
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleTabChange = (value: string) => {
    navigate(`/student-projects?tab=${value}`);
  };

  // Filter based on application status and joined project status
  const filteredApps = applications.filter((app) => {
    if (!app.projects) return false;
    
    if (currentTab === "applied") {
      return app.status === "pending" || app.status === "rejected";
    }
    if (currentTab === "accepted") {
      return app.status === "accepted" && app.projects.status !== "completed" && app.projects.status !== "submitted";
    }
    if (currentTab === "completed") {
      return app.status === "accepted" && (app.projects.status === "completed" || app.projects.status === "submitted");
    }
    return false;
  });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-muted-foreground">Track your applications, ongoing work, and completed projects.</p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 h-11 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="applied" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Applied</TabsTrigger>
            <TabsTrigger value="accepted" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Accepted</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredApps.length > 0 ? (
          <div className="grid gap-4">
            {filteredApps.map((app) => (
              <Card key={app.id} className="p-6 transition-all duration-300 hover:shadow-md border-border/50 group">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors truncate">
                        {app.projects.title}
                      </h3>
                      {app.status === "pending" && <Badge variant="secondary">Under Review</Badge>}
                      {app.status === "rejected" && <Badge variant="destructive">Not Selected</Badge>}
                      {app.status === "accepted" && app.projects.status === "in_progress" && <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">In Progress</Badge>}
                      {app.projects.status === "completed" && <Badge variant="outline">Completed</Badge>}
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                      {app.projects.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        ${app.projects.budget_min}–${app.projects.budget_max}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {app.projects.duration || "Flexible"}
                      </span>
                      {currentTab === "applied" && (
                        <span>Applied on {new Date(app.created_at || "").toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="shrink-0 pt-2 md:pt-0">
                    <Button 
                      onClick={() => navigate(`/projects/${app.projects.id}`)}
                      className="gap-2"
                    >
                      {currentTab === "applied" ? "View Sent Application" : "View Project Workspace"}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">
              {currentTab === "applied" && "No applications yet"}
              {currentTab === "accepted" && "No accepted projects"}
              {currentTab === "completed" && "No completed projects"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {currentTab === "applied" && "You haven't applied to any projects yet. Start exploring the marketplace to find opportunities."}
              {currentTab === "accepted" && "When a company accepts your application, you'll be able to track and manage your work here."}
              {currentTab === "completed" && "Your finished projects will appear here, building up your professional portfolio."}
            </p>
            {currentTab === "applied" && (
              <Button onClick={() => navigate("/marketplace")} className="gap-2">
                <Search className="w-4 h-4" />
                Browse Projects
              </Button>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentProjects;
