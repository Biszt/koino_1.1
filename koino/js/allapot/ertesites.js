// koino/js/allapot/ertesites.js

// Felelősség: ⭐⭐ AZ ÉRTESÍTÉS-RÉTEG (D101 ⑥, M3/A) — a postafiók a KÉSZÜLÉKEN számolódik, abból, ami hozzá megérkezett.
//
// ===== MIÉRT ÍGY =====
//
// A prototípusban a szerver írta az értesítést, amikor valami történt (nyolc fajta: új javaslat, elfogadás, elvetés,
// szavazat, közeledő határidő, tudatpont-változás, új gyerek, küszöbváltozás), az e-ember beállításai szerint (entitásonként,
// a felmenőkön öröklődve, a legközelebbi nyer; ha sehol nincs, a globális). ⭐ Itt nincs szerver, ami írna: a készülék
// SZÁMOLJA a saját postafiókját — és nem eseményenként, hanem két PILLANATKÉP különbségéből (a tartott entitások saját és
// ágazati pontja, gyerekei, küszöbei; a javaslatok állapota, határideje, szavazói). Ettől:
//   · a terhe a készülék saját szeleteitől függ (amit tart), nem a koinó méretétől (a „végtelen” próbája);
//   · nem számít, hogyan jött meg a változás (csere, kérelem, kézi út) — a kép a kép;
//   · és ami közben megváltozott, azt a következő számolás egyszerre látja (nincs elveszett esemény, nincs dupla).
// ⛔ A szigorú (b) alatt CSAK a részvételi szeletekből (M3/A): egy nem tartott entitás gyerekeit, pontjait nem ismerem —
// ott semmit nem jelzek (a kérelem hozta adat nem „új” — csak most láttam). Ami a tartott ágon mélyebben, egy nem tartott
// entitás alatt történik, arról nem tudok (D19 — a felület kimondja).
//
// A beállítás és a postafiók HELYI feljegyzés (a prototípusban is `helyi` réteg — H6), nem esemény, nem terjed. A kép első
// számolása ALAPVONAL: semmit nem jelez (különben egy friss készülék a teljes múltról kapna értesítést).
//
// Hálózatot és fájlt nem importál — a tárolást a hívó végzi (`fajlTar.js` `ertesitesTarolo`), a képet a `pakli.js`
// `ertesitesiKep` számolja.
//
// Használja: `pakli.js` (`ertesitesiKep`), `koino.js` (a postafiók és a beállítások útvonalai).

import { createHash } from 'node:crypto';
import { gyerekJegyzek } from './osszPont.js';

// ===================================
// ÁLLANDÓK
// ===================================

/** A nyolc fajta — a prototípus enumja (`ertesites.js` modell). A `szavazatErkezett` a felületen nem választható (ott sem). */
export const ERTESITES_TIPUSOK = ['ujJavaslat', 'javaslatElfogadas', 'javaslatElvetve', 'szavazatErkezett',
  'szavazasiHatarido', 'tudatpontValtozas', 'ujGyerekEntitas', 'kuszobValtozas'];
/** ⛔ A postafiók felülről korlátos: legfeljebb ennyi tétel, és ennél régebbi nem marad meg (M3/A). */
export const POSTAFIOK_KORLAT = 500;
export const POSTAFIOK_ELETTARTAM = 30 * 86400 * 1000;
/** A határidő ennyivel előtte jelez (a prototípus 24 órája). */
export const HATARIDO_ELORE = 24 * 3600 * 1000;
/** Legfeljebb ennyi entitásra lehet saját beállítás (helyi feljegyzés — korlátos). */
export const BEALLITAS_KORLAT = 1000;
/** A felmenő-lánc legfeljebb ennyi lépés (mint a pakliban — `FELMENO_KORLAT`). */
const LANC_KORLAT = 64;
/** Új gyereknek ezek számítanak (a javaslat a saját fajtáival jelez — nem „új gyerek”). */
const GYEREK_TIPUSOK = new Set(['Gondolat', 'Kategoria', 'GondolatTipus']);
const KUSZOB_NEVEK = ['sajatDirekt', 'sajatSzazalek', 'osszDirekt', 'osszSzazalek'];

