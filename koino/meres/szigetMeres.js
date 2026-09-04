// koino/meres/szigetMeres.js

// Felelősség: MEGMÉRNI, MENNYIRE VÉD EGY BELÉPTETŐ SZABÁLY — a Szakasz 4 első kódja.
// Terv: [`docs/szakasz4_terv.md`](../../docs/szakasz4_terv.md), 10. szakasz.
//
// ===== MIÉRT KELL EZ, ÉS MIÉRT MOST =====
//
// A Szakasz 4 tervezése alatt KÉT állítás bukott meg — és mindkettőt a SZÁMOLÁS buktatta
// ki, nem a megérzés:
//
//   1. „a növekedés önfinanszírozó" — nem az: megmaradó keretnél a közösség
//      bizonyíthatóan nem tud nőni (szakasz4_terv 5.1);
//   2. „az elismerés legyen ingyenes, ha a tanúnak van kerete" (D48) — a hamis szigetet
//      ugyanúgy táplálja, és nem lejtőn, hanem SZIKLÁN (5.1/c).
//
// ⛔ Ebből az általános eredmény: **a gazdaság önmagában nem lehet a védelem, mert a
// számtan nem látja a különbséget valódi és hamis ember között.** A harmadik javaslat
// (horgony + táguló kör + több találkozó) már túl összetett ahhoz, hogy fejben
// ellenőrizzük. Ezért mérünk.
//
// ===== EZ NEM ÖNPRÓBA =====
//
// A `mind.js` próbái igen/nem választ adnak; ez SZÁMOKAT ad — mint a `skalaMeres.js`.
// Ezért külön belépő, és szándékosan NEM kerül a `mind.js`-be.
//
//   node koino/meres/szigetMeres.js              → a teljes összevetés
//   node koino/meres/szigetMeres.js 7            → más véletlen-mag (ismételhetőség)
//
// ===== ⭐ AMIT A SZIMULÁTORNAK ELŐSZÖR BIZONYÍTANIA KELL =====
//
// Mielőtt bármit elhinnénk neki arról, amit NEM tudunk, meg kell mutatnia azt, amit MÁR
// TUDUNK: az „A" szabálynak el kell szállnia, a „B"-nek meg kell fagynia. Ha ezt a kettőt
// nem reprodukálja, a szimulátor rossz, és nem a szabályok.
//
// ===== ⚠️ KÉT SZÁMOT MÉRÜNK, SOHA CSAK EGYET =====
//
// A tegnapi tanulság: egy védelmi próba EGYEDÜL átment volna úgy is, hogy közben a koino
// növekedésképtelen. Ezért minden szabálynál egyszerre nézzük:
//
//   · hány VALÓDI ember jutott be  (nő-e egyáltalán a közösség?)
//   · hány HAMIS azonosság jutott be  (véd-e?)
//
// ===== AMIT EZ A MODELL NEM MODELLEZ (őszintén) =====
//
// · Nincs benne kulcs, aláírás, esemény, hálózat — ez GRÁF-kísérlet, nem koino-kísérlet.
//   A valódi megvalósításban minden tanúsítás aláírt esemény lesz.
// · A „találkozó" itt annyi, hogy egy csoport tagjai kölcsönösen tanúsítják egymást.
// · A diszjunkt utakat MOHÓN számoljuk (alsó korlát) — ⭐ és ez szándékos: a valódi
//   koinóban is a JELENTKEZŐ mutat fel `k` utat, nem a maximumot keresi valaki (D43).

import { kiir } from './naplo.js';

// ===================================
// VÉLETLEN — magból, hogy ismételhető legyen
// ===================================

/**
 * Egyszerű, magvetett álvéletlen (nulla függőség, 6. szabály).
 * Ugyanaz a mag MINDIG ugyanazt a világot adja — enélkül a mérés nem összevethető.
 */
