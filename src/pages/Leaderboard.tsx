import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, Briefcase, Medal, Loader2, Crown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Profile, Review, Project, Wallet } from "@/types/database";

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

const TOP_N = 10;

export default function Leaderboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [allStudents, setAllStudents] = useState<LeaderboardEntry[]>([]);
  const [allCompanies, setAllCompanies] = useState<LeaderboardEntry[]>([]);
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
      wallets.forEach((w: Wallet) => { walletMap[w.owner_id] = w.balance ?? 0; });

      const reviewMap: Record<string, number[]> = {};
      reviews.forEach((r: Review) => {
        if (!reviewMap[r.reviewee_id]) reviewMap[r.reviewee_id] = [];
        reviewMap[r.reviewee_id].push(r.rating);
      });

      const completedMap: Record<string, number> = {};
      projects.filter((p: Project) => p.completed).forEach((p: Project) => {
        completedMap[p.owner_id] = (completedMap[p.owner_id] ?? 0) + 1;
      });

      const buildEntry = (p: Profile): LeaderboardEntry => {
        const ratings = reviewMap[p.id] ?? [];
        const avg = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
        const completed = completedMap[p.id] ?? 0;
        const earnings = walletMap[p.id] ?? 0;
        return {
          id: p.id,
          name: p.full_name || p.company_name || p.university || "User",
          role: p.role || "",
          logo_url: p.logo_url,
          avgRating: Math.round(avg * 10) / 10,
          completedProjects: completed,
          totalEarnings: earnings,
          score: avg * 40 + completed * 30 + Math.min(earnings / 100, 30),
        };
      };

      setAllStudents(profiles.filter((p: Profile) => p.role === "student").map(buildEntry).sort((a, b) => b.score - a.score));
      setAllCompanies(profiles.filter((p: Profile) => p.role === "company").map(buildEntry).sort((a, b) => b.score - a.score));
      setLoading(false);
    })();
  }, []);

  /** Find the logged-in user's position in a full sorted list */
  const findMyRank = (list: LeaderboardEntry[]): { entry: LeaderboardEntry; rank: number } | null => {
    if (!profile) return null;
    const idx = list.findIndex((e) => e.id === profile.id);
    if (idx === -1) return null;
    return { entry: list[idx], rank: idx + 1 };
  };

  /* ── Rank badge colours ── */
  const rankStyle = (rank: number) => {
    if (rank === 1) return { bg: "bg-gradient-to-br from-yellow-300 to-amber-500", text: "text-amber-900", ring: "ring-2 ring-yellow-400/60" };
    if (rank === 2) return { bg: "bg-gradient-to-br from-slate-300 to-slate-400", text: "text-slate-800", ring: "ring-2 ring-slate-300/60" };
    if (rank === 3) return { bg: "bg-gradient-to-br from-orange-300 to-orange-500", text: "text-orange-900", ring: "ring-2 ring-orange-300/60" };
    return { bg: "bg-secondary", text: "text-muted-foreground", ring: "" };
  };

  /* ── Row component ── */
  const RankRow = ({ entry, rank, isMe, animDelay = 0 }: { entry: LeaderboardEntry; rank: number; isMe: boolean; animDelay?: number }) => {
    const rs = rankStyle(rank);
    return (
      <div
        className={`group relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 ${
          isMe
            ? "bg-primary/[0.07] ring-1 ring-primary/30"
            : rank <= 3
            ? "bg-card border border-border/60 shadow-sm hover:shadow-md"
            : "bg-card/60 hover:bg-card border border-transparent hover:border-border/40"
        }`}
        style={{ animationDelay: `${animDelay}ms` }}
      >
        {/* Rank */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${rs.bg} ${rs.text} ${rs.ring}`}>
          {rank <= 3 ? <Crown className="w-4 h-4" /> : rank}
        </div>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0 shadow-sm">
          {entry.logo_url ? (
            <img src={entry.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <span className="text-primary-foreground font-semibold text-sm">{entry.name[0]?.toUpperCase()}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/profile/${entry.id}`)}
              className="font-semibold text-sm hover:text-primary transition-colors truncate"
            >
              {entry.name}
            </button>
            {isMe && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-primary/10 text-primary border-0">
                You
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              {entry.avgRating}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              {entry.completedProjects} done
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <span className={`text-base font-bold ${rank <= 3 ? "text-foreground" : "text-muted-foreground"}`}>
            {Math.round(entry.score)}
          </span>
          <span className="text-[10px] text-muted-foreground ml-0.5">pts</span>
        </div>
      </div>
    );
  };

  /* ── "Your rank" banner shown when user is outside top 10 ── */
  const MyRankBanner = ({ entry, rank }: { entry: LeaderboardEntry; rank: number }) => (
    <div className="mb-4 rounded-xl bg-primary/[0.06] border border-primary/20 px-4 py-3 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <ChevronUp className="w-4 h-4 text-primary" />
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0 shadow-sm">
        {entry.logo_url ? (
          <img src={entry.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <span className="text-primary-foreground font-semibold text-sm">{entry.name[0]?.toUpperCase()}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{entry.name}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-primary/10 text-primary border-0">
            You
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your rank: <span className="font-semibold text-foreground">#{rank}</span> · {Math.round(entry.score)} pts
        </p>
      </div>
    </div>
  );

  /* ── Section renderer ── */
  const LeaderboardList = ({ list }: { list: LeaderboardEntry[] }) => {
    const top10 = list.slice(0, TOP_N);
    const myRank = findMyRank(list);
    const meInTop10 = myRank ? myRank.rank <= TOP_N : false;

    if (list.length === 0) {
      return <p className="text-center text-muted-foreground py-12 text-sm">No entries yet</p>;
    }

    return (
      <div>
        {/* Show user's rank banner if they are outside top 10 */}
        {myRank && !meInTop10 && <MyRankBanner entry={myRank.entry} rank={myRank.rank} />}

        {/* Top 10 list */}
        <div className="space-y-2">
          {top10.map((entry, i) => (
            <RankRow
              key={entry.id}
              entry={entry}
              rank={i + 1}
              isMe={profile?.id === entry.id}
              animDelay={i * 40}
            />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Showing top {Math.min(TOP_N, list.length)} of {list.length} participants
        </p>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Top performers by ratings & project completions</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading rankings…</p>
          </div>
        ) : (
          <Tabs defaultValue="students">
            <TabsList className="mb-6 w-full grid grid-cols-2">
              <TabsTrigger value="students" className="text-sm">
                <Medal className="w-4 h-4 mr-1.5" />
                Students
              </TabsTrigger>
              <TabsTrigger value="companies" className="text-sm">
                <Briefcase className="w-4 h-4 mr-1.5" />
                Companies
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students">
              <LeaderboardList list={allStudents} />
            </TabsContent>
            <TabsContent value="companies">
              <LeaderboardList list={allCompanies} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
