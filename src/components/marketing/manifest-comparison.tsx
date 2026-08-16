import { Check, MessageCircle } from "lucide-react";

const CHAT = [
  { from: "Ama", text: "I want 2 of the black one, size 39" },
  { from: "Kwame", text: "Add me 1 hoodie L pls" },
  { from: "Ama", text: "Sorry make it 3 not 2" },
  { from: "Efua", text: "Same as Ama but size 41" },
  { from: "Kwame", text: "Actually XL not L" },
  { from: "Yaa", text: "2 hoodies, any colour" },
];

const MANIFEST = [
  { sku: "Sneakers \u2014 Black", variant: "39", qty: 3 },
  { sku: "Sneakers \u2014 Black", variant: "41", qty: 1 },
  { sku: "Hoodie \u2014 Grey", variant: "XL", qty: 1 },
  { sku: "Hoodie \u2014 Grey", variant: "Any", qty: 2 },
];

/**
 * The before/after that sells the product. Left is what a vendor scrolls
 * through today; right is what they send their supplier.
 */
export function ManifestComparison() {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6">
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle className="size-4 text-ink-subtle" aria-hidden />
          <p className="text-sm font-medium text-ink-muted">
            What you scroll through now
          </p>
        </div>

        <ul className="space-y-2">
          {CHAT.map((message, index) => (
            <li
              key={`${message.from}-${index}`}
              className="rounded-lg rounded-tl-sm bg-surface-muted px-3 py-2"
            >
              <p className="text-[11px] font-medium text-brand-600">
                {message.from}
              </p>
              <p className="text-sm text-ink">{message.text}</p>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-ink-subtle">
          Now do that for 60 people, across four days, while people keep
          changing their minds.
        </p>
      </div>

      <div className="rounded-card border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950/40">
        <div className="mb-4 flex items-center gap-2">
          <Check className="size-4 text-open" aria-hidden />
          <p className="text-sm font-medium text-ink">
            What you send your supplier
          </p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-200 text-left text-xs text-ink-muted dark:border-brand-800">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium">Size</th>
              <th className="pb-2 text-right font-medium">Qty</th>
            </tr>
          </thead>
          <tbody>
            {MANIFEST.map((row) => (
              <tr
                key={`${row.sku}-${row.variant}`}
                className="border-b border-brand-100 last:border-0 dark:border-brand-900"
              >
                <td className="py-2 text-ink">{row.sku}</td>
                <td className="py-2 text-ink-muted">{row.variant}</td>
                <td className="py-2 text-right font-medium text-ink" data-numeric>
                  {row.qty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
          <span className="text-ink-muted">Total units</span>
          <span className="font-semibold text-ink" data-numeric>
            7
          </span>
        </div>

        <p className="mt-4 text-xs text-ink-muted">
          Built automatically the moment your batch closes. Copy it straight
          into WeChat.
        </p>
      </div>
    </div>
  );
}
