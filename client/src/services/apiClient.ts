const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Error codes the UI branches on. Anything else falls back to generic copy. */
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_PDF'
  | 'ENCRYPTED_PDF'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_FILES'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'NO_FILE_UPLOADED'
  | 'FILE_NOT_FOUND'
  | 'FILE_EXPIRED'
  | 'PAGE_OUT_OF_RANGE'
  | 'EMPTY_RESULT'
  | 'PROCESSING_FAILED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'CANCELLED';

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

/** An error already phrased for a person — `message` is safe to render. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ApiErrorCode,
    message: string,
    status = 0,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Per-field validation messages, when the server supplied them. */
  get fieldErrors(): Record<string, string> {
    const fields = this.details?.['fields'];
    return typeof fields === 'object' && fields !== null ? (fields as Record<string, string>) : {};
  }

  /** True when retrying the same request could plausibly succeed. */
  get isRetryable(): boolean {
    return this.code === 'NETWORK_ERROR' || this.status >= 500 || this.status === 429;
  }
}

const NETWORK_MESSAGE =
  "We couldn't reach the server. Check your connection and try again.";

function buildUrl(path: string): string {
  return `${API_BASE_URL}/api${path}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {};
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // Non-JSON error responses (proxy errors, gateway pages) fall through.
  }

  const code = (body.error?.code ?? 'INTERNAL_ERROR') as ApiErrorCode;
  const message =
    body.error?.message ?? 'Something went wrong while processing your file. Please try again.';

  return new ApiError(code, message, response.status, body.error?.details);
}

/** Issues a JSON request and unwraps the response, normalising all failures. */
export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError('CANCELLED', 'Request cancelled.');
    }
    throw new ApiError('NETWORK_ERROR', NETWORK_MESSAGE);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Uploads a single file.
 *
 * Uses XMLHttpRequest rather than fetch because it is the only way to report
 * upload progress, which matters for multi-megabyte PDFs on slow connections.
 */
export function uploadFile<T>(path: string, file: File, options: UploadOptions = {}): Promise<T> {
  const { onProgress, signal } = options;

  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError('CANCELLED', 'Upload cancelled.'));
      return;
    }

    const request = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    const onAbort = () => request.abort();
    signal?.addEventListener('abort', onAbort, { once: true });

    const cleanup = () => signal?.removeEventListener('abort', onAbort);

    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    });

    request.addEventListener('load', () => {
      cleanup();

      let parsed: unknown;
      try {
        parsed = JSON.parse(request.responseText) as unknown;
      } catch {
        parsed = undefined;
      }

      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve(parsed as T);
        return;
      }

      const body = (parsed ?? {}) as ApiErrorBody;
      reject(
        new ApiError(
          (body.error?.code ?? 'INTERNAL_ERROR') as ApiErrorCode,
          body.error?.message ?? 'We could not upload this file. Please try again.',
          request.status,
          body.error?.details,
        ),
      );
    });

    request.addEventListener('error', () => {
      cleanup();
      reject(new ApiError('NETWORK_ERROR', NETWORK_MESSAGE));
    });

    request.addEventListener('abort', () => {
      cleanup();
      reject(new ApiError('CANCELLED', 'Upload cancelled.'));
    });

    request.addEventListener('timeout', () => {
      cleanup();
      reject(
        new ApiError('NETWORK_ERROR', 'The upload timed out. Please check your connection.'),
      );
    });

    request.open('POST', buildUrl(path));
    // Generous: a large PDF on a slow connection still needs to get through.
    request.timeout = 5 * 60 * 1000;
    request.send(formData);
  });
}

/** Absolute URL for downloading a stored file. */
export function downloadUrl(fileId: string): string {
  return buildUrl(`/files/${fileId}/download`);
}
