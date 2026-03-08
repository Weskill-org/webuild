import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CompanyInfo {
  id: string;
  company_name: string | null;
  logo_url: string | null;
  projectCount: number;
}

export default function TopCompanies() {
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);

  useEffect(() => {
    (async () => {
      // Get companies with most open projects
      const { data: projects } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("status", "open");

      if (!projects || projects.length === 0) return;

      const countMap: Record<string, number> = {};
      projects.forEach((p: any) => {
        countMap[p.owner_id] = (countMap[p.owner_id] || 0) + 1;
      });

      const topIds = Object.entries(countMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      if (topIds.length === 0) return;

      const { data: profiles } = await supabase.from("profiles").select("id, company_name, logo_url").in("id", topIds);

      const result: CompanyInfo[] = (profiles ?? []).map((p: any) => ({
        id: p.id,
        company_name: p.company_name,
        logo_url: p.logo_url,
        projectCount: countMap[p.id] || 0,
      }));

      result.sort((a, b) => b.projectCount - a.projectCount);
      setCompanies(result);
    })();
  }, []);

  if (companies.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-3">Top Companies Hiring</h3>
        <p className="text-sm text-muted-foreground">No active companies yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Top Companies Hiring</h3>
      <div className="space-y-3">
        {companies.map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              {c.logo_url ? (
                <img src={c.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
              ) : (
                <Building2 className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{c.company_name || "Company"}</p>
            </div>
            <Badge variant="secondary" className="text-xs shrink-0">
              {c.projectCount} project{c.projectCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
