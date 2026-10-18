// koino/js/allapot/felderites.js

// Felelősség: ⭐⭐ A FELDERÍTÉS (D108/1, D112) — tiszta számítások, hálózat és lemez nélkül: a beállítás (az alapértékek és a
// határok — F4), a felderítések helyi jegyzéke, és egy felderítés LÉPÉSE (a Struktúra állásából: kész-e, elérte-e a méretét,
// elakadt-e, és hány új kérést kérhet).
//
// ⭐ A FELDERÍTÉS egy ág egyszeri PILLANATKÉPE (D108/1): a készülék egyszer elhozza az ág legjobb K csomópontját (F1 —
// legjobb-először, a Struktúra sorrendje, legfeljebb d szint mélyen), az átmeneti tárba, RÖGZÍTVE (F2 — a böngészés nem
// söpri ki), és nem tartja frissen; a cserében nem vesz részt, értesítést nem ad. ⭐ A tudatpont marad a követés eszköze.
// Az újrafelderítés egy új pillanatkép (ugyanarra az ágra a régi helyére lép). A végrehajtó az őrjárat (`koino.js`
// `felderitesKor`) a meglévő kérelem-géppel; a kiszolgálót a kiszolgálási keret védi (D109) — itt a SAJÁT készülék
// határai állnak (F4): a méret, a kérésszám, a darabszám.
//
// ⚠️ HELYI FELJEGYZÉS, nem esemény, nem terjed (`<koino>/felderitesek.json` — a `koino.js` írja-olvassa).
//
// Használják: a `koino.js` (az őrjárat köre, a `felderites` parancs, később a felület), a próbák.

/** ⭐ D112 (F4): az alapértékek — K = 200 csomópont, mélység-korlát nincs, csak fejléc, 20 MB, körönként 4 kérés. */
export const FELDERITES_ALAP = Object.freeze({ k: 200, melyseg: null, torzs: false, mb: 20, keresKor: 4 });
/** …és a felső határok: K ≤ 2000, mélység ≤ 64, ≤ 500 MB, ≤ 16 kérés / kör (a sorozat határa), egyszerre ≤ 8 futó, együtt ≤ 1 GB. */
export const FELDERITES_HATAR = Object.freeze({ k: 2000, melyseg: 64, mb: 500, keresKor: 16, aktiv: 8, osszMb: 1024 });
/** Egy pillanatkép 30 nap után eldobható (a rögzítése feloldódik, a jegyzékből kiesik). */
export const FELDERITES_ELEVULES = 30 * 24 * 3600 * 1000;
/** Ha ennyi ideig nem lép előre (nincs elérhető tartó — a függő kérelem is ennyi alatt jár le), elakadt. */
export const FELDERITES_ELAKADAS = 2 * 3600 * 1000;
/** A jegyzék legfeljebb ennyi felderítést tart (a lezártakat is — a legrégebbi lezárt esik ki). */
export const FELDERITES_JEGYZEK_KORLAT = 64;
/** Az egész koinó felderítése (az ág helyén). */
export const GYOKER_AG = 'gyoker';

const MB = 1024 * 1024;
const AZONOSITO_MINTA = /^[A-Za-z0-9_-]{43}$/;
const ALLAPOTOK = new Set(['fut', 'kesz', 'keret', 'elakadt', 'megallitva']);

/**
 * ⭐ A beállítás — az alapértékekkel kiegészítve, a határok közé szorítva (F4). Az ág egy teljes azonosító vagy a gyökér.
 * @param {Object} u - { ag, k, melyseg, torzs, mb, keresKor }
 */
export function felderitesBeallitasa(u = {}) {
  const ag = u.ag === undefined || u.ag === null || u.ag === GYOKER_AG ? GYOKER_AG
    : (typeof u.ag === 'string' && AZONOSITO_MINTA.test(u.ag) ? u.ag : null);
  if (!ag) throw new Error('Az ág egy teljes azonosító (43 jel) vagy „gyoker”.');
  const egesz = (x, alap, min, max) => (Number.isInteger(x) ? Math.min(Math.max(x, min), max) : alap);
  return {
    ag,
    k: egesz(u.k, FELDERITES_ALAP.k, 1, FELDERITES_HATAR.k),
    melyseg: Number.isInteger(u.melyseg) ? Math.min(Math.max(u.melyseg, 0), FELDERITES_HATAR.melyseg) : null,
    torzs: u.torzs === true,
    mb: egesz(u.mb, FELDERITES_ALAP.mb, 1, FELDERITES_HATAR.mb),
    keresKor: egesz(u.keresKor, FELDERITES_ALAP.keresKor, 1, FELDERITES_HATAR.keresKor)
  };
}

/** Üres jegyzék. */
export function uresFelderitesJegyzek() {
  return { felderitesek: [] };
}

