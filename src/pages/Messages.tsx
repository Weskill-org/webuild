import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useRealtime from "@/hooks/use-realtime";
import { useAuth } from "@/providers/AuthProvider";
import DashboardLayout from "@/components/DashboardLayout";
import { MessageSquare } from "lucide-react";

const Messages = () => {
  const { messages } = useRealtime();
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>

        <div className="grid gap-3">
          {messages.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No messages yet</p>
            </Card>
          ) : (
            messages.map((m) => (
              <Card key={m.id} className={`p-4 ${!m.read && m.recipient_id === profile?.id ? "border-primary/30 bg-primary/5" : ""}`}>
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.subject || m.body.slice(0, 60)}</p>
                    <p className="text-sm text-muted-foreground">
                      {m.sender_id === profile?.id ? "To: " : "From: "}{m.sender_id === profile?.id ? m.recipient_id : m.sender_id}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
                    </p>
                    <Button variant="ghost" size="sm" className="mt-1">Open</Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
