// koino/meres/osszegzoTartasProba.js

// Felelősség: bizonyítani, hogy a két fokú vállalás SZEREPEI (`allapot/osszegzoTartas.js`) a valódi cserén (UDP-rés,
// titkosítva) működnek: az összegző tartó a teljes tartótól megkapja és ELLENŐRZI a nagy szelet gyökerét és a lezárt
// döntés összegzését (és ebből ugyanazt a döntést számolja, mint a teljes nézet), a saját új eseménye pedig a csak küldő
// úton eljut a teljes tartóhoz — a szeletet nem egyezteti halmazként. És hogy a hazug teljes tartót elveti.
//
// Futtatás: node koino/meres/mind.js osszegzotartas

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';

import { probaGyujtemeny, ujEember, tagokkal } from './probaFuttato.js';
import { esemenyTarNyitasa, osszegzesTarolo } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { reszfaKarbantarto } from '../js/allapot/osszPont.js';
import { lezarasiOsszegzesEpitese, LEZARASI_OSSZEGZES } from '../js/allapot/lezarasiOsszegzes.js';
import { osszegzoKerdo, teljesTarto, sajatKuldo, kuldoFogado } from '../js/allapot/osszegzoTartas.js';

const { proba, futtatas } = probaGyujtemeny('A két fokú vállalás szerepei a cserében (D95/1, D95/3)');

const KOINO = 'proba';
const T0 = Date.now() - 30 * 24 * 3600 * 1000;
const mappak = [];
const ujMappa = async () => { const m = await mkdtemp(join(tmpdir(), 'koino-ketfok-')); mappak.push(m); return m; };

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar() { egyik.close(); masik.close(); } };
}

/**
 * A világ: egy nagy gondolat 20 pont-tartóval (B az egyik), egy lezárt javaslat a szavazataival; A mindent tart (tagokkal),
 * és kiad egy lezárási összegzést; B csak a gondolat születését és a saját pont-eseményét tartja.
 * `hazug`: A az összegzésben a támogatók számát felfújja (és a fát is, hamis szavazatokkal nem — csak a számot).
 */
async function vilag({ hazug = false } = {}) {
  const emberek = [];
  for (let i = 0; i < 20; i++) emberek.push(await ujEember(KOINO));
  const [szerzo] = emberek;
  const b = emberek[7];
  const g = await szerzo.tesz('GondolatLetrehozas', { cim: 'Nagy', meret: 10 }, T0);
  const nyers = [g];
  const bPont = await b.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 6, szerep: 'aktiv' }, T0 + 20);
  for (let i = 0; i < emberek.length; i++) {
    nyers.push(i === 7 ? bPont : await emberek[i].tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 5 + (i % 4), szerep: 'aktiv' }, T0 + 10 + i));
  }
  const j = await szerzo.tesz('Javaslat', { fajta: 'szerkesztesi', erintett: g.azonosito, muvelet: 'Modositas', valtozas: { cim: 'Nagy2' } }, T0 + 200);
  nyers.push(j);
  const tipusok = ['Tamogat', 'Tamogat', 'Ellenez'];
  for (let i = 0; i < 9; i++) nyers.push(...await emberek[i].szavaz(j, { szavazat: tipusok[i % 3] }, T0 + 300 + i));
  const esemenyek = await tagokkal(nyers);
  const allapot = allapotSzamitasa(esemenyek);
  const szamitok = allapot.szamitok ?? esemenyek;
  const { osszegzes } = await lezarasiOsszegzesEpitese(szamitok, j, g.azonosito);
  const kiado = emberek[3];
  const kiadott = hazug ? { ...osszegzes, szamok: { ...osszegzes.szamok, tamogatok: osszegzes.szamok.tamogatok + 2 } } : osszegzes;
  const lez = await kiado.tesz(LEZARASI_OSSZEGZES, kiadott, undefined, { entitas: j.azonosito });

  const tarA = await esemenyTarNyitasa(KOINO, await ujMappa());
  for (const e of [...esemenyek, lez]) await esemenyMentese(tarA, e);
  const mappaB = await ujMappa();
  const tarB = await esemenyTarNyitasa(KOINO, mappaB);
  for (const e of [g, bPont]) await esemenyMentese(tarB, e);
  return { tarA, tarB, mappaB, g, j, b, emberek, esemenyek, allapot, szamitok, lez };
}

