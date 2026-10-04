// koino/meres/lezarasiOsszegzesProba.js

// Felelősség: bizonyítani, hogy a LEZÁRÁSI ÖSSZEGZÉS (D95/1, `allapot/lezarasiOsszegzes.js`) ugyanazt a döntést adja, mint
// a teljes, időrendi számítás — és hogy a szúrópróba a becsületest elfogadja, a hazugot elveti (a hamis szám, a hamis
// szavazat, a hazug medián), a kihagyott szavazat pedig bizonyíthatóan kiderül.
//
// Futtatás: node koino/meres/mind.js lezarasiosszegzes

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import {
  lezarasiOsszegzesEpitese, lezarasiSzamokEllenorzese, lezarasiMintaHelyek, lezarasiMintakValasza,
  lezarasiOsszegzesEllenorzese, kimaradtSzavazat, szavazatFaBizonyitek, SZAVAZAT_FA
} from '../js/allapot/lezarasiOsszegzes.js';
import { allapotBeallitas, allapotGyokere } from '../js/esemeny/osszegzoFa.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { koinoEsemenyei } from '../js/tar/esemenyTar.js';
import {
  koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese, ertekJavaslat, javaslatLetrehozasa, szavazas
} from '../js/muveletek.js';

const { proba, futtatas } = probaGyujtemeny('A lezárási összegzés próbája (D95/1)');

const T0 = Date.now() - 30 * 24 * 3600 * 1000;      // a döntés rég lezárult

/**
 * Egy gondolat sok tulajdonossal (néhány passzív), érték javaslatokkal és egy javaslattal; `szavazo` szavaz rá.
 * @returns {Promise<{esemenyek: Array, g: Object, j: Object, emberek: Array, olvas: Function}>}
 */
async function vilag({ tulajdonos = 30, szavazo = 12, ertek = 9 } = {}) {
  const emberek = [];
  const szerzo = await ujEember();
  emberek.push(szerzo);
  const g = await szerzo.tesz('GondolatLetrehozas', { cim: 'Nagy gondolat', meret: 10 }, T0);
  const esemenyek = [g, await szerzo.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 10, szerep: 'aktiv' }, T0 + 1)];
  for (let i = 1; i < tulajdonos; i++) {
    const e = await ujEember();
    emberek.push(e);
    esemenyek.push(await e.tesz('TudatpontRendezes',
      { entitas: g.azonosito, pont: 5 + (i % 7), szerep: i % 5 === 0 ? 'passziv' : 'aktiv' }, T0 + 10 + i));
  }
  for (let i = 0; i < ertek; i++) {
    esemenyek.push(await emberek[i].tesz('ErtekJavaslat', { entitas: g.azonosito,
      ertekek: { elfogadasiKuszob: 40 + i * 3, reszveteliKuszob: i, minimumDontesiIdo: 1, maximumDontesiIdo: 3600 + i * 60 } },
    T0 + 100 + i));
  }
  const j = await szerzo.tesz('Javaslat', { fajta: 'szerkesztesi', erintett: g.azonosito, muvelet: 'Modositas',
    valtozas: { cim: 'Új cím' } }, T0 + 200);
  esemenyek.push(j);
  const tipusok = ['Tamogat', 'Tamogat', 'Ellenez', 'Tartozkodik'];
  for (let i = 0; i < szavazo; i++) {
    esemenyek.push(...await emberek[i].szavaz(j, { szavazat: tipusok[i % tipusok.length] }, T0 + 300 + i));
  }
  const terkep = new Map(esemenyek.map((e) => [e.azonosito, e]));
  return { esemenyek, g, j, emberek, olvas: async (az) => terkep.get(az) ?? null };
}

const mindenkiTag = async () => true;

proba('⭐⭐ a lezárási összegzés UGYANAZT a döntést adja, mint a teljes, időrendi számítás', async () => {
  const { esemenyek, g, j } = await vilag();
  const { osszegzes } = await lezarasiOsszegzesEpitese(esemenyek, j, g.azonosito);
  const szamok = lezarasiSzamokEllenorzese(osszegzes, j);
  const teljes = javaslatokSzamitasa(esemenyek, { entitasok: new Map() }).get(j.azonosito);
  const resz = teljes.reszek[0];
  return szamok.rendben === true
    && szamok.allas.tamogatok === resz.tamogatok && szamok.allas.ellenzok === resz.ellenzok
    && szamok.allas.nevezo === resz.nevezo && szamok.allas.kuszobTeljesul === resz.kuszobTeljesul
    && szamok.allas.lezarasIdeje === resz.lezarasIdeje && osszegzes.lezaras === teljes.lezarasIdeje
    && JSON.stringify(osszegzes.kuszobok) === JSON.stringify(resz.kuszobok);
});