// ===================================
// A BEÁLLÍTÁSOK
// ===================================

/** A tudatpont-változás négy küszöbe egységes alakban (a hiányzó vagy hibás: null) — a prototípus `normalizaltKuszobok`-ja. */
export function normalizaltKuszobok(k) {
  const ki = {};
  for (const n of KUSZOB_NEVEK) {
    const v = Number(k?.[n]);
    ki[n] = k?.[n] != null && k?.[n] !== '' && Number.isFinite(v) && v >= 1 ? (n.endsWith('Szazalek') ? Math.min(100, v) : v) : null;
  }
  return ki;
}

const tipusLista = (x) => (Array.isArray(x) ? [...new Set(x.filter((t) => ERTESITES_TIPUSOK.includes(t)))] : []);

/** A globális (fő menüs) alapbeállítás alakja — a prototípus mezőivel (az e-mail mezők is: a koinóban nincs hatásuk). */
function globalisAlakja(g) {
  const orakoz = Math.round(Number(g?.emailOrakoz));
  return {
    ertesitesTipusok: tipusLista(g?.ertesitesTipusok),
    tudatpontKuszobok: normalizaltKuszobok(g?.tudatpontKuszobok),
    tudatpontSzuro: g?.tudatpontSzuro === true,
    emailErtesites: g?.emailErtesites === true,
    emailMod: g?.emailMod === 'azonnal' ? 'azonnal' : 'osszefoglalo',
    emailOrakoz: Number.isFinite(orakoz) && orakoz >= 1 ? Math.min(168, orakoz) : 24
  };
}

function entitasBeallitasAlakja(az, b) {
  return {
    entitasId: az,
    entitasTipus: typeof b?.entitasTipus === 'string' ? b.entitasTipus : 'Gondolat',
    ertesitesTipusok: tipusLista(b?.ertesitesTipusok),
    tudatpontKuszobok: normalizaltKuszobok(b?.tudatpontKuszobok),
    tudatpontSzuro: b?.tudatpontSzuro === true,
    kikapcsolva: b?.kikapcsolva === true,
    ido: Number.isFinite(b?.ido) ? b.ido : 0
  };
}

/** Üres beállítás-készlet: semmi nincs bekapcsolva (a prototípus opt-in rendszere). */
export function uresBeallitasok() {
  return { globalis: globalisAlakja({}), entitasok: {} };
}

/** A tárolt (vagy a lapról jött) beállítás-készlet ellenőrzött alakja — a hibás mező alapértékre esik, nem dob. */
export function beallitasokAlakja(nyers) {
  const ki = uresBeallitasok();
  if (nyers?.globalis && typeof nyers.globalis === 'object') ki.globalis = globalisAlakja(nyers.globalis);
  const e = nyers?.entitasok && typeof nyers.entitasok === 'object' && !Array.isArray(nyers.entitasok)
    ? Object.entries(nyers.entitasok) : [];
  for (const [az, b] of e.slice(0, BEALLITAS_KORLAT)) if (typeof az === 'string' && az) ki.entitasok[az] = entitasBeallitasAlakja(az, b);
  return ki;
}

/**
 * Egy entitás saját beállításának mentése (upsert) — a legrégebbi esik ki, ha a korlátot elérné.
 * @returns {Object} az új készlet
 */
export function beallitasMentese(beallitasok, az, adat, most = Date.now()) {
  const ki = beallitasokAlakja(beallitasok);
  ki.entitasok[az] = entitasBeallitasAlakja(az, { ...adat, ido: most });
  const lista = Object.entries(ki.entitasok).sort((a, b) => b[1].ido - a[1].ido).slice(0, BEALLITAS_KORLAT);
  ki.entitasok = Object.fromEntries(lista);
  return ki;
}

