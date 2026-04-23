import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Category { id: string; name: string; slug: string; }
interface Subcategory {
  id: string; category_id: string; name: string; slug: string;
  description: string | null; display_order: number; is_enabled: boolean; created_at: string;
}

export default function AdminSubcategories() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Subcategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", category_id: "", display_order: 0 });

  const fetchData = async () => {
    setLoading(true);
    const [subRes, catRes] = await Promise.all([
      supabase.from("admin_subcategories").select("*").order("display_order"),
      supabase.from("admin_categories").select("id, name, slug").order("display_order"),
    ]);
    setSubcategories((subRes.data ?? []) as Subcategory[]);
    setCategories((catRes.data ?? []) as Category[]);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", category_id: categories[0]?.id || "", display_order: subcategories.length + 1 });
    setShowDialog(true);
  };
  const openEdit = (sub: Subcategory) => {
    setEditing(sub);
    setForm({ name: sub.name, slug: sub.slug, description: sub.description || "", category_id: sub.category_id, display_order: sub.display_order });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category_id) { toast({ title: "Name and category are required", variant: "destructive" }); return; }
    const slug = form.slug || generateSlug(form.name);
    const payload = { name: form.name.trim(), slug, description: form.description || null, category_id: form.category_id, display_order: form.display_order, updated_at: new Date().toISOString() };
    if (editing) {
      const { error } = await supabase.from("admin_subcategories").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Subcategory updated" });
    } else {
      const { error } = await supabase.from("admin_subcategories").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Subcategory created" });
    }
    setShowDialog(false); fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("admin_subcategories").delete().eq("id", deleteTarget.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setDeleteTarget(null); toast({ title: "Subcategory deleted" }); fetchData();
  };

  const handleToggle = async (sub: Subcategory) => {
    const { error } = await supabase.from("admin_subcategories").update({ is_enabled: !sub.is_enabled }).eq("id", sub.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSubcategories(subcategories.map(s => s.id === sub.id ? { ...s, is_enabled: !s.is_enabled } : s));
    toast({ title: `Subcategory ${!sub.is_enabled ? "enabled" : "disabled"}` });
  };

  const filtered = subcategories.filter(s =>
    (!search || s.name.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter === "all" || s.category_id === catFilter)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Subcategories Management</h1><p className="text-muted-foreground text-sm mt-1">Manage project subcategories linked to categories</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Subcategory</Button>
      </div>
      <Card className="p-4">
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search subcategories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by category" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Slug</TableHead>
            <TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {filtered.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium text-sm">{sub.name}</TableCell>
                <TableCell><Badge variant="outline">{catMap[sub.category_id] || "—"}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono">{sub.slug}</TableCell>
                <TableCell className="text-sm">{sub.display_order}</TableCell>
                <TableCell><Switch checked={sub.is_enabled} onCheckedChange={() => handleToggle(sub)} /></TableCell>
                <TableCell><div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(sub)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(sub)}><Trash2 className="w-3 h-3" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No subcategories found.</TableCell></TableRow>}
          </TableBody></Table></div>
        )}
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? "Edit Subcategory" : "Add Subcategory"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Parent Category *</label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || generateSlug(e.target.value) })} placeholder="e.g. Web Development" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Slug</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="font-mono" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Display Order</label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete Subcategory</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
