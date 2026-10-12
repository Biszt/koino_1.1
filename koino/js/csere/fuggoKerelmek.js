// koino/js/csere/fuggoKerelmek.js

// Felelősség: A FÜGGŐ KÉRELMEK (D92/1) — amit kértem, de még nem jött meg: kinél próbálom (a célok), hol jelentettem be
// magam (a kopogtató témák), mikor kértem, hányszor próbáltam; és a kész kérelmek rövid naplója. Hálózat nélkül
// (1. szabály): a nyilvántartás tiszta adat, a `koino.js` írja-olvassa (`<koino>/kerelmek.json`).
//
// ⭐ MIÉRT KELL: a kérelem nem élő kapcsolat (D76/3, 5. szabály) — a cím nélküli kérésnél a válasz a KÖVETKEZŐ
// buliban jön, amikor a tartó (a kopogtató témáján meglátva, hogy kérnek tőle) maga is felém kopog. A kézi parancs
// addigra rég kilépett; az őrjárat viszi tovább (a célokra kopog, és a munka a kérelmet futtatja a csere helyett).
//
// ⚠️ HELYI FELJEGYZÉS, nem esemény, nem terjed (3. szabály). Korlátos (9. szabály): legfeljebb `FUGGO_KORLAT` (64) függő,
// kérelmenként `CEL_KORLAT` cél, és két óra után a függő kérelem lejár (kimondva — D19).
//
// Használják: a `koino.js` (a `kerelem` parancs és az őrjárat), a próbák.

// ⭐ D102 (J2): 64 (a 74. mérés: a legjobb-először bejáró előre kér — a 16-os korlát a Struktúra idejét duplázta).
export const FUGGO_KORLAT = 64;
export const KESZ_KORLAT = 64;
export const CEL_KORLAT = 12;
export const KOPOGTATO_KORLAT = 12;
/** Egy függő kérelem ennyi után lejár (a DHT 30–60 perc alatt felejt — 58. mérés —, két óra bőven elég). */
export const FUGGO_ELEVULES = 2 * 60 * 60 * 1000;

const KULCS_MINTA = /^[A-Za-z0-9_-]{43}$/;
const FAJTAK = new Set(['fejlecek', 'torzs', 'szelet']);

/** Üres nyilvántartás. */
export function ujNyilvantartas() {
  return { fuggo: [], kesz: [] };
}

function celAlakja(c) {
  if (!c || typeof c.hoszt !== 'string' || !c.hoszt || c.hoszt.length > 64) return null;
  const port = Number(c.port);
  if (!Number.isInteger(port) || port <= 0 || port >= 65536) return null;
  return { hoszt: c.hoszt, port, ...(typeof c.alairo === 'string' && KULCS_MINTA.test(c.alairo) ? { alairo: c.alairo } : {}) };
}

function kopogtatoAlakja(k) {
  if (!k || typeof k.fajta !== 'string' || typeof k.kulcs !== 'string' || k.kulcs.length > 64) return null;
  if (!['keszulek', 'gyoker', 'szelet'].includes(k.fajta)) return null;
  return { fajta: k.fajta, kulcs: k.kulcs };
}

/** ⭐ D102: a folytatás alakja (`utan`: az utolsó össz-pont és azonosító), vagy null. */
function utanAlakja(u) {
  return u && typeof u === 'object' && Number.isSafeInteger(u.p) && u.p >= 0 && typeof u.az === 'string' && KULCS_MINTA.test(u.az)
    ? { p: u.p, az: u.az } : null;
}

