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
/* demo:atlasdata */
FEAT.demo("atlasdata", { by: "Gabe", at: "2026-11-21", use: "Every folder and file you have logged in your notes, in one master tree: arranged by project and note, or merged into one tree where the same folder logged in three notes is one folder. Search it, and go to the note a folder was logged in.",
  video: "demos/atlasdata.mp4", poster: "demos/atlasdata.jpg", v: "dc6177f6", w: 1280, h: 800, dur: 29.3, kb: 500,
  steps: [
    [1.1,"Compendiums → Data: every logged tree, by project and note — each note with its kind and Open"],
    [8.9,"One merged tree: the same folder logged in several notes becomes one folder, marked with the notes it is in"],
    [13.7,"Search “raw”: only what matches stays, with the folders above it opened"],
    [19.1,"“in 3 notes” lists where the folder was logged: pick one and you are at its data in that note"]] });
/* /demo:atlasdata */
/* demo:calendar */
FEAT.demo("calendar", { by: "Gabe", at: "2026-11-21", use: "Plan the week around your experiments: put them on the calendar at their time, link each to its note, move them as the week changes, and say what each should deliver.",
  video: "demos/calendar.mp4", poster: "demos/calendar.jpg", v: "a93f98c0", w: 1280, h: 800, dur: 46.2, kb: 260,
  steps: [
    [1.2,"Click a free spot on Wednesday: the window opens at that time. Name the experiment, give it its type and link its note"],
    [16.1,"Plans change: drag it to Thursday afternoon"],
    [25.2,"Rest on it a moment: it opens in place. Say what it should deliver — a Result — and add it"],
    [38.1,"Month view: the whole month at a glance, with the experiment on its new day"]] });
/* /demo:calendar */
/* demo:camera */
FEAT.demo("camera", { by: "Gabe", at: "2026-11-21", use: "Snap a plate or a gel with the camera straight into the note you are writing: the picture becomes a 1×1 image panel, without leaving the page.",
  video: "demos/camera.mp4", poster: "demos/camera.jpg", v: "d94fc06f", w: 1560, h: 975, dur: 22.9, kb: 386,
  steps: [
    [1.2,"In the note, open the ＋ Quick cast at the bottom and choose Photo"],
    [7.9,"The camera shows what it sees, live: point it at the plate and press Take"],
    [13.5,"The picture is held for a look, with Retake beside it: this one is good, so Use it — it lands in the note as a 1×1 image panel"]] });
/* /demo:camera */
/* demo:challenges */
FEAT.demo("challenges", { by: "Gabe", at: "2026-11-21", use: "Note a weakness in the literature, backed by the paper that shows it, and keep it apart from the barriers of your own project: a Challenge must be cited by a paper, and it is never counted as one of your open barriers.",
  video: "demos/challenges.mp4", poster: "demos/challenges.jpg", v: "149cd574", w: 1280, h: 800, dur: 25.7, kb: 264,
  steps: [
    [1.2,"In the lit review, double-click the component’s label and make it a Challenge: the header asks for a paper"],
    [10,"A Challenge must be cited by the paper that shows it: cite it from the header, and the header clears"],
    [18.7,"In the Portfolio, the project counts one open barrier, its own: the Challenge’s barrier is the literature’s"]] });
/* /demo:challenges */
/* demo:code */
FEAT.demo("code", { by: "Gabe", at: "2026-11-21", use: "Run your own analysis script on your notes’ data, with the result right in the note: a component of the Code kind takes a script from the Code compendium and its input from your data trees, and shows the table, the figures and what the script printed.",
  video: "demos/code.mp4", poster: "demos/code.jpg", v: "e600e7ed", w: 1560, h: 975, dur: 57.8, kb: 998,
  steps: [
    [1.2,"Compendiums → Code: upload your script with a title and what it does"],
    [24.1,"In a note, double-click a component’s label and choose Code"],
    [36.8,"Choose the script, then ＋ From the data tree and pick “OD readings.csv”"],
    [47.3,"Run: the table the script makes, and the line it printed, come back into the component"]] });
