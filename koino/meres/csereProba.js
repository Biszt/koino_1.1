// koino/meres/csereProba.js — a csere-protokoll önpróbája (Szakasz 2 / 1. lépés)
//
// Azt bizonyítja, hogy két tár EGY KÖRBEN meg tudja mondani egymásnak, mit tud, el tudja
// kérni, ami hiányzik, és a végén UGYANAZT ismeri. Hálózat nélkül: itt még csak a
// protokoll LOGIKÁJA mérődik — a drót a következő lépés.
//
// A kérdés, amit ezek a próbák eldöntenek: elég-e szerzőnként a legnagyobb sorszám?
// (A válasz: nem — a hézag és a rejtett elágazás miatt. Lásd az utolsó két szakaszt.)

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { kanonikusSzoveg } from '../js/esemeny/kanonikusAlak.js';
import {
  allasOsszeallitasa, hianyokSzamitasa, valaszOsszeallitasa,
  beolvasztas, csereKor, csereAmigKell, allasokEgyeznek
} from '../js/csere/csere.js';
import { figyeloIndulasa, csereVonalon, parbeszed, szeletHozatala } from '../js/csere/vonal.js';
import { createServer } from 'node:net';
import { pajzsfuras, tcpPajzsfuras } from '../js/csere/pajzsfuro.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import {
  helyiFelfedezes, felfedezoValaszolo, felfedezoUzenet, kialtasFeldolgozasa,
  felfedezettekOsszefesulese
} from '../js/csere/helyiFelfedezes.js';
import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A csere-protokoll próbája');

const KOINO = 'proba';
const mappak = [];

/** Új, üres tár egy eldobható mappában — ez játssza az egyik „készüléket". */
async function ujTar() {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-csere-'));
  mappak.push(mappa);
  return esemenyTarNyitasa(KOINO, mappa);
}

/** Elment több eseményt egy tárba. */
async function ment(tar, esemenyek) {
  for (const e of esemenyek) await esemenyMentese(tar, e);
}

/** Egy e-ember első N eseménye, elmentetlenül (hogy szabadon oszthassuk szét). */
async function lanc(eember, hossz) {
  const esemenyek = [];
  for (let i = 1; i <= hossz; i++) {
    esemenyek.push(await eember.tesz('GondolatLetrehozas', { cim: 'T' + i, meret: 10 * i }));
  }
  return esemenyek;
}

/** Egy szerző sora az állásban. */
const sora = (allas, szerzo) => allas.szerzok.find((sz) => sz.szerzo === szerzo);

/** Egy szerzőtől kért sorszámok. */
const kertek = (kerelem, szerzo) =>
  kerelem.szerzok.find((sz) => sz.szerzo === szerzo)?.sorszamok ?? [];

// ===== AZ ÁLLÁS: „ezt tudom" =====

proba('Az ÜRES tár állása üres (nincs kit felsorolni)', async () => {
  const tar = await ujTar();
  const allas = await allasOsszeallitasa(tar, KOINO);
  return allas.koino === KOINO && allas.szerzok.length === 0;
});

proba('Az állás szerzőnként EGY sor, a legnagyobb sorszámmal', async () => {
  const tar = await ujTar();
  const anna = await ujEember(KOINO);
  const bela = await ujEember(KOINO);
  await ment(tar, await lanc(anna, 3));
  await ment(tar, await lanc(bela, 1));

  const allas = await allasOsszeallitasa(tar, KOINO);
  return allas.szerzok.length === 2
      && sora(allas, anna.szerzo).legnagyobb === 3
      && sora(allas, bela.szerzo).legnagyobb === 1;
});

proba('⭐ UGYANAZ A TUDÁS = UGYANAZ AZ ÁLLÁS (a fájl sorrendje nem számít)', async () => {
  // Ha az állás a mentés sorrendjétől függene, két gép fölöslegesen kérne egymástól —
  // vagy ami rosszabb, azt hinné, eltérnek, holott nem.
  const anna = await ujEember(KOINO);
  const bela = await ujEember(KOINO);
  const annaE = await lanc(anna, 2);
  const belaE = await lanc(bela, 2);

  const egyik = await ujTar();
  await ment(egyik, [annaE[0], annaE[1], belaE[0], belaE[1]]);
  const masik = await ujTar();
  await ment(masik, [belaE[1], annaE[1], belaE[0], annaE[0]]);   // fordítva

  const a = await allasOsszeallitasa(egyik, KOINO);
  const b = await allasOsszeallitasa(masik, KOINO);
  return kanonikusSzoveg(a) === kanonikusSzoveg(b);
});

// ===== A KÉRÉS: „ez hiányzik nekem" =====

proba('Aki UGYANAZT tudja, SEMMIT nem kér', async () => {
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 3);
  const egyik = await ujTar(); await ment(egyik, esemenyek);
  const masik = await ujTar(); await ment(masik, esemenyek);

  const a = await allasOsszeallitasa(egyik, KOINO);
  const b = await allasOsszeallitasa(masik, KOINO);
  return hianyokSzamitasa(a, b).szerzok.length === 0;
});

proba('⭐ Aki LE VAN MARADVA, csak a hiányzó tartományt kéri', async () => {
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 5);
  const lemaradt = await ujTar(); await ment(lemaradt, esemenyek.slice(0, 2));   // 1,2
  const teljes = await ujTar();   await ment(teljes, esemenyek);                 // 1..5

  const kerelem = hianyokSzamitasa(
    await allasOsszeallitasa(lemaradt, KOINO),
    await allasOsszeallitasa(teljes, KOINO)
  );
  return kertek(kerelem, anna.szerzo).join(',') === '3,4,5';
});

proba('Az ISMERETLEN szerző TELJES láncát kéri', async () => {
  const anna = await ujEember(KOINO);
  const ures = await ujTar();
  const teljes = await ujTar(); await ment(teljes, await lanc(anna, 3));

  const kerelem = hianyokSzamitasa(
    await allasOsszeallitasa(ures, KOINO),
    await allasOsszeallitasa(teljes, KOINO)
  );
  return kertek(kerelem, anna.szerzo).join(',') === '1,2,3';
});

proba('⭐ A HÉZAG NEM TŰNIK EL: azonos „legnagyobb" mellett is kéri a lyukat', async () => {
  // EZ AZ A PRÓBA, AMI MIATT a legnagyobb sorszám ÖNMAGÁBAN kevés. Mindkét gép azt
  // mondaná, „a 4-esig ismerem" — és a 3-as örökre hiányozna a lyukasnál.
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 4);
  const lyukas = await ujTar();
  await ment(lyukas, [esemenyek[0], esemenyek[1], esemenyek[3]]);   // 1,2,_,4
  const teljes = await ujTar(); await ment(teljes, esemenyek);      // 1,2,3,4

  const sajat = await allasOsszeallitasa(lyukas, KOINO);
  const kerelem = hianyokSzamitasa(sajat, await allasOsszeallitasa(teljes, KOINO));

  return sora(sajat, anna.szerzo).hezagok.join(',') === '3'
      && kertek(kerelem, anna.szerzo).join(',') === '3';
});

proba('Nem kérünk olyat, ami a MÁSIKNAK SINCS meg (az ő hézagát)', async () => {
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 4);
  const ures = await ujTar();
  const lyukas = await ujTar();
  await ment(lyukas, [esemenyek[0], esemenyek[1], esemenyek[3]]);   // 1,2,_,4

  const kerelem = hianyokSzamitasa(
    await allasOsszeallitasa(ures, KOINO),
    await allasOsszeallitasa(lyukas, KOINO)
  );
  return kertek(kerelem, anna.szerzo).join(',') === '1,2,4';
});

// ===== AZ ELÁGAZÁS: a bizonyíték terjedése =====

proba('⭐ A nála LÁTOTT elágazást CÉLZOTTAN kérjük el (a bizonyíték olcsón megy tovább)', async () => {
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 3);
  const masodik3 = await anna.elagaztat('GondolatLetrehozas', { cim: 'Neki mást', meret: 7 });

  const tudja = await ujTar();   await ment(tudja, [...esemenyek, masodik3]);
  const nemTudja = await ujTar(); await ment(nemTudja, esemenyek);

  const kerelem = hianyokSzamitasa(
    await allasOsszeallitasa(nemTudja, KOINO),
    await allasOsszeallitasa(tudja, KOINO)
  );
  // ⚠️ CSAK a 3-ast kéri, és épp ez a lényeg. Az elágazásról az ujjlenyomat-tartalék is
  // tudomást szerezne — de az a TELJES láncot kérné el. Egy 10 000 eseményes koinóban ez
  // a különbség egyetlen esemény és az egész lánc újratöltése között.
  return kertek(kerelem, anna.szerzo).join(',') === '3';
});

