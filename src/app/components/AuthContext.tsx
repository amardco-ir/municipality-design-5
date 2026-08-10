import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_SESSION_UPDATED_EVENT,
  AUTH_STORAGE_KEY,
  clearLocalStorageExceptTheme,
  getJwtExpiresAt,
  hasStoredAuthSession,
} from "../utils/authStorage";

interface AuthContextType {
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (authenticated: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_EXPIRY_LOGOUT_SKEW_MS = 30_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authSessionVersion, setAuthSessionVersion] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const hasSession = hasStoredAuthSession();
    if (hasSession) {
      localStorage.setItem(AUTH_STORAGE_KEY, "true");
    }
    return hasSession;
  });

  const logoutExpiredSession = () => {
    clearLocalStorageExceptTheme();
    setIsAuthenticated(false);
    setIsLoginModalOpen(false);
    if (location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  };

  const handleSetIsAuthenticated = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
    if (typeof window !== "undefined") {
      if (authenticated) {
        localStorage.setItem(AUTH_STORAGE_KEY, "true");
        setAuthSessionVersion((current) => current + 1);
        window.dispatchEvent(new CustomEvent("user-logged-in"));
      } else {
        clearLocalStorageExceptTheme();
      }
    }
  };

  useEffect(() => {
    const handleSessionExpired = () => logoutExpiredSession();
    const handleSessionUpdated = () => {
      if (hasStoredAuthSession()) {
        setIsAuthenticated(true);
        setAuthSessionVersion((current) => current + 1);
      }
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, handleSessionUpdated);
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, handleSessionUpdated);
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const expiresAt = getJwtExpiresAt();
    if (!expiresAt) return undefined;

    const remainingMs = expiresAt - Date.now() - AUTH_EXPIRY_LOGOUT_SKEW_MS;
    if (remainingMs <= 0) {
      logoutExpiredSession();
      return undefined;
    }

    const timeoutId = window.setTimeout(logoutExpiredSession, remainingMs);
    return () => window.clearTimeout(timeoutId);
  }, [authSessionVersion, isAuthenticated, location.pathname, navigate]);

  return (
    <AuthContext.Provider
      value={{
        isLoginModalOpen,
        setIsLoginModalOpen,
        isAuthenticated,
        setIsAuthenticated: handleSetIsAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthModal must be used within AuthProvider");
  }
  return context;
}
