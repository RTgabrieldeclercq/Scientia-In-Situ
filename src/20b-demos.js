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
FEAT.demo("floats", { by: "Gabe", at: "2026-11-18", use: "Floats are items that need to belong to a new note in the future, but is not organized or created yet. Bring up /float to bring up a dome of floating float components that you can drag into the current note you are in. Once a float is placed into a note, it is an assigned float and is no longer part of the floats. Floats show up as bridges from where they were from.",
  video: "demos/floats.mp4", poster: "demos/floats.jpg", v: "80324547", w: 1560, h: 975, dur: 42.3, kb: 757,
  steps: [
    [0,"In the daily note, an idea that belongs to a note not made yet: right-click it → Make it a float"],
    [5.7,"It keeps its kind and shows a cloud. Two more at once: Ctrl+click them, then Make floats"],
    [17.6,"Later, in the note they belong to: /float raises the dome, with the floats drifting in it"],
    [26.2,"Rest on a float a moment to see what it is and where it was written"],
    [34,"Drag one out onto the note: it lands as a bridge from where it was written, and is no longer a float"]] });
/* /demo:floats */
/* demo:demos */
FEAT.demo("demos", { by: "Gabe", at: "2026-11-18", use: "Each feature deserves a full page when clicked on, with a demonstration of what it can be used for, described by the user. Claude then creates a test note, screen records the process of using the feature, and embeds that video in the Settings tab for that feature page.",
  video: "demos/demos.mp4", poster: "demos/demos.jpg", v: "2ffc3698", w: 1280, h: 800, dur: 32, kb: 990,
  steps: [
    [0,"Settings → Features: every feature has a tile. Click one for its page"],
    [5.1,"Its page: what it is, and what it is for in the words of whoever asked for it. Play starts the recording"],
    [11.4,"The steps are under it: click one and the recording plays from there"],
    [18.5,"Below: the feature’s settings, with its live preview beside them following each change"],
    [25.5,"‹ Features goes back to the board, at the tile you came from"]] });
/* /demo:demos */
/* demo:ink */
FEAT.demo("ink", { by: "", at: "2026-11-18", use: "Write and sketch on the paper with a pen, next to what you typed.",
  video: "demos/ink.mp4", poster: "demos/ink.jpg", v: "30213c00", w: 1560, h: 975, dur: 42, kb: 523,
  steps: [
    [0,"Choose Pen on the hand pill and sketch beside the text: here, the cell at the front"],
    [14.8,"Draw a rough rectangle and hold the pen still: it becomes a clean one"],
    [21.3,"The highlighter marks the edge; the eraser takes a stroke away"],
    [30.6,"Lasso the sketch and drag it: the strokes written together are one ink component"]] });
/* /demo:ink */
/* demo:pen */
FEAT.demo("pen", { by: "", at: "2026-11-18", use: "What each pen button and finger tap does, so the pen never has to leave the page.",
  video: "demos/pen.mp4", poster: "demos/pen.jpg", v: "5591bf7e", w: 1650, h: 1140, dur: 31.4, kb: 300,
  steps: [
    [0,"Hold the pen’s barrel button and loop round ink: it is a lasso, whatever tool is on"],
    [5.8,"Turn the pen over: its back erases what it passes"],
    [9.5,"Two fingers tapped on the paper undo; three redo"],
    [15.2,"With the mouse, a right-drag loop makes a region. P goes back to the Move hand"]] });
/* /demo:pen */
/* demo:board */
FEAT.demo("board", { by: "", at: "2026-11-18", use: "Sketch on a whiteboard that lives in the note beside your images.",
  video: "demos/board.mp4", poster: "demos/board.jpg", v: "3ba1668f", w: 1650, h: 1080, dur: 34.6, kb: 381,
  steps: [
    [0,"An image panel’s empty cell can be a whiteboard instead: click Whiteboard"],
    [6.3,"It fills the window. Sketch the dish layout with the pen"],
    [19.5,"Done puts it back in the note: the cell shows just what was drawn"],
    [24.9,"Click it to go on drawing: the board opens on the sketch"]] });
/* /demo:board */
/* demo:focus */
FEAT.demo("focus", { by: "", at: "2026-11-18", use: "Shut everything else out for a set time and have the session logged in the day note.",
  video: "demos/focus.mp4", poster: "demos/focus.jpg", v: "a355f5a4", w: 1560, h: 975, dur: 31, kb: 393,
  steps: [
    [0,"Press the focus button and say how long (one minute here; 15 minutes to 2 hours are one click)"],
    [12.8,"The app takes the whole screen, with a frame round it and the time left"],
    [16,"Work as usual while it runs"],
    [23.4,"When the time is up (the wait is cut here) the session is logged in today’s day note"]] });
/* /demo:focus */
/* demo:edgepan */
FEAT.demo("edgepan", { by: "", at: "2026-11-18", use: "In full screen, rest the pointer at the screen’s edge to slide the note that way, faster the harder you push.",
  video: "demos/edgepan.mp4", poster: "demos/edgepan.jpg", v: "3cc69687", w: 1560, h: 975, dur: 20.5, kb: 376,
  steps: [
    [0,"Full screen (Ctrl+. here, or F11): the note’s edges are now the screen’s"],
    [3.2,"Rest the pointer at the right edge: after a moment the note slides that way. Move off, and it stops at once"],
    [9.8,"Stay at the edge longer and it goes faster and faster"],
    [16.4,"A quick brush against the edge moves nothing"]] });
/* /demo:edgepan */
/* demo:syncdot */
FEAT.demo("syncdot", { by: "", at: "2026-11-18", use: "One dot tells you whether your devices are in step.",
  video: "demos/syncdot.mp4", poster: "demos/syncdot.jpg", v: "d7bd8897", w: 1560, h: 975, dur: 29.6, kb: 216,
  steps: [
    [0,"The dot left of Search is green: all is well. Click it to read how things stand"],
    [8,"The connection goes: the dot turns red"],
    [11.9,"You can go on working meanwhile. Click the dot: it says what is wrong, in a word"],
    [24,"When the connection is back, so is the green"]] });
