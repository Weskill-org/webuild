import { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, CheckCircle, XCircle, AlertCircle, Award, ShieldCheck, Trophy, 
  TrendingUp, Users, Star, X, Timer, ChevronLeft, ChevronRight, Bookmark,
  Info, FileText, Check, HelpCircle, History, ArrowLeft, RefreshCw, Play,
  Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";
import useRealtime from "@/hooks/use-realtime";

/* ───────────────── Interfaces ───────────────── */
interface ExamSection {
  id: string;
  name: string;
  description?: string;
  positive_marks: number;
  negative_marks: number;
  question_type: "single_choice" | "multiple_choice" | "numerical";
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number | number[] | string;
  type: "single_choice" | "multiple_choice" | "numerical";
  section_id: string;
  explanation?: string;
}

interface Quiz {
  id: string;
  skill_name: string;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
  passing_score: number;
  duration: number;
  instructions: string | null;
  difficulty: string;
  total_marks: number;
  sections: ExamSection[];
}

interface RankData {
  rank: number;
  totalAttempts: number;
}

export default function SkillQuizzes() {
  const { profile } = useAuth();
  const { wallets, walletBalance } = useRealtime();

  /* ───────────────── States ───────────────── */
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [badges, setBadges] = useState<Record<string, { passed: boolean; score: number }>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Exam Workflow States
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [examMode, setExamMode] = useState<"list" | "instructions" | "active" | "results">("list");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [tempAnswers, setTempAnswers] = useState<Record<number, any>>({});
  const [paletteStatuses, setPaletteStatuses] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [startedAt, setStartedAt] = useState<string>("");
  const [agreedToInstructions, setAgreedToInstructions] = useState(false);

  // Dialog & Progress States
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // History & Attempts
  const [userAttempts, setUserAttempts] = useState<any[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<any | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyQuiz, setHistoryQuiz] = useState<Quiz | null>(null);
  const [percentileRank, setPercentileRank] = useState<number | null>(null);

  // Badge Popup (from legacy)
  const [badgePopupQuiz, setBadgePopupQuiz] = useState<Quiz | null>(null);
  const [rankData, setRankData] = useState<RankData | null>(null);
  const [rankLoading, setRankLoading] = useState(false);

  // Timer low-time warning flags
  const [hasWarnedLowTime, setHasWarnedLowTime] = useState(false);
  const [hasWarnedCriticalTime, setHasWarnedCriticalTime] = useState(false);

  const timerRef = useRef<any>(null);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const query = searchQuery.toLowerCase().trim();
      return (
        q.title.toLowerCase().includes(query) ||
        q.skill_name.toLowerCase().includes(query) ||
        (q.description && q.description.toLowerCase().includes(query))
      );
    });
  }, [quizzes, searchQuery]);

  // Optimize palette counts calculation to avoid O(n * passes) on every tick
  const paletteCounts = useMemo(() => {
    return Object.values(paletteStatuses).reduce(
      (acc, status) => {
        if (status === "answered") acc.answered++;
        else if (status === "not_answered") acc.not_answered++;
        else if (status === "marked") acc.marked++;
        else if (status === "answered_marked") acc.answered_marked++;
        else if (status === "not_visited") acc.not_visited++;
        return acc;
      },
      { answered: 0, not_answered: 0, marked: 0, answered_marked: 0, not_visited: 0 }
    );
  }, [paletteStatuses]);

  /* ───────────────── Fetching Data ───────────────── */
  const fetchAllData = async () => {
    if (!profile?.id) return;
    try {
      const [quizRes, badgeRes, attemptsRes] = await Promise.all([
        supabase.from("skill_quizzes").select("*").order("created_at", { ascending: false }),
        supabase.from("skill_badges").select("quiz_id, passed, score").eq("user_id", profile.id),
        supabase.from("quiz_attempts").select("*").eq("user_id", profile.id).order("submitted_at", { ascending: false })
      ]);

      const raw = (quizRes.data ?? []) as any[];
      const processedQuizzes: Quiz[] = raw.map((q) => {
        const rawSections = Array.isArray(q.sections) ? (q.sections as ExamSection[]) : [];
        const defaultSec: ExamSection = {
          id: "sec-1",
          name: "Section A",
          description: "",
          positive_marks: 4,
          negative_marks: -1,
          question_type: "single_choice",
        };
        const sections = rawSections.length > 0 ? rawSections : [defaultSec];
        
        const rawQuestions = Array.isArray(q.questions) ? (q.questions as any[]) : [];
        const processedQuestions: QuizQuestion[] = rawQuestions.map((question) => {
          const type = question.type || "single_choice";
          const section_id = question.section_id || sections[0].id;
          return {
            question: question.question || "",
            options: Array.isArray(question.options) ? question.options : [],
            correct: question.correct !== undefined ? question.correct : 0,
            type,
            section_id,
            explanation: question.explanation || "",
          };
        });

        const totalMaxMarks = processedQuestions.reduce((sum, question) => {
          const sec = sections.find((s) => s.id === question.section_id);
          return sum + (sec ? Number(sec.positive_marks) : 4);
        }, 0);

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
          total_marks: q.total_marks || totalMaxMarks,
          sections,
        };
      });

      setQuizzes(processedQuizzes);

      const bMap: Record<string, { passed: boolean; score: number }> = {};
      (badgeRes.data ?? []).forEach((b: any) => { 
        bMap[b.quiz_id] = { passed: b.passed, score: b.score }; 
      });
      setBadges(bMap);

      if (attemptsRes.data) {
        setUserAttempts(attemptsRes.data);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error Fetching Data", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [profile?.id]);

  const fetchAttemptsHistory = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("user_id", profile.id)
      .order("submitted_at", { ascending: false });
    if (data) {
      setUserAttempts(data);
    }
  };

  /* ───────────────── Percentile Rank ───────────────── */
  const getPercentileRank = async (quizId: string, percentage: number) => {
    try {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("percentage")
        .eq("quiz_id", quizId);
      if (!data || data.length === 0) return 100;
      
      const lowerOrEqualCount = data.filter((a: any) => Number(a.percentage) <= percentage).length;
      const totalAttempts = data.length;
      const percentile = (lowerOrEqualCount / totalAttempts) * 100;
      return Math.round(percentile * 100) / 100;
    } catch {
      return 100;
    }
  };

  useEffect(() => {
    if (activeAttempt) {
      getPercentileRank(activeAttempt.quiz_id, Number(activeAttempt.percentage)).then((val) => {
        setPercentileRank(val);
      });
    } else {
      setPercentileRank(null);
    }
  }, [activeAttempt]);

  /* ───────────────── LocalStorage Progress Handling ───────────────── */
  const saveProgressToLocalStorage = (time: number) => {
    if (!profile?.id || !activeQuiz?.id) return;
    const progress = {
      answers,
      paletteStatuses,
      activeQuestionIndex,
      timeLeft: time,
      startedAt,
    };
    localStorage.setItem(
      `jee_exam_progress_${profile.id}_${activeQuiz.id}`,
      JSON.stringify(progress)
    );
  };

  const loadProgressFromLocalStorage = (quizId: string) => {
    if (!profile?.id) return null;
    const data = localStorage.getItem(`jee_exam_progress_${profile.id}_${quizId}`);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  };

  /* ───────────────── Timer Implementation ───────────────── */
  useEffect(() => {
    if (examMode === "active" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          const nextTime = prev - 1;
          
          // Toast warnings for low time
          if (nextTime === 300 && !hasWarnedLowTime) {
            toast({ 
              variant: "destructive", 
              title: "Time Warning", 
              description: "Only 5 minutes remaining! Review and save your answers." 
            });
            setHasWarnedLowTime(true);
          }
          if (nextTime === 120 && !hasWarnedCriticalTime) {
            toast({ 
              variant: "destructive", 
              title: "Critical Time Warning", 
              description: "Less than 2 minutes left! Answers will auto-submit shortly." 
            });
            setHasWarnedCriticalTime(true);
          }

          // Auto-save progress every 10 seconds
          if (nextTime % 10 === 0) {
            saveProgressToLocalStorage(nextTime);
          }
          
          return nextTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examMode, timeLeft]);

  /* ───────────────── Anti-Cheating Event Handlers ───────────────── */
  useEffect(() => {
    if (examMode !== "active") return;

    const preventDefault = (e: Event) => {
      e.preventDefault();
      toast({
        variant: "destructive",
        title: "Action Restricted",
        description: "Right-clicking is disabled during the examination.",
      });
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        variant: "destructive",
        title: "Action Restricted",
        description: "Copying text is disabled during the examination.",
      });
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        variant: "destructive",
        title: "Action Restricted",
        description: "Cutting text is disabled during the examination.",
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Block Ctrl+C / Cmd+C
      // Block Ctrl+X / Cmd+X
      // Block Ctrl+U / Cmd+U (View Source)
      // Block Ctrl+P / Cmd+P (Print Page)
      // Block Ctrl+Shift+I / Cmd+Opt+I (Inspect)
      // Block Ctrl+Shift+J / Cmd+Opt+J (Console)
      // Block Ctrl+Shift+C / Cmd+Opt+C (Element selector)
      // Block F12 (DevTools)
      if (
        (isCmdOrCtrl && (key === "c" || key === "x" || key === "u" || key === "p")) ||
        (isCmdOrCtrl && e.shiftKey && (key === "i" || key === "j" || key === "c")) ||
        e.key === "F12"
      ) {
        e.preventDefault();
        toast({
          variant: "destructive",
          title: "Shortcut Blocked",
          description: "This keyboard shortcut is disabled during the examination.",
        });
      }
    };

    window.addEventListener("contextmenu", preventDefault);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("cut", handleCut);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("contextmenu", preventDefault);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("cut", handleCut);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [examMode]);

  /* ───────────────── Exam Control Functions ───────────────── */
  const handleQuizSelection = (quiz: Quiz) => {
    const saved = loadProgressFromLocalStorage(quiz.id);
    if (saved) {
      setActiveQuiz(quiz);
      setResumeData(saved);
      setShowResumeDialog(true);
    } else {
      // Direct first attempt or proceed to instructions (fees checked next)
      const hasTaken = badges[quiz.id];
      if (hasTaken) {
        handleRetake(quiz);
      } else {
        startQuizFresh(quiz);
      }
    }
  };

  const startQuizFresh = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setAnswers({});
    setTempAnswers({});
    const initialPalette: Record<number, string> = {};
    quiz.questions.forEach((_, i) => {
      initialPalette[i] = "not_visited";
    });
    initialPalette[0] = "not_answered"; // First question is active/visited
    setPaletteStatuses(initialPalette);
    setActiveQuestionIndex(0);
    setTimeLeft(quiz.duration * 60);
    setStartedAt(new Date().toISOString());
    setAgreedToInstructions(false);
    setHasWarnedLowTime(false);
    setHasWarnedCriticalTime(false);
    setExamMode("instructions");
  };

  const resumeExam = () => {
    if (!activeQuiz || !resumeData) return;
    setAnswers(resumeData.answers || {});
    setTempAnswers(resumeData.answers || {});
    setPaletteStatuses(resumeData.paletteStatuses || {});
    setActiveQuestionIndex(resumeData.activeQuestionIndex || 0);
    setTimeLeft(resumeData.timeLeft || activeQuiz.duration * 60);
    setStartedAt(resumeData.startedAt || new Date().toISOString());
    setShowResumeDialog(false);
    setExamMode("active");
    toast({ title: "Attempt Resumed", description: "Your exam progress has been restored." });
  };

  const startNewExamFromResume = () => {
    if (!activeQuiz) return;
    setShowResumeDialog(false);
    localStorage.removeItem(`jee_exam_progress_${profile?.id}_${activeQuiz.id}`);
    
    const hasTaken = badges[activeQuiz.id];
    if (hasTaken) {
      handleRetake(activeQuiz);
    } else {
      startQuizFresh(activeQuiz);
    }
  };

  const handleRetake = async (quiz: Quiz) => {
    if (walletBalance < 100) {
      toast({ variant: "destructive", title: "Insufficient Balance", description: "You need ₹100 to retake this exam." });
      return;
    }

    const wallet = wallets[0];
    if (!wallet) {
      toast({ variant: "destructive", title: "Wallet Not Found", description: "Could not find your wallet." });
      return;
    }

    try {
      setLoading(true);
      await supabase.from("transactions").insert({
        wallet_id: wallet.id,
        type: "debit",
        amount: 100,
        description: `Retake fee for ${quiz.skill_name} quiz`,
      });
      await supabase.from("wallets").update({
        balance: walletBalance - 100,
      }).eq("id", wallet.id);

      toast({ title: "₹100 Deducted", description: "Retake fee paid from wallet." });
      startQuizFresh(quiz);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to process retake fee." });
    } finally {
      setLoading(false);
    }
  };

  const startExamActive = () => {
    if (!agreedToInstructions) return;
    setExamMode("active");
  };

  const handleAutoSubmit = () => {
    toast({ variant: "destructive", title: "Time Expired!", description: "Your exam is being automatically submitted." });
    submitExam();
  };

  const submitExam = async (overrideAnswers?: Record<number, any>) => {
    if (!activeQuiz || !profile) return;
    setSaving(true);

    const finalAnswers = overrideAnswers || { ...answers };
    // Auto-commit the current tempAnswer if there is one to prevent losing student work
    if (!overrideAnswers && tempAnswers[activeQuestionIndex] !== undefined) {
      finalAnswers[activeQuestionIndex] = tempAnswers[activeQuestionIndex];
    }

    const totalMaxMarks = activeQuiz.questions.reduce((sum, q) => {
      const sec = activeQuiz.sections.find((s) => s.id === q.section_id);
      return sum + (sec ? Number(sec.positive_marks) : 4);
    }, 0);

    let totalMarksObtained = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    const sectionScores: Record<string, {
      name: string;
      score: number;
      correct: number;
      wrong: number;
      unattempted: number;
      totalQuestions: number;
    }> = {};

    activeQuiz.sections.forEach((sec) => {
      sectionScores[sec.id] = {
        name: sec.name,
        score: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        totalQuestions: 0,
      };
    });

    activeQuiz.questions.forEach((q, idx) => {
      const sec = activeQuiz.sections.find((s) => s.id === q.section_id) || activeQuiz.sections[0];
      const secScore = sectionScores[sec.id];
      secScore.totalQuestions += 1;

      const ans = finalAnswers[idx];
      const correct = q.correct;
      const isUnattempted = (ans === undefined || ans === null || ans === "" || (Array.isArray(ans) && ans.length === 0));

      if (isUnattempted) {
        unattemptedCount += 1;
        secScore.unattempted += 1;
      } else {
        let isCorrect = false;
        if (q.type === "single_choice") {
          isCorrect = Number(ans) === Number(correct);
        } else if (q.type === "multiple_choice") {
          const studentArr = Array.isArray(ans) ? (ans as number[]).sort() : [];
          const correctArr = Array.isArray(correct) ? (correct as number[]).sort() : [];
          isCorrect = studentArr.length === correctArr.length && studentArr.every((val, i) => val === correctArr[i]);
        } else if (q.type === "numerical") {
          const sVal = String(ans).trim();
          const cVal = String(correct).trim();
          const sFloat = parseFloat(sVal);
          const cFloat = parseFloat(cVal);
          isCorrect = (!isNaN(sFloat) && !isNaN(cFloat)) ? (sFloat === cFloat) : (sVal === cVal);
        }

        if (isCorrect) {
          correctCount += 1;
          secScore.correct += 1;
          secScore.score += sec.positive_marks;
          totalMarksObtained += sec.positive_marks;
        } else {
          wrongCount += 1;
          secScore.wrong += 1;
          secScore.score += sec.negative_marks;
          totalMarksObtained += sec.negative_marks;
        }
      }
    });

    const percentage = Number(((totalMarksObtained / totalMaxMarks) * 100).toFixed(2));
    const passed = percentage >= activeQuiz.passing_score;
    const performanceSummary = `Scored ${totalMarksObtained}/${totalMaxMarks} (${percentage}%). Correct: ${correctCount}, Wrong: ${wrongCount}, Skipped: ${unattemptedCount}.`;

    try {
      // 1. Log attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from("quiz_attempts")
        .insert({
          user_id: profile.id,
          quiz_id: activeQuiz.id,
          started_at: startedAt,
          submitted_at: new Date().toISOString(),
          score: totalMarksObtained,
          total_marks: totalMaxMarks,
          percentage,
          passed,
          section_scores: sectionScores as any,
          answers: finalAnswers as any,
          correct_answers_count: correctCount,
          wrong_answers_count: wrongCount,
          unattempted_answers_count: unattemptedCount,
          performance_summary: performanceSummary,
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // 2. Update legacy badge
      const previousBadge = badges[activeQuiz.id];
      const highestPercent = previousBadge ? Math.max(previousBadge.score, percentage) : percentage;
      const badgePassed = highestPercent >= activeQuiz.passing_score;

      const { error: badgeError } = await supabase.from("skill_badges").upsert({
        user_id: profile.id,
        quiz_id: activeQuiz.id,
        skill_name: activeQuiz.skill_name,
        score: Math.round(highestPercent),
        passed: badgePassed,
      });

      if (badgeError) throw badgeError;

      // 3. Clear localStorage
      localStorage.removeItem(`jee_exam_progress_${profile.id}_${activeQuiz.id}`);

      // 4. Update state
      setBadges((prev) => ({
        ...prev,
        [activeQuiz.id]: { passed: badgePassed, score: Math.round(highestPercent) },
      }));

      await fetchAttemptsHistory();
      setActiveAttempt(attemptData);
      setExamMode("results");
      toast({ title: passed ? "Exam Passed! 🎉" : "Exam Completed", description: performanceSummary });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission Error", description: err.message || "Failed to submit exam." });
    } finally {
      setSaving(false);
      setShowSubmitConfirm(false);
    }
  };

  /* ───────────────── Navigation & Palette Actions ───────────────── */
  const handleSaveAndNext = () => {
    if (!activeQuiz) return;
    const currentTemp = tempAnswers[activeQuestionIndex];
    const isAnswered = (currentTemp !== undefined && currentTemp !== null && currentTemp !== "" && (!Array.isArray(currentTemp) || currentTemp.length > 0));

    // Save answer
    setAnswers((prev) => ({ ...prev, [activeQuestionIndex]: currentTemp }));
    
    // Update Palette
    setPaletteStatuses((prev) => ({
      ...prev,
      [activeQuestionIndex]: isAnswered ? "answered" : "not_answered",
    }));

    if (activeQuestionIndex < activeQuiz.questions.length - 1) {
      const nextIndex = activeQuestionIndex + 1;
      setActiveQuestionIndex(nextIndex);
      
      // Update next question's status to not_answered if it was not_visited
      if (paletteStatuses[nextIndex] === "not_visited") {
        setPaletteStatuses((prev) => ({ ...prev, [nextIndex]: "not_answered" }));
      }
    } else {
      toast({ title: "End of Exam", description: "You are on the last question. You can review your answers or submit." });
    }

    // Save progress to local storage
    setTimeout(() => saveProgressToLocalStorage(timeLeft), 100);
  };

  const handleMarkForReviewAndNext = () => {
    if (!activeQuiz) return;
    const currentTemp = tempAnswers[activeQuestionIndex];
    const isAnswered = (currentTemp !== undefined && currentTemp !== null && currentTemp !== "" && (!Array.isArray(currentTemp) || currentTemp.length > 0));

    // Save answer
    setAnswers((prev) => ({ ...prev, [activeQuestionIndex]: currentTemp }));

    // Update Palette
    setPaletteStatuses((prev) => ({
      ...prev,
      [activeQuestionIndex]: isAnswered ? "answered_marked" : "marked",
    }));

    if (activeQuestionIndex < activeQuiz.questions.length - 1) {
      const nextIndex = activeQuestionIndex + 1;
      setActiveQuestionIndex(nextIndex);
      
      if (paletteStatuses[nextIndex] === "not_visited") {
        setPaletteStatuses((prev) => ({ ...prev, [nextIndex]: "not_answered" }));
      }
    } else {
      toast({ title: "End of Exam", description: "You are on the last question. You can review your answers or submit." });
    }

    setTimeout(() => saveProgressToLocalStorage(timeLeft), 100);
  };

  const handleClearResponse = () => {
    setTempAnswers((prev) => {
      const updated = { ...prev };
      delete updated[activeQuestionIndex];
      return updated;
    });

    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[activeQuestionIndex];
      return updated;
    });

    setPaletteStatuses((prev) => ({
      ...prev,
      [activeQuestionIndex]: "not_answered",
    }));

    setTimeout(() => saveProgressToLocalStorage(timeLeft), 100);
  };

  const handlePaletteClick = (idx: number) => {
    if (!activeQuiz) return;
    
    // Discard any unsaved changes to tempAnswers (restore from committed answers)
    setTempAnswers((prev) => ({
      ...prev,
      [activeQuestionIndex]: answers[activeQuestionIndex],
    }));

    // Update target question's status to not_answered if it was not_visited
    if (paletteStatuses[idx] === "not_visited") {
      setPaletteStatuses((prev) => ({
        ...prev,
        [idx]: "not_answered",
      }));
    }

    setActiveQuestionIndex(idx);
    setTimeout(() => saveProgressToLocalStorage(timeLeft), 100);
  };

  const handleSectionTabClick = (secId: string) => {
    if (!activeQuiz) return;
    // Find the first question in the selected section
    const qIndex = activeQuiz.questions.findIndex((q) => q.section_id === secId);
    if (qIndex !== -1) {
      handlePaletteClick(qIndex);
    }
  };

  /* ───────────────── Helper Formatters ───────────────── */
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getPaletteStyle = (status: string) => {
    switch (status) {
      case "answered":
        return "bg-emerald-500 text-white rounded-b-lg rounded-t-sm shadow-sm hover:bg-emerald-600";
      case "not_answered":
        return "bg-rose-500 text-white rounded-t-lg rounded-b-sm shadow-sm hover:bg-rose-600";
      case "marked":
        return "bg-indigo-600 text-white rounded-full shadow-sm hover:bg-indigo-700";
      case "answered_marked":
        return "bg-indigo-600 text-white rounded-full shadow-sm hover:bg-indigo-700 ring-2 ring-emerald-400 ring-offset-1";
      case "not_visited":
      default:
        return "bg-secondary text-secondary-foreground border border-border rounded shadow-sm hover:bg-secondary/80";
    }
  };

  const openBadgePopup = async (quiz: Quiz) => {
    setBadgePopupQuiz(quiz);
    setRankData(null);
    setRankLoading(true);

    try {
      const { data: allBadges } = await supabase
        .from("skill_badges")
        .select("user_id, score")
        .eq("quiz_id", quiz.id)
        .eq("passed", true)
        .order("score", { ascending: false });

      const entries = allBadges ?? [];
      const totalAttempts = entries.length;
      const myIndex = entries.findIndex((e: any) => e.user_id === profile?.id);
      const rank = myIndex >= 0 ? myIndex + 1 : totalAttempts;

      setRankData({ rank, totalAttempts });
    } catch {
      setRankData(null);
    } finally {
      setRankLoading(false);
    }
  };

  const getBadgeTier = (score: number) => {
    if (score >= 95) return { label: "Expert", color: "from-amber-400 via-yellow-500 to-amber-600", ring: "ring-amber-400/50", icon: "🏆", bg: "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30" };
    if (score >= 80) return { label: "Advanced", color: "from-violet-500 via-purple-500 to-indigo-600", ring: "ring-violet-400/50", icon: "⭐", bg: "bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30" };
    if (score >= 60) return { label: "Intermediate", color: "from-blue-500 via-cyan-500 to-blue-600", ring: "ring-blue-400/50", icon: "🎯", bg: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30" };
    return { label: "Beginner", color: "from-emerald-500 via-green-500 to-teal-600", ring: "ring-emerald-400/50", icon: "✅", bg: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30" };
  };

  const openAttemptsHistory = (quiz: Quiz) => {
    setHistoryQuiz(quiz);
    setHistoryDialogOpen(true);
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /* ───────────────── RENDER 1: Loading State ───────────────── */
  /* ────────────────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading assessments & attempts...</p>
        </div>
      </DashboardLayout>
    );
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  /* ───────────────── RENDER 2: Exam Instructions ───────────────── */
  /* ────────────────────────────────────────────────────────────────────────── */
  if (activeQuiz && examMode === "instructions") {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <Button variant="ghost" size="icon" onClick={() => { setActiveQuiz(null); setExamMode("list"); }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{activeQuiz.title}</h1>
              <p className="text-sm text-muted-foreground">Entrance Portal & Examination Instructions</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-3">
              <Timer className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Duration</p>
                <p className="text-lg font-bold">{activeQuiz.duration} Minutes</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <Award className="w-8 h-8 text-violet-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Marks</p>
                <p className="text-lg font-bold">{activeQuiz.total_marks} Marks</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Sections</p>
                <p className="text-lg font-bold">{activeQuiz.sections.length} Parts</p>
              </div>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" />
              General Guidelines & Marking Schemes
            </h2>
            
            <div className="text-sm text-muted-foreground space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              <div className="whitespace-pre-line leading-relaxed">
                {activeQuiz.instructions || "Please read the section marking schemes and instructions carefully."}
              </div>

              <div className="mt-4 pt-4 border-t space-y-3">
                <h3 className="font-semibold text-foreground">Section-wise Details:</h3>
                {activeQuiz.sections.map((s, idx) => (
                  <div key={s.id} className="p-3 bg-secondary/30 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{idx + 1}. {s.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        Type: {s.question_type.replace("_", " ")}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-green-600 dark:text-green-400 font-medium">Correct: +{s.positive_marks}</span>
                      <span className="text-rose-600 dark:text-rose-400 font-medium">Incorrect: {s.negative_marks}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t flex items-start gap-3">
              <input
                id="agree-checkbox"
                type="checkbox"
                checked={agreedToInstructions}
                onChange={(e) => setAgreedToInstructions(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="agree-checkbox" className="text-sm text-muted-foreground leading-tight cursor-pointer selection:bg-transparent select-none">
                I have read and understood all the instructions, guidelines, and marking policies. I understand that refreshing or leaving the exam may reset unsaved answers, and I agree to proceed in full compliance.
              </label>
            </div>
          </Card>

          <Button 
            className="w-full py-6 text-base font-semibold"
            disabled={!agreedToInstructions}
            onClick={startExamActive}
          >
            <Play className="w-5 h-5 mr-2" /> Start Examination
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  /* ───────────────── RENDER 3: Active Exam Portal ───────────────── */
  /* ────────────────────────────────────────────────────────────────────────── */
  if (activeQuiz && examMode === "active") {
    const currentQuestion = activeQuiz.questions[activeQuestionIndex];
    const currentSection = activeQuiz.sections.find((s) => s.id === currentQuestion.section_id) || activeQuiz.sections[0];
    
    // Counting for Palette Status Legend
    const counts = paletteCounts;

    const isLowTime = timeLeft <= 300;
    const isCriticalTime = timeLeft <= 120;

    return (
      <DashboardLayout>
        <div className="grid lg:grid-cols-12 gap-6 min-h-[calc(100vh-140px)] select-none">
          {/* LEFT COLUMN: Question & Selection Panel */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
            
            {/* Header Section Tabs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 bg-secondary/30 p-3 rounded-lg border">
                <span className="font-bold text-sm tracking-wide text-muted-foreground uppercase">Subjects/Sections:</span>
                <div className="flex flex-wrap gap-2">
                  {activeQuiz.sections.map((sec) => {
                    const isSecActive = currentQuestion.section_id === sec.id;
                    return (
                      <Button
                        key={sec.id}
                        variant={isSecActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSectionTabClick(sec.id)}
                        className="text-xs transition-all duration-200"
                      >
                        {sec.name}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Question Detail Banner */}
              <Card className="p-4 border-l-4 border-l-primary flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Question No. {activeQuestionIndex + 1}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Section: <span className="font-semibold text-foreground">{currentSection.name}</span> · Type: <span className="capitalize">{currentSection.question_type.replace("_", " ")}</span>
                  </p>
                </div>
                <div className="flex gap-3 text-xs bg-secondary/50 p-2 rounded border">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Correct: +{currentSection.positive_marks}</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Incorrect: {currentSection.negative_marks}</span>
                </div>
              </Card>

              {/* Question Text */}
              <Card className="p-6 space-y-6 min-h-[250px] flex flex-col justify-between">
                <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                  {currentQuestion.question}
                </div>

                {/* Input selection controls */}
                <div className="space-y-3">
                  {currentQuestion.type === "single_choice" && (
                    <div className="grid md:grid-cols-2 gap-3">
                      {currentQuestion.options.map((opt, oi) => {
                        const isSelected = tempAnswers[activeQuestionIndex] === oi;
                        return (
                          <button
                            key={oi}
                            onClick={() => setTempAnswers((prev) => ({ ...prev, [activeQuestionIndex]: oi }))}
                            className={`w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 flex items-start gap-3 hover:scale-[1.01] ${
                              isSelected 
                                ? "border-primary bg-primary/10 ring-1 ring-primary font-semibold text-primary" 
                                : "border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                            }`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.type === "multiple_choice" && (
                    <div className="grid md:grid-cols-2 gap-3">
                      {currentQuestion.options.map((opt, oi) => {
                        const currentChoices = Array.isArray(tempAnswers[activeQuestionIndex]) ? tempAnswers[activeQuestionIndex] : [];
                        const isSelected = currentChoices.includes(oi);
                        
                        const handleMultiToggle = () => {
                          let nextChoices: number[];
                          if (isSelected) {
                            nextChoices = currentChoices.filter((c: number) => c !== oi);
                          } else {
                            nextChoices = [...currentChoices, oi].sort();
                          }
                          setTempAnswers((prev) => ({ ...prev, [activeQuestionIndex]: nextChoices }));
                        };

                        return (
                          <button
                            key={oi}
                            onClick={handleMultiToggle}
                            className={`w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 flex items-start gap-3 hover:scale-[1.01] ${
                              isSelected 
                                ? "border-primary bg-primary/10 ring-1 ring-primary font-semibold text-primary" 
                                : "border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </span>
                            <span className="flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.type === "numerical" && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Type your numeric answer in the box below. Only numbers, decimals, and negative sign are accepted.</p>
                      <Input
                        type="text"
                        placeholder="Enter numerical response..."
                        value={tempAnswers[activeQuestionIndex] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^-?\d*\.?\d*$/.test(val)) {
                            setTempAnswers((prev) => ({ ...prev, [activeQuestionIndex]: val }));
                          }
                        }}
                        className="max-w-sm text-base font-bold py-6 select-text"
                      />
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground/70 italic border-t pt-2 mt-4">
                  Note: You must click "Save & Next" or "Mark for Review" to log your answer. Clicking a number on the right palette directly will navigate without saving unsaved changes.
                </div>
              </Card>
            </div>

            {/* Bottom Pinned Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-lg mt-6">
              <Button variant="outline" onClick={handleClearResponse} className="font-semibold px-6 hover:bg-rose-500/10 hover:text-rose-500">
                Clear Response
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={handleMarkForReviewAndNext} className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 font-semibold px-6">
                  Mark for Review & Next
                </Button>
                <Button onClick={handleSaveAndNext} className="font-semibold px-6 bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save & Next
                </Button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Profile, Palette & Navigation */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Candidate Card & Timer */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {profile?.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate max-w-[120px]">{profile?.full_name || "Student Candidate"}</p>
                    <p className="text-[10px] text-muted-foreground">Roll No: {profile?.id?.slice(0, 8) || "N/A"}</p>
                  </div>
                </div>
                {/* Timer block */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold tracking-tight shadow-inner ${
                  isCriticalTime 
                    ? "bg-red-500/15 border-red-500 text-red-500 animate-pulse" 
                    : isLowTime 
                      ? "bg-amber-500/15 border-amber-500 text-amber-500" 
                      : "bg-secondary text-secondary-foreground"
                }`}>
                  <Timer className={`w-4 h-4 ${isCriticalTime ? "animate-spin text-red-500" : ""}`} />
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Status Legend Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-1.5 bg-secondary/20 rounded">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-emerald-500 text-white rounded-b rounded-t-sm shadow-sm">
                    {counts.answered}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Answered</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-secondary/20 rounded">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-rose-500 text-white rounded-t rounded-b-sm shadow-sm">
                    {counts.not_answered}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Not Answered</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-secondary/20 rounded">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-indigo-600 text-white rounded-full shadow-sm">
                    {counts.marked}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Marked</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-secondary/20 rounded">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-indigo-600 text-white rounded-full shadow-sm ring-1 ring-emerald-400">
                    {counts.answered_marked}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium font-bold truncate">Marked & Ans</span>
                </div>
                <div className="col-span-2 flex items-center gap-2 p-1.5 bg-secondary/20 rounded justify-center">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-secondary text-secondary-foreground border border-border rounded shadow-sm">
                    {counts.not_visited}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Not Visited ({counts.not_visited})</span>
                </div>
              </div>
            </Card>

            {/* Question Palette Card */}
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Question Palette</h3>
                <p className="text-[10px] text-muted-foreground">Select a question number to navigate</p>
              </div>

              {/* Scrollable Palette Grid */}
              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-4 scrollbar-thin">
                {activeQuiz.sections.map((sec) => {
                  const secQuestions = activeQuiz.questions.map((q, idx) => ({ q, idx })).filter(item => item.q.section_id === sec.id);
                  if (secQuestions.length === 0) return null;
                  return (
                    <div key={sec.id} className="space-y-2 border-t pt-3 first:border-0 first:pt-0">
                      <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">{sec.name}</p>
                      <div className="grid grid-cols-5 gap-2">
                        {secQuestions.map(({ idx }) => {
                          const status = paletteStatuses[idx] || "not_visited";
                          const isActive = idx === activeQuestionIndex;
                          return (
                            <button
                              key={idx}
                              onClick={() => handlePaletteClick(idx)}
                              className={`w-9 h-9 flex items-center justify-center text-xs font-semibold transition-all duration-200 scale-95 hover:scale-100 ${getPaletteStyle(status)} ${
                                isActive ? "ring-2 ring-primary ring-offset-2 scale-100" : ""
                              }`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t">
                <Button 
                  onClick={() => setShowSubmitConfirm(true)}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-5 shadow-md transition-all hover:scale-[1.01]"
                >
                  Submit Examination
                </Button>
              </div>
            </Card>

          </div>
        </div>

        {/* Submit Confirmation Dialog */}
        <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-center">Confirm Examination Submission</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="p-4 bg-secondary/30 rounded-xl space-y-2.5">
                <p className="text-xs font-bold text-muted-foreground uppercase text-center border-b pb-2">Status Summary</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Questions:</span>
                    <span className="font-bold">{activeQuiz.questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-500 font-semibold">Answered:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{counts.answered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-500 font-semibold">Not Answered:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{counts.not_answered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-500 font-semibold font-bold">Marked for Review:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{counts.marked + counts.answered_marked}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground leading-relaxed px-2">
                Are you sure you want to finalize and submit the exam? You will not be able to modify your answers after this.
              </p>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-center">
              <Button variant="outline" onClick={() => setShowSubmitConfirm(false)} disabled={saving} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => submitExam()} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Yes, Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  /* ───────────────── RENDER 4: Results Dashboard ───────────────── */
  /* ────────────────────────────────────────────────────────────────────────── */
  if (activeQuiz && examMode === "results" && activeAttempt) {
    const totalMaxMarks = activeAttempt.total_marks || activeQuiz.total_marks;
    const marksObtained = activeAttempt.score;
    const isPassed = activeAttempt.passed;
    const correctCount = activeAttempt.correct_answers_count;
    const wrongCount = activeAttempt.wrong_answers_count;
    const skippedCount = activeAttempt.unattempted_answers_count;
    const totalQCount = activeQuiz.questions.length;
    
    const accuracy = correctCount + wrongCount > 0 
      ? Math.round((correctCount / (correctCount + wrongCount)) * 100) 
      : 0;

    const sectionsScoresData = activeAttempt.section_scores || {};
    const attemptAnswers = activeAttempt.answers || {};

    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setActiveQuiz(null); setActiveAttempt(null); setExamMode("list"); }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{activeQuiz.title}</h1>
                <p className="text-sm text-muted-foreground">Examination Scorecard & Analysis Dashboard</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => handleQuizSelection(activeQuiz)}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retake Exam (₹100)
            </Button>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 max-w-md bg-secondary/40 p-1 rounded-lg">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sections">Section Analysis</TabsTrigger>
              <TabsTrigger value="review">Review Solutions</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-6 mt-4">
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* Circular Score Circle Card */}
                <Card className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">Percentage Score</h3>
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    {/* SVG Circular Progress bar */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="72" cy="72" r="60" className="stroke-secondary fill-none" strokeWidth="8" />
                      <circle 
                        cx="72" 
                        cy="72" 
                        r="60" 
                        className={`fill-none transition-all duration-1000 ${isPassed ? "stroke-emerald-500" : "stroke-rose-500"}`} 
                        strokeWidth="8" 
                        strokeDasharray={2 * Math.PI * 60} 
                        strokeDashoffset={2 * Math.PI * 60 * (1 - Math.max(0, activeAttempt.percentage) / 100)} 
                      />
                    </svg>
                    <div className="absolute text-center">
                      <p className="text-3xl font-extrabold">{activeAttempt.percentage}%</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Passing: {activeQuiz.passing_score}%</p>
                    </div>
                  </div>
                  <Badge className={`py-1 px-4 text-xs font-semibold border ${
                    isPassed 
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  }`}>
                    {isPassed ? "Passed ✓" : "Failed ✗"}
                  </Badge>
                </Card>

                {/* Score Stats Grid */}
                <Card className="p-6 md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Marks Scored</p>
                    <p className="text-2xl font-black text-foreground">
                      {marksObtained} <span className="text-xs font-normal text-muted-foreground">/ {totalMaxMarks}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Percentile Rank</p>
                    <p className="text-2xl font-black text-primary">
                      {percentileRank !== null ? `${percentileRank}%` : "Calculating..."}
                    </p>
                  </div>
                  <div className="space-y-1 border-t pt-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Question Accuracy</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {accuracy}%
                    </p>
                  </div>
                  <div className="space-y-1 border-t pt-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Time Submitted</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {new Date(activeAttempt.submitted_at).toLocaleDateString()} at {new Date(activeAttempt.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </Card>
              </div>

              {/* Stats Breakdown cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1">
                  <CheckCircle className="w-5 h-5 mx-auto text-emerald-500" />
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Correct</p>
                </div>
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center space-y-1">
                  <XCircle className="w-5 h-5 mx-auto text-rose-500" />
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{wrongCount}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Incorrect</p>
                </div>
                <div className="p-4 bg-secondary/40 border border-border rounded-xl text-center space-y-1">
                  <HelpCircle className="w-5 h-5 mx-auto text-muted-foreground" />
                  <p className="text-xl font-bold text-foreground">{skippedCount}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Unattempted</p>
                </div>
              </div>

              {/* Badge visual banner if passed */}
              {badges[activeQuiz.id]?.passed && (() => {
                const tier = getBadgeTier(badges[activeQuiz.id].score);
                return (
                  <Card className="p-5 border border-primary/20 bg-gradient-to-r from-secondary/50 to-primary/5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center ring-2 ${tier.ring} shadow-md`}>
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-foreground">Verified Badge Earned</h4>
                          <ShieldCheck className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground">Your verified badge score is locked in at <strong className="text-primary">{badges[activeQuiz.id].score}%</strong> ({tier.label} level).</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openBadgePopup(activeQuiz)}>
                      View Profile Badge
                    </Button>
                  </Card>
                );
              })()}
            </TabsContent>

            {/* TAB 2: SECTION METRICS */}
            <TabsContent value="sections" className="mt-4">
              <Card className="p-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section Name</TableHead>
                      <TableHead className="text-center">Questions</TableHead>
                      <TableHead className="text-center">Attempted</TableHead>
                      <TableHead className="text-center">Correct</TableHead>
                      <TableHead className="text-center">Incorrect</TableHead>
                      <TableHead className="text-center">Marks Scored</TableHead>
                      <TableHead className="text-center">Accuracy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeQuiz.sections.map((sec) => {
                      const data = sectionsScoresData[sec.id] || {
                        correct: 0,
                        wrong: 0,
                        unattempted: 0,
                        score: 0,
                        totalQuestions: 0,
                      };
                      const totalQuestions = data.totalQuestions || 0;
                      const attempted = (data.correct || 0) + (data.wrong || 0);
                      const secAccuracy = attempted > 0 
                        ? Math.round((data.correct / attempted) * 100) 
                        : 0;

                      return (
                        <TableRow key={sec.id}>
                          <TableCell className="font-semibold">{sec.name}</TableCell>
                          <TableCell className="text-center">{totalQuestions}</TableCell>
                          <TableCell className="text-center">{attempted}</TableCell>
                          <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-semibold">{data.correct || 0}</TableCell>
                          <TableCell className="text-center text-rose-600 dark:text-rose-400 font-semibold">{data.wrong || 0}</TableCell>
                          <TableCell className="text-center font-bold text-foreground">{data.score || 0}</TableCell>
                          <TableCell className="text-center font-bold">{secAccuracy}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* TAB 3: REVIEW QUESTIONS & SOLUTIONS */}
            <TabsContent value="review" className="space-y-4 mt-4">
              {activeQuiz.questions.map((q, idx) => {
                const sec = activeQuiz.sections.find((s) => s.id === q.section_id) || activeQuiz.sections[0];
                const studentAns = attemptAnswers[idx];
                const isSkipped = studentAns === undefined || studentAns === null || studentAns === "" || (Array.isArray(studentAns) && studentAns.length === 0);
                
                let isCorrect = false;
                if (!isSkipped) {
                  if (q.type === "single_choice") {
                    isCorrect = Number(studentAns) === Number(q.correct);
                  } else if (q.type === "multiple_choice") {
                    const sArr = Array.isArray(studentAns) ? (studentAns as number[]).sort() : [];
                    const cArr = Array.isArray(q.correct) ? (q.correct as number[]).sort() : [];
                    isCorrect = sArr.length === cArr.length && sArr.every((val, i) => val === cArr[i]);
                  } else if (q.type === "numerical") {
                    const sVal = String(studentAns).trim();
                    const cVal = String(q.correct).trim();
                    const sFloat = parseFloat(sVal);
                    const cFloat = parseFloat(cVal);
                    isCorrect = (!isNaN(sFloat) && !isNaN(cFloat)) ? (sFloat === cFloat) : (sVal === cVal);
                  }
                }

                return (
                  <Card key={idx} className="p-5 space-y-4 border hover:border-muted-foreground/30 transition-all duration-200">
                    <div className="flex justify-between items-center pb-2 border-b flex-wrap gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        Question {idx + 1} of {totalQCount} · {sec.name}
                      </span>
                      <Badge className={`text-[10px] font-bold border py-0.5 px-2.5 ${
                        isSkipped 
                          ? "bg-secondary text-secondary-foreground border-border" 
                          : isCorrect 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      }`}>
                        {isSkipped ? "Unattempted (0)" : isCorrect ? `Correct (+${sec.positive_marks})` : `Incorrect (${sec.negative_marks})`}
                      </Badge>
                    </div>

                    <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap">{q.question}</p>

                    {/* Choice Display with Highlightings */}
                    {q.type !== "numerical" && (
                      <div className="grid md:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, oi) => {
                          const isCorrectOpt = q.type === "multiple_choice" 
                            ? (Array.isArray(q.correct) && (q.correct as number[]).includes(oi))
                            : Number(q.correct) === oi;
                            
                          const isSelectedOpt = q.type === "multiple_choice"
                            ? (Array.isArray(studentAns) && (studentAns as number[]).includes(oi))
                            : Number(studentAns) === oi;

                          let btnStyle = "border-border text-muted-foreground bg-secondary/20";
                          if (isCorrectOpt) {
                            btnStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold";
                          } else if (isSelectedOpt && !isCorrectOpt) {
                            btnStyle = "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold";
                          }

                          return (
                            <div key={oi} className={`p-3 rounded-lg border flex items-start gap-2.5 ${btnStyle}`}>
                              <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                              <span className="flex-1">{opt}</span>
                              {isCorrectOpt && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                              {isSelectedOpt && !isCorrectOpt && <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Numerical Solutions details */}
                    {q.type === "numerical" && (
                      <div className="grid md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 border rounded-lg bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <p className="font-bold">Correct Numeric Answer:</p>
                          <p className="text-sm font-extrabold mt-0.5">{q.correct}</p>
                        </div>
                        <div className={`p-3 border rounded-lg ${
                          isSkipped 
                            ? "bg-secondary/40 border-border" 
                            : isCorrect 
                              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                              : "bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400"
                        }`}>
                          <p className="font-bold">Your Response:</p>
                          <p className="text-sm font-extrabold mt-0.5">{isSkipped ? "Unattempted" : studentAns}</p>
                        </div>
                      </div>
                    )}

                    {/* Solution Explanation if it exists */}
                    {q.explanation && (
                      <div className="p-3 bg-secondary/50 border rounded-lg text-xs space-y-1">
                        <p className="font-bold text-foreground flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-primary" />
                          Explanation & Solution:
                        </p>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{q.explanation}</p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>

        </div>
      </DashboardLayout>
    );
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  /* ───────────────── RENDER 5: Exams Dashboard list ───────────────── */
  /* ────────────────────────────────────────────────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Dashboard Title & Meta */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exam Portal</h1>
            <p className="text-sm text-muted-foreground">Enroll and test your skills under standard examination formats.</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search quizzes by title, skill, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-6 bg-background/50 backdrop-blur-sm border-border hover:border-muted-foreground/30 focus-visible:ring-primary transition-all rounded-xl shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Earned Badges Carousel/Tiles Section */}
        {Object.keys(badges).filter(qId => badges[qId].passed).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Your Verified Skill Badges
            </h2>
            <div className="flex flex-wrap gap-3">
              {quizzes.filter(q => badges[q.id]?.passed).map(q => {
                const badge = badges[q.id];
                const tier = getBadgeTier(badge.score);
                return (
                  <button
                    key={`earned-${q.id}`}
                    onClick={() => openBadgePopup(q)}
                    className={`group relative rounded-xl border border-primary/20 ${tier.bg} px-4 py-3 text-left transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:border-primary/40 cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center ring-2 ${tier.ring} shadow-md`}>
                        <Award className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-bold text-xs">{q.skill_name}</p>
                          <ShieldCheck className="w-3 h-3 text-primary" />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{tier.label} Level · {badge.score}%</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quizzes List Cards */}
        {quizzes.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground">No quizzes uploaded yet. Please check back later!</p>
          </Card>
        ) : filteredQuizzes.length === 0 ? (
          <Card className="p-8 text-center border-dashed flex flex-col items-center justify-center py-12">
            <HelpCircle className="w-8 h-8 text-muted-foreground mb-2 opacity-60" />
            <p className="font-semibold text-foreground text-sm">No quizzes found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your keywords or clearing the search query.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredQuizzes.map((q) => {
              const badge = badges[q.id];
              const tier = badge ? getBadgeTier(badge.score) : null;
              
              // Find attempts count for this specific quiz
              const attemptsCount = userAttempts.filter(a => a.quiz_id === q.id).length;

              return (
                <Card key={q.id} className="p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-all border hover:border-muted-foreground/30 duration-200">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-foreground text-base leading-snug">{q.title}</h3>
                      {badge?.passed && (
                        <Badge className="shrink-0 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/20">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verified
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold tracking-wide uppercase px-2">{q.skill_name}</Badge>
                    {q.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{q.description}</p>}
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-muted-foreground pt-1.5">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-primary/70" />
                        {q.questions.length} Questions
                      </div>
                      <div className="flex items-center gap-1">
                        <Timer className="w-3.5 h-3.5 text-primary/70" />
                        {q.duration} Minutes
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-primary/70" />
                        Passing: {q.passing_score}%
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-primary/70" />
                        Marks: {q.total_marks} max
                      </div>
                    </div>
                  </div>

                  {/* Attempts summary and action CTA */}
                  <div className="pt-3 border-t space-y-2">
                    {attemptsCount > 0 && (
                      <div className="flex items-center justify-between text-xs pb-1">
                        <button 
                          onClick={() => openAttemptsHistory(q)}
                          className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px]"
                        >
                          <History className="w-3.5 h-3.5" />
                          View History ({attemptsCount} attempts)
                        </button>
                        <span className="text-muted-foreground text-[10px]">
                          Best Score: <strong className="text-foreground">{badge ? `${badge.score}%` : "—"}</strong>
                        </span>
                      </div>
                    )}

                    {!badge ? (
                      <Button onClick={() => handleQuizSelection(q)} className="w-full font-bold">
                        Start Examination
                      </Button>
                    ) : (
                      <Button onClick={() => handleQuizSelection(q)} variant="outline" className="w-full font-bold hover:bg-primary/5 hover:text-primary">
                        Retake Exam (₹100)
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── DIALOG 1: Resume Attempt Dialog ── */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center">Unfinished Attempt Detected</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              You have an ongoing attempt saved in progress for <strong className="text-foreground">{activeQuiz?.title}</strong>. 
              Would you like to restore your progress and resume testing, or start a completely fresh attempt?
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button variant="outline" onClick={startNewExamFromResume} className="flex-1">
              Start New Attempt
            </Button>
            <Button onClick={resumeExam} className="flex-1 bg-primary text-primary-foreground font-semibold">
              Resume Attempt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 2: Attempts History Dialog ── */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Attempts History: {historyQuiz?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {historyQuiz && userAttempts.filter(a => a.quiz_id === historyQuiz.id).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No attempts found.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Percentage</TableHead>
                      <TableHead className="text-center">Outcome</TableHead>
                      <TableHead className="text-right pr-4">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyQuiz && userAttempts
                      .filter(a => a.quiz_id === historyQuiz.id)
                      .map((attempt) => {
                        const date = new Date(attempt.submitted_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                        return (
                          <TableRow key={attempt.id} className="hover:bg-secondary/35 transition-colors">
                            <TableCell className="font-semibold text-xs">{date}</TableCell>
                            <TableCell className="text-center text-xs font-medium">{attempt.score} / {attempt.total_marks}</TableCell>
                            <TableCell className="text-center text-xs font-bold">{attempt.percentage}%</TableCell>
                            <TableCell className="text-center">
                              <Badge className={`text-[9px] font-bold border py-0.5 ${
                                attempt.passed 
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                  : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              }`}>
                                {attempt.passed ? "Passed" : "Failed"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 text-xs text-primary hover:text-primary/80 font-bold"
                                onClick={() => {
                                  setActiveQuiz(historyQuiz);
                                  setActiveAttempt(attempt);
                                  setExamMode("results");
                                  setHistoryDialogOpen(false);
                                }}
                              >
                                View →
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setHistoryDialogOpen(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 3: Verified Badge Details Popup (LinkedIn inspired) ── */}
      <Dialog open={!!badgePopupQuiz} onOpenChange={(open) => { if (!open) setBadgePopupQuiz(null); }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0">
          {badgePopupQuiz && badges[badgePopupQuiz.id] && (() => {
            const badge = badges[badgePopupQuiz.id];
            const tier = getBadgeTier(badge.score);
            return (
              <>
                {/* Header gradient */}
                <div className={`relative bg-gradient-to-r ${tier.color} px-6 pt-8 pb-14`}>
                  <div className="absolute top-3 right-3">
                    <button onClick={() => setBadgePopupQuiz(null)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white mb-3">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified Skill Badge
                    </div>
                    <h2 className="text-xl font-bold text-white">{badgePopupQuiz.skill_name}</h2>
                    <p className="text-white/80 text-sm mt-1">{tier.label} Level {tier.icon}</p>
                  </div>
                </div>

                {/* Badge circle overlapping header */}
                <div className="flex justify-center -mt-10 relative z-10">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center ring-4 ring-background shadow-2xl`}>
                    <Award className="w-10 h-10 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 pt-4">
                  {/* Score display */}
                  <div className="text-center mb-5">
                    <p className="text-5xl font-extrabold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mt-1">{badge.score}%</p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="text-center rounded-xl bg-secondary/50 p-3">
                      <Trophy className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                      {rankLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        <p className="text-lg font-bold">{rankData ? `#${rankData.rank}` : "—"}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">Rank</p>
                    </div>
                    <div className="text-center rounded-xl bg-secondary/50 p-3">
                      <TrendingUp className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                      <p className="text-lg font-bold">{badge.score}%</p>
                      <p className="text-[10px] text-muted-foreground">Best Score</p>
                    </div>
                    <div className="text-center rounded-xl bg-secondary/50 p-3">
                      <Users className="w-5 h-5 mx-auto text-green-500 mb-1" />
                      {rankLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        <p className="text-lg font-bold">{rankData?.totalAttempts ?? "—"}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">Total Earners</p>
                    </div>
                  </div>

                  {/* Percentile bar */}
                  {rankData && rankData.totalAttempts > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Score Percentile</span>
                        <span className="font-semibold text-primary">
                          Top {Math.max(1, Math.round((rankData.rank / rankData.totalAttempts) * 100))}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${tier.color} transition-all duration-1000 ease-out`}
                          style={{ width: `${Math.max(5, 100 - Math.round((rankData.rank / rankData.totalAttempts) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Badge info */}
                  <div className="rounded-xl border bg-secondary/30 p-4 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">This badge verifies your proficiency in <strong className="text-foreground">{badgePopupQuiz.skill_name}</strong></p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Star className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">The score shown is your best performance in this skill</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">Visible to companies & recruiters on your public profile</p>
                    </div>
                  </div>

                  {/* Retake CTA */}
                  <div className="mt-5 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setBadgePopupQuiz(null); handleRetake(badgePopupQuiz); }}>
                      Retake (₹100)
                    </Button>
                    <Button className="flex-1" onClick={() => setBadgePopupQuiz(null)}>
                      Done
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
