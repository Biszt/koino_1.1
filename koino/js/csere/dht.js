// koino/js/csere/dht.js

// Felelősség: A BITTORRENT DHT (Mainline) KLIENSE — egy kis, ALÁÍRT, kulcshoz kötött
// bejegyzés FELTÉTELE és VISSZAKERESÉSE (BEP 5 + BEP 44), függőség nélkül.
//
// ===== MIÉRT KELL (Csaba döntése, 2026-09-19) =====
//
// A 35. mérés szerint csak-mobilos közösségben a kötés-háló a HÁLÓZATVÁLTÁST nem éli túl:
// az új címmel ébredő telefon kopogását a társai routere eldobja. A mentés a HIRDETŐTÁBLA
// (az „automatizált kurbli"): a leszakadt KIFELÉ kiírja az új címét, a társai KIFELÉ
// kiolvassák — befelé senkinek nem kell fogadnia. ⭐ A DHT ilyen tábla, GAZDA NÉLKÜL:
// több millió gép, és pontosan ilyen kis, Ed25519-cel aláírt, „az újabb sorszám nyer"
// bejegyzéseket tárol (BEP 44). *Nincs mögötte senki, aki kikapcsolhatná (2. és 8. szabály).*
//
// ===== HOGYAN MŰKÖDIK, RÖVIDEN =====
//
// · Minden gépnek és minden bejegyzésnek van egy 20 bájtos SZÁMA. Egy bejegyzést az a
//   néhány gép tárol, amelyiknek a száma a LEGKÖZELEBB van hozzá (XOR-távolság).
// · A keresés FELEZ: minden megkérdezett gép közelebbieket mond, amíg a legközelebbi
//   nyolcat meg nem találjuk. Ettől logaritmikus — több millió gép között is néhány lépés.
// · A bejegyzés száma = SHA-1(nyilvános kulcs + só). Aki ismeri a kulcsot ÉS a sót,
//   megtalálja; aki csak az egyiket, nem.
//
// ===== A KOINO ELVEI ITT =====
//
// · ⛔ **A BIZALOM NEM A CSATORNÁBÓL JÖN (3. szabály):** minden talált bejegyzés aláírását
//   ELLENŐRIZZÜK, és a hamisat eldobjuk. A DHT-gépek hazudhatnak, elhallgathatnak — egy
//   aláírt bejegyzést viszont nem tudnak meghamisítani.
// · ⛔ **SEMMI NE MÚLJON EGY CÍMEN (2. szabály):** a belépő címek csak PARAMÉTEREK, a hívó
//   bármikor kicserélheti, és a már megismert gépekkel belépő nélkül is indulhat.
// · ⭐ **CSAK-OLVASÓ (BEP 43, `ro: 1`):** mi kérdezünk, de nem ajánljuk fel magunkat
//   tárolónak — egy NAT mögötti telefon úgysem fogadna, és így a többiek nem pazarolnak
//   ránk kérdést.
// · ⛔ **MINDEN KORLÁTOS (9. szabály):** a kérdések száma, a keresés ideje, a jelöltlista
//   mérete — egy rosszindulatú gép sem tarthat végtelen keresésben.
// · ⚠️ **CSAK IPv4** (`nodes`, 26 bájtos tömör alak). Az IPv6 (`nodes6`) későbbi munka.
//
// Használják: ⚠️ **EGYELŐRE CSAK a `meres/dhtMeres.js` (36. mérés) és a `meres/dhtProba.js`.**
// A koino éles útja SZÁNDÉKOSAN nem hívja: előbb a mérés dönti el, beválik-e
// hirdetőtáblának (gyors-e, megbízható-e, mobilról is). *Ezt kimondjuk, hogy ne látsszon
// „megépült, de senki nem hívja" hiánynak — nem elfelejtettük, hanem még nem döntöttünk.*

import { createSocket } from 'node:dgram';
import { lookup } from 'node:dns/promises';

// ===================================
// ÁLLANDÓK
// ===================================

