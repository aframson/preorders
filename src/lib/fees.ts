/**
 * Platform fee, expressed as the percentage retained from each transaction.
 *
 * The two stages are configured separately on purpose: a vendor will accept a
 * fee on goods, but charging one on pass-through freight means taking a cut of
 * money that was never theirs, which is the fastest way to lose them.
 */
export const PLATFORM_FEE_PERCENT = {
  goods: 2,
  freight: 0,
} as const;

export type PaymentStage = keyof typeof PLATFORM_FEE_PERCENT;

export function platformFeePercent(stage: PaymentStage): number {
  return PLATFORM_FEE_PERCENT[stage];
}
