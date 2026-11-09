# Scientia In Situ — working on this repository

Gabe's notebook app, standalone: the McGhee Lab's `scientia/` without the lab layer, kept in step with it by
`sync/lab_sync.py` (`sync/state.json` says which lab commit). README.md says what was left out and what was kept from the
lab; MANUAL.md is how it is used.

## Kept in step with the lab

The app is written in the lab's repository (`McGheeLab/McGheeLabWebsite`, `scientia/`) and comes here by sync; only our own
files (`CLAUDE.md`, `.gitignore`, `.gitattributes`, `sync/`, and the lock below), the edits that take the lab out, and the
lock's hooks are made here.

```bash
python sync/lab_sync.py start --at <lab branch or commit>   # the lab's change since sync/state.json, as a three-way merge
python sync/lab_sync.py finish                              # no markers or lab files left; build, tests, the app starting headless
python sync/lab_sync.py push                                # this branch, and the cut on the `lab` branch
python sync/lab_sync.py scan --all                          # any line in the app that looks like the lab's
```

- A **cut** is the lab's `scientia/` at one commit minus its own files (`DROP`), with the build line marked `standalone ·`
  and the board page vendored. The `lab` branch holds one commit per cut; never merge it into `main`.
- A **conflict** (diff3: ours `|||||||` the old cut `=======` the new cut) is where the lab changed a line we had changed: take
  the lab's change and keep what we took out.
- Each **lab-looking line** the lab adds is listed (the `MARKERS`, and the names the dropped files define): take it out, or
  keep it when it is true here (`finish --ok` writes it to `sync/kept.txt`).
- A sync is one branch and one pull request. Gabe's `scientia-push` skill (`~/.claude/skills/`) runs both repositories' side.

## Build and run

```bash
python build.py             # src/ + vendor/ + fonts.css → scientia.html; vendor/board/lab-board.html + board/ → board.html
python serve.py             # or launch.bat (builds first, then serves): http://localhost:8766/scientia.html (SIS_PORT, SIS_CONFIG, SIS_NOBROWSER for tests)
node tests/doi-lookup.test.mjs
node tests/access.test.mjs  # the lock end to end, on a copy of the app in a temp folder (needs `cryptography`)
```

## The notebook's lock (ours alone)

Gabe asked for it in this repository only (6 Nov 2026): a locked notebook opens only for the people in its
`.scientia/access.json` (each their own username and password), and serve.py keeps `.scientia/`, `images/` and `recordings/`
encrypted, so a copied folder or app is no use without a password. **One administrator** (whoever locks it; Gabe, 9 Nov)
lets people in or out; everyone else only uses the notebook: every access-control call (`/api/access/*` but sign-in,
sign-out and one's own password; `ADMIN_ONLY` pairing/device routes; switching the folder) is refused (403) server-side. README.md → "Locking the notebook" is how it is used.

- `access.py` is the lock: the notebook key wrapped per person (scrypt) and under a recovery key; files sealed as 1 MiB
  AES-GCM chunks (`SiSLock1`), `ops.jsonl` line by line; sessions (`sis_ses` cookie, hashed in `sessions.json` next to the
  config); `/api/access/*`; making the lock and taking it off in place. `signin.html` is the page served instead of the app.
- **Hooks in the lab's files** (keep them through every sync): serve.py — `atomic`/`load_json` seal and unseal, `notebook()`
  is `None` while closed, `set_notebook` asks `may_switch` and `copy_in`, `send_head` serves sealed files, `do_GET`/`do_POST`
  ask `ACCESS.route` first, `media()`/`recording()` write through the lock, `ACCESS.attach(SYNC, STT, SLIDES)`; sisync.py —
  `read_lines`/`append_line`. `attach()` wraps sttread (`_atomic`, `decode`, `Transcriber.job`) and `slides.convert`, and
  stops the server if one of them is gone.
- `src/20b-access.js` (+ `.css`): Settings → Access, the sign-in card on a 423, the offline password on a paired device, no
  Markdown mirror or folder snapshots while locked.
- `tests/access.test.mjs` runs in `lab_sync.py finish`: a sync that breaks a hook fails there. Never write plain text into
  a locked notebook's sealed parts, or next to the app while a lock exists: `Access.seal`/`create` refuse (`Locked`).

`scientia.html` and `board.html` are build outputs (git-ignored). **Edit `src/` (and `board/`), never a built file.**
`build.py` refuses to write the app when `node --check` fails on the joined JavaScript.

## What lives where

| Path | What it is |
|---|---|
| `src/*.js`, `src/*.css`, `src/shell.html` | the app, joined in filename order into one classic script: top-level `const`s are the app's globals (`App`, `DB`, `M`, `IX`, `LIB`, `INK`, `SYNC`…); a later file extends an earlier one by wrapping its functions |
| `serve.py`, `sisync.py` | the desktop server: the notebook folder is the record; phones and tablets pair with this computer and sync through it |
| `access.py`, `signin.html`, `src/20b-access.*` | the notebook's lock (ours, not the lab's): above |
| `hwread.py`, `winink.py`, `sttread.py`, `slides.py` | handwriting, Windows ink recognition, Whisper transcription, PowerPoint → images (all on this computer) |
| `board/` | the app's side of the whiteboard: `store.js` (a small Firestore stand-in; the board lives in the note), `pen.js` (the notebook's pen on the board), `board.css` |
| `vendor/board/lab-board.html` | the McGhee Lab's board page with its engine inlined, unchanged, made by each sync; three placeholders take `board/` |
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
