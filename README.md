# Blips — standalone

A dependency-free browser instrument, built separately from the read-only `~/Dev/blips 2` reference.

## Run

Install Node.js 20 or later, then from this folder:

```sh
npm start
```

Open http://localhost:5173. No install or build step is needed. To use another port: `PORT=5174 npm start`.

```sh
npm test
npm run benchmark
```

## Play

- Play/pause or Space starts and stops both the sequencer and Conway simulation. Space leaves sliders, text entry, and the About dialog alone.
- Speed is a direct Tortoise / Hare toggle: Tortoise (30 BPM) or Hare (90 BPM, default). Four sequencer steps per beat.
- Pencil: draw while playing or paused with a 3 × 3 fine-cell brush. Drawn cells stay alive for the next 16 completed Conway generations, then return to normal Conway rules. They are not forcibly killed after protection expires. Painting over a cell refreshes protection; erasing, clearing, and randomizing remove protection immediately. Pausing does not consume generations. Playback keeps the pencil selected; Escape deselects it.
- Random assigns each cell an independent 5% chance of life.
- Clear (trash button) empties the grid and resets its iteration count, whether playing or paused.
- Sound is a Stabby / Smooth toggle directly in the toolbar, defaulting to Smooth. Stabby articulates every step; Smooth holds each pitch-row voice across adjacent active columns, interpolates volume, and fades on an empty region.
- Volume follows density automatically, with a fixed full-volume threshold of 32 cells per region.
- Spatial audio always follows the scanner at a fixed 66% width, using the spatial model from Blips 2.

## Architecture and choices

512 × 512 wrapping Conway B3/S23 cells run in a dedicated module worker, with double-buffered typed arrays. One generation runs per sixteenth-note interval independently of music. Under load simulation slows instead of accumulating a catch-up queue. A 32 × 32 region count is aggregated after each generation and supplied to the independent audio look-ahead scheduler. Music uses the latest completed generation; it does not wait on simulation or drawing.

The renderer caches a fine-cell bitmap on a neutral background. Live cells in the currently playing music column cycle through the original violet, blue, green, yellow, orange, and red palette every 200 ms. Music-region density controls audio volume; there is no density-colored background or Color menu. Paused grids redraw only when cells change, while the playing column animates at display refresh.

Audio uses Web Audio triangle voices, density envelopes, a gentle 3.5 kHz low-pass filter, and fixed spatial positioning. The experimental delay and phase processors and their UI have been removed. Stereo always follows Blips 2's HRTF spatial model at 66% width: lateral coordinates run from x = -1.32 to +1.32, y = 0, z = -1.5, with rolloffFactor = 0. The former 66% width blend is fixed at 34% direct signal and 66% spatial signal. There is no free-running stereo oscillator. Positions are scheduled on the audio clock and settle over 15 ms; pausing clears pending positions and returns the source to center.

The 32 rows share 12 distinct Cm7 pitches (C, E♭, G, B♭) across three octaves, with some adjacent rows repeating a pitch: B♭6 at the top through C4 at the bottom. This recreates the core timbre without carrying the old Tone.js dependency; it is not a bit-identical reproduction of Tone's synth.

The audio clock schedules 100 ms ahead every 20 ms; animation reads timestamped playhead events. Tempo and mode changes take effect within that look-ahead window. Expired steps are skipped after scheduling stalls to avoid catch-up bursts. Pause and mode changes hold the current envelope before fading. Browser background throttling can affect prolonged hidden-tab playback. Mobile Safari and physical device audio have not been verified.

## Validation

- Twenty-seven unit tests plus the benchmark pass: Conway rules and wrapping, density aggregation, audio envelopes and scheduling, headroom, 3 × 3 brush coverage/erasing/edge clipping, and fixed scanner spatial coordinates, note-clock positioning, and protected-cell survival/expiry/refresh/reset.
- Open `/test/audio.html` for offline Web Audio checks. Both sound modes render with fixed 66% stereo and zero clipped samples. Left-side scanner positions favor the left ear and right-side positions favor the right ear. Largest peak across the current render cases is about 0.266. These checks do not establish physical device audio quality.
- Local Node benchmark, 200 samples after warmup: about 2.16 ms median and 2.44 ms p95 per generation plus aggregation. The shortest current step interval is about 167 ms at Hare speed.
- Chrome at desktop, mobile (390 × 844), and small-phone (320 × 568) sizes confirms no effect or lifetime settings remain, the toolbar stays on one line, and pencil cells survive all 16 protected generations before normal Conway resumes on generation 17. No page errors or horizontal overflow were observed.
- Desktop and mobile screenshots are included. Mobile emulation does not establish performance on physical phones.

