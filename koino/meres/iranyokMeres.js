// koino/meres/iranyokMeres.js — EGY CSERE ABLAKONKÉNT: LASSÍTJA-E A HÍR TERJEDÉSÉT? (47. mérés)

// ⚠️ EZ NEM ÖNPRÓBA: nem igen/nem-et ad, hanem SZÁMOKAT.
//
// ===== A KÉRDÉS (D71 (iii), 2026-09-26) =====
//
// A 45. mérés szerint két készülék között ablakonként KÉT csere megy — mindkét fél a saját
// körében hív, és terepen a két kör soha nem esik egybe (a két óra ~1–2 mp-cel eltér). A D71
// (iii) javaslata: *„ha ebben az ablakban már beszéltünk vele, bárki kezdte, a saját körünk
// kihagyja"*. ⛔ Csaba döntése: **csak a mérés után** — mert a második csere elhozhatja, amit a
// másik a két kör között tudott meg, és a 30. mérés szerint az ablakon belüli ISMÉTLÉS teszi
// gyorssá a terjedést (az igazítással együtt ×30).
//
// ===== A HÁROM VÁLTOZAT =====
//
//   · MA — minden kör minden társát hívja (ha épp fut vele csere, ahhoz csatlakozik); az ismételt
//     menet azokat hívja újra, akikkel az előző menet sikerült, amíg van újdonság.
//   · V1 (szó szerint) — ha a társsal ebben az ablakban már volt csere, a kör kihagyja. ⚠️ Ez az
//     ismételt meneteket is kiüti: azokkal már mind volt csere.
//   · V2 (finomítva) — csak akkor hagyjuk ki, ha ebben az ablakban már volt csere vele, ÉS AZÓTA
//     NEM TUDTUNK MEG SEMMI ÚJAT (nincs mit mondanunk). ⭐ Az ismételt menet itt nem „akivel az
//     előbb sikerült", hanem „akinek van mit mondanom" — különben egy kihagyott társ a menet
//     közben érkezett hírt nem kapná meg.
//   · V3 (+ továbbadás) — a V2, és AKI ÚJAT TANUL (bármilyen cserében, a kapuja szolgálta ki is),
//     az épp nincs menete, maga indít egyet azokhoz, akiknek van mit mondania — még az ablakon
//     belül, NAT-biztosan (csak akivel ebben az ablakban már volt csere: a rés hozzá nyitva).
//     ⭐ Ez a mérés közben derült ki: a mai kód csak akkor ismétel, ha a kör SAJÁT cseréi hoztak
//     újat — amit a kapu egy bekopogótól tanul a kör vége után, az a következő ablakig vár.
//
// ⚠️ A PILLANATKÉP („mit tud már a társ tőlem") a csere KEZDETI állapota — kivéve, ha épp tőle
// tanultam. *Az első változat a csere VÉGÉN rögzítette, és ha közben mástól tanultam, azt hitte,
// a társ azt is tudja: a V2 így lassabbnak látszott a mainál. A valódi építésnél ugyanez a csapda.*
//
// ===== A MODELL =====
//
// N készülék, mindegyiknek K kötése (kölcsönösek — a kötés mindkét oldalon a cseréből születik).
// Mindenki a SAJÁT órája szerinti ablak-határon kezdi a körét; az órák 0…S ms-mal csúsznak. Egy
// csere D1…D2 ms-ig tart, és a VÉGÉN mindkét fél megkapja, amit a másik a KEZDETÉN tudott. Egy
// pár között egyszerre egy csere fut (FOGLALT) — aki közben hívná, csatlakozik hozzá. Egy
// készülék csak a SAJÁT körében kezdeményez (a kapuja közben bárkit kiszolgál). A hír a 0.
// ablak előtt születik egy véletlen készüléken.
//
// ⚠️ AMIT SZÁNDÉKOSAN NEM MODELLEZ: a hálózati hibát, a néma kötést, a NAT-ot, a tábla-olvasást —
// azokat a terepmérések és a `buliMeres.js` nézik. *Egy műszer, egy kérdés: az IRÁNYOK.*
//
//   node koino/meres/iranyokMeres.js                       → az alap-készlet
//   node koino/meres/iranyokMeres.js 1000 3 2000 20        → N, K, csúszás (ms), futások

