/** Shiki theme ids registered in `getShikiHighlighter`. */
export function shikiThemeForColorScheme(
  colorScheme: 'light' | 'dark' | null | undefined,
): 'nord' | 'github-light' {
  return colorScheme === 'dark' ? 'nord' : 'github-light';
}
