import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen } from "lucide-react";

export default function LearningResources() {
  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <BookOpen className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Learning Resources</h1>
            <p className="text-sm text-muted-foreground">Expert training & professional development</p>
          </div>
        </div>

        <div className="flex-1 w-full bg-card border rounded-xl overflow-hidden shadow-sm">
          <iframe 
            src="https://learn.weskill.org/" 
            className="w-full h-full border-none"
            title="Weskill Learning Platform"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
