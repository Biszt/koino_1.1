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
import {
  tagE, tanusithatE, lepcso2E, ujIdentitasNezet,
  TANUSITAS_KELL, FELHATALMAZAS_KELL
} from '../js/allapot/identitas.js';
import { onalloSzalak, tanusitoiTorlodas, megbizasAllapota } from '../js/allapot/jelzesek.js';

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
async function alapito(alapitok = []) {
  const eember = await ujEember(KOINO);
  const esemeny = await eember.tesz('KoinoLetrehozas',
    { nev: 'Próba', leiras: null, alapitok });
  return { eember, horgony: esemeny.azonosito, esemeny };
}

/**
 * ⭐⭐ EGY TELJES ALAPÍTÓ KÖR — `db` fővel, a létrehozóval együtt.
 *
 * ⚠️ EZ AZÉRT KELL, MERT EGYETLEN ALAPÍTÓVAL A 2. LÉPCSŐ EL SEM TUD INDULNI: a
 * pénztárcához három tanúsítás kell, de egy ember csak egyet ad. A `koinoLetrehozas`
 * ezért nevezhet meg alapítókat, akik a saját `Belepes`-ükkel hivatkoznak rá.
 */
async function alapitoKor(db) {
  const tagok = [];
  for (let i = 1; i < db; i++) tagok.push(await ujEember(KOINO));

  const letrehozo = await ujEember(KOINO);
  const letrehozas = await letrehozo.tesz('KoinoLetrehozas',
    { nev: 'Próba', leiras: null, alapitok: tagok.map((t) => t.szerzo) });

  const esemenyek = [letrehozas];
  const kor = [{ eember: letrehozo, horgony: letrehozas.azonosito, esemeny: letrehozas }];
  for (const t of tagok) {
    const be = await t.tesz('Belepes', { alapitas: letrehozas.azonosito });
    esemenyek.push(be);
    kor.push({ eember: t, horgony: be.azonosito, esemeny: be });
  }
  return { kor, esemenyek, letrehozas };
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
  return eredmeny.igen === true && eredmeny.ellenorizheto === true;
});

proba('Aki csak belépett, de senki nem hívta be, NEM tag', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  await ment(tar, a.esemeny, b.esemeny);

  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.igen === false && eredmeny.ellenorizheto === true;
});

proba('Akit az alapító behívott, TAG — egy meghívó elég (D56)', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  await ment(tar, a.esemeny, b.esemeny, await meghivas(a, b));

  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.igen === true;
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
  return eredmenyek.every((e) => e.igen === true);
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
  return eredmeny.igen === false && eredmeny.ellenorizheto === true;
});

proba('⚠️ RONTÁS: magát senki nem hívhatja be', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  await ment(tar, a.esemeny, b.esemeny, await meghivas(b, b));

  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.igen === false;
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
  return eredmeny.igen === false;
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
  return eredmeny.igen === false;
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
  return egyik.igen === false && masik.igen === false;
});

proba('⚠️ RONTÁS: a MÁSIK koino meghívása nem számít', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  const meghivo = await meghivas(a, b);
  // Ugyanaz az esemény, de másik koinóban kérdezünk rá.
  await ment(tar, a.esemeny, b.esemeny, meghivo);

  const eredmeny = await tagE(tar, 'masik-koino', b.horgony);
  return eredmeny.igen === false;
});

// ===================================
// ⭐ A HIÁNY NEM VÁD (D19)
// ===================================

proba('⭐ A HIÁNYZÓ HORGONY: „nem ellenőrizhető", nem elutasítás', async () => {
  const tar = await ujTar();
  const b = await belepo();
  // A belépés eseményét NEM mentjük el — csak kérdezünk rá.
  const eredmeny = await tagE(tar, KOINO, b.horgony);
  return eredmeny.igen === false && eredmeny.ellenorizheto === false;
});

proba('⭐ A HIÁNYZÓ MEGHÍVÓI LÁNC is „nem ellenőrizhető"', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const b = await belepo();
  const c = await belepo();
  // B-t behívta A, C-t behívta B — de B belépését nem mentjük el.
  await ment(tar, a.esemeny, c.esemeny, await meghivas(b, c));

  const eredmeny = await tagE(tar, KOINO, c.horgony);
  return eredmeny.igen === false && eredmeny.ellenorizheto === false;
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

  return elso.igen === true && masodik.igen === true
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

  return nezet.igenek.has('tag|' + b.horgony) && cKoltsege < bUtan;
});