/**
 * A közismert belépő címek. ⚠️ PARAMÉTER, nem függőség (2. szabály): a hívó felülírhatja,
 * és az egyszer megismert gépekkel belépő nélkül is lehet indulni.
 */
export const ALAP_BELEPOK = [
  'router.bittorrent.com:6881',
  'dht.transmissionbt.com:6881',
  'router.utorrent.com:6881',
  'dht.libtorrent.org:25401'
];

/** BEP 44: a bejegyzés értéke (bencode-olva) legfeljebb ennyi bájt. */
export const ERTEK_KORLAT = 1000;
/** BEP 44: a só legfeljebb ennyi bájt. */
export const SO_KORLAT = 64;

// A keresés korlátai (9. szabály) — a Kademlia szokásos számai.
const KOZELI_SZAM = 8;          // ennyi legközelebbi gépet keresünk / ennyinek tesszük fel
const PARHUZAMOS = 4;           // egyszerre ennyi kérdés van úton
const KERDES_KORLAT = 200;      // egy keresés legfeljebb ennyi kérdést tesz fel
const JELOLT_KORLAT = 300;      // a jelöltlista felső határa
const ALAP_KERDES_IDO = 2000;   // egy kérdésre ennyit várunk (ms)
const ALAP_KERESES_IDO = 25000; // egy teljes keresés legfeljebb ennyi (ms)

// ===================================
// BENCODE — a DHT üzenetformátuma
// ===================================
//
// Négy fajta: egész (`i42e`), bájtsor (`4:spam`), lista (`l…e`), szótár (`d…e`, a kulcsok
// BÁJT-sorrendben). ⭐ Ugyanaz a gond, mint a koino kanonikus alakjánál: ugyanaz az adat
// MINDIG ugyanazokat a bájtokat kell adja, különben az aláírás nem ellenőrizhető.

const kodolo = new TextEncoder();

/**
 * Bencode-ol egy értéket. Bájtsor: `Uint8Array`/`Buffer` vagy szöveg (UTF-8); egész:
 * `number` (csak egész) vagy `BigInt`; lista: tömb; szótár: objektum.
 *
 * @returns {Buffer}
 */
export function bencodeKodol(ertek) {
  const darabok = [];
  const ir = (e, melyseg) => {
    if (melyseg > 32) throw new Error('bencode: túl mély szerkezet');
    if (e instanceof Uint8Array) {
      darabok.push(Buffer.from(e.length + ':', 'latin1'), Buffer.from(e));
    } else if (typeof e === 'string') {
      const b = kodolo.encode(e);
      darabok.push(Buffer.from(b.length + ':', 'latin1'), Buffer.from(b));
    } else if (typeof e === 'bigint' || (typeof e === 'number' && Number.isInteger(e))) {
      darabok.push(Buffer.from('i' + e + 'e', 'latin1'));
    } else if (Array.isArray(e)) {
      darabok.push(Buffer.from('l'));
      for (const x of e) ir(x, melyseg + 1);
      darabok.push(Buffer.from('e'));
    } else if (e && typeof e === 'object') {
      // ⚠️ A kulcsok BÁJT-sorrendben — és latin1-ként, ugyanúgy, ahogy a bontó adja vissza,
      // különben egy visszakódolt szótár más bájtokat adna.
      const kulcsok = Object.keys(e).filter((k) => e[k] !== undefined)
        .sort((a, b) => Buffer.compare(Buffer.from(a, 'latin1'), Buffer.from(b, 'latin1')));
      darabok.push(Buffer.from('d'));
      for (const k of kulcsok) {
        const kb = Buffer.from(k, 'latin1');
        darabok.push(Buffer.from(kb.length + ':', 'latin1'), kb);
        ir(e[k], melyseg + 1);
      }
      darabok.push(Buffer.from('e'));
    } else {
      throw new Error('bencode: nem kódolható érték (' + typeof e + ')');
    }
  };
  ir(ertek, 0);
  return Buffer.concat(darabok);
}

