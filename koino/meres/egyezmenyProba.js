// koino/meres/egyezmenyProba.js — AZ EGYEZMÉNY VÉGREHAJTÁSA (Szakasz 5, 2026-09-06)

// Mit bizonyít ez a lap?
//
// ⛔⛔ Azt a rést, amit a Szakasz 5.3 első órájában MÉRTÜNK: a javaslat elfogadódott, az
// egyezmény megszületett — **a gondolat címe mégis a régi maradt**. A `javaslatSzamitas.js`
// kiszámolta a `valtozas`-t, de az `allapotSzamitas.js` soha nem olvasta.
//
// ⭐ Itt azt mérjük, hogy a hurok BEZÁRUL: az elfogadott szerkesztési egyezmény rákerül az
// entitásra — és **csak az**, csak akkor, és determinisztikus sorrendben.

import { allapotSzamitasa, szetosztottPontok, elakadtPontok } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { szerkesztesiEgyezmenyekAlkalmazasa } from '../js/allapot/szerkesztesiVegrehajtas.js';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('AZ EGYEZMÉNY VÉGREHAJTÁSA');

const KEZDET = Date.UTC(2026, 0, 1);
const KESOBB = KEZDET + 30 * 24 * 3600 * 1000;      // jóval a döntési idő után
const KUSZOBOK = {
  elfogadasiKuszob: 51, reszveteliKuszob: 0,
  minimumDontesiIdo: 3600, maximumDontesiIdo: 7200
};

// ===================================
// SEGÉDEK
// ===================================

/**
 * Egy gondolat + egy javaslat + egy támogató szavazat.
 * @returns {Promise<Object>} { esemenyek, gondolat, javaslat, gazda }
 */
async function eset({ muvelet = 'Modositas', valtozas = { cim: 'ÚJ CÍM' },
                      fajta = 'szerkesztesi', szavazat = 'Tamogat', masodik = null } = {}) {
  const gazda = await ujEember();
  const esemenyek = [];

  const gondolat = await gazda.tesz('GondolatLetrehozas',
    { cim: 'EREDETI CÍM', szoveg: 'eredeti szöveg', meret: 100 }, KEZDET);
  esemenyek.push(gondolat);
  esemenyek.push(await gazda.tesz('TudatpontRendezes',
    { entitas: gondolat.azonosito, pont: 100 }, KEZDET));
  esemenyek.push(await gazda.tesz('ErtekJavaslat',
    { entitas: gondolat.azonosito, ertekek: KUSZOBOK }, KEZDET));

  const javaslat = await gazda.tesz('Javaslat',
    { fajta, erintett: gondolat.azonosito, muvelet, valtozas, indoklas: null }, KEZDET + 1000);
  esemenyek.push(javaslat);
  esemenyek.push(await gazda.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat }, KEZDET + 2000));

  // Elhagyható MÁSODIK javaslat ugyanarra az entitásra (a sorrend méréséhez).
  let masodikJavaslat = null;
  if (masodik) {
    masodikJavaslat = await gazda.tesz('Javaslat',
      { fajta: 'szerkesztesi', erintett: gondolat.azonosito, muvelet: 'Modositas',
        valtozas: masodik, indoklas: null }, KEZDET + 5000);
    esemenyek.push(masodikJavaslat);
    esemenyek.push(await gazda.tesz('Szavazat',
      { javaslat: masodikJavaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 6000));
  }

  return { esemenyek, gondolat, javaslat, masodikJavaslat, gazda };
}

/** A három fázis — ugyanaz, amit a `koino.js` és a `pakli.js` futtat. */
function kep(esemenyek, most = KESOBB) {
  const allapot = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, most);
  const eredmeny = szerkesztesiEgyezmenyekAlkalmazasa(allapot, javaslatok);
  return { allapot, javaslatok, ...eredmeny };
}

const cime = (k, gondolat) => k.allapot.entitasok.get(gondolat.azonosito)?.cim;

// ===================================
// 1. A HUROK BEZÁRUL
// ===================================

proba('⭐⭐⭐ AZ ELFOGADOTT egyezmény ÁTÍRJA a címet — ez volt a mért rés', async () => {
  const e = await eset();
  const k = kep(e.esemenyek);
  return cime(k, e.gondolat) === 'ÚJ CÍM' && k.alkalmazottak.length === 1;
});

proba('⛔ A FOLYAMATBAN lévő javaslat NEM ír át semmit (nem hat előre)', async () => {
  const e = await eset();
  // Közvetlenül a javaslat után: a döntési idő még nem telt le.
  const k = kep(e.esemenyek, KEZDET + 3000);
  return cime(k, e.gondolat) === 'EREDETI CÍM' && k.alkalmazottak.length === 0;
});