/** A globális alapbeállítás mentése — a nem küldött e-mail mező megmarad (a prototípus szabálya). */
export function globalisMentese(beallitasok, adat) {
  const ki = beallitasokAlakja(beallitasok);
  const regi = ki.globalis;
  ki.globalis = globalisAlakja({
    ...adat,
    emailErtesites: adat?.emailErtesites === undefined ? regi.emailErtesites : adat.emailErtesites,
    emailMod: adat?.emailMod ?? regi.emailMod,
    emailOrakoz: adat?.emailOrakoz ?? regi.emailOrakoz
  });
  return ki;
}

/** Egy entitás felmenő-lánca, önmagától felfelé (≤ 64 lépés, kör-biztos). Ha egy felmenő nincs meg, ott véget ér. */
export function felmenoLanc(entitasok, az) {
  const lanc = [];
  const latott = new Set();
  let x = az;
  while (typeof x === 'string' && x && !latott.has(x) && lanc.length < LANC_KORLAT) {
    latott.add(x);
    lanc.push(x);
    x = entitasok.get(x)?.szulo ?? null;
  }
  return lanc;
}

/**
 * ⭐ Az entitáson ÉPP ÉRVÉNYES beállítás — a felmenőkön felfelé a legközelebbi saját beállítás nyer (teljes felülírás);
 * ha sehol nincs, a globális (a prototípus `ervenyesBeallitasLekereses`-e: `forras` 'sajat' | 'orokolt' | 'globalis').
 * ⚠️ A szigorú (b) alatt a lánc egy nem ismert felmenőnél véget ér — egy fölötte álló beállítás ilyenkor nem látszik (D19).
 */
export function ervenyesBeallitas(beallitasok, entitasok, az) {
  for (const x of felmenoLanc(entitasok, az)) {
    const b = beallitasok.entitasok[x];
    if (b) return { ...b, forras: x === az ? 'sajat' : 'orokolt', vanSajat: x === az, beallitasId: x === az ? x : null, honnan: x };
  }
  const g = beallitasok.globalis;
  return { ertesitesTipusok: g.ertesitesTipusok, tudatpontKuszobok: g.tudatpontKuszobok, tudatpontSzuro: g.tudatpontSzuro,
    kikapcsolva: false, forras: 'globalis', vanSajat: false, beallitasId: null, honnan: null };
}

/** A tudatpont-változás négy küszöbe („VAGY” — bármelyik megadott elég; ha egyik sincs, minden változás jelez). */
export function tudatpontKuszobTeljesul(kuszobok, adatok = {}) {
  const { sajatDirekt, sajatSzazalek, osszDirekt, osszSzazalek } = normalizaltKuszobok(kuszobok);
  if (sajatDirekt == null && sajatSzazalek == null && osszDirekt == null && osszSzazalek == null) return true;
  const sajatValt = Math.abs(adatok.sajatValtozas || 0);
  const osszValt = Math.abs(adatok.osszValtozas || 0);
  const sajatOssz = adatok.sajatOssz || 0;
  const osszOssz = adatok.osszOssz || 0;
  if (sajatDirekt != null && sajatValt >= sajatDirekt) return true;
  if (osszDirekt != null && osszValt >= osszDirekt) return true;
  if (sajatSzazalek != null && sajatOssz > 0 && (sajatValt / sajatOssz) * 100 >= sajatSzazalek) return true;
  if (osszSzazalek != null && osszOssz > 0 && (osszValt / osszOssz) * 100 >= osszSzazalek) return true;
  return false;
}

// ===================================
// A PILLANATKÉP
// ===================================

