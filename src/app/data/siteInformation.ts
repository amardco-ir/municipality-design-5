import { dotNet10ApiFetch, dotNet10ApiUrl } from "./api";
import { AUTH_TOKEN_KEY } from "../utils/authStorage";

export interface SiteInformation {
  id: string;
  title: string;
  tel: string;
  email: string;
  address: string;
  postalCode: string;
  description: string;
  logo: string | null;
  enamad: string;
}

export interface SiteInformationInput extends SiteInformation {
  logoFile?: File | null;
}

type ApiEnvelope<T = unknown> = {
  isSuccess?: boolean;
  IsSuccess?: boolean;
  isFailure?: boolean;
  IsFailure?: boolean;
  value?: T;
  Value?: T;
  message?: string;
  Message?: string;
  error?: { code?: string; name?: string; description?: string };
  Error?: { Code?: string; Name?: string; Description?: string };
};

type RawSiteInformation = Partial<SiteInformation> & {
  Id?: string;
  Title?: string;
  Tel?: string;
  Email?: string;
  Address?: string;
  PostalCode?: string;
  Description?: string;
  Logo?: string | null;
  Enamad?: string;
};

const HEADER_ENDPOINT = "/api/information/header";
const FOOTER_ENDPOINT = "/api/information/footer";
const ADMIN_INFORMATION_ENDPOINT = "/api/admin/information";