const kiir = (sz = '') => process.stdout.write(String(sz) + String.fromCharCode(10));

// ===================================
// MAGVAS VÉLETLEN — hogy a futások összevethetők legyenek
// ===================================

function magvasVeletlen(mag) {
  let a = mag >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===================================
// ESEMÉNYSOR — egy egyszerű bináris kupac (idő szerint)
// ===================================

function esemenySor() {
  const h = [];
  let sorszam = 0;
  const kisebb = (x, y) => x.t < y.t || (x.t === y.t && x.s < y.s);
  return {
    tesz(t, fn) {
      h.push({ t, s: sorszam++, fn });
      let i = h.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (!kisebb(h[i], h[p])) break;
        [h[i], h[p]] = [h[p], h[i]];
        i = p;
      }
    },
    vesz() {
      const elso = h[0];
      const utolso = h.pop();
      if (h.length) {
        h[0] = utolso;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < h.length && kisebb(h[l], h[m])) m = l;
          if (r < h.length && kisebb(h[r], h[m])) m = r;
          if (m === i) break;
          [h[i], h[m]] = [h[m], h[i]];
          i = m;
        }
      }
      return elso;
    },
    ures: () => h.length === 0
  };
}

// ===================================
// EGY LEJÁTSZÁS
// ===================================

/**
 * @param {'ma'|'v1'|'v2'|'v3'} valtozat
 * @param {boolean} hirrel - van-e hír (a terjedés), vagy csak az állandósult forgalom
 * @returns {{mindenki: number|null, cserek: number, parAblakok: number}}
 */
