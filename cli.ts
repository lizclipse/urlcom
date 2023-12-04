import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { ServeOptions, parseConfig } from "./config.ts";
import { EXIT_MISSING_CONFIG } from "./consts.ts";

const defaultFilaname = "./urlcom.json";

export async function parseArgs(args: string[]): Promise<ServeOptions> {
  const res = await new Command()
    .name("urlcom")
    .version("0.1.0")
    .description("A server for executing pre-defined commands via URLs")
    .option("-c, --config <config:string>", "Path to config file")
    .option("-p, --port <port:number>", "Port to listen on")
    .parse(args);

  const configPath = res.options.config ?? defaultFilaname;
  const config = await readFile(configPath);
  return parseConfig(config);
}

async function readFile(filename: string): Promise<string> {
  try {
    return await Deno.readTextFile(filename);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      console.error(`Config file not found: ${filename}`);
      Deno.exit(EXIT_MISSING_CONFIG);
    }

    throw err;
  }
}
