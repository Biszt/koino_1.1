// koino/meres/lepcsoMeres.js

// Felelősség: A 65. MÉRÉS — A 2. LÉPCSŐ BIZONYÍTÉKA (D93/4, az E4 — „előbb a mérés”): mekkora annak a bizonyítéka,
// hogy valaki 2. lépcsős (D11, D56: a pénztárca kapuja), és hogyan nő a koinó méretével?
//
// A szabály (`identitas.js`): 2. LÉPCSŐS, akinek 3 tanúsítása van KÜLÖNBÖZŐ, felhatalmazott tanúsítóktól; TANÚSÍTHAT,
// aki 2. lépcsős ÉS N felhatalmazása van különböző 2. lépcsősöktől (emberenként egyet adhat — D57/b, D60); a tanúsítás
// BEMONDJA, mely felhatalmazásokra támaszkodott (D47). A gyökér az alapító kör. ⭐ Tehát a bizonyíték nem egy lánc (mint a
// tagságé — 63. mérés), hanem egy ŐS-HÁLÓ zárványa: X 3 tanúsítása → a tanúsítók N–N felhatalmazása → a felhatalmazók
// tanúsításai → … az alapítókig (a tanúsító SAJÁT 2. lépcsője nem kell — D47). Itt nincs választás: minden lépcsőn
// pontosan a szükséges számú állítás van.
//
// A modell (szimuláció, aláírás nélkül — a darabszám a kérdés; egy esemény ~0,9–1,2 KB, a 64. mérés szerint):
//   · F0 alapító (tanúsíthat, és egymást tanúsítják);
//   · az új 2. lépcsős 3 különböző tanúsítót kap a mostaniak közül — 'egyenletes' (véletlen) vagy 'helyi' (a legutóbb
//     tanúsítóvá váltak közül: a közösség a közeli, friss tanúsítókhoz fordul — a lánc-szerű, legmélyebb eset);
//   · és az egyetlen felhatalmazását odaadja valakinek (aki már kapott, nagyobb eséllyel kap — a bizalom koncentrálódik);
//     aki eléri az N-t, tanúsító lesz (a tanúsításai a tanúsítóvá válásakor kapott N felhatalmazást mondják be).
//
// ⚠️ NEM ÖNPRÓBA (számokat ad).   node koino/meres/lepcsoMeres.js [N] [F0]

const kiir = (s) => process.stdout.write(s + '\n');
const N_KELL = Number(process.argv[2] ?? 5);
const F0 = Number(process.argv[3] ?? 7);
const TANUSITAS_KELL = 3;
const ESEMENY_KB = 1.0;