/* /demo:syncdot */
/* demo:webcap */
FEAT.demo("webcap", { by: "", at: "2026-11-18", use: "Keep a web page in a note exactly as it was the day you saved it, even if the site later changes or goes.",
  video: "demos/webcap.mp4", poster: "demos/webcap.jpg", v: "cffacb5c", w: 1650, h: 1080, dur: 28.2, kb: 770,
  steps: [
    [0,"Right-click the paper → Insert → Website: give an address, or add a page you saved in the browser"],
    [10.6,"The page is in the note as it was when saved; the strip under its name says when and from where"],
    [16.6,"It reads like any page in a note: select a sentence to quote it beside the page"]] });
/* /demo:webcap */
/* demo:hw */
FEAT.demo("hw", { by: "", at: "2026-11-18", use: "Turn what you wrote with the pen into typed text, and keep the ink.",
  video: "demos/hw.mp4", poster: "demos/hw.jpg", v: "e2e71284", w: 1560, h: 975, dur: 26.5, kb: 295,
  steps: [
    [0,"A line written with the pen. Lasso it and choose Convert to text"],
    [11.5,"Windows reads it on this computer: the ink is now a text component in the same place"],
    [16.8,"The ink is kept: the component’s menu shows the handwriting again"]] });
/* /demo:hw */
/* demo:rec */
FEAT.demo("rec", { by: "", at: "2026-11-18", use: "Record a meeting in the note and get a transcript you can play from any line.",
  video: "demos/rec.mp4", poster: "demos/rec.jpg", v: "3f2f55b3", w: 1650, h: 1080, dur: 40.6, kb: 646,
  steps: [
    [0,"Right-click the paper → Insert → Recording: the microphone starts, and a red pill in the header keeps the time"],
    [12.4,"Drop a bookmark at a decision (the diamond, or Alt+M from anywhere)"],
    [20.7,"Stop: the audio is saved in the notebook folder, and the computer starts reading it"],
    [30,"The transcript arrives, a sentence a line (the wait is cut here). Click a time to play from there"]] });
/* /demo:rec */
/* demo:atlas */
FEAT.demo("atlas", { by: "", at: "2026-11-18", use: "The whole notebook in one room, sorted along three axes you choose, to see how the work fits together.",
  video: "demos/atlas.mp4", poster: "demos/atlas.jpg", v: "268cd45a", w: 1280, h: 800, dur: 36.4, kb: 631,
  steps: [
    [0.8,"The Atlas: every note, component and structure in one room, laid out by time, kind and project. Drag to turn it"],
    [10.1,"Change the middle axis from Kind to Term: the same notebook, regrouped by the terms it uses"],
    [15.6,"Rest the pointer on a bead: after a moment it opens into its bubble, with its neighbours"],
    [21.9,"Click it: you are in its note, at that component. The small bubble at the corner brings you back"],
    [27.2,"A thread: rest the pointer on it and both of its ends open, with the note each one lies in"]] });
/* /demo:atlas */
/* demo:bridgeBar */
FEAT.demo("bridgeBar", { by: "", at: "2026-11-18", use: "Walk back and forth along the bridges you just crossed, and jump to the pairs of notes you cross most.",
  video: "demos/bridgeBar.mp4", poster: "demos/bridgeBar.jpg", v: "9b8e44b4", w: 1560, h: 975, dur: 30.1, kb: 695,
  steps: [
    [1.1,"Cross a bridge from a circle at the note’s edge: the bar opens under the tabs, with the trail"],
    [6.4,"Cross again: the trail grows, and the arrows walk back and forth along it"],
    [15.5,"Most used: the pairs of notes you cross most. Click one to go there"],
    [23.1,"× closes the bar: it stays closed until tomorrow"]] });
/* /demo:bridgeBar */
/* demo:bridgeEdges */
FEAT.demo("bridgeEdges", { by: "", at: "2026-11-18", use: "From any note, see which notes it draws from and which it feeds, and step across.",
  video: "demos/bridgeEdges.mp4", poster: "demos/bridgeEdges.jpg", v: "a7627895", w: 1560, h: 975, dur: 23.2, kb: 462,
  steps: [
    [1.1,"Run 3 draws on two notes: two circles in its left margin. It feeds one: a circle in the right margin"],
    [4.8,"Point at a circle: the note’s name, and a thread to the component that comes from it"],
    [10.4,"Click it: you land on the bridged component in that note"],
    [14.5,"Alt+click the circle there: Run 3 opens beside, and both notes stay in view"]] });
/* /demo:bridgeEdges */
/* demo:bridgeMarks */
FEAT.demo("bridgeMarks", { by: "", at: "2026-11-18", use: "See at once, in the note where something was written, that it is used elsewhere.",
  video: "demos/bridgeMarks.mp4", poster: "demos/bridgeMarks.jpg", v: "a9d75aab", w: 1560, h: 975, dur: 26.5, kb: 458,
  steps: [
    [0,"Select a few words, press Ctrl+Enter, then N, and pick the run note"],
    [12.9,"The words are underlined in green; the component has a green right edge and a chip “bridged to Run 3”"],
    [17.6,"Click the chip: Go to the note, or Open it beside this note"]] });
/* /demo:bridgeMarks */
/* demo:bridges */
FEAT.demo("bridges", { by: "", at: "2026-11-18", use: "Show a component in another note, live, with a line saying why it is there and where it comes from.",
  video: "demos/bridges.mp4", poster: "demos/bridges.jpg", v: "bb47d24b", w: 1560, h: 975, dur: 36.5, kb: 734,
  steps: [
    [0,"Right-click the recipe → Bridge to another note…, pick the run note and say why"],
    [11.1,"Its chip → Go to the note. In the run note: the bridge, its band (where it comes from) and its caption"],
    [20.2,"Click the note’s name in the band: back at the original. Change the recipe there"],
    [29.2,"Double-click the underline → Go to the note: the bridge has followed the change"]] });
