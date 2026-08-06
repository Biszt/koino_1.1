// backend/tools/sikidomRacsProba.mjs

// ===== A TÉRBELI RÁCS MÉRŐPRÓBÁJA =====
//
// Felelősség: böngésző nélkül bebizonyítani, hogy a `sikidomRacs.js` gyorsítása
// SEMMIT NEM HAGY KI — vagyis a pakoló ugyanazokat a szomszédokat látja, mintha
// minden alkalommal végigolvasná az összes kört.
//
// MIÉRT EZ A LEGFONTOSABB ELLENŐRZÉS
// A rács egy ALKU: cserébe, hogy nem nézünk meg mindent, hinnünk kell abban, hogy
// amit kihagyunk, az tényleg nem számít. Ha ez a hit téves, a pakoló nem venne
// észre egy szomszédot, és ÁTFEDÉS keletkezne — pont az a hiba, amit az íves
// módszer megszüntetett. Ezért itt a rács eredményét NYERS ERŐVEL (mindent
// végigolvasva) ellenőrizzük, sokféle méret-eloszláson.
//
// A rács TÖBBET is visszaadhat a szükségesnél (a közeli, de mégsem zavaró
// köröket a `tiltottIv` szűri ki) — ez rendben van. Amit NEM tehet: kihagyni.
//
// Futtatás:  node backend/tools/sikidomRacsProba.mjs

// --- IMPORTÁLÁSOK ---
import { SikidomRacs } from '../../frontend/js/utils/sikidomRacs.js';
import { pakolas } from '../../frontend/js/utils/sikidomPakolas.js';

// A pakoló képkockánként naplóz — itt elnyomjuk
console.log = () => {};
const naplo = (...ertekek) => process.stdout.write(ertekek.join(' ') + '\n');

const hibak = [];
function allitas(rendben, cimke, reszlet = '') {
  naplo(`${rendben ? '  OK  ' : ' HIBA '} ${cimke}${reszlet ? ' — ' + reszlet : ''}`);
  if (!rendben) hibak.push(cimke);
}

// ===== DETERMINISZTIKUS ÁL-VÉLETLEN =====
// Nincs Math.random: a próbának mindig ugyanazt kell mérnie.
function veletlen(mag) {
  let a = mag >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}

// ===== TESZT-KÖRHALMAZOK =====
// Négyféle méret-eloszlás, a valósághűtől a szélsőségesig.
function korhalmaz(fajta, darab, mag) {
  const r = veletlen(mag);
  const korok = [];

  for (let i = 1; i <= darab; i++) {
    let sugar;
    if (fajta === 'egyenletes')      sugar = 0.01;
    else if (fajta === 'valosaghu')  sugar = 0.02 / Math.pow(i, 0.6);
    else if (fajta === 'ketpupu')    sugar = (i % 7 === 0) ? 0.05 : 0.0002;   // 250× ugrás
    else                             sugar = 0.0001 * Math.pow(1.0035, i);    // mértani, 1400×

    korok.push({
      id: `k${i}`,
      x: (r() - 0.5) * 2,
      y: (r() - 0.5) * 2,
      sugar
    });
  }
  return korok;
}

