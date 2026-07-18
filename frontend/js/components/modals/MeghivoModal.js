// frontend/js/components/modals/MeghivoModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, apiPost } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// ===== STÁTUSZ → EMBERI SZÖVEG ÉS CSS-MÓDOSÍTÓ =====
const STATUSZ_FELIRAT = {
  Aktiv:       'Aktív',
  Felhasznalt: 'Felhasznált',
  Visszavont:  'Visszavont',
};
const STATUSZ_OSZTALY = {
  Aktiv:       'aktiv',
  Felhasznalt: 'felhasznalt',
  Visszavont:  'visszavont',
};

// ===== MEGHÍVÓIM MODAL =====
// Felelősség: a bejelentkezett e-ember meghívóinak kezelése —
//   1. új meghívó létrehozása (kötelező tanúsító nyilatkozattal),
//   2. a saját meghívók listázása (kód, státusz, felhasználó),
//   3. kód vágólapra másolása,
//   4. aktív meghívó visszavonása (megerősítéssel).
// A meghívó kódját a kibocsátó maga juttatja el a meghívottnak — a rendszer
// nem tárol semmit a még nem regisztrált személyről.
// Használja: a fő menü „Meghívóim" pontja (foOldal.js).
class MeghivoModal {

  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.token - JWT token (opcionális, alapból tokenLekerese)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('MeghivoModal.constructor - KEZDÉS');

    this.kontenerAzonosito = kontenerAzonosito;
    this.token             = beallitasok.token ?? tokenLekerese();

    this.modal = null;

