// koino/meres/szabalyProba.js — a szabály-réteg önpróbája
//
// Azt bizonyítja, hogy a domain-szabályokat a SZÁMÍTÁS őrzi, nem a felület — mert a másik
// gép felülete semmitől nem véd meg. A próbák KÉZZEL ALÁÍRT eseményekkel dolgoznak,
// vagyis pontosan úgy, ahogy egy rosszindulatú másik gép tenné.

import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { szabalyokErvenyesitese, TUDATPONT_KERET } from '../js/allapot/szabalyok.js';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A szabály-réteg próbája');

const KOINO = 'proba';
const NAP = 86400 * 1000;

// ===== 1. SZABÁLY: A TUDATPONT-KERET =====

proba('A kereten BELÜLI tudatpont rendben van', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 });
  const p = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: TUDATPONT_KERET });

  const a = allapotSzamitasa([t, p]);
  return a.kivetelek.length === 0
      && a.entitasok.get(t.azonosito).osszesPont === TUDATPONT_KERET;
});

proba('⭐ A keretet TÚLLÉPŐ tudatpont nem számít (a felület megkerülésével sem)', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 });
  const p = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 999999 });

  const a = allapotSzamitasa([t, p]);
  // Nincs érvényes pont rajta → az entitás nem is létezik (D14: a közösségi felejtés)
  return a.kivetelek.length === 1
      && a.kivetelek[0].tipus === 'TudatpontRendezes'
      && a.entitasok.has(t.azonosito) === false;
});

proba('A keret a KIOSZTOTT ÖSSZEGRE vonatkozik, nem egy entitásra', async () => {
  const anna = await ujEember();
  const egyik = await anna.tesz('GondolatLetrehozas', { cim: 'Egyik', meret: 10 });
  const masik = await anna.tesz('GondolatLetrehozas', { cim: 'Másik', meret: 10 });
  const p1 = await anna.tesz('TudatpontRendezes', { entitas: egyik.azonosito, pont: 6000 });
  const p2 = await anna.tesz('TudatpontRendezes', { entitas: masik.azonosito, pont: 6000 });

  const a = allapotSzamitasa([egyik, masik, p1, p2]);
  // 6000 + 6000 = 12 000 > 10 000 → a MÁSODIK esik ki, az első áll
  return a.kivetelek.length === 1
      && a.entitasok.get(egyik.azonosito).osszesPont === 6000
      && a.entitasok.has(masik.azonosito) === false;
});

proba('⭐ Az ÁTRENDEZÉS nem ütközik a keretbe (a régi érték felszabadul)', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 });
  const teljes = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 10000 });
  // Ugyanarra az entitásra tesz újra 10 000-et: ez nem 20 000, hanem ugyanaz
  const ujra = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 10000 });

  const a = allapotSzamitasa([t, teljes, ujra]);
  return a.kivetelek.length === 0
      && a.entitasok.get(t.azonosito).osszesPont === 10000;
});

proba('A NEGATÍV és a tört tudatpont sem számít', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 });
  const jo = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 });
  const rossz = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: -50 });

  const a = allapotSzamitasa([t, jo, rossz]);
  return a.kivetelek.length === 1 && a.entitasok.get(t.azonosito).osszesPont === 100;
});

// ===== 2. SZABÁLY: JAVASLATOT CSAK A GAZDA TEHET =====

proba('⭐ AZ IDEGEN KULCS javaslata nem számít — és így nem születik egyezmény sem', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const gazda = await ujEember();
  const idegen = await ujEember();

  const t = await gazda.tesz('GondolatLetrehozas', { cim: 'A más gondolata', meret: 10 }, kezdet);
  const p = await gazda.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 }, kezdet);

  // Az idegennek NINCS tudatpontja rajta — mégis javaslatot tesz és megszavazza magának
  const j = await idegen.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: t.azonosito, muvelet: 'Modositas',
    valtozas: { cim: 'Az én címem' }
  }, kezdet);
  const sz = await idegen.tesz('Szavazat', { javaslat: j.azonosito, szavazat: 'Tamogat' }, kezdet);

  const esemenyek = [t, p, j, sz];
  const a = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(a.szamitok, a, kezdet + 10 * NAP);

  return javaslatok.size === 0                       // a javaslat nem számít
      && a.kivetelek.some((k) => k.tipus === 'Javaslat')
      && a.entitasok.get(t.azonosito).cim === 'A más gondolata';
});

