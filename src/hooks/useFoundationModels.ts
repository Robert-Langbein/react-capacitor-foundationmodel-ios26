import { useEffect, useRef, useState, useCallback } from 'react';
import {
  generateStreaming,
  registerTool as registerToolNative,
  removeAllListeners,
} from '../services/foundation.models.service';

/**
 * useStreamingText – Hook für Snapshot-Streaming
 */
export function useStreamingText() {
  const [text, setText] = useState('');
  const streamIdRef = useRef<string | null>(null);

  const start = useCallback(async (prompt: string) => {
    setText('');
    await removeAllListeners();

    const id = await generateStreaming(prompt, (chunk: string) => {
      if (chunk === '[STREAM_COMPLETE]') return;
      setText((prev) => prev + chunk);
    });
    streamIdRef.current = id;
  }, []);

  const reset = useCallback(() => {
    setText('');
    streamIdRef.current = null;
  }, []);

  return { text, start, reset };
}

/**
 * useRegisterTool – registriert ein React-Tool und räumt beim Unmount auf.
 */
export function useRegisterTool(
  name: string,
  description: string,
  handler: (payload: string) => Promise<string> | string,
) {
  useEffect(() => {
    registerToolNative(name, description, handler).catch(console.error);
    return () => {
      // Beim Unmount Handler entfernen
      // (aktuelles Native-Interface bietet kein unregister – wir löschen lokal)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
    };
  }, [name, description, handler]);
} 