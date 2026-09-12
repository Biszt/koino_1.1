// koino/js/allapot/ter.js

// Felelősség: A BELÉPŐ TÉR — egy kártya minden koinóról, amit ez a készülék ismer.
//
// ===== ⭐ MI EZ (D25, Szakasz 5.6) =====
//
// *„A belépő tér is követné ugyanazt a stílust meg logikát, mint a pakli nézet, annyi
// különbséggel, hogy itt a kártyákon a **koinók** kapnak helyet."* — Csaba, 2026-08-27
//
// A pakli egy koinón BELÜL mutat kártyákat; a tér a koinók FÖLÖTT. ⭐ És a készülék erre
// félig már fel volt készülve: a **kulcs** (`kulcs.json`) és a **társ-lista**
// (`tarsak.json`) eddig is a koinók FÖLÖTT laktak, egy szinttel az esemény-mappák felett.
// *Az azonosságod téri, a tagságod koino-helyi — pontosan ezt mondja a D25.*
//
// ===== ⛔⛔ A HATÓKÖR, KIMONDVA: AMIT EZ A KÉSZÜLÉK ISMER =====
//
// A D25 tere egyszer olyan koinókat is mutatna, amikben nem vagy benne — de ahhoz a
// **kereső-réteg** kell, ami szándékosan elhagyható, és nincs megépítve. Amíg nincs, ez a
// lista **a készüléken lévő koinókról** szól, és ezt a felületnek **ki kell mondania**:
// *nem hazudunk teljességet* (D19 — bejelent, nem hallgat).
//
// ===== ⭐⭐ ÉS EBBŐL KÖVETKEZIK EGY JÓ HÍR A LÉTSZÁMRÓL =====
//
// A `felulet_terv.md` attól tartott, hogy a téren átnézve a létszám **a koino állítása**,
// kívülről igazolhatatlan — és ezért lenne belőle hamisítható toplista (D18/2).
//
// ⭐ **Ez csak arra a koinóra igaz, aminek NINCS meg az adata.** Amelyiknek megvan, ott a
// számot **aláírt eseményekből magunk számoljuk** — nem állítás, hanem tény. A v1
// hatókörében tehát a veszély nem áll fenn; az a kereső-réteg jövőbeli gondja.
//
// ⛔ **Amit viszont továbbra sem szabad: LÉTSZÁM SZERINT RENDEZNI.** Az a D18/2-ben
// elvetett alak, függetlenül attól, honnan jön a szám. Ezért a `RENDEZESEK` listában
// nincs ilyen — és ez nem feledékenység, hanem a szabály.
//
// ===== ⭐ „MIT MUTASSON A KÁRTYA A LÉTSZÁM MELLÉ?" — a terv nyitott kérdése =====
//
// A válasz magától adódott, és nem kellett hozzá új gépezet: **három szám, nem egy** —
// `tagok` · `nemEllenorizhetok` · `belepok`. Ugyanaz a D19-es hármas, amit az AZONOSSÁG
// szakasz is használ (✔ igen · ? nem ellenőrizhető · ✘ nem).
//
// ⭐ **A különbségük MAGA a szám súlya.** Egy koino, ahol 900-an beléptek, de csak 12-nek
// van visszavezethető meghívási lánca, **ránézésre más**, mint ahol 900-ból 900. *A puszta
// létszám ezt elhallgatná — épp azt, amitől a szám ér valamit.*
//
// Használják: `koino.js` (a `ter` parancs és a `GET /api/ter` végpont).

import { esemenyTarNyitasa, ismertKoinok, terJegyzekTarolo, alapHely } from '../tar/fajlTar.js';
import { koinoEsemenyei } from '../tar/esemenyTar.js';
import { tagE, ujIdentitasNezet } from './identitas.js';

// ===================================
// A PARAMÉTEREK
// ===================================

// ⛔ HÁROM RENDEZÉS, ÉS A LÉTSZÁM SZÁNDÉKOSAN NINCS KÖZTÜK (lásd a fejlécet).
export const RENDEZESEK = ['letrehozva', 'eloszorLattam', 'nev'];

// ⭐ A LÉTREHOZÁS IDEJE AZ ALAP, ÚJ ELÖL (Csaba, 2026-09-12).
//
// ⚠️ A választás nem magától értetődő, és a terv is nyitva hagyta. A `KoinoLetrehozas.ido`
// **a szerző órája**, tehát állítás — de **minden készüléken ugyanazt a sorrendet** adja.
// A másik jelölt, a „mikor láttam először", hamisíthatatlan (saját megfigyelés), viszont
// **készülékenként más sorrendet** ad. A koino mindenhol a determinizmust választja, ezért
// itt is; ⭐ a másikat viszont **eltesszük és mutatjuk** (`eloszorLattam`), így a döntés
// megfordítása egy sor — nem újraépítés.
export const ALAP_RENDEZES = 'letrehozva';

// ===================================
// EGY KOINO KÁRTYÁJA
// ===================================