/**
 * ⭐ A pillanatkép: a TARTOTT entitások (saját pont `s`, az én pontom `m`, ágazati `o`, gyerekek `gy`, küszöbök `k`) és a
 * javaslatok, amelyeknek van tartott érintettje (állapot `st`, lezárás `lz`, érintettek `er`, a MÁSOK szavazóinak száma
 * `sz`, enyém-e `l`, művelet `mu`, a határidő-jelzés megvolt-e `h`).
 * @param {Object} b - { entitasok, javaslatok, agazati (Map), tartott (az → bool), en, szavazatok (Map javaslat → Set
 *   szerző), kuszobKi (a küszöbök kimenő alakja — a modál ezeket a neveket írja ki), most }
 */
export function pillanatkep({ entitasok, javaslatok, agazati, tartott, en, szavazatok = new Map(), kuszobKi = (k) => k, most }) {
  const e = {};
  const j = {};
  const gyerekek = gyerekJegyzek(entitasok);
  for (const [az, x] of entitasok) {
    if (!tartott(az) || x.tipus === 'Javaslat' || x.pontokIsmeretlenek) continue;
    e[az] = {
      s: x.osszesPont ?? 0,
      m: (en && x.hozzajarulok?.get?.(en)?.pont) || 0,
      o: agazati.get(az) ?? 0,
      gy: (gyerekek.get(az) ?? []).filter((g) => GYEREK_TIPUSOK.has(entitasok.get(g)?.tipus)),
      k: x.kuszobok ? kuszobKi(x.kuszobok) : null
    };
  }
  for (const [jaz, d] of javaslatok ?? []) {
    const er = (d.erintettek ?? []).map((r) => (typeof r === 'string' ? r : r?.entitas)).filter((x) => typeof x === 'string' && e[x]);
    if (!er.length) continue;
    const sz = szavazatok.get(jaz);
    j[jaz] = {
      st: d.statusz ?? null,
      lz: Number.isFinite(d.lezarasIdeje) ? d.lezarasIdeje : null,
      er: [...new Set(er)],
      sz: sz ? [...sz].filter((x) => x !== en).length : 0,
      l: d.letrehozo === en ? 1 : 0,
      mu: d.muvelet ?? null,
      h: 0
    };
  }
  return { e, j, ido: most };
}

// ===================================
// AZ ÚJ ÉRTESÍTÉSEK — két pillanatkép különbségéből
// ===================================

/** Egy postafiók-tétel — a prototípus alakjában (`_id`, `tipus`, `entitasId`, `entitasTipus`, `osLanc`, `adatok`, …). */
function tetel(tipus, az, entitasok, adatok, most) {
  const kulcs = [tipus, az, adatok.javaslatId ?? adatok.gyerekId ?? '', most].join('|');
  return {
    _id: createHash('sha256').update(kulcs).digest('base64url').slice(0, 22),
    tipus,
    entitasId: az,
    entitasTipus: entitasok.get(az)?.tipus ?? 'Gondolat',
    osLanc: felmenoLanc(entitasok, az),
    adatok,
    createdAt: new Date(most).toISOString(),
    olvasva: false,
    olvasvaIdopont: null
  };
}

/**
 * ⭐ Az új értesítések a régi és az új pillanatkép különbségéből — az e-ember érvényes beállításai szerint (a tudatpont-
 * szűrő: csak ahol pontom van; a tudatpont-változás küszöbei). Ami az ÉN cselekvésem (az én gyerekem, az én javaslatom,
 * az én pontom), arról nem jelez (a prototípus „a cselekvőt nem értesítjük”). A régi kép nélkül (az első számolás) semmit
 * nem jelez — az az alapvonal; és egy entitás, amit eddig nem tartottam, szintén alapvonal (nem „új”, csak most látom).
 * ⚠️ A határidő-jelzés jegyét (`h`) az új képbe írja (egyszer jelez).
 * @returns {Array<Object>} az új tételek
 */
