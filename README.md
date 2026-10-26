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
- Speed is a four-position slider directly in the toolbar: Slow (30 BPM), Medium (90 BPM, default), Fast (140 BPM), or Turbo (240 BPM). Four sequencer steps per beat.
- Pencil: select to pause playback and draw. Drag to paint or erase fine cells; the initial cell chooses whether the stroke paints or erases. Play or Escape exits drawing mode.
- Random assigns each of the 262,144 cells an independent 50% chance of life.
- Clear (trash button) empties the grid and resets its iteration count, whether playing or paused.
- Sound is a Stabby / Smooth toggle directly in the toolbar, defaulting to Stabby. Stabby articulates every step; Smooth holds each pitch-row voice across adjacent active columns, interpolates volume, and fades on an empty region.
- Volume follows density automatically, with a fixed full-volume threshold of 32 cells per region.

## Architecture and choices

512 × 512 wrapping Conway B3/S23 cells run in a dedicated module worker, with double-buffered typed arrays. One generation runs per sixteenth-note interval independently of music. Under load simulation slows instead of accumulating a catch-up queue. A 32 × 32 region count is aggregated after each generation and supplied to the independent audio look-ahead scheduler. Music uses the latest completed generation; it does not wait on simulation or drawing.

The renderer caches a fine-cell bitmap on a neutral background. Live cells in the currently playing music column cycle through the original violet, blue, green, yellow, orange, and red palette every 200 ms. Music-region density controls audio volume; there is no density-colored background or Color menu. Paused grids redraw only when cells change, while the playing column animates at display refresh.

Audio uses Web Audio triangle voices, density envelopes, the reference's 50 ms feedback echo, and a gentle 3.5 kHz low-pass filter. A fixed mix gain budgets headroom for all 32 voices and the complete echo tail; the previous compressor was removed after rendered audio demonstrated clipping at full polyphony. The original descending C-major pentatonic C6–C3 mapping is expanded to 32 pitch rows by repeating each pitch twice, preserving its range. This recreates the core timbre without carrying the old Tone.js dependency; it is not a bit-identical reproduction of Tone's synth. Optional effects and composition administration from the reference are outside this version's requested controls.

The audio clock schedules 100 ms ahead every 20 ms; animation reads timestamped playhead events. Tempo and mode changes take effect within that look-ahead window. Expired steps are skipped after scheduling stalls to avoid catch-up bursts. Pause and mode changes hold the current envelope before fading. Browser background throttling can affect prolonged hidden-tab playback. Mobile Safari and physical device audio have not been verified.

## Validation

- Nine automated tests: still life/oscillator rules, wrapping, density aggregation, volume/pitches, Stabby scheduling, Smooth continuity/fade/pause, full-polyphony headroom, delayed scheduling, and smooth pause automation. Open `/test/audio.html` on the running server for offline Web Audio regression renders at both threshold extremes in both modes. The corrected renders peak at 0.311 with zero clipped samples; the original full-density Smooth render peaked at 1.023 with 9 samples beyond full scale. These checks cover generated samples, not physical device playback.
- Local Node benchmark, 200 samples after warmup: 1.72 ms median, 1.93 ms p95 per generation plus aggregation. The 240 BPM step interval is 62.5 ms. These measurements cover simulation, not complete device frame time.
- Chrome checks at 1440 × 1000, 390 × 844, 320 × 568, and landscape 844 × 390: stacked title/toolbar/grid order, left-aligned title, centered toolbar, four speed presets, Space (including held-key handling and focused-toolbar buttons), drawing and automatic pause, random, square canvas, and no horizontal overflow all passed; no page errors. Earlier playback and audio checks also passed at desktop and mobile sizes.
- Desktop and mobile screenshots are included. Mobile emulation does not establish performance on physical phones.

The title reads Blips and sits above a centered toolbar and the square grid. The title is left aligned with the grid on desktop and mobile, and the centered toolbar spans the full grid width. On short screens the page scrolls vertically to keep the controls and square grid usable. The Helvetica font stack, rounded dropdown panels, and footer hints/iteration/About placement follow the reference. Organism selection has been replaced with the pencil tool.

## Deployment

The public site is hosted at https://mikemfleming.github.io/blips-3/.
Pushing to `main` runs the tests and deploys the static app through GitHub Actions.
Only `index.html`, `favicon.png`, and `src/` are published. No server process or build dependencies are needed on Pages.
