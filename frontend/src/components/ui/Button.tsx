import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, { base: string; disabled: string }> = {
  primary: {
    base: "bg-green-600 text-white hover:bg-green-700",
    disabled: "cursor-not-allowed bg-(--bg-tertiary) text-(--text-muted)",
  },
  secondary: {
    base: "border border-(--border-primary) text-(--text-secondary) hover:bg-(--bg-tertiary)",
    disabled: "cursor-not-allowed border border-(--border-primary) text-(--text-muted) opacity-50",
  },
  danger: {
    base: "bg-(--cancel-btn-bg) text-white hover:bg-(--cancel-btn-hover)",
    disabled: "cursor-not-allowed bg-(--bg-tertiary) text-(--text-muted)",
  },
  ghost: {
    base: "text-(--text-secondary) hover:bg-(--bg-tertiary)",
    disabled: "cursor-not-allowed text-(--text-muted) opacity-50",
  },
};

export function Button({
  variant = "primary",
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const styles = variantClasses[variant];

  return (
    <button
      disabled={disabled}
      className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
        disabled ? styles.disabled : `cursor-pointer ${styles.base}`
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