proba('⛔ Az ELVETETT javaslat nem ír át semmit', async () => {
  const e = await eset({ szavazat: 'Ellenez' });
  const k = kep(e.esemenyek);
  return cime(k, e.gondolat) === 'EREDETI CÍM' && k.alkalmazottak.length === 0;
});

proba('⛔⛔ Az ÁLTALÁNOS egyezményből nem következik entitás-változás (D27)', async () => {
  const e = await eset({ fajta: 'altalanos' });
  const k = kep(e.esemenyek);
  // Az egyezmény MEGSZÜLETIK — csak nem hajtódik végre.
  const j = k.javaslatok.get(e.javaslat.azonosito);
  return j.egyezmeny !== null
    && cime(k, e.gondolat) === 'EREDETI CÍM'
    && k.alkalmazottak.length === 0;
});

// ===================================
// 2. MIT ÍR ÁT — ÉS MIT NEM
// ===================================

proba('A szöveg is átírható', async () => {
  const e = await eset({ valtozas: { szoveg: 'ÚJ SZÖVEG' } });
  const k = kep(e.esemenyek);
  const entitas = k.allapot.entitasok.get(e.gondolat.azonosito);
  return entitas.szoveg === 'ÚJ SZÖVEG' && entitas.cim === 'EREDETI CÍM';
});

proba('⭐ CSAK a megnevezett mező változik — a cím-csere nem törli a szöveget', async () => {
  const e = await eset({ valtozas: { cim: 'ÚJ CÍM' } });
  const k = kep(e.esemenyek);
  const entitas = k.allapot.entitasok.get(e.gondolat.azonosito);
  return entitas.cim === 'ÚJ CÍM' && entitas.szoveg === 'eredeti szöveg';
});

proba('⛔ A mezőt nem nevező változás kihagyva, indoklással', async () => {
  const e = await eset({ valtozas: { valamiMas: 'x' } });
  const k = kep(e.esemenyek);
  return k.alkalmazottak.length === 0
    && k.kihagyottak.length === 1
    && k.kihagyottak[0].ok.includes('nem nevezett meg mezőt');
});

// ===================================
// 3. ⭐ A SORREND — determinizmus
// ===================================

proba('⭐ KÉT egyezmény ugyanarra: a KÉSŐBBI nyer', async () => {
  const e = await eset({ valtozas: { cim: 'ELSŐ' }, masodik: { cim: 'MÁSODIK' } });
  const k = kep(e.esemenyek);
  return cime(k, e.gondolat) === 'MÁSODIK' && k.alkalmazottak.length === 2;
});

proba('⭐⭐ …ÉS EZ NEM A BEJÁRÁSI SORRENDTŐL FÜGG: kevert bemenettel is ugyanaz', async () => {
  const e = await eset({ valtozas: { cim: 'ELSŐ' }, masodik: { cim: 'MÁSODIK' } });

  // Ugyanaz a halmaz, más sorrendben — mint két gépen a csere után.
  const kevert = [...e.esemenyek].reverse();
  const a = kep(e.esemenyek);
  const b = kep(kevert);
  return cime(a, e.gondolat) === cime(b, e.gondolat) && cime(b, e.gondolat) === 'MÁSODIK';
});

