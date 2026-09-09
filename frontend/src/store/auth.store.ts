import { create } from "zustand";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  init: () => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("mm_token"),
  loading: false,
  error: null,
  init: async () => {
    const token = localStorage.getItem("mm_token");
    if (!token) return;
    set({ loading: true });
    try {
      const { user } = await api.me();
      set({ user, token, loading: false });
    } catch {
      localStorage.removeItem("mm_token");
      set({ user: null, token: null, loading: false });
    }
  },
  register: async (email, username, password) => {
    set({ loading: true, error: null });
    try {
      const { user, token } = await api.register({ email, username, password });
      localStorage.setItem("mm_token", token);
      set({ user, token, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message || "Registration failed" });
      throw e;
    }
  },
  login: async (emailOrUsername, password) => {
    set({ loading: true, error: null });
    try {
      const { user, token } = await api.login({ emailOrUsername, password });
      localStorage.setItem("mm_token", token);
      set({ user, token, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message || "Login failed" });
      throw e;
    }
  },
  logout: () => {
    localStorage.removeItem("mm_token");
    set({ user: null, token: null });
  },
}));
