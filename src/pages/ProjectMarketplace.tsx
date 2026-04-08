import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, IndianRupee, Clock, Briefcase, Filter, Bookmark, BookmarkCheck, X, Layers, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import useRealtime from "@/hooks/use-realtime";
import DashboardLayout from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { PROJECT_TYPES, getSubCategories, getCategoryColor } from "@/lib/projectCategories";

const durations = ["1 week", "2 weeks", "1 month", "2 months", "3 months", "6 months"];

const ProjectMarketplace = () => {
  const { projects } = useRealtime();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [projectType, setProjectType] = useState("all");
  const [subCategory, setSubCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [budgetRange, setBudgetRange] = useState([0, 50000]);
  const [duration, setDuration] = useState("all");
  const [skillFilter, setSkillFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const availableSubCategories = projectType !== "all" ? getSubCategories(projectType) : [];
  const hasActiveFilters = projectType !== "all" || subCategory !== "all" || duration !== "all" || skillFilter !== "" || budgetRange[0] !== 0 || budgetRange[1] !== 50000;

  // Load bookmarks
  useEffect(() => {
    if (!profile) return;
    supabase.from("bookmarks").select("project_id").eq("user_id", profile.id).then(({ data }) => {
      setBookmarks(new Set((data ?? []).map((b: any) => b.project_id)));
    });
  }, [profile]);

  // Load AI recommendations
  useEffect(() => {
    if (!profile || profile.role !== "student") return;
    supabase.functions.invoke("recommend-projects", {
      body: { user_id: profile.id, skills: profile.skills ?? [] },
    }).then(({ data }) => {
      if (data?.recommended_ids) setRecommendations(data.recommended_ids);
    }).catch(() => {});
  }, [profile]);

  const toggleBookmark = async (projectId: string) => {
    if (!profile) return;
    if (bookmarks.has(projectId)) {
      await supabase.from("bookmarks").delete().eq("user_id", profile.id).eq("project_id", projectId);
      setBookmarks((prev) => { const n = new Set(prev); n.delete(projectId); return n; });
      toast({ title: "Bookmark removed" });
    } else {
      await supabase.from("bookmarks").insert({ user_id: profile.id, project_id: projectId });
      setBookmarks((prev) => new Set(prev).add(projectId));
      toast({ title: "Project bookmarked" });
    }
  };

  const openProjects = projects.filter((p) => p.status === "open");

  const skillFilters = skillFilter.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  const clearFilters = () => {
    setProjectType("all");
    setSubCategory("all");
    setDuration("all");
    setSkillFilter("");
    setBudgetRange([0, 50000]);
  };

  const filtered = openProjects
    .filter((p) => {
      const matchesSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        (p.required_skills ?? []).some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchesType = projectType === "all" || p.project_type === projectType;
      const matchesSubCategory = subCategory === "all" || p.sub_category === subCategory;
      const matchesBudget = (p.budget_min ?? 0) >= budgetRange[0] && (p.budget_max ?? 0) <= budgetRange[1];
      const matchesDuration = duration === "all" || p.duration === duration;
      const matchesSkills =
        skillFilters.length === 0 ||
        skillFilters.some((sf) => (p.required_skills ?? []).some((rs) => rs.toLowerCase().includes(sf)));
      return matchesSearch && matchesType && matchesSubCategory && matchesBudget && matchesDuration && matchesSkills;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "budget-high") return (b.budget_max ?? 0) - (a.budget_max ?? 0);
      if (sortBy === "budget-low") return (a.budget_min ?? 0) - (b.budget_min ?? 0);
      if (sortBy === "recommended") {
        const aRec = recommendations.includes(a.id) ? 1 : 0;
        const bRec = recommendations.includes(b.id) ? 1 : 0;
        return bRec - aRec;
      }
      return 0;
    });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Project Marketplace</h1>
          <p className="text-muted-foreground">Find and apply to projects that match your skills</p>
        </div>

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search projects, skills, descriptions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="w-4 h-4" />
            Filters {showFilters && <X className="w-3 h-3" />}
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="budget-high">Budget: High</SelectItem>
              <SelectItem value="budget-low">Budget: Low</SelectItem>
              {recommendations.length > 0 && <SelectItem value="recommended">Recommended</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <Card className="p-4 mb-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200 border-border/40">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Project Type */}
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5 text-foreground">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Project Type
                </label>
                <Select value={projectType} onValueChange={(v) => { setProjectType(v); setSubCategory("all"); }}>
                  <SelectTrigger className={projectType !== "all" ? getCategoryColor(projectType) + " border font-medium" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-Category — dynamically appears */}
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5 text-foreground">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  Sub-Category
                  {projectType === "all" && (
                    <span className="text-[10px] text-muted-foreground">(select type first)</span>
                  )}
                </label>
                <Select value={subCategory} onValueChange={setSubCategory} disabled={projectType === "all"}>
                  <SelectTrigger className={`transition-all duration-200 ${projectType === "all" ? "opacity-50" : subCategory !== "all" ? "border-primary/30 bg-primary/5 font-medium" : ""}`}>
                    <SelectValue placeholder={projectType !== "all" ? "All Sub-Categories": "—"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sub-Categories</SelectItem>
                    {availableSubCategories.map((sub) => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Duration</SelectItem>
                    {durations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Skills */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Skills (comma-separated)</label>
                <Input placeholder="React, Python..." value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} />
              </div>

              {/* Budget */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Budget: ₹{budgetRange[0]} – ₹{budgetRange[1]}</label>
                <Slider min={0} max={50000} step={500} value={budgetRange} onValueChange={setBudgetRange} className="mt-3" />
              </div>
            </div>

            {/* Active filter summary & clear */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Active:</span>
                  {projectType !== "all" && (
                    <Badge variant="secondary" className={`text-xs gap-1 ${getCategoryColor(projectType)}`}>
                      {projectType}
                      <button onClick={() => { setProjectType("all"); setSubCategory("all"); }}><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  )}
                  {subCategory !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1 border-primary/20 bg-primary/5">
                      {subCategory}
                      <button onClick={() => setSubCategory("all")}><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  )}
                  {duration !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {duration}
                      <button onClick={() => setDuration("all")}><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  )}
                  {skillFilter && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      Skills: {skillFilter}
                      <button onClick={() => setSkillFilter("")}><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1 text-muted-foreground">
                  <X className="w-3 h-3" /> Clear all
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">{filtered.length} projects found</p>

        {/* Results */}
        <div className="grid gap-4">
          {filtered.length > 0 ? (
            filtered.map((project) => {
              const isRecommended = recommendations.includes(project.id);
              const isBookmarked = bookmarks.has(project.id);
              return (
                <Card key={project.id} className={`p-5 hover:shadow-md transition-shadow ${isRecommended ? "border-primary/30 bg-primary/5" : ""}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 flex-1">
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
                        {isRecommended && <Badge className="text-[10px] h-4 px-1.5 shrink-0">Recommended</Badge>}
                      </div>
                      <h3 className="text-lg font-bold truncate mb-1">{project.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => toggleBookmark(project.id)}>
                        {isBookmarked ? <BookmarkCheck className="w-5 h-5 text-primary" /> : <Bookmark className="w-5 h-5" />}
                      </Button>
                    </div>
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
                    <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />₹{project.budget_min}–₹{project.budget_max}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{project.duration || "Flexible"}</span>
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
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/projects/${project.id}`)}>View & Apply</Button>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">No projects found matching your criteria</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              )}
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectMarketplace;