// ⚠️⚠️ ÉS A PRÓBA, AMI NÉLKÜL A RENDEZÉS MÉRETLEN MARADNA.
//
// A fenti két próba akkor is átment, amikor a `sort`-ot KIVETTÜK — mert a javaslatok
// **természetes bejárási sorrendje** (szerző + sorszám, a `rendezettBemenet` szerint)
// véletlenül épp egyezett a helyes sorrenddel. ⭐ A rendezés csak akkor mérhető, ha a kettő
// SZÉTVÁLIK: itt az ELSŐNEK LÉTREHOZOTT javaslat érik be KÉSŐBB (későbbi `ido`), tehát a
// helyes eredmény az ő változása — a bejárási sorrend viszont a másikat adná.
proba('⭐⭐⭐ A SORREND a LEJÁRAT szerint dől el, nem a bejárás szerint', async () => {
  const gazda = await ujEember();
  const esemenyek = [];

  const gondolat = await gazda.tesz('GondolatLetrehozas',
    { cim: 'EREDETI CÍM', meret: 100 }, KEZDET);
  esemenyek.push(gondolat);
  esemenyek.push(await gazda.tesz('TudatpontRendezes',
    { entitas: gondolat.azonosito, pont: 100 }, KEZDET));
  esemenyek.push(await gazda.tesz('ErtekJavaslat',
    { entitas: gondolat.azonosito, ertekek: KUSZOBOK }, KEZDET));

  // ELŐBB létrehozva (kisebb sorszám → a bejárásban ELÖL), de KÉSŐBBI időponttal —
  // tehát KÉSŐBB jár le, és a helyes sorrendben ez az UTOLSÓ.
  const kesoi = await gazda.tesz('Javaslat',
    { fajta: 'szerkesztesi', erintett: gondolat.azonosito, muvelet: 'Modositas',
      valtozas: { cim: 'A KÉSŐBB LEJÁRÓ' }, indoklas: null }, KEZDET + 900000);
  esemenyek.push(kesoi);
  esemenyek.push(await gazda.tesz('Szavazat',
    { javaslat: kesoi.azonosito, szavazat: 'Tamogat' }, KEZDET + 900000));

  // UTÓBB létrehozva (nagyobb sorszám → a bejárásban HÁTUL), de KORÁBBI időponttal.
  const korai = await gazda.tesz('Javaslat',
    { fajta: 'szerkesztesi', erintett: gondolat.azonosito, muvelet: 'Modositas',
      valtozas: { cim: 'A KORÁBBAN LEJÁRÓ' }, indoklas: null }, KEZDET + 1000);
  esemenyek.push(korai);
  esemenyek.push(await gazda.tesz('Szavazat',
    { javaslat: korai.azonosito, szavazat: 'Tamogat' }, KEZDET + 1000));

  const k = kep(esemenyek);

  // ⭐ A helyes eredmény a KÉSŐBB lejáró változása — a bejárási sorrend a másikat adná.
  return k.alkalmazottak.length === 2
    && cime(k, gondolat) === 'A KÉSŐBB LEJÁRÓ';
});

// ===================================
// 4. ÁTHELYEZÉS — és a kör-csapda
// ===================================

/** Szülő + gyerek, és egy áthelyezési javaslat a gyerekre. */
async function faEset(ujSzulo) {
  const gazda = await ujEember();
  const esemenyek = [];

  const szulo = await gazda.tesz('GondolatLetrehozas', { cim: 'SZÜLŐ', meret: 10 }, KEZDET);
  esemenyek.push(szulo);
  esemenyek.push(await gazda.tesz('TudatpontRendezes',
    { entitas: szulo.azonosito, pont: 100 }, KEZDET));

  const gyerek = await gazda.tesz('GondolatLetrehozas',
    { cim: 'GYEREK', meret: 10, szulo: szulo.azonosito }, KEZDET);
  esemenyek.push(gyerek);
  esemenyek.push(await gazda.tesz('TudatpontRendezes',
    { entitas: gyerek.azonosito, pont: 100 }, KEZDET));
  esemenyek.push(await gazda.tesz('ErtekJavaslat',
    { entitas: szulo.azonosito, ertekek: KUSZOBOK }, KEZDET));

  // A javaslat a SZÜLŐT helyezné a gyerek alá (kör!), vagy gyökérre (rendben).
  const javaslat = await gazda.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: szulo.azonosito, muvelet: 'Athelyezes',
    valtozas: { szulo: ujSzulo === 'gyerek' ? gyerek.azonosito : null }, indoklas: null
  }, KEZDET + 1000);
  esemenyek.push(javaslat);
  esemenyek.push(await gazda.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000));

  return { esemenyek, szulo, gyerek };
}

proba('⭐ ÁTHELYEZÉS: a gyökérre helyezés végrehajtódik', async () => {
  const e = await faEset('gyoker');
  const k = kep(e.esemenyek);
  return k.allapot.entitasok.get(e.szulo.azonosito).szulo === null
    && k.alkalmazottak.length === 1;
});

proba('⛔⛔ ÁTHELYEZÉS, AMI KÖRT CSINÁLNA: kihagyva, és megmondja, miért', async () => {
  const e = await faEset('gyerek');
  const k = kep(e.esemenyek);
  return k.alkalmazottak.length === 0
    && k.kihagyottak.length === 1
    && k.kihagyottak[0].ok.includes('KÖRT')
    // ⭐ És a fa ÉRINTETLEN maradt.
    && k.allapot.entitasok.get(e.szulo.azonosito).szulo === null
    && k.allapot.entitasok.get(e.gyerek.azonosito).szulo === e.szulo.azonosito;
});

// ===================================
// 5. ⛔ AMI NINCS MEGÉPÍTVE — de LÁTSZIK
// ===================================

// ⚠️ ITT ÁLLT a „⛔ ISMERT, de végrehajtó nélküli művelet" próba. 2026-09-07 óta **mind a
// négy műveletnek van végrehajtója**, tehát a próbának elfogyott az alanya — nem töröltük
// szó nélkül, hanem ide írjuk, hogy miért nincs. *(Az ág maga megmaradt a kódban: ha egy
// újabb változat új műveletet vezet be, a régebbi készülék azt fogja felsorolni.)*

