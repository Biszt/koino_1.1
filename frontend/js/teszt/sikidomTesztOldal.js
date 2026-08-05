// frontend/js/teszt/sikidomTesztOldal.js

// ===== SÍKIDOM TESZT-OLDAL (fejlesztői homokozó) =====
//
// Felelősség: az önhasonló spirál-pakolás kipróbálása TESZT KÖRÖKKEL — valódi
// entitások, bejelentkezés és backend nélkül. A síkidomok helyét és méretét a
// sikidomSpiral.js adja; ez a fájl csak kirajzolja és kezeli a nagyítást.
//
// Amit bemutat:
//   1. A közepén ÜRES KÖR van, ami a képernyőhöz igazodik.
//   2. Befelé egyre kisebbek a körök — a legkisebbeket mindig a közép körül
//      kell keresni (ez volt a cél: az e-ember tudja, hol keresse).
//   3. A közép felé nagyítva VÉGTELENÜL jönnek elő az újabb körök.
//
// A VÉGTELEN NAGYÍTÁS TITKA (újranormálás):
// ha csak növelnénk a nagyítást, a lebegőpontos számok pár száz lépés után
// elfogynának. Ehelyett időnként „nullázzuk" a sorszámokat: eltoljuk őket k-val,
// és ezzel EGYIDEJŰLEG a nagyítást meretArany^(-k)-val szorozzuk, a képet pedig
// k·szögLépéssel elforgatjuk. Az önhasonlóság miatt ez PONTOSAN ugyanazt a képet
// adja — csak a számok maradnak kicsik. Így a mélység korlátlan.
//
// Megnyitás: http://localhost:3000/sikidomTeszt.html

// ===== IMPORTOK =====
import {
  spiralElokeszites,
  pozicio,
  lathatoSikidomok,
  uresKorSugar,
  legbelsoLathatoIndex,
  gyerekNezet,
  ARANYSZOG_FOK
} from '../utils/sikidomSpiral.js';

// ===== ÁLLANDÓK =====

// A körök színei sorszám szerint körbeforognak — így láthatóvá válnak a
// spirál-karok. (A Síkidom nézet entitás-színeit idézik.)
const SZINEK = ['#2d5a27', '#7d5ba6', '#b07d2a', '#1f6e8c', '#8c4a3f'];

// Ekkora látszó sugár felett írjuk ki a kör sorszámát
const SORSZAM_MIN_SUGAR = 17;

// Nagyítási szorzó egy egér-görgetésre
const ZOOM_LEPES = 1.15;

// Az automatikus mélyülés sebessége (nagyítási szorzó képkockánként)
const MELYULES_SEBESSEG = 1.012;

// Ennél nagyobb sorszám-eltérésnél újranormálunk (lásd a fejlécet)
const UJRANORMALAS_HATAR = 150;

// Ennél nagyobb elmozdulás húzás, nem kattintás
const KATTINTAS_KUSZOB = 4;

// ----- AL-ENTITÁSOK (beágyazott szintek) -----

// Ekkora látszó sugár alatt a síkidomba már nem rajzolunk al-entitásokat
// (úgysem látszana belőlük semmi, viszont sokat számolnánk)
const GYEREK_MIN_SZULO_SUGAR = 26;

// Rajzolási költségvetés képkockánként: ennyi síkidomnál többet nem rajzolunk.
// A fraktál lefelé végtelen, tehát kell egy fék, hogy a kép gyors maradjon.
const ALAKZAT_KOLTSEGVETES = 4000;

// A kitöltés átlátszósága szintenként — a mélyebb szintek halványabbak, így
// látszik, mi van min belül
const SZINT_ATLATSZOSAG = [0.30, 0.22, 0.16, 0.12, 0.09];

// ===== SÍKIDOM TESZT-OLDAL OSZTÁLY =====
class SikidomTesztOldal {