/* /demo:bridges */
/* demo:bubbles */
FEAT.demo("bubbles", { by: "", at: "2026-11-18", use: "Open a term and see every place it is used with what surrounds it, each one a way into its note.",
  video: "demos/bubbles.mp4", poster: "demos/bubbles.jpg", v: "0fa00fef", w: 1280, h: 940, dur: 24.9, kb: 543,
  steps: [
    [0,"In a note, Ctrl+click a term: its page opens as bubbles, each a component with its neighbours round it"],
    [7.4,"Switch the order from Note to Time: the oldest use first, each bubble dated"],
    [12.2,"Rest the pointer on a bubble: a ring closes, and you are in that note, at that component"],
    [18.1,"The small bubble on the note brings you back to the term’s bubbles"]] });
/* /demo:bubbles */
/* demo:calc */
FEAT.demo("calc", { by: "", at: "2026-11-18", use: "Do the bench arithmetic in the note and keep every line.",
  video: "demos/calc.mp4", poster: "demos/calc.jpg", v: "058d6012", w: 1560, h: 975, dur: 35.2, kb: 417,
  steps: [
    [0,"Right-click the paper → Insert… → Calculator. Type dilute(10, 1, 0.5) and press Enter"],
    [12.7,"The next line starts from the answer: × 3 for the three gels"],
    [16.2,"Click the first line and change 0.5 to 0.25: the line after it is worked out again"],
    [21.9,"Stats tab: sem(1.1, 1.3, 1.2). A click on an earlier result puts that value in the line being typed"]] });
/* /demo:calc */
/* demo:citeband */
FEAT.demo("citeband", { by: "", at: "2026-11-18", use: "A quote carries its source: the paper, the page and the title, one click from the passage.",
  video: "demos/citeband.mp4", poster: "demos/citeband.jpg", v: "fcf6e67f", w: 1560, h: 975, dur: 35.8, kb: 690,
  steps: [
    [0,"Select a sentence in the paper and choose ❝ Quote"],
    [7.7,"The quote has a band: the reference, the page, the title"],
    [10.7,"Bridge the quote to another note: it carries both bands, the bridge’s and the citation’s"],
    [21.9,"In that note the bridge shows both bands: the bridge’s (where it came from) and the citation’s"],
    [30.6,"Click the citation band: the paper opens beside the note, at the quote"]] });
/* /demo:citeband */
/* demo:citedin */
FEAT.demo("citedin", { by: "", at: "2026-11-18", use: "While you read a paper, see the notes that cite it and go there with the paper still beside you.",
  video: "demos/citedin.mp4", poster: "demos/citedin.jpg", v: "858463d4", w: 1560, h: 975, dur: 19.1, kb: 633,
  steps: [
    [0,"Open the paper beside its note: a line under its bar says Cited in, with the notes that cite it"],
    [5.4,"Click a note on that line: you are in that note, at the citation, and the paper stays beside you"],
    [12.3,"The Library’s reader lists them too: the two notes that cite it, the one that embeds it"]] });
/* /demo:citedin */
/* demo:daychips */
FEAT.demo("daychips", { by: "", at: "2026-11-18", use: "See at a glance which day a component belongs to, and which day note it was filed from.",
  video: "demos/daychips.mp4", poster: "demos/daychips.jpg", v: "73215996", w: 1560, h: 975, dur: 37, kb: 813,
  steps: [
    [0,"The run note: the component filed from yesterday’s day note carries a chip that says where it came from"],
    [4.3,"Capture a thought with the pencil in the header: it lands in today’s day note"],
    [18.5,"In the day note, ⋯ → File to a component…: pick the Imaging step of the run note"],
    [28.8,"The entry stays in its day, with a chip to where it went; the component gains the day it was filed from"]] });
/* /demo:daychips */
/* demo:equations */
FEAT.demo("equations", { by: "", at: "2026-11-18", use: "Write an equation properly, name its terms, share it across notes and solve it.",
  video: "demos/equations.mp4", poster: "demos/equations.jpg", v: "661123d7", w: 1560, h: 975, dur: 42.4, kb: 716,
  steps: [
    [0,"Insert → Equation: type E = 3G(1 + ν), then name each term and its unit in the legend"],
    [22.2,"Register… and name it: it joins the registry, where any note can insert it and follow the one copy"],
    [27.8,"Solve in calculator: type the shear modulus G and ν, and E is worked out"],
    [36.4,"Rearrange for G: the equation solved for the shear modulus"]] });
/* /demo:equations */
/* demo:excerpts */
FEAT.demo("excerpts", { by: "", at: "2026-11-18", use: "Copy a few words from one note and paste them in another as a live passage that follows the original.",
  video: "demos/excerpts.mp4", poster: "demos/excerpts.jpg", v: "a91558d8", w: 1560, h: 975, dur: 49.5, kb: 781,
  steps: [
    [0,"Select one sentence inside a component and copy it with Ctrl+C"],
    [7.2,"In the other note, click the paper and paste: just that passage, with its band “Passage from”"],
    [17.3,"Edit the sentence in the original: the passage changes with it"],
    [36.4,"Ctrl+Shift+V instead pastes a plain copy: no band, and it does not follow the original"]] });
/* /demo:excerpts */
/* demo:hints */
FEAT.demo("hints", { by: "", at: "2026-11-18", use: "One-line tips where you are, until you no longer need them.",
  video: "demos/hints.mp4", poster: "demos/hints.jpg", v: "0fe25d80", w: 1280, h: 800, dur: 23.2, kb: 425,
  steps: [
    [0,"Settings → Features: every feature has a tile with its own switch. Help lines is in Canvas & notes"],
    [6.7,"Open its page: the live preview shows the one-line tip as it is set now, with the × that closes it"],
    [11.4,"Switch it off: the tips go from every note; the preview shows them gone"],
    [17.3,"Switch it on again to bring the tips back; this is also how to get them back after closing one with ×"]] });
