// koino/meres/meghivasMeres.js

// Felelősség: MEGMÉRNI, mekkora VÉDELMET ad és mekkora ÁRAT kér a belépési szabály
// hat változata — a teljesen nyitottól az öt meghívósig.
//
// ===== MIÉRT KELL EZ, ÉS MIÉRT KÜLÖN FÁJLBAN =====
//
// A `szigetMeres.js` a TANÚSÍTÁSI világot méri (k tanúsítás, keret, horgony). A
// 2026-09-06-i beszélgetésben Csaba egy másik szerkezetet javasolt, több változatban:
// a belépés MEGHÍVÁS legyen (kevés, aláírt, láncon lévő esemény), a BEMUTATKOZÁS pedig
// maradjon helyi jelzés. Ez más világ — két külön él-fajtával —, ezért külön fájl:
// a régi mérés eredményei így érvényben maradnak, és össze lehet vetni a kettőt.
//
// ===== ⭐ A KÉT ÉL, AMI ITT SZÉTVÁLIK =====
//
//   BEMUTATKOZÁS  — kölcsönös, INGYENES, sok, HELYI (sosem terjed, semmit nem dönt el).
//                   Ezen fut a séta, ez a „tenger". Bárki bárkivel, tagság nélkül is.
//   MEGHÍVÁS      — irányított, KEVÉS (1–5 db), LÁNC-ESEMÉNY, a belépéskor keletkezik.
//                   EZ dönt a tagságról, tehát objektív és offline ellenőrizhető.
//
// ⚠️ A tanúsítási világban ez a kettő EGY él volt, és pont ez okozta a bajt: a keretet
// azért kellett kitalálni, mert ugyanaz az él egyszerre volt ingyenes társas tény és
// belépési jog.
//
// ===== ⚠️ KÉT SZÁMOT MÉRÜNK, SOHA CSAK EGYET =====
//
// Csaba kérése (2026-09-06): *„mi mekkora védelmet, és mekkora árat követel."*
// Egy szabály, ami tökéletesen véd, de a közösség nem tud nőni alatta, NEM megoldás —
// ezt a D48 bukása már megtanította (a keretes szabály 104 főnél megállt, örökre).
// Ezért minden változatnál KÉT táblázat készül: VÉDELEM és ÁR.
//
// ===== AMIT EZ A MODELL NEM MODELLEZ (őszintén) =====
//
//   · nincs benne kulcs, aláírás, esemény, hálózat — ez GRÁF-kísérlet, nem koino-kísérlet;
//   · a meghívási hajlandóság optimista: aki bemutatkozott és jogosult, az meg is hív.
//     Ez MINDKÉT oldalra egyformán igaz, tehát nem a támadó javára torzít;
//   · a séta paraméterei (200 séta, 10 lépés) a `szigetMeres.js`-ből örököltek, nincsenek
//     hangolva;
//   · a világ „kis világ": a találkozók 10%-a távoli. ⚠️ Ezt a korábbi mérés kényszerítette
//     ki (egy tiszta körben nincs is tenger, csak part) — és egyben FELTÉTEL: egy teljesen
//     elszigetelt közösségnél a séta-jelzés gyengébb lenne.

import { kiir } from './naplo.js';

// ===================================
// VÉLETLEN — magból, hogy ismételhető legyen
// ===================================

/** Egyszerű, magvetett álvéletlen (nulla függőség, 6. szabály). */
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

const BEALLITAS = {
  valodiEmberek: 1500,      // ennyi valódi ember létezhet összesen
  alapitok: 20,             // az alapító kör — ők meghívás nélkül tagok (a rekurzió alapesete)
  korok: 30,                // ennyi kört futtatunk
  talalkozoKorben: 25,      // körönként ennyi találkozó
  talalkozoMeret: 12,       // egy találkozón ennyien vannak
  talalkozoSugar: 80,       // a találkozó a „földrajz" ekkora szeletéből hív
  ujakTalalkozon: 3,        // ennyi kívülállót hívnak meg egy találkozóra
  tavoliArany: 0.1,         // ⭐ a találkozók ennyied része NEM helyi (kis világ)
  teljesKuszob: 3,          // „teljes körű": ennyi bemutatkozás NÁLA RÉGEBBI tagoktól
  meghivoKorlat: 0,         // ⭐ egy tag ENNYI meghívót állíthat ki életében (0 = korlátlan)
  tamadasKezdete: 8,        // ettől a körtől lép színre a támadó
  hamisProbalkozas: 40,     // a támadó körönként ennyi hamis azonosságot próbál bevinni
  melegit: 0,               // ⭐ 1 = a hamisak egymásnak is bemutatkoznak (SŰRŰ sziget)
  setaDb: 200,              // egy jelzéshez ennyi séta indul
  setaHossz: 10,            // egy séta ennyi lépés
  minta: 30,                // ennyi fős minta mindkét oldalról a jelzés-méréshez
};

