// frontend/js/components/modals/AdatvedelmiNyilatkozatModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';

// ===== ADATVÉDELMI NYILATKOZAT MODAL =====
// Felelősség: az adatvédelmi nyilatkozat megjelenítése felugró ablakban.
// A bejelentkezés (és regisztráció) oldalon lévő „Adatvédelmi nyilatkozat"
// link nyitja meg. A szöveg statikus HTML-sablon, amit a Modal alaposztály
// `gondolat`-ként jelenít meg. A MeghivoModal template-betöltő mintáját követi,
// a saját (dinamikusan létrehozott) konténerbe (Modal.megerosites mintája),
// hogy a bejelentkezés-oldalon is működjön, ahol csak az #app div van.
class AdatvedelmiNyilatkozatModal {

  constructor() {
    console.log('AdatvedelmiNyilatkozatModal.constructor - KEZDÉS');
    this.modal = null;
    console.log('AdatvedelmiNyilatkozatModal.constructor - VÉGE');
  }

  // ===== MEGNYITÁS =====
  // Betölti a szöveg-sablont, felépíti a modalt egy dedikált konténerben, és megnyitja.
  async megnyitas() {
    console.log('AdatvedelmiNyilatkozatModal.megnyitas - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    const kontenerId = this._kontenerBiztositasa();

    this.modal = new Modal(kontenerId, {
      cim:      'Adatvédelmi nyilatkozat',
      tartalom: tartalomHtml,
      meret:    'szeles',
      gombok: [
        {
          felirat:   'Bezárás',
          tipus:     'masodlagos',
          azonosito: 'adatvedelmi-bezar-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ]
    });

    await this.modal.init();
    this.modal.megnyitas();

    console.log('AdatvedelmiNyilatkozatModal.megnyitas - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/adatvedelmiNyilatkozatModal.html');
      if (!valasz.ok) {
        console.error('AdatvedelmiNyilatkozatModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('AdatvedelmiNyilatkozatModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== SEGÉD: KONTÉNER BIZTOSÍTÁSA =====
  // Saját konténer div a modalnak — ha még nincs a DOM-ban, létrehozzuk
  // (a MeghivoModal _alKontenerBiztositasa / Modal.megerosites mintája).
  _kontenerBiztositasa() {
    const azonosito = 'adatvedelmi-modal-kontener';
    let kontener = document.getElementById(azonosito);
    if (!kontener) {
      kontener = document.createElement('div');
      kontener.id = azonosito;
      document.body.appendChild(kontener);
    }
    return azonosito;
  }
}

// ===== EXPORTÁLÁS =====
export default AdatvedelmiNyilatkozatModal;