/* /demo:code */
/* demo:compendiums */
FEAT.demo("compendiums", { by: "Gabe", at: "2026-11-21", use: "One gallery for everything the notebook gathers across your notes — materials, data, registered protocols, topic syntheses, code — each as a card with what it holds, and a page of its own. Protocols lists every registered protocol with its steps and the runs of it, and Open goes to it in its note.",
  video: "demos/compendiums.mp4", poster: "demos/compendiums.jpg", v: "3061a01d", w: 1280, h: 800, dur: 18.7, kb: 383,
  steps: [
    [1.1,"The Compendiums tab is the gallery: a card for each, with what it holds"],
    [6.5,"Protocols: every registered protocol with its steps, where it lives, and the runs of it"],
    [11.8,"Open goes to the protocol in its note, centred"]] });
/* /demo:compendiums */
/* demo:comptitle */
FEAT.demo("comptitle", { by: "Gabe", at: "2026-11-21", use: "Name a component from its own words in one gesture: highlight the words, then click its title. With nothing highlighted, a click on the title lets you type one, at any time.",
  video: "demos/comptitle.mp4", poster: "demos/comptitle.jpg", v: "a12bb776", w: 1560, h: 975, dur: 31.8, kb: 284,
  steps: [
    [1.2,"Highlight a few words in a component: here “traction peaks at 8 kPa”"],
    [8.8,"Click its title: the highlighted words become the title, and the toast has an Undo"],
    [13.4,"Click the title with nothing highlighted and type a new one: Enter keeps it"],
    [24.4,"Click the paper to leave the text, then Ctrl+Z: the title before comes back"]] });
/* /demo:comptitle */
/* demo:dataflow */
FEAT.demo("dataflow", { by: "Gabe", at: "2026-11-21", use: "Say which instrument made your data, and see how materials, instruments and data fit together. The instrument is guessed from the files’ types and accepted with one click; the image panels and tables of an experiment join the Data compendium by themselves; and the flow draws material → instrument → data.",
  video: "demos/dataflow.mp4", poster: "demos/dataflow.jpg", v: "53557b15", w: 1280, h: 800, dur: 31, kb: 440,
  steps: [
    [1.1,"In Run 3, a logged folder of .nd2 files: the data tree guesses the instrument from their type. Accept it with one click"],
    [8.8,"Compendiums → Data: Run 4 logged nothing, but its image panel and table are listed under it, “from the canvas”"],
    [19.6,"Material → instrument → data: the third view draws how they are joined"],
    [24.4,"Rest on the instrument: every path through it lights up, from its materials to its data"]] });
/* /demo:dataflow */
/* demo:datatree */
FEAT.demo("datatree", { by: "Gabe", at: "2026-11-21", use: "Log which folders and files an experiment used, right in its note, as a tree with their sizes, without copying anything.",
  video: "demos/datatree.mp4", poster: "demos/datatree.jpg", v: "441f4cde", w: 1560, h: 975, dur: 33, kb: 505,
  steps: [
    [1.2,"In the component the images belong to, ⋯ → Log data… and choose the run’s folder: its listing is logged, nothing is copied"],
    [15,"The tree lists folders and files with their sizes: a click opens a folder, another folds it again"],
    [25.2,"The files’ type points to the instrument: “Looks like Nikon (ND2) — use it”, and one click sets it"]] });
/* /demo:datatree */
/* demo:expseries */
FEAT.demo("expseries", { by: "Gabe", at: "2026-11-21", use: "For repeating an experiment with its runs kept together and numbered: the next run carries the series’ name, is counted as Run 3, and the Portfolio lists the runs side by side.",
  video: "demos/expseries.mp4", poster: "demos/expseries.jpg", v: "7eb0b1b9", w: 1560, h: 975, dur: 19.1, kb: 349,
  steps: [
    [1.2,"+ Experiment → Continue a series: pick “30 kPa series”. The name stays, and “Run 3 of…” says where it goes"],
    [8.5,"Create: the new note is Run 3, shown beside its title"],
    [12.9,"The Portfolio shows the series: Run 1, 2 and 3 together"]] });
