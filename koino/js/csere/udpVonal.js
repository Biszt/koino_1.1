// koino/js/csere/udpVonal.js

// Felelősség: A CSERE SZÁLLÍTÁSA UDP-N — a pajzsfúrással megnyitott résen.
//
// ⭐ MIÉRT KELL, HA MÁR VAN TCP-VONAL? Mert a pajzsfúrás UDP-vel nyitja a rést (csak egy
// UDP-foglalat tud egyszerre küldeni és fogadni ugyanazon a porton), a router pedig a
// TCP-t és az UDP-t KÜLÖN tartja számon. Vagyis az átfúrt lyukon **csak UDP fér át** —
// és a koino cseréje eddig csak TCP-n ment. Ez a fájl köti össze a kettőt.
//
// ⭐ A TRÜKK: NEM ÍRJUK ÁT A PROTOKOLLT. Ez a fájl egy olyan objektumot ad, ami ugyanúgy
// viselkedik, mint egy TCP-foglalat (`write`, `on('data')`, `remoteAddress`…), csak alatta
// UDP van. Így a `vonal.js` `parbeszed` függvénye — a teljes csere-menet — VÁLTOZATLANUL
// fut rajta. Ez az 1. szabály gyakorlati haszna: a szállítás cserélhető, mert a logika
// sosem tudta, min utazik.
//
// ===== AMIT A UDP NEM AD MEG, ÉS ITT PÓTOLNI KELL =====
//
// A TCP-től három dolgot kapunk ingyen, az UDP-től egyiket sem:
//   · MEGÉRKEZÉS — az UDP-csomag elveszhet, és senki nem szól érte
//   · SORREND    — a csomagok előzhetik egymást
//   · DARABOLÁS  — egy nagy üzenet nem fér egy csomagba
//
// Ezért van itt egy pici, de valódi „megbízható folyam": minden darab kap SORSZÁMOT, a
// másik NYUGTÁZZA, és amíg nem nyugtázta, ÚJRAKÜLDJÜK.
//
// ⚠️⚠️ EZ A BEKEZDÉS 2026-09-14-IG AZT ÍRTA, HOGY „szándékosan egyszerű: egyszerre EGY
// darab van úton" — és azt is, hogy „ha egyszer kevés lesz, itt kell javítani". **Kevés
// lett, és itt javítottuk.** A D67 óta a vonal **ablakkal** dolgozik (16 darab úton),
// **gyors újraküldéssel** és **mért újraküldési idővel**; a protokollhoz tényleg nem
// kellett hozzányúlni. *A régi mondat itt marad, mert a jóslata bevált — de a jelen időt
// nem hagyhattuk rajta.*
//
// ⭐ A három mechanizmus a saját szakaszában van leírva lentebb, azzal a méréssel együtt,
// ami kikényszerítette. **Egy „nincs újdonság" kör továbbra is 334 bájt** — az ablak csak
// akkor számít, ha van mit átvinni.
//
// ===== A KÉT ŐR, AMI ELŐSZÖR HIÁNYZOTT (2026-08-30) =====
//
// A TCP-től nem három dolgot kapunk ingyen, hanem ötöt — a maradék kettő először kimaradt
// innen, és a 30%-os csomagvesztéses önpróba ettől 6-ból 5-ször VÉGTELENÜL VÁRT:
//
//   · KIÜRÍTÉS a lezáráskor — a TCP `end()` előbb kiírja a puffert, és csak utána küld
//     FIN-t. A régi `end()` itt ELDOBTA a még nyugtázatlan darabot. Márpedig a
//     `parbeszed` a saját utolsó üzenetét elküldi, és nem vár rá nyugtát: ha közben a
//     másik válasza megjön, azonnal kilép. Ha épp az a csomagunk veszett el, a másik
//     örökre várta. → `kiurites()`
//   · TÉTLENSÉGI ÓRA — hogy a néma társ ne ragaszthasson be. → `setTimeout()`
//
// ⚠️ A TANULSÁG: a „megbízható folyam" nem attól megbízható, hogy újraküld, hanem attól,
// hogy MINDEN kimenetele véges. A néma nem-esemény a legrosszabb hibafajta.
//
// A vonal alakja itt is emberi szemmel olvasható marad:
//   {"sz":1,"a":"…szövegdarab…"}   — adat, sorszámmal
//   {"ny":1}                        — nyugta: „az 1-est megkaptam"
//
// Használják: koino.js (a pajzsfúrás után) és a csereProba.js.

import { parbeszed, fajlHozatala, fajlKiszolgalas } from './vonal.js';

// Egy UDP-csomagba ennyi szöveget teszünk. Az 1200 bájt alatti csomag a legtöbb
// hálózaton darabolás nélkül átmegy — a nagyobb csomag könnyen elvész.
const DARAB_MERET = 1000;

// ===================================
// ⭐⭐⭐ AZ ÚJRAKÜLDÉSI IDŐ MÉRT, NEM BEÉGETETT (D67 / 1. darab, 2026-09-14)
// ===================================
//
// ⛔⛔ ITT KORÁBBAN EGY SZÁM ÁLLT: `UJRAKULDES_KOZ = 300` ms. A 16. mérés megmutatta, mit
// tesz ez egy lassú vonalon — **és nem érv, hanem szám**: 400 ms oda-visszánál minden darab
// **×2,0**-szer megy ki, 800 ms-nál **×3,0**-szor. Vagyis **újraküldjük azt, ami éppen ÚTON
// van** — a saját türelmetlenségünkből. ⚠️ Műholdas, mobil- és zsúfolt vonalon a 400–600 ms
// hétköznapi; a **9. szabály** szerint egymilliárd készüléknél ez **alapeset, nem kivétel**.
//
// ⭐ A MEGOLDÁS A BEVÁLT (RFC 6298, Jacobson–Karels): megmérjük az oda-vissza időt,
// simítjuk, és az **ingadozását** is követjük — mert egy vonal nem attól rossz, hogy lassú,
// hanem attól, hogy **kiszámíthatatlan**:
//
//   RTO = SRTT + 4 × RTTVAR
//
// ⛔⛔ A KLASSZIKUS GOND: **melyik küldésre felel a nyugta?** Ha egy darabot kétszer
// küldtünk el, a nyugtáról nem tudható — és a hamis mintától a becslés elromlik. A régi
// válasz erre **Karn szabálya**: újraküldött darabból ne vegyünk mintát.
//
// ⭐⭐⭐ MI VISZONT MEGSZÜNTETJÜK A KÉTÉRTELMŰSÉGET AHELYETT, HOGY KIKERÜLNÉNK — ugyanaz az
// út, amit a QUIC választott. Minden újraküldés **sorszámot** kap (`k`), a nyugta pedig
// **visszamondja**. Így **minden nyugta pontosan megmondja, melyik küldésre felel**, tehát
// **minden nyugtából lehet mintát venni** — az újraküldöttekből is.
//
// ⭐ ÉS EZ NEM KERÜL BÁJTOT A SZOKÁSOS ESETBEN (6. szabály): az **első** küldésen NINCS `k`
// mező, és a `k` nélküli nyugta épp azt jelenti, hogy *az elsőre felel*. A többletbájt csak
// **újraküldéskor** jelenik meg — vagyis ott, ahol amúgy is baj van. *Egy „nincs újdonság"
// kör továbbra is 334 bájt.*
//
// ⚠️⚠️ MIÉRT KELLETT EZ — MÉRÉSBŐL (2026-09-14): a kapcsolat **első** darabjánál az ablak
// még üres, tehát a gyors újraküldésnek nincs mire támaszkodnia; ott *megint stop-and-wait
// van*, vak 1000 ms-os kezdőértékkel. 50% veszteségnél ez felduplázódva elnyelte a teljes
// 30 mp-es keretet: **a csere 39 másodpercig tartott, ötből kétszer feladta.** ⭐ Pontos
// mintákkal az első újraküldés nyugtája **azonnal helyrerakja** a becslést.
//
// ⭐⭐ ÉS A MUNKAMEGOSZTÁS, AMI EZT BIZTONSÁGOSSÁ TESZI: az óra dolga **egyetlen darab**
// pótlása; a **torlódás** válasza az ablak mérete lesz (D67 / 4. darab). Ezért a visszalépés
// **darabonkénti**, nem kapcsolat-szintű: egy beragadt darab nem fojtja meg a többit.
// ⛔ Ez az ablak nélkül nem lett volna igaz — ezért is bukott meg az első nekifutás.
//
// ⚠️ NEM állapot-befolyásoló állandók (D66): ha nálam más az RTO, **ugyanazt az állapotot
// számoljuk** — csak máskor küldök újra.

