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

export type PaymentReportRecord = Record<string, unknown>;

const PAYMENT_REPORTS_ENDPOINT = "/api/reports/payments";

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

function unwrapArray(value: unknown): PaymentReportRecord[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is PaymentReportRecord =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  if (!value || typeof value !== "object") return [];

  const source = value as Record<string, unknown>;
  const list = source.items ?? source.data ?? source.result ?? source.results ?? source.rows;
  return unwrapArray(list);
}

async function parseResponse(
  response: Response,
): Promise<ApiEnvelope<PaymentReportRecord[]> | PaymentReportRecord[]> {
  const text = await response.text();
  let data: ApiEnvelope<PaymentReportRecord[]> | PaymentReportRecord[] = [];

  if (text) {
    try {
      data = JSON.parse(text) as
        | ApiEnvelope<PaymentReportRecord[]>
        | PaymentReportRecord[];
    } catch {
      if (!response.ok) throw new Error(text);
    }
  }

  const envelope = data as ApiEnvelope<PaymentReportRecord[]>;
  const isSuccess = envelope.isSuccess ?? envelope.IsSuccess;
  const isFailure = envelope.isFailure ?? envelope.IsFailure;

  if (
    !response.ok ||
    isSuccess === false ||
    (isSuccess !== true && isFailure === true)
  ) {
    throw new Error(
      envelope.error?.name ||
        envelope.error?.description ||
        envelope.Error?.Name ||
        envelope.Error?.Description ||
        "دریافت سوابق پرداخت ناموفق بود.",
    );
  }

  return data;
}

export async function fetchPaymentReports(
  signal?: AbortSignal,
): Promise<PaymentReportRecord[]> {
  const response = await dotNet10ApiFetch(PAYMENT_REPORTS_ENDPOINT, {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });
  const data = await parseResponse(response);

  if (Array.isArray(data)) return data;
  return unwrapArray(data.value ?? data.Value);
}
