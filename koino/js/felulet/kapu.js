// koino/js/felulet/kapu.js

// Felelősség: a HELYI KAPU — ezen keresztül beszél a böngésző a koino programmal.
// Fájlokat szolgál ki egy mappából, és a `/api/…` kéréseket átadja a KÍVÜLRŐL KAPOTT
// kezelőnek.
//
// ===== ⛔⛔ AMIT EZ A FÁJL SOHA NEM TUD =====
//
// **Semmit a koinóról.** Nincs benne esemény, állapot, szabály, tudatpont — egyetlen
// domain-fogalom sem. Két dolgot csinál: kiszolgál egy mappát, és továbbad egy kérést.
//
// ⭐ EZ NEM ÍZLÉS, HANEM A 7. SZABÁLY MEGTARTÁSA. A `felulet_terv.md` 3. pontja két
// ellenőrizhető szabályt mond ki, hogy a böngésző **cserélhető rajzoló** maradjon:
//
//   1. a program SOHA ne importálja a felületet;
//   2. a parancssori út maradjon TELJES út, ne csökevény.
//
// Az elsőt ez a fájl teszi betarthatóvá: mivel a kapu semmit nem tud a koinóról, a
// nyíl mindig **felület → program** irányba mutat, soha visszafelé. Egy másik kliens
// (terminál, natív) ugyanezen az illesztésen jön be. *Ugyanaz a fogás, mint az 1.
// szabálynál: a `csere.js` azért cserélhető szállítású, mert sosem importált hálózati kódot.*
//
// ===== ⚠️ ÉS AMIT A JELSZÓ VÉD — MEG AMIT NEM =====
//
// A kapu jelszava **NEM a koino biztonsági rétege** (3. szabály: a bizalom sose a
// csatornából jöjjön). A koino kapuja változatlanul az `esemenyMentese`, és az minden
// eseményt ugyanúgy ellenőriz, akárhonnan jött.
//
// ⛔ EGYETLEN dolgot véd, és az sok: hogy egy **másik weboldal** — amit épp nyitva
// tartasz — ne írhasson eseményt **a te kulcsoddal** a `127.0.0.1`-en át. A böngésződ
// bármelyik lapja megpróbálhat ide `fetch`-elni; a kulcsod viszont itt van a gépen, és
// aláírna. *Ez nem elméleti: pontosan ezért nem elég „csak localhost".*
//
// Négy őr áll ezen: **csak a hurok-címre kötünk** · **jelszó** · **Origin-ellenőrzés** ·
// **Host-ellenőrzés** (a DNS-visszakötés ellen). És egy ötödik a fájl-kiszolgálásnál:
// **útvonal-őr**, mert a `koino-adat/kulcs.json` néhány könyvtárnyira van innen.
//
// Használják: a `koino.js` `felulet` parancsa és a `meres/kapuProba.js`.

import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, normalize, resolve, extname, sep } from 'node:path';

// ===== ÁLLANDÓK =====

// Alap port. ⚠️ Paraméter, nem beégetés (2. szabály): a hívó felülírhatja, és ha foglalt,
// a koino ugyanúgy működik — csak más porton.
export const ALAP_PORT = 7380;

// ⭐ CSAK A HUROK-CÍM. Ha `0.0.0.0`-ra kötnénk, a helyi hálózat bármely gépe elérné a
// felületet — és vele a kulcsunkat. A `figyel`/`orjarat` kapuja MÁS: az szándékosan
// kifelé néz, de ott nincs mit ellopni (minden esemény alá van írva).
const HUROK = '127.0.0.1';

// A kiszolgálható fájltípusok. ⚠️ Zárt lista: amit nem ismerünk, azt nyers bájtként
// adjuk, `text/plain`-ként — nem találgatunk, és nem futtatunk semmit.
const TIPUSOK = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// ===================================
// AZ ÖT ŐR
// ===================================

