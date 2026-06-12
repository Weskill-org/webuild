import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, CheckCircle, XCircle, Coins, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [rRes, pRes] = await Promise.all([
        supabase.from("referrals").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email, referral_code"),
      ]);
      setReferrals(rRes.data ?? []);
      const map: Record<string, string> = {};
      (pRes.data ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.email || "—"; });
      setProfiles(map);
      setLoading(false);
    })();
  }, []);

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("referrals").update({ status: "revoked" }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setReferrals(referrals.map((r) => (r.id === id ? { ...r, status: "revoked" } : r)));
    toast({ title: "Referral revoked" });
  };

  const { completedCount, revokedCount, totalRewards } = useMemo(() => {
    return referrals.reduce((acc, r) => {
      if (r.status === "completed") {
        acc.completedCount++;
        acc.totalRewards += (r.referrer_reward ?? 0) + (r.referred_reward ?? 0);
      } else if (r.status === "revoked") {
        acc.revokedCount++;
      }
      return acc;
    }, { completedCount: 0, revokedCount: 0, totalRewards: 0 });
  }, [referrals]);

  const filtered = useMemo(() => {
    return referrals.filter((r) => {
    const referrerName = profiles[r.referrer_id] || "";
    const referredName = profiles[r.referred_id] || "";
    return (!search || referrerName.toLowerCase().includes(search.toLowerCase()) || referredName.toLowerCase().includes(search.toLowerCase()) || (r.referral_code || "").toLowerCase().includes(search.toLowerCase())) &&
           (statusFilter === "all" || r.status === statusFilter);
    });
  }, [referrals, profiles, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Referrals</h1><p className="text-muted-foreground text-sm mt-1">Track and manage referral program</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{referrals.length}</p></div><UserPlus className="w-6 h-6 text-primary opacity-70" /></div></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Successful</p><p className="text-2xl font-bold text-green-600">{completedCount}</p></div><CheckCircle className="w-6 h-6 text-green-500 opacity-70" /></div></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Rewards</p><p className="text-2xl font-bold text-amber-600">{totalRewards} coins</p></div><Coins className="w-6 h-6 text-amber-500 opacity-70" /></div></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Revoked</p><p className="text-2xl font-bold text-red-600">{revokedCount}</p></div><XCircle className="w-6 h-6 text-red-500 opacity-70" /></div></Card>
      </div>
      <Card className="p-4">
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search referrals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="all">All Status</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent></Select>
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>Referrer</TableHead><TableHead>Referred</TableHead><TableHead>Code</TableHead><TableHead>Status</TableHead><TableHead>Reward</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm font-medium">{profiles[r.referrer_id] || "—"}</TableCell>
                <TableCell className="text-sm">{profiles[r.referred_id] || "—"}</TableCell>
                <TableCell className="text-sm font-mono">{r.referral_code}</TableCell>
                <TableCell><Badge variant={r.status === "completed" ? "default" : r.status === "revoked" ? "destructive" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
                <TableCell className="text-sm">{r.referrer_reward ?? 0} coins</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{r.status === "completed" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRevoke(r.id)}><XCircle className="w-3 h-3 mr-1" /> Revoke</Button>}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No referrals found.</TableCell></TableRow>}
          </TableBody></Table></div>
        )}
      </Card>
    </div>
  );
}