/**
 * Bencode-ot bont. A bájtsorok `Buffer`-ként jönnek vissza, a szótár-kulcsok latin1
 * szövegként, az egészek `number`-ként (ha biztonságosan elférnek), különben `BigInt`-ként.
 *
 * ⛔ SZIGORÚ: a hibás, csonka, túl mély vagy utána szemetet tartalmazó bemenet HIBA —
 * idegen gépektől jön, tehát bármi lehet benne.
 */
export function bencodeBont(bemenet) {
  const buf = Buffer.from(bemenet);
  let i = 0;
  const olvas = (melyseg) => {
    if (melyseg > 32) throw new Error('bencode: túl mély szerkezet');
    if (i >= buf.length) throw new Error('bencode: csonka bemenet');
    const c = buf[i];
    if (c === 0x69) {                                    // i…e
      const vege = buf.indexOf(0x65, i);
      if (vege < 0) throw new Error('bencode: lezáratlan egész');
      const szoveg = buf.toString('latin1', i + 1, vege);
      if (!/^(0|-?[1-9][0-9]*)$/.test(szoveg)) throw new Error('bencode: hibás egész');
      i = vege + 1;
      const nagy = BigInt(szoveg);
      return (nagy <= BigInt(Number.MAX_SAFE_INTEGER) && nagy >= BigInt(Number.MIN_SAFE_INTEGER))
        ? Number(nagy) : nagy;
    }
    if (c === 0x6c) {                                    // l…e
      i++;
      const lista = [];
      while (buf[i] !== 0x65) lista.push(olvas(melyseg + 1));
      i++;
      return lista;
    }
    if (c === 0x64) {                                    // d…e
      i++;
      // ⛔ Prototípus nélküli objektum: egy „__proto__" kulcs se írhasson át semmit.
      const szotar = Object.create(null);
      while (buf[i] !== 0x65) {
        const k = olvas(melyseg + 1);
        if (!Buffer.isBuffer(k)) throw new Error('bencode: a szótár kulcsa nem bájtsor');
        szotar[k.toString('latin1')] = olvas(melyseg + 1);
      }
      i++;
      return szotar;
    }
    if (c >= 0x30 && c <= 0x39) {                        // hossz:bájtok
      const kettospont = buf.indexOf(0x3a, i);
      if (kettospont < 0) throw new Error('bencode: hiányzó kettőspont');
      const hosszSzoveg = buf.toString('latin1', i, kettospont);
      if (!/^(0|[1-9][0-9]*)$/.test(hosszSzoveg)) throw new Error('bencode: hibás hossz');
      const hossz = Number(hosszSzoveg);
      i = kettospont + 1;
      if (i + hossz > buf.length) throw new Error('bencode: csonka bájtsor');
      const b = buf.subarray(i, i + hossz);
      i += hossz;
      return b;
    }
    throw new Error('bencode: váratlan bájt a(z) ' + i + '. helyen');
  };
  const ertek = olvas(0);
  if (i !== buf.length) throw new Error('bencode: szemét a végén');
  return ertek;
}

// ===================================
// A BEP 44 BEJEGYZÉS — aláírás, cél, ellenőrzés
// ===================================

async function sha1(bajtok) {
  return Buffer.from(await crypto.subtle.digest('SHA-1', bajtok));
}

/**
 * AMIT ALÁÍRUNK (BEP 44): `4:salt<hossz>:<só>` (csak ha van só) + `3:seqi<seq>e1:v` + a
 * bencode-olt érték. ⚠️ Ez NEM egy bencode-olt szótár, hanem annak a darabja — a BEP 44
 * így rögzíti, és a tesztvektorok ezt mérik.
 *
 * @param {{salt?: Uint8Array, seq: number|bigint, v: Uint8Array}} be - `v` a KÓDOLT érték
 */
export function alairandoBajtok({ salt, seq, v }) {
  const reszek = [];
  if (salt && salt.length) reszek.push(Buffer.from('4:salt' + salt.length + ':', 'latin1'), Buffer.from(salt));
  reszek.push(Buffer.from('3:seqi' + seq + 'e1:v', 'latin1'), Buffer.from(v));
  return Buffer.concat(reszek);
}

