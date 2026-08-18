import { defineConfig } from "@trigger.dev/sdk";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load KEY=VALUE pairs from a dotenv file without printing secrets.
 * Later files win when the same key appears twice.
 */
function loadDotEnvFiles(files: string[]): Record<string, string> {
  const out: Record<string, string> = {};

  for (const file of files) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;

    const text = readFileSync(path, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key) out[key] = value;
    }
  }

  return out;
}

/** Keys Trigger tasks need at runtime (Supabase, mail, web-push, site URL). */
const TRIGGER_SYNC_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_SMTP_HOST",
  "EMAIL_SMTP_PORT",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
] as const;

const SECRET_KEYS = new Set([
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "VAPID_PRIVATE_KEY",
]);

const fileEnvAtBoot = loadDotEnvFiles([".env", ".env.local"]);

export default defineConfig({
  project:
    process.env.TRIGGER_PROJECT_REF?.trim() ||
    fileEnvAtBoot.TRIGGER_PROJECT_REF?.trim() ||
    "proj_preorders",
  dirs: ["./src/trigger"],
  maxDuration: 300,
  build: {
    extensions: [
      syncEnvVars(async () => {
        const fileEnv = loadDotEnvFiles([".env", ".env.local"]);
        const merged: Record<string, string> = { ...fileEnv };

        for (const key of TRIGGER_SYNC_KEYS) {
          const fromProcess = process.env[key]?.trim();
          if (fromProcess) merged[key] = fromProcess;
        }

        return TRIGGER_SYNC_KEYS.flatMap((name) => {
          const value = merged[name]?.trim();
          if (!value) return [];
          return [
            {
              name,
              value,
              isSecret: SECRET_KEYS.has(name),
            },
          ];
        });
      }),
    ],
  },
});
