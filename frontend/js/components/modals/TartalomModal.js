// frontend/js/components/modal/TartalomModal.js

// ===== IMPORTOK =====
// Alap modal komponens – ez kezeli a megjelenítést, gombokat, hibákat
import Modal from './Modal.js';

// API helper metódusok – GET, POST, PATCH kérésekhez
import { apiGet, apiPost, apiPatch } from '../../utils/apiHelper.js';

// tokenLekerese: a JWT tokent az authHelper-ből olvassuk
import { tokenLekerese } from '../../utils/authHelper.js';

import SzovegSzerkeszto from '../szovegSzerkeszto/SzovegSzerkeszto.js';

// Közös küszöbérték-mezők (támogatottsági %, részvételi %, min/max döntési idő)
import {
  kuszobMezokHtml,
  kuszobMezokKitoltese,
  kuszobMezokOsszegyujtese,
  kuszobMezokValidalasa,
  KUSZOB_ALAPERTEKEK
} from './kuszobErtekMezok.js';

// A küszöbmezők egyedi id-előtagja ebben a modálban (nem ütközik az ErtekJavaslatModal 'ej'-jével)
const KUSZOB_PREFIX = 'uj';

// ===== TARTALOM MODAL OSZTÁLY =====
// Két módban működik:
//   'letrehozas' → POST /api/tartalom (kezdoTudatpont kötelező)
//   'modositas'  → PATCH /api/tartalom/:id
class TartalomModal {

  // ===== KONSTRUKTOR =====
  // @param {string}   kontenerAzonosito              – a div ID-ja, ahova a modal kerül
  // @param {Object}   beallitasok                    – a modal viselkedése
  // @param {string}   beallitasok.mod                – 'letrehozas' | 'modositas'
  // @param {Object}   beallitasok.tartalomAdatok     – meglévő tartalom (csak módosításnál)
  // @param {Object}   beallitasok.szuloAdatok        – { szuloId, szuloTipus } (opcionális)
  // @param {Function} beallitasok.onSiker            – sikeres mentés után hívódik meg
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('TartalomModal.constructor - KEZDÉS', {
      mod:        beallitasok?.mod,
      tartalomId: beallitasok?.tartalomAdatok?._id
    });

    this.kontenerAzonosito = kontenerAzonosito;
    this.token             = tokenLekerese();
    this.mod               = beallitasok.mod || 'letrehozas';
    this.tartalomAdatok    = beallitasok.tartalomAdatok || null;
    this.szuloAdatok       = beallitasok.szuloAdatok    || null;
    this.onSiker           = beallitasok.onSiker        || null;

    this.modal    = null;
    this.tartalomTipusok = [];
    this.kategoriak      = [];
    this.kivalasztottKategoriaIds = [];

    // =============================================
    // ÚJ - SzovegSzerkeszto példány referencia
    // =============================================
    // A szövegmező helyett ez kezeli a rich text tartalmat
    this.szovegSzerkeszto = null;

    console.log('TartalomModal.constructor - VÉGE', {
      mod:      this.mod,
      vanToken: !!this.token
    });
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('TartalomModal.init - KEZDÉS');

    const formHtml = await this._templateBetoltese();
    if (!formHtml) return;

    const cim = this.mod === 'letrehozas'
      ? 'Új tartalom létrehozása'
      : 'Tartalom szerkesztése';

    this.modal = new Modal(this.kontenerAzonosito, {
      cim,
      tartalom: formHtml,
      meret:    'szeles',
      gombok: [
        {
          felirat:   this.mod === 'letrehozas' ? 'Létrehozás' : 'Mentés',
          tipus:     'elsodleges',
          azonosito: 'tartalom-modal-mentes-gomb',
          akcio:     () => this._mentes()
        },
        {
          felirat:   'Mégse',
          tipus:     'masodlagos',
          azonosito: 'tartalom-modal-megse-gomb',
          akcio:     () => this.modal.bezaras()
        }
      ],
      onBezaras: () => {
        // =============================================
        // ÚJ - Szerkesztő megsemmisítése bezáráskor
        // =============================================
        // Memóriaszivárgás elkerülése érdekében
        this._szerkesztoMegsemmisitese();
        console.log('TartalomModal - modal bezárva');
      }
    });

    await this.modal.init();

