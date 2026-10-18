// koino/js/csere/melysegTanulas.js

// Felelősség: ⭐⭐ A TANULT MÉLYSÉG (D110 — a K10 (A2), Csaba, 2026-10-18: „rendben. elfogadom a javaslatodat”, a medián
// szabállyal): a gyökér-darab (`g`) és a kereső-régió (`k`) mélységét a készülék a SAJÁT darabjából becsüli
// (`melysegBecslese`) — egy új, vagy hosszan offline készülék darabja viszont üres vagy elavult, a becslése sekély, és egy
// nagy koinó mély tartóival nincs közös kulcsa: a cserében soha nem egyeztetnek. Ezért a társak bemondott mélységét (a
// NYITÁS `gyd` / `kd` jelének első tagja — a vonalon semmi nem drágul) feljegyezzük, és a mélységünk legalább a friss
// társak mélységének MEDIÁNJA − 1.
//
// ===== A SZABÁLY (D110) =====
//
// ⭐ Csak MÉLYEBBRE (`ervenyesMelyseg`: a saját becslés és a tanult közül a nagyobb): egy hazug társ legfeljebb kevesebb
// tartásra vehet rá (a többi tartó fedez, és a saját adatom mélyebben is jó), nagyobb teherre nem — a „végtelen” mércéje
// szerint ez a biztonságos irány. ⭐ A MEDIÁN (az alsó): egy hazug társnak a friss társaim TÖBBSÉGE kell, nem kettő; és
// legalább `TANULT_TARS_MIN` = 2 különböző társ kell (egy társ szava nem tanulás). ⭐ Elévül: a feljegyzés
// `TANULT_ELETTARTAM` (egy nap) után nem számít — ha senki nem erősíti meg, a saját becslés marad. A „− 1”: a mélységem ±1
// szintjén tartok darabot, tehát a medián mélységű társakkal így közös a kulcsunk.
//
// ⛔ Az elvetett feltétel (a K10 (A) eredeti szövege: „csak amíg a saját darabja kevés”): egy régen jól szinkronban lévő,
// aztán hónapokig offline készülék darabja „teli” (a régi, sekély mélység szerint), tehát nem tanulna — és a megnőtt
// koinó mély tartóival soha többé nem egyeztetne. A medián a hazug társ ellen ezt a feltételt kiváltja.
//
// ⚠️ Helyi feljegyzés, nem esemény, és nem terjed (3. szabály): a társ szava csak a SAJÁT terhemet hangolja, semmit nem
// dönt el a koinóban. Korlátos: fajtánként `TANULT_TARS_KORLAT` társ (a legrégebbi esik ki).
//
// Használják: koino.js (`gyokerMelysegem`, `keresoRegioim`, a csere után a feljegyzés), a próbák (`melysegTanulasProba.js`).

/** Egy társ bemondása ennyi ideig számít. */
export const TANULT_ELETTARTAM = 24 * 3600 * 1000;

/** Legalább ennyi különböző friss társ kell a tanuláshoz. */
export const TANULT_TARS_MIN = 2;

/** Fajtánként legfeljebb ennyi társ bemondását jegyezzük meg. */
export const TANULT_TARS_KORLAT = 64;

/** A fajták: a gyökér-darab és a kereső-régió. */
export const MELYSEG_FAJTAK = ['g', 'k'];

const MELYSEG_MAX = 144;

/** Üres jegyzék. */
export function uresMelysegJegyzek() {
  return { g: {}, k: {} };
}

/**
 * A (fájlból jött) jegyzék alakja — a hibás tételeket eldobja.
 * @returns {{g: Object, k: Object}}
 */
export function melysegJegyzekAlakja(j) {
  const ki = uresMelysegJegyzek();
  if (!j || typeof j !== 'object') return ki;
  for (const f of MELYSEG_FAJTAK) {
    const t = j[f];
    if (!t || typeof t !== 'object' || Array.isArray(t)) continue;
    for (const [tars, x] of Object.entries(t)) {
      if (typeof tars !== 'string' || !tars || tars.length > 100) continue;
      if (!x || !Number.isInteger(x.m) || x.m < 0 || x.m > MELYSEG_MAX || !Number.isFinite(x.ido)) continue;
      ki[f][tars] = { m: x.m, ido: x.ido };
    }
  }
  return ki;
}

/**
 * Egy társ bemondott mélységének feljegyzése (a legfrissebb az övé; fajtánként korlátos — a legrégebbi esik ki).
 * @param {{g: Object, k: Object}} jegyzek - (nem módosul — újat ad vissza)
 * @param {{fajta: 'g'|'k', tars: string, melyseg: number, most?: number}} b
 */
export function tarsMelysegeFeljegyzese(jegyzek, { fajta, tars, melyseg, most = Date.now() }) {
  const ki = melysegJegyzekAlakja(jegyzek);
  if (!MELYSEG_FAJTAK.includes(fajta) || typeof tars !== 'string' || !tars || !Number.isInteger(melyseg)
    || melyseg < 0 || melyseg > MELYSEG_MAX) return ki;
  ki[fajta][tars] = { m: melyseg, ido: most };
  const lista = Object.entries(ki[fajta]).sort((a, b) => b[1].ido - a[1].ido).slice(0, TANULT_TARS_KORLAT);
  ki[fajta] = Object.fromEntries(lista);
  return ki;
}

/**
 * ⭐ A TANULT MÉLYSÉG: a friss (≤ `TANULT_ELETTARTAM`) társak mélységének ALSÓ mediánja − 1 — vagy null, ha nincs legalább
 * `TANULT_TARS_MIN` különböző friss társ.
 * @param {{g: Object, k: Object}} jegyzek
 * @param {{fajta: 'g'|'k', most?: number, elettartam?: number}} b
 * @returns {{melyseg: number, tarsak: number, median: number}|null}
 */
export function tanultMelyseg(jegyzek, { fajta, most = Date.now(), elettartam = TANULT_ELETTARTAM }) {
  const t = melysegJegyzekAlakja(jegyzek)[fajta] ?? {};
  const m = Object.values(t).filter((x) => most - x.ido <= elettartam && x.ido <= most + elettartam).map((x) => x.m)
    .sort((a, b) => a - b);
  if (m.length < TANULT_TARS_MIN) return null;
  const median = m[Math.floor((m.length - 1) / 2)];
  return { melyseg: Math.max(0, median - 1), tarsak: m.length, median };
}

/**
 * ⭐ Csak mélyebbre: a saját becslés és a tanult közül a nagyobb.
 * @param {number} sajat
 * @param {{melyseg: number}|null} tanult
 */
export function ervenyesMelyseg(sajat, tanult) {
  return Math.max(Number.isInteger(sajat) ? sajat : 0, tanult?.melyseg ?? 0);
}
