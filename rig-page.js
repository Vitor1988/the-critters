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
    /* trocar de avatar troca as sensibilidades (`resolveSens`), e o microfone segue-as:
       se o novo tem os dois controlos de áudio a zero, larga-se já — deixá-lo aberto
       era manter o indicador de gravação do browser aceso a dizer o contrário dos
       controlos. Só o lado de largar: pedir o microfone tem de ficar preso ao gesto
       do utilizador (`ajustaAudio`), fora dele o getUserMedia pode nem ser aceite. */
    if (!(api.SENS.audioMix > 0 || api.SENS.audioVisemes > 0) && auEstado !== 'off') desligarAudio();
    renderMax();
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

  /* ---------- microfone: só a pedido, nunca no arranque ----------
     O slider `áudio` do studio mistura o envelope da voz no alvo de abertura da boca
     (ver `RIG_AUDIO` no engine). A permissão é pedida no momento em que ele sai do
     zero — que é também um gesto do utilizador, e sem gesto o browser não deixa
     abrir um AudioContext. Falhar aqui não pode partir nada: fica em vídeo puro. */
  const auRef = { db: -100, conf: 0, bandas: null };   /* reutilizado, não se aloca um por frame */
  const auBandas = new Float64Array(7);
  let auCtx = null, auAnalyser = null, auStream = null, auBuf = null, auEsp = null, auEstado = 'off';
  /* uma cadeia de `ligarAudio` tem dois `await` pelo meio, e o utilizador continua a
     mexer no slider durante esse tempo. O token diz a cada cadeia se ainda é ela a
     mandar: se mudou, larga o que acabou de obter e não toca no estado. Sem isto,
     zerar o slider com a permissão pendente deixava o microfone aberto com os
     controlos a zero, e o zigue-zague no mesmo arrasto abria dois AudioContexts —
     um deles órfão, e o Chrome só deixa ter ~6 por documento antes de recusar. */
  let auGen = 0;

  /* fecha o par (stream, contexto) venha de onde vier: tanto o larga uma cadeia que
     perdeu a corrida como o desligar normal */
  function largaAudio(stream, ctx) {
    if (stream) for (const t of stream.getTracks()) t.stop();
    if (ctx) { try { ctx.close(); } catch (e) {} }
  }

  /* o áudio não é dono da barra de estado: se a câmara falhou, o que lá está é o
     diagnóstico dela ("precisa de https… modo rato") e é o que interessa ler —
     escrever-lhe por cima "a boca segue a voz e a câmara" era falso nas duas metades */
  function statusAudio(t) {
    if (tracking) setStatus(t);
  }

  async function ligarAudio() {
    /* 'a pedir' e 'on' não se repetem. 'falhou' repete-se de propósito: era um beco sem
       saída — depois de uma negação, voltar a subir o slider não tentava outra vez. O
       browser lembra-se da permissão negada e responde depressa, não há loop de prompts. */
    if (auEstado === 'a pedir' || auEstado === 'on') return;
    const gen = ++auGen;
    auEstado = 'a pedir';
    statusAudio('áudio: à espera da permissão do microfone…');
    let stream = null, ctx = null;
    try {
      /* a supressão de ruído ajuda o gate automático (tira-lhe a ventoinha); o
         cancelamento de eco fica DE FORA porque esta página não reproduz som nenhum —
         não há eco para cancelar, e o APM do WebRTC traz com ele um passa-alto de
         ~80 Hz que morde na banda 50–200 Hz, a mais pesada do centroide das vogais.
         O ganho automático fica de fora por outra razão: normalizava a dinâmica, que
         é precisamente o sinal que se quer. */
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false }
      });
      if (gen !== auGen) { largaAudio(stream, null); return; }
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume();
      if (gen !== auGen) { largaAudio(stream, ctx); return; }
      /* um contexto que não arrancou não entrega amostra nenhuma, e ficar 'on' era
         mentir ao engine: dB de silêncio com confiança 1 dá boca fechada com voz a sair */
      if (ctx.state !== 'running') {
        const e = new Error('AudioContext ' + ctx.state);
        e.name = 'AudioContextParado';
        throw e;
      }
      const analyser = ctx.createAnalyser();
      /* 2048 e não 1024: o `mediAudio` só vê a última janela do analisador, e a 48 kHz
         1024 amostras são 21 ms — com a medição a correr de dois em dois frames em
         mobile, mais de um terço do áudio nunca chegava a ser olhado. 2048 são 43 ms. */
      analyser.fftSize = 2048;
      /* a suavização do espectro fica a zero: quem suaviza é o engine, em
         milissegundos e com ataque e queda próprios — o 0.8 por omissão da
         AnalyserNode é uma constante por frame, exactamente o que a v3 deixou de
         fazer para não mudar de comportamento entre 30 e 60 fps */
      analyser.smoothingTimeConstant = 0;
      /* liga-se à fonte e mais nada: encaminhar isto para as colunas era um larsen */
      ctx.createMediaStreamSource(stream).connect(analyser);
      auStream = stream; auCtx = ctx; auAnalyser = analyser;
      auBuf = new Float32Array(analyser.fftSize);
      auEsp = new Float32Array(analyser.frequencyBinCount);
      auEstado = 'on';
      auRef.conf = 1;
      statusAudio('áudio ligado — a boca segue a voz e a câmara');
    } catch (err) {
      largaAudio(stream, ctx);
      /* se entretanto outra cadeia (ou o desligar) assumiu o comando, o estado é dela:
         esta limpa o que abriu e sai calada */
      if (gen !== auGen) return;
      desligarAudio();
      auEstado = 'falhou';
      const n = err && err.name ? err.name : '';
      statusAudio('áudio: ' + (n === 'NotAllowedError' ? 'permissão do microfone negada'
        : n === 'NotFoundError' ? 'não há microfone'
        : n === 'AudioContextParado' ? 'o browser não deixou o áudio arrancar'
        : 'não arrancou (' + (n || 'erro') + ')') +
        ' — a boca continua só pela câmara');
    }
  }

  function desligarAudio() {
    auGen++;      /* invalida qualquer pedido de microfone ainda pendente */
    largaAudio(auStream, auCtx);
    auStream = null; auCtx = null;
    auAnalyser = null; auBuf = null; auEsp = null;
    auRef.conf = 0; auRef.db = -100; auRef.bandas = null;
    /* o `sig.au` é o estado daquele microfone e daquela sessão: o chão de ruído, o tecto
       e a mediana de brilho ficariam em unidades de um sinal que já não existe — e a
       forma congelada sobreviveria ao mic que a produziu. O engine recria-o à primeira
       utilização do próximo. */
    sig.au = null;
    auEstado = 'off';
  }
  api.ligarAudio = ligarAudio;
  api.desligarAudio = desligarAudio;

  /* fronteiras das 7 bandas do espectro — as mesmas do `capture.py` da bancada */
  const AU_BANDAS_HZ = [50, 200, 400, 800, 1500, 2500, 4000, 8000];

  /* RMS do domínio do tempo -> dB. O engine é que trata do chão de ruído e do gate:
     aqui só se mede, para a bancada offline poder injectar exactamente o mesmo. */
  function mediAudio() {
    if (auEstado !== 'on' || !auAnalyser) return;
    auAnalyser.getFloatTimeDomainData(auBuf);
    let s = 0;
    for (let i = 0; i < auBuf.length; i++) s += auBuf[i] * auBuf[i];
    auRef.db = 20 * Math.log10(Math.sqrt(s / auBuf.length) + 1e-7);

    /* espectro por bandas, só quando alguém o quer (é uma FFT por frame). O zero
       absoluto do Web Audio não é o do ffmpeg da bancada, e não faz diferença
       nenhuma: a derivação no engine vive de *diferenças* entre bandas e do desvio
       face à baseline desta voz — um offset comum desaparece nas duas contas. */
    if (!(api.SENS.audioVisemes > 0)) { auRef.bandas = null; return; }
    auAnalyser.getFloatFrequencyData(auEsp);
    const df = auCtx.sampleRate / auAnalyser.fftSize;
    /* floor no início e ceil no fim, não `round` nos dois: o critério é *conter* a gama
       de frequências pedida, como no `capture.py` da bancada, e não arredondar ao bin
       mais próximo — com o arredondamento a banda mudava de conteúdo conforme o
       sampleRate do aparelho (a 44.1 e a 48 kHz o df não é o mesmo) */
    for (let b = 0; b < 7; b++) {
      const i0 = Math.max(1, Math.floor(AU_BANDAS_HZ[b] / df));
      const i1 = Math.min(auEsp.length, Math.ceil(AU_BANDAS_HZ[b + 1] / df));
      let p = 0, n = 0;
      for (let i = i0; i < i1; i++) { p += Math.pow(10, auEsp[i] / 10); n++; }
      auBandas[b] = n ? 10 * Math.log10(p / n + 1e-14) : -140;
    }
    auRef.bandas = auBandas;
  }

  /* O microfone serve duas coisas com dose própria — a abertura (`audioMix`) e a forma
     das vogais (`audioVisemes`) — e basta uma delas fora do zero para valer a pena
     pedi-lo. A zero as duas, larga-se: o indicador de gravação do browser apaga-se,
     que é o que se espera de controlos a zero.
     A página rigged não tem sliders: usa o que está gravado, como qualquer outra
     sensibilidade. Mas continua a não pedir o microfone no arranque — espera pelo
     primeiro gesto, que é o mínimo que o browser exige de qualquer maneira.
     Além do gesto, corre a cada pointerdown/keydown para apanhar o resto do ciclo de
     vida: um contexto suspenso a meio da sessão, e uma tentativa nova depois de uma
     falha. */
  function ajustaAudio() {
    const quer = api.SENS.audioMix > 0 || api.SENS.audioVisemes > 0;
    if (!quer) { if (auEstado !== 'off') desligarAudio(); return; }
    /* ligar exige câmara: o `mediAudio` só corre no ramo do loop que tem cara detetada,
       portanto em modo rato o microfone abria, acendia o indicador de gravação do
       browser… e ninguém o lia. A zero, o lado de largar acima continua a valer sempre. */
    if (!tracking) return;
    if (auEstado === 'off' || auEstado === 'falhou') ligarAudio();
    /* uma chamada, uma mudança de app no iOS ou um separador que foi para trás suspendem
       um contexto já ligado, e nada o retomava: a engine passava a ver silêncio com
       confiança 1. Isto está pendurado no pointerdown/keydown, que é justamente o gesto
       que o browser exige para retomar. */
    else if (auEstado === 'on' && auCtx && auCtx.state === 'suspended') {
      /* isto corre dentro de um listener de pointerdown: uma excepção daqui subia ao
         window.onerror e pintava a faixa vermelha de erro por causa de um resume */
      try { Promise.resolve(auCtx.resume()).catch(() => {}); } catch (e) {}
    }
  }
  api.ajustaAudio = ajustaAudio;
  window.addEventListener('pointerdown', ajustaAudio);
  window.addEventListener('keydown', ajustaAudio);

  let detTick = 0, lastTs = -1, lastNow = -1;
  function frame(now) {
    requestAnimationFrame(frame);

    /* tempo real desde a última passagem pela cadeia — a fala v3 filtra em ms e não
       em frames, e sem isto um telemóvel a 30 fps teria metade da suavização. Preso
       entre 8 e 250 ms: um separador de browser em segundo plano devolve saltos de
       segundos, e isso faria a boca dar um estalo ao voltar. O tecto era de 50 ms e
       era atingido por construção — em mobile a detecção corre de dois em dois frames,
       o que a 30 fps dá 66.7 ms reais: os filtros integravam a menos e perdia-se cerca
       de um quarto do curso silábico. 250 ms ainda mata o estalo e cobre até uma
       detecção a 4-5 fps. */
    const dt = lastNow < 0 ? 16.7 : Math.min(250, Math.max(8, now - lastNow));

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
          mediAudio();
          processLandmarks(res.faceLandmarks[0], bs, sig, cal, api.SENS, dt, auRef);
          lastNow = now;
          if (!was && cal.ready) setStatus('tracking — express yourself');
          if (maxCal && bs && cal.ready) recolheMaximo(res.faceLandmarks[0], bs);
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
        (api.SENS.speechV3 > 0
          /* na v3, `ap` e `oc` distinguem sinal de pose: se a boca não abre com ap
             alto, quem a está a fechar é a oclusão — e vê-se qual dos dois é */
          ? ' · V3' + (api.SENS.speechAuto > 0 ? '+auto' : '') +
            (sig.v3 ? ' · ap ' + sig.v3.ap.toFixed(2) + ' · oc ' + sig.v3.oc.toFixed(2) : '')
          : api.SENS.speechV2 > 0 ? ' · V2' : ' · V1') +
        /* `au` é o nível DEPOIS do gate: a 0.00 com voz a sair quer dizer que o chão
           de ruído ainda não assentou ou que o gate a está a cortar */
        (api.SENS.audioMix > 0 && auEstado === 'on'
          ? ' · +A au ' + (sig.au ? sig.au.lvl.toFixed(2) : '0.00')
          : api.SENS.audioMix > 0 ? ' · +A(' + auEstado + ')' : '') +
        /* `fo` são os dois canais de forma. Ambos a 0.00 com voz a sair quer dizer
           que a baseline ainda está a aquecer (~2 s) ou que o som não se afasta o
           suficiente da média desta voz — que é o caso da maior parte da fala */
        (api.SENS.audioVisemes > 0 && auEstado === 'on'
          ? ' · fo R' + (sig.au ? sig.au.round.toFixed(2) : '0.00') +
            ' S' + (sig.au ? sig.au.spread.toFixed(2) : '0.00')
          : api.SENS.audioVisemes > 0 ? ' · fo(' + auEstado + ')' : '') +
        /* spans pessoais, só quando a calibração de máximo está a mandar */
        ((api.SENS.maxJaw > 0 || api.SENS.maxLip > 0) && cal.ready
          ? ' · span ' + rigSpan(RIG_JAW_SPAN, api.SENS.maxJaw, cal.ready.jaw).toFixed(2) +
            '/' + rigSpan(RIG_LIP_SPAN, api.SENS.maxLip, cal.ready.mouth).toFixed(3)
          : '');
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
        /* se o microfone da análise já está aberto, clona-se a faixa em vez de pedir um
           segundo: em vários Android o segundo getUserMedia do mesmo aparelho falha, ou
           rouba o primeiro e a boca deixa de seguir a voz a meio da gravação. O clone é
           independente — pará-lo no fim não fecha o que a análise está a usar. */
        const jaAberto = auEstado === 'on' && auStream && auStream.getAudioTracks()[0];
        if (jaAberto) {
          recAudio = new MediaStream([jaAberto.clone()]);
        } else {
          let perdida = false;
          const pedido = navigator.mediaDevices.getUserMedia({ audio: true });
          /* a corrida rejeita ao fim de 8 s mas o pedido continua vivo por baixo: se a
             permissão só chegar depois, o stream resolvia para ninguém e o microfone
             ficava aberto até a página fechar. Este `then` é quem o fecha nesse caso. */
          pedido.then(s => { if (perdida) for (const t of s.getTracks()) t.stop(); }, () => {});
          recAudio = await Promise.race([
            pedido,
            new Promise((_, rej) => setTimeout(() => { perdida = true; rej(new Error('timeout')); }, 8000))
          ]);
        }
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
    maxCal = null;
    /* o `cal` não é o único estado medido: os filtros da v3, o pico, a baseline do
       sorriso e sobretudo o `lo`/`hi` do auto-range estão em unidades do zero que
       acabou de ser deitado fora — sobreviverem era arrastar a régua velha para a
       régua nova. O `sig.au` idem: recalibrar é uma sessão de medição nova, e o chão
       de ruído volta a assentar em segundos. O engine recria os dois à primeira
       utilização. */
    sig.v3 = null;
    sig.au = null;
    if (tracking) setStatus('calibrating — look neutral at the camera…');
  };

  /* ---------- calibração de máximo ----------
     A calibração normal mede o ZERO desta cara (repouso). Esta mede o outro extremo:
     o curso que a boca desta pessoa de facto tem. Enquanto não existir, o engine usa
     a janela fixa (`RIG_JAW_SPAN`/`RIG_LIP_SPAN`), que é um palpite sobre a
     população — ver a nota do `rigSpan`.

     Guarda-se global (`critter-rigmax`), não por avatar: é da cara e da câmara, como
     as sensibilidades. E de propósito fora do export/sync — a medição é desta câmara,
     e empurrá-la para o telemóvel seria dar-lhe o curso medido noutro sítio. */
  const MAX_FRAMES = 40;
  let maxCal = null;

  function calibrarMaximo() {
    if (!tracking) { setStatus('sem câmara não há máximo para medir'); return; }
    if (!cal.ready) { setStatus('espera pela calibração neutra primeiro'); return; }
    maxCal = { jaw: [], lip: [] };
    setStatus('abre a boca ao máximo (AAA) até a contagem acabar… ' + MAX_FRAMES);
  }

  function recolheMaximo(lm, bs) {
    maxCal.jaw.push(bs.jawOpen);
    maxCal.lip.push(rigDist(lm[13], lm[14]) / rigDist(lm[10], lm[152]));
    if (maxCal.jaw.length < MAX_FRAMES) {
      setStatus('abre a boca ao máximo (AAA)… ' + (MAX_FRAMES - maxCal.jaw.length));
      return;
    }
    /* p95 e não o máximo: um frame em que o tracker se enganou não pode ser o curso
       desta pessoa para sempre */
    const p95 = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.round((s.length - 1) * 0.95)]; };
    const jaw = p95(maxCal.jaw), lip = p95(maxCal.lip);
    maxCal = null;
    /* cada canal passa ou não passa por si: se o tracker não deu queixo mas deu
       lábios, aproveita-se o que houver e o outro fica com o span fixo */
    const jawOk = jaw - (cal.ready.jaw || 0) > 0.10;
    const lipOk = lip - cal.ready.mouth > 0.02;
    if (!jawOk && !lipOk) {
      setStatus('a boca mal abriu durante a medição — o máximo fica como estava');
      renderMax();
      return;
    }
    saveRigMax({ jaw: jawOk ? jaw : 0, lip: lipOk ? lip : 0, at: Date.now() });
    aplicaMaximo();
    setStatus('máximo calibrado: queixo ' + (jawOk ? jaw.toFixed(2) : '—') +
      ' · lábios ' + (lipOk ? lip.toFixed(3) : '—') + ' — compara com o botão a limpar');
  }

  /* o máximo entra no SENS como qualquer sensibilidade; o `resolveSens` põe-no sempre
     por cima, portanto uma afinação só deste avatar não o pode capturar */
  function aplicaMaximo() {
    const m = loadRigMax();
    api.SENS.maxJaw = m && m.jaw > 0 ? m.jaw : 0;
    api.SENS.maxLip = m && m.lip > 0 ? m.lip : 0;
    /* mudar o máximo muda o span, e o span é a unidade em que o estado da v3 está
       escrito: o `lo`/`hi` do auto-range, o pico e os filtros ficavam a falar da escala
       anterior e a boca saturava até eles decaírem (~13 s, medido). Isto corre nos dois
       únicos sítios onde o máximo muda — a medição e o botão a limpar —, que é a razão
       de estar aqui e não em cada um deles. */
    sig.v3 = null;
    renderMax();
  }

  const maxBtn = document.getElementById('btn-max');
  function renderMax() {
    if (!maxBtn) return;
    const tem = api.SENS.maxJaw > 0 || api.SENS.maxLip > 0;
    maxBtn.textContent = tem ? 'máximo ✓ (limpar)' : 'calibrar máximo';
  }
  if (maxBtn) maxBtn.addEventListener('click', () => {
    if (api.SENS.maxJaw > 0 || api.SENS.maxLip > 0) {
      saveRigMax(null);
      aplicaMaximo();
      setStatus('máximo apagado — de volta à janela fixa');
    } else calibrarMaximo();
  });
  api.calibrarMaximo = calibrarMaximo;

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
