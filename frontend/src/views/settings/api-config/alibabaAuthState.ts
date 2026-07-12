export interface AlibabaAuthStatusLike {
  hasToken?: boolean;
  isExpired?: boolean;
}

export function hasUsableAlibabaToken(status: AlibabaAuthStatusLike | null | undefined): boolean {
  return Boolean(status?.hasToken && !status?.isExpired);
}