// ⭐⭐ AMÍG EGYETLEN MINTÁNK SINCS. ⚠️ Az RFC 6298 itt 1 másodpercet mond — a TCP-nek
// megteheti, mert ő a **kézfogásból** (SYN/SYN-ACK) már kap egy mintát, MIELŐTT adatot
// küldene. A mi vonalunknak nincs külön kézfogása: az első darab **maga a kézfogás**.
//
// ⛔ És a 2026-09-14-i mérés megmutatta, mit jelent ez: 1000 ms-ból indulva, veszteség
// mellett duplázva a **kapcsolat első darabja** elnyelte a teljes keretet — pedig a vonal
// valódi oda-vissza ideje 1 ms volt. *Egy vak tipp ezerszeres tévedése minden további
// duplázásba beleszorzódik.*
//
// ⭐ Ezért az első érték **próbálkozás, nem ígéret**: 300 ms lefedi a valódi vonalak nagy
// részét, és aki ennél lassabb, annak **egyetlen fölösleges másolat** az ára — ⭐⭐ ami a
// pontos mintavétel óta nem is kár: *az a másolat hozza meg a mérést hamarabb.* A rossz
// irányú tévedés viszont **egy teljes másodperc** egy olyan cserében, ami tipikusan
// **egyetlen oda-vissza, 334 bájt**. *Az aszimmetria egyértelmű.*
const RTO_KEZDO = 300;
const RTO_MIN = 100;           // alsó korlát az óra-felbontás és a téves újraküldés ellen
const RTO_MAX = 60000;         // felső korlát: egy nagyon rossz vonalon se pörögjünk
const SIMITAS = 0.125;         // α — a simított átlag súlya (1/8)
const SZORAS_SULY = 0.25;      // β — az ingadozás súlya (1/4)

// ⭐ A FELADÁS IDŐALAPÚ, NEM DARABSZÁM-ALAPÚ. Korábban „20 próbálkozás" volt — ⚠️ de a 16.
// mérés szerint **soha nem is értük el**. Visszalépő újraküldésnél ráadásul a darabszám
// semmit nem mond: 20 próbálkozás lehet 2 másodperc és fél óra is. *Az idő az, ami számít.*
const FELADAS_IDO = 30000;

// ===================================
// ⭐⭐⭐ AZ ABLAK — több darab úton egyszerre (D67 / 3. darab, 2026-09-14)
// ===================================
//
// ⛔ MIÉRT: a vonal eddig **egy darabot** tartott úton, és megvárta a nyugtát. A 16. mérés
// szerint ez **1 ms/csomag késleltetésnél 25 KB/s** — mert 64 KB az ~87 oda-vissza,
// egymás után. *A szelet méretének növelése ezen nem segít: 87 darab az 87 oda-vissza,
// akár egy szeletben van, akár nyolcban.*
//
// ⭐⭐⭐ AZ ABLAK MÉRETE ALKALMAZKODIK — AIMD (D67 / 4. darab, 2026-09-14)
//
// ⛔⛔ MIÉRT NEM MARADHAT RÖGZÍTETT SZÁM? A **9. szabály** kérdése: *„ez mit csinál
// egymilliárd e-embernél?"* — ott a vonalak hat nagyságrendet fognak át. Egy rögzített 16
// egy lassú mobilvonalon **túl sok** (mi okozzuk a torlódást), egy gyors vonalon **kevés**.
// ⭐ És a **torlódás válasza szerkezetileg ide tartozik**, nem az órához: az óra dolga
// *egyetlen darab* pótlása, az ablaké az **ütem**.
//
// ⭐ A SZABÁLY A BEVÁLT AIMD (additive increase, multiplicative decrease):
//
//   · siker   → **lassan nő** (+1 darab körönként) — óvatosan tapogatjuk a határt;
//   · vesztés → **felére csökken** — azonnal enged.
//
// ⚠️ **Az aszimmetria a lényeg, nem mellékhatás:** így a vonalat megosztó felek
// **egyensúlyba kerülnek** egymással ahelyett, hogy a legagresszívabb vinné el az egészet.
// *Ez a „nem mi leszünk a baj" szabály matematikai alakja.*
//
// ⛔ EGY VESZTÉS-ESEMÉNY = EGY FELEZÉS. Egy elveszett körben több darab is hiányozhat; ha
// mindegyikre feleznénk, egyetlen zavar **a földbe döngölné** az ablakot. Ezért a felezés
// után a **már úton lévőkre** nem csökkentünk újra (`csokkentesHatar`).
//
// ⚠️ NEM állapot-befolyásoló állandók (D66): ha nálam más az ablak, **ugyanazt az állapotot
// számoljuk** — csak más ütemben ér oda.
const ABLAK_KEZDO = 16;
const ABLAK_MIN = 1;           // ⛔ egy alá nem mehet: az a némaság
const ABLAK_MAX = 64;

// ⚠️⚠️ A FOGADÓ MINDIG A FELSŐ KORLÁTIG fogad el, nem a küldő PILLANATNYI ablakáig — mert a
// két oldal ablaka külön él, és a küldőé nőhet. *Ha a fogadó a sajátjához mérne, egy megnőtt
// küldő-ablak darabjait némán eldobná, és a csere beragadna.*
const FOGADO_ABLAK = ABLAK_MAX;

// ⭐⭐ GYORS ÚJRAKÜLDÉS — a MÁSODIK veszteség-jel, az órán kívül.
//
// ⛔⛔ EZ AZ, AMI NÉLKÜL AZ ABLAKNAK NINCS ÉRTELME, és ezt egy mérés tanította meg
// (2026-09-14): stop-and-wait mellett **az óra az EGYETLEN veszteség-jel**, ezért egy
// óvatos óra végzetes. ⭐ Ablakkal viszont ha egy KÉSŐBBI darabot már nyugtáztak, az
// **bizonyíték**, hogy a korábbi elveszett — a hálózat ugyanis továbbvitte azt, ami utána
// indult. *Nem kell megvárni az órát; a nyugta maga megmondja.*
//
// ⚠️ MIÉRT HÁROM, ÉS NEM EGY? Mert a csomagok **sorrendet is cserélhetnek** ingadozó
// vonalon (a 16. mérés ezt is méri). Egyetlen „előrébb járó" nyugta tehát még nem vesztés —
// három már az. *Ugyanaz a szám, amit a TCP is használ, és ugyanazért.*
const GYORS_KUSZOB = 3;