    if (this.mod === 'letrehozas') {
      const kezdoMezo = document.getElementById('kezdo-tudatpont-mezo');
      if (kezdoMezo) kezdoMezo.removeAttribute('hidden');

      // Küszöbérték szakasz megjelenítése + a négy mező injektálása és
      // kitöltése az alapértékekkel (csak létrehozáskor van értelme).
      const kuszobSzakasz = document.getElementById('kuszob-mezok-szakasz');
      if (kuszobSzakasz) kuszobSzakasz.removeAttribute('hidden');

      const kuszobKontener = document.getElementById('kuszob-mezok-kontener');
      if (kuszobKontener) {
        kuszobKontener.innerHTML = kuszobMezokHtml(KUSZOB_PREFIX);
        kuszobMezokKitoltese(KUSZOB_PREFIX, { ...KUSZOB_ALAPERTEKEK });
      }
    }

    this._kategoriaValasztoBekotese();

    // =============================================
    // ÚJ - SzovegSzerkeszto inicializálása
    // =============================================
    // A textarea helyett a rich text szerkesztőt hozzuk létre
    this._szovegSzerkesztoLetrehozasa();

    await this._lenyiloAdatokBetoltese();

    if (this.mod === 'modositas' && this.tartalomAdatok) {
      this._formAdatokKitoltese();
    }

