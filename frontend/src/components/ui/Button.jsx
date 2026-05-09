import React from "react";

const VARIANT_CLASS = {
  primary: "app-btn app-btn-primary",
  secondary: "app-btn app-btn-secondary",
  subtle: "app-btn app-btn-subtle",
  dark: "app-btn app-btn-dark",
  danger: "app-btn app-btn-danger",
  ghost: "app-btn app-btn-ghost",
  icon: "app-btn app-btn-icon",
};

const SIZE_CLASS = {
  sm: "app-btn-sm",
  md: "app-btn-md",
  lg: "app-btn-lg",
};

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

const Button = React.forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    block = false,
    className = "",
    ...props
  },
  ref
) {
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.primary;
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;

  return (
    <button
      ref={ref}
      {...props}
      className={joinClasses(
        variantClass,
        sizeClass,
        block ? "app-btn-block" : "",
        className
      )}
    >
      {children}
    </button>
  );
});

export default Button;
