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
  kitarto: 0,               // ⭐⭐ 1 = a támadó MINDEN KÖRBEN újra jelöli a bemutatkozásait
  rejtozo: 0,               // ⭐⭐ 1 = REJTŐZKÖDŐ támadó: a KÖLTSÉG helyett a LÁTHATATLANSÁGOT
                            //    optimalizálja — valódi emberekre aggatja a hamisait akkor is,
                            //    amikor a szabály nem kényszeríti rá (lásd `tamadoKore`)
  allandoKorok: 0,          // ⭐⭐ 1 = ÁLLANDÓ TÁRSASÁGOK (család, munkahely) — lásd lentebb
  korMeret: 8,              // egy állandó társaság ekkora
  korTalalkozas: 0.5,       // egy állandó társaság ekkora eséllyel jön össze körönként
  elSuly: 1,                // ⭐⭐ a séta csak ennyiszer ismételt élen lép (1 = mindegyiken)
  // ⭐⭐ A KÉT LÉPCSŐ (D56–D59) — a `LEPCSO=1` móddal mérhető
  tanusitasKell: 3,         // ennyi tanúsítás kell a 2. lépcsőhöz (a pénztárcához)
  felhatalmazasKell: 5,     // ennyi felhatalmazás kell ahhoz, hogy valaki TANÚSÍTHASSON (N)
  felhatalmazasAd: 3,       // ⚠️ egy 2. lépcsős ENNYI embert hatalmaz fel összesen — a
                            //    választás nem véletlen: akit a legjobban ismer
  visszavonas: 0,           // ⭐⭐ 1 = A VISSZACSATOLÁS: a közösség visszavonja a
                            //    felhatalmazást attól, akinél a torlódás feltűnő
  visszavonasKuszob: 10,    // ennyi zsákutca-tanúsítottnál lép működésbe (becsületes: ~0,3)
  visszavonasKeses: 2,      // ⚠️ ennyi kört KÉSIK — mert ez emberi döntés, nem automatizmus
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
    suly: [],               // Map — hányszor találkoztak (az ismétlődés mérésére)
    meghivo: [],            // Set — kik hívták be. Lánc-adat, EZ dönt.
    kiadott: [],            // hány meghívót állított ki (a saját láncából ellenőrizhető)
    megtevesztett: new Set(),
    hamisKezdet: b.valodiEmberek,
    // ⭐ Az önellátás nyomon követése: bejutott hamisonként hány VALÓDI meghívó kellett.
    hamisMeghivoi: [],
    allandoKorok: [],       // ⭐⭐ állandó társaságok (család, munkahely, osztály)
    // ===== A KÉT LÉPCSŐ =====
    lepcso2: [],            // átment-e a 2. lépcsőn (van-e pénztárcája)
    felhatalmazo: [],       // Set — kik hatalmazták fel (csak 2. lépcsősök számítanak)
    tanusitoi: [],          // Set — kik tanúsították (ez a lánc, ezen megyünk vissza)
  };

  for (let i = 0; i < b.valodiEmberek; i++) {
    vilag.valodi.push(true);
    vilag.tag.push(false);
    vilag.alapito.push(false);
    vilag.belepes.push(null);
    vilag.elsoTalalkozas.push(null);
    vilag.bemutatkozas.push(new Set());
    vilag.suly.push(new Map());
    vilag.meghivo.push(new Set());
    vilag.kiadott.push(0);
    vilag.lepcso2.push(false);
    vilag.felhatalmazo.push(new Set());
    vilag.tanusitoi.push(new Set());
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
    // ⭐ Az alapítók a 2. lépcsőn is bent vannak — ez a rekurzió ALAPESETE, nem kivétel.
    vilag.lepcso2[i] = true;
  }
  // Az alapítók a saját környezetükben ismerik egymást (párosával, nem mind-mindet).
  for (let a = 0; a + 1 < b.alapitok; a += 2) {
    bemutatkoznak(vilag, a * tavolsag, (a + 1) * tavolsag);
  }

  // ===== ⭐⭐ ÁLLANDÓ TÁRSASÁGOK — a valódi élet alakja =====
  //
  // ⚠️ EZT A MÉRÉS KÖVETELTE KI (2026-09-06). Az ismétlődés-szűrő mérésekor kiderült, hogy
  // az eredeti világ CSUPA EGYSZERI TALÁLKOZÁSBÓL áll: a találkozók véletlen embereket
  // hívnak össze egy környékről, tehát ugyanazzal az emberrel ritkán találkozol kétszer.
  // Ilyen világban „a sokszor ismételt él" fogalma üres — a szűrő MINDENKIT leszakít
  // (mérve: 81–89% becsületes tévesen). ⭐ A valóságban viszont van család, munkahely,
  // osztály: néhány ember, akivel hetente találkozol.
  //
  // Mindenki KÉT társasághoz tartozik — ettől lesz a „sok találkozású" gráf ÖSSZEFÜGGŐ
  // (aki két körben is benne van, az köti össze a kettőt), különben a séta a saját
  // társaságában ragadna.
  if (b.allandoKorok) {
    const hanyKor = Math.ceil((b.valodiEmberek * 2) / b.korMeret);
    for (let c = 0; c < hanyKor; c++) {
      const kor = [];
      // A társaság fele helyi (szomszédok a „földrajzon"), és van pár távoli tagja is —
      // a kis világ tulajdonság enélkül elveszne.
      const kozep = Math.floor(veletlen() * b.valodiEmberek);
      for (let t = 0; t < b.korMeret; t++) {
        const tavoli = veletlen() < b.tavoliArany;
        const eltolas = tavoli
          ? Math.floor(veletlen() * b.valodiEmberek)
          : Math.floor((veletlen() - 0.5) * 2 * b.talalkozoSugar);
        kor.push((kozep + eltolas + b.valodiEmberek) % b.valodiEmberek);
      }
      vilag.allandoKorok.push([...new Set(kor)]);
    }
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
  vilag.suly.push(new Map());
  vilag.meghivo.push(new Set());
  vilag.kiadott.push(0);
  vilag.lepcso2.push(false);
  vilag.felhatalmazo.push(new Set());
  vilag.tanusitoi.push(new Set());
  return i;
}