// ===== 1. TELJESSÉG: A RÁCS SOHA NEM HAGY KI KÖRT =====
// A rács eredményét összevetjük a nyers erővel: minden olyan körnek, ami a
// `távolság < hatoTav + sajátSugár` feltételt teljesíti, benne KELL lennie.
function teljessegEllenorzes() {
  const fajtak = ['egyenletes', 'valosaghu', 'ketpupu', 'mertani'];
  let osszLekerdezes = 0;
  let osszKihagyott = 0;
  let osszKellene = 0;
  let legrosszabbEset = '';

  // Eloszlásonként külön feljegyezzük, hány jelöltet ad a rács a legnagyobb
  // halmazon. Ez TÁJÉKOZTATÓ szám, nem bukó ellenőrzés — lásd az alábbi
  // magyarázatot arról, miért a legrosszabb eset ez a szétszórt körhalmaz.
  const NAGY_DARAB = 2000;
  const bontas = new Map();

  for (const fajta of fajtak) {
    for (const darab of [50, 500, NAGY_DARAB]) {
      const korok = korhalmaz(fajta, darab, 7 + darab);
      const racs = new SikidomRacs();
      for (const k of korok) racs.hozzaad(k);

      const r = veletlen(999);
      for (let proba = 0; proba < 200; proba++) {
        const x = (r() - 0.5) * 2.4;
        const y = (r() - 0.5) * 2.4;
        const hatoTav = r() * 0.3;          // a pakolóban ez r₁ + r

        const kapott = new Set(racs.kozeliek(x, y, hatoTav));

        // NYERS ERŐ: kinek KELLENE szerepelnie?
        let kellene = 0;
        let kihagyott = 0;
        for (const k of korok) {
          const D = Math.hypot(k.x - x, k.y - y);
          if (D < hatoTav + k.sugar) {
            kellene++;
            if (!kapott.has(k)) {
              kihagyott++;
              if (!legrosszabbEset) legrosszabbEset = `${fajta}/${darab}: ${k.id}`;
            }
          }
        }

        osszLekerdezes++;
        osszKihagyott += kihagyott;
        osszKellene += kellene;

        if (darab === NAGY_DARAB) {
          const b = bontas.get(fajta) ?? { talalat: 0, lekerdezes: 0 };
          b.talalat += kapott.size;
          b.lekerdezes++;
          bontas.set(fajta, b);
        }
      }
    }
  }

  allitas(osszKihagyott === 0, 'A rács egyetlen közeli kört sem hagy ki',
    osszKihagyott === 0
      ? `${osszLekerdezes.toLocaleString('hu')} lekérdezés, ${osszKellene.toLocaleString('hu')} valódi találat`
      : `${osszKihagyott} kimaradt (${legrosszabbEset})`);

  // --- TÁJÉKOZTATÓ: A LEGROSSZABB ESET ---
  // Ez a próba VÉLETLEN hatótávot kérdez (0-tól 0,3-ig), ami FÜGGETLEN a körök
  // méretétől — szándékosan, mert a teljességet így lehet a legkeményebben
  // próbára tenni. De épp ezért a jelöltszám itt a legrosszabb eset:
  //
  //   ha a hatótáv sokkal nagyobb, mint az apró körök cellája, akkor azon a
  //   szinten több cellát kellene bejárni, mint ahány kör egyáltalán van rajta —
  //   ilyenkor bekapcsol a BIZTONSÁGI FÉK, és a szint listáját olvassuk végig.
  //
  // A pakoló SOSEM kérdez így: nála a hatótáv `r₁ + r`, vagyis a most lerakandó
  // kör méretével arányos — az apró körök szintjén tehát apró a kérdés is. Ezt
  // méri a következő, valósághű lokalitás-ellenőrzés (ott 0,3% a jelöltarány).
  //
  // A fék bekapcsolása nem hiba: azt jelenti, hogy azon a szinten a rács nem tud
  // segíteni — de ilyenkor sem vagyunk lassabbak a régi, mindent végigolvasó
  // megoldásnál.
  naplo('');
  naplo(`--- TÁJÉKOZTATÓ: jelöltek ${NAGY_DARAB} SZÉTSZÓRT körnél (a rács legrosszabb esete) ---`);
  for (const [fajta, b] of bontas) {
    const atlag = b.talalat / b.lekerdezes;
    naplo(`   ${fajta.padEnd(12)} ${atlag.toFixed(1).padStart(7)} jelölt = ` +
          `az összes ${(100 * atlag / NAGY_DARAB).toFixed(1)}%-a`);
  }
}

