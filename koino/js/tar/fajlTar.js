// koino/js/tar/fajlTar.js

// Felelősség: a koino adatának tárolása FÁJLBAN — böngésző nélkül.
//
// ⭐ MIÉRT NEM BÖNGÉSZŐBEN? (D29, Csaba döntése 2026-08-28)
// Mert a böngésző korlátai nem a koino korlátai. Egy lap nem tud portot nyitni, nem tud
// fogadni kapcsolatot, elrejti a saját címeit, és bezáráskor eltűnik. Az egész
// infrastruktúra, amit a P2P-hez emlegetni szoktak (jelzőpont, STUN, továbbító), jórészt
// EBBŐL következik, nem magából a P2P-ből. Ezért a koino önálló program: a böngésző
// legfeljebb egy kliens lehet később, de nem ő szabja meg, mire képes a koino.
//
// ===== A TÁR ALAKJA =====
//
// Egyetlen HOZZÁFŰZHETŐ fájl koinónként (`esemenyek.jsonl`), soronként egy esemény.
// Ez pontosan az, amit a modell megkövetel: az eseményt SOHA nem módosítjuk és nem
// töröljük — csak új sor keletkezik. A fájl emberi szemmel is olvasható, bármikor
// megnézhető, és egy szövegszerkesztővel is menthető.
//
// Nincs adatbázis-motor, nincs séma-migráció, nincs zárolás. A mérés szerint 10 000
// esemény ellenőrzése 0,58 mp — ezen a méreten a „töltsd be az egészet a memóriába"
// nem kompromisszum, hanem a legegyszerűbb helyes megoldás. Ha egyszer kevés lesz, a
// tár-illesztő mögött kicserélhető, a fölötte lévő rétegek érintése nélkül.
//
// Használják: esemenyTar.js és kulcsTar.js (rajtuk keresztül minden más).

