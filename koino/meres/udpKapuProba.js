// koino/meres/udpKapuProba.js

// Felelősség: bizonyítani, hogy az ÁLLANDÓ UDP-KAPU (D69/3) azt teszi, amiért született —
// hálózat és koinó nélkül, egy HAMIS munkával, két kapuval a gépen belül.
//
// ⭐ MIT KELL ITT BIZONYÍTANI (a mért bajokból, 2026-09-25):
//   · a kopogásra a kapu ABLAK NÉLKÜL is felel, és a bekopogóval munka indul (41., 42. mérés);
//   · társanként EGYSZERRE EGY munka — a munka alatti kopogás FOGLALT-at kap, és a munka
//     után visszakopogunk (42. mérés, 16:37: „nyitva van, de nem szolgál ki");
//   · a saját visszhang nem munka; a bekopogók száma korlátos; és ha a cél a címét tartva
//     MÁS portról jelentkezik, azt is őt ismerjük fel.
//
// Futtatás: node koino/meres/mind.js udpkapu

import { createSocket } from 'node:dgram';
import { probaGyujtemeny } from './probaFuttato.js';
import { udpKapuNyitasa } from '../js/csere/udpKapu.js';

const { proba, futtatas } = probaGyujtemeny('Az állandó UDP-kapu próbája (D69/3)');

const varj = (ms) => new Promise((kesz) => setTimeout(kesz, ms));

/**
 * Egy kapu hamis munkával: feljegyzi, kivel és hányszor dolgozott, és hány munka futott
 * EGYSZERRE ugyanazzal a társsal.
 * ⭐ A munka a társnak IDŐNKÉNT adat-szerű csomagot küld — ettől tudja a TÚLOLDALI kapu,
 * hogy a beszélgetés már él. ⚠️ Az első változat csak EGYET küldött, az elején: az még a
 * túloldali munka indulása előtt ért oda, és a FOGLALT-szabály meg sem kaphatta az esélyt.
 * *Egy valódi csere folyamatosan beszél — a hamisnak is kell.*
 */
async function hamisKapu({ ido = 100, bekopogoKorlat = 3, jegyzekKorlat } = {}) {
  const naplo = { munkak: [], egyszerre: 0, csucs: 0, jelzesek: [] };
  const futo = new Map();
  const kapu = await udpKapuNyitasa({
    port: 0,
    bekopogoKorlat,
    jegyzekKorlat,
    jelez: (e) => naplo.jelzesek.push(e),
    munka: async (halo, tars) => {
      const kulcs = tars.cim + ':' + tars.port;
      futo.set(kulcs, (futo.get(kulcs) ?? 0) + 1);
      naplo.csucs = Math.max(naplo.csucs, futo.get(kulcs));
      naplo.munkak.push({ ...tars });
      const beszel = () => halo.send(JSON.stringify({ sz: 1, a: 'x' }), tars.port, tars.cim);
      beszel();
      const ora = setInterval(beszel, 50);
      await varj(ido);
      clearInterval(ora);
      futo.set(kulcs, futo.get(kulcs) - 1);
      return { uj: 0 };
    }
  });
  return { kapu, naplo };
}

const cel = (k) => [{ cim: '127.0.0.1', port: k.kapu.port }];

/**
 * Nyers UDP-foglalatok — mindegyik egy külön „feladó" (más port = más bejegyzés a kapuban).
 * Megszámolják, hány csomagot kaptak; a `hallakEgyszer` az első KOPOG-ra `kesleltetes` múlva
 * EGY HALLAK-ot mond (csak egyszer — így a válasz sorsa mérhető).
 */
async function nyersFeladok(db, { hallakEgyszer = false, kesleltetes = 0 } = {}) {
  const lista = [];
  for (let i = 0; i < db; i++) {
    const s = createSocket({ type: 'udp4' });
    await new Promise((kesz) => s.bind(0, '127.0.0.1', kesz));
    const f = { s, port: s.address().port, kapott: 0, felelt: false };
    s.on('message', (adat, honnan) => {
      f.kapott++;
      let u;
      try { u = JSON.parse(adat.toString('utf8')); } catch { return; }
      if (hallakEgyszer && !f.felelt && u.uzenet === 'KOPOG') {
        f.felelt = true;
        setTimeout(() => s.send(JSON.stringify({ uzenet: 'HALLAK', tol: 'nyers' + i }),
          honnan.port, honnan.address), kesleltetes);
      }
    });
    lista.push(f);
  }
  return {
    lista,
    kopog: (port) => lista.forEach((f, i) =>
      f.s.send(JSON.stringify({ uzenet: 'KOPOG', tol: 'arasztó' + i }), port, '127.0.0.1')),
    zar: () => lista.forEach((f) => f.s.close())
  };
}

