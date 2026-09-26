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
// ami kikényszerítette. **Egy „nincs újdonság" kör továbbra is egyetlen oda-vissza** (ma
// 931 bájt, 38. mérés) — az ablak csak akkor számít, ha van mit átvinni.
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

import { parbeszed, fajlHozatala, fajlKiszolgalas, szeletKapcsolaton } from './vonal.js';

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
// kör ettől a mezőtől nem lett drágább.*
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
// **egyetlen oda-vissza** (ma 931 bájt, 38. mérés). *Az aszimmetria egyértelmű.*
const RTO_KEZDO = 300;
const RTO_MIN = 100;           // alsó korlát az óra-felbontás és a téves újraküldés ellen
const RTO_MAX = 60000;         // felső korlát: egy nagyon rossz vonalon se pörögjünk
const SIMITAS = 0.125;         // α — a simított átlag súlya (1/8)
const SZORAS_SULY = 0.25;      // β — az ingadozás súlya (1/4)

// ⭐ A FELADÁS IDŐALAPÚ, NEM DARABSZÁM-ALAPÚ. Korábban „20 próbálkozás" volt — ⚠️ de a 16.
// mérés szerint **soha nem is értük el**. Visszalépő újraküldésnél ráadásul a darabszám
// semmit nem mond: 20 próbálkozás lehet 2 másodperc és fél óra is. *Az idő az, ami számít.*
//
// ⭐⭐⭐ ÉS 2026-09-15 ÓTA EZ CSAK AZ ALAPÉRTÉK: a hívó felülírhatja (`beallitas.feladasIdo`).
//
// ⛔ MIÉRT: a türelem **nem a vonal kérdése**. A vonal csak csomagokat lát — azt, hogy
// *érdemes-e még küzdeni ezzel a társsal*, csak a fájl-réteg tudja, mert ő ismeri, **hány
// forrásból szerezhető be ugyanaz** (D68, Csaba 2. válasza). A számítás ezért ott van
// (`fajlAtvitel.js`: `turelemForrasokbol`), és a vonal **paraméterként kapja**.
// *Ugyanaz a szétválasztás, mint mindenhol: a vonal nem tud a koinóról (1. szabály).*
//
// ⚠️ Az alapérték a cseréé marad: ott **nincs „másik forrás"** ugyanarra a beszélgetésre.
const FELADAS_ALAP = 30000;

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

// ===================================
// ⭐⭐⭐ A TORLÓDÁS JELE: A KÉSLELTETÉS (D68 / 2. lépés, 2026-09-15)
// ===================================
//
// ⛔⛔ MIÉRT KELL, HA MÁR VAN AIMD? Mert a 23. mérés megmutatta, hogy **az AIMD nem tanul
// semmit**, amíg nem veszít csomagot — a mai routerek puffere viszont akkora, hogy előbb
// telik meg **több száz ezredmásodpercnyi késleltetéssel**, mint hogy bármi elveszne.
// ⭐ A 24. mérés ezt számmá tette: mellettünk egy hívás késleltetése **2,0 → 12,8 ms**
// (csúcsban 2 → 44 ms), miközben mi **egyetlen csomagot sem veszítünk**.
//
// ⭐⭐ A D68 VÁLASZA: a jel legyen a **KÉSLELTETÉS**, a fájl-átvitel legyen **engedékeny**
// (a csere ne), és a **REDUNDANCIA** teszi megfizethetővé — ha ugyanazt több társ is hozza,
// a visszafogás nem állítja meg a munkát.
//
// ⚠️ A JELÖLTEKET A MÉRÉS VÁLASZTJA KI, NEM AZ ÉRVELÉS (Csaba 1. válasza) — ezért paraméter
// (`torlodasJel`), és ezért fut mindkettő ugyanazon a műszeren.
//
// ⛔⛔ AMI MINDKETTŐRE ÁLL: **rögzített ms-küszöb TILOS** (9. szabály) — a vonalak hat
// nagyságrendet fognak át, egy „100 ms" mindenütt mást jelent. A Vegas ezért vonzó: nála a
// küszöb **darabszám**, ami skálafüggetlen. A LEDBAT célját viszonyítani kellett.

// ⭐ VEGAS: ennyi darab állhat a sorban, mielőtt visszafogunk. A klasszikus α=2, β=4.
// *Két darab: „van mit átvinni". Négy fölött: „sorba állítottuk a vonalat."*
const VEGAS_ALFA = 2;
const VEGAS_BETA = 4;

// ⭐ LEDBAT: a cél a `minRtt`-hez viszonyul (lásd a `sikerEsemeny`-ben), de kell egy alsó
// korlát — egy 0,2 ms-os helyi vonalon különben a mérési zaj vezérelne. ⚠️ Ez NEM a
// klasszikus 100 ms-os cél: az varázsszám lenne.
const LEDBAT_ALSO_CEL = 5;     // ms
const LEDBAT_NYERESEG = 1;     // körönként legfeljebb ennyi darabbal mozdul

