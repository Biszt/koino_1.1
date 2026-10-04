// koino/meres/zartKapuMeres.js

// Felelősség: A 64. MÉRÉS — MIBE KERÜL A ZÁRT KOINÓ KAPUJA A DRÓTON? (D93/3, az E3)
//
// Egy „nincs újdonság” csere a gépen belüli UDP-résen (titkosítva, tábla-kulccsal — ahogy az őrjárat), és a dróton
// ténylegesen utazó bájtok és csomagok (a foglalat `send`-jénél, a nyugtákkal együtt), öt helyzetben:
//
//   · NYÍLT — nincs kapu (a mai alak: ez a mérce);
//   · ZÁRT, ISMERT TÁRS — a kapu a tábla-kulcsáról ismeri (a hétköznapi eset): nincs bizonyítási kör;
//   · ZÁRT, ELSŐ TALÁLKOZÁS, CSOMAG NÉLKÜL — a kapu kéri, a társ a személyes aláírását és a horgonyát küldi (a lánca
//     a kérdezőnél megvan);
//   · ZÁRT, ELSŐ TALÁLKOZÁS, CSOMAGGAL — a társ a tagsági csomagját is küldi; a csomag mérete a lánc mélységével nő
//     (1, 5, 13 — a 63. mérés szerint egymillió tagnál ~13 —, 30, 64 = a mélység-korlát);
//   · KÖLCSÖNÖS — mindkét fél először látja a másikat, és mindkettő 13 mélységű csomagot küld.
//
// A csomag valódi: aláírt belépések és meghívások lánca az alapítóig (`tagsag.js`: `tagsagiLanc`), a lánc-gyökérrel
// együtt (`probaFuttato.js`: `ujEember`). ⚠️ A kapu itt utánzat (az ítéletet nem számolja — azt a próbák mérik);
// a kérdés csak a forgalom.
//
// ⚠️ NEM ÖNPRÓBA (számokat ad), nem kerül a `mind.js`-be.   node koino/meres/zartKapuMeres.js

import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSocket } from 'node:dgram';

import { ujEember } from './probaFuttato.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import { kezfogasAlairasa, szemelyesKezfogasAlairasa } from '../js/csere/titkositas.js';
import { tagsagiIndex, tagsagiLanc, TAGSAGI_CSOMAG } from '../js/allapot/tagsag.js';

const kiir = (s) => process.stdout.write(s + '\n');
console.log = () => {};
const KOINO = 'zartkapu-meres';
const bajt = (x) => Buffer.byteLength(JSON.stringify(x), 'utf8');

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  const meres = { bajt: 0, csomag: 0 };
  for (const s of [egyik, masik]) {
    const eredeti = s.send.bind(s);
    s.send = (adat, ...tobbi) => {
      meres.bajt += Buffer.isBuffer(adat) ? adat.length : Buffer.byteLength(String(adat));
      meres.csomag++;
      return eredeti(adat, ...tobbi);
    };
  }
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port, meres,
    bezar() { egyik.close(); masik.close(); } };
}

/** Egy `melyseg` mély meghívási lánc, és a legmélyebb tag tagsági csomagja (valódi, aláírt események). */
async function lancCsomaggal(melyseg) {
  const alapito = await ujEember(KOINO);
  const szuletes = await alapito.tesz('KoinoLetrehozas', { nev: 'Mérés', leiras: null, alapitok: [], zart: true });
  const esemenyek = [szuletes];
  let elozo = alapito, elozoH = szuletes.azonosito, utolso = null, utolsoB = null;
  for (let i = 0; i < melyseg; i++) {
    const tag = await ujEember(KOINO);
    const b = await tag.tesz('Belepes', {});
    const m = await elozo.tesz('Meghivas', { kit: tag.szerzo, sajatBelepes: elozoH }, undefined, { entitas: b.azonosito });
    esemenyek.push(b, m);
    elozo = tag; elozoH = b.azonosito; utolso = tag; utolsoB = b;
  }
  const lanc = tagsagiLanc(tagsagiIndex(esemenyek, KOINO), utolsoB.azonosito);
  const csomag = await utolso.tesz(TAGSAGI_CSOMAG, { lanc }, undefined, { entitas: utolsoB.azonosito });
  return { szuletes, csomag, tag: utolso, horgony: utolsoB.azonosito };
}