proba('A GAZDA javaslata viszont számít', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const gazda = await ujEember();
  const t = await gazda.tesz('GondolatLetrehozas', { cim: 'A saját gondolatom', meret: 10 }, kezdet);
  const p = await gazda.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 }, kezdet);
  const j = await gazda.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: t.azonosito, muvelet: 'Modositas',
    valtozas: { cim: 'Jobb cím' }
  }, kezdet);

  const a = allapotSzamitasa([t, p, j]);
  const javaslatok = javaslatokSzamitasa(a.szamitok, a, kezdet + 10 * NAP);
  return javaslatok.size === 1 && a.kivetelek.length === 0;
});

proba('⭐ A jogosultság a SAJÁT LÁNCBAN dől el — az utólagos tudatpont nem menti meg', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const gazda = await ujEember();
  const kesolekedo = await ujEember();

  const t = await gazda.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 }, kezdet);
  const p = await gazda.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 }, kezdet);

  // Előbb a javaslat, UTÁNA a tudatpont — a saját láncában ebben a sorrendben
  const j = await kesolekedo.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: t.azonosito, valtozas: { cim: 'Más' }
  }, kezdet);
  const kesoiPont = await kesolekedo.tesz('TudatpontRendezes',
    { entitas: t.azonosito, pont: 50 }, kezdet);

  const a = allapotSzamitasa([t, p, j, kesoiPont]);
  // A javaslat kiesett, a tudatpontja viszont ÉRVÉNYES (nem büntetjük, csak nem számít)
  return a.kivetelek.length === 1
      && a.kivetelek[0].tipus === 'Javaslat'
      && a.entitasok.get(t.azonosito).osszesPont === 150;
});

proba('A pontját ELVEVŐ (0 pontos) sem tehet javaslatot', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const gazda = await ujEember();
  const volt = await ujEember();

  const t = await gazda.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 }, kezdet);
  const p = await gazda.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 }, kezdet);

  const beszall = await volt.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 20 }, kezdet);
  const kiszall = await volt.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 0 }, kezdet);
  const j = await volt.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: t.azonosito, valtozas: { cim: 'Más' }
  }, kezdet);

  const a = allapotSzamitasa([t, p, beszall, kiszall, j]);
  return a.kivetelek.length === 1 && a.kivetelek[0].tipus === 'Javaslat';
});

// ===== ⭐⭐ TÖBB ÉRINTETT: A JOGOSULTSÁG METSZET, NEM UNIÓ (2026-09-07) =====
//
// A prototípus `javaslatJogosultsagService.js`-e szó szerint ezt mondja: *„Ellenőrzi, hogy a
// eember rendelkezik-e tudatponttal MINDEN érintett entitáson."* ⭐ Tehát ÉS, nem VAGY —
// különben egy egyesítési javaslatot be lehetne adni úgy, hogy a másik gondolathoz semmi
// közöd, pedig az is megszűnne tőle.

/** Két gondolat, mindkettőnek MÁS gazdája — és egy javaslat, ami mindkettőt érinti. */
async function ketGazda(kezdet) {
  const gazdaA = await ujEember();
  const gazdaB = await ujEember();
  const a = await gazdaA.tesz('GondolatLetrehozas', { cim: 'A', meret: 10 }, kezdet);
  const pA = await gazdaA.tesz('TudatpontRendezes', { entitas: a.azonosito, pont: 100 }, kezdet);
  const b = await gazdaB.tesz('GondolatLetrehozas', { cim: 'B', meret: 10 }, kezdet);
  const pB = await gazdaB.tesz('TudatpontRendezes', { entitas: b.azonosito, pont: 100 }, kezdet);
  return { gazdaA, gazdaB, a, b, alap: [a, pA, b, pB] };
}

// ⚠️ Egyesítéssel NEM lehet: az nem keverhető más művelettel egy javaslatban (a
// prototípus Csomag-validátora). Egy érvényes vegyes csomag: módosítás + áthelyezés.
const ketErintett = (a, b) => [
  { entitas: a.azonosito, muvelet: 'Modositas', valtozas: { cim: 'X' } },
  { entitas: b.azonosito, muvelet: 'Athelyezes', valtozas: { szulo: null } }
];

