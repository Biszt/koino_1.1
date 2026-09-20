// koino/meres/dhtProba.js

// A DHT-kliens önpróbája — HÁLÓZAT NÉLKÜL.
//
// A valódi DHT-t a `dhtMeres.js` méri (36. mérés); ez a lap azt bizonyítja, hogy a kliens
// azt csinálja, amit a BEP 44 előír, és hogy a koino elvei rajta is állnak:
//
//   1. a BENCODE kanonikus és szigorú (idegen bájtokat bontunk);
//   2. az aláírt bájtok, a célszám és az aláírás BÁJTRA egyezik a BEP 44 hivatalos
//      tesztvektoraival (bittorrent.org/beps/bep_0044.html);
//   3. a méret-korlátokat a kliens maga őrzi;
//   4. ⭐ egy hurok-címen futó HAMIS DHT-n a feltétel és a visszakeresés TÉNYLEG a
//      keresésen át működik (két különböző belépővel), ⛔ a HAZUDÓ gép bejegyzését elvetjük
//      (3. szabály), és egy halott vagy `get`-et nem ismerő gép nem akasztja meg a keresést.

import { createSocket } from 'node:dgram';
import {
  bencodeKodol, bencodeBont, alairandoBajtok, valtozoCel, valtozatlanCel,
  bejegyzesKeszitese, bejegyzesEllenorzese, tomorCsomopontokBontasa,
  tomorCsomopontokKeszitese, tavolsagOsszevetes, dhtKliens, ERTEK_KORLAT,
  gepekHirdetese, gepekBeolvasztasa, GEP_HIRDETES
} from '../js/csere/dht.js';
import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A DHT-kliens próbája — a hirdetőtábla (BEP 44)');

const hex = (h) => Buffer.from(h, 'hex');
const szoveg = (b) => Buffer.from(b).toString('latin1');

// ===================================
// 1. BENCODE
// ===================================

proba('A bencode KANONIKUS: a szótár kulcsai bájt-sorrendben', () =>
  szoveg(bencodeKodol({ l: [1, 'y'], b: 1, a: 'x' })) === 'd1:a1:x1:bi1e1:lli1e1:yee');

proba('A bencode oda-vissza ugyanazokat a bájtokat adja', () => {
  const eredeti = bencodeKodol({ t: Buffer.from([0, 255]), a: { id: Buffer.alloc(20, 7), n: -42 } });
  return Buffer.compare(bencodeKodol(bencodeBont(eredeti)), eredeti) === 0;
});

proba('⛔ A bontó SZIGORÚ: hibás egész, csonka bájtsor, lezáratlan, szemét a végén, túl mély', () => {
  const rossz = ['i01e', 'i-0e', '5:ab', 'd1:ai1e', 'i1ex', 'l'.repeat(40) + 'e'.repeat(40), 'x'];
  return rossz.every((r) => { try { bencodeBont(Buffer.from(r, 'latin1')); return false; } catch { return true; } });
});

proba('⛔ Egy „__proto__" kulcs nem ír át semmit (prototípus nélküli szótár)', () => {
  const d = bencodeBont(Buffer.from('d9:__proto__i1ee', 'latin1'));
  return Object.getPrototypeOf(d) === null && d.__proto__ === 1 && ({}).__proto__ !== 1;
});

// ===================================
// 2. A BEP 44 TESZTVEKTORAI — bájtra
// ===================================

const V_KULCS = hex('77ff84905a91936367c01360803104f92432fcd904a43511876df5cdf3e7e548');
const V_ERTEK = bencodeKodol('Hello World!');
const V_SIG1 = hex('305ac8aeb6c9c151fa120f120ea2cfb923564e11552d06a5d856091e5e853cff1260d3f39e4999684aa92eb73ffd136e6f4f3ecbfda0ce53a1608ecd7ae21f01');
const V_SIG2 = hex('6834284b6b24c3204eb2fea824d82f88883a3d95e8b4a21b8c0ded553d17d17ddf9a8a7104b1258f30bed3787e6cb896fca78c58f8e03b5f18f14951a87d9a08');
const SO = Buffer.from('foobar');

