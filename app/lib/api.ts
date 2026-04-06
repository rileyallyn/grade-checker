import { BACKEND_BASE_URL } from './config';
import {
  loggedFetch,
} from '@grade-checker/network-logger';
import { InstitutionsResponse } from './interfaces/Insitutions';

export type Course = {
  // Map from Brightspace enrollment/org unit to a simplified course shape.
  id: string;
  code: string;
  name: string;
};

export type Assignment = {
  id: string;
  courseId: string;
  title: string;
  dueAt?: string;
  graded?: boolean;
};

export type GradeItem = {
  id: string;
  name: string;
  score?: number;
  outOf?: number;
};

export type DashboardSummary = {
  // For now we just surface enrollments; you can evolve this shape later.
  enrollments: any;
};


async function apiFetch<T>(path: string, token: string): Promise<T> {
  const url = `${BACKEND_BASE_URL}${path}`;
  const { response, text } = await loggedFetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return JSON.parse(text) as T;
}

// calls brightspace api directly
export async function fetchInstitution(searchKey: string): Promise<InstitutionsResponse> {
  const url = `https://lms-disco.api.brightspace.com/institutions?contains=${searchKey}`;
  const { response, text } = await loggedFetch(url, {
    headers: {
      'log-data': 'Pulse',
      'user-agent': 'Pulse',
    },
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return JSON.parse(text) as InstitutionsResponse;
}

export async function fetchDashboard(token: string): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/api/dashboard', token);
}

export async function fetchCourses(token: string): Promise<Course[]> {
  const data = await apiFetch<any>('/api/courses', token);
  // Brightspace myenrollments result; map to simple shape.
  const items = Array.isArray(data.Items) ? data.Items : [];
  return items.map((item: any) => {
    const orgUnit = item.OrgUnit || {};
    return {
      id: String(orgUnit.Id),
      code: orgUnit.Code ?? '',
      name: orgUnit.Name ?? '',
    } as Course;
  });
}

export async function fetchCourseDetail(
  courseId: string,
  token: string,
): Promise<{
  course: Course | undefined;
  assignments: Assignment[];
  gradeItems: GradeItem[];
}> {
  const [courses, assignmentsRaw, gradesRaw] = await Promise.all([
    fetchCourses(token),
    apiFetch<any>(`/api/courses/${courseId}/assignments`, token),
    apiFetch<any>(`/api/courses/${courseId}/grades`, token),
  ]);

  const course = courses.find((c) => c.id === courseId);

  const assignments: Assignment[] = Array.isArray(assignmentsRaw)
    ? assignmentsRaw.map((f: any) => ({
        id: String(f.Id),
        courseId,
        title: f.Name ?? '',
        dueAt: f.DueDate,
        graded: !!f.HasGradedItems,
      }))
    : [];

  const gradeItems: GradeItem[] = Array.isArray(gradesRaw)
    ? gradesRaw.map((g: any) => ({
        id: String(g.GradeObjectIdentifier?.GradeObjectId ?? g.GradeObjectId ?? ''),
        name: g.GradeObjectName ?? '',
        score: g.Numerator,
        outOf: g.Denominator,
      }))
    : [];

  return { course, assignments, gradeItems };
}


