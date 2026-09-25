// koino/meres/vizsgaProba.js — A SZAKASZ 2 VIZSGÁJA (2. lépés)
//
// Egyetlen kérdést tesz fel, sokféleképpen:
//
//   ⭐ HA KÉT KÉSZÜLÉK KICSERÉLI, AMIT TUD, UGYANAZT A KOINÓT LÁTJA-E?
//
// Nem „ugyanannyi eseményt" — UGYANAZT AZ ÁLLAPOTOT: ugyanazokat az entitásokat,
// ugyanazokkal a tudatpontokkal és küszöbökkel, ugyanazt a javaslat-eredményt, ugyanazt
// az egyezményt, és ugyanazokat a jelzéseket. Ez a D17 ígérete, futtatható alakban.
//
// A mérőeszköz: az ÁLLAPOT UJJLENYOMATA (js/allapot/osszehasonlitas.js) — egyetlen 43
// karakteres szöveg, ami mindent lefed, ami döntés.
//
// ⚠️ EGY VIZSGA, AMI MINDIG ÁTMEGY, NEM VIZSGA. Ezért az első próbák egyike épp azt
// bizonyítja, hogy az összehasonlítás TUD nemet mondani: csere ELŐTT a két készülék
// ujjlenyomatának KÜLÖNBÖZNIE kell.

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import {
  allapotUjjlenyomata, allapotOsszefoglaloja, elteresek, ujjlenyomatLap, ujjlenyomatLapBol
} from '../js/allapot/osszehasonlitas.js';
// ⚠️ 2026-09-26 óta (D69/2) a vizsga a UDP-résen fut, a postaláda pedig az éles állandó kapu.
import { createSocket } from 'node:dgram';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { udpKapuNyitasa } from '../js/csere/udpKapu.js';
import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A Szakasz 2 VIZSGÁJA');

const KOINO = 'proba';
const NAP = 86400 * 1000;
const KEZDET = Date.UTC(2026, 0, 1);
const KESOBB = KEZDET + 30 * NAP;     // ekkorra minden döntés lezárult

const mappak = [];

// ===================================
// SEGÉDEK
// ===================================

async function ujTar() {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-vizsga-'));
  mappak.push(mappa);
  return esemenyTarNyitasa(KOINO, mappa);
}

async function ment(tar, esemenyek) {
  for (const e of esemenyek) await esemenyMentese(tar, e);
}

/** A tár állapota és javaslatai — MINDIG ugyanarra az időpontra. */
async function kep(tar, most = KESOBB) {
  const allapot = allapotSzamitasa(await koinoEsemenyei(tar, KOINO));
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, most);
  return { allapot, javaslatok };
}

/** Egy tár állapotának ujjlenyomata. */
async function ujjlenyomat(tar, most) {
  const { allapot, javaslatok } = await kep(tar, most);
  return allapotUjjlenyomata(allapot, javaslatok);
}

/**
 * Két tár cseréje egy UDP-résen (2026-09-26 óta — D69/2: nincs TCP a készülékek között).
 * ⭐ A résen nincs kliens és szerver: mindkét fél ugyanazt a párbeszédet futtatja.
 */
async function csereDroton(egyikTar, masikTar) {
  const egyik = createSocket('udp4');
  const masik = createSocket('udp4');
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  try {
    const [eredmeny] = await Promise.all([
      csereUdpResen(egyik, '127.0.0.1', masik.address().port, egyikTar, KOINO),
      csereUdpResen(masik, '127.0.0.1', egyik.address().port, masikTar, KOINO)
    ]);
    return eredmeny;
  } finally {
    egyik.close();
    masik.close();
  }
}

/**
 * ⭐ EGY POSTALÁDA — az ÉLES gépezettel: állandó UDP-kapu, ami bármikor felel, és a
 * bekopogóval cserél (`udpKapu.js`, D69/3). *Nem utánzat: ugyanaz a kapu, amit a `figyel`
 * és az őrjárat nyit.*
 */
