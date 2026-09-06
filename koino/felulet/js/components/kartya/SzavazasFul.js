// frontend/js/components/kartya/SzavazasFul.js

// --- IMPORTOK ---
import { apiGet, apiPost, apiDelete } from '../../utils/apiHelper.js';

// A szavazat-típusok emberi feliratai (a backend enum értékeihez).
// Egy helyen tartjuk, hogy a gombok és az üzenetek egységesek legyenek.
const SZAVAZAT_FELIRATOK = {
  Tamogat:     'Támogatom',
  Ellenez:     'Ellenzem',
  Tartozkodik: 'Tartózkodom'
};

// =============================================
// SZAVAZÁS FÜL
// =============================================
// Felelősség:
// - A Javaslat-kártya „Szavazás" fülének gondolata: a három szavazó gomb
//   (Támogatom / Ellenzem / Tartózkodom) + visszavonás + állapot/hiba üzenet.
// - A SzavazatModal-lal AZONOS backend-végpontokat használja:
//     GET    javaslat/:id/sajat-szavazat   → a saját korábbi szavazat
//     POST   javaslat/szavazat             → leadás / módosítás
//     DELETE javaslat/szavazat             → visszavonás
// - A modáltól eltérően a gombok AZONNAL hatnak (nincs külön „Rendben" lépés),
//   mert ez a felhasználó SAJÁT, bármikor visszavonható szavazata. Szavazás után
//   NEM töltjük újra a paklit (a kártya nem ugrik vissza az 1. fülre); a fejléc
//   arányait a cron frissíti kb. 1 percen belül.
//
// Használat:
//   const szavazasFul = new SzavazasFul(kontener, {
//     javaslatId, token, szavazhat, tiltvaIndok
//   });
//   szavazasFul.betoltes();   // a saját szavazat lekérése + kiemelés (async)
// =============================================

class SzavazasFul {

  // ----- KONSTRUKTOR -----
  // @param {HTMLElement} kontener - A befogadó elem (a fül panelje)
  // @param {Object} beallitasok
  // @param {string}  beallitasok.javaslatId  - A javaslat azonosítója
  // @param {string}  beallitasok.token       - Auth token
  // @param {boolean} beallitasok.szavazhat   - Jogosult-e szavazni (backend számolta)
  // @param {string}  [beallitasok.tiltvaIndok] - Ha nem jogosult, ezt jelezzük
  constructor(kontener, beallitasok = {}) {
    console.log('SzavazasFul.constructor - KEZDÉS', {
      javaslatId: beallitasok.javaslatId,
      szavazhat:  beallitasok.szavazhat
    });

    this.kontener    = kontener;
    this.javaslatId  = beallitasok.javaslatId ?? null;
    this.token       = beallitasok.token ?? null;
    this.szavazhat   = beallitasok.szavazhat === true;
    this.tiltvaIndok = beallitasok.tiltvaIndok ?? 'Ehhez az érintett gondolaton kell tudatpont.';

    // A szerveren tárolt saját szavazat ('Tamogat' | 'Ellenez' | 'Tartozkodik' | null)
    this.jelenlegiSzavazat = null;

    // KÜLÖNVÁLÁSI SZÁNDÉK: kér-e külön ágat, ha a döntés nem az ő álláspontját követi.
    // Tartózkodásnál mindig hamis (a tartózkodó a főágon marad) — ezt a backend is
    // kikényszeríti. Lásd: megismeres/18-kulonvalas.md
    this.kulonvalasIgeny = false;

    // DOM-referenciák (a _felepites tölti ki)
    this.gombok         = {};   // { Tamogat: <button>, ... }
    this.visszavonasGomb = null;
    this.uzenetElem     = null;
    this.kulonvalasBlokk  = null;   // a kérdés konténere (rejthető)
    this.kulonvalasJelolo = null;   // maga a jelölőnégyzet

    this._felepites();

    console.log('SzavazasFul.constructor - VÉGE', { javaslatId: this.javaslatId });
  }

