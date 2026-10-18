// koino/meres/keresoTarProba.js — A KERESŐ-TÁR önpróbája (D107 L1 (A) — a kereső-réteg ③a)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a kereső-tár azt tartja, amit kell, és csak azt:
//   · egy érvényes bejegyzés (a születés + két tulajdonos pontja) bekerül, a régió halmazában ott van, és a lemezről
//     visszajön — az azonosítója a tartalmának lenyomata (a fogadó maga számolja);
//   · ⛔ a csomag minden eseménye a KAPUN megy át: egy átírt esemény az egész bejegyzést elveti;
//   · ⛔ a tartalom: a fiók kulcsa a cím kulcsa (K1), legalább két különböző tulajdonos pozitív pontja (K3), erre a gondolatra,
//     idegen esemény nincs; a címadó javaslat (K9) a saját címét adja; a megújítás a ④-ig nem érvényes;
//   · ⭐ fiókonként a FRISSEBB marad — mindkét sorrendben ugyanaz (két tartó a különbség után ugyanazt tartja);
//   · a tár korlátos (a legrégebben érkezett megy), a tömörítés a kívül esőt dobja, és amit MÁS folyamat írt, az a
//     `frissit`-tel látszik;
//   · az építő (`bejegyzesekEpitese` — a kézi út és a ④): a cím minden kulcsa alatt egy, a két legtöbb pontú tulajdonossal.

import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  keresoTarNyitasa, bejegyzesBefogadasa, bejegyzesAzonositoja, bejegyzesekEpitese, bejegyzesAlakja, BEJEGYZES_TULAJDONOS_MIN,
  bejegyzesSzerzoi, FUGGO_HANYAD
} from '../js/tar/keresoTar.js';
import { cimKulcsai, bejegyzesHelye, regiobaEsik } from '../js/csere/keresoReteg.js';
import { lenyomatDarabja } from '../js/csere/cimjegyzek.js';
import { megujitasKeszitese, MEGUJITAS_ELETTARTAM } from '../js/tar/keresoMegujitas.js';
import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A KERESŐ-TÁR (D107 L1 — a kereső-réteg ③a)');

const KOINO = 'kereso-tar-proba';
const mappak = [];
const ujMappa = async () => { const m = await mkdtemp(join(tmpdir(), 'koino-keresotar-')); mappak.push(m); return m; };

/** Egy gondolat két (vagy több) tulajdonossal: a születés és a pont-eseményeik. */
async function gondolatTulajdonosokkal(cim, pontok = [30, 20]) {
  const szerzok = [];
  for (let i = 0; i < pontok.length; i++) szerzok.push(await ujEember(KOINO));
  const szuletes = await szerzok[0].tesz('GondolatLetrehozas', { cim, meret: 10 });
  const pontEsemenyek = [];
  for (let i = 0; i < pontok.length; i++) {
    pontEsemenyek.push(await szerzok[i].tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: pontok[i] }));
  }
  return { szerzok, szuletes, pontEsemenyek };
}

proba('⭐⭐ Egy érvényes bejegyzés bekerül, a régió halmazában ott van, és a lemezről visszajön', async () => {
  const mappa = await ujMappa();
  const tar = await keresoTarNyitasa(KOINO, mappa);
  const { szuletes, pontEsemenyek } = await gondolatTulajdonosokkal('Közös park a falu szélén');
  const [b] = bejegyzesekEpitese({ szuletes, pontEsemenyek });
  const r = await bejegyzesBefogadasa(tar, b);
  const id = bejegyzesAzonositoja(b);
  const h = bejegyzesHelye(b.k, b.g, 0);
  const d = lenyomatDarabja(h, 3);
  const ujra = await keresoTarNyitasa(KOINO, mappa);
  return r.uj && r.azonosito === id && tar.darab() === 1 && tar.regioHalmaza(0, 0n).includes(id)
    && tar.regioHalmaza(3, d).includes(id) && !tar.regioHalmaza(3, d ^ 1n).includes(id)
    && ujra.darab() === 1 && ujra.bejegyzes(id)?.g === szuletes.azonosito
    && (await ujra.esemeny(szuletes.azonosito))?.azonosito === szuletes.azonosito;
});

