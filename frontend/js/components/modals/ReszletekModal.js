// frontend/js/components/modals/ReszletekModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';
import HozzajarulokModal from './HozzajarulokModal.js';
import ErtekEloszlasModal from './ErtekEloszlasModal.js';
import { masodpercFelirat } from '../../utils/idoFormazo.js';

// Entitástípus → API útvonal a /reszletek végponthoz.
// A backend mind az öt típusnak biztosít részletek-végpontot.
const UTVONAL_TIPUSHOZ = {
  Tartalom:      'tartalom',
  Kategoria:     'kategoria',
  TartalomTipus: 'tartalomTipus',
  Javaslat:      'javaslat',
  Egyezmeny:     'egyezmeny'
};

// ===== RÉSZLETEK MODAL OSZTÁLY =====
// Felelősség: egy entitás részletes (csak olvasható) adatainak megjelenítése.
//  1. Megnyitáskor lekéri az entitás `/reszletek` adatait a backendről.
//  2. Entitástípusonként „címke: érték" sorokban jeleníti meg.
//  3. A gazdag szöveget (tartalom szövege) a SzovegMezoMegjelenito rendereli.
// Használják: a kártyák „Részletes adatok" menüpontja.
// Jelenleg a Tartalom típus teljes; a többi típus fokozatosan bővül.
class ReszletekModal {