/* /demo:hints */
/* demo:hover */
FEAT.demo("hover", { by: "", at: "2026-11-18", use: "Point at a marked phrase, a term or a link to see what it is and where it was recorded, without opening anything.",
  video: "demos/hover.mp4", poster: "demos/hover.jpg", v: "d65d4cbe", w: 1560, h: 975, dur: 33.2, kb: 280,
  steps: [
    [0,"Rest the pointer on the claim: its kind, its status, where and when it was recorded"],
    [5.3,"Rest on the term: how many notes use it"],
    [13.7,"Rest on the bridged words: the note they go to"],
    [22.6,"Alt+click the claim: its actions"]] });
/* /demo:hover */
/* demo:investigate */
FEAT.demo("investigate", { by: "", at: "2026-11-18", use: "Flag something to look into, and keep seeing it until you have.",
  video: "demos/investigate.mp4", poster: "demos/investigate.jpg", v: "6d101e7b", w: 1280, h: 800, dur: 36.1, kb: 393,
  steps: [
    [0,"Select the words, press Ctrl+Enter then X: they are marked, with a dot in the component’s header"],
    [8,"In the Portfolio the note has a dot that breathes; point at it to read what needs investigating"],
    [18.5,"On Today it is listed above Recent notes, oldest first"],
    [26,"Mark it Investigated with the tick: it leaves Today, and the Portfolio’s dot goes"]] });
/* /demo:investigate */
/* demo:labels */
FEAT.demo("labels", { by: "", at: "2026-11-18", use: "Label several components as floats or references quickly, by clicking them with the label in hand.",
  video: "demos/labels.mp4", poster: "demos/labels.jpg", v: "c2f77cd8", w: 1560, h: 975, dur: 40, kb: 666,
  steps: [
    [0,"Type /label in a component and pick Float: the cursor becomes the float’s cloud"],
    [8.7,"Click a component: it is a float now, and the cursor is yours again"],
    [12.3,"Pick Float again and hold Ctrl: the label stays in hand for three clicks in a row; Esc puts it down"],
    [27.2,"Pick Reference, the golden tag, and click one; Esc puts the label down"]] });
/* /demo:labels */
/* demo:libmap */
FEAT.demo("libmap", { by: "", at: "2026-11-18", use: "See the Library as shelves: each focus a row of spines, one per paper.",
  video: "demos/libmap.mp4", poster: "demos/libmap.jpg", v: "77170f1e", w: 1280, h: 960, dur: 31.2, kb: 316,
  steps: [
    [0,"The Library opens on the map: each shelf a board in its colour, its foci standing on it, one spine per paper"],
    [6.8,"Search “traction”: the spines it finds rise, the rest fade"],
    [14.1,"Drag a spine onto another focus: the paper stands in both"],
    [23.5,"Click a spine: the paper’s sheet lists the foci it stands in"]] });
/* /demo:libmap */
/* demo:library */
FEAT.demo("library", { by: "", at: "2026-11-18", use: "Keep your papers with their PDFs and cite them in your notes.",
  video: "demos/library.mp4", poster: "demos/library.jpg", v: "71d6daf0", w: 1280, h: 800, dur: 46.5, kb: 806,
  steps: [
    [0,"Add a paper by pasting its citation (BibTeX), then attach its PDF"],
    [17,"Read it: select a sentence in the reader and pick a colour to highlight it"],
    [29,"In a note, type /cite and pick the paper: a superscript [1], its reference listed in the note’s References"],
    [37,"/author-cite names the first author instead, for that one citation"]] });
/* /demo:library */
/* demo:libsearch */
FEAT.demo("libsearch", { by: "", at: "2026-11-18", use: "Find a paper by anything you remember about it: an author, a year, a shelf, a highlight you made.",
  video: "demos/libsearch.mp4", poster: "demos/libsearch.jpg", v: "ad3b368d", w: 1280, h: 800, dur: 35.2, kb: 547,
  steps: [
    [1.2,"Type an author, a year and a word: suggestions come as you type, and each result says why it matched"],
    [12.6,"Click a facet to narrow it: Shelf → Mechanobiology"],
    [17.2,"Replace the search with is:unread: the papers not opened yet"],
    [23.1,"A word only the PDFs hold finds nothing until “Inside the PDFs’ text” is ticked (the reading is cut short here)"]] });
/* /demo:libsearch */
/* demo:lineage */
FEAT.demo("lineage", { by: "", at: "2026-11-18", use: "Change your mind without losing what you first wrote: the old wording stays under the new.",
  video: "demos/lineage.mp4", poster: "demos/lineage.jpg", v: "46bc8e60", w: 1560, h: 975, dur: 39.3, kb: 512,
  steps: [
    [0,"Open the component’s menu (right-click) and choose Revise wording, then type the new wording"],
    [12.8,"Under it: “1 earlier version”. Open it to read the old wording, greyed, with its claim"],
    [17.5,"Revise once more: now two earlier versions, the wording of each generation kept"],
    [34.4,"The claim recorded on the first wording is flagged there: still on the old wording"]] });
/* /demo:lineage */
/* demo:references */
FEAT.demo("references", { by: "", at: "2026-11-18", use: "Keep the things you look up again and again (a calibration, a recipe, an equation) one command away from any note.",
  video: "demos/references.mp4", poster: "demos/references.jpg", v: "baabab28", w: 1560, h: 975, dur: 40.9, kb: 819,
  steps: [
    [0,"A calibration that gets looked up again and again: right-click it → Make it a reference"],
    [8.5,"It keeps its kind and gains a bookmark. Later, in a run note: type /reference"],
    [15.7,"The gallery opens over the note. Search “gel”, then filter to Tables"],
    [22.6,"Enter puts the recipe in the run note: live, and pointing back to where it lives"],
    [29.7,"The Atlas has a References tab that lists them all"]] });
/* /demo:references */
/* demo:regions */
FEAT.demo("regions", { by: "", at: "2026-11-18", use: "Group components in a named frame that folds away and moves as one.",
  video: "demos/regions.mp4", poster: "demos/regions.jpg", v: "2bcdb487", w: 1560, h: 975, dur: 40.8, kb: 584,
  steps: [
    [1.2,"Right-drag a loop round three components and choose Make a region: it snaps round them. Name it “Gels”"],
    [15,"Give it a colour from its ⋯ menu, then drag it by its title: everything in it moves together"],
    [25.7,"Fold it into its title with the arrow: the components go, and what lay beside it closes in"],
    [29.4,"Unfold it: the region beside it moves aside, whole, to make room"],
    [32.9,"Hold Alt and drag one component out of the region: it leaves the frame"]] });
