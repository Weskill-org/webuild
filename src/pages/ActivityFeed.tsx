import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Briefcase, Star, Award, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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

      // Fetch actor names
      const actorIds = [...new Set(items.map((i) => i.actor_id))];
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, company_name").in("id", actorIds);
        const nameMap: Record<string, string> = {};
        (profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.full_name || p.company_name || "User"; });
        items.forEach((i) => { i.actor_name = nameMap[i.actor_id]; });
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
      default: return `${name} performed an action`;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Activity Feed</h1>
            <p className="text-sm text-muted-foreground">Recent activity across the platform</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : feed.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No activity yet</Card>
        ) : (
          <div className="space-y-2">
            {feed.map((item) => (
              <Card key={item.id} className="p-4 flex items-center gap-4">
                {actionIcon(item.action)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{actionText(item)}</p>
                  {item.metadata?.title && (
                    <p className="text-xs text-muted-foreground truncate">{item.metadata.title}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
