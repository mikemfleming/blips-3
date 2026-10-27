# Blips iteration notes

## Completed October 27, 2026

- Keep Random.
- Replace the Speed slider with Tortoise (30 BPM) / Hare (90 BPM).
- Conclude the effects experiment: remove the delay/phase processors and panel; keep scanner-following HRTF stereo fixed at 66% width.
- Draw during playback, with a 3 × 3 pencil and fixed 16-generation protection, without a toolbar setting.
- Document the separate playhead, Conway, and screen-redraw clocks in README.md and About.
- Load centered text as live cells using `?text=...`, including multiline text and long-line wrapping.
- Set initial speed/sound via URL; `density=0–100` creates a fresh random background and combines with centered text. Seed logic has been removed.
- Protect URL text progressively in reading order: 16, 17, 18… generations per visible character; pencil protection stays fixed at 16.

## Still to explore

- Decide whether Conway should advance once per full scanner sweep or on its current independent per-step timer.
- Title graphic that moves right and blows up into cells.
- Develop the About section further.
- Extend beyond the webpage: scan a QR code to open it on an iPhone and draw with a finger. Decide whether the phone controls its own grid or a shared grid on another screen.

The October 27 changes are included in the production release.
