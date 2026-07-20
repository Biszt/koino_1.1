// frontend/js/components/modals/TerkepModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet, API_ALAP_URL } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import FaElrendezes, { FA_TAVOLSAG_Y } from '../../utils/faElrendezes.js';
import { dinamikusCimBetumeret } from '../../utils/cimBetumeret.js';

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

// Az ágazati (hierarchikus) össztudatpont ikonja a közeli csomóponton —
// UGYANAZ, mint a kártya ikon-sávjában (Kartya.js): 🌿 (ág) + 🌟 (tudatpont).
const OSSZPONT_IKON = '🌿🌟';

// ===== MELLÉK-IKONOK (KÖZELI NÉZET) =====
// A közeli (3.) szinten a fő ikon MELLETT kis körökben extra típus-infó jelenik meg:
//   - Tartalom: a kategóriái BALRA (kategória-színnel), a tartalomtípusa JOBBRA
//     (tartalomtípus-színnel) — a kör belsejében a kategória/típus saját ikonja
//     (emoji vagy feltöltött kép);
//   - Javaslat/Egyezmény: a művelet-típusa JOBBRA (a saját típus-színével).
// A Javaslat/Egyezmény művelet-típusához (javaslatTipus enum) tartozó emojik:
const JAVASLAT_TIPUS_IKON = {
  Torles:     '🗑️',
  Modositas:  '✏️',
  Egyesites:  '🔗',
  Athelyezes: '➡️',
  Csomag:     '📦',
};
const MELLEK_SUGAR   = 8;   // a mellék-kör sugara (a fő kör 14 → a mellék kisebb)
const MELLEK_KOZ     = 3;   // rés a fő kör és a mellék-kör (illetve a mellékek) között

// ===== HANGOLÓ ÁLLANDÓK =====
const LAP_MERET          = 2000; // letöltés: ennyi sor / kérés
const ELRENDEZES_DARAB   = 1500; // elrendezés: ennyi csomópont / darab (rAF-szünetekkel)
const SVG_CSOMOPONT_MAX  = 250;  // az SVG fedőréteg legfeljebb ennyi látható csomópontot rajzol
const CIM_MAX_HOSSZ      = 15;   // a csomópont-felirat alap-levágási hossza (kis betűnél többet engedünk)
const CIM_MAX_BETUMERET  = 13;   // a rövid cím max. betűmérete a csomóponton (a kártya 24-e a kisebb csomóponthoz igazítva)
const POTTY_SUGAR        = 4;    // Canvas-pötty sugara (képernyő-px)
const SVG_KOR_SUGAR      = 14;   // SVG-csomópont körének sugara (képernyő-px)
const ZOOM_LEPES         = 1.2;  // a ＋/－ gombok zoom-szorzója (kattintásonként)
const ZOOM_ERZEKENYSEG   = 0.025; // a pinch (ujj-széthúzás) zoom finomsága — kisebb = kevésbé érzékeny
const MAX_ZOOM           = 6;    // ennél jobban nem nagyítunk (a részletes szinthez tér kell)
const KATTINTAS_KUSZOB   = 5;    // px — ennél nagyobb elmozdulás már húzás, nem kattintás

// ===== RÉSZLETESSÉGI (LOD) KÜSZÖBÖK — A KÉTSZINTŰ NÉZET LELKE =====
// A megjelenítés részletessége a NAGYÍTÁStól függ, NEM a fa méretétől. A mérce
// két szomszédos szint KÉPERNYŐN mért függőleges távolsága (FA_TAVOLSAG_Y * skála):
// minél jobban ráközelítünk, annál nagyobb ez a távolság, annál több fér ki.
//   0. szint — csak canvas-pötty (áttekintés): a szintek olyan sűrűk, hogy ikon sem férne
//   1. szint — + SVG-ikon
//   2. szint — + cím
//   3. szint — + ágazati össztudatpont (a „többletinfó")
// A csomópontok mérete VÉGIG EGYSÉGES (Csaba döntése) — nem a tudatpont mennyisége,
// hanem a ráközelítés hozza elő a részleteket.
const LOD_IKON_KUSZOB = 24;  // e fölött (px, képernyő-rács) jelenik meg az ikon
const LOD_CIM_KUSZOB  = 52;  // e fölött a cím is
const LOD_INFO_KUSZOB = 86;  // e fölött az össztudatpont is

