// koino/meres/lancGyokerProba.js

// Felelősség: A SZERZŐ LÁNC-GYÖKERÉNEK próbája (D78, az A pillér 2. lépése — `js/allapot/lancGyoker.js`).
//
// Amit mér: (1) az új saját események `lancGyoker`-e UGYANAZ, mint a láncból gyorsítótár nélkül
// újraszámolt — minden műveletnél, a pont-átrendezésnél és a visszavételnél is; (2) a sérült, az
// idegen, a más láncé és a hiányzó gyorsítótár sem ront el semmit (a lánc pótolja); (3) ha KÖZBEN egy
// másik tár-példány (másik folyamat) írt, a következő gyökér is helyes; (4) ⭐ egy pont-esemény
// ÖNMAGÁBAN ellenőrizhető: a benne aláírt korábbi állapot + egy bizonyíték → az új összeg — és a
// hazug bemondás így lebukik; (5) ha a saját lánc nem ép, a gyökér null (nem kötünk el hamis naplót);
// (6) a kapu csak lenyomat alakú gyökeret enged be.
//
// Futtatás: node koino/meres/mind.js lancgyoker

import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny } from './probaFuttato.js';
import { esemenyTarNyitasa, fajlBlobTarolo, lancTarolo } from '../js/tar/fajlTar.js';
import { sajatLancEsemenyei, esemenyMentese } from '../js/tar/esemenyTar.js';
import { esemenyLetrehozasa, esemenyEllenorzese } from '../js/esemeny/esemeny.js';
import {
  koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese
} from '../js/muveletek.js';
import {
  lancGyokerLancbol, lancAllapotaLancbol, lancGyokerKetGyokerbol, lancGyokerUjEsemenyhez,
  KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, NAPLO_FAJTA
} from '../js/allapot/lancGyoker.js';
import {
  uresOsszegzes, allapotBizonyitek, allapotValtozasa
} from '../js/esemeny/osszegzoFa.js';

const { proba, futtatas } = probaGyujtemeny('A szerző lánc-gyökere (D78, az A pillér 2. lépése)');

const KOINO = 'lancgyoker-proba';

/** Egy valódi tár egy eldobható mappában, egy valódi kulccsal és a lánc gyorsítótárával. */
async function ujKornyezet(mappa = null, kulcspar = null) {
  mappa ??= await mkdtemp(join(tmpdir(), 'koino-lancgyoker-'));
  const tar = await esemenyTarNyitasa(KOINO, mappa);
  kulcspar ??= await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url');
  const kornyezet = {
    koino: KOINO, kulcspar, szerzo, tar, darabTar: fajlBlobTarolo(KOINO, mappa), lancTarolo: lancTarolo(KOINO, mappa)
  };
  return { mappa, tar, kornyezet, kulcspar };
}

/** Minden saját esemény gyökere egyezik-e a láncból újraszámolttal? Az első eltérés sorszáma, vagy 0. */
async function elsoElteres(tar, szerzo) {
  const lanc = await sajatLancEsemenyei(tar, szerzo);
  for (let i = 0; i < lanc.length; i++) {
    const vart = await lancGyokerLancbol(lanc.slice(0, i));
    if (lanc[i].lancGyoker !== vart) return lanc[i].sorszam;
  }
  return 0;
}

/** Egy kis élet: koino, gondolatok, pontok, átrendezés, visszavétel. */
async function elet(kornyezet) {
  await koinoLetrehozasa(kornyezet, 'Lánc-gyökér próba');
  const g1 = await gondolatLetrehozasa(kornyezet, { cim: 'Első' });
  const g2 = await gondolatLetrehozasa(kornyezet, { cim: 'Második', szulo: g1.azonosito });
  await tudatpontRendezese(kornyezet, g1.azonosito, 30);
  await tudatpontRendezese(kornyezet, g2.azonosito, 20);
  await tudatpontRendezese(kornyezet, g1.azonosito, 45);     // átrendezés
  await tudatpontRendezese(kornyezet, g2.azonosito, 0);      // visszavétel (a levél kiesik)
  await gondolatLetrehozasa(kornyezet, { cim: 'Harmadik' });
  return { g1, g2 };
}

// ===================================
// 1. A GYÖKÉR MINDEN ESEMÉNYBEN
// ===================================

