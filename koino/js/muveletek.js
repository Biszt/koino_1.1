// koino/js/muveletek.js

// Felelősség: a koino MŰVELETEI — amit egy e-ember tehet. Mindegyik ugyanazt a három
// lépést végzi: megkeresi a saját lánca végét, létrehoz egy ALÁÍRT eseményt, és elmenti.
//
// Ez a réteg köti össze a kulcsot, a láncot és a tárat. Fölötte már csak a felület van,
// alatta pedig nincs semmi, ami „engedélyezné" a műveletet — nincs szerver, aki
// jóváhagyná. Amit aláírsz, az megtörtént; hogy MI KÖVETKEZIK belőle, azt a számítás
// dönti el (D17).
//
// Használják: fo.js (a felület).

import { TUDATPONT_KERET } from './allapot/szabalyok.js';
import { esemenyLetrehozasa } from './esemeny/esemeny.js';
import { kanonikusBajtok } from './esemeny/kanonikusAlak.js';
import { esemenyMentese, lancVege } from './tar/esemenyTar.js';

// ===== A TUDATPONT-KERET =====
// Mindenkinek UGYANANNYI tudatpontja van: nem elkölthető, csak szétosztható és bármikor
// átrendezhető.
//
// ⚠️ AZ ELLENŐRZÉS ITT KÉNYELEM, NEM VÉDELEM. Azért van, hogy ne írjunk alá olyan
// eseményt, ami sérti a keretet — de a VALÓDI őrzés a SZÁMÍTÁSBAN van (szabalyok.js),
// mert a másik gép felülete semmitől nem véd meg. A keret értéke onnan jön, egy
// példányban, hogy a kettő ne csúszhasson szét.
export { TUDATPONT_KERET };

// ===================================
// SEGÉD: ESEMÉNY LÉTREHOZÁSA ÉS MENTÉSE
// ===================================

/**
 * A közös váz: lánc vége → aláírt esemény → mentés.
 * @param {Object} kornyezet - { koino, kulcspar, szerzo }
 * @param {string} tipus
 * @param {Object} adat
 * @returns {Promise<Object>} a létrehozott esemény
 */
async function esemenytTeszek(kornyezet, tipus, adat) {
  console.log('muveletek.esemenytTeszek - KEZDÉS', { tipus });

  const veg = await lancVege(kornyezet.szerzo);
  const esemeny = await esemenyLetrehozasa(
    { koino: kornyezet.koino, tipus, adat, ...veg },
    kornyezet.kulcspar
  );

  const eredmeny = await esemenyMentese(esemeny);
  if (!eredmeny.mentve) {
    throw new Error('Az esemény nem menthető: ' + eredmeny.ok);
  }

  console.log('muveletek.esemenytTeszek - VÉGE', { azonosito: esemeny.azonosito });
  return esemeny;
}

// ===================================
// A KOINO LÉTREHOZÁSA
// ===================================

/**
 * Létrehoz egy koinót. A Szakasz 1-ben a MINIMUMOT tartalmazza (név, leírás); a D25
 * további paraméterei (belépési szabály, hitelesítési küszöb) a bizalmi hálóval együtt
 * jönnek majd, és a D13/c szerint amúgy is entitássá válnak.
 * @param {Object} kornyezet
 * @param {string} nev
 * @param {string} [leiras]
 */
export function koinoLetrehozasa(kornyezet, nev, leiras) {
  return esemenytTeszek(kornyezet, 'KoinoLetrehozas', { nev, leiras: leiras || null });
}

// ===================================
// TARTALOM LÉTREHOZÁSA
// ===================================

/**
 * Új tartalmat hoz létre.
 *
 * A MÉRET (D26) itt születik meg: a tartalom kanonikus alakjának bájthossza. Ez az az
 * adat, ami a hivatkozásban utazik majd — hogy aki tudatpontot akar rá tenni, előre
 * tudja, mekkora tárolást vállal.
 *
 * @param {Object} kornyezet
 * @param {Object} adatok - { cim, szoveg, szulo }
 */
