// koino/js/esemeny/osszegzoFa.js

// Felelősség: AZ ÖSSZEGZŐ MERKLE-FA (D78, 2026-09-27) — egy csomópont, két elrendezés, és a
// bizonyítékok. Hálózat nélkül: a fa semmit nem tud arról, ki kérdezi és min utazik a válasz.
//
// ===== ⭐ MIÉRT (az alappillérek A-ja) =====
//
// Egyetlen gyökér-lenyomatból bármely elem jelenléte, egy részösszeg vagy egy változás helyessége
// LOG N ADATBÓL bizonyítható, a teljes halmaz nélkül. Erre épül a szerző lánca (D63: a kettős lánc
// a szeletek között is lelepleződik), a tudatpont-keret (skálázási terv 4.8), a tömeges entitás
// (4.6), az össz-pont ellenőrzése (D76) és később a tartós mag.
//
// ===== AZ ÖSSZEGZÉS — egy csomópont =====
//
//   { l: lenyomat (43 jel), d: darab (az alatta lévő levelek száma), o: [összegek] }
//
// ⭐ A lenyomat a darabot és az összegeket is fedi — MINDEN csomópontnál, a levélnél is —, különben
// ezekről büntetlenül lehetne hazudni. A levél, a belső csomópont és az üres fa MÁS előtagot kap
// ('L', 'B', 'U'): a Merkle-fák ismert csapdája, hogy egy belső csomópont levélnek adja ki magát.
// A `fajta` (pl. 'naplo', 'kiosztas') minden lenyomatban benne van: két fa-típus nem keverhető.
//
// ===== KÉT ELRENDEZÉS (D78) =====
//
// · A NAPLÓ-FA — ami TÖRTÉNT, csak hozzáfűzéssel (a szerző lánca, sorszám szerint). Az alakja az
//   RFC 6962 / 9162 (Certificate Transparency) fája: n levélnél a bal ág a legnagyobb, n-nél KISEBB
//   kettőhatvány. A szerzőnek a folytatáshoz csak a „csúcsok" kellenek (legfeljebb log₂ n darab).
// · AZ ÁLLAPOT-FA — ami MOST IGAZ, kulcs szerint, felülírhatóan (a szerző kiosztása: entitás →
//   pont). Az elem helyét a KULCS LENYOMATÁNAK bitjei szabják meg, és egyelemű részfa maga a levél:
//   ⭐ így a fa alakja nem függ az érkezés sorrendjétől (a `rendezettBemenet` leckéje) — két gép
//   ugyanabból a tudásból ugyanazt a gyökeret kapja.
//
// ===== ⛔ AMIT A FA NEM AD MEG (D78, pontosítás) =====
//
// Az összeg csak az ÚTBA eső csomópontokon ellenőrizhető: a fa építője egy senki által ki nem nyitott
// részfába elrejthet egy negatív levelet. A kiosztás-fa ezért kerettel korlátos, és a TELJES listája
// összevethető a gyökérrel (`allapotGyokereListabol`) — ez a teljes ellenőrzés.
//
// ⚠️ HÁLÓZATOT NEM IMPORTÁL (1. szabály). ⛔ A kívülről jött bizonyítékban nem bízunk: az alakját, a
// méretét és a kanonikus voltát ellenőrizzük; a hibás bizonyíték NEM kivétel, hanem `rendben: false`
// (a hívó dönti el, mit kezd vele — D19).
//
// Használja: (a D78 megépítésétől) az esemény `lancGyoker`-e és a szabály-réteg; ma a próbák és a
// mérés (52.).

import { lenyomat } from './kanonikusAlak.js';

// ===================================
// A KORLÁTOK
// ===================================

// ⚠️ A NAPLÓ-BIZONYÍTÉKNAK NINCS KÜLÖN ÚTHOSSZ-KORLÁTJA (2026-09-27, rontás-próba után): az
// ellenőrzés a fa magasságán túli ELSŐ elemnél elutasít (`sn === 0`), tehát a munka a mérettel
// logaritmikus, bármilyen hosszú utat küldenek; a vonalon a méretet a sor-korlát köti.
// Az állapot-fa útja a kulcs lenyomatának bitjei: 43 base64url jel = 258 bit, ebből 256 számít. ⛔ Itt
// a korlát MUNKÁT véd: az út minden eleme egy lenyomat-számolás.
export const ALLAPOT_UT_KORLAT = 256;
// Egy összeg-lista legfeljebb ilyen hosszú (a fa-típus rögzíti; ma 0 vagy 1).
export const OSSZEG_HOSSZ_KORLAT = 8;

