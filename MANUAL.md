# Scientia In Situ: user manual

This manual covers everything the notebook can do, from first launch to the pen and the weekly review. Each section stands on its own, so jump to what you need. The [shortcut card](#24-shortcut-card) at the end gathers every key.

**Contents**

1. [Getting started](#1-getting-started)
2. [How the notebook is organised](#2-how-the-notebook-is-organised)
3. [Finding your way: the header and tabs](#3-finding-your-way-the-header-and-tabs)
4. [Notes and the paper](#4-notes-and-the-paper)
5. [Writing in a component](#5-writing-in-a-component)
6. [Structures: claims, evidence, barriers…](#6-structures-claims-evidence-barriers)
7. [Terms and the term lens](#7-terms-and-the-term-lens)
8. [Connections, regions and linking](#8-connections-regions-and-linking)
9. [Experiments, protocols and runs](#9-experiments-protocols-and-runs)
10. [+ Insert: everything that can go in a note](#10-insert-everything-that-can-go-in-a-note)
11. [Time: timers, time entries, focus sessions](#11-time-timers-time-entries-focus-sessions)
12. [Today, day notes and capture](#12-today-day-notes-and-capture)
13. [Tasks and reminders](#13-tasks-and-reminders)
14. [Library, papers and the reader](#14-library-papers-and-the-reader)
15. [Data, materials and provenance](#15-data-materials-and-provenance)
16. [Live views and the spatial canvas](#16-live-views-and-the-spatial-canvas)
17. [Pen, touch and handwriting](#17-pen-touch-and-handwriting)
18. [Recordings](#18-recordings)
19. [Weekly review and Activity](#19-weekly-review-and-activity)
20. [Search, palette and side-by-side](#20-search-palette-and-side-by-side)
21. [Phones and tablets (sync)](#21-phones-and-tablets-sync)
22. [Your data: notebook folder, backups, exports](#22-your-data-notebook-folder-backups-exports)
23. [Settings](#23-settings)
24. [Shortcut card](#24-shortcut-card)
25. [Troubleshooting](#25-troubleshooting)

---

## 1. Getting started

1. **Start it.** Double-click `launch.bat`. Your browser opens `http://localhost:8766/scientia.html`.
   - Use Chrome or Edge.
   - Never change the port: the browser keeps your data per address.
2. **Choose your notebook folder** in **Settings → Notebook folder → Browse… → Connect**. Pick an empty folder, or one you already use with Obsidian.
   - Everything you make is saved there a few seconds after each change.
   - Today shows a banner until a folder is chosen.
3. **Try the demo** (optional). The demo is a Traction Force–ELISA project.
   - **Settings → Import** loads an exported record.
   - **Settings → Start empty** clears the browser.
4. **Updating the app** never touches your data. Replace `scientia.html` or the whole app folder. To check which build you're running, hover the **SiS** logo.
5. **Reload** with ⟳ in the header, or with Ctrl+R / F5.

> **Moving from the old hub (port 8765):** in the old hub, use Settings → Export everything (JSON). Then in this app, use Settings → Import… and pick that file.

---

## 2. How the notebook is organised

| Level | What it is |
|---|---|
| **Project** | A fundable, publishable whole (e.g. "Traction Force–ELISA"). |
| **Theme** | A line of attack inside a project. **Aims** sit on themes, with weighted milestones. |
| **Note** | One session of work. A note has a **type**, such as Planning, Experiment (Run), Analysis, Reflection, Meeting, Reading, Resource (material), Day or Review. Types are editable in Settings. |
| **Component** | A box on a note's paper: text, a widget, ink… Everything you write is a component. |
| **Structure** | A marked phrase inside a component with a *kind*: claim, evidence, barrier… (§6). |
| **Term** | A word or phrase you track across all notes (§7). |
| **Connection** | A directed, typed wire between two components (§8). |

- A note belongs to one project and one theme. It can also be **General** (no project): use + Note → Project: *No project (general)*. General notes sit at the top of the Portfolio, and their header lists the projects they touch.
- To move a note, use ⋯ → **Project & theme…**.

---

## 3. Finding your way: the header and tabs

**Tabs** (keys 1–7 when you're not in a note):

| Tab | What it shows |
|---|---|
| **Today** | The day's timeline, the Capture box, what's coming up, chores, a resurfaced claim or question. |
| **Tasks** | Every open task: Overdue / Today / Upcoming / No date, plus Done lately. |
| **Portfolio** | The map of projects → themes → notes, plus General notes. Each project has its own page, with its tasks. |
| **Review** | The weekly review (it opens on the weekend). |
| **Activity** | Heatmap, theme small multiples, weekly numbers, the Done list. |
| **Terms** | Every term, with its forms and lens. |
| **Atlas** | The notebook as one map: notes, components, structures, terms, people and papers, and how they link. Search lives here. |
| **Library** | Papers and links. Open a paper's PDF in the reader. |
| **Data** | Raw-data folders and datasets. |
| **Materials** | Cell lines, antibodies, gels, reagents… |
| **Canvas** | Only shown when the spatial-canvas lab is on. |
| **Settings** | All settings (§23). |

**Header controls:**

| Control | What it does |
|---|---|
| ✎ | Capture: a quick note to today's day note (Ctrl+Shift+Space). |
| 🔔 | Reminders. The badge counts what's due in the next 24 h, red if something is overdue. |
| Sync dot | Green = in sync. Blue with a number = sending. Grey = computer unreachable. ⚠ = a conflict to resolve. |
| ◎ | Focus session (§11). |
| ☀/☾ | Light/dark theme. |
| ⟳ | Reload. |
| Red pill | A recording in progress; click it to go there. |

---

### The sync dot
A small dot in the header, left of Search, says how the notebook stands with the lab: green in step, amber while it works or waits, grey when this computer is not connected, red with one plain sentence when something failed. Click it for the details, Sync now, and Settings → The lab.

### Working together
When the lab carries it (the lab's part — the notebook asks and stays quiet until it is there), a row of small avatars left of the sync dot shows who else is in this note or on this project: filled while they work, grey after five minutes away, outlined when they are in another note. Hover for what they are editing; click to go there.

One person at a time in a component: whoever is writing in it (the caret in it, or a drag of it) holds it. To everyone else it is shaded in that person's colour and read-only, with "Alex is editing" and **Ask to take over**. Leave the component (click elsewhere, close the note) and it is free again. If someone took a component over while you were away from it, a note says so; what you wrote is kept and the lab merges the two.

### The Atlas
- **What it shows:** every note, component (with its kind), structure, term, person and paper under the lens, as dots sized by how connected they are; wires (with their relation), structures in a component, terms in the text, citations, note cards, pull-ins, @names and which note a component is in, as lines. Components with a kind keep the kind's colour.
- **The lens** (top left): the whole notebook, one project, or a lens of your own: **+ Lens**, name it, pick the notes. The chips show or hide each kind; **Days** adds the day notes and reviews.
- **Moving around:** drag to pan, wheel to zoom. **Hover** a dot and its neighbours stay lit while the rest fades. **Click** it: it is focused, its neighbours settle in a ring around it, and the side panel lists its edges (click one to walk there). **Double-click** opens it. **Shift+click** a second dot: the shortest path between the two lights up. The slider at the bottom replays the map growing by date.
- **Search lives here.** Ctrl+K (or `/find`) opens the Atlas with your words lit, for the note you came from; the box at the top filters as you type, Enter focuses the first match. The **Quick** chip (or Ctrl+Shift+K, `/quick`) is the list search as before. Settings → Atlas turns the Ctrl+K routing off if you prefer the list.
- **The action chips** say what a pick (double-click, or the button in the panel) does for the note you came from: **Open** · **Reference the note** (a note card there) · **Reference the component** / **Pull in** (a reference there) · **Connect** (a wire from the component you had selected to the one you pick).
- **A collection:** `/collection html image pdf` opens the Atlas with just the components of the types you name, across the whole notebook. Each type has its own colour and every dot is labelled.
  - The row above the map shows each type with how many there are. **×** takes one out, **+ Add** adds another, **Show everything** goes back to the whole notebook. The Notes chip brings back the notes that hold them.
  - The types: `html` (HTML pages), `pdf`, `image` (image panels), `snip` (clips from PDFs and pages), `whiteboard`, `table`, `plot`, `equation`, `slides`, `recording`, `ink`, `quote`, `text`, `protocol`, `run`, `task`, `material`, `plate`, `timer`, `calculator`, `view`, `notecard`, `pulled` (pulled-in components), and the component kinds: `hypothesis`, `question`, `verdict`, `method`, `meeting`, `feedback`, `story` and your own. A plural works too (`pdfs`, `images`).
  - Type `/collection` and a space in the navigation bar and every type is listed with its count: click one or Tab it in, keep adding, Enter runs it (see The navigation bar, §5).

## 4. Notes and the paper

### Making notes
- **+ Note** asks for type, project, theme, title and date. Pick an earlier date to enter a past experiment: everything is stamped on that day, and the note shows "past entry".
- **+ Experiment** creates an experiment's **Planning** note (§9).
- To jump to any note, press **Ctrl+O** (quick switcher).

### The paper
Every note is an infinite sheet of graph paper.
- **Pan:** drag the empty paper, scroll the wheel, or flick.
- **Zoom:** Ctrl+wheel, or pinch.
- **Write:** double-click the paper to start a component there.
- **Right-click** the paper for the menu: write here, Insert…, paste…
- **Right-click and drag** draws a region (§8).

A note has a **header box** (title, type, profile fields, tags, ✎ for note details), its **components**, and a **synthesis box**. The synthesis box is your summary; it saves as you type.

- **⋯ beside the note's title** (top of the window) is the note's menu: note details, **Log time…**, time entries, tidy layout, **citations** (Title · Author–year · [1]), time travel, export, delete…
- **The pills:** ＋ **Quick cast** at the bottom (where a bar used to be — Pull in…, Flag and the inserts you chose), ⊕ zoom, ✦ tools, ✎ pan · pen · highlighter · lasso. Drag a pill anywhere. Left open 3 s, a pill unfolds into a row or column and stays; against the left or right edge it stands as a column, against the top or bottom it lies as a row. Your layout is kept with your notebook: the same in every note, every session, every computer.

### Components
- **Select:** click. Then click again, or press Enter, to type.
- **Move:** drag by the header. Boxes snap to 14 px and never overlap.
- **Resize:** drag the right edge or the corner grip — as large as you like, there is no limit. Image panels and slides keep their shape: drag their corner down and they grow both ways; PDFs, HTML pages and tables take any width and height.
- **Title:** each component has a title line. **Tab** or **Enter** in the title moves to the text.
- **Stamp:** each component shows its full date and time (e.g. 16 Oct 2026 14:32). Click the stamp to move it to any date and time.
- **⋯ menu:** edit, label as a structure, Data, materials & code…, Move to another note…, Delete component…
- **Delete:** select the component and press **Delete**, or use ⋯ → Delete component. It goes at once, with no question — Ctrl+Z brings it back (the note says what went with it).
- **Several at once:** **Ctrl+click** components (⌘ on a Mac) to select them together; Ctrl+click again takes one out. Drag any of them to move them all; Delete removes them all; the bar under them copies or duplicates. Esc lets go.
- **Undo:** **Ctrl+Z** outside a text box undoes deletions and other changes.
- **The hint line** at the bottom of a note has a ×: close it and it stays closed; ⋯ → **Shortcuts…** lists the keys instead. A note with more than a hundred components lets the browser skip the boxes far off screen, so it pans smoothly.
- **Tidy layout** (⋯ beside the title, or `/tidy`) lays the note out by its connections: each chain of wired components from its origin downwards, rows ordered so the wires cross as little as they can, neighbours far enough apart to read the arrow and its label, regions as pieces of their own. Then everything — the chains and the components with no connections alike — is packed into the smallest near-square area (a little wider than tall, like the window, so Fit gives the highest zoom), with room between the pieces to read and to move about. Ctrl+Z undoes it. **Flow in order** (⋯) is the old tidy: the boxes in order, two columns.
- **Folding moves the neighbours.** ▾ on a component (or a region's fold) brings what sits below it up by the height that went, and what sits to its right left by the width that went; unfolding pushes them back. A box you moved in between stays where you put it. Ink never moves.
- **The Portfolio's layout is yours:** where you put its cards, and which are folded, follows you to every computer.

### Editing the note itself
- **Note details** (✎ on the header box, or ⋯ → Note details…): title, type, project, theme, date. Changing the date moves every component's stamp with it, unless you untick that option.
- **Time entries…** (⋯) lists and edits the note's recorded time (§11).
- **Delete note…** (✎ or ⋯). Links to it from other notes become open links. Ctrl+Z restores the note.
- **◫ Split** (top right of the canvas): Side by side with another note, Quadrant (up to four), or back to one pane.

---

## 5. Writing in a component

**The editor bar.** While you write in a component, a bar sits just above its top border. It is never wider than the component (it wraps), and every button is the same size.
- **Bold · Italic · Underline**, the **three lists** (bullet, numbered, checkbox: the line, or every line you selected), **Make it…** (what the selected phrase is: a claim, a barrier, a question…), **∑ Symbols**, your quick-cast symbols, and a dotted **+**.
- A button lights up when the caret or the selection is already in that style or list.
- **+** adds more: **Link to a note**, **Citation**, **Term**, **Equation** (an equation here in the text, as an equation component: its terms can be wired and solved like an Equation box), **Existing structure**, **Strikethrough**. Settings → Writing → Editor bar offers the same.
- **∑ Symbols:** Greek letters, mathematics, science (°C, µ, superscripts…), arrows and typography. Click one to type it. **☆** makes it a favourite, shown first next time; the **bolt** on a favourite makes it a button of its own in the bar.

**Copy and paste.** Paste lands where the pointer last was on the canvas.
- **Text copied inside a component** remembers where it came from. Paste it on another note's canvas (click the paper, then Ctrl+V) and it is pulled in: a reference to that component. Paste it on the same note and it is a copy, with its structures, terms and styles.
- **Text copied from a PDF or an HTML page**, pasted on a canvas, becomes a quote wired to the file. Any other text pasted on a canvas becomes a new component.
- **Components:** select one (click it) or several (the lasso, or Ctrl+click), and press Ctrl+C with no text highlighted. Ctrl+V on another note pulls them in: a reference to each, placed as they sat relative to each other. On their own note they are copied, and **Ctrl+Shift+V** copies them anywhere.
- **From outside the notebook:** a picture (a screenshot, an image copied from a web page) becomes an image panel; several pictures at once make one panel. A PDF, an HTML file, a spreadsheet or a PowerPoint copied in the Explorer becomes that component, just as + Insert makes it.
  - Pictures pasted while you write in a component go under it.
  - A copy from Word or a web page brings a picture of itself along; its text is what gets pasted.
- **Inside a text**, paste is plain text, as before.

**/ and @ in a component.** Type `/` at the start of a word and a menu opens at the caret; keep typing to filter it, ↑ ↓ to choose, Enter runs, Esc leaves what you typed. The typed word goes.
- `/claim`, `/barrier`, `/question`, `/result`… make the sentence before the caret that structure. `/term` marks the word at the caret; `/link` links it to a note; `/cite` inserts a citation; `/mention` points the words at a structure recorded elsewhere; `/sym` opens the symbols; `/date` and `/time` type the day and the hour; `/connect` connects this component to one you pick.
- `/paper`, `/protocol`, `/material`, `/task`, `/figure`, `/pdf`… (every row of + Insert) insert below the component.
- Type `@` and the lab's members are listed (offline too, once seen); pick one and the name becomes a chip. A name that isn't a member is kept for next time. ⋯ → **People mentioned…** (or `/people`) lists who is named in the note and where. Nobody is notified.

### The navigation bar
A slim grey bar lies along the bottom of the window. It shows where you are (project › theme › note), what the last command said, and **←** to go back to the previous note (Alt+←; Alt+→ forward). It is nearly invisible until you click it, or press `/` on the canvas with no text focused and no component selected.
- Awake, it is a command line for the whole notebook: `/go <note>`, `/today`, `/day yesterday`, `/split <note>`, `/tab library`, `/read <paper>`, `/beside <component>`, `/find <text>`, `/collection html image pdf`, `/new experiment <title>`, `/rename`, `/move`, `/connect`, `/flag`, `/tidy`, `/fold all`, `/region`, `/timer start`, `/pen` `/hl` `/lasso` `/erase` `/pan`, `/zoom 50` `/zoom fit`, `/colour`, `/width`, `/sync`, `/settings`, `/macro`, `/close`, and every + Insert row. `?` or `/help` lists them all with their arguments.
- As you type, the commands are offered; Enter on one that takes arguments completes it and offers them (a note by its title, a component, a term…); Tab completes; Enter runs. ↑ ↓ recall what you ran before. Esc puts the bar back to sleep.
  - The list sits over the word you are typing, and the rest of the highlighted completion shows in grey after it. Tab takes it.
  - A command that takes several words, like `/collection html image pdf`, keeps its list open after each pick, without the ones already on the line. Click a row or Tab it in; Enter on the space after the last one runs the command.
- **Commands of your own** (Settings → Commands): a slash that inserts a row, runs a built-in with preset arguments (`/half` → `/zoom 50`), or runs a **macro** — steps behind one slash, from a `.sis-macro.json` file you import there (on the desktop, files in the notebook folder's `macros/` are listed). The `scientia-macro` skill writes such files; `python scripts/scientia_macro.py list` prints every command, `check <file>` says what is wrong with a macro.

| To get | Type |
|---|---|
| • bullet | `*` or `-` then Space |
| 1. numbered line | `1.` then Space |
| ☐ checkbox | `[ ]` then Space (click the box to tick it) |
| Nest / un-nest | Tab / Shift+Tab (three levels: 1. → a. → i.; • → ◦ → ▪) |
| End a list | Enter on an empty item |
| **Bold** / *italic* / underline | Ctrl+B / **Alt+I** / Ctrl+U (Ctrl+I is *cite*) |
| Style for what you type next | Press the style key with nothing selected. Press it again, or type `:`, to stop. |
| New line inside a list item | Shift+Enter |

**Auto-replace as you type.** Backspace right after a replacement puts back what you typed. Each group can be switched off in Settings → Writing.

| Group | Examples |
|---|---|
| Arrows | `-->` →, `<--` ←, `<->` ↔, `=>` ⇒ |
| Science | `>=` ≥, `<=` ≤, `!=` ≠, `~=` ≈, `+-` ±, `37 deg` 37°, `5 uL` 5 µL, `3x4` 3×4 |
| Scripts | `^2` ², `^-1` ⁻¹, `CO_2` CO₂ |
| Typography | `--` –, `---` —, `...` …, curly quotes |

**Equations.** Type `$…$` for an inline equation, or `$$…$$` (or `\(…\)` / `\[…\]`) for a display one.
- The equation is typeset when you close it. "$5 and $10" stays text.
- Click an equation to edit it in the editor: LaTeX alongside, an Inline/Display switch, an on-screen ⌨ keyboard, and **?** for shortcuts.
- **Wrapping a selection in the editor:** `_` subscript, `^` superscript, `/` fraction, `( [ { |` to wrap, Alt+R root, Alt+B/H/V/D bar/hat/vector/dot, Alt+T text.

**Several selections at once.** Hold **Ctrl** while you select (drag or double-click), in one component or across several. Then:
- Ctrl+B / Alt+I / Ctrl+U styles every piece;
- Ctrl+C copies them (one per line);
- Backspace removes them;
- Alt+W marks them all as one term;
- Ctrl+Enter or right-click opens the menu, which includes "Link all to a note…".

Esc, or a click without Ctrl, lets them go.

**Citations and links.**
- **Ctrl+I** cites from the Library.
- **Ctrl+Enter → L** links the selection to a note or component. A link shows ↗, or ○ while the target isn't written yet.

---

## 6. Structures: claims, evidence, barriers…

Select text, press **Ctrl+Enter**, then a letter:

| Key | Kind | Key | Kind |
|---|---|---|---|
| c | Claim | t | Takeaway |
| e | Evidence | d | Decision |
| b | Barrier | q | Question |
| r | Resolution | i | Idea |
| s | Result | v | Deviation |
| o | Observation | m | **Reminder** |

The same strip has three more keys: `/` reuses an existing structure, **W** marks a term, and **L** makes a link.

- **Claims and evidence** are project records. They have a canonical wording and a stance, and evidence asks for its source.
- **Barriers and questions** stay open until resolved. They travel: **Pull in** offers them in other notes, and the review asks about them.
- **Reminder (m):**
  - flags its component for the next weekly review;
  - puts a 🔔 badge on every component connected to it, in any note;
  - click the badge to read the reminder, go to it, or mark it **Done ✓**.
- **Colours** and the *text colour vs highlight* style per kind are set in **Settings → Structures** (RGB picker).
- **Edit wording…** (click a structure) changes it in place. If **Settings → Timing → Lock wording once the day turns** is on, corrections become new records that point at the old one.
- **Lineage:** revise, split and merge keep the old wording greyed inside the new component.

---

## 7. Terms and the term lens

- **Mark a term:** select it and press **Alt+W**. In Focus mode (Ctrl+.), Ctrl+W works too.
  - Terms render bold and outlined.
  - Each term joins its project's term list; terms can be imported between projects.
- **Terms find themselves.** Once a term exists, every use of it in every note is marked automatically.
  - Matching is by whole words, any case, plurals included.
  - New writing is checked when you leave a component.
  - **⟳ Rescan terms** on the Terms page goes over everything.
  - **Unmark here** (Alt+click the term) stops the automatic mark at that spot for good.
- **Other forms.** Use **+ form** on the Terms page, or the lens → Other forms, to add other ways of writing a term. For example, *AiEW* and *AEW* for *apoptotic-induced ERK wave*.
  - Forms with capitals match only with those capitals, plus an optional plural s.
  - Other forms match any case.
  - Hovering a mark shows which form was written.
- **The term lens** (click a term) shows every component that uses it, as full boxes:
  - lanes by theme or note, columns by day;
  - three scales: project, theme, experiment;
  - inferred chains: claim → barrier → resolution → result;
  - terms that share a box are pulled in, in their own colours (toggle them in the side panel);
  - click a box's header to open that note.
- A component inside a **region** gives its term "secondary sources": the region's other components, shown as a dashed card.

---

## 8. Connections, regions and linking

### Connections
- **Make one:** drag a component's **●** onto another component, then choose the relation:
  - **follows · leads to · caused · resolves · supports · contradicts · comments on · needs · related**;
  - or type your own words (e.g. "calibrates") and press Enter.
- **Each relation has its own colour.** Wires route around boxes. Where a wire must cross a box, it's drawn faintly over it, lifted, so the text stays readable.
- **Click a wire** to change its type, reverse it, or delete it.
- **Quick chaining:** drop the ● on **empty paper**. Two panels open:
  - **left:** the relation (keys 1–9; Tab flips the direction);
  - **right:** what to create there (a text component or anything in + Insert).
  It's made at the drop point, connected, and ready to type.

### Regions
- **Right-click and drag** on the paper to draw a region. It snaps around the components inside; name it right away.
- **Move it** by dragging its title tab. Change its colour with ⋯ on the title.
- **Membership:** drop a component inside to add it; **Alt+drag** it out to remove it. A component belongs to one region at a time.
- **Deleting a region** keeps its components.

### Kinds of component
- **Double-click the small label** left of a component's title (it reads "Block") to make the component a **Hypothesis**, a **Question**, a **Verdict**, a **Method**, a **Meeting**, **Feedback** or a **Story** (or a kind of your own, Settings → Component kinds). Standard means no kind. The component keeps its shape and fill; its header takes the kind's colour and its label the kind's name.
- **A kind says the only ways it links.** Each way is a relation, what it is with, and which way round: a Hypothesis *fuels* a question; evidence (an observation, a result, an image panel, a paper…) *supports* or *contradicts* a hypothesis; a Method *tests* it; a Verdict *resolves* it; it *predicts* a result; it *refines* another hypothesis. A Question is fuelled by a hypothesis, *leads to* a hypothesis or a method, is *answered* by a verdict, evidence or a claim. A Method *tests*, *follows* a protocol, *needs* a material, *produces* a run or evidence. A Meeting *leads to* decisions, tasks, questions; Feedback *comments on* anything and *leads to* a task. Settings → Component kinds lists every way in words; so does the kind's menu.
- **A drop goes one of those ways or not at all.** Drag a wire between two components of which one has a kind: if there is one way, it connects at once (the toast says which); if there are several, the popover offers just those (1–9, Enter takes the first — the one you used last from that kind); if there is none, nothing is made and the toast says what the kind links to — give the other component a kind, or a structure (a question mark in its text makes it a question; an observation mark makes it evidence). A wire's label menu changes it only to another of their ways. Two standard components link as they always did, any way.
- **The drop on empty paper** from a kinded component lists the kind's ways on the left (→ it does, ← done to it); the new component becomes what the way names — *fuels* from a Hypothesis makes a Question.
- **Kinds sit on top of structures.** Drag a wire and drop it on a claim, an observation or a question *inside* a component: the wire ends on that structure, not on the whole component, and the structure's hover card says what ends there. So a hypothesis stems from this observation, not from the whole meeting note.
- **Your own kind** (Settings → Component kinds → + Kind): a name, then its ways one per line — `→ fuels: question` (it does) or `← supports: evidence, claim` (done to it); a relation word of your own is kept as it is.

### Stories
A **Story** is a kind of component for telling — a talk, a paper's thread, a lesson — one beat a component.
- **Complexity 1–10** in the beat's footer: how much the audience must hold at that point (1 light, 10 dense).
- **+ Whiteboard** in the footer makes a 1×1 image panel with the whiteboard already in it, right beneath the beat and wired to it (*illustrates*); click the panel to draw. Once it is there the button reads ✎ Whiteboard ↓ and opens it.
- **The ● dragged from a story onto empty paper makes the next beat** at once — a story component, wired with a bare arrow (no relation name), with the caret in it. Dropped on another component, the arrow is the one way a story links forward.
- **The arc** sits beside the first beat (a story no story leads into): complexity up, beats across (each at its number of links from the first), the line through the beats and the area beneath it — what you ask of the audience as the story goes: where it climbs, where it rests. Click a point to go to that beat. Tidy keeps room for it.

### Several at once
Select components with the lasso or Ctrl+click and their bar offers, besides Copy, Duplicate and Delete:
- **Region** around them · **Move to…** another note (a small note stays behind: "Moved to …", linked to them) · **Pull into…** another note (references there) · **Tidy ▾** (align left, stack, grid) · **Connect all…** to one component you pick, with one relation · **Make them…** all a claim, a barrier, a question… (each one, whole) · **Fold / Unfold**.
- **One drop wires them all:** drag a wire from the socket of any selected component onto another; the relation you choose makes a wire from every selected one.

### Linking by hand
- **The relation you used last comes first.** On a drop, the popover offers first (lit) the relation you last used from that kind of component; Enter with nothing typed takes it.
- **Pen dumbbell:** draw a line with a small circle at each end. The two ink components nearest the circles are connected, and you pick the type.
- **Across notes:** with notes side by side, drag a ● into the other pane.
  - Drop it on a component there to connect them.
  - Drop it on that note's empty paper to pick one of its components.
- **One image of a panel:** each image has its own ● at its bottom edge, so a wire can leave from that image only.
- **Embed into another note** (side by side):
  - Drag a component into the other pane, or press and hold a highlight with the pen and drag it.
  - It's embedded **live**: it follows the original. Dropped onto a component, the two are also connected.
  - Embedded widgets (image panels, plates, PDFs…) show the real thing, with "embedded from <note>".
  - Hold **Alt** while dragging to **move** the component instead of embedding it.
- **A note inside a note:** **+ Insert → A note…** places a card with the note's title, location and synthesis. You can highlight one of its components on the card.

### Moving components to another note
⋯ → **Move to another note…** picks the destination. "Take other components along" moves several at once; a region's ⋯ moves the whole region.
- Everything goes along: earlier versions, structures, terms, stamps and logged time.
- Connections to components that stay behind are asked about one by one: keep each as a cross-note connection, or drop it.
- Protocols, runs and timers can't be moved.

---

## 9. Experiments, protocols and runs

### Experiment stages
**+ Experiment** asks for a project, theme, name and date, then creates the **Planning** note.
- **Next: Run** (bottom right of the canvas) creates the next stage: **Planning → Run → Analysis → Reflection**.
  - Once a stage exists, the button reads **Open …** instead.
  - Ctrl+click opens the stage beside the current note.
- The note's header shows the stage strip; click a stage to go there.
- **Run a protocol** (at creation) lays that protocol out in the Run note.
- **Iterate:** Next from a finished Reflection, or the ▾ menu, makes "…, run N", linked to its parent.

### Protocols
A protocol is one box, with its steps on a rail.
- **Drafts:** a new protocol is a draft with a pulsing yellow light.
  - Click the light to **register** it under a project and theme. That creates a protocol note and leaves a run in its place.
  - **Keep it in this note** leaves it local but still runnable and searchable.
- **Editing steps:**
  - Steps change only on the protocol note.
  - Changing a step that runs already used logs an **iteration** (edit, split or add), and you're asked what prompted it.
  - A magenta dot shows the history; runs keep their old wording and show "revised since".
- **The protocol note:** each step shows a white circle with its lifetime count of observations. Hover it for the list.

### Runs
- **Run timer widget:** ▶ start. The current step is highlighted with a green ✓; click ✓ to complete it, and its time is recorded. There are pause, stop and a progress bar.
- **Observations:** the dot on a step's right border adds an observation, barrier, deviation, result or question. It appears as a small box beside the protocol, timer-stamped.
- **Temporary steps:** **+ temporary step** adds a step for this run only. ⋯ → **Skip this step in this run** leaves a step out.
- **Update the protocol…** (end of the run): choose which temporary steps to add (wording and position) and which skipped steps to retire. Give a reason and the connections; each change is logged as an iteration.
- **Run again** starts a fresh run of a local protocol and keeps the last one on record.

---

## 10. + Insert: everything that can go in a note

The list puts the rows made for this note's type first, then the ones you inserted last, then the rest.

Open it with the ＋ **Quick cast** → **⋯** (everything that can go in this note), or right-click the paper → **Insert…**, which places the item at that spot. The bolt on a row puts it in your Quick cast.

| Insert | What you get |
|---|---|
| **Component** | A text box. |
| **Well plate** | 1 (single well/dish), 6, 12, 24, 48, 96 or 384 wells. **Colour mode** (colour + legend) or **Image mode** (images cropped to each well's circle). |
| **Well plate from the plan** | The Planning note's plates carried into the Run: colours and legend kept, notes and images fresh. |
| **Protocol / Run a protocol** | §9. |
| **Image panel…** | A grid of images (1×1 … 4×1 or custom). Rows share one height. |
| **Calculator** | Also via the **Calculator** button at the top right of every canvas. |
| **Equation** | Also via **∑ Equation**. An equation box with a legend of its terms. |
| **HTML file…** | An exported plot, report or page, sandboxed. |
| **PDF…** | Pages drawn by the app; text is selectable and searchable. |
| **Slides (PowerPoint)…** | One picture per slide, with speaker notes. Needs PowerPoint on Windows. |
| **Recording** | Microphone + transcript (§18). |
| **Task** | §13. |
| **Deadline or meeting…** | A reminder linked to this note. |
| **Live view…** | A live query (§16). |
| **Material… / New material…** | A material card (§15). |
| **A note…** | A note card (§8). |
| **Pull in…** | Unresolved barriers, any structure or any component from elsewhere. |

### Working with plates
- **Select wells:** drag across them, click a row or column header, Shift+click one well, or Shift+drag to add a range.
- **Fill the selection:** pick a colour, write a note, or add images/videos to every selected well at once.
- **Well notes** hang outside the wells. "Notes on hover" hides them until you hover.
- **Open a well** (click it) to see the full image or video, its notes and colour, and a minimap of the plate (arrow keys move between wells).
- **Timelapse:** several images in one well play as a timelapse. Hovering the plate plays its videos and timelapses.

### Image panels
- **Crop:** click an image. Draw any rectangle, or use Free / 1:1 / 4:3 / 3:4 / 16:9. ← ↑ → ↓ go to the other images, keeping each crop.
- **Rearrange:** drag an image onto another to swap them, or drop a file on a cell.
- **Grid:** the **2×2 ▾** button changes the grid and turns letters on or off.
- **Labels:** each image has a letter, a caption and **+ label** (make it a structure). ⋯ → **Label the whole panel as…** does the same for the whole panel.
- **⤢** maximises the panel. Resize it from the corner grip.

### Calculator
- **Typing:** it reads the keyboard. ← → move, ↑ ↓ recall earlier lines, Esc clears.
- **Enter** files the line. The next line starts with `ans`; type an operator to continue, or a number to start fresh.
- **Click an earlier line** to change it; every later line that uses `ans` is worked out again. **= result** inserts that value.
- **Tabs:**
  - Scientific;
  - Functions (inverse/hyperbolic trig, log base, nCr…);
  - Constants (N_A, k_B, R, F, c, h…);
  - Stats & lab: `mean`, `sd`, `sem`, `cv`, `dilute(C1,V1,C2)`, `molar(g, MW, L)`.
- **DEG/RAD** switch.

### Equations
- **Legend:** each term gets a name and unit.
- **Register…** shares the equation everywhere: edit it once and every note updates. **Unlink from the registry** keeps a private copy.
- **🖩 Solve in calculator** (or wire the equation to a calculator):
  - type the values you know and the rest are solved;
  - wire several equations that share terms to solve them as a system;
  - **Rearrange for…** shows the equation solved for one term.

### PDF and HTML pages
- **Viewing:**
  - PDF: **Pages** scrolls through them; **One at a time** pages with ‹ › (or ← →).
  - ⤢ maximise, ↗ open in a new tab, Replace, and resize from the corner.
- **Quoting:**
  - **Select text** in a PDF or HTML page (mouse or pen) and pick from the menu: a **structure** (letter keys), a plain highlight colour, **❝ Quote here**, or **Connect to…**.
  - A quote becomes a component beside the file with "❝ from file, p. N"; click that line to scroll back to the passage.
  - **Ctrl+Enter** on a selection quotes it and asks for its kind.
- **Maximised** (⤢ / ⛶), a PDF or HTML page works like a paper in the reader:
  - a side panel lists its highlights, with notes and search;
  - the pen highlights whole words.
- **Writing on an HTML page:** in pen mode (the ✎ pill on pen or highlighter) the pen writes on the page itself — on the paper, maximised and beside the note; the eraser (or the pen's back) takes strokes away. The ink stays with the page, pinned to what it was written on. In pan mode the pen selects text for quotes, as before.
  - While the pen writes, a finger scrolls the page. A palm resting on it does nothing.
  - **The ✎ pill comes with the page.** When an HTML page fills the window (maximised, or beside the note at full screen), the note's ✎ pill sits over the page, inside it. Switch to **Move** to scroll and select text, or back to **Pen** to write, without leaving the page.
- **Reading an HTML page beside the note:** the book on the page's card (next to ⛶), or **◧ Beside** on the maximised page, puts the page in half the window and the note in the other half, as for a PDF.
  - Its bar has **✎ Note**, **Export ink labels**, **Highlights**, ⇄ (the other side), ⤢ (full screen) and **Close**.
  - The card in the note says "Reading beside the note" until you close it. Leave the note and it closes; come back and it is there again.
  - **Export ink labels** (the page's ⋯, or the maximised page's bar): ink written close together is one label. For each, you crop the part of the page around it; out comes an image panel of that crop with the ink on it, connected to the page ("cropped from"). The label leaves the page; Ctrl+Z undoes.
- **Snapping a figure, a table or an equation** out of a PDF or an HTML page:
  - Point at it: it is outlined, with **＋ Figure 2**, **＋ Table** or **＋ Equation 3** on it (on an HTML page, **＋ Figure · its title**). Click it and it becomes an image panel on top of the file, over the place it came from when the card shows it; drag it where you want it. Its label is the figure's title, its text the caption, and "from <file>" takes you back to it.
  - **The scissors:** on the PDF's bar; for an HTML page, on its card's tools, as **Snip** on the maximised page's bar, and in the bar when it is read beside the note. Every figure is outlined: click one, or drag a box round anything and choose **Picture** or **Equation**. Esc or the scissors again ends it.
  - On an HTML page a figure is a chart (SVG or canvas), a picture, a table or a `<figure>`, with its legend. Its heading becomes the label and its caption the text. A page that draws its charts with its own scripts (an exported report or plot) works once they are drawn. A display equation written with KaTeX goes into the equation editor as its own LaTeX.
  - An equation becomes an equation component, checked by you first. On the website it is read into LaTeX for you; on the desktop you type it against the snip.

### Slides
- **Browse:** ‹ › or ← → (with the mouse over the deck) go slide by slide. **Grid** shows them all.
- **Image panel…** makes a panel from the slides you tick.
- Slide text and speaker notes are searchable.

---

## 11. Time: timers, time entries, focus sessions

### Timers
- **⏱ Timer** (top right of a note's canvas) starts, pauses or resumes that note's timer.
- **Head start:** ▾ → **Start with a head start…** accepts `20`, `1h10`, `1:30` or `45s`. On a running timer, ＋ adds a head start.
- **The floating card** (bottom left, on every page) shows each running timer:
  - ❚❚ pause / ▶ resume;
  - ✓ complete;
  - ↻ iterate (log this timer and start #2, #3…);
  - ✕ cancel (logs nothing);
  - – collapses the card.
- **Two timers at once:** each note can run its own timer. Overlapping time is counted once and reported as multitask.

### What gets the time
- A running timer puts a **dashed timer box** on the canvas, "awaiting a tag".
- **Tag it** by dragging a wire from its ● to the components it timed, or to a **region's name tab**.
- **Complete it:**
  - with one tag, the time is logged to that component (a teal pill);
  - with several tags, type each one's share (`90`, `1h30`, `1:30`); **Log split** unlocks when the shares add up.

### Time entries
- **⋯ → Time entries…** edits a note's sessions: start, end, duration and day. You can also delete an entry.
- **⋯ (beside the note's title) → Log time…** adds manual time. Any component can carry a manual duration.
- The app also handles:
  - open entries;
  - a 4 h cap, with recovery;
  - an idle prompt;
  - splitting time at midnight;
  - days with no measurement, which show as gaps rather than zeros.

### Focus sessions (◎)
- **Start:** choose 15 min – 2 h (or any length). The app goes full screen with the keyboard locked to it, a white frame and a countdown.
- **No early exit:** a session can't be ended early from the app. If full screen is left, a cover asks you to return.
- **Logging:** exits are counted, and the session is logged in the day note when it ends.
- Ctrl+W marks terms while in Focus.

---

## 12. Today, day notes and capture

- **Today** shows:
  - the **timeline** of everything written today, in any note, including backdated entries and edits (marked "entered for…" / "edited · from…");
  - **Coming up** (next 7 days);
  - chores;
  - the **resurfaced** card.
- **The resurfaced card** is one claim or question older than two weeks. Answer it with Still holds / Explore lane / Answered / Contest / Another.
- **Capture** (✎, **Ctrl+Shift+Space**, or the Capture box) adds a timestamped entry to **today's day note**. You can give it a kind: observation, idea, question, barrier, reminder or result.
- **Day notes** (one per date) also show time recorded, notes touched, chores and what's due.
- **Filing never moves an entry.**
  - ⋯ → **File to a component…** creates a structure there that points back to the entry.
  - **Assign to a theme…** tags the entry with a theme.
- **Recurring chores** (Settings → Labs): every N days or on chosen weekdays. They're reminders, not tasks.

---

## 13. Tasks and reminders

### Tasks
- **Add one:** + Insert → **Task**, or **+ Add a task** on the Tasks tab or a project page.
- **What a task has:**
  - a tick box and text;
  - **⏰ due** (date, time or all day; quick Today / Tomorrow / Next week);
  - priority (▲ High / Normal / ▽ Low);
  - repeat (daily / weekly / monthly);
  - **+ subtask**.
- **Due time = reminder:** a dated task appears in 🔔 and alerts like any reminder.
- **Ticking a task done** logs it in three places: on the task (struck through, with the time), as "✓ Done: …" in that day's day note, and in **Activity → Done**. Untick it to reopen; the log entry is removed.
- **Repeating tasks** log each occurrence and move to their next time.

### Reminders (🔔)
- **Types:** deadline (can be all-day), meeting (end time + place/attendees), or reminder.
- **Options:** alert lead (none, at the time, or minutes/hours/days before), repeat, project or theme, linked note.
- **Alerts** pop up with **Meeting note / Snooze 10 min / Done**, and as system notifications when the app is in the background (if allowed).
- **Meeting note** opens or creates that meeting's note on its day.
- **Where reminders show:** the Reminders page (Ctrl+P → Reminders), Today, the day note, live views, and `Reminders.md` in your notebook folder.

---

## 14. Library, papers and the reader

### Adding references
- **DOI lookup** (cached), or paste **BibTeX / RIS / CSL-JSON** offline.
- Citation display (title, author–year or numbered) is set per note.
- **+ PDF** attaches a paper's PDF; **📄 Read** opens it in the reader.
- **Authors are terms.** Every author of a paper in the library becomes a term of its own kind (a person, with their papers), and their name is marked in your text like any term, so Terms shows where they come up.

### Highlighting
- **The reader's panel** has chips: **Mine** (this note's highlights), **RM** (the lab's, on a lab paper), **Notes** (the notes written under highlights). Switch any off to see the rest.
- **With the mouse:** select text, then pick a colour, or press Ctrl+B (or your structure key) and a letter to make it a claim, evidence, barrier…. The source (paper and page) is filled in.
- **With the pen,** the pen *is* a highlighter that takes whole words, from the first word touched to the last.
  - The highlight is saved in the last colour you used.
  - A small bar offers colours, **Make it…**, **Note** and **Undo**.
  - The back of the pen erases highlights.
- **Where highlights go:** each highlight is a component on the paper's **Reading:** note, anchored by quote and page. Its 📄 p. N chip reopens the reader at that page.
- **Notes on highlights:** **Add a note…** creates a component wired "comments on" to the highlight.
- **Evidence goes to** picks the project that new claims and evidence belong to.

### Searching papers
- **Ctrl+F** in the reader lists results in this order: highlights, then your notes and structures, then the paper's text. Each shows its page.
- **Enter / Shift+Enter** step through text matches.
- Searching a term also finds its other forms.
- **All papers** searches every PDF in the library.

### The lab's papers on the desktop
- **Read** on a lab paper (the paper card, one of its highlights, the card's ⋯ menu, a collection, or the paper's page in the Library) opens it in this app's reader, beside the note. On the website it opens in RM's reader instead.
  - The first time, the PDF comes from RM into a PDF card beside the paper card. It stays there: the next **Read** opens that card, and another note reuses the same file, so it works offline afterwards.
  - With no note open (the Library), the paper's **Reading:** note opens with the reader beside it.
- **Your highlights from RM** (and the lab's) are marked on the pages in RM's colours, underlined so they stand apart from your quotes. The reader's side panel lists them under **From RM**; click one to go there. A highlight clicked on the paper card opens the paper at that highlight.
- What you highlight in this reader is a quote in the note, as in any PDF. It stays in Scientia and does not go to RM.
- **Open in RM** still opens the paper's page on the lab site. So does **Read** when RM has no PDF of the paper yet, or the computer can't reach the lab; a message says why.

---

## 15. Data, materials and provenance

### Data (raw data by reference)
Your raw files stay where they are.
- **Add a folder:** **+ Add a data folder** points the app at a folder, such as the microscope's export folder. **Register files…** lists what's inside; tick what you want.
- **What each dataset records:**
  - its path, size and date;
  - its instrument, guessed from the extension (ND2, CZI, LIF…);
  - a fingerprint of its first and last 4 MB.
- **Checking files:**
  - **Rescan** checks for changes.
  - **Verify fingerprints** re-reads every file's ends.
  - Moved files are found again; changed files are flagged until you accept them.
  - After a restart, click Rescan once per folder to give the browser read access again.

### Materials
**+ New material** asks for a name, a kind and whether it was made here or bought. It opens as a compact **material sheet**:
- **Fields per kind:** cell line (passage, medium, mycoplasma…), antibody (target, host, dilution…), gel batch (stiffness, acrylamide:bis…), reagent, medium, plasmid, chemical, instrument.
- **Source:** made here (when, who, auto batch number) or bought (supplier, catalogue no., lot, expiry).
- **Ingredients** (typing another material's name links it and fills in its lot), and a **Method** box.
- **Log:** one line per event (thawed, aliquoted, passaged…). "passaged" bumps the passage number.
- **Used in** lists the notes and barriers that involve this material.
- **Make another batch / Next passage** copies the recipe into a new, linked record.
- **On a note:** + Insert → **Material…** places a card. "used 2 coverslips" typed on the card is logged on the material.
- **The Materials tab** groups materials by kind and lot, and marks a lot with twice its kind's rate of barriers as "clusters here".

### Provenance
- ⋯ → **Data, materials & code…** binds a component to datasets, materials, upstream components ("made from") and a code version.
- ⋯ → **Export provenance…** writes the chain (figure ← analysis ← dataset ← experiment step, with materials at each step) as read-only HTML.
- The **Terms** maps show what the wiring says about a term. (Notes no longer have a provenance panel.)

---

## 16. Live views and the spatial canvas

### Live views (+ Insert → Live view…)
A view is a saved query that updates as your notes change.
- **Sources:** structures, components (header fields as `f.<key>`), notes, sessions, aim milestones, datasets, materials, day entries, reminders.
- **Conditions:** is, is not, contains, > <, empty, within N days, older than N days, this week, or any formula.
  - `$here.theme`, `$here.project` and `$today` make a view relative to the note it sits in.
- **Layouts:**
  - **Table** (sort, group);
  - **Board** (drag cards to change a status or field);
  - **Calendar**;
  - **Timeline**.
- **Formulas** use a small built-in language: `+ - * / % ^`, comparisons, `and or not`, `c ? a : b`, `if round min max days now contains lower len`. Example: `round(minutes / 60, 1)`.
- **Edit view…** changes everything. **Save as a reusable view** keeps it for other notes. Nine presets are available to start from.

### Spatial canvas (Settings → Labs)
- A free board of **references**: components, structures, library entries, datasets, groups. Their text is always current.
- An edge drawn between two components is a real connection; other edges stay on the canvas.
- **JSON Canvas** exports the board for Obsidian.

---

## 17. Pen, touch and handwriting

### The hand, the pen and the view
- **Pen settings follow the hand.** Choosing Pen or Highlighter on the ✎ pill opens the pen settings (colours, widths, eraser, fill, pressure); Move, Zoom or Lasso closes them. With the pill expanded, the settings sit beside it.
- **Pen zooms in.** Switching to Pen or Highlighter goes to 200 % if the note was under it; leaving them comes back to 100 % (only if that switch changed it).
- **P** switches to Move (outside a text). `/pen`, `/hl`, `/lasso`, `/erase` and `/pan` do the rest.
- **The edge pans.** In Move, with the mouse or a hovering pen (not fingers). The note's edge is where it starts: a dashed line shows on it as the pointer comes near, and nothing moves until the pointer touches it. Touching it, the note pans slowly that way. Keep moving the mouse on past the edge and it goes faster and faster. Hold still and the speed holds. Move back at all and it stops at once. A band along the edge tints as the speed rises.
  - Past the top edge, the pointer goes on over the header, through the tabs and buttons, as long as it keeps moving up. Resting on a tab or a button, or sliding along them, stops the pan, so reaching for a tab moves the note only a little. The bottom edge works the same way over the faint navigation bar.
  - At the screen's edge the cursor itself stops, and a browser hears nothing more from it. The desktop app asks Windows how far the mouse itself keeps moving, so pushing on still speeds the pan up. The same goes past the bottom of the window onto the taskbar.
  - On the website, or with the pen, nothing past the screen's edge can be read. There the speed rises for as long as the pointer stays at the edge.
- **Zoom** reaches 1 % (⊕, Ctrl+scroll, `/zoom 1`); below 10 % the components show as flat tiles.
- **The pen's button** (desktop). The Slim Pen's tail button is a Windows setting (it opens OneNote by default). Settings → The pen's button shows the steps: Windows Settings → Pen & Windows Ink → Pen shortcut button → "Launch a classic app" → the app folder's `pen-button\ScientiaPen.exe` (the installer builds it; `pen-button\Build ScientiaPen.cmd` does if it is missing). Then one press switches to the pen, and a press in Pen goes to the other mode, what a double tap on ✎ does. The switch follows the press at once: the helper speaks to the app on this computer over one plain connection (it used to go through Windows' web client, whose first request after a start looked for a proxy for up to a minute), and the app's waiting request is woken by the press itself. If presses still lag, run `pen-button\Build ScientiaPen.cmd` once to rebuild the helper.
- **Esc** puts the navigation bar to sleep first, then closes a popover; dialogs, the maximised views and the reader's full screen answer their own Esc.

### Fingers (iPad, Surface, any touch screen)
- **Drag** pans the paper, even over components. **Pinch** zooms.
- **Tap** selects a component; tap its text to type. **Press and hold** (½ s) to drag a component.
- **Two-finger tap = undo; three-finger tap = redo.**
  - On Windows, first switch off Settings → Bluetooth & devices → Touch → "Three- and four-finger touch gestures".
- **Not your palm:** two or three fingers count (pinch, the taps) only when they are a clear gap apart, about 1.5 cm. A palm — a wide contact, contacts close together, or a hand on the glass while the pen is near or just lifted — pans, zooms, undoes nothing, and a pen coming near stops a finger pan. (Add `#touchlog` to the address to see each contact's size and the gaps.)

### The pen and the ink bar
- **The pen writes ink** the way the lab's whiteboard does: a smooth line through every point, its width easing with pressure, round ends. Strokes written close together gather into one **ink component**. It moves, connects, takes timers and labels like any component.
- **On a whiteboard** (an image panel's ✎ Whiteboard) the pen is the same pen: the ink bar sits under the whiteboard's title, and its colours, widths, ◧ fill, pressure, ↶ ↷, the back of the pen (it erases whole strokes there) and two- and three-finger taps all work on the board.
  - **The lasso** works there too: ◌ in the bar, or hold the pen's barrel button. Loop around ink and cards; drag inside to move, a corner to scale; the bar under it has Copy, Duplicate, ⇋ ⇵ flip, Pen ↔ Highlighter, ◧ Fill / Unfill, Delete. A colour or width from the ink bar restyles the selection. A barrel tap on it copies; a barrel tap elsewhere pastes. Ctrl+C / Ctrl+V, Delete, Esc.
  - Shapes and the ink library stay in notes; the board has its own cards and pan · zoom.
  - **In its image cell** a whiteboard is cropped to what is drawn, like a cropped image: the cell takes the drawing's shape. A click still opens the whole board. **Whole page** on the cell shows the full page instead.
- **In pen mode** nothing on the paper reacts to the pen hovering over it — no frames, grips or buttons appear. Switch the ✎ pill to pan (move) to see them.
- **In a component's text,** the iPad's Scribble turns handwriting straight into typed text.
- **Your palm is ignored** while the pen writes.
- **The ink bar** (top left; **✎ Pen** turns it on):

| Tool / control | Does |
|---|---|
| Pen / Highlighter | Draw. Highlighter strokes are translucent, so overlaps get darker. |
| Eraser | Touch strokes to remove them. |
| Lasso | Circle strokes and components to select them. |
| ◧ Fill | Tap inside a closed shape to fill it with the last pen or highlighter colour. A highlighter fill adds a layer each tap. |
| Colours | Separate palettes for the pen and the highlighter. **Press and hold** a colour to change it; **⊕** adds one. The first pen colour, *ink*, follows the theme. |
| Widths | Three. |
| ⇣ Pressure | Harder = thicker and darker. **⚙** sets sensitivity, thinnest/thickest line and fade, with a test strip. |
| ↶ ↷ | Undo / redo. |
| 🖱 | Lets the mouse draw. |

- **Shapes:** draw a stroke, then **hold the pen still** for ½ s. It becomes a line, arrow, x/y axes, rectangle, square, circle, ellipse, triangle or polygon.
  - Keep holding and drag: outwards grows and turns it, inwards shrinks it.
  - A closed highlighter shape becomes a filled area.
- **The back of the pen** (Surface Slim Pen) erases only what it passes over. Press harder for a wider eraser.
- **The barrel button** (hold it) makes the pen a **lasso**, whatever tool is on:
  - drag inside the selection to move it;
  - corner handles scale it, side handles stretch it, the round top handle rotates it (snaps every 15°);
  - the selection bar has Copy, Duplicate, ⇋ ⇵ flip, pen ↔ highlighter, ◧ Fill/Unfill, colours, **Convert to text**, **Connect… / Merge** (for two ink components), and Delete;
  - **paste:** hold the button and tap anywhere. Copied text becomes a new component, or goes into a component's text where you tap. Components copied from another note are pulled in.
- **No right-click menu** opens from the pen while the ink bar is on.

### Handwriting → text
- **Convert to text:** ⋯ on an ink component, or lasso some strokes → **Convert to text**. The ink becomes a text component in its place.
- **The ink is kept:** ⋯ → **Show the handwriting** / **Back to ink**.
- **How it's read:** by **Windows' own handwriting recognizer** on your computer. Cursive works, it's offline, and there's nothing to install. iPad ink is read by the computer too.
- **Settings → Handwriting** shows the recognizer and lets you pick a language. Add languages in Windows: Settings → Time & language → Language & region → ⋯ → Language options → Handwriting.

---

## 18. Recordings

- **Start:** **+ Insert → Recording** (on the phone: Capture → ● Record) starts the microphone. Allow it the first time.
- **While recording:**
  - **❚❚ Pause / ▶ Resume** keep one file;
  - **◆** (or **Alt+M** from anywhere) drops a bookmark;
  - **■ Stop** saves.
  - A red pill in the header shows the time while you're elsewhere in the app.
- **The file** goes to your notebook folder's `recordings/`. If the computer is unreachable, it waits on the device.
- **Transcript:**
  - Install once: **Settings → Recordings → Install the transcriber**. Whisper runs offline on your computer.
  - The transcript lands as ordinary text, one sentence per line, with times in the margin and a clock time every 30 s.
  - Click a time (or Alt+click a line) to play from there; the line being spoken is highlighted.
- **Playback:** ▶ / ❚❚, click the bar to jump. Bookmarks show as diamonds on the bar and as chips you can label.
- **⋯ menu:** **Transcribe again** or **Download the audio**. A failed recording has **Try again**.
- **iPad/phone:** the microphone needs the **https://** (Tailscale) address.

---

## 19. Weekly review and Activity

The review opens on the weekend for the past week (Sat→Fri) and stays open until you complete it. Nothing is graded automatically.

1. **To address:** open flags, reminders, barriers, day entries to file, chores.
2. **Decide:** resolve each flag with a note or component, or keep it.
3. **What moved:** counts by kind, theme and term; planned vs measured time.
4. **Rate:** impact, aim boost and return, over the last eight weeks.
5. **Friction and signal.**
6. **The bet:** blocks per theme across the Continue / Unblock / Explore lanes, plus slack, a WIP limit, one long block per theme, and the circuit breaker.

- Completing the review writes a **review note**; its synthesis is next week's plan.
- A **cycle review** comes up every ~6 weeks.
- **Activity** shows a heatmap, small multiples per theme, weekly numbers and the **Done** list.

---

## 20. Search, palette and side-by-side

- **Search:**
  - ranks by relevance (links), recency or keyword, and shows each hit's connections;
  - earlier versions open beside the results;
  - a search can be saved as a view.
- **Every picker** has search and a sort menu: best match, newest, oldest, A–Z, by note.
- **Ctrl+P:** the command palette, for any command.
- **Ctrl+O:** jump to any note.
- **Side by side:**
  - **Alt+click** a link or connection opens it in another pane. Up to four panes; drag the magenta lines to resize.
  - **Ctrl+click** opens it in place.
  - Each pane has open alone, swap and close.
- **Time travel:** "view as it stood on…" rebuilds a note from the change journal.

---

## 21. Phones and tablets (sync)

Your computer is the hub. Open **Settings → Devices** and follow the steps:

1. Install **Tailscale** on the computer and the device, signed in to the same account.
2. **Turn on Tailscale access.** This gives a private https address.
3. On the device, open the address (scan the QR code). **Install it first:**
   - iPhone/iPad: Safari → Share → **Add to Home Screen**, then open it from the Home Screen.
   - Android: Chrome → ⋮ → **Install app**.
4. Type the **pairing code** on the device, then **Approve** the device on the computer.

- **Syncing:** changes sync within a second or two.
- **Offline:** with the computer off, an installed device keeps working ("offline · N"). Its changes go to the computer when it's back.
- **Conflicts:** changes that can merge are merged automatically. When two devices changed the same field, **⚠** shows both versions; keep one.
- **⟳ Full sync** (Settings → Devices on a device) reloads everything from the computer.
- **The phone layout** has five screens:
  - **Today**;
  - **Search**;
  - **＋ Capture** (text with a kind, 📷 Photo, ● Record);
  - **Timers**;
  - **Reminders**.
- **Notes on the phone** open as a single column. ⋯ → **Use the full layout** switches to the canvas; tablets get it by default.
- **Remove** a device in Settings → Devices to stop it at once.
- **Done only on the computer:** importing, starting empty and switching notebooks.

---

## 22. Your data: notebook folder, backups, exports

- **Live saving:** everything is written to your notebook folder a few seconds after each change, along with daily copies (90 kept) and copies taken before anything destructive.
- **Obsidian mirror:** the folder holds one Markdown file per component, with terms and links as `[[wikilinks]]`, plus pages for Terms, Library, Days and Reminders.
  - The mirror is **one-way**: edit in the app; Obsidian edits are overwritten.
  - **Open in Obsidian** is in Settings.
- **Settings → Notebook folder:** Save now, Reload from notebook, Switch, and recent folders.
- **Exports:**
  - **Export everything (JSON):** the full record, with every store counted on import.
  - **Read-only HTML** of one note, one theme or one term chain.
  - **Provenance HTML.**
  - **JSON Canvas.**
- **Media:** images, PDFs, HTML pages and recordings live in `images/` and `recordings/` in the notebook folder. Keep them with the record.

---

## 23. Settings

| Section | What it holds |
|---|---|
| **Notebook folder** | Path, Browse, Connect/Switch, Save now, Reload from notebook, Open in Obsidian |
| **Devices** | Tailscale, pairing, paired devices, install, ⟳ Full sync |
| **Appearance** | Theme, citation display |
| **Structures** | Colour and text/highlight style per kind |
| **Writing** | Auto-replace groups on/off |
| **Timing** | Day lock (off by default), timer rules |
| **Keys** | Structure key and term key |
| **Note types** | Types as data: fields (with options), next stage, templates |
| **Handwriting** | Recognizer status and language |
| **Recordings** | Install/repair the transcriber |
| **Labs** | Spatial canvas, recurring chores |
| **Import / Export / Start empty** | Moving or resetting data |

---

## 24. Shortcut card

| Keys | Action |
|---|---|
| Ctrl+Enter, then a letter | Make a structure (c e b r s t d q i v o m) · `/` existing · W term · L link |
| Alt+W (Ctrl+W in Focus) | Mark a term |
| Ctrl+B / Alt+I / Ctrl+U | Bold / italic / underline |
| Ctrl+I | Cite |
| Ctrl+Z / Ctrl+Y | Undo / redo (outside a text box) |
| Ctrl+P | Command palette |
| Ctrl+O | Quick switcher |
| Ctrl+Shift+Space | Capture to today's day note |
| Ctrl+. | Focus mode (fullscreen + keyboard lock) |
| Ctrl+F (reader) | Search in the paper |
| Alt+M | Bookmark the recording |
| Alt+click | Open beside (side by side) |
| Alt+drag | Move a component to another pane, or drag it out of a region |
| Delete | Delete the selected component (asks first) |
| Ctrl+C (components selected, no text highlighted) | Copy them; Ctrl+V in another note pulls them in |
| Ctrl+Shift+V | Paste copied components as copies |
| Tab (in a title) | Go to the component's text |
| 1–7 | Switch tabs (outside notes) |
| ← → | Next or previous slide / PDF page / maximised image |
| 2-finger / 3-finger tap | Undo / redo |
| Pen held still | Snap to a shape |
| Pen barrel button | Lasso; tap = copy (on the selection) or paste |
| Pen eraser end | Partial erase |

---

## 25. Troubleshooting

| Problem | Fix |
|---|---|
| I don't see recent changes | Close any old server window and run `launch.bat` again (it frees port 8766). Hover the SiS logo to check the build. |
| The app is empty | Check the port is 8766. Settings → Notebook folder → Reload from notebook. |
| Phone can't connect | Check Tailscale is on, on both devices. Run `diagnose-pairing.bat` on the computer and read `pairing-report.txt`. |
| Device looks out of step | Settings → Devices → ⟳ Full sync. |
| Three-finger tap does nothing | Turn off Windows' three-finger gestures (§17). Open the app with `#touchlog` at the end of the address to see what the screen reports. |
| Transcription failed | Settings → Recordings → Repair, then **Try again** on the recording. |
| Convert to text finds nothing | Add a handwriting language in Windows (§17). |
| Slides won't import | PowerPoint must be installed on the Windows computer. |
| Data folder says "no access" | Click Rescan once to give the browser access again. |
| A region's tab is hidden | A component sits just above the region. Move the component or the region. |
