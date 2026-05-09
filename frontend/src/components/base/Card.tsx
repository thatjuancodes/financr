import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  variant?: "default" | "hero" | "alert" | "insight";
  insightColor?: "positive" | "warning" | "accent" | "negative";
}

export default function Card({
  children,
  className = "",
  variant = "default",
  insightColor = "positive",
  ...props
}: CardProps) {
  const base = "rounded-xl transition-shadow duration-200";
  const variants = {
    default: "bg-white shadow-card hover:shadow-card-hover",
    hero: "bg-bg-hero text-white",
    alert: "bg-white shadow-card hover:shadow-card-hover",
    insight: `bg-${insightColor}-light`,
  };

  return (
    <div className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
