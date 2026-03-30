import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  TrendingUp,
  Clock,
  DollarSign,
  Award,
  MessageSquare,
  Briefcase,
  PlusCircle,
} from "lucide-react";
import useRealtime from "@/hooks/use-realtime";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import DashboardLayout from "@/components/DashboardLayout";
import EarningsChart from "@/components/EarningsChart";
import TopCompanies from "@/components/TopCompanies";

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    projects,
    activeProjectsCount,
    completedCount,
    walletBalance,
    unreadMessages,
    certificates,
    transactions,
  } = useRealtime();

  const displayName = profile?.full_name || profile?.company_name || profile?.university || "there";

  return (
    <DashboardLayout>
      {/* Welcome */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-1">Welcome back, {displayName}! 👋</h1>
        <p className="text-muted-foreground">
          {profile?.role === "company"
            ? "Manage your projects and find talented students"
            : profile?.role === "campus"
            ? "Track your students and campus projects"
            : "Here's what's happening with your projects today"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Projects", value: activeProjectsCount, icon: TrendingUp, color: "text-primary", path: "/projects" },
          { label: "Completed", value: completedCount, icon: Award, color: "text-primary", path: "/projects" },
          { label: "Wallet Balance", value: `$${walletBalance}`, icon: DollarSign, color: "text-primary", path: "/wallet" },
          { label: "Unread Messages", value: unreadMessages, icon: MessageSquare, color: "text-primary", path: "/messages" },
        ].map((stat, i) => (
          <Card 
            key={i} 
            className={`p-5 transition-all duration-200 ${stat.path ? "cursor-pointer hover:shadow-md hover:border-primary/30" : ""}`}
            onClick={() => stat.path && navigate(stat.path)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Role-specific quick actions */}
      {profile?.role === "company" && (
        <div className="mb-8">
          <Button onClick={() => navigate("/projects/new")} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Post New Project
          </Button>
        </div>
      )}

      {/* Widgets row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <EarningsChart transactions={transactions} />
        {profile?.role === "student" && <TopCompanies />}
        {profile?.role === "campus" && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Campus Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/batches")}>
                Manage Batches
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/students")}>
                Manage Students
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline">Filters</Button>
        </div>
      </div>

      {/* Projects list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {profile?.role === "company" ? "Your Projects" : "Recommended Projects"}
          </h2>
          <Button variant="link" onClick={() => navigate(profile?.role === "student" ? "/marketplace" : "/projects")}>
            View All
          </Button>
        </div>

        <div className="grid gap-4">
          {projects.length > 0 ? (
            projects
              .filter(p => !searchQuery || p.title?.toLowerCase().includes(searchQuery.toLowerCase()))
              .slice(0, 5)
              .map((project) => (
                <Card key={project.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{project.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    </div>
                    <Badge variant={project.status === "open" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      ${project.budget_min}–${project.budget_max}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {project.duration || "Flexible"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(project.required_skills ?? []).map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))
          ) : (
            <Card className="p-8 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No projects yet</p>
              {profile?.role === "company" && (
                <Button onClick={() => navigate("/projects/new")}>Post Your First Project</Button>
              )}
              {profile?.role === "student" && (
                <p className="text-sm text-muted-foreground">Check back soon for new opportunities!</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
