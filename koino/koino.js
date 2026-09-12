// koino/koino.js

// Felelősség: a koino parancssori arca — ezzel lehet KÉZZEL végigjátszani a teljes kört
// egyetlen készüléken, böngésző nélkül.
//
// ⭐ MIÉRT NEM BÖNGÉSZŐ? (D29, Csaba döntése 2026-08-28) Mert a böngésző korlátai nem a
// koino korlátai: egy lap nem tud portot nyitni, nem fogad kapcsolatot, elrejti a saját
// címeit, és bezáráskor eltűnik. A koino önálló program; a böngésző legfeljebb egy kliens
// lehet később.
//
// ⚠️ EZ NEM A KOINO FELÜLETE. Ez fejlesztői eszköz, ugyanúgy, ahogy a korábbi böngészős
// nézet is az volt: a modell kipróbálására való. A valódi felület a prototípus
// pakli-nézetéből öröklődik (D22, docs/felulet_terv.md), amikor a modell megállapodott.
//
// Használat:
//   node koino/koino.js                          — mi az állapot
//   node koino/koino.js kulcs                    — ki vagyok, hol a kulcsom
//   node koino/koino.js koino "A koino neve"     — koino létrehozása
//   node koino/koino.js gondolat "Cím" "szöveg"  — új gondolat (+100 tudatpont)
//   node koino/koino.js pont <azonosító> <pont> [passziv]
//   node koino/koino.js javaslat <azonosító> "Új cím" ["indoklás"]
//   node koino/koino.js torol <azonosító> ["indoklás"]
//   node koino/koino.js athelyez <mit> <hova|gyoker> ["indoklás"]
//   node koino/koino.js egyesit <az1>,<az2>[,...] "Egyesített cím" ["indoklás"]
//   node koino/koino.js belep [alapítás]          — ⭐ a SAJÁT azonosság-szeletem
//   node koino/koino.js meghiv <horgony>          — ⭐ 1. lépcső: tagság
//   node koino/koino.js felhatalmaz <horgony>     — ⭐ rábízom a tanúsítást (D60)
//   node koino/koino.js tanusit <horgony>         — ⭐ 2. lépcső: pénztárca (D11)
//   node koino/koino.js bemutatkoz <horgony>      — ⭐ találkoztunk (D62)
//   node koino/koino.js visszavon <horgony>       — ⭐ a felhatalmazás visszavétele
//   node koino/koino.js lattam                    — ⭐ buli-elismerés (D61)
//   node koino/koino.js altalanos "Az álláspont" <hely> ["indoklás"]  — ÁLTALÁNOS javaslat
//   node koino/koino.js allast <egyezmény> csatlakozik|tiltakozik|utkozik [másik] [indoklás]
//   node koino/koino.js felszabadit [buli]
//   node koino/koino.js szavaz <javaslat> tamogat|ellenez|tartozkodik [kulonag]
//   node koino/koino.js mentes <fájl>            — a kulcs kimentése
//   node koino/koino.js orjarat [perc] [port]    — ⭐ a készülék MAGÁTÓL dolgozik
//   node koino/koino.js figyel [port]            — kaput nyit: fogadja a cserét
//   node koino/koino.js csere                    — csere MINDEN társsal (a lista szerint)
//   node koino/koino.js csere <cím> [port]       — csere egy megadott készülékkel
//   node koino/koino.js tarsak                   — kik a társaim, és mikor sikerült
//   node koino/koino.js tars <cím> [port] [név]  — társ felvétele
//   node koino/koino.js tars torol <cím> [port]  — társ levétele
//   node koino/koino.js ujjlenyomat [napok]      — „ugyanazt látjuk-e?" két készüléken
//   node koino/koino.js tukor <cím> [port]       — ⭐ kívülről hogy látszom? (STUN helyett)
//   node koino/koino.js cimek                    — a saját címeim (a csere-hez)
//   node koino/koino.js kapu [port] [fe80::…]    — megkéri a routert, nyisson kaput
//
// Bárhol, ahol azonosítót kér, elég a RÖVIDÍTÉSE is (mint a gitben).
//
// ===== KÉT KÉSZÜLÉK EGY GÉPEN (Szakasz 2 / 1. lépés) =====
//
// A `KOINO_ADAT` változóval két külön „készülék" játszható el ugyanazon a gépen:
//
//   1. ablak:  KOINO_ADAT=./adat-A node koino/koino.js figyel 7373
//   2. ablak:  KOINO_ADAT=./adat-B node koino/koino.js csere 127.0.0.1 7373
//
// A két mappának saját kulcsa van, tehát valóban két e-ember — nem ugyanaz kétszer.

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  esemenyTarNyitasa, kulcsTarolo, tarsakTarolo, szeletJegyzekTarolo, felszabaditasTarolo, alapHely
} from './js/tar/fajlTar.js';
import {
  kulcsparBiztositasa, nyilvanosKulcsSzovegesen, rovidAzonosito, kulcsparKimentese
} from './js/kulcs/kulcsTar.js';
import { koinoEsemenyei, sajatLancEsemenyei, esemenyLekerese } from './js/tar/esemenyTar.js';
import { allapotSzamitasa, szetosztottPontok, elakadtPontok } from './js/allapot/allapotSzamitas.js';
import { ALLASPONT_MUVELET } from './js/allapot/szabalyok.js';
import { javaslatokSzamitasa, sajatSzavazat } from './js/allapot/javaslatSzamitas.js';
import { szerkesztesiEgyezmenyekAlkalmazasa } from './js/allapot/szerkesztesiVegrehajtas.js';
import { felszabaditas, buliVolt, MEGULEPEDES_BULIK } from './js/allapot/felszabaditas.js';
import {
  koinoLetrehozasa, gondolatLetrehozasa, kategoriaLetrehozasa, gondolatTipusLetrehozasa, tudatpontRendezese, ertekJavaslat,
  javaslatLetrehozasa, szavazas, allasfoglalas, TUDATPONT_KERET,
  // ⭐ A SZAKASZ 4 HÉT MŰVELETE (2026-09-12) — eddig egyik sem volt elérhető kézzel.
  belepes, meghivas, felhatalmazas, tanusitas, bemutatkozas, lattam, felhatalmazasVisszavonasa
} from './js/muveletek.js';
import { tagE, tanusithatE, lepcso2E, ujIdentitasNezet } from './js/allapot/identitas.js';
import { megbizasAllapota, tanusitoiTorlodas } from './js/allapot/jelzesek.js';
import { figyeloIndulasa, csereVonalon, parbeszed, szeletHozatala } from './js/csere/vonal.js';
import { allasOsszeallitasa } from './js/csere/csere.js';
// ⭐ A BELÉPŐ TÉR (5.6): a koinók FÖLÖTTI nézet — a D25 tere.
import { terKartyai } from './js/allapot/ter.js';
// ⭐ A KÉZI ÚT (4. szabály): fájlba vinni és fájlból hozni — ugyanazon a kapun, mint a hálózat.
import { kivitelSzovege, behozatalSzovegbol } from './js/csere/fajlCsere.js';
import {
  tarsHozzaadasa, tarsTorlese, tarsakSorrendje, korbeCsere,
  sajatCimekKiszurese, sajatCimE,
  szeletCimMegjegyzese, szeletCimei, szeletJegyzekTakaritasa
} from './js/csere/tarsak.js';
import { pajzsfuras, tcpPajzsfuras, kulsoCim } from './js/csere/pajzsfuro.js';
import { kapuNyitasa, ALAP_PORT as FELULET_PORT } from './js/felulet/kapu.js';
import {
  pakliOldal, ujPakliNezet, entitasSzovege, entitasTudatpontja, entitasReszletei, entitasKuszobei,
  hianyzoFelmenok
} from './js/allapot/pakli.js';
import { csereUdpResen } from './js/csere/udpVonal.js';
import { helyiFelfedezes, felfedezoValaszolo } from './js/csere/helyiFelfedezes.js';
import { sajatIPv6, pcpKapuKerese, upnpKorkerdes } from './js/csere/kapunyitas.js';
import { allapotUjjlenyomata } from './js/allapot/osszehasonlitas.js';
import { lenyomat } from './js/esemeny/kanonikusAlak.js';

// ===== ÁLLANDÓK =====

const KOINO = process.env.KOINO_AZONOSITO ?? 'sajat';
const KEZDO_PONT = 100;
const NAP = 86400 * 1000;
const ALAP_PORT = 7373;

// A napló alapból néma (a koino minden metódusa naplóz) — KOINO_NAPLO=1 bekapcsolja
const naplo = console.log;
if (!process.env.KOINO_NAPLO) { console.log = () => {}; console.warn = () => {}; }
const kiir = (szoveg = '') => process.stdout.write(szoveg + '\n');

const SZIN = process.stdout.isTTY
  ? { jo: '\x1b[32m', nem: '\x1b[31m', halvany: '\x1b[90m', vastag: '\x1b[1m', vege: '\x1b[0m' }
  : { jo: '', nem: '', halvany: '', vastag: '', vege: '' };

// ===================================
// INDULÁS: kulcs + tár
// ===================================

const tarolo = kulcsTarolo();
const { kulcspar, ujE } = await kulcsparBiztositasa(tarolo);
const szerzo = await nyilvanosKulcsSzovegesen(kulcspar.publicKey);
const tar = await esemenyTarNyitasa(KOINO);

// ⭐ Az elakadt tudatpontok órája — HELYI feljegyzés, nem esemény (3. szabály).
const felszabaditasJegyzet = felszabaditasTarolo();

const kornyezet = { koino: KOINO, kulcspar, szerzo, tar };

if (ujE) {
  kiir(SZIN.vastag + 'Új kulcs készült — ez mostantól a személyazonosságod.' + SZIN.vege);
  kiir('  ' + rovidAzonosito(szerzo));
  kiir(SZIN.halvany + '  A kulcs helye: ' + tarolo.fajl + SZIN.vege);
  kiir(SZIN.halvany + '  Mentsd el: node koino/koino.js mentes <fájl>' + SZIN.vege);
  kiir();
}

// ===================================
// SEGÉD: AZONOSÍTÓ-RÖVIDÍTÉS FELOLDÁSA
// ===================================

/**
 * Egy rövidített azonosítót teljesre egészít ki (mint a git).
 * @param {string} toredek
 * @param {Iterable<string>} lehetosegek
 * @returns {string}
 */
function feloldas(toredek, lehetosegek) {
  const talalatok = [...lehetosegek].filter((a) => a.startsWith(toredek));
  if (talalatok.length === 1) return talalatok[0];
  if (talalatok.length === 0) throw new Error('Nincs ilyen azonosító: ' + toredek);
  throw new Error('Több azonosító is illik ide (' + talalatok.length + ') — írj többet belőle.');
}

// ===================================
// ⭐⭐ AZ IDENTITÁS KÉZI ÚTJA (2026-09-12) — a 4. szabály pótlása
// ===================================
//
// ⛔⛔ EGY MÁSIK SESSION KÓD-ÁTNÉZÉSE TALÁLTA: a Szakasz 4 teljes gépezete (két lépcsős
// beléptetés, kontraszt-jelzés, visszavonás — D54–D63, **52 önpróbával bizonyítva**)
// megépült, zöld volt, és **senki nem érte el**. Mérve: a `muveletek.js` tizenhat műveletet
// exportál, a `koino.js` kilencet importált; az `identitas.js` és a `jelzesek.js` egyetlen
// importálója a **saját próbája** volt.
//
// ⚠️ Ez ugyanaz a hiba, mint az `altalanos`-nál (2026-09-10), csak nagyobb léptékben — és a
// legélesebb következménye: **a visszavonás elérhetetlen volt.** A CLAUDE.md szerint *„nem a
// kapu véd, hanem hogy a rossz tanúsító elveszíti a szerepét"* — épp ezt nem tudta kimondani
// senki.

/**
 * A SAJÁT HORGONYOM: az én `Belepes` eseményem ebben a koinóban.
 *
 * ⭐ Minden rólam szóló esemény (meghívás, felhatalmazás, tanúsítás) erre a szeletre mutat,
 * és minden általam kiadott állítás **magával hozza** a horgonyomat (`sajatBelepes`) — hogy
 * az ellenőrzés mutató-követés legyen, ne keresés. Ezért a parancsoknak **nem kell beírni**:
 * a saját láncomból kiolvassuk.
 *
 * ⚠️ Az ALAPÍTÓ kivétel: neki a `KoinoLetrehozas` a horgonya (ő a rekurzió alapesete).
 */
async function sajatHorgonyom() {
  const lanc = await sajatLancEsemenyei(tar, szerzo);
  const belepesem = lanc.find((e) => e.koino === KOINO && e.tipus === 'Belepes');
  if (belepesem) return belepesem.azonosito;

  const alapitasom = lanc.find((e) => e.koino === KOINO && e.tipus === 'KoinoLetrehozas');
  if (alapitasom) return alapitasom.azonosito;
  return null;
}

/** Minden `Belepes`/`KoinoLetrehozas` horgony ebben a koinóban — a rövid azonosító feloldásához. */
async function horgonyok() {
  const esemenyek = await koinoEsemenyei(tar, KOINO);
  return esemenyek
    .filter((e) => e.tipus === 'Belepes' || e.tipus === 'KoinoLetrehozas')
    .map((e) => e.azonosito);
}

/**
 * Egy MÁSIK ember horgonyából kiolvassa, KI ő — és összeállítja az állítás adatait.
 *
 * ⭐ Miért elég a horgony? Mert a `kit` (a nyilvános kulcs) **kiszámítható belőle**: a horgony
 * egy aláírt esemény, aminek a szerzője maga a másik ember. Ha kézzel kellene mindkettőt
 * beírni, **el lehetne rontani** — és egy idegen szeletébe tett állítás nem számít.
 * *Amit le lehet vezetni, azt ne kelljen bemondani.*
 */
async function allitasAdatai(horgonyToredek) {
  if (!horgonyToredek) throw new Error('Melyik horgonyra? (a másik ember `belep`-jének azonosítója)');
  const horgonya = feloldas(horgonyToredek, await horgonyok());

  const horgonyEsemeny = await esemenyLekerese(tar, horgonya);
  if (!horgonyEsemeny) throw new Error('Nem ismerem ezt a horgonyt: ' + horgonyToredek);

  const sajatBelepes = await sajatHorgonyom();
  if (!sajatBelepes) {
    throw new Error('Előbb neked is be kell lépned ebbe a koinóba: node koino/koino.js belep');
  }
  return { kit: horgonyEsemeny.szerzo, horgonya, sajatBelepes };
}

/** A jelenlegi állapot és a javaslatok, adott időpontra. */
async function kepetKeszit(napokMulva = 0) {
  const esemenyek = await koinoEsemenyei(tar, KOINO);
  const allapot = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, Date.now() + napokMulva * NAP);

  // ⭐ A HARMADIK FÁZIS (2026-09-06): az elfogadott szerkesztési egyezményeket RÁVEZETJÜK az
  // entitásokra. ⚠️ Eddig ez hiányzott: a javaslat elfogadódott, az egyezmény megszületett,
  // a gondolat címe mégis a régi maradt. A `pakli.js` ugyanezt a három fázist futtatja —
  // így a parancssor és a lap **ugyanazt** mondja.
  await szerkesztesiEgyezmenyekAlkalmazasa(allapot, javaslatok);

  return { esemenyek, allapot, javaslatok };
}

// ===================================
// ⭐⭐ AZ ELAKADT TUDATPONT FELSZABADÍTÁSA
// ===================================

/**
 * A készülék MAGÁTÓL visszaveszi a pontot a törölt gondolatokról — megülepedés után.
 *
 * ⭐ MIÉRT SZABAD EZT A KÉSZÜLÉKNEK? Mert a koino **az én készülékemen fut, az én
 * kulcsommal**: nem más ír alá helyettem, hanem a saját készülékem könyvel. A `javaslat`
 * parancs ma is aláír egy második eseményt magától (a tudatpontot a javaslatra).
 *
 * ⚠️ ÉS AMIÉRT NEM AZONNAL: egy késve érkező, de határidőn belüli szavazat még
 * visszafordíthatja a törlést — ilyenkor a gondolat a pontom NÉLKÜL térne vissza.
 * Részletek és próbák: `js/allapot/felszabaditas.js`.
 *
 * @param {boolean} [hangos] - írja-e ki, mit tett
 * @returns {Promise<number>} hány pontot szabadított fel
 */
async function elakadtPontokFelszabaditasa(hangos = false, kellBuli = MEGULEPEDES_BULIK,
                                          sikeresTarsak = 0) {
  const { allapot } = await kepetKeszit();

  // ⭐ ELŐBB A BULI, AZTÁN A TERV. Ha ez a hívás egy csere-kör után jött, és felelt valaki,
  // az egy bulival több — a terv már ezzel számol.
  const jegyzet = buliVolt(await felszabaditasJegyzet.olvas(), sikeresTarsak);
  const terv = felszabaditas(allapot, szerzo, jegyzet, kellBuli);

  // A feljegyzést AKKOR is írjuk, ha még nincs mit felszabadítani — a számláló ilyenkor indul.
  await felszabaditasJegyzet.ir(terv.jegyzet);

  // ⭐ A BEMONDOTT ÖSSZEGET NEM MI ADJUK: a `tudatpontRendezese` a SAJÁT LÁNCBÓL számolja
  // (`sajatKiosztott`) — épp azért, hogy ne csúszhasson el attól, amit az ellenőrző számol.
  // A `felszabaditoLepesek` ugyanezt az aritmetikát mondja ki tisztán, a felület kedvéért.
  let osszesen = 0;
  for (const tetel of terv.feloldhato) {
    await tudatpontRendezese(kornyezet, tetel.entitas, 0);
    osszesen += tetel.pont;
  }

  if (hangos && osszesen > 0) {
    kiir(SZIN.halvany + '↩ ' + osszesen + ' tudatpont felszabadult törölt gondolatokról ('
      + terv.lepesek.length + ' db) — a keretedbe visszakerült.' + SZIN.vege);
  }
  if (hangos && terv.varakozok.length) {
    const v = terv.varakozok[0];
    kiir(SZIN.halvany + '⏳ ' + terv.varakozok.reduce((s, x) => s + x.pont, 0)
      + ' tudatpont törölt gondolaton áll — ' + v.tisztaBulik + '/' + v.kell
      + ' buli telt el azóta; ha nem jön újabb hír, magától felszabadul.' + SZIN.vege);
  }
  return osszesen;
}

// ===================================
// A PARANCSOK
// ===================================

const [parancs, ...ervek] = process.argv.slice(2);

/** Ezrelék → olvasható százalék. */
const szazalek = (ezrelek) => (ezrelek / 10).toFixed(1).replace('.0', '') + '%';