// Ennyi ideig tűrjük, hogy a másik fél NE SZÓLJON SEMMIT. Ugyanaz a 10 másodperc, amit a
// `csereVonalon` használ TCP-n — a hívó felülírhatja (`beallitas.varakozasiIdo`).
const TETLENSEG_ALAP = 10000;

// ⭐ AZ UTÓHANG: a lezárás után még ennyi ideig felelünk a másik fél ISMÉTELT darabjaira.
//
// ⛔ Nem díszítés — mérve (2026-09-14): enélkül a 30%-os vesztésű csere beragad, mert a
// lezárás pillanatában úton lévő utolsó darab nyugtáját nincs ki pótolja. ⚠️ Viszont nem is
// örökre: a randevúnál fájlonként új kapcsolat nyílik ugyanazon a foglalaton, és a lezárt
// példányok nem gyűlhetnek ott korlátlanul. *Két másodperc bőven fedi az újraküldés
// ütemét (RTO), és a következő fájl átvitelénél már csend van.*
const UTOHANG = 2000;

/**
 * TCP-foglalatnak látszó objektum, ami alatta UDP-t használ.
 *
 * @param {import('node:dgram').Socket} halo - a MÁR MEGNYITOTT (átfúrt) foglalat
 * @param {string} tarsCim - a másik KÜLSŐ címe
 * @param {number} tarsPort - a másik KÜLSŐ portja
 * @returns {Object} foglalat-szerű objektum a `parbeszed` számára
 */
