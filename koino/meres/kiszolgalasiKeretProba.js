// koino/meres/kiszolgalasiKeretProba.js — A KISZOLGÁLÁSI KERET KÖNYVELÉSE önpróbája (D109 — KK2, KK3, KK5)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a mérő azt fogja meg, amit kell, és csak azt:
//   · a KÖTÉS (a saját cserém) soha nem kerül a keret alá — csak könyvelődik (D108);
//   · a KÖZÖS keret (bájt ÉS kérésszám, csúszó óránként) megáll, és megmondja, mikor érdemes újra próbálni;
//   · egy TÁRS legfeljebb a negyedét, az IDEGENEK együtt legfeljebb a felét vihetik — egy ismert tag ekkor is kap;
//   · a maradék bájt a törzs részleges kiszolgálásához (KK6) — a legszűkebb kötél szerint;
//   · a társ kulcsa: a személy, a tábla-kulcs, végül a cím (KK3);
//   · a jegyzék korlátos (sok új kulcs sem növeli a végtelenségig — a közös keretben attól még benne van, amit vittek).

import {
  ujKeret, keretFeljegyzes, keretItelete, keretAllasa, keretHatara, tarsKulcsa, tarsOsztalya, keretKotesE,
  KERET_ALAP, KERET_MINDENT, KERET_ABLAK, TARS_HANYAD, IDEGEN_HANYAD, TARS_JEGYZEK_KORLAT, KESOBB_MIN, KOTES_MIN_TALALKOZAS
} from '../js/csere/kiszolgalasiKeret.js';

import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A KISZOLGÁLÁSI KERET (D109 — KK2, KK3, KK5)');

const T0 = Date.UTC(2026, 9, 17, 12, 0, 0);
const MB = 1024 * 1024;

proba('⭐ A kiinduló számok (KK5): alap 20 MB + 600 kérés, „mindent” 100 MB + 3000, óránként; a társ ¼, az idegenek ½', () =>
  KERET_ALAP.bajt === 20 * MB && KERET_ALAP.keres === 600 && KERET_MINDENT.bajt === 100 * MB && KERET_MINDENT.keres === 3000
  && KERET_ABLAK === 3600 * 1000 && TARS_HANYAD === 4 && IDEGEN_HANYAD === 2);

// ⭐ D108: a saját cserém nem kerül a keret alá. Rontás: a kötés is a közös keretre fut → a túlfutás után megáll → bukik.
proba('⭐⭐ A KÖTÉS soha nem kerül a keret alá — de könyvelődik (a keret után is szabad, és a közöset nem fogyasztja)', () => {
  const k = ujKeret({ bajt: 1000, keres: 10 });
  for (let i = 0; i < 50; i++) keretFeljegyzes(k, { tars: 't:barat', osztaly: 'kotes', bajt: 500, keres: 1, most: T0 + i });
  const it = keretItelete(k, { tars: 't:barat', osztaly: 'kotes', most: T0 + 100 });
  const masik = keretItelete(k, { tars: 't:idegen', osztaly: 'idegen', most: T0 + 100 });
  const a = keretAllasa(k, T0 + 100);
  return it.szabad && it.maradekBajt === Infinity && masik.szabad && a.kotes.keres === 50 && a.osszes.keres === 0;
});

// Rontás: a kérésszám nem számít (csak a bájt) → 600 apró kérés után is szabad → bukik.
proba('⭐⭐ A KÖZÖS keret megáll (a kérésszám is) — és megmondja, mikor érdemes újra; az ablak után újra szabad', () => {
  const k = ujKeret({ bajt: 100 * MB, keres: 40 });
  // 40 kérés, sok különböző tag-társtól (egyik sem éri el a saját negyedét)
  for (let i = 0; i < 40; i++) keretFeljegyzes(k, { tars: 's:tag' + i, osztaly: 'tag', bajt: 100, keres: 1, most: T0 + i * 1000 });
  const most = T0 + 60 * 1000;
  const tele = keretItelete(k, { tars: 's:uj', osztaly: 'tag', most });
  const kesobb = keretItelete(k, { tars: 's:uj', osztaly: 'tag', most: T0 + KERET_ABLAK + 60 * 1000 + 1 });
  return !tele.szabad && tele.ok === 'a közös keret' && tele.kesobb >= KESOBB_MIN && tele.kesobb <= 3600
    && kesobb.szabad;
});

// Rontás: a bájt nem számít → egy nagy törzs-sorozat után is szabad → bukik.
proba('⭐ A bájt is mérce: a nagy válaszok a keretet kérésszámtól függetlenül kimerítik', () => {
  const k = ujKeret({ bajt: 10 * MB, keres: 1000 });
  keretFeljegyzes(k, { tars: 's:a', osztaly: 'tag', bajt: 6 * MB, keres: 1, most: T0 });
  keretFeljegyzes(k, { tars: 's:b', osztaly: 'tag', bajt: 4 * MB, keres: 1, most: T0 });
  const it = keretItelete(k, { tars: 's:c', osztaly: 'tag', most: T0 + 1000 });
  return !it.szabad && it.ok === 'a közös keret';
});

