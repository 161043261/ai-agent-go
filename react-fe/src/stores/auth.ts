import { atom } from "jotai";

// Token atom
export const tokenAtom = atom<string | null>(localStorage.getItem("token"));

// Derived atom for checking if user is authenticated
export const isAuthenticatedAtom = atom((get) => !!get(tokenAtom));

// Action atom for setting token
export const setTokenAtom = atom(null, (_get, set, token: string | null) => {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
  set(tokenAtom, token);
});
