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
//   1. lépcső — a TAGSÁG:    EGY meghívó, és minden mehet (gondolat, tudatpont, szavazat).
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
// Használják: a **parancssor** (`koino.js` — az AZONOSSÁG szakasz és a hét identitás-parancs)
// és a próbája.
//
// ⚠️⚠️ EZ A SOR SOKÁIG HAZUDOTT (javítva 2026-09-12): azt írta, „az állapot-számítás és a
// felület" — egyik sem használta. Egy másik session kód-átnézése mérte ki, hogy az egyetlen
// importáló a **saját próbája** volt. *Ugyanaz a csapda, amit az `Allaspont`-nál kimondtunk:
// ahol egy mező mást mond, mint amit teszünk, ott előbb-utóbb valaki a mezőt hiszi el.*
//
// ⏸️ A **szabály-réteg** továbbra sem kérdez tagságot, és ez NYITOTT DÖNTÉS (Csaba, 2026-09-12).
// ⛔ Ha egyszer kérdezni fog, a válasz nem lehet „kidobom": P2P-n a *„nem tag"* és a *„még nem
// láttam a bizonyítékát"* ugyanaz — a koinónak van erre szava (`nemEllenorizhetok`, D19).

import { esemenyLekerese, entitasEsemenyei, sajatLancEsemenyei } from '../tar/esemenyTar.js';
// ⭐ D93: a tagság szabálya EGY helyen él (`tagsag.js`) — a szabály-réteg és ez a tár-alapú kérdés ugyanazt hívja.
import { tagsagiIndex, horgonyTagsaga, MELYSEG_KORLAT, TAGSAGI_CSOMAG, PROFIL } from './tagsag.js';
// ⭐ D94: a szúrópróba véletlenje — az ELLENŐRZŐ választ, kriptográfiai véletlennel (nem a bizonyító).
import { randomInt } from 'node:crypto';

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

// ⭐⭐ D94 (Csaba, 2026-10-04 — a 65. mérés után): A 2. LÉPCSŐ IGAZOLÁSA SZÚRÓPRÓBÁVAL.
//
// A teljes bizonyíték (minden tanúsítás és felhatalmazás az alapítókig) közel LINEÁRISAN nő: egymillió 2. lépcsősnél
// ~290 MB. Ezért: ha a teljes ellenőrzés belefér a KERETBE (ennyi esemény-olvasás — helyi mennyiség, nem a koinó
// mérete), az fut, és az ítélet pontos; ha nem, a SZÚRÓPRÓBA (`lepcso2Szuroproba`): a helyi rész teljesen, és
// `SZUROPROBA_SETAK` véletlen út az alapító körig — logaritmikus (~0,9–2,2 MB egymillió 2. lépcsősnél).
export const LEPCSO_KERET = 1000;
export const SZUROPROBA_SETAK = 8;
// ⭐ A 2. LÉPCSŐ BEMONDÁSA (D94, a D47 mintája): a 2. lépcsős a SAJÁT szeletébe aláírva bemondja, mely tanúsításaira
// támaszkodik. ⛔ A szúrópróba CSAK aláírt bemondásokat követ (ezt, és a tanúsító bemondott felhatalmazásait) — a
// szeletbe bárki tehet állítást, és ha az út azok közül sorsolna, egy kulcs-gyűrű a becsületest is elbuktathatná.
export const LEPCSO_BEMONDAS = 'LepcsoBemondas';
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
    olvasasok: 0,            // hány eseményt kellett megnéznünk (a mérésekhez)

    // ⭐ D94: a teljes 2. lépcső-ellenőrzés kerete (esemény-olvasás), a szúrópróba útjainak száma, és a választó
    // (n → 0..n-1; alapból kriptográfiai véletlen — a próbák rögzítettet adhatnak).
    keret: beallitas.keret ?? LEPCSO_KERET,
    setak: beallitas.setak ?? SZUROPROBA_SETAK,
    valaszto: beallitas.valaszto ?? ((n) => randomInt(0, n)),
    szuroprobak: 0           // hányszor kellett szúrópróbára váltani (a mérésekhez)
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

// ⭐ D94: ha a teljes ellenőrzés kifut a keretből, ezzel lép ki (a `lepcso2E` elkapja, és szúrópróbára vált).
const KERET_TULLEPVE = Symbol('a 2. lépcső teljes ellenőrzése kifutott a keretből');
function keretOr(nezet) {
  if (nezet.keretVege !== undefined && nezet.olvasasok > nezet.keretVege) throw KERET_TULLEPVE;
}

/**
 * ⭐ EGY ÁLLÍTÁS HELYI ÉRVÉNYESSÉGE (D94 óta közös: a teljes ellenőrzés és a szúrópróba is ezt hívja): rólam szól, nem
 * önmagáé, és az állító horgonya — amit az esemény hoz — tényleg az övé.
 * @returns {Promise<{ervenyes: boolean, hianyzik?: boolean, allitoHorgony?: string}>}
 */