const LENYOMAT_MINTA = /^[A-Za-z0-9_-]{43}$/;
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const ABC_ERTEK = new Map([...ABC].map((jel, i) => [jel, i]));

// ===================================
// AZ ÖSSZEGZÉS
// ===================================

/** Egy összeg-lista alakja rendben van-e (rögzített hossz, biztonságos egész számok)? */
function osszegekRendben(o, hossz) {
  return Array.isArray(o) && o.length === hossz && o.every((x) => Number.isSafeInteger(x));
}

/**
 * Egy (kívülről jött) összegzés alakja rendben van-e?
 * @param {*} x
 * @param {number} hossz - az összeg-lista hossza (a fa-típusé)
 * @returns {boolean}
 */
export function osszegzesAlakja(x, hossz) {
  return !!x && typeof x === 'object' && typeof x.l === 'string' && LENYOMAT_MINTA.test(x.l)
    && Number.isSafeInteger(x.d) && x.d >= 0 && osszegekRendben(x.o, hossz);
}

/** Két összegzés ugyanaz-e (lenyomat, darab és összegek)? */
export function azonosOsszegzes(a, b) {
  return a.l === b.l && a.d === b.d && a.o.length === b.o.length && a.o.every((x, i) => x === b.o[i]);
}

/**
 * Egy LEVÉL összegzése.
 * @param {string} fajta - a fa-típus (pl. 'naplo', 'kiosztas')
 * @param {string} kulcs - a levél kulcsa (a naplóban az esemény azonosítója)
 * @param {*} ertek - a levél értéke (kanonikus alakra hozható; alapból null)
 * @param {Array<number>} osszegek - a levél összegei (a fa-típus hosszával)
 * @returns {Promise<{l: string, d: number, o: Array<number>}>}
 */
export async function levelOsszegzes(fajta, kulcs, ertek = null, osszegek = []) {
  return { l: await lenyomat(['L', fajta, 1, osszegek, kulcs, ertek]), d: 1, o: [...osszegek] };
}

const uresek = new Map();

/** Az ÜRES fa összegzése (fa-típusonként és összeg-hosszonként egy — eltesszük). */
export async function uresOsszegzes(fajta, hossz) {
  const kulcs = fajta + '|' + hossz;
  let ures = uresek.get(kulcs);
  if (!ures) {
    const o = new Array(hossz).fill(0);
    ures = Object.freeze({ l: await lenyomat(['U', fajta, 0, o]), d: 0, o: Object.freeze(o) });
    uresek.set(kulcs, ures);
  }
  return ures;
}

/**
 * Egy BELSŐ csomópont összegzése a két gyerekéből: a darab és az összegek a gyerekekéi, összeadva.
 * @throws {Error} ha a két gyerek összeg-listája eltérő hosszú, vagy az összeg túlcsordul
 */
export async function csomopontOsszegzes(fajta, bal, jobb) {
  if (bal.o.length !== jobb.o.length) throw new Error('osszegzoFa: eltérő hosszú összeg-listák');
  const o = bal.o.map((x, i) => x + jobb.o[i]);
  const d = bal.d + jobb.d;
  if (!Number.isSafeInteger(d) || !o.every((x) => Number.isSafeInteger(x))) {
    throw new Error('osszegzoFa: az összeg túlcsordult');
  }
  return { l: await lenyomat(['B', fajta, d, o, bal.l, jobb.l]), d, o };
}

// ===================================
// ⭐ A NAPLÓ-FA — ami történt (RFC 6962 alak)
// ===================================

