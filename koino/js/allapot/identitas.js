// koino/js/allapot/identitas.js

// Felelősség: megválaszolni HÁROM kérdést az eseményekből — és mindhármat SZÁMÍTÁSSAL,
// nem nyilvántartásból (D17):
//
//   1. TAG-e valaki?            (1. lépcső: egy meghívó)
//   2. TANÚSÍTHAT-e valaki?     (N felhatalmazás 2. lépcsősöktől)
//   3. 2. LÉPCSŐS-e valaki?     (három tanúsítás felhatalmazott tanúsítóktól → pénztárca)
//
// ===== A SZERKEZET, AMIT EZ MEGVALÓSÍT (D56, 2026-09-06) =====
//
//   1. lépcső — a TAGSÁG:    EGY meghívó, és minden mehet (tartalom, tudatpont, szavazat).
//   2. lépcső — a PÉNZTÁRCA: három tanúsítás felhatalmazott tanúsítótól. Ez a D11.
//
// ⚠️ MIÉRT ILYEN OLCSÓ AZ ELSŐ LÉPCSŐ? Mert megmértük, hogy a kapu ÚGYSEM VÉD: a belépési
// szám nem védelmi paraméter, hanem **árcédula**. A fal pontosan ott van, ahol a támadó
// megvett embereinek száma eléri a kért meghívó-számot — az öt-meghívós szabály négy
// megvett embernél 0 hamisat enged be, ötnél 880-at. Nincs átmenet, csak kapcsoló.
// (`meres/eredmenyek.md` 11.1.)
//
// ⭐ A VÉDELEM MÁSHOL VAN: a kontraszt-jelzésben (4.4) és abban, hogy a rossz tanúsító
// ELVESZÍTI a szerepét (4.5). Ez a fájl tehát szándékosan nem véd — csak megállapít.
//
// ===== A HORGONY: MI BIZONYÍTJA A HELYZETET? =====
//
// Mindenkinek van egy „horgonya" ebben a koinóban — egy esemény, ami a helyzetét hordozza:
//
//   · a koino LÉTREHOZÓJÁNAK a `KoinoLetrehozas` eseménye  → ⭐ a rekurzió ALAPESETE;
//   · mindenki másnak a saját `Belepes` eseménye           → ez nyitja meg az ő SZELETÉT.
//
// A róla szóló események — meghívás, felhatalmazás, tanúsítás — mind a horgony SZELETÉBE
// kerülnek. Ettől lesz mindhárom kérdés EGYETLEN szelet-lekérdezés (3.2), akárhányan
// vagyunk. 🔍 *Egymilliárd e-embernél ugyanennyi munka.*
//
// ===== ⭐⭐ ÉS AMIÉRT A LÁNC BEJÁRHATÓ: MINDEN ÁLLÍTÁS HOZZA A BIZONYÍTÉKÁT =====
//
// „Tag volt-e a meghívó?", „tanúsíthatott-e a tanúsító?" — visszafelé mutató kérdések,
// tehát rekurzió. Hogy ne kelljen KERESNI a másik horgonyát (az a lánca végigolvasása
// lenne), az esemény MAGÁVAL HOZZA: az `adat.sajatBelepes` a szerző saját horgonyára mutat.
// ⭐ Ugyanaz a minta, mint a D42 bemondott összegénél: *ahol a tudás elfogy, ott az esemény
// hozza a bizonyítékát.*
//
// ⭐⭐ ÉS MÉRVE OLCSÓ (12.2): a gyökérig menő ellenőrzés 1500 főnél 17,7, 20 000-nél 40,7
// embert érint — **logaritmikus**, kettőzésenként ≈ +6. A láncok „középre" futnak és
// összeérnek, mert nincs szabad tanúsítgatás.
//
// ⚠️ A GYORSÍTÓTÁR NEM KÉNYELEM, HANEM A LÉNYEG. Nélküle a bejárás 3^mélység volna; vele az
// ŐS-HALMAZ mérete, mert mindenkit CSAK EGYSZER nézünk meg.
//
// Használják: az állapot-számítás és a felület (később a szabály-réteg is).

import { esemenyLekerese, entitasEsemenyei } from '../tar/esemenyTar.js';

// ===================================
// A PARAMÉTEREK
// ===================================

