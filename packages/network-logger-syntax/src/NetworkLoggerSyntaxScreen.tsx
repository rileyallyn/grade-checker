import { NetworkLoggerScreen, type BodyRendererParams } from '@grade-checker/network-logger';
import { Platform, Text } from 'react-native';

import { JsonCodeBlock } from './JsonCodeBlock';

export type NetworkLoggerSyntaxScreenProps = {
  colorScheme: 'light' | 'dark';
};

export function NetworkLoggerSyntaxScreen({ colorScheme }: NetworkLoggerSyntaxScreenProps) {
  return (
    <NetworkLoggerScreen
      renderBody={(params: BodyRendererParams) => {
        if (params.isJson) {
          return <JsonCodeBlock code={params.formatted} colorScheme={colorScheme} />;
        }
        return (
          <Text selectable={Platform.OS === 'web'}>
            {params.raw}
          </Text>
        );
      }}
    />
  );
}
