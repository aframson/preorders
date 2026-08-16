import {
  ChevronLeft,
  MoreVertical,
  Paperclip,
  Phone,
  Smile,
  Video,
} from "lucide-react";

import { GrainShell } from "@/components/marketing/grain-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";

const INCOMING = [
  {
    from: "Ama",
    initial: "A",
    color: "#c861c6",
    avatar: "from-[#f3c4e8] via-[#c861c6] to-[#6e3560]",
    text: "The black sneakers still available?",
    time: "9:38",
  },
  {
    from: "Kwame",
    initial: "K",
    color: "#02a698",
    avatar: "from-[#9ee8df] via-[#02a698] to-[#0e4d47]",
    text: "Add me 1 hoodie L pls",
    time: "9:39",
  },
];

/**
 * A still of the WhatsApp group as a vendor actually uses it: customers
 * ping in chat, then the drop link unfurls. Not a phone shell — the chat
 * itself is the object.
 */
export function WhatsAppUnfurl({ className }: { className?: string }) {
  return (
    <GrainShell className={className}>
      <header className="relative z-10 bg-[#008069] text-white">
          <div className="relative flex items-end justify-between px-4 pt-2 pb-1 text-[11px] font-medium">
            <span data-numeric>9:41</span>
            <span className="flex items-center gap-1.5">
              <Signal />
              <span className="h-[9px] w-[17px] rounded-[2px] border border-white/90">
                <span className="ml-[1px] mt-[1px] block h-[5px] w-[11px] rounded-[1px] bg-white" />
              </span>
            </span>
          </div>

          <div className="relative flex items-center gap-1 px-1.5 pb-2.5">
            <ChevronLeft className="size-6 shrink-0" strokeWidth={2.25} />
            <div className="size-[42px] shrink-0 rounded-full bg-gradient-to-br from-[#e8c9a2] via-[#8b3f7a] to-[#3b1b33] shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.2)]" />
            <div className="min-w-0 flex-1 px-1.5">
              <p className="truncate text-[16px] leading-tight font-semibold">
                China run group
              </p>
              <p className="truncate text-[12px] text-white/75">
                Ama, Kwame, Efua, You
              </p>
            </div>
            <Video className="size-[22px] shrink-0" strokeWidth={1.75} />
            <Phone className="ml-3 size-[20px] shrink-0" strokeWidth={1.75} />
            <MoreVertical
              className="ml-2 size-[20px] shrink-0"
              strokeWidth={1.75}
            />
          </div>
        </header>

        <div
          className="relative min-h-0 flex-1 px-2.5 pt-3 pb-2"
          style={{
            backgroundColor: "#e5ddd5",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23c4b8ae' stroke-width='1' opacity='0.45'%3E%3Cpath d='M18 22c6 4 8 12 2 16'/%3E%3Cpath d='M86 18c-4 8 2 14 10 10'/%3E%3Ccircle cx='42' cy='64' r='3'/%3E%3Ccircle cx='98' cy='72' r='2'/%3E%3Cpath d='M14 88c8-2 12 8 4 12'/%3E%3Cpath d='M70 96c6-6 16-2 14 8'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "160px 160px",
          }}
        >
          <div className="relative space-y-2">
            <div className="flex justify-center py-1">
              <span className="rounded-md bg-[#d5d2cd]/90 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-[#54656f] uppercase shadow-sm">
                Today
              </span>
            </div>

            {INCOMING.map((message) => (
              <IncomingBubble key={message.from} {...message} />
            ))}

            <OutgoingLink />
          </div>
        </div>

        <div className="relative mt-auto flex items-center gap-2 bg-[#f0f2f5] px-2 py-2">
          <div className="relative flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
            <Smile className="size-5 shrink-0 text-[#54656f]" strokeWidth={1.75} />
            <span className="flex-1 text-[15px] text-[#667781]">Message</span>
            <Paperclip className="size-5 shrink-0 -rotate-45 text-[#54656f]" strokeWidth={1.75} />
          </div>
          <div className="relative flex size-[46px] shrink-0 items-center justify-center rounded-full bg-[#008069] text-white shadow-sm">
            <MicIcon />
          </div>
        </div>
    </GrainShell>
  );
}

