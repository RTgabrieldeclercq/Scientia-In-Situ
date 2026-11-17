/* ==========================================================================
   20b · Demonstrations (V4.12 — Gabe: "Each feature deserves a full page when
   clicked on, with a demonstration of what it can be used for, described by
   the user. Claude then creates a test note, screen records the process of
   using the feature, and embeds that video in the Settings tab for that
   feature page.")
   One entry per feature, shown on its page in Settings (20-settings.js
   featurePage): `use` is what the feature is for in the words of whoever
   asked for it; the video is the app recorded while the feature is used in a
   test note; `steps` are [seconds into the recording, what is being done].
   WRITTEN BY demokit/record.mjs — do not edit an entry by hand: change the
   feature's script (demokit/<id>.mjs) and record it again. The files are in
   demos/ (<id>.mp4, <id>.jpg), beside the app; `v` is the recording's hash,
   so a new take is never an old one from a cache.
   ========================================================================== */
/* demo:floats */
FEAT.demo("floats", { by: "Gabe", at: "2026-11-17", use: "Floats are items that need to belong to a new note in the future, but is not organized or created yet. Bring up /float to bring up a dome of floating float components that you can drag into the current note you are in. Once a float is placed into a note, it is an assigned float and is no longer part of the floats. Floats show up as bridges from where they were from.",
  video: "demos/floats.mp4", poster: "demos/floats.jpg", v: "4b34b18b", w: 1560, h: 975, dur: 35.8, kb: 665,
  steps: [
    [0.9,"In the daily note, an idea that belongs to a note not made yet: right-click it → Make it a float"],
    [6.3,"It keeps its kind and shows a cloud. Two more at once: Ctrl+click them, then Make floats"],
    [13.5,"Later, in the note they belong to: /float raises the dome, with the floats drifting in it"],
    [21.7,"Rest on a float a moment to see what it is and where it was written"],
    [27.8,"Drag one out onto the note: it lands as a bridge from where it was written, and is no longer a float"]] });
/* /demo:floats */
/* demo:demos */
FEAT.demo("demos", { by: "Gabe", at: "2026-11-17", use: "Each feature deserves a full page when clicked on, with a demonstration of what it can be used for, described by the user. Claude then creates a test note, screen records the process of using the feature, and embeds that video in the Settings tab for that feature page.",
  video: "demos/demos.mp4", poster: "demos/demos.jpg", v: "e518d7f2", w: 1280, h: 800, dur: 34.9, kb: 1015,
  steps: [
    [0.9,"Settings → Features: every feature has a tile. Click one for its page"],
    [5.9,"Its page: what it is, and what it is for in the words of whoever asked for it. Play starts the recording"],
    [12.9,"The steps are under it: click one and the recording plays from there"],
    [20.5,"Below: the feature’s settings, with its live preview beside them following each change"],
    [27.7,"‹ Features goes back to the board, at the tile you came from"]] });
/* /demo:demos */