// ===================================
// ⛔⛔ AZ ELAKADT PONTOK (2026-09-07, Csaba kérdéséből)
// ===================================
//
// *„Ha nem veszi vissza, akkor az entitás hogyan törlődik, hiszen rajta van a készülékén
// tudatponttal?"* — a válasz: az entitás **törlődik**, mert az eltűnés SZÁMÍTÁS az
// egyezményből, nem a pontok nullázódásának következménye. A pont viszont a keretben marad.

proba('⭐⭐ A TÖRLÉS UTÁN A KIOSZTOTT ÖSSZEG NEM CSÖKKEN — a pont elakad, nem tűnik el', async () => {
  const e = await eset({ muvelet: 'Torles', valtozas: null });
  const k = kep(e.esemenyek);

  // ⛔ EZ VOLT A MÉRT HIBA: a „mennyit osztottam ki" az ÉLŐ entitásokból számolt (0), a
  // szabály-réteg viszont a saját láncból (100) — és a következő tudatpont-eseményem
  // „hazugságként" bukott el. A kettőnek UGYANAZT kell mondania.
  return szetosztottPontok(k.allapot, e.gazda.szerzo) === 100
    && elakadtPontok(k.allapot, e.gazda.szerzo).length === 1
    && elakadtPontok(k.allapot, e.gazda.szerzo)[0].pont === 100;
});

proba('⭐ …ÉS A TÖRLÉS UTÁN IS LEHET ÚJ GONDOLATOT LÉTREHOZNI (a lánc és a bemondás egyezik)', async () => {
  const e = await eset({ muvelet: 'Torles', valtozas: null });
  const k = kep(e.esemenyek);

  // A készülék a `szetosztottPontok`-ból mondja be az összeget — ahogy a `koino.js` teszi.
  const uj = await e.gazda.tesz('GondolatLetrehozas', { cim: 'ÚJ', meret: 10 }, KESOBB);
  const pont = await e.gazda.tesz('TudatpontRendezes', {
    entitas: uj.azonosito, pont: 50,
    kiosztva: szetosztottPontok(k.allapot, e.gazda.szerzo) + 50
  }, KESOBB);

  const utana = kep([...e.esemenyek, uj, pont]);
  return utana.allapot.kivetelek.length === 0
    && utana.allapot.entitasok.has(uj.azonosito);
});

// ===================================
// ⭐⭐⭐ EGYESÍTÉS (2026-09-07)
// ===================================
//
// Csaba döntése: **nem születik új azonosító — az ELSŐ érintett olvasztja be a többit.**
// Így minden azonosító egy aláírt esemény lenyomata marad.

/** N gondolat közös szülő alatt, mindegyiken a gazda pontjaival. */
async function egyesitesEset({ szulok = [null, null], gyerekhez = null } = {}) {
  const gazda = await ujEember();
  const masik = await ujEember();
  const esemenyek = [];
  const forrasok = [];

  for (let i = 0; i < szulok.length; i++) {
    const g = await gazda.tesz('GondolatLetrehozas',
      { cim: 'FORRÁS ' + (i + 1), meret: 10, szulo: szulok[i] }, KEZDET);
    esemenyek.push(g);
    esemenyek.push(await gazda.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 10 }, KEZDET));
    // ⭐ A MÁSODIK forráson EGY MÁSIK ember is tart pontot — így mérhető, hogy a pontok
    // emberenként összeadódnak, nem összemosódnak.
    if (i === 1) {
      esemenyek.push(await masik.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 7 }, KEZDET));
    }
    esemenyek.push(await gazda.tesz('ErtekJavaslat', { entitas: g.azonosito, ertekek: KUSZOBOK }, KEZDET));
    forrasok.push(g);
  }

  // Elhagyható gyerek a MÁSODIK forrás alatt (az átkötés méréséhez).
  let gyerek = null;
  if (gyerekhez !== null) {
    gyerek = await gazda.tesz('GondolatLetrehozas',
      { cim: 'GYEREK', meret: 10, szulo: forrasok[gyerekhez].azonosito }, KEZDET);
    esemenyek.push(gyerek);
    esemenyek.push(await gazda.tesz('TudatpontRendezes', { entitas: gyerek.azonosito, pont: 5 }, KEZDET));
  }

  const javaslat = await gazda.tesz('Javaslat', {
    fajta: 'szerkesztesi',
    erintettek: forrasok.map((f, i) => ({
      entitas: f.azonosito,
      muvelet: 'Egyesites',
      valtozas: i === 0 ? { cim: 'EGYESÍTETT' } : null
    }))
  }, KEZDET + 1000);
  esemenyek.push(javaslat);
  esemenyek.push(await gazda.tesz('TudatpontRendezes',
    { entitas: javaslat.azonosito, pont: 5 }, KEZDET + 1500));
  esemenyek.push(await gazda.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000));

  return { esemenyek, forrasok, gyerek, javaslat, gazda, masik };
}

