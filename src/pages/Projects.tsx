import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Briefcase, DollarSign, Clock } from "lucide-react";
import useRealtime from "@/hooks/use-realtime";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import DashboardLayout from "@/components/DashboardLayout";

const Projects = () => {
  const { projects } = useRealtime();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isCompany = profile?.role === "company";
  const myProjects = isCompany ? projects.filter(p => p.owner_id === profile?.id) : projects;

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
                  {isCompany && project.status === "open" && (
                    <Button size="sm" variant="secondary">View Applicants</Button>
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
    </DashboardLayout>
  );
};

export default Projects;