  // ===== KONSTRUKTOR =====
  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {Object} beallitasok.entitas - a kártya entitása (entitasId, entitasTipus, adatok, sajatTudatpont, hierarchikusOsszesPont)
  // @param {string} beallitasok.token   - JWT token (opcionális, különben a tárolt)
  // @param {Function} beallitasok.onEntitasKivalasztas - szöveg entitás-hivatkozás koppintásakor (entitasId, entitasTipus)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('ReszletekModal.constructor - KEZDÉS', {
      kontenerAzonosito,
      entitasId:    beallitasok?.entitas?.entitasId,
      entitasTipus: beallitasok?.entitas?.entitasTipus
    });

    this.kontenerAzonosito     = kontenerAzonosito;
    this.token                 = beallitasok.token ?? tokenLekerese();
    this.entitas               = beallitasok.entitas ?? null;
    this.onEntitasKivalasztas  = beallitasok.onEntitasKivalasztas ?? null;

    this.entitasId    = this.entitas?.entitasId    ?? null;
    this.entitasTipus = this.entitas?.entitasTipus ?? null;

    this.modal = null;

    // A szöveg blokk-renderelő példány – bezáráskor megsemmisítjük
    this.szovegMegjelenito = null;

    console.log('ReszletekModal.constructor - VÉGE', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('ReszletekModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      'Részletes adatok',
      tartalom: tartalomHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   'Bezárás',
          tipus:     'masodlagos',
          azonosito: 'reszletek-modal-bezar-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => {
        // A szöveg megjelenítő eseményfigyelőinek felszabadítása (ha volt)
        this.szovegMegjelenito?.destroy?.();
        this.szovegMegjelenito = null;
        console.log('ReszletekModal - modal bezárva');
      }
    });

    await this.modal.init();

    console.log('ReszletekModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    console.log('ReszletekModal._templateBetoltese - KEZDÉS');
    try {
      const valasz = await fetch('./html/components/modals/reszletekModal.html');
      if (!valasz.ok) {
        console.error('ReszletekModal._templateBetoltese - HIBA: template nem található', {
          statusz: valasz.status
        });
        return null;
      }
      const htmlSzoveg = await valasz.text();
      console.log('ReszletekModal._templateBetoltese - VÉGE: sikeres betöltés');
      return htmlSzoveg;
    } catch (hiba) {
      console.error('ReszletekModal._templateBetoltese - VÉGE: kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  // Megnyitja a modalt, majd betölti és megjeleníti a részleteket.
  async megnyitas() {
    console.log('ReszletekModal.megnyitas - KEZDÉS');

    this.modal?.megnyitas();
    await this._adatokBetoltese();

    console.log('ReszletekModal.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    console.log('ReszletekModal.bezaras - KEZDÉS');
    this.modal?.bezaras();
    console.log('ReszletekModal.bezaras - VÉGE');
  }

  // ===== ADATOK BETÖLTÉSE =====
  // Lekéri az entitás /reszletek adatait, majd átadja a rendernek.
  async _adatokBetoltese() {
    console.log('ReszletekModal._adatokBetoltese - KEZDÉS', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });

    const utvonalTo = UTVONAL_TIPUSHOZ[this.entitasTipus];
    if (!utvonalTo || !this.entitasId) {
      this.modal.hibaBeallitasa('Ismeretlen entitástípus – a részletek nem tölthetők be.');
      return;
    }

    this.modal.betoltesBeallitasa(true);

    try {
      const valasz = await apiGet(`${utvonalTo}/${this.entitasId}/reszletek`, this.token);

      // Tartalomnál a küszöb-medián értékeket is lekérjük (nem kritikus:
      // ha nincs adat vagy hibázik, a küszöb szakasz egyszerűen kimarad).
      let ertekAdatok = null;
      if (this.entitasTipus === 'Tartalom') {
        try {
          const ertekValasz = await apiGet(`ertekJavaslat/reszletek/${this.entitasId}`, this.token);
          ertekAdatok = ertekValasz?.aktualisErtekek ?? null;
        } catch (ertekHiba) {
          console.warn('ReszletekModal - a küszöbértékek nem tölthetők', ertekHiba.message);
        }
      }

      this.modal.betoltesBeallitasa(false);
      this._render(valasz?.data ?? null, ertekAdatok);

      console.log('ReszletekModal._adatokBetoltese - VÉGE: sikeres');
    } catch (hiba) {
      console.error('ReszletekModal._adatokBetoltese - HIBA', hiba.message);
      this.modal.hibaBeallitasa(hiba.message ?? 'A részletek betöltése sikertelen.');
    }
  }

  // ===== RENDERELÉS =====
  // A típusnak megfelelő nézetet építi fel a listakonténerbe.
  _render(data, ertekAdatok = null) {
    console.log('ReszletekModal._render - KEZDÉS', { entitasTipus: this.entitasTipus });

    const lista = document.getElementById('reszletek-modal-lista');
    if (!lista) return;
    lista.innerHTML = '';

    if (!data) {
      this._hamarosanSor(lista, 'Nem érkezett adat a részletekhez.');
      return;
    }

    // Egyelőre a Tartalom típus teljes; a többi fokozatosan bővül.
    if (this.entitasTipus === 'Tartalom') {
      this._renderTartalom(lista, data, ertekAdatok);
    } else {
      this._hamarosanSor(lista, 'Ehhez a típushoz a részletes nézet hamarosan elérhető.');
    }

    console.log('ReszletekModal._render - VÉGE');
  }

  // ===== TARTALOM RÉSZLETEI =====
  // A backend válasza: { tartalom, tudatpont }.
  // A típus/kategória NEVEKET a kártya adataiból vesszük (a /reszletek nyers ID-kat ad).
  _renderTartalom(lista, data, ertekAdatok = null) {
    const tartalom  = data.tartalom  ?? {};
    const tudatpont = data.tudatpont ?? {};
    const adatok    = this.entitas?.adatok ?? {};

    // --- ALAPADATOK ---
    this._sor(lista, 'Cím',            adatok.cim ?? tartalom.cim ?? '—');
    this._sor(lista, 'Tartalomtípus',  this._tipusFelirat(adatok));
    this._sor(lista, 'Kategóriák',     this._kategoriakFelirat(adatok));
    this._sor(lista, 'Létrehozó',      tartalom.letrehozo?.eemberNev ?? '—');
    this._sor(lista, 'Létrehozva',     this._datumFelirat(tartalom.letrehozva));

    // --- TUDATPONT ---
    this._szakaszCim(lista, 'Tudatpont');
    this._sor(lista, 'Saját pontod',        this._szam(tudatpont.eemberHozzajarulas));
    this._sor(lista, 'Összes (entitáson)',  this._szam(tudatpont.osszesPont));
    // Hozzájárulók: a részletek gomb megnyitja a hozzájárulók listáját
    this._sorGombbal(
      lista,
      'Hozzájárulók',
      this._szam(tudatpont.hozzajarulokSzama),
      'részletek',
      () => this._hozzajarulokReszletek()
    );
    this._sor(lista, 'Hierarchikus összes', this._szam(this.entitas?.hierarchikusOsszesPont));

    // --- KÜSZÖBÉRTÉKEK (MEDIÁN) ---
    // A négy küszöb aktuális (medián) értéke; mindegyik mellett „részletek"
    // gomb, ami az érték-javaslatok eloszlását nyitja meg.
    if (ertekAdatok) {
      this._szakaszCim(lista, 'Küszöbértékek (medián)');
      this._sorGombbal(
        lista, 'Min. döntési idő',
        masodpercFelirat(ertekAdatok.aktualMinimumDontesiIdo), 'részletek',
        () => this._ertekEloszlas('minimumDontesiIdo', 'Min. döntési idő', 'ido')
      );
      this._sorGombbal(
        lista, 'Max. döntési idő',
        masodpercFelirat(ertekAdatok.aktualMaximumDontesiIdo), 'részletek',
        () => this._ertekEloszlas('maximumDontesiIdo', 'Max. döntési idő', 'ido')
      );
      this._sorGombbal(
        lista, 'Min. részvételi arány',
        this._szazalek(ertekAdatok.reszveteliAranyKuszob), 'részletek',
        () => this._ertekEloszlas('reszveteliAranyKuszob', 'Min. részvételi arány', 'szazalek')
      );
      this._sorGombbal(
        lista, 'Min. támogatottsági arány',
        this._szazalek(ertekAdatok.javaslatElfogadasiKuszob), 'részletek',
        () => this._ertekEloszlas('javaslatElfogadasiKuszob', 'Min. támogatottsági arány', 'szazalek')
      );
    }

    // --- SZÖVEG (rich text) ---
    this._szovegSzakasz(lista, tartalom.szoveg);

    // --- AZONOSÍTÓ ---
    this._szakaszCim(lista, 'Azonosító');
    this._sor(lista, 'Entitás ID', this.entitasId ?? '—', 'reszletek-modal__ertek--halvany');
  }

  // ===== SEGÉD: EGY SOR (címke + érték) =====
  _sor(lista, cimke, ertek, ertekExtraOsztaly = null) {
    const sor = document.createElement('div');
    sor.className = 'reszletek-modal__sor';

    const cimkeElem = document.createElement('span');
    cimkeElem.className   = 'reszletek-modal__cimke';
    cimkeElem.textContent = cimke;

    const ertekElem = document.createElement('span');
    ertekElem.className   = 'reszletek-modal__ertek';
    if (ertekExtraOsztaly) ertekElem.classList.add(ertekExtraOsztaly);
    ertekElem.textContent = ertek;

    sor.appendChild(cimkeElem);
    sor.appendChild(ertekElem);
    lista.appendChild(sor);
  }

  // ===== SEGÉD: SOR RÉSZLETEK GOMBBAL =====
  // Mint a _sor, de az érték mellé egy kis „részletek" gombot is tesz,
  // ami megnyit egy hozzá tartozó al-modalt (pl. hozzájárulók listája).
  _sorGombbal(lista, cimke, ertek, gombFelirat, onGombKlikk) {
    const sor = document.createElement('div');
    sor.className = 'reszletek-modal__sor';

    const cimkeElem = document.createElement('span');
    cimkeElem.className   = 'reszletek-modal__cimke';
    cimkeElem.textContent = cimke;

    // Jobb oldali csoport: érték + gomb egymás mellett
    const csoport = document.createElement('span');
    csoport.className = 'reszletek-modal__ertek-csoport';

    const ertekElem = document.createElement('span');
    ertekElem.className   = 'reszletek-modal__ertek';
    ertekElem.textContent = ertek;

    const gomb = document.createElement('button');
    gomb.type        = 'button';
    gomb.className    = 'reszletek-modal__reszletek-gomb';
    gomb.textContent  = gombFelirat;
    gomb.addEventListener('click', onGombKlikk);

    csoport.appendChild(ertekElem);
    csoport.appendChild(gomb);
    sor.appendChild(cimkeElem);
    sor.appendChild(csoport);
    lista.appendChild(sor);
  }

  // ===== HOZZÁJÁRULÓK RÉSZLETEI =====
  // Megnyitja a Hozzájárulók al-modalt erre az entitásra (a Részletek modal felett).
  async _hozzajarulokReszletek() {
    console.log('ReszletekModal._hozzajarulokReszletek - KEZDÉS', {
      entitasId: this.entitasId, entitasTipus: this.entitasTipus
    });

    const hozzajarulokModal = new HozzajarulokModal({
      entitas: this.entitas,
      token:   this.token
    });
    await hozzajarulokModal.init();
    await hozzajarulokModal.megnyitas();

    console.log('ReszletekModal._hozzajarulokReszletek - VÉGE');
  }

  // ===== EGY KÜSZÖB ÉRTÉK-ELOSZLÁSA =====
  // Megnyitja az eloszlás al-modalt a megadott küszöbre (a Részletek modal felett).
  // @param {string} mezo     - a küszöb mezőneve (pl. 'minimumDontesiIdo')
  // @param {string} cimke    - emberi felirat a fejlécbe
  // @param {string} formatum - 'ido' | 'szazalek' | 'szam'
  async _ertekEloszlas(mezo, cimke, formatum) {
    console.log('ReszletekModal._ertekEloszlas - KEZDÉS', { mezo, formatum });

    const eloszlasModal = new ErtekEloszlasModal({
      tartalomId: this.entitasId,
      mezo,
      cimke,
      formatum,
      token: this.token
    });
    await eloszlasModal.init();
    await eloszlasModal.megnyitas();

    console.log('ReszletekModal._ertekEloszlas - VÉGE');
  }

  // ===== SEGÉD: SZAKASZCÍM =====
  _szakaszCim(lista, szoveg) {
    const cim = document.createElement('div');
    cim.className   = 'reszletek-modal__szakasz-cim';
    cim.textContent = szoveg;
    lista.appendChild(cim);
  }

  // ===== SEGÉD: HAMAROSAN / ÜRES ÜZENET =====
  _hamarosanSor(lista, szoveg) {
    const p = document.createElement('p');
    p.className   = 'reszletek-modal__hamarosan';
    p.textContent = szoveg;
    lista.appendChild(p);
  }

  // ===== SEGÉD: SZÖVEG SZAKASZ (rich text blokk-renderelés) =====
  _szovegSzakasz(lista, szoveg) {
    // Üres szöveg esetén nem jelenítünk meg szakaszt
    const uresE = !szoveg
      || (Array.isArray(szoveg) && szoveg.length === 0);
    if (uresE) return;

    this._szakaszCim(lista, 'Szöveg');

    const kontener = document.createElement('div');
    kontener.className = 'reszletek-modal__szoveg';
    lista.appendChild(kontener);

    // A blokk-renderelő ugyanaz, mint a kártyák body-jában
    this.szovegMegjelenito = new SzovegMezoMegjelenito(kontener, {
      blokkok: szoveg,
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        console.log('ReszletekModal - entitás hivatkozás koppintva', { entitasId, entitasTipus });
        // Navigációhoz előbb bezárjuk a modalt, majd a pakli arra vált
        this.bezaras();
        if (typeof this.onEntitasKivalasztas === 'function') {
          this.onEntitasKivalasztas(entitasId, entitasTipus);
        }
      }
    });
  }

  // ===== SEGÉD: TÍPUS FELIRAT =====
  _tipusFelirat(adatok) {
    const tipus = adatok?.tartalomTipus;
    if (!tipus || !tipus.nev) return '—';
    return tipus.ikon ? `${tipus.ikon} ${tipus.nev}` : tipus.nev;
  }

  // ===== SEGÉD: KATEGÓRIÁK FELIRAT =====
  _kategoriakFelirat(adatok) {
    const kategoriak = adatok?.kategoriak ?? [];
    if (kategoriak.length === 0) return '—';
    return kategoriak
      .map(k => (k.ikon ? `${k.ikon} ${k.nev ?? ''}` : (k.nev ?? '')).trim())
      .filter(Boolean)
      .join(', ');
  }

  // ===== SEGÉD: DÁTUM FELIRAT =====
  _datumFelirat(datum) {
    if (!datum) return '—';
    const d = new Date(datum);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('hu-HU');
  }

  // ===== SEGÉD: SZÁM FORMÁZÁS =====
  _szam(ertek) {
    return (ertek ?? 0).toLocaleString('hu-HU');
  }

  // ===== SEGÉD: SZÁZALÉK FORMÁZÁS =====
  _szazalek(ertek) {
    if (ertek === undefined || ertek === null) return '—';
    return `${ertek}%`;
  }
}

// ===== EXPORTÁLÁS =====
export default ReszletekModal;
