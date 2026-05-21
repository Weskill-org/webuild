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
interface ExamSection {
  id: string;
  name: string;
  description?: string;
  positive_marks: number;
  negative_marks: number;
  question_type: "single_choice" | "multiple_choice" | "numerical";
}

interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correct: number | number[] | string; // index for single, array of indices for multiple, string for numerical
  type: "single_choice" | "multiple_choice" | "numerical";
  section_id: string;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  skill_name: string;
  description: string | null;
  questions: QuizQuestion[];
  passing_score: number;
  duration: number;
  instructions: string | null;
  difficulty: string;
  total_marks: number;
  sections: ExamSection[];
  created_at: string | null;
}

interface QuizForm {
  title: string;
  skill_name: string;
  description: string;
  passing_score: number;
  duration: number;
  instructions: string;
  difficulty: string;
  total_marks: number;
  sections: ExamSection[];
  questions: QuizQuestion[];
}

const DEFAULT_SECTION = (id: string = "sec-1"): ExamSection => ({
  id,
  name: "Section A",
  description: "",
  positive_marks: 4,
  negative_marks: -1,
  question_type: "single_choice",
});

const defaultForm = (): QuizForm => {
  const defaultSec = DEFAULT_SECTION();
  return {
    title: "",
    skill_name: "",
    description: "",
    passing_score: 70,
    duration: 180,
    instructions: "1. The exam contains sections for each subject.\n2. Marking scheme is section-specific.\n3. Make sure to save each answer before proceeding.",
    difficulty: "Medium",
    total_marks: 0,
    sections: [defaultSec],
    questions: [
      {
        question: "",
        options: ["", "", "", ""],
        correct: 0,
        type: "single_choice",
        section_id: defaultSec.id,
        explanation: "",
      },
    ],
  };
};

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
    try {
      const [quizRes, badgeRes] = await Promise.all([
        supabase.from("skill_quizzes").select("*").order("created_at", { ascending: false }),
        supabase.from("skill_badges").select("quiz_id"),
      ]);
      const raw = (quizRes.data ?? []) as any[];
      setQuizzes(
        raw.map((q) => {
          const rawSections = Array.isArray(q.sections) ? (q.sections as ExamSection[]) : [];
          const defaultSec = DEFAULT_SECTION();
          const sections = rawSections.length > 0 ? rawSections : [defaultSec];
          
          const rawQuestions = Array.isArray(q.questions) ? (q.questions as any[]) : [];
          const processedQuestions = rawQuestions.map((question) => {
            const type = question.type || "single_choice";
            const section_id = question.section_id || sections[0].id;
            return {
              question: question.question || "",
              options: Array.isArray(question.options) ? question.options : ["", "", "", ""],
              correct: question.correct !== undefined ? question.correct : 0,
              type,
              section_id,
              explanation: question.explanation || "",
            };
          });

          return {
            id: q.id,
            title: q.title || "",
            skill_name: q.skill_name || "",
            description: q.description || "",
            questions: processedQuestions,
            passing_score: q.passing_score ?? 70,
            duration: q.duration ?? 180,
            instructions: q.instructions || "",
            difficulty: q.difficulty || "Medium",
            total_marks: q.total_marks ?? 0,
            sections,
            created_at: q.created_at,
          };
        })
      );

      const counts: Record<string, number> = {};
      (badgeRes.data ?? []).forEach((b: any) => {
        counts[b.quiz_id] = (counts[b.quiz_id] || 0) + 1;
      });
      setAttemptCounts(counts);
    } catch (err: any) {
      toast({ title: "Fetch Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
      duration: quiz.duration ?? 180,
      instructions: quiz.instructions || "",
      difficulty: quiz.difficulty || "Medium",
      total_marks: quiz.total_marks ?? 0,
      sections: quiz.sections.map((s) => ({ ...s })),
      questions: quiz.questions.map((q) => ({
        ...q,
        options: [...q.options],
        correct: Array.isArray(q.correct) ? [...q.correct] : q.correct,
      })),
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
      duration: quiz.duration ?? 180,
      instructions: quiz.instructions || "",
      difficulty: quiz.difficulty || "Medium",
      total_marks: quiz.total_marks ?? 0,
      sections: quiz.sections.map((s) => ({ ...s })),
      questions: quiz.questions.map((q) => ({
        ...q,
        options: [...q.options],
        correct: Array.isArray(q.correct) ? [...q.correct] : q.correct,
      })),
    });
    setShowEditor(true);
  };

  /* ───────── section helpers ───────── */
  const addSection = () => {
    const newId = `sec-${Date.now()}`;
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, DEFAULT_SECTION(newId)],
    }));
  };

  const removeSection = (secId: string) => {
    if (form.sections.length <= 1) {
      toast({ title: "Validation Error", description: "You must have at least one section.", variant: "destructive" });
      return;
    }
    setForm((prev) => {
      const remainingSections = prev.sections.filter((s) => s.id !== secId);
      const fallbackSecId = remainingSections[0].id;
      const updatedQuestions = prev.questions.map((q) =>
        q.section_id === secId ? { ...q, section_id: fallbackSecId } : q
      );
      return {
        ...prev,
        sections: remainingSections,
        questions: updatedQuestions,
      };
    });
  };

  const updateSection = (secId: string, patch: Partial<ExamSection>) => {
    setForm((prev) => {
      const updatedSections = prev.sections.map((s) => (s.id === secId ? { ...s, ...patch } : s));
      
      // Auto-update question type of questions in this section if question_type changed
      let updatedQuestions = prev.questions;
      if (patch.question_type) {
        updatedQuestions = prev.questions.map((q) => {
          if (q.section_id === secId) {
            // reset correct answers when type changes to prevent data inconsistency
            let newCorrect: any = 0;
            if (patch.question_type === "multiple_choice") newCorrect = [0];
            else if (patch.question_type === "numerical") newCorrect = "0";

            return {
              ...q,
              type: patch.question_type,
              correct: newCorrect,
              options: patch.question_type === "numerical" ? [] : ["", "", "", ""],
            };
          }
          return q;
        });
      }

      return {
        ...prev,
        sections: updatedSections,
        questions: updatedQuestions,
      };
    });
  };

  /* ───────── question helpers ───────── */
  const updateQuestion = (qi: number, patch: Partial<QuizQuestion>) => {
    setForm((prev) => {
      const updatedQuestions = prev.questions.map((q, i) => {
        if (i === qi) {
          const nextQ = { ...q, ...patch };
          // If section was changed, automatically update type of question to match section's default type
          if (patch.section_id) {
            const targetSection = prev.sections.find((s) => s.id === patch.section_id);
            if (targetSection && targetSection.question_type !== q.type) {
              nextQ.type = targetSection.question_type;
              if (targetSection.question_type === "multiple_choice") nextQ.correct = [0];
              else if (targetSection.question_type === "numerical") nextQ.correct = "0";
              else nextQ.correct = 0;

              nextQ.options = targetSection.question_type === "numerical" ? [] : ["", "", "", ""];
            }
          }
          return nextQ;
        }
        return q;
      });
      return { ...prev, questions: updatedQuestions };
    });
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
    const defaultSecId = form.sections[0]?.id || "sec-1";
    const defaultSec = form.sections.find(s => s.id === defaultSecId);
    const type = defaultSec ? defaultSec.question_type : "single_choice";
    
    let correct: any = 0;
    if (type === "multiple_choice") correct = [0];
    else if (type === "numerical") correct = "0";

    setForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: "",
          options: type === "numerical" ? [] : ["", "", "", ""],
          correct,
          type,
          section_id: defaultSecId,
          explanation: "",
        },
      ],
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
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, i) => {
        if (i !== qi) return question;
        const newOpts = question.options.filter((_, j) => j !== oi);
        let nextCorrect = question.correct;
        
        if (question.type === "multiple_choice" && Array.isArray(question.correct)) {
          // Adjust indices for multi choice correct answer list
          nextCorrect = question.correct
            .map((cIndex) => {
              if (cIndex === oi) return -1;
              if (cIndex > oi) return cIndex - 1;
              return cIndex;
            })
            .filter((cIndex) => cIndex >= 0);
          if (nextCorrect.length === 0) nextCorrect = [0];
        } else if (typeof question.correct === "number") {
          if (question.correct === oi) nextCorrect = 0;
          else if (question.correct > oi) nextCorrect = question.correct - 1;
        }

        return {
          ...question,
          options: newOpts,
          correct: nextCorrect,
        };
      }),
    }));
  };

  const toggleMultiCorrect = (qi: number, oi: number) => {
    const q = form.questions[qi];
    const currentCorrect = Array.isArray(q.correct) ? q.correct : [0];
    let nextCorrect: number[];
    if (currentCorrect.includes(oi)) {
      nextCorrect = currentCorrect.filter((c) => c !== oi);
      if (nextCorrect.length === 0) nextCorrect = [oi]; // Maintain at least one selection
    } else {
      nextCorrect = [...currentCorrect, oi].sort();
    }
    updateQuestion(qi, { correct: nextCorrect });
  };

  /* ───────── save ───────── */
  const validate = (): string | null => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.skill_name.trim()) return "Skill name is required.";
    if (form.passing_score < 1 || form.passing_score > 100) return "Passing score must be 1-100.";
    if (form.duration < 1) return "Duration must be at least 1 minute.";
    if (form.sections.length === 0) return "At least one section is required.";
    
    // Validate Sections
    for (let i = 0; i < form.sections.length; i++) {
      const sec = form.sections[i];
      if (!sec.name.trim()) return `Section ${i + 1} must have a name.`;
      if (sec.positive_marks <= 0) return `Section "${sec.name}" positive marks must be greater than 0.`;
    }

    if (form.questions.length === 0) return "At least one question is required.";
    
    // Validate Questions
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.question.trim()) return `Question ${i + 1} text is empty.`;
      
      const associatedSec = form.sections.find(s => s.id === q.section_id);
      if (!associatedSec) return `Question ${i + 1} has an invalid or unassigned section.`;

      if (q.type !== "numerical") {
        if (q.options.length < 2) return `Question ${i + 1} must have at least 2 options.`;
        if (q.options.some((o) => !o.trim())) return `Question ${i + 1} has empty options.`;
      }

      if (q.type === "single_choice") {
        const correctIndex = Number(q.correct);
        if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= q.options.length) {
          return `Question ${i + 1} has an invalid correct option index.`;
        }
      } else if (q.type === "multiple_choice") {
        if (!Array.isArray(q.correct) || q.correct.length === 0) {
          return `Question ${i + 1} must have at least one correct option checked.`;
        }
        for (const idx of q.correct) {
          if (idx < 0 || idx >= q.options.length) {
            return `Question ${i + 1} correct option index ${idx} is invalid.`;
          }
        }
      } else if (q.type === "numerical") {
        if (q.correct === undefined || q.correct === null || String(q.correct).trim() === "") {
          return `Question ${i + 1} must specify a correct numerical value.`;
        }
      }
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

    // Calculate total marks based on positive marks of each question's section
    const calculatedTotalMarks = form.questions.reduce((sum, q) => {
      const sec = form.sections.find((s) => s.id === q.section_id);
      return sum + (sec ? Number(sec.positive_marks) : 4);
    }, 0);

    const payload = {
      title: form.title.trim(),
      skill_name: form.skill_name.trim(),
      description: form.description.trim() || null,
      passing_score: form.passing_score,
      duration: form.duration,
      instructions: form.instructions.trim() || null,
      difficulty: form.difficulty,
      total_marks: calculatedTotalMarks,
      sections: form.sections as any,
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
    try {
      // Delete related attempts first to prevent key constraint error
      await supabase.from("quiz_attempts").delete().eq("quiz_id", deleteTarget.id);
      // Delete related badges
      await supabase.from("skill_badges").delete().eq("quiz_id", deleteTarget.id);
      
      const { error } = await supabase.from("skill_quizzes").delete().eq("id", deleteTarget.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Quiz deleted successfully" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
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
                duration: parseInt(row.duration) || 180,
                difficulty: row.difficulty?.trim() || "Medium",
                instructions: row.instructions?.trim() || "1. All questions are compulsory.",
                sections: [],
                questions: []
              };
            }

            const qMap = quizzesMap[title];
            
            // Section parsing
            const secName = row.section_name?.trim() || "Section A";
            const secType = row.question_type?.trim() || "single_choice";
            const posMarks = parseInt(row.positive_marks) || 4;
            const negMarks = parseInt(row.negative_marks) !== undefined ? parseInt(row.negative_marks) : -1;
            
            let section = qMap.sections.find((s: any) => s.name === secName);
            if (!section) {
              const secId = `sec-${qMap.sections.length + 1}-${Date.now()}`;
              section = {
                id: secId,
                name: secName,
                description: "",
                positive_marks: posMarks,
                negative_marks: negMarks,
                question_type: secType
              };
              qMap.sections.push(section);
            }
            
            // Options parsing
            const options = [];
            if (row.option1?.trim()) options.push(row.option1.trim());
            if (row.option2?.trim()) options.push(row.option2.trim());
            if (row.option3?.trim()) options.push(row.option3.trim());
            if (row.option4?.trim()) options.push(row.option4.trim());
            if (row.option5?.trim()) options.push(row.option5.trim());
            if (row.option6?.trim()) options.push(row.option6.trim());
            
            // Correct Answer parsing
            let correct: any = 0;
            if (secType === "multiple_choice") {
              const rawCorrect = row.correct_answer || row.correct_option_index || "0";
              correct = String(rawCorrect).split(",").map(val => parseInt(val.trim())).filter(val => !isNaN(val));
            } else if (secType === "numerical") {
              correct = String(row.correct_answer || row.correct_option_index || "0").trim();
            } else {
              correct = parseInt(row.correct_answer || row.correct_option_index || "0") || 0;
            }
            
            qMap.questions.push({
              question: row.question?.trim() || "Untitled Question",
              options: secType !== "numerical" ? (options.length >= 2 ? options : ["Option 1", "Option 2"]) : [],
              correct: correct,
              type: secType,
              section_id: section.id,
              explanation: row.explanation?.trim() || ""
            });
          }
          
          const quizzesToInsert = Object.values(quizzesMap);
          if (quizzesToInsert.length === 0) {
            toast({ title: "No valid quizzes found in CSV", variant: "destructive" });
            return;
          }

          // Calculate total marks for each quiz
          for (const qMap of quizzesToInsert) {
            qMap.total_marks = qMap.questions.reduce((sum: number, q: any) => {
              const sec = qMap.sections.find((s: any) => s.id === q.section_id);
              return sum + (sec ? sec.positive_marks : 4);
            }, 0);
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
          toast({ title: "Import Error", description: "Invalid CSV format or values", variant: "destructive" });
        }
        e.target.value = '';
      }
    });
  };

  const downloadTemplate = () => {
    const headers = "quiz_title,skill_name,description,passing_score,duration,difficulty,instructions,section_name,question_type,positive_marks,negative_marks,question,option1,option2,option3,option4,correct_answer,explanation\n";
    const row1 = '"Practice Test","Physics","Physics Practice Exam",50,180,"Hard","1. Candidates must solve all questions.","Physics Single Correct","single_choice",4,-1,"What is the unit of angular momentum?","kg m/s","kg m^2/s","kg m^2/s^2","kg/m s",1,"Angular momentum L = r x p = kg m^2/s"\n';
    const row2 = '"Practice Test","Physics","Physics Practice Exam",50,180,"Hard","1. Candidates must solve all questions.","Physics Numerical","numerical",4,0,"If acceleration of object is 2 m/s^2, what distance does it cover in 5s starting from rest?",,,,,"25","s = ut + 0.5 a t^2 = 0 + 0.5 * 2 * 25 = 25m"\n';
    
    const blob = new Blob([headers + row1 + row2], { type: "text/csv;charset=utf-8;" });
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
            Create and manage exam portal assessments for students
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
                  <TableHead>Skill Tag</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">Duration</TableHead>
                  <TableHead className="text-center">Total Marks</TableHead>
                  <TableHead className="text-center">Difficulty</TableHead>
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
                    <TableCell className="text-center text-sm">
                      {quiz.duration} mins
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold text-primary">
                      {quiz.total_marks}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      <Badge className={
                        quiz.difficulty === "Easy" ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" :
                        quiz.difficulty === "Hard" ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20" :
                        "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                      } variant="outline">
                        {quiz.difficulty}
                      </Badge>
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              {editing ? "Edit Exam Quiz" : "Create New Exam Quiz"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Exam Details</TabsTrigger>
              <TabsTrigger value="sections">Sections ({form.sections.length})</TabsTrigger>
              <TabsTrigger value="questions">Questions ({form.questions.length})</TabsTrigger>
            </TabsList>

            {/* ── Details Tab ── */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Exam Name *</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Skill Mock Test 1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Skill Tag *</label>
                  <Input
                    value={form.skill_name}
                    onChange={(e) => setForm({ ...form, skill_name: e.target.value })}
                    placeholder="e.g. Physics, Chemistry, React"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (Minutes) *</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 180 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty Level *</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Passing Score (%)</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.passing_score}
                    onChange={(e) => setForm({ ...form, passing_score: parseInt(e.target.value) || 50 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the exam..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Exam Instructions (shown before start) *</label>
                <Textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Detailed instructions for candidate..."
                  rows={4}
                />
              </div>
            </TabsContent>

            {/* ── Sections Tab ── */}
            <TabsContent value="sections" className="space-y-4 mt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">Define the sections/subjects of the exam (e.g. Physics Single Choice, Physics Numerical).</p>
                <Button size="sm" onClick={addSection}>
                  <Plus className="w-4 h-4 mr-1" /> Add Section
                </Button>
              </div>

              <div className="space-y-4">
                {form.sections.map((sec, index) => (
                  <Card key={sec.id} className="p-4 space-y-3 relative border-border/60">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-primary">Section {index + 1}</span>
                      {form.sections.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => removeSection(sec.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1 col-span-1 md:col-span-2">
                        <label className="text-xs font-medium">Section Name *</label>
                        <Input
                          value={sec.name}
                          onChange={(e) => updateSection(sec.id, { name: e.target.value })}
                          placeholder="e.g. Physics - Section A"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Question Type</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={sec.question_type}
                          onChange={(e) => updateSection(sec.id, { question_type: e.target.value as any })}
                        >
                          <option value="single_choice">Single Choice (Radio)</option>
                          <option value="multiple_choice">Multiple Choice (Checkbox)</option>
                          <option value="numerical">Numerical Value</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Correct Marks</label>
                          <Input
                            type="number"
                            value={sec.positive_marks}
                            onChange={(e) => updateSection(sec.id, { positive_marks: parseInt(e.target.value) || 4 })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Negative Marks</label>
                          <Input
                            type="number"
                            value={sec.negative_marks}
                            onChange={(e) => updateSection(sec.id, { negative_marks: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Description (Optional)</label>
                      <Input
                        value={sec.description || ""}
                        onChange={(e) => updateSection(sec.id, { description: e.target.value })}
                        placeholder="Section guidelines, e.g. Answer any 5 out of 10 questions"
                      />
                    </div>
                  </Card>
                ))}
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
                    
                    {/* Section Assignment Dropdown */}
                    <div className="flex items-center gap-2 mr-4">
                      <span className="text-xs font-medium text-muted-foreground">Section:</span>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none"
                        value={q.section_id}
                        onChange={(e) => updateQuestion(qi, { section_id: e.target.value })}
                      >
                        {form.sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

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

                  {/* Single Choice Selection */}
                  {q.type === "single_choice" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Options (select correct option radio button)
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
                  )}

                  {/* Multiple Choice Selection */}
                  {q.type === "multiple_choice" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Options (select ALL correct option checkboxes)
                      </label>
                      {q.options.map((opt, oi) => {
                        const correctList = Array.isArray(q.correct) ? q.correct : [];
                        const isCorrect = correctList.includes(oi);
                        return (
                          <div key={oi} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleMultiCorrect(qi, oi)}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isCorrect
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/30 hover:border-primary/50"
                              }`}
                            >
                              {isCorrect && <CheckCircle className="w-4 h-4" />}
                            </button>
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(qi, oi, e.target.value)}
                              placeholder={`Option ${oi + 1}`}
                              className={`flex-1 text-sm ${
                                isCorrect ? "border-primary/40 bg-primary/5" : ""
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
                        );
                      })}
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
                  )}

                  {/* Numerical Selection */}
                  {q.type === "numerical" && (
                    <div className="space-y-2 max-w-sm">
                      <label className="text-xs font-medium text-muted-foreground">
                        Correct Numerical Value *
                      </label>
                      <Input
                        value={String(q.correct)}
                        onChange={(e) => updateQuestion(qi, { correct: e.target.value })}
                        placeholder="e.g. 25.5 or -5"
                      />
                      <p className="text-[10px] text-muted-foreground">No options needed. Students type in their numerical answer.</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Explanation / Solution Reference</label>
                    <Input
                      value={q.explanation || ""}
                      onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                      placeholder="Add hints/explanation for detailed result analysis..."
                    />
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
              {editing ? "Update Exam Quiz" : "Create Exam Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Preview Dialog ═══════════ */}
      <Dialog open={!!previewQuiz} onOpenChange={() => setPreviewQuiz(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Exam Quiz Preview
            </DialogTitle>
          </DialogHeader>
          {previewQuiz && (
            <div className="space-y-5 mt-2">
              <div>
                <h2 className="text-lg font-bold">{previewQuiz.title}</h2>
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <Badge variant="outline">{previewQuiz.skill_name}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Pass: {previewQuiz.passing_score}% · {previewQuiz.questions.length} questions
                  </span>
                  <span className="text-xs text-muted-foreground">· Duration: {previewQuiz.duration} mins</span>
                  <span className="text-xs text-muted-foreground font-semibold text-primary">· Max Marks: {previewQuiz.total_marks}</span>
                </div>
                {previewQuiz.description && (
                  <p className="text-sm text-muted-foreground mt-2 bg-muted/30 p-2.5 rounded-lg border">
                    {previewQuiz.description}
                  </p>
                )}
              </div>

              {/* Group Questions by Section */}
              <div className="space-y-6">
                {previewQuiz.sections.map((section, sIndex) => {
                  const sectionQuestions = previewQuiz.questions.filter(q => q.section_id === section.id);
                  if (sectionQuestions.length === 0) return null;
                  return (
                    <div key={section.id} className="space-y-3">
                      <div className="border-b pb-1.5 flex justify-between items-center">
                        <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                          <Badge variant="secondary" className="rounded-md">Sec {sIndex + 1}</Badge>
                          {section.name}
                        </h3>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Scheme: <strong className="text-green-600 font-medium">+{section.positive_marks}</strong> / <strong className="text-red-500 font-medium">{section.negative_marks}</strong></span>
                          <span>Type: <strong className="capitalize">{section.question_type.replace("_", " ")}</strong></span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {sectionQuestions.map((q, qi) => {
                          const originalIndex = previewQuiz.questions.findIndex(x => x === q);
                          return (
                            <Card key={qi} className="p-4">
                              <p className="font-medium text-sm mb-2">
                                Q{originalIndex + 1}. {q.question}
                              </p>
                              
                              {q.type === "numerical" ? (
                                <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-700 dark:text-green-400">
                                  Correct numerical value: {String(q.correct)}
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {q.options.map((opt, oi) => {
                                    const isCorrect = q.type === "multiple_choice" 
                                      ? (Array.isArray(q.correct) && q.correct.includes(oi))
                                      : q.correct === oi;
                                    return (
                                      <div
                                        key={oi}
                                        className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                                          isCorrect
                                            ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
                                            : "bg-muted/30"
                                        }`}
                                      >
                                        {isCorrect ? (
                                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full border border-muted-foreground/30 shrink-0" />
                                        )}
                                        {opt}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {q.explanation && (
                                <p className="text-xs text-muted-foreground mt-2 border-t pt-2 italic">
                                  <strong>Solution:</strong> {q.explanation}
                                </p>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
              Quiz Import CSV Template Guide
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
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Section: {"{section_name}"}</span>
                    <span>Scheme: +{"{positive_marks}"} / {"{negative_marks}"}</span>
                  </div>
                  <p className="font-semibold text-sm mb-3">1. {"{question}"}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded bg-background border text-xs">
                      <div className="w-3 h-3 rounded-full border border-primary bg-primary shrink-0" />
                      {"{option1}"} <span className="text-[10px] text-muted-foreground ml-auto">(if correct_answer matches option index)</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-background border text-xs">
                      <div className="w-3 h-3 rounded-full border shrink-0" />
                      {"{option2}"}
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
                  <p className="text-muted-foreground">Name of the quiz. Questions sharing a title are grouped into one exam.</p>
                </div>
                <div className="p-3 border rounded bg-muted/30">
                  <p className="font-bold text-primary">section_name</p>
                  <p className="text-muted-foreground">Section e.g. "Physics Sec A" or "Maths Numericals".</p>
                </div>
                <div className="p-3 border rounded bg-muted/30">
                  <p className="font-bold text-primary">question_type</p>
                  <p className="text-muted-foreground">Must be: `single_choice`, `multiple_choice`, or `numerical`.</p>
                </div>
                <div className="p-3 border rounded bg-muted/30">
                  <p className="font-bold text-primary">correct_answer</p>
                  <p className="text-muted-foreground">Option index for single (0), comma-separated list for multiple (0,2), or number string for numerical (25.5).</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg text-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">CSV Column headers layout</p>
              <code className="text-[11px] break-all block text-amber-400">
                quiz_title,skill_name,description,passing_score,duration,difficulty,instructions,section_name,question_type,positive_marks,negative_marks,question,option1,option2,option3,option4,correct_answer,explanation
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
