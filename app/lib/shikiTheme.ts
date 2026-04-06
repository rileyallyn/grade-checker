/** Shiki theme ids registered in `getShikiHighlighter` (must match bundled themes). */
export function shikiThemeForColorScheme(
  colorScheme: 'light' | 'dark' | null | undefined,
): 'nord' | 'github-light' {
  return colorScheme === 'dark' ? 'nord' : 'github-light';
}
