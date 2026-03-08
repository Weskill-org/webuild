import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowLeft } from "lucide-react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";
import type { Message } from "@/types/database";
import type { Conversation } from "@/hooks/use-chat";

interface Props {
  selectedPartner: string | null;
  selectedConv: Conversation | undefined;
  thread: Message[];
  profileId: string | undefined;
  isPartnerTyping: boolean;
  onBack: () => void;
  onSend: (body: string) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}

export default function ChatThread({
  selectedPartner,
  selectedConv,
  thread,
  profileId,
  isPartnerTyping,
  onBack,
  onSend,
  onTyping,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, isPartnerTyping]);

  return (
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
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              {selectedConv?.partnerAvatar ? (
                <img src={selectedConv.partnerAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-medium text-xs">
                  {selectedConv?.partnerName[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium">{selectedConv?.partnerName}</p>
              {isPartnerTyping && (
                <p className="text-xs text-primary animate-pulse">typing...</p>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {thread.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isMine={msg.sender_id === profileId} />
            ))}
            {isPartnerTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          <ChatInput onSend={onSend} onTyping={onTyping} />
        </>
      )}
    </Card>
  );
}