/* /demo:expseries */
/* demo:freewrite */
FEAT.demo("freewrite", { by: "Gabe", at: "2026-11-21", use: "For getting your thoughts down fast, as plain sentences, and then turning them into components of the note: the rules read the words, you correct what they got wrong, and Apply puts the cards and their links in the note.",
  video: "demos/freewrite.mp4", poster: "demos/freewrite.jpg", v: "c429ba37", w: 1560, h: 975, dur: 41.5, kb: 743,
  steps: [
    [1.2,"In the note, Quick cast → Freewrite: a blank page opens over the app"],
    [7.8,"Type three sentences, as they come"],
    [21.4,"Convert: the rules read the words — each sentence is coloured, and the note it will make appears beside"],
    [25.8,"Click a sentence’s label and make it a Result: the rules’ guess is yours to change"],
    [32,"Apply to the note: the sentences become components, linked as they were read"]] });
/* /demo:freewrite */
/* demo:hotnotes */
FEAT.demo("hotnotes", { by: "Gabe", at: "2026-11-21", use: "Keep the notes you open most one click away. The Hot notes button, at the right of the tabs, starts by suggesting your most visited notes; star the ones you want and they sit in the tab row beside the button, each lit in its kind’s colour.",
  video: "demos/hotnotes.mp4", poster: "demos/hotnotes.jpg", v: "36bf2d3c", w: 1280, h: 800, dur: 32.6, kb: 414,
  steps: [
    [1.2,"The Hot notes button at the right of the tabs: it starts with your most visited notes"],
    [6.8,"Star two of them: the empty star on a row adds the note"],
    [21.6,"They now sit in the tab row beside the button, each in its kind’s colour"],
    [26.1,"Click one: its note opens, and its tab is lit while you are in it"]] });
/* /demo:hotnotes */
/* demo:milestones */
FEAT.demo("milestones", { by: "Gabe", at: "2026-11-21", use: "Track a theme’s big aims by what is actually delivered: a milestone is as complete as its deliverables, each a Synthesis note that is written or a set of results, takeaways or verdicts that are picked.",
  video: "demos/milestones.mp4", poster: "demos/milestones.jpg", v: "9801d0ed", w: 1280, h: 800, dur: 58.4, kb: 550,
  steps: [
    [1.2,"On the theme’s page, + Milestone: name the goal and what delivers it — a Synthesis note, two Results, a takeaway"],
    [32.3,"Link the Synthesis note and pick the two Results: two of its three deliverables are delivered"],
    [47.6,"Pick the takeaway for the third: every deliverable is delivered and the milestone is complete"]] });
/* /demo:milestones */
/* demo:movepanel */
FEAT.demo("movepanel", { by: "Gabe", at: "2026-11-21", use: "Send something to another note by searching for it, or by clicking it in the Portfolio: the same panel for bridging, moving, flagging for a synthesis and filing a note.",
  video: "demos/movepanel.mp4", poster: "demos/movepanel.jpg", v: "2004d14a", w: 1560, h: 975, dur: 43, kb: 950,
  steps: [
    [1.2,"Right-click a component → Bridge to another note…: the panel opens, and typing “rim” narrows the notes"],
    [9.2,"Pick the note, say why in a few words: the component is bridged there"],
    [23,"Right-click another component → Move to another note…, and switch the panel to the Portfolio"],
    [33.1,"A click on a note in the Portfolio picks it: the component moves there, and you are back where you were"]] });
/* /demo:movepanel */
/* demo:navsettle */
FEAT.demo("navsettle", { by: "Gabe", at: "2026-11-21", use: "Move between notes with Alt+Left and Alt+Right, and see at a glance what each one holds as it arrives: every component lights up together, then settles.",
  video: "demos/navsettle.mp4", poster: "demos/navsettle.jpg", v: "3c6eb204", w: 1560, h: 975, dur: 18.2, kb: 520,
  steps: [
    [1.3,"In the analysis note, Ctrl+click the bridged words to follow the link to the gel batch note"],
    [8.6,"Alt+Left goes back: the analysis note arrives with every component lit, then they settle"],
    [13.3,"Alt+Right goes forward again: the gel batch note arrives the same way"]] });
