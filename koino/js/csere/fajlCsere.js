// koino/js/csere/fajlCsere.js

// Felelősség: a KÉZI ÚT — eseményeket fájlba írni, és fájlból beolvasni.
//
// ===== ⛔⛔ EZ A 4. SZABÁLY (D30–D32) =====
//
// *„Legyen mindig kézi út. Minden automatikus cseréhez tartozzon fájlba mentés / fájlból
// olvasás. **Ha egy funkció csak online tud működni, az fojtópont.**"*
//
// Eddig a koinónak volt TCP-cseréje, UDP-cseréje, lyukfúrása, postaládája és helyi
// felfedezése — de ha egyik sem megy (lekapcsolt hálózat, tiltó wifi, más országban lévő
// társ, vagy egyszerűen egy pendrive-nyi távolság), **nem volt parancs**, amivel az
// eseményeket át lehetett volna vinni. A kézi út az adat-fájl kézi másolása volt: működött,
// de nem a program kínálta, és nem ellenőrzött semmit.
//
// ===== ⭐⭐ AMI EBBŐL A LEGFONTOSABB: A FÁJL SEM KAP ENGEDÉKENYEBB KAPUT =====
//
// A **3. szabály** azt mondja: *a bizalom sose a csatornából jöjjön*. Egy pendrive-ról
// érkező esemény **pontosan annyira gyanús**, mint egy hálózatról érkező — sőt: egy fájlt
// bárki szerkeszthet egy szövegszerkesztővel, mielőtt odaadja.
//
// ⭐ Ezért ez a fájl **nem ír új beolvasztó logikát**: a `csere.js` `beolvasztas()`-át
// hívja, ugyanazt, amit a TCP- és az UDP-csere. Onnantól minden magától adódik — az
// `esemenyMentese` kapu (aláírás + azonosító), a duplikátum elnyelése, az **idegen koino**
// kiszűrése és az **elágazás** felsorolása. *Egy kapu van, és ez is azon megy be.*
//
// ===== ⭐ ÉS EGY FORMÁTUM, NEM KETTŐ =====
//
// A kivitel alakja **bájtra ugyanaz, mint a táré**: `esemenyek.jsonl`, soronként egy
// aláírt esemény. Három haszna van, és mindhárom ingyen jött:
//
//   · a lemásolt `esemenyek.jsonl` **behozható** ezzel a paranccsal (a régi kézi út nem
//     veszett el, hanem ellenőrzötté vált);
//   · a kivitt fájl **hozzáfűzhető** — két kivitel egymás után egy fájlba fűzve is
//     értelmes marad, mint maga a tár;
//   · **szövegszerkesztővel megnézhető** — a koino egyik alapígérete (`fajlTar.js`).
//
// ⚠️ EGYIRÁNYÚ. Ez nem `vonal.js`: nincs `parbeszed`, nincs `ALLAS`/`KEREK` kör, tehát a
// másik fél nem tudja megmondani, mi hiányzik neki. Egy fájl **visz**, nem beszélget. Aki
// oda-vissza akar cserélni, mindkét irányban visz egyet — ez a pendrive alakja, és
// szándékosan nem tettünk úgy, mintha több lenne.
//
// ⚠️ A 6. SZABÁLY (az adat-csomag kicsi marad) miatt a kivitelnek **hatóköre** van: a
// „mindent" mellett kivihető a SAJÁT lánc (a D21 ~1 KB/fő „saját lapja", az újjáépítés
// magja) vagy EGY entitás szelete. *Aki nem az egészet akarja átadni, ne kényszerüljön rá.*
//
// Használják: `koino.js` (a `kivisz` és a `behoz` parancs).

import { koinoEsemenyei, sajatLancEsemenyei, entitasEsemenyei } from '../tar/esemenyTar.js';
import { beolvasztas } from './csere.js';
import { szovegHivatkozasE } from '../esemeny/szovegDarab.js';
import { bajtLenyomat, bajtokBase64Url, base64UrlBajtok } from '../esemeny/kanonikusAlak.js';

/**
 * ⭐ D72 (2026-09-26): egy esemény SZÖVEG-HIVATKOZÁSAI — a gondolat (és a besorolás) szövege,
 * és a szerkesztési javaslat új szövege. A kézi útnak ezeket is vinnie kell: különben a fájlon
 * csak a metaadat menne át, a szöveg nem (4. szabály).
 */
