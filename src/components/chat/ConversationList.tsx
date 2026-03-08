import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageSquare, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Conversation } from "@/hooks/use-chat";

interface Props {
  conversations: Conversation[];
  selectedPartner: string | null;
  onSelect: (partnerId: string) => void;
  loading: boolean;
}

export default function ConversationList({ conversations, selectedPartner, onSelect, loading }: Props) {
  const [search, setSearch] = useState("");
  const filtered = conversations.filter(
    (c) => !search || c.partnerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
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
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No conversations</p>
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.partnerId}
              onClick={() => onSelect(c.partnerId)}
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
  );
}
