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
// Nincs adatbázis-motor és nincs séma-migráció. ⭐ A fájl mellett a MUTATÓ él (D73,
// 2026-09-27): eseményenként a sor helye, azonosítója, szerzője, sorszáma és szelete — az
// esemény teste nélkül —, és a pillanatképe (`mutato.json`), hogy a megnyitásnak ne kelljen
// az egész fájlt olvasnia. A testek kérésre jönnek. *Az adat a fájl; a mutató csak a térkép
// hozzá — ha nem illik, a fájlból újraépül.* A zárolás nem itt van: egy koinó tárához egy
// folyamat fűz, az író (`iro.js`, D70).
//
// Használják: esemenyTar.js és kulcsTar.js (rajtuk keresztül minden más).

// ⚠️ A `rename` 2026-09-15-ig a részleges fájl lezárásához kellett; azóta a szeleteket
// ÖSSZEFŰZVE írjuk ki (D68 / 6.). ⭐ A D73 óta újra kell: a mutató pillanatképe átnevezéssel
// kerül a helyére, egyszerre egészben.
import { mkdir, readFile, appendFile, writeFile, readdir, access, rm, stat, open, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';

import { szelet, bejelentesHelyei } from '../esemeny/esemeny.js';
import { bajtLenyomat } from '../esemeny/kanonikusAlak.js';
import { rendezettHalmaz, halmazLenyomata } from '../esemeny/halmaz.js';

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

// ⭐ A pillanatképet akkor írjuk újra, ha a megnyitáskor ennyi (vagy több) eseményt kellett a
// fájlból olvasni — a pillanatkép nélkül, vagy utána. ⚠️ Nem állapot-befolyásoló állandó: a
// pillanatkép csak gyorsítótár; kis tárnál nem is készül (ott a teljes olvasás olcsó).
export const KEP_KUSZOB = 1000;

// A pillanatkép alakjának változata. ⚠️ Ha a mutató mezői változnak, ez nő — a régi képet a tár
// eldobja, és egyszer a fájlból épít újat (a kép tiszta gyorsítótár).
const KEP_VALTOZAT = 3;

// ⭐ Ennél több hiányzó testet egyetlen, sorban olvasással hozunk (mint a teljes betöltés);
// kevesebbet egyenként, a nyitott fájl adott helyéről.
const SOROS_OLVASAS_FELETT = 256;

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
 *   szeletek()                  — ⭐ D73: a szeletek jegyzéke (szeletenként az eseményszám)
 *   szeletLenyomata(szelet)     — ⭐ D73: egy szelet lenyomata (a C lépés erre épít)
 *   hozzafuz(esemeny)           — változatlan
 *   frissit()                   — amit MÁSIK folyamat fűzött hozzá (2026-09-26, 43. mérés)
 *   ⚠️ betolt()                 — MEGMARADT, de ez az, ami NEM SKÁLÁZIK (lásd lent)
 *
 * ===== ⭐⭐ D73 (2026-09-27): EGY ADATFÁJL + A MUTATÓ PILLANATKÉPE =====
 *
 * A szeletelési terv szeletenként egy fájlt írt (S3). A 49. mérés ezt Windowson megdöntötte:
 * 100 000 eseménynél 28 825 fájl, és a C lépésig a hétköznapi út MINDENT kér — ez szelet-
 * fájlokból **19,6 s** (párhuzamosan 4,9) a mai 0,69 helyett. Csaba döntése: **az adat
 * marad egy hozzáfűzhető fájlban** (ez a kézi út alakja is), és mellette él
 * — ⭐ **a MUTATÓ, az esemény TESTE NÉLKÜL:** eseményenként a sor helye a fájlban (eltolás,
 *   hossz), az azonosító, a szerző, a sorszám és a szelet. Ebből felel mind a négy kérdés,
 *   és ebből jön a szelet lenyomata is — test nélkül;
 * — ⭐ **a mutató PILLANATKÉPE** (`mutato.json`): a megnyitás ezt olvassa, és csak a fájl
 *   pillanatkép utáni végét (mérve: 689 → 188 ms 100 000 eseménynél). ⚠️ **Tiszta
 *   gyorsítótár:** ha nincs, sérült, vagy nem illik a fájlhoz, a teljes olvasás pótolja;
 * — ⭐ **a testek KÉRÉSRE jönnek**, a fájl adott helyéről (egy szelet: 0,21 ms), és
 *   megmaradnak a memóriában.
 *
 * *A git csomag-fájlja ugyanez: egy adatfájl, mellette az index.* A szerkezet (a kérdések)
 * változatlan; a mélység (a pillanatkép lusta, szeletenkénti olvasása) később jöhet — a
 * hívók változása nélkül (9. szabály).
 *
 * ⛔⛔ **A PILLANATKÉP NEM TÉVESZTHET MEG.** A megnyitás megnézi, hogy a pillanatkép utolsó
 * bejegyzése tényleg ott van-e a fájlban; és MINDEN test beolvasásakor ellenőrizzük, hogy az
 * adott helyen tényleg a várt azonosítójú esemény áll. Ha nem, a mutatót a fájlból újraépítjük
 * (a fájl az igazság, a mutató csak a térkép hozzá). *Ugyanaz az elv, mint a fájl-táré: a név
 * maga a bizonyíték.*
 *
 * ⭐ ÉS EGY MÉRT MELLÉKHATÁS (3.2): az `esemenyMentese` is olcsó — a kettősség- és
 * elágazás-keresés a mutatóból O(1), nem a fájl végigolvasása (100 000-nél 495 ms volt).
 *
 * @param {string} koino - a koino azonosítója (ez lesz a mappa neve)
 * @param {string} [hely] - hol legyen az adat (alapból: alapHely())
 * @param {Object} [beallitas]
 * @param {number} [beallitas.kepKuszob] - ennyi olvasott esemény után írunk pillanatképet
 *        (alapból `KEP_KUSZOB`; a próbák kicsire veszik)
 * @returns {Promise<Object>} a tároló
 */
export async function esemenyTarNyitasa(koino, hely = alapHely(), beallitas = {}) {
  console.log('esemenyTarNyitasa - KEZDÉS', { koino, hely });
  const kepKuszob = beallitas.kepKuszob ?? KEP_KUSZOB;

  const mappa = join(hely, koino);
  await mkdir(mappa, { recursive: true });
  const fajl = join(mappa, 'esemenyek.jsonl');
  const kepFajl = join(mappa, 'mutato.json');

  // ===== A MUTATÓ — az esemény TESTE NÉLKÜL =====
  // Egy bejegyzés: { o: eltolás, h: hossz (bájt, sorvég nélkül), a: azonosító, z: szerző,
  // n: sorszám, s: szelet }. ⚠️ A saját `hozzafuz()`-ünk eltolása még ismeretlen (`o: null`) —
  // a fájl következő olvasása pótolja; addig a teste úgyis a memóriában van.
  let sorrend = [];                       // a beérkezés (a fájl) sorrendjében — a `betolt()`-nek
  let azonositoSzerint = new Map();       // azonosító → bejegyzés
  let szerzoSzerint = new Map();          // szerző → bejegyzések
  let szeletSzerint = new Map();          // szelet-kulcs → bejegyzések
  // ⭐ A C 7. pontja (a gyerek-bejelentés), D85/1, D85/3 óta általánosan: szelet → a hozzá BEJELENTETT
  // események (a gyerekek születése, a javaslatok, a szavazatok — `bejelentesHelyei`). A legfelső szintű
  // gondolaté a '' (a gyökér) alatt.
  let bejelentesSzerint = new Map();
  // ⭐ szerző → (sorszám → bejegyzések; elágazásnál több). KÉRÉSRE épül, szerzőnként: csak az
  // elágazás-keresés kérdezi, és a megnyitáskor 100 000 szöveg-kulcs ~80 ms volt (49. mérés).
  let pontSzerint = new Map();

  // ⭐ A TESTEK: azonosító → az esemény — kérésre töltve, és utána itt maradnak.
  const testek = new Map();
  // ⭐ A szelet-lenyomatok: kérésre számolva, és ha a szelet bővül, eldobva.
  const lenyomatok = new Map();

  // ⭐ MEDDIG OLVASTUK A FÁJLT (bájtban) — a `frissit()` innen folytatja (43. mérés).
  let ismertMeret = 0;
  // Honnan épült a mutató (a próbáknak és a naplónak).
  let pillanatkepbol = false;

  const hozza = (terkep, kulcs, b) => {
    const lista = terkep.get(kulcs);
    if (lista) lista.push(b); else terkep.set(kulcs, [b]);
  };

  /**
   * Egy bejegyzés a mutatóba. Ha az azonosító már ismert, csak a hiányzó helyét pótolja.
   * @returns {boolean} igaz, ha új
   */
  function bejegyez(b) {
    const meglevo = azonositoSzerint.get(b.a);
    if (meglevo) {
      if (meglevo.o === null && b.o !== null) { meglevo.o = b.o; meglevo.h = b.h; }
      return false;
    }
    sorrend.push(b);
    azonositoSzerint.set(b.a, b);
    hozza(szerzoSzerint, b.z, b);
    // ⭐ A SZELET-KULCS type-független szabálya (`esemeny.js`): vagy meg van mondva, vagy az
    // esemény a saját szeletét nyitja. A tárolónak ennyit kell tudnia a domainről.
    hozza(szeletSzerint, b.s, b);
    for (const k of b.p) hozza(bejelentesSzerint, k, b);
    const pontjai = pontSzerint.get(b.z);
    if (pontjai) hozza(pontjai, b.n, b);
    lenyomatok.delete(b.s);
    return true;
  }

  /** Egy szerző lánc-pontjai (sorszám → bejegyzések) — az első kérdéskor épül. */
  function szerzoPontjai(szerzo) {
    let pontjai = pontSzerint.get(szerzo);
    if (!pontjai) {
      pontjai = new Map();
      for (const b of szerzoSzerint.get(szerzo) ?? []) hozza(pontjai, b.n, b);
      pontSzerint.set(szerzo, pontjai);
    }
    return pontjai;
  }

  const bejegyzesEsemenybol = (e, o, h) =>
    ({ o, h, a: e.azonosito, z: e.szerzo, n: e.sorszam, s: szelet(e), p: bejelentesHelyei(e) });

  /**
   * A fájl egy darabjának sorai a mutatóba (és a testek a memóriába). ⚠️ A darab egész
   * sorokból áll (az utolsó sorvégig vágva), és `alap` a darab eltolása a fájlban.
   * @returns {number} hány új eseményt vettünk fel
   */
  function sorokFeldolgozasa(darab, alap) {
    const sorok = darab.toString('utf8').split('\n');
    let o = alap;
    let felvett = 0;
    // Az utolsó elem az utolsó sorvég utáni üres szöveg.
    for (let i = 0; i < sorok.length - 1; i++) {
      const sor = sorok[i];
      const h = Buffer.byteLength(sor, 'utf8');
      if (sor.trim()) {
        try {
          const e = JSON.parse(sor);
          if (e && typeof e === 'object' && typeof e.azonosito === 'string') {
            // ⚠️ Ha a teste már megvan (a saját hozzáfűzésünk), azt tartjuk meg — a hívók
            // ugyanarra az objektumra hivatkozhatnak.
            if (!testek.has(e.azonosito)) testek.set(e.azonosito, e);
            if (bejegyez(bejegyzesEsemenybol(e, o, h))) felvett++;
          } else {
            console.warn('esemenyTar - azonosító nélküli sor, kihagyva', { fajl, eltolas: o });
          }
        } catch {
          // Egy sérült sor nem teheti olvashatatlanná az egész tárat. Jelezzük, és megyünk
          // tovább — az esemény aláírása úgyis minden sort külön igazol.
          console.warn('esemenyTar - sérült sor, kihagyva', { fajl, eltolas: o });
        }
      }
      o += h + 1;
    }
    return felvett;
  }

  /** A mutató kiürítése (a testek maradnak: egy azonosító mindig ugyanazt az eseményt jelenti). */
  function mutatoUritese() {
    sorrend = [];
    azonositoSzerint = new Map();
    szerzoSzerint = new Map();
    szeletSzerint = new Map();
    bejelentesSzerint = new Map();
    pontSzerint = new Map();
    lenyomatok.clear();
    ismertMeret = 0;
  }

  /**
   * A TELJES OLVASÁS — a mutató a fájlból, elejétől. Ez a pillanatkép nélküli út (és a
   * tartalék, ha a pillanatkép nem illik a fájlhoz).
   * @returns {Promise<number>} hány eseményt vettünk fel
   */
  async function teljesOlvasas() {
    mutatoUritese();
    let bajtok;
    try {
      bajtok = await readFile(fajl);
    } catch (hiba) {
      if (hiba.code !== 'ENOENT') throw hiba;
      return 0;                             // még nincs fájl: üres tár
    }
    // ⚠️ Csak az UTOLSÓ SORVÉGIG számít olvasottnak: ha egy másik folyamat épp félig írt egy
    // sort, azt a `frissit()` a következő alkalommal egészben olvassa újra.
    const vege = bajtok.lastIndexOf(0x0a) + 1;
    const felvett = sorokFeldolgozasa(bajtok.subarray(0, vege), 0);
    ismertMeret = vege;
    return felvett;
  }

  /** Egy sor a fájl adott helyéről — vagy null, ha nincs ott teljes sor. */
  async function sorOlvasasa(o, h) {
    let fogantyu;
    try {
      fogantyu = await open(fajl, 'r');
      const puffer = Buffer.alloc(h);
      const { bytesRead } = await fogantyu.read(puffer, 0, h, o);
      if (bytesRead !== h) return null;
      return JSON.parse(puffer.toString('utf8'));
    } catch {
      return null;
    } finally {
      await fogantyu?.close();
    }
  }

  /** Érvényes alakú-e a pillanatkép? (Egy gyorsítótárban sem bízunk vakon.) */
  function kepAlakjaRendben(kep) {
    // ⚠️ A 2. változat (2026-09-27, a C 7. pontja) a születés szülőjét is tartja; a 3. (D85, 2026-10-02)
    // a bejelentés helyeinek LISTÁJÁT — a régebbit eldobjuk, és a mutató a fájlból épül újra (egyszer).
    if (!kep || kep.v !== KEP_VALTOZAT || !Number.isInteger(kep.fedett) || kep.fedett < 0) return false;
    if (!Array.isArray(kep.szerzok) || !Array.isArray(kep.szeletek) || !Array.isArray(kep.e)) return false;
    return kep.e.every((x) => Array.isArray(x) && x.length === 7
      && Array.isArray(x[6]) && x[6].every((i) => Number.isInteger(i) && i >= 0 && i < kep.szeletek.length)
      && Number.isInteger(x[0]) && x[0] >= 0 && Number.isInteger(x[1]) && x[1] > 0
      && typeof x[2] === 'string'
      && Number.isInteger(x[3]) && x[3] >= 0 && x[3] < kep.szerzok.length
      && Number.isInteger(x[5]) && x[5] >= 0 && x[5] < kep.szeletek.length);
  }

  /**
   * ⭐ A PILLANATKÉP BETÖLTÉSE — ha van, ép, és illik a fájlhoz.
   *
   * ⛔ Az illeszkedés próbája: a fájl legalább akkora, amekkorát a pillanatkép lefed, és az
   * utolsó bejegyzés helyén tényleg a várt azonosítójú esemény áll. *(A közbülső helyeket a
   * testek beolvasása ellenőrzi, egyenként — lásd `testekOlvasasa`.)*
   *
   * @returns {Promise<boolean>} igaz, ha a mutató a pillanatképből épült
   */
  async function pillanatkepBetoltese() {
    let kep;
    try {
      kep = JSON.parse(await readFile(kepFajl, 'utf8'));
    } catch {
      return false;                         // nincs, vagy olvashatatlan — a teljes olvasás pótolja
    }
    let meret;
    try {
      meret = (await stat(fajl)).size;
    } catch {
      meret = -1;
    }
    let rendben = kepAlakjaRendben(kep) && kep.fedett <= meret;
    if (rendben && kep.e.length) {
      const u = kep.e[kep.e.length - 1];
      rendben = u[2] === kep.utolso && u[0] + u[1] + 1 <= kep.fedett
        && (await sorOlvasasa(u[0], u[1]))?.azonosito === u[2];
    } else if (rendben) {
      rendben = kep.fedett === 0;
    }
    if (!rendben) {
      // ⭐ A nem illő pillanatképet eldobjuk — különben minden megnyitás újra megpróbálná.
      console.warn('esemenyTar - a pillanatkép nem illik a fájlhoz, eldobva', { kepFajl });
      await rm(kepFajl, { force: true }).catch(() => {});
      return false;
    }

    mutatoUritese();
    for (const x of kep.e) {
      bejegyez({ o: x[0], h: x[1], a: x[2], z: kep.szerzok[x[3]], n: x[4], s: kep.szeletek[x[5]],
        p: x[6].map((i) => kep.szeletek[i]) });
    }
    ismertMeret = kep.fedett;
    return true;
  }

  /**
   * ⭐ A PILLANATKÉP ÍRÁSA — a mutató, ahogy most a fájl ismert részét lefedi.
   *
   * ⚠️ BÁRMELY FOLYAMAT ÍRHATJA, és ez nem verseny: a pillanatkép tartalmát a fájl eleje
   * határozza meg, és átnevezéssel kerül a helyére (egyszerre egész). Ha az írás nem sikerül
   * (Windowson egy épp olvasott fájl nem mindig nevezhető felül), az nem hiba — a következő
   * megnyitás a fájlból pótolja.
   */
  async function pillanatkepIrasa() {
    const bejegyzesek = sorrend.filter((b) => b.o !== null).sort((x, y) => x.o - y.o);
    const szerzok = [];
    const szeletek = [];
    const szerzoSzama = new Map();
    const szeletSzama = new Map();
    const szama = (terkep, lista, kulcs) => {
      if (!terkep.has(kulcs)) { terkep.set(kulcs, lista.length); lista.push(kulcs); }
      return terkep.get(kulcs);
    };
    const e = bejegyzesek.map((b) =>
      [b.o, b.h, b.a, szama(szerzoSzama, szerzok, b.z), b.n, szama(szeletSzama, szeletek, b.s),
        b.p.map((k) => szama(szeletSzama, szeletek, k))]);
    const kep = {
      v: KEP_VALTOZAT,
      fedett: ismertMeret,
      utolso: bejegyzesek.length ? bejegyzesek[bejegyzesek.length - 1].a : null,
      szerzok, szeletek, e
    };
    const ideiglenes = kepFajl + '.' + process.pid + '-' + Math.random().toString(36).slice(2) + '.uj';
    try {
      await writeFile(ideiglenes, JSON.stringify(kep));
      await rename(ideiglenes, kepFajl);
      console.log('esemenyTar - pillanatkép írva', { esemeny: e.length, fedett: ismertMeret });
    } catch (hiba) {
      console.warn('esemenyTar - a pillanatkép nem írható (nem baj, a fájl pótolja)', { hiba: hiba.message });
      await rm(ideiglenes, { force: true }).catch(() => {});
    }
  }

  /**
   * Egy beolvasott sor a testek közé — ha tényleg a várt esemény áll ott.
   * ⛔ Nem csak az azonosítót nézzük: a mutató szerzője, sorszáma és szelete is a testből jön
   * (egy elcsúszott pillanatkép különben egy eseményt rossz szeletbe sorolhatna).
   */
  function testetBevesz(b, bajtok) {
    try {
      const e = JSON.parse(bajtok.toString('utf8'));
      if (e?.azonosito !== b.a || e.szerzo !== b.z || e.sorszam !== b.n || szelet(e) !== b.s
          || bejelentesHelyei(e).join('|') !== b.p.join('|')) {
        return false;
      }
      if (!testek.has(b.a)) testek.set(b.a, e);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * A hiányzó testek beolvasása a fájlból.
   * @returns {Promise<boolean>} hamis, ha valamelyik helyen NEM a várt esemény áll
   */
  async function testekOlvasasa(hianyzok) {
    if (hianyzok.some((b) => b.o === null)) return false;   // ilyen nincs: a saját test a memóriában van
    if (hianyzok.length > SOROS_OLVASAS_FELETT) {
      const bajtok = await readFile(fajl);
      return hianyzok.every((b) => testetBevesz(b, bajtok.subarray(b.o, b.o + b.h)));
    }
    const fogantyu = await open(fajl, 'r');
    try {
      for (const b of hianyzok) {
        const puffer = Buffer.alloc(b.h);
        const { bytesRead } = await fogantyu.read(puffer, 0, b.h, b.o);
        if (bytesRead !== b.h || !testetBevesz(b, puffer)) return false;
      }
    } finally {
      await fogantyu.close();
    }
    return true;
  }

  // ⭐ A mutatót módosító munkák sora: egyszerre egy (lásd `frissit()`). A hozzáfűzés, a
  // fájl végének olvasása és az újraépítés ugyanitt áll sorba — így egyik sem húzhatja ki
  // a mutatót a másik alól.
  let mutatoSor = Promise.resolve();
  const sorba = (munka) => {
    const eredmeny = mutatoSor.then(munka, munka);
    mutatoSor = eredmeny.catch(() => {});
    return eredmeny;
  };

  /** ⛔ A mutató nem illett a fájlhoz: újraépítjük a fájlból, és a rossz pillanatképet eldobjuk. */
  const ujraepites = () => sorba(async () => {
    console.warn('esemenyTar - a mutató nem illett a fájlhoz, újraépítés a fájlból', { fajl });
    await rm(kepFajl, { force: true }).catch(() => {});
    const felvett = await teljesOlvasas();
    pillanatkepbol = false;
    if (felvett >= kepKuszob) await pillanatkepIrasa();
  });

  /**
   * ⭐ A TESTEK — a kért bejegyzések eseményei, a hiányzók a fájlból.
   *
   * @param {Function} bejegyzesek - () → a kért bejegyzések (az újraépítés után újra kérdezzük)
   * @returns {Promise<Array<Object>>}
   */
  async function testekKellenek(bejegyzesek) {
    for (let kor = 0; kor < 2; kor++) {
      const lista = bejegyzesek();
      const hianyzok = lista.filter((b) => !testek.has(b.a));
      if (!hianyzok.length || await testekOlvasasa(hianyzok)) {
        return lista.map((b) => testek.get(b.a));
      }
      await ujraepites();
    }
    throw new Error('esemenyTar: a mutató a fájlból újraépítve sem illik a fájlhoz — ' + fajl);
  }

  /** Egy frissítés — CSAK a sorból hívjuk. */
  async function frissitesEgyszer() {
    let meret;
    try {
      meret = (await stat(fajl)).size;
    } catch (hiba) {
      if (hiba.code === 'ENOENT') return 0;
      throw hiba;
    }
    const kezdet = ismertMeret;
    if (meret <= kezdet) return 0;

    const uj = Buffer.alloc(meret - kezdet);
    const fogantyu = await open(fajl, 'r');
    try {
      await fogantyu.read(uj, 0, uj.length, kezdet);
    } finally {
      await fogantyu.close();
    }
    // ⚠️ A félig írt utolsó sort (egy másik folyamat épp most ír) a következő alkalomra hagyjuk.
    const sorVege = uj.lastIndexOf(0x0a);
    if (sorVege < 0) return 0;
    ismertMeret = kezdet + sorVege + 1;

    const felvett = sorokFeldolgozasa(uj.subarray(0, sorVege + 1), kezdet);
    if (felvett) console.log('esemenyTar.frissit - új események a fájl végén', { felvett });
    return felvett;
  }

  // ----- A MUTATÓ FELÉPÍTÉSE -----
  pillanatkepbol = await pillanatkepBetoltese();
  const olvasott = pillanatkepbol ? await frissitesEgyszer() : await teljesOlvasas();
  if (olvasott >= kepKuszob) await pillanatkepIrasa();

  const tar = {
    fajl,

    /**
     * ⚠️ AZ ÖSSZES ESEMÉNY — EZ AZ, AMI NEM SKÁLÁZIK.
     *
     * Szándékosan megmaradt, mert két helyen jogos: a **próbák** így nézik meg a tár nyers
     * gondolatát, és a **kis koino** állapotszámítása így kapja meg a bemenetét. ⚠️ A C
     * lépésig a csere ÁLLÁS-a és az állapot-számítás még ezen át kap (`koinoEsemenyei`).
     *
     * ⛔ Új kódban ne ezt használd: kérdezz szeletet, láncot vagy azonosítót.
     */
    async betolt() {
      return testekKellenek(() => sorrend);
    },

    /** EGY esemény, azonosító szerint (a teste kérésre jön). */
    async esemeny(azonosito) {
      if (!azonositoSzerint.has(azonosito)) return undefined;
      const [e] = await testekKellenek(() => {
        const b = azonositoSzerint.get(azonosito);
        return b ? [b] : [];
      });
      return e;
    },

    /** EGY szerző eseményei (a fájl sorrendjében). */
    async szerzoLanca(szerzo) {
      return testekKellenek(() => szerzoSzerint.get(szerzo) ?? []);
    },

    /** EGY szelet (entitás) eseményei. */
    async szeletEsemenyei(entitas) {
      return testekKellenek(() => szeletSzerint.get(entitas) ?? []);
    },

    /** Egy pont a szerző láncán — rendes esetben egy esemény, elágazásnál több. */
    async sorszamSzerint(szerzo, sorszam) {
      return testekKellenek(() => szerzoPontjai(szerzo).get(sorszam) ?? []);
    },

    /**
     * ⭐ A C 7. pontja, D85/1, D85/3: egy szeletbe BEJELENTETT események — a gyerekei születése, a
     * javaslatai, a rá szóló szavazatok (`esemeny.js`: `bejelentesHelyei`). A legfelső szintű
     * gondolatoké a '' alatt. *A szelet köre ebből tudja meg, mi történt körülötte — a saját szeletén
     * kívül élő eseményekből is (a szöveg nélkül, D72).*
     * @param {string} s - a szelet-kulcs, vagy '' (a gyökér)
     */
    async bejelentesek(s) {
      return testekKellenek(() => bejelentesSzerint.get(s) ?? []);
    },

    /**
     * ⭐ Egy szelet VÁLTOZAT-JELE, test nélkül: az eseményszáma és a hozzá bejelentett események száma.
     * Ha ez nem változott, a szelet egyeztetett halmaza sem (a csere gyorsítótára erre épít).
     * ⚠️ Csak hozzáfűzés van, tehát a két szám csak nőhet — egy változás mindig látszik rajta.
     * @param {string} s - szelet-kulcs, vagy '' (a gyökér)
     */
    szeletValtozata(s) {
      return (szeletSzerint.get(s)?.length ?? 0) + ':' + (bejelentesSzerint.get(s)?.length ?? 0);
    },

    /**
     * ⭐ D73: A SZELETEK JEGYZÉKE — test nélkül. Szeletenként az eseményszám (`db`) és a hozzá
     * bejelentett események száma (`bejelentes`; a C 7. pontja, D85). ⭐ Az is benne van, akinek nálunk
     * CSAK bejelentése van (a saját eseményei nélkül) — és a gyökér (''), ha van legfelső szintű gondolat.
     * @returns {Promise<Array<{szelet: string, db: number, bejelentes: number}>>}
     */
    async szeletek() {
      const kulcsok = new Set([...szeletSzerint.keys(), ...bejelentesSzerint.keys()]);
      return [...kulcsok].map((s) => ({
        szelet: s,
        db: szeletSzerint.get(s)?.length ?? 0,
        bejelentes: bejelentesSzerint.get(s)?.length ?? 0
      }));
    },

    /**
     * ⭐ D73: EGY SZELET LENYOMATA — a rendezett esemény-azonosítók kanonikus lenyomata.
     *
     * ⭐ Test nélkül számol (az azonosítók a mutatóban vannak), és SORREND-FÜGGETLEN: két gép,
     * amelyik ugyanazokat az eseményeket ismeri a szeletből, ugyanazt kapja — akármilyen
     * sorrendben érkeztek. Ha a szelet bővül, a lenyomat újraszámolódik.
     * ⚠️ Nincs a pillanatképben: a C lépés (a tartomány-egyeztetés) még változtathat azon, hogy
     * pontosan mi a szelet lenyomata — és egy tárolt lenyomat akkor elavulna.
     *
     * @param {string} s - a szelet-kulcs
     * @returns {Promise<string>} 43 karakter (az üres szeleté is determinisztikus)
     */
    async szeletLenyomata(s) {
      const kesz = lenyomatok.get(s);
      if (kesz) return kesz;
      // ⭐ A szabály EGY helyen él (`esemeny/halmaz.js`): ugyanezt számolja a tartomány-egyeztetés
      // is a teljes tartományra (D74).
      const azonositok = rendezettHalmaz((szeletSzerint.get(s) ?? []).map((b) => b.a));
      const ertek = await halmazLenyomata(azonositok);
      // ⚠️ Csak akkor tesszük el, ha közben nem bővült (a bővülés eldobja a régit).
      if ((szeletSzerint.get(s)?.length ?? 0) === azonositok.length) lenyomatok.set(s, ertek);
      return ertek;
    },

    /** Egy új esemény a fájl végére — és a mutatóba (a helye a fájl következő olvasásakor). */
    hozzafuz(esemeny) {
      return sorba(async () => {
        await appendFile(fajl, JSON.stringify(esemeny) + '\n', 'utf8');
        if (!testek.has(esemeny.azonosito)) testek.set(esemeny.azonosito, esemeny);
        bejegyez(bejegyzesEsemenybol(esemeny, null, null));
      });
    },

    /**
     * ⛔⛔ AMIT MÁSIK FOLYAMAT FŰZÖTT A FÁJLHOZ — beolvasva a mutatóba (2026-09-26, 43. mérés).
     *
     * A mutató megnyitáskor épül, és utána csak a SAJÁT `hozzafuz()`-einket látja. Egy
     * készüléken viszont több folyamat ír ugyanabba a fájlba: az őrjárat fut, a második
     * ablakban egy `gondolat` parancs, és külön folyamat a `felulet` is. ⛔ Mérve: a
     * második ablakban írt gondolatot a futó őrjárat négy körön át NEM adta tovább
     * („küldtem 0"), csak újraindítás után.
     *
     * ⭐ Csak a fájl ÚJ VÉGÉT olvassuk (ahol legutóbb abbahagytuk); ami már a mutatóban van
     * (a saját hozzáfűzéseink), annak itt derül ki a helye. Egy `stat`, és ha nincs új, ennyi
     * az ára. ⚠️ Nem ellenőrzünk újra: ami a fájlba került, az egy másik folyamat
     * `esemenyMentese` kapuján ment át.
     *
     * ⛔⛔ ÉS EGYSZERRE CSAK EGY FUT (2026-09-26, a D70 mérése közben). Egy folyamaton belül is
     * hívódhat két frissítés egyszerre (az őrjárat párhuzamos munkái, az állapot-számítás) —
     * mérve: mindkettő ugyanonnan olvasott, és mindkettő hozzáadta a saját hosszát a jelhez;
     * a jel túlfutott, és a következő esemény ELVESZETT (200 eseményes farkon tízből tízszer).
     * Ezért a hívások sorba állnak, és a jel a saját kezdőpontjából számolódik.
     *
     * @returns {Promise<number>} hány új eseményt vettünk fel
     */
    frissit() {
      return sorba(frissitesEgyszer);
    },

    /** A mutató állapota (a próbáknak és a naplónak) — testet nem tölt be. */
    mutatoAllapota() {
      return { pillanatkepbol, esemeny: sorrend.length, betoltottTest: testek.size, fedett: ismertMeret };
    }
  };

  console.log('esemenyTarNyitasa - VÉGE', { fajl, esemeny: sorrend.length, pillanatkepbol });
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
 * ⛔⛔ TISZTA LAP (D69/2, 2026-09-26, Csaba döntése): a lista mostantól az INDULÓ CÍMEKÉ —
 * amit a `tars` és a helyi felfedezés vesz fel, és amire az őrjárat a UDP-kapun kopog. ⚠️ A
 * régi `tarsak.json` TCP-címeket gyűjtött (a TCP-cserék tanították, a router a TCP-nek
 * KÜLÖN leképezést ad, mint a UDP-nek) — ezért nem vettük át: **új fájl, új lista**. A régi
 * fájl a lemezen marad, de semmi nem olvassa; kézzel törölhető.
 *
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, modosit: Function, fajl: string}}
 */
export function tarsakTarolo(hely = alapHely()) {
  const fajl = join(hely, 'indulocimek.json');

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
    },

    /**
     * ⭐ BEOLVAS → MÓDOSÍT → KIÍR, oszthatatlanul (lásd a lenti „EGY SOR FÁJLONKÉNT").
     *
     * ⛔⛔ ÉS ITT A LEGHOSSZABB AZ ABLAK AZ EGÉSZ PROGRAMBAN (2026-09-22, mérve). A
     * kötés- és az UDP-cím-jegyzéknél a veszélyes rés ezredmásodperc; a társ-listát
     * viszont az őrjárat a kör ELEJÉN olvassa és a kör VÉGÉN írja — **a teljes csere-kör
     * a rés**, másodpercek vagy percek. Közben a postaláda egy bekopogótól címet tanul,
     * és a kör végi írás azt csendben elsöpri.
     *
     * ⭐ A kár iránya a rosszabbik: a **postaláda-ág** veszít, vagyis épp az a készülék,
     * aki a legtöbb emberrel beszél — pontosan az, amit a cím-tanulás meg akart előzni.
     */
    async modosit(atalakit) {
      return sorban(fajl, async () => {
        const uj = await atalakit(await this.olvas());
        await this.ir(uj);
        return uj;
      });
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
// A LÁNC-GYÖKÉR GYORSÍTÓTÁRA (D78)
// ===================================

/**
 * A szerző lánc-gyökerének gyorsítótára (`allapot/lancGyoker.js`): a napló csúcsai és a kiosztás —
 * koinónként egy JSON-fájl (`lanc.json`).
 *
 * ⚠️ TISZTA GYORSÍTÓTÁR (mint a mutató pillanatképe, D73): ha nincs, sérült, vagy nem illik a
 * lánchoz, a láncból épül újra — ezért az olvasás hibája `null`, nem kivétel. Az írás átnevezéssel
 * kerül a helyére (egyszerre egészben), mert több folyamat is írhatja.
 *
 * @param {string} koino
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function lancTarolo(koino, hely = alapHely()) {
  const fajl = join(hely, koino, 'lanc.json');

  return {
    fajl,

    /** @returns {Promise<Object|null>} a gyorsítótár, vagy null (nincs / olvashatatlan) */
    async olvas() {
      try {
        return JSON.parse(await readFile(fajl, 'utf8'));
      } catch {
        return null;
      }
    },

    /** @param {Object} adat */
    async ir(adat) {
      await mkdir(dirname(fajl), { recursive: true });
      const ideiglenes = fajl + '.' + process.pid + '-' + Math.random().toString(36).slice(2) + '.uj';
      try {
        await writeFile(ideiglenes, JSON.stringify(adat), 'utf8');
        await rename(ideiglenes, fajl);
      } catch (hiba) {
        await rm(ideiglenes, { force: true }).catch(() => {});
        throw hiba;
      }
    }
  };
}

// ===================================
// ⭐⭐ D95/1: AZ ÖSSZEGZÉSEK — a két fokú vállalás helyi jegyzéke
// ===================================

/**
 * Az összegezve tartott (nagy) szeletek ellenőrzött összegzései és a rájuk vonatkozó, ellenőrzött lezárási összegzések
 * (`allapot/osszegzoTartas.js`) — koinónként egy JSON-fájl (`osszegzesek.json`): `{ szeletek: { kulcs: { fok, gyoker,
 * osszPont, darab, mikor, ellenorizve } }, lezarasok: { 'javaslat|entitás': { esemeny, osszegzes, allas, ellenorizve } } }`.
 * ⚠️ HELYI feljegyzés (nem esemény, nem terjed) — de NEM tiszta gyorsítótár: a lezárási összegzés ellenőrzése (a minták)
 * a csere közben történt, újra csak a teljes tartótól lehetne. Az írás átnevezéssel kerül a helyére (több folyamat írhatja).
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function osszegzesTarolo(koino, hely = alapHely()) {
  const fajl = join(hely, koino, 'osszegzesek.json');
  return {
    fajl,
    /** @returns {Promise<{szeletek: Object, lezarasok: Object}>} */
    async olvas() {
      try {
        const j = JSON.parse(await readFile(fajl, 'utf8'));
        return { szeletek: j?.szeletek && typeof j.szeletek === 'object' ? j.szeletek : {},
          lezarasok: j?.lezarasok && typeof j.lezarasok === 'object' ? j.lezarasok : {} };
      } catch {
        return { szeletek: {}, lezarasok: {} };
      }
    },
    async ir(adat) {
      await mkdir(dirname(fajl), { recursive: true });
      const ideiglenes = fajl + '.' + process.pid + '-' + Math.random().toString(36).slice(2) + '.uj';
      try {
        await writeFile(ideiglenes, JSON.stringify(adat), 'utf8');
        await rename(ideiglenes, fajl);
      } catch (hiba) {
        await rm(ideiglenes, { force: true }).catch(() => {});
        throw hiba;
      }
    }
  };
}