/** A beállítások felülírhatók környezeti változóból (MELEGIT=1, KOROK=50, …). */
function kornyezetbol(b) {
  for (const kulcs of Object.keys(b)) {
    const nev = kulcs.replace(/[A-Z]/g, (c) => '_' + c).toUpperCase();
    if (process.env[nev] !== undefined) b[kulcs] = Number(process.env[nev]);
  }
  return b;
}

function ujVilag(b, veletlen) {
  const vilag = {
    b,
    veletlen,
    valodi: [],
    tag: [],
    alapito: [],
    belepes: [],            // melyik körben lett tag (az alapítóknál -1) — a „régebbi" ehhez kell
    elsoTalalkozas: [],     // melyik körben találkozott először taggal (az ÁR méréséhez)
    bemutatkozas: [],       // Set — KÖLCSÖNÖS, ingyenes, helyi. Ezen fut a séta.
    meghivo: [],            // Set — kik hívták be. Lánc-adat, EZ dönt.
    kiadott: [],            // hány meghívót állított ki (a saját láncából ellenőrizhető)
    megtevesztett: new Set(),
    hamisKezdet: b.valodiEmberek,
    // ⭐ Az önellátás nyomon követése: bejutott hamisonként hány VALÓDI meghívó kellett.
    hamisMeghivoi: [],
  };

  for (let i = 0; i < b.valodiEmberek; i++) {
    vilag.valodi.push(true);
    vilag.tag.push(false);
    vilag.alapito.push(false);
    vilag.belepes.push(null);
    vilag.elsoTalalkozas.push(null);
    vilag.bemutatkozas.push(new Set());
    vilag.meghivo.push(new Set());
    vilag.kiadott.push(0);
  }

  // ===== AZ ALAPÍTÁS — a rekurzió alapesete, nem kivétel =====
  //
  // ⭐ Az alapítók a koino-létrehozás eseményéből jönnek: meghívás nélkül tagok, és
  // kezdettől teljes körűek. Nincs szükség méret-figyelésre (az globális szám lenne):
  // a szabály magától „kapcsol be", ahogy a meghívottak elérik a küszöböt.
  //
  // Szétszórjuk őket a földrajzon — külön társaságok, külön helyeken —, mert egyetlen
  // klikkből induló világ hamis képet adna a terjedésről.
  const tavolsag = Math.floor(b.valodiEmberek / Math.max(1, b.alapitok));
  for (let a = 0; a < b.alapitok; a++) {
    const i = a * tavolsag;
    vilag.tag[i] = true;
    vilag.alapito[i] = true;
    vilag.belepes[i] = -1;
    vilag.elsoTalalkozas[i] = -1;
  }
  // Az alapítók a saját környezetükben ismerik egymást (párosával, nem mind-mindet).
  for (let a = 0; a + 1 < b.alapitok; a += 2) {
    bemutatkoznak(vilag, a * tavolsag, (a + 1) * tavolsag);
  }

  return vilag;
}

/** Új (hamis) azonosság — a támadó gyártja. Egy kulcs elkészítése ingyen van. */
function ujHamis(vilag) {
  const i = vilag.valodi.length;
  vilag.valodi.push(false);
  vilag.tag.push(false);
  vilag.alapito.push(false);
  vilag.belepes.push(null);
  vilag.elsoTalalkozas.push(null);
  vilag.bemutatkozas.push(new Set());
  vilag.meghivo.push(new Set());
  vilag.kiadott.push(0);
  return i;
}

// ===================================
// A KÉT ÉL
// ===================================

/** ⭐ BEMUTATKOZÁS — kölcsönös, ingyenes, tagság nélkül is. Ez a tenger. */
function bemutatkoznak(vilag, a, b) {
  if (a === b) return;
  vilag.bemutatkozas[a].add(b);
  vilag.bemutatkozas[b].add(a);
}

/**
 * MEGHÍVÁS — irányított, lánc-esemény. Csak jogosult tag adhat.
 *
 * ⭐ A KIADOTT SZÁMLÁLÓ (`kiadott`) nem díszlet: a saját láncodból ellenőrizhető, hányat
 * állítottál ki — pontosan a D42 mintája (bemondott összeg). Ezért egy „legfeljebb ennyi
 * meghívó" szabály OBJEKTÍV lenne, szemben a bemutatkozás-számmal, ami helyi.
 */
