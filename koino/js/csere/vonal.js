// koino/js/csere/vonal.js

// Felelősség: a CSERE PÁRBESZÉDE — ugyanaz a protokoll, egy kapcsolaton.
//
// ⭐ MIT CSINÁL, ÉS MIT NEM. Ez a fájl SEMMIT nem tud a koinóról: nem ismer eseményt,
// szabályt, tudatpontot. Csak annyit tesz, hogy a [`csere.js`](csere.js) objektumait
// oda-vissza küldi egy foglalat-szerű kapcsolaton. Ha itt hiba van, az szállítási hiba; a
// protokoll helyessége a csere.js önpróbáiban dől el, hálózat nélkül.
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
//   {"uzenet":"LENYOMAT","koino":"…","lenyomat":"…"} — melyik koinóról, és mit tudok róla
//   {"uzenet":"ALLAS","allas":{…}}      — ezt tudom (részletesen)
//   {"uzenet":"KEREK","kerelem":{…}}    — ebből ez hiányzik nekem
//   {"uzenet":"ESEMENY","esemeny":{…}}  — tessék, egy esemény
//   {"uzenet":"KESZ"}                   — mindent elküldtem, amit kértél
//
// ⭐ A LENYOMAT AZ ELSŐ, ÉS EZ A LÉNYEG (D35, B. lépés). A részletes ÁLLÁS ára 162
// bájt/e-ember — 10 000 fősnél ~1,6 MB, mindkét irányban. A hétköznapi eset viszont az,
// hogy KÉT CSERE KÖZÖTT SEMMI NEM TÖRTÉNT. Ezért a kör a 43 karakteres lenyomattal
// kezdődik: ha a kettő egyezik, azonnal végeztünk, és a részletes állás el sem indul.
// Egy „nincs újdonság" csere így 1,6 MB helyett ~100 bájt.
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

import {
  allasOsszeallitasa, allasLenyomata, hianyokSzamitasa, valaszOsszeallitasa, beolvasztas
} from './csere.js';
// ⚠️ A `kovetkezoKeres` 2026-09-15-ig innen jött: az „eddigi méret → következő eltolás"
// képlet a SOROS átvitel alakja volt. Több forrásnál a munkamegosztás mondja meg, melyik
// szelet következik (D68 / 6.) — a képlet maga viszont megmarad a `fajlAtvitel.js`-ben,
// mert a szelet-határokat ugyanúgy ő számolja.
import { SZELET_MERET, szeletEllenorzes, ujMunkamegosztas } from './fajlAtvitel.js';
import { entitasEsemenyei } from '../tar/esemenyTar.js';

// Egy sor legfeljebb ekkora lehet. Egy esemény ~400 bájt, egy 10 000 fős ÁLLÁS ~1,6 MB —
// a 8 MB tehát bőven elég, de egy végtelen sor már nem fér bele.
const SOR_KORLAT = 8 * 1024 * 1024;

// Egy kapcsolaton legfeljebb ennyi kört futunk. Nem díszítés: ha valami körbe-körbe
// járna, azt HIBAKÉNT akarjuk látni, nem végtelen ciklusként.
const KOR_KORLAT = 5;

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
 * ⭐ MIKOR ÁLLUNK MEG? Ha egy körben SE NEM ADTUNK, SE NEM KAPTUNK semmit. Ezt a
 * feltételt mindkét fél ugyanúgy számolja ki (amit én küldtem, azt ő kapta), tehát
 * egyszerre lépnek ki — nem kell hozzá külön „vége" üzenet és nem kell megegyezni róla.
 *
 * Több kör azért kell, mert egy elrejtett elágazás felderítése két-három körbe telhet
 * (lásd a csere.js kérés-szabályát).
 *
 * @param {Object} kapcsolat - foglalat-szerű kapcsolat (`write`, `on('data')`, `remoteAddress`…)
 * @param {Object} tar
 * @param {string} koino
 * @param {number} [korlat]
 * @returns {Promise<{korok: number, uj: number, kuldott: number}>}
 */