proba('BEP 44 / 1. vektor: az aláírt bájtok ("3:seqi1e1:v12:Hello World!")', () =>
  szoveg(alairandoBajtok({ seq: 1, v: V_ERTEK })) === '3:seqi1e1:v12:Hello World!');

proba('BEP 44 / 2. vektor: az aláírt bájtok SÓVAL ("4:salt6:foobar3:seqi1e…")', () =>
  szoveg(alairandoBajtok({ salt: SO, seq: 1, v: V_ERTEK })) === '4:salt6:foobar3:seqi1e1:v12:Hello World!');

proba('BEP 44: a célszámok mindhárom vektorra', async () =>
  (await valtozoCel(V_KULCS)).toString('hex') === '4a533d47ec9c7d95b1ad75f576cffc641853b750'
  && (await valtozoCel(V_KULCS, SO)).toString('hex') === '411eba73b6f087ca51a3795d9c8c938d365e32c1'
  && (await valtozatlanCel(V_ERTEK)).toString('hex') === 'e5f96f6f38320f0f33959cb4d3d656452117aadb');

proba('⭐ BEP 44: a hivatalos aláírások ELLENŐRIZHETŐK a mi kódunkkal (sóval és anélkül)', async () =>
  await bejegyzesEllenorzese({ k: V_KULCS, seq: 1, v: V_ERTEK, sig: V_SIG1 })
  && await bejegyzesEllenorzese({ k: V_KULCS, salt: SO, seq: 1, v: V_ERTEK, sig: V_SIG2 }));

proba('⛔ …és a rossz párosítás elbukik (más só, más sorszám, átírt érték)', async () =>
  !await bejegyzesEllenorzese({ k: V_KULCS, seq: 1, v: V_ERTEK, sig: V_SIG2 })
  && !await bejegyzesEllenorzese({ k: V_KULCS, salt: SO, seq: 2, v: V_ERTEK, sig: V_SIG2 })
  && !await bejegyzesEllenorzese({ k: V_KULCS, salt: SO, seq: 1, v: bencodeKodol('Hello World?'), sig: V_SIG2 }));

// ===================================
// 3. A SAJÁT BEJEGYZÉS ÉS A KORLÁTOK
// ===================================

const ujKulcspar = () => crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);

proba('A saját aláírt bejegyzésünk ellenőrizhető — más sóval viszont nem', async () => {
  const b = await bejegyzesKeszitese({ kulcspar: await ujKulcspar(), salt: 'koino', seq: 7, ertek: 'cím' });
  return await bejegyzesEllenorzese({ k: b.k, salt: b.salt, seq: 7, v: b.v, sig: b.sig })
    && !await bejegyzesEllenorzese({ k: b.k, salt: Buffer.from('mas'), seq: 7, v: b.v, sig: b.sig })
    && Buffer.compare(b.cel, await valtozoCel(b.k, Buffer.from('koino'))) === 0;
});

proba('⛔ A méret-korlátokat a kliens maga őrzi (érték ≤ 1000 bájt, só ≤ 64 bájt)', async () => {
  const kulcspar = await ujKulcspar();
  const elbukik = async (be) => { try { await bejegyzesKeszitese({ kulcspar, seq: 1, ...be }); return false; } catch { return true; } };
  const hatar = await bejegyzesKeszitese({ kulcspar, seq: 1, ertek: Buffer.alloc(ERTEK_KORLAT - 4) });
  return hatar.v.length === ERTEK_KORLAT
    && await elbukik({ ertek: Buffer.alloc(ERTEK_KORLAT - 3) })
    && await elbukik({ ertek: 'x', salt: Buffer.alloc(65) });
});

proba('A tömör címek (BEP 5) oda-vissza', () => {
  const eredeti = [{ id: Buffer.alloc(20, 1), cim: '10.0.0.7', port: 6881 },
    { id: Buffer.alloc(20, 2), cim: '192.168.1.200', port: 51413 }];
  const vissza = tomorCsomopontokBontasa(tomorCsomopontokKeszitese(eredeti));
  return vissza.length === 2 && vissza[1].cim === '192.168.1.200' && vissza[1].port === 51413
    && Buffer.compare(vissza[0].id, eredeti[0].id) === 0;
});