// Hány érvényes meghívás kell a TAGSÁGHOZ? ⭐ EGY (D56). Ez nem takarékosság: a mérés
// szerint a magasabb szám csak a BECSÜLETESEKET lassítja (az öt-meghívós szabálynál 30 kör
// alatt 693 tag lett az 1467 helyett, és 451 ember maradt kívül), a támadót viszont nem
// állítja meg, csak egyszeri árat szab neki.
export const MEGHIVO_KELL = 1;

// Hány tanúsítás kell a 2. LÉPCSŐHÖZ (a pénztárcához)?
export const TANUSITAS_KELL = 3;

// ⭐ `N`: hány felhatalmazás kell ahhoz, hogy valaki TANÚSÍTHASSON?
//
// ⚠️ EZ ITT CSAK ALAPÉRTÉK. A **D57/b** szerint `N`-t a közösség mondja ki: a
// paraméter-entitásra adott érték javaslatok mediánja — és javaslatot is csak 2. lépcsős
// tehet. ⭐ Az ILLESZTÉS viszont már most helyes, és ez a lényeg a 9. szabály szerint: a
// számítás egy KÍVÜLRŐL kapott számhoz hasonlít, nem egy rangsorban keresi a helyét.
// *A „felső harmadban vagy-e?" globális tudást kívánna; a „van-e legalább N" csak a saját
// szeletemet.* A közösségi érték bekötése ezért később cserélhető — a hívók változtatása
// nélkül.
export const FELHATALMAZAS_KELL = 5;

// ===================================
// A NÉZET — a gyorsítótár, ami a bejárást olcsóvá teszi
// ===================================

/**
 * Új, üres identitás-nézet.
 *
 * ⭐ MIÉRT SZABAD GYORSÍTÓTÁRAZNI? A **D47** miatt: az ellenőrzés az aláírás pillanatában
 * történik és BEFAGY. Akiről egyszer eldőlt, hogy tag, az soha nem lesz nem-tag — tehát az
 * eredményt örökre meg lehet tartani.
 *
 * ⚠️ DE CSAK A POZITÍVAT. A „nem tag" lehet pusztán annyi, hogy nekünk HIÁNYZIK egy
 * esemény — és amint megérkezik, a válasz megváltozik. A tagadást tehát nem tároljuk el
 * (D19: a hiány nem vád).
 *
 * @param {Object} [beallitas] - a küszöbök felülírása (a közösségi értékek bekötéséhez)
 */
export function ujIdentitasNezet(beallitas = {}) {
  return {
    meghivoKell: beallitas.meghivoKell ?? MEGHIVO_KELL,
    tanusitasKell: beallitas.tanusitasKell ?? TANUSITAS_KELL,
    felhatalmazasKell: beallitas.felhatalmazasKell ?? FELHATALMAZAS_KELL,

    // Kérdésenként külön gyorsítótár — csak a POZITÍV eredmények.
    igenek: new Map(),       // 'tag|<horgony>' → eredmény
    folyamatban: new Set(),  // a körök elleni védelem (lásd lent)
    olvasasok: 0             // hány eseményt kellett megnéznünk (a mérésekhez)
  };
}

// ===================================
// A KÖZÖS VÁZ — mert mind a három kérdés UGYANAZ, más eseménnyel
// ===================================
//
// ⭐⭐ EZ A FÁJL LEGFONTOSABB SZERKEZETI FELISMERÉSE. A három kérdés így néz ki:
//
//   TAG        = van-e a szeletemben MEGHÍVÁS olyantól, aki TAG                (≥ 1)
//   TANÚSÍTHAT = van-e a szeletemben FELHATALMAZÁS olyantól, aki 2. LÉPCSŐS    (≥ N)
//   2. LÉPCSŐS = van-e a szeletemben TANÚSÍTÁS olyantól, aki TANÚSÍTHAT        (≥ 3)
//
// Ugyanaz a mondat háromszor, csak az esemény-típus és a feltétel más. Ezért EGY közös váz
// írja le mindhármat — ha az ellenőrzés szabálya változik, egy helyen változik.

/**
 * A közös kérdés: hány KÜLÖNBÖZŐ, ÉRVÉNYES állító van a szeletemben, aki megfelel a
 * feltételnek?
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {string} horgony - a vizsgált személy horgonya
 * @param {Object} horgonyEsemeny - a horgony már betöltött eseménye
 * @param {string} tipus - 'Meghivas' | 'Felhatalmazas' | 'Tanusitas'
 * @param {Function} feltetel - async (tar, koino, allitóHorgony, nezet) → { tag/igen, ... }
 * @param {Object} nezet
 * @returns {Promise<{db: number, voltNemEllenorizheto: boolean}>}
 */
