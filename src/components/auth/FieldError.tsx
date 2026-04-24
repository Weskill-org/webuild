import { AlertCircle } from "lucide-react";

interface FieldErrorProps {
  message?: string | null;
}

/**
 * Inline field-level error message. Renders nothing when `message` is falsy.
 */
export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-150">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}
