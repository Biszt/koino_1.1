// koino/js/csere/kiszolgalasiKeret.js

// Felelősség: ⭐⭐ A KISZOLGÁLÁSI KERET KÖNYVELÉSE (D109 — KK2, KK3, KK5): mennyit dolgozott a készülék MÁSOKNAK az utóbbi
// órában, kinek, és szabad-e még kiszolgálnia.
//
// A D108 szerint a valódi védelem a KISZOLGÁLÓNÁL van: amit a kiszolgáló nem ellenőriz, az csak illemtan — egy mohó vagy
// átírt program a kérő oldali korlátot nem tartja be. Ez a modul a mérő:
//   · KÉT MÉRCE (KK2): a kimenő bájt és a kérések száma, CSÚSZÓ ÓRÁS ablakban (percenkénti vödrökben);
//   · A TÁRS (KK3): a személy (zárt koinóban a `ki`), a tábla-kulcs (a kérelem is hozza), végső esetben a cím (az IP — a
//     mobil NAT a portot váltja);
//   · AZ ELSŐBBSÉG (D108): a KÖTÉS (a saját cserém) soha nem kerül a keret alá — csak könyvelődik; egy TÁRS legfeljebb a
//     keret negyedét viheti; az IDEGENEK együtt legfeljebb a felét (így az ismerősöknek mindig marad hely);
//   · A SZÁMOK (KK5): „alap” készülék óránként 20 MB és 600 kérés, „mindent” készülék 100 MB és 3000 — kiindulás, a
//     beállítás felülírja.
// ⭐ A „végtelen” próbája: minden számláló időablakra szól, a jegyzék korlátos (a társak száma, a vödrök száma) — a terhe nem
// nő a koinó méretével. A tábla-kulcs ingyen van: a sok új kulccsal érkező kérőt a KÖZÖS keret fogja (az idegenek fele).
//
// ⛔ Helyi feljegyzés, nem esemény: a memóriában él (a folyamat újraindítása nullázza — egy kérő a MI folyamatunkat nem tudja
// újraindítani). Hálózatot nem importál. Használja: `koino.js` (a kiszolgálás — a kérelem, a továbbadás, az idegen csere).

const MB = 1024 * 1024;

/** A kiinduló keretek (KK5) — óránként. */
export const KERET_ALAP = Object.freeze({ bajt: 20 * MB, keres: 600 });
export const KERET_MINDENT = Object.freeze({ bajt: 100 * MB, keres: 3000 });
/** A csúszó ablak és a vödör. */
export const KERET_ABLAK = 3600 * 1000;
const VODOR = 60 * 1000;
/** Egy társ legfeljebb a keret ennyiedét, az idegenek együtt legfeljebb ennyiedét vihetik. */
export const TARS_HANYAD = 4;
export const IDEGEN_HANYAD = 2;
/** Ennyi társat jegyzünk külön (a legrégebben látott esik ki — a közös keretben attól még benne marad, amit vitt). */
export const TARS_JEGYZEK_KORLAT = 512;
/** A „később” legalább ennyi. */
export const KESOBB_MIN = 60;

export const OSZTALYOK = ['kotes', 'tag', 'idegen'];

/**
 * ⭐ Ki számít KÖTÉSNEK a keretben (a saját cserém — nem kerül a keret alá)? A kötés-háló rendszeres társa (`kotesek.js`
 * `kotesek` — a három legrendszeresebb), és ⛔ csak ha a rendszeresség meg is van: legalább `KOTES_MIN_TALALKOZAS`
 * találkozás, és az első legalább `KOTES_MIN_KOR` (egy keretnyi idő) óta. Különben egy idegen egy-két csere után a három
 * közé kerülne (egy kevés társú készüléken bármelyik), és onnantól a keret nem fogná. *„Egy véletlen találkozás még nem
 * kapcsolat; a rendszeresség az.”*
 */
export const KOTES_MIN_TALALKOZAS = 3;
export const KOTES_MIN_KOR = KERET_ABLAK;

/**
 * @param {Object|null} kotes - a kötés-jegyzék bejegyzése (`talalkozasok`, `eloszor`)
 * @param {{most?: number, minKor?: number}} [b]
 */