// ⛔ 3. szabály. Rontás: a befogadás a kaput kihagyja → az átírt cím is bekerül → bukik.
proba('⛔ A csomag minden eseménye a KAPUN megy át — egy átírt esemény (más cím) az egész bejegyzést elveti', async () => {
  const tar = await keresoTarNyitasa(KOINO, await ujMappa());
  const { szuletes, pontEsemenyek } = await gondolatTulajdonosokkal('Közös park');
  const hamis = { ...szuletes, adat: { ...szuletes.adat, cim: 'Hamis park' } };
  const k = cimKulcsai('Hamis park')[0];
  const r = await bejegyzesBefogadasa(tar, { k, s: 0, g: szuletes.azonosito, esemenyek: [hamis, ...pontEsemenyek], m: null });
  return !r.uj && /kapun/.test(r.ok) && tar.darab() === 0 && (await tar.esemeny(pontEsemenyek[0].azonosito)) === null;
});

// Rontás: a kulcs-ellenőrzés kikapcsolva (`cimKulcsai(cim).includes(k)`) → a „hamis” fiók is bekerül → bukik.
proba('⛔ A fiók kulcsa a cím kulcsa (K1 — a tartó maga számolja): más szó fiókjába nem kerülhet', async () => {
  const tar = await keresoTarNyitasa(KOINO, await ujMappa());
  const { szuletes, pontEsemenyek } = await gondolatTulajdonosokkal('Közös park');
  const r = await bejegyzesBefogadasa(tar, { k: 'e:iskola', s: 0, g: szuletes.azonosito, esemenyek: [szuletes, ...pontEsemenyek], m: null });
  return !r.uj && /kulcsa/.test(r.ok) && tar.darab() === 0;
});

// Rontás: a tulajdonos-szám nem számít → egy tulajdonossal is bekerül → bukik.
proba('⛔ K3: legalább két KÜLÖNBÖZŐ tulajdonos pozitív pontja kell, erre a gondolatra — és idegen esemény nincs a csomagban', async () => {
  const tar = await keresoTarNyitasa(KOINO, await ujMappa());
  const { szerzok, szuletes, pontEsemenyek } = await gondolatTulajdonosokkal('Közös park');
  const k = cimKulcsai('Közös park')[0];
  const egy = await bejegyzesBefogadasa(tar, { k, s: 0, g: szuletes.azonosito, esemenyek: [szuletes, pontEsemenyek[0], pontEsemenyek[0]], m: null });
  const egyedul = await bejegyzesBefogadasa(tar, { k, s: 0, g: szuletes.azonosito, esemenyek: [szuletes, pontEsemenyek[0]], m: null });
  const masik = await szerzok[1].tesz('GondolatLetrehozas', { cim: 'Más', meret: 1 });
  const masikPont = await szerzok[1].tesz('TudatpontRendezes', { entitas: masik.azonosito, pont: 5 });
  const rosszHelyre = await bejegyzesBefogadasa(tar, { k, s: 0, g: szuletes.azonosito, esemenyek: [szuletes, pontEsemenyek[0], masikPont], m: null });
  const idegen = await bejegyzesBefogadasa(tar, { k, s: 0, g: szuletes.azonosito, esemenyek: [szuletes, ...pontEsemenyek, masik], m: null });
  // ⚠️ Az alak-ellenőrzés a túl rövid csomagot már elveti — ezért egy ALAKRA hibátlan csomag is kell, amelyben csak a
  // tulajdonosok száma kevés (a születés, egy pont, és egy ugyanazt a címet adó javaslat): ez a TARTALOM szabályát méri.
  const javaslat = await szerzok[1].tesz('Javaslat', {
    erintettek: [{ entitas: szuletes.azonosito, muvelet: 'Modositas', valtozas: { cim: 'Közös park' } }], fajta: 'szerkesztesi'
  });
  const egyTulajdonos = await bejegyzesBefogadasa(tar, { k, s: 0, g: szuletes.azonosito, esemenyek: [szuletes, pontEsemenyek[0], javaslat], m: null });
  return BEJEGYZES_TULAJDONOS_MIN === 2 && !egy.uj && !egyedul.uj && /nem erre/.test(rosszHelyre.ok) && /idegen/.test(idegen.ok)
    && !egyTulajdonos.uj && /kevesebb tulajdonos/.test(egyTulajdonos.ok) && tar.darab() === 0;
});