function kerelemAlakja(x) {
  if (!x || typeof x.az !== 'string' || !FAJTAK.has(x.fajta) || typeof x.kulcs !== 'string' || !KULCS_MINTA.test(x.kulcs)) return null;
  const celok = (Array.isArray(x.celok) ? x.celok : []).map(celAlakja).filter(Boolean).slice(0, CEL_KORLAT);
  const kopogtatok = (Array.isArray(x.kopogtatok) ? x.kopogtatok : []).map(kopogtatoAlakja).filter(Boolean)
    .slice(0, KOPOGTATO_KORLAT);
  const utan = utanAlakja(x.utan);
  // ⭐ D102: `m` (mélyen — a válaszoló maga jár be) és a folytatás a régi `d` helyett.
  return { az: x.az, fajta: x.fajta, kulcs: x.kulcs, n: Number.isInteger(x.n) ? x.n : 20, m: x.m === true,
    ...(utan ? { utan } : {}),
    ido: Number.isFinite(x.ido) ? x.ido : 0, probalt: Number.isInteger(x.probalt) ? x.probalt : 0, celok, kopogtatok };
}

/** Ugyanaz a kérelem-e (fajta + kulcs + a folytatás helye) — egy folytatás KÜLÖN kérelem. */
function ugyanaz(x, fajta, kulcs, utan) {
  return x.fajta === fajta && x.kulcs === kulcs && (x.utan?.az ?? null) === (utan?.az ?? null) && (x.utan?.p ?? null) === (utan?.p ?? null);
}

/** Egy (lemezről olvasott) nyilvántartás alakja — a hibás bejegyzés kiesik, a lista korlátos. */
export function nyilvantartasAlakja(x) {
  const fuggo = (Array.isArray(x?.fuggo) ? x.fuggo : []).map(kerelemAlakja).filter(Boolean).slice(-FUGGO_KORLAT);
  const kesz = (Array.isArray(x?.kesz) ? x.kesz : [])
    .filter((k) => k && typeof k.az === 'string' && FAJTAK.has(k.fajta) && typeof k.kulcs === 'string')
    .slice(-KESZ_KORLAT);
  return { fuggo, kesz };
}

/**
 * Egy kérelem felvétele. Ha ugyanaz (fajta + kulcs) már függ, a célok és a kopogtatók összeolvadnak (nem lesz két
 * bejegyzés). A korlát fölött a legrégebbi függő kiesik — kimondva a kész naplóban (`kiszorult`).
 * @returns {{nyilvantartas: Object, az: string, uj: boolean}}
 */
export function kerelemFelvetele(ny, { fajta, kulcs, n = 20, m = false, utan = null, celok = [], kopogtatok = [] }, most, azonosito) {
  const alap = nyilvantartasAlakja(ny);
  const utanJo = utanAlakja(utan);
  const meglevo = alap.fuggo.find((x) => ugyanaz(x, fajta, kulcs, utanJo));
  if (meglevo) {
    const celKulcs = (c) => c.hoszt + ':' + c.port;
    const lattuk = new Set(meglevo.celok.map(celKulcs));
    for (const c of celok.map(celAlakja).filter(Boolean)) if (!lattuk.has(celKulcs(c))) { meglevo.celok.push(c); lattuk.add(celKulcs(c)); }
    meglevo.celok = meglevo.celok.slice(0, CEL_KORLAT);
    const kk = (k) => k.fajta + ':' + k.kulcs;
    const lattukK = new Set(meglevo.kopogtatok.map(kk));
    for (const k of kopogtatok.map(kopogtatoAlakja).filter(Boolean)) if (!lattukK.has(kk(k))) { meglevo.kopogtatok.push(k); lattukK.add(kk(k)); }
    meglevo.kopogtatok = meglevo.kopogtatok.slice(0, KOPOGTATO_KORLAT);
    return { nyilvantartas: alap, az: meglevo.az, uj: false };
  }
  const uj = kerelemAlakja({ az: azonosito, fajta, kulcs, n, m, ...(utanJo ? { utan: utanJo } : {}), ido: most, probalt: 0,
    celok, kopogtatok });
  if (!uj) throw new Error('hibás kérelem: ' + fajta + ' ' + kulcs);
  alap.fuggo.push(uj);
  while (alap.fuggo.length > FUGGO_KORLAT) {
    const ki = alap.fuggo.shift();
    alap.kesz.push({ az: ki.az, fajta: ki.fajta, kulcs: ki.kulcs, ido: most, eredmeny: 'kiszorult' });
  }
  alap.kesz = alap.kesz.slice(-KESZ_KORLAT);
  return { nyilvantartas: alap, az: uj.az, uj: true };
}

