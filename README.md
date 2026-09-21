# DriftPlay

DriftPlay is a static, browser-based, audio-only HLS player for live `.m3u8`
streams. It lets a listener target a configurable delay behind the live edge,
pause playback, and resume from the paused position while that media remains in
the browser's local buffer.

The app is deployed as a GitHub Pages project site:

https://albertfc.github.io/driftplay/

## Features

- HTML `<audio>` playback only; no video element or video UI.
- hls.js playback for browsers with Media Source Extensions.
- Native HLS playback where available, especially Safari and Apple platforms.
- Configurable fixed live delay from 1 to 600 seconds.
- Startup waits for enough buffered or seekable media before attempting playback.
- Pause and resume support through the browser audio element while the paused
  position remains locally buffered.
- Buffer, loading, playback, and error status with accessible live updates.
- Bounded hls.js buffer settings to avoid unbounded memory growth.
- Recoverable hls.js media and network error handling with retry limits.
- Media Session API integration for supported browsers.
- Relative asset paths for GitHub Pages project-site hosting under `/driftplay/`.

## Usage

1. Open the app.
2. Enter a CORS-enabled HLS audio `.m3u8` URL using `http` or `https`.
3. Select **Play**.
4. Adjust the target delay in the audio player. Delay changes are debounced
   briefly and then applied to the current stream.
5. Select **Stop** to stop an active stream. If playback does not start automatically, use the browser audio element
   controls. Browser autoplay policies may require this extra user gesture.

## Local development

This repository is a plain static site. Serve it with any local static server:

```sh
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

No backend, proxy, authentication service, or database is required.

## Deployment notes

The app is intended for GitHub Pages at `/driftplay/`. Asset references use
relative paths such as `./styles.css` and `./app.js`, so they work from the
project-site base path.

hls.js is loaded from a public CDN in the browser. Safari and other browsers
with native HLS support can play without hls.js support in Media Source
Extensions.

## HLS, CORS, and compatibility limitations

DriftPlay cannot make every HLS stream playable. Important limitations:

- The HLS manifest and every required audio segment must support CORS.
- A GitHub Pages site cannot bypass CORS because it has no backend proxy.
- The browser tab must remain open for live media ingestion to continue.
- Browser memory and Media Source Extensions limit how much audio can be
  retained.
- hls.js may evict old buffered media.
- The origin server's live playlist window limits what can be downloaded and
  retained.
- A paused position may eventually expire if it is no longer available locally.
- The buffer is not persistent across page reloads.
- Browser autoplay policies may require the user to click **Play** before audio
  can start.
- HLS audio codec support varies by browser.
- Some `.m3u8` URLs contain video or unsupported codecs and may produce a clear
  compatibility error instead of playing.

DriftPlay does not provide unlimited rewind or guaranteed recording. The delay
buffer only exists while the page remains open and while the browser and stream
origin keep the necessary media available.