export async function parbeszed(kapcsolat, tar, koino, beallitas = {}) {
  const korlat = beallitas.korlat ?? KOR_KORLAT;
  // ⚠️ 2026-09-26-ig itt állt a `hirdetettCimek` és a `sajatCimHirdetese`: a TCP-címjegyzék
  // (`cimek` mező, D36–D39). A D69/2 óta a címeket a friss UDP-jegyzék terjeszti (`udp`).
  console.log('parbeszed - KEZDÉS', { koino });

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

  let korok = 0, uj = 0, kuldott = 0, reszletesAllasok = 0, masKoino = null;
  let kivulrolIgyLatszom = null, kapottUdpCimek = [];
  let kapottTablaKulcs = null;      // a társ tábla-kulcsa — a KÖTÉS azonosítója
  let kapottDhtGepek = [];          // néhány DHT-gép, amit ő ismer (nem bizalom, csak cím)

  for (let kor = 1; kor <= korlat; kor++) {
    korok = kor;

    // ----- 0. AZ OLCSÓ KÉRDÉS: „ugyanazt tudjuk?" (43 karakter, D35) -----
    //
    // ⭐ EZ A LÉPÉS SPÓROL. A részletes állás ára a létszámmal nő; ez a lenyomat nem.
    // Ha egyezik, a kör azonnal véget ér — és a hétköznapi eset épp ez.
    const sajatAllas = await allasOsszeallitasa(tar, koino);
    const sajatLenyomat = await allasLenyomata(sajatAllas);

    // ⭐ A TÜKÖR (2026-08-29, Csaba nyomán). Megmondjuk a másiknak, MILYEN CÍMRŐL LÁTJUK.
    //
    // MIÉRT KELL? Mert IPv4-en a router ÁTÍRJA a portot: a géped azt hiszi, a 7373-ról
    // indult, kifelé viszont mondjuk a 51842-esen látszik. Így nem tudja megmondani a
    // másiknak, hova kopogjon — nem ismeri a saját külső címét. Ezt szokás STUN-nal
    // megtudni; a koinóban viszont NEM KELL külön szolgáltatás: aki fogadni tud, az ezt
    // amúgy is látja. Elég visszamondania.
    //
    // ⚠️ EBBŐL SEMMILYEN BIZALOM NEM KÖVETKEZIK (3. szabály). Ez nem igazság, hanem
    // megfigyelés: „innen láttalak". Ha a másik hazudik, legfeljebb nem jön össze a
    // kapcsolat — eseményt ettől még nem tud hamisítani. És bárki lehet tükör, aki
    // fogadni tud, tehát nem múlik egyetlen címen sem (2. szabály).
    // ===== ⭐⭐ ÉS A FÁJL-KÉRELEM IS ITT UTAZIK (5.7 / a szállítás) =====
    //
    // ⛔⛔ MIÉRT A LENYOMAT MELLETT, ÉS NEM KÜLÖN KÖRBEN? Mert **a fájl-csere MERŐLEGES
    // az esemény-cserére**: két készülék eseményei egyezhetnek (a lenyomat megegyezik, a kör
    // egyetlen oda-vissza alatt kilép), miközben a **fájljaik teljesen eltérnek** — hiszen a bájtok sosem
    // utaztak. *A kérdést tehát akkor is fel kell tenni, ha nincs mit cserélni eseményből.*
    //
    // ⭐ ÉS ÍGY VISSZAFELÉ KOMPATIBILIS: a `fajlCsere` egy **képesség-jelzés**. Egy régebbi
    // társ LENYOMAT-jában nincs benne — olyankor meg sem szólalunk róla, tehát **nem tud
    // elakadni** rajta. *(A D66 szerint a verzió-eltérés nem kivétel, hanem alapállapot.)*
    const sajatKerelem = beallitas.fajlKerelem ?? null;

    kuld({
      uzenet: 'LENYOMAT', koino, lenyomat: sajatLenyomat,
      latlak: { cim: kapcsolat.remoteAddress, port: kapcsolat.remotePort },
      // ⚠️ A JELZÉS A KÉPESSÉGRŐL SZÓL, NEM A KÉRELEMRŐL: ennélkül az a fél, akinek
      // épp nincs mit kérnie, némán kimaradna — és a másik hiába várna rá.
      ...(beallitas.fajlValasz ? { fajlCsere: true } : {}),
      ...(sajatKerelem ? { fajlKerek: sajatKerelem } : {})
    });
    // ===== ⭐ A BÖNGÉSZŐ-LEKÉRÉS: „ADD IDE EZT AZ EGY ENTITÁST" =====
    //
    // ⭐ MIÉRT ITT ÁGAZIK EL? Mert így **visszafelé kompatibilis**: a párbeszéd szimmetrikus,
    // mindkét fél LENYOMAT-tal kezd — egy régi kliens tehát SOHA nem küld `SZELETKEREK`-et,
    // és a régi kód nem is változik tőle. Aki viszont csak EGY entitást akar (mert épp
    // böngészi), az a kapott LENYOMAT-ot figyelmen kívül hagyja, és ezt kéri helyette.
    //
    // ⚠️ MIÉRT KELL EGYÁLTALÁN? Mert a rendes csere MINDENT áthoz, amit a másik tud és mi
    // nem — böngészéskor viszont EGYETLEN entitás kell. Csaba észrevétele indította:
    // *„böngészés közben az összes entitásnak elérhetőnek kell lennie."*
    //
    // ⚠️ ÉS A BIZALOM ITT SEM MÁS: amit így kapunk, ugyanazon az `esemenyMentese` kapun
    // megy be, mint bármi más (3. szabály). A kérés nem ad jogot semmire.
    const elsoUzenet = await sor.kovetkezo();

    // ===== ⭐⭐ A FÁJL-SZELET KISZOLGÁLÁSA (5.7 / B) =====
    //
    // ⭐ UGYANAZ A MINTA, MINT A `SZELETKEREK`-NÉL: **saját kapcsolat**, nem a rendes
    // párbeszéd közepébe ékelve. Ez pontosan Csaba terve: *„a buli után fent kell tartani a
    // kapcsolatot azon eszközöknek, amik nagyobb csomagot küldenek egymásnak."*
    //
    // ⭐ ÉS EZ ADJA A PÁRHUZAMOSSÁGOT IS: három egyidejű átvitel = három kapcsolat. Nem kell
    // hozzá multiplexelés, és egy lassú átvitel nem akasztja meg a többit.
    //
    // ⚠️ A KISZOLGÁLÓ NEM ÍTÉL: ha nincs meg a fájl, azt mondja, hogy nincs meg — nem
    // magyarázkodik és nem vádol (D19).
    //
    // ⏸️ 2026-09-26 ÓTA ÉLESBEN SENKI NEM KEZD ÍGY: ezt az ágat a kör utáni TCP-s elhozás (a
    // több forrás, D68 / 6.) hívta, és az a D69/2-vel kikerült. ⭐ Az ág viszont szállítás-
    // független, és a résen is kiszolgál (a kapu munkája csere, annak párbeszéde ide jut) —
    // a UDP-s több forrás erre épülhet. A `csereProba.js` a résen méri.
    if (kor === 1 && elsoUzenet.uzenet === 'FAJLKEREK' && beallitas.fajlOlvas) {
      await fajlSzeletekKiszolgalasa(sor, kuld, beallitas.fajlOlvas, elsoUzenet);

      console.log('parbeszed - VÉGE (fájl-átvitel)');
      return { korok: 1, uj: 0, kuldott: 0, reszletesAllasok: 0,
               masKoino: null, kivulrolIgyLatszom: null, kapottUdpCimek: [],
               kapottTablaKulcs: null, kapottDhtGepek: [],
               fajlokNala: [] };
    }

    if (kor === 1 && elsoUzenet.uzenet === 'SZELETKEREK') {
      const kertek = typeof elsoUzenet.entitas === 'string'
        ? await entitasEsemenyei(tar, koino, elsoUzenet.entitas)
        : [];

      // Eseményenként külön üzenet — ahogy a rendes csere is teszi. Így egy nagy szelet
      // sem ütközik a sorhossz-korlátba.
      for (const esemeny of kertek) kuld({ uzenet: 'ESEMENY', esemeny });
      kuld({ uzenet: 'KESZ' });

      console.log('parbeszed - VÉGE (szelet kiszolgálva)', {
        entitas: elsoUzenet.entitas, esemeny: kertek.length
      });
      // ⚠️ A mezők ALAKJA ugyanaz, mint a rendes cserénél (tömbök, nem számok): 2026-09-26
      // óta a kiszolgáló a résen a közös csere-munkán át fut, és az a kapott listákat
      // tömbként olvassa tovább.
      return {
        korok: 1, uj: 0, kuldott: kertek.length, reszletesAllasok: 0,
        masKoino: null, kivulrolIgyLatszom: null, kapottUdpCimek: [],
        kapottTablaKulcs: null, kapottDhtGepek: [], fajlokNala: [],
        szeletKiszolgalva: elsoUzenet.entitas
      };
    }

    if (elsoUzenet.uzenet !== 'LENYOMAT') {
      throw new Error('Várt üzenet: LENYOMAT, érkezett: ' + elsoUzenet.uzenet);
    }
    const oveLenyomat = elsoUzenet;

    if (oveLenyomat.latlak?.cim) kivulrolIgyLatszom = oveLenyomat.latlak;

    // ----- MÁSIK KOINO? Akkor nincs miről beszélni -----
    //
    // ⚠️ MÉRVE, 2026-08-29 — ezért került ide. E nélkül két KÜLÖNBÖZŐ koino készüléke is
    // „cserélt": az eseményeik átkerültek egymás mappájába, és mivel az ÁLLÁS mindig csak
    // a saját koinóra készül, a két lenyomat SOSEM konvergált — a kör-korlátig pörgött,
    // ugyanazt küldve újra minden körben (mérve: 17,2 KB ~100 bájt helyett).
    //
    // Mindkét fél ugyanitt ismeri fel, tehát egyszerre lépnek ki. Nem hiba: két idegen
    // koino találkozása teljesen rendes dolog egy nyitott hálózaton.
    if (oveLenyomat.koino !== koino) {
      console.warn('parbeszed - a másik fél MÁSIK koinóé', {
        sajat: koino, ove: oveLenyomat.koino
      });
      masKoino = oveLenyomat.koino ?? '(ismeretlen)';
      break;
    }

    // ----- ⭐⭐ A FÁJL-KÉRELEM MEGVÁLASZOLÁSA (5.7) -----
    //
    // ⛔ CSAK AMIT KÉRDEZTEK, és ez szándékos: a teljes fájl-listám elárulna, **mit
    // néztem meg** — akkor is, ha a kérdező sosem hallott arról a gondolatról (D6).
    // *Csak arra felelünk, amit kérdeztek.*
    //
    // ⚠️ Ez a lenyomat-egyezés ELŐTT megy — mint a címjegyzék —, mert a fájlok akkor is
    // hiányozhatnak, ha az eseményeink tökéletesen egyeznek.
    // ⛔⛔ SZIMMETRIKUS, ÉS EZ NEM STÍLUS KÉRDÉSE. A párbeszéd **mindkét oldalon ugyanaz a
    // függvény**: ha az egyik fél küld egy üzenetet, amit a másik nem olvas el, az üzenet
    // **bent marad a sorban**, és a következő várakozásba csúszik bele.
    //
    // ⚠️ MÉRVE, KÉT FOLYAMATTAL (2026-09-13): elsőre a feltétel a **saját** kérelem
    // meglétéhez kötődött, és a figyelő — akinek nincs kérelme — küldött, de nem olvasott.
    // A hiba nem a fájl-rétegnél jelentkezett, hanem később:
    // *„Várt üzenet: CIMEK, érkezett: FAJLOK”*. ⭐ **Egy protokoll-lépés feltétele csak olyan
    // dolog lehet, amit MINDKÉT fél ugyanúgy lát** — itt a két képesség-jelzés együtt.
    const fajlKorMegy = kor === 1 && oveLenyomat.fajlCsere && !!beallitas.fajlValasz;

    if (fajlKorMegy) {
      // ----- MINDKETTŐ FELEL -----
      try {
        const van = await beallitas.fajlValasz(oveLenyomat.fajlKerek ?? []);
        kuld({ uzenet: 'FAJLOK', van });
      } catch (hiba) {
        // ⚠️ A fájl-réteg hibája NE döntse el az esemény-cserét: a két réteg külön él (D3).
        console.warn('parbeszed - a fájl-válasz nem sikerült', { hiba: hiba.message });
        kuld({ uzenet: 'FAJLOK', van: [] });
      }

      // ----- ÉS MINDKETTŐ OLVAS -----
      const ove = await sor.kovetkezo();
      if (ove.uzenet !== 'FAJLOK') {
        throw new Error('Várt üzenet: FAJLOK, érkezett: ' + ove.uzenet);
      }
      // ⭐ A TANULT BIRTOKLÁS a hívóhoz megy vissza — a `vonal.js` **nem ír jegyzetet**,
      // mert az már nem szállítás (1. szabály: a logika és a vonal külön él).
      fajlokNala = Array.isArray(ove.van) ? ove.van : [];
    }

    // ----- A CÍMJEGYZÉK: „kiket ismerek" (D36–D38) — 2026-09-26 óta csak UDP-címek -----
    //
    // ⭐ MIÉRT ITT, ÉS MIÉRT MINDIG? Csaba felismerése: a tükör és a terjedő címjegyzék
    // UGYANAZ A DOLOG — a saját külső címed is csak egy cím, ami a közösségben terjed.
    // Ezért a címcsere a lenyomat-egyezés ELŐTT megy: még egy „nincs újdonság" beszélgetés
    // is terjessze a címeket, különben a hálózat nem tudna magától bővülni.
    //
    // ⚠️ EZEK NEM ESEMÉNYEK, ÉS SOHA NEM IS LESZNEK AZOK. A cím nem igazság, hanem
    // múlandó körülmény: két hét múlva már másé. Egy aláírt esemény örökre megmaradna —
    // ezért a címek csak a vonalon utaznak, és a hívó dönti el, mit kezd velük.
    // Bizalom nem jár velük (3. szabály): ha valaki hazudik, legfeljebb nem jön össze
    // egy kapcsolat.
    //
    // ⛔ 2026-09-26-IG ITT MENT A TCP-CÍMJEGYZÉK IS (`cimek` mező, a figyelő saját címével —
    // D39). A D69/2 óta nincs TCP a készülékek között: a címek terjesztése a friss
    // UDP-jegyzéké (`udp` mező, lent). *Egy régi társ `cimek`-et is küldhet — nem olvassuk.*
    if (kor === 1) {
      // ===== ⭐⭐ ÉS A FRISS UDP-CÍMEK, KÜLÖN MEZŐBEN (2026-09-18) =====
      //
      // ⛔ MIÉRT KÜLÖN, ÉS MIÉRT NEM A `cimek` KÖZÉ? Mert a router a két szállításnak KÜLÖN
      // leképezést ad — mérve egy futáson belül: UDP 39471, TCP 63495. Egy listába keverve a
      // társ TCP-vel hívna egy UDP-portot, vagy fordítva: *két szám ugyanarra a kérdésre.*
      //
      // ⭐ ÉS CSAK UDP-CÍM UTAZIK (Csaba, 2026-09-18): az induló címek HELYBEN maradnak (a
      // `tars` parancs és a helyi felfedezés adja őket). Így nincs szükség jelölő mezőre —
      // ami a vonalon van, az UDP. *A 6. szabály a kisebb üzenetet kéri.*
      //
      // ⭐ A `kor` MÁSODPERCBEN utazik, nem időbélyeg: a fogadó a SAJÁT órájához köti
      // (`udpCimekBeolvasztasa`). Idegen órában nem kell megbízni.
      //
      // ⚠️ VISSZAFELÉ OLVASHATÓ: egy régebbi társ nem küld `udp` mezőt, és nem is várja —
      // a JSON-üzenetben egy ismeretlen mező ártalmatlan.
      // ⚠️ LEHET FÜGGVÉNY IS: a figyelő (postaláda) HOSSZAN fut, és a friss címek listája
      // ablakonként más — egy induláskor átadott tömb néhány perc múlva halott címeket
      // hirdetne. *A hívó dolga megmondani, mi a friss; ez a réteg csak továbbítja.*
      const udpForras = typeof beallitas.udpCimek === 'function'
        ? beallitas.udpCimek() : beallitas.udpCimek;
      // ⚠️ A saját listánkból is csak ÉRVÉNYES címet küldünk: egy elrontott bejegyzés (a
      // jegyzék kézzel is szerkeszthető, 4. szabály) ne döntse el a cserét.
      const udpCimek = (Array.isArray(udpForras) ? udpForras : [])
        .filter((c) => c && typeof c.hoszt === 'string' && Number.isInteger(c.port));

      // A sajátunk ELÖL: ha a korlátba nem fér bele minden, ez az egy cím az, amit a
      // másik sehonnan máshonnan nem tudhat meg.
      // ⭐ A SAJÁT CÍM MINDIG ELÖL ÉS MINDIG MEGY, a többiekből legfeljebb három.
      // ⚠️ A UDP-jegyzék NÉVTELEN (nem mondja meg, melyik cím kié), ezért a sajátunkat a
      // hívó adja meg külön — ő az egyetlen, aki tudja, melyik az.
      // ⚠️ LEHET FÜGGVÉNY IS, ugyanabból az okból, mint a jegyzék: a postaláda hosszan fut,
      // és a saját külső címünk közben változhat (új rés, új leképezés).
      const sajatUdp = typeof beallitas.sajatUdpCim === 'function'
        ? beallitas.sajatUdpCim() : (beallitas.sajatUdpCim ?? null);
      const idegenUdp = udpCimek.filter((c) => !(sajatUdp
        && c.hoszt === sajatUdp.hoszt && c.port === sajatUdp.port));
      // ⭐⭐⭐ A TÁBLA-KULCS IS ITT UTAZIK (2026-09-20): ez a KÖTÉS azonosítója és a
      // rekeszünk neve a hirdetőtáblán. ⛔ **Nem az azonosságunk** (D6) — külön kulcs,
      // hogy a táblát figyelő ne köthesse a címeinket a személyünkhöz.
      // ⚠️ A NYILVÁNOS fele megy, a titkos soha; a társankénti közös titkot mindkét fél a
      // sajátjából SZÁMÍTJA (`tablaKulcs.js`). ~90 bájt körönként — épp az a hely, amit a
      // cím-korlát 10 → 3 felszabadított.
      const tablaKulcs = typeof beallitas.tablaKulcs === 'function'
        ? beallitas.tablaKulcs() : (beallitas.tablaKulcs ?? null);

      // ⭐ ÉS NÉHÁNY MEGISMERT DHT-GÉP (Csaba döntése, 2026-09-20): így egy friss telepítés
      // az első buli után független a közismert belépőktől. ~20 bájt darabja, három megy.
      const dhtForras = typeof beallitas.dhtGepek === 'function'
        ? beallitas.dhtGepek() : beallitas.dhtGepek;
      const dhtGepek = Array.isArray(dhtForras) ? dhtForras : [];

      kuld({
        uzenet: 'CIMEK',
        ...(tablaKulcs ? { tabla: tablaKulcs } : {}),
        ...(dhtGepek.length ? { dht: dhtGepek } : {}),
        udp: [
          ...(sajatUdp ? [{ hoszt: sajatUdp.hoszt, port: sajatUdp.port, kor: 0 }] : []),
          ...idegenUdp.slice(0, IDEGEN_CIM_KORLAT)
        ]
      });
      const ove = await varj('CIMEK');
      // ⚠️ AZ ALAKJÁT ITT NEM ELLENŐRIZZÜK, csak továbbadjuk: a `vonal.js` semmit nem tud
      // a tábláról (1. szabály). Az ellenőrzés a hívónál van (`ervenyesTablaKulcs`), és
      // attól, hogy valaki bemond egy kulcsot, semmit nem hiszünk el neki (3. szabály).
      kapottTablaKulcs = ove.tabla && typeof ove.tabla === 'object' ? ove.tabla : null;
      kapottDhtGepek = Array.isArray(ove.dht)
        ? ove.dht.filter((g) => typeof g === 'string').slice(0, IDEGEN_CIM_KORLAT) : [];
      kapottUdpCimek = (Array.isArray(ove.udp) ? ove.udp : [])
        .filter((c) => c && typeof c.hoszt === 'string' && Number.isInteger(c.port)
          && c.port > 0 && c.port < 65536 && Number.isInteger(c.kor) && c.kor >= 0)
        .slice(0, CIM_KORLAT);
    }

    if (oveLenyomat.lenyomat === sajatLenyomat) {
      // Ugyanazt tudjuk. Nincs mit kérni és nincs mit adni — a részletes állást el sem
      // küldjük. Mindkét fél ugyanezt számolja ki, tehát egyszerre lépnek ki.
      console.log('parbeszed - egyező lenyomat, nincs mit cserélni', { kor });
      break;
    }

    // ----- 1. MINDKETTŐ ELMONDJA, MIT TUD (részletesen) -----
    reszletesAllasok++;
    kuld({ uzenet: 'ALLAS', allas: sajatAllas });
    const ove = await varj('ALLAS');

    // ----- 2. MINDKETTŐ KÉR -----
    kuld({ uzenet: 'KEREK', kerelem: hianyokSzamitasa(sajatAllas, ove.allas) });
    const kerese = await varj('KEREK');

    // ----- 3. MINDKETTŐ AD -----
    const kuldendok = await valaszOsszeallitasa(tar, kerese.kerelem);
    for (const esemeny of kuldendok) kuld({ uzenet: 'ESEMENY', esemeny });
    kuld({ uzenet: 'KESZ' });
    kuldott += kuldendok.length;

    // ----- 4. AMIT Ő KÜLDÖTT -----
    const erkezett = [];
    for (;;) {
      const uzenet = await sor.kovetkezo();
      if (uzenet.uzenet === 'KESZ') break;
      if (uzenet.uzenet !== 'ESEMENY') {
        throw new Error('Váratlan üzenet a csere közben: ' + uzenet.uzenet);
      }
      erkezett.push(uzenet.esemeny);
    }

    // ----- 5. BEOLVASZTÁS: ugyanaz a kapu, mint a saját műveleteinknél -----
    // ⚠️ A koino-szűrés MÁSODIK rétege: fent az ŐSZINTE tévedést fogtuk meg (a másik
    // bemondta, melyik koinóé), itt a HAZUGOT — aki a mi koinónkat mondta, de mást küld.
    const eredmeny = await beolvasztas(tar, erkezett, koino);
    uj += eredmeny.uj;

    // ----- 6. CSENDES KÖR? -----
    //
    // ⚠️ EZ MEGMARAD A LENYOMAT MELLETT IS, ÉS NEM FÖLÖSLEGES. A lenyomat akkor állít
    // meg, ha a két fél EGYETÉRT. Ez a feltétel akkor is megáll, ha nem: ha a másik fél
    // hibás vagy rosszindulatú, és nem adja meg, amit kérünk, a lenyomat sosem egyezne —
    // a csendes kör viszont kilép. A kettő együtt zárja ki a végtelen ciklust.
    if (kuldendok.length === 0 && erkezett.length === 0) break;
  }

  console.log('parbeszed - VÉGE', {
    korok, uj, kuldott, reszletesAllasok, masKoino, kivulrolIgyLatszom,
    kapottUdpCimek: kapottUdpCimek.length,
    fajlokNala: fajlokNala.length
  });
  return {
    korok, uj, kuldott, reszletesAllasok, masKoino, kivulrolIgyLatszom, kapottUdpCimek,
    kapottTablaKulcs, kapottDhtGepek,
    fajlokNala
  };
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
 * ⭐ A másik fél LENYOMAT-tal kezd (a párbeszéd szimmetrikus) — azt egyszerűen átlépjük.
 * Ettől lesz az egész **visszafelé kompatibilis**: a protokoll nem változott, csak egy új
 * kérdést tettünk bele, amit a régi kliens sosem tesz fel.
 *
 * ⚠️ A KAPOTT ESEMÉNYEK UGYANAZON A KAPUN MENNEK BE (`esemenyMentese`, 3. szabály). Attól,
 * hogy mi kértük, semmivel nem lesznek hitelesebbek.
 *
 * ⭐ A megvalósítás lent: `szeletKapcsolaton` (a kapcsolatot a hívó nyitja — a résen a
 * `szeletUdpResen`, `udpVonal.js`).
 */
/**
 * ⭐⭐ EGY FÁJL ELHOZÁSA — szeletenként, folytathatóan (5.7 / B).
 *
 * ===== A MENET =====
 *
 *   mi  → FAJLKEREK { lenyomat, eltolas }
 *   ő   → FAJLSZELET { adat, vege } — vagy FAJLNINCS
 *
 * ⚠️ KÖRÖNKÉNT EGY SZELET, ÚJ KAPCSOLATTAL. Nem a legtakarékosabb, de **a legegyszerűbb
 * helyes**: minden szelet önállóan értelmes, és egy megszakadás **nem hagy félkész
 * állapotot a protokollban** — a részleges fájl mérete úgyis megmondja, hol tartunk.
 * *(Ha egyszer kevés lesz, a körön belül több szelet is kérhető — a hívó változtatása
 * nélkül.)*
 *
 * ⛔⛔ ÉS A LEZÁRÁS: a bájtok **ideiglenes néven** gyűlnek, és csak akkor kerülnek a
 * végleges (lenyomat-)nevükre, ha **újra lenyomatolva** azt adják ki. *Így egy megszakadt
 * vagy meghamisított letöltés soha nem hagy hátra hamis fájlt* (3. szabály).
 *
 * @param {Object} blob - a fájl-tár (`fajlBlobTarolo`)
 * @param {string} koino
 * @param {string} cim
 * @param {number} port
 * @param {string} lenyomat
 * @param {Object} [beallitas]
 * @returns {Promise<{kesz: boolean, ok?: string, bajt: number, szeletek: number}>}
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

        // ⚠️ A másik fél LENYOMAT-tal kezdhet (a párbeszéd szimmetrikus) — átlépjük, ahogy
        // a `szeletHozatala` is teszi.
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
    // ⭐ A `romlott` TOVÁBBMEGY A HÍVÓHOZ (D68 / 6.): ő tudja, KIKTŐL jöttek a szeletek,
      // és ő jegyezheti fel, hogy a következő körben mással próbáljunk.
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
    // A LENYOMAT-ot (és bármi mást) átlépjük — lásd a fenti magyarázatot.
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