proba('⭐ AZ ELSŐ ESEMÉNY GYÖKERE az üres napló és az üres kiosztás lenyomata', async () => {
  const { tar, kornyezet } = await ujKornyezet();
  await koinoLetrehozasa(kornyezet, 'Első');
  const [elso] = await sajatLancEsemenyei(tar, kornyezet.szerzo);
  const vart = await lancGyokerKetGyokerbol(await uresOsszegzes(NAPLO_FAJTA, 0), await uresOsszegzes(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ));
  return elso.sorszam === 1 && elso.lancGyoker === vart;
});

proba('⭐⭐ MINDEN ÚJ ESEMÉNY GYÖKERE = A LÁNCBÓL ÚJRASZÁMOLT — pontok, átrendezés, visszavétel is', async () => {
  const { tar, kornyezet } = await ujKornyezet();
  await elet(kornyezet);
  const lanc = await sajatLancEsemenyei(tar, kornyezet.szerzo);
  // ⚠️ Előfeltétel: a gyökér tényleg ott van (különben a „null = null" egyezés semmit nem mérne).
  return lanc.length === 8 && lanc.every((e) => typeof e.lancGyoker === 'string')
    && await elsoElteres(tar, kornyezet.szerzo) === 0
    // A gyökerek különböznek egymástól (minden esemény más napló-állapotot köt el).
    && new Set(lanc.map((e) => e.lancGyoker)).size === lanc.length;
});

// ===================================
// 2. A GYORSÍTÓTÁR
// ===================================

proba('⛔⛔ A SÉRÜLT, AZ IDEGEN, A MÁS LÁNCÉ ÉS AZ ÜRES GYORSÍTÓTÁR SEM RONT EL SEMMIT — a lánc pótolja', async () => {
  const { mappa, kornyezet, kulcspar } = await ujKornyezet();
  const { g1 } = await elet(kornyezet);
  const fajl = kornyezet.lancTarolo.fajl;
  const ep = await readFile(fajl, 'utf8');

  // Egy MÁSIK szerző ép gyorsítótára (egy másik mappából).
  const masik = await ujKornyezet();
  await elet(masik.kornyezet);
  const idegen = await readFile(masik.kornyezet.lancTarolo.fajl, 'utf8');
  // ⭐ UGYANANNAK a szerzőnek egy MÁSIK lánca (egy másik készüléke, ugyanazzal a kulccsal) — a szerző
  // stimmel, csak a lánc nem: ezt a lánchoz illesztés fogja meg, nem a szerző-mező.
  const masikKeszulek = await ujKornyezet(null, kulcspar);
  await elet(masikKeszulek.kornyezet);
  await gondolatLetrehozasa(masikKeszulek.kornyezet, { cim: 'Csak a másik készüléken' });
  const masLanc = await readFile(masikKeszulek.kornyezet.lancTarolo.fajl, 'utf8');
  // Egy ép alakú, de BELÜL átírt gyorsítótár (egy pont átírva, az ellenőrző-lenyomat marad).
  const atirt = ep.replace(/"pontok":\[\["([^"]+)",(\d+)\]/, (_, k, p) => '"pontok":[["' + k + '",' + (Number(p) + 1) + ']');

  const esetek = [['sérült', '{nem json'], ['idegen szerzőé', idegen], ['ugyanannak a szerzőnek más lánca', masLanc],
    ['belül átírt', atirt], ['üres', '']];
  for (let i = 0; i < esetek.length; i++) {
    const [nev, tartalom] = esetek[i];
    // ⭐ Új tár-példány = új folyamat: a memória üres, a fájlból indul.
    const uj = await ujKornyezet(mappa, kulcspar);
    await writeFile(fajl, tartalom);
    // ⚠️ Egy PONT-esemény és utána még egy: a belül átírt állás csak a pont-esemény UTÁN ront.
    await tudatpontRendezese(uj.kornyezet, g1.azonosito, 50 + i);
    await gondolatLetrehozasa(uj.kornyezet, { cim: 'Egy gyorsítótár után: ' + nev });
    if (await elsoElteres(uj.tar, uj.kornyezet.szerzo) !== 0) {
      console.log('    (hibás gyökér a(z) „' + nev + '" gyorsítótár után)');
      return false;
    }
  }
  return atirt !== ep && masLanc !== ep;     // előfeltétel: a hamis gyorsítótárak tényleg mások
});

proba('⭐⭐ HA KÖZBEN EGY MÁSIK FOLYAMAT ÍRT, A KÖVETKEZŐ GYÖKÉR IS HELYES — a memória a láncból folytat', async () => {
  const { mappa, kornyezet, kulcspar } = await ujKornyezet();
  await koinoLetrehozasa(kornyezet, 'Két folyamat');
  const g = await gondolatLetrehozasa(kornyezet, { cim: 'Az egyik folyamat' });
  // A másik „folyamat" (egy másik tár-példány ugyanazon a mappán) két eseményt ír…
  const masik = await ujKornyezet(mappa, kulcspar);
  await tudatpontRendezese(masik.kornyezet, g.azonosito, 12);
  await gondolatLetrehozasa(masik.kornyezet, { cim: 'A másik folyamat' });
  // …és az első folytatja: a memóriájában a régi állapot van, a láncban két újabb esemény.
  await tudatpontRendezese(kornyezet, g.azonosito, 7);
  const lanc = await sajatLancEsemenyei(kornyezet.tar, kornyezet.szerzo);
  return lanc.length === 5 && await elsoElteres(kornyezet.tar, kornyezet.szerzo) === 0;
});

// ===================================
// 3. ⭐ A PONT-ESEMÉNY ÖNMAGÁBAN ELLENŐRIZHETŐ — ezért köti az ESEMÉNY ELŐTTI állapotot
// ===================================

/**
 * Az ellenőrző oldala: CSAK a pont-eseményt tartja; a szerzőtől a két gyökeret és az entitás régi
 * értékének bizonyítékát kapja. Igaz, ha a bemondott összeg a bizonyítékból kijön.
 */
async function pontEsemenyEllenorzese(e, { naploGyoker, kiosztasGyoker, bizonyitek }) {
  if (await lancGyokerKetGyokerbol(naploGyoker, kiosztasGyoker) !== e.lancGyoker) return false;
  const uj = e.adat.pont > 0 ? { ertek: null, osszegek: [e.adat.pont] } : null;
  const valtozas = await allapotValtozasa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, kiosztasGyoker, e.adat.entitas, bizonyitek, uj);
  return valtozas.rendben && valtozas.gyoker.o[0] === e.adat.kiosztva;
}