/* /demo:navsettle */
/* demo:pfactivity */
FEAT.demo("pfactivity", { by: "Gabe", at: "2026-11-21", use: "See why a project or a theme in the Portfolio is active or stalled. Click its heat strip and a panel opens with how the activity is counted, eight weeks of it, the notes still in their two weeks, and what moved; each line goes straight to its note.",
  video: "demos/pfactivity.mp4", poster: "demos/pfactivity.jpg", v: "8561e85f", w: 1280, h: 800, dur: 21, kb: 318,
  steps: [
    [1.2,"In the Portfolio a theme’s heat strip shows its last weeks: click it"],
    [7.8,"The panel says why it is active or stalled, how that is counted, and shows its eight weeks and its notes still in their two weeks"],
    [13.1,"What moved lists each moment by day: click a line and you are at it in its note"]] });
/* /demo:pfactivity */
/* demo:pfprotocols */
FEAT.demo("pfprotocols", { by: "Gabe", at: "2026-11-21", use: "Every project and theme in the Portfolio has a Protocols section beside its Experiments and Notes: the protocols filed there, and the protocols its experiments run, even when they are filed in another theme. + Protocol starts a new one right there.",
  video: "demos/pfprotocols.mp4", poster: "demos/pfprotocols.jpg", v: "ab6cc7eb", w: 1280, h: 800, dur: 28.7, kb: 437,
  steps: [
    [1.2,"The theme’s Protocols section: the one filed here, and “Bead coating”, filed in another theme but run twice here (⟲ 2, from …)"],
    [6.7,"The switch above the notes now has Protocols: only protocols, theme by theme"],
    [12.3,"Back to All: + Protocol in a theme’s header starts a new protocol note there: its type and theme are already chosen"]] });
/* /demo:pfprotocols */
/* demo:pfrefs */
FEAT.demo("pfrefs", { by: "Gabe", at: "2026-11-21", use: "Every theme in the Portfolio has a References section: the papers cited in its notes, numbered the way a note’s own reference list numbers them. Click one and its PDF opens.",
  video: "demos/pfrefs.mp4", poster: "demos/pfrefs.jpg", v: "211fbaad", w: 1280, h: 800, dur: 18.6, kb: 339,
  steps: [
    [1.1,"The theme’s References: every paper cited in its notes, numbered as they are cited, with how many notes cite it"],
    [6.4,"The switch above the notes has References too: only the papers, theme by theme"],
    [11.6,"Click a reference: its PDF opens in the reader"]] });
/* /demo:pfrefs */
/* demo:rbtn */
FEAT.demo("rbtn", { by: "Gabe", at: "2026-11-21", use: "Get back to what you were reading in one click. The book at the top right of every page opens the Reader: in a note it brings up that project’s reading set at the paper you read last there, and from any other page, such as Today, it takes you to the last paper you were reading, beside the note you opened it from.",
  video: "demos/rbtn.mp4", poster: "demos/rbtn.jpg", v: "958d645a", w: 1560, h: 975, dur: 24.7, kb: 857,
  steps: [
    [1.2,"In a note, the book at the top right opens that project’s reading set, at the paper read last there"],
    [7.7,"Close it with the book again: the tabs stay. Go to Today"],
    [16.7,"On Today the book opens the last paper you were reading, beside the note it came from"]] });
/* /demo:rbtn */
/* demo:refmap */
FEAT.demo("refmap", { by: "Gabe", at: "2026-11-21", use: "Check a citation without losing your place: rest on [3] in the text and its reference appears; click it to jump to the list, and ‹ Back returns you to the sentence you were reading. The References Map in the Highlights panel lists every reference of the paper, numbered as in the paper, with how often each is cited, so you can see which ones the paper leans on.",
  video: "demos/refmap.mp4", poster: "demos/refmap.jpg", v: "883f21fc", w: 1560, h: 975, dur: 26, kb: 725,
  steps: [
    [1.2,"Open the paper full screen. Rest on the citation [3] in the text: its reference appears, without scrolling to the list"],
    [9.4,"Click it: the paper jumps to that entry of the reference list"],
    [13.8,"‹ Back to where you were: the sentence you were reading"],
    [19.8,"The References Map lists every reference and how often it is cited: rest on one to light its citations in the paper"]] });
