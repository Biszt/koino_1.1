// koino/meres/identitasProba.js

// Felelősség: bizonyítani, hogy a TAGSÁG-SZÁMÍTÁS (`allapot/identitas.js`) azt csinálja,
// amit a D56 első lépcsője mond — és hogy a rekurzió nem tud eltörni.
//
// ⭐ MIT KELL ITT BIZONYÍTANI? Nem azt, hogy „a meghívás működik" — az triviális volna.
// Hanem azt a négy dolgot, amin az egész áll:
//
//   1. a lánc VISSZAVEZETHETŐ az alapítóig, akármilyen hosszú;
//   2. aki NEM vezethető vissza, az nem tag — akkor sem, ha aláírt meghívása van;
//   3. ⭐ a KÖR nem fagyasztja le a programot, és nem is szül tagságot a semmiből;
//   4. ⭐ a HIÁNY nem vád: „nem ellenőrizhető", nem elutasítás (D19).
//
// ⚠️ A 2. és a 3. RONTÁS-PRÓBA: olyan eseményeket gyártanak, amiket a felület sosem
// írna alá. Épp ez a lényeg — a felület a másik gépen nem véd semmitől, tehát azt kell
// mérni, hogy a SZÁMÍTÁS áll-e ellen.
//
// Futtatás: node koino/meres/mind.js identitas

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { tagE, ujIdentitasNezet } from '../js/allapot/identitas.js';

const { proba, futtatas } = probaGyujtemeny('A tagság-számítás próbája');

const KOINO = 'proba';
const mappak = [];

/** Új, üres tár egy eldobható mappában. */
async function ujTar() {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-identitas-'));
  mappak.push(mappa);
  return esemenyTarNyitasa(KOINO, mappa);
}

async function ment(tar, ...esemenyek) {
  for (const e of esemenyek) {
    const eredmeny = await esemenyMentese(tar, e);
    if (!eredmeny.mentve) throw new Error('nem menthető: ' + eredmeny.ok);
  }
}

// ===================================
// SEGÉDEK — a két új esemény, ugyanúgy, ahogy a `muveletek.js` írja alá
// ===================================

/** Az alapító: létrehozza a koinót. A horgonya maga a létrehozó esemény. */
async function alapito() {
  const eember = await ujEember(KOINO);
  const esemeny = await eember.tesz('KoinoLetrehozas', { nev: 'Próba', leiras: null });
  return { eember, horgony: esemeny.azonosito, esemeny };
}

/** Egy belépő: megnyitja a saját szeletét. Ez még NEM tagság. */
async function belepo() {
  const eember = await ujEember(KOINO);
  const esemeny = await eember.tesz('Belepes', {});
  return { eember, horgony: esemeny.azonosito, esemeny };
}

/**
 * Meghívás: a meghívott szeletébe kerül, és hozza a meghívó horgonyát.
 *
 * ⚠️ A negyedik paraméter a beállítás, a harmadik az IDŐ — ezt elsőre elrontottam, és a
 * meghívás a saját szeletét nyitotta (`entitas: null`) a meghívottéba kerülés helyett.
 * A rontás-próbák ettől is „rendben" voltak, a POZITÍV próbák viszont buktak: ⭐ jó
 * emlékeztető arra, hogy a tiltó próbák önmagukban semmit nem bizonyítanak.
 */
function meghivas(meghivo, meghivott, beallitas = {}) {
  return meghivo.eember.tesz(
    'Meghivas',
    {
      kit: beallitas.kit ?? meghivott.eember.szerzo,
      sajatBelepes: beallitas.sajatBelepes ?? meghivo.horgony
    },
    undefined,
    { entitas: beallitas.entitas ?? meghivott.horgony }
  );
}

// ===================================
// AZ ALAPESET ÉS A LÁNC
// ===================================

proba('⭐ AZ ALAPÍTÓ TAG — ő hozta létre a koinót, nem kell hozzá meghívás', async () => {
  const tar = await ujTar();
  const a = await alapito();
  await ment(tar, a.esemeny);

  const eredmeny = await tagE(tar, KOINO, a.horgony);
  return eredmeny.tag === true && eredmeny.ellenorizheto === true;
});

proba('Aki csak belépett, de senki nem hívta be, NEM tag', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  await ment(tar, a.esemeny, b.esemeny);

  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.tag === false && eredmeny.ellenorizheto === true;
});

proba('Akit az alapító behívott, TAG — egy meghívó elég (D56)', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  await ment(tar, a.esemeny, b.esemeny, await meghivas(a, b));

  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.tag === true;
});

proba('⭐ A LÁNC VISSZAVEZET AZ ALAPÍTÓIG: alapító → B → C → D mind tag', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  const c = await belepo();
  const d = await belepo();
  await ment(tar, a.esemeny, b.esemeny, c.esemeny, d.esemeny,
    await meghivas(a, b), await meghivas(b, c), await meghivas(c, d));

  const nezet = ujIdentitasNezet();
  const eredmenyek = [
    await tagE(tar, KOINO, b.horgony, nezet),
    await tagE(tar, KOINO, c.horgony, nezet),
    await tagE(tar, KOINO, d.horgony, nezet)
  ];
  return eredmenyek.every((e) => e.tag === true);
});

// ===================================
// ⚠️ RONTÁS-PRÓBÁK — amit a felület sosem írna alá
// ===================================

