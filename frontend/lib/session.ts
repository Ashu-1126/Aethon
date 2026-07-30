// Session storage: sessionStorage by default (cleared when the tab/browser
// closes, so login is required every new session) — localStorage only when
// the user explicitly checks "Remember me" on the login page.

const TOKEN_KEY = "aethon_token";
const ROLE_KEY = "aethon_role";

// Older builds always wrote the token to localStorage with no expiry and no
// "remember me" concept, so browsers that logged in before this fix shipped
// have a token sitting in localStorage that would otherwise silently keep
// bypassing the login screen forever. Force exactly one re-login per browser
// by wiping any pre-existing token the first time this code runs there.
const MIGRATION_KEY = "aethon_session_v2";
function migrateOnce(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_KEY)) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  localStorage.setItem(MIGRATION_KEY, "1");
}

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

// Runs once per browser, the first time this module loads after the fix
// ships, before anything else in this file can read a stale token.
migrateOnce();