/* /demo:refmap */
/* demo:rlib */
FEAT.demo("rlib", { by: "Gabe", at: "2026-11-21", use: "Find another of the project’s papers while you read one full screen. A thin grip on the left edge pulls out a mini library of the project’s shelves with their papers; click one and it opens as a tab beside the one you were reading, without leaving full screen.",
  video: "demos/rlib.mp4", poster: "demos/rlib.jpg", v: "390be271", w: 1560, h: 975, dur: 21.8, kb: 590,
  steps: [
    [1.2,"Read a paper full screen: the maximise button on its card"],
    [5.5,"Drag the thin grip on the left edge to the right: the project’s shelves slide out, with their papers"],
    [14.4,"Pick a paper: it opens as a tab, still full screen"]] });
/* /demo:rlib */
/* demo:rotate */
FEAT.demo("rotate", { by: "Gabe", at: "2026-11-21", use: "For a tablet held the other way: turn the whole app a quarter, draw with the pen as usual, and turn it back upright when you put the tablet down.",
  video: "demos/rotate.mp4", poster: "demos/rotate.jpg", v: "d0f5f87e", w: 1560, h: 975, dur: 23.6, kb: 584,
  steps: [
    [1.2,"Open the ⊕ zoom pill and press Rotate: the whole app turns a quarter, clockwise"],
    [8.4,"Draw with the pen as usual: the stroke follows the pen on the turned page"],
    [15.7,"Put the tablet down: Esc three times, and the app is upright again with the ink where it was drawn"]] });
/* /demo:rotate */
/* demo:rpop */
FEAT.demo("rpop", { by: "Gabe", at: "2026-11-21", use: "Keep a paper floating over the note while you write. A paper read beside a note becomes a popup window inside the app: rest on its border and four anchors and four corners show, to move it and resize it freely, and the note stays usable all around it.",
  video: "demos/rpop.mp4", poster: "demos/rpop.jpg", v: "ad9cce70", w: 1560, h: 975, dur: 39.1, kb: 808,
  steps: [
    [1.2,"Read the paper beside the note, then press ⧉ on its bar: it becomes a popup window over the note"],
    [8.9,"Rest on its border: the anchors and corners show. Drag the anchor on its top edge to move the window"],
    [18.4,"Drag a corner to resize it: it gets smaller, out of the way of the note"],
    [28.2,"The note is still yours around it: click in the note and write"]] });
/* /demo:rpop */
/* demo:rsets */
FEAT.demo("rsets", { by: "Gabe", at: "2026-11-21", use: "Give each project its own reading tabs. The papers you open from a project’s notes stay together as that project’s reading set; go to a note of another project and its set comes up in the reader instead, while the first one waits, folded, with every tab kept.",
  video: "demos/rsets.mp4", poster: "demos/rsets.jpg", v: "091b9d73", w: 1560, h: 975, dur: 15.5, kb: 437,
  steps: [
    [1.2,"In the first project’s note, open its paper beside the note: it is a tab of that project’s reading set"],
    [5.7,"Go to a note of the other project: its own reading set comes up, and the first one folds into a chip with its count"],
    [10,"Back in the first project’s note: its set is back, with every tab it had"]] });
/* /demo:rsets */
/* demo:rview */
FEAT.demo("rview", { by: "Gabe", at: "2026-11-21", use: "Read comfortably beside your notes. A paper or page read beside a note has its own zoom: − and + to step it, the percentage to go back to 100% (the page at its own size), Fit to put the page’s width to the pane and keep it there as the pane changes, and ⤢ to go full screen from where it is and back beside the note.",
  video: "demos/rview.mp4", poster: "demos/rview.jpg", v: "4d65b93b", w: 1560, h: 975, dur: 33.6, kb: 1079,
  steps: [
    [1.3,"Open the paper beside the note with the book on its card: it opens fitted to the pane"],
    [5.8,"Zoom by hand: − twice, + once, then click the percentage to go back to 100%, the page at its own size"],
    [17.7,"Fit puts the page’s width to the pane again, and keeps it fitted when the pane changes"],
    [22.2,"⤢ goes full screen from where it is, at the same place and zoom; ◧ brings it back beside the note"]] });