export function udpKapcsolat(halo, tarsCim, tarsPort) {
  console.log('udpKapcsolat - KEZDÉS', { tarsCim, tarsPort });

  const figyelok = { data: [], error: [], end: [], close: [] };
  const jelez = (nev, ertek) => { for (const f of figyelok[nev] ?? []) f(ertek); };

  // ----- KÜLDÉS: egyszerre egy darab, nyugtára várva -----
  const sor = [];                 // a még el nem küldött darabok
  let kovetkezoSorszam = 1;
  // ⭐ ÚTON LÉVŐ DARABOK — sorszám → { szoveg, ismetles, ora, magasabbNyugtak }
  // *Egy darab helyett legfeljebb `ABLAK` darab; ettől lesz a vonal használható.*
  const uton = new Map();
  let lezarva = false;

  // ----- ⭐ AZ ODA-VISSZA IDŐ BECSLÉSE (RFC 6298) -----
  //
  // `null`, amíg egyetlen TISZTA mintánk sincs — addig az `RTO_KEZDO` szól. *Nem tippelünk
  // a vonal sebességére; megvárjuk, amíg megmondja.*
  let srtt = null;                // simított oda-vissza idő
  let rttvar = null;              // az ingadozása
  let rto = RTO_KEZDO;            // ennyit vár egy ÚJ darab a nyugtára

  // ----- ⭐ AZ ALKALMAZKODÓ ABLAK (AIMD) -----
  let ablak = ABLAK_KEZDO;        // hány darab lehet egyszerre úton (törtszám is lehet)
  let csokkentesHatar = 0;        // eddig a sorszámig már elkönyveltünk egy vesztés-eseményt
  let csokkentesOka = null;       // melyik darab miatt csökkentettünk utoljára
  let ablakCsokkentesElott = 0;   // …és mekkora volt előtte

  /**
   * ⛔ VESZTÉS TÖRTÉNT — az ablak felére csökken.
   *
   * ⚠️ De **körönként csak egyszer**: egy elveszett körben több darab is hiányozhat, és ha
   * mindegyikre feleznénk, egyetlen zavar **a földbe döngölné** az ablakot.
   */
  const vesztesEsemeny = (sorszam) => {
    if (sorszam < csokkentesHatar) return;
    ablakCsokkentesElott = ablak;
    csokkentesOka = sorszam;
    ablak = Math.max(ABLAK_MIN, ablak / 2);
    csokkentesHatar = kovetkezoSorszam;
  };

  /**
   * ⭐ SIKER — az ablak LASSAN nő: körönként egy darabbal.
   *
   * ⚠️ Nyugtánként `1/ablak`-ot adunk hozzá, mert egy kör annyi nyugtából áll, amekkora az
   * ablak. *Így a növekedés „egy darab körönként" marad — nem gyorsul be akkor, amikor az
   * ablak már amúgy is nagy.*
   */
  const sikerEsemeny = () => {
    ablak = Math.min(ABLAK_MAX, ablak + 1 / ablak);
  };

  /**
   * ⭐⭐⭐ A TÉVES FELEZÉS VISSZAVONÁSA — és ezt a mérés kényszerítette ki (2026-09-14).
   *
   * ⛔ Mérve: `1 ms ± 20 ms` szórásnál, **nulla veszteség mellett** az ablak feleződött, és
   * a sebesség 234 → 106 KB/s-ra esett. Az ok: a **sorrend-csere** hármas „előrébb járó"
   * nyugtát ad, amit a gyors újraküldés vesztésnek olvas. *A vonal nem volt torlódott —
   * csak rendetlen.*
   *
   * ⭐ ÉS VAN RÁ BIZONYÍTÉKUNK, INGYEN: a nyugta **visszamondja, melyik küldésre felel**
   * (1. darab). Ha az **ELSŐ** küldésre jön nyugta egy olyan darabra, amit közben
   * újraküldtünk, akkor az eredeti **megérkezett** — tehát nem veszett el, csak késett.
   * *Ilyenkor visszaadjuk az ablakot.*
   *
   * ⚠️ Csak a LEGUTÓBBI csökkentést vonjuk vissza, és csak ha épp az a darab cáfolta meg —
   * *a bizonyíték arról szól, nem általában a vonalról.*
   */
  const tevesFelezes = (sorszam) => {
    if (csokkentesOka !== sorszam) return;
    ablak = Math.min(ABLAK_MAX, ablakCsokkentesElott);
    csokkentesOka = null;
  };

  /** Az RTO újraszámolása a becslésből — ez oldja fel a darabonkénti visszalépést is. */
  const rtoUjraszamol = () => {
    if (srtt === null) return;
    // ⭐ A négyszeres szórás a ráhagyás: egy ingadozó vonalon türelmesebbek leszünk.
    rto = Math.min(RTO_MAX, Math.max(RTO_MIN, Math.round(srtt + 4 * rttvar)));
  };

  /** Egy TISZTA minta érkezett (nem újraküldött darabról) — beépítjük. */
  const mintaErkezett = (R) => {
    if (srtt === null) {
      srtt = R;
      rttvar = R / 2;                                   // az első mintánál ez a szokás
    } else {
      rttvar = (1 - SZORAS_SULY) * rttvar + SZORAS_SULY * Math.abs(srtt - R);
      srtt = (1 - SIMITAS) * srtt + SIMITAS * R;
    }
    rtoUjraszamol();
  };

  let bajtKuldott = 0, bajtKapott = 0;

  // ----- A TÉTLENSÉGI ÓRA -----
  //
  // ⚠️ ITT KORÁBBAN EGY ÜRES `setTimeout` ÁLLT, ezzel az indoklással: „az újraküldés-korlát
  // betölti ezt a szerepet". NEM tölti be. Az újraküldés-korlát csak akkor véd, ha van
  // csomagunk ÚTON — amikor VÁRUNK a másikra, nincs se csomag, se időzítő, se határidő.
  // TCP-n ezt a `kapcsolat.setTimeout(varakozasiIdo, …)` fogta meg; itt kézzel kell.
  //
  // ⭐ A MÉRCE: MIT SZÁMÍT ÉLETJELNEK? Csak azt, amit TŐLE KAPUNK. A saját újraküldésünk
  // nem életjel — ha az nullázná az órát, egy halott társ mellett örökre pörögnénk.
  let tetlensegHatar = 0;
  let tetlensegOra = null;
  let tetlensegVisszahivas = null;

  const oratUjraindit = () => {
    if (!tetlensegHatar || lezarva) return;
    if (tetlensegOra) clearTimeout(tetlensegOra);
    tetlensegOra = setTimeout(() => {
      tetlensegOra = null;
      if (tetlensegVisszahivas) tetlensegVisszahivas();
    }, tetlensegHatar);
  };

  const oratMegallit = () => {
    if (tetlensegOra) { clearTimeout(tetlensegOra); tetlensegOra = null; }
  };

  // ----- A KIÜRÍTÉS -----
  //
  // Aki a `kiurites()`-re vár, ezt a függvényt kapja vissza. Két helyen sül el: amikor az
  // utolsó darab is nyugtázva lett (siker), és amikor feladtuk (kudarc) — harmadik eset
  // nincs, ezért nem tud beragadni.
  let uritesreVar = null;

  const uritestJelez = (sikerult) => {
    if (!uritesreVar) return;
    const jelzo = uritesreVar;
    uritesreVar = null;
    jelzo(sikerult);
  };

  const csomagot = (targy) => {
    const bajtok = Buffer.from(JSON.stringify(targy), 'utf8');
    bajtKuldott += bajtok.length;
    halo.send(bajtok, tarsPort, tarsCim, (hiba) => {
      if (hiba) console.warn('udpKapcsolat - küldés bukott', { ok: hiba.message });
    });
  };

  /** Feladjuk ezt a darabot — de HIBAKÉNT, nem csendben. A néma nem-esemény a legrosszabb. */
  const feladas = (sorszam) => {
    for (const t of uton.values()) clearTimeout(t.ora);
    uton.clear();
    jelez('error', new Error('a másik fél nem nyugtázta a ' + sorszam + '. darabot '
      + Math.round(FELADAS_IDO / 1000) + ' másodperc alatt'));
    uritestJelez(false);              // aki a kiürítésre vár, itt is kapjon választ
  };

  /**
   * Egy darab órájának felhúzása a MOSTANI `rto`-val.
   *
   * ⚠️ `setTimeout`, nem `setInterval` — mert az idő minden körben MÁS lehet: a becslés
   * finomodik, és időtúllépésnél **duplázódik**. *Egy állandó ütemű óra nem tudna erről.*
   */
  const orat_felhuz = (sorszam, tetel) => {
    tetel.ora = setTimeout(() => {
      tetel.ora = null;
      if (lezarva || !uton.has(sorszam)) return;

      // ⛔ IDŐALAPÚ FELADÁS — de HIBAKÉNT, nem csendben.
      if (Date.now() - tetel.kezdet > FELADAS_IDO) return feladas(sorszam);

      // ⭐⭐⭐ AZ ÓRÁRA CSAK A LEGRÉGEBBI DARAB MEGY ÚJRA — ahogy a TCP is teszi.
      //
      // ⛔⛔ Ez is mérésből derült ki (2026-09-14): egy 400 ms-os vonalon a 300 ms-os
      // kezdőértékkel az EGÉSZ ablak egyszerre járt le, és **mind a kilenc darab
      // fölöslegesen ment ki újra** (×1,9 pazarlás). *Kilenc szonda ugyanarra a kérdésre.*
      //
      // ⭐ A MUNKAMEGOSZTÁS: az óra dolga az **út megszondázása** — ahhoz egyetlen darab
      // elég, és a nyugtája **mintát is hoz**, ami az egész ablakot helyrerakja. Egy-egy
      // darab elvesztét nem az óra veszi észre, hanem a **gyors újraküldés** (a nála
      // későbbiek nyugtái). *Két jel, két feladat — és egyik sem csinálja a másikét.*
      // ⚠️⚠️ ÉS EZ CSAK AKKOR ÁLL, AMÍG NINCS MÉRÉSÜNK — ezt is egy mérés igazította ki.
      // Egy **vak** óra (`srtt === null`) puszta tipp: abból egy szonda elég, kilenc nem.
      // Egy **mért** óra viszont már bizonyíték ARRÓL a darabról, tehát a saját darabját
      // jogosan küldi újra. *Rászűkítés nélkül 15% veszteségnél 430 ms-ról 8177 ms-ra
      // romlott a fájl-átvitel: a tail-darabok a legrégebbire vártak.*
      if (srtt === null) {
        let legregebbi = Infinity;
        for (const sz of uton.keys()) if (sz < legregebbi) legregebbi = sz;
        if (sorszam !== legregebbi) return orat_felhuz(sorszam, tetel);
      }

      // ⭐⭐ VISSZALÉPŐ DUPLÁZÁS, DARABONKÉNT. Ha egy darab elveszett, ennél a darabnál
      // türelmesebbek leszünk — de a többit nem büntetjük vele. *A torlódás válasza az
      // ablak dolga lesz (4. darab), nem az óráé.*
      // ⛔⛔ ÉS A VISSZALÉPÉST A FELADÁSI KERET KORLÁTOZZA — mert különben a két szabály
      // ELLENTMOND egymásnak (mérve, 2026-09-14): 50% veszteségnél a visszalépés 3,2
      // másodperces várakozásokig nőtt, miközben a keretből már alig maradt. *Egy olyan
      // várakozás, ami után nem fér bele újabb próbálkozás, nem türelem, hanem **garantált
      // bukás türelemnek öltözve**.* ⭐ Ezért sosem várunk többet, mint a maradék keret
      // negyede: így a keret mindig legalább néhány próbálkozást jelent.
      const maradek = FELADAS_IDO - (Date.now() - tetel.kezdet);
      tetel.rto = Math.min(RTO_MAX, tetel.rto * 2, Math.max(RTO_MIN, maradek / 4));

      // ⛔ AZ IDŐTÚLLÉPÉS IS VESZTÉS — az ablak enged. *Ez a súlyosabb jel a kettő közül:
      // itt nemcsak egy darab veszett el, hanem semmi nem jött vissza helyette.*
      vesztesEsemeny(sorszam);

      darabotKuld(sorszam, tetel);
    }, tetel.rto);
  };

  /**
   * Egy darab (újra)küldése — és az órája felhúzása.
   *
   * ⭐ MINDEN KÜLDÉS IDEJÉT ELTESSZÜK (`kuldesek`), és az újraküldés **sorszámot** visz
   * magával (`k`). A nyugta ezt visszamondja, tehát pontosan tudni fogjuk, melyik küldésre
   * felel. ⚠️ Az ELSŐ küldés szándékosan `k` NÉLKÜL megy — így a szokásos eset **egyetlen
   * bájttal sem nő** (6. szabály), és a `k` nélküli nyugta épp azt jelenti: „az elsőre".
   */
  const darabotKuld = (sorszam, tetel) => {
    const hanyadik = tetel.kuldesek.length;      // 0 = az első küldés
    tetel.kuldesek.push(Date.now());
    csomagot(hanyadik === 0
      ? { sz: sorszam, a: tetel.szoveg }
      : { sz: sorszam, a: tetel.szoveg, k: hanyadik });

    // ⭐ A gyors újraküldés számlálója nullázódik: innen új bizonyíték kell.
    tetel.magasabbNyugtak = 0;
    if (tetel.ora) clearTimeout(tetel.ora);
    orat_felhuz(sorszam, tetel);
  };

  /**
   * ⭐ ANNYI DARABOT INDÍTUNK, AMENNYI AZ ABLAKBA FÉR.
   *
   * ⚠️ Minden darabnak SAJÁT órája van, és saját visszalépése — így egy beragadt darab
   * nem fojtja meg a többit. *A kapcsolat-szintű visszalépés épp ezt tette, és emiatt
   * bukott meg az első nekifutás (lásd a fenti szakaszt).*
   */
  const kovetkezotKuld = () => {
    while (!lezarva && sor.length && uton.size < Math.floor(ablak)) {
      const sorszam = kovetkezoSorszam++;
      const most = Date.now();
      const tetel = {
        szoveg: sor.shift(), magasabbNyugtak: 0, ora: null,
        kuldesek: [],          // ⭐ minden küldés ideje — ebből lesz a PONTOS minta
        kezdet: most,          // innen számít a feladási határidő
        rto                    // ⭐ a kapcsolat MOSTANI becslésével indul
      };
      uton.set(sorszam, tetel);
      darabotKuld(sorszam, tetel);
    }
  };

  /**
   * ⭐⭐ GYORS ÚJRAKÜLDÉS: egy KÉSŐBBI darab nyugtája bizonyíték a korábbi vesztésére.
   *
   * A hálózat továbbvitte azt, ami később indult — tehát a korábbi nem „úton van", hanem
   * **elveszett**. ⚠️ De csak `GYORS_KUSZOB` ilyen jel után lépünk, mert a sorrend-csere
   * önmagában még nem vesztés.
   */
  const gyorsUjrakuldes = (nyugtazott) => {
    for (const [sorszam, tetel] of uton) {
      if (sorszam >= nyugtazott) continue;
      tetel.magasabbNyugtak++;
      if (tetel.magasabbNyugtak >= GYORS_KUSZOB) {
        vesztesEsemeny(sorszam);       // ⛔ bizonyított vesztés: az ablak enged
        darabotKuld(sorszam, tetel);
      }
    }
  };

  // ----- FOGADÁS: sorrendbe rakva, ismétlést elnyelve -----
  let vartSorszam = 1;
  const varakozo = new Map();     // sorszám → szöveg (ami előbb ért ide, mint kellett)

  const uzenetErkezett = (bajtok, felado) => {
    // ⚠️ Csak attól fogadunk el, akivel beszélünk. Ez NEM bizalom (3. szabály) — az
    // eseményeket úgyis az `esemenyMentese` ellenőrzi —, csak azért, hogy egy téves
    // csomag ne zavarja össze a sorszámozást.
    if (felado.address !== tarsCim || felado.port !== tarsPort) return;

    oratUjraindit();                   // ÉLETJEL: tőle jött valami, tehát él
    bajtKapott += bajtok.length;
    let uzenet;
    try { uzenet = JSON.parse(bajtok.toString('utf8')); } catch { return; }

    // Nyugta érkezett: mehet a következő darab.
    if (Number.isInteger(uzenet.ny)) {
      const tetel = uton.get(uzenet.ny);
      if (tetel) {
        clearTimeout(tetel.ora);
        uton.delete(uzenet.ny);

        // ⭐⭐ ITT SZÜLETIK A MÉRÉS — és MINDEN nyugtából, mert tudjuk, melyikre felel.
        //
        // ⭐ A nyugta visszamondja a küldés sorszámát (`k`); ha nincs benne, az az ELSŐ
        // küldésre felel. Így nincs kétértelműség, tehát Karn szabályára sincs szükség:
        // az újraküldött darab nyugtája **ugyanolyan jó minta**, mint a többi.
        const hanyadik = Number.isInteger(uzenet.k) ? uzenet.k : 0;
        const mikor = tetel.kuldesek[hanyadik];
        if (mikor !== undefined) mintaErkezett(Date.now() - mikor);

        // ⭐⭐ HA AZ ELSŐ KÜLDÉSRE JÖTT A NYUGTA, de közben újraküldtük — akkor az eredeti
        // MEGÉRKEZETT, csak késett. A vesztés-jel téves volt: az ablakot visszaadjuk.
        if (hanyadik === 0 && tetel.kuldesek.length > 1) tevesFelezes(uzenet.ny);

        // ⭐ A darab MEGÉRKEZETT — az ablak óvatosan tapogat tovább.
        sikerEsemeny();
        // ⭐⭐⭐ A NYUGTA BIZONYÍTJA, HOGY AZ ÚT ÉL — tehát a többiek visszalépését FELOLDJUK.
        //
        // ⛔⛔ Ezt is mérés kényszerítette ki (2026-09-14): a beragadt darab visszalépése
        // darabonként duplázódott, és **soha nem oldódott fel**, pedig közben más darabok
        // nyugtái érkeztek. 50% veszteségnél a csere így **34 másodpercig** tartott.
        //
        // ⭐ A visszalépés célja a **halott vagy torlódott** út kímélése. Ha épp most jutott
        // át forgalom, ez a premissza **hamis** — nincs mit kímélni. *A TCP is a nyugtánál
        // állítja vissza az óráját; nálunk csak darabonként kell megtenni.*
        for (const [sz, t] of uton) {
          if (t.rto <= rto) continue;
          t.rto = rto;
          if (t.ora) { clearTimeout(t.ora); orat_felhuz(sz, t); }
        }

        // ⭐ Aztán a gyors-jel: a NÁLA korábbiak most kaptak egy bizonyítékot a vesztésre.
        gyorsUjrakuldes(uzenet.ny);
        kovetkezotKuld();
        // Ha se úton, se sorban nincs több — mindent kiírtunk, a lezárás mehet.
        if (!uton.size && !sor.length) uritestJelez(true);
      }
      return;
    }

    if (!Number.isInteger(uzenet.sz) || typeof uzenet.a !== 'string') return;

    // ⭐ ISMÉTLÉS: nyugtázzuk — a nyugta is elveszhetett —, de nem tároljuk újra.
    // ⭐ A nyugta VISSZAMONDJA a küldés sorszámát — ettől lesz a minta pontos a túloldalon.
    const nyugtaz = () => csomagot(Number.isInteger(uzenet.k)
      ? { ny: uzenet.sz, k: uzenet.k }
      : { ny: uzenet.sz });

    if (uzenet.sz < vartSorszam) { nyugtaz(); return; }

    // ⛔⛔ AZ ABLAKON TÚLIT NEM FOGADJUK EL, ÉS NEM IS NYUGTÁZZUK (2026-09-14).
    //
    // ⚠️ Itt korábban **korlát nélküli** térkép állt: egy gyors vagy rosszindulatú társ
    // tetszőleges sorszámokat küldhetett, és a memóriánk határtalanul nőtt. *Ez ma is
    // defekt volt, nem csak skálázási kérdés.* Az ablak megadja a természetes korlátot:
    // egy tisztességes társtól sosem jön `ABLAK`-nál messzebbi darab.
    //
    // ⛔ ÉS NEM NYUGTÁZZUK, mert azt hazudná, hogy megvan: a küldő továbblépne, a darab
    // pedig örökre hiányozna. *Amit eldobtunk, arról hallgatni kell — a hallgatás itt
    // igazat mond, a nyugta hazudna.*
    if (uzenet.sz >= vartSorszam + FOGADO_ABLAK) return;

    varakozo.set(uzenet.sz, uzenet.a);
    nyugtaz();

    // Ami sorrendben megvan, azt továbbadjuk a párbeszédnek.
    while (varakozo.has(vartSorszam)) {
      const szoveg = varakozo.get(vartSorszam);
      varakozo.delete(vartSorszam);
      vartSorszam++;
      jelez('data', szoveg);
    }
  };

  halo.on('message', uzenetErkezett);

  return {
    remoteAddress: tarsCim,
    remotePort: tarsPort,
    get bytesWritten() { return bajtKuldott; },
    get bytesRead() { return bajtKapott; },

    setEncoding() { /* mi mindig szöveget adunk tovább */ },

    /**
     * Tétlenségi határidő: ha ennyi ideig SEMMI nem jön a másiktól, szólunk.
     * Úgy viselkedik, mint a `net.Socket.setTimeout` — a `csereUdpResen` ugyanúgy
     * használja, mint a `csereVonalon` a TCP-set.
     */
    setTimeout(ezredmasodperc, visszahivas) {
      tetlensegHatar = ezredmasodperc;
      tetlensegVisszahivas = visszahivas;
      oratUjraindit();
      return this;
    },

    /**
     * Megvárja, amíg minden elküldött darabot NYUGTÁZTAK.
     *
     * ⭐ Ez a TCP `end()`-jének kiírás-része, kézzel. A lezárás előtt ezt meg kell várni,
     * különben az utolsó üzenetünk némán elveszhet — és a másik fél örökre várja.
     *
     * @returns {Promise<boolean>} igaz, ha minden kiment; hamis, ha feladtuk
     */
    kiurites() {
      if (lezarva || (!uton.size && !sor.length)) return Promise.resolve(true);
      return new Promise((teljesites) => { uritesreVar = teljesites; });
    },

    on(nev, figyelo) {
      if (figyelok[nev]) figyelok[nev].push(figyelo);
      return this;
    },
    once(nev, figyelo) { return this.on(nev, figyelo); },
    removeAllListeners(nev) { if (figyelok[nev]) figyelok[nev] = []; return this; },

    /** A párbeszéd ezzel küld — soronként egy JSON-üzenet, pont mint a TCP-n. */
    write(szoveg) {
      for (let i = 0; i < szoveg.length; i += DARAB_MERET) {
        sor.push(szoveg.slice(i, i + DARAB_MERET));
      }
      kovetkezotKuld();
      return true;
    },

    // ⚠️ A LEZÁRÁS ELDOBJA, AMI MÉG ÚTON VAN — ezért kell ELŐTTE `kiurites()`.
    end() {
      lezarva = true;
      // ⭐ MINDEN úton lévő darab óráját megállítjuk — ablakkal ezekből több is lehet.
      for (const tetel of uton.values()) clearTimeout(tetel.ora);
      uton.clear();
      oratMegallit();

      // ⛔⛔⛔ A FIGYELŐT LEVESSZÜK — DE CSAK AZ UTÓHANG UTÁN (2026-09-14).
      //
      // ⚠️⚠️ EZ EGY CÁFOLT ÁLLÍTÁSOM HELYE, ezért marad itt kimondva. Elsőre AZONNAL
      // levettem a figyelőt a lezárásnál, ezzel az érveléssel: *„egy lezárt kapcsolat ne
      // beszéljen"* — a randevúnál ugyanis egy foglalaton **egymás után több** kapcsolat
      // nyílik, és a lezárt példány az új folyam darabjaira is nyugtázott volna.
      //
      // ⛔ A MÉRÉS MEGCÁFOLT: a 30%-os vesztésű, ötszörös rontás-próba **elbukott tőle**.
      // A lezárt példány nyugtázása ugyanis **nem pazarlás, hanem FUNKCIÓ**: a másik fél
      // utolsó darabja épp a lezárás pillanatában lehet úton, és ha a mi nyugtánk elveszett,
      // **ő újraküldi** — ilyenkor a mi lezárt példányunk ismétlésként **pótolja a nyugtát**.
      // *Enélkül ő a tétlenségi órájáig vár: pontosan az a holtpont, amit a 2026-08-30-i
      // mérés megtalált.*
      //
      // ⭐ EZÉRT UTÓHANG: a lezárás után még felelünk egy darabig, aztán elhallgatunk. Így
      // mindkét igény teljesül — az elveszett nyugta pótolható, a lezárt példányok viszont
      // nem gyűlnek a foglalaton (a randevúnál fájlonként egy nyílik).
      //
      // ⚠️ ÉS AMI MIATT A DUPLIKÁLT NYUGTA NEM HAZUG: amíg a régi figyelő él, az ÚJ is él —
      // a `halo` **mindkettőnek** odaadja a csomagot. Vagyis a régi példány nyugtája arra
      // felel, ami tényleg megérkezett; a küldő az első nyugtánál kiveszi a darabot az
      // `uton`-ból, a többit elnyeli.
      setTimeout(() => halo.off?.('message', uzenetErkezett), UTOHANG).unref?.();

      uritestJelez(false);             // ha valaki mégis a kiürítésre várna, ne ragadjon be
    },

    /** Mint a `net.Socket.destroy(hiba)`: előbb hiba, aztán close — a `parbeszed` így várja. */
    destroy(hiba) {
      this.end();
      if (hiba) jelez('error', hiba);
      jelez('close');
    }
  };
}

