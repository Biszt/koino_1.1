// koino/fejlesztoiSzerver.js

// Felelősség: statikus fájlok kiszolgálása a fejlesztéshez — SEMMI MÁS.
//
// Miért kell szerver egy szerver NÉLKÜLI programhoz? Két böngésző-szabály miatt:
//   1. az ES-modulokat (`import`) a böngésző `file://` alól nem tölti be;
//   2. a WebCrypto (kulcsgenerálás, aláírás) csak BIZTONSÁGOS környezetben működik,
//      ami a gyakorlatban `https://` vagy `localhost`.
//
// Ez a kiszolgáló tehát NEM a koino szervere: nincs adatbázisa, nincs API-ja, és
// semmit nem tud a koinóról. Ugyanígy kiszolgálhatna egy bármilyen mappát — és a kész
// programot bárki bármilyen statikus tárhelyről (vagy a saját gépéről) futtathatja.
//
// Használat: node koino/fejlesztoiSzerver.js   →   http://localhost:4000
//
// Használják: a fejlesztő; a Fázis 2 Szakasz 1 munkájához.

const http = require('http');
const fs = require('fs');
const path = require('path');

// ===================================
// ÁLLANDÓK
// ===================================

const PORT = 4000;                      // A prototípus 3000-et (dev) és 8080-at (éles) használ
const GYOKER = __dirname;               // Ez a mappa: koino/

// A kiterjesztés → tartalomtípus leképezés. Csak amit tényleg kiszolgálunk.
const TARTALOM_TIPUSOK = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon'
};

// ===================================
// A KISZOLGÁLÓ
// ===================================

const szerver = http.createServer((keres, valasz) => {
  // ----- AZ ÚTVONAL FELOLDÁSA -----
  // A lekérdezés-részt (?...) levágjuk, a gyökeret az index.html-re irányítjuk
  const nyersUtvonal = decodeURIComponent(keres.url.split('?')[0]);
  const relativUtvonal = nyersUtvonal === '/' ? '/index.html' : nyersUtvonal;
  const fajlUtvonal = path.join(GYOKER, relativUtvonal);

  // ----- KITÖRÉS-VÉDELEM -----
  // A `..` szegmensekkel ki lehetne lépni a mappából (pl. /../../.env). A path.join
  // feloldja őket, ezért UTÁNA ellenőrizzük, hogy a végeredmény a gyökéren belül van-e.
  if (!fajlUtvonal.startsWith(GYOKER)) {
    console.log('fejlesztoiSzerver - kitörési kísérlet elutasítva:', nyersUtvonal);
    valasz.writeHead(403);
    return valasz.end('Tiltott');
  }

  fs.readFile(fajlUtvonal, (hiba, tartalom) => {
    if (hiba) {
      console.log('fejlesztoiSzerver - nincs meg:', relativUtvonal);
      valasz.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return valasz.end('Nincs ilyen fájl: ' + relativUtvonal);
    }

    const kiterjesztes = path.extname(fajlUtvonal).toLowerCase();
    const tipus = TARTALOM_TIPUSOK[kiterjesztes] || 'application/octet-stream';

    // Fejlesztés közben SOHA ne cache-eljen a böngésző — a prototípusnál ez órákat vitt
    // el (lásd a mobil stale-cache tanulságot a fejlesztési naplóban).
    valasz.writeHead(200, {
      'Content-Type': tipus,
      'Cache-Control': 'no-store'
    });
    valasz.end(tartalom);
  });
});

// ===================================
// INDÍTÁS ÉS HIBAKEZELÉS
// ===================================

// A leggyakoribb indulási hiba, hogy a port már foglalt — mert egy másik ablakban
// (vagy egy elfelejtett háttérfolyamatban) MÁR FUT egy példány. A Node alapból egy
// tízsoros hibalistát ír ki erre, ami semmit nem segít; itt megmondjuk, mi történt
// és mit lehet tenni.
szerver.on('error', (hiba) => {
  if (hiba.code === 'EADDRINUSE') {
    console.error('');
    console.error('A ' + PORT + '-es port MÁR FOGLALT.');
    console.error('Ez majdnem biztosan azt jelenti, hogy a kiszolgáló MÁR FUT.');
    console.error('');
    console.error('  Mit tegyél?');
    console.error('   1. Nyisd meg egyszerűen: http://localhost:' + PORT);
    console.error('   2. Ha mégis újra akarod indítani, előbb állítsd le a futó példányt');
    console.error('      (abban az ablakban Ctrl+C), vagy Windowson:');
    console.error('      Get-NetTCPConnection -LocalPort ' + PORT + ' | Select-Object OwningProcess');
    console.error('');
    process.exit(1);
  }

  console.error('A kiszolgáló hibára futott:', hiba.message);
  process.exit(1);
});

szerver.listen(PORT, () => {
  console.log('koino fejlesztői kiszolgáló fut');
  console.log('  mappa : ' + GYOKER);
  console.log('  cím   : http://localhost:' + PORT);
  console.log('  leállítás: Ctrl+C');
});
