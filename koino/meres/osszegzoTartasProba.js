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
  const kuldo = sajatKuldo({ tar: v.tarB, koino: KOINO, szerzo: v.b.szerzo, szeletek: async () => [v.g.azonosito] });
  const p = await udpParos();
  try {
    const [a, b] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, v.tarA, KOINO, {
        osszegzesValasz: tarto.valasz, osszegzesMintak: tarto.mintak, kuldoKerem: fogado.kerem }),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, v.tarB, KOINO, {
        reszvesz: (k) => k !== v.g.azonosito,
        osszegzoSzeletek: kerdo.lista, osszegzesMintaKerdesek: kerdo.mintaKerdesek, osszegzesFogadas: kerdo.fogadas,
        kuldoSzeletek: kuldo.lista })
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

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
