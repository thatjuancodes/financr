import React from "react";
import Button from "./Button";

const KebabIconButton = React.forwardRef(function KebabIconButton(
  { className = "", ...props },
  ref
) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="sm"
      className={`kebab-button ${className}`.trim()}
      {...props}
    >
      ⋮
    </Button>
  );
});

export default KebabIconButton;
