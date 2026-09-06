// frontend/js/components/modals/TudatpontModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import SzerepValasztoModal from './SzerepValasztoModal.js';
import { apiGet, apiPost } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// ===== TUDATPONT MODAL OSZTÁLY =====
// Felelősség: egy entitáson a bejelentkezett eember tudatpontjainak módosítása.
//  1. Megnyitáskor lekéri a jelenlegi saját pontot ÉS a részvételi szerepet (ebből
//     tudjuk, ELSŐ allokálás-e), és felméri a felmenőket.
//  2. Ha van olyan felmenő, amelyen nincs pontja, FIGYELMEZTET — de NEM blokkol
//     (a felmenő-kényszer megszűnt, 2026-07-30). A „Felmenők kitöltése" gomb
//     felmenőnként 1 pontot tesz, felmenőnként megkérdezve a szerepet.
//  3. Mentéskor az ELSŐ allokáláskor felugró szerep-választóval bekéri a részvételi
//     szerepet (passzív/aktív), majd a POST /api/tudatpont/hozzarendeles-t hívja.
// Használják: minden kártyatípus „Tudatpont módosítás" menüpontja.
// A standard modal-stílust követi (t-modal-* osztályok), mint a GondolatModal.
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

    // A megnyitáskor felmért hiányzó felmenők (a kitöltés ezt használja)
    this.felmeres = null;

    // A saját részvételi szerep az entitáson: 'passziv' | 'aktiv' | null.
    // null → még nincs hozzárendelése → ELSŐ allokálás → mentéskor kérdezünk szerepet.
    this.eemberSzerep  = null;
    this.elsoAllokalas = false;

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

    // A felmenő-kitöltés gomb bekötése (nem blokkoló, opcionális)
    this._felmenoGombBekotese();

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
  // Megnyitja a modalt, majd betölti a jelenlegi pontot/szerepet és felméri a felmenőket.
  async megnyitas() {
    console.log('TudatpontModal.megnyitas - KEZDÉS');

    this.modal?.megnyitas();

    // Az entitás neve a fejlécbe
    const nevElem = document.getElementById('tudatpont-entitas-nev');
    if (nevElem) {
      const nev = this._entitasNev();
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

  // ===== SEGÉD: ENTITÁS NEVE =====
  _entitasNev() {
    return this.entitasAdatok?.adatok?.cim
      ?? this.entitasAdatok?.adatok?.nev
      ?? '(névtelen entitás)';
  }

  // ===== ADATOK BETÖLTÉSE =====
  // 1. Jelenlegi saját pont + szerep lekérése (input előtöltés, első-allokálás eldöntése).
  // 2. Felmenők felmérése (figyelmeztetés + egyenleg).
  async _adatokBetoltese() {
    console.log('TudatpontModal._adatokBetoltese - KEZDÉS', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });

    this.modal.betoltesBeallitasa(true);

    try {
      // 1. LÉPÉS - Jelenlegi allokáció (saját pont + szerep előtöltése)
      const allokacioValasz = await apiGet(
        `tudatpont/entitas/${this.entitasTipus}/${this.entitasId}`,
        this.token
      );
      const sajatPont = allokacioValasz?.data?.eemberHozzajarulas ?? 0;

      // eemberSzerep: 'passziv' | 'aktiv' | null (null → még nincs hozzárendelés → első allokálás)
      this.eemberSzerep  = allokacioValasz?.data?.eemberSzerep ?? null;
      this.elsoAllokalas = (this.eemberSzerep === null);

      const ertekMezo = document.getElementById('tudatpont-ertek');
      if (ertekMezo) ertekMezo.value = sajatPont;

      // 2. LÉPÉS - Felmenők felmérése
      const felmeresValasz = await apiGet(
        `tudatpont/hianyzo-felmenok/${this.entitasTipus}/${this.entitasId}`,
        this.token
      );
      this.felmeres = felmeresValasz?.data ?? null;

      // 3. LÉPÉS - Felület igazítása
      this.modal.betoltesBeallitasa(false);
      this._egyenlegMegjelenites();
      this._felmenoMegjelenites();

      console.log('TudatpontModal._adatokBetoltese - VÉGE', {
        sajatPont,
        eemberSzerep: this.eemberSzerep,
        elsoAllokalas: this.elsoAllokalas,
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

  // ===== FELMENŐ FIGYELMEZTETÉS MEGJELENÍTÉSE (NEM BLOKKOLÓ) =====
  // Ha van hiányzó felmenő, megmutatja a listát és a kitöltő gombot. A mentést NEM
  // gátolja — a felmenő-kitöltés opcionális.
  _felmenoMegjelenites() {
    console.log('TudatpontModal._felmenoMegjelenites - KEZDÉS', {
      hianyzoDb: this.felmeres?.hianyzoDb
    });

    const doboz = document.getElementById('tudatpont-felmeno');
    if (!doboz || !this.felmeres) return;

    // Nincs hiányzó felmenő → a figyelmeztetés rejtve marad
    if (this.felmeres.hianyzoDb === 0) {
      doboz.hidden = true;
      return;
    }

    doboz.hidden = false;

    // Cím szöveg — NEM kötelező hangnem
    const cimElem = document.getElementById('tudatpont-felmeno-cim');
    if (cimElem) {
      cimElem.textContent =
        `${this.felmeres.hianyzoDb} felmenőn még nincs tudatpontod. ` +
        `Ez már nem kötelező — a mentés így is működik. Ha szeretnéd, alább 1-1 pontot ` +
        `tehetsz rájuk; mindegyiknél megkérdezzük a szerepet (passzív/aktív).`;
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

    // Kitöltő gomb: csak akkor tiltjuk, ha egyáltalán nincs egyenleg (0 pont)
    const gomb = document.getElementById('tudatpont-felmeno-kitolt-gomb');
    if (gomb) {
      const vanEgyenleg = this.felmeres.eemberEgyenleg > 0;
      gomb.disabled = !vanEgyenleg;
      gomb.textContent = vanEgyenleg
        ? 'Felmenők kitöltése 1-1 ponttal (opcionális)'
        : 'Nincs elég tudatpontod a felmenők kitöltéséhez';
    }

    console.log('TudatpontModal._felmenoMegjelenites - VÉGE');
  }

  // ===== FELMENŐ-KITÖLTÉS GOMB BEKÖTÉSE =====
  _felmenoGombBekotese() {
    const gomb = document.getElementById('tudatpont-felmeno-kitolt-gomb');
    gomb?.addEventListener('click', () => this._felmenokKitoltese());
  }

  // ===== FELMENŐK OPCIONÁLIS KITÖLTÉSE (felmenőnként szerep-kérdéssel) =====
  // A hiányzó felmenőkre egyenként 1 pontot tesz. MINDEGYIK felmenőnél felugrik a
  // szerep-választó (passzív/aktív) — a tulajdonos döntése: „annyiszor nyíljon fel a
  // modal, ahány entitásra kerül allokáció". Ha valahol Mégse-t nyom, a folyamat
  // megáll, a már kitöltött felmenők megmaradnak.
  async _felmenokKitoltese() {
    console.log('TudatpontModal._felmenokKitoltese - KEZDÉS');

    if (!this.felmeres || this.felmeres.hianyzoDb === 0) return;

    this.modal.hibaTisztitasa();

    // Másolat: a lista a _adatokBetoltese során úgyis frissül a végén
    const felmenok = [...this.felmeres.hianyzoFelmenok];

    for (const felmeno of felmenok) {
      // Szerep bekérése ERRE a felmenőre
      const valaszto = new SzerepValasztoModal(`${felmeno.nev} (${felmeno.entitasTipus})`);
      const szerep = await valaszto.valaszt();

      // Mégse → a folyamat megáll, a már kitöltöttek megmaradnak
      if (szerep === null) {
        console.log('TudatpontModal._felmenokKitoltese - megszakítva', { felmeno: felmeno.nev });
        break;
      }

      // 1 pont az adott felmenőre, a választott szereppel
      try {
        await apiPost('tudatpont/hozzarendeles', {
          entitasId:    felmeno.entitasId,
          entitasTipus: felmeno.entitasTipus,
          pontok:       1,
          szerep:       szerep
        }, this.token);
        console.log('TudatpontModal._felmenokKitoltese - felmenő kitöltve', {
          felmeno: felmeno.nev, szerep
        });
      } catch (hiba) {
        console.error('TudatpontModal._felmenokKitoltese - HIBA', hiba.message);
        this.modal.hibaBeallitasa(`A felmenő kitöltése sikertelen (${felmeno.nev}): ${hiba.message}`);
        break;
      }
    }

    // Felmérés frissítése: a kitöltött felmenők eltűnnek, az egyenleg frissül
    await this._adatokBetoltese();

    console.log('TudatpontModal._felmenokKitoltese - VÉGE');
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

    // 2. LÉPÉS - ELSŐ ALLOKÁLÁSKORI SZEREP-VÁLASZTÁS (csak ha pontot TESZÜNK)
    // Ha még nincs szerepe ezen az entitáson, és pontot tesz (ertek > 0), felugró
    // választóval bekérjük a szerepet. Későbbi allokálásnál (van már szerepe) NEM
    // kérdezünk — a szerep a „Részvételi beállítások" menüből módosítható.
    let szerep = null;
    if (ertek > 0 && this.elsoAllokalas) {
      const valaszto = new SzerepValasztoModal(this._entitasNev());
      szerep = await valaszto.valaszt();

      // Mégse a szerep-választón → nem mentünk (a eember visszaléphet)
      if (szerep === null) {
        console.log('TudatpontModal._mentes - szerep-választás megszakítva, mentés elmarad');
        return;
      }
    }

    // 3. LÉPÉS - Mentés
    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      const payload = {
        entitasId:    this.entitasId,
        entitasTipus: this.entitasTipus,
        pontok:       ertek
      };
      // A szerepet csak az első allokáláskor küldjük (egyébként null marad)
      if (szerep) payload.szerep = szerep;

      const eredmeny = await apiPost('tudatpont/hozzarendeles', payload, this.token);

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

      // Frissítjük a felmérést, hogy a figyelmeztetés/egyenleg naprakész legyen
      await this._adatokBetoltese();
    }
  }
}

// ===== EXPORTÁLÁS =====
export default TudatpontModal;
