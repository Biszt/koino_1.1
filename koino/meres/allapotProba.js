// koino/meres/allapotProba.js — az állapot-réteg önpróbája (Szakasz 1 / 5. lépés)
//
// A legfontosabb állítás, amit bizonyít: az események SORRENDJE nem számít — ugyanabból a
// halmazból mindig ugyanaz az állapot jön ki (D17). Enélkül két gép soha nem értene egyet.

import { allapotSzamitasa, median, szetosztottPontok } from '../js/allapot/allapotSzamitas.js';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('Az állapotszámítás próbája');

const KOINO = 'proba';

// ===== ALAPESET =====

proba('Üres eseményhalmazból üres állapot', async () => {
  const a = allapotSzamitasa([]);
  return a.entitasok.size === 0;
});

proba('Gondolat + tudatpont → az entitás LÉTEZIK', async () => {
  const anna = await ujEember();
  const gondolat = await anna.tesz('GondolatLetrehozas', { cim: 'Első gondolat', meret: 120 });
  const pont = await anna.tesz('TudatpontRendezes', { entitas: gondolat.azonosito, pont: 500 });

  const a = allapotSzamitasa([gondolat, pont]);
  const e = a.entitasok.get(gondolat.azonosito);
  return e?.cim === 'Első gondolat' && e.osszesPont === 500 && e.meret === 120;
});

proba('Tudatpont NÉLKÜL az entitás nem létezik (közösségi felejtés)', async () => {
  const anna = await ujEember();
  const gondolat = await anna.tesz('GondolatLetrehozas', { cim: 'Senkinek nem kell', meret: 50 });

  const a = allapotSzamitasa([gondolat]);
  return a.entitasok.size === 0 && a.elfelejtettek.length === 1;
});

proba('A pont ELVÉTELE (0) után az entitás eltűnik', async () => {
  const anna = await ujEember();
  const gondolat = await anna.tesz('GondolatLetrehozas', { cim: 'Meggondoltam', meret: 50 });
  const ad = await anna.tesz('TudatpontRendezes', { entitas: gondolat.azonosito, pont: 300 });
  const elvesz = await anna.tesz('TudatpontRendezes', { entitas: gondolat.azonosito, pont: 0 });

  const a = allapotSzamitasa([gondolat, ad, elvesz]);
  return a.entitasok.size === 0;
});

// ===== „AZ UTOLSÓ NYER" =====

proba('Két pont-rendezésből az UTOLSÓ számít', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Átrendezés', meret: 10 });
  const elso = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 });
  const masodik = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 900 });

  const a = allapotSzamitasa([t, elso, masodik]);
  return a.entitasok.get(t.azonosito).osszesPont === 900;
});

// ===== ⭐ A LEGFONTOSABB: A SORREND NEM SZÁMÍT =====

proba('⭐ A SORREND NEM SZÁMÍT — kevert események, azonos állapot', async () => {
  const anna = await ujEember();
  const bela = await ujEember();

  const t1 = await anna.tesz('GondolatLetrehozas', { cim: 'Egyik', meret: 100 });
  const p1 = await anna.tesz('TudatpontRendezes', { entitas: t1.azonosito, pont: 200 });
  const t2 = await bela.tesz('GondolatLetrehozas', { cim: 'Másik', meret: 300 });
  const p2 = await bela.tesz('TudatpontRendezes', { entitas: t2.azonosito, pont: 400 });
  const p3 = await bela.tesz('TudatpontRendezes', { entitas: t1.azonosito, pont: 50 });
  const p4 = await anna.tesz('TudatpontRendezes', { entitas: t1.azonosito, pont: 700 });

  const sorrendA = [t1, p1, t2, p2, p3, p4];
  const sorrendB = [p4, p3, p2, t2, p1, t1];        // fordítva
  const sorrendC = [p2, t1, p4, t2, p1, p3];        // összevissza

  const jellemzo = (a) => JSON.stringify(
    [...a.entitasok.values()]
      .map((e) => [e.azonosito, e.cim, e.osszesPont, [...e.hozzajarulok.entries()].sort()])
      .sort()
  );

  const x = jellemzo(allapotSzamitasa(sorrendA));
  const y = jellemzo(allapotSzamitasa(sorrendB));
  const z = jellemzo(allapotSzamitasa(sorrendC));

  // Az „utolsó nyer" miatt Anna 700-a felülírja a 200-at, Béla 50-e hozzáadódik
  const helyes = allapotSzamitasa(sorrendA).entitasok.get(t1.azonosito).osszesPont === 750;
  return x === y && y === z && helyes;
});