async function postaladaNyitasa(tar) {
  let beszelgetesek = 0;
  const kapu = await udpKapuNyitasa({
    port: 0,
    munka: async (halo, t) => {
      const e = await csereUdpResen(halo, t.cim, t.port, tar, KOINO);
      beszelgetesek++;
      return e;
    }
  });
  return { kapu, beszelgetesek: () => beszelgetesek, bezar: () => kapu.zar() };
}

/**
 * Egy készülék, ami NEM TUD FOGADNI: a parancs idejére nyit egy kaput, rákopog a
 * postaládára, cserél, és bezár. *Pontosan a kézi `csere <cím>` útja.*
 */
async function bekopog(tar, postalada) {
  const kapu = await udpKapuNyitasa({
    port: 0, bekopogoKorlat: 0,
    munka: (halo, t) => csereUdpResen(halo, t.cim, t.port, tar, KOINO)
  });
  try {
    const kor = await kapu.kopog([{ cim: '127.0.0.1', port: postalada.kapu.port }],
      { idokorlat: 5000 });
    if (!kor.sikeres) throw new Error('a postaláda nem felelt: ' + kor.eredmenyek[0]?.hiba);
    return kor.eredmenyek[0].eredmeny;
  } finally {
    kapu.zar();
  }
}

// ===================================
// A TELJES ESET — egy koino teljes köre
// ===================================
//
// Minden esemény-fajta szerepel benne, amit a Szakasz 1 ismer: koino, gondolat,
// tudatpont-rendezés, érték javaslat, javaslat, szavazat. Ha a vizsga ezen átmegy, akkor
// nem egy leegyszerűsített esetre megy át.

async function teljesEset() {
  const anna = await ujEember(KOINO);
  const bela = await ujEember(KOINO);
  const cili = await ujEember(KOINO);
  const esemenyek = [];

  esemenyek.push(await anna.tesz('KoinoLetrehozas',
    { nev: 'Vizsga koino', leiras: 'a Szakasz 2 vizsgájához' }, KEZDET));

  // ----- KÉT GONDOLAT, KÉT SZERZŐTŐL -----
  const elso = await anna.tesz('GondolatLetrehozas',
    { cim: 'Anna gondolata', szoveg: 'az A gépen', meret: 120 }, KEZDET);
  esemenyek.push(elso);
  esemenyek.push(await anna.tesz('TudatpontRendezes',
    { entitas: elso.azonosito, pont: 300, szerep: 'aktiv' }, KEZDET));

  const masodik = await bela.tesz('GondolatLetrehozas',
    { cim: 'Béla gondolata', szoveg: 'a B gépen', meret: 80 }, KEZDET);
  esemenyek.push(masodik);
  esemenyek.push(await bela.tesz('TudatpontRendezes',
    { entitas: masodik.azonosito, pont: 200, szerep: 'aktiv' }, KEZDET));

  // ----- MINDKETTEN AZ ELSŐ GONDOLATRA IS TESZNEK PONTOT -----
  esemenyek.push(await bela.tesz('TudatpontRendezes',
    { entitas: elso.azonosito, pont: 50, szerep: 'aktiv' }, KEZDET));
  esemenyek.push(await cili.tesz('TudatpontRendezes',
    { entitas: elso.azonosito, pont: 70, szerep: 'aktiv' }, KEZDET));

  // ----- KÜSZÖBÖK (érték javaslat) -----
  esemenyek.push(await anna.tesz('ErtekJavaslat', {
    entitas: elso.azonosito,
    // ⚠️ A küszöbök SZÁZALÉKBAN vannak (lásd ALAP_KUSZOBOK), az arányok viszont
    // ezrelékben jönnek vissza — a kettő könnyen összekeverhető.
    ertekek: {
      elfogadasiKuszob: 60, reszveteliKuszob: 50,
      minimumDontesiIdo: 3600, maximumDontesiIdo: 7 * 86400
    }
  }, KEZDET));

  // ----- JAVASLAT ÉS SZAVAZATOK -----
  const javaslat = await anna.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: elso.azonosito, muvelet: 'Modositas',
    valtozas: { cim: 'Anna javított gondolata' }, indoklas: 'Pontosabb így.'
  }, KEZDET + 1000);
  esemenyek.push(javaslat);

  esemenyek.push(await anna.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000));
  esemenyek.push(await bela.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000));
  esemenyek.push(await cili.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Ellenez' }, KEZDET + 2000));

  return { esemenyek, anna, bela, cili, elso, masodik, javaslat };
}