// ===================================
// ⭐⭐ A 2. LÉPCSŐ — a pénztárca kapuja (D56, 9/c 4.3)
// ===================================

/** Felhatalmazás és tanúsítás — ugyanaz az alak, mint a meghívásé. */
function allitas(tipus) {
  return (allito, rola, beallitas = {}) => {
    const adat = {
      kit: beallitas.kit ?? rola.eember.szerzo,
      sajatBelepes: beallitas.sajatBelepes ?? allito.horgony
    };
    // ⭐ A TANÚSÍTÁS BEMONDJA, mire támaszkodott (D42-minta, 9/c 4.5) — az alapító körnek
    // nincs mit bemondania, ezért ott elmarad.
    if (beallitas.felhatalmazasok) adat.felhatalmazasok = beallitas.felhatalmazasok;
    return allito.eember.tesz(tipus, adat, undefined,
      { entitas: beallitas.entitas ?? rola.horgony });
  };
}
const felhatalmazas = allitas('Felhatalmazas');
const tanusitas = allitas('Tanusitas');

proba('⭐ AZ ALAPÍTÓ KÖR tagjai 2. lépcsősök ÉS tanúsíthatnak (ez a rekurzió gyökere)', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  await ment(tar, ...esemenyek);

  const nezet = ujIdentitasNezet();
  for (const a of kor) {
    const lepcso = await lepcso2E(tar, KOINO, a.horgony, nezet);
    const tanu = await tanusithatE(tar, KOINO, a.horgony, nezet);
    if (!lepcso.igen || !tanu.igen) return false;
  }
  return true;
});

proba('⚠️⚠️ EGYETLEN ALAPÍTÓVAL A 2. LÉPCSŐ BEFAGY — ezért kell az alapító kör', async () => {
  const tar = await ujTar();
  const a = await alapito();          // egyetlen alapító, nincs megnevezett kör
  const b = await belepo();
  await ment(tar, a.esemeny, b.esemeny,
    await meghivas(a, b), await tanusitas(a, b));

  // B tag lett, de a pénztárcához három tanúsító kellene — és csak egy létezik.
  const tag = await tagE(tar, KOINO, b.horgony);
  const lepcso = await lepcso2E(tar, KOINO, b.horgony);
  return tag.igen === true && lepcso.igen === false;
});

proba('⭐ HÁROM tanúsítás felhatalmazott tanúsítótól → 2. LÉPCSŐS (pénztárca)', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const uj = await belepo();

  const allitasok = [await meghivas(kor[0], uj)];
  for (let i = 0; i < TANUSITAS_KELL; i++) allitasok.push(await tanusitas(kor[i], uj));
  await ment(tar, ...esemenyek, uj.esemeny, ...allitasok);

  const eredmeny = await lepcso2E(tar, KOINO, uj.horgony);
  return eredmeny.igen === true;
});

proba('KETTŐ tanúsítás NEM elég a 2. lépcsőhöz', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const uj = await belepo();

  const allitasok = [await meghivas(kor[0], uj)];
  for (let i = 0; i < TANUSITAS_KELL - 1; i++) allitasok.push(await tanusitas(kor[i], uj));
  await ment(tar, ...esemenyek, uj.esemeny, ...allitasok);

  return (await lepcso2E(tar, KOINO, uj.horgony)).igen === false;
});

proba('⚠️ RONTÁS: aki NEM tanúsíthat, annak a tanúsítása nem számít', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const uj = await belepo();

  // Három olyan „tanúsító", aki maga sincs a 2. lépcsőn.
  const kamuk = [await belepo(), await belepo(), await belepo()];
  const allitasok = [await meghivas(kor[0], uj)];
  for (const k of kamuk) allitasok.push(await tanusitas(k, uj));
  await ment(tar, ...esemenyek, uj.esemeny, ...kamuk.map((k) => k.esemeny), ...allitasok);

  return (await lepcso2E(tar, KOINO, uj.horgony)).igen === false;
});

