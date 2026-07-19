// frontend/js/components/modals/TerkepModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, API_ALAP_URL } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import FaElrendezes from '../../utils/faElrendezes.js';

// ===== ENTITÁSTÍPUS → IKON / SZÍN / FELIRAT =====
// Az ikonok a platform egységes ikon-készletét követik (kategória 🧩 stb.).
const TIPUS_IKON = {
  Tartalom:      '📄',
  Kategoria:     '🧩',
  TartalomTipus: '🏷️',
  Javaslat:      '📋',
  Egyezmeny:     '🤝',
};

// A Canvas-pöttyök és az SVG-csomópontok típus-színei (erdő-témához igazítva)
const TIPUS_SZIN = {
  Tartalom:      '#2d5a27', // erdőzöld (elsődleges szín)
  Kategoria:     '#7d5ba6', // lila
  TartalomTipus: '#b07d2a', // okker
  Javaslat:      '#1f6e8c', // kékeszöld
  Egyezmeny:     '#6d6a62', // szürkésbarna
};

// Cím nélküli entitások (Javaslat/Egyezmény) felirata a csomóponton
const TIPUS_FELIRAT = {
  Tartalom:      'Tartalom',
  Kategoria:     'Kategória',
  TartalomTipus: 'Tartalomtípus',
  Javaslat:      'Javaslat',
  Egyezmeny:     'Egyezmény',
};

// ===== HANGOLÓ ÁLLANDÓK =====
const LAP_MERET          = 2000; // letöltés: ennyi sor / kérés
const ELRENDEZES_DARAB   = 1500; // elrendezés: ennyi csomópont / darab (rAF-szünetekkel)
const SVG_CSOMOPONT_MAX  = 250;  // az SVG fedőréteg legfeljebb ennyi látható csomópontot rajzol
const CIM_MAX_HOSSZ      = 15;   // a csomópont-felirat hossza (a többi tooltipben)
const POTTY_SUGAR        = 4;    // Canvas-pötty sugara (képernyő-px)
const SVG_KOR_SUGAR      = 14;   // SVG-csomópont körének sugara (képernyő-px)
const ZOOM_LEPES         = 1.2;  // a ＋/－ gombok és a görgetés zoom-szorzója
const MAX_ZOOM           = 4;    // ennél jobban nem nagyítunk
const KATTINTAS_KUSZOB   = 5;    // px — ennél nagyobb elmozdulás már húzás, nem kattintás

// ===== TÉRKÉP MODAL =====
// Felelősség: a Térkép — az entitás-fa TELJES KÉPERNYŐS, interaktív nézete.
// HIBRID rajzolás: a Canvas alapréteg a TELJES fát rajzolja (élek + típus-színű
// pöttyök — több tízezer csomópontra is gyors), az SVG fedőréteg pedig CSAK a
// látható/közeli csomópontokat teszi interaktívvá (ikon + cím, kattintás,
// tooltip). A két réteg KÖZÖS transzformáción (skála + eltolás) osztozik.
// Folyamat-vezérlés (Csaba kérése): megnyitáskor ELŐBB darabszám-kijelzés
// („N entitás — elkészíted?"), építés közben folyamatjelző, és végig látható
// Megszakítás gomb (letöltés AbortController-rel, elrendezés darabhatáron áll le).
// Használja: a fő menü „Térkép" pontja (foOldal.js — teljes fa) és a
//   kártya-hamburgerek „Térkép" pontja (Kartya.js — ág-szűrve).
class TerkepModal {

  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.token                  - JWT token (opcionális)
  // @param {string} beallitasok.agEntitasId            - ÁG-SZŰRŐ (opcionális)
  // @param {string} beallitasok.cim                    - a modal címe (alapból „Térkép")
  // @param {string} beallitasok.aktualisEntitasId      - a kiemelt (aktuális) entitás (opcionális)
  // @param {Function} beallitasok.onEntitasKivalasztas - (entitasId, entitasTipus) navigáláshoz
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('TerkepModal.constructor - KEZDÉS', {
      agEntitasId: beallitasok.agEntitasId,
      aktualisEntitasId: beallitasok.aktualisEntitasId
    });