/** A két szerep a valódi cserén — visszaadja a két eredményt és B tárolóját. */
async function csere(v, { bUjEsemeny = null } = {}) {
  const tarolo = osszegzesTarolo(KOINO, v.mappaB);
  if (bUjEsemeny) await esemenyMentese(v.tarB, bUjEsemeny);
  const tarto = teljesTarto({
    teljesE: async (k) => k === v.g.azonosito,
    kep: async () => ({ allapot: v.allapot, szamitok: v.szamitok, bemondasok: new Map() }),
    karbantarto: reszfaKarbantarto(),
    esemenyOlvas: (az) => v.tarA.esemeny(az),
    lezarasiEsemenyek: async (k) => (await v.tarA.bejelentesek(k)).filter((e) => e.tipus === LEZARASI_OSSZEGZES)
  });
  const fogado = kuldoFogado({ tar: v.tarA, fogadhato: async (k) => k === v.g.azonosito });
  const kerdo = osszegzoKerdo({ tarolo, szeletek: async () => [v.g.azonosito], tagE: async () => true,
    esemenyMentes: (e) => esemenyMentese(v.tarB, e) });
  const kuldo = sajatKuldo({ tar: v.tarB, koino: KOINO, szerzo: v.b.szerzo, halmazkent: async (k) => k !== v.g.azonosito });
  const p = await udpParos();
  try {
    const [a, b] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, v.tarA, KOINO, {
        osszegzesValasz: tarto.valasz, osszegzesMintak: tarto.mintak, kuldoKerem: fogado.kerem }),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, v.tarB, KOINO, {
        reszvesz: (k) => k !== v.g.azonosito,
        osszegzoSzeletek: kerdo.lista, osszegzesMintaKerdesek: kerdo.mintaKerdesek, osszegzesFogadas: kerdo.fogadas,
        kuldoSzeletek: (szabad) => kuldo.lista(szabad) })
    ]);
    return { a, b, tarolo: await tarolo.olvas() };
  } finally { p.bezar(); }
}

proba('⭐⭐ az ÖSSZEGZŐ tartó a cserében megkapja és ellenőrzi a nagy szelet gyökerét és a lezárt döntés összegzését — és ugyanazt dönti', async () => {
  const v = await vilag();
  const { b, tarolo } = await csere(v);
  const sz = tarolo.szeletek[v.g.azonosito];
  const l = tarolo.lezarasok[v.j.azonosito + '|' + v.g.azonosito];
  const most = Date.now();
  const teljes = javaslatokSzamitasa(v.szamitok, v.allapot, most).get(v.j.azonosito);
  const bEsemenyek = await (await import('../js/tar/esemenyTar.js')).koinoEsemenyei(v.tarB, KOINO);
  const osszegzesek = new Map(Object.entries(tarolo.lezarasok).map(([k, x]) => [k, { osszegzes: x.osszegzes, allas: x.allas }]));
  const bDontes = javaslatokSzamitasa(bEsemenyek, { entitasok: new Map() }, most, { osszegzesek }).get(v.j.azonosito);
  // ⚠️ Az érzékenység feltétele: az összegzés nélkül B (a saját pont-eseményével) MÁS nevezőt számolna.
  const bNelkule = javaslatokSzamitasa(bEsemenyek, { entitasok: new Map() }, most).get(v.j.azonosito);
  return b.osszegzesEredmeny?.szeletek === 1 && b.osszegzesEredmeny?.lezarasok === 1
    && sz?.osszPont > 0 && l?.allas && bDontes?.statusz === teljes.statusz && bDontes.statusz !== 'nemIsmert'
    && bDontes.reszek[0].nevezo === teljes.reszek[0].nevezo && bNelkule?.reszek[0].nevezo !== teljes.reszek[0].nevezo
    // a nagy szelet idegen pont-eseményei NEM jöttek át (nem egyeztette halmazként)
    && bEsemenyek.filter((e) => e.tipus === 'TudatpontRendezes' && e.adat?.entitas === v.g.azonosito).length === 1;
});