proba('⭐ A lánc KÖZEPÉN elrejtett elágazás is kiderül (ezért kell ujjlenyomat)', async () => {
  // A támadó ugyanarról a pontról két eseményt ír alá, és az egyiket az egyik gépnek,
  // a másikat a másiknak mutatja — majd MINDKETTŐN folytatja a láncot. Ilyenkor:
  //   · a „legnagyobb" mindkét gépen azonos,
  //   · egyik gép sem tud elágazásról,
  //   · és a lánc FEJE is azonos lenne, ha a hamisítás nem az utolsó eseményt érinti.
  // Egyedül a teljes láncot fedő ujjlenyomat árulja el, hogy nem ugyanazt tudják.
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 3);                       // 1,2,3
  const masik3 = await anna.elagaztat('GondolatLetrehozas', { cim: 'A másik arc', meret: 9 });
  const negyedik = await lanc(anna, 1);                        // 4 (a 3-asra épül)

  const egyik = await ujTar(); await ment(egyik, [...esemenyek, ...negyedik]);        // 1,2,3,4
  const masik = await ujTar(); await ment(masik, [esemenyek[0], esemenyek[1], masik3, ...negyedik]); // 1,2,3',4

  const a = await allasOsszeallitasa(egyik, KOINO);
  const b = await allasOsszeallitasa(masik, KOINO);

  // A „legnagyobb" egyezik, elágazásról egyik sem tud — az ujjlenyomat mégis eltér
  const megtevesztoenEgyforma =
    sora(a, anna.szerzo).legnagyobb === sora(b, anna.szerzo).legnagyobb
    && sora(a, anna.szerzo).elagazasok.length === 0
    && sora(b, anna.szerzo).elagazasok.length === 0
    && sora(a, anna.szerzo).ujjlenyomat !== sora(b, anna.szerzo).ujjlenyomat;

  // …és a csere fel is deríti: a végén MINDKÉT gép ismeri MINDKÉT eseményt
  const { egyezik } = await csereAmigKell(egyik, masik, KOINO);
  const egyikE = await koinoEsemenyei(egyik, KOINO);
  const mindketto = egyikE.filter((e) => e.sorszam === 3).length === 2;

  return megtevesztoenEgyforma && egyezik && mindketto;
});

// ===== A VÁLASZ ÉS A BEOLVASZTÁS =====

proba('A válasz CSAK a kért eseményeket adja', async () => {
  const anna = await ujEember(KOINO);
  const bela = await ujEember(KOINO);
  const tar = await ujTar();
  await ment(tar, await lanc(anna, 3));
  await ment(tar, await lanc(bela, 2));

  const valasz = await valaszOsszeallitasa(tar, {
    koino: KOINO, szerzok: [{ szerzo: anna.szerzo, sorszamok: [2] }]
  });
  return valasz.length === 1 && valasz[0].szerzo === anna.szerzo && valasz[0].sorszam === 2;
});

proba('A beolvasztás: az ÚJ bekerül, a MEGLÉVŐ elnyelődik', async () => {
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 3);
  const tar = await ujTar(); await ment(tar, esemenyek.slice(0, 2));

  const eredmeny = await beolvasztas(tar, esemenyek);   // 1,2 már megvan; 3 új
  return eredmeny.uj === 1 && eredmeny.marMegvolt === 2 && eredmeny.elutasitva.length === 0;
});

proba('⭐ A HAMISÍTOTT esemény a HÁLÓZATRÓL SEM kerül be', async () => {
  // A hálózat nem kap engedékenyebb kaput, mint a saját műveleteink: ugyanaz az
  // `esemenyMentese` fut, tehát az aláírás-ellenőrzés itt is lefut.
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 1);
  const hamis = { ...esemenyek[0], adat: { cim: 'Átírva', meret: 10 } };

  const tar = await ujTar();
  const eredmeny = await beolvasztas(tar, [hamis]);
  const bent = await koinoEsemenyei(tar, KOINO);
  return eredmeny.uj === 0 && eredmeny.elutasitva.length === 1 && bent.length === 0;
});

// ===== A TELJES KÖR =====

proba('⭐ EGY KÖR UTÁN a két tár UGYANAZT ismeri (mindkét irányban)', async () => {
  const anna = await ujEember(KOINO);
  const bela = await ujEember(KOINO);
  const annaE = await lanc(anna, 3);
  const belaE = await lanc(bela, 2);

  const egyik = await ujTar(); await ment(egyik, annaE);   // csak Annát ismeri
  const masik = await ujTar(); await ment(masik, belaE);   // csak Bélát ismeri

  const { egyezik } = await csereKor(egyik, masik, KOINO);
  const egyikE = await koinoEsemenyei(egyik, KOINO);
  const masikE = await koinoEsemenyei(masik, KOINO);
  return egyezik && egyikE.length === 5 && masikE.length === 5;
});

proba('⭐ A MÁSODIK kör már nem mozdít semmit (a csere idempotens)', async () => {
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 4));
  const masik = await ujTar();

  await csereKor(egyik, masik, KOINO);
  const masodik = await csereKor(egyik, masik, KOINO);
  return masodik.egyikKapott.uj === 0 && masodik.masikKapott.uj === 0
      && masodik.egyikKapott.marMegvolt === 0 && masodik.masikKapott.marMegvolt === 0;
});

proba('⭐ A SORREND NEM SZÁMÍT: fordított irányból indítva ugyanoda jutunk', async () => {
  const anna = await ujEember(KOINO);
  const bela = await ujEember(KOINO);
  const annaE = await lanc(anna, 3);
  const belaE = await lanc(bela, 3);

  const a1 = await ujTar(); await ment(a1, annaE);
  const b1 = await ujTar(); await ment(b1, belaE);
  await csereKor(a1, b1, KOINO);

  const a2 = await ujTar(); await ment(a2, annaE);
  const b2 = await ujTar(); await ment(b2, belaE);
  await csereKor(b2, a2, KOINO);   // fordítva kezdve

  return await allasokEgyeznek(a1, a2, KOINO) && await allasokEgyeznek(a1, b2, KOINO);
});

proba('A LEMARADT fél egy körben behozza a hátrányát', async () => {
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 10);
  const lemaradt = await ujTar(); await ment(lemaradt, esemenyek.slice(0, 3));
  const teljes = await ujTar();   await ment(teljes, esemenyek);

  const { korok, egyezik } = await csereAmigKell(lemaradt, teljes, KOINO);
  return egyezik && korok === 1;
});

proba('⭐ Az ELŐRÉBB TARTÓ fél nem kér vissza fölöslegesen', async () => {
  // Aki hosszabb láncot ismer, annak az ujjlenyomat-eltérés MAGÁTÓL ÉRTETŐDŐ — nem szabad
  // emiatt visszakérnie az egész láncot, amit már tud. Egy 10 000 eseményes koinóban ez
  // különbség a „pár bájt" és a „töltsük le újra az egészet" között.
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 10);
  const lemaradt = await ujTar(); await ment(lemaradt, esemenyek.slice(0, 3));
  const teljes = await ujTar();   await ment(teljes, esemenyek);

  const kerelem = hianyokSzamitasa(
    await allasOsszeallitasa(teljes, KOINO),
    await allasOsszeallitasa(lemaradt, KOINO)
  );
  return kerelem.szerzok.length === 0;
});

// ===== A VONAL: ugyanez valódi TCP-n =====
//
// Itt már drót van a két tár között — de a protokoll ugyanaz. Ha ezek a próbák mást
// adnának, mint a fentiek, az SZÁLLÍTÁSI hiba lenne, nem protokoll-hiba.

/** Két tár cseréje valódi TCP-kapcsolaton, a helyi gépen. */
async function csereDroton(egyikTar, masikTar, hoszt = '127.0.0.1') {
  const figyelo = await figyeloIndulasa(masikTar, KOINO, 0, { hoszt });
  try {
    return await csereVonalon(egyikTar, KOINO, hoszt, figyelo.port);
  } finally {
    await figyelo.bezar();
  }
}

proba('⭐ A VONAL ugyanoda visz, mint a közvetlen kör', async () => {
  const anna = await ujEember(KOINO);
  const bela = await ujEember(KOINO);
  const annaE = await lanc(anna, 3);
  const belaE = await lanc(bela, 2);

  const egyik = await ujTar(); await ment(egyik, annaE);
  const masik = await ujTar(); await ment(masik, belaE);

  await csereDroton(egyik, masik);
  const egyikE = await koinoEsemenyei(egyik, KOINO);
  const masikE = await koinoEsemenyei(masik, KOINO);
  return egyikE.length === 5 && masikE.length === 5
      && await allasokEgyeznek(egyik, masik, KOINO);
});

proba('⭐ A VONALON is kiderül a lánc közepén elrejtett elágazás', async () => {
  // Ez az, amiért egy kapcsolaton TÖBB kör fut: a felderítés két körbe telik.
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 3);
  const masik3 = await anna.elagaztat('GondolatLetrehozas', { cim: 'A másik arc', meret: 9 });
  const negyedik = await lanc(anna, 1);

  const egyik = await ujTar(); await ment(egyik, [...esemenyek, ...negyedik]);
  const masik = await ujTar();
  await ment(masik, [esemenyek[0], esemenyek[1], masik3, ...negyedik]);

  await csereDroton(egyik, masik);
  const harmasok = (await koinoEsemenyei(egyik, KOINO)).filter((e) => e.sorszam === 3);
  return harmasok.length === 2 && await allasokEgyeznek(egyik, masik, KOINO);
});