async function allitasHelyben(tar, koino, e, horgonyEsemeny, tipus, nezet) {
  if (!e || e.tipus !== tipus) return { ervenyes: false };
  // ----- 1. RÓLAM SZÓLJON -----
  // A `kit` mező a horgony szerzőjére mutasson. Enélkül egy idegen szeletébe tett
  // esemény is beszámítana.
  if (e.adat?.kit !== horgonyEsemeny.szerzo) return { ervenyes: false };
  // ----- 2. ⛔ ÖNMAGÁT SENKI NEM ÁLLÍTHATJA -----
  // Enélkül bárki bejuthatna egyetlen saját aláírással.
  if (e.szerzo === horgonyEsemeny.szerzo) return { ervenyes: false };
  // ----- 3. AZ ÁLLÍTÓ HORGONYA: az esemény HOZZA, nem keressük -----
  const allitoHorgony = e.adat?.sajatBelepes;
  if (typeof allitoHorgony !== 'string') return { ervenyes: false };
  // ⚠️ És ellenőrizzük, hogy a horgony TÉNYLEG az állítóé — különben bárki hivatkozhatna
  // egy tag horgonyára, és a saját állítása az ő helyzetével igazolódna.
  const allitoEsemeny = await esemenyLekerese(tar, allitoHorgony);
  nezet.olvasasok++;
  if (!allitoEsemeny) return { ervenyes: false, hianyzik: true };
  if (allitoEsemeny.szerzo !== e.szerzo || allitoEsemeny.koino !== koino) return { ervenyes: false };
  return { ervenyes: true, allitoHorgony };
}

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
  console.log('identitas.ervenyesAllitok - KEZDÉS', { tipus, horgony });

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
    keretOr(nezet);

    // ⭐ A visszavont felhatalmazás nincs érvényben — kivéve, ha UTÁNA újra megadták.
    if (tipus === 'Felhatalmazas' && visszavonva.has(e.szerzo)
        && (e.entitasSorszam ?? 1) < visszavonva.get(e.szerzo)) continue;

    // ----- 1–3. A HELYI SZABÁLY (rólam szól, nem önmagáé, a horgony az állítóé) — `allitasHelyben` -----
    const helyben = await allitasHelyben(tar, koino, e, horgonyEsemeny, tipus, nezet);
    if (helyben.hianyzik) { voltNemEllenorizheto = true; continue; }
    if (!helyben.ervenyes) continue;
    const allitoHorgony = helyben.allitoHorgony;

    // ----- 4. ÉS A REKURZIÓ: megfelel-e az állító a feltételnek? -----
    // ⚠️ A feltétel MEGKAPJA az állítás eseményét is — a tanúsításnál ez dönti el, hogy a
    // BEMONDOTT felhatalmazásokra nézünk-e (a múlt befagyasztása), nem a mai állapotra.
    const allapota = await feltetel(tar, koino, allitoHorgony, nezet, e);
    if (!allapota.ellenorizheto) voltNemEllenorizheto = true;
    if (allapota.igen) allitok.add(e.szerzo);   // ⭐ emberenként EGY számít (Set)
  }

  const eredmeny = { db: allitok.size, voltNemEllenorizheto };
  console.log('identitas.ervenyesAllitok - VÉGE', { tipus, ...eredmeny });
  return eredmeny;
}

// A napló-nevek: a három kérdés úgy jelenjen meg a naplóban, ahogy a hívó ismeri —
// nem a belső gyorsítótár-kulcsával.
const KERDES_NEVE = { tag: 'tagE', tanusithat: 'tanusithatE', lepcso2: 'lepcso2E' };

/**
 * A kérdés-váz: gyorsítótár, kör-védelem, horgony-betöltés, alapeset — mind a három
 * kérdéshez ugyanaz.
 *
 * ⭐ ÉS EZ A NAPLÓZÁS HELYE IS. Mind a három kérdés ezen megy át, tehát elég egy helyen
 * leírni — a napló így minden kimenetet megmutat (gyorsítótár, kör, hiányzó horgony,
 * alapító kör, végső döntés), és nem csak azt, hogy „hamis".
 */
