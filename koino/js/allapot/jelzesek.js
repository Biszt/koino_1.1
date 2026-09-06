// koino/js/allapot/jelzesek.js

// Felelősség: TÉNYEKET mutatni a közösségnek — és soha nem dönteni semmiről.
//
// ⭐⭐⭐ EZ A VALÓDI VÉDELEM, NEM A KAPU. A mérések (11–12. szakasz) a nap végére ezt
// hagyták állva: a belépési szám nem véd, a jogosítási küszöb elrejti a szigetet, a séta
// összeomlik sok megtévesztettnél — de a **KONTRASZT** minden támadó-változat és minden
// arány ellen **100% / 9–25%** maradt.
//
// ===== ⭐ A JELZÉS, EGY MONDATBAN =====
//
//   „Hány olyan embert tanúsítottál, akinek NINCS ÖNÁLLÓ ÉLETE a közösségben?"
//
// A becsületes tanúsító olyanokat tanúsít, akikkel találkozott — azoknak van saját
// ismeretségük, saját meghívóik, saját tanúsítóik. A megvett tanúsító **üres
// azonosságokat** tanúsít, akik csak rajta lógnak.
//
// ⭐⭐ ÉS AMIÉRT MŰKÖDIK: nem a NAGY SZÁM kell hozzá, hanem a KONTRASZT. A mérésben a
// legrosszabb becsületes tag **0,3** ilyen embert cipelt, a megvett tanúsító **több
// százat** — tehát a 18 ugyanolyan feltűnő, mint a 293. *A jelzés nem a mérettől él.*
//
// ===== ⛔ HÁROM DOLOG, AMIT EZ A FÁJL SOHA NEM TEHET =====
//
// 1. ⛔ **NEM ÍTÉL.** Csak számokat ad vissza, és soha nem mond olyat, hogy „gyanús".
//    A **D49/b**: *a jelzés tényt mutat, soha nem ítéletet.* Egy „gyanús" mezőből
//    hírnév-rendszer lenne, amit a **D18/1** kizárt.
// 2. ⛔ **NEM DÖNT, ÉS NEM VON MEG JOGOT** (D49/c 2. pont). Attól, hogy valakinek vékony a
//    hálója, semmilyen joga nem csökken. A `szabalyok.js` és az `identitas.js` **nem
//    importálja ezt a fájlt** — és ez ellenőrizhető szabály, nem ígéret.
// 3. ⛔ **NEM VONJA VISSZA A MEGBÍZÁST.** Az emberi döntés (D46): bizonytalanra jelölés,
//    gondolat, javaslat, egyezmény. ⭐ A mérés törvénye szerint a kár **az ébredés
//    idejével** arányos (lineáris), tehát a gépnek az ÉSZREVÉTELT kell gyorsítania —
//    a döntést nem.
//
// ===== 🔍 ÉS MIT CSINÁL EGYMILLIÁRD E-EMBERNÉL? =====
//
// Két korlátos kérdést tesz fel, egyiket sem a közösségre:
//
//   · „ki állított rólam?"        → EGY szelet-lekérdezés (3.2);
//   · „kiről állítottam én?"      → a SAJÁT láncom, ami a saját tevékenységemmel arányos.
//
// ⭐ És egy szép mellékhatás: a számítás ára **arányos a gyanúval**. Egy becsületes
// tanúsítónál tíz-húsz olvasás; aki háromszázat tanúsított, annál háromszáz — és épp ez a
// szám a jelzés maga.
//
// ⚠️ A JELZÉS SZUBJEKTÍV, ÉS EZ RENDBEN VAN. Abból számol, amit ez a készülék ismer. A
// **D49** óta ez megengedett: két készülék MÁST mutathat, mert a jelzés **nem dönt**. (Amíg
// döntött volna, addig ez kizáró ok volt — a 8/d szakasz erről szól.)
//
// Használják: a felület. ⛔ A szabály-réteg SOHA.

import { entitasEsemenyei, sajatLancEsemenyei, esemenyLekerese } from '../tar/esemenyTar.js';

// A rólam szóló, számító állítás-fajták — ugyanaz a három, amit az `identitas.js` néz.
const ALLITASOK = ['Meghivas', 'Felhatalmazas', 'Tanusitas'];

