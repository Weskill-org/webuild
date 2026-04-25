import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Gift, AlertTriangle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { FieldError } from "@/components/auth/FieldError";
import weskillLogo from "@/assets/weskill logo.avif";


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Signup = () => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "student";
  const refCodeFromUrl = searchParams.get("ref") || "";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    companyName: "",
    universityName: "",
    referralCode: refCodeFromUrl,
  });

  // Inline validation errors
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  // Account-exists banner
  const [accountExists, setAccountExists] = useState(false);

  /** Set a single field error (or clear it) */
  const setFieldError = useCallback((field: string, msg: string | null) => {
    setErrors((prev) => ({ ...prev, [field]: msg }));
  }, []);

  /** Validate a single field on blur */
  const validateField = useCallback(
    (field: string) => {
      switch (field) {
        case "fullName":
          if (role === "student" && !formData.fullName.trim()) {
            setFieldError("fullName", "Full name is required.");
          } else {
            setFieldError("fullName", null);
          }
          break;
        case "companyName":
          if (role === "company" && !formData.companyName.trim()) {
            setFieldError("companyName", "Company name is required.");
          } else {
            setFieldError("companyName", null);
          }
          break;
        case "universityName":
          if (role === "campus" && !formData.universityName.trim()) {
            setFieldError("universityName", "University name is required.");
          } else {
            setFieldError("universityName", null);
          }
          break;
        case "email":
          if (!formData.email.trim()) {
            setFieldError("email", "Email is required.");
          } else if (!EMAIL_REGEX.test(formData.email)) {
            setFieldError("email", "Please enter a valid email address.");
          } else {
            setFieldError("email", null);
          }
          break;
        case "password":
          if (formData.password.length > 0 && formData.password.length < 6) {
            setFieldError("password", "Password must be at least 6 characters.");
          } else {
            setFieldError("password", null);
          }
          // Also re-check confirm match
          if (formData.confirmPassword && formData.confirmPassword !== formData.password) {
            setFieldError("confirmPassword", "Passwords do not match.");
          } else if (formData.confirmPassword) {
            setFieldError("confirmPassword", null);
          }
          break;
        case "confirmPassword":
          if (formData.confirmPassword && formData.confirmPassword !== formData.password) {
            setFieldError("confirmPassword", "Passwords do not match.");
          } else {
            setFieldError("confirmPassword", null);
          }
          break;
      }
    },
    [formData, role, setFieldError]
  );

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountExists(false);

    // Run all validations
    if (formData.password !== formData.confirmPassword) {
      setFieldError("confirmPassword", "Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
      setFieldError("password", "Password must be at least 6 characters.");
      return;
    }
    if (!EMAIL_REGEX.test(formData.email)) {
      setFieldError("email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        role: role as 'student' | 'company' | 'campus',
        full_name: role === 'student' ? formData.fullName : null,
        university: role === 'campus' ? formData.universityName : null,
        company_name: role === 'company' ? formData.companyName : null,
        referred_by_code: formData.referralCode.trim().toUpperCase() || null,
      };

      const res = await signUp(formData.email, formData.password, profileData);

      if (res?.requiresConfirmation) {
        // Navigate to dedicated verify-email page
        navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
        return;
      }

      if (res?.user) {
        toast({
          title: "Account created!",
          description: "Welcome to Webuild. Redirecting to your dashboard.",
        });
        navigate("/dashboard");
        return;
      }
    } catch (err: any) {
      console.error("Signup failed:", err);

      if (err?.code === "account_exists" || err?.message === "ACCOUNT_EXISTS") {
        // Show inline banner instead of just a toast
        setAccountExists(true);
      } else {
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: err instanceof Error ? err.message : "Please try again or contact support",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleTitle = () => {
    switch(role) {
      case "company": return "Company";
      case "campus": return "Campus";
      default: return "Student / Freelancer";
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <div className="fixed top-4 right-4 md:top-8 md:right-8 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/role-selection")}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
             <div className="w-12 h-12 rounded-xl bg-transparent flex items-center justify-center mx-auto mb-4 overflow-hidden">
               <img src={weskillLogo} alt="Weskill Logo" className="w-full h-full object-contain" />
             </div>
            <h1 className="text-2xl font-bold mb-2">Create Account</h1>
            <p className="text-muted-foreground">Join as {getRoleTitle()}</p>
          </div>

          {/* Account-exists banner */}
          {accountExists && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                    This account already exists.
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Please{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
                    >
                      log in
                    </button>
                    {" "}or use{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
                    >
                      Forgot Password
                    </button>
                    {" "}to recover your account.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {role === "student" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  onBlur={() => validateField("fullName")}
                  required
                />
                <FieldError message={errors.fullName} />
              </div>
            )}

            {role === "company" && (
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Inc."
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  onBlur={() => validateField("companyName")}
                  required
                />
                <FieldError message={errors.companyName} />
              </div>
            )}

            {role === "campus" && (
              <div className="space-y-2">
                <Label htmlFor="universityName">University Name</Label>
                <Input
                  id="universityName"
                  placeholder="University of Example"
                  value={formData.universityName}
                  onChange={(e) => setFormData({...formData, universityName: e.target.value})}
                  onBlur={() => validateField("universityName")}
                  required
                />
                <FieldError message={errors.universityName} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({...formData, email: e.target.value});
                  if (accountExists) setAccountExists(false);
                }}
                onBlur={() => validateField("email")}
                required
              />
              <FieldError message={errors.email} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                onBlur={() => validateField("password")}
                required
                minLength={6}
              />
              <PasswordStrengthIndicator password={formData.password} />
              <FieldError message={errors.password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                onBlur={() => validateField("confirmPassword")}
                required
              />
              <FieldError message={errors.confirmPassword} />
            </div>

            {/* Referral Code — optional - Only for Students */}
            {role === "student" && (
              <div className="space-y-2">
                <Label htmlFor="referralCode" className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-primary" />
                  Referral Code
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="referralCode"
                  placeholder="e.g. WB-A3K9X2"
                  value={formData.referralCode}
                  onChange={(e) => setFormData({...formData, referralCode: e.target.value.toUpperCase()})}
                  className={`font-mono tracking-wider ${refCodeFromUrl ? "opacity-60 cursor-not-allowed" : ""}`}
                  readOnly={!!refCodeFromUrl}
                />
                {formData.referralCode && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Referral code applied — you'll receive bonus coins after signup!
                  </p>
                )}
                {!formData.referralCode && (
                  <p className="text-xs text-muted-foreground">
                    Don't have a referral code? No problem — you can sign up without one.
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create My Account"
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (err) {
                  console.error('Google sign up error', err);
                  toast({
                    variant: "destructive",
                    title: "Google sign up failed",
                    description: "Please try again",
                  });
                }
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <button 
              onClick={() => navigate("/login")}
              className="text-primary hover:underline font-medium"
            >
              Login
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