/** Egy (lemezről olvasott) jegyzék alakja — a hibás bejegyzés kiesik, a lista korlátos. */
export function felderitesJegyzekAlakja(x) {
  const ki = [];
  for (const f of Array.isArray(x?.felderitesek) ? x.felderitesek : []) {
    if (!f || typeof f.az !== 'string' || !f.az || f.az.length > 64 || !ALLAPOTOK.has(f.allapot)) continue;
    let b;
    try { b = felderitesBeallitasa(f); } catch { continue; }
    if (ki.some((y) => y.az === f.az || y.ag === b.ag)) continue;
    const szam = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
    ki.push({ az: f.az, ...b, allapot: f.allapot, kezdet: szam(f.kezdet), vege: Number.isFinite(f.vege) ? f.vege : null,
      frissitve: szam(f.frissitve), haladas: szam(f.haladas), latszik: szam(f.latszik), biztos: szam(f.biztos),
      bajt: szam(f.bajt), kerelmek: szam(f.kerelmek), ok: typeof f.ok === 'string' ? f.ok.slice(0, 200) : null });
  }
  return { felderitesek: ki.slice(-FELDERITES_JEGYZEK_KORLAT) };
}

/**
 * ⭐ Egy új felderítés (vagy ugyanarra az ágra az ÚJRAFELDERÍTÉS — a régi helyére lép, ugyanazzal az azonosítóval: a
 * rögzítése megmarad, az új pillanatkép kiegészíti). ⛔ Egyszerre legfeljebb 8 futhat, és együtt legfeljebb 1 GB-ot
 * tarthatnak (F4) — fölötte hiba, kimondva.
 * @returns {{jegyzek: Object, felderites: Object, ujra: boolean}}
 */
export function ujFelderites(jegyzek, beallitas, most, az) {
  const j = felderitesJegyzekAlakja(jegyzek);
  const b = felderitesBeallitasa(beallitas);
  const regi = j.felderitesek.find((f) => f.ag === b.ag) ?? null;
  const tobbi = j.felderitesek.filter((f) => f !== regi);
  if (tobbi.filter((f) => f.allapot === 'fut').length >= FELDERITES_HATAR.aktiv) {
    throw new Error('Egyszerre legfeljebb ' + FELDERITES_HATAR.aktiv + ' felderítés futhat — várd meg vagy töröld az egyiket.');
  }
  const ossz = tobbi.reduce((s, f) => s + f.mb, 0) + b.mb;
  if (ossz > FELDERITES_HATAR.osszMb) {
    throw new Error('A felderítések együtt legfeljebb ' + FELDERITES_HATAR.osszMb + ' MB-ot tarthatnak (ezzel ' + ossz + ' MB lenne).');
  }
  const f = { az: regi?.az ?? az, ...b, allapot: 'fut', kezdet: most, vege: null, frissitve: most, haladas: most, latszik: 0,
    biztos: 0, bajt: regi?.bajt ?? 0, kerelmek: 0, ok: null };
  j.felderitesek = [...tobbi, f];
  return { jegyzek: j, felderites: f, ujra: !!regi };
}

/**
 * ⭐⭐ Egy felderítés LÉPÉSE a Struktúra állásából (`pakli.js` `felderitesAllasa`): KÉSZ, ha a sorrend az első K-ig biztos
 * (vagy az ág kisebb, és nincs mit kérni); KERET, ha a rögzített része elérte a beállított méretet; ELAKADT, ha
 * `FELDERITES_ELAKADAS` óta nem lépett előre; különben fut, és legfeljebb `keresKor` új kérést kérhet.
 * @param {Object} f - a felderítés
 * @param {{ismert: number, latszik: number, biztos: number, hianyzik: number, agIsmert: boolean, bajt: number}} a
 * @returns {{f: Object, kerj: number}}
 */
export function felderitesLepese(f, { ismert, latszik, biztos, hianyzik, agIsmert, bajt }, most) {
  const uj = { ...f, frissitve: most, latszik, bajt };
  if (biztos > f.biztos || latszik > f.latszik) uj.haladas = most;
  uj.biztos = biztos;
  if (f.allapot !== 'fut') return { f: uj, kerj: 0 };
  if (bajt >= f.mb * MB) {
    return { f: { ...uj, allapot: 'keret', vege: most, ok: 'elérte a beállított méretet (' + f.mb + ' MB)' }, kerj: 0 };
  }
  const kesz = agIsmert && latszik > 0 && (biztos >= f.k || (biztos >= latszik && latszik >= Math.min(f.k, ismert) && hianyzik === 0));
  if (kesz) return { f: { ...uj, allapot: 'kesz', vege: most, ok: null }, kerj: 0 };
  if (most - uj.haladas > FELDERITES_ELAKADAS) {
    return { f: { ...uj, allapot: 'elakadt', vege: most, ok: 'két órája nem jött semmi (nincs elérhető tartó)' }, kerj: 0 };
  }
  return { f: uj, kerj: f.keresKor };
}

/** A 30 napnál régebbi (lezárt vagy elakadt) felderítések azonosítói — a rögzítésük feloldandó. */
export function elevultFelderitesek(jegyzek, most, elevules = FELDERITES_ELEVULES) {
  return felderitesJegyzekAlakja(jegyzek).felderitesek.filter((f) => most - (f.vege ?? f.kezdet) > elevules).map((f) => f.az);
}

/** Egy felderítés kivétele a jegyzékből. */
export function felderitesTorlese(jegyzek, az) {
  const j = felderitesJegyzekAlakja(jegyzek);
  j.felderitesek = j.felderitesek.filter((f) => f.az !== az);
  return j;
}