/** A legnagyobb kettőhatvány, ami n-nél KISEBB (n ≥ 2). */
function balMeret(n) {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

/** A levelek [a, b) szakaszának gyökere. */
async function naploResz(fajta, levelek, a, b, hossz) {
  const n = b - a;
  if (n === 0) return uresOsszegzes(fajta, hossz);
  if (n === 1) return levelek[a];
  const k = balMeret(n);
  return csomopontOsszegzes(fajta,
    await naploResz(fajta, levelek, a, a + k, hossz),
    await naploResz(fajta, levelek, a + k, b, hossz));
}

/**
 * A napló gyökere a TELJES levél-listából (sorrendben).
 * @param {string} fajta
 * @param {Array<Object>} levelek - összegzések (`levelOsszegzes`)
 * @param {number} [hossz] - az összeg-lista hossza (a naplóban 0)
 */
export async function naploGyokere(fajta, levelek, hossz = 0) {
  return naploResz(fajta, levelek, 0, levelek.length, hossz);
}

/** Az index-edik levél útja a [a, b) szakaszban — a testvérek, a levéltől fölfelé. */
async function naploUt(fajta, levelek, m, a, b, hossz) {
  const n = b - a;
  if (n === 1) return [];
  const k = balMeret(n);
  if (m < k) {
    return [...await naploUt(fajta, levelek, m, a, a + k, hossz), await naploResz(fajta, levelek, a + k, b, hossz)];
  }
  return [...await naploUt(fajta, levelek, m - k, a + k, b, hossz), await naploResz(fajta, levelek, a, a + k, hossz)];
}

/**
 * ⭐ A TAGSÁG BIZONYÍTÉKA: az `index`-edik levél benne van a `levelek` gyökerében.
 * ⚠️ O(n) munka (a testvér-részfákat újraszámolja) — a szerzőé, aki a teljes láncot tartja.
 * @returns {Promise<{index: number, meret: number, ut: Array<Object>}>}
 */
export async function naploBizonyitek(fajta, levelek, index, hossz = 0) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= levelek.length) {
    throw new Error('osszegzoFa: a napló-index a fán kívül esik');
  }
  return { index, meret: levelek.length, ut: await naploUt(fajta, levelek, index, 0, levelek.length, hossz) };
}

/**
 * ⭐ A TAGSÁG ELLENŐRZÉSE (RFC 9162, 2.1.3.2) — a levél, a bizonyíték és a gyökér ismeretében.
 * ⛔ A bizonyíték idegen: alakját és méretét is ellenőrizzük, és a gyökér darabja a fa mérete.
 * @param {string} fajta
 * @param {Object} level - a levél összegzése (a hívó számolja az esemény azonosítójából)
 * @param {{index: number, meret: number, ut: Array<Object>}} bizonyitek
 * @param {Object} gyoker - az aláírt gyökér összegzése
 * @param {number} [hossz]
 * @returns {Promise<boolean>}
 */
export async function naploBizonyitekEllenorzese(fajta, level, bizonyitek, gyoker, hossz = 0) {
  const { index, meret, ut } = bizonyitek ?? {};
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(meret) || index < 0 || index >= meret) return false;
  if (!Array.isArray(ut) || !ut.every((p) => osszegzesAlakja(p, hossz))) return false;
  if (!osszegzesAlakja(gyoker, hossz) || gyoker.d !== meret) return false;

  let fn = index, sn = meret - 1, r = level;
  const fel = (x) => Math.floor(x / 2);
  for (const p of ut) {
    if (sn === 0) return false;
    if (fn % 2 === 1 || fn === sn) {
      r = await csomopontOsszegzes(fajta, p, r);
      if (fn % 2 === 0) {
        while (fn % 2 === 0 && fn !== 0) { fn = fel(fn); sn = fel(sn); }
      }
    } else {
      r = await csomopontOsszegzes(fajta, r, p);
    }
    fn = fel(fn); sn = fel(sn);
  }
  return sn === 0 && azonosOsszegzes(r, gyoker);
}

// ----- A folytatás: a szerző csak a CSÚCSOKAT tartja -----

/**
 * Egy üres napló a folytatáshoz. A `csucsok` a tökéletes részfák (méretük csökkenő kettőhatvány) —
 * legfeljebb log₂ n darab: ennyit kell a szerzőnek tárolnia, hogy a következő gyökeret kiszámolja.
 */
export function ujNaplo(fajta, hossz = 0) {
  return { fajta, hossz, csucsok: [] };
}

/** A napló mérete (a levelek száma). */
export function naploMerete(naplo) {
  return naplo.csucsok.reduce((s, cs) => s + cs.meret, 0);
}

/**
 * Egy levél a napló végére — O(log n) munka. ⚠️ Nem módosítja a kapott naplót: újat ad vissza.
 * @returns {Promise<Object>} az új napló
 */
