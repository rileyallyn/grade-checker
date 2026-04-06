import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Text, View } from '@/components/Themed';
import {
  Assignment,
  GradeItem,
  Course,
  fetchCourseDetail,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [course, setCourse] = useState<Course | undefined>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gradeItems, setGradeItems] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !token) return;
      try {
        setError(null);
        setLoading(true);
        const result = await fetchCourseDetail(String(id), token);
        setCourse(result.course);
        setAssignments(result.assignments);
        setGradeItems(result.gradeItems);
      } catch (e) {
        setError('Failed to load course.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, token]);

  if (!id) {
    return (
      <View style={styles.centered}>
        <Text>Missing course id.</Text>
      </View>
    );
  }

  if (loading && !course) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.centered}>
        <Text>Course not found.</Text>
      </View>
    );
  }

  const renderAssignment = ({ item }: { item: Assignment }) => {
    const dueDate = new Date(item.dueAt);
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>
          Due {dueDate.toLocaleDateString()} at{' '}
          {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.cardMeta}>
          Status:{' '}
          {item.status === 'not_submitted'
            ? 'Not submitted'
            : item.status === 'submitted'
            ? 'Submitted'
            : 'Graded'}
        </Text>
        {item.grade ? (
          <Text style={styles.cardMeta}>
            Grade: {item.grade.score}/{item.grade.outOf}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderGradeItem = ({ item }: { item: GradeItem }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardMeta}>
        Weight: {(item.weight * 100).toFixed(0)}%
      </Text>
      {item.score ? (
        <Text style={styles.cardMeta}>
          Score: {item.score.score}/{item.score.outOf} (
          {((item.score.score / item.score.outOf) * 100).toFixed(1)}%)
        </Text>
      ) : (
        <Text style={styles.cardMeta}>Not graded yet</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.courseCode}>{course.code}</Text>
      <Text style={styles.courseName}>{course.name}</Text>
      {course.instructor ? (
        <Text style={styles.courseMeta}>{course.instructor}</Text>
      ) : null}
      {course.currentGrade != null ? (
        <Text style={styles.courseGrade}>
          Current grade: {course.currentGrade.toFixed(1)}%
        </Text>
      ) : null}

      <Text style={styles.sectionTitle}>Assignments</Text>
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        renderItem={renderAssignment}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No assignments for this course.</Text>
        }
        contentContainerStyle={assignments.length === 0 ? styles.emptyContainer : undefined}
      />

      <Text style={styles.sectionTitle}>Grades</Text>
      <FlatList
        data={gradeItems}
        keyExtractor={(item) => item.id}
        renderItem={renderGradeItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No grade items yet.</Text>
        }
        contentContainerStyle={gradeItems.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '600',
  },
  courseName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  courseMeta: {
    fontSize: 14,
    marginBottom: 2,
  },
  courseGrade: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 8,
  },
  card: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  errorText: {
    color: 'red',
  },
});