function meghiv(vilag, ki, kit) {
  if (ki === kit) return false;
  if (vilag.meghivo[kit].has(ki)) return false;
  const korlat = vilag.b.meghivoKorlat;
  if (korlat > 0 && vilag.kiadott[ki] >= korlat) return false;
  vilag.meghivo[kit].add(ki);
  vilag.kiadott[ki]++;
  return true;
}

/**
 * ⭐ „TELJES KÖRŰ" — van-e legalább `teljesKuszob` bemutatkozása NÁLA RÉGEBBI tagoktól.
 *
 * ⚠️ A „régebbi" feltétel Csaba ötlete, és ingyen megöli a kölcsönös gyűrűt: két
 * egyszerre érkező nem tudja egymást felhizlalni, mert egyik sem régebbi a másiknál.
 * Ugyanaz a védelem, amit a D44 aritmetikája adott — összeadás nélkül.
 */
function teljesKoru(vilag, i) {
  if (vilag.alapito[i]) return true;
  const b = vilag.b;
  let db = 0;
  for (const t of vilag.bemutatkozas[i]) {
    if (!vilag.tag[t]) continue;
    if (vilag.belepes[t] === null || vilag.belepes[i] === null) continue;
    if (vilag.belepes[t] < vilag.belepes[i]) db++;
  }
  return db >= b.teljesKuszob;
}

/** Jogosult-e meghívót kiállítani, a változat feltétele szerint? */
function hivhat(vilag, valtozat, i) {
  if (!vilag.tag[i]) return false;
  const korlat = vilag.b.meghivoKorlat;
  if (korlat > 0 && vilag.kiadott[i] >= korlat) return false;
  if (valtozat.hivoFeltetel === 'teljes') return teljesKoru(vilag, i);
  return true;
}

// ===================================
// A HAT VÁLTOZAT — minden ötlet, ami eddig elhangzott
// ===================================
//
// ⭐ Egyetlen paraméter-család fedi le mindet: HÁNY meghívó kell, és KI adhat meghívót.
// Ettől a hat változat UGYANABBAN a világban fut, tehát a számaik összevethetők.

const VALTOZATOK = [
  {
    nev: 'V1 — nyílt',
    kellMeghivo: 0,
    hivoFeltetel: 'tag',
    leiras: 'nincs kapu: akinek kulcsa van, tag',
  },
  {
    nev: 'V2 — 1 meghívó',
    kellMeghivo: 1,
    hivoFeltetel: 'tag',
    leiras: 'egy tag behívhat',
  },
  {
    nev: 'V2b — 1 meghívó, jogosítással',
    kellMeghivo: 1,
    hivoFeltetel: 'teljes',
    leiras: 'egy TELJES KÖRŰ tag hívhat (3 bemutatkozás régebbiektől)',
  },
  {
    nev: 'V3 — 2 meghívó + jogosítás',
    kellMeghivo: 2,
    hivoFeltetel: 'teljes',
    leiras: 'két teljes körű tag; a belépő előbb „böngésző"',
    fokozat: true,
  },
  {
    nev: 'V4 — 3 meghívó',
    kellMeghivo: 3,
    hivoFeltetel: 'tag',
    leiras: 'három tag; belépéskor azonnal teljes körű',
  },
  {
    nev: 'V5 — 5 meghívó',
    kellMeghivo: 5,
    hivoFeltetel: 'tag',
    leiras: 'öt tag (a régi k=5 tanúsítás megfelelője)',
  },
];

// ===================================
// A KÖR — mi történik egy időszakban
// ===================================

function talalkozokKore(vilag, kor) {
  const b = vilag.b;
  const tagok = [];
  for (let i = 0; i < b.valodiEmberek; i++) if (vilag.tag[i]) tagok.push(i);
  if (!tagok.length) return;

  for (let t = 0; t < b.talalkozoKorben; t++) {
    const kozep = tagok[Math.floor(vilag.veletlen() * tagok.length)];

    // ⭐ TÁVOLI TALÁLKOZÓ: valaki elköltözik, más városban van rokona, utazik.
    const sugar = vilag.veletlen() < b.tavoliArany
      ? Math.floor(b.valodiEmberek / 2)
      : b.talalkozoSugar;

    const jelenlevok = [];
    for (let p = 0; p < b.talalkozoMeret * 6; p++) {
      if (jelenlevok.length >= b.talalkozoMeret) break;
      const eltolas = Math.floor((vilag.veletlen() - 0.5) * 2 * sugar);
      const ki = (kozep + eltolas + b.valodiEmberek) % b.valodiEmberek;
      if (vilag.tag[ki] && !jelenlevok.includes(ki)) jelenlevok.push(ki);
    }

    const ujak = [];
    for (let p = 0; p < b.ujakTalalkozon * 8; p++) {
      if (ujak.length >= b.ujakTalalkozon) break;
      const eltolas = Math.floor((vilag.veletlen() - 0.5) * 2 * b.talalkozoSugar);
      const ki = (kozep + eltolas + b.valodiEmberek) % b.valodiEmberek;
      if (!vilag.tag[ki] && !ujak.includes(ki)) ujak.push(ki);
    }

    // ⭐ A TALÁLKOZÓ: mindenki bemutatkozik mindenkinek. INGYEN, és a kívülállóknak is.
    const mind = [...jelenlevok, ...ujak];
    for (let a = 0; a < mind.length; a++) {
      for (let c = a + 1; c < mind.length; c++) bemutatkoznak(vilag, mind[a], mind[c]);
    }
    for (const u of ujak) {
      if (vilag.elsoTalalkozas[u] === null) vilag.elsoTalalkozas[u] = kor;
    }
  }
}