// ⭐ K9. Rontás: a javaslat címe nem számít (a születésé marad) → az új szó fiókja elutasít → bukik.
proba('⭐ K9: a címadó javaslattal a javasolt cím kulcsa érvényes — a régi címé nem', async () => {
  const tar = await keresoTarNyitasa(KOINO, await ujMappa());
  const { szerzok, szuletes, pontEsemenyek } = await gondolatTulajdonosokkal('Régi név');
  const javaslat = await szerzok[1].tesz('Javaslat', {
    erintettek: [{ entitas: szuletes.azonosito, muvelet: 'Modositas', valtozas: { cim: 'Iskolakert' } }], fajta: 'szerkesztesi'
  });
  const epitve = bejegyzesekEpitese({ szuletes, javaslat, pontEsemenyek });
  const r = await bejegyzesBefogadasa(tar, epitve[0]);
  const regi = await bejegyzesBefogadasa(tar, { ...epitve[0], k: 'e:régi' });
  return epitve.every((b) => b.esemenyek.includes(javaslat)) && epitve.map((b) => b.k).join(',') === cimKulcsai('Iskolakert').join(',')
    && r.uj && !regi.uj && /kulcsa/.test(regi.ok);
});

// ⭐ D107 L3 (④a). Rontás: a megújítás ellenőrzése kihagyva → az idegené is bekerül → bukik; a frissesség nem a megújítás
// ideje → a megújított nem írja felül a régit → bukik.
proba('⭐⛔ A megújítás (L3): a tulajdonosé érvényes és ÚJ elem (a régit felülírja), a nem tulajdonosé a tartalomnál bukik', async () => {
  const tar = await keresoTarNyitasa(KOINO, await ujMappa());
  const { szerzok, szuletes, pontEsemenyek } = await gondolatTulajdonosokkal('Közös park');
  const [regi] = bejegyzesekEpitese({ szuletes, pontEsemenyek });
  await bejegyzesBefogadasa(tar, regi);
  const jwk = async (e) => crypto.subtle.exportKey('jwk', e.kulcspar.privateKey);
  const kulcs = await jwk(szerzok[1]);
  const [uj] = bejegyzesekEpitese({ szuletes, pontEsemenyek,
    megujitas: (esemenyek) => megujitasKeszitese(kulcs, szerzok[1].szerzo, { koino: KOINO, g: szuletes.azonosito, esemenyek,
      ido: Date.now() + 5000 }) });
  const r = await bejegyzesBefogadasa(tar, uj);
  const idegen = await ujEember(KOINO);
  const ik = await jwk(idegen);
  const [hamis] = bejegyzesekEpitese({ szuletes, pontEsemenyek,
    megujitas: (esemenyek) => megujitasKeszitese(ik, idegen.szerzo, { koino: KOINO, g: szuletes.azonosito, esemenyek,
      ido: Date.now() + 9000 }) });
  const h = await bejegyzesBefogadasa(tar, hamis);
  const halmaz = tar.regioHalmaza(0, 0n);
  // ⚠️ A FRISSEBB nyer — akkor is, ha az azonosítója a NAGYOBB (különben a holtverseny-döntő, a kisebb azonosító, véletlenül
  // ugyanazt adná, és a rontás csak az esetek felében bukna): egy későbbi megújítás, amelynek az azonosítója nagyobb.
  let uj2 = null;
  for (let d = 9000; d < 200000 && !uj2; d += 1000) {
    const [x] = bejegyzesekEpitese({ szuletes, pontEsemenyek,
      megujitas: (esemenyek) => megujitasKeszitese(kulcs, szerzok[1].szerzo, { koino: KOINO, g: szuletes.azonosito, esemenyek,
        ido: Date.now() + d }) });
    if (bejegyzesAzonositoja(x) > bejegyzesAzonositoja(uj)) uj2 = x;
  }
  const tar2 = await keresoTarNyitasa(KOINO, await ujMappa());
  await bejegyzesBefogadasa(tar2, uj2);
  await bejegyzesBefogadasa(tar2, uj);
  const halmaz2 = tar2.regioHalmaza(0, 0n);
  if (!(halmaz2.length === 1 && halmaz2[0] === bejegyzesAzonositoja(uj2))) return false;
  return uj.m?.szerzo === szerzok[1].szerzo && bejegyzesAzonositoja(uj) !== bejegyzesAzonositoja(regi) && r.uj
    && halmaz.length === 1 && halmaz[0] === bejegyzesAzonositoja(uj) && !h.uj && /nem a csomag tulajdonosa/.test(h.ok)
    && bejegyzesAlakja({ ...uj, m: { szerzo: 'x' } }) === null;
});

