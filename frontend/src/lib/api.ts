const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export type ApiError = { error: string };

export async function api<T = unknown>(
  path: string,
  init?: RequestInit & { token?: string | null }
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = init?.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : ({} as T);

  if (!res.ok) {
    const err = data as ApiError;
    throw new Error(
      typeof err === "object" && err && "error" in err && typeof err.error === "string"
        ? err.error
        : res.statusText
    );
  }

  return data as T;
}

export { API_BASE };
