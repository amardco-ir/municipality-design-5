import { dotNet10ApiFetch } from "./api";
import { AUTH_TOKEN_KEY } from "../utils/authStorage";

type ApiEnvelope<T = unknown> = {
  isSuccess?: boolean;
  IsSuccess?: boolean;
  isFailure?: boolean;
  IsFailure?: boolean;
  value?: T;
  Value?: T;
  error?: { code?: string; name?: string; description?: string };
  Error?: { Code?: string; Name?: string; Description?: string };
};

const PAYMENT_LOG_ENDPOINT = "/api/payment/Log";
export type PaymentLogPayload = unknown;

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY)?.replace(/^Bearer\s+/i, "")
      : null;

  return {
    Accept: "*/*",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getFailureMessage(envelope: ApiEnvelope<unknown>) {
  return (
    envelope.error?.name ||
    envelope.error?.description ||
    envelope.Error?.Name ||
    envelope.Error?.Description ||
    "دریافت لاگ پرداخت ناموفق بود."
  );
}

async function parsePaymentLogResponse(
  response: Response,
): Promise<PaymentLogPayload | null> {
  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new Error("دریافت لاگ پرداخت ناموفق بود.");
    }
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(text);
    }
    return null;
  }

  const envelope = payload as ApiEnvelope<PaymentLogPayload>;
  const isSuccess = envelope.isSuccess ?? envelope.IsSuccess;
  const isFailure = envelope.isFailure ?? envelope.IsFailure;

  if (
    !response.ok ||
    isSuccess === false ||
    (isSuccess !== true && isFailure === true)
  ) {
    throw new Error(getFailureMessage(envelope));
  }

  if (envelope.value !== undefined) {
    return envelope.value ?? null;
  }

  if (envelope.Value !== undefined) {
    return envelope.Value ?? null;
  }

  if (payload !== null && payload !== undefined) {
    return payload;
  }

  return null;
}

export async function fetchPaymentLog(
  query: string | null,
  signal?: AbortSignal,
): Promise<PaymentLogPayload | null> {
  const url = query ? `${PAYMENT_LOG_ENDPOINT}?${query}` : PAYMENT_LOG_ENDPOINT;
  const response = await dotNet10ApiFetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });

  return parsePaymentLogResponse(response);
}

// Raw fetch that returns the parsed JSON payload (envelope or payload)
// even when the API reports a logical failure. This is used by the UI
// to display the server response (including error details) to the user
// so they can print/save it as PDF.
export async function fetchPaymentLogRaw(
  query: string | null,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const url = query ? `${PAYMENT_LOG_ENDPOINT}?${query}` : PAYMENT_LOG_ENDPOINT;
  const response = await dotNet10ApiFetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });

  const text = await response.text();
  if (!text) return null;

  try {
    const payload = JSON.parse(text);
    if (payload && typeof payload === "object") {
      return payload as Record<string, unknown>;
    }
    return { raw: String(payload) };
  } catch {
    return { raw: text };
  }
}
