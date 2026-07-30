// Session storage: sessionStorage by default (cleared when the tab/browser
// closes, so login is required every new session) — localStorage only when
// the user explicitly checks "Remember me" on the login page.

const TOKEN_KEY = "aethon_token";
const ROLE_KEY = "aethon_role";

export function saveSession(token: string, role: string, remember: boolean): void {
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(ROLE_KEY, role);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  return sessionStorage.getItem(ROLE_KEY) || localStorage.getItem(ROLE_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}
