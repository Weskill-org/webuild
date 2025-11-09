import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "@/integrations/firebase/client";

export default function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    return res.user;
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  }, []);

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  } as const;
}
