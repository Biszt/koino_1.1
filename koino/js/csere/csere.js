// koino/js/csere/csere.js

// Felelősség: a CSERE-PROTOKOLL LOGIKÁJA — hálózat nélkül.
//
// Két készülék úgy ér egyet, hogy elmondják egymásnak, MIT TUDNAK, és elkérik, ami
// hiányzik. Ez a fájl ezt a három üzenetet állítja elő és dolgozza fel:
//
//   ÁLLÁS   — „ezt tudom" (szerzőnként egy sor)
//   KÉREK   — „ebből ez hiányzik nekem"
//   ESEMÉNY — a kért események, ugyanabban az alakban, ahogy a fájlban állnak
//
// ⭐ MIÉRT NINCS BENNE HÁLÓZAT?
// Mert a nehéz rész nem a hálózat, hanem a KÉRDÉS: mit kell kérnem ahhoz, hogy
// biztosan egyetértsünk? Ez tiszta függvény — bemenet két állás, kimenet egy kérés —,
// tehát önpróbával mérhető, két folyamat és két gép nélkül. A TCP-vonal ezután már csak
// annyi, hogy ezeket az objektumokat átküldi egy dróton.
//
// ⭐ AMIT NEM CSINÁL: nem menti el az eseményt a saját szabályai szerint. A beolvasztás
// ugyanazt az `esemenyMentese`-t hívja, mint a saját műveleteink — vagyis ELLENŐRIZETLEN
// ESEMÉNY A HÁLÓZATRÓL SEM KERÜL A TÁRBA, és az elágazás mentéskor lelepleződik. A
// hálózat nem kap külön, engedékenyebb kaput.
//
// Használják: a csere-vonal (TCP) és a csereProba.js.

import { lenyomat } from '../esemeny/kanonikusAlak.js';
import { koinoEsemenyei, esemenyMentese } from '../tar/esemenyTar.js';

// ===================================
// ÁLLÁS — „ezt tudom"
// ===================================
//
// Szerzőnként EGY sor. Nem soroljuk fel, mely eseményeket ismerjük: a lánc szerkezete
// (sorszámozott, egymásra mutató események) ezt fölöslegessé teszi.
//
// Négy mező van benne, és mindegyik egy KONKRÉT hibát zár ki:
//
//   legnagyobb   — meddig jutottam ebben a láncban → ebből látszik, ha le vagyok maradva
//   hezagok      — mely sorszámok hiányoznak alulról → e nélkül a lyuk ÖRÖKRE megmaradna,
//                  mert a „legnagyobb" ugyanaz lenne mindkét gépen (1,2,4 vs. 1,2,3,4)
//   elagazasok   — hol ismerek EGY ponton több eseményt → e nélkül a kettős cselekvés
//                  bizonyítéka nem terjedne tovább
//   ujjlenyomat  — az egész lánc egyetlen lenyomatban
//
// ⭐ MIÉRT UJJLENYOMAT, ÉS NEM „A LÁNC FEJE"?
// Az eredeti terv a fejet (az utolsó esemény azonosítóját) küldte volna. Az ujjlenyomat
// ugyanolyan olcsó (43 karakter), de TÖBBET fog meg. A különbség egy valódi támadásnál
// látszik: ha valaki KÉT eseményt írt alá ugyanarról a pontról, és az egyiket A gépnek,
// a másikat B gépnek mutatta, akkor mindkét gépen ugyanaz a „legnagyobb", egyik sem tud
// elágazásról, és a fejek is különböznének ugyan — de csak akkor, ha a hamisítás az
// UTOLSÓ eseményt érinti. Egy lánc KÖZEPÉN elrejtett elágazásnál a fej azonos, és a két
// gép némán elhinné, hogy egyetért. Az ujjlenyomat a teljes láncot fedi, tehát nem.