async function ervenyesAllitok(tar, koino, horgony, horgonyEsemeny, tipus, feltetel, nezet) {
  const szelet = await entitasEsemenyei(tar, koino, horgony);
  nezet.olvasasok += szelet.length;

  const allitok = new Set();
  let voltNemEllenorizheto = false;

  // ⭐⭐ „AZ UTOLSÓ NYER" — a VISSZAVONÁS (9/c 4.5).
  //
  // A felhatalmazás **az enyém**: én adtam, én veszem vissza, egyoldalúan és indoklás
  // nélkül. Ezért nem külön szabály kell hozzá, hanem ugyanaz a minta, amit a tudatpontnál
  // már használunk: *e-emberenként az utolsó nyer.* Ha valakinek a LEGUTÓBBI állítása
  // rólam egy visszavonás, akkor nincs érvényben a felhatalmazása.
  //
  // ⚠️ A sorrendet az `entitasSorszam` adja — az ÁLLÍTÓ saját sorszáma EZEN a szeleten.
  // Ez azért elég, mert csak a SAJÁT állításait kell egymáshoz képest rendezni, és azt a
  // láncát csak ő írhatja. Globális órára nincs szükség.
  const visszavonva = new Map();   // állító → a visszavonásának entitás-sorszáma
  if (tipus === 'Felhatalmazas') {
    for (const e of szelet) {
      if (e.tipus !== 'FelhatalmazasVisszavonasa') continue;
      if (e.adat?.kit !== horgonyEsemeny.szerzo) continue;
      const eddigi = visszavonva.get(e.szerzo) ?? 0;
      visszavonva.set(e.szerzo, Math.max(eddigi, e.entitasSorszam ?? 1));
    }
  }

  for (const e of szelet) {
    if (e.tipus !== tipus) continue;

    // ⭐ A visszavont felhatalmazás nincs érvényben — kivéve, ha UTÁNA újra megadták.
    if (tipus === 'Felhatalmazas' && visszavonva.has(e.szerzo)
        && (e.entitasSorszam ?? 1) < visszavonva.get(e.szerzo)) continue;

    // ----- 1. RÓLAM SZÓLJON -----
    // A `kit` mező a horgony szerzőjére mutasson. Enélkül egy idegen szeletébe tett
    // esemény is beszámítana.
    if (e.adat?.kit !== horgonyEsemeny.szerzo) continue;

    // ----- 2. ⛔ ÖNMAGÁT SENKI NEM ÁLLÍTHATJA -----
    // Enélkül bárki bejuthatna egyetlen saját aláírással.
    if (e.szerzo === horgonyEsemeny.szerzo) continue;

    // ----- 3. AZ ÁLLÍTÓ HORGONYA: az esemény HOZZA, nem keressük -----
    const allitoHorgony = e.adat?.sajatBelepes;
    if (typeof allitoHorgony !== 'string') continue;

    // ⚠️ És ellenőrizzük, hogy a horgony TÉNYLEG az állítóé — különben bárki hivatkozhatna
    // egy tag horgonyára, és a saját állítása az ő helyzetével igazolódna.
    const allitoEsemeny = await esemenyLekerese(tar, allitoHorgony);
    nezet.olvasasok++;
    if (!allitoEsemeny) { voltNemEllenorizheto = true; continue; }
    if (allitoEsemeny.szerzo !== e.szerzo || allitoEsemeny.koino !== koino) continue;

    // ----- 4. ÉS A REKURZIÓ: megfelel-e az állító a feltételnek? -----
    // ⚠️ A feltétel MEGKAPJA az állítás eseményét is — a tanúsításnál ez dönti el, hogy a
    // BEMONDOTT felhatalmazásokra nézünk-e (a múlt befagyasztása), nem a mai állapotra.
    const allapota = await feltetel(tar, koino, allitoHorgony, nezet, e);
    if (!allapota.ellenorizheto) voltNemEllenorizheto = true;
    if (allapota.igen) allitok.add(e.szerzo);   // ⭐ emberenként EGY számít (Set)
  }

  return { db: allitok.size, voltNemEllenorizheto };
}

