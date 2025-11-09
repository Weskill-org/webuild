import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useRealtime from "@/hooks/use-realtime";
import { useAuth } from "@/providers/AuthProvider";

const Messages = () => {
  const { messages } = useRealtime() as any;
  const { profile } = useAuth() as any;

  useEffect(() => {
    // could mark messages as read when opened (left as TODO)
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>

        <div className="grid gap-4">
          {(!messages || messages.length === 0) && (
            <Card className="p-6">No messages yet</Card>
          )}

          {messages && messages.map((m: any) => (
            <Card key={m.id} className="p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{m.subject ?? m.body?.slice(0, 60)}</p>
                  <p className="text-sm text-muted-foreground">From: {m.sender_name ?? m.sender_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</p>
                  <div className="mt-2">
                    <Button variant="ghost" size="sm">Open</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Messages;