  constructor() {
    console.log('SikidomTesztOldal.constructor - KEZDÉS');

    this.vaszon = document.getElementById('sikidom-vaszon');
    this.rajzolo = this.vaszon.getContext('2d');

    // A spirál hangolható paraméterei (a csúszkák ezeket írják)
    this.beallitasok = {
      meretArany: 1.05,
      szogLepesFok: 150,
      kitoltes: 0.94
    };
    this.minKeppont = 6;      // ekkora látszó sugár alatt nem rajzolunk
    this.spiral = null;       // a spiralElokeszites() eredménye

    // Megjelenítési kapcsolók
    this.sorszamokLatszanak = true;
    this.uresKorLatszik = true;
    this.melyulesFut = false;
    this.alEntitasokLatszanak = true;   // al-entitások a síkidomokon belül
    this.maxGyerekMelyseg = 2;          // hány szintet ágyazunk be

    // Nézet: világ → képernyő transzformáció + a sorszám-eltolás
    this.nezet = {
      skala: 1,
      eltolasX: 0,
      eltolasY: 0,
      forgatas: 0,
      indexEltolas: 0
    };

    // Húzás állapota
    this._huzasAktiv = false;
    this._huzasKezdet = null;
    this._huzasTavolsag = 0;

    // Kirajzolás-kérés (hogy képkockánként csak egyszer rajzoljunk)
    this._rajzolasKeres = false;

    console.log('SikidomTesztOldal.constructor - VÉGE');
  }

  // ===== INDÍTÁS =====
  init() {
    console.log('SikidomTesztOldal.init - KEZDÉS');

    this._spiralUjraepitese();
    this._vaszonMeretezese();
    this._alaphelyzet();

    this._vezerlokBekotese();
    this._egerEsemenyekBekotese();

    window.addEventListener('resize', () => {
      this._vaszonMeretezese();
      this._rajzolasKerese();
    });

    console.log('SikidomTesztOldal.init - VÉGE');
  }

  // ===== SPIRÁL ÚJRAÉPÍTÉSE (paraméter-változáskor) =====
  _spiralUjraepitese() {
    this.spiral = spiralElokeszites(this.beallitasok);
    this._kijelzokFrissitese();
  }

  // ===== VÁSZON MÉRETEZÉSE (éles kép nagy felbontású kijelzőn is) =====
  _vaszonMeretezese() {
    const arany = window.devicePixelRatio || 1;
    this.szelesseg = window.innerWidth;
    this.magassag = window.innerHeight;

    this.vaszon.width = Math.round(this.szelesseg * arany);
    this.vaszon.height = Math.round(this.magassag * arany);
    // Minden rajzolás képpontban történik; a méretarányt a vászon intézi
    this.rajzolo.setTransform(arany, 0, 0, arany, 0, 0);
  }

  // ===== ALAPHELYZET =====
  _alaphelyzet() {
    console.log('SikidomTesztOldal._alaphelyzet - KEZDÉS');

    this.nezet.skala = Math.min(this.szelesseg, this.magassag) * 0.45;
    this.nezet.eltolasX = this.szelesseg / 2;
    this.nezet.eltolasY = this.magassag / 2;
    this.nezet.forgatas = 0;
    this.nezet.indexEltolas = 0;

    this._rajzolasKerese();
    console.log('SikidomTesztOldal._alaphelyzet - VÉGE');
  }

  // ===== ÚJRANORMÁLÁS (a végtelen nagyítás kulcsa) =====
  // Ha a legbelső látható sorszám túl messzire szaladt a nullától, eltoljuk a
  // sorszámokat, és a nagyítást + forgatást úgy igazítjuk, hogy a kép PONTOSAN
  // ugyanaz maradjon. Levezetés (λ = méret-arány, Δ = szöglépés, k = eltolás):
  //   a k-val eltolt sorszám világ-helye = λ^k · (−k·Δ forgatás) · a régi hely
  //   → hogy a képernyő-hely ne változzon: skála ← skála·λ^(−k), forgatás ← +k·Δ
  _ujranormalas() {
    const legbelso = legbelsoLathatoIndex(this.spiral, this.nezet.skala, this.minKeppont);
    if (Math.abs(legbelso) <= UJRANORMALAS_HATAR) return;

    const k = legbelso;
    this.nezet.indexEltolas += k;
    this.nezet.skala *= Math.pow(this.spiral.meretArany, -k);
    this.nezet.forgatas += k * this.spiral.szogLepes;
  }

