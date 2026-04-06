import { NetworkLoggerSyntaxScreen } from '@grade-checker/network-logger-syntax';

import { useColorScheme } from '@/components/useColorScheme';

export default function ModalScreen() {
  const colorScheme = useColorScheme();
  return <NetworkLoggerSyntaxScreen colorScheme={colorScheme} />;
}
