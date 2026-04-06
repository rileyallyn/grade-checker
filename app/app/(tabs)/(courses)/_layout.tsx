import { Stack } from 'expo-router/stack';

export default function CoursesTabLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Courses',
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