    console.log('TartalomModal.init - VÉGE');
  }

  // =============================================
  // ÚJ - SZÖVEGSZERKESZTŐ LÉTREHOZÁSA
  // =============================================
  // Megkeresi a template-ben lévő szerkesztő konténert,
  // és ott példányosítja a SzovegSzerkeszto osztályt.
  // A textarea elem el van rejtve – nem töröljük, mert a
  // template-be beégetett elem, csak nem használjuk.
  _szovegSzerkesztoLetrehozasa() {
    console.log('TartalomModal._szovegSzerkesztoLetrehozasa - KEZDÉS');

    // A template-ben egy üres div várja a szerkesztőt:
    // <div id="szoveg-szerkeszto-kontener"></div>
    const kontener = document.getElementById('szoveg-szerkeszto-kontener');
    if (!kontener) {
      console.warn('TartalomModal._szovegSzerkesztoLetrehozasa - kontener nem található');
      return;
    }

    // SzovegSzerkeszto példányosítása
    this.szovegSzerkeszto = new SzovegSzerkeszto(kontener, {

      // Változáskor nem kell azonnal menteni, csak ha a felhasználó
      // a Mentés gombra kattint – ezért a valtozasKezelo itt üres
      valtozasKezelo: null,

      // Entitás hivatkozásra koppintáskor:
      // a modal bezárul, és az adott entitás lesz a kiválasztott
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        console.log('TartalomModal - entitás hivatkozás koppintva:', { entitasId, entitasTipus });
        // Modal bezárása, majd a Pakli értesítése
        this.modal.bezaras();
        // A Pakli globálisan elérhető példányán keresztül váltunk
        // (a Pakli.js window.aktivPakli-ban tárolja magát)
        if (window.aktivPakli) {
          window.aktivPakli.entitasKivalasztasa(entitasId, entitasTipus);
        }
      }
    });

    console.log('TartalomModal._szovegSzerkesztoLetrehozasa - VÉGE');
  }

  // =============================================
  // ÚJ - SZERKESZTŐ MEGSEMMISÍTÉSE
  // =============================================
  // Modal bezárásakor hívjuk meg – felszabadítja a memóriát
  _szerkesztoMegsemmisitese() {
    console.log('TartalomModal._szerkesztoMegsemmisitese - KEZDÉS');

    if (this.szovegSzerkeszto) {
      this.szovegSzerkeszto.destroy();
      this.szovegSzerkeszto = null;
    }

    console.log('TartalomModal._szerkesztoMegsemmisitese - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    console.log('TartalomModal._templateBetoltese - KEZDÉS');

    try {
      const valasz = await fetch('./html/components/modals/tartalomModal.html');

      if (!valasz.ok) {
        console.error('TartalomModal._templateBetoltese - HIBA: template nem található', {
          statusz: valasz.status
        });
        return null;
      }

      const htmlSzoveg = await valasz.text();

      console.log('TartalomModal._templateBetoltese - VÉGE: sikeres betöltés');
      return htmlSzoveg;

    } catch (hiba) {
      console.error('TartalomModal._templateBetoltese - VÉGE: kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  megnyitas() {
    console.log('TartalomModal.megnyitas - KEZDÉS');
    this.modal?.megnyitas();
    console.log('TartalomModal.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    console.log('TartalomModal.bezaras - KEZDÉS');
    this.modal?.bezaras();
    console.log('TartalomModal.bezaras - VÉGE');
  }

  // ===== LENYÍLÓ ADATOK BETÖLTÉSE =====
  async _lenyiloAdatokBetoltese() {
    console.log('TartalomModal._lenyiloAdatokBetoltese - KEZDÉS');

    try {
      const [tipusValasz, kategoriaValasz] = await Promise.all([
        apiGet('tartalomTipus', this.token),
        apiGet('kategoria',     this.token)
      ]);

      this.tartalomTipusok = tipusValasz?.tartalomTipusok || [];
      this._tipusSelectFeltoltese();

      this.kategoriak = kategoriaValasz?.kategoriak || [];
      this._kategoriaSelectFeltoltese();

      console.log('TartalomModal._lenyiloAdatokBetoltese - VÉGE', {
        tipusokSzama:    this.tartalomTipusok.length,
        kategoriakSzama: this.kategoriak.length
      });

    } catch (hiba) {
      console.error('TartalomModal._lenyiloAdatokBetoltese - HIBA', { hiba: hiba.message });
    }
  }

  // ===== TÍPUS SELECT FELTÖLTÉSE =====
  _tipusSelectFeltoltese() {
    console.log('TartalomModal._tipusSelectFeltoltese - KEZDÉS');

    const selectElem = document.getElementById('tartalom-tipus');
    if (!selectElem) return;

    this.tartalomTipusok.forEach(tipus => {
      const option       = document.createElement('option');
      option.value       = tipus._id;
      option.textContent = tipus.nev;
      selectElem.appendChild(option);
    });

    console.log('TartalomModal._tipusSelectFeltoltese - VÉGE', {
      tipusokSzama: this.tartalomTipusok.length
    });
  }

  // ===== KATEGÓRIÁK FA-SORRENDBE RENDEZÉSE =====
  // A lapos kategória-listát HIERARCHIKUS sorrendbe teszi: minden kategória a
  // szülője után jön, és megkapja a MÉLYSÉGÉT (0 = gyökér). Így a legördülőben
  // az alkategóriák a szülőjük alatt, behúzva jelenhetnek meg.
  // A mélységet a TELJES fából számoljuk (a kiválasztott, épp elrejtett kategóriák
  // is beleszámítanak), hogy egy gyerek behúzása akkor is helyes maradjon, ha a
  // szülője épp ki van választva.
  // @returns {Array<{kat: Object, melyseg: number}>} fa-sorrendű lista mélységgel
  _kategoriakFaSorrendbe() {
    console.log('TartalomModal._kategoriakFaSorrendbe - KEZDÉS', {
      osszes: this.kategoriak.length
    });

    // Gyerekek csoportosítása szülő szerint (kulcs: szuloId string, gyökérnél 'null')
    const gyerekekMap = new Map();
    this.kategoriak.forEach(kat => {
      const kulcs = kat.szuloId ? kat.szuloId.toString() : 'null';
      if (!gyerekekMap.has(kulcs)) gyerekekMap.set(kulcs, []);
      gyerekekMap.get(kulcs).push(kat);
    });

    const eredmeny = [];
    const bejart   = new Set(); // kör-védelem + duplikáció ellen

    // Mélységi bejárás (DFS): a gyökerektől lefelé, mélységgel
    const bejar = (szuloKulcs, melyseg) => {
      const gyerekek = gyerekekMap.get(szuloKulcs) || [];
      gyerekek.forEach(kat => {
        const id = kat._id.toString();
        if (bejart.has(id)) return; // már bejártuk (kör vagy duplikáció)
        bejart.add(id);
        eredmeny.push({ kat, melyseg });
        bejar(id, melyseg + 1); // a gyerekei eggyel beljebb
      });
    };
    bejar('null', 0);

    // Árvák: olyan kategória, amelynek szülője NINCS a listában (nem értük el) →
    // gyökérként a lista végére fűzzük, hogy egyetlen kategória se maradjon ki.
    this.kategoriak.forEach(kat => {
      if (!bejart.has(kat._id.toString())) {
        bejart.add(kat._id.toString());
        eredmeny.push({ kat, melyseg: 0 });
      }
    });

    console.log('TartalomModal._kategoriakFaSorrendbe - VÉGE', {
      rendezett: eredmeny.length
    });
    return eredmeny;
  }

  // ===== KATEGÓRIA SELECT FELTÖLTÉSE =====
  _kategoriaSelectFeltoltese() {
    console.log('TartalomModal._kategoriaSelectFeltoltese - KEZDÉS');

    const selectElem = document.getElementById('tartalom-kategoria-valaszto');
    if (!selectElem) return;

    // Fa-sorrend (mélységgel), majd a MÁR kiválasztottakat kihagyjuk a legördülőből
    const faSorrend = this._kategoriakFaSorrendbe();

    selectElem.innerHTML = '<option value="">– Kategória hozzáadása, maximum 3 – (opcionális)</option>';

    let szabadSzam = 0;
    faSorrend.forEach(({ kat, melyseg }) => {
      if (this.kivalasztottKategoriaIds.includes(kat._id)) return; // már kiválasztott

      const option = document.createElement('option');
      option.value = kat._id;
      // Behúzás a mélység szerint: nem törő szóközök + egy fa-jel a nem-gyökereknél.
      // (Az <option> nem stílusozható megbízhatóan, ezért szöveges behúzást használunk.)
      const behuzas = melyseg > 0
        ? '  '.repeat(melyseg) + '└ '
        : '';
      option.textContent = behuzas + kat.nev;
      selectElem.appendChild(option);
      szabadSzam++;
    });

    selectElem.disabled = this.kivalasztottKategoriaIds.length >= 3;

    console.log('TartalomModal._kategoriaSelectFeltoltese - VÉGE', {
      szabad:       szabadSzam,
      kivalasztott: this.kivalasztottKategoriaIds.length
    });
  }

  // ===== KATEGÓRIA VÁLASZTÓ BEKÖTÉSE =====
  _kategoriaValasztoBekotese() {
    console.log('TartalomModal._kategoriaValasztoBekotese - KEZDÉS');

    const kontener   = document.getElementById(this.kontenerAzonosito);
    const selectElem = kontener?.querySelector('#tartalom-kategoria-valaszto');
    if (!selectElem) return;

    selectElem.addEventListener('change', (esemeny) => {
      const kivalasztottId  = esemeny.target.value;
      const kivalasztottNev = esemeny.target.options[esemeny.target.selectedIndex]?.text;

      if (!kivalasztottId) return;

      if (this.kivalasztottKategoriaIds.length >= 3) {
        console.warn('TartalomModal - max 3 kategória adható meg');
        esemeny.target.value = '';
        return;
      }

      this.kivalasztottKategoriaIds.push(kivalasztottId);
      this._kategoriaChipHozzaadasa(kivalasztottId, kivalasztottNev);
      this._kategoriaSelectFeltoltese();
      esemeny.target.value = '';
    });

    console.log('TartalomModal._kategoriaValasztoBekotese - VÉGE');
  }

  // ===== KATEGÓRIA CHIP HOZZÁADÁSA =====
  _kategoriaChipHozzaadasa(id, nev) {
    console.log('TartalomModal._kategoriaChipHozzaadasa - KEZDÉS', { id, nev });

    const chipKontener = document.getElementById('kategoria-chipek');
    if (!chipKontener) return;

    const chip = document.createElement('span');
    chip.className           = 't-modal-kategoria-chip';
    chip.dataset.kategoriaId = id;

    const nevElem = document.createElement('span');
    nevElem.className   = 't-modal-chip-nev';
    nevElem.textContent = nev;

    const torloGomb = document.createElement('button');
    torloGomb.type      = 'button';
    torloGomb.className = 't-modal-chip-torlo';
    torloGomb.setAttribute('aria-label', `${nev} kategória eltávolítása`);
    torloGomb.textContent = '✕';

    torloGomb.addEventListener('click', () => {
      this._kategoriaEltavolitasa(id, chip);
    });

    chip.appendChild(nevElem);
    chip.appendChild(torloGomb);
    chipKontener.appendChild(chip);

    console.log('TartalomModal._kategoriaChipHozzaadasa - VÉGE', { id, nev });
  }

  // ===== KATEGÓRIA ELTÁVOLÍTÁSA =====
  _kategoriaEltavolitasa(id, chip) {
    console.log('TartalomModal._kategoriaEltavolitasa - KEZDÉS', { id });

    this.kivalasztottKategoriaIds = this.kivalasztottKategoriaIds.filter(
      kId => kId !== id
    );

    chip.remove();
    this._kategoriaSelectFeltoltese();

    console.log('TartalomModal._kategoriaEltavolitasa - VÉGE', {
      maradtSzama: this.kivalasztottKategoriaIds.length
    });
  }

  // ===== FORM ADATOK KITÖLTÉSE =====
  // =============================================
  // MÓDOSÍTVA - szöveg betöltése SzovegSzerkesztőbe
  // =============================================
  _formAdatokKitoltese() {
    console.log('TartalomModal._formAdatokKitoltese - KEZDÉS', {
      tartalomId: this.tartalomAdatok?._id
    });

    const adatok = this.tartalomAdatok;
    if (!adatok) return;

    // Cím mező – változatlan
    const cimInput = document.getElementById('tartalom-cim');
    if (cimInput) cimInput.value = adatok.cim || '';

    // =============================================
    // ÚJ - Szöveg betöltése a SzovegSzerkesztőbe
    // =============================================
    // Ha a szöveg strukturált (JSON tömb), betöltjük a szerkesztőbe.
    // Ha régi formátumú (sima string), azt is kezeljük.
    if (this.szovegSzerkeszto) {
      if (Array.isArray(adatok.szoveg)) {
        // Új formátum: blokkok tömbje
        this.szovegSzerkeszto.setTartalom(adatok.szoveg);
      } else if (typeof adatok.szoveg === 'string' && adatok.szoveg.trim()) {
        // Régi formátum: sima szöveg → egy szöveges blokkba csomagoljuk
        this.szovegSzerkeszto.setTartalom([{
          id:      'migralt-blokk-1',
          tipus:   'szoveg',
          tartalom: adatok.szoveg,
          formatas: { felkover: false, dolt: false, meret: 'kozepes' }
        }]);
      }
    }

    // Típus select – változatlan
    const tipusSelect = document.getElementById('tartalom-tipus');
    if (tipusSelect && adatok.tartalomTipusId) {
      tipusSelect.value = adatok.tartalomTipusId;
    }

    // Kategóriák – változatlan
    if (adatok.kategoriaIds && adatok.kategoriaIds.length > 0) {
      adatok.kategoriaIds.forEach(katId => {
        const kat = this.kategoriak.find(k => k._id === katId);
        if (kat) {
          this.kivalasztottKategoriaIds.push(katId);
          this._kategoriaChipHozzaadasa(katId, kat.nev);
        }
      });
      this._kategoriaSelectFeltoltese();
    }

    console.log('TartalomModal._formAdatokKitoltese - VÉGE');
  }

  // ===== VALIDÁLÁS =====
  _validalas() {
    console.log('TartalomModal._validalas - KEZDÉS');

    const cim = document.getElementById('tartalom-cim')?.value?.trim();
    if (!cim) {
      console.log('TartalomModal._validalas - VÉGE (hiba: cím hiányzik)');
      return 'A cím megadása kötelező.';
    }

    if (cim.length > 200) {
      console.log('TartalomModal._validalas - VÉGE (hiba: cím túl hosszú)');
      return 'A cím maximum 200 karakter lehet.';
    }

    if (this.mod === 'letrehozas') {
      const kezdoTudatpont = parseInt(
        document.getElementById('tartalom-kezdo-tudatpont')?.value
      );
      if (!kezdoTudatpont || kezdoTudatpont < 1) {
        console.log('TartalomModal._validalas - VÉGE (hiba: érvénytelen tudatpont)');
        return 'Legalább 1 kezdő tudatpontot meg kell adni.';
      }

      // Küszöbértékek ellenőrzése (a közös segéddel, a backend szabályaival azonos)
      const kuszobHiba = kuszobMezokValidalasa(kuszobMezokOsszegyujtese(KUSZOB_PREFIX));
      if (kuszobHiba) {
        console.log('TartalomModal._validalas - VÉGE (hiba: küszöbérték)', { kuszobHiba });
        return kuszobHiba;
      }
    }

    console.log('TartalomModal._validalas - VÉGE (sikeres)');
    return null;
  }

  // ===== ADATOK ÖSSZEGYŰJTÉSE =====
  // =============================================
  // MÓDOSÍTVA - szöveg lekérése SzovegSzerkesztőből
  // =============================================
  _adatokOsszegyujtese() {
    console.log('TartalomModal._adatokOsszegyujtese - KEZDÉS');

    const cim     = document.getElementById('tartalom-cim')?.value?.trim();
    const tipusId = document.getElementById('tartalom-tipus')?.value || null;

    // =============================================
    // ÚJ - Szöveg lekérése a SzovegSzerkesztőből
    // =============================================
    // getTartalom() visszaadja a blokkok tömbjét JSON-ként
    const szoveg = this.szovegSzerkeszto
      ? this.szovegSzerkeszto.getTartalom()
      : [];

    const adatok = {
      cim,
      szoveg,              // Már nem string, hanem blokkok tömbje
      tartalomTipusId: tipusId || undefined,
      kategoriaIds:    [...this.kivalasztottKategoriaIds]
    };

    if (this.szuloAdatok?.szuloId) {
      adatok.szuloId    = this.szuloAdatok.szuloId;
      adatok.szuloTipus = this.szuloAdatok.szuloTipus;
    }

    if (this.mod === 'letrehozas') {
      adatok.kezdoTudatpont = parseInt(
        document.getElementById('tartalom-kezdo-tudatpont')?.value
      );

      // A négy küszöbérték hozzáfűzése – a backend tartalomLetrehozasa ezekből
      // hozza létre a létrehozó érték javaslatát és a kezdeti hisztogramot.
      Object.assign(adatok, kuszobMezokOsszegyujtese(KUSZOB_PREFIX));
    }

    console.log('TartalomModal._adatokOsszegyujtese - VÉGE', {
      cim,
      szovegBlokkokSzama: szoveg.length,
      kategoriaIdsSzama:  adatok.kategoriaIds.length
    });
    return adatok;
  }

  // ===== MENTÉS =====
  async _mentes() {
    console.log('TartalomModal._mentes - KEZDÉS', { mod: this.mod });

    const hibaUzenet = this._validalas();
    if (hibaUzenet) {
      this.modal.hibaBeallitasa(hibaUzenet);
      return;
    }

    this.modal.hibaTisztitasa();
    this.modal.betoltesBeallitasa(true);

    try {
      // HALASZTOTT FELTÖLTÉS: a szerkesztőben függőben lévő (még csak helyben,
      // blob:-URL-ként tárolt) képeket/fájlokat MOST töltjük fel, és a
      // blob:-URL-eket valódi szerver-URL-re cseréljük. Így csak akkor kerül
      // fájl a szerverre, ha tényleg mentünk. Hiba esetén a hívás dob, és a
      // lenti catch megjeleníti az üzenetet (semmi nem mentődik el).
      if (this.szovegSzerkeszto) {
        await this.szovegSzerkeszto.fuggoFeltoltesekVeglegesitese(this.token);
      }

      const adatok = this._adatokOsszegyujtese();

      let eredmeny;
      if (this.mod === 'letrehozas') {
        eredmeny = await apiPost('tartalom', adatok, this.token);
      } else {
        const tartalomId = this.tartalomAdatok._id;
        eredmeny = await apiPatch(`tartalom/${tartalomId}`, adatok, this.token);
      }

      this.modal.betoltesBeallitasa(false);
      this.modal.bezaras();

      if (typeof this.onSiker === 'function') {
        this.onSiker(eredmeny?.tartalom);
      }

      console.log('TartalomModal._mentes - VÉGE (sikeres)', {
        mod:        this.mod,
        tartalomId: eredmeny?.tartalom?._id
      });

    } catch (hiba) {
      console.error('TartalomModal._mentes - HIBA', { hiba: hiba.message });
      // A betöltés-jelző leállítása, hogy hiba (pl. sikertelen kép-feltöltés)
      // után se ragadjon be a pörgő spinner.
      this.modal.betoltesBeallitasa(false);
      this.modal.hibaBeallitasa(
        hiba.message || 'Mentés sikertelen, kérjük próbáld újra.'
      );
    }
  }

}

// ===== EXPORTÁLÁS =====
export default TartalomModal;