/* /demo:regions */
/* demo:reports */
FEAT.demo("reports", { by: "", at: "2026-11-18", use: "Mark a PDF or a saved web page as a report, and every figure you cut out of it is a result straight away.",
  video: "demos/reports.mp4", poster: "demos/reports.jpg", v: "1f39e66d", w: 1560, h: 975, dur: 35.9, kb: 775,
  steps: [
    [0,"Double-click the “pdf” tag left of the PDF’s name and choose Report"],
    [6.9,"Use the scissors on its bar: every figure is outlined. Click Figure 2"],
    [16.7,"It lands on the paper as an image panel that is already a Result: drag it where it belongs"],
    [26.9,"The same choice is in the card’s menu: ⋯ → What kind is this PDF…"]] });
/* /demo:reports */
/* demo:rsplit */
FEAT.demo("rsplit", { by: "", at: "2026-11-18", use: "Read two to four papers at once beside your note.",
  video: "demos/rsplit.mp4", poster: "demos/rsplit.jpg", v: "f670ebfa", w: 1280, h: 800, dur: 36.1, kb: 625,
  steps: [
    [0,"Press the split button on the tab row: two papers side by side"],
    [6.3,"Each pane has its own page and zoom: next page on one, larger on the other"],
    [15.5,"Quadrant: four panes. The free pane takes another paper from the Library"],
    [28.2,"Back to one: the split button, then One"]] });
/* /demo:rsplit */
/* demo:rtabs */
FEAT.demo("rtabs", { by: "", at: "2026-11-18", use: "Keep several papers and pages open beside a note and switch between them.",
  video: "demos/rtabs.mp4", poster: "demos/rtabs.jpg", v: "375f042e", w: 1560, h: 975, dur: 28.1, kb: 905,
  steps: [
    [0,"Open the first paper beside the note with the book on its card"],
    [4.3,"Press + and open a second paper: two tabs"],
    [11,"Click a tab: the note goes to where that paper is embedded, lit"],
    [16.5,"Add the saved report page as a third tab, then close one"]] });
/* /demo:rtabs */
/* demo:sidefold */
FEAT.demo("sidefold", { by: "", at: "2026-11-20", use: "Give the page the whole width while you read, and bring your highlights back with one click.",
  video: "demos/sidefold.mp4", poster: "demos/sidefold.jpg", v: "bac72554", w: 1280, h: 800, dur: 35.2, kb: 837,
  steps: [
    [1.1,"Maximise the paper: the panel of highlights and notes sits beside it"],
    [5.4,"Fold the panel with ›: it glides shut, and a small capsule of its highlight colours stays at the edge"],
    [12.5,"Click a colour on the capsule: the panel opens at that highlight"],
    [16.9,"Fold it again, close the paper and open it in the Library’s reader: folded there too"],
    [25.6,"Back in the note, read the paper beside it: there too the panel waits folded at the edge (V4.40)"]] });
/* /demo:sidefold */
/* demo:slash */
FEAT.demo("slash", { by: "", at: "2026-11-18", use: "Type / in the text to act on what you just wrote or to insert anything, without leaving the keyboard.",
  video: "demos/slash.mp4", poster: "demos/slash.jpg", v: "0f3c540a", w: 1560, h: 975, dur: 37.2, kb: 667,
  steps: [
    [0,"Write a sentence, then type /cl: the menu narrows to /claim. Enter makes the sentence a claim"],
    [12.3,"Type /date: today is typed in"],
    [19.2,"Type /plate: a well plate is inserted below the component"],
    [26.9,"Press / on the empty paper: the bar at the foot wakes. /go Fibronectin jumps to that note"]] });
/* /demo:slash */
/* demo:stamps */
FEAT.demo("stamps", { by: "", at: "2026-11-18", use: "Every component says when it happened, so a note is also a record of the day.",
  video: "demos/stamps.mp4", poster: "demos/stamps.jpg", v: "303561f1", w: 1560, h: 975, dur: 43.6, kb: 454,
  steps: [
    [0.9,"A run note with its timer running. Write two components: each takes its date and time, and its place in the timer"],
    [19.4,"Double-click a stamp and move it to yesterday 16:40"],
    [29.5,"Settings → Features → Times on components: switch it off"],
    [36.6,"Back in the note the times are gone, until you point at a component"]] });
/* /demo:stamps */
/* demo:terms */
FEAT.demo("terms", { by: "", at: "2026-11-18", use: "Mark the words your project turns on once, and find every place they are used.",
  video: "demos/terms.mp4", poster: "demos/terms.jpg", v: "d94ef314", w: 1280, h: 800, dur: 40.4, kb: 503,
  steps: [
    [0,"Select “traction force” in a note and press Alt+W: it joins the project’s terms and is outlined"],
    [6.7,"Write it in another component and click away: the term is found there by itself"],
    [20.3,"The Terms tab lists it: its uses, its last twelve weeks, its open barriers"],
    [28.8,"Open the term and add another form, “TF”: it is found wherever it is written"]] });
/* /demo:terms */
/* demo:wires */
FEAT.demo("wires", { by: "", at: "2026-11-18", use: "Say how two components relate with a wire, so the note reads as a chain of reasoning.",
  video: "demos/wires.mp4", poster: "demos/wires.jpg", v: "95697009", w: 1560, h: 975, dur: 43.6, kb: 570,
  steps: [
    [0,"Drag the dot of “Gel batch 14” onto “Run 3” and choose “caused”: a coloured wire, routed round Imaging"],
    [10.9,"Drop the dot of “Run 3” on empty paper: pick “leads to” and a new component is made there, already wired"],
    [25.8,"Move a component: the wires find their way again"],
    [32.2,"Click a wire: reverse it, or change the relation"]] });