/**
 * Lefuttatja a TELJES cserét egy már átfúrt UDP-résen.
 *
 * ⭐ Ez a pajzsfúrás jutalma: a megnyílt lyukon azonnal mehetnek az események, anélkül
 * hogy bármelyik routeren bármit beállítottunk volna.
 *
 * @param {import('node:dgram').Socket} halo - az átfúráshoz használt, NYITVA TARTOTT foglalat
 * @param {string} tarsCim
 * @param {number} tarsPort
 * @param {Object} tar
 * @param {string} koino
 * @param {Object} [beallitas] - amit a `parbeszed` kap (pl. hirdetettCimek), és
 *   `varakozasiIdo`: ennyi néma ezredmásodperc után feladjuk (alap: 10 000)
 */
/**
 * ⭐⭐ EGY FÁJL ELHOZÁSA AZ ÁTFÚRT RÉSEN (5.7 / C) — a randevú.
 *
 * ⛔⛔ EZ AZ AZ ESET, AMIKOR EGYIK FÉL SEM TUD FOGADNI. Ha az egyik készülék nyitva tart
 * egy kaput (postaláda), a fájl TCP-n is átjön — de két zárt router mögött egyik sem
 * kezdeményezhet befelé. ⭐ A **pajzsfúrás** oldása ugyanaz, mint a rendes cserénél:
 * mindkét fél **kifelé kopog**, és a két rés találkozik.
 *
 * ⭐ ÉS ITT TÉRÜL MEG AZ 1. SZABÁLY: a `fajlHozatala` **kapja** a kapcsolatot, nem ő
 * nyitja — ezért ugyanaz a kód fut TCP-n és az átfúrt résen, **egyetlen sor változtatás
 * nélkül**. *(A fájl-átvitel logikája nem is tudja, melyiken beszél.)*
 *
 * ⚠️ EZ A BEKEZDÉS 2026-09-14-IG AZT ÍRTA, hogy a vonal „egyszerre egy darabot tart úton
 * (stop-and-wait)", és hogy „ha kevés lesz, a vonalnak ablak kell". **Kevés lett, és az
 * ablak megépült** (D67): 16 darab úton, gyors újraküldés, mért újraküldési idő, AIMD.
 * A számok a `meres/eredmenyek.md` 20–22. mérésében. *A jóslat bevált — de a jelen időt
 * nem hagyhattuk rajta.*
 *
 * @param {Object} halo - a már átfúrt UDP-foglalat (a `pajzsfuras` adja)
 * @param {Object} blob - a fájl-tár
 * @returns {Promise<Object>} a `fajlHozatala` eredménye
 */