/* /demo:rview */
/* demo:selpop */
FEAT.demo("selpop", { by: "Gabe", at: "2026-11-21", use: "Quote from a saved web page in a note, and have the selection menu get out of the way: it opens when you highlight a sentence, and closes as soon as you click anywhere else, press Esc, or the highlight goes, so it never stays over what you are reading.",
  video: "demos/selpop.mp4", poster: "demos/selpop.jpg", v: "54aeb667", w: 1560, h: 975, dur: 27.6, kb: 408,
  steps: [
    [0,"Highlight a sentence in the saved page: the selection menu appears beside it"],
    [5.9,"Click anywhere else: the menu closes at once, and does not stay over the page"],
    [10.5,"Highlight it again and choose Quote: the sentence becomes a component beside the page"]] });
/* /demo:selpop */
/* demo:shiftzoom */
FEAT.demo("shiftzoom", { by: "Gabe", at: "2026-11-21", use: "Shift+click a component to zoom the canvas onto it, to read it closely or show it to someone: with the mouse or with the pen, and only when you are not typing in it.",
  video: "demos/shiftzoom.mp4", poster: "demos/shiftzoom.jpg", v: "f85222e1", w: 1560, h: 975, dur: 17.1, kb: 608,
  steps: [
    [1.3,"Hold Shift and click a component: the canvas zooms onto it and fits it to the screen"],
    [6.1,"Shift+click the next one, just in view below: the view moves on to it"],
    [11.9,"The pen does it too: hold Shift and tap the next component with the pen"]] });
/* /demo:shiftzoom */
/* demo:shortcuts */
FEAT.demo("shortcuts", { by: "Gabe", at: "2026-11-21", use: "For finding any key or gesture the app has, and for moving a key to one you will remember: the app tells you when the browser owns a combination and offers the nearest free one.",
  video: "demos/shortcuts.mp4", poster: "demos/shortcuts.jpg", v: "bffc3044", w: 1560, h: 975, dur: 38.2, kb: 786,
  steps: [
    [1.2,"Settings → Keys & commands: every key and gesture is in one list. Search “zoom” to find the ones you need"],
    [11.1,"The same list opens anywhere with ?, outside a text box: search it for “new component”"],
    [19.4,"Change “New component”: press Ctrl+T. The browser owns it (it opens a new tab), so the app refuses and offers Alt+T"],
    [24.9,"Take the offer: New component is now Alt+T"],
    [31.2,"In a note, Alt+T now makes a component"]] });
/* /demo:shortcuts */
/* demo:stepwires */
FEAT.demo("stepwires", { by: "Gabe", at: "2026-11-21", use: "For tying an observation to the exact step of a protocol it came from, and moving the link to another step if you find it belonged elsewhere.",
  video: "demos/stepwires.mp4", poster: "demos/stepwires.jpg", v: "daae18d1", w: 1560, h: 975, dur: 30.6, kb: 521,
  steps: [
    [1.3,"Rest on step 3 of the protocol: a link circle of its own appears on its edge"],
    [7.3,"Drag that circle to the observation: the link starts at step 3, not at the box"],
    [19.5,"A link is not fixed: click its label, and Move it to another step: step 2, where it belonged"]] });
/* /demo:stepwires */
/* demo:synthnotes */
FEAT.demo("synthnotes", { by: "Gabe", at: "2026-11-21", use: "For one place where a series’ runs add up: every run’s Analysis leads to the same Synthesis, where you write what they add up to, and the Portfolio lists it above the notes with that sentence under each note.",
  video: "demos/synthnotes.mp4", poster: "demos/synthnotes.jpg", v: "571bfa77", w: 1560, h: 975, dur: 32.7, kb: 573,
  steps: [
    [1.2,"In Run 3’s Analysis, Next opens the series’ Synthesis: the one Runs 1 and 2 already share"],
    [6,"Write what the runs add up to, in the Synthesis’ own box"],
    [20.5,"The Portfolio lists it under Syntheses, above the notes, with its sentence under it"]] });
/* /demo:synthnotes */
/* demo:tbanner */
FEAT.demo("tbanner", { by: "Gabe", at: "2026-11-21", use: "Every theme has a wide banner, 1600 × 200 pixels, with its name inside it — at the top of its section in the Portfolio and on its own page. Click it to choose a picture of your own, or ask Claude to make one at that size.",
  video: "demos/tbanner.mp4", poster: "demos/tbanner.jpg", v: "187d8598", w: 1280, h: 800, dur: 22.7, kb: 218,
  steps: [
    [1.1,"In the Portfolio, a theme’s banner is drawn from its name until you give it a picture: click it"],
    [7.2,"Choose an image…: a picture made at 1600 × 200 fits exactly, and the theme’s name is written over its left side"],
    [15.1,"Click the theme’s name: its page has the same banner, with its name as the page’s title"]] });