  // ----- DOM FELÉPÍTÉSE -----
  _felepites() {
    console.log('SzavazasFul._felepites - KEZDÉS');

    this.kontener.classList.add('szavazas-ful');

    // --- Bevezető ---
    const bevezeto = document.createElement('p');
    bevezeto.className   = 'szavazas-ful__bevezeto';
    bevezeto.textContent = this.szavazhat
      ? 'Hogyan döntesz erről a javaslatról? A szavazatodat később bármikor megváltoztathatod.'
      : this.tiltvaIndok;
    this.kontener.appendChild(bevezeto);

    // --- Gombok ---
    const gombokKontener = document.createElement('div');
    gombokKontener.className = 'szavazas-ful__gombok';

    const gombDefiniciok = [
      { tipus: 'Tamogat',     ikon: '✔️', modifier: 'tamogat' },
      { tipus: 'Ellenez',     ikon: '❌', modifier: 'ellenez' },
      { tipus: 'Tartozkodik', ikon: '➖', modifier: 'tartozkodik' }
    ];

    gombDefiniciok.forEach((def) => {
      const gomb = document.createElement('button');
      gomb.type = 'button';
      gomb.className = `szavazas-ful__gomb szavazas-ful__gomb--${def.modifier}`;
      gomb.dataset.szavazat = def.tipus;
      gomb.disabled = !this.szavazhat;

      const ikon = document.createElement('span');
      ikon.className = 'szavazas-ful__gomb-ikon';
      ikon.setAttribute('aria-hidden', 'true');
      ikon.textContent = def.ikon;

      const felirat = document.createElement('span');
      felirat.className = 'szavazas-ful__gomb-felirat';
      felirat.textContent = SZAVAZAT_FELIRATOK[def.tipus];

      gomb.appendChild(ikon);
      gomb.appendChild(felirat);

      // Azonnali szavazás a gombra (a kártyát ne válassza ki: stopPropagation)
      gomb.addEventListener('click', (e) => {
        e.stopPropagation();
        this._szavazas(def.tipus);
      });

      this.gombok[def.tipus] = gomb;
      gombokKontener.appendChild(gomb);
    });

    this.kontener.appendChild(gombokKontener);

    // --- KÜLÖNVÁLÁSI SZÁNDÉK ---
    // Csak Támogatom / Ellenzem mellett látszik: aki tartózkodik, nem foglalt állást,
    // tehát a főágon marad. A pipa — a gombokhoz hasonlóan — AZONNAL hat: újraküldi a
    // szavazatot a módosított szándékkal.
    this.kulonvalasBlokk = document.createElement('div');
    this.kulonvalasBlokk.className = 'szavazas-ful__kulonvalas';
    this.kulonvalasBlokk.hidden = true;

    const kulonvalasSor = document.createElement('label');
    kulonvalasSor.className = 'szavazas-ful__kulonvalas-sor';

    this.kulonvalasJelolo = document.createElement('input');
    this.kulonvalasJelolo.type = 'checkbox';
    this.kulonvalasJelolo.className = 'szavazas-ful__kulonvalas-jelolo';
    this.kulonvalasJelolo.addEventListener('click', (e) => e.stopPropagation()); // a kártya ne váltson
    this.kulonvalasJelolo.addEventListener('change', () => this._kulonvalasValtozott());

    const kulonvalasKerdes = document.createElement('span');
    kulonvalasKerdes.className   = 'szavazas-ful__kulonvalas-kerdes';
    kulonvalasKerdes.textContent = 'Ha a döntés nem a te álláspontodat követi, szeretnél külön ágat?';

    kulonvalasSor.appendChild(this.kulonvalasJelolo);
    kulonvalasSor.appendChild(kulonvalasKerdes);
    // A címkére kattintás is a jelölőnégyzetet billenti — ne váltson kártyát
    kulonvalasSor.addEventListener('click', (e) => e.stopPropagation());
    this.kulonvalasBlokk.appendChild(kulonvalasSor);

    const kulonvalasMagyarazat = document.createElement('p');
    kulonvalasMagyarazat.className   = 'szavazas-ful__kulonvalas-magyarazat';
    kulonvalasMagyarazat.textContent =
      'Így a te álláspontod szerinti változat külön ágon élne tovább — a tudatpontoddal ' +
      'együtt, a másik ágra mutató hivatkozással. Senki nem veszít, csak külön útra lép.';
    this.kulonvalasBlokk.appendChild(kulonvalasMagyarazat);

    this.kontener.appendChild(this.kulonvalasBlokk);

    // --- Visszavonás gomb (csak ha van szerveren tárolt szavazat) ---
    this.visszavonasGomb = document.createElement('button');
    this.visszavonasGomb.type = 'button';
    this.visszavonasGomb.className = 'szavazas-ful__visszavonas-gomb';
    this.visszavonasGomb.textContent = 'Szavazat visszavonása';
    this.visszavonasGomb.hidden = true;
    this.visszavonasGomb.addEventListener('click', (e) => {
      e.stopPropagation();
      this._visszavonas();
    });
    this.kontener.appendChild(this.visszavonasGomb);

    // --- Állapot / hiba üzenet ---
    this.uzenetElem = document.createElement('p');
    this.uzenetElem.className = 'szavazas-ful__uzenet';
    this.kontener.appendChild(this.uzenetElem);

    console.log('SzavazasFul._felepites - VÉGE');
  }