/**
 * A MEGHÍVÁSOK KIÁLLÍTÁSA — akivel bemutatkoztam és jogosult vagyok, azt behívom.
 *
 * ⚠️ Optimista (mindenki hajlandó), de ez mindkét oldalra egyformán igaz.
 *
 * ⚠️⚠️ ÉS EGY HIBA, AMIT A MÉRÉS TANÍTOTT (2026-09-06): az első változat MINDEN
 * ismerősnek kiállított meghívót. Korlátlan esetben ez ártalmatlan — korláttal viszont a
 * becsületes tagok az első körben ELPAZAROLTÁK a keretüket olyanokra, akik úgysem érték
 * el a küszöböt, és onnantól SENKI nem tudott hívni. A mérés „tökéletes védelmet" mutatott
 * (0 hamis), ami valójában BEFAGYOTT KOINO volt. ⭐ Ezért: meghívót csak arra költünk,
 * aki ezzel tényleg BE IS JUT — pontosan annyit, amennyi kell.
 */
function meghivasokKore(vilag, valtozat) {
  const b = vilag.b;
  if (valtozat.kellMeghivo === 0) return;

  for (let i = 0; i < b.valodiEmberek; i++) {
    if (vilag.tag[i]) continue;
    const hajlandok = [];
    for (const t of vilag.bemutatkozas[i]) {
      if (t >= b.valodiEmberek) continue;            // hamis meghívó itt nem játszik
      if (vilag.meghivo[i].has(t)) continue;         // már hívta
      if (hivhat(vilag, valtozat, t)) hajlandok.push(t);
    }
    const kell = valtozat.kellMeghivo - vilag.meghivo[i].size;
    if (kell <= 0 || hajlandok.length < kell) continue;   // nem gyűlt össze — nem költünk
    for (const t of hajlandok.slice(0, kell)) meghiv(vilag, t, i);
  }
}

/** Belépés a változat szabálya szerint. */
function valodiakFelvetele(vilag, valtozat, kor) {
  const b = vilag.b;
  let felvettek = 0;
  for (let i = 0; i < b.valodiEmberek; i++) {
    if (vilag.tag[i]) continue;
    // ⚠️ A V1-nél sincs „mindenki azonnal tag": a koinóról tudnia kell valakitől.
    // Enélkül a nyílt változat 1500 tagot adna az első körben, és semmit nem tanulnánk.
    if (vilag.bemutatkozas[i].size === 0) continue;
    if (vilag.meghivo[i].size < valtozat.kellMeghivo) continue;
    vilag.tag[i] = true;
    vilag.belepes[i] = kor;
    felvettek++;
  }
  return felvettek;
}

// ===================================
// A TÁMADÓ
// ===================================
//
// ⚠️ SZÁNDÉKOSAN ERŐS: a leghasznosabb embereket téveszti meg — a legtöbb bemutatkozással
// rendelkező, teljes körű tagokat —, mert ők tudják a legtöbb meghívót kiállítani.

function keverve(vilag, lista) {
  const masolat = [...lista];
  for (let i = masolat.length - 1; i > 0; i--) {
    const j = Math.floor(vilag.veletlen() * (i + 1));
    [masolat[i], masolat[j]] = [masolat[j], masolat[i]];
  }
  return masolat;
}

function megtevesztettekValasztasa(vilag, mennyit) {
  const b = vilag.b;
  const jeloltek = [];
  for (let i = 0; i < b.valodiEmberek; i++) {
    if (vilag.tag[i]) jeloltek.push(i);
  }
  jeloltek.sort((a, c) => vilag.bemutatkozas[c].size - vilag.bemutatkozas[a].size);
  for (const i of jeloltek.slice(0, mennyit)) vilag.megtevesztett.add(i);
}