proba('⭐ N FELHATALMAZÁS 2. lépcsősöktől → TANÚSÍTHAT (ha maga is 2. lépcsős)', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(FELHATALMAZAS_KELL + 1);
  const uj = await belepo();

  const allitasok = [await meghivas(kor[0], uj)];
  for (let i = 0; i < TANUSITAS_KELL; i++) allitasok.push(await tanusitas(kor[i], uj));
  for (let i = 0; i < FELHATALMAZAS_KELL; i++) allitasok.push(await felhatalmazas(kor[i], uj));
  await ment(tar, ...esemenyek, uj.esemeny, ...allitasok);

  const nezet = ujIdentitasNezet();
  const lepcso = await lepcso2E(tar, KOINO, uj.horgony, nezet);
  const tanu = await tanusithatE(tar, KOINO, uj.horgony, nezet);
  return lepcso.igen === true && tanu.igen === true;
});

proba('⚠️ RONTÁS: aki NEM 2. lépcsős, az N felhatalmazással sem tanúsíthat', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(FELHATALMAZAS_KELL + 1);
  const uj = await belepo();

  // Megkapja a felhatalmazásokat, de tanúsítást NEM — tehát nincs pénztárcája.
  const allitasok = [await meghivas(kor[0], uj)];
  for (let i = 0; i < FELHATALMAZAS_KELL; i++) allitasok.push(await felhatalmazas(kor[i], uj));
  await ment(tar, ...esemenyek, uj.esemeny, ...allitasok);

  return (await tanusithatE(tar, KOINO, uj.horgony)).igen === false;
});

proba('⭐⭐ RONTÁS: a ZÁRT VÁLASZTÓTESTÜLET — nem 2. lépcsős felhatalmazása nem számít', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const uj = await belepo();

  // Tanúsítást kap (2. lépcsős lesz), de a felhatalmazások KÍVÜLÁLLÓKTÓL jönnek.
  const kivulallok = [];
  for (let i = 0; i < FELHATALMAZAS_KELL; i++) kivulallok.push(await belepo());

  const allitasok = [await meghivas(kor[0], uj)];
  for (let i = 0; i < TANUSITAS_KELL; i++) allitasok.push(await tanusitas(kor[i], uj));
  for (const k of kivulallok) allitasok.push(await felhatalmazas(k, uj));
  await ment(tar, ...esemenyek, uj.esemeny,
    ...kivulallok.map((k) => k.esemeny), ...allitasok);

  const nezet = ujIdentitasNezet();
  const lepcso = await lepcso2E(tar, KOINO, uj.horgony, nezet);
  const tanu = await tanusithatE(tar, KOINO, uj.horgony, nezet);
  return lepcso.igen === true && tanu.igen === false;
});

proba('⭐ EMBERENKÉNT EGY felhatalmazás számít (ugyanattól kétszer = egy)', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const uj = await belepo();

  const allitasok = [await meghivas(kor[0], uj)];
  for (let i = 0; i < TANUSITAS_KELL; i++) allitasok.push(await tanusitas(kor[i], uj));
  // Ugyanaz az ember N-szer felhatalmazza — ez egynek számít, tehát nem lesz tanúsító.
  for (let i = 0; i < FELHATALMAZAS_KELL; i++) allitasok.push(await felhatalmazas(kor[0], uj));
  await ment(tar, ...esemenyek, uj.esemeny, ...allitasok);

  return (await tanusithatE(tar, KOINO, uj.horgony)).igen === false;
});

proba('⭐⭐ RONTÁS: a KÖR a 2. lépcsőn sem szül jogot (X tanúsítja Y-t, Y tanúsítja X-et)', async () => {
  const tar = await ujTar();
  const a = await alapito();
  const x = await belepo();
  const y = await belepo();
  await ment(tar, a.esemeny, x.esemeny, y.esemeny,
    await tanusitas(x, y), await tanusitas(y, x),
    await felhatalmazas(x, y), await felhatalmazas(y, x));

  const egyik = await lepcso2E(tar, KOINO, x.horgony);
  const masik = await tanusithatE(tar, KOINO, y.horgony);
  return egyik.igen === false && masik.igen === false;
});

proba('⭐ A HIÁNYZÓ TANÚSÍTÓI LÁNC is „nem ellenőrizhető", nem elutasítás', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const uj = await belepo();

  const allitasok = [];
  for (let i = 0; i < TANUSITAS_KELL; i++) allitasok.push(await tanusitas(kor[i], uj));
  // ⚠️ Az alapító kör belépéseit NEM mentjük el — csak a létrehozást.
  await ment(tar, esemenyek[0], uj.esemeny, ...allitasok);

  const eredmeny = await lepcso2E(tar, KOINO, uj.horgony);
  return eredmeny.igen === false && eredmeny.ellenorizheto === false;
});