/**
 * Összeállítja a saját állásunkat egy koinóról.
 *
 * @param {Object} tar - a tároló (betolt/hozzafuz)
 * @param {string} koino
 * @returns {Promise<{koino: string, szerzok: Array<{szerzo: string, legnagyobb: number, hezagok: Array<number>, elagazasok: Array<number>, ujjlenyomat: string}>}>}
 */
export async function allasOsszeallitasa(tar, koino) {
  console.log('allasOsszeallitasa - KEZDÉS', { koino });

  // Egyetlen betöltés, és utána szerzőnként csoportosítunk. (Szerzőnként újra betölteni
  // ugyanazt a fájlt pazarlás lenne — és a nagy állásokat épp mérni akarjuk.)
  const esemenyek = await koinoEsemenyei(tar, koino);

  const szerzonkent = new Map();
  for (const e of esemenyek) {
    if (!szerzonkent.has(e.szerzo)) szerzonkent.set(e.szerzo, []);
    szerzonkent.get(e.szerzo).push(e);
  }

  const szerzok = [];
  for (const [szerzo, sajatjai] of szerzonkent) {
    szerzok.push(await lancAllasa(szerzo, sajatjai));
  }

  // A sorrend legyen kiszámítható: két gép ugyanarra a tudásra ugyanazt az állást adja.
  szerzok.sort((a, b) => (a.szerzo < b.szerzo ? -1 : a.szerzo > b.szerzo ? 1 : 0));

  console.log('allasOsszeallitasa - VÉGE', { szerzok: szerzok.length });
  return { koino, szerzok };
}

/**
 * ⭐ AZ ÁLLÁS EGYETLEN LENYOMATBAN — 43 karakter (D35, Szakasz 2 / B. lépés).
 *
 * ⭐ MIÉRT KELL EZ? Mert az ÁLLÁS ára a létszámmal nő: **162 bájt/e-ember** (mérve, 50
 * fővel). Egy 10 000 fős koinónál ez ~1,6 MB — és a csere KÉTIRÁNYÚ, tehát mindkét fél
 * elküldi. Öt percenkénti cserével ez napi több száz megabájt.
 *
 * ⚠️ ÉS EZ NEM A HÁLÓZATOT TERHELNÉ MEG, HANEM A MOBILOS E-EMBER SZÁMLÁJÁT — vagyis épp
 * azt zárná ki, akinek a legkevesebb pénze van. Ezért nem „optimalizálás", hanem
 * BEFOGADÁSI KÉRDÉS: a koino olcsósága az, ami mindenkinek megnyitja.
 *
 * A javítás egyszerű: a csere ne a részletes állással kezdődjön, hanem ezzel az EGYETLEN
 * lenyomattal. Ha a kettő egyezik, nincs miről beszélni — a hétköznapi eset (két csere
 * között semmi nem történt) így 1,6 MB helyett néhány tíz bájt.
 *
 * ⚠️ MIÉRT ELÉG EZ? Mert az állás szerzőnként tartalmazza a teljes lánc ujjlenyomatát,
 * és a lista SZERZŐ SZERINT RENDEZETT (lásd fent) — tehát azonos tudás mindig azonos
 * lenyomatot ad, más tudás pedig mást. Ugyanaz a gondolat, mint a kanonikus alaknál.
 *
 * @param {Object} allas - allasOsszeallitasa eredménye
 * @returns {Promise<string>} 43 karakteres lenyomat
 */
export async function allasLenyomata(allas) {
  return lenyomat(allas.szerzok);
}

/**
 * Egy szerző láncának állása.
 *
 * ⚠️ A hézag és az elágazás fogalma UGYANAZ, mint a tár-réteg `lancEllenorzese`-ében —
 * csak itt egy már betöltött eseménylistán számoljuk, és a koinóra szűkítve.
 *
 * @param {string} szerzo
 * @param {Array<Object>} esemenyek - ennek a szerzőnek az eseményei (rendezetlenül is jó)
 * @returns {Promise<Object>}
 */