/**
 * A kérdés-váz: gyorsítótár, kör-védelem, horgony-betöltés, alapeset — mind a három
 * kérdéshez ugyanaz.
 */
async function kerdes(kulcs, tar, koino, horgony, nezet, vizsgalat) {
  const gyorsKulcs = kulcs + '|' + horgony;

  // ----- 1. AMIT MÁR TUDUNK -----
  const kesz = nezet.igenek.get(gyorsKulcs);
  if (kesz) return kesz;

  // ----- 2. ⭐ A KÖR ELLENI VÉDELEM -----
  //
  // Ha „A" behívta „B"-t és „B" behívta „A"-t, akkor egyikük sem vezethető vissza az
  // alapítóig — mégis végtelen körbe futnánk. A megoldás nem hibaüzenet, hanem egy egyszerű
  // igazság: aki már a saját ellenőrzése KÖZBEN kerül elő, az ezen az ágon nem bizonyít
  // semmit. ⚠️ Ezt SOHA nem tároljuk el, mert csak erre az ágra igaz.
  if (nezet.folyamatban.has(gyorsKulcs)) {
    return { igen: false, ok: 'kör a hivatkozási láncban', ellenorizheto: true };
  }
  nezet.folyamatban.add(gyorsKulcs);

  try {
    const esemeny = await esemenyLekerese(tar, horgony);
    nezet.olvasasok++;

    // ----- HIÁNYZÓ ESEMÉNY: NEM VÁD, HANEM „NEM ELLENŐRIZHETŐ" -----
    //
    // ⚠️ Ez a `szabalyok.js` harmadik kategóriája, és itt is ugyanazért kell: a szeletelt,
    // hálózati működésben a HIÁNY a normális átmeneti állapot. Ha elutasításnak vennénk,
    // minden becsületes embert büntetnénk minden lemaradásért.
    if (!esemeny) {
      return { igen: false, ok: 'nem ellenőrizhető: hiányzik a horgony-esemény', ellenorizheto: false };
    }
    if (esemeny.koino !== koino) {
      return { igen: false, ok: 'a horgony egy MÁSIK koinóhoz tartozik', ellenorizheto: true };
    }

    // ----- ⭐ AZ ALAPESET: AZ ALAPÍTÓ KÖR -----
    // Mind a három kérdésre IGEN: az alapítók tagok, tanúsíthatnak, és 2. lépcsősök.
    // ⚠️ Enélkül a 2. lépcső EL SEM TUDNA INDULNI (lásd `alapitoE`).
    if (await alapitoE(tar, koino, horgony, esemeny, nezet)) {
      return { igen: true, ok: 'alapító kör', ellenorizheto: true };
    }

    if (esemeny.tipus !== 'Belepes') {
      return { igen: false, ok: 'a horgony nem belépési esemény', ellenorizheto: true };
    }

    const eredmeny = await vizsgalat(esemeny);
    if (eredmeny.igen) nezet.igenek.set(gyorsKulcs, eredmeny);
    return eredmeny;
  } finally {
    nezet.folyamatban.delete(gyorsKulcs);
  }
}

// ===================================
// ⭐ AZ ALAPÍTÓ KÖR — a rekurzió gyökere
// ===================================

/**
 * Alapító-e? Kétféleképpen lehet valaki az:
 *
 *   · ő hozta létre a koinót — a horgonya maga a `KoinoLetrehozas`;
 *   · a létrehozó MEGNEVEZTE őt az alapítók közt, és a `Belepes`-e erre hivatkozik.
 *
 * ⚠️⚠️ MIÉRT KELL TÖBB ALAPÍTÓ? Mert **egyetlen alapítóval a 2. lépcső el sem tudna
 * indulni**: a pénztárcához három tanúsítás kell, de egy alapító csak egyet tud adni — és
 * új tanúsító sem születhetne, mert ahhoz `N` felhatalmazás kellene 2. lépcsősöktől,
 * akikből szintén csak egy van. ⭐ A koino tehát **születésétől befagyna**.
 *
 * ⭐ Ezért a koino-létrehozás megnevezheti az alapító kört (`adat.alapitok`), és ez a
 * REKURZIÓ ALAPESETE — nem kivétel, hanem a lánc gyökere. *(A régi, alapító-lista nélküli
 * koino-létrehozásoknál a lista üres: csak a létrehozó alapító. Visszafelé kompatibilis.)*
 */