proba('⛔⛔ CSAK AZ EGYIKEN VAN PONTOM: a két entitást érintő javaslatom NEM számít', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const { gazdaA, a, b, alap } = await ketGazda(kezdet);

  // A gazdája A-nak — B-hez semmi köze, mégis róla is döntene.
  const j = await gazdaA.tesz('Javaslat',
    { fajta: 'szerkesztesi', erintettek: ketErintett(a, b) }, kezdet);

  const all = allapotSzamitasa([...alap, j]);
  return all.kivetelek.length === 1
      && all.kivetelek[0].tipus === 'Javaslat'
      && all.kivetelek[0].ok.includes('tudatpont');
});

proba('⭐ …ÉS HA MINDKETTŐN VAN, akkor számít — ez különbözteti meg a próbát a vaktól', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const { gazdaA, a, b, alap } = await ketGazda(kezdet);

  // Ugyanaz az eset, EGYETLEN különbséggel: A gazdája B-re is tesz pontot.
  const beszall = await gazdaA.tesz('TudatpontRendezes',
    { entitas: b.azonosito, pont: 30 }, kezdet);
  const j = await gazdaA.tesz('Javaslat',
    { fajta: 'szerkesztesi', erintettek: ketErintett(a, b) }, kezdet);

  const all = allapotSzamitasa([...alap, beszall, j]);
  const javaslatok = javaslatokSzamitasa(all.szamitok, all, kezdet + 10 * NAP);
  return all.kivetelek.length === 0 && javaslatok.size === 1;
});

proba('⛔ ÜRES érintett-lista: nincs miről dönteni', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const { gazdaA, alap } = await ketGazda(kezdet);
  const j = await gazdaA.tesz('Javaslat', { fajta: 'szerkesztesi', erintettek: [] }, kezdet);

  const all = allapotSzamitasa([...alap, j]);
  return all.kivetelek.length === 1 && all.kivetelek[0].ok.includes('nem nevezett meg');
});

proba('⛔ UGYANAZ AZ ENTITÁS KÉTSZER: nem két érintett — a művelet kétszer futna rajta', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const { gazdaA, a, alap } = await ketGazda(kezdet);
  const j = await gazdaA.tesz('Javaslat', {
    fajta: 'szerkesztesi',
    erintettek: [
      { entitas: a.azonosito, muvelet: 'Modositas', valtozas: { cim: 'X' } },
      { entitas: a.azonosito, muvelet: 'Modositas', valtozas: { cim: 'Y' } }
    ]
  }, kezdet);

  const all = allapotSzamitasa([...alap, j]);
  return all.kivetelek.length === 1 && all.kivetelek[0].ok.includes('többször');
});

// ===== ⭐⭐⭐ A TÖREDÉK-MODELL: A DÖNTÉS ÉRINTETTENKÉNT DŐL EL =====
//
// A metszet CSAK a beadásra vonatkozik. Szavazni a prototípusban töredékenként lehet, és
// ott már csak az adott entitásra kérdez rá a jogosultság — *aki a gondolatot tartja, az
// dönt a sorsáról, akkor is, ha a javaslat egy másikat is érint.*

/** A két gazda + egy „mindkettőn bent lévő" javaslattevő, közös küszöbökkel. */
async function csomagEset(kezdet) {
  const { gazdaA, gazdaB, a, b, alap } = await ketGazda(kezdet);
  const jogos = await ujEember();
  const ertekek = { elfogadasiKuszob: 51, reszveteliKuszob: 0,
                    minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 };

  const esemenyek = [...alap];
  esemenyek.push(await jogos.tesz('TudatpontRendezes', { entitas: a.azonosito, pont: 10 }, kezdet));
  esemenyek.push(await jogos.tesz('TudatpontRendezes', { entitas: b.azonosito, pont: 10 }, kezdet));
  // ⭐ MINDKÉT entitásnak SAJÁT küszöbei vannak — a döntés is külön dől el rajtuk.
  esemenyek.push(await jogos.tesz('ErtekJavaslat', { entitas: a.azonosito, ertekek }, kezdet));
  esemenyek.push(await jogos.tesz('ErtekJavaslat', { entitas: b.azonosito, ertekek }, kezdet));

  const j = await jogos.tesz('Javaslat',
    { fajta: 'szerkesztesi', erintettek: ketErintett(a, b) }, kezdet);
  esemenyek.push(j);

  return { gazdaA, gazdaB, jogos, a, b, j, esemenyek, kezdet };
}