function lejatszas({ n, k, ablak, csuszas, d1, d2, maxAblak, valtozat, hirrel, mag }) {
  const veletlen = magvasVeletlen(mag);

  // ----- A HÁLÓZAT: mindenki legalább K kötéssel, kölcsönösen -----
  const szomszed = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n; i++) {
    while (szomszed[i].size < Math.min(k, n - 1)) {
      const j = Math.floor(veletlen() * n);
      if (j !== i) { szomszed[i].add(j); szomszed[j].add(i); }
    }
  }
  const nb = szomszed.map((s) => [...s]);
  const elekSzama = nb.reduce((o, s) => o + s.length, 0) / 2;

  // ----- ÁLLAPOT -----
  const tud = new Array(n).fill(false);
  const verzio = new Array(n).fill(0);           // hányszor tanult újat (a „lenyomat" utánzata)
  const eltolas = Array.from({ length: n }, () => veletlen() * csuszas);
  const par = (a, b) => (a < b ? a * n + b : b * n + a);
  const fut = new Map();                         // pár → a futó csere
  const utolsoVeg = new Map();                   // pár → az utolsó csere vége
  const pillanatkep = new Map();                 // i*n+j → i verziója az utolsó i–j csere végén
  let cserek = 0;
  let mindenkiTudja = null;
  let tudokSzama = 0;

  const sor = esemenySor();

  if (hirrel) {
    const forras = Math.floor(veletlen() * n);
    tud[forras] = true; verzio[forras]++; tudokSzama = 1;
  }

  /** Friss-e a csere a párral (ebben az ablakban)? — fél ablaknyi tűréssel a két óra miatt. */
  const friss = (i, j, korKezdet) => (utolsoVeg.get(par(i, j)) ?? -Infinity) >= korKezdet - ablak / 2;
  const vanMitMondani = (i, j) => pillanatkep.get(i * n + j) !== verzio[i];

  const menetben = new Array(n).fill(false);

  function csereIndul(a, b, t, menet) {
    const kulcs = par(a, b);
    const cs = { a, b, ta: tud[a], tb: tud[b], va: verzio[a], vb: verzio[b], varok: [menet] };
    fut.set(kulcs, cs);
    cserek++;
    sor.tesz(t + d1 + veletlen() * (d2 - d1), (most) => {
      fut.delete(kulcs);
      const tanult = new Set();
      for (const [x, masikTudta] of [[a, cs.tb], [b, cs.ta]]) {
        if (masikTudta && !tud[x]) {
          tud[x] = true; verzio[x]++; tudokSzama++; tanult.add(x);
          if (tudokSzama === n && mindenkiTudja === null) mindenkiTudja = most;
        }
      }
      utolsoVeg.set(kulcs, most);
      // ⚠️ A PILLANATKÉP: amit a társ tőlem TUD — a csere a KEZDETI állapotot vitte át, tehát a kezdeti
      // verzióm; kivéve, ha épp tőle tanultam (akkor az új tudásomat ő adta). *Az első változat a
      // csere VÉGÉN rögzítette: ha közben MÁSTÓL tanultam, azt hitte, a társ azt is tudja.*
      pillanatkep.set(a * n + b, tanult.has(a) ? verzio[a] : cs.va);
      pillanatkep.set(b * n + a, tanult.has(b) ? verzio[b] : cs.vb);
      for (const m of cs.varok) m.kesz(b === m.i ? a : b, most, tanult.has(m.i));
      // ⭐ V3: aki újat tanult (bármilyen cserében — a kapuja kiszolgálta is), és épp nincs menete,
      // az maga indít egyet azokhoz, akiknek van mit mondania — még ebben az ablakban.
      if (valtozat === 'v3') {
        for (const x of tanult) {
          if (menetben[x]) continue;
          const w = Math.floor((most - eltolas[x]) / ablak);
          const kezdet = w * ablak + eltolas[x];
          // ⚠️ NAT-BIZTOSAN: csak akivel ebben az ablakban már volt csere — a rés hozzá nyitva
          // (36/d: a mobil NAT az idegent nem engedi be). Mérve: ugyanolyan gyors, mint bárkinek.
          const celok = nb[x].filter((j) => vanMitMondani(x, j) && friss(x, j, kezdet));
          if (w >= 0 && celok.length) menetInditasa(x, celok, most, { kezdet, vege: kezdet + ablak });
        }
      }
    });
  }

  function menetInditasa(i, celok, t, kor) {
    const menet = {
      i, hatra: 0, sikeresek: [], tanult: false,
      kesz(j, most, tanult) {
        this.sikeresek.push(j);
        this.tanult = this.tanult || tanult;
        if (--this.hatra === 0) menetVege(this, most, kor);
      }
    };
    for (const j of celok) {
      const futo = fut.get(par(i, j));
      if (futo) { futo.varok.push(menet); menet.hatra++; continue; }
      const f = friss(i, j, kor.kezdet);
      if (valtozat === 'v1' && f) continue;
      if ((valtozat === 'v2' || valtozat === 'v3') && f && !vanMitMondani(i, j)) continue;
      menet.hatra++;
      csereIndul(i, j, t, menet);
    }
    if (menet.hatra === 0) { menetVege(menet, t, kor); return; }
    menetben[i] = true;
  }

  function menetVege(menet, most, kor) {
    const i = menet.i;
    menetben[i] = false;
    if (most >= kor.vege) return;
    if (valtozat === 'v2' || valtozat === 'v3') {
      // ⭐ „akinek van mit mondanom": akivel ebben az ablakban beszéltünk, de azóta tanultam újat.
      const celok = nb[i].filter((j) => vanMitMondani(i, j) && friss(i, j, kor.kezdet));
      if (celok.length) menetInditasa(i, celok, most, kor);
      return;
    }
    // MA és V1: újra azok, akikkel ez a menet sikerült — ha a menet SAJÁT cseréi hoztak újat
    // (a kódban: az eredmények `uj` összege).
    if (menet.tanult && menet.sikeresek.length) menetInditasa(i, menet.sikeresek, most, kor);
  }

  for (let w = 0; w < maxAblak; w++) {
    for (let i = 0; i < n; i++) {
      const kezdet = w * ablak + eltolas[i];
      sor.tesz(kezdet, (most) => {
        if (hirrel && mindenkiTudja !== null) return;
        menetInditasa(i, nb[i], most, { kezdet, vege: kezdet + ablak });
      });
    }
  }
  while (!sor.ures()) {
    const e = sor.vesz();
    e.fn(e.t);
    if (hirrel && mindenkiTudja !== null) break;
  }

  return { mindenki: mindenkiTudja, cserek, parAblakok: elekSzama * maxAblak };
}

