import { useState } from "react";

const KEY = "brutalism:admin-token";

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    // Without storage the token lasts until the tab reloads.
  }
}

/** The admin token for this tab. It is forgotten when the tab closes. */
export function useAdminToken() {
  const [token, setToken] = useState(read);

  function change(next: string | null) {
    write(next);
    setToken(next);
  }

  return { token, signIn: (next: string) => change(next), signOut: () => change(null) };
}
