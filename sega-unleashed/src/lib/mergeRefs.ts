// src/lib/mergeRefs.ts
import * as React from 'react';

/**
 * Given an array of refs (callback refs or ref objects),
 * returns a single callback ref that forwards the node
 * to all of them.
 */
export function mergeRefs<T = unknown>(
  refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (value: T) => {
    refs.forEach((ref) => {
      if (!ref) return;

      if (typeof ref === 'function') {
        ref(value);
      } else {
        // It's a RefObject
        try {
          (ref as React.MutableRefObject<T>).current = value;
        } catch {
          /* ignore read-only refs */
        }
      }
    });
  };
}