const dontes = (e) => {
  const all = allapotSzamitasa(e.esemenyek);
  return javaslatokSzamitasa(all.szamitok, all, e.kezdet + 10 * NAP).get(e.j.azonosito);
};

proba('⭐⭐ AKI CSAK AZ EGYIKEN VAN BENT, CSAK OTT SZAVAZ — a többi rész átugorva', async () => {
  const e = await csomagEset(Date.UTC(2026, 0, 1));

  // Mindhárman támogatnak — de gazdaA csak A-ban, gazdaB csak B-ben számít.
  for (const [ki, mit] of [[e.gazdaA, 'Tamogat'], [e.gazdaB, 'Tamogat'], [e.jogos, 'Tamogat']]) {
    e.esemenyek.push(await ki.tesz('Szavazat', { javaslat: e.j.azonosito, szavazat: mit }, e.kezdet));
  }

  const d = dontes(e);
  const [reszA, reszB] = d.reszek;

  return d.reszek.length === 2
      && reszA.entitas === e.a.azonosito && reszB.entitas === e.b.azonosito
      // ⭐ Részenként KÉT szavazó: a gazda + a javaslattevő. Nem három, és nem egy.
      && reszA.szavazok === 2 && reszB.szavazok === 2
      && reszA.nevezo === 2 && reszB.nevezo === 2
      && d.statusz === 'elfogadva';
});

proba('⛔⛔ EGY RÉSZ ELBUKÁSA AZ EGÉSZ JAVASLATOT ELVETI (ÉS, nem VAGY)', async () => {
  const e = await csomagEset(Date.UTC(2026, 0, 1));

  // A-ban egyöntetű támogatás, B-ben viszont a gazda ellenzi → B megbukik 50%-on.
  e.esemenyek.push(await e.gazdaA.tesz('Szavazat', { javaslat: e.j.azonosito, szavazat: 'Tamogat' }, e.kezdet));
  e.esemenyek.push(await e.jogos.tesz('Szavazat', { javaslat: e.j.azonosito, szavazat: 'Tamogat' }, e.kezdet));
  e.esemenyek.push(await e.gazdaB.tesz('Szavazat', { javaslat: e.j.azonosito, szavazat: 'Ellenez' }, e.kezdet));

  const d = dontes(e);
  const [reszA, reszB] = d.reszek;

  return reszA.kuszobTeljesul === true          // A rendben van…
      && reszB.kuszobTeljesul === false         // …B viszont nem
      && d.kuszobTeljesul === false             // …és ez dönt: az EGÉSZ elbukik
      && d.statusz === 'elvetve'
      && d.egyezmeny === null;
});

proba('⭐ A KÖZÖS LEZÁRÁS a LEGHOSSZABB rész-döntési idő (a csoport egyben dől el)', async () => {
  const e = await csomagEset(Date.UTC(2026, 0, 1));

  // Csak A-ban szavaznak → ott nagy a bizonyosság, tehát RÖVID a döntési idő;
  // B-ben senki, tehát ott a maximum marad. A közös lezárás a hosszabbik.
  e.esemenyek.push(await e.gazdaA.tesz('Szavazat', { javaslat: e.j.azonosito, szavazat: 'Tamogat' }, e.kezdet));
  e.esemenyek.push(await e.jogos.tesz('Szavazat', { javaslat: e.j.azonosito, szavazat: 'Tamogat' }, e.kezdet));

  const d = dontes(e);
  const [reszA, reszB] = d.reszek;

  return reszA.dontesiIdo < reszB.dontesiIdo
      && d.dontesiIdo === reszB.dontesiIdo
      && d.lezarasIdeje === reszB.lezarasIdeje;
});

// ===== ⛔⛔ MELYIK MŰVELET MELYIK TÍPUSON — a prototípus három tiltása =====
//
//   1. „Egyezményre csak áthelyezési vagy törlési javaslat indítható."
//   2. „Kategóriát és gondolattípust nem lehet áthelyezni."
//   3. „Gondolattípust nem lehet egyesíteni — csak törölni vagy módosítani."
//
// ⭐ A koino az entitás SZÁMÍTOTT típusát nézi (a létrehozó eseményéből), nem egy
// bemondott mezőt — ezért ezt a szabályt nem lehet hazudni.

