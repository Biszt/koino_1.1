// frontend/js/utils/sikidomHorgony.js

// ===== HORGONY-KERET (a végtelen nagyítás számtani alapja) =====
//
// Felelősség: a Síkidom nézet koordinátáinak kezelése úgy, hogy a nagyítás
// KORLÁTLAN legyen — a lebegőpontos számok elfogyása nélkül.
//
// A PROBLÉMA (a koino_1.0 buktatója):
// ha minden síkidom helyét EGYETLEN, közös (abszolút) koordináta-rendszerben
// tároljuk, akkor a mélységgel a számok elfogynak: minden szinttel a sugár a
// √20-ad részére csökken, tehát 20 szint mélyen már 10⁻¹³ nagyságrenden vagyunk,
// a `double` pedig ~15-16 értékes jegyet tud. A koino_1.0 ezt a teljes vászon
// újraépítésével kerülte meg — innen jött a PISLOGÁS.
//
// A MEGOLDÁS: nincs abszolút koordináta-rendszer. Minden síkidom a SZÜLŐJÉHEZ
// képest van tárolva (relX, relY a szülő SUGARÁNAK egységében, relR = a saját
// sugara a szülőéhez képest). A rajzoláshoz kijelölünk egy HORGONYT, és mindent
// ahhoz képest számolunk. Mivel egyszerre csak néhány szintet látunk, a számok
// mindig 1 körüli nagyságrendben maradnak.
//
// Ha a nagyítás elmélyül, HORGONYT VÁLTUNK — de ez NEM újraépítés, hanem puszta
// átszámolás: az új koordinátákat és az új nézetet EGYSZERRE igazítjuk, úgy hogy
// a szorzatuk (a képernyő-hely) változatlan maradjon:
//
//   új skála   = skála × r
//   új eltolás = eltolás + skála × (x, y)
//
// ahol (x, y, r) az ÚJ horgony helye és sugara a RÉGI horgony keretében. Ezért
// a váltás pillanatában egyetlen síkidom sem mozdul a képernyőn — nincs mit
// újrarajzolni, nincs mit újratölteni, tehát nincs pislogás sem.
//
// SZÁNDÉKOSAN nincs DOM-függése: Node-ból egység-tesztelhető.
// Használják: a Síkidom nézet rajzolója.

// ===== KÜSZÖBÖK A HORGONYVÁLTÁSHOZ =====
// A két küszöb SZÁNDÉKOSAN eltér (hiszterézis): így a határon ácsorogva sem
// kapkod oda-vissza a nézet.

// Lefelé váltunk, ha egy gyerek képernyő-átmérője ennyiszerese a képernyőnek
export const LEFELE_KUSZOB = 2.0;

// Fölfelé váltunk, ha a horgony képernyő-átmérője ennyi alá esik
export const FOLFELE_KUSZOB = 0.5;

// ===== EGY CSOMÓPONT A HORGONY KERETÉBEN =====
// Kiszámolja, hol van és mekkora a csomópont a horgonyhoz képest.
// A horgony maga mindig (0, 0) helyen, 1 sugárral szerepel.
//
// A számítás fentről lefelé halmozódik:
//   hely  ← hely + méret × relHely
//   méret ← méret × relSugár
//
// @param {Map} tar - csomópont-tár: id → {szuloId, relX, relY, relR}
// @param {string} horgonyId - a horgony csomópont azonosítója
// @param {string} csomopontId - a keresett csomópont azonosítója
// @returns {{x:number, y:number, r:number}|null} null, ha nem a horgony leszármazottja
export function keretbenCsomopont(tar, horgonyId, csomopontId) {
  // Az ős-lánc összegyűjtése a csomóponttól FÖLFELÉ a horgonyig
  const lanc = [];
  let aktualis = csomopontId;

  while (aktualis && aktualis !== horgonyId) {
    const cs = tar.get(aktualis);
    if (!cs) return null;
    lanc.push(cs);
    aktualis = cs.szuloId;
  }

  // Ha nem értünk el a horgonyig, a csomópont nem a leszármazottja
  if (aktualis !== horgonyId) return null;

  // A láncot most FENTRŐL LEFELÉ alkalmazzuk (a lánc fordítva gyűlt össze)
  let x = 0, y = 0, r = 1;
  for (let i = lanc.length - 1; i >= 0; i--) {
    const cs = lanc[i];
    x = x + r * cs.relX;
    y = y + r * cs.relY;
    r = r * cs.relR;
  }

  return { x, y, r };
}

