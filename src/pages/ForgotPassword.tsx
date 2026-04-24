import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FieldError } from "@/components/auth/FieldError";
import weskillLogo from "@/assets/weskill logo.avif";


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_SECONDS = 60;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Cooldown timer
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const validateEmail = useCallback(() => {
    if (!email.trim()) {
      setErrors({ email: "Email is required." });
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setErrors({ email: "Please enter a valid email address." });
      return false;
    }
    setErrors({ email: null });
    return true;
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      startCooldown();
      toast({ title: "Check your email", description: "We sent a password reset link to your email." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not send reset link",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await resetPassword(email);
      startCooldown();
      toast({ title: "Email resent", description: "A new password reset link has been sent." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not resend reset link",
      });
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
        <Button variant="ghost" onClick={() => navigate("/login")} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
             <div className="w-12 h-12 rounded-xl bg-transparent flex items-center justify-center mx-auto mb-4 overflow-hidden">
               <img src={weskillLogo} alt="Weskill Logo" className="w-full h-full object-contain" />
             </div>
            <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
            <p className="text-muted-foreground">Enter your email to receive a reset link</p>
          </div>

          {sent ? (
            <div className="text-center space-y-6 animate-in fade-in duration-300">
              {/* Success icon */}
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>

              <div className="space-y-2">
                <p className="font-medium">Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  We sent a reset link to <strong className="text-foreground">{email}</strong>.
                  <br />Follow the link to set a new password.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={cooldown > 0 || loading}
                  onClick={handleResend}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend available in {cooldown}s
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend reset link
                    </>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => navigate("/login")} className="w-full">
                  Back to Login
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={validateEmail}
                  required
                />
                <FieldError message={errors.email} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
