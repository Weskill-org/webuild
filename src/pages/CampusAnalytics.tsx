import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BarChart3, Users, Briefcase, IndianRupee, TrendingUp, ArrowRight, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import DashboardLayout from "@/components/DashboardLayout";

export default function CampusAnalytics() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    projectsCompleted: 0,
    totalEarnings: 0,
    departmentBreakdown: {} as Record<string, number>,
  });

  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [deptBatches, setDeptBatches] = useState<any[]>([]);
  const [fetchingDept, setFetchingDept] = useState(false);

  const fetchDeptDetails = async (dept: string) => {
    if (!profile) return;
    setSelectedDept(dept);
    setFetchingDept(true);
    
    let query = supabase.from("batches").select("id, name, created_at").eq("campus_id", profile.id);
    if (dept === "General") {
      query = query.is("department", null);
    } else {
      query = query.eq("department", dept);
    }
    
    const { data } = await query;
    setDeptBatches(data || []);
    setFetchingDept(false);
  };

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
          const { data: projects } = await supabase.from("projects").select("id, status, completed").in("id", projectIds);
          projectsCompleted = (projects ?? []).filter((p: any) => p.status === 'completed' || p.completed).length;
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
            { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-primary", path: "/students" },
            { label: "Active Students", value: stats.activeStudents, icon: TrendingUp, color: "text-green-500", path: "/students" },
            { label: "Projects Completed", value: stats.projectsCompleted, icon: Briefcase, color: "text-accent", path: "/projects" },
            { label: "Student Earnings", value: `₹${stats.totalEarnings.toFixed(0)}`, icon: IndianRupee, color: "text-amber-500", path: "/wallet" },
          ].map((s) => (
            <Card 
              key={s.label} 
              className="p-5 cursor-pointer hover:shadow-md transition-all hover:border-primary/20"
              onClick={() => navigate(s.path)}
            >
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Departments</h2>
            <p className="text-xs text-muted-foreground">Click a department to view batches</p>
          </div>
          {Object.keys(stats.departmentBreakdown).length === 0 ? (
            <p className="text-sm text-muted-foreground">No department data available</p>
          ) : (
            <div className="flex gap-3 flex-wrap">
              {Object.entries(stats.departmentBreakdown).map(([dept, count]) => (
                <Badge 
                  key={dept} 
                  variant="secondary" 
                  className="text-sm px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2 group"
                  onClick={() => fetchDeptDetails(dept)}
                >
                  {dept}
                  <span className="bg-muted group-hover:bg-primary-foreground/20 px-2 py-0.5 rounded text-xs">
                    {count}
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Dialog open={!!selectedDept} onOpenChange={(open) => !open && setSelectedDept(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {selectedDept} - Batches
              </DialogTitle>
              <DialogDescription>
                List of active batches in the {selectedDept} department.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {fetchingDept ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : deptBatches.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground italic">No batches found for this department.</p>
              ) : (
                <div className="grid gap-2">
                  {deptBatches.map((batch) => (
                    <div 
                      key={batch.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                      onClick={() => navigate(`/batches?dept=${selectedDept === "General" ? "" : selectedDept}`)}
                    >
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">{batch.name}</p>
                        <p className="text-xs text-muted-foreground">Created {new Date(batch.created_at).toLocaleDateString()}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/batches?dept=${selectedDept === "General" ? "" : selectedDept}`)}
                className="w-full"
              >
                View in Management Console
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
