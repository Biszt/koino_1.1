// frontend/js/components/kartya/kartyaGyar.js

// ===== KÁRTYA-GYÁR =====
// Felelősség: entitástípus alapján a megfelelő kártya-osztály példányosítása.
// Egyetlen helyen dől el, melyik típushoz melyik kártya tartozik — így a
// kártyát megjelenítő nézeteknek nem kell ismerniük az összes osztályt.
//
// Használja: a Síkidom nézet (koppintásra egyetlen kártyát mutat).
// MEGJEGYZÉS: a Pakli egyelőre saját, azonos szerkezetű `kartyaPeldanyositasa`
// metódust használ — az ő átállítása külön, óvatos lépés (a pakli a fő nézet).

// ===== IMPORTOK =====
import Kartya from './Kartya.js';
import TartalomKartya from './TartalomKartya.js';
import KategoriaKartya from './KategoriaKartya.js';
import TartalomTipusKartya from './TartalomTipusKartya.js';
import JavaslatKartya from './JavaslatKartya.js';
import EgyezmenyKartya from './EgyezmenyKartya.js';

// Entitástípus → kártya-osztály
const TIPUS_KARTYA = {
  Tartalom:      TartalomKartya,
  Kategoria:     KategoriaKartya,
  TartalomTipus: TartalomTipusKartya,
  Javaslat:      JavaslatKartya,
  Egyezmeny:     EgyezmenyKartya
};

// ===== KÁRTYA LÉTREHOZÁSA =====
// A kártya-osztályok egységes, pozíciós paraméter-sorrendet várnak:
//   (entitas, kivalasztott, onKivalasztas, token, modalKontenerAzon,
//    ujratoltesCb, onHamburgerMegnyitas)
//
// @param {Object} beallitasok
// @param {Object} beallitasok.entitas - a pakli-elem (entitasId, entitasTipus, adatok…)
// @param {boolean} beallitasok.kivalasztott
// @param {Function} beallitasok.onKivalasztas
// @param {string} beallitasok.token
// @param {string} beallitasok.modalKontenerAzon - a kártya SAJÁT modáljainak konténere
// @param {Function} beallitasok.ujratoltesCb
// @param {Function} beallitasok.onHamburgerMegnyitas
// @returns {Kartya} a példányosított (még nem init-elt) kártya
export function kartyaLetrehozasa(beallitasok = {}) {
  const {
    entitas,
    kivalasztott = false,
    onKivalasztas = () => {},
    token = null,
    modalKontenerAzon = null,
    ujratoltesCb = () => {},
    onHamburgerMegnyitas = () => {}
  } = beallitasok;

  console.log('kartyaGyar.kartyaLetrehozasa - KEZDÉS', {
    entitasTipus: entitas?.entitasTipus,
    entitasId: entitas?.entitasId
  });

  const Osztaly = TIPUS_KARTYA[entitas?.entitasTipus];

  if (!Osztaly) {
    console.warn('kartyaGyar.kartyaLetrehozasa - ismeretlen entitástípus, alap Kartya', {
      entitasTipus: entitas?.entitasTipus
    });
    return new Kartya(entitas, kivalasztott, onKivalasztas, null, onHamburgerMegnyitas);
  }

  const kartya = new Osztaly(
    entitas,
    kivalasztott,
    onKivalasztas,
    token,
    modalKontenerAzon,
    ujratoltesCb,
    onHamburgerMegnyitas
  );

  console.log('kartyaGyar.kartyaLetrehozasa - VÉGE', { entitasTipus: entitas?.entitasTipus });
  return kartya;
}

export default kartyaLetrehozasa;
