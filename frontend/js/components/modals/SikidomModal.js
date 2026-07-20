// frontend/js/components/modals/SikidomModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import { sikidomElrendezes } from '../../utils/sikidomElrendezes.js';
import { sikidomLeiro, sokszogPontok } from '../../utils/sikidomFormak.js';

// SVG névtér az elemek létrehozásához
const SVG_NS = 'http://www.w3.org/2000/svg';

// ===== HANGOLÓ ÁLLANDÓK =====
const MAX_CSOMOPONT      = 500;  // a backendtől kért csomópont-plafon (1. lépés)
const MIN_CIMKE_PX       = 16;   // ekkora látszó sugár felett jelenik meg a felirat
const CIM_MAX_HOSSZ      = 22;   // a feliratban ennyi karakter, utána „…"
const ZOOM_LEPES         = 1.2;  // a ＋/－ gombok és a görgetés zoom-szorzója
const MAX_ZOOM           = 20000; // mély zoom megengedett (1. lépésben statikus)
const KATTINTAS_KUSZOB   = 5;    // px — ennél nagyobb elmozdulás húzás, nem kattintás

// ===== SÍKIDOM NÉZET MODAL =====
// Felelősség: a Síkidom nézet — a koino_1.0 fraktál kör-pakolásának újraépítése.
// 1. LÉPÉS (statikus): a backend /api/sikidom végpontról lekért részfát (aktív
// gyökér + a legnagyobb effektív méretű leszármazottak) napraforgó-spirállal,
// egymásba ágyazva, entitástípus-formákkal rajzolja ki; sima zoom/pan; síkidomra
// koppintva a pakli odanavigál. MÉG NINCS dinamikus felfedés / drill-down (2. lépés).
//
// Rajzolás: egyetlen SVG. A .sikidom-vilag csoport kapja a világ-transzformációt
// (a formák vele zoomolnak, a vonalvastagság non-scaling-stroke-kal fix marad);
// a feliratok külön, képernyő-koordinátában, csak a elég nagynak látszó
// síkidomokra (a torzulás és a zsúfoltság elkerülésére).
// Használja: a fő menü „Síkidom nézet" pontja (foOldal.js).
class SikidomModal {

  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.token                  - JWT token (opcionális)
  // @param {string} beallitasok.gyoker                 - a nézet gyökere (opcionális; null → legerősebb)
  // @param {string} beallitasok.aktualisEntitasId      - a kiemelt entitás (opcionális)
  // @param {string} beallitasok.cim                    - a modal címe (alapból „Síkidom nézet")
  // @param {Function} beallitasok.onEntitasKivalasztas - (entitasId, entitasTipus) navigáláshoz
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('SikidomModal.constructor - KEZDÉS', {
      gyoker: beallitasok.gyoker,
      aktualisEntitasId: beallitasok.aktualisEntitasId
    });

    this.kontenerAzonosito    = kontenerAzonosito;
    this.token                = beallitasok.token ?? tokenLekerese();
    this.gyoker               = beallitasok.gyoker ?? null;
    this.cimFelirat           = beallitasok.cim ?? 'Síkidom nézet';
    this.aktualisEntitasId    = beallitasok.aktualisEntitasId
      ? beallitasok.aktualisEntitasId.toString()
      : null;
    this.onEntitasKivalasztas = beallitasok.onEntitasKivalasztas ?? null;

    this.modal = null;

    // Elrendezett csomópontok (vilagX/Y/Sugar-ral) + befoglaló doboz
    this.csomopontok = [];
    this.befoglalo = null;

    // Világ → képernyő transzformáció
    this.nezet = { skala: 1, eltolasX: 0, eltolasY: 0 };
    this._minimalisSkala = 0.01;

    // Esemény-állapot (pan/zoom/kattintás)
    this._huzasAktiv = false;
    this._huzasKezdet = null;
    this._huzasTavolsag = 0;
    this._ablakMeretezoBound = null;
    this._rajzolasKeres = false;