// ⭐ MENNYI ADAT MENT EL? (D35) A csere ára befogadási kérdés: egy mobilos e-embernek a
// számláján jelenik meg. Ezért minden csere kiírja — ami nem látszik, azt nem lehet
// olcsóvá tenni.
// Az őrjárat sorai elé — hogy utólag látszódjon, mikor mi történt.
const ora = () => new Date().toLocaleTimeString('hu-HU');

// ⭐ NYOMOZATI SEGÉD A PAJZSFÚRÓHOZ (Csaba kérése: a sikertelen próbálkozás is mondjon
// valamit). Egy hibakód önmagában semmit nem jelent annak, aki nem hálózatos — de
// mindegyik MÁS következő lépést jelent, ezért érdemes kimondani.
const HIBA_MAGYARAZAT = {
  ENETUNREACH: 'nincs útvonal — EZEN a hálózaton nincs IPv6-kapcsolat (a csomag el sem indult)',
  EHOSTUNREACH: 'van útvonal, de a cél gép nem érhető el',
  ECONNREFUSED: '⭐ VALAKI VÁLASZOLT (elutasítással) — tehát a csomagunk ODAÉRT!',
  ETIMEDOUT: 'némán eldobták — ez tűzfalra vall (a csomag elindult, de nem jött válasz)',
  EADDRINUSE: 'a helyi port foglalt a SAJÁT gépünkön (fut még egy korábbi fúró?)',
  EACCES: 'a rendszer nem engedi ezt a portot használni',
  EPERM: 'a rendszer nem engedi ezt a portot használni',
  EADDRNOTAVAIL: 'ez a helyi cím nem létezik ezen a gépen'
};

const hibaMagyarazat = (ok) => {
  for (const [kod, szoveg] of Object.entries(HIBA_MAGYARAZAT)) {
    if (String(ok).includes(kod)) return szoveg;
  }
  if (String(ok).includes('nem válaszolt')) return HIBA_MAGYARAZAT.ETIMEDOUT;
  return null;
};

/** A saját globális IPv6-címeink — a fúró elé és a bukások mellé. */
async function sajatGlobalisCimek() {
  const halozat = (await import('node:os')).networkInterfaces();
  const cimek = [];
  for (const lista of Object.values(halozat)) {
    for (const cim of lista ?? []) {
      if (cim.internal || cim.family !== 'IPv6') continue;
      const eleje = cim.address[0];
      if (eleje === '2' || eleje === '3') cimek.push(cim.address);
    }
  }
  return cimek;
}

// ⭐ A TERJEDŐ CÍMJEGYZÉK (D36–D38). Amit hirdetünk: a saját társaink címei. Ettől a
// hálózat MAGÁTÓL bővül — nem kell tudnod senki címét ahhoz, hogy a koinód megtalálja a
// közösséget. ⚠️ Ezek NEM események: a cím múlandó körülmény, nem igazság.
async function hirdetendoCimek(tarolo) {
  const lista = await tarolo.olvas();
  return tarsakSorrendje(lista).map((t) => ({ hoszt: t.hoszt, port: t.port }));
}

/**
 * A készülék ÖSSZES saját címe — ehhez mérjük, mi a „mi vagyunk".
 *
 * ⚠️ MIÉRT AZ ÖSSZES, ÉS NEM CSAK A TÜKÖR? Mert egy készüléknek több címe van (IPv4 a
 * wifin, több IPv6, esetleg vezetékes), és a társak BÁRMELYIKET hirdethetik rólunk.
 * Mérve (2026-08-30): a laptop saját IPv6-címe így került a listájára, majd a cserén
 * TOVÁBB is terjedt a telefonra — a tükör (IPv4) alapján szűrő ezt nem fogta meg.
 */
async function sajatOsszesCim(tukor = null) {
  const halozat = (await import('node:os')).networkInterfaces();
  const cimek = [];
  for (const lista of Object.values(halozat)) {
    for (const cim of lista ?? []) cimek.push(cim.address);
  }
  if (tukor?.cim) cimek.push(tukor.cim);      // amit a másik lát belőlünk (NAT mögül)
  return cimek;
}

/**
 * A cserén kapott címeket felvesszük a listánkra — de sosem írjuk felül a sajátunkat.
 *
 * ⚠️ ÉS ÖNMAGUNKAT SEM VESSZÜK FEL. A társak MINKET is hirdetnek egymásnak — ez így
 * helyes, sőt ez a terjedő címjegyzék lényege (D36–D39) —, de a HÍVÁSI listára a saját
 * címünk nem való: a készülék önmagát hívogatná minden körben.
 *
 * ⭐ KÉT KÜLÖN DOLOG, ami eddig egy fájlban élt: „kit hívjak" (ez a lista) és „kiről
 * meséljek" (a hirdetés). A sajátunkat TOVÁBBRA IS elmondjuk másoknak — csak nem hívjuk.
 *
 * @param {Object} tarolo
 * @param {Array} kapott
 * @param {{cim: string, port: number}} [sajat] - aminek a másik LÁT minket (a tükör)
 */
async function kapottCimekBeolvasztasa(tarolo, kapott, sajat = null) {
  if (!kapott?.length) return 0;
  const { cimek: idegenek } = sajatCimekKiszurese(kapott, await sajatOsszesCim(sajat));

  let lista = await tarolo.olvas();
  const elotte = lista.length;
  for (const c of idegenek) {
    try { lista = tarsHozzaadasa(lista, { hoszt: c.hoszt, port: c.port }); } catch { /* rossz cím: kihagyjuk */ }
  }
  if (lista.length !== elotte) await tarolo.ir(lista);
  return lista.length - elotte;
}

// ⚠️ A társ-listát több helyről is ÍRJUK: az őrjárat köre, és külön minden bekopogó
// kiszolgálása (D39). Két átfedő írásnál az egyik némán elveszne — ezért sorba tesszük
// őket. Nem zár, csak sorrend: a fájl kicsi, egy írás ezredmásodperc.
let cimIrasSor = Promise.resolve(0);

/** Beolvasztás sorban, hibától védve — a cím-tanulás sose döntse el a cserét. */
function cimeketTanul(tarolo, kapott, sajat = null) {
  cimIrasSor = cimIrasSor
    .then(() => kapottCimekBeolvasztasa(tarolo, kapott, sajat))
    .catch((hiba) => {
      console.warn('cimeketTanul - nem sikerült felírni', { ok: hiba.message });
      return 0;
    });
  return cimIrasSor;
}

const adatMennyiseg = (eredmeny) => {
  const bajt = (eredmeny.bajtKuldott ?? 0) + (eredmeny.bajtKapott ?? 0);
  return bajt < 1024 ? bajt + ' bájt' : (bajt / 1024).toFixed(1) + ' KB';
};

async function allapotKiirasa(napokMulva) {
  const { allapot, javaslatok, esemenyek } = await kepetKeszit(napokMulva);

  if (!allapot.koino.nev) {
    kiir('Még nincs koinód. Hozd létre:');
    kiir('  node koino/koino.js koino "A koino neve"');
    return;
  }

  kiir(SZIN.vastag + allapot.koino.nev + SZIN.vege
    + SZIN.halvany + '   (te: ' + rovidAzonosito(szerzo) + ')' + SZIN.vege);
  kiir(SZIN.halvany + 'tudatpontjaid: ' + szetosztottPontok(allapot, szerzo) + ' / ' + TUDATPONT_KERET
    + ' · eseményeid: ' + (await sajatLancEsemenyei(tar, szerzo)).length
    + ' · esemény összesen: ' + esemenyek.length
    + (napokMulva ? ' · NÉZET: ' + napokMulva + ' nap múlva' : '') + SZIN.vege);

  // ----- ⭐⭐ AZ AZONOSSÁG (2026-09-12) -----
  //
  // ⛔ Eddig SEHOL nem látszott: a két lépcsős beléptető kiszámolt mindent, de az állapot
  // egy szót sem szólt róla. ⚠️ A CLAUDE.md szerint *„a gépi segítség értéke az
  // ÉSZREVÉTELBEN van, nem a döntésben"* — az észrevételhez viszont **látszania kell**.
  //
  // ⭐ HÁROM KÉRDÉS, ugyanazzal a vázzal (D56): TAG ← meghívás · TANÚSÍTHAT ← felhatalmazás ·
  // 2. LÉPCSŐS ← tanúsítás. ⚠️ A „nem" kétféle: **nincs meg** vagy **nem ellenőrizhető** (a
  // lánc egy része hiányzik) — és ezt a kettőt sosem mossuk össze (D19).
  const sajatBelepes = await sajatHorgonyom();
  kiir();
  kiir(SZIN.vastag + 'AZONOSSÁG' + SZIN.vege);
  if (!sajatBelepes) {
    kiir(SZIN.halvany + '  Még nincs horgonyod ebben a koinóban: node koino/koino.js belep'
      + SZIN.vege);
  } else {
    const nezet = ujIdentitasNezet();
    const kerdesek = [
      ['tag', await tagE(tar, KOINO, sajatBelepes, nezet), '1. lépcső: minden mehet'],
      ['tanúsíthat', await tanusithatE(tar, KOINO, sajatBelepes, nezet), 'a tanúsítás megbízása'],
      ['2. lépcsős', await lepcso2E(tar, KOINO, sajatBelepes, nezet), 'a pénztárca (D11)']
    ];
    kiir('  ' + SZIN.halvany + 'horgonyod: ' + sajatBelepes.slice(0, 8) + SZIN.vege);
    for (const [nev, valasz, mire] of kerdesek) {
      // ⚠️ Három jel, nem kettő: ✔ igen · ✘ nem · ? nem ellenőrizhető (hiány, nem vád).
      const jel = valasz.igen ? SZIN.jo + '✔' : (valasz.ellenorizheto ? SZIN.nem + '✘' : SZIN.halvany + '?');
      kiir('  ' + jel + SZIN.vege + ' ' + nev.padEnd(12)
        + SZIN.halvany + valasz.ok + ' — ' + mire + SZIN.vege);
    }

    // ⭐ MEGBÍZÁS, NEM PONTSZÁM (D60): „hányan bízták rá a tanúsítást" — soha nem
    // „becsületesség: N". A különbség nem szépészeti: egy jellem-szám hírnév-rendszerré
    // romlik (D18/1, D49/b), ez viszont TÉNY, és nem rólam szól, hanem arról, amit MÁSOK tettek.
    const megbizas = await megbizasAllapota(tar, KOINO, sajatBelepes);
    kiir('  ' + SZIN.halvany + megbizas.felhatalmazasok + '-en bízták rád a tanúsítást'
      + (megbizas.visszavontak ? ' (' + megbizas.visszavontak + ' visszavonva)' : '')
      + ' · ' + megbizas.tanusitasok + ' tanúsításod van'
      + (megbizas.ellenorizheto ? '' : ' · ⚠️ nem ellenőrizhető') + SZIN.vege);

    // ⭐⭐⭐ A VALÓDI VÉDELEM: a kontraszt-jelzés. *„Hány olyan embert tanúsítottál, akinek
    // nincs önálló élete a közösségben?"* — a becsületes alapvonal 0,3, a megvett tanúsítóé
    // több száz. ⛔ Ez SOHA nem ítél: szám, nem vád, és a döntés-réteg nem is látja.
    const torlodas = await tanusitoiTorlodas(tar, KOINO, sajatBelepes);
    if (torlodas.tanusitott) {
      kiir('  ' + SZIN.halvany + 'akiket tanúsítottál: ' + torlodas.tanusitott
        + ' · ebből önálló élet nélkül: ' + torlodas.magukbanAllok
        + (torlodas.ellenorizheto ? '' : ' · ⚠️ nem ellenőrizhető') + SZIN.vege);
      kiir('  ' + SZIN.halvany + '⚠️ Ez SZÁM, nem ítélet — a koino bejelent, nem bíráskodik (D19).'
        + SZIN.vege);
    }
  }

  // ----- ⭐ ELAKADT TUDATPONT (2026-09-07) -----
  // A törölt gondolatra tett pontom a keretemben marad, amíg vissza nem veszem. ⚠️ Ezt
  // KI KELL ÍRNI, különben a szám (`tudatpontjaid`) érthetetlen: „miért van 300-am
  // kiosztva, ha csak két gondolatot látok?" *A koino bejelent, nem hallgat (D19).*
  const elakadt = elakadtPontok(allapot, szerzo);
  if (elakadt.length) {
    const osszeg = elakadt.reduce((s, e) => s + e.pont, 0);
    kiir(SZIN.halvany + '↩ ebből ' + osszeg + ' pont törölt gondolaton áll ('
      + elakadt.length + ' db) — a készülék magától visszaveszi, vagy: felszabadit'
      + SZIN.vege);
  }

  // ----- ELLENTMONDÁSOK (D19: bejelent, nem büntet) -----
  if (allapot.ellentmondasok.length || allapot.idoEllentmondasok.length || allapot.kivetelek.length) {
    kiir();
    if (allapot.ellentmondasok.length) {
      kiir(SZIN.nem + '⚠ ' + allapot.ellentmondasok.length + ' elágazás (két aláírás ugyanarról a pontról)' + SZIN.vege);
    }
    if (allapot.idoEllentmondasok.length) {
      kiir(SZIN.nem + '⚠ ' + allapot.idoEllentmondasok.length + ' visszafelé lépő idő a saját láncban' + SZIN.vege);
    }
    for (const k of allapot.kivetelek) {
      kiir(SZIN.nem + '⚠ nem számít: ' + k.tipus + ' — ' + k.ok + SZIN.vege);
    }
  }

  // ----- GONDOLATOK -----
  kiir();
  kiir(SZIN.vastag + 'GONDOLATOK' + SZIN.vege);
  if (allapot.entitasok.size === 0) {
    kiir(SZIN.halvany + '  (még nincs)' + SZIN.vege);
  }
  // A MEGJELENÍTÉS sorrendje: a legtöbb tudatpontot kapott elöl (holtversenynél az
  // azonosító dönt, hogy két gép ugyanazt lássa). ⚠️ Ez a felület döntése, nem a
  // számításé — az állapot maga determinisztikus sorrendben áll elő (allapotSzamitas.js).
  const rangsor = [...allapot.entitasok.values()].sort((a, b) =>
    b.osszesPont - a.osszesPont || (a.azonosito < b.azonosito ? -1 : 1));

  for (const e of rangsor) {
    const sajat = e.hozzajarulok.get(szerzo)?.pont ?? 0;
    kiir('  ' + SZIN.halvany + e.azonosito.slice(0, 8) + SZIN.vege + '  ' + e.cim);
    kiir('      ' + SZIN.halvany + e.meret + ' bájt · összes pont: ' + e.osszesPont
      + ' · a tiéd: ' + sajat + ' · hozzájárulók: ' + e.hozzajarulok.size + SZIN.vege);
    if (e.szoveg) kiir('      ' + SZIN.halvany + e.szoveg + SZIN.vege);
  }

  // ----- JAVASLATOK -----
  //
  // ⭐⭐ KÉT FEJLÉC, mert KÉT FAJTA VAN (D27, és a CLAUDE.md névszabálya: „a javaslat szó
  // önmagában gyűjtőnév"). A számok és a rész-sorok ugyanazok — a **gépezet ugyanaz** —,
  // csak a következmény más, ezért egy rajzoló szolgálja ki mindkettőt.
  const folyamatban = [...javaslatok.values()];
  const javaslatKiirasa = (j) => {
    const kik = j.erintettek ?? [];
    const szin = j.statusz === 'elfogadva' ? SZIN.jo : j.statusz === 'elvetve' ? SZIN.nem : '';
    kiir('  ' + SZIN.halvany + j.azonosito.slice(0, 8) + SZIN.vege
      + '  ' + szin + j.statusz.toUpperCase() + SZIN.vege
      + '  ' + (kik.length > 1 ? kik.length + ' entitás' : j.muvelet + ': „' + (j.valtozas?.cim ?? '—') + '"'));
    // ⭐⭐ MINDEN ÉRINTETT SORONKÉNT, A SAJÁT DÖNTÉSÉVEL — a művelet entitásonkénti, ÉS a
    // döntés is: minden résznek teljesítenie kell a SAJÁT küszöbeit (töredék-modell).
    // Ezért nem lehet egyetlen sorral összefoglalni; a rész-sorok mutatják meg, MELYIK
    // rész buktatja el az egészet.
    for (const r of (j.reszek ?? [])) {
      const jel = r.kuszobTeljesul ? SZIN.jo + '✔' : SZIN.nem + '✘';
      // ⚠️ KÉTFÉLE HIÁNY, KÉTFÉLE SZÓ: amit ismertünk és eltűnt (törlés vagy felejtés),
      // az „már nincs"; amiről sosem hallottunk, az „ismeretlen". A kettő összemosása
      // pont azt a különbséget tüntetné el, amit a D19 véd.
      const cel = allapot.entitasok.get(r.entitas)?.cim
        ?? (allapot.elfelejtettek.includes(r.entitas) ? '— már nincs —' : 'ismeretlen');
      kiir('      ' + SZIN.halvany + '↳ ' + jel + SZIN.vege + SZIN.halvany + ' ' + r.muvelet + ': '
        + '„' + cel + '"'
        + (r.valtozas?.cim ? ' → „' + r.valtozas.cim + '"' : '')
        + '  👍 ' + r.tamogatok + ' 👎 ' + r.ellenzok + ' 🤷 ' + r.tartozkodok
        + ' (' + r.szavazok + '/' + r.nevezo + ')'
        + ' · ' + szazalek(r.tamogatottsagEzrelek) + SZIN.vege);
    }
    kiir('      ' + SZIN.halvany
      + 'bizonyosság ' + szazalek(j.bizonyossagiMutato) + SZIN.vege);
    kiir('      ' + SZIN.halvany + (j.statusz === 'folyamatban' ? 'zárul: ' : 'lezárult: ')
      + new Date(j.lezarasIdeje).toLocaleString('hu-HU')
      + ' (döntési idő ' + Math.round(j.dontesiIdo / 3600) + ' óra)'
      + (j.kesoiSzavazatok ? ' · ' + j.kesoiSzavazatok + ' késői szavazat nem számít' : '')
      + SZIN.vege);
    const enyem = sajatSzavazat(allapot.szamitok, j.azonosito, szerzo);
    if (enyem) kiir('      ' + SZIN.halvany + 'a szavazatod: ' + enyem + SZIN.vege);
  };

  const szerkesztesiek = folyamatban.filter((j) => j.fajta !== 'altalanos');
  const altalanosak = folyamatban.filter((j) => j.fajta === 'altalanos');

  kiir();
  kiir(SZIN.vastag + 'SZERKESZTÉSI JAVASLATOK' + SZIN.vege);
  if (!szerkesztesiek.length) kiir(SZIN.halvany + '  (még nincs)' + SZIN.vege);
  for (const j of szerkesztesiek) javaslatKiirasa(j);

  // ⭐⭐⭐ ÁLTALÁNOS JAVASLATOK (D27) — a közösség álláspontja. ⚠️ Ha elfogadják, **semmi
  // nem hajtódik végre**; az egyezmény MAGA az álláspont, és él tovább (állásfoglalások).
  if (altalanosak.length) {
    kiir();
    kiir(SZIN.vastag + 'ÁLTALÁNOS JAVASLATOK' + SZIN.vege);
    for (const j of altalanosak) javaslatKiirasa(j);
  }

  // ----- ⭐ KÜLÖNVÁLÁSOK (2026-09-08) -----
  // *„Aki elmegy, viszi a súlyát."* Ez nem mellékes esemény: egy gondolat kettévált, és
  // mindkét ág él tovább. ⚠️ Ki kell írni, különben a pakliban csak egy „új" gondolat
  // bukkanna fel magyarázat nélkül.
  if (allapot.kulonvalasok?.length) {
    kiir();
    kiir(SZIN.vastag + 'KÜLÖNVÁLÁSOK' + SZIN.vege);
    for (const kv of allapot.kulonvalasok) {
      const foag = allapot.entitasok.get(kv.foag);
      const ag = allapot.entitasok.get(kv.kulonvaltAg);
      kiir('  ⑂ ' + SZIN.halvany + kv.foag.slice(0, 8) + SZIN.vege
        + ' „' + (foag?.cim ?? '—') + '"'
        + SZIN.halvany + '  ⟶  ' + SZIN.vege
        + SZIN.halvany + kv.kulonvaltAg.slice(0, 8) + SZIN.vege
        + ' „' + (ag?.cim ?? '—') + '"');
      kiir('      ' + SZIN.halvany + kv.atvittEmberek + ' ember vitte a régi változatot, '
        + kv.atvittPontok + ' tudatponttal' + SZIN.vege);
    }
  }

  // ----- EGYEZMÉNYEK -----
  const egyezmenyKiirasa = (j) => {
    const e = j.egyezmeny;
    const p = e.pillanatkep;
    const kik = e.erintettek ?? [];
    kiir('  ' + SZIN.jo + '📜 '
      + (kik.length > 1
        ? kik.map((r) => r.muvelet + ' „' + (allapot.entitasok.get(r.entitas)?.cim
            ?? (allapot.elfelejtettek.includes(r.entitas) ? '— már nincs —' : '?')) + '"').join(' + ')
        : e.muvelet + ': „' + (e.valtozas?.cim ?? '—') + '"') + SZIN.vege);
    kiir('      ' + SZIN.halvany + j.azonosito.slice(0, 8)
      + ' · megszületett: ' + new Date(e.megszuletett).toLocaleString('hu-HU')
      + ' · ' + p.tamogatok + '/' + p.szavazok + ' támogató (' + szazalek(p.tamogatottsagEzrelek) + ')'
      + ' · részvétel ' + szazalek(p.reszveteliEzrelek) + SZIN.vege);

    // ⭐⭐ A HATÁLY — csak az ÁLTALÁNOSNÁL van (D27). *A TÉNY örök (fent, a pillanatképben),
    // a HATÁLY viszont ÉL: hányan állnak mögötte MOST.* ⚠️ Enélkül az `allast` parancs
    // eredménye sehol nem látszana — a koino pedig **bejelent, nem hallgat** (D19).
    if (e.hataly) {
      const h = e.hataly;
      kiir('      ' + SZIN.halvany + 'hatály MOST: ' + SZIN.vege
        + SZIN.jo + '🤝 ' + h.csatlakozok.length + SZIN.vege + SZIN.halvany + ' csatlakozó · ' + SZIN.vege
        + SZIN.nem + '✋ ' + h.tiltakozok.length + SZIN.vege + SZIN.halvany + ' tiltakozó' + SZIN.vege
        + (h.utkozesek.length
          ? SZIN.halvany + ' · ⚡ ' + h.utkozesek.length + ' ütközés-jelölés' + SZIN.vege
          : ''));
      for (const u of h.utkozesek) {
        kiir('        ' + SZIN.halvany + '⚡ ütközik ezzel: ' + (u.masik ?? '?').slice(0, 8)
          + (u.indoklas ? ' — ' + u.indoklas : '') + SZIN.vege);
      }
      kiir('      ' + SZIN.halvany + '⚠️ Ebből semmi nem következik automatikusan (D27/6) — '
        + 'csak látszik, hányan állnak mögötte.' + SZIN.vege);
    }
  };

  const szerkesztesiEgyezmenyek = szerkesztesiek.filter((j) => j.egyezmeny);
  const altalanosEgyezmenyek = altalanosak.filter((j) => j.egyezmeny);

  kiir();
  kiir(SZIN.vastag + 'SZERKESZTÉSI EGYEZMÉNYEK' + SZIN.vege);
  if (!szerkesztesiEgyezmenyek.length) {
    kiir(SZIN.halvany + '  (még nincs — akkor születik, ha egy szerkesztési javaslatot elfogadnak)' + SZIN.vege);
  }
  for (const j of szerkesztesiEgyezmenyek) egyezmenyKiirasa(j);

  if (altalanosEgyezmenyek.length) {
    kiir();
    kiir(SZIN.vastag + 'ÁLTALÁNOS EGYEZMÉNYEK' + SZIN.vege);
    for (const j of altalanosEgyezmenyek) egyezmenyKiirasa(j);
    kiir(SZIN.halvany + '  Állást foglalni: node koino/koino.js allast <egyezmény> '
      + 'csatlakozik|tiltakozik|utkozik' + SZIN.vege);
  }
}

