import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export type { Profile };

export default function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, retries = 3): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    const p = data as unknown as Profile;

    // If role is still null and we have retries left, the DB trigger may not have fired yet
    if (!p.role && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return fetchProfile(userId, retries - 1);
    }

    setProfile(p);
    return p;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('getSession error', error);
        }

        const session = data?.session;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('getSession exception', err);
      } finally {
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Fire-and-forget to avoid deadlock in onAuthStateChange
        fetchProfile(session.user.id).catch(err =>
          console.error('onAuthStateChange fetchProfile error', err)
        );
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    profileData: Partial<Omit<Profile, "id" | "created_at">>
  ) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: profileData.full_name,
          role: profileData.role,
          company_name: profileData.company_name,
          university: profileData.university,
        },
        emailRedirectTo: window.location.origin,
      }
    });

    if (authError) {
      throw authError;
    }

    // If there's no session, email confirmation is required
    if (!authData.session) {
      return { user: authData.user ?? null, requiresConfirmation: true } as const;
    }

    // Session exists — explicitly upsert the profile so the UI has data immediately
    // (avoids race conditions where the DB trigger hasn't fired yet)
    if (authData.user) {
      const { data: upsertedProfile, error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: authData.user.id,
          email,
          full_name: profileData.full_name ?? null,
          role: profileData.role ?? "student",
          company_name: profileData.company_name ?? null,
          university: profileData.university ?? null,
        }, { onConflict: "id" })
        .select()
        .single();

      if (!upsertError && upsertedProfile) {
        setProfile(upsertedProfile as unknown as Profile);
      }
    }

    return { user: authData.user } as const;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Failed to sign in - no user returned");
    }

    setUser(data.user);
    const profile = await fetchProfile(data.user.id);
    return { user: data.user, profile };
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/dashboard"
      }
    });

    if (error) {
      throw error;
    }

    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Omit<Profile, "id">>) => {
    if (!user) throw new Error("No user logged in");

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data as unknown as Profile);
    return data as unknown as Profile;
  }, [user]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!user) throw new Error("No user logged in");
    if (!file) throw new Error("No file provided");

    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl ?? null;

    await updateProfile({ logo_url: publicUrl });
    return publicUrl;
  }, [user, updateProfile]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    updateProfile,
    uploadAvatar,
    resetPassword,
    updatePassword,
  } as const;
}
