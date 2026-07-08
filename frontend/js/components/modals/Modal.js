// frontend/js/components/modal/Modal.js

// ===== IMPORTOK =====
// Az apiHelper GET kéréseit itt nem használjuk, a template betöltés
// egyszerű fetch() – nem kell auth token, helyi fájl
// (nincs import szükséges)

// ===== NYITOTT MODÁLOK VERME =====
// Modul-szintű verem: minden éppen nyitott Modal példány ide kerül a megnyitáskor,
// és bezáráskor kikerül. Erre azért van szükség, mert BEÁGYAZOTT modálnál (pl. a
// Részletek modal fölött a Hozzájárulók al-modal) minden példány SAJÁT ESC-figyelőt
// tesz a document-re. ESC lenyomásakor így mindegyik figyelő lefutna, és MINDKÉT
// modal bezáródna. A verem tetején lévő (legfelső) modal az „aktív" – csak az záródjon.
const nyitottModalVerem = [];

// ===== MODAL OSZTÁLY =====
// Általános modal alap – minden specifikus modal erre épül.
// A HTML váz betöltése: frontend/html/components/modals/modal.html
class Modal {

  // ===== KONSTRUKTOR =====
  // @param {string}             kontenerAzonosito     – a div ID-ja, ahova a modal kerül
  // @param {Object}             beallitasok           – modal viselkedése és tartalma
  // @param {string}             beallitasok.cim       – fejléc szövege
  // @param {string|HTMLElement} beallitasok.tartalom  – törzs tartalma
  // @param {string}             beallitasok.meret     – 'szuk' | 'alap' | 'szeles'
  // @param {Array}              beallitasok.gombok    – lábléc gombok tömbje
  //   Egy gomb alakja: { felirat, tipus, akcio, azonosito }
  //   tipus értékek: 'elsodleges' | 'masodlagos' | 'veszelyes'
  // @param {Function}           beallitasok.onBezaras – bezáráskor lefutó callback
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('Modal.constructor - KEZDÉS', {
      kontenerAzonosito,
      cim:   beallitasok?.cim,
      meret: beallitasok?.meret
    });

    // A konténer div ID-ja – ide töltjük be a template HTML-t
    this.kontenerAzonosito = kontenerAzonosito;

    // Alap tartalom beállítások – init() után kerülnek a DOM-ba
    this.cim      = beallitasok.cim      || '';
    this.tartalom = beallitasok.tartalom || '';

    // Méret opció – CSS osztályon keresztül érvényesül a panel elemen
    // 'szuk' = 340px, 'alap' = 480px, 'szeles' = 640px
    this.meret = beallitasok.meret || 'alap';

    // Lábléc gombok tömbje – üres tömb esetén a lábléc rejtve marad
    this.gombok = beallitasok.gombok || [];

    // Bezárás callback – kívülről kapjuk
    this.onBezaras = beallitasok.onBezaras || null;

    // DOM elemek – init() tölti fel ezeket a template betöltése után
    this.overlay    = null; // Félig átlátszó háttér
    this.panel      = null; // A modal doboz maga
    this._hibaDiv   = null; // Hibaüzenet megjelenítő sáv
    this._lablecDiv = null; // Lábléc (gombok helye)

    // Nyitott állapot követése
    this.nyitottE = false;

    // Betöltési állapot követése – overlay és ESC is ezt nézi
    this.betoltesbenE = false;

    // Billentyűzet figyelő referenciája – eltávolításhoz kell
    this._billentyuFigyeloBound = this._billentyuFigyelo.bind(this);