// ===================================
// 4. A HAMIS DHT a hurok-címen
// ===================================
//
// Minden hamis gép ISMERI az összes többit (egy igazi gép csak néhányat), és a legközelebbi
// nyolcat adja vissza — így a keresés útja rövid, de VALÓDI: a kliens csak a belépőt ismeri.

// ⭐ KIFELÉ ADVA (2026-09-20): a parancssor-próba is ezt használja — így a TÁBLA bekötése
// (a `tabla` parancs és az őrjárat tábla-ága) **internet nélkül** mérhető. *Egy próba, ami
// a valódi DHT-t hívná, a hálózat hangulatát mérné, nem a kódot.*
export async function hamisHalozat(n, { hazudo = new Set(), csakFindNode = new Set(), nema = new Set(), nemaPut = false } = {}) {
  const gepek = [];
  for (let i = 0; i < n; i++) {
    const halo = createSocket('udp4');
    await new Promise((kesz) => halo.bind(0, '127.0.0.1', kesz));
    gepek.push({ i, halo, id: Buffer.from(crypto.getRandomValues(new Uint8Array(20))),
      cim: '127.0.0.1', port: halo.address().port, tar: new Map() });
  }
  const kozeli = (en, cel) => tomorCsomopontokKeszitese(gepek.filter((g) => g !== en)
    .sort((a, b) => tavolsagOsszevetes(cel, a.id, b.id)).slice(0, 8));

  for (const g of gepek) {
    g.halo.on('message', async (adat, felado) => {
      // A NÉMA gép a többiek listáján szerepel, de soha nem felel — mint a valódi DHT
      // gépeinek kétharmada (mérve: 36 lejárat 54 kérdésből).
      if (nema.has(g.i)) return;
      let u;
      try { u = bencodeBont(adat); } catch { return; }
      const q = Buffer.isBuffer(u.q) ? u.q.toString() : '';
      const a = u.a ?? {};
      const kuld = (uzenet) => g.halo.send(bencodeKodol({ t: u.t, ...uzenet }), felado.port, felado.address);
      const valasz = (r) => kuld({ y: 'r', r: { id: g.id, ...r } });
      const hiba = (kod, szoveg) => kuld({ y: 'e', e: [kod, szoveg] });

      if (q === 'find_node') return valasz({ nodes: kozeli(g, a.target) });
      if (q === 'get') {
        if (csakFindNode.has(g.i)) return hiba(204, 'Method Unknown');
        const b = g.tar.get(a.target.toString('hex'));
        const tarolt = !b ? {} : hazudo.has(g.i)
          // ⛔ A HAZUDÓ: a valódi kulcsot és aláírást adja, de ÁTÍRT értékkel és NAGYOBB
          // sorszámmal — hogy „az újabb nyer" szabály szerint ő nyerjen, ha nem ellenőrzünk.
          ? { k: b.k, seq: b.seq + 1, sig: b.sig, v: 'HAMIS' }
          : { k: b.k, seq: b.seq, sig: b.sig, v: b.v };
        return valasz({ nodes: kozeli(g, a.target), token: Buffer.from('jegy'), ...tarolt });
      }
      if (q === 'put') {
        if (nemaPut) return;   // a keresésre felel, a feltevésre soha
        const so = a.salt ?? Buffer.alloc(0);
        const ok = await bejegyzesEllenorzese({ k: a.k, salt: so, seq: a.seq, v: bencodeKodol(a.v), sig: a.sig });
        if (!ok) return hiba(206, 'invalid signature');
        g.tar.set((await valtozoCel(a.k, so)).toString('hex'), { k: a.k, seq: a.seq, sig: a.sig, v: a.v });
        return valasz({});
      }
      hiba(204, 'Method Unknown');
    });
  }
  return {
    gepek,
    belepo: (i) => '127.0.0.1:' + gepek[i].port,
    bezar: () => gepek.forEach((g) => g.halo.close())
  };
}

const GYORS = { kerdesIdo: 400, keresesIdo: 6000 };

