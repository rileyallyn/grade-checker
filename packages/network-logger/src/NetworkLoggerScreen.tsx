import { useState, type ReactNode } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import type { LoggedRequest } from './store';
import { useNetworkLog } from './store';

export type NetworkLoggerThemeTokens = {
  background: string;
  surface: string;
  titleText: string;
  secondaryText: string;
  bodyText: string;
  mutedText: string;
  accent: string;
  error: string;
  rowHoverBackground: string;
  sheetShadow: string;
  sheetShadowHover: string;
};

export type BodyRendererParams = {
  raw: string;
  formatted: string;
  isJson: boolean;
  kind: 'request' | 'response';
  entry: LoggedRequest;
};

export type NetworkLoggerScreenProps = {
  themeTokens?: Partial<NetworkLoggerThemeTokens>;
  renderBody?: (params: BodyRendererParams) => ReactNode;
};

const DEFAULT_THEME_TOKENS: NetworkLoggerThemeTokens = {
  background: '#ffffff',
  surface: '#ffffff',
  titleText: '#111827',
  secondaryText: '#374151',
  bodyText: '#111827',
  mutedText: '#374151',
  accent: '#4f9fff',
  error: '#b91c1c',
  rowHoverBackground: 'rgba(0,0,0,0.06)',
  sheetShadow: '0 4px 24px rgba(0,0,0,0.08)',
  sheetShadowHover: '0 12px 40px rgba(0,0,0,0.15)',
};

function formatMaybeJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function formatHeaders(h: Record<string, string> | undefined): string {
  if (!h || Object.keys(h).length === 0) return '-';
  return Object.entries(h)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function isJsonText(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

export function NetworkLoggerScreen({
  themeTokens,
  renderBody,
}: NetworkLoggerScreenProps = {}) {
  const entries = useNetworkLog();
  const [sheetHovered, setSheetHovered] = useState(false);
  const [selected, setSelected] = useState<LoggedRequest | null>(null);
  const tokens: NetworkLoggerThemeTokens = { ...DEFAULT_THEME_TOKENS, ...themeTokens };

  const sheetDynamic: ViewStyle[] = [
    styles.sheet,
    {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: sheetHovered ? tokens.accent : 'transparent',
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: sheetHovered ? tokens.sheetShadowHover : tokens.sheetShadow,
            transitionProperty: 'box-shadow, border-color',
            transitionDuration: '180ms',
            cursor: 'default',
          } as unknown as ViewStyle)
        : {}),
    },
  ];

  if (selected) {
    return (
      <View style={[styles.backdrop, { backgroundColor: tokens.background }]}>
        <View
          style={sheetDynamic}
          onPointerEnter={() => Platform.OS === 'web' && setSheetHovered(true)}
          onPointerLeave={() => Platform.OS === 'web' && setSheetHovered(false)}
        >
          <RequestDetailView
            item={selected}
            onBack={() => setSelected(null)}
            tokens={tokens}
            renderBody={renderBody}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.backdrop, { backgroundColor: tokens.background }]}>
      <View
        style={sheetDynamic}
        onPointerEnter={() => Platform.OS === 'web' && setSheetHovered(true)}
        onPointerLeave={() => Platform.OS === 'web' && setSheetHovered(false)}
      >
        <Text style={[styles.title, { color: tokens.titleText }]}>
          HTTP Requests (last {entries.length})
        </Text>
        <Text style={[styles.hint, { color: tokens.secondaryText }]}>
          Tap a row to see the full request and response.
        </Text>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestSummaryRow item={item} onPress={() => setSelected(item)} tokens={tokens} />
          )}
          contentContainerStyle={
            entries.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: tokens.secondaryText }]}>
              No HTTP requests logged yet.
            </Text>
          }
        />
      </View>
    </View>
  );
}

