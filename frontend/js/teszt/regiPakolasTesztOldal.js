// frontend/js/teszt/regiPakolasTesztOldal.js

// ===== RÉGI PAKOLÁS — HOMOKOZÓ =====
//
// Felelősség: megmutatni, mit csinál a koino_1.0 háromszögelése, egy az egyben.
// Középpontos indulás, ÜRES MAG NÉLKÜL — ahogy a régi rendszerben volt.
//
// KÉT ÜZEMMÓD:
//   - teljes kép: minden síkidom egyszerre, az átfedők pirossal;
//   - LÉPÉSENKÉNT: a legkisebbel kezdve egyesével rakjuk le a köröket, és a jobb
//     oldali ablakban végigkövethető a POZÍCIÓ-SZÁMÍTÁS minden részlete —
//     a segédkörök, a metszéspontok képlete, a korrekció és az eredmény.
//     A vásznon ugyanez geometriailag is látszik (szaggatott segédkörök,
//     a két metszéspont, a választott).
//
// Backend és bejelentkezés nem kell: a teszt-körök tudatpontjait itt generáljuk.
// Megnyitás: http://localhost:3000/regiPakolasTeszt.html

// ===== IMPORTOK =====
import { regiPakolasLepesekkel, atfedesek } from './regiPakolas.js';
import { ivesPakolasLepesekkel } from './ivesPakolas.js';

// ===== ÁLLANDÓK =====

// A tudatpont → sugár képlet az éles nézetből: a TERÜLET arányos a ponttal,
// szintenként /20 (lásd sikidomMeret.js)
const SZINT_OSZTO = 20;

// A legnagyobb gyerek sugara a szuloehez kepest: 1/sqrt(20) (domain-szabaly)
const LEGNAGYOBB_SUGAR = 1 / Math.sqrt(SZINT_OSZTO);

// A vászon ekkora hányadát töltse ki az elrendezés
const KITOLTES = 0.85;

const ZOOM_LEPES = 1.15;
const SZINEK = ['#2d5a27', '#7d5ba6', '#b07d2a', '#1f6e8c', '#8c4a3f'];

// A szerkesztés (segédkörök, metszéspontok) színei
const SZIN_HORGONY  = '#1f6e8c';
const SZIN_PARTNER  = '#2d5a27';
const SZIN_KORREKCIO = '#b07d2a';
const SZIN_UJ       = '#c0392b';

// Lejátszás sebessége (ezredmásodperc lépésenként)
const LEJATSZAS_UTEM = 260;

// ===== SZÁM-FORMÁZÁS =====
const sz = (ertek, jegy = 6) =>
  (ertek === null || ertek === undefined || Number.isNaN(ertek)) ? '—' : ertek.toFixed(jegy);
const pont = (p, jegy = 5) => p ? `(${p.x.toFixed(jegy)}; ${p.y.toFixed(jegy)})` : '—';
const szazalek = (ertek) => `${(ertek * 100).toFixed(1)}%`;

// ===== RÉGI PAKOLÁS TESZT-OLDAL =====
class RegiPakolasTesztOldal {

  constructor() {
    console.log('RegiPakolasTesztOldal.constructor - KEZDÉS');

    this.vaszon = document.getElementById('regi-vaszon');
    this.rajzolo = this.vaszon.getContext('2d');

    this.darab = 100;
    this.modszer = 'regi';        // 'regi' (koino_1.0) | 'ives' (szabad ívek)
    this.eloszlas = 'zipf';
    this.ugras = 1.3;              // a szomszedos sugarak aranya a mertani/ketpupu esetben
    this.atfedesekLatszanak = true;
    this.sorszamokLatszanak = false;
    this.szerkesztesLatszik = true;

    this.eredmeny = null;      // { helyek, lepesek, veletlenDarab }
    this.atfedes = null;       // { parok, erintettIdk }
    this.lepesIndex = 0;       // hányadik lépésnél tartunk (0-tól)
    this._lejatszas = null;

    this.nezet = { skala: 1, eltolasX: 0, eltolasY: 0 };
    this._huzasAktiv = false;
    this._huzasKezdet = null;

    console.log('RegiPakolasTesztOldal.constructor - VÉGE');
  }

  // ===== INDÍTÁS =====
  init() {
    console.log('RegiPakolasTesztOldal.init - KEZDÉS');

    this._vezerlokBekotese();
    this._esemenyekBekotese();
    this._vaszonMeretezese();
    this._ujraszamolas();

    window.addEventListener('resize', () => {
      this._vaszonMeretezese();
      this._alaphelyzet();
    });

    console.log('RegiPakolasTesztOldal.init - VÉGE');
  }