import { mkdir, readFile, appendFile, writeFile, readdir, access, rename, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';

import { szelet } from '../esemeny/esemeny.js';
import { bajtLenyomat } from '../esemeny/kanonikusAlak.js';

// ===================================
// HOL LAKIK AZ ADAT
// ===================================

/**
 * Az adat helye. Alapból a futtatás helyén egy `koino-adat` mappa — de átadható más is
 * (a próbák így kapnak külön, eldobható mappát, hogy ne írjanak az éles adatra).
 */
export function alapHely() {
  return process.env.KOINO_ADAT ?? join(process.cwd(), 'koino-adat');
}

// ===================================
// AZ ESEMÉNY-TÁR
// ===================================

/**
 * Megnyit (és ha kell, létrehoz) egy koino esemény-tárát.
 *
 * ===== ⛔ AZ ILLESZTÉS A 3.2 LÉPÉSBEN ÁTÍRÓDOTT (2026-09-03) =====
 *
 * A régi tároló **két** műveletet adott: `betolt()` és `hozzafuz()`. Ez elegáns volt, de a
 * kilencedik szabály elkapta: **a `betolt()` az ÖSSZES eseményt adja vissza.** Akármilyen
 * okos tárolót teszünk mögé, ha a FELÜLET azt kérdezi, hogy „add ide mindet", akkor minden
 * megvalósítás **kénytelen** mindet visszaadni.
 *
 * ⚠️ **Nem a fájlformátum volt a hiba, hanem az illesztés.** Ezért nem gyorsítótárat tettünk
 * alá (az csak a rossz kérdést gyorsította volna), hanem **kérdezhetővé** tettük:
 *
 *   esemeny(azonosito)          — EGY esemény, azonosító szerint
 *   szerzoLanca(szerzo)         — EGY szerző lánca
 *   szeletEsemenyei(entitas)    — EGY entitás (szelet) eseményei
 *   sorszamSzerint(szerzo, n)   — egy pont a szerző láncán (az elágazás-kereséshez)
 *   hozzafuz(esemeny)           — változatlan
 *   ⚠️ betolt()                 — MEGMARADT, de ez az, ami NEM SKÁLÁZIK (lásd lent)
 *
 * ===== A MEGVALÓSÍTÁS SZÁNDÉKOSAN EGYSZERŰ (9. szabály) =====
 *
 * Mögötte most egy **memóriában tartott mutató** van, amit megnyitáskor egyszer építünk fel,
 * és hozzáfűzéskor karbantartunk. Ez a *szerkezet* szempontjából már milliárdos —
 * a hívók a helyes kérdéseket teszik fel —, a *mélység* pedig később cserélhető
 * (lemezre írt index, részleges betöltés) **anélkül, hogy bárki más változna**.
 *
 * ⭐ ÉS EGY MÉRT MELLÉKHATÁS: ezzel az `esemenyMentese` is olcsó lett. Eddig MINDEN mentés
 * végigolvasta az egész fájlt (mérve: 100 000 eseménynél **495 ms egyetlen mentés**, vagyis
 * N esemény beírása négyzetes volt). A mutatóval a kettősség- és elágazás-keresés O(1).
 *
 * @param {string} koino - a koino azonosítója (ez lesz a mappa neve)
 * @param {string} [hely] - hol legyen az adat (alapból: alapHely())
 * @returns {Promise<Object>} a tároló
 */
export async function esemenyTarNyitasa(koino, hely = alapHely()) {
  console.log('esemenyTarNyitasa - KEZDÉS', { koino, hely });

  const mappa = join(hely, koino);
  await mkdir(mappa, { recursive: true });
  const fajl = join(mappa, 'esemenyek.jsonl');

  // ===== A MUTATÓ =====
  // Négy nézet ugyanarra az eseményhalmazra. A `mind` a fájl sorrendjét őrzi — erre a
  // csere és a próbák támaszkodnak.
  const mind = [];
  const azonositoSzerint = new Map();     // azonosító → esemény
  const szerzoSzerint = new Map();        // szerző → események
  const szeletSzerint = new Map();        // szelet-kulcs → események
  const pontSzerint = new Map();          // szerző|sorszám → események (elágazásnál több)

  /** Egy eseményt bevesz a mutatóba. */
  const bejegyez = (e) => {
    mind.push(e);
    azonositoSzerint.set(e.azonosito, e);

    const szerzoje = szerzoSzerint.get(e.szerzo);
    if (szerzoje) szerzoje.push(e); else szerzoSzerint.set(e.szerzo, [e]);

    // ⭐ A SZELET-KULCS type-független szabálya (`esemeny.js`): vagy meg van mondva, vagy
    // az esemény a saját szeletét nyitja. A tárolónak ennyit kell tudnia a domainről —
    // és pontosan ezért került a mező a burkolatba a 3.1-ben.
    const kulcs = szelet(e);
    const szelete = szeletSzerint.get(kulcs);
    if (szelete) szelete.push(e); else szeletSzerint.set(kulcs, [e]);

    const pont = e.szerzo + '|' + e.sorszam;
    const ottLevok = pontSzerint.get(pont);
    if (ottLevok) ottLevok.push(e); else pontSzerint.set(pont, [e]);
  };

  // ----- A MUTATÓ FELÉPÍTÉSE: egyetlen olvasás megnyitáskor -----
  // ⚠️ Ez még O(fájl), de FUTÁSONKÉNT EGYSZER, nem műveletenként. A következő mélység
  // (lemezre írt index) ezt is eltünteti — a hívók változtatása nélkül.
  try {
    const szoveg = await readFile(fajl, 'utf8');
    let sorszam = 0;
    for (const sor of szoveg.split('\n')) {
      sorszam++;
      if (!sor.trim()) continue;
      try {
        bejegyez(JSON.parse(sor));
      } catch {
        // Egy sérült sor nem teheti olvashatatlanná az egész tárat. Jelezzük, és megyünk
        // tovább — az esemény aláírása úgyis minden sort külön igazol.
        console.warn('esemenyTarNyitasa - sérült sor, kihagyva', { fajl, sorszam });
      }
    }
  } catch (hiba) {
    if (hiba.code !== 'ENOENT') throw hiba;   // még nincs fájl: üres tár
  }

  const tar = {
    fajl,

    /**
     * ⚠️ AZ ÖSSZES ESEMÉNY — EZ AZ, AMI NEM SKÁLÁZIK.
     *
     * Szándékosan megmaradt, mert két helyen jogos: a **próbák** így nézik meg a tár nyers
     * gondolatát, és a **kis koino** állapotszámítása így kapja meg a bemenetét. De a
     * hétköznapi műveletek közül **egyetlen sem hívja** — és ez a 3.2 lényege.
     *
     * ⛔ Új kódban ne ezt használd: kérdezz szeletet, láncot vagy azonosítót.
     */
    async betolt() {
      return [...mind];
    },

    /** EGY esemény, azonosító szerint. O(1). */
    async esemeny(azonosito) {
      return azonositoSzerint.get(azonosito);
    },

    /** EGY szerző eseményei (a fájl sorrendjében). */
    async szerzoLanca(szerzo) {
      return [...(szerzoSzerint.get(szerzo) ?? [])];
    },

    /** EGY szelet (entitás) eseményei. */
    async szeletEsemenyei(entitas) {
      return [...(szeletSzerint.get(entitas) ?? [])];
    },

    /** Egy pont a szerző láncán — rendes esetben egy esemény, elágazásnál több. */
    async sorszamSzerint(szerzo, sorszam) {
      return [...(pontSzerint.get(szerzo + '|' + sorszam) ?? [])];
    },

    /** Egy új esemény a fájl végére — és a mutatóba. */
    async hozzafuz(esemeny) {
      await appendFile(fajl, JSON.stringify(esemeny) + '\n', 'utf8');
      bejegyez(esemeny);
    }
  };

  console.log('esemenyTarNyitasa - VÉGE', { fajl, esemeny: mind.length });
  return tar;
}

// ===================================
// A KULCS TÁROLÁSA
// ===================================

/**
 * A kulcs tárolója: egyetlen JSON-fájl.
 *
 * ⚠️ A privát kulcs TITKOSÍTATLANUL van benne. Ez tudatos, és ugyanaz a döntés, mint a
 * böngészős változatban volt (Csaba, 2026-08-26): a kulcs elvesztése hétköznapi
 * kockázat, a mentés viszont egy lépés. Aki hozzáfér a fájlhoz, a nevedben tud aláírni —
 * ezért a fájl a te gépeden, a te mappádban van, és a program meg is mondja, hol.
 *
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function kulcsTarolo(hely = alapHely()) {
  const fajl = join(hely, 'kulcs.json');

  return {
    fajl,

    /** @returns {Promise<Object|null>} a mentett kulcs-leírás, vagy null */
    async olvas() {
      try {
        return JSON.parse(await readFile(fajl, 'utf8'));
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return null;
        throw hiba;
      }
    },

    /** @param {Object} leiras */
    async ir(leiras) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify(leiras, null, 2), 'utf8');
    }
  };
}

