import { Stack } from 'expo-router/stack';

export default function HomeTabLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