/**
 * Kétfelé osztja az eseményeket — VÁLTAKOZVA, hogy mindkét lánc lyukas legyen.
 * Ez a legrosszabb eset: nem „az egyik lemaradt", hanem mindkettő hiányosan tud.
 */
function ketfele(esemenyek) {
  const egyike = esemenyek.filter((_, i) => i % 2 === 0);
  const masike = esemenyek.filter((_, i) => i % 2 === 1);
  return { egyike, masike };
}

// ===================================
// 1. A SORREND — hálózat nélkül
// ===================================

proba('⭐ UGYANAZ A HALMAZ, MÁS SORREND → ugyanaz az ujjlenyomat', async () => {
  const { esemenyek } = await teljesEset();

  const egyenes = await ujTar(); await ment(egyenes, esemenyek);
  const fordított = await ujTar(); await ment(fordított, [...esemenyek].reverse());

  return await ujjlenyomat(egyenes) === await ujjlenyomat(fordított);
});

proba('⭐ A LISTÁK SORRENDJE is azonos (nem csak az értékek)', async () => {
  // Ez az, ami a kézi próbán elromlott: a két gép ugyanazokat az entitásokat számolta,
  // de más sorrendben sorolta fel őket. Az ujjlenyomat ezt is fedi — de nézzük meg
  // közvetlenül is, hogy a próba ne csak közvetve mérje.
  const { esemenyek } = await teljesEset();

  const egyenes = await ujTar(); await ment(egyenes, esemenyek);
  const fordított = await ujTar(); await ment(fordított, [...esemenyek].reverse());

  const a = (await kep(egyenes)).allapot;
  const b = (await kep(fordított)).allapot;
  const sorrend = (allapot) => [...allapot.entitasok.keys()].join(',');

  return sorrend(a) === sorrend(b) && a.entitasok.size === 2;
});

// ===================================
// 2. AZ ÖSSZEHASONLÍTÁS TUD NEMET MONDANI
// ===================================

proba('⭐ A VIZSGA NEM VAK: csere ELŐTT a két készülék MÁST számol', async () => {
  const { esemenyek } = await teljesEset();
  const { egyike, masike } = ketfele(esemenyek);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);

  return await ujjlenyomat(egyik) !== await ujjlenyomat(masik);
});

proba('Az eltérés MEGNEVEZHETŐ: melyik szakaszban van', async () => {
  const { esemenyek } = await teljesEset();
  const { egyike, masike } = ketfele(esemenyek);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);

  const a = allapotOsszefoglaloja(...Object.values(await kep(egyik)));
  const b = allapotOsszefoglaloja(...Object.values(await kep(masik)));
  const hol = elteresek(a, b);

  // Nem elég, hogy „eltér" — meg is kell tudni mondani, hol
  return hol.length > 0 && hol.includes('entitasok');
});

