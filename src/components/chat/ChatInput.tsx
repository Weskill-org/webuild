import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface Props {
  onSend: (body: string) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}

export default function ChatInput({ onSend, onTyping }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback(
    (text: string) => {
      setValue(text);
      onTyping(true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => onTyping(false), 2000);
    },
    [onTyping]
  );

  const handleSend = async () => {
    if (!value.trim()) return;
    setSending(true);
    try {
      await onSend(value);
      setValue("");
      onTyping(false);
      clearTimeout(typingTimeout.current);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3 border-t border-border">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={sending || !value.trim()} size="icon">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
