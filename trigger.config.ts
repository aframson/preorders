import type { TriggerConfig } from "@trigger.dev/sdk";

export const config: TriggerConfig = {
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_preorders",
  dirs: ["./src/trigger"],
  maxDuration: 300,
};