export function ertesitesekSzamitasa(elozo, uj, { beallitasok, entitasok, en, most }) {
  const tetelek = [];
  if (!elozo || typeof elozo !== 'object') return tetelek;
  const b0 = beallitasokAlakja(beallitasok);
  const kuld = (tipus, az, adatok) => {
    const b = ervenyesBeallitas(b0, entitasok, az);
    if (b.kikapcsolva || !b.ertesitesTipusok.includes(tipus)) return;
    if (b.tudatpontSzuro && !(uj.e[az]?.m > 0)) return;
    if (tipus === 'tudatpontValtozas' && !tudatpontKuszobTeljesul(b.tudatpontKuszobok, adatok)) return;
    tetelek.push(tetel(tipus, az, entitasok, adatok, most));
  };

  for (const [az, x] of Object.entries(uj.e)) {
    const regi = elozo.e?.[az];
    if (!regi) continue;
    const regiGy = new Set(regi.gy ?? []);
    for (const g of x.gy) {
      if (!regiGy.has(g) && entitasok.get(g)?.szerzo !== en) {
        kuld('ujGyerekEntitas', az, { gyerekId: g, gyerekTipus: entitasok.get(g)?.tipus ?? 'Gondolat' });
      }
    }
    // a MÁSOK közvetlen pontja változott (az enyém nem jelez)
    const masok = (x.s - x.m) - ((regi.s ?? 0) - (regi.m ?? 0));
    if (masok !== 0) {
      kuld('tudatpontValtozas', az, { sajatValtozas: masok, osszValtozas: x.o - (regi.o ?? 0), sajatOssz: x.s, osszOssz: x.o });
    }
    if (regi.k && x.k) {
      const valtozasok = Object.keys(x.k).filter((n) => regi.k[n] !== x.k[n]).map((n) => ({ mezo: n, regi: regi.k[n], uj: x.k[n] }));
      if (valtozasok.length) kuld('kuszobValtozas', az, { valtozasok });
    }
  }

  for (const [jaz, d] of Object.entries(uj.j)) {
    const regi = elozo.j?.[jaz];
    const adat = { javaslatId: jaz, javaslatTipus: d.mu };
    const dontes = d.st === 'elfogadva' ? 'javaslatElfogadas' : d.st === 'elvetve' ? 'javaslatElvetve' : null;
    if (!regi) {
      // Új javaslat a legutóbbi kép óta — ha nem az enyém, és az érintettjét már akkor is tartottam (különben alapvonal).
      const er = d.er.filter((az) => elozo.e?.[az]);
      if (!d.l) for (const az of er) kuld('ujJavaslat', az, adat);
      if (dontes && d.lz != null && d.lz >= (elozo.ido ?? 0)) for (const az of er) kuld(dontes, az, adat);
      continue;
    }
    if (d.sz > (regi.sz ?? 0)) for (const az of d.er) kuld('szavazatErkezett', az, { ...adat, ujSzavazat: d.sz - (regi.sz ?? 0) });
    if (regi.st === 'folyamatban' && dontes) for (const az of d.er) kuld(dontes, az, adat);
    if (regi.h) d.h = 1;
    else if (d.st === 'folyamatban' && d.lz != null && d.lz > most && d.lz - most <= HATARIDO_ELORE) {
      for (const az of d.er) kuld('szavazasiHatarido', az, { ...adat, hatalybaLepesIdeje: new Date(d.lz).toISOString() });
      d.h = 1;
    }
  }
  return tetelek;
}

// ===================================
// A POSTAFIÓK
// ===================================

export function uresPostafiok() {
  return { tetelek: [], kep: null, kezbesites: uresKezbesites(), frissitve: 0 };
}

/** ⭐ D103: a készülék értesítésének állapota — mikor ment ki utoljára, és hány tétel gyűlt azóta (az összefoglalóhoz). */
function uresKezbesites() {
  return { utolso: null, gyujto: 0, hiba: null };
}

function kezbesitesAlakja(k) {
  return {
    utolso: Number.isFinite(k?.utolso) ? k.utolso : null,
    gyujto: Number.isSafeInteger(k?.gyujto) && k.gyujto >= 0 ? k.gyujto : 0,
    hiba: typeof k?.hiba === 'string' ? k.hiba.slice(0, 300) : null
  };
}

