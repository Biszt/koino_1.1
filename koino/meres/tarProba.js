// koino/meres/tarProba.js — a tár-réteg önpróbája (Szakasz 1 / 4. lépés)
//
// Azt bizonyítja, hogy az események megmaradnak, hogy ellenőrizetlen esemény nem kerül a
// tárba, és hogy a kettős cselekvés már mentéskor lelepleződik.
//
// ⚠️ A D29 (a koino önálló program) után a tár FÁJL, nem IndexedDB. A próbák ezért egy
// külön, eldobható mappában dolgoznak — soha nem a valódi adaton.

import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { esemenyLetrehozasa, szelet } from '../js/esemeny/esemeny.js';
import { esemenyTarNyitasa, udpCimTarolo, kotesTarolo, tarsakTarolo } from '../js/tar/fajlTar.js';
import {
  esemenyMentese, esemenyLekerese, lancVege, lancEllenorzese,
  sajatLancEsemenyei, koinoEsemenyei
} from '../js/tar/esemenyTar.js';
import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A tár-réteg próbája');

// ----- Eldobható mappa a próbákhoz -----
const MAPPA = await mkdtemp(join(tmpdir(), 'koino-proba-'));
const KOINO = 'proba';
const tar = await esemenyTarNyitasa(KOINO, MAPPA);

const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const nyersKulcs = await crypto.subtle.exportKey('raw', kulcspar.publicKey);
let s = ''; for (const b of new Uint8Array(nyersKulcs)) s += String.fromCharCode(b);
const SZERZO = btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Segéd: a lánc végére fűz egy eseményt (mentés nélkül). */
async function ujEsemeny(adat, tipus = 'GondolatLetrehozas') {
  const veg = await lancVege(tar, SZERZO);
  return esemenyLetrehozasa({ koino: KOINO, tipus, adat, ...veg }, kulcspar);
}

// ===== ALAPMŰKÖDÉS =====

proba('Az esemény elmentődik és visszaolvasható', async () => {
  const e = await ujEsemeny({ cim: 'Első gondolat', meret: 128 });
  const eredmeny = await esemenyMentese(tar, e);
  const vissza = await esemenyLekerese(tar, e.azonosito);
  return eredmeny.mentve === true && vissza?.azonosito === e.azonosito;
});

proba('Az ISMÉTELT mentés nem hiba (ugyanaz a gondolat = ugyanaz a név)', async () => {
  const elso = (await sajatLancEsemenyei(tar, SZERZO))[0];
  const eredmeny = await esemenyMentese(tar, elso);
  return eredmeny.mentve === true && eredmeny.marMegvolt === true;
});

// ===== A TÁR VÉDELME =====

proba('HAMISÍTOTT esemény NEM kerül a tárba', async () => {
  const e = await ujEsemeny({ cim: 'Tisztességes', meret: 64 });
  const hamis = { ...e, adat: { cim: 'Átírva', meret: 64 } };
  const eredmeny = await esemenyMentese(tar, hamis);
  const vissza = await esemenyLekerese(tar, hamis.azonosito);
  return eredmeny.mentve === false && vissza === undefined;
});

// ===== A SAJÁT LÁNC =====

proba('Üres láncnál a következő esemény az 1. (előzmény nélkül)', async () => {
  const idegen = await ujEember(KOINO);
  const veg = await lancVege(tar, idegen.szerzo);
  return veg.elozo === null && veg.sorszam === 1;
});

proba('A lánc épül: három esemény egymás után, hézag nélkül', async () => {
  await esemenyMentese(tar, await ujEsemeny({ cim: 'Második', meret: 200 }));
  await esemenyMentese(tar, await ujEsemeny({ cim: 'Harmadik', meret: 300 }));
  const lanc = await sajatLancEsemenyei(tar, SZERZO);
  const sorszamok = lanc.map((e) => e.sorszam);
  // 1,2,3… (a hamisított nem került be, ezért nem hagyott lyukat)
  return sorszamok.every((sz, i) => sz === i + 1) && lanc.length >= 3;
});

proba('Minden esemény az ELŐZŐRE mutat', async () => {
  const lanc = await sajatLancEsemenyei(tar, SZERZO);
  for (let i = 1; i < lanc.length; i++) {
    if (lanc[i].elozo !== lanc[i - 1].azonosito) return false;
  }
  return lanc[0].elozo === null;
});

proba('Az ép lánc ellenőrzése: ép', async () => {
  const e = await lancEllenorzese(tar, SZERZO);
  return e.ep === true && e.hezagok.length === 0 && e.elagazasok.length === 0;
});

