import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (userId: string) => void;
}

export default function NewConversationModal({
  open,
  onOpenChange,
  onSelect,
}: NewConversationModalProps) {
  const { profile: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, university, role, logo_url")
        .or(`full_name.ilike.%${search}%,company_name.ilike.%${search}%,university.ilike.%${search}%`)
        .neq("id", currentUser?.id)
        .limit(10);
      setResults(data ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, currentUser?.id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">New Message</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, or university..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Searching...</div>
            ) : results.length > 0 ? (
              results.map((res) => (
                <button
                  key={res.id}
                  onClick={() => {
                    onSelect(res.id);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {res.logo_url ? (
                      <img src={res.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary font-bold">{(res.full_name || res.company_name)?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{res.full_name || res.company_name}</p>
                    <p className="text-xs text-muted-foreground truncate capitalize">
                      {res.role} {res.university ? `• ${res.university}` : ""}
                    </p>
                  </div>
                </button>
              ))
            ) : search.length >= 2 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Type at least 2 characters to search</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
