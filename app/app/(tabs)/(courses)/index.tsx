import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { Course, fetchCourses } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function CoursesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      setError(null);
      setLoading(true);
      const result = await fetchCourses(token);
      setCourses(result);
    } catch (e) {
      setError('Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      load();
    }
  }, [token]);

  const openCourse = (courseId: string) => {
    router.push(`/course/${courseId}`);
  };

  const renderCourse = ({ item }: { item: Course }) => (
    <Pressable onPress={() => openCourse(item.id)}>
      <View style={styles.card}>
        <Text style={styles.courseCode}>{item.code}</Text>
        <Text style={styles.courseName}>{item.name}</Text>
      </View>
    </Pressable>
  );

  if (loading && courses.length === 0) {
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
      data={courses}
      keyExtractor={(item) => item.id}
      renderItem={renderCourse}
      ListHeaderComponent={
        error ? (
          <Text style={styles.errorText} selectable>
            {error}
          </Text>
        ) : null
      }
      contentContainerStyle={
        courses.length === 0 ? styles.emptyContainer : styles.listContent
      }
      ListEmptyComponent={
        <Text style={styles.emptyText} selectable>
          No courses available.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  listRoot: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