export async function naploHozzafuzes(naplo, level) {
  const csucsok = [...naplo.csucsok, { meret: 1, osszegzes: level }];
  while (csucsok.length >= 2 && csucsok[csucsok.length - 1].meret === csucsok[csucsok.length - 2].meret) {
    const jobb = csucsok.pop();
    const bal = csucsok.pop();
    csucsok.push({ meret: bal.meret * 2, osszegzes: await csomopontOsszegzes(naplo.fajta, bal.osszegzes, jobb.osszegzes) });
  }
  return { ...naplo, csucsok };
}

/**
 * A napló gyökere a csúcsokból — ugyanaz, mint a `naploGyokere` a teljes listából (RFC 6962: a
 * csúcsok jobbról balra összefűzve). ⭐ Próba őrzi, hogy a kettő mindig egyezik.
 */
export async function naploCsucsGyokere(naplo) {
  const { csucsok } = naplo;
  if (!csucsok.length) return uresOsszegzes(naplo.fajta, naplo.hossz);
  let r = csucsok[csucsok.length - 1].osszegzes;
  for (let i = csucsok.length - 2; i >= 0; i--) r = await csomopontOsszegzes(naplo.fajta, csucsok[i].osszegzes, r);
  return r;
}

// ===================================
// ⭐ AZ ÁLLAPOT-FA — ami most igaz (kulcs szerint)
// ===================================
//
// A kanonikus alak: egy S halmaz részfája a d mélységben —
//   |S| = 0 → üres · |S| = 1 → maga a levél · |S| ≥ 2 → csomópont(a d. bit 0-s fele, az 1-es fele)
// ⭐ Ebből következik: egy belső csomópont alatt mindig legalább KÉT levél van (az ellenőrzés ezt
// meg is követeli), és a levél lenyomata nem függ a helyétől (feljebb csúszhat, ha a testvére kiürül).

/** A kulcs útja: a lenyomata (a bitjei szabják meg a helyét). */
async function utja(fajta, kulcs) {
  return lenyomat(['K', fajta, kulcs]);
}

/** Az út i-edik bitje. */
function bitje(ut, i) {
  return (ABC_ERTEK.get(ut[Math.floor(i / 6)]) >> (5 - (i % 6))) & 1;
}

/**
 * Egy üres állapot-fa.
 * @param {string} fajta
 * @param {number} hossz - az összeg-lista hossza (a kiosztásnál 1: a pont)
 */
export function ujAllapotFa(fajta, hossz) {
  if (!Number.isSafeInteger(hossz) || hossz < 0 || hossz > OSSZEG_HOSSZ_KORLAT) {
    throw new Error('osszegzoFa: érvénytelen összeg-hossz');
  }
  return { fajta, hossz, gyoker: null };
}

const osszegzese = async (fa, cs) => (cs === null ? uresOsszegzes(fa.fajta, fa.hossz) : cs.osszegzes);

async function belso(fa, bal, jobb) {
  return { bal, jobb, osszegzes: await csomopontOsszegzes(fa.fajta, await osszegzese(fa, bal), await osszegzese(fa, jobb)) };
}

/** Két levél közös részfája a `melyseg`-ben: addig megy lefelé, amíg az útjuk el nem ágazik. */
async function ketLevel(fa, a, b, melyseg) {
  if (melyseg >= ALLAPOT_UT_KORLAT) throw new Error('osszegzoFa: két kulcs útja azonos (lenyomat-ütközés)');
  const ba = bitje(a.level.ut, melyseg);
  const bb = bitje(b.level.ut, melyseg);
  if (ba !== bb) return ba === 0 ? belso(fa, a, b) : belso(fa, b, a);
  const alatta = await ketLevel(fa, a, b, melyseg + 1);
  return ba === 0 ? belso(fa, alatta, null) : belso(fa, null, alatta);
}

async function beszuras(fa, cs, uj, melyseg) {
  if (cs === null) return uj;
  if (cs.level) return cs.level.kulcs === uj.level.kulcs ? uj : ketLevel(fa, cs, uj, melyseg);
  if (bitje(uj.level.ut, melyseg) === 0) return belso(fa, await beszuras(fa, cs.bal, uj, melyseg + 1), cs.jobb);
  return belso(fa, cs.bal, await beszuras(fa, cs.jobb, uj, melyseg + 1));
}

