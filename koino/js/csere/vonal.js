// koino/js/csere/vonal.js

// Felelősség: a CSERE PÁRBESZÉDE — ugyanaz a protokoll, egy kapcsolaton.
//
// ⭐ MIT CSINÁL, ÉS MIT NEM. Ez a fájl SEMMIT nem tud a koinóról: nem ismer eseményt,
// szabályt, tudatpontot. Csak annyit tesz, hogy a csere lépéseit — a
// [`tartomany.js`](tartomany.js) üzeneteit, a [`szeletEgyeztetes.js`](szeletEgyeztetes.js)
// listáit és az eseményeket — oda-vissza küldi egy foglalat-szerű kapcsolaton. Ha itt hiba
// van, az szállítási hiba; a lépések helyessége a saját önpróbáikban dől el, hálózat nélkül.
// *(2026-09-27-ig a [`csere.js`](csere.js) ÁLLÁS-objektumai utaztak itt.)*
//
// ⭐ A KAPCSOLATOT A HÍVÓ ADJA (1. szabály). 2026-09-26-ig ez a fájl TCP-t is nyitott (figyelő,
// hívás); a D69/2 óta nincs TCP a készülékek között — a kapcsolat a UDP-rés
// (`udpVonal.js` → `udpKapcsolat`), és a párbeszéd ugyanúgy fut rajta, egyetlen sor
// változtatás nélkül.
//
// ===== A VONAL ALAKJA: soronként egy JSON-üzenet =====
//
// Ugyanaz, mint a tár alakja (`esemenyek.jsonl`): egy sor = egy üzenet. Nincs külön
// hálózati séma, amit külön karban kellene tartani, és a forgalom emberi szemmel is
// olvasható — egy `nc`-vel bele lehet nézni.
//
//   {"uzenet":"NYITAS","koino":"…","lenyomat":"…"}  — melyik koinóról, és a szeleteim lenyomata
//   {"uzenet":"SZELETEK","lepes":[…]}   — az első szint: melyik szelet tér el?
//   {"uzenet":"ELTERO",…} · {"uzenet":"RESZVETEL",…}  — az eltérő szeletek, és ki melyikben van
//   {"uzenet":"TARTOMANYOK","lepesek":{…}} — a második szint: a szeleteken belüli eltérés
//   {"uzenet":"ESEMENY","esemeny":{…}}  — tessék, egy esemény
//   {"uzenet":"KEREK","azonositok":[…]} — ezek hiányoznak nekem
//   {"uzenet":"KESZ"}                   — mindent elküldtem, amit kértél
//
// ⭐ A NYITÓ LENYOMAT AZ ELSŐ, ÉS EZ A LÉNYEG (D35 óta). A hétköznapi eset az, hogy KÉT CSERE
// KÖZÖTT SEMMI NEM TÖRTÉNT: ha a két nyitó lenyomat egyezik, azonnal végeztünk. ⭐ 2026-09-27 óta
// (a C 7–8. pontja) ha nem egyezik, már nem a szerzőnkénti ÁLLÁS megy (100 000 eseménynél egy
// eltérésért 160 KB — 48. mérés), hanem tartomány-egyeztetés szeletenként (D74; ~4 KB — 50. mérés).
// ⛔ A régi `LENYOMAT`/`ALLAS` menettel TISZTA TÖRÉS (D72).
//
// ===== SZIMMETRIKUS: NINCS KLIENS ÉS SZERVER =====
//
// Mindkét fél UGYANAZT a menetet futtatja: elmondja az állását, kér, ad, beolvaszt. A
// résen ez szó szerint igaz: ott senki nem „csatlakozik" — a két oldal
// megkülönböztethetetlen. Ezért van egyetlen `parbeszed` függvény, és nem kettő.
//
// ⚠️ A MÁSIK FÉL IDEGEN. Amit küld, az adat, nem parancs: minden esemény átmegy az
// `esemenyMentese` ellenőrzésén (aláírás + azonosító), az értelmezhetetlen sort kihagyjuk,
// a túl hosszú sort pedig elvágjuk — egy rosszindulatú fél ne tudjon memóriát elfogyasztani.
//
// Használják: udpVonal.js (a résen: csere, szelet-kérés, fájl-randevú), a próbák.

// ⚠️ 2026-09-26-IG ITT ÁLLT A `node:net` IMPORTJA (TCP). A D69/2 óta a párbeszéd csak egy
// foglalat-szerű kapcsolatot kap (a UDP-résen: `udpVonal.js` → `udpKapcsolat`).

import { beolvasztas } from './csere.js';
// ⭐ A C 7–8. pontja (2026-09-27): a csere szeletenként, tartomány-egyeztetéssel (D74).
import { egyeztetesNyitasa, egyeztetesLepese } from './tartomany.js';
import {
  szeletParok, egyeztetesiHalmaz, egyeztetettEsemenyek, elteresekSzeletei, szeletbeTartozik, ervenyesKulcs,
  vonalKulcsa, GYOKER_KULCS, szeletPar, KOINO_SZULETES_KULCS
} from './szeletEgyeztetes.js';
import { rendezettHalmaz, halmazLenyomata } from '../esemeny/halmaz.js';
import { gyokerDarabBol, gyokerDarabKulcsai } from './cimjegyzek.js';
// ⭐ D97/1: a közös halmaz (a részvételi halmazok ujjlenyomatai és változatai).
import { ervenyesValtozat, halmazUzenet, halmazAlkalmazasa, kozosSzuro } from './kozosHalmaz.js';
// ⚠️ A `kovetkezoKeres` 2026-09-15-ig innen jött: az „eddigi méret → következő eltolás"
// képlet a SOROS átvitel alakja volt. Több forrásnál a munkamegosztás mondja meg, melyik
// szelet következik (D68 / 6.) — a képlet maga viszont megmarad a `fajlAtvitel.js`-ben,
// mert a szelet-határokat ugyanúgy ő számolja.
import { SZELET_MERET, szeletEllenorzes, ujMunkamegosztas } from './fajlAtvitel.js';
// ⭐ D92/6: a kérelem alakja (a menet itt, a tartalom a `kerelem.js`-é — az nem importál hálózatot).
import { kerelemAlakja, valaszAlakja } from './kerelem.js';

// Egy sor legfeljebb ekkora lehet. Egy esemény ~400 bájt, egy 10 000 fős ÁLLÁS ~1,6 MB —
// a 8 MB tehát bőven elég, de egy végtelen sor már nem fér bele.
const SOR_KORLAT = 8 * 1024 * 1024;

// Egy egyeztetés legfeljebb ennyi oda-vissza lépés. Nem díszítés: ha valami körbe-körbe járna,
// azt HIBAKÉNT akarjuk látni, nem végtelen ciklusként. (A tartomány-egyeztetés log16(méret)
// lépésben ér véget — 100 000 eseménynél ~5.)
const LEPES_KORLAT = 64;

// ⛔ Egy szelet-kulcs lista (ELTERO, RESZVETEL) legfeljebb ennyi elemű (9. szabály). ⚠️ Az első
// találkozás (egy üres készülék) az összes szeletet egy listában kapja — a sor-korlát (8 MB)
// ~180 000 kulcsot enged; ennél nagyobb koinónál az első találkozást részletekben kell (⏸️).
const KULCS_KORLAT = 180000;

// Egy beszélgetésben legfeljebb ennyi (friss UDP-)címet fogadunk el. Nem szigor, hanem
// olcsóság: a címjegyzék MINDEN cserén utazik, tehát a mérete a napi forgalomban jelenik
// meg (D35). Tíz cím bőven elég ahhoz, hogy a gráf összefüggő maradjon (D33: ~14 kapcsolat
// fejenként még egymillió főnél is).
const CIM_KORLAT = 10;

// ⭐ D95/1, D95/3: egy CIMEK-ben legfeljebb ennyi összegző szelet és ennyi küldő szelet, és egy körben legfeljebb ennyi
// kért saját esemény (a társ listája és kérése felülről korlátos — 9. szabály).
const OSZ_KORLAT = 64;
const KUL_KORLAT = 64;
const KUL_ESEMENY_KORLAT = 256;

// ⭐ D95/2: a tagsági kísérők köre — egy kérdésben legfeljebb ennyi szerző, egy válaszban legfeljebb ennyi esemény.
const TAGSAG_SZERZO_KORLAT = 32;
const TAGSAG_ESEMENY_KORLAT = 512;

// ⭐⭐⭐ ÉS AMIT MÁSOKRÓL MONDUNK, AZ HÁROM (Csaba döntése, 2026-09-20 — a 34. mérés után).
//
// ⛔ A 34. mérés megfordította a kérdést: **nem a cím-szám dönti el, hogy a hír körbeér-e**,
// hanem a horgonyok aránya. K=0 és K=10 között **nincs mérhető különbség** — mert a
// találkozás MAGA is címcsere. ⭐ A saját címünk viszont mindig megy: *azt a másik sehonnan
// máshonnan nem tudhatja meg.*
//
// ⚠️ Az ára mérve (33. mérés): egy cím ~96 bájt körönként, tízzel a „nincs újdonság" kör
// 386 → 1346 bájt (napi 5,4 MB 14 társnál). Hárommal ez ~670 bájttal olcsóbb — *és épp
// ebbe a helybe fér bele a kötés-kulcs, ami nélkül a hirdetőtábla nem működne.*
// ⭐ A mérleg a 38. mérésben zárult: a mai kör **931 bájt** (napi 3,8 MB 14 társnál),
// vagyis a tábla ára elfért abban, amit a cím-korlát felszabadított.
const IDEGEN_CIM_KORLAT = 3;

// ===================================
// AZ ÜZENET-SOR — a bejövő sorok kiolvasása
// ===================================

/**
 * A kapcsolatra érkező sorokat üzenetekké alakítja, és `kovetkezo()`-vel adagolja.
 *
 * Miért kell külön ilyen? Mert a kapcsolat nem üzeneteket szállít, hanem bájt-folyamot (a
 * résen is: a `udpKapcsolat` 1000 bájtos darabokra vág) — egy `data` esemény tartalmazhat
 * fél üzenetet vagy hármat is. A sorokra bontás a mi dolgunk.
 *
 * @param {Object} kapcsolat - foglalat-szerű kapcsolat (`on('data')`, `setEncoding`…)
 * @returns {{kovetkezo: () => Promise<Object>}}
 */
function uzenetSor(kapcsolat) {
  const beerkezett = [];
  const varakozok = [];
  let puffer = '';
  let hiba = null;
  let lezarult = false;

  const kiszolgal = () => {
    while (varakozok.length && (beerkezett.length || lezarult || hiba)) {
      const { teljesites, elutasitas } = varakozok.shift();
      if (beerkezett.length) teljesites(beerkezett.shift());
      else if (hiba) elutasitas(hiba);
      else elutasitas(new Error('A vonal lezárult, mielőtt a válasz megjött volna'));
    }
  };

  kapcsolat.setEncoding('utf8');

  kapcsolat.on('data', (darab) => {
    puffer += darab;

    let vege;
    while ((vege = puffer.indexOf('\n')) !== -1) {
      const sor = puffer.slice(0, vege);
      puffer = puffer.slice(vege + 1);
      if (!sor.trim()) continue;
      try {
        beerkezett.push(JSON.parse(sor));
      } catch {
        // Egy értelmetlen sor nem szakíthatja meg a cserét — ahogy a tárban sem.
        console.warn('uzenetSor - értelmezhetetlen sor, kihagyva', { hossz: sor.length });
      }
    }

    if (puffer.length > SOR_KORLAT) {
      hiba = new Error('Túl hosszú sor érkezett — a vonalat elvágjuk');
      kapcsolat.destroy();
    }
    kiszolgal();
  });

  kapcsolat.on('error', (h) => { hiba = h; kiszolgal(); });
  kapcsolat.on('end', () => { lezarult = true; kiszolgal(); });
  kapcsolat.on('close', () => { lezarult = true; kiszolgal(); });

  return {
    kovetkezo() {
      return new Promise((teljesites, elutasitas) => {
        varakozok.push({ teljesites, elutasitas });
        kiszolgal();
      });
    }
  };
}

// ===================================
// A PÁRBESZÉD — egy kapcsolat teljes menete
// ===================================