proba('⭐⭐ a SAJÁT új eseménye a csak küldő úton eljut a teljes tartóhoz (a szeletet nem egyezteti)', async () => {
  const v = await vilag();
  const uj = await v.b.tesz('TudatpontRendezes', { entitas: v.g.azonosito, pont: 9, szerep: 'aktiv' }, Date.now());
  const { a } = await csere(v, { bUjEsemeny: uj });
  return (await v.tarA.esemeny(uj.azonosito))?.azonosito === uj.azonosito && a.uj >= 1;
});

proba('⛔⛔ a HAZUG teljes tartó összegzését (felfújt szám) az összegző elveti — nem kerül a tárolójába', async () => {
  const v = await vilag({ hazug: true });
  const { b, tarolo } = await csere(v);
  return b.osszegzesEredmeny?.lezarasok === 0 && b.osszegzesEredmeny.elvetve.some((x) => x.mi === 'lezaras')
    && !tarolo.lezarasok[v.j.azonosito + '|' + v.g.azonosito];
});

// ===================================
// ⭐⭐ D95/3: A CSAK KÜLDŐ RÉSZVÉTEL — a saját eseményeim a nem vállalt szeletekben
// ===================================

/**
 * A meghívás világa: F az alapító, A tag (F hívta meg), és A meghívja B-t és C-t — a meghívás a MEGHÍVOTT szeletébe
 * kerül (és A saját azonosság-szeletébe bejelentődik), amit B nem vállal; A a meghívottak szeletét nem egyezteti
 * halmazként, B a sajátját vállalja. ⚠️ A ne az alapító legyen: az alapító azonosság-szelete maga a koinó születése, amit
 * mindenki egyeztet — az ő meghívásai a bejelentéssel úgyis mindenkihez eljutnak. `regi`: a meghívás 15 napos.
 */
async function meghivasVilaga({ bNalMar = false, regi = false } = {}) {
  const f = await ujEember(KOINO);
  const a = await ujEember(KOINO);
  const b = await ujEember(KOINO);
  const c = await ujEember(KOINO);
  const letrehozas = await f.tesz('KoinoLetrehozas', { nev: 'Küldő', leiras: null, alapitok: [], zart: true });
  const belepesA = await a.tesz('Belepes', {});
  const meghivasA = await f.tesz('Meghivas', { kit: a.szerzo, sajatBelepes: letrehozas.azonosito }, undefined,
    { entitas: belepesA.azonosito });
  const belepesB = await b.tesz('Belepes', {});
  const belepesC = await c.tesz('Belepes', {});
  const ido = regi ? Date.now() - 15 * 24 * 3600 * 1000 : Date.now();
  const meghivasB = await a.tesz('Meghivas', { kit: b.szerzo, sajatBelepes: belepesA.azonosito }, ido, { entitas: belepesB.azonosito });
  const meghivasC = await a.tesz('Meghivas', { kit: c.szerzo, sajatBelepes: belepesA.azonosito }, ido, { entitas: belepesC.azonosito });
  const tarA = await esemenyTarNyitasa(KOINO, await ujMappa());
  for (const e of [letrehozas, belepesA, meghivasA, belepesB, belepesC, meghivasB, meghivasC]) await esemenyMentese(tarA, e);
  // B a koinó születésének szeletét A-val egyezően tudja (F meghívása oda is bejelentődik), és a saját belépését.
  const tarB = await esemenyTarNyitasa(KOINO, await ujMappa());
  for (const e of [letrehozas, meghivasA, belepesB, ...(bNalMar ? [meghivasB] : [])]) await esemenyMentese(tarB, e);
  return { a, b, tarA, tarB, letrehozas, belepesA, belepesB, belepesC, meghivasB, meghivasC };
}