    console.log('SikidomModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('SikidomModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      this.cimFelirat,
      tartalom: tartalomHtml,
      meret:    'teljes',
      gombok:   [],
      onBezaras: () => {
        if (this._ablakMeretezoBound) {
          window.removeEventListener('resize', this._ablakMeretezoBound);
          this._ablakMeretezoBound = null;
        }
      }
    });

    await this.modal.init();

    // Vezérlő gombok
    document.getElementById('sikidom-zoom-be-gomb')
      ?.addEventListener('click', () => this._zoomKozeppontra(ZOOM_LEPES));
    document.getElementById('sikidom-zoom-ki-gomb')
      ?.addEventListener('click', () => this._zoomKozeppontra(1 / ZOOM_LEPES));
    document.getElementById('sikidom-illesztes-gomb')
      ?.addEventListener('click', () => this._illesztes());

    // Pan/zoom/kattintás
    this._nezetEsemenyekBekotese();

    console.log('SikidomModal.init - VÉGE');
  }

  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/sikidomModal.html');
      if (!valasz.ok) {
        console.error('SikidomModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('SikidomModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  async megnyitas() {
    console.log('SikidomModal.megnyitas - KEZDÉS');
    this.modal?.megnyitas();
    this._nezetValtas('betoltes');
    await this._adatBetoltesEsRajzolas();
  }

  bezaras() { this.modal?.bezaras(); }

  // Nézet-váltás: 'betoltes' | 'nezet'
  _nezetValtas(melyik) {
    document.getElementById('sikidom-betoltes')?.toggleAttribute('hidden', melyik !== 'betoltes');
    document.getElementById('sikidom-nezet')?.toggleAttribute('hidden', melyik !== 'nezet');
  }

  // ===== ADATBETÖLTÉS + ELRENDEZÉS + RAJZOLÁS =====
  async _adatBetoltesEsRajzolas() {
    console.log('SikidomModal._adatBetoltesEsRajzolas - KEZDÉS', { gyoker: this.gyoker });

    try {
      const gyokerResz = this.gyoker ? `&gyoker=${this.gyoker}` : '';
      const valasz = await apiGet(`sikidom?maxCsomopont=${MAX_CSOMOPONT}${gyokerResz}`, this.token);

      const nyersCsomopontok = valasz?.csomopontok ?? [];
      if (nyersCsomopontok.length === 0) {
        this._uresAllapot();
        return;
      }

      // Elrendezés (napraforgó-spirál, containment) — a gyökér a válasz gyoker-je
      const elrendezve = sikidomElrendezes(nyersCsomopontok, valasz?.gyoker?.entitasId ?? this.gyoker);
      this.csomopontok = elrendezve.csomopontok;
      this.befoglalo = elrendezve.befoglalo;

      // Rajzolási sorrend: NAGY hátra, kicsi előre (a beágyazott kicsik kattinthatók
      // maradnak, a szülő mögöttük van)
      this.csomopontok.sort((a, b) => b.vilagSugar - a.vilagSugar);

      this._nezetValtas('nezet');
      this._vilagFelepitese();
      this._illesztes();

      if (!this._ablakMeretezoBound) {
        this._ablakMeretezoBound = () => this._rajzolas();
        window.addEventListener('resize', this._ablakMeretezoBound);
      }

      console.log('SikidomModal._adatBetoltesEsRajzolas - VÉGE', {
        csomopontokSzama: this.csomopontok.length
      });
    } catch (hiba) {
      console.error('SikidomModal._adatBetoltesEsRajzolas - HIBA', hiba.message);
      this.modal?.hibaBeallitasa(hiba.message ?? 'A síkidom nézet betöltése sikertelen.');
    }
  }

  _uresAllapot() {
    const szoveg = document.getElementById('sikidom-betoltes-szoveg');
    if (szoveg) szoveg.textContent = 'Még nincs megjeleníthető entitás.';
  }

  // ===== SVG VILÁG FELÉPÍTÉSE (egyszer, elrendezés után) =====
  // A síkidom-formákat a .sikidom-vilag csoportba építi (world-koordinátában).
  // A feliratokat NEM itt, hanem képernyő-koordinátában a _cimkekFrissitese teszi.
  _vilagFelepitese() {
    const vilag = document.getElementById('sikidom-vilag');
    if (!vilag) return;
    vilag.innerHTML = '';

    for (const csp of this.csomopontok) {
      const leiro = sikidomLeiro(csp.entitasTipus);
      let alakzat;

      if (leiro.forma === 'kor') {
        alakzat = document.createElementNS(SVG_NS, 'circle');
        alakzat.setAttribute('cx', csp.vilagX.toFixed(3));
        alakzat.setAttribute('cy', csp.vilagY.toFixed(3));
        alakzat.setAttribute('r', csp.vilagSugar.toFixed(3));
      } else {
        alakzat = document.createElementNS(SVG_NS, 'polygon');
        alakzat.setAttribute('points', sokszogPontok(
          csp.vilagX, csp.vilagY, csp.vilagSugar, leiro.oldalak, leiro.kezdoSzogFok
        ));
      }

      const aktualisE = this.aktualisEntitasId && csp.kulcs === this.aktualisEntitasId;
      alakzat.setAttribute('class', `sikidom-alakzat${aktualisE ? ' sikidom-alakzat--aktualis' : ''}`);
      alakzat.setAttribute('fill', leiro.szin);
      alakzat.setAttribute('stroke', leiro.szin);
      alakzat.setAttribute('data-entitas-id', csp.entitasId);
      alakzat.setAttribute('data-entitas-tipus', csp.entitasTipus);

      vilag.appendChild(alakzat);
    }
  }

  // ===== KEZDŐ ILLESZTÉS (a teljes elrendezés a képernyőre) =====
  _illesztes() {
    const nezetElem = document.getElementById('sikidom-nezet');
    if (!nezetElem || !this.befoglalo) return;

    const margo = 60;
    const szelesseg = this.befoglalo.maxX - this.befoglalo.minX;
    const magassag = this.befoglalo.maxY - this.befoglalo.minY;

    const skalaX = (nezetElem.clientWidth - 2 * margo) / Math.max(0.0001, szelesseg);
    const skalaY = (nezetElem.clientHeight - 2 * margo) / Math.max(0.0001, magassag);
    const skala = Math.min(skalaX, skalaY);

    this.nezet.skala = skala;
    this._minimalisSkala = skala * 0.5;

    const kozepX = (this.befoglalo.minX + this.befoglalo.maxX) / 2;
    const kozepY = (this.befoglalo.minY + this.befoglalo.maxY) / 2;
    this.nezet.eltolasX = nezetElem.clientWidth / 2 - kozepX * skala;
    this.nezet.eltolasY = nezetElem.clientHeight / 2 - kozepY * skala;

    this._rajzolas();
  }

  // ===== RAJZOLÁS (transzform alkalmazása + feliratok frissítése) =====
  _rajzolas() {
    this._rajzolasKeres = false;
    const vilag = document.getElementById('sikidom-vilag');
    if (!vilag) return;

    const { skala, eltolasX, eltolasY } = this.nezet;
    vilag.setAttribute('transform', `translate(${eltolasX} ${eltolasY}) scale(${skala})`);

    this._cimkekFrissitese();
  }

  _rajzolasKerese() {
    if (this._rajzolasKeres) return;
    this._rajzolasKeres = true;
    requestAnimationFrame(() => this._rajzolas());
  }

  // ===== FELIRATOK (képernyő-koordinátában, csak az elég nagyoknak) =====
  _cimkekFrissitese() {
    const cimkek = document.getElementById('sikidom-cimkek');
    const nezetElem = document.getElementById('sikidom-nezet');
    if (!cimkek || !nezetElem) return;

    const { skala, eltolasX, eltolasY } = this.nezet;
    const szelesseg = nezetElem.clientWidth;
    const magassag = nezetElem.clientHeight;

    const darabok = [];
    for (const csp of this.csomopontok) {
      const latszoSugar = csp.vilagSugar * skala;
      if (latszoSugar < MIN_CIMKE_PX) continue; // túl kicsi → nincs felirat

      const kepX = csp.vilagX * skala + eltolasX;
      const kepY = csp.vilagY * skala + eltolasY;
      // Képernyőn kívüli → kihagyás
      if (kepX < -50 || kepX > szelesseg + 50 || kepY < -50 || kepY > magassag + 50) continue;

      const leiro = sikidomLeiro(csp.entitasTipus);
      const teljes = csp.cim ?? leiro.nev;
      const rovid = teljes.length > CIM_MAX_HOSSZ ? `${teljes.slice(0, CIM_MAX_HOSSZ)}…` : teljes;
      const betuMeret = Math.max(10, Math.min(20, latszoSugar * 0.35));

      darabok.push(
        `<text class="sikidom-cimke" x="${kepX.toFixed(1)}" y="${kepY.toFixed(1)}" ` +
        `font-size="${betuMeret.toFixed(1)}">${this._escape(rovid)}</text>`
      );
    }

    cimkek.innerHTML = darabok.join('');
  }

  // ===== PAN / ZOOM / KATTINTÁS =====
  _nezetEsemenyekBekotese() {
    const nezetElem = document.getElementById('sikidom-nezet');
    if (!nezetElem) return;

    nezetElem.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.sikidom-modal__vezerlok')) return;
      this._huzasAktiv = true;
      this._huzasTavolsag = 0;
      this._huzasKezdet = {
        x: e.clientX, y: e.clientY,
        eltolasX: this.nezet.eltolasX, eltolasY: this.nezet.eltolasY
      };
      nezetElem.setPointerCapture(e.pointerId);
    });

    nezetElem.addEventListener('pointermove', (e) => {
      if (!this._huzasAktiv || !this._huzasKezdet) return;
      const dx = e.clientX - this._huzasKezdet.x;
      const dy = e.clientY - this._huzasKezdet.y;
      this._huzasTavolsag = Math.max(this._huzasTavolsag, Math.abs(dx) + Math.abs(dy));
      this.nezet.eltolasX = this._huzasKezdet.eltolasX + dx;
      this.nezet.eltolasY = this._huzasKezdet.eltolasY + dy;
      this._rajzolasKerese();
    });

    nezetElem.addEventListener('pointerup', (e) => {
      const kattintasVolt = this._huzasAktiv && this._huzasTavolsag <= KATTINTAS_KUSZOB;
      this._huzasAktiv = false;
      this._huzasKezdet = null;
      if (!kattintasVolt) return;

      const alakzat = e.target.closest('.sikidom-alakzat');
      if (alakzat) {
        this._alakzatKattintas(alakzat.dataset.entitasId, alakzat.dataset.entitasTipus);
      }
    });

    nezetElem.addEventListener('wheel', (e) => {
      e.preventDefault();
      const szorzo = e.deltaY < 0 ? ZOOM_LEPES : 1 / ZOOM_LEPES;
      const teglalap = nezetElem.getBoundingClientRect();
      this._zoom(szorzo, e.clientX - teglalap.left, e.clientY - teglalap.top);
    }, { passive: false });
  }

  // Zoom egy képernyő-pontra központosítva (a pont a helyén marad)
  _zoom(szorzo, kozepX, kozepY) {
    const ujSkala = Math.min(MAX_ZOOM, Math.max(this._minimalisSkala, this.nezet.skala * szorzo));
    const tenylegesSzorzo = ujSkala / this.nezet.skala;
    if (tenylegesSzorzo === 1) return;
    this.nezet.eltolasX = kozepX - (kozepX - this.nezet.eltolasX) * tenylegesSzorzo;
    this.nezet.eltolasY = kozepY - (kozepY - this.nezet.eltolasY) * tenylegesSzorzo;
    this.nezet.skala = ujSkala;
    this._rajzolasKerese();
  }

  _zoomKozeppontra(szorzo) {
    const nezetElem = document.getElementById('sikidom-nezet');
    if (!nezetElem) return;
    this._zoom(szorzo, nezetElem.clientWidth / 2, nezetElem.clientHeight / 2);
  }

  // ===== SÍKIDOMRA KATTINTÁS: NAVIGÁLÁS =====
  _alakzatKattintas(entitasId, entitasTipus) {
    console.log('SikidomModal._alakzatKattintas - KEZDÉS', { entitasId, entitasTipus });
    this.bezaras();
    if (typeof this.onEntitasKivalasztas === 'function' && entitasId && entitasTipus) {
      this.onEntitasKivalasztas(entitasId.toString(), entitasTipus);
    }
  }

  // ===== SEGÉD: HTML/SVG-ESCAPE (a cím felhasználói adat) =====
  _escape(szoveg) {
    return String(szoveg)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// ===== EXPORTÁLÁS =====
export default SikidomModal;