  // ===== KIRAJZOLÁS-KÉRÉS =====
  // Képkockánként legfeljebb egyszer rajzolunk. (A rajzoló metódusokban
  // SZÁNDÉKOSAN nincs console.log: képkockánként elárasztaná a naplót.)
  _rajzolasKerese() {
    if (this._rajzolasKeres) return;
    this._rajzolasKeres = true;
    requestAnimationFrame(() => {
      this._rajzolasKeres = false;
      this._rajzolas();
    });
  }

  // ===== RAJZOLÁS =====
  _rajzolas() {
    this._ujranormalas();

    const r = this.rajzolo;
    r.clearRect(0, 0, this.szelesseg, this.magassag);

    const sikidomok = lathatoSikidomok(
      this.spiral, this.nezet, this.szelesseg, this.magassag,
      { minKeppont: this.minKeppont }
    );

    // A NAGYOKAT rajzoljuk előbb, hogy a kisebbek rájuk kerüljenek.
    // A lista a legbelsőtől (legkisebb) kifelé halad → megfordítjuk.
    const rajzolasiSorrend = [...sikidomok].reverse();

    // Költségvetés: a fraktál LEFELÉ is végtelen (síkidom a síkidomban), ezért
    // képkockánként korlátozzuk a kirajzolt síkidomok számát
    const koltsegvetes = { maradek: ALAKZAT_KOLTSEGVETES };

    for (const s of rajzolasiSorrend) {
      if (koltsegvetes.maradek <= 0) break;
      const valodiIndex = s.index + this.nezet.indexEltolas;

      this._korRajzolasa(s, valodiIndex, 0);
      koltsegvetes.maradek--;

      // AL-ENTITÁSOK: a síkidomon BELÜL, pontosan ugyanezzel a spirállal
      if (this.alEntitasokLatszanak) this._gyerekekRajzolasa(s, 1, koltsegvetes);
    }

    if (this.uresKorLatszik) this._uresKorRajzolasa();

    this._kijelzokFrissitese(ALAKZAT_KOLTSEGVETES - koltsegvetes.maradek);

    // Automatikus mélyülés: nagyítunk egy lépést, és MINDJÁRT kérünk is új
    // képkockát — enélkül a mozgás egyetlen kocka után megállna.
    // A nagyítás közepe maga a spirál középpontja, ezért az eltolás nem mozdul.
    if (this.melyulesFut) {
      this._zoom(MELYULES_SEBESSEG, this.nezet.eltolasX, this.nezet.eltolasY);
      this._rajzolasKerese();
    }
  }

  // ===== EGY SÍKIDOM KIRAJZOLÁSA =====
  // @param {Object} sikidom - {kepX, kepY, kepSugar}
  // @param {number} felirat - a kiírandó sorszám (a szín is ebből jön)
  // @param {number} melyseg - 0 = legfelső szint, 1 = al-entitás, 2 = annak az al-entitása…
  _korRajzolasa(sikidom, felirat, melyseg) {
    const r = this.rajzolo;
    const szin = SZINEK[((felirat % SZINEK.length) + SZINEK.length) % SZINEK.length];
    const atlatszosag = SZINT_ATLATSZOSAG[Math.min(melyseg, SZINT_ATLATSZOSAG.length - 1)];

    r.beginPath();
    r.arc(sikidom.kepX, sikidom.kepY, sikidom.kepSugar, 0, Math.PI * 2);
    r.fillStyle = szin;
    r.globalAlpha = atlatszosag;
    r.fill();
    r.globalAlpha = 1;
    r.strokeStyle = szin;
    r.lineWidth = melyseg === 0 ? 1.5 : 1;
    r.stroke();

    // Sorszám csak a legfelső szinten (lejjebb zsúfolt lenne). A felirat a
    // síkidom közepére kerül — ott épp az al-entitások üres magja van, tehát
    // nem takar el semmit.
    if (this.sorszamokLatszanak && melyseg === 0 && sikidom.kepSugar > SORSZAM_MIN_SUGAR) {
      r.fillStyle = '#ece5d6';
      r.font = `${Math.min(18, sikidom.kepSugar * 0.45).toFixed(0)}px system-ui, sans-serif`;
      r.textAlign = 'center';
      r.textBaseline = 'middle';
      r.fillText(String(felirat), sikidom.kepX, sikidom.kepY);
    }
  }

