import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, DollarSign, Clock, Briefcase, Filter } from "lucide-react";
import useRealtime from "@/hooks/use-realtime";
import DashboardLayout from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";

const ProjectMarketplace = () => {
  const { projects } = useRealtime();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const openProjects = projects.filter(p => p.status === "open");
  
  const filtered = openProjects
    .filter(p => {
      const matchesSearch = !search || 
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || p.category === category;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "budget-high") return (b.budget_max ?? 0) - (a.budget_max ?? 0);
      if (sortBy === "budget-low") return (a.budget_min ?? 0) - (b.budget_min ?? 0);
      return 0;
    });

  const categories = ["Web Development", "Mobile App", "Design", "Data Science", "Marketing", "Other"];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Project Marketplace</h1>
          <p className="text-muted-foreground">Find and apply to projects that match your skills</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="budget-high">Budget: High</SelectItem>
              <SelectItem value="budget-low">Budget: Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <div className="grid gap-4">
          {filtered.length > 0 ? (
            filtered.map((project) => (
              <Card key={project.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold mb-1 truncate">{project.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  </div>
                  {project.category && (
                    <Badge variant="secondary" className="ml-3 shrink-0">{project.category}</Badge>
                  )}
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
                  <span className="capitalize">{project.pricing_type}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(project.required_skills ?? []).slice(0, 5).map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                  ))}
                  {(project.required_skills?.length ?? 0) > 5 && (
                    <Badge variant="outline" className="text-xs">+{project.required_skills!.length - 5}</Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">Apply Now</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${project.id}`)}>
                    View Details
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No projects found matching your criteria</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectMarketplace;
