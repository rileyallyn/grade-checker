import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
  type ViewStyle,
} from 'react-native';

import { JsonCodeBlock } from '@/components/JsonCodeBlock';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { LoggedRequest } from '@grade-checker/network-logger';
import { useNetworkLog } from '@grade-checker/network-logger';

function formatMaybeJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function formatHeaders(h: Record<string, string> | undefined): string {
  if (!h || Object.keys(h).length === 0) return '—';
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

export default function ModalScreen() {
  const entries = useNetworkLog();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const [sheetHovered, setSheetHovered] = useState(false);
  const [selected, setSelected] = useState<LoggedRequest | null>(null);

  const sheetDynamic: ViewStyle[] = [
    styles.sheet,
    {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: sheetHovered ? theme.tint : 'transparent',
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: sheetHovered
              ? `0 12px 40px rgba(0,0,0,${colorScheme === 'dark' ? 0.45 : 0.15})`
              : '0 4px 24px rgba(0,0,0,0.08)',
            transitionProperty: 'box-shadow, border-color',
            transitionDuration: '180ms',
            cursor: 'default',
          } as unknown as ViewStyle)
        : {}),
    },
  ];

  if (selected) {
    return (
      <View style={styles.backdrop}>
        <View
          style={sheetDynamic}
          onPointerEnter={() => Platform.OS === 'web' && setSheetHovered(true)}
          onPointerLeave={() => Platform.OS === 'web' && setSheetHovered(false)}
        >
          <RequestDetailView
            item={selected}
            theme={theme}
            colorScheme={colorScheme}
            onBack={() => setSelected(null)}
          />
          <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <View
        style={sheetDynamic}
        onPointerEnter={() => Platform.OS === 'web' && setSheetHovered(true)}
        onPointerLeave={() => Platform.OS === 'web' && setSheetHovered(false)}
      >
        <Text style={styles.title}>HTTP Requests (last {entries.length})</Text>
        <Text style={styles.hint}>
          Tap a row to see the full request and response.
        </Text>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestSummaryRow
              item={item}
              theme={theme}
              colorScheme={colorScheme}
              onPress={() => setSelected(item)}
            />
          )}
          contentContainerStyle={
            entries.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No HTTP requests logged yet.</Text>
          }
        />

        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      </View>
    </View>
  );
}

function RequestDetailView({
  item,
  theme,
  colorScheme,
  onBack,
}: {
  item: LoggedRequest;
  theme: (typeof Colors)['light'];
  colorScheme: 'light' | 'dark';
  onBack: () => void;
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
        <Text style={[styles.backLabel, { color: theme.tint }]}>← Back</Text>
      </Pressable>
      <Text style={styles.detailTitle}>Request details</Text>
      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={styles.detailScrollContent}
      >
        <DetailSection label="Method & URL">
          <Text style={styles.detailLine} selectable={Platform.OS === 'web'}>
            {item.method} {item.url}
          </Text>
        </DetailSection>
        <DetailSection label="Timing">
          <Text style={styles.detailLine} selectable={Platform.OS === 'web'}>
            Started: {new Date(item.startedAt).toISOString()}
            {item.endedAt != null
              ? `\nEnded: ${new Date(item.endedAt).toISOString()}`
              : ''}
            {item.durationMs != null ? `\nDuration: ${item.durationMs} ms` : ''}
          </Text>
        </DetailSection>
        <DetailSection label="Status">
          <Text style={styles.detailLine} selectable={Platform.OS === 'web'}>
            {item.status ?? '—'}
            {item.error ? `\nError: ${item.error}` : ''}
          </Text>
        </DetailSection>
        <DetailSection label="Request headers">
          <Text style={[styles.detailBlock, styles.mono]} selectable={Platform.OS === 'web'}>
            {formatHeaders(item.requestHeaders)}
          </Text>
        </DetailSection>
        {item.requestBody ? (
          <DetailSection label="Request body">
            <BodyContent
              raw={item.requestBody}
              colorScheme={colorScheme}
            />
          </DetailSection>
        ) : null}
        <DetailSection label="Response headers">
          <Text style={[styles.detailBlock, styles.mono]} selectable={Platform.OS === 'web'}>
            {formatHeaders(item.responseHeaders)}
          </Text>
        </DetailSection>
        <DetailSection label="Response body">
          {item.responseBody != null && item.responseBody !== '' ? (
            <BodyContent raw={item.responseBody} colorScheme={colorScheme} />
          ) : item.error && !item.responseBody ? (
            <Text style={styles.detailLine} selectable={Platform.OS === 'web'}>
              (no response body — request failed before completion)
            </Text>
          ) : (
            <Text style={styles.detailLine}>—</Text>
          )}
        </DetailSection>
      </ScrollView>
    </View>
  );
}

function BodyContent({
  raw,
  colorScheme,
}: {
  raw: string;
  colorScheme: 'light' | 'dark';
}) {
  const formatted = formatMaybeJson(raw);
  if (isJsonText(raw)) {
    return <JsonCodeBlock code={formatted} colorScheme={colorScheme} />;
  }
  return (
    <Text style={[styles.detailBlock, styles.mono]} selectable={Platform.OS === 'web'}>
      {formatted}
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
  theme,
  colorScheme,
  onPress,
}: {
  item: LoggedRequest;
  theme: (typeof Colors)['light'];
  colorScheme: 'light' | 'dark';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.row,
        {
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
          marginBottom: 6,
          backgroundColor:
            hovered || pressed
              ? colorScheme === 'dark'
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.06)'
              : 'transparent',
          borderColor: hovered ? theme.tint : 'transparent',
        },
        Platform.OS === 'web' &&
          ({
            cursor: 'pointer',
            transitionProperty: 'background-color, border-color',
            transitionDuration: '150ms',
          } as ViewStyle),
      ]}
    >
      <Text style={styles.method}>{item.method}</Text>
      <Text style={styles.url} numberOfLines={1}>
        {item.url}
      </Text>
      <Text style={styles.status}>
        {item.status ?? '—'}{' '}
        {item.durationMs != null ? `(${item.durationMs}ms)` : ''}
      </Text>
      {item.error ? <Text style={styles.error}>{item.error}</Text> : null}
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
    color: 'red',
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
