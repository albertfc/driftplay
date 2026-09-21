(() => {
  "use strict";

  const t = (key, params) => (window.DriftPlayI18n ? window.DriftPlayI18n.t(key, params) : key);

  const MIN_DELAY_SECONDS = 0;
  const MAX_DELAY_SECONDS = 600;
  const DEFAULT_DELAY_SECONDS = 0;
  const MAX_RECOVERY_ATTEMPTS = 2;
  const BUFFER_EPSILON_SECONDS = 0.35;
  const DELAY_STEP_SECONDS = 1;
  const DELAY_HOLD_DELAY_MS = 400;
  const DELAY_REPEAT_INTERVAL_MS = 80;
  const DELAY_APPLY_DEBOUNCE_MS = 350;
  const THEME_STORAGE_KEY = "driftplay-theme";
  const RADIO_SOURCE_URL = "https://raw.githubusercontent.com/LaQuay/TDTChannels/master/RADIO.md";
  const POPULAR_STREAMS = [
    { sourceName: "RAC1", displayName: "RAC1" },
    { sourceName: "Catalunya Ràdio", displayName: "Catalunya Radio" },
    { sourceName: "Radio Nacional", displayName: "Radio Nacional" },
    { sourceName: "Cadena SER", displayName: "Cadena SER" },
    { sourceName: "COPE", displayName: "COPE" },
    { sourceName: "Onda Cero", displayName: "Onda Cero" },
    { sourceName: "Radio Euskadi", displayName: "Radio Euskadi" },
  ];

  const elements = {
    form: document.querySelector("#stream-form"),
    streamUrl: document.querySelector("#stream-url"),
    themeToggle: document.querySelector("#theme-toggle"),
    delaySeconds: document.querySelector("#delay-seconds"),
    delayDecrease: document.querySelector("#delay-decrease"),
    delayIncrease: document.querySelector("#delay-increase"),
    playButton: document.querySelector("#play-button"),
    stopButton: document.querySelector("#stop-button"),
    popularStreamsStatus: document.querySelector("#popular-streams-status"),
    popularStreamsList: document.querySelector("#popular-streams-list"),
    popularStreamsSlider: document.querySelector("#popular-streams-slider"),
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
    directAudio: false,
    lastMetadataTitle: "",
    statusKey: "idleStatus",
    statusParams: null,
    bufferStatusKey: "noBufferedAudio",
    bufferStatusParams: null,
    messageKey: null,
    messageParams: null,
    errorKey: null,
    errorParams: null,
    popularStreamsStatusKey: "popularStreamsLoading",
  };

  attachDelayHoldRepeat(elements.delayDecrease, -1);
  attachDelayHoldRepeat(elements.delayIncrease, 1);

  elements.themeToggle.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light", true);
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const validation = validateInputs();

    if (!validation.ok) {
      setError(validation.key, validation.params);
      return;
    }

    loadStream(validation.url);
  });

  elements.stopButton.addEventListener("click", stopPlayback);
  elements.popularStreamsSlider.addEventListener("input", () => {
    elements.popularStreamsList.scrollLeft = Number(elements.popularStreamsSlider.value);
  });
  elements.popularStreamsList.addEventListener("scroll", () => {
    elements.popularStreamsSlider.value = String(Math.round(elements.popularStreamsList.scrollLeft));
  });
  window.addEventListener("resize", updatePopularStreamsSlider);

  initializeTheme();
  populatePopularStreams();
  updateControlState();
  updateMediaSession();

  async function populatePopularStreams() {
    setPopularStreamsStatus("popularStreamsLoading");

    try {
      const response = await fetch(RADIO_SOURCE_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const markdown = await response.text();
      const streams = parsePopularStreams(markdown);

      if (!streams.length) {
        setPopularStreamsStatus("popularStreamsUnavailable");
        return;
      }

      renderPopularStreams(streams);
      setPopularStreamsStatus(null);
    } catch {
      setPopularStreamsStatus("popularStreamsLoadError");
    }
  }

  function stepDelay(direction) {
    const currentDelay = Number.parseFloat(elements.delaySeconds.value) || 0;
    const nextDelay = clampDelay(currentDelay + direction * DELAY_STEP_SECONDS);
    elements.delaySeconds.value = formatDelayValue(nextDelay);
    handleDelayInput();
  }

  function attachDelayHoldRepeat(button, direction) {
    let holdTimer = 0;
    let repeatTimer = 0;
    let isHolding = false;

    function stop() {
      if (holdTimer) {
        window.clearTimeout(holdTimer);
        holdTimer = 0;
      }
      if (repeatTimer) {
        window.clearInterval(repeatTimer);
        repeatTimer = 0;
      }
    }

    function start(event) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (button.disabled) {
        return;
      }

      isHolding = false;
      holdTimer = window.setTimeout(() => {
        isHolding = true;
        repeatTimer = window.setInterval(() => {
          if (button.disabled) {
            stop();
            return;
          }
          stepDelay(direction);
        }, DELAY_REPEAT_INTERVAL_MS);
      }, DELAY_HOLD_DELAY_MS);
    }

    button.addEventListener("pointerdown", start);
    ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
      button.addEventListener(eventName, stop);
    });
    window.addEventListener("blur", stop);

    button.addEventListener("click", () => {
      if (isHolding) {
        isHolding = false;
        return;
      }
      stepDelay(direction);
    });
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
        loadStream(stream.streamUrl, { title: stream.title });
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

    window.requestAnimationFrame(updatePopularStreamsSlider);
  }

  function updatePopularStreamsSlider() {
    const maxScroll = Math.max(0, elements.popularStreamsList.scrollWidth - elements.popularStreamsList.clientWidth);
    elements.popularStreamsSlider.max = String(Math.ceil(maxScroll));
    elements.popularStreamsSlider.value = String(Math.min(Number(elements.popularStreamsSlider.value), maxScroll));
    elements.popularStreamsSlider.hidden = maxScroll <= 0;
  }

  function getMarkdownCell(row, index) {
    return row.split("|").slice(1, -1)[index].trim();
  }

  function getPreferredStreamUrl(cell) {
    const links = getMarkdownLinks(cell);
    const hlsLink = links.find((link) => link.label.toLowerCase().includes("m3u8") || link.url.toLowerCase().includes(".m3u8"));
    const mp3Link = links.find((link) => link.label.toLowerCase().includes("mp3") || link.url.toLowerCase().includes(".mp3"));
    const aacLink = links.find((link) => link.label.toLowerCase().includes("aac") || link.url.toLowerCase().includes(".aac"));
    return hlsLink ? hlsLink.url : mp3Link ? mp3Link.url : aacLink ? aacLink.url : "";
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
      normalizedTheme === "light" ? t("themeModeLight") : t("themeModeDark");

    if (shouldPersist) {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    }
  }

  function handleDelayInput() {
    const delay = Number.parseFloat(elements.delaySeconds.value);
    if (!Number.isFinite(delay) || delay < 0) {
      setError("delayInvalid");
      return;
    }

    if (delay < MIN_DELAY_SECONDS || delay > MAX_DELAY_SECONDS) {
      setError("delayRange", { min: MIN_DELAY_SECONDS, max: MAX_DELAY_SECONDS });
      return;
    }

    state.delaySeconds = delay;
    clearError();
    updateControlState();

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
      return { ok: false, key: "enterUrl" };
    }

    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return { ok: false, key: "enterValidUrl" };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, key: "httpsOnly" };
    }

    const delaySeconds = Number.parseFloat(rawDelay);
    if (!Number.isFinite(delaySeconds) || delaySeconds < 0) {
      return { ok: false, key: "delayInvalid" };
    }

    if (delaySeconds < MIN_DELAY_SECONDS || delaySeconds > MAX_DELAY_SECONDS) {
      return {
        ok: false,
        key: "delayRange",
        params: { min: MIN_DELAY_SECONDS, max: MAX_DELAY_SECONDS },
      };
    }

    return { ok: true, url: url.href, delaySeconds };
  }

  function loadStream(streamUrl, options = {}) {
    resetPlayback();

    state.streamUrl = streamUrl;
    state.delaySeconds = DEFAULT_DELAY_SECONDS;
    elements.delaySeconds.value = formatDelayValue(DEFAULT_DELAY_SECONDS);
    state.isLoading = true;
    state.wantsPlayback = true;
    state.lastMetadataTitle = options.title || "";
    elements.streamTitle.textContent = options.title || getStreamTitle(streamUrl);
    setStatus("loadingStreamStatus");
    setMessage(isLikelyHlsUrl(streamUrl) ? "loadingHlsMessage" : "loadingDirectMessage");
    clearError();
    updateControlState();
    updateMediaSession();

    if (!isLikelyHlsUrl(streamUrl)) {
      loadWithDirectAudio(streamUrl);
      return;
    }

    if (elements.audio.canPlayType("application/vnd.apple.mpegurl")) {
      loadWithNativeHls(streamUrl);
      return;
    }

    if (window.Hls && window.Hls.isSupported()) {
      loadWithHlsJs(streamUrl);
      return;
    }

    state.isLoading = false;
    setError("hlsUnsupported");
    updateControlState();
  }

  function applyCurrentDelay() {
    updateHlsDelayConfig();

    if (!state.isLoaded && !state.isLoading) {
      return;
    }

    if (!state.isLoaded) {
      setMessage("delayChangedPending", { delay: formatSeconds(state.delaySeconds) });
      return;
    }

    const targetTime = getTargetDelayedTime();
    if (targetTime === null) {
      state.pendingDelayApply = true;
      setBufferStatus(...getDelayWaitStatus());
      setMessage("delayChangedWaiting", { delay: formatSeconds(state.delaySeconds) });
      return;
    }

    elements.audio.currentTime = targetTime;
    state.pendingDelayApply = false;
    updateBufferReadout();
    setMessage(...getPlaybackPositionMessage());

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
      setStatus("streamLoadedStatus");
      setMessage("waitingForBuffer");
      updateControlState();
      checkReadyToStart();
    });

    onHls(HlsConstructor.Events.LEVEL_LOADED, (_event, data) => {
      if (data.details && data.details.live === false) {
        setMessage("finiteHlsStream");
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

  function loadWithDirectAudio(streamUrl) {
    state.directAudio = true;
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
      setStatus("streamLoadedStatus");
      updateControlState();
      checkReadyToStart();
    });
    addAudioListener("canplay", () => {
      if (!state.isLoaded) {
        state.isLoaded = true;
        state.isLoading = false;
        setStatus("streamLoadedStatus");
        updateControlState();
      }
      checkReadyToStart();
    });
    addAudioListener("progress", checkReadyToStart);
    addAudioListener("waiting", () => {
      setBufferStatus("bufferingAudioStatus");
      updateControlState();
    });
    addAudioListener("playing", () => {
      state.isLoaded = true;
      state.isLoading = false;
      state.hasStartedPlayback = true;
      setStatus("playingStatus");
      setMessage(...getPlaybackPositionMessage());
      clearError();
      updateControlState();
    });
    addAudioListener("play", updateControlState);
    addAudioListener("pause", () => {
      if (state.isLoaded) {
        setStatus("pausedStatus");
        setMessage("pausedResumableMessage");
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
      setMessage("audioOnlySelected");
      return;
    }

    const hasVideo = levels.some((level) => Boolean(level.videoCodec));
    const hasAudio = levels.some((level) => Boolean(level.audioCodec));
    if (hasVideo && !hasAudio) {
      setError("videoOnlyError");
    } else if (hasVideo) {
      setMessage("noAudioOnlyVariant");
    }
  }

  function requestPlayback(action) {
    if (!state.isLoaded && !state.isLoading) {
      setError("loadBeforePlay");
      return;
    }

    state.wantsPlayback = true;
    clearError();

    if (action === "resume" && !isTimeBuffered(elements.audio.currentTime)) {
      setError("pausedExpiredResume");
      return;
    }

    if (state.hasStartedPlayback && isTimeBuffered(elements.audio.currentTime)) {
      playAudio();
      return;
    }

    setMessage("waitingForBuffer");
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

    if (state.directAudio) {
      if (state.delaySeconds === 0) {
        setBufferStatus(
          elements.audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ? "liveStatus" : "loadingDirectAudioStatus",
        );
        playAudio();
        return;
      }

      const directTargetTime = getTargetDelayedTime();
      if (directTargetTime === null) {
        state.pendingDelayApply = true;
        setBufferStatus(...getDelayWaitStatus());
        setMessage("bufferingDirectUntil", { delay: formatSeconds(state.delaySeconds) });
        return;
      }

      if (state.pendingDelayApply || !state.hasStartedPlayback || !isTimeBuffered(elements.audio.currentTime)) {
        elements.audio.currentTime = directTargetTime;
        state.pendingDelayApply = false;
      }

      playAudio();
      return;
    }

    const targetTime = getTargetDelayedTime();
    if (targetTime === null) {
      setBufferStatus(...getDelayWaitStatus());
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
      setStatus("readyStatus");
      setError(error && error.name === "NotAllowedError" ? "autoplayBlocked" : "playbackFailed");
      updateControlState();
    }
  }

  function getTargetDelayedTime() {
    const buffered = elements.audio.buffered;
    if (buffered.length > 0) {
      const lastRangeIndex = buffered.length - 1;
      const bufferedRangeStart = buffered.start(lastRangeIndex);
      const bufferedLiveEdge = buffered.end(lastRangeIndex);
      const bufferedRangeDuration = bufferedLiveEdge - bufferedRangeStart;

      if (state.directAudio && state.delaySeconds > 0 && bufferedRangeDuration < state.delaySeconds) {
        return null;
      }

      const bufferedTarget = Math.max(bufferedRangeStart, bufferedLiveEdge - state.delaySeconds);
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
        ? t("unknownValue")
        : `${formatSeconds(Math.max(0, liveEdge - currentTime))}`;

    if (state.directAudio && !buffered.length) {
      if (state.delaySeconds === 0) {
        setBufferStatus("loadingDirectAudioStatus");
      } else {
        setBufferStatus(...getDelayWaitStatus());
      }
    } else if (!buffered.length) {
      setBufferStatus(state.delaySeconds === 0 ? "liveStatus" : "noBufferedAudio");
    } else if (elements.audio.paused) {
      setBufferStatus(isTimeBuffered(currentTime) ? "pausedRetainedStatus" : "pausedExpiredStatus");
    } else if (bufferedAhead < 1) {
      setBufferStatus(state.delaySeconds === 0 ? "liveStatus" : "bufferingAudioStatus");
    } else if (state.delaySeconds === 0) {
      setBufferStatus("liveStatus");
    } else {
      setBufferStatus("bufferedAheadStatus", { seconds: formatSeconds(bufferedAhead) });
    }
  }

  function getDelayWaitStatus() {
    return state.delaySeconds === 0 ? ["liveStatus"] : ["waitingForDelayStatus", { delay: formatSeconds(state.delaySeconds) }];
  }

  function getPlaybackPositionMessage() {
    if (state.directAudio) {
      return state.delaySeconds === 0
        ? ["directLiveMessage"]
        : ["directDelayMessage", { delay: formatSeconds(state.delaySeconds) }];
    }

    return state.delaySeconds === 0
      ? ["liveMessage"]
      : ["delayMessage", { delay: formatSeconds(state.delaySeconds) }];
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
      setError("pausedExpiredError");
      updateControlState();
    }
  }

  function handleHlsError(data) {
    if (!data) {
      setError("unknownHlsError");
      return;
    }

    if (!data.fatal) {
      if (data.details) {
        setMessage("recoverableHlsWarning", { detail: humanizeHlsDetail(data.details) });
      }
      return;
    }

    const HlsConstructor = window.Hls;
    if (data.type === HlsConstructor.ErrorTypes.NETWORK_ERROR && state.fatalNetworkRecoveries < MAX_RECOVERY_ATTEMPTS) {
      state.fatalNetworkRecoveries += 1;
      setStatus("recoveringNetworkStatus");
      setMessage("recoveringNetworkMessage");
      state.hls.startLoad();
      return;
    }

    if (data.type === HlsConstructor.ErrorTypes.MEDIA_ERROR && state.fatalMediaRecoveries < MAX_RECOVERY_ATTEMPTS) {
      state.fatalMediaRecoveries += 1;
      setStatus("recoveringMediaStatus");
      setMessage("recoveringMediaMessage");
      state.hls.recoverMediaError();
      return;
    }

    setStatus("errorStatus");
    setError(...getHlsErrorMessage(data));
    state.wantsPlayback = false;
    updateControlState();
  }

  function getHlsErrorMessage(data) {
    const detail = data.details ? humanizeHlsDetail(data.details) : t("unknownHlsDetail");

    if (String(data.details || "").includes("manifest")) {
      return ["hlsManifestError", { detail }];
    }

    if (String(data.details || "").includes("frag") || String(data.details || "").includes("level")) {
      return ["hlsFragError", { detail }];
    }

    if (String(data.details || "").includes("buffer") || data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
      return ["hlsBufferError", { detail }];
    }

    return ["hlsGenericError", { detail }];
  }

  function handleMediaError() {
    const mediaError = elements.audio.error;
    const messageKeys = {
      1: "mediaAbortedError",
      2: "mediaNetworkError",
      3: "mediaDecodeError",
      4: "mediaUnsupportedError",
    };
    setStatus("errorStatus");
    setError(messageKeys[mediaError && mediaError.code] || "mediaUnknownError");
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
    state.directAudio = false;
    state.lastMetadataTitle = "";

    setStatus("idleStatus");
    setBufferStatus("noBufferedAudio");
    elements.bufferedDuration.textContent = "0.0s";
    elements.liveDistance.textContent = t("unknownValue");
    elements.streamTitle.textContent = t("noStreamLoaded");
    clearError();
    setMessage(null);
    updateControlState();
  }

  function setStatus(key, params) {
    state.statusKey = key;
    state.statusParams = params || null;
    elements.connectionStatus.textContent = key ? t(key, params) : "";
  }

  function setBufferStatus(key, params) {
    state.bufferStatusKey = key;
    state.bufferStatusParams = params || null;
    elements.bufferStatus.textContent = key ? t(key, params) : "";
  }

  function setMessage(key, params) {
    state.messageKey = key;
    state.messageParams = params || null;
    elements.messageArea.textContent = key ? t(key, params) : "";
  }

  function setError(key, params) {
    state.errorKey = key;
    state.errorParams = params || null;
    elements.errorArea.textContent = key ? t(key, params) : "";
  }

  function clearError() {
    setError(null);
  }

  function setPopularStreamsStatus(key) {
    state.popularStreamsStatusKey = key;
    elements.popularStreamsStatus.textContent = key ? t(key) : "";
  }

  function refreshTranslatedUi() {
    elements.connectionStatus.textContent = state.statusKey ? t(state.statusKey, state.statusParams) : "";
    elements.bufferStatus.textContent = state.bufferStatusKey ? t(state.bufferStatusKey, state.bufferStatusParams) : "";
    elements.messageArea.textContent = state.messageKey ? t(state.messageKey, state.messageParams) : "";
    elements.errorArea.textContent = state.errorKey ? t(state.errorKey, state.errorParams) : "";
    elements.popularStreamsStatus.textContent = state.popularStreamsStatusKey ? t(state.popularStreamsStatusKey) : "";

    if (!state.streamUrl) {
      elements.streamTitle.textContent = t("noStreamLoaded");
    }

    elements.themeToggle.querySelector(".theme-toggle-label").textContent =
      document.documentElement.dataset.theme === "light" ? t("themeModeLight") : t("themeModeDark");

    updateBufferReadout();
    updateMediaSession();
  }

  window.addEventListener("driftplay:languagechange", refreshTranslatedUi);

  function updateControlState() {
    const isPlaying = state.isLoaded && !elements.audio.paused;
    const delay = Number.parseFloat(elements.delaySeconds.value) || 0;

    elements.playButton.disabled = state.isLoading || isPlaying;
    elements.stopButton.disabled = !isPlaying;
    elements.delayDecrease.disabled = delay <= MIN_DELAY_SECONDS;
    elements.delayIncrease.disabled = delay >= MAX_DELAY_SECONDS;
  }

  function updateMediaSession() {
    if (!("mediaSession" in navigator) || !("MediaMetadata" in window)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.lastMetadataTitle || getStreamTitle(state.streamUrl) || t("mediaSessionDefaultTitle"),
      artist: "DriftPlay",
      album: t("mediaSessionAlbum"),
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

  function isLikelyHlsUrl(streamUrl) {
    try {
      return new URL(streamUrl).pathname.toLowerCase().endsWith(".m3u8");
    } catch {
      return /\.m3u8(?:$|[?#])/i.test(streamUrl);
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

  function formatDelayValue(delay) {
    return Number.isInteger(delay) ? String(delay) : String(delay);
  }

  function formatSeconds(seconds) {
    return `${Number(seconds).toFixed(1)}s`;
  }
})();