proba('⛔⛔ AZ ELTÉRÉS-KERESÉS KÉTOLDALÚ: a csak az EGYIK oldalon meglévő szakasz is eltérés',
  async () => {
    // ⛔ MIT MÉR (2026-09-21): 2026-09-21-ig a bejárás csak az ELSŐ összefoglaló kulcsain
    // ment végig, és ennek KÉT külön rossz vége volt — ezért két irányban is mérjük:
    //   · ami csak a MÁSODIKNÁL van meg, arról némán hallgatott;
    //   · ami csak az ELSŐNÉL van meg, ott `kanonikusSzoveg(undefined)`-ot hívott, ami
    //     HIBÁT DOB — tehát összeomlott ahelyett, hogy megnevezte volna.
    // ⭐ Épp a D66-os eset: két készülék más program-változatot futtat, és az egyik
    // összefoglalójában van egy szakasz, ami a másikéban nincs.
    const teljes = { koino: { nev: 'A' }, entitasok: [], ujSzakasz: [1, 2] };
    const regi = { koino: { nev: 'A' }, entitasok: [] };

    // (1) A MÁSODIKNÁL hiányzik — korábban némán elsikkadt volna.
    const elore = elteresek(teljes, regi);
    // (2) Az ELSŐNÉL hiányzik — korábban HIBÁT DOBOTT volna.
    let visszafeleHiba = false;
    let vissza = [];
    try { vissza = elteresek(regi, teljes); } catch { visszafeleHiba = true; }

    return elore.length === 1 && elore[0] === 'ujSzakasz'
      && !visszafeleHiba && vissza.length === 1 && vissza[0] === 'ujSzakasz'
      // ⭐ És ami MINDKETTŐBEN megvan és egyezik, az továbbra sem eltérés — különben a
      // próba akkor is zöld lenne, ha a függvény mindenre igent mondana.
      && elteresek(regi, regi).length === 0;
  });

// ===================================
// ⭐⭐⭐ A KÉZI ÚT: A LAP (2026-09-21)
// ===================================
//
// ⛔ MIÉRT KELL: az `elteresek` eddig EGYETLEN éles hívó nélkül állt, mert az összevetéshez
// a másik gép összefoglalója kell — és arra nem volt út. A vonalra nem tesszük (6. szabály),
// tehát marad a 4. szabály útja: egy fájl.

proba('⭐⭐ A LAP KÖRBEÉR: amit kiírok, abból ugyanaz az összefoglaló jön vissza', async () => {
  const { esemenyek } = await teljesEset();
  const t = await ujTar(); await ment(t, esemenyek);
  const { allapot, javaslatok } = await kep(t);

  const szoveg = await ujjlenyomatLap(allapot, javaslatok,
    { koino: KOINO, szerzo: 'valaki', pillanat: KESOBB, napokMulva: 0 });
  const lap = await ujjlenyomatLapBol(szoveg);

  const mienk = allapotOsszefoglaloja(allapot, javaslatok);
  return lap.koino === KOINO && lap.pillanat === KESOBB
    // ⭐ A BIZONYÍTÉK: a visszaolvasott összefoglalóval az eltérés-keresés ÜRESET ad.
    && elteresek(mienk, lap.osszefoglalo).length === 0
    && lap.ujjlenyomat === await allapotUjjlenyomata(allapot, javaslatok);
});

proba('⛔⛔ AZ ÁTÍRT LAP NEM „MÁS ÁLLAPOT", HANEM HIBA — a lap újra lenyomatolódik', async () => {
  const { esemenyek } = await teljesEset();
  const t = await ujTar(); await ment(t, esemenyek);
  const { allapot, javaslatok } = await kep(t);
  const szoveg = await ujjlenyomatLap(allapot, javaslatok, { koino: KOINO });

  // ⚠️ Egy szövegszerkesztővel bárki átírhat egy címet a lapon. ⭐ Az olvasás újra
  // lenyomatol (ugyanaz az elv, mint a fájl-tárnál) — tehát nem „kicsit más állapotnak"
  // látszik, hanem lelepleződik. *A hiány és a hamisítás nem ugyanaz (D19).*
  const atirt = szoveg.replace('Anna gondolata', 'Átírt gondolat');
  let atirtBukott = false;
  try { await ujjlenyomatLapBol(atirt); } catch { atirtBukott = true; }

  // ⛔ És ami nem a mi alakunk, az nem lap.
  let idegenBukott = false;
  try { await ujjlenyomatLapBol('{"alak":"valami-mas"}'); } catch { idegenBukott = true; }

  let olvashatatlanBukott = false;
  try { await ujjlenyomatLapBol('ez nem json'); } catch { olvashatatlanBukott = true; }

  // ⚠️ És a próba nem vak: az ÉP lap átmegy.
  const ep = await ujjlenyomatLapBol(szoveg);

  return atirtBukott && idegenBukott && olvashatatlanBukott && ep.alak === 'koino-ujjlenyomat-1';
});

