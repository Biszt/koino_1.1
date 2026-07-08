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