export async function tartalomLetrehozasa(kornyezet, { cim, szoveg, szulo }) {
  const tartalom = {
    tipus: 'Tartalom',
    cim,
    szoveg: szoveg || null,
    szulo: szulo || null
  };

  // A méret a tartalom SAJÁT adatára vonatkozik (a burkolat és az aláírás nélkül)
  tartalom.meret = kanonikusBajtok(tartalom).length;

  return esemenytTeszek(kornyezet, 'TartalomLetrehozas', tartalom);
}

// ===================================
// TUDATPONT-RENDEZÉS
// ===================================

/**
 * Tudatpontot rendel egy entitáshoz (vagy átrendezi/elveszi).
 *
 * @param {Object} kornyezet
 * @param {string} entitas - az entitás azonosítója
 * @param {number} pont - egész szám; 0 = elveszem a pontomat (és ezzel a vállalást is)
 * @param {string} [szerep] - 'aktiv' (alap) vagy 'passziv' (figyelő, nem szavaz)
 * @param {number} [marKiosztott] - mennyi pontom van már máshol (a keret ellenőrzéséhez)
 */
export async function tudatpontRendezese(kornyezet, entitas, pont, szerep = 'aktiv', marKiosztott = 0) {
  if (!Number.isInteger(pont) || pont < 0) {
    throw new Error('A tudatpont csak egész szám lehet, és nem lehet negatív.');
  }
  if (marKiosztott + pont > TUDATPONT_KERET) {
    throw new Error(
      'Ennyi tudatpontod nincs. Kereted ' + TUDATPONT_KERET +
      ', ebből máshol ' + marKiosztott + ' van kiosztva.'
    );
  }

  return esemenytTeszek(kornyezet, 'TudatpontRendezes', { entitas, pont, szerep });
}

// ===================================
// ÉRTÉK JAVASLAT (küszöbök)
// ===================================

/**
 * Küszöbértékeket javasol egy entitáshoz. Az érvényes küszöb a tulajdonosok
 * javaslatainak MEDIÁNJA (D4) — tehát ez nem parancs, hanem szavazat a küszöbről.
 * @param {Object} kornyezet
 * @param {string} entitas
 * @param {Object} ertekek - { elfogadasiKuszob, reszveteliKuszob, minimumDontesiIdo, maximumDontesiIdo }
 */
export function ertekJavaslat(kornyezet, entitas, ertekek) {
  return esemenytTeszek(kornyezet, 'ErtekJavaslat', { entitas, ertekek });
}

// ===================================
// JAVASLAT
// ===================================

/**
 * Javaslatot tesz. A `fajta` dönti el, mi történik elfogadáskor (D27):
 *   'szerkesztesi' → a koino végrehajtja a változást
 *   'altalanos'    → nem történik semmi automatikusan; az egyezmény MAGA az álláspont
 *
 * @param {Object} kornyezet
 * @param {Object} adatok - { erintett, muvelet, valtozas, indoklas, fajta }
 */
export function javaslatLetrehozasa(kornyezet, { erintett, muvelet, valtozas, indoklas, fajta }) {
  return esemenytTeszek(kornyezet, 'Javaslat', {
    fajta: fajta === 'altalanos' ? 'altalanos' : 'szerkesztesi',
    erintett,
    muvelet: muvelet || 'Modositas',
    valtozas: valtozas || null,
    indoklas: indoklas || null
  });
}

// ===================================
// SZAVAZAT
// ===================================

/**
 * Szavaz egy javaslatra. A szavazat MÓDOSÍTHATÓ: egy újabb szavazat-esemény felülírja a
 * korábbit (a saját láncodban az utolsó számít). Ez nem kijátszás, hanem szabály — a
 * meggondolás joga.
 *
 * @param {Object} kornyezet
 * @param {string} javaslat
 * @param {string} szavazat - 'Tamogat' | 'Ellenez' | 'Tartozkodik'
 */
export function szavazas(kornyezet, javaslat, szavazat) {
  if (!['Tamogat', 'Ellenez', 'Tartozkodik'].includes(szavazat)) {
    throw new Error('Érvénytelen szavazat: ' + szavazat);
  }
  return esemenytTeszek(kornyezet, 'Szavazat', { javaslat, szavazat });
}