// ===== CSOMÓPONT-MÉRET A ZOOMHOZ KÉPEST (KÉT VÁLTOZAT, EGY KAPCSOLÓ) =====
// IKON_NO_A_ZOOMMAL:
//   true  — VILÁGHOZ rögzített méret: ráközelítve a csomópontok (kör + ikon +
//           felirat) TERMÉSZETESEN NAGYOBBAK lesznek, kicsinyítve kisebbek.
//   false — KÉPERNYŐHÖZ rögzített méret: a csomópontok a zoomtól függetlenül
//           ugyanakkorák maradnak (csak a részletesség vált a LOD-küszöbökkel).
// A két viselkedés ezzel az egy kapcsolóval összevethető (Csaba: „próbáljuk ki úgy is").
const IKON_NO_A_ZOOMMAL     = true;
const NODE_VILAG_EGYUTTHATO = 2.0; // a csomópont rajz-skálája = zoom * ez (világhoz kötött módban)
const NODE_MAX_SKALA        = 4;   // a csomópont ennél nagyobbra nem nő (felső korlát)

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
    // Teljesítmény: zoom/pan KÖZBEN csak a canvas frissül + az SVG transzformmal
    // követ; a DRÁGA SVG-újraépítés csak a mozgás VÉGÉN fut le (settle-debounce).
    this._svgBazis = null;    // { skala, eltolasX, eltolasY } az utolsó teljes SVG-építéskor
    this._settleTimer = null; // a mozgás-vége (settle) időzítő

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
        this._teljesNezetKikapcsolasa();
        this._epitesLeallitasa();
        clearTimeout(this._settleTimer);
        if (this._ablakMeretezoBound) {
          window.removeEventListener('resize', this._ablakMeretezoBound);
          this._ablakMeretezoBound = null;
        }
      }
    });

    await this.modal.init();

    // --- Gombok bekötése ---
    // A Mégse gomb az építés közben: leállítja a munkát és bezárja a Térképet
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
    this._teljesNezetBekapcsolasa();
    this.modal?.megnyitas();
    // NINCS előzetes kérdés (Csaba kérése): egyből nekiállunk az építésnek.
    // A folyamatjelző (számláló) + Mégse gomb az építés nézetben végig látszik.
    this._epitesInditasa();
  }

  bezaras() {
    this.modal?.bezaras();
  }

  // ===== ALSÓ SÁV LÁTHATÓSÁGA (A PAKLI MINTÁJÁRA) =====
  // A teljes képernyős Térkép alatt is látsszon — és használható maradjon — a
  // főoldal alsó sávja (hamburger + statisztikák), ugyanúgy, mint a pakli nézetben.
  // A body-ra tett `teljes-nezet-nyitva` osztály (terkepModal.css): (a) az alsó
  // sávot a modal FÖLÉ emeli — mivel a sáv önálló rétegződési kontextus, a benne
  // renderelt hamburger menü is a modal fölé kerül —, (b) a panelt/overlayt az
  // alsó sáv FÖLÖTT zárja. A sáv magasságát meg is mérjük (kis képernyőn a
  // statisztikák több sorba tördhetnek), és a --alsosav-magassag változóba tesszük.
  _teljesNezetBekapcsolasa() {
    document.body.classList.add('teljes-nezet-nyitva');
    this._alsoSavMagassagFrissitese();
  }

  _teljesNezetKikapcsolasa() {
    document.body.classList.remove('teljes-nezet-nyitva');
  }

  _alsoSavMagassagFrissitese() {
    const alsoSav = document.querySelector('.also-sav');
    const magassag = alsoSav ? alsoSav.offsetHeight : 56;
    document.documentElement.style.setProperty('--alsosav-magassag', `${magassag}px`);
  }

  // ===== NÉZET-VÁLTÁS =====
  // A két belső nézet (építés / térkép) közül pontosan egyet mutat.
  // @param {string} nezetNev - 'epites' | 'terkep'
  _nezetValtas(nezetNev) {
    console.log('TerkepModal._nezetValtas', { nezetNev });
    document.getElementById('terkep-epites')?.toggleAttribute('hidden', nezetNev !== 'epites');
    document.getElementById('terkep-nezet')?.toggleAttribute('hidden', nezetNev !== 'terkep');
  }

  // ===== DARABSZÁM LEKÉRÉSE =====
  // Gyors darabszám-lekérés a folyamatjelző „X / N" kijelzéséhez. Már NEM kérdez
  // rá az építésre (nincs indító nézet) — csak beállítja az osszesDarab / agDarab
  // mezőket. Az _epitesInditasa hívja az építés legelején.
  async _darabszamLekerese() {
    console.log('TerkepModal._darabszamLekerese - KEZDÉS');

    const agResz = this.agEntitasId ? `?agEntitasId=${this.agEntitasId}` : '';
    const valasz = await apiGet(`terkep/darabszam${agResz}`, this.token);

    this.osszesDarab = valasz?.osszesDarab ?? 0;
    this.agDarab     = valasz?.agDarab ?? null;

    console.log('TerkepModal._darabszamLekerese - VÉGE', {
      osszesDarab: this.osszesDarab,
      agDarab: this.agDarab
    });
  }

  // ===== 2. LÉPÉS: ÉPÍTÉS (LETÖLTÉS + ELRENDEZÉS) =====
  async _epitesInditasa() {
    console.log('TerkepModal._epitesInditasa - KEZDÉS');

    this._megszakitva = false;
    this._megszakito = new AbortController();
    this._epitesFut = true;
    this.modal?.hibaTisztitasa();
    this._nezetValtas('epites');
    this._folyamatFrissitese('Előkészítés…', 0);

    try {
      // --- 2/0. DARABSZÁM (a folyamatjelző „X / N"-jéhez) — kérdés nélkül ---
      await this._darabszamLekerese();
      if (this._megszakitva) return;

      const kijelzettDarab = this.agDarab ?? this.osszesDarab;
      if (kijelzettDarab === 0) {
        // Nincs mit rajzolni — maradjon az építés nézeten, a Mégse gomb zárja
        this._folyamatFrissitese(this.agEntitasId
          ? 'Ez az ág nem tartalmaz entitást.'
          : 'Nincs megjeleníthető entitás.', 0);
        this._epitesFut = false;
        return;
      }

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
        this._folyamatFrissitese(this.agEntitasId
          ? 'Az ág nem található a fában.'
          : 'Nincs megjeleníthető entitás.', 0);
        return;
      }

      // --- 2/c. KÉSZ: térkép-nézet + kezdő illesztés + rajzolás ---
      this._nezetValtas('terkep');
      this._canvasMeretezes();
      this._teljesFaIllesztese();

      // Ablak-átméretezésre újraméretezünk és újrarajzolunk
      if (!this._ablakMeretezoBound) {
        this._ablakMeretezoBound = () => {
          this._alsoSavMagassagFrissitese();
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

  // ===== MEGSZAKÍTÁS (MÉGSE) =====
  // A Mégse gomb: a letöltést az AbortController állítja le, az elrendezés a
  // következő darabhatáron áll meg (a ciklus a jelzőt figyeli). Mivel nincs
  // indító nézet, a Mégse egyben be is zárja a Térképet.
  _megszakitas() {
    console.log('TerkepModal._megszakitas - KEZDÉS');
    this._epitesLeallitasa();
    // Nincs indító nézet, ahová visszaváltsunk — a Mégse egyben bezárja a Térképet
    this.bezaras();
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
    // Az egész fa látszik, de LEGFELJEBB közepes nagyításig (0.6): így kis fánál is
    // marad hova KÖZELÍTENI — a cím és az össztudatpont a ráközelítéssel jön elő.
    const skala = Math.min(skalaX, skalaY, 0.6);

    this.nezet.skala = skala;
    // Kicsinyítés: engedjük az ÁTTEKINTŐ (csak-pötty) szintig — a szintek képernyő-
    // távolsága menjen a LOD_IKON_KUSZOB alá, hogy a „sűrű pöttyök" nézet is elérhető
    // legyen; nagy fánál az illesztés fele már úgyis a pötty-szint.
    const attekintoSkala = (LOD_IKON_KUSZOB * 0.6) / FA_TAVOLSAG_Y;
    this._minimalisSkala = Math.min(skala * 0.5, attekintoSkala);

    // Középre igazítás: a fa közepe a nézet közepére kerüljön
    const faKozepX = (meret.minX + meret.maxX) / 2;
    const faKozepY = (meret.minY + meret.maxY) / 2;
    this.nezet.eltolasX = nezetElem.clientWidth / 2 - faKozepX * skala;
    this.nezet.eltolasY = nezetElem.clientHeight / 2 - faKozepY * skala;

    this._rajzolas();
  }

  // A TELJES újrarajzolás: canvas (élek + pöttyök) + a DRÁGA SVG-réteg újraépítése.
  // Ezt a kezdő illesztés, az átméretezés és a mozgás VÉGE (settle) hívja — NEM
  // minden zoom/pan képkocka (az a _gyorsRajzolas, ami csak követ).
  _rajzolas() {
    this._rajzolasKeres = false;
    const nezetElem = document.getElementById('terkep-nezet');
    if (!nezetElem || !this.elrendezes) return;

    const szelesseg = nezetElem.clientWidth;
    const magassag = nezetElem.clientHeight;

    this._canvasRajzolas(szelesseg, magassag);
    // DRÁGA rész: a teljes SVG-fedőréteg újraépítése (emoji-raszterizálás miatt költséges)
    this._svgFrissitese(szelesseg, magassag);
  }

  // Csak a CANVAS alapréteg (élek + típus-színű pöttyök) újrarajzolása — olcsó,
  // ezért zoom/pan közben minden képkockán ez fut (a drága SVG nélkül).
  _canvasRajzolas(szelesseg, magassag) {
    const canvas = document.getElementById('terkep-canvas');
    if (!canvas || !this.elrendezes) return;

    const ctx = canvas.getContext('2d');
    const arany = window.devicePixelRatio || 1;
    const { skala, eltolasX, eltolasY } = this.nezet;

    ctx.setTransform(arany, 0, 0, arany, 0, 0);
    ctx.clearRect(0, 0, canvas.width / arany, canvas.height / arany);

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

  }

  // rAF-összevont TELJES újrarajzolás — átméretezéshez/illesztéshez (nem interakció)
  _rajzolasKerese() {
    if (this._rajzolasKeres) return;
    this._rajzolasKeres = true;
    requestAnimationFrame(() => this._rajzolas());
  }

  // ===== INTERAKCIÓ (ZOOM / PAN) KÖZBENI RAJZOLÁS =====
  // Csaba kérése: zoom/pan KÖZBEN ne épüljön újra a drága SVG, csak a mozgás VÉGÉN.
  // Ezért minden képkockán csak OLCSÓ rajzolás fut (canvas + SVG-transzform-követés),
  // és egy settle-időzítő a mozgás megállása után (150 ms-mal) tesz egy TELJES
  // újraépítést (ami frissíti a LOD-szintet, a láthatóságot és a feliratokat).
  _interakcioRajzolas() {
    if (!this._rajzolasKeres) {
      this._rajzolasKeres = true;
      requestAnimationFrame(() => {
        this._rajzolasKeres = false;
        this._gyorsRajzolas();
      });
    }
    clearTimeout(this._settleTimer);
    this._settleTimer = setTimeout(() => this._rajzolas(), 150);
  }

  // OLCSÓ képkocka: a canvas újrarajzolása + az SVG-réteg TRANSZFORMMAL követése
  // (nincs innerHTML-újraépítés, nincs emoji-raszterizálás → sima marad)
  _gyorsRajzolas() {
    const nezetElem = document.getElementById('terkep-nezet');
    if (!nezetElem || !this.elrendezes) return;
    this._canvasRajzolas(nezetElem.clientWidth, nezetElem.clientHeight);
    this._svgKovetes();
  }

  // Az utoljára FELÉPÍTETT SVG-réteget egyetlen transzformmal a jelenlegi nézetbe
  // igazítja. A transzform PONTOS: a csomópontok középpontja és (világhoz kötött
  // méretnél) a mérete is a helyére kerül — a mozgás végi teljes újraépítésig.
  _svgKovetes() {
    const g = document.getElementById('terkep-svg-tartalom');
    if (!g || !this._svgBazis) return;
    const b = this._svgBazis;
    const s = this.nezet.skala / b.skala;
    const tx = this.nezet.eltolasX - s * b.eltolasX;
    const ty = this.nezet.eltolasY - s * b.eltolasY;
    g.setAttribute('transform', `translate(${tx}, ${ty}) scale(${s})`);
  }

  // ===== RÉSZLETESSÉGI (LOD) SZINT =====
  // A jelenlegi nagyításból megmondja, mennyi részlet fér ki egy csomópontra.
  // A mérce két szomszédos szint KÉPERNYŐ-távolsága (FA_TAVOLSAG_Y * skála):
  //   0 = csak pötty · 1 = + ikon · 2 = + cím · 3 = + össztudatpont.
  _reszletessegiSzint() {
    const racsKepernyo = FA_TAVOLSAG_Y * this.nezet.skala;
    if (racsKepernyo < LOD_IKON_KUSZOB) return 0;
    if (racsKepernyo < LOD_CIM_KUSZOB)  return 1;
    if (racsKepernyo < LOD_INFO_KUSZOB) return 2;
    return 3;
  }

  // ===== CSOMÓPONT RAJZ-SKÁLÁJA =====
  // A jelenlegi zoomhoz tartozó csomópont-méret szorzó: világhoz kötött módban a
  // nagyítással arányos (felső korláttal) — így ráközelítve a csomópontok nőnek;
  // képernyőhöz kötött módban mindig 1 (fix méret).
  _csomopontSkala() {
    if (!IKON_NO_A_ZOOMMAL) return 1;
    return Math.min(NODE_MAX_SKALA, this.nezet.skala * NODE_VILAG_EGYUTTHATO);
  }

  // ===== SVG FEDŐRÉTEG =====
  // Csak a KÉPERNYŐN LÁTHATÓ csomópontokat rajzolja interaktív SVG-elemként, és
  // csak akkor, ha (a) a nagyítás elérte legalább az 1. LOD-szintet (különben a
  // sűrű áttekintő nézet marad, ott a canvas-pöttyök adják a képet), és (b)
  // legfeljebb SVG_CSOMOPONT_MAX látható csomópont van (teljesítmény-korlát).
  // A cím a 2., az össztudatpont a 3. szinttől jelenik meg — ez a fokozatos,
  // kétszintű „ráközelítés-nyílás".
  _svgFrissitese(szelesseg, magassag) {
    const svg = document.getElementById('terkep-svg');
    if (!svg) return;

    // 0. szint (távoli, sűrű): nincs interaktív réteg — csak a canvas-pöttyök
    const szint = this._reszletessegiSzint();
    if (szint === 0) {
      svg.innerHTML = '';
      this._svgBazis = null; // nincs mit követni transzformmal
      return;
    }

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
      this._svgBazis = null;
      return;
    }

    // A csomópont rajz-skálája a jelenlegi zoomhoz (világhoz kötött módban nő a zoommal)
    const gSkala = this._csomopontSkala();

    const darabok = [];
    for (const { cs, x, y } of lathatok) {
      const szin = TIPUS_SZIN[cs.entitasTipus] ?? '#2b2318';
      const ikon = TIPUS_IKON[cs.entitasTipus] ?? '❔';
      const teljesCim = cs.cim ?? TIPUS_FELIRAT[cs.entitasTipus] ?? '';
      const aktualisE = this.aktualisEntitasId && cs.kulcs === this.aktualisEntitasId;

      // DINAMIKUS cím-betűméret a TELJES cím hosszából — ugyanaz a lépcsős skála,
      // mint a kártya fejlécénél (közös dinamikusCimBetumeret), a csomóponthoz
      // igazított maximummal. A kisebb betűbe több karakter fér, ezért a levágási
      // hossz a mérettel FORDÍTOTTAN arányos → hosszú (kis betűs) címből többet mutatunk.
      const cimMeret = dinamikusCimBetumeret(teljesCim.length, CIM_MAX_BETUMERET);
      const maxHossz = Math.round(CIM_MAX_HOSSZ * (CIM_MAX_BETUMERET / cimMeret));
      const rovidCim = teljesCim.length > maxHossz
        ? `${teljesCim.slice(0, maxHossz)}…`
        : teljesCim;

      // Cím CSAK a 2. szinttől, össztudatpont CSAK a 3. szinttől
      const cimSor = szint >= 2
        ? `<text y="${SVG_KOR_SUGAR + 14}" class="terkep-modal__csomopont-cim" style="font-size:${cimMeret}px">${this._escape(rovidCim)}</text>`
        : '';
      const infoSor = szint >= 3
        ? `<text y="${SVG_KOR_SUGAR + 30}" class="terkep-modal__csomopont-info">${OSSZPONT_IKON} ${(cs.hierarchikusOsszesPont ?? 0).toLocaleString('hu-HU')}</text>`
        : '';

      // Mellék-ikonok (kategória/típus/művelet) CSAK a 3. szinttől — a tudatponttal együtt
      const mellekSor = szint >= 3 ? this._mellekIkonokSvg(cs) : '';

      darabok.push(`
        <g class="terkep-modal__csomopont${aktualisE ? ' terkep-modal__csomopont--aktualis' : ''}"
           transform="translate(${x}, ${y}) scale(${gSkala})"
           data-entitas-id="${cs.entitasId}"
           data-entitas-tipus="${cs.entitasTipus}"
           role="button" tabindex="0">
          <title>${this._escape(teljesCim)} (${TIPUS_FELIRAT[cs.entitasTipus] ?? cs.entitasTipus})</title>
          <circle r="${SVG_KOR_SUGAR}" fill="${szin}" class="terkep-modal__csomopont-kor"></circle>
          <text y="1" class="terkep-modal__csomopont-ikon">${ikon}</text>
          ${cimSor}
          ${infoSor}
          ${mellekSor}
        </g>`);
    }

    // A feltöltött kép-mellékikonokat körre vágó defs (egyszer, a réteg elején).
    // A csomópontok EGY közös <g>-be kerülnek: a mozgás közbeni követés ezt az
    // egyetlen elemet transzformálja (nem épül újra az egész réteg).
    const defs = `<defs><clipPath id="terkep-mellek-klip"><circle r="${MELLEK_SUGAR}"></circle></clipPath></defs>`;
    svg.innerHTML = `${defs}<g id="terkep-svg-tartalom">${darabok.join('')}</g>`;

    // A bázis-nézet rögzítése: ehhez képest számol a _svgKovetes a mozgás alatt
    this._svgBazis = {
      skala:    this.nezet.skala,
      eltolasX: this.nezet.eltolasX,
      eltolasY: this.nezet.eltolasY
    };
  }

  // ===== MELLÉK-IKONOK EGY CSOMÓPONTHOZ =====
  // A fő ikon melletti kis körök (a csomópont LOKÁLIS koordinátáiban, tehát a
  // csomópont scale-jével együtt nagyítódnak):
  //   - Tartalom: tartalomtípus JOBBRA, kategóriák BALRA (kifelé sorolva);
  //   - Javaslat/Egyezmény: a művelet-típus (javaslatTipus) JOBBRA.
  // @param {Object} cs - a csomópont (entitasTipus, tipusIkon, kategoriaIkonok, javaslatTipus)
  // @returns {string} az összefűzött mellék-ikon SVG-csoportok
  _mellekIkonokSvg(cs) {
    const jobbX = SVG_KOR_SUGAR + MELLEK_KOZ + MELLEK_SUGAR;  // a jobb oldali kör közepe
    const lepes = 2 * MELLEK_SUGAR + MELLEK_KOZ;              // szomszédos mellékek távolsága
    const darabok = [];

    if (cs.entitasTipus === 'Tartalom') {
      // Tartalomtípus JOBBRA (ha van hozzárendelve)
      if (cs.tipusIkon?.ikon) {
        darabok.push(this._egyMellekIkon(jobbX, TIPUS_SZIN.TartalomTipus, cs.tipusIkon.ikon, cs.tipusIkon.nev));
      }
      // Kategóriák BALRA (ahány van, kifelé sorolva)
      (cs.kategoriaIkonok ?? []).forEach((kat, i) => {
        if (!kat?.ikon) return;
        darabok.push(this._egyMellekIkon(-(jobbX + i * lepes), TIPUS_SZIN.Kategoria, kat.ikon, kat.nev));
      });
    } else if (cs.entitasTipus === 'Javaslat' || cs.entitasTipus === 'Egyezmeny') {
      // Művelet-típus JOBBRA, a csomópont saját típus-színével
      const emoji = JAVASLAT_TIPUS_IKON[cs.javaslatTipus];
      if (emoji) {
        darabok.push(this._egyMellekIkon(jobbX, TIPUS_SZIN[cs.entitasTipus] ?? '#2b2318', emoji, cs.javaslatTipus));
      }
    }

    return darabok.join('');
  }

  // Egyetlen mellék-ikon (kis kör + benne emoji VAGY feltöltött kép) az adott
  // lokális X pozíción (a fő kör középvonalában, y=0)
  _egyMellekIkon(cx, szin, ikonErtek, cim) {
    const kepE = typeof ikonErtek === 'string' && /^(https?:\/\/|\/)/.test(ikonErtek);
    const belso = kepE
      ? `<image href="${this._escape(ikonErtek)}" x="${-MELLEK_SUGAR}" y="${-MELLEK_SUGAR}" width="${2 * MELLEK_SUGAR}" height="${2 * MELLEK_SUGAR}" preserveAspectRatio="xMidYMid slice" clip-path="url(#terkep-mellek-klip)"></image>`
      : `<text y="0.5" class="terkep-modal__mellek-ikon">${this._escape(ikonErtek ?? '')}</text>`;
    return `<g class="terkep-modal__mellek" transform="translate(${cx}, 0)">
      <title>${this._escape(cim ?? '')}</title>
      <circle r="${MELLEK_SUGAR}" fill="${szin}" class="terkep-modal__mellek-kor"></circle>
      ${belso}
    </g>`;
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
      this._interakcioRajzolas();
    });

    nezetElem.addEventListener('pointerup', (e) => {
      const kattintasVolt = this._huzasAktiv && this._huzasTavolsag <= KATTINTAS_KUSZOB;

      // A pan-húzás pointer-capture-jét ELENGEDJÜK: amíg a nézet befogja a
      // pointert, a pointer-események targetje MINDIG a nézet-div (nem az
      // SVG-csomópont) — a régi e.target-alapú találat ezért sosem működött.
      if (nezetElem.hasPointerCapture?.(e.pointerId)) {
        nezetElem.releasePointerCapture(e.pointerId);
      }

      this._huzasAktiv = false;
      this._huzasKezdet = null;

      if (!kattintasVolt) return;
      this._kattintasKezelese(e);
    });

    // --- Görgetés-esemény: PINCH = zoom, KÉTUJJAS GÖRGETÉS = pásztázás ---
    // A Windows touchpad az ujjak SZÉTHÚZÁSÁT (pinch) `ctrlKey`-es görgetésként
    // küldi, a kétujjas fel/le/oldalt mozgatást viszont sima görgetésként. Ezért:
    //   - ctrlKey  → ZOOM (a delta nagyságával arányosan, finoman — nem „ugrik"),
    //   - egyébként → PÁSZTÁZÁS (a térkép mozgatása), NEM zoom (Csaba kérése).
    nezetElem.addEventListener('wheel', (e) => {
      e.preventDefault(); // az oldal ne görögjön a térkép alatt
      const teglalap = nezetElem.getBoundingClientRect();
      const px = e.clientX - teglalap.left;
      const py = e.clientY - teglalap.top;

      if (e.ctrlKey) {
        // Pinch (ujj-széthúzás): a delta nagyságához igazított, sima zoom
        const szorzo = Math.exp(-e.deltaY * ZOOM_ERZEKENYSEG);
        this._zoom(szorzo, px, py);
      } else {
        // Kétujjas görgetés: a térkép pásztázása (a lap-görgetés irányát követve)
        this.nezet.eltolasX -= e.deltaX;
        this.nezet.eltolasY -= e.deltaY;
        this._interakcioRajzolas();
      }
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
    this._interakcioRajzolas();
  }

  // A ＋/－ gombok zoomja: a nézet közepére központosítva
  _zoomKozeppontra(szorzo) {
    const nezetElem = document.getElementById('terkep-nezet');
    if (!nezetElem) return;
    this._zoom(szorzo, nezetElem.clientWidth / 2, nezetElem.clientHeight / 2);
  }

  // ===== KATTINTÁS KEZELÉSE (TALÁLAT-KERESÉS) =====
  // Kétlépcsős: (1) a kurzor alatti VALÓDI SVG-csomópontot próbáljuk
  // (elementFromPoint — a pointer-capture-t nem érinti, a látható jelre pontos),
  // majd (2) tartalékként — a távoli, csak-pötty nézetben, ahol nincs SVG-elem —
  // a legközelebbi csomópontot keressük a képernyő-koordinátából, a látható
  // csomópont-sugárhoz igazított toleranciával.
  _kattintasKezelese(esemeny) {
    const nezetElem = document.getElementById('terkep-nezet');
    if (!nezetElem || !this.elrendezes) return;

    // (1) Pontos találat: a kurzor alatti elem SVG-csomópontja (kör vagy ikon)
    const elem = document.elementFromPoint(esemeny.clientX, esemeny.clientY);
    const svgCsomopont = elem?.closest?.('.terkep-modal__csomopont');
    if (svgCsomopont) {
      this._csomopontKattintas(
        svgCsomopont.dataset.entitasId,
        svgCsomopont.dataset.entitasTipus
      );
      return;
    }

    // (2) Tartalék: a legközelebbi csomópont a koordináta-listából
    const teglalap = nezetElem.getBoundingClientRect();
    const kattX = esemeny.clientX - teglalap.left;
    const kattY = esemeny.clientY - teglalap.top;
    const { skala, eltolasX, eltolasY } = this.nezet;

    // A tolerancia a LÁTHATÓ jel méretéhez igazodik: közeli nézetben az SVG-kör,
    // távoliban a kis canvas-pötty sugara (+ kis ráhagyás a könnyebb koppintáshoz)
    const sugar = this._reszletessegiSzint() >= 1
      ? SVG_KOR_SUGAR * this._csomopontSkala()
      : POTTY_SUGAR;
    const maxTavolsag = sugar + 6;
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