function veletlenGenerator(mag) {
  let a = mag >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===================================
// A VILÁG
// ===================================
//
// Az emberek egy KÖRÖN helyezkednek el (0..N-1) — ez a „földrajz". Egy találkozóra
// egymáshoz közeliek jönnek össze. Enélkül a gráf egyenletes kása lenne, és pont azt nem
// tudnánk megmérni, ami a horgony-körnél a kérdés: TÁGUL-E, vagy megreked.

const BEALLITAS = {
  valodiEmberek: 1500,      // ennyi valódi ember létezhet összesen
  alapitok: 20,             // az alapítói emberek száma összesen — ők a kezdeti horgonyok
  alapitoKorok: 4,          // ⭐ ENNYI KÜLÖN körbe szervezve (lásd lent, miért kell)
  alapitoKeret: 60,         // az alapítók induló kerete (a „véges induló készlet")
  k: 5,                     // belépési minimum: ennyi tanúsítás / ennyi külön út
  m: 3,                     // horgonnyá váláshoz ennyi EGYMÁST NEM ISMERŐ horgony-tanú
  maxUtHossz: 4,            // egy felmutatott út legfeljebb ilyen hosszú lehet
  korok: 30,                // ennyi kört futtatunk
  talalkozoKorben: 25,      // körönként ennyi találkozó
  talalkozoMeret: 12,       // egy találkozón ennyien vannak
  talalkozoSugar: 80,       // a találkozó a körön ekkora szeletből hívja az embereket
  ujakTalalkozon: 3,        // egy találkozóra ennyi kívülállót hívnak meg
  tamadasKezdete: 8,        // ettől a körtől lép színre a támadó
  hamisProbalkozas: 40,     // a támadó körönként ennyi hamis azonosságot próbál bevinni
};

/**
 * A beállítások felülírhatók környezeti változóból — hogy ugyanaz a kód mérje meg a
 * „mi lett volna, ha" eseteket, kódmódosítás nélkül. Például:
 *
 *   KOROK=100 node koino/meres/szigetMeres.js          → hosszabb futás
 *   ALAPITO_KOROK=1 node koino/meres/szigetMeres.js    → egyetlen alapítói klikk
 *   GORBE=1 node koino/meres/szigetMeres.js            → körönkénti kimutatás
 */
function kornyezetbol(b) {
  for (const kulcs of Object.keys(b)) {
    const nev = kulcs.replace(/[A-Z]/g, (c) => '_' + c).toUpperCase();
    if (process.env[nev] !== undefined) b[kulcs] = Number(process.env[nev]);
  }
  return b;
}

/** Az egész közösség maradék kerete — ez mutatja meg, mikor fogy el a „tüzelő". */
function osszesKeret(vilag) {
  let osszeg = 0;
  for (let i = 0; i < vilag.tag.length; i++) {
    if (vilag.tag[i]) osszeg += Math.max(0, keret(vilag, i));
  }
  return osszeg;
}

function ujVilag(b, veletlen) {
  const vilag = {
    b,
    veletlen,
    // Minden ember egy index. 0..valodiEmberek-1 a valódiak, utána jönnek a hamisak.
    valodi: [],
    tag: [],
    horgony: [],
    alapito: [],
    kapott: [],   // kapott[i] = Set(kik tanúsították i-t)
    adott: [],    // adott[i]  = Set(kiket tanúsított i)
    megtevesztett: new Set(),
    hamisKezdet: b.valodiEmberek,
    elismeres: 0,   // tanúsítás olyannak, aki már tag
    tamogatas: 0,   // tanúsítás olyannak, aki még kívül van
  };

  for (let i = 0; i < b.valodiEmberek; i++) {
    vilag.valodi.push(true);
    vilag.tag.push(false);
    vilag.horgony.push(false);
    vilag.alapito.push(false);
    vilag.kapott.push(new Set());
    vilag.adott.push(new Set());
  }

  // ===== AZ ALAPÍTÁS — és miért TÖBB kör, nem egy =====
  //
  // ⚠️ EZT A SZIMULÁTOR ELSŐ FUTÁSA TANÍTOTTA (2026-09-05). Egyetlen alapítói klikkel a
  // horgony-kör SOHA nem tágul: a feltétel `m` olyan horgony-tanút kér, akik egymást nem
  // ismerik — egy klikkben viszont mindenki ismer mindenkit, tehát az egész alapítás
  // EGYETLEN független csoportnak számít, és senki nem tud horgonnyá válni.
  //
  // ⛔ EZ ELDÖNTETLEN KÉRDÉS, NEM MEGOLDÁS. Az `alapitoKorok` azért paraméter, hogy
  // MINDKÉT világot meg tudjuk mérni:
  //
  //     alapitoKorok = 1  → egyetlen alapítói klikk: a horgony-kör NEM tágul (mérve)
  //     alapitoKorok >= m → több, egymást nem ismerő alapítói kör: tágulhat
  //
  // ⚠️ Az „legyen több alapítói kör" NEM Csaba döntése — ezt Claude tette hozzá, hogy a
  // saját horgony-szabálya elinduljon, és ez rossz sorrend: előbb a szabály bukását kell
  // kimondani, nem a világot átírni alatta. Csaba két mondata ez volt: *„a horgonynak ne
  // egy pontban kell lennie, hanem egy körben, ami tágul"* és *„mi lenne, ha a horgonnyá
  // váláshoz kéne több személyes találkozó?"*. A „több találkozó" → „több, egymást nem
  // ismerő csoport" fordítás Claude ugrása (indoka: a gráf csak ez utóbbit látja) — és
  // épp ez az ugrás termelte a bootstrap-gondot. A döntés Csabáé.
  const korMeret = Math.ceil(b.alapitok / b.alapitoKorok);
  const tavolsag = Math.floor(b.valodiEmberek / b.alapitoKorok);
  vilag.alapitoKorei = [];
  for (let c = 0; c < b.alapitoKorok; c++) {
    const kor = [];
    for (let t = 0; t < korMeret && c * korMeret + t < b.alapitok; t++) {
      // ⭐ A köröket SZÉTSZÓRJUK a „földrajzon" — külön társaságok, külön helyeken.
      kor.push(c * tavolsag + t);
    }
    vilag.alapitoKorei.push(kor);
    for (const i of kor) {
      vilag.tag[i] = true;
      vilag.horgony[i] = true;
      vilag.alapito[i] = true;
    }
    // egy körön belül mindenki tanúsít mindenkit — de a körök közt SEMMI
    for (const i of kor) for (const j of kor) if (i !== j) elFelvetel(vilag, i, j);
  }

  return vilag;
}

/** Új (hamis) azonosság felvétele a világba — a támadó gyártja. */
function ujHamis(vilag) {
  const i = vilag.valodi.length;
  vilag.valodi.push(false);
  vilag.tag.push(false);
  vilag.horgony.push(false);
  vilag.alapito.push(false);
  vilag.kapott.push(new Set());
  vilag.adott.push(new Set());
  return i;
}

// ===================================
// A TANÚSÍTÁS — az él
// ===================================

/** Nyers él-felvétel, szabály-ellenőrzés nélkül (a világ építéséhez). */
function elFelvetel(vilag, tanu, kit) {
  if (tanu === kit) return false;
  if (vilag.adott[tanu].has(kit)) return false;
  vilag.adott[tanu].add(kit);
  vilag.kapott[kit].add(tanu);
  return true;
}

/**
 * A KERET (D44, Csaba szabálya): amennyivel a kapott tanúsítások száma a belépési
 * minimum fölött van, mínusz amit már elköltött.
 *
 * ⚠️ Az alapítók nem fizetik a `k`-t (nem kellett belépniük), viszont kapnak egy véges
 * induló készletet — ez a „véges alapítói készlet", amiről az 5.1 szól.
 */
function keret(vilag, i) {
  const b = vilag.b;
  const induló = vilag.alapito[i] ? b.alapitoKeret : 0;
  const belepesiKoltseg = vilag.alapito[i] ? 0 : b.k;
  return induló + vilag.kapott[i].size - belepesiKoltseg - vilag.adott[i].size;
}

/**
 * Tanúsítás a szabály szerint. A „keretes" szabályoknál (B, D) fogyaszt — és ha nincs
 * miből, akkor MEG SEM TÖRTÉNIK. Pont ezt akarjuk látni.
 */
function tanusit(vilag, szabaly, tanu, kit) {
  if (!vilag.tag[tanu]) return false;              // csak tag tanúsíthat
  if (szabaly.keretes && keret(vilag, tanu) <= 0) return false;
  const sikerult = elFelvetel(vilag, tanu, kit);
  if (sikerult) {
    // ⭐ Hova megy a keret? Két teljesen külön dologra, és ezt eddig egy néven hívtuk:
    //   · ELISMERÉS  — olyat tanúsítok, aki MÁR tag (nem juttat be senkit)
    //   · TÁMOGATÁS  — olyat tanúsítok, aki még KÍVÜL van (ez visz be embert)
    if (vilag.tag[kit]) vilag.elismeres++;
    else vilag.tamogatas++;
  }
  return sikerult;
}

// ===================================
// A HORGONY-KÖR — és hogy tágul-e
// ===================================
//
// ⭐ Csaba szabálya (2026-09-04): horgony az lesz, akit legalább `m` olyan HORGONY
// tanúsított, akik EGYMÁST NEM ISMERIK. Ez a „több különböző találkozó" gráf-alakja:
// egy találkozón mindenki ismer mindenkit, tehát EGY találkozó csak EGYET ér.
//
// ⚠️ A független halmazt MOHÓN számoljuk: alsó korlát. Ez szándékos (D43) — és a valódi
// koinóban is a jelentkező mutatja fel a független tanúit, nem a maximumot keresi.

function fuggetlenHorgonyTanuk(vilag, i) {
  const valasztott = [];
  for (const t of vilag.kapott[i]) {
    if (!vilag.horgony[t]) continue;
    const ismeriValamelyiket = valasztott.some(
      (v) => vilag.adott[t].has(v) || vilag.adott[v].has(t)
    );
    if (!ismeriValamelyiket) valasztott.push(t);
  }
  return valasztott.length;
}

/**
 * A horgony-kör frissítése. Csak NŐHET (élek csak keletkeznek) — ezért addig ismételjük,
 * amíg új horgony kerül be: egy friss horgony másokat is horgonnyá tehet. Ez maga a
 * „táguló kör".
 */
function horgonyokFrissitese(vilag) {
  let valtozott = true;
  let ujak = 0;
  while (valtozott) {
    valtozott = false;
    for (let i = 0; i < vilag.tag.length; i++) {
      if (!vilag.tag[i] || vilag.horgony[i]) continue;
      if (fuggetlenHorgonyTanuk(vilag, i) >= vilag.b.m) {
        vilag.horgony[i] = true;
        valtozott = true;
        ujak++;
      }
    }
  }
  return ujak;
}

// ===================================
// A DISZJUNKT UTAK — a szűk keresztmetszet mérése
// ===================================

/** Egy legrövidebb út a horgonyoktól a célig, a már felhasznált embereket kihagyva. */
function egyUt(vilag, cel, maxHossz, hasznalt) {
  const elozo = new Map();
  const sor = [];
  for (let i = 0; i < vilag.tag.length; i++) {
    if (vilag.horgony[i] && !hasznalt.has(i)) {
      elozo.set(i, null);
      sor.push([i, 0]);
    }
  }
  let fej = 0;
  while (fej < sor.length) {
    const [csucs, tav] = sor[fej++];
    if (tav >= maxHossz) continue;
    for (const kovetkezo of vilag.adott[csucs]) {
      if (kovetkezo === cel) {
        const ut = [cel];
        let p = csucs;
        while (p !== null && p !== undefined) {
          ut.push(p);
          p = elozo.get(p);
        }
        return ut;
      }
      // közbenső csak TAG lehet, és még nem használt
      if (!vilag.tag[kovetkezo]) continue;
      if (hasznalt.has(kovetkezo) || elozo.has(kovetkezo)) continue;
      elozo.set(kovetkezo, csucs);
      sor.push([kovetkezo, tav + 1]);
    }
  }
  return null;
}

/**
 * Hány CSÚCS-DISZJUNKT út vezet a horgonyoktól a célig, legfeljebb `maxHossz` hosszan?
 * Mohó: egymás után keresünk utakat, és a felhasznált embereket kivesszük.
 */
function diszjunktUtak(vilag, cel, maxHossz, maxDb) {
  const hasznalt = new Set();
  let db = 0;
  while (db < maxDb) {
    const ut = egyUt(vilag, cel, maxHossz, hasznalt);
    if (!ut) break;
    for (const cs of ut) if (cs !== cel) hasznalt.add(cs);
    db++;
  }
  return db;
}

// ===================================
// A NÉGY SZABÁLY
// ===================================

const SZABALYOK = [
  {
    nev: 'A — puszta darabszám',
    keretes: false,
    leiras: 'k tanúsítás bármely tagtól',
    felveheto: (vilag, jelolt) => szamlaltTanuk(vilag, jelolt) >= vilag.b.k,
  },
  {
    nev: 'B — + keret (D44)',
    keretes: true,
    leiras: 'k tanúsítás, de a tanú keretéből',
    felveheto: (vilag, jelolt) => szamlaltTanuk(vilag, jelolt) >= vilag.b.k,
  },
  {
    nev: 'C — horgony + utak',
    keretes: false,
    leiras: 'k diszjunkt út a horgonyoktól',
    felveheto: (vilag, jelolt) =>
      diszjunktUtak(vilag, jelolt, vilag.b.maxUtHossz, vilag.b.k) >= vilag.b.k,
  },
  {
    nev: 'D — horgony + utak + keret',
    keretes: true,
    leiras: 'mindkettő együtt',
    felveheto: (vilag, jelolt) =>
      diszjunktUtak(vilag, jelolt, vilag.b.maxUtHossz, vilag.b.k) >= vilag.b.k,
  },
];

/** Hány TAG tanúsította a jelöltet? */
function szamlaltTanuk(vilag, jelolt) {
  let db = 0;
  for (const t of vilag.kapott[jelolt]) if (vilag.tag[t]) db++;
  return db;
}

// ===================================
// A KÖR — mi történik egy időszakban
// ===================================

function talalkozokKore(vilag, szabaly) {
  const b = vilag.b;
  const tagok = [];
  for (let i = 0; i < b.valodiEmberek; i++) if (vilag.tag[i]) tagok.push(i);
  if (!tagok.length) return;

  for (let t = 0; t < b.talalkozoKorben; t++) {
    // A találkozó helye: egy meglévő tag környéke — így a kör a tagság PEREMÉN terjed.
    const kozep = tagok[Math.floor(vilag.veletlen() * tagok.length)];
    const jelenlevok = [];

    // meglévő tagok a környékről
    for (let probak = 0; probak < b.talalkozoMeret * 6; probak++) {
      if (jelenlevok.length >= b.talalkozoMeret) break;
      const eltolas = Math.floor((vilag.veletlen() - 0.5) * 2 * b.talalkozoSugar);
      const ki = (kozep + eltolas + b.valodiEmberek) % b.valodiEmberek;
      if (vilag.tag[ki] && !jelenlevok.includes(ki)) jelenlevok.push(ki);
    }

    // és néhány kívülálló, akit meghívtak
    const ujak = [];
    for (let probak = 0; probak < b.ujakTalalkozon * 8; probak++) {
      if (ujak.length >= b.ujakTalalkozon) break;
      const eltolas = Math.floor((vilag.veletlen() - 0.5) * 2 * b.talalkozoSugar);
      const ki = (kozep + eltolas + b.valodiEmberek) % b.valodiEmberek;
      if (!vilag.tag[ki] && !ujak.includes(ki)) ujak.push(ki);
    }

    // ⭐ A TALÁLKOZÓ: mindenki tanúsít mindenkit, akit lát.
    for (const a of jelenlevok) {
      for (const c of jelenlevok) if (a !== c) tanusit(vilag, szabaly, a, c);
      for (const u of ujak) tanusit(vilag, szabaly, a, u);
    }
  }
}

function valodiakFelvetele(vilag, szabaly) {
  const b = vilag.b;
  let felvettek = 0;
  for (let i = 0; i < b.valodiEmberek; i++) {
    if (vilag.tag[i]) continue;
    if (vilag.kapott[i].size === 0) continue;
    if (szabaly.felveheto(vilag, i)) {
      vilag.tag[i] = true;
      felvettek++;
    }
  }
  return felvettek;
}

// ===================================
// A TÁMADÓ
// ===================================
//
// ⚠️ SZÁNDÉKOSAN ERŐS. Nem véletlenszerűen téveszt meg embereket, hanem a leghasznosabbakat
// választja: HORGONYOKAT, akik ráadásul EGYMÁST NEM ISMERIK — mert így ad a legtöbb
// diszjunkt utat. Ha a szabály egy ilyen támadó ellen áll, akkor mond valamit.

function megtevesztettekValasztasa(vilag, mennyit) {
  const jeloltek = [];
  for (let i = 0; i < vilag.b.valodiEmberek; i++) {
    if (vilag.tag[i] && vilag.horgony[i]) jeloltek.push(i);
  }
  const valasztott = [];
  for (const j of jeloltek) {
    if (valasztott.length >= mennyit) break;
    const ismeriValamelyiket = valasztott.some(
      (v) => vilag.adott[j].has(v) || vilag.adott[v].has(j)
    );
    if (!ismeriValamelyiket) valasztott.push(j);
  }
  // ha nem jött össze elég egymást nem ismerő, feltöltjük bármelyik taggal
  for (let i = 0; i < vilag.b.valodiEmberek && valasztott.length < mennyit; i++) {
    if (vilag.tag[i] && !valasztott.includes(i)) valasztott.push(i);
  }
  for (const v of valasztott) vilag.megtevesztett.add(v);
  return valasztott;
}

function tamadoKore(vilag, szabaly) {
  const b = vilag.b;
  const megtevesztettek = [...vilag.megtevesztett];
  if (!megtevesztettek.length) return 0;

  const hamisak = [];
  for (let i = vilag.hamisKezdet; i < vilag.valodi.length; i++) {
    if (vilag.tag[i]) hamisak.push(i);
  }

  let bejutott = 0;
  for (let p = 0; p < b.hamisProbalkozas; p++) {
    const uj = ujHamis(vilag);

    // 1. a megtévesztettek tanúsítják
    for (const mt of megtevesztettek) tanusit(vilag, szabaly, mt, uj);
    // 2. és a már bent lévő hamisak is (ingyen, ha a szabály engedi)
    for (const h of hamisak) tanusit(vilag, szabaly, h, uj);

    if (szabaly.felveheto(vilag, uj)) {
      vilag.tag[uj] = true;
      hamisak.push(uj);
      bejutott++;
    }
  }
  return bejutott;
}

// ===================================
// EGY FUTÁS
// ===================================

function futtatas(szabaly, megtevesztettSzam, mag) {
  const b = BEALLITAS;
  const vilag = ujVilag(b, veletlenGenerator(mag));
  let hamisBent = 0;
  const gorbe = [];

  for (let kor = 0; kor < b.korok; kor++) {
    talalkozokKore(vilag, szabaly);
    horgonyokFrissitese(vilag);
    const ujTagok = valodiakFelvetele(vilag, szabaly);
    horgonyokFrissitese(vilag);

    if (kor === b.tamadasKezdete) {
      megtevesztettekValasztasa(vilag, megtevesztettSzam);
    }
    if (kor >= b.tamadasKezdete) {
      hamisBent += tamadoKore(vilag, szabaly);
      horgonyokFrissitese(vilag);
    }

    let tagokMost = 0;
    for (let i = 0; i < b.valodiEmberek; i++) if (vilag.tag[i]) tagokMost++;
    gorbe.push({ kor: kor + 1, ujTagok, tagok: tagokMost, keret: osszesKeret(vilag) });
  }

  let valodiTagok = 0;
  let horgonyok = 0;
  let hamisHorgony = 0;
  for (let i = 0; i < b.valodiEmberek; i++) {
    if (vilag.tag[i]) valodiTagok++;
    if (vilag.horgony[i]) horgonyok++;
  }
  for (let i = vilag.hamisKezdet; i < vilag.valodi.length; i++) {
    if (vilag.horgony[i]) hamisHorgony++;
  }

  return {
    valodiTagok, horgonyok, hamisBent, hamisHorgony, gorbe,
    maradekKeret: osszesKeret(vilag),
    elismeres: vilag.elismeres,
    tamogatas: vilag.tamogatas,
  };
}

// ===================================
// A MÉRÉS
// ===================================

function sor(oszlopok, szelessegek) {
  return oszlopok
    .map((o, i) => String(o).padEnd(szelessegek[i]).slice(0, szelessegek[i]))
    .join('  ');
}

/**
 * ⭐ KÖRÖNKÉNTI KIMUTATÁS — erre a kérdésre válaszol: „hogyan nőtt, és miért állt meg?"
 * Támadó nélkül fut, mert itt nem a védelem a kérdés, hanem a NÖVEKEDÉS.
 */
function gorbeKiiras(mag) {
  const b = BEALLITAS;
  for (const szabaly of SZABALYOK.filter((sz) => sz.nev.startsWith('A') || sz.nev.startsWith('B'))) {
    const e = futtatas(szabaly, 0, mag);
    kiir('');
    kiir(`▶ ${szabaly.nev} — körönként, támadó nélkül`);
    kiir('-'.repeat(62));
    kiir(sor(['kör', 'új tag', 'összes tag', 'maradék keret'], [6, 10, 12, 14]));
    for (const g of e.gorbe) {
      if (g.kor % 2 === 0 || g.kor <= 4 || g.ujTagok === 0) {
        kiir(sor([g.kor, g.ujTagok, g.tagok, szabaly.keretes ? g.keret : '—'], [6, 10, 12, 14]));
      }
    }
    const osszes = e.elismeres + e.tamogatas;
    const arany = osszes ? Math.round((e.elismeres / osszes) * 100) : 0;
    kiir('');
    kiir(`   HOVA MENT A TANÚSÍTÁS?  elismerés (már tagnak): ${e.elismeres}  ·  ` +
         `támogatás (kívülállónak): ${e.tamogatas}  →  ${arany}% elismerés`);
  }
  kiir('');
}

function main() {
  const mag = Number(process.argv[2] ?? 42);
  const b = kornyezetbol(BEALLITAS);

  if (process.env.GORBE) {
    kiir('');
    kiir(`NÖVEKEDÉSI GÖRBE — ${b.valodiEmberek} ember · ${b.alapitok} alapító ` +
         `(${b.alapitoKorok} körben) · induló keret ${b.alapitoKeret} · k=${b.k}`);
    kiir('='.repeat(62));
    gorbeKiiras(mag);
    return;
  }

  kiir('');
  kiir('A HAMIS SZIGET MÉRÉSE — a Szakasz 4 beléptető szabályai');
  kiir('='.repeat(74));
  kiir('');
  kiir(`  ${b.valodiEmberek} valódi ember · ${b.alapitok} alapító · k=${b.k} · m=${b.m} · ` +
       `út≤${b.maxUtHossz} · ${b.korok} kör · mag=${mag}`);
  kiir(`  a támadó a ${b.tamadasKezdete}. körtől körönként ${b.hamisProbalkozas} ` +
       `hamis azonosságot próbál bevinni`);
  kiir('');

  const megtevesztesek = [0, 2, 4, 5, 8, 20];
  const szel = [22, 12, 10, 12, 14];

  for (const szabaly of SZABALYOK) {
    kiir('');
    kiir(`▶ ${szabaly.nev}  (${szabaly.leiras})`);
    kiir('-'.repeat(74));
    kiir(sor(['megtévesztett ember', 'valódi tag', 'horgony', 'HAMIS BENT', 'hamis horgony'], szel));
    for (const mt of megtevesztesek) {
      const e = futtatas(szabaly, mt, mag);
      kiir(sor([`  ${mt}`, e.valodiTagok, e.horgonyok, e.hamisBent, e.hamisHorgony], szel));
    }
  }

  kiir('');
  kiir('='.repeat(74));
  kiir('');
  kiir('MIT KELL NÉZNI:');
  kiir('  · „valódi tag" — NŐ-E a közösség? Ha ez megáll, a szabály befagyasztotta a koinót,');
  kiir('    akkor is, ha közben tökéletesen véd.');
  kiir('  · „HAMIS BENT" — hány hamis azonosság jutott be. A 0 megtévesztettnél mindig 0');
  kiir('    kell legyen; ha nem az, a szimulátor a hibás.');
  kiir('  · ⭐ A KÜSZÖB: a „C" és „D" szabálynál a hamisak száma ott ugorjon meg, ahol a');
  kiir('    megtévesztettek száma eléri a k-t. Ez a szűk keresztmetszet.');
  kiir('  · „hamis horgony" — bejutott-e hamis azonosság a horgony-körbe. Ha igen, a');
  kiir('    mérce elveszett, és minden más szám érdektelen.');
  kiir('');
}

main();