try {
  switch (parancs) {

    case undefined:
    case 'allapot': {
      // Előre nézés: `allapot 3` = mi lesz 3 nap múlva (a döntési idő napokban mérhető)
      await allapotKiirasa(parseInt(ervek[0], 10) || 0);
      break;
    }

    case 'kulcs': {
      kiir('Az azonosságod (a nyilvános kulcsod):');
      kiir('  ' + szerzo);
      kiir(SZIN.halvany + 'A kulcs fájlja: ' + tarolo.fajl + SZIN.vege);
      kiir(SZIN.halvany + 'Az adat helye:  ' + alapHely() + SZIN.vege);
      break;
    }

    case 'mentes': {
      const hova = ervek[0];
      if (!hova) throw new Error('Hova mentsem? node koino/koino.js mentes <fájl>');
      await writeFile(hova, await kulcsparKimentese(kulcspar), 'utf8');
      kiir('Elmentve: ' + hova);
      kiir(SZIN.nem + 'Aki ezt a fájlt megszerzi, a nevedben tud aláírni. Őrizd biztos helyen.' + SZIN.vege);
      break;
    }

    // ===================================
    // ⛔⛔ A KÉZI ÚT: FÁJLBA VINNI, FÁJLBÓL HOZNI (4. szabály)
    // ===================================
    //
    // *„Ha egy funkció csak online tud működni, az fojtópont."* A koinónak eddig öt
    // hálózati útja volt és **egy sem** kézi — a kézi út az adat-fájl másolása volt, amit
    // nem a program kínált, és ami semmit nem ellenőrzött.
    //
    // ⭐ A kivitt fájl alakja UGYANAZ, mint a táré (`esemenyek.jsonl`), tehát a lemásolt
    // adat-fájl is behozható — a régi kézi út nem veszett el, hanem ellenőrzötté vált.

    case 'kivisz': {
      const hova = ervek[0];
      if (!hova) {
        throw new Error('Hova vigyem? node koino/koino.js kivisz <fájl> [mind|sajat|<azonosító>]');
      }

      const { szoveg, darab, hatokor, bajt } = await kivitelSzovege(tar, KOINO, {
        hatokor: ervek[1] ?? 'mind',
        szerzo
      });

      if (darab === 0) {
        // ⚠️ NEM ÍRUNK ÜRES FÁJLT ÉS NEM HALLGATUNK: ha semmi nem jött ki, azt a hatókör
        // magyarázza (elgépelt azonosító, üres lánc) — mondjuk meg, ne kelljen kitalálni.
        kiir(SZIN.nem + 'Nincs mit kivinni ebben a hatókörben: ' + hatokor + SZIN.vege);
        break;
      }

      await writeFile(hova, szoveg, 'utf8');
      kiir('Kivíve: ' + hova);
      kiir('  ' + darab + ' esemény · ' + bajt + ' bájt · hatókör: ' + hatokor);
      kiir(SZIN.halvany
        + 'Vidd át bárhogyan (pendrive, e-mail, üzenet), és ott: behoz <fájl>.' + SZIN.vege);
      // ⚠️ A 6. SZABÁLY az ADAT-csomagra kemény — ezért mondjuk meg a bájtot, és ezért
      // van hatóköre a kivitelnek. A „saját lánc" a D21 ~1 KB/fő újjáépítési magja.
      if (hatokor === 'mind') {
        kiir(SZIN.halvany
          + 'Csak a saját láncod: kivisz <fájl> sajat — egy entitásé: kivisz <fájl> <azonosító>'
          + SZIN.vege);
      }
      break;
    }

    case 'behoz': {
      const honnan = ervek[0];
      if (!honnan) throw new Error('Honnan hozzam? node koino/koino.js behoz <fájl>');

      const szoveg = await readFile(honnan, 'utf8');
      const e = await behozatalSzovegbol(tar, KOINO, szoveg);

      kiir('Behozva: ' + honnan);
      kiir('  ' + SZIN.jo + e.uj + ' új esemény' + SZIN.vege
        + ' · ' + e.marMegvolt + ' már megvolt · ' + e.sorok + ' sor a fájlban');

      // ⭐⭐ ÉS AMIT NEM HALLGATUNK EL (D19). Mind a négy lista MEGNEVEZI, mi történt —
      // különben a „behozva" szó elfedné, hogy a fájl fele ki sem nyílt.
      if (e.idegen > 0) {
        kiir(SZIN.nem + '  ' + e.idegen + ' esemény MÁSIK koinóé — kihagyva.' + SZIN.vege);
      }
      if (e.hibasSorok.length > 0) {
        kiir(SZIN.nem + '  ' + e.hibasSorok.length + ' sor nem volt értelmezhető:' + SZIN.vege);
        for (const h of e.hibasSorok.slice(0, 5)) {
          kiir(SZIN.halvany + '    ' + h.sorszam + '. sor: ' + h.eleje + '…' + SZIN.vege);
        }
      }
      if (e.elutasitva.length > 0) {
        kiir(SZIN.nem + '  ' + e.elutasitva.length + ' esemény ELUTASÍTVA a kapunál:' + SZIN.vege);
        for (const el of e.elutasitva.slice(0, 5)) {
          kiir(SZIN.halvany + '    ' + rovidAzonosito(el.azonosito) + ': ' + el.ok + SZIN.vege);
        }
      }
      // ⚠️ AZ ELÁGAZÁS NEM HIBA, HANEM BIZONYÍTÉK (D17/D19): valaki két eseményt írt alá
      // ugyanarról a pontról. Mindkettő bent marad — együtt ők a bizonyíték.
      if (e.elagazasok.length > 0) {
        kiir(SZIN.nem + '  ⚠️ ' + e.elagazasok.length
          + ' ELÁGAZÁS derült ki (valaki két eseményt írt alá ugyanarról a pontról):' + SZIN.vege);
        for (const ag of e.elagazasok.slice(0, 5)) {
          kiir(SZIN.halvany + '    ' + rovidAzonosito(ag.szerzo)
            + ' · ' + ag.sorszam + '. esemény' + SZIN.vege);
        }
      }
      break;
    }

    case 'koino': {
      const nev = ervek[0];
      if (!nev) throw new Error('Mi legyen a koino neve?');
      await koinoLetrehozasa(kornyezet, nev, ervek[1]);
      kiir('A koino létrejött: ' + nev);
      break;
    }

    // ===================================
    // ⭐ A BELÉPŐ TÉR (5.6) — a koinók, amiket ez a készülék ismer
    // ===================================
    //
    // ⭐ A 4. SZABÁLY: a parancs a funkcióval EGYÜTT jön, nem utána. Kétszer is megtörtént
    // már (2026-09-10, 09-12), hogy egy megépült réteghez nem vezetett kézi út.

    case 'ter': {
      const { kartyak, koinok, csakAmitIsmerunk } = await terKartyai(alapHely(), {
        szerzo,
        rendezes: ervek[0] || undefined,
        irany: ervek[1] || undefined
      });

      kiir(SZIN.vastag + 'A BELÉPŐ TÉR' + SZIN.vege + '  (' + koinok + ' koino)');

      // ⛔⛔ A HATÁR KIMONDVA (D19). A kereső-réteg nélkül ez nem a világ összes koinója —
      // és a hallgatás itt teljességet ígérne, amit nem tudunk tartani.
      if (csakAmitIsmerunk) {
        kiir(SZIN.halvany
          + 'Csak amit EZ A KÉSZÜLÉK ismer — idegen koinók böngészéséhez kereső-réteg kell.'
          + SZIN.vege);
      }
      kiir();

      for (const k of kartyak) {
        // ⚠️ A név hiányozhat: ha az eseményeket fájlból hoztam be, lehet, hogy a koino
        // gondolatait ismerem, a SZÜLETÉSÉT nem. Nem találunk ki nevet (D19).
        const nev = k.nev ?? SZIN.halvany + '(nem ismerem a születését)' + SZIN.vege;
        const jel = k.enTagVagyok ? SZIN.jo + '✔' : SZIN.halvany + '·';
        kiir('  ' + jel + SZIN.vege + ' ' + nev
          + SZIN.halvany + '   [' + k.azonosito + ']' + SZIN.vege);

        // ⭐⭐ HÁROM SZÁM, NEM EGY — a létszám SÚLYA a különbségükben van. Egy koino, ahol
        // 900-an beléptek, de csak 12-nek van visszavezethető meghívási lánca, ránézésre
        // más, mint ahol 900-ból 900.
        let sor = '      ' + k.tagok + ' tag';
        if (k.nemEllenorizhetok > 0) sor += ' · ' + k.nemEllenorizhetok + ' nem ellenőrizhető';
        sor += ' · ' + k.belepok + ' belépő · ' + k.esemenyek + ' esemény';
        kiir(SZIN.halvany + sor + SZIN.vege);

        if (k.letrehozva) {
          kiir(SZIN.halvany + '      létrehozva: ' + new Date(k.letrehozva).toLocaleString('hu-HU')
            + ' (a szerző órája)' + SZIN.vege);
        }
        if (!k.enTagVagyok) {
          kiir(SZIN.halvany + '      ' + k.miert + SZIN.vege);
        }
      }

      if (koinok === 0) {
        kiir(SZIN.halvany + '  Még egy koinót sem ismersz. Indíts egyet: koino <név>'
          + SZIN.vege);
      }
      break;
    }

    // ===================================
    // KATEGÓRIA ÉS GONDOLATTÍPUS (5.4)
    // ===================================
    //
    // ⭐ A 4. SZABÁLY: amit a lapon meg lehet csinálni, azt a parancssorból is. Ha a
    // böngésző egyszer nem elérhető, a koino ettől még teljes.
    case 'kategoria':
    case 'gondolattipus': {
      const [nev, ikon, leiras] = ervek;
      if (!nev) throw new Error('Mi legyen a neve?');

      const kategoriaE = parancs === 'kategoria';
      const esemeny = await (kategoriaE ? kategoriaLetrehozasa : gondolatTipusLetrehozasa)(
        kornyezet, { nev, ikon, leiras });

      // ⭐ Tudatpont nélkül ez sem létezne (D14) — ugyanaz a szabály, mint a gondolatnál.
      const { allapot } = await kepetKeszit();
      await tudatpontRendezese(kornyezet, esemeny.azonosito, KEZDO_PONT, 'aktiv',
        szetosztottPontok(allapot, szerzo));

      kiir((kategoriaE ? 'Kategória' : 'Gondolattípus') + ' létrejött: '
        + esemeny.azonosito.slice(0, 8) + '  ' + (ikon ? ikon + ' ' : '') + '„' + nev + '"');
      kiir(SZIN.halvany + 'Az ikon lehet emoji vagy kép-cím; mindkettőt kezeli a kártya.'
        + SZIN.vege);
      break;
    }

    case 'gondolat': {
      const [cim, szoveg, tipusToredek, ...kategoriaToredekek] = ervek;
      if (!cim) throw new Error('Mi legyen a gondolat címe?');

      // ⭐ A besorolás elhagyható, és rövidítéssel is megadható — mint minden azonosító.
      let gondolatTipus = null;
      const kategoriak = [];
      if (tipusToredek || kategoriaToredekek.length) {
        const { allapot: kep } = await kepetKeszit();
        const besorolasok = [...kep.entitasok.values()]
          .filter((e) => e.tipus === 'Kategoria' || e.tipus === 'GondolatTipus')
          .map((e) => e.azonosito);

        if (tipusToredek) gondolatTipus = feloldas(tipusToredek, besorolasok);
        for (const t of kategoriaToredekek) kategoriak.push(feloldas(t, besorolasok));
      }

      const esemeny = await gondolatLetrehozasa(kornyezet,
        { cim, szoveg, gondolatTipus, kategoriak });
      // Rögtön tudatpontot is rendelünk hozzá — enélkül nem is létezne (D14)
      const { allapot } = await kepetKeszit();
      await tudatpontRendezese(kornyezet, esemeny.azonosito, KEZDO_PONT, 'aktiv',
        szetosztottPontok(allapot, szerzo));

      kiir('Létrejött: ' + esemeny.azonosito.slice(0, 8) + '  „' + cim + '"');
      kiir(SZIN.halvany + 'Kapott ' + KEZDO_PONT + ' tudatpontot tőled — enélkül a koino elfelejtené.' + SZIN.vege);
      break;
    }

    case 'pont': {
      const { allapot } = await kepetKeszit();
      const azonosito = feloldas(ervek[0] ?? '', allapot.entitasok.keys());
      const pont = parseInt(ervek[1], 10);
      if (!Number.isInteger(pont)) throw new Error('Hány tudatpontot rendelsz hozzá?');
      const szerep = ervek[2] === 'passziv' ? 'passziv' : 'aktiv';

      let masholt = 0;
      for (const e of allapot.entitasok.values()) {
        if (e.azonosito !== azonosito) masholt += e.hozzajarulok.get(szerzo)?.pont ?? 0;
      }
      await tudatpontRendezese(kornyezet, azonosito, pont, szerep, masholt);
      kiir(pont === 0
        ? 'Elvetted a tudatpontodat. Ha senki másnak nincs rajta, a gondolat eltűnik.'
        : 'Tudatpont beállítva: ' + pont + ' (' + szerep + ')');
      break;
    }

    // ⭐ HÁROM PARANCS, EGY ÚT. A `javaslat`, a `torol` és az `athelyez` ugyanazt teszi —
    // csak a MŰVELET más az érintetten. ⚠️ A 4. szabály miatt kell mindháromnak kézi út:
    // ami csak a felületről indítható, az fojtópont.
    // ⭐ A KÉZI ÚT a felszabadításhoz (4. szabály): ami magától megy, azt kézzel is
    // el lehessen indítani — és lássam, mi van még várakozáson.
    // ⭐ A KÜSZÖBÖK KÉZI ÚTJA (4. szabály). ⚠️ Ez eddig HIÁNYZOTT: az érték javaslatot
    // csak a felület tudta beadni (`POST /api/ertekJavaslat`) — vagyis a küszöb-állítás
    // böngésző-függő volt, pedig *„ha egy funkció csak online tud működni, az fojtópont"*.
    // A hiányra a felszabadítás próbája világított rá: rövid döntési időt akartam
    // beállítani, és nem volt mivel.
    case 'ertek': {
      const { allapot } = await kepetKeszit();
      const entitas = feloldas(ervek[0] ?? '', allapot.entitasok.keys());

      const szam = (ertek, nev) => {
        const n = Number(ertek);
        if (!Number.isInteger(n) || n < 0) throw new Error(nev + ': egész szám kell (kaptam: ' + ertek + ')');
        return n;
      };
      if (ervek.length < 5) {
        throw new Error('ertek <azonosító> <elfogadási%> <részvételi%> <min mp> <max mp>');
      }

      const ertekek = {
        elfogadasiKuszob: szam(ervek[1], 'elfogadási küszöb'),
        reszveteliKuszob: szam(ervek[2], 'részvételi küszöb'),
        minimumDontesiIdo: szam(ervek[3], 'minimum döntési idő'),
        maximumDontesiIdo: szam(ervek[4], 'maximum döntési idő')
      };
      if (ertekek.maximumDontesiIdo < ertekek.minimumDontesiIdo) {
        throw new Error('A maximum döntési idő nem lehet kisebb a minimumnál.');
      }

      await ertekJavaslat(kornyezet, entitas, ertekek);
      kiir('Érték javaslat beadva: ' + rovidAzonosito(entitas));
      kiir(SZIN.halvany + '⚠️ Ez JAVASLAT, nem parancs: az érvényes küszöb a tulajdonosok '
        + 'érték javaslatainak MEDIÁNJA (D4).' + SZIN.vege);
      break;
    }

    // ⭐⭐ ÁLLÁSFOGLALÁS egy ÁLTALÁNOS egyezményről (D27). A tény örök, a hatály él.
    case 'allast': {
      const { javaslatok } = await kepetKeszit();
      const egyezmeny = feloldas(ervek[0] ?? '', javaslatok.keys());
      const allas = (ervek[1] ?? '').toLowerCase();
      if (!['csatlakozik', 'tiltakozik', 'utkozik'].includes(allas)) {
        throw new Error('Milyen állás? csatlakozik | tiltakozik | utkozik');
      }
      const masik = allas === 'utkozik'
        ? feloldas(ervek[2] ?? '', javaslatok.keys())
        : null;

      await allasfoglalas(kornyezet, egyezmeny, allas, { masik, indoklas: ervek[3] ?? null });
      kiir('Állásfoglalás rögzítve: ' + allas + SZIN.halvany
        + ' (bármikor megváltoztathatod, az utolsó számít)' + SZIN.vege);
      kiir(SZIN.halvany + '⚠️ Ebből semmi nem következik automatikusan — csak LÁTSZIK, '
        + 'hányan állnak mögötte most.' + SZIN.vege);
      break;
    }

    case 'felszabadit': {
      // ⭐ A KÉZI ÚT TÜRELMETLENEBB LEHET, ÉS EZ SZÁNDÉKOS: az automata azért vár néhány
      // bulit, mert nem tudhatja, megérkezett-e már minden szavazat. Aki KIMONDJA, hogy
      // most, az tudja, mit vállal — ezért a buli-szám itt megadható (0 = azonnal).
      const kert = ervek[0] === undefined ? null : parseInt(ervek[0], 10);
      const kellBuli = kert === null || Number.isNaN(kert) ? MEGULEPEDES_BULIK : Math.max(0, kert);
      const felszabadult = await elakadtPontokFelszabaditasa(true, kellBuli);
      if (!felszabadult) {
        kiir(SZIN.halvany + 'Most nincs felszabadítható pont.'
          + (kert === null ? ' (Türelmetlenül: felszabadit 0)' : '') + SZIN.vege);
      }
      break;
    }

    // ===================================
    // ⭐⭐ A SZAKASZ 4 HÉT PARANCSA (2026-09-12) — a kézi út, 4. szabály
    // ===================================

    // ⭐ BELÉPÉS: megnyitom a saját azonosság-szeletemet. Ez még NEM tagság — csak annyit
    // mond: „ide szeretnék tartozni." A tagság ebből és a kapott meghívásokból SZÁMÍTÓDIK.
    case 'belep': {
      const meglevo = await sajatHorgonyom();
      if (meglevo) {
        kiir('Már van horgonyod ebben a koinóban: ' + meglevo.slice(0, 8));
        kiir(SZIN.halvany + 'A teljes azonosítója (ezt add meg annak, aki behív):' + SZIN.vege);
        kiir('  ' + meglevo);
        break;
      }
      // ⭐ Az alapító a `KoinoLetrehozas`-ára hivatkozik — ő a rekurzió alapesete (D56).
      const e = await belepes(kornyezet, ervek[0]);
      kiir('Beléptél — a horgonyod: ' + e.azonosito.slice(0, 8));
      kiir(SZIN.halvany + 'A teljes azonosítója (ezt add meg annak, aki behív):' + SZIN.vege);
      kiir('  ' + e.azonosito);
      kiir(SZIN.halvany + '⚠️ Ez még NEM tagság: ahhoz kell egy meghívás egy tagtól.' + SZIN.vege);
      break;
    }

    // ⭐ A NÉGY ÁLLÍTÁS MÁSRÓL — ugyanaz az alak (`allitokRola`), más a jelentés.
    // ⚠️ Mindegyik a MÁSIK szeletébe kerül, és hozza a saját horgonyomat.
    case 'meghiv':
    case 'felhatalmaz':
    case 'tanusit':
    case 'bemutatkoz':
    case 'visszavon': {
      const adatok = await allitasAdatai(ervek[0]);

      const muvelet = {
        meghiv: meghivas,
        felhatalmaz: felhatalmazas,
        tanusit: tanusitas,
        bemutatkoz: bemutatkozas,
        visszavon: felhatalmazasVisszavonasa
      }[parancs];

      await muvelet(kornyezet, adatok);

      const mondat = {
        meghiv: 'Meghívtad — ezzel az 1. lépcsőn (tagság) segítetted át.',
        felhatalmaz: 'Rábíztad a tanúsítást (D60: MEGBÍZÁS, nem pontszám).',
        tanusit: 'Tanúsítottad: „létező, külön ember" — ez a 2. lépcső (pénztárca, D11).',
        bemutatkoz: 'Feljegyezted, hogy találkoztatok (D62: csak KÖLCSÖNÖSEN számít).',
        visszavon: 'Visszavontad a felhatalmazásodat — ez CSAK ELŐRE hat (D47).'
      }[parancs];
      kiir(mondat + ' (' + adatok.horgonya.slice(0, 8) + ')');

      if (parancs === 'tanusit') {
        kiir(SZIN.halvany + '⚠️ A tanúsítás állítás a MÚLTRÓL — nem vonható vissza (D46). '
          + 'Amit vissza lehet venni, az a felhatalmazás.' + SZIN.vege);
      }
      if (parancs === 'visszavon') {
        kiir(SZIN.halvany + 'A már kiadott tanúsításai érvényben maradnak (D47) — különben '
          + 'néhány ember összebeszélve tömegektől venné el a pénztárcát.' + SZIN.vege);
      }
      break;
    }

    // ⭐⭐ „ESZERINT LÁTOK" — a buli-elismerés (D61). A saját láncomban van sorrend, ezért
    // minden KÉSŐBBI eseményem bizonyíthatóan ezután keletkezett — globális óra nélkül.
    case 'lattam': {
      const sajatBelepes = await sajatHorgonyom();
      if (!sajatBelepes) throw new Error('Előbb lépj be: node koino/koino.js belep');
      await lattam(kornyezet, sajatBelepes);
      kiir('Elismerted, meddig látsz a saját szeletedben.');
      kiir(SZIN.halvany + 'Aki SOHA nem ír alá ilyet, nem szeg szabályt — de kilóg a '
        + 'ritmusból, és ezt a jelzés mutatja, nem a szabály (D19).' + SZIN.vege);
      break;
    }

    // ⭐⭐⭐ ÁLTALÁNOS JAVASLAT (D27) — a KÖZÖSSÉG ÁLLÁSPONTJA, nem entitás-változtatás.
    //
    // ⚠️⚠️ EZ EGY 4. SZABÁLY-HIÁNY VOLT (megtalálva 2026-09-10, kód-átnézéssel): megépült az
    // általános egyezmény élő hatálya és az `allast` parancs, de **nem volt mivel létrehozni
    // azt az egyezményt, amiről állást lehet foglalni** — a `koino.js` mindkét javaslat-útja
    // beégetve `fajta: 'szerkesztesi'`-t küldött. *„Legyen mindig kézi út."*
    //
    // ⛔ A HELY KÖTELEZŐ, és ez nem szigor, hanem a D27/4: **a hely határozza meg a
    // hatókört** — az foglalhat állást, akinek tudatpontja van azon az entitáson, ami alatt
    // az egyezmény áll, vagy annak bármely leszármazottján. Hely nélkül nem lenne kör, aki
    // dönt róla; a javaslat szülője amúgy is az érintett entitás.
    case 'altalanos': {
      const { allapot } = await kepetKeszit();
      const cim = ervek[0];
      if (!cim) throw new Error('Mi az álláspont? altalanos <cím> <hely> [indoklás]');
      if (!ervek[1]) {
        throw new Error('Hol álljon? (azonosító) — a hely határozza meg, kik dönthetnek '
          + 'róla és kik foglalhatnak állást (D27/4).');
      }
      const hely = feloldas(ervek[1], allapot.entitasok.keys());

      const e = await javaslatLetrehozasa(kornyezet, {
        fajta: 'altalanos',
        erintettek: [{ entitas: hely, muvelet: ALLASPONT_MUVELET, valtozas: { cim } }],
        indoklas: ervek[2] ?? null
      });

      // ⭐ Ugyanaz a lépés, mint a szerkesztésinél: a javaslat is entitás (D27/5), tudatpont
      // nélkül a D14 szerint nem létezne.
      const { allapot: kepUtan } = await kepetKeszit();
      await tudatpontRendezese(kornyezet, e.azonosito, KEZDO_PONT, 'aktiv',
        szetosztottPontok(kepUtan, szerzo));

      kiir('Általános javaslat beadva: ' + e.azonosito.slice(0, 8));
      kiir(SZIN.halvany + 'Helye: „' + (allapot.entitasok.get(hely)?.cim ?? '?')
        + '" — innen örökli a szavazói kört és a küszöbeit.' + SZIN.vege);
      kiir(SZIN.halvany + '⚠️ Ha elfogadják, SEMMI nem hajtódik végre — az egyezmény MAGA '
        + 'az álláspont, és ÉL: csatlakozni, tiltakozni, ütközést jelölni lehet hozzá.'
        + SZIN.vege);
      kiir(SZIN.halvany + 'Most szavazhatsz rá: node koino/koino.js szavaz '
        + e.azonosito.slice(0, 8) + ' tamogat' + SZIN.vege);
      break;
    }

    case 'javaslat':
    case 'torol':
    case 'egyesit':
    case 'athelyez': {
      const { allapot } = await kepetKeszit();

      // ⭐⭐ AZ EGYESÍTÉS AZ EGYETLEN, AMI TÖBB ENTITÁST NEVEZ MEG — vesszővel elválasztva.
      // ⚠️ Az ELSŐ a különleges: ő az, aki a többit BEOLVASZTJA (megtartja az azonosítóját,
      // és ő veszi fel az egyesített címet). Csaba döntése, 2026-09-07.
      if (parancs === 'egyesit') {
        const azonositok = (ervek[0] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
        if (azonositok.length < 2) throw new Error('Melyik kettőt (vagy többet) egyesítsük? <az1>,<az2>');
        const ujCim = ervek[1];
        if (!ujCim) throw new Error('Mi legyen az egyesített gondolat címe?');

        const feloldva = azonositok.map((a) => feloldas(a, allapot.entitasok.keys()));
        const e = await javaslatLetrehozasa(kornyezet, {
          fajta: 'szerkesztesi',
          erintettek: feloldva.map((entitas, i) => ({
            entitas, muvelet: 'Egyesites', valtozas: i === 0 ? { cim: ujCim } : null
          })),
          indoklas: ervek[2] ?? null
        });

        const { allapot: kepUtan } = await kepetKeszit();
        await tudatpontRendezese(kornyezet, e.azonosito, KEZDO_PONT, 'aktiv',
          szetosztottPontok(kepUtan, szerzo));

        kiir('Szerkesztési javaslat beadva (Egyesites, ' + feloldva.length + ' forrás): '
          + e.azonosito.slice(0, 8));
        kiir(SZIN.halvany + 'Ha elfogadják, az ELSŐ gondolat („'
          + (allapot.entitasok.get(feloldva[0])?.cim ?? '?') + '") olvasztja be a többit — '
          + 'megtartja az azonosítóját, és a rá mutató hivatkozások megmaradnak.' + SZIN.vege);
        kiir(SZIN.halvany + 'Most szavazhatsz rá: node koino/koino.js szavaz '
          + e.azonosito.slice(0, 8) + ' tamogat' + SZIN.vege);
        break;
      }

      const erintett = feloldas(ervek[0] ?? '', allapot.entitasok.keys());

      let muvelet, valtozas, indoklas;
      if (parancs === 'javaslat') {
        if (!ervek[1]) throw new Error('Mi legyen az új cím?');
        muvelet = 'Modositas';
        valtozas = { cim: ervek[1] };
        indoklas = ervek[2] ?? null;
      } else if (parancs === 'torol') {
        muvelet = 'Torles';
        valtozas = null;
        indoklas = ervek[1] ?? null;
      } else {
        // ⭐ A „gyoker" szó a gyökérre helyezést jelenti — a `null` szülőt a parancssorban
        // nem lehet leírni, és az üres érv félreérthető lenne.
        const hova = ervek[1];
        if (!hova) throw new Error('Hova helyezzük? (azonosító vagy „gyoker")');
        muvelet = 'Athelyezes';
        valtozas = { szulo: hova === 'gyoker' ? null : feloldas(hova, allapot.entitasok.keys()) };
        indoklas = ervek[2] ?? null;
      }

      const e = await javaslatLetrehozasa(kornyezet, {
        fajta: 'szerkesztesi',
        erintettek: [{ entitas: erintett, muvelet, valtozas }],
        indoklas
      });

      // ⭐ A JAVASLAT IS ENTITÁS (Csaba, 2026-09-06) — tehát tudatpont nélkül a D14 szerint
      // NEM LÉTEZNE. Ugyanaz a lépés, mint a gondolatnál: aki beadja, az áll mögé.
      const { allapot: kepUtan } = await kepetKeszit();
      await tudatpontRendezese(kornyezet, e.azonosito, KEZDO_PONT, 'aktiv',
        szetosztottPontok(kepUtan, szerzo));

      kiir('Szerkesztési javaslat beadva (' + muvelet + '): ' + e.azonosito.slice(0, 8));
      kiir(SZIN.halvany + 'Kapott ' + KEZDO_PONT + ' tudatpontot tőled — a javaslat is '
        + 'entitás, enélkül a koino elfelejtené.' + SZIN.vege);
      if (muvelet === 'Torles') {
        // ⚠️ A KÉZI ÚT KIMONDVA: a koino nem veheti vissza más nevében a pontokat.
        kiir(SZIN.halvany + 'Ha elfogadják, a gondolat megszűnik létezni — a rátett '
          + 'tudatpontodat te magad veheted vissza: pont <azonosító> 0' + SZIN.vege);
      }
      kiir(SZIN.halvany + 'Most szavazhatsz rá: node koino/koino.js szavaz '
        + e.azonosito.slice(0, 8) + ' tamogat' + SZIN.vege);
      break;
    }

    case 'szavaz': {
      const { javaslatok } = await kepetKeszit();
      const javaslat = feloldas(ervek[0] ?? '', javaslatok.keys());
      const valasztas = { tamogat: 'Tamogat', ellenez: 'Ellenez', tartozkodik: 'Tartozkodik' }[
        (ervek[1] ?? '').toLowerCase()];
      if (!valasztas) throw new Error('Hogyan szavazol? tamogat | ellenez | tartozkodik');

      // ⭐⭐ A KÜLÖNVÁLÁSI IGÉNY: „ha a döntés nem a te álláspontodat követi, kérsz külön
      // ágat?" ⛔ Tartózkodásnál a művelet úgyis hamisra állítja — egy helyen dől el.
      const kulonAg = (ervek[2] ?? '').toLowerCase() === 'kulonag';

      await szavazas(kornyezet, javaslat, valasztas, kulonAg);
      kiir('Szavazat leadva: ' + valasztas + SZIN.halvany
        + ' (bármikor megváltoztathatod, az utolsó számít)' + SZIN.vege);
      if (kulonAg && valasztas !== 'Tartozkodik') {
        kiir(SZIN.halvany + '⑂ Külön ágat kértél: ha a döntés ellened megy, a SAJÁT '
          + 'változatoddal léphetsz külön ágra — a tudatpontoddal együtt.' + SZIN.vege);
      } else if (kulonAg) {
        kiir(SZIN.halvany + '⚠️ Tartózkodásnál nincs külön ág: aki nem foglal állást, '
          + 'a főágon marad.' + SZIN.vege);
      }
      break;
    }

    case 'kapu': {
      // ⭐ Megkérdezi a routert, hajlandó-e MAGÁTÓL beengedni a kapcsolatot. Ha igen, nem
      // kell kézzel szabályt írni a router felületén — ami a legtöbb e-embernek úgyis
      // leküzdhetetlen akadály lenne.
      // ⚠️ SEGÉDESZKÖZ, NEM ELŐFELTÉTEL: ha a router nemet mond, a koino ugyanúgy működik.
      const port = parseInt(ervek[0], 10) || ALAP_PORT;
      const atjaro = ervek[1];
      const en = sajatIPv6();

      if (!en) {
        kiir(SZIN.nem + 'Nincs globális IPv6-címed — így nincs mit kinyittatni.' + SZIN.vege);
        break;
      }
      kiir(SZIN.halvany + 'A saját címed: ' + en.cim + '  (' + en.kartya + ')' + SZIN.vege);

      if (!atjaro) {
        kiir();
        kiir('Add meg a router helyi IPv6-címét is:');
        kiir('  node koino/koino.js kapu ' + port + ' fe80::…');
        kiir(SZIN.halvany + 'Windowson így kérdezhető le:' + SZIN.vege);
        kiir(SZIN.halvany + '  Get-NetRoute -DestinationPrefix ::/0 | Select NextHop' + SZIN.vege);
        break;
      }

      // ----- MI VAN A HÁLÓZATON? Mindhárom szabványt megkérdezzük -----
      const upnp = await upnpKorkerdes();
      kiir();
      kiir(SZIN.vastag + 'UPnP' + SZIN.vege);
      if (!upnp.talalt) {
        kiir('  ✗ nincs UPnP-átjáró a hálózaton');
      } else {
        kiir('  ✓ van átjáró' + SZIN.halvany + ' — ' + (upnp.szolgaltatasok?.length ?? 0)
          + ' szolgáltatás' + SZIN.vege);
        kiir(upnp.ipv6Tuzfal
          ? SZIN.jo + '  ✓ TUD IPv6 tűzfal-rést nyitni' + SZIN.vege
          : SZIN.nem + '  ✗ nincs IPv6 tűzfal-vezérlés (WANIPv6FirewallControl)' + SZIN.vege);
      }

      kiir();
      kiir(SZIN.vastag + 'PCP' + SZIN.vege);
      const eredmeny = await pcpKapuKerese({
        atjaro, szakasz: en.szakasz, sajatCim: en.cim, port
      });

      if (eredmeny.sikeres) {
        kiir(SZIN.jo + '✓ A router kinyitotta a ' + (eredmeny.port ?? port) + '-es kaput'
          + SZIN.vege + SZIN.halvany + ' — ' + eredmeny.elettartam + ' másodpercre' + SZIN.vege);
        kiir(SZIN.halvany + 'Most már fogadhatsz kapcsolatot: node koino/koino.js figyel '
          + port + SZIN.vege);
      } else {
        kiir(SZIN.nem + '✗ Nem sikerült: ' + eredmeny.ok + SZIN.vege);
        kiir();
        kiir(SZIN.halvany + 'Ez nem baj — a koino enélkül is működik, csak nem tud kaput' + SZIN.vege);
        kiir(SZIN.halvany + 'nyitni. Ilyenkor TE kezdeményezel kifelé (csere), vagy kézzel' + SZIN.vege);
        kiir(SZIN.halvany + 'nyitsz portot a routeren.' + SZIN.vege);
      }
      break;
    }

    case 'cimek': {
      // ⭐ MIÉRT KELL EZ? A Szakasz 2 / 4. lépéséhez (két készülék, két hálózat) tudni
      // kell a saját GLOBÁLIS IPv6-címünket — a másik ezen ér el. Androidon a szokásos
      // rendszer-parancsok (`ip addr`) nem mindig adnak választ, mert a rendszer korlátozza
      // őket; a program viszont a SAJÁT címeit mindig ismeri.
      //
      // ⚠️ Ez NEM a nyilvános cím felderítése. IPv6-nál nincs is rá szükség (nincs NAT):
      // a globális cím maga a nyilvános cím. Épp ezt a mérést akarjuk elvégezni.
      const halozat = (await import('node:os')).networkInterfaces();
      const csoportok = { globalis: [], helyi: [], negyes: [] };

      for (const [nev, cimek] of Object.entries(halozat)) {
        for (const cim of cimek ?? []) {
          if (cim.internal) continue;
          if (cim.family === 'IPv6') {
            const eleje = cim.address.slice(0, 2).toLowerCase();
            const globalisE = eleje.startsWith('2') || eleje.startsWith('3');
            (globalisE ? csoportok.globalis : csoportok.helyi).push({ nev, cim: cim.address });
          } else {
            csoportok.negyes.push({ nev, cim: cim.address });
          }
        }
      }

      kiir(SZIN.vastag + 'GLOBÁLIS IPv6' + SZIN.vege + SZIN.halvany
        + '   ← EZT add meg a másik készüléknek' + SZIN.vege);
      if (!csoportok.globalis.length) {
        kiir(SZIN.nem + '  (nincs) — így a közvetlen kapcsolat két hálózat között nem megy'
          + SZIN.vege);
      }
      for (const { nev, cim } of csoportok.globalis) {
        kiir('  ' + cim + SZIN.halvany + '   (' + nev + ')' + SZIN.vege);
      }

      kiir();
      kiir(SZIN.halvany + 'Helyi hálózat (IPv4): '
        + (csoportok.negyes.map((c) => c.cim).join(', ') || '—') + SZIN.vege);
      kiir(SZIN.halvany + 'Csak-link IPv6 (fe80…, nem használható kívülről): '
        + csoportok.helyi.length + ' db' + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'A másik készüléken:  node koino/koino.js csere <a fenti cím> 7373'
        + SZIN.vege);
      break;
    }

    case 'ujjlenyomat': {
      // ⭐ „Ugyanazt látjuk-e?" — két készülék EGYETLEN SZÖVEG összehasonlításával.
      // Ez kell majd a Szakasz 2 / 4. lépéséhez, ahol nincs közös program, ami összevesse
      // a két gépet: a két ujjlenyomatot szemmel is össze lehet olvasni.
      const napokMulva = parseInt(ervek[0], 10) || 0;
      const { allapot, javaslatok } = await kepetKeszit(napokMulva);
      const allas = await allasOsszeallitasa(tar, KOINO);

      kiir(SZIN.vastag + 'TUDÁS' + SZIN.vege + SZIN.halvany
        + '     (mely eseményeket ismerem — ezt egyenlíti ki a csere)' + SZIN.vege);
      kiir('  ' + await lenyomat(allas.szerzok));
      kiir(SZIN.halvany + '  ' + allas.szerzok.length + ' e-ember · '
        + (await koinoEsemenyei(tar, KOINO)).length + ' esemény' + SZIN.vege);

      kiir();
      kiir(SZIN.vastag + 'ÁLLAPOT' + SZIN.vege + SZIN.halvany
        + '   (ami ebből következik — ennek is egyeznie kell)' + SZIN.vege);
      kiir('  ' + await allapotUjjlenyomata(allapot, javaslatok));
      kiir(SZIN.halvany + '  ' + allapot.entitasok.size + ' entitás · '
        + javaslatok.size + ' javaslat' + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + '⚠ Az ÁLLAPOT ujjlenyomata IDŐFÜGGŐ (a döntések lezárulnak),'
        + ' ezért csak azonos pillanatra hasonlítható össze.' + SZIN.vege);
      break;
    }

    // ===== A CSERE: két készülék között (Szakasz 2) =====

    case 'figyel': {
      // ===== A POSTALÁDA-SZEREP (D34) =====
      //
      // ⭐ AKI FOGADNI TUD, AZ POSTALÁDA. Nem élő továbbító: nem kell egyszerre online
      // tartania két felet (ez a TURN drágasága, és a koino épp ezt úszhatja meg). Elég,
      // ha ÁTVESZI, ELTÁROLJA, és a következő beszélgetésnél TOVÁBBADJA.
      //
      // Anna és Béla egyike sem tud fogadni; mindketten ide szólnak ki — és teljesen
      // kicserélik az eseményeiket, pedig soha nem beszéltek egymással. Mérve: a
      // vizsgaProba.js „A POSTALÁDA" próbája.
      const port = parseInt(ervek[0], 10) || ALAP_PORT;
      let beszelgetesek = 0, atvett = 0, tovabbadott = 0, forgalom = 0;

      // A postaláda a saját társait is hirdeti — így a hozzá bekopogók megtudják, kik
      // vannak még a közösségben (D36–D38). Ettől bővül a háló magától.
      const cimTarolo = tarsakTarolo();

      const figyelo = await figyeloIndulasa(tar, KOINO, port, {
        hirdetettCimek: await hirdetendoCimek(cimTarolo),
        utana: async (eredmeny) => {
          if (eredmeny.hiba) {
            kiir(SZIN.nem + '  ✗ megszakadt (' + eredmeny.honnan + '): ' + eredmeny.hiba + SZIN.vege);
            return;
          }
          if (eredmeny.masKoino) {
            // Egy nyitott hálózaton ez rendes dolog: bekopogott valaki, aki más koinóé.
            kiir(SZIN.halvany + '  · ' + eredmeny.honnan + ' — MÁSIK koinóé ('
              + eredmeny.masKoino + '), nem cseréltünk' + SZIN.vege);
            return;
          }
          beszelgetesek++;
          atvett += eredmeny.uj;
          tovabbadott += eredmeny.kuldott;
          forgalom += (eredmeny.bajtKuldott ?? 0) + (eredmeny.bajtKapott ?? 0);

          kiir(SZIN.jo + '  ✓ csere ' + eredmeny.honnan + SZIN.vege + SZIN.halvany
            + ' — átvettem ' + eredmeny.uj + ', továbbadtam ' + eredmeny.kuldott
            + ' (' + eredmeny.korok + ' kör, ' + adatMennyiseg(eredmeny) + ')' + SZIN.vege);
          kiir(SZIN.halvany + '    összesen: ' + beszelgetesek + ' beszélgetés · '
            + atvett + ' átvett · ' + tovabbadott + ' továbbadott · '
            + adatMennyiseg({ bajtKuldott: forgalom }) + SZIN.vege);

          // ⭐ A POSTALÁDA IS TANUL A HÍVÓTÓL (D39, 2026-08-30). Eddig a bekopogó
          // elmondta, kiket ismer — és mi eldobtuk. Így a postaláda címjegyzéke csak
          // kifelé menő cserékből bővült, pedig ő beszél a legtöbb emberrel.
          const tanult = await cimeketTanul(cimTarolo, eredmeny.kapottCimek,
            eredmeny.kivulrolIgyLatszom);
          if (tanult) {
            kiir(SZIN.jo + '    + ' + tanult + ' új társ-címet tanultam tőle' + SZIN.vege);
          }
        }
      });

      // ⭐ ÉS FELELÜNK A HELYI KIÁLTÁSOKRA (F. lépés). Aki ugyanezen a wifin a `felfedez`-t
      // futtatja, cím beírása nélkül megtalál minket. ⚠️ Nem kiáltunk magunktól, csak
      // válaszolunk — és ha nem megy, az őrjárat/postaláda ettől még dolgozik.
      const valaszolo = await felfedezoValaszolo({ koino: KOINO, sajatPort: figyelo.port });

      kiir(SZIN.vastag + 'POSTALÁDA' + SZIN.vege + SZIN.halvany
        + '   (a kapu nyitva a ' + figyelo.port + '-es porton)' + SZIN.vege);
      kiir(valaszolo.mukodik
        ? SZIN.halvany + 'A helyi hálózaton felfedezhető vagyok (felfedez)' + SZIN.vege
        : SZIN.halvany + '⚠ A helyi felfedezésre nem tudok felelni — a kézi `tars` út marad'
          + SZIN.vege);
      kiir(SZIN.halvany + 'Te: ' + rovidAzonosito(szerzo) + ' · adat: ' + alapHely() + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'Amit ez a készülék csinál: átveszi mások eseményeit, eltárolja,'
        + SZIN.vege);
      kiir(SZIN.halvany + 'és a következő beszélgetésnél továbbadja — így két olyan e-ember'
        + SZIN.vege);
      kiir(SZIN.halvany + 'is elér egymáshoz, aki egyikük sem tud kaput nyitni.' + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'A másik készüléken: node koino/koino.js csere <ez a cím> '
        + figyelo.port + SZIN.vege);
      kiir(SZIN.halvany + 'Kilépés: Ctrl+C' + SZIN.vege);
      // Nem lépünk ki: a nyitott kapu életben tartja a folyamatot.
      break;
    }

    case 'tarsak': {
      // ⭐ D33: nem az a kérdés, hogy egy adott gépet elérünk-e, hanem hogy a hálózat
      // összefüggő marad-e. Ez a lista az, amiből az összefüggőség lesz.
      const tarolo = tarsakTarolo();
      const lista = tarsakSorrendje(await tarolo.olvas());

      kiir(SZIN.vastag + 'TÁRSAK' + SZIN.vege + SZIN.halvany
        + '   (ebben a sorrendben próbálja a `csere`)' + SZIN.vege);
      if (!lista.length) {
        kiir(SZIN.halvany + '  (üres) — vegyél fel egyet: node koino/koino.js tars <cím> [port] [név]'
          + SZIN.vege);
      }
      // ⭐ MEGJELÖLJÜK A SAJÁT CÍMÜNKET. Az új kód már nem TANULJA meg magát, de a régebben
      // felvett bejegyzés ott marad — és magától nem tűnik el (4. szabály: törölni csak
      // kézzel lehet). Enélkül a gazdájának esélye sincs észrevenni, hogy a készülék
      // minden körben önmagát hívogatja.
      const sajatak = await sajatOsszesCim();
      let sajatDb = 0;

      for (const t of lista) {
        const mienk = sajatCimE(t.hoszt, sajatak);
        if (mienk) sajatDb++;
        const allapotSzoveg = t.utoljara
          ? SZIN.jo + 'sikerült ' + new Date(t.utoljara).toLocaleString('hu-HU') + SZIN.vege
          : (t.sikertelen
            ? SZIN.nem + t.sikertelen + '× nem sikerült' + SZIN.vege
            : SZIN.halvany + 'még nem próbáltuk' + SZIN.vege);
        kiir('  ' + t.hoszt + ' ' + t.port
          + (t.nev ? SZIN.halvany + '  „' + t.nev + '"' + SZIN.vege : '')
          + '  ' + allapotSzoveg
          + (mienk ? SZIN.nem + '  ⚠ EZ TE VAGY' + SZIN.vege : ''));
      }

      if (sajatDb) {
        kiir();
        kiir(SZIN.nem + '⚠ ' + sajatDb + ' bejegyzés a SAJÁT címed — a készülék önmagát hívja.'
          + SZIN.vege);
        kiir(SZIN.halvany + '  Levétel: node koino/koino.js tars torol <cím> <port>' + SZIN.vege);
      }
      kiir();
      kiir(SZIN.halvany + 'A fájl kézzel is szerkeszthető: ' + tarolo.fajl + SZIN.vege);
      break;
    }

    case 'tars': {
      const tarolo = tarsakTarolo();
      const lista = await tarolo.olvas();

      if (ervek[0] === 'torol') {
        const cim = ervek[1];
        if (!cim) throw new Error('Kit vegyek le? node koino/koino.js tars torol <cím> [port]');
        const port = parseInt(ervek[2], 10) || ALAP_PORT;
        const { lista: maradt, torolt } = tarsTorlese(lista, cim, port);
        await tarolo.ir(maradt);
        kiir(torolt
          ? SZIN.jo + 'Levéve: ' + cim + ' ' + port + SZIN.vege
          : SZIN.nem + 'Nem volt a listán: ' + cim + ' ' + port + SZIN.vege);
        break;
      }

      const cim = ervek[0];
      if (!cim) throw new Error('Kit vegyek fel? node koino/koino.js tars <cím> [port] [név]');
      const port = parseInt(ervek[1], 10) || ALAP_PORT;

      // ⚠️ SZÓLUNK, HA MAGADAT VESZED FEL. Így csúszott be a hiba, ami napokig ott ült:
      // a laptop saját IPv6-címe felkerült a listára, és a készülék minden körben ÖNMAGÁVAL
      // cserélt (707 bájt, 0 esemény) — sőt a lista élére került, mert mindig „sikerült".
      // ⭐ Nem TILTJUK, csak szólunk: lehet, hogy szándékos (két példány egy gépen, más
      // adat-mappával). A tiltás itt hazugság lenne, a hallgatás viszont csapda.
      if (sajatCimE(cim, await sajatOsszesCim())) {
        kiir(SZIN.nem + '⚠ Ez a SAJÁT címed.' + SZIN.vege);
        kiir(SZIN.halvany + '  A készülék így önmagát fogja hívogatni minden körben.'
          + SZIN.vege);
        kiir(SZIN.halvany + '  (Ha két példányt futtatsz egy gépen külön KOINO_ADAT-tal,'
          + SZIN.vege);
        kiir(SZIN.halvany + '   akkor ez rendben van — akkor a PORT különbözteti meg őket.)'
          + SZIN.vege);
      }

      await tarolo.ir(tarsHozzaadasa(lista, { hoszt: cim, port, nev: ervek[2] }));
      kiir(SZIN.jo + 'Felvéve: ' + cim + ' ' + port + (ervek[2] ? ' („' + ervek[2] + '")' : '')
        + SZIN.vege);
      kiir(SZIN.halvany + 'Csere mindenkivel: node koino/koino.js csere' + SZIN.vege);
      break;
    }

    case 'orjarat': {
      // ===== A KÉSZÜLÉK MAGÁTÓL DOLGOZIK =====
      //
      // ⭐ MIÉRT KELL? Csaba vette észre: eddig MINDEN csere kézi indítású volt — pedig a
      // D33 egész terve arra épül, hogy a készülékek maguktól, időnként végigpróbálják a
      // társaikat. Egy koino-készüléknek nem szabad arra várnia, hogy valaki parancsot
      // gépeljen be.
      //
      // Két dolgot csinál egyszerre, mert egy valódi készülék is ezt teszi:
      //   1. NYITVA TARTJA A KAPUT (postaláda, D34) — aki tud, az bekopoghat,
      //   2. IDŐNKÉNT KISZÓL mindenkinek a társ-listáról (D33).
      //
      // ⚠️ EZ NEM „folyamatos kapcsolat" (5. szabály). A készülék a kör végén elenged
      // mindent, és alszik a következőig. Épp ez a különbség a postaláda és az élő
      // továbbító között.
      //
      // ⭐ ÉS EZÉRT KELLETT ELŐBB A B. LÉPÉS: egy „nincs újdonság" kör ~190 bájt, tehát
      // sűrűn is mehet anélkül, hogy egy mobilos e-ember számláját megterhelné (D35).
      const perc = parseFloat(ervek[0]) || 5;
      const port = parseInt(ervek[1], 10) || ALAP_PORT;
      const tarolo = tarsakTarolo();

      const figyelo = await figyeloIndulasa(tar, KOINO, port, {
        hirdetettCimek: await hirdetendoCimek(tarolo),
        utana: async (e) => {
          if (e.hiba) return;
          if (e.masKoino) return;
          // ⭐ A bekopogótól is tanulunk címet (D39) — ő ugyanúgy hoz újdonságot, mint
          // akit mi hívunk. E nélkül a kapunkat nyitva tartó készülék, aki a legtöbb
          // emberrel beszél, tanulna a legkevesebbet.
          const tanult = await cimeketTanul(tarolo, e.kapottCimek, e.kivulrolIgyLatszom);
          kiir(SZIN.jo + '  ← ' + ora() + ' bejött valaki (' + e.honnan + ')' + SZIN.vege
            + SZIN.halvany + ' — átvettem ' + e.uj + ', továbbadtam ' + e.kuldott
            + ' (' + adatMennyiseg(e) + ')'
            + (tanult ? ' · +' + tanult + ' cím' : '') + SZIN.vege);
        }
      });

      // ⭐ Felelünk a helyi kiáltásokra is (F. lépés) — így egy ugyanezen a wifin induló
      // készülék cím beírása nélkül megtalál. Nem kiáltunk magunktól.
      const orValaszolo = await felfedezoValaszolo({ koino: KOINO, sajatPort: figyelo.port });

      kiir(SZIN.vastag + 'ŐRJÁRAT' + SZIN.vege + SZIN.halvany
        + '   (kapu nyitva a ' + figyelo.port + '-en · kör ' + perc + ' percenként'
        + (orValaszolo.mukodik ? ' · helyben felfedezhető' : '') + ')' + SZIN.vege);
      kiir(SZIN.halvany + 'Te: ' + rovidAzonosito(szerzo) + ' · koino: ' + KOINO + SZIN.vege);
      kiir(SZIN.halvany + 'Kilépés: Ctrl+C' + SZIN.vege);
      kiir();

      // Vég nélküli kör. A társ-listát MINDEN körben újraolvassuk, hogy egy közben
      // felvett társ azonnal beleférjen (a `tars` parancs egy másik ablakban futhat).
      for (;;) {
        const lista = await tarolo.olvas();
        let sikeresEbbenAKorben = 0;    // ⭐ hányan feleltek — ettől lesz a körből BULI

        if (!lista.length) {
          kiir(SZIN.halvany + '  ' + ora() + ' nincs társ a listán — csak a kaput tartom nyitva'
            + SZIN.vege);
        } else {
          const hirdetjuk = await hirdetendoCimek(tarolo);
          const kor = await korbeCsere(lista,
            (t) => csereVonalon(tar, KOINO, t.hoszt, t.port, 10000, hirdetjuk));
          await tarolo.ir(kor.lista);

          // ⭐ AMIT A TÁRSAKTÓL HALLOTTUNK: új címek a listára. Ettől bővül magától.
          const ujCimek = kor.eredmenyek
            .filter((e) => e.sikerult)
            .flatMap((e) => e.kapottCimek ?? []);
          const hozzajott = await kapottCimekBeolvasztasa(tarolo, ujCimek);
          if (hozzajott) {
            kiir(SZIN.jo + '  + ' + ora() + ' ' + hozzajott
              + ' új társ-cím a többiektől' + SZIN.vege);
          }

          sikeresEbbenAKorben = kor.sikeres;

          const jel = kor.sikeres ? SZIN.jo + '  ✓ ' : SZIN.halvany + '  · ';
          kiir(jel + ora() + ' ' + kor.sikeres + '/' + kor.eredmenyek.length + ' társ'
            + SZIN.vege + SZIN.halvany + ' — ' + kor.uj + ' új esemény, '
            + adatMennyiseg({ bajtKuldott: kor.bajt }) + SZIN.vege);
        }

        // ⭐⭐ ÉS A HÁZTARTÁS: az elakadt tudatpontok visszavétele (2026-09-07).
        // A készülék magától könyvel — de csak megülepedés után, mert egy késve érkező,
        // határidőn belüli szavazat még visszafordíthatja a törlést. ⚠️ A csere UTÁN
        // fut, nem előtte: így a friss események már beleszámítanak a döntésbe.
        try {
          // ⭐ A KÖR EREDMÉNYE DÖNTI EL, HOGY VOLT-E BULI: ha egyetlen társ sem felelt, ez
          // a kör nem bizonyít semmit — a néma kör nem buli.
          await elakadtPontokFelszabaditasa(true, MEGULEPEDES_BULIK, sikeresEbbenAKorben);
        } catch (hiba) {
          // Best-effort: a könyvelés hibája NE akassza meg az őrjáratot.
          kiir(SZIN.halvany + '  ⚠ a felszabadítás most nem sikerült: ' + hiba.message + SZIN.vege);
        }

        await new Promise((teljesites) => setTimeout(teljesites, perc * 60 * 1000));
      }
      // ide nem jutunk el; a figyelőt a folyamat vége zárja
    }

    case 'felfedez': {
      // ===== HELYI FELFEDEZÉS (F. lépés) — „ki van még ezen a wifin?" =====
      //
      // ⭐ MIT VÁLT KI? A kézi cím-beírást. Egy háztartáson belül fölösleges címeket
      // olvasgatni: a két készülék ugyanazon a hálózaton van, elég egy kiáltás.
      //
      // ⚠️ KÉNYELEM, NEM ELŐFELTÉTEL (2. és 4. szabály). Ha a wifi tiltja a kliensek közti
      // forgalmat, ez üres kézzel tér vissza — és a koino ugyanúgy működik tovább a `tars`
      // paranccsal. Ezért nem is fut magától: külön parancs, te indítod.
      const masodperc = parseFloat(ervek[0]) || 2;
      const sajatPort = parseInt(ervek[1], 10) || ALAP_PORT;
      const tarolo = tarsakTarolo();

      kiir(SZIN.vastag + 'HELYI FELFEDEZÉS' + SZIN.vege + SZIN.halvany
        + '   (kiáltok a hálózatra, és ' + masodperc + ' mp-ig hallgatózom)' + SZIN.vege);
      kiir(SZIN.halvany + 'Azt hirdetem, hogy a ' + sajatPort + '-on hallgatok · koino: '
        + KOINO + SZIN.vege);
      kiir();

      const eredmeny = await helyiFelfedezes({
        koino: KOINO, sajatPort, idokorlat: masodperc * 1000,
        esemenyre: (e) => {
          if (e.mi === 'KIALTOTTAM') {
            kiir(SZIN.halvany + '  → kikiáltottam ide: ' + e.cel + SZIN.vege);
          } else if (e.mi === 'KIALTAS-BUKOTT') {
            kiir(SZIN.nem + '  ✗ ide nem ment ki (' + e.cel + '): ' + e.ok + SZIN.vege);
          } else if ((e.mi === 'KOPOGOK-ERKEZETT' || e.mi === 'ITT-VAGYOK-ERKEZETT') && e.uj) {
            // ⚠️ CSAK AZ ÚJAT ÍRJUK KI. Ugyanaz a készülék többször is felel (a kiáltást
            // ismételjük, és a válasz több úton jön) — mérve: EGY laptop 18 sort írt a
            // telefon képernyőjére. Az információ ettől nem lett több.
            kiir(SZIN.jo + '  ← ' + e.tars.hoszt + ':' + e.tars.port + SZIN.vege
              + SZIN.halvany + ' (' + e.mi.replace('-ERKEZETT', '') + ')' + SZIN.vege);
          } else if (e.mi === 'ELDOBVA' && e.ok === 'mas-koino') {
            kiir(SZIN.halvany + '  · ' + e.honnan + ' — MÁSIK koino, nem ránk tartozik'
              + SZIN.vege);
          }
        }
      });

      kiir();
      if (!eredmeny.tarsak.length) {
        kiir(SZIN.nem + '✗ Nem találtam senkit ' + eredmeny.eltelt + ' ms alatt.' + SZIN.vege);
        // ⚠️ MŰSZER, NEM VIGASZ: a néma eredménynek több oka lehet, és a különbség számít.
        kiir(SZIN.halvany + '  Ez háromfélét jelenthet, és nem mindegy, melyiket:'
          + SZIN.vege);
        kiir(SZIN.halvany + '   · nem fut másik koino ezen a hálózaton (ez a leggyakoribb);'
          + SZIN.vege);
        kiir(SZIN.halvany + '   · fut, de MÁSIK koinóé — akkor fentebb kiírtam volna;'
          + SZIN.vege);
        kiir(SZIN.halvany + '   · a wifi tiltja a kliensek közti forgalmat (vendéghálózat,'
          + SZIN.vege);
        kiir(SZIN.halvany + '     „AP isolation") — ilyenkor a kézi út marad: tars <cím> <port>'
          + SZIN.vege);
        if (!eredmeny.kialtasok) {
          kiir(SZIN.nem + '  ⚠ Egyetlen kiáltás sem ment ki — a hálózat már itt megállított.'
            + SZIN.vege);
        }
        break;
      }

      kiir(SZIN.jo + '⭐ ' + eredmeny.tarsak.length + ' készüléket találtam '
        + eredmeny.eltelt + ' ms alatt.' + SZIN.vege
        + SZIN.halvany + ' (' + eredmeny.kialtasok + ' kiáltás, '
        + eredmeny.kapottUzenetek + ' válasz)' + SZIN.vege);

      // ⭐ ÉS FEL IS ÍRJUK ŐKET — különben a felfedezés csak látvány lenne. Ez ugyanaz a
      // kapu, mint a terjedő címjegyzéké: cím kerül a listára, nem bizalom (3. szabály).
      const hozzajott = await kapottCimekBeolvasztasa(tarolo, eredmeny.tarsak);
      kiir(SZIN.jo + '  + ' + hozzajott + ' új társ a listán' + SZIN.vege
        + SZIN.halvany + (hozzajott < eredmeny.tarsak.length
          ? ' (' + (eredmeny.tarsak.length - hozzajott) + ' már ismerős volt)' : '')
        + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'Most már mehet: node koino/koino.js csere' + SZIN.vege);
      break;
    }

    case 'tukor': {
      // ===== „KÍVÜLRŐL HOGY LÁTSZOM?" =====
      //
      // ⭐ MIÉRT KELL? Mert IPv4-en a router ÁTÍRJA a portot, tehát a készülék NEM ISMERI
      // a saját külső címét — így nem tudja megmondani a másiknak, hova kopogjon. Ezt
      // szokás STUN-nal megtudni.
      //
      // ⭐ DE ITT NINCS KÜLÖN SZOLGÁLTATÁS: aki fogadni tud (postaláda), az ezt amúgy is
      // látja, és a csere első üzenetében visszamondja. Bárki lehet tükör — tehát nem
      // múlik egyetlen címen (2. szabály), és semmilyen bizalom nem következik belőle
      // (3. szabály): ez megfigyelés, nem igazság.
      const cim = ervek[0];
      if (!cim) throw new Error('Kitől kérdezzem meg? node koino/koino.js tukor <cím> [port]');
      const port = parseInt(ervek[1], 10) || ALAP_PORT;

      const eredmeny = await csereVonalon(tar, KOINO, cim, port);

      kiir(SZIN.vastag + 'KÍVÜLRŐL ÍGY LÁTSZOL' + SZIN.vege);
      if (eredmeny.kivulrolIgyLatszom) {
        kiir('  ' + SZIN.jo + eredmeny.kivulrolIgyLatszom.cim + '  port: '
          + eredmeny.kivulrolIgyLatszom.port + SZIN.vege);
        kiir(SZIN.halvany + '  (ezt látta rólad ' + cim + ')' + SZIN.vege);
      } else {
        kiir(SZIN.nem + '  (nem mondta meg — régi verziót futtat a másik oldal?)' + SZIN.vege);
      }

      kiir();
      const sajatjaim = await sajatGlobalisCimek();
      kiir(SZIN.halvany + 'A saját globális IPv6-od: '
        + (sajatjaim.join(', ') || '(nincs)') + SZIN.vege);
      kiir(SZIN.halvany + '⚠ Ha a fenti PORT nem a te helyi portod, akkor a router átírta —'
        + ' ezt a külső portot kell megadni a másiknak.' + SZIN.vege);
      break;
    }

    case 'kulsoport': {
      // ===== MILYEN CÍMEN ÉS PORTON LÁTSZOM KÍVÜLRŐL? =====
      //
      // ⭐ MIÉRT KELL? Mérve a fejlesztő vonalán: a helyi 7373 kívülről az 51967-esen
      // látszik. Ha a másik a 7373-ra kopog, ott NINCS SEMMI — ezért nem ért célba
      // egyetlen csomag sem. IPv6-on ez a lépés nem létezik (nincs port-átírás).
      //
      // ⚠️ Segédeszköz, nem előfeltétel (D38): a kiszolgáló paraméter, tehát cserélhető,
      // és bizalom nem jár vele — egy portszámot mond, nem igazságot.
      const helyiPort = parseInt(ervek[0], 10) || ALAP_PORT;
      const szerver = ervek[1];
      const szerverPort = parseInt(ervek[2], 10) || undefined;

      const elso = await kulsoCim(helyiPort, szerver, szerverPort);
      kiir(SZIN.vastag + 'KÍVÜLRŐL ÍGY LÁTSZOL' + SZIN.vege);
      kiir('  ' + SZIN.jo + elso.cim + ':' + elso.port + SZIN.vege
        + SZIN.halvany + '   (a helyi ' + helyiPort + '-esről)' + SZIN.vege);
      kiir();

      if (elso.port === helyiPort) {
        kiir(SZIN.jo + '⭐ A PORT MEGMARADT — a másik a ' + helyiPort + '-esre kopoghat.'
          + SZIN.vege);
      } else {
        kiir(SZIN.nem + '⚠ A PORT ÁTÍRVA (' + helyiPort + ' → ' + elso.port + ')'
          + SZIN.vege);
        kiir(SZIN.halvany + '  Ez normális IPv4-en. A másiknak a KÜLSŐ portra kell'
          + ' kopognia:' + SZIN.vege);
        kiir('  ' + SZIN.vastag + 'node koino/koino.js pajzsfuro ' + elso.cim + ' '
          + elso.port + ' ' + ALAP_PORT + SZIN.vege);
      }
      break;
    }

    case 'pajzsfuro': {
      // ===== PAJZSFÚRÁS (E. lépés) =====
      //
      // ⭐ A NÉV CSABÁTÓL: nem kívülről törünk át semmit, hanem MINDKÉT OLDAL BELÜLRŐL
      // fúr — a saját routerén nyit rést, kifelé indulva —, és a két rés a közepén
      // találkozik. Ezért pajzsfúró, nem „lyukfúró".
      //
      // ⚠️ VÉG NÉLKÜL FÚR (2026-08-29, Csaba észrevétele nyomán). Az első változat 60
      // másodperc után feladta — de a két oldal nem indul egyszerre, és eddig SOHA nem
      // futott mindkettőn egyszerre. Ha viszont mindkettő folyamatosan fúr, az átfedés
      // előbb-utóbb garantált, közös óra nélkül is. Leállítani Ctrl+C-vel lehet.
      const cim = ervek[0];
      if (!cim) {
        throw new Error('Kihez kopogjak?'
          + '\n  node koino/koino.js pajzsfuro <cím> <távoli port> [helyi port]'
          + '\n  node koino/koino.js pajzsfuro <cím> <távoli port> tcp [mp]');
      }
      const port = parseInt(ervek[1], 10) || ALAP_PORT;
      // ⚠️ A HELYI ÉS A TÁVOLI PORT KÜLÖNBÖZHET — és IPv4-en általában KÜLÖNBÖZIK is,
      // mert a NAT átírja. A helyi portot MI választjuk (ezen fogadunk), a távolit a
      // másik KÜLSŐ portja adja (oda kopogunk). A `kulsoport` parancs mondja meg.
      const helyiPort = (ervek[2] && ervek[2].toLowerCase() !== 'tcp')
        ? (parseInt(ervek[2], 10) || ALAP_PORT) : ALAP_PORT;

      // ===== TCP-VÁLTOZAT =====
      // Ugyanaz az elv, de magával a csere protokolljával fúrunk — így ha átértünk, a
      // csere AZONNAL mehet ugyanazon a kapcsolaton (az UDP-lyuk erre nem jó).
      if ((ervek[2] ?? '').toLowerCase() === 'tcp') {
        const mp = parseFloat(ervek[3]) || 15;

        kiir(SZIN.vastag + 'PAJZSFÚRÓ — TCP' + SZIN.vege + SZIN.halvany
          + '   (a helyi ' + helyiPort + '-esről a ' + port + '-esre, ' + mp
          + ' másodpercenként)' + SZIN.vege);
        kiir(SZIN.halvany + 'A másik készüléken UGYANEZT kell futtatni, a te címedre.'
          + SZIN.vege);
        kiir(SZIN.nem + '⚠ Közben NE fusson `orjarat` vagy `figyel` ugyanezen a porton —'
          + ' a fúrónak kell a ' + port + '-es, és ütköznének (EADDRINUSE).' + SZIN.vege);
        kiir(SZIN.halvany + 'Kilépés: Ctrl+C' + SZIN.vege);

        // ⭐ NYOMOZATI ALAPADAT: van-e egyáltalán globális IPv6-unk INNEN indulva?
        // Ha nincs, akkor a fúrásnak esélye sincs, és ezt jobb rögtön tudni.
        const sajatjaim = await sajatGlobalisCimek();
        if (sajatjaim.length) {
          kiir(SZIN.halvany + 'A te globális IPv6-od: ' + sajatjaim.join(', ') + SZIN.vege);
        } else {
          kiir(SZIN.nem + '⚠ NINCS globális IPv6-od ezen a hálózaton — a fúrásnak így'
            + ' esélye sincs.' + SZIN.vege);
        }
        kiir();

        let elozoOk = null;
        const furas = await tcpPajzsfuras(helyiPort, cim, port, {
          koz: mp * 1000,
          utana: (e) => {
            // ⚠️ MINDEN próbálkozás látszik, nem csak a siker (Csaba kérése).
            if (e.mi === 'PROBALOK') {
              kiir(SZIN.halvany + '  ' + ora() + ' → ' + e.hanyadik + '. próbálkozás…'
                + SZIN.vege);
            }
            if (e.mi === 'PROBA-BUKOTT') {
              kiir(SZIN.nem + '     ✗ ' + e.ok + SZIN.vege
                + SZIN.halvany + '  (' + e.eltelt + ' ms)' + SZIN.vege);
              // A magyarázatot csak akkor ismételjük, ha VÁLTOZOTT — különben elárasztja.
              if (e.ok !== elozoOk) {
                const magyarazat = hibaMagyarazat(e.ok);
                if (magyarazat) kiir(SZIN.halvany + '       → ' + magyarazat + SZIN.vege);
                elozoOk = e.ok;
              }
            }
            if (e.mi === 'ATFURVA') {
              kiir(SZIN.jo + '     ⭐ ÁTFÚRVA a ' + e.hanyadik + '. próbálkozásra! ('
                + e.eltelt + ' ms)' + SZIN.vege);
            }
          }
        });

        kiir();
        kiir(SZIN.jo + '⭐ A PAJZS ÁTFÚRVA — most jön a csere ugyanezen a kapcsolaton.'
          + SZIN.vege);
        const csere = await parbeszed(furas.kapcsolat, tar, KOINO);
        furas.kapcsolat.end();
        kiir(SZIN.jo + 'Csere kész' + SZIN.vege + SZIN.halvany
          + ' — kaptam ' + csere.uj + ' új eseményt, küldtem ' + csere.kuldott
          + ' (' + csere.korok + ' kör)' + SZIN.vege);
        break;
      }

      kiir(SZIN.vastag + 'PAJZSFÚRÓ' + SZIN.vege + SZIN.halvany
        + '   (a helyi ' + helyiPort + '-esről a ' + cim + ':' + port
        + '-re, másodpercenként)' + SZIN.vege);
      kiir(SZIN.halvany + 'A másik készüléken UGYANEZT kell futtatni, a te címedre.'
        + SZIN.vege);
      kiir(SZIN.halvany + 'Vég nélkül fúr, amíg össze nem ér. Kilépés: Ctrl+C' + SZIN.vege);
      kiir();

      const eredmeny = await pajzsfuras(helyiPort, cim, port, {
        idokorlat: 0,                 // 0 = vég nélkül
        tartsdNyitva: true,           // siker után a résen AZONNAL cserélünk
        utana: (e) => {
          // ⚠️ MŰSZER A NÉMA NEM-ESEMÉNYRE. Az első változat CSAK a sikeres kopogást írta
          // ki — ezért amikor a telefonon a küldés elbukott, a képernyő egyszerűen ÜRES
          // maradt, és órákig azt hihettük volna, hogy „fúr". Ami nem történik meg, azt
          // is ki kell írni, különben nem mérés, csak remény.
          if (e.mi === 'INDUL') {
            kiir(SZIN.halvany + '  ' + ora() + ' a fúró elindult (' + e.port + '-es port)'
              + SZIN.vege);
          }
          // ⭐ EZ A SZÁM AZ, AMIT BE KELL MONDANI A MÁSIKNAK — és mostantól ANNAK a
          // foglalatnak a portja, ami tényleg fúr. A `kulsoport` parancs külön foglalatot
          // nyit, tehát MÁS portot mérhet; 2026-08-30-án csak a NAT jóindulatán múlt,
          // hogy a bemondott szám stimmelt.
          if (e.mi === 'SAJAT-KULSO-CIM') {
            kiir(SZIN.jo + '  ⭐ KÍVÜLRŐL ÍGY LÁTSZOM: ' + e.cim + ':' + e.port + SZIN.vege);
            kiir(SZIN.vastag + '     EZT MONDD BE A MÁSIKNAK:' + SZIN.vege + SZIN.halvany
              + ' node koino/koino.js pajzsfuro ' + e.cim + ' ' + e.port + ' 7373'
              + SZIN.vege);
          }
          if (e.mi === 'SAJAT-CIM-NEM-MEGY') {
            // ⚠️ Nem végzetes: a fúrás megy tovább, csak nem tudjuk kiírni a számot.
            kiir(SZIN.halvany + '  (a saját külső címemet nem tudtam megmérni: '
              + e.ok + ')' + SZIN.vege);
          }
          if (e.mi === 'KULDES-BUKOTT' && e.hanyadik % 15 === 1) {
            kiir(SZIN.nem + '  ' + ora() + ' ✗ a KÜLDÉS bukott (' + e.hanyadik + '.): '
              + e.ok + SZIN.vege);
            kiir(SZIN.halvany + '    A csomag el sem indult — ez NEM a másik fél hibája.'
              + SZIN.vege);
          }
          if (e.mi === 'HIBA') {
            kiir(SZIN.nem + '  ' + ora() + ' ✗ hiba: ' + e.ok + SZIN.vege);
          }
          // 15 másodpercenként egy sor — hogy látszódjon, hogy él, de ne árassza el.
          if (e.mi === 'KOPOGTAM' && e.hanyadik % 15 === 1) {
            kiir(SZIN.halvany + '  ' + ora() + ' … fúrok (' + e.hanyadik + '. kopogás)'
              + SZIN.vege);
          }
          if (e.mi === 'KOPOG-ERKEZETT') {
            kiir(SZIN.jo + '  ← MEGJÖTT AZ Ő KOPOGÁSA (' + e.honnan + ')' + SZIN.vege);
          }
          if (e.mi === 'HALLAK-ERKEZETT') {
            kiir(SZIN.jo + '  ✓ ŐK IS HALLANAK MINKET (' + e.honnan + ')' + SZIN.vege);
          }
        }
      });

      kiir();
      if (eredmeny.mindketIrany) {
        kiir(SZIN.jo + '⭐ A PAJZS ÁTFÚRVA — mindkét irány működik.' + SZIN.vege);
        kiir(SZIN.halvany + '  ' + eredmeny.kuldott + ' kopogás, ' + eredmeny.kapott
          + ' válasz, ' + eredmeny.eltelt + ' ms alatt' + SZIN.vege);

        // ⭐ ÉS ITT A JUTALOM: a megnyílt résen AZONNAL megy a csere. Ugyanaz a
        // `parbeszed` fut, mint TCP-n — csak a szállítás más (1. szabály).
        const tarolo = tarsakTarolo();
        kiir();
        kiir(SZIN.vastag + 'CSERE A RÉSEN' + SZIN.vege);
        // ⚠️ A RÉS CÍMÉT NEM HIRDETJÜK (2026-08-30, mérésből). Tegnap még igen, azzal az
        // indokkal, hogy „a fúró rögzített portról hív, a rés ott él". A valódi mérés
        // megcáfolta: a másik fél felvette TARTÓS TÁRSNAK, és az őrjárata azóta TCP-vel
        // hívogatja — a résen viszont csak UDP fér át, és a leképezés percek alatt
        // elévül. Mérve: `1× nem sikerült` közvetlenül a sikeres csere után.
        //
        // ⭐ Ez nem a D39 visszavonása: aki KAPUT TART NYITVA (`figyel`), az továbbra is
        // hirdeti a saját címét, mert az tartós és TCP-vel hívható. A rés nem az.
        // Amikor az őrjárat majd maga is tud fúrni, ez visszakapcsolható — de akkor a
        // társ-listának meg kell tanulnia, mi a múlandó UDP-rés és mi a tartós cím.
        const csere = await csereUdpResen(eredmeny.halo, cim, port, tar, KOINO,
          { hirdetettCimek: await hirdetendoCimek(tarolo) });
        eredmeny.halo.close();

        kiir(SZIN.jo + '  ✓ kaptam ' + csere.uj + ' új eseményt, küldtem ' + csere.kuldott
          + SZIN.vege + SZIN.halvany + ' (' + csere.korok + ' kör, '
          + adatMennyiseg({ bajtKuldott: csere.bajtKuldott, bajtKapott: csere.bajtKapott })
          + ')' + SZIN.vege);
        const tanult = await kapottCimekBeolvasztasa(tarolo, csere.kapottCimek);
        if (tanult) kiir(SZIN.jo + '  + ' + tanult + ' új társ-címet tanultam' + SZIN.vege);
        if (csere.kivulrolIgyLatszom) {
          kiir(SZIN.halvany + '  Kívülről így látszol: ' + csere.kivulrolIgyLatszom.cim
            + ':' + csere.kivulrolIgyLatszom.port + SZIN.vege);
        }
      } else if (eredmeny.sikerult) {
        // ⚠️ FÉL SIKER: az ő csomagjai átjönnek, a mieink nem. Ez is mérés, nem hiba.
        kiir(SZIN.nem + '⚠ FÉL SIKER: az ő kopogása átjött, a miénk nem.' + SZIN.vege);
        kiir(SZIN.halvany + '  Vagyis a MI routerünk enged befelé, az övék nem.' + SZIN.vege);
      } else {
        kiir(SZIN.nem + '✗ Nem jött át semmi (' + eredmeny.kuldott + ' kopogás, '
          + eredmeny.eltelt + ' ms).' + SZIN.vege);
        kiir(SZIN.halvany + '  Vagy nem futott a másik oldalon, vagy mindkét router zár.'
          + SZIN.vege);
      }
      break;
    }

    case 'hozd': {
      // ===== ⭐ BÖNGÉSZŐ-LEKÉRÉS: „add ide EZT az egy entitást" =====
      //
      // ⭐ MIÉRT KELL, HA VAN CSERE? Csaba észrevétele: *„böngészés közben az összes
      // entitásnak elérhetőnek kell lennie."* A rendes csere MINDENT áthoz, amit a másik
      // tud és mi nem — böngészéskor viszont EGYETLEN entitás kell, most azonnal. A
      // periodikus csere erre elvileg alkalmatlan: hiába ér körbe minden esemény öt perc
      // alatt, ha egy nem tárolt entitást akarok megnyitni.
      const entitas = ervek[0];
      if (!entitas) {
        throw new Error('Melyik entitást hozzam?'
          + '\n  node koino/koino.js hozd <azonosító> [cím] [port]');
      }

      const jegyzekTarolo = szeletJegyzekTarolo();
      const tarolo = tarsakTarolo();

      // ----- KIT KÉRDEZZÜNK MEG? -----
      // 1. akit megadtak · 2. akinél KORÁBBAN LÁTTUK ezt az entitást · 3. a társak
      let cimek;
      if (ervek[1]) {
        cimek = [{ hoszt: ervek[1], port: parseInt(ervek[2], 10) || ALAP_PORT }];
      } else {
        const jegyzek = await jegyzekTarolo.olvas();
        const ismertek = szeletCimei(jegyzek, entitas);
        const tarsak = tarsakSorrendje(await tarolo.olvas());
        // A szelet-jegyzék ELÖL: ott biztosan megvolt egyszer.
        cimek = [...ismertek, ...tarsak].map((c) => ({ hoszt: c.hoszt, port: c.port }));
      }

      if (!cimek.length) {
        kiir(SZIN.nem + 'Nincs kit megkérdezni.' + SZIN.vege);
        kiir(SZIN.halvany + 'Adj meg egy címet, vagy vegyél fel társat: node koino/koino.js tars <cím>'
          + SZIN.vege);
        break;
      }

      kiir(SZIN.vastag + 'HOZOM: ' + entitas.slice(0, 12) + '…' + SZIN.vege
        + SZIN.halvany + '   (' + cimek.length + ' cím a listán)' + SZIN.vege);

      // ⚠️ EGY ELÉRHETETLEN CÍM NEM HIBA, HANEM A NORMÁLIS MŰKÖDÉS (D33) — megyünk tovább.
      let siker = null;
      for (const c of cimek) {
        try {
          const e = await szeletHozatala(tar, KOINO, c.hoszt, c.port, entitas);
          siker = { ...e, cim: c };
          kiir(SZIN.jo + '  ✓ ' + c.hoszt + ' — ' + e.kapott + ' esemény, ebből ÚJ: ' + e.uj
            + SZIN.vege + SZIN.halvany + ' (' + adatMennyiseg(e) + ')' + SZIN.vege);
          break;
        } catch (hiba) {
          kiir(SZIN.halvany + '  · ' + c.hoszt + ' ' + c.port + ' — ' + hiba.message + SZIN.vege);
        }
      }

      if (!siker) {
        // ⭐ EZ NEM HIBA, HANEM ÁLLAPOT (D21 mintája): „jelenleg nem elérhető". A koino
        // bejelent, nem bíráskodik (D19).
        kiir();
        kiir(SZIN.nem + 'Ez az entitás JELENLEG NEM ELÉRHETŐ.' + SZIN.vege);
        kiir(SZIN.halvany + 'Vagy senki sem tartja már (D14: ami senkinek nem kell, elfelejtődik),'
          + ' vagy a tartói épp alszanak. Kívülről a kettő nem különböztethető meg.' + SZIN.vege);
        break;
      }

      // ----- ⭐ MEGJEGYEZZÜK, KINÉL VOLT MEG -----
      // Név nélkül: csak cím, port és idő (D6). A döntéshez soha nem kell KONKRÉT embert
      // elérni, csak valakit, akinél megvan.
      if (siker.kapott > 0) {
        const jegyzek = await jegyzekTarolo.olvas();
        await jegyzekTarolo.ir(szeletJegyzekTakaritasa(
          szeletCimMegjegyzese(jegyzek, entitas, siker.cim.hoszt, siker.cim.port)
        ));
      }

      kiir();
      kiir(SZIN.halvany + 'Az állapot: node koino/koino.js' + SZIN.vege);
      break;
    }

    case 'csere': {
      const tarolo = tarsakTarolo();
      const kezdet = Date.now();

      // ===== EGY MEGADOTT CÍM =====
      // Marad, mert kell: az első társat valahonnan meg kell adni (kézzel átvitt címmel),
      // és a mérésekhez is ez a legrövidebb út.
      if (ervek[0]) {
        const cim = ervek[0];
        const port = parseInt(ervek[1], 10) || ALAP_PORT;
        const eredmeny = await csereVonalon(tar, KOINO, cim, port, 10000,
          await hirdetendoCimek(tarolo));

        // ⚠️ MÁSIK KOINO: ez NEM hiba, csak nincs miről beszélni. Ki kell mondani, mert
        // különben a „kaptam 0, küldtem 0" úgy néz ki, mintha minden rendben lenne.
        if (eredmeny.masKoino) {
          kiir(SZIN.nem + 'Ez a készülék egy MÁSIK koinóé: ' + eredmeny.masKoino + SZIN.vege);
          kiir(SZIN.halvany + 'A tiéd: ' + KOINO + ' — nem cseréltünk semmit, és ez így helyes.'
            + SZIN.vege);
          kiir(SZIN.halvany + 'Ha ugyanabban a koinóban akartok lenni, a KOINO_AZONOSITO'
            + ' változónak kell egyeznie.' + SZIN.vege);
          break;
        }

        kiir(SZIN.jo + 'Csere kész' + SZIN.vege + SZIN.halvany
          + ' — kaptam ' + eredmeny.uj + ' új eseményt, küldtem ' + eredmeny.kuldott
          + ' (' + eredmeny.korok + ' kör, ' + (Date.now() - kezdet) + ' ms, '
          + adatMennyiseg(eredmeny) + ')' + SZIN.vege);

        // Akivel egyszer sikerült, azt megjegyezzük — különben minden cserénél újra kézzel
        // kellene beírni a címet, és pont az nem épülne fel, ami a D33-hoz kell: a lista.
        const lista = await tarolo.olvas();
        const volt = lista.some((t) => t.hoszt.toLowerCase() === cim.toLowerCase() && t.port === port);
        await tarolo.ir(tarsHozzaadasa(lista, { hoszt: cim, port }).map((t) =>
          (t.hoszt.toLowerCase() === cim.toLowerCase() && t.port === port)
            ? { ...t, utoljara: Date.now(), sikertelen: 0 } : t));
        if (!volt) kiir(SZIN.halvany + 'Felvettem a társak közé (levenni: tars torol '
          + cim + ' ' + port + ')' + SZIN.vege);

        const tanult = await kapottCimekBeolvasztasa(tarolo, eredmeny.kapottCimek);
        if (tanult) kiir(SZIN.jo + '+ ' + tanult + ' új társ-címet tanultam tőle'
          + SZIN.vege);

        kiir(SZIN.halvany + 'Az állapot: node koino/koino.js' + SZIN.vege);
        break;
      }

      // ===== MINDENKI A LISTÁRÓL =====
      const lista = await tarolo.olvas();
      if (!lista.length) {
        throw new Error('Nincs egyetlen társ sem. Vegyél fel egyet:'
          + '\n  node koino/koino.js tars <cím> [port] [név]'
          + '\nvagy adj meg most egy címet:  node koino/koino.js csere <cím> [port]');
      }

      kiir(SZIN.vastag + 'CSERE ' + lista.length + ' társsal' + SZIN.vege);

      const hirdetjuk = await hirdetendoCimek(tarolo);
      const kor = await korbeCsere(lista,
        (t) => csereVonalon(tar, KOINO, t.hoszt, t.port, 10000, hirdetjuk), {
        utana: (e) => {
          const cimke = e.tars.nev ? e.tars.nev : e.tars.hoszt + ' ' + e.tars.port;
          if (e.sikerult && e.masKoino) {
            kiir(SZIN.halvany + '  · ' + cimke + ' — egy MÁSIK koinóé (' + e.masKoino
              + '), nincs mit cserélni' + SZIN.vege);
            return;
          }
          kiir(e.sikerult
            ? SZIN.jo + '  ✓ ' + cimke + SZIN.vege + SZIN.halvany
              + ' — kaptam ' + e.uj + ', küldtem ' + e.kuldott
              + ' (' + e.korok + ' kör, ' + adatMennyiseg(e) + ')' + SZIN.vege
            : SZIN.halvany + '  · ' + cimke + ' — nem érhető el: ' + e.hiba + SZIN.vege);
        }
      });
      await tarolo.ir(kor.lista);

      const tanultCimek = kor.eredmenyek
        .filter((e) => e.sikerult).flatMap((e) => e.kapottCimek ?? []);
      const tanult = await kapottCimekBeolvasztasa(tarolo, tanultCimek);

      kiir();
      if (tanult) {
        kiir(SZIN.jo + '+ ' + tanult + ' új társ-címet tanultam a többiektől' + SZIN.vege);
      }
      // ⚠️ A NULLA SIKER SEM HIBA: a koino ettől még működik, csak most nem terjedt.
      // Ezért nem `throw`, és ezért nem 1-es kilépési kód (2. szabály).
      kiir((kor.sikeres ? SZIN.jo : SZIN.nem) + kor.sikeres + '/' + kor.eredmenyek.length
        + ' társ vette fel' + SZIN.vege + SZIN.halvany
        + ' — összesen ' + kor.uj + ' új esemény, ' + kor.kuldott + ' küldött'
        + ' (' + (Date.now() - kezdet) + ' ms, ' + adatMennyiseg({ bajtKuldott: kor.bajt })
        + ')' + SZIN.vege);
      if (!kor.sikeres) {
        kiir(SZIN.halvany + 'Egy társ sem válaszolt. Ez nem hiba — később újra megy;'
          + ' addig is minden művelet mehet tovább helyben.' + SZIN.vege);
      }
      kiir(SZIN.halvany + 'Az állapot: node koino/koino.js' + SZIN.vege);
      break;
    }

    // ===================================
    // A FELÜLET (Szakasz 5 / 5.1) — a helyi kapu
    // ===================================
    //
    // ⚠️ NE KEVERD a `kapu` paranccsal: az a ROUTERT kéri meg, hogy engedjen be kívülről;
    // ez itt a SAJÁT GÉPEN nyit egy ajtót a böngészőnek. A kettőnek semmi köze egymáshoz.
    //
    // ⭐ A 4. SZABÁLY ITT LÁTSZIK: ez a parancs KÉNYELEM. Amit a lapon meg lehet csinálni,
    // azt a parancssorból is meg lehet — ha a böngésző egyszer nem elérhető, a koino
    // ugyanúgy működik, csak kevésbé kényelmesen.
    case 'felulet': {
      const port = parseInt(ervek[0], 10) || FELULET_PORT;

      // ⭐ A KEZELŐ ITT SZÜLETIK, NEM A KAPUBAN. A kapu semmit nem tud a koinóról; a
      // domain-tudás mind ezen az egy függvényen megy át. Ez tartja a nyilat
      // „felület → program" irányba (felulet_terv 3. pont).
      //
      // ⏸️ MA KÉT VÉGPONT VAN (5.1: `en`, 5.2: `pakli`). A többi a `szakasz5_terv.md`
      // térképe szerint jön — de a LÉNYEG már itt eldőlt: a lap SOSE kérhet „mindent".
      //
      // ⭐ A pakli-nézet a FOLYAMATRA szól, nem kérésre: egy lapozás így egyszer számol
      // állapotot, nem oldalanként.
      const pakliNezet = ujPakliNezet();

      const kezelo = async ({ modszer, utvonal, kereses, test }) => {

        // ===================================
        // ⭐⭐ ÍRÁS (5.5) — itt születik esemény a lapról
        // ===================================
        //
        // ⚠️ MINDEN ÍRÁS EGY MŰVELET a `js/muveletek.js`-ből, ami EGY ALÁÍRT ESEMÉNYT hoz
        // létre. Nincs „mentés az adatbázisba", és a felület nem kerülhet meg semmit: az
        // esemény ugyanazon az `esemenyMentese` kapun megy be, mint a hálózatról érkező
        // (3. szabály). ⭐ A szabályokat a SZÁMÍTÁS őrzi — ha a lap szabálysértőt küld, az
        // esemény létrejön, de nem fog számítani. *A felület nem véd, és nem is kell.*
        if (modszer === 'POST' || modszer === 'PUT') {

          // ----- TUDATPONT-RENDEZÉS -----
          if (utvonal === '/api/tudatpont/hozzarendeles') {
            const { entitasId, pontok, szerep } = test ?? {};
            if (typeof entitasId !== 'string' || !Number.isInteger(pontok)) {
              return { allapot: 400, adat: { hiba: 'melyik entitásra hány tudatpont?' } };
            }

            // ⭐ A D42 BEMONDOTT ÖSSZEGE: a művelet a saját láncból számolja, de a
            // jelenlegi képet meg kell kapnia — ezért kell a friss állapot.
            const { allapot } = await kepetKeszit();
            await tudatpontRendezese(kornyezet, entitasId, pontok,
              szerep === 'passziv' ? 'passziv' : 'aktiv', szetosztottPontok(allapot, szerzo));

            pakliNezet.horgony = null;      // a kép elavult: a következő kérés újraszámol
            return { adat: { data: { entitasId, pontok } } };
          }

          // ----- RÉSZVÉTELI SZEREP -----
          if (utvonal.startsWith('/api/tudatpont/szerep/')) {
            const azonosito = utvonal.split('/')[5];
            const szerep = test?.szerep === 'passziv' ? 'passziv' : 'aktiv';
            if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitáson?' } };

            // ⚠️ A szerep-váltás NEM nyúl a pontokhoz: a jelenlegit írjuk vissza, csak más
            // szereppel. Ezért kell kiolvasni, mennyi van most rajta.
            const { allapot } = await kepetKeszit();
            const entitas = allapot.entitasok.get(azonosito);
            const mostani = entitas?.hozzajarulok.get(szerzo)?.pont ?? 0;
            if (mostani <= 0) {
              return { allapot: 400, adat: { hiba: 'nincs tudatpontod ezen az entitáson' } };
            }

            await tudatpontRendezese(kornyezet, azonosito, mostani, szerep,
              szetosztottPontok(allapot, szerzo));

            pakliNezet.horgony = null;
            return { adat: { data: { entitasId: azonosito, szerep } } };
          }

          // ----- ÉRTÉK JAVASLAT (küszöbök) -----
          if (utvonal === '/api/ertekJavaslat') {
            const { entitasId, ...ertekek } = test ?? {};
            if (typeof entitasId !== 'string') {
              return { allapot: 400, adat: { hiba: 'melyik entitás küszöbei?' } };
            }
            // ⚠️ A prototípus `entitasTipus`-t is küld; a koinóban az azonosító elég.
            delete ertekek.entitasTipus;

            await ertekJavaslat(kornyezet, entitasId, ertekek);
            pakliNezet.horgony = null;
            return { adat: { data: { entitasId } } };
          }

          // ----- ⭐ SZAVAZAT (5.5) — ezzel zárul be a kör a felületen -----
          if (utvonal === '/api/javaslat/szavazat') {
            const { javaslatId, szavazatTipus, kulonvalasIgeny } = test ?? {};
            if (typeof javaslatId !== 'string'
                || !['Tamogat', 'Ellenez', 'Tartozkodik'].includes(szavazatTipus)) {
              return { allapot: 400, adat: { hiba: 'melyik javaslatra hogyan szavazol?' } };
            }
            // ⚠️⚠️ A kulonvalasIgeny MOST ELVESZIK — de NEM azért, mert nincs megfelelője.
            // *(2026-09-06-án ezt írtam ide, és tévedtem.)*
            //
            // A KÜLÖNVÁLÁS a prototípus egyik legkidolgozottabb mechanizmusa
            // (`megismeres/18-kulonvalas.md` + `javaslatVegrehajtasiService.js` 3.A–3.E):
            // aki ellenezte a javaslatot ÉS kérte a külön ágat, az a döntés után a saját
            // álláspontja szerinti változattal él tovább — **a tudatpontjait és az érték
            // javaslatait is magával viszi**. ⭐ *„Aki elmegy, viszi a súlyát."*
            //
            // ⛔ A koinóban ez MÉG NINCS MEGÉPÍTVE (leltár: `docs/javaslat_atultetes.md`
            // 2.1). Amíg nincs, a szavazat nem hordozza a kérést — de ez **hiány, nem
            // döntés**. A régi megjegyzés azt sugallta, hogy a kérdés le van zárva.

            await szavazas(kornyezet, javaslatId, szavazatTipus, kulonvalasIgeny === true);
            pakliNezet.horgony = null;
            return { adat: { data: { javaslatId, szavazatTipus } } };
          }

          return { allapot: 404, adat: { hiba: 'nincs ilyen írás-végpont' } };
        }

        // ⛔ A SZAVAZAT VISSZAVONÁSA — a koinóban NINCS ilyen művelet, és ez döntés (5.4).
        //
        // A meggondolást az „utolsó nyer" fedi (szavazz újra), a semleges állást pedig a
        // Tartozkodik. Egy harmadik, „mégsem szavaztam" állapot csak a részvételi arányt
        // tenné kétértelművé. ⚠️ A prototípus gombja megmaradt a fülön — ezért NEM némán
        // nyeljük el, hanem megmondjuk, mit tegyen helyette.
        if (modszer === 'DELETE' && utvonal === '/api/javaslat/szavazat') {
          return { allapot: 400, adat: { hiba:
            'A koinóban a szavazat nem vonható vissza, csak megváltoztatható. '
            + 'Ha nem akarsz állást foglalni: szavazz Tartózkodom-ra.' } };
        }

        if (modszer !== 'GET') return { allapot: 405, adat: { hiba: 'nem támogatott művelet' } };

        if (utvonal === '/api/en') {
          // Ki vagyok? Ez O(1): a helyi kulcs, számítás nélkül.
          return { adat: { azonosito: szerzo, rovid: rovidAzonosito(szerzo), koino: KOINO } };
        }

        // ⭐⭐ A LAP HORGONYA — ezt hozza vissza minden kártya-kérés (2026-09-12).
        //
        // A lap a `/api/pakli` válaszából kapja (`horgony` + `most`), és visszaadja, amikor
        // egy kártya részleteit kéri. ⛔ Enélkül a kártya a MOSTANI állapotból számolna,
        // vagyis **átlépné a lap horgonyát**: mást mondana, mint a lista, amiből
        // megnyitották — és a gyorsítótár sem találna, tehát minden kattintás újraszámolná
        // az egész koinót.
        //
        // ⚠️ A szemetet nem „javítjuk ki" némán: ami nem egész szám, az nincs (a `lapKepe`
        // olyankor a mostani állapotot adja — a parancssornak és a többi kliensnek ez a jó).
        const horgonyPar = parseInt(kereses.get('horgony'), 10);
        const mostPar = parseInt(kereses.get('most'), 10);
        const lapHorgonya = {
          horgony: Number.isInteger(horgonyPar) ? horgonyPar : undefined,
          most: Number.isInteger(mostPar) ? mostPar : undefined
        };

        // ⛔⛔ A PAKLI — EGY OLDAL, SOHA NEM AZ EGÉSZ (9. szabály).
        // A `darab` felülről korlátos, a lapozás kurzoros, a szövegek nincsenek benne.
        if (utvonal === '/api/pakli') {
          const darab = parseInt(kereses.get('darab'), 10);
          try {
            return {
              adat: await pakliOldal(tar, KOINO, {
                rendezes: kereses.get('rendezes') ?? undefined,
                irany: kereses.get('irany') ?? undefined,
                kurzor: kereses.get('kurzor') ?? undefined,
                darab: Number.isInteger(darab) ? darab : undefined,
                szerzo,          // ⭐ hogy a kártya a SAJÁT tudatpontodat is mutathassa
                nezet: pakliNezet
              })
            };
          } catch (hiba) {
            // ⚠️ A rossz KÉRÉS nem a program hibája — 400, és mondjuk meg, mi a baj.
            return { allapot: 400, adat: { hiba: hiba.message } };
          }
        }

        // ⭐ EGY entitás szövege (5.3). A lista szándékosan nem hozza (9. szabály), ezért
        // a kártya külön kéri el — kártyánként, amikor tényleg kell.
        if (utvonal.startsWith('/api/pakli/szoveg/')) {
          const reszek = utvonal.split('/');            // ['', 'api', 'pakli', 'szoveg', tipus, id]
          const azonosito = reszek[5];
          if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitás szövege?' } };

          const talalat = await entitasSzovege(tar, KOINO, decodeURIComponent(azonosito),
            { ...lapHorgonya, nezet: pakliNezet });
          if (!talalat) return { allapot: 404, adat: { hiba: 'nincs ilyen entitás' } };
          return { adat: talalat };
        }

        // ⭐ EGY entitás tudatpont-képe — a kártya ebből dönti el, hogy a tudatpont-függő
        // menüpontok elérhetők-e (aki nem tett rá pontot, nem tehet rá javaslatot sem).
        if (utvonal.startsWith('/api/tudatpont/entitas/')) {
          const reszek = utvonal.split('/');       // ['', 'api', 'tudatpont', 'entitas', tipus, id]
          const azonosito = reszek[5];
          if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitás?' } };

          const talalat = await entitasTudatpontja(tar, KOINO, decodeURIComponent(azonosito),
            { ...lapHorgonya, szerzo, nezet: pakliNezet });
          if (!talalat) return { allapot: 404, adat: { hiba: 'nincs ilyen entitás' } };
          return { adat: talalat };
        }

        // ----- ⭐ A SAJÁT SZAVAZATOM (5.5) — a SzavazasFul kéri megnyitáskor -----
        if (utvonal.startsWith('/api/javaslat/') && utvonal.endsWith('/sajat-szavazat')) {
          const javaslatId = utvonal.split('/')[3];

          // ⚠️ EGYSZER kérjük el a képet, nem kétszer. A `kepetKeszit` **teljes**
          // állapot-számítás (nincs mögötte gyorsítótár), és 2026-09-12-ig ez a kezelő
          // kétszer hívta meg — ugyanarra a kérdésre, ugyanabban a kérésben.
          const { allapot: kep, javaslatok } = await kepetKeszit();
          if (!javaslatok.has(javaslatId)) {
            return { allapot: 404, adat: { hiba: 'nincs ilyen javaslat' } };
          }
          // ⚠️ NULL, ha még nem szavaztam — a fül ebből tudja, hogy egyik gomb sem aktív.
          //
          // ⭐ A koinóban a szavazat SOSEM tűnik el, csak felülíródik („az utolsó nyer"),
          // ezért a `sajatSzavazat` mindig a jelenlegi állásomat adja — nem kell külön
          // nyilvántartás róla.
          const enyem = sajatSzavazat(kep.szamitok, javaslatId, szerzo);
          return { adat: { data: enyem ? { szavazatTipus: enyem } : null } };
        }

        // ----- HIÁNYZÓ FELMENŐK (5.5) — a TudatpontModal kéri megnyitáskor -----
        if (utvonal.startsWith('/api/tudatpont/hianyzo-felmenok/')) {
          const azonosito = utvonal.split('/')[5];
          if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitás felmenői?' } };

          const talalat = await hianyzoFelmenok(tar, KOINO, decodeURIComponent(azonosito),
            { ...lapHorgonya, szerzo, nezet: pakliNezet });
          if (!talalat) return { allapot: 404, adat: { hiba: 'nincs ilyen entitás' } };
          return { adat: talalat };
        }

        // ----- EGY ENTITÁS RÉSZLETEI (5.5) — a ReszletekModal kéri -----
        // ⚠️ A prototípus típusonként külön útvonalat használ
        // (/api/gondolat/:id/reszletek, /api/kategoria/:id/reszletek, …). A koinóban az
        // azonosító egyértelmű, tehát a típus-előtagot nem is nézzük — de az útvonal
        // alakját megtartjuk, hogy az örökölt modal változatlanul működjön.
        if (utvonal.endsWith('/reszletek') && !utvonal.startsWith('/api/ertekJavaslat/')) {
          const reszek = utvonal.split('/');       // ['', 'api', <tipus>, <id>, 'reszletek']
          const azonosito = reszek[3];
          if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitás?' } };

          const talalat = await entitasReszletei(tar, KOINO, decodeURIComponent(azonosito),
            { ...lapHorgonya, szerzo, nezet: pakliNezet });
          if (!talalat) return { allapot: 404, adat: { hiba: 'nincs ilyen entitás' } };
          return { adat: talalat };
        }

        // ----- A KÜSZÖBÖK (5.5) — az ErtekJavaslatModal és a ReszletekModal kéri -----
        if (utvonal.startsWith('/api/ertekJavaslat/reszletek/')
            || utvonal.startsWith('/api/ertekJavaslat/aktualis/')) {
          const reszek = utvonal.split('/');       // ['', 'api', 'ertekJavaslat', <mi>, <tipus>, <id>]
          const azonosito = reszek[5];
          if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitás küszöbei?' } };

          const talalat = await entitasKuszobei(tar, KOINO, decodeURIComponent(azonosito),
            { ...lapHorgonya, szerzo, nezet: pakliNezet });
          if (!talalat) return { allapot: 404, adat: { hiba: 'nincs ilyen entitás' } };
          return { adat: talalat };
        }

        return null;   // nincs ilyen végpont → a kapu 404-et ad
      };

      const felulet = await kapuNyitasa({
        // ⚠️ A program MELLETT lakik a felület, nem a futtatás helyén — különben másik
        // mappából indítva üres lapot adnánk. (`fileURLToPath`: Windowson is helyes út.)
        mappa: join(dirname(fileURLToPath(import.meta.url)), 'felulet'),
        kezelo,
        port
      });

      kiir(SZIN.vastag + 'A felület fut. Nyisd meg ezt a címet:' + SZIN.vege);
      kiir('  ' + SZIN.jo + felulet.cim + SZIN.vege);
      kiir(SZIN.halvany + 'A jelszó minden indításkor ÚJ, és sehol nincs eltárolva.' + SZIN.vege);
      kiir(SZIN.halvany + 'Csak erről a gépről érhető el (127.0.0.1). Kilépés: Ctrl+C' + SZIN.vege);

      process.on('SIGINT', async () => {
        kiir('\nA felület bezárt.');
        await felulet.zar();
        process.exit(0);
      });
      await new Promise(() => {});   // fut, amíg meg nem szakítják
      break;
    }

    default:
      kiir('Ismeretlen parancs: ' + parancs);
      kiir('Használat: allapot [napok] · kulcs · mentes <fájl> · koino <név> · gondolat <cím> [szöveg]');
      kiir('           pont <azonosító> <pont> [passziv] · javaslat <azonosító> <új cím> [indoklás]');
      kiir('           torol <azonosító> [indoklás] · athelyez <mit> <hova|gyoker> [indoklás]');
      kiir('           egyesit <az1>,<az2>[,...] <egyesített cím> [indoklás]');
      kiir('           ertek <azonosító> <elfogadási%> <részvételi%> <min mp> <max mp>');
      kiir('           belep [alapítás] · meghiv|felhatalmaz|tanusit|bemutatkoz|visszavon <horgony>');
      kiir('           lattam   (az AZONOSSÁG szakasz mutatja, hol tartasz)');
      kiir('           altalanos <álláspont> <hely> [indoklás]  (ÁLTALÁNOS javaslat — D27)');
      kiir('           allast <egyezmény> csatlakozik|tiltakozik|utkozik [másik] [indoklás]');
      kiir('           felszabadit [buli]  (a törölt gondolatokra tett pontod visszavétele)');
      kiir('           szavaz <javaslat> tamogat|ellenez|tartozkodik [kulonag]');
      kiir('           kivisz <fájl> [mind|sajat|<azonosító>] · behoz <fájl>   (a KÉZI ÚT)');
      kiir('           ter [letrehozva|eloszorLattam|nev] [csokkeno|novekvo]  (A BELÉPŐ TÉR)');
      kiir('           orjarat [perc] [port] · figyel [port] · csere [cím] [port]');
      kiir('           pajzsfuro <cím> [port] [tcp] · tukor <cím> [port]');
      kiir('           felfedez [mp] [port] · ujjlenyomat [napok] · cimek · kapu');
      kiir('           kategoria <név> [ikon] [leírás] · gondolattipus <név> [ikon] [leírás]');
      kiir('           gondolat <cím> [szöveg] [típus] [kategória...] · felulet [port]');
      kiir('           tarsak · tars <cím> [port] [név] · tars torol <cím> [port]');
      process.exit(2);
  }
} catch (hiba) {
  kiir(SZIN.nem + 'Nem sikerült: ' + hiba.message + SZIN.vege);
  if (process.env.KOINO_NAPLO) naplo(hiba);
  process.exit(1);
}