/** A lejárt függő kérelmek a kész naplóba kerülnek (`lejart`) — nem tűnnek el szó nélkül (D19). */
export function lejartakKivetele(ny, most, elevules = FUGGO_ELEVULES) {
  const alap = nyilvantartasAlakja(ny);
  const maradnak = [];
  for (const x of alap.fuggo) {
    if (most - x.ido > elevules) alap.kesz.push({ az: x.az, fajta: x.fajta, kulcs: x.kulcs, ido: most, eredmeny: 'lejart' });
    else maradnak.push(x);
  }
  alap.fuggo = maradnak;
  alap.kesz = alap.kesz.slice(-KESZ_KORLAT);
  return alap;
}

/**
 * Melyik függő kérelem szól ehhez a társhoz? — a legrégebbi, amelyiknek a célja ez a cím; ha pontos cím nincs, az
 * azonos IP (a NAT portot válthat — 32. mérés). ⚠️ A cím csak feltevés (D71): ha a munka mást talál, legfeljebb nem
 * kapunk választ.
 * @returns {null|Object}
 */
export function tarshozIllo(ny, cim, port, kiveve = () => false) {
  const alap = nyilvantartasAlakja(ny);
  // ⭐ D102 (J4): a kérelmek céljai RANG szerint állnak (elöl az, aki az ágból a legtöbbet tartja) — egy társ azt viszi,
  // amelyiknek a listáján ő áll a legelöl; holtversenyben a legrégebbit.
  const legjobb = (illik) => {
    let ki = null, rang = Infinity;
    for (const x of alap.fuggo) {
      if (kiveve(x)) continue;
      const i = x.celok.findIndex(illik);
      if (i >= 0 && i < rang) { ki = x; rang = i; }
    }
    return ki;
  };
  return legjobb((c) => c.hoszt === cim && c.port === Number(port)) ?? legjobb((c) => c.hoszt === cim);
}

/** Egy függő kérelem lezárása (megjött, vagy feladtuk) — a kész naplóba, rövid összegzéssel. */
export function kerelemLezarasa(ny, az, eredmeny, most) {
  const alap = nyilvantartasAlakja(ny);
  const x = alap.fuggo.find((f) => f.az === az);
  if (!x) return alap;
  alap.fuggo = alap.fuggo.filter((f) => f.az !== az);
  // ⭐ D102: a folytatás helye is (a „nemrég kész” szűrő ebből tudja, hogy a folytatás MÁS kérelem).
  alap.kesz.push({ az, fajta: x.fajta, kulcs: x.kulcs, ...(x.utan ? { utan: x.utan } : {}), ido: most,
    eredmeny: String(eredmeny).slice(0, 200) });
  alap.kesz = alap.kesz.slice(-KESZ_KORLAT);
  return alap;
}

/** Egy próbálkozás feljegyzése (a cél felelt, de nem szolgálta ki). */
export function probalkozas(ny, az) {
  const alap = nyilvantartasAlakja(ny);
  const x = alap.fuggo.find((f) => f.az === az);
  if (x) x.probalt++;
  return alap;
}

/** Minden függő kérelem célja (a kör kopogás-céljaihoz) — címenként egyszer. */
export function fuggoCelok(ny) {
  const ki = new Map();
  for (const x of nyilvantartasAlakja(ny).fuggo) for (const c of x.celok) if (!ki.has(c.hoszt + ':' + c.port)) ki.set(c.hoszt + ':' + c.port, c);
  return [...ki.values()];
}

/** Minden függő kérelem kopogtató témája (az őrjárat ezeken jelenti be újra magát — a DHT felejt). */
export function fuggoKopogtatok(ny) {
  const ki = new Map();
  for (const x of nyilvantartasAlakja(ny).fuggo) for (const k of x.kopogtatok) ki.set(k.fajta + ':' + k.kulcs, k);
  return [...ki.values()];
}
