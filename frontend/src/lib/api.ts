const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("mm_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let err: any = {};
    try { err = await res.json(); } catch {}
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  // Auth
  register: (body: { email: string; username: string; password: string }) =>
    request<{ user: any; token: string }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { emailOrUsername: string; password: string }) =>
    request<{ user: any; token: string }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<{ user: any }>("/auth/me"),

  // Quiz
  startQuiz: (body: { mode: string; categorySlug?: string; timerSeconds?: number }) =>
    request<{ sessionId: string; mode: string; total: number }>("/quiz/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  nextQuestion: (sessionId: string) =>
    request<any>(`/quiz/${sessionId}/next`),
  submitAnswer: (body: { sessionId: string; questionId: string; userAnswer: string; responseTimeMs: number }) =>
    request<any>("/quiz/submit", { method: "POST", body: JSON.stringify(body) }),
  completeQuiz: (sessionId: string) =>
    request<{ sessionId: string; status: string; score: number }>(`/quiz/${sessionId}/complete`, {
      method: "POST",
    }),
  getResults: (sessionId: string) =>
    request<any>(`/quiz/${sessionId}/results`),
  generateQuestion: (categorySlug?: string) =>
    request<any>("/quiz/generate", { method: "POST", body: JSON.stringify({ categorySlug }) }),

  // Data
  categories: () => request<any[]>("/categories"),
  patterns: () => request<any[]>("/patterns"),
  dashboard: () => request<any>("/dashboard"),
  coach: () => request<any>("/coach"),
  history: () => request<any[]>("/history"),
};