  // ===== AL-ENTITÁSOK RAJZOLÁSA (rekurzívan, a szülőn belül) =====
  // A szülő síkidom belsejébe UGYANAZT a spirált rajzoljuk kicsiben. A
  // `legkisebbIndex: 0` gondoskodik arról, hogy ne lógjon ki a szülőből: a 0.
  // sorszám a legnagyobb al-entitás, ami éppen érinti a szülő peremét belülről.
  //
  // @param {Object} szulo - a szülő síkidom {kepX, kepY, kepSugar}
  // @param {number} melyseg - a most rajzolandó szint (1 = első al-szint)
  // @param {Object} koltsegvetes - {maradek} — közös fék az egész képkockára
  _gyerekekRajzolasa(szulo, melyseg, koltsegvetes) {
    if (melyseg > this.maxGyerekMelyseg) return;
    if (koltsegvetes.maradek <= 0) return;
    // Túl kicsi szülőbe nincs értelme rajzolni — nem látszana, csak számolnánk
    if (szulo.kepSugar < GYEREK_MIN_SZULO_SUGAR) return;

    const nezet = gyerekNezet(this.spiral, this.nezet, szulo);

    const gyerekek = lathatoSikidomok(
      this.spiral, nezet, this.szelesseg, this.magassag,
      { minKeppont: this.minKeppont, legkisebbIndex: 0 }
    );

    // Itt is a nagyobbaktól a kisebbek felé, hogy a kicsik felülre kerüljenek
    for (const gy of [...gyerekek].reverse()) {
      if (koltsegvetes.maradek <= 0) break;

      this._korRajzolasa(gy, gy.index, melyseg);
      koltsegvetes.maradek--;

      // …és az al-entitásnak is lehet al-entitása
      this._gyerekekRajzolasa(gy, melyseg + 1, koltsegvetes);
    }
  }

  // ===== ÜRES KÖR JELÖLÉSE =====
  // A közepén lévő üres kör: ide kerülnek majd a még be nem töltött, kisebb
  // entitások. Szaggatott vonallal jelöljük, hogy látsszon a mechanizmus.
  _uresKorRajzolasa() {
    const sugar = uresKorSugar(this.spiral, this.nezet.skala, this.minKeppont);
    if (!Number.isFinite(sugar) || sugar < 4) return;

    const r = this.rajzolo;
    const kx = this.nezet.eltolasX;
    const ky = this.nezet.eltolasY;

    r.save();
    r.beginPath();
    r.arc(kx, ky, sugar, 0, Math.PI * 2);
    r.strokeStyle = 'rgba(236, 229, 214, 0.45)';
    r.lineWidth = 1;
    r.setLineDash([5, 5]);
    r.stroke();
    r.restore();

    // Felirat csak akkor, ha elfér az üres körben
    if (sugar > 62) {
      r.fillStyle = 'rgba(236, 229, 214, 0.55)';
      r.font = '12px system-ui, sans-serif';
      r.textAlign = 'center';
      r.textBaseline = 'middle';
      r.fillText('üres kör', kx, ky - 8);
      r.fillText('— nagyíts befelé —', kx, ky + 8);
    }
  }

  // ===== KIJELZŐK FRISSÍTÉSE =====
  _kijelzokFrissitese(darab = null) {
    const beir = (azonosito, ertek) => {
      const elem = document.getElementById(azonosito);
      if (elem) elem.textContent = ertek;
    };

    if (darab !== null) beir('kijelzo-darab', `${darab} db`);

    beir('kijelzo-sugarArany',
      `${this.spiral.sugarArany.toFixed(3)} / ${this.spiral.legnagyobbArany.toFixed(3)}`);

    // Átfedésmentes, amíg a használt sugár-arány nem lépi túl a felső határt
    const atfedesmentes = this.spiral.sugarArany <= this.spiral.legnagyobbArany + 1e-12;
    beir('kijelzo-atfedes', atfedesmentes ? 'igen ✔' : 'NEM ✘');

    // Mélység = a legbelső látható kör VALÓDI sorszáma
    const legbelso = legbelsoLathatoIndex(this.spiral, this.nezet.skala, this.minKeppont);
    const melyseg = legbelso + this.nezet.indexEltolas;
    beir('kijelzo-melyseg', String(melyseg));

    // Össznagyítás = méret-arány^mélység — gyorsan csillagászati lesz, ezért
    // tízes hatványként írjuk ki
    const tizesHatvany = melyseg * Math.log10(this.spiral.meretArany);
    beir('kijelzo-nagyitas',
      Math.abs(tizesHatvany) < 4
        ? `${Math.pow(10, tizesHatvany).toFixed(1)}×`
        : `10^${tizesHatvany.toFixed(1)}×`);
  }

