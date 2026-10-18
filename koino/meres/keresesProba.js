// koino/meres/keresesProba.js — A KÉRDÉS TISZTA SZÁMÍTÁSAINAK önpróbája (a kereső-réteg ⑤ — K2 (C), K7, K9)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a kérdező jó helyet kérdez, a tartó jól válaszol, és a kérdező maga ellenőriz:
//   · a terv: a leghosszabb szó előbb, a ≥ 4 jelesnél a szóeleje-fiók (a toldalékos alakokra is teljes), a háromjelesnél az
//     egész szó; a rövid szó kimarad, az azonos fiók egyszer;
//   · a tartó: a helyen lévő bejegyzések közül a TELJES kérdésre illők, a legfrissebbek elöl, korlátosan;
//   · ⛔ a kérdező: a hamis (a fiók nem a cím kulcsa), a nem illő, a más helyre eső találatot eldobja; gondolatonként egyszer;
//     a javasolt címet kimondja (K9);
//   · az osztódott fiók mintája különböző darabokból áll.

import {
  kerdesTerve, helyTalalatai, talalatokEllenorzese, osztottMinta, keresesValaszAlakja, kerdesHelye, KERESES_TALALAT_KORLAT
} from '../js/csere/kereses.js';
import { bejegyzesekEpitese } from '../js/tar/keresoTar.js';
import { bejegyzesHelye } from '../js/csere/keresoReteg.js';
import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A KÉRDÉS (a kereső-réteg ⑤ — K2 (C), K7, K9)');

const KOINO = 'kereses-proba';

async function bejegyzesek(cim, { javaslatCim = null, ido } = {}) {
  const a = await ujEember(KOINO);
  const b = await ujEember(KOINO);
  const szuletes = await a.tesz('GondolatLetrehozas', { cim, meret: 10 }, ido);
  const pontEsemenyek = [await a.tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: 30 }, ido),
    await b.tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: 20 }, ido)];
  const javaslat = javaslatCim ? await b.tesz('Javaslat', {
    erintettek: [{ entitas: szuletes.azonosito, muvelet: 'Modositas', valtozas: { cim: javaslatCim } }], fajta: 'szerkesztesi' }, ido) : null;
  return bejegyzesekEpitese({ szuletes, javaslat, pontEsemenyek });
}
const fiokban = (lista, k) => lista.find((b) => b.k === k);

// Rontás: a rövidebb szó előbb, vagy mindig az egész szó → bukik.
proba('⭐ a terv: a leghosszabb szó előbb, a ≥ 4 jelesnél a szóeleje-fiók, a háromjelesnél az egész szó; a rövid kimarad', () => {
  const t = kerdesTerve('a park és iskola');
  const ketto = kerdesTerve('parkban parkoló');
  const harom = kerdesTerve('kút');
  return t.map((x) => x.kulcs).join() === 'p:isko,p:park' && ketto.length === 1 && ketto[0].kulcs === 'p:park'
    && harom.length === 1 && harom[0].kulcs === 'e:kút' && kerdesTerve('a az').length === 0;
});

// Rontás: a tartó nem a TELJES kérdésre szűr (csak a fiók szavára) → a „park iskola” a csak „park”-ost is adja → bukik.
proba('⭐⭐ a tartó a TELJES kérdésre szűr, a legfrissebbek elöl, korlátosan — a „park” a „parkban”-t is adja', async () => {
  const T = Date.now();
  const a = fiokban(await bejegyzesek('Közös park', { ido: T - 3000 }), 'p:park');
  const b = fiokban(await bejegyzesek('Parkban az iskola', { ido: T - 1000 }), 'p:park');
  const c = fiokban(await bejegyzesek('Iskolai park', { ido: T - 2000 }), 'p:park');
  const helyen = [a, b, c];
  const csakPark = helyTalalatai(helyen, { kerdes: 'park', koino: KOINO });
  const ketSzo = helyTalalatai(helyen, { kerdes: 'park iskola', koino: KOINO });
  const egy = helyTalalatai(helyen, { kerdes: 'park', koino: KOINO, n: 1 });
  return csakPark.length === 3 && csakPark[0] === b && csakPark[2] === a && ketSzo.length === 2 && !ketSzo.includes(a)
    && egy.length === 1 && KERESES_TALALAT_KORLAT === 50;
});

// ⛔ 3. szabály. Rontás: a kérdező a tartó szavát elhiszi (nem ellenőrzi a tartalmat / a szűrőt / a helyet) → bukik.
proba('⛔ a kérdező maga ellenőriz: a hamis, a nem illő és a más helyre eső találatot eldobja; gondolatonként egyszer', async () => {
  const jo = await bejegyzesek('Közös park');
  const b = fiokban(jo, 'p:park');
  const hamis = { ...b, k: 'p:isko' };                 // a fiók nem a cím kulcsa
  const nemIllo = fiokban(await bejegyzesek('Parkoló tér'), 'p:park');
  const hely = bejegyzesHelye('p:park', b.g, 0);
  // ⚠️ Egy MÁSIK gondolat másik fiókja (ugyanaz a gondolat a gondolatonkénti egyesítésen úgyis kiesne — az elfedné a hely-szűrőt).
  const masHelyre = fiokban(await bejegyzesek('Közös park'), 'e:közös');
  // ⚠️ A „Parkoló tér” a „park”-ra helyesen illik (a szó eleje) — a „közös park”-ra nem.
  const r = talalatokEllenorzese([b, b, hamis, nemIllo, masHelyre, { szemet: 1 }], { kerdes: 'közös park', koino: KOINO, hely });
  const r2 = talalatokEllenorzese([nemIllo], { kerdes: 'parkoló', koino: KOINO });
  // ⚠️ Hely NÉLKÜL is (a hely-szűrő különben a tartalom-ellenőrzés hiányát elfedné): a hamis kiesik.
  const helyNelkul = talalatokEllenorzese([hamis], { kerdes: 'közös park', koino: KOINO });
  return r.length === 1 && r[0].g === b.g && r[0].cimForrasa === 'szuletes' && r2.length === 1 && kerdesHelye('p:park') === hely
    && helyNelkul.length === 0;
});

// ⭐ K9. Rontás: a cím forrása nincs kimondva → a javasolt cím születésinek látszik → bukik.
proba('⭐ K9: a javasolt cím találata kimondja a forrását (a kérdező a valódi címmel szűr, amint ismeri)', async () => {
  const lista = await bejegyzesek('Régi név', { javaslatCim: 'Új park' });
  const b = fiokban(lista, 'p:park');
  const r = talalatokEllenorzese([b], { kerdes: 'park', koino: KOINO });
  return r.length === 1 && r[0].cim === 'Új park' && r[0].cimForrasa === 'javaslat';
});

// Rontás: a minta ismétlődő darabot ad → bukik.
proba('Az osztódott fiók mintája különböző darabokból áll; a válasz alakja korlátos', () => {
  let i = 0;
  const veletlen = () => [0.1, 0.1, 0.9][i++ % 3];
  const m1 = osztottMinta(1, veletlen);
  const m0 = osztottMinta(0);
  const v = keresesValaszAlakja({ talalatok: new Array(80).fill(1), meret: 7, osztodott: 2 });
  return m1.length === 2 && m1[0] !== m1[1] && m0.length === 1 && m0[0] === 0n && v.talalatok.length === 50 && v.meret === 7
    && v.osztodott === 2 && keresesValaszAlakja({ osztodott: -1 }).osztodott === null;
});

export default futtatas;
