// frontend/js/components/modals/ReszletekModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import HozzajarulokModal from './HozzajarulokModal.js';
import ErtekEloszlasModal from './ErtekEloszlasModal.js';
import { masodpercFelirat } from '../../utils/idoFormazo.js';

// Entitástípus → API útvonal a /reszletek végponthoz.
// A backend mind az öt típusnak biztosít részletek-végpontot.
const UTVONAL_TIPUSHOZ = {
  Gondolat:      'gondolat',
  Kategoria:     'kategoria',
  GondolatTipus: 'gondolatTipus',
  Javaslat:      'javaslat',
  Egyezmeny:     'egyezmeny'
};

// Enum → emberi felirat térképek a Javaslat / Egyezmény nézethez.
// A backend nyers enum-értékeket ad (pl. 'Modositas'); itt olvashatóra fordítjuk.
const JAVASLAT_TIPUS_FELIRAT = {
  Torles:     'Törlés',
  Modositas:  'Módosítás',
  Egyesites:  'Egyesítés',
  Athelyezes: 'Áthelyezés',
  Csomag:     'Csomag'
};

const STATUSZ_FELIRAT = {
  Aktiv:     'Aktív',
  Elfogadva: 'Elfogadva',
  Elvetve:   'Elvetve',
  Hiba:      'Hiba'
};

// A saját szavazat típusa (a Szavazat modellben: 'Tamogat' / 'Ellenez' / 'Tartozkodik').
const SZAVAZAT_FELIRAT = {
  Tamogat:     'Támogatod',
  Ellenez:     'Ellenzed',
  Tartozkodik: 'Tartózkodsz'
};

// Az érintett entitások típus-feliratai.
const ENTITAS_TIPUS_FELIRAT = {
  Gondolat:      'Gondolat',
  Kategoria:     'Kategória',
  GondolatTipus: 'Gondolattípus'
};

// ===== RÉSZLETEK MODAL OSZTÁLY =====
// Felelősség: egy entitás részletes (csak olvasható) adatainak megjelenítése.
//  1. Megnyitáskor lekéri az entitás `/reszletek` adatait a backendről.
//  2. Entitástípusonként „címke: érték" sorokban jeleníti meg.
// Használják: a kártyák „Részletes adatok" menüpontja.
// Jelenleg a Gondolat típus teljes; a többi típus fokozatosan bővül.
class ReszletekModal {

  // ===== KONSTRUKTOR =====
  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {Object} beallitasok.entitas - a kártya entitása (entitasId, entitasTipus, adatok, entitasSajatTudatpont, hierarchikusOsszesPont)
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

