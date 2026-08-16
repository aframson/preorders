import { cn } from "@/lib/cn";

/**
 * Primary actions live at the bottom of the screen, inside the thumb zone.
 * `pb-safe` clears the iOS home indicator, which otherwise sits on top of the
 * button in the WhatsApp webview.
 */
export function StickyActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-30 border-t border-border bg-surface px-4 pt-3 shadow-bar pb-safe",
        className,
      )}
    >
      {children}
    </div>
  );
}