async function alapitoE(tar, koino, horgony, esemeny, nezet) {
  // Ő maga hozta létre a koinót.
  if (esemeny.tipus === 'KoinoLetrehozas') return true;
  if (esemeny.tipus !== 'Belepes') return false;

  // Megnevezett alapító: a belépése az alapítás eseményére hivatkozik.
  const alapitas = esemeny.adat?.alapitas;
  if (typeof alapitas !== 'string') return false;

  const alapitasEsemeny = await esemenyLekerese(tar, alapitas);
  nezet.olvasasok++;
  if (!alapitasEsemeny) return false;
  if (alapitasEsemeny.tipus !== 'KoinoLetrehozas') return false;
  if (alapitasEsemeny.koino !== koino) return false;

  // ⚠️ És tényleg őt nevezték meg — nem elég ráhivatkozni.
  const alapitok = alapitasEsemeny.adat?.alapitok;
  return Array.isArray(alapitok) && alapitok.includes(esemeny.szerzo);
}

// ===================================
// 1. TAG-E? — az 1. lépcső
// ===================================

/**
 * Tag-e az, akinek ez a horgonya? (Egy érvényes meghívás egy tagtól.)
 *
 * @returns {Promise<{igen: boolean, ok: string, ellenorizheto: boolean}>}
 */
export function tagE(tar, koino, horgony, nezet = ujIdentitasNezet()) {
  return kerdes('tag', tar, koino, horgony, nezet, async (esemeny) => {
    const { db, voltNemEllenorizheto } =
      await ervenyesAllitok(tar, koino, horgony, esemeny, 'Meghivas', tagE_, nezet);

    if (db >= nezet.meghivoKell) {
      return { igen: true, ok: db + ' tag hívta be', ellenorizheto: true };
    }
    return {
      igen: false,
      ok: voltNemEllenorizheto
        ? 'nem ellenőrizhető: a meghívási lánc egy része hiányzik'
        : 'nincs érvényes meghívása tagtól',
      ellenorizheto: !voltNemEllenorizheto
    };
  });
}

// ===================================
// 2. TANÚSÍTHAT-E? — a felhatalmazás (D56, D57/b)
// ===================================

/**
 * Tanúsíthat-e? Két feltétel EGYÜTT:
 *
 *   · maga is **2. lépcsős** (nem oszthat jogot, akinek nincs) — ⭐ ez a **D56** zárt
 *     választótestülete, és ⚠️ enélkül a szerkezet megbukna: ha bárki hatalmazhatna fel,
 *     a támadó hamis azonosságai **egymást** hatalmaznák fel, saját tanúsítókat
 *     állítanának, és a pénztárcák megnyílnának. *(Ugyanaz, mint a 880 hamis horgony.)*
 *   · van legalább `N` felhatalmazása **különböző 2. lépcsősöktől** (emberenként egy).
 *
 * ⭐ A felületen ez TÉNYKÉNT jelenik meg (D60): *„27-en bízták rá a tanúsítást"* — soha nem
 * pontszámként, és soha nem „becsületesség"-ként.
 */
export function tanusithatE(tar, koino, horgony, nezet = ujIdentitasNezet()) {
  return kerdes('tanusithat', tar, koino, horgony, nezet, async (esemeny) => {
    // Előbb a saját helyzete: aki nincs bent a 2. lépcsőn, nem tanúsíthat.
    const sajat = await lepcso2E(tar, koino, horgony, nezet);
    if (!sajat.igen) {
      return {
        igen: false,
        ok: 'nem 2. lépcsős, tehát nem tanúsíthat (' + sajat.ok + ')',
        ellenorizheto: sajat.ellenorizheto
      };
    }

    const { db, voltNemEllenorizheto } =
      await ervenyesAllitok(tar, koino, horgony, esemeny, 'Felhatalmazas', lepcso2E_, nezet);

    if (db >= nezet.felhatalmazasKell) {
      return { igen: true, ok: db + '-en bízták rá a tanúsítást', ellenorizheto: true };
    }
    return {
      igen: false,
      ok: db + ' felhatalmazása van a szükséges ' + nezet.felhatalmazasKell + ' helyett',
      ellenorizheto: !voltNemEllenorizheto
    };
  });
}

// ===================================
// 3. 2. LÉPCSŐS-E? — a pénztárca kapuja (D11, D56)
// ===================================