/** Egy entitás adott típussal + a szerző tudatpontja rajta. */
async function entitas(ki, tipus, cim, kezdet) {
  const e = await ki.tesz('GondolatLetrehozas', { cim, tipus, meret: 10 }, kezdet);
  const p = await ki.tesz('TudatpontRendezes', { entitas: e.azonosito, pont: 10 }, kezdet);
  return { e, esemenyek: [e, p] };
}

/** Egy javaslat kivétele (ha van) — a szabály-réteg szerint. */
async function javaslatKivetel(ki, erintettek, alap, kezdet) {
  const j = await ki.tesz('Javaslat', { fajta: 'szerkesztesi', erintettek }, kezdet);
  const all = allapotSzamitasa([...alap, j]);
  return all.kivetelek.find((k) => k.tipus === 'Javaslat') ?? null;
}

proba('⛔ KATEGÓRIÁT NEM LEHET ÁTHELYEZNI', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const ki = await ujEember();
  const k = await entitas(ki, 'Kategoria', 'Egy kategória', kezdet);

  const kivetel = await javaslatKivetel(ki,
    [{ entitas: k.e.azonosito, muvelet: 'Athelyezes', valtozas: { szulo: null } }],
    k.esemenyek, kezdet);

  return kivetel !== null && kivetel.ok.includes('Kategoria');
});

proba('⭐ …DE MÓDOSÍTANI IGEN — a próba nem vak', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const ki = await ujEember();
  const k = await entitas(ki, 'Kategoria', 'Egy kategória', kezdet);

  // ⭐ EGYETLEN különbség: a művelet.
  const kivetel = await javaslatKivetel(ki,
    [{ entitas: k.e.azonosito, muvelet: 'Modositas', valtozas: { cim: 'Új név' } }],
    k.esemenyek, kezdet);

  return kivetel === null;
});

proba('⛔ GONDOLATTÍPUST NEM LEHET EGYESÍTENI (se áthelyezni)', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const ki = await ujEember();
  const t1 = await entitas(ki, 'GondolatTipus', 'Kérdés', kezdet);
  const t2 = await entitas(ki, 'GondolatTipus', 'Válasz', kezdet);
  const alap = [...t1.esemenyek, ...t2.esemenyek];

  const egyesites = await javaslatKivetel(ki, [
    { entitas: t1.e.azonosito, muvelet: 'Egyesites', valtozas: null },
    { entitas: t2.e.azonosito, muvelet: 'Egyesites', valtozas: null }
  ], alap, kezdet);

  const athelyezes = await javaslatKivetel(ki,
    [{ entitas: t1.e.azonosito, muvelet: 'Athelyezes', valtozas: { szulo: null } }],
    alap, kezdet);

  return egyesites !== null && athelyezes !== null;
});

proba('⛔⛔ A SZERKESZTÉSI JAVASLAT/EGYEZMÉNY SZÖVEGÉT NEM LEHET ÁTÍRNI (csak mozgatni)', async () => {
  // A prototípus: „Egyezményre csak áthelyezési vagy törlési javaslat indítható."
  // ⭐ A koinóban a szerkesztési egyezmény UGYANAZ az entitás, mint a szerkesztési
  // javaslat (azonos azonosító, más státusz) — a típusa `Javaslat`. Így a szabály egy
  // fokkal többet is véd: a szavazás alatt álló javaslat szövege sem írható át.
  const kezdet = Date.UTC(2026, 0, 1);
  const ki = await ujEember();
  const g = await entitas(ki, 'Gondolat', 'Alap', kezdet);

  const j = await ki.tesz('Javaslat', {
    fajta: 'szerkesztesi',
    erintettek: [{ entitas: g.e.azonosito, muvelet: 'Modositas', valtozas: { cim: 'Jobb' } }]
  }, kezdet);
  const pontJavaslaton = await ki.tesz('TudatpontRendezes',
    { entitas: j.azonosito, pont: 10 }, kezdet);
  const alap = [...g.esemenyek, j, pontJavaslaton];

  const modositas = await javaslatKivetel(ki,
    [{ entitas: j.azonosito, muvelet: 'Modositas', valtozas: { cim: 'Átírva' } }], alap, kezdet);
  const athelyezes = await javaslatKivetel(ki,
    [{ entitas: j.azonosito, muvelet: 'Athelyezes', valtozas: { szulo: null } }], alap, kezdet);

  return modositas !== null && modositas.ok.includes('Javaslat') && athelyezes === null;
});