async function felteszEsKeres(halozat, { aBelepo = 0, bBelepo = 11, bBelepok = null } = {}) {
  const b = await bejegyzesKeszitese({ kulcspar: await ujKulcspar(), salt: 'koino-proba', seq: 5, ertek: 'itt vagyok' });
  const a = await dhtKliens({ belepok: [halozat.belepo(aBelepo)], ...GYORS });
  const p = await a.kozzetesz(b);
  a.bezar();
  const k = await dhtKliens({ belepok: bBelepok ?? [halozat.belepo(bBelepo)], ...GYORS });
  const g = await k.keres(b.k, 'koino-proba');
  k.bezar();
  return { p, g };
}

proba('⭐⭐ A HAMIS DHT-N: feltesszük az egyik belépőn át, és egy MÁSIK belépőn át megtaláljuk', async () => {
  const h = await hamisHalozat(20);
  try {
    const { p, g } = await felteszEsKeres(h);
    return p.tarolta >= 6 && g.legjobb !== null
      && Buffer.from(g.legjobb.ertek).toString() === 'itt vagyok' && g.legjobb.seq === 5n;
  } finally { h.bezar(); }
});

proba('⛔⛔ A HAZUDÓ gép átírt, nagyobb sorszámú bejegyzését ELVETJÜK (3. szabály)', async () => {
  // A 20 gépből 9 hazudik — a legközelebbi nyolc közé biztosan jut közülük.
  const h = await hamisHalozat(20, { hazudo: new Set([1, 3, 5, 7, 9, 12, 14, 16, 18]) });
  try {
    const { g } = await felteszEsKeres(h);
    return g.ervenytelen >= 1 && g.legjobb !== null
      && Buffer.from(g.legjobb.ertek).toString() === 'itt vagyok';
  } finally { h.bezar(); }
});

proba('⭐ Egy `get`-et nem ismerő belépő (204) nem akasztja meg: `find_node`-dal továbbmegyünk', async () => {
  const h = await hamisHalozat(20, { csakFindNode: new Set([11]) });
  try {
    const { g } = await felteszEsKeres(h, { bBelepo: 11 });
    return g.legjobb !== null && (g.kereses.findNodeTartalek ?? 0) >= 1;
  } finally { h.bezar(); }
});

proba('⛔ NÉMA gépek (a háló fele) és egy HALOTT belépő sem akasztja meg a keresést', async () => {
  // ⚠️ Az első változat csak egy halott BELÉPŐT tett a listára — és vak volt: a keresés a
  // másik belépőn át már rég végzett, mire a halottra lejárt a várakozás. A valódi eset a
  // néma gép a LEGKÖZELEBBIEK között: azt ki kell várni, aztán tovább kell lépni. Ha a
  // lejárat nem zárná le a kérdést, a keresés az időkorlátig állna ('idokorlat').
  //
  // ⚠️⚠️ ÉS A MÁSODIK VÁLTOZAT IS TÉVEDETT: a `ok === 'kesz'`-t kérte — pedig ha néma gép van
  // a legközelebbiek között, a keresés HELYESEN kevesebb mint nyolc felelővel ér véget, és
  // ennek a becsületes neve „nincs-tobb-jelolt". *A próba a régi, félrevezető feliratot
  // kérte számon.* A lényeg két dolog: MEGTALÁLJA, és az IDŐKORLÁT ELŐTT ér véget.
  const nemak = new Set([1, 2, 4, 6, 8, 10, 13, 15, 17, 19, 21, 23]);   // a háló fele
  const h = await hamisHalozat(24, { nema: nemak });
  const halott = createSocket('udp4');
  await new Promise((kesz) => halott.bind(0, '127.0.0.1', kesz));
  const halottPort = halott.address().port;
  halott.close();
  try {
    const { p, g } = await felteszEsKeres(h, { bBelepok: ['127.0.0.1:' + halottPort, h.belepo(11)] });
    return p.tarolta >= 4 && g.legjobb !== null && g.kereses.ok !== 'idokorlat'
      && p.kereses.ok !== 'idokorlat';
  } finally { h.bezar(); }
});