export async function fajlUdpResen(halo, tarsCim, tarsPort, blob, koino, lenyomat,
                                   beallitas = {}) {
  console.log('fajlUdpResen - KEZDÉS', { tarsCim, tarsPort, lenyomat });

  const varakozasiIdo = beallitas.varakozasiIdo ?? TETLENSEG_ALAP;
  const nyito = async () => {
    const kapcsolat = udpKapcsolat(halo, tarsCim, tarsPort);
    // ⚠️ A NÉMA TÁRS NEM RAGASZTHAT BE — ugyanaz az őr, mint a rendes UDP-cserénél.
    kapcsolat.setTimeout(varakozasiIdo, () => {
      kapcsolat.destroy(new Error('A másik fél nem válaszol (' + varakozasiIdo + ' ms)'));
    });
    return kapcsolat;
  };

  const eredmeny = await fajlHozatala(blob, koino, lenyomat, nyito, beallitas);
  console.log('fajlUdpResen - VÉGE', eredmeny);
  return eredmeny;
}

/**
 * ⭐⭐⭐ A FÁJL-RANDEVÚ (2026-09-14) — MINDKÉT FÉL KÉRHET, EGY FOGLALATON.
 *
 * ⛔⛔ MIÉRT KELLETT: a `fajlUdpResen` 2026-09-13 óta megvan és mérve van — de **senki nem
 * hívta** az éles kódból. A `pajzsfuro` parancs a résen lefuttatta az esemény-cserét, majd
 * azonnal bezárta a foglalatot; a fájlokat kizárólag a `fajlokElhozasa` hozta, az meg
 * TCP-t nyit. *Vagyis pontosan abban a helyzetben, amiért a pajzsfúrás létezik — két zárt
 * router, egyik fél sem tud fogadni —, az események átjöttek, a képek soha.*
 *
 * ===== ⛔ AMI A RÉSEN MÁS, MINT TCP-N: A SZEREP NEM ADÓDIK MAGÁTÓL =====
 *
 * TCP-n a szerep nyilvánvaló: aki kaput tart nyitva, az szolgál ki, aki csatlakozik, az kér.
 * ⚠️ A résen **nincs kapu és nincs elfogadás**: egy foglalat van és egy társ, a két fél
 * tökéletesen szimmetrikus. Ha mindkettő egyszerre kérne, **egyik sem szolgálna ki** —
 * mindkettő a tétlenségi órájáig várna, és semmi nem jönne át.
 *
 * ⭐⭐ ÉS EGYSZERRE CSAK EGY KAPCSOLAT ÉLHET A FOGLALATON: a `udpKapcsolat` a `halo`
 * minden csomagját feldolgozza, tehát két egyidejű példány összekeverné a sorszámozást.
 * *Ezért soros a randevú — és ez egyben Csaba 3. döntése is: társanként legfeljebb egy
 * átvitel.*
 *
 * ===== ⭐ A SZEREPET A KÉT KÜLSŐ CÍM DÖNTI EL, ÚJ ÜZENET NÉLKÜL =====
 *
 * A csere mindkét félnek megmondja a **saját** külső címét (`latlak` → `kivulrolIgyLatszom`),
 * a másikét pedig eleve ismeri — tehát mindkét gépen **ugyanaz a két szöveg** van meg, csak
 * fordított szerepben. Aki a kisebb, az kér előbb. ⭐ *Nem kellett hozzá új protokoll-üzenet:
 * a döntéshez szükséges adat már ott volt.*
 *
 * ⚠️ ÉS HA NEM TUDJUK ELDÖNTENI (a társ nem mondta meg, hogyan lát), akkor **kiszolgálunk,
 * nem kérünk** — a passzív oldal nem okoz ütközést. Ha mindkettőnél így van, egyik sem kap
 * semmit, de **egyik sem ragad be** (a tétlenségi óra zár), és a hívó megtudja, miért
 * (D19). *Romlás, nem törés.*
 *
 * ⚠️ A MÁSODIK KISZOLGÁLÓ FÁZIS TÜRELMESEBB (kétszeres), és ennek oka van: aki előbb kért,
 * annak a kérő fázisa üresen is véget érhet, és ilyenkor a két oldal órája versenyre kelne.
 * *A türelmetlenebb fél a kérő; a türelmesebb a kiszolgáló — így nem csúsznak szét.*
 *
 * @param {import('node:dgram').Socket} halo - az átfúrt, NYITVA TARTOTT foglalat
 * @param {string} tarsCim
 * @param {number} tarsPort
 * @param {Object} beallitas
 * @param {string|null} beallitas.sajatCim - 'cim:port', ahogy a társ lát kívülről
 * @param {string[]} beallitas.kerhetok - mely lenyomatok vannak meg NÁLA (a csere mondja meg)
 * @param {Object} beallitas.blob - a fájl-tár
 * @param {Object} beallitas.tar - az esemény-tár (a kiszolgáló párbeszédhez)
 * @param {string} beallitas.koino
 * @param {Function} [beallitas.fajlOlvas] - (lenyomat) → bájtok|null
 * @returns {Promise<{kesz: number, bukott: number, bajt: number, kiszolgalt: number,
 *                    szerep: 'kerek-elobb'|'kiszolgalok-elobb'|'nem-tudom'}>}
 */
