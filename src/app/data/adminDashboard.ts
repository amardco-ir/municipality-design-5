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

export type MonthlyIncomeRecord = {
  year: number;
  month: number;
  amount: number;
};

export type StatisticFigures = {
  requestCount?: number;
  userCount?: number;
  paymentCount?: number;
  newsCount?: number;
};

export type RequestCounts = {
  active?: number;
  completed?: number;
  cancellation?: number;
};

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

async function parseEnvelopeValue<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const text = await response.text();

  if (!text) {
    if (!response.ok) {
      throw new Error(fallbackMessage);
    }
    return {} as T;
  }

  let payload: unknown = {};
  try {
    payload = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(text);
    }
    return {} as T;
  }

  const envelope = payload as ApiEnvelope<T>;
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
        fallbackMessage,
    );
  }

  if (envelope.value !== undefined) {
    return envelope.value as T;
  }

  return payload as T;
}

export async function fetchDashboardUsersCount(
  signal?: AbortSignal,
): Promise<number> {
  const response = await dotNet10ApiFetch("/api/admin/dashboard/users-counts", {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });

  return parseEnvelopeValue<number>(
    response,
    "دریافت تعداد کاربران ناموفق بود.",
  );
}

export async function fetchDashboardRequestCounts(
  signal?: AbortSignal,
): Promise<RequestCounts> {
  const response = await dotNet10ApiFetch(
    "/api/admin/dashboard/requests-counts",
    {
      method: "GET",
      headers: getAuthHeaders(),
      signal,
    },
  );

  return parseEnvelopeValue<RequestCounts>(
    response,
    "دریافت تعداد درخواست‌ها ناموفق بود.",
  );
}

export async function fetchDashboardMonthlyIncome(
  signal?: AbortSignal,
): Promise<MonthlyIncomeRecord[]> {
  const response = await dotNet10ApiFetch(
    "/api/admin/dashboard/monthly-income",
    {
      method: "GET",
      headers: getAuthHeaders(),
      signal,
    },
  );

  return parseEnvelopeValue<MonthlyIncomeRecord[]>(
    response,
    "دریافت درآمد ماهانه ناموفق بود.",
  );
}

export async function fetchStatisticsFigures(
  signal?: AbortSignal,
): Promise<StatisticFigures> {
  const response = await dotNet10ApiFetch("/api/reports/statistics-figures", {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });

  return parseEnvelopeValue<StatisticFigures>(
    response,
    "دریافت آمار و ارقام ناموفق بود.",
  );
}