proba('⭐⭐ A KOPOGÁSRA A KAPU ABLAK NÉLKÜL IS FELEL — és a bekopogóval MINDKÉT oldalon munka indul', async () => {
  // ⛔ A régi fúró csak a SAJÁT kopogási ablakában élt: a B itt soha nem kopog, mégis felel.
  const a = await hamisKapu();
  const b = await hamisKapu();
  try {
    const kor = await a.kapu.kopog(cel(b), { idokorlat: 3000 });
    await varj(300);
    return kor.atfurt === 1 && kor.sikeres === 1
      && a.naplo.munkak.length === 1 && b.naplo.munkak.length === 1
      && b.naplo.munkak[0].port === a.kapu.port && b.naplo.munkak[0].bekopogo === true
      && b.naplo.jelzesek.some((e) => e.mi === 'BEKOPOGO-CEL');
  } finally { a.kapu.zar(); b.kapu.zar(); }
});

proba('⛔⛔ TÁRSANKÉNT EGYSZERRE EGY MUNKA — a munka alatti kopogás FOGLALT-at kap, és utána sorra kerül', async () => {
  // ⛔ A 42. mérés 16:37-es esete: a társ új ablakban kopogott, miközben a munkánk vele még
  // futott. ⭐ Itt a B munkája lassú (1,5 mp); az A közben újra kopog.
  const a = await hamisKapu({ ido: 100 });
  const b = await hamisKapu({ ido: 1500 });
  try {
    const elso = a.kapu.kopog(cel(b), { idokorlat: 800 });
    await varj(400);                                  // a B munkája már adatot kapott
    const masodik = await a.kapu.kopog(cel(b), { idokorlat: 4000 });
    await elso;
    await varj(1800);
    return b.naplo.csucs === 1                        // ⛔ soha nem futott kettő egyszerre
      && b.naplo.munkak.length >= 2                   // ⭐ …de a második kopogás is sorra került
      && a.naplo.jelzesek.some((e) => e.mi === 'FOGLALT')
      && masodik.atfurt === 1;
  } finally { a.kapu.zar(); b.kapu.zar(); }
});

proba('⛔ A SAJÁT VISSZHANG NEM MUNKA', async () => {
  const a = await hamisKapu();
  try {
    const kor = await a.kapu.kopog(cel(a), { idokorlat: 1500 });
    return kor.atfurt === 0 && a.naplo.munkak.length === 0
      && a.naplo.jelzesek.some((e) => e.mi === 'SAJAT-VISSZHANG');
  } finally { a.kapu.zar(); }
});

proba('⛔ A BEKOPOGÓK SZÁMA KORLÁTOS — a korlát fölötti FOGLALT-at kap, és később sorra kerül', async () => {
  // ⭐ A B egyszerre egy ismeretlennel dolgozik. Az A és a C egyszerre kopog.
  const a = await hamisKapu();
  const c = await hamisKapu();
  const b = await hamisKapu({ ido: 1200, bekopogoKorlat: 1 });
  try {
    const [ka, kc] = await Promise.all([
      a.kapu.kopog(cel(b), { idokorlat: 5000 }),
      c.kapu.kopog(cel(b), { idokorlat: 5000 })
    ]);
    await varj(1500);
    return b.naplo.munkak.length === 2
      && b.naplo.jelzesek.some((e) => e.mi === 'BEKOPOGO-ELUTASITVA')
      && ka.atfurt === 1 && kc.atfurt === 1;
  } finally { a.kapu.zar(); b.kapu.zar(); c.kapu.zar(); }
});

proba('⭐ HA A CÉL A CÍMÉT TARTVA MÁS PORTRÓL JELENTKEZIK, AZT IS ŐT ISMERJÜK FEL (mobil portváltás)', async () => {
  // ⭐ Az A a B RÉGI (halott) portjára kopog; közben a B — az új portjáról — az A-ra kopog.
  // A mobil NAT így néz ki: a cím marad, a port változott (32. mérés).
  const a = await hamisKapu();
  const b = await hamisKapu();
  try {
    const halott = { cim: '127.0.0.1', port: b.kapu.port === 65000 ? 65001 : 65000 };
    const [ka] = await Promise.all([
      a.kapu.kopog([halott], { idokorlat: 2500 }),
      b.kapu.kopog(cel(a), { idokorlat: 2500 })
    ]);
    await varj(300);
    return ka.atfurt === 1 && ka.eredmenyek[0].port === b.kapu.port;
  } finally { a.kapu.zar(); b.kapu.zar(); }
});