// ===================================
// A MÉRÉS
// ===================================

const median = (t) => { const s = [...t].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const p90 = (t) => { const s = [...t].sort((a, b) => a - b); return s[Math.floor(s.length * 0.9)]; };

function sorozat({ n, k, csuszas, futasok }) {
  const alap = { n, k, ablak: 60000, csuszas, d1: 300, d2: 1500, maxAblak: 60 };
  kiir('N=' + n + ' · K=' + k + ' · csúszás 0…' + csuszas + ' ms · csere 300–1500 ms · ablak 60 mp · '
    + futasok + ' futás');
  for (const valtozat of ['ma', 'v1', 'v2', 'v3']) {
    const idok = [];
    let elakadt = 0;
    for (let f = 0; f < futasok; f++) {
      const e = lejatszas({ ...alap, valtozat, hirrel: true, mag: 1000 + f });
      if (e.mindenki === null) elakadt++; else idok.push(e.mindenki / 1000);
    }
    // Az állandósult forgalom: 5 ablak hír nélkül — hány csere megy páronként, ablakonként?
    let cs = 0, pa = 0;
    for (let f = 0; f < Math.min(futasok, 5); f++) {
      const e = lejatszas({ ...alap, maxAblak: 5, valtozat, hirrel: false, mag: 5000 + f });
      cs += e.cserek; pa += e.parAblakok;
    }
    const nev = { ma: 'MA', v1: 'V1 (szó szerint)', v2: 'V2 (finomítva)', v3: 'V3 (+ továbbadás)' }[valtozat];
    const ido = idok.length
      ? 'a hír mindenkihez: medián ' + median(idok).toFixed(1) + ' mp, p90 ' + p90(idok).toFixed(1) + ' mp'
        + ' (' + (p90(idok) / 60).toFixed(1) + ' ablak)'
      : 'a hír SOHA nem ért mindenkihez';
    kiir('  ' + nev.padEnd(18) + ido + (elakadt ? ' · ⚠ ' + elakadt + ' futásban 60 ablak alatt sem' : '')
      + ' · csend: ' + (cs / pa).toFixed(2) + ' csere/pár/ablak');
  }
  kiir();
}

const [nArg, kArg, csArg, fArg] = process.argv.slice(2).map(Number);
kiir('EGY CSERE ABLAKONKÉNT — lassítja-e a hír terjedését? (D71 (iii), 47. mérés)');
kiir();
if (nArg) {
  sorozat({ n: nArg, k: kArg || 3, csuszas: Number.isFinite(csArg) ? csArg : 2000, futasok: fArg || 20 });
} else {
  for (const n of [50, 300, 1000]) sorozat({ n, k: 3, csuszas: 2000, futasok: 20 });
  sorozat({ n: 1000, k: 5, csuszas: 2000, futasok: 20 });
  sorozat({ n: 1000, k: 3, csuszas: 0, futasok: 20 });
}