/**
 * Lefuttatja a cserét egy már felépült kapcsolaton — mindkét oldalon ugyanígy.
 *
 * ===== ⭐⭐ A CSERE SZELETENKÉNT (a C 7–8. pontja, 2026-09-27 — a szeletelési terv 4.5) =====
 *
 * ⛔ 2026-09-27-IG ITT A KOINO-SZINTŰ LENYOMAT ÉS A SZERZŐNKÉNTI ÁLLÁS MENT (LENYOMAT → ALLAS →
 * KEREK → ESEMENY, körökben). Az ÁLLÁS a SZERZŐK számával nőtt: 100 000 eseménynél egyetlen
 * eltérésért 160,2 KB (48. mérés). ⭐ Helyette tartomány-egyeztetés (D72/4, D74), két szinten —
 * az ára az eltérések száma × log(méret): ugyanaz az eltérés ~4 KB (50. mérés).
 *
 *   0. NYITAS     — koino · tükör · fájl-kérelem · az első szint nyitó lenyomata
 *                   (utána, mint eddig: FAJLOK és CIMEK). Egyező lenyomat → kész (a hétköznapi eset).
 *   1. SZELETEK   — tartomány-egyeztetés a „szelet:lenyomat" párokon: melyik szelet tér el?
 *   2. ELTERO     — aki listát dolgozott fel, megmondja, amit megtudott (mindkét oldalé)
 *   3. RESZVETEL  — az eltérő szeletek közül ki melyikből marad ki ((a): senki; (b): 9. pont)
 *   4. TARTOMANYOK — a közösen eltérő szeletekben az esemény-azonosítók egyeztetése
 *   5. ESEMENY… KEREK · ESEMENY… KESZ — az átadás: amit a másiknak hiányzónak találtam, azt
 *                   küldöm; amit magamnak, azt kérem; a csak nálam lévő szeletet egészben küldöm
 *
 * ⭐ KI NYIT? A két nyitó lenyomat közül a NAGYOBB nyit, a kisebb felel — mindkét fél ugyanazt a
 * két szöveget látja, tehát ugyanúgy dönt (új üzenet nélkül; a fájl-randevú szerep-döntése is így
 * megy). Egyező lenyomatnál nincs mit egyeztetni.
 *
 * ⛔ TISZTA TÖRÉS (D72): egy régi társ `LENYOMAT`-tal nyit — arra megnevezett hibával állunk le
 * (`REGI-PROTOKOLL`), és a régi program is megáll a `NYITAS`-on.
 *
 * ⚠️ A MÁSIK FÉL IDEGEN: minden listáját ellenőrizzük (alak, méret), a tartomány-üzeneteit a
 * `tartomany.js` ellenőrzi, és amit küld, az ugyanazon a kapun megy be, mint a saját (3. szabály).
 * ⛔ Csak a közös (vagy általunk kért) szeletek eseményeit vesszük át, és csak azokból adunk.
 *
 * @param {Object} kapcsolat - foglalat-szerű kapcsolat (`write`, `on('data')`, `remoteAddress`…)
 * @param {Object} tar
 * @param {string} koino
 * @param {Object} [beallitas]
 * @param {Function} [beallitas.reszvesz] - (szelet-kulcs) → részt veszek-e benne; alapból mind (a)
 * @param {number} [beallitas.gyokerMelyseg] - ⭐ D95/4: a gyökér becsült mélysége — ha megvan (és a tábla-kulcs is), a gyökér
 *   darabonként cserélődik
 * @param {Function} [beallitas.reszvetelHalmaz] - ⭐ D97/1: async () → a részvételi halmazom (Set), vagy null („minden”)
 * @param {Object} [beallitas.halmazTar] - ⭐ D97/1: { sajatNaplo(kulcsok), tarsOlvas(aláíró), tarsIr(aláíró, ismert) }
 * @param {Object} [beallitas.koinoSzuletes] - ⭐ D96: a koinó `KoinoLetrehozas` eseménye (ha ismert) — mindenki részt vesz
 *   benne, a halmaza egyedül ez az esemény
 * @returns {Promise<Object>} { korok, uj, kuldott, masKoino, kivulrolIgyLatszom, … ,
 *   elteroSzeletek, egyeztetoUzenetek }
 */
