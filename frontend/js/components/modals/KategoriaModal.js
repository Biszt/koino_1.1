// frontend/js/components/modal/KategoriaModal.js

// ===================================
// IMPORTOK
// ===================================
import Modal from './Modal.js';
import SzovegSzerkeszto from '../szovegSzerkeszto/SzovegSzerkeszto.js';
import { apiPostFormData, apiPatchFormData } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import {
  kuszobMezokHtml,
  kuszobMezokKitoltese,
  kuszobMezokOsszegyujtese,
  kuszobMezokValidalasa,
  KUSZOB_ALAPERTEKEK
} from './kuszobErtekMezok.js';

// A küszöbmezők egyedi id-előtagja ebben a modálban
const KUSZOB_PREFIX = 'kat';

// ===================================
// KATEGÓRIA MODAL OSZTÁLY
// ===================================
// Két módban működik:
//   letrehozas – POST /api/kategoria  (ikon kötelező)
//   modositas  – PATCH /api/kategoria/:id  (ikon opcionális)
class KategoriaModal {

  // =====================================
  // KONSTRUKTOR
  // =====================================
  constructor(kontenerAzonosito, beallitasok) {
    console.log('KategoriaModal.constructor - KEZDÉS', {
      kontenerAzonosito,
      mod: beallitasok?.mod
    });

    this.kontenerAzonosito = kontenerAzonosito;
    this.token             = tokenLekerese();
    this.mod               = beallitasok.mod || 'letrehozas';
    this.kategoriaAdatok   = beallitasok.kategoriaAdatok || null;
    this.onSiker           = beallitasok.onSiker         || null;
    this.modal             = null;
    this.kivalasztottFajl  = null;

    // =============================================
    // ÚJ - Szülő-adatok (alkategória létrehozásához)
    // =============================================
    // Ha a modal egy kategória kártyából nyílik meg „Új kategória létrehozása ebből"
    // módon, akkor itt kapja meg a szülő kategóriát: { szuloId, szuloTipus: 'Kategoria' }.
    // A fő menüből (gyökér-kategória) ez null marad.
    this.szuloAdatok       = beallitasok.szuloAdatok || null;

    // =============================================
    // ÚJ - SzovegSzerkeszto példány referencia
    // =============================================
    this.szovegSzerkeszto = null;

    console.log('KategoriaModal.constructor - VÉGE', {
      mod:            this.mod,
      vanToken:       !!this.token,
      vanMeglevoAdat: !!this.kategoriaAdatok
    });
  }

  // =====================================
  // INICIALIZÁLÁS
  // =====================================
  async init() {
    console.log('KategoriaModal.init - KEZDÉS');

    const formHtml = await this.templateBetoltese();
    if (!formHtml) return;

    // Ha van szülő (a modal egy kategória kártyából nyílt), ALKATEGÓRIÁT hozunk
    // létre → a cím is ezt tükrözze.
    const cim = this.mod === 'letrehozas'
      ? (this.szuloAdatok?.szuloId ? 'Új alkategória létrehozása' : 'Új kategória létrehozása')
      : 'Kategória szerkesztése';

    this.modal = new Modal(this.kontenerAzonosito, {
      cim,
      tartalom: formHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   this.mod === 'letrehozas' ? 'Létrehozás' : 'Mentés',
          tipus:     'elsodleges',
          azonosito: 'kategoria-modal-mentes-gomb',
          akcio:     () => this.mentes()
        },
        {
          felirat:   'Mégsem',
          tipus:     'masodlagos',
          azonosito: 'kategoria-modal-megse-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => {
        // =============================================
        // ÚJ - Szerkesztő megsemmisítése bezáráskor
        // =============================================
        this._szerkesztoMegsemmisitese();
        console.log('KategoriaModal - modal bezárva');
      }
    });

    await this.modal.init();

    if (this.mod === 'letrehozas') {
      const kezdoMezo = document.getElementById('kategoria-kezdo-tudatpont-mezo');
      if (kezdoMezo) kezdoMezo.removeAttribute('hidden');

      // Küszöbérték szakasz megjelenítése + mezők injektálása alapértékekkel
      const kuszobSzakasz = document.getElementById('kategoria-kuszob-szakasz');
      if (kuszobSzakasz) kuszobSzakasz.removeAttribute('hidden');

      const kuszobKontener = document.getElementById('kategoria-kuszob-mezok-kontener');
      if (kuszobKontener) {
        kuszobKontener.innerHTML = kuszobMezokHtml(KUSZOB_PREFIX);
        kuszobMezokKitoltese(KUSZOB_PREFIX, { ...KUSZOB_ALAPERTEKEK });
      }
    }

