// koino/felulet/js/terNezet.js

// Felelősség: A BELÉPŐ TÉR kirakása — koino-kártyák a `GET /api/ter`-ből.
//
// ===== ⚠️ MIÉRT ÚJ KÓD, ÉS NEM ÖRÖKÖLT =====
//
// A kártyák (`components/kartya/`) **változatlanul** jöttek a prototípusból, és ez az 5.3
// legnagyobb nyeresége volt. ⛔ **Itt viszont nincs mit örökölni:** a prototípus egyetlen
// központi szerver volt, ott a „koino" mint fogalom **nem létezett**. A tér az első nézet,
// aminek nincs őse — ezért új, és ezért szándékosan kevés.
//
// ⭐ Amit viszont ÖRÖKÖL: a **stílusváltozókat** (`base/variables.css`) és a pakli logikáját
// — rendezés + irány a sávban, egy lista alatta. *A tér ugyanúgy néz ki, mint a pakli, csak
// a kártyákon koinók állnak (Csaba, 2026-08-27).*
//
// ===== ⛔⛔ AMIT A LAPNAK KI KELL MONDANIA =====
//
// A tér **nem a világ összes koinója**, csak amit ez a készülék ismer — idegen koinók
// böngészéséhez a kereső-réteg kell, ami szándékosan elhagyható és nincs megépítve.
// A program ezt a `csakAmitIsmerunk` mezőben megmondja, és a lap **kiírja**. *A hallgatás
// itt teljességet ígérne, amit nem tudunk tartani (D19).*

import { apiGet, apiPost } from './utils/apiHelper.js';

export class TerNezet {

  /**
   * @param {HTMLElement} kontener - ide kerülnek a koino-kártyák
   * @param {Object} elemek - { allapotElem, rendezesValaszto, iranyValaszto }
   * @param {Function} belepesUtan - ezt hívjuk, ha az e-ember belépett egy koinóba
   */
  constructor(kontener, elemek = {}, belepesUtan = null) {
    console.log('TerNezet.constructor - KEZDÉS');

    this.kontener = kontener;
    this.elemek = elemek;
    this.belepesUtan = belepesUtan;

    this.rendezes = 'letrehozva';
    this.irany = 'csokkeno';
    this.aktiv = null;              // melyik koinóban állunk éppen

    console.log('TerNezet.constructor - VÉGE');
  }

  /** A tér betöltése és kirakása. */
  async betoltes() {
    console.log('TerNezet.betoltes - KEZDÉS', { rendezes: this.rendezes });

    const kereses = new URLSearchParams({ rendezes: this.rendezes, irany: this.irany });

    let ter;
    try {
      ter = await apiGet('ter?' + kereses.toString());
    } catch (hiba) {
      this._allapot('Nem sikerült lekérni a teret: ' + hiba.message, 'nem');
      return;
    }

    this.aktiv = ter.aktiv;
    this.kontener.replaceChildren();

    for (const koino of ter.kartyak) {
      this.kontener.appendChild(this._kartya(koino));
    }

    // ----- AZ ÁLLAPOT-SOR -----
    let szoveg = ter.koinok + (ter.koinok === 1 ? ' koino' : ' koino');
    if (ter.csakAmitIsmerunk) {
      // ⛔⛔ A HATÁR KIMONDVA (D19) — lásd a fájl fejlécét.
      szoveg += ' · csak amit ez a készülék ismer';
    }
    this._allapot(szoveg);

    console.log('TerNezet.betoltes - VÉGE', { koinok: ter.koinok });
  }

  // ===================================
  // EGY KOINO KÁRTYÁJA
  // ===================================