// ⭐ D107 L3 (④a — a ⑥ magja): a lejárat bárkinél ugyanaz. Rontás: a lejárat-ellenőrzés kihagyva → a lejárt is bekerül, és a
// halmazban marad → bukik.
proba('⛔ a LEJÁRT bejegyzés nem kerül be, a régió halmazából kimarad, a tömörítés és a megnyitás eldobja (a ⑥ magja)', async () => {
  const mappa = await ujMappa();
  let ora = Date.now();
  const tar = await keresoTarNyitasa(KOINO, mappa, { most: () => ora });
  const { szuletes, pontEsemenyek } = await gondolatTulajdonosokkal('Közös park');
  const [b] = bejegyzesekEpitese({ szuletes, pontEsemenyek });
  const kesobb = await keresoTarNyitasa(KOINO, await ujMappa(), { most: () => Date.now() + MEGUJITAS_ELETTARTAM + 1000 });
  const elutasitva = await bejegyzesBefogadasa(kesobb, b);
  const bent = (await bejegyzesBefogadasa(tar, b)).uj && tar.regioHalmaza(0, 0n).length === 1;
  ora += MEGUJITAS_ELETTARTAM + 1000;
  const halmazbanNincs = tar.regioHalmaza(0, 0n).length === 0 && tar.regioBejegyzesei(0, 0n).length === 0;
  const ujra = await keresoTarNyitasa(KOINO, mappa, { most: () => ora });
  const kidobva = await tar.tomorites();
  return !elutasitva.uj && /lejárt/.test(elutasitva.ok) && bent && halmazbanNincs && ujra.darab() === 0 && kidobva === 1
    && tar.darab() === 0;
});

// ⭐ Két tartó a különbség után ugyanazt tartja. Rontás: a régi felülírja az újat (vagy mindkettő marad) → bukik.
proba('⭐⭐ Fiókonként a FRISSEBB marad — mindkét érkezési sorrendben ugyanaz a bejegyzés', async () => {
  const { szerzok, szuletes, pontEsemenyek } = await gondolatTulajdonosokkal('Közös park');
  const [regi] = bejegyzesekEpitese({ szuletes, pontEsemenyek });
  const harmadik = await ujEember(KOINO);
  const ujPont = await harmadik.tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: 90 }, Date.now() + 5000);
  const [uj] = bejegyzesekEpitese({ szuletes, pontEsemenyek: [...pontEsemenyek, ujPont] });
  void szerzok;
  const t1 = await keresoTarNyitasa(KOINO, await ujMappa());
  const t2 = await keresoTarNyitasa(KOINO, await ujMappa());
  await bejegyzesBefogadasa(t1, regi); await bejegyzesBefogadasa(t1, uj);
  await bejegyzesBefogadasa(t2, uj); const r = await bejegyzesBefogadasa(t2, regi);
  const h1 = t1.regioHalmaza(0, 0n);
  const h2 = t2.regioHalmaza(0, 0n);
  return uj.esemenyek.includes(ujPont) && h1.length === 1 && h2.length === 1 && h1[0] === h2[0] && h1[0] === bejegyzesAzonositoja(uj)
    && !r.uj;
});

// Rontás: a korlát nem számít → mind a négy marad → bukik.
proba('⭐ A tár korlátos (a legrégebben érkezett megy) — és a tömörítés a kívül esőt dobja', async () => {
  const mappa = await ujMappa();
  let ora = 1000;
  const minta = await gondolatTulajdonosokkal('Minta park');
  const egyBajt = Buffer.byteLength(JSON.stringify({ b: bejegyzesekEpitese(minta)[0], erkezett: 1 })) + 1;
  const tar = await keresoTarNyitasa(KOINO, mappa, { korlat: Math.floor(egyBajt * 3.5), most: () => ora });
  const idk = [];
  for (const cim of ['Első park', 'Második park', 'Harmadik park', 'Negyedik park']) {
    const g = await gondolatTulajdonosokkal(cim);
    const [b] = bejegyzesekEpitese(g);
    ora += 10;
    await bejegyzesBefogadasa(tar, b);
    idk.push(bejegyzesAzonositoja(b));
  }
  const korlatos = tar.darab() < 4 && tar.bejegyzes(idk[0]) === null && tar.bejegyzes(idk[3]) !== null;
  const h = (id) => bejegyzesHelye(tar.bejegyzes(id).k, tar.bejegyzes(id).g, 0);
  const marad = idk[3];
  const kidobva = await tar.tomorites((b, hely) => hely === h(marad));
  const ujra = await keresoTarNyitasa(KOINO, mappa);
  return korlatos && kidobva >= 1 && tar.darab() === 1 && ujra.darab() === 1 && ujra.bejegyzes(marad) !== null
    && regiobaEsik(h(marad), 0, 0n);
});