function veletlenGyar(mag) {
  let t = mag >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A 2. lépcső felépülése `meret` főig. Személyenként: a tanúsítói (3), és ha tanúsító lett, a felhatalmazói (N).
 * @returns {{tanusitok: Int32Array[], felhatalmazok: Map<number, number[]>, alapito: (i)=>boolean}}
 */
function felepites(meret, mod, v) {
  const tanusitoi = new Array(meret);          // i → [3 tanúsító]
  const felhatalmazoi = new Map();             // tanúsító → [N felhatalmazó] (a tanúsítóvá váláskor)
  const kapott = new Map();                    // jelölt → [felhatalmazók eddig]
  const tanusitoLista = [];                    // a tanúsítók, a tanúsítóvá válás sorrendjében
  // A bizalom koncentrálódik: a felhatalmazás egy SÚLYOZOTT sorsolással megy (a kapott felhatalmazások száma + 1).
  const urna = [];                             // jelöltek, annyiszor, ahány felhatalmazást kaptak (+1 alapból)
  for (let i = 0; i < F0; i++) {
    tanusitoi[i] = [];
    tanusitoLista.push(i);
  }
  for (let i = F0; i < meret; i++) {
    // 3 különböző tanúsító
    const t = new Set();
    while (t.size < Math.min(TANUSITAS_KELL, tanusitoLista.length)) {
      const n = tanusitoLista.length;
      const idx = mod === 'helyi'
        ? n - 1 - Math.floor(v() * Math.min(n, 20))              // a legutóbbi 20 tanúsító közül
        : Math.floor(v() * n);
      t.add(tanusitoLista[idx]);
    }
    tanusitoi[i] = [...t];
    // az egyetlen felhatalmazása — egy (már 2. lépcsős, még nem tanúsító) jelöltnek
    urna.push(i);                              // ő maga is jelölt lesz (+1 súly)
    let jelolt = -1;
    for (let proba = 0; proba < 20; proba++) {
      const j = urna[Math.floor(v() * urna.length)];
      if (j !== i && !felhatalmazoi.has(j) && !(kapott.get(j) ?? []).includes(i)) { jelolt = j; break; }
    }
    if (jelolt < 0) continue;
    const l = kapott.get(jelolt) ?? [];
    l.push(i);
    kapott.set(jelolt, l);
    urna.push(jelolt);
    if (l.length >= N_KELL) {
      felhatalmazoi.set(jelolt, l.slice(0, N_KELL));
      kapott.delete(jelolt);
      tanusitoLista.push(jelolt);
    }
  }
  return { tanusitoi, felhatalmazoi, tanusitokSzama: tanusitoLista.length };
}

/** X bizonyítékának zárványa: a benne szereplő személyek, és belőle az események száma. */
function zarvany(fel, x) {
  const latott = new Set([x]);
  const verem = [x];
  let tanusitas = 0, felhatalmazas = 0, tanusitokBenne = new Set();
  const horgonyok = new Set([x]);   // akinek a horgonya kell (a tanúsítóké is), de nem mindenkit kell kibontani
  while (verem.length) {
    const p = verem.pop();
    for (const t of fel.tanusitoi[p]) {
      tanusitas++;
      horgonyok.add(t);
      if (!tanusitokBenne.has(t)) {
        tanusitokBenne.add(t);
        // ⚠️ A tanúsítás jogát a bemondott felhatalmazások adják (D47) — a tanúsító SAJÁT 2. lépcsője nem kell.
        for (const f of fel.felhatalmazoi.get(t) ?? []) {
          felhatalmazas++;
          horgonyok.add(f);
          if (!latott.has(f)) { latott.add(f); verem.push(f); }
        }
      }
    }
  }
  // események: a horgonyok + a tanúsítások + a bemondott felhatalmazások
  return { szemely: horgonyok.size, esemeny: horgonyok.size + tanusitas + felhatalmazas };
}

/**
 * A KORLÁTOZOTT MÉLYSÉGŰ ellenőrzés: csak `D` szintig nézünk (1. szint: X 3 tanúsítása és a tanúsítók N–N felhatalmazása;
 * a 2. szint ugyanez a felhatalmazókra és a tanúsítókra; …), a mélyebb szintek bemondások. Az események száma.
 */
function korlatos(fel, x, D) {
  let szint = [x];
  const latott = new Set([x]);
  const tanusitokLatva = new Set();
  let esemeny = 1;
  for (let d = 1; d <= D && szint.length; d++) {
    const kov = [];
    for (const p of szint) {
      for (const t of fel.tanusitoi[p]) {
        esemeny++;                                    // a tanúsítás
        if (!tanusitokLatva.has(t)) {
          tanusitokLatva.add(t);
          esemeny++;                                  // a tanúsító horgonya
          for (const f of fel.felhatalmazoi.get(t) ?? []) {
            esemeny++;                                // a felhatalmazás
            if (!latott.has(f)) { latott.add(f); esemeny++; kov.push(f); }
          }
        }
      }
    }
    szint = kov;
  }
  return esemeny;
}

/**
 * A SZÚRÓPRÓBA (a D92/5 mintája): egy véletlen út X-től az alapítókig — minden lépésen az aktuális ember egy véletlen
 * tanúsítója, és annak egy véletlen felhatalmazója (a tanúsítás jogát a bemondott felhatalmazások adják — D47; a
 * tanúsító SAJÁT 2. lépcsője nem feltétele, `identitas.js`: `tanusitoJoga`). Egy lépésen ellenőrzött események: az
 * ember 3 tanúsítása és a tanúsítók horgonyai, a választott tanúsító N felhatalmazása és a felhatalmazók horgonyai
 * (2N + 6). Az út hossza a kérdés.
 */
function setaHossz(fel, x, v) {
  let p = x, hossz = 0;
  while (fel.tanusitoi[p].length && hossz < 100000) {
    const t = fel.tanusitoi[p][Math.floor(v() * fel.tanusitoi[p].length)];
    const f = fel.felhatalmazoi.get(t) ?? [];
    hossz++;
    if (!f.length) break;                        // alapító tanúsító: az út célba ért
    p = f[Math.floor(v() * f.length)];
  }
  return hossz;
}

kiir('A 65. MÉRÉS — a 2. lépcső bizonyítéka (N = ' + N_KELL + ' felhatalmazás, 3 tanúsítás, ' + F0 + ' alapító)');
kiir('');
const korlatosSorok = [];
const setaSorok = [];
const setak = [];
kiir('  méret      mód          tanúsító   a bizonyíték: személy (átlag / max) · esemény (átlag) · ~KB · a méret %-a');
for (const meret of [1000, 10000, 100000, 1000000]) {
  for (const mod of ['egyenletes', 'helyi']) {
    const v = veletlenGyar(meret * 7 + (mod === 'helyi' ? 1 : 0));
    const fel = felepites(meret, mod, v);
    const minta = meret >= 1000000 ? 8 : (meret >= 100000 ? 20 : 50);
    let ossz = 0, osszE = 0, max = 0;
    const kor = [0, 0, 0, 0];
    for (let k = 0; k < minta; k++) {
      // a legutóbbiak közül (a legmélyebbek — a legrosszabb eset)
      const x = meret - 1 - Math.floor(v() * Math.min(meret / 10, 1000));
      const z = zarvany(fel, x);
      ossz += z.szemely; osszE += z.esemeny; max = Math.max(max, z.szemely);
      for (const D of [1, 2, 3]) kor[D] += korlatos(fel, x, D);
      for (let s = 0; s < 8; s++) { const h = setaHossz(fel, x, v); setak.push(h); }
    }
    setak.sort((a, b) => a - b);
    const setaAtl = setak.reduce((a, b) => a + b, 0) / setak.length;
    setaSorok.push('  ' + String(meret).padEnd(10) + ' ' + mod.padEnd(12) + setaAtl.toFixed(1).padStart(8)
      + String(setak[Math.floor(setak.length * 0.95)]).padStart(8) + String(setak[setak.length - 1]).padStart(8)
      + '   8 út ≈ ' + (8 * setaAtl * (2 * N_KELL + 6)).toFixed(0).padStart(7) + ' esemény');
    setak.length = 0;
    korlatosSorok.push('  ' + String(meret).padEnd(10) + ' ' + mod.padEnd(12)
      + [1, 2, 3].map((D) => (kor[D] / minta).toFixed(0).padStart(8) + ' esemény').join('   '));
    const atl = ossz / minta, atlE = osszE / minta;
    kiir('  ' + String(meret).padEnd(10) + ' ' + mod.padEnd(12) + String(fel.tanusitokSzama).padStart(8) + '   '
      + atl.toFixed(0).padStart(9) + ' / ' + String(max).padStart(7) + ' · ' + atlE.toFixed(0).padStart(9)
      + ' · ' + (atlE * ESEMENY_KB).toFixed(0).padStart(8) + ' · ' + (100 * atl / meret).toFixed(1) + '%');
  }
}
kiir('');
kiir('  (a bizonyíték a zárvány: minden benne szereplő ember horgonya, 3 tanúsítása, és a tanúsítók N felhatalmazása)');
kiir('');
kiir('  KORLÁTOZOTT MÉLYSÉG — csak D szintig ellenőrzünk, a mélyebb szint bemondás (átlag, esemény ≈ KB):');
kiir('  méret      mód              D = 1              D = 2              D = 3');
for (const sor of korlatosSorok) kiir(sor);
kiir('');
kiir('  SZÚRÓPRÓBA — egy véletlen út hossza az alapítókig (lépés; átlag / 95% / max), és 8 út ellenőrzött eseménye:');
for (const sor of setaSorok) kiir(sor);
