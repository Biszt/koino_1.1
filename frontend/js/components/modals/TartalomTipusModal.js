// frontend/js/components/modal/TartalomTipusModal.js

// ===================================
// IMPORTOK
// ===================================
import Modal from './Modal.js';
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
// TARTALOM TÍPUS MODAL OSZTÁLY
// ===================================
// Két módban működik:
//   letrehozas – POST /api/tartalomTipus  (ikon kötelező)
//   modositas  – PATCH /api/tartalomTipus/:id  (ikon opcionális)
class TartalomTipusModal {

  // =====================================
  // KONSTRUKTOR
  // =====================================
  constructor(kontenerAzonosito, beallitasok) {
    console.log('TartalomTipusModal.constructor - KEZDÉS', {
      kontenerAzonosito,
      mod: beallitasok?.mod
    });

    this.kontenerAzonosito   = kontenerAzonosito;
    this.token               = tokenLekerese();
    this.mod                 = beallitasok.mod || 'letrehozas';
    this.tartalomTipusAdatok = beallitasok.tartalomTipusAdatok || null;
    this.onSiker             = beallitasok.onSiker             || null;
    this.modal               = null;
    this.kivalasztottFajl    = null;

    // =============================================
    // ÚJ - SzovegSzerkeszto példány referencia
    // =============================================
    this.szovegSzerkeszto = null;

    console.log('TartalomTipusModal.constructor - VÉGE', {
      mod:            this.mod,
      vanToken:       !!this.token,
      vanMeglevoAdat: !!this.tartalomTipusAdatok
    });
  }