// ⭐ Ennyi friss mintából vesszük a MINIMUMOT (a jel bemenete). ⚠️ Rövid ablak: a torlódás
// tartós, a zaj szór — a minimum az, ami a kettőt szétválasztja.
const FRISS_MINTA = 8;

// ⭐ AZ ÜTEMEZÉS LÖKET-KORLÁTJA: ennyi darab mehet ki egyszerre, ha az óra késve ébred.
// ⚠️ Nem varázsszám, hanem a **durva óra ára**: Windowson a `setTimeout` ~15,6 ms-os
// lépésekben ébred, tehát a pontos ütemet nem lehet kirajzolni. A 4 az a kompromisszum,
// ami a löketet 16-ról levágja, de egy késő ébredés után sem fojtja meg az átbocsátást.
const LOKET_MAX = 4;

// ⭐⭐⭐ NAGYFELBONTÁSÚ ÓRA A MINTÁKHOZ — és ezt is egy mérés kényszerítette ki (2026-09-15).
//
// ⛔⛔ A `Date.now()` **ezredmásodperc-felbontású**, a helyi vonalon mért oda-vissza idők
// viszont **0–2 ms** tartományban vannak. Mérve: a késleltetés-jel egy ÜRES, gyors vonalon
// 688 → 138 KB/s-ra fojtotta a vonalat, mert `minRtt` gyakran **0** lett — és akkor a
// „sorbanállás" a teljes mért időnek látszott. *A jel a felbontás alatt dolgozott: nem
// torlódást mért, hanem kerekítést.*
//
// ⭐ A `performance.now()` mikroszekundum-pontos, és a Node-ban beépített (nulla függőség).
// ⚠️ Csak a MINTÁKHOZ használjuk: a feladási keret és a tétlenség ms-ban is jó, azoknál a
// `Date.now()` marad — *ott valódi órára van szükség, nem eltelt időre.*
const most = () => performance.now();

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
export function udpKapcsolat(halo, tarsCim, tarsPort, beallitas = {}) {
  // ⭐ A TORLÓDÁS-JEL PARAMÉTER, NEM ÁTÍRÁS (D68 / 2. lépés): alapból 'nincs' — vagyis a
  // tiszta AIMD, ahogy eddig. *A jelölteket a mérés hasonlítja össze; a döntés utána jön.*
  const torlodasJel = beallitas.torlodasJel ?? 'nincs';
  // ⭐ A TÜRELEM KÍVÜLRŐL JÖN (D68): a fájl-réteg a forrásszámból számolja ki.
  const feladasIdo = beallitas.feladasIdo ?? FELADAS_ALAP;
  // ⭐ Az ÜTEMEZÉS független a jeltől (a jel az ÜTEMET szabja meg, ez a LÖKETET).
  //
  // ⛔⛔ ALAPBÓL KI — ÉS EZ MÉRT DÖNTÉS, NEM FELEDÉKENYSÉG (D68 / 4. lépés, 2026-09-15).
  // A 27. mérés szerint a **jel mellett nem ad hozzá mérhetőt** ezen a futtatókörnyezeten:
  // a hívás csúcsa a Vegas-szal már 18–19 ms (az ütemezés önmagában csak 24–27-ig jut), az
  // átlag 3,0 → 3,4–4,6-ra **romlott**, a sebesség pedig ingadozóbb lett.
  //
  // ⭐⭐ ÉS AZ OK SZERKEZETI, NEM HANGOLÁSI: **a sor mélységének alsó határát a
  // futtatókörnyezet ÓRÁJA szabja meg.** Windowson a `setTimeout` ~15,6 ms-onként ébred, a
  // vonal viszont 2 ms-onként visz át egy csomagot — egy ébredés alatt tehát ~8 csomagnyi
  // idő telik el, és ennél kisebb löketet **nem lehet kirajzolni** anélkül, hogy a vonal
  // kihasználatlan maradjon. *A `sor: 1–2` cél itt nem hangolás kérdése, hanem mérhetetlen.*
  //
  // ⏸️ A KOINO CÉLKÉSZÜLÉKE VISZONT A TELEFON (Termux/Android), ahol az óra ~1 ms-os —
  // ott az ütemezés várhatóan fizet, és a cél is elérhető. ⚠️ De **bekapcsolni csak mérés
  // után szabad**: `node koino/meres/resSebessegMeres.js`, az „AZ ÜTEMEZÉS" szakasz.
  const utemezes = beallitas.utemezes === true;
  console.log('udpKapcsolat - KEZDÉS', { tarsCim, tarsPort, torlodasJel });

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
  let minRtt = Infinity;          // ⭐ a vonal SAJÁTJA, sorbanállás nélkül (D68)

  // ----- ⭐ AZ ÜTEMEZÉS ÁLLAPOTA (D68 / 4. lépés) -----
  // `utemKredit`: hány darabot küldhetünk MOST (időarányosan gyűlik, `LOKET_MAX`-ig).
  // ⭐ Egy teljes löketnyi kredittel indulunk: a kapcsolat eleje ne legyen lassabb a
  // réginél — ott úgysincs még mérésünk, tehát ütemezés sincs.
  let utemKredit = LOKET_MAX;
  let utemUtolso = 0;
  let utemOra = null;
  // ⭐⭐ A FRISS MINTÁK — és ezt egy mérés kényszerítette ki (D68 / 2. lépés, 2026-09-15).
  //
  // ⛔ ELŐSZÖR az `srtt`-ből számoltuk a sorbanállást, és a mérés lefojtotta a vonalat: egy
  // ÜRES, gyors vonalon 635 → 131 KB/s (Vegas), 635 → 28 (LEDBAT). Az ok: az `srtt` **simított
  // ÁTLAG**, ami a saját feldolgozási zajunkat is beépíti — egy 0,2 ms-os helyi vonalon a
  // szoftveres késés nagyobb, mint maga a vonal, tehát a jel **zajt olvasott torlódásnak**.
  //
  // ⭐ A TORLÓDÁS TARTÓSAN emeli a késleltetést, a zaj csak SZÓR — ezért a jel bemenete az
  // utolsó néhány minta **MINIMUMA**, nem az átlaga. *Ugyanaz az elv, mint a `minRtt`-nél,
  // csak rövid ablakon.* (Ez a LEDBAT „current delay" alakja.)
  const frissMintak = [];

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
   *
   * ⭐⭐⭐ ÉS ITT DÖNTI EL A TORLÓDÁS-JEL, HOGY NŐHET-E (D68 / 2. lépés, 2026-09-15).
   * A `torlodasJel` beállítás nélkül minden marad a régiben (tiszta AIMD) — a jel
   * **paraméter, nem átírás**, hogy a mérés össze tudja hasonlítani a jelölteket.
   */
  const sikerEsemeny = () => {
    if (torlodasJel === 'nincs' || srtt === null || minRtt === Infinity) {
      ablak = Math.min(ABLAK_MAX, ablak + 1 / ablak);
      return;
    }

    // ⭐ A SORBANÁLLÁS BECSLÉSE — ennyivel lassabb most a vonal, mint üresen.
    // ⚠️ A FRISS MINTÁK MINIMUMÁBÓL, nem az `srtt`-ből: az átlag a zajt is beépíti, és mérve
    // ettől fojtotta le a jel az ÜRES vonalat is (635 → 131 KB/s).
    const friss = frissMintak.length ? Math.min(...frissMintak) : srtt;
    const sorKesleltetes = Math.max(0, friss - minRtt);

    if (torlodasJel === 'vegas') {
      // ⭐⭐⭐ VEGAS — és a koino szempontjából ez a legvonzóbb tulajdonsága: a küszöb
      // **DARABSZÁMBAN** van, nem ezredmásodpercben.
      //
      // `diff` ≈ hány darabunk áll a sorban:  ablak × (srtt − minRtt) / srtt
      //
      // ⛔ A 9. szabály miatt ez döntő: egy ms-ban megadott küszöb **varázsszám** lenne (egy
      // 1 ms-os helyi vonalon értelmetlenül szűk, egy 400 ms-os műholdason értelmetlenül
      // tág), a „két darab a sorban" viszont **ugyanazt jelenti mindenhol**.
      const diff = friss > 0 ? ablak * sorKesleltetes / friss : 0;
      if (diff < VEGAS_ALFA) ablak = Math.min(ABLAK_MAX, ablak + 1 / ablak);
      else if (diff > VEGAS_BETA) ablak = Math.max(ABLAK_MIN, ablak - 1 / ablak);
      // a kettő között: MARAD — *ez a „jól beállt" állapot, és pont ezt keressük.*
      return;
    }

    if (torlodasJel === 'ledbat') {
      // ⭐ LEDBAT — a sorbanállási késleltetést egy CÉLÉRTÉK alatt tartja, és annál
      // erősebben fog vissza, minél messzebb van tőle.
      //
      // ⛔⛔ A KLASSZIKUS LEDBAT CÉLJA 100 ms — **ez varázsszám**, tehát nálunk tilos
      // (9. szabály). ⭐ Helyette **viszonyított** cél: a sorbanállás ne haladja meg a vonal
      // SAJÁT oda-vissza idejét (`minRtt`) — *„ne várakoztassunk többet, mint amennyi az út
      // maga"*. ⚠️ Egy alsó korlát mégis kell, különben egy 0,2 ms-os helyi vonalon a
      // mérési zaj vezérelne.
      const cel = Math.max(LEDBAT_ALSO_CEL, minRtt);
      const eltero = (cel - sorKesleltetes) / cel;         // +1 … −∞
      ablak = Math.max(ABLAK_MIN,
        Math.min(ABLAK_MAX, ablak + LEDBAT_NYERESEG * eltero / ablak));
      return;
    }

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
    // ⭐⭐ A LEGKISEBB VALAHA LÁTOTT ODA-VISSZA IDŐ: ez a vonal SAJÁTJA, sor nélkül.
    // Ami e fölött van, az **sorbanállás** — ezen áll az egész késleltetés-alapú jel (D68).
    //
    // ⚠️⚠️ ÉS A HATÁRA KIMONDVA: a `minRtt` **elavulhat** (útvonalváltás, mobil cellaváltás),
    // és akkor a megnőtt alapkésleltetést örökre sorbanállásnak hinnénk. *Egy csere ~1
    // másodperc, egy fájl-átvitel hosszabb — ott ez valódi kockázat.* A LEDBAT erre
    // „minRtt-ablakot" használ (az utolsó N másodperc minimuma); ⏸️ nálunk ez még nincs
    // megépítve, és a mérésnek kell megmondania, hogy kell-e.
    if (R < minRtt) minRtt = R;

    frissMintak.push(R);
    if (frissMintak.length > FRISS_MINTA) frissMintak.shift();

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

  // ⭐ MIKOR HALLOTTUK ŐT UTOLJÁRA? (2026-09-14, a holtpont-mérés óta.) Bármi tőle:
  // nyugta VAGY adat. Ez az egyetlen bizonyítékunk arra, hogy a vonal **él** — az
  // újraküldés visszalépése ezen múlik (lásd `orat_felhuz`).
  let utolsoErkezes = 0;

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
    // ⚠️ A LEZÁRT FOGLALAT SZINKRON DOB (`ERR_SOCKET_DGRAM_NOT_RUNNING`) — és egy óra-hívásból
    // dobott hiba az egész folyamatot leállítaná (2026-09-26, próbából). Egy kapu, amit épp
    // bezártak, ne döntse le a készüléket: a küldés ilyenkor egyszerűen nem megy ki (D19: a
    // napló kimondja), a kapcsolat pedig a tétlenségi órájával zárul.
    try {
      halo.send(bajtok, tarsPort, tarsCim, (hiba) => {
        if (hiba) console.warn('udpKapcsolat - küldés bukott', { ok: hiba.message });
      });
    } catch (hiba) {
      console.warn('udpKapcsolat - a foglalat már zárva', { ok: hiba.message });
    }
  };

  /** Feladjuk ezt a darabot — de HIBAKÉNT, nem csendben. A néma nem-esemény a legrosszabb. */
  const feladas = (sorszam) => {
    for (const t of uton.values()) clearTimeout(t.ora);
    uton.clear();
    jelez('error', new Error('a másik fél nem nyugtázta a ' + sorszam + '. darabot '
      + Math.round(feladasIdo / 1000) + ' másodperc alatt'));
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
      if (Date.now() - tetel.kezdet > feladasIdo) return feladas(sorszam);

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
      // ⛔⛔⛔ ÉS EGY HARMADIK KORLÁT, AMIT EGY MÉRT HOLTPONT KÉNYSZERÍTETT KI (2026-09-14).
      //
      // ⚠️⚠️ A JELENSÉG: a 30%-os vesztésű csere **kísérletenként ~1,5–3%-ban** véglegesen
      // elhallgatott, és csak a másik fél tétlenségi órája vetett neki véget. 200 kísérlet
      // csomag-naplójából a mechanizmus pontosan kiolvasható volt:
      //
      //   · a kapcsolat ELSŐ darabja (a `LENYOMAT`) sorozatban elveszett — ezért `srtt`
      //     `null` maradt, tehát az óra **vak**, és a fenti rászűkítés miatt **csak ezt az
      //     egy darabot** szondáztuk; a mögötte álló (már kiküldött) darab meg sem mozdult;
      //   · a visszalépés közben 300 → 600 → 1200 → 2400 → **4800 ms**-ra nőtt;
      //   · ⛔ a másik fél **tétlenségi órája 5000–10 000 ms** — vagyis **hamarabb adta fel,
      //     mint ahogy mi újra megszólaltunk volna.**
      //
      // ⛔ A KÉT ŐR TEHÁT ELLENTMONDOTT EGYMÁSNAK — ugyanaz a fajta hiba, mint fentebb a
      // feladási keretnél: *egy türelem, ami túléli a másik fél türelmét, nem türelem, hanem
      // néma bukás.*
      //
      // ⭐⭐⭐ A FELOLDÁS A MÁR MEGLÉVŐ ELV KITERJESZTÉSE: lentebb kimondtuk, hogy **a nyugta
      // bizonyítja, hogy az út él**, ezért a visszalépést feloldjuk. ⭐ Ugyanez igaz minden
      // TŐLE érkező csomagra: ha ennek a darabnak az utolsó küldése ÓTA hallottuk őt, akkor a
      // némaság nem a vonal halála — **nincs mit kímélni, tehát nem ritkítunk tovább**.
      //
      // ⚠️ ÉS AMIT SZÁNDÉKOSAN NEM TESZÜNK: nem nullázzuk az RTO-t, csak **megállítjuk a
      // duplázást**. A beérkező adat ugyanis a MÁSIK irányról szól — a torlódás lehet
      // aszimmetrikus. *„Amíg hallom őt, nem ritkítok tovább — de nem is sietek."*
      const utolsoKuldes = tetel.kuldesek[tetel.kuldesek.length - 1] ?? 0;
      const hallottamOta = utolsoErkezes >= utolsoKuldes;

      // ⛔⛔ ÉS EGY NEGYEDIK KORLÁT: A MÁSIK FÉL TÜRELME.
      //
      // ⚠️ A fenti feloldás csak akkor véd, ha **legalább az egyik fél beszél**. Mérve
      // viszont előfordul a **szimmetrikus** eset is: mindkét oldal a saját első darabjára
      // vár, mindkettő visszalépett — és akkor **senki nem ad életjelet**, tehát a
      // „hallottam-e azóta" feltétel egyiknél sem teljesül.
      //
      // ⭐ A vonal ismeri a SAJÁT tétlenségi óráját, és a másik fél **ugyanezt a programot
      // futtatja** (a D66 óta ez nem feltevés, hanem a koino azonosságából következik):
      // egy koino = egy verzió. Ezért az RTO **sosem több a tétlenségi óra harmadánál** —
      // így a társ legalább **három** szondát hall, mielőtt feladná.
      //
      // ⚠️ Az ára egy rossz vonalon sűrűbb szondázás; de a szonda **egyetlen darab** (a
      // legrégebbi), és a cél épp az, hogy a kapcsolat ne haljon meg NÉMÁN.
      const turelem = tetlensegHatar > 0 ? tetlensegHatar / 3 : Infinity;

      const maradek = feladasIdo - (Date.now() - tetel.kezdet);
      if (!hallottamOta) {
        tetel.rto = Math.min(
          RTO_MAX,
          tetel.rto * 2,
          Math.max(RTO_MIN, maradek / 4),
          Math.max(RTO_MIN, turelem)
        );
      }

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
    tetel.kuldesek.push(most());
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
    if (lezarva) return;

    // ===== ⭐⭐⭐ AZ ÜTEMEZÉS (D68 / 4. lépés, 2026-09-15) =====
    //
    // ⛔⛔ MIÉRT KELL, HA MÁR VAN JEL? Mert **két különböző dolgot szabályoznak**, és a
    // 26. mérés ezt élesen megmutatta: a Vegas az ablakot 16-ról 5–6-ra vitte (a hívás
    // átlagos késleltetése 12 → 3 ms), ⛔ **de a `sor:` oszlop 14–16 maradt** — mert az a
    // CSÚCSOT méri, azt pedig nem az ablak nagysága szabja meg, hanem hogy **egyszerre**
    // lökjük ki a darabokat. *Szigorúbb küszöbbel sem csökkent, csak az ár nőtt.*
    //
    // ⭐ A KÉP, AMI MEGMAGYARÁZZA: a szűk keresztmetszet 2 ms-onként visz át egy csomagot.
    // Ha 16-ot lököm ki egyszerre, a 16. harminc ezredmásodpercet vár — **és aki mögé beáll
    // (a családtag hívása), az is.** Ha 2 ms-onként küldök egyet, **ugyanannyi adat megy át
    // ugyanannyi idő alatt**, de a sor mindig üres marad. *A sor nem gyorsít semmit.*
    //
    // ⭐ AZ ÜTEM MAGÁTÓL ADÓDIK, nincs benne varázsszám: egy kör (`srtt`) alatt pont egy
    // ablaknyi darab megy ki, tehát **`srtt / ablak` ezredmásodperc jut egy darabra**.
    //
    // ⚠️⚠️ ÉS EGY KORLÁT, AMIT KI KELL MONDANI: az időzítő felbontása. Windowson a
    // `setTimeout` ~15,6 ms-os lépésekben ébred (ezt a 26. mérés a saját műszerünkön
    // mutatta meg), vagyis a 2 ms-os ütemet **nem tudja kirajzolni**. ⭐ Ezért nem
    // darabonként időzítünk, hanem **kreditet gyűjtünk**: ébredéskor annyi darab mehet,
    // amennyi a TÉNYLEGESEN eltelt idő alatt „összejött". Így egy késő ébredés nem lassít —
    // legfeljebb egy kis löketet enged, `LOKET_MAX`-ig. *A durva óra így is jobb, mint a
    // löket: 16 helyett 4.*
    //
    // ⛔ ÉS AMÍG NINCS MÉRÉSÜNK (`srtt === null`), NINCS ÜTEMEZÉS: a kapcsolat első darabjai
    // (a `LENYOMAT`) azonnal mennek. *Ütemezni csak ahhoz lehet, amit már megmértünk.*
    const koz = (!utemezes || srtt === null) ? 0 : srtt / Math.max(1, ablak);   // ms / darab

    if (koz > 0) {
      const mostPontos = most();
      if (utemUtolso === 0) utemUtolso = mostPontos;
      // ⚠️ A PLAFON AZ ABLAKHOZ IGAZODIK, nem fix szám: egy durván ébredő óra (Windows:
      // ~15,6 ms) alatt több darabnyi kredit gyűlik, és ha azt fix 4-nél levágnánk, **a
      // saját ütemezésünk fojtaná meg a vonalat** (mérve: 247 → 179 KB/s).
      const plafon = Math.max(LOKET_MAX, Math.floor(ablak / 2));
      utemKredit = Math.min(plafon, utemKredit + (mostPontos - utemUtolso) / koz);
      utemUtolso = mostPontos;
    }

    while (!lezarva && sor.length && uton.size < Math.floor(ablak)) {
      if (koz > 0) {
        if (utemKredit < 1) break;          // ⭐ most nem fér bele — időzítünk lentebb
        utemKredit -= 1;
      }

      const sorszam = kovetkezoSorszam++;
      const mostMs = Date.now();
      const tetel = {
        szoveg: sor.shift(), magasabbNyugtak: 0, ora: null,
        kuldesek: [],          // ⭐ minden küldés ideje — ebből lesz a PONTOS minta
        kezdet: mostMs,        // innen számít a feladási határidő
        rto                    // ⭐ a kapcsolat MOSTANI becslésével indul
      };
      uton.set(sorszam, tetel);
      darabotKuld(sorszam, tetel);
    }

    // ⭐ Maradt küldenivaló, de az ütem nem engedte: ébredjünk, amikor jár a következő.
    // ⚠️ `unref`, hogy egy nyitva felejtett ütem-óra ne tartsa életben a folyamatot.
    if (koz > 0 && !lezarva && sor.length && uton.size < Math.floor(ablak) && !utemOra) {
      utemOra = setTimeout(() => {
        utemOra = null;
        kovetkezotKuld();
      }, Math.max(1, Math.round(koz)));
      utemOra.unref?.();
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
  const utolsoKapottak = new Map(); // sorszám → szöveg: a már továbbadott utolsó darabok (utóhang)

  const uzenetErkezett = (bajtok, felado) => {
    // ⚠️ Csak attól fogadunk el, akivel beszélünk. Ez NEM bizalom (3. szabály) — az
    // eseményeket úgyis az `esemenyMentese` ellenőrzi —, csak azért, hogy egy téves
    // csomag ne zavarja össze a sorszámozást.
    if (felado.address !== tarsCim || felado.port !== tarsPort) return;

    oratUjraindit();                   // ÉLETJEL: tőle jött valami, tehát él
    // ⚠️ UGYANABBAN AZ IDŐSKÁLÁBAN, mint a `kuldesek` — a visszalépés feloldása a kettőt
    // hasonlítja össze (`hallottamOta`), és két különböző óra ott némán hazudna.
    utolsoErkezes = most();
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
        if (mikor !== undefined) mintaErkezett(most() - mikor);

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

    // ⛔⛔⛔ AZ UTÓHANG CSAK A SAJÁT ISMÉTLÉSEIRE FELEL (2026-09-26, D69/2 — mérésből).
    //
    // ⚠️ A lenti régi feltevés (*„amíg a régi figyelő él, az ÚJ is él"*) a KÜLDŐ oldalán igaz,
    // a FOGADÓén nem mindig. Az őrjárat ismételt menete ugyanazzal a társsal másodpercen belül
    // ÚJ kapcsolatot nyit ugyanazon a foglalaton — és a sorszámok minden kapcsolatban 1-től
    // indulnak. ⛔ Mérve: a társ új munkája még el sem indult, a régi kapcsolata viszont az
    // utóhangban NYUGTÁZTA az új kapcsolat első darabját (a `sz < vartSorszam` ág azt hitte,
    // ismétlést lát). A küldő nem küldte újra, a társ új párbeszéde sosem kapta meg, és a
    // csere 10 mp múlva elbukott: *„rés nyílt, de a csere a résen elbukott"*.
    //
    // ⭐ A MEGKÜLÖNBÖZTETÉS ÚJ MEZŐ NÉLKÜL MEGVAN: az első küldés SOSEM visz `k`-t (lásd a
    // pontos mintáknál), tehát ami `k` nélkül jön, az nem lehet a mi kapcsolatunk ismétlése.
    // És ami `k`-val jön, az is csak akkor a miénk, ha BÁJTRA azt hozza, amit mi kaptunk
    // azon a sorszámon. A lezárt példány új adatot sem fogad (`sz >= vartSorszam`): a
    // párbeszéd csak akkor zár, ha a társ minden üzenetét elolvasta.
    if (lezarva) {
      if (Number.isInteger(uzenet.k) && uzenet.sz < vartSorszam
        && utolsoKapottak.get(uzenet.sz) === uzenet.a) nyugtaz();
      return;
    }

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
      // ⭐ Az utolsó néhány kapott darabot megőrizzük — az utóhang ezzel ismeri fel a SAJÁT
      // ismétléseit (lásd fent). Korlátos: csak a fogadó ablaknyi utolsó darab.
      utolsoKapottak.set(vartSorszam, szoveg);
      utolsoKapottak.delete(vartSorszam - FOGADO_ABLAK);
      vartSorszam++;
      jelez('data', szoveg);
    }
  };

  halo.on('message', uzenetErkezett);

  return {
    remoteAddress: tarsCim,
    remotePort: tarsPort,

    /**
     * ⭐ A TORLÓDÁS-VEZÉRLÉS BELSŐ ÁLLAPOTA — a MÉRÉSNEK (D68 / 2. lépés).
     *
     * ⚠️ A jel alakját nem lehet a végeredményből megítélni: két különböző ablak-pálya
     * ugyanazt a sebességet adhatja. *Ha nem látjuk, mit csinál, csak találgatunk.*
     */
    jelAllapot() {
      const friss = frissMintak.length ? Math.min(...frissMintak) : srtt;
      return { jel: torlodasJel, utemezes, ablak, minRtt, friss, srtt,
               uton: uton.size, sor: sor.length };
    },
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
      if (utemOra) { clearTimeout(utemOra); utemOra = null; }   // ⭐ az ütem-óra is
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
  // ⭐⭐⭐ ITT VÁLIK SZÉT A KÉT FORGALOM (D68 / 3. lépés, 2026-09-15).
  //
  // A fájl-átvitel **engedékeny** (`vegas`), a csere **nem** (`csereUdpResen`: `nincs`).
  // ⛔⛔ ÉS EZT NEM A HÍVÓRA BÍZZUK — ugyanaz az érv, mint a javaslathoz tartozó
  // szavazatnál (`muveletek.js`): *ha a hívó dolga lenne, az egyik út megtenné, a másik
  // elfelejtené.* A fájl-út **definíció szerint** tömeg-forgalom, tehát a jel ide tartozik.
  // ⚠️ Felülírható (a mérés ezzel hasonlítja össze a jelölteket).
  const jel = beallitas.torlodasJel ?? 'vegas';
  const nyito = async () => {
    const kapcsolat = udpKapcsolat(halo, tarsCim, tarsPort, { ...beallitas, torlodasJel: jel });
    // ⚠️ A NÉMA TÁRS NEM RAGASZTHAT BE — ugyanaz az őr, mint a rendes UDP-cserénél.
    kapcsolat.setTimeout(varakozasiIdo, () => {
      kapcsolat.destroy(new Error('A másik fél nem válaszol (' + varakozasiIdo + ' ms)'));
    });
    return kapcsolat;
  };

  // ⭐ A HASZNÁLT JELET VISSZAADJUK — hogy a szétválasztás **mérhető tény** legyen, ne
  // ígéret. *Amit nem lehet megmérni, arról egy hét múlva nem tudjuk, igaz-e még.*
  const eredmeny = { ...(await fajlHozatala(blob, koino, lenyomat, nyito, beallitas)),
                     torlodasJel: jel };
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
    varakozasiIdo = TETLENSEG_ALAP, utana = () => {},
    // ⭐ D72 (2026-09-26): egy megérkezett fájlból kiderülhet, hogy MÁS fájlok is kellenek —
    // a szöveg-darabban képek lehetnek. (async lenyomat → további lenyomatok)
    ujKerhetok = null
  } = beallitas;

  // ⭐ A RANDEVÚ MINDKÉT FÁZISA TÖMEG-FORGALOM — kérünk vagy adunk, mindkettő fájl.
  // ⛔ És a torlódást a KÜLDŐ okozza, tehát a **kiszolgáló** fázisnak is kell (ő küldi a
  // 64 KB-os szeleteket). *Ha csak a kérőre tennénk, épp az maradna vezérlés nélkül, aki a
  // vonalat tölti.*
  const jel = beallitas.torlodasJel ?? 'vegas';

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
    // ⭐ D72: SOR, nem lista — egy megérkezett szöveg-darab képei a végére kerülnek, és még
    // ugyanebben a randevúban elkérjük őket (különben a kép egy bulival később jönne, mint a
    // szöveg). ⚠️ Egy lenyomatot csak egyszer kérünk.
    const sor = [...kerhetok];
    const kert = new Set(sor);
    while (sor.length) {
      const lenyomat = sor.shift();
      try {
        const e = await fajlUdpResen(halo, tarsCim, tarsPort, blob, koino, lenyomat,
          { korlat, varakozasiIdo, torlodasJel: jel });
        if (e.kesz) { kesz++; bajt += e.bajt ?? 0; } else { bukott++; }
        utana({ mi: e.kesz ? 'MEGJOTT' : 'NEM-JOTT', lenyomat, ok: e.ok, bajt: e.bajt ?? 0 });
        if (e.kesz && ujKerhetok) {
          for (const uj of await ujKerhetok(lenyomat)) {
            if (!kert.has(uj)) { kert.add(uj); sor.push(uj); }
          }
        }
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
      const kapcsolat = udpKapcsolat(halo, tarsCim, tarsPort,
        { ...beallitas, torlodasJel: jel });
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

  // ⭐⭐⭐ AMIT A CSERE MÁR MEGMONDOTT, AZT NE VÁRJUK KI ÚJRA (2026-09-20).
  //
  // ⛔ MIT JAVÍT: a kiszolgáló fázis a **tétlenségi óráig vár** arra, hogy a társ kérjen
  // valamit — akkor is, ha a társnak semmi kérnivalója nincs. Egyszeri, kézi fúrásnál ez
  // csak néhány másodperc kényelmetlenség; ⛔⛔ az ŐRJÁRAT ablakában viszont **elviszi az
  // egész bulit**, és több társnál egymás után halmozódik.
  //
  // ⭐ A csere fájl-köre (`FAJLOK`) MINDKÉT irányban lefutott már: tudom, mit kérhetek
  // tőle (`kerhetok`), és tudom, mit válaszoltam az ő kérésére (`kiszolgalasKell`). Ha
  // egyik sincs, nincs miről randevúzni. *Ugyanaz az elv, mint az `ALLAS`-nál: a
  // felderítés az, ami már megtörtént — ne kérdezzük meg másodszor.*
  //
  // ⚠️ ÉS EZ SZIMMETRIKUS, ezért nem ragad be a másik fél sem: az én „mit kérhetek"
  // listám pontosan az ő „mit adhatok" listája, és fordítva — a két gép ugyanarra jut.
  const kiszolgalasKell = beallitas.kiszolgalasKell !== false;

  if (!kerhetok.length && !kiszolgalasKell) {
    const semmi = { kesz: 0, bukott: 0, bajt: 0, kiszolgalt: 0, szerep, torlodasJel: jel,
      kihagyva: true };
    console.log('fajlRandevu - VÉGE (nincs miről)', semmi);
    utana({ mi: 'NINCS-MIROL' });
    return semmi;
  }

  if (enKezdek) {
    await keroFazis();
    if (kiszolgalasKell) await kiszolgaloFazis(2 * varakozasiIdo);
  } else {
    if (kiszolgalasKell) await kiszolgaloFazis(varakozasiIdo);
    await keroFazis();
  }

  const eredmeny = { kesz, bukott, bajt, kiszolgalt, szerep, torlodasJel: jel };
  console.log('fajlRandevu - VÉGE', eredmeny);
  return eredmeny;
}

/**
 * ⭐ EGY SZELET ELKÉRÉSE A RÉSEN (D69/2, 2026-09-26) — a `hozd` parancs UDP-útja.
 *
 * ⭐ A túloldalon a rendes csere-munka fut (a kapu mást nem indít): az ő `parbeszed`-je
 * LENYOMAT-tal kezd, mi viszont `SZELETKEREK`-et küldünk, és ebből látja, hogy nem cserét,
 * hanem egy szeletet kérünk. *Ugyanaz a visszafelé kompatibilis elágazás, amit a TCP-út
 * 2026-09-02 óta használt — csak most a résen.*
 *
 * @returns {Promise<Object>} a `szeletKapcsolaton` eredménye
 */
export async function szeletUdpResen(halo, tarsCim, tarsPort, tar, koino, entitas,
                                     beallitas = {}) {
  const varakozasiIdo = beallitas.varakozasiIdo ?? TETLENSEG_ALAP;
  console.log('szeletUdpResen - KEZDÉS', { tarsCim, tarsPort, entitas });
  const kapcsolat = udpKapcsolat(halo, tarsCim, tarsPort, { torlodasJel: 'nincs' });
  kapcsolat.setTimeout(varakozasiIdo, () => {
    kapcsolat.destroy(new Error('A másik fél nem válaszol (' + varakozasiIdo + ' ms)'));
  });
  try {
    const eredmeny = await szeletKapcsolaton(tar, koino, kapcsolat, entitas);
    // ⚠️ Előbb kiürítés — a kérésünk nyugtája még úton lehet (ugyanaz az ok, mint a cserénél).
    await kapcsolat.kiurites();
    console.log('szeletUdpResen - VÉGE', eredmeny);
    return eredmeny;
  } finally {
    kapcsolat.end();
  }
}

export async function csereUdpResen(halo, tarsCim, tarsPort, tar, koino, beallitas = {}) {
  const varakozasiIdo = beallitas.varakozasiIdo ?? TETLENSEG_ALAP;
  console.log('csereUdpResen - KEZDÉS', { tarsCim, tarsPort, koino, varakozasiIdo });

  // ⛔⛔ A CSERE NEM ENGEDÉKENY (D68 / 3. lépés) — és ez nem udvariatlanság, hanem a
  // forgalom természete: a csere **apró és kérdés-válasz jellegű** (egy „nincs újdonság"
  // kör 931 bájt, 38. mérés), tehát **nem ő tölti meg a sort** — ő az, aki a sor mögé kerül.
  // ⭐ *Az engedékenység annak való, aki a vonalat terheli; aki nem terheli, annak a
  // visszafogás csak kár lenne — a késleltetés-érzékeny forgalmat kétszer büntetné.*
  const kapcsolat = udpKapcsolat(halo, tarsCim, tarsPort,
    { ...beallitas, torlodasJel: beallitas.torlodasJel ?? 'nincs' });

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
      bajtKapott: kapcsolat.bytesRead,
      // ⭐ Ugyanúgy megfigyelhető tény, mint a fájl-útnál — a szétválasztás így mérhető.
      torlodasJel: kapcsolat.jelAllapot().jel
    };
    console.log('csereUdpResen - VÉGE', teljes);
    return teljes;
  } finally {
    kapcsolat.end();
  }
}
