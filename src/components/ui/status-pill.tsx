import { cn } from "@/lib/cn";
import { TONE_CLASSES, type Tone } from "@/lib/status";

type StatusPillProps = {
  tone: Tone;
  children: React.ReactNode;
  /** A dot is enough on dense surfaces; the label still carries the meaning. */
  dot?: boolean;
  pulse?: boolean;
  className?: string;
};

export function StatusPill({
  tone,
  children,
  dot = true,
  pulse = false,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex size-1.5" aria-hidden>
          {pulse && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          )}
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