// ⭐ Több folyamat (az őrjárat és a kézi `kereso behoz`). Rontás: a `frissit` nem olvas → bukik.
proba('⭐ Amit MÁS folyamat fűzött hozzá, az a `frissit` után látszik (és az újraírt fájlt újraolvassa)', async () => {
  const mappa = await ujMappa();
  const a = await keresoTarNyitasa(KOINO, mappa);
  const b = await keresoTarNyitasa(KOINO, mappa);
  const g = await gondolatTulajdonosokkal('Közös park');
  const [bej] = bejegyzesekEpitese(g);
  await bejegyzesBefogadasa(b, bej);
  const elotte = a.darab();
  const lett = await a.frissit();
  const kozben = a.darab();
  await b.tomorites(() => false);
  await a.frissit();
  const kiurult = a.darab() === 0;
  // ⭐ Az AZONOS hosszú újraírás is látszik (a függő jel 1 → 0 — mérve: a hossz nem változik): a generáció-jel alapján.
  const tagok = new Set();
  const tagE = async (sz) => (tagok.has(sz) ? true : null);
  const m2 = await ujMappa();
  const x = await keresoTarNyitasa(KOINO, m2, { tagE });
  const y = await keresoTarNyitasa(KOINO, m2, { tagE });
  const [bej2] = bejegyzesekEpitese(await gondolatTulajdonosokkal('Másik park'));
  await bejegyzesBefogadasa(x, bej2);
  await y.frissit();
  const yFuggo = y.fuggoDarab() === 1;
  for (const sz of bejegyzesSzerzoi(bej2)) tagok.add(sz);
  await x.fuggokFrissitese();
  await y.frissit();
  return elotte === 0 && lett && kozben === 1 && kiurult && yFuggo && y.fuggoDarab() === 0 && y.regioHalmaza(0, 0n).length === 1;
});

// ⭐ A sérült sor nem dönti el a tárat (gyorsítótár). Rontás: a beolvasás a sérült soron elhasal → bukik.
proba('A sérült és a hamis sort a megnyitás átlépi — a többi megmarad', async () => {
  const mappa = await ujMappa();
  const tar = await keresoTarNyitasa(KOINO, mappa);
  const g = await gondolatTulajdonosokkal('Közös park');
  const [b] = bejegyzesekEpitese(g);
  await bejegyzesBefogadasa(tar, b);
  const fajl = join(mappa, 'kereso', 'bejegyzesek.jsonl');
  const hamis = JSON.stringify({ b: { ...b, k: 'e:iskola' }, erkezett: 1 });
  await writeFile(fajl, (await readFile(fajl, 'utf8')) + '{csonka\n' + hamis + '\n', 'utf8');
  const ujra = await keresoTarNyitasa(KOINO, mappa);
  return ujra.darab() === 1 && ujra.bejegyzes(bejegyzesAzonositoja(b)) !== null;
});

// Rontás: az építő az első két pont-eseményt veszi (nem a legtöbb pontút) → a 10 pontos benne marad → bukik.
proba('Az építő: a cím minden kulcsa alatt egy bejegyzés, a két legtöbb pontú tulajdonossal; egy tulajdonossal semmi', async () => {
  const g = await gondolatTulajdonosokkal('Nagy közös parkban', [10, 40, 30]);
  const bk = bejegyzesekEpitese(g);
  const pontjai = bk[0].esemenyek.filter((e) => e.tipus === 'TudatpontRendezes').map((e) => e.adat.pont).sort((a, b) => a - b);
  const egyedul = await gondolatTulajdonosokkal('Magányos', [10]);
  return bk.length === cimKulcsai('Nagy közös parkban').length && bk.every((b) => b.s === 0 && b.esemenyek[0] === g.szuletes)
    && pontjai.join(',') === '30,40' && bejegyzesekEpitese(egyedul).length === 0;
});

// ===================================
// ⭐⭐ ④b — A TAGSÁG (K3): csak az ellenőrzött tag-szerzők bejegyzése kerül az indexbe
// ===================================