/** A szerző oldala: a k-adik esemény előtti állapotból a két gyökér és a bizonyíték. */
async function szerzoBizonyiteka(lanc, e) {
  const a = await lancAllapotaLancbol(lanc.slice(0, e.sorszam - 1));
  return { naploGyoker: a.naploGyoker, kiosztasGyoker: a.kiosztasGyoker,
    bizonyitek: await allapotBizonyitek(a.kiosztasFa, e.adat.entitas) };
}

proba('⭐⭐⭐ A PONT-ESEMÉNY ÖNMAGÁBAN ELLENŐRIZHETŐ — minden pont-esemény bemondott összege kijön a bizonyítékból', async () => {
  const { tar, kornyezet } = await ujKornyezet();
  await elet(kornyezet);
  const lanc = await sajatLancEsemenyei(tar, kornyezet.szerzo);
  const pontEsemenyek = lanc.filter((e) => e.tipus === 'TudatpontRendezes');
  for (const e of pontEsemenyek) {
    if (!await pontEsemenyEllenorzese(e, await szerzoBizonyiteka(lanc, e))) return false;
  }
  return pontEsemenyek.length === 4;
});

proba('⭐⭐ AZ ÁLLAPOT FOLYTONOS — a pont-esemény bizonyítékából számolt új kiosztás = a KÖVETKEZŐ esemény aláírt előtti állapota', async () => {
  // ⭐ Ez köti össze a szerző egymás utáni eseményeit (a ③ ellenőrzés egyik fele): amit a pont-esemény
  // után a bizonyítékból számolunk, azt kell a következő eseménynek elkötnie. ⚠️ Ez méri azt is, hogy
  // a 0 pont kiesik-e a fából (a visszavétel): ha bent maradna, a kettő eltérne.
  const { tar, kornyezet } = await ujKornyezet();
  await elet(kornyezet);
  const lanc = await sajatLancEsemenyei(tar, kornyezet.szerzo);
  let merve = 0;
  for (let i = 0; i < lanc.length - 1; i++) {
    const e = lanc[i];
    if (e.tipus !== 'TudatpontRendezes') continue;
    const { kiosztasGyoker, bizonyitek } = await szerzoBizonyiteka(lanc, e);
    const uj = e.adat.pont > 0 ? { ertek: null, osszegek: [e.adat.pont] } : null;
    const szamitott = await allapotValtozasa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, kiosztasGyoker, e.adat.entitas, bizonyitek, uj);
    const kovetkezo = await lancAllapotaLancbol(lanc.slice(0, i + 1));
    if (!szamitott.rendben || szamitott.gyoker.l !== kovetkezo.kiosztasGyoker.l) return false;
    merve++;
  }
  return merve === 4;
});

