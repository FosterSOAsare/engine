// How long a WAV file plays, read from its header: the "fmt " chunk gives
// the bytes per second, the "data" chunk how many bytes of sound follow.
// Narration is always WAV (Piper writes it), so this is all we need.

export const wavDuration = (buffer: ArrayBufferLike): number | null => {
  const view = new DataView(buffer);
  const text = (offset: number) =>
    String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(offset + i)));
  if (buffer.byteLength < 12 || text(0) !== "RIFF" || text(8) !== "WAVE") {
    return null;
  }

  let bytesPerSecond: number | null = null;
  let offset = 12;
  while (offset + 8 <= buffer.byteLength) {
    const id = text(offset);
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") bytesPerSecond = view.getUint32(offset + 16, true);
    if (id === "data") {
      return bytesPerSecond ? size / bytesPerSecond : null;
    }
    offset += 8 + size + (size % 2); // chunks are padded to even sizes
  }
  return null;
};

// Fetches a WAV file (never a cached copy) and returns its length in
// seconds, or null if it is missing or not a WAV file.
export const fetchWavDuration = async (url: string) => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok ? wavDuration(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
};
