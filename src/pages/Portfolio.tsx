import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Award, Briefcase, Star, ExternalLink, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import type { Profile, Certificate, Review } from "@/types/database";

interface PortfolioProject {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  required_skills: string[];
}

export default function Portfolio() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [badges, setBadges] = useState<{ skill_name: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [profileRes, certsRes, reviewsRes, badgesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("certificates").select("*").eq("student_id", id),
        supabase.from("reviews").select("*").eq("reviewee_id", id),
        supabase.from("skill_badges").select("skill_name, score").eq("user_id", id).eq("passed", true),
      ]);

      if (profileRes.data) setProfile(profileRes.data as unknown as Profile);
      setCertificates((certsRes.data as unknown as Certificate[]) ?? []);
      setReviews((reviewsRes.data as unknown as Review[]) ?? []);
      setBadges((badgesRes.data as any[]) ?? []);

      // Get completed projects via applications
      const { data: apps } = await supabase
        .from("project_applications")
        .select("project_id")
        .eq("applicant_id", id)
        .eq("status", "accepted");

      if (apps && apps.length > 0) {
        const projectIds = apps.map((a: any) => a.project_id);
        const { data: projData } = await supabase
          .from("projects")
          .select("id, title, description, category, required_skills")
          .in("id", projectIds)
          .eq("completed", true);
        setProjects((projData as unknown as PortfolioProject[]) ?? []);
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  if (!profile) {
    return <DashboardLayout><div className="text-center py-20"><p className="text-muted-foreground">Portfolio not found</p></div></DashboardLayout>;
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "N/A";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold text-2xl">{profile.full_name?.[0]?.toUpperCase() || "?"}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile.full_name || "Student"}</h1>
              {profile.university && <p className="text-muted-foreground">{profile.university}</p>}
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /> {avgRating} avg</span>
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {projects.length} completed</span>
                <span className="flex items-center gap-1"><Award className="w-4 h-4" /> {certificates.length} certs</span>
              </div>
            </div>
          </div>
          {profile.bio && <p className="text-muted-foreground mt-4">{profile.bio}</p>}
        </Card>

        {/* Skills & Badges */}
        {((profile.skills?.length ?? 0) > 0 || badges.length > 0) && (
          <Card className="p-6">
            <h2 className="font-semibold mb-3">Skills & Verified Badges</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b, i) => (
                <Badge key={i} className="gap-1"><CheckCircle className="w-3 h-3" /> {b.skill_name} ({b.score}%)</Badge>
              ))}
              {(profile.skills ?? []).map((s, i) => (
                <Badge key={`s-${i}`} variant="outline">{s}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Completed Projects */}
        {projects.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Completed Projects</h2>
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.id} className="p-4 border border-border rounded-lg">
                  <h3 className="font-medium">{p.title}</h3>
                  {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.category && <Badge variant="secondary" className="text-xs">{p.category}</Badge>}
                    {(p.required_skills ?? []).slice(0, 4).map((s, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Certificates */}
        {certificates.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Certificates</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {certificates.map((c) => (
                <div key={c.id} className="p-4 border border-border rounded-lg flex items-center gap-3">
                  <Award className="w-8 h-8 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{c.project_title}</p>
                    <p className="text-xs text-muted-foreground">{c.company_name} · {c.issued_at ? new Date(c.issued_at).toLocaleDateString() : ""}</p>
                  </div>
                  {c.certificate_uid && (
                    <Button size="icon" variant="ghost" asChild className="shrink-0 ml-auto">
                      <a href={`/verify/${c.certificate_uid}`} target="_blank"><ExternalLink className="w-4 h-4" /></a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Reviews ({reviews.length})</h2>
            <div className="space-y-3">
              {reviews.slice(0, 10).map((r) => (
                <div key={r.id} className="p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  {r.feedback && <p className="text-sm text-muted-foreground">{r.feedback}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
