import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";

interface Quiz {
  id: string;
  skill_name: string;
  title: string;
  description: string | null;
  questions: { question: string; options: string[]; correct: number }[];
  passing_score: number;
}

export default function SkillQuizzes() {
  const { profile } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [badges, setBadges] = useState<Record<string, { passed: boolean; score: number }>>({});
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const [quizRes, badgeRes] = await Promise.all([
        supabase.from("skill_quizzes").select("*"),
        supabase.from("skill_badges").select("quiz_id, passed, score").eq("user_id", profile.id),
      ]);
      setQuizzes((quizRes.data as unknown as Quiz[]) ?? []);
      const bMap: Record<string, { passed: boolean; score: number }> = {};
      (badgeRes.data ?? []).forEach((b: any) => { bMap[b.quiz_id] = { passed: b.passed, score: b.score }; });
      setBadges(bMap);
      setLoading(false);
    })();
  }, [profile?.id]);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setAnswers({});
    setResult(null);
  };

  const submitQuiz = async () => {
    if (!activeQuiz || !profile) return;
    const total = activeQuiz.questions.length;
    let correct = 0;
    activeQuiz.questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    const score = Math.round((correct / total) * 100);
    const passed = score >= activeQuiz.passing_score;

    await supabase.from("skill_badges").upsert({
      user_id: profile.id,
      quiz_id: activeQuiz.id,
      skill_name: activeQuiz.skill_name,
      score,
      passed,
    });

    setBadges((prev) => ({ ...prev, [activeQuiz.id]: { passed, score } }));
    setResult({ score, passed });
    toast({ title: passed ? "Quiz Passed! 🎉" : "Quiz Failed", description: `Score: ${score}%` });
  };

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  if (activeQuiz) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">{activeQuiz.title}</h1>
          <p className="text-muted-foreground mb-6">Pass score: {activeQuiz.passing_score}%</p>

          {result ? (
            <Card className="p-8 text-center">
              {result.passed ? <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" /> : <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />}
              <h2 className="text-2xl font-bold mb-2">{result.passed ? "Congratulations!" : "Not Quite"}</h2>
              <p className="text-lg text-muted-foreground mb-4">Score: {result.score}%</p>
              {result.passed && <Badge className="text-sm">✅ {activeQuiz.skill_name} Badge Earned</Badge>}
              <div className="mt-6">
                <Button onClick={() => setActiveQuiz(null)}>Back to Quizzes</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeQuiz.questions.map((q, qi) => (
                <Card key={qi} className="p-5">
                  <p className="font-medium mb-3">{qi + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                          answers[qi] === oi ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
              <Button onClick={submitQuiz} disabled={Object.keys(answers).length < activeQuiz.questions.length} className="w-full">
                Submit Quiz
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <AlertCircle className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Skill Assessments</h1>
            <p className="text-sm text-muted-foreground">Take quizzes to earn verified skill badges on your profile</p>
          </div>
        </div>

        {quizzes.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No quizzes available yet. Check back later!</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {quizzes.map((q) => {
              const badge = badges[q.id];
              return (
                <Card key={q.id} className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{q.title}</h3>
                    {badge?.passed && <Badge className="shrink-0">✅ Passed</Badge>}
                  </div>
                  <Badge variant="outline" className="mb-2">{q.skill_name}</Badge>
                  {q.description && <p className="text-sm text-muted-foreground mb-3">{q.description}</p>}
                  <p className="text-xs text-muted-foreground mb-3">{q.questions.length} questions · Pass: {q.passing_score}%</p>
                  {badge && <p className="text-xs text-muted-foreground mb-2">Your score: {badge.score}%</p>}
                  <Button size="sm" onClick={() => startQuiz(q)} variant={badge?.passed ? "outline" : "default"}>
                    {badge ? "Retake Quiz" : "Start Quiz"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