proba('⭐⭐ …DE ÁLLÁSPONTOT FEL LEHET VETNI EGY EGYEZMÉNY ALATT (D27/4)', async () => {
  // ⛔⛔ EZ A KÜLÖNBSÉG INDOKOLJA AZ `Allaspont` MŰVELETET (2026-09-10).
  //
  // A típus-tiltás a SZERKESZTÉSRŐL szól: egy egyezmény szövegét nem lehet átírni. Egy
  // ÁLLÁSPONTOT viszont bármi alatt fel lehet vetni — egy egyezmény alatt is (a hatókör a
  // helyből jön, D27/4), és az általánosból amúgy sem következik entitás-változás.
  //
  // ⚠️ Ha az általános javaslatot `Modositas`-ként adnánk be (ahogy először terveztem), ez
  // az eset **kivételre futna**: a koino nem engedné, hogy a közösség állást foglaljon egy
  // már megszületett egyezményről. *A hazug művelet-név nem csak csúnya lett volna — hibás.*
  const kezdet = Date.UTC(2026, 0, 1);
  const ki = await ujEember();
  const g = await entitas(ki, 'Gondolat', 'Alap', kezdet);

  const j = await ki.tesz('Javaslat', {
    fajta: 'szerkesztesi',
    erintettek: [{ entitas: g.e.azonosito, muvelet: 'Modositas', valtozas: { cim: 'Jobb' } }]
  }, kezdet);
  const pontJavaslaton = await ki.tesz('TudatpontRendezes',
    { entitas: j.azonosito, pont: 10 }, kezdet);
  const alap = [...g.esemenyek, j, pontJavaslaton];

  // Egyetlen különbség a fenti bukó esethez képest: a MŰVELET neve.
  const allaspont = await ki.tesz('Javaslat', {
    fajta: 'altalanos',
    erintettek: [{ entitas: j.azonosito, muvelet: 'Allaspont', valtozas: { cim: 'EZT TARTSUK BE' } }]
  }, kezdet);
  const kivetel = allapotSzamitasa([...alap, allaspont])
    .kivetelek.find((k) => k.azonosito === allaspont.azonosito) ?? null;

  return kivetel === null;
});

proba('⛔ EGYESÍTENI CSAK AZONOS TÍPUSÚT lehet', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const ki = await ujEember();
  const g = await entitas(ki, 'Gondolat', 'Egy gondolat', kezdet);
  const k = await entitas(ki, 'Kategoria', 'Egy kategória', kezdet);
  const alap = [...g.esemenyek, ...k.esemenyek];

  const vegyes = await javaslatKivetel(ki, [
    { entitas: g.e.azonosito, muvelet: 'Egyesites', valtozas: null },
    { entitas: k.e.azonosito, muvelet: 'Egyesites', valtozas: null }
  ], alap, kezdet);

  // ⭐ Két gondolat egyesítése viszont rendben van — a próba így nem vak.
  const g2 = await entitas(ki, 'Gondolat', 'Másik gondolat', kezdet);
  const azonos = await javaslatKivetel(ki, [
    { entitas: g.e.azonosito, muvelet: 'Egyesites', valtozas: null },
    { entitas: g2.e.azonosito, muvelet: 'Egyesites', valtozas: null }
  ], [...alap, ...g2.esemenyek], kezdet);

  return vegyes !== null && vegyes.ok.includes('azonos típusú') && azonos === null;
});

proba('⛔ AZ EGYESÍTÉS NEM KEVERHETŐ más művelettel egy javaslatban', async () => {
  // A prototípus Csomag-validátora: „Csomag típusban nem lehet Egyesites művelet,
  // használd az Egyesites típust." Az egyesítés ÚJ entitást szül a régiek helyén.
  const kezdet = Date.UTC(2026, 0, 1);
  const ki = await ujEember();
  const g1 = await entitas(ki, 'Gondolat', 'Egy', kezdet);
  const g2 = await entitas(ki, 'Gondolat', 'Kettő', kezdet);
  const alap = [...g1.esemenyek, ...g2.esemenyek];

  const kivetel = await javaslatKivetel(ki, [
    { entitas: g1.e.azonosito, muvelet: 'Egyesites', valtozas: null },
    { entitas: g2.e.azonosito, muvelet: 'Modositas', valtozas: { cim: 'X' } }
  ], alap, kezdet);

  return kivetel !== null && kivetel.ok.includes('nem keverhető');
});