/** A csere: A a koinó születését és a saját azonosság-szeletét egyezteti halmazként (a meghívottakét nem), B a sajátját. */
async function kuldoCsere(v, { kezbesitett = new Set(), zart = false, bMindent = false } = {}) {
  const aVallal = new Set([v.letrehozas.azonosito, v.belepesA.azonosito]);
  const kuldo = sajatKuldo({ tar: v.tarA, koino: KOINO, szerzo: v.a.szerzo,
    halmazkent: async (k) => aVallal.has(k), kezbesitett: async () => kezbesitett });
  const bVallal = new Set([v.letrehozas.azonosito, v.belepesB.azonosito]);
  const fogado = kuldoFogado({ tar: v.tarB, fogadhato: async (k) => bMindent || bVallal.has(k) });
  const p = await udpParos();
  try {
    const [a, b] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, v.tarA, KOINO, {
        reszvesz: (k) => aVallal.has(k),
        kuldoSzeletek: (szabad) => kuldo.lista(szabad),
        // ⛔ zárt koinó: B nem tag — csak a koinó születése és a két azonosság-szelet jár neki (C-é nem).
        ...(zart ? { zartKapu: async () => ({ szabad: false, kell: false, ok: 'próba',
          szeletek: [v.letrehozas.azonosito, v.belepesB.azonosito] }) } : {}) }),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, v.tarB, KOINO, {
        reszvesz: (k) => bVallal.has(k), kuldoKerem: fogado.kerem })
    ]);
    return { a, b, kuldo };
  } finally { p.bezar(); }
}

proba('⭐⭐ D95/3: a MEGHÍVÁS (a meghívott szeletében, amit A nem vállal) a csak küldő úton eljut — és kézbesítettnek számít', async () => {
  const v = await meghivasVilaga();
  const { a } = await kuldoCsere(v);
  return !!(await v.tarB.esemeny(v.meghivasB.azonosito)) && a.kezbesitve.includes(v.meghivasB.azonosito)
    && !a.kezbesitve.includes(v.meghivasC.azonosito);          // C szeletét B nem tartja: nem kérte, nem kézbesült
});

proba('⭐ a KÉZBESÍTETT saját eseményt többé nem ajánlja fel — a „nincs újdonság” csere nem drágul', async () => {
  const v = await meghivasVilaga();
  const sajatSzeletei = new Set([v.letrehozas.azonosito, v.belepesA.azonosito]);
  const elotte = await sajatKuldo({ tar: v.tarA, koino: KOINO, szerzo: v.a.szerzo,
    halmazkent: async (k) => sajatSzeletei.has(k) }).lista();
  const utana = await sajatKuldo({ tar: v.tarA, koino: KOINO, szerzo: v.a.szerzo,
    halmazkent: async (k) => sajatSzeletei.has(k),
    kezbesitett: async () => new Set([v.meghivasB.azonosito, v.meghivasC.azonosito]) }).lista();
  return elotte.length === 2 && utana.length === 0;
});

proba('⭐ ha a tartónál MÁR MEGVAN, azt is visszamondja — kézbesített, és nem küldi el újra', async () => {
  const v = await meghivasVilaga({ bNalMar: true });
  const { a } = await kuldoCsere(v);
  return a.kezbesitve.includes(v.meghivasB.azonosito) && a.kuldott === 0;
});

proba('⭐ a RÉGI (15 napos) saját eseményt nem ajánlja fel — a kérelem útján elérhető marad', async () => {
  const v = await meghivasVilaga({ regi: true });
  const { a } = await kuldoCsere(v);
  return !(await v.tarB.esemeny(v.meghivasB.azonosito)) && a.kezbesitve.length === 0;
});

proba('⛔ zárt koinóban a NEM TAGNAK is felajánlja a saját szeletébe tett meghívást — de más szeletbe tettet nem', async () => {
  const v = await meghivasVilaga();
  const { a } = await kuldoCsere(v, { zart: true, bMindent: true });   // B mindent átvenne, ha felajánlanák
  return a.tarsKorlatozva && !!(await v.tarB.esemeny(v.meghivasB.azonosito)) && !(await v.tarB.esemeny(v.meghivasC.azonosito));
});

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