export const emptySiteInformation: SiteInformation = {
  id: "",
  title: "",
  tel: "",
  email: "",
  address: "",
  postalCode: "",
  description: "",
  logo: null,
  enamad: "",
};

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY)?.replace(/^Bearer\s+/i, "")
      : "";

  return {
    Accept: "text/plain",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeSiteInformation(
  data: RawSiteInformation | null | undefined,
): SiteInformation {
  return {
    id: data?.id ?? data?.Id ?? "",
    title: data?.title ?? data?.Title ?? "",
    tel: data?.tel ?? data?.Tel ?? "",
    email: data?.email ?? data?.Email ?? "",
    address: data?.address ?? data?.Address ?? "",
    postalCode: data?.postalCode ?? data?.PostalCode ?? "",
    description: data?.description ?? data?.Description ?? "",
    logo: data?.logo ?? data?.Logo ?? null,
    enamad: data?.enamad ?? data?.Enamad ?? "",
  };
}

async function parseResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<ApiEnvelope<T> | T> {
  const text = await response.text();
  let data: ApiEnvelope<T> | T = {} as ApiEnvelope<T>;

  if (text) {
    try {
      data = JSON.parse(text) as ApiEnvelope<T> | T;
    } catch {
      if (!response.ok) throw new Error(text);
    }
  }

  const envelope = data as ApiEnvelope<T>;
  const isSuccess = envelope.isSuccess ?? envelope.IsSuccess;
  const isFailure = envelope.isFailure ?? envelope.IsFailure;

  if (
    !response.ok ||
    isSuccess === false ||
    (isSuccess !== true && isFailure === true)
  ) {
    throw new Error(
      envelope.message ||
        envelope.Message ||
        envelope.error?.name ||
        envelope.error?.description ||
        envelope.Error?.Name ||
        envelope.Error?.Description ||
        fallbackMessage,
    );
  }

  return data;
}

async function requestInformation<T>(
  endpoint: string,
  options: RequestInit,
  fallbackMessage: string,
) {
  const response = await dotNet10ApiFetch(endpoint, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  return parseResponse<T>(response, fallbackMessage);
}

function unwrapValue<T>(data: ApiEnvelope<T> | T): T {
  const envelope = data as ApiEnvelope<T>;
  return (envelope.value ?? envelope.Value ?? data) as T;
}

export async function fetchHeaderInformation(
  signal?: AbortSignal,
): Promise<Pick<SiteInformation, "title" | "logo">> {
  const data = await requestInformation<RawSiteInformation>(
    HEADER_ENDPOINT,
    { method: "GET", signal },
    "دریافت اطلاعات هدر ناموفق بود.",
  );

  const normalized = normalizeSiteInformation(unwrapValue(data));
  return { title: normalized.title, logo: normalized.logo };
}

export async function fetchFooterInformation(
  signal?: AbortSignal,
): Promise<SiteInformation> {
  try {
    const data = await requestInformation<RawSiteInformation>(
      FOOTER_ENDPOINT,
      { method: "GET", signal },
      "دریافت اطلاعات فوتر ناموفق بود.",
    );

    const normalized = normalizeSiteInformation(unwrapValue(data));

    // If enamad is empty, try to fetch from admin endpoint
    if (!normalized.enamad) {
      try {
        const adminData = await requestInformation<RawSiteInformation>(
          ADMIN_INFORMATION_ENDPOINT,
          { method: "GET", signal },
          "",
        );
        const adminNormalized = normalizeSiteInformation(
          unwrapValue(adminData),
        );
        if (adminNormalized.enamad) {
          normalized.enamad = adminNormalized.enamad;
        }
      } catch {
        // Silently fail if admin endpoint doesn't work
      }
    }

    return normalized;
  } catch (error) {
    console.error("Footer information fetch error:", error);
    return emptySiteInformation;
  }
}

export async function fetchAdminInformation(
  signal?: AbortSignal,
): Promise<SiteInformation> {
  const data = await requestInformation<RawSiteInformation>(
    ADMIN_INFORMATION_ENDPOINT,
    { method: "GET", signal },
    "دریافت اطلاعات سازمان ناموفق بود.",
  );

  return normalizeSiteInformation(unwrapValue(data));
}

export async function saveAdminInformation(
  input: SiteInformationInput,
): Promise<void> {
  const formData = new FormData();
  formData.append("Id", input.id);
  formData.append("Title", input.title);
  formData.append("Tel", input.tel);
  formData.append("Email", input.email);
  formData.append("Address", input.address);
  formData.append("PostalCode", input.postalCode);
  formData.append("Description", input.description);
  formData.append("Enamad", input.enamad);
  if (input.logoFile instanceof File && input.logoFile.size > 0) {
    formData.append("Logo", input.logoFile, input.logoFile.name);
  }

  await requestInformation(
    ADMIN_INFORMATION_ENDPOINT,
    {
      method: "POST",
      body: formData,
    },
    "ذخیره اطلاعات سایت ناموفق بود.",
  );
}

export function resolveInformationImageSrc(
  value: string | null | undefined,
  fallback: string,
) {
  const imageValue = value?.trim();
  if (!imageValue) return fallback;

  // If it's already a data URI, return as-is
  if (imageValue.startsWith("data:")) {
    return imageValue;
  }

  // If it's an absolute URL (http:// or https://), return as-is
  if (/^https?:\/\//i.test(imageValue)) {
    return imageValue;
  }

  // If it's a protocol-relative URL (//)
  if (imageValue.startsWith("//")) {
    return imageValue;
  }

  // If it looks like base64
  const compactBase64 = imageValue.replace(/^data:image\/[^;]+;base64,/i, "");
  const isLikelyBase64Image =
    compactBase64.length > 80 && /^[A-Za-z0-9+/=]+$/.test(compactBase64);
  if (isLikelyBase64Image) {
    const mimeType = compactBase64.startsWith("/9j/")
      ? "image/jpeg"
      : compactBase64.startsWith("iVBOR")
        ? "image/png"
        : compactBase64.startsWith("R0lG")
          ? "image/gif"
          : compactBase64.startsWith("UklGR")
            ? "image/webp"
            : compactBase64.startsWith("PHN2Z")
              ? "image/svg+xml"
              : "image/png";

    return `data:${mimeType};base64,${compactBase64}`;
  }

  // If it's a relative path in public folder
  const normalizedPath = imageValue.replace(/\\/g, "/");
  if (normalizedPath.startsWith("/images/")) return normalizedPath;
  if (
    normalizedPath.startsWith("/") ||
    normalizedPath.includes("/") ||
    /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(normalizedPath)
  ) {
    return dotNet10ApiUrl(
      normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`,
    );
  }

  return fallback;
}
