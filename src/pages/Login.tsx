import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, AlertTriangle, MailCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { FieldError } from "@/components/auth/FieldError";
import weskillLogo from "@/assets/weskill logo.avif";


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, resendVerificationEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  // Inline errors
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  // Special banners
  const [bannerType, setBannerType] = useState<"none" | "invalid" | "email_not_confirmed" | "rate_limited">("none");

  const setFieldError = useCallback((field: string, msg: string | null) => {
    setErrors((prev) => ({ ...prev, [field]: msg }));
  }, []);

  const validateField = useCallback(
    (field: string) => {
      if (field === "email") {
        if (!email.trim()) {
          setFieldError("email", "Email is required.");
        } else if (!EMAIL_REGEX.test(email)) {
          setFieldError("email", "Please enter a valid email address.");
        } else {
          setFieldError("email", null);
        }
      }
      if (field === "password") {
        if (!password) {
          setFieldError("password", "Password is required.");
        } else {
          setFieldError("password", null);
        }
      }
    },
    [email, password, setFieldError]
  );

  const handleResendVerification = async () => {
    if (!email) return;
    setResending(true);
    try {
      await resendVerificationEmail(email);
      toast({
        title: "Verification email sent",
        description: "Please check your inbox and follow the link to verify your account.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not resend",
        description: "Please wait a moment and try again.",
      });
    } finally {
      setResending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerType("none");

    if (!email || !password) {
      if (!email) setFieldError("email", "Email is required.");
      if (!password) setFieldError("password", "Password is required.");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setFieldError("email", "Please enter a valid email address.");
      return;
    }
    
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login failed", err);
      const code = err?.code;

      if (code === "email_not_confirmed") {
        setBannerType("email_not_confirmed");
      } else if (code === "rate_limited") {
        setBannerType("rate_limited");
      } else {
        setBannerType("invalid");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed top-4 right-4 md:top-8 md:right-8 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className={`p-8 transition-all ${bannerType === "invalid" ? "animate-shake" : ""}`}>
          <div className="text-center mb-8">
             <div className="w-12 h-12 rounded-xl bg-transparent flex items-center justify-center mx-auto mb-4 overflow-hidden">
               <img src={weskillLogo} alt="Weskill Logo" className="w-full h-full object-contain" />
             </div>
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Login to continue to Webuild</p>
          </div>

          {/* Error banners */}
          {bannerType === "invalid" && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">
                  Invalid email or password. Please try again.
                </p>
              </div>
            </div>
          )}

          {bannerType === "email_not_confirmed" && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex gap-3">
                <MailCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="text-amber-800 dark:text-amber-200">
                    Please verify your email before logging in. Check your inbox for the confirmation link.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={resending}
                    onClick={handleResendVerification}
                    className="border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Resend verification email"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {bannerType === "rate_limited" && (
            <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-50 dark:bg-orange-950/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Too many login attempts. Please wait a moment and try again.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (bannerType !== "none") setBannerType("none");
                }}
                onBlur={() => validateField("email")}
                required
              />
              <FieldError message={errors.email} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button 
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (bannerType !== "none") setBannerType("none");
                }}
                onBlur={() => validateField("password")}
                required
              />
              <FieldError message={errors.password} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login to Webuild"
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
                  console.error("Google sign in error", err);
                  toast({
                    variant: "destructive",
                    title: "Google sign in failed",
                    description: "Please try again",
                  });
                }
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <button 
              onClick={() => navigate("/role-selection")}
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