proba('⛔ Belépő nélkül a keresés AZONNAL, tisztán véget ér — nem vár a semmire', async () => {
  const k = await dhtKliens({ belepok: [], ...GYORS });
  const kezdet = Date.now();
  const g = await k.keres(Buffer.alloc(32, 1), 'x');
  k.bezar();
  return g.legjobb === null && g.kereses.ok === 'nincs-tobb-jelolt' && Date.now() - kezdet < 500;
});

proba('⛔⛔ A BEZÁRÁS FELEL a függő kérdéseknek — a feltevés közben bezárt kliens NEM vár örökre', async () => {
  // A gépek a keresésre felelnek, a feltevésre SOHA — és a kérdés-óra 30 mp, tehát ha a
  // `bezar()` nem jelezne a függő `put`-oknak, a `kozzetesz` az órájuk törlése után örökre
  // állna (a nem-esemény, 25. mérés). ⚠️ Rontás-próba: a `bezar()` jelzését kivéve ez a
  // próba 5 mp után BUKIK (a határ nélkül a futtató akadna el, nem a próba).
  const h = await hamisHalozat(20, { nemaPut: true });
  try {
    const b = await bejegyzesKeszitese({ kulcspar: await ujKulcspar(), salt: 'koino-proba', seq: 1, ertek: 'x' });
    const a = await dhtKliens({ belepok: [h.belepo(0)], kerdesIdo: 30000, keresesIdo: 60000 });
    const kezdet = Date.now();
    setTimeout(() => a.bezar(), 1500);   // a keresés a hurok-címen addigra rég végzett
    const p = await Promise.race([
      a.kozzetesz(b),
      new Promise((kesz) => setTimeout(() => kesz(null), 5000))
    ]);
    return p !== null && p.probalt >= 1 && p.tarolta === 0
      && p.putHibak.lezarva === p.probalt && Date.now() - kezdet < 5000;
  } finally { h.bezar(); }
});

// ===================================
// ⭐⭐ A MEGISMERT GÉPEK ÁTADÁSA (Csaba (c) döntése, 2026-09-20)
// ===================================

proba('⭐ A HIRDETÉS KORLÁTOS — három gép megy, a legutóbb feleltekből', () => {
  const jegyzek = [];
  for (let i = 0; i < 10; i++) jegyzek.push({ cim: '10.0.0.' + i, port: 6881 + i });
  const hirdetjuk = gepekHirdetese(jegyzek);
  return hirdetjuk.length === GEP_HIRDETES
    // A LEGUTÓBBIAK mennek (a lista végéről) — azok felelnek a legnagyobb eséllyel.
    && hirdetjuk[hirdetjuk.length - 1] === '10.0.0.9:6890'
    && hirdetjuk.every((sz) => /^[\d.]+:\d+$/.test(sz));
});

proba('⭐⭐ A KAPOTT GÉPEK BEOLVADNAK — de a SAJÁT megfigyelésünket nem írják felül', () => {
  // ⚠️ A sajátunknak van `id`-je (felelt nekünk); a kapott csak egy bemondott cím.
  const enyem = [{ cim: '10.0.0.1', port: 6881, id: 'abcd' }];
  const utana = gepekBeolvasztasa(enyem, ['10.0.0.1:6881', '10.0.0.2:6882']);

  return utana.length === 2
    && utana.find((g) => g.cim === '10.0.0.1').id === 'abcd'
    && utana.some((g) => g.cim === '10.0.0.2' && g.port === 6882 && g.id === null);
});

proba('⛔ A ROSSZ ALAKOT ELDOBJUK, és a kapott gépek száma is KORLÁTOS', () => {
  const rosszak = ['nincs-port', ':6881', '10.0.0.1:', '10.0.0.1:0', '10.0.0.1:70000', 5, null];
  const semmi = gepekBeolvasztasa([], rosszak);

  // ⛔ És egy rosszindulatú társ sem tömheti tele a jegyzékünket: a kapottból is csak
  // annyit veszünk, amennyit mi magunk hirdetnénk.
  const sok = [];
  for (let i = 0; i < 50; i++) sok.push('10.1.0.' + i + ':6881');
  const korlatos = gepekBeolvasztasa([], sok);

  return semmi.length === 0 && korlatos.length === GEP_HIRDETES;
});

export default futtatas;