// ===================================
// A TÁRS-LISTA TÁROLÁSA
// ===================================

/**
 * A társak listája: egyetlen JSON-fájl, KÉZZEL IS SZERKESZTHETŐ.
 *
 * ⭐ MIÉRT NEM ESEMÉNY? Mert a cím nem igazság, hanem múlandó körülmény. Egy aláírt
 * esemény örökre megmarad — egy IP-cím két hét múlva már másé. A társ-lista ezért HELYI
 * FELJEGYZÉS: nem terjed, nem kell rá egyetértés, és bárki átírhatja a saját gépén.
 * *(A terjedő címjegyzék külön kérdés lesz — D. lépés, aláírt, de MULANDÓ üzenetekkel.)*
 *
 * ⭐ A 4. SZABÁLY ITT LÁTSZIK: mivel sima JSON-fájl egy ismert helyen, a társ-lista
 * kézzel is összeállítható — egy szövegszerkesztővel, hálózat nélkül. Nincs olyan
 * pont, ahol egy szolgáltatás kellene ahhoz, hogy a koino tudja, kikkel beszéljen.
 *
 * ⚠️ Készülék-szintű, nem koino-szintű (mint a kulcs): ugyanaz a társ jellemzően minden
 * közös koinóban ugyanaz a társ, és a cím a készülékhez tartozik, nem a témához.
 *
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function tarsakTarolo(hely = alapHely()) {
  const fajl = join(hely, 'tarsak.json');

  return {
    fajl,

    /** @returns {Promise<Array<Object>>} a társak, vagy üres lista */
    async olvas() {
      let szoveg;
      try {
        szoveg = await readFile(fajl, 'utf8');
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return [];   // még nincs fájl: nincs társ
        throw hiba;
      }

      try {
        const adat = JSON.parse(szoveg);
        // Kézzel írt fájlnál a puszta tömb is elfogadható — ne bosszantsuk azt, aki
        // gyorsan beírt két címet.
        const lista = Array.isArray(adat) ? adat : adat.tarsak;
        return Array.isArray(lista) ? lista : [];
      } catch {
        // Egy elrontott társ-lista NE akadályozza meg a koino futását: a társ kényelem,
        // nem előfeltétel (2. szabály).
        console.warn('tarsakTarolo - olvashatatlan társ-lista, üresnek vesszük', { fajl });
        return [];
      }
    },

    /** @param {Array<Object>} lista */
    async ir(lista) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify({ tarsak: lista }, null, 2), 'utf8');
    }
  };
}

// ===================================
// A SZELET-CÍMJEGYZÉK TÁROLÁSA
// ===================================

