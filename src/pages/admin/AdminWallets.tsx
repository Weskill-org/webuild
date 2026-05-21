import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";

const inr = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function AdminWallets() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [wRes, pRes] = await Promise.all([
        supabase.from("wallets").select("*").order("balance", { ascending: false }),
        supabase.from("profiles").select("id, full_name, company_name, role"),
      ]);
      setWallets(wRes.data ?? []);
      const map: Record<string, any> = {};
      (pRes.data ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
      setLoading(false);
    })();
  }, []);

  const filtered = wallets.filter((w) => {
    const p = profiles[w.owner_id];
    const name = p?.full_name || p?.company_name || "";
    return !search || name.toLowerCase().includes(search.toLowerCase());
  });

  const totalBalance = wallets.reduce((s, w) => s + (w.balance ?? 0), 0);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Wallet Management</h1><p className="text-muted-foreground text-sm mt-1">Monitor user wallet balances</p></div>
      <Card className="p-4"><p className="text-sm text-muted-foreground">Total Platform Balance</p><p className="text-3xl font-bold text-primary">{inr(totalBalance)}</p></Card>
      <Card className="p-4">
        <div className="mb-4 max-w-sm relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by user name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Balance</TableHead><TableHead>Currency</TableHead><TableHead>Last Updated</TableHead>
          </TableRow></TableHeader><TableBody>
            {filtered.map((w) => {
              const p = profiles[w.owner_id];
              return (
                <TableRow key={w.id}>
                  <TableCell className="text-sm font-medium">{p?.full_name || p?.company_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{p?.role || "—"}</Badge></TableCell>
                  <TableCell className="text-sm font-semibold">{inr(w.balance ?? 0)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{w.currency || "INR"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(w.updated_at).toLocaleDateString()}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No wallets found.</TableCell></TableRow>}
          </TableBody></Table></div>
        )}
      </Card>
    </div>
  );
}