// Hány önálló szál alatt mondjuk azt, hogy „még nincs önálló élete a közösségben"?
//
// ⚠️ EZ MEGJELENÍTÉSI PARAMÉTER, NEM DÖNTÉS. Azért van egyáltalán, mert a jelzést valahol
// meg kell húzni ahhoz, hogy számmá váljon — de semmilyen jogot nem érint. A mérésben
// (11.6) kiderült, hogy **a küszöb nem részletkérdés**: 1-gyel a jelzés elnémult ott, ahol
// a támadó két emberhez kötötte a hamisait, 3-mal viszont megszólalt. Ezért 3.
export const ONALLO_KUSZOB = 3;

// ===================================
// 1. AZ ÖNÁLLÓ SZÁLAK — „van-e önálló élete a közösségben?"
// ===================================

/**
 * Hány KÜLÖNBÖZŐ emberrel van kapcsolata ennek a személynek a láncon?
 *
 * Két irányt számolunk, mert a kettő mást jelent:
 *
 *   · `rolam` — hányan állítottak róla (behívták, felhatalmazták, tanúsították);
 *   · `tole`  — hányról állított ő (kit hívott be, kit tanúsított).
 *
 * ⭐ Egy frissen érkezett becsületes embernél a `rolam` kicsi, de **idővel nő** — egy üres
 * azonosságnál soha nem nő, mert nincs, aki valóban ismerje.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {string} horgony - a vizsgált személy horgonya (`Belepes` vagy `KoinoLetrehozas`)
 * @returns {Promise<{rolam: number, tole: number, osszes: number, ellenorizheto: boolean}>}
 */
export async function onalloSzalak(tar, koino, horgony) {
  console.log('jelzesek.onalloSzalak - KEZDÉS', { horgony });

  const horgonyEsemeny = await esemenyLekerese(tar, horgony);
  if (!horgonyEsemeny || horgonyEsemeny.koino !== koino) {
    // ⚠️ A hiány nem vád (D19) — csak annyit mondunk, hogy nem tudjuk.
    return { rolam: 0, tole: 0, osszes: 0, ellenorizheto: false };
  }
  const en = horgonyEsemeny.szerzo;

  // ----- „KI ÁLLÍTOTT RÓLAM?" — egyetlen szelet-lekérdezés -----
  const szelet = await entitasEsemenyei(tar, koino, horgony);
  const rolam = new Set();
  for (const e of szelet) {
    if (!ALLITASOK.includes(e.tipus)) continue;
    if (e.adat?.kit !== en) continue;   // rólam szóljon
    if (e.szerzo === en) continue;      // magamat nem számolom
    rolam.add(e.szerzo);
  }

  // ----- „KIRŐL ÁLLÍTOTTAM ÉN?" — a saját láncomból -----
  const sajat = (await sajatLancEsemenyei(tar, en)).filter((e) => e.koino === koino);
  const tole = new Set();
  for (const e of sajat) {
    if (!ALLITASOK.includes(e.tipus)) continue;
    const kit = e.adat?.kit;
    if (typeof kit === 'string' && kit !== en) tole.add(kit);
  }

  const eredmeny = {
    rolam: rolam.size,
    tole: tole.size,
    osszes: new Set([...rolam, ...tole]).size,
    ellenorizheto: true
  };
  console.log('jelzesek.onalloSzalak - VÉGE', eredmeny);
  return eredmeny;
}

// ===================================
// 2. ⭐⭐ A TANÚSÍTÓI TORLÓDÁS — a legerősebb jelzés
// ===================================

/**
 * Hány olyan embert tanúsított ez a tanúsító, akinek **nincs önálló élete** a közösségben?
 *
 * ⭐ EZ AZ A SZÁM, AMI A MÉRÉSBEN 100%-ban elválasztotta a megvett tanúsítót a becsületestől
 * (11.13, 12.5). ⚠️ És ami fontos: **nem a hamisat nézi, hanem AKIN LÓG.** A hamis
 * azonosság önmagában úgy néz ki, mint egy frissen érkezett becsületes ember — de az, aki
 * háromszázat tanúsított belőlük, nem néz ki sehogy máshogy.
 *
 * ⚠️ AMIT A SZÁM NEM JELENT: hogy a tanúsító rosszhiszemű. Egy tanár, aki harminc diákot
 * fogad be, átmenetileg ugyanígy néz ki — a különbség **idővel** derül ki, mert a diákok
 * megismerik egymást, a hamis azonosságok nem. ⭐ Ezért a szám mellé mindig oda tartozik,
 * hogy **mióta** tart, és ezért nem a program dönt róla.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {string} horgony - a tanúsító horgonya
 * @param {Object} [beallitas] - { onalloKuszob }
 * @returns {Promise<{tanusitott: number, magukbanAllok: number, ellenorizheto: boolean}>}
 */
