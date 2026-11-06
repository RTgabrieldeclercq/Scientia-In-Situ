# Scientia In Situ — the Slip Box, rebuilt on paper

One file, `scientia.html`, holds the whole app: projects, themes, aims, notes, terms, wiring, the library, timers, weekly reviews and exports. Everything is loaded and saved in real time to IndexedDB in your browser.

## Run it

If you don't see recent changes, close any old server window and start `launch.bat` again. It now stops an older server still holding port 8766 and turns browser caching off. Hover the SiS logo to see the build. If this browser still holds the earlier demo data, the app offers to reload the new demo; the offer never wipes anything without asking.

Double-click `launch.bat` (needs Python). It serves the folder at `http://localhost:8766/scientia.html` and opens it.
Keep the port fixed: storage belongs to the origin, so another port means another, empty database.
Opening the file directly (`file://`) works, but then storage can't be made persistent, DOI lookup fails and folder snapshots are unavailable.

On first launch it loads a demo (Traction Force–ELISA). Settings → Start empty wipes it.

### Bringing over the old hub's data
The earlier hub (`hub/`, port 8765) keeps its own database. In the old hub: Settings → Export everything (JSON). Here: Settings → Import… and pick that file. Every store is counted after loading. Notes without positions are laid out on the paper the first time you open them.

## Your notebook folder (where your data lives)
- **Choose it once:** Settings → Notebook folder → Browse… (or type the path) → Connect. The choice is remembered in your user profile (`%APPDATA%\ScientiaInSitu\config.json`), not in the app folder. A new copy of the app (a new ZIP) finds the folder and reloads everything from it on launch.
- **What's in it** (written a few seconds after every change):
  - `.scientia/record.json`: the whole record, including connections, layout, structures, protocols, runs, plates, calculators, reviews and undo history. Launching loads it.
  - `.scientia/daily/`: one copy per day, the last 90 kept.
  - `.scientia/kept/`: copies taken before anything destructive (a wipe, a reload, a big shrink).
  - `images/`: images, videos, PDFs and HTML pages you add.
  - `recordings/`: your audio recordings (`2026-10-20 143201 <note title>.webm`), each with a `.json` beside it holding its transcript as the computer made it.
  - `<Project>/<Theme>/<Note>/<NN component>.md`: one Markdown file per component, for Obsidian. Each has YAML front matter (note, kind, structures, terms, dates); terms, links and citations as `[[wikilinks]]`; structures as `==highlights==` plus a Structures list; equations as `$…$`; and a Connections list. Each note also has `<Note>.md`, which embeds its components. `Terms/` and `Library/` pages hold the terms and references, and `Days/` the day notes.
- The Markdown is a mirror written by the app. Edit in the app; edits made in Obsidian are overwritten the next time that component changes. Files the app did not write are never touched.
- **Updating the app never touches your data.** Replace `scientia.html` (or the whole app folder) freely. Stored data only ever gains fields, and the app never loads the demo or wipes anything on its own. The one exception was the one-time wipe of the demo in this build, and a copy was kept in `backup/`.
- The server (serve.py, started by launch.bat) now holds the record and writes `record.json` itself, a few seconds after each change from any device; `.scientia/ops.jsonl` holds changes made since the last write, so stopping the server loses nothing. A second tab on this computer is simply another device in sync (only one writes the Markdown).
- Raw-data folders (Data tab) are browser permissions. After a fresh install, click Rescan once per folder.

