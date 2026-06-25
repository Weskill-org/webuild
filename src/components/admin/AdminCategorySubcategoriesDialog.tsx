import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string; name: string; slug: string;
}

interface Subcategory {
  id: string; category_id: string; name: string; slug: string;
  description: string | null; display_order: number; is_enabled: boolean; created_at: string;
}

interface AdminCategorySubcategoriesDialogProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCounts: () => void;
}

export function AdminCategorySubcategoriesDialog({ category, open, onOpenChange, onUpdateCounts }: AdminCategorySubcategoriesDialogProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSubDialog, setShowSubDialog] = useState(false);
  const [editing, setEditing] = useState<Subcategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", display_order: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    if (!category?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("admin_subcategories")
      .select("*")
      .eq("category_id", category.id)
      .order("display_order");
    setSubcategories((data ?? []) as Subcategory[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open && category?.id) {
      fetchData();
    }
  }, [open, category?.id]);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", display_order: subcategories.length + 1 });
    setShowSubDialog(true);
  };

  const openEdit = (sub: Subcategory) => {
    setEditing(sub);
    setForm({ name: sub.name, slug: sub.slug, description: sub.description || "", display_order: sub.display_order });
    setShowSubDialog(true);
  };

  const handleSave = async () => {
    if (!category?.id) return;
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    
    setIsSaving(true);
    const slug = form.slug || generateSlug(form.name);
    const payload = { 
      name: form.name.trim(), 
      slug, 
      description: form.description || null, 
      category_id: category.id, 
      display_order: form.display_order, 
      updated_at: new Date().toISOString() 
    };

    try {
      if (editing) {
        const { error } = await supabase.from("admin_subcategories").update(payload).eq("id", editing.id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Subcategory updated" });
      } else {
        const { error } = await supabase.from("admin_subcategories").insert(payload);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Subcategory created" });
        onUpdateCounts();
      }
      setShowSubDialog(false);
      fetchData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("admin_subcategories").delete().eq("id", deleteTarget.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setDeleteTarget(null);
      toast({ title: "Subcategory deleted" });
      onUpdateCounts();
      fetchData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (sub: Subcategory) => {
    const { error } = await supabase.from("admin_subcategories").update({ is_enabled: !sub.is_enabled }).eq("id", sub.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSubcategories(subcategories.map(s => s.id === sub.id ? { ...s, is_enabled: !s.is_enabled } : s));
    toast({ title: `Subcategory ${!sub.is_enabled ? "enabled" : "disabled"}` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="text-xl font-bold">Subcategories</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage subcategories for <span className="text-primary font-medium">{category?.name}</span>
              </p>
            </div>
            <Button onClick={openCreate} size="sm" className="rounded-full px-4 shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Subcategory
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4 min-h-[300px]">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary/60" /></div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[40%]">Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="w-[80px]">Order</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subcategories.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-sm">{sub.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{sub.slug}</TableCell>
                      <TableCell className="text-sm">{sub.display_order}</TableCell>
                      <TableCell><Switch checked={sub.is_enabled} onCheckedChange={() => handleToggle(sub)} aria-label={`Toggle ${sub.name}`} className="scale-75" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(sub)} aria-label="Edit subcategory"><Pencil className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(sub)} aria-label="Delete subcategory"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subcategories.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No subcategories found for this category.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Nested Create/Edit Dialog */}
      <Dialog open={showSubDialog} onOpenChange={setShowSubDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Subcategory" : "Add Subcategory"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || generateSlug(e.target.value) })} placeholder="e.g. Web Development" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Order</label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubDialog(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Subcategory</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isSaving}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