export async function tanusitoiTorlodas(tar, koino, horgony, beallitas = {}) {
  console.log('jelzesek.tanusitoiTorlodas - KEZDÉS', { horgony });
  const kuszob = beallitas.onalloKuszob ?? ONALLO_KUSZOB;

  const horgonyEsemeny = await esemenyLekerese(tar, horgony);
  if (!horgonyEsemeny || horgonyEsemeny.koino !== koino) {
    return { tanusitott: 0, magukbanAllok: 0, ellenorizheto: false };
  }
  const en = horgonyEsemeny.szerzo;

  // ----- „KIT TANÚSÍTOTTAM?" — a SAJÁT láncomból, nem a világ átfésüléséből -----
  //
  // ⭐ Ez teszi korlátossá: a saját lánc a saját tevékenységemmel arányos, nem a
  // közösség méretével. ⚠️ Aki elrejti a saját láncát, annál a jelzés „nem ellenőrizhető"
  // lesz — de a hézag maga is jel (`entitasSorszam`), és a csere úgyis hozza.
  const sajat = (await sajatLancEsemenyei(tar, en)).filter((e) => e.koino === koino);

  const tanusitottak = new Map();   // kit → a tanúsított horgonya
  for (const e of sajat) {
    if (e.tipus !== 'Tanusitas') continue;
    const kit = e.adat?.kit;
    if (typeof kit !== 'string' || kit === en) continue;
    if (typeof e.entitas === 'string') tanusitottak.set(kit, e.entitas);
  }

  // ----- ÉS AZ ÉRDEMI KÉRDÉS: HÁNYNAK NINCS MÁS SZÁLA? -----
  let magukbanAllok = 0;
  let hianyzott = false;

  for (const [, tanusitottHorgony] of tanusitottak) {
    const szalak = await onalloSzalak(tar, koino, tanusitottHorgony);
    if (!szalak.ellenorizheto) { hianyzott = true; continue; }

    // ⭐ „RAJTAM KÍVÜL": a saját tanúsításom nem számít bele — különben mindenki, akit
    // tanúsítottam, legalább egy szálat mutatna, és a jelzés elnémulna.
    const nelkulem = Math.max(0, szalak.osszes - 1);
    if (nelkulem < kuszob) magukbanAllok++;
  }

  const eredmeny = {
    tanusitott: tanusitottak.size,
    magukbanAllok,
    ellenorizheto: !hianyzott
  };
  console.log('jelzesek.tanusitoiTorlodas - VÉGE', eredmeny);
  return eredmeny;
}

// ===================================
// 3. ⭐⭐ A MEGBÍZÁS ÉS A HASZNÁLATA — a visszavonás rését ez fedi le (9/c 4.5)
// ===================================

/**
 * Hány felhatalmazása van MOST, és hány tanúsítást adott ÖSSZESEN?
 *
 * ⚠️⚠️ MIÉRT KELL EZ A JELZÉS? Mert a **visszavonás** (4.5) csak előre hat: a már kiadott
 * tanúsítások érvényben maradnak (D47, Csaba döntése). Ez helyes — enélkül néhány ember
 * összebeszélve becsületes emberek tömegétől venné el a pénztárcát.
 *
 * ⛔ **DE NYITVA HAGY EGY RÉST:** aki elveszítette a megbízását, továbbra is **hivatkozhat a
 * régi, visszavont felhatalmazásokra**, és a szabály ezt nem tudja elkapni — globális
 * sorrend nélkül nem eldönthető, hogy a visszavonás előbb volt-e.
 *
 * ⭐ **EZ A JELZÉS VISZONT ELKAPJA**, mert két számot állít egymás mellé:
 *
 *     „ennek a tanúsítónak MOST 2 érvényes felhatalmazása van, mégis 40 tanúsítást adott"
 *
 * Ez **tény**, kiszámítható, és ember dönt róla. *Ugyanaz a munkamegosztás, mint mindenhol:
 * a szabály a minimumot tartja, a jelzés feltár.*
 *
 * @returns {Promise<{felhatalmazasok: number, visszavontak: number, tanusitasok: number,
 *                    ellenorizheto: boolean}>}
 */