async function torles(fa, cs, kulcs, ut, melyseg) {
  if (cs === null) return null;
  if (cs.level) return cs.level.kulcs === kulcs ? null : cs;
  const balra = bitje(ut, melyseg) === 0;
  const bal = balra ? await torles(fa, cs.bal, kulcs, ut, melyseg + 1) : cs.bal;
  const jobb = balra ? cs.jobb : await torles(fa, cs.jobb, kulcs, ut, melyseg + 1);
  if (bal === cs.bal && jobb === cs.jobb) return cs;          // nem volt benne: változatlan
  // ⭐ A kanonikus alak: egyelemű részfa maga a levél — a megmaradt levél feljebb csúszik.
  if (bal === null && (jobb === null || jobb.level)) return jobb;
  if (jobb === null && bal.level) return bal;
  return belso(fa, bal, jobb);
}

/**
 * Egy kulcs értékének beállítása (új kulcs vagy felülírás) — O(log n) munka.
 * @param {Object} fa - `ujAllapotFa`
 * @param {string} kulcs
 * @param {*} ertek - kanonikus alakra hozható (alapból null)
 * @param {Array<number>} osszegek - a fa-típus hosszával
 */
export async function allapotBeallitas(fa, kulcs, ertek, osszegek) {
  if (typeof kulcs !== 'string') throw new Error('osszegzoFa: a kulcs csak szöveg lehet');
  if (!osszegekRendben(osszegek, fa.hossz)) throw new Error('osszegzoFa: érvénytelen összeg-lista');
  const level = { kulcs, ut: await utja(fa.fajta, kulcs), ertek: ertek ?? null, osszegek: [...osszegek] };
  const uj = { level, osszegzes: await levelOsszegzes(fa.fajta, kulcs, level.ertek, level.osszegek) };
  fa.gyoker = await beszuras(fa, fa.gyoker, uj, 0);
}

/** Egy kulcs törlése (ha nincs benne, a fa nem változik) — O(log n) munka. */
export async function allapotTorles(fa, kulcs) {
  fa.gyoker = await torles(fa, fa.gyoker, kulcs, await utja(fa.fajta, kulcs), 0);
}

/** A fa gyökerének összegzése. */
export async function allapotGyokere(fa) {
  return osszegzese(fa, fa.gyoker);
}

/**
 * A fa ÖSSZES levele (a teljes ellenőrzéshez és a kiszolgálásához). ⚠️ O(n) — a kiosztás-fánál a
 * kerettel korlátos.
 * @returns {Array<{kulcs: string, ertek: *, osszegek: Array<number>}>}
 */
export function allapotLista(fa) {
  const ki = [];
  const bejar = (cs) => {
    if (cs === null) return;
    if (cs.level) { ki.push({ kulcs: cs.level.kulcs, ertek: cs.level.ertek, osszegek: [...cs.level.osszegek] }); return; }
    bejar(cs.bal); bejar(cs.jobb);
  };
  bejar(fa.gyoker);
  return ki;
}

/**
 * ⭐ A TELJES ELLENŐRZÉS alapja: a gyökér egy teljes listából (a sorrend mindegy — a fa alakja nem
 * függ tőle). ⚠️ Ismétlődő kulcs a listában: hibás lista (egy kulcs egy levél).
 * @returns {Promise<Object>} a gyökér összegzése
 */
export async function allapotGyokereListabol(fajta, hossz, lista) {
  const fa = ujAllapotFa(fajta, hossz);
  const lattuk = new Set();
  for (const { kulcs, ertek, osszegek } of lista) {
    if (lattuk.has(kulcs)) throw new Error('osszegzoFa: ismétlődő kulcs a listában');
    lattuk.add(kulcs);
    await allapotBeallitas(fa, kulcs, ertek, osszegek);
  }
  return allapotGyokere(fa);
}

/**
 * ⭐ A BIZONYÍTÉK egy kulcsról: a testvérek a gyökértől lefelé, és a végpont — a kulcs levele, vagy
 * (ha nincs benne) az a levél vagy üres hely, ahol lennie kellene. Így a HIÁNY is bizonyítható.
 * @returns {Promise<{testverek: Array<Object>, vegpont: null|{kulcs, ertek, osszegek}}>}
 */
