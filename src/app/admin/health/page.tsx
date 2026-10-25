import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";

import { HealthFixButton } from "@/components/admin/fix-buttons";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  countHealthIssues,
  getAdminHealth,
  type HealthCheck,
} from "@/lib/queries/admin-health";

export const metadata = { title: "Health · Admin" };

export default async function AdminHealthPage() {
  const checks = await getAdminHealth();
  const counts = countHealthIssues(checks);
  const failing = checks.filter((check) => check.items.length > 0);
  const passing = checks.filter((check) => check.items.length === 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Health"
        description={
          failing.length === 0
            ? "Every check is passing."
            : `${counts.critical} critical · ${counts.warning} to tidy up. Fixes run the same code the app would have run automatically.`
        }
      />

      {failing.map((check) => (
        <CheckCard key={check.key} check={check} />
      ))}

      {passing.length > 0 && (
        <Card>
          <CardHeader title="Passing" />
          <ul className="divide-y divide-border">
            {passing.map((check) => (
              <li key={check.key} className="flex items-center gap-3 px-5 py-3 text-sm text-ink-muted">
                <CheckCircle2 className="size-4 shrink-0 text-open" aria-hidden />
                {check.title}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function CheckCard({ check }: { check: HealthCheck }) {
  const Icon = check.severity === "critical" ? AlertOctagon : AlertTriangle;

  return (
    <Card className={cn(check.severity === "critical" && "border-danger/40")}>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Icon
              className={cn(
                "size-4 shrink-0",
                check.severity === "critical" ? "text-danger" : "text-closing",
              )}
              aria-hidden
            />
            {check.title}
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-muted">
              {check.items.length}
            </span>
          </span>
        }
        description={check.why}
      />
      <ul className="divide-y divide-border">
        {check.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <Link href={item.href} className="group min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-medium text-ink group-hover:underline">
                {item.label}
                <ChevronRight className="size-3.5 shrink-0 text-ink-subtle" aria-hidden />
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">{item.detail}</p>
            </Link>
            {item.fix && check.fixLabel && (
              <HealthFixButton
                kind={item.fix.kind}
                targetId={item.fix.targetId}
                label={check.fixLabel}
                confirm={check.fixConfirm}
              />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