proba('⚠️ AZ ISMERETLEN TÍPUS NEM VÁD, HANEM JELZÉS (D19)', async () => {
  // A létrehozó eseményt nem ismerjük (még nem érkezett meg) — ilyenkor a típus-tiltásokat
  // nem tudjuk ellenőrizni. ⛔ Ez NEM szabálysértés: különben minden lemaradás annak
  // látszana. A javaslat érvényes marad, de a nem-ellenőrizhetők közt LÁTSZIK.
  const kezdet = Date.UTC(2026, 0, 1);
  const ki = await ujEember();
  const ismeretlen = 'nem-letezo-entitas-azonosito';
  const p = await ki.tesz('TudatpontRendezes', { entitas: ismeretlen, pont: 10 }, kezdet);
  const j = await ki.tesz('Javaslat', {
    fajta: 'szerkesztesi',
    erintettek: [{ entitas: ismeretlen, muvelet: 'Athelyezes', valtozas: { szulo: null } }]
  }, kezdet);

  const all = allapotSzamitasa([p, j]);
  return all.kivetelek.length === 0
      && all.nemEllenorizhetok.some((n) => n.tipus === 'Javaslat' && n.ok.includes('típusa ismeretlen'));
});

// ===== D19: BEJELENT, NEM BÜNTET =====

proba('⭐ A szabálysértő esemény NEM tűnik el — a kivételek felsorolják, indoklással', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 });
  const tul = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 999999 });

  const a = allapotSzamitasa([t, tul]);
  const k = a.kivetelek[0];
  return k.azonosito === tul.azonosito
      && k.szerzo === anna.szerzo
      && typeof k.ok === 'string' && k.ok.length > 0
      && a.esemenyDarab === 2 && a.szamitoDarab === 1;   // a bemenetből semmi nem veszett el
});

proba('A szabálysértés nem viszi magával a szerző TÖBBI eseményét', async () => {
  const anna = await ujEember();
  const egyik = await anna.tesz('GondolatLetrehozas', { cim: 'Egyik', meret: 10 });
  const tul = await anna.tesz('TudatpontRendezes', { entitas: egyik.azonosito, pont: 999999 });
  const jo = await anna.tesz('TudatpontRendezes', { entitas: egyik.azonosito, pont: 100 });

  const a = allapotSzamitasa([egyik, tul, jo]);
  return a.kivetelek.length === 1 && a.entitasok.get(egyik.azonosito).osszesPont === 100;
});

// ===================================
// ⭐⭐ A D42: A BEMONDOTT ÖSSZEG — a hallgatásból ÁTADHATÓ bizonyíték lesz
// ===================================
//
// A PROBLÉMA, AMIT MEGOLD. A keret ellenőrzéséhez eddig egy ember TELJES lánca kellett.
// Anna lánca: #2 (A ← 6000) · #3 (B ← 6000). Aki mind a kettőt ismeri: 12 000 > 10 000 →
// kivétel. Akinél a #2 hiányzik: 6000 → átmegy. ⚠️ Anna nem hamisít semmit — csak ELHALLGAT.
//
// A bemondott összeggel a bizonyíték HIÁNYBÓL ELLENTMONDÁSSÁ válik: ha hazudik a
// bemondásban, akkor két SAJÁT, ALÁÍRT állítása mond ellent egymásnak — és ez már átadható:
// odaadom a két eseményt, bárki ellenőrzi.

proba('⭐ A BEMONDOTT ÖSSZEG EGYETLEN eseményből ellenőrizhető (a lánc többi része nélkül)', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Egyetlen', meret: 10 });
  // Kézzel bemondott, keretet túllépő összeg — a többi eseményét NEM is ismerjük.
  const p = await anna.tesz('TudatpontRendezes',
    { entitas: t.azonosito, pont: 100, kiosztva: TUDATPONT_KERET + 1 });

  // SZÁNDÉKOSAN csak ezt az egy pont-eseményt adjuk oda, lánc nélkül.
  const { kivetelek } = szabalyokErvenyesitese([p]);
  return kivetelek.length === 1 && kivetelek[0].ok.includes('bemondott összeg túllépi');
});