// ===== A KETTŐS CSELEKVÉS LELEPLEZŐDÉSE =====

proba('ELÁGAZÁS: a mentés jelzi az ellentmondást', async () => {
  // Ugyanarra a pontra két különböző esemény — mintha valaki két különböző dolgot
  // mutatna két különböző embernek
  const veg = await lancVege(tar, SZERZO);
  const egyik = await esemenyLetrehozasa(
    { koino: KOINO, tipus: 'GondolatLetrehozas', adat: { cim: 'Neked ezt', meret: 10 }, ...veg }, kulcspar);
  const masik = await esemenyLetrehozasa(
    { koino: KOINO, tipus: 'GondolatLetrehozas', adat: { cim: 'Neki azt', meret: 10 }, ...veg }, kulcspar);

  await esemenyMentese(tar, egyik);
  const eredmeny = await esemenyMentese(tar, masik);

  // MINDKETTŐ elmentődik — együtt ők a bizonyíték
  return eredmeny.mentve === true && !!eredmeny.elagazas;
});

proba('A lánc-ellenőrzés is megtalálja az elágazást', async () => {
  const e = await lancEllenorzese(tar, SZERZO);
  return e.ep === false && e.elagazasok.length === 1;
});

// ===== ELKÜLÖNÍTÉS =====

proba('A koinók elkülönülnek egymástól', async () => {
  const enyeim = await koinoEsemenyei(tar, KOINO);
  const masike = await koinoEsemenyei(tar, 'nem-letezo-koino');
  return enyeim.length >= 3 && masike.length === 0;
});

// ===== MEGMARADÁS =====
//
// A böngészős korszakban ehhez kézzel újra kellett tölteni a lapot. Fájllal ez sokkal
// egyszerűbb és szigorúbb: ELDOBJUK az egész tár-objektumot, újranyitjuk ugyanazt a
// fájlt, és megnézzük, ott van-e minden.

proba('MEGMARADÁS: új tár-objektum ugyanabból a fájlból ugyanazt olvassa', async () => {
  const elotte = await koinoEsemenyei(tar, KOINO);
  const ujraNyitott = await esemenyTarNyitasa(KOINO, MAPPA);
  const utana = await koinoEsemenyei(ujraNyitott, KOINO);
  return elotte.length === utana.length
      && elotte.every((e, i) => e.azonosito === utana[i].azonosito);
});

proba('A tár HOZZÁFŰZŐ: a fájl sorai megegyeznek az eseményekkel', async () => {
  const szoveg = await readFile(tar.fajl, 'utf8');
  const sorok = szoveg.split('\n').filter((sor) => sor.trim());
  const esemenyek = await tar.betolt();
  return sorok.length === esemenyek.length;
});

proba('A SÉRÜLT sor nem teszi olvashatatlanná a tárat', async () => {
  const kulon = await mkdtemp(join(tmpdir(), 'koino-serult-'));
  const serultTar = await esemenyTarNyitasa('proba', kulon);
  const e = await esemenyLetrehozasa(
    { koino: 'proba', tipus: 'GondolatLetrehozas', adat: { cim: 'Ép', meret: 4 },
      elozo: null, sorszam: 1 }, kulcspar);
  await esemenyMentese(serultTar, e);

  // Kézzel odaírunk egy értelmetlen sort — mintha megszakadt volna egy írás
  const { appendFile } = await import('node:fs/promises');
  await appendFile(serultTar.fajl, '{ ez nem JSON\n', 'utf8');

  const esemenyek = await serultTar.betolt();
  await rm(kulon, { recursive: true, force: true });
  return esemenyek.length === 1 && esemenyek[0].azonosito === e.azonosito;
});