/**
 * „Kinél van ez az entitás?" — egyetlen JSON-fájl, a társ-listához hasonlóan.
 *
 * ⚠️ MIÉRT KÜLÖN FÁJL A TÁRS-LISTÁTÓL? Mert más a természete és más az élettartama. A
 * társ-lista **készülék-szintű** és tartós („kikkel szoktunk beszélni"); ez **entitás-szintű**
 * és **múlandó** („hol láttam ezt a gondolatot"). Egy fájlba téve a rövid életű bejegyzések
 * kimosnák a tartósakat.
 *
 * ⭐ És ugyanaz igaz rá, mint a társ-listára: **nem esemény, nem terjed igazságként, és
 * semmit nem dönt el a koinóban** (3. szabály). Kézzel is szerkeszthető, tehát a 4. szabály
 * kézi útja itt is megvan.
 *
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function szeletJegyzekTarolo(hely = alapHely()) {
  const fajl = join(hely, 'szeletcimek.json');

  return {
    fajl,

    /** @returns {Promise<Array<Object>>} a bejegyzések, vagy üres lista */
    async olvas() {
      try {
        const adat = JSON.parse(await readFile(fajl, 'utf8'));
        const lista = Array.isArray(adat) ? adat : adat.szeletek;
        return Array.isArray(lista) ? lista : [];
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return [];
        // Egy elrontott jegyzék NE akadályozza meg a koino futását: ez kényelem, nem
        // előfeltétel (2. szabály). Üresnek vesszük, és újratanuljuk használat közben.
        console.warn('szeletJegyzekTarolo - olvashatatlan jegyzék, üresnek vesszük', { fajl });
        return [];
      }
    },

    /** @param {Array<Object>} lista */
    async ir(lista) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify({ szeletek: lista }, null, 2), 'utf8');
    }
  };
}

// ===================================
// ⭐⭐ A FÁJLOK — tartalom-címzett tár (Szakasz 5.7)
// ===================================
//
// ⛔⛔ A KÉP NEM MEHET AZ ESEMÉNYBE. Egy esemény ma ~400 bájt, egy fénykép ennek több
// ezerszerese — a **6. szabály KEMÉNY fele** (az adat-csomag kicsi marad) ezt kizárja.
// Szerver-mappa viszont nincs, és nem is lehet: a **2. szabály** szerint semmi ne múljon
// egyetlen címen.
//
// ⭐ A MEGOLDÁS A KOINO SAJÁT MINTÁJA: a fájlt a **lenyomata** nevezi meg, ahogy minden
// mást a koinóban. Az esemény csak ezt a ~43 karakteres nevet hordozza (a mérettel és a
// típussal együtt ~100 bájt), a **bájtok külön élnek** — a tartalmi rétegben (D3).
//
// ⭐⭐ ÉS EBBŐL KÉT DOLOG INGYEN JÖN:
//
//   · **Az ellenőrzés** (3. szabály): aki megkapja a bájtokat, újra lenyomatolja, és látja,
//     hogy azt kapta-e, amit az esemény megnevezett. *A csatornát nem kell megbízhatóvá
//     tenni — a név MAGA a bizonyíték.*
//   · **A duplikátum elnyelése**: ugyanaz a kép kétszer beszúrva EGY fájl a lemezen, mert
//     ugyanaz a neve. (Ugyanaz az érv, mint az `esemenyMentese` duplikátum-kezelésénél.)
//
// ⚠️ ÉS AMI NEM JÖN INGYEN: a bájtok **szállítása** két készülék között. Az még nincs meg —
// a terv Csabáé (2026-09-12): a **buli** a randevú-megbeszélés, ott derül ki, kinek mi kell,
// és utána a két érintett készülék tartja a kapcsolatot, amíg a másolás tart. ⛔ Addig egy
// kép **csak azon a készüléken van meg, ahol beszúrták** — a többi a hiányt LÁTJA, nem
// kitalál helyette semmit (D19). *Ez pontosan a D3 tartalmi rétege: elveszhet.*

/**
 * ⛔ A FÁJL FELSŐ MÉRETHATÁRA — és ez **Csaba döntése**, nem az enyém (2026-09-12 óta
 * nyitott kérdés: *„egy videóra is kell egy »eddig és ne tovább«"*).
 *
 * Az itteni 2 MB **kiindulás**, nem állásfoglalás: egy telefonos fénykép 2–5 MB, egy
 * lekicsinyített 200–500 KB. ⭐ Egy helyen van, tehát a hangolása egyetlen sor.
 *
 * ⭐⭐ ÉS EGY FONTOS KÜLÖNBSÉGTÉTEL: ez **NEM** állapot-befolyásoló állandó (D66), tehát
 * **nem hasítja ketté a koinót**, ha két készüléken más. Ha nálam 2 MB a határ, nálad 5,
 * akkor ugyanazt az **állapotot** számoljuk (entitások, döntések) — csak nekem nincs meg
 * az a kép. *A D3 szerint a tartalmi réteg amúgy is elveszhet; a tartós magot ez nem
 * érinti.* Ezért szabad kiindulási értéket adni neki, és ezért nem kell koino-azonosítót
 * váltani, ha megváltozik.
 */