export async function fajlRandevu(halo, tarsCim, tarsPort, beallitas = {}) {
  const {
    sajatCim = null, kerhetok = [], blob, tar, koino,
    fajlOlvas = null, korlat = Infinity,
    varakozasiIdo = TETLENSEG_ALAP, utana = () => {}
  } = beallitas;

  const ove = tarsCim + ':' + tarsPort;
  // ⭐ Szöveges összehasonlítás: ugyanaz a két szöveg van meg mindkét gépen, tehát a
  // döntés is ugyanaz — csak fordítva. ⚠️ Egyenlőségnél (elvileg lehetetlen) senki nem kezd.
  const tudjuk = typeof sajatCim === 'string' && sajatCim !== ove;
  const enKezdek = tudjuk && sajatCim < ove;
  const szerep = !tudjuk ? 'nem-tudom' : (enKezdek ? 'kerek-elobb' : 'kiszolgalok-elobb');

  console.log('fajlRandevu - KEZDÉS', { tarsCim, tarsPort, szerep, kerhetok: kerhetok.length });
  utana({ mi: 'SZEREP', szerep, sajatCim, tarsCim: ove });

  let kesz = 0, bukott = 0, bajt = 0, kiszolgalt = 0;

  /** ⭐ KÉRŐ FÁZIS: egyesével, mert a foglalaton egyszerre egy kapcsolat élhet. */
  const keroFazis = async () => {
    if (!tudjuk) return;                   // ⚠️ nem tudjuk, ki a soros — nem kérünk (lásd fent)
    for (const lenyomat of kerhetok) {
      try {
        const e = await fajlUdpResen(halo, tarsCim, tarsPort, blob, koino, lenyomat,
          { korlat, varakozasiIdo });
        if (e.kesz) { kesz++; bajt += e.bajt ?? 0; } else { bukott++; }
        utana({ mi: e.kesz ? 'MEGJOTT' : 'NEM-JOTT', lenyomat, ok: e.ok, bajt: e.bajt ?? 0 });
      } catch (hiba) {
        // ⚠️ EGY FÁJL BUKÁSA NEM DÖNTI EL A TÖBBIT — ugyanaz az elv, mint a `tarsak.js`-nél.
        bukott++;
        utana({ mi: 'NEM-JOTT', lenyomat, ok: hiba.message, bajt: 0 });
      }
    }
  };

  /**
   * ⭐ KISZOLGÁLÓ FÁZIS: amíg kér, adunk; ha `turelem` ideig nem szól, ő végzett.
   *
   * ⛔⛔ ÉS ITT **NEM** `parbeszed` FUT, HANEM A PASSZÍV `fajlKiszolgalas` — ezt egy mérés
   * kényszerítette ki (2026-09-14). A `parbeszed` ugyanis **kezdeményez**: rögtön küld egy
   * `LENYOMAT`-ot. Mivel a résen mindkét fél ugyanazt a szerepet játssza, a két LENYOMAT
   * találkozott, és a két gép **rendes cserébe kezdett egymással** — a fájl-ág pedig a
   * második szeletnél egy `CIMEK` üzenetet kapott `FAJLKEREK` helyett, és kilépett.
   * *A 70 KB-os fájl fele úton maradt, a tünet („a társ nem kért semmit") pedig félrevezetett.*
   *
   * ⭐ Aki kiszolgál, az NE beszéljen elsőként.
   *
   * ⚠️ A kiszolgálás EGY fájl után visszatér (a kérő `KESZ`-t mond), ezért kell a ciklus.
   * A két kapcsolat közti pillanatban a kérő első csomagja elveszhet — de **újraküldi**,
   * tehát legfeljebb egy RTO-nyi késés az ára, nem a fájl.
   */
  const kiszolgaloFazis = async (turelem) => {
    // ⭐ Ha nincs mit olvasnunk, akkor is FELELÜNK — őszintén, hogy nincs meg (D19).
    // *Enélkül a fázis-ütem csúszna el, és a másik fél kérése a semmibe menne.*
    const olvas = fajlOlvas ?? (async () => null);
    for (;;) {
      const kapcsolat = udpKapcsolat(halo, tarsCim, tarsPort);
      kapcsolat.setTimeout(turelem, () => {
        kapcsolat.destroy(new Error('a társ nem kért semmit (' + turelem + ' ms)'));
      });
      try {
        const e = await fajlKiszolgalas(kapcsolat, olvas);
        if (!e.kiszolgalt) { utana({ mi: 'KISZOLGALAS-VEGE', ok: e.ok }); break; }
        kiszolgalt++;
        utana({ mi: 'KISZOLGALTAM', hanyadik: kiszolgalt });
      } catch (hiba) {
        // ⭐ Ez a RENDES befejezés: a társ végzett, vagy nem is kért. Nem hiba (D19) —
        // ⚠️ de KIMONDJUK, mert egy elnyelt ok itt csendes holtpontot takarhat.
        utana({ mi: 'KISZOLGALAS-VEGE', ok: hiba.message, hanyadik: kiszolgalt });
        break;
      } finally {
        // ⚠️ ELŐBB KIÜRÍTÉS: az utolsó szelet darabjai még úton lehetnek, és az `end()`
        // eldobná őket — pontosan az a holtpont, amit a `csereUdpResen`-nél már megmértünk.
        if (typeof kapcsolat.kiurites === 'function') await kapcsolat.kiurites();
        kapcsolat.end();
      }
    }
  };

  if (enKezdek) {
    await keroFazis();
    await kiszolgaloFazis(2 * varakozasiIdo);
  } else {
    await kiszolgaloFazis(varakozasiIdo);
    await keroFazis();
  }

  const eredmeny = { kesz, bukott, bajt, kiszolgalt, szerep };
  console.log('fajlRandevu - VÉGE', eredmeny);
  return eredmeny;
}