export async function allapotBizonyitek(fa, kulcs) {
  const ut = await utja(fa.fajta, kulcs);
  const testverek = [];
  let cs = fa.gyoker;
  for (let melyseg = 0; cs !== null && !cs.level; melyseg++) {
    const balra = bitje(ut, melyseg) === 0;
    testverek.push(await osszegzese(fa, balra ? cs.jobb : cs.bal));
    cs = balra ? cs.bal : cs.jobb;
  }
  const vegpont = cs === null ? null
    : { kulcs: cs.level.kulcs, ertek: cs.level.ertek, osszegek: [...cs.level.osszegek] };
  return { testverek, vegpont };
}

/** A végpont összegzése és az útja (vagy null, ha a végpont alakja hibás). */
async function vegpontja(fajta, hossz, vegpont) {
  if (vegpont === null) return { osszegzes: await uresOsszegzes(fajta, hossz), ut: null };
  if (!vegpont || typeof vegpont !== 'object' || typeof vegpont.kulcs !== 'string'
      || !osszegekRendben(vegpont.osszegek, hossz)) return null;
  try {
    return {
      osszegzes: await levelOsszegzes(fajta, vegpont.kulcs, vegpont.ertek ?? null, vegpont.osszegek),
      ut: await utja(fajta, vegpont.kulcs)
    };
  } catch {
    return null;                         // az érték nem hozható kanonikus alakra
  }
}

/** A bizonyíték alapellenőrzése, és a végpont összegzése — vagy az ok, amiért elutasítjuk. */
async function bizonyitekAlapja(fajta, hossz, kulcs, bizonyitek) {
  const { testverek, vegpont } = bizonyitek ?? {};
  if (!Array.isArray(testverek) || testverek.length > ALLAPOT_UT_KORLAT) return { ok: 'túl hosszú vagy hibás testvér-lista' };
  if (!testverek.every((t) => osszegzesAlakja(t, hossz))) return { ok: 'hibás testvér-lista' };
  if (vegpont === undefined) return { ok: 'hiányzó végpont' };
  const vp = await vegpontja(fajta, hossz, vegpont);
  if (!vp) return { ok: 'hibás végpont' };
  const ut = await utja(fajta, kulcs);
  const m = testverek.length;
  // ⛔ Egy MÁSIK kulcs levele csak ott állhat, ahol a mi kulcsunk útja is jár (az első m bit közös).
  if (vp.ut !== null && vegpont.kulcs !== kulcs) {
    for (let i = 0; i < m; i++) if (bitje(vp.ut, i) !== bitje(ut, i)) return { ok: 'a végpont nem a kulcs útján áll' };
  }
  // ⛔ A kanonikus alak: a végpont fölötti csomópontban legalább két levél van (üres végpontnál a
  // testvér legalább kettőt, levél-végpontnál legalább egyet hordoz).
  if (m > 0 && testverek[m - 1].d < (vegpont === null ? 2 : 1)) return { ok: 'nem kanonikus fa' };
  return { ut, vp, m, testverek };
}

/** Az útvonal fölfelé: a végponttól a gyökérig. */
async function felfele(fajta, ut, testverek, also) {
  let r = also;
  for (let i = testverek.length - 1; i >= 0; i--) {
    r = bitje(ut, i) === 0 ? await csomopontOsszegzes(fajta, r, testverek[i]) : await csomopontOsszegzes(fajta, testverek[i], r);
  }
  return r;
}

/**
 * ⭐ A BIZONYÍTÉK ELLENŐRZÉSE: a kulcs benne van-e, és ha igen, mi az értéke és az összege.
 * ⛔ Idegen bemenet: alakját, méretét és kanonikus voltát is ellenőrizzük.
 * @returns {Promise<{rendben: boolean, ok?: string, van?: boolean, ertek?: *, osszegek?: Array<number>}>}
 */
export async function allapotBizonyitekEllenorzese(fajta, hossz, gyoker, kulcs, bizonyitek) {
  if (!osszegzesAlakja(gyoker, hossz) || typeof kulcs !== 'string') return { rendben: false, ok: 'hibás gyökér vagy kulcs' };
  const alap = await bizonyitekAlapja(fajta, hossz, kulcs, bizonyitek);
  if (alap.ok) return { rendben: false, ok: alap.ok };
  const { ut, vp, testverek } = alap;
  if (!azonosOsszegzes(await felfele(fajta, ut, testverek, vp.osszegzes), gyoker)) {
    return { rendben: false, ok: 'a bizonyíték nem a gyökérhez tartozik' };
  }
  const van = bizonyitek.vegpont !== null && bizonyitek.vegpont.kulcs === kulcs;
  return van
    ? { rendben: true, van, ertek: bizonyitek.vegpont.ertek ?? null, osszegek: [...bizonyitek.vegpont.osszegek] }
    : { rendben: true, van };
}

