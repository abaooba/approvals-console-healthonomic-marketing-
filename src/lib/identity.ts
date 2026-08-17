import * as netlifyIdentity from "netlify-identity-widget";
import type { User } from "netlify-identity-widget";

interface IdentityHandlers {
  onInit: (user: User | null) => void;
  onLogin: (user: User) => void;
  onLogout: () => void;
}

let widgetInitialized = false;

export function initIdentity(handlers: IdentityHandlers): void {
  netlifyIdentity.on("init", handlers.onInit);
  netlifyIdentity.on("login", (user) => {
    handlers.onLogin(user);
    netlifyIdentity.close();
  });
  netlifyIdentity.on("logout", handlers.onLogout);
  if (widgetInitialized) {
    // React StrictMode mounts effects twice; init() must only run once.
    handlers.onInit(netlifyIdentity.currentUser());
  } else {
    widgetInitialized = true;
    netlifyIdentity.init();
  }
}

export function openLogin(): void {
  netlifyIdentity.open("login");
}

export function logoutIdentity(): void {
  void netlifyIdentity.logout();
}

export async function getToken(): Promise<string> {
  const user = netlifyIdentity.currentUser();
  const token = user?.token;
  if (!user || !token) throw new Error("Not signed in");
  const expiresAt = Number(token.expires_at);
  if (expiresAt && expiresAt - 60_000 < Date.now()) {
    return netlifyIdentity.refresh();
  }
  return token.access_token;
}