proba('A VONALON is idempotens: a második csatlakozás nem hoz újat', async () => {
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 4));
  const masik = await ujTar();

  const elso = await csereDroton(egyik, masik);
  const masodik = await csereDroton(egyik, masik);
  return elso.kuldott === 4 && masodik.kuldott === 0 && masodik.uj === 0;
});

proba('A VONAL IPv6-on is áll (::1) — a Szakasz 2 nagy kérdésének előszobája', async () => {
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 2));
  const masik = await ujTar();

  await csereDroton(egyik, masik, '::1');
  return (await koinoEsemenyei(masik, KOINO)).length === 2;
});

proba('MÉRÉS: mennyi idő alatt ér körbe egy esemény (helyben)', async () => {
  // A Szakasz 2 terve ezt a számot külön kéri — ez dönti el a józan MINIMUM DÖNTÉSI IDŐT
  // (D4), és a „hézag-óvatosság" árát. Ez itt a helyi alsó korlát: hálózat nélkül.
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 1));
  const masik = await ujTar();

  const kezdet = performance.now();
  await csereDroton(egyik, masik);
  const eltelt = Math.round(performance.now() - kezdet);
  process.stdout.write('           ↳ mérve: ' + eltelt + ' ms (kapcsolatnyitás + két kör, helyben)\n');

  return (await koinoEsemenyei(masik, KOINO)).length === 1 && eltelt < 1000;
});

// ===== MÉRÉS: mekkora az ÁLLÁS? =====
//
// A Szakasz 2 terve ezt a számot külön kéri: „az ÁLLÁS üzenet mérete N e-embernél" —
// mert ez dönti el, szeletelni kell-e a csere-protokollt, vagy egyben marad.

proba('MÉRÉS: az ÁLLÁS 50 e-embernél is 200 bájt/fő alatt marad', async () => {
  const tar = await ujTar();
  const LETSZAM = 50;
  for (let i = 0; i < LETSZAM; i++) {
    const valaki = await ujEember(KOINO);
    await ment(tar, await lanc(valaki, 3));
  }

  const allas = await allasOsszeallitasa(tar, KOINO);
  const bajt = new TextEncoder().encode(JSON.stringify(allas)).length;
  const fejenkent = Math.round(bajt / LETSZAM);
  process.stdout.write('           ↳ mérve: ' + bajt + ' bájt / ' + LETSZAM
    + ' e-ember = ' + fejenkent + ' bájt/fő\n');

  return allas.szerzok.length === LETSZAM && fejenkent < 200;
});

// ===== AZ OLCSÓ CSERE (D35, B. lépés) =====
//
// ⭐ MIT KELL ITT BIZONYÍTANI? Nem azt, hogy „gyorsabb" — hanem azt, hogy a hétköznapi
// eset (KÉT CSERE KÖZÖTT SEMMI NEM TÖRTÉNT) nem küldi el a részletes állást. Ez azért
// befogadási kérdés, mert az állás ára a LÉTSZÁMMAL nő: 162 bájt/fő, mindkét irányban.
// Egy mobilos e-embernek ez a számláján jelenik meg.

proba('⭐ A „NINCS ÚJDONSÁG" csere el sem küldi a részletes állást', async () => {
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 4));
  const masik = await ujTar();

  const elso = await csereDroton(egyik, masik);       // itt még kell a részletes állás
  const masodik = await csereDroton(egyik, masik);    // itt már nem

  return elso.reszletesAllasok >= 1 && masodik.reszletesAllasok === 0
    && masodik.uj === 0 && masodik.kuldott === 0;
});

proba('⭐ ELTÉRŐ tudásnál viszont elindul a részletes állás (a lenyomat nem takar el semmit)', async () => {
  const anna = await ujEember(KOINO);
  const bela = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 3));
  const masik = await ujTar(); await ment(masik, await lanc(bela, 2));

  const eredmeny = await csereDroton(egyik, masik);
  return eredmeny.reszletesAllasok >= 1
    && (await koinoEsemenyei(egyik, KOINO)).length === 5
    && await allasokEgyeznek(egyik, masik, KOINO);
});

proba('⭐ A lánc közepén elrejtett elágazás az OLCSÓ kezdés után is kiderül', async () => {
  // ⚠️ Ez a legfontosabb rontás-próba a B. lépéshez: a spórolás nem vakíthatja meg a
  // cserét. A két félnek AZONOS a legnagyobb sorszáma, de más a 3. eseménye — a lenyomat
  // ezért eltér, tehát a részletes állás elindul, és az elágazás előjön.
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 3);
  const masik3 = await anna.elagaztat('GondolatLetrehozas', { cim: 'A másik arc', meret: 9 });
  const negyedik = await lanc(anna, 1);

  const egyik = await ujTar(); await ment(egyik, [...esemenyek, ...negyedik]);
  const masik = await ujTar();
  await ment(masik, [esemenyek[0], esemenyek[1], masik3, ...negyedik]);

  await csereDroton(egyik, masik);
  const harmasok = (await koinoEsemenyei(egyik, KOINO)).filter((e) => e.sorszam === 3);
  return harmasok.length === 2 && await allasokEgyeznek(egyik, masik, KOINO);
});

proba('⭐ MÉRÉS: mennyibe kerül egy „nincs újdonság" csere 50 e-embernél', async () => {
  // Ez a D35 száma. A régi protokollban a kör MINDIG a részletes állással kezdődött,
  // tehát ez a csere legalább kétszer ~8 KB volt (oda-vissza, két körben).
  const LETSZAM = 50;
  const egyik = await ujTar();
  const masik = await ujTar();
  for (let i = 0; i < LETSZAM; i++) {
    const valaki = await ujEember(KOINO);
    const ove = await lanc(valaki, 3);
    await ment(egyik, ove);
    await ment(masik, ove);            // mindkettő MINDENT tud: nincs újdonság
  }

  const allas = await allasOsszeallitasa(egyik, KOINO);
  const allasBajt = new TextEncoder().encode(JSON.stringify(allas)).length;

  const eredmeny = await csereDroton(egyik, masik);
  const osszes = eredmeny.bajtKuldott + eredmeny.bajtKapott;

  process.stdout.write('           ↳ mérve: ' + osszes + ' bájt oda-vissza — a régi'
    + ' protokoll legalább ' + (allasBajt * 2) + ' bájt volt (2× a részletes állás)\n');

  // ⚠️ A KÜSZÖB 300-ról 500-ra nőtt, és ez tudatos ár: a LENYOMAT azóta viszi a TÜKRÖT
  // („innen látlak"), és minden kör visz egy CÍMJEGYZÉKET is. Ezekért cserébe a hálózat
  // magától tud bővülni (D36–D38) — enélkül minden címet kézzel kellene begépelni.
  return eredmeny.reszletesAllasok === 0 && osszes < 500 && osszes * 20 < allasBajt;
});

// ===== KÉT KÜLÖNBÖZŐ KOINO (2026-08-29, mérés után javítva) =====
//
// ⚠️ EZ EGY MEGMÉRT HIBÁRA ÍRÓDOTT. Csaba kérdése nyomán kipróbáltuk, mi történik, ha egy
// MÁSIK koino készüléke szól be a portra. Kiderült:
//
//   · az eseményei BEKERÜLTEK a mappánkba (az állapotot nem rontották el, mert a
//     `koinoEsemenyei` szűr — de ott ültek, és egy hazug fél így tölthetné a lemezünket),
//   · és mivel az ÁLLÁS mindig csak a saját koinóra készül, a két lenyomat SOSEM
//     konvergált: a csere a kör-korlátig pörgött, ugyanazt küldve újra. Mérve: 17,2 KB.
//
// A javítás két rétegű, szándékosan: a LENYOMAT megmondja, melyik koinóról beszélünk
// (ez az ŐSZINTE tévedést fogja meg), a beolvasztás pedig szűr (ez a HAZUGOT).

/** Külön tár egy MÁSIK koinónak — ugyanabban az eldobható mappa-rendszerben. */
async function ujTarMasKoinonak(masKoino) {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-csere-'));
  mappak.push(mappa);
  return esemenyTarNyitasa(masKoino, mappa);
}

proba('⭐ MÁS KOINO: a csere azonnal véget ér, és nem keveredik semmi', async () => {
  const MASIK = 'masik-koino';

  const anna = await ujEember(KOINO);
  const mienk = await ujTar(); await ment(mienk, await lanc(anna, 3));

  const bela = await ujEember(MASIK);
  const ove = await ujTarMasKoinonak(MASIK);
  for (let i = 1; i <= 3; i++) {
    await esemenyMentese(ove, await bela.tesz('GondolatLetrehozas', { cim: 'M' + i, meret: 10 }));
  }

  const figyelo = await figyeloIndulasa(mienk, KOINO, 0, { hoszt: '127.0.0.1' });
  let eredmeny;
  try {
    eredmeny = await csereVonalon(ove, MASIK, '127.0.0.1', figyelo.port);
  } finally {
    await figyelo.bezar();
  }

  return eredmeny.masKoino === KOINO            // felismerte, kivel beszélt
    && eredmeny.korok === 1                     // EGY kör, nem öt
    && eredmeny.uj === 0 && eredmeny.kuldott === 0
    && eredmeny.reszletesAllasok === 0          // a részletes állás el sem indult
    && (await koinoEsemenyei(mienk, KOINO)).length === 3        // a mi tárunk érintetlen
    && (await koinoEsemenyei(ove, MASIK)).length === 3;         // az övé is
});