// ===== A SZÜLŐ A GYEREK KERETÉBEN =====
// A fölfelé váltáshoz kell: ha a gyerekre horgonyzunk, hol van hozzá képest a
// szülő? A gyerek a szülő keretében (relX, relY) helyen, relR sugárral van —
// ezt megfordítva:
//   a szülő helye  = −(relX, relY) / relR
//   a szülő sugara = 1 / relR
//
// @param {Map} tar
// @param {string} gyerekId
// @returns {{x:number, y:number, r:number}|null} null, ha nincs szülő
export function szuloKeretben(tar, gyerekId) {
  const gy = tar.get(gyerekId);
  if (!gy || !gy.szuloId) return null;

  return {
    x: -gy.relX / gy.relR,
    y: -gy.relY / gy.relR,
    r: 1 / gy.relR
  };
}

// ===== NÉZET IGAZÍTÁSA HORGONYVÁLTÁSKOR =====
// Ez a modul lelke. Az új nézetet úgy állítjuk be, hogy a képernyő-kép PONTOSAN
// ugyanaz maradjon — a levezetés a fájl fejlécében.
//
// @param {Object} nezet - {skala, eltolasX, eltolasY}
// @param {{x:number, y:number, r:number}} ujHorgonyKeret - az ÚJ horgony a RÉGI keretében
// @returns {Object} az új nézet
export function horgonyValtasNezet(nezet, ujHorgonyKeret) {
  return {
    skala:    nezet.skala * ujHorgonyKeret.r,
    eltolasX: nezet.eltolasX + nezet.skala * ujHorgonyKeret.x,
    eltolasY: nezet.eltolasY + nezet.skala * ujHorgonyKeret.y
  };
}

// ===== KERET → KÉPERNYŐ =====
// @param {Object} nezet - {skala, eltolasX, eltolasY}
// @param {{x:number, y:number, r:number}} keret - a csomópont a horgony keretében
// @returns {{kepX:number, kepY:number, kepSugar:number}}
export function kepernyore(nezet, keret) {
  return {
    kepX:     nezet.eltolasX + nezet.skala * keret.x,
    kepY:     nezet.eltolasY + nezet.skala * keret.y,
    kepSugar: nezet.skala * keret.r
  };
}

// ===== KELL-E HORGONYT VÁLTANI? =====
// Eldönti, hogy a jelenlegi nagyításnál váltani kell-e, és merre.
//   'le'  — egy gyerek akkora, hogy ő legyen az új horgony
//   'fel' — a horgony már túl kicsi, a szülője legyen az
//   null  — marad minden
//
// @param {Object} nezet - {skala, ...}
// @param {number} kepernyoMeret - a képernyő KISEBBIK oldala képpontban
// @param {Array} gyerekKeretek - a horgony gyerekei a horgony keretében:
//   [{ id, keret:{x,y,r} }]
// @param {boolean} vanSzulo - van-e a horgonynak szülője (fölfelé váltható-e)
// @returns {{irany:'le', gyerekId:string}|{irany:'fel'}|null}
export function horgonyValtasSzukseges(nezet, kepernyoMeret, gyerekKeretek, vanSzulo) {
  // --- LEFELÉ: a legnagyobb olyan gyerek, ami átlépi a küszöböt ---
  let legnagyobb = null;
  for (const gy of gyerekKeretek) {
    const kepAtmero = 2 * nezet.skala * gy.keret.r;
    if (kepAtmero >= kepernyoMeret * LEFELE_KUSZOB) {
      if (!legnagyobb || gy.keret.r > legnagyobb.keret.r) legnagyobb = gy;
    }
  }
  if (legnagyobb) return { irany: 'le', gyerekId: legnagyobb.id };

  // --- FÖLFELÉ: maga a horgony zsugorodott a küszöb alá ---
  // (a horgony sugara a saját keretében definíció szerint 1)
  const horgonyKepAtmero = 2 * nezet.skala;
  if (vanSzulo && horgonyKepAtmero < kepernyoMeret * FOLFELE_KUSZOB) {
    return { irany: 'fel' };
  }

  return null;
}

export default {
  keretbenCsomopont, szuloKeretben, horgonyValtasNezet, kepernyore, horgonyValtasSzukseges
};