export async function parbeszed(kapcsolat, tar, koino, beallitas = {}) {
  console.log('parbeszed - KEZDÉS', { koino });

  // ===== ⭐⭐ D95/4: A GYÖKÉR DARABJAI =====
  //
  // Ha a hívó megadja a gyökér mélységét, a gyökér nem egészében, hanem DARABONKÉNT cserélődik: a darabjaim (a
  // tábla-aláíróm szerint, a mélységem ±1 szintjén — `cimjegyzek.js`) a NYITÁS-ban mennek a rövid lenyomatukkal, a társ
  // a tábla-aláírómból és a mélységemből ugyanezeket a kulcsokat számolja ki, és csak a KÖZÖS darabok közül az ELTÉRŐK
  // kerülnek egyeztetésre. ⛔ A nyitó lenyomatba nem kerülnek: két különböző darabú készülék lenyomata így soha nem
  // egyezne, és minden „nincs újdonság” csere végigfutná az első szintet (6. szabály).
  const tablaKulcsElore = typeof beallitas.tablaKulcs === 'function'
    ? beallitas.tablaKulcs() : (beallitas.tablaKulcs ?? null);
  const gyokerMelyseg = Number.isInteger(beallitas.gyokerMelyseg) && beallitas.gyokerMelyseg >= 0
    && beallitas.gyokerMelyseg <= 16 && typeof tablaKulcsElore?.alairo === 'string' ? beallitas.gyokerMelyseg : null;
  const sajatDarabKulcsok = gyokerMelyseg === null ? [] : gyokerDarabKulcsai(tablaKulcsElore.alairo, gyokerMelyseg);
  const sajatDarabSet = new Set(sajatDarabKulcsok);
  const hivoReszvesz = beallitas.reszvesz ?? (() => true);
  // A gyökér-darabban a saját darabjaim döntenek; a teljes gyökér pedig, ha darabonként megy, egészében nem cserélődik.
  // ⭐ D96: a koinó születésének (esemény-)kulcsában mindenki részt vesz.
  const reszvesz = (k) => (k === KOINO_SZULETES_KULCS ? true : gyokerDarabBol(k) ? sajatDarabSet.has(k)
    : (k === GYOKER_KULCS && sajatDarabSet.size ? false : hivoReszvesz(k)));

  // ===== ⭐ D96: A KOINÓ SZÜLETÉSE MINT ESEMÉNY — a párok közt mindig, a halmaza egyedül az esemény =====
  const szuletesEsemeny = beallitas.koinoSzuletes && typeof beallitas.koinoSzuletes === 'object'
    && beallitas.koinoSzuletes.tipus === 'KoinoLetrehozas' && beallitas.koinoSzuletes.koino === koino
    && ervenyesKulcs(beallitas.koinoSzuletes.azonosito) ? beallitas.koinoSzuletes : null;
  const szuletesPar = szuletesEsemeny
    ? KOINO_SZULETES_KULCS + ':' + await halmazLenyomata(rendezettHalmaz([szuletesEsemeny.azonosito])) : null;
  /** A résztvevő szeletek párjai (a szűrő szerint) + a koinó születésének párja (ha ismerem). */
  const parokSzamitasa = async (szuro) => {
    const p = await szeletParok(tar, koino, szuro);
    return szuletesPar ? rendezettHalmaz([...p, szuletesPar]) : p;
  };
  const halmazOf = async (k) => (k === KOINO_SZULETES_KULCS ? (szuletesEsemeny ? [szuletesEsemeny.azonosito] : [])
    : egyeztetesiHalmaz(tar, koino, k));
  const esemenyekOf = async (k) => (k === KOINO_SZULETES_KULCS ? (szuletesEsemeny ? [szuletesEsemeny] : [])
    : egyeztetettEsemenyek(tar, koino, k));

  // ⭐ Amit a társtól megtudtunk a fájlokról (5.7) — a hívó dolga elrakni.
  let fajlokNala = [];

  const sor = uzenetSor(kapcsolat);
  // ⭐ A MÉRÉSEK műszere (70. mérés): ha a hívó ad egy Map-et, üzenet-típusonként összeadjuk a kiküldött (nyílt) bájtokat.
  const uzenetMeres = beallitas.uzenetMeres instanceof Map ? beallitas.uzenetMeres : null;
  const kuld = (uzenet) => {
    const szoveg = JSON.stringify(uzenet) + '\n';
    if (uzenetMeres) uzenetMeres.set(uzenet.uzenet, (uzenetMeres.get(uzenet.uzenet) ?? 0) + Buffer.byteLength(szoveg));
    return kapcsolat.write(szoveg);
  };

  /** A következő üzenet — és ellenőrizzük, hogy azt kaptuk-e, amit vártunk. */
  const varj = async (tipus) => {
    const uzenet = await sor.kovetkezo();
    if (uzenet.uzenet !== tipus) {
      throw new Error('Várt üzenet: ' + tipus + ', érkezett: ' + uzenet.uzenet);
    }
    return uzenet;
  };

  let uj = 0, kuldott = 0, masKoino = null;
  let kivulrolIgyLatszom = null, kapottUdpCimek = [];
  let kapottTablaKulcs = null;      // a társ tábla-kulcsa — a KÖTÉS azonosítója
  let kapottDhtGepek = [];          // néhány DHT-gép, amit ő ismer (nem bizalom, csak cím)
  let elteroSzeletek = 0, egyeztetoUzenetek = 0;
  let ujAzonositok = [];            // ⭐ D82: a most beérkezett események (az észlelőnek)
  let kapottRaj = { vallal: [], tippek: {} };   // ⭐ D91: a társ vállalása és a raj tippjei (a hívóé)
  let tarsKorlatozva = false;       // ⭐ D93/3: a zárt koinó kapuja a társat nem engedte be (csak a megengedett szeletek)
  let tarsAzonossaga = null;        // ⭐ D93/3: a társ személye, ha EBBEN a kézfogásban bizonyította ({ sz, h })
  let osszegzesEredmeny = null;     // ⭐ D95/1: a nagy szeletek összegzésének eredménye (a hívóé)
  let tagsagEredmeny = null;        // ⭐ D95/2: a tagsági kísérők köre (a hívóé)
  let kezbesitve = [];              // ⭐ D95/3: a saját eseményeim, amiket egy tartó átvett vagy már tudott (a hívóé)

  const eredmeny = () => ({
    korok: 1, uj, kuldott, reszletesAllasok: 0, masKoino, kivulrolIgyLatszom, kapottUdpCimek,
    kapottTablaKulcs, kapottDhtGepek, fajlokNala, elteroSzeletek, egyeztetoUzenetek, ujAzonositok, kapottRaj,
    tarsKorlatozva, tarsAzonossaga, osszegzesEredmeny, tagsagEredmeny, kezbesitve
  });

  // ===== ⭐⭐ D93/3: A ZÁRT KOINÓ KAPUJA — a hívóé (`beallitas.zartKapu`), a vonal semmit nem tud a tagságról =====
  //
  // A kapu egy ítéletet ad: { szabad } — vagy { szabad: false, kell, szeletek }: a társ nem (ellenőrzött) tag, tehát csak a
  // megengedett szeleteket (a koinó születése, az ő és a mi azonosság-szeletünk) egyeztetjük vele, fájlt nem adunk, és
  // idegen címet sem. A `kell` azt mondja: kérjük a bizonyítását (a személyes aláírást és a tagsági csomagot). ⛔ Ha a
  // kapu maga hibázik, ZÁRVA marad (a hiba nem nyithat ki egy zárt koinót).
  const zartKapu = typeof beallitas.zartKapu === 'function' ? beallitas.zartKapu : null;
  const kezfogas = beallitas.kezfogas ?? null;
  const kapuItelete = async (adatok) => {
    if (!zartKapu) return { szabad: true };
    try {
      const v = await zartKapu(adatok);
      return v && typeof v === 'object' ? v : { szabad: false, kell: false, szeletek: [] };
    } catch (hiba) {
      console.warn('parbeszed - a zárt koinó kapuja hibázott (zárva marad)', { ok: hiba.message });
      return { szabad: false, kell: false, szeletek: [] };
    }
  };
  /** A társ bemondott személye — csak ha a személyes aláírása EBBEN a kézfogásban érvényes. */
  const bizonyitottSzemely = (ki) => (ki && typeof ki === 'object' && typeof kezfogas?.kiEllenoriz === 'function'
    && kezfogas.kiEllenoriz(ki) ? { sz: ki.sz, h: typeof ki.h === 'string' ? ki.h : null } : null);
  /** Amit a bizonyításunkhoz küldünk: a személyes aláírás és a tagsági csomag (ha van). */
  const sajatBizonyitek = async () => {
    let csomag = null;
    try { csomag = typeof beallitas.tagsagiCsomag === 'function' ? await beallitas.tagsagiCsomag() : null; }
    catch (hiba) { console.warn('parbeszed - a tagsági csomag nem elérhető', { ok: hiba.message }); }
    return { ...(kezfogas?.ki ? { ki: kezfogas.ki } : {}), ...(csomag ? { csomag } : {}) };
  };

  // ===== 0. A NYITÁS =====
  //
  // ⭐ Az első szint nyitó lenyomata a résztvevő szeletek párjainak lenyomata: ha a kettőé egyezik,
  // UGYANAZT tudjuk minden közös szeletről, és a kör itt véget ér (a hétköznapi eset).
  let parok = await parokSzamitasa(reszvesz);
  const [[, , sajatLenyomat]] = await egyeztetesNyitasa(parok);

  // ===== ⭐⭐ ÉS A FÁJL-KÉRELEM IS ITT UTAZIK (5.7 / a szállítás) =====
  //
  // ⛔⛔ MIÉRT A NYITÁS MELLETT, ÉS NEM KÜLÖN KÖRBEN? Mert **a fájl-csere MERŐLEGES az
  // esemény-cserére**: két készülék eseményei egyezhetnek, miközben a **fájljaik teljesen
  // eltérnek** — hiszen a bájtok sosem utaztak. *A kérdést tehát akkor is fel kell tenni, ha
  // nincs mit cserélni eseményből.*
  const sajatKerelem = beallitas.fajlKerelem ?? null;

  // ⭐ A TÜKÖR (2026-08-29, Csaba nyomán): megmondjuk a másiknak, MILYEN CÍMRŐL LÁTJUK. ⚠️ Ebből
  // semmilyen bizalom nem következik (3. szabály) — megfigyelés, nem igazság.
  // ⭐⭐ D89/1, D93/3: A TÁBLA-KULCS A KÉZFOGÁS ALÁÍRÁSÁVAL (`aa`) — 2026-10-04 óta a NYITÁSBAN (korábban a
  // CIMEK-ben): a zárt koinó kapuja ebből tudja meg, ismeri-e már a társat, és ha nem, a CIMEK-ben kéri a
  // bizonyítását. Ettől a tábla-kulcs nem bemondás: aki aláírta, az vett részt EBBEN a kézfogásban.
  const tablaKulcs = tablaKulcsElore;
  // ⭐ D95/4: a darabjaim rövid lenyomata (11 jel = 66 bit; az üres darabé üres) a mélységgel, EGY szövegben
  // (`m:l1:l2:l3` — a kulcsokat a társ számolja). ⚠️ Minden cserén utazik, ezért tömör (6. szabály; mérve).
  let sajatGyd = null;
  if (sajatDarabKulcsok.length) {
    const l = [];
    for (const k of sajatDarabKulcsok) l.push((await szeletPar(tar, koino, k))?.slice(44, 55) ?? null);
    sajatGyd = { m: gyokerMelyseg, l, szoveg: gyokerMelyseg + ':' + l.map((x) => x ?? '').join(':') };
  }
  // ⭐ D95/2: van-e FÜGGŐ tagság-kérdésem (akinek a tagságát a szeleteimben nem tudom)? Ha igen, a tagsági kör akkor is
  // lemegy, ha a szeletek egyeznek — a társnál lehet meg a csomag. ⚠️ Csak egy jel a nyitásban (1 bájt), ha van.
  let sajatTk = false;
  if (typeof beallitas.tagsagFuggo === 'function') {
    try { sajatTk = (await beallitas.tagsagFuggo()) > 0; } catch { sajatTk = false; }
  }
  // ===== ⭐⭐ D97/1: A KÖZÖS HALMAZ — a részvételi halmazom VÁLTOZATA a nyitásban =====
  //
  // Ha nem minden szeletben veszek részt (a szigorú (b)), a nyitó lenyomat a KÖZÖS halmazon fut: a két fél a másik
  // halmazát ujjlenyomatokként ismeri (a tábla-aláírója alatt megjegyezve — `kozosHalmaz.js`), és a nyitásban csak a
  // változat utazik (11 jel). A „minden” részvétel (a mai mód) változat nélkül megy — akkor minden a régiben marad.
  let sajatP = null, sajatNaplo = null;
  if (beallitas.halmazTar && typeof beallitas.reszvetelHalmaz === 'function') {
    try {
      sajatP = await beallitas.reszvetelHalmaz();
      if (sajatP) sajatNaplo = await beallitas.halmazTar.sajatNaplo(sajatP);
    } catch (hiba) {
      console.warn('parbeszed - a részvételi halmaz nem érhető el', { ok: hiba.message });
      sajatP = null;
      sajatNaplo = null;
    }
  }
  kuld({
    // ⭐ A változatot maga az üzenet neve jelzi (a régi program LENYOMAT-tal nyit) — külön mező
    // nélkül: az minden cserén utazna (6. szabály; mérve +28 bájt oda-vissza).
    uzenet: 'NYITAS', koino, lenyomat: sajatLenyomat,
    ...(tablaKulcs ? { tabla: tablaKulcs } : {}),
    ...(tablaKulcs && typeof kezfogas?.alairas === 'string' ? { aa: kezfogas.alairas } : {}),
    latlak: { cim: kapcsolat.remoteAddress, port: kapcsolat.remotePort },
    // ⚠️ A JELZÉS A KÉPESSÉGRŐL SZÓL, NEM A KÉRELEMRŐL: ennélkül az a fél, akinek
    // épp nincs mit kérnie, némán kimaradna — és a másik hiába várna rá.
    ...(beallitas.fajlValasz ? { fajlCsere: true } : {}),
    ...(sajatKerelem ? { fajlKerek: sajatKerelem } : {}),
    ...(sajatTk ? { tk: 1 } : {}),
    ...(sajatGyd ? { gyd: sajatGyd.szoveg } : {}),
    ...(sajatNaplo ? { pv: sajatNaplo.v } : {})
  });

  const elsoUzenet = await sor.kovetkezo();

  // ===== ⭐⭐ A FÁJL-SZELET KISZOLGÁLÁSA (5.7 / B) — saját kapcsolat, a nyitás helyett =====
  //
  // ⏸️ 2026-09-26 ÓTA ÉLESBEN SENKI NEM KEZD ÍGY (a TCP-s több forrás kikerült, D69/2); az ág
  // viszont szállítás-független, és a UDP-s több forrás erre épülhet. A `csereProba.js` méri.
  if (elsoUzenet.uzenet === 'FAJLKEREK' && beallitas.fajlOlvas) {
    // ⛔ D93/3: ez az ág nem hoz személyt — zárt koinóban nem szolgál ki.
    if (!(await kapuItelete({})).szabad) {
      kuld({ uzenet: 'KESZ', tiltva: 'zart' });
      return { ...eredmeny(), fajlokNala: [], tarsKorlatozva: true };
    }
    await fajlSzeletekKiszolgalasa(sor, kuld, beallitas.fajlOlvas, elsoUzenet);
    console.log('parbeszed - VÉGE (fájl-átvitel)');
    return { ...eredmeny(), fajlokNala: [] };
  }

  // ===== ⭐⭐ A KÉRELEM (D92/6): „ADD IDE EZT” — a nyitás helyett =====
  //
  // Három alapkérdés: SZELET (bárkitől — D84/1), FEJLÉCEK (gyökér + minták, két menetben) és TÖRZS (a fájlok —
  // csak a vállalótól). ⭐ A tartalmat a hívó adja (`beallitas.kerelemKiszolgalo`): a vonal semmit nem tud a
  // koinóról. ⚠️ A bizalom itt sem más: amit így kapnak, ugyanazon az `esemenyMentese` kapun megy be (3. szabály).
  if (elsoUzenet.uzenet === 'KERELEM') {
    const k = kerelemAlakja(elsoUzenet);
    const kiszolgalo = beallitas.kerelemKiszolgalo ?? null;
    // ⛔⛔ D93/3: ZÁRT KOINÓBAN CSAK TAGNAK. A kérő a kérelemben hozza a személyes aláírását (a kézfogás átiratára) és a
    // horgonyát; ha nálunk nem ellenőrzött, egy körben elkérjük a tagsági csomagját (`KELL` → `TAGSAG`). A nem tag a
    // megengedett szeleteket kérheti (a koinó születése, a saját és a mi azonosság-szeletünk) — mást nem.
    if (zartKapu) {
      const ki = bizonyitottSzemely(elsoUzenet.ki);
      let v = await kapuItelete({ ki });
      if (!v.szabad && v.kell && ki) {
        kuld({ uzenet: 'KELL' });
        const be = await sor.kovetkezo();
        const csomag = be.uzenet === 'TAGSAG' && be.csomag && typeof be.csomag === 'object' ? be.csomag : null;
        v = await kapuItelete({ ki, csomag });
      }
      if (ki) tarsAzonossaga = ki;
      const megengedett = k?.fajta === 'szelet' && Array.isArray(v.szeletek) && v.szeletek.includes(k.kulcs);
      if (!v.szabad && !megengedett) {
        kuld({ uzenet: 'KESZ', tiltva: 'zart' });
        console.log('parbeszed - VÉGE (kérelem: zárt koinó, nem tag)', { fajta: k?.fajta ?? null });
        return { ...eredmeny(), tarsKorlatozva: true, kerelemKiszolgalva: null, szeletKiszolgalva: null, kerelemTiltva: true };
      }
      if (!v.szabad) tarsKorlatozva = true;
    }
    let kiszolgalva = null;
    // ⭐⭐ D92/1 (c): ha NEM tudjuk kiszolgálni, de a kérelem továbbadható (van még ugrás), és vállaljuk, ÁTVESSZÜK —
    // a válasz később, lépésenként jön vissza (`VALASZ`). A kérdező címét nem kapjuk meg, csak azt, akitől jött (D87).
    const atvesz = async () => {
      if (!k?.az || !(k.htl > 0) || !kiszolgalo?.atvesz) return false;
      if (!(await kiszolgalo.atvesz(k, { cim: kapcsolat.remoteAddress, port: kapcsolat.remotePort }))) return false;
      kuld({ uzenet: 'ATVESZEM', az: k.az });
      kiszolgalva = 'atvett';
      return true;
    };
    if (k?.fajta === 'szelet') {
      // ⭐ D85: UGYANAZ a halmaz, amit a csere egyeztet — a szelet saját eseményei + a hozzá bejelentettek. ⭐ D75/3 (a
      // bekapcsolás): ha a hívó adja (`kerelemKiszolgalo.szelet`), az ÁTMENETI tárból is (amit csak láttam, azt is
      // kiszolgálom — a törzs kivételével).
      const kertek = kiszolgalo?.szelet ? await kiszolgalo.szelet(vonalKulcsa(k.kulcs))
        : await egyeztetettEsemenyek(tar, koino, vonalKulcsa(k.kulcs));
      if (!kertek.length && await atvesz()) { /* átvettük */ } else {
        // Eseményenként külön üzenet — így egy nagy szelet sem ütközik a sorhossz-korlátba.
        for (const esemeny of kertek) kuld({ uzenet: 'ESEMENY', esemeny });
        // ⭐ D95/2: a döntési események szerzőinek tagsági kísérői is (a kérő a szerzők azonosság-szeletét nem tartja) —
        // ⛔ a nem tagnak (zárt koinó) nem: az harmadik felek láncát mutatná meg.
        const kiserok = kertek.length && !tarsKorlatozva && kiszolgalo?.kiserok ? (await kiszolgalo.kiserok(kertek)) ?? [] : [];
        const vanMar = new Set(kertek.map((e) => e.azonosito));
        let kiseroDb = 0;
        for (const esemeny of kiserok) {
          if (!esemeny || vanMar.has(esemeny.azonosito)) continue;
          kuld({ uzenet: 'ESEMENY', esemeny });
          kiseroDb++;
        }
        kuldott = kertek.length + kiseroDb;
        kiszolgalva = 'szelet';
      }
    } else if (k?.fajta === 'fejlecek' && kiszolgalo?.fejlecek) {
      const { valasz, mintak } = await kiszolgalo.fejlecek(k);
      if (!valasz.lista.length && await atvesz()) { /* átvettük */ } else {
        kuld({ uzenet: 'FEJLECEK', valasz });
        // ⭐ A gyökerek bemondása UTÁN a kérdező mondja meg, hol kér mintát (különben a tartó válogatna).
        const u = await sor.kovetkezo();
        if (u.uzenet === 'MINTAKEREK') kuld({ uzenet: 'MINTAK', ...(await mintak(u.kert, u.megvan)) });
        kiszolgalva = 'fejlecek';
      }
    } else if (k?.fajta === 'torzs' && kiszolgalo?.torzs) {
      // ⛔ D84/1: a törzset csak a vállaló adja — a kiszolgáló üres listát mond, ha nem vállalja. ⚠️ És csak azt
      // sorolja fel, ami TÉNYLEG megvan nála: a fájl-hurok az első hiányzónál kilép (a kérő a következőre várna).
      const lenyomatok = await kiszolgalo.torzs(k);
      if (!lenyomatok.length && await atvesz()) {
        console.log('parbeszed - VÉGE (törzs átvéve továbbadásra)', { az: k.az });
        kuld({ uzenet: 'KESZ' });
        return { ...eredmeny(), kerelemKiszolgalva: { fajta: 'atvett', kulcs: k.kulcs }, szeletKiszolgalva: null };
      }
      kuld({ uzenet: 'TORZS', kulcs: k.kulcs, lenyomatok });
      const kovetkezo = await sor.kovetkezo();
      if (kovetkezo.uzenet === 'FAJLKEREK' && lenyomatok.length && beallitas.fajlOlvas) {
        const szabad = new Set(lenyomatok);
        await fajlSzeletekKiszolgalasa(sor, kuld,
          async (l) => (szabad.has(l) ? beallitas.fajlOlvas(l) : null), kovetkezo);
      }
      kiszolgalva = 'torzs';
    }
    // ⚠️ Amit nem tudunk vagy nem akarunk kiszolgálni, arra is KESZ megy (a kérő ne várjon a tétlenségi óráig).
    if (kiszolgalva !== 'torzs') kuld({ uzenet: 'KESZ' });
    console.log('parbeszed - VÉGE (kérelem kiszolgálva)', { fajta: k?.fajta ?? null, kulcs: k?.kulcs ?? null, kiszolgalva });
    return { ...eredmeny(), kerelemKiszolgalva: kiszolgalva ? { fajta: kiszolgalva, kulcs: k.kulcs } : null,
      szeletKiszolgalva: kiszolgalva === 'szelet' ? k.kulcs : null };
  }

  // ===== ⭐⭐ D92/1 (c): A VÁLASZ VISSZAÚTJA — egy továbbadott kérelem válasza, lépésenként (D87) =====
  //
  // Aki egy kérelmet átvett, a választ annak hozza vissza, akitől kapta — ő vagy maga a kérdező, vagy egy újabb
  // továbbító (nem tudni, melyik). A tartalmat a hívó dolgozza fel (`beallitas.valaszFogado`): a vonal nem tud a
  // koinóról, és a kapu (3. szabály) itt sem engedékenyebb.
  if (elsoUzenet.uzenet === 'VALASZ') {
    const v = valaszAlakja(elsoUzenet);
    let fogadva = false;
    if (v && beallitas.valaszFogado) {
      try { fogadva = await beallitas.valaszFogado(v, { cim: kapcsolat.remoteAddress, port: kapcsolat.remotePort }); }
      catch (hiba) { console.warn('parbeszed - a válasz feldolgozása nem sikerült', { ok: hiba.message }); }
    }
    kuld({ uzenet: 'KESZ' });
    console.log('parbeszed - VÉGE (válasz fogadva)', { az: v?.az ?? null, fogadva });
    return { ...eredmeny(), valaszFogadva: v ? { az: v.az, fajta: v.fajta, kulcs: v.kulcs, fogadva: !!fogadva } : null };
  }

  // ⛔ TISZTA TÖRÉS (D72): a régi program `LENYOMAT`-tal nyit.
  if (elsoUzenet.uzenet === 'LENYOMAT') {
    const hiba = new Error('A társ a RÉGI csere-protokollt beszéli (LENYOMAT) — a programját '
      + 'frissíteni kell; a szeletenkénti cserét (2026-09-27) nem érti.');
    hiba.kod = 'REGI-PROTOKOLL';
    throw hiba;
  }
  if (elsoUzenet.uzenet !== 'NYITAS') {
    throw new Error('Várt üzenet: NYITAS, érkezett: ' + elsoUzenet.uzenet);
  }
  const oveNyitas = elsoUzenet;
  if (oveNyitas.latlak?.cim) kivulrolIgyLatszom = oveNyitas.latlak;

  // ----- MÁSIK KOINO? Akkor nincs miről beszélni -----
  //
  // ⚠️ MÉRVE, 2026-08-29: e nélkül két KÜLÖNBÖZŐ koino készüléke is „cserélt" — az eseményeik
  // átkerültek egymás mappájába. Mindkét fél ugyanitt ismeri fel, tehát egyszerre lépnek ki.
  if (oveNyitas.koino !== koino) {
    console.warn('parbeszed - a másik fél MÁSIK koinóé', { sajat: koino, ove: oveNyitas.koino });
    masKoino = oveNyitas.koino ?? '(ismeretlen)';
    return eredmeny();
  }
  if (typeof oveNyitas.lenyomat !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(oveNyitas.lenyomat)) {
    throw new Error('A társ nyitása hibás (nincs érvényes nyitó lenyomat)');
  }

  // ----- ⭐⭐ D93/3: A TÁRS TÁBLA-KULCSA (a nyitásból) ÉS A ZÁRT KOINÓ KAPUJÁNAK ELSŐ ÍTÉLETE -----
  //
  // ⛔ D89/1: a társ tábla-kulcsa CSAK a kézfogásra tett érvényes aláírásával számít — aláírás vagy kézfogás nélkül
  // (régi program, közbeékelődő) nincs kötés belőle. A kapu ebből (a tábla-kulcshoz megjegyzett személyből) dönt
  // először; ha nem ismeri a társat, a CIMEK-ben kéri a bizonyítását.
  {
    const bemondott = oveNyitas.tabla && typeof oveNyitas.tabla === 'object' ? oveNyitas.tabla : null;
    kapottTablaKulcs = bemondott && typeof kezfogas?.ellenoriz === 'function'
      && kezfogas.ellenoriz(bemondott, oveNyitas.aa) ? bemondott : null;
  }
  let kapu = await kapuItelete({ tabla: kapottTablaKulcs });

  // ----- ⭐ D95/4: A KÖZÖS GYÖKÉR-DARABOK KÖZÜL AZ ELTÉRŐK (mindkét fél ugyanazt számolja: a két nyitásból) -----
  const elteroDarabok = [];
  {
    const g = typeof oveNyitas.gyd === 'string' && /^\d{1,2}(:[A-Za-z0-9_-]{0,11}){1,3}$/.test(oveNyitas.gyd)
      ? oveNyitas.gyd.split(':') : null;
    const gm = g ? parseInt(g[0], 10) : -1;
    if (sajatGyd && typeof kapottTablaKulcs?.alairo === 'string' && g && gm >= 0 && gm <= 16) {
      const oveKulcsok = gyokerDarabKulcsai(kapottTablaKulcs.alairo, gm);
      const oveL = new Map(oveKulcsok.map((k, i) => [k, g[i + 1] ? g[i + 1] : null]));
      // ⭐ A darabok egymásba ágyazottak (a mélyebb a sekélyebb része): ha a LEGSEKÉLYEBB közös darab egyezik, a
      // mélyebbek is; ha eltér, elég azt egyeztetni (a mélyebbek benne vannak). A kulcsok mélység szerint jönnek.
      const i = sajatDarabKulcsok.findIndex((k) => oveL.has(k));
      if (i >= 0 && oveL.get(sajatDarabKulcsok[i]) !== sajatGyd.l[i]) elteroDarabok.push(sajatDarabKulcsok[i]);
    }
  }

  // ----- ⭐⭐ D97/1: A KÖZÖS HALMAZ ELŐKÉSZÍTÉSE — mindkét fél tudja, kell-e (a két nyitásból) -----
  //
  // A CÍMEK egy jelet visz (`kz` = állapot : amit a társ halmazából ismerek : a közös lenyomat eleje): `k` — a metszetet
  // ki tudom számolni, és a kapu enged; `s` — a társ mostani halmazát nem ismerem (csere kell); `x` — ebben a cserében
  // nincs közös halmaz (a zárt koinó kapuja korlátoz). Aki nem küld jelet, annál a régi menet fut — a társnál is.
  const ovePv = ervenyesValtozat(oveNyitas.pv) ? oveNyitas.pv : null;
  const kozosMod = !!(sajatNaplo || ovePv) && !!beallitas.halmazTar && typeof tablaKulcsElore?.alairo === 'string'
    && typeof kapottTablaKulcs?.alairo === 'string';
  let tarsIsmert = null;
  if (kozosMod && ovePv) {
    try { tarsIsmert = await beallitas.halmazTar.tarsOlvas(kapottTablaKulcs.alairo); } catch { tarsIsmert = null; }
  }
  const enIsmerem = !ovePv || tarsIsmert?.v === ovePv;
  const kozosLenyomat = async (szuro) =>
    (await egyeztetesNyitasa(await parokSzamitasa((k) => reszvesz(k) && szuro(k))))[0][2];
  const kzSzoveg = async () => {
    if (!kozosMod) return null;
    const ism = ovePv ? (tarsIsmert?.v ?? '') : '';
    if (!kapu.szabad) return 'x:' + ism + ':';
    if (!enIsmerem) return 's:' + ism + ':';
    return 'k:' + ism + ':' + (await kozosLenyomat(kozosSzuro(sajatP, ovePv ? tarsIsmert.ujjak : null))).slice(0, 11);
  };
  const kzAlakja = (x) => {
    const t = typeof x === 'string' ? /^([ksx]):([A-Za-z0-9_-]{11})?:([A-Za-z0-9_-]{11})?$/.exec(x) : null;
    return t ? { allapot: t[1], ism: t[2] ?? null, kl: t[3] ?? null } : null;
  };
  let sajatKz = null, oveKz = null;

  let oKerte = false;               // ⭐ D93/3: a társ kérte-e a bizonyításunkat (a CIMEK-ben)
  // ⭐⭐ D95/1, D95/3: a két fokú vállalás és a csak küldő részvétel listái (a CIMEK-ben mennek, csak ismert tagnak)
  let sajatOsz = [], sajatKul = [], oveOsz = [], oveKul = [];
  const lista = (x, korlat) => (Array.isArray(x) ? x.filter((e) => e && typeof e === 'object' && ervenyesKulcs(e.k)).slice(0, korlat) : []);
  // ⭐ D95/3: a csak küldő felajánlás a nem tagnak (zárt koinó) is megy — de csak a neki megengedett szeletekben (a saját
  // azonosság-szeletében: így jut el hozzá a meghívása); az összegző lista csak tagnak.
  const sajatListak = async () => {
    const szabadKulcs = (k) => kapu.szabad || (Array.isArray(kapu.szeletek) && kapu.szeletek.includes(k));
    sajatOsz = kapu.szabad
      ? lista(typeof beallitas.osszegzoSzeletek === 'function' ? await beallitas.osszegzoSzeletek() : [], OSZ_KORLAT) : [];
    sajatKul = lista(typeof beallitas.kuldoSzeletek === 'function' ? await beallitas.kuldoSzeletek(szabadKulcs) : [], KUL_KORLAT)
      .filter((x) => szabadKulcs(x.k));
  };

  // ----- A CÍMJEGYZÉK: „kiket ismerek" (D36–D38) — csak UDP-címek -----
  //
  // ⭐ Még egy „nincs újdonság" beszélgetés is terjessze a címeket, különben a hálózat nem tudna
  // magától bővülni. ⚠️ EZEK NEM ESEMÉNYEK: a cím múlandó körülmény, csak a vonalon utazik.
  // ⭐ D93/3: a címek két részletben is jöhetnek — ha a kapu a társat még nem ismerte, az idegen címeket és a DHT-gépeket
  // csak az ítélete UTÁN küldi (a bizonyítási kör végén, egy pótló CIMEK-ben); a két részlet összeadódik.
  let idegenUdpKuldheto = [], dhtKuldheto = [];
  const cimekBeolvasasa = (ove) => {
    kapottDhtGepek = [...new Set([...kapottDhtGepek, ...(Array.isArray(ove.dht)
      ? ove.dht.filter((g) => typeof g === 'string') : [])])].slice(0, IDEGEN_CIM_KORLAT);
    kapottUdpCimek = [...kapottUdpCimek, ...(Array.isArray(ove.udp) ? ove.udp : [])
      .filter((c) => c && typeof c.hoszt === 'string' && Number.isInteger(c.port)
        && c.port > 0 && c.port < 65536 && Number.isInteger(c.kor) && c.kor >= 0)]
      .slice(0, CIM_KORLAT);
  };
  {
    // ⚠️ LEHET FÜGGVÉNY IS: a figyelő (postaláda) hosszan fut, és a friss címek listája
    // ablakonként más.
    const udpForras = typeof beallitas.udpCimek === 'function'
      ? beallitas.udpCimek() : beallitas.udpCimek;
    const udpCimek = (Array.isArray(udpForras) ? udpForras : [])
      .filter((c) => c && typeof c.hoszt === 'string' && Number.isInteger(c.port));
    // ⭐ A SAJÁT CÍM MINDIG ELÖL ÉS MINDIG MEGY, a többiekből legfeljebb három.
    const sajatUdp = typeof beallitas.sajatUdpCim === 'function'
      ? beallitas.sajatUdpCim() : (beallitas.sajatUdpCim ?? null);
    const idegenUdp = udpCimek.filter((c) => !(sajatUdp
      && c.hoszt === sajatUdp.hoszt && c.port === sajatUdp.port));
    // ⭐ ÉS NÉHÁNY MEGISMERT DHT-GÉP (Csaba döntése, 2026-09-20). ⛔ D93/3: a zárt koinó nem szabad társának
    // egyiket sem (csak a saját címünket) — a koinó hálózata is a koinó tartalma.
    const dhtForras = typeof beallitas.dhtGepek === 'function'
      ? beallitas.dhtGepek() : beallitas.dhtGepek;
    const dhtGepek = kapu.szabad && Array.isArray(dhtForras) ? dhtForras : [];
    if (kapu.kell) {
      idegenUdpKuldheto = idegenUdp.slice(0, IDEGEN_CIM_KORLAT);
      dhtKuldheto = Array.isArray(dhtForras) ? dhtForras : [];
    }

    // ⭐ D95/1: az összegezve tartott szeleteim (a legutóbb ellenőrzött gyökérrel és időponttal), és D95/3: a csak küldő
    // szeleteimben a saját eseményeim azonosítói — csak ismert tagnak (a nagy szeletek neve is a koinó tartalma).
    // ⚠️ Ha a kapu még nem döntött (első találkozás), a bővebb lista a bizonyítás utáni pótlásban megy.
    await sajatListak();
    sajatKz = await kzSzoveg();
    kuld({
      uzenet: 'CIMEK',
      ...(sajatKz ? { kz: sajatKz } : {}),
      ...(dhtGepek.length ? { dht: dhtGepek } : {}),
      ...(sajatOsz.length ? { osz: sajatOsz } : {}),
      ...(sajatKul.length ? { kul: sajatKul } : {}),
      // ⭐ D93/3: kérjük a társ bizonyítását (a személyes aláírás és a tagsági csomag a következő körben jön).
      ...(kapu.kell ? { kell: 1 } : {}),
      udp: [
        ...(sajatUdp ? [{ hoszt: sajatUdp.hoszt, port: sajatUdp.port, kor: 0 }] : []),
        ...(kapu.szabad ? idegenUdp.slice(0, IDEGEN_CIM_KORLAT) : [])
      ]
    });
    const ove = await varj('CIMEK');
    oKerte = ove.kell === 1;
    // ⚠️ Az alakját itt nem ellenőrizzük, csak továbbadjuk (1. szabály); a hívó ellenőriz.
    cimekBeolvasasa(ove);
    oveOsz = lista(ove.osz, OSZ_KORLAT);
    oveKul = lista(ove.kul, KUL_KORLAT);
    oveKz = kzAlakja(ove.kz);
  }

  // ----- ⭐⭐ D93/3: A BIZONYÍTÁS — ha bármelyik fél kérte, egy kör -----
  //
  // Mindkét fél tudja, lesz-e (a két CIMEK-ből). Aki kérte, megkapja a társ személyes aláírását (a kézfogás átiratára,
  // a koinóval együtt) és horgonyát, és ha van, a tagsági csomagját — ebből a kapu végleg dönt. ⭐ A kapu a tábla-kulcs
  // és a személy kötését megjegyzi, így a következő cserén már nem kér (a hétköznapi csere nem drágul).
  if (kapu.kell || oKerte) {
    kuld({ uzenet: 'TAGSAG', ...(oKerte ? await sajatBizonyitek() : {}) });
    const be = await varj('TAGSAG');
    if (kapu.kell) {
      const ki = bizonyitottSzemely(be.ki);
      const csomag = be.csomag && typeof be.csomag === 'object' ? be.csomag : null;
      kapu = await kapuItelete({ tabla: kapottTablaKulcs, ki, csomag });
      if (ki) tarsAzonossaga = ki;
      // ⭐ A címek pótlása: ha az ítélet beengedte, most megy a többi címünk (ha nem, üres — a társ vár rá); és D95/1,
      // D95/3: az összegző és a küldő szeleteim is (az első CIMEK-ben a kapu még nem döntött).
      // ⚠️ Csak akkor számoljuk újra, ha a kapu most engedett be (a lista így csak bővülhet — a két fél ugyanazt látja).
      if (kapu.szabad) await sajatListak();
      if (kozosMod) sajatKz = await kzSzoveg();
      kuld({ uzenet: 'CIMEK', udp: kapu.szabad ? idegenUdpKuldheto : [],
        ...(sajatKz ? { kz: sajatKz } : {}),
        ...(kapu.szabad && dhtKuldheto.length ? { dht: dhtKuldheto } : {}),
        ...(sajatOsz.length ? { osz: sajatOsz } : {}),
        ...(sajatKul.length ? { kul: sajatKul } : {}) });
    }
    if (oKerte) {
      const potlas = await varj('CIMEK');
      cimekBeolvasasa(potlas);
      if (Array.isArray(potlas.osz)) oveOsz = lista(potlas.osz, OSZ_KORLAT);
      if (Array.isArray(potlas.kul)) oveKul = lista(potlas.kul, KUL_KORLAT);
      if (potlas.kz !== undefined) oveKz = kzAlakja(potlas.kz);
    }
  }

  // ----- ⛔⛔ D93/3: A KORLÁTOZÁS — a nem szabad társsal csak a megengedett szeleteket egyeztetjük -----
  //
  // ⚠️ A nyitó lenyomat (a teljes halmazé) már elment — a két fél ebből dönti el, ki nyit, ezért az marad; az egyeztetés
  // viszont a megengedett szeletek párjain fut (a társ a mi lenyomatunkat csak „eltér”-jelnek látja).
  const korlat = kapu.szabad ? null : new Set((Array.isArray(kapu.szeletek) ? kapu.szeletek : []).filter(ervenyesKulcs));
  if (korlat) {
    tarsKorlatozva = true;
    // ⭐ A megengedett szeleteket a saját vállalásomtól függetlenül egyeztetjük: a nem tag azonosság-szeletét (ahová a
    // meghívása kerül) a tag a szigorú (b) alatt nem vállalja — de a belépéshez épp ez kell.
    parok = await parokSzamitasa((k) => korlat.has(k));
  }
  const korlatonBelul = (k) => !korlat || korlat.has(k) || k === KOINO_SZULETES_KULCS;

  // ----- ⭐⭐ D97/1: A KÖZÖS HALMAZ — a döntés, és ha kell, a halmazok cseréje -----
  //
  // Ha mindkét fél `k`-t mondott, a két közös lenyomat-elejét vetjük össze. Ha valamelyik `s`, a halmazok cseréje jön
  // (HALMAZ: amit a társ nem ismer a halmazomból — a változás, vagy a teljes lista; a fogadó a változatot ellenőrzi), aztán
  // a közös lenyomatok (KOZOS). Ha bárhol hiba van (vagy `x`), a régi menet fut — a két fél ugyanígy dönt.
  let kozos = null;                 // { sajatL, oveL, szuro } — ha a közös halmazon egyeztetünk
  const sajatKzA = kzAlakja(sajatKz);
  if (kozosMod && sajatKzA && sajatKzA.allapot !== 'x' && oveKz && oveKz.allapot !== 'x') {
    if (sajatKzA.allapot === 'k' && oveKz.allapot === 'k' && oveKz.kl) {
      kozos = { sajatL: sajatKzA.kl, oveL: oveKz.kl, szuro: kozosSzuro(sajatP, ovePv ? tarsIsmert.ujjak : null) };
    } else {
      const kuldeni = sajatNaplo && oveKz.ism !== sajatNaplo.v ? halmazUzenet(sajatNaplo, oveKz.ism) : {};
      kuld({ uzenet: 'HALMAZ', ...kuldeni });
      const be = await varj('HALMAZ');
      let ismert = tarsIsmert;
      let rendben = true;
      if (ovePv && !enIsmerem) {
        ismert = halmazAlkalmazasa(tarsIsmert, be);
        rendben = !!ismert && ismert.v === ovePv;
        try { await beallitas.halmazTar.tarsIr(kapottTablaKulcs.alairo, rendben ? ismert : null); }
        catch { /* nem végzetes — a következő cserén újra */ }
      }
      const szuro = rendben ? kozosSzuro(sajatP, ovePv ? ismert.ujjak : null) : null;
      const sajatL = szuro ? (await kozosLenyomat(szuro)).slice(0, 11) : null;
      kuld({ uzenet: 'KOZOS', l: sajatL });
      const bk = await varj('KOZOS');
      const oveL = typeof bk.l === 'string' && /^[A-Za-z0-9_-]{11}$/.test(bk.l) ? bk.l : null;
      if (sajatL && oveL) kozos = { sajatL, oveL, szuro };
    }
  }
  if (kozos) parok = await parokSzamitasa((k) => reszvesz(k) && kozos.szuro(k));
  const nyitoSajat = kozos ? kozos.sajatL : sajatLenyomat;
  const nyitoOve = kozos ? kozos.oveL : oveNyitas.lenyomat;

  // ----- ⭐⭐ D95/2: A TAGSÁGI KÍSÉRŐK KÖRE (a szelet-csere végén — lent hívjuk) -----
  //
  // A döntésben csak az ellenőrzött tag számít (D93/1), a szerzők azonosság-szeletét viszont a szigorú (b) alatt nem
  // tartom: akinek a tagságát nem tudom, annak a csomagját a társtól kérem (TAGSAGKEREK — mindkét fél egyszerre), és a
  // társ a kért szerzők csomagját (vagy ha nincs, a tagsági láncát) küldi (TAGSAGCSOMAGOK); ha egyik fél sem kérdez, a
  // második üzenet elmarad. A kapott események UGYANAZON a kapun mennek be (a hívó `tagsagFogadas`-a). ⭐ A vonal semmit
  // nem tud a tagságról (`tagsagKisero.js`). ⛔ A nem szabad társnak (zárt koinó) nem adunk semmit.
  const tagsagKor = async (ujak) => {
    const hivas = async (nev, ...ervek) => {
      if (typeof beallitas[nev] !== 'function') return null;
      try { return await beallitas[nev](...ervek); }
      catch (hiba) { console.warn('parbeszed - ' + nev + ' nem sikerült', { ok: hiba.message }); return null; }
    };
    const szerzoLista = (x) => (Array.isArray(x) ? [...new Set(x.filter(ervenyesKulcs))].slice(0, TAGSAG_SZERZO_KORLAT) : []);
    const sajatKert = szerzoLista(await hivas('tagsagKerdesek', ujak));
    kuld({ uzenet: 'TAGSAGKEREK', szerzok: sajatKert });
    const oveKert = szerzoLista((await varj('TAGSAGKEREK')).szerzok);
    if (!sajatKert.length && !oveKert.length) return;
    const valasz = !korlat && oveKert.length ? (await hivas('tagsagValasz', oveKert)) ?? [] : [];
    kuld({ uzenet: 'TAGSAGCSOMAGOK', esemenyek: (Array.isArray(valasz) ? valasz : []).slice(0, TAGSAG_ESEMENY_KORLAT) });
    const be = await varj('TAGSAGCSOMAGOK');
    if (!sajatKert.length) return;
    const kapott = (Array.isArray(be.esemenyek) ? be.esemenyek : []).filter((e) => e && typeof e === 'object')
      .slice(0, TAGSAG_ESEMENY_KORLAT);
    const r = await hivas('tagsagFogadas', kapott, sajatKert);
    if (r) {
      uj += r.uj ?? 0;
      ujAzonositok = [...ujAzonositok, ...(Array.isArray(r.ujAzonositok) ? r.ujAzonositok : [])];
      tagsagEredmeny = { kert: sajatKert.length, megtudott: r.megtudott ?? 0, fuggo: r.fuggo ?? null };
    }
  };

  // ----- ⭐⭐ D95/1, D95/3: A NAGY SZELET ÉS A SAJÁT ESEMÉNYEK — két kör, ha bármelyik fél mondott listát -----
  //
  // Mindkét fél tudja, lesz-e (a két CIMEK-ből). 1. kör (OSSZEGZESEK): a társ összegző szeleteire a válaszom (ha a szeletet
  // teljesen tartom: az új gyökér és az azóta lezárt döntések összegzései), és a társ felajánlott saját eseményeiből amit
  // kérek. 2. kör (OSSZEGZESMINTAKEREK): a kapott gyökerekre és összegzésekre a minta-helyeim (ÉN sorsolom, a gyökér UTÁN),
  // és a kért saját eseményeim; aztán a minták (OSSZEGZESMINTAK). ⭐ A vonal semmit nem tud a koinóról: a tartalom a
  // hívóé (`osszegzoTartas.js`). ⛔ A nem szabad társnak (zárt koinó) nem adunk semmit.
  if (sajatOsz.length || sajatKul.length || oveOsz.length || oveKul.length) {
    const hivas = async (nev, ...ervek) => {
      if (typeof beallitas[nev] !== 'function') return null;
      try { return await beallitas[nev](...ervek); }
      catch (hiba) { console.warn('parbeszed - ' + nev + ' nem sikerült', { ok: hiba.message }); return null; }
    };
    const valaszok = !korlat && oveOsz.length ? (await hivas('osszegzesValasz', oveOsz)) ?? [] : [];
    // ⭐ D95/3: a fogadó a hiányzókat kéri, és megmondja, mi van már meg (a küldő így tudja, hogy kézbesült).
    const fogadas = oveKul.length ? (await hivas('kuldoKerem', oveKul)) ?? {} : {};
    const kerem = Array.isArray(fogadas) ? fogadas : (Array.isArray(fogadas.kerem) ? fogadas.kerem : []);
    const megvan = Array.isArray(fogadas.megvan) ? fogadas.megvan : [];
    kuld({ uzenet: 'OSSZEGZESEK', valaszok, kerem, ...(megvan.length ? { megvan } : {}) });
    const be = await varj('OSSZEGZESEK');
    const kapottValaszok = Array.isArray(be.valaszok) ? be.valaszok.slice(0, OSZ_KORLAT) : [];
    const kerdesek = sajatOsz.length && kapottValaszok.length ? await hivas('osszegzesMintaKerdesek', kapottValaszok) : null;
    const felajanlott = new Set(sajatKul.flatMap((x) => (Array.isArray(x.sajat) ? x.sajat : [])));
    const kertSajat = (Array.isArray(be.kerem) ? be.kerem : []).filter((az) => felajanlott.has(az)).slice(0, KUL_ESEMENY_KORLAT);
    const sajatEsemenyek = [];
    for (const az of kertSajat) { const e = await tar.esemeny(az); if (e) sajatEsemenyek.push(e); }
    kuld({ uzenet: 'OSSZEGZESMINTAKEREK', kerdesek, esemenyek: sajatEsemenyek });
    // ⭐ D95/3: KÉZBESÍTVE — amit elküldtem (a társ kérte), és amiről azt mondta, már megvan (csak a felajánlottakból).
    kezbesitve = [...new Set([...sajatEsemenyek.map((e) => e.azonosito),
      ...(Array.isArray(be.megvan) ? be.megvan : []).filter((az) => felajanlott.has(az))])];
    const keres = await varj('OSSZEGZESMINTAKEREK');
    // A társ saját eseményei, amiket KÉRTEM — ugyanazon a kapun (3. szabály).
    const kertem = new Set(kerem);
    const pusholt = (Array.isArray(keres.esemenyek) ? keres.esemenyek : []).filter((e) => e && kertem.has(e.azonosito));
    if (pusholt.length) {
      const b = await beolvasztas(tar, pusholt, koino);
      uj += b.uj;
      ujAzonositok = [...ujAzonositok, ...b.ujAzonositok];
    }
    kuldott += sajatEsemenyek.length;
    const mintak = !korlat && keres.kerdesek ? await hivas('osszegzesMintak', keres.kerdesek) : null;
    kuld({ uzenet: 'OSSZEGZESMINTAK', mintak });
    const bm = await varj('OSSZEGZESMINTAK');
    if (kerdesek) osszegzesEredmeny = await hivas('osszegzesFogadas', kapottValaszok, kerdesek, bm.mintak);
  }

  // ----- ⭐⭐ A FÁJL-KÉRELEM MEGVÁLASZOLÁSA (5.7) -----
  //
  // ⛔ CSAK AMIT KÉRDEZTEK: a teljes fájl-listám elárulná, **mit néztem meg** (D6).
  // ⛔⛔ SZIMMETRIKUS: egy protokoll-lépés feltétele csak olyan dolog lehet, amit MINDKÉT fél
  // ugyanúgy lát — itt a két képesség-jelzés együtt (mérve, 2026-09-13).
  if (oveNyitas.fajlCsere && !!beallitas.fajlValasz) {
    try {
      // ⛔ D93/3: a zárt koinó nem szabad társának fájlt nem adunk (a kérdés ettől még elhangzik — szimmetria).
      const van = korlat ? [] : await beallitas.fajlValasz(oveNyitas.fajlKerek ?? []);
      kuld({ uzenet: 'FAJLOK', van });
    } catch (hiba) {
      // ⚠️ A fájl-réteg hibája NE döntse el az esemény-cserét: a két réteg külön él (D3).
      console.warn('parbeszed - a fájl-válasz nem sikerült', { hiba: hiba.message });
      kuld({ uzenet: 'FAJLOK', van: [] });
    }
    const ove = await varj('FAJLOK');
    // ⛔⛔ CSAK ARRÓL, AMIT KÉRDEZTÜNK (2026-09-27, átnézés): a metszet a saját kérelmünkkel —
    // ami korlátos (`KERELEM_KORLAT`) — a választ is korlátossá teszi (9. szabály).
    const kerdeztuk = new Set(Array.isArray(sajatKerelem) ? sajatKerelem : []);
    fajlokNala = Array.isArray(ove.van)
      ? [...new Set(ove.van)].filter((lenyomat) => kerdeztuk.has(lenyomat))
      : [];
  }

  if (nyitoOve === nyitoSajat && !elteroDarabok.length) {
    // ⭐ Ugyanazt tudjuk minden közös szeletről — a hétköznapi eset, egyetlen nyitás-csere.
    // ⭐ D95/2: ha bármelyik félnek függő tagság-kérdése van (a nyitás jele), a tagsági kör ekkor is lemegy.
    if (sajatTk || oveNyitas.tk === 1) await tagsagKor([]);
    console.log('parbeszed - VÉGE (egyező nyitó lenyomat, nincs mit egyeztetni)');
    return eredmeny();
  }

  // ⭐ KI NYIT? A nagyobb lenyomatú; a kisebb felel (mindkettő ugyanazt látja). ⭐ D95/4: ha a nyitó lenyomatok egyeznek
  // (csak egy gyökér-darab tér el), a nagyobb tábla-aláírójú.
  const enNyitok = nyitoOve !== nyitoSajat ? nyitoSajat > nyitoOve
    : tablaKulcsElore.alairo > kapottTablaKulcs.alairo;

  // ===== 1. AZ ELSŐ SZINT — melyik szelet tér el? (ha a nyitó lenyomatok egyeznek, nincs mit keresni) =====
  const parLelet = { kellNekem: [], kellNeki: [] };
  if (nyitoOve !== nyitoSajat) {
    // A felelő a nyitó lenyomatával kezd (azt a nyitásban már megkapta).
    let bejovo = [[null, 'L', oveNyitas.lenyomat]];
    let enJovok = !enNyitok;
    // ⚠️ D97/1: a közös halmazon (és a korlátozott társnál) a nyitásbeli lenyomat a TELJES részvételé, nem a közös
    // párosoké — az egyeztetés ezt csak „eltér” jelnek veszi, és a részekre bontással onnan helyesen halad (próba mérte:
    // egy külön, közös nyitó üzenet semmit nem adott hozzá).
    for (let lepes = 0; ; lepes++) {
      if (lepes > LEPES_KORLAT) throw new Error('Az első szint nem ért véget ' + LEPES_KORLAT + ' lépésben');
      if (enJovok) {
        const { valasz, kellNekem, kellNeki } = await egyeztetesLepese(parok, bejovo);
        parLelet.kellNekem.push(...kellNekem);
        parLelet.kellNeki.push(...kellNeki);
        kuld({ uzenet: 'SZELETEK', lepes: valasz });
        egyeztetoUzenetek++;
        if (valasz === null) break;
      } else {
        const u = await varj('SZELETEK');
        if (u.lepes === null) break;
        bejovo = u.lepes;
      }
      enJovok = !enJovok;
    }
  }

  // ===== 2. AZ ELTÉRŐ SZELETEK — amit én tudok meg, azt a másik is megtudja =====
  const sajatLelet = elteresekSzeletei(parLelet.kellNekem, parLelet.kellNeki);
  kuld({ uzenet: 'ELTERO', ...sajatLelet });
  const oveLelet = await varj('ELTERO');
  const kulcsLista = (lista) => {
    if (!Array.isArray(lista) || lista.length > KULCS_KORLAT || !lista.every(ervenyesKulcs)) {
      throw new Error('Hibás ELTERO üzenet (a szelet-kulcsok listája)');
    }
    return lista;
  };
  // ⭐ Az ő „nálam"-ja nálam „nálad", és fordítva.
  // ⛔ D93/3: a társ által bemondott szelet-kulcsokat is a megengedettekre szűkítjük — különben egy nem tag az ELTERO
  // `nalad` listájában akármelyik szeletet „kérhetné”.
  const mindketten = new Set([...sajatLelet.mindketten, ...kulcsLista(oveLelet.mindketten)].filter(korlatonBelul));
  // ⭐ D95/4: a közös, eltérő gyökér-darabok — mindkét fél ugyanazokat adja hozzá (a korlátozott társnál a részvételi
  // lépés kimondja, hogy kimaradnak, így a két fél nem csúszik el).
  for (const k of elteroDarabok) mindketten.add(k);
  const csakNalam = new Set([...sajatLelet.nalam, ...kulcsLista(oveLelet.nalad)].filter(korlatonBelul));
  const csakNala = new Set([...sajatLelet.nalad, ...kulcsLista(oveLelet.nalam)].filter(korlatonBelul));

  // ===== 3. A RÉSZVÉTEL — ki melyik eltérő szeletből marad ki =====
  const mind = new Set([...mindketten, ...csakNalam, ...csakNala]);
  // ⭐ Korlátozásnál (zárt koinó) a megengedett szeletekben a saját vállalásomtól függetlenül részt veszek (mint a
  // párok számolásánál), máshol a részvételem dönt.
  const kimaradok = [...mind].filter((k) => (korlat ? !korlatonBelul(k) : !reszvesz(k))).sort();
  // ⭐⭐ D91: A RAJ — az eltérő szeletek közül melyiket VÁLLALOM (a megnézettet soha — D75/3), és néhány ismert
  // tartójuk (név nélkül). Csak itt utazik (ha van eltérő szelet), tehát a „nincs újdonság" csere nem drágul.
  // ⚠️ A hívó dönti el, mit mond (`beallitas.raj` — ez a fájl nem ismeri a vállalást).
  const sajatRaj = typeof beallitas.raj === 'function' ? (beallitas.raj([...mind].sort()) ?? {}) : {};
  const sajatVallal = Array.isArray(sajatRaj.vallal) ? sajatRaj.vallal.filter((k) => mind.has(k)) : [];
  const sajatTippek = sajatRaj.tippek && typeof sajatRaj.tippek === 'object' ? sajatRaj.tippek : {};
  kuld({ uzenet: 'RESZVETEL', kimarad: kimaradok,
    ...(sajatVallal.length ? { vallal: sajatVallal } : {}),
    ...(Object.keys(sajatTippek).length ? { raj: sajatTippek } : {}) });
  const oveReszvetel = await varj('RESZVETEL');
  const oveKimarad = new Set(kulcsLista(oveReszvetel.kimarad));
  kapottRaj = rajAlakja(oveReszvetel, mind);
  const enKimaradok = new Set(kimaradok);
  const egyeztetendo = [...mindketten].filter((k) => !enKimaradok.has(k) && !oveKimarad.has(k)).sort();
  const kuldendoSzeletek = [...csakNalam].filter((k) => !oveKimarad.has(k)).sort();
  const vartSzeletek = [...csakNala].filter((k) => !enKimaradok.has(k)).sort();
  elteroSzeletek = egyeztetendo.length + kuldendoSzeletek.length + vartSzeletek.length;

  // ===== 4. A MÁSODIK SZINT — a közösen eltérő szeletek eseményei =====
  const halmazok = new Map();
  for (const k of egyeztetendo) halmazok.set(k, await halmazOf(k));
  const kellNekem = new Set();
  const kellNeki = new Set();
  {
    const lepesKor = async (lepesek) => {
      const ki = {};
      for (const [k, uzenet] of Object.entries(lepesek)) {
        if (!halmazok.has(k)) throw new Error('Hibás TARTOMANYOK üzenet: nem egyeztetett szelet');
        const { valasz, kellNekem: kn, kellNeki: kni } = await egyeztetesLepese(halmazok.get(k), uzenet);
        for (const x of kn) kellNekem.add(x);
        for (const x of kni) kellNeki.add(x);
        if (valasz) ki[k] = valasz;
      }
      return ki;
    };
    let kesz = false;
    if (enNyitok) {
      const nyitok = {};
      for (const k of egyeztetendo) nyitok[k] = await egyeztetesNyitasa(halmazok.get(k));
      kuld({ uzenet: 'TARTOMANYOK', lepesek: nyitok });
      egyeztetoUzenetek++;
      kesz = egyeztetendo.length === 0;
    }
    for (let lepes = 0; !kesz; lepes++) {
      if (lepes > LEPES_KORLAT) throw new Error('A második szint nem ért véget ' + LEPES_KORLAT + ' lépésben');
      const be = await varj('TARTOMANYOK');
      const lepesek = be.lepesek && typeof be.lepesek === 'object' ? be.lepesek : {};
      if (!Object.keys(lepesek).length) break;
      const ki = await lepesKor(lepesek);
      kuld({ uzenet: 'TARTOMANYOK', lepesek: ki });
      egyeztetoUzenetek++;
      if (!Object.keys(ki).length) kesz = true;
    }
  }

  // ===== 5. AZ ÁTADÁS =====
  //
  // ⭐ Amit a MÁSIKNAK hiányzónak találtam, azt küldöm; a csak nálam lévő szeletet egészben
  // (a születéseivel); amit MAGAMNAK hiányzónak találtam, azt kérem.
  const kuldesre = new Map();
  for (const k of kuldendoSzeletek) {
    for (const e of await esemenyekOf(k)) kuldesre.set(e.azonosito, e);
  }
  for (const a of kellNeki) {
    const e = await tar.esemeny(a);
    if (e) kuldesre.set(a, e);
  }
  for (const e of kuldesre.values()) kuld({ uzenet: 'ESEMENY', esemeny: e });
  kuld({ uzenet: 'KEREK', azonositok: [...kellNekem].sort() });
  kuldott += kuldesre.size;

  const erkezett = [];
  let oveKerese = null;
  for (;;) {
    const uzenet = await sor.kovetkezo();
    if (uzenet.uzenet === 'KEREK') { oveKerese = uzenet; break; }
    if (uzenet.uzenet !== 'ESEMENY') throw new Error('Váratlan üzenet az átadás közben: ' + uzenet.uzenet);
    erkezett.push(uzenet.esemeny);
  }

  // ⛔ CSAK A KÖZÖSEN EGYEZTETETT SZELETEKBŐL ADUNK — amit ő kér, annak ott kell lennie.
  const adhatok = new Set();
  for (const h of halmazok.values()) for (const a of h) adhatok.add(a);
  const kertek = Array.isArray(oveKerese.azonositok) ? oveKerese.azonositok : [];
  if (kertek.length > adhatok.size) throw new Error('Hibás KEREK üzenet: több kérés, mint amit egyeztettünk');
  let valaszolt = 0;
  for (const a of kertek) {
    if (typeof a !== 'string' || !adhatok.has(a)) continue;
    const e = await tar.esemeny(a);
    if (e) { kuld({ uzenet: 'ESEMENY', esemeny: e }); valaszolt++; }
  }
  kuld({ uzenet: 'KESZ' });
  kuldott += valaszolt;

  for (;;) {
    const uzenet = await sor.kovetkezo();
    if (uzenet.uzenet === 'KESZ') break;
    if (uzenet.uzenet !== 'ESEMENY') throw new Error('Váratlan üzenet az átadás közben: ' + uzenet.uzenet);
    erkezett.push(uzenet.esemeny);
  }

  // ----- A BEOLVASZTÁS: ugyanaz a kapu, mint a saját műveleteinknél -----
  // ⛔ Csak a közös vagy általunk várt szeletekből vesszük át (a (b)-ben ez tartja távol a mások
  // érdeklődését a tárunktól); a koino-szűrés és az ellenőrzés a `beolvasztas` dolga.
  const megengedett = new Set([...egyeztetendo, ...vartSzeletek]);
  // ⭐ D96: a koinó születésének kulcsán csak EZ a koinó létrehozása jöhet.
  const atveheto = erkezett.filter((e) => e && typeof e === 'object' && (szeletbeTartozik(e, megengedett)
    || (megengedett.has(KOINO_SZULETES_KULCS) && e.tipus === 'KoinoLetrehozas' && e.koino === koino)));
  const beolvasztva = await beolvasztas(tar, atveheto, koino);
  uj += beolvasztva.uj;
  ujAzonositok = [...ujAzonositok, ...beolvasztva.ujAzonositok];

  // ===== 6. ⭐⭐ D95/2: A TAGSÁGI KÍSÉRŐK — az új (és a függő) szerzők tagsága =====
  await tagsagKor(beolvasztva.ujAzonositok);

  console.log('parbeszed - VÉGE', {
    uj, kuldott, elteroSzeletek, egyeztetoUzenetek, kimaradt: erkezett.length - atveheto.length
  });
  return eredmeny();
}

