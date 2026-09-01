"use client";

import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleX,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ListSearch } from "@/components/ui/list-search";
import { cn } from "@/lib/cn";
import type { AdminVendorListItem } from "@/lib/queries/admin-vendors";
import { matchesQuery } from "@/lib/search";

type Filter = "all" | AdminVendorListItem["approvalStatus"];

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function VendorList({
  vendors,
}: {
  vendors: AdminVendorListItem[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () =>
      vendors.filter(
        (vendor) =>
          (filter === "all" || vendor.approvalStatus === filter) &&
          matchesQuery(
            [
              vendor.businessName,
              vendor.slug,
              vendor.supportEmail,
              vendor.whatsappNumber,
              vendor.payoutAccountName,
            ],
            query,
          ),
      ),
    [filter, query, vendors],
  );

  return (
    <div className="space-y-4">
      <ListSearch
        value={query}
        onChange={setQuery}
        placeholder="Search business, email or phone"
        label="Search vendors"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => {
          const active = filter === item.value;
          const count =
            item.value === "all"
              ? vendors.length
              : vendors.filter(
                  (vendor) => vendor.approvalStatus === item.value,
                ).length;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                active
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-border bg-surface text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
              <span className={active ? "text-white/75" : "text-ink-subtle"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {visible.length > 0 ? (
          <ul className="divide-y divide-border">
            {visible.map((vendor) => (
              <li key={vendor.id}>
                <Link
                  href={`/admin/vendors/${vendor.id}`}
                  className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-muted sm:px-5"
                >
                  <StatusIcon status={vendor.approvalStatus} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-ink">
                        {vendor.businessName}
                      </p>
                      <StatusBadge status={vendor.approvalStatus} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-muted">
                      {vendor.supportEmail ?? vendor.whatsappNumber ?? `/${vendor.slug}`}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-subtle">
                      <WalletCards className="size-3.5" aria-hidden />
                      {vendor.payoutConnected
                        ? vendor.payoutAccountName ?? "Payout connected"
                        : "Payout not connected"}
                      <span aria-hidden>·</span>
                      {new Intl.DateTimeFormat("en-GH", {
                        dateStyle: "medium",
                      }).format(new Date(vendor.createdAt))}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-4 shrink-0 text-ink-subtle"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">
            No vendors match this search.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusIcon({
  status,
}: {
  status: AdminVendorListItem["approvalStatus"];
}) {
  const Icon =
    status === "approved"
      ? CheckCircle2
      : status === "rejected"
        ? CircleX
        : CircleAlert;

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        status === "approved"
          ? "bg-open-tint text-open"
          : status === "rejected"
            ? "bg-danger/10 text-danger"
            : "bg-closing-tint text-closing",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: AdminVendorListItem["approvalStatus"];
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
        status === "approved"
          ? "bg-open-tint text-open"
          : status === "rejected"
            ? "bg-danger/10 text-danger"
            : "bg-closing-tint text-closing",
      )}
    >
      {status}
    </span>
  );
}
