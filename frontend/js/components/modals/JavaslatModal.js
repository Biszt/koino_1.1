// frontend/js/components/modal/JavaslatModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, apiPost } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import SzovegSzerkeszto from '../szovegSzerkeszto/SzovegSzerkeszto.js';
import EntitasKeresoMezo from '../EntitasKeresoMezo.js';
import { engedelyezettJavaslatTipusok, egyesitesForrasTipusok, egyesitesEredmenyTipus } from '../../utils/javaslatSzabalyok.js';

// Speciális egyezmény tárhely érték Egyesítésnél:
// azt jelzi a backendnek, hogy az egyesítésből létrejövő ÚJ entitás
// lesz az egyezmény tárhelye (végrehajtás után a tényleges ID-ra cserélődik)
const UJ_ENTITAS_TARHELY_PLACEHOLDER = 'eeeeeeeeeeeeeeeeeeee0001';

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

    // =============================================
    // ÚJ - ID-ellenőrző mezők referenciái
    // =============================================
    // Áthelyezés: új szülő gondolat mezője
    this.ujSzuloMezo = null;
    // Egyesítés: forrás entitás mezők (dinamikus lista)
    this.forrasMezok = [];
    // Egyesítés: az új entitás szülő gondolatának mezője (KÖTELEZŐ)
    this.egyesitesSzuloMezo = null;
    // 3. lépés: opcionális egyezmény tárhely mező
    this.egyezmenyTarhelyMezo = null;
    // Csomag: tételek listája — { idMezo, muveletSelect, cimInput, celMezo, sorElem }
    this.csomagTetelek = [];

    // =============================================
    // ÚJ - MÓDOSÍTÁS: kategória + gondolattípus választó adatai
    // =============================================
    // Csak Gondolat entitás módosításánál használjuk. A listákat az init()
    // tölti be a szerverről (apiGet), a kiválasztott kategóriákat menet közben követjük.
    this.gondolatTipusok         = []; // az összes választható gondolattípus
    this.kategoriak              = []; // az összes választható kategória (fához is)
    this.kivalasztottKategoriaIds = []; // a módosítás után érvényes kategória-ID-k (max 3)

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
      meret:    'korlatlan', // A szerkesztő olyan széles lehessen, mint a (korlátlan) kártyák
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

    // =============================================
    // ÚJ - Egyezmény tárhely mező inicializálása
    // =============================================
    // Opcionális ID-ellenőrző mező a 3. lépésben: hova kerüljön
    // a javaslat elfogadása után létrejövő egyezmény
    this._egyezmenyTarhelyMezoLetrehozasa();

    // =============================================
    // ÚJ - MÓDOSÍTÁS választó-listák előtöltése (csak Gondolatnál)
    // =============================================
    // A módosítási forma a 2. lépésben épül fel; a gondolattípus- és
    // kategória-legördülőhöz szükséges listákat itt, előre lekérjük, hogy
    // a forma felépülésekor már rendelkezésre álljanak.
    if ((this.entitasAdatok?.entitasTipus ?? 'Gondolat') === 'Gondolat') {
      await this._modositasLenyilokBetoltese();
    }

    console.log('JavaslatModal.init - VÉGE');
  }

  // =============================================
  // ÚJ - EGYEZMÉNY TÁRHELY MEZŐ LÉTREHOZÁSA
  // =============================================
  // A 3. lépés statikus HTML-jében lévő #egyezmeny-tarhely-kontener-be
  // építi az opcionális ID-ellenőrző mezőt. Üresen hagyva a mentés
  // az alapértelmezést használja (Egyesítés: új entitás placeholder,
  // más típus: a javaslat szülő gondolata).
  _egyezmenyTarhelyMezoLetrehozasa() {
    console.log('JavaslatModal._egyezmenyTarhelyMezoLetrehozasa - KEZDÉS');

    const kontener = document.getElementById('egyezmeny-tarhely-kontener');
    if (!kontener) {
      console.warn('JavaslatModal._egyezmenyTarhelyMezoLetrehozasa - kontener nem található');
      return;
    }

    this.egyezmenyTarhelyMezo = new EntitasKeresoMezo(kontener, {
      cimke:       'Egyezmény tárhely (opcionális)', // A 3. lépésre lépéskor típusfüggően frissül (Csomagnál kötelező)
      placeholder: 'Keress cím alapján a tárhelynek',
      tipusok:     ['Gondolat'], // Az egyezmény tárhelye mindig gondolat
      token:       this.token
    });

    console.log('JavaslatModal._egyezmenyTarhelyMezoLetrehozasa - VÉGE');
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
    // (pl. hivatkozhat egy másik gondolatra, ami alátámasztja a javaslatot)
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
    // Gondolat entitásnál a mező neve szoveg, Kategória/GondolatTípusnál szovegMezo
    const meglevoSzoveg = this.entitasAdatok?.adatok?.szoveg
      ?? this.entitasAdatok?.adatok?.szovegMezo
      ?? null;

    // A SzovegSzerkeszto a blokk-tömböt ÉS a több oldalas formátumot is felismeri —
    // csak a régi, sima string gondolatot kell blokkba csomagolni
    this.modositasSzovegSzerkeszto = new SzovegSzerkeszto(szovegKontener, {
      valtozasKezelo:       null,
      onEntitasKivalasztas: null, // Módosítás formában nem kell hivatkozás koppintás
      kezdoBlokkok: typeof meglevoSzoveg === 'string'
        ? [{
            id:       'migralt-blokk-1',
            tipus:    'szoveg',
            tartalom: meglevoSzoveg,
            formatas: { felkover: false, dolt: false, meret: 'kozepes' }
          }]
        : (meglevoSzoveg ?? [])
    });

    console.log('JavaslatModal._modositasSzovegSzerkesztoLetrehozasa - VÉGE');
  }

  // =============================================
  // ÚJ - SZERKESZTŐK MEGSEMMISÍTÉSE
  // =============================================
  // Modal bezárásakor hívjuk — minden szerkesztőt és ID-mezőt felszabadít
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

    if (this.ujSzuloMezo) {
      this.ujSzuloMezo.destroy();
      this.ujSzuloMezo = null;
    }

    if (this.egyesitesSzuloMezo) {
      this.egyesitesSzuloMezo.destroy();
      this.egyesitesSzuloMezo = null;
    }

    if (this.egyezmenyTarhelyMezo) {
      this.egyezmenyTarhelyMezo.destroy();
      this.egyezmenyTarhelyMezo = null;
    }

    this.forrasMezok.forEach(mezo => mezo.destroy());
    this.forrasMezok = [];

    this.csomagTetelek.forEach(tetel => {
      tetel.idMezo?.destroy();
      tetel.celMezo?.destroy();
    });
    this.csomagTetelek = [];

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

    // Az entitástípuson engedélyezett javaslat-típusok (domain-szabály).
    // A tiltott típusok gombjait elrejtjük — a backend külön is kikényszeríti.
    const entitasTipus = this.entitasAdatok?.entitasTipus ?? 'Gondolat';
    const engedett = engedelyezettJavaslatTipusok(entitasTipus);
    console.log('JavaslatModal._tipusGombokBekotese - engedélyezett típusok', { entitasTipus, engedett });

    tipusGombok?.forEach((gomb) => {
      const tipus = gomb.dataset.tipus;

      // Tiltott típus → a gomb elrejtése (nem választható)
      if (!engedett.includes(tipus)) {
        gomb.hidden = true;
        gomb.setAttribute('aria-hidden', 'true');
        return;
      }

      gomb.addEventListener('click', () => {
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

    // =============================================
    // Egyezmény tárhely felirata típusfüggően (a 3. lépésre lépéskor)
    // =============================================
    // Csomagnál KÖTELEZŐ megadni, hova kerüljön az elfogadott csomag egyezménye
    // (a létrehozó dönt, nincs automatikus levezetés). Minden más típusnál opcionális.
    if (ujLepes === 3 && this.egyezmenyTarhelyMezo) {
      if (this.kivalasztottTipus === 'Csomag') {
        this.egyezmenyTarhelyMezo.cimkeFrissitese('Egyezmény tárhely * (ide kerül a csomag egyezménye)');
      } else {
        this.egyezmenyTarhelyMezo.cimkeFrissitese('Egyezmény tárhely (opcionális)');
      }
    }

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

    // Típusváltáskor a korábbi típus-specifikus mezőket felszabadítjuk,
    // hogy ne maradjanak árva példányok és időzítők
    if (this.ujSzuloMezo) { this.ujSzuloMezo.destroy(); this.ujSzuloMezo = null; }
    if (this.egyesitesSzuloMezo) { this.egyesitesSzuloMezo.destroy(); this.egyesitesSzuloMezo = null; }
    this.forrasMezok.forEach(mezo => mezo.destroy());
    this.forrasMezok = [];
    this.csomagTetelek.forEach(tetel => {
      tetel.idMezo?.destroy();
      tetel.celMezo?.destroy();
    });
    this.csomagTetelek = [];
    if (this.modositasSzovegSzerkeszto) {
      this.modositasSzovegSzerkeszto.destroy();
      this.modositasSzovegSzerkeszto = null;
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
      entitasId:    this.entitasAdatok?.entitasId,
      entitasTipus: this.entitasAdatok?.entitasTipus
    });

    const adatok = this.entitasAdatok?.adatok ?? {};

    // Az entitás típusától függ, mit hívnak a mezők:
    // Gondolat → cim + szoveg; Kategória/GondolatTípus → nev + szovegMezo
    const gondolatE = (this.entitasAdatok?.entitasTipus ?? 'Gondolat') === 'Gondolat';

    // Cím/név mező – sima input marad (nem rich text)
    const cimCsoport = this._mezoCsoportLetrehozasa(
      'javaslat-modositas-cim',
      gondolatE ? 'Új cím' : 'Új név',
      'input',
      {
        placeholder: gondolatE ? 'Gondolat új címe' : 'Új név',
        ertek: (gondolatE ? adatok.cim : adatok.nev) ?? ''
      }
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

    // =============================================
    // ÚJ - Gondolattípus + kategória mezők (CSAK Gondolatnál)
    // =============================================
    // Kategória és gondolattípus csak a Gondolat entitásra értelmezett
    // (a Kategória és a Gondolattípus entitásoknak nincs ilyen mezőjük).
    if (gondolatE) {
      this._modositasTipusMezoEpitese(kontener, adatok);
      this._modositasKategoriaMezoEpitese(kontener, adatok);
    }

    console.log('JavaslatModal._modositasFormaEpitese - VÉGE');
  }

  // ===== MÓDOSÍTÁS: GONDOLATTÍPUS MEZŐ ÉPÍTÉSE =====
  // =============================================
  // ÚJ - egyszerű legördülő a gondolat típusához
  // =============================================
  // A listát az init() már betöltötte (this.gondolatTipusok). Az aktuális
  // típust előre kiválasztjuk az adatok.gondolatTipus.id alapján.
  _modositasTipusMezoEpitese(kontener, adatok) {
    console.log('JavaslatModal._modositasTipusMezoEpitese - KEZDÉS', {
      tipusokSzama: this.gondolatTipusok.length
    });

    const csoport = document.createElement('div');
    csoport.className = 'javaslat-modal__mezo-csoport';

    const cimke = document.createElement('label');
    cimke.className   = 'javaslat-modal__cimke';
    cimke.htmlFor     = 'javaslat-modositas-tipus';
    cimke.textContent = 'Gondolat típusa';

    const select = document.createElement('select');
    select.id        = 'javaslat-modositas-tipus';
    select.name      = 'javaslat-modositas-tipus';
    select.className = 't-modal-select'; // a GondolatModal-ból örökölt közös stílus

    // Első, „nincs típus" opció — a gondolatTipusId nem kötelező mező
    const uresOpcio = document.createElement('option');
    uresOpcio.value       = '';
    uresOpcio.textContent = '– Nincs típus –';
    select.appendChild(uresOpcio);

    // A választható típusok feltöltése
    this.gondolatTipusok.forEach(tipus => {
      const opcio       = document.createElement('option');
      opcio.value       = tipus._id;
      opcio.textContent = tipus.nev;
      select.appendChild(opcio);
    });

    // Aktuális típus előre kiválasztása (a kártya adatok.gondolatTipus.id-jából)
    const jelenlegiTipusId = adatok?.gondolatTipus?.id ?? adatok?.gondolatTipusId ?? '';
    if (jelenlegiTipusId) select.value = jelenlegiTipusId.toString();

    csoport.appendChild(cimke);
    csoport.appendChild(select);
    kontener.appendChild(csoport);

    console.log('JavaslatModal._modositasTipusMezoEpitese - VÉGE', {
      jelenlegiTipusId: jelenlegiTipusId?.toString?.() ?? null
    });
  }

  // ===== MÓDOSÍTÁS: KATEGÓRIA MEZŐ ÉPÍTÉSE =====
  // =============================================
  // ÚJ - chip-es, maximum 3 kategóriás választó (a GondolatModal mintájára)
  // =============================================
  // A már kiválasztott kategóriák „chip"-ként jelennek meg (✕-szel törölhetők),
  // a legördülőben pedig csak a MÉG nem választott kategóriák maradnak.
  _modositasKategoriaMezoEpitese(kontener, adatok) {
    console.log('JavaslatModal._modositasKategoriaMezoEpitese - KEZDÉS');

    // A kiválasztott lista mindig tiszta lappal indul a forma felépítésekor
    this.kivalasztottKategoriaIds = [];

    const csoport = document.createElement('div');
    csoport.className = 'javaslat-modal__mezo-csoport';

    const cimke = document.createElement('label');
    cimke.className   = 'javaslat-modal__cimke';
    cimke.htmlFor     = 'javaslat-modositas-kategoria';
    cimke.textContent = 'Kategóriák (max. 3)';

    // A már kiválasztott kategóriák chip-jeit befogadó konténer
    const chipKontener = document.createElement('div');
    chipKontener.id        = 'javaslat-modositas-kategoria-chipek';
    chipKontener.className = 't-modal-kategoria-chipek';

    // A választó legördülő
    const select = document.createElement('select');
    select.id        = 'javaslat-modositas-kategoria';
    select.name      = 'javaslat-modositas-kategoria';
    select.className = 't-modal-select';

    csoport.appendChild(cimke);
    csoport.appendChild(chipKontener);
    csoport.appendChild(select);
    kontener.appendChild(csoport);

    // A legördülő feltöltése + a hozzáadás-esemény bekötése
    this._modositasKategoriaSelectFeltoltese();
    this._modositasKategoriaValasztoBekotese();

    // Aktuális kategóriák előre betöltése chipként (a kártya adatok.kategoriak-jából).
    // Az elemek alakja: { id, nev, ikon } — közvetlenül van nevünk, nem kell keresés.
    (adatok?.kategoriak ?? []).forEach(kategoria => {
      const id  = (kategoria.id ?? kategoria._id)?.toString();
      const nev = kategoria.nev ?? '(névtelen)';
      if (id && !this.kivalasztottKategoriaIds.includes(id)) {
        this.kivalasztottKategoriaIds.push(id);
        this._modositasKategoriaChipHozzaadasa(id, nev);
      }
    });
    // A legördülőt frissítjük, hogy a már kiválasztottak kiessenek belőle
    this._modositasKategoriaSelectFeltoltese();

    console.log('JavaslatModal._modositasKategoriaMezoEpitese - VÉGE', {
      eloreKivalasztott: this.kivalasztottKategoriaIds.length
    });
  }

  // ===== MÓDOSÍTÁS: VÁLASZTÓ-LISTÁK BETÖLTÉSE =====
  // =============================================
  // ÚJ - a gondolattípusok és kategóriák lekérése a szerverről
  // =============================================
  // Az init() hívja meg (csak Gondolat entitásnál). Hiba esetén üres listákkal
  // folytatunk — ilyenkor a mezők egyszerűen üresek lesznek, a javaslat többi
  // része (cím, szöveg) továbbra is működik.
  async _modositasLenyilokBetoltese() {
    console.log('JavaslatModal._modositasLenyilokBetoltese - KEZDÉS');

    try {
      const [tipusValasz, kategoriaValasz] = await Promise.all([
        apiGet('gondolatTipus', this.token),
        apiGet('kategoria',     this.token)
      ]);

      this.gondolatTipusok = tipusValasz?.gondolatTipusok || [];
      this.kategoriak      = kategoriaValasz?.kategoriak   || [];

      console.log('JavaslatModal._modositasLenyilokBetoltese - VÉGE', {
        tipusokSzama:    this.gondolatTipusok.length,
        kategoriakSzama: this.kategoriak.length
      });
    } catch (hiba) {
      console.error('JavaslatModal._modositasLenyilokBetoltese - HIBA', { hiba: hiba.message });
      this.gondolatTipusok = [];
      this.kategoriak      = [];
    }
  }

  // ===== MÓDOSÍTÁS: KATEGÓRIÁK FA-SORRENDBE RENDEZÉSE =====
  // =============================================
  // ÚJ - a lapos listát hierarchikus sorrendbe teszi (mélységgel)
  // =============================================
  // Minden kategória a szülője után jön, és megkapja a MÉLYSÉGÉT (0 = gyökér),
  // hogy a legördülőben az alkategóriák a szülőjük alatt, behúzva jelenjenek meg.
  // (A GondolatModal azonos logikájának másolata — apró, önálló segéd.)
  // @returns {Array<{kat: Object, melyseg: number}>}
  _modositasKategoriakFaSorrendbe() {
    // Gyerekek csoportosítása szülő szerint (kulcs: szuloId string, gyökérnél 'null')
    const gyerekekMap = new Map();
    this.kategoriak.forEach(kat => {
      const kulcs = kat.szuloId ? kat.szuloId.toString() : 'null';
      if (!gyerekekMap.has(kulcs)) gyerekekMap.set(kulcs, []);
      gyerekekMap.get(kulcs).push(kat);
    });

    const eredmeny = [];
    const bejart   = new Set(); // kör-védelem + duplikáció ellen

    const bejar = (szuloKulcs, melyseg) => {
      const gyerekek = gyerekekMap.get(szuloKulcs) || [];
      gyerekek.forEach(kat => {
        const id = kat._id.toString();
        if (bejart.has(id)) return;
        bejart.add(id);
        eredmeny.push({ kat, melyseg });
        bejar(id, melyseg + 1);
      });
    };
    bejar('null', 0);

    // Árvák (nem elért szülőjű kategória) a lista végére, gyökérként
    this.kategoriak.forEach(kat => {
      if (!bejart.has(kat._id.toString())) {
        bejart.add(kat._id.toString());
        eredmeny.push({ kat, melyseg: 0 });
      }
    });

    return eredmeny;
  }

  // ===== MÓDOSÍTÁS: KATEGÓRIA LEGÖRDÜLŐ FELTÖLTÉSE =====
  // A már kiválasztottakat kihagyja; 3 kiválasztottnál letiltja a legördülőt.
  _modositasKategoriaSelectFeltoltese() {
    const select = document.getElementById('javaslat-modositas-kategoria');
    if (!select) return;

    const faSorrend = this._modositasKategoriakFaSorrendbe();

    select.innerHTML = '<option value="">– Kategória hozzáadása –</option>';

    faSorrend.forEach(({ kat, melyseg }) => {
      if (this.kivalasztottKategoriaIds.includes(kat._id)) return; // már kiválasztott

      const opcio = document.createElement('option');
      opcio.value = kat._id;
      // Szöveges behúzás a mélység szerint (az <option> nem stílusozható megbízhatóan)
      const behuzas = melyseg > 0 ? '  '.repeat(melyseg) + '└ ' : '';
      opcio.textContent = behuzas + kat.nev;
      select.appendChild(opcio);
    });

    select.disabled = this.kivalasztottKategoriaIds.length >= 3;
  }

  // ===== MÓDOSÍTÁS: KATEGÓRIA VÁLASZTÓ ESEMÉNY BEKÖTÉSE =====
  // Kiválasztáskor chipet ad hozzá, és frissíti a legördülőt.
  _modositasKategoriaValasztoBekotese() {
    const select = document.getElementById('javaslat-modositas-kategoria');
    if (!select) return;

    select.addEventListener('change', (esemeny) => {
      const kivalasztottId  = esemeny.target.value;
      const kivalasztottNev = esemeny.target.options[esemeny.target.selectedIndex]?.text?.trim();

      if (!kivalasztottId) return;

      if (this.kivalasztottKategoriaIds.length >= 3) {
        console.warn('JavaslatModal - max 3 kategória adható meg');
        esemeny.target.value = '';
        return;
      }

      this.kivalasztottKategoriaIds.push(kivalasztottId);
      this._modositasKategoriaChipHozzaadasa(kivalasztottId, kivalasztottNev);
      this._modositasKategoriaSelectFeltoltese();
      esemeny.target.value = '';
    });
  }

  // ===== MÓDOSÍTÁS: KATEGÓRIA CHIP HOZZÁADÁSA =====
  _modositasKategoriaChipHozzaadasa(id, nev) {
    const chipKontener = document.getElementById('javaslat-modositas-kategoria-chipek');
    if (!chipKontener) return;

    const chip = document.createElement('span');
    chip.className           = 't-modal-kategoria-chip';
    chip.dataset.kategoriaId = id;

    const nevElem = document.createElement('span');
    nevElem.className   = 't-modal-chip-nev';
    nevElem.textContent = nev;

    const torloGomb = document.createElement('button');
    torloGomb.type        = 'button';
    torloGomb.className    = 't-modal-chip-torlo';
    torloGomb.setAttribute('aria-label', `${nev} kategória eltávolítása`);
    torloGomb.textContent = '✕';
    torloGomb.addEventListener('click', () => this._modositasKategoriaEltavolitasa(id, chip));

    chip.appendChild(nevElem);
    chip.appendChild(torloGomb);
    chipKontener.appendChild(chip);
  }

  // ===== MÓDOSÍTÁS: KATEGÓRIA ELTÁVOLÍTÁSA =====
  _modositasKategoriaEltavolitasa(id, chip) {
    this.kivalasztottKategoriaIds = this.kivalasztottKategoriaIds.filter(kId => kId !== id);
    chip.remove();
    this._modositasKategoriaSelectFeltoltese();
  }

  // ===== ÁTHELYEZÉS FORMA ÉPÍTÉSE =====
  // =============================================
  // MÓDOSÍTVA - ID-ellenőrző mezővel
  // =============================================
  // A felhasználó beírja az új szülő ID-ját, a rendszer ellenőrzi
  // a létezését és megjeleníti a címét
  _athelyezesFormaEpitese(kontener) {
    console.log('JavaslatModal._athelyezesFormaEpitese - KEZDÉS');

    const mezoKontener = document.createElement('div');
    mezoKontener.className = 'javaslat-modal__mezo-csoport';
    kontener.appendChild(mezoKontener);

    // Áthelyezés célja csak Gondolat lehet (a backend végrehajtó korlátja)
    this.ujSzuloMezo = new EntitasKeresoMezo(mezoKontener, {
      cimke:       'Új szülő gondolat',
      placeholder: 'Az új szülő gondolat ID-ja',
      tipusok:     ['Gondolat'],
      token:       this.token
    });

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

    // Az egyesítés eredmény-típusa a kártya entitástípusából KÖVETKEZIK: Gondolatot csak
    // Gondolattal, Kategóriát csak Kategóriával lehet egyesíteni (a backend is ezt
    // kényszeríti ki). Ezért egyetlen, előre kiválasztott opciót kínálunk.
    const eredmenyTipus = egyesitesEredmenyTipus(this.entitasAdatok?.entitasTipus ?? 'Gondolat');
    const csakKategoria = (eredmenyTipus === 'Kategoria');
    const eredmenyFelirat = csakKategoria ? 'Kategória' : 'Gondolat';

    const option       = document.createElement('option');
    option.value       = eredmenyTipus;
    option.textContent = eredmenyFelirat;
    tipusSelect.appendChild(option);
    tipusSelect.disabled = true; // nincs választás, a kártya típusa dönt

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

    // =============================================
    // ÚJ - Az új entitás szülő gondolata (KÖTELEZŐ)
    // =============================================
    // Az egyesített entitás ez alá a gondolat alá kerül. Nem lehet
    // egyesítésben érintett entitás vagy annak leszármazottja —
    // ezt a backend a beküldéskor ÉS a végrehajtáskor is ellenőrzi.
    const szuloMezoKontener = document.createElement('div');
    szuloMezoKontener.className = 'javaslat-modal__mezo-csoport';
    kontener.appendChild(szuloMezoKontener);

    // A szülő OPCIONÁLIS. Üresen hagyva az alap-szülő a források LEGKÖZELEBBI KÖZÖS ŐSE
    // lesz (vagy gyökér, ha nincs közös ős) — ezt a backend számolja. Ha megadod:
    // kategória-eredménynél kategória, egyébként gondolat a szülő típusa.
    this.egyesitesSzuloMezo = new EntitasKeresoMezo(szuloMezoKontener, {
      cimke:       csakKategoria ? 'Az új kategória szülő kategóriája (opcionális)' : 'Az új entitás szülő gondolata (opcionális)',
      placeholder: csakKategoria ? 'Üres = legközelebbi közös ős / gyökér' : 'Üres = legközelebbi közös ős / gyökér',
      tipusok:     csakKategoria ? ['Kategoria'] : ['Gondolat'],
      token:       this.token
    });

    // =============================================
    // MÓDOSÍTVA - dinamikus forrás lista ID-ellenőrző mezőkkel
    // =============================================
    // A kártya entitása automatikusan az egyesítés része;
    // ide a TOVÁBBI egyesítendő entitások kerülnek. A + gombbal
    // tetszőleges számú forrás adható hozzá.
    const forrasSzekcio = document.createElement('div');
    forrasSzekcio.className = 'javaslat-modal__mezo-csoport';

    const forrasCimke = document.createElement('label');
    forrasCimke.className   = 'javaslat-modal__cimke';
    forrasCimke.textContent = 'További egyesítendő entitások';
    forrasSzekcio.appendChild(forrasCimke);

    const forrasLista = document.createElement('div');
    forrasLista.id = 'javaslat-egyesites-forras-lista';
    forrasSzekcio.appendChild(forrasLista);

    const forrasHozzaadGomb = document.createElement('button');
    forrasHozzaadGomb.type        = 'button';
    forrasHozzaadGomb.className   = 'javaslat-modal__masodlagos-gomb';
    forrasHozzaadGomb.textContent = '+ Forrás entitás hozzáadása';
    forrasHozzaadGomb.addEventListener('click', () => {
      this._forrasMezoHozzaadasa(forrasLista);
    });
    forrasSzekcio.appendChild(forrasHozzaadGomb);

    kontener.appendChild(forrasSzekcio);

    // Egy forrás mező alapból látható — egyesítéshez legalább két entitás kell
    this._forrasMezoHozzaadasa(forrasLista);

    console.log('JavaslatModal._egyesitesFormaEpitese - VÉGE');
  }

  // =============================================
  // ÚJ - FORRÁS MEZŐ HOZZÁADÁSA (Egyesítés)
  // =============================================
  // Egy új ID-ellenőrző mezőt fűz a forrás listához
  // @param {HTMLElement} listaElem - A forrás mezők konténere
  _forrasMezoHozzaadasa(listaElem) {
    console.log('JavaslatModal._forrasMezoHozzaadasa - KEZDÉS', {
      eddigiForrasok: this.forrasMezok.length
    });

    const mezoKontener = document.createElement('div');
    mezoKontener.className = 'javaslat-modal__forras-mezo';
    listaElem.appendChild(mezoKontener);

    const mezo = new EntitasKeresoMezo(mezoKontener, {
      cimke:       `${this.forrasMezok.length + 2}. egyesítendő entitás`,
      placeholder: 'Az egyesítendő entitás ID-ja',
      // A forrás-típusok a kártya entitásától függnek: kategóriát csak másik
      // kategóriával lehet egyesíteni (domain-szabály). Egyébként bármelyik lehet.
      tipusok:     egyesitesForrasTipusok(this.entitasAdatok?.entitasTipus ?? 'Gondolat'),
      token:       this.token
    });

    this.forrasMezok.push(mezo);

    console.log('JavaslatModal._forrasMezoHozzaadasa - VÉGE');
  }

  // ===== CSOMAG FORMA ÉPÍTÉSE =====
  // =============================================
  // MÓDOSÍTVA - dinamikus művelet lista
  // =============================================
  // Több művelet egy javaslatban: minden tételhez egy entitás
  // (ID-ellenőrzéssel), egy művelet típus és a művelethez tartozó mezők.
  // A kártya saját entitása automatikusan az első tétel.
  _csomagFormaEpitese(kontener) {
    console.log('JavaslatModal._csomagFormaEpitese - KEZDÉS');

    const info = document.createElement('p');
    info.className   = 'javaslat-modal__info-szoveg';
    info.textContent = 'A csomag több műveletet tartalmaz, amelyeket a közösség egyben fogad el vagy vet el. Adj hozzá tételeket, és válaszd ki mindegyikhez a műveletet.';
    kontener.appendChild(info);

    const tetelLista = document.createElement('div');
    tetelLista.id = 'javaslat-csomag-tetel-lista';
    kontener.appendChild(tetelLista);

    const tetelHozzaadGomb = document.createElement('button');
    tetelHozzaadGomb.type        = 'button';
    tetelHozzaadGomb.className   = 'javaslat-modal__masodlagos-gomb';
    tetelHozzaadGomb.textContent = '+ Művelet hozzáadása';
    tetelHozzaadGomb.addEventListener('click', () => {
      this._csomagTetelHozzaadasa(tetelLista);
    });
    kontener.appendChild(tetelHozzaadGomb);

    // Első tétel: a kártya saját entitása előtöltve
    const elsoTetel = this._csomagTetelHozzaadasa(tetelLista);
    if (this.entitasAdatok?.entitasId) {
      elsoTetel.idMezo.setErtek(this.entitasAdatok.entitasId);
    }

    console.log('JavaslatModal._csomagFormaEpitese - VÉGE');
  }

  // =============================================
  // ÚJ - CSOMAG TÉTEL HOZZÁADÁSA
  // =============================================
  // Egy tétel: entitás ID-mező + művelet választó + műveletfüggő mezők
  // (Módosítás: új cím/név; Áthelyezés: cél gondolat ID-mező)
  // @param {HTMLElement} listaElem - A tételek konténere
  // @returns {Object} A létrehozott tétel objektum
  _csomagTetelHozzaadasa(listaElem) {
    console.log('JavaslatModal._csomagTetelHozzaadasa - KEZDÉS', {
      eddigiTetelek: this.csomagTetelek.length
    });

    const sorElem = document.createElement('div');
    sorElem.className = 'javaslat-modal__csomag-tetel';
    listaElem.appendChild(sorElem);

    // --- Entitás ID mező ---
    const idMezoKontener = document.createElement('div');
    sorElem.appendChild(idMezoKontener);

    const idMezo = new EntitasKeresoMezo(idMezoKontener, {
      cimke:       `${this.csomagTetelek.length + 1}. tétel entitása`,
      placeholder: 'Az érintett entitás ID-ja',
      tipusok:     ['Gondolat', 'Kategoria', 'GondolatTipus'],
      token:       this.token
    });

    // --- Művelet választó ---
    const muveletCimke = document.createElement('label');
    muveletCimke.className   = 'javaslat-modal__cimke';
    muveletCimke.textContent = 'Művelet';
    sorElem.appendChild(muveletCimke);

    const muveletSelect = document.createElement('select');
    muveletSelect.className = 'javaslat-modal__select';
    [
      { ertek: 'Torles',     felirat: 'Törlés'     },
      { ertek: 'Modositas',  felirat: 'Módosítás'  },
      { ertek: 'Athelyezes', felirat: 'Áthelyezés' }
    ].forEach(({ ertek, felirat }) => {
      const option       = document.createElement('option');
      option.value       = ertek;
      option.textContent = felirat;
      muveletSelect.appendChild(option);
    });
    sorElem.appendChild(muveletSelect);

    // --- Műveletfüggő mezők konténere ---
    const muveletMezokKontener = document.createElement('div');
    sorElem.appendChild(muveletMezokKontener);

    const tetel = {
      sorElem,
      idMezo,
      muveletSelect,
      cimInput: null, // Módosításnál: új cím/név input
      celMezo:  null  // Áthelyezésnél: cél gondolat ID-mező
    };

    // Művelet váltásakor a műveletfüggő mezők újraépülnek
    muveletSelect.addEventListener('change', () => {
      this._csomagMuveletMezokEpitese(tetel, muveletMezokKontener);
    });
    // Kezdeti állapot: Törlés — nincs extra mező
    this._csomagMuveletMezokEpitese(tetel, muveletMezokKontener);

    // --- Tétel eltávolító gomb ---
    const torloGomb = document.createElement('button');
    torloGomb.type        = 'button';
    torloGomb.className   = 'javaslat-modal__masodlagos-gomb';
    torloGomb.textContent = '– Tétel eltávolítása';
    torloGomb.addEventListener('click', () => {
      tetel.idMezo?.destroy();
      tetel.celMezo?.destroy();
      sorElem.remove();
      this.csomagTetelek = this.csomagTetelek.filter(t => t !== tetel);
    });
    sorElem.appendChild(torloGomb);

    this.csomagTetelek.push(tetel);

    console.log('JavaslatModal._csomagTetelHozzaadasa - VÉGE');
    return tetel;
  }

  // =============================================
  // ÚJ - CSOMAG TÉTEL MŰVELETFÜGGŐ MEZŐI
  // =============================================
  // A kiválasztott művelethez tartozó mezőket építi fel:
  // Törlés: nincs mező; Módosítás: új cím/név; Áthelyezés: cél gondolat
  // @param {Object} tetel - A tétel objektum
  // @param {HTMLElement} kontener - A műveletfüggő mezők konténere
  _csomagMuveletMezokEpitese(tetel, kontener) {
    const muvelet = tetel.muveletSelect.value;
    console.log('JavaslatModal._csomagMuveletMezokEpitese - KEZDÉS', { muvelet });

    // Korábbi műveletfüggő mezők felszabadítása
    if (tetel.celMezo) { tetel.celMezo.destroy(); tetel.celMezo = null; }
    tetel.cimInput = null;
    kontener.innerHTML = '';

    if (muvelet === 'Modositas') {
      // Új cím/név mező — a csomagban egyszerűsített módosítás:
      // csak a cím/név változtatható (teljes szöveg módosításhoz
      // önálló Módosítás javaslat használható)
      const cimke = document.createElement('label');
      cimke.className   = 'javaslat-modal__cimke';
      cimke.textContent = 'Új cím / név';
      kontener.appendChild(cimke);

      const input = document.createElement('input');
      input.type        = 'text';
      input.className   = 'javaslat-modal__input';
      input.placeholder = 'Az entitás új címe vagy neve';
      kontener.appendChild(input);

      tetel.cimInput = input;
    }

    if (muvelet === 'Athelyezes') {
      const celKontener = document.createElement('div');
      kontener.appendChild(celKontener);

      tetel.celMezo = new EntitasKeresoMezo(celKontener, {
        cimke:       'Új szülő gondolat',
        placeholder: 'A cél gondolat ID-ja',
        tipusok:     ['Gondolat'],
        token:       this.token
      });
    }

    console.log('JavaslatModal._csomagMuveletMezokEpitese - VÉGE', { muvelet });
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
  // ===== INDOKLÁS ÜRES-E =====
  // Igaz, ha az indoklás gyakorlatilag üres (nincs érdemi gondolat). A szerkesztő
  // blokk-tömböt VAGY több oldalas objektumot ad. Bármely nem-szöveg blokk
  // (kép/fájl/link/entitás) → NEM üres. (Kötelező, de nincs minimum karakter.)
  _indoklasUres(indoklas) {
    let blokkok = [];
    if (Array.isArray(indoklas)) {
      blokkok = indoklas;
    } else if (indoklas && typeof indoklas === 'object' && indoklas.blokkok) {
      blokkok = Object.values(indoklas.blokkok).flat();
    }
    if (blokkok.length === 0) return true;
    for (const blokk of blokkok) {
      if (!blokk || typeof blokk !== 'object') continue;
      if (blokk.tipus && blokk.tipus !== 'szoveg') return false;
      const nyers = (blokk.tartalom ?? blokk.szoveg ?? '').toString();
      const csakSzoveg = nyers.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
      if (csakSzoveg.length > 0) return false;
    }
    return true;
  }

  _validalas() {
    console.log('JavaslatModal._validalas - KEZDÉS', { tipus: this.kivalasztottTipus });

    if (!this.kivalasztottTipus) {
      console.log('JavaslatModal._validalas - VÉGE: típus hiányzik');
      return 'Kérjük, válassz javaslat típust.';
    }

    // =============================================
    // Indoklás – KÖTELEZŐ (de nincs minimum karakter)
    // =============================================
    // Az indoklás megadása kötelező: nem lehet üres. Minimum hossz nincs – egyetlen
    // karakter (vagy egy kép/link/hivatkozás blokk) is elég.
    const indoklas = this.indoklasSzerkeszto ? this.indoklasSzerkeszto.getTartalom() : null;
    if (this._indoklasUres(indoklas)) {
      console.log('JavaslatModal._validalas - VÉGE: üres indoklás');
      return 'Az indoklás megadása kötelező.';
    }

    // =============================================
    // ÚJ - Típus-specifikus ellenőrzések
    // =============================================
    if (this.kivalasztottTipus === 'Athelyezes') {
      const ujSzuloId = this.ujSzuloMezo?.getId();
      if (!ujSzuloId) {
        return 'Az áthelyezéshez érvényes, létező új szülő gondolatot kell megadni.';
      }
      if (ujSzuloId === this.entitasAdatok?.entitasId) {
        return 'Az entitás nem helyezhető saját maga alá.';
      }
    }

    if (this.kivalasztottTipus === 'Egyesites') {
      const kontener = document.getElementById(this.kontenerAzonosito);
      const ujTipus = kontener?.querySelector('#javaslat-egyesites-uj-tipus')?.value;
      const ujNev   = kontener?.querySelector('#javaslat-egyesites-uj-nev')?.value?.trim();
      if (!ujTipus) return 'Az egyesítéshez ki kell választani az új entitás típusát.';
      if (!ujNev)   return 'Az egyesítéshez meg kell adni az új entitás nevét.';

      const ervenyesForrasok = this.forrasMezok.filter(m => m.getId());
      if (ervenyesForrasok.length === 0) {
        return 'Az egyesítéshez legalább egy további, érvényes forrás entitást meg kell adni.';
      }
      const duplikalt = ervenyesForrasok.some(m => m.getId() === this.entitasAdatok?.entitasId);
      if (duplikalt) {
        return 'A kártya saját entitása automatikusan része az egyesítésnek — ne add meg forrásként is.';
      }

      // Az új entitás szülője OPCIONÁLIS (üres = gyökér). Ha megadták, nem lehet
      // egyesítésben érintett entitás (a leszármazott-ellenőrzést a backend végzi).
      const ujSzuloId = this.egyesitesSzuloMezo?.getId();
      if (ujSzuloId
          && (ujSzuloId === this.entitasAdatok?.entitasId
              || ervenyesForrasok.some(m => m.getId() === ujSzuloId))) {
        return 'Az új entitás szülője nem lehet egyesítésben érintett entitás — az a végrehajtáskor törlődik.';
      }
    }

    if (this.kivalasztottTipus === 'Csomag') {
      const ervenyesTetelek = this.csomagTetelek.filter(t => t.idMezo?.getId());
      if (ervenyesTetelek.length === 0) {
        return 'A csomaghoz legalább egy érvényes entitású tételt meg kell adni.';
      }
      for (const tetel of ervenyesTetelek) {
        const muvelet = tetel.muveletSelect.value;
        if (muvelet === 'Modositas' && !tetel.cimInput?.value?.trim()) {
          return 'A csomag módosítási tételéhez add meg az új címet/nevet.';
        }
        if (muvelet === 'Athelyezes' && !tetel.celMezo?.getId()) {
          return 'A csomag áthelyezési tételéhez érvényes cél gondolatot kell megadni.';
        }
      }

      // Csomagnál KÖTELEZŐ az egyezmény tárhely: a létrehozó dönti el, hova kerül
      // az elfogadott csomag egyezménye (nincs automatikus levezetés).
      if (!this.egyezmenyTarhelyMezo?.getId()) {
        return 'Csomag javaslatnál kötelező kiválasztani az egyezmény tárhelyét (keress cím alapján).';
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

  // =============================================
  // ÚJ - BLOKKOK KINYERÉSE BÁRMELY SZERKESZTŐ FORMÁTUMBÓL
  // =============================================
  // A SzovegSzerkeszto.getTartalom() blokk-tömböt (nincs oldal navigáció)
  // vagy { oldalNavigacio, blokkok: { fulId: [...] } } objektumot ad vissza.
  // Validáláshoz az összes blokkot egyetlen tömbbe gyűjtjük.
  // @param {Array|Object} gondolat - A szerkesztő kimenete
  // @returns {Array} Az összes blokk egy tömbben
  _blokkokKinyerese(gondolat) {
    if (Array.isArray(gondolat)) return gondolat;
    if (gondolat && typeof gondolat === 'object' && gondolat.blokkok) {
      return Object.values(gondolat.blokkok).flat();
    }
    return [];
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
    // Blokk-tömb VAGY több oldalas objektum — a backend mindkettőt fogadja
    const indoklas = this.indoklasSzerkeszto
      ? this.indoklasSzerkeszto.getTartalom()
      : [];

    const kezdoTudatpont = parseInt(
      kontener?.querySelector('#javaslat-kezdo-tudatpont')?.value
    );

    // =============================================
    // ÚJ - Egyezmény tárhely meghatározása
    // =============================================
    // 1. Ha a felhasználó megadott érvényes tárhelyet, azt használjuk
    // 2. Egyesítésnél az alapértelmezés a placeholder: az új entitás lesz a tárhely
    // 3. Más típusnál az alapértelmezés a javaslat szülő gondolata
    // A kiválasztott tárhely-entitás (id + típus) — a keresőből jön
    const valasztottTarhely = this.egyezmenyTarhelyMezo?.getEntitas() ?? null;
    let egyezmenyTarhelyId    = valasztottTarhely?.entitasId    ?? null;
    let egyezmenyTarhelyTipus = valasztottTarhely?.entitasTipus ?? 'Gondolat';
    if (!egyezmenyTarhelyId) {
      egyezmenyTarhelyId = this.kivalasztottTipus === 'Egyesites'
        ? UJ_ENTITAS_TARHELY_PLACEHOLDER
        : (this.szuloAdatok?.szuloId ?? null);
    }

    const adatok = {
      javaslatTipus: this.kivalasztottTipus,
      szuloId:       this.szuloAdatok?.szuloId,
      egyezmenyTarhelyId,
      egyezmenyTarhelyTipus,   // A választott tárhely típusa (a backend csomagnál használja)
      indoklas,      // Blokkok tömbje vagy több oldalas objektum, nem sima string
      kezdoTudatpont,
      erintettEntitasok: this._erintettEntitasokOsszegyujtese()
    };

    if (this.kivalasztottTipus === 'Egyesites') {
      adatok.egyesitesAdatok = this._egyesitesAdatokOsszegyujtese(kontener);
    }

    console.log('JavaslatModal._adatokOsszegyujtese - VÉGE', {
      tipus:              adatok.javaslatTipus,
      szuloId:            adatok.szuloId,
      egyezmenyTarhelyId: adatok.egyezmenyTarhelyId,
      erintettekSzama:    adatok.erintettEntitasok.length
    });
    return adatok;
  }

  // =============================================
  // ÚJ - ÉRINTETT ENTITÁSOK ÖSSZEGYŰJTÉSE TÍPUSONKÉNT
  // =============================================
  // A backend ezt a szerkezetet várja minden típusnál:
  // [{ entitasId, entitasTipus, muvelet, modositasAdatok? }]
  // - Törlés/Módosítás/Áthelyezés: a kártya entitása egyedül
  // - Egyesítés: a kártya entitása + az összes érvényes forrás entitás
  // - Csomag: a tétel lista, tételenkénti művelettel és adatokkal
  // @returns {Array} Az érintett entitások tömbje
  _erintettEntitasokOsszegyujtese() {
    console.log('JavaslatModal._erintettEntitasokOsszegyujtese - KEZDÉS', {
      tipus: this.kivalasztottTipus
    });

    const sajatEntitas = {
      entitasId:    this.entitasAdatok?.entitasId,
      entitasTipus: this.entitasAdatok?.entitasTipus ?? 'Gondolat'
    };

    let erintettek = [];

    switch (this.kivalasztottTipus) {

      case 'Torles':
        erintettek = [{ ...sajatEntitas, muvelet: 'Torles' }];
        break;

      case 'Modositas':
        erintettek = [{
          ...sajatEntitas,
          muvelet:         'Modositas',
          modositasAdatok: this._modositasAdatokOsszegyujtese()
        }];
        break;

      case 'Athelyezes':
        erintettek = [{
          ...sajatEntitas,
          muvelet:         'Athelyezes',
          modositasAdatok: { ujSzuloId: this.ujSzuloMezo?.getId() }
        }];
        break;

      case 'Egyesites': {
        // A kártya entitása + minden érvényes forrás, mind Egyesites művelettel
        erintettek = [{ ...sajatEntitas, muvelet: 'Egyesites' }];
        this.forrasMezok.forEach(mezo => {
          const forras = mezo.getEntitas();
          if (forras) {
            erintettek.push({
              entitasId:    forras.entitasId,
              entitasTipus: forras.entitasTipus,
              muvelet:      'Egyesites'
            });
          }
        });
        break;
      }

      case 'Csomag': {
        // Minden érvényes tétel a saját műveletével és adataival
        erintettek = this.csomagTetelek
          .filter(tetel => tetel.idMezo?.getId())
          .map(tetel => {
            const entitas = tetel.idMezo.getEntitas();
            const muvelet = tetel.muveletSelect.value;

            const bejegyzes = {
              entitasId:    entitas.entitasId,
              entitasTipus: entitas.entitasTipus,
              muvelet
            };

            if (muvelet === 'Modositas') {
              // Gondolatnál cim, Kategória/GondolatTípusnál nev a mező neve
              const ujCim = tetel.cimInput?.value?.trim();
              bejegyzes.modositasAdatok = entitas.entitasTipus === 'Gondolat'
                ? { cim: ujCim }
                : { nev: ujCim };
            }

            if (muvelet === 'Athelyezes') {
              bejegyzes.modositasAdatok = {
                ujSzuloId:    tetel.celMezo?.getId(),
                ujSzuloTipus: 'Gondolat'
              };
            }

            return bejegyzes;
          });
        break;
      }

      default:
        erintettek = [{ ...sajatEntitas, muvelet: this.kivalasztottTipus }];
    }

    console.log('JavaslatModal._erintettEntitasokOsszegyujtese - VÉGE', {
      darab: erintettek.length
    });
    return erintettek;
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

    // Az entitás típusa dönti el a mezőneveket:
    // Gondolat → cim + szoveg; Kategória/GondolatTípus → nev + szovegMezo
    const gondolatE = (this.entitasAdatok?.entitasTipus ?? 'Gondolat') === 'Gondolat';

    const ujCim = kontener?.querySelector('#javaslat-modositas-cim')?.value?.trim();
    if (ujCim) {
      if (gondolatE) modositasAdatok.cim = ujCim;
      else           modositasAdatok.nev = ujCim;
    }

    // =============================================
    // ÚJ - Szöveg lekérése a módosítás szerkesztőből
    // =============================================
    // Blokk-tömb vagy több oldalas objektum — mindkettőt nyersen küldjük
    if (this.modositasSzovegSzerkeszto) {
      const szoveg = this.modositasSzovegSzerkeszto.getTartalom();
      const vanGondolat = this._blokkokKinyerese(szoveg).length > 0;
      if (vanGondolat) {
        if (gondolatE) modositasAdatok.szoveg     = szoveg;
        else           modositasAdatok.szovegMezo = szoveg;
      }
    }

    // =============================================
    // ÚJ - Gondolattípus + kategóriák (CSAK Gondolatnál)
    // =============================================
    // Ezeket MINDIG beletesszük (a mezők előre ki vannak töltve a jelenlegi
    // értékekkel), így a javaslat a típus és a kategóriák KÍVÁNT végállapotát
    // rögzíti — és a törlésük is kifejezhető (üres típus / üres kategória-lista).
    if (gondolatE) {
      const tipusSelect = kontener?.querySelector('#javaslat-modositas-tipus');
      if (tipusSelect) {
        // Üres opció → null (nincs típus); egyébként a kiválasztott ID
        modositasAdatok.gondolatTipusId = tipusSelect.value || null;
      }

      // A chipekből felépített kiválasztott kategória-ID lista (0–3 elem)
      modositasAdatok.kategoriaIds = [...this.kivalasztottKategoriaIds];
    }

    console.log('JavaslatModal._modositasAdatokOsszegyujtese - VÉGE', { modositasAdatok });
    return modositasAdatok;
  }

  // ===== EGYESÍTÉS ADATOK ÖSSZEGYŰJTÉSE =====
  // Változatlan
  _egyesitesAdatokOsszegyujtese(kontener) {
    console.log('JavaslatModal._egyesitesAdatokOsszegyujtese - KEZDÉS');

    const ujTipus = kontener?.querySelector('#javaslat-egyesites-uj-tipus')?.value;
    const ujNev   = kontener?.querySelector('#javaslat-egyesites-uj-nev')?.value?.trim();

    // Az új entitás adatai — Gondolatnál cim, más típusnál nev a mező neve.
    // Az új entitás a felhasználó által KÖTELEZŐEN megadott, ellenőrzött
    // szülő gondolat alá kerül (nem lehet érintett entitás vagy annak
    // leszármazottja — a backend kétszeresen ellenőrzi).
    const ujEntitasAdatok = ujTipus === 'Gondolat'
      ? { cim: ujNev }
      : { nev: ujNev };

    const ujSzuloId = this.egyesitesSzuloMezo?.getId();
    if (ujSzuloId) {
      ujEntitasAdatok.szuloId    = ujSzuloId;
      // Kategória-eredménynél a szülő is kategória (domain-szabály), egyébként Gondolat.
      ujEntitasAdatok.szuloTipus = ujTipus === 'Kategoria' ? 'Kategoria' : 'Gondolat';
    }

    const egyesitesAdatok = {
      ujEntitasTipus: ujTipus,
      ujEntitasAdatok
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