proba('⛔⛔ A HAZUG BEMONDÁS LEBUKIK — a helyes gyökérrel aláírt, de túl kicsi összeget mondó pont-esemény', async () => {
  const { tar, kornyezet } = await ujKornyezet();
  const { g1 } = await elet(kornyezet);
  const lanc = await sajatLancEsemenyei(tar, kornyezet.szerzo);
  const utolso = lanc[lanc.length - 1];
  // A csaló a HELYES lánc-gyökérrel ír alá egy új pont-eseményt — de kevesebbet mond be (a keret
  // alatt maradna), mint amennyi a kiosztásából kijön.
  const lancGyoker = await lancGyokerUjEsemenyhez(tar, KOINO, kornyezet.szerzo, utolso.sorszam + 1);
  const hazug = await esemenyLetrehozasa({
    koino: KOINO, tipus: 'TudatpontRendezes', entitas: g1.azonosito, entitasSorszam: 99,
    adat: { entitas: g1.azonosito, pont: 50, szerep: 'aktiv', kiosztva: 10 },
    elozo: utolso.azonosito, sorszam: utolso.sorszam + 1, lancGyoker
  }, kornyezet.kulcspar);
  const becsuletes = { ...hazug };           // kontroll: ugyanez a helyes bemondással (45 → 50: 50)
  const bizonyitek = await szerzoBizonyiteka([...lanc, hazug], hazug);
  return (await esemenyEllenorzese(hazug)).rendben                // az aláírás rendben van…
    && !await pontEsemenyEllenorzese(hazug, bizonyitek)            // …a bemondás mégis lebukik
    && await pontEsemenyEllenorzese({ ...becsuletes, adat: { ...hazug.adat, kiosztva: 50 } }, bizonyitek);
});

// ===================================
// 4. HA A SAJÁT LÁNC NEM ÉP — és a kapu
// ===================================

proba('⛔ HA A SAJÁT LÁNC NEM ÉP (hézag vagy szakadás), A GYÖKÉR NULL — nem kötünk el hamis naplót', async () => {
  const { tar, kornyezet } = await ujKornyezet();
  await koinoLetrehozasa(kornyezet, 'Hézag');
  // HÉZAG: a lánc 1. eseménye megvan; egy 3-as sorszámhoz kérünk gyökeret (a 2-es hiányzik).
  const hezaggal = await lancGyokerUjEsemenyhez(tar, KOINO, kornyezet.szerzo, 3);
  const eppel = await lancGyokerUjEsemenyhez(tar, KOINO, kornyezet.szerzo, 2);
  // SZAKADÁS: egy másik tárban a 2. esemény `elozo`-ja nem az 1.-re mutat.
  const masik = await ujKornyezet();
  await koinoLetrehozasa(masik.kornyezet, 'Szakadás');
  const szakadt = await esemenyLetrehozasa({ koino: KOINO, tipus: 'GondolatLetrehozas', adat: { cim: 'x' },
    elozo: null, sorszam: 2 }, masik.kornyezet.kulcspar);
  await esemenyMentese(masik.tar, szakadt);
  const szakadassal = await lancGyokerUjEsemenyhez(masik.tar, KOINO, masik.kornyezet.szerzo, 3);
  return hezaggal === null && typeof eppel === 'string' && (await masik.tar.esemeny(szakadt.azonosito)) !== undefined
    && szakadassal === null;
});

proba('⛔ A KAPU CSAK LENYOMAT ALAKÚ GYÖKERET ENGED BE — a null és a 43 jeles mehet', async () => {
  const { kornyezet } = await ujKornyezet();
  const alap = { koino: KOINO, tipus: 'GondolatLetrehozas', adat: { cim: 'x' }, elozo: null, sorszam: 1 };
  const e = async (lancGyoker) => (await esemenyEllenorzese(await esemenyLetrehozasa({ ...alap, lancGyoker }, kornyezet.kulcspar))).rendben;
  return await e(null) && await e('A'.repeat(43)) && !await e('x') && !await e('A'.repeat(44));
});

export default futtatas;