  // =====================================
  // INICIALIZÁLÁS
  // =====================================
  async init() {
    console.log('TartalomTipusModal.init - KEZDÉS');

    const formHtml = await this.templateBetoltese();
    if (!formHtml) return;

    const cim = this.mod === 'letrehozas'
      ? 'Új tartalom típus létrehozása'
      : 'Tartalom típus szerkesztése';

    this.modal = new Modal(this.kontenerAzonosito, {
      cim,
      tartalom: formHtml,
      meret:    'alap',
      gombok: [
        {
          felirat:   this.mod === 'letrehozas' ? 'Létrehozás' : 'Mentés',
          tipus:     'elsodleges',
          azonosito: 'tartalomTipus-modal-mentes-gomb',
          akcio:     () => this.mentes()
        },
        {
          felirat:   'Mégsem',
          tipus:     'masodlagos',
          azonosito: 'tartalomTipus-modal-megse-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => {
        // =============================================
        // ÚJ - Szerkesztő megsemmisítése bezáráskor
        // =============================================
        this._szerkesztoMegsemmisitese();
        console.log('TartalomTipusModal - modal bezárva');
      }
    });

    await this.modal.init();

    if (this.mod === 'letrehozas') {
      const kezdoMezo = document.getElementById('tartalomTipus-kezdo-tudatpont-mezo');
      if (kezdoMezo) kezdoMezo.removeAttribute('hidden');

      // Küszöbérték szakasz megjelenítése + mezők injektálása alapértékekkel
      const kuszobSzakasz = document.getElementById('tartalomTipus-kuszob-szakasz');
      if (kuszobSzakasz) kuszobSzakasz.removeAttribute('hidden');

      const kuszobKontener = document.getElementById('tartalomTipus-kuszob-mezok-kontener');
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

    if (this.mod === 'modositas' && this.tartalomTipusAdatok) {
      this.formAdatokKitoltese();
    }

    console.log('TartalomTipusModal.init - VÉGE');
  }

  // =============================================
  // ÚJ - SZÖVEGSZERKESZTŐ LÉTREHOZÁSA
  // =============================================
  // A template-ben: <div id="leiras-szerkeszto-kontener"></div>
  // Azonos ID mint a KategoriaModal-ban – ez rendben van,
  // mert egyszerre csak egy modal lehet nyitva
  _szovegSzerkesztoLetrehozasa() {
    console.log('TartalomTipusModal._szovegSzerkesztoLetrehozasa - KEZDÉS');

    const kontener = document.getElementById('leiras-szerkeszto-kontener');
    if (!kontener) {
      console.warn('TartalomTipusModal._szovegSzerkesztoLetrehozasa - kontener nem található');
      return;
    }

    // TartalomTípus leírásánál entitás hivatkozás nem releváns
    this.szovegSzerkeszto = new SzovegSzerkeszto(kontener, {
      valtozasKezelo:       null,
      onEntitasKivalasztas: null
    });

    console.log('TartalomTipusModal._szovegSzerkesztoLetrehozasa - VÉGE');
  }

  // =============================================
  // ÚJ - SZERKESZTŐ MEGSEMMISÍTÉSE
  // =============================================
  _szerkesztoMegsemmisitese() {
    console.log('TartalomTipusModal._szerkesztoMegsemmisitese - KEZDÉS');

    if (this.szovegSzerkeszto) {
      this.szovegSzerkeszto.destroy();
      this.szovegSzerkeszto = null;
    }

    console.log('TartalomTipusModal._szerkesztoMegsemmisitese - VÉGE');
  }

  // =====================================
  // TEMPLATE BETÖLTÉSE
  // =====================================
  // Változatlan
  async templateBetoltese() {
    console.log('TartalomTipusModal.templateBetoltese - KEZDÉS');
    try {
      const valasz = await fetch('./html/components/modals/tartalomTipusModal.html');
      if (!valasz.ok) {
        console.error('TartalomTipusModal.templateBetoltese - HIBA template nem található', {
          statusz: valasz.status
        });
        return null;
      }
      const htmlSzoveg = await valasz.text();
      console.log('TartalomTipusModal.templateBetoltese - VÉGE sikeres betöltés');
      return htmlSzoveg;
    } catch (hiba) {
      console.error('TartalomTipusModal.templateBetoltese - VÉGE kivétel', {
        hiba: hiba.message
      });
      return null;
    }
  }

  // =====================================
  // MEGNYITÁS
  // =====================================
  megnyitas() {
    console.log('TartalomTipusModal.megnyitas - KEZDÉS');
    this.modal?.megnyitas();
    console.log('TartalomTipusModal.megnyitas - VÉGE');
  }

  // =====================================
  // BEZÁRÁS
  // =====================================
  bezaras() {
    console.log('TartalomTipusModal.bezaras - KEZDÉS');
    this.modal?.bezaras();
    console.log('TartalomTipusModal.bezaras - VÉGE');
  }

  // =====================================
  // FÁJLFELTÖLTŐ ESEMÉNYEK BEKÖTÉSE
  // =====================================
  // Változatlan
  fajlFeltoltoEsemenyekBekotese() {
    console.log('TartalomTipusModal.fajlFeltoltoEsemenyekBekotese - KEZDÉS');

    const fajlInput   = document.getElementById('tartalomTipus-ikon-input');
    const fajlGomb    = document.getElementById('tartalomTipus-ikon-gomb');
    const fajlNev     = document.getElementById('tartalomTipus-ikon-nev');
    const elonezet    = document.getElementById('tartalomTipus-ikon-elonezet');
    const elonezetKep = document.getElementById('tartalomTipus-ikon-elonezet-kep');

    if (!fajlInput || !fajlGomb) {
      console.error('TartalomTipusModal.fajlFeltoltoEsemenyekBekotese - HIBA elemek nem találhatók');
      return;
    }

    fajlGomb.addEventListener('click', () => {
      console.log('TartalomTipusModal - fájlválasztó gomb megnyomva');
      fajlInput.click();
    });

    fajlInput.addEventListener('change', (esemeny) => {
      const fajl = esemeny.target.files[0];
      if (!fajl) {
        console.log('TartalomTipusModal - fájlválasztás megszakítva');
        return;
      }

      console.log('TartalomTipusModal - fájl kiválasztva', {
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
        console.log('TartalomTipusModal - előnézet megjelenítve');
      };
      olvaso.readAsDataURL(fajl);
    });

    console.log('TartalomTipusModal.fajlFeltoltoEsemenyekBekotese - VÉGE');
  }

  // =====================================
  // FORM ADATOK KITÖLTÉSE
  // =====================================
  // =============================================
  // MÓDOSÍTVA - leírás betöltése SzovegSzerkesztőbe
  // =============================================
  formAdatokKitoltese() {
    console.log('TartalomTipusModal.formAdatokKitoltese - KEZDÉS', {
      tartalomTipusId: this.tartalomTipusAdatok?.id
    });

    const adatok = this.tartalomTipusAdatok;
    if (!adatok) return;

    // Név mező – változatlan
    const nevInput = document.getElementById('tartalomTipus-nev');
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

    console.log('TartalomTipusModal.formAdatokKitoltese - VÉGE');
  }

  // =====================================
  // VALIDÁLÁS
  // =====================================
  // Változatlan
  validalas() {
    console.log('TartalomTipusModal.validalas - KEZDÉS');

    const nev = document.getElementById('tartalomTipus-nev')?.value?.trim();
    if (!nev) {
      console.log('TartalomTipusModal.validalas - VÉGE hiba: név hiányzik');
      return 'A tartalom típus nevének megadása kötelező.';
    }

    if (nev.length > 100) {
      console.log('TartalomTipusModal.validalas - VÉGE hiba: név túl hosszú');
      return 'A név maximum 100 karakter lehet.';
    }

    if (this.mod === 'letrehozas' && !this.kivalasztottFajl) {
      console.log('TartalomTipusModal.validalas - VÉGE hiba: ikon hiányzik');
      return 'Az ikon feltöltése kötelező.';
    }

    if (this.mod === 'letrehozas') {
      const kezdoTudatpont = parseInt(
        document.getElementById('tartalomTipus-kezdo-tudatpont')?.value
      );
      if (!kezdoTudatpont || kezdoTudatpont < 1) {
        console.log('TartalomTipusModal.validalas - VÉGE hiba: érvénytelen tudatpont');
        return 'Legalább 1 kezdő tudatpontot meg kell adni.';
      }

      // Küszöbértékek ellenőrzése (a közös segéddel)
      const kuszobHiba = kuszobMezokValidalasa(kuszobMezokOsszegyujtese(KUSZOB_PREFIX));
      if (kuszobHiba) {
        console.log('TartalomTipusModal.validalas - VÉGE hiba: küszöbérték', { kuszobHiba });
        return kuszobHiba;
      }
    }

    console.log('TartalomTipusModal.validalas - VÉGE sikeres');
    return null;
  }

  // =====================================
  // FORMDATA ÖSSZEÁLLÍTÁSA
  // =====================================
  // =============================================
  // MÓDOSÍTVA - leírás lekérése SzovegSzerkesztőből
  // =============================================
  formDataOsszeallit() {
    console.log('TartalomTipusModal.formDataOsszeallit - KEZDÉS');

    const formData = new FormData();

    const nev = document.getElementById('tartalomTipus-nev')?.value?.trim();
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
      const kezdoTudatpont = document.getElementById('tartalomTipus-kezdo-tudatpont')?.value;
      formData.append('kezdoTudatpont', kezdoTudatpont || '1');

      // A négy küszöbérték hozzáfűzése (a backend tartalomTipusService ezekből
      // hozza létre a létrehozó érték javaslatát és a kezdeti hisztogramot).
      const kuszobErtekek = kuszobMezokOsszegyujtese(KUSZOB_PREFIX);
      formData.append('javaslatElfogadasiKuszob', kuszobErtekek.javaslatElfogadasiKuszob);
      formData.append('reszveteliAranyKuszob',    kuszobErtekek.reszveteliAranyKuszob);
      formData.append('minimumDontesiIdo',        kuszobErtekek.minimumDontesiIdo);
      formData.append('maximumDontesiIdo',        kuszobErtekek.maximumDontesiIdo);
    }

    console.log('TartalomTipusModal.formDataOsszeallit - VÉGE', {
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
    console.log('TartalomTipusModal.mentes - KEZDÉS', { mod: this.mod });

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
        console.log('TartalomTipusModal.mentes >>>>>>>>>>>> apiPostFormData tartalomTipus');
        eredmeny = await apiPostFormData('tartalomTipus', formData, this.token);
      } else {
        const tartalomTipusId = this.tartalomTipusAdatok.id;
        console.log('TartalomTipusModal.mentes >>>>>>>>>>>> apiPatchFormData tartalomTipus/' + tartalomTipusId);
        eredmeny = await apiPatchFormData(`tartalomTipus/${tartalomTipusId}`, formData, this.token);
      }

      this.modal.betoltesBeallitasa(false);
      this.modal.bezaras();

      if (typeof this.onSiker === 'function') {
        this.onSiker(eredmeny?.tartalomTipus);
      }

      console.log('TartalomTipusModal.mentes - VÉGE sikeres', {
        mod:             this.mod,
        tartalomTipusId: eredmeny?.tartalomTipus?.id
      });

    } catch (hiba) {
      console.error('TartalomTipusModal.mentes - HIBA', { hiba: hiba.message });
      this.modal.hibaBeallitasa(hiba.message || 'Mentés sikertelen, kérjük próbáld újra.');
    }
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
export default TartalomTipusModal;