## Your phone and tablet (sync)
Your computer is the hub: phones and tablets open the app from it (privately, through Tailscale) and stay in sync with it. **Settings → Devices** walks you through it:
1. Install **Tailscale** (free) on the computer and on the device; sign in on both with the same account.
2. **Turn on Tailscale access** (runs `tailscale serve --bg 8766`), which gives the app a private https address such as `https://your-pc.tailnet-name.ts.net/scientia.html`. The first time, Tailscale may ask you to switch on HTTPS for your network.
3. Open that address on the device (scan the QR code). iPhone/iPad: Safari → Share → Add to Home Screen, then open it from the Home Screen. Android: Chrome → ⋮ → Install app.
4. Make a pairing code on the computer, type it on the device (the QR code already carries it), and **Approve** the device when it appears. Paired devices are listed there; Remove stops one at once.
- **How it syncs:** every device sends its changes record by record and receives the others' within a second or two. The dot in the header is green when in sync, blue with a number while sending, grey when the computer can't be reached.
- **Install it as an app on each device:** Settings → Devices (on the device; ⋯ More on the phone) shows how — iPad/iPhone: Safari → Share → **Add to Home Screen** (install *before* pairing: the Home Screen app has its own storage, so pair inside it; the pairing screen says so); Android, Windows, Mac: an **Install** button (or the install icon in the address bar). A banner on a paired device opened in the browser offers it (× = not for two weeks). Installed, the app opens from its icon, full screen.
- **With the computer off:** an installed device opens and works normally — the whole app and the notebook it holds stay on it (images and recordings you have opened too). Every change waits on the device (the header shows "offline · N") and goes to the computer the next time it can be reached, even after the device was closed. Two devices both working while the computer is off each send their changes when it is back; anything both changed waits under ⚠. Nothing is lost if the computer stays off for days.
- **⟳ Full sync** (Settings → Devices on a device): sends what is waiting, then loads the whole notebook again from the computer. For when a device seems out of step; once is enough.
- **Conflicts:** when two devices change the same thing before seeing each other's change, what can merge merges on its own (a label changed here, the text changed there; components added to the same note on both). When both changed the same field, a ⚠ appears in the header: open it to see both versions side by side and keep one.
- **On a phone** the app opens in a phone layout: Today (timers, reminders due, what was written today, recent notes), Search, ＋ Capture (text with a kind, to today's day note or any note; 📷 Photo adds an image panel), Timers (pause, done, next, cancel; start one on any note) and Reminders. Notes open as a single column of their components, with the same editor. ⋯ → "Use the full layout" switches to the canvas (tablets get the full layout by default).
- The computer must be on with the app's window open for devices to sync. Same Wi-Fi works too (http://192.168…:8766) without Tailscale, but the device then needs the connection to open the app. Undo history, browser-held files and raw-data folder permissions stay on each device. Importing a record, starting empty and switching notebooks are done on the computer.

## iPad: fingers, pen and handwriting
- **Fingers** pan the paper (drag anywhere, even over components) and zoom (pinch). Tap buttons as usual; tap a component to select it, tap its text to type; **press and hold** a component (½ s) to drag it.
- **The pen writes on the paper.** Strokes written close together gather into one **ink component**, which sits exactly where you wrote and moves, wires, joins regions, takes timers and structure labels (⋯ → Label as…) like any component. In a component's text the pen is the iPad's own Scribble (handwriting straight to typed text). Your palm is ignored while the pen writes.
- **The ink bar** (top left; **✎ Pen** beside Timer, shown as soon as the pen touches the paper): pen, highlighter, eraser (touch strokes to remove them), lasso (circle strokes to move, recolour, delete or convert), five colours, three widths. On a computer, 🖱 lets the mouse draw.
- **Surface Pro / Slim Pen:** with the ink bar on, the mouse arrow hides as the pen comes near the paper (a dot of the pen's colour and width follows it). **Pressure** (⇣ in the bar, with a gauge that moves as you press): harder draws thicker and darker lines, lighter thinner and fainter; click ⇣ to switch it off. The first colour is **ink**: white on the dark theme, black on the light one (strokes switch with the theme).
- **Finger taps:** two fingers tapped together = **undo**, three = **redo** (anywhere in the app). On Windows, three-finger taps go to Windows first (Search / notifications) unless you switch them off: Settings → Bluetooth & devices → Touch → "Three- and four-finger touch gestures". The ink bar also has ↶ undo and ↷ redo. Windows turns a two-finger tap into a right-click; on the canvas that right-click is swallowed and taken as the undo, so no menu opens (a mouse right-click still opens it). To see what the screen reports when a tap does nothing, open the app with `#touchlog` at the end of the address: a small log of touches appears in the corner.
- **The back of the pen is an eraser:** turn the Slim Pen over and rub — it takes away only what it passes over (strokes are cut, the rest stays), whatever tool is chosen. A circle shows its size, and pressing harder widens it as you go. One pass is one undo.
- **No right-click menu from the pen** on the paper while the ink bar is on (press-and-hold, the barrel button or double taps).
- **Lasso across two ink components:** the lasso bar adds **Connect…** (pick or type the relation) and **Merge** (one ink component; their wires carry over).
- **Convert to text**: ⋯ on an ink component (or the bar when one is selected), or lasso some strokes → Convert to text. The ink becomes a text component in its place; the handwriting is kept with it (⋯ → Show the handwriting / Back to ink).
- **If the reader fails** (e.g. "Could not import module 'TrOCRProcessor'"), press **Repair the handwriting reader**: it reinstalls PyTorch, torchvision, Transformers, sentencepiece and protobuf, and the log shows the real cause and the versions found. If the processor class still won't import, the reader uses its image processor and tokenizer directly.
- **The reader runs on your computer** (Settings → Handwriting): Microsoft's TrOCR handwriting model with PyTorch, installed with one button (≈2 GB, once). The app cuts your ink into lines and the computer reads them; nothing leaves the computer. The first conversion after a launch waits while the model loads.

## Connections, dates, slimmer widgets, shapes, panels, note cards
- **Your own connection:** when the "How are these connected?" prompt opens, just type (e.g. "calibrates") and press Enter. In the chain-drop panels there is a "Your own connection…" field under the list. Typed connections are one-off (not added to the list) and read "A calibrates B" everywhere; a wire's menu also has "Make it: your own words…".
- **Every component shows its full date and time** (16 Oct 2026 14:32).
- **Widgets are slimmer:** their toolbars sit in the header row beside the time stamp (image panel, well plate, calculator, equation, live view, timer, material card); when a widget is too narrow, the tools take a second line just under the name.
- **Shapes with the pen:** draw, then hold the pen still for half a second — the stroke becomes a line, an arrow, x/y axes (an L with arrowheads), a rectangle or square, a circle or ellipse, a triangle or polygon. Keep holding and drag: outwards grows and turns it, inwards shrinks and turns it.
- **Image panels:** click an image to crop it, then ← ↑ → ↓ (or the little map) go to the panel's other images, keeping each crop; ⤢ maximises the panel to fill the screen; drag the corner grip (or the right edge) to resize — the images follow.
- **A note inside a note:** + Insert → A note… puts a card with the note's title, where it lives and its synthesis; optionally one of its components highlighted beneath the title (Change highlight / ×). Click the title to open the note (Alt+click beside), the component to go to it. The card counts as a link to that note.

## Tasks
- **A task is a component:** + Insert → **Task** (or **Tasks** tab / a project's page → "+ Add a task"). A tick box, its words (the same editor: terms, links, styles), a **due time** (⏰ chip: date, time or all day, quick Today / Tomorrow / Next week), **priority** (▲ High / Normal / ▽ Low), **repeat** (daily, weekly, monthly) and **subtasks** (type in "+ subtask", Enter). Wire it to the components it concerns like any component.
- **Due time = reminder:** a dated task sits in Reminders (🔔) with deadlines and meetings, alerts like them, and its ✓ there ticks the task.
- **Done is logged:** on the task ("✓ done 19 Oct 2026 17:40", struck through), as a "✓ Done: …" entry (linked to the task) in that day's day note — so Today's timeline shows it — and in a **Done** list at the end of the Activity page. Ticking it again reopens it and removes that entry. A repeating task logs the occurrence and moves to its next time (its subtasks reset).
- **Lists:** the **Tasks** tab shows every open task grouped Overdue / Today / Upcoming / No date, plus "Done lately", filtered by project. Each project's page has its own Tasks section. A task added to a project without a note lives in that project's "Tasks · <project>" note.

## Slides and PDFs
- **Slides:** + Insert → **Slides (PowerPoint)…** and pick a .pptx (or .ppt/.ppsx/.odp). PowerPoint on this computer turns each slide into a picture (it opens the file hidden and read-only); the component shows one slide at a time — ‹ › or ← → (with the mouse over it) — with its speaker notes below, or **Grid** shows them all (2–6 across). **Image panel…** makes an image panel from the slides you tick (captions from the slide titles), wired to the deck. ⤢ maximises (← → there too); ↓ downloads the original. Each slide's text and notes are kept in the component, so Search and terms find them. Needs PowerPoint on Windows.
- **PDF:** + Insert → **PDF…**. Its pages are drawn by the app (the same on the iPad): **Pages** scrolls through them, **One at a time** pages with ‹ › / ← →. Resize from the corner, ⤢ maximise, ↗ open in a new tab, Replace. Its words are kept for Search too.

## Linking by hand (pen, images, side-by-side notes)
- **Pen, circle — line — circle:** draw a line with a small circle at each end and the two ink components nearest the circles are connected (pick the type, or type your own). The drawn stroke goes away. A circle drawn on a text component connects that component.
- **From a link circle (pen or mouse):** drag from a component's ● into another note's pane: drop on a component there to connect them (pick the type), or on its empty paper to choose one of that note's components.
- **One image of an image panel:** hover an image — it has its own ● at its bottom edge. Drag from it to a component: only that image is connected (the wire leaves that image). Dropping onto an image in another panel connects the two images.
- **Bring things into another note (side by side):** with the pen, press and hold a highlight (a structure) for half a second, then drag it into the other pane: it is embedded there, live (it follows the original), with its link circle. Dropped on a component, they are also connected (you pick the type). Dragging a whole component into the other pane does the same — embed (pen or plain drag); hold **Alt** to move it instead.
- **Connections look:** each relation has its own colour (leads to blue, supports teal, contradicts red, caused orange, resolves green, comments on purple, needs amber, follows slate, related grey dashed; your own words get a colour of their own). Every wire has its own spot on the component's side, ordered by where it goes, so wires don't stack; each starts with a small dot. A wire that would pass through components loops out to the side (in a column) or arches over the top (in a row), longer ones wider so they nest; where it still crosses a component it is drawn over it, faint, with a soft shadow — lifted — so the text underneath stays readable. Labels avoid each other and sit off the components.

## Handwriting, pen pressure, split button, reload (21 Oct)
- **Convert to text** now uses Windows' own handwriting recognizer on the computer (the engine of the Windows pen input panel): it reads the strokes themselves, so cursive works, it answers in about a second, offline, with nothing to install. Settings → Handwriting shows it and, if Windows has several handwriting languages, lets you pick one. Add or improve a language in Windows: Settings → Time & language → Language & region → your language → ⋯ Language options → Handwriting. The iPad's ink is read by the computer too.
- **Pressure feel:** with pressure on, ⚙ beside the pressure button in the ink bar: Sensitivity (firm ↔ light touch), Thinnest and Thickest line (× the pen width), Fade light strokes, a curve preview and a strip to scribble on. Kept on this device; each stroke keeps the range it was drawn with.
- **◫ Split** on each note's toolbar: Side by side (pick the other note) or Quadrant (pick up to three); this note stays first. In a split it switches layouts or goes back to one pane.
- **⟳** in the header reloads the app (the installed app has no browser reload button; Ctrl+R / F5 still work).
- **Experiments start with Planning,** from **+ Experiment** and from **+ Note → Experiment** alike. "Next" at the bottom right makes the Run; a protocol picked under "Run a protocol" is laid out there, ready to run.
- Recording transcripts: the audio is now decoded by the app itself (fixes "open() got an unexpected keyword argument 'metadata_errors'" with newer PyAV); press **Try again** on a failed recording.

## Papers, terms and general notes (21 Oct)
- **The pen in the paper reader is a highlighter** that takes whole words: from the first word it touches to the last, everything in between (start on the "m" of tumor, end on the "a" of creates: "tumor microenvironment creates"). Lifting the pen saves it in the last colour used; a small bar offers colours, Make it… (claim, evidence…), Note and Undo, and fades if left alone. The back of the pen erases highlights it passes over. Mouse and finger still select text as before. On the iPad the Pencil doesn't scroll the page (fingers do). On the Surface, while the pen hovers over the paper the page stops taking swipe gestures (no scrolling, swipe-back or pull-to-refresh from the pen); fingers scroll as soon as the pen moves away.
- **Search in a paper:** Ctrl+F or the box at the top of the reader's side panel. Highlights come first, then your notes and the structures taken from the paper, then the paper's text — each with its page and the match in bold. Click a result to go there (the match flashes); Enter / Shift+Enter step through the text matches. Searching a term also finds its other forms. **All papers** searches every PDF in the library, grouped by paper.
- **Other forms of a term:** Terms page → "+ form" under a term (or the term's lens → Other forms), e.g. AiEW and AEW for apoptotic-induced ERK wave. Every component — paper highlights included — using any form is marked with the term. Forms written with capitals match only with those capitals (AEW, not aew; a plural s is allowed); other forms match any case and plurals. Hovering a mark shows the form it was written in. × removes a form (and the marks it made).
- **Notes outside any project:** + Note → Project: **No project (general)** (any type; + Experiment too). They sit in a **General** section at the top of the Portfolio; the note's header says "General · touches <projects>" from what it links to. ⋯ → **Project & theme…** moves any note into a project or theme, between projects, or out to General.

## The pen's button: lasso, reshape, copy and paste; fills (21 Oct)
- **Hold the Slim Pen's button** and the pen is a lasso, whatever tool is on: loop around ink and components to select them (a component counts when the loop goes round it).
- **With a selection:** drag inside it to move it (components too). Corner handles scale it, keeping proportions (hold the pen button, or Shift with the mouse, to stretch freely); side handles stretch one way; the round handle on top rotates it, snapping every 15° when near. Rotating and scaling change the ink only — components stay upright and keep their size. A width or colour in the ink bar applies to the selected strokes.
- **The selection bar:** Copy, Duplicate, ⇋ / ⇵ flip, ▍ Highlighter ↔ ✎ Pen, ◧ Fill, colours, Convert to text, Connect / Merge, Delete (components too; Ctrl+Z undoes).
- **Copy and paste with the pen:** copy with the bar's Copy, Ctrl+C, or by holding the button and tapping the selection. Then hold the button and tap anywhere to paste: copied ink and components land where you tap; text you copied (in the app or elsewhere) becomes a new text component there — or goes into a component's text at the spot you tap inside it.
- **Fill (a tool):** ◧ beside the lasso. Tap inside a closed shape (a recognised shape, or a stroke that closes on itself) to fill it with the colour of the pen or highlighter you used last — the fill has its own colour, the border keeps its own. With pen ink it is a solid fill (tap again with another colour to replace it); with the highlighter each tap adds a translucent layer, so the shade gets darker. Hold the highlighter still and the stroke becomes a shape: a closed one is a highlighted area — filled, with no border (Fill taps add layers to darken it); open ones (lines, arrows) stay strokes. Lasso → ◧ Fill / Unfill does the same for selected strokes. Highlighter strokes are translucent, so overlaps get darker (on the dark theme too).
- **Palettes:** the pen and the highlighter each have their own colours (the bar shows the one in use; ✎ or ▍ beside it). Press and hold a colour (or right-click / double-click it) to change it — a large palette, or any colour; the dotted ⊕ circle adds one; Remove and Reset palette are there too. Kept on this device; strokes already drawn keep their colours.

## Quoting from embedded files; Tab; structures (22 Oct)
- **Quote from an embedded PDF or HTML page:** select text in a PDF widget (its pages now have selectable text) or an HTML page widget, with the mouse or the pen. A small menu offers **❝ Quote here** · **Connect to…** · **Make it…**. **Ctrl+Enter** on a selection quotes it and asks what it is (claim, evidence, question… — the same letter keys as in a note; Enter just quotes).
- **A quote** is a component beside the embed, in quote style, with "❝ from file, p. N" under it — click that to scroll the embed to the passage (it flashes). It is wired to the embed ("quotes"), and the passage stays highlighted in the embed. Terms are marked in it like anywhere.
- **Connect to…** makes the quote, then: click the component it belongs to (in this note or another pane) — or "Choose from a list…" — and pick the relation.
- The HTML page stays sandboxed: the copy shown carries a small script that reports the selection and draws the highlights; it can't reach your data.
- **Tab** in a component's title goes to its text (as Enter does), caret at the end.
- **Reminder (structure, key m):** marking text as a Reminder flags its component for the next weekly review automatically, and a 🔔 badge appears on every component connected to it, in any note — click it to read the reminder, go to it, or mark it Done ✓ (which clears the badge and the flag). The review closes leftover reminders as before.

## Pen mode, moving by name/date, loops, ink library (22 Oct)
- **Pen mode off** (✎ Pen not highlighted): the pen doesn't write — it pans the paper and moves components, like a finger or the mouse. Turn ✎ Pen on to write.
- **Move a component by its name or date:** drag either (mouse or pen). **Double-click** the name to edit it, the date to change the time.
- **While the pen writes**, the frame around ink components is hidden.
- **The pen's button:** in pen mode it lassoes (select, move, copy…, as before); out of pen mode, loop around components with it held to make a **region** of them.
- **Right mouse button held** and dragged around components: on release, choose **Make a region** or **Select** (then move, copy, **Cut**, delete…). A plain right-click still opens the menu.
- **☆ Ink library:** save an ink component (its ⋯ → ☆ Save to ink library) or a lasso selection (☆ Save), name it, and place it again anywhere: ☆ in the ink bar → click it → tap the paper; or + Insert → Saved ink. Kept in the notebook and synced to your devices; rename or remove items in the library.
- **Recording bookmarks:** dropping a ◆ (button or Alt+M) puts you straight in its label to type a name.

## Undo, eraser size, dashed and dotted lines (22 Oct)
- **Undo (two-finger tap, ↶, Ctrl+Z) takes back one stroke at a time.** Before, a stroke added to an existing ink component could not be undone on its own.
- **Eraser size:** the pen's back end now follows the pen's sensitivity curve between a smallest and largest size (default 4–20 px; hovering shows the smallest). Set both in the ink bar → ⚙ Pressure feel → Eraser, with a preview of light / medium / hard.
- **Dashed and dotted lines:** select strokes with the lasso (pen button) and pick ─ solid, ┄ dashed or ┈ dotted in the selection bar. Works on straight lines, shapes and freehand strokes; Ctrl+Z undoes it.
- **Faster eraser (pen's back end):** the eraser now does its work once per screen frame instead of on every pen sample, redraws connections only when you lift the pen, and no longer adds extra points to the strokes it cuts (repeated erasing used to make ink heavier and slower).

## Export for the lab website (24 Oct)
The McGhee Lab website runs Scientia inside its Lab Notebook (mcgheelab.com → Lab Notebook → Scientia), synced through the lab's cloud hub. **Settings → Data → Export for the lab website** (or Ctrl+P → Export for the lab website) saves `scientia-for-mcgheelab-<date>.json` — the whole notebook in the format the site's *Upload from desktop…* takes (undo history, browser-kept files and data-folder handles left out) — and shows what to do next and what the online copy can't show yet. Nothing in this app changes.
1. **One copy:** Lab Notebook → Scientia → ⋯ → *Upload from desktop…* → the file → Upload (replaces the online notebook; up to 31 MB).
2. **Keep both in step, files included (recommended):** *Desktop sync…* → make a key → download `scientia-cloud.py` next to launch.bat → with the app running: `py scientia-cloud.py --key <key>`, then `py scientia-cloud.py --prefer local` the first time, and `py scientia-cloud.py` afterwards. It is one more device of this app; launch.bat, the notebook folder and the backups work as before.
- Files over 30 MB, and spreadsheets (.xlsx/.csv — a table's cells travel in the record anyway), stay on this computer.
- The site runs this app as of 22 Oct: tables and plots show as their name and first rows, library themes/groups, saved ink and dashed lines are kept in the record but not shown — they appear once the newer app is merged into the lab repository (scientia/src, by pull request).
- One cloud: the lab hub is the only cloud sync (the app's own Firebase sync was retired on 26 Oct); keep the desktop and the website in step with `scientia-cloud.py`.

## Tables from Excel / CSV, and plots (23 Oct)
- **+ Insert → Table (Excel / CSV)…** copies every sheet of an .xlsx / .xls / .ods / .csv / .tsv into the note (so it syncs and works on every device) and keeps the original file (⋯ → Download the original file). **Empty table** starts one to type or paste into. Up to 60,000 cells per sheet.
- **Working in the table:** sheet tabs; Search rows; click a column letter to sort (again: reverse, then off — only the view is sorted, the cells stay put); click a cell to select it, click again (or type, Enter, F2) to edit; Enter / Tab move on; arrows move; Delete clears; paste a block copied from Excel into a cell; + Row / + Col; ⋯ for insert/delete row or column, header row on/off, Download as CSV, Replace with a newer file. Drag the bottom edge to make it taller. The bar under the table shows the cell's address and its formula.
- **Formulas** start with `=`: + − * / ^, `&` to join text, comparisons, references (`B2`, `$B$2`), ranges (`B2:B20`) and SUM, MEAN / AVERAGE, MEDIAN, SD / STDEV, SEM, VAR, MIN, MAX, COUNT, ABS, SQRT, LN, LOG, LOG10, EXP, ROUND, POWER, PI, IF. Excel formulas using only these come in as formulas; others come in as their values. Errors show as #VALUE, #NAME, #DIV/0, #CYCLE.
- **Plot…** (on the table, or + Insert → Plot of a table…) puts a plot beside the table, wired to it ("plotted in"), and opens ⚙ Plot: **Scatter** or **Line** (X and one or more Y columns, error bars from a column per Y, log X / log Y), **Bar** (groups from a column, mean ± SD or SEM, with every point shown), **Histogram** (automatic or chosen bins). Axis titles come from the header unless you type your own. The plot follows the table as you edit it; ↓ downloads it as SVG. Hover a point or bar for its values.

## Pen highlights ask, like the mouse (23 Oct)
- In a library paper, a PDF in a note (maximised) and an HTML page in a note, a pen highlight now opens the same popover as selecting with the mouse: the structures (or Ctrl+B letters) and the colours, plus Quote / Connect for files in notes. The pen's mark stays on the words until you pick; closing the popover leaves nothing behind.

## Library themes and groups (23 Oct)
- The Library page has a tree on the left: **All papers**, **Not in a group**, then **Themes** with their **groups**, then groups without a theme.
- **+ Theme** (e.g. Confocal Optics), then **+ Group** inside it (e.g. R-PE Photobleaching Kinetics). ⋯ on a theme or group: rename, move a group to another theme, delete (papers are never removed; a deleted theme's groups move to "Groups without a theme").
- On each paper, its groups show as chips; **＋ Group** opens a list of all groups by theme with checkboxes and "+ New group". A paper can be in several groups. You can also drag a paper onto a group in the tree.
- Clicking a theme lists every paper in its groups; clicking a group lists its papers; clicking a chip jumps to that group. Themes and groups sync with everything else.

## Export a note as its canvas (22 Oct)
- **⋯ → Export canvas (HTML)…** (or the command palette, Ctrl+P) now saves the note's actual canvas as one HTML file that opens in any browser, offline, with no server.
- **What's inside:** every component, connection, region and ink stroke of the note, and every file it shows — PDFs, embedded HTML pages, images, slides and recordings — so the file can be large (PDFs and audio add their size plus about a third).
- **What works for the viewer:** pan and zoom, fit, maximise, PDFs (scroll, one page at a time, maximised), embedded pages run as they do in the app, slides, figures, recordings play, light/dark. Nothing can be moved, written, inked, deleted or added.
- **Outside the note:** connections to components in other notes show as faded stubs naming the other component and its note; they lead nowhere. **References** (header and dock) lists the notes this one refers to (pulled-in components, note cards, links, connections) with their type, project path and date, the outside connections, and the citations. Following a link to another note opens References at that note. The other notes themselves are not in the file.

## Highlighting a maximised PDF or HTML page (22 Oct)
- Maximise a PDF (⤢) or an HTML page (⛶) and it works like a paper in the Library: a side panel lists its highlights (each a quote in this note) with page, kind and your notes — type a note under one (Enter), click one to go there (it flashes), search them, "make it…", remove.
- **Select text** and the structures pop up at once: click one, or press its letter (c claim, e evidence, q question…). Below them: a plain highlight colour, ❝ Quote, Connect to…. Highlights that are structures show in that structure's colour from Settings → Structures (in the file, in the side panel).
- **The pen is a highlighter** there, taking whole words from the first touched to the last, saved in the last colour with the small bar (colours, Make it…, Note, Undo). The back of the pen erases highlights. In HTML pages the pen highlights too (also in the small widget). The pen hovering over the pages doesn't scroll them; fingers do.

## Embedded image panels (22 Oct)
- An image panel (or another widget — well plate, PDF, HTML page, slides…) embedded from another note now shows the real thing, live, with "embedded from <note>" beneath — not a text card. Each of its images has its own link circle, so connections drawn here leave from that image. Changes made in the embedded copy change the original. (A panel *moved* with Alt+drag simply belongs to the new note, connections and all.)

## Recordings
- **Record:** + Insert → **Recording** (on the phone: Capture → ● Record). It starts the device's microphone at once (allow it the first time). The component shows the time and a live level; **❚❚ Pause** / **▶ Resume** keep one file; **◆** (or **Alt+M** from anywhere) drops a bookmark at that moment; **■ Stop** saves it. A red pill in the header shows the time while you're elsewhere in the app. Closing the page while recording asks first.
- **The file:** saved as recorded (WebM/Opus from Windows and Android, M4A from the iPad, about 0.5 MB a minute) in the notebook folder's `recordings/`, through the computer. If the computer can't be reached, the audio is kept on the device and moves there when it can.
- **The transcript:** the computer transcribes it with Whisper ("small", via faster-whisper, offline). Install it once: Settings → **Recordings** → Install the transcriber (about 100 MB, then 480 MB for the model on first use). Recordings made before the install wait in a queue and are transcribed afterwards, also across restarts. The transcript lands in the component as ordinary text, one sentence a line: correct it, mark terms and structures, link — Search finds it. Each line has its time in the margin (click it to play from there, or Alt+click the line); a clock time marks every 30 s of recording (pauses counted). While playing, the line being spoken is highlighted.
- **Playback:** ▶ / ❚❚, click the bar to jump; bookmarks are diamonds on the bar and chips below it (click to play from there, type a label, × to remove); ◆ while playing bookmarks the moment playing. ⋯ → Transcribe again (replaces the text) or Download the audio.
- On the iPad and phone the browser only opens the microphone on the **https://** address (Settings → Devices → Tailscale), not on a plain http:// LAN address.

## Layout
| Path | What |
|---|---|
| `scientia.html` | The built app — fonts, CSS and JS inlined, fully offline |
| `src/` | Source, numbered in load order. Edit these, then run `python build.py` |
| `fonts.css` | Archivo, Source Serif 4, IBM Plex Mono (SIL OFL), base64 |

## How the spec maps to the app
- **Paper.** Every note, the term lens and the portfolio map are infinite 14 px graph paper with the lens lag, 5% edge fade, drag/flick/wheel pan and Ctrl+wheel/pinch zoom. Pages (Today, Review, Activity, Library, Settings) sit on the same grid.
- **A note** is a canvas: a header box (profile fields and tags), one box per component, and a synthesis box. Boxes drag and snap to 14 px; boxes never overlap.
- **Connections.** Drag the ● on a box to another and choose the relation; direction matters and is drawn with an arrow. Relations: follows, leads to, caused, resolves, supports, contradicts, comments on, needs (needed by), related.
- **Structures.**
  - Select text and press Ctrl+Enter, then a letter: claim, evidence, barrier, resolution, result, takeaway, decision, question, idea, deviation, observation, reminder. `/` references an existing structure, W marks a term and L makes a link.
  - Colours and the text-vs-highlight style for each kind are set in Settings with an RGB picker.
  - Claims and evidence are project records with a canonical wording and a stance; evidence asks for its source.
  - With the optional day lock on, structures lock when the day turns, and corrections are new records that point at the old one.
- **Terms.** Ctrl+W marks a term in Focus mode (Ctrl+. → fullscreen + keyboard lock, because browsers otherwise close the tab on Ctrl+W); Alt+W works everywhere.
  - Terms render outlined and bold, and join the project's term repository.
  - The term lens chains components at three scales: project (large), theme (medium) and experiment (small). It infers claim → barrier, barrier → resolution and claim-chain → result.
  - Terms can be imported between projects.
- **Lineage.** Revise, split and merge keep the old wording inside the new box (§5). Protocol steps keep observations from every earlier wording and every run.
- **Experiments as stages.** "+ Experiment" (next to "+ Note") asks for a project, theme and name, then opens the experiment's Planning note.
  - Each stage is its own note. The button at the bottom right of the canvas, "Next: Run", creates the next stage and strings it from this one: Planning → Run → Analysis → Reflection. Once a stage exists, the button reads "Open …" instead. Ctrl+click opens it beside the current note.
  - The header shows the experiment's stages; click one to jump to it.
  - Registered protocols placed in the Planning note are laid out as runs in the Run note.
  - The order is data: each note type's `next` field.
- **+ Insert.** Every note has "+ Insert" at the left of the bottom bar; right-click on the paper → "Insert…" places the item at that spot. It lists everything that can go in a note: well plate, a plate carried from the plan, new protocol, run a protocol, a box, pulled-in barriers, structures and components. New widgets register in `INSERTS` (src/13e-plate.js) and show up there automatically.
- **Well plates** (6, 12, 24, 48, 96 or 384 wells).
  - **Colour mode** fills each well with a colour and shows its id (A1, B3…). **Image mode** shows what you placed in each well, cropped to its circle.
  - Drag across wells, or click a row or column header, to select. Then pick a colour (or any colour), write a note, or add images/videos to all selected wells at once. The colours used appear as a legend you can name.
  - Notes hang outside the well's border. "Notes on hover" hides them until you hover a well; a teal dot marks wells with notes. Consecutive wells with the same note share one label (e.g. C1–6).
  - Adding an image opens the crop view: the well's circle over the full image. Drag to move and scroll to zoom as far as you like; only what's inside the circle shows on the plate.
  - Clicking a well opens it with the full image or video, its notes (editable), its colour, and a minimap of the plate in the top-left corner to jump to other wells (arrow keys work too). Several images in one well form a timelapse: frames in order, with a slider, play, a label per time point, reorder and remove.
  - **Into the Run:** "Next: Run" carries the plan's plates into the Run note (or "+ Insert → Well plate from the plan…"). Colours, legend and planned notes stay; each well's notes and images start empty, and the planned note shows in the well's view.
  - GIFs and videos (MP4, WebM, MOV) work everywhere an image does. Hovering a plate plays its videos and GIFs and steps through timelapse wells.
- **Single wells.** "Single well / dish" is a plate format of its own. On any plate, Shift+click selects one well, and Shift+drag adds a range to the selection. A note on a selected or hovered well always sits above its neighbours.
- **HTML pages.** "+ Insert → HTML file…" places an exported plot, report or page on the canvas. It runs in a sandbox, so it can't touch your notes. Drag the corner to resize it. Hovering shows buttons to maximise (Esc closes), reload, open in a new tab or replace the file. The file is kept in `images/`. Pages that load other local files (images next to the HTML) won't find them: export as a single self-contained HTML.
- **Equations.** In any box, type `$…$` for an inline equation or `$$…$$` for a display one (`\(…\)` and `\[…\]` work too). It is typeset as soon as you close it. "$5 and $10" stays text.
  - Click an equation to edit it in the equation editor, with its LaTeX alongside. It has an Inline/Display switch and "⌨ Keyboard", an on-screen symbol keyboard with tabs (numbers, symbols, letters, Greek). "?" lists the shortcuts.
  - Done or Ctrl+Enter saves; "Back to plain text" turns the equation back into its LaTeX. "+ Insert → Equation" starts a new one.
  - The editor is MathLive (MIT licence, in `vendor/`), built into the single HTML with its fonts.
- **Calculator.** The "Calculator" button at the top right of every canvas opens a new calculator box in that note; open as many as you like, in any note.
  - It reads the keyboard. ← → move, Backspace and Delete edit anywhere in the line, Esc clears, and ↑ ↓ recall earlier lines.
  - The result shows as you type. Enter files the line in that calculator's own history and starts the next line with `ans`, the line above. Type an operator to carry on from it, or a number to start fresh.
  - Click any earlier line to change it, for example a number. Every later line that uses `ans` is worked out again from the new value, so the changed number flows through instead of the operation being applied twice. Click a line's "= result" to put that value in the current line.
  - Tabs: Scientific (default), Functions (inverse and hyperbolic trig, log base, roots, rounding, nCr/nPr, gcd/lcm), Constants (N_A, k_B, R, F, c, h…), Stats & lab (mean, sd, sem, median, cv…, dilute(C1,V1,C2), molar(g, MW, L)). DEG/RAD switch.
- **Data (raw data by reference).** In the Data tab, "+ Add a data folder" points the app at the folder your instrument exports to (Chrome/Edge). "Register files…" lists what is inside; tick what you want. Nothing is copied.
  - Each dataset stores the folder, its path inside it, size, modified time, instrument (guessed from the extension: ND2, CZI, LIF…; editable), acquisition time, and a SHA-256 fingerprint of the size plus the first and last 4 MB. That keeps multi-gigabyte files quick to check.
  - "Rescan" checks size and date, fingerprinting only what changed. "Verify fingerprints" re-reads every file's ends. A file that moved within the folder is found again by its size and fingerprint. Changed files are flagged until you accept the new version; missing ones are marked missing.
  - Where the browser supports live folder watching (FileSystemObserver), changes trigger a rescan. Otherwise rescan is on demand.
  - After a restart the browser asks once for read access when you click Rescan.
  - Open a dataset to set the experiment step that produced it and to see which passes use it.
- **Provenance.** Any box's ⋯ → "Data, materials & code…" binds it to datasets, materials and upstream boxes ("made from"), plus a code version (a commit hash is enough). These show as chips on the box.
  - The provenance panel (ⓘ) shows the chain: figure ← pass ← dataset ← experiment step, with the materials at each step and the protocol behind a run.
  - ⋯ → "Export provenance…" writes it as read-only HTML with the texts of every box in the chain.
- **Materials.** "Resource" is a note type for cell lines, antibodies, gel batches, instruments, plasmids and chemicals. Its header holds kind, lot, passage, concentration, supplier and location.
  - "Next passage…" / "Derive next batch…" makes the next one, linked as superseding the old one.
  - Any note lists the materials it used ("+ material" on its header box), and boxes can bind to them too.
  - The Materials tab groups materials by kind and shows, per lot, the notes that used it and the barriers recorded there, optionally only barriers about one term, e.g. edge collapse. A lot with more than twice its kind's rate is marked "clusters here".
- **PDFs.** In Library, "+ PDF" attaches a paper's PDF (saved in `images/`); "📄 Read" opens it in the built-in reader (PDF.js, bundled, Apache-2.0).
  - Select text to highlight it in a colour, or press Ctrl+B (or your structure key) and a letter to make it a claim (C), evidence (E), barrier (B), question (Q)… Its source is filled in: the paper and the page.
  - Each highlight is a box on the paper's literature note ("Reading: …"). It is anchored by the quoted text with its surrounding words and page (the W3C Web Annotation TextQuoteSelector) plus its position on the page, and its "📄 p. N ↗" chip opens the reader at that page.
  - The side panel lists highlights with search and sort. "Evidence goes to" picks the project that new claims and evidence belong to.
- **Images folder.** Every image, GIF and video you add is saved in the `images` folder next to `scientia.html` (by `serve.py`, which `launch.bat` runs), so it loads every time you open the app. If the app was opened another way, files are kept in the browser and moved into `images` the next time it is started with `launch.bat`. Keep the `images` folder with the app when you copy or back it up; the JSON export holds the records, not the files.
- **Term lens.** Each occurrence is shown as its full box (text, structures, terms), under a header with the note's type and title. Click the header to open that note at the box (Ctrl+click: beside).
  - Terms that share a box with the one you're viewing are pulled in. Their own boxes and connections are drawn in their colour (up to six; the first three are on by default). Toggle them in the side panel or from the term chips on each box, and open their own lens from there.
- **Protocols.** A protocol is one block, its steps numbered on a single rail.
  - A new one is a draft with a slowly pulsing yellow light. Click the light to register it under a project and theme, which creates a protocol note and leaves a run in its place. "Keep it in this note" leaves it local; it is still found by search.
  - Each run has its own timer widget at the top. Start it and the current step is highlighted with a green ✓. Click the ✓ to mark the step complete; its time is recorded and the next step is highlighted. The widget also has pause/resume, stop, the elapsed time, and a progress bar with one segment per step. A finished run shows its total time and a link to the summary.
  - In an experiment note, every step of a run or draft has a dot on the right border; click it to add an observation (observation, barrier, deviation, result or question), timer-stamped if a timer runs.
  - The observation appears as its own small box beside the protocol, wired to that step's dot. Drag a box to move it; it moves with the protocol box. Click it for its actions, or Ctrl+click to open where it was recorded.
  - On the protocol note, each step shows a white circle with its lifetime observation count. Hover it for the list, which stays open while the cursor is on it.
  - Steps change only on the protocol note. Changing a step that runs already used logs an iteration (edit, split or added step). You can connect an iteration to anything: what is already tied to that step is listed first, then everything else in the app (structures, components, notes). Hover the iteration dot to add more connections. A magenta dot beside the count shows the iterations: before and after, plus what prompted it.
  - Runs keep the wording they ran with and flag "revised since".
  - A protocol kept in its note can still be run: it has the same timer widget, step checks and observation dots. "Run again" starts a fresh run and keeps the last one on record. It can also be run in other notes (it appears in the protocol picker as "kept in its note").
  - **Temporary steps.** In a run, "+ temporary step" (or a step's ⋯ → "Add a temporary step after") adds a step that lives only in that experiment note; it is marked "temp". ⋯ → "Skip this step in this run" leaves a protocol step out of this run only. Temporary steps can be timed and observed like any other.
  - At the end of the run (from the summary, the "Update the protocol…" button, or the ⋯ menu), choose which temporary steps to add to the protocol (wording and position) and which skipped steps to retire. Give a reason and the connections (this run and the temporary steps' observations are ticked; add anything else). Each change is logged as an iteration with that reason; observations on a temporary step move with it into the protocol. Unticked changes stay in the note.
- **Live views.** "+ Insert → Live view…" puts a query into a note. A view is `{predicate, layout, columns, formulas}` and updates as notes change.
  - Sources: structures (barriers, claims…), components (with their header fields as `f.<key>`), notes, timed sessions, aim milestones, datasets, materials and day entries.
  - Conditions: is, is not, contains, >, <, empty, within N days, older than N days, this week, plus any formula. `$here.theme`, `$here.project` and `$today` make a view relative to the note it sits in ("open barriers in this theme").
  - Layouts: **Table** (sort, group), **Board** (drag a card between columns to change a status or a header field; derived fields can't be dragged), **Calendar** (month) and **Timeline** (week by week: session bars per note, ◆ aim milestones).
  - **Formulas** are columns written in a small language of our own (no `eval`): `+ - * / % ^`, comparisons, `and or not`, `cond ? a : b`, and functions such as `if`, `round`, `min`, `max`, `days`, `now`, `contains`, `lower`, `len`. Example: `round(minutes / 60, 1)`.
  - "Edit view…" changes everything; "Save as a reusable view" keeps it for other notes. Nine presets to start from.
- **Day notes and capture.** Ctrl+Shift+Space (or ✎ in the header, or the Capture box on Today) adds a timestamped entry to today's day note — one global note per date — optionally as an observation, idea, question, barrier, reminder or result.
  - The day note's header is a calendar surface for that date: time recorded, notes touched, open time entries, chores and the resurfaced item.
  - **Filing never moves an entry.** ⋯ → "File to a component…" creates a new structure on the target that points back to the day entry (📅 chip on both). "Assign to a theme…" tags it.
  - The weekly review lists the week's day entries with a theme selector, File… and Leave.
- **Recurring chores** (Settings → Labs → Recurring chores): every N days or on chosen weekdays. They show on Today, on the day note and in the review as due/overdue/done — a reminder, not a task manager.
- **Resurfacing.** Each day Today shows one claim or question older than two weeks, least recently seen first: "Still holds", "Explore lane" (flags it for the review), "Answered"/"Contest", or "Another".
- **Command palette and quick switcher.** Ctrl+P runs any command (go to a tab, new note, capture, insert, toggle theme…); Ctrl+O jumps to any note by fuzzy name.
- **Spatial canvas (lab).** Settings → Labs → "Spatial canvas" turns on a Canvas tab; turn it off and it disappears (canvases are kept).
  - Cards are references, not copies: components, structures, library entries, datasets, plus groups. Their text is always current.
  - Drawing an edge from a card's port to another component makes a real connection (it shows in both notes); other edges stay on the canvas.
  - Rendering is virtualised (only cards in view are drawn; the corner shows "N of M cards drawn").
  - "JSON Canvas" exports to the open `.canvas` format (Obsidian and others).
- **Equation boxes.** "∑ Equation" (next to Calculator, top right of every note) writes a new equation or inserts a registered one. Beneath the equation is its legend: every term, with a name and a unit you fill in. Click the equation to edit it.
  - **Registry.** "Register…" names an equation so you can look it up from any note (by name, term or meaning). A registered equation is shared: editing it, or its legend, updates every note that uses it. ⋯ → "Unlink from the registry" keeps a private copy.
  - **Solving.** "🖩 Solve in calculator" (or dragging the box's ● onto a calculator) wires it in. The calculator then shows a field per term: type what you know and the empty ones are worked out. Wire two or more equations that share terms and it solves them together. "Rearrange for…" shows the equation solved for a term (and, when values are given, combined across equations); "+ box" adds that form to the note.
  - Enter puts the solved values into the calculator's lines; keep calculating from there, and type a solved term by name (`L*2`; Greek letters by name, e.g. `sigma_0`).
  - Equations are read from LaTeX by the app's own parser: fractions, powers, roots, subscripts, Greek, functions (sin…ln, log_b), |x|. Terms that appear once are rearranged exactly; otherwise the solver works numerically (Newton / Levenberg–Marquardt with a scan).
- **Equation editor selections.** Select part of an equation, then `_` makes it a subscript, `^` a superscript, `/` a numerator, `( [ { |` wrap it, Alt+R / Alt+N a root, Alt+B / H / V / D a bar, hat, vector or dot, Alt+T text.
- **Notes on PDF highlights.** In the reader, each highlight in the side panel has "Add a note…" (or click the highlight → Add a note…). The note becomes its own box on the paper's literature note, beside the highlight and wired to it ("comments on").
- **Terms stay put.** Typing right before or after a marked term no longer extends it.
- **Editing and deleting.** Everything stays editable. Old components and their structures can be changed in place ("Edit wording…" on a structure). Settings → Timing has "Lock wording once the day turns" for the strict record (off by default).
  - **Delete a component:** its ⋯ menu → "Delete component…", or select it and press Delete. The confirmation says what goes with it (its structures, connections, earlier wordings, pulled-in copies).
  - **Delete a note:** ✎ on its header box → "Delete note…", or ⋯ in the bottom bar. Links to it from other notes become open links, and its time entries go with it.
  - Ctrl+Z (outside a text box) undoes a deletion. With a notebook folder, a copy of the record is kept in `.scientia/kept` first.
- **Note details.** ✎ on the header box (or ⋯ → Note details…) edits the title, type, project, theme and date. Changing the date moves every component's stamp with it, unless you untick that.
- **Past experiments.** "+ Experiment" and "+ Note" take a date. Pick an earlier day and the note is dated then, every component in it is stamped on that day, and the next stage inherits the day. The header shows "past entry". Protocol runs entered for a past day don't start the timer.
- **Timestamps.** Click the time on any box to move it to any date and time; a date shows when it differs from the note's day. ⋯ → "Time entries…" lists the note's recorded time: change start and end, duration and day, or delete an entry. "+ Time" defaults to the note's day.
- **Focus sessions.** ◎ next to the light/dark toggle asks how long (15 min – 2 h, or any number of minutes), then puts the app in full screen with the keyboard locked to it, a white frame around the screen and a countdown at the top. There is no way to end it early from the app.
  - A web page can't fully lock a computer: holding Esc, Alt+Tab or the Windows key still work. If full screen is left, the app covers itself with the countdown until you click "Return to full screen".
  - Exits are counted, and reloading or closing the tab asks first and resumes the session. When the time is up, a line ("Focus session — 50 min") goes into the day note.
- **Material sheets.** A material opens as one compact page, not a canvas.
  - **Kind:** cell line, antibody, gel batch, reagent, medium, plasmid, chemical, instrument or other. Each kind shows the fields that matter for it (gel: target and measured stiffness, acrylamide · bis, thickness, coating; cell line: passage, medium, thaw, mycoplasma; antibody: target, host, working dilution, conjugate…), plus concentration, storage location and amount left.
  - **Source:** "Made here" records when (Now button), who, the batch number (auto) and the amount made. "Bought" records supplier, catalogue no., lot, received and expiry.
  - **Ingredients:** name, amount, unit and lot rows; Enter moves along a row and adds the next. Typing the name of another material links it and fills in its lot. Below it, a Method box.
  - **Log:** one line per event (thawed, aliquoted, passaged…), timestamped and movable. "passaged" also bumps the passage.
  - **Used in** lists the notes and barriers. "Make another batch" / "Next passage" copies the recipe into a new batch made now, linked to the old one. "Notes canvas" opens the material's canvas for longer write-ups.
  - **On a note:** "+ Insert → Material…" places a material card: kind, lot, key fields, ingredients and a log line ("used 2 coverslips" is logged on the material with the note's name). The material is also listed on the note. "+ Insert → New material…" creates one and places it.
  - "+ New material" (Materials page, the palette, or "+ material" on a note) asks only for a name, a kind and made/bought. From a note, the new material is added to that note at once.
- **Reminders.** 🔔 in the header (a badge counts what's due in the next 24 h; red if anything is overdue) lists deadlines, meetings and reminders as Overdue / Today / Tomorrow / This week / Later.
  - Each has a time (deadlines can be all-day). Meetings also have an end and a place or attendees. Each can have an alert (none, at the time, minutes, hours or days before), a daily, weekly or monthly repeat, a project or theme, and a link to a note ("+ Insert → Deadline or meeting…" links it to the note you're in).
  - Alerts pop up in the app with Meeting note / Snooze 10 min / Done, and as a system notification when the app is in the background, if you allow it.
  - "Note" on a meeting opens or creates that meeting's note on its day. ✓ marks it done; a repeating one moves to its next time.
  - Reminders also show on Today ("Coming up", next 7 days), in the day note ("Due · meetings"), on the Reminders page (Ctrl+P → Reminders), in live views (source: Reminders, e.g. a calendar) and in the notebook as `Reminders.md`.
- **Quick chaining.** Drag a box's ● onto empty paper and two panels open side by side. On the left is the connection type (keys 1–9; Tab flips the direction). On the right is what to create there: a text component, or anything from + Insert (type to filter, ↑↓, Enter). It's made at the drop point, connected and ready to type. The last connection type you used is remembered.
- **Synthesis box.** What you type is saved as you type and shows again when you come back.
- **Writing in components.**
  - **Lists:** `*` or `-` then Space makes a • bullet; `1.` then Space a numbered line; `[ ]` then Space a ☐ checkbox (click it to tick ☑). Enter continues the list, Enter on an empty item ends it (or steps out one level), and Tab / Shift+Tab nest up to three levels: numbers go 1. → a. → i., ii., iii. and bullets • → ◦ → ▪. Numbers and letters renumber themselves. Text typed after a list marker always wraps inside the component.
  - **Several selections at once:** hold Ctrl while you select (drag or double-click), in one component or across several, and the earlier selections stay highlighted. Then Ctrl+B / Alt+I / Ctrl+U styles every piece, Ctrl+C copies them (one per line), Backspace or Delete removes them, Alt+W (Ctrl+W in Focus) marks them all as one term, and Ctrl+Enter or right-click opens a menu that also has "Link all to a note…". A click without Ctrl, typing, or Esc lets them go.
  - **Styles:** Ctrl+B bold (a true heavy weight), Alt+I italic (Ctrl+I stays "cite"), Ctrl+U underline. Press again on the same words to remove it. With nothing selected, the key switches the style on for what you type next; press it again, or type a colon, to stop (the colon itself stays plain). They are saved as marks, so they survive edits, and export to Markdown as `**bold**`, `*italic*`, `<u>underline</u>`.
  - **As you type:**
    - Arrows: `-->` →, `<--` ←, `<->` ↔, `=>` ⇒.
    - Science: `>=` ≥, `<=` ≤, `!=` ≠, `~=` ≈, `+-` ±, `37 deg` 37°, `5 uL` 5 µL, `3x4` 3×4.
    - Scripts: `^2` ², `^-1` ⁻¹, `CO_2` CO₂.
    - Typography: `--` –, `---` —, `...` …, and curly quotes.
    - Backspace right after a replacement puts back what you typed. Each group can be switched off in Settings → Writing.
- **Regions.** Right-click and drag on a note's paper to draw a region. The border follows the mouse and the components it will take are outlined. On release it snaps to them with a little room around.
  - A region carries an editable name (double-click it; you're asked right after drawing) and a colour (⋯ on its title). It moves as a group by dragging its title. Deleting it leaves the components where they are.
  - Members carry the border with them when dragged. Dropping another component inside a region adds it, and holding Alt while dragging a member takes it out. A component belongs to one region at a time.
  - A plain right-click still opens the menu.
  - **Terms see regions:** when a component holding a term is in a region, the term lens shows a dashed "same region" card under it, listing the region's other components as secondary sources. Term hover cards count them ("· 2 secondary sources via regions"), and the notebook's term pages list them under "Via regions".
- **List lines wrap under their own text.** Lists start indented from the component's left edge. A bullet or numbered item that runs onto a second line lines up with the item's text, not with the bullet, at every nesting level.
- **Today's timeline** lists everything written today in any note, not only components stamped today. Text entered in a note dated in the past is marked "entered for 1 Sep", and edits to older components "edited · from 26 Sep". Each appears at the time it was written.
- **Terms find themselves.** Once a term exists, every use of its wording in every note (all projects) is marked with it, just as if you had marked it by hand, so it shows in the lens with its structures.
  - Matching is by whole words, in any case, with plurals: "PAA gel" finds "PAA gels" and "paa gel", but not "PAA gelatin".
  - Marking a new term looks through all notes at once and tells you how many more uses it found.
  - New writing is checked when you leave a component, with a quiet sweep every minute, and "⟳ Rescan terms" on the Terms page goes over everything.
  - If you unmark a found term (Alt+click → Unmark here), that spot is remembered and never re-marked.
- **Image panels.** "+ Insert → Image panel…" offers a grid (1×1, 1×2, 1×3, 1×4, 2×1, 2×2, 2×3, 3×2, 3×3, 4×1 or custom), then the images, which fill the cells in order. Images in a row share one height and take the width their shape needs, so every cell is flush with its image while your rows × columns are kept.
  - Click an image to crop it: draw a rectangle of any shape (or Free / 1:1 / 4:3 / 3:4 / 16:9), move it and resize it by its edges. The row reflows to the new shape.
  - Drag an image onto another to swap them, or drop a file on a cell to put it there. The "2×2 ▾" button changes the grid and turns panel letters on or off.
  - Each image has a letter (A, B…), a caption and "+ label" to make it a structure (evidence, observation…). The structure's text is the caption.
  - ⋯ → "Label the whole panel as…" makes the whole figure a structure. The caption under the panel is ordinary text, with terms, links and structures.
- **Timers.** "⏱ Timer" sits at the top right of every note's canvas, beside Calculator, and counts time for that note. Click it again to pause or resume; while it runs it shows the elapsed time.
  - Every running or paused timer appears in a floating card at the bottom left of every page: the note (click to go there), the time, and buttons for ❚❚ pause / ▶ resume, ✓ complete (logs it), ↻ iterate and ✕ cancel (asks first, logs nothing).
  - Iterate logs the timer and starts the next one, numbered #2, #3…, in the same note. If you press it while in a different note, it asks whether the next timer should count here or stay in the timer's note; time so far stays with the first note.
  - **Head start:** ▾ beside ⏱ Timer → "Start with a head start…" (20 · 1h10 · 1:30 · 45s) counts from a moment that already passed; on a running timer, ＋ (its card or its box) adds one.
  - Several notes can each run their own timer (two at once, as before; overlap counts once). "–" collapses the card to a small pill.
  - **A timer is a temporary component.** Starting one puts a dashed timer box on the note's canvas, "awaiting a tag". Drag a wire from its ● to each component it timed (no question asked — the wire is "timed"); × on a tag removes it.
  - Completing it with one tag logs the time to that component. With several tags, you type each one's share (90 · 1h30 · 1:30); "Log split" unlocks when the shares add up. Once logged, the box goes away and each component shows its time the way manual time shows: the teal pill in its header (and "timed" in the provenance panel).
  - **Regions too.** Drag the timer's wire onto a region's name tab to tag the whole region (a dashed line joins them). The time belongs to the region as a whole: a teal pill on its name tab, not on each component. A region can be tagged alongside components or other regions, and is one row in the typed split.
  - A finished timer with no tag stays on the canvas until you tag it and press "Log". Iterate first asks which of the note's components the finished timer goes to (or leave it awaiting a tag), then starts the next.
- **Moving components to another note.** "Move to another note…" in a component's ⋯ or right-click menu picks the note from a searchable list; "Take other components along" ticks more to bring. A region's ⋯ menu has "Move region to another note…" (the region is re-made there). With notes side by side, hold **Alt** and drag a component by its header — or drag a region by its name tab — into the other pane; the pane lights up, and the boxes land where you drop them. (A plain or pen drag embeds the component there instead — see Linking below.)
  - It is as if they always belonged there: earlier versions, sub-steps, structures (they now originate in the new note), terms, marks, stamps and logged time all go along, numbered and named the new note's way. Nothing stays in the old note.
  - If connections join what moves to components that stay, you're asked first: ticked ones are kept as connections between the two notes, the rest are dropped.
  - Protocol definitions, runs and timers don't move.
- **Embedded components have a link circle.** Wire from an embedded (pulled-in) component like any other; the connection belongs to the embed in this note, not to the original.
- **Search and sort everywhere.** Every list that pulls notes, components or structures has a search box and a sort menu (best match, newest, oldest, A–Z, by note). This covers connecting, pulling in, links, mentions, citations, evidence sources, backlinks, protocol choice, and the observation, run and iteration lists you open by hovering.
- **Side by side.** Alt+click any link or connection to open its note in another pane: two side by side, a third splits the right column, a fourth makes a 2×2 grid (the magenta lines drag). Ctrl+click (⌘ on Mac) opens the note itself — in a split view, in the pane you clicked. Each side has open alone, swap and close.
- **Barriers travel.** Pull unresolved barriers, any structure, or any component into another note. Closed barriers aren't offered again but stay searchable where they appear.
- **Time.**
  - Two timers can run at once; their overlap counts once and is reported as multitask.
  - In a run, checking a step records its split. The last step stops the timer and shows the summary.
  - Untimed components are stamped at creation, adjustable ±12 h, and any component can carry a manual duration.
  - Also covered: open entries, the 4 h cap with recovery, the idle prompt, overlap warnings, midnight splitting, and unmeasured (not empty) days.
- **Weekly review.**
  - Opens on the weekend for the past 7 days (Sat→Fri) and stays open until you complete it. Nothing is ever auto-graded.
  - Starts with everything to address, then: decide (flags resolved with a note or component, or kept), what moved (raw counts by kind, theme and term; planned vs measured), rate (impact plus aim boost and return; the last eight weeks; gaps rather than zeros), friction, signal, and the bet.
  - The bet is blocks per theme across Continue, Unblock and Explore lanes, plus slack, a WIP limit, one long block per theme and the circuit breaker.
  - A cycle review comes up every ~6 weeks. Completing a review writes a `review` note whose synthesis is next week's plan.
- **Search.**
  - Ranks by relevance (links), recency or keyword, and shows each hit's connections.
  - Earlier versions open in a separate panel beside the results, and searches can be saved as views.
- **Library.** DOI lookup (CSL-JSON, cached forever), or paste BibTeX/RIS/CSL offline. Sigils by default; you can upload a logo per journal. Citation display is title, author–year or numbered, set per note.
- **Durability.**
  - The export is schema-driven, enumerating stores from the database itself, with a round-trip test.
  - Import checks per-store counts.
  - Snapshots can be written to a folder (File System Access API).
  - The journal gives undo (Ctrl+Z) and "view as it stood on…".
- **Read-only HTML exports** cover one note, one theme or one term chain.
- **Note types are data** (Settings → Note types). Templates are set per type: tick to use; several ticked means you choose when creating a note.
