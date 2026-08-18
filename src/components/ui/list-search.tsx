"use client";

import { Search, X } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export function ListSearch({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className,
  inputClassName,
  autoFocus,
  id = "list-search",
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  id?: string;
} & Omit<ComponentProps<"input">, "value" | "onChange" | "id" | "className">) {
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-subtle"
        aria-hidden
      />
      <input
        {...props}
        id={id}
        type="search"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-12 w-full rounded-control border border-border/40 bg-surface pr-10 pl-10 text-base text-ink shadow-none placeholder:text-ink-subtle transition-colors focus:border-border/80 focus:outline-none focus:shadow-none",
          inputClassName,
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          aria-label="Clear search"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