// ⚠️ ITT ÁLLT 2026-09-26-IG A `figyeloIndulasa` ÉS A `csereVonalon` — a TCP-postaláda és a
// TCP-hívás. A D69/2 óta a fogadás az állandó UDP-kapué (`udpKapu.js`), a párbeszéd a résen
// fut (`udpVonal.js` → `csereUdpResen`), mindkét oldalon ugyanúgy.

// ===================================
// ⭐ BÖNGÉSZŐ-LEKÉRÉS — egyetlen entitás elhozása
// ===================================

/**
 * Elkér EGY entitást (szeletet) egy társtól, és beolvasztja a saját tárunkba.
 *
 * ===== MIÉRT KELL, HA VAN CSERE? =====
 *
 * A rendes csere MINDENT áthoz, amit a másik tud és mi nem. Böngészéskor viszont **egyetlen
 * entitás** kell — az, amire épp rákoppintottunk. Csaba észrevétele indította: *„böngészés
 * közben az összes entitásnak elérhetőnek kell lennie"*; a periodikus csere erre elvileg
 * alkalmatlan, mert hiába ér körbe minden esemény, ha egy nem tárolt entitást akarok
 * megnyitni MOST.
 *
 * ===== A MENET =====
 *
 *   mi  → KERELEM { fajta: 'szelet', kulcs }   (D92/6 óta — korábban SZELETKEREK)
 *   ő   → ESEMENY × N, majd KESZ
 *
 * ⭐ A másik fél `NYITAS`-sal kezd (a párbeszéd szimmetrikus) — azt egyszerűen átlépjük; a
 * `parbeszed` az első bejövő üzenetből (`KERELEM`) látja, hogy ez nem csere.
 * *(2026-09-27-ig ez `LENYOMAT` volt — a tiszta törés óta a régi programmal ez sem megy.)*
 *
 * ⚠️ A KAPOTT ESEMÉNYEK UGYANAZON A KAPUN MENNEK BE (`esemenyMentese`, 3. szabály). Attól,
 * hogy mi kértük, semmivel nem lesznek hitelesebbek.
 *
 * ⭐ A megvalósítás lent: `szeletKapcsolaton` (a kapcsolatot a hívó nyitja — a résen a
 * `szeletUdpResen`, `udpVonal.js`).
 */

