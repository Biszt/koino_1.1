// frontend/js/utils/idoFormazo.js

// ===== IDŐ FORMÁZÓ =====
// Felelősség: másodpercben megadott időtartam emberi olvasható magyar alakja.
// Használják: a küszöbérték-nézetek (döntési idő) és az eloszlás modal.

// A legnagyobb illeszkedő egységre kerekít (év / nap / óra / perc / mp),
// egy tizedes pontossággal, magyar számformátumban.
// @param {number} masodperc
// @returns {string} pl. "5 perc", "1,5 év", "0 mp (azonnali)"
export function masodpercFelirat(masodperc) {
  const mp = Number(masodperc);
  if (!Number.isFinite(mp) || mp < 0) return '—';
  if (mp === 0) return '0 mp (azonnali)';

  const EV   = 31536000; // 365 nap
  const NAP  = 86400;
  const ORA  = 3600;
  const PERC = 60;

  if (mp >= EV)   return `${_kerekit(mp / EV)} év`;
  if (mp >= NAP)  return `${_kerekit(mp / NAP)} nap`;
  if (mp >= ORA)  return `${_kerekit(mp / ORA)} óra`;
  if (mp >= PERC) return `${_kerekit(mp / PERC)} perc`;
  return `${mp} mp`;
}

// Egy tizedesig kerekít, magyar számformátumban (tizedesvessző)
function _kerekit(szam) {
  return (Math.round(szam * 10) / 10).toLocaleString('hu-HU');
}

// ===== IDŐ-EGYSÉGEK (szerkeszthető mezőkhöz) =====
// A döntési időt a backend másodpercben tárolja, de az e-embernek egy
// szám + egység párost mutatunk (pl. „1 év”). Ez a lista adja az egységeket,
// a legnagyobbtól a legkisebbig – a `masodperc` a váltószám mp-be.
// Használják: a küszöbérték-mezők (ErtekJavaslatModal, GondolatModal).
export const IDO_EGYSEGEK = [
  { kulcs: 'ev',   felirat: 'év',   masodperc: 31536000 }, // 365 nap
  { kulcs: 'nap',  felirat: 'nap',  masodperc: 86400 },
  { kulcs: 'ora',  felirat: 'óra',  masodperc: 3600 },
  { kulcs: 'perc', felirat: 'perc', masodperc: 60 },
  { kulcs: 'mp',   felirat: 'mp',   masodperc: 1 }
];

// ----- A LEGJOBBAN ILLESZKEDŐ EGYSÉG MEGKERESÉSE -----
// Egy másodperc-értékből kiválasztja a legnagyobb egységet, amivel a szám
// maradék nélkül osztható – így a mező „szépen” jelenik meg szerkesztéskor.
// Pl. 31536000 mp → { ertek: 1, egyseg: 'ev' }, 90 mp → { ertek: 90, egyseg: 'mp' }.
// @param {number} masodperc
// @returns {{ertek: number, egyseg: string}}
export function legjobbIdoEgyseg(masodperc) {
  const mp = Number(masodperc);
  // 0 vagy érvénytelen érték → 0 mp
  if (!Number.isFinite(mp) || mp <= 0) {
    return { ertek: 0, egyseg: 'mp' };
  }
  // A legnagyobb egységtől lefelé keressük az elsőt, ami osztója
  for (const egyseg of IDO_EGYSEGEK) {
    if (mp % egyseg.masodperc === 0) {
      return { ertek: mp / egyseg.masodperc, egyseg: egyseg.kulcs };
    }
  }
  // Elvi tartalék: ha semmi nem illik, maradunk másodpercnél
  return { ertek: mp, egyseg: 'mp' };
}

// ----- ÁTVÁLTÁS MÁSODPERCRE -----
// A szám + egység párost visszaalakítja másodpercre (egész számra kerekítve),
// amit a backend elvár.
// @param {number} ertek       - a mezőbe írt szám
// @param {string} egysegKulcs - az egység kulcsa (pl. 'ev', 'nap', 'mp')
// @returns {number} másodperc
export function atvaltMasodpercre(ertek, egysegKulcs) {
  const egyseg = IDO_EGYSEGEK.find(e => e.kulcs === egysegKulcs);
  const szorzo = egyseg ? egyseg.masodperc : 1;
  return Math.round(Number(ertek) * szorzo);
}