/**
 * ⭐ D95/2: a FÜGGŐ TAGSÁGOK helyi jegyzéke (`<koino>/tagsagfuggo.json`): akiknek a tagságát a vállalt szeleteimben nem
 * tudom, és a cserében kérdezem (`tagsagKisero.js`). Helyi feljegyzés, nem esemény, nem terjed; korlátos és lejár.
 * @param {string} koino
 * @param {string} [hely]
 */
export function tagsagFuggoTarolo(koino, hely = alapHely()) {
  const fajl = join(hely, koino, 'tagsagfuggo.json');
  return {
    fajl,
    /** @returns {Promise<{szerzok: Object}>} */
    async olvas() {
      try {
        const j = JSON.parse(await readFile(fajl, 'utf8'));
        return { szerzok: j?.szerzok && typeof j.szerzok === 'object' && !Array.isArray(j.szerzok) ? j.szerzok : {} };
      } catch {
        return { szerzok: {} };
      }
    },
    async ir(adat) {
      await mkdir(dirname(fajl), { recursive: true });
      const ideiglenes = fajl + '.' + process.pid + '-' + Math.random().toString(36).slice(2) + '.uj';
      try {
        await writeFile(ideiglenes, JSON.stringify(adat), 'utf8');
        await rename(ideiglenes, fajl);
      } catch (hiba) {
        await rm(ideiglenes, { force: true }).catch(() => {});
        throw hiba;
      }
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
   * ⛔⛔ A NÉV ŐRE — EGY HELYEN, MERT KÉT HELYEN KÉT KÜLÖNBÖZŐ VOLT (2026-09-13).
   *
   * ⚠️ A LENYOMAT base64url, amiben van `-` és `_` — fájlnévnek ez rendben van, DE a `/`
   * nem fordulhat elő (a base64url épp ezt cseréli le), és a `..` sem. Akkor is
   * ellenőrizzük, ha mi állítjuk elő: ez a név **kívülről is jöhet** (a lap kéri le), és
   * ott már útvonal-támadás lenne belőle.
   *
   * ⚠️⚠️ MIÉRT KÜLÖN FÜGGVÉNY: a részleges fájl útja korábban csak a **hosszt** nézte
   * (`lenyomat.length === 43`), a mintát nem — így egy 43 karakter hosszú, de érvénytelen
   * név (`../../…/kulcsok`) **átcsúszott**, és a `reszlegesHozzafuz` írt is volna vele.
   * *Nem volt elérhető (a `fajlIgeny.js` mintája horgonyzott), de az őr mást mondott, mint
   * amit tett — és ahol ez így van, ott előbb-utóbb valaki az őrt hiszi el.*
   */
  function ellenorzottNev(lenyomat) {
    if (typeof lenyomat !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(lenyomat)) {
      throw new Error('Érvénytelen fájl-lenyomat.');
    }
    return lenyomat;
  }

  function utja(lenyomat) {
    return join(mappa, ellenorzottNev(lenyomat));
  }

  // ⭐ A RÉSZLEGES FÁJL KÜLÖN MAPPÁBAN áll, és ez szándékos: ⛔ a `lista()` így **soha nem
  // mondja azt egy félkész fájlról, hogy megvan** — kulönben a bulin felajánlanánk másnak
  // valamit, ami még nincs készen. *A félkész és a kész két külön állapot, két külön helyen.*
  //
  // ⭐⭐⭐ ÉS 2026-09-15 ÓTA EZ MAPPA, NEM FÁJL — szeletenként egy fájl benne (D68 / 6.).
  //
  // ⛔ MIÉRT KELLETT: eddig a részleges fájl **egyetlen, hozzáfűzött fájl** volt, és
  // „a mérete maga az állapot" — ez viszont **sorrendet feltételez**: a 3. szelet nem
  // jöhet meg az 1. előtt. Több forrásból viszont épp ez történik.
  //
  // ⭐ AZ ELV MEGMARAD: *a tartalom az állapot, nem egy mellette vezetett napló.* Csak
  // most a **mappa listája** mondja meg, mi van meg — nem a fájl hossza. Egy megszakadt
  // írás legfeljebb egy szeletet visz, és a lezárás ugyanúgy **újra lenyomatol**.
  function reszlegesMappa(lenyomat) {
    return join(mappa, 'reszleges', ellenorzottNev(lenyomat));
  }

  /**
   * Egy szelet fájlneve a részleges mappában: maga az ELTOLÁS, decimálisan.
   *
   * ⚠️ Ez is kívülről jövő szám (a társ mondja meg, hova küld), tehát ugyanúgy őrizni kell,
   * mint a lenyomatot: ha fájlnévbe kerülhetne bármi, az útvonal-támadás lenne. *Az őr azt
   * mondja, amit tesz: csak nem-negatív egész.*
   */
  function ellenorzottEltolas(eltolas) {
    if (!Number.isInteger(eltolas) || eltolas < 0 || eltolas > FAJL_KORLAT) {
      throw new Error('Érvénytelen szelet-eltolás.');
    }
    return String(eltolas);
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

    /**
     * ⭐⭐ MELY SZELETEK VANNAK MEG? — eltolások, növekvő sorrendben.
     *
     * *Ez MAGA az állapot:* nincs mellette napló, amit szinkronban kellene tartani. A
     * hívó ebből tudja meg, mit kell még kérnie — és mivel eltolásokat kap, nem méretet,
     * a szeletek **tetszőleges sorrendben** érkezhetnek.
     */
    async reszlegesSzeletek(lenyomat) {
      // ⛔⛔ AZ ELLENŐRZÉS A `try`-ON KÍVÜL — ugyanaz a jelentésbeli különbség, mint az
      // `olvas`-nál (D19): a **hiány** normális (még nem kezdtük el), az **érvénytelen név**
      // viszont azt jelenti, hogy a hívó szemetet küldött. Ha belül maradna, a `catch`
      // elnyelné, és a rossz név „még nincs meg"-nek látszana.
      const ut = reszlegesMappa(lenyomat);
      try {
        return (await readdir(ut))
          .filter((n) => /^[0-9]{1,12}$/.test(n))
          .map(Number)
          .sort((a, b) => a - b);
      } catch {
        // ⚠️ IDE ESIK A RÉGI ALAK IS (2026-09-15 előtt a részleges EGY FÁJL volt ezen a
        // néven): a `readdir` `ENOTDIR`-t ad rá. *Ez helyes viselkedés — a félkész letöltés
        // helyi, eldobható adat, a következő kör elölről kezdi. Hamis fájl nem keletkezhet
        // belőle, mert a lezárás úgyis lenyomatol.*
        return [];
      }
    },

    /** Hány bájt van meg eddig? (0, ha még semmi.) */
    async reszlegesMeret(lenyomat) {
      const eltolasok = await this.reszlegesSzeletek(lenyomat);
      let osszes = 0;
      for (const eltolas of eltolasok) {
        try {
          osszes += (await stat(join(reszlegesMappa(lenyomat), String(eltolas)))).size;
        } catch { /* közben eltűnt — a következő kör újra kéri */ }
      }
      return osszes;
    },

    /**
     * ⭐ EGY SZELET BEÍRÁSA, a saját eltolására.
     *
     * ⛔ A FELSŐ KORLÁT ITT IS ÉL: egy rosszindulatú társ végtelen bájtot küldhetne, és a
     * lemezünket töltené meg. A korlát túllépésekor **eldobjuk az egészet**.
     *
     * ⚠️ Ugyanannak az eltolásnak az újraírása **nem hiba**: két forrás küldheti ugyanazt
     * (versenyhelyzet), és a bájtok úgyis ellenőrzés alá kerülnek a lezárásnál.
     */
    async reszlegesIras(lenyomat, eltolas, bajtok) {
      const ut = join(reszlegesMappa(lenyomat), ellenorzottEltolas(eltolas));
      const nyers = bajtok instanceof Uint8Array ? bajtok : new Uint8Array(bajtok);

      if (eltolas + nyers.length > FAJL_KORLAT) {
        await this.reszlegesEldobas(lenyomat);
        throw new Error('A részleges fájl túllépte a határt — eldobva.');
      }

      await mkdir(dirname(ut), { recursive: true });
      await writeFile(ut, nyers);

      // ⛔⛔ ITT ELŐSZÖR A TELJES RÉSZLEGES MÉRETET ADTAM VISSZA — és az MÉRHETŐ KÁR VOLT.
      // A `reszlegesMeret` végigstatolja az ÖSSZES eddigi szeletet, tehát minden egyes
      // szelet beírása után nőtt a munka: nyolc szeletnél 36, tizenhatnál 136 fájl-művelet,
      // ⚠️ **a senkinek nem kellő visszatérési értékért** (a `fajlHozatala` nem használja).
      // *Egy O(N²) lemez-menet egy kényelmi számért.*
      return nyers.length;
    },

    /**
     * A részleges fájl lezárása: ⭐ **összefűzés, ellenőrzés, majd átnevezés a véglegesre**.
     *
     * ⛔⛔ KÉT KÜLÖNBÖZŐ BUKÁS, KÉT KÜLÖNBÖZŐ KÖVETKEZMÉNY (D19):
     *
     *   · **hiányzó szelet** → *még nem vagyunk kész.* NEM dobunk el semmit: a lyuk
     *     pótolható, és épp ez a több forrás lényege.
     *   · **rossz lenyomat** → a bájtok nem azok, aminek mondják. ⭐ Ilyenkor **eldobjuk
     *     az egészet**, mert nem tudjuk, melyik szelet volt hamis (a lenyomat a TELJES
     *     fájlra szól). *Egy támadó így legfeljebb ismételtetni tud, hamisítani nem.*
     *
     * @returns {Promise<{rendben: boolean, ok?: string, hianyzik?: number}>}
     */
    async reszlegesLezaras(lenyomat) {
      const eltolasok = await this.reszlegesSzeletek(lenyomat);
      if (!eltolasok.length) return { rendben: false, ok: 'nincs részleges fájl' };

      // ⭐ FOLYTONOS-E? A szeleteket eltolás szerint fűzzük össze, és közben nézzük, hogy
      // nincs-e lyuk. *A sorrendet a NÉV adja, nem az érkezés.*
      const darabok = [];
      let varhato = 0;
      for (const eltolas of eltolasok) {
        if (eltolas !== varhato) {
          return { rendben: false, ok: 'hiányzó szelet', hianyzik: varhato };
        }
        const darab = await readFile(join(reszlegesMappa(lenyomat), String(eltolas)));
        darabok.push(darab);
        varhato += darab.length;
      }

      const bajtok = new Uint8Array(Buffer.concat(darabok));

      // ⛔⛔ A NÉV MAGA A BIZONYÍTÉK: ha a bájtok nem ezt a lenyomatot adják, a fájl NEM az,
      // aminek mondják — eldobjuk, és nem hagyunk hátra semmit.
      const ellenorzes = await bajtLenyomat(bajtok);
      if (ellenorzes !== lenyomat) {
        await this.reszlegesEldobas(lenyomat);
        // ⭐ A `romlott` JELZÉS, nem a szöveg: a hívónak tudnia kell, hogy itt **valaki
        // hamis bájtot adott** — szemben a „hiányzó szelet"-tel, ami csak türelmet kíván.
        // ⚠️ Szöveg-illesztésre bízni ezt törékeny lenne: egy átfogalmazott hibaüzenet
        // némán kikapcsolná a válaszunkat. *A jelentés legyen mező, ne mondat.*
        return {
          rendben: false, romlott: true,
          ok: 'a bájtok nem ezt a lenyomatot adják — eldobva'
        };
      }

      await mkdir(mappa, { recursive: true });
      await writeFile(utja(lenyomat), bajtok);
      await this.reszlegesEldobas(lenyomat);
      return { rendben: true };
    },

    /** A félbehagyott letöltés eldobása — a szeletekkel együtt. */
    async reszlegesEldobas(lenyomat) {
      // ⚠️ A név őre itt is a `try` ELŐTT áll: a „nincs mit eldobni" normális, a rossz név nem.
      const ut = reszlegesMappa(lenyomat);
      try { await rm(ut, { recursive: true, force: true }); } catch { /* nincs mit eldobni */ }
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

// ===================================
// ⭐⭐ A TÁBLA-KULCS ÉS A KÖTÉSEK TÁROLÁSA (2026-09-20)
// ===================================

/**
 * A készülék TÁBLA-KULCSA — a neve a hirdetőtáblán, és a kötések azonosítója.
 *
 * ⛔⛔ EZ NEM AZ AZONOSSÁGOD (D6): a `kulcs.json` azt mondja meg, KI vagy, ez pedig azt,
 * hogy hol érhető el ez a KÉSZÜLÉK. Szándékosan külön fájl és külön kulcs — aki a táblát
 * figyeli, ne tudja a címeidet a személyedhez kötni.
 *
 * ⚠️ A KOINÓK FÖLÖTT lakik, mint a kulcs és a társ-lista: a készülék elérhetősége nem
 * koino-helyi kérdés (D25).
 */
export function tablaKulcsTarolo(hely = alapHely()) {
  const fajl = join(hely, 'tabla-kulcs.json');

  return {
    fajl,

    /** @returns {Promise<Object|null>} a kulcs-leírás, vagy null, ha még nincs */
    async olvas() {
      try {
        return JSON.parse(await readFile(fajl, 'utf8'));
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return null;
        throw hiba;
      }
    },

    async ir(leiras) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify(leiras, null, 2), 'utf8');
    }
  };
}

/**
 * A KÖTÉS-JEGYZÉK: kivel tartok rendszeres kapcsolatot (helyi megfigyelés, 3. szabály).
 *
 * ⚠️ Sosem terjed, és semmit nem dönt el a koinóban — ha elveszik, a következő bulikon
 * újraépül. *Ezért nem is baj, hogy sima JSON: a 4. szabály kézi útja is ez.*
 */
export function kotesTarolo(hely = alapHely()) {
  const fajl = join(hely, 'kotesek.json');

  return {
    fajl,

    /** @returns {Promise<Array<Object>>} */
    async olvas() {
      try {
        const adat = JSON.parse(await readFile(fajl, 'utf8'));
        const lista = Array.isArray(adat) ? adat : adat.kotesek;
        return Array.isArray(lista) ? lista : [];
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return [];
        console.warn('kotesTarolo - olvashatatlan jegyzék, üresnek vesszük', { fajl });
        return [];
      }
    },

    async ir(jegyzek) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify({ kotesek: jegyzek }, null, 2), 'utf8');
    },

    /**
     * ⭐ BEOLVAS → MÓDOSÍT → KIÍR, oszthatatlanul (lásd a fenti „EGY SOR FÁJLONKÉNT").
     *
     * ⚠️ A kötés-jegyzékre ugyanaz a veszély áll: az őrjárat a **postaláda-ágból** és a
     * **kör-ágból** is feljegyez találkozást, és a kettő egyszerre futhat.
     */
    async modosit(atalakit) {
      return sorban(fajl, async () => {
        const uj = await atalakit(await this.olvas());
        await this.ir(uj);
        return uj;
      });
    }
  };
}

// ===================================
// ⛔⛔⛔ EGY SOR FÁJLONKÉNT — AZ ELVESZETT ÍRÁS ELLEN (2026-09-21)
// ===================================
//
// ⛔ A HIBA, AHOGY ELŐKERÜLT: egy parancssor-próba **szeszélyesen bukott** (a teljes
// suite-ban 8 futásból ~2-szer, önmagában soha). A diagnosztika mutatta meg az okát:
// a készülék a résen MEGTANULTA a saját külső címét a társtól, ki is írta a képernyőre —
// ⛔ **de az nem került a lemezre.** A túlélő és az elveszett írás között **1 ms** telt el;
// ahol 17 ms volt (a másik gépen), ott mindkettő megmaradt.
//
// ⭐ A MECHANIZMUS: a tárolók külön `olvas()`-t és `ir()`-t adnak, a „beolvas → módosít →
// kiír" pedig a HÍVÓBAN van. Két egyidejű hívás mindkettő a RÉGIT olvassa, és a később
// kiíró **felülírja** a másik munkáját. *A saját friss címünk annak a jegyzéknek az egyetlen
// valódi forrása — ha elveszik, a társ nem tudja meg, hova kopogjon.*
//
// ⭐ EZÉRT AZ ŐR A RÉTEGBEN VAN, NEM A HÍVÓBAN. Ugyanaz az érv, mint a kulcs felülírásánál
// és a javaslathoz tartozó szavazatnál: ha a hívóra bíznánk, az egyik út megtenné, a másik
// elfelejtené. A `modosit()` egy FÁJLONKÉNTI sorba állítja a műveletet.
//
// ⚠️ Ez a sor a FOLYAMATON BELÜL véd. Két külön `node` folyamat ugyanarra az adat-mappára
// továbbra is egymásra írhat — *azt a koino amúgy sem ígéri* (egy készülék, egy őrjárat).

/** Fájlonkénti ígéret-lánc: ami ide kerül, az egymás UTÁN fut, nem egymásra. */
const jegyzekSorok = new Map();

function sorban(fajl, munka) {
  const elozo = jegyzekSorok.get(fajl) ?? Promise.resolve();
  const mostani = elozo.then(munka);
  // ⚠️⚠️ ITT AZ ŐR, ÉS EZ NEM DÍSZ: a SORBAN TÁROLT ígéret elnyeli a bukást, ezért egy
  // elakadt módosítás nem ragasztja be a mögötte állókat. ⛔ Enélkül egyetlen hibás írás
  // után a jegyzék **soha többé** nem frissülne — a nem-esemény, ami a legrosszabb hiba
  // (25. mérés). ⚠️ A hívó a saját bukását változatlanul megkapja (`mostani`).
  //
  // ⚠️ Az első változatom az `elozo.then(munka, munka)` alakot használta — a rontás-próba
  // megmutatta, hogy az **halott kód**: az `elozo` ezzel az őrrel sosem bukik.
  jegyzekSorok.set(fajl, mostani.then(() => {}, () => {}));
  return mostani;
}

// ===================================
// ⭐ A FRISS UDP-CÍMEK TÁROLÁSA (2026-09-18)
// ===================================

/**
 * „Milyen külső UDP-címeken volt valaki elérhető az utóbbi percekben?"
 *
 * ⛔ MIÉRT HARMADIK FÁJL? Mert a tartalma **percekig él**, nem hetekig: egy UDP-leképezés
 * csendben elévül (31. mérés: 150 mp igen, 330 nem). A társ-listában ez kimosná a tartós
 * címeket, a szelet-jegyzékben pedig más a kérdés (ott: „hol láttam ezt az entitást").
 *
 * ⚠️ A bejegyzés NÉVTELEN — nem mondja meg, kié a cím. *Ez védelem (D6), nem hiányosság:
 * a kopogásnak nem kell tudnia, kinek kopog.*
 *
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function udpCimTarolo(hely = alapHely()) {
  const fajl = join(hely, 'udpcimek.json');

  return {
    fajl,

    /** @returns {Promise<Array<Object>>} a bejegyzések, vagy üres lista */
    async olvas() {
      try {
        const adat = JSON.parse(await readFile(fajl, 'utf8'));
        const lista = Array.isArray(adat) ? adat : adat.cimek;
        return Array.isArray(lista) ? lista : [];
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return [];
        // Egy elrontott jegyzék NE akadályozza a koino futását: ez gyorsítás, nem igazság.
        console.warn('udpCimTarolo - olvashatatlan jegyzék, üresnek vesszük', { fajl });
        return [];
      }
    },

    /** @param {Array<Object>} lista */
    async ir(lista) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify({ cimek: lista }, null, 2), 'utf8');
    },

    /**
     * ⭐ BEOLVAS → MÓDOSÍT → KIÍR, egyetlen oszthatatlan lépésben.
     *
     * ⛔ EZT KELL HASZNÁLNI minden olyan helyen, ahol a meglévő jegyzékhez ADUNK valamit.
     * A külön `olvas()` + `ir()` páros két egyidejű hívásnál **elveszti az egyiket** —
     * mérve, 2026-09-21 (lásd a fenti szakaszt).
     *
     * @param {Function} atalakit - a régi listát kapja, az ÚJAT adja vissza
     * @returns {Promise<Array<Object>>} az új lista
     */
    async modosit(atalakit) {
      return sorban(fajl, async () => {
        const uj = await atalakit(await this.olvas());
        await this.ir(uj);
        return uj;
      });
    }
  };
}

