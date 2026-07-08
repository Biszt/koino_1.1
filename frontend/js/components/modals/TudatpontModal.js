// frontend/js/components/modals/TudatpontModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, apiPost } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// ===== TUDATPONT MODAL OSZTÁLY =====
// Felelősség: egy entitáson a bejelentkezett eember tudatpontjainak módosítása.
//  1. Megnyitáskor lekéri a jelenlegi saját pontot (előtöltés) és felméri a felmenőket.
//  2. Ha van olyan felmenő, amelyen nincs pontja, figyelmeztet és hozzájárulást kér
//     az automatikus 1-1 pont kitöltéséhez (a szabályt a backend is kikényszeríti).
//  3. Mentéskor a POST /api/tudatpont/hozzarendeles végpontot hívja.
// Használják: minden kártyatípus „Tudatpont módosítás" menüpontja.
// A standard modal-stílust követi (t-modal-* osztályok), mint a TartalomModal.
class TudatpontModal {

  // ===== KONSTRUKTOR =====
  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {Object} beallitasok.entitasAdatok - { entitasId, entitasTipus, adatok }
  // @param {Function} beallitasok.onSiker - sikeres mentés után hívjuk (pakli újratöltés)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('TudatpontModal.constructor - KEZDÉS', {
      kontenerAzonosito,
      entitasId:    beallitasok?.entitasAdatok?.entitasId,
      entitasTipus: beallitasok?.entitasAdatok?.entitasTipus
    });

    this.kontenerAzonosito = kontenerAzonosito;
    this.token             = tokenLekerese();
    this.entitasAdatok     = beallitasok.entitasAdatok ?? null;
    this.onSiker           = beallitasok.onSiker        ?? null;

    this.entitasId   = this.entitasAdatok?.entitasId   ?? null;
    this.entitasTipus = this.entitasAdatok?.entitasTipus ?? null;

    // A megnyitáskor felmért hiányzó felmenők (a mentés és a validáció ezt használja)
    this.felmeres = null;

    this.modal = null;

    console.log('TudatpontModal.constructor - VÉGE', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('TudatpontModal.init - KEZDÉS');

    const formHtml = await this._templateBetoltese();
    if (!formHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      'Tudatpont módosítás',
      tartalom: formHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   'Mentés',
          tipus:     'elsodleges',
          azonosito: 'tudatpont-modal-mentes-gomb',
          akcio:     () => this._mentes()
        },
        {
          felirat:   'Mégse',
          tipus:     'masodlagos',
          azonosito: 'tudatpont-modal-megse-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => {
        console.log('TudatpontModal - modal bezárva');
      }
    });

    await this.modal.init();

    // A felmenő-figyelmeztetés jóváhagyó checkboxa és az értékmező is
    // a mentés gomb állapotát vezérli
    this._checkboxBekotese();
    this._ertekMezoBekotese();

    console.log('TudatpontModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    console.log('TudatpontModal._templateBetoltese - KEZDÉS');
    try {
      const valasz = await fetch('./html/components/modals/tudatpontModal.html');
      if (!valasz.ok) {
        console.error('TudatpontModal._templateBetoltese - HIBA: template nem található', {
          statusz: valasz.status
        });
        return null;
      }
      const htmlSzoveg = await valasz.text();
      console.log('TudatpontModal._templateBetoltese - VÉGE: sikeres betöltés');
      return htmlSzoveg;
    } catch (hiba) {
      console.error('TudatpontModal._templateBetoltese - VÉGE: kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  // Megnyitja a modalt, majd betölti a jelenlegi pontot és felméri a felmenőket.
  async megnyitas() {
    console.log('TudatpontModal.megnyitas - KEZDÉS');

    this.modal?.megnyitas();

    // Az entitás neve a fejlécbe
    const nevElem = document.getElementById('tudatpont-entitas-nev');
    if (nevElem) {
      const nev = this.entitasAdatok?.adatok?.cim
        ?? this.entitasAdatok?.adatok?.nev
        ?? '(névtelen entitás)';
      nevElem.textContent = `Entitás: ${nev}`;
    }

    await this._adatokBetoltese();

    console.log('TudatpontModal.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    console.log('TudatpontModal.bezaras - KEZDÉS');
    this.modal?.bezaras();
    console.log('TudatpontModal.bezaras - VÉGE');
  }

  // ===== ADATOK BETÖLTÉSE =====
  // 1. Jelenlegi saját pont lekérése (input előtöltés).
  // 2. Felmenők felmérése (figyelmeztetés + egyenleg).
  async _adatokBetoltese() {
    console.log('TudatpontModal._adatokBetoltese - KEZDÉS', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });

    this.modal.betoltesBeallitasa(true);

    try {
      // 1. LÉPÉS - Jelenlegi allokáció (saját hozzájárulás előtöltése)
      const allokacioValasz = await apiGet(
        `tudatpont/entitas/${this.entitasTipus}/${this.entitasId}`,
        this.token
      );
      const sajatPont = allokacioValasz?.data?.eemberHozzajarulas ?? 0;

      const ertekMezo = document.getElementById('tudatpont-ertek');
      if (ertekMezo) ertekMezo.value = sajatPont;

      // 2. LÉPÉS - Felmenők felmérése
      const felmeresValasz = await apiGet(
        `tudatpont/hianyzo-felmenok/${this.entitasTipus}/${this.entitasId}`,
        this.token
      );
      this.felmeres = felmeresValasz?.data ?? null;

      // 3. LÉPÉS - Felület igazítása a felméréshez
      // FONTOS: előbb kikapcsoljuk a betöltési állapotot (ez minden gombot
      // újra engedélyez), és CSAK UTÁNA futtatjuk a _felmenoMegjelenites-t,
      // amely a mentés gombot szükség esetén letiltja — különben a betöltés
      // kikapcsolása felülírná a letiltást.
      this.modal.betoltesBeallitasa(false);
      this._egyenlegMegjelenites();
      this._felmenoMegjelenites();

      console.log('TudatpontModal._adatokBetoltese - VÉGE', {
        sajatPont,
        hianyzoDb: this.felmeres?.hianyzoDb
      });

    } catch (hiba) {
      console.error('TudatpontModal._adatokBetoltese - HIBA', hiba.message);
      this.modal.hibaBeallitasa(hiba.message ?? 'Az adatok betöltése sikertelen.');
    }
  }

  // ===== EGYENLEG MEGJELENÍTÉSE =====
  _egyenlegMegjelenites() {
    const egyenlegElem = document.getElementById('tudatpont-egyenleg');
    if (!egyenlegElem || !this.felmeres) return;
    egyenlegElem.textContent =
      `Elérhető egyenleged: ${this.felmeres.eemberEgyenleg.toLocaleString()} tudatpont`;
  }

  // ===== FELMENŐ FIGYELMEZTETÉS MEGJELENÍTÉSE =====
  // Ha van hiányzó felmenő, megmutatja a listát és a jóváhagyó checkboxot.
  _felmenoMegjelenites() {
    console.log('TudatpontModal._felmenoMegjelenites - KEZDÉS', {
      hianyzoDb: this.felmeres?.hianyzoDb
    });

    const doboz = document.getElementById('tudatpont-felmeno');
    if (!doboz || !this.felmeres) return;

    // Nincs hiányzó felmenő → a figyelmeztetés rejtve marad
    if (this.felmeres.hianyzoDb === 0) {
      doboz.hidden = true;
      this._mentesGombFrissitese();
      return;
    }

    doboz.hidden = false;

    // Cím szöveg
    const cimElem = document.getElementById('tudatpont-felmeno-cim');
    if (cimElem) {
      cimElem.textContent =
        `${this.felmeres.hianyzoDb} felmenőn még nincs tudatpontod. ` +
        `A tudatpont hozzárendeléséhez mindegyiken kell legalább 1, ezért mentéskor ` +
        `1-1 pont kerül rájuk (összesen ${this.felmeres.hianyzoDb}).`;
    }

    // Lista feltöltése
    const listaElem = document.getElementById('tudatpont-felmeno-lista');
    if (listaElem) {
      listaElem.innerHTML = '';
      this.felmeres.hianyzoFelmenok.forEach(felmeno => {
        const li = document.createElement('li');
        li.className = 'tudatpont-modal__felmeno-elem';
        li.textContent = `${felmeno.nev} (${felmeno.entitasTipus})`;
        listaElem.appendChild(li);
      });
    }

    // Checkbox felirata és állapota
    const checkbox = document.getElementById('tudatpont-felmeno-checkbox');
    const felirat  = document.getElementById('tudatpont-felmeno-checkbox-felirat');
    if (felirat) {
      felirat.textContent =
        `Hozzájárulok, hogy 1-1 tudatpont kerüljön a fenti ${this.felmeres.hianyzoDb} felmenőre.`;
    }

    // Ha nincs elég egyenleg a felmenőkre, jelezzük és letiltjuk a jóváhagyást
    if (!this.felmeres.elegEgyenlegAFelmenokre) {
      if (checkbox) {
        checkbox.checked  = false;
        checkbox.disabled = true;
      }
      this.modal.hibaBeallitasa(
        `Nincs elég tudatpontod: ${this.felmeres.hianyzoDb} felmenőre kellene 1-1 pont, ` +
        `de csak ${this.felmeres.eemberEgyenleg} tudatpontod van.`
      );
    } else if (checkbox) {
      checkbox.disabled = false;
    }

    this._mentesGombFrissitese();

    console.log('TudatpontModal._felmenoMegjelenites - VÉGE');
  }

  // ===== CHECKBOX BEKÖTÉSE =====
  _checkboxBekotese() {
    const checkbox = document.getElementById('tudatpont-felmeno-checkbox');
    checkbox?.addEventListener('change', () => {
      console.log('TudatpontModal - felmenő jóváhagyás váltás', { checked: checkbox.checked });
      this._mentesGombFrissitese();
    });
  }

  // ===== ÉRTÉKMEZŐ BEKÖTÉSE =====
  // Az érték változása is befolyásolja, kell-e felmenő-jóváhagyás:
  // 0-ra állításnál (visszavonás) nincs felmenő-követelmény.
  _ertekMezoBekotese() {
    const ertekMezo = document.getElementById('tudatpont-ertek');
    ertekMezo?.addEventListener('input', () => {
      this._mentesGombFrissitese();
    });
  }

  // ===== MENTÉS GOMB ÁLLAPOTÁNAK FRISSÍTÉSE =====
  // A mentés gomb csak akkor tiltott, ha pontot TESZÜNK (érték > 0), van hiányzó
  // felmenő, és a eember még nem hagyta jóvá a kitöltést (vagy nincs rá egyenlege).
  // 0-ra állításnál (visszavonás) mindig menthető.
  _mentesGombFrissitese() {
    const kontener   = document.getElementById(this.kontenerAzonosito);
    const mentesGomb = kontener?.querySelector('#tudatpont-modal-mentes-gomb');
    if (!mentesGomb) return;

    const ertekMezo = document.getElementById('tudatpont-ertek');
    const ertek = parseInt(ertekMezo?.value, 10);

    let tilt = false;

    // Csak akkor gátoljuk a mentést, ha ténylegesen pontot teszünk (érték > 0)
    if (!isNaN(ertek) && ertek > 0 && this.felmeres && this.felmeres.hianyzoDb > 0) {
      const checkbox = document.getElementById('tudatpont-felmeno-checkbox');
      const jovahagyva = !!checkbox?.checked;
      // Hiányzó felmenőknél kell a jóváhagyás ÉS az elég egyenleg
      tilt = !jovahagyva || !this.felmeres.elegEgyenlegAFelmenokre;
    }

    mentesGomb.disabled = tilt;
  }

  // ===== MENTÉS =====
  async _mentes() {
    console.log('TudatpontModal._mentes - KEZDÉS', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });

    // 1. LÉPÉS - Érték kiolvasása és validálása
    const ertekMezo = document.getElementById('tudatpont-ertek');
    const ertek = parseInt(ertekMezo?.value, 10);

    if (isNaN(ertek) || ertek < 0) {
      this.modal.hibaBeallitasa('Adj meg egy 0 vagy annál nagyobb egész számot.');
      return;
    }

    // 2. LÉPÉS - Felmenő-jóváhagyás ellenőrzése (csak ha pontot teszünk: ertek > 0)
    const vanHianyzoFelmeno = this.felmeres && this.felmeres.hianyzoDb > 0;
    const checkbox = document.getElementById('tudatpont-felmeno-checkbox');
    const jovahagyva = !!checkbox?.checked;

    if (ertek > 0 && vanHianyzoFelmeno) {
      if (!this.felmeres.elegEgyenlegAFelmenokre) {
        this.modal.hibaBeallitasa('Nincs elég tudatpontod a hiányzó felmenők kitöltéséhez.');
        return;
      }
      if (!jovahagyva) {
        this.modal.hibaBeallitasa('A mentéshez járulj hozzá a felmenők automatikus kitöltéséhez.');
        return;
      }
    }

    // 3. LÉPÉS - Mentés
    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      // A flag csak akkor releváns, ha pontot teszünk és van hiányzó felmenő
      const felmenoketAutomatikusan = ertek > 0 && vanHianyzoFelmeno && jovahagyva;

      const eredmeny = await apiPost('tudatpont/hozzarendeles', {
        entitasId:    this.entitasId,
        entitasTipus: this.entitasTipus,
        pontok:       ertek,
        felmenoketAutomatikusan
      }, this.token);

      this.modal.betoltesBeallitasa(false);
      this.modal.bezaras();

      if (typeof this.onSiker === 'function') {
        this.onSiker(eredmeny?.data);
      }

      console.log('TudatpontModal._mentes - VÉGE: sikeres', {
        ujeEmberEgyenleg: eredmeny?.data?.ujeEmberEgyenleg
      });

    } catch (hiba) {
      console.error('TudatpontModal._mentes - HIBA', hiba.message);
      this.modal.hibaBeallitasa(hiba.message ?? 'A mentés sikertelen, kérjük próbáld újra.');

      // Ha a backend a felmenő-szabály miatt utasított el (pl. időközben változott
      // a fa), frissítjük a felmérést, hogy a figyelmeztetés naprakész legyen.
      await this._adatokBetoltese();
    }
  }
}

// ===== EXPORTÁLÁS =====
export default TudatpontModal;