// ===================================
// 3. A VIZSGA
// ===================================

proba('⭐⭐ A VIZSGA: kevert események, csere, AZONOS ÁLLAPOT', async () => {
  const { esemenyek } = await teljesEset();
  const { egyike, masike } = ketfele(esemenyek);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);

  await csereDroton(egyik, masik);

  return await ujjlenyomat(egyik) === await ujjlenyomat(masik);
});

proba('⭐ …és ez UGYANAZ, mintha egyik gép mindent tudott volna', async () => {
  // Fontosabb, mint amilyennek látszik: két hiányos gép megegyezhetne egy KÖZÖS TÉVEDÉSBEN
  // is. Ezért nem elég, hogy egyeznek — azzal kell egyezniük, ami az IGAZSÁG.
  const { esemenyek } = await teljesEset();
  const { egyike, masike } = ketfele(esemenyek);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);
  const mindentTudo = await ujTar(); await ment(mindentTudo, esemenyek);

  await csereDroton(egyik, masik);

  const igazsag = await ujjlenyomat(mindentTudo);
  return await ujjlenyomat(egyik) === igazsag && await ujjlenyomat(masik) === igazsag;
});

proba('⭐ AZ EGYEZMÉNY mindkét gépen megszületik — ugyanazzal a pillanatképpel', async () => {
  // „Az egyezmény nem esemény, hanem SZÁMÍTÁS eredménye" (D17) — senki nem mondja ki.
  // Ez a próba azt méri, hogy két gép ugyanazt SZÁMOLJA ki, nem azt, hogy megegyeztek.
  const { esemenyek, javaslat } = await teljesEset();
  const { egyike, masike } = ketfele(esemenyek);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);
  await csereDroton(egyik, masik);

  const a = (await kep(egyik)).javaslatok.get(javaslat.azonosito);
  const b = (await kep(masik)).javaslatok.get(javaslat.azonosito);

  return !!a?.egyezmeny && !!b?.egyezmeny
      && a.statusz === b.statusz
      && a.egyezmeny.megszuletett === b.egyezmeny.megszuletett
      && a.egyezmeny.pillanatkep.tamogatottsagEzrelek === b.egyezmeny.pillanatkep.tamogatottsagEzrelek;
});

// ===================================
// 4. A NEHÉZ ESETEK
// ===================================

proba('⭐ KETTŐS SZAVAZAT KÉT KÉSZÜLÉKEN: a csere után mindkettő ugyanazt veszi', async () => {
  // A hétköznapi eset: valakinek két készüléke van, mindkettőn szavaz, mielőtt összeérnének.
  // A saját lánca kettéágazik. A koino nem büntet — determinisztikusan választ, és JELEZ.
  const { esemenyek, javaslat, cili } = await teljesEset();

  // Cili ugyanarról a pontról egy MÁSIK szavazatot is aláír (a másik készülékén)
  const masikSzavazat = await cili.elagaztat('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000);

  const egyik = await ujTar(); await ment(egyik, esemenyek);
  const masik = await ujTar(); await ment(masik, [...esemenyek.slice(0, -1), masikSzavazat]);

  // Csere ELŐTT: az egyik az egyik szavazatot ismeri, a másik a másikat
  const elotte = await ujjlenyomat(egyik) !== await ujjlenyomat(masik);

  await csereDroton(egyik, masik);

  const a = (await kep(egyik)).allapot;
  const b = (await kep(masik)).allapot;

  return elotte
      && await ujjlenyomat(egyik) === await ujjlenyomat(masik)
      && a.ellentmondasok.length === 1 && b.ellentmondasok.length === 1;
});

proba('⭐ A SZABÁLYSÉRTŐ esemény mindkét gépen UGYANÚGY esik ki', async () => {
  // A keretet túllépő tudatpont: nem törlődik, de nem is számít — és a KIVÉTELEK
  // listájában mindkét gépen ugyanúgy jelenik meg.
  const { esemenyek, cili, elso } = await teljesEset();
  const tullepo = await cili.tesz('TudatpontRendezes',
    { entitas: elso.azonosito, pont: 999999, szerep: 'aktiv' }, KEZDET + 3000);

  const mind = [...esemenyek, tullepo];
  const { egyike, masike } = ketfele(mind);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);
  await csereDroton(egyik, masik);

  const a = (await kep(egyik)).allapot;
  const b = (await kep(masik)).allapot;

  return await ujjlenyomat(egyik) === await ujjlenyomat(masik)
      && a.kivetelek.length === 1
      && a.kivetelek[0].azonosito === tullepo.azonosito
      && b.kivetelek[0].azonosito === tullepo.azonosito;
});