proba('⚠️ RONTÁS: aki NEM tagtól kapott meghívást, NEM lesz tag', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const kivulallo = await belepo();     // ő maga sincs behívva
  const b = await belepo();
  await ment(tar, a.esemeny, kivulallo.esemeny, b.esemeny,
    await meghivas(kivulallo, b));

  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.tag === false && eredmeny.ellenorizheto === true;
});

proba('⚠️ RONTÁS: magát senki nem hívhatja be', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  await ment(tar, a.esemeny, b.esemeny, await meghivas(b, b));

  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.tag === false;
});

proba('⚠️ RONTÁS: a MÁSRÓL szóló meghívás nem számít (a `kit` nem a szelet gazdája)', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  const c = await belepo();
  // Az alapító meghívása B SZELETÉBE kerül, de C-ről szól — ez nem teheti B-t taggá.
  await ment(tar, a.esemeny, b.esemeny, c.esemeny,
    await meghivas(a, b, { kit: c.eember.szerzo }));

  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.tag === false;
});

proba('⚠️ RONTÁS: hamis horgonyra hivatkozó meghívás nem számít', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const kivulallo = await belepo();
  const b = await belepo();
  // A kívülálló az ALAPÍTÓ horgonyára hivatkozik, mintha az az övé volna.
  await ment(tar, a.esemeny, kivulallo.esemeny, b.esemeny,
    await meghivas(kivulallo, b, { sajatBelepes: a.horgony }));

  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.tag === false;
});

proba('⭐⭐ RONTÁS: a KÖR nem szül tagságot, és nem fagy le (A hívja B-t, B hívja A-t)', async () => {
  const tar = await ujTar();
  const a = await alapito();          // ő csak azért kell, hogy legyen koino
  const x = await belepo();
  const y = await belepo();
  await ment(tar, a.esemeny, x.esemeny, y.esemeny,
    await meghivas(x, y), await meghivas(y, x));

  const egyik = await tagE(tar, KOINO, x.horgony);
  const masik = await tagE(tar, KOINO, y.horgony);
  return egyik.tag === false && masik.tag === false;
});

proba('⚠️ RONTÁS: a MÁSIK koino meghívása nem számít', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  const meghivo = await meghivas(a, b);
  // Ugyanaz az esemény, de másik koinóban kérdezünk rá.
  await ment(tar, a.esemeny, b.esemeny, meghivo);

  const eredmeny = await tagE(tar, 'masik-koino', b.horgony);
  return eredmeny.tag === false;
});

// ===================================
// ⭐ A HIÁNY NEM VÁD (D19)
// ===================================

proba('⭐ A HIÁNYZÓ HORGONY: „nem ellenőrizhető", nem elutasítás', async () => {
  const tar = await ujTar();
  const b = await belepo();
  // A belépés eseményét NEM mentjük el — csak kérdezünk rá.
  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.tag === false && eredmeny.ellenorizheto === false;
});

proba('⭐ A HIÁNYZÓ MEGHÍVÓI LÁNC is „nem ellenőrizhető"', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  const c = await belepo();
  // B-t behívta A, C-t behívta B — de B belépését nem mentjük el.
  await ment(tar, a.esemeny, c.esemeny, await meghivas(b, c));

  const eredmeny = await tagE(tar, KOINO, c.horgony);
  return eredmeny.tag === false && eredmeny.ellenorizheto === false;
});

// ===================================
// ⭐⭐ A GYORSÍTÓTÁR — ettől olcsó a gyökérig menő ellenőrzés
// ===================================

proba('⭐⭐ A GYORSÍTÓTÁR: a második kérdés töredék annyi olvasásból jön ki', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const esemenyek = [a.esemeny];

  // Tíz hosszú lánc: alapító → 1 → 2 → … → 10
  let elozo = a;
  const tagok = [];
  for (let i = 0; i < 10; i++) {
    const uj = await belepo();
    esemenyek.push(uj.esemeny, await meghivas(elozo, uj));
    tagok.push(uj);
    elozo = uj;
  }
  await ment(tar, ...esemenyek);

  const nezet = ujIdentitasNezet();
  const elso = await tagE(tar, KOINO, tagok[9].horgony, nezet);
  const elsoOlvasas = nezet.olvasasok;

  // Ugyanaz a kérdés másodszor: a nézetből jön, olvasás nélkül.
  const masodik = await tagE(tar, KOINO, tagok[9].horgony, nezet);
  const masodikOlvasas = nezet.olvasasok - elsoOlvasas;

  return elso.tag === true && masodik.tag === true
      && elsoOlvasas > 10 && masodikOlvasas === 0;
});

proba('⭐ A tagság BEFAGY: amit egyszer eldöntöttünk, azt nem kérdezzük újra (D47)', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  const c = await belepo();
  await ment(tar, a.esemeny, b.esemeny, c.esemeny,
    await meghivas(a, b), await meghivas(b, c));

  const nezet = ujIdentitasNezet();
  await tagE(tar, KOINO, b.horgony, nezet);
  const bUtan = nezet.olvasasok;
  // C ellenőrzése B-n át vezet — de B már eldőlt, tehát az ő ága nem olvasódik újra.
  await tagE(tar, KOINO, c.horgony, nezet);
  const cKoltsege = nezet.olvasasok - bUtan;

  return nezet.tagok.has(b.horgony) && cKoltsege < bUtan;
});

// ===================================
// TAKARÍTÁS
// ===================================

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