proba('⭐⭐ a szúrópróba a BECSÜLETES összegzést elfogadja — és az állás ugyanaz', async () => {
  const { esemenyek, g, j, olvas } = await vilag();
  const { osszegzes, epito } = await lezarasiOsszegzesEpitese(esemenyek, j, g.azonosito);
  const helyek = lezarasiMintaHelyek(osszegzes);
  const mintak = await lezarasiMintakValasza(epito, helyek, olvas);
  const e = await lezarasiOsszegzesEllenorzese({ osszegzes, javaslatEsemeny: j, helyek, mintak, tagE: mindenkiTag });
  return e.rendben === true && e.ellenorzott > 0 && e.allas.tamogatok === osszegzes.szamok.tamogatok;
});

proba('⛔⛔ a HAMIS SZÁM elbukik — a gyökér mást számol (a minták előtt)', async () => {
  const { esemenyek, g, j } = await vilag();
  const { osszegzes } = await lezarasiOsszegzesEpitese(esemenyek, j, g.azonosito);
  const hamis = { ...osszegzes, szamok: { ...osszegzes.szamok, tamogatok: osszegzes.szamok.tamogatok + 3 } };
  const e = lezarasiSzamokEllenorzese(hamis, j);
  return e.rendben === false && /szavazat-fa/.test(e.ok) && lezarasiSzamokEllenorzese(osszegzes, j).rendben === true;
});

proba('⛔⛔ a HAMIS SZAVAZATOKKAL felfújt fa elbukik — a minták nem tagok szavazataira esnek', async () => {
  const { esemenyek, g, j, olvas } = await vilag();
  const { osszegzes, epito } = await lezarasiOsszegzesEpitese(esemenyek, j, g.azonosito);
  // A csaló teljes tartó 30 hamis (kulcs-gyűrű) támogató szavazatot tesz a fába, és újraszámolja a számokat és a határidőt.
  const gyuru = new Set();
  const hamisak = new Map();
  for (let i = 0; i < 30; i++) {
    const h = await ujEember();
    gyuru.add(h.szerzo);
    const v = await h.tesz('Szavazat', { javaslat: j.azonosito, szavazat: 'Tamogat' }, T0 + 400 + i);
    hamisak.set(v.azonosito, v);
    epito.pillanatkep.szavazatok.push({ szerzo: h.szerzo, szavazat: 'Tamogat', azonosito: v.azonosito });
    await allapotBeallitas(epito.szavazatFa, 'v:' + h.szerzo, v.azonosito, [1, 0, 0]);
  }
  const gyoker = await allapotGyokere(epito.szavazatFa);
  const hamis = { ...osszegzes, szamok: { ...osszegzes.szamok, tamogatok: gyoker.o[0], nevezo: osszegzes.szamok.nevezo + 30 },
    fak: { ...osszegzes.fak, szavazat: gyoker } };
  // a nevező-fát is felfújja (a gyűrű a nevezőbe is kerül), hogy a számok egymással egyezzenek
  for (const [az, v] of hamisak) await allapotBeallitas(epito.nevezoFa, 'n:' + v.szerzo, { e: az, t: 0 }, [1]);
  hamis.fak.nevezo = await allapotGyokere(epito.nevezoFa);
  const { allasSzamokbol } = await import('../js/allapot/javaslatSzamitas.js');
  hamis.reszLezaras = allasSzamokbol(j, hamis.szamok, hamis.szamok.nevezo, hamis.kuszobok).lezarasIdeje;
  hamis.lezaras = Math.max(hamis.lezaras, hamis.reszLezaras);
  const olvasHamissal = async (az) => hamisak.get(az) ?? olvas(az);
  const helyek = lezarasiMintaHelyek(hamis, 32);
  const mintak = await lezarasiMintakValasza(epito, helyek, olvasHamissal);
  const tagE = async (sz) => !gyuru.has(sz);
  const e = await lezarasiOsszegzesEllenorzese({ osszegzes: hamis, javaslatEsemeny: j, helyek, mintak, tagE });
  return lezarasiSzamokEllenorzese(hamis, j).rendben === true && e.rendben === false && /nem tag/.test(e.ok);
});

