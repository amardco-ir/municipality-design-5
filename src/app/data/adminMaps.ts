import { dotNet10ApiFetch } from "./api";
import { AUTH_TOKEN_KEY } from "../utils/authStorage";

type ApiEnvelope<T = unknown> = {
  isSuccess?: boolean;
  IsSuccess?: boolean;
  isFailure?: boolean;
  IsFailure?: boolean;
  error?: { code?: string; name?: string; description?: string };
  Error?: { Code?: string; Name?: string; Description?: string };
  value?: T;
  Value?: T;
};

export interface MapSettings {
  customBaseMapUrl: string;
  melkLayerUrl: string;
  geometryServiceAddress: string;
  printServiceAddress: string;
  arseLayerId: string;
  lockExtent: boolean;
}

type RawMapSettings = Partial<MapSettings> & {
  CustomBaseMapUrl?: string;
  MelkLayerUrl?: string;
  GeometryServiceAddress?: string;
  PrintServiceAddress?: string;
  ArseLayerId?: string;
  LockExtent?: boolean;
};

const MAPS_ENDPOINT = "/api/admin/maps";

export const emptyMapSettings: MapSettings = {
  customBaseMapUrl: "",
  melkLayerUrl: "",
  geometryServiceAddress: "",
  printServiceAddress: "",
  arseLayerId: "",
  lockExtent: false,
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

function normalizeMapSettings(
  data: RawMapSettings | null | undefined,
): MapSettings {
  return {
    customBaseMapUrl: data?.customBaseMapUrl ?? data?.CustomBaseMapUrl ?? "",
    melkLayerUrl: data?.melkLayerUrl ?? data?.MelkLayerUrl ?? "",
    geometryServiceAddress:
      data?.geometryServiceAddress ?? data?.GeometryServiceAddress ?? "",
    printServiceAddress:
      data?.printServiceAddress ?? data?.PrintServiceAddress ?? "",
    arseLayerId: data?.arseLayerId ?? data?.ArseLayerId ?? "",
    lockExtent: data?.lockExtent ?? data?.LockExtent ?? false,
  };
}

async function parseResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<ApiEnvelope<T>> {
  const text = await response.text();
  let data: ApiEnvelope<T> = {};

  if (text) {
    try {
      data = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      if (!response.ok) throw new Error(text);
    }
  }

  const isSuccess = data.isSuccess ?? data.IsSuccess;
  const isFailure = data.isFailure ?? data.IsFailure;

  if (
    !response.ok ||
    isSuccess === false ||
    (isSuccess !== true && isFailure === true)
  ) {
    throw new Error(
      data.error?.name ||
        data.error?.description ||
        data.Error?.Name ||
        data.Error?.Description ||
        fallbackMessage,
    );
  }

  return data;
}

async function requestMapSettings<T>(
  options: RequestInit,
  fallbackMessage: string,
): Promise<ApiEnvelope<T>> {
  const response = await dotNet10ApiFetch(MAPS_ENDPOINT, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  return parseResponse<T>(response, fallbackMessage);
}

export async function fetchMapSettings(
  signal?: AbortSignal,
): Promise<MapSettings> {
  const data = await requestMapSettings<RawMapSettings>(
    { method: "GET", signal },
    "دریافت تنظیمات نقشه ناموفق بود.",
  );

  return normalizeMapSettings(data.value ?? data.Value);
}

export async function saveMapSettings(settings: MapSettings): Promise<void> {
  await requestMapSettings(
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customBaseMapUrl: settings.customBaseMapUrl,
        melkLayerUrl: settings.melkLayerUrl,
        geometryServiceAddress: settings.geometryServiceAddress,
        printServiceAddress: settings.printServiceAddress,
        arseLayerId: settings.arseLayerId,
        lockExtent: settings.lockExtent,
      }),
    },
    "ذخیره تنظیمات نقشه ناموفق بود.",
  );
}
