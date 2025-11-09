import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const ProfileSettings = () => {
  const { profile, updateProfile, uploadAvatar } = useAuth() as any;
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    role: profile?.role ?? "student",
    university: profile?.university ?? "",
    company_name: profile?.company_name ?? "",
    website: profile?.website ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setForm({
      full_name: profile?.full_name ?? "",
      role: profile?.role ?? "student",
      university: profile?.university ?? "",
      company_name: profile?.company_name ?? "",
      website: profile?.website ?? "",
    });
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        full_name: form.full_name || null,
        role: form.role,
        university: form.university || null,
        company_name: form.company_name || null,
        website: form.website || null,
      });

      if (file) {
        await uploadAvatar(file);
      }

      toast({ title: "Profile updated" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Failed to update profile", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl animate-fade-in">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-md border px-3 py-2">
                <option value="student">Student / Freelancer</option>
                <option value="company">Company</option>
                <option value="campus">Campus</option>
              </select>
            </div>

            {form.role === "company" && (
              <div className="space-y-2">
                <Label htmlFor="company_name">Company name</Label>
                <Input id="company_name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
            )}

            {form.role === "campus" && (
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Input id="university" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar</Label>
              <input id="avatar" type="file" accept="image/*" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
              {profile?.logo_url && (
                <img src={profile.logo_url} alt="avatar" className="w-24 h-24 rounded-full mt-2 object-cover" />
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
              <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings;