/* /demo:wires */
/* demo:writing */
FEAT.demo("writing", { by: "", at: "2026-11-18", use: "Write in boxes on the paper; what you type becomes the symbols scientists write, a paste lands where you are looking, and what a box pushed away comes back when it shrinks.",
  video: "demos/writing.mp4", poster: "demos/writing.jpg", v: "f1e51b64", w: 1560, h: 975, dur: 37.1, kb: 441,
  steps: [
    [0,"Double-click the paper to write there. What is typed turns into the symbols as it goes: ±, °, µ, ₂, →"],
    [14.4,"Backspace right after a replacement puts back what was typed"],
    [19.3,"Fold the upper component: the one under it rises into the space. Unfold it: it is pushed down again"],
    [26.8,"Copy a component from another note, paste it here: it lands in the centre of the view, on top, as a bridge"]] });
/* /demo:writing */
/* demo:chores */
FEAT.demo("chores", { by: "", at: "2026-11-18", use: "The lab chores that come round (the water bath, the CO₂ tank) turn up on the day they are due.",
  video: "demos/chores.mp4", poster: "demos/chores.jpg", v: "5fd6902a", w: 1280, h: 800, dur: 44.4, kb: 762,
  steps: [
    [0,"Settings → Recurring chores → Recurring chores…: add “Water bath”, on weekdays, Wednesday"],
    [18.2,"Add “CO₂ tank”, every 14 days after it was last done"],
    [30.3,"Today and the day note list what is due: the water bath today (the CO₂ tank is not due for 14 days)"],
    [39.4,"Tick it done when it is done: it is ticked for the day"]] });
/* /demo:chores */
/* demo:reminders */
FEAT.demo("reminders", { by: "", at: "2026-11-18", use: "Deadlines, meetings and reminders in one place, tied to the note they are about.",
  video: "demos/reminders.mp4", poster: "demos/reminders.jpg", v: "42f7d806", w: 1560, h: 975, dur: 45.2, kb: 607,
  steps: [
    [1.2,"Right-click the paper → Insert… → Deadline or meeting: “Lab meeting”, today at 15:00, alert 15 min before"],
    [23.5,"The bell in the header counts it"],
    [30.4,"Today: Coming up lists it, with the note it is about"],
    [38.6,"When a reminder comes due, its alert shows wherever you are: Snooze 10 min, Done or Dismiss (the wait is cut)"]] });
/* /demo:reminders */
/* demo:timers */
FEAT.demo("timers", { by: "", at: "2026-11-18", use: "Time a note as you work and say which component the time belongs to.",
  video: "demos/timers.mp4", poster: "demos/timers.jpg", v: "41bd468d", w: 1560, h: 975, dur: 35.3, kb: 540,
  steps: [
    [0,"Press Timer in the tools: a dashed timer box appears, waiting to be told what it times"],
    [6.8,"Drag the timer box’s dot to the component it is timing"],
    [14.5,"Go to another tab: the floating card follows, still counting"],
    [21.5,"Complete it from the card: the time is logged on that component"],
    [26.1,"Start the next timer with a head start of 20 minutes, for time that already went by"]] });
/* /demo:timers */
/* demo:canvas */
FEAT.demo("canvas", { by: "", at: "2026-11-18", use: "Arrange components, papers and structures freely on a board to think across notes.",
  video: "demos/canvas.mp4", poster: "demos/canvas.jpg", v: "c42aeb08", w: 1280, h: 800, dur: 41, kb: 348,
  steps: [
    [0,"Settings → Features → Spatial canvases (an experiment): switch it on and a Canvas tab appears in the bar"],
    [5.5,"A new canvas, then + Add: search two components from different notes (Run 3 and its analysis) and put them on the board"],
    [19.9,"Add a claim (a structure) and a paper from the Library: cards pointing at the originals, nothing copied"],
    [29.3,"Drag from the dot on one component to the other, choose how they relate: a real connection between the two notes, not only a line"],
    [36.4,"Export as JSON Canvas: the whole board as one file other canvas tools open"]] });
/* /demo:canvas */
/* demo:review */
FEAT.demo("review", { by: "", at: "2026-11-18", use: "Once a month, see what each note delivered, file what belongs nowhere yet, and write next month’s plan.",
  video: "demos/review.mp4", poster: "demos/review.jpg", v: "ef20f7ae", w: 1280, h: 800, dur: 45.2, kb: 818,
  steps: [
    [0,"The Review tab: last month’s report, note by note, with the takeaways and results each delivered"],
    [7.2,"Its numbers against the month before: each count with its change"],
    [15.3,"Unassigned: daily-note components that belong to no note. j moves down, f files one in the note it fits"],
    [22.2,"Next month: tick what is still open, and the plan writes itself under it"],
    [30.8,"Complete the review: the plan becomes the synthesis of the review note"]] });
/* /demo:review */
/* demo:data */
FEAT.demo("data", { by: "", at: "2026-11-18", use: "Plot a table of results inside the note, and keep the plot following the table.",
  video: "demos/data.mp4", poster: "demos/data.jpg", v: "c6764a8a", w: 1560, h: 975, dur: 40.2, kb: 733,
  steps: [
    [0.3,"Right-click the paper → Insert… → Plot of a table, then choose Bar: the mean of each stiffness, with SEM"],
    [14.5,"Change a number in the table: the bars and their error bars follow"],
    [20.6,"⚙ Plot → Type: Scatter. The same table, now every replicate as a point"],
    [26.7,"Right-click the analysis note’s component → Data, materials & code…: bind it to the dataset the table came from"]] });
/* /demo:data */
/* demo:figures */
FEAT.demo("figures", { by: "", at: "2026-11-18", use: "Lay images out as a figure with letters and captions, and keep a slide deck in a note.",
  video: "demos/figures.mp4", poster: "demos/figures.jpg", v: "f43af071", w: 1560, h: 975, dur: 43.1, kb: 837,
  steps: [
    [0,"Right-click the paper → Insert… → Image panel, pick 2 × 2, and choose the four images: they fill the cells in order"],
    [10.2,"Click image B to crop it: drag the rectangle to keep, then Crop. The panel reflows to the new shape"],
    [19.7,"Drag image A onto image D to swap them"],
    [26.9,"Caption image B, then label it a result with + label"],
    [38.1,"⤢ maximises the figure: every image as large as the window allows"]] });
