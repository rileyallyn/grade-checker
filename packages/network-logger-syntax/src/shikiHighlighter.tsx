import { createHighlighterCore, type HighlighterCore } from '@shikijs/core';
import json from '@shikijs/langs/json';
import githubLight from '@shikijs/themes/github-light';
import nord from '@shikijs/themes/nord';
import { createNativeEngine, isNativeEngineAvailable } from 'react-native-shiki-engine';

let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getShikiHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    if (!isNativeEngineAvailable()) {
      return Promise.reject(
        new Error('Shiki native engine is not available (use a dev build with the New Architecture).'),
      );
    }
    highlighterPromise = createHighlighterCore({
      themes: [nord, githubLight],
      langs: [json],
      engine: createNativeEngine(),
    });
  }
  return highlighterPromise;
}