    this.fajlFeltoltoEsemenyekBekotese();

    // =============================================
    // ÚJ - SzovegSzerkeszto inicializálása
    // =============================================
    // A leiras textarea helyett rich text szerkesztő
    this._szovegSzerkesztoLetrehozasa();

    if (this.mod === 'modositas' && this.kategoriaAdatok) {
      this.formAdatokKitoltese();
    }

    console.log('KategoriaModal.init - VÉGE');
  }

  // =============================================
  // ÚJ - SZÖVEGSZERKESZTŐ LÉTREHOZÁSA
  // =============================================
  // A template-ben: <div id="leiras-szerkeszto-kontener"></div>
  _szovegSzerkesztoLetrehozasa() {
    console.log('KategoriaModal._szovegSzerkesztoLetrehozasa - KEZDÉS');

    const kontener = document.getElementById('leiras-szerkeszto-kontener');
    if (!kontener) {
      console.warn('KategoriaModal._szovegSzerkesztoLetrehozasa - kontener nem található');
      return;
    }

    // Kategória leírásánál entitás hivatkozás koppintás nem releváns
    // (a kategória kártya body-ján belül jelenik meg, nem pakli kontextusban)
    this.szovegSzerkeszto = new SzovegSzerkeszto(kontener, {
      valtozasKezelo:       null,
      onEntitasKivalasztas: null
    });

    console.log('KategoriaModal._szovegSzerkesztoLetrehozasa - VÉGE');
  }

  // =============================================
  // ÚJ - SZERKESZTŐ MEGSEMMISÍTÉSE
  // =============================================
  _szerkesztoMegsemmisitese() {
    console.log('KategoriaModal._szerkesztoMegsemmisitese - KEZDÉS');

    if (this.szovegSzerkeszto) {
      this.szovegSzerkeszto.destroy();
      this.szovegSzerkeszto = null;
    }

    console.log('KategoriaModal._szerkesztoMegsemmisitese - VÉGE');
  }

  // =====================================
  // TEMPLATE BETÖLTÉSE
  // =====================================
  async templateBetoltese() {
    console.log('KategoriaModal.templateBetoltese - KEZDÉS');
    try {
      const valasz = await fetch('./html/components/modals/kategoriaModal.html');
      if (!valasz.ok) {
        console.error('KategoriaModal.templateBetoltese - HIBA template nem található', {
          statusz: valasz.status
        });
        return null;
      }
      const htmlSzoveg = await valasz.text();
      console.log('KategoriaModal.templateBetoltese - VÉGE sikeres betöltés');
      return htmlSzoveg;
    } catch (hiba) {
      console.error('KategoriaModal.templateBetoltese - VÉGE kivétel', { hiba: hiba.message });
      return null;
    }
  }

  // =====================================
  // MEGNYITÁS
  // =====================================
  megnyitas() {
    console.log('KategoriaModal.megnyitas - KEZDÉS');
    this.modal?.megnyitas();
    console.log('KategoriaModal.megnyitas - VÉGE');
  }

  // =====================================
  // BEZÁRÁS
  // =====================================
  bezaras() {
    console.log('KategoriaModal.bezaras - KEZDÉS');
    this.modal?.bezaras();
    console.log('KategoriaModal.bezaras - VÉGE');
  }

  // =====================================
  // FÁJLFELTÖLTŐ ESEMÉNYEK BEKÖTÉSE
  // =====================================
  // Változatlan
  fajlFeltoltoEsemenyekBekotese() {
    console.log('KategoriaModal.fajlFeltoltoEsemenyekBekotese - KEZDÉS');

    const fajlInput   = document.getElementById('kategoria-ikon-input');
    const fajlGomb    = document.getElementById('kategoria-ikon-gomb');
    const fajlNev     = document.getElementById('kategoria-ikon-nev');
    const elonezet    = document.getElementById('kategoria-ikon-elonezet');
    const elonezetKep = document.getElementById('kategoria-ikon-elonezet-kep');

    if (!fajlInput || !fajlGomb) {
      console.error('KategoriaModal.fajlFeltoltoEsemenyekBekotese - HIBA elemek nem találhatók');
      return;
    }

    fajlGomb.addEventListener('click', () => {
      console.log('KategoriaModal - fájlválasztó gomb megnyomva');
      fajlInput.click();
    });

    fajlInput.addEventListener('change', (esemeny) => {
      const fajl = esemeny.target.files[0];
      if (!fajl) {
        console.log('KategoriaModal - fájlválasztás megszakítva');
        return;
      }

      console.log('KategoriaModal - fájl kiválasztva', {
        nev:   fajl.name,
        meret: fajl.size,
        tipus: fajl.type
      });

      this.kivalasztottFajl = fajl;

      if (fajlNev) fajlNev.textContent = fajl.name;

      const olvaso = new FileReader();
      olvaso.onload = (e) => {
        if (elonezetKep) elonezetKep.src = e.target.result;
        if (elonezet)    elonezet.removeAttribute('hidden');
        console.log('KategoriaModal - előnézet megjelenítve');
      };
      olvaso.readAsDataURL(fajl);
    });

    console.log('KategoriaModal.fajlFeltoltoEsemenyekBekotese - VÉGE');
  }

  // =====================================
  // FORM ADATOK KITÖLTÉSE
  // =====================================
  // =============================================
  // MÓDOSÍTVA - leírás betöltése SzovegSzerkesztőbe
  // =============================================
  formAdatokKitoltese() {
    console.log('KategoriaModal.formAdatokKitoltese - KEZDÉS', {
      kategoriaId: this.kategoriaAdatok?.id
    });

    const adatok = this.kategoriaAdatok;
    if (!adatok) return;

    // Név mező – változatlan
    const nevInput = document.getElementById('kategoria-nev');
    if (nevInput) nevInput.value = adatok.nev || '';

    // =============================================
    // ÚJ - Leírás betöltése a SzovegSzerkesztőbe
    // =============================================
    // Az adatok.leiras lehet blokkok tömbje (új) vagy sima string (régi)
    if (this.szovegSzerkeszto) {
      if (Array.isArray(adatok.leiras)) {
        // Új formátum: blokkok tömbje
        this.szovegSzerkeszto.setTartalom(adatok.leiras);
      } else if (typeof adatok.leiras === 'string' && adatok.leiras.trim()) {
        // Régi formátum: sima string → egy szöveges blokkba csomagoljuk
        this.szovegSzerkeszto.setTartalom([{
          id:       'migralt-blokk-1',
          tipus:    'szoveg',
          tartalom: adatok.leiras,
          formatas: { felkover: false, dolt: false, meret: 'kozepes' }
        }]);
      }
    }

    console.log('KategoriaModal.formAdatokKitoltese - VÉGE');
  }

  // =====================================
  // VALIDÁLÁS
  // =====================================
  // Változatlan
  validalas() {
    console.log('KategoriaModal.validalas - KEZDÉS');

    const nev = document.getElementById('kategoria-nev')?.value?.trim();
    if (!nev) {
      console.log('KategoriaModal.validalas - VÉGE hiba: név hiányzik');
      return 'A kategória nevének megadása kötelező.';
    }

    if (nev.length > 100) {
      console.log('KategoriaModal.validalas - VÉGE hiba: név túl hosszú');
      return 'A név maximum 100 karakter lehet.';
    }

    if (this.mod === 'letrehozas' && !this.kivalasztottFajl) {
      console.log('KategoriaModal.validalas - VÉGE hiba: ikon hiányzik');
      return 'Az ikon feltöltése kötelező.';
    }

    if (this.mod === 'letrehozas') {
      const kezdoTudatpont = parseInt(
        document.getElementById('kategoria-kezdo-tudatpont')?.value
      );
      if (!kezdoTudatpont || kezdoTudatpont < 1) {
        console.log('KategoriaModal.validalas - VÉGE hiba: érvénytelen tudatpont');
        return 'Legalább 1 kezdő tudatpontot meg kell adni.';
      }

      // Küszöbértékek ellenőrzése (a közös segéddel)
      const kuszobHiba = kuszobMezokValidalasa(kuszobMezokOsszegyujtese(KUSZOB_PREFIX));
      if (kuszobHiba) {
        console.log('KategoriaModal.validalas - VÉGE hiba: küszöbérték', { kuszobHiba });
        return kuszobHiba;
      }
    }

    console.log('KategoriaModal.validalas - VÉGE sikeres');
    return null;
  }

  // =====================================
  // FORMDATA ÖSSZEÁLLÍTÁSA
  // =====================================
  // =============================================
  // MÓDOSÍTVA - leírás lekérése SzovegSzerkesztőből
  // =============================================
  formDataOsszeallit() {
    console.log('KategoriaModal.formDataOsszeallit - KEZDÉS');

    const formData = new FormData();

    const nev = document.getElementById('kategoria-nev')?.value?.trim();
    formData.append('nev', nev || '');

    // =============================================
    // ÚJ - Leírás lekérése a SzovegSzerkesztőből
    // =============================================
    // A getTartalom() blokkok tömbjét adja vissza –
    // JSON stringként küldjük, mert a FormData csak stringet kezel
    if (this.szovegSzerkeszto) {
      const leirasBlokkok = this.szovegSzerkeszto.getTartalom();
      formData.append('leiras', JSON.stringify(leirasBlokkok));
    }

    // Ikon fájl – változatlan
    if (this.kivalasztottFajl) {
      formData.append('ikon', this.kivalasztottFajl);
    }

    // Kezdő tudatpont – változatlan
    if (this.mod === 'letrehozas') {
      const kezdoTudatpont = document.getElementById('kategoria-kezdo-tudatpont')?.value;
      formData.append('kezdoTudatpont', kezdoTudatpont || '1');

      // =============================================
      // ÚJ - Szülő elküldése (alkategória)
      // =============================================
      // Ha szülő-kategóriából nyílt a modal, a backend (kategoriaService) ebből
      // állítja be a hierarchiát. A szuloId és szuloTipus mindig PÁRBAN megy
      // (a service ezt ki is kényszeríti). Szülő nélkül (gyökér) semmit nem küldünk.
      if (this.szuloAdatok?.szuloId) {
        formData.append('szuloId',    this.szuloAdatok.szuloId);
        formData.append('szuloTipus', this.szuloAdatok.szuloTipus || 'Kategoria');
        console.log('KategoriaModal.formDataOsszeallit - szülő hozzáfűzve', this.szuloAdatok);
      }

      // A négy küszöbérték hozzáfűzése (a backend kategoriaService ezekből
      // hozza létre a létrehozó érték javaslatát és a kezdeti hisztogramot).
      const kuszobErtekek = kuszobMezokOsszegyujtese(KUSZOB_PREFIX);
      formData.append('javaslatElfogadasiKuszob', kuszobErtekek.javaslatElfogadasiKuszob);
      formData.append('reszveteliAranyKuszob',    kuszobErtekek.reszveteliAranyKuszob);
      formData.append('minimumDontesiIdo',        kuszobErtekek.minimumDontesiIdo);
      formData.append('maximumDontesiIdo',        kuszobErtekek.maximumDontesiIdo);
    }

    console.log('KategoriaModal.formDataOsszeallit - VÉGE', {
      vanFajl: !!this.kivalasztottFajl,
      mod:     this.mod
    });

    return formData;
  }

  // =====================================
  // MENTÉS
  // =====================================
  // Változatlan
  async mentes() {
    console.log('KategoriaModal.mentes - KEZDÉS', { mod: this.mod });

    const hibaUzenet = this.validalas();
    if (hibaUzenet) {
      this.modal.hibaBeallitasa(hibaUzenet);
      return;
    }

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      const formData = this.formDataOsszeallit();

      let eredmeny;

      if (this.mod === 'letrehozas') {
        console.log('KategoriaModal.mentes >>>>>>>>>>>> apiPostFormData kategoria');
        eredmeny = await apiPostFormData('kategoria', formData, this.token);
      } else {
        const kategoriaId = this.kategoriaAdatok.id;
        console.log('KategoriaModal.mentes >>>>>>>>>>>> apiPatchFormData kategoria/' + kategoriaId);
        eredmeny = await apiPatchFormData(`kategoria/${kategoriaId}`, formData, this.token);
      }

      this.modal.betoltesBeallitasa(false);
      this.modal.bezaras();

      if (typeof this.onSiker === 'function') {
        this.onSiker(eredmeny?.kategoria);
      }

      console.log('KategoriaModal.mentes - VÉGE sikeres', {
        mod:         this.mod,
        kategoriaId: eredmeny?.kategoria?.id
      });

    } catch (hiba) {
      console.error('KategoriaModal.mentes - HIBA', { hiba: hiba.message });
      this.modal.hibaBeallitasa(hiba.message || 'Mentés sikertelen, kérjük próbáld újra.');
    }
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
export default KategoriaModal;