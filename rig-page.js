'use strict';

/* Página rigged: canvas, câmara, loop e UI comum ao rigged.html e ao studio.html.
   O tracker (MediaPipe) é injectado porque só carrega como módulo ESM. */
function startRigPage(opts) {
  const FaceLandmarker = opts.FaceLandmarker;
  const FilesetResolver = opts.FilesetResolver;

  const canvas = document.getElementById('render');
  const ctx = canvas.getContext('2d');
  const video = document.getElementById('cam');
  const titleEl = document.getElementById('txt-title');
  const descEl = document.getElementById('txt-description');
  const IS_MOBILE = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const DPR = Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.5 : 2);
  let W = 0, H = 0;

  /* O tamanho do canvas é decidido pelo CSS da página (ecrã inteiro no desktop, bloco
     no topo do fluxo em mobile) — aqui só se acerta o buffer interno a essa caixa. */
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = W * DPR; canvas.height = H * DPR;
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  resize();

  const api = { model: null, rig: null, pal: null, id: '', SENS: Object.assign({}, SENS_DEFAULTS), loadCritter, setStatus };

  /* um erro de JS aqui deixava a página a dizer "loading face tracker…" para sempre, sem
     pista nenhuma — e num telemóvel não há consola à mão. Passa a aparecer no ecrã. */
  function mostrarErro(msg) {
    try {
      descEl.textContent = '⚠ ' + msg;
      descEl.style.background = '#c0261e';
      descEl.style.color = '#fff';
      descEl.style.padding = '6px 8px';
    } catch (e) {}
  }
  window.addEventListener('error', e => mostrarErro((e.message || 'erro') + ' @ ' + (e.filename || '').split('/').pop() + ':' + (e.lineno || '?')));
  window.addEventListener('unhandledrejection', e => mostrarErro('promessa rejeitada: ' + ((e.reason && e.reason.message) || e.reason)));

  function luminance(hex) {
    const r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    return (299 * r + 587 * g + 114 * b) / 1000;
  }

  function loadCritter(id) {
    api.id = id;
    const cfg = loadCritterCfg(id);
    const model = buildModel(id, { rig: true, traits: cfg.traits });
    for (const sh of model.shapes) sh.intensity = Math.max(5, sh.intensity);
    api.model = model;
    api.rig = buildRig(model);
    api.pal = model.palette;
    api.SENS = resolveSens(id);
    api.sensLocal = !!cfg.sens;   /* este avatar tem sensibilidades próprias? */
    if (cfg.bg) api.pal.bg = cfg.bg;
    document.body.style.background = api.pal.bg;
    window.location.hash = id;

    titleEl.textContent = 'the critter @' + id + ' — ' + opts.label;
    const fg = luminance(api.pal.bg) >= 128 ? '#000' : '#fff';
    titleEl.style.color = fg; descEl.style.color = fg;
    setStatus(tracking ? (cal.ready ? 'tracking — express yourself' : 'calibrating — look neutral at the camera…') : lastStatus);
    if (api.renderFavs) api.renderFavs();
    if (opts.onLoad) opts.onLoad(api);
  }

  let lastStatus = 'loading face tracker…';
  function setStatus(t) {
    lastStatus = t;
    if (!debugMode) descEl.textContent = api.model.traits.join(' · ') + ' — ' + t;
  }

  const sig = createSig();
  let cal = createCalib();
  let tracking = false;
  const mouse = { x: 0, y: 0, down: false };
  const idleState = {};
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mousedown', () => mouse.down = true);
  window.addEventListener('mouseup', () => mouse.down = false);
  window.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { mouse.x = t.clientX; mouse.y = t.clientY; } mouse.down = true; }, { passive: true });
  window.addEventListener('touchmove', e => { const t = e.touches[0]; if (t) { mouse.x = t.clientX; mouse.y = t.clientY; } }, { passive: true });
  window.addEventListener('touchend', () => mouse.down = false);

  let debugMode = false;
  window.addEventListener('keydown', e => {
    if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.keyCode === 76) loadCritter(randomId());
    else if (e.keyCode === 83) savePng();
    else if (e.keyCode === 68) { debugMode = !debugMode; if (!debugMode) setStatus(lastStatus); }
  });

  let landmarker = null;
  async function startTracking() {
    /* O browser só dá a câmara em contexto seguro: https, localhost ou file://. Servido
       por http num IP (o caso do homelab), o getUserMedia nem chega a pedir autorização —
       e antes isto aparecia como "no camera", que manda depurar para o lado errado. */
    if (!window.isSecureContext && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
      tracking = false;
      video.style.display = 'none';
      setStatus('a câmara precisa de https (ou localhost) — nesta ligação o browser nem chega a pedir autorização. modo rato: move = olhar, clica = abrir a boca');
      return;
    }
    try {
      const fileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
      const mkOpts = del => ({
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: del
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true
      });
      try {
        landmarker = await FaceLandmarker.createFromOptions(fileset, mkOpts('GPU'));
      } catch (e) {
        landmarker = await FaceLandmarker.createFromOptions(fileset, mkOpts('CPU'));
      }
      const camW = IS_MOBILE ? 480 : 640, camH = IS_MOBILE ? 360 : 480;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: camW, height: camH, facingMode: 'user' } });
      video.srcObject = stream;
      await video.play();
      tracking = true;
      setStatus('calibrating — look neutral at the camera…');
    } catch (err) {
      tracking = false;
      video.style.display = 'none';
      const name = err && err.name ? err.name : '';
      const porque = name === 'NotAllowedError' ? 'autorização da câmara negada'
        : name === 'NotFoundError' ? 'não há câmara'
        : name === 'NotReadableError' ? 'a câmara está a ser usada por outra app'
        : name ? ('erro do tracker: ' + name) : 'sem câmara nem tracker';
      setStatus(porque + ' — modo rato: move = olhar, clica = abrir a boca');
    }
  }

  let detTick = 0, lastTs = -1;
  function frame(now) {
    requestAnimationFrame(frame);

    detTick++;
    if (tracking && landmarker && video.readyState >= 2 && (!IS_MOBILE || detTick % 2 === 0)) {
      try {
        const ts = now <= lastTs ? lastTs + 1 : now;
        lastTs = ts;
        const res = landmarker.detectForVideo(video, ts);
        if (res.faceLandmarks && res.faceLandmarks[0]) {
          let bs = null;
          if (res.faceBlendshapes && res.faceBlendshapes[0]) {
            bs = {};
            for (const c of res.faceBlendshapes[0].categories) bs[c.categoryName] = c.score;
          }
          const was = !!cal.ready;
          processLandmarks(res.faceLandmarks[0], bs, sig, cal, api.SENS);
          if (!was && cal.ready) setStatus('tracking — express yourself');
        }
      } catch (e) { /* um frame falhado do tracker não pode parar o desenho */ }
    } else if (!tracking) {
      /* em mobile o canvas já não começa em (0,0): as coordenadas do rato/toque têm de
         passar a ser relativas à caixa dele, senão o olhar fica torto */
      const r = canvas.getBoundingClientRect();
      applyIdle(sig, { x: mouse.x - r.left, y: mouse.y - r.top, down: mouse.down }, W, H, idleState);
    }

    if (debugMode) {
      descEl.textContent = 'blinkL ' + sig.blinkL.toFixed(2) + ' · blinkR ' + sig.blinkR.toFixed(2) +
        ' · jaw ' + sig.mouth.toFixed(2) + ' · yaw ' + sig.yaw.toFixed(2) + ' · pitch ' + sig.pitch.toFixed(2) +
        ' · roll ' + sig.roll.toFixed(2) + ' · gaze ' + sig.gx.toFixed(2) + ',' + sig.gy.toFixed(2) +
        ' · joy ' + sig.joy.toFixed(2) + ' · wide ' + sig.wide.toFixed(2) +
        ' · pk ' + sig.pucker.toFixed(2) + ' · fn ' + sig.funnel.toFixed(2) + ' · st ' + sig.stretch.toFixed(2) + ' · jx ' + sig.jawX.toFixed(2) + ' · pr ' + sig.press.toFixed(2) +
        (api.SENS.speechV2 > 0 ? ' · V2' : ' · V1');
    }

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = api.pal.bg;
    ctx.fillRect(0, 0, W, H);

    const S = Math.min(W, H) / 470;
    const shift = rigHeadShift(sig, api.SENS);
    ctx.save();
    ctx.translate(W / 2 + shift.x * S, H / 2 + shift.y * S);
    ctx.rotate(sig.roll * 0.5);
    ctx.scale(S, S);
    if (api.model) {
      applyRig(api.model, api.rig, sig, api.SENS, now);
      drawModel(ctx, api.model, sig, api.SENS);
    }
    ctx.restore();
  }

  function savePng() {
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'critter-rigged-' + api.id + '.png';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
  api.savePng = savePng;

  /* ---------- gravação de vídeo: o canvas + o microfone ----------
     captureStream dá um MediaStream do que está a ser desenhado; junta-se-lhe a faixa
     de áudio do microfone (permissão pedida só aqui, não no arranque) e o MediaRecorder
     escreve um webm. Grava o avatar, não a câmara. */
  /* MP4/H.264+AAC primeiro: é o que se pode mandar a alguém sem pensar — iPhone, WhatsApp,
     QuickTime, tudo. O webm (VP9) é aberto e melhor comprimido, mas o Safari e o WhatsApp
     não o engolem, portanto fica só como recurso para browsers sem MP4 (Firefox).
     O perfil avc1.42E01E é o baseline, o mais compatível que há. */
  const REC_TYPES = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  let recorder = null, recChunks = [], recAudio = null, recStart = 0, recTimer = 0, statusBeforeRec = '';

  function recSupported() {
    return typeof MediaRecorder !== 'undefined' && !!canvas.captureStream;
  }

  async function startRec() {
    if (!recSupported()) { setStatus('este browser não grava vídeo (sem MediaRecorder)'); return; }
    let stream;
    try {
      stream = canvas.captureStream(30);
      /* o pedido de microfone fica pendente enquanto a permissão não for respondida —
         com um await simples a gravação nunca chegava a arrancar e não havia feedback */
      setStatus('à espera da permissão do microfone…');
      try {
        recAudio = await Promise.race([
          navigator.mediaDevices.getUserMedia({ audio: true }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ]);
        for (const t of recAudio.getAudioTracks()) stream.addTrack(t);
      } catch (e) {
        recAudio = null;   /* sem microfone grava-se à mesma, mudo */
      }
      const type = REC_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || '';
      /* `rec` e não `recorder`: o stopRec limpa a variável, e o onstop dispara depois —
         com a variável o blob nunca chegava a ser criado */
      const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 4000000 } : undefined);
      recChunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) recChunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(recChunks, { type: rec.mimeType || 'video/webm' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'critter-' + api.id + (blob.type.indexOf('mp4') >= 0 ? '.mp4' : '.webm');
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        if (recAudio) { for (const t of recAudio.getTracks()) t.stop(); recAudio = null; }
      };
      recorder = rec;
      rec.start(250);
      statusBeforeRec = lastStatus;
      recStart = performance.now();
      recTimer = setInterval(() => {
        const s = Math.floor((performance.now() - recStart) / 1000);
        setStatus('● a gravar ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') +
          (recAudio ? ' (com som)' : ' (sem microfone)') + ' — carrega outra vez para parar');
      }, 250);
      if (opts.onRec) opts.onRec(true);
    } catch (err) {
      recorder = null;
      setStatus('não foi possível gravar: ' + (err && err.name ? err.name : 'erro'));
    }
  }

  function stopRec() {
    clearInterval(recTimer);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recorder = null;
    if (opts.onRec) opts.onRec(false);
    setStatus(statusBeforeRec || (tracking ? 'tracking — express yourself' : 'mouse mode'));
  }

  api.recording = () => !!recorder;
  api.toggleRec = () => (recorder ? (stopRec(), Promise.resolve()) : startRec());

  api.recalibrate = () => {
    cal = createCalib();
    if (tracking) setStatus('calibrating — look neutral at the camera…');
  };

  /* ---------- favoritos ---------- */
  const favBtn = document.getElementById('btn-fav');
  const favBar = document.getElementById('favs');

  function renderFavs() {
    if (favBtn) favBtn.textContent = isFav(api.id) ? '♥ favorito' : '♡ favorito';
    if (!favBar) return;
    const list = loadFavs();
    favBar.innerHTML = '';
    favBar.style.display = list.length ? '' : 'none';
    for (const id of list) {
      const b = document.createElement('button');
      b.className = 'fav-chip' + (id === api.id ? ' on' : '');
      b.textContent = '@' + id.slice(0, 6);
      b.title = id;
      b.addEventListener('click', () => loadCritter(id));
      favBar.appendChild(b);
    }
  }
  api.renderFavs = renderFavs;

  if (favBtn) favBtn.addEventListener('click', () => { toggleFav(api.id); renderFavs(); });

  const recBtn = document.getElementById('btn-rec');
  if (recBtn) {
    if (!recSupported()) recBtn.style.display = 'none';
    recBtn.addEventListener('click', () => {
      api.toggleRec();
      recBtn.textContent = api.recording() ? '■ parar' : '● gravar';
      recBtn.classList.toggle('rec-on', api.recording());
    });
  }

  document.getElementById('btn-random').addEventListener('click', () => loadCritter(randomId()));
  document.getElementById('btn-save').addEventListener('click', savePng);
  document.getElementById('btn-recal').addEventListener('click', api.recalibrate);
  document.getElementById('btn-back').addEventListener('click', () => { window.location.href = 'index.html' + window.location.hash; });

  const h = window.location.hash.slice(1);
  loadCritter(/^[0-9a-z]{6,10}$/.test(h) ? h : randomId());
  renderFavs();
  /* o que estiver no servidor e for mais recente ganha — é isto que faz as preferências
     aparecerem no telemóvel sem exportar nada à mão */
  syncPull().then(veio => { if (veio) { loadCritter(api.id); renderFavs(); } });
  requestAnimationFrame(frame);
  startTracking();
  return api;
}