  // ===== TESZT-ADAT =====
  // Négy eloszlás, mindegyik UGYANAKKORA összterületre normálva (a domain szerint
  // a gyerekek együttes területe legfeljebb a szülő 1/20-a) — így csak a
  // méret-ARÁNYOK különböznek, a zsúfoltság nem:
  //
  //   - „zipf"       — néhány erős, majd hosszú farok: a valósághű eset;
  //   - „egyenletes" — mind ugyanakkora: így a pakolás szerkezete tisztán látszik;
  //   - „mértani"    — a soron következő mindig `ugras`-szor nagyobb sugarú:
  //                    EXTRÉM méret-ugrás két szomszédos lerakás között;
  //   - „kétpúpú"    — a fele apró, a fele óriás, semmi köztük: a legdurvább
  //                    átmenet, ahol egy óriást apró körök közé kell letenni.
  _elemek() {
    const OSSZ_TERULET = 0.9 / SZINT_OSZTO;      // Σ sugár² — a domain korlátja
    const PADLO = 1e-7;                          // a legkisebb megengedett sugár
    const q = this.ugras;
    const n = this.darab;

    let nyersSugarak = [];

    if (this.eloszlas === 'egyenletes') {
      nyersSugarak = Array.from({ length: n }, () => 1);

    } else if (this.eloszlas === 'mertani') {
      // r_i ∝ q^i — a szomszédos sugarak aránya végig pontosan `q`
      for (let i = 0; i < n; i++) nyersSugarak.push(Math.pow(q, i));

    } else if (this.eloszlas === 'ketpupu') {
      // A fele 1, a fele q^10 — köztük semmi
      const also = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) nyersSugarak.push(i < also ? 1 : Math.pow(q, 10));

    } else {
      // zipf: a tudatpont ~ 1/i^1.2, a sugár ennek a gyöke
      for (let i = 1; i <= n; i++) nyersSugarak.push(Math.sqrt(1 / Math.pow(i, 1.2)));
    }

    // Közös normálás: Σ sugár² = OSSZ_TERULET
    let negyzetOsszeg = 0;
    for (const s of nyersSugarak) negyzetOsszeg += s * s;
    const skala = Math.sqrt(OSSZ_TERULET / negyzetOsszeg);

    // A legnagyobb gyerek sosem lehet nagyobb a szülő 1/√20-ánál (domain-szabály)
    const legnagyobb = Math.max(...nyersSugarak) * skala;
    const vagas = legnagyobb > LEGNAGYOBB_SUGAR ? LEGNAGYOBB_SUGAR / legnagyobb : 1;

    const sugarak = nyersSugarak.map(s => Math.max(s * skala * vagas, PADLO));

    // Mekkora a tényleges méret-szórás? (a statisztika-panel kiírja)
    this._meretSzoras = Math.max(...sugarak) / Math.min(...sugarak);
    this._szomszedArany = n > 1
      ? Math.max(...sugarak.slice(1).map((s, i) => s / sugarak[i]))
      : 1;

