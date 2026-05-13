import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, AlertCircle, Award, ShieldCheck, Trophy, TrendingUp, Users, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";
import useRealtime from "@/hooks/use-realtime";

interface Quiz {
  id: string;
  skill_name: string;
  title: string;
  description: string | null;
  questions: { question: string; options: string[]; correct: number }[];
  passing_score: number;
}

interface RankData {
  rank: number;
  totalAttempts: number;
}

export default function SkillQuizzes() {
  const { profile } = useAuth();
  const { wallets, walletBalance } = useRealtime();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [badges, setBadges] = useState<Record<string, { passed: boolean; score: number }>>({});
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  // Badge popup state
  const [badgePopupQuiz, setBadgePopupQuiz] = useState<Quiz | null>(null);
  const [rankData, setRankData] = useState<RankData | null>(null);
  const [rankLoading, setRankLoading] = useState(false);

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

  const handleRetake = async (quiz: Quiz) => {
    if (walletBalance < 100) {
      toast({ variant: "destructive", title: "Insufficient Balance", description: "You need ₹100 to retake this quiz." });
      return;
    }

    const wallet = wallets[0];
    if (!wallet) {
      toast({ variant: "destructive", title: "Wallet Not Found", description: "Could not find your wallet." });
      return;
    }

    // Deduct ₹100
    try {
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
      startQuiz(quiz);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to process retake fee." });
    }
  };

  const submitQuiz = async () => {
    if (!activeQuiz || !profile) return;
    const total = activeQuiz.questions.length;
    let correct = 0;
    activeQuiz.questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    const score = Math.round((correct / total) * 100);
    
    const previousBadge = badges[activeQuiz.id];
    const highestScore = previousBadge ? Math.max(previousBadge.score, score) : score;
    const passed = highestScore >= activeQuiz.passing_score;

    await supabase.from("skill_badges").upsert({
      user_id: profile.id,
      quiz_id: activeQuiz.id,
      skill_name: activeQuiz.skill_name,
      score: highestScore,
      passed,
    });

    setBadges((prev) => ({ ...prev, [activeQuiz.id]: { passed, score: highestScore } }));
    setResult({ score, passed: score >= activeQuiz.passing_score });
    toast({ title: (score >= activeQuiz.passing_score) ? "Quiz Passed! 🎉" : "Quiz Finished", description: `You scored ${score}%` });
  };

  // Open the verified badge popup and fetch rank
  const openBadgePopup = async (quiz: Quiz) => {
    setBadgePopupQuiz(quiz);
    setRankData(null);
    setRankLoading(true);

    try {
      // Get all badge entries for this quiz, ordered by score descending
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

  // Determine badge tier based on score
  const getBadgeTier = (score: number) => {
    if (score >= 95) return { label: "Expert", color: "from-amber-400 via-yellow-500 to-amber-600", ring: "ring-amber-400/50", icon: "🏆", bg: "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30" };
    if (score >= 80) return { label: "Advanced", color: "from-violet-500 via-purple-500 to-indigo-600", ring: "ring-violet-400/50", icon: "⭐", bg: "bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30" };
    if (score >= 60) return { label: "Intermediate", color: "from-blue-500 via-cyan-500 to-blue-600", ring: "ring-blue-400/50", icon: "🎯", bg: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30" };
    return { label: "Beginner", color: "from-emerald-500 via-green-500 to-teal-600", ring: "ring-emerald-400/50", icon: "✅", bg: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30" };
  };

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  // ── Active quiz view ────────────────────────────────────────────
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
              <p className="text-lg text-muted-foreground mb-4">You scored: {result.score}%</p>

              {/* Verified Skill Badge Card on result */}
              {badges[activeQuiz.id] && (() => {
                const tier = getBadgeTier(badges[activeQuiz.id].score);
                return (
                  <div className="mt-4 mb-4 mx-auto max-w-xs cursor-pointer" onClick={() => openBadgePopup(activeQuiz)}>
                    <div className={`relative rounded-2xl border-2 border-primary/20 ${tier.bg} p-6 transition-transform hover:scale-[1.02]`}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${tier.color} px-3 py-0.5 text-xs font-semibold text-white shadow-lg`}>
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified Skill
                        </span>
                      </div>
                      {/* Badge visual */}
                      <div className={`w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center ring-4 ${tier.ring} shadow-xl`}>
                        <Award className="w-10 h-10 text-white" />
                      </div>
                      <p className="font-bold text-lg">{activeQuiz.skill_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tier.label} Level {tier.icon}</p>
                      <p className="text-3xl font-extrabold text-primary mt-1">{badges[activeQuiz.id].score}%</p>
                      <p className="text-xs text-muted-foreground mt-3">Tap to view full badge details</p>
                    </div>
                  </div>
                );
              })()}

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

  // ── Quizzes list view ─────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <AlertCircle className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Skill Assessments</h1>
            <p className="text-sm text-muted-foreground">Take quizzes to earn verified skill badges on your profile. You can retake a quiz for ₹100 to improve your score.</p>
          </div>
        </div>

        {/* Earned Badges Showcase */}
        {Object.keys(badges).filter(qId => badges[qId].passed).length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Verified Skill Badges</h2>
            <div className="flex flex-wrap gap-3">
              {quizzes.filter(q => badges[q.id]?.passed).map(q => {
                const badge = badges[q.id];
                const tier = getBadgeTier(badge.score);
                return (
                  <button
                    key={`earned-${q.id}`}
                    onClick={() => openBadgePopup(q)}
                    className={`group relative rounded-xl border border-primary/20 ${tier.bg} px-4 py-3 text-left transition-all hover:shadow-lg hover:scale-[1.02] hover:border-primary/40 cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center ring-2 ${tier.ring} shadow-md`}>
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm">{q.skill_name}</p>
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground">{tier.label} · {badge.score}%</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {quizzes.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No quizzes available yet. Check back later!</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {quizzes.map((q) => {
              const badge = badges[q.id];
              const tier = badge ? getBadgeTier(badge.score) : null;
              return (
                <Card key={q.id} className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{q.title}</h3>
                    {badge?.passed && (
                      <Badge className="shrink-0 bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verified
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="mb-2">{q.skill_name}</Badge>
                  {q.description && <p className="text-sm text-muted-foreground mb-3">{q.description}</p>}
                  <p className="text-xs text-muted-foreground mb-3">{q.questions.length} questions · Pass: {q.passing_score}%</p>

                  {/* Clickable Verified Skill Badge tile */}
                  {badge && tier && (
                    <button
                      onClick={() => openBadgePopup(q)}
                      className={`w-full mb-3 flex items-center gap-3 rounded-xl border border-primary/20 ${tier.bg} px-3 py-2.5 text-left transition-all hover:shadow-md hover:border-primary/40 cursor-pointer group`}
                    >
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center ring-2 ${tier.ring} shadow-md shrink-0`}>
                        <Award className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-semibold">Verified Skill Badge</p>
                          <ShieldCheck className="w-3 h-3 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground">Score: <span className="font-bold text-primary">{badge.score}%</span></p>
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">View →</span>
                    </button>
                  )}

                  {!badge ? (
                    <Button size="sm" onClick={() => startQuiz(q)}>
                      Start Quiz
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleRetake(q)}>
                      Retake (₹100)
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Verified Skill Badge Popup (LinkedIn-inspired) ──────── */}
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