    this.kontenerAzonosito    = kontenerAzonosito;
    this.token                = beallitasok.token ?? tokenLekerese();
    this.agEntitasId          = beallitasok.agEntitasId ?? null;
    this.cimFelirat           = beallitasok.cim ?? 'Térkép';
    this.aktualisEntitasId    = beallitasok.aktualisEntitasId
      ? beallitasok.aktualisEntitasId.toString()
      : null;
    this.onEntitasKivalasztas = beallitasok.onEntitasKivalasztas ?? null;

    this.modal = null;

    // --- ÉPÍTÉSI ÁLLAPOT ---
    this.osszesDarab = 0;      // az összes entitás száma (darabszám-végpontból)
    this.agDarab     = null;   // az ág entitás-száma (csak ág-módban)
    this._megszakito = null;   // AbortController — a letöltés leállításához
    this._megszakitva = false; // igaz, ha a Megszakítás gombot megnyomták
    this._epitesFut  = false;  // igaz, amíg a letöltés/elrendezés dolgozik

    // --- TÉRKÉP ÁLLAPOT ---
    this.elrendezes = null;    // FaElrendezes példány (kész csomópontokkal)
    this.nezet = { skala: 1, eltolasX: 0, eltolasY: 0 }; // világ → képernyő transzformáció
    this._minimalisSkala = 0.05; // az illesztésből számoljuk újra

    // --- ESEMÉNY-ÁLLAPOT (pan/zoom/kattintás) ---
    this._huzasAktiv = false;
    this._huzasKezdet = null;   // { x, y, eltolasX, eltolasY }
    this._huzasTavolsag = 0;    // az elmozdulás összege — kattintás/húzás szétválasztás
    this._ablakMeretezoBound = null; // resize figyelő referenciája (levételhez)
    this._rajzolasKeres = false;     // rAF-összevonás: egy képkockán csak egy rajzolás