    return sugarak.map((sugar, i) => ({
      id: `e${String(i + 1).padStart(4, '0')}`,
      sugar
    }));
  }

  // ===== ÚJRASZÁMOLÁS =====
  _ujraszamolas() {
    console.log('RegiPakolasTesztOldal._ujraszamolas - KEZDÉS', { darab: this.darab });

    this._lejatszasLeallitasa();

    const elemek = this._elemek();

    const kezdet = performance.now();
    this.eredmeny = this.modszer === 'ives'
      ? ivesPakolasLepesekkel(elemek)
      : regiPakolasLepesekkel(elemek);
    this._idotartam = performance.now() - kezdet;

    this.atfedes = atfedesek(this.eredmeny.helyek);
    this.lepesIndex = this.eredmeny.lepesek.length - 1;   // alapból a teljes kép

    this._lepesCsuszkaFrissitese();
    this._statisztikaFrissitese();
    this._alaphelyzet();

    console.log('RegiPakolasTesztOldal._ujraszamolas - VÉGE', {
      idotartam: this._idotartam.toFixed(1),
      atfedoPar: this.atfedes.parok.length
    });
  }

  // ===== STATISZTIKA =====
  _statisztikaFrissitese() {
    const parok = this.atfedes.parok;
    const erintett = this.atfedes.erintettIdk.size;

    const median = parok.length ? parok[Math.floor(parok.length / 2)].melyseg : 0;
    const legrosszabb = parok.length ? parok[0].melyseg : 0;

    const sorok = [
      ['síkidom', this.eredmeny.helyek.length],
      ['pakolás ideje', `${this._idotartam.toFixed(1)} ms`],
      ['méret-szórás (max/min)', this._meretSzoras >= 1000
        ? this._meretSzoras.toExponential(1) + '×'
        : this._meretSzoras.toFixed(1) + '×'],
      ['legnagyobb szomszéd-ugrás', this._szomszedArany.toFixed(2) + '×'],
      ['átfedő pár', parok.length],
      ['érintett síkidom', `${erintett} (${Math.round((erintett / this.darab) * 100)}%)`],
      ['átfedés — medián', szazalek(median)],
      ['átfedés — legrosszabb', szazalek(legrosszabb)],
      this.modszer === 'ives'
        ? ['pót-horgony', this.eredmeny.potHorgonyok]
        : ['véletlen elhelyezés', this.eredmeny.veletlenDarab]
    ];

    document.getElementById('regi-statisztika').innerHTML = sorok
      .map(([nev, ertek]) => `<div class="regi-teszt__sor"><span>${nev}</span><b>${ertek}</b></div>`)
      .join('');
  }

  // ===== A SZÁMÍTÁS ABLAKA =====
  // Itt írjuk ki annak a lépésnek a teljes levezetését, ahol épp állunk.
  _szamitasFrissitese() {
    const lepes = this.eredmeny.lepesek[this.lepesIndex];
    const cel = document.getElementById('regi-szamitas');
    if (!lepes) { cel.innerHTML = ''; return; }

    if (lepes.modszer === 'ives') { this._ivesSzamitas(lepes, cel); return; }

    const reszek = [];

    reszek.push(`
      <div class="regi-szam__fejlec">
        <b>${lepes.sorszam}. lépés — ${lepes.id}</b>
        <span>sugár ${sz(lepes.sugar)}</span>
      </div>
      <p class="regi-szam__magyarazat">${lepes.magyarazat ?? ''}</p>
    `);

    // --- 1. és 2. kör: nincs háromszögelés ---
    if (lepes.tipus === 'kozeppont') {
      reszek.push(this._blokk('EREDMÉNY', [
        ['hely', pont(lepes.hely)]
      ]));
    }

    if (lepes.tipus === 'masodik') {
      const k = lepes.tavolsagKeplet;
      reszek.push(this._blokk('TÁVOLSÁG AZ ELSŐTŐL', [
        ['első sugara', sz(k.sugar1)],
        ['új sugara', sz(k.sugar2)],
        ['ráhagyás', sz(k.rahagyas, 8)],
        ['összeg', `${sz(k.sugar1)} + ${sz(k.sugar2)} + ${sz(k.rahagyas, 8)} = <b>${sz(k.eredmeny)}</b>`]
      ]));
      reszek.push(this._blokk('EREDMÉNY', [['hely', pont(lepes.hely)]]));
    }

    // --- 3. körtől: a teljes levezetés ---
    if (lepes.horgony && lepes.tipus !== 'masodik') {
      reszek.push(this._blokk('1) HORGONY — az utoljára lerakott kör', [
        ['azonosító', lepes.horgony.id],
        ['hely', pont(lepes.horgony)],
        ['sugár', sz(lepes.horgony.sugar)]
      ]));
    }

    if (lepes.partner) {
      const tobbi = (lepes.rangsor ?? []).slice(1)
        .map(r => `${r.id} ${sz(r.tav, 5)}`).join(' · ');
      reszek.push(this._blokk('2) PARTNER — a horgonyhoz legközelebbi lerakott kör', [
        ['azonosító', lepes.partner.id],
        ['hely', pont(lepes.partner)],
        ['sugár', sz(lepes.partner.sugar)],
        ['távolsága a horgonytól', sz(lepes.rangsor?.[0]?.tav, 5)],
        ['a következők', tobbi || '—']
      ]));
    }

    if (lepes.segedkorok) {
      const s = lepes.segedkorok;
      reszek.push(this._blokk('3) SEGÉDKÖRÖK — hova kerülhet az új kör', [
        ['r₁ (horgony körül)',
          `${sz(lepes.horgony.sugar)} + ${sz(lepes.sugar)} + ${sz(s.rahagyas, 3)} = <b>${sz(s.r1)}</b>`],
        ['r₂ (partner körül)',
          `${sz(lepes.partner.sugar)} + ${sz(lepes.sugar)} = <b>${sz(s.r2)}</b>`],
        ['d (a két középpont távolsága)', `<b>${sz(lepes.metszes?.d)}</b>`]
      ]));
    }

    if (lepes.metszes) {
      const m = lepes.metszes;
      if (m.pontok) {
        reszek.push(this._blokk('4) METSZÉSPONTOK', [
          ['a = (r₁² − r₂² + d²) / (2d)', `<b>${sz(m.a)}</b>`],
          ['h = √(r₁² − a²)', `<b>${sz(m.h)}</b>`],
          ['középpont az egyenesen', pont(m.kozep)],
          ['P₁ (a koino_1.0 ezt javasolja)', `<b>${pont(m.pontok[0])}</b>`],
          ['P₂', pont(m.pontok[1])]
        ]));
      } else {
        reszek.push(this._blokk('4) METSZÉSPONTOK', [
          ['nincs metszéspont', m.ok ?? '—'],
          ['d', sz(m.d)]
        ]));
      }
    }

    if (lepes.ellenorzes) {
      reszek.push(this._blokk('5) ELLENŐRZÉS — tényleg a partner a legközelebbi?', [
        ['a javasolt helyhez legközelebbi', lepes.ellenorzes.legkozelebbiId],
        ['távolsága', sz(lepes.ellenorzes.tav)],
        ['eredmény', lepes.korrekcio
          ? '<b>NEM a partner → korrekció</b>'
          : 'igen, a partner → nincs korrekció']
      ]));
    }

    if (lepes.korrekcio) {
      const k = lepes.korrekcio;
      const sorok = [
        ['az új partner', k.ujPartner.id],
        ['r₂ újraszámolva', `${sz(k.ujPartner.sugar)} + ${sz(lepes.sugar)} = <b>${sz(k.ujR2)}</b>`],
        ['d', sz(k.d)]
      ];
      if (k.pontok) {
        sorok.push(['a', sz(k.a)], ['h', sz(k.h)]);
        sorok.push(['P₁′', pont(k.pontok[0])], ['P₂′', pont(k.pontok[1])]);
        sorok.push(['Σ távolság a többiektől P₁′-hez', sz(k.osszeg1, 4)]);
        sorok.push(['Σ távolság a többiektől P₂′-hez', sz(k.osszeg2, 4)]);
        sorok.push(['választott', `<b>P${k.valasztott}′</b> (a nagyobb összeg nyer)`]);
      } else {
        sorok.push(['nincs metszéspont', k.ok ?? '—']);
      }
      reszek.push(this._blokk('6) KORREKCIÓ', sorok));
    }

    if (lepes.veletlenSzog !== undefined) {
      reszek.push(this._blokk('VÉLETLEN ELHELYEZÉS', [
        ['sorsolt szög', `${(lepes.veletlenSzog * 180 / Math.PI).toFixed(1)}°`],
        ['figyelem', 'ez a lépés futásonként MÁS eredményt adhat']
      ]));
    }

    if (lepes.tipus !== 'kozeppont' && lepes.tipus !== 'masodik') {
      reszek.push(this._blokk('EREDMÉNY', [['végleges hely', `<b>${pont(lepes.hely)}</b>`]]));
    }

    // --- Ütközések: ez a régi pakolás gyengéje ---
    if (lepes.utkozesek.length === 0) {
      reszek.push('<div class="regi-szam__rendben">Nem ütközik senkivel.</div>');
    } else {
      const sorok = lepes.utkozesek.map(u => [
        u.id,
        `belelóg <b>${sz(u.hiany, 6)}</b> — a kisebbik átmérőjének <b>${szazalek(u.melyseg)}</b>-a`
      ]);
      reszek.push(this._blokk(
        `ÜTKÖZÉS — ${lepes.utkozesek.length} körrel`, sorok, 'regi-szam__blokk--hiba'));
    }

    cel.innerHTML = reszek.join('');
    cel.scrollTop = 0;
  }

  // ===== A SZÁMÍTÁS ABLAKA — ÍVES MÓDSZER =====
  // Itt nincs partner-választás, korrekció és Σ-heurisztika: a horgony körüli
  // körből kivonjuk a tiltott szög-tartományokat, és ami marad, abból választunk.
  _ivesSzamitas(lepes, cel) {
    const reszek = [];

    reszek.push(`
      <div class="regi-szam__fejlec">
        <b>${lepes.sorszam}. lépés — ${lepes.id}</b>
        <span>sugár ${sz(lepes.sugar)}</span>
      </div>
      <p class="regi-szam__magyarazat">${lepes.magyarazat ?? ''}</p>
    `);

    if (lepes.tipus === 'kozeppont') {
      reszek.push(this._blokk('EREDMÉNY', [['hely', pont(lepes.hely)]]));
      cel.innerHTML = reszek.join('');
      cel.scrollTop = 0;
      return;
    }

    reszek.push(this._blokk('1) HORGONY', [
      ['azonosító', lepes.horgony.id + (lepes.hanyadikHorgony > 1
        ? ` (${lepes.hanyadikHorgony}. jelölt — az elsőnél nem volt szabad ív)` : '')],
      ['hely', pont(lepes.horgony)],
      ['sugár', sz(lepes.horgony.sugar)]
    ]));

    reszek.push(this._blokk('2) A LEHETSÉGES KÖZÉPPONTOK KÖRE', [
      ['r₁ = horgony.sugár + új.sugár',
        `${sz(lepes.horgony.sugar)} + ${sz(lepes.sugar)} = <b>${sz(lepes.r1)}</b>`],
      ['ez egy TELJES kör', 'végtelen sok jelölt — ezt szűkítjük']
    ]));

    const ivSorok = lepes.tiltoIvek.map(iv => [
      iv.id,
      `D=${sz(iv.D, 5)} · irány ${iv.kozepFok.toFixed(1)}° · ` +
      `±${iv.felSzelessegFok.toFixed(1)}° → tiltja ` +
      `${iv.tolFok.toFixed(1)}°–${iv.igFok.toFixed(1)}°`
    ]);
    reszek.push(this._blokk(
      `3) TILTOTT ÍVEK — ${lepes.tiltoDarab} kör tilt, összefésülve ${lepes.osszefesultDarab} tartomány`,
      ivSorok.length ? ivSorok : [['nincs tiltó kör', 'az egész kör szabad']]
    ));

    reszek.push(this._blokk('4) SZABAD ÍVEK — ami megmaradt',
      lepes.szabadIvek.length
        ? lepes.szabadIvek.map(iv => [
            `${iv.tolFok.toFixed(1)}° – ${iv.igFok.toFixed(1)}°`,
            `szélesség ${iv.szelessegFok.toFixed(1)}°`
          ])
        : [['nincs szabad ív', '—']]
    ));

    reszek.push(this._blokk(
      `5) JELÖLTEK — a szabad ívek végpontjai (${lepes.jeloltek.length} db)`,
      lepes.jeloltek.slice(0, 8).map(j => [
        `${j.szogFok.toFixed(1)}° (${j.honnan})`,
        `középtől ${sz(j.kozeptavolsag, 5)}`
      ])
    ));

    reszek.push(this._blokk('6) VÁLASZTÁS — a középponthoz legközelebbi nyer', [
      ['szög', `${lepes.valasztott.szogFok.toFixed(1)}°`],
      ['középtől mért távolság', sz(lepes.valasztott.kozeptavolsag, 5)],
      ['végleges hely', `<b>${pont(lepes.hely)}</b>`]
    ]));

    reszek.push(lepes.utkozesek.length === 0
      ? '<div class="regi-szam__rendben">Nem ütközik senkivel — ezt a tiltott ívek garantálják.</div>'
      : this._blokk('ÜTKÖZÉS', lepes.utkozesek.map(u =>
          [u.id, `belelóg ${sz(u.hiany)} — ${szazalek(u.melyseg)}`]), 'regi-szam__blokk--hiba'));

    cel.innerHTML = reszek.join('');
    cel.scrollTop = 0;
  }

  _blokk(cim, sorok, extraOsztaly = '') {
    const tartalom = sorok
      .map(([nev, ertek]) => `<div class="regi-szam__sor"><span>${nev}</span><code>${ertek}</code></div>`)
      .join('');
    return `<div class="regi-szam__blokk ${extraOsztaly}">
      <div class="regi-szam__cim">${cim}</div>${tartalom}
    </div>`;
  }

  // ===== NÉZET =====
  _vaszonMeretezese() {
    const arany = window.devicePixelRatio || 1;
    const keret = this.vaszon.parentElement.getBoundingClientRect();

    this.szelesseg = keret.width;
    this.magassag = keret.height;
    this.vaszon.width = Math.max(1, Math.round(this.szelesseg * arany));
    this.vaszon.height = Math.max(1, Math.round(this.magassag * arany));
    this.vaszon.style.width = `${this.szelesseg}px`;
    this.vaszon.style.height = `${this.magassag}px`;
    this.rajzolo.setTransform(arany, 0, 0, arany, 0, 0);
  }

  // A nagyítást a TELJES elrendezéshez igazítjuk (nem a pillanatnyi lépéshez) —
  // így lépkedés közben nem ugrál a kép.
  _alaphelyzet() {
    let kiterjedes = 0;
    for (const h of this.eredmeny.helyek) {
      kiterjedes = Math.max(kiterjedes, Math.hypot(h.x, h.y) + h.sugar);
    }
    if (!(kiterjedes > 0)) kiterjedes = 1;

    const kisebbOldal = Math.min(this.szelesseg, this.magassag);
    this.nezet = {
      skala: (kisebbOldal * KITOLTES) / (2 * kiterjedes),
      eltolasX: this.szelesseg / 2,
      eltolasY: this.magassag / 2
    };

    this._rajzolas();
  }

  _kep(x, y) {
    return {
      x: this.nezet.eltolasX + this.nezet.skala * x,
      y: this.nezet.eltolasY + this.nezet.skala * y
    };
  }

  // ===== RAJZOLÁS =====
  _rajzolas() {
    const c = this.rajzolo;
    c.clearRect(0, 0, this.szelesseg, this.magassag);

    const lepesek = this.eredmeny.lepesek;
    const mostani = lepesek[this.lepesIndex];
    const teljes = this.lepesIndex >= lepesek.length - 1;

    // --- A már lerakott körök (a mostani lépésig bezárólag) ---
    const lathatok = lepesek.slice(0, this.lepesIndex + 1)
      .map(l => ({ id: l.id, sugar: l.sugar, x: l.hely.x, y: l.hely.y }));

    // A NAGYOKAT előbb, hogy a kicsik látszódjanak rajtuk
    const sorrend = [...lathatok].sort((a, b) => b.sugar - a.sugar);

    for (const h of sorrend) {
      const k = this._kep(h.x, h.y);
      const kepSugar = this.nezet.skala * h.sugar;
      if (kepSugar < 0.4) continue;

      const most = mostani && h.id === mostani.id;
      const utkozik = this.atfedesekLatszanak && teljes && this.atfedes.erintettIdk.has(h.id);
      const szin = most ? SZIN_UJ
        : (utkozik ? '#c0392b' : SZINEK[Number(h.id.slice(1)) % SZINEK.length]);

      c.beginPath();
      c.arc(k.x, k.y, kepSugar, 0, Math.PI * 2);
      c.fillStyle = szin;
      c.globalAlpha = most ? 0.5 : (utkozik ? 0.42 : 0.16);
      c.fill();
      c.globalAlpha = 1;
      c.strokeStyle = szin;
      c.lineWidth = most ? 2.5 : (utkozik ? 2 : 1);
      c.stroke();

      if (this.sorszamokLatszanak && kepSugar > 11) {
        c.fillStyle = '#2b2318';
        c.font = `${Math.min(14, kepSugar * 0.5).toFixed(0)}px system-ui, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(Number(h.id.slice(1))), k.x, k.y);
      }
    }

    // --- A SZERKESZTÉS: segédkörök, metszéspontok ---
    if (this.szerkesztesLatszik && !teljes && mostani) {
      if (mostani.modszer === 'ives') this._ivesSzerkesztes(mostani);
      else this._szerkesztesRajzolasa(mostani);
    }

    // A középpont jelölése — itt ül az ELSŐ (legkisebb) kör, mag nélkül
    const kozep = this._kep(0, 0);
    c.beginPath();
    c.arc(kozep.x, kozep.y, 3, 0, Math.PI * 2);
    c.fillStyle = '#2b2318';
    c.fill();
  }

  // A pozíció-számítás geometriai megjelenítése: ugyanaz, ami a jobb oldali
  // ablakban számokkal szerepel.
  _szerkesztesRajzolasa(lepes) {
    const c = this.rajzolo;

    const korRajz = (kozeppont, sugarRel, szin, szaggatott) => {
      const k = this._kep(kozeppont.x, kozeppont.y);
      c.save();
      c.beginPath();
      c.arc(k.x, k.y, this.nezet.skala * sugarRel, 0, Math.PI * 2);
      c.strokeStyle = szin;
      c.lineWidth = 1.5;
      if (szaggatott) c.setLineDash([5, 4]);
      c.stroke();
      c.restore();
    };

    const pontRajz = (p, szin, sugar, felirat) => {
      const k = this._kep(p.x, p.y);
      c.beginPath();
      c.arc(k.x, k.y, sugar, 0, Math.PI * 2);
      c.fillStyle = szin;
      c.fill();
      if (felirat) {
        c.fillStyle = szin;
        c.font = 'bold 12px system-ui, sans-serif';
        c.textAlign = 'left';
        c.textBaseline = 'bottom';
        c.fillText(felirat, k.x + 7, k.y - 5);
      }
    };

    // A horgony és a partner kiemelése
    if (lepes.horgony) {
      korRajz(lepes.horgony, lepes.horgony.sugar, SZIN_HORGONY, false);
      const k = this._kep(lepes.horgony.x, lepes.horgony.y);
      c.fillStyle = SZIN_HORGONY;
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText('horgony', k.x, k.y - this.nezet.skala * lepes.horgony.sugar - 6);
    }
    if (lepes.partner) {
      korRajz(lepes.partner, lepes.partner.sugar, SZIN_PARTNER, false);
      const k = this._kep(lepes.partner.x, lepes.partner.y);
      c.fillStyle = SZIN_PARTNER;
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText('partner', k.x, k.y - this.nezet.skala * lepes.partner.sugar - 6);
    }

    // A segédkörök: ezek metszéspontja adja a lehetséges helyeket
    if (lepes.segedkorok && lepes.horgony && lepes.partner) {
      korRajz(lepes.horgony, lepes.segedkorok.r1, SZIN_HORGONY, true);
      korRajz(lepes.partner, lepes.segedkorok.r2, SZIN_PARTNER, true);
    }

    // A két metszéspont
    if (lepes.metszes?.pontok) {
      pontRajz(lepes.metszes.pontok[0], SZIN_HORGONY, 4, 'P₁');
      pontRajz(lepes.metszes.pontok[1], SZIN_PARTNER, 4, 'P₂');
    }

    // A korrekció: az új partner és a belőle adódó két pont
    if (lepes.korrekcio?.pontok) {
      korRajz(lepes.korrekcio.ujPartner, lepes.korrekcio.ujR2, SZIN_KORREKCIO, true);
      pontRajz(lepes.korrekcio.pontok[0], SZIN_KORREKCIO, 4, 'P₁′');
      pontRajz(lepes.korrekcio.pontok[1], SZIN_KORREKCIO, 4, 'P₂′');
    }

    // A választott hely
    if (lepes.hely) pontRajz(lepes.hely, SZIN_UJ, 5, 'ide');
  }

  // ===== SZERKESZTÉS — ÍVES MÓDSZER =====
  // A lehetséges középpontok köre halványan, rajta a SZABAD szakaszok vastag
  // zölddel. Ami nem zöld, azt valamelyik szomszéd letiltotta. A narancs pontok a
  // jelöltek (a szabad ívek végpontjai), a piros a választott.
  _ivesSzerkesztes(lepes) {
    if (!lepes.horgony || !lepes.r1) return;

    const c = this.rajzolo;
    const h = this._kep(lepes.horgony.x, lepes.horgony.y);
    const R = this.nezet.skala * lepes.r1;

    // A teljes kör (a lehetséges középpontok halmaza)
    c.save();
    c.beginPath();
    c.arc(h.x, h.y, R, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(122, 111, 95, 0.45)';
    c.lineWidth = 1;
    c.setLineDash([3, 4]);
    c.stroke();
    c.restore();

    // A szabad ívek
    c.save();
    c.lineWidth = 3;
    c.strokeStyle = SZIN_PARTNER;
    for (const iv of lepes.szabadIvek) {
      c.beginPath();
      c.arc(h.x, h.y, R, (iv.tolFok * Math.PI) / 180, (iv.igFok * Math.PI) / 180);
      c.stroke();
    }
    c.restore();

    // A horgony
    c.beginPath();
    c.arc(h.x, h.y, this.nezet.skala * lepes.horgony.sugar, 0, Math.PI * 2);
    c.strokeStyle = SZIN_HORGONY;
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = SZIN_HORGONY;
    c.font = 'bold 11px system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText('horgony', h.x, h.y - this.nezet.skala * lepes.horgony.sugar - 6);

    // A jelöltek
    for (const j of lepes.jeloltek.slice(0, 14)) {
      const k = this._kep(j.x, j.y);
      c.beginPath();
      c.arc(k.x, k.y, 3.5, 0, Math.PI * 2);
      c.fillStyle = SZIN_KORREKCIO;
      c.fill();
    }

    // A választott
    if (lepes.hely) {
      const k = this._kep(lepes.hely.x, lepes.hely.y);
      c.beginPath();
      c.arc(k.x, k.y, 5, 0, Math.PI * 2);
      c.fillStyle = SZIN_UJ;
      c.fill();
      c.font = 'bold 12px system-ui, sans-serif';
      c.textAlign = 'left';
      c.fillText('ide', k.x + 7, k.y - 5);
    }
  }

  // ===== LÉPKEDÉS =====
  _lepesCsuszkaFrissitese() {
    const csuszka = document.getElementById('regi-lepes');
    csuszka.max = String(this.eredmeny.lepesek.length);
    csuszka.value = String(this.lepesIndex + 1);
    document.getElementById('regi-lepes-ertek').textContent =
      `${this.lepesIndex + 1} / ${this.eredmeny.lepesek.length}`;
  }

  _lepesre(index) {
    const utolso = this.eredmeny.lepesek.length - 1;
    this.lepesIndex = Math.max(0, Math.min(utolso, index));
    this._lepesCsuszkaFrissitese();
    this._szamitasFrissitese();
    this._rajzolas();
  }

  _lejatszasIndul() {
    if (this._lejatszas) { this._lejatszasLeallitasa(); return; }

    document.getElementById('regi-lejatszas').textContent = '⏸ Szünet';
    this._lejatszas = setInterval(() => {
      if (this.lepesIndex >= this.eredmeny.lepesek.length - 1) {
        this._lejatszasLeallitasa();
        return;
      }
      this._lepesre(this.lepesIndex + 1);
    }, LEJATSZAS_UTEM);
  }

  _lejatszasLeallitasa() {
    if (!this._lejatszas) return;
    clearInterval(this._lejatszas);
    this._lejatszas = null;
    const gomb = document.getElementById('regi-lejatszas');
    if (gomb) gomb.textContent = '▶ Lejátszás';
  }

  // ===== VEZÉRLŐK =====
  _vezerlokBekotese() {
    const csuszka = document.getElementById('regi-darab');
    const kiiras = document.getElementById('regi-darab-ertek');

    csuszka.value = String(this.darab);
    kiiras.textContent = String(this.darab);

    csuszka.addEventListener('input', () => {
      this.darab = Number(csuszka.value);
      kiiras.textContent = String(this.darab);
    });
    csuszka.addEventListener('change', () => this._ujraszamolas());

    document.getElementById('regi-modszer').addEventListener('change', (e) => {
      this.modszer = e.target.value;
      this._ujraszamolas();
    });

    document.getElementById('regi-eloszlas').addEventListener('change', (e) => {
      this.eloszlas = e.target.value;
      this._ujraszamolas();
    });

    const ugrasCsuszka = document.getElementById('regi-ugras');
    const ugrasKiiras = document.getElementById('regi-ugras-ertek');
    ugrasCsuszka.value = String(this.ugras);
    ugrasKiiras.textContent = this.ugras.toFixed(2);
    ugrasCsuszka.addEventListener('input', () => {
      this.ugras = Number(ugrasCsuszka.value);
      ugrasKiiras.textContent = this.ugras.toFixed(2);
    });
    ugrasCsuszka.addEventListener('change', () => this._ujraszamolas());

    document.getElementById('regi-atfedes').addEventListener('change', (e) => {
      this.atfedesekLatszanak = e.target.checked;
      this._rajzolas();
    });

    document.getElementById('regi-sorszam').addEventListener('change', (e) => {
      this.sorszamokLatszanak = e.target.checked;
      this._rajzolas();
    });

    document.getElementById('regi-szerkesztes').addEventListener('change', (e) => {
      this.szerkesztesLatszik = e.target.checked;
      this._rajzolas();
    });

    document.getElementById('regi-ujra').addEventListener('click', () => this._ujraszamolas());
    document.getElementById('regi-illeszt').addEventListener('click', () => this._alaphelyzet());

    // --- lépkedés ---
    document.getElementById('regi-lepes').addEventListener('input', (e) => {
      this._lejatszasLeallitasa();
      this._lepesre(Number(e.target.value) - 1);
    });
    document.getElementById('regi-elso').addEventListener('click', () => {
      this._lejatszasLeallitasa(); this._lepesre(0);
    });
    document.getElementById('regi-elozo').addEventListener('click', () => {
      this._lejatszasLeallitasa(); this._lepesre(this.lepesIndex - 1);
    });
    document.getElementById('regi-kovetkezo').addEventListener('click', () => {
      this._lejatszasLeallitasa(); this._lepesre(this.lepesIndex + 1);
    });
    document.getElementById('regi-utolso').addEventListener('click', () => {
      this._lejatszasLeallitasa(); this._lepesre(this.eredmeny.lepesek.length - 1);
    });
    document.getElementById('regi-lejatszas').addEventListener('click', () => this._lejatszasIndul());

    // Nyilakkal is lehet lépkedni
    window.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === 'ArrowRight') { this._lejatszasLeallitasa(); this._lepesre(this.lepesIndex + 1); }
      if (e.key === 'ArrowLeft')  { this._lejatszasLeallitasa(); this._lepesre(this.lepesIndex - 1); }
    });
  }

  _esemenyekBekotese() {
    this.vaszon.addEventListener('wheel', (e) => {
      e.preventDefault();
      const szorzo = e.deltaY < 0 ? ZOOM_LEPES : 1 / ZOOM_LEPES;
      const keret = this.vaszon.getBoundingClientRect();
      const kx = e.clientX - keret.left;
      const ky = e.clientY - keret.top;

      this.nezet.skala *= szorzo;
      this.nezet.eltolasX = kx - (kx - this.nezet.eltolasX) * szorzo;
      this.nezet.eltolasY = ky - (ky - this.nezet.eltolasY) * szorzo;
      this._rajzolas();
    }, { passive: false });

    this.vaszon.addEventListener('pointerdown', (e) => {
      this._huzasAktiv = true;
      this._huzasKezdet = {
        x: e.clientX, y: e.clientY,
        eltolasX: this.nezet.eltolasX, eltolasY: this.nezet.eltolasY
      };
      this.vaszon.setPointerCapture(e.pointerId);
    });

    this.vaszon.addEventListener('pointermove', (e) => {
      if (!this._huzasAktiv) return;
      this.nezet.eltolasX = this._huzasKezdet.eltolasX + (e.clientX - this._huzasKezdet.x);
      this.nezet.eltolasY = this._huzasKezdet.eltolasY + (e.clientY - this._huzasKezdet.y);
      this._rajzolas();
    });

    const vege = () => { this._huzasAktiv = false; };
    this.vaszon.addEventListener('pointerup', vege);
    this.vaszon.addEventListener('pointercancel', vege);
  }
}

// ===== INDÍTÁS =====
const oldal = new RegiPakolasTesztOldal();
oldal.init();