proba('⭐ A MAPPA is tiszta marad — nem csak a számított állapot', async () => {
  // ⚠️ A korábbi viselkedésnél épp ez volt a baj: az állapot rendben volt, de a fájlban
  // ott ültek az idegen események. Ezért a NYERS fájlt nézzük, nem a szűrt listát.
  const MASIK = 'masik-koino';

  const anna = await ujEember(KOINO);
  const mienk = await ujTar(); await ment(mienk, await lanc(anna, 2));

  const bela = await ujEember(MASIK);
  const ove = await ujTarMasKoinonak(MASIK);
  await esemenyMentese(ove, await bela.tesz('GondolatLetrehozas', { cim: 'M', meret: 10 }));

  const figyelo = await figyeloIndulasa(mienk, KOINO, 0, { hoszt: '127.0.0.1' });
  try {
    await csereVonalon(ove, MASIK, '127.0.0.1', figyelo.port);
  } finally {
    await figyelo.bezar();
  }

  const nyers = await mienk.betolt();                       // a tár SZŰRETLEN gondolata
  return nyers.length === 2 && nyers.every((e) => e.koino === KOINO);
});

proba('⭐ A HAZUG fél ellen is véd: idegen koino eseményét a beolvasztás kiszűri', async () => {
  // A protokoll eleji egyeztetés az ŐSZINTE tévedést fogja meg — de aki HAZUDIK
  // (a mi koinónkat mondja, és mást küld), azt csak ez a réteg állítja meg.
  const tar = await ujTar();
  const anna = await ujEember(KOINO);
  const bela = await ujEember('idegen-koino');

  const mienk = await anna.tesz('GondolatLetrehozas', { cim: 'Miénk', meret: 10 });
  const ideg = await bela.tesz('GondolatLetrehozas', { cim: 'Idegen', meret: 10 });

  const eredmeny = await beolvasztas(tar, [mienk, ideg], KOINO);
  const nyers = await tar.betolt();

  return eredmeny.uj === 1 && eredmeny.idegen === 1
    && nyers.length === 1 && nyers[0].adat.cim === 'Miénk';
});

// ===== A PAJZSFÚRÓ (E. lépés) =====
//
// ⚠️ Ez SZÁLLÍTÁS, nem protokoll — a `pajzsfuro.js` semmit nem tud a koinóról. Itt csak
// azt mérjük, hogy a kopogás működik-e: két példány egymásra talál-e, és megkülönbözteti-e
// a fél sikert (csak az egyik irány) a teljestől.

proba('⭐ A PAJZSFÚRÓ: két fél egymásra talál, és MINDKÉT irányt igazolja', async () => {
  const A = 7391, B = 7392;
  const [egyik, masik] = await Promise.all([
    pajzsfuras(A, '::1', B, { idokorlat: 3000, koz: 100 }),
    pajzsfuras(B, '::1', A, { idokorlat: 3000, koz: 100 })
  ]);
  // A `mindketIrany` a lényeg: nem elég, hogy kaptunk valamit — az kell, hogy a MI
  // csomagunk is átjutott, mert a lyukfúrás csak így ér valamit.
  return egyik.sikerult && masik.sikerult
    && egyik.mindketIrany && masik.mindketIrany
    && egyik.kuldott > 0 && masik.kuldott > 0;
});

proba('⭐⭐ A FÚRÓ MEGMÉRI A SAJÁT KÜLSŐ CÍMÉT — a saját foglalatáról', async () => {
  // ⚠️ MÉRÉSBŐL JÖTT (2026-08-30, mobilhálózatos kísérlet). A `kulsoport` parancs KÜLÖN
  // foglalatot nyit, mér, bezárja — a fúró viszont ÚJ foglalatot nyit, ami más NAT-
  // leképezést kaphat. A bemondott szám tehát tippen múlt (akkor épp stimmelt).
  // Ráadásul fúrás közben külön mérni sem lehet: a STUN-válasz a FÚRÓ foglalatára megy.
  //
  // ⭐ Itt nem STUN-kiszolgálót mérünk (az a hálózat lenne, nem a program), hanem azt,
  // hogy a fúró a saját foglalatán KÉRDEZ, és a választ nem nézi kopogásnak.
  const { createSocket } = await import('node:dgram');

  // Hamis „tükör": bármilyen STUN-kérdésre ugyanazt a címet feleli.
  const tukor = createSocket({ type: 'udp4', reuseAddr: true });
  await new Promise((t) => tukor.bind(0, '127.0.0.1', t));
  tukor.on('message', (keres, felado) => {
    const valasz = Buffer.alloc(32);
    valasz.writeUInt16BE(0x0101, 0);            // Binding Success Response
    valasz.writeUInt16BE(12, 2);
    keres.copy(valasz, 4, 4, 20);               // süti + tranzakció-azonosító
    valasz.writeUInt16BE(0x0020, 20);           // XOR-MAPPED-ADDRESS
    valasz.writeUInt16BE(8, 22);
    valasz.writeUInt8(0, 24); valasz.writeUInt8(0x01, 25);
    valasz.writeUInt16BE(9999 ^ 0x2112, 26);    // a „külső port": 9999
    valasz.writeUInt8(203 ^ 0x21, 28); valasz.writeUInt8(0 ^ 0x12, 29);
    valasz.writeUInt8(113 ^ 0xa4, 30); valasz.writeUInt8(7 ^ 0x42, 31);   // 203.0.113.7
    tukor.send(valasz, felado.port, felado.address);
  });

  try {
    const esemenyek = [];
    const eredmeny = await pajzsfuras(7395, '127.0.0.1', 7396, {
      idokorlat: 1500, koz: 200,
      tukorSzerver: '127.0.0.1', tukorPort: tukor.address().port,
      utana: (e) => esemenyek.push(e)
    });

    const merte = esemenyek.find((e) => e.mi === 'SAJAT-KULSO-CIM');
    return !!merte && merte.cim === '203.0.113.7' && merte.port === 9999
      && eredmeny.sajatKulso?.port === 9999
      // ⭐ ÉS A LÉNYEG: a tükör válaszát NEM számolta beérkezett kopogásnak.
      && eredmeny.kapott === 0;
  } finally {
    tukor.close();
  }
});

proba('⭐ A STUN-válasz felismerhető — nem keverjük össze a kopogással', async () => {
  const { stunValaszE } = await import('../js/csere/pajzsfuro.js');
  const stun = Buffer.alloc(20);
  stun.writeUInt32BE(0x2112A442, 4);
  const kopogas = Buffer.from(JSON.stringify({ uzenet: 'KOPOG', tol: 'valaki' }));
  return stunValaszE(stun) && !stunValaszE(kopogas) && !stunValaszE(Buffer.alloc(4));
});

proba('⭐⭐ A CÍMJEGYZÉK TERJED: a társak elmondják egymásnak, kiket ismernek', async () => {
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 2));
  const masik = await ujTar();

  const oveCimei = [{ hoszt: '2001:db8::b', port: 7373 }];
  const figyelo = await figyeloIndulasa(masik, KOINO, 0, {
    hoszt: '127.0.0.1', hirdetettCimek: oveCimei
  });
  try {
    const eredmeny = await csereVonalon(egyik, KOINO, '127.0.0.1', figyelo.port, 10000,
      [{ hoszt: '2001:db8::a', port: 7373 }]);
    // ⚠️ A D39 óta KÉT cím jön: a figyelő TÁRSÁÉ (ezt méri ez a próba) és a figyelő
    // SAJÁTJA (azt a következő próba méri). Ezért nem darabszámra nézünk, hanem arra,
    // hogy a társ címe TÉNYLEG átjött-e.
    const tarse = eredmeny.kapottCimek.find((c) => c.hoszt === '2001:db8::b');
    return !!tarse && tarse.port === 7373;
  } finally {
    await figyelo.bezar();
  }
});

proba('⭐ A címek akkor is terjednek, ha NINCS újdonság (különben nem bővülne a háló)', async () => {
  // ⚠️ Ezért megy a címcsere a lenyomat-egyezés ELŐTT. Ha utána menne, a hétköznapi
  // „nincs újdonság" beszélgetés egyetlen címet sem vinne tovább.
  const anna = await ujEember(KOINO);
  const esemenyek = await lanc(anna, 2);
  const egyik = await ujTar(); await ment(egyik, esemenyek);
  const masik = await ujTar(); await ment(masik, esemenyek);   // MINDKETTŐ ugyanazt tudja

  const figyelo = await figyeloIndulasa(masik, KOINO, 0, {
    hoszt: '127.0.0.1', hirdetettCimek: [{ hoszt: '2001:db8::c', port: 7373 }]
  });
  try {
    const eredmeny = await csereVonalon(egyik, KOINO, '127.0.0.1', figyelo.port);
    return eredmeny.uj === 0 && eredmeny.reszletesAllasok === 0    // tényleg nem volt újdonság
      && eredmeny.kapottCimek.some((c) => c.hoszt === '2001:db8::c');
  } finally {
    await figyelo.bezar();
  }
});