// ===================================
// ⭐⭐⭐ A KONTRASZT-JELZÉS (9/c 4.4) — ez a valódi védelem
// ===================================
//
// ⚠️ MIT KELL ITT BIZONYÍTANI? Nem azt, hogy „a jelzés kigyullad" — hanem hogy KÜLÖNBSÉGET
// TESZ: a becsületes tanúsítóra NÉMA marad, a megvettre pedig megszólal. Egy jelzés, ami
// mindkettőre kigyullad, rosszabb a semminél — hozzászoknak, és megszűnik jelzés lenni.

proba('⭐ AZ ÖNÁLLÓ SZÁLAK: aki csak belépett, annak nulla; akit behívtak, annak több', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const maganyos = await belepo();
  const behivott = await belepo();
  await ment(tar, ...esemenyek, maganyos.esemeny, behivott.esemeny,
    await meghivas(kor[0], behivott), await tanusitas(kor[1], behivott));

  const a = await onalloSzalak(tar, KOINO, maganyos.horgony);
  const b = await onalloSzalak(tar, KOINO, behivott.horgony);
  return a.osszes === 0 && b.osszes === 2;
});

proba('⭐ AZ ÖNÁLLÓ SZÁLAK KÉT IRÁNYT számolnak: rólam és tőlem', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const uj = await belepo();
  const masik = await belepo();
  await ment(tar, ...esemenyek, uj.esemeny, masik.esemeny,
    await meghivas(kor[0], uj),      // rólam: 1
    await meghivas(uj, masik));      // tőlem: 1

  const szalak = await onalloSzalak(tar, KOINO, uj.horgony);
  return szalak.rolam === 1 && szalak.tole === 1 && szalak.osszes === 2;
});

proba('⭐⭐ A KONTRASZT: a BECSÜLETES tanúsítóra a jelzés NÉMA marad', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const mind = [...esemenyek];

  // A becsületes tanúsító öt olyan embert tanúsít, akiknek van saját életük:
  // mindegyiket behívta valaki más, és mindegyiket két másik alapító is tanúsította.
  for (let i = 0; i < 5; i++) {
    const uj = await belepo();
    mind.push(uj.esemeny,
      await meghivas(kor[1], uj),
      await tanusitas(kor[0], uj),
      await tanusitas(kor[2], uj),
      await tanusitas(kor[3], uj));
  }
  await ment(tar, ...mind);

  const jelzes = await tanusitoiTorlodas(tar, KOINO, kor[0].horgony);
  return jelzes.tanusitott === 5 && jelzes.magukbanAllok === 0;
});

proba('⭐⭐⭐ A KONTRASZT: a MEGVETT tanúsítónál a jelzés MEGSZÓLAL', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const mind = [...esemenyek];

  // A megvett tanúsító húsz ÜRES azonosságot tanúsít: senki más nem állít róluk semmit.
  for (let i = 0; i < 20; i++) {
    const hamis = await belepo();
    mind.push(hamis.esemeny, await tanusitas(kor[0], hamis));
  }
  await ment(tar, ...mind);

  const jelzes = await tanusitoiTorlodas(tar, KOINO, kor[0].horgony);
  return jelzes.tanusitott === 20 && jelzes.magukbanAllok === 20;
});

proba('⭐ A JELZÉS A TANÚSÍTÓRA néz, nem a tanúsítottra — a frissen érkezett nem gyanús', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const friss = await belepo();
  await ment(tar, ...esemenyek, friss.esemeny, await meghivas(kor[0], friss));

  // A frissen érkezettnek EGY szála van — de a jelzés nem róla szól, hanem arról, aki
  // sok ilyet cipel. Aki egyetlen embert hívott be, annál a szám 0 tanúsítás.
  const rola = await onalloSzalak(tar, KOINO, friss.horgony);
  const jelzes = await tanusitoiTorlodas(tar, KOINO, kor[0].horgony);
  return rola.osszes === 1 && jelzes.tanusitott === 0 && jelzes.magukbanAllok === 0;
});

proba('⭐ A HIÁNY itt sem vád: ismeretlen horgonynál „nem ellenőrizhető"', async () => {
  const tar = await ujTar();
  const ismeretlen = await belepo();
  const szalak = await onalloSzalak(tar, KOINO, ismeretlen.horgony);
  const jelzes = await tanusitoiTorlodas(tar, KOINO, ismeretlen.horgony);
  return szalak.ellenorizheto === false && jelzes.ellenorizheto === false;
});