  /** @returns {HTMLElement} */
  _kartya(koino) {
    const elem = document.createElement('article');
    elem.className = 'koino-kartya';
    if (koino.azonosito === this.aktiv) elem.classList.add('koino-kartya--aktiv');

    // ----- A NÉV -----
    // ⚠️ HIÁNYOZHAT, ÉS AKKOR EZT MONDJUK (D19). Ha az eseményeket fájlból hoztam be, lehet,
    // hogy a koino gondolatait ismerem, a SZÜLETÉSÉT nem — nem találunk ki nevet.
    const fejlec = document.createElement('h2');
    fejlec.className = 'koino-kartya__nev';
    if (koino.nev) {
      fejlec.textContent = koino.nev;
    } else {
      fejlec.textContent = 'Nem ismerem a születését';
      fejlec.classList.add('koino-kartya__nev--ismeretlen');
    }
    elem.appendChild(fejlec);

    if (koino.leiras) {
      const leiras = document.createElement('p');
      leiras.className = 'koino-kartya__leiras';
      leiras.textContent = koino.leiras;
      elem.appendChild(leiras);
    }

    // ----- ⭐⭐ A HÁROM SZÁM — a létszám SÚLYA -----
    //
    // Nem egy szám, hanem három: tag · nem ellenőrizhető · belépő. A különbségük maga a
    // súly: ahol 900-an beléptek, de 12-nek van visszavezethető meghívási lánca, az
    // ránézésre más, mint ahol 900-ból 900. *A puszta létszám ezt elhallgatná.*
    const szamok = document.createElement('div');
    szamok.className = 'koino-kartya__szamok';
    szamok.appendChild(this._szam(koino.tagok, 'tag', 'akinek visszavezethető a meghívása'));
    if (koino.nemEllenorizhetok > 0) {
      szamok.appendChild(this._szam(koino.nemEllenorizhetok, 'nem ellenőrizhető',
        'a meghívási lánc egy része még nem érkezett meg — hiány, nem vád'));
    }
    szamok.appendChild(this._szam(koino.belepok, 'belépő', 'aki megnyitotta a saját szeletét'));
    szamok.appendChild(this._szam(koino.esemenyek, 'esemény', 'amennyi ebből a koinóból megvan'));
    elem.appendChild(szamok);

    // ----- AZ IDŐ -----
    const labjegyzet = document.createElement('p');
    labjegyzet.className = 'koino-kartya__labjegyzet';
    if (koino.letrehozva) {
      // ⚠️ „a szerző órája" — ez ÁLLÍTÁS, nem mért idő, és ezt kiírjuk. Mellette a saját
      // megfigyelésem, ami hamisíthatatlan, de készülékenként más.
      labjegyzet.textContent = 'létrehozva: '
        + new Date(koino.letrehozva).toLocaleString('hu-HU') + ' (a szerző órája)';
    } else {
      labjegyzet.textContent = 'a létrehozás idejét nem ismerem';
    }
    if (koino.eloszorLattam) {
      labjegyzet.textContent += ' · először láttam: '
        + new Date(koino.eloszorLattam).toLocaleString('hu-HU');
    }
    elem.appendChild(labjegyzet);

    // ----- A BELÉPÉS -----
    //
    // ⚠️ A „belépés" itt NEM bejelentkezés (D15: nincs ilyen a koinóban) — csak annyi,
    // hogy melyik koinót nézi ez a lap. Semmi nem terjed tőle.
    const sav = document.createElement('div');
    sav.className = 'koino-kartya__sav';

    const allas = document.createElement('span');
    allas.className = 'koino-kartya__allas';
    allas.textContent = koino.enTagVagyok ? '✔ tag vagy' : '· ' + koino.miert;
    sav.appendChild(allas);

    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'koino-kartya__belepes';
    if (koino.azonosito === this.aktiv) {
      gomb.textContent = 'Itt vagy';
      gomb.disabled = true;
    } else {
      gomb.textContent = 'Belépek';
      gomb.addEventListener('click', () => this._belepes(koino.azonosito));
    }
    sav.appendChild(gomb);
    elem.appendChild(sav);

    return elem;
  }

  /** Egy szám a kártyán, magyarázó címkével. */
  _szam(ertek, cimke, magyarazat) {
    const doboz = document.createElement('span');
    doboz.className = 'koino-kartya__szam';
    doboz.title = magyarazat;

    const n = document.createElement('strong');
    n.textContent = String(ertek);
    doboz.appendChild(n);
    doboz.appendChild(document.createTextNode(' ' + cimke));
    return doboz;
  }

  // ===================================
  // BELÉPÉS EGY KOINÓBA
  // ===================================

  async _belepes(azonosito) {
    console.log('TerNezet._belepes - KEZDÉS', { azonosito });
    try {
      await apiPost('ter/valt', { koino: azonosito });
    } catch (hiba) {
      this._allapot('Nem sikerült belépni: ' + hiba.message, 'nem');
      return;
    }
    this.aktiv = azonosito;
    if (this.belepesUtan) await this.belepesUtan(azonosito);
    console.log('TerNezet._belepes - VÉGE', { azonosito });
  }

  // ===================================
  // SEGÉD
  // ===================================

  _allapot(szoveg, osztaly = '') {
    if (!this.elemek.allapotElem) return;
    this.elemek.allapotElem.textContent = szoveg;
    this.elemek.allapotElem.className = 'allapot' + (osztaly ? ' ' + osztaly : '');
  }
}