/** A változtatható bejegyzés száma a DHT-ban: SHA-1(nyilvános kulcs + só). */
export async function valtozoCel(nyilvanosKulcs, salt) {
  return sha1(Buffer.concat([Buffer.from(nyilvanosKulcs), Buffer.from(salt ?? [])]));
}

/** A változtathatatlan bejegyzés száma: SHA-1(a bencode-olt érték). */
export async function valtozatlanCel(kodoltErtek) {
  return sha1(kodoltErtek);
}

/** Egy Ed25519 kulcspár nyers (32 bájtos) nyilvános kulcsa. */
export async function nyersNyilvanosKulcs(kulcspar) {
  return Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey));
}

/**
 * Elkészít egy aláírt bejegyzést — MÉG HÁLÓZAT NÉLKÜL.
 * ⛔ A méret-korlátokat ITT őrizzük (BEP 44): ha a hívóra bíznánk, egy túl nagy érték
 * csak a távoli gép 205-ös hibájából derülne ki.
 *
 * @param {{kulcspar: CryptoKeyPair, salt?: Uint8Array|string, seq: number, ertek: any}} be
 * @returns {Promise<{k: Buffer, salt: Buffer, seq: number, sig: Buffer, v: Buffer, ertek: any, cel: Buffer}>}
 */
export async function bejegyzesKeszitese({ kulcspar, salt, seq, ertek }) {
  const so = salt === undefined ? Buffer.alloc(0) : Buffer.from(salt);
  if (so.length > SO_KORLAT) throw new Error('A só legfeljebb ' + SO_KORLAT + ' bájt (BEP 44).');
  if (!Number.isInteger(seq) || seq < 0) throw new Error('A sorszám nem negatív egész.');
  const v = bencodeKodol(ertek);
  if (v.length > ERTEK_KORLAT) {
    throw new Error('Az érték ' + v.length + ' bájt — legfeljebb ' + ERTEK_KORLAT + ' (BEP 44).');
  }
  const k = await nyersNyilvanosKulcs(kulcspar);
  const sig = Buffer.from(await crypto.subtle.sign(
    { name: 'Ed25519' }, kulcspar.privateKey, alairandoBajtok({ salt: so, seq, v })));
  return { k, salt: so, seq, sig, v, ertek, cel: await valtozoCel(k, so) };
}

/**
 * Ellenőriz egy talált bejegyzést. ⛔ Ez a DHT egyetlen bizalmi pontja (3. szabály): amit
 * idegen gép ad, az csak akkor ér valamit, ha a kért kulcs írta alá.
 *
 * @param {{k: Uint8Array, salt?: Uint8Array, seq: number|bigint, v: Uint8Array, sig: Uint8Array}} be
 */
export async function bejegyzesEllenorzese({ k, salt, seq, v, sig }) {
  try {
    if (!k || k.length !== 32 || !sig || sig.length !== 64) return false;
    const kulcs = await crypto.subtle.importKey('raw', k, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, kulcs, sig,
      alairandoBajtok({ salt, seq, v }));
  } catch {
    return false;
  }
}

// ===================================
// TÖMÖR CÍMEK (BEP 5) — 20 bájt azonosító + 4 bájt IPv4 + 2 bájt port
// ===================================

export function tomorCsomopontokBontasa(bajtok) {
  const lista = [];
  if (!Buffer.isBuffer(bajtok)) return lista;
  for (let i = 0; i + 26 <= bajtok.length; i += 26) {
    const port = bajtok.readUInt16BE(i + 24);
    if (port === 0) continue;
    lista.push({
      id: Buffer.from(bajtok.subarray(i, i + 20)),
      cim: bajtok[i + 20] + '.' + bajtok[i + 21] + '.' + bajtok[i + 22] + '.' + bajtok[i + 23],
      port
    });
  }
  return lista;
}

export function tomorCsomopontokKeszitese(csomopontok) {
  return Buffer.concat(csomopontok.map((c) => {
    const b = Buffer.alloc(26);
    Buffer.from(c.id).copy(b, 0);
    c.cim.split('.').forEach((sz, j) => { b[20 + j] = Number(sz); });
    b.writeUInt16BE(c.port, 24);
    return b;
  }));
}

