import React from 'react';
import { DynamicColorIOS, Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/** Default tab when opening the app (otherwise route order can favor `(courses)`). */
export const unstable_settings = {
  initialRouteName: '(home)',
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tint =
    Platform.OS === 'ios'
      ? DynamicColorIOS({
          light: Colors.light.tint,
          dark: Colors.dark.tint,
        })
      : Colors[colorScheme ?? 'light'].tint;

  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={tint}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(courses)">
        <NativeTabs.Trigger.Icon sf="book.closed.fill" md="book" />
        <NativeTabs.Trigger.Label>Courses</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