// ⛔⛔ AMIT MÁSIK FOLYAMAT FŰZ A FÁJLHOZ, AZ A FUTÓ TÁRBA IS BEKERÜL (2026-09-26, 43. mérés).
//
// Két tár-példány ugyanazon a mappán = két folyamat ugyanazon a fájlon (a futó őrjárat és a
// második ablak parancsa). ⭐ Négy dolgot kell tudnia: a másikét felveszi · a SAJÁTJÁT nem
// veszi fel kétszer · a FÉLIG ÍRT sort megvárja (nem dobja el, nem olvassa félbe) · és ha
// nincs új, nem csinál semmit. ⚠️ Rontás-próba: ha a `frissit()` semmit nem olvas, bukik.
proba('⛔⛔ A MÁSIK FOLYAMAT ESEMÉNYE A FUTÓ TÁRBA IS BEKERÜL — a sajátunk nem kétszer', async () => {
  const hely = await mkdtemp(join(tmpdir(), 'koino-ketfolyamat-'));
  try {
    const futo = await esemenyTarNyitasa('proba', hely);      // mint az őrjárat
    const masik = await esemenyTarNyitasa('proba', hely);     // mint a második ablak
    const { appendFile } = await import('node:fs/promises');

    // A futó ír egyet (a sajátja), a másik folyamat is egyet.
    const sajat = await esemenyLetrehozasa({ koino: 'proba', tipus: 'GondolatLetrehozas',
      adat: { cim: 'Sajat', meret: 5 }, elozo: null, sorszam: 1 }, kulcspar);
    await esemenyMentese(futo, sajat);
    const kulso = await esemenyLetrehozasa({ koino: 'proba', tipus: 'GondolatLetrehozas',
      adat: { cim: 'Masik ablak', meret: 11 }, elozo: sajat.azonosito, sorszam: 2 }, kulcspar);
    await esemenyMentese(masik, kulso);

    const elotte = (await futo.betolt()).length;              // 1: a másikét még nem látja
    const felvett = await futo.frissit();                      // 1: csak a másikét
    const utana = await futo.betolt();

    // ⚠️ A FÉLIG ÍRT sor: még nincs sorvége — nem vesszük fel, és nem is dobjuk el.
    const harmadik = await esemenyLetrehozasa({ koino: 'proba', tipus: 'GondolatLetrehozas',
      adat: { cim: 'Felig', meret: 5 }, elozo: kulso.azonosito, sorszam: 3 }, kulcspar);
    const sor = JSON.stringify(harmadik);
    await appendFile(futo.fajl, sor.slice(0, 40), 'utf8');
    const felig = await futo.frissit();                         // 0: várunk a sorvégre
    await appendFile(futo.fajl, sor.slice(40) + '\n', 'utf8');
    const egesz = await futo.frissit();                         // 1: most egészben
    const ures = await futo.frissit();                          // 0: nincs új

    return elotte === 1 && felvett === 1
      && utana.length === 2 && utana[1].azonosito === kulso.azonosito
      && felig === 0 && egesz === 1 && ures === 0
      && (await futo.esemeny(harmadik.azonosito))?.azonosito === harmadik.azonosito
      && (await futo.betolt()).length === 3;
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ⛔⛔ EGYSZERRE HÍVOTT FRISSÍTÉSEK SEM UGRANAK ÁT SEMMIT (2026-09-26, a D70 mérése közben).
//
// Egy folyamaton belül is futhat egyszerre két `frissit()` (az őrjárat két társsal párhuzamosan
// dolgozik, közben az állapot-számítás is frissít). ⛔ Mérve: mindkettő UGYANONNAN olvasott, és
// mindkettő hozzáadta a saját hosszát az „eddig olvastam" jelhez — a jel túlfutott, a
// következő olvasás egy sor közepén kezdődött („sérült sor, kihagyva"), vagy a valódi új
// eseményt ÁTUGROTTA. ⭐ Nyolc frissítés egyszerre egy 200 eseményes farkon, utána EGY új
// esemény — annak meg kell jönnie. ⚠️ Kis farokkal (5 esemény, 3 hívás) a hiba csak néha jött
// elő, és a próba VAK volt (a hibás kódon is átment); így a hibás kód tízből tízszer bukik
// (mérve). Rontás-próba: sorba állítás nélkül bukik (kipróbálva).
proba('⛔⛔ AZ EGYSZERRE HÍVOTT FRISSÍTÉSEK UTÁN IS MEGJÖN A KÖVETKEZŐ ESEMÉNY', async () => {
  const hely = await mkdtemp(join(tmpdir(), 'koino-parhuzamos-'));
  try {
    const futo = await esemenyTarNyitasa('proba', hely);
    const masik = await esemenyTarNyitasa('proba', hely);
    let elozo = null;
    const ujat = async (sorszam) => {
      const e = await esemenyLetrehozasa({ koino: 'proba', tipus: 'GondolatLetrehozas',
        adat: { cim: 'P' + sorszam, meret: 3 }, elozo, sorszam }, kulcspar);
      elozo = e.azonosito;
      await esemenyMentese(masik, e);
      return e;
    };
    for (let i = 1; i <= 200; i++) await ujat(i);

    const felvettek = await Promise.all(Array.from({ length: 8 }, () => futo.frissit()));
    const utolso = await ujat(201);
    const utana = await futo.frissit();

    return felvettek.reduce((o, n) => o + n, 0) === 200     // mind a kétszáz, egyszer
      && utana === 1                                        // ⭐ a következő sem vész el
      && (await futo.esemeny(utolso.azonosito))?.azonosito === utolso.azonosito
      && (await futo.betolt()).length === 201;
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⛔⛔⛔ AZ ELVESZETT ÍRÁS (2026-09-21)
// ===================================
//
// ⛔ MIT MÉR, ÉS HONNAN JÖTT: egy parancssor-próba **szeszélyesen bukott** — a teljes
// suite-ban 8 futásból ~2-szer, önmagában 0/15-ször. A diagnosztika mutatta meg, hogy a
// készülék a résen MEGTANULTA a saját külső címét a társtól (ki is írta), ⛔ **de az nem
// került a lemezre**: a túlélő és az elveszett írás között **1 ms** telt el.
//
// ⭐ Az ok nem időzítés volt, hanem SZERKEZET: a „beolvas → módosít → kiír" a hívóban élt,
// védtelenül. *A szeszélyes próba igazat mondott — ez az a hiba, amit meg akart fogni.*
//
// ⚠️ Ez a próba NEM valószínűséget mér: a két írást SZÁNDÉKOSAN egyszerre indítjuk, tehát
// a régi kódon MINDIG bukik, az újon MINDIG átmegy.

proba('⛔⛔ KÉT EGYIDEJŰ ÍRÁS EGYIKE SEM VESZHET EL — a jegyzék sorba állít', async () => {
  const hely = await mkdtemp(join(tmpdir(), 'koino-sor-'));
  try {
    const tarolo = udpCimTarolo(hely);

    // ⚠️ A LÉNYEG: egyiket sem várjuk meg a másik előtt — pontosan úgy, ahogy a résen
    // történik (a tükör válasza és a társ `latlak`-ja ezredmásodperceken belül érkezik).
    await Promise.all([
      tarolo.modosit((lista) => [...lista, { hoszt: '198.51.100.1', port: 1111, mikor: 1000 }]),
      tarolo.modosit((lista) => [...lista, { hoszt: '198.51.100.2', port: 2222, mikor: 1001 }]),
      tarolo.modosit((lista) => [...lista, { hoszt: '198.51.100.3', port: 3333, mikor: 1002 }])
    ]);

    const vegul = await tarolo.olvas();
    return vegul.length === 3
      && vegul.some((c) => c.port === 1111)
      && vegul.some((c) => c.port === 2222)
      && vegul.some((c) => c.port === 3333);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ …és a KÖTÉS-jegyzék ugyanígy — ott két ág ír (a postaláda és a kör)', async () => {
  const hely = await mkdtemp(join(tmpdir(), 'koino-sor2-'));
  try {
    const tarolo = kotesTarolo(hely);
    await Promise.all([
      tarolo.modosit((j) => [...j, { alairo: 'A'.repeat(43), utoljara: 1 }]),
      tarolo.modosit((j) => [...j, { alairo: 'B'.repeat(43), utoljara: 2 }])
    ]);
    const vegul = await tarolo.olvas();
    return vegul.length === 2;
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔⛔ …és a TÁRS-LISTA is — ott a leghosszabb a rés: egy TELJES csere-kör', async () => {
  // ⛔ MIÉRT KELLETT KÉSŐBB (2026-09-22): a `modosit()` 2026-09-21-én megszületett, és a
  // társ-lista **kimaradt belőle** — ott egy külön ígéret-lánc állt a `koino.js`-ben,
  // ami viszont az őrjárat kör végi írását nem fogta meg. ⭐ *Egy problémára két
  // gépezet: az egyik előbb-utóbb kimarad valahonnan.*
  const hely = await mkdtemp(join(tmpdir(), 'koino-sor4-'));
  try {
    const tarolo = tarsakTarolo(hely);
    await Promise.all([
      tarolo.modosit((l) => [...l, { hoszt: '198.51.100.1', port: 1 }]),
      tarolo.modosit((l) => [...l, { hoszt: '198.51.100.2', port: 2 }]),
      tarolo.modosit((l) => [...l, { hoszt: '198.51.100.3', port: 3 }])
    ]);
    const vegul = await tarolo.olvas();
    return vegul.length === 3 && vegul.every((t) => t.hoszt.startsWith('198.51.100.'));
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⚠️ EGY BUKÓ MÓDOSÍTÁS NEM AKASZTJA MEG A SORT — a következő lefut', async () => {
  // ⛔ Egy ígéret-lánc könnyen beragad: ha a bukás nem fogódik meg, a MÖGÖTTE álló munka
  // soha nem indul el. *A nem-esemény a legrosszabb hiba (25. mérés).*
  const hely = await mkdtemp(join(tmpdir(), 'koino-sor3-'));
  try {
    const tarolo = udpCimTarolo(hely);
    let bukott = false;
    await tarolo.modosit(() => { throw new Error('szándékos'); }).catch(() => { bukott = true; });
    await tarolo.modosit((lista) => [...lista, { hoszt: '198.51.100.9', port: 9999, mikor: 5 }]);
    const vegul = await tarolo.olvas();
    return bukott && vegul.length === 1 && vegul[0].port === 9999;
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ D73 (2026-09-27): A MUTATÓ ÉS A PILLANATKÉPE
// ===================================
//
// Az adat egy hozzáfűzhető fájl marad; mellette a MUTATÓ (eseményenként a sor helye,
// azonosító, szerző, sorszám, szelet — test nélkül), és a pillanatképe (`mutato.json`), amit a
// megnyitás olvas. A testek kérésre jönnek. ⛔ A pillanatkép csak gyorsítótár: ha nem illik a
// fájlhoz, a mutató a fájlból épül újra — ezt mérik az alábbiak, viselkedéssel.

let mutatoMappaSzam = 0;

/** Egy friss tár-mappa, két szerzővel és három szelettel (az egyikben ékezetes cím). */
async function mutatosTar() {
  const hely = join(MAPPA, 'mutato-' + (++mutatoMappaSzam));
  const t = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });
  const anna = await ujEember(KOINO);
  const bela = await ujEember(KOINO);
  const g1 = await anna.tesz('GondolatLetrehozas', { cim: 'Első', meret: 10 });
  const g2 = await bela.tesz('GondolatLetrehozas', { cim: 'Második', meret: 10 });
  const esemenyek = [
    g1, g2,
    await anna.tesz('TudatpontRendezes', { entitas: g1.azonosito, pont: 5 }),
    await bela.tesz('TudatpontRendezes', { entitas: g1.azonosito, pont: 3 }),
    await anna.tesz('TudatpontRendezes', { entitas: g2.azonosito, pont: 2 }),
    await bela.tesz('GondolatLetrehozas', { cim: 'Harmadik — őszi fűz', meret: 10 })
  ];
  for (const e of esemenyek) await esemenyMentese(t, e);
  return { hely, anna, bela, g1, g2, esemenyek };
}

/** Amit a tár a négy kérdésre és a jegyzékre felel — egyetlen összevethető szövegben. */
async function tarValaszai(t, esemenyek) {
  const ki = [(await t.betolt()).map((e) => e.azonosito).join(',')];
  for (const e of esemenyek) {
    ki.push((await t.esemeny(e.azonosito))?.azonosito ?? '-');
    ki.push((await t.szeletEsemenyei(szelet(e))).map((x) => x.azonosito).join(','));
    ki.push((await t.sorszamSzerint(e.szerzo, e.sorszam)).map((x) => x.azonosito).join(','));
    ki.push((await t.szerzoLanca(e.szerzo)).map((x) => x.azonosito).join(','));
  }
  ki.push(JSON.stringify((await t.szeletek()).sort((a, b) => (a.szelet < b.szelet ? -1 : 1))));
  return ki.join('|');
}

proba('⭐⭐ A PILLANATKÉPBŐL NYITOTT TÁR UGYANAZT FELELI, mint a fájlból olvasott — és testet nem tölt be', async () => {
  const { hely, esemenyek } = await mutatosTar();
  // A fájlból olvasó megnyitás (6 esemény ≥ 1) megírja a pillanatképet…
  const fajlbol = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });
  // …és a következő megnyitás már abból épül.
  const kepbol = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });
  const elotte = kepbol.mutatoAllapota();
  return fajlbol.mutatoAllapota().pillanatkepbol === false
    && elotte.pillanatkepbol === true && elotte.esemeny === 6
    // ⭐ A megnyitás egyetlen testet sem olvasott be.
    && elotte.betoltottTest === 0
    && await tarValaszai(kepbol, esemenyek) === await tarValaszai(fajlbol, esemenyek);
});

proba('⭐ LUSTA TESTEK: egy szelet kérdése csak a szelet eseményeit olvassa be', async () => {
  const { hely, g1 } = await mutatosTar();
  await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });           // a pillanatkép megírása
  const t = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });
  const szeletje = await t.szeletEsemenyei(g1.azonosito);          // g1 + két pont-esemény
  const utana = t.mutatoAllapota().betoltottTest;
  const mind = await t.betolt();
  return t.mutatoAllapota().pillanatkepbol === true
    && szeletje.length === 3 && utana === 3
    && mind.length === 6 && t.mutatoAllapota().betoltottTest === 6;
});

proba('⭐ A PILLANATKÉP UTÁN ÍRT ESEMÉNY IS LÁTSZIK — a megnyitás a fájl végét elolvassa', async () => {
  const { hely, anna, g2 } = await mutatosTar();
  const irt = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });   // pillanatkép: 6 esemény
  const uj = await anna.tesz('TudatpontRendezes', { entitas: g2.azonosito, pont: 1 });
  await esemenyMentese(irt, uj);
  // ⚠️ Nagy küszöb: most nem íródik új pillanatkép — a 7. esemény CSAK a fájl végén van.
  const t = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 100 });
  const szeletje = (await t.szeletEsemenyei(g2.azonosito)).map((e) => e.azonosito);
  return t.mutatoAllapota().pillanatkepbol === true
    && t.mutatoAllapota().esemeny === 7
    && (await t.esemeny(uj.azonosito))?.azonosito === uj.azonosito
    && szeletje.includes(uj.azonosito)
    && (await lancVege(t, anna.szerzo)).sorszam === uj.sorszam + 1;
});

proba('⛔⛔ A FÁJLHOZ NEM ILLŐ PILLANATKÉP NEM TÉVESZT MEG — se kicserélt fájlnál, se elcsúszott vagy rossz bejegyzésnél', async () => {
  // ----- 1. A FÁJLT KICSERÉLTÉK (a pillanatkép egy másik fájlhoz készült) -----
  const regi = await mutatosTar();
  await esemenyTarNyitasa(KOINO, regi.hely, { kepKuszob: 1 });       // pillanatkép a régi fájlhoz
  const masik = await mutatosTar();
  const { writeFile: ir, copyFile } = await import('node:fs/promises');
  await copyFile(join(masik.hely, KOINO, 'esemenyek.jsonl'), join(regi.hely, KOINO, 'esemenyek.jsonl'));
  const t1 = await esemenyTarNyitasa(KOINO, regi.hely, { kepKuszob: 100 });
  const kicserelt = t1.mutatoAllapota().pillanatkepbol === false
    && (await t1.betolt()).map((e) => e.azonosito).join() === masik.esemenyek.map((e) => e.azonosito).join()
    && (await t1.esemeny(regi.g1.azonosito)) === undefined;

  // ----- 2. A PILLANATKÉP EGY KÖZBÜLSŐ BEJEGYZÉSE ELCSÚSZOTT -----
  // Az utolsó bejegyzés ép (a megnyitás próbája átmegy), de a 2. és a 3. helye fel van cserélve.
  const harmadik = await mutatosTar();
  await esemenyTarNyitasa(KOINO, harmadik.hely, { kepKuszob: 1 });
  const kepFajl = join(harmadik.hely, KOINO, 'mutato.json');
  const kep = JSON.parse(await readFile(kepFajl, 'utf8'));
  [kep.e[1][0], kep.e[2][0]] = [kep.e[2][0], kep.e[1][0]];
  [kep.e[1][1], kep.e[2][1]] = [kep.e[2][1], kep.e[1][1]];
  await ir(kepFajl, JSON.stringify(kep));
  const t2 = await esemenyTarNyitasa(KOINO, harmadik.hely, { kepKuszob: 100 });
  const nyitaskor = t2.mutatoAllapota().pillanatkepbol;
  let mindJo = true;
  for (const e of harmadik.esemenyek) {
    if ((await t2.esemeny(e.azonosito))?.azonosito !== e.azonosito) mindJo = false;
  }
  // ⭐ A rossz pillanatképet a tár észrevette, a fájlból újraépült, és eldobta a képet.
  const { access } = await import('node:fs/promises');
  const kepMaradt = await access(kepFajl).then(() => true, () => false);

  // ----- 3. CSAK EGY BEJEGYZÉS SZELETE ROSSZ (a helye jó) -----
  // ⛔ Az azonosító-ellenőrzés ezt nem fogná meg: a test beolvasása a mutató minden mezőjét nézi.
  const negyedik = await mutatosTar();
  await esemenyTarNyitasa(KOINO, negyedik.hely, { kepKuszob: 1 });
  const kepFajl4 = join(negyedik.hely, KOINO, 'mutato.json');
  const kep4 = JSON.parse(await readFile(kepFajl4, 'utf8'));
  // A 2. esemény (Béla gondolata) a saját szeletében van; a kép szerint g1 szeletébe tartozna.
  const g1Indexe = kep4.szeletek.indexOf(negyedik.g1.azonosito);
  kep4.e[1][5] = g1Indexe;
  await ir(kepFajl4, JSON.stringify(kep4));
  const t3 = await esemenyTarNyitasa(KOINO, negyedik.hely, { kepKuszob: 100 });
  const g1Szelete = (await t3.szeletEsemenyei(negyedik.g1.azonosito)).map((e) => e.azonosito);
  const g2Szelete = (await t3.szeletEsemenyei(negyedik.g2.azonosito)).map((e) => e.azonosito);
  const szeletJo = !g1Szelete.includes(negyedik.g2.azonosito) && g1Szelete.length === 3
    && g2Szelete.includes(negyedik.g2.azonosito);

  return kicserelt && nyitaskor === true && mindJo
    && t2.mutatoAllapota().pillanatkepbol === false && !kepMaradt && szeletJo;
});

proba('⭐ A SZELET LENYOMATA: sorrend-független, testet nem kér, és a szelet bővülésével változik', async () => {
  const { hely, anna, g1, g2, esemenyek } = await mutatosTar();
  // Ugyanaz a hat esemény, fordított sorrendben, egy másik tárban.
  const forditott = await esemenyTarNyitasa(KOINO, join(MAPPA, 'mutato-fordított-' + (++mutatoMappaSzam)));
  for (const e of [...esemenyek].reverse()) await esemenyMentese(forditott, e);
  const eredeti = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });
  const kepbol = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });

  const szeletek = [...new Set(esemenyek.map((e) => szelet(e)))];
  let egyeznek = true;
  for (const s of szeletek) {
    const l = await kepbol.szeletLenyomata(s);
    if (l.length !== 43 || l !== await forditott.szeletLenyomata(s) || l !== await eredeti.szeletLenyomata(s)) {
      egyeznek = false;
    }
  }
  // ⭐ A lenyomat testet nem kért (a pillanatképből nyitott tárban).
  const testNelkul = kepbol.mutatoAllapota().betoltottTest === 0;

  // Egy új esemény g1 szeletében: CSAK az a lenyomat változik.
  const g1Elotte = await kepbol.szeletLenyomata(g1.azonosito);
  const g2Elotte = await kepbol.szeletLenyomata(g2.azonosito);
  const uj = await anna.tesz('TudatpontRendezes', { entitas: g1.azonosito, pont: 4 });
  await esemenyMentese(kepbol, uj);
  await esemenyMentese(forditott, uj);
  const g1Utana = await kepbol.szeletLenyomata(g1.azonosito);

  return egyeznek && testNelkul
    && g1Utana !== g1Elotte
    && g1Utana === await forditott.szeletLenyomata(g1.azonosito)
    && await kepbol.szeletLenyomata(g2.azonosito) === g2Elotte
    // ⭐ Az ismeretlen szeleté is determinisztikus (az üres halmazé), és nem a többié.
    && await kepbol.szeletLenyomata('nincs-ilyen-szelet') === await forditott.szeletLenyomata('ez-sincs')
    && await kepbol.szeletLenyomata('nincs-ilyen-szelet') !== g2Elotte;
});

proba('⭐⭐ A SZÜLETÉSEK A SZÜLŐ ALATT (C 7.) — a képből is, és a régi alakú képet eldobja', async () => {
  const hely = join(MAPPA, 'szuletes-' + (++mutatoMappaSzam));
  const t = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });
  const anna = await ujEember(KOINO);
  const szulo = await anna.tesz('GondolatLetrehozas', { cim: 'Szülő', meret: 10 });
  const gyerek1 = await anna.tesz('GondolatLetrehozas', { cim: 'Gyerek 1', meret: 10, szulo: szulo.azonosito });
  const gyerek2 = await anna.tesz('GondolatLetrehozas', { cim: 'Gyerek 2', meret: 10, szulo: szulo.azonosito });
  const unoka = await anna.tesz('GondolatLetrehozas', { cim: 'Unoka', meret: 10, szulo: gyerek1.azonosito });
  const pont = await anna.tesz('TudatpontRendezes', { entitas: szulo.azonosito, pont: 3 });
  for (const e of [szulo, gyerek1, gyerek2, unoka, pont]) await esemenyMentese(t, e);

  const valaszok = async (tar) => [
    (await tar.bejelentesek(szulo.azonosito)).map((e) => e.azonosito).sort().join(),
    (await tar.bejelentesek(gyerek1.azonosito)).map((e) => e.azonosito).join(),
    (await tar.bejelentesek('')).map((e) => e.azonosito).join(),
    (await tar.bejelentesek(gyerek2.azonosito)).length
  ].join('|');
  const vart = [[gyerek1.azonosito, gyerek2.azonosito].sort().join(), unoka.azonosito,
    szulo.azonosito, 0].join('|');

  const kozvetlen = await valaszok(t);                        // a hozzáfűzésből
  await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });     // a fájlból → megírja a képet
  const kepbol = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });
  const kepbolValasz = await valaszok(kepbol);

  // ⛔ Egy 1. változatú (szülő nélküli) kép: a tár nem hiheti el — a fájlból épít újat.
  const kepFajl = join(hely, KOINO, 'mutato.json');
  const kep = JSON.parse(await readFile(kepFajl, 'utf8'));
  const { writeFile: ir } = await import('node:fs/promises');
  await ir(kepFajl, JSON.stringify({ ...kep, v: 1, e: kep.e.map((x) => x.slice(0, 6)) }));
  const regiKeppel = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 100 });
  // ⛔ D85: a 2. változatú kép (EGY szülő-index, -1 = nincs) sem hihető el — a 3. a bejelentés helyeinek
  // LISTÁJA. A tár a fájlból épít újat.
  await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 1 });     // friss 3. változatú kép
  const kep3 = JSON.parse(await readFile(kepFajl, 'utf8'));
  await ir(kepFajl, JSON.stringify({ ...kep3, v: 2, e: kep3.e.map((x) => [...x.slice(0, 6), x[6][0] ?? -1]) }));
  const ketteskeppel = await esemenyTarNyitasa(KOINO, hely, { kepKuszob: 100 });

  return kozvetlen === vart && kepbolValasz === vart
    && kepbol.mutatoAllapota().pillanatkepbol === true
    && regiKeppel.mutatoAllapota().pillanatkepbol === false
    && await valaszok(regiKeppel) === vart
    && kep3.v === 3
    && ketteskeppel.mutatoAllapota().pillanatkepbol === false
    && await valaszok(ketteskeppel) === vart;
});

// ===== ⭐⭐ D75/1, D73: A TÁR RITKA ÚJRAÍRÁSA (a tömörítés) =====

proba('⭐⭐ az ÚJRAÍRÁS a megtartandókat hagyja (a sorrendjükben), a többit visszaadja — a mutató, az újranyitás és a második folyamat is követi', async () => {
  const hely = await mkdtemp(join(tmpdir(), 'koino-ujrairas-'));
  try {
    const egy = await ujEember(KOINO);
    const ketto = await ujEember(KOINO);
    const t = await esemenyTarNyitasa(KOINO, hely);
    const g = await egy.tesz('GondolatLetrehozas', { cim: 'Marad', meret: 10 });
    const h = await ketto.tesz('GondolatLetrehozas', { cim: 'Megy', meret: 10 });
    const p1 = await egy.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 5, szerep: 'aktiv' });
    const p2 = await ketto.tesz('TudatpontRendezes', { entitas: h.azonosito, pont: 5, szerep: 'aktiv' });
    for (const e of [g, h, p1, p2]) await esemenyMentese(t, e);
    const masik = await esemenyTarNyitasa(KOINO, hely);        // egy második „folyamat” — a régi mutatóval
    await masik.esemeny(h.azonosito);                         // a teste be is töltve
    const r = await t.ujrairas((e) => e.szerzo === egy.szerzo);
    const p3 = await egy.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 6, szerep: 'aktiv' });
    await esemenyMentese(t, p3);
    const ujra = await esemenyTarNyitasa(KOINO, hely);
    await masik.frissit();
    const azonositok = async (x) => (await x.betolt()).map((e) => e.azonosito).join(',');
    const vart = [g.azonosito, p1.azonosito, p3.azonosito].join(',');
    return r.megtartva === 2 && r.kivett.map((e) => e.azonosito).sort().join() === [h.azonosito, p2.azonosito].sort().join()
      && await azonositok(t) === vart && await azonositok(ujra) === vart && await azonositok(masik) === vart
      && !(await t.esemeny(h.azonosito)) && !(await masik.esemeny(h.azonosito))
      && (await t.szeletek()).every((x) => x.szelet !== h.azonosito);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// A próbák után takarítunk: a mappa eldobható
export async function takaritas() {
  await rm(MAPPA, { recursive: true, force: true });
}

export default async function (csendes) {
  const eredmeny = await futtatas(csendes);
  await takaritas();
  return eredmeny;
}
