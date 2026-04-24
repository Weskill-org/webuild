import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: "At least 6 characters", test: (pw) => pw.length >= 6 },
  { label: "Uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "Lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "A number", test: (pw) => /\d/.test(pw) },
  { label: "Special character (!@#$...)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };

  const passed = RULES.filter((r) => r.test(password)).length;

  if (passed <= 1) return { score: 20, label: "Very weak", color: "bg-red-500" };
  if (passed === 2) return { score: 40, label: "Weak", color: "bg-orange-500" };
  if (passed === 3) return { score: 60, label: "Fair", color: "bg-yellow-500" };
  if (passed === 4) return { score: 80, label: "Strong", color: "bg-emerald-400" };
  return { score: 100, label: "Very strong", color: "bg-green-500" };
}

/**
 * Visual password-strength indicator: colour bar + per-rule checklist.
 * Only shown when the password field is non-empty.
 */
export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => getStrength(password), [password]);
  const results = useMemo(() => RULES.map((r) => ({ ...r, passed: r.test(password) })), [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground min-w-[72px] text-right">
          {strength.label}
        </span>
      </div>

      {/* Rule checklist */}
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {results.map((r) => (
          <li key={r.label} className="flex items-center gap-1.5 text-xs">
            {r.passed ? (
              <Check className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            <span className={r.passed ? "text-foreground" : "text-muted-foreground"}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