proba('⛔⛔ a HAZUG MEDIÁN elbukik — a medián helye mindig a minták közt van', async () => {
  const { esemenyek, g, j, olvas } = await vilag();
  const { osszegzes, epito } = await lezarasiOsszegzesEpitese(esemenyek, j, g.azonosito);
  const { allasSzamokbol } = await import('../js/allapot/javaslatSzamitas.js');
  const hamis = { ...osszegzes, kuszobok: { ...osszegzes.kuszobok, elfogadasiKuszob: osszegzes.kuszobok.elfogadasiKuszob - 9 } };
  hamis.reszLezaras = allasSzamokbol(j, hamis.szamok, hamis.szamok.nevezo, hamis.kuszobok).lezarasIdeje;
  hamis.lezaras = Math.max(hamis.lezaras, hamis.reszLezaras);
  const helyek = lezarasiMintaHelyek(hamis, 2);
  const mintak = await lezarasiMintakValasza(epito, helyek, olvas);
  const e = await lezarasiOsszegzesEllenorzese({ osszegzes: hamis, javaslatEsemeny: j, helyek, mintak, tagE: mindenkiTag });
  return e.rendben === false && /medián/.test(e.ok);
});

proba('⭐⭐ az ELHALLGATOTT szavazat kiderül — a szavazó aláírt szavazata és a fa hiány-bizonyítéka; a beszámítotté nem', async () => {
  const { esemenyek, g, j, emberek } = await vilag();
  // A csaló kihagy egy szavazatot: a szavazó szavazatát elhagyja a bemenetből (a fa és a számok enélkül épülnek).
  const kihagyott = esemenyek.find((e) => e.tipus === 'Szavazat' && e.szerzo === emberek[2].szerzo);
  const { osszegzes, epito } = await lezarasiOsszegzesEpitese(esemenyek.filter((e) => e !== kihagyott), j, g.azonosito);
  // A lánc-gyökér nélküli szavazat joga nem bizonyítható — a próbában ezért a szavazó pont-bizonyítékos szavazatát
  // utánozzuk: a `kimaradtSzavazat` csak bizonyítékos szavazatot fogad el. Itt a fa hiány-bizonyítékát mérjük.
  const hiany = await szavazatFaBizonyitek(epito, kihagyott.szerzo);
  const bent = esemenyek.find((e) => e.tipus === 'Szavazat' && e.szerzo === emberek[0].szerzo);
  const bentBizonyitek = await szavazatFaBizonyitek(epito, bent.szerzo);
  const { allapotBizonyitekEllenorzese } = await import('../js/esemeny/osszegzoFa.js');
  const hianyE = await allapotBizonyitekEllenorzese(SZAVAZAT_FA, 3, osszegzes.fak.szavazat, 'v:' + kihagyott.szerzo, hiany);
  const bentE = await allapotBizonyitekEllenorzese(SZAVAZAT_FA, 3, osszegzes.fak.szavazat, 'v:' + bent.szerzo, bentBizonyitek);
  // és a bizonyíték nélküli (régi) szavazatot a `kimaradtSzavazat` nem fogadja el panasznak (a joga nem bizonyítható)
  const regi = await kimaradtSzavazat(osszegzes, j, kihagyott, hiany);
  return hianyE.rendben === true && hianyE.van === false && bentE.rendben === true && bentE.van === true && regi === false;
});

