import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, ExternalLink, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Resource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  skill_tags: string[];
  resource_type: string;
}

export default function LearningResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("learning_resources").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setResources((data as unknown as Resource[]) ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = resources.filter((r) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.skill_tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Learning Resources</h1>
            <p className="text-sm text-muted-foreground">Curated tutorials & courses for in-demand skills</p>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by skill or topic..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No resources found. Admins can add learning resources from the admin panel.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((r) => (
              <Card key={r.id} className="p-5 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{r.title}</h3>
                  <Badge variant="outline" className="text-xs capitalize shrink-0 ml-2">{r.resource_type}</Badge>
                </div>
                {r.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{r.description}</p>}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {r.skill_tags.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
                <Button variant="outline" size="sm" className="mt-auto gap-2" asChild>
                  <a href={r.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /> Open Resource</a>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
