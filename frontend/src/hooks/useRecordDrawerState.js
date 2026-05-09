import React from "react";

export default function useRecordDrawerState({
  items,
  visibleItems = null,
  getItemKey = (item) => item.id,
  toDraft,
  formatFieldValue,
}) {
  const [drafts, setDrafts] = React.useState({});
  const [activeId, setActiveId] = React.useState(null);
  const [drawerError, setDrawerError] = React.useState("");
  const [isDrawerSubmitting, setIsDrawerSubmitting] = React.useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = React.useState(false);
  const [addDrawerError, setAddDrawerError] = React.useState("");
  const [isAddDrawerSubmitting, setIsAddDrawerSubmitting] = React.useState(false);

  const areDraftMapsEqual = React.useCallback((left, right) => {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    for (const key of rightKeys) {
      if (!(key in left)) {
        return false;
      }
      if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) {
        return false;
      }
    }
    return true;
  }, []);

  const getItemKeyRef = React.useRef(getItemKey);
  const toDraftRef = React.useRef(toDraft);

  React.useEffect(() => {
    getItemKeyRef.current = getItemKey;
  }, [getItemKey]);

  React.useEffect(() => {
    toDraftRef.current = toDraft;
  }, [toDraft]);

  const activeItem = React.useMemo(
    () => items.find((item) => getItemKey(item) === activeId) ?? null,
    [items, activeId, getItemKey]
  );

  const activeDraft = React.useMemo(() => {
    if (!activeItem) {
      return null;
    }
    return drafts[getItemKey(activeItem)] ?? null;
  }, [activeItem, drafts, getItemKey]);

  React.useEffect(() => {
    const nextDrafts = {};
    items.forEach((item) => {
      nextDrafts[getItemKeyRef.current(item)] = toDraftRef.current(item);
    });
    setDrafts((prev) => (areDraftMapsEqual(prev, nextDrafts) ? prev : nextDrafts));
  }, [areDraftMapsEqual, items]);

  React.useEffect(() => {
    if (!activeId) {
      return;
    }
    const hasActive = items.some((item) => getItemKeyRef.current(item) === activeId);
    if (!hasActive) {
      setActiveId(null);
      setDrawerError("");
      setIsDrawerSubmitting(false);
    }
  }, [activeId, items]);

  React.useEffect(() => {
    if (!activeId || !Array.isArray(visibleItems)) {
      return;
    }
    const hasVisibleActive = visibleItems.some(
      (item) => getItemKeyRef.current(item) === activeId
    );
    if (!hasVisibleActive) {
      setActiveId(null);
      setDrawerError("");
      setIsDrawerSubmitting(false);
    }
  }, [activeId, visibleItems]);

  const updateDraft = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]:
          typeof formatFieldValue === "function"
            ? formatFieldValue(field, value)
            : value,
      },
    }));
  };

  const openDrawer = (id) => {
    setIsAddDrawerOpen(false);
    setAddDrawerError("");
    setIsAddDrawerSubmitting(false);
    setActiveId(id);
    setDrawerError("");
    setIsDrawerSubmitting(false);
  };

  const closeDrawer = () => {
    if (isDrawerSubmitting) {
      return;
    }
    setActiveId(null);
    setDrawerError("");
  };

  const openAddDrawer = () => {
    setActiveId(null);
    setDrawerError("");
    setIsDrawerSubmitting(false);
    setIsAddDrawerOpen(true);
    setAddDrawerError("");
    setIsAddDrawerSubmitting(false);
  };

  const closeAddDrawer = () => {
    if (isAddDrawerSubmitting) {
      return;
    }
    setIsAddDrawerOpen(false);
    setAddDrawerError("");
  };

  const handleRowKeyDown = (event, id) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDrawer(id);
    }
  };

  return {
    drafts,
    setDrafts,
    activeId,
    setActiveId,
    activeItem,
    activeDraft,
    drawerError,
    setDrawerError,
    isDrawerSubmitting,
    setIsDrawerSubmitting,
    isAddDrawerOpen,
    setIsAddDrawerOpen,
    addDrawerError,
    setAddDrawerError,
    isAddDrawerSubmitting,
    setIsAddDrawerSubmitting,
    updateDraft,
    openDrawer,
    closeDrawer,
    openAddDrawer,
    closeAddDrawer,
    handleRowKeyDown,
  };
}