proba('⭐⭐ A FIGYELŐ A SAJÁT CÍMÉT IS HIRDETI — a tükörtől tanultat (D39)', async () => {
  // ⚠️ EZ A HIÁNYZÓ LÁNCSZEM VOLT. Eddig mindenki CSAK a társai címeit adta tovább, a
  // sajátját soha — ezért egy címváltozás csak addig terjedt, ameddig a gazdája maga
  // elvitte. A figyelő viszont TUDJA a saját címét: a hívó visszamondja neki, hogy
  // honnan látja. Innentől ezt is továbbadja.
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 1));
  const masik = await ujTar();

  // A figyelőnek NINCS egyetlen felvett társ-címe sem — így ami visszajön, csakis a
  // sajátja lehet. (Ez teszi a próbát vakság-mentessé.)
  const figyelo = await figyeloIndulasa(masik, KOINO, 0, {
    hoszt: '127.0.0.1', hirdetettCimek: []
  });
  try {
    const eredmeny = await csereVonalon(egyik, KOINO, '127.0.0.1', figyelo.port);
    return eredmeny.kapottCimek.length === 1
      && eredmeny.kapottCimek[0].hoszt === '127.0.0.1'
      && eredmeny.kapottCimek[0].port === figyelo.port;   // épp az a kapu, amin bejöttünk
  } finally {
    await figyelo.bezar();
  }
});

proba('⭐⭐ RONTÁS-PRÓBA: a KIFELÉ HÍVÓ nem hirdeti a megfigyelt címét (efemer port)', async () => {
  // ⚠️ MIÉRT VOLNA HIBA? Mert a kifelé induló TCP-kapcsolat portját a rendszer adja, és a
  // kapcsolat után elengedi. Ha ezt hirdetnénk, HALOTT címet terjesztenénk a hálózaton —
  // és a hézag-kereső társak azt hinnék, van hova visszaszólni. A tükör tehát nem
  // önmagában érték: csak annak, aki a megfigyelt portot nyitva is tartja.
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 1));
  const masik = await ujTar();

  const figyelo = await figyeloIndulasa(masik, KOINO, 0, {
    hoszt: '127.0.0.1', hirdetettCimek: []
  });
  try {
    // A hívó oldalán gyűjtjük össze, mit küldött EL — ehhez a `parbeszed`-et közvetlenül
    // futtatjuk egy foglalaton, alapbeállítással (tehát `sajatCimHirdetese` nélkül).
    const { connect } = await import('node:net');
    const kapcsolat = connect({ host: '127.0.0.1', port: figyelo.port });
    await new Promise((t, e) => { kapcsolat.once('connect', t); kapcsolat.once('error', e); });

    const elkuldott = [];
    const eredetiIras = kapcsolat.write.bind(kapcsolat);
    kapcsolat.write = (szoveg) => {
      try {
        const u = JSON.parse(String(szoveg).trim());
        if (u.uzenet === 'CIMEK') elkuldott.push(...u.cimek);
      } catch { /* nem CIMEK: nem érdekes */ }
      return eredetiIras(szoveg);
    };

    try {
      await parbeszed(kapcsolat, egyik, KOINO, { hirdetettCimek: [] });
    } finally {
      kapcsolat.end();
    }
    return elkuldott.length === 0;         // a hívó SEMMIT nem hirdetett magáról
  } finally {
    await figyelo.bezar();
  }
});

proba('⭐ A címek NEM lesznek események — a tár tiszta marad', async () => {
  // ⚠️ A cím múlandó körülmény, nem igazság: két hét múlva már másé. Egy aláírt esemény
  // örökre megmaradna, ezért a címek CSAK a vonalon utaznak.
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 2));
  const masik = await ujTar();

  const figyelo = await figyeloIndulasa(masik, KOINO, 0, {
    hoszt: '127.0.0.1', hirdetettCimek: [{ hoszt: '2001:db8::d', port: 7373 }]
  });
  try {
    await csereVonalon(egyik, KOINO, '127.0.0.1', figyelo.port, 10000,
      [{ hoszt: '2001:db8::e', port: 7373 }]);
    const egyikNyers = await egyik.betolt();
    const masikNyers = await masik.betolt();
    const vanBenneCim = (l) => l.some((e) => JSON.stringify(e).includes('2001:db8'));
    return !vanBenneCim(egyikNyers) && !vanBenneCim(masikNyers) && masikNyers.length === 2;
  } finally {
    await figyelo.bezar();
  }
});

proba('⭐ A rossz címeket eldobjuk, és legfeljebb 10-et fogadunk el', async () => {
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 1));
  const masik = await ujTar();

  const sok = [];
  for (let i = 0; i < 25; i++) sok.push({ hoszt: '2001:db8::' + i, port: 7373 });
  sok.push({ hoszt: 'rossz', port: 0 }, { hoszt: 5, port: 7373 }, null);

  const figyelo = await figyeloIndulasa(masik, KOINO, 0, {
    hoszt: '127.0.0.1', hirdetettCimek: sok
  });
  try {
    const eredmeny = await csereVonalon(egyik, KOINO, '127.0.0.1', figyelo.port);
    // ⚠️ A D39 óta a figyelő SAJÁT címe is beleszámít a tízbe (és elöl van) — a korlát
    // viszont ugyanúgy áll, és rossz cím továbbra sem jöhet át.
    return eredmeny.kapottCimek.length === 10
      && eredmeny.kapottCimek.every((c) =>
        typeof c.hoszt === 'string' && Number.isInteger(c.port) && c.port > 0)
      && !eredmeny.kapottCimek.some((c) => c.hoszt === 'rossz');
  } finally {
    await figyelo.bezar();
  }
});

proba('⭐⭐ A TÜKÖR: a másik megmondja, milyen címről lát minket', async () => {
  // ⭐ EZ VÁLTJA KI A STUN-T. IPv4-en a router átírja a portot, tehát a készülék nem
  // ismeri a saját külső címét — enélkül nem tudja megmondani, hova kopogjanak neki.
  // A koinóban nem kell hozzá szolgáltatás: aki fogad, az látja, és visszamondja.
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 2));
  const masik = await ujTar();

  const figyelo = await figyeloIndulasa(masik, KOINO, 0, { hoszt: '127.0.0.1' });
  try {
    const eredmeny = await csereVonalon(egyik, KOINO, '127.0.0.1', figyelo.port);
    // Helyben a „külső" cím a hurok-cím, a port pedig a rendszer által adott forrás-port.
    return !!eredmeny.kivulrolIgyLatszom
      && typeof eredmeny.kivulrolIgyLatszom.port === 'number'
      && eredmeny.kivulrolIgyLatszom.port > 0
      && String(eredmeny.kivulrolIgyLatszom.cim).includes('127.0.0.1');
  } finally {
    await figyelo.bezar();
  }
});

proba('⭐ A tükör NEM ad bizalmat: az esemény-kapu ugyanaz marad', async () => {
  // ⚠️ A tükör megfigyelés, nem igazság. Attól, hogy valaki megmondja, hol lát minket,
  // még egyetlen eseménye sem kap könnyebb utat — ezt a hamisítás-próba őrzi máshol,
  // itt azt mérjük, hogy a tükör-mező NEM kerül be sehova az állapotba.
  const anna = await ujEember(KOINO);
  const egyik = await ujTar(); await ment(egyik, await lanc(anna, 2));
  const masik = await ujTar();

  const figyelo = await figyeloIndulasa(masik, KOINO, 0, { hoszt: '127.0.0.1' });
  try {
    await csereVonalon(egyik, KOINO, '127.0.0.1', figyelo.port);
    const nyers = await masik.betolt();
    // Egyetlen elmentett esemény sem hordoz „latlak" mezőt: a tükör a vonalon marad.
    return nyers.length === 2 && nyers.every((e) => e.latlak === undefined);
  } finally {
    await figyelo.bezar();
  }
});

proba('⭐⭐ A TCP-fúró a RÖGZÍTETT helyi portról hív — EZEN MÚLIK AZ EGÉSZ', async () => {
  // ⭐ MIÉRT EZ A LÉNYEG? A pajzsfúrás azért működhet, mert mindkét fél UGYANARRÓL a
  // portról UGYANARRA a portra hív — így a két router ugyanazt a négyest (cím+port ↔
  // cím+port) jegyzi fel, és a rések egymásra illeszkednek. A `csere` épp ezt nem
  // csinálja: véletlen helyi portról indul, ezért nem tud átfúrni.
  //
  // ⚠️ AMIT ITT NEM LEHET MEGMÉRNI: magát az „egyidejű nyitást". A helyi hurkon a rendszer
  // AZONNAL elutasít (ECONNREFUSED), ha nincs figyelő — így sosem alakul ki a függőben
  // lévő hívás, ami ehhez kellene. Valódi hálózaton a SYN kimegy és VÁRAKOZIK, mert a
  // router csendben eldobja. Ez tehát csak élesben, két hálózat között mérhető.
  // ⚠️ VÉLETLEN PORTOK. Az első változat rögzített portot használt, és egy előző futás
  // után a rendszer még fogta őket (EADDRINUSE) — a próba hol átment, hol nem. Egy
  // ingadozó próba rosszabb a semminél: azt tanítja, hogy a piros szín néha hazudik.
  const sajatPort = 20000 + Math.floor(Math.random() * 30000);

  let honnanPort = null;
  const kiszolgalo = createServer((k) => { honnanPort = k.remotePort; k.end(); });
  await new Promise((t) => kiszolgalo.listen(0, '::1', t));
  const celPort = kiszolgalo.address().port;

  try {
    const eredmeny = await tcpPajzsfuras(sajatPort, '::1', celPort, {
      koz: 200, probaIdo: 500, maxProba: 3
    });
    eredmeny.kapcsolat?.destroy();
    return eredmeny.sikerult && honnanPort === sajatPort;
  } finally {
    await new Promise((t) => kiszolgalo.close(t));
  }
});