/** Két levél közös részfájának összegzése — a bizonyítékból, a fa nélkül (a `ketLevel` párja). */
async function ketLevelOsszegzese(fajta, hossz, a, b, melyseg) {
  if (melyseg >= ALLAPOT_UT_KORLAT) throw new Error('osszegzoFa: két kulcs útja azonos (lenyomat-ütközés)');
  const ba = bitje(a.ut, melyseg);
  const bb = bitje(b.ut, melyseg);
  if (ba !== bb) return ba === 0 ? csomopontOsszegzes(fajta, a.osszegzes, b.osszegzes) : csomopontOsszegzes(fajta, b.osszegzes, a.osszegzes);
  const alatta = await ketLevelOsszegzese(fajta, hossz, a, b, melyseg + 1);
  const ures = await uresOsszegzes(fajta, hossz);
  return ba === 0 ? csomopontOsszegzes(fajta, alatta, ures) : csomopontOsszegzes(fajta, ures, alatta);
}

/**
 * ⭐⭐ EGY VÁLTOZÁS ELLENŐRIZHETŐ KISZÁMÍTÁSA — a régi gyökérből és a kulcs bizonyítékából, a fa
 * nélkül: mi lesz az új gyökér, ha a kulcs értéke `uj` lesz (vagy `null`: törlés)?
 *
 * ⭐ Ez teszi a bemondott összeget (D42) ellenőrizhetővé egyetlen eseményből: a régi gyökér és a
 * változás bizonyítéka megadja az új gyökeret — és vele az új összeget. A kanonikus alak szabályai
 * (a levél feljebb csúszik, a két levél szétválik) itt ugyanúgy érvényesülnek, mint a fában.
 *
 * @param {string} fajta
 * @param {number} hossz
 * @param {Object} gyoker - a RÉGI gyökér összegzése
 * @param {string} kulcs
 * @param {Object} bizonyitek - a kulcs bizonyítéka a RÉGI gyökérben
 * @param {null|{ertek: *, osszegek: Array<number>}} uj - az új érték, vagy null (törlés)
 * @returns {Promise<{rendben: boolean, ok?: string, gyoker?: Object}>}
 */
export async function allapotValtozasa(fajta, hossz, gyoker, kulcs, bizonyitek, uj) {
  const regi = await allapotBizonyitekEllenorzese(fajta, hossz, gyoker, kulcs, bizonyitek);
  if (!regi.rendben) return regi;
  if (uj !== null && (!uj || !osszegekRendben(uj.osszegek, hossz))) return { rendben: false, ok: 'hibás új érték' };
  const { ut, vp, testverek } = await bizonyitekAlapja(fajta, hossz, kulcs, bizonyitek);
  const ures = await uresOsszegzes(fajta, hossz);

  // ----- A végpont helyén álló új részfa -----
  let also;
  let ujLevel = null;
  if (uj !== null) {
    try {
      ujLevel = { osszegzes: await levelOsszegzes(fajta, kulcs, uj.ertek ?? null, uj.osszegek), ut };
    } catch {
      return { rendben: false, ok: 'az új érték nem hozható kanonikus alakra' };
    }
  }
  if (regi.van || bizonyitek.vegpont === null) {
    also = ujLevel ? ujLevel.osszegzes : ures;          // felülírás / törlés / beszúrás üres helyre
  } else if (ujLevel) {
    also = await ketLevelOsszegzese(fajta, hossz, vp, ujLevel, testverek.length);   // a két levél szétválik
  } else {
    return { rendben: true, gyoker };                     // nem volt benne, és törölnénk: nincs változás
  }

  // ----- Fölfelé, a kanonikus alakkal: ha egy csomópontban csak egy levél marad, az feljebb csúszik -----
  let r = also;
  for (let i = testverek.length - 1; i >= 0; i--) {
    const t = testverek[i];
    if (r.d + t.d <= 1) {
      r = r.d === 1 ? r : t.d === 1 ? t : ures;
    } else {
      r = bitje(ut, i) === 0 ? await csomopontOsszegzes(fajta, r, t) : await csomopontOsszegzes(fajta, t, r);
    }
  }
  return { rendben: true, gyoker: r };
}