export function keretKotesE(kotes, { most = Date.now(), minKor = KOTES_MIN_KOR } = {}) {
  return !!kotes && (kotes.talalkozasok ?? 0) >= KOTES_MIN_TALALKOZAS && Number.isFinite(kotes.eloszor)
    && most - kotes.eloszor >= minKor;
}

/**
 * ⭐ KK3: a társ kulcsa a keretben — a személy (ha bizonyított), különben a tábla-kulcs (ha a kézfogásra tett aláírásával
 * jött), különben a cím IP-je (a port nélkül: a mobil NAT váltja).
 * @param {{szemely?: string|null, tabla?: string|null, cim?: string|null}} b
 * @returns {string|null}
 */
export function tarsKulcsa({ szemely = null, tabla = null, cim = null } = {}) {
  if (typeof szemely === 'string' && szemely) return 's:' + szemely;
  if (typeof tabla === 'string' && tabla) return 't:' + tabla;
  if (typeof cim === 'string' && cim) return 'c:' + cim;
  return null;
}

/**
 * Az osztály: a kötésem (a tábla-kulcsa a kötés-jegyzékemben), egy ismert tag (bizonyított személy), vagy idegen.
 * @param {{kotes?: boolean, tag?: boolean}} b
 */
export function tarsOsztalya({ kotes = false, tag = false } = {}) {
  return kotes ? 'kotes' : tag ? 'tag' : 'idegen';
}

/**
 * Egy új keret.
 * @param {{bajt?: number, keres?: number}} [hatar] - óránként (alapból `KERET_ALAP`)
 */
export function ujKeret(hatar = KERET_ALAP) {
  return {
    hatar: { bajt: hatar?.bajt > 0 ? hatar.bajt : KERET_ALAP.bajt, keres: hatar?.keres > 0 ? hatar.keres : KERET_ALAP.keres },
    osszes: new Map(),        // vödör → { bajt, keres }  (a kötés nélkül — az nem kerül a keret alá)
    idegen: new Map(),        // vödör → { bajt, keres }
    kotes: new Map(),         // vödör → { bajt, keres }  (csak könyvelés)
    tarsak: new Map()         // társ → Map(vödör → { bajt, keres })  (a beszúrás sorrendje = a legutóbb látott a végén)
  };
}

/** A keret határának cseréje (a beállítás változott) — a könyvelés megmarad. */
export function keretHatara(keret, hatar) {
  if (hatar?.bajt > 0) keret.hatar.bajt = hatar.bajt;
  if (hatar?.keres > 0) keret.hatar.keres = hatar.keres;
  return keret;
}

const vodorKezdete = (most) => Math.floor(most / VODOR) * VODOR;

/** A régi vödrök kidobása (ami az ablakon kívül esett). */
function metszes(vodrok, most) {
  const hatar = most - KERET_ABLAK;
  for (const v of vodrok.keys()) if (v + VODOR <= hatar) vodrok.delete(v);
}

function hozzaad(vodrok, v, bajt, keres) {
  const x = vodrok.get(v) ?? { bajt: 0, keres: 0 };
  x.bajt += bajt;
  x.keres += keres;
  vodrok.set(v, x);
}

function osszeg(vodrok, most) {
  metszes(vodrok, most);
  let bajt = 0, keres = 0, legregebbi = null;
  for (const [v, x] of vodrok) {
    bajt += x.bajt;
    keres += x.keres;
    if (legregebbi === null || v < legregebbi) legregebbi = v;
  }
  return { bajt, keres, legregebbi };
}

/**
 * ⭐ Egy kiszolgálás könyvelése (a válasz bájtjai és a kérések száma — egy kérés jellemzően egy).
 * @param {Object} keret
 * @param {{tars: string|null, osztaly: string, bajt?: number, keres?: number, most?: number}} b
 */