// Rontás: a régió halmaza a függőt is adja → bukik; a `fuggokFrissitese` nem emel → bukik; a függő jel nem marad meg a lemezen
// (újranyitva függő lesz) → bukik.
proba('⭐⭐ ④b: a nem ellenőrzött tagságú szerző bejegyzése FÜGGŐ — nincs a régió halmazában; a tagság kiderülése után az indexben', async () => {
  const mappa = await ujMappa();
  const tagok = new Set();
  const tagE = async (sz) => (tagok.has(sz) ? true : null);
  const tar = await keresoTarNyitasa(KOINO, mappa, { tagE });
  const g = await gondolatTulajdonosokkal('Közös park');
  const [b] = bejegyzesekEpitese(g);
  const r = await bejegyzesBefogadasa(tar, b);
  const elotte = r.uj && r.fuggo === true && tar.regioHalmaza(0, 0n).length === 0 && tar.fuggoDarab() === 1;
  const sz = bejegyzesSzerzoi(b);
  tagok.add(sz[0]);                                   // csak egy szerző tag — még függő
  const reszben = (await tar.fuggokFrissitese()) === 0 && tar.fuggoDarab() === 1;
  for (const x of sz) tagok.add(x);
  const emelt = (await tar.fuggokFrissitese()) === 1 && tar.regioHalmaza(0, 0n).length === 1 && tar.fuggoDarab() === 0;
  const ujra = await keresoTarNyitasa(KOINO, mappa, { tagE });
  return sz.length === 2 && elotte && reszben && emelt && ujra.regioHalmaza(0, 0n).length === 1 && ujra.fuggoDarab() === 0;
});

// ⭐ Minden szerzőt megkérdezünk (a nem tudottak mind a függő tagság-kérdések közé kerülnek). Rontás: az első nem tudottnál
// megállunk → a második szerzőt nem kérdezzük → bukik.
proba('⭐ ④b: a tagság-ellenőrző a bejegyzés MINDEN szerzőjét megkérdezi (a születésé és a tulajdonosoké)', async () => {
  const kerdezett = new Set();
  const tar = await keresoTarNyitasa(KOINO, await ujMappa(), { tagE: async (sz) => { kerdezett.add(sz); return null; } });
  const g = await gondolatTulajdonosokkal('Közös park', [30, 20, 10]);
  const [b] = bejegyzesekEpitese(g, { tulajdonosok: 3 });
  await bejegyzesBefogadasa(tar, b);
  return bejegyzesSzerzoi(b).length === 3 && bejegyzesSzerzoi(b).every((x) => kerdezett.has(x));
});

// ⛔ A kulcs ingyen van: a nem tag szerzők bejegyzései nem szoríthatják ki a valódiakat. Rontás: a kiszorítás nem a függővel
// kezd (vagy a függők részének nincs korlátja) → egy valódi kiesik, vagy a függők a tized fölött → bukik.
proba('⛔ ④b: a függők nem szorítják ki a valódiakat — együtt legfeljebb a korlát tizede, helyhiánynál előbb a függő megy', async () => {
  const tagok = new Set();
  const minta = bejegyzesekEpitese(await gondolatTulajdonosokkal('Minta park'))[0];
  const egy = Buffer.byteLength(JSON.stringify({ b: minta, erkezett: 1, f: 1 })) + 1;
  const korlat = egy * 12;
  let ora = 1000;
  const tar = await keresoTarNyitasa(KOINO, await ujMappa(), { korlat, most: () => ora, tagE: async (sz) => (tagok.has(sz) ? true : null) });
  const valodiak = [];
  for (let i = 0; i < 6; i++) {
    const [b] = bejegyzesekEpitese(await gondolatTulajdonosokkal('Valódi park ' + i));
    for (const x of bejegyzesSzerzoi(b)) tagok.add(x);
    ora += 10;
    await bejegyzesBefogadasa(tar, b);
    valodiak.push(bejegyzesAzonositoja(b));
  }
  for (let i = 0; i < 10; i++) {
    const [b] = bejegyzesekEpitese(await gondolatTulajdonosokkal('Kamu park ' + i));
    ora += 10;
    await bejegyzesBefogadasa(tar, b);
  }
  const fuggoMeret = tar.fuggoDarab() * egy;
  return FUGGO_HANYAD === 10 && valodiak.every((id) => tar.bejegyzes(id) !== null) && fuggoMeret <= korlat / FUGGO_HANYAD + egy
    && tar.fuggoDarab() <= 2;
});

export default async function (csendes) {
  const eredmeny = await futtatas(csendes);
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