async function lancAllasa(szerzo, esemenyek) {
  const sorszamonkent = new Map();
  for (const e of esemenyek) {
    if (!sorszamonkent.has(e.sorszam)) sorszamonkent.set(e.sorszam, []);
    sorszamonkent.get(e.sorszam).push(e);
  }

  const legnagyobb = esemenyek.length ? Math.max(...sorszamonkent.keys()) : 0;
  const hezagok = [];
  const elagazasok = [];

  for (let sorszam = 1; sorszam <= legnagyobb; sorszam++) {
    const ittLevok = sorszamonkent.get(sorszam);
    if (!ittLevok) hezagok.push(sorszam);
    else if (ittLevok.length > 1) elagazasok.push(sorszam);
  }

  // Az ujjlenyomat a RENDEZETT azonosítókból készül — hogy ne a fájlban lévő sorrend
  // döntse el, egyezik-e két gép lánca. (Ugyanaz a gondolat, mint a kanonikus alaknál.)
  const azonositok = esemenyek.map((e) => e.azonosito).sort();
  const ujjlenyomat = await lenyomat(azonositok);

  return { szerzo, legnagyobb, hezagok, elagazasok, ujjlenyomat };
}

// ===================================
// KÉREK — „ebből ez hiányzik nekem"
// ===================================

/**
 * Kiszámolja, mit kérjünk el a másiktól.
 *
 * ⭐ A SZABÁLY, ÉS MIÉRT ILYEN:
 *
 *   1. Ha az ujjlenyomatunk EGYEZIK, nincs mit kérni. Ez a hétköznapi eset (két csere
 *      között semmi nem történt), és egyetlen szöveg-összehasonlításba kerül.
 *   2. Különben elkérjük a NYILVÁNVALÓ hiányokat: ami a saját legnagyobbam FÖLÖTT van,
 *      ami az én hézagomban van, és ahol NEKI elágazása van (ott lehet nála olyan
 *      esemény is, amiről nem tudok).
 *   3. Ha a nyilvánvaló hiány ÜRES, de az ujjlenyomat mégis különbözik, akkor valami
 *      olyanban térünk el, amit az összefoglalóból nem tudok behatárolni — ilyenkor
 *      elkérem a TELJES tartományt. Drága, de ritka: ez a lánc közepén elrejtett
 *      elágazás esete, vagyis épp az, amit muszáj kideríteni.
 *   4. ⚠️ DE CSAK AKKOR, HA NEM VAGYOK ELŐRÉBB. Ha én hosszabb láncot ismerek, mint ő,
 *      akkor az ujjlenyomat ELTÉRÉSE MAGÁTÓL ÉRTETŐDŐ (több eseményt ismerek), tehát
 *      semmit nem árul el — ilyenkor a teljes tartomány elkérése tiszta pazarlás lenne:
 *      visszakérnék tőle mindent, amit már tudok. Ő úgyis elkéri tőlem, ami neki hiányzik.
 *
 * ⭐ MIÉRT ÁLL MEG EZ A FOLYAMAT? Két gép közül LEGALÁBB EGYIK sosem „előrébb tartó"
 * (mindkettő nem lehet hosszabb a másiknál), tehát a 3. pont mindig lefut valamelyik
 * oldalon. Minden kör vagy hoz új eseményt (akkor haladtunk), vagy kiváltja a teljes
 * tartomány elkérését — ami után a lánc biztosan egyezik. Nem tud körbe-körbe járni.
 *
 * Amit SOSEM kérünk: amit ő maga is hézagként jelöl. Neki sincs meg.
 *
 * @param {Object} sajatAllas - a saját állásunk (allasOsszeallitasa)
 * @param {Object} idegenAllas - amit a másik küldött
 * @returns {{koino: string, szerzok: Array<{szerzo: string, sorszamok: Array<number>}>}}
 */
