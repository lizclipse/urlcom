import { basename, dirname } from "https://deno.land/std@0.208.0/url/mod.ts";
import { parseArgs } from "./cli.ts";
import { Command, ServeOptions } from "./config.ts";
import { HandleResult, HttpError, handle } from "./http.ts";
import { unix, validateCallAuth } from "./auth.ts";

const DEFAULT_PORT = 8080;
const ENDPOINT_CALL = "/api/v1/call";

export function serve({ port, commands }: ServeOptions) {
  const cmds = new Map(Object.entries(commands));

  Deno.serve(
    { port: port ?? DEFAULT_PORT },
    handle((req) => {
      const url = new URL(req.url, "http://base");
      switch (dirname(url).pathname) {
        case ENDPOINT_CALL: {
          const call = basename(url);
          const cmd = cmds.get(call);
          if (cmd) {
            return handleCall(req, call, cmd);
          }
        }
      }
      throw new HttpError(404, "Not Found");
    })
  );
}

const decoder = new TextDecoder();
export async function handleCall(
  req: Request,
  call: string,
  { secret, cmd }: Command
): Promise<HandleResult<HandleCallResult>> {
  if (!(await validateCallAuth({ call, secret, unix: unix() }, req.headers))) {
    throw new HttpError(403, "Invalid Authorization");
  }

  console.log("Call:", call, '\t', "Command:", cmd);
  const command = new Deno.Command("/bin/sh", {
    args: ["-c", cmd],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout: stdoutRaw, stderr: stderrRaw } = await command.output();
  const stdout = decoder.decode(stdoutRaw);
  const stderr = decoder.decode(stderrRaw);

  if (code === 0) {
    return {
      status: 200,
      body: { code, stdout, stderr },
      message: () => stdout,
    };
  } else {
    return {
      status: 500,
      body: { code, stdout, stderr },
      message: () => `Command failed with exit code ${code}: ${stderr}`,
    };
  }
}

export interface HandleCallResult {
  code: number;
  stdout: string;
  stderr: string;
}

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const config = await parseArgs(Deno.args);
  serve(config);
}
