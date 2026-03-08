import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, PlusCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";

interface Milestone {
  title: string;
  description: string;
  due_date: string;
}

const CreateProject = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    required_skills: "",
    budget_min: "",
    budget_max: "",
    pricing_type: "fixed",
    duration: "",
    start_date: "",
    end_date: "",
  });
  const [milestones, setMilestones] = useState<Milestone[]>([]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const { data: project, error: projError } = await supabase
        .from("projects")
        .insert({
          owner_id: profile.id,
          title: form.title,
          description: form.description,
          category: form.category || null,
          required_skills: form.required_skills.split(",").map(s => s.trim()).filter(Boolean),
          budget_min: parseFloat(form.budget_min) || 0,
          budget_max: parseFloat(form.budget_max) || 0,
          pricing_type: form.pricing_type,
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

  const categories = ["Web Development", "Mobile App", "Design", "Data Science", "Marketing", "Other"];

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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the project scope, requirements, and deliverables..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Required Skills (comma-separated)</Label>
              <Input
                id="skills"
                value={form.required_skills}
                onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
                placeholder="React, TypeScript, Node.js..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget_min">Budget Min ($)</Label>
                <Input
                  id="budget_min"
                  type="number"
                  value={form.budget_min}
                  onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_max">Budget Max ($)</Label>
                <Input
                  id="budget_max"
                  type="number"
                  value={form.budget_max}
                  onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
                  placeholder="2000"
                />
              </div>
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
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMilestone(idx)}>
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