proba('🔍 9. SZABÁLY: a jelzés ára a GYANÚVAL arányos, nem a koino méretével', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  const mind = [...esemenyek];

  // A megvett tanúsító tíz üres azonosságot tanúsít…
  for (let i = 0; i < 10; i++) {
    const hamis = await belepo();
    mind.push(hamis.esemeny, await tanusitas(kor[0], hamis));
  }
  // …és MELLETTE ötven olyan e-ember él a koinóban, akihez semmi köze.
  for (let i = 0; i < 50; i++) {
    const idegen = await belepo();
    mind.push(idegen.esemeny, await meghivas(kor[1], idegen));
  }
  await ment(tar, ...mind);

  // ⭐ A jelzés a saját láncából és a tanúsítottak szeleteiből dolgozik — az ötven idegen
  // nem növeli a munkát, és nem is jelenik meg a számban.
  const jelzes = await tanusitoiTorlodas(tar, KOINO, kor[0].horgony);
  return jelzes.tanusitott === 10 && jelzes.magukbanAllok === 10;
});

proba('⛔ A JELZÉS NEM ÍTÉL: a visszatérés csak SZÁMOKAT tartalmaz (D49/b)', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(5);
  await ment(tar, ...esemenyek);

  const jelzes = await tanusitoiTorlodas(tar, KOINO, kor[0].horgony);
  const szalak = await onalloSzalak(tar, KOINO, kor[0].horgony);
  const mezok = [...Object.keys(jelzes), ...Object.keys(szalak)];
  // Se „gyanus", se „pontszam", se „rangsor" — csak tények és az ellenőrizhetőség.
  const tiltott = mezok.some((m) => /gyan|pont|rang|itelet|bizalom/i.test(m));
  return !tiltott;
});


// ===================================
// ⭐⭐ A VISSZAVONÁS (9/c 4.5) — a hurok bezárása
// ===================================
//
// ⚠️ MIT KELL ITT BIZONYÍTANI? Csaba döntése (2026-09-06) a **(b)** volt: a visszavonás
// csak ELŐRE hat. Tehát két dolgot kell egyszerre igazolni, és a kettő ellentmondásnak
// LÁTSZIK, pedig nem az:
//
//   1. aki elveszíti a megbízást, az TÖBBET NEM tanúsíthat;
//   2. de a MÁR KIADOTT tanúsításai ÉRVÉNYBEN MARADNAK.
//
// ⭐ A kettő azért fér meg, mert két KÜLÖN kérdés: a „tanúsíthat-e MOST?" a jelen állapotát
// nézi, a „volt-e joga, amikor aláírta?" pedig a BEMONDÁST (D42-minta).

const visszavonas = allitas('FelhatalmazasVisszavonasa');

/** Egy tanúsító, aki N felhatalmazással rendelkezik — a próbák közös kiindulása. */
async function ujTanusito(kor) {
  const uj = await belepo();
  const allitasok = [await meghivas(kor[0], uj)];
  for (let i = 0; i < TANUSITAS_KELL; i++) allitasok.push(await tanusitas(kor[i], uj));
  const felhatalmazok = [];
  const jegyek = [];   // a felhatalmazas-esemenyek azonositoi — ezekre hivatkozik a tanusitas
  for (let i = 0; i < FELHATALMAZAS_KELL; i++) {
    const f = await felhatalmazas(kor[i], uj);
    allitasok.push(f);
    felhatalmazok.push(kor[i]);
    jegyek.push(f.azonosito);
  }
  return { uj, allitasok, felhatalmazok, jegyek };
}

proba('⭐ A VISSZAVONÁS UTÁN NEM tanúsíthat többet („az utolsó nyer")', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(FELHATALMAZAS_KELL + 1);
  const { uj, allitasok, felhatalmazok } = await ujTanusito(kor);
  await ment(tar, ...esemenyek, uj.esemeny, ...allitasok);

  const elotte = await tanusithatE(tar, KOINO, uj.horgony);

  // Egyetlen felhatalmazó visszaveszi — ezzel N alá esik.
  await ment(tar, await visszavonas(felhatalmazok[0], uj));
  const utana = await tanusithatE(tar, KOINO, uj.horgony);

  return elotte.igen === true && utana.igen === false;
});

