import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const ProfileSettings = () => {
  const { profile, updateProfile, uploadAvatar, user } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    university: "",
    company_name: "",
    website: "",
    linkedin: "",
    bio: "",
    skills: "",
  });
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        university: profile.university ?? "",
        company_name: profile.company_name ?? "",
        website: profile.website ?? "",
        linkedin: profile.linkedin ?? "",
        bio: profile.bio ?? "",
        skills: (profile.skills ?? []).join(", "),
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        full_name: form.full_name || null,
        university: form.university || null,
        company_name: form.company_name || null,
        website: form.website || null,
        linkedin: form.linkedin || null,
        bio: form.bio || null,
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
      });

      if (file) {
        await uploadAvatar(file);
      }

      toast({ title: "Profile updated" });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
        <Card className="p-6">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center overflow-hidden">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-foreground font-bold text-xl">
                    {profile?.full_name?.[0] || profile?.company_name?.[0] || "?"}
                  </span>
                )}
              </div>
              <div>
                <Label htmlFor="avatar" className="cursor-pointer text-primary hover:underline text-sm">
                  Change photo
                </Label>
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file && <p className="text-xs text-muted-foreground mt-1">{file.name}</p>}
              </div>
            </div>

            <div className="space-y-1 pb-2">
              <div className="text-sm text-muted-foreground">
                Email: <span className="font-medium text-foreground">{user?.email ?? "—"}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Role: <span className="capitalize font-medium text-foreground">{profile?.role ?? "—"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>

            {profile?.role === "company" && (
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>
            )}

            {profile?.role === "campus" && (
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Input
                  id="university"
                  value={form.university}
                  onChange={(e) => setForm({ ...form, university: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Input
                id="skills"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="React, TypeScript, Design..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={form.linkedin}
                onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;
