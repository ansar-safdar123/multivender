/** Express 5 types params as string | string[] */
export function paramId(p: string | string[] | undefined): string {
  if (typeof p === "string") return p;
  if (Array.isArray(p)) return p[0] ?? "";
  return "";
}
