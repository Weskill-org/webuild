import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useRealtime from "@/hooks/use-realtime";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Bell } from "lucide-react";

const Notifications = () => {
  const { projects, messages, transactions } = useRealtime();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const events: { type: string; title: string; id: string; created_at: string }[] = [];
  projects.slice(0, 10).forEach((p) =>
    events.push({ type: "project", title: p.title, id: p.id, created_at: p.created_at })
  );
  messages.slice(0, 10).forEach((m) =>
    events.push({ type: "message", title: m.subject ?? m.body.slice(0, 80), id: m.id, created_at: m.created_at })
  );
  transactions.slice(0, 10).forEach((t) =>
    events.push({ type: "transaction", title: `Transaction $${t.amount}`, id: t.id, created_at: t.created_at })
  );

  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>

        <div className="grid gap-3">
          {events.length === 0 ? (
            <Card className="p-8 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications yet</p>
            </Card>
          ) : (
            events.map((e) => (
              <Card key={`${e.type}-${e.id}`} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium capitalize">{e.type}</p>
                  <p className="text-muted-foreground text-sm">{e.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleDateString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => {
                      if (e.type === "message") navigate("/messages");
                      if (e.type === "project") navigate("/dashboard");
                    }}
                  >
                    View
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