proba('⭐⭐⭐ AZ ELSŐ FORRÁS ELNYELI A MÁSODIKAT — és a pontok EMBERENKÉNT összeadódnak', async () => {
  const e = await egyesitesEset();
  const k = kep(e.esemenyek);
  const elnyelo = k.allapot.entitasok.get(e.forrasok[0].azonosito);

  return k.allapot.entitasok.has(e.forrasok[1].azonosito) === false   // a második beolvadt
    && elnyelo !== undefined                                          // az első megmaradt
    && elnyelo.cim === 'EGYESÍTETT'
    // ⭐ A gazda 10 + 10 = 20 pontja EGY bejegyzés lett, a másiké külön marad.
    && elnyelo.hozzajarulok.get(e.gazda.szerzo).pont === 20
    && elnyelo.hozzajarulok.get(e.masik.szerzo).pont === 7
    && elnyelo.osszesPont === 27
    && k.alkalmazottak[0].muvelet === 'Egyesites'
    && k.alkalmazottak[0].beolvasztott.length === 1;
});

proba('⭐⭐ A BEOLVASZTOTT GONDOLAT GYEREKE AZ ELNYELŐHÖZ KERÜL — nem a nagyszülőhöz', async () => {
  // ⛔ EZ A SORREND-CSAPDA: ha a gyerekeket a források eltűnése UTÁN gyűjtenénk, az
  // árva-szabály már felvitte volna őket a nagyszülőhöz. A prototípus épp ezért gyűjt
  // a törlés ELŐTT (Csaba döntése, 2026-07-22).
  const e = await egyesitesEset({ gyerekhez: 1 });     // a gyerek a MÁSODIK forrás alatt
  const k = kep(e.esemenyek);

  return k.allapot.entitasok.get(e.gyerek.azonosito).szulo === e.forrasok[0].azonosito
    // ⭐ …és ettől az ág-méret is helyes: az elnyelő ága tartalmazza a gyereket.
    && k.allapot.entitasok.get(e.forrasok[0].azonosito).agMeret === 20;
});

proba('⭐ AZ EGYESÍTETT GONDOLAT A LEGKÖZELEBBI KÖZÖS ŐS ALÁ KERÜL', async () => {
  // Két külön ágban lévő forrás: a közös ős a gyökér alatti közös felmenő.
  const gazda = await ujEember();
  const esemenyek = [];

  const kozos = await gazda.tesz('GondolatLetrehozas', { cim: 'KÖZÖS ŐS', meret: 10 }, KEZDET);
  esemenyek.push(kozos, await gazda.tesz('TudatpontRendezes', { entitas: kozos.azonosito, pont: 10 }, KEZDET));

  const forrasok = [];
  for (const nev of ['BAL', 'JOBB']) {
    const ag = await gazda.tesz('GondolatLetrehozas', { cim: nev, meret: 10, szulo: kozos.azonosito }, KEZDET);
    esemenyek.push(ag, await gazda.tesz('TudatpontRendezes', { entitas: ag.azonosito, pont: 10 }, KEZDET));
    const f = await gazda.tesz('GondolatLetrehozas', { cim: nev + '-FORRÁS', meret: 10, szulo: ag.azonosito }, KEZDET);
    esemenyek.push(f, await gazda.tesz('TudatpontRendezes', { entitas: f.azonosito, pont: 10 }, KEZDET));
    esemenyek.push(await gazda.tesz('ErtekJavaslat', { entitas: f.azonosito, ertekek: KUSZOBOK }, KEZDET));
    forrasok.push(f);
  }

  const javaslat = await gazda.tesz('Javaslat', {
    fajta: 'szerkesztesi',
    erintettek: forrasok.map((f) => ({ entitas: f.azonosito, muvelet: 'Egyesites', valtozas: null }))
  }, KEZDET + 1000);
  esemenyek.push(javaslat);
  esemenyek.push(await gazda.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000));

  const k = kep(esemenyek);
  // ⭐ A BAL-FORRÁS a BAL alatt volt; egyesítés után a KÖZÖS ŐS alá kerül.
  return k.allapot.entitasok.get(forrasok[0].azonosito).szulo === kozos.azonosito
    && k.allapot.entitasok.has(forrasok[1].azonosito) === false;
});