export async function megbizasAllapota(tar, koino, horgony) {
  console.log('jelzesek.megbizasAllapota - KEZDÉS', { horgony });

  const horgonyEsemeny = await esemenyLekerese(tar, horgony);
  if (!horgonyEsemeny || horgonyEsemeny.koino !== koino) {
    return { felhatalmazasok: 0, visszavontak: 0, tanusitasok: 0, ellenorizheto: false };
  }
  const en = horgonyEsemeny.szerzo;

  // ----- „KI BÍZTA RÁM A TANÚSÍTÁST, ÉS KI VETTE VISSZA?" — a saját szeletemből -----
  // ⭐ „Az utolsó nyer": mindenkitől a LEGUTÓBBI állítás számít (ugyanaz a szabály, amit
  // az `identitas.js` alkalmaz — a kettőnek egyeznie kell).
  const szelet = await entitasEsemenyei(tar, koino, horgony);
  const utolso = new Map();
  for (const e of szelet) {
    if (e.tipus !== 'Felhatalmazas' && e.tipus !== 'FelhatalmazasVisszavonasa') continue;
    if (e.adat?.kit !== en || e.szerzo === en) continue;
    const sorszam = e.entitasSorszam ?? 1;
    const eddigi = utolso.get(e.szerzo);
    if (!eddigi || sorszam >= eddigi.sorszam) {
      utolso.set(e.szerzo, { sorszam, vissza: e.tipus === 'FelhatalmazasVisszavonasa' });
    }
  }

  let felhatalmazasok = 0;
  let visszavontak = 0;
  for (const [, allapot] of utolso) allapot.vissza ? visszavontak++ : felhatalmazasok++;

  // ----- „HÁNY TANÚSÍTÁST ADTAM?" — a saját láncomból -----
  const sajat = (await sajatLancEsemenyei(tar, en)).filter((e) => e.koino === koino);
  const tanusitottak = new Set();
  for (const e of sajat) {
    if (e.tipus !== 'Tanusitas') continue;
    const kit = e.adat?.kit;
    if (typeof kit === 'string' && kit !== en) tanusitottak.add(kit);
  }

  // ----- ⭐ „MIKOR ISMERTE EL UTOLJÁRA, HOGY LÁT?" (D61) -----
  //
  // A buli-elismerés (`Lattam`) az, ami a tanúsítót elköti amellett, hogy tud a rá
  // vonatkozó visszavonásokról. ⚠️ Aki SOHA nem ismeri el, hogy lát, az nem szeg meg
  // szabályt — de **kilóg a ritmusból**, amit mindenki más tart. Ez tény, és a közösség
  // dönt róla.
  let elismeresek = 0;
  for (const e of sajat) if (e.tipus === 'Lattam') elismeresek++;

  const eredmeny = {
    felhatalmazasok,
    visszavontak,
    tanusitasok: tanusitottak.size,
    elismeresek,
    ellenorizheto: true
  };
  console.log('jelzesek.megbizasAllapota - VÉGE', eredmeny);
  return eredmeny;
}

// ===================================
// AMI SZÁNDÉKOSAN NINCS ITT
// ===================================
//
// - ⛔ NINCS „GYANÚS" MEZŐ, nincs pontszám, nincs rangsor (D49/b, D49/c 1.). A **D55** óta
//   a személyre szóló jelzés megengedett — de a megfogalmazása **soha nem ítélet**:
//   a felületen *„még nem értünk össze"* és *„27-en bízták rá a tanúsítást"* alakban
//   jelenik meg, nem „gyanús"-ként és nem „becsületesség: 27"-ként (D60).
//
// - ⛔ NINCS KÜSZÖB, AMI JOGOT ÉRINT. Az `ONALLO_KUSZOB` csak azt mondja meg, mikor
//   mondjuk azt, hogy „még nincs önálló élete" — és ebből semmi nem következik magától.
//
// - ⛔ NINCS „KEVÉS KAPCSOLATA VAN, TEHÁT GYANÚS" JELZÉS. Ezt háromszor megmértük, és
//   31 / 41 / 45% becsületes tagot jelölt volna meg tévesen — épp a magányost és a frissen
//   érkezettet. Ezért néz ez a fájl a TANÚSÍTÓRA, nem a tanúsítottra.
//
// - A SÉTA (a „bemutatkozások tengere") — a 9/c terv 4.7 lépése, ⏸️ **leminősítve**: sok
//   megtévesztettnél 43–74% / 31–61%, tehát kényelmi jelzés, nem védelem.
