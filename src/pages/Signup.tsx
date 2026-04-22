import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Gift } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import weskillLogo from "@/assets/weskill logo.avif";


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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure your passwords match and try again.",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters.",
      });
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
        toast({
          title: "Confirm your email",
          description: "We sent you a confirmation email. Please confirm your address before signing in.",
        });
        navigate("/login");
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
    } catch (err) {
      console.error("Signup failed:", err);
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: err instanceof Error ? err.message : "Please try again or contact support",
      });
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

          <form onSubmit={handleSignup} className="space-y-4">
            {role === "student" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                />
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
                  required
                />
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
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                required
              />
            </div>

            {/* Referral Code */}
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
            </div>

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