proba('⛔⛔ A BEOLVASZTOTT FORRÁS NEM „ELAKADT PONT" — a pontja átment, nem veszett el', async () => {
  // ⚠️ EZ EGY CSAPDA, amit a felszabadítás tervezése hozott elő. A beolvasztott forrás
  // ugyanúgy „eltűnt", mint a törölt — de a pont sorsa ELLENTÉTES. Ha a felszabadítás a
  // puszta „eltűnt" listát nézné, ráírna egy `pont: 0`-t a forrásra, és a következő
  // számításnál az egyesítés **már nem találná meg a pontjaimat**. *Ugyanaz a szó, két
  // ellentétes következmény.*
  const e = await egyesitesEset();
  const k = kep(e.esemenyek);

  return elakadtPontok(k.allapot, e.gazda.szerzo).length === 0
    && elakadtPontok(k.allapot, e.masik.szerzo).length === 0
    // ⭐ …és a kiosztott összeg is stimmel: a pont ott van, csak az elnyelőn.
    && szetosztottPontok(k.allapot, e.gazda.szerzo)
       === k.allapot.entitasok.get(e.forrasok[0].azonosito).hozzajarulok.get(e.gazda.szerzo).pont
        + k.allapot.entitasok.get(e.javaslat.azonosito).hozzajarulok.get(e.gazda.szerzo).pont;
});

proba('⭐ HÁROM FORRÁS is összevonható, egy lépésben', async () => {
  const e = await egyesitesEset({ szulok: [null, null, null] });
  const k = kep(e.esemenyek);

  return k.allapot.entitasok.has(e.forrasok[1].azonosito) === false
    && k.allapot.entitasok.has(e.forrasok[2].azonosito) === false
    && k.allapot.entitasok.get(e.forrasok[0].azonosito).osszesPont === 37;   // 10+10+7+10
});

// ===================================
// ⭐⭐ TÖRLÉS (2026-09-07)
// ===================================
//
// A prototípusban a törlés NEM külön mechanizmus: `tudatpontokVisszaosztasa` — mindenki
// visszakapja a pontjait, és az entitás ettől szűnik meg létezni (D14). A koinóban a
// visszaosztást nem tehetjük meg más nevében (aláírt esemény), de az EREDMÉNY ugyanaz.

proba('⭐⭐ A TÖRLÉSI egyezmény MEGSZÜNTETI az entitást', async () => {
  const e = await eset({ muvelet: 'Torles', valtozas: null });
  const k = kep(e.esemenyek);

  return k.allapot.entitasok.has(e.gondolat.azonosito) === false
    && k.allapot.elfelejtettek.includes(e.gondolat.azonosito)
    && k.alkalmazottak.length === 1
    && k.alkalmazottak[0].muvelet === 'Torles';
});

proba('⛔ …DE CSAK ELFOGADÁS UTÁN — a folyamatban lévő törlés nem tüntet el semmit', async () => {
  const e = await eset({ muvelet: 'Torles', valtozas: null });
  const k = kep(e.esemenyek, KEZDET + 3000);        // a döntési idő még nem telt le
  return k.allapot.entitasok.has(e.gondolat.azonosito) === true
    && k.alkalmazottak.length === 0;
});

proba('⭐⭐⭐ A TÖRÖLT ENTITÁS GYEREKEI FELKERÜLNEK A NAGYSZÜLŐHÖZ (a prototípus kaszkádja)', async () => {
  const gazda = await ujEember();
  const esemenyek = [];

  // nagyszülő → szülő (ezt töröljük) → gyerek
  const nagyszulo = await gazda.tesz('GondolatLetrehozas', { cim: 'NAGYSZÜLŐ', meret: 10 }, KEZDET);
  esemenyek.push(nagyszulo);
  esemenyek.push(await gazda.tesz('TudatpontRendezes', { entitas: nagyszulo.azonosito, pont: 10 }, KEZDET));

  const szulo = await gazda.tesz('GondolatLetrehozas',
    { cim: 'SZÜLŐ', meret: 10, szulo: nagyszulo.azonosito }, KEZDET);
  esemenyek.push(szulo);
  esemenyek.push(await gazda.tesz('TudatpontRendezes', { entitas: szulo.azonosito, pont: 10 }, KEZDET));
  esemenyek.push(await gazda.tesz('ErtekJavaslat', { entitas: szulo.azonosito, ertekek: KUSZOBOK }, KEZDET));

  const gyerek = await gazda.tesz('GondolatLetrehozas',
    { cim: 'GYEREK', meret: 10, szulo: szulo.azonosito }, KEZDET);
  esemenyek.push(gyerek);
  esemenyek.push(await gazda.tesz('TudatpontRendezes', { entitas: gyerek.azonosito, pont: 10 }, KEZDET));

  const javaslat = await gazda.tesz('Javaslat', {
    fajta: 'szerkesztesi',
    erintettek: [{ entitas: szulo.azonosito, muvelet: 'Torles', valtozas: null }]
  }, KEZDET + 1000);
  esemenyek.push(javaslat);
  // ⚠️ A javaslat IS entitás: tudatpont nélkül a D14 szerint nem létezne, és akkor az
  // „egyezmény helye" kérdésnek sem lenne alanya.
  esemenyek.push(await gazda.tesz('TudatpontRendezes',
    { entitas: javaslat.azonosito, pont: 10 }, KEZDET + 1500));
  esemenyek.push(await gazda.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000));

  const k = kep(esemenyek);

  return k.allapot.entitasok.has(szulo.azonosito) === false
    // ⭐ A gyerek NEM tűnt el, és NEM lóg a semmiben: a nagyszülőhöz került.
    && k.allapot.entitasok.get(gyerek.azonosito)?.szulo === nagyszulo.azonosito
    // ⭐ …és ettől az ág-méret is helyes: a nagyszülő ága tartalmazza a gyereket.
    && k.allapot.entitasok.get(nagyszulo.azonosito).agMeret === 20
    // ⭐⭐ ÉS AZ EGYEZMÉNY HELYE: a javaslat-entitás szülője az érintett volt — az eltűnt,
    // tehát ő is a nagyszülőhöz került. Ez a leltár 2.2 pontja, külön szabály nélkül.
    && k.allapot.entitasok.get(javaslat.azonosito)?.szulo === nagyszulo.azonosito;
});