  // ===== VEZÉRLŐK BEKÖTÉSE =====
  _vezerlokBekotese() {
    console.log('SikidomTesztOldal._vezerlokBekotese - KEZDÉS');

    // --- Csúszkák ---
    const csuszkaBekotes = (azonosito, kezelo) => {
      document.getElementById(azonosito)?.addEventListener('input', (e) => {
        kezelo(parseFloat(e.target.value));
        this._spiralUjraepitese();
        this._rajzolasKerese();
      });
    };

    csuszkaBekotes('csuszka-meretArany', (ertek) => {
      this.beallitasok.meretArany = ertek;
      this._ertekKiiras('ertek-meretArany', ertek.toFixed(2));
    });

    csuszkaBekotes('csuszka-szogLepes', (ertek) => {
      this.beallitasok.szogLepesFok = ertek;
      this._ertekKiiras('ertek-szogLepes', `${ertek.toFixed(1).replace('.', ',')}°`);
    });

    csuszkaBekotes('csuszka-kitoltes', (ertek) => {
      this.beallitasok.kitoltes = ertek;
      this._ertekKiiras('ertek-kitoltes', `${Math.round(ertek * 100)}%`);
    });

    csuszkaBekotes('csuszka-minKeppont', (ertek) => {
      this.minKeppont = ertek;
      this._ertekKiiras('ertek-minKeppont', `${ertek} px`);
    });

    csuszkaBekotes('csuszka-gyerekMelyseg', (ertek) => {
      this.maxGyerekMelyseg = ertek;
      this._ertekKiiras('ertek-gyerekMelyseg', String(ertek));
    });

    // --- Előbeállítások ---
    const ELOBEALLITASOK = {
      tomor:      { meretArany: 1.05, szogLepesFok: 150,           kitoltes: 0.94 },
      napraforgo: { meretArany: 1.08, szogLepesFok: ARANYSZOG_FOK, kitoltes: 0.94 },
      egykaru:    { meretArany: 1.05, szogLepesFok: 20,            kitoltes: 0.94 },
      suru:       { meretArany: 1.02, szogLepesFok: 100,           kitoltes: 0.94 }
    };

    document.querySelectorAll('[data-elobeallitas]').forEach((gomb) => {
      gomb.addEventListener('click', () => {
        const nev = gomb.dataset.elobeallitas;
        console.log('SikidomTesztOldal - előbeállítás', { nev });
        this.beallitasok = { ...ELOBEALLITASOK[nev] };
        this._csuszkakBeallitasa();
        this._spiralUjraepitese();
        this._rajzolasKerese();
      });
    });

    // --- Kapcsolók ---
    document.getElementById('kapcsolo-melyules')?.addEventListener('change', (e) => {
      this.melyulesFut = e.target.checked;
      console.log('SikidomTesztOldal - automatikus mélyülés', { fut: this.melyulesFut });
      if (this.melyulesFut) this._rajzolasKerese();
    });

    document.getElementById('kapcsolo-alEntitas')?.addEventListener('change', (e) => {
      this.alEntitasokLatszanak = e.target.checked;
      console.log('SikidomTesztOldal - al-entitások', { latszanak: this.alEntitasokLatszanak });
      this._rajzolasKerese();
    });

    document.getElementById('kapcsolo-sorszam')?.addEventListener('change', (e) => {
      this.sorszamokLatszanak = e.target.checked;
      this._rajzolasKerese();
    });

    document.getElementById('kapcsolo-uresKor')?.addEventListener('change', (e) => {
      this.uresKorLatszik = e.target.checked;
      this._rajzolasKerese();
    });

    // --- Alaphelyzet gomb ---
    document.getElementById('gomb-alaphelyzet')?.addEventListener('click', () => {
      this._alaphelyzet();
    });

    // --- Panel összecsukása ---
    document.getElementById('sikidom-osszecsuk')?.addEventListener('click', (e) => {
      const torzs = document.getElementById('sikidom-panel-torzs');
      const rejtve = torzs.toggleAttribute('hidden');
      e.target.textContent = rejtve ? '+' : '–';
    });

    console.log('SikidomTesztOldal._vezerlokBekotese - VÉGE');
  }