export function hianyokSzamitasa(sajatAllas, idegenAllas) {
  console.log('hianyokSzamitasa - KEZDÉS', { idegenSzerzok: idegenAllas.szerzok.length });

  const sajatjaim = new Map(sajatAllas.szerzok.map((sz) => [sz.szerzo, sz]));
  const szerzok = [];

  for (const ove of idegenAllas.szerzok) {
    // Akiről semmit nem tudok: üres lánc — ilyenkor az egészet elkérem.
    const enyem = sajatjaim.get(ove.szerzo)
      ?? { legnagyobb: 0, hezagok: [], elagazasok: [], ujjlenyomat: null };

    // ----- 1. EGYEZŐ LÁNC: nincs dolgunk -----
    if (enyem.ujjlenyomat === ove.ujjlenyomat) continue;

    const enyemHezagja = new Set(enyem.hezagok);
    const oveHezagja = new Set(ove.hezagok);
    const oveElagazasa = new Set(ove.elagazasok);

    // ----- 2. A NYILVÁNVALÓ HIÁNYOK -----
    const sorszamok = [];
    for (let sorszam = 1; sorszam <= ove.legnagyobb; sorszam++) {
      if (oveHezagja.has(sorszam)) continue;             // neki sincs meg
      const nekemNincs = sorszam > enyem.legnagyobb || enyemHezagja.has(sorszam);
      const nalaTobbLehet = oveElagazasa.has(sorszam);   // ott TÖBB eseményt ismer
      if (nekemNincs || nalaTobbLehet) sorszamok.push(sorszam);
    }

    // ----- 3–4. NEM TUDOM BEHATÁROLNI: a teljes tartomány (ha nem vagyok előrébb) -----
    const elorebbTartok = enyem.legnagyobb > ove.legnagyobb;
    if (sorszamok.length === 0 && !elorebbTartok) {
      for (let sorszam = 1; sorszam <= ove.legnagyobb; sorszam++) {
        if (!oveHezagja.has(sorszam)) sorszamok.push(sorszam);
      }
      console.warn('hianyokSzamitasa - eltérő lánc, de nem behatárolható → TELJES tartomány', {
        szerzo: ove.szerzo.slice(0, 8) + '…', legnagyobb: ove.legnagyobb
      });
    }

    if (sorszamok.length) szerzok.push({ szerzo: ove.szerzo, sorszamok });
  }

  console.log('hianyokSzamitasa - VÉGE', {
    szerzok: szerzok.length,
    esemenyek: szerzok.reduce((osszeg, sz) => osszeg + sz.sorszamok.length, 0)
  });
  return { koino: idegenAllas.koino, szerzok };
}

// ===================================
// ESEMÉNY — a válasz összeállítása
// ===================================

/**
 * Összeszedi a kért eseményeket a saját tárunkból.
 *
 * Egy kért sorszámra TÖBB eseményt is adhatunk: ha ott elágazás van, MINDKETTŐT
 * elküldjük. A két esemény együtt a bizonyíték (D17/D19) — külön-külön egyik sem az.
 *
 * Amit nem ismerünk, arra egyszerűen nem küldünk semmit. Nem hiba: a másik ettől még
 * pontosan azt kapja, amit tudunk adni.
 *
 * @param {Object} tar
 * @param {Object} kerelem - a hianyokSzamitasa eredménye (a MÁSIK gépről érkezve)
 * @returns {Promise<Array<Object>>} az elküldendő események
 */
export async function valaszOsszeallitasa(tar, kerelem) {
  console.log('valaszOsszeallitasa - KEZDÉS', { szerzok: kerelem.szerzok.length });

  const esemenyek = await koinoEsemenyei(tar, kerelem.koino);
  const kertek = new Map(kerelem.szerzok.map((sz) => [sz.szerzo, new Set(sz.sorszamok)]));

  const valasz = esemenyek.filter((e) => kertek.get(e.szerzo)?.has(e.sorszam));

  console.log('valaszOsszeallitasa - VÉGE', { esemenyek: valasz.length });
  return valasz;
}