proba('⭐ AKIVEL MÁR FUT A MUNKA, ARRA NEM KOPOGUNK — a futó munkáját számoljuk be', async () => {
  // ⭐ A B bekopogott az A-hoz (az A-nál munka indult); az A-nak épp most kezdődik egy köre,
  // amiben a B is cél. Nem kezd második munkát, és a kör a futót adja vissza.
  const a = await hamisKapu({ ido: 1200 });
  const b = await hamisKapu({ ido: 100 });
  try {
    b.kapu.kopog(cel(a), { idokorlat: 1500 });
    await varj(300);
    const kor = await a.kapu.kopog(cel(b), { idokorlat: 1500 });
    await varj(300);
    return kor.atfurt === 1 && kor.sikeres === 1 && a.naplo.csucs === 1
      && a.naplo.munkak.length === 1;
  } finally { a.kapu.zar(); b.kapu.zar(); }
});

proba('⛔⛔ A JEGYZÉK DARABRA IS KORLÁTOS — száz hamis feladó sem nő a plafon fölé', async () => {
  // ⛔ Az átnézés lelete (2026-09-25): a UDP feladócíme hamisítható, és minden új feladó új
  // bejegyzés volt — a plafon csak az IDŐ volt (10 perc). Itt 100 feladó, 20-as plafon.
  const b = await hamisKapu({ jegyzekKorlat: 20 });
  const arasztok = await nyersFeladok(100);
  try {
    arasztok.kopog(b.kapu.port);
    await varj(400);
    return b.kapu.tarsakSzama() <= 20 && b.kapu.tarsakSzama() > 0;
  } finally { b.kapu.zar(); arasztok.zar(); }
});

proba('⛔⛔ …ÉS AZ ELÁRASZTÁS NEM SZORÍTJA KI A FRISS KOPOGÁSUNK CÉLJÁT — a HALLAK utána is munkát indít', async () => {
  // ⭐ A kiszorítás a LEGRÉGEBBEN látottat dobná — és az épp a mi célunk: rá kopogtunk
  // elsőként, az áradat utána jött. Ha kiesne, a HALLAK-ja kóbor csomagnak látszana, és egy
  // elárasztó így a mi köreinket is elbuktatná. ⚠️ A bekopogó-korlát 0: az áradat egyetlen
  // tagjára sem kopogunk vissza, tehát a portváltás-felismerés sem mentheti meg a célt.
  const a = await hamisKapu({ jegyzekKorlat: 20, bekopogoKorlat: 0 });
  const cel1 = await nyersFeladok(1, { hallakEgyszer: true, kesleltetes: 300 });
  const arasztok = await nyersFeladok(60);
  try {
    const kor = a.kapu.kopog([{ cim: '127.0.0.1', port: cel1.lista[0].port }], { idokorlat: 900 });
    await varj(80);
    arasztok.kopog(a.kapu.port);                      // az áradat a kopogás és a HALLAK között
    const eredmeny = await kor;
    return eredmeny.atfurt === 1 && a.naplo.munkak.length === 1
      && a.kapu.tarsakSzama() <= 20;
  } finally { a.kapu.zar(); cel1.zar(); arasztok.zar(); }
});

proba('⛔ HA NINCS KISZORÍTHATÓ HELY, AZ IDEGEN ÚJ FELADÓ NEM KAP VÁLASZT — és a „tele" EGYSZER hangzik el', async () => {
  // ⭐ Öt saját célunk tölti ki a jegyzéket (friss kopogás védi őket). Az áradat húsz tagja
  // közül senki nem kerül be, senki nem kap választ (se HALLAK, se FOGLALT, se visszakopogás),
  // és a napló egyetlen sort kap, nem húszat.
  const a = await hamisKapu({ jegyzekKorlat: 5 });
  const nemak = await nyersFeladok(5);
  const arasztok = await nyersFeladok(20);
  try {
    const kor = a.kapu.kopog(nemak.lista.map((f) => ({ cim: '127.0.0.1', port: f.port })),
      { idokorlat: 700 });
    await varj(100);
    arasztok.kopog(a.kapu.port);
    await varj(300);
    const tele = a.naplo.jelzesek.filter((e) => e.mi === 'JEGYZEK-TELE').length;
    const valasz = arasztok.lista.reduce((s, f) => s + f.kapott, 0);
    await kor;
    return a.kapu.tarsakSzama() === 5 && tele === 1 && valasz === 0;
  } finally { a.kapu.zar(); nemak.zar(); arasztok.zar(); }
});

export default futtatas;

// Önállóan is futtatható: node koino/meres/udpKapuProba.js
if (process.argv[1] && process.argv[1].endsWith('udpKapuProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
