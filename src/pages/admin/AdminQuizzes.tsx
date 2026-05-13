import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, Search, Loader2, Eye, BrainCircuit,
  GripVertical, X, CheckCircle, Copy, FileQuestion, Upload, Download
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "@/hooks/use-toast";

/* ───────────────── types ───────────────── */
interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface Quiz {
  id: string;
  title: string;
  skill_name: string;
  description: string | null;
  questions: QuizQuestion[];
  passing_score: number;
  created_at: string | null;
}

interface QuizForm {
  title: string;
  skill_name: string;
  description: string;
  passing_score: number;
  questions: QuizQuestion[];
}

const EMPTY_QUESTION: QuizQuestion = { question: "", options: ["", "", "", ""], correct: 0 };

const defaultForm = (): QuizForm => ({
  title: "",
  skill_name: "",
  description: "",
  passing_score: 70,
  questions: [{ ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] }],
});

/* ───────────────── component ───────────────── */
export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* Dialog state */
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [form, setForm] = useState<QuizForm>(defaultForm());
  const [saving, setSaving] = useState(false);

  /* Preview / Delete / Template */
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);
  const [showTemplateGuide, setShowTemplateGuide] = useState(false);

  /* Attempt counts (from skill_badges table) */
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});

  /* ───────── fetch ───────── */
  const fetchData = async () => {
    setLoading(true);
    const [quizRes, badgeRes] = await Promise.all([
      supabase.from("skill_quizzes").select("*").order("created_at", { ascending: false }),
      supabase.from("skill_badges").select("quiz_id"),
    ]);
    const raw = (quizRes.data ?? []) as any[];
    setQuizzes(
      raw.map((q) => ({
        ...q,
        questions: Array.isArray(q.questions)
          ? (q.questions as QuizQuestion[])
          : [],
      }))
    );
    const counts: Record<string, number> = {};
    (badgeRes.data ?? []).forEach((b: any) => {
      counts[b.quiz_id] = (counts[b.quiz_id] || 0) + 1;
    });
    setAttemptCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ───────── open dialogs ───────── */
  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setShowEditor(true);
  };

  const openEdit = (quiz: Quiz) => {
    setEditing(quiz);
    setForm({
      title: quiz.title,
      skill_name: quiz.skill_name,
      description: quiz.description || "",
      passing_score: quiz.passing_score ?? 70,
      questions: quiz.questions.length
        ? quiz.questions.map((q) => ({ ...q, options: [...q.options] }))
        : [{ ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] }],
    });
    setShowEditor(true);
  };

  const duplicateQuiz = (quiz: Quiz) => {
    setEditing(null);
    setForm({
      title: `${quiz.title} (Copy)`,
      skill_name: quiz.skill_name,
      description: quiz.description || "",
      passing_score: quiz.passing_score ?? 70,
      questions: quiz.questions.map((q) => ({ ...q, options: [...q.options] })),
    });
    setShowEditor(true);
  };

  /* ───────── question helpers ───────── */
  const updateQuestion = (qi: number, patch: Partial<QuizQuestion>) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)),
    }));
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q
      ),
    }));
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] }],
    }));
  };

  const removeQuestion = (qi: number) => {
    if (form.questions.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== qi),
    }));
  };

  const addOption = (qi: number) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === qi ? { ...q, options: [...q.options, ""] } : q
      ),
    }));
  };

  const removeOption = (qi: number, oi: number) => {
    const q = form.questions[qi];
    if (q.options.length <= 2) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, i) => {
        if (i !== qi) return question;
        const newOpts = question.options.filter((_, j) => j !== oi);
        return {
          ...question,
          options: newOpts,
          correct: question.correct >= newOpts.length ? 0 : question.correct,
        };
      }),
    }));
  };

  /* ───────── save ───────── */
  const validate = (): string | null => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.skill_name.trim()) return "Skill name is required.";
    if (form.passing_score < 1 || form.passing_score > 100) return "Passing score must be 1-100.";
    if (form.questions.length === 0) return "At least one question is required.";
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.question.trim()) return `Question ${i + 1} text is empty.`;
      if (q.options.some((o) => !o.trim())) return `Question ${i + 1} has empty options.`;
      if (q.correct < 0 || q.correct >= q.options.length)
        return `Question ${i + 1} has an invalid correct answer.`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast({ title: "Validation Error", description: err, variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      skill_name: form.skill_name.trim(),
      description: form.description.trim() || null,
      passing_score: form.passing_score,
      questions: form.questions as any,
    };

    if (editing) {
      const { error } = await supabase
        .from("skill_quizzes")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Quiz updated successfully" });
    } else {
      const { error } = await supabase.from("skill_quizzes").insert(payload);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Quiz created successfully" });
    }

    setSaving(false);
    setShowEditor(false);
    fetchData();
  };

  /* ───────── delete ───────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    // Delete related badges first
    await supabase.from("skill_badges").delete().eq("quiz_id", deleteTarget.id);
    const { error } = await supabase.from("skill_quizzes").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setDeleteTarget(null);
    toast({ title: "Quiz deleted successfully" });
    fetchData();
  };

  /* ───────── import/export ───────── */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const quizzesMap: Record<string, any> = {};
          
          for (const row of rows) {
            const title = row.quiz_title?.trim();
            if (!title) continue;
            
            if (!quizzesMap[title]) {
              quizzesMap[title] = {
                title: title,
                skill_name: row.skill_name?.trim() || "General",
                description: row.description?.trim() || null,
                passing_score: parseInt(row.passing_score) || 70,
                questions: []
              };
            }
            
            const options = [];
            if (row.option1?.trim()) options.push(row.option1.trim());
            if (row.option2?.trim()) options.push(row.option2.trim());
            if (row.option3?.trim()) options.push(row.option3.trim());
            if (row.option4?.trim()) options.push(row.option4.trim());
            if (row.option5?.trim()) options.push(row.option5.trim());
            if (row.option6?.trim()) options.push(row.option6.trim());
            
            quizzesMap[title].questions.push({
              question: row.question?.trim() || "Untitled Question",
              options: options.length >= 2 ? options : ["Option 1", "Option 2"],
              correct: parseInt(row.correct_option_index) || 0
            });
          }
          
          const quizzesToInsert = Object.values(quizzesMap);
          if (quizzesToInsert.length === 0) {
            toast({ title: "No valid quizzes found in CSV", variant: "destructive" });
            return;
          }
          
          setSaving(true);
          const { error } = await supabase.from("skill_quizzes").insert(quizzesToInsert);
          setSaving(false);
          
          if (error) {
            toast({ title: "Import Error", description: error.message, variant: "destructive" });
          } else {
            toast({ title: `${quizzesToInsert.length} Quizzes imported successfully!` });
            fetchData();
          }
        } catch (err: any) {
          setSaving(false);
          toast({ title: "Import Error", description: "Invalid CSV format", variant: "destructive" });
        }
        e.target.value = '';
      }
    });
  };

  const downloadTemplate = () => {
    const template = "quiz_title,skill_name,description,passing_score,question,option1,option2,option3,option4,correct_option_index\nSample Quiz,React,Basic React knowledge,70,What is JSX?,A syntax extension,A library,A framework,A language,0\nSample Quiz,React,Basic React knowledge,70,What is a hook?,A function,A class,A component,A prop,0";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "quiz_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ───────── filter ───────── */
  const filtered = quizzes.filter(
    (q) =>
      !search ||
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.skill_name.toLowerCase().includes(search.toLowerCase())
  );

  /* ───────── stats ───────── */
  const totalAttempts = Object.values(attemptCounts).reduce((a, b) => a + b, 0);

  /* ═══════════════════════════════════ RENDER ═══════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-primary" />
            Quizzes Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create, edit, and manage skill assessment quizzes for students
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateGuide(true)} title="View Quiz Template Guide">
            <Download className="w-4 h-4 mr-2" /> Template
          </Button>
          <div className="relative">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              title="Upload CSV"
            />
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" /> Import
            </Button>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Create Quiz
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileQuestion className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{quizzes.length}</p>
            <p className="text-xs text-muted-foreground">Total Quizzes</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground">Total Attempts</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {quizzes.reduce((sum, q) => sum + (q.questions?.length || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-4">
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search quizzes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-4">Quiz Title</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">Pass %</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((quiz) => (
                  <TableRow key={quiz.id} className="hover:bg-muted/30 transition-colors group/row">
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{quiz.title}</p>
                        {quiz.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[280px]">
                            {quiz.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {quiz.skill_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="rounded-full min-w-[28px] justify-center">
                        {quiz.questions?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      {quiz.passing_score}%
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {attemptCounts[quiz.id] || 0}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Preview"
                          onClick={() => setPreviewQuiz(quiz)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Duplicate"
                          onClick={() => duplicateQuiz(quiz)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          title="Edit"
                          onClick={() => openEdit(quiz)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Delete"
                          onClick={() => setDeleteTarget(quiz)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <FileQuestion className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      {search ? "No quizzes match your search." : "No quizzes yet. Create your first quiz!"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ═══════════ Create / Edit Dialog ═══════════ */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              {editing ? "Edit Quiz" : "Create New Quiz"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Quiz Details</TabsTrigger>
              <TabsTrigger value="questions">
                Questions ({form.questions.length})
              </TabsTrigger>
            </TabsList>

            {/* ── Details Tab ── */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. JavaScript Fundamentals"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Skill Name *</label>
                <Input
                  value={form.skill_name}
                  onChange={(e) => setForm({ ...form, skill_name: e.target.value })}
                  placeholder="e.g. JavaScript"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the quiz…"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Passing Score (%)</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.passing_score}
                  onChange={(e) =>
                    setForm({ ...form, passing_score: parseInt(e.target.value) || 70 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Students need this score or above to earn the skill badge.
                </p>
              </div>
            </TabsContent>

            {/* ── Questions Tab ── */}
            <TabsContent value="questions" className="space-y-4 mt-4">
              {form.questions.map((q, qi) => (
                <Card key={qi} className="p-4 space-y-3 relative border-border/60">
                  <div className="flex items-center gap-2 mb-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      Question {qi + 1}
                    </span>
                    <div className="flex-1" />
                    {form.questions.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeQuestion(qi)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <Input
                    value={q.question}
                    onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                    placeholder="Enter question text…"
                    className="font-medium"
                  />

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Options (click radio to mark correct answer)
                    </label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuestion(qi, { correct: oi })}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            q.correct === oi
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30 hover:border-primary/50"
                          }`}
                        >
                          {q.correct === oi && (
                            <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                          )}
                        </button>
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                          className={`flex-1 text-sm ${
                            q.correct === oi ? "border-primary/40 bg-primary/5" : ""
                          }`}
                        />
                        {q.options.length > 2 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeOption(qi, oi)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {q.options.length < 6 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        onClick={() => addOption(qi)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    )}
                  </div>
                </Card>
              ))}

              <Button variant="outline" onClick={addQuestion} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Question
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Update Quiz" : "Create Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Preview Dialog ═══════════ */}
      <Dialog open={!!previewQuiz} onOpenChange={() => setPreviewQuiz(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Quiz Preview
            </DialogTitle>
          </DialogHeader>
          {previewQuiz && (
            <div className="space-y-4 mt-2">
              <div>
                <h2 className="text-lg font-bold">{previewQuiz.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{previewQuiz.skill_name}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Pass: {previewQuiz.passing_score}% · {previewQuiz.questions.length} questions
                  </span>
                </div>
                {previewQuiz.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {previewQuiz.description}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {previewQuiz.questions.map((q, qi) => (
                  <Card key={qi} className="p-4">
                    <p className="font-medium text-sm mb-2">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                            q.correct === oi
                              ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
                              : "bg-muted/30"
                          }`}
                        >
                          {q.correct === oi ? (
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-muted-foreground/30 shrink-0" />
                          )}
                          {opt}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewQuiz(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewQuiz) openEdit(previewQuiz);
                setPreviewQuiz(null);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Delete Confirmation ═══════════ */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quiz</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This will also
            remove all student attempt records ({attemptCounts[deleteTarget?.id || ""] || 0} attempts)
            for this quiz. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ═══════════ Template Guide Dialog ═══════════ */}
      <Dialog open={showTemplateGuide} onOpenChange={setShowTemplateGuide}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Quiz Import Template Guide
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-muted/50 p-4 rounded-lg border border-dashed border-border">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Visual Map: CSV to Student View
              </h3>
              
              {/* Mock Student View */}
              <div className="space-y-4 max-w-md mx-auto bg-background p-6 rounded-xl border shadow-sm">
                <div className="space-y-1">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    {"{skill_name}"}
                  </Badge>
                  <h2 className="text-xl font-bold">{"{quiz_title}"}</h2>
                  <p className="text-xs text-muted-foreground">{"{description}"}</p>
                </div>
                
                <Card className="p-4 border-primary/20 bg-primary/5">
                  <p className="font-semibold text-sm mb-3">1. {"{question}"}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded bg-background border text-xs">
                      <div className="w-3 h-3 rounded-full border border-primary bg-primary shrink-0" />
                      {"{option1}"} <span className="text-[10px] text-muted-foreground ml-auto">(if correct_option_index is 0)</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-background border text-xs">
                      <div className="w-3 h-3 rounded-full border shrink-0" />
                      {"{option2}"}
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-background border text-xs opacity-60">
                      <div className="w-3 h-3 rounded-full border shrink-0" />
                      {"{option3}"}
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">CSV Column Definitions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 border rounded bg-muted/30">
                  <p className="font-bold text-primary">quiz_title</p>
                  <p className="text-muted-foreground">The name of the quiz. Questions with the same title are grouped into one quiz.</p>
                </div>
                <div className="p-3 border rounded bg-muted/30">
                  <p className="font-bold text-primary">skill_name</p>
                  <p className="text-muted-foreground">The skill tag (e.g., React, UI Design).</p>
                </div>
                <div className="p-3 border rounded bg-muted/30">
                  <p className="font-bold text-primary">question</p>
                  <p className="text-muted-foreground">The actual text of the question.</p>
                </div>
                <div className="p-3 border rounded bg-muted/30">
                  <p className="font-bold text-primary">correct_option_index</p>
                  <p className="text-muted-foreground">Which option is correct? (0 for option1, 1 for option2, etc.)</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg text-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">CSV Data Example (One Row)</p>
              <code className="text-xs break-all block">
                quiz_title,skill_name,description,passing_score,question,option1,option2,option3,option4,correct_option_index
              </code>
              <code className="text-xs break-all block mt-1 text-primary">
                Final Exam,React,Test your React skills,70,What is Vite?,A bundler,A framework,A hook,A state,0
              </code>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowTemplateGuide(false)}>
              Close
            </Button>
            <Button onClick={() => {
              downloadTemplate();
              setShowTemplateGuide(false);
            }}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