    console.log('MeghivoModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('MeghivoModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      'Meghívóim',
      tartalom: tartalomHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   'Bezárás',
          tipus:     'masodlagos',
          azonosito: 'meghivo-bezar-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ]
    });

    await this.modal.init();

    // Tanúsítás jelölőnégyzet: csak bepipálva aktív az „Új meghívó" gomb
    const tanusitas = document.getElementById('meghivo-tanusitas');
    const ujGomb    = document.getElementById('meghivo-uj-gomb');
    if (tanusitas && ujGomb) {
      tanusitas.addEventListener('change', () => {
        ujGomb.disabled = !tanusitas.checked;
      });
      ujGomb.addEventListener('click', () => this._ujMeghivo());
    }

    // Esemény-delegálás a listán: másolás és visszavonás gombok
    const lista = document.getElementById('meghivo-lista');
    if (lista) {
      lista.addEventListener('click', (esemeny) => {
        const masolGomb = esemeny.target.closest('.meghivo-modal__masol');
        if (masolGomb) {
          this._kodMasolasa(masolGomb.dataset.kod, masolGomb);
          return;
        }
        const visszavonGomb = esemeny.target.closest('.meghivo-modal__visszavon');
        if (visszavonGomb) {
          this._visszavonasMegerositessel(visszavonGomb.dataset.id, visszavonGomb.dataset.kod);
        }
      });
    }

    console.log('MeghivoModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/meghivoModal.html');
      if (!valasz.ok) {
        console.error('MeghivoModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('MeghivoModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  async megnyitas() {
    this.modal?.megnyitas();
    await this._infoBetoltese();
    await this._listaBetoltese();
  }

  bezaras() {
    this.modal?.bezaras();
  }

  // ===== INFO SÁV: KÖTELEZŐ-E MOST A MEGHÍVÓ? =====
  // Őszinte tájékoztatás: ha a kapcsoló ki van kapcsolva, a meghívó nem
  // feltétele a regisztrációnak (fejlesztési időszak).
  async _infoBetoltese() {
    console.log('MeghivoModal._infoBetoltese - KEZDÉS');
    try {
      const valasz = await apiGet('meghivo/kotelezo');
      const info = document.getElementById('meghivo-info');
      if (info) {
        info.textContent = valasz?.kotelezo
          ? 'A regisztráció meghívásos: új e-ember csak érvényes meghívó kóddal csatlakozhat.'
          : 'A meghívó kód jelenleg nem feltétele a regisztrációnak (fejlesztési időszak).';
      }
      console.log('MeghivoModal._infoBetoltese - VÉGE', { kotelezo: valasz?.kotelezo });
    } catch (hiba) {
      // Az info sáv nem kritikus — hiba esetén üresen marad
      console.error('MeghivoModal._infoBetoltese - HIBA', hiba.message);
    }
  }

  // ===== LISTA BETÖLTÉSE =====
  async _listaBetoltese() {
    console.log('MeghivoModal._listaBetoltese - KEZDÉS');

    this.modal.betoltesBeallitasa(true);
    try {
      const valasz = await apiGet('meghivo/sajat', this.token);
      this.modal.betoltesBeallitasa(false);

      this._listaRenderelese(valasz?.meghivok ?? []);

      console.log('MeghivoModal._listaBetoltese - VÉGE', { darab: (valasz?.meghivok ?? []).length });
    } catch (hiba) {
      console.error('MeghivoModal._listaBetoltese - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A meghívók betöltése sikertelen.');
    }
  }

  // ===== LISTA RENDERELÉSE =====
  _listaRenderelese(meghivok) {
    const lista = document.getElementById('meghivo-lista');
    if (!lista) return;

    if (meghivok.length === 0) {
      lista.innerHTML = '<p class="meghivo-modal__ures">Még nem hoztál létre meghívót.</p>';
      return;
    }

    lista.innerHTML = meghivok.map((m) => this._elemHtml(m)).join('');
  }

  // ===== EGY MEGHÍVÓ-SOR HTML =====
  _elemHtml(meghivo) {
    const statuszFelirat = STATUSZ_FELIRAT[meghivo.statusz] ?? meghivo.statusz;
    const statuszOsztaly = STATUSZ_OSZTALY[meghivo.statusz] ?? 'aktiv';

    // Felhasznált meghívónál mutatjuk, KI regisztrált vele (eemberNev nyilvános)
    const felhasznaloResz = meghivo.felhasznaloEemberId?.eemberNev
      ? `<span class="meghivo-modal__felhasznalo">→ ${this._escape(meghivo.felhasznaloEemberId.eemberNev)}</span>`
      : '';

    // Csak aktív meghívónál van másolás + visszavonás gomb
    const akciok = meghivo.statusz === 'Aktiv'
      ? `<button type="button" class="meghivo-modal__masol" data-kod="${meghivo.kod}" title="Kód másolása">📋</button>
         <button type="button" class="meghivo-modal__visszavon" data-id="${meghivo._id}" data-kod="${meghivo.kod}" title="Visszavonás">🗑️</button>`
      : '';

    return `
      <div class="meghivo-modal__elem">
        <span class="meghivo-modal__kod">${meghivo.kod}</span>
        <span class="meghivo-modal__statusz meghivo-modal__statusz--${statuszOsztaly}">${statuszFelirat}</span>
        <span class="meghivo-modal__ido">${this._idoSzoveg(meghivo.letrehozva)}</span>
        ${felhasznaloResz}
        <span class="meghivo-modal__akciok">${akciok}</span>
      </div>`;
  }

  // ===== ÚJ MEGHÍVÓ LÉTREHOZÁSA =====
  async _ujMeghivo() {
    console.log('MeghivoModal._ujMeghivo - KEZDÉS');

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);
    try {
      await apiPost('meghivo', { tanusitva: true }, this.token);
      this.modal.betoltesBeallitasa(false);

      // A nyilatkozatot minden meghívóhoz ÚJRA el kell fogadni — visszaállítjuk
      const tanusitas = document.getElementById('meghivo-tanusitas');
      const ujGomb    = document.getElementById('meghivo-uj-gomb');
      if (tanusitas) tanusitas.checked = false;
      if (ujGomb)    ujGomb.disabled   = true;

      await this._listaBetoltese();

      console.log('MeghivoModal._ujMeghivo - VÉGE (siker)');
    } catch (hiba) {
      console.error('MeghivoModal._ujMeghivo - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A meghívó létrehozása sikertelen.');
    }
  }

  // ===== KÓD MÁSOLÁSA VÁGÓLAPRA =====
  async _kodMasolasa(kod, gombElem) {
    console.log('MeghivoModal._kodMasolasa - KEZDÉS', { kod });
    try {
      await navigator.clipboard.writeText(kod);
      // Rövid vizuális visszajelzés a gombon
      const eredeti = gombElem.textContent;
      gombElem.textContent = '✅';
      setTimeout(() => { gombElem.textContent = eredeti; }, 1500);
    } catch (hiba) {
      console.error('MeghivoModal._kodMasolasa - HIBA', hiba.message);
      this.modal.hibaBeallitasa('A vágólapra másolás nem sikerült — jegyezd fel a kódot kézzel.');
    }
  }

  // ===== VISSZAVONÁS MEGERŐSÍTÉSSEL =====
  // A megerősítő al-modal a dinamikusan biztosított almodal-kontener-be kerül
  // (a HozzajarulokModal mintája), így nem írja felül a Meghívóim modalt.
  async _visszavonasMegerositessel(meghivoId, kod) {
    console.log('MeghivoModal._visszavonasMegerositessel - KEZDÉS', { meghivoId });

    const alKontenerId = this._alKontenerBiztositasa();
    await Modal.megerosites(
      alKontenerId,
      `Biztosan visszavonod a(z) ${kod} meghívót? A kóddal ezután nem lehet regisztrálni.`,
      () => this._visszavonas(meghivoId)
    );
  }

  async _visszavonas(meghivoId) {
    console.log('MeghivoModal._visszavonas - KEZDÉS', { meghivoId });

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);
    try {
      await apiPost(`meghivo/${meghivoId}/visszavonas`, {}, this.token);
      this.modal.betoltesBeallitasa(false);

      await this._listaBetoltese();

      console.log('MeghivoModal._visszavonas - VÉGE (siker)');
    } catch (hiba) {
      console.error('MeghivoModal._visszavonas - HIBA', hiba.message);
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(hiba.message ?? 'A visszavonás sikertelen.');
    }
  }

  // ===== SEGÉD: AL-MODAL KONTÉNER BIZTOSÍTÁSA =====
  // A megerősítő modalnak saját konténer div kell — ha még nincs a DOM-ban,
  // létrehozzuk (a HozzajarulokModal _kontenerBiztositasa mintája).
  _alKontenerBiztositasa() {
    const azonosito = 'almodal-kontener';
    let kontener = document.getElementById(azonosito);
    if (!kontener) {
      kontener = document.createElement('div');
      kontener.id = azonosito;
      document.body.appendChild(kontener);
    }
    return azonosito;
  }

  // ===== SEGÉD: IDŐ SZÖVEG =====
  _idoSzoveg(idopont) {
    if (!idopont) return '';
    const d = new Date(idopont);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('hu-HU');
  }

  // ===== SEGÉD: HTML-ESCAPE (az eemberNev felhasználói adat) =====
  _escape(szoveg) {
    return String(szoveg)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// ===== EXPORTÁLÁS =====
export default MeghivoModal;