/* /demo:figures */
/* demo:plates */
FEAT.demo("plates", { by: "", at: "2026-11-18", use: "Plan a well plate in colours and carry it into the run, where each well takes its images and notes.",
  video: "demos/plates.mp4", poster: "demos/plates.jpg", v: "742127ae", w: 1560, h: 975, dur: 54.9, kb: 939,
  steps: [
    [0.3,"Planning note: Insert… → Well plate, set it to 24 wells, drag down a column, pick a colour and name it in the legend"],
    [20,"Click a well and write its note: what goes in it"],
    [28.6,"Run note: Insert… → Well plate from the plan…, and choose the plate: colours, legend and notes come with it"],
    [39.9,"Shift+click a well → Image / video… to put an image in it; click the well to open it with its note and the plan’s"]] });
/* /demo:plates */
/* demo:eqcap */
FEAT.demo("eqcap", { by: "", at: "2026-11-18", use: "Take an equation off a paper’s page and reuse it in your notes, with its source.",
  video: "demos/eqcap.mp4", poster: "demos/eqcap.jpg", v: "ddf2625e", w: 1280, h: 800, dur: 35.1, kb: 386,
  steps: [
    [0,"In the reader press ∑ Capture equation and draw a box round the equation on the page"],
    [9.3,"Check it against the snip: type its LaTeX, then name it “Young’s modulus”"],
    [20.4,"In a note open ✦ and choose the equation tool → Registered equation: the list says which paper and page"],
    [29.3,"Pick it: the equation is placed in the note, still tied to its paper"]] });
/* /demo:eqcap */
/* demo:libread */
FEAT.demo("libread", { by: "", at: "2026-11-18", use: "Know which papers you have not opened, are reading, or have read.",
  video: "demos/libread.mp4", poster: "demos/libread.jpg", v: "ec656f89", w: 1280, h: 800, dur: 33.3, kb: 432,
  steps: [
    [0,"A paper marked “Not opened”: open its PDF from its sheet, and it becomes “Reading”"],
    [10.9,"When you finish it, set it to Read on its sheet"],
    [14.8,"Its spine changes, and the focus’s bar in the tree shows how much of it is read"],
    [24.6,"Search “is:read”: the papers you have read, each card marked Read"]] });
/* /demo:libread */
/* demo:libsmart */
FEAT.demo("libsmart", { by: "", at: "2026-11-18", use: "A focus that fills itself: every paper that matches a search, now and later.",
  video: "demos/libsmart.mp4", poster: "demos/libsmart.jpg", v: "092eead9", w: 1280, h: 800, dur: 38.9, kb: 686,
  steps: [
    [0,"Search “is:unread year:>2017” and press Save as smart focus; name it"],
    [11.4,"Add a new paper from 2021 by pasting its citation: it is in the focus by itself"],
    [25.5,"Put a paper the search misses in by hand with its ＋: it stays in the focus too"]] });
/* /demo:libsmart */
/* demo:litrev */
FEAT.demo("litrev", { by: "", at: "2026-11-18", use: "A canvas for one question in the literature, linked to every project it serves.",
  video: "demos/litrev.mp4", poster: "demos/litrev.jpg", v: "0b41694f", w: 1280, h: 800, dur: 46.2, kb: 587,
  steps: [
    [1.1,"In the Portfolio, under the project’s Lit reviews, press + Lit review, then give it its topic: it is linked to the project already"],
    [7.7,"Put two papers on the canvas with Insert → PDF, and quote a sentence from each"],
    [29.6,"Wire the two quotes from one dot to the other and say how they relate"],
    [41.4,"In the Portfolio the project’s Lit reviews list the review, with its papers and quotes"]] });
/* /demo:litrev */
/* demo:editbar */
FEAT.demo("editbar", { by: "", at: "2026-11-18", use: "The bar over the component you are writing in: styles, lists, symbols and your favourites, one click away.",
  video: "demos/editbar.mp4", poster: "demos/editbar.jpg", v: "45299a74", w: 1560, h: 975, dur: 41.5, kb: 484,
  steps: [
    [0,"Click into the component: the bar appears over it"],
    [4.3,"Select two words and press Bold; select three lines and press the checkbox list"],
    [19.2,"Open ∑ Symbols and click µ; star it as a favourite, and its bolt makes it a button on the bar"],
    [32.9,"Open + for the extras (Bridge, Citation, Term, Equation…); tick Citation and its button joins the bar"]] });
/* /demo:editbar */
/* demo:lock */
FEAT.demo("lock", { by: "", at: "2026-11-18", use: "Once the day has turned, what you recorded stays on record; a change becomes a correction beside it.",
  video: "demos/lock.mp4", poster: "demos/lock.jpg", v: "f636ceaf", w: 1280, h: 800, dur: 28.1, kb: 295,
  steps: [
    [1.1,"Settings → Features → Lock the wording after the day: switch it on"],
    [7,"In a run written yesterday, click its wording: it asks to revise, or to add a correction"],
    [13.2,"Add a correction, “it was 12 ng/mL, not 10”: the wording stays recorded, and the structure’s card carries it"]] });
/* /demo:lock */
/* demo:materials */
FEAT.demo("materials", { by: "", at: "2026-11-20", use: "Know what every gel batch, cell line and antibody lot is, and which notes used it.",
  video: "demos/materials.mp4", poster: "demos/materials.jpg", v: "1afea60e", w: 1280, h: 800, dur: 48.5, kb: 947,
  steps: [
    [1.1,"Atlas → Materials → + New material: “PAA gel batch 15”, a gel batch made here. Fill in its stiffness"],
    [18.9,"Log what happens to it: type “poured”"],
    [24.9,"In the run note: right-click → Insert… → Material; type “used 2 coverslips” on its card to log it"],
    [37.9,"The Atlas’s Materials: every material by kind, with the notes that used it"]] });