/**
 * ⭐⭐ A TÁMADÓ KÖRE — és itt mérjük meg az ÖNELLÁTÁST.
 *
 * Minden bejutott hamisnál feljegyezzük, hány VALÓDI (megtévesztett) meghívó kellett
 * hozzá. Ha ez egy ponttól nulla, a sziget önellátóvá vált: onnantól a támadónak nem
 * kell több valódi ember — ez a „fizess egyszer, arass örökké" alakzat.
 */
function tamadoKore(vilag, valtozat) {
  const b = vilag.b;
  const megtevesztettek = [...vilag.megtevesztett];
  if (!megtevesztettek.length && valtozat.kellMeghivo > 0) return 0;

  const hamisak = [];
  for (let i = vilag.hamisKezdet; i < vilag.valodi.length; i++) {
    if (vilag.tag[i]) hamisak.push(i);
  }

  let bejutott = 0;
  for (let p = 0; p < b.hamisProbalkozas; p++) {
    const uj = ujHamis(vilag);

    // A támadó a LEGOLCSÓBBAN szerzi meg a meghívókat: előbb a saját (ingyenes) hamisait
    // használja, és csak ha azok nem elegendők, nyúl a megtévesztett valódi emberekhez.
    const sajat = hamisak.filter((h) => hivhat(vilag, valtozat, h));
    const valodiJogosult = megtevesztettek.filter((m) => hivhat(vilag, valtozat, m));

    let valodiKellett = 0;
    const hivok = [];
    for (const h of sajat) {
      if (hivok.length >= valtozat.kellMeghivo) break;
      hivok.push(h);
    }
    for (const m of valodiJogosult) {
      if (hivok.length >= valtozat.kellMeghivo) break;
      hivok.push(m);
      valodiKellett++;
    }

    // A meghívás előtt bemutatkoznak vele (a meghívó ismeri, akit behív).
    for (const h of hivok) {
      bemutatkoznak(vilag, h, uj);
      meghiv(vilag, h, uj);
    }
    // A megtévesztett emberek akkor is bemutatkoznak, ha nem kellett meghívónak —
    // a támadó ezzel „melegíti" az azonosságát a tengerben.
    if (valtozat.kellMeghivo === 0) {
      for (const m of megtevesztettek.slice(0, 1)) bemutatkoznak(vilag, m, uj);
    }

    if (vilag.meghivo[uj].size >= valtozat.kellMeghivo && vilag.bemutatkozas[uj].size > 0) {
      vilag.tag[uj] = true;
      vilag.belepes[uj] = vilag.aktualisKor;
      hamisak.push(uj);
      bejutott++;
      vilag.hamisMeghivoi.push(valodiKellett);
    }
  }

  // ⭐⭐ A MELEGÍTÉS: a hamisak egymásnak is bemutatkoznak — így a sziget SŰRŰ lesz.
  // Ez a satu másik pofája: aki a jelzés elől melegít, az sűrűvé válik; aki csupasz
  // marad, azt a séta soha nem éri el. Egyszerre nem lehet mindkettő.
  if (b.melegit) {
    const bent = hamisak.filter((h) => vilag.tag[h]);
    for (let a = 0; a < bent.length; a++) {
      for (let c = a + 1; c < bent.length && c < a + 12; c++) {
        bemutatkoznak(vilag, bent[a], bent[c]);
      }
    }
  }

  return bejutott;
}

// ===================================
// ⭐⭐ A BEMUTATKOZÁSOK TENGERE — a séta
// ===================================
//
// A séta a BEMUTATKOZÁS élein fut (nem a meghíváson): „én elindulok a saját ismerőseim
// mentén, te a tieid mentén — összeérünk-e valahol?"

function szomszedok(vilag, i) {
  const lista = [];
  for (const sz of vilag.bemutatkozas[i]) if (vilag.tag[sz]) lista.push(sz);
  return lista;
}

function setaVege(vilag, kezdo, hossz) {
  let hol = kezdo;
  for (let l = 0; l < hossz; l++) {
    const szomszed = szomszedok(vilag, hol);
    if (!szomszed.length) return hol;
    hol = szomszed[Math.floor(vilag.veletlen() * szomszed.length)];
  }
  return hol;
}

function setaHalmaz(vilag, kezdo, db, hossz) {
  const hol = new Set();
  for (let s = 0; s < db; s++) hol.add(setaVege(vilag, kezdo, hossz));
  return hol;
}

/** A JELZÉS: hány ponton ér össze a két ember sétáinak halmaza? (0 = sehol) */
function tengerTalalkozas(vilag, en, o, db, hossz) {
  const enyem = setaHalmaz(vilag, en, db, hossz);
  const ove = setaHalmaz(vilag, o, db, hossz);
  let metszet = 0;
  for (const p of ove) if (enyem.has(p)) metszet++;
  return metszet;
}