proba('Kétszer számolva ugyanaz jön ki (determinizmus)', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Kétszer', meret: 1 });
  const p = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 5 });
  const jellemzo = (a) => JSON.stringify([...a.entitasok.values()].map((e) => [e.cim, e.osszesPont]));
  return jellemzo(allapotSzamitasa([t, p])) === jellemzo(allapotSzamitasa([t, p]));
});

// ===== KÜSZÖBÖK: A TULAJDONOSOK MEDIÁNJA (D4) =====

proba('A medián a középső értéket adja (nem átlagol)', async () => {
  return median([51, 60, 90]) === 60 && median([51, 90]) === 51 && median([]) === null;
});

proba('A küszöb a TULAJDONOSOK érték javaslatainak mediánja', async () => {
  const anna = await ujEember();
  const bela = await ujEember();
  const cecil = await ujEember();

  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Küszöbös', meret: 10 });
  const pA = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 10 });
  const pB = await bela.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 10 });
  const pC = await cecil.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 10 });

  const eA = await anna.tesz('ErtekJavaslat', { entitas: t.azonosito, ertekek: { elfogadasiKuszob: 51, reszveteliKuszob: 10, minimumDontesiIdo: 3600, maximumDontesiIdo: 86400 } });
  const eB = await bela.tesz('ErtekJavaslat', { entitas: t.azonosito, ertekek: { elfogadasiKuszob: 66, reszveteliKuszob: 20, minimumDontesiIdo: 7200, maximumDontesiIdo: 86400 } });
  const eC = await cecil.tesz('ErtekJavaslat', { entitas: t.azonosito, ertekek: { elfogadasiKuszob: 90, reszveteliKuszob: 30, minimumDontesiIdo: 9000, maximumDontesiIdo: 86400 } });

  const a = allapotSzamitasa([t, pA, pB, pC, eA, eB, eC]);
  const k = a.entitasok.get(t.azonosito).kuszobok;
  return k.elfogadasiKuszob === 66 && k.reszveteliKuszob === 20 && k.minimumDontesiIdo === 7200;
});

proba('AKINEK NINCS PONTJA, annak az érték javaslata nem számít', async () => {
  const anna = await ujEember();
  const kivulallo = await ujEember();

  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Védett', meret: 10 });
  const pA = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 10 });
  const eA = await anna.tesz('ErtekJavaslat', { entitas: t.azonosito, ertekek: { elfogadasiKuszob: 51 } });
  // A kívülálló szélsőséges értéket javasol, de nincs tudatpontja az entitáson
  const eK = await kivulallo.tesz('ErtekJavaslat', { entitas: t.azonosito, ertekek: { elfogadasiKuszob: 100 } });

  const a = allapotSzamitasa([t, pA, eA, eK]);
  const e = a.entitasok.get(t.azonosito);
  return e.kuszobok.elfogadasiKuszob === 51 && e.kuszobErtekelokSzama === 1;
});

// ===== ELÁGAZÁS =====

