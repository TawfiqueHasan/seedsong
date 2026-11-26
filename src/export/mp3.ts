export function encodeMp3(sampleRate: number, left: Float32Array, right: Float32Array, onProgress: (p: number) => void, kbps = 192): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ progress?: number; done?: boolean; blob?: Blob }>) => {
      if (e.data.progress !== undefined) onProgress(e.data.progress);
      if (e.data.done && e.data.blob) {
        resolve(e.data.blob);
        worker.terminate();
      }
    };
    worker.onerror = (err) => {
      reject(new Error(err.message || 'MP3 encoding failed.'));
      worker.terminate();
    };
    worker.postMessage({ sampleRate, left, right, kbps });
  });
}
