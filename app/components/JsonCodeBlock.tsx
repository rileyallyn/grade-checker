import type { ThemedToken } from '@shikijs/types';
import { Fragment, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { getShikiHighlighter } from '@/lib/shikiHighlighter';
import { shikiThemeForColorScheme } from '@/lib/shikiTheme';

type Props = {
  /** Pretty-printed or raw JSON text to highlight */
  code: string;
  colorScheme: 'light' | 'dark';
};

function tokenTextStyle(token: ThemedToken) {
  const fs = token.fontStyle;
  return {
    color: token.color ?? '#888888',
    fontWeight: fs !== undefined && (fs & 2) !== 0 ? ('700' as const) : ('400' as const),
    fontStyle: fs !== undefined && (fs & 1) !== 0 ? ('italic' as const) : ('normal' as const),
    textDecorationLine:
      fs !== undefined && (fs & 4) !== 0 ? ('underline' as const) : ('none' as const),
  };
}

function ShikiTokenLines({ tokens }: { tokens: ThemedToken[][] }) {
  return (
    <Text style={styles.mono} selectable={Platform.OS === 'web'}>
      {tokens.map((line, lineIdx) => (
        <Fragment key={lineIdx}>
          {line.map((token, tokIdx) => (
            <Text key={tokIdx} style={tokenTextStyle(token)}>
              {token.content}
            </Text>
          ))}
          {lineIdx < tokens.length - 1 ? '\n' : null}
        </Fragment>
      ))}
    </Text>
  );
}

export function JsonCodeBlock({ code, colorScheme }: Props) {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTokens(null);
    const theme = shikiThemeForColorScheme(colorScheme);

    (async () => {
      try {
        const hl = await getShikiHighlighter();
        if (cancelled) return;
        const lines = await hl.codeToTokensBase(code, { lang: 'json', theme });
        if (cancelled) return;
        setTokens(lines);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setTokens(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, colorScheme]);

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingHint}> Loading syntax highlight…</Text>
      </View>
    );
  }

  if (error || !tokens) {
    return (
      <Text style={[styles.mono, styles.fallback]} selectable={Platform.OS === 'web'}>
        {code}
      </Text>
    );
  }

  return <ShikiTokenLines tokens={tokens} />;
}

const styles = StyleSheet.create({
  mono: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  fallback: {
    opacity: 0.95,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  loadingHint: {
    fontSize: 11,
    opacity: 0.7,
    marginLeft: 8,
  },
});
