(() => {
  "use strict";

  const STORAGE_KEY = "driftplay-lang";
  const DEFAULT_LANG = "en";
  const SUPPORTED_LANGS = ["en", "ca", "es"];

  const translations = {
    en: {
      eyebrow: "Audio-only live stream player",
      lede:
        "Load a CORS-enabled HLS or direct audio stream and listen behind the live edge with a configurable delay buffer where available.",
      themeModeLight: "Light mode",
      themeModeDark: "Dark mode",
      langSwitcherAriaLabel: "Language",
      popularStreamsTitle: "Popular streams",
      popularStreamsDesc: "Choose a predefined CORS-enabled HLS audio stream.",
      popularStreamsLoading: "Loading popular streams...",
      popularStreamsUnavailable: "Popular streams are unavailable right now.",
      popularStreamsLoadError: "Popular streams could not be loaded.",
      popularStreamsSliderAriaLabel: "Scroll popular streams",
      streamUrlLabel: "Audio stream URL",
      streamUrlPlaceholder: "https://example.com/live/audio.m3u8 or https://example.com/live/audio.mp3",
      playButton: "Play",
      stopButton: "Stop",
      playerTitle: "Audio player",
      noStreamLoaded: "No stream loaded",
      delayLabel: "Delay in seconds",
      delayDecreaseAria: "Decrease delay",
      delayIncreaseAria: "Increase delay",
      connectionLabel: "Connection",
      idleStatus: "Idle",
      bufferingLabel: "Buffering",
      noBufferedAudio: "No buffered audio",
      bufferedDurationLabel: "Buffered duration",
      liveDistanceLabel: "Estimated live-edge distance",
      unknownValue: "Unknown",
      delayInvalid: "Delay must be zero or a positive finite number.",
      delayRange: "Delay must be between {min} and {max} seconds.",
      enterUrl: "Enter an audio stream URL.",
      enterValidUrl: "Enter a valid absolute URL.",
      httpsOnly: "The stream URL must use HTTP or HTTPS.",
      loadingStreamStatus: "Loading stream",
      loadingHlsMessage:
        "Loading the live HLS audio stream. Playback will begin when enough buffered audio is available.",
      loadingDirectMessage: "Loading the direct audio stream. Delay support depends on the browser and stream.",
      hlsUnsupported: "This browser does not support HLS audio playback.",
      delayChangedPending: "Delay changed to {delay}. It will be used when the stream is ready.",
      delayChangedWaiting: "Delay changed to {delay}. Waiting until that position is available in the buffer.",
      waitingForBuffer: "Waiting for enough buffered audio before playback starts.",
      streamLoadedStatus: "Stream loaded",
      finiteHlsStream: "Loaded a finite HLS audio stream. Delay controls are optimized for live streams.",
      bufferingAudioStatus: "Buffering audio",
      playingStatus: "Playing",
      pausedStatus: "Paused",
      pausedResumableMessage: "Paused position will remain resumable while it stays in the local buffer.",
      audioOnlySelected: "Selected an audio-only HLS variant.",
      videoOnlyError: "This stream appears to contain video without a supported audio variant.",
      noAudioOnlyVariant:
        "No audio-only variant was advertised. DriftPlay will use audio playback only; video tracks are not shown.",
      loadBeforePlay: "Load an audio stream before starting playback.",
      pausedExpiredResume:
        "The paused position is no longer in the local buffer. Load the stream again or start closer to live.",
      bufferingDirectUntil: "Buffering direct audio until {delay} of delay is available.",
      liveStatus: "Live",
      loadingDirectAudioStatus: "Loading direct audio",
      pausedRetainedStatus: "Paused position retained",
      pausedExpiredStatus: "Paused position expired",
      waitingForDelayStatus: "Waiting for {delay} of audio",
      bufferedAheadStatus: "{seconds} buffered ahead",
      directLiveMessage: "Direct audio playback is live.",
      directDelayMessage: "Direct audio playback is running {delay} behind the stream buffer.",
      liveMessage: "Audio playback is live.",
      delayMessage: "Audio playback is running {delay} behind the live edge.",
      pausedExpiredError:
        "The paused position has expired from the local buffer. Resume closer to live or reload the stream.",
      unknownHlsError: "An unknown HLS playback error occurred.",
      recoverableHlsWarning: "Recoverable HLS warning: {detail}.",
      recoveringNetworkStatus: "Recovering network",
      recoveringNetworkMessage: "Recovering from a network error while loading the HLS stream.",
      recoveringMediaStatus: "Recovering media",
      recoveringMediaMessage: "Recovering from a media decoding or buffer error.",
      errorStatus: "Error",
      hlsManifestError: "The HLS manifest could not be loaded or parsed ({detail}). Check the URL and CORS headers.",
      hlsFragError:
        "The stream media segments could not be loaded ({detail}). Check CORS, network access, and HLS manifest availability.",
      hlsBufferError:
        "The browser could not buffer or decode this audio stream ({detail}). The codec may be unsupported or the stream may contain incompatible video.",
      hlsGenericError: "HLS playback failed ({detail}). Check stream compatibility, CORS, and network access.",
      mediaAbortedError: "Audio playback was aborted.",
      mediaNetworkError: "A network error stopped audio playback. Check connectivity and CORS access.",
      mediaDecodeError:
        "The browser could not decode this stream. The audio codec may be unsupported or the stream may contain incompatible video.",
      mediaUnsupportedError: "The audio source is unsupported or unavailable.",
      mediaUnknownError: "An unknown media playback error occurred.",
      readyStatus: "Ready",
      autoplayBlocked:
        "Playback was blocked by browser autoplay policy. Use the audio element controls to start audio.",
      playbackFailed: "The browser could not start audio playback. Check codec support and stream compatibility.",
      mediaSessionDefaultTitle: "DriftPlay audio stream",
      mediaSessionAlbum: "Live audio",
      unknownHlsDetail: "unknown HLS error",
      footerMadeBy: "Made by",
      footerSourceLink: "Source on GitHub",
    },
    ca: {
      eyebrow: "Reproductor d'àudio en directe",
      lede:
        "Carrega una emissió HLS o d'àudio directe compatible amb CORS i escolta darrere del directe amb un marge de retard configurable quan estigui disponible.",
      themeModeLight: "Mode clar",
      themeModeDark: "Mode fosc",
      langSwitcherAriaLabel: "Idioma",
      popularStreamsTitle: "Emissores populars",
      popularStreamsDesc: "Tria una emissió d'àudio HLS predefinida compatible amb CORS.",
      popularStreamsLoading: "Carregant emissores populars...",
      popularStreamsUnavailable: "Les emissores populars no estan disponibles ara mateix.",
      popularStreamsLoadError: "No s'han pogut carregar les emissores populars.",
      popularStreamsSliderAriaLabel: "Desplaça les emissores populars",
      streamUrlLabel: "URL de l'emissió d'àudio",
      streamUrlPlaceholder: "https://example.com/live/audio.m3u8 o https://example.com/live/audio.mp3",
      playButton: "Reprodueix",
      stopButton: "Atura",
      playerTitle: "Reproductor d'àudio",
      noStreamLoaded: "Cap emissió carregada",
      delayLabel: "Retard en segons",
      delayDecreaseAria: "Disminueix el retard",
      delayIncreaseAria: "Augmenta el retard",
      connectionLabel: "Connexió",
      idleStatus: "Inactiu",
      bufferingLabel: "Memòria intermèdia",
      noBufferedAudio: "Sense àudio en memòria intermèdia",
      bufferedDurationLabel: "Durada en memòria intermèdia",
      liveDistanceLabel: "Distància estimada respecte al directe",
      unknownValue: "Desconegut",
      delayInvalid: "El retard ha de ser zero o un número finit positiu.",
      delayRange: "El retard ha d'estar entre {min} i {max} segons.",
      enterUrl: "Introdueix una URL d'emissió d'àudio.",
      enterValidUrl: "Introdueix una URL absoluta vàlida.",
      httpsOnly: "La URL de l'emissió ha d'utilitzar HTTP o HTTPS.",
      loadingStreamStatus: "Carregant emissió",
      loadingHlsMessage:
        "Carregant l'emissió d'àudio HLS en directe. La reproducció començarà quan hi hagi prou àudio en memòria intermèdia.",
      loadingDirectMessage:
        "Carregant l'emissió d'àudio directe. El suport de retard depèn del navegador i de l'emissió.",
      hlsUnsupported: "Aquest navegador no admet la reproducció d'àudio HLS.",
      delayChangedPending: "Retard canviat a {delay}. S'utilitzarà quan l'emissió estigui llesta.",
      delayChangedWaiting:
        "Retard canviat a {delay}. Esperant que aquesta posició estigui disponible a la memòria intermèdia.",
      waitingForBuffer: "Esperant prou àudio en memòria intermèdia abans de començar la reproducció.",
      streamLoadedStatus: "Emissió carregada",
      finiteHlsStream:
        "S'ha carregat una emissió HLS finita. Els controls de retard estan optimitzats per a emissions en directe.",
      bufferingAudioStatus: "Emmagatzemant àudio en memòria intermèdia",
      playingStatus: "Reproduint",
      pausedStatus: "En pausa",
      pausedResumableMessage:
        "La posició en pausa continuarà sent represa mentre romangui a la memòria intermèdia local.",
      audioOnlySelected: "S'ha seleccionat una variant HLS només d'àudio.",
      videoOnlyError: "Aquesta emissió sembla contenir vídeo sense cap variant d'àudio compatible.",
      noAudioOnlyVariant:
        "No s'ha anunciat cap variant només d'àudio. DriftPlay només reproduirà l'àudio; les pistes de vídeo no es mostren.",
      loadBeforePlay: "Carrega una emissió d'àudio abans d'iniciar la reproducció.",
      pausedExpiredResume:
        "La posició en pausa ja no és a la memòria intermèdia local. Torna a carregar l'emissió o comença més a prop del directe.",
      bufferingDirectUntil: "Emmagatzemant àudio directe en memòria intermèdia fins que hi hagi {delay} de retard disponible.",
      liveStatus: "En directe",
      loadingDirectAudioStatus: "Carregant àudio directe",
      pausedRetainedStatus: "Posició en pausa retinguda",
      pausedExpiredStatus: "Posició en pausa caducada",
      waitingForDelayStatus: "Esperant {delay} d'àudio",
      bufferedAheadStatus: "{seconds} per davant en memòria intermèdia",
      directLiveMessage: "La reproducció d'àudio directe és en directe.",
      directDelayMessage: "La reproducció d'àudio directe va {delay} per darrere de la memòria intermèdia de l'emissió.",
      liveMessage: "La reproducció d'àudio és en directe.",
      delayMessage: "La reproducció d'àudio va {delay} per darrere del directe.",
      pausedExpiredError:
        "La posició en pausa ha caducat a la memòria intermèdia local. Reprèn més a prop del directe o torna a carregar l'emissió.",
      unknownHlsError: "S'ha produït un error desconegut de reproducció HLS.",
      recoverableHlsWarning: "Avís HLS recuperable: {detail}.",
      recoveringNetworkStatus: "Recuperant xarxa",
      recoveringNetworkMessage: "Recuperant-se d'un error de xarxa en carregar l'emissió HLS.",
      recoveringMediaStatus: "Recuperant contingut",
      recoveringMediaMessage: "Recuperant-se d'un error de descodificació o de memòria intermèdia.",
      errorStatus: "Error",
      hlsManifestError:
        "No s'ha pogut carregar o analitzar el manifest HLS ({detail}). Comprova la URL i les capçaleres CORS.",
      hlsFragError:
        "No s'han pogut carregar els segments multimèdia de l'emissió ({detail}). Comprova CORS, l'accés a la xarxa i la disponibilitat del manifest HLS.",
      hlsBufferError:
        "El navegador no ha pogut emmagatzemar o descodificar aquesta emissió d'àudio ({detail}). És possible que el còdec no sigui compatible o que l'emissió contingui vídeo incompatible.",
      hlsGenericError: "La reproducció HLS ha fallat ({detail}). Comprova la compatibilitat de l'emissió, CORS i l'accés a la xarxa.",
      mediaAbortedError: "La reproducció d'àudio s'ha interromput.",
      mediaNetworkError: "Un error de xarxa ha aturat la reproducció d'àudio. Comprova la connectivitat i l'accés CORS.",
      mediaDecodeError:
        "El navegador no ha pogut descodificar aquesta emissió. És possible que el còdec d'àudio no sigui compatible o que l'emissió contingui vídeo incompatible.",
      mediaUnsupportedError: "La font d'àudio no és compatible o no està disponible.",
      mediaUnknownError: "S'ha produït un error desconegut de reproducció multimèdia.",
      readyStatus: "Preparat",
      autoplayBlocked:
        "La política de reproducció automàtica del navegador ha bloquejat la reproducció. Utilitza els controls de l'element d'àudio per iniciar-la.",
      playbackFailed: "El navegador no ha pogut iniciar la reproducció d'àudio. Comprova la compatibilitat del còdec i de l'emissió.",
      mediaSessionDefaultTitle: "Emissió d'àudio de DriftPlay",
      mediaSessionAlbum: "Àudio en directe",
      unknownHlsDetail: "error HLS desconegut",
      footerMadeBy: "Fet per",
      footerSourceLink: "Codi font a GitHub",
    },
    es: {
      eyebrow: "Reproductor de audio en directo",
      lede:
        "Carga una emisión HLS o de audio directo compatible con CORS y escucha detrás del directo con un margen de retardo configurable cuando esté disponible.",
      themeModeLight: "Modo claro",
      themeModeDark: "Modo oscuro",
      langSwitcherAriaLabel: "Idioma",
      popularStreamsTitle: "Emisoras populares",
      popularStreamsDesc: "Elige una emisión de audio HLS predefinida compatible con CORS.",
      popularStreamsLoading: "Cargando emisoras populares...",
      popularStreamsUnavailable: "Las emisoras populares no están disponibles en este momento.",
      popularStreamsLoadError: "No se han podido cargar las emisoras populares.",
      popularStreamsSliderAriaLabel: "Desplazar emisoras populares",
      streamUrlLabel: "URL de la emisión de audio",
      streamUrlPlaceholder: "https://example.com/live/audio.m3u8 o https://example.com/live/audio.mp3",
      playButton: "Reproducir",
      stopButton: "Detener",
      playerTitle: "Reproductor de audio",
      noStreamLoaded: "No se ha cargado ninguna emisión",
      delayLabel: "Retardo en segundos",
      delayDecreaseAria: "Disminuir el retardo",
      delayIncreaseAria: "Aumentar el retardo",
      connectionLabel: "Conexión",
      idleStatus: "Inactivo",
      bufferingLabel: "Búfer",
      noBufferedAudio: "Sin audio en búfer",
      bufferedDurationLabel: "Duración en búfer",
      liveDistanceLabel: "Distancia estimada al directo",
      unknownValue: "Desconocido",
      delayInvalid: "El retardo debe ser cero o un número finito positivo.",
      delayRange: "El retardo debe estar entre {min} y {max} segundos.",
      enterUrl: "Introduce una URL de emisión de audio.",
      enterValidUrl: "Introduce una URL absoluta válida.",
      httpsOnly: "La URL de la emisión debe usar HTTP o HTTPS.",
      loadingStreamStatus: "Cargando emisión",
      loadingHlsMessage:
        "Cargando la emisión de audio HLS en directo. La reproducción comenzará cuando haya suficiente audio en búfer.",
      loadingDirectMessage: "Cargando la emisión de audio directo. El soporte de retardo depende del navegador y de la emisión.",
      hlsUnsupported: "Este navegador no admite la reproducción de audio HLS.",
      delayChangedPending: "Retardo cambiado a {delay}. Se aplicará cuando la emisión esté lista.",
      delayChangedWaiting: "Retardo cambiado a {delay}. Esperando a que esa posición esté disponible en el búfer.",
      waitingForBuffer: "Esperando suficiente audio en búfer antes de iniciar la reproducción.",
      streamLoadedStatus: "Emisión cargada",
      finiteHlsStream: "Se ha cargado una emisión HLS finita. Los controles de retardo están optimizados para emisiones en directo.",
      bufferingAudioStatus: "Almacenando audio en búfer",
      playingStatus: "Reproduciendo",
      pausedStatus: "En pausa",
      pausedResumableMessage: "La posición en pausa seguirá siendo recuperable mientras permanezca en el búfer local.",
      audioOnlySelected: "Se ha seleccionado una variante HLS solo de audio.",
      videoOnlyError: "Esta emisión parece contener vídeo sin ninguna variante de audio compatible.",
      noAudioOnlyVariant:
        "No se anunció ninguna variante solo de audio. DriftPlay reproducirá únicamente el audio; las pistas de vídeo no se muestran.",
      loadBeforePlay: "Carga una emisión de audio antes de iniciar la reproducción.",
      pausedExpiredResume:
        "La posición en pausa ya no está en el búfer local. Vuelve a cargar la emisión o empieza más cerca del directo.",
      bufferingDirectUntil: "Almacenando audio directo en búfer hasta que haya {delay} de retardo disponible.",
      liveStatus: "En directo",
      loadingDirectAudioStatus: "Cargando audio directo",
      pausedRetainedStatus: "Posición en pausa conservada",
      pausedExpiredStatus: "Posición en pausa caducada",
      waitingForDelayStatus: "Esperando {delay} de audio",
      bufferedAheadStatus: "{seconds} por delante en búfer",
      directLiveMessage: "La reproducción de audio directo está en directo.",
      directDelayMessage: "La reproducción de audio directo va {delay} por detrás del búfer de la emisión.",
      liveMessage: "La reproducción de audio está en directo.",
      delayMessage: "La reproducción de audio va {delay} por detrás del directo.",
      pausedExpiredError:
        "La posición en pausa ha caducado en el búfer local. Reanuda más cerca del directo o vuelve a cargar la emisión.",
      unknownHlsError: "Se ha producido un error desconocido de reproducción HLS.",
      recoverableHlsWarning: "Aviso HLS recuperable: {detail}.",
      recoveringNetworkStatus: "Recuperando red",
      recoveringNetworkMessage: "Recuperándose de un error de red al cargar la emisión HLS.",
      recoveringMediaStatus: "Recuperando contenido",
      recoveringMediaMessage: "Recuperándose de un error de decodificación o de búfer.",
      errorStatus: "Error",
      hlsManifestError: "No se pudo cargar o analizar el manifiesto HLS ({detail}). Comprueba la URL y las cabeceras CORS.",
      hlsFragError:
        "No se pudieron cargar los segmentos multimedia de la emisión ({detail}). Comprueba CORS, el acceso a la red y la disponibilidad del manifiesto HLS.",
      hlsBufferError:
        "El navegador no pudo almacenar en búfer o decodificar esta emisión de audio ({detail}). Puede que el códec no sea compatible o que la emisión contenga vídeo incompatible.",
      hlsGenericError: "La reproducción HLS ha fallado ({detail}). Comprueba la compatibilidad de la emisión, CORS y el acceso a la red.",
      mediaAbortedError: "La reproducción de audio se ha interrumpido.",
      mediaNetworkError: "Un error de red detuvo la reproducción de audio. Comprueba la conectividad y el acceso CORS.",
      mediaDecodeError:
        "El navegador no pudo decodificar esta emisión. Puede que el códec de audio no sea compatible o que la emisión contenga vídeo incompatible.",
      mediaUnsupportedError: "La fuente de audio no es compatible o no está disponible.",
      mediaUnknownError: "Se ha producido un error desconocido de reproducción multimedia.",
      readyStatus: "Listo",
      autoplayBlocked:
        "La política de reproducción automática del navegador ha bloqueado la reproducción. Usa los controles del elemento de audio para iniciarla.",
      playbackFailed: "El navegador no pudo iniciar la reproducción de audio. Comprueba la compatibilidad del códec y de la emisión.",
      mediaSessionDefaultTitle: "Emisión de audio de DriftPlay",
      mediaSessionAlbum: "Audio en directo",
      unknownHlsDetail: "error HLS desconocido",
      footerMadeBy: "Hecho por",
      footerSourceLink: "Código fuente en GitHub",
    },
  };

  function detectLanguage() {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) {
      return saved;
    }

    const browserLang = String(navigator.language || DEFAULT_LANG).slice(0, 2).toLowerCase();
    return SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG;
  }

  let currentLang = detectLanguage();

  function t(key, params) {
    const dict = translations[currentLang] || translations[DEFAULT_LANG];
    let text = (dict && dict[key]) || translations[DEFAULT_LANG][key] || key;

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replaceAll(`{${paramKey}}`, params[paramKey]);
      });
    }

    return text;
  }

  function getLanguage() {
    return currentLang;
  }

  function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang) || lang === currentLang) {
      return;
    }

    currentLang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    applyStaticTranslations();
    updateLangSwitcherState();
    window.dispatchEvent(new CustomEvent("driftplay:languagechange", { detail: { lang } }));
  }

  function applyStaticTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.getAttribute("data-i18n-aria-label")));
    });
  }

  function updateLangSwitcherState() {
    document.querySelectorAll(".lang-option").forEach((button) => {
      const isActive = button.dataset.lang === currentLang;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function initLangSwitcher() {
    document.querySelectorAll(".lang-option").forEach((button) => {
      button.addEventListener("click", () => setLanguage(button.dataset.lang));
    });
    updateLangSwitcherState();
  }

  document.documentElement.lang = currentLang;
  applyStaticTranslations();
  initLangSwitcher();

  window.DriftPlayI18n = { t, getLanguage, setLanguage, SUPPORTED_LANGS };
})();