export const FAJL_KORLAT = 2 * 1024 * 1024;

/**
 * ⛔⛔ A FÁJL TÍPUSA A BÁJTJAIBÓL DERÜL KI — SOHA NEM A KLIENS SZAVÁBÓL.
 *
 * ⚠️ EZ BIZTONSÁGI KÉRDÉS, nem kényelmi. Ha a lap mondhatná meg a típust, valaki
 * feltölthetne egy HTML-fájlt `text/html`-ként, és a koino **a saját origin-jéről**
 * szolgálná ki — vagyis a feltöltött kód hozzáférne mindenhez, amit a lap elér
 * (a kapu jelszavát is beleértve). *A bájtokból kiolvasott típust nem lehet hazudni.*
 *
 * ⭐ ÉS EZ A KOINO ÁLTALÁNOS MINTÁJA: amit le lehet vezetni, azt ne kelljen bemondani —
 * ugyanaz az érv, mint a `kivisz`-nél a horgonynál vagy az `entitasTipus` kihagyásánál.
 *
 * @param {Uint8Array} bajtok
 * @returns {string} a kiszolgálható MIME-típus; ismeretlennél letöltendő bináris
 */
export function fajlTipus(bajtok) {
  const b = bajtok;
  const eleje = (...jelek) => jelek.every((j, i) => b[i] === j);

  if (eleje(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (eleje(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (eleje(0x47, 0x49, 0x46, 0x38)) return 'image/gif';
  // RIFF….WEBP
  if (eleje(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45
      && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (eleje(0x25, 0x50, 0x44, 0x46)) return 'application/pdf';

  // ⛔ AMIT NEM ISMERÜNK FEL, AZ LETÖLTENDŐ BINÁRIS — nem találgatunk. A `nosniff`
  // fejléccel együtt ez azt jelenti, hogy a böngésző SEM fogja megjeleníteni.
  return 'application/octet-stream';
}

/**
 * A koino fájl-tára: bájtok a lenyomatuk NEVE alatt.
 *
 * ⚠️ KOINÓNKÉNT KÜLÖN MAPPA, mint az eseményeknél — hogy egy koino elhagyásakor a hozzá
 * tartozó fájlok is egyben legyenek.
 *
 * @param {string} koino
 * @param {string} [hely]
 * @returns {{ir: Function, olvas: Function, van: Function, lista: Function, mappa: string}}
 */
export function fajlBlobTarolo(koino, hely = alapHely()) {
  const mappa = join(hely, koino, 'fajlok');

  /**
   * ⚠️ A LENYOMAT base64url, amiben van `-` és `_` — fájlnévnek ez rendben van, DE a `/`
   * nem fordulhat elő (a base64url épp ezt cseréli le), és a `..` sem. Akkor is
   * ellenőrizzük, ha mi állítjuk elő: ez a név **kívülről is jöhet** (a lap kéri le), és
   * ott már útvonal-támadás lenne belőle.
   */
  function utja(lenyomat) {
    if (typeof lenyomat !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(lenyomat)) {
      throw new Error('Érvénytelen fájl-lenyomat.');
    }
    return join(mappa, lenyomat);
  }

  // ⭐ A RÉSZLEGES FÁJL KÜLÖN MAPPÁBAN áll, és ez szándékos: ⛔ a `lista()` így **soha nem
  // mondja azt egy félkész fájlról, hogy megvan** — kulönben a bulin felajánlanánk másnak
  // valamit, ami még nincs készen. *A félkész és a kész két külön állapot, két külön helyen.*
  function reszlegesUtja(lenyomat) {
    return join(mappa, 'reszleges', lenyomat.length === 43 ? lenyomat : utja(lenyomat));
  }

  return {
    mappa,

    /**
     * Bájtok beírása. A NEVE a lenyomatuk — tehát ugyanaz a tartalom mindig ugyanoda kerül.
     * @param {Uint8Array} bajtok
     * @returns {Promise<{lenyomat: string, meret: number, mar: boolean}>}
     */
    async ir(bajtok) {
      const nyers = bajtok instanceof Uint8Array ? bajtok : new Uint8Array(bajtok);
      if (nyers.length > FAJL_KORLAT) {
        throw new Error('A fájl túl nagy: ' + nyers.length + ' bájt (a határ '
          + FAJL_KORLAT + ').');
      }

      const lenyomat = await bajtLenyomat(nyers);
      const ut = utja(lenyomat);

      // ⭐ HA MÁR MEGVAN, NEM ÍRJUK ÚJRA: azonos név = azonos tartalom.
      try {
        await access(ut);
        return { lenyomat, meret: nyers.length, mar: true };
      } catch { /* nincs meg — most írjuk */ }

      await mkdir(mappa, { recursive: true });
      await writeFile(ut, nyers);
      return { lenyomat, meret: nyers.length, mar: false };
    },

    /**
     * Bájtok kiolvasása — ⭐ ELLENŐRZÉSSEL.
     *
     * ⛔ AZ ELLENŐRZÉS NEM ÓVATOSKODÁS. A fájl a lemezen romolhat, és ami rosszabb: egyszer
     * majd **hálózatról** fog érkezni. Ha nem néznénk meg, a koino olyan bájtokat adna a
     * lapnak, amikről csak *hisszük*, hogy azok. Így viszont a név maga a bizonyíték.
     *
     * @returns {Promise<Uint8Array|null>} null, ha nincs meg vagy nem egyezik
     */
    async olvas(lenyomat) {
      // ⛔⛔ AZ ELLENŐRZÉS A `try`-ON KÍVÜL — és ez nem stílus, hanem jelentés (D19).
      //
      // Előbb belül volt, és a `catch` elnyelte: egy `../../kulcs.json` alakú név
      // **hiánynak** látszott, nem hibának. *A kettő nem ugyanaz:* a hiány normális
      // (a fájl még nem ért ide), az érvénytelen név viszont azt jelenti, hogy a hívó
      // szemetet küldött — és azt meg kell mondani neki. *(Próba találta meg.)*
      const ut = utja(lenyomat);

      let bajtok;
      try {
        bajtok = new Uint8Array(await readFile(ut));
      } catch {
        return null;                      // nincs meg — ez nem hiba, hanem hiány (D19)
      }

      const ellenorzes = await bajtLenyomat(bajtok);
      if (ellenorzes !== lenyomat) {
        console.warn('fajlBlobTarolo - A FÁJL NEM AZ, AMINEK A NEVE MONDJA', { lenyomat });
        return null;
      }
      return bajtok;
    },

    /** Megvan-e? (Olcsó kérdés: nem olvassuk be és nem ellenőrizzük.) */
    async van(lenyomat) {
      try { await access(utja(lenyomat)); return true; } catch { return false; }
    },

    // ===================================
    // ⭐⭐ A RÉSZLEGES FÁJL — a megszakadt átvitel folytatásához (5.7 / B)
    // ===================================
    //
    // ⭐ A RÉSZLEGES FÁJL MÉRETE MAGA AZ ÁLLAPOT. Nem vezetünk külön nyilvántartást arról,
    // hogy hányadik szeletnél tartunk: a szeletek **rögzített méretűek és sorrendben**
    // érkeznek, tehát a meglévő bájtok száma megmondja, hol folytassuk. *Ugyanaz az elv,
    // mint az esemény-tárnál: a fájl tartalma az igazság, nem egy mellette vezetett napló.*
    //
    // ⛔⛔ ÉS A LEZÁRÁS ELŐTT MINDIG ELLENŐRZÜNK. A részleges fájl **ideiglenes néven** áll,
    // és csak akkor kerül a végleges (lenyomat-)nevére, ha a bájtjai tényleg azt adják ki.
    // *Így egy megszakadt vagy meghamisított letöltés SOHA nem hagy hátra hamis fájlt* —
    // és a csatornát továbbra sem kell megbízhatóvá tenni (3. szabály).

    /** Hány bájt van meg eddig? (0, ha még semmi.) */
    async reszlegesMeret(lenyomat) {
      try {
        return (await readFile(reszlegesUtja(lenyomat))).length;
      } catch {
        return 0;
      }
    },

    /**
     * Egy szelet hozzáfűzése a részleges fájlhoz.
     *
     * ⛔ A FELSŐ KORLÁT ITT IS ÉL: egy rosszindulatú társ végtelen bájtot küldhetne, és a
     * lemezünket töltené meg. A korlát túllépésekor **eldobjuk az egészet**.
     */
    async reszlegesHozzafuz(lenyomat, bajtok) {
      const ut = reszlegesUtja(lenyomat);
      const eddigi = await this.reszlegesMeret(lenyomat);
      const nyers = bajtok instanceof Uint8Array ? bajtok : new Uint8Array(bajtok);

      if (eddigi + nyers.length > FAJL_KORLAT) {
        await this.reszlegesEldobas(lenyomat);
        throw new Error('A részleges fájl túllépte a határt — eldobva.');
      }

      await mkdir(dirname(ut), { recursive: true });
      await appendFile(ut, nyers);
      return eddigi + nyers.length;
    },

    /**
     * A részleges fájl lezárása: ⭐ **ellenőrzés, majd átnevezés a végleges nevére**.
     *
     * @returns {Promise<{rendben: boolean, ok?: string}>}
     */
    async reszlegesLezaras(lenyomat) {
      const ut = reszlegesUtja(lenyomat);

      let bajtok;
      try {
        bajtok = new Uint8Array(await readFile(ut));
      } catch {
        return { rendben: false, ok: 'nincs részleges fájl' };
      }

      // ⛔⛔ A NÉV MAGA A BIZONYÍTÉK: ha a bájtok nem ezt a lenyomatot adják, a fájl NEM az,
      // aminek mondják — eldobjuk, és nem hagyunk hátra semmit.
      const ellenorzes = await bajtLenyomat(bajtok);
      if (ellenorzes !== lenyomat) {
        await this.reszlegesEldobas(lenyomat);
        return { rendben: false, ok: 'a bájtok nem ezt a lenyomatot adják — eldobva' };
      }

      await mkdir(mappa, { recursive: true });
      await rename(ut, utja(lenyomat));
      return { rendben: true };
    },

    /** A félbehagyott letöltés eldobása. */
    async reszlegesEldobas(lenyomat) {
      try { await rm(reszlegesUtja(lenyomat)); } catch { /* nincs mit eldobni */ }
    },

    /** Mely fájlok vannak meg? — a szállítás majd ebből tudja, mit kell kérni. */
    async lista() {
      try {
        return (await readdir(mappa)).filter((n) => /^[A-Za-z0-9_-]{43}$/.test(n));
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return [];
        throw hiba;
      }
    }
  };
}

/**
 * „Kinél van meg ez a fájl?" — amit a bulikon tanultunk.
 *
 * ⚠️ **HELYI FELJEGYZÉS, NEM ESEMÉNY** (3. szabály): sosem terjed, két készüléken mást
 * jelent, és semmit nem dönt el a koinóban — csak azt, hogy **kitől érdemes kérni**.
 * Ugyanaz a fajta, mint a `tarsak.js` `utoljara` mezője. Ha elveszik, a következő buli
 * újratanulja.
 *
 * ⚠️ KOINÓNKÉNT KÜLÖN, mint a fájlok maguk.
 *
 * @param {string} koino
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function fajlJegyzekTarolo(koino, hely = alapHely()) {
  const fajl = join(hely, koino, 'fajlbirtoklas.json');

  return {
    fajl,

    /** @returns {Promise<Object>} lenyomat → { tarsak: { címke: időpont } } */
    async olvas() {
      try {
        const adat = JSON.parse(await readFile(fajl, 'utf8'));
        return (adat && typeof adat === 'object' && !Array.isArray(adat)) ? adat : {};
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return {};
        // Egy elrontott jegyzék NE akadályozza a koino futását: ez kényelem, nem
        // előfeltétel (2. szabály). Üresnek vesszük, és újratanuljuk a bulikon.
        console.warn('fajlJegyzekTarolo - olvashatatlan jegyzék, üresnek vesszük', { fajl });
        return {};
      }
    },

    /** @param {Object} jegyzet */
    async ir(jegyzet) {
      await mkdir(join(hely, koino), { recursive: true });
      await writeFile(fajl, JSON.stringify(jegyzet, null, 2), 'utf8');
    }
  };
}

// ===================================
// ⭐ A TÉR — MELYIK KOINÓKAT ISMERI EZ A KÉSZÜLÉK? (Szakasz 5.6)
// ===================================

/**
 * A készüléken lévő koinók azonosítói.
 *
 * ⭐ MIÉRT A MAPPÁK, ÉS MIÉRT NEM EGY NYILVÁNTARTÁS? Mert a mappa MAGA a nyilvántartás: egy
 * koino attól van meg nekem, hogy itt az `esemenyek.jsonl`-je. Egy külön lista mellette
 * **elcsúszhatna** az igazságtól — a `tarsak.json` azért lehet külön fájl, mert az
 * megfigyelés (kivel sikerült beszélni), ez viszont TÉNY (megvan-e az adat).
 *
 * ⚠️ **CSAK AMIT EZ A KÉSZÜLÉK ISMER.** A D25 belépő tere ennél többet szeretne majd
 * mutatni (böngészni az idegen koinókat is), de ahhoz a **kereső-réteg** kell, ami
 * szándékosan elhagyható és még nincs meg. Amíg nincs, ez a lista az őszinte válasz —
 * és nem hazudunk teljességet.
 *
 * 🔍 A 9. SZABÁLY PRÓBÁJA: *„mit csinál egymilliárd e-embernél?"* — ez a szám **nem** az
 * e-emberek száma, hanem **ahány koinóban EZ A KÉSZÜLÉK benne van**. Az szerkezetileg
 * kicsi marad (egy ember néhány közösségben él), tehát a felsorolás itt nem fojtópont.
 *
 * @param {string} [hely]
 * @returns {Promise<Array<string>>} a koino-azonosítók, ábécé szerint
 */
export async function ismertKoinok(hely = alapHely()) {
  console.log('ismertKoinok - KEZDÉS', { hely });

  let bejegyzesek;
  try {
    bejegyzesek = await readdir(hely, { withFileTypes: true });
  } catch (hiba) {
    // Nincs még adat-mappa: ez nem hiba, csak még nincs egy koinónk sem.
    if (hiba.code === 'ENOENT') return [];
    throw hiba;
  }

  const koinok = [];
  for (const b of bejegyzesek) {
    if (!b.isDirectory()) continue;
    // ⛔ A MAPPA ÖNMAGÁBAN NEM ELÉG: csak az számít koinónak, aminek van esemény-fájlja.
    // Különben egy odatévedt mappa üres kártyaként jelenne meg a téren.
    try {
      await access(join(hely, b.name, 'esemenyek.jsonl'));
      koinok.push(b.name);
    } catch { /* nincs esemény-fájl → nem koino */ }
  }

  koinok.sort();
  console.log('ismertKoinok - VÉGE', { darab: koinok.length });
  return koinok;
}

/**
 * „Mikor láttam ELŐSZÖR ezt a koinót?" — koinónként egy időpont.
 *
 * ⚠️ **Helyi feljegyzés, nem esemény** (3. szabály): sosem terjed, két készüléken mást
 * jelent, és semmit nem dönt el a koinóban — ugyanaz a fajta, mint a `tarsak.js`
 * `utoljara` mezője vagy a felszabadítási óra.
 *
 * ⭐ MIRE KELL? A belépő tér rendezéséhez a terv két időpontot kínál, és a különbségük
 * elvi: a **`KoinoLetrehozas.ido`** a szerző órája — vagyis **állítás**, amit kívülről nem
 * lehet igazolni (⚠️ ezért nem rendez `ido` szerint az `allapotSzamitas.js` sehol) —, az
 * **először látás** viszont a saját megfigyelésem, tehát **hamisíthatatlan**. Az ára, hogy
 * készülékenként más sorrendet ad. *Mindkettőt eltesszük, hogy a választás egy sor legyen.*
 *
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function terJegyzekTarolo(hely = alapHely()) {
  const fajl = join(hely, 'ter.json');

  return {
    fajl,

    /** @returns {Promise<Object>} koino → mikor láttuk először */
    async olvas() {
      try {
        const adat = JSON.parse(await readFile(fajl, 'utf8'));
        return (adat && typeof adat === 'object' && !Array.isArray(adat)) ? adat : {};
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return {};
        console.warn('terJegyzekTarolo - olvashatatlan feljegyzés, üresnek vesszük', { fajl });
        return {};
      }
    },

    /** @param {Object} jegyzet */
    async ir(jegyzet) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify(jegyzet, null, 2), 'utf8');
    }
  };
}

