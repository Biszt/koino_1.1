// frontend/js/utils/javaslatSzabalyok.js

// Felelősség: a JAVASLAT-TÍPUS domain-szabályok EGYETLEN forrása a frontenden —
// melyik entitástípuson melyik javaslat indítható, és egyesítésnél milyen
// forrás-/eredmény-típus engedett. Ugyanezt a backend (javaslatService) is
// kikényszeríti; ez a frontend csak a FELÜLETET igazítja hozzá (gombok szűrése),
// hogy a felhasználó ne is lásson tiltott opciót.
//
// Szabályok (Csaba, 2026-07-22):
//   • Tartalom      → mindegyik (Törlés, Módosítás, Áthelyezés, Egyesítés, Csomag)
//   • Kategória     → Törlés, Módosítás, Egyesítés (áthelyezés TILTOTT; egyesítés csak kategóriával)
//   • Tartalomtípus → Törlés, Módosítás (áthelyezés és egyesítés TILTOTT)
//   • Egyezmény     → Törlés, Áthelyezés (módosítás/egyesítés TILTOTT) [Törlés: Csaba, 2026-08-01]
//   • Javaslat      → mindegyik (nincs külön korlát)

// Az összes lehetséges javaslat-típus (a modal 1. lépésének gombjai)
const OSSZES_TIPUS = ['Torles', 'Modositas', 'Athelyezes', 'Egyesites', 'Csomag'];

// Entitástípus → engedélyezett javaslat-típusok
const ENGEDELYEZETT_TIPUSOK = {
  Tartalom:      ['Torles', 'Modositas', 'Athelyezes', 'Egyesites', 'Csomag'],
  Kategoria:     ['Torles', 'Modositas', 'Egyesites'],
  TartalomTipus: ['Torles', 'Modositas'],
  Egyezmeny:     ['Torles', 'Athelyezes'],
  Javaslat:      ['Torles', 'Modositas', 'Athelyezes', 'Egyesites', 'Csomag']
};

/**
 * Egy entitástípuson elindítható javaslat-típusok listája.
 * @param {string} entitasTipus - Tartalom | Kategoria | TartalomTipus | Egyezmeny | Javaslat
 * @returns {string[]} az engedélyezett típusok (ismeretlen típusnál: mind)
 */
export function engedelyezettJavaslatTipusok(entitasTipus) {
  return ENGEDELYEZETT_TIPUSOK[entitasTipus] ?? OSSZES_TIPUS;
}

/**
 * Az egyesítés EREDMÉNY-típusa (és egyben a résztvevők közös típusa) a kártya
 * entitástípusából: Tartalmat csak Tartalommal, Kategóriát csak Kategóriával lehet
 * egyesíteni (Tartalomtípust egyáltalán nem — arra nincs is Egyesítés gomb).
 * @param {string} entitasTipus - a kártya (indító) entitás típusa
 * @returns {string} 'Kategoria' vagy 'Tartalom'
 */
export function egyesitesEredmenyTipus(entitasTipus) {
  return entitasTipus === 'Kategoria' ? 'Kategoria' : 'Tartalom';
}

/**
 * Egyesítésnél a FORRÁS entitások engedélyezett típusai az adott kártyáról indítva.
 * A résztvevők típusa AZONOS kell legyen: Tartalom csak Tartalommal, Kategória csak
 * Kategóriával. Így a forrás-mező is csak az eredmény-típust engedi.
 * @param {string} entitasTipus - a kártya (indító) entitás típusa
 * @returns {string[]} a keresőmezőben engedett forrás-típusok (egyelemű)
 */
export function egyesitesForrasTipusok(entitasTipus) {
  return [egyesitesEredmenyTipus(entitasTipus)];
}