/**
 * Egy koino kártyája — a tér egy sora.
 *
 * ⚠️ EGY OLVASÁS KOINÓNKÉNT. Az összes szám (létrehozó esemény, horgonyok, eseményszám)
 * ugyanabból a bejárásból jön — nem olvassuk végig négyszer. A `koinoEsemenyei` korlátja
 * itt is igaz, de ⭐ **a szám, ami itt sokasodik, nem az e-embereké, hanem hogy ez a
 * KÉSZÜLÉK hány koinóban van benne** — az pedig szerkezetileg kicsi marad (egy ember
 * néhány közösségben él). *Ez a 9. szabály kérdésére az őszinte válasz.*
 *
 * @param {string} hely - az adat-mappa
 * @param {string} koino - a koino azonosítója
 * @param {Object} [beallitas]
 * @param {string} [beallitas.szerzo] - a saját kulcsom (a „tag vagyok-e?" kérdéshez)
 * @returns {Promise<Object>}
 */
export async function koinoKartyaja(hely, koino, beallitas = {}) {
  console.log('ter.koinoKartyaja - KEZDÉS', { koino });

  const tar = await esemenyTarNyitasa(koino, hely);
  const esemenyek = await koinoEsemenyei(tar, koino);

  // ----- A LÉTREHOZÓ ESEMÉNY -----
  // ⚠️ HIÁNYOZHAT, ÉS AZ NEM HIBA (D19). Ha az eseményeket fájlból hoztam be, vagy a csere
  // még nem ért ide, lehet, hogy a koino gondolatait ismerem, a SZÜLETÉSÉT nem. Olyankor
  // a kártya megmondja, hogy nem tudja — nem talál ki nevet.
  const alapitas = esemenyek.find((e) => e.tipus === 'KoinoLetrehozas');

  // ----- A HORGONYOK: ki lépett be ebbe a koinóba? -----
  // Szerzőnként EGY horgony számít (az elsője); a `Belepes` és a `KoinoLetrehozas`
  // ugyanúgy horgony (D56 — az alapító a rekurzió alapesete).
  const horgonyok = new Map();                       // szerző → a horgony azonosítója
  for (const e of esemenyek) {
    if (e.tipus !== 'Belepes' && e.tipus !== 'KoinoLetrehozas') continue;
    if (!horgonyok.has(e.szerzo)) horgonyok.set(e.szerzo, e.azonosito);
  }

  // ----- ⭐ A HÁROM SZÁM (lásd a fejlécet) -----
  //
  // ⚠️ A NÉZET KÖZÖS a horgonyokra, és ez nem kényelem: enélkül a meghívási lánc
  // bejárása szerzőnként újrakezdődne (3^mélység helyett az ős-halmaz — `identitas.js`).
  const nezet = ujIdentitasNezet();
  let tagok = 0, nemEllenorizhetok = 0;
  for (const horgony of horgonyok.values()) {
    const valasz = await tagE(tar, koino, horgony, nezet);
    if (valasz.igen) tagok++;
    else if (!valasz.ellenorizheto) nemEllenorizhetok++;
  }

  // ----- TAG VAGYOK-E ÉN? -----
  const enHorgonyom = beallitas.szerzo ? horgonyok.get(beallitas.szerzo) ?? null : null;
  const en = enHorgonyom ? await tagE(tar, koino, enHorgonyom, nezet) : null;

  const kartya = {
    azonosito: koino,

    // ⚠️ A HIÁNY MEGNEVEZVE, nem kitalálva (D19).
    nev: alapitas?.adat?.nev ?? null,
    leiras: alapitas?.adat?.leiras ?? null,
    alapito: alapitas?.szerzo ?? null,
    alapitok: alapitas?.adat?.alapitok ?? [],
    // ⚠️ A SZERZŐ ÓRÁJA — állítás, nem mért idő. A kártya ezért mutatja mellette az
    // `eloszorLattam`-ot is, ami a SAJÁT megfigyelésem.
    letrehozva: alapitas?.ido ?? null,
    ismeremASzuleteset: alapitas !== undefined,

    // ⭐ A HÁROM SZÁM — a létszám súlya a különbségükben van.
    belepok: horgonyok.size,
    tagok,
    nemEllenorizhetok,

    esemenyek: esemenyek.length,

    // ⭐ „Benne vagyok-e?" — és a `miert` a D19 miatt kell: a „nem" legyen indokolt.
    enTagVagyok: en?.igen ?? false,
    miert: en?.ok ?? 'nem léptem be ebbe a koinóba',
    enAlapitottam: alapitas?.szerzo === beallitas.szerzo && alapitas !== undefined
  };

  console.log('ter.koinoKartyaja - VÉGE', { koino, tagok, belepok: kartya.belepok });
  return kartya;
}

// ===================================
// A TÉR — minden kártya
// ===================================