proba('⭐ A TCP-fúró FELADJA, ha nincs kit átfúrni (nem fut örökké a próbákban)', async () => {
  const eredmeny = await tcpPajzsfuras(
    20000 + Math.floor(Math.random() * 30000), '::1',
    20000 + Math.floor(Math.random() * 30000),
    { koz: 100, probaIdo: 100, maxProba: 3 }
  );
  return eredmeny.sikerult === false && eredmeny.probak === 3 && eredmeny.kapcsolat === null;
});

proba('⭐⭐ RONTÁS-PRÓBA: a SAJÁT visszhang NEM siker (a mérés nem vak)', async () => {
  // ⚠️ Az első változat ezen elbukott: aki a saját címére kopogott, „teljes sikert"
  // kapott — pedig senkivel nem beszélt. Élesben ez hamis eredményt adott volna.
  const eredmeny = await pajzsfuras(7397, '::1', 7397, { idokorlat: 700, koz: 100 });
  return eredmeny.sikerult === false && eredmeny.mindketIrany === false
    && eredmeny.kapott === 0 && eredmeny.sajatVisszhang > 0;
});

proba('⭐ Ha NINCS ott senki, nem dob hibát — csak sikertelen lesz', async () => {
  // Ez a valódi eset a szomszédnál: kopogunk, és nem jön válasz. A koino ettől még
  // működik tovább (2. szabály), csak nem talált társat.
  const eredmeny = await pajzsfuras(7393, '::1', 7394, { idokorlat: 700, koz: 100 });
  return eredmeny.sikerult === false && eredmeny.mindketIrany === false
    && eredmeny.kuldott > 0 && eredmeny.kapott === 0;
});

// ===== A UDP-VONAL: a csere az ÁTFÚRT RÉSEN =====
//
// ⭐ MIÉRT KELL? A pajzsfúrás UDP-vel nyitja a rést, és a router a TCP-t meg az UDP-t
// KÜLÖN tartja számon — az átfúrt lyukon csak UDP fér át. E nélkül a fúrás szép mérés
// maradna, de esemény nem menne rajta.
//
// ⭐ ÉS AMIT BIZONYÍTANI KELL: hogy a PROTOKOLL VÁLTOZATLAN. Ugyanaz a `parbeszed` fut,
// csak más alatta a szállítás — ez az 1. szabály gyakorlati haszna.

/** Két UDP-foglalat, egymásnak címezve — ez játssza az „átfúrt rést". */
async function udpParos(vesztesegAranya = 0) {
  const { createSocket } = await import('node:dgram');
  const egyik = createSocket({ type: 'udp4', reuseAddr: true });
  const masik = createSocket({ type: 'udp4', reuseAddr: true });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));

  // ⚠️ CSOMAGVESZTÉS-UTÁNZAT: az UDP-nél ez a valóság, nem kivétel. Ha a próba csak
  // tökéletes hálózaton menne át, semmit nem bizonyítana.
  if (vesztesegAranya > 0) {
    for (const halo of [egyik, masik]) {
      const eredeti = halo.send.bind(halo);
      halo.send = (...ervek) => {
        if (Math.random() < vesztesegAranya) {
          const visszahivas = ervek.find((e) => typeof e === 'function');
          if (visszahivas) visszahivas(null);
          return;                                  // a csomag „elveszett"
        }
        return eredeti(...ervek);
      };
    }
  }

  return {
    egyik, masik,
    egyikPort: egyik.address().port,
    masikPort: masik.address().port,
    bezar: () => { egyik.close(); masik.close(); }
  };
}

proba('⭐⭐ A CSERE ÁTMEGY A UDP-RÉSEN — ugyanaz a protokoll, más szállítás', async () => {
  const anna = await ujEember(KOINO);
  const egyikTar = await ujTar(); await ment(egyikTar, await lanc(anna, 3));
  const masikTar = await ujTar();

  const p = await udpParos();
  try {
    const [a, b] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, egyikTar, KOINO),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, masikTar, KOINO)
    ]);
    return a.kuldott === 3 && b.uj === 3
      && (await koinoEsemenyei(masikTar, KOINO)).length === 3
      && await allasokEgyeznek(egyikTar, masikTar, KOINO);
  } finally {
    p.bezar();
  }
});

proba('⭐⭐ CSOMAGVESZTÉS MELLETT IS ÁTMEGY (30% elveszik) — újraküldés + sorrend', async () => {
  // ⚠️ EZ A LÉNYEG. A TCP-től ingyen kaptuk a megérkezést és a sorrendet; UDP-n nekünk
  // kell pótolni. Ha ez a próba nem lenne, az első valódi csomagvesztésnél derülne ki,
  // hogy a csere némán félbemarad.
  const anna = await ujEember(KOINO);
  const egyikTar = await ujTar(); await ment(egyikTar, await lanc(anna, 4));
  const masikTar = await ujTar();

  const p = await udpParos(0.3);
  try {
    const [, b] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, egyikTar, KOINO),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, masikTar, KOINO)
    ]);
    return b.uj === 4 && await allasokEgyeznek(egyikTar, masikTar, KOINO);
  } finally {
    p.bezar();
  }
});

proba('⭐⭐ RONTÁS-PRÓBA: a lezárás NEM dobhatja el az utolsó darabot (5× egymás után)', async () => {
  // ⚠️ EZ EGY MEGTÖRTÉNT HOLTPONT ŐRE (2026-08-30). A fenti csomagvesztéses próba
  // ÖNMAGÁBAN ÁTMENT — csak 6-ból 1-szer. A maradék 5-ben a teljes önpróba-készlet
  // VÉGTELENÜL VÁRT, mert két őr hiányzott a `udpVonal.js`-ből:
  //   · a `parbeszed` az utolsó LENYOMAT-ra már nem vár nyugtát, és ha közben a másik
  //     válasza megjön, kilép — a régi `end()` pedig eldobta az úton lévő darabot;
  //   · tétlenségi óra nem volt, tehát a másik fél örökre várhatott rá.
  //
  // ⭐ MIÉRT ÖTSZÖR? Mert ez VÉLETLEN-FÜGGŐ hiba: a régi kóddal egyetlen futás mérve
  // 6-ból 1-szer akkor is ZÖLD volt, ha a kód rossz. Öt futásnak mind az ötje csak
  // (1/6)^5 ≈ nyolcezred eséllyel sikerül — vagyis a hiba nem tud átcsúszni.
  //
  // ⚠️ ÉS MIÉRT 5000 ms A HATÁRIDŐ? Mérve: egy 30%-os vesztésű csere maga is 2,2–5,3
  // MÁSODPERC (minden elveszett csomag egy 300 ms-os újraküldés-várás). De a határidő
  // TÉTLENSÉGET mér, nem összidőt: két csomag között ~300 ms telik, tehát 5000 ms
  // csendhez 16 egymás utáni vesztés kellene (0,3^16 — sosem). Egy visszatérő hiba
  // viszont TELJES csendet csinál, tehát 5 másodperc múlva BUKÁS lesz, nem beragadás.
  for (let i = 0; i < 5; i++) {
    const anna = await ujEember(KOINO);
    const egyikTar = await ujTar(); await ment(egyikTar, await lanc(anna, 4));
    const masikTar = await ujTar();

    const p = await udpParos(0.3);
    try {
      const [, b] = await Promise.all([
        csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, egyikTar, KOINO,
          { varakozasiIdo: 5000 }),
        csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, masikTar, KOINO,
          { varakozasiIdo: 5000 })
      ]);
      if (b.uj !== 4) return false;
      if (!(await allasokEgyeznek(egyikTar, masikTar, KOINO))) return false;
    } finally {
      p.bezar();
    }
  }
  return true;
});