proba('⛔ ISMERETLEN művelet: szintén kihagyva, megnevezve', async () => {
  const e = await eset({ muvelet: 'Elkobzas', valtozas: { cim: 'x' } });
  const k = kep(e.esemenyek);
  return k.kihagyottak.length === 1 && k.kihagyottak[0].ok.includes('ismeretlen művelet');
});

proba('⚠️ A HIÁNYZÓ entitás nem hiba, csak „nem hajtható végre" (D14/D19)', async () => {
  const e = await eset();
  // A gazda elveszi a tudatpontját → az entitás megszűnik létezni (D14), a javaslat marad.
  //
  // ⚠️⚠️ A LEZÁRÁS UTÁN veszi el, és ez nem részletkérdés: 2026-09-07 óta csak a
  // JOGOSULT szavazat számít, és a jogosultság a lezárás pillanatában érvényes állapot
  // szerint dől el. Ha a döntési időn BELÜL szállna ki, a saját szavazata sem számítana,
  // az egyezmény meg sem születne — és ez a próba **nem azt mérné, amit ígér**
  // (a végrehajtáskor hiányzó entitást), hanem némán a szavazás-szabályt.
  const elvesz = await e.gazda.tesz('TudatpontRendezes',
    { entitas: e.gondolat.azonosito, pont: 0 }, KEZDET + 3 * 3600 * 1000);
  const k = kep([...e.esemenyek, elvesz]);

  return k.allapot.entitasok.size === 0
    && k.kihagyottak.length === 1
    && k.kihagyottak[0].ok.includes('nem létezik');
});

// ===================================
// 6. ⭐ AZ ÁLLAPOTBAN IS LÁTSZIK
// ===================================

proba('⭐ Az alkalmazások és a kihagyások az ÁLLAPOTBAN is ott vannak (D19)', async () => {
  const e = await eset();
  const k = kep(e.esemenyek);
  return Array.isArray(k.allapot.szerkesztesiAlkalmazasok)
    && k.allapot.szerkesztesiAlkalmazasok.length === 1
    && Array.isArray(k.allapot.szerkesztesiKihagyasok)
    && k.allapot.szerkesztesiAlkalmazasok[0].mezok.includes('cim');
});

// ===================================
// 7. ⭐⭐ TÖBB ÉRINTETT ENTITÁS (2026-09-07)
// ===================================
//
// A prototípus javaslata `erintettEntitasok` TÖMBÖT hordoz, és **minden elemen saját
// `muvelet` van** — egy csomagban az egyik gondolat módosul, a másik áthelyeződik.
// Itt azt mérjük, hogy a végrehajtás ezt a tömböt járja, elemenként.

/**
 * KÉT gondolat + EGY javaslat, ami mindkettőt érinti — elemenként más művelettel.
 * @param {Array} erintettek - a javaslat `adat.erintettek` tömbje (a hívó építi föl)
 */
