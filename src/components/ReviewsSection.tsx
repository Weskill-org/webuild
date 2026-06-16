import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Review, Profile } from "@/types/database";

interface ReviewsSectionProps {
  userId?: string;
  projectId?: string;
  title?: string;
}

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-4 h-4 ${
          star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
        }`}
      />
    ))}
  </div>
);

const ReviewsSection = ({ userId, projectId, title = "Reviews" }: ReviewsSectionProps) => {
  const [reviews, setReviews] = useState<(Review & { reviewer?: Profile; project_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });

      if (userId) query = query.eq("reviewee_id", userId);
      if (projectId) query = query.eq("project_id", projectId);

      const { data } = await query;
      const reviewList = (data as unknown as Review[]) ?? [];

      if (reviewList.length === 0) {
        setReviews([]);
        setLoading(false);
        return;
      }

      // Fetch reviewer profiles
      const reviewerIds = [...new Set(reviewList.map((r) => r.reviewer_id))];
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", reviewerIds);
      const profileMap: Record<string, Profile> = {};
      profiles?.forEach((p: any) => (profileMap[p.id] = p as Profile));

      // Fetch project titles if showing user reviews
      const projectMap: Record<string, string> = {};
      if (userId) {
        const projectIds = [...new Set(reviewList.map((r) => r.project_id))];
        const { data: projects } = await supabase.from("projects").select("id, title").in("id", projectIds);
        projects?.forEach((p: any) => (projectMap[p.id] = p.title));
      }

      setReviews(
        reviewList.map((r) => ({
          ...r,
          reviewer: profileMap[r.reviewer_id],
          project_title: projectMap[r.project_id],
        }))
      );
      setLoading(false);
    })();
  }, [userId, projectId]);

  if (loading) return null;
  if (reviews.length === 0) return null;

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          <StarDisplay rating={Math.round(avgRating)} />
          <span className="text-sm text-muted-foreground">
            {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
          </span>
        </div>
      </div>
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {review.reviewer?.full_name?.[0] || review.reviewer?.company_name?.[0] || "?"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {review.reviewer?.company_name || review.reviewer?.full_name || "User"}
                  </p>
                  {review.project_title && (
                    <p className="text-xs text-muted-foreground">for: {review.project_title}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StarDisplay rating={review.rating} />
                <span className="text-xs text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            {review.feedback && (
              <p className="text-sm text-muted-foreground mt-2">{review.feedback}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export { StarDisplay };
export default ReviewsSection;
