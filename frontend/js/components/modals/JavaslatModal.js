// frontend/js/components/modal/JavaslatModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiPost } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';

// ===== JAVASLAT MODAL OSZTÁLY =====
// Három lépésben működik:
// 1. Típusválasztó (Törlés, Módosítás, Áthelyezés, Egyesítés, Csomag)
// 2. Típus-specifikus form (JS építi fel)
// 3. Indoklás + kezdő tudatpont (statikus HTML)
class JavaslatModal {

  // ===== KONSTRUKTOR =====
  constructor(kontenerAzonosito, beallitasok) {
    console.log('JavaslatModal.constructor - KEZDÉS', {
      kontenerAzonosito,
      entitasId:    beallitasok?.entitasAdatok?.entitasId,
      entitasTipus: beallitasok?.entitasAdatok?.entitasTipus
    });

    this.kontenerAzonosito = kontenerAzonosito;
    this.token             = tokenLekerese();
    this.entitasAdatok     = beallitasok.entitasAdatok ?? null;
    this.szuloAdatok       = beallitasok.szuloAdatok   ?? null;
    this.onSiker           = beallitasok.onSiker        ?? null;
    this.modal             = null;
    this.aktivLepes        = 1;
    this.kivalasztottTipus = null;

    // =============================================
    // ÚJ - SzovegSzerkeszto példányok referenciái
    // =============================================
    // A 2. lépés módosítás formájában lévő szöveg mezőhöz
    this.modositasSzovegSzerkeszto = null;
    // A 3. lépés indoklás mezőjéhez
    this.indoklasSzerkeszto = null;

    console.log('JavaslatModal.constructor - VÉGE', {
      entitasId: this.entitasAdatok?.entitasId,
      vanSzulo:  !!this.szuloAdatok?.szuloId
    });
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('JavaslatModal.init - KEZDÉS');

    const formHtml = await this._templateBetoltese();
    if (!formHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      'Javaslat indítása',
      tartalom: formHtml,
      meret:    'szeles',
      gombok:   [],
      onBezaras: () => {
        // =============================================
        // ÚJ - Szerkesztők megsemmisítése bezáráskor
        // =============================================
        this._szerkesztokMegsemmisitese();
        console.log('JavaslatModal - modal bezárva');
      }
    });

    await this.modal.init();

    this._tipusGombokBekotese();
    this._visszaGombokBekotese();
    this._mentesGombHozzaadasa();

    // =============================================
    // ÚJ - Indoklás szerkesztő inicializálása
    // =============================================
    // A 3. lépés indoklás mezője azonnal inicializálható,
    // mert a statikus HTML-ben van (nem JS építi fel)
    this._indoklasSzerkesztoLetrehozasa();