// ===================================
// EGY FUTÁS
// ===================================

function futtatas(valtozat, megtevesztettSzam, mag) {
  const b = BEALLITAS;
  const vilag = ujVilag(b, veletlenGenerator(mag));
  let hamisBent = 0;

  for (let kor = 0; kor < b.korok; kor++) {
    vilag.aktualisKor = kor;
    talalkozokKore(vilag, kor);
    meghivasokKore(vilag, valtozat);
    valodiakFelvetele(vilag, valtozat, kor);

    if (kor === b.tamadasKezdete) megtevesztettekValasztasa(vilag, megtevesztettSzam);
    if (kor >= b.tamadasKezdete) hamisBent += tamadoKore(vilag, valtozat);
  }

  // ----- AZ ÁR -----
  let valodiTagok = 0;
  let bongeszo = 0;          // tag, de nem teljes körű (csak a fokozatos változatnál)
  let kivulMaradt = 0;       // találkozott tagokkal, mégsem jutott be
  let varakozasOsszeg = 0;
  let varakozasDb = 0;
  for (let i = 0; i < b.valodiEmberek; i++) {
    if (vilag.tag[i]) {
      valodiTagok++;
      if (valtozat.fokozat && !teljesKoru(vilag, i)) bongeszo++;
      if (vilag.belepes[i] >= 0 && vilag.elsoTalalkozas[i] !== null && vilag.elsoTalalkozas[i] >= 0) {
        varakozasOsszeg += vilag.belepes[i] - vilag.elsoTalalkozas[i];
        varakozasDb++;
      }
    } else if (vilag.bemutatkozas[i].size > 0) {
      kivulMaradt++;
    }
  }

  return {
    vilag,
    valodiTagok,
    bongeszo,
    kivulMaradt,
    varakozas: varakozasDb ? varakozasOsszeg / varakozasDb : 0,
    hamisBent,
    hamisMeghivoi: vilag.hamisMeghivoi,
  };
}

/**
 * ⭐ AZ ÖNELLÁTÁS KÜSZÖBE: hányadik bejutott hamis azonosság után nem kellett többé
 * EGYETLEN valódi ember sem? (null = végig kellett valódi)
 */
function onellatasKuszobe(hamisMeghivoi) {
  for (let i = 0; i < hamisMeghivoi.length; i++) {
    let mind0 = true;
    for (let j = i; j < hamisMeghivoi.length; j++) {
      if (hamisMeghivoi[j] > 0) { mind0 = false; break; }
    }
    if (mind0) return i;
  }
  return null;
}

/**
 * ⭐⭐ A HÍD — hány szálon lóg a sziget a valódi világon?
 *
 * Ez magyarázza meg a séta-jelzés számait, és e nélkül a „100%" puszta babona volna.
 * A séta ugyanis nem azt méri, hogy valaki hamis-e, hanem hogy MENNYIRE ÉR EL a tengerig.
 * Ha az egész sziget egyetlen bemutatkozáson lóg, egy tízlépéses séta gyakorlatilag soha
 * nem talál rá arra az egy élre — tehát a sziget lakói sehol nem érnek össze senkivel.
 */
function hidMerese(vilag) {
  const b = vilag.b;
  let hidElek = 0;
  let kapcsoltHamis = 0;
  let hamisTagok = 0;
  for (let i = vilag.hamisKezdet; i < vilag.tag.length; i++) {
    if (!vilag.tag[i]) continue;
    hamisTagok++;
    let vanValodi = 0;
    for (const sz of vilag.bemutatkozas[i]) {
      if (sz < b.valodiEmberek && vilag.tag[sz]) vanValodi++;
    }
    hidElek += vanValodi;
    if (vanValodi > 0) kapcsoltHamis++;
  }
  return { hidElek, kapcsoltHamis, hamisTagok };
}