/**
 * ⭐ 1. ŐR — A JELSZÓ.
 *
 * Indításkor születik, és csak a képernyőn jelenik meg (meg a címben, amit megnyitsz).
 * Sehol nem tároljuk: ha újraindítod a felületet, új jelszó lesz. ⚠️ *Ettől nem is
 * szivároghat el egy fájlból.*
 *
 * Kétféleképpen fogadjuk el, és ennek oka van: a **címsorból** (`?kulcs=…`) az első
 * megnyitásnál — mert a böngésző címsora az egyetlen, amit kézzel át tudsz adni —, és
 * **fejlécből** (`X-Koino-Kulcs`) utána, mert a lap `fetch`-jei azt küldik.
 */
function jelszoRendben(keres, kereses, jelszo) {
  const fejlecbol = keres.headers['x-koino-kulcs'];
  const cimbol = kereses.get('kulcs');
  const kapott = typeof fejlecbol === 'string' ? fejlecbol : cimbol;
  if (typeof kapott !== 'string' || kapott.length !== jelszo.length) return false;

  // Karakterenként végigmegyünk MINDIG — nem lépünk ki az első eltérésnél. A hurok-címen
  // az időzítés-mérés amúgy sem reális támadás, de a szokás jó.
  let elteres = 0;
  for (let i = 0; i < jelszo.length; i++) {
    elteres |= kapott.charCodeAt(i) ^ jelszo.charCodeAt(i);
  }
  return elteres === 0;
}

/**
 * ⭐ 2. ŐR — AZ ORIGIN.
 *
 * Ha egy MÁSIK weboldal `fetch`-el ide, a böngésző kötelezően küld `Origin` fejlécet a
 * saját címével. A miénk csak a hurok-cím lehet.
 *
 * ⚠️ A HIÁNYZÓ `Origin` NEM elutasítás: a lap saját, azonos eredetű `GET`-jei és a
 * címsorból indított megnyitás nem küldenek ilyet. Ott a jelszó véd.
 */
function originRendben(keres, port) {
  const origin = keres.headers.origin;
  if (origin === undefined) return true;
  return origin === 'http://' + HUROK + ':' + port
      || origin === 'http://localhost:' + port;
}

/**
 * ⭐ 3. ŐR — A HOST (DNS-visszakötés ellen).
 *
 * Enélkül maradna egy rés: egy támadó bejegyezhet egy domaint, ami a `127.0.0.1`-re mutat.
 * Akkor az ő oldala AZONOS EREDETŰNEK látszana a kapunkkal, és az Origin-őr átengedné.
 * ⭐ A `Host` fejléc viszont az ő domainjét hozná — ezért azt is megnézzük.
 */
function hostRendben(keres, port) {
  const host = keres.headers.host;
  return host === HUROK + ':' + port || host === 'localhost:' + port;
}

/**
 * ⭐⭐ 4. ŐR — AZ ÚTVONAL. Ez a legfontosabb a fájl-kiszolgálásnál.
 *
 * ⚠️⚠️ MIÉRT: a `koino-adat/kulcs.json` — a személyazonosságod — néhány könyvtárnyira van
 * a felület mappájától. Egy naiv fájl-kiszolgáló a `/../../koino-adat/kulcs.json` kérésre
 * **odaadná**. Az az egyetlen fájl, amivel bárki a nevedben tud aláírni.
 *
 * A dekódolás UTÁN vizsgálunk, különben a `%2e%2e` (kódolt `..`) átcsúszna.
 *
 * @returns {string|null} a biztonságos abszolút út, vagy null, ha kilógna
 */
export function biztonsagosUt(mappa, utvonal) {
  let tiszta;
  try {
    tiszta = decodeURIComponent(utvonal);
  } catch {
    return null;                                    // hibás kódolás: nem találgatunk
  }
  if (tiszta.includes('\0')) return null;           // nulla bájt: soha

  const gyoker = resolve(mappa);
  const kert = normalize(join(gyoker, tiszta));

  // A `normalize` feloldja a `..`-ket. Ha az eredmény nem a gyökér alatt van, kilógott.
  if (kert !== gyoker && !kert.startsWith(gyoker + sep)) return null;
  return kert;
}

// ===================================
// A KAPU
// ===================================

