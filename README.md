# Why does Wi-Fi go through walls? (Remotion + Three.js)

1080x1920, 30 fps, 56 seconds. Flat 2D illustration look (navy, ice-blue outlines, amber light, Wi-Fi blue) drawn in Three.js, with a camera that never stops moving.

## Run it on your laptop

    npm install
    npm run dev        # preview in Remotion Studio
    npm run render     # writes out/wifi-through-walls.mp4

## Render on GitHub

Push the project to a repo (branch `main`). Then add the workflow file `render.yml` (it comes separately because uploads often skip the hidden `.github` folder): on GitHub choose Add file > Create new file, type `.github/workflows/render.yml` as the name (typing the slashes makes the folders), and paste the contents. It runs on every push, or start it by hand from the Actions tab. The MP4 is in the run's Artifacts.

## What to edit

- `src/script.ts`: the words and their start/end times, caption colours, the four labels, the counter. Captions rebuild themselves from this file.
- `src/shots.tsx`: the 16 shots (camera keys at the top of each shot) and the `SHOTS` timeline at the bottom.
- `src/kit.tsx`: the building blocks (ribbons, waves, atoms, wall, ladder).

## Voiceover

Put your own recording at `public/voiceover.mp3` and it is used automatically. If there is none, the GitHub workflow tries to generate one from `voiceover.txt` (free Microsoft voice via edge-tts) and falls back to a silent render. Captions are timed to about 3 words per second, so change `--rate=+8%` in the workflow, or the line times in `src/script.ts`, until voice and captions agree.

## Last line

The script stops at "remember—". The video ends on that line, then dives back into the opening shot so it loops. Change the last entry in `LINES` when you have the ending.