proba('⭐⭐ A HAZUG BEMONDÁS lelepleződik: két saját aláírt esemény ellentmond egymásnak', async () => {
  const anna = await ujEember();
  const a = await anna.tesz('GondolatLetrehozas', { cim: 'A', meret: 10 });
  const b = await anna.tesz('GondolatLetrehozas', { cim: 'B', meret: 10 });
  const p1 = await anna.tesz('TudatpontRendezes', { entitas: a.azonosito, pont: 6000 });
  // Itt hazudik: valójában 12 000-nél tartana, de 6000-et mond be.
  const p2 = await anna.tesz('TudatpontRendezes',
    { entitas: b.azonosito, pont: 6000, kiosztva: 6000 });

  const { kivetelek } = szabalyokErvenyesitese([a, b, p1, p2]);
  return kivetelek.length === 1
      && kivetelek[0].azonosito === p2.azonosito
      && kivetelek[0].ok.includes('ellentmond a saját láncának');
});

proba('⚠️ DE HÉZAG ESETÉN NEM VÁD, HANEM JELZÉS — a lemaradás nem büntetendő', async () => {
  const anna = await ujEember();
  const a = await anna.tesz('GondolatLetrehozas', { cim: 'A', meret: 10 });
  const b = await anna.tesz('GondolatLetrehozas', { cim: 'B', meret: 10 });
  // ⚠️ KERETEN BELÜLI számok kellenek, különben a keret-ellenőrzés tüzel előbb, és nem azt
  // mérnénk, amit akarunk. (Ez a próba első változatának a hibája volt.)
  const p1 = await anna.tesz('TudatpontRendezes', { entitas: a.azonosito, pont: 3000 });
  const p2 = await anna.tesz('TudatpontRendezes',
    { entitas: b.azonosito, pont: 4000, kiosztva: 7000 });

  // A `p1` HIÁNYZIK a halmazból — vagyis hézag van a láncban a `p2` előtt. A mi
  // számításunk 4000-et adna, ő 7000-et mond — és IGAZAT MOND. Az eltérés a MI
  // lemaradásunk, nem az ő hazugsága. Ilyenkor nem kivétel, hanem „nem ellenőrizhető".
  const { kivetelek, nemEllenorizhetok } = szabalyokErvenyesitese([a, b, p2]);
  return kivetelek.length === 0
      && nemEllenorizhetok.length === 1
      && nemEllenorizhetok[0].azonosito === p2.azonosito;
});

proba('A HIÁNYZÓ bemondott összeg is kivétel (nem lehet kihagyni a mezőt)', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Hiányos', meret: 10 });
  const p = await anna.tesz('TudatpontRendezes',
    { entitas: t.azonosito, pont: 100, kiosztva: null });

  const { kivetelek } = szabalyokErvenyesitese([p]);
  return kivetelek.length === 1 && kivetelek[0].ok.includes('bemondott összeg');
});

proba('A HELYES bemondás átmegy, és nem kerül a jelzések közé sem', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Rendes', meret: 10 });
  const p = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 4200 });

  const { kivetelek, nemEllenorizhetok } = szabalyokErvenyesitese([t, p]);
  return kivetelek.length === 0 && nemEllenorizhetok.length === 0
      && p.adat.kiosztva === 4200;
});

// ===== DETERMINIZMUS =====

proba('⭐ A SORREND NEM SZÁMÍT: kevert események, ugyanazok a kivételek', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('GondolatLetrehozas', { cim: 'Alap', meret: 10 });
  const p1 = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 9000 });
  const t2 = await anna.tesz('GondolatLetrehozas', { cim: 'Másik', meret: 10 });
  const p2 = await anna.tesz('TudatpontRendezes', { entitas: t2.azonosito, pont: 9000 });

  const egyenes = szabalyokErvenyesitese([t, p1, t2, p2]);
  const forditva = szabalyokErvenyesitese([p2, t2, p1, t]);

  return JSON.stringify(egyenes.kivetelek) === JSON.stringify(forditva.kivetelek)
      && egyenes.kivetelek.length === 1;
});

export default futtatas;
