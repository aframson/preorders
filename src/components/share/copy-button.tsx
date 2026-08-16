"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Props = {
  value: string;
  label?: string;
  copiedLabel?: string;
  toastMessage?: string;
  className?: string;
} & Omit<React.ComponentProps<typeof Button>, "value" | "children">;

export function CopyButton({
  value,
  label = "Copy link",
  copiedLabel = "Copied",
  toastMessage = "Link copied",
  className,
  ...props
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(toastMessage);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is blocked in some in-app webviews, so fall back to
      // showing the value for a manual long-press copy.
      toast.error("Could not copy. Long-press the link to copy it.");
    }
  }

  return (
    <Button
      type="button"
      onClick={copy}
      className={cn(className)}
      aria-live="polite"
      {...props}
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