// ===================================
// A FELSZABADÍTÁSI FELJEGYZÉS TÁROLÁSA
// ===================================

/**
 * „Mikor láttam ELŐSZÖR töröltnek?" — entitásonként egy időpont.
 *
 * ⭐ MIRE VALÓ? A törölt gondolatra tett tudatpontomat a készülékem magától visszaveszi —
 * de **csak megülepedés után** (`js/allapot/felszabaditas.js`), mert egy késve érkező, de
 * határidőn belüli szavazat még visszafordíthatja a döntést. Ez a fájl tartja az órát.
 *
 * ⚠️ **Helyi feljegyzés, nem esemény** (3. szabály): sosem terjed, két készüléken mást
 * jelent, és semmit nem dönt el a koinóban — csak azt, hogy MIKOR könyvelek. Ha elveszik,
 * az óra újraindul: legrosszabb esetben egy nappal később szabadul fel a pont.
 *
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function felszabaditasTarolo(hely = alapHely()) {
  const fajl = join(hely, 'felszabaditas.json');

  return {
    fajl,

    /** @returns {Promise<Object>} entitás → mikor láttuk először töröltnek */
    async olvas() {
      try {
        const adat = JSON.parse(await readFile(fajl, 'utf8'));
        return (adat && typeof adat === 'object' && !Array.isArray(adat)) ? adat : {};
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return {};
        console.warn('felszabaditasTarolo - olvashatatlan feljegyzés, üresnek vesszük', { fajl });
        return {};
      }
    },

    /** @param {Object} jegyzet */
    async ir(jegyzet) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify(jegyzet, null, 2), 'utf8');
    }
  };
}