    console.log('TerkepModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('TerkepModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      this.cimFelirat,
      tartalom: tartalomHtml,
      meret:    'teljes', // saját méret-osztály: modal-panel--teljes (terkepModal.css)
      gombok:   [],       // nincs lábléc — minden vezérlő a nézetekben van
      // Bezáráskor (✕ / ESC / overlay) a futó építést is leállítjuk,
      // és az ablak-átméretezés figyelőt is levesszük
      onBezaras: () => {
        this._epitesLeallitasa();
        if (this._ablakMeretezoBound) {
          window.removeEventListener('resize', this._ablakMeretezoBound);
          this._ablakMeretezoBound = null;
        }
      }
    });

    await this.modal.init();

    // --- Gombok bekötése ---
    document.getElementById('terkep-inditas-gomb')
      ?.addEventListener('click', () => this._epitesInditasa());
    document.getElementById('terkep-megse-gomb')
      ?.addEventListener('click', () => this.bezaras());
    document.getElementById('terkep-megszakitas-gomb')
      ?.addEventListener('click', () => this._megszakitas());
    document.getElementById('terkep-zoom-be-gomb')
      ?.addEventListener('click', () => this._zoomKozeppontra(ZOOM_LEPES));
    document.getElementById('terkep-zoom-ki-gomb')
      ?.addEventListener('click', () => this._zoomKozeppontra(1 / ZOOM_LEPES));
    document.getElementById('terkep-illesztes-gomb')
      ?.addEventListener('click', () => this._teljesFaIllesztese());

    // --- Pan/zoom/kattintás a térkép-nézeten ---
    this._nezetEsemenyekBekotese();

    console.log('TerkepModal.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/terkepModal.html');
      if (!valasz.ok) {
        console.error('TerkepModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('TerkepModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  megnyitas() {
    console.log('TerkepModal.megnyitas - KEZDÉS');
    this.modal?.megnyitas();
    this._nezetValtas('indito');
    this._darabszamLekerese();
  }

  bezaras() {
    this.modal?.bezaras();
  }

  // ===== NÉZET-VÁLTÁS =====
  // A három belső nézet (indító / építés / térkép) közül pontosan egyet mutat.
  // @param {string} nezetNev - 'indito' | 'epites' | 'terkep'
  _nezetValtas(nezetNev) {
    console.log('TerkepModal._nezetValtas', { nezetNev });
    document.getElementById('terkep-indito')?.toggleAttribute('hidden', nezetNev !== 'indito');
    document.getElementById('terkep-epites')?.toggleAttribute('hidden', nezetNev !== 'epites');
    document.getElementById('terkep-nezet')?.toggleAttribute('hidden', nezetNev !== 'terkep');
  }

  // ===== 1. LÉPÉS: ELŐZETES DARABSZÁM =====
  // Gyors darabszám-lekérés — a modal ezt mutatja, mielőtt bármi nehéz munka
  // elindulna. Az Elkészítés gomb csak sikeres lekérés után jelenik meg.
  async _darabszamLekerese() {
    console.log('TerkepModal._darabszamLekerese - KEZDÉS');

    const szovegElem = document.getElementById('terkep-darabszam-szoveg');
    const inditasGomb = document.getElementById('terkep-inditas-gomb');
    if (szovegElem) szovegElem.textContent = 'Darabszám lekérése...';
    if (inditasGomb) inditasGomb.hidden = true;

    try {
      const agResz = this.agEntitasId ? `?agEntitasId=${this.agEntitasId}` : '';
      const valasz = await apiGet(`terkep/darabszam${agResz}`, this.token);

      this.osszesDarab = valasz?.osszesDarab ?? 0;
      this.agDarab     = valasz?.agDarab ?? null;

      // A kijelzett darab: ág-módban az ág mérete, különben az összes
      const kijelzettDarab = this.agDarab ?? this.osszesDarab;

      if (kijelzettDarab === 0) {
        if (szovegElem) szovegElem.textContent = 'Nincs megjeleníthető entitás.';
      } else {
        if (szovegElem) {
          szovegElem.textContent = this.agEntitasId
            ? `Ez az ág ${kijelzettDarab.toLocaleString('hu-HU')} entitást tartalmaz. Elkészíted a térképet?`
            : `A koino ${kijelzettDarab.toLocaleString('hu-HU')} entitást tartalmaz. Elkészíted a térképet?`;
        }
        if (inditasGomb) inditasGomb.hidden = false;
      }

      console.log('TerkepModal._darabszamLekerese - VÉGE', {
        osszesDarab: this.osszesDarab,
        agDarab: this.agDarab
      });
    } catch (hiba) {
      console.error('TerkepModal._darabszamLekerese - HIBA', hiba.message);
      this.modal?.hibaBeallitasa(hiba.message ?? 'A darabszám lekérése sikertelen.');
    }
  }

  // ===== 2. LÉPÉS: ÉPÍTÉS (LETÖLTÉS + ELRENDEZÉS) =====
  async _epitesInditasa() {
    console.log('TerkepModal._epitesInditasa - KEZDÉS');

    this._megszakitva = false;
    this._megszakito = new AbortController();
    this._epitesFut = true;
    this.modal?.hibaTisztitasa();
    this._nezetValtas('epites');

    try {
      // --- 2/a. LETÖLTÉS (lapozva, megszakíthatóan) ---
      const sorok = await this._faLetoltese();
      if (this._megszakitva) return; // megszakították — az _megszakitas már visszaváltott

      // --- 2/b. ELRENDEZÉS (darabolva, rAF-szünetekkel, megszakíthatóan) ---
      this.elrendezes = new FaElrendezes(sorok, this.agEntitasId);

      // Ág-módban a kijelzett összes az ág mérete (a darabszám-végpontból)
      const elrendezesOsszes = this.agDarab ?? this.osszesDarab;

      const lepesek = this.elrendezes.elhelyezesLepesekben(ELRENDEZES_DARAB);
      for (const allapot of lepesek) {
        if (this._megszakitva) return;
        this._folyamatFrissitese(
          `Elhelyezés: ${allapot.kesz.toLocaleString('hu-HU')} / ${elrendezesOsszes.toLocaleString('hu-HU')} entitás`,
          // Az elrendezés a sáv MÁSODIK fele (50–100%)
          50 + Math.min(50, (allapot.kesz / Math.max(1, elrendezesOsszes)) * 50)
        );
        // rAF-szünet: a felület frissülhet, a Megszakítás gomb kattintható marad
        await new Promise(resolve => requestAnimationFrame(resolve));
      }

      if (this._megszakitva) return;

      if (this.elrendezes.csomopontok.length === 0) {
        this.modal?.hibaBeallitasa(this.agEntitasId
          ? 'Az ág nem található a fában.'
          : 'Nincs megjeleníthető entitás.');
        this._nezetValtas('indito');
        return;
      }

      // --- 2/c. KÉSZ: térkép-nézet + kezdő illesztés + rajzolás ---
      this._nezetValtas('terkep');
      this._canvasMeretezes();
      this._teljesFaIllesztese();

      // Ablak-átméretezésre újraméretezünk és újrarajzolunk
      if (!this._ablakMeretezoBound) {
        this._ablakMeretezoBound = () => {
          this._canvasMeretezes();
          this._rajzolas();
        };
        window.addEventListener('resize', this._ablakMeretezoBound);
      }

      console.log('TerkepModal._epitesInditasa - VÉGE', {
        csomopontokSzama: this.elrendezes.csomopontok.length
      });
    } catch (hiba) {
      // Az AbortError a Megszakítás gomb következménye — az nem hiba
      if (hiba?.name === 'AbortError') {
        console.log('TerkepModal._epitesInditasa - letöltés megszakítva');
        return;
      }
      console.error('TerkepModal._epitesInditasa - HIBA', hiba.message);
      this.modal?.hibaBeallitasa(hiba.message ?? 'A térkép elkészítése sikertelen.');
      this._nezetValtas('indito');
    } finally {
      this._epitesFut = false;
      this._megszakito = null;
    }
  }

  // ===== LETÖLTÉS (KURZOROS LAPOZÁS) =====
  // A teljes fa lapozott letöltése. Az apiGet nem támogat AbortSignal-t, ezért
  // itt közvetlen fetch fut ugyanazokkal a fejlécekkel — így a Megszakítás gomb
  // a folyamatban lévő HTTP-kérést is azonnal leállítja.
  // @returns {Promise<Array>} az összes letöltött sor
  async _faLetoltese() {
    console.log('TerkepModal._faLetoltese - KEZDÉS');

    const sorok = [];
    let kurzor = null;

    do {
      const kurzorResz = kurzor ? `&kurzor=${kurzor}` : '';
      const valasz = await fetch(
        `${API_ALAP_URL}terkep?lapMeret=${LAP_MERET}${kurzorResz}`,
        {
          headers: { 'Authorization': `Bearer ${this.token}` },
          signal: this._megszakito?.signal
        }
      );
      const adatok = await valasz.json();
      if (!valasz.ok) {
        throw new Error(adatok.message || `HTTP hiba: ${valasz.status}`);
      }

      sorok.push(...(adatok.sorok ?? []));
      kurzor = adatok.kovetkezoKurzor ?? null;

      this._folyamatFrissitese(
        `Letöltés: ${sorok.length.toLocaleString('hu-HU')} / ${this.osszesDarab.toLocaleString('hu-HU')} entitás`,
        // A letöltés a sáv ELSŐ fele (0–50%)
        Math.min(50, (sorok.length / Math.max(1, this.osszesDarab)) * 50)
      );
    } while (kurzor && !this._megszakitva);

    console.log('TerkepModal._faLetoltese - VÉGE', { sorokSzama: sorok.length });
    return sorok;
  }

  // ===== FOLYAMATJELZŐ FRISSÍTÉSE =====
  _folyamatFrissitese(szoveg, szazalek) {
    const szovegElem = document.getElementById('terkep-epites-szoveg');
    const sav = document.getElementById('terkep-folyamat-sav');
    const folyamat = document.getElementById('terkep-folyamat');
    if (szovegElem) szovegElem.textContent = szoveg;
    if (sav) sav.style.width = `${szazalek}%`;
    if (folyamat) folyamat.setAttribute('aria-valuenow', Math.round(szazalek));
  }

  // ===== MEGSZAKÍTÁS =====
  // A Megszakítás gomb: a letöltést az AbortController állítja le, az
  // elrendezés a következő darabhatáron áll meg (a ciklus a jelzőt figyeli).
  // Nem marad félkész rajz — a modal visszaáll az indító nézetre.
  _megszakitas() {
    console.log('TerkepModal._megszakitas - KEZDÉS');
    this._epitesLeallitasa();
    this._nezetValtas('indito');
    console.log('TerkepModal._megszakitas - VÉGE');
  }

  // A futó építés leállítása (a Megszakítás gomb ÉS a modal bezárása is ezt hívja)
  _epitesLeallitasa() {
    if (!this._epitesFut) return;
    this._megszakitva = true;
    this._megszakito?.abort();
  }

  // ===== 3. LÉPÉS: RAJZOLÁS (CANVAS ALAPRÉTEG) =====

  // A canvas felbontásának igazítása a konténer méretéhez (devicePixelRatio-val)
  _canvasMeretezes() {
    const nezetElem = document.getElementById('terkep-nezet');
    const canvas = document.getElementById('terkep-canvas');
    if (!nezetElem || !canvas) return;

    const arany = window.devicePixelRatio || 1;
    canvas.width  = nezetElem.clientWidth * arany;
    canvas.height = nezetElem.clientHeight * arany;
    console.log('TerkepModal._canvasMeretezes', {
      szelesseg: nezetElem.clientWidth,
      magassag: nezetElem.clientHeight,
      arany
    });
  }

  // Kezdő (és ⤢ gombos) nézet: a TELJES fa beférjen a képernyőre, középre igazítva
  _teljesFaIllesztese() {
    const nezetElem = document.getElementById('terkep-nezet');
    if (!nezetElem || !this.elrendezes) return;

    const meret = this.elrendezes.vilagMeret();
    const margo = 60; // px a szélek felé

    const skalaX = (nezetElem.clientWidth - 2 * margo) / Math.max(1, meret.szelesseg);
    const skalaY = (nezetElem.clientHeight - 2 * margo) / Math.max(1, meret.magassag);
    const skala = Math.min(skalaX, skalaY, 1);

    this.nezet.skala = skala;
    // Az illesztésnél kisebbre nem engedünk kicsinyíteni (annál már üres a kép)
    this._minimalisSkala = skala * 0.5;

    // Középre igazítás: a fa közepe a nézet közepére kerüljön
    const faKozepX = (meret.minX + meret.maxX) / 2;
    const faKozepY = (meret.minY + meret.maxY) / 2;
    this.nezet.eltolasX = nezetElem.clientWidth / 2 - faKozepX * skala;
    this.nezet.eltolasY = nezetElem.clientHeight / 2 - faKozepY * skala;

    this._rajzolas();
  }

  // A teljes újrarajzolás: canvas (élek + pöttyök) + SVG fedőréteg frissítése
  _rajzolas() {
    this._rajzolasKeres = false;
    const canvas = document.getElementById('terkep-canvas');
    const nezetElem = document.getElementById('terkep-nezet');
    if (!canvas || !nezetElem || !this.elrendezes) return;

    const ctx = canvas.getContext('2d');
    const arany = window.devicePixelRatio || 1;
    const { skala, eltolasX, eltolasY } = this.nezet;

    ctx.setTransform(arany, 0, 0, arany, 0, 0);
    ctx.clearRect(0, 0, canvas.width / arany, canvas.height / arany);

    const szelesseg = nezetElem.clientWidth;
    const magassag = nezetElem.clientHeight;
    const csomopontMap = this.elrendezes.csomopontMap;

    // --- Élek (szülő → gyerek vonalak) ---
    ctx.strokeStyle = 'rgba(43, 35, 24, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const cs of this.elrendezes.csomopontok) {
      if (!cs.szuloKulcs) continue;
      const szulo = csomopontMap.get(cs.szuloKulcs);
      if (!szulo) continue;
      const x1 = szulo.x * skala + eltolasX;
      const y1 = szulo.y * skala + eltolasY;
      const x2 = cs.x * skala + eltolasX;
      const y2 = cs.y * skala + eltolasY;
      // Képernyőn kívüli él kihagyása (mindkét vége kívül ugyanarra)
      if ((x1 < 0 && x2 < 0) || (x1 > szelesseg && x2 > szelesseg) ||
          (y1 < 0 && y2 < 0) || (y1 > magassag && y2 > magassag)) continue;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // --- Pöttyök (típus-színnel) ---
    for (const cs of this.elrendezes.csomopontok) {
      const x = cs.x * skala + eltolasX;
      const y = cs.y * skala + eltolasY;
      if (x < -POTTY_SUGAR || x > szelesseg + POTTY_SUGAR ||
          y < -POTTY_SUGAR || y > magassag + POTTY_SUGAR) continue;

      ctx.fillStyle = TIPUS_SZIN[cs.entitasTipus] ?? '#2b2318';
      ctx.beginPath();
      ctx.arc(x, y, POTTY_SUGAR, 0, Math.PI * 2);
      ctx.fill();

      // Az aktuális entitás kiemelése: dupla gyűrű
      if (this.aktualisEntitasId && cs.kulcs === this.aktualisEntitasId) {
        ctx.strokeStyle = '#8c3a1e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, POTTY_SUGAR + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // --- SVG fedőréteg (interaktív csomópontok) ---
    this._svgFrissitese(szelesseg, magassag);
  }

  // rAF-összevont újrarajzolás — pan/zoom közben képkockánként legfeljebb egyszer fut
  _rajzolasKerese() {
    if (this._rajzolasKeres) return;
    this._rajzolasKeres = true;
    requestAnimationFrame(() => this._rajzolas());
  }

  // ===== SVG FEDŐRÉTEG =====
  // Csak a KÉPERNYŐN LÁTHATÓ csomópontokat rajzolja interaktív SVG-elemként —
  // és csak akkor, ha legfeljebb SVG_CSOMOPONT_MAX darab van (különben a réteg
  // üres marad, távolról a canvas-pöttyök adják a képet). Így az interakció
  // költsége a zoom-szinttől függ, nem a fa teljes méretétől.
  _svgFrissitese(szelesseg, magassag) {
    const svg = document.getElementById('terkep-svg');
    if (!svg) return;

    const { skala, eltolasX, eltolasY } = this.nezet;

    // Látható csomópontok összegyűjtése (kis ráhagyással a szélek felé)
    const lathatok = [];
    for (const cs of this.elrendezes.csomopontok) {
      const x = cs.x * skala + eltolasX;
      const y = cs.y * skala + eltolasY;
      if (x < -40 || x > szelesseg + 40 || y < -40 || y > magassag + 40) continue;
      lathatok.push({ cs, x, y });
      // Ha már túl sok van, felesleges tovább gyűjteni
      if (lathatok.length > SVG_CSOMOPONT_MAX) break;
    }

    if (lathatok.length > SVG_CSOMOPONT_MAX) {
      svg.innerHTML = '';
      return;
    }

    const darabok = [];
    for (const { cs, x, y } of lathatok) {
      const szin = TIPUS_SZIN[cs.entitasTipus] ?? '#2b2318';
      const ikon = TIPUS_IKON[cs.entitasTipus] ?? '❔';
      const teljesCim = cs.cim ?? TIPUS_FELIRAT[cs.entitasTipus] ?? '';
      const rovidCim = teljesCim.length > CIM_MAX_HOSSZ
        ? `${teljesCim.slice(0, CIM_MAX_HOSSZ)}…`
        : teljesCim;
      const aktualisE = this.aktualisEntitasId && cs.kulcs === this.aktualisEntitasId;

      darabok.push(`
        <g class="terkep-modal__csomopont${aktualisE ? ' terkep-modal__csomopont--aktualis' : ''}"
           transform="translate(${x}, ${y})"
           data-entitas-id="${cs.entitasId}"
           data-entitas-tipus="${cs.entitasTipus}"
           role="button" tabindex="0">
          <title>${this._escape(teljesCim)} (${TIPUS_FELIRAT[cs.entitasTipus] ?? cs.entitasTipus})</title>
          <circle r="${SVG_KOR_SUGAR}" fill="${szin}" class="terkep-modal__csomopont-kor"></circle>
          <text y="1" class="terkep-modal__csomopont-ikon">${ikon}</text>
          <text y="${SVG_KOR_SUGAR + 14}" class="terkep-modal__csomopont-cim">${this._escape(rovidCim)}</text>
        </g>`);
    }

    svg.innerHTML = darabok.join('');
  }

  // ===== PAN / ZOOM / KATTINTÁS =====
  _nezetEsemenyekBekotese() {
    const nezetElem = document.getElementById('terkep-nezet');
    if (!nezetElem) return;

    // --- Húzás (pan) pointer-eseményekkel (egér + érintés egységesen) ---
    nezetElem.addEventListener('pointerdown', (e) => {
      // A vezérlő gombokon indított mozdulat nem húzás
      if (e.target.closest('.terkep-modal__vezerlok')) return;
      this._huzasAktiv = true;
      this._huzasTavolsag = 0;
      this._huzasKezdet = {
        x: e.clientX,
        y: e.clientY,
        eltolasX: this.nezet.eltolasX,
        eltolasY: this.nezet.eltolasY
      };
      nezetElem.setPointerCapture(e.pointerId);
    });

    nezetElem.addEventListener('pointermove', (e) => {
      if (!this._huzasAktiv || !this._huzasKezdet) return;
      const dx = e.clientX - this._huzasKezdet.x;
      const dy = e.clientY - this._huzasKezdet.y;
      this._huzasTavolsag = Math.max(this._huzasTavolsag, Math.abs(dx) + Math.abs(dy));
      this.nezet.eltolasX = this._huzasKezdet.eltolasX + dx;
      this.nezet.eltolasY = this._huzasKezdet.eltolasY + dy;
      this._rajzolasKerese();
    });

    nezetElem.addEventListener('pointerup', (e) => {
      const kattintasVolt = this._huzasAktiv && this._huzasTavolsag <= KATTINTAS_KUSZOB;
      this._huzasAktiv = false;
      this._huzasKezdet = null;

      if (!kattintasVolt) return;

      // Kattintás: előbb az SVG-csomópontot nézzük (pontos), majd a canvas-pöttyöt
      const svgCsomopont = e.target.closest('.terkep-modal__csomopont');
      if (svgCsomopont) {
        this._csomopontKattintas(
          svgCsomopont.dataset.entitasId,
          svgCsomopont.dataset.entitasTipus
        );
        return;
      }
      this._canvasKattintas(e);
    });

    // --- Zoom görgetéssel, a kurzor pozíciójára központosítva ---
    nezetElem.addEventListener('wheel', (e) => {
      e.preventDefault(); // az oldal ne görögjön a térkép alatt
      const szorzo = e.deltaY < 0 ? ZOOM_LEPES : 1 / ZOOM_LEPES;
      const teglalap = nezetElem.getBoundingClientRect();
      this._zoom(szorzo, e.clientX - teglalap.left, e.clientY - teglalap.top);
    }, { passive: false });
  }

  // Zoom egy adott képernyő-pontra központosítva (a pont a helyén marad)
  _zoom(szorzo, kozepX, kozepY) {
    const ujSkala = Math.min(MAX_ZOOM, Math.max(this._minimalisSkala, this.nezet.skala * szorzo));
    const tenylegesSzorzo = ujSkala / this.nezet.skala;
    if (tenylegesSzorzo === 1) return;

    // Az eltolás úgy módosul, hogy a (kozepX, kozepY) képernyő-pont világbeli
    // megfelelője a zoom után is ugyanoda essen
    this.nezet.eltolasX = kozepX - (kozepX - this.nezet.eltolasX) * tenylegesSzorzo;
    this.nezet.eltolasY = kozepY - (kozepY - this.nezet.eltolasY) * tenylegesSzorzo;
    this.nezet.skala = ujSkala;
    this._rajzolasKerese();
  }

  // A ＋/－ gombok zoomja: a nézet közepére központosítva
  _zoomKozeppontra(szorzo) {
    const nezetElem = document.getElementById('terkep-nezet');
    if (!nezetElem) return;
    this._zoom(szorzo, nezetElem.clientWidth / 2, nezetElem.clientHeight / 2);
  }

  // ===== KATTINTÁS A CANVASRA (TALÁLAT-KERESÉS) =====
  // Amikor az SVG-réteg üres (kicsinyített nézet), a kattintáshoz kézzel
  // keressük meg a legközelebbi pöttyöt a koordináta-listából.
  _canvasKattintas(esemeny) {
    const nezetElem = document.getElementById('terkep-nezet');
    if (!nezetElem || !this.elrendezes) return;

    const teglalap = nezetElem.getBoundingClientRect();
    const kattX = esemeny.clientX - teglalap.left;
    const kattY = esemeny.clientY - teglalap.top;
    const { skala, eltolasX, eltolasY } = this.nezet;

    // A legközelebbi csomópont keresése — csak ésszerű távolságon belül találat
    const maxTavolsag = POTTY_SUGAR + 6;
    let legjobb = null;
    let legjobbTavolsagNegyzet = maxTavolsag * maxTavolsag;

    for (const cs of this.elrendezes.csomopontok) {
      const dx = cs.x * skala + eltolasX - kattX;
      const dy = cs.y * skala + eltolasY - kattY;
      const tavolsagNegyzet = dx * dx + dy * dy;
      if (tavolsagNegyzet < legjobbTavolsagNegyzet) {
        legjobbTavolsagNegyzet = tavolsagNegyzet;
        legjobb = cs;
      }
    }

    if (legjobb) {
      this._csomopontKattintas(legjobb.entitasId, legjobb.entitasTipus);
    }
  }

  // ===== CSOMÓPONTRA KATTINTÁS: NAVIGÁLÁS =====
  _csomopontKattintas(entitasId, entitasTipus) {
    console.log('TerkepModal._csomopontKattintas - KEZDÉS', { entitasId, entitasTipus });

    this.bezaras();

    if (typeof this.onEntitasKivalasztas === 'function' && entitasId && entitasTipus) {
      this.onEntitasKivalasztas(entitasId.toString(), entitasTipus);
    }
  }

  // ===== SEGÉD: HTML/SVG-ESCAPE (a cím felhasználói adat) =====
  _escape(szoveg) {
    return String(szoveg)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// ===== EXPORTÁLÁS =====
export default TerkepModal;
