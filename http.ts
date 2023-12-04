const DEFAULT_MIME = "application/json";

// deno-lint-ignore no-explicit-any
export interface HandleResult<T = any> {
  body: T;
  message: (body: T) => string;
  status?: number;
  headers?: Record<string, string>;
}

export function handle<T, A extends [...unknown[]]>(
  fn: (req: Request, ...args: A) => HandleResult<T> | Promise<HandleResult<T>>
): (req: Request, ...args: A) => Promise<Response> {
  const inner = async (
    req: Request,
    ...args: A
  ): Promise<HandleResult> => {
    try {
      return await fn(req, ...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return err.result();
      }

      console.error(err);
      return new HttpError(500, "Internal Server Error").result();
    }
  };

  return async (req: Request, ...args: A) => {
    const accept = req.headers.get("Accept") ?? undefined;

    const result = await inner(req, ...args);
    return createResponse(result, accept);
  };
}

export function createResponse(
  { body, message, status, headers }: HandleResult,
  acceptRaw = DEFAULT_MIME
): Response {
  // Return JSON by default, unless requesting text
  const accept =
    acceptRaw
      .split(",")
      .map((s) =>
        s
          .split(";")
          .map((s) => s.trim())
          .at(0)
      )
      .filter((s): s is string => !!s)
      .at(0) ?? DEFAULT_MIME;

  switch (accept) {
    case "text/plain":
      return new Response(message(body), {
        status,
        headers: { ...headers, "Content-Type": "text/plain" },
      });
    case "application/json":
    default:
      return new Response(JSON.stringify(body), {
        status,
        headers: { ...headers, "Content-Type": "application/json" },
      });
  }
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
  }

  result(): HandleResult<ErrorResponse> {
    return {
      body: { error: this.message },
      message: ({ error }) => error,
      status: this.status,
    };
  }
}

export interface ErrorResponse {
  error: string;
}
