import { atom } from "jotai";

export interface Message {
  role: "user" | "assistant";
  content: string;
  meta?: {
    status?: "streaming" | "done" | "error";
  };
}

export interface Session {
  id: string;
  name: string;
  messages: Message[];
}

// Sessions map
export const sessionsAtom = atom<Record<string, Session>>({});

// Current session ID
export const currentSessionIdAtom = atom<string | null>(null);

// Is temp session (not saved yet)
export const tempSessionAtom = atom<boolean>(false);

// Current messages (derived from current session)
export const currentMessagesAtom = atom<Message[]>([]);

// Selected model
export const selectedModelAtom = atom<string>("1");

// Streaming mode
export const isStreamingAtom = atom<boolean>(false);

// Loading state
export const loadingAtom = atom<boolean>(false);