export async function csereUdpResen(halo, tarsCim, tarsPort, tar, koino, beallitas = {}) {
  const varakozasiIdo = beallitas.varakozasiIdo ?? TETLENSEG_ALAP;
  console.log('csereUdpResen - KEZDÉS', { tarsCim, tarsPort, koino, varakozasiIdo });

  const kapcsolat = udpKapcsolat(halo, tarsCim, tarsPort);

  // ⚠️ A NÉMA TÁRS NEM RAGASZTHAT BE. Ha a másik elhallgat (elment, lefagyott, vagy csak
  // elveszett a válasza), ez a határidő zárja le a párbeszédet — HIBÁVAL, nem csenddel.
  // E nélkül a `koino.js` őrjárata is megállhatna örökre egyetlen csendes társon.
  kapcsolat.setTimeout(varakozasiIdo, () => {
    kapcsolat.destroy(new Error('A másik fél nem válaszol (' + varakozasiIdo + ' ms)'));
  });

  try {
    const eredmeny = await parbeszed(kapcsolat, tar, koino, beallitas);

    // ⭐ ELŐBB KIÜRÍTÉS, CSAK UTÁNA ZÁRÁS. A párbeszéd akkor is véget érhet, amikor a MI
    // utolsó üzenetünk még úton van (a `parbeszed` az utolsó LENYOMAT-ra már nem vár
    // nyugtát). Ha itt azonnal zárnánk, azt a darabot eldobnánk — és a másik fél örökre
    // várná. ⚠️ Pontosan ez volt a holtpont, amit a 30%-os önpróba 6-ból 5-ször elkapott.
    const kiment = await kapcsolat.kiurites();
    if (!kiment) {
      console.warn('csereUdpResen - az utolsó darab nem lett nyugtázva', { tarsCim, tarsPort });
    }

    const teljes = {
      ...eredmeny,
      bajtKuldott: kapcsolat.bytesWritten,
      bajtKapott: kapcsolat.bytesRead
    };
    console.log('csereUdpResen - VÉGE', teljes);
    return teljes;
  } finally {
    kapcsolat.end();
  }
}