/**
 * ⭐⭐ A FÁJL-SZELETEK KISZOLGÁLÁSA — a `fajlHozatala` párja, egy kapcsolaton.
 *
 * ⛔⛔ CIKLUSBAN SZOLGÁLUNK KI, EGY KAPCSOLATON — és ezt a MÉRÉS kényszerítette ki.
 * Elsőre szeletenként ÚJ kapcsolat nyílt. TCP-n ez működik (a figyelő minden kapcsolatot
 * külön elfogad), ⚠️ de az **átfúrt résen nincs „elfogadás"**: ott egy foglalat van és egy
 * társ. A második szelet kérésekor már senki nem figyelt — a párbeszéd elakadt.
 *
 * ⚠️ A KISZOLGÁLÓ NEM ÍTÉL: ha nincs meg a fájl, azt mondja, hogy nincs meg — nem
 * magyarázkodik és nem vádol (D19).
 */
async function fajlSzeletekKiszolgalasa(sor, kuld, fajlOlvas, elsoKeres) {
  let keres = elsoKeres;
  let szeletek = 0;

  for (;;) {
    const lenyomat = keres.lenyomat;
    const eltolas = Number.isInteger(keres.eltolas) ? keres.eltolas : 0;

    let bajtok = null;
    try {
      bajtok = await fajlOlvas(lenyomat);
    } catch (hiba) {
      console.warn('fajlSzeletekKiszolgalasa - a fájl olvasása nem sikerült',
        { hiba: hiba.message });
    }

    if (!bajtok) {
      kuld({ uzenet: 'FAJLNINCS', lenyomat });
    } else {
      // ⛔ EGY SZELET, NEM AZ EGÉSZ FÁJL. A kérelmező mondja meg, hol tart — így egy
      // megszakadt átvitel **onnan folytatódik**, ahol abbamaradt.
      const vege = Math.min(eltolas + SZELET_MERET, bajtok.length);
      const szelet = bajtok.subarray(Math.min(eltolas, bajtok.length), vege);
      kuld({
        uzenet: 'FAJLSZELET',
        lenyomat,
        eltolas,
        // ⚠️ base64, mert a vonal **soronként egy JSON-üzenet** (ugyanaz az alak, mint a
        // táré) — a nyers bájt eltörné a sorokat. Az ára +33% EGY szeleten.
        adat: Buffer.from(szelet).toString('base64'),
        teljes: bajtok.length,
        vege: vege >= bajtok.length
      });
      szeletek++;
    }

    console.log('fajlSzeletekKiszolgalasa - szelet kiszolgálva',
      { lenyomat, eltolas, megvolt: !!bajtok });

    // ⭐ Kér még? Ha a kapcsolat lezárul (végeztünk), a sor hibával válaszol — az a
    // rendes befejezés, nem baj.
    if (!bajtok) break;
    try {
      keres = await sor.kovetkezo();
    } catch {
      break;
    }
    // ⭐ A `KESZ` a kimondott befejezés (lásd a kliens oldalát); bármi más is kiléptet.
    if (keres.uzenet !== 'FAJLKEREK') break;
  }

  return { szeletek };
}