/** XOR-távolságok összevetése: negatív, ha `a` van közelebb a célhoz. */
export function tavolsagOsszevetes(cel, a, b) {
  for (let i = 0; i < 20; i++) {
    const x = a[i] ^ cel[i];
    const y = b[i] ^ cel[i];
    if (x !== y) return x - y;
  }
  return 0;
}

// ===================================
// A KLIENS
// ===================================

async function belepokFeloldasa(belepok) {
  const eredmeny = [];
  for (const b of belepok) {
    const [hoszt, portSzoveg] = String(b).split(':');
    const port = Number(portSzoveg);
    if (!hoszt || !Number.isInteger(port)) continue;
    try {
      // ⚠️ Egy fel nem oldható belépő nem hiba, csak kimarad (2. szabály).
      const { address } = await lookup(hoszt, { family: 4 });
      eredmeny.push({ cim: address, port, id: null });
    } catch { /* kimarad */ }
  }
  return eredmeny;
}

/**
 * Egy DHT-kliens: saját UDP-foglalat, saját (véletlen) azonosító.
 *
 * @param {Object} [beallitas]
 * @param {string[]} [beallitas.belepok] - „hoszt:port" alakú belépők (lehet üres is)
 * @param {Array<{cim,port,id?}>} [beallitas.ismertek] - korábban megismert gépek (gyorsítótár)
 * @param {number} [beallitas.kerdesIdo] - egy kérdésre ennyit várunk (ms)
 * @param {number} [beallitas.keresesIdo] - egy teljes keresés felső határa (ms)
 */