/** Rendezési érték egy kártyához. ⚠️ A hiányzó érték MINDIG hátra kerül, iránytól függetlenül. */
function ertekhez(kartya, rendezes, jegyzet) {
  if (rendezes === 'nev') return kartya.nev ?? '';
  if (rendezes === 'eloszorLattam') return jegyzet[kartya.azonosito] ?? null;
  return kartya.letrehozva ?? null;                  // letrehozva
}

/**
 * A belépő tér kártyái.
 *
 * ⚠️ NINCS KURZOR, ÉS EZ NEM FELEDÉKENYSÉG. A pakli lapoz, mert egy koinóban milliárdnyi
 * gondolat lehet; a tér listája viszont **a készüléken lévő koinók** száma, ami
 * szerkezetileg kicsi. ⭐ Ha egyszer a kereső-réteg idegen koinókat is idehoz, **az** a
 * lekérdezés fog lapozni — de az már más kérdés, más réteggel.
 *
 * @param {string} [hely] - az adat-mappa
 * @param {Object} [beallitas]
 * @param {string} [beallitas.szerzo] - a saját kulcsom
 * @param {string} [beallitas.rendezes] - `RENDEZESEK` egyike
 * @param {string} [beallitas.irany] - 'csokkeno' (alap: új elöl) | 'novekvo'
 * @param {number} [beallitas.most] - a „most" (az először-látás feljegyzéséhez)
 * @returns {Promise<Object>} { kartyak, koinok, rendezes, irany, csakAmitIsmerunk }
 */
export async function terKartyai(hely = alapHely(), beallitas = {}) {
  const rendezes = beallitas.rendezes ?? ALAP_RENDEZES;
  const irany = beallitas.irany === 'novekvo' ? 'novekvo' : 'csokkeno';

  console.log('ter.terKartyai - KEZDÉS', { rendezes, irany });

  // ⛔ ISMERETLEN RENDEZÉS: HIBA, NEM CSENDES ALAPÉRTELMEZÉS — ugyanaz az érv, mint a
  // pakliban. Ha elgépelem, tudni akarom; és így derül ki az is, ha valaki létszám
  // szerint próbálna rendezni (a lista szándékosan nem kínálja).
  if (!RENDEZESEK.includes(rendezes)) {
    throw new Error('Ismeretlen rendezés: ' + rendezes
      + ' — választható: ' + RENDEZESEK.join(', '));
  }

  const koinok = await ismertKoinok(hely);

  // ----- ⭐ AZ „ELŐSZÖR LÁTTAM" FELJEGYZÉSE -----
  //
  // ⚠️ HELYI FELJEGYZÉS, NEM ESEMÉNY (3. szabály): sosem terjed, két készüléken mást
  // jelent, és semmit nem dönt el a koinóban. Az első lekéréskor íródik — vagyis az érték
  // az, hogy *mikor került először a szemem elé*, nem hogy mikor jött létre.
  const jegyzo = terJegyzekTarolo(hely);
  const jegyzet = await jegyzo.olvas();
  const most = beallitas.most ?? Date.now();
  let ujJegyzet = false;
  for (const koino of koinok) {
    if (jegyzet[koino] === undefined) { jegyzet[koino] = most; ujJegyzet = true; }
  }
  if (ujJegyzet) await jegyzo.ir(jegyzet);

  // ----- A KÁRTYÁK -----
  const kartyak = [];
  for (const koino of koinok) {
    const kartya = await koinoKartyaja(hely, koino, beallitas);
    kartya.eloszorLattam = jegyzet[koino] ?? null;
    kartyak.push(kartya);
  }

  // ----- A SORREND -----
  kartyak.sort((a, b) => {
    const ae = ertekhez(a, rendezes, jegyzet);
    const be = ertekhez(b, rendezes, jegyzet);

    // ⚠️ A HIÁNYZÓ ÉRTÉK MINDIG HÁTRA. Amelyik koinónak nem ismerem a születését, annak
    // nincs létrehozási ideje — az ilyen a lista VÉGÉRE kerül, akármelyik irányba
    // rendezünk. Különben megfordításkor épp a legkevésbé ismert koinók ugranának előre.
    if (ae === null && be === null) return a.azonosito < b.azonosito ? -1 : 1;
    if (ae === null) return 1;
    if (be === null) return -1;

    if (ae !== be) {
      const kisebb = ae < be ? -1 : 1;
      return irany === 'novekvo' ? kisebb : -kisebb;
    }
    // ⭐ Holtverseny-döntő az azonosító szerint — hogy a sorrend MINDIG egyértelmű legyen.
    return a.azonosito < b.azonosito ? -1 : 1;
  });

  console.log('ter.terKartyai - VÉGE', { koinok: kartyak.length });
  return {
    kartyak,
    koinok: kartyak.length,
    rendezes,
    irany,
    // ⛔⛔ A FELÜLETNEK KI KELL MONDANIA: ez nem a világ összes koinója, csak amit ez a
    // készülék ismer. A kereső-réteg nélkül nincs más igazság — és a hallgatás itt
    // teljességet ígérne, amit nem tudunk tartani (D19).
    csakAmitIsmerunk: true
  };
}