proba('⭐ HÁROM KÉSZÜLÉK: a harmadik is ugyanoda jut, láncolt cserével', async () => {
  // A ↔ B, majd B ↔ C — a harmadik gép sosem beszélt A-val, mégis mindent megtud.
  // Ez a P2P lényege: nincs kitüntetett gép, amin minden átmegy.
  const { esemenyek } = await teljesEset();
  const harmad = Math.ceil(esemenyek.length / 3);

  const a = await ujTar(); await ment(a, esemenyek.slice(0, harmad));
  const b = await ujTar(); await ment(b, esemenyek.slice(harmad, 2 * harmad));
  const c = await ujTar(); await ment(c, esemenyek.slice(2 * harmad));

  await csereDroton(a, b);
  await csereDroton(b, c);
  await csereDroton(a, b);   // A-nak vissza kell kapnia, amit B C-től kapott

  const egy = await ujjlenyomat(a);
  return egy === await ujjlenyomat(b) && egy === await ujjlenyomat(c);
});

// ===================================
// A POSTALÁDA (D34, Szakasz 2 / C. lépés)
// ===================================
//
// ⭐ MI A KÜLÖNBSÉG A FENTI „HÁROM KÉSZÜLÉK" PRÓBÁHOZ KÉPEST? Ott B **fogadott is és
// hívott is**. Itt Anna és Béla EGYIKE SEM TUD FOGADNI — csak kifelé szólnak, Cilihez.
// Ez a valódi helyzet: a fejlesztő routere mind a három szabvánnyal elutasította a
// kapunyitást (NAT-PMP, PCP, UPnP), tehát a legtöbb e-ember pontosan ilyen lesz.
//
// ⭐ ÉS AMIT BIZONYÍT: Cilinek NEM kell egyszerre online tartania a két felet — ez a TURN
// (élő továbbító) drágasága, és épp ez az, amit a koino megúszhat. Elég, ha ÁTVESZI,
// ELTÁROLJA, és a következő beszélgetésnél TOVÁBBADJA. Anna és Béla soha nem beszélt
// egymással, mégis mindent tudnak.
//
// ⚠️ A HATÁR, amit ez a próba NEM fed: Cili csak abban a koinóban postaláda, amelyikben
// ő maga is benne van (a tára koinónként külön mappa). Egy idegen koino forgalmát ma nem
// veszi át. Ez nem hiba, hanem felírt korlát — a terjedés szempontjából majd kérdés lesz.

proba('⭐⭐ A POSTALÁDA (D34): Anna és Béla SOHA nem beszélt, mégis ugyanazt tudja', async () => {
  const { esemenyek } = await teljesEset();
  const fele = Math.ceil(esemenyek.length / 2);

  const anna = await ujTar(); await ment(anna, esemenyek.slice(0, fele));
  const bela = await ujTar(); await ment(bela, esemenyek.slice(fele));
  const cili = await ujTar();                       // a postaláda: ÜRESEN indul

  // ⭐ CSAK CILI FOGAD. Anna és Béla csak a kopogás idejére nyit kaput — végig ők kezdenek.
  const postalada = await postaladaNyitasa(cili);

  let beszelgetesek = 0;
  try {
    // ⚠️ EGYMÁS UTÁN, nem egyszerre: minden beszélgetés lezárul, mielőtt a következő nyílik.
    // Épp ez a lényeg — Cilinek sosem kell két felet EGYSZERRE online tartania.
    await bekopog(anna, postalada);   // Cili átveszi Annáét
    await bekopog(bela, postalada);   // Béla megkapja, ad
    await bekopog(anna, postalada);   // Anna megkapja Béláét
    // ⚠️ Cili munkája a bekopogó után zárul (kiürítés) — egy pillanatot várunk rá.
    for (let i = 0; i < 40 && postalada.beszelgetesek() < 3; i++) {
      await new Promise((t) => setTimeout(t, 50));
    }
    beszelgetesek = postalada.beszelgetesek();
  } finally {
    postalada.bezar();
  }

  const egy = await ujjlenyomat(anna);
  return beszelgetesek === 3
    && egy === await ujjlenyomat(bela)
    && egy === await ujjlenyomat(cili);
});

