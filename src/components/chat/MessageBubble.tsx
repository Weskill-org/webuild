import { Check, CheckCheck } from "lucide-react";
import type { Message } from "@/types/database";

interface Props {
  message: Message;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: Props) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
          isMine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.body}</p>
        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
          <p className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {message.created_at
              ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : ""}
          </p>
          {isMine && (
            message.read ? (
              <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/80" />
            ) : (
              <Check className="w-3.5 h-3.5 text-primary-foreground/50" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
