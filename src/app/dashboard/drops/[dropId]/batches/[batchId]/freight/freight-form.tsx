"use client";

import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { MoneyRow } from "@/components/ui/money-row";
import {
  FREIGHT_MODES,
  allocateFreight,
  formatBillableUnits,
  type FreightMode,
} from "@/lib/freight";
import { cedisToPesewas, formatGhs, type Pesewas } from "@/lib/money";
import { sendFreightInvoices, type FreightState } from "./actions";

type Row = {
  orderId: string;
  code: string;
  customerName: string;
  units: number;
  estimate: Pesewas;
};

export function FreightForm({
  batchId,
  dropId,
  freightMode,
  unitsTotal,
  alreadyFinalised,
  canRevise,
  initialChargeCedis,
  rows,
}: {
  batchId: string;
  dropId: string;
  freightMode: FreightMode;
  unitsTotal: number;
  alreadyFinalised: boolean;
  /** True when invoices were sent but nobody has paid yet. */
  canRevise: boolean;
  initialChargeCedis: string;
  rows: Row[];
}) {
  const locked = alreadyFinalised && !canRevise;
  const [chargeCedis, setChargeCedis] = useState(initialChargeCedis);
  const [costCedis, setCostCedis] = useState("");
  const [state, action, pending] = useActionState<FreightState, FormData>(
    sendFreightInvoices,
    {},
  );

  const charge = chargeCedis ? cedisToPesewas(Number(chargeCedis)) : 0;
  const cost = costCedis ? cedisToPesewas(Number(costCedis)) : null;
  const margin = cost === null ? null : charge - cost;

  const allocation = useMemo(() => {
    if (charge <= 0 || rows.length === 0) return [];
    const amounts = allocateFreight(
      charge,
      rows.map((row) => ({ id: row.orderId, units: row.units })),
    );
    const byId = new Map(amounts.map((row) => [row.orderId, row.amount]));
    return rows.map((row) => ({
      ...row,
      amount: byId.get(row.orderId) ?? 0,
    }));
  }, [charge, rows]);

  const estimateTotal = rows.reduce((sum, row) => sum + row.estimate, 0);
  const jump =
    charge > 0 && estimateTotal > 0 && charge > Math.round(estimateTotal * 1.4);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="batchId" value={batchId} />
      <input type="hidden" name="dropId" value={dropId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="What you are charging customers"
          htmlFor="charge"
          hint={`Split across ${rows.length} order${rows.length === 1 ? "" : "s"} by ${FREIGHT_MODES[freightMode].unitLabel}.`}
        >
          <Input
            id="charge"
            name="charge"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required
            placeholder="0.00"
            value={chargeCedis}
            onChange={(event) => setChargeCedis(event.target.value)}
            disabled={locked}
          />
        </Field>

        <Field
          label="What the forwarder billed you"
          htmlFor="cost"
          hint="Optional. Shown only to you, so the margin is a decision rather than a surprise."
        >
          <Input
            id="cost"
            name="cost"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={costCedis}
            onChange={(event) => setCostCedis(event.target.value)}
            disabled={locked}
          />
        </Field>
      </div>

      {charge > 0 && (
        <div className="space-y-2 rounded-card border border-border bg-surface p-4">
          <MoneyRow label="Charging customers" amount={charge} strong />
          {cost !== null && (
            <>
              <MoneyRow label="Forwarder bill" amount={cost} muted />
              <MoneyRow
                label="Your margin"
                amount={margin ?? 0}
                muted={(margin ?? 0) < 0}
              />
            </>
          )}
          <p className="pt-1 text-xs text-ink-subtle">
            {formatBillableUnits(freightMode, unitsTotal)} across the batch
          </p>
        </div>
      )}

      {jump && !locked && (
        <p
          role="status"
          className="rounded-card border border-closing/30 bg-closing-tint px-4 py-3 text-sm text-ink"
        >
          This is a lot higher than the estimates customers saw at checkout.
          They will notice. Confirm the figure before you send.
        </p>
      )}

      {allocation.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Share</th>
                <th className="px-4 py-2.5 font-medium">Estimate</th>
                <th className="px-4 py-2.5 font-medium">Now due</th>
              </tr>
            </thead>
            <tbody>
              {allocation.map((row) => (
                <tr
                  key={row.orderId}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{row.customerName}</p>
                    <p className="text-xs text-ink-subtle" data-numeric>
                      {row.code}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted" data-numeric>
                    {formatBillableUnits(freightMode, row.units)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted" data-numeric>
                    {formatGhs(row.estimate)}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink" data-numeric>
                    {formatGhs(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-open">
          {state.message}
        </p>
      )}

      {!locked && (
        <Button
          type="submit"
          size="lg"
          block
          loading={pending}
          disabled={charge <= 0 || rows.length === 0}
        >
          {canRevise
            ? `Update ${rows.length} shipping invoice${rows.length === 1 ? "" : "s"}`
            : `Send ${rows.length} shipping invoice${rows.length === 1 ? "" : "s"}`}
        </Button>
      )}
    </form>
  );
}