The title reads Blips and sits above a centered toolbar and the square grid. The title is left aligned with the grid on desktop and mobile, and the centered toolbar spans the full grid width. On short screens the page scrolls vertically to keep the controls and square grid usable. The Helvetica font stack, and footer hints/iteration/About placement follow the reference. Organism selection has been replaced with the pencil tool.

## Deployment

The public site is hosted at https://mikemfleming.github.io/blips-3/.
Pushing to `main` runs the tests and deploys the static app through GitHub Actions.
Only `index.html`, `favicon.png`, and `src/` are published. No server process or build dependencies are needed on Pages.


## Timing: three separate operations

1. **Playhead and notes:** the audio clock advances one column per sixteenth note (500 ms for Tortoise, about 167 ms for Hare). It schedules 100 ms ahead to keep notes steady; the visible column follows those audio timestamps on the next display frame. A full 32-column sweep takes 16 seconds for Tortoise or about 5.33 seconds for Hare.
2. **Conway generations:** a worker evolves the entire cellular grid on its own timer at approximately the same interval. Generation calculation and publishing add a small amount of overhead, so this timer can drift relative to the playhead. It does not wait for a sweep to finish. Painting is processed between generations and published immediately.
3. **Drawing the screen:** new cell data is shown on the next display frame. During playback, the canvas is also repainted each frame to animate the rainbow column. Those extra repaints do not create Conway generations or move the sequencer.

The old once-per-sweep generation policy has not been restored. Choosing whether to synchronize generation changes with the scanner remains a design decision.

## URL options

All options are independent and combine in the same URL. Every link starts paused.

- `text=Hello%20world` adds centered text as live cells. Visible characters receive increasing protection in reading order: 16 generations for the first, 17 for the second, 18 for the third, and so on (+1 per character). Spaces do not count, and new lines continue the sequence. Combined Unicode characters count as one visible character. Each cell resumes normal Conway rules when its own protection expires. Erasing, clearing, or randomizing removes protection immediately.
- `density=10` creates a fresh random background with a 10% chance of life per cell. Reloading creates a new layout. Values may be fractional and are clamped to 0–100; an empty or invalid density value uses 50%. `density=0` makes an empty background; `density=100` fills it. The total live count includes any added text, so it may exceed the background percentage.
- `speed=tortoise` (30 BPM) or `speed=hare` (90 BPM, default).
- `sound=stabby` or `sound=smooth` (default).

Examples:

- `http://localhost:5173/?text=bing&density=10`
- `http://localhost:5173/?density=10&speed=tortoise&sound=smooth`
- `http://localhost:5173/?text=Hello%20world`

Text is centered by actual ink bounds. Spaces accept `%20` or `+`; `%0A` starts a new centered line. Long lines wrap near 32 characters and the text scales down to fit. Input is limited to 512 Unicode code points and is rasterized as plain text, never interpreted as HTML.

With text alone, the rest of the grid starts empty. With density alone, the grid starts random at that density. Together, protected text is overlaid onto an unprotected random background. Empty or whitespace-only text contributes no cells, but does not suppress density. When neither text nor density is present, the original organism starter remains.

Seed support has been removed; old `seed` parameters are ignored. Random continues to generate a fresh grid with 5% live-cell probability. Unknown speed/sound values use their defaults, and toolbar changes can override the initial settings.

Desktop/mobile checks cover text-only, density-only, combined initialization, centered text, fresh backgrounds, density endpoints, and character-specific protection/expiry through their assigned generation counts. Unit checks cover parsing, binary cell extraction, probability selection, and preservation of background cells when text is overlaid.

## October 28 interface update

The grid fills the viewport with square cells in a responsive rectangular simulation. Resizing preserves overlapping cells and their protection, centered in the new dimensions. Music still uses 32 × 32 regions. Playback and Conway pause when the page is hidden, and require Play on return. The fixed toolbar fits its labeled Slow (30 BPM), Fast (90 BPM), Stabby, and Smooth controls; Smooth is the default. A black BLIIII…PS title fills the toolbar width and inverts over live cells.

Stereo now eases toward center over the first and last four column intervals. Columns 0 and 31 both sit at center, softening the wrap without reversing the sequence or fading note volume.

Pencil is selected on load. Each stroke starts with 16 generations of protection and adds one generation for every three fine cells traveled, so a paused stroke releases from its beginning toward its end. Each new stroke restarts the progression; erasing still removes cells and protection immediately. Protection expiry allows Conway rules to resume, rather than forcing cells to die.
