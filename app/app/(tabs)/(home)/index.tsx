import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Text, View } from '@/components/Themed';
import { Assignment, DashboardSummary, fetchDashboard, fetchInstitution } from '@/lib/api';
import { Entity } from '@/lib/interfaces/Insitutions';
import { useAuth } from '@/lib/auth';

type InstitutionOption = {
  name: string;
  orgBaseUrl: string;
};


function extractOrgBaseUrl(entity: Entity): string | null {
  const lmsLink = (entity.links ?? []).find((link) => link.rel.includes('lms'));
  const href = lmsLink?.href;
  return href ? href.replace(/\/+$/, '') : null;
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { token, loading: authLoading, connectBrightspace } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [orgBaseUrl, setOrgBaseUrl] = useState<string>('');
  const [institutionQuery, setInstitutionQuery] = useState<string>('');
  const [institutionOptions, setInstitutionOptions] = useState<InstitutionOption[]>([]);
  const [institutionLoading, setInstitutionLoading] = useState<boolean>(false);
  /** After picking a suggestion, skip search until the user edits the field again. */
  const [institutionSearchPaused, setInstitutionSearchPaused] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: token ? 'Dashboard' : 'Connect',
    });
  }, [navigation, token]);

  const load = async () => {
    if (!token) return;
    try {
      setError(null);
      setLoading(true);
      const result = await fetchDashboard(token);
      setData(result);
    } catch (e) {
      setError('Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      load();
    }
  }, [token]);

  useEffect(() => {
    if (institutionSearchPaused) {
      return;
    }
    const query = institutionQuery.trim();
    if (query.length < 2) {
      setInstitutionOptions([]);
      setInstitutionLoading(false);
      return;
    }

    let cancelled = false;
    setInstitutionLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetchInstitution(query);
        if (cancelled) return;

        const nextOptions = (response.entities ?? [])
          .map((entity) => {
            const url = extractOrgBaseUrl(entity);
            if (!url) return null;
            return {
              name: entity.properties?.name ?? url,
              orgBaseUrl: url,
            } as InstitutionOption;
          })
          .filter((item): item is InstitutionOption => !!item)
          .filter(
            (item, index, all) =>
              all.findIndex((candidate) => candidate.orgBaseUrl === item.orgBaseUrl) === index,
          )
          .slice(0, 8);
        setInstitutionOptions(nextOptions);
      } catch {
        if (!cancelled) {
          setInstitutionOptions([]);
        }
      } finally {
        if (!cancelled) {
          setInstitutionLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [institutionQuery, institutionSearchPaused]);

  const onRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderAssignment = ({ item }: { item: Assignment }) => {
    const dueDate = item.dueAt ? new Date(item.dueAt) : null;
    return (
      <View style={styles.assignmentCard}>
        <Text style={styles.assignmentTitle}>{item.title}</Text>
        {dueDate ? (
          <Text style={styles.assignmentMeta}>
            Due {dueDate.toLocaleDateString()} at{' '}
            {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : (
          <Text style={styles.assignmentMeta}>No due date</Text>
        )}
        <Text style={styles.assignmentStatus}>
          Status: {item.graded ? 'Graded' : 'Pending'}
        </Text>
      </View>
    );
  };

  const upcoming: Assignment[] = []; // you can later derive from backend data

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!token) {
    return (
      <ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Connect your Brightspace</Text>
        <Text style={styles.subtitle}>
          Search your institution, then we&apos;ll open the Brightspace login page.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Search institution (e.g. University of ...)"
          autoCapitalize="none"
          autoCorrect={false}
          value={institutionQuery}
          onChangeText={(value) => {
            setInstitutionSearchPaused(false);
            setInstitutionQuery(value);
            setOrgBaseUrl('');
            setError(null);
          }}
        />
        {institutionLoading ? (
          <ActivityIndicator style={styles.suggestionLoader} />
        ) : null}
        {institutionOptions.length > 0 ? (
          <View style={styles.suggestionsContainer}>
            {institutionOptions.map((option) => (
              
              <Text
                key={option.orgBaseUrl}
                style={styles.suggestionItem}
                onPress={() => {
                  setInstitutionSearchPaused(true);
                  setInstitutionQuery(option.name);
                  setOrgBaseUrl(option.orgBaseUrl);
                  setInstitutionOptions([]);
                  setInstitutionLoading(false);
                  setError(null);
                }}
              >
                {option.name}
              </Text>
            ))}
          </View>
        ) : null}
        {orgBaseUrl ? (
          <Text style={styles.selectedInstitution}>Selected: {orgBaseUrl}</Text>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button
          title="Connect"
          disabled={!orgBaseUrl}
          onPress={async () => {
            try {
              setError(null);
              await connectBrightspace({
                userId: 'demo-user', // TODO: replace with real app user id
                orgBaseUrl,
              });
            } catch {
              setError('Failed to start Brightspace auth. Try a different institution.');
            }
          }}
        />
      </ScrollView>
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.listRoot}
      contentInsetAdjustmentBehavior="automatic"
      data={upcoming}
      keyExtractor={(item) => item.id}
      renderItem={renderAssignment}
      ListHeaderComponent={
        error ? (
          <Text style={styles.errorText} selectable>
            {error}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        <Text style={styles.emptyText} selectable>
          Connected to Brightspace. Implement dashboard aggregation next.
        </Text>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={upcoming.length === 0 ? styles.emptyContainer : styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  listRoot: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderColor: 'gray',
    color: 'white',
  },
  suggestionLoader: {
    marginBottom: 12,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderColor: 'gray',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'white',
  },
  selectedInstitution: {
    fontSize: 12,
    marginBottom: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentCard: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  assignmentMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  assignmentStatus: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
  },
});
