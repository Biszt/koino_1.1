// frontend/js/components/szoveg/SzovegMezoMegjelenito.js

import SzovegBlokk from '../szovegSzerkeszto/blokkok/SzovegBlokk.js';
import KepBlokk from '../szovegSzerkeszto/blokkok/KepBlokk.js';
import FajlBlokk from '../szovegSzerkeszto/blokkok/FajlBlokk.js';
import LinkBlokk from '../szovegSzerkeszto/blokkok/LinkBlokk.js';
import EntitasHivatkozasBlokk from '../szovegSzerkeszto/blokkok/EntitasHivatkozasBlokk.js';

// =============================================
// SZÖVEG MEZŐ MEGJELENÍTŐ
// Felelősség:
// - Blokk tömb csak olvasható renderelése a kártyák body-jában
// - Szerkesztő nélkül, eszköztár nélkül
// - Entitás hivatkozás koppintás kezelése a Pakli.js felé
// - A meglévő blokk osztályok letrehozasMegjelenitesMod() / letrehozas()
//   metódusait hívja – dupla logika nincs
// =============================================

class SzovegMezoMegjelenito {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {HTMLElement} kontener - A befogadó DOM elem (a kártya body-ban)
  // @param {Object} beallitasok
  // @param {Array}    beallitasok.blokkok            - A blokk adatobjektumok tömbje
  // @param {Function} beallitasok.onEntitasKivalasztas - Entitás hivatkozás koppintásakor
  //                                                      hívódik (entitasId, entitasTipus)
  constructor(kontener, beallitasok = {}) {
    console.log('SzovegMezoMegjelenito.constructor - KEZDÉS', {
      blokkSzam: beallitasok.blokkok?.length
    });

    // Befogadó elem
    this.kontener = kontener;

    // Blokkok tömbje
    this.blokkok = beallitasok.blokkok ?? [];

    // Entitás hivatkozás koppintás callback
    this.onEntitasKivalasztas = beallitasok.onEntitasKivalasztas ?? null;

    // Eseményfigyelők nyilvántartása a destroy() számára
    // Formátum: { elem, tipus, handler }
    this._esemenyFigyelo = [];

    // Renderelés azonnal
    this._render();

    console.log('SzovegMezoMegjelenito.constructor - VÉGE');
  }

  // =============================================
  // RENDERELÉS
  // =============================================
  // Végigmegy a blokkok tömbjén és minden blokkhoz
  // meghívja a megfelelő privát renderelő metódust
  _render() {
    console.log('SzovegMezoMegjelenito._render - KEZDÉS', {
      blokkSzam: this.blokkok.length
    });

    // Konténer ürítése (újra-renderelés esetére)
    this.kontener.innerHTML = '';

    this.blokkok.forEach((blokk) => {
      const domElem = this._blokkRenderelese(blokk);
      if (domElem) {
        this.kontener.appendChild(domElem);
      }
    });

    console.log('SzovegMezoMegjelenito._render - VÉGE');
  }

