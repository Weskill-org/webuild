import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useRealtime from "@/hooks/use-realtime";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const { projects, messages, transactions, wallets } = useRealtime() as any;
  const { profile } = useAuth() as any;
  const navigate = useNavigate();

  // Build a simple list of recent events (limit 20)
  const events: any[] = [];
  projects?.slice(0, 10).forEach((p: any) => events.push({ type: 'project', title: p.title, id: p.id, created_at: p.created_at }));
  messages?.slice(0, 10).forEach((m: any) => events.push({ type: 'message', title: m.subject ?? m.body?.slice(0, 80), id: m.id, created_at: m.created_at }));
  transactions?.slice(0, 10).forEach((t: any) => events.push({ type: 'transaction', title: `Transaction $${t.amount}`, id: t.id, created_at: t.created_at }));

  // sort descending by created_at when present
  events.sort((a,b) => (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime()));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>

        <div className="grid gap-4">
          {events.length === 0 && (
            <Card className="p-6">No notifications yet</Card>
          )}

          {events.map((e) => (
            <Card key={`${e.type}-${e.id}`} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{e.type === 'project' ? 'Project' : e.type === 'message' ? 'Message' : 'Transaction'}</p>
                <p className="text-muted-foreground text-sm">{e.title}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</p>
                <div className="mt-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (e.type === 'message') navigate('/messages');
                    if (e.type === 'project') navigate('/dashboard');
                  }}>View</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