    console.log('JavaslatModal.init - VÉGE');
  }

  // =============================================
  // ÚJ - INDOKLÁS SZERKESZTŐ LÉTREHOZÁSA
  // =============================================
  // A 3. lépés statikus HTML-jében lévő konténerbe építi a szerkesztőt.
  // A template-ben: <div id="indoklas-szerkeszto-kontener"></div>
  // (a régi #javaslat-indoklas textarea helyett)
  _indoklasSzerkesztoLetrehozasa() {
    console.log('JavaslatModal._indoklasSzerkesztoLetrehozasa - KEZDÉS');

    const kontener = document.getElementById('indoklas-szerkeszto-kontener');
    if (!kontener) {
      console.warn('JavaslatModal._indoklasSzerkesztoLetrehozasa - kontener nem található');
      return;
    }

    // Indoklásnál entitás hivatkozás is releváns lehet
    // (pl. hivatkozhat egy másik tartalomra, ami alátámasztja a javaslatot)
    this.indoklasSzerkeszto = new SzovegSzerkeszto(kontener, {
      valtozasKezelo: null,
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        console.log('JavaslatModal - entitás hivatkozás az indoklásban koppintva', {
          entitasId,
          entitasTipus
        });
        // Modal bezárása és pakli váltás
        this.modal.bezaras();
        if (window.aktivPakli) {
          window.aktivPakli.entitasKivalasztasa(entitasId, entitasTipus);
        }
      }
    });

    console.log('JavaslatModal._indoklasSzerkesztoLetrehozasa - VÉGE');
  }

  // =============================================
  // ÚJ - MÓDOSÍTÁS SZÖVEG SZERKESZTŐ LÉTREHOZÁSA
  // =============================================
  // A _modositasFormaEpitese() hívja meg, miután a konténer elem létrejött.
  // @param {HTMLElement} szovegKontener - a szöveg szerkesztő befogadó eleme
  _modositasSzovegSzerkesztoLetrehozasa(szovegKontener) {
    console.log('JavaslatModal._modositasSzovegSzerkesztoLetrehozasa - KEZDÉS');

    // Ha volt korábbi példány, előbb megsemmisítjük
    if (this.modositasSzovegSzerkeszto) {
      this.modositasSzovegSzerkeszto.destroy();
      this.modositasSzovegSzerkeszto = null;
    }

    // Módosítás szöveg szerkesztőjébe betöltjük az aktuális szöveget
    const meglevoSzoveg = this.entitasAdatok?.adatok?.szoveg ?? null;

    this.modositasSzovegSzerkeszto = new SzovegSzerkeszto(szovegKontener, {
      valtozasKezelo:       null,
      onEntitasKivalasztas: null, // Módosítás formában nem kell hivatkozás koppintás
      kezdoBlokkok: Array.isArray(meglevoSzoveg)
        ? meglevoSzoveg
        : (meglevoSzoveg ? [{
            id:       'migralt-blokk-1',
            tipus:    'szoveg',
            tartalom: meglevoSzoveg,
            formatas: { felkover: false, dolt: false, meret: 'kozepes' }
          }] : [])
    });

    console.log('JavaslatModal._modositasSzovegSzerkesztoLetrehozasa - VÉGE');
  }

  // =============================================
  // ÚJ - SZERKESZTŐK MEGSEMMISÍTÉSE
  // =============================================
  // Modal bezárásakor hívjuk — mindkét szerkesztőt felszabadítja
  _szerkesztokMegsemmisitese() {
    console.log('JavaslatModal._szerkesztokMegsemmisitese - KEZDÉS');

    if (this.modositasSzovegSzerkeszto) {
      this.modositasSzovegSzerkeszto.destroy();
      this.modositasSzovegSzerkeszto = null;
    }

    if (this.indoklasSzerkeszto) {
      this.indoklasSzerkeszto.destroy();
      this.indoklasSzerkeszto = null;
    }

    console.log('JavaslatModal._szerkesztokMegsemmisitese - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  // Változatlan
  async _templateBetoltese() {
    console.log('JavaslatModal._templateBetoltese - KEZDÉS');
    try {
      const valasz = await fetch('./html/components/modals/javaslatModal.html');
      if (!valasz.ok) {
        console.error('JavaslatModal._templateBetoltese - HIBA: template nem található', {
          statusz: valasz.status
        });
        return null;
      }
      const htmlSzoveg = await valasz.text();
      console.log('JavaslatModal._templateBetoltese - VÉGE: sikeres betöltés');
      return htmlSzoveg;
    } catch (hiba) {
      console.error('JavaslatModal._templateBetoltese - VÉGE: kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  megnyitas() {
    console.log('JavaslatModal.megnyitas - KEZDÉS');
    this.modal?.megnyitas();
    console.log('JavaslatModal.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    console.log('JavaslatModal.bezaras - KEZDÉS');
    this.modal?.bezaras();
    console.log('JavaslatModal.bezaras - VÉGE');
  }

  // ===== TÍPUS GOMBOK BEKÖTÉSE =====
  // Változatlan
  _tipusGombokBekotese() {
    console.log('JavaslatModal._tipusGombokBekotese - KEZDÉS');

    const kontener  = document.getElementById(this.kontenerAzonosito);
    const tipusGombok = kontener?.querySelectorAll('.javaslat-modal__tipus-gomb');

    tipusGombok?.forEach((gomb) => {
      gomb.addEventListener('click', () => {
        const tipus = gomb.dataset.tipus;
        console.log('JavaslatModal - típus kiválasztva', { tipus });
        this.kivalasztottTipus = tipus;
        this._formaEpitese(tipus);
        this._lepesValtasa(2);
      });
    });

    console.log('JavaslatModal._tipusGombokBekotese - VÉGE', {
      gombokSzama: tipusGombok?.length
    });
  }

  // ===== VISSZA GOMBOK BEKÖTÉSE =====
  // Változatlan
  _visszaGombokBekotese() {
    console.log('JavaslatModal._visszaGombokBekotese - KEZDÉS');

    const kontener = document.getElementById(this.kontenerAzonosito);

    const vissza2 = kontener?.querySelector('#javaslat-vissza-gomb');
    vissza2?.addEventListener('click', () => {
      console.log('JavaslatModal - vissza az 1. lépésre');
      this._lepesValtasa(1);
    });

    const vissza3 = kontener?.querySelector('#javaslat-indoklas-vissza-gomb');
    vissza3?.addEventListener('click', () => {
      console.log('JavaslatModal - vissza a 2. lépésre');
      this._lepesValtasa(2);
    });

    console.log('JavaslatModal._visszaGombokBekotese - VÉGE');
  }

  // ===== LÉPÉSVÁLTÁS =====
  // Változatlan
  _lepesValtasa(ujLepes) {
    console.log('JavaslatModal._lepesValtasa - KEZDÉS', {
      regi: this.aktivLepes,
      uj:   ujLepes
    });

    const kontener = document.getElementById(this.kontenerAzonosito);
    const lepesek  = kontener?.querySelectorAll('.javaslat-modal__lepes');

    lepesek?.forEach((lepes) => {
      const lepesszam = parseInt(lepes.dataset.lepes, 10);
      if (lepesszam === ujLepes) {
        lepes.classList.remove('javaslat-modal__lepes--rejtett');
      } else {
        lepes.classList.add('javaslat-modal__lepes--rejtett');
      }
    });

    this.aktivLepes = ujLepes;

    const cimek = {
      1: 'Javaslat indítása',
      2: this._tipusCimLekerese(this.kivalasztottTipus),
      3: 'Indoklás'
    };
    this.modal?.tartalomFrissitese(cimek[ujLepes], null);

    console.log('JavaslatModal._lepesValtasa - VÉGE', { aktivLepes: this.aktivLepes });
  }

  // ===== TÍPUS CÍM LEKÉRÉSE =====
  // Változatlan
  _tipusCimLekerese(tipus) {
    console.log('JavaslatModal._tipusCimLekerese - KEZDÉS', { tipus });

    const cimek = {
      Torles:     'Törlési javaslat',
      Modositas:  'Módosítási javaslat',
      Athelyezes: 'Áthelyezési javaslat',
      Egyesites:  'Egyesítési javaslat',
      Csomag:     'Csomag javaslat'
    };

    const cim = cimek[tipus] ?? 'Javaslat';
    console.log('JavaslatModal._tipusCimLekerese - VÉGE', { cim });
    return cim;
  }

  // ===== FORMA ÉPÍTÉSE =====
  // Változatlan — a _modositasFormaEpitese belseje módosult
  _formaEpitese(tipus) {
    console.log('JavaslatModal._formaEpitese - KEZDÉS', { tipus });

    const kontener      = document.getElementById(this.kontenerAzonosito);
    const formaKontener = kontener?.querySelector('#javaslat-forma-kontener');

    if (!formaKontener) {
      console.error('JavaslatModal._formaEpitese - HIBA: forma konténer nem található');
      return;
    }

    formaKontener.innerHTML = '';

    switch (tipus) {
      case 'Torles':     this._torlesFormaEpitese(formaKontener);     break;
      case 'Modositas':  this._modositasFormaEpitese(formaKontener);  break;
      case 'Athelyezes': this._athelyezesFormaEpitese(formaKontener); break;
      case 'Egyesites':  this._egyesitesFormaEpitese(formaKontener);  break;
      case 'Csomag':     this._csomagFormaEpitese(formaKontener);     break;
      default:
        console.warn('JavaslatModal._formaEpitese - FIGYELEM: ismeretlen típus', { tipus });
    }

    this._tovabbGombHozzaadasa(formaKontener);

    console.log('JavaslatModal._formaEpitese - VÉGE', { tipus });
  }

  // ===== TÖRLÉS FORMA ÉPÍTÉSE =====
  // Változatlan
  _torlesFormaEpitese(kontener) {
    console.log('JavaslatModal._torlesFormaEpitese - KEZDÉS', {
      entitasId: this.entitasAdatok?.entitasId
    });

    const figyelmeztetesDiv = document.createElement('div');
    figyelmeztetesDiv.className = 'javaslat-modal__figyelmeztetes';

    const entitasNev = this.entitasAdatok?.adatok?.cim
      ?? this.entitasAdatok?.adatok?.nev
      ?? 'Ez az entitás';

    const szoveg = document.createElement('p');
    szoveg.className   = 'javaslat-modal__figyelmeztetes-szoveg';
    szoveg.textContent = `„${entitasNev}" törlésére vonatkozó javaslat kerül benyújtásra. A törlés csak akkor lép érvénybe, ha a közösség elfogadja.`;

    figyelmeztetesDiv.appendChild(szoveg);
    kontener.appendChild(figyelmeztetesDiv);

    console.log('JavaslatModal._torlesFormaEpitese - VÉGE', { entitasNev });
  }

  // ===== MÓDOSÍTÁS FORMA ÉPÍTÉSE =====
  // =============================================
  // MÓDOSÍTVA - szöveg mező SzovegSzerkesztővel
  // =============================================
  _modositasFormaEpitese(kontener) {
    console.log('JavaslatModal._modositasFormaEpitese - KEZDÉS', {
      entitasId: this.entitasAdatok?.entitasId
    });

    const adatok = this.entitasAdatok?.adatok ?? {};

    // Cím mező – sima input marad (cím nem rich text)
    const cimCsoport = this._mezoCsoportLetrehozasa(
      'javaslat-modositas-cim',
      'Új cím',
      'input',
      { placeholder: 'Tartalom új neve', ertek: adatok.cim ?? '' }
    );
    kontener.appendChild(cimCsoport);

    // =============================================
    // ÚJ - Szöveg mező: SzovegSzerkesztő konténer
    // =============================================
    // A régi textarea helyett egy div konténert hozunk létre,
    // és abba példányosítjuk a szerkesztőt
    const szovegCsoportDiv = document.createElement('div');
    szovegCsoportDiv.className = 'javaslat-modal__mezo-csoport';

    const szovegCimke = document.createElement('label');
    szovegCimke.className   = 'javaslat-modal__cimke';
    szovegCimke.textContent = 'Új szöveg';

    const szovegSzerkesztoKontener = document.createElement('div');
    szovegSzerkesztoKontener.id = 'javaslat-modositas-szoveg-kontener';

    szovegCsoportDiv.appendChild(szovegCimke);
    szovegCsoportDiv.appendChild(szovegSzerkesztoKontener);
    kontener.appendChild(szovegCsoportDiv);

    // Szerkesztő példányosítása a most létrehozott konténerbe
    // (a DOM-ba kerülés után azonnal, szinkron módon)
    this._modositasSzovegSzerkesztoLetrehozasa(szovegSzerkesztoKontener);

    console.log('JavaslatModal._modositasFormaEpitese - VÉGE');
  }

  // ===== ÁTHELYEZÉS FORMA ÉPÍTÉSE =====
  // Változatlan
  _athelyezesFormaEpitese(kontener) {
    console.log('JavaslatModal._athelyezesFormaEpitese - KEZDÉS');

    const szuloCsoport = this._mezoCsoportLetrehozasa(
      'javaslat-athelyezes-uj-szulo-id',
      'Új szülő azonosítója',
      'input',
      { placeholder: 'Az új szülő entitás ID-ja' }
    );
    kontener.appendChild(szuloCsoport);

    console.log('JavaslatModal._athelyezesFormaEpitese - VÉGE');
  }

  // ===== EGYESÍTÉS FORMA ÉPÍTÉSE =====
  // Változatlan
  _egyesitesFormaEpitese(kontener) {
    console.log('JavaslatModal._egyesitesFormaEpitese - KEZDÉS');

    const tipusCsoport = document.createElement('div');
    tipusCsoport.className = 'javaslat-modal__mezo-csoport';

    const tipusCimke = document.createElement('label');
    tipusCimke.className = 'javaslat-modal__cimke';
    tipusCimke.htmlFor   = 'javaslat-egyesites-uj-tipus';
    tipusCimke.textContent = 'Új entitás típusa';

    const tipusSelect = document.createElement('select');
    tipusSelect.className = 'javaslat-modal__select';
    tipusSelect.id        = 'javaslat-egyesites-uj-tipus';

    [
      { ertek: '',              felirat: '— válassz típust —' },
      { ertek: 'Tartalom',      felirat: 'Tartalom'           },
      { ertek: 'Kategoria',     felirat: 'Kategória'          },
      { ertek: 'TartalomTipus', felirat: 'TartalomTípus'      }
    ].forEach(({ ertek, felirat }) => {
      const option       = document.createElement('option');
      option.value       = ertek;
      option.textContent = felirat;
      tipusSelect.appendChild(option);
    });

    tipusCsoport.appendChild(tipusCimke);
    tipusCsoport.appendChild(tipusSelect);
    kontener.appendChild(tipusCsoport);

    const nevCsoport = this._mezoCsoportLetrehozasa(
      'javaslat-egyesites-uj-nev',
      'Új entitás neve',
      'input',
      { placeholder: 'Az egyesítésből létrejövő entitás neve' }
    );
    kontener.appendChild(nevCsoport);

    const forrasCsoport = this._mezoCsoportLetrehozasa(
      'javaslat-egyesites-forras-id',
      'Másik forrás entitás azonosítója',
      'input',
      { placeholder: 'A másik egyesítendő entitás ID-ja' }
    );
    kontener.appendChild(forrasCsoport);

    console.log('JavaslatModal._egyesitesFormaEpitese - VÉGE');
  }

  // ===== CSOMAG FORMA ÉPÍTÉSE =====
  // Változatlan
  _csomagFormaEpitese(kontener) {
    console.log('JavaslatModal._csomagFormaEpitese - KEZDÉS');

    const info = document.createElement('p');
    info.className   = 'javaslat-modal__info-szoveg';
    info.textContent = 'A csomag javaslat összetett, több műveletet tartalmaz. Ez a funkció hamarosan elérhető lesz.';
    kontener.appendChild(info);

    console.log('JavaslatModal._csomagFormaEpitese - VÉGE');
  }

  // ===== MEZŐ CSOPORT LÉTREHOZÁSA =====
  // Változatlan
  _mezoCsoportLetrehozasa(id, cimkeSzoveg, elemTipus, beallitasok = {}) {
    console.log('JavaslatModal._mezoCsoportLetrehozasa - KEZDÉS', { id, elemTipus });

    const csoport = document.createElement('div');
    csoport.className = 'javaslat-modal__mezo-csoport';

    const cimke = document.createElement('label');
    cimke.className   = 'javaslat-modal__cimke';
    cimke.htmlFor     = id;
    cimke.textContent = cimkeSzoveg;

    const elem = document.createElement(elemTipus);
    elem.className = elemTipus === 'textarea'
      ? 'javaslat-modal__textarea'
      : 'javaslat-modal__input';
    elem.id   = id;
    elem.name = id;

    if (beallitasok.placeholder) elem.placeholder = beallitasok.placeholder;
    if (beallitasok.ertek)       elem.value       = beallitasok.ertek;
    if (elemTipus === 'textarea') elem.rows        = 3;

    csoport.appendChild(cimke);
    csoport.appendChild(elem);

    console.log('JavaslatModal._mezoCsoportLetrehozasa - VÉGE', { id });
    return csoport;
  }

  // ===== TOVÁBB GOMB HOZZÁADÁSA =====
  // Változatlan
  _tovabbGombHozzaadasa(kontener) {
    console.log('JavaslatModal._tovabbGombHozzaadasa - KEZDÉS');

    const gomb = document.createElement('button');
    gomb.type      = 'button';
    gomb.className = 'javaslat-modal__tovabb-gomb';
    gomb.textContent = 'Tovább →';

    gomb.addEventListener('click', () => {
      console.log('JavaslatModal - tovább a 3. lépésre');
      this._lepesValtasa(3);
    });

    kontener.appendChild(gomb);

    console.log('JavaslatModal._tovabbGombHozzaadasa - VÉGE');
  }

  // ===== MENTÉS GOMB HOZZÁADÁSA =====
  // Változatlan
  _mentesGombHozzaadasa() {
    console.log('JavaslatModal._mentesGombHozzaadasa - KEZDÉS');

    const kontener      = document.getElementById(this.kontenerAzonosito);
    const harmadikLepes = kontener?.querySelector('[data-lepes="3"]');

    if (!harmadikLepes) {
      console.error('JavaslatModal._mentesGombHozzaadasa - HIBA: 3. lépés nem található');
      return;
    }

    const gomb = document.createElement('button');
    gomb.type      = 'button';
    gomb.id        = 'javaslat-beküldes-gomb';
    gomb.className = 'javaslat-modal__beküldes-gomb';
    gomb.textContent = 'Javaslat beküldése';

    gomb.addEventListener('click', () => this._mentes());

    harmadikLepes.appendChild(gomb);

    console.log('JavaslatModal._mentesGombHozzaadasa - VÉGE');
  }

  // ===== VALIDÁLÁS =====
  // =============================================
  // MÓDOSÍTVA - indoklás ellenőrzése szerkesztőből
  // =============================================
  _validalas() {
    console.log('JavaslatModal._validalas - KEZDÉS', { tipus: this.kivalasztottTipus });

    if (!this.kivalasztottTipus) {
      console.log('JavaslatModal._validalas - VÉGE: típus hiányzik');
      return 'Kérjük, válassz javaslat típust.';
    }

    // =============================================
    // ÚJ - Indoklás ellenőrzése a szerkesztőből
    // =============================================
    // A szerkesztő tartalmát blokkokból nyerjük ki,
    // és ellenőrizzük, hogy van-e érdemi szöveges tartalom
    if (this.indoklasSzerkeszto) {
      const blokkok  = this.indoklasSzerkeszto.getTartalom();
      const vanSzoveg = blokkok.some(b =>
        b.tipus === 'szoveg' && b.tartalom?.trim().length >= 10
      );
      if (!vanSzoveg) {
        console.log('JavaslatModal._validalas - VÉGE: indoklás túl rövid');
        return 'Az indoklás legalább 10 karakter hosszú szöveges tartalmat igényel.';
      }
    }

    const kontener       = document.getElementById(this.kontenerAzonosito);
    const kezdoTudatpont = parseInt(
      kontener?.querySelector('#javaslat-kezdo-tudatpont')?.value
    );
    if (!kezdoTudatpont || kezdoTudatpont < 1) {
      console.log('JavaslatModal._validalas - VÉGE: érvénytelen tudatpont');
      return 'Legalább 1 kezdő tudatpontot meg kell adni.';
    }

    console.log('JavaslatModal._validalas - VÉGE: sikeres');
    return null;
  }

  // ===== ADATOK ÖSSZEGYŰJTÉSE =====
  // =============================================
  // MÓDOSÍTVA - indoklás és módosítás szöveg szerkesztőkből
  // =============================================
  _adatokOsszegyujtese() {
    console.log('JavaslatModal._adatokOsszegyujtese - KEZDÉS', {
      tipus: this.kivalasztottTipus
    });

    const kontener = document.getElementById(this.kontenerAzonosito);

    // =============================================
    // ÚJ - Indoklás lekérése a szerkesztőből
    // =============================================
    const indoklas = this.indoklasSzerkeszto
      ? this.indoklasSzerkeszto.getTartalom()
      : [];

    const kezdoTudatpont = parseInt(
      kontener?.querySelector('#javaslat-kezdo-tudatpont')?.value
    );

    const adatok = {
      javaslatTipus: this.kivalasztottTipus,
      szuloId:       this.szuloAdatok?.szuloId,
      szuloTipus:    this.szuloAdatok?.szuloTipus ?? 'Tartalom',
      indoklas,      // Blokkok tömbje, nem sima string
      kezdoTudatpont,
      erintettEntitasok: [
        {
          entitasId:       this.entitasAdatok?.entitasId,
          entitasTipus:    this.entitasAdatok?.entitasTipus ?? 'Tartalom',
          muvelet:         this._muveletMeghatározása(this.kivalasztottTipus),
          modositasAdatok: this._modositasAdatokOsszegyujtese()
        }
      ]
    };

    if (this.kivalasztottTipus === 'Egyesites') {
      adatok.egyesitesAdatok = this._egyesitesAdatokOsszegyujtese(kontener);
    }

    console.log('JavaslatModal._adatokOsszegyujtese - VÉGE', {
      tipus:           adatok.javaslatTipus,
      szuloId:         adatok.szuloId,
      erintettekSzama: adatok.erintettEntitasok.length,
      indoklasBlokkSzama: indoklas.length
    });
    return adatok;
  }

  // ===== MÓDOSÍTÁS ADATOK ÖSSZEGYŰJTÉSE =====
  // =============================================
  // MÓDOSÍTVA - szöveg szerkesztőből lekérve
  // =============================================
  _modositasAdatokOsszegyujtese() {
    console.log('JavaslatModal._modositasAdatokOsszegyujtese - KEZDÉS', {
      tipus: this.kivalasztottTipus
    });

    const kontener       = document.getElementById(this.kontenerAzonosito);
    const modositasAdatok = {};

    if (this.kivalasztottTipus === 'Modositas') {
      const ujCim = kontener?.querySelector('#javaslat-modositas-cim')?.value?.trim();
      if (ujCim) modositasAdatok.cim = ujCim;

      // =============================================
      // ÚJ - Szöveg lekérése a módosítás szerkesztőből
      // =============================================
      if (this.modositasSzovegSzerkeszto) {
        const szovegBlokkok = this.modositasSzovegSzerkeszto.getTartalom();
        // Csak akkor küldjük, ha van tartalom
        if (szovegBlokkok.length > 0) {
          modositasAdatok.szoveg = szovegBlokkok;
        }
      }
    }

    if (this.kivalasztottTipus === 'Athelyezes') {
      const ujSzuloId = kontener?.querySelector('#javaslat-athelyezes-uj-szulo-id')?.value?.trim();
      if (ujSzuloId) modositasAdatok.ujSzuloId = ujSzuloId;
    }

    console.log('JavaslatModal._modositasAdatokOsszegyujtese - VÉGE', { modositasAdatok });
    return modositasAdatok;
  }

  // ===== EGYESÍTÉS ADATOK ÖSSZEGYŰJTÉSE =====
  // Változatlan
  _egyesitesAdatokOsszegyujtese(kontener) {
    console.log('JavaslatModal._egyesitesAdatokOsszegyujtese - KEZDÉS');

    const ujTipus  = kontener?.querySelector('#javaslat-egyesites-uj-tipus')?.value;
    const ujNev    = kontener?.querySelector('#javaslat-egyesites-uj-nev')?.value?.trim();
    const forrasId = kontener?.querySelector('#javaslat-egyesites-forras-id')?.value?.trim();

    const egyesitesAdatok = {
      ujEntitasTipus:  ujTipus   || undefined,
      ujEntitasAdatok: ujNev     ? { nev: ujNev } : undefined,
      forrasEntitasok: forrasId  ? [forrasId]     : []
    };

    console.log('JavaslatModal._egyesitesAdatokOsszegyujtese - VÉGE', { egyesitesAdatok });
    return egyesitesAdatok;
  }

  // ===== MENTÉS =====
  // Változatlan
  async _mentes() {
    console.log('JavaslatModal._mentes - KEZDÉS', { tipus: this.kivalasztottTipus });

    const hibaUzenet = this._validalas();
    if (hibaUzenet) {
      this.modal.hibaBeallitasa(hibaUzenet);
      return;
    }

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      const adatok  = this._adatokOsszegyujtese();
      const eredmeny = await apiPost('javaslat', adatok, this.token);

      this.modal.betoltesBeallitasa(false);
      this.modal.bezaras();

      if (typeof this.onSiker === 'function') {
        this.onSiker(eredmeny?.javaslat);
      }

      console.log('JavaslatModal._mentes - VÉGE: sikeres', {
        javaslatId: eredmeny?.javaslat?._id
      });

    } catch (hiba) {
      console.error('JavaslatModal._mentes - HIBA', hiba.message);
      this.modal.hibaBeallitasa(hiba.message ?? 'Mentés sikertelen, kérjük próbáld újra.');
    }
  }
}

// ===== EXPORTÁLÁS =====
export default JavaslatModal;