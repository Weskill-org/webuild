import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, AuthError } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export type { Profile };

/** Maps Supabase auth errors to user-friendly messages */
function friendlyAuthError(err: AuthError | Error): string {
  // Supabase AuthError has a `status` property
  const status = (err as AuthError)?.status;
  const msg = err.message?.toLowerCase() ?? "";

  // Rate-limited
  if (status === 429 || msg.includes("rate") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // Duplicate signup
  if (
    msg.includes("user already registered") ||
    msg.includes("already been registered") ||
    msg.includes("already exists")
  ) {
    return "ACCOUNT_EXISTS"; // sentinel — handled specially by the UI
  }

  // Invalid credentials
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Invalid email or password. Please try again.";
  }

  // Email not confirmed
  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
    return "EMAIL_NOT_CONFIRMED";
  }

  return err.message || "An unexpected error occurred. Please try again.";
}

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
          referral_code: profileData.referred_by_code,
        },
        emailRedirectTo: window.location.origin,
      }
    });

    if (authError) {
      const friendly = friendlyAuthError(authError);
      const err = new Error(friendly);
      (err as any).code = friendly === "ACCOUNT_EXISTS" ? "account_exists" : (authError as AuthError)?.status === 429 ? "rate_limited" : "auth_error";
      throw err;
    }

    // Supabase may return a user with identities=[] when the email already exists
    // but email confirmation is enabled (it does NOT throw an error in this case)
    if (
      authData.user &&
      authData.user.identities &&
      authData.user.identities.length === 0
    ) {
      const err = new Error("ACCOUNT_EXISTS");
      (err as any).code = "account_exists";
      throw err;
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
      const friendly = friendlyAuthError(error);
      const err = new Error(friendly);
      (err as any).code = friendly === "EMAIL_NOT_CONFIRMED"
        ? "email_not_confirmed"
        : (error as AuthError)?.status === 429
          ? "rate_limited"
          : "invalid_credentials";
      throw err;
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
    if (error) {
      const friendly = friendlyAuthError(error);
      throw new Error(friendly);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("session") || msg.includes("token") || msg.includes("expired")) {
        const err = new Error("Your reset link has expired. Please request a new one.");
        (err as any).code = "session_expired";
        throw err;
      }
      throw error;
    }
  }, []);

  const resendVerificationEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      const friendly = friendlyAuthError(error);
      throw new Error(friendly);
    }
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
    resendVerificationEmail,
  } as const;
}
