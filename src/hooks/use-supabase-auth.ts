import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

export default function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session (wrapped to ensure loading is cleared)
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('getSession error', error);
        }

        const session = (data as any)?.session;
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

    // Listen for auth changes
    const onAuth = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('onAuthStateChange handler error', err);
      } finally {
        setLoading(false);
      }
    });

    const subscription = (onAuth as any)?.data?.subscription ?? (onAuth as any)?.subscription ?? onAuth;

    return () => {
      try {
        subscription?.unsubscribe?.();
      } catch (err) {
        // ignore
      }
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      setLoading(false);
      return null;
    }

    setProfile(data);
    setLoading(false);
    return data;
  };

  const signUp = useCallback(async (email: string, password: string, profileData: Omit<ProfileInsert, "id">) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw authError;
    }

    // If the signup flow requires email confirmation, `authData.user` may be null
    // and no session will be available. In that case we should not attempt to insert
    // into `profiles` (RLS will block it). Return an object indicating confirmation is required.
    if (!authData.user) {
      return { user: null, requiresConfirmation: true } as const;
    }

    const user = authData.user;

    // Try to create profile. This may fail if RLS/policies require auth.uid() to match and
    // the client isn't authenticated yet (depending on your Supabase settings). If profile
    // insertion fails, return the error so the UI can surface it and the user can retry
    // after confirming email / signing in.
    const { error: profileError } = await supabase
      .from("profiles")
      .insert([{ id: user.id, ...profileData }]);

    if (profileError) {
      // Return a structured error instead of throwing so the UI can handle flows where
      // profile creation must happen after email confirmation or from an authenticated session.
      return { user, profileError } as const;
    }

    return { user } as const;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Important: Reset loading state before starting sign in
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        throw error || new Error("Failed to sign in");
      }

      const profile = await fetchProfile(data.user.id);
      
      // Set the user state immediately
      setUser(data.user);
      setProfile(profile);
      
      return { user: data.user, profile };
    } finally {
      setLoading(false);
    }
  }, []);

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
    setProfile(data);
    return data;
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

    // Create a public URL (bucket must be public) or use signed URL if private
    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl ?? null;

    // Persist logo_url to profile
    await updateProfile({ logo_url: publicUrl });
    return publicUrl;
  }, [user, updateProfile]);

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    updateProfile,
  } as const;
}