/* /demo:tbanner */
/* demo:templates */
FEAT.demo("templates", { by: "Gabe", at: "2026-11-21", use: "For laying out a note type once, including image panels that wait to be filled, so that every new note of that type starts arranged.",
  video: "demos/templates.mp4", poster: "demos/templates.jpg", v: "499b4ef7", w: 1560, h: 975, dur: 34.4, kb: 925,
  steps: [
    [1.1,"Settings → Templates → Edit on the Experiment template: it opens as a small canvas, its components where a new note will put them"],
    [7.9,"Drag “Observe” by its title bar to sit beside “Setup”"],
    [15.2,"Add an image placeholder and give it a shape: type 2x3. Save"],
    [23.6,"On an experiment’s plan, Next makes the Run note from the template: arranged the same way, with the waiting panel in place"],
    [28.1,"Click the waiting panel and add two pictures: it becomes a real 2 × 3 image panel"]] });
/* /demo:templates */
/* demo:tidy */
FEAT.demo("tidy", { by: "Gabe", at: "2026-11-21", use: "For tidying a messy note in the shape that reads best — information flowing down the page or across it — and for getting your own layout back whenever you want it.",
  video: "demos/tidy.mp4", poster: "demos/tidy.jpg", v: "e0669a97", w: 1560, h: 975, dur: 30.3, kb: 942,
  steps: [
    [1.2,"A messy note: components thrown anywhere. Right-click the paper → Tidy layout, and choose Top down"],
    [12.4,"Another style, Left to right: the links now run across"],
    [21.7,"Undo tidy · back to your layout: every component returns to where you had put it"]] });
/* /demo:tidy */
/* demo:todaycaps */
FEAT.demo("todaycaps", { by: "Gabe", at: "2026-11-21", use: "Captures show up on the Today page, so you can come back to them during the day and move them to a project. Each capture has a Move to… button right under it that brings up the move panel.",
  video: "demos/todaycaps.mp4", poster: "demos/todaycaps.jpg", v: "7737becb", w: 1560, h: 975, dur: 25.2, kb: 525,
  steps: [
    [1.1,"Anywhere in the app, Ctrl+Shift+Space opens the quick capture: type the thought and add it"],
    [9.6,"It waits on the Today page, newest first, with its time and a Move to… button under it"],
    [13.1,"Press Move to… and find the note by search: the capture goes there"],
    [20.1,"It leaves the list, and a line says where it went, with Ctrl+Z to put it back"]] });
/* /demo:todaycaps */
/* demo:topics */
FEAT.demo("topics", { by: "Gabe", at: "2026-11-21", use: "Mark a cluster of components as a topic synthesis, and find every topic you have marked in one gallery, each with a small map of how it is laid out.",
  video: "demos/topics.mp4", poster: "demos/topics.jpg", v: "5e32d4cf", w: 1560, h: 975, dur: 28.4, kb: 460,
  steps: [
    [1.3,"Open the ⋯ of a region that holds one topic and choose Mark as a topic synthesis: its tab says so"],
    [9.5,"Compendiums → Topic syntheses: the topic is a card, with a small map of its components"],
    [20.9,"Open lands on the region in its note, centred"]] });
/* /demo:topics */
/* demo:opencomp */
FEAT.demo("opencomp", { by: "Gabe", at: "2026-11-21", use: "For jumping straight to a component from anywhere — a task, a search result, a link — and arriving with it centred and readable, with what is around it, instead of hunting for it on a large canvas.",
  video: "demos/opencomp.mp4", poster: "demos/opencomp.jpg", v: "21e05e72", w: 1560, h: 975, dur: 27.8, kb: 848,
  steps: [
    [1.2,"Tasks tab → click “Order fibronectin”: its note opens with the task centred, at 50%, with its neighbours around it"],
    [8.3,"Settings → Features → Open a component: set “Zoom on arrival” to 100%"],
    [18.9,"Open the task again, this time from search: it arrives at 100%"]] });
