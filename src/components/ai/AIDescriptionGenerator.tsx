import { useState, useCallback } from "react";
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
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Wand2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AIDescriptionGeneratorProps {
  projectTitle: string;
  projectType: string;
  subCategory: string;
  requiredSkills: string;
  onDescriptionGenerated: (description: string) => void;
}

type Tone = "formal" | "technical" | "simple";

const TONE_OPTIONS: { value: Tone; label: string; description: string }[] = [
  { value: "formal", label: "Formal", description: "Professional & corporate" },
  { value: "technical", label: "Technical", description: "Detailed & precise" },
  { value: "simple", label: "Simple", description: "Clear & accessible" },
];

const AIDescriptionGenerator = ({
  projectTitle,
  projectType,
  subCategory,
  requiredSkills,
  onDescriptionGenerated,
}: AIDescriptionGeneratorProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [copied, setCopied] = useState(false);
  const [tone, setTone] = useState<Tone>("formal");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [objectives, setObjectives] = useState("");

  const handleGenerate = useCallback(async () => {
    if (!projectTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Title Required",
        description: "Please enter a project title before generating a description.",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedDescription("");
    setIsEditing(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          title: projectTitle,
          category: projectType || "General",
          sub_category: subCategory || "",
          key_features: keyFeatures,
          objectives: objectives,
          tone: tone,
          required_skills: requiredSkills,
        },
      });

      if (error) throw error;

      if (data?.description) {
        setGeneratedDescription(data.description);
        setEditedDescription(data.description);
      } else {
        throw new Error("No description generated");
      }
    } catch (err) {
      console.error("AI generation error:", err);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate description. Please try again or write manually.",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [projectTitle, projectType, subCategory, keyFeatures, objectives, tone, requiredSkills, toast]);

  const handleUseDescription = () => {
    const desc = isEditing ? editedDescription : generatedDescription;
    onDescriptionGenerated(desc);
    setIsExpanded(false);
    toast({
      title: "Description Applied ✓",
      description: "AI-generated description has been added to your project.",
    });
  };

  const handleCopy = async () => {
    const desc = isEditing ? editedDescription : generatedDescription;
    await navigator.clipboard.writeText(desc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const toggleEdit = () => {
    if (!isEditing) {
      setEditedDescription(generatedDescription);
    }
    setIsEditing(!isEditing);
  };

  return (
    <div className="relative group">
      {/* Trigger Button — displayed next to the Description label */}
      {!isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                     bg-gradient-to-r from-violet-600/20 to-indigo-600/20 
                     border border-violet-500/30 text-violet-300
                     hover:from-violet-600/30 hover:to-indigo-600/30 hover:border-violet-500/50
                     hover:text-violet-200 hover:shadow-lg hover:shadow-violet-500/10
                     transition-all duration-300 ease-out"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
          Take AI Assistance
        </button>
      )}

      {/* Expanded AI Panel */}
      {isExpanded && (
        <div
          className="mt-2 rounded-xl border border-violet-500/30 bg-gradient-to-br from-[#0f1629]/95 to-[#1a1040]/95
                      backdrop-blur-xl shadow-2xl shadow-violet-500/5 overflow-hidden
                      animate-in slide-in-from-top-2 duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-violet-500/20 bg-violet-500/5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
                <Wand2 className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
                  AI Description Generator
                </span>
                <p className="text-[10px] text-muted-foreground/70">Powered by WeBuild AI</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-md hover:bg-white/5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Input Fields */}
          <div className="p-4 space-y-3">
            {/* Tone Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground/80">Writing Tone</Label>
              <div className="grid grid-cols-3 gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTone(opt.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 text-center
                      ${
                        tone === opt.value
                          ? "border-violet-500/60 bg-violet-500/15 text-violet-300 shadow-sm shadow-violet-500/10"
                          : "border-border/40 bg-background/30 text-muted-foreground hover:border-violet-500/30 hover:bg-violet-500/5"
                      }`}
                  >
                    <span className="block">{opt.label}</span>
                    <span className="block text-[10px] opacity-60 mt-0.5">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Key Features */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground/80">
                Key Features / Scope
                <span className="text-[10px] ml-1 opacity-50">(comma-separated)</span>
              </Label>
              <Input
                value={keyFeatures}
                onChange={(e) => setKeyFeatures(e.target.value)}
                placeholder="e.g., User authentication, Dashboard analytics, API integration"
                className="text-xs h-8 bg-background/30 border-border/40 focus:border-violet-500/50 placeholder:text-muted-foreground/30"
              />
            </div>

            {/* Objectives */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground/80">
                Project Objectives
                <span className="text-[10px] ml-1 opacity-50">(comma-separated)</span>
              </Label>
              <Input
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="e.g., Improve user engagement, Reduce load time, Automate workflows"
                className="text-xs h-8 bg-background/30 border-border/40 focus:border-violet-500/50 placeholder:text-muted-foreground/30"
              />
            </div>

            {/* Context Info */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {projectTitle && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  Title: {projectTitle.length > 30 ? projectTitle.slice(0, 30) + "…" : projectTitle}
                </span>
              )}
              {projectType && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {projectType}
                </span>
              )}
              {subCategory && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {subCategory}
                </span>
              )}
              {requiredSkills && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Skills: {requiredSkills.length > 25 ? requiredSkills.slice(0, 25) + "…" : requiredSkills}
                </span>
              )}
            </div>

            {/* Generate Button */}
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !projectTitle.trim()}
              className="w-full h-9 text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 
                         hover:from-violet-500 hover:to-indigo-500 border-0 shadow-lg shadow-violet-500/20
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generate Description
                </>
              )}
            </Button>
          </div>

          {/* Generated Result */}
          {generatedDescription && (
            <div className="border-t border-violet-500/20">
              {/* Result Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/5 border-b border-violet-500/10">
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Generated Successfully
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleEdit}
                    className={`p-1.5 rounded-md text-xs transition-colors ${
                      isEditing
                        ? "bg-amber-500/15 text-amber-400"
                        : "hover:bg-white/5 text-muted-foreground/60 hover:text-muted-foreground"
                    }`}
                    title="Edit description"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground/60 hover:text-muted-foreground transition-colors disabled:opacity-40"
                    title="Regenerate"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Description Preview / Editor */}
              <div className="p-4">
                {isEditing ? (
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={8}
                    className="text-xs leading-relaxed bg-background/40 border-amber-500/30 focus:border-amber-500/50 resize-y"
                  />
                ) : (
                  <div className="text-xs leading-relaxed text-foreground/85 whitespace-pre-wrap max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                    {generatedDescription}
                  </div>
                )}
              </div>

              {/* Use Description Button */}
              <div className="px-4 pb-4">
                <Button
                  type="button"
                  onClick={handleUseDescription}
                  className="w-full h-9 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 
                             hover:from-emerald-500 hover:to-teal-500 border-0 shadow-lg shadow-emerald-500/20
                             transition-all duration-200"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Use This Description
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIDescriptionGenerator;
