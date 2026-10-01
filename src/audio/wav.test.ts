import { describe, expect, it } from "vitest";
import { wavDuration } from "./wav";

// A minimal PCM WAV file: mono, 16-bit, `rate` samples per second, with
// `seconds` of silence and an optional extra chunk before the data.
const wav = (rate: number, seconds: number, extraChunk = false) => {
  const dataSize = rate * 2 * seconds;
  const extra = extraChunk ? 8 + 3 + 1 : 0; // a 3-byte chunk, padded to 4
  const buffer = new ArrayBuffer(44 + extra + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); // bytes per second
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  let offset = 36;
  if (extraChunk) {
    write(offset, "LIST");
    view.setUint32(offset + 4, 3, true);
    offset += extra;
  }
  write(offset, "data");
  view.setUint32(offset + 4, dataSize, true);
  return buffer;
};

describe("wavDuration", () => {
  it("reads the length from the header", () => {
    expect(wavDuration(wav(22050, 3))).toBeCloseTo(3);
  });

  it("skips other chunks, padded to even sizes", () => {
    expect(wavDuration(wav(16000, 2, true))).toBeCloseTo(2);
  });

  it("returns null for something that isn't a WAV file", () => {
    expect(
      wavDuration(new TextEncoder().encode("not audio").buffer),
    ).toBeNull();
  });
});