export function keretFeljegyzes(keret, { tars, osztaly, bajt = 0, keres = 0, most = Date.now() }) {
  const b = Number.isFinite(bajt) && bajt > 0 ? Math.round(bajt) : 0;
  const k = Number.isFinite(keres) && keres > 0 ? Math.round(keres) : 0;
  if (!b && !k) return keret;
  const v = vodorKezdete(most);
  if (osztaly === 'kotes') {
    hozzaad(keret.kotes, v, b, k);
    metszes(keret.kotes, most);
    return keret;
  }
  hozzaad(keret.osszes, v, b, k);
  if (osztaly !== 'tag') hozzaad(keret.idegen, v, b, k);
  if (tars) {
    const sajat = keret.tarsak.get(tars) ?? new Map();
    keret.tarsak.delete(tars);                     // a végére (a legutóbb látott)
    hozzaad(sajat, v, b, k);
    metszes(sajat, most);
    keret.tarsak.set(tars, sajat);
    while (keret.tarsak.size > TARS_JEGYZEK_KORLAT) keret.tarsak.delete(keret.tarsak.keys().next().value);
  }
  return keret;
}

/**
 * ⭐ Az ítélet: szabad-e most kiszolgálni ezt a társat — és ha nem, mikor érdemes újra próbálnia; ha igen, legfeljebb hány
 * bájtot vihet még (a törzs ennyit ad, a többire „később” — KK6).
 * @param {Object} keret
 * @param {{tars: string|null, osztaly: string, most?: number}} b
 * @returns {{szabad: boolean, kesobb: number|null, maradekBajt: number, ok: string|null}}
 */
export function keretItelete(keret, { tars, osztaly, most = Date.now() }) {
  // ⭐ A kötés (a saját cserém) soha nem kerül a keret alá — D108.
  if (osztaly === 'kotes') return { szabad: true, kesobb: null, maradekBajt: Infinity, ok: null };
  const h = keret.hatar;
  const kotelek = [];
  kotelek.push({ ok: 'a közös keret', o: osszeg(keret.osszes, most), bajt: h.bajt, keres: h.keres });
  if (osztaly !== 'tag') {
    kotelek.push({ ok: 'az idegenek része', o: osszeg(keret.idegen, most), bajt: h.bajt / IDEGEN_HANYAD, keres: h.keres / IDEGEN_HANYAD });
  }
  if (tars) {
    const sajat = keret.tarsak.get(tars);
    if (sajat) kotelek.push({ ok: 'a társ része', o: osszeg(sajat, most), bajt: h.bajt / TARS_HANYAD, keres: h.keres / TARS_HANYAD });
  }
  let maradekBajt = Infinity;
  for (const k of kotelek) {
    if (k.o.bajt >= k.bajt || k.o.keres >= k.keres) {
      // Akkor szabadul fel, amikor a legrégebbi vödör kiesik az ablakból.
      const kesobb = k.o.legregebbi === null ? KESOBB_MIN
        : Math.max(KESOBB_MIN, Math.ceil((k.o.legregebbi + VODOR + KERET_ABLAK - most) / 1000));
      return { szabad: false, kesobb: Math.min(kesobb, Math.ceil(KERET_ABLAK / 1000)), maradekBajt: 0, ok: k.ok };
    }
    maradekBajt = Math.min(maradekBajt, Math.floor(k.bajt - k.o.bajt));
  }
  return { szabad: true, kesobb: null, maradekBajt, ok: null };
}

/**
 * A keret állása (a `kiszolgalas` parancsnak és a panelnek): az elmúlt óra, osztályonként, és a legtöbbet vivő társak.
 * @param {Object} keret
 * @param {number} [most]
 * @param {number} [legtobb]
 */
export function keretAllasa(keret, most = Date.now(), legtobb = 5) {
  const o = osszeg(keret.osszes, most);
  const i = osszeg(keret.idegen, most);
  const k = osszeg(keret.kotes, most);
  const tarsak = [...keret.tarsak.entries()].map(([t, v]) => ({ tars: t, ...osszeg(v, most) }))
    .filter((x) => x.bajt || x.keres)
    .sort((a, b) => b.bajt - a.bajt || b.keres - a.keres)
    .slice(0, legtobb)
    .map(({ tars, bajt, keres }) => ({ tars, bajt, keres }));
  return { hatar: { ...keret.hatar }, osszes: { bajt: o.bajt, keres: o.keres }, idegen: { bajt: i.bajt, keres: i.keres },
    kotes: { bajt: k.bajt, keres: k.keres }, tarsak };
}
