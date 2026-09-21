(() => {
  "use strict";

  const MIN_DELAY_SECONDS = 0;
  const MAX_DELAY_SECONDS = 600;
  const DEFAULT_DELAY_SECONDS = 10;
  const MAX_RECOVERY_ATTEMPTS = 2;
  const BUFFER_EPSILON_SECONDS = 0.35;
  const DELAY_APPLY_DEBOUNCE_MS = 350;
  const THEME_STORAGE_KEY = "driftplay-theme";
  const RADIO_SOURCE_URL = "https://raw.githubusercontent.com/LaQuay/TDTChannels/master/RADIO.md";
  const POPULAR_STREAMS = [
    { sourceName: "Radio Nacional", displayName: "Radio Nacional" },
    { sourceName: "Catalunya Ràdio", displayName: "Catalunya Radio" },
    { sourceName: "Onda Cero", displayName: "Onda Cero" },
    { sourceName: "Radio Euskadi", displayName: "Radio Euskadi" },
  ];

  const elements = {
    form: document.querySelector("#stream-form"),
    streamUrl: document.querySelector("#stream-url"),
    themeToggle: document.querySelector("#theme-toggle"),
    delaySeconds: document.querySelector("#delay-seconds"),
    playButton: document.querySelector("#play-button"),
    stopButton: document.querySelector("#stop-button"),
    popularStreamsStatus: document.querySelector("#popular-streams-status"),
    popularStreamsList: document.querySelector("#popular-streams-list"),
    audio: document.querySelector("#audio-player"),
    connectionStatus: document.querySelector("#connection-status"),
    bufferStatus: document.querySelector("#buffer-status"),
    bufferedDuration: document.querySelector("#buffered-duration"),
    liveDistance: document.querySelector("#live-distance"),
    streamTitle: document.querySelector("#stream-title"),
    messageArea: document.querySelector("#message-area"),
    errorArea: document.querySelector("#error-area"),
  };

  const state = {
    hls: null,
    hlsListeners: [],
    audioListeners: [],
    monitorId: 0,
    delayApplyTimer: 0,
    pendingDelayApply: false,
    delaySeconds: DEFAULT_DELAY_SECONDS,
    streamUrl: "",
    isLoaded: false,
    isLoading: false,
    wantsPlayback: false,
    hasStartedPlayback: false,
    fatalNetworkRecoveries: 0,
    fatalMediaRecoveries: 0,
    nativeHls: false,
    lastMetadataTitle: "",
  };

  elements.delaySeconds.addEventListener("input", () => {
    handleDelayInput();
  });

  elements.themeToggle.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light", true);
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const validation = validateInputs();

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    loadStream(validation.url, validation.delaySeconds);
  });

  elements.stopButton.addEventListener("click", stopPlayback);

  initializeTheme();
  populatePopularStreams();
  updateControlState();
  updateMediaSession();

  async function populatePopularStreams() {
    elements.popularStreamsStatus.textContent = "Loading popular streams...";

    try {
      const response = await fetch(RADIO_SOURCE_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const markdown = await response.text();
      const streams = parsePopularStreams(markdown);

      if (!streams.length) {
        elements.popularStreamsStatus.textContent = "Popular streams are unavailable right now.";
        return;
      }

      renderPopularStreams(streams);
      elements.popularStreamsStatus.textContent = "";
    } catch {
      elements.popularStreamsStatus.textContent = "Popular streams could not be loaded.";
    }
  }

  function parsePopularStreams(markdown) {
    const rows = markdown.split("\n").filter((line) => line.startsWith("| ") && !/^\|\s*-/.test(line));

    return POPULAR_STREAMS.map((preset) => {
      const row = rows.find((line) => normalizeName(getMarkdownCell(line, 0)) === normalizeName(preset.sourceName));
      if (!row) {
        return null;
      }

      const streamUrl = getPreferredStreamUrl(getMarkdownCell(row, 1));
      const logoUrl = getFirstMarkdownLinkUrl(getMarkdownCell(row, 3));

      if (!streamUrl || !logoUrl) {
        return null;
      }

      return {
        title: preset.displayName,
        streamUrl,
        logoUrl,
      };
    }).filter(Boolean);
  }

  function renderPopularStreams(streams) {
    elements.popularStreamsList.textContent = "";

    streams.forEach((stream) => {
      const button = document.createElement("button");
      button.className = "stream-card";
      button.type = "button";
      button.addEventListener("click", () => {
        elements.streamUrl.value = stream.streamUrl;
        loadStream(stream.streamUrl, state.delaySeconds, { title: stream.title });
      });

      const image = document.createElement("img");
      image.src = stream.logoUrl;
      image.alt = "";
      image.loading = "lazy";

      const label = document.createElement("span");
      label.textContent = stream.title;

      button.append(image, label);
      elements.popularStreamsList.append(button);
    });
  }

  function getMarkdownCell(row, index) {
    return row.split("|").slice(1, -1)[index].trim();
  }

  function getPreferredStreamUrl(cell) {
    const links = getMarkdownLinks(cell);
    const hlsLink = links.find((link) => link.label.toLowerCase().includes("m3u8") || link.url.toLowerCase().includes(".m3u8"));
    return hlsLink ? hlsLink.url : "";
  }

  function getFirstMarkdownLinkUrl(cell) {
    const links = getMarkdownLinks(cell);
    return links.length ? links[0].url : "";
  }

  function getMarkdownLinks(text) {
    const links = [];
    const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let match = linkPattern.exec(text);

    while (match) {
      links.push({ label: match[1], url: match[2] });
      match = linkPattern.exec(text);
    }

    return links;
  }

  function normalizeName(name) {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function initializeTheme() {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const preferredTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    applyTheme(savedTheme === "light" || savedTheme === "dark" ? savedTheme : preferredTheme, false);
  }

  function applyTheme(theme, shouldPersist) {
    const normalizedTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = normalizedTheme;
    elements.themeToggle.setAttribute("aria-checked", String(normalizedTheme === "light"));
    elements.themeToggle.querySelector(".theme-toggle-label").textContent =
      normalizedTheme === "light" ? "Light mode" : "Dark mode";

    if (shouldPersist) {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    }
  }

  function handleDelayInput() {
    const delay = Number.parseFloat(elements.delaySeconds.value);
    if (!Number.isFinite(delay) || delay < 0) {
      setError("Delay must be zero or a positive finite number.");
      return;
    }

    if (delay < MIN_DELAY_SECONDS || delay > MAX_DELAY_SECONDS) {
      setError(`Delay must be between ${MIN_DELAY_SECONDS} and ${MAX_DELAY_SECONDS} seconds.`);
      return;
    }

    state.delaySeconds = delay;
    clearError();

    if (state.delayApplyTimer) {
      window.clearTimeout(state.delayApplyTimer);
    }

    state.delayApplyTimer = window.setTimeout(() => {
      state.delayApplyTimer = 0;
      applyCurrentDelay();
    }, DELAY_APPLY_DEBOUNCE_MS);
  }

  function validateInputs() {
    const rawUrl = elements.streamUrl.value.trim();
    const rawDelay = elements.delaySeconds.value.trim();

    if (!rawUrl) {
      return { ok: false, message: "Enter an HLS audio stream URL." };
    }

    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return { ok: false, message: "Enter a valid absolute URL." };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, message: "The stream URL must use HTTP or HTTPS." };
    }

    const delaySeconds = Number.parseFloat(rawDelay);
    if (!Number.isFinite(delaySeconds) || delaySeconds < 0) {
      return { ok: false, message: "Delay must be zero or a positive finite number." };
    }

    if (delaySeconds < MIN_DELAY_SECONDS || delaySeconds > MAX_DELAY_SECONDS) {
      return {
        ok: false,
        message: `Delay must be between ${MIN_DELAY_SECONDS} and ${MAX_DELAY_SECONDS} seconds.`,
      };
    }

    return { ok: true, url: url.href, delaySeconds };
  }

  function loadStream(streamUrl, delaySeconds, options = {}) {
    resetPlayback();

    state.streamUrl = streamUrl;
    state.delaySeconds = clampDelay(delaySeconds);
    state.isLoading = true;
    state.wantsPlayback = true;
    state.lastMetadataTitle = options.title || "";
    elements.streamTitle.textContent = options.title || getStreamTitle(streamUrl);
    setStatus("Loading stream");
    setMessage("Loading the live audio stream. Playback will begin when enough buffered audio is available.");
    clearError();
    updateControlState();
    updateMediaSession();

    if (elements.audio.canPlayType("application/vnd.apple.mpegurl")) {
      loadWithNativeHls(streamUrl);
      return;
    }

    if (window.Hls && window.Hls.isSupported()) {
      loadWithHlsJs(streamUrl);
      return;
    }

    state.isLoading = false;
    setError("This browser does not support HLS audio playback.");
    updateControlState();
  }

  function applyCurrentDelay() {
    updateHlsDelayConfig();

    if (!state.isLoaded && !state.isLoading) {
      return;
    }

    if (!state.isLoaded) {
      setMessage(`Delay changed to ${formatSeconds(state.delaySeconds)}. It will be used when the stream is ready.`);
      return;
    }

    const targetTime = getTargetDelayedTime();
    if (targetTime === null) {
      state.pendingDelayApply = true;
      setBufferStatus(getDelayWaitStatus());
      setMessage(`Delay changed to ${formatSeconds(state.delaySeconds)}. Waiting until that position is available in the buffer.`);
      return;
    }

    elements.audio.currentTime = targetTime;
    state.pendingDelayApply = false;
    updateBufferReadout();
    setMessage(getPlaybackPositionMessage());

    if (state.wantsPlayback && elements.audio.paused) {
      playAudio();
    }
  }

  function updateHlsDelayConfig() {
    if (!state.hls) {
      return;
    }

    state.hls.config.liveSyncDuration = state.delaySeconds;
    state.hls.config.liveMaxLatencyDuration = Math.min(state.delaySeconds + 30, MAX_DELAY_SECONDS + 30);
  }

  function loadWithHlsJs(streamUrl) {
    const HlsConstructor = window.Hls;
    const maxBufferLength = Math.min(Math.max(state.delaySeconds * 3, 30), 300);
    const backBufferLength = Math.min(Math.max(state.delaySeconds + 120, 180), 900);

    state.hls = new HlsConstructor({
      liveSyncDuration: state.delaySeconds,
      liveMaxLatencyDuration: Math.min(state.delaySeconds + 30, MAX_DELAY_SECONDS + 30),
      maxBufferLength,
      maxMaxBufferLength: Math.min(Math.max(maxBufferLength * 2, 60), 600),
      backBufferLength,
      enableWorker: true,
      lowLatencyMode: false,
    });

    onHls(HlsConstructor.Events.MEDIA_ATTACHED, () => {
      state.hls.loadSource(streamUrl);
    });

    onHls(HlsConstructor.Events.MANIFEST_PARSED, (_event, data) => {
      state.isLoaded = true;
      state.isLoading = false;
      selectAudioOnlyLevel(data);
      setStatus("Stream loaded");
      setMessage("Waiting for enough buffered audio before playback starts.");
      updateControlState();
      checkReadyToStart();
    });

    onHls(HlsConstructor.Events.LEVEL_LOADED, (_event, data) => {
      if (data.details && data.details.live === false) {
        setMessage("Loaded a finite HLS audio stream. Delay controls are optimized for live streams.");
      }
      checkReadyToStart();
    });

    onHls(HlsConstructor.Events.BUFFER_APPENDED, checkReadyToStart);
    onHls(HlsConstructor.Events.FRAG_BUFFERED, checkReadyToStart);
    if (HlsConstructor.Events.FRAG_PARSING_METADATA) {
      onHls(HlsConstructor.Events.FRAG_PARSING_METADATA, (_event, data) => {
        const title = extractMetadataTitle(data);
        if (title) {
          state.lastMetadataTitle = title;
          elements.streamTitle.textContent = title;
          updateMediaSession();
        }
      });
    }

    onHls(HlsConstructor.Events.ERROR, (_event, data) => handleHlsError(data));

    addAudioListeners();
    state.hls.attachMedia(elements.audio);
    startBufferMonitor();
  }

  function loadWithNativeHls(streamUrl) {
    state.nativeHls = true;
    addAudioListeners();
    elements.audio.src = streamUrl;
    elements.audio.load();
    startBufferMonitor();
  }

  function onHls(eventName, handler) {
    state.hls.on(eventName, handler);
    state.hlsListeners.push([eventName, handler]);
  }

  function addAudioListeners() {
    addAudioListener("loadedmetadata", () => {
      state.isLoaded = true;
      state.isLoading = false;
      setStatus("Stream loaded");
      updateControlState();
      checkReadyToStart();
    });
    addAudioListener("canplay", () => {
      if (!state.isLoaded) {
        state.isLoaded = true;
        state.isLoading = false;
        setStatus("Stream loaded");
        updateControlState();
      }
      checkReadyToStart();
    });
    addAudioListener("progress", checkReadyToStart);
    addAudioListener("waiting", () => {
      setBufferStatus("Buffering audio");
      updateControlState();
    });
    addAudioListener("playing", () => {
      state.hasStartedPlayback = true;
      setStatus("Playing");
      setMessage(getPlaybackPositionMessage());
      clearError();
      updateControlState();
    });
    addAudioListener("play", updateControlState);
    addAudioListener("pause", () => {
      if (state.isLoaded) {
        setStatus("Paused");
        setMessage("Paused position will remain resumable while it stays in the local buffer.");
      }
      updateControlState();
    });
    addAudioListener("error", () => handleMediaError());
  }

  function addAudioListener(eventName, handler) {
    elements.audio.addEventListener(eventName, handler);
    state.audioListeners.push([eventName, handler]);
  }

  function stopPlayback() {
    if (!state.isLoaded || elements.audio.paused) {
      return;
    }

    resetPlayback();
  }

  function selectAudioOnlyLevel(data) {
    const levels = state.hls.levels || data.levels || [];
    if (!levels.length) {
      return;
    }

    const audioOnlyIndex = levels.findIndex((level) => level.audioCodec && !level.videoCodec);
    if (audioOnlyIndex >= 0) {
      state.hls.currentLevel = audioOnlyIndex;
      setMessage("Selected an audio-only HLS variant.");
      return;
    }

    const hasVideo = levels.some((level) => Boolean(level.videoCodec));
    const hasAudio = levels.some((level) => Boolean(level.audioCodec));
    if (hasVideo && !hasAudio) {
      setError("This stream appears to contain video without a supported audio variant.");
    } else if (hasVideo) {
      setMessage("No audio-only variant was advertised. DriftPlay will use audio playback only; video tracks are not shown.");
    }
  }

  function requestPlayback(action) {
    if (!state.isLoaded && !state.isLoading) {
      setError("Load an HLS audio stream before starting playback.");
      return;
    }

    state.wantsPlayback = true;
    clearError();

    if (action === "resume" && !isTimeBuffered(elements.audio.currentTime)) {
      setError("The paused position is no longer in the local buffer. Load the stream again or start closer to live.");
      return;
    }

    if (state.hasStartedPlayback && isTimeBuffered(elements.audio.currentTime)) {
      playAudio();
      return;
    }

    setMessage("Waiting for enough buffered audio before playback starts.");
    checkReadyToStart();
  }

  function pausePlayback() {
    state.wantsPlayback = false;
    elements.audio.pause();
    updateControlState();
  }

  function checkReadyToStart() {
    updateBufferReadout();

    if (!state.wantsPlayback || !state.isLoaded || !state.streamUrl) {
      return;
    }

    const targetTime = getTargetDelayedTime();
    if (targetTime === null) {
      setBufferStatus(getDelayWaitStatus());
      return;
    }

    if (state.pendingDelayApply || !state.hasStartedPlayback || !isTimeBuffered(elements.audio.currentTime)) {
      elements.audio.currentTime = targetTime;
      state.pendingDelayApply = false;
    }

    playAudio();
  }

  async function playAudio() {
    try {
      await elements.audio.play();
      clearError();
    } catch (error) {
      state.wantsPlayback = false;
      setStatus("Ready");
      setError(
        error && error.name === "NotAllowedError"
          ? "Playback was blocked by browser autoplay policy. Use the audio element controls to start audio."
          : "The browser could not start audio playback. Check codec support and stream compatibility.",
      );
      updateControlState();
    }
  }

  function getTargetDelayedTime() {
    const buffered = elements.audio.buffered;
    if (buffered.length > 0) {
      const bufferedLiveEdge = buffered.end(buffered.length - 1);
      const bufferedTarget = Math.max(0, bufferedLiveEdge - state.delaySeconds);
      return isTimeBuffered(bufferedTarget) ? bufferedTarget : null;
    }

    if (state.nativeHls) {
      const liveEdge = getLiveEdge();
      if (liveEdge !== null) {
        const target = Math.max(0, liveEdge - state.delaySeconds);
        return isTimeSeekable(target) ? target : null;
      }
    }

    return null;
  }

  function getLiveEdge() {
    const seekable = elements.audio.seekable;
    if (seekable.length > 0) {
      return seekable.end(seekable.length - 1);
    }

    const buffered = elements.audio.buffered;
    if (buffered.length > 0) {
      return buffered.end(buffered.length - 1);
    }

    return null;
  }

  function isTimeBuffered(time) {
    if (!Number.isFinite(time)) {
      return false;
    }

    const buffered = elements.audio.buffered;
    for (let index = 0; index < buffered.length; index += 1) {
      if (time >= buffered.start(index) - BUFFER_EPSILON_SECONDS && time <= buffered.end(index) + BUFFER_EPSILON_SECONDS) {
        return true;
      }
    }
    return false;
  }

  function isTimeSeekable(time) {
    const seekable = elements.audio.seekable;
    for (let index = 0; index < seekable.length; index += 1) {
      if (time >= seekable.start(index) && time <= seekable.end(index)) {
        return true;
      }
    }
    return false;
  }

  function startBufferMonitor() {
    stopBufferMonitor();
    state.monitorId = window.setInterval(() => {
      updateBufferReadout();
      detectExpiredPausePosition();
      checkReadyToStart();
    }, 1000);
  }

  function stopBufferMonitor() {
    if (state.monitorId) {
      window.clearInterval(state.monitorId);
      state.monitorId = 0;
    }
  }

  function updateBufferReadout() {
    const currentTime = elements.audio.currentTime;
    const buffered = elements.audio.buffered;
    const bufferedAhead = getBufferedAhead(currentTime);
    const liveEdge = getLiveEdge();

    elements.bufferedDuration.textContent = `${formatSeconds(bufferedAhead)}`;
    elements.liveDistance.textContent =
      liveEdge === null || !Number.isFinite(currentTime)
        ? "Unknown"
        : `${formatSeconds(Math.max(0, liveEdge - currentTime))}`;

    if (!buffered.length) {
      setBufferStatus(state.delaySeconds === 0 ? "Live" : "No buffered audio");
    } else if (elements.audio.paused) {
      setBufferStatus(isTimeBuffered(currentTime) ? "Paused position retained" : "Paused position expired");
    } else if (bufferedAhead < 1) {
      setBufferStatus(state.delaySeconds === 0 ? "Live" : "Buffering audio");
    } else {
      setBufferStatus(state.delaySeconds === 0 ? "Live" : `${formatSeconds(bufferedAhead)} buffered ahead`);
    }
  }

  function getDelayWaitStatus() {
    return state.delaySeconds === 0 ? "Live" : `Waiting for ${formatSeconds(state.delaySeconds)} of audio`;
  }

  function getPlaybackPositionMessage() {
    return state.delaySeconds === 0
      ? "Audio playback is live."
      : `Audio playback is running ${formatSeconds(state.delaySeconds)} behind the live edge.`;
  }

  function getBufferedAhead(time) {
    const buffered = elements.audio.buffered;
    for (let index = 0; index < buffered.length; index += 1) {
      const start = buffered.start(index);
      const end = buffered.end(index);
      if (time >= start - BUFFER_EPSILON_SECONDS && time <= end + BUFFER_EPSILON_SECONDS) {
        return Math.max(0, end - time);
      }
    }
    return 0;
  }

  function detectExpiredPausePosition() {
    if (!state.isLoaded || !elements.audio.paused || !state.hasStartedPlayback) {
      return;
    }

    if (!isTimeBuffered(elements.audio.currentTime)) {
      setError("The paused position has expired from the local buffer. Resume closer to live or reload the stream.");
      updateControlState();
    }
  }

  function handleHlsError(data) {
    if (!data) {
      setError("An unknown HLS playback error occurred.");
      return;
    }

    if (!data.fatal) {
      if (data.details) {
        setMessage(`Recoverable HLS warning: ${humanizeHlsDetail(data.details)}.`);
      }
      return;
    }

    const HlsConstructor = window.Hls;
    if (data.type === HlsConstructor.ErrorTypes.NETWORK_ERROR && state.fatalNetworkRecoveries < MAX_RECOVERY_ATTEMPTS) {
      state.fatalNetworkRecoveries += 1;
      setStatus("Recovering network");
      setMessage("Recovering from a network error while loading the HLS stream.");
      state.hls.startLoad();
      return;
    }

    if (data.type === HlsConstructor.ErrorTypes.MEDIA_ERROR && state.fatalMediaRecoveries < MAX_RECOVERY_ATTEMPTS) {
      state.fatalMediaRecoveries += 1;
      setStatus("Recovering media");
      setMessage("Recovering from a media decoding or buffer error.");
      state.hls.recoverMediaError();
      return;
    }

    setStatus("Error");
    setError(getHlsErrorMessage(data));
    state.wantsPlayback = false;
    updateControlState();
  }

  function getHlsErrorMessage(data) {
    const detail = data.details ? humanizeHlsDetail(data.details) : "unknown HLS error";

    if (String(data.details || "").includes("manifest")) {
      return `The HLS manifest could not be loaded or parsed (${detail}). Check the URL and CORS headers.`;
    }

    if (String(data.details || "").includes("frag") || String(data.details || "").includes("level")) {
      return `The stream media segments could not be loaded (${detail}). Check CORS, network access, and HLS manifest availability.`;
    }

    if (String(data.details || "").includes("buffer") || data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
      return `The browser could not buffer or decode this audio stream (${detail}). The codec may be unsupported or the stream may contain incompatible video.`;
    }

    return `HLS playback failed (${detail}). Check stream compatibility, CORS, and network access.`;
  }

  function handleMediaError() {
    const mediaError = elements.audio.error;
    const messages = {
      1: "Audio playback was aborted.",
      2: "A network error stopped audio playback. Check connectivity and CORS access.",
      3: "The browser could not decode this stream. The audio codec may be unsupported or the stream may contain incompatible video.",
      4: "The audio source is unsupported or unavailable.",
    };
    setStatus("Error");
    setError(messages[mediaError && mediaError.code] || "An unknown media playback error occurred.");
    state.wantsPlayback = false;
    updateControlState();
  }

  function resetPlayback(options = {}) {
    stopBufferMonitor();
    if (state.delayApplyTimer) {
      window.clearTimeout(state.delayApplyTimer);
      state.delayApplyTimer = 0;
    }

    if (state.hls) {
      state.hlsListeners.forEach(([eventName, handler]) => state.hls.off(eventName, handler));
      state.hls.destroy();
    }

    state.audioListeners.forEach(([eventName, handler]) => {
      elements.audio.removeEventListener(eventName, handler);
    });

    elements.audio.pause();
    elements.audio.removeAttribute("src");
    elements.audio.load();

    state.hls = null;
    state.hlsListeners = [];
    state.audioListeners = [];
    state.isLoaded = false;
    state.isLoading = false;
    state.pendingDelayApply = false;
    state.wantsPlayback = false;
    state.hasStartedPlayback = false;
    state.fatalNetworkRecoveries = 0;
    state.fatalMediaRecoveries = 0;
    state.nativeHls = false;
    state.lastMetadataTitle = "";

    setStatus("Idle");
    setBufferStatus("No buffered audio");
    elements.bufferedDuration.textContent = "0.0s";
    elements.liveDistance.textContent = "Unknown";
    elements.streamTitle.textContent = "No stream loaded";
    clearError();
    setMessage("");
    updateControlState();
  }

  function setStatus(message) {
    elements.connectionStatus.textContent = message;
  }

  function setBufferStatus(message) {
    elements.bufferStatus.textContent = message;
  }

  function setMessage(message) {
    elements.messageArea.textContent = message;
  }

  function setError(message) {
    elements.errorArea.textContent = message;
  }

  function clearError() {
    elements.errorArea.textContent = "";
  }

  function updateControlState() {
    const isPlaying = state.isLoaded && !elements.audio.paused;

    elements.playButton.disabled = state.isLoading || isPlaying;
    elements.stopButton.disabled = !isPlaying;
  }

  function updateMediaSession() {
    if (!("mediaSession" in navigator) || !("MediaMetadata" in window)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.lastMetadataTitle || getStreamTitle(state.streamUrl) || "DriftPlay audio stream",
      artist: "DriftPlay",
      album: "Live HLS audio",
    });

    setMediaSessionAction("play", () => requestPlayback("play"));
    setMediaSessionAction("pause", pausePlayback);
    setMediaSessionAction("stop", pausePlayback);
  }

  function setMediaSessionAction(action, handler) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Some browsers expose Media Session but support only a subset of actions.
    }
  }

  function getStreamTitle(streamUrl) {
    if (!streamUrl) {
      return "";
    }

    try {
      const url = new URL(streamUrl);
      return `${url.hostname}${url.pathname}`;
    } catch {
      return streamUrl;
    }
  }

  function extractMetadataTitle(data) {
    const samples = data && Array.isArray(data.samples) ? data.samples : [];
    const decoder = new TextDecoder("utf-8");

    for (const sample of samples) {
      const bytes = sample && (sample.data || sample.bytes);
      if (!(bytes instanceof Uint8Array)) {
        continue;
      }

      const text = decoder.decode(bytes).replace(/\0/g, " ").trim();
      const match = text.match(/(?:TIT2|StreamTitle=['"]?)([^'";]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return "";
  }

  function humanizeHlsDetail(detail) {
    return String(detail).replaceAll("_", " ").toLowerCase();
  }

  function clampDelay(delay) {
    return Math.min(Math.max(delay, MIN_DELAY_SECONDS), MAX_DELAY_SECONDS);
  }

  function formatSeconds(seconds) {
    return `${Number(seconds).toFixed(1)}s`;
  }
})();
