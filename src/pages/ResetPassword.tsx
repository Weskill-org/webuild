import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { FieldError } from "@/components/auth/FieldError";
import { supabase } from "@/integrations/supabase/client";
import weskillLogo from "@/assets/weskill logo.avif";


const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Whether the recovery token is valid
  const [tokenValid, setTokenValid] = useState<boolean | null>(null); // null = checking

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setTokenValid(true);
      }
    });

    // Also check if user already has a session (e.g. page was refreshed after clicking the link)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setTokenValid(true);
      } else {
        // Give the auth state change listener a moment to fire
        setTimeout(() => {
          setTokenValid((prev) => (prev === null ? false : prev));
        }, 2000);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const validateField = useCallback(
    (field: string) => {
      if (field === "password") {
        if (password.length > 0 && password.length < 6) {
          setErrors((prev) => ({ ...prev, password: "Password must be at least 6 characters." }));
        } else {
          setErrors((prev) => ({ ...prev, password: null }));
        }
        // Also re-check confirm
        if (confirmPassword && confirmPassword !== password) {
          setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match." }));
        } else if (confirmPassword) {
          setErrors((prev) => ({ ...prev, confirmPassword: null }));
        }
      }
      if (field === "confirmPassword") {
        if (confirmPassword && confirmPassword !== password) {
          setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match." }));
        } else {
          setErrors((prev) => ({ ...prev, confirmPassword: null }));
        }
      }
    },
    [password, confirmPassword]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match." }));
      return;
    }
    if (password.length < 6) {
      setErrors((prev) => ({ ...prev, password: "Password must be at least 6 characters." }));
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      navigate("/login");
    } catch (err: any) {
      if (err?.code === "session_expired") {
        setTokenValid(false);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: err instanceof Error ? err.message : "Could not update password",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Expired / invalid link screen
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed top-4 right-4 md:top-8 md:right-8 z-50">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md animate-fade-in">
          <Card className="p-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Link Expired</h1>
                <p className="text-muted-foreground text-sm">
                  This password reset link has expired or is invalid. Please request a new one.
                </p>
              </div>
              <div className="space-y-3">
                <Button onClick={() => navigate("/forgot-password")} className="w-full">
                  Request New Reset Link
                </Button>
                <Button variant="ghost" onClick={() => navigate("/login")} className="w-full">
                  Back to Login
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state while checking token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed top-4 right-4 md:top-8 md:right-8 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md animate-fade-in">
        <Card className="p-8">
          <div className="text-center mb-8">
             <div className="w-12 h-12 rounded-xl bg-transparent flex items-center justify-center mx-auto mb-4 overflow-hidden">
               <img src={weskillLogo} alt="Weskill Logo" className="w-full h-full object-contain" />
             </div>
            <h1 className="text-2xl font-bold mb-2">Set New Password</h1>
            <p className="text-muted-foreground">Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <PasswordInput
                id="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => validateField("password")}
                required
                minLength={6}
              />
              <PasswordStrengthIndicator password={password} />
              <FieldError message={errors.password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => validateField("confirmPassword")}
                required
              />
              <FieldError message={errors.confirmPassword} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