/**
 * Megnyitja a helyi kaput.
 *
 * @param {Object} beallitas
 * @param {string} beallitas.mappa - honnan szolgáljuk ki a fájlokat
 * @param {Function} [beallitas.kezelo] - async ({ modszer, utvonal, kereses, test }) →
 *        { allapot?, adat } | null · a `/api/…` kérések kezelője. ⭐ KÍVÜLRŐL JÖN: a kapu
 *        nem tud semmit a koinóról.
 * @param {number} [beallitas.port]
 * @param {string} [beallitas.jelszo] - a próbák adhatnak rögzítettet; egyébként generált
 * @returns {Promise<{port: number, jelszo: string, cim: string, zar: Function}>}
 */
export async function kapuNyitasa({ mappa, kezelo, port = ALAP_PORT, jelszo } = {}) {
  console.log('kapu.kapuNyitasa - KEZDÉS', { mappa, port });

  // base64url, hogy a címsorba menekítés nélkül beírható legyen
  const kulcs = jelszo ?? randomBytes(24).toString('base64url');
  const gyoker = resolve(mappa);

  const kiszolgalo = createServer((keres, valasz) => {
    kereskezeles(keres, valasz, { gyoker, kezelo, kulcs, port: () => tenylegesPort })
      .catch((hiba) => {
        // Egy elhasalt kérés NE döntse el a kaput.
        console.warn('kapu - kérés-hiba', { hiba: hiba.message });
        if (!valasz.headersSent) valasz.writeHead(500, { 'content-type': 'text/plain' });
        valasz.end('hiba');
      });
  });

  let tenylegesPort = port;

  await new Promise((kesz, hiba) => {
    kiszolgalo.once('error', hiba);
    // ⭐ CSAK a hurok-címre kötünk — a helyi háló nem érheti el.
    kiszolgalo.listen(port, HUROK, () => {
      tenylegesPort = kiszolgalo.address().port;
      kesz();
    });
  });

  const cim = 'http://' + HUROK + ':' + tenylegesPort + '/?kulcs=' + kulcs;
  console.log('kapu.kapuNyitasa - VÉGE', { port: tenylegesPort });

  return {
    port: tenylegesPort,
    jelszo: kulcs,
    cim,
    /** Bezárja a kaput (a próbák és a Ctrl+C használja). */
    zar() {
      return new Promise((kesz) => {
        // A nyitva tartott kapcsolatok különben percekig húznák a bezárást.
        if (typeof kiszolgalo.closeAllConnections === 'function') {
          kiszolgalo.closeAllConnections();
        }
        kiszolgalo.close(() => kesz());
      });
    }
  };
}

// ===================================
// EGY KÉRÉS ÚTJA
// ===================================

/**
 * A sorrend nem mindegy: előbb az őrök, aztán a munka. Amit egy őr elutasít, arról a
 * kezelő nem is értesül.
 */
