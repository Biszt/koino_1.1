// frontend/js/components/modal/GondolatTipusModal.js

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
const KUSZOB_PREFIX = 'tt';

// ===================================
// GONDOLAT TÍPUS MODAL OSZTÁLY
// ===================================
// Két módban működik:
//   letrehozas – POST /api/gondolatTipus  (ikon kötelező)
//   modositas  – PATCH /api/gondolatTipus/:id  (ikon opcionális)
class GondolatTipusModal {

  // =====================================
  // KONSTRUKTOR
  // =====================================
  constructor(kontenerAzonosito, beallitasok) {
    console.log('GondolatTipusModal.constructor - KEZDÉS', {
      kontenerAzonosito,
      mod: beallitasok?.mod
    });

    this.kontenerAzonosito   = kontenerAzonosito;
    this.token               = tokenLekerese();
    this.mod                 = beallitasok.mod || 'letrehozas';
    this.gondolatTipusAdatok = beallitasok.gondolatTipusAdatok || null;
    this.onSiker             = beallitasok.onSiker             || null;
    this.modal               = null;
    this.kivalasztottFajl    = null;

    // =============================================
    // ÚJ - SzovegSzerkeszto példány referencia
    // =============================================
    this.szovegSzerkeszto = null;

    console.log('GondolatTipusModal.constructor - VÉGE', {
      mod:            this.mod,
      vanToken:       !!this.token,
      vanMeglevoAdat: !!this.gondolatTipusAdatok
    });
  }