function RequestDetailView({
  item,
  onBack,
  tokens,
  renderBody,
}: {
  item: LoggedRequest;
  onBack: () => void;
  tokens: NetworkLoggerThemeTokens;
  renderBody?: (params: BodyRendererParams) => ReactNode;
}) {
  return (
    <View style={styles.detailRoot}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backBtn,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.backLabel, { color: tokens.accent }]}>{"<- Back"}</Text>
      </Pressable>
      <Text style={[styles.detailTitle, { color: tokens.titleText }]}>Request details</Text>
      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={styles.detailScrollContent}
      >
        <DetailSection label="Method & URL">
          <Text style={[styles.detailLine, { color: tokens.bodyText }]} selectable={Platform.OS === 'web'}>
            {item.method} {item.url}
          </Text>
        </DetailSection>
        <DetailSection label="Timing">
          <Text style={[styles.detailLine, { color: tokens.bodyText }]} selectable={Platform.OS === 'web'}>
            Started: {new Date(item.startedAt).toISOString()}
            {item.endedAt != null
              ? `\nEnded: ${new Date(item.endedAt).toISOString()}`
              : ''}
            {item.durationMs != null ? `\nDuration: ${item.durationMs} ms` : ''}
          </Text>
        </DetailSection>
        <DetailSection label="Status">
          <Text style={[styles.detailLine, { color: tokens.bodyText }]} selectable={Platform.OS === 'web'}>
            {item.status ?? '-'}
            {item.error ? `\nError: ${item.error}` : ''}
          </Text>
        </DetailSection>
        <DetailSection label="Request headers">
          <Text
            style={[styles.detailBlock, styles.mono, { color: tokens.bodyText }]}
            selectable={Platform.OS === 'web'}
          >
            {formatHeaders(item.requestHeaders)}
          </Text>
        </DetailSection>
        {item.requestBody ? (
          <DetailSection label="Request body">
            <BodyContent
              raw={item.requestBody}
              kind="request"
              entry={item}
              renderBody={renderBody}
              tokens={tokens}
            />
          </DetailSection>
        ) : null}
        <DetailSection label="Response headers">
          <Text
            style={[styles.detailBlock, styles.mono, { color: tokens.bodyText }]}
            selectable={Platform.OS === 'web'}
          >
            {formatHeaders(item.responseHeaders)}
          </Text>
        </DetailSection>
        <DetailSection label="Response body">
          {item.responseBody != null && item.responseBody !== '' ? (
            <BodyContent
              raw={item.responseBody}
              kind="response"
              entry={item}
              renderBody={renderBody}
              tokens={tokens}
            />
          ) : item.error && !item.responseBody ? (
            <Text style={[styles.detailLine, { color: tokens.bodyText }]} selectable={Platform.OS === 'web'}>
              (no response body - request failed before completion)
            </Text>
          ) : (
            <Text style={[styles.detailLine, { color: tokens.bodyText }]}>-</Text>
          )}
        </DetailSection>
      </ScrollView>
    </View>
  );
}

function BodyContent({
  raw,
  kind,
  entry,
  renderBody,
  tokens,
}: {
  raw: string;
  kind: 'request' | 'response';
  entry: LoggedRequest;
  renderBody?: (params: BodyRendererParams) => ReactNode;
  tokens: NetworkLoggerThemeTokens;
}) {
  const formatted = formatMaybeJson(raw);
  const bodyParams: BodyRendererParams = {
    raw,
    formatted,
    isJson: isJsonText(raw),
    kind,
    entry,
  };
  if (renderBody) {
    return <>{renderBody(bodyParams)}</>;
  }
  return (
    <Text style={[styles.detailBlock, styles.mono, { color: tokens.bodyText }]} selectable={Platform.OS === 'web'}>
      {bodyParams.isJson ? formatted : raw}
    </Text>
  );
}

function DetailSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function RequestSummaryRow({
  item,
  onPress,
  tokens,
}: {
  item: LoggedRequest;
  onPress: () => void;
  tokens: NetworkLoggerThemeTokens;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={(s) => {
        const pressed = s.pressed;
        const hovered = 'hovered' in s ? Boolean(s.hovered) : false;
        return [
        styles.row,
        {
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
          marginBottom: 6,
          backgroundColor:
            hovered || pressed ? tokens.rowHoverBackground : 'transparent',
          borderColor: hovered ? tokens.accent : 'transparent',
        },
        Platform.OS === 'web' &&
          ({
            cursor: 'pointer',
            transitionProperty: 'background-color, border-color',
            transitionDuration: '150ms',
          } as ViewStyle),
        ];
      }}
    >
      <Text style={[styles.method, { color: tokens.titleText }]}>{item.method}</Text>
      <Text style={[styles.url, { color: tokens.secondaryText }]} numberOfLines={1}>
        {item.url}
      </Text>
      <Text style={[styles.status, { color: tokens.secondaryText }]}>
        {item.status ?? '-'} {item.durationMs != null ? `(${item.durationMs}ms)` : ''}
      </Text>
      {item.error ? <Text style={[styles.error, { color: tokens.error }]}>{item.error}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: Platform.OS === 'web' ? 24 : 0,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  sheet: {
    flex: Platform.OS === 'web' ? 0 : 1,
    width: Platform.OS === 'web' ? ('100%' as const) : '100%',
    maxWidth: Platform.OS === 'web' ? 640 : undefined,
    maxHeight: Platform.OS === 'web' ? '85%' : undefined,
    minHeight: Platform.OS === 'web' ? 320 : undefined,
    padding: 16,
    borderRadius: Platform.OS === 'web' ? 16 : 0,
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {},
  method: {
    fontWeight: '700',
    marginBottom: 2,
  },
  url: {
    fontSize: 12,
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  detailRoot: {
    flex: 1,
    minHeight: 200,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.65,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailLine: {
    fontSize: 13,
    lineHeight: 20,
  },
  detailBlock: {
    fontSize: 11,
    lineHeight: 16,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