proba('⭐⭐ A NÉMA TÁRS: a csere HIBÁVAL zárul, nem ragad be örökre', async () => {
  // ⚠️ A másik oldala ugyanannak: ha a társ egyáltalán nem válaszol (elment, lefagyott),
  // a cserének VÉGE kell legyen. A `koino.js` őrjárata e nélkül egyetlen néma társon
  // örökre megállna — és nem hibaüzenettel, hanem csenddel, ami a legrosszabb.
  const anna = await ujEember(KOINO);
  const tar = await ujTar(); await ment(tar, await lanc(anna, 1));

  const p = await udpParos();          // a `masik` foglalat NYITVA van, de senki nem olvassa
  const kezdet = Date.now();
  try {
    await csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, tar, KOINO,
      { varakozasiIdo: 1200 });
    return false;                      // ha ez lefutott, nem volt őr
  } catch {
    // A tétlenségi órának kell elsülnie (1,2 mp), nem az újraküldés-korlátnak (6 mp).
    return Date.now() - kezdet < 4000;
  } finally {
    p.bezar();
  }
});

proba('⭐ A UDP-résen is megvan a TÜKÖR és a CÍMJEGYZÉK', async () => {
  const anna = await ujEember(KOINO);
  const egyikTar = await ujTar(); await ment(egyikTar, await lanc(anna, 1));
  const masikTar = await ujTar();

  const p = await udpParos();
  try {
    const [a] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, egyikTar, KOINO),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, masikTar, KOINO,
        { hirdetettCimek: [{ hoszt: '2001:db8::f', port: 7373 }] })
    ]);
    return a.kivulrolIgyLatszom?.port === p.egyikPort
      && a.kapottCimek.length === 1 && a.kapottCimek[0].hoszt === '2001:db8::f';
  } finally {
    p.bezar();
  }
});

// ===== A HELYI FELFEDEZÉS (F. lépés) =====
//
// ⚠️ SZÁLLÍTÁS, NEM PROTOKOLL: a `helyiFelfedezes.js` semmit nem tud a koino gondolatáról,
// csak címeket szerez. Ezért a bizalom-kérdés itt fel sem merül — de a szűrés igen: ki
// tartozik ide, mi a saját visszhangunk, és mi a szemét.

proba('A kiáltás alakja: apró és unalmas (koino, port, jel)', () => {
  const u = JSON.parse(felfedezoUzenet('KOPOGOK', 'proba', 7373, 'abc123'));
  return u.mi === 'KOPOGOK' && u.koino === 'proba' && u.port === 7373 && u.jel === 'abc123'
    && Object.keys(u).length === 4;           // semmi több nem szivárog ki rólunk
});

proba('⭐ A SAJÁT VISSZHANGUNKAT kihagyjuk (a szórást mi is megkapjuk)', () => {
  const sajat = felfedezoUzenet('KOPOGOK', 'proba', 7373, 'enjelem');
  const e = kialtasFeldolgozasa(sajat, { address: '192.168.1.5', port: 7374 }, 'proba', 'enjelem');
  return !e.rendben && e.ok === 'sajat-visszhang';
});

proba('⭐ MÁS KOINO kiáltása nem hiba, csak nem tartozik ránk', () => {
  const ove = felfedezoUzenet('KOPOGOK', 'masik-koino', 7373, 'ojele');
  const e = kialtasFeldolgozasa(ove, { address: '192.168.1.7', port: 7374 }, 'proba', 'enjelem');
  return !e.rendben && e.ok === 'mas-koino';
});

proba('A szemét nem szakítja meg a felfedezést (mint a tárban)', () => {
  const a = kialtasFeldolgozasa('nem json', { address: '192.168.1.7', port: 7374 }, 'proba', 'j');
  const b = kialtasFeldolgozasa('{"mi":"VALAMI"}', { address: '192.168.1.7', port: 7374 }, 'proba', 'j');
  const c = kialtasFeldolgozasa(felfedezoUzenet('KOPOGOK', 'proba', 0, 'x'),
    { address: '192.168.1.7', port: 7374 }, 'proba', 'j');
  return a.ok === 'ertelmezhetetlen' && b.ok === 'ismeretlen-uzenet' && c.ok === 'rossz-port';
});

proba('⭐⭐ A CÍM A FOGLALATBÓL JÖN, a PORT az üzenetből — és ez nem mindegy', () => {
  // ⚠️ Ha a címet is az üzenetből vennénk, bárki bemondhatna egy IDEGEN címet, és a
  // felfedezés őt írná a listánkra. A foglalat viszont nem hazudik: onnan tényleg
  // megérkezett valami. A portot muszáj az üzenetből venni — a kiáltás a felfedező
  // portról jött, cserélni pedig máshol hallgat.
  const uzenet = JSON.stringify({ mi: 'KOPOGOK', koino: 'proba', port: 7373, jel: 'x',
    hoszt: '10.0.0.66' });                    // ⬅ hazug cím az üzenetben
  const e = kialtasFeldolgozasa(uzenet, { address: '192.168.1.9', port: 7374 }, 'proba', 'en');
  return e.rendben && e.tars.hoszt === '192.168.1.9' && e.tars.port === 7373
    && e.valaszCim.port === 7374;             // a válasz oda megy, ahonnan jött
});

proba('Ugyanaz a társ kétszer is jöhet (kiáltás + válasz) — egyszer kerül a listára', () => {
  const egy = { hoszt: '192.168.1.5', port: 7373 };
  const lista = felfedezettekOsszefesulese([egy], [egy, { hoszt: '192.168.1.6', port: 7373 }]);
  return lista.length === 2;
});

proba('⭐⭐ KÉT KÉSZÜLÉK EGY HÁLÓZATON MEGTALÁLJA EGYMÁST — mindkét irányban', async () => {
  // ⚠️ MIÉRT NEM MULTICASTTAL MÉRÜNK? Mert az a HÁLÓZATOT mérné, nem a programot: a
  // multicast átmenetele gépről gépre és wifiről wifire változik, és egy ilyen próba
  // hol zöld lenne, hol nem — pont az a fajta ingadozó mérés, ami semmit nem bizonyít.
  // Itt a MENETET mérjük (kiáltás → válasz → mindkettő tudja a másikat); hogy a kiáltás
  // átmegy-e egy valódi wifin, az külön, kézi mérés.
  const A = 7381, B = 7382;
  const [egyik, masik] = await Promise.all([
    helyiFelfedezes({ koino: KOINO, sajatPort: 7373, figyeloPort: A,
      celok: ['127.0.0.1'], celPort: B, idokorlat: 1500 }),
    helyiFelfedezes({ koino: KOINO, sajatPort: 7375, figyeloPort: B,
      celok: ['127.0.0.1'], celPort: A, idokorlat: 1500 })
  ]);
  // ⭐ A MÉRCE: nem elég, hogy az egyik megtalálta a másikat — MINDKETTŐNEK tudnia kell
  // a másik CSERE-portját (nem a felfedezőét). Ez az, amiért az egész készült.
  return egyik.tarsak.length === 1 && egyik.tarsak[0].port === 7375
    && masik.tarsak.length === 1 && masik.tarsak[0].port === 7373;
});

proba('⭐⭐ RONTÁS-PRÓBA: a KÉSŐBB INDULÓT is megtaláljuk (nem nyomunk egyszerre entert)', async () => {
  // ⚠️ EZ EGY MEGTÖRTÉNT BUKÁS ŐRE (2026-08-30). Az első változat EGYSZER kiáltott,
  // induláskor — és két valódi „készülékkel" kipróbálva félsiker lett: az egyik meghallotta
  // a másikat, visszafelé viszont NEM, mert a másik egy másodperccel később indult, és
  // addigra az egyetlen kiáltás elhangzott. A hétköznapi eset épp ez: két ember sosem nyom
  // egyszerre entert. Azóta fél másodpercenként ismételünk.
  const A = 7387, B = 7388;
  const elso = helyiFelfedezes({ koino: KOINO, sajatPort: 7373, figyeloPort: A,
    celok: ['127.0.0.1'], celPort: B, idokorlat: 2500 });

  // A MÁSIK CSAK MOST INDUL — jóval az első kiáltása után.
  await new Promise((t) => setTimeout(t, 1200));
  const masodik = await helyiFelfedezes({ koino: KOINO, sajatPort: 7375, figyeloPort: B,
    celok: ['127.0.0.1'], celPort: A, idokorlat: 1000 });
  const egyik = await elso;

  // ⭐ A MÉRCE: a KÉSŐN INDULÓNAK is meg kell találnia a korábbit. Az egyszeri kiáltással
  // ez a fele bukott.
  return masodik.tarsak.length === 1 && masodik.tarsak[0].port === 7373
    && egyik.tarsak.length === 1 && egyik.tarsak[0].port === 7375;
});

proba('⭐⭐ A DOLGOZÓ KÉSZÜLÉK FELEL a kiáltásra (nem kell egyszerre parancsot indítani)', async () => {
  // ⚠️ EZ IS MÉRÉSBŐL JÖTT (2026-08-30). A felfedezés első változatában MINDKÉT félnek
  // kiáltania kellett — vagyis csak akkor működött, ha a két ember egyszerre indítja a
  // `felfedez` parancsot. Egy `figyel`-t futtató készülék meg sem hallotta a kiáltást,
  // pedig épp őt kellett volna megtalálni. A válaszoló ezt oldja meg: aki dolgozik, felel.
  const VALASZOLO = 7389, KERESO = 7390;
  const valaszolo = await felfedezoValaszolo({
    koino: KOINO, sajatPort: 7373, figyeloPort: VALASZOLO, celok: ['127.0.0.1']
  });
  try {
    if (!valaszolo.mukodik) return false;
    const talalt = await helyiFelfedezes({ koino: KOINO, sajatPort: 7375,
      figyeloPort: KERESO, celok: ['127.0.0.1'], celPort: VALASZOLO, idokorlat: 1200 });
    // A kereső megtalálja a dolgozót, ÉS a dolgozó CSERE-portját tudja meg (7373), nem a
    // felfedezőét — ez az, amivel utána tényleg lehet kezdeni valamit.
    return talalt.tarsak.length === 1 && talalt.tarsak[0].port === 7373;
  } finally {
    valaszolo.bezar();
  }
});