// ===================================
// BEOLVASZTÁS — ami megérkezett
// ===================================

/**
 * Beolvasztja a kapott eseményeket a saját tárunkba.
 *
 * ⭐ NINCS BENNE SEMMI ÚJ. Ugyanaz az `esemenyMentese` fut, mint amikor mi magunk
 * cselekszünk: ellenőrzés (aláírás + azonosító), duplikátum-elnyelés, elágazás-jelzés.
 * Ez a szakasz jóslatának a lényege: mivel az azonosító a tartalom lenyomata, a
 * duplikátum MAGÁTÓL elnyelődik, és az összefésüléshez nem kell ütközés-feloldó logika.
 *
 * ⚠️ A KOINO-SZŰRÉS (2026-08-29, mérés után). A tár koinónként külön mappa, de az
 * `esemenyMentese` nem tudja, MELYIK mappában áll — ő az aláírást és az azonosítót nézi,
 * és jól teszi. Ezért a koino-egyezést ITT kell ellenőrizni.
 *
 * ⭐ MIÉRT KELL EGYÁLTALÁN? Mérve: ha egy másik koino készüléke szólt be, az eseményei
 * BEKERÜLTEK a mappánkba. Az állapotot nem rontották el (a `koinoEsemenyei` szűr), de
 * ott ültek — és egy rosszindulatú fél így korlátlanul tölthetné a lemezünket. A
 * protokoll eleji koino-egyeztetés (lásd `vonal.js`) az ŐSZINTE tévedést fogja meg;
 * ez itt a HAZUG felet. A kettő külön réteg, szándékosan.
 *
 * @param {Object} tar
 * @param {Array<Object>} esemenyek
 * @param {string} [koino] - ha megadott, CSAK ennek a koinónak az eseményeit vesszük be
 * @returns {Promise<{uj: number, marMegvolt: number, idegen: number, elutasitva: Array<{azonosito: string, ok: string}>, elagazasok: Array<{szerzo: string, sorszam: number}>}>}
 */
export async function beolvasztas(tar, esemenyek, koino) {
  console.log('beolvasztas - KEZDÉS', { erkezett: esemenyek.length, koino });

  let uj = 0, marMegvolt = 0, idegen = 0;
  const elutasitva = [];
  const elagazasok = [];

  for (const esemeny of esemenyek) {
    // ----- IDEGEN KOINO: be sem visszük a kapuig -----
    if (koino !== undefined && esemeny?.koino !== koino) {
      idegen++;
      console.warn('beolvasztas - IDEGEN koino eseménye, kihagyva', {
        vart: koino, kapott: esemeny?.koino
      });
      continue;
    }

    const eredmeny = await esemenyMentese(tar, esemeny);

    if (!eredmeny.mentve) {
      // A hazug gép nem tud minket megzavarni: az esemény egyszerűen nem kerül be.
      elutasitva.push({ azonosito: esemeny?.azonosito ?? '(nincs)', ok: eredmeny.ok });
      continue;
    }
    if (eredmeny.marMegvolt) { marMegvolt++; continue; }

    uj++;
    if (eredmeny.elagazas) {
      elagazasok.push({ szerzo: esemeny.szerzo, sorszam: esemeny.sorszam });
    }
  }

  const osszegzes = { uj, marMegvolt, idegen, elutasitva, elagazasok };
  console.log('beolvasztas - VÉGE', {
    uj, marMegvolt, idegen, elutasitva: elutasitva.length, elagazasok: elagazasok.length
  });
  return osszegzes;
}

// ===================================
// EGY TELJES KÖR — a két fél között
// ===================================