  // ----- SAJÁT SZAVAZAT BETÖLTÉSE -----
  // Lekéri a korábbi szavazatot és kiemeli a megfelelő gombot.
  async betoltes() {
    console.log('SzavazasFul.betoltes - KEZDÉS', { javaslatId: this.javaslatId });

    if (!this.javaslatId) return;

    try {
      const valasz = await apiGet(`javaslat/${this.javaslatId}/sajat-szavazat`, this.token);
      // A data null, ha még nem szavazott
      this.jelenlegiSzavazat = valasz?.data?.szavazatTipus ?? null;
      // Régi szavazatoknál a mező hiányzik → hamis
      this.kulonvalasIgeny = !!valasz?.data?.kulonvalasIgeny;
      this._allapotFrissitese();

      console.log('SzavazasFul.betoltes - VÉGE', {
        jelenlegiSzavazat: this.jelenlegiSzavazat,
        kulonvalasIgeny:   this.kulonvalasIgeny
      });
    } catch (hiba) {
      // A korábbi szavazat lekérése nem kritikus: a szavazás enélkül is működik,
      // csak a kiemelés marad el kezdetben.
      console.error('SzavazasFul.betoltes - HIBA', hiba.message);
    }
  }

  // ----- SZAVAZÁS (leadás / módosítás) -----
  // @param {string} tipus - 'Tamogat' | 'Ellenez' | 'Tartozkodik'
  async _szavazas(tipus) {
    console.log('SzavazasFul._szavazas - KEZDÉS', { tipus });

    if (!this.szavazhat) return;

    // Ha már ez a szavazata, nincs teendő
    if (tipus === this.jelenlegiSzavazat) {
      console.log('SzavazasFul._szavazas - VÉGE (már ez a szavazat)');
      return;
    }

    this._gombokTiltasa(true);
    this._uzenet('', 'semleges');

    // Tartózkodásra váltva a különválási szándék elesik (a backend is ezt teszi)
    const kuldendoIgeny = tipus === 'Tartozkodik' ? false : this.kulonvalasIgeny;

    try {
      await apiPost('javaslat/szavazat', {
        javaslatId:      this.javaslatId,
        szavazatTipus:   tipus,
        kulonvalasIgeny: kuldendoIgeny
      }, this.token);

      this.jelenlegiSzavazat = tipus;
      this.kulonvalasIgeny   = kuldendoIgeny;
      this._allapotFrissitese();
      this._uzenet(`A szavazatod elmentve: ${SZAVAZAT_FELIRATOK[tipus]}.`, 'siker');

      console.log('SzavazasFul._szavazas - VÉGE: sikeres', { tipus, kuldendoIgeny });
    } catch (hiba) {
      console.error('SzavazasFul._szavazas - HIBA', hiba.message);
      this._uzenet(hiba.message ?? 'A szavazat mentése sikertelen.', 'hiba');
    } finally {
      this._gombokTiltasa(false);
    }
  }

  // ----- A KÜLÖNVÁLÁSI SZÁNDÉK MEGVÁLTOZOTT -----
  // A pipa azonnal hat: újraküldjük a MEGLÉVŐ szavazatot a módosított szándékkal.
  // (A backend a `kulonvalasIgeny`-t minden leadáskor felülírja a beérkező értékkel.)
  async _kulonvalasValtozott() {
    const ujIgeny = this.kulonvalasJelolo.checked;
    console.log('SzavazasFul._kulonvalasValtozott - KEZDÉS', { ujIgeny });

    // Szavazat nélkül nincs mihez kötni a szándékot (a blokk ilyenkor rejtve is van)
    if (!this.szavazhat || !this.jelenlegiSzavazat) {
      this.kulonvalasJelolo.checked = false;
      return;
    }

    this._gombokTiltasa(true);
    this._uzenet('', 'semleges');

    try {
      await apiPost('javaslat/szavazat', {
        javaslatId:      this.javaslatId,
        szavazatTipus:   this.jelenlegiSzavazat,   // a szavazat NEM változik
        kulonvalasIgeny: ujIgeny
      }, this.token);

      this.kulonvalasIgeny = ujIgeny;
      this._uzenet(
        ujIgeny
          ? 'Elmentve: ha a döntés nem a te álláspontodat követi, külön ágat kapsz.'
          : 'Elmentve: nem kérsz külön ágat.',
        'siker'
      );

      console.log('SzavazasFul._kulonvalasValtozott - VÉGE: sikeres', { ujIgeny });
    } catch (hiba) {
      console.error('SzavazasFul._kulonvalasValtozott - HIBA', hiba.message);
      // Vissza a korábbi állapotra, hogy a pipa ne hazudjon
      this.kulonvalasJelolo.checked = this.kulonvalasIgeny;
      this._uzenet(hiba.message ?? 'A módosítás mentése sikertelen.', 'hiba');
    } finally {
      this._gombokTiltasa(false);
    }
  }

