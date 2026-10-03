// koino/meres/dontesiCsomagProba.js

// Felelősség: A DÖNTÉSI CSOMAG próbái (D85 T3, a (B) — Csaba, 2026-10-03) — valódi táron, valódi
// műveletekkel (aláírt események, lánc-gyökér, bizonyítékok).
//
// A HELYZET (minden próbában ugyanaz): A egyesítést javasol (G1 + G2). A G1-nek A és C a tulajdonosa, a
// G2-nek A, B és D. C támogat (a G1-es részen), B ellenez (a G2-es részen), D hallgat. A teljes tudással:
// a G1-es rész átmegy (2/2), a G2-es nem (1/2 < 51%) — a javaslat ELVETVE.
//
// ⛔ A csak-G1-nézet (a G1 szelete és a G1-es töredéké — ahogy egy G1-es szavazó tartja a szigorú (b)
// alatt) a csomag nélkül MÁST számol: a G2-es részből csak A szavazatát látja (az a G1-be is bejelentődik),
// a G2 tulajdonosait nem — a csomag hozza el a hiányzót.
//
// Használják: meres/mind.js (az allapot csoport).

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny } from './probaFuttato.js';
import { esemenyTarNyitasa, fajlBlobTarolo, lancTarolo } from '../js/tar/fajlTar.js';
import { esemenyMentese, lancVege, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { esemenyLetrehozasa, szelet, bejelentesHelyei } from '../js/esemeny/esemeny.js';
import {
  koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese, javaslatLetrehozasa, szavazas, ertekJavaslat,
  dontesiCsomagokKiadasa
} from '../js/muveletek.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { toredekAzonosito } from '../js/allapot/szabalyok.js';
import { CSOMAG_TIPUS, celSzeletebenVan, celbolHianyzik, dontesBemenete } from '../js/allapot/dontesiCsomag.js';

const { proba, futtatas } = probaGyujtemeny('A döntési csomag (D85 T3, a (B))');

const KOINO = 'csomag-proba';
const KESOBB = () => Date.now() + 30 * 86400 * 1000;   // minden döntési időn túl

async function ujSzereplo(tar, mappa, lanccal = true) {
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url');
  return { koino: KOINO, kulcspar, szerzo, tar, darabTar: fajlBlobTarolo(KOINO, mappa),
    lancTarolo: lanccal ? lancTarolo(KOINO, mappa) : null };
}

/** A fenti helyzet egy friss táron. */
async function helyzet() {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-csomag-'));
  const tar = await esemenyTarNyitasa(KOINO, mappa);
  const A = await ujSzereplo(tar, mappa);
  const B = await ujSzereplo(tar, mappa, false);
  const C = await ujSzereplo(tar, mappa, false);
  const D = await ujSzereplo(tar, mappa, false);
  await koinoLetrehozasa(A, 'Csomag-próba');
  const g1 = (await gondolatLetrehozasa(A, { cim: 'G1' })).azonosito;
  const g2 = (await gondolatLetrehozasa(A, { cim: 'G2' })).azonosito;
  await tudatpontRendezese(A, g1, 30);
  await tudatpontRendezese(A, g2, 30);
  await tudatpontRendezese(C, g1, 10);
  await tudatpontRendezese(B, g2, 10);
  await tudatpontRendezese(D, g2, 10);
  const j = (await javaslatLetrehozasa(A, { erintettek: [
    { entitas: g1, muvelet: 'Egyesites', valtozas: { cim: 'EGYESÍTETT' } },
    { entitas: g2, muvelet: 'Egyesites', valtozas: null }], pont: 2 })).azonosito;
  await szavazas(C, j, 'Tamogat');
  await szavazas(B, j, 'Ellenez');
  return { mappa, tar, A, B, C, D, g1, g2, j };
}

/** Egy szelet egyeztetett halmaza: a saját eseményei és ami oda bejelentődik. */
const szeletben = (e, k) => szelet(e) === k || bejelentesHelyei(e).includes(k);

/** A csak-Gi-nézet: a koinó születése, a Gi szelete és a Gi-es töredék szelete. */
const nezet = (esemenyek, g, j) => {
  const t = toredekAzonosito(j, g);
  return esemenyek.filter((e) => e.tipus === 'KoinoLetrehozas' || szeletben(e, g) || szeletben(e, t));
};

/** A javaslat döntése egy eseményhalmazból, minden döntési időn túl. */
const dontes = (esemenyek, j) => {
  const allapot = allapotSzamitasa(esemenyek);
  return javaslatokSzamitasa(allapot.szamitok, allapot, KESOBB()).get(j);
};

/** A részek számai — ami a döntést adja. */
const reszSzamok = (d) => JSON.stringify(d?.reszek?.map((r) =>
  [r.entitas, r.tamogatok, r.ellenzok, r.szavazok, r.nevezo, r.kuszobTeljesul]) ?? null);

// ===================================
// 1. A LÉNYEG: a csak-G1-nézet a csomaggal UGYANAZT számolja, mint a teljes tudás (D17)
// ===================================

proba('⭐⭐ a csak-G1-nézet a csomaggal ugyanazt a döntést számolja, mint a teljes tudás — nélküle mást', async () => {
  const { tar, A, g1, j } = await helyzet();
  const { kiadva } = await dontesiCsomagokKiadasa(A, { most: KESOBB() });
  const minden = await koinoEsemenyei(tar, KOINO);
  const teljes = dontes(minden, j);
  const csomagNelkul = dontes(nezet(minden.filter((e) => e.tipus !== CSOMAG_TIPUS), g1, j), j);
  const csomaggal = dontes(nezet(minden, g1, j), j);
  const g1Csomag = kiadva.filter((e) => e.adat.cel === g1).length;
  const g2 = teljes.reszek[1].entitas;
  return teljes.statusz === 'elvetve' && g1Csomag >= 1
    // ⭐ nélküle a G2-es részt nem ismeri — és ezt mondja ki (nem a rossz ELFOGADVA-t számolja)
    && csomagNelkul.statusz === 'nemIsmert' && JSON.stringify(csomagNelkul.ismeretlenReszek) === JSON.stringify([g2])
    && csomagNelkul.reszek[0].ismert === true && csomagNelkul.reszek[0].valahaTeljesult === true
    && csomaggal.statusz === teljes.statusz && reszSzamok(csomaggal) === reszSzamok(teljes)
    && teljes.ismeretlenReszek.length === 0;
});

// ===================================
// ⭐⭐ A DÖNTÉS ISMERETE (D85 T3, 2026-10-03) — a „nem ismert” nem hajt végre, és kimondja a saját részét
// ===================================

proba('⭐⭐ a NEM ISMERT döntés nem hajtódik végre — és ha az ismert rész sosem mondott igent, az is látszik', async () => {
  // A G1 részvételi küszöbe 100%, és C ELLENZI a G1-es részt (A támogat): előbb a részvétel kevés (1/2), aztán
  // a támogatás (1/2 < 51%) — a rész SOHA nem teljesül. A csak-G1-nézet csomag nélkül a G2-t nem ismeri →
  // „nem ismert”, a G1 változatlan, és az ismert rész (G1) valahaTeljesult = hamis.
  const mappa = await mkdtemp(join(tmpdir(), 'koino-ismeret-'));
  const tar = await esemenyTarNyitasa(KOINO, mappa);
  const A = await ujSzereplo(tar, mappa);
  const C = await ujSzereplo(tar, mappa, false);
  await koinoLetrehozasa(A, 'Ismeret');
  const g1 = (await gondolatLetrehozasa(A, { cim: 'G1' })).azonosito;
  const g2 = (await gondolatLetrehozasa(A, { cim: 'G2' })).azonosito;
  await tudatpontRendezese(A, g1, 30);
  await tudatpontRendezese(A, g2, 30);
  await tudatpontRendezese(C, g1, 10);
  await ertekJavaslat(A, g1, { elfogadasiKuszob: 51, reszveteliKuszob: 100, minimumDontesiIdo: 86400,
    maximumDontesiIdo: 604800 });
  const j = (await javaslatLetrehozasa(A, { erintettek: [
    { entitas: g1, muvelet: 'Egyesites', valtozas: { cim: 'EGYESÍTETT' } },
    { entitas: g2, muvelet: 'Egyesites', valtozas: null }], pont: 2 })).azonosito;
  await szavazas(C, j, 'Ellenez');
  const minden = await koinoEsemenyei(tar, KOINO);
  const nezetE = nezet(minden, g1, j);
  const allapot = allapotSzamitasa(nezetE);
  const d = javaslatokSzamitasa(allapot.szamitok, allapot, KESOBB()).get(j);
  return d.statusz === 'nemIsmert' && d.reszek[0].ismert && !d.reszek[0].valahaTeljesult
    && allapot.entitasok.get(g1)?.cim === 'G1';           // ⛔ nem hajtódott végre semmi
});

// ===================================
// 2. A CÉLZÁS: minden csomag csak azt hozza, ami a cél szeletéből hiányzik
// ===================================

proba('⭐ a célzás: a csomag a cél töredékében van, és csak azt hozza, ami a cél szeletéből hiányzik', async () => {
  const { A, g1, g2, j } = await helyzet();
  const { kiadva } = await dontesiCsomagokKiadasa(A, { most: KESOBB() });
  const celok = new Set(kiadva.map((e) => e.adat.cel));
  const rossz = kiadva.filter((e) => e.entitas !== toredekAzonosito(j, e.adat.cel)
    || e.adat.esemenyek[0].azonosito !== j
    || e.adat.esemenyek.slice(1).some((x) => celSzeletebenVan(x, e.adat.cel)));
  // A G1-esben ott a G2 tulajdonosainak pontja, a G2-esben a G1-é (C) — a saját nem.
  const pontjai = (cel, entitas) => kiadva.filter((e) => e.adat.cel === cel)
    .flatMap((e) => e.adat.esemenyek).filter((x) => x.tipus === 'TudatpontRendezes' && x.adat.entitas === entitas).length;
  return celok.size === 2 && celok.has(g1) && celok.has(g2) && rossz.length === 0
    && pontjai(g1, g2) >= 3 && pontjai(g1, g1) === 0 && pontjai(g2, g1) >= 2 && pontjai(g2, g2) === 0;
});

// ===================================
// 3. ISMÉTELHETŐ, ÉS DARABOLHATÓ
// ===================================

proba('⭐ ismételhető (a második kiadás semmit nem ír), és kis korláttal darabol — a darabok uniója a hiányzó', async () => {
  const { tar, A, g1, j } = await helyzet();
  const elso = await dontesiCsomagokKiadasa(A, { most: KESOBB(), korlat: 3500 });
  const masodik = await dontesiCsomagokKiadasa(A, { most: KESOBB(), korlat: 3500 });
  const allapot = allapotSzamitasa(await koinoEsemenyei(tar, KOINO));
  const jEsemeny = allapot.szamitok.find((e) => e.azonosito === j);
  const d = javaslatokSzamitasa(allapot.szamitok, allapot, KESOBB()).get(j);
  const vart = celbolHianyzik(dontesBemenete(allapot.szamitok, jEsemeny, d.lezarasIdeje), g1)
    .map((e) => e.azonosito).filter((az) => az !== j).sort();
  const g1Darabok = elso.kiadva.filter((e) => e.adat.cel === g1);
  const unio = [...new Set(g1Darabok.flatMap((e) => e.adat.esemenyek.slice(1).map((x) => x.azonosito)))].sort();
  return g1Darabok.length > 1 && masodik.kiadva.length === 0 && JSON.stringify(unio) === JSON.stringify(vart);
});

proba('⭐ a nyitott döntéshez nem ad ki csomagot (a bemenete még változhat)', async () => {
  const { A } = await helyzet();
  const { kiadva, javaslatok } = await dontesiCsomagokKiadasa(A, { most: Date.now() });
  return kiadva.length === 0 && javaslatok === 0;
});

// ===================================
// 4. ⛔ A KAPU: a csomag tartalma is ugyanazon a kapun megy át
// ===================================

proba('⛔⛔ a kapu elveti a hamis, az idegen, a rossz helyű és a javaslat nélküli csomagot', async () => {
  const { tar, A, C, g1, g2, j } = await helyzet();
  const { kiadva } = await dontesiCsomagokKiadasa(A, { most: KESOBB() });
  const minta = kiadva.find((e) => e.adat.cel === g1);
  const minden = await koinoEsemenyei(tar, KOINO);
  const kezzel = async (adat, entitas) => {
    const veg = await lancVege(tar, A.szerzo);
    const e = await esemenyLetrehozasa({ koino: KOINO, tipus: CSOMAG_TIPUS, adat, entitas, entitasSorszam: 1,
      latott: [], lancGyoker: null, ...veg }, A.kulcspar);
    return esemenyMentese(tar, e);
  };
  const tk1 = toredekAzonosito(j, g1);
  const belso = minta.adat.esemenyek;
  const atirt = belso.map((x, i) => (i === 1 ? { ...x, adat: { ...x.adat, pont: (x.adat.pont ?? 0) + 1 } } : x));
  const cPontjaG1 = minden.find((e) => e.tipus === 'TudatpontRendezes' && e.szerzo === C.szerzo && e.adat.entitas === g1);
  const egyErintettes = (await javaslatLetrehozasa(A, { erintett: g2, muvelet: 'Torles' }));
  const esetek = [
    ['egy belső esemény átírva', await kezzel({ ...minta.adat, esemenyek: atirt }, tk1), /nem áll meg/],
    ['a cél saját pont-eseménye', await kezzel({ ...minta.adat, esemenyek: [...belso, cPontjaG1] }, tk1), /nem ennek/],
    ['rossz töredékben', await kezzel(minta.adat, toredekAzonosito(j, g2)), /töredékének/],
    ['a javaslat nélkül', await kezzel({ ...minta.adat, esemenyek: belso.slice(1) }, tk1), /javaslatot/],
    ['egy érintettes javaslathoz', await kezzel({ javaslat: egyErintettes.azonosito, cel: g2,
      esemenyek: [egyErintettes, belso[1]] }, toredekAzonosito(egyErintettes.azonosito, g2)), /egy érintettes/]
  ];
  const rossz = esetek.filter(([, v, minta]) => v.mentve !== false || !minta.test(v.ok ?? '')).map(([nev]) => nev);
  if (rossz.length) console.log('    (rosszul ítélt esetek: ' + rossz.join(', ') + ')');
  return rossz.length === 0;
});

export default futtatas;