async function csomagEset(epit) {
  const gazda = await ujEember();
  const esemenyek = [];
  const gondolatok = [];

  for (const cim of ['ELSŐ', 'MÁSODIK']) {
    const g = await gazda.tesz('GondolatLetrehozas', { cim, szoveg: 'sz', meret: 100 }, KEZDET);
    esemenyek.push(g);
    esemenyek.push(await gazda.tesz('TudatpontRendezes',
      { entitas: g.azonosito, pont: 50 }, KEZDET));
    esemenyek.push(await gazda.tesz('ErtekJavaslat',
      { entitas: g.azonosito, ertekek: KUSZOBOK }, KEZDET));
    gondolatok.push(g);
  }

  const javaslat = await gazda.tesz('Javaslat',
    { fajta: 'szerkesztesi', erintettek: epit(gondolatok), indoklas: null }, KEZDET + 1000);
  esemenyek.push(javaslat);
  esemenyek.push(await gazda.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000));

  return { esemenyek, gondolatok, javaslat, gazda };
}

proba('⭐⭐ KÉT ÉRINTETT, KÉT KÜLÖNBÖZŐ MŰVELET — mindkettő végrehajtódik', async () => {
  const e = await csomagEset(([a, b]) => [
    { entitas: a.azonosito, muvelet: 'Modositas', valtozas: { cim: 'ÁTÍRVA' } },
    { entitas: b.azonosito, muvelet: 'Athelyezes', valtozas: { szulo: a.azonosito } }
  ]);
  const k = kep(e.esemenyek);
  const [a, b] = e.gondolatok;

  return k.alkalmazottak.length === 2
    && k.allapot.entitasok.get(a.azonosito).cim === 'ÁTÍRVA'
    && k.allapot.entitasok.get(b.azonosito).szulo === a.azonosito
    // ⭐ ÉS MEGNEVEZI, MELYIK ELEM MIT CSINÁLT — nem egy összevont sor.
    && k.alkalmazottak.some((x) => x.erintett === a.azonosito && x.muvelet === 'Modositas')
    && k.alkalmazottak.some((x) => x.erintett === b.azonosito && x.muvelet === 'Athelyezes');
});

proba('⛔⛔ EGY ELEM ELAKADÁSA NEM DÖNTI EL A TÖBBIT — és megmondja, melyik akadt el', async () => {
  const e = await csomagEset(([a, b]) => [
    { entitas: a.azonosito, muvelet: 'Modositas', valtozas: { cim: 'ÁTÍRVA' } },
    // ⚠️ Ez elakad: nem létező szülő alá helyezné (a másik elemnek ehhez semmi köze).
    { entitas: b.azonosito, muvelet: 'Athelyezes', valtozas: { szulo: 'nincs-ilyen-entitas' } }
  ]);
  const k = kep(e.esemenyek);
  const [a, b] = e.gondolatok;

  return k.alkalmazottak.length === 1
    && k.alkalmazottak[0].erintett === a.azonosito
    && k.allapot.entitasok.get(a.azonosito).cim === 'ÁTÍRVA'
    && k.kihagyottak.length === 1
    && k.kihagyottak[0].erintett === b.azonosito
    && k.kihagyottak[0].muvelet === 'Athelyezes';
});

proba('⭐ A RÉGI ALAK (egyetlen `erintett`) VÁLTOZATLANUL fut — az aláírás nem írható át', async () => {
  // ⚠️ Ez a lap TÖBBI próbája mind a régi alakot használja (`eset()`), tehát a
  // visszafelé-olvasás amúgy is mérve van. Itt azt fogjuk meg, hogy a KETTŐ UGYANAZ:
  // a régi alakból számolt egyezmény ugyanúgy egy elemű listát mutat.
  const e = await eset();
  const k = kep(e.esemenyek);
  const j = k.javaslatok.get(e.javaslat.azonosito);

  return j.erintettek.length === 1
    && j.erintettek[0].entitas === e.gondolat.azonosito
    && j.erintettek[0].muvelet === 'Modositas'
    && j.egyezmeny.erintettek.length === 1
    && k.alkalmazottak[0].erintett === e.gondolat.azonosito;
});

proba('⛔ ISMERETLEN MŰVELET A TÖMB EGYIK ELEMÉN: csak AZ az elem esik ki', async () => {
  // ⭐ A szabály-réteg NEM dobja el a javaslatot (újabb program-változat is lehet) —
  // a végrehajtás mondja meg őszintén, hogy ezt nem tudja.
  const e = await csomagEset(([a, b]) => [
    { entitas: a.azonosito, muvelet: 'Elkobzas', valtozas: { cim: 'x' } },
    { entitas: b.azonosito, muvelet: 'Modositas', valtozas: { cim: 'ÁTÍRVA' } }
  ]);
  const k = kep(e.esemenyek);
  const [, b] = e.gondolatok;

  return k.kihagyottak.length === 1
    && k.kihagyottak[0].ok.includes('ismeretlen művelet')
    && k.alkalmazottak.length === 1
    && k.allapot.entitasok.get(b.azonosito).cim === 'ÁTÍRVA';
});

export default futtatas;