/* /demo:opencomp */
/* demo:paper */
FEAT.demo("paper", { by: "Gabe", at: "2026-11-21", use: "Set how the canvas feels under your hand: how fast Ctrl+wheel zooms, the grid cell a component settles to, and whether a flick of the paper keeps gliding. The paper on the page is a real one, so each setting can be tried at once.",
  video: "demos/paper.mp4", poster: "demos/paper.jpg", v: "ff286ff3", w: 1560, h: 975, dur: 40.4, kb: 430,
  steps: [
    [1.3,"Set Ctrl+wheel zooming to Quickly, then Ctrl+wheel over the preview paper: in, and back out"],
    [13.8,"Set a component to settle to Two cells, then drag the box: it lets go where you did, and snaps to the grid"],
    [26.5,"Flick the paper with gliding on: it carries on until it slows. Switch gliding off and flick again: it stops at once"]] });
/* /demo:paper */
/* demo:pficons */
FEAT.demo("pficons", { by: "Gabe", at: "2026-11-21", use: "Each kind of section in the Portfolio has its own symbol and its own colour, the same in every project, so you can tell Experiments, Syntheses, Notes, Protocols, Lit reviews and References apart at a glance. Switch it off and the sections go back to their words alone.",
  video: "demos/pficons.mp4", poster: "demos/pficons.jpg", v: "46cb8d52", w: 1280, h: 800, dur: 30.3, kb: 763,
  steps: [
    [1.2,"The Portfolio: each kind of section has its symbol and its colour — Experiments, Syntheses, Notes, Protocols, Lit reviews, References"],
    [7.1,"Settings → Section headers: switch it off, and the headers lose their symbols and boxes"],
    [14.3,"Back in the Portfolio the sections are only words again"],
    [19.7,"Switch it on again: the symbols and colours are back"]] });
/* /demo:pficons */
/* demo:pills */
FEAT.demo("pills", { by: "Gabe", at: "2026-11-21", use: "Put the note’s tools where your hand is: drag a pill to the side you hold the tablet by and it docks as a column, and the layout is the same in every note.",
  video: "demos/pills.mp4", poster: "demos/pills.jpg", v: "4f12b93a", w: 1560, h: 975, dur: 33.6, kb: 541,
  steps: [
    [1.2,"The ✦ tools pill sits top right. Drag it to the left edge and open it: against a side its tools stand in a column, and it stays docked"],
    [18.7,"The ＋ Quick cast opens as before; the column stays where you put it"],
    [24.1,"The layout is also placed in Settings → Pills: click the ✎ hand pill and its column becomes a row"]] });
/* /demo:pills */
/* demo:toasts */
FEAT.demo("toasts", { by: "Gabe", at: "2026-11-21", use: "Say how long the little messages stay at the bottom of the window, so there is time to read them and to press the Undo in one.",
  video: "demos/toasts.mp4", poster: "demos/toasts.jpg", v: "30f082ba", w: 1560, h: 975, dur: 50.9, kb: 759,
  steps: [
    [1.7,"Set “A message stays” to Much longer: the preview message now stays about ten seconds"],
    [11.2,"Move a component to another note (right-click → Move to another note…): its message stays, long enough to read"],
    [31.2,"Highlight words and click the component’s title: that message has an Undo in it, with time to press it — pressing it puts the old title back"]] });
/* /demo:toasts */
/* demo:today */
FEAT.demo("today", { by: "Gabe", at: "2026-11-21", use: "Set how much of the lists on Today is shown. Today lists your recent notes and a heatmap of the days you recorded time; in Settings you choose how many recent notes it lists and how many weeks the heatmap covers, and the page changes to match.",
  video: "demos/today.mp4", poster: "demos/today.jpg", v: "efa9aecf", w: 1560, h: 975, dur: 26.3, kb: 767,
  steps: [
    [1.3,"Today lists your recent notes and, under “Last 5 weeks”, a heatmap of the days you recorded time"],
    [7.7,"In Settings, on the Today page’s own page, set the heatmap to cover 12 weeks: the preview grows at once"],
    [15.6,"Back on Today, the heatmap now covers the last twelve weeks"]] });
/* /demo:today */
