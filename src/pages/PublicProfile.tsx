import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, Linkedin, Loader2, Star, MessageSquare, CheckCircle, Award, ShieldCheck } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { sanitizeUrl } from "@/lib/utils";
import ReviewsSection from "@/components/ReviewsSection";
import type { Profile } from "@/types/database";

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [badges, setBadges] = useState<{ skill_name: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [profileRes, reviewsRes, badgesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("reviews").select("rating").eq("reviewee_id", id),
        supabase.from("skill_badges").select("skill_name, score").eq("user_id", id).eq("passed", true)
      ]);
      if (profileRes.data) setProfile(profileRes.data as unknown as Profile);
      const ratings = (reviewsRes.data as any[]) ?? [];
      setReviewCount(ratings.length);
      setBadges((badgesRes.data as any[]) ?? []);
      if (ratings.length > 0) {
        setAvgRating(ratings.reduce((s, r) => s + r.rating, 0) / ratings.length);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">Profile not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold text-xl">
                  {profile.company_name?.[0] || profile.full_name?.[0] || "?"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">{profile.company_name || profile.full_name}</h1>
                {currentUser && currentUser.id !== id && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/messages?partner=${id}`)} className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {profile.role && <Badge variant="secondary" className="capitalize">{profile.role}</Badge>}
                {profile.university && <span className="text-sm text-muted-foreground">{profile.university}</span>}
                {avgRating !== null && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({reviewCount})</span>
                  </div>
                )}
              </div>
              {profile.bio && <p className="text-muted-foreground mt-3">{profile.bio}</p>}
              <div className="flex items-center gap-3 mt-3">
                {profile.website && (
                  <a href={sanitizeUrl(profile.website)} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> Website
                  </a>
                )}
                {profile.linkedin && (
                  <a href={sanitizeUrl(profile.linkedin)} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        {((profile.skills?.length ?? 0) > 0 || badges.length > 0) && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-3">Skills & Verified Badges</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b, i) => (
                <Badge key={`badge-${i}`} className="bg-primary/10 text-primary border-primary hover:bg-primary/20 flex items-center gap-1.5 py-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {b.skill_name}
                  <span className="ml-0.5 px-1.5 py-0.5 rounded bg-primary/20 text-[10px] font-bold">{b.score}%</span>
                </Badge>
              ))}
              {(profile.skills ?? []).filter(s => !badges.some(b => b.skill_name === s)).map((skill, i) => (
                <Badge key={`skill-${i}`} variant="outline">{skill}</Badge>
              ))}
            </div>
            {badges.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Verified skills show the highest quiz score achieved</p>
            )}
          </Card>
        )}

        <ReviewsSection userId={id} title="Reviews" />
      </div>
    </DashboardLayout>
  );
};

export default PublicProfile;
