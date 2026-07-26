#!/usr/bin/env node
/* Servidor de apoio ao gate de paridade: serve a raiz do projecto e recebe por POST
   o resultado do `_parity.html`. Existe porque o `--dump-dom` do Chrome nao espera
   por video real (nem o `--virtual-time-budget`, que nao avanca um <video>) — com um
   POST ha um sinal de fim inequivoco.

   node tools/parity-server.js <porta> <ficheiro-de-saida> */
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const porta = +(process.argv[2] || 8099);
const saida = process.argv[3] || path.join(__dirname, 'out', 'paridade-browser.json');

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.mp4': 'video/mp4', '.css': 'text/css' };

const srv = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/paridade') {
    let corpo = '';
    req.on('data', c => { corpo += c; });
    req.on('end', () => {
      fs.mkdirSync(path.dirname(saida), { recursive: true });
      fs.writeFileSync(saida, corpo);
      res.writeHead(200, { 'access-control-allow-origin': '*' });
      res.end('ok');
      console.log('recebido: ' + corpo.length + ' bytes -> ' + saida);
      setTimeout(() => process.exit(0), 200);
    });
    return;
  }
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const f = path.join(RAIZ, rel);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); res.end('nao existe'); return;
  }
  /* Range e obrigatorio: sem ele o Chrome nao consegue fazer seek no <video> e o
     harness ficava preso no primeiro frame */
  const tam = fs.statSync(f).size;
  const tipo = TIPOS[path.extname(f)] || 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const ini = m[1] ? +m[1] : 0;
    const fim = m[2] ? +m[2] : tam - 1;
    res.writeHead(206, { 'content-type': tipo, 'accept-ranges': 'bytes',
      'content-range': 'bytes ' + ini + '-' + fim + '/' + tam, 'content-length': fim - ini + 1 });
    fs.createReadStream(f, { start: ini, end: fim }).pipe(res);
  } else {
    res.writeHead(200, { 'content-type': tipo, 'accept-ranges': 'bytes', 'content-length': tam });
    fs.createReadStream(f).pipe(res);
  }
});

srv.listen(porta, '0.0.0.0', () => console.log('a servir ' + RAIZ + ' em :' + porta));
setTimeout(() => { console.error('timeout sem resultado'); process.exit(3); }, 300000);
