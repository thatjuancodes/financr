interface BadgeProps {
  children: string;
  variant?: "default" | "positive" | "negative" | "warning" | "accent" | "outline";
  size?: "sm" | "md";
}

export default function Badge({ children, variant = "default", size = "sm" }: BadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-2xs",
    md: "px-2.5 py-1 text-xs",
  };

  const variantClasses = {
    default: "bg-bg-subtle text-text-secondary",
    positive: "bg-positive-light text-positive-dark",
    negative: "bg-negative-light text-negative-dark",
    warning: "bg-warning-light text-warning-dark",
    accent: "bg-accent-light text-accent-dark",
    outline: "border border-text-muted text-text-muted bg-transparent",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
