import React from "react";
import { createPortal } from "react-dom";
import Button from "./ui/Button";
import KebabIconButton from "./ui/KebabIconButton";

export default function RowActionsMenu({
  actions,
  align = "right",
  renderTrigger = null,
  menuClassName = "",
  itemClassName = "",
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const [dropdownStyle, setDropdownStyle] = React.useState(null);

  const updateDropdownPosition = React.useCallback(() => {
    if (!buttonRef.current || typeof window === "undefined") {
      return;
    }
    const viewportPadding = 8;
    const triggerGap = 4;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = dropdownRef.current?.offsetHeight ?? 0;
    const preferredTop = rect.bottom + triggerGap;
    const preferredBottom = rect.top - triggerGap;
    const spaceBelow = Math.max(
      window.innerHeight - preferredTop - viewportPadding,
      0
    );
    const spaceAbove = Math.max(preferredBottom - viewportPadding, 0);
    const shouldOpenUpward =
      dropdownHeight > 0 &&
      spaceBelow < Math.min(200, dropdownHeight) &&
      spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      shouldOpenUpward ? spaceAbove : spaceBelow,
      120
    );
    const downTop = Math.min(
      preferredTop,
      window.innerHeight - viewportPadding - maxHeight
    );
    const top = shouldOpenUpward
      ? Math.max(rect.top - triggerGap - dropdownHeight, viewportPadding)
      : Math.max(downTop, viewportPadding);

    const style =
      align === "left"
        ? {
            position: "fixed",
            top,
            left: rect.left,
            zIndex: 120,
            maxHeight,
            overflowY: "auto",
          }
        : {
            position: "fixed",
            top,
            right: Math.max(window.innerWidth - rect.right, 0),
            zIndex: 120,
            maxHeight,
            overflowY: "auto",
          };
    setDropdownStyle(style);
  }, [align]);

  React.useEffect(() => {
    function handlePointerDown(event) {
      const target = event.target;
      if (
        rootRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleReposition() {
      if (!open) {
        return;
      }
      updateDropdownPosition();
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      updateDropdownPosition();
      if (typeof window !== "undefined") {
        requestAnimationFrame(updateDropdownPosition);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updateDropdownPosition]);

  return (
    <div
      className="row-actions-menu"
      ref={rootRef}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {renderTrigger ? (
        renderTrigger({ open, setOpen, buttonRef })
      ) : (
        <KebabIconButton
          ref={buttonRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Row actions"
          onClick={() => setOpen((prev) => !prev)}
        />
      )}
      {open && (
        createPortal(
          <div
            ref={dropdownRef}
            className={`row-actions-dropdown${
              align === "left" ? " left" : ""
            }${menuClassName ? ` ${menuClassName}` : ""}`}
            style={dropdownStyle || undefined}
            role="menu"
          >
            {actions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                size="sm"
                role="menuitem"
                className={`row-actions-item${
                  itemClassName ? ` ${itemClassName}` : ""
                }`}
                onClick={() => {
                  setOpen(false);
                  action.onClick();
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>,
          document.body
        )
      )}
    </div>
  );
}