// ===================================
// ⭐ D92/1 (c), K2: A MEMÓRIABELI FÁJL-TÁR — a továbbító ide hozza a törzset, és innen viszi vissza
// ===================================
//
// A továbbító a választ CSAK a memóriájában tartja (D87/1, D92/2: nem kerül a tárba, nem szolgálja ki). A fájl-hozatal
// (`fajlHozatala`) a fájl-tár felületét használja — ez ugyanazt a felületet adja a lemez nélkül, ugyanazzal az
// ellenőrzéssel (a lezárás újra lenyomatol; a korlát itt is él). ⚠️ Korlátos: legfeljebb `korlat` bájt összesen.

/**
 * @param {number} [korlat] - az összes tárolt bájt felső határa
 * @returns {Object} a `fajlBlobTarolo` felülete (ir, olvas, van, reszleges…) + `mind()`
 */
export function memoriaBlobTarolo(korlat = 2 * FAJL_KORLAT) {
  const keszek = new Map();          // lenyomat → Uint8Array
  const reszek = new Map();          // lenyomat → Map(eltolás → Uint8Array)
  const nevRendben = (l) => typeof l === 'string' && /^[A-Za-z0-9_-]{43}$/.test(l);
  const osszes = () => [...keszek.values()].reduce((o, b) => o + b.length, 0)
    + [...reszek.values()].reduce((o, m) => o + [...m.values()].reduce((x, b) => x + b.length, 0), 0);
  return {
    async ir(bajtok) {
      const nyers = bajtok instanceof Uint8Array ? bajtok : new Uint8Array(bajtok);
      if (nyers.length > FAJL_KORLAT || osszes() + nyers.length > korlat) throw new Error('A memóriabeli tár betelt.');
      const lenyomat = await bajtLenyomat(nyers);
      const mar = keszek.has(lenyomat);
      if (!mar) keszek.set(lenyomat, nyers);
      return { lenyomat, meret: nyers.length, mar };
    },
    async olvas(lenyomat) { return nevRendben(lenyomat) ? (keszek.get(lenyomat) ?? null) : null; },
    async van(lenyomat) { return nevRendben(lenyomat) && keszek.has(lenyomat); },
    async reszlegesSzeletek(lenyomat) { return [...(reszek.get(lenyomat)?.keys() ?? [])].sort((a, b) => a - b); },
    async reszlegesMeret(lenyomat) { return [...(reszek.get(lenyomat)?.values() ?? [])].reduce((o, b) => o + b.length, 0); },
    async reszlegesIras(lenyomat, eltolas, bajtok) {
      if (!nevRendben(lenyomat) || !Number.isSafeInteger(eltolas) || eltolas < 0) throw new Error('Érvénytelen részleges írás.');
      const nyers = bajtok instanceof Uint8Array ? bajtok : new Uint8Array(bajtok);
      if (eltolas + nyers.length > FAJL_KORLAT || osszes() + nyers.length > korlat) {
        reszek.delete(lenyomat);
        throw new Error('A részleges fájl túllépte a határt — eldobva.');
      }
      if (!reszek.has(lenyomat)) reszek.set(lenyomat, new Map());
      reszek.get(lenyomat).set(eltolas, nyers);
      return nyers.length;
    },
    async reszlegesLezaras(lenyomat) {
      const m = reszek.get(lenyomat);
      if (!m || !m.size) return { rendben: false, ok: 'nincs részleges fájl' };
      const darabok = [];
      let varhato = 0;
      for (const eltolas of [...m.keys()].sort((a, b) => a - b)) {
        if (eltolas !== varhato) return { rendben: false, ok: 'hiányzó szelet', hianyzik: varhato };
        darabok.push(m.get(eltolas));
        varhato += m.get(eltolas).length;
      }
      const bajtok = new Uint8Array(Buffer.concat(darabok));
      reszek.delete(lenyomat);
      if ((await bajtLenyomat(bajtok)) !== lenyomat) {
        return { rendben: false, romlott: true, ok: 'a bájtok nem ezt a lenyomatot adják — eldobva' };
      }
      keszek.set(lenyomat, bajtok);
      return { rendben: true };
    },
    async reszlegesEldobas(lenyomat) { reszek.delete(lenyomat); },
    /** A kész fájlok (a visszaúthoz). */
    mind() { return [...keszek.entries()].map(([lenyomat, bajtok]) => ({ lenyomat, bajtok })); }
  };
}
