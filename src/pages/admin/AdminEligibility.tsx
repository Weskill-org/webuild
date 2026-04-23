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
import { Plus, Pencil, Trash2, Search, Loader2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "dropdown", label: "Dropdown" },
  { value: "multi_select", label: "Multi-select" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio" },
];

const OPTION_FIELD_TYPES = ["dropdown", "multi_select", "radio"];

interface Criterion {
  id: string; label: string; field_type: string; options: string[];
  is_required: boolean; is_enabled: boolean; category: string | null;
  display_order: number; created_at: string;
}

export default function AdminEligibility() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Criterion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Criterion | null>(null);
  const [form, setForm] = useState({ label: "", field_type: "checkbox", options: [] as string[], is_required: false, category: "", display_order: 0 });
  const [newOption, setNewOption] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("admin_eligibility_criteria").select("*").order("display_order");
    setCriteria((data ?? []).map((d: any) => ({ ...d, options: Array.isArray(d.options) ? d.options : [] })) as Criterion[]);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const uniqueCategories = [...new Set(criteria.map(c => c.category).filter(Boolean))] as string[];

  const openCreate = () => {
    setEditing(null);
    setForm({ label: "", field_type: "checkbox", options: [], is_required: false, category: "", display_order: criteria.length + 1 });
    setShowDialog(true);
  };
  const openEdit = (c: Criterion) => {
    setEditing(c);
    setForm({ label: c.label, field_type: c.field_type, options: [...c.options], is_required: c.is_required, category: c.category || "", display_order: c.display_order });
    setShowDialog(true);
  };

  const addOption = () => {
    if (newOption.trim() && !form.options.includes(newOption.trim())) {
      setForm({ ...form, options: [...form.options, newOption.trim()] });
      setNewOption("");
    }
  };

  const removeOption = (opt: string) => {
    setForm({ ...form, options: form.options.filter(o => o !== opt) });
  };

  const handleSave = async () => {
    if (!form.label.trim()) { toast({ title: "Label is required", variant: "destructive" }); return; }
    const payload = {
      label: form.label.trim(), field_type: form.field_type,
      options: OPTION_FIELD_TYPES.includes(form.field_type) ? form.options : [],
      is_required: form.is_required, category: form.category || null,
      display_order: form.display_order, updated_at: new Date().toISOString(),
    };
    if (editing) {
      const { error } = await supabase.from("admin_eligibility_criteria").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Criterion updated" });
    } else {
      const { error } = await supabase.from("admin_eligibility_criteria").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Criterion created" });
    }
    setShowDialog(false); fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("admin_eligibility_criteria").delete().eq("id", deleteTarget.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setDeleteTarget(null); toast({ title: "Criterion deleted" }); fetchData();
  };

  const handleToggle = async (c: Criterion, field: "is_enabled" | "is_required") => {
    const val = field === "is_enabled" ? !c.is_enabled : !c.is_required;
    const { error } = await supabase.from("admin_eligibility_criteria").update({ [field]: val }).eq("id", c.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCriteria(criteria.map(x => x.id === c.id ? { ...x, [field]: val } : x));
  };

  const filtered = criteria.filter(c =>
    (!search || c.label.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter === "all" || c.category === catFilter)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Eligibility Criteria Management</h1><p className="text-muted-foreground text-sm mt-1">Dynamic fields for project eligibility</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Criterion</Button>
      </div>
      <Card className="p-4">
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search criteria..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by group" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Groups</SelectItem>
              {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>Label</TableHead><TableHead>Type</TableHead><TableHead>Group</TableHead>
            <TableHead>Required</TableHead><TableHead>Enabled</TableHead><TableHead>Order</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-sm">{c.label}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{c.field_type.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.category || "—"}</TableCell>
                <TableCell><Switch checked={c.is_required} onCheckedChange={() => handleToggle(c, "is_required")} /></TableCell>
                <TableCell><Switch checked={c.is_enabled} onCheckedChange={() => handleToggle(c, "is_enabled")} /></TableCell>
                <TableCell className="text-sm">{c.display_order}</TableCell>
                <TableCell><div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3 h-3" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No criteria found.</TableCell></TableRow>}
          </TableBody></Table></div>
        )}
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? "Edit Criterion" : "Add Criterion"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Label *</label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Minimum Education" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">Field Type *</label>
                <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Group/Category</label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Education" /></div>
            </div>
            {OPTION_FIELD_TYPES.includes(form.field_type) && (
              <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
                <label className="text-sm font-medium">Options</label>
                <div className="flex gap-2"><Input value={newOption} onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }} placeholder="Add option..." className="h-8 text-sm" />
                  <Button type="button" size="sm" variant="outline" onClick={addOption} className="h-8">Add</Button></div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.options.map(opt => (
                    <Badge key={opt} variant="secondary" className="pl-2 pr-1 py-0.5 gap-1 cursor-pointer" onClick={() => removeOption(opt)}>
                      {opt}<X className="w-3 h-3" /></Badge>
                  ))}
                  {form.options.length === 0 && <p className="text-xs text-muted-foreground">No options added yet.</p>}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Switch checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: v })} />
                <label className="text-sm">Required field</label></div>
              <div className="space-y-1"><label className="text-sm font-medium">Order</label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="w-20 h-8" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete Criterion</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deleteTarget?.label}</strong>?</p>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