proba('⭐ A postaláda TOVÁBBAD olyat is, amiről ő maga nem tud semmit', async () => {
  // Cili üresen indul, és nem szerzője egyetlen eseménynek sem — mégis ő viszi át
  // Béláékhoz Anna eseményeit. A továbbítás nem igényel „érdekeltséget".
  const anna = await ujEember(KOINO);
  const esemenyek = [];
  for (let i = 1; i <= 3; i++) {
    esemenyek.push(await anna.tesz('GondolatLetrehozas', { cim: 'T' + i, meret: 10 }, KEZDET));
  }

  const annaTar = await ujTar(); await ment(annaTar, esemenyek);
  const belaTar = await ujTar();
  const ciliTar = await ujTar();

  const postalada = await postaladaNyitasa(ciliTar);
  try {
    await bekopog(annaTar, postalada);
    await bekopog(belaTar, postalada);
  } finally {
    postalada.bezar();
  }

  return (await koinoEsemenyei(belaTar, KOINO)).length === 3
    && (await koinoEsemenyei(ciliTar, KOINO)).length === 3;
});

proba('⭐ A postaláda NEM kap engedékenyebb kaput: a hamisítottat nem adja tovább', async () => {
  // ⚠️ EZ A LEGFONTOSABB RONTÁS-PRÓBA A POSTALÁDÁHOZ. Ha a továbbító át tudná engedni a
  // hamisítványt, akkor a „bizalom az aláírásban van, nem a csatornában" (D32) elbukna —
  // és a postaláda-szerep épp azt tenné veszélyessé, amit olcsóvá tesz.
  const anna = await ujEember(KOINO);
  const jo = await anna.tesz('GondolatLetrehozas', { cim: 'Igazi', meret: 10 }, KEZDET);
  const hamis = { ...jo, adat: { ...jo.adat, cim: 'Átírva' } };   // az aláírás már nem passzol

  const annaTar = await ujTar(); await ment(annaTar, [jo]);
  await annaTar.hozzafuz(hamis);            // ⚠️ a kapu MEGKERÜLÉSÉVEL a fájlba írjuk

  const belaTar = await ujTar();
  const ciliTar = await ujTar();

  const postalada = await postaladaNyitasa(ciliTar);
  try {
    await bekopog(annaTar, postalada);
    await bekopog(belaTar, postalada);
  } finally {
    postalada.bezar();
  }

  // A postaládába se, Bélához se juthatott el a hamisítvány — az igazi viszont igen.
  const ciliE = await koinoEsemenyei(ciliTar, KOINO);
  const belaE = await koinoEsemenyei(belaTar, KOINO);
  const atirtat = (lista) => lista.some((e) => e.adat?.cim === 'Átírva');
  return !atirtat(ciliE) && !atirtat(belaE)
    && ciliE.length === 1 && belaE.length === 1        // CSAK az igazi ment át
    && belaE.some((e) => e.adat?.cim === 'Igazi');
});

export async function takaritas() {
  for (const mappa of mappak) await rm(mappa, { recursive: true, force: true });
}

export default async function (csendes) {
  const eredmeny = await futtatas(csendes);
  await takaritas();
  return eredmeny;
}
