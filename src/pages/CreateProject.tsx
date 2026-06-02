import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, PlusCircle, Trash2, Layers, Tag, GraduationCap, Megaphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { sendNotification } from "@/lib/notifications";
import DashboardLayout from "@/components/DashboardLayout";
import { getCategoryColor } from "@/lib/projectCategories";
import { fetchCategoriesFromDB, fetchSubcategoriesFromDB } from "@/lib/projectCategories";
import AIDescriptionGenerator from "@/components/ai/AIDescriptionGenerator";

interface Milestone {
  title: string;
  description: string;
  due_date: string;
}

/** DB-fetched types */
interface DBCategory { id: string; name: string; slug: string; color: string | null; }
interface DBSubcategory { id: string; name: string; slug: string; }
interface DBEligibility { id: string; label: string; category: string | null; }

const CreateProject = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    project_type: "",
    sub_category: "",
    required_skills: "",
    budget_min: "",
    budget_max: "",
    pricing_type: "fixed",
    commission_type: "percentage",
    commission_min: "",
    commission_max: "",
    influencer_pricing_model: "per_post",
    influencer_rate: "",
    influencer_min_followers: "100",
    duration: "",
    start_date: "",
    end_date: "",
  });
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedEligibility, setSelectedEligibility] = useState<string[]>([]);
  const [customCriteria, setCustomCriteria] = useState("");
  const [eligibilitySelectValue, setEligibilitySelectValue] = useState("");

  // DB-driven state
  const [dbCategories, setDbCategories] = useState<DBCategory[]>([]);
  const [dbSubcategories, setDbSubcategories] = useState<DBSubcategory[]>([]);
  const [dbEligibility, setDbEligibility] = useState<DBEligibility[]>([]);

  // Fetch categories + eligibility on mount
  useEffect(() => {
    fetchCategoriesFromDB().then(setDbCategories);
    supabase.from("admin_eligibility_criteria").select("id, label, category").eq("is_enabled", true).order("display_order").then(({ data }) => {
      if (data) setDbEligibility(data as DBEligibility[]);
    });
  }, []);

  // Fetch subcategories when project_type changes
  useEffect(() => {
    if (!form.project_type) { setDbSubcategories([]); return; }
    const cat = dbCategories.find(c => c.name === form.project_type);
    if (cat) fetchSubcategoriesFromDB(cat.id).then(setDbSubcategories);
  }, [form.project_type, dbCategories]);

  const addMilestone = () => {
    setMilestones([...milestones, { title: "", description: "", due_date: "" }]);
  };

  const updateMilestone = (idx: number, field: keyof Milestone, value: string) => {
    const updated = [...milestones];
    updated[idx][field] = value;
    setMilestones(updated);
  };

  const removeMilestone = (idx: number) => {
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  const toggleEligibility = (option: string) => {
    setSelectedEligibility((prev) =>
      prev.includes(option) ? prev.filter((e) => e !== option) : [...prev, option]
    );
  };

  const addCustomEligibility = () => {
    const trimmed = customCriteria.trim();
    if (trimmed && !selectedEligibility.includes(trimmed)) {
      setSelectedEligibility((prev) => [...prev, trimmed]);
      setCustomCriteria("");
    }
  };

  const removeEligibility = (option: string) => {
    setSelectedEligibility((prev) => prev.filter((e) => e !== option));
  };

  const availableSubCategories = dbSubcategories.map(s => s.name);
  const isInfluencerMarketing = form.sub_category === "Influencer Marketing";

  // Group eligibility by category for the dropdown
  const eligibilityByCategory: Record<string, string[]> = {};
  dbEligibility.forEach(e => {
    const cat = e.category || "Other";
    if (!eligibilityByCategory[cat]) eligibilityByCategory[cat] = [];
    eligibilityByCategory[cat].push(e.label);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!form.project_type) {
      toast({
        variant: "destructive",
        title: "Project Type Required",
        description: "Please select a project type before publishing.",
      });
      return;
    }

    if (["commission", "fixed_plus_commission"].includes(form.pricing_type)) {
      const min = parseFloat(form.commission_min) || 0;
      const max = parseFloat(form.commission_max) || 0;
      
      if (min < 0 || max <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid Commission",
          description: "Commission range must be greater than zero.",
        });
        return;
      }
      
      if (max < min) {
        toast({
          variant: "destructive",
          title: "Invalid Commission Range",
          description: "Maximum commission cannot be less than minimum.",
        });
        return;
      }
    }

    if (form.pricing_type !== "commission") {
      const min = parseFloat(form.budget_min) || 0;
      const max = parseFloat(form.budget_max) || 0;
      if (max < min) {
        toast({
          variant: "destructive",
          title: "Invalid Budget Range",
          description: "Maximum budget cannot be less than minimum.",
        });
        return;
      }
    }

    // Validate influencer rate
    if (isInfluencerMarketing) {
      const rate = parseFloat(form.influencer_rate) || 0;
      if (rate <= 0) {
        toast({
          variant: "destructive",
          title: "Influencer Rate Required",
          description: "Please specify a valid rate for influencer marketing.",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { data: project, error: projError } = await supabase
        .from("projects")
        .insert({
          owner_id: profile.id,
          title: form.title,
          description: form.description,
          project_type: form.project_type || null,
          sub_category: form.sub_category || null,
          category: form.project_type || null,
          required_skills: form.required_skills.split(",").map(s => s.trim()).filter(Boolean),
          budget_min: parseFloat(form.budget_min) || 0,
          budget_max: parseFloat(form.budget_max) || 0,
          pricing_type: form.pricing_type,
          commission_type: ["commission", "fixed_plus_commission"].includes(form.pricing_type) ? form.commission_type : null,
          commission_min: ["commission", "fixed_plus_commission"].includes(form.pricing_type) ? (parseFloat(form.commission_min) || 0) : 0,
          commission_max: ["commission", "fixed_plus_commission"].includes(form.pricing_type) ? (parseFloat(form.commission_max) || 0) : 0,
          influencer_pricing_model: isInfluencerMarketing ? form.influencer_pricing_model : null,
          influencer_rate: isInfluencerMarketing ? (parseFloat(form.influencer_rate) || 0) : 0,
          influencer_min_followers: isInfluencerMarketing ? (parseInt(form.influencer_min_followers) || 100) : 100,
          eligibility_criteria: selectedEligibility,
          duration: form.duration || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          status: "open",
        })
        .select()
        .single();

      if (projError) throw projError;

      // Insert milestones
      if (milestones.length > 0 && project) {
        const milestonesData = milestones.map((m, i) => ({
          project_id: project.id,
          title: m.title,
          description: m.description || null,
          due_date: m.due_date || null,
          order_index: i,
        }));
        const { error: msError } = await supabase.from("project_milestones").insert(milestonesData);
        if (msError) console.error("Milestones error:", msError);
      }

      // Notify students and campuses
      if (project) {
        await sendNotification("new_project", { project_id: project.id });
      }

      toast({ title: "Project created!", description: "Your project is now live." });
      navigate("/projects");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error creating project",
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-2xl font-bold mb-6">Create New Project</h1>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Build a React Dashboard"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <AIDescriptionGenerator
                  projectTitle={form.title}
                  projectType={form.project_type}
                  subCategory={form.sub_category}
                  requiredSkills={form.required_skills}
                  onDescriptionGenerated={(desc) => setForm({ ...form, description: desc })}
                />
              </div>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the project scope, requirements, and deliverables..."
              />
            </div>

            {/* Project Type & Sub-Category — Dependent Dropdowns */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold">Project Classification</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    Project Type *
                  </Label>
                  <Select
                    value={form.project_type}
                    onValueChange={(v) =>
                      setForm({ ...form, project_type: v, sub_category: "" })
                    }
                  >
                    <SelectTrigger id="project-type" className={form.project_type ? getCategoryColor(form.project_type) + " border font-medium" : ""}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {dbCategories.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    Sub-Category
                    {!form.project_type && (
                      <span className="text-[10px] text-muted-foreground ml-1">(select type first)</span>
                    )}
                  </Label>
                  <Select
                    value={form.sub_category}
                    onValueChange={(v) => setForm({ ...form, sub_category: v })}
                    disabled={!form.project_type}
                  >
                    <SelectTrigger
                      id="sub-category"
                      className={`transition-all duration-300 ${
                        !form.project_type ? "opacity-50" : ""
                      }`}
                    >
                      <SelectValue placeholder={form.project_type ? "Select sub-category" : "—"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubCategories.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Influencer Marketing Pricing — Only when sub_category is Influencer Marketing */}
            {isInfluencerMarketing && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-purple-500/10">
                    <Megaphone className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-semibold">Influencer Marketing Pricing</span>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Specify how the influencer will be compensated — per individual post or on a monthly retainer basis.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pricing Model *</Label>
                    <Select
                      value={form.influencer_pricing_model}
                      onValueChange={(v) => setForm({ ...form, influencer_pricing_model: v })}
                    >
                      <SelectTrigger id="influencer-pricing-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_post">Per Post Charges</SelectItem>
                        <SelectItem value="monthly">Monthly Retainer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="influencer_rate">
                      {form.influencer_pricing_model === "per_post" ? "Rate per Post (₹) *" : "Monthly Rate (₹) *"}
                    </Label>
                    <Input
                      id="influencer_rate"
                      type="number"
                      value={form.influencer_rate}
                      onChange={(e) => setForm({ ...form, influencer_rate: e.target.value })}
                      placeholder={form.influencer_pricing_model === "per_post" ? "e.g., 500" : "e.g., 10000"}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="influencer_min_followers">Min. Followers Required *</Label>
                    <Input
                      id="influencer_min_followers"
                      type="number"
                      value={form.influencer_min_followers}
                      onChange={(e) => setForm({ ...form, influencer_min_followers: e.target.value })}
                      placeholder="100"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pricing Type</Label>
                <Select value={form.pricing_type} onValueChange={(v) => setForm({ ...form, pricing_type: v })}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="e.g., 2 weeks, 1 month"
                />
              </div>
            </div>

            {["commission", "fixed_plus_commission"].includes(form.pricing_type) && (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Tag className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Commission Details</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Commission Type</Label>
                    <Select 
                      value={form.commission_type} 
                      onValueChange={(v) => setForm({ ...form, commission_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="comm_min">Min {form.commission_type === 'percentage' ? '%' : '₹'}</Label>
                      <Input
                        id="comm_min"
                        type="number"
                        value={form.commission_min}
                        onChange={(e) => setForm({ ...form, commission_min: e.target.value })}
                        placeholder="5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comm_max">Max {form.commission_type === 'percentage' ? '%' : '₹'}</Label>
                      <Input
                        id="comm_max"
                        type="number"
                        value={form.commission_max}
                        onChange={(e) => setForm({ ...form, commission_max: e.target.value })}
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {form.pricing_type !== "commission" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_min">
                    {form.pricing_type === "fixed_plus_commission" ? "Fixed Base Pay Min (₹)" : "Budget Min (₹)"}
                  </Label>
                  <Input
                    id="budget_min"
                    type="number"
                    value={form.budget_min}
                    onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_max">
                    {form.pricing_type === "fixed_plus_commission" ? "Fixed Base Pay Max (₹)" : "Budget Max (₹)"}
                  </Label>
                  <Input
                    id="budget_max"
                    type="number"
                    value={form.budget_max}
                    onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
                    placeholder="2000"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="skills">Required Skills (comma-separated)</Label>
              <Input
                id="skills"
                value={form.required_skills}
                onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
                placeholder="React, TypeScript, Node.js..."
              />
            </div>

            {/* Eligibility Criteria Tile */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-semibold">Eligibility Criteria</span>
                <span className="text-[10px] text-muted-foreground ml-auto">Optional — helps filter candidates</span>
              </div>

              {/* Selected criteria as removable badges */}
              {selectedEligibility.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-background/40 border border-border/40">
                  {selectedEligibility.map((item) => (
                    <Badge
                      key={item}
                      variant="default"
                      className="pl-2.5 pr-1 py-1 text-xs gap-1 cursor-pointer hover:bg-primary/80 transition-colors shadow-sm"
                      onClick={() => removeEligibility(item)}
                    >
                      {item}
                      <X className="w-3 h-3 ml-0.5" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Categorized Options Dropdown */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 px-1 block">
                  Select Predefined Criteria
                </Label>
                <Select 
                  value={eligibilitySelectValue} 
                  onValueChange={(v) => {
                    if (v && !selectedEligibility.includes(v)) {
                      toggleEligibility(v);
                    }
                    setEligibilitySelectValue("");
                  }}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border/60">
                    <SelectValue placeholder="Browse categories (Education, Experience...)" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eligibilityByCategory).map(([category, options]) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-primary font-bold">{category}</SelectLabel>
                        {options.map((option) => (
                          <SelectItem 
                            key={option} 
                            value={option}
                            disabled={selectedEligibility.includes(option)}
                          >
                            {option}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Qualification Input */}
              <div className="pt-4 border-t border-border/40">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 px-1 block mb-2">
                  Other Qualifications
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Knowledge of Figma, UI/UX Certification..."
                    value={customCriteria}
                    onChange={(e) => setCustomCriteria(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomEligibility();
                      }
                    }}
                    className="h-9 text-sm"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addCustomEligibility}
                    className="shrink-0 h-9"
                  >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 px-1">
                  Type any custom requirement and press Enter or click Add.
                </p>
              </div>

              {selectedEligibility.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2 italic">
                  Select criteria above or add custom ones. If none, project is open to everyone.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Milestones</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              {milestones.map((m, idx) => (
                <Card key={idx} className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Input
                      placeholder="Milestone title"
                      value={m.title}
                      onChange={(e) => updateMilestone(idx, "title", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="date"
                      value={m.due_date}
                      onChange={(e) => updateMilestone(idx, "due_date", e.target.value)}
                      className="w-36"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMilestone(idx)}
                      aria-label="Remove milestone"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Description (optional)"
                    value={m.description}
                    onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                  />
                </Card>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Publish Project"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreateProject;
