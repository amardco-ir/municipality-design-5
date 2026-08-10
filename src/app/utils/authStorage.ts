export const AUTH_STORAGE_KEY = "municipality-user-authenticated";
export const AUTH_TYPE_KEY = "municipality-user-type";
export const AUTH_TOKEN_KEY = "auth-token";
export const REFRESH_TOKEN_KEY = "refresh-token";
export const USER_NATIONAL_CODE_KEY = "user-national-code";
export const THEME_STORAGE_KEY = "theme";
export const AUTH_SESSION_EXPIRED_EVENT = "municipality-auth-session-expired";
export const AUTH_SESSION_UPDATED_EVENT = "municipality-auth-session-updated";

const firstTokenValue = (data: any, keys: string[]) => {
  const containers = [data, data?.value, data?.Value];
  for (const container of containers) {
    if (!container || typeof container !== "object") continue;
    for (const key of keys) {
      if (container[key]) return String(container[key]);
    }
  }
  return null;
};

export function getAccessTokenFromPayload(data: unknown) {
  return firstTokenValue(data, ["accessToken", "AccessToken", "access_token", "token", "Token"]);
}

export function getRefreshTokenFromPayload(data: unknown) {
  return firstTokenValue(data, ["refreshToken", "RefreshToken", "refresh_token"]);
}

export function storeAuthTokens(data: unknown, accessToken?: string | null) {
  if (typeof window === "undefined") return;

  const resolvedAccessToken = accessToken ?? getAccessTokenFromPayload(data);
  const refreshToken = getRefreshTokenFromPayload(data);
  if (resolvedAccessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, resolvedAccessToken.replace(/^Bearer\s+/i, ""));
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  if (resolvedAccessToken || refreshToken) {
    window.dispatchEvent(new Event(AUTH_SESSION_UPDATED_EVENT));
  }
}

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return atob(padded);
};

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem(AUTH_TOKEN_KEY)?.replace(/^Bearer\s+/i, "") ?? null;
}

export function getJwtExpiresAt(token?: string | null) {
  if (typeof window === "undefined") return null;

  const resolvedToken = token?.replace(/^Bearer\s+/i, "") ?? getStoredAccessToken();
  const rawPayload = resolvedToken?.split(".")[1];
  if (!rawPayload) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(rawPayload));
    const expiresAtSeconds = Number(payload?.exp);
    if (!Number.isFinite(expiresAtSeconds)) return null;

    return expiresAtSeconds * 1000;
  } catch {
    return null;
  }
}

export function isStoredAccessTokenExpired(skewMs = 0) {
  const expiresAt = getJwtExpiresAt();
  if (!expiresAt) return false;

  return expiresAt <= Date.now() + skewMs;
}

export function hasStoredAuthSession() {
  if (typeof window === "undefined") return false;

  if (isStoredAccessTokenExpired()) {
    clearLocalStorageExceptTheme();
    return false;
  }

  return (
    localStorage.getItem(AUTH_STORAGE_KEY) === "true" ||
    Boolean(localStorage.getItem(AUTH_TOKEN_KEY))
  );
}

export function clearLocalStorageExceptTheme() {
  if (typeof window === "undefined") return;

  const theme = localStorage.getItem(THEME_STORAGE_KEY);
  localStorage.clear();

  if (theme !== null) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

export function expireStoredAuthSession() {
  if (typeof window === "undefined") return;

  clearLocalStorageExceptTheme();
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}