/** Egy tár a koinó születésével (mindkét félnél ugyanaz — „nincs újdonság”). */
async function tarSzuletessel(szuletes) {
  const tar = await esemenyTarNyitasa(KOINO, await mkdtemp(join(tmpdir(), 'koino-zartkapu-')));
  await esemenyMentese(tar, szuletes);
  return tar;
}

/** A személyes aláíró egy `ujEember`-hez (a kulcsa JWK-ban). */
async function alairo(r, horgony) {
  const jwk = await crypto.subtle.exportKey('jwk', r.kulcspar.privateKey);
  return (atirat) => ({ sz: r.szerzo, h: horgony, a: szemelyesKezfogasAlairasa(jwk, KOINO, atirat) });
}

/** Egy kapu-utánzat: ismeri-e a társat a tábla-kulcsáról; ha nem, kér, és a bizonyítás után beengedi. */
const kapu = (ismeri) => async (x) => (ismeri || x.ki ? { szabad: true } : { szabad: false, kell: true, szeletek: [] });

async function csere(szuletes, a, b) {
  const p = await udpParos();
  const tA = await ujTablaKulcs(), tB = await ujTablaKulcs();
  const oldal = (t) => ({ tablaKulcs: nyilvanosResz(t), tablaAlairo: (atirat) => kezfogasAlairasa(t, atirat) });
  try {
    await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, await tarSzuletessel(szuletes), KOINO, { ...oldal(tA), ...a }),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, await tarSzuletessel(szuletes), KOINO, { ...oldal(tB), ...b })
    ]);
    await new Promise((t) => setTimeout(t, 300));
    return { ...p.meres };
  } finally { p.bezar(); }
}

// ===== A MÉRÉS =====

kiir('A 64. MÉRÉS — a zárt koinó kapuja a dróton (egy „nincs újdonság” csere, titkosítva, tábla-kulccsal)');
kiir('');
const alap = await lancCsomaggal(1);
const tagAlairo = await alairo(alap.tag, alap.horgony);
const nyilt = await csere(alap.szuletes, {}, {});
const sor = (nev, m) => kiir('  ' + nev.padEnd(60) + String(m.bajt).padStart(7) + ' B   ' + String(m.csomag).padStart(3)
  + ' csomag   ' + (m.bajt - nyilt.bajt >= 0 ? '+' : '') + (m.bajt - nyilt.bajt) + ' B');
sor('nyílt (nincs kapu) — a mérce', nyilt);
sor('zárt, ismert társ (a tábla-kulcsáról)', await csere(alap.szuletes, { zartKapu: kapu(true) }, { szemelyesAlairo: tagAlairo }));
sor('zárt, első találkozás, csomag nélkül', await csere(alap.szuletes, { zartKapu: kapu(false) },
  { szemelyesAlairo: tagAlairo, tagsagiCsomag: async () => null }));
for (const k of [1, 5, 13, 30, 64]) {
  const l = k === 1 ? alap : await lancCsomaggal(k);
  const m = await csere(l.szuletes, { zartKapu: kapu(false) },
    { szemelyesAlairo: await alairo(l.tag, l.horgony), tagsagiCsomag: async () => l.csomag });
  sor('zárt, első találkozás, csomaggal (mélység ' + k + ', ' + (bajt(l.csomag) / 1024).toFixed(1) + ' KB)', m);
}
{
  const l1 = await lancCsomaggal(13);
  // A másik fél egy másik 13 mélységű ágon (ugyanabban a koinóban — itt elég, hogy mindkettő küld egy csomagot).
  const l2 = await lancCsomaggal(13);
  const m = await csere(l1.szuletes,
    { zartKapu: kapu(false), szemelyesAlairo: await alairo(l1.tag, l1.horgony), tagsagiCsomag: async () => l1.csomag },
    { zartKapu: kapu(false), szemelyesAlairo: await alairo(l2.tag, l2.horgony), tagsagiCsomag: async () => l2.csomag });
  sor('kölcsönös első találkozás (2 × mélység 13)', m);
}
kiir('');
kiir('  (a csomag JSON-mérete; a dróton titkosítva, ~1000 B-os darabokban, nyugtával)');