  // A csúszkák és a feliratok igazítása a jelenlegi beállításokhoz
  _csuszkakBeallitasa() {
    const beallit = (azonosito, ertek) => {
      const elem = document.getElementById(azonosito);
      if (elem) elem.value = ertek;
    };

    beallit('csuszka-meretArany', this.beallitasok.meretArany);
    beallit('csuszka-szogLepes', this.beallitasok.szogLepesFok);
    beallit('csuszka-kitoltes', this.beallitasok.kitoltes);

    this._ertekKiiras('ertek-meretArany', this.beallitasok.meretArany.toFixed(2));
    this._ertekKiiras('ertek-szogLepes',
      `${this.beallitasok.szogLepesFok.toFixed(1).replace('.', ',')}°`);
    this._ertekKiiras('ertek-kitoltes', `${Math.round(this.beallitasok.kitoltes * 100)}%`);
  }

  _ertekKiiras(azonosito, szoveg) {
    const elem = document.getElementById(azonosito);
    if (elem) elem.textContent = szoveg;
  }

  // ===== EGÉR / ÉRINTÉS =====
  _egerEsemenyekBekotese() {
    console.log('SikidomTesztOldal._egerEsemenyekBekotese - KEZDÉS');

    const v = this.vaszon;

    v.addEventListener('pointerdown', (e) => {
      this._huzasAktiv = true;
      this._huzasTavolsag = 0;
      this._huzasKezdet = {
        x: e.clientX, y: e.clientY,
        eltolasX: this.nezet.eltolasX, eltolasY: this.nezet.eltolasY
      };
      v.setPointerCapture(e.pointerId);
    });

    v.addEventListener('pointermove', (e) => {
      if (!this._huzasAktiv || !this._huzasKezdet) return;
      const dx = e.clientX - this._huzasKezdet.x;
      const dy = e.clientY - this._huzasKezdet.y;
      this._huzasTavolsag = Math.max(this._huzasTavolsag, Math.abs(dx) + Math.abs(dy));
      this.nezet.eltolasX = this._huzasKezdet.eltolasX + dx;
      this.nezet.eltolasY = this._huzasKezdet.eltolasY + dy;
      this._rajzolasKerese();
    });

    v.addEventListener('pointerup', () => {
      this._huzasAktiv = false;
      this._huzasKezdet = null;
    });

    // Görgetés: nagyítás az egérmutatóra
    v.addEventListener('wheel', (e) => {
      e.preventDefault();
      const szorzo = e.deltaY < 0 ? ZOOM_LEPES : 1 / ZOOM_LEPES;
      this._zoom(szorzo, e.clientX, e.clientY);
      this._rajzolasKerese();
    }, { passive: false });

    // Dupla kattintás: gyors mélyülés a spirál közepe felé
    v.addEventListener('dblclick', (e) => {
      if (this._huzasTavolsag > KATTINTAS_KUSZOB) return;
      console.log('SikidomTesztOldal - dupla kattintás, mélyülés');
      this._zoom(Math.pow(ZOOM_LEPES, 6), e.clientX, e.clientY);
      this._rajzolasKerese();
    });

    console.log('SikidomTesztOldal._egerEsemenyekBekotese - VÉGE');
  }

  // Nagyítás egy képernyő-pontra központosítva (az a pont a helyén marad)
  _zoom(szorzo, kozepX, kozepY) {
    this.nezet.skala *= szorzo;
    this.nezet.eltolasX = kozepX - (kozepX - this.nezet.eltolasX) * szorzo;
    this.nezet.eltolasY = kozepY - (kozepY - this.nezet.eltolasY) * szorzo;
  }
}

// ===== INDÍTÁS =====
const oldal = new SikidomTesztOldal();
oldal.init();