      // A küszöb-medián értékeket az érték-rendszer által támogatott mindhárom
      // típusnál lekérjük (nem kritikus: ha nincs adat vagy hibázik, a küszöb
      // szakasz egyszerűen kimarad – pl. ha az entitáshoz még nincs hisztogram).
      let ertekAdatok = null;
      if (['Gondolat', 'Kategoria', 'GondolatTipus'].includes(this.entitasTipus)) {
        try {
          const ertekValasz = await apiGet(`ertekJavaslat/reszletek/${this.entitasTipus}/${this.entitasId}`, this.token);
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

    // A Gondolat, Kategória és Gondolattípus típusok teljesek;
    // a Javaslat és Egyezmény nézet fokozatosan bővül.
    if (this.entitasTipus === 'Gondolat') {
      this._renderGondolat(lista, data, ertekAdatok);
    } else if (this.entitasTipus === 'Kategoria') {
      this._renderKategoria(lista, data, ertekAdatok);
    } else if (this.entitasTipus === 'GondolatTipus') {
      this._renderGondolatTipus(lista, data, ertekAdatok);
    } else if (this.entitasTipus === 'Javaslat') {
      this._renderJavaslat(lista, data);
    } else if (this.entitasTipus === 'Egyezmeny') {
      this._renderEgyezmeny(lista, data);
    } else {
      this._hamarosanSor(lista, 'Ehhez a típushoz a részletes nézet hamarosan elérhető.');
    }

    console.log('ReszletekModal._render - VÉGE');
  }

  // ===== GONDOLAT RÉSZLETEI =====
  // A backend válasza: { gondolat, tudatpont }.
  // A típus/kategória NEVEKET a kártya adataiból vesszük (a /reszletek nyers ID-kat ad).
  _renderGondolat(lista, data, ertekAdatok = null) {
    const gondolat  = data.gondolat  ?? {};
    const tudatpont = data.tudatpont ?? {};
    const adatok    = this.entitas?.adatok ?? {};

    // --- ALAPADATOK ---
    this._sor(lista, 'Cím',            adatok.cim ?? gondolat.cim ?? '—');
    this._sor(lista, 'Gondolattípus',  this._tipusFelirat(adatok));
    this._sor(lista, 'Kategóriák',     this._kategoriakFelirat(adatok));
    this._szerkesztokSor(lista,        gondolat.szerkesztok);
    this._sor(lista, 'Létrehozva',     this._datumFelirat(gondolat.letrehozva));
    // Itt (és CSAK itt) jelezzük a különbséget: a kártyán csak egy dátum van.
    this._sor(lista, 'Módosítva',      this._datumFelirat(gondolat.modositva ?? gondolat.letrehozva));

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
    this._kuszobSzakasz(lista, ertekAdatok);

    // --- AZONOSÍTÓ ---
    this._szakaszCim(lista, 'Azonosító');
    this._sor(lista, 'Entitás ID', this.entitasId ?? '—', 'reszletek-modal__ertek--halvany');
  }

  // ===== KATEGÓRIA RÉSZLETEI =====
  // A backend válasza: { kategoria, tudatpont }.
  _renderKategoria(lista, data, ertekAdatok = null) {
    const kategoria = data.kategoria ?? {};
    const tudatpont = data.tudatpont ?? {};
    this._renderNevesEntitas(lista, kategoria, tudatpont, 'Kategória', ertekAdatok);
  }

  // ===== GONDOLATTÍPUS RÉSZLETEI =====
  // A backend válasza: { gondolatTipus, tudatpont }.
  _renderGondolatTipus(lista, data, ertekAdatok = null) {
    const gondolatTipus = data.gondolatTipus ?? {};
    const tudatpont     = data.tudatpont     ?? {};
    this._renderNevesEntitas(lista, gondolatTipus, tudatpont, 'Gondolattípus', ertekAdatok);
  }

  // ===== KÖZÖS: NÉVVEL RENDELKEZŐ EGYSZERŰ ENTITÁS =====
  // A Kategória és a Gondolattípus szerkezete azonos (név, ikon, leírás,
  // létrehozó, dátum, tudatpont), ezért közös metódus rendereli mindkettőt.
  // @param {Object} entitasObj   - a backend kategoria / gondolatTipus objektuma
  // @param {Object} tudatpont    - { eemberHozzajarulas, osszesPont, hozzajarulokSzama }
  // @param {string} tipusFelirat - emberi típusnév a „Típus" sorba
  _renderNevesEntitas(lista, entitasObj, tudatpont, tipusFelirat, ertekAdatok = null) {
    // A nevet elsődlegesen a kártya adataiból vesszük (a /reszletek is adja).
    const adatok = this.entitas?.adatok ?? {};

    // --- ALAPADATOK ---
    this._sor(lista, 'Név',        adatok.nev ?? entitasObj.nev ?? '—');
    this._sor(lista, 'Típus',      tipusFelirat);
    this._szerkesztokSor(lista,    entitasObj.szerkesztok);
    this._sor(lista, 'Létrehozva', this._datumFelirat(entitasObj.letrehozva));
    // Itt (és CSAK itt) jelezzük a különbséget: a kártyán csak egy dátum van.
    this._sor(lista, 'Módosítva',  this._datumFelirat(entitasObj.modositva ?? entitasObj.letrehozva));

    // --- TUDATPONT ---
    this._szakaszCim(lista, 'Tudatpont');
    this._sor(lista, 'Saját pontod',       this._szam(tudatpont.eemberHozzajarulas));
    this._sor(lista, 'Összes (entitáson)', this._szam(tudatpont.osszesPont));
    this._sorGombbal(
      lista,
      'Hozzájárulók',
      this._szam(tudatpont.hozzajarulokSzama),
      'részletek',
      () => this._hozzajarulokReszletek()
    );
    this._sor(lista, 'Hierarchikus összes', this._szam(this.entitas?.hierarchikusOsszesPont));

    // --- KÜSZÖBÉRTÉKEK (MEDIÁN) ---
    this._kuszobSzakasz(lista, ertekAdatok);

    // --- AZONOSÍTÓ ---
    this._szakaszCim(lista, 'Azonosító');
    this._sor(lista, 'Entitás ID', this.entitasId ?? '—', 'reszletek-modal__ertek--halvany');
  }

  // ===== JAVASLAT RÉSZLETEI =====
  // A backend válasza: { javaslat, eeEmberSzavazat, szavazasiJogosultsag }.
  _renderJavaslat(lista, data) {
    const javaslat      = data.javaslat        ?? {};
    const sajatSzavazat = data.eeEmberSzavazat ?? null;

    // --- ALAPADATOK ---
    this._sor(lista, 'Javaslat típusa', JAVASLAT_TIPUS_FELIRAT[javaslat.javaslatTipus] ?? javaslat.javaslatTipus ?? '—');
    this._sor(lista, 'Státusz',         STATUSZ_FELIRAT[javaslat.statusz] ?? javaslat.statusz ?? '—');
    this._sor(lista, 'Létrehozó',       javaslat.letrehozo?.eemberNev ?? '—');
    this._sor(lista, 'Létrehozva',      this._datumFelirat(javaslat.letrehozva));

    // --- ÉRINTETT ENTITÁSOK ---
    this._erintettEntitasokSzakasz(lista, javaslat.erintettEntitasok);

    // --- SZAVAZÁS ÁLLÁSA ---
    this._szakaszCim(lista, 'Szavazás állása');
    this._sor(lista, 'Támogatók',            this._szam(javaslat.javaslatTamogatoinakSzama));
    this._sor(lista, 'Ellenzők',             this._szam(javaslat.javaslatEllenzoinekSzama));
    this._sor(lista, 'Tartózkodók',          this._szam(javaslat.javaslatTartozkodoinakSzama));
    this._sor(lista, 'Részvételi arány',     this._szazalek(javaslat.reszveteliArany));
    this._sor(lista, 'Támogatottsági arány', this._szazalek(javaslat.tamogatotsagiArany));
    this._sor(lista, 'Bizonyossági mutató',  this._szazalek(javaslat.bizonyossagiMutato));
    this._sor(lista, 'Döntési idő',          masodpercFelirat(javaslat.dontesiIdo));

    // --- SAJÁT RÉSZVÉTEL ---
    this._szakaszCim(lista, 'Saját részvételed');
    this._sor(lista, 'Szavazatod',  SZAVAZAT_FELIRAT[sajatSzavazat?.szavazatTipus] ?? 'Még nem szavaztál');

    // Az indoklás (rich text) szándékosan NEM jelenik meg itt: a kártya
    // body-jában úgyis látszik, és összetett gondolat is lehet.

    // --- AZONOSÍTÓ ---
    this._szakaszCim(lista, 'Azonosító');
    this._sor(lista, 'Entitás ID', this.entitasId ?? '—', 'reszletek-modal__ertek--halvany');
  }

  // ===== EGYEZMÉNY RÉSZLETEI =====
  // A backend válasza: { egyezmeny, tudatpontok }.
  // Az egyezmény a szavazási adatokat VÉGREHAJTÁSKORI pillanatképként tárolja.
  _renderEgyezmeny(lista, data) {
    const egyezmeny = data.egyezmeny   ?? {};
    const tudatpont = data.tudatpontok ?? {};

    // --- ALAPADATOK ---
    this._sor(lista, 'Javaslat típusa', JAVASLAT_TIPUS_FELIRAT[egyezmeny.javaslatTipus] ?? egyezmeny.javaslatTipus ?? '—');
    this._sor(lista, 'Létrehozó',       egyezmeny.letrehozo?.eemberNev ?? '—');
    this._sor(lista, 'Végrehajtva',     this._datumFelirat(egyezmeny.vegrehajtva));

    // --- ÉRINTETT ENTITÁSOK ---
    this._erintettEntitasokSzakasz(lista, egyezmeny.erintettEntitasok);

    // --- SZAVAZÁS (VÉGREHAJTÁSKORI PILLANATKÉP) ---
    this._szakaszCim(lista, 'Szavazás (végrehajtáskor)');
    this._sor(lista, 'Támogatók',            this._szam(egyezmeny.tamogatokSzama));
    this._sor(lista, 'Ellenzők',             this._szam(egyezmeny.ellenzokSzama));
    this._sor(lista, 'Tartózkodók',          this._szam(egyezmeny.tartozkodokSzama));
    this._sor(lista, 'Részvételi arány',     this._szazalek(egyezmeny.reszveteliArany));
    this._sor(lista, 'Támogatottsági arány', this._szazalek(egyezmeny.tamogatotsagiArany));
    this._sor(lista, 'Bizonyossági mutató',  this._szazalek(egyezmeny.bizonyossagiMutato));

    // --- TUDATPONT (AKTUÁLIS) ---
    this._szakaszCim(lista, 'Tudatpont');
    this._sor(lista, 'Saját pontod',       this._szam(tudatpont.eemberHozzajarulas));
    this._sor(lista, 'Összes (entitáson)', this._szam(tudatpont.osszesPont));
    this._sorGombbal(
      lista,
      'Hozzájárulók',
      this._szam(tudatpont.hozzajarulokSzama),
      'részletek',
      () => this._hozzajarulokReszletek()
    );
    this._sor(lista, 'Hierarchikus összes', this._szam(this.entitas?.hierarchikusOsszesPont));

    // Az indoklás (rich text) szándékosan NEM jelenik meg itt: a kártya
    // body-jában úgyis látszik, és összetett gondolat is lehet.

    // --- AZONOSÍTÓ ---
    this._szakaszCim(lista, 'Azonosító');
    this._sor(lista, 'Entitás ID', this.entitasId ?? '—', 'reszletek-modal__ertek--halvany');
  }

  // ===== SEGÉD: ÉRINTETT ENTITÁSOK SZAKASZ =====
  // A Javaslat és az Egyezmény is tárol egy `erintettEntitasok` tömböt:
  // [{ entitasId, entitasTipus, muvelet }]. Típus + művelet párként listázzuk.
  _erintettEntitasokSzakasz(lista, erintettEntitasok) {
    this._szakaszCim(lista, 'Érintett entitások');

    const elemek = Array.isArray(erintettEntitasok) ? erintettEntitasok : [];
    if (elemek.length === 0) {
      this._sor(lista, '—', 'nincs adat');
      return;
    }

    elemek.forEach((elem, index) => {
      const tipus   = ENTITAS_TIPUS_FELIRAT[elem.entitasTipus] ?? elem.entitasTipus ?? '—';
      const muvelet = JAVASLAT_TIPUS_FELIRAT[elem.muvelet]     ?? elem.muvelet      ?? '—';
      this._sor(lista, `${index + 1}. ${tipus}`, muvelet);
    });
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

  // ===== SEGÉD: SZERKESZTŐK SORA (több név, színezve) =====
  // Egy entitásnak (gondolat / kategória / gondolattípus) több szerkesztője lehet.
  // A neveket egymás ALÁ írjuk:
  //   - a LEGFELSŐ (0.) az utolsó szerkesztő → mindig ZÖLD,
  //   - az alatta lévők színe a szerint, hogy az UTOLJÁRA elfogadott módosításnál
  //     hogyan szavaztak: Tamogatja=zöld, Ellenzi=piros, egyéb (tartózkodott / nem
  //     szavazott)=fekete.
  // @param {Array} szerkesztok - [{ eemberId: { eemberNev }, allapot, eredeti }]
  _szerkesztokSor(lista, szerkesztok) {
    const elemek = Array.isArray(szerkesztok) ? szerkesztok : [];

    // Egy szerkesztőnél „Szerkesztő", többnél „Szerkesztők".
    const cimke = elemek.length > 1 ? 'Szerkesztők' : 'Szerkesztő';

    const sor = document.createElement('div');
    sor.className = 'reszletek-modal__sor reszletek-modal__sor--szerkesztok';

    const cimkeElem = document.createElement('span');
    cimkeElem.className   = 'reszletek-modal__cimke';
    cimkeElem.textContent = cimke;

    const ertekElem = document.createElement('span');
    ertekElem.className = 'reszletek-modal__ertek reszletek-modal__szerkesztok';

    if (elemek.length === 0) {
      // Nincs szerkesztő (pl. régi, migráció előtti entitás)
      ertekElem.textContent = '—';
    } else {
      // Minden szerkesztő egy külön, színezett név-sorba kerül
      elemek.forEach((sz, index) => {
        const nevElem = document.createElement('span');
        nevElem.className = 'reszletek-modal__szerkeszto ' + this._szerkesztoSzinOsztaly(sz, index);
        nevElem.textContent = sz?.eemberId?.eemberNev ?? '—'; // null eemberId = törölt e-ember
        ertekElem.appendChild(nevElem);
      });
    }

    sor.appendChild(cimkeElem);
    sor.appendChild(ertekElem);
    lista.appendChild(sor);
  }

  // ===== SEGÉD: EGY SZERKESZTŐ NEVÉNEK SZÍN-OSZTÁLYA =====
  // A 0. (legfelső) elem mindig zöld — ő az utolsó szerkesztő.
  // A többinél az `allapot` dönt.
  _szerkesztoSzinOsztaly(sz, index) {
    if (index === 0) return 'reszletek-modal__szerkeszto--tamogatja'; // az utolsó szerkesztő: zöld
    switch (sz?.allapot) {
      case 'Tamogatja': return 'reszletek-modal__szerkeszto--tamogatja'; // zöld
      case 'Ellenzi':   return 'reszletek-modal__szerkeszto--ellenzi';   // piros
      default:          return 'reszletek-modal__szerkeszto--semleges';  // Tartozkodik / NemSzavazott: fekete
    }
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

  // ===== KÜSZÖBÉRTÉK SZAKASZ (MEDIÁN) =====
  // A négy küszöb aktuális (medián) értéke; mindegyik mellett „részletek" gomb,
  // ami az érték-javaslatok eloszlását nyitja meg. Közös a Gondolat, Kategória
  // és Gondolattípus nézethez. Ha nincs ertekAdatok (pl. nincs hisztogram), kimarad.
  _kuszobSzakasz(lista, ertekAdatok) {
    if (!ertekAdatok) return;

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

  // ===== EGY KÜSZÖB ÉRTÉK-ELOSZLÁSA =====
  // Megnyitja az eloszlás al-modalt a megadott küszöbre (a Részletek modal felett).
  // @param {string} mezo     - a küszöb mezőneve (pl. 'minimumDontesiIdo')
  // @param {string} cimke    - emberi felirat a fejlécbe
  // @param {string} formatum - 'ido' | 'szazalek' | 'szam'
  async _ertekEloszlas(mezo, cimke, formatum) {
    console.log('ReszletekModal._ertekEloszlas - KEZDÉS', { mezo, formatum });

    const eloszlasModal = new ErtekEloszlasModal({
      entitasId:    this.entitasId,
      entitasTipus: this.entitasTipus,
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

  // ===== SEGÉD: TÍPUS FELIRAT =====
  _tipusFelirat(adatok) {
    const tipus = adatok?.gondolatTipus;
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