/** A tárolt postafiók ellenőrzött alakja (a hibás tétel kimarad). */
export function postafiokAlakja(nyers) {
  const tetelek = (Array.isArray(nyers?.tetelek) ? nyers.tetelek : []).filter((t) => t && typeof t._id === 'string'
    && ERTESITES_TIPUSOK.includes(t.tipus) && typeof t.entitasId === 'string' && Array.isArray(t.osLanc)
    && typeof t.createdAt === 'string').slice(0, POSTAFIOK_KORLAT)
    .map((t) => ({ ...t, olvasva: t.olvasva === true, adatok: t.adatok && typeof t.adatok === 'object' ? t.adatok : {} }));
  const kep = nyers?.kep && typeof nyers.kep === 'object' && nyers.kep.e && nyers.kep.j ? nyers.kep : null;
  return { tetelek, kep, kezbesites: kezbesitesAlakja(nyers?.kezbesites),
    frissitve: Number.isFinite(nyers?.frissitve) ? nyers.frissitve : 0 };
}

/** Az új tételek a postafiók elejére; a túl régi és a korlát fölötti kiesik. */
export function postafiokBovitese(postafiok, ujak, kep, most = Date.now()) {
  const tetelek = [...ujak.slice().reverse(), ...postafiok.tetelek]
    .filter((t) => most - Date.parse(t.createdAt) <= POSTAFIOK_ELETTARTAM)
    .slice(0, POSTAFIOK_KORLAT);
  return { tetelek, kep, kezbesites: kezbesitesAlakja(postafiok.kezbesites), frissitve: most };
}

const agban = (t, agazat) => !agazat || t.entitasId === agazat || t.osLanc.includes(agazat);

/**
 * A postafiók egy lapja — a prototípus `postafiokLekereses` alakjában: `{ ertesitesek, osszes, olvasatlan, lapokSzama }`,
 * a legújabb elöl, ág-szűrve (az ős-lánc szerint).
 */
export function postafiokLapja(postafiok, { lap = 1, lapMeret = 20, agazat = null } = {}) {
  const meret = Math.max(1, Math.min(Number.isInteger(lapMeret) ? lapMeret : 20, 100));
  const oldal = Math.max(1, Number.isInteger(lap) ? lap : 1);
  const lista = postafiok.tetelek.filter((t) => agban(t, agazat));
  return {
    ertesitesek: lista.slice((oldal - 1) * meret, oldal * meret),
    osszes: lista.length,
    olvasatlan: lista.filter((t) => !t.olvasva).length,
    lapokSzama: Math.ceil(lista.length / meret)
  };
}

/** Olvasottnak jelöl — egy tételt (`id`), vagy mindet (ág-szűrve). @returns {number} hány változott */
export function olvasottnakJelol(postafiok, { id = null, agazat = null } = {}, most = Date.now()) {
  let db = 0;
  for (const t of postafiok.tetelek) {
    if (t.olvasva) continue;
    if (id ? t._id !== id : !agban(t, agazat)) continue;
    t.olvasva = true;
    t.olvasvaIdopont = new Date(most).toISOString();
    db++;
  }
  return db;
}

/** A kártyák számlálója: entitásonként az alatta (ős-lánc szerint) olvasatlan tételek száma. */
export function olvasatlanTerkep(postafiok) {
  const ki = new Map();
  for (const t of postafiok.tetelek) {
    if (t.olvasva) continue;
    for (const az of new Set([t.entitasId, ...t.osLanc])) ki.set(az, (ki.get(az) ?? 0) + 1);
  }
  return ki;
}

