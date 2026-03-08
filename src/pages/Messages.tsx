import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, ArrowLeft, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import DashboardLayout from "@/components/DashboardLayout";
import type { Message, Profile } from "@/types/database";

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastDate: string;
  unread: number;
}

const Messages = () => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch all messages and build conversations
  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
        .order("created_at", { ascending: false });

      const allMessages = (msgs as unknown as Message[]) ?? [];

      // Group by conversation partner
      const convMap = new Map<string, Message[]>();
      allMessages.forEach((m) => {
        const partnerId = m.sender_id === profile.id ? m.recipient_id : m.sender_id;
        if (!convMap.has(partnerId)) convMap.set(partnerId, []);
        convMap.get(partnerId)!.push(m);
      });

      // Fetch partner profiles
      const partnerIds = [...convMap.keys()];
      let profileMap: Record<string, Profile> = {};
      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", partnerIds);
        (profiles ?? []).forEach((p: any) => (profileMap[p.id] = p as Profile));
      }

      const convList: Conversation[] = partnerIds.map((pid) => {
        const msgs = convMap.get(pid)!;
        const unread = msgs.filter((m) => m.recipient_id === profile.id && !m.read).length;
        const p = profileMap[pid];
        return {
          partnerId: pid,
          partnerName: p?.full_name || p?.company_name || p?.university || "User",
          partnerAvatar: p?.logo_url || null,
          lastMessage: msgs[0]?.body?.slice(0, 80) || "",
          lastDate: msgs[0]?.created_at || "",
          unread,
        };
      });

      convList.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
      setConversations(convList);
      setLoading(false);
    })();
  }, [profile]);

  // Load thread when partner selected
  useEffect(() => {
    if (!profile || !selectedPartner) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${profile.id},recipient_id.eq.${selectedPartner}),and(sender_id.eq.${selectedPartner},recipient_id.eq.${profile.id})`
        )
        .order("created_at", { ascending: true });
      setThread((data as unknown as Message[]) ?? []);

      // Mark unread as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("recipient_id", profile.id)
        .eq("sender_id", selectedPartner)
        .eq("read", false);

      // Update conversation unread count
      setConversations((prev) =>
        prev.map((c) => (c.partnerId === selectedPartner ? { ...c, unread: 0 } : c))
      );
    })();
  }, [profile, selectedPartner]);

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as unknown as Message;
        if (msg.sender_id === profile.id || msg.recipient_id === profile.id) {
          // If in current thread, append
          const partnerId = msg.sender_id === profile.id ? msg.recipient_id : msg.sender_id;
          if (partnerId === selectedPartner) {
            setThread((prev) => [...prev, msg]);
          }
          // Update conversations
          setConversations((prev) => {
            const existing = prev.find((c) => c.partnerId === partnerId);
            if (existing) {
              return prev
                .map((c) =>
                  c.partnerId === partnerId
                    ? { ...c, lastMessage: msg.body.slice(0, 80), lastDate: msg.created_at || "", unread: partnerId === selectedPartner ? 0 : c.unread + 1 }
                    : c
                )
                .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
            }
            return prev;
          });
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [profile, selectedPartner]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  const handleSend = async () => {
    if (!newMessage.trim() || !profile || !selectedPartner) return;
    setSending(true);
    try {
      await supabase.from("messages").insert({
        sender_id: profile.id,
        recipient_id: selectedPartner,
        body: newMessage.trim(),
      });
      setNewMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find((c) => c.partnerId === selectedPartner);
  const filteredConvs = conversations.filter((c) =>
    !search || c.partnerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)]">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>

        <div className="flex gap-4 h-[calc(100%-3rem)]">
          {/* Conversations list */}
          <Card className={`w-80 shrink-0 flex flex-col ${selectedPartner ? "hidden md:flex" : "flex"}`}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No conversations</p>
                </div>
              ) : (
                filteredConvs.map((c) => (
                  <button
                    key={c.partnerId}
                    onClick={() => setSelectedPartner(c.partnerId)}
                    className={`w-full text-left p-3 border-b border-border hover:bg-secondary/50 transition-colors ${
                      selectedPartner === c.partnerId ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
                        {c.partnerAvatar ? (
                          <img src={c.partnerAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-primary-foreground font-medium text-sm">
                            {c.partnerName[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm truncate">{c.partnerName}</p>
                          {c.unread > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                              {c.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Thread */}
          <Card className={`flex-1 flex flex-col ${!selectedPartner ? "hidden md:flex" : "flex"}`}>
            {!selectedPartner ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Select a conversation to start messaging</p>
                </div>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedPartner(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <span className="text-primary-foreground font-medium text-xs">
                      {selectedConv?.partnerName[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <p className="font-medium">{selectedConv?.partnerName}</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {thread.map((msg) => {
                    const isMine = msg.sender_id === profile?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-secondary text-secondary-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.body}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                      className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