proba('⭐⭐ a KIHAGYOTT bizonyítékos szavazat panasza érvényes — a művelet-réteg lánc-gyökeres szavazatával', async () => {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-lezaras-'));
  try {
    const tar = await esemenyTarNyitasa('proba', mappa);
    const kornyezet = async () => {
      const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url');
      return { koino: 'proba', kulcspar, szerzo, tar, lancTarolo: null };
    };
    const a = await kornyezet(), b = await kornyezet(), c = await kornyezet();
    await koinoLetrehozasa(a, 'Lezárás-próba');
    const g = await gondolatLetrehozasa(a, { cim: 'G' });
    await tudatpontRendezese(b, g.azonosito, 5);
    await tudatpontRendezese(c, g.azonosito, 5);
    // hosszú döntési ablak — a szavazatok biztosan a lezárás előtt vannak
    await ertekJavaslat(a, g.azonosito, { elfogadasiKuszob: 51, reszveteliKuszob: 0, minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 });
    const j = await javaslatLetrehozasa(a, { erintett: g.azonosito, muvelet: 'Modositas', valtozas: { cim: 'G2' } });
    await szavazas(b, j.azonosito, 'Ellenez');
    await szavazas(c, j.azonosito, 'Tamogat');
    const esemenyek = await koinoEsemenyei(tar, 'proba');
    const bSzavazat = esemenyek.find((e) => e.tipus === 'Szavazat' && e.szerzo === b.szerzo);
    // A csaló kihagyja B szavazatát.
    const { osszegzes, epito } = await lezarasiOsszegzesEpitese(esemenyek.filter((e) => e !== bSzavazat), j, g.azonosito);
    const panasz = await kimaradtSzavazat(osszegzes, j, bSzavazat, await szavazatFaBizonyitek(epito, b.szerzo));
    // a becsületes (B-vel épült) összegzésre ugyanez a panasz nem érvényes (B benne van)
    const becsuletes = await lezarasiOsszegzesEpitese(esemenyek, j, g.azonosito);
    const hamisPanasz = await kimaradtSzavazat(becsuletes.osszegzes, j, bSzavazat,
      await szavazatFaBizonyitek(becsuletes.epito, b.szerzo));
    return bSzavazat?.lancGyoker != null && panasz === true && hamisPanasz === false;
  } finally {
    await rm(mappa, { recursive: true, force: true });
  }
});

proba('⛔⛔ a JOGOSULATLAN (pont nélküli) bizonyítékos szavazat a fában elbukik', async () => {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-lezaras-'));
  try {
    const tar = await esemenyTarNyitasa('proba', mappa);
    const kornyezet = async () => {
      const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url');
      return { koino: 'proba', kulcspar, szerzo, tar, lancTarolo: null };
    };
    const a = await kornyezet(), b = await kornyezet(), d = await kornyezet();
    await koinoLetrehozasa(a, 'Jog-próba');
    const g = await gondolatLetrehozasa(a, { cim: 'G' });
    await tudatpontRendezese(b, g.azonosito, 5);
    await gondolatLetrehozasa(d, { cim: 'H' });                    // D-nek máshol van pontja, G-n nincs
    await ertekJavaslat(a, g.azonosito, { elfogadasiKuszob: 51, reszveteliKuszob: 0, minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 });
    const j = await javaslatLetrehozasa(a, { erintett: g.azonosito, muvelet: 'Modositas', valtozas: { cim: 'G2' } });
    await szavazas(b, j.azonosito, 'Tamogat');
    const dSzavazat = await szavazas(d, j.azonosito, 'Tamogat');      // aláírt, de a bizonyítéka szerint nem jogosult
    const esemenyek = await koinoEsemenyei(tar, 'proba');
    const { osszegzes, epito } = await lezarasiOsszegzesEpitese(esemenyek, j, g.azonosito);
    // A csaló teljes tartó D szavazatát is beszámítja.
    epito.pillanatkep.szavazatok.push({ szerzo: d.szerzo, szavazat: 'Tamogat', azonosito: dSzavazat.azonosito });
    await allapotBeallitas(epito.szavazatFa, 'v:' + d.szerzo, dSzavazat.azonosito, [1, 0, 0]);
    await allapotBeallitas(epito.nevezoFa, 'n:' + d.szerzo, { e: dSzavazat.azonosito, t: 0 }, [1]);
    const { allasSzamokbol } = await import('../js/allapot/javaslatSzamitas.js');
    const szFa = await allapotGyokere(epito.szavazatFa);
    const hamis = { ...osszegzes, szamok: { ...osszegzes.szamok, tamogatok: szFa.o[0], nevezo: osszegzes.szamok.nevezo + 1 },
      fak: { ...osszegzes.fak, szavazat: szFa, nevezo: await allapotGyokere(epito.nevezoFa) } };
    hamis.reszLezaras = allasSzamokbol(j, hamis.szamok, hamis.szamok.nevezo, hamis.kuszobok).lezarasIdeje;
    hamis.lezaras = Math.max(hamis.lezaras, hamis.reszLezaras);
    const olvas = async (az) => esemenyek.find((e) => e.azonosito === az) ?? null;
    const helyek = lezarasiMintaHelyek(hamis, 32);
    const mintak = await lezarasiMintakValasza(epito, helyek, olvas);
    const e = await lezarasiOsszegzesEllenorzese({ osszegzes: hamis, javaslatEsemeny: j, helyek, mintak, tagE: mindenkiTag });
    return e.rendben === false && /jogosulatlan/.test(e.ok);
  } finally {
    await rm(mappa, { recursive: true, force: true });
  }
});

export default futtatas;
