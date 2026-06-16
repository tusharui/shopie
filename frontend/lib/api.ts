const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

async function request<T>(method: string, path: string, body?: unknown): Promise<{ data: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API ${method} ${path} failed: ${res.status}`);
  }

  return { data: await res.json() };
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
};
