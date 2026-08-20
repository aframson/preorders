export type SessionNav =
  | { status: "guest" }
  | { status: "onboarding" }
  | { status: "vendor"; businessName: string };
