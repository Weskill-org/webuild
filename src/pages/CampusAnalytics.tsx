import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Users, Briefcase, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export default function CampusAnalytics() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    projectsCompleted: 0,
    totalEarnings: 0,
    departmentBreakdown: {} as Record<string, number>,
  });

  useEffect(() => {
    if (!profile || profile.role !== "campus") return;
    (async () => {
      // Get batches for this campus
      const { data: batches } = await supabase.from("batches").select("id, department").eq("campus_id", profile.id);
      const batchIds = (batches ?? []).map((b: any) => b.id);

      // Department breakdown
      const deptMap: Record<string, number> = {};
      (batches ?? []).forEach((b: any) => {
        const dept = b.department || "General";
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });

      let totalStudents = 0;
      let studentIds: string[] = [];
      if (batchIds.length > 0) {
        const { data: batchStudents } = await supabase.from("batch_students").select("student_id").in("batch_id", batchIds);
        studentIds = [...new Set((batchStudents ?? []).map((bs: any) => bs.student_id))];
        totalStudents = studentIds.length;
      }

      // Get completed projects and earnings for students
      let projectsCompleted = 0;
      let totalEarnings = 0;
      if (studentIds.length > 0) {
        const { data: apps } = await supabase
          .from("project_applications")
          .select("applicant_id, project_id, status")
          .in("applicant_id", studentIds)
          .eq("status", "accepted");

        if (apps && apps.length > 0) {
          const projectIds = apps.map((a: any) => a.project_id);
          const { data: projects } = await supabase.from("projects").select("id, completed").in("id", projectIds);
          projectsCompleted = (projects ?? []).filter((p: any) => p.completed).length;
        }

        const { data: wallets } = await supabase.from("wallets").select("balance").in("owner_id", studentIds);
        totalEarnings = (wallets ?? []).reduce((s: number, w: any) => s + (w.balance ?? 0), 0);
      }

      const activeStudents = studentIds.length; // simplified: all enrolled = active

      setStats({ totalStudents, activeStudents, projectsCompleted, totalEarnings, departmentBreakdown: deptMap });
      setLoading(false);
    })();
  }, [profile]);

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Campus Analytics</h1>
            <p className="text-sm text-muted-foreground">Student engagement and performance metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-primary" },
            { label: "Active Students", value: stats.activeStudents, icon: TrendingUp, color: "text-green-500" },
            { label: "Projects Completed", value: stats.projectsCompleted, icon: Briefcase, color: "text-accent" },
            { label: "Student Earnings", value: `$${stats.totalEarnings.toFixed(0)}`, icon: DollarSign, color: "text-amber-500" },
          ].map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color} opacity-80`} />
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <h2 className="font-semibold mb-3">Departments</h2>
          {Object.keys(stats.departmentBreakdown).length === 0 ? (
            <p className="text-sm text-muted-foreground">No department data available</p>
          ) : (
            <div className="flex gap-3 flex-wrap">
              {Object.entries(stats.departmentBreakdown).map(([dept, count]) => (
                <Badge key={dept} variant="secondary" className="text-sm px-3 py-1.5">
                  {dept}: {count} batches
                </Badge>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