/**
 * 2. lépcsős-e? Három tanúsítás **különböző, felhatalmazott tanúsítóktól**.
 *
 * ⚠️ A tagság (1. lépcső) NEM előfeltétel a számításban — és ez szándékos: a két lépcső
 * két külön kérdés, és a gyakorlatban a tanúsítást úgyis tag kapja. Aki a felületet írja,
 * mindkettőt megkérdezheti.
 */
export function lepcso2E(tar, koino, horgony, nezet = ujIdentitasNezet()) {
  return kerdes('lepcso2', tar, koino, horgony, nezet, async (esemeny) => {
    const { db, voltNemEllenorizheto } =
      await ervenyesAllitok(tar, koino, horgony, esemeny, 'Tanusitas', tanusitoJoga, nezet);

    if (db >= nezet.tanusitasKell) {
      return { igen: true, ok: db + ' tanúsítója van', ellenorizheto: true };
    }
    return {
      igen: false,
      ok: voltNemEllenorizheto
        ? 'nem ellenőrizhető: a tanúsítói lánc egy része hiányzik'
        : db + ' tanúsítása van a szükséges ' + nezet.tanusitasKell + ' helyett',
      ellenorizheto: !voltNemEllenorizheto
    };
  });
}

/**
 * ⭐⭐ VOLT-E JOGA A TANÚSÍTÓNAK, AMIKOR ALÁÍRTA? — a múlt befagyasztása (D47, 9/c 4.5)
 *
 * *Csaba döntése (2026-09-06):* ha valakitől visszavonják a felhatalmazást, **a már kiadott
 * tanúsításai érvényben maradnak**. A visszavonás csak azt éri el, hogy **innentől nem
 * tanúsíthat többet**.
 *
 * ⚠️ ENÉLKÜL KIZÁRÁS-TÁMADÁS LENNE: néhány ember összebeszélve visszavonná a
 * felhatalmazásokat egy tanúsítótól, és ezzel **becsületes emberek tömegétől** venné el a
 * pénztárcát. Pontosan az, ami ellen a D46 megszületett.
 *
 * ⭐ ÉS HOGYAN TUDJUK MEG, MI VOLT IGAZ AKKOR, GLOBÁLIS ÓRA NÉLKÜL? A **D42 mintájával**:
 * a tanúsítás **BEMONDJA**, mire támaszkodott — `adat.felhatalmazasok` a felhatalmazás-
 * események azonosítói. Az események soha nem tűnnek el, tehát a bemondás **örökre
 * ellenőrizhető** marad, akkor is, ha a felhatalmazást azóta visszavonták.
 *
 * ⚠️⚠️ ÉS AZ ŐSZINTE RÉS, AMIT EZ NYITVA HAGY: aki elveszítette a megbízását, **továbbra is
 * hivatkozhat a régi, visszavont felhatalmazásokra**, és a szabály ezt nem tudja elkapni —
 * globális sorrend nélkül nem eldönthető, hogy a visszavonás előbb volt-e. ⭐ **A JELZÉS
 * viszont elkapja:** *„ennek a tanúsítónak most 2 érvényes felhatalmazása van, mégis 40
 * tanúsítást adott"* — ez tény, kiszámítható, és a `jelzesek.js` meg is mutatja.
 * *Ugyanaz a munkamegosztás, mint mindenhol: a szabály a minimumot tartja, a jelzés feltár.*
 */