function IncomingBubble({
  from,
  initial,
  color,
  avatar,
  text,
  time,
}: {
  from: string;
  initial: string;
  color: string;
  avatar: string;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-end gap-[5px] pr-8">
      <div
        className={cn(
          "mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.18)]",
          avatar,
        )}
        aria-hidden
      >
        {initial}
      </div>

      <div className="relative min-w-[148px] max-w-[78%] rounded-[7.5px] rounded-bl-none bg-white px-[9px] pt-[5px] pb-[6px] shadow-[0_1px_0.5px_rgb(11_20_26_/_0.13)]">
        <Tail side="in" />
        <p
          className="relative text-[13px] leading-none font-semibold"
          style={{ color }}
        >
          {from}
        </p>
        <p className="relative mt-[3px] text-[14.5px] leading-[1.35] text-[#111b21]">
          {text}
          <span className="inline-block w-[3.25rem]" aria-hidden />
        </p>
        <span
          className="absolute right-[7px] bottom-[4px] text-[11px] leading-none text-[#667781]"
          data-numeric
        >
          {time}
        </span>
      </div>
    </div>
  );
}

function OutgoingLink() {
  return (
    <div className="relative ml-auto max-w-[88%] rounded-[7.5px] rounded-br-none bg-[#d9fdd3] p-1 shadow-[0_1px_0.5px_rgb(11_20_26_/_0.13)]">
      <Tail side="out" />
      <p className="relative px-1.5 pt-1 text-[14.5px] leading-[1.35] text-[#111b21]">
        Batch 3 is open — tap to order
      </p>
      <p className="relative px-1.5 text-[14px] font-medium text-[#027eb5] underline decoration-[#027eb5]/40">
        preorders.app/akosua/china-run
      </p>

      <div className="relative mt-1.5 overflow-hidden rounded-[6px] bg-[#cce9d4]">
        <div className="relative bg-canvas px-4 py-3.5">
          <div className="relative">
            <p className="text-[11px] font-bold tracking-[0.08em] text-brand-700">
              Preorders
            </p>
            <p className="mt-1.5 text-[12px] text-ink-muted">Akosua Imports</p>
            <p className="mt-0.5 font-display text-[20px] leading-[1.05] font-bold tracking-tight text-ink">
              September China run
            </p>
            <StatusPill tone="open" pulse className="mt-2.5 text-[11px]">
              Batch 3 is open · 34 orders in
            </StatusPill>
          </div>
        </div>
        <div className="relative px-2.5 py-1.5">
          <p className="text-[13px] font-medium text-[#111b21]">
            September China run
          </p>
          <p className="text-[12px] text-[#667781]">
            Batch 3 is open · 34 orders in
          </p>
          <p className="text-[11px] tracking-wide text-[#667781] uppercase">
            preorders.app
          </p>
        </div>
      </div>

      <p className="relative mt-0.5 flex items-center justify-end gap-1 px-1 pb-0.5 text-[11px] text-[#667781]">
        <span data-numeric>9:41</span>
        <BlueTicks />
      </p>
    </div>
  );
}

function Tail({ side }: { side: "in" | "out" }) {
  const outgoing = side === "out";
  return (
    <svg
      viewBox="0 0 8 13"
      className={
        outgoing
          ? "absolute bottom-0 -right-[7px] h-[13px] w-2"
          : "absolute bottom-0 -left-[7px] h-[13px] w-2"
      }
      aria-hidden
    >
      <path
        fill={outgoing ? "#d9fdd3" : "#fff"}
        d={
          outgoing
            ? "M0 13c1.8-2.2 4.6-4.6 8-5.8V13H0z"
            : "M8 13C6.2 10.8 3.4 8.4 0 7.2V13h8z"
        }
      />
    </svg>
  );
}

function BlueTicks() {
  return (
    <svg viewBox="0 0 16 11" className="size-3.5 text-[#53bdeb]" aria-hidden>
      <path
        fill="currentColor"
        d="M11.07 1.14 5.2 7.9 2.9 5.7l-.9.86 3.2 3.3 6.8-7.86-.93-.86Zm3.06 0-5.87 6.76-.7-.7.86-.93 5.01-5.99.7.86Z"
      />
    </svg>
  );
}

function Signal() {
  return (
    <svg viewBox="0 0 16 12" className="h-3 w-4 fill-white" aria-hidden>
      <rect x="0" y="8" width="3" height="4" rx="0.5" />
      <rect x="4.3" y="5.5" width="3" height="6.5" rx="0.5" />
      <rect x="8.6" y="3" width="3" height="9" rx="0.5" />
      <rect x="12.9" y="0.5" width="3" height="11.5" rx="0.5" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative size-5 fill-white" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-3.07A7 7 0 0 0 19 11h-2Z" />
    </svg>
  );
}