proba('⭐⭐ DE A MÁR KIADOTT TANÚSÍTÁSA ÉRVÉNYBEN MARAD — a múlt befagy (D47, Csaba: „b")', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(FELHATALMAZAS_KELL + 1);
  const { uj, allitasok, felhatalmazok, jegyek } = await ujTanusito(kor);
  await ment(tar, ...esemenyek, uj.esemeny, ...allitasok);

  // Az új tanúsító tanúsít valakit — még a megbízása birtokában.
  const jelolt = await belepo();
  const jeloltAllitasok = [
    await meghivas(kor[0], jelolt),
    await tanusitas(uj, jelolt, { felhatalmazasok: jegyek }),
    await tanusitas(kor[1], jelolt),
    await tanusitas(kor[2], jelolt)
  ];
  await ment(tar, jelolt.esemeny, ...jeloltAllitasok);
  const elotte = await lepcso2E(tar, KOINO, jelolt.horgony);

  // …majd elveszíti a megbízását.
  await ment(tar, await visszavonas(felhatalmazok[0], uj));
  const utana = await lepcso2E(tar, KOINO, jelolt.horgony);

  // ⚠️ A jelölt pénztárcája MEGMARAD — enélkül néhány ember összebeszélve becsületes
  // emberek tömegétől venné el.
  return elotte.igen === true && utana.igen === true;
});

proba('⭐ AZ ÚJRA MEGADOTT felhatalmazás megint érvényes (mindkét irányban „az utolsó nyer")', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(FELHATALMAZAS_KELL + 1);
  const { uj, allitasok, felhatalmazok } = await ujTanusito(kor);
  await ment(tar, ...esemenyek, uj.esemeny, ...allitasok);

  await ment(tar, await visszavonas(felhatalmazok[0], uj));
  const kozben = await tanusithatE(tar, KOINO, uj.horgony);

  await ment(tar, await felhatalmazas(felhatalmazok[0], uj));
  const vegul = await tanusithatE(tar, KOINO, uj.horgony);

  return kozben.igen === false && vegul.igen === true;
});

proba('⛔⭐ AZ ŐSZINTE RÉS: a szabály nem kapja el a lejárt megbízást — DE A JELZÉS IGEN', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(FELHATALMAZAS_KELL + 1);
  const { uj, allitasok, felhatalmazok, jegyek } = await ujTanusito(kor);
  await ment(tar, ...esemenyek, uj.esemeny, ...allitasok);

  // Elveszíti a megbízást…
  await ment(tar, await visszavonas(felhatalmazok[0], uj));

  // …de a régi felhatalmazásokra hivatkozva tovább tanúsít. A SZABÁLY ezt nem tudja
  // elkapni: globális sorrend nélkül nem eldönthető, hogy a visszavonás előbb volt-e.
  const jelolt = await belepo();
  await ment(tar, jelolt.esemeny,
    await tanusitas(uj, jelolt, { felhatalmazasok: jegyek }),
    await tanusitas(kor[1], jelolt), await tanusitas(kor[2], jelolt));
  const szabaly = await lepcso2E(tar, KOINO, jelolt.horgony);

  // ⭐ A JELZÉS VISZONT KIMONDJA A TÉNYT: kevesebb érvényes felhatalmazása van, mint
  // amennyi kellene — mégis tanúsított.
  const allapot = await megbizasAllapota(tar, KOINO, uj.horgony);

  return szabaly.igen === true
      && allapot.felhatalmazasok === FELHATALMAZAS_KELL - 1
      && allapot.visszavontak === 1
      && allapot.tanusitasok === 1;
});

proba('⛔ RONTÁS: a MÁSRÓL szóló visszavonás nem törli az én felhatalmazásomat', async () => {
  const tar = await ujTar();
  const { kor, esemenyek } = await alapitoKor(FELHATALMAZAS_KELL + 1);
  const { uj, allitasok, felhatalmazok } = await ujTanusito(kor);
  const masik = await belepo();
  await ment(tar, ...esemenyek, uj.esemeny, masik.esemeny, ...allitasok);

  // A visszavonás az ÉN szeletembe kerül, de MÁSRÓL szól — nem törölheti az enyémet.
  await ment(tar, await visszavonas(felhatalmazok[0], uj, { kit: masik.eember.szerzo }));

  return (await tanusithatE(tar, KOINO, uj.horgony)).igen === true;
});

// ===================================
// TAKARÍTÁS
// ===================================

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