proba('Az elágazás feloldása DETERMINISZTIKUS (mindkét sorrendben ugyanaz)', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 });
  const egyik = await anna.elagaztat('TudatpontRendezes', { entitas: t.azonosito, pont: 100 });
  const masik = await anna.elagaztat('TudatpontRendezes', { entitas: t.azonosito, pont: 900 });

  const a1 = allapotSzamitasa([t, egyik, masik]);
  const a2 = allapotSzamitasa([t, masik, egyik]);

  const p1 = a1.entitasok.get(t.azonosito)?.osszesPont;
  const p2 = a2.entitasok.get(t.azonosito)?.osszesPont;
  return p1 === p2 && a1.ellentmondasok.length === 1 && a2.ellentmondasok.length === 1;
});

// ===== IDŐ-MONOTONITÁS A SAJÁT LÁNCBAN (Csaba jóváhagyása, 2026-08-28) =====

proba('A VISSZAFELÉ lépő idő ellentmondásként jelenik meg — de az esemény megmarad', async () => {
  const kezdet = Date.UTC(2026, 0, 10);
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 }, kezdet);
  const p = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 }, kezdet + 60000);
  // A 3. eseménye KORÁBBI időt visel, mint a 2. — visszadátumozás
  const vissza = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 200 }, kezdet - 86400000);

  const a = allapotSzamitasa([t, p, vissza]);
  return a.idoEllentmondasok.length === 1
      && a.idoEllentmondasok[0].sorszam === 3
      && a.entitasok.get(t.azonosito).osszesPont === 200;   // az esemény ÉRVÉNYES marad
});

proba('A rendes (előre haladó) idő nem ad ellentmondást', async () => {
  const kezdet = Date.UTC(2026, 0, 10);
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 }, kezdet);
  const p = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 }, kezdet + 1000);

  return allapotSzamitasa([t, p]).idoEllentmondasok.length === 0;
});

// ===== D26: MÉRET ÉS ÁG-MÉRET =====

proba('Az ág mérete a leszármazottakkal együtt számítódik (D26)', async () => {
  const anna = await ujEember();
  const szulo = await anna.tesz('GondolatLetrehozas', { cim: 'Szülő', meret: 100 });
  const pSz = await anna.tesz('TudatpontRendezes', { entitas: szulo.azonosito, pont: 10 });
  const gyerek = await anna.tesz('GondolatLetrehozas', { cim: 'Gyerek', meret: 250, szulo: szulo.azonosito });
  const pGy = await anna.tesz('TudatpontRendezes', { entitas: gyerek.azonosito, pont: 10 });

  const a = allapotSzamitasa([szulo, pSz, gyerek, pGy]);
  const sz = a.entitasok.get(szulo.azonosito);
  // A SAJÁT mérete 100 (csak ezt vállalja, aki rá tett pontot), az ÁG mérete 350
  return sz.meret === 100 && sz.agMeret === 350;
});

// ===== A TUDATPONT-KERET =====

proba('A szétosztott pontok összege lekérdezhető', async () => {
  const anna = await ujEember();
  const t1 = await anna.tesz('GondolatLetrehozas', { cim: 'A', meret: 1 });
  const p1 = await anna.tesz('TudatpontRendezes', { entitas: t1.azonosito, pont: 300 });
  const t2 = await anna.tesz('GondolatLetrehozas', { cim: 'B', meret: 1 });
  const p2 = await anna.tesz('TudatpontRendezes', { entitas: t2.azonosito, pont: 700 });

  const a = allapotSzamitasa([t1, p1, t2, p2]);
  return szetosztottPontok(a, anna.szerzo) === 1000;
});

// ===== JÖVŐÁLLÓSÁG =====

proba('Az ISMERETLEN esemény-típus nem töri el a számítást', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Ismert', meret: 10 });
  const p = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 10 });
  const jovobeli = await anna.tesz('ValamiUjTipus2030', { barmi: 'amit ma még nem ismerünk' });

  const a = allapotSzamitasa([t, p, jovobeli]);
  return a.entitasok.size === 1;
});

export default futtatas;
