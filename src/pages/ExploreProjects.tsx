import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase, IndianRupee, Clock, Search, Layers, Tag, X, Filter,
  ArrowRight, Sparkles, TrendingUp, Users, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { PROJECT_TYPES, getSubCategories, getCategoryColor } from "@/lib/projectCategories";
import type { Project } from "@/types/database";
import { formatProjectBudget } from "@/lib/projectUtils";

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  open: { label: "Open", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  in_progress: { label: "In Progress", class: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  submitted: { label: "Submitted", class: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  completed: { label: "Completed", class: "bg-violet-500/10 text-violet-600 border-violet-500/30" },
  draft: { label: "Draft", class: "bg-gray-500/10 text-gray-500 border-gray-500/30" },
  cancelled: { label: "Cancelled", class: "bg-red-500/10 text-red-500 border-red-500/30" },
};

const ExploreProjects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterSubCategory, setFilterSubCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filterSubCategories = filterType !== "all" ? getSubCategories(filterType) : [];
  const hasActiveFilters = filterType !== "all" || filterSubCategory !== "all" || filterStatus !== "all" || search !== "";

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("*, profiles:owner_id(company_name, logo_url)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProjects(data as Project[]);
      }
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterType !== "all" && p.project_type !== filterType) return false;
      if (filterSubCategory !== "all" && p.sub_category !== filterSubCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        const matchesSkills = (p.required_skills ?? []).some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesSkills) return false;
      }
      return true;
    });
  }, [projects, search, filterType, filterSubCategory, filterStatus]);

  const clearFilters = () => {
    setFilterType("all");
    setFilterSubCategory("all");
    setFilterStatus("all");
    setSearch("");
  };

  // Stats
  const openCount = projects.filter((p) => p.status === "open").length;
  const inProgressCount = projects.filter((p) => p.status === "in_progress").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 pt-16 pb-12">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Public Project Board</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
              Explore{" "}
              <span className="bg-gradient-to-r from-primary via-blue-500 to-violet-500 bg-clip-text text-transparent">
                All Projects
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Browse real-world projects from companies across industries. Find opportunities that match your skills — no sign-in required.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="text-center p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-2xl font-bold">{openCount}</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Open</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-2xl font-bold">{inProgressCount}</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">In Progress</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-2xl font-bold">{completedCount}</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Completed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">

          {/* Filter Bar */}
          <Card className="p-4 mb-8 border-border/40 bg-card/50 backdrop-blur-sm shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
                <Filter className="w-4 h-4" />
                <span className="text-xs font-semibold hidden sm:inline uppercase tracking-wider">Filters</span>
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="explore-search"
                  placeholder="Search by title, description, or skill..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 text-sm bg-background/60 border-border/50 focus:border-primary/50"
                />
              </div>

              {/* Status */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className={`w-auto min-w-[130px] h-10 text-sm ${filterStatus !== "all" ? "border-primary/40 bg-primary/5 font-medium" : "bg-background/60"}`}>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <SelectValue placeholder="All Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Project Type */}
              <Select value={filterType} onValueChange={(v) => { setFilterType(v); setFilterSubCategory("all"); }}>
                <SelectTrigger className={`w-auto min-w-[140px] h-10 text-sm ${filterType !== "all" ? getCategoryColor(filterType) + " border font-medium" : "bg-background/60"}`}>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <SelectValue placeholder="All Types" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sub-Category */}
              {filterType !== "all" && (
                <Select value={filterSubCategory} onValueChange={setFilterSubCategory}>
                  <SelectTrigger className={`w-auto min-w-[160px] h-10 text-sm animate-in fade-in slide-in-from-left-2 duration-200 ${filterSubCategory !== "all" ? "border-primary/30 bg-primary/5 font-medium" : "bg-background/60"}`}>
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <SelectValue placeholder="All Sub-Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sub-Categories</SelectItem>
                    {filterSubCategories.map((sub) => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Clear */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-10 text-xs text-muted-foreground hover:text-foreground gap-1 animate-in fade-in duration-200"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Active filter pills */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Active:</span>
                {filterStatus !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {STATUS_STYLES[filterStatus]?.label || filterStatus}
                    <button onClick={() => setFilterStatus("all")} className="ml-0.5 hover:opacity-70">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                )}
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
                <span className="text-xs text-muted-foreground ml-auto font-medium">
                  {filteredProjects.length} result{filteredProjects.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </Card>

          {/* Results count */}
          {!hasActiveFilters && !loading && (
            <p className="text-sm text-muted-foreground mb-6">
              Showing <span className="font-semibold text-foreground">{filteredProjects.length}</span> project{filteredProjects.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="h-6 w-2/3 bg-muted rounded-md mb-3" />
                      <div className="h-4 w-full bg-muted/60 rounded-md mb-1" />
                      <div className="h-4 w-3/4 bg-muted/40 rounded-md" />
                    </div>
                    <div className="h-6 w-20 bg-muted rounded-full ml-4" />
                  </div>
                  <div className="flex gap-2 mb-3">
                    <div className="h-5 w-16 bg-muted/50 rounded-full" />
                    <div className="h-5 w-20 bg-muted/50 rounded-full" />
                  </div>
                  <div className="flex gap-4 mb-3">
                    <div className="h-4 w-24 bg-muted/40 rounded-md" />
                    <div className="h-4 w-20 bg-muted/40 rounded-md" />
                    <div className="h-4 w-28 bg-muted/40 rounded-md" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-5 w-14 bg-muted/30 rounded-full" />
                    <div className="h-5 w-18 bg-muted/30 rounded-full" />
                    <div className="h-5 w-16 bg-muted/30 rounded-full" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Project Cards */}
          {!loading && (
            <div className="grid gap-6">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project, index) => {
                  const statusInfo = STATUS_STYLES[project.status] || STATUS_STYLES.draft;
                  return (
                    <Card
                      key={project.id}
                      className="group relative p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden cursor-pointer"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => navigate(`/login`)}
                    >
                      {/* Subtle gradient accent on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/3 rounded-full blur-2xl" />
                      </div>

                      <div className="relative">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="min-w-0 flex-1 pr-4">
                            <div className="flex items-center gap-2 mb-2">
                              {project.profiles?.logo_url ? (
                                <img src={project.profiles.logo_url} alt="" className="w-5 h-5 rounded-full object-cover border border-border/50" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center border border-border/50">
                                  <Briefcase className="w-2.5 h-2.5 text-muted-foreground" />
                                </div>
                              )}
                              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                                {project.profiles?.company_name || "Company"}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-200 truncate">
                              {project.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {project.description}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`shrink-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${statusInfo.class}`}
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>

                        {/* Category Badges */}
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

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {formatProjectBudget(project)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {project.duration || "Flexible"}
                          </span>
                          <span className="text-xs">
                            Posted {new Date(project.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {(project.required_skills ?? []).slice(0, 6).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-background/50">
                              {skill}
                            </Badge>
                          ))}
                          {(project.required_skills ?? []).length > 6 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              +{(project.required_skills ?? []).length - 6} more
                            </Badge>
                          )}
                        </div>

                        {/* CTA */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Sign in to apply or view details
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/login");
                            }}
                          >
                            View Details
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <Card className="p-12 text-center border-dashed">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    {hasActiveFilters
                      ? "Try adjusting your filters to find more projects."
                      : "There are no projects available at the moment. Check back later!"}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters} className="gap-1.5">
                      <X className="w-4 h-4" />
                      Clear Filters
                    </Button>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* Bottom CTA */}
          {!loading && filteredProjects.length > 0 && (
            <Card className="mt-12 p-8 text-center bg-gradient-to-br from-primary/5 via-blue-500/5 to-violet-500/5 border-primary/20">
              <h2 className="text-2xl font-bold mb-2">Want to Apply or Post a Project?</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Create a free account to apply for projects, track your progress, and earn certificates.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate("/role-selection")} className="gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
              </div>
            </Card>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ExploreProjects;