  // ----- VISSZAVONÁS -----
  async _visszavonas() {
    console.log('SzavazasFul._visszavonas - KEZDÉS');

    if (!this.szavazhat || !this.jelenlegiSzavazat) return;

    this._gombokTiltasa(true);
    this._uzenet('', 'semleges');

    try {
      await apiDelete('javaslat/szavazat', {
        javaslatId: this.javaslatId
      }, this.token);

      this.jelenlegiSzavazat = null;
      this.kulonvalasIgeny   = false;   // szavazat nélkül nincs különválási szándék
      this._allapotFrissitese();
      this._uzenet('A szavazatod visszavonva.', 'siker');

      console.log('SzavazasFul._visszavonas - VÉGE: sikeres');
    } catch (hiba) {
      console.error('SzavazasFul._visszavonas - HIBA', hiba.message);
      this._uzenet(hiba.message ?? 'A visszavonás sikertelen.', 'hiba');
    } finally {
      this._gombokTiltasa(false);
    }
  }

  // ----- ÁLLAPOT FRISSÍTÉSE (kiemelés + visszavonás gomb + alap üzenet) -----
  _allapotFrissitese() {
    // Gomb-kiemelés a jelenlegi szavazat szerint
    Object.entries(this.gombok).forEach(([tipus, gomb]) => {
      const aktiv = tipus === this.jelenlegiSzavazat;
      gomb.classList.toggle('szavazas-ful__gomb--kivalasztott', aktiv);
      gomb.setAttribute('aria-pressed', aktiv ? 'true' : 'false');
    });

    // Visszavonás gomb csak akkor, ha van mit visszavonni (és jogosult)
    if (this.visszavonasGomb) {
      this.visszavonasGomb.hidden = !this.jelenlegiSzavazat || !this.szavazhat;
    }

    // A különválási kérdés CSAK állásfoglalásnál értelmes: Támogatom vagy Ellenzem.
    // Tartózkodásnál és szavazat nélkül elrejtjük (a tartózkodó a főágon marad).
    const kerdesLathato = this.szavazhat &&
      (this.jelenlegiSzavazat === 'Tamogat' || this.jelenlegiSzavazat === 'Ellenez');

    if (this.kulonvalasBlokk)  this.kulonvalasBlokk.hidden = !kerdesLathato;
    if (this.kulonvalasJelolo) this.kulonvalasJelolo.checked = this.kulonvalasIgeny;
  }

  // ----- GOMBOK TILTÁSA/ENGEDÉSE (hívás közben) -----
  _gombokTiltasa(tiltva) {
    Object.values(this.gombok).forEach((gomb) => {
      // Ha eleve nem jogosult, maradjon tiltva
      gomb.disabled = tiltva || !this.szavazhat;
    });
    if (this.visszavonasGomb) this.visszavonasGomb.disabled = tiltva;
  }

  // ----- ÜZENET MEGJELENÍTÉSE -----
  // @param {string} szoveg
  // @param {'semleges'|'siker'|'hiba'} tipus
  _uzenet(szoveg, tipus = 'semleges') {
    if (!this.uzenetElem) return;
    this.uzenetElem.textContent = szoveg;
    this.uzenetElem.classList.remove('szavazas-ful__uzenet--siker', 'szavazas-ful__uzenet--hiba');
    if (tipus === 'siker') this.uzenetElem.classList.add('szavazas-ful__uzenet--siker');
    if (tipus === 'hiba')  this.uzenetElem.classList.add('szavazas-ful__uzenet--hiba');
  }

  // ----- MEGSEMMISÍTÉS -----
  // A gombok eseménykezelői a DOM elemekkel együtt eltűnnek (a kártya üríti a
  // body-t); itt csak a referenciákat vágjuk el.
  destroy() {
    console.log('SzavazasFul.destroy - KEZDÉS');
    this.gombok           = {};
    this.visszavonasGomb  = null;
    this.uzenetElem       = null;
    this.kulonvalasBlokk  = null;
    this.kulonvalasJelolo = null;
    this.kontener         = null;
    console.log('SzavazasFul.destroy - VÉGE');
  }
}

// --- EXPORTÁLÁS ---
export default SzavazasFul;
