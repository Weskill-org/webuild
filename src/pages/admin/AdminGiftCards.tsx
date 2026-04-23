import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const inr = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function AdminGiftCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("gift_cards").select("*").order("created_at", { ascending: false });
      setCards(data ?? []);
      setLoading(false);
    })();
  }, []);

  const handleCreate = async () => {
    const code = newCode.trim().toUpperCase();
    const amount = parseFloat(newAmount);
    if (!code || isNaN(amount) || amount <= 0) { toast({ title: "Invalid input", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("gift_cards").insert({ code, amount, created_by: user?.id }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCards([data, ...cards]);
    setNewCode(""); setNewAmount(""); setShowCreate(false);
    toast({ title: "Gift card created" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Gift Cards</h1><p className="text-muted-foreground text-sm mt-1">Create and manage gift cards</p></div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Create Gift Card</Button>
      </div>
      <Card className="p-4">
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead>
          </TableRow></TableHeader><TableBody>
            {cards.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.code}</TableCell>
                <TableCell className="text-sm">{inr(c.amount)}</TableCell>
                <TableCell>{c.redeemed ? <Badge variant="secondary">Redeemed</Badge> : <Badge variant="outline">Available</Badge>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {cards.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No gift cards yet.</TableCell></TableRow>}
          </TableBody></Table></div>
        )}
      </Card>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent><DialogHeader><DialogTitle>Create Gift Card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Code (e.g. GIFT100)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
            <Input placeholder="Amount (₹)" type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={handleCreate}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