async function tanusitoJoga(tar, koino, tanusitoHorgony, nezet, tanusitasEsemeny) {
  const tanusito = await esemenyLekerese(tar, tanusitoHorgony);
  nezet.olvasasok++;
  if (!tanusito) {
    return { igen: false, ok: 'nem ellenőrizhető: hiányzik a tanúsító horgonya', ellenorizheto: false };
  }

  // ⭐ AZ ALAPÍTÓ KÖR ELŐSZÖR — ő a rekurzió gyökere, és NINCS mire hivatkoznia.
  //
  // ⚠️ Ezt elsőre a bemondás-ellenőrzés MÖGÉ tettem, és három próba azonnal elbukott: az
  // alapítók tanúsítása „nem mondta be, mire támaszkodott" indokkal esett ki. A gyökeret
  // mindig a feltételek ELŐTT kell megnézni — különben a feltétel a gyökérre is vonatkozna.
  if (await alapitoE(tar, koino, tanusitoHorgony, tanusito, nezet)) {
    return { igen: true, ok: 'alapító kör', ellenorizheto: true };
  }

  const bemondott = tanusitasEsemeny?.adat?.felhatalmazasok;
  if (!Array.isArray(bemondott) || !bemondott.length) {
    return { igen: false, ok: 'a tanúsítás nem mondta be, mire támaszkodott', ellenorizheto: true };
  }

  const adok = new Set();
  let hianyzott = false;

  for (const azonosito of bemondott) {
    if (typeof azonosito !== 'string') continue;
    const f = await esemenyLekerese(tar, azonosito);
    nezet.olvasasok++;
    if (!f) { hianyzott = true; continue; }

    // A bemondott esemény tényleg RÓLA szóló felhatalmazás legyen — nem elég ráhivatkozni.
    if (f.tipus !== 'Felhatalmazas' || f.koino !== koino) continue;
    if (f.entitas !== tanusitoHorgony) continue;
    if (f.adat?.kit !== tanusito.szerzo) continue;
    if (f.szerzo === tanusito.szerzo) continue;      // magát senki nem hatalmazhatja fel

    // A felhatalmazó horgonya: az esemény hozza magával.
    const adoHorgony = f.adat?.sajatBelepes;
    if (typeof adoHorgony !== 'string') continue;
    const ado = await esemenyLekerese(tar, adoHorgony);
    nezet.olvasasok++;
    if (!ado) { hianyzott = true; continue; }
    if (ado.szerzo !== f.szerzo || ado.koino !== koino) continue;

    // ⚠️ ÉS A LÉNYEG: a felhatalmazónak 2. LÉPCSŐSNEK kell lennie (zárt választótestület).
    const allapota = await lepcso2E(tar, koino, adoHorgony, nezet);
    if (!allapota.ellenorizheto) hianyzott = true;
    if (allapota.igen) adok.add(f.szerzo);
  }

  if (adok.size >= nezet.felhatalmazasKell) {
    return { igen: true, ok: adok.size + ' felhatalmazásra támaszkodott', ellenorizheto: true };
  }
  return {
    igen: false,
    ok: hianyzott
      ? 'nem ellenőrizhető: a bemondott felhatalmazások egy része hiányzik'
      : adok.size + ' érvényes felhatalmazást mondott be a szükséges '
        + nezet.felhatalmazasKell + ' helyett',
    ellenorizheto: !hianyzott
  };
}

// ----- A közös váznak átadható alakok (a paraméter-sorrend miatt) -----
const tagE_ = (tar, koino, horgony, nezet) => tagE(tar, koino, horgony, nezet);
const lepcso2E_ = (tar, koino, horgony, nezet) => lepcso2E(tar, koino, horgony, nezet);
const tanusithatE_ = (tar, koino, horgony, nezet) => tanusithatE(tar, koino, horgony, nezet);

// ===================================
// AMI SZÁNDÉKOSAN NINCS ITT
// ===================================
//
// - ⛔ NINCS MÉRET-KÜSZÖB („ekkora közösség fölött szigorítunk"). Az globális szám lenne
//   (hányan vagyunk?), és ugyanazon a 9. szabályon bukna el, mint a Duniter-alak. A kis
//   koino UGYANEZT a kódot futtatja — csak kevesebben vannak benne.
//
// - ⛔ NINCS JOGOSÍTÁSI FELTÉTEL A MEGHÍVÁSHOZ („csak az hívhat, akinek elég…"). Mérve: az
//   ilyen küszöb **elrejti** a hamis szigetet (100% / 0% helyett 91% / 16%), mert arra
//   kényszeríti a támadót, hogy minden hamisat egy VALÓDI emberhez kössön — és attól a
//   hamis pontosan úgy néz ki, mint egy frissen érkezett becsületes ember.
//   ⭐ *Egy teljesítendő küszöb egyben hitelesítő pecsét is.*
//   ⚠️ A 2. lépcsőnél a felhatalmazás MÁS: ott nem a belépést szűrjük, hanem a PÉNZ
//   kapuját — és a védelem ott sem a kapu, hanem a visszavonás (4.5).
//
// - A KONTRASZT-JELZÉS — a 9/c terv 4.4 lépése. **Ez lesz a valódi védelem**, nem ez a fájl.
// - A VISSZAVONÁS — a 4.5 lépés. ⭐ Mérve: a kár 880 → 120, és
//   *kár = a támadó üteme × az ébredés ideje.*
