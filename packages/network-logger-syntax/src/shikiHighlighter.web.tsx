import { createHighlighterCore, type HighlighterCore } from '@shikijs/core';
import { createOnigurumaEngine } from '@shikijs/engine-oniguruma';
import json from '@shikijs/langs/json';
import githubLight from '@shikijs/themes/github-light';
import nord from '@shikijs/themes/nord';

let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getShikiHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [nord, githubLight],
      langs: [json],
      engine: createOnigurumaEngine(import('@shikijs/engine-oniguruma/wasm-inlined')),
    });
  }
  return highlighterPromise;
}
