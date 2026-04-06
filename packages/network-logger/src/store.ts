export type LoggedRequest = {
  id: string;
  method: string;
  url: string;
  status?: number;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  error?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
};

type Listener = (entries: LoggedRequest[]) => void;

const MAX_ENTRIES = 100;
/** Cap stored bodies so the log does not balloon memory on huge payloads. */
const MAX_BODY_CHARS = 500_000;

const listeners = new Set<Listener>();

let entries: LoggedRequest[] = [];

function notify() {
  for (const listener of listeners) {
    listener(entries);
  }
}

export function sanitizeHeadersForLog(
  headers: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...headers };
  for (const key of Object.keys(out)) {
    if (key.toLowerCase() === 'authorization') {
      out[key] = '[REDACTED]';
    }
  }
  return out;
}

function truncateBody(text: string): string {
  if (text.length <= MAX_BODY_CHARS) return text;
  return `${text.slice(0, MAX_BODY_CHARS)}\n\n... truncated (${text.length} chars total)`;
}

export function headersFromFetchInit(
  headers?: HeadersInit | null,
): Record<string, string> | undefined {
  if (headers == null) return undefined;
  const out: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [k, v] of headers) {
      out[k] = v;
    }
    return out;
  }
  return { ...headers };
}

export function headersFromResponse(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function logRequestStart(
  method: string,
  url: string,
  options?: {
    requestHeaders?: Record<string, string>;
    requestBody?: string;
  },
): LoggedRequest {
  const entry: LoggedRequest = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    method,
    url,
    startedAt: Date.now(),
    ...(options?.requestHeaders && {
      requestHeaders: sanitizeHeadersForLog(options.requestHeaders),
    }),
    ...(options?.requestBody != null && options.requestBody !== ''
      ? { requestBody: truncateBody(options.requestBody) }
      : {}),
  };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  notify();
  return entry;
}

export function logRequestEnd(
  entryId: string,
  info: {
    status?: number;
    error?: string;
    responseHeaders?: Record<string, string>;
    responseBody?: string;
  },
) {
  entries = entries.map((entry) =>
    entry.id === entryId
      ? {
          ...entry,
          status: info.status ?? entry.status,
          error: info.error ?? entry.error,
          endedAt: Date.now(),
          durationMs: Date.now() - entry.startedAt,
          ...(info.responseHeaders
            ? { responseHeaders: info.responseHeaders }
            : {}),
          ...(info.responseBody != null && info.responseBody !== ''
            ? { responseBody: truncateBody(info.responseBody) }
            : {}),
        }
      : entry,
  );
  notify();
}

export async function loggedFetch(
  url: string,
  init?: RequestInit,
): Promise<{ response: Response; text: string }> {
  const method = init?.method ?? 'GET';
  const requestHeaders = headersFromFetchInit(init?.headers);
  const requestBody =
    typeof init?.body === 'string'
      ? init.body
      : init?.body == null
        ? undefined
        : String(init.body);

  const entry = logRequestStart(method, url, {
    requestHeaders,
    requestBody,
  });

  try {
    const response = await fetch(url, init);
    const responseHeaders = headersFromResponse(response);
    const text = await response.text();

    logRequestEnd(entry.id, {
      status: response.status,
      responseHeaders,
      responseBody: text,
    });

    return { response, text };
  } catch (error: unknown) {
    logRequestEnd(entry.id, { error: String((error as Error)?.message ?? error) });
    throw error;
  }
}

export function useNetworkLog(): LoggedRequest[] {
  const [state, setState] = require('react').useState(entries);

  require('react').useEffect(() => {
    const listener: Listener = (nextEntries) => setState(nextEntries);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