// Rontás: a társankénti rész kikapcsolva → a mohó társ a negyed után is kap → bukik.
proba('⭐⭐ Egy TÁRS legfeljebb a negyedét viheti — közben egy másik társ kap', () => {
  const k = ujKeret({ bajt: 100 * MB, keres: 400 });
  for (let i = 0; i < 100; i++) keretFeljegyzes(k, { tars: 's:moho', osztaly: 'tag', bajt: 10, keres: 1, most: T0 + i });
  const moho = keretItelete(k, { tars: 's:moho', osztaly: 'tag', most: T0 + 1000 });
  const masik = keretItelete(k, { tars: 's:masik', osztaly: 'tag', most: T0 + 1000 });
  return !moho.szabad && moho.ok === 'a társ része' && masik.szabad;
});

// ⭐ A tábla-kulcs ingyen van: a sok új kulccsal érkező idegen egyenként a negyed alatt marad, de együtt a felét sem lépheti át
// — és egy ismert tag ekkor is kap. Rontás: az idegenek része kikapcsolva → a 101. idegen is kap → bukik.
proba('⭐⭐ A sok új kulcsú IDEGEN együtt legfeljebb a felét viszi — egy ismert tag ekkor is kap', () => {
  const k = ujKeret({ bajt: 100 * MB, keres: 200 });
  for (let i = 0; i < 100; i++) keretFeljegyzes(k, { tars: 't:uj' + i, osztaly: 'idegen', bajt: 10, keres: 1, most: T0 + i });
  const idegen = keretItelete(k, { tars: 't:uj999', osztaly: 'idegen', most: T0 + 1000 });
  const tag = keretItelete(k, { tars: 's:ismeros', osztaly: 'tag', most: T0 + 1000 });
  return !idegen.szabad && idegen.ok === 'az idegenek része' && tag.szabad;
});

// Rontás: a maradék a közös keretből számolva (a társ része nélkül) → túl nagy → bukik.
proba('⭐ A maradék bájt a legszűkebb kötél szerint (a törzs részleges kiszolgálásához — KK6)', () => {
  const k = ujKeret({ bajt: 40 * MB, keres: 1000 });
  keretFeljegyzes(k, { tars: 't:x', osztaly: 'idegen', bajt: 8 * MB, keres: 1, most: T0 });
  const it = keretItelete(k, { tars: 't:x', osztaly: 'idegen', most: T0 + 1000 });
  // a társ negyede 10 MB, ebből 8 elment → 2 MB maradt (az idegenek fele 20 MB-ból 12, a közös 32 MB-ból több)
  return it.szabad && it.maradekBajt === 2 * MB;
});

proba('⭐ A társ kulcsa (KK3): a személy, különben a tábla-kulcs, különben a cím (IP); és az osztály', () =>
  tarsKulcsa({ szemely: 'S', tabla: 'T', cim: '1.2.3.4' }) === 's:S' && tarsKulcsa({ tabla: 'T', cim: '1.2.3.4' }) === 't:T'
  && tarsKulcsa({ cim: '1.2.3.4' }) === 'c:1.2.3.4' && tarsKulcsa({}) === null
  && tarsOsztalya({ kotes: true, tag: true }) === 'kotes' && tarsOsztalya({ tag: true }) === 'tag' && tarsOsztalya({}) === 'idegen');

// Rontás: a jegyzék nincs korlátozva → a méret túlnő → bukik.
proba('⭐ A jegyzék korlátos — sok új kulcs sem növeli a végtelenségig, de a közösben benne marad, amit vittek', () => {
  const k = ujKeret({ bajt: 1e12, keres: 1e9 });
  for (let i = 0; i < TARS_JEGYZEK_KORLAT + 100; i++) keretFeljegyzes(k, { tars: 't:k' + i, osztaly: 'idegen', bajt: 1, keres: 1, most: T0 });
  const a = keretAllasa(k, T0);
  return k.tarsak.size === TARS_JEGYZEK_KORLAT && a.osszes.keres === TARS_JEGYZEK_KORLAT + 100 && !k.tarsak.has('t:k0');
});

proba('A határ cserélhető (a beállítás) — a könyvelés megmarad', () => {
  const k = ujKeret();
  keretFeljegyzes(k, { tars: 's:a', osztaly: 'tag', bajt: 5, keres: 3, most: T0 });
  keretHatara(k, { bajt: 7, keres: 3 });
  const it = keretItelete(k, { tars: 's:b', osztaly: 'tag', most: T0 });
  return k.hatar.bajt === 7 && !it.szabad && keretAllasa(k, T0).osszes.keres === 3;
});

// ⛔ A kötés a keretben csak a RENDSZERES társ: ≥ 3 találkozás, az első ≥ egy keretnyi ideje — különben egy idegen egy-két
// csere után (egy kevés társú készüléken) kötés lenne, és a keret nem fogná. Rontás: a találkozások száma vagy a kor nem
// számít → az új társ is kötés → bukik.
proba('⛔ A kötés csak a RENDSZERES társ: legalább három találkozás, és az első legalább egy keretnyi ideje', () => {
  const most = T0 + 10 * KERET_ABLAK;
  const regi = { talalkozasok: 40, eloszor: T0 };
  const ujonc = { talalkozasok: 1, eloszor: most - 1000 };
  const gyors = { talalkozasok: 5, eloszor: most - 60 * 1000 };
  const harom = { talalkozasok: KOTES_MIN_TALALKOZAS, eloszor: most - KERET_ABLAK };
  return keretKotesE(regi, { most }) && !keretKotesE(ujonc, { most }) && !keretKotesE(gyors, { most })
    && keretKotesE(harom, { most }) && !keretKotesE({ talalkozasok: 2, eloszor: T0 }, { most })
    && !keretKotesE(null, { most }) && keretKotesE(gyors, { most, minKor: 0 });
});

export default futtatas;