/**
 * ⭐⭐⭐ PASSZÍV FÁJL-KISZOLGÁLÁS EGY KAPCSOLATON (2026-09-14) — a randevúhoz.
 *
 * ⛔⛔ MIÉRT NEM A `parbeszed` EZ: mert a `parbeszed` **kezdeményez** — rögtön küld egy
 * `LENYOMAT`-ot. TCP-n ez rendben van (a kapcsolatot a kérő nyitotta, tehát a szerepek
 * eleve el vannak osztva), ⚠️ de az **átfúrt résen mindkét fél ugyanazt a szerepet játssza**:
 * ha mindkét oldal `parbeszed`-et futtatna „kiszolgálóként", a két LENYOMAT találkozna, és
 * a két gép **rendes cserébe kezdene egymással** — miközben az egyikük épp fájlt kér.
 *
 * ⭐ MÉRVE (2026-09-14, a randevú első nekifutása): pontosan ez történt. A kiszolgáló
 * fájl-ága a második szeletnél egy **`CIMEK`** üzenetet kapott `FAJLKEREK` helyett, kilépett,
 * és a 70 KB-os fájl fele úton maradt. *A tünet félrevezető volt („a társ nem kért semmit"),
 * az ok pedig szerkezeti: aki kiszolgál, az NE beszéljen elsőként.*
 *
 * ⭐ Ez a függvény tehát **néma, amíg nem kérdezik**. Ugyanazt a kiszolgáló-logikát futtatja,
 * amit a `parbeszed` fájl-ága — egy helyen, két hívóval.
 *
 * @param {Object} kapcsolat - a MÁR MEGNYITOTT kapcsolat (TCP-foglalat vagy UDP-rés)
 * @param {Function} fajlOlvas - (lenyomat) → bájtok|null
 * @returns {Promise<{kiszolgalt: boolean, ok?: string, szeletek: number}>}
 */