// ===================================
// A KÉT ÉL
// ===================================

/**
 * ⭐ BEMUTATKOZÁS — kölcsönös, ingyenes, tagság nélkül is. Ez a tenger.
 *
 * ⭐⭐ AZ ISMÉTLŐDÉS (Csaba, 2026-09-06): minden él egy SÚLYT is gyűjt — hányszor
 * találkoztak. Egy kollégával kétszáz nap alatt kétszázszor; egy pályaudvari átutazóval
 * egyszer. A jelzés ezután futtatható úgy, hogy csak a sokszor ismételt él számítson
 * (`elSuly`), és ez a mérés kérdése: élesíti-e ez a képet?
 */
function bemutatkoznak(vilag, a, b) {
  if (a === b) return;
  vilag.bemutatkozas[a].add(b);
  vilag.bemutatkozas[b].add(a);
  vilag.suly[a].set(b, (vilag.suly[a].get(b) ?? 0) + 1);
  vilag.suly[b].set(a, (vilag.suly[b].get(a) ?? 0) + 1);
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

  // ⭐⭐ ELŐBB AZ ÁLLANDÓ TÁRSASÁGOK: ezek adják az ISMÉTLŐDŐ éleket. Csak a TAGOK
  // találkoznak így — a kívülállók a rendes találkozókon keresztül jönnek be.
  for (const tarsasag of vilag.allandoKorok) {
    if (vilag.veletlen() > b.korTalalkozas) continue;
    const jelen = tarsasag.filter((i) => vilag.tag[i]);
    for (let a = 0; a < jelen.length; a++) {
      for (let c = a + 1; c < jelen.length; c++) bemutatkoznak(vilag, jelen[a], jelen[c]);
    }
  }

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

    // ⭐⭐ KÉT TÁMADÓI STRATÉGIA, ÉS EZ A MÉRÉS LÉNYEGE:
    //
    //   OLCSÓ (alap)      — a saját hamisait használja meghívónak, mert az ingyen van.
    //                       Ettől viszont a szigete LESZAKAD a valódi világról, és a séta
    //                       tökéletesen látja.
    //   ⭐ REJTŐZKÖDŐ     — valódi (megtévesztett) embereket használ meghívónak MINDIG,
    //                       akkor is, ha nem kötelező. Ez semmivel sem kerül többe (a
    //                       megtévesztettek megvannak), viszont MINDEN hamisat egy valódi
    //                       emberhez köt — és ettől a hamis úgy néz ki, mint egy frissen
    //                       érkezett becsületes ember.
    //
    // ⚠️ Az első mérésekben CSAK az olcsó támadó szerepelt, ezért a V2/V4 „100% / 0%"
    // eredménye kedvezőbb volt a valóságnál. Ez a kapcsoló javítja ki.
    const sorrend = b.rejtozo ? [valodiJogosult, sajat] : [sajat, valodiJogosult];

    let valodiKellett = 0;
    const hivok = [];
    for (const lista of sorrend) {
      for (const ki of lista) {
        if (hivok.length >= valtozat.kellMeghivo) break;
        hivok.push(ki);
        if (ki < b.valodiEmberek) valodiKellett++;
      }
    }
    // ⭐ A rejtőzködő akkor is köt egy valódi embert a hamishoz, ha meghívó nem kellett
    // tőle (pl. a nyílt változatban) — a láthatatlanság ára nála nulla.
    if (b.rejtozo && valodiJogosult.length) {
      bemutatkoznak(vilag, valodiJogosult[p % valodiJogosult.length], uj);
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

  // ⭐⭐ A KITARTÓ TÁMADÓ: minden körben ÚJRA jelöli a meglévő bemutatkozásait, hogy az
  // élei „sokszor ismételtnek" látszódjanak. Ez a válasz Csaba ismétlődés-ötletére: ha a
  // jelölés puszta bejegyzés, akkor a támadó ugyanúgy fel tudja pörgetni a számlálót —
  // csak IDŐT kell rászánnia. A mérés kérdése: mennyit ér az idő-költség egyedül.
  if (b.kitarto) {
    for (const h of hamisak) {
      if (!vilag.tag[h]) continue;
      for (const sz of [...vilag.bemutatkozas[h]]) bemutatkoznak(vilag, h, sz);
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

function szomszedok(vilag, i, kellSuly) {
  const lista = [];
  const kell = kellSuly ?? vilag.b.elSuly;
  for (const sz of vilag.bemutatkozas[i]) {
    if (!vilag.tag[sz]) continue;
    // ⭐⭐ AZ ISMÉTLŐDÉS SZŰRŐJE: az egyszeri találkozás nem visz tovább, ha `elSuly` > 1.
    if (kell > 1 && (vilag.suly[i].get(sz) ?? 0) < kell) continue;
    lista.push(sz);
  }
  return lista;
}

function setaVege(vilag, kezdo, hossz, kellSuly) {
  let hol = kezdo;
  for (let l = 0; l < hossz; l++) {
    const szomszed = szomszedok(vilag, hol, kellSuly);
    if (!szomszed.length) return hol;
    hol = szomszed[Math.floor(vilag.veletlen() * szomszed.length)];
  }
  return hol;
}

function setaHalmaz(vilag, kezdo, db, hossz, kellSuly) {
  const hol = new Set();
  for (let s = 0; s < db; s++) hol.add(setaVege(vilag, kezdo, hossz, kellSuly));
  return hol;
}

/** A JELZÉS: hány ponton ér össze a két ember sétáinak halmaza? (0 = sehol) */
function tengerTalalkozas(vilag, en, o, db, hossz, kellSuly) {
  const enyem = setaHalmaz(vilag, en, db, hossz, kellSuly);
  const ove = setaHalmaz(vilag, o, db, hossz, kellSuly);
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

/**
 * ⭐⭐ A TORLÓDÁS — a jelzés, ami NEM a hamisakat nézi, hanem azokat, akiken lógnak.
 *
 * A 11.3/b mérés mutatta meg, hogy hol a rés: ha a támadó minden hamisat egy valódi
 * emberhez köt, a hamis pont úgy néz ki, mint egy frissen érkezett becsületes ember.
 * ⭐ De akkor az a NÉHÁNY valódi ember visz el mindent — három ember, fejenként ~293
 * bemutatkozással olyanok felé, akiknek nincs más ismerősük.
 *
 * Két alakban mérjük, mert a kettő nem ugyanaz:
 *   · KOINO-SZINTŰ (D49/c-vel megfér): a bemutatkozások hányad része koncentrálódik a
 *     `hany` legtöbbet bemutatkozó emberre? Ez a koinóról szól, nem emberekről.
 *   · SZEMÉLYES (⚠️ D49/c-vel ÜTKÖZIK): hány „zsákutca-ismerőse" van valakinek — olyan,
 *     akinek rajta kívül nincs más ismerőse. Ezt csak azért mérjük, hogy lássuk, ELVÁLNA-E
 *     egyáltalán; a beépítése külön döntés, mert ez már személyre szóló jelzés.
 */
function torlodas(vilag, hany) {
  const b = vilag.b;
  const fokok = [];
  let osszes = 0;
  for (let i = 0; i < b.valodiEmberek; i++) {
    if (!vilag.tag[i]) continue;
    fokok.push(vilag.bemutatkozas[i].size);
    osszes += vilag.bemutatkozas[i].size;
  }
  if (!osszes) return 0;
  fokok.sort((a, c) => c - a);
  const elso = fokok.slice(0, hany).reduce((a, c) => a + c, 0);
  return elso / osszes;
}

/**
 * Hány „zsákutca-ismerőse" van? — olyan, akinek rajta kívül legfeljebb `fok` ismerőse van.
 *
 * ⚠️ A `fok` küszöb NEM részletkérdés: `fok = 1`-nél a jelzés tökéletesen elválik ott, ahol
 * a támadó minden hamisat EGY valódi emberhez köt — és teljesen elnémul, ha KETTŐHÖZ köti.
 * Ezért mérjük több küszöbbel: egy jelzés, ami egy küszöbön áll vagy bukik, törékeny.
 */
function zsakutcaIsmerosok(vilag, i, fok = 1) {
  let db = 0;
  for (const sz of vilag.bemutatkozas[i]) {
    if (!vilag.tag[sz]) continue;
    let masIsmeros = 0;
    for (const t of vilag.bemutatkozas[sz]) {
      if (t !== i && vilag.tag[t]) masIsmeros++;
    }
    if (masIsmeros < fok) db++;
  }
  return db;
}

/**
 * ⭐⭐ A KÉT LENCSE — a sima séta és az ISMÉTLŐDÉS-szűrős séta, EGYÜTT.
 *
 * Csaba kérdése (2026-09-06): ér-e többet a kettő együtt, mint külön? És a mérce, amihez
 * mérjük: *„ha nem növeli meg annyival a támadó lebukási esélyét, akkor ne bonyolítsunk."*
 *
 * Négy olvasatot adunk vissza, MINDET ugyanazon a világon, ugyanazokra a párokra:
 *   · 1. lencse — a sima séta (minden élen lép)
 *   · 2. lencse — csak a `elSuly`-szor ismételt élen lép
 *   · MINDKETTŐ (ÉS) — óvatos: csak akkor jelöl, ha mindkét lencse leszakadtnak látja
 *   · BÁRMELYIK (VAGY) — bátor: ha akármelyik leszakadtnak látja
 */
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

  // ⭐⭐ A HARMADIK LENCSE — a torlódás, személyre fordítva.
  //
  // A 11.6 azt mérte, hogy a MEGTÉVESZTETT ember sok zsákutca-ismerőst cipel. Ahhoz, hogy
  // ez a másik két lencse mellé álljon, ugyanarra a személyre kell mondania valamit:
  // ⭐ „azon lógok-e, aki egy csapatnyi zsákutcát cipel?" — vagyis a szomszédaim közül a
  // legterheltebb hány zsákutca-ismerőst visz. Egy frissen érkezett becsületes ember egy
  // normális tagon lóg (kevés zsákutca); egy hamis azon a néhány emberen, akire a támadó
  // az egész szigetét aggatta.
  const zsMemo = new Map();
  const zsak = (i) => {
    if (!zsMemo.has(i)) zsMemo.set(i, zsakutcaIsmerosok(vilag, i, 3));
    return zsMemo.get(i);
  };
  const harmadik = (cel) => {
    let legnagyobb = 0;
    for (const sz of vilag.bemutatkozas[cel]) {
      if (!vilag.tag[sz]) continue;
      const ertek = zsak(sz);
      if (ertek > legnagyobb) legnagyobb = ertek;
    }
    return legnagyobb;
  };

  // ⭐ FONTOS: mind a három lencse UGYANARRA a párra fut, hogy az ÉS/VAGY összevethető legyen.
  const parok = (celok) => {
    const lista = [];
    for (const cel of celok) {
      const harom = harmadik(cel);
      for (const kerdezo of kerdezok) {
        if (kerdezo === cel) continue;
        lista.push({
          egy: tengerTalalkozas(vilag, kerdezo, cel, b.setaDb, b.setaHossz, 1),
          ket: tengerTalalkozas(vilag, kerdezo, cel, b.setaDb, b.setaHossz, b.elSuly),
          harom,
        });
      }
    }
    return lista;
  };

  const vPar = parok(vMinta);
  const hPar = parok(hMinta);

  /**
   * A legjobb küszöb egy lencséhez: a legnagyobb (elkapva − tévesen) különbség.
   * ⚠️ Az irány lencsénként más: a séta-lencséknél a KEVÉS a gyanús („nem értünk össze"),
   * a torlódás-lencsénél a SOK („olyanon lóg, aki egy csapatnyi zsákutcát cipel").
   */
  const legjobbKuszob = (mezo, felfele) => {
    let legjobb = { josag: -1, kuszob: 0 };
    const ertekek = [...new Set([...vPar, ...hPar].map((x) => x[mezo]))].sort((a, c) => a - c);
    const talal = (x, kuszob) => (felfele ? x[mezo] >= kuszob : x[mezo] <= kuszob);
    for (const kuszob of ertekek) {
      const elkapva = hPar.filter((x) => talal(x, kuszob)).length / hPar.length;
      const tevesen = vPar.filter((x) => talal(x, kuszob)).length / vPar.length;
      if (elkapva - tevesen > legjobb.josag) legjobb = { josag: elkapva - tevesen, kuszob };
    }
    return legjobb.kuszob;
  };

  const k1 = legjobbKuszob('egy', false);
  const k2 = legjobbKuszob('ket', false);
  const k3 = legjobbKuszob('harom', true);
  const arany = (lista, felt) => (lista.length ? lista.filter(felt).length / lista.length : 0);

  const l1 = (x) => x.egy <= k1;
  const l2 = (x) => x.ket <= k2;
  const l3 = (x) => x.harom >= k3;
  const jelol = {
    egy: l1,
    ket: l2,
    harom: l3,
    es: (x) => l1(x) && l2(x) && l3(x),
    // ⭐ A KETTŐ A HÁROMBÓL: nem kell mindegyiknek egyetértenie, de egyedül egyik sem dönt.
    tobbseg: (x) => [l1(x), l2(x), l3(x)].filter(Boolean).length >= 2,
    vagy: (x) => l1(x) || l2(x) || l3(x),
  };
  const eredmeny = {};
  for (const [nev, felt] of Object.entries(jelol)) {
    eredmeny[nev] = { elkapva: arany(hPar, felt), tevesen: arany(vPar, felt) };
  }
  return eredmeny;
}

/**
 * ⭐⭐ A KITARTÓ TÁMADÓ DIAGNOSZTIKÁJA — miért nem nyert az újrajelöléssel?
 *
 * ⚠️ Ez azért kell, mert a 11.8 mérésben a kitartó támadó SEMMIT nem nyert, és ezt nem
 * tudtuk megmagyarázni. Egy szám, aminek nem ismerjük az okát, nem tudás — a projektben
 * ez már többször megbosszulta magát. Két gyanú, mindkettő mérhető:
 *
 *   H1 — a hidak GYENGÉK maradnak: a legtöbb hamis későn születik, tehát az élük nem
 *        gyűjt elég ismétlést a futás végéig.
 *   H2 — ⭐ a hidak ERŐSEK, de hiába: a megtévesztett ember saját környezete is
 *        elhamisodik (több száz hamis szomszéd), tehát a séta a hídon átlépve VISSZAESIK
 *        a szigetbe. Ekkor a támadó saját tömege veri meg őt.
 */
function kitartoDiagnosztika(vilag) {
  const b = vilag.b;
  const kell = b.elSuly;
  let hidak = 0;
  let erosHidak = 0;
  let hidSulyOsszeg = 0;
  for (let i = vilag.hamisKezdet; i < vilag.tag.length; i++) {
    if (!vilag.tag[i]) continue;
    for (const sz of vilag.bemutatkozas[i]) {
      if (sz >= b.valodiEmberek || !vilag.tag[sz]) continue;
      hidak++;
      const suly = vilag.suly[i].get(sz) ?? 0;
      hidSulyOsszeg += suly;
      if (suly >= kell) erosHidak++;
    }
  }

  // ⭐ H2: a megtévesztett emberek szomszédságának hányad része HAMIS?
  let hamisArany = 0;
  let erosHamisArany = 0;
  let db = 0;
  for (const m of vilag.megtevesztett) {
    let osszes = 0;
    let hamis = 0;
    let erosOsszes = 0;
    let erosHamis = 0;
    for (const sz of vilag.bemutatkozas[m]) {
      if (!vilag.tag[sz]) continue;
      osszes++;
      const eros = (vilag.suly[m].get(sz) ?? 0) >= kell;
      if (eros) erosOsszes++;
      if (sz >= b.valodiEmberek) { hamis++; if (eros) erosHamis++; }
    }
    if (osszes) { hamisArany += hamis / osszes; db++; }
    if (erosOsszes) erosHamisArany += erosHamis / erosOsszes;
  }
  return {
    hidak,
    erosHidak,
    atlagHidSuly: hidak ? hidSulyOsszeg / hidak : 0,
    erosHidArany: hidak ? erosHidak / hidak : 0,
    megtevHamisArany: db ? hamisArany / db : 0,
    megtevErosHamisArany: db ? erosHamisArany / db : 0,
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


// ===================================
// A KET LEPCSO (D56-D59) — es a lanc alakja
// ===================================
//
// Csaba szerkezete: az 1. lepcso olcso (egy meghivo, es minden mehet), a 2. lepcso draga
// (harom tanusitas felhatalmazott tanusitotol) — mert ott van a penztarca.
//
// CSABA ALLITASA, AMIT EZ MER (2026-09-06): "nem lenne annyira szerteagazo es mely, mivel
// nincsen szabad tanusitgatas, ezert kozepre fognak mutatni a lancok, ahol meg mar
// osszefutasok lesznek." — vagyis a gyokerig meno ellenorzes talan nem is draga.
// FIGYELEM: ez GRAF-ALLITAS, tehat merheto, nem vitathato.

/** Felhatalmazas: 2. lepcsos e-emberek jelolik ki, kiben biznak tanusitokent. */
function felhatalmazasokKore(vilag) {
  const b = vilag.b;
  if (!vilag.felhatalmazottjai) vilag.felhatalmazottjai = [];
  for (let i = 0; i < b.valodiEmberek; i++) {
    if (!vilag.lepcso2[i]) continue;
    if (!vilag.felhatalmazottjai[i]) vilag.felhatalmazottjai[i] = new Set();
    const sajat = vilag.felhatalmazottjai[i];
    if (sajat.size >= b.felhatalmazasAd) continue;

    // ⚠️ A VÁLASZTÁS NEM VÉLETLEN, ÉS NEM IS MINDENKI: azt hatalmazom fel, akit a
    // LEGJOBBAN ismerek — akivel a legtöbbször találkoztam (a `suly`, amit már mérünk).
    //
    // ⚠️⚠️ AZ ELSŐ VÁLTOZAT EZT NEM KORLÁTOZTA: mindenki felhatalmazott mindenkit, akivel
    // találkozott — és ettől MINDENKI tanúsító lett (1428 az 1429-ből). A mechanizmus,
    // amit mérni akartunk, ebben a világban NEM IS LÉTEZETT. A lánc-alak mért száma is
    // értelmetlen volt, mert egy olyan gráfban mértük, ahol nincs szűk tanúsítói kör.
    const jeloltek = [];
    for (const sz of vilag.bemutatkozas[i]) {
      if (!vilag.tag[sz] || sz >= b.valodiEmberek) continue;
      if (sajat.has(sz)) continue;
      jeloltek.push([sz, vilag.suly[i].get(sz) ?? 0]);
    }
    jeloltek.sort((a, c) => c[1] - a[1]);
    for (const [sz] of jeloltek) {
      if (sajat.size >= b.felhatalmazasAd) break;
      sajat.add(sz);
      // Emberenként CSAK EGY — a Set gondoskodik róla.
      vilag.felhatalmazo[sz].add(i);
    }
  }
}

/** Tanusithat-e? — a felhatalmazoi kozul hany 2. lepcsos, es eleri-e az N-t. */
function tanusithat(vilag, i) {
  // ⭐⭐ A VISSZACSATOLÁS: akitől a közösség visszavonta a megbízást, az nem tanúsíthat —
  // akkor sem, ha alapító. Ez Csaba szerkezetének a lelke: nem a kapu véd, hanem az,
  // hogy a rossz tanúsítót ELVESZÍTI a szerepét.
  if (vilag.visszavont && vilag.visszavont.has(i)) return false;
  if (vilag.alapito[i]) return true;
  if (!vilag.lepcso2[i]) return false;
  let db = 0;
  for (const f of vilag.felhatalmazo[i]) if (vilag.lepcso2[f]) db++;
  return db >= vilag.b.felhatalmazasKell;
}

/**
 * ⭐⭐ A TANÚSÍTÓI TORLÓDÁS — a jelzés, ami a MEGVETT TANÚSÍTÓT mutatja meg.
 *
 * ⚠️⚠️ AZ ELSŐ VÁLTOZATOM ROSSZ GRÁFON MÉRT, és ezért egyszer sem szólalt meg. A
 * `zsakutcaIsmerosok` a BEMUTATKOZÁSI gráfot nézi — de a megvett tanúsító **nem mutatkozik
 * be** a hamisaknak, csak **tanúsítja** őket. A mintázat tehát nem ott van, ahol kerestem.
 *
 * ⭐ A helyes kérdés: *„azok közül, akiket TANÚSÍTOTTAM, hánynak nincs önálló élete a
 * közösségben?"* — a becsületes tanúsító olyanokat tanúsít, akikkel találkozott, tehát
 * akiknek van saját ismeretségük; a megvett tanúsító üres azonosságokat.
 */
function tanusitottZsakutcak(vilag, i) {
  const b = vilag.b;
  const kik = vilag.tanusitottjai?.[i];
  if (!kik) return 0;
  let db = 0;
  for (const k of kik) {
    let ismerosok = 0;
    for (const sz of vilag.bemutatkozas[k]) if (vilag.tag[sz]) ismerosok++;
    if (ismerosok < 3) db++;
  }
  return db;
}

/**
 * ⭐⭐ A VISSZAVONÁS KÖRE — a jelzésből következmény lesz, emberi késleltetéssel.
 *
 * A jelzés ugyanaz a KONTRASZT, amit a 11.6/11.13-ban 100%-osnak mértünk: hány olyan
 * embert tanúsított, akinek nincs más ismerőse. A becsületes tanúsítónál ez ~0,3;
 * a megvett tanúsítónál több száz.
 *
 * ⚠️ KÉSLELTETVE, mert ez EMBERI döntés: a közösségnek észre kell vennie, meg kell
 * beszélnie, és újra kell osztania a megbízásokat. A `visszavonasKeses` ezt a lassúságot
 * modellezi — enélkül a mérés hazudna, mert azonnali, automatikus védelmet mutatna.
 */
function visszavonasKore(vilag, kor) {
  const b = vilag.b;
  if (!b.visszavonas) return 0;
  if (!vilag.visszavont) { vilag.visszavont = new Set(); vilag.gyanus = new Map(); }

  let ujak = 0;
  for (let i = 0; i < b.valodiEmberek; i++) {
    if (vilag.visszavont.has(i)) continue;
    if (!tanusithat(vilag, i)) continue;
    const jel = tanusitottZsakutcak(vilag, i);
    if (jel < b.visszavonasKuszob) { vilag.gyanus.delete(i); continue; }
    // Feljegyezzük, MIKOR lett feltűnő — és csak a késleltetés után vonjuk vissza.
    if (!vilag.gyanus.has(i)) vilag.gyanus.set(i, kor);
    if (kor - vilag.gyanus.get(i) >= b.visszavonasKeses) {
      vilag.visszavont.add(i);
      ujak++;
    }
  }
  return ujak;
}

/** A 2. lepcso kore: a felhatalmazott tanusitok tanusitjak, akikkel talalkoztak. */
function tanusitasokKore(vilag) {
  const b = vilag.b;
  const tanusitok = [];
  for (let i = 0; i < b.valodiEmberek; i++) if (tanusithat(vilag, i)) tanusitok.push(i);

  if (!vilag.tanusitottjai) vilag.tanusitottjai = [];
  for (const t of tanusitok) {
    if (!vilag.tanusitottjai[t]) vilag.tanusitottjai[t] = new Set();
    for (const sz of vilag.bemutatkozas[t]) {
      if (!vilag.tag[sz] || vilag.lepcso2[sz]) continue;
      vilag.tanusitoi[sz].add(t);
      vilag.tanusitottjai[t].add(sz);
    }
  }
  let ujak = 0;
  for (let i = 0; i < vilag.tag.length; i++) {
    if (vilag.lepcso2[i] || !vilag.tag[i]) continue;
    if (vilag.tanusitoi[i].size >= b.tanusitasKell) { vilag.lepcso2[i] = true; ujak++; }
  }
  return ujak;
}

/**
 * A LANC ALAKJA — ennyibe kerul VALOBAN a gyokerig meno ellenorzes.
 *
 * Visszafele jarjuk a tanusitoi lancot az alapitokig, es ket szamot merunk:
 *   - OS-HALMAZ: hany KULONBOZO embert kell egyaltalan megnezni (gyorsitotarral,
 *     vagyis mindenkit csak egyszer). EZ a valodi ar.
 *   - MELYSEG: hany szint az alapitokig.
 * A ketto kulonbsege a lenyeg: ha a lancok "kozepre" futnak ossze, az os-halmaz
 * NAGYSAGRENDDEL kisebb, mint amit a 3^melyseg sejtetne.
 */
function lancMerese(vilag, kezdo) {
  const latott = new Set([kezdo]);
  let szint = [kezdo];
  let melyseg = 0;
  while (szint.length) {
    const kovetkezo = [];
    for (const i of szint) {
      if (vilag.alapito[i]) continue;          // a gyoker: itt megall
      for (const t of vilag.tanusitoi[i]) {
        if (latott.has(t)) continue;           // a gyorsitotar: mindenkit egyszer
        latott.add(t);
        kovetkezo.push(t);
      }
    }
    if (!kovetkezo.length) break;
    szint = kovetkezo;
    melyseg++;
  }
  return { osHalmaz: latott.size - 1, melyseg };
}

/** Egy teljes futas a ket lepcsovel. */
function lepcsoFuttatas(megtevesztettSzam, mag) {
  const b = BEALLITAS;
  const vilag = ujVilag(b, veletlenGenerator(mag));
  const valtozat = { nev: 'ket lepcso', kellMeghivo: 1, hivoFeltetel: 'tag' };

  for (let kor = 0; kor < b.korok; kor++) {
    vilag.aktualisKor = kor;
    talalkozokKore(vilag, kor);
    meghivasokKore(vilag, valtozat);
    valodiakFelvetele(vilag, valtozat, kor);
    felhatalmazasokKore(vilag);
    tanusitasokKore(vilag);

    if (kor === b.tamadasKezdete) megtevesztettekValasztasa(vilag, megtevesztettSzam);
    if (kor >= b.tamadasKezdete) {
      tamadoKore(vilag, valtozat);
      // A tamado a 2. lepcsore is tor: a megvett TANUSITOK tanusitjak a hamisait.
      const megtevTanusitok = [...vilag.megtevesztett].filter((m) => tanusithat(vilag, m));
      for (let i = vilag.hamisKezdet; i < vilag.tag.length; i++) {
        if (!vilag.tag[i] || vilag.lepcso2[i]) continue;
        for (const t of megtevTanusitok) {
          vilag.tanusitoi[i].add(t);
          if (!vilag.tanusitottjai) vilag.tanusitottjai = [];
          if (!vilag.tanusitottjai[t]) vilag.tanusitottjai[t] = new Set();
          vilag.tanusitottjai[t].add(i);
        }
        if (vilag.tanusitoi[i].size >= b.tanusitasKell) vilag.lepcso2[i] = true;
      }
    }
    // ⭐⭐ A visszacsatolás a kör VÉGÉN fut — a támadó tehát mindig kap egy kört előnyt.
    visszavonasKore(vilag, kor);
  }
  return vilag;
}

function lepcsoMeres() {
  const b = kornyezetbol(BEALLITAS);
  const magok = (process.env.MAGOK ?? '1,2,3,4').split(',').map(Number);
  const megtevesztett = Number(process.env.MEGTEVESZTETT ?? 3);

  kiir('');
  kiir('A KET LEPCSO MERESE (D56-D59) — a penztarca kapuja es a lanc alakja');
  kiir('='.repeat(84));
  kiir('');
  kiir('  ' + b.valodiEmberek + ' ember - ' + b.alapitok + ' alapito - ' + b.korok +
       ' kor - ' + magok.length + ' mag - ' + megtevesztett + ' megtevesztett');
  kiir('  2. lepcso: ' + b.tanusitasKell + ' tanusitas - tanusithat: ' +
       b.felhatalmazasKell + ' felhatalmazas 2. lepcsosoktol');
  kiir('');

  const sorok = [];
  for (const mag of magok) {
    const vilag = lepcsoFuttatas(megtevesztett, mag);
    let tag = 0, lepcso2 = 0, tanusito = 0, hamisTag = 0, hamisLepcso2 = 0;
    for (let i = 0; i < b.valodiEmberek; i++) {
      if (vilag.tag[i]) tag++;
      if (vilag.lepcso2[i]) lepcso2++;
      if (tanusithat(vilag, i)) tanusito++;
    }
    for (let i = vilag.hamisKezdet; i < vilag.tag.length; i++) {
      if (vilag.tag[i]) hamisTag++;
      if (vilag.lepcso2[i]) hamisLepcso2++;
    }

    const jeloltek = [];
    for (let i = b.alapitok; i < b.valodiEmberek; i++) if (vilag.lepcso2[i]) jeloltek.push(i);
    const minta = keverve(vilag, jeloltek).slice(0, 40);
    const mertek = minta.map((i) => lancMerese(vilag, i));
    const atl = (mezo) => (mertek.length
      ? mertek.reduce((o, x) => o + x[mezo], 0) / mertek.length : 0);
    const max = (mezo) => (mertek.length ? Math.max(...mertek.map((x) => x[mezo])) : 0);
    const visszavont = vilag.visszavont ? vilag.visszavont.size : 0;
    sorok.push({ mag, tag, lepcso2, tanusito, hamisTag, hamisLepcso2, visszavont,
                 osAtl: atl('osHalmaz'), osMax: max('osHalmaz'),
                 melyAtl: atl('melyseg'), melyMax: max('melyseg') });
  }

  const atlag = (mezo) => sorok.reduce((o, x) => o + x[mezo], 0) / sorok.length;
  const legnagyobb = (mezo) => Math.max(...sorok.map((x) => x[mezo]));

  kiir('1. A KET LEPCSO — ki jut at, es bejut-e a tamado a penztarcahoz?');
  kiir('-'.repeat(84));
  const sz1 = [36, 14];
  kiir(sor(['', 'atlag'], sz1));
  kiir(sor(['valodi 1. lepcsos (tag)', kerekit(atlag('tag'))], sz1));
  kiir(sor(['valodi 2. lepcsos (penztarca)', kerekit(atlag('lepcso2'))], sz1));
  kiir(sor(['ebbol tanusithat', kerekit(atlag('tanusito'))], sz1));
  kiir(sor(['HAMIS 1. lepcsos', kerekit(atlag('hamisTag'))], sz1));
  kiir(sor(['HAMIS 2. lepcsos (penztarca)', kerekit(atlag('hamisLepcso2'))], sz1));
  if (b.visszavonas) {
    kiir(sor(['visszavont megbizas', kerekit(atlag('visszavont'))], sz1));
  }

  kiir('');
  kiir('2. A LANC ALAKJA — mennyibe kerul a GYOKERIG meno ellenorzes?');
  kiir('-'.repeat(84));
  kiir('   (40 fos minta - a gyorsitotar miatt mindenkit csak EGYSZER nezunk meg)');
  kiir('');
  const sz2 = [36, 14, 14];
  kiir(sor(['', 'atlag', 'legnagyobb'], sz2));
  kiir(sor(['OS-HALMAZ (hany embert kell megnezni)',
            Math.round(atlag('osAtl') * 10) / 10, legnagyobb('osMax')], sz2));
  kiir(sor(['MELYSEG (hany szint az alapitokig)',
            Math.round(atlag('melyAtl') * 10) / 10, legnagyobb('melyMax')], sz2));

  kiir('');
  kiir('='.repeat(84));
  kiir('');
  kiir('MIT KELL NEZNI:');
  kiir('  - HAMIS 2. lepcsos: ha ez nem nulla, a penztarca kapuja lyukas.');
  kiir('  - OS-HALMAZ: EZ a gyokerig meno ellenorzes valodi ara. Ha kicsi marad a');
  kiir('    kozosseg meretehez kepest, akkor Csabanak igaza van: a lancok osszefutnak,');
  kiir('    es NEM KELL melyseg-korlat (D59).');
  kiir('  - valodi 2. lepcsos: no-e egyaltalan a hitelesitettek kore, vagy a');
  kiir('    felhatalmazasi kuszob befagyasztja.');
  kiir('');
}

function main() {
  // A ket lepcso kulon mod, hogy a hat valtozat merese erintetlen maradjon.
  if (process.env.LEPCSO) return lepcsoMeres();
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
  kiir(`   1. lencse: minden él · 2. lencse: csak a ≥${b.elSuly}× ismételt él`);
  kiir('');
  const jelSzel = [24, 12, 12, 12, 13, 13];
  kiir(sor(['változat', '1. séta', '2. ismétlés', '3. torlódás',
            '⭐ 2 A 3-BÓL', 'MIND A 3 (ÉS)'], jelSzel));
  kiir('   ' + '(elkapva / tévesen)'.padStart(30));
  const jelzesEredmeny = {};
  for (const v of VALTOZATOK) {
    const e = vedEredmeny[v.nev];
    const jelzesek = e.eredmenyek
      .map((r, i) => jelzesMerese(r, magok[i]))
      .filter((j) => j !== null);
    jelzesEredmeny[v.nev] = jelzesek;
    if (!jelzesek.length) {
      kiir(sor([v.nev, '— (nincs hamis)', '—', '—', '—'], jelSzel));
      continue;
    }
    const par = (nev) => {
      const el = jelzesek.reduce((o, j) => o + j[nev].elkapva, 0) / jelzesek.length;
      const te = jelzesek.reduce((o, j) => o + j[nev].tevesen, 0) / jelzesek.length;
      return `${szazalek(el)} / ${szazalek(te)}`;
    };
    kiir(sor([v.nev, par('egy'), par('ket'), par('harom'),
              par('tobbseg'), par('es')], jelSzel));
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

  // ===== 5. A TORLÓDÁS — a rés, amit a séta hagyott =====
  kiir('');
  kiir('▶ 5. TORLÓDÁS — feltűnik-e, hogy a hamisak KEVÉS valódi emberen lógnak?');
  kiir('-'.repeat(84));
  kiir('   (a séta a hamisat nézi; ez azt nézi, AKIN lóg — a megtévesztett embert)');
  kiir('');
  const zsFok = Number(process.env.ZSAKUTCA_FOK ?? 1);
  kiir(`   (zsákutca-küszöb: akinek rajtam kívül < ${zsFok} ismerőse van)`);
  kiir('');
  const torSzel = [30, 14, 18, 20];
  kiir(sor(['változat', 'a 8 legnagy.', 'megtév. zsákutcái', '⚠️ becsületes LEGTÖBB'], torSzel));
  for (const v of VALTOZATOK) {
    const e = vedEredmeny[v.nev];
    const ertekek = e.eredmenyek.map((r) => {
      const vilag = r.vilag;
      const megtev = [...vilag.megtevesztett];
      const mas = [];
      for (let i = b.alapitok; i < b.valodiEmberek && mas.length < 300; i++) {
        if (vilag.tag[i] && !vilag.megtevesztett.has(i)) mas.push(i);
      }
      const atlZs = (lista) => (lista.length
        ? lista.reduce((o, i) => o + zsakutcaIsmerosok(vilag, i, zsFok), 0) / lista.length
        : 0);
      // ⚠️ A becsületesek LEGNAGYOBB értéke a lényeg, nem az átlaga: ha egyetlen
      // becsületes ember is a megtévesztettek szintjére ér, a jelzés őt jelölné meg —
      // és épp azt, aki a legtöbb új embert fogadja be.
      const masMax = mas.length
        ? Math.max(...mas.map((i) => zsakutcaIsmerosok(vilag, i, zsFok)))
        : 0;
      return { tor: torlodas(vilag, 8), megtevZs: atlZs(megtev), masMax };
    });
    const atl = (mezo) => ertekek.reduce((o, x) => o + x[mezo], 0) / ertekek.length;
    kiir(sor([
      v.nev,
      szazalek(atl('tor')),
      Math.round(atl('megtevZs') * 10) / 10,
      Math.round(atl('masMax') * 10) / 10,
    ], torSzel));
  }
  // Támadó nélküli alapvonal — enélkül a százalék önmagában semmit nem mond.
  const tisztaTor = arEredmeny['V3 — 2 meghívó + jogosítás'].eredmenyek
    .map((r) => torlodas(r.vilag, 8));
  kiir('');
  kiir(`   Támadó NÉLKÜL (V3, alapvonal): a 8 legnagyobb része ` +
       `${szazalek(tisztaTor.reduce((a, c) => a + c, 0) / tisztaTor.length)}`);

  // ===== 6. A KITARTÓ TÁMADÓ DIAGNOSZTIKÁJA =====
  kiir('');
  kiir('▶ 6. MIÉRT NEM NYERT A KITARTÓ TÁMADÓ? — a két gyanú megmérve');
  kiir('-'.repeat(84));
  kiir(`   H1: gyengék maradnak a hidak?  ·  H2: a megtévesztett környezete is elhamisodik?`);
  kiir('');
  const diagSzel = [26, 14, 16, 24];
  kiir(sor(['változat', 'híd átl. súly', 'ebből ≥ küszöb', 'a megtév. szomszédai hamisak'], diagSzel));
  for (const v of VALTOZATOK) {
    const e = vedEredmeny[v.nev];
    const d = e.eredmenyek.map((r) => kitartoDiagnosztika(r.vilag)).filter((x) => x.hidak > 0);
    if (!d.length) {
      kiir(sor([v.nev, '—', '—', '—'], diagSzel));
      continue;
    }
    const atl = (mezo) => d.reduce((o, x) => o + x[mezo], 0) / d.length;
    kiir(sor([
      v.nev,
      Math.round(atl('atlagHidSuly') * 10) / 10,
      szazalek(atl('erosHidArany')),
      `${szazalek(atl('megtevHamisArany'))} (erős élen: ${szazalek(atl('megtevErosHamisArany'))})`,
    ], diagSzel));
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
