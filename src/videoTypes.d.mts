// Types for videoTypes.mjs.
export declare const VIDEO_TYPES: Record<
  string,
  { settings: Record<string, unknown>; end: unknown[] }
>;
export declare const SHARED_END: unknown[];
export declare const applyType: <T>(scene: T) => T;
