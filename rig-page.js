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

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  const api = { model: null, rig: null, pal: null, id: '', SENS: Object.assign({}, SENS_DEFAULTS), loadCritter, setStatus };

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
    api.SENS = Object.assign({}, SENS_DEFAULTS, cfg.sens);
    if (cfg.bg) api.pal.bg = cfg.bg;
    document.body.style.background = api.pal.bg;
    window.location.hash = id;

    titleEl.textContent = 'the critter @' + id + ' — ' + opts.label;
    const fg = luminance(api.pal.bg) >= 128 ? '#000' : '#fff';
    titleEl.style.color = fg; descEl.style.color = fg;
    setStatus(tracking ? (cal.ready ? 'tracking — express yourself' : 'calibrating — look neutral at the camera…') : lastStatus);
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
      setStatus('no camera / tracker — mouse mode (move = gaze, hold click = open mouth)');
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
      applyIdle(sig, mouse, W, H, idleState);
    }

    if (debugMode) {
      descEl.textContent = 'blinkL ' + sig.blinkL.toFixed(2) + ' · blinkR ' + sig.blinkR.toFixed(2) +
        ' · jaw ' + sig.mouth.toFixed(2) + ' · yaw ' + sig.yaw.toFixed(2) + ' · pitch ' + sig.pitch.toFixed(2) +
        ' · roll ' + sig.roll.toFixed(2) + ' · gaze ' + sig.gx.toFixed(2) + ',' + sig.gy.toFixed(2) +
        ' · joy ' + sig.joy.toFixed(2) + ' · wide ' + sig.wide.toFixed(2) +
        ' · pk ' + sig.pucker.toFixed(2) + ' · fn ' + sig.funnel.toFixed(2) + ' · st ' + sig.stretch.toFixed(2) + ' · jx ' + sig.jawX.toFixed(2);
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
      applyRig(api.model, api.rig, sig, api.SENS);
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

  api.recalibrate = () => {
    cal = createCalib();
    if (tracking) setStatus('calibrating — look neutral at the camera…');
  };

  document.getElementById('btn-random').addEventListener('click', () => loadCritter(randomId()));
  document.getElementById('btn-save').addEventListener('click', savePng);
  document.getElementById('btn-recal').addEventListener('click', api.recalibrate);
  document.getElementById('btn-back').addEventListener('click', () => { window.location.href = 'index.html' + window.location.hash; });

  const h = window.location.hash.slice(1);
  loadCritter(/^[0-9a-z]{6,10}$/.test(h) ? h : randomId());
  requestAnimationFrame(frame);
  startTracking();
  return api;
}
