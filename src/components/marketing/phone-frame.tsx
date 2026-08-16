import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";

const PRODUCTS = [
  {
    name: "Chunky sneakers",
    price: "GH\u20b5180",
    tint: "from-[#E8C9A2] via-[#A56B45] to-[#4A2A28]",
  },
  {
    name: "Cargo trousers",
    price: "GH\u20b5120",
    tint: "from-[#2F6B4A] via-[#1E4D36] to-[#0E2A1C]",
  },
  {
    name: "Puffer jacket",
    price: "GH\u20b5240",
    tint: "from-[#D97706] via-[#9F1239] to-[#4C0519]",
  },
  {
    name: "Crossbody bag",
    price: "GH\u20b595",
    tint: "from-[#E8C547] via-[#92400E] to-[#3B1B33]",
  },
];

/**
 * A still of the drop page as it appears inside the WhatsApp webview. Not
 * interactive: this is the hero illustration, so it stays a server component
 * with no client bundle cost.
 */
export function PhoneFrame({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative w-[360px]", className)}>
      <span className="absolute top-[118px] -left-[3px] z-10 h-[28px] w-[3px] rounded-l-[1px] bg-gradient-to-b from-[#8a8580] via-[#2e2b28] to-[#8a8580]" />
      <span className="absolute top-[156px] -left-[3px] z-10 h-[52px] w-[3px] rounded-l-[1px] bg-gradient-to-b from-[#8a8580] via-[#2e2b28] to-[#8a8580]" />
      <span className="absolute top-[148px] -right-[3px] z-10 h-[64px] w-[3px] rounded-r-[1px] bg-gradient-to-b from-[#8a8580] via-[#2e2b28] to-[#8a8580]" />

      <div
        className="relative rounded-[2.7rem] p-[2.5px]"
        style={{
          background:
            "linear-gradient(155deg, #c5c0b8 0%, #5a5550 16%, #1a1715 42%, #2c2926 68%, #8f8a83 86%, #ddd8d0 100%)",
          boxShadow:
            "0 28px 60px -24px rgb(26 22 20 / 0.4), 0 10px 20px -12px rgb(26 22 20 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.45), inset 0 -1px 0 rgb(0 0 0 / 0.35)",
        }}
      >
        <div className="rounded-[2.5rem] bg-[#0c0b0a] p-[9px] shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.06)]">
          <div className="relative overflow-hidden rounded-[1.95rem] bg-canvas">
            <div className="absolute top-[11px] left-1/2 z-30 h-[27px] w-[96px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)]" />

            <div className="flex h-11 items-end justify-between px-7 pb-1.5">
              <span className="text-[11px] font-semibold text-ink" data-numeric>
                9:41
              </span>
              <span className="flex items-center gap-1 text-ink">
                <span className="h-[7px] w-[15px] rounded-[2px] border border-ink/70">
                  <span className="ml-[1px] mt-[1px] block h-[3px] w-[9px] rounded-[1px] bg-ink" />
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2.5 border-b border-border/80 bg-surface px-4 py-3">
              <div className="size-9 rounded-full bg-gradient-to-br from-brand-200 to-brand-800" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">
                  Akosua Imports
                </p>
                <p className="text-[10px] text-ink-muted">12 batches delivered</p>
              </div>
            </div>

            <div className="bg-open px-4 py-2.5 text-white">
              <div className="flex items-center justify-between gap-2">
                <StatusPill
                  tone="open"
                  pulse
                  className="bg-white/20 text-[10px] text-white"
                >
                  Batch 3 open
                </StatusPill>
                <span className="text-[11px] font-semibold" data-numeric>
                  1d 9h left
                </span>
              </div>
              <p className="mt-1 text-[12px] font-medium">34 orders in this batch</p>
            </div>

            <div className="flex gap-1.5 bg-surface px-4 py-2.5">
              {["All", "Shoes", "Bags"].map((chip, index) => (
                <span
                  key={chip}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                    index === 0
                      ? "bg-brand-700 text-white"
                      : "bg-surface-muted text-ink-muted",
                  )}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 bg-canvas px-4 pb-4">
              {PRODUCTS.map((product) => (
                <div key={product.name} className="space-y-1">
                  <div
                    className={cn(
                      "relative aspect-4/5 overflow-hidden rounded-lg bg-gradient-to-br",
                      product.tint,
                    )}
                  >
                    <span className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent" />
                    <span className="bg-grain-heavy pointer-events-none absolute inset-0 mix-blend-overlay opacity-70" />
                  </div>
                  <p className="truncate text-[11px] font-semibold text-ink">
                    {product.name}
                  </p>
                  <p className="text-[11px] font-medium text-brand-700" data-numeric>
                    {product.price}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-border bg-surface px-4 pt-3 pb-2">
              <div className="grain-ink flex h-11 items-center justify-center rounded-control bg-brand-700 text-[12px] font-semibold text-white">
                3 items &middot; GH&#8373;480 &middot; Review order
              </div>
              <div className="mx-auto mt-2.5 h-[5px] w-[108px] rounded-full bg-ink/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