    console.log('Modal.constructor - VÉGE', {
      meret:       this.meret,
      gombokSzama: this.gombok.length
    });
  }

  // ===== INICIALIZÁLÁS =====
  // A HTML template betöltése fetch()-csel, majd DOM elemek bekötése.
  // Egyszer kell meghívni – utána megnyitas()/bezaras() vezérli.
  // @returns {Promise<void>}
  async init() {
    console.log('Modal.init - KEZDÉS');

    // Konténer div megkeresése a DOM-ban
    const kontener = document.getElementById(this.kontenerAzonosito);
    if (!kontener) {
      console.error('Modal.init - HIBA: konténer nem található', {
        kontenerAzonosito: this.kontenerAzonosito
      });
      return;
    }

    // HTML template betöltése a html/components/modals/ mappából
    const sikerult = await this._templateBetoltese(kontener);
    if (!sikerult) return;

    // DOM elemek eltárolása – a metódusok ezeken dolgoznak
    this.overlay    = kontener.querySelector('.modal-overlay');
    this.panel      = kontener.querySelector('.modal-panel');
    this._hibaDiv   = kontener.querySelector('.modal-hiba');
    this._lablecDiv = kontener.querySelector('.modal-lablec');

    // Méret CSS osztály hozzáadása a panelhez (pl. modal-panel--szeles)
    this.panel.classList.add(`modal-panel--${this.meret}`);

    // Cím szöveg beírása a fejléc elembe
    const cimElem = kontener.querySelector('.modal-cim');
    if (cimElem) cimElem.textContent = this.cim;

    // Tartalom beillesztése – string esetén innerHTML, DOM elem esetén appendChild
    const tartalomDiv = kontener.querySelector('.modal-tartalom');
    if (tartalomDiv) {
      if (this.tartalom instanceof HTMLElement) {
        tartalomDiv.appendChild(this.tartalom);
      } else {
        tartalomDiv.innerHTML = this.tartalom;
      }
    }

    // Lábléc gombok felépítése és beillesztése, ha van gomb
    if (this.gombok.length > 0 && this._lablecDiv) {
      this._lablecDiv.innerHTML = this._gombokHtmlEpites();
      // Lábléc látható CSS osztály – csak akkor, ha vannak gombok
      this._lablecDiv.classList.add('modal-lablec--latható');
    }

    // Overlay koppintásra bezárja a modalt – betöltés alatt nem enged
    this.overlay.addEventListener('click', () => {
      if (!this.betoltesbenE) this.bezaras();
    });

    // Bezáró gomb (✕) eseményfigyelője
    const bezaroGomb = kontener.querySelector('.modal-bezaro-gomb');
    if (bezaroGomb) {
      bezaroGomb.addEventListener('click', () => {
        // Betöltés alatt a ✕ gomb sem működik
        if (!this.betoltesbenE) this.bezaras();
      });
    }

    console.log('Modal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
// Fetch()-csel lekéri a modal.html fájlt és beilleszti a konténerbe.
// Relatív útvonal – a szerver a frontend/ mappát szolgálja ki gyökérként.
// @param {HTMLElement} kontener – a konténer DOM elem
// @returns {Promise<boolean>}   – true: sikeres | false: hiba
async _templateBetoltese(kontener) {
  console.log('Modal._templateBetoltese - KEZDÉS');

  try {
    // ✅ Relatív útvonal – ./html/components/modals/ a frontend/ gyökérből
    const valasz = await fetch('./html/components/modals/modal.html');

    if (!valasz.ok) {
      console.error('Modal._templateBetoltese - HIBA: template nem található', {
        statusz: valasz.status
      });
      return false;
    }

    const htmlSzoveg = await valasz.text();
    kontener.innerHTML = htmlSzoveg;

    console.log('Modal._templateBetoltese - VÉGE: sikeres betöltés');
    return true;

  } catch (hiba) {
    console.error('Modal._templateBetoltese - VÉGE: kivétel', hiba.message);
    return false;
  }
}

  // ===== GOMBOK HTML ÉPÍTÉS =====
  // A lábléc gombok HTML stringjét állítja össze a this.gombok tömbből.
  // @returns {string} gombok HTML stringje
  _gombokHtmlEpites() {
    console.log('Modal._gombokHtmlEpites - KEZDÉS', {
      gombokSzama: this.gombok.length
    });

    // Minden gomb objektumból HTML button elemet gyártunk
    const html = this.gombok.map((gomb, index) => {
      // Egyedi azonosító – kívülről megadható, különben index alapú
      const azonosito = gomb.azonosito || `modal-gomb-${index}`;

      // CSS osztály a típus alapján (pl. modal-gomb--veszelyes)
      const tipusOsztaly = `modal-gomb--${gomb.tipus || 'masodlagos'}`;

      return `
        <button
          id="${azonosito}"
          class="modal-gomb ${tipusOsztaly}"
          type="button"
        >${gomb.felirat}</button>
      `;
    }).join('');

    console.log('Modal._gombokHtmlEpites - VÉGE');
    return html;
  }

  // ===== GOMB ESEMÉNYEK BEKÖTÉSE =====
  // A lábléc gombok kattintás eseményeit köti be.
  // Megnyitáskor hívódik – így mindig frissen kötjük be a callbackeket.
  _gombEsemenyekBekotese() {
    console.log('Modal._gombEsemenyekBekotese - KEZDÉS');

    // Minden gombhoz megkeressük a DOM elemet és bekötjük az akciót
    this.gombok.forEach((gomb, index) => {
      const azonosito = gomb.azonosito || `modal-gomb-${index}`;
      const gombElem  = this.panel?.querySelector(`#${azonosito}`);

      if (gombElem && typeof gomb.akcio === 'function') {
        // Kattintásra az akcio() fut le – de betöltés alatt nem
        gombElem.addEventListener('click', () => {
          if (!this.betoltesbenE) {
            console.log('Modal - gomb kattintás', { felirat: gomb.felirat });
            gomb.akcio();
          }
        });
      } else if (!gombElem) {
        console.warn('Modal._gombEsemenyekBekotese - FIGYELEM: gomb nem található', {
          azonosito
        });
      }
    });

    console.log('Modal._gombEsemenyekBekotese - VÉGE');
  }

  // ===== MEGNYITÁS =====
  // A modal panel és overlay megjelenítése animációval.
    megnyitas() {
    console.log('Modal.megnyitas - KEZDÉS');

    if (!this.overlay || !this.panel) {
      console.error('Modal.megnyitas - HIBA: overlay vagy panel hiányzik');
      return;
    }

    // aria-hidden ELŐSZÖR false – még mielőtt bármilyen fókusz történik
    this.panel.setAttribute('aria-hidden', 'false');

    this.overlay.classList.add('latható');
    this.panel.classList.add('latható');

    this.nyitottE = true;

    // Felvesszük a nyitott modálok vermének tetejére (ez lesz az „aktív" modal).
    // Csak akkor, ha még nincs benne – kettős megnyitás ellen véd.
    if (!nyitottModalVerem.includes(this)) {
      nyitottModalVerem.push(this);
    }

    // Gomb eseményfigyelők bekötése
    this._gombEsemenyekBekotese();

    // ESC billentyű figyelése
    document.addEventListener('keydown', this._billentyuFigyeloBound);

    // Fókusz a panelre – UTOLJÁRA, miután aria-hidden már false
    this.panel.focus();

    console.log('Modal.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
  // A modal panel és overlay elrejtése animációval.
  bezaras() {
    console.log('Modal.bezaras - KEZDÉS');

    if (!this.overlay || !this.panel) {
      console.error('Modal.bezaras - HIBA: overlay vagy panel hiányzik');
      return;
    }

    // Látható CSS osztály eltávolítása – ez indítja a kilépési animációt
    this.overlay.classList.remove('latható');
    this.panel.classList.remove('latható');

    // Állapot frissítése
    this.nyitottE = false;

    // Kivesszük a nyitott modálok verméből (bárhol is van benne)
    const veremIndex = nyitottModalVerem.indexOf(this);
    if (veremIndex !== -1) {
      nyitottModalVerem.splice(veremIndex, 1);
    }

    // Betöltési állapot visszaállítása bezáráskor – biztonság kedvéért
    this.betoltesbenE = false;

    // Akadálymentesség: ha a fókusz a panelen belül van (pl. a bezáró vagy egy
    // lábléc gombon), ELŐBB elvesszük a fókuszt. Különben az aria-hidden="true"
    // egy fókuszált elem ősére kerülne, amit a böngésző hibával blokkol
    // (WAI-ARIA szabály: fókuszált elem nem rejthető el segítő technológia elől).
    if (this.panel.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    // Akadálymentesség: elrejtés képernyőolvasók elől
    this.panel.setAttribute('aria-hidden', 'true');

    // ESC figyelő eltávolítása – ne halmozódjanak fel
    document.removeEventListener('keydown', this._billentyuFigyeloBound);

    // Bezárás callback futtatása, ha megadták
    if (typeof this.onBezaras === 'function') {
      this.onBezaras();
    }

    console.log('Modal.bezaras - VÉGE');
  }

  // ===== TARTALOM FRISSÍTÉSE =====
  // Már inicializált modal tartalmát és címét cseréli le.
  // @param {string}             ujCim      – új fejléc szöveg
  // @param {string|HTMLElement} ujTartalom – új törzs tartalom
  tartalomFrissitese(ujCim, ujTartalom) {
    console.log('Modal.tartalomFrissitese - KEZDÉS', { ujCim });

    // Cím frissítése a fejlécben
    const cimElem = this.panel?.querySelector('.modal-cim');
    if (cimElem) cimElem.textContent = ujCim;

    // Tartalom frissítése a törzsben — null/undefined esetén a törzs
    // változatlan marad (pl. lépésváltásnál csak a cím frissül)
    const tartalomDiv = this.panel?.querySelector('.modal-tartalom');
    if (tartalomDiv && ujTartalom != null) {
      if (ujTartalom instanceof HTMLElement) {
        tartalomDiv.innerHTML = '';
        tartalomDiv.appendChild(ujTartalom);
      } else {
        tartalomDiv.innerHTML = ujTartalom;
      }
    }

    // Tartalom váltáskor a hibaüzenetet töröljük
    this.hibaTisztitasa();

    console.log('Modal.tartalomFrissitese - VÉGE', { ujCim });
  }

  // ===== BETÖLTÉSI ÁLLAPOT BEÁLLÍTÁSA =====
  // API hívás alatt letiltja a gombokat és spinnert jelenít meg.
  // @param {boolean} aktiv – true: betöltés indul | false: betöltés vége
  betoltesBeallitasa(aktiv) {
    console.log('Modal.betoltesBeallitasa - KEZDÉS', { aktiv });

    // Állapot eltárolása – overlay, ESC és gombok is ezt vizsgálják
    this.betoltesbenE = aktiv;

    // Panel CSS osztály – vizuálisan is jelöljük a betöltési állapotot
    if (aktiv) {
      this.panel?.classList.add('modal-panel--betoltes');
    } else {
      this.panel?.classList.remove('modal-panel--betoltes');
    }

    // Az összes lábléc gomb letiltása / engedélyezése
    const gombElemek = this.panel?.querySelectorAll('.modal-gomb');
    gombElemek?.forEach(gombElem => {
      gombElem.disabled = aktiv;
    });

    // Bezáró (✕) gomb letiltása / engedélyezése
    const bezaroGomb = this.panel?.querySelector('.modal-bezaro-gomb');
    if (bezaroGomb) bezaroGomb.disabled = aktiv;

    // Spinner megjelenítése / elrejtése a láblécben
    if (this._lablecDiv) {
      // Meglévő spinner eltávolítása – nehogy kettő legyen
      this._lablecDiv.querySelector('.modal-spinner')?.remove();

      if (aktiv) {
        // Spinner elem hozzáadása a lábléc elejéhez
        const spinner = document.createElement('span');
        spinner.className = 'modal-spinner';
        spinner.setAttribute('aria-label', 'Betöltés folyamatban');
        this._lablecDiv.prepend(spinner);
      }
    }

    console.log('Modal.betoltesBeallitasa - VÉGE', { aktiv });
  }

  // ===== HIBAÜZENET BEÁLLÍTÁSA =====
  // Megjelenít egy piros hibaüzenetet a tartalom felett.
  // Automatikusan leállítja a betöltési állapotot is.
  // @param {string} szoveg – a megjelenítendő hibaüzenet szövege
  hibaBeallitasa(szoveg) {
    console.log('Modal.hibaBeallitasa - KEZDÉS', { szoveg });

    if (!this._hibaDiv) {
      console.warn('Modal.hibaBeallitasa - FIGYELEM: hiba div nem található');
      return;
    }

    // Szöveg beállítása és megjelenítés CSS osztállyal
    this._hibaDiv.textContent = szoveg;
    this._hibaDiv.classList.add('modal-hiba--latható');

    // Hiba esetén a betöltési állapotot is leállítjuk
    this.betoltesBeallitasa(false);

    console.log('Modal.hibaBeallitasa - VÉGE', { szoveg });
  }

  // ===== HIBAÜZENET TÖRLÉSE =====
  // Elrejti a hibaüzenet sávot és törli a szöveget.
  hibaTisztitasa() {
    console.log('Modal.hibaTisztitasa - KEZDÉS');

    if (!this._hibaDiv) return;

    // Szöveg törlése és CSS osztály eltávolítása
    this._hibaDiv.textContent = '';
    this._hibaDiv.classList.remove('modal-hiba--latható');

    console.log('Modal.hibaTisztitasa - VÉGE');
  }

  // ===== BILLENTYŰ FIGYELŐ =====
  // ESC lenyomásakor bezárja a modalt – de betöltés alatt nem.
  // @param {KeyboardEvent} esemeny
  _billentyuFigyelo(esemeny) {
    // Csak a verem TETEJÉN lévő (legfelső, aktív) modal reagáljon az ESC-re.
    // Így beágyazott modálnál egy ESC csak a felső al-modalt zárja, a szülőt nem.
    const legfelsoModal = nyitottModalVerem[nyitottModalVerem.length - 1];

    if (esemeny.key === 'Escape' && this.nyitottE && !this.betoltesbenE && legfelsoModal === this) {
      console.log('Modal._billentyuFigyelo - ESC lenyomva, modal bezárása');
      this.bezaras();
    }
  }

  // ===== STATIKUS: MEGERŐSÍTŐ MODAL =====
  // Gyors igen/nem megerősítő ablak – nem kell kézzel példányosítani.
  // Tipikus használat: törlés előtti megerősítés.
  // @param {string}   kontenerAzonosito – konténer div ID
  // @param {string}   szoveg            – a megerősítő kérdés szövege
  // @param {Function} onIgen            – „Igen" gombra lefutó callback
  // @param {Function} onNem             – „Mégse" / bezárásra lefutó callback (opcionális)
  // @returns {Promise<Modal>} a létrehozott modal példány
  static async megerosites(kontenerAzonosito, szoveg, onIgen, onNem = null) {
    console.log('Modal.megerosites - KEZDÉS', { szoveg });

    // Megerősítő modal példányosítása fix beállításokkal
    const megerositoModal = new Modal(kontenerAzonosito, {
      cim:      'Megerősítés',
      tartalom: `<p class="modal-megerosites-szoveg">${szoveg}</p>`,
      meret:    'szuk', // Megerősítő ablak mindig szűk
      gombok: [
        {
          felirat:   'Igen',
          tipus:     'veszelyes',  // Piros – figyelmeztető akció
          azonosito: 'modal-igen-gomb',
          akcio: () => {
            megerositoModal.bezaras();
            if (typeof onIgen === 'function') onIgen();
          }
        },
        {
          felirat:   'Mégse',
          tipus:     'masodlagos',
          azonosito: 'modal-megse-gomb',
          akcio: () => {
            megerositoModal.bezaras();
            if (typeof onNem === 'function') onNem();
          }
        }
      ],
      // ESC-pel vagy overlay-re koppintással való zárás is „Nem"-nek számít
      onBezaras: () => {
        if (typeof onNem === 'function') onNem();
      }
    });

    // Azonnal inicializáljuk (async!) és megnyitjuk
    await megerositoModal.init();
    megerositoModal.megnyitas();

    console.log('Modal.megerosites - VÉGE');
    return megerositoModal;
  }

}

// ===== EXPORTÁLÁS =====
export default Modal;