// ===================================
// ⭐ D103: A KÉSZÜLÉK SAJÁT ÉRTESÍTÉSE — mit kell most jeleznie (tiszta számítás)
// ===================================
//
// A prototípus a postafiók tételeit kérésre levélben is kézbesítette (azonnal, vagy N óránként összefoglalva); a koinóban
// a levél helyett a készülék saját értesítése jön (D103 — az operációs rendszer felé, `eszkozErtesites.js`). A kapcsoló és
// az ütem a prototípus mezői (`emailErtesites`, `emailMod`, `emailOrakoz`) — a koinóban ezt jelentik.

/** Azonnali módban egy számolásból legfeljebb ennyi értesítés megy ki; a többiről egy összegző („és még N”). */
export const KESZULEK_AZONNAL_KORLAT = 5;

/** A fajták felirata a készülék értesítésében (a modál szótára — `ErtesitesekModal` `TIPUS_SZOVEG`). */
export const ERTESITES_FELIRAT = {
  ujJavaslat: 'Új javaslat',
  javaslatElfogadas: 'Javaslat elfogadva',
  javaslatElvetve: 'Javaslat elvetve',
  szavazatErkezett: 'Új szavazat',
  szavazasiHatarido: 'Szavazási határidő közeleg',
  tudatpontValtozas: 'Tudatpont-változás',
  ujGyerekEntitas: 'Új gondolat jött létre',
  kuszobValtozas: 'Küszöbváltozás'
};

/**
 * ⭐ Mit jelezzen most a készülék — a globális beállítás szerint. Kikapcsolva semmit (és nem gyűjt: a bekapcsolás után nem
 * jön a múlt); azonnal: az új tételek (legfeljebb `KESZULEK_AZONNAL_KORLAT`, a többiről egy összegző); összefoglaló: a
 * tételek gyűlnek, és ha az időköz letelt, EGY értesítés a számukkal (az első bekapcsoláskor az időköz onnan indul).
 * @param {Array<Object>} ujak - a most keletkezett tételek
 * @param {Object} globalis - a globális beállítás (`emailErtesites`, `emailMod`, `emailOrakoz`)
 * @param {Object} kezbesites - az eddigi állapot (`utolso`, `gyujto`)
 * @param {number} most
 * @param {Function} [cime] - az → az entitás címe (vagy null)
 * @returns {{uzenetek: Array<{cim: string, szoveg: string}>, kezbesites: Object}}
 */
export function keszulekErtesitesei(ujak, globalis, kezbesites, most, cime = () => null) {
  const k = kezbesitesAlakja(kezbesites);
  if (!globalis?.emailErtesites) return { uzenetek: [], kezbesites: { ...k, gyujto: 0 } };
  if (globalis.emailMod === 'azonnal') {
    const uzenetek = ujak.slice(0, KESZULEK_AZONNAL_KORLAT).map((t) => ({
      cim: 'koino — ' + (ERTESITES_FELIRAT[t.tipus] ?? 'Értesítés'),
      szoveg: cime(t.entitasId) ?? 'egy gondolaton, amit figyelsz'
    }));
    if (ujak.length > KESZULEK_AZONNAL_KORLAT) {
      uzenetek.push({ cim: 'koino', szoveg: 'és még ' + (ujak.length - KESZULEK_AZONNAL_KORLAT) + ' új értesítés — a postafiókban' });
    }
    return { uzenetek, kezbesites: { ...k, utolso: uzenetek.length ? most : k.utolso, gyujto: 0 } };
  }
  const gyujto = k.gyujto + ujak.length;
  const koz = (Number.isFinite(globalis.emailOrakoz) ? globalis.emailOrakoz : 24) * 3600 * 1000;
  if (k.utolso == null) return { uzenetek: [], kezbesites: { ...k, utolso: most, gyujto } };
  if (gyujto > 0 && most - k.utolso >= koz) {
    return { uzenetek: [{ cim: 'koino', szoveg: gyujto + ' új értesítés a postafiókban' }], kezbesites: { ...k, utolso: most, gyujto: 0 } };
  }
  return { uzenetek: [], kezbesites: { ...k, gyujto } };
}
