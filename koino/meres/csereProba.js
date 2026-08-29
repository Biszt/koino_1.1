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
import { figyeloIndulasa, csereVonalon } from '../js/csere/vonal.js';
import { createServer } from 'node:net';
import { pajzsfuras, tcpPajzsfuras } from '../js/csere/pajzsfuro.js';
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
    esemenyek.push(await eember.tesz('TartalomLetrehozas', { cim: 'T' + i, meret: 10 * i }));
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
  const masodik3 = await anna.elagaztat('TartalomLetrehozas', { cim: 'Neki mást', meret: 7 });

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
  const masik3 = await anna.elagaztat('TartalomLetrehozas', { cim: 'A másik arc', meret: 9 });
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
  const masik3 = await anna.elagaztat('TartalomLetrehozas', { cim: 'A másik arc', meret: 9 });
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
  const masik3 = await anna.elagaztat('TartalomLetrehozas', { cim: 'A másik arc', meret: 9 });
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

  return eredmeny.reszletesAllasok === 0 && osszes < 300 && osszes * 20 < allasBajt;
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
    await esemenyMentese(ove, await bela.tesz('TartalomLetrehozas', { cim: 'M' + i, meret: 10 }));
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
  await esemenyMentese(ove, await bela.tesz('TartalomLetrehozas', { cim: 'M', meret: 10 }));

  const figyelo = await figyeloIndulasa(mienk, KOINO, 0, { hoszt: '127.0.0.1' });
  try {
    await csereVonalon(ove, MASIK, '127.0.0.1', figyelo.port);
  } finally {
    await figyelo.bezar();
  }

  const nyers = await mienk.betolt();                       // a tár SZŰRETLEN tartalma
  return nyers.length === 2 && nyers.every((e) => e.koino === KOINO);
});

proba('⭐ A HAZUG fél ellen is véd: idegen koino eseményét a beolvasztás kiszűri', async () => {
  // A protokoll eleji egyeztetés az ŐSZINTE tévedést fogja meg — de aki HAZUDIK
  // (a mi koinónkat mondja, és mást küld), azt csak ez a réteg állítja meg.
  const tar = await ujTar();
  const anna = await ujEember(KOINO);
  const bela = await ujEember('idegen-koino');

  const mienk = await anna.tesz('TartalomLetrehozas', { cim: 'Miénk', meret: 10 });
  const ideg = await bela.tesz('TartalomLetrehozas', { cim: 'Idegen', meret: 10 });

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

export async function takaritas() {
  for (const mappa of mappak) await rm(mappa, { recursive: true, force: true });
}

export default async function (csendes) {
  const eredmeny = await futtatas(csendes);
  await takaritas();
  return eredmeny;
}
