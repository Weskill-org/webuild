import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, Briefcase, DollarSign, Medal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface LeaderboardEntry {
  id: string;
  name: string;
  role: string;
  logo_url: string | null;
  avgRating: number;
  completedProjects: number;
  totalEarnings: number;
  score: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<LeaderboardEntry[]>([]);
  const [companies, setCompanies] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [profilesRes, reviewsRes, projectsRes, walletsRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("reviews").select("*"),
        supabase.from("projects").select("id, owner_id, status, completed"),
        supabase.from("wallets").select("owner_id, balance"),
      ]);

      const profiles = profilesRes.data ?? [];
      const reviews = reviewsRes.data ?? [];
      const projects = projectsRes.data ?? [];
      const wallets = walletsRes.data ?? [];

      const walletMap: Record<string, number> = {};
      wallets.forEach((w: any) => { walletMap[w.owner_id] = w.balance ?? 0; });

      const reviewMap: Record<string, number[]> = {};
      reviews.forEach((r: any) => {
        if (!reviewMap[r.reviewee_id]) reviewMap[r.reviewee_id] = [];
        reviewMap[r.reviewee_id].push(r.rating);
      });

      const completedMap: Record<string, number> = {};
      projects.filter((p: any) => p.completed).forEach((p: any) => {
        completedMap[p.owner_id] = (completedMap[p.owner_id] ?? 0) + 1;
      });

      const buildEntry = (p: any): LeaderboardEntry => {
        const ratings = reviewMap[p.id] ?? [];
        const avg = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
        const completed = completedMap[p.id] ?? 0;
        const earnings = walletMap[p.id] ?? 0;
        return {
          id: p.id,
          name: p.full_name || p.company_name || p.university || "User",
          role: p.role,
          logo_url: p.logo_url,
          avgRating: Math.round(avg * 10) / 10,
          completedProjects: completed,
          totalEarnings: earnings,
          score: avg * 40 + completed * 30 + Math.min(earnings / 100, 30),
        };
      };

      const studentEntries = profiles.filter((p: any) => p.role === "student").map(buildEntry).sort((a, b) => b.score - a.score);
      const companyEntries = profiles.filter((p: any) => p.role === "company").map(buildEntry).sort((a, b) => b.score - a.score);

      setStudents(studentEntries.slice(0, 50));
      setCompanies(companyEntries.slice(0, 50));
      setLoading(false);
    })();
  }, []);

  const RankCard = ({ entry, rank }: { entry: LeaderboardEntry; rank: number }) => (
    <Card className={`p-4 flex items-center gap-4 ${rank <= 3 ? "border-primary/30" : ""}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
        rank === 1 ? "bg-yellow-400/20 text-yellow-600" :
        rank === 2 ? "bg-gray-300/30 text-gray-600" :
        rank === 3 ? "bg-orange-300/20 text-orange-600" :
        "bg-secondary text-muted-foreground"
      }`}>
        {rank <= 3 ? <Medal className="w-5 h-5" /> : rank}
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
        {entry.logo_url ? (
          <img src={entry.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <span className="text-primary-foreground font-medium text-sm">{entry.name[0]?.toUpperCase()}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <button onClick={() => navigate(`/profile/${entry.id}`)} className="font-medium text-sm hover:text-primary transition-colors truncate block">
          {entry.name}
        </button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{entry.avgRating}</span>
          <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{entry.completedProjects}</span>
          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${entry.totalEarnings}</span>
        </div>
      </div>
      <Badge variant="outline" className="shrink-0">{Math.round(entry.score)} pts</Badge>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-7 h-7 text-yellow-500" />
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Top performers ranked by ratings, completions & earnings</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="students">
            <TabsList className="mb-4">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="companies">Companies</TabsTrigger>
            </TabsList>
            <TabsContent value="students" className="space-y-3">
              {students.length === 0 ? <p className="text-center text-muted-foreground py-8">No students yet</p> : students.map((e, i) => <RankCard key={e.id} entry={e} rank={i + 1} />)}
            </TabsContent>
            <TabsContent value="companies" className="space-y-3">
              {companies.length === 0 ? <p className="text-center text-muted-foreground py-8">No companies yet</p> : companies.map((e, i) => <RankCard key={e.id} entry={e} rank={i + 1} />)}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
