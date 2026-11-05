# Scientia In Situ — working on this repository

Gabe's notebook app, standalone: the app as it stood in the McGhee Lab's repository on 5 Nov 2026 (`scientia/`, through
V3.958), without the lab layer. README.md says what was left out and what was kept from the lab; MANUAL.md is how it is used.

## Build and run

```bash
python build.py             # src/ + vendor/ + fonts.css → scientia.html; vendor/board/lab-board.html + board/ → board.html
python serve.py             # or launch.bat: http://localhost:8766/scientia.html (SIS_PORT, SIS_CONFIG, SIS_NOBROWSER for tests)
node tests/doi-lookup.test.mjs
```

`scientia.html` and `board.html` are build outputs (git-ignored). **Edit `src/` (and `board/`), never a built file.**
`build.py` refuses to write the app when `node --check` fails on the joined JavaScript.

## What lives where

| Path | What it is |
|---|---|
| `src/*.js`, `src/*.css`, `src/shell.html` | the app, joined in filename order into one classic script: top-level `const`s are the app's globals (`App`, `DB`, `M`, `IX`, `LIB`, `INK`, `SYNC`…); a later file extends an earlier one by wrapping its functions |
| `serve.py`, `sisync.py` | the desktop server: the notebook folder is the record; phones and tablets pair with this computer and sync through it |
| `hwread.py`, `winink.py`, `sttread.py`, `slides.py` | handwriting, Windows ink recognition, Whisper transcription, PowerPoint → images (all on this computer) |
| `board/` | the app's side of the whiteboard: `store.js` (a small Firestore stand-in; the board lives in the note), `pen.js` (the notebook's pen on the board), `board.css` |
| `vendor/board/lab-board.html` | the McGhee Lab's board page with its engine inlined, unchanged, vendored on 5 Nov 2026; three placeholders take `board/` |
| `vendor/rm/` | the lab's recorder and speech-to-text scripts the board loads; `serve.py` serves exactly these three under `/rm/js/` |
| `vendor/page-layout.js`, `vendor/page-regions.js` | the lab's figure and equation finders on a PDF page (copies) |
| `vendor/wb-ink.js` | the whiteboard's stroke outline the notes' pen writes with (generated from the lab's `whiteboard.js`; a copy) |
| `pen-button/` | the Slim Pen tail-button helper: `Build ScientiaPen.cmd` builds `ScientiaPen.exe` on each computer |

## Rules that are easy to break

- **The port is fixed (8766).** Browser storage belongs to the origin; another port is another, empty database.
- **No lab layer.** Nothing here calls the McGhee Lab's site, hub or RM; the only outbound request the app makes is the
  DOI lookup to doi.org, when asked. Keep it that way: a feature that needs a server runs on `serve.py`.
- **Never commit notebook data** (`images/`, `recordings/`, `.scientia/`, `backup/`, `macros/`) or a pairing report.
- **A notebook synced with the lab before** still carries the lab's records (`rmpaper` blocks, `mwsteps`, `rm` projects,
  lab whiteboards): they open as they are; the app does not act on them.