export async function fajlKiszolgalas(kapcsolat, fajlOlvas) {
  const sor = uzenetSor(kapcsolat);
  const kuld = (targy) => kapcsolat.write(JSON.stringify(targy) + '\n');

  // ⚠️ Ez a hívás DOBHAT (időtúllépés, lezárás) — és ez a rendes befejezés: a társ nem
  // kért semmit. A hívó dönti el, mit kezd vele; itt nem nyeljük el (D19).
  const elso = await sor.kovetkezo();

  if (elso.uzenet !== 'FAJLKEREK') {
    // ⚠️ Nem hiba, csak nem ez a dolgunk: megnevezzük, mi jött helyette.
    console.log('fajlKiszolgalas - VÉGE (nem fájl-kérés)', { uzenet: elso.uzenet });
    return { kiszolgalt: false, ok: 'nem fájl-kérés: ' + elso.uzenet, szeletek: 0 };
  }

  const { szeletek } = await fajlSzeletekKiszolgalasa(sor, kuld, fajlOlvas, elso);
  console.log('fajlKiszolgalas - VÉGE', { szeletek });
  return { kiszolgalt: true, szeletek };
}

/**
 * ⭐⭐ EGY FÁJL ELHOZÁSA — szeletenként, folytathatóan (5.7 / B).
 *
 * ===== A MENET =====
 *
 *   mi  → FAJLKEREK { lenyomat, eltolas }
 *   ő   → FAJLSZELET { adat, vege } — vagy FAJLNINCS
 *
 * ⚠️ EGY KAPCSOLAT, MINDEN SZELET (lent: az átfúrt résen nincs „elfogadás”). Minden szelet
 * önállóan értelmes, és egy megszakadás **nem hagy félkész állapotot a protokollban** — a
 * részleges fájl szeletei úgyis megmondják, hol tartunk.
 *
 * ⛔⛔ ÉS A LEZÁRÁS: a bájtok **ideiglenes helyen** gyűlnek, és csak akkor kerülnek a
 * végleges (lenyomat-)nevükre, ha **újra lenyomatolva** azt adják ki. *Így egy megszakadt
 * vagy meghamisított letöltés soha nem hagy hátra hamis fájlt* (3. szabály).
 *
 * @param {Object} blob - a fájl-tár (`fajlBlobTarolo`)
 * @param {string} koino
 * @param {string} lenyomat
 * @param {Function} kapcsolatNyitas - () → a MÁR MEGNYITOTT kapcsolat (1. szabály: a hívóé)
 * @param {Object} [beallitas] - `korlat` (a fájl felső mérete), `munka` (a több forrás közös
 *        munkamegosztása, D68 / 6.)
 * @returns {Promise<{kesz: boolean, ok?: string, romlott?: boolean, bajt: number, szeletek: number}>}
 */
export async function fajlHozatala(blob, koino, lenyomat, kapcsolatNyitas, beallitas = {}) {
  const korlat = beallitas.korlat ?? Infinity;
  console.log('fajlHozatala - KEZDÉS', { lenyomat });

  let szeletek = 0;
  let bajt = 0;

  // ⭐⭐ A KAPCSOLATOT A HÍVÓ NYITJA (1. szabály). Ez a függvény **nem tudja**, hogy TCP-n,
  // UDP-n vagy egy átfúrt résen beszél — és épp ezért működik mindhármon.
  //
  // ⛔ EGY KAPCSOLAT, MINDEN SZELET. Elsőre szeletenként új kapcsolat nyílt — TCP-n ez
  // működik, ⚠️ de az **átfúrt résen nincs „elfogadás"**: ott egy foglalat van és egy
  // társ, tehát a második szeletnél már senki nem figyelt. *A mérés kényszerítette ki.*
  const kapcsolat = await kapcsolatNyitas();
  // ⭐ D92: a törzs több fájlja EGY kapcsolaton — a hívó a saját sorát adja (egy kapcsolatra egy olvasó), és a
  // kapcsolatot nyitva hagyjuk (a KESZ-t és a zárást ő mondja ki).
  const nyitvaHagy = beallitas.nyitvaHagy === true;
  const sor = beallitas.sor ?? uzenetSor(kapcsolat);

  // ⭐⭐⭐ A MUNKA MEGOSZTHATÓ (D68 / 6., 2026-09-15). Ha a hívó ad egy munkamegosztást, N
  // forrás ugyanannak a fájlnak a **különböző szeleteit** hozza, egyszerre. Ha nem ad,
  // ez a példány egyedül dolgozik — *és akkor pontosan a korábbi viselkedés marad.*
  const munka = beallitas.munka ?? ujMunkamegosztas(await blob.reszlegesSzeletek(lenyomat));
  let enZartamLe = false;

  try {
    for (;;) {
      const kertEltolas = await munka.kovetkezo();
      if (kertEltolas === null) break;        // nincs több dolgunk ezzel a fájllal

      let sikerult = false;
      try {
        kapcsolat.write(JSON.stringify({
          uzenet: 'FAJLKEREK', koino, lenyomat, eltolas: kertEltolas
        }) + '\n');

        // ⚠️ A másik fél NYITAS-sal kezdhet (a párbeszéd szimmetrikus) — átlépjük, ahogy
        // a `szeletKapcsolaton` is teszi.
        let uzenet;
        for (;;) {
          uzenet = await sor.kovetkezo();
          if (uzenet.uzenet === 'FAJLSZELET' || uzenet.uzenet === 'FAJLNINCS') break;
        }

        if (uzenet.uzenet === 'FAJLNINCS') {
          // ⚠️ NEM HIBA, HANEM HIÁNY (D19): a társ azt mondta, nála sincs meg. Lehet, hogy
          // törölte (D3: a tartalmi réteg elveszhet), vagy a jegyzetünk elavult.
          // ⭐ A szeletet VISSZAADJUK a közösbe: másnál még meglehet.
          console.log('fajlHozatala - VÉGE (nála sincs meg)', { lenyomat });
          return { kesz: false, ok: 'a társnál sincs meg', bajt, szeletek };
        }

        const darab = new Uint8Array(Buffer.from(uzenet.adat ?? '', 'base64'));
        const ellenorzes = szeletEllenorzes(kertEltolas, uzenet.eltolas, darab.length, korlat);
        if (!ellenorzes.rendben) {
          // ⛔ A ROSSZ SZELET NEM KERÜL BE, és eldobjuk a félkész fájlt: különben a következő
          // kör egy elrontott alapra építene.
          await blob.reszlegesEldobas(lenyomat);
          console.warn('fajlHozatala - VÉGE (rossz szelet)', { ok: ellenorzes.ok });
          return { kesz: false, ok: ellenorzes.ok, bajt, szeletek };
        }

        // ⭐ A TELJES MÉRET AZ ELSŐ VÁLASZBÓL — ettől indulhat a többi forrás is.
        munka.meretMegvan(uzenet.teljes);

        if (darab.length > 0) {
          await blob.reszlegesIras(lenyomat, kertEltolas, darab);
          bajt += darab.length;
          szeletek++;
        }
        munka.kesz(kertEltolas);
        sikerult = true;

        // ⚠️ Az ÜRES szelet és a `vege` jelzés a fájl végét jelenti — ilyenkor a méret is
        // biztosan ismert, tehát a `keszEgesz()` mondja meg, van-e még dolgunk.
        if (darab.length === 0) munka.meretMegvan(kertEltolas);
        if (munka.keszEgesz()) break;
      } finally {
        // ⛔ HA NEM SIKERÜLT, A SZELET VISSZAKERÜL A KÖZÖSBE — egy másik forrás elviheti.
        // *Enélkül egy elnémult társ magával vinné azt a darabot, amit épp ő kért.*
        if (!sikerult) munka.elengedi(kertEltolas);
      }
    }

    // ⛔⛔ KIMONDJUK, HOGY VÉGEZTÜNK — és ezt is a mérés kényszerítette ki.
    //
    // TCP-n elég lenne bezárni a kapcsolatot: a másik fél olvasása hibával végződik,
    // és tudja, hogy vége. ⚠️ **A UDP-nek viszont nincs lezárása** — a kiszolgáló nem
    // értesül róla, és a következő kérésre várna a tétlenségi órája lejártáig.
    // *Amit a szállítás nem mond meg, azt a protokollnak kell.*
    // ⭐ Minden ág a SAJÁT kapcsolatán mondja ki: a `KESZ` a kapcsolat vége, nem a fájlé.
    if (!nyitvaHagy) { try { kapcsolat.write(JSON.stringify({ uzenet: 'KESZ' }) + '\n'); } catch { /* zárt */ } }

    if (!munka.keszEgesz()) {
      // ⚠️ Nincs több dolgunk, de a fájl nincs kész: a hiányzó szeleteket másnak kell
      // elhoznia (vagy egy későbbi kör). *A részleges fájl MEGMARAD — a feladás itt nem
      // adatvesztés, hanem társ-váltás (28. mérés).*
      console.log('fajlHozatala - VÉGE (részlegesen)', { lenyomat, bajt, szeletek });
      return { kesz: false, ok: 'nem lett meg minden szelet', bajt, szeletek };
    }

    if (munka.lezarasEnyem()) {
      // ⛔⛔ A LEZÁRÁS ELLENŐRIZ: a név maga a bizonyíték.
      enZartamLe = true;
      const lezaras = await blob.reszlegesLezaras(lenyomat);
      munka.lezarasKesz(lezaras);
      console.log('fajlHozatala - VÉGE',
        { lenyomat, kesz: lezaras.rendben, bajt, szeletek });
      // ⭐ A `romlott` TOVÁBBMEGY A HÍVÓHOZ (D68 / 6.): ő tudja, KIKTŐL jöttek a szeletek,
      // és ő jegyezheti fel, hogy a következő körben mással próbáljunk.
      return { kesz: lezaras.rendben, ok: lezaras.ok, romlott: lezaras.romlott === true,
               bajt, szeletek, enZartamLe };
    }

    // ⭐ Más ág zárja le — megvárjuk az eredményét, hogy ugyanazt mondjuk róla.
    // *Két ág nem adhat két igazságot ugyanarról a fájlról.*
    const lezaras = await munka.lezarasraVar();
    return { kesz: lezaras.rendben, ok: lezaras.ok, romlott: lezaras.romlott === true,
             bajt, szeletek, enZartamLe };
  } finally {
    munka.kilep();
    // ⚠️ A UDP-vonalon ELŐBB KI KELL ÜRÍTENI, különben az utolsó darab elveszik —
    // a TCP-foglalatnak nincs ilyen metódusa, ezért kérdezünk rá.
    // ⭐ D92: a nyitva hagyott kapcsolatot a hívó zárja (a törzs következő fájlja ugyanezen jön).
    if (!nyitvaHagy) {
      if (typeof kapcsolat.kiurites === 'function') await kapcsolat.kiurites();
      kapcsolat.destroy();
    }
  }
}