function esemenySzovegei(e) {
  const talalt = [];
  if (szovegHivatkozasE(e?.adat?.szoveg)) talalt.push(e.adat.szoveg.lenyomat);
  for (const r of e?.adat?.erintettek ?? []) {
    if (szovegHivatkozasE(r?.valtozas?.szoveg)) talalt.push(r.valtozas.szoveg.lenyomat);
  }
  return talalt;
}

// ===================================
// A HATÓKÖRÖK
// ===================================

// ===================================
// KIVITEL — események fájlba
// ===================================

/**
 * A kivihető események JSONL szövege.
 *
 * ⚠️ SZÖVEGET AD, NEM FÁJLT ÍR. A lemezre írás a hívóé (`koino.js`) — ugyanaz a
 * szétválasztás, mint a `csere.js` (logika) és a `vonal.js` (szállítás) között. Ettől
 * próbálható a lemez megérintése nélkül.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {Object} [beallitas]
 * @param {string} [beallitas.hatokor] - 'mind' (alap) | 'sajat' | egy entitás azonosítója
 * @param {string} [beallitas.szerzo] - a saját kulcsom (a 'sajat' hatókörhöz kell)
 * @returns {Promise<{szoveg: string, darab: number, hatokor: string, bajt: number}>}
 */
export async function kivitelSzovege(tar, koino, beallitas = {}) {
  const hatokor = beallitas.hatokor ?? 'mind';
  console.log('fajlCsere.kivitelSzovege - KEZDÉS', { hatokor });

  let esemenyek;

  if (hatokor === 'sajat') {
    // ⛔ A SAJÁT LÁNC CSAK AKKOR ÉRTELMES, HA TUDOM, KI VAGYOK. Nem találjuk ki:
    // a D15 szerint a személyazonosság a kulcsé, nem az állapoté.
    if (!beallitas.szerzo) {
      throw new Error('A „sajat" hatókörhöz a saját kulcsom kell — add meg a szerzőt.');
    }
    // ⭐ Célzott kérdés a tárhoz (nem `betolt()`): a 3.2 óta a lánc kérdezhető.
    esemenyek = (await sajatLancEsemenyei(tar, beallitas.szerzo))
      .filter((e) => e.koino === koino);

  } else if (hatokor === 'mind') {
    // ⚠️ EZ AZ EGYETLEN ÁG, AMI VÉGIGOLVASSA A TÁRAT — és ugyanazt a korlátot örökli, amit
    // a `koinoEsemenyei` fejléce kimond. Kis koinónál ez a helyes és legegyszerűbb válasz
    // („add ide az egészet, viszem"); nagyban a másik két hatókör a járható út.
    esemenyek = await koinoEsemenyei(tar, koino);

  } else {
    // ⭐ EGY ENTITÁS SZELETE — szintén célzott kérdés, a szelet-mutatóból.
    esemenyek = await entitasEsemenyei(tar, koino, hatokor);
  }

  // ⭐ A TÁR ALAKJA, BÁJTRA: soronként egy `JSON.stringify(esemeny)`. Ha ez elcsúszna a
  // `fajlTar.js` `hozzafuz`-ától, a lemásolt `esemenyek.jsonl` már nem lenne behozható —
  // és pont az a kézi út veszne el, amit itt ellenőrzötté teszünk.
  const sorok = esemenyek.map((e) => JSON.stringify(e));

  // ⭐ D72: A SZÖVEG-DARABOK — saját sorfajtaként (`szovegDarab` + a bájtok base64url-ben), az
  // események UTÁN. Egy régi program az ilyen sort eseményként elutasítja (megnevezve), tehát
  // semmit nem ront el. Ami nálunk sincs meg, azt nem hallgatjuk el: `hianyzoDarabok`.
  let szovegDarabok = 0, hianyzoDarabok = 0;
  const lenyomatok = [...new Set(esemenyek.flatMap(esemenySzovegei))].sort();
  for (const lenyomat of lenyomatok) {
    const bajtok = beallitas.darabOlvas ? await beallitas.darabOlvas(lenyomat) : null;
    if (!bajtok) { hianyzoDarabok++; continue; }
    sorok.push(JSON.stringify({ szovegDarab: lenyomat, bajtok: bajtokBase64Url(bajtok) }));
    szovegDarabok++;
  }

  const szoveg = sorok.join('\n') + (sorok.length ? '\n' : '');

  console.log('fajlCsere.kivitelSzovege - VÉGE', { darab: esemenyek.length, szovegDarabok });
  return {
    szoveg,
    darab: esemenyek.length,
    szovegDarabok,
    hianyzoDarabok,
    hatokor,
    bajt: Buffer.byteLength(szoveg, 'utf8')
  };
}