async function kereskezeles(keres, valasz, { gyoker, kezelo, kulcs, port }) {
  const p = port();
  const cim = new URL(keres.url, 'http://' + HUROK + ':' + p);
  const kereses = cim.searchParams;

  const kuld = (allapot, tipus, test) => {
    valasz.writeHead(allapot, {
      'content-type': tipus,
      // ⛔ A lap SOHA ne kerüljön be egy idegen oldal keretébe, és a böngésző se
      // találgassa a fájltípust.
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      // ⚠️ A jelszó a címsorban utazik az első megnyitásnál — ne vigye tovább egy
      // kifelé mutató hivatkozás a hivatkozó-fejlécben.
      'referrer-policy': 'no-referrer',
      'cache-control': 'no-store'
    });
    valasz.end(test);
  };

  // ----- 3. ŐR: HOST -----
  if (!hostRendben(keres, p)) {
    console.warn('kapu - IDEGEN HOST elutasítva', { host: keres.headers.host });
    return kuld(403, 'text/plain; charset=utf-8', 'idegen host');
  }

  // ----- 2. ŐR: ORIGIN -----
  if (!originRendben(keres, p)) {
    console.warn('kapu - IDEGEN ORIGIN elutasítva', { origin: keres.headers.origin });
    return kuld(403, 'text/plain; charset=utf-8', 'idegen origin');
  }

  // ----- 1. ŐR: JELSZÓ — CSAK AZ `/api/`-RA -----
  //
  // ⚠️⚠️ EZ A HATÁR 2026-09-06-ÁN TOLÓDOTT IDE (5.3), ÉS AZ INDOKLÁS FONTOS.
  //
  // Eddig MINDEN kérés jelszót kívánt. Amikor az örökölt kártyák átjöttek, kiderült, hogy
  // ez nem tartható: a `Kartya.js` sima `fetch('./html/components/kartya/kartya.html')`-lel
  // tölti a sablonját, a CSS pedig `<link>`-kel jön — **egyik sem küld fejlécet**, és a
  // címükbe sem tudunk jelszót tenni. Két rossz út és egy jó volt:
  //
  //   ⛔ átírni a kártyákat, hogy fejlécet küldjenek → elveszne, hogy VÁLTOZATLANUL jönnek;
  //   ⛔ sütibe tenni a jelszót → a süti MINDEN kéréshez automatikusan megy, tehát épp azt
  //      a „lopott jogosultság" problémát hozná vissza, amit a fejléc elkerül (CSRF);
  //   ✅ **a jelszót oda tenni, ahol az ADAT van: az `/api/`-ra.**
  //
  // ⭐ MIÉRT BIZTONSÁGOS: a kiszolgált fájlok a koino **nyílt forrású felülete** — nincs
  // bennük semmi titok. Adatot olvasni és (később) a kulcsommal írni csak az `/api/`-n át
  // lehet, és azt a jelszó védi. A `koino-adat/kulcs.json` továbbra sem érhető el (4. őr),
  // és egy idegen lap `fetch`-ét már az Origin-őr megállította — az `<link>`/`<script>`
  // pedig nem tudja KIOLVASNI a tartalmat (nincs CORS-fejlécünk).
  //
  // ⚠️ Aki jelszó nélkül nyitja meg a lapot, üres vázat kap: a lap `/api/` hívásai
  // elakadnak, és a felület meg is mondja, mit kell tenni.
  const apiKeres = cim.pathname === '/api' || cim.pathname.startsWith('/api/');

  if (apiKeres && !jelszoRendben(keres, kereses, kulcs)) {
    console.warn('kapu - HIÁNYZÓ VAGY ROSSZ JELSZÓ elutasítva', { utvonal: cim.pathname });
    return kuld(401, 'application/json; charset=utf-8', JSON.stringify({
      hiba: 'Ehhez a kapuhoz jelszó kell. Nyisd meg azt a címet, amit a program kiírt.'
    }));
  }

  // ----- A MUNKA: /api/… a kezelőnek, minden más fájl -----
  if (apiKeres) {
    if (!kezelo) return kuld(404, 'application/json; charset=utf-8', '{"hiba":"nincs kezelő"}');

    const eredmeny = await kezelo({
      modszer: keres.method,
      utvonal: cim.pathname,
      kereses
    });

    if (!eredmeny) {
      return kuld(404, 'application/json; charset=utf-8', '{"hiba":"nincs ilyen végpont"}');
    }
    return kuld(eredmeny.allapot ?? 200, 'application/json; charset=utf-8',
      JSON.stringify(eredmeny.adat));
  }

  await fajlKiszolgalas(cim.pathname, gyoker, kuld);
}

/**
 * Egy fájl kiszolgálása a mappából — a 4. őrrel.
 */
async function fajlKiszolgalas(utvonal, gyoker, kuld) {
  const kert = utvonal === '/' ? '/index.html' : utvonal;
  const ut = biztonsagosUt(gyoker, kert);

  if (ut === null) {
    // ⚠️ Ezt külön naplózzuk: ha egyszer megjelenik, az nem véletlen elgépelés.
    console.warn('kapu - ⛔ KILÓGÓ ÚTVONAL elutasítva', { utvonal });
    return kuld(403, 'text/plain; charset=utf-8', 'tiltott útvonal');
  }

  let test;
  try {
    test = await readFile(ut);
  } catch {
    return kuld(404, 'text/plain; charset=utf-8', 'nincs ilyen fájl');
  }

  kuld(200, TIPUSOK[extname(ut).toLowerCase()] ?? 'text/plain; charset=utf-8', test);
}