/**
 * ⭐ EGY SZELET ELKÉRÉSE EGY MÁR MEGNYITOTT KAPCSOLATON — a szállítás a hívóé (1. szabály).
 *
 * ⭐ Ugyanaz a minta, mint a `fajlHozatala`-nál: a függvény **nem tudja**, min beszél. Így
 * fut az állandó UDP-kapu résén is (`szeletUdpResen`, D69/2), ahol a túloldalon a rendes
 * csere-munka áll — annak `parbeszed`-je az első üzenetből (`KERELEM`) látja, hogy ez
 * nem csere, hanem egy szelet kérése.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {Object} kapcsolat - a MÁR MEGNYITOTT kapcsolat (foglalat-szerű)
 * @param {string} entitas
 * @returns {Promise<{entitas: string, kapott: number, uj: number, bajtKuldott: number, bajtKapott: number}>}
 */
export async function szeletKapcsolaton(tar, koino, kapcsolat, entitas, tovabb = {}, azonossag = {}) {
  const sor = uzenetSor(kapcsolat);
  // ⭐ D93/3: a személyünk (`azonossag.ki` — a rés-réteg írja alá a kézfogás átiratára) — a zárt koinó kapujának.
  kapcsolat.write(JSON.stringify({ uzenet: 'KERELEM', koino, fajta: 'szelet', kulcs: entitas,
    ...(tovabb.az ? { az: tovabb.az, htl: tovabb.htl } : {}),
    ...(azonossag.ki ? { ki: azonossag.ki } : {}) }) + '\n');

  const erkezett = [];
  let atvette = false;
  let tiltva = false;
  for (;;) {
    const uzenet = await sor.kovetkezo();
    if (uzenet.uzenet === 'KESZ') { tiltva = uzenet.tiltva === 'zart'; break; }
    // ⭐ D93/3: a társ nem tud ellenőrizni minket — a tagsági csomagunkkal felelünk.
    if (uzenet.uzenet === 'KELL') { kapcsolat.write(JSON.stringify(await tagsagValasz(azonossag)) + '\n'); continue; }
    if (uzenet.uzenet === 'ESEMENY') erkezett.push(uzenet.esemeny);
    // ⭐ D92/1 (c): a társ nem tartja, de továbbadja — a válasz később, `VALASZ`-ként jön.
    if (uzenet.uzenet === 'ATVESZEM') atvette = true;
    // A NYITAS-t (és bármi mást) átlépjük — lásd a fenti magyarázatot.
  }

  // ⚠️ UGYANAZ A KAPU, mint a rendes cserénél: ellenőrizetlen esemény innen sem kerül be. ⭐ D92/1 (c): tár NÉLKÜL
  // (a továbbító — K2: nem tartja meg) csak összegyűjtjük, és a hívó viszi tovább; a kérdező kapuja dönt.
  const beolvasztva = tar ? await beolvasztas(tar, erkezett, koino) : { uj: 0 };

  const eredmeny = {
    entitas,
    atvette,
    ...(tiltva ? { tiltva: true } : {}),
    ...(tar ? {} : { esemenyek: erkezett }),
    kapott: erkezett.length,
    uj: beolvasztva.uj,
    bajtKuldott: kapcsolat.bytesWritten,
    bajtKapott: kapcsolat.bytesRead
  };
  console.log('szeletKapcsolaton - VÉGE', eredmeny);
  return eredmeny;
}

/**
 * ⭐⭐ EGY KÉRELEM (D92/6) EGY MÁR MEGNYITOTT KAPCSOLATON — a FEJLÉCEK és a TÖRZS (a szeletet a `szeletKapcsolaton`
 * kéri). A szállítás és a tartalom a hívóé: a minta-helyeket a `mintaValaszto` mondja meg (a gyökerek ismeretében),
 * a törzs fájljait a `blob`-ba hozza (ugyanazon a kapcsolaton, egymás után). ⚠️ Az ellenőrzés a hívóé
 * (`kerelem.js`): ez a függvény csak a menetet viszi.
 *
 * @param {Object} kapcsolat
 * @param {string} koino
 * @param {{fajta: string, kulcs: string, n?: number, d?: number}} kerelem
 * @param {Object} [beallitas] - `mintaValaszto(valasz) → kert`, `megvan` (a már meglévő esemény-azonosítók),
 *        `blob` és `korlat` (a törzshöz)
 * @returns {Promise<Object>} fejléceknél { valasz, kert, mintak, esemenyek }; törzsnél { lenyomatok, fajlok }
 */
export async function kerelemKapcsolaton(kapcsolat, koino, kerelem, beallitas = {}) {
  const sor = uzenetSor(kapcsolat);
  const kuld = (u) => kapcsolat.write(JSON.stringify(u) + '\n');
  kuld({ uzenet: 'KERELEM', koino, fajta: kerelem.fajta, kulcs: kerelem.kulcs, n: kerelem.n, d: kerelem.d,
    ...(kerelem.az ? { az: kerelem.az, htl: kerelem.htl } : {}),
    ...(beallitas.ki ? { ki: beallitas.ki } : {}) });
  // A NYITAS-t (és bármi mást) átlépjük, amíg a válasz meg nem jön. ⭐ D93/3: a KELL-re a tagsági csomagunk megy.
  let u;
  for (;;) {
    u = await sor.kovetkezo();
    if (u.uzenet === 'KELL') { kuld(await tagsagValasz(beallitas)); continue; }
    if (['FEJLECEK', 'TORZS', 'KESZ', 'ATVESZEM'].includes(u.uzenet)) break;
  }
  const bajt = () => ({ bajtKuldott: kapcsolat.bytesWritten, bajtKapott: kapcsolat.bytesRead });
  // ⭐ D92/1 (c): a társ nem tartja, de továbbadja — a válasz később, `VALASZ`-ként jön (lépésenként).
  if (u.uzenet === 'ATVESZEM') {
    for (;;) { const v = await sor.kovetkezo(); if (v.uzenet === 'KESZ') break; }
    return { kiszolgalta: false, atvette: true, ...bajt() };
  }
  if (u.uzenet === 'KESZ') return { kiszolgalta: false, ...(u.tiltva === 'zart' ? { tiltva: true } : {}), ...bajt() };

  if (u.uzenet === 'FEJLECEK') {
    const valasz = u.valasz;
    const kert = beallitas.mintaValaszto ? beallitas.mintaValaszto(valasz) : {};
    kuld({ uzenet: 'MINTAKEREK', kert, megvan: beallitas.megvan ?? [] });
    let m;
    for (;;) { m = await sor.kovetkezo(); if (m.uzenet === 'MINTAK' || m.uzenet === 'KESZ') break; }
    if (m.uzenet === 'MINTAK') { for (;;) { const v = await sor.kovetkezo(); if (v.uzenet === 'KESZ') break; } }
    return { kiszolgalta: true, valasz, kert, mintak: m.mintak ?? {}, esemenyek: Array.isArray(m.esemenyek) ? m.esemenyek : [],
      ...bajt() };
  }

  // TÖRZS: a fájlok egymás után, ugyanazon a kapcsolaton (`nyitvaHagy`), a végén egy KESZ.
  const lenyomatok = (Array.isArray(u.lenyomatok) ? u.lenyomatok : [])
    .filter((l) => typeof l === 'string' && /^[A-Za-z0-9_-]{43}$/.test(l)).slice(0, 64);
  const fajlok = [];
  if (beallitas.blob) {
    for (const l of lenyomatok) {
      if (await beallitas.blob.van(l)) { fajlok.push({ lenyomat: l, kesz: true, megvolt: true }); continue; }
      const r = await fajlHozatala(beallitas.blob, koino, l, async () => kapcsolat,
        { korlat: beallitas.korlat, nyitvaHagy: true, sor });
      fajlok.push({ lenyomat: l, kesz: r.kesz, ok: r.ok ?? null });
    }
  }
  try { kuld({ uzenet: 'KESZ' }); } catch { /* zárt */ }
  return { kiszolgalta: true, lenyomatok, fajlok, ...bajt() };
}

/** ⭐ D93/3: a `KELL`-re adott válasz — a tagsági csomagunk (ha van; ha nincs, üresen — a társ így is dönt). */
async function tagsagValasz(azonossag) {
  let csomag = null;
  try { csomag = typeof azonossag?.tagsagiCsomag === 'function' ? await azonossag.tagsagiCsomag() : null; }
  catch (hiba) { console.warn('tagsagValasz - a tagsági csomag nem elérhető', { ok: hiba.message }); }
  return { uzenet: 'TAGSAG', ...(csomag ? { csomag } : {}) };
}

/**
 * ⭐⭐ D92/1 (c): EGY VÁLASZ VISSZAVITELE — annak, akitől a kérelmet kaptuk (D87: lépésenként). A társ `parbeszed`-je
 * az első üzenetből (`VALASZ`) látja, hogy nem cserét kezdünk.
 * @returns {Promise<{bajtKuldott: number, bajtKapott: number}>}
 */
export async function valaszKapcsolaton(kapcsolat, koino, valasz) {
  const sor = uzenetSor(kapcsolat);
  kapcsolat.write(JSON.stringify({ uzenet: 'VALASZ', koino, ...valasz }) + '\n');
  for (;;) { const u = await sor.kovetkezo(); if (u.uzenet === 'KESZ') break; }
  return { bajtKuldott: kapcsolat.bytesWritten, bajtKapott: kapcsolat.bytesRead };
}

/**
 * ⭐ D91: a társ RESZVETEL-jéből a raj — CSAK az eltérő szeletekről (amit mindketten láttunk), korlátosan, és a
 * rossz alakút eldobva (bizalom nem jár vele: egy tipp legfeljebb elérhetetlenséget okoz).
 */
export function rajAlakja(u, mind) {
  // ⛔ A gyökér nem vállalás (D90) — onnan sem vállalást, sem tippet nem fogadunk el (a vonalon a gyökér kulcsa
  // `GYOKER_KULCS`, a tárban '').
  const gyoker = (k) => k === '' || k === GYOKER_KULCS;
  const vallal = (Array.isArray(u.vallal) ? u.vallal : [])
    .filter((k) => typeof k === 'string' && !gyoker(k) && mind.has(k));
  const tippek = {};
  if (u.raj && typeof u.raj === 'object' && !Array.isArray(u.raj)) {
    for (const [k, lista] of Object.entries(u.raj)) {
      if (gyoker(k) || !mind.has(k) || !Array.isArray(lista)) continue;
      // ⚠️ Előbb szűr, aztán korlátoz (a rossz tipp ne szorítsa ki a jót) — és a feldolgozás is korlátos.
      const jo = lista.slice(0, 12).filter((t) => t && typeof t.h === 'string' && t.h.length <= 64
        && Number.isInteger(t.p) && t.p > 0 && t.p < 65536
        && (t.a === undefined || (typeof t.a === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t.a))))
        .slice(0, 3)
        .map((t) => ({ ...(t.a ? { a: t.a } : {}), h: t.h, p: t.p }));
      if (jo.length) tippek[k] = jo;
    }
  }
  return { vallal, tippek };
}