async function kerdes(kulcs, tar, koino, horgony, nezet, vizsgalat) {
  const nev = 'identitas.' + (KERDES_NEVE[kulcs] ?? kulcs);
  console.log(nev + ' - KEZDÉS', { horgony });

  /** Minden kimenet ezen megy ki — így nem maradhat néma ág. */
  const vege = (eredmeny, honnan) => {
    console.log(nev + ' - VÉGE' + (honnan ? ' (' + honnan + ')' : ''),
      { igen: eredmeny.igen, ok: eredmeny.ok, ellenorizheto: eredmeny.ellenorizheto });
    return eredmeny;
  };

  const gyorsKulcs = kulcs + '|' + horgony;

  // ----- 1. AMIT MÁR TUDUNK -----
  const kesz = nezet.igenek.get(gyorsKulcs);
  if (kesz) return vege(kesz, 'gyorsítótárból');
  keretOr(nezet);

  // ----- 2. ⭐ A KÖR ELLENI VÉDELEM -----
  //
  // Ha „A" behívta „B"-t és „B" behívta „A"-t, akkor egyikük sem vezethető vissza az
  // alapítóig — mégis végtelen körbe futnánk. A megoldás nem hibaüzenet, hanem egy egyszerű
  // igazság: aki már a saját ellenőrzése KÖZBEN kerül elő, az ezen az ágon nem bizonyít
  // semmit. ⚠️ Ezt SOHA nem tároljuk el, mert csak erre az ágra igaz.
  if (nezet.folyamatban.has(gyorsKulcs)) {
    return vege({ igen: false, ok: 'kör a hivatkozási láncban', ellenorizheto: true });
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
      return vege({ igen: false, ok: 'nem ellenőrizhető: hiányzik a horgony-esemény', ellenorizheto: false });
    }
    if (esemeny.koino !== koino) {
      return vege({ igen: false, ok: 'a horgony egy MÁSIK koinóhoz tartozik', ellenorizheto: true });
    }

    // ----- ⭐ AZ ALAPESET: AZ ALAPÍTÓ KÖR -----
    // Mind a három kérdésre IGEN: az alapítók tagok, tanúsíthatnak, és 2. lépcsősök.
    // ⚠️ Enélkül a 2. lépcső EL SEM TUDNA INDULNI (lásd `alapitoE`).
    if (await alapitoE(tar, koino, horgony, esemeny, nezet)) {
      return vege({ igen: true, ok: 'alapító kör', ellenorizheto: true });
    }

    if (esemeny.tipus !== 'Belepes') {
      return vege({ igen: false, ok: 'a horgony nem belépési esemény', ellenorizheto: true });
    }

    const eredmeny = await vizsgalat(esemeny);
    if (eredmeny.igen) nezet.igenek.set(gyorsKulcs, eredmeny);
    return vege(eredmeny);
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
export async function tagE(tar, koino, horgony, nezet = ujIdentitasNezet()) {
  // ⭐⭐ D93 (2026-10-03): a tárból CSAK ÖSSZEGYŰJTJÜK a lánc eseményeit (a horgonyoktól a meghívókig, a tagsági
  // csomagokkal együtt), és a döntést a közös, tiszta szabály hozza (`tagsag.js`) — ugyanaz, amit a szabály-réteg.
  console.log('identitas.tagE - KEZDÉS', { horgony });
  const gyorsKulcs = 'tag|' + horgony;
  const kesz = nezet.igenek.get(gyorsKulcs);
  if (kesz) return kesz;
  const esemenyek = await tagsagiEsemenyekGyujtese(tar, koino, horgony, nezet);
  const idx = tagsagiIndex(esemenyek, koino);
  // ⭐ A GYORSÍTÓTÁR A LÉNYEG (D47, D59): amit egyszer eldöntöttünk, azt a tiszta számítás is kész tagként kapja.
  for (const [kulcs, ered] of nezet.igenek) if (kulcs.startsWith('tag|') && ered.igen) idx.memo.set(kulcs.slice(4), ered);
  const r = horgonyTagsaga(idx, horgony);
  const eredmeny = { igen: r.igen, ok: r.ok, ellenorizheto: r.ellenorizheto, ...(r.igen ? { melyseg: r.melyseg } : {}) };
  if (eredmeny.igen) nezet.igenek.set(gyorsKulcs, eredmeny);
  console.log('identitas.tagE - VÉGE', eredmeny);
  return eredmeny;
}

/**
 * A tagsági lánc eseményeinek összegyűjtése a tárból: a horgony, a szeletéből a meghívások, a profilok és a tagsági
 * csomagok, a meghívók horgonyai (és így tovább, `MELYSEG_KORLAT`-ig), és az alapítás koinó-létrehozása.
 */
export async function tagsagiEsemenyekGyujtese(tar, koino, horgony, nezet = ujIdentitasNezet()) {
  const ki = [];
  const latott = new Set();
  let sor = [horgony];
  for (let melyseg = 0; sor.length && melyseg <= MELYSEG_KORLAT + 1; melyseg++) {
    const kovetkezo = [];
    for (const h of sor) {
      if (latott.has(h)) continue;
      latott.add(h);
      const e = await esemenyLekerese(tar, h);
      nezet.olvasasok++;
      if (!e || e.koino !== koino) continue;
      ki.push(e);
      // ⭐ Aki már eldőlt tagként (a nézet gyorsítótárában), annak az ágát nem olvassuk újra (D47).
      if (h !== horgony && nezet.igenek.get('tag|' + h)?.igen) continue;
      if (e.tipus === 'Belepes' && typeof e.adat?.alapitas === 'string') {
        const k = await esemenyLekerese(tar, e.adat.alapitas);
        if (k) ki.push(k);
      }
      const szelet = await entitasEsemenyei(tar, koino, h);
      nezet.olvasasok += szelet.length;
      for (const se of szelet) {
        if (se.tipus !== 'Meghivas' && se.tipus !== PROFIL && se.tipus !== TAGSAGI_CSOMAG) continue;
        ki.push(se);
        if (se.tipus === 'Meghivas' && typeof se.adat?.sajatBelepes === 'string') kovetkezo.push(se.adat.sajatBelepes);
      }
    }
    sor = kovetkezo;
  }
  return ki;
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
export async function lepcso2E(tar, koino, horgony, nezet = ujIdentitasNezet()) {
  // ⭐⭐ D94: A KERET. A legfelső hívás megnyitja (ennyi olvasás fér bele a teljes ellenőrzésbe); a belső, rekurzív
  // hívások ugyanabban a keretben futnak. Ha kifut, a szúrópróba dönt. ⚠️ A keret helyi mennyiség (mennyit olvastam),
  // nem a koinó mérete: a kis koinó ugyanazt a kódot futtatja, csak belefér.
  if (nezet.keretVege !== undefined) return lepcso2Teljes(tar, koino, horgony, nezet);
  nezet.keretVege = nezet.olvasasok + nezet.keret;
  try {
    return await lepcso2Teljes(tar, koino, horgony, nezet);
  } catch (hiba) {
    if (hiba !== KERET_TULLEPVE) throw hiba;
    delete nezet.keretVege;
    return lepcso2Szuroproba(tar, koino, horgony, nezet);
  } finally {
    delete nezet.keretVege;
  }
}

/** A TELJES ellenőrzés (a D94 előtti alak — pontos, de a zárvány méretével arányos). */
function lepcso2Teljes(tar, koino, horgony, nezet) {
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
  console.log('identitas.tanusitoJoga - KEZDÉS',
    { tanusitoHorgony, tanusitas: tanusitasEsemeny?.azonosito });

  /** Minden kimenet ezen megy ki — ugyanaz a minta, mint a `kerdes`-nél. */
  const vege = (eredmeny) => {
    console.log('identitas.tanusitoJoga - VÉGE',
      { igen: eredmeny.igen, ok: eredmeny.ok, ellenorizheto: eredmeny.ellenorizheto });
    return eredmeny;
  };

  // ⭐ D94: a HELYI rész (a horgony, az alapító kör, a bemondott felhatalmazások és a D61) egy helyen — a szúrópróba is
  // ezt hívja; itt csak a felhatalmazók 2. lépcsője jön hozzá.
  const h = await tanusitoFelhatalmazoi(tar, koino, tanusitoHorgony, nezet, tanusitasEsemeny);
  if (h.nincsTanusito) {
    return vege({ igen: false, ok: 'nem ellenőrizhető: hiányzik a tanúsító horgonya', ellenorizheto: false });
  }
  if (h.alapito) return vege({ igen: true, ok: 'alapító kör', ellenorizheto: true });
  if (h.nincsBemondas) {
    return vege({ igen: false, ok: 'a tanúsítás nem mondta be, mire támaszkodott', ellenorizheto: true });
  }

  const adok = new Set();
  let hianyzott = h.hianyzott;
  const tudottRola = h.tudottRola;
  for (const { szerzo: adoSzerzo, adoHorgony } of h.adok) {
    keretOr(nezet);
    // ⚠️ ÉS A MÁSIK FELTÉTEL: a felhatalmazónak 2. LÉPCSŐSNEK kell lennie (zárt
    // választótestület).
    const allapota = await lepcso2E(tar, koino, adoHorgony, nezet);
    if (!allapota.ellenorizheto) hianyzott = true;
    if (allapota.igen) adok.add(adoSzerzo);
  }

  if (adok.size >= nezet.felhatalmazasKell) {
    return vege({ igen: true, ok: adok.size + ' felhatalmazásra támaszkodott', ellenorizheto: true });
  }
  return vege({
    igen: false,
    ok: tudottRola
      ? '⛔ visszavont felhatalmazásra hivatkozott, pedig a horgonya szerint tudott róla'
      : hianyzott
        ? 'nem ellenőrizhető: a bemondott felhatalmazások egy része hiányzik'
        : adok.size + ' érvényes felhatalmazást mondott be a szükséges '
          + nezet.felhatalmazasKell + ' helyett',
    // ⭐ A bizonyított ellentmondás NEM „nem ellenőrizhető" — az a saját aláírásából
    // következik, tehát végleges (a D42 mintája).
    ellenorizheto: tudottRola ? true : !hianyzott
  });
}

/**
 * ⭐ A TANÚSÍTÓ JOGÁNAK HELYI RÉSZE (D94 óta kiemelve — a teljes ellenőrzés és a szúrópróba közös szabálya): a tanúsító
 * horgonya, az alapító kör, és a tanúsításban BEMONDOTT felhatalmazások, amik helyben érvényesek (rá szólnak, nem
 * önmagáé, a felhatalmazó horgonya az övé, és a tanúsító nem tudott közbeeső visszavonásról — D61). ⚠️ A felhatalmazók
 * 2. lépcsőjét NEM nézi (az a rekurzió — a teljes ellenőrzésben mind, a szúrópróbában egy véletlen).
 * @returns {Promise<{nincsTanusito?: boolean, alapito?: boolean, nincsBemondas?: boolean,
 *   adok: Array<{szerzo: string, adoHorgony: string}>, hianyzott: boolean, tudottRola: boolean, ervenytelen: number}>}
 */
async function tanusitoFelhatalmazoi(tar, koino, tanusitoHorgony, nezet, tanusitasEsemeny) {
  const ures = { adok: [], hianyzott: false, tudottRola: false, ervenytelen: 0 };
  const tanusito = await esemenyLekerese(tar, tanusitoHorgony);
  nezet.olvasasok++;
  if (!tanusito) return { ...ures, nincsTanusito: true };

  // ⭐ AZ ALAPÍTÓ KÖR ELŐSZÖR — ő a rekurzió gyökere, és NINCS mire hivatkoznia.
  //
  // ⚠️ Ezt elsőre a bemondás-ellenőrzés MÖGÉ tettem, és három próba azonnal elbukott: az
  // alapítók tanúsítása „nem mondta be, mire támaszkodott" indokkal esett ki. A gyökeret
  // mindig a feltételek ELŐTT kell megnézni — különben a feltétel a gyökérre is vonatkozna.
  if (await alapitoE(tar, koino, tanusitoHorgony, tanusito, nezet)) return { ...ures, alapito: true };

  const bemondott = tanusitasEsemeny?.adat?.felhatalmazasok;
  if (!Array.isArray(bemondott) || !bemondott.length) return { ...ures, nincsBemondas: true };

  // ⭐⭐ MEDDIG LÁTOTT A TANÚSÍTÓ? — a horgony kiolvasása (9/c 4.5)
  //
  // A tanúsítás `latott` mezője a tanúsító SAJÁT szeletéből fog pontokat. Ebből kiderül,
  // kitől meddig látta a rólam… illetve a RÓLA szóló állításokat. Ha egy visszavonás ezen
  // belülre esik, akkor **bizonyíthatóan tudott róla**, mégis aláírt.
  //
  // ⚠️ Ez nem globális óra, hanem OKSÁGI bizonyíték: nem azt mondja meg, mikor, hanem hogy
  // MI UTÁN. És nem a hiányból következtet (D19), hanem a tanúsító SAJÁT elköteleződéséből.
  const latottSorszam = new Map();   // szerző → a legnagyobb entitás-sorszám, amit látott

  /** Egy horgony-lista beolvasása a „meddig láttam" képbe. */
  const horgonyokBeolvasasa = async (azonositok) => {
    for (const azonosito of (azonositok ?? [])) {
      const h = await esemenyLekerese(tar, azonosito);
      nezet.olvasasok++;
      if (!h || h.koino !== koino || h.entitas !== tanusitoHorgony) continue;
      const eddigi = latottSorszam.get(h.szerzo) ?? 0;
      latottSorszam.set(h.szerzo, Math.max(eddigi, h.entitasSorszam ?? 1));
    }
  };

  // 1. A tanúsítás SAJÁT horgonya.
  await horgonyokBeolvasasa(tanusitasEsemeny?.latott);

  // 2. ⭐⭐⭐ ÉS A KORÁBBI BULI-ELISMERÉSEI (D61) — ez zárja be a rést.
  //
  // A tanúsító SAJÁT LÁNCÁBAN van sorrend (a `sorszam`, amit csak ő írhat). Ha egyszer
  // aláírta, hogy egy visszavonást látott, akkor minden KÉSŐBBI saját eseménye
  // bizonyíthatóan azután keletkezett — globális óra nélkül.
  //
  // ⭐ Ettől nem működik többé a „szándékosan régi horgonyt választok" trükk: a `Lattam` egy
  // KÜLÖN, rendszeres állítás, amit nem lehet eseményenként visszadátumozni. Aki elkerülné,
  // annak SOHA nem szabadna elismernie, hogy lát — és az már a ritmusból lóg ki.
  if (Number.isInteger(tanusitasEsemeny?.sorszam)) {
    const lanc = (await sajatLancEsemenyei(tar, tanusito.szerzo))
      .filter((e) => e.koino === koino
                  && e.tipus === 'Lattam'
                  && e.entitas === tanusitoHorgony
                  && e.sorszam < tanusitasEsemeny.sorszam);
    nezet.olvasasok += lanc.length;
    for (const e of lanc) await horgonyokBeolvasasa(e.latott);
  }

  // A visszavonások a tanúsító saját szeletében.
  //
  // ⚠️⚠️ MINDEGYIKET MEGTARTJUK, NEM CSAK AZ ELSŐT — és ez nem részletkérdés. Egy
  // felhatalmazó **meggondolhatja magát**: visszavesz, majd újra megad. Ha csak a legkorábbi
  // visszavonást néznénk, akkor az ÚJRA MEGADOTT felhatalmazásra hivatkozó, tökéletesen
  // becsületes tanúsítás is kiesne — sőt onnantól attól az embertől SOHA többé nem lehetne
  // érvényesen hivatkozni, mert a `Lattam` (D61) egyszer s mindenkorra elkötné a látást.
  // ⭐ Ugyanaz az „utolsó nyer" világ, mint az `ervenyesAllitok`-ban: a visszavonás nem
  // örökre szóló bélyeg, csak egy állítás a lánc egy pontján.
  const visszavonasok = new Map();   // szerző → a visszavonásainak entitás-sorszámai
  for (const e of await entitasEsemenyei(tar, koino, tanusitoHorgony)) {
    if (e.tipus !== 'FelhatalmazasVisszavonasa') continue;
    if (e.adat?.kit !== tanusito.szerzo) continue;
    const eddigiek = visszavonasok.get(e.szerzo) ?? [];
    eddigiek.push(e.entitasSorszam ?? 1);
    visszavonasok.set(e.szerzo, eddigiek);
  }

  const adok = [];
  let hianyzott = false;
  let tudottRola = false;
  let ervenytelen = 0;

  for (const azonosito of bemondott) {
    keretOr(nezet);
    if (typeof azonosito !== 'string') { ervenytelen++; continue; }
    const f = await esemenyLekerese(tar, azonosito);
    nezet.olvasasok++;
    if (!f) { hianyzott = true; continue; }

    // A bemondott esemény tényleg RÓLA szóló felhatalmazás legyen — nem elég ráhivatkozni.
    if (f.tipus !== 'Felhatalmazas' || f.koino !== koino) { ervenytelen++; continue; }
    if (f.entitas !== tanusitoHorgony) { ervenytelen++; continue; }
    if (f.adat?.kit !== tanusito.szerzo) { ervenytelen++; continue; }
    if (f.szerzo === tanusito.szerzo) { ervenytelen++; continue; }      // magát senki nem hatalmazhatja fel

    // A felhatalmazó horgonya: az esemény hozza magával.
    const adoHorgony = f.adat?.sajatBelepes;
    if (typeof adoHorgony !== 'string') { ervenytelen++; continue; }
    const ado = await esemenyLekerese(tar, adoHorgony);
    nezet.olvasasok++;
    if (!ado) { hianyzott = true; continue; }
    if (ado.szerzo !== f.szerzo || ado.koino !== koino) { ervenytelen++; continue; }

    // ⛔⛔ ÉS A LÉNYEG: LÁTTA-E A VISSZAVONÁST, MIELŐTT ALÁÍRT?
    //
    // Ha ettől a felhatalmazótól van visszavonás, ÉS a tanúsító horgonya ugyanettől az
    // embertől egy AZ UTÁNI (vagy ugyanolyan) pontot fog, akkor a tanúsító **tudta**, hogy
    // a felhatalmazása már nem él — mégis rá hivatkozott. Ez nem hiány, hanem a saját
    // aláírásából következő ellentmondás.
    //
    // ⚠️⚠️ DE CSAK AZ SZÁMÍT, AMI A HIVATKOZOTT FELHATALMAZÁS **UTÁN** JÖTT. Egy korábbi
    // visszavonást ugyanez a felhatalmazás már felülírt („az utolsó nyer") — az tehát nem
    // ellentmondás, hanem a történet egy lezárt fejezete. A rés akkor nyílik, ha a
    // visszavonás **a hivatkozott felhatalmazás és a látott pont KÖZÉ** esik:
    //
    //     felhatalmazás sorszáma  <  visszavonás sorszáma  ≤  ameddig látott
    //
    // ⭐ Így a becsületes „meggondoltam magam" eset (visszavesz → újra megad → arra
    // hivatkoznak) végig érvényes marad, a „tudtad, mégis aláírtad" eset viszont kiesik.
    const felhatalmazasSorszam = f.entitasSorszam ?? 1;
    const latott = latottSorszam.get(f.szerzo);
    const kozbeesoVisszavonas = latott !== undefined
      && (visszavonasok.get(f.szerzo) ?? [])
        .some((v) => v > felhatalmazasSorszam && v <= latott);
    if (kozbeesoVisszavonas) {
      tudottRola = true;
      continue;
    }

    adok.push({ szerzo: f.szerzo, adoHorgony });
  }
  return { adok, hianyzott, tudottRola, ervenytelen };
}

// ===================================
// ⭐⭐ D94: A SZÚRÓPRÓBA — a 2. lépcső igazolása, ha a teljes ellenőrzés nem fér a keretbe
// ===================================
//
// A HELYI rész teljesen: X 2. lépcső-bemondásának minden tanúsítása helyben érvényes, legalább `tanusitasKell`
// különböző tanúsítótól, és mindegyik tanúsító joga helyben áll (alapító, vagy legalább N bemondott, helyben érvényes
// felhatalmazás — D61-gyel). Utána `setak` VÉLETLEN ÚT: minden lépésen az aktuális ember egy véletlen bemondott
// tanúsítója, és annak egy véletlen bemondott felhatalmazója lesz a következő ember (akinek a bemondását és a
// tanúsításait, és a választott tanúsító felhatalmazásait nézzük — 2N + 6 esemény). Az út célba ér az alapító
// tanúsítónál és a már igazolt (gyorsítótárban lévő) 2. lépcsősnél.
//
// ⛔⛔ AMIT A SZÚRÓPRÓBA MEGKÖVETEL — ÉS MIÉRT: minden BEMONDOTT tétel érvényes legyen (a teljes ellenőrzés a
// többletet átlépi; itt a többlet hamis bemondás, mert különben egy csaló a bemondását hamis tételekkel hígíthatná), és
// az út CSAK aláírt bemondásokat követ (a 2. lépcsős sajátját és a tanúsítóét) — a szeletbe szórt állítást nem: azt bárki
// odateheti, és egy kulcs-gyűrű a becsületest is elbuktathatná. ⚠️ A hiány nem vád (D19): a hiányzó esemény, a
// bemondás hiánya, a kör és a túl mély út „nem ellenőrizhető”; a bizonyított hiba (érvénytelen tétel, kevés tanúsító
// vagy felhatalmazás, közbeeső visszavonás) bukás.

/** Egy ember legutóbbi 2. lépcső-bemondása a saját szeletében (vagy null). */
async function lepcsoBemondasa(tar, koino, horgony, horgonyEsemeny, nezet) {
  const szelet = await entitasEsemenyei(tar, koino, horgony);
  nezet.olvasasok += szelet.length;
  let legutobbi = null;
  for (const e of szelet) {
    if (e.tipus !== LEPCSO_BEMONDAS || e.szerzo !== horgonyEsemeny.szerzo) continue;
    if (!legutobbi || e.sorszam > legutobbi.sorszam) legutobbi = e;
  }
  return legutobbi;
}

/** A tanúsító jogának ítélete a szúrópróbában (a helyi rész alapján; a felhatalmazók 2. lépcsője az úté). */
function jogItelete(jog, nezet) {
  if (jog.nincsTanusito) return { hianyzik: true, ok: 'hiányzik egy tanúsító horgonya' };
  if (jog.alapito) return { alapito: true };
  if (jog.nincsBemondas) return { bukott: true, ok: 'egy tanúsítás nem mondta be, mire támaszkodott' };
  if (jog.tudottRola) return { bukott: true, ok: 'egy tanúsító visszavont felhatalmazásra hivatkozott, pedig tudott róla' };
  if (jog.ervenytelen) return { bukott: true, ok: 'egy tanúsító érvénytelen felhatalmazást mondott be' };
  if (jog.hianyzott) return { hianyzik: true, ok: 'egy bemondott felhatalmazás hiányzik' };
  if (new Set(jog.adok.map((a) => a.szerzo)).size < nezet.felhatalmazasKell) {
    return { bukott: true, ok: 'egy tanúsító a szükségesnél kevesebb felhatalmazást mondott be' };
  }
  return { rendben: true };
}

/**
 * Egy ember a szúrópróba útján: a horgonya, az alapító kör, a gyorsítótár, a bemondása, és a bemondott tanúsításai
 * (helyben érvényesek, elég különböző tanúsítótól). `teljes`: a tanúsítók jogának helyi részét is mind megnézi (a
 * kiinduló embernél — a helyi rész).
 */
async function setaCsomopont(tar, koino, horgony, nezet, teljes) {
  keretOr(nezet);
  const e = await esemenyLekerese(tar, horgony);
  nezet.olvasasok++;
  if (!e) return { hianyzik: true, ok: 'hiányzik egy horgony-esemény' };
  if (e.koino !== koino) return { bukott: true, ok: 'egy horgony más koinóé' };
  if (await alapitoE(tar, koino, horgony, e, nezet)) return { cel: true, ok: 'alapító kör' };
  if (e.tipus !== 'Belepes') return { bukott: true, ok: 'egy horgony nem belépés' };
  if (nezet.igenek.get('lepcso2|' + horgony)?.igen) return { cel: true, ok: 'már igazolt' };

  const b = await lepcsoBemondasa(tar, koino, horgony, e, nezet);
  if (!b) return { hianyzik: true, ok: 'valakinek nincs 2. lépcső-bemondása (a szúrópróba csak a bemondottat követi)' };
  const tanusitok = new Map();               // szerző → { tanusitas, tanusitoHorgony }
  for (const az of b.adat.tanusitasok) {
    const t = await esemenyLekerese(tar, az);
    nezet.olvasasok++;
    if (!t) return { hianyzik: true, ok: 'egy bemondott tanúsítás hiányzik' };
    if (t.koino !== koino || t.entitas !== horgony) return { bukott: true, ok: 'hamis bemondás: a tanúsítás nem rá szól' };
    const helyben = await allitasHelyben(tar, koino, t, e, 'Tanusitas', nezet);
    if (helyben.hianyzik) return { hianyzik: true, ok: 'egy tanúsító horgonya hiányzik' };
    if (!helyben.ervenyes) return { bukott: true, ok: 'hamis bemondás: érvénytelen tanúsítás' };
    if (!tanusitok.has(t.szerzo)) tanusitok.set(t.szerzo, { tanusitas: t, tanusitoHorgony: helyben.allitoHorgony });
  }
  if (tanusitok.size < nezet.tanusitasKell) {
    return { bukott: true, ok: 'a bemondás ' + tanusitok.size + ' tanúsítót nevez meg a szükséges ' + nezet.tanusitasKell + ' helyett' };
  }
  const lista = [...tanusitok.values()];
  if (teljes) {
    for (const t of lista) {
      t.jog = await tanusitoFelhatalmazoi(tar, koino, t.tanusitoHorgony, nezet, t.tanusitas);
      const ji = jogItelete(t.jog, nezet);
      if (ji.bukott || ji.hianyzik) return ji;
    }
  }
  return { tanusitok: lista };
}

/** Egy véletlen út a kiinduló embertől az alapító körig. */
async function seta(tar, koino, horgony, kiindulo, nezet) {
  const ut = new Set([horgony]);
  let cs = kiindulo;
  for (let lepes = 0; lepes < MELYSEG_KORLAT; lepes++) {
    const t = cs.tanusitok[nezet.valaszto(cs.tanusitok.length)];
    const jog = t.jog ?? await tanusitoFelhatalmazoi(tar, koino, t.tanusitoHorgony, nezet, t.tanusitas);
    const ji = jogItelete(jog, nezet);
    if (ji.alapito) return { cel: true };
    if (ji.bukott || ji.hianyzik) return ji;
    const jeloltek = jog.adok.filter((a) => !ut.has(a.adoHorgony));
    if (!jeloltek.length) return { hianyzik: true, ok: 'kör az úton' };
    const f = jeloltek[nezet.valaszto(jeloltek.length)];
    ut.add(f.adoHorgony);
    const kov = await setaCsomopont(tar, koino, f.adoHorgony, nezet, false);
    if (kov.cel || kov.bukott || kov.hianyzik) return kov;
    cs = kov;
  }
  return { hianyzik: true, ok: 'túl mély út (' + MELYSEG_KORLAT + ' lépés)' };
}

/**
 * ⭐⭐ D94: A 2. LÉPCSŐ SZÚRÓPRÓBÁVAL — a helyi rész teljesen, és `nezet.setak` véletlen út az alapító körig.
 * @returns {Promise<{igen: boolean, ok: string, ellenorizheto: boolean, szuroproba: true}>}
 */
export async function lepcso2Szuroproba(tar, koino, horgony, nezet = ujIdentitasNezet()) {
  console.log('identitas.lepcso2Szuroproba - KEZDÉS', { horgony, setak: nezet.setak });
  nezet.szuroprobak++;
  const vege = (eredmeny) => {
    if (eredmeny.igen) nezet.igenek.set('lepcso2|' + horgony, eredmeny);
    console.log('identitas.lepcso2Szuroproba - VÉGE', { igen: eredmeny.igen, ok: eredmeny.ok });
    return eredmeny;
  };
  const kesz = nezet.igenek.get('lepcso2|' + horgony);
  if (kesz) return kesz;
  const ki = await setaCsomopont(tar, koino, horgony, nezet, true);
  if (ki.cel) return vege({ igen: true, ok: ki.ok, ellenorizheto: true, szuroproba: true });
  if (ki.bukott) return vege({ igen: false, ok: 'a szúrópróba elbukott: ' + ki.ok, ellenorizheto: true, szuroproba: true });
  if (ki.hianyzik) return vege({ igen: false, ok: 'nem ellenőrizhető (szúrópróba): ' + ki.ok, ellenorizheto: false, szuroproba: true });
  let hiany = null;
  for (let s = 0; s < nezet.setak; s++) {
    const r = await seta(tar, koino, horgony, ki, nezet);
    if (r.bukott) {
      return vege({ igen: false, ok: 'a szúrópróba elbukott (' + (s + 1) + '. út): ' + r.ok, ellenorizheto: true, szuroproba: true });
    }
    if (r.hianyzik && !hiany) hiany = r;
  }
  if (hiany) return vege({ igen: false, ok: 'nem ellenőrizhető (szúrópróba): ' + hiany.ok, ellenorizheto: false, szuroproba: true });
  return vege({ igen: true, ok: ki.tanusitok.length + ' tanúsítója van — szúrópróbával (' + nezet.setak + ' út)',
    ellenorizheto: true, szuroproba: true });
}

/** ⭐ D94: alapító-e a horgony gazdája (a 2. lépcsője a koinó létrehozásából következik — bemondás nem kell). */
export async function alapitoHorgony(tar, koino, horgony) {
  const e = await esemenyLekerese(tar, horgony);
  return !!e && e.koino === koino && alapitoE(tar, koino, horgony, e, ujIdentitasNezet());
}

/**
 * ⭐ D94: a 2. lépcső bemondásának tartalma — a TÉNYLEG érvényes tanúsításaim (tanúsítónként egy), a teljes szabállyal
 * (a felhatalmazók 2. lépcsője tanúsítónként a keretben vagy szúrópróbával). Ha nincs elég, üres lista.
 * @returns {Promise<Array<string>>}
 */
export async function ervenyesTanusitasaim(tar, koino, horgony, nezet = ujIdentitasNezet()) {
  const e = await esemenyLekerese(tar, horgony);
  if (!e || e.tipus !== 'Belepes') return [];
  const kivalasztott = new Map();
  for (const t of await entitasEsemenyei(tar, koino, horgony)) {
    if (t.tipus !== 'Tanusitas' || kivalasztott.has(t.szerzo)) continue;
    const helyben = await allitasHelyben(tar, koino, t, e, 'Tanusitas', nezet);
    if (!helyben.ervenyes) continue;
    const jog = await tanusitoJoga(tar, koino, helyben.allitoHorgony, nezet, t);
    if (jog.igen) kivalasztott.set(t.szerzo, t.azonosito);
  }
  return kivalasztott.size >= nezet.tanusitasKell ? [...kivalasztott.values()].slice(0, 16) : [];
}

// ----- A közös váznak átadható alakok (a paraméter-sorrend miatt) -----
//
// ⚠️ CSAK KETTŐ VAN, ÉS EZ NEM HIÁNY. A harmadik kérdés (`tanusithatE`) SOHA nem feltétel:
// a tanúsítás érvényességét nem a tanúsító MAI állapota dönti el, hanem az, amire aláíráskor
// támaszkodott (`tanusitoJoga`, D47). Ha egyszer mégis kellene, itt van a helye.
const tagE_ = (tar, koino, horgony, nezet) => tagE(tar, koino, horgony, nezet);
const lepcso2E_ = (tar, koino, horgony, nezet) => lepcso2E(tar, koino, horgony, nezet);

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