proba('⭐⭐ A VÁLASZOLÓ FÉKEZ: nem felel minden egyes kopogásra', async () => {
  // ⚠️ MÉRÉSBŐL JÖTT (2026-08-30, valódi telefonon): egyetlen laptop **18 sort** írt a
  // képernyőre. A kereső fél másodpercenként ismétel, a válaszoló minden kopogásra felelt,
  // a válasz pedig több úton is megérkezett — szorzat, nem összeg. Ez nem csak csúnya:
  // minden fölös csomag egy mobilos e-ember számláján is megjelenik (D35).
  //
  // ⭐ A PRÓBA DETERMINISZTIKUS: a fékezés idejét 60 másodpercre állítjuk, tehát a
  // válaszoló a keresés ALATT PONTOSAN EGYSZER felelhet, akárhányszor kiáltunk.
  // (Egy válasz érkezik meg: a célzott. A csoportnak küldött másolat a RÖGZÍTETT
  // felfedező portra megy, ami a próbában nem a keresőé.)
  const VALASZOLO = 7393, KERESO = 7394;
  const valaszolo = await felfedezoValaszolo({
    koino: KOINO, sajatPort: 7373, figyeloPort: VALASZOLO, celok: ['127.0.0.1'],
    valaszKoz: 60000
  });
  try {
    const talalt = await helyiFelfedezes({ koino: KOINO, sajatPort: 7375,
      figyeloPort: KERESO, celok: ['127.0.0.1'], celPort: VALASZOLO,
      idokorlat: 1600, ismetlesKoz: 300 });
    // Négy-öt kiáltás ment ki, és MÉGIS egyetlen válasz jött — a megtalálás viszont megvan.
    return talalt.kialtasok >= 4 && talalt.kapottUzenetek === 1
      && talalt.tarsak.length === 1 && talalt.tarsak[0].port === 7373;
  } finally {
    valaszolo.bezar();
  }
});

proba('⭐ A válaszoló NEM felel a MÁSIK koino kiáltására', async () => {
  const VALASZOLO = 7391, KERESO = 7392;
  const valaszolo = await felfedezoValaszolo({
    koino: 'egeszen-mas-koino', sajatPort: 7373, figyeloPort: VALASZOLO, celok: ['127.0.0.1']
  });
  try {
    const talalt = await helyiFelfedezes({ koino: KOINO, sajatPort: 7375,
      figyeloPort: KERESO, celok: ['127.0.0.1'], celPort: VALASZOLO, idokorlat: 1000 });
    return talalt.tarsak.length === 0;
  } finally {
    valaszolo.bezar();
  }
});

proba('⭐ Ha NINCS ott senki, nem hiba — üres eredmény, időben', async () => {
  // ⚠️ „Nem találtam senkit" ÉRVÉNYES válasz. Ha ez hibát dobna, a felfedezés előfeltétellé
  // válna, pedig kényelem (2. szabály).
  const kezdet = Date.now();
  const e = await helyiFelfedezes({ koino: KOINO, sajatPort: 7373, figyeloPort: 7383,
    celok: ['127.0.0.1'], celPort: 7384, idokorlat: 600 });
  return e.tarsak.length === 0 && Date.now() - kezdet < 3000;
});

proba('⭐ A MÁSIK KOINO készüléke ott sem kerül a listára (valódi foglalatokkal)', async () => {
  const A = 7385, B = 7386;
  const [mienk] = await Promise.all([
    helyiFelfedezes({ koino: KOINO, sajatPort: 7373, figyeloPort: A,
      celok: ['127.0.0.1'], celPort: B, idokorlat: 1200 }),
    helyiFelfedezes({ koino: 'egeszen-mas-koino', sajatPort: 7375, figyeloPort: B,
      celok: ['127.0.0.1'], celPort: A, idokorlat: 1200 })
  ]);
  return mienk.tarsak.length === 0;
});

// ===================================
// ⭐ A BÖNGÉSZŐ-LEKÉRÉS — „add ide EZT az egy entitást"
// ===================================
//
// Csaba észrevételéből született: *„böngészés közben az összes entitásnak elérhetőnek kell
// lennie."* A rendes csere MINDENT áthoz, amit a másik tud és mi nem — böngészéskor viszont
// EGYETLEN entitás kell, most azonnal. Amit itt bizonyítani kell, az nem az, hogy „megy a
// hálózat", hanem hogy **a lekérés VÁLOGAT**.

/** Két külön szelet egy táron: két gondolat, mindkettőn egy-egy tudatponttal. */
async function ketSzelet() {
  const anna = await ujEember(KOINO);
  const t1 = await anna.tesz('GondolatLetrehozas', { cim: 'Első', meret: 10 });
  const p1 = await anna.tesz('TudatpontRendezes', { entitas: t1.azonosito, pont: 100 });
  const t2 = await anna.tesz('GondolatLetrehozas', { cim: 'Második', meret: 10 });
  const p2 = await anna.tesz('TudatpontRendezes', { entitas: t2.azonosito, pont: 200 });
  return { esemenyek: [t1, p1, t2, p2], egyik: t1.azonosito, masik: t2.azonosito };
}

proba('⭐⭐ A BÖNGÉSZŐ-LEKÉRÉS CSAK A KÉRT SZELETET HOZZA', async () => {
  const { esemenyek, egyik, masik } = await ketSzelet();
  const szolgalo = await ujTar(); await ment(szolgalo, esemenyek);
  const kero = await ujTar();

  const figyelo = await figyeloIndulasa(szolgalo, KOINO, 0, { hoszt: '127.0.0.1' });
  let eredmeny;
  try {
    eredmeny = await szeletHozatala(kero, KOINO, '127.0.0.1', figyelo.port, egyik);
  } finally {
    await figyelo.bezar();
  }

  const nalunk = await koinoEsemenyei(kero, KOINO);
  // A kért szelet KÉT eseménye megvan…
  const megvan = nalunk.length === 2 && eredmeny.uj === 2;
  // …a MÁSIK szeletből viszont SEMMI. Ez a lényeg: a lekérés válogat, nem mindent hoz.
  const nincsMas = !nalunk.some((e) => (e.entitas ?? e.azonosito) === masik);
  return megvan && nincsMas;
});

proba('Ismeretlen entitás kérése: nulla esemény, de NEM hiba', async () => {
  const { esemenyek } = await ketSzelet();
  const szolgalo = await ujTar(); await ment(szolgalo, esemenyek);
  const kero = await ujTar();

  const figyelo = await figyeloIndulasa(szolgalo, KOINO, 0, { hoszt: '127.0.0.1' });
  try {
    const e = await szeletHozatala(kero, KOINO, '127.0.0.1', figyelo.port, 'nincs-ilyen');
    return e.kapott === 0 && e.uj === 0;
  } finally {
    await figyelo.bezar();
  }
});

proba('⚠️ A KAPU UGYANAZ: másodszorra már nincs új esemény', async () => {
  const { esemenyek, egyik } = await ketSzelet();
  const szolgalo = await ujTar(); await ment(szolgalo, esemenyek);
  const kero = await ujTar();

  const figyelo = await figyeloIndulasa(szolgalo, KOINO, 0, { hoszt: '127.0.0.1' });
  try {
    const elso = await szeletHozatala(kero, KOINO, '127.0.0.1', figyelo.port, egyik);
    const masodik = await szeletHozatala(kero, KOINO, '127.0.0.1', figyelo.port, egyik);
    // Ugyanannyit KAPTUNK, de másodszor egyik sem ÚJ — az `esemenyMentese` felismerte,
    // hogy már megvannak (az azonosító a gondolat lenyomata).
    return elso.uj === 2 && masodik.kapott === 2 && masodik.uj === 0;
  } finally {
    await figyelo.bezar();
  }
});

proba('⭐ A RENDES CSERE VÁLTOZATLAN — a szelet-kérés nem törte el', async () => {
  // Visszafelé kompatibilitás: a párbeszéd LENYOMAT-tal kezd, mint eddig.
  const { esemenyek } = await ketSzelet();
  const egyik = await ujTar(); await ment(egyik, esemenyek);
  const masik = await ujTar();

  await csereDroton(masik, egyik);
  return (await koinoEsemenyei(masik, KOINO)).length === 4;
});

export async function takaritas() {
  for (const mappa of mappak) await rm(mappa, { recursive: true, force: true });
}

export default async function (csendes) {
  const eredmeny = await futtatas(csendes);
  await takaritas();
  return eredmeny;
}