export async function dhtKliens(beallitas = {}) {
  console.log('dhtKliens - KEZDÉS');
  const {
    belepok = ALAP_BELEPOK,
    ismertek = [],
    kerdesIdo = ALAP_KERDES_IDO,
    keresesIdo = ALAP_KERESES_IDO,
    helyiPort = 0
  } = beallitas;

  const sajatId = Buffer.from(crypto.getRandomValues(new Uint8Array(20)));
  const halo = createSocket('udp4');
  await new Promise((kesz, hiba) => {
    halo.once('error', hiba);
    halo.bind(helyiPort, () => { halo.off('error', hiba); kesz(); });
  });
  halo.on('error', () => { /* egy idegen csomag hibája nem állíthatja le a klienst */ });

  const kezdoPontok = [
    ...await belepokFeloldasa(belepok),
    ...ismertek
      .filter((c) => c && typeof c.cim === 'string' && Number.isInteger(c.port))
      .map((c) => ({ cim: c.cim, port: c.port, id: c.id ? Buffer.from(c.id, 'hex') : null }))
  ];

  const fuggo = new Map();
  let tSzamlalo = crypto.getRandomValues(new Uint16Array(1))[0];
  const valaszoltak = new Map();   // „cím:port" → { cim, port, id } — a gyorsítótárhoz

  halo.on('message', (adat, felado) => {
    let u;
    try { u = bencodeBont(adat); } catch { return; }
    if (!u || !Buffer.isBuffer(u.t)) return;
    const f = fuggo.get(u.t.toString('hex'));
    if (!f) return;
    // ⚠️ A választ onnan várjuk, ahova kérdeztünk — különben bárki beleszólhatna egy
    // folyamatban lévő keresésbe egy kitalált tranzakció-számmal.
    if (felado.address !== f.cim || felado.port !== f.port) return;
    fuggo.delete(u.t.toString('hex'));
    clearTimeout(f.ora);
    const y = Buffer.isBuffer(u.y) ? u.y.toString('latin1') : '';
    if (y === 'r' && u.r && typeof u.r === 'object') f.kesz({ ok: true, r: u.r });
    else if (y === 'e') {
      const kod = Array.isArray(u.e) ? Number(u.e[0]) : null;
      f.kesz({ ok: false, kod });
    } else f.kesz({ ok: false, kod: null });
  });

  function kerdez(cim, port, q, a) {
    return new Promise((kesz) => {
      const t = Buffer.alloc(2);
      t.writeUInt16BE(tSzamlalo = (tSzamlalo + 1) & 0xffff);
      const kulcs = t.toString('hex');
      const ora = setTimeout(() => {
        fuggo.delete(kulcs);
        kesz({ ok: false, lejart: true });
      }, kerdesIdo);
      fuggo.set(kulcs, { cim, port, kesz, ora });
      // ⭐ `ro: 1` (BEP 43): csak-olvasó kliens vagyunk, ne vegyenek fel tárolónak.
      const uzenet = bencodeKodol({ t, y: 'q', q, a: { id: sajatId, ...a }, ro: 1 });
      halo.send(uzenet, port, cim, (hiba) => {
        if (hiba && fuggo.has(kulcs)) {
          fuggo.delete(kulcs);
          clearTimeout(ora);
          kesz({ ok: false, kuldesHiba: hiba.message });
        }
      });
    });
  }

  /**
   * AZ ITERATÍV KERESÉS: a cél felé haladva megkérdezzük a legközelebbi, még meg nem
   * kérdezett gépeket, amíg a legközelebbi nyolc mind felelt (vagy a korlát elfogy).
   * ⭐ `get`-tel keresünk: ez a közeli gépeket ÉS a tárolt bejegyzést is visszaadja.
   */
  function kereses(cel, extraArgumentumok = {}) {
    const kezdet = Date.now();
    const jeloltek = new Map();
    const stat = { kerdes: 0, valasz: 0, lejart: 0, hibak: {}, talalatok: [] };

    const felvesz = (c, honnan) => {
      if (!c || !c.cim || !Number.isInteger(c.port)) return;
      if (c.id && Buffer.compare(c.id, sajatId) === 0) return;
      const kulcs = c.cim + ':' + c.port;
      if (jeloltek.has(kulcs)) {
        const meglevo = jeloltek.get(kulcs);
        if (!meglevo.id && c.id) meglevo.id = c.id;
        return;
      }
      if (jeloltek.size >= JELOLT_KORLAT) {
        // ⚠️ TELE A LISTA — de a keresés természete, hogy a KÉSŐBB talált gépek vannak
        // közelebb. Ha az új közelebb van, mint a legtávolabbi még meg nem kérdezett, az
        // megy ki; különben a korlát épp a jó jelölteket zárná ki.
        if (!c.id) return;
        let legtavolabbi = null;
        for (const [kk, j] of jeloltek) {
          if (j.allapot !== 'uj' || !j.id) continue;
          if (!legtavolabbi || tavolsagOsszevetes(cel, j.id, legtavolabbi[1].id) > 0) legtavolabbi = [kk, j];
        }
        if (!legtavolabbi || tavolsagOsszevetes(cel, c.id, legtavolabbi[1].id) >= 0) return;
        jeloltek.delete(legtavolabbi[0]);
      }
      jeloltek.set(kulcs, { cim: c.cim, port: c.port, id: c.id ?? null, allapot: 'uj', honnan });
    };
    for (const k of kezdoPontok) felvesz(k, 'kezdo');

    return new Promise((vegeztem) => {
      let folyamatban = 0;
      let vege = false;

      // ⛔⛔ AZ IDŐKORLÁT SAJÁT ÓRÁVAL (a rontás-próba lelete, 2026-09-19). Először csak a
      // `leptet` nézte meg, lejárt-e az idő — az viszont csak VÁLASZRA fut. Ha egyetlen
      // válasz sem jön (egy hiba miatt nem jár le egy várakozás, vagy egy ág elfelejt
      // léptetni), a keresés ÖRÖKRE áll: a nem-esemény, ami a legrosszabb hiba (25. mérés).
      // *Egy őr ne attól függjön, hogy a többi őr jól működik.*
      const ora = setTimeout(() => befejez('idokorlat'), keresesIdo);

      const befejez = (ok) => {
        if (vege) return;
        vege = true;
        clearTimeout(ora);
        const kozeli = [...jeloltek.values()]
          .filter((j) => j.allapot === 'valaszolt' && j.id)
          .sort((a, b) => tavolsagOsszevetes(cel, a.id, b.id))
          .slice(0, KOZELI_SZAM);
        vegeztem({ ok, kozeli, ido: Date.now() - kezdet, ...stat });
      };

      const leptet = () => {
        if (vege) return;
        if (Date.now() - kezdet > keresesIdo) return befejez('idokorlat');

        const idNelkuliUjak = [...jeloltek.values()].filter((j) => !j.id && j.allapot === 'uj');
        const elok = [...jeloltek.values()]
          .filter((j) => j.id && j.allapot !== 'bukott')
          .sort((a, b) => tavolsagOsszevetes(cel, a.id, b.id))
          .slice(0, KOZELI_SZAM);
        // ⚠️ „KÉSZ" CSAK AKKOR, HA TÉNYLEG MEGVAN A NYOLC. Az első változat akkor is ezt írta,
        // ha egyetlen gép felelt, és a keresés kifogyott a jelöltekből — mérve: „7 kérdés,
        // 1 felelt, vége: kesz". *Egy felirat, ami mást mond, mint ami történt.*
        const keszVagyunk = elok.length >= KOZELI_SZAM && elok.every((j) => j.allapot === 'valaszolt')
          && idNelkuliUjak.length === 0;
        if (keszVagyunk) return befejez('kesz');

        const kovetkezok = [...idNelkuliUjak, ...elok.filter((j) => j.allapot === 'uj')];
        if (!kovetkezok.length && folyamatban === 0) return befejez('nincs-tobb-jelolt');
        if (stat.kerdes >= KERDES_KORLAT && folyamatban === 0) return befejez('kerdes-korlat');

        while (folyamatban < PARHUZAMOS && kovetkezok.length && stat.kerdes < KERDES_KORLAT) {
          const j = kovetkezok.shift();
          j.allapot = 'kerdezve';
          folyamatban++;
          stat.kerdes++;
          const kerdezve = Date.now();
          kerdez(j.cim, j.port, 'get', { target: cel, ...extraArgumentumok }).then((v) => {
            folyamatban--;
            if (v.ok) {
              stat.valasz++;
              j.allapot = 'valaszolt';
              if (Buffer.isBuffer(v.r.id) && v.r.id.length === 20) j.id = Buffer.from(v.r.id);
              j.token = Buffer.isBuffer(v.r.token) ? v.r.token : null;
              if (j.id) valaszoltak.set(j.cim + ':' + j.port, { cim: j.cim, port: j.port, id: j.id });
              for (const c of tomorCsomopontokBontasa(v.r.nodes)) felvesz(c, j.cim + ':' + j.port);
              if (v.r.v !== undefined) {
                stat.talalatok.push({ r: v.r, cim: j.cim, port: j.port, mikor: Date.now() - kezdet,
                  valaszIdo: Date.now() - kerdezve });
              }
            } else {
              j.allapot = 'bukott';
              if (v.lejart) stat.lejart++;
              else {
                stat.hibak[v.kod ?? 'ismeretlen'] = (stat.hibak[v.kod ?? 'ismeretlen'] ?? 0) + 1;
                // ⭐ A GÉP ÉL, CSAK NEM ISMERI A `get`-et (régebbi kliens, vagy belépő).
                // Tárolónak nem jó, de a szomszédait megmondhatja — különben a keresés
                // elakadna rajta. Egyszer kérdezzük, `find_node`-dal.
                folyamatban++;
                stat.kerdes++;
                stat.findNodeTartalek = (stat.findNodeTartalek ?? 0) + 1;
                kerdez(j.cim, j.port, 'find_node', { target: cel }).then((v2) => {
                  folyamatban--;
                  if (v2.ok) {
                    if (!j.id && Buffer.isBuffer(v2.r.id) && v2.r.id.length === 20) j.id = Buffer.from(v2.r.id);
                    for (const c of tomorCsomopontokBontasa(v2.r.nodes)) felvesz(c, j.cim + ':' + j.port);
                  }
                  leptet();
                });
              }
            }
            leptet();
          });
        }
      };

      leptet();
    });
  }

  /**
   * FELTESZ egy aláírt bejegyzést a hozzá legközelebbi gépekre.
   * @param {Object} bejegyzes - a `bejegyzesKeszitese` eredménye
   */
  async function kozzetesz(bejegyzes) {
    console.log('dhtKliens.kozzetesz - KEZDÉS', { seq: bejegyzes.seq });
    const k = await kereses(bejegyzes.cel);
    const tarolok = k.kozeli.filter((j) => j.token);
    const eredmenyek = await Promise.all(tarolok.map((j) => kerdez(j.cim, j.port, 'put', {
      k: bejegyzes.k,
      salt: bejegyzes.salt.length ? bejegyzes.salt : undefined,
      seq: bejegyzes.seq,
      sig: bejegyzes.sig,
      token: j.token,
      v: bejegyzes.ertek
    })));
    const tarolta = eredmenyek.filter((e) => e.ok).length;
    const putHibak = {};
    for (const e of eredmenyek) {
      if (!e.ok) { const kod = e.lejart ? 'lejart' : (e.kod ?? 'ismeretlen'); putHibak[kod] = (putHibak[kod] ?? 0) + 1; }
    }
    console.log('dhtKliens.kozzetesz - VÉGE', { tarolta, probalt: tarolok.length });
    return { kereses: k, tarolta, probalt: tarolok.length, putHibak };
  }

  /**
   * KIKERES egy változtatható bejegyzést, és ELLENŐRZI az aláírását (3. szabály).
   * A legnagyobb sorszámú ÉRVÉNYES bejegyzés nyer — „az újabb nyer".
   */
  async function keres(nyilvanosKulcs, salt) {
    console.log('dhtKliens.keres - KEZDÉS');
    const so = salt === undefined ? Buffer.alloc(0) : Buffer.from(salt);
    const cel = await valtozoCel(nyilvanosKulcs, so);
    const k = await kereses(cel);

    const ervenyesek = [];
    let ervenytelen = 0;
    for (const t of k.talalatok) {
      const r = t.r;
      if (!Buffer.isBuffer(r.k) || Buffer.compare(r.k, Buffer.from(nyilvanosKulcs)) !== 0) { ervenytelen++; continue; }
      if (typeof r.seq !== 'number' && typeof r.seq !== 'bigint') { ervenytelen++; continue; }
      let v;
      try { v = bencodeKodol(r.v); } catch { ervenytelen++; continue; }
      const jo = await bejegyzesEllenorzese({ k: r.k, salt: so, seq: r.seq, v, sig: r.sig });
      if (!jo) { ervenytelen++; continue; }
      ervenyesek.push({ seq: BigInt(r.seq), ertek: r.v, mikor: t.mikor, honnan: t.cim + ':' + t.port });
    }
    ervenyesek.sort((a, b) => (a.seq === b.seq ? a.mikor - b.mikor : (b.seq > a.seq ? 1 : -1)));
    const legjobb = ervenyesek[0] ?? null;
    const elsoErvenyes = ervenyesek.length ? Math.min(...ervenyesek.map((e) => e.mikor)) : null;
    console.log('dhtKliens.keres - VÉGE', { talalat: ervenyesek.length, ervenytelen });
    return { kereses: k, cel, legjobb, ervenyesek: ervenyesek.length, ervenytelen, elsoErvenyes };
  }

  /** Akik ebben a munkamenetben feleltek — a következő induláshoz (belépő nélkül is). */
  function ismertCsomopontok(korlat = 200) {
    return [...valaszoltak.values()].slice(-korlat)
      .map((c) => ({ cim: c.cim, port: c.port, id: c.id.toString('hex') }));
  }

  function bezar() {
    for (const f of fuggo.values()) clearTimeout(f.ora);
    fuggo.clear();
    try { halo.close(); } catch { /* már zárva */ }
  }

  console.log('dhtKliens - VÉGE', { kezdoPontok: kezdoPontok.length });
  return { sajatId, kezdoPontok: kezdoPontok.length, kozzetesz, keres, kereses, ismertCsomopontok, bezar };
}
