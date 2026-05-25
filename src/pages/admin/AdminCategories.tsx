import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AdminCategorySubcategoriesDialog } from "@/components/admin/AdminCategorySubcategoriesDialog";

interface Category {
  id: string; name: string; slug: string; description: string | null;
  icon: string | null; color: string | null; display_order: number;
  is_enabled: boolean; created_at: string; subcount?: number;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcounts, setSubcounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [subcategoriesDialogCat, setSubcategoriesDialogCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", icon: "", color: "", display_order: 0 });

  const fetchData = async () => {
    setLoading(true);
    const [catRes, subRes] = await Promise.all([
      supabase.from("admin_categories").select("*").order("display_order"),
      supabase.from("admin_subcategories").select("category_id"),
    ]);
    setCategories((catRes.data ?? []) as Category[]);
    const counts: Record<string, number> = {};
    (subRes.data ?? []).forEach((s: any) => { counts[s.category_id] = (counts[s.category_id] || 0) + 1; });
    setSubcounts(counts);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", icon: "", color: "", display_order: categories.length + 1 });
    setShowDialog(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || "", icon: cat.icon || "", color: cat.color || "", display_order: cat.display_order });
    setShowDialog(true);
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const slug = form.slug || generateSlug(form.name);
    const payload = { name: form.name.trim(), slug, description: form.description || null, icon: form.icon || null, color: form.color || null, display_order: form.display_order, updated_at: new Date().toISOString() };

    if (editing) {
      const { error } = await supabase.from("admin_categories").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Category updated" });
    } else {
      const { error } = await supabase.from("admin_categories").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Category created" });
    }
    setShowDialog(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("admin_categories").delete().eq("id", deleteTarget.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setDeleteTarget(null);
    toast({ title: "Category deleted" });
    fetchData();
  };

  const handleToggle = async (cat: Category) => {
    const { error } = await supabase.from("admin_categories").update({ is_enabled: !cat.is_enabled }).eq("id", cat.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCategories(categories.map(c => c.id === cat.id ? { ...c, is_enabled: !c.is_enabled } : c));
    toast({ title: `Category ${!cat.is_enabled ? "enabled" : "disabled"}` });
  };

  const filtered = categories.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Categories Management</h1><p className="text-muted-foreground text-sm mt-1">Manage project categories</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Category</Button>
      </div>

      <Card className="p-4">
        <div className="mb-4"><div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div></div>

        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead className="py-4">Category</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Subcategories</TableHead>
            <TableHead className="w-[100px]">Order</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="text-right pr-6">Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {filtered.map((cat) => (
              <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors group/row">
                <TableCell><div className="flex items-center gap-2">
                  {cat.color && <div className={`w-3 h-3 rounded-full ${cat.color.split(" ")[0]}`} />}
                  <span className="font-medium text-sm">{cat.name}</span>
                </div></TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono">{cat.slug}</TableCell>
                <TableCell>
                  <button 
                    onClick={() => setSubcategoriesDialogCat(cat)} 
                    className="group flex items-center gap-2 hover:opacity-100 transition-all focus:outline-none"
                    title="Manage Subcategories"
                  >
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer h-7 min-w-[32px] justify-center rounded-full font-bold group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md transition-all duration-200"
                    >
                      {subcounts[cat.id] || 0}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                      Subcategories
                    </span>
                  </button>
                </TableCell>
                <TableCell className="text-sm font-medium">{cat.display_order}</TableCell>
                <TableCell><Switch checked={cat.is_enabled} onCheckedChange={() => handleToggle(cat)} className="scale-90" /></TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => openEdit(cat)} aria-label="Edit category"><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(cat)} aria-label="Delete category"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No categories found.</TableCell></TableRow>}
          </TableBody></Table></div>
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || generateSlug(e.target.value) })} placeholder="e.g. Technical" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Slug</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" className="font-mono" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">Icon (Lucide name)</label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. Code" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Display Order</label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Color Classes</label>
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. bg-blue-500/10 text-blue-600 border-blue-500/20" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete Category</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also delete {subcounts[deleteTarget?.id || ""] || 0} subcategories.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminCategorySubcategoriesDialog
        category={subcategoriesDialogCat}
        open={!!subcategoriesDialogCat}
        onOpenChange={(open) => !open && setSubcategoriesDialogCat(null)}
        onUpdateCounts={fetchData}
      />
    </div>
  );
}
