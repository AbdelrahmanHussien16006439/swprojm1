// Form controls (Member 1). Always wrap a control in <FormField> so it gets a label and its error (GEN-02).
import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { errorMessages } from "@/lib/api/errors";

const control =
  "w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted " +
  "focus:border-primary focus:outline-none disabled:bg-background disabled:text-muted";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(control, "h-10", className)} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(control, "py-2", className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(control, "h-10", className)} {...rest}>
        {children}
      </select>
    );
  },
);

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
}

export function Checkbox({ label, className, id, ...rest }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <input id={id} type="checkbox" className="h-4 w-4 accent-primary" {...rest} />
      <span>{label}</span>
    </label>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  /** Error for this field, e.g. the backend message that starts with the field name. */
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Label + control + hint/error underneath. */
export function FormField({ label, htmlFor, error, hint, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

/** Shows the backend's error messages above a form (GEN-02). Pass whatever your catch received. */
export function FormErrors({ error }: { error: unknown }) {
  if (!error) return null;
  const messages = errorMessages(error);
  return (
    <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Picks the backend message for one field. Backend messages start with the field name,
 * e.g. fieldError(error, "email") → "email must be an email".
 */
export function fieldError(error: unknown, field: string): string | undefined {
  if (!error) return undefined;
  return errorMessages(error).find((m) => m.toLowerCase().startsWith(field.toLowerCase()));
}