// ===== 2. LOKALITÁS: A JELÖLTEK SZÁMA NEM NŐ A DARABSZÁMMAL =====
// EZ A LINEARITÁS LÉNYEGE. Ha egy lerakásnál átlagosan ugyanannyi jelöltet kell
// megnézni 500 és 32 000 kör mellett is, akkor a pakolás összmunkája a
// darabszámmal ARÁNYOSAN nő — nem a négyzetével.
//
// Valósághű helyzetet mérünk: a köröket a VALÓDI pakolóval rakjuk le, aztán
// ugyanolyan lekérdezéseket adunk a rácsnak, amilyeneket a pakoló ad.
function lokalitasEllenorzes() {
  naplo('');
  naplo('--- LOKALITÁS (lerakott körök vs. megnézendő jelöltek) ---');
  naplo('   darab   átlagos jelölt   fék bekapcsolt   megnézett arány');

  const meresek = [];

  for (const darab of [500, 2000, 8000, 32000]) {
    // A sugarak a Zipf-eloszlású tudatpontból: sugár ∝ √pont, pont ∝ 1/i^1.2
    const sulyok = [];
    let ossz = 0;
    for (let i = 1; i <= darab; i++) { const s = 1 / Math.pow(i, 1.2); sulyok.push(s); ossz += s; }
    const elemek = sulyok.map((s, i) => ({
      id: `e${i}`,
      sugar: Math.sqrt((s / ossz) * (Math.PI / 20) / Math.PI)
    }));

    const eredmeny = pakolas(elemek, { magSugar: 0.02 });

    // A lerakott képre ráépítjük a rácsot, és a pakoló tipikus kérdését tesszük fel
    const racs = new SikidomRacs();
    for (const h of eredmeny.helyek) racs.hozzaad(h);

    const r = veletlen(4242);
    const probaDarab = 500;
    for (let i = 0; i < probaDarab; i++) {
      const horgony = eredmeny.helyek[Math.floor(r() * eredmeny.helyek.length)];
      const uj = eredmeny.helyek[Math.floor(r() * eredmeny.helyek.length)].sugar;
      const r1 = horgony.sugar + uj;
      racs.kozeliek(horgony.x, horgony.y, r1 + uj);
    }

    const atlag = racs.statisztika.talalat / racs.statisztika.lekerdezes;
    const arany = atlag / eredmeny.helyek.length;
    meresek.push({ darab, atlag });

    naplo(
      String(darab).padStart(8) +
      String(atlag.toFixed(1)).padStart(17) +
      String(racs.statisztika.fek).padStart(17) +
      String((arany * 100).toFixed(2) + '%').padStart(18)
    );
  }

  naplo('');

  // A jelöltszám nőhet kicsit (mélyebb nagyításnál több méret-szint van), de nem
  // arányosan a darabszámmal: 64-szeres darabszámnál legfeljebb 4-szeres jelölt.
  const elso = meresek[0];
  const utolso = meresek[meresek.length - 1];
  const darabSzorzo = utolso.darab / elso.darab;

  allitas(utolso.atlag <= elso.atlag * 4, 'A megnézendő jelöltek száma KORLÁTOS',
    `${darabSzorzo}× darabszámnál ${(utolso.atlag / elso.atlag).toFixed(2)}× jelölt ` +
    `(${elso.atlag.toFixed(1)} → ${utolso.atlag.toFixed(1)})`);

  // A LÉNYEG: a legnagyobb halmaznál a jelöltek az összesnek csak töredéke.
  // Ez az, amitől a pakolás összmunkája a darabszámmal ARÁNYOSAN nő.
  const resz = utolso.atlag / utolso.darab;
  allitas(resz < 0.05, 'A rács érdemben szűkít a valósághű képen',
    `${utolso.darab} körnél ${utolso.atlag.toFixed(1)} jelölt = ` +
    `az összes ${(resz * 100).toFixed(2)}%-a`);
}

// ===== 3. DETERMINIZMUS =====
// Ugyanaz a rács, ugyanaz a kérdés → ugyanaz a válasz, ugyanabban a SORRENDBEN.
// (A pakoló képének bitre azonosnak kell lennie futásról futásra.)
function determinizmusEllenorzes() {
  const korok = korhalmaz('valosaghu', 800, 31);

  const ujjlenyomat = () => {
    const racs = new SikidomRacs();
    for (const k of korok) racs.hozzaad(k);
    const r = veletlen(55);
    const sorok = [];
    for (let i = 0; i < 100; i++) {
      const x = (r() - 0.5) * 2, y = (r() - 0.5) * 2, h = r() * 0.2;
      sorok.push(racs.kozeliek(x, y, h).map(k => k.id).join(','));
    }
    return sorok.join('|');
  };

  allitas(ujjlenyomat() === ujjlenyomat(), 'Determinizmus (kétszer futtatva azonos)');
}

// ===== FUTTATÁS =====
naplo('');
naplo('===== A TÉRBELI RÁCS MÉRŐPRÓBÁJA =====');
naplo('');
naplo('--- ELLENŐRZÉSEK ---');
teljessegEllenorzes();
determinizmusEllenorzes();
lokalitasEllenorzes();
naplo('');
naplo(hibak.length === 0
  ? '===== MINDEN ELLENŐRZÉS RENDBEN ====='
  : `===== ${hibak.length} ELLENŐRZÉS MEGBUKOTT =====`);
naplo('');

process.exit(hibak.length === 0 ? 0 : 1);