/* /demo:materials */
/* demo:pfdots */
FEAT.demo("pfdots", { by: "", at: "2026-11-18", use: "See from the Portfolio which notes hold takeaways, open barriers, evidence and things to look into.",
  video: "demos/pfdots.mp4", poster: "demos/pfdots.jpg", v: "596d42ea", w: 1280, h: 800, dur: 29.7, kb: 324,
  steps: [
    [0,"The Portfolio: beside each note, a dot for each kind, in its colour, with how many"],
    [8.8,"Point at a barrier dot: it opens onto the words that were marked"],
    [16.3,"The dot that breathes is Needs investigation: point at it to read what is to look into"],
    [23.8,"Click its line: you are at those words in their note"]] });
/* /demo:pfdots */
/* demo:resurface */
FEAT.demo("resurface", { by: "", at: "2026-11-18", use: "An old claim comes back so you can say whether it still holds.",
  video: "demos/resurface.mp4", poster: "demos/resurface.jpg", v: "775c5357", w: 1280, h: 800, dur: 33.4, kb: 371,
  steps: [
    [1.2,"Today brings an old claim back, from a note not touched for three weeks"],
    [8.1,"Choose Still holds: it is noted, and another old claim comes up"],
    [12.7,"Choose Contest, then click the claim: its note opens at it, and its card says contested"],
    [22.5,"Back on Today, the day note carries the day’s card too: open it from Recent notes"]] });
/* /demo:resurface */
/* demo:split */
FEAT.demo("split", { by: "", at: "2026-11-18", use: "Work in two to four notes at once: plan beside run, run beside analysis.",
  video: "demos/split.mp4", poster: "demos/split.jpg", v: "48a546f2", w: 1280, h: 800, dur: 42.3, kb: 761,
  steps: [
    [0,"Split → Side by side, and pick the run note to put beside the plan"],
    [9.6,"Drag the line between them to give one note more room"],
    [16.2,"Alt+click a link to a note that is not open: it opens beside, as a third pane"],
    [21.6,"Split → Quadrant (2×2): pick one more note, and the four sit in a grid"],
    [33.6,"Split → Back to one pane: only this note is left"]] });
/* /demo:split */
/* demo:structures */
FEAT.demo("structures", { by: "", at: "2026-11-18", use: "Give selected words a meaning (claim, evidence, barrier, question…) so the notebook can find, count and follow them.",
  video: "demos/structures.mp4", poster: "demos/structures.jpg", v: "d5295f9b", w: 1280, h: 800, dur: 46.3, kb: 580,
  steps: [
    [1.1,"Select “collapsed at 10 ng/mL”, press Ctrl+Enter, then C: it is a claim, in the claim’s colour"],
    [8.9,"Mark “3 of 3 fields” as evidence (E): it asks what the evidence comes from"],
    [19.3,"“gels tear above 40 kPa” is a barrier (B); later “a thicker backing layer” is its resolution (R)"],
    [34.9,"Double-click a component’s “Block” label: its kind, as a Hypothesis (Challenge and the others are here too)"]] });
/* /demo:structures */
/* demo:synthesis */
FEAT.demo("synthesis", { by: "", at: "2026-11-18", use: "The one or two sentences you would tell your advisor, kept at the top of every note.",
  video: "demos/synthesis.mp4", poster: "demos/synthesis.jpg", v: "85d98573", w: 1280, h: 800, dur: 34.7, kb: 377,
  steps: [
    [0,"In the note’s first box, write what the note adds up to: two sentences, saved as you type"],
    [13.3,"Open the Portfolio: under the note’s row, in small text, are the sentences"],
    [20.8,"Insert → A note… in another note: its card carries the synthesis there too"]] });
/* /demo:synthesis */
/* demo:synthflag */
FEAT.demo("synthflag", { by: "", at: "2026-11-18", use: "Send a component, or just a few words, to a Synthesis note while you are still working in the note they came from.",
  video: "demos/synthflag.mp4", poster: "demos/synthflag.jpg", v: "a09fd1dd", w: 1280, h: 800, dur: 40.1, kb: 623,
  steps: [
    [0,"Right-click a component and choose Flag for synthesis: the whole component goes to the Synthesis note"],
    [6.5,"Select a few words in another component, press Ctrl+Enter, then F: just those words go over"],
    [14.4,"Open the Synthesis note from the stage strip: the component and the passage are both there"],
    [25.5,"Change the original words in the run note: back in the Synthesis note, the passage has followed"]] });
/* /demo:synthflag */
/* demo:tasks */
FEAT.demo("tasks", { by: "", at: "2026-11-18", use: "Everything you have to do, from every note, in one list with dates.",
  video: "demos/tasks.mp4", poster: "demos/tasks.jpg", v: "f31074c5", w: 1560, h: 975, dur: 40.7, kb: 829,
  steps: [
    [0,"Right-click the paper → Insert… → Task. Write “Order fibronectin”, set it due tomorrow and high priority"],
    [13.8,"The Tasks tab lists every task from every note: Overdue, Today, Upcoming"],
    [18.4,"Click a task to open its note, and add a subtask"],
    [25.7,"Tick a task done in the list: it is logged in the day note, and listed under Done lately"]] });
/* /demo:tasks */
/* demo:look */
FEAT.demo("look", { by: "", at: "2026-11-20", use: "The notebook in the edge-rail look: panels glide, folded panels become small capsules, and papers sit on a shelf.",
  video: "demos/look.mp4", poster: "demos/look.jpg", v: "a079ba2d", w: 1280, h: 800, dur: 40.9, kb: 1125,
  steps: [
    [1.1,"Read the paper beside the note: its highlights fold into a capsule of their colours — yellow 2, blue 1, pink 1"],
    [6.7,"Click yellow: the panel glides open at the first yellow highlight; › folds it again"],
    [14,"Full screen, then the capsule at the left: the mini library slides in, its papers as spines on the project’s shelf"],
    [22.1,"List, then back to spines — the mini library remembers which on this computer"],
    [31.1,"Save the note’s structure as a template from its ⋯ menu: the menu pops from where you click, the dialog rises, and a toast springs up"]] });
/* /demo:look */
