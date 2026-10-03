// Video types. A scene file with "type" gets that type's settings and
// closing scenes, so it only has to say what is its own. Every video, with
// a type or not, ends on the shared closing scenes (SHARED_END). Its own fields
// win over the type's settings, and a scene with the same id as one of the
// type's closing scenes replaces it.
//
// Plain JavaScript so that the engine (src/videos.ts) and the scripts
// (voice, captions, render) expand a scene file the same way.

// The outro every explainer ends on: follow, like, share, subscribe.
const FOLLOW = {
  id: "follow",
  chapter: "",
  narration:
    "Follow for more. Like it, share it with a friend, and catch the next one.",
  elements: [
    {
      type: "text",
      x: 50,
      y: 24,
      size: 10,
      text: "Follow for more",
      color: "#1e6fd9",
      draw: 1,
      at: "Follow",
    },
    {
      type: "text",
      x: 50,
      y: 38,
      size: 5.5,
      text: "one short explainer at a time",
      color: "#6b6b6b",
      draw: 1,
    },
    {
      type: "image",
      name: "brand/youtube",
      reveal: "pop",
      x: 22,
      y: 62,
      w: 10,
      draw: 0.3,
    },
    {
      type: "image",
      name: "brand/linkedin",
      reveal: "pop",
      x: 36,
      y: 62,
      w: 10,
      draw: 0.3,
    },
    {
      type: "image",
      name: "brand/instagram",
      reveal: "pop",
      x: 50,
      y: 62,
      w: 10,
      draw: 0.3,
    },
    {
      type: "image",
      name: "brand/tiktok",
      reveal: "pop",
      x: 64,
      y: 62,
      w: 10,
      draw: 0.3,
    },
    {
      type: "image",
      name: "brand/x",
      reveal: "pop",
      x: 78,
      y: 62,
      w: 10,
      draw: 0.3,
    },
    {
      type: "icon",
      name: "thumbs-up",
      x: 40,
      y: 84,
      size: 7,
      color: "#1e6fd9",
      draw: 0.4,
      at: "like",
    },
    {
      type: "icon",
      name: "share-2",
      x: 50,
      y: 84,
      size: 7,
      color: "#1e6fd9",
      draw: 0.4,
      at: "share",
    },
    {
      type: "icon",
      name: "bell",
      x: 60,
      y: 84,
      size: 7,
      color: "#1e6fd9",
      draw: 0.4,
      at: "next",
    },
  ],
};

// The scenes every video ends on, whatever its type: the follow outro.
// Its designs are shared too (public/assets/brand/).
export const SHARED_END = [FOLLOW];

export const VIDEO_TYPES = {
  // A narrated landscape explainer: one big board, pictures popping in as
  // they are named, read a little faster than the voice's default.
  explainer: {
    settings: {
      format: "landscape",
      style: "pop",
      voiceover: true,
      captions: true,
      speed: 1.15,
    },
    end: [],
  },
};

// The scene file with its type's settings filled in, ending on its type's
// closing scenes and then the shared ones (SHARED_END). A scene with the
// same id as a closing scene replaces it. Anything that isn't a scene file
// is returned as it is (the schema reports what is wrong with it).
export const applyType = (scene) => {
  if (!scene || !Array.isArray(scene.scenes)) return scene;
  const type = VIDEO_TYPES[scene.type];
  const own = new Set(scene.scenes.map((s) => s.id));
  const end = [...(type?.end ?? []), ...SHARED_END];
  return {
    ...(type?.settings ?? {}),
    ...scene,
    scenes: [...scene.scenes, ...end.filter((s) => !own.has(s.id))],
  };
};
