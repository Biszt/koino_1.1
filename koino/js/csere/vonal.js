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
  vonalKulcsa
} from './szeletEgyeztetes.js';
// ⚠️ A `kovetkezoKeres` 2026-09-15-ig innen jött: az „eddigi méret → következő eltolás"
// képlet a SOROS átvitel alakja volt. Több forrásnál a munkamegosztás mondja meg, melyik
// szelet következik (D68 / 6.) — a képlet maga viszont megmarad a `fajlAtvitel.js`-ben,
// mert a szelet-határokat ugyanúgy ő számolja.
import { SZELET_MERET, szeletEllenorzes, ujMunkamegosztas } from './fajlAtvitel.js';

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
 * @returns {Promise<Object>} { korok, uj, kuldott, masKoino, kivulrolIgyLatszom, … ,
 *   elteroSzeletek, egyeztetoUzenetek }
 */
export async function parbeszed(kapcsolat, tar, koino, beallitas = {}) {
  console.log('parbeszed - KEZDÉS', { koino });
  const reszvesz = beallitas.reszvesz ?? (() => true);

  // ⭐ Amit a társtól megtudtunk a fájlokról (5.7) — a hívó dolga elrakni.
  let fajlokNala = [];

  const sor = uzenetSor(kapcsolat);
  const kuld = (uzenet) => kapcsolat.write(JSON.stringify(uzenet) + '\n');

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

  const eredmeny = () => ({
    korok: 1, uj, kuldott, reszletesAllasok: 0, masKoino, kivulrolIgyLatszom, kapottUdpCimek,
    kapottTablaKulcs, kapottDhtGepek, fajlokNala, elteroSzeletek, egyeztetoUzenetek, ujAzonositok
  });

  // ===== 0. A NYITÁS =====
  //
  // ⭐ Az első szint nyitó lenyomata a résztvevő szeletek párjainak lenyomata: ha a kettőé egyezik,
  // UGYANAZT tudjuk minden közös szeletről, és a kör itt véget ér (a hétköznapi eset).
  const parok = await szeletParok(tar, koino, reszvesz);
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
  kuld({
    // ⭐ A változatot maga az üzenet neve jelzi (a régi program LENYOMAT-tal nyit) — külön mező
    // nélkül: az minden cserén utazna (6. szabály; mérve +28 bájt oda-vissza).
    uzenet: 'NYITAS', koino, lenyomat: sajatLenyomat,
    latlak: { cim: kapcsolat.remoteAddress, port: kapcsolat.remotePort },
    // ⚠️ A JELZÉS A KÉPESSÉGRŐL SZÓL, NEM A KÉRELEMRŐL: ennélkül az a fél, akinek
    // épp nincs mit kérnie, némán kimaradna — és a másik hiába várna rá.
    ...(beallitas.fajlValasz ? { fajlCsere: true } : {}),
    ...(sajatKerelem ? { fajlKerek: sajatKerelem } : {})
  });

  const elsoUzenet = await sor.kovetkezo();

  // ===== ⭐⭐ A FÁJL-SZELET KISZOLGÁLÁSA (5.7 / B) — saját kapcsolat, a nyitás helyett =====
  //
  // ⏸️ 2026-09-26 ÓTA ÉLESBEN SENKI NEM KEZD ÍGY (a TCP-s több forrás kikerült, D69/2); az ág
  // viszont szállítás-független, és a UDP-s több forrás erre épülhet. A `csereProba.js` méri.
  if (elsoUzenet.uzenet === 'FAJLKEREK' && beallitas.fajlOlvas) {
    await fajlSzeletekKiszolgalasa(sor, kuld, beallitas.fajlOlvas, elsoUzenet);
    console.log('parbeszed - VÉGE (fájl-átvitel)');
    return { ...eredmeny(), fajlokNala: [] };
  }

  // ===== ⭐ A BÖNGÉSZŐ-LEKÉRÉS: „ADD IDE EZT AZ EGY ENTITÁST" — a nyitás helyett =====
  //
  // ⚠️ A bizalom itt sem más: amit így kapunk, ugyanazon az `esemenyMentese` kapun megy be
  // (3. szabály). A kérés nem ad jogot semmire.
  if (elsoUzenet.uzenet === 'SZELETKEREK') {
    // ⭐ D85 (2026-10-02): UGYANAZ a halmaz, amit a csere egyeztet — a szelet saját eseményei + a hozzá
    // bejelentettek (a gyerekei születése, a javaslatai és a szavazataik). Korábban csak a saját
    // eseményeket küldte: a D85 óta a javaslatok a saját szeletükben élnek, így egy gondolat elkérése
    // nélkülük hozta volna (a viselkedési próba mérte: `csereProba.js`, „D85: a javaslat és a szavazat").
    const kertek = typeof elsoUzenet.entitas === 'string'
      ? await egyeztetettEsemenyek(tar, koino, vonalKulcsa(elsoUzenet.entitas))
      : [];
    // Eseményenként külön üzenet — így egy nagy szelet sem ütközik a sorhossz-korlátba.
    for (const esemeny of kertek) kuld({ uzenet: 'ESEMENY', esemeny });
    kuld({ uzenet: 'KESZ' });
    kuldott = kertek.length;
    console.log('parbeszed - VÉGE (szelet kiszolgálva)', {
      entitas: elsoUzenet.entitas, esemeny: kertek.length
    });
    return { ...eredmeny(), szeletKiszolgalva: elsoUzenet.entitas };
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

  // ----- ⭐⭐ A FÁJL-KÉRELEM MEGVÁLASZOLÁSA (5.7) -----
  //
  // ⛔ CSAK AMIT KÉRDEZTEK: a teljes fájl-listám elárulná, **mit néztem meg** (D6).
  // ⛔⛔ SZIMMETRIKUS: egy protokoll-lépés feltétele csak olyan dolog lehet, amit MINDKÉT fél
  // ugyanúgy lát — itt a két képesség-jelzés együtt (mérve, 2026-09-13).
  if (oveNyitas.fajlCsere && !!beallitas.fajlValasz) {
    try {
      const van = await beallitas.fajlValasz(oveNyitas.fajlKerek ?? []);
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

  // ----- A CÍMJEGYZÉK: „kiket ismerek" (D36–D38) — csak UDP-címek -----
  //
  // ⭐ Még egy „nincs újdonság" beszélgetés is terjessze a címeket, különben a hálózat nem tudna
  // magától bővülni. ⚠️ EZEK NEM ESEMÉNYEK: a cím múlandó körülmény, csak a vonalon utazik.
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
    // ⭐⭐⭐ A TÁBLA-KULCS IS ITT UTAZIK (2026-09-20): a KÖTÉS azonosítója — ⛔ nem az azonosságunk.
    const tablaKulcs = typeof beallitas.tablaKulcs === 'function'
      ? beallitas.tablaKulcs() : (beallitas.tablaKulcs ?? null);
    // ⭐ ÉS NÉHÁNY MEGISMERT DHT-GÉP (Csaba döntése, 2026-09-20).
    const dhtForras = typeof beallitas.dhtGepek === 'function'
      ? beallitas.dhtGepek() : beallitas.dhtGepek;
    const dhtGepek = Array.isArray(dhtForras) ? dhtForras : [];

    // ⭐⭐ D89/1: A TÁBLA-KULCS A KÉZFOGÁS ALÁÍRÁSÁVAL utazik (`aa`) — a hívó (a rés-réteg) adja, ez a fájl
    // nem tud kriptográfiáról. Ettől a tábla-kulcs nem bemondás: aki aláírta, az vett részt EBBEN a
    // kézfogásban, tehát egy közbeékelődő nem adhatja ki magát a társnak.
    const kezfogas = beallitas.kezfogas ?? null;
    kuld({
      uzenet: 'CIMEK',
      ...(tablaKulcs ? { tabla: tablaKulcs } : {}),
      ...(tablaKulcs && typeof kezfogas?.alairas === 'string' ? { aa: kezfogas.alairas } : {}),
      ...(dhtGepek.length ? { dht: dhtGepek } : {}),
      udp: [
        ...(sajatUdp ? [{ hoszt: sajatUdp.hoszt, port: sajatUdp.port, kor: 0 }] : []),
        ...idegenUdp.slice(0, IDEGEN_CIM_KORLAT)
      ]
    });
    const ove = await varj('CIMEK');
    // ⚠️ Az alakját itt nem ellenőrizzük, csak továbbadjuk (1. szabály); a hívó ellenőriz.
    // ⛔ D89/1: a társ tábla-kulcsa CSAK a kézfogásra tett érvényes aláírásával számít — aláírás vagy
    // kézfogás nélkül (régi program, közbeékelődő) nincs kötés belőle.
    const bemondott = ove.tabla && typeof ove.tabla === 'object' ? ove.tabla : null;
    kapottTablaKulcs = bemondott && typeof kezfogas?.ellenoriz === 'function'
      && kezfogas.ellenoriz(bemondott, ove.aa) ? bemondott : null;
    kapottDhtGepek = Array.isArray(ove.dht)
      ? ove.dht.filter((g) => typeof g === 'string').slice(0, IDEGEN_CIM_KORLAT) : [];
    kapottUdpCimek = (Array.isArray(ove.udp) ? ove.udp : [])
      .filter((c) => c && typeof c.hoszt === 'string' && Number.isInteger(c.port)
        && c.port > 0 && c.port < 65536 && Number.isInteger(c.kor) && c.kor >= 0)
      .slice(0, CIM_KORLAT);
  }

  if (oveNyitas.lenyomat === sajatLenyomat) {
    // ⭐ Ugyanazt tudjuk minden közös szeletről — a hétköznapi eset, egyetlen nyitás-csere.
    console.log('parbeszed - VÉGE (egyező nyitó lenyomat, nincs mit egyeztetni)');
    return eredmeny();
  }

  // ⭐ KI NYIT? A nagyobb lenyomatú; a kisebb felel (mindkettő ugyanazt látja).
  const enNyitok = sajatLenyomat > oveNyitas.lenyomat;

  // ===== 1. AZ ELSŐ SZINT — melyik szelet tér el? =====
  const parLelet = { kellNekem: [], kellNeki: [] };
  {
    // A felelő a nyitó lenyomatával kezd (azt a nyitásban már megkapta).
    let bejovo = [[null, 'L', oveNyitas.lenyomat]];
    let enJovok = !enNyitok;
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
  const mindketten = new Set([...sajatLelet.mindketten, ...kulcsLista(oveLelet.mindketten)]);
  const csakNalam = new Set([...sajatLelet.nalam, ...kulcsLista(oveLelet.nalad)]);
  const csakNala = new Set([...sajatLelet.nalad, ...kulcsLista(oveLelet.nalam)]);

  // ===== 3. A RÉSZVÉTEL — ki melyik eltérő szeletből marad ki =====
  const mind = new Set([...mindketten, ...csakNalam, ...csakNala]);
  const kimaradok = [...mind].filter((k) => !reszvesz(k)).sort();
  kuld({ uzenet: 'RESZVETEL', kimarad: kimaradok });
  const oveKimarad = new Set(kulcsLista((await varj('RESZVETEL')).kimarad));
  const enKimaradok = new Set(kimaradok);
  const egyeztetendo = [...mindketten].filter((k) => !enKimaradok.has(k) && !oveKimarad.has(k)).sort();
  const kuldendoSzeletek = [...csakNalam].filter((k) => !oveKimarad.has(k)).sort();
  const vartSzeletek = [...csakNala].filter((k) => !enKimaradok.has(k)).sort();
  elteroSzeletek = egyeztetendo.length + kuldendoSzeletek.length + vartSzeletek.length;

  // ===== 4. A MÁSODIK SZINT — a közösen eltérő szeletek eseményei =====
  const halmazok = new Map();
  for (const k of egyeztetendo) halmazok.set(k, await egyeztetesiHalmaz(tar, koino, k));
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
    for (const e of await egyeztetettEsemenyek(tar, koino, k)) kuldesre.set(e.azonosito, e);
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
  const atveheto = erkezett.filter((e) => e && typeof e === 'object' && szeletbeTartozik(e, megengedett));
  const beolvasztva = await beolvasztas(tar, atveheto, koino);
  uj += beolvasztva.uj;
  ujAzonositok = beolvasztva.ujAzonositok;

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
 *   mi  → SZELETKEREK { entitas }
 *   ő   → ESEMENY × N, majd KESZ
 *
 * ⭐ A másik fél `NYITAS`-sal kezd (a párbeszéd szimmetrikus) — azt egyszerűen átlépjük; a
 * `parbeszed` az első bejövő üzenetből (`SZELETKEREK`) látja, hogy ez nem csere.
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
  const sor = uzenetSor(kapcsolat);

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
    try { kapcsolat.write(JSON.stringify({ uzenet: 'KESZ' }) + '\n'); } catch { /* zárt */ }

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
    if (typeof kapcsolat.kiurites === 'function') await kapcsolat.kiurites();
    kapcsolat.destroy();
  }
}

/**
 * ⭐ EGY SZELET ELKÉRÉSE EGY MÁR MEGNYITOTT KAPCSOLATON — a szállítás a hívóé (1. szabály).
 *
 * ⭐ Ugyanaz a minta, mint a `fajlHozatala`-nál: a függvény **nem tudja**, min beszél. Így
 * fut az állandó UDP-kapu résén is (`szeletUdpResen`, D69/2), ahol a túloldalon a rendes
 * csere-munka áll — annak `parbeszed`-je az első üzenetből (`SZELETKEREK`) látja, hogy ez
 * nem csere, hanem egy szelet kérése.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {Object} kapcsolat - a MÁR MEGNYITOTT kapcsolat (foglalat-szerű)
 * @param {string} entitas
 * @returns {Promise<{entitas: string, kapott: number, uj: number, bajtKuldott: number, bajtKapott: number}>}
 */
export async function szeletKapcsolaton(tar, koino, kapcsolat, entitas) {
  const sor = uzenetSor(kapcsolat);
  kapcsolat.write(JSON.stringify({ uzenet: 'SZELETKEREK', koino, entitas }) + '\n');

  const erkezett = [];
  for (;;) {
    const uzenet = await sor.kovetkezo();
    if (uzenet.uzenet === 'KESZ') break;
    if (uzenet.uzenet === 'ESEMENY') erkezett.push(uzenet.esemeny);
    // A NYITAS-t (és bármi mást) átlépjük — lásd a fenti magyarázatot.
  }

  // ⚠️ UGYANAZ A KAPU, mint a rendes cserénél: ellenőrizetlen esemény innen sem kerül be.
  const beolvasztva = await beolvasztas(tar, erkezett, koino);

  const eredmeny = {
    entitas,
    kapott: erkezett.length,
    uj: beolvasztva.uj,
    bajtKuldott: kapcsolat.bytesWritten,
    bajtKapott: kapcsolat.bytesRead
  };
  console.log('szeletKapcsolaton - VÉGE', eredmeny);
  return eredmeny;
}