/**
 * Egyetlen csere-kör, KÉT TÁR KÖZÖTT, hálózat nélkül.
 *
 * Ez a protokoll teljes menete, csak a drót helyett közvetlen függvényhívásokkal. A
 * hálózati változat pontosan ezt a sorrendet fogja követni — ezért ha ez itt helyes, ott
 * már csak a szállítás lehet hibás, a logika nem.
 *
 * SZIMMETRIKUS: nincs kliens és szerver. Mindkét fél elmondja az állását, mindkettő kér,
 * és mindkettő ad. Aki „kezdeményez", az csak annyiban más, hogy ő szólal meg elsőnek.
 *
 * @param {Object} egyikTar
 * @param {Object} masikTar
 * @param {string} koino
 * @returns {Promise<{egyikKapott: Object, masikKapott: Object, egyezik: boolean}>}
 */
export async function csereKor(egyikTar, masikTar, koino) {
  console.log('csereKor - KEZDÉS', { koino });

  // ----- 1. MINDKETTŐ ELMONDJA, MIT TUD -----
  const egyikAllas = await allasOsszeallitasa(egyikTar, koino);
  const masikAllas = await allasOsszeallitasa(masikTar, koino);

  // ----- 2. MINDKETTŐ KISZÁMOLJA, MI HIÁNYZIK NEKI -----
  const egyikKerelme = hianyokSzamitasa(egyikAllas, masikAllas);
  const masikKerelme = hianyokSzamitasa(masikAllas, egyikAllas);

  // ----- 3. MINDKETTŐ VÁLASZOL -----
  const masiknakKuldjuk = await valaszOsszeallitasa(egyikTar, masikKerelme);
  const egyiknekKuldjuk = await valaszOsszeallitasa(masikTar, egyikKerelme);

  // ----- 4. MINDKETTŐ BEOLVASZTJA -----
  // A sorrend itt szándékosan mindegy: a beolvasztás nem függ attól, ki volt előbb.
  const egyikKapott = await beolvasztas(egyikTar, egyiknekKuldjuk, koino);
  const masikKapott = await beolvasztas(masikTar, masiknakKuldjuk, koino);

  // ----- 5. EGYETÉRTÜNK-E MÁR? -----
  const egyezik = await allasokEgyeznek(egyikTar, masikTar, koino);

  console.log('csereKor - VÉGE', { egyezik, egyikUj: egyikKapott.uj, masikUj: masikKapott.uj });
  return { egyikKapott, masikKapott, egyezik };
}

/**
 * Két tár ugyanazt a láncot ismeri-e? (Az állások összehasonlítása.)
 *
 * @param {Object} egyikTar
 * @param {Object} masikTar
 * @param {string} koino
 * @returns {Promise<boolean>}
 */
export async function allasokEgyeznek(egyikTar, masikTar, koino) {
  const egyik = await allasOsszeallitasa(egyikTar, koino);
  const masik = await allasOsszeallitasa(masikTar, koino);

  if (egyik.szerzok.length !== masik.szerzok.length) return false;
  return egyik.szerzok.every((sz, i) =>
    sz.szerzo === masik.szerzok[i].szerzo && sz.ujjlenyomat === masik.szerzok[i].ujjlenyomat);
}

/**
 * Addig cserél, amíg a két fél egyet nem ért — és megmondja, hány körbe telt.
 *
 * ⚠️ A korlát nem díszítés: ha egyszer mégis körbe-körbe járna, azt HIBAKÉNT akarjuk
 * látni, nem végtelen ciklusként.
 *
 * @param {Object} egyikTar
 * @param {Object} masikTar
 * @param {string} koino
 * @param {number} [korlat] - legfeljebb ennyi kör
 * @returns {Promise<{korok: number, egyezik: boolean}>}
 */
export async function csereAmigKell(egyikTar, masikTar, koino, korlat = 5) {
  for (let korok = 1; korok <= korlat; korok++) {
    const { egyezik } = await csereKor(egyikTar, masikTar, koino);
    if (egyezik) return { korok, egyezik: true };
  }
  console.warn('csereAmigKell - a korlátig sem értek egyet', { korlat });
  return { korok: korlat, egyezik: false };
}
