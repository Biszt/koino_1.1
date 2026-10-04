// koino/js/allapot/ketFok.js

// Felelősség: D95/1 — A KÉT FOKÚ VÁLLALÁS: a vállalt szeletek közül melyiket tartom TELJESEN, és melyiket ÖSSZEGEZVE.
//
// ===== A SZABÁLY (a skálázási terv 4.6, a B1 műszaki terve 3.) =====
//
//   · a KIS szeletet egészében tartom (minden eseményét — a csere halmazként egyezteti);
//   · a NAGY szeletből (a küszöb — `KETFOK_KUSZOB` esemény — fölött) csak a születést, a saját eseményeimet, a szelet
//     összegzését (a gyökér és ellenőrzött minták) és a rá vonatkozó lezárási összegzéseket tartom (`lezarasiOsszegzes.js`);
//   · visszalépés csak `KETFOK_VISSZA` alatt — hogy egy a küszöb körül ingadozó szelet ne billegjen;
//   · az azonosság-szeletem és a koinó születése mindig teljes (kicsik, és a sajátom);
//   · a „mindent” beállítású készülék (D83/2 — helyi, készülékenként) mindent teljesen tart: ő az önkéntes, aki a nagy
//     szelet teljes halmazát a többinek összegzi.
//
// ⭐ A méret helyi mennyiség (amit ismerek: a teljesen tartott szeletnél az eseményszám, az összegzettnél az összegzés
// darabja) — nem a koinó mérete, és nem kell róla megegyezni: egy szelet egyik tartónál lehet teljes, a másiknál
// összegzett. ⚠️ A terhe ettől lesz konstans (66. mérés): a nagy szeletből a minták és az összegzések maradnak.
//
// Használják: koino.js (a vállalás és a csere részvétele), a próbák.

export const KETFOK_KUSZOB = 1000;
export const KETFOK_VISSZA = 800;

/**
 * A vállalt szeletek foka.
 * @param {Object} b
 * @param {Set<string>} b.szeletek - a vállalt szeletek (`vallalasSzamitasa`)
 * @param {Array<string>} [b.mindigTeljes] - az azonosság-szeletem és a koinó születése
 * @param {Map<string, number>} b.meretek - szelet → az ismert méret (eseményszám, ill. az összegzés darabja)
 * @param {Map<string, string>} [b.elozo] - szelet → az előző fok ('teljes' | 'osszegzo')
 * @param {boolean} [b.mindent] - a „mindent” beállítás (D83/2)
 * @param {number} [b.kuszob]
 * @param {number} [b.vissza]
 * @returns {Map<string, 'teljes'|'osszegzo'>}
 */
export function szeletFokai({ szeletek, mindigTeljes = [], meretek, elozo = new Map(), mindent = false,
  kuszob = KETFOK_KUSZOB, vissza = KETFOK_VISSZA }) {
  const ki = new Map();
  const teljesek = new Set(mindigTeljes);
  for (const k of szeletek) {
    if (mindent || teljesek.has(k)) { ki.set(k, 'teljes'); continue; }
    const meret = meretek.get(k) ?? 0;
    const volt = elozo.get(k);
    const osszegzo = volt === 'osszegzo' ? meret >= vissza : meret > kuszob;
    ki.set(k, osszegzo ? 'osszegzo' : 'teljes');
  }
  return ki;
}
