export interface CallAuthOptions {
  call: string;
  secret: string;
  unix: number;
}

export async function validateCallAuth(
  { call, secret, unix }: CallAuthOptions,
  headers: Headers
): Promise<boolean> {
  const auth = headers.get("Authorization");
  return (
    auth === (await createCallHash(call, secret, unix)) ||
    auth === (await createCallHash(call, secret, unix - 1)) ||
    auth === (await createCallHash(call, secret, unix + 1))
  );
}

export function unix(): number {
  return Math.floor(new Date().getTime() / 1000);
}

function createCallHash(
  call: string,
  secret: string,
  unix: number
): Promise<string> {
  return hash(`${call}:${secret}:${unix}`);
}

const encoder = new TextEncoder();
export async function hash(input: string): Promise<string> {
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