/** A séta-jelzés mérése: hamis elkapva / becsületes tévesen megjelölve. */
function jelzesMerese(e, mag) {
  const b = BEALLITAS;
  const vilag = e.vilag;
  vilag.veletlen = veletlenGenerator(mag + 777);   // külön patak, hogy a séta ne tolja el a világot

  const mintaVetel = (tol, ig) => {
    const talalt = [];
    for (let i = tol; i < ig; i++) if (vilag.tag[i]) talalt.push(i);
    return keverve(vilag, talalt).slice(0, b.minta);
  };
  const vMinta = mintaVetel(b.alapitok, b.valodiEmberek);
  const hMinta = mintaVetel(vilag.hamisKezdet, vilag.tag.length);
  if (!hMinta.length || !vMinta.length) return null;

  const kerdezok = keverve(vilag, vMinta).slice(0, 5);
  const talalkozasok = (celok) => {
    const ertekek = [];
    for (const cel of celok) {
      for (const kerdezo of kerdezok) {
        if (kerdezo === cel) continue;
        ertekek.push(tengerTalalkozas(vilag, kerdezo, cel, b.setaDb, b.setaHossz));
      }
    }
    return ertekek;
  };

  const vTal = talalkozasok(vMinta);
  const hTal = talalkozasok(hMinta);

  // ⭐⭐ A DÖNTŐ SZÁM: a legjobb küszöb mellett hány hamisat kapunk el, és hány
  // becsületest jelölnénk meg TÉVESEN. A második nem kellemetlenség, hanem a lényeg —
  // épp a magányost és a frissen érkezettet érinti (D49/c).
  let legjobb = { josag: -1, elkapva: 0, tevesen: 1 };
  const ertekek = [...new Set([...vTal, ...hTal])].sort((a, c) => a - c);
  for (const kuszob of ertekek) {
    const elkapva = hTal.filter((x) => x <= kuszob).length / hTal.length;
    const tevesen = vTal.filter((x) => x <= kuszob).length / vTal.length;
    if (elkapva - tevesen > legjobb.josag) {
      legjobb = { josag: elkapva - tevesen, elkapva, tevesen, kuszob };
    }
  }
  return legjobb;
}

// ===================================
// A MÉRÉS
// ===================================

function sor(oszlopok, szelessegek) {
  return oszlopok
    .map((o, i) => String(o).padEnd(szelessegek[i]).slice(0, szelessegek[i]))
    .join('  ');
}

const kerekit = (x) => Math.round(x);
const szazalek = (x) => `${Math.round(x * 100)}%`;

function atlagolva(valtozat, megtevesztett, magok) {
  const eredmenyek = magok.map((m) => futtatas(valtozat, megtevesztett, m));
  const atl = (mezo) => eredmenyek.reduce((o, e) => o + e[mezo], 0) / eredmenyek.length;
  const kuszobok = eredmenyek.map((e) => onellatasKuszobe(e.hamisMeghivoi));
  return {
    valodiTagok: atl('valodiTagok'),
    bongeszo: atl('bongeszo'),
    kivulMaradt: atl('kivulMaradt'),
    varakozas: atl('varakozas'),
    hamisBent: atl('hamisBent'),
    onellato: kuszobok.filter((k) => k !== null).length,
    onellatoAtlag: kuszobok.filter((k) => k !== null).length
      ? kuszobok.filter((k) => k !== null).reduce((a, c) => a + c, 0) /
        kuszobok.filter((k) => k !== null).length
      : null,
    eredmenyek,
  };
}

