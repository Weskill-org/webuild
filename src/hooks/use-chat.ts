import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import type { Message, Profile } from "@/types/database";

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastDate: string;
  unread: number;
}

export function useChat() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch conversations
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
      const convMap = new Map<string, Message[]>();
      allMessages.forEach((m) => {
        const partnerId = m.sender_id === profile.id ? m.recipient_id : m.sender_id;
        if (!convMap.has(partnerId)) convMap.set(partnerId, []);
        convMap.get(partnerId)!.push(m);
      });

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

      setConversations((prev) =>
        prev.map((c) => (c.partnerId === selectedPartner ? { ...c, unread: 0 } : c))
      );
    })();
  }, [profile, selectedPartner]);

  // Realtime messages subscription
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as unknown as Message;
        if (msg.sender_id !== profile.id && msg.recipient_id !== profile.id) return;

        const partnerId = msg.sender_id === profile.id ? msg.recipient_id : msg.sender_id;
        if (partnerId === selectedPartner) {
          setThread((prev) => [...prev, msg]);
          // Auto mark as read
          if (msg.recipient_id === profile.id) {
            supabase.from("messages").update({ read: true }).eq("id", msg.id).then();
          }
        }

        setConversations((prev) => {
          const existing = prev.find((c) => c.partnerId === partnerId);
          if (existing) {
            return prev
              .map((c) =>
                c.partnerId === partnerId
                  ? {
                      ...c,
                      lastMessage: msg.body.slice(0, 80),
                      lastDate: msg.created_at || "",
                      unread: partnerId === selectedPartner ? 0 : c.unread + 1,
                    }
                  : c
              )
              .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
          }
          return prev;
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updated = payload.new as unknown as Message;
        // Update read status in thread
        setThread((prev) => prev.map((m) => (m.id === updated.id ? { ...m, read: updated.read } : m)));
      })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [profile, selectedPartner]);

  // Presence channel for typing indicators
  useEffect(() => {
    if (!profile || !selectedPartner) {
      presenceChannelRef.current?.unsubscribe();
      presenceChannelRef.current = null;
      setTypingUsers(new Set());
      return;
    }

    const roomId = [profile.id, selectedPartner].sort().join(":");
    const presenceChannel = supabase.channel(`typing:${roomId}`, {
      config: { presence: { key: profile.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const typing = new Set<string>();
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== profile.id && Array.isArray(presences)) {
            presences.forEach((p: any) => {
              if (p.is_typing) typing.add(key);
            });
          }
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ is_typing: false });
        }
      });

    presenceChannelRef.current = presenceChannel;
    return () => {
      presenceChannel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [profile, selectedPartner]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (presenceChannelRef.current) {
      await presenceChannelRef.current.track({ is_typing: isTyping });
    }
  }, []);

  const sendMessage = useCallback(async (body: string) => {
    if (!body.trim() || !profile || !selectedPartner) return;
    await supabase.from("messages").insert({
      sender_id: profile.id,
      recipient_id: selectedPartner,
      body: body.trim(),
    });
    setTyping(false);
  }, [profile, selectedPartner, setTyping]);

  const isPartnerTyping = selectedPartner ? typingUsers.has(selectedPartner) : false;

  return {
    conversations,
    selectedPartner,
    setSelectedPartner,
    thread,
    loading,
    sendMessage,
    setTyping,
    isPartnerTyping,
  };
}
