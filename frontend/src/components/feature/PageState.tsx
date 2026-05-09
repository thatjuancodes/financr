import Card from "@/components/base/Card";

export function LoadingState({ label = "Loading finance data..." }: { label?: string }) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-bg-subtle border-t-accent" />
      <p className="text-sm text-text-secondary">{label}</p>
    </Card>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-subtle">
        <i className="ri-inbox-archive-line text-xl text-text-secondary" />
      </div>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm text-text-secondary">{body}</p>
    </Card>
  );
}

export function NoticeBanner({
  tone,
  message,
  onClose,
}: {
  tone: "success" | "error";
  message: string;
  onClose?: () => void;
}) {
  const tones = {
    success: "border-positive/20 bg-positive-light text-positive-dark",
    error: "border-negative/20 bg-negative-light text-negative-dark",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <span>{message}</span>
        {onClose ? (
          <button onClick={onClose} className="text-current/70 transition hover:text-current">
            <i className="ri-close-line text-lg" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
