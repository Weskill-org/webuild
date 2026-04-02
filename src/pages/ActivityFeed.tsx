import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Briefcase, Star, Award, CheckCircle, Loader2, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface FeedItem {
  id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: any;
  created_at: string;
  actor_name?: string;
}

export default function ActivityFeed() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      const items = (data as unknown as FeedItem[]) ?? [];

      // Fetch actor names and logos
      const actorIds = [...new Set(items.map((i) => i.actor_id))];
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, company_name, logo_url")
          .in("id", actorIds);
        
        const profileMap: Record<string, any> = {};
        (profiles ?? []).forEach((p) => { 
          profileMap[p.id] = {
            name: p.full_name || p.company_name || "User",
            logo: p.logo_url
          }; 
        });
        
        items.forEach((i) => { 
          i.actor_name = profileMap[i.actor_id]?.name || "User";
        });
      }

      setFeed(items);
      setLoading(false);
    })();
  }, []);

  const actionIcon = (action: string) => {
    switch (action) {
      case "project_completed": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "project_posted": return <Briefcase className="w-5 h-5 text-primary" />;
      case "review_posted": return <Star className="w-5 h-5 text-yellow-400" />;
      case "certificate_earned": return <Award className="w-5 h-5 text-purple-500" />;
      case "partnership_requested": return <Users className="w-5 h-5 text-blue-500" />;
      default: return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const actionText = (item: FeedItem) => {
    const name = item.actor_name || "Someone";
    switch (item.action) {
      case "project_completed": return `${name} completed a project`;
      case "project_posted": return `${name} posted a new project`;
      case "review_posted": return `${name} left a review`;
      case "certificate_earned": return `${name} earned a certificate`;
      case "milestone_completed": return `${name} completed a milestone`;
      case "application_submitted": return `${name} applied to a project`;
      case "partnership_requested": return `${name} initiated a partnership`;
      default: return `${name} performed an action`;
    }
  };

  const handleItemClick = (item: FeedItem) => {
    if (item.target_type === "project" && item.target_id) {
      navigate(`/projects/${item.target_id}`);
    } else if (item.target_type === "partnership") {
      navigate("/partnerships");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Activity Feed</h1>
              <p className="text-muted-foreground">Stay updated with the latest happenings on WeBuild</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Loading latest activities...</p>
          </div>
        ) : feed.length === 0 ? (
          <Card className="p-12 text-center border-dashed bg-muted/30">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-1">No activities yet</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Activity across the platform will appear here in real-time.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {feed.map((item) => (
              <Card 
                key={item.id} 
                className="p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-primary group"
                onClick={() => handleItemClick(item)}
              >
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  {actionIcon(item.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-foreground leading-none">
                      {actionText(item)}
                    </p>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider shrink-0">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {item.metadata?.title ? (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground italic truncate">
                        "{item.metadata.title}"
                      </p>
                      {item.action === "review_posted" && item.metadata.rating && (
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < item.metadata.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} 
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : item.metadata?.status && (
                    <Badge variant="secondary" className="mt-1.5 text-[10px] py-0 h-4">
                      {item.metadata.status}
                    </Badge>
                  )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