function main() {
  const b = kornyezetbol(BEALLITAS);
  const magok = (process.env.MAGOK ?? '1,2,3,4').split(',').map(Number);
  const megtevesztett = Number(process.env.MEGTEVESZTETT ?? 3);

  kiir('');
  kiir('A MEGHÍVÁSOS BELÉPÉS MÉRÉSE — védelem ÉS ár, hat változatban');
  kiir('='.repeat(84));
  kiir('');
  kiir(`  ${b.valodiEmberek} valódi ember · ${b.alapitok} alapító · ${b.korok} kör · ` +
       `${magok.length} mag átlagolva`);
  kiir(`  a támadó a ${b.tamadasKezdete}. körtől körönként ${b.hamisProbalkozas} hamis ` +
       `azonosságot próbál bevinni`);
  kiir(`  „teljes körű" = ${b.teljesKuszob} bemutatkozás NÁLA RÉGEBBI tagoktól`);
  kiir('');

  // ===== 1. AZ ÁR — támadó nélkül =====
  kiir('▶ 1. AZ ÁR — mit kér a szabály a BECSÜLETES emberektől (támadó nélkül)');
  kiir('-'.repeat(84));
  const arSzel = [30, 12, 12, 14, 14];
  kiir(sor(['változat', 'valódi tag', 'kívül', 'várakozás', 'aláírás/belépés'], arSzel));
  const arEredmeny = {};
  for (const v of VALTOZATOK) {
    const e = atlagolva(v, 0, magok);
    arEredmeny[v.nev] = e;
    kiir(sor([
      v.nev,
      kerekit(e.valodiTagok),
      kerekit(e.kivulMaradt),
      `${Math.round(e.varakozas * 10) / 10} kör`,
      v.kellMeghivo,
    ], arSzel));
  }

  // ===== 2. A VÉDELEM =====
  kiir('');
  kiir(`▶ 2. A VÉDELEM — ${megtevesztett} megtévesztett valódi tag mellett`);
  kiir('-'.repeat(84));
  const vedSzel = [30, 12, 14, 16, 12];
  kiir(sor(['változat', 'valódi tag', 'HAMIS BENT', 'önellátó lett', 'hányadiktól'], vedSzel));
  const vedEredmeny = {};
  for (const v of VALTOZATOK) {
    const e = atlagolva(v, megtevesztett, magok);
    vedEredmeny[v.nev] = e;
    kiir(sor([
      v.nev,
      kerekit(e.valodiTagok),
      kerekit(e.hamisBent),
      `${e.onellato}/${magok.length} futásban`,
      e.onellatoAtlag === null ? '—' : `${kerekit(e.onellatoAtlag)}.`,
    ], vedSzel));
  }

  // ===== 3. A SÉTA — elkapja-e a szigetet? =====
  kiir('');
  kiir('▶ 3. A SÉTA-JELZÉS — elkapja-e a szigetet, és kit jelöl meg tévesen?');
  kiir('-'.repeat(84));
  kiir(`   (${b.setaDb} séta × ${b.setaHossz} lépés · melegítés: ${b.melegit ? 'IGEN — sűrű sziget' : 'nincs — csupasz hamisak'})`);
  kiir('');
  const jelSzel = [30, 18, 22];
  kiir(sor(['változat', 'hamis elkapva', 'becsületes tévesen'], jelSzel));
  for (const v of VALTOZATOK) {
    const e = vedEredmeny[v.nev];
    const jelzesek = e.eredmenyek
      .map((r, i) => jelzesMerese(r, magok[i]))
      .filter((j) => j !== null);
    if (!jelzesek.length) {
      kiir(sor([v.nev, '— (nincs hamis)', '—'], jelSzel));
      continue;
    }
    const atlElkapva = jelzesek.reduce((o, j) => o + j.elkapva, 0) / jelzesek.length;
    const atlTevesen = jelzesek.reduce((o, j) => o + j.tevesen, 0) / jelzesek.length;
    kiir(sor([v.nev, szazalek(atlElkapva), szazalek(atlTevesen)], jelSzel));
  }

  // ===== 4. MIÉRT? — a híd, ami a 3. táblázat számait megmagyarázza =====
  kiir('');
  kiir('▶ 4. MIÉRT ANNYI? — hány szálon lóg a sziget a valódi világon');
  kiir('-'.repeat(84));
  kiir('   (a séta nem azt méri, ki hamis, hanem hogy KI MEDDIG ÉR EL a tengerben)');
  kiir('');
  const hidSzel = [30, 14, 20, 22];
  kiir(sor(['változat', 'hamis bent', 'híd-élek a valódihoz', 'ebből hamis kapcsolt'], hidSzel));
  for (const v of VALTOZATOK) {
    const e = vedEredmeny[v.nev];
    const hidak = e.eredmenyek.map((r) => hidMerese(r.vilag));
    const atl = (mezo) => hidak.reduce((o, h) => o + h[mezo], 0) / hidak.length;
    if (!atl('hamisTagok')) {
      kiir(sor([v.nev, '0', '—', '—'], hidSzel));
      continue;
    }
    kiir(sor([
      v.nev,
      kerekit(atl('hamisTagok')),
      kerekit(atl('hidElek')),
      `${kerekit(atl('kapcsoltHamis'))} (${szazalek(atl('kapcsoltHamis') / atl('hamisTagok'))})`,
    ], hidSzel));
  }

  kiir('');
  kiir('='.repeat(84));
  kiir('');
  kiir('MIT KELL NÉZNI:');
  kiir('  · „valódi tag" az 1. táblázatban — NŐ-E a közösség? Ha egy szabály alatt megáll,');
  kiir('    az akkor sem megoldás, ha tökéletesen véd (a D48 bukásának tanulsága).');
  kiir('  · „kívül" — hány valódi ember találkozott tagokkal, mégsem jutott be. Ez az ár,');
  kiir('    és épp azokat érinti, akikért a befogadás-gondolat szól.');
  kiir('  · ⭐ „önellátó lett" — a sziget elérte-e azt a pontot, ahonnan NEM kell több');
  kiir('    valódi ember. Ha igen, a küszöb csak drágít, nem véd.');
  kiir('  · ⭐⭐ A 3. táblázat a döntő: ha a séta elkapja a szigetet, akkor a belépési');
  kiir('    szabálynak nem is kell megvédenie — elég, ha LÁTHATÓVÁ teszi (D49).');
  kiir('');
  kiir('  Futtatás melegítő támadóval:  MELEGIT=1 node koino/meres/meghivasMeres.js');
  kiir('  Több/kevesebb megtévesztettel: MEGTEVESZTETT=8 node koino/meres/meghivasMeres.js');
  kiir('');
}

main();