  // =============================================
  // BLOKK RENDERELÉSE
  // =============================================
  // Típus alapján példányosítja a megfelelő blokk osztályt
  // és visszaadja a megjelenítő DOM elemet.
  // @param {Object} blokk - A blokk adatobjektum
  // @returns {HTMLElement|null} A kész DOM elem, vagy null ismeretlen típusnál
  _blokkRenderelese(blokk) {
    console.log('SzovegMezoMegjelenito._blokkRenderelese - KEZDÉS', {
      blokkId:   blokk?.id,
      blokkTipus: blokk?.tipus
    });

    let domElem = null;

    switch (blokk.tipus) {

      // --- SZÖVEG BLOKK ---
      // A SzovegBlokk.letrehozas() egy contenteditable divet hoz létre.
      // Megjelenítő módban: contentEditable kikapcsolva, billentyű
      // és input eseményfigyelők nem szükségesek – a callbacks üres.
      case 'szoveg': {
        const szovegBlokk = new SzovegBlokk(blokk, {});
        domElem = szovegBlokk.letrehozas();
        // Csak olvasható: szerkesztés tiltása
        domElem.contentEditable = 'false';
        domElem.setAttribute('aria-readonly', 'true');
        break;
      }

      // --- KÉP BLOKK ---
      // A KepBlokk.letrehozas() wrapper + kép + méretválasztó sorral tér vissza.
      // Megjelenítő módban: a méretválasztó gombok és törlő gomb nem szükségesek.
      // A KepBlokk maga kezeli a megjelenítést, csak a törlő gomb szűrendő ki.
      case 'kep': {
        const kepBlokk = new window.KepBlokk(blokk, {});
        domElem = kepBlokk.letrehozas();
        // Törlő gomb eltávolítása (csak szerkesztő módban kell)
        const kepTorloGomb = domElem.querySelector('.blokk-torlo-gomb');
        if (kepTorloGomb) kepTorloGomb.remove();
        // Méretválasztó eltávolítása (csak szerkesztő módban kell)
        const meretValaszto = domElem.querySelector('.kep-blokk__meret-valaszto');
        if (meretValaszto) meretValaszto.remove();
        break;
      }

      // --- FÁJL BLOKK ---
      // A FajlBlokk.letrehozas() wrapper + letöltési link + törlő gombbal tér vissza.
      // Megjelenítő módban: törlő gomb eltávolítva.
      case 'fajl': {
        const fajlBlokk = new window.FajlBlokk(blokk, {});
        domElem = fajlBlokk.letrehozas();
        // Törlő gomb eltávolítása
        const fajlTorloGomb = domElem.querySelector('.blokk-torlo-gomb');
        if (fajlTorloGomb) fajlTorloGomb.remove();
        break;
      }

      // --- LINK BLOKK ---
      // A LinkBlokk.letrehozas() wrapper + link + törlő gombbal tér vissza.
      // Megjelenítő módban: törlő gomb eltávolítva.
      case 'link': {
        const linkBlokk = new window.LinkBlokk(blokk, {});
        domElem = linkBlokk.letrehozas();
        // Törlő gomb eltávolítása
        const linkTorloGomb = domElem.querySelector('.blokk-torlo-gomb');
        if (linkTorloGomb) linkTorloGomb.remove();
        break;
      }

      // --- ENTITÁS HIVATKOZÁS BLOKK ---
      // Az EntitasHivatkozasBlokk.letrehozasMegjelenitesMod() már pontosan
      // erre az esetre lett tervezve: csak a koppintható hivatkozást adja vissza,
      // törlő gomb és wrapper nélkül.
      case 'entitasHivatkozas': {
        const hivatkozasBlokk = new window.EntitasHivatkozasBlokk(blokk, {
          // onKoppintas: a SzovegMezoMegjelenito onEntitasKivalasztas
          // callbackjét hívja, ami a kártyákon keresztül a Pakli.js-be ér
          onKoppintas: (entitasId, entitasTipus) => {
            console.log('SzovegMezoMegjelenito - entitás hivatkozás koppintva', {
              entitasId,
              entitasTipus
            });
            if (typeof this.onEntitasKivalasztas === 'function') {
              this.onEntitasKivalasztas(entitasId, entitasTipus);
            }
          }
        });
        // Megjelenítő módhoz tervezett metódus – wrapper és törlő gomb nélkül
        domElem = hivatkozasBlokk.letrehozasMegjelenitesMod();
        break;
      }

      default:
        console.warn('SzovegMezoMegjelenito._blokkRenderelese - ismeretlen típus', {
          tipus: blokk.tipus
        });
    }

    console.log('SzovegMezoMegjelenito._blokkRenderelese - VÉGE', {
      blokkId:    blokk?.id,
      sikerult:   !!domElem
    });

    return domElem;
  }

  // =============================================
  // MEGSEMMISÍTÉS
  // =============================================
  // A kártyák destroy() metódusa hívja meg.
  // Üríti a konténert és elvágja a referenciákat.
  destroy() {
    console.log('SzovegMezoMegjelenito.destroy - KEZDÉS');

    // Konténer ürítése (DOM események automatikusan lekapcsolódnak)
    this.kontener.innerHTML = '';

    // Referenciák elengedése
    this.blokkok              = [];
    this.onEntitasKivalasztas = null;
    this.kontener             = null;

    console.log('SzovegMezoMegjelenito.destroy - VÉGE');
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
// window-ra rakjuk, mert a blokk osztályok is így vannak exportálva,
// és a kártyák ES module importtal töltik be
export default SzovegMezoMegjelenito;