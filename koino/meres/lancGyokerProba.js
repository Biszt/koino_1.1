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
import { esemenyLetrehozasa, esemenyEllenorzese, szelet, bejelentesHelyei } from '../js/esemeny/esemeny.js';
import {
  koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese, javaslatLetrehozasa, szavazas
} from '../js/muveletek.js';
import { lancVege, kovetkezoEntitasSorszam, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import {
  lancGyokerLancbol, lancGyokerKetGyokerbol, lancGyokerUjEsemenyhez, lancUjEsemenyhez, azonosLancGyoker,
  KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, NAPLO_FAJTA
} from '../js/allapot/lancGyoker.js';
import { uresOsszegzes, allapotValtozasa } from '../js/esemeny/osszegzoFa.js';

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
    if (!azonosLancGyoker(lanc[i].lancGyoker, vart)) return lanc[i].sorszam;
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
  const vart = lancGyokerKetGyokerbol(await uresOsszegzes(NAPLO_FAJTA, 0), await uresOsszegzes(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ));
  return elso.sorszam === 1 && azonosLancGyoker(elso.lancGyoker, vart) && elso.lancGyoker.naplo.d === 0;
});

proba('⭐⭐ MINDEN ÚJ ESEMÉNY GYÖKERE = A LÁNCBÓL ÚJRASZÁMOLT — pontok, átrendezés, visszavétel is', async () => {
  const { tar, kornyezet } = await ujKornyezet();
  await elet(kornyezet);
  const lanc = await sajatLancEsemenyei(tar, kornyezet.szerzo);
  // ⚠️ Előfeltétel: a gyökér tényleg ott van (különben a „null = null" egyezés semmit nem mérne).
  return lanc.length === 8 && lanc.every((e) => e.lancGyoker !== null && typeof e.lancGyoker === 'object')
    && await elsoElteres(tar, kornyezet.szerzo) === 0
    // A napló-gyökerek különböznek egymástól (minden esemény más napló-állapotot köt el).
    && new Set(lanc.map((e) => e.lancGyoker.naplo.l)).size === lanc.length
    // ⭐ D81: minden pont-esemény hozza az entitása régi értékének bizonyítékát.
    && lanc.filter((e) => e.tipus === 'TudatpontRendezes').every((e) => e.adat.bizonyitek && Array.isArray(e.adat.bizonyitek.testverek));
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
// 3. ⭐ A PONT-ESEMÉNY ÖNMAGÁBAN ELLENŐRIZHETŐ — D81: CSAK AZ ESEMÉNYBŐL, a szerző nélkül
// ===================================

/**
 * Az ellenőrző oldala: CSAK a pont-eseményt tartja. ⭐ D81: a lánc-gyökere (az előző állapot) és az
 * entitás régi értékének bizonyítéka az aláírt eseményben van — a szerzőt semmiért nem kell megkérni.
 */
async function pontEsemenyEllenorzese(e) {
  const uj = e.adat.pont > 0 ? { ertek: null, osszegek: [e.adat.pont] } : null;
  const valtozas = await allapotValtozasa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, e.lancGyoker.kiosztas, e.adat.entitas, e.adat.bizonyitek, uj);
  return valtozas.rendben && valtozas.gyoker.o[0] === e.adat.kiosztva ? valtozas.gyoker : null;
}

proba('⭐⭐⭐ A PONT-ESEMÉNY ÖNMAGÁBAN ELLENŐRIZHETŐ — CSAK az aláírt eseményből, a szerző nélkül (D81)', async () => {
  const { tar, kornyezet } = await ujKornyezet();
  await elet(kornyezet);
  const lanc = await sajatLancEsemenyei(tar, kornyezet.szerzo);
  const pontEsemenyek = lanc.filter((e) => e.tipus === 'TudatpontRendezes');
  for (const e of pontEsemenyek) if (!await pontEsemenyEllenorzese(e)) return false;
  return pontEsemenyek.length === 4;
});

proba('⭐⭐ AZ ÁLLAPOT FOLYTONOS — a pont-esemény utáni kiosztás = a KÖVETKEZŐ esemény aláírt előtti állapota (két eseményből)', async () => {
  // ⭐ Ez köti össze a szerző egymás utáni eseményeit, és D81 óta a két esemény elég hozzá. ⚠️ Ez méri
  // azt is, hogy a 0 pont kiesik-e a fából (a visszavétel): ha bent maradna, a kettő eltérne.
  const { tar, kornyezet } = await ujKornyezet();
  await elet(kornyezet);
  const lanc = await sajatLancEsemenyei(tar, kornyezet.szerzo);
  let merve = 0;
  for (let i = 0; i < lanc.length - 1; i++) {
    if (lanc[i].tipus !== 'TudatpontRendezes') continue;
    const utana = await pontEsemenyEllenorzese(lanc[i]);
    if (!utana || utana.l !== lanc[i + 1].lancGyoker.kiosztas.l) return false;
    merve++;
  }
  return merve === 4;
});

proba('⛔⛔ A HAZUG BEMONDÁS LEBUKIK — a helyes gyökérrel és bizonyítékkal aláírt, de túl kicsi összeget mondó pont-esemény', async () => {
  const { tar, kornyezet } = await ujKornyezet();
  const { g1 } = await elet(kornyezet);
  const lanc = await sajatLancEsemenyei(tar, kornyezet.szerzo);
  const utolso = lanc[lanc.length - 1];
  // A csaló a HELYES lánc-gyökérrel és bizonyítékkal ír alá — de kevesebbet mond be.
  const { lancGyoker, bizonyitek } = await lancUjEsemenyhez(tar, KOINO, kornyezet.szerzo, utolso.sorszam + 1, null, g1.azonosito);
  const alair = (kiosztva) => esemenyLetrehozasa({
    koino: KOINO, tipus: 'TudatpontRendezes', entitas: g1.azonosito, entitasSorszam: 99,
    adat: { entitas: g1.azonosito, pont: 50, szerep: 'aktiv', kiosztva, bizonyitek },
    elozo: utolso.azonosito, sorszam: utolso.sorszam + 1, lancGyoker
  }, kornyezet.kulcspar);
  const hazug = await alair(10);
  const becsuletes = await alair(50);         // kontroll: 45 → 50 (a g2 0-n áll)
  return (await esemenyEllenorzese(hazug)).rendben                // az aláírás rendben van…
    && !await pontEsemenyEllenorzese(hazug)                        // …a bemondás mégis lebukik
    && !!await pontEsemenyEllenorzese(becsuletes);
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
  return hezaggal === null && eppel !== null && typeof eppel === 'object' && (await masik.tar.esemeny(szakadt.azonosito)) !== undefined
    && szakadassal === null;
});

proba('⛔ A KAPU CSAK A KÉT GYÖKERET ENGEDI BE (vagy null-t) — és a pont-eseménynél a hozzá illő bizonyítékot (D81)', async () => {
  const { tar, kornyezet } = await ujKornyezet();
  const { g1, g2 } = await elet(kornyezet);
  // ⚠️ KÉT levél kell a kiosztásban: egylevelű fában egy hiányzó kulcs bizonyítéka pontosan UGYANAZ,
  // mint az egyetlen levélé — a „más kulcs bizonyítéka" semmit nem mérne (a próba első változata így járt).
  await tudatpontRendezese(kornyezet, g2.azonosito, 10);
  const lanc = await sajatLancEsemenyei(tar, kornyezet.szerzo);
  const utolso = lanc[lanc.length - 1];
  const sorszam = utolso.sorszam + 1;
  const { lancGyoker, bizonyitek } = await lancUjEsemenyhez(tar, KOINO, kornyezet.szerzo, sorszam, null, g1.azonosito);
  const alak = async (lg, s = sorszam) => (await esemenyEllenorzese(await esemenyLetrehozasa(
    { koino: KOINO, tipus: 'GondolatLetrehozas', adat: { cim: 'x' }, elozo: utolso.azonosito, sorszam: s, lancGyoker: lg },
    kornyezet.kulcspar))).rendben;
  const kapu = async (adat) => (await esemenyMentese(tar, await esemenyLetrehozasa(
    { koino: KOINO, tipus: 'TudatpontRendezes', entitas: g1.azonosito, entitasSorszam: 77, adat,
      elozo: utolso.azonosito, sorszam, lancGyoker }, kornyezet.kulcspar))).mentve;
  const masBizonyitek = (await lancUjEsemenyhez(tar, KOINO, kornyezet.szerzo, sorszam, null, g2.azonosito)).bizonyitek;
  const pont = { entitas: g1.azonosito, pont: 50, szerep: 'aktiv', kiosztva: 60 };
  const esetek = [
    ['null', await alak(null), true],
    ['a két gyökér', await alak(lancGyoker), true],
    ['43 jeles lenyomat', await alak('A'.repeat(43)), false],
    ['rossz napló-darab', await alak(lancGyoker, sorszam + 1), false],
    ['fölös mező', await alak({ ...lancGyoker, x: 1 }), false],
    ['hiányzó kiosztás', await alak({ naplo: lancGyoker.naplo }), false],
    ['pont-esemény bizonyíték nélkül', await kapu(pont), false],
    ['pont-esemény MÁS kulcs bizonyítékával', await kapu({ ...pont, bizonyitek: masBizonyitek }), false],
    ['pont-esemény a hozzá illő bizonyítékkal', await kapu({ ...pont, bizonyitek }), true]
  ];
  const rossz = esetek.filter(([, kapott, vart]) => kapott !== vart).map(([nev]) => nev);
  if (rossz.length) console.log('    (rosszul ítélt esetek: ' + rossz.join(', ') + ')');
  return rossz.length === 0;
});

// ===================================
// ⭐⭐ D85/2 (T2, Csaba, 2026-10-02): A SZAVAZAT HOZZA A JOGÁNAK BIZONYÍTÉKÁT
// ===================================
//
// A szavazati jog a leadás pillanatában pontot kíván az érintett gondolaton ÉS a javaslaton. A
// szavazat ezt a saját aláírt kiosztás-gyökeréből bizonyítja (a D81 mintája) — így a jog akkor is
// eldönthető, ha a javaslat pont-eseményei nincsenek meg (a szigorú (b) alatt a gondolat nem szavazó
// tartóinál), és mindenhol ugyanaz.

/** A javaslattevő (A) és egy másik szavazó (B) ugyanazon a táron; A javasol, B tulajdonos lesz. */
async function ketSzavazo() {
  const { tar, kornyezet: A } = await ujKornyezet();
  const kB = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szB = Buffer.from(await crypto.subtle.exportKey('raw', kB.publicKey)).toString('base64url');
  const B = { ...A, kulcspar: kB, szerzo: szB, lancTarolo: null };
  await koinoLetrehozasa(A, 'T2');
  const g = await gondolatLetrehozasa(A, { cim: 'G' });
  await tudatpontRendezese(A, g.azonosito, 100);
  const j = await javaslatLetrehozasa(A, { erintett: g.azonosito, muvelet: 'Modositas',
    valtozas: { cim: 'G2' }, pont: 5 });
  await tudatpontRendezese(B, g.azonosito, 100);
  return { tar, A, B, g, j };
}

proba('⭐⭐ D85/2 (T2): a szavazat HOZZA a bizonyítékát — és számít akkor is, ha a javaslat pontjai NINCSENEK meg',
  async () => {
    const { tar, g, j, B } = await ketSzavazo();
    const sz = await szavazas(B, j.azonosito, 'Ellenez');
    const kulcsok = Object.keys(sz.adat.bizonyitek ?? {});

    // ⭐ A szigorú (b) helyzete: a javaslat pont-eseményei (A-é és B-é is) hiányoznak a halmazból.
    const nelkul = (await koinoEsemenyei(tar, KOINO))
      .filter((e) => !(e.tipus === 'TudatpontRendezes' && e.adat?.entitas === j.azonosito));
    const allapot = allapotSzamitasa(nelkul);
    const d = javaslatokSzamitasa(allapot.szamitok, allapot, Date.now() + 30 * 86400 * 1000).get(j.azonosito);

    return sz.lancGyoker !== null
      && kulcsok.includes(g.azonosito) && kulcsok.includes(j.azonosito)
      && d.szavazok === 2 && d.tamogatok === 1 && d.ellenzok === 1;   // A (javaslattevő) és B is számít
  });

proba('⛔⛔ D85/2 (T2): a kapu ELUTASÍTJA a szavazatot, ha a bizonyítéka nem illik a saját gyökeréhez', async () => {
  const { tar, g, j, B } = await ketSzavazo();
  // B maga tesz pontot a javaslatra, majd KÉZZEL állít össze egy szavazatot, de a két bizonyítékot
  // FELCSERÉLI (a gondolatét a javaslat kulcsa alá és fordítva).
  await tudatpontRendezese(B, j.azonosito, 1);
  const veg = await lancVege(tar, B.szerzo);
  const { lancGyoker, bizonyitek } = await lancUjEsemenyhez(tar, KOINO, B.szerzo, veg.sorszam, null,
    [g.azonosito, j.azonosito]);
  const hamis = { [g.azonosito]: bizonyitek[j.azonosito], [j.azonosito]: bizonyitek[g.azonosito] };
  const e = await esemenyLetrehozasa({
    koino: KOINO, tipus: 'Szavazat',
    adat: { javaslat: j.azonosito, szavazat: 'Tamogat', kulonvalasIgeny: false, bizonyitek: hamis },
    entitas: g.azonosito,
    entitasSorszam: await kovetkezoEntitasSorszam(tar, KOINO, B.szerzo, g.azonosito),
    latott: [], lancGyoker, ...veg
  }, B.kulcspar);
  const eredmeny = await esemenyMentese(tar, e);
  return eredmeny.mentve === false && /D85\/2/.test(eredmeny.ok ?? '');
});

// ===================================
// ⭐⭐ D85 T3 ELŐFELTÉTELE (2026-10-03): A JAVASLAT IS HOZZA A JOGÁNAK BIZONYÍTÉKÁT
// ===================================
//
// A javaslattevő jogosultsága: a javaslat ELŐTTI állása szerint minden érintetten van pontja. A szigorú
// (b) alatt a csak-G1-tartó a javaslattevő láncát hézagosan látja (a G2-es pontja a G2 szeletében van) —
// a lánc-bejárás a hiányt „nincs”-nek olvasná, és a javaslatot kidobná. Ezért a javaslat a T2 mintájára
// a saját kiosztás-fájából bizonyítja a pontjait, érintettenként.

/** Két gondolat (G1, G2), A pontot tesz mindkettőre, és egyesítést javasol. */
async function egyesitoJavaslat() {
  const { tar, kornyezet: A } = await ujKornyezet();
  await koinoLetrehozasa(A, 'T3-elofeltetel');
  const g1 = await gondolatLetrehozasa(A, { cim: 'G1' });
  const g2 = await gondolatLetrehozasa(A, { cim: 'G2' });
  await tudatpontRendezese(A, g1.azonosito, 30);
  await tudatpontRendezese(A, g2.azonosito, 30);
  const j = await javaslatLetrehozasa(A, { erintettek: [
    { entitas: g1.azonosito, muvelet: 'Egyesites', valtozas: { cim: 'E' } },
    { entitas: g2.azonosito, muvelet: 'Egyesites', valtozas: null }], pont: 2 });
  return { tar, A, g1, g2, j };
}

/** Amit a csak-G1-tartó lát: a G1 szelete és ami oda bejelentődik (meg a koinó születése). */
const csakEgyNezete = (esemenyek, g) => esemenyek.filter((e) => e.tipus === 'KoinoLetrehozas'
  || szelet(e) === g || bejelentesHelyei(e).includes(g));

proba('⭐⭐ D85 T3 előfeltétele: a javaslat HOZZA a jogának bizonyítékát — a csak-G1-tartónál sem esik ki',
  async () => {
    const { tar, A, g1, g2, j } = await egyesitoJavaslat();
    const kulcsok = Object.keys(j.adat.bizonyitek ?? {}).sort();
    const minden = await koinoEsemenyei(tar, KOINO);
    const nezet = csakEgyNezete(minden, g1.azonosito);
    // A nézetből tényleg hiányzik A G2-es pontja (különben a próba nem a hézagot mérné).
    const hianyzikG2Pont = !nezet.some((e) => e.tipus === 'TudatpontRendezes' && e.adat?.entitas === g2.azonosito);
    const allapot = allapotSzamitasa(nezet);
    const kiesett = allapot.kivetelek.some((k) => k.azonosito === j.azonosito);
    const szamit = allapot.szamitok.some((e) => e.azonosito === j.azonosito);
    return j.lancGyoker !== null && hianyzikG2Pont
      && JSON.stringify(kulcsok) === JSON.stringify([g1.azonosito, g2.azonosito].sort())
      && !kiesett && szamit && A.szerzo === j.szerzo;
  });

proba('⛔⛔ D85 T3 előfeltétele: a hamis bizonyítékú javaslatot a kapu elutasítja; a pont nélküli kiesik', async () => {
  const { tar, A, g1, g2 } = await egyesitoJavaslat();
  // (1) KÉZZEL összeállított javaslat, a két bizonyíték FELCSERÉLVE.
  const veg = await lancVege(tar, A.szerzo);
  const { lancGyoker, bizonyitek } = await lancUjEsemenyhez(tar, KOINO, A.szerzo, veg.sorszam, null,
    [g1.azonosito, g2.azonosito]);
  const hamis = { [g1.azonosito]: bizonyitek[g2.azonosito], [g2.azonosito]: bizonyitek[g1.azonosito] };
  const e = await esemenyLetrehozasa({
    koino: KOINO, tipus: 'Javaslat',
    adat: { fajta: 'szerkesztesi', indoklas: null, bizonyitek: hamis, erintettek: [
      { entitas: g1.azonosito, muvelet: 'Torles', valtozas: null },
      { entitas: g2.azonosito, muvelet: 'Torles', valtozas: null }] },
    entitas: null, entitasSorszam: 1, latott: [], lancGyoker, ...veg
  }, A.kulcspar);
  const kapu = await esemenyMentese(tar, e);

  // (2) B-nek a G2-n NINCS pontja, mégis javasol (a művelet-réteg nem tilt, a szabály dönt): a hozott
  //     bizonyíték a hiányt bizonyítja → a javaslat kiesik, akkor is, ha minden esemény megvan.
  const kB = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szB = Buffer.from(await crypto.subtle.exportKey('raw', kB.publicKey)).toString('base64url');
  const B = { ...A, kulcspar: kB, szerzo: szB, lancTarolo: null };
  await tudatpontRendezese(B, g1.azonosito, 10);
  const jB = await javaslatLetrehozasa(B, { erintettek: [
    { entitas: g1.azonosito, muvelet: 'Torles', valtozas: null },
    { entitas: g2.azonosito, muvelet: 'Torles', valtozas: null }] });
  const allapot = allapotSzamitasa(await koinoEsemenyei(tar, KOINO));
  const kivetel = allapot.kivetelek.find((k) => k.azonosito === jB.azonosito);
  return kapu.mentve === false && /T2/.test(kapu.ok ?? '')
    && !!kivetel && /nem bizonyította/.test(kivetel.ok);
});

export default futtatas;
