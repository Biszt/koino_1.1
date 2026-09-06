// frontend/js/components/modals/RendezesModal.js

// Felelősség: a pakli nézet RENDEZÉS-választója (15. terv-pont). Egy kis modal
// rádiógombokkal: rendezési MÓD (hierarchikus / időrend / saját tudatpont) és
// SORREND (csökkenő / növekvő). Az „Alkalmaz" gomb az onAlkalmaz(mod, irany)
// callbacket hívja — a tényleges átváltást a hívó végzi (Pakli.rendezesBeallitasa).
// A Modal alaposztályra épül; a gondolatot JS-ben építi (nincs külön HTML-fájl).
//
// Használják: FoOldal._rendezesMegnyitasa (globális) és a kártya-menük (ág-szűrt).

import Modal from './Modal.js';

// A rendezési módok leírói – egy helyen, hogy a rádiók és a validálás egyezzen
const MODOK = [
  { ertek: 'hierarchikus', ikon: '🌳', felirat: 'Hierarchikus (kapcsolatok szerint)' },
  { ertek: 'ido',          ikon: '🕒', felirat: 'Időrend' },
  { ertek: 'sajatPont',    ikon: '🌟', felirat: 'Saját tudatpont (közvetlen)' },
  { ertek: 'agazatiPont',  ikon: '🌿', felirat: 'Ágazati tudatpont (az egész ág)' }
];

class RendezesModal {

  // ===== KONSTRUKTOR =====
  // @param {string} kontenerAzonosito - a modal konténer ID-ja (pl. 'modal-kontener')
  // @param {Object} beallitasok
  //   - aktualisMod {string}   : az éppen aktív mód (előre kiválasztott rádió)
  //   - aktualisIrany {string} : az éppen aktív irány
  //   - agazatCim {string|null}: ha ág-szűrt (kártya-menüből), a cím a modal fejlécében
  //   - onAlkalmaz {Function}  : (mod, irany) => void — az Alkalmaz gomb hívja
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('RendezesModal.constructor - KEZDÉS', beallitasok);

    this.kontenerAzonosito = kontenerAzonosito;
    this.aktualisMod   = beallitasok.aktualisMod   || 'hierarchikus';
    this.aktualisIrany = beallitasok.aktualisIrany || 'csokkeno';
    this.agazatCim     = beallitasok.agazatCim     || null;
    this.onAlkalmaz    = beallitasok.onAlkalmaz    || null;

    this.modal = null;      // a belső Modal példány
    this._tartalomElem = null;

    console.log('RendezesModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('RendezesModal.init - KEZDÉS');

    this._tartalomElem = this._gondolatEpitese();

    // Ág-szűrt esetben a cím jelzi, melyik ágon belül rendezünk
    const cim = this.agazatCim
      ? `Rendezés ezen az ágon: ${this.agazatCim}`
      : 'Rendezés';

    this.modal = new Modal(this.kontenerAzonosito, {
      cim,
      tartalom: this._tartalomElem,
      meret: 'szuk',
      gombok: [
        { felirat: 'Mégse', tipus: 'masodlagos', akcio: () => this.modal.bezaras() },
        { felirat: 'Alkalmaz', tipus: 'elsodleges', akcio: () => this._alkalmaz() }
      ]
    });

    await this.modal.init();

    // A mód-váltás az irány-csoportot engedélyezi/tiltja (hierarchikusnál nincs irány)
    this._iranyAllapotFrissitese();

    console.log('RendezesModal.init - VÉGE');
  }

  megnyitas() {
    this.modal?.megnyitas();
  }

  // ===== GONDOLAT FELÉPÍTÉSE =====
  _gondolatEpitese() {
    const div = document.createElement('div');
    div.className = 'rendezes-modal';

    const modRadiok = MODOK.map(m => `
      <label class="rendezes-modal__opcio">
        <input type="radio" name="rendezes-mod" value="${m.ertek}"
          ${m.ertek === this.aktualisMod ? 'checked' : ''}>
        <span class="rendezes-modal__ikon" aria-hidden="true">${m.ikon}</span>
        <span>${m.felirat}</span>
      </label>
    `).join('');

    div.innerHTML = `
      <fieldset class="rendezes-modal__csoport">
        <legend class="rendezes-modal__legend">Rendezés</legend>
        ${modRadiok}
      </fieldset>
      <fieldset class="rendezes-modal__csoport rendezes-modal__irany">
        <legend class="rendezes-modal__legend">Sorrend</legend>
        <label class="rendezes-modal__opcio">
          <input type="radio" name="rendezes-irany" value="csokkeno"
            ${this.aktualisIrany === 'csokkeno' ? 'checked' : ''}>
          <span>Csökkenő <small>(legtöbb / legújabb elöl)</small></span>
        </label>
        <label class="rendezes-modal__opcio">
          <input type="radio" name="rendezes-irany" value="novekvo"
            ${this.aktualisIrany === 'novekvo' ? 'checked' : ''}>
          <span>Növekvő <small>(legkevesebb / legrégebbi elöl)</small></span>
        </label>
      </fieldset>
    `;

    // A mód-rádiók változása frissíti az irány-csoport állapotát
    div.querySelectorAll('input[name="rendezes-mod"]').forEach(radio => {
      radio.addEventListener('change', () => this._iranyAllapotFrissitese());
    });

    return div;
  }

  // ===== IRÁNY-CSOPORT ÁLLAPOTA =====
  // Hierarchikus módban az irány nem értelmezhető (a fa-szeletnek saját rendezése van),
  // ezért az irány-csoportot ilyenkor letiltjuk.
  _iranyAllapotFrissitese() {
    if (!this._tartalomElem) return;
    const kivalasztottMod = this._tartalomElem.querySelector('input[name="rendezes-mod"]:checked')?.value;
    const iranyFieldset = this._tartalomElem.querySelector('.rendezes-modal__irany');
    const tiltva = kivalasztottMod === 'hierarchikus';

    iranyFieldset?.classList.toggle('rendezes-modal__irany--tiltva', tiltva);
    iranyFieldset?.querySelectorAll('input').forEach(inp => { inp.disabled = tiltva; });
  }

  // ===== ALKALMAZÁS =====
  _alkalmaz() {
    const mod = this._tartalomElem.querySelector('input[name="rendezes-mod"]:checked')?.value || 'hierarchikus';
    const irany = this._tartalomElem.querySelector('input[name="rendezes-irany"]:checked')?.value || 'csokkeno';

    console.log('RendezesModal._alkalmaz', { mod, irany });

    if (typeof this.onAlkalmaz === 'function') {
      this.onAlkalmaz(mod, irany);
    }
    this.modal.bezaras();
  }
}

export default RendezesModal;
