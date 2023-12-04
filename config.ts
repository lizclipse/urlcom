import { z } from "https://deno.land/x/zod@v3.16.1/mod.ts";
import { EXIT_INVALID_CONFIG } from "./consts.ts";

export const Command = z.object({
  /** The secret to validate with */
  secret: z.string().min(1, "secret must be a non-empty string"),
  /** The command to run */
  cmd: z.string().min(1, "cmd must be a non-empty string"),
});
export type Command = z.infer<typeof Command>;

export const ServeOptions = z.object({
  port: z
    .number()
    .gt(0, "port must be a positive integer")
    .lt(65536, "port must be less than 65536")
    .int()
    .optional()
    .nullable(),
  commands: z.record(Command),
});
export type ServeOptions = z.infer<typeof ServeOptions>;

export function parseConfig(raw: string): ServeOptions {
  const obj = JSON.parse(raw);
  const result = ServeOptions.safeParse(obj);
  if (!result.success) {
    console.error(`Invalid config: ${result.error.message}`);
    Deno.exit(EXIT_INVALID_CONFIG);
  }

  return result.data;
}
