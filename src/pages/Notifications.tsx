import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useRealtime from "@/hooks/use-realtime";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Bell, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Notifications = () => {
  const { notifications } = useRealtime();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  useEffect(() => {
    const markAllAsRead = async () => {
      if (!profile || isMarkingRead) return;
      
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      setIsMarkingRead(true);
      try {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .in("id", unreadIds)
          .eq("user_id", profile.id);
        
        if (error) throw error;
      } catch (err) {
        console.error("Error marking as read:", err);
      } finally {
        setIsMarkingRead(false);
      }
    };

    markAllAsRead();
  }, [profile, notifications, isMarkingRead]);

  const deleteAll = async () => {
    if (!profile) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", profile.id);
      
      if (error) throw error;
      toast({ title: "Notifications cleared", description: "All notifications have been deleted." });
    } catch (err) {
      console.error("Error deleting all:", err);
      toast({ variant: "destructive", title: "Error", description: "Could not delete notifications." });
    }
  };

  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!profile) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", profile.id);
      
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting notification:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete notification." });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={deleteAll}>
              Clear all
            </Button>
          )}
        </div>

        <div className="grid gap-3">
          {notifications.length === 0 ? (
            <Card className="p-8 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications yet</p>
            </Card>
          ) : (
            notifications.map((n) => (
              <Card 
                key={n.id} 
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-colors hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{n.title}</p>
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0 ml-0 sm:ml-4 w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      if (n.type === "message") {
                        navigate("/messages");
                      } else if (
                        n.type === "new_application" ||
                        n.type === "application_accepted" ||
                        n.type === "application_rejected" ||
                        n.type === "project_completed" ||
                        n.type === "milestone_completed" ||
                        n.type === "new_project" ||
                        n.type.includes("project")
                      ) {
                        navigate("/dashboard");
                      } else if (n.type === "payment_received") {
                        navigate("/wallet");
                      } else if (
                        n.type === "partnership_requested" ||
                        n.type === "partnership_accepted" ||
                        n.type === "partnership_rejected" ||
                        n.type.includes("partnership")
                      ) {
                        navigate("/partnerships");
                      } else {
                        // Fallback to dashboard if type is unknown but we want it clickable
                        navigate("/dashboard");
                      }
                    }}
                  >
                    View
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => deleteNotification(n.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
