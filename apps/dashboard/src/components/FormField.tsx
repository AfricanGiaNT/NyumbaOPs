import { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
};

export function FormField({
  label,
  required = false,
  helpText,
  error,
  children,
  htmlFor,
}: FormFieldProps) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const helpId = helpText ? `${htmlFor}-help` : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {children}
      {helpText && !error && (
        <p id={helpId} className="text-xs text-zinc-600 dark:text-zinc-400">
          {helpText}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
