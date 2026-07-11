// frontend/js/utils/javaslatMegnevezes.js

// ===== JAVASLAT / EGYEZMÉNY MEGNEVEZÉS =====
// Felelősség: a javaslat- és egyezmény-kártya FELSŐ sorának (cím-sáv) szövegét
//   képzi a backend `javaslatTipus` enum-értékéből.
//   - A négy alapművelet MELLÉKNÉVI (jelzői) alakja + az utótag,
//     pl. Modositas → „Módosítási javaslat" / „Módosítási egyezmény".
//   - A Csomag típus külön: az utótag kerül elöre nagybetűvel, utána „csomag",
//     pl. „Javaslat csomag" / „Egyezmény csomag".
// Használják: JavaslatKartya, EgyezmenyKartya.

// A javaslatTipus enum melléknévi (jelzői) alakjai.
// (A ReszletekModal főnévi alakokat használ – Módosítás/Törlés –, itt szándékosan
//  a jelzői alak kell, ezért külön térkép.)
const TIPUS_JELZO = {
  Torles:     'Törlési',
  Modositas:  'Módosítási',
  Egyesites:  'Egyesítési',
  Athelyezes: 'Áthelyezési'
};

// ----- MEGNEVEZÉS KÉPZÉSE -----
// @param {string} javaslatTipus - a backend enum-értéke
//   (Torles / Modositas / Egyesites / Athelyezes / Csomag)
// @param {string} utotag - a második szó: 'javaslat' vagy 'egyezmény'
// @returns {string} a fejléc felső sorának szövege
export function javaslatMegnevezes(javaslatTipus, utotag) {
  // Csomag: „Javaslat csomag" / „Egyezmény csomag" – az utótag elöl, nagy kezdőbetűvel
  if (javaslatTipus === 'Csomag') {
    const utotagNagy = utotag.charAt(0).toUpperCase() + utotag.slice(1);
    return `${utotagNagy} csomag`;
  }

  // A négy alapművelet: jelzői alak + utótag (pl. „Módosítási javaslat")
  const jelzo = TIPUS_JELZO[javaslatTipus] ?? javaslatTipus ?? '(típus nélkül)';
  return `${jelzo} ${utotag}`;
}