// ===================================
// BEHOZATAL — események fájlból
// ===================================

/**
 * Egy JSONL szöveg beolvasztása a tárba.
 *
 * ⛔⛔ A KAPU UGYANAZ. Ez a függvény **nem ment el semmit magától**: sorokat bont, és
 * átadja a `beolvasztas`-nak, ugyanannak, amit a hálózati csere hív. Aki ezt a fájlt
 * később átírja, tartsa meg ezt — *a fájl nem megbízhatóbb, mint a hálózat.*
 *
 * ⚠️ A HIBÁS SOR NEM ÁLLÍTJA MEG A TÖBBIT (D19). Egy féllé vágott fájl, egy odakevert
 * jegyzet-sor vagy egy szerkesztő által elrontott sor **megnevezve** jelenik meg az
 * eredményben — de a többi esemény bemegy. *Bejelentünk, nem hallgatunk, és nem is
 * dobjuk el az egészet egy rossz sor miatt.*
 *
 * @param {Object} tar
 * @param {string} koino - CSAK ennek a koinónak az eseményeit vesszük be
 * @param {string} szoveg
 * @returns {Promise<Object>} { sorok, uj, marMegvolt, idegen, elutasitva, elagazasok, hibasSorok }
 */
export async function behozatalSzovegbol(tar, koino, szoveg, beallitas = {}) {
  console.log('fajlCsere.behozatalSzovegbol - KEZDÉS', { bajt: szoveg?.length ?? 0 });

  const esemenyek = [];
  const hibasSorok = [];
  let sorok = 0;
  // ⭐ D72: a szöveg-darab sorok (a kivitel írja őket az események után).
  let szovegDarabok = 0;
  const hibasDarabok = [];

  // ⚠️ A `\r` levágása nem kozmetika: egy Windowson szerkesztett vagy e-mailben átküldött
  // fájl CRLF-fel jön, és a `JSON.parse` a maradék `\r`-től még elmegy — de a fájl végén
  // lévő üres sortól nem. Itt egy helyen kezeljük mindkettőt.
  for (const nyersSor of String(szoveg ?? '').split('\n')) {
    const sor = nyersSor.trim();
    if (!sor) continue;
    sorok++;

    let adat;
    try {
      adat = JSON.parse(sor);
    } catch {
      // A sor sorszáma többet ér, mint a tartalma: ezzel meg lehet nézni a fájlban.
      hibasSorok.push({ sorszam: sorok, eleje: sor.slice(0, 60) });
      continue;
    }

    // ⭐ D72: SZÖVEG-DARAB SOR. ⛔ A bizalom itt sem a fájlból jön (3. szabály): a bájtok
    // lenyomatának egyeznie kell a sor nevével — ami nem egyezik, az nem kerül a tárba, és
    // megnevezzük.
    if (adat && typeof adat === 'object' && typeof adat.szovegDarab === 'string') {
      let bajtok = null;
      try { bajtok = base64UrlBajtok(String(adat.bajtok ?? '')); } catch { bajtok = null; }
      if (!bajtok || await bajtLenyomat(bajtok) !== adat.szovegDarab) {
        hibasDarabok.push({ sorszam: sorok, lenyomat: adat.szovegDarab.slice(0, 43) });
        continue;
      }
      if (beallitas.darabIr) {
        await beallitas.darabIr(bajtok);
        szovegDarabok++;
      }
      continue;
    }
    esemenyek.push(adat);
  }

  // ⭐ ÉS INNENTŐL SEMMI ÚJ: ugyanaz a beolvasztás, mint a hálózaton.
  const eredmeny = await beolvasztas(tar, esemenyek, koino);

  console.log('fajlCsere.behozatalSzovegbol - VÉGE',
    { sorok, uj: eredmeny.uj, hibas: hibasSorok.length, szovegDarabok });
  return { sorok, hibasSorok, szovegDarabok, hibasDarabok, ...eredmeny };
}