// ===================================
// ⭐⭐ A SÚLYOZOTT MINTAVÉTEL — az össz-pont szúrópróbája (D92/5, 2026-10-03)
// ===================================
//
// Az állapot-fa levelei egy-egy összeg-szeletet fednek (a kulcsok sorrendje a fában — a lenyomat bitjei szerint):
// az r-edik egység (0 ≤ r < a gyökér összege) pontosan egy levélre esik. ⭐ A levél bizonyítékából a levél
// TARTOMÁNYA is kiszámolható — a bal testvérek összege az út mentén —, tehát aki egy felfújt gyökeret mond be, annak
// a felfújt rész hamis levelekben van, és egy véletlen r f eséllyel oda esik: k mintából 1 − (1 − f)^k eséllyel
// lebukik. ⚠️ Az r-t a KÉRDEZŐ választja, a gyökér bemondása UTÁN (különben a fa építője addig próbálkozik, amíg a
// minták el nem kerülik a hamis leveleket).

/**
 * Melyik levélre esik az r-edik egység (az `i`-edik összeg szerint) — a levél kulcsa és bizonyítéka.
 * @param {Object} fa - `ujAllapotFa`
 * @param {number} r - 0 ≤ r < a gyökér i-edik összege
 * @param {number} [i] - melyik összeg (alapból az első)
 * @returns {Promise<null|{kulcs: string, bizonyitek: Object}>} null, ha r a tartományon kívül esik
 */
export async function allapotSulyozottKeresese(fa, r, i = 0) {
  const gyoker = await osszegzese(fa, fa.gyoker);
  if (!Number.isSafeInteger(r) || r < 0 || i < 0 || i >= fa.hossz || r >= gyoker.o[i]) return null;
  let cs = fa.gyoker;
  let maradek = r;
  while (cs !== null && !cs.level) {
    const bal = (await osszegzese(fa, cs.bal)).o[i];
    if (maradek < bal) cs = cs.bal;
    else { maradek -= bal; cs = cs.jobb; }
  }
  if (cs === null) return null;
  return { kulcs: cs.level.kulcs, bizonyitek: await allapotBizonyitek(fa, cs.level.kulcs) };
}

/**
 * ⭐ A súlyozott minta ELLENŐRZÉSE: a bizonyíték a gyökérhez tartozik, a kulcs benne van, és a levél tartománya
 * — [a bal testvérek összege, + a levél összege) — lefedi r-t. ⛔ Az út mentén minden testvér összege és a levél
 * összege nem negatív (különben a tartományok átfednék egymást).
 * @returns {Promise<{rendben: boolean, ok?: string, ertek?: *, osszegek?: Array<number>, tol?: number, ig?: number}>}
 */
export async function allapotSulyozottEllenorzese(fajta, hossz, gyoker, kulcs, bizonyitek, r, i = 0) {
  if (!Number.isSafeInteger(r) || r < 0 || !Number.isInteger(i) || i < 0 || i >= hossz) {
    return { rendben: false, ok: 'hibás minta-hely' };
  }
  const e = await allapotBizonyitekEllenorzese(fajta, hossz, gyoker, kulcs, bizonyitek);
  if (!e.rendben) return e;
  if (!e.van) return { rendben: false, ok: 'a kulcs nincs a fában' };
  const ut = await utja(fajta, kulcs);
  let tol = 0;
  for (let m = 0; m < bizonyitek.testverek.length; m++) {
    const t = bizonyitek.testverek[m];
    if (t.o[i] < 0) return { rendben: false, ok: 'negatív összeg az úton' };
    if (bitje(ut, m) === 1) tol += t.o[i];             // jobbra mentünk: a testvér a bal oldalon áll
  }
  const sajat = e.osszegek[i];
  if (sajat < 0) return { rendben: false, ok: 'negatív levél' };
  const ig = tol + sajat;
  if (!(tol <= r && r < ig)) return { rendben: false, ok: 'a levél tartománya nem fedi a mintát' };
  return { rendben: true, ertek: e.ertek, osszegek: e.osszegek, tol, ig };
}
