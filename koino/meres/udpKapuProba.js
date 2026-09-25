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
async function hamisKapu({ ido = 100, bekopogoKorlat = 3 } = {}) {
  const naplo = { munkak: [], egyszerre: 0, csucs: 0, jelzesek: [] };
  const futo = new Map();
  const kapu = await udpKapuNyitasa({
    port: 0,
    bekopogoKorlat,
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

export default futtatas;

// Önállóan is futtatható: node koino/meres/udpKapuProba.js
if (process.argv[1] && process.argv[1].endsWith('udpKapuProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