  // =====================================
  // INICIALIZÁLÁS
  // =====================================
  async init() {
    console.log('GondolatTipusModal.init - KEZDÉS');

    const formHtml = await this.templateBetoltese();
    if (!formHtml) return;

    const cim = this.mod === 'letrehozas'
      ? 'Új gondolat típus létrehozása'
      : 'Gondolat típus szerkesztése';

    this.modal = new Modal(this.kontenerAzonosito, {
      cim,
      tartalom: formHtml,
      meret:    'korlatlan', // A szerkesztő olyan széles lehessen, mint a (korlátlan) kártyák
      gombok: [
        {
          felirat:   this.mod === 'letrehozas' ? 'Létrehozás' : 'Mentés',
          tipus:     'elsodleges',
          azonosito: 'gondolatTipus-modal-mentes-gomb',
          akcio:     () => this.mentes()
        },
        {
          felirat:   'Mégsem',
          tipus:     'masodlagos',
          azonosito: 'gondolatTipus-modal-megse-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => {
        // =============================================
        // ÚJ - Szerkesztő megsemmisítése bezáráskor
        // =============================================
        this._szerkesztoMegsemmisitese();
        console.log('GondolatTipusModal - modal bezárva');
      }
    });

    await this.modal.init();

    if (this.mod === 'letrehozas') {
      const kezdoMezo = document.getElementById('gondolatTipus-kezdo-tudatpont-mezo');
      if (kezdoMezo) kezdoMezo.removeAttribute('hidden');

      // Küszöbérték szakasz megjelenítése + mezők injektálása alapértékekkel
      const kuszobSzakasz = document.getElementById('gondolatTipus-kuszob-szakasz');
      if (kuszobSzakasz) kuszobSzakasz.removeAttribute('hidden');

      const kuszobKontener = document.getElementById('gondolatTipus-kuszob-mezok-kontener');
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

    if (this.mod === 'modositas' && this.gondolatTipusAdatok) {
      this.formAdatokKitoltese();
    }

    console.log('GondolatTipusModal.init - VÉGE');
  }

  // =============================================
  // ÚJ - SZÖVEGSZERKESZTŐ LÉTREHOZÁSA
  // =============================================
  // A template-ben: <div id="leiras-szerkeszto-kontener"></div>
  // Azonos ID mint a KategoriaModal-ban – ez rendben van,
  // mert egyszerre csak egy modal lehet nyitva
  _szovegSzerkesztoLetrehozasa() {
    console.log('GondolatTipusModal._szovegSzerkesztoLetrehozasa - KEZDÉS');

    const kontener = document.getElementById('leiras-szerkeszto-kontener');
    if (!kontener) {
      console.warn('GondolatTipusModal._szovegSzerkesztoLetrehozasa - kontener nem található');
      return;
    }

    // GondolatTípus leírásánál entitás hivatkozás nem releváns
    this.szovegSzerkeszto = new SzovegSzerkeszto(kontener, {
      valtozasKezelo:       null,
      onEntitasKivalasztas: null
    });

    console.log('GondolatTipusModal._szovegSzerkesztoLetrehozasa - VÉGE');
  }

  // =============================================
  // ÚJ - SZERKESZTŐ MEGSEMMISÍTÉSE
  // =============================================
  _szerkesztoMegsemmisitese() {
    console.log('GondolatTipusModal._szerkesztoMegsemmisitese - KEZDÉS');

    if (this.szovegSzerkeszto) {
      this.szovegSzerkeszto.destroy();
      this.szovegSzerkeszto = null;
    }

    console.log('GondolatTipusModal._szerkesztoMegsemmisitese - VÉGE');
  }

  // =====================================
  // TEMPLATE BETÖLTÉSE
  // =====================================
  // Változatlan
  async templateBetoltese() {
    console.log('GondolatTipusModal.templateBetoltese - KEZDÉS');
    try {
      const valasz = await fetch('./html/components/modals/gondolatTipusModal.html');
      if (!valasz.ok) {
        console.error('GondolatTipusModal.templateBetoltese - HIBA template nem található', {
          statusz: valasz.status
        });
        return null;
      }
      const htmlSzoveg = await valasz.text();
      console.log('GondolatTipusModal.templateBetoltese - VÉGE sikeres betöltés');
      return htmlSzoveg;
    } catch (hiba) {
      console.error('GondolatTipusModal.templateBetoltese - VÉGE kivétel', {
        hiba: hiba.message
      });
      return null;
    }
  }

  // =====================================
  // MEGNYITÁS
  // =====================================
  megnyitas() {
    console.log('GondolatTipusModal.megnyitas - KEZDÉS');
    this.modal?.megnyitas();
    console.log('GondolatTipusModal.megnyitas - VÉGE');
  }

  // =====================================
  // BEZÁRÁS
  // =====================================
  bezaras() {
    console.log('GondolatTipusModal.bezaras - KEZDÉS');
    this.modal?.bezaras();
    console.log('GondolatTipusModal.bezaras - VÉGE');
  }

  // =====================================
  // FÁJLFELTÖLTŐ ESEMÉNYEK BEKÖTÉSE
  // =====================================
  // Változatlan
  fajlFeltoltoEsemenyekBekotese() {
    console.log('GondolatTipusModal.fajlFeltoltoEsemenyekBekotese - KEZDÉS');

    const fajlInput   = document.getElementById('gondolatTipus-ikon-input');
    const fajlGomb    = document.getElementById('gondolatTipus-ikon-gomb');
    const fajlNev     = document.getElementById('gondolatTipus-ikon-nev');
    const elonezet    = document.getElementById('gondolatTipus-ikon-elonezet');
    const elonezetKep = document.getElementById('gondolatTipus-ikon-elonezet-kep');

    if (!fajlInput || !fajlGomb) {
      console.error('GondolatTipusModal.fajlFeltoltoEsemenyekBekotese - HIBA elemek nem találhatók');
      return;
    }

    fajlGomb.addEventListener('click', () => {
      console.log('GondolatTipusModal - fájlválasztó gomb megnyomva');
      fajlInput.click();
    });

    fajlInput.addEventListener('change', (esemeny) => {
      const fajl = esemeny.target.files[0];
      if (!fajl) {
        console.log('GondolatTipusModal - fájlválasztás megszakítva');
        return;
      }

      console.log('GondolatTipusModal - fájl kiválasztva', {
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
        console.log('GondolatTipusModal - előnézet megjelenítve');
      };
      olvaso.readAsDataURL(fajl);
    });

    console.log('GondolatTipusModal.fajlFeltoltoEsemenyekBekotese - VÉGE');
  }

  // =====================================
  // FORM ADATOK KITÖLTÉSE
  // =====================================
  // =============================================
  // MÓDOSÍTVA - leírás betöltése SzovegSzerkesztőbe
  // =============================================
  formAdatokKitoltese() {
    console.log('GondolatTipusModal.formAdatokKitoltese - KEZDÉS', {
      gondolatTipusId: this.gondolatTipusAdatok?.id
    });

    const adatok = this.gondolatTipusAdatok;
    if (!adatok) return;

    // Név mező – változatlan
    const nevInput = document.getElementById('gondolatTipus-nev');
    if (nevInput) nevInput.value = adatok.nev || '';

    // =============================================
    // ÚJ - Leírás betöltése a SzovegSzerkesztőbe
    // =============================================
    if (this.szovegSzerkeszto) {
      if (Array.isArray(adatok.leiras)) {
        // Új formátum: blokkok tömbje
        this.szovegSzerkeszto.setTartalom(adatok.leiras);
      } else if (typeof adatok.leiras === 'string' && adatok.leiras.trim()) {
        // Régi formátum: sima string → migrálás egy blokkba
        this.szovegSzerkeszto.setTartalom([{
          id:       'migralt-blokk-1',
          tipus:    'szoveg',
          tartalom: adatok.leiras,
          formatas: { felkover: false, dolt: false, meret: 'kozepes' }
        }]);
      }
    }

    console.log('GondolatTipusModal.formAdatokKitoltese - VÉGE');
  }

  // =====================================
  // VALIDÁLÁS
  // =====================================
  // Változatlan
  validalas() {
    console.log('GondolatTipusModal.validalas - KEZDÉS');

    const nev = document.getElementById('gondolatTipus-nev')?.value?.trim();
    if (!nev) {
      console.log('GondolatTipusModal.validalas - VÉGE hiba: név hiányzik');
      return 'A gondolat típus nevének megadása kötelező.';
    }

    if (nev.length > 100) {
      console.log('GondolatTipusModal.validalas - VÉGE hiba: név túl hosszú');
      return 'A név maximum 100 karakter lehet.';
    }

    if (this.mod === 'letrehozas' && !this.kivalasztottFajl) {
      console.log('GondolatTipusModal.validalas - VÉGE hiba: ikon hiányzik');
      return 'Az ikon feltöltése kötelező.';
    }

    if (this.mod === 'letrehozas') {
      const kezdoTudatpont = parseInt(
        document.getElementById('gondolatTipus-kezdo-tudatpont')?.value
      );
      if (!kezdoTudatpont || kezdoTudatpont < 1) {
        console.log('GondolatTipusModal.validalas - VÉGE hiba: érvénytelen tudatpont');
        return 'Legalább 1 kezdő tudatpontot meg kell adni.';
      }

      // Küszöbértékek ellenőrzése (a közös segéddel)
      const kuszobHiba = kuszobMezokValidalasa(kuszobMezokOsszegyujtese(KUSZOB_PREFIX));
      if (kuszobHiba) {
        console.log('GondolatTipusModal.validalas - VÉGE hiba: küszöbérték', { kuszobHiba });
        return kuszobHiba;
      }
    }

    console.log('GondolatTipusModal.validalas - VÉGE sikeres');
    return null;
  }

  // =====================================
  // FORMDATA ÖSSZEÁLLÍTÁSA
  // =====================================
  // =============================================
  // MÓDOSÍTVA - leírás lekérése SzovegSzerkesztőből
  // =============================================
  formDataOsszeallit() {
    console.log('GondolatTipusModal.formDataOsszeallit - KEZDÉS');

    const formData = new FormData();

    const nev = document.getElementById('gondolatTipus-nev')?.value?.trim();
    formData.append('nev', nev || '');

    // =============================================
    // ÚJ - Leírás lekérése a SzovegSzerkesztőből
    // =============================================
    // JSON.stringify szükséges, mert FormData csak stringet kezel
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
      const kezdoTudatpont = document.getElementById('gondolatTipus-kezdo-tudatpont')?.value;
      formData.append('kezdoTudatpont', kezdoTudatpont || '1');

      // A négy küszöbérték hozzáfűzése (a backend gondolatTipusService ezekből
      // hozza létre a létrehozó érték javaslatát és a kezdeti hisztogramot).
      const kuszobErtekek = kuszobMezokOsszegyujtese(KUSZOB_PREFIX);
      formData.append('javaslatElfogadasiKuszob', kuszobErtekek.javaslatElfogadasiKuszob);
      formData.append('reszveteliAranyKuszob',    kuszobErtekek.reszveteliAranyKuszob);
      formData.append('minimumDontesiIdo',        kuszobErtekek.minimumDontesiIdo);
      formData.append('maximumDontesiIdo',        kuszobErtekek.maximumDontesiIdo);
    }

    console.log('GondolatTipusModal.formDataOsszeallit - VÉGE', {
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
    console.log('GondolatTipusModal.mentes - KEZDÉS', { mod: this.mod });

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
        console.log('GondolatTipusModal.mentes >>>>>>>>>>>> apiPostFormData gondolatTipus');
        eredmeny = await apiPostFormData('gondolatTipus', formData, this.token);
      } else {
        const gondolatTipusId = this.gondolatTipusAdatok.id;
        console.log('GondolatTipusModal.mentes >>>>>>>>>>>> apiPatchFormData gondolatTipus/' + gondolatTipusId);
        eredmeny = await apiPatchFormData(`gondolatTipus/${gondolatTipusId}`, formData, this.token);
      }

      this.modal.betoltesBeallitasa(false);
      this.modal.bezaras();

      if (typeof this.onSiker === 'function') {
        this.onSiker(eredmeny?.gondolatTipus);
      }

      console.log('GondolatTipusModal.mentes - VÉGE sikeres', {
        mod:             this.mod,
        gondolatTipusId: eredmeny?.gondolatTipus?.id
      });

    } catch (hiba) {
      console.error('GondolatTipusModal.mentes - HIBA', { hiba: hiba.message });
      this.modal.hibaBeallitasa(hiba.message || 'Mentés sikertelen, kérjük próbáld újra.');
    }
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
export default GondolatTipusModal;