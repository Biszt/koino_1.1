// koino/meres/kapuProba.js — a HELYI KAPU önpróbája (Szakasz 5 / 5.1 lépés)

// Mit bizonyít ez a lap?
//
// A kapu az egyetlen pont, ahol a koino **kifelé nyit a saját gépén** — és a kulcsfájl
// (`koino-adat/kulcs.json`) néhány könyvtárnyira van tőle. Ezért itt a RONTÁS-PRÓBÁK a
// fontosak: nem az érdekel, hogy egy jó kérés átmegy-e, hanem hogy a **rossz elakad-e**.
//
// ⭐ ÉS EGY PRÓBA, AMI NEM KÉRÉST MÉR: az utolsó a FORRÁST olvassa, és azt állítja, hogy a
// program sehol nem importálja a felületet. Ez a `felulet_terv.md` 3. pontjának első
// szabálya — így **ellenőrizhető szabály lett, nem ígéret**.

import { mkdtemp, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { tmpdir, networkInterfaces } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:http';
import { connect } from 'node:net';

import { probaGyujtemeny } from './probaFuttato.js';
import { kapuNyitasa, biztonsagosUt } from '../js/felulet/kapu.js';

const { proba, futtatas } = probaGyujtemeny('A HELYI KAPU (Szakasz 5 / 5.1)');

const JELSZO = 'proba-jelszo-csak-a-mereshez-1234567890';

// ===================================
// SEGÉDEK
// ===================================

/**
 * Egy HTTP-kérés — ⚠️ `node:http`-vel, nem `fetch`-csel. Azért, mert a `fetch` NEM engedi
 * beállítani a `Host` fejlécet (tiltott fejlécnév), a DNS-visszakötés próbájához viszont
 * pont arra van szükség.
 */
function keres(port, utvonal, { fejlecek = {}, modszer = 'GET' } = {}) {
  return new Promise((kesz, hiba) => {
    const k = request(
      { host: '127.0.0.1', port, path: utvonal, method: modszer, headers: fejlecek },
      (v) => {
        let test = '';
        v.on('data', (d) => { test += d; });
        v.on('end', () => kesz({ allapot: v.statusCode, test, fejlecek: v.headers }));
      }
    );
    k.on('error', hiba);
    k.end();
  });
}

/** Eldobható mappa egy `index.html`-lel — és MELLETTE egy „kulcsfájl", amit el kell rejteni. */
async function probaMappa() {
  const alap = await mkdtemp(join(tmpdir(), 'koino-kapu-'));
  const felulet = join(alap, 'felulet');
  await mkdir(felulet);
  await writeFile(join(felulet, 'index.html'), '<h1>koino</h1>', 'utf8');
  await writeFile(join(felulet, 'kod.js'), 'export const a = 1;', 'utf8');
  // ⚠️ EZ A LÉNYEG: a „kulcs" a felület mappáján KÍVÜL van, egy szinttel feljebb —
  // pontosan úgy, ahogy élesben a `koino-adat/kulcs.json`.
  await writeFile(join(alap, 'kulcs.json'), '{"privatKulcs":"EZ_A_SZEMELYAZONOSSAGOD"}', 'utf8');
  return { alap, felulet };
}

/** Kaput nyit a próbához, lefuttatja a törzset, aztán MINDIG bezárja. */
async function kapuval(torzs, { kezelo } = {}) {
  const { alap, felulet } = await probaMappa();
  // port: 0 → az operációs rendszer ad szabadot (nem ütközünk semmivel)
  const kapu = await kapuNyitasa({ mappa: felulet, kezelo, port: 0, jelszo: JELSZO });
  try {
    return await torzs(kapu, { alap, felulet });
  } finally {
    await kapu.zar();
  }
}

const jelszoval = { 'x-koino-kulcs': JELSZO };

// ===================================
// 1. AMI MŰKÖDIK
// ===================================

proba('A kapu kiszolgálja a lapot — jelszóval', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/', { fejlecek: jelszoval });
  return v.allapot === 200 && v.test.includes('koino');
}));

proba('⭐ A jelszó a CÍMSORBÓL is jó — ezt tudod kézzel átadni', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/?kulcs=' + JELSZO);
  return v.allapot === 200 && v.test.includes('koino');
}));

proba('A kiírt cím önmagában működik (jelszó benne)', () => kapuval(async (kapu) => {
  const utvonal = kapu.cim.slice(kapu.cim.indexOf('/', 'http://'.length));
  const v = await keres(kapu.port, utvonal);
  return v.allapot === 200;
}));

proba('A fájltípus a kiterjesztésből jön (a .js nem text/plain)', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/kod.js', { fejlecek: jelszoval });
  return v.allapot === 200 && v.fejlecek['content-type'].startsWith('text/javascript');
}));

proba('⭐ A /api/… a KÍVÜLRŐL kapott kezelőhöz megy', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/api/en', { fejlecek: jelszoval });
  return v.allapot === 200 && JSON.parse(v.test).en === 'ez-a-kezelo-valasza';
}, {
  kezelo: async ({ utvonal }) =>
    utvonal === '/api/en' ? { adat: { en: 'ez-a-kezelo-valasza' } } : null
}));

proba('Az ismeretlen végpont 404 — a kezelő nemet mondhat', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/api/nincs-ilyen', { fejlecek: jelszoval });
  return v.allapot === 404;
}, { kezelo: async () => null }));

// ===================================
// 2. ⛔ RONTÁS-PRÓBÁK — a négy őr
// ===================================

// ⚠️⚠️ A JELSZÓ HATÁRA 2026-09-06-án AZ `/api/`-RA TOLÓDOTT (5.3) — és a próbák ezt
// követik. Az ok: az örökölt kártyák sima `fetch('./html/…')`-lel töltik a sablonjukat, a
// CSS `<link>`-kel jön; **egyik sem küld fejlécet**. A választás nem a kártyák átírása volt
// (elveszne, hogy változatlanul jönnek) és nem is süti (az minden kéréssel automatikusan
// menne — épp a CSRF-et hozná vissza), hanem: **a jelszó oda kerül, ahol az ADAT van.**
//
// ⭐ A kiszolgált fájlok a koino nyílt felülete — nincs bennük titok. Adatot csak az
// `/api/`-n át lehet olvasni, és (később) csak ott lehet a kulcsommal írni.

proba('⛔⛔ JELSZÓ NÉLKÜL az /api/ nem ad semmit', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/api/en');
  return v.allapot === 401 && !v.test.includes('ez-a-kezelo-valasza');
}, { kezelo: async () => ({ adat: { en: 'ez-a-kezelo-valasza' } }) }));

proba('⛔ ROSSZ JELSZÓVAL sem', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/api/en',
    { fejlecek: { 'x-koino-kulcs': 'nem-ez-a-jelszo-hanem-mas-1234' } });
  return v.allapot === 401;
}, { kezelo: async () => ({ adat: { en: 'x' } }) }));

proba('⛔ A JÓ JELSZÓ ELEJE sem elég (nem előtag-egyezés)', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/api/en', { fejlecek: { 'x-koino-kulcs': JELSZO.slice(0, 10) } });
  return v.allapot === 401;
}, { kezelo: async () => ({ adat: { en: 'x' } }) }));

proba('⭐ A LAP jelszó nélkül is betölt — de üres váz marad (az /api/ elakad)',
  () => kapuval(async (kapu) => {
    const lap = await keres(kapu.port, '/');
    const adat = await keres(kapu.port, '/api/en');
    return lap.allapot === 200 && adat.allapot === 401;
  }, { kezelo: async () => ({ adat: { en: 'x' } }) }));

proba('⛔⛔ …ÉS A KULCSFÁJL EKKOR SEM érhető el (az útvonal-őr a jelszótól független)',
  () => kapuval(async (kapu) => {
    const v = await keres(kapu.port, '/%2e%2e%2fkulcs.json');   // jelszó NÉLKÜL
    return v.allapot !== 200 && !v.test.includes('EZ_A_SZEMELYAZONOSSAGOD');
  }));

proba('⛔⛔ IDEGEN OLDAL fetch-e elakad, JÓ JELSZÓVAL IS (Origin-őr)', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/api/en', {
    fejlecek: { ...jelszoval, origin: 'https://tamado.example' }
  });
  return v.allapot === 403;
}, { kezelo: async () => { throw new Error('a kezelő meg sem hívódhat'); } }));

proba('⭐ …de a SAJÁT lap Originje átmegy', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/api/en', {
    fejlecek: { ...jelszoval, origin: 'http://127.0.0.1:' + kapu.port }
  });
  return v.allapot === 200;
}, { kezelo: async () => ({ adat: { en: 'ok' } }) }));

proba('⛔⛔ DNS-VISSZAKÖTÉS elakad: idegen domain a 127.0.0.1-re mutatva (Host-őr)',
  () => kapuval(async (kapu) => {
    // A támadó domainje a 127.0.0.1-re mutat, tehát az ő lapja AZONOS EREDETŰNEK látszik —
    // az Origin-őr átengedné. A Host fejléc viszont az ő nevét hozza.
    const v = await keres(kapu.port, '/api/en', {
      fejlecek: { ...jelszoval, host: 'tamado.example:' + kapu.port }
    });
    return v.allapot === 403;
  }, { kezelo: async () => { throw new Error('a kezelő meg sem hívódhat'); } }));

// ===================================
// 3. ⛔⛔ AZ ÚTVONAL-ŐR — itt a kulcsfájl a tét
// ===================================

// ⚠️⚠️ EZ A CSOPORT EGYSZER MÁR VAK VOLT — és ez a megjegyzés azért van itt, hogy ne
// legyen újra az.
//
// Elsőre a `/../kulcs.json`, a `/%2e%2e/kulcs.json` és a `/a/b/../../../kulcs.json`
// alakokat mértük. Mind a három átment — **de akkor is átment, amikor az útvonal-őrt
// KIKAPCSOLTUK.** Vagyis nem bizonyítottak semmit.
//
// ⭐ AZ OK, MÉRVE (2026-09-06): a WHATWG URL-elemző a `..` szegmenst — és a
// százalék-kódolt változatait (`%2e%2e`, `.%2e`) — **maga normalizálja**, még mielőtt a
// kódunk látná. Mind a három `/kulcs.json`-ra egyszerűsödött, ami a mappán BELÜL van, és
// csak azért lett 404, mert ott nincs ilyen fájl. *A próba a mappa tartalmát mérte, nem az
// őrt.*
//
// ⭐⭐ AMI VISZONT ÁTJUT AZ ELEMZŐN: a kódolt PER JEL. A `%2f` az `URL.pathname`-ben
// kódolva marad (nem szegmens-határ), a mi `decodeURIComponent`-ünk viszont `/`-t csinál
// belőle — így lesz a `/%2e%2e%2fkulcs.json`-ból `/../kulcs.json` a dekódolás UTÁN.
// **Ezek az igazi vektorok, és ezeket fogja az őr.**
//
// 🔍 A módszer, ami ezt kihozta: nem a próbát néztük, hanem KIKAPCSOLTUK az őrt, és
// megnéztük, bukik-e valami. Amelyik őrnél nem bukott semmi, ott a próba volt a hibás.

proba('⛔⛔ A KULCSFÁJL nem szerezhető meg kódolt per-jellel (%2e%2e%2f)',
  () => kapuval(async (kapu) => {
    const v = await keres(kapu.port, '/%2e%2e%2fkulcs.json', { fejlecek: jelszoval });
    return v.allapot !== 200 && !v.test.includes('EZ_A_SZEMELYAZONOSSAGOD');
  }));

proba('⛔⛔ …és a másik alakjával sem (..%2f)', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/..%2fkulcs.json', { fejlecek: jelszoval });
  return v.allapot !== 200 && !v.test.includes('EZ_A_SZEMELYAZONOSSAGOD');
}));

proba('⛔ Mély kilógás kódolt per-jelekkel sem visz ki', () => kapuval(async (kapu) => {
  const v = await keres(kapu.port, '/a%2f..%2f..%2fkulcs.json', { fejlecek: jelszoval });
  return v.allapot !== 200 && !v.test.includes('EZ_A_SZEMELYAZONOSSAGOD');
}));

proba('⭐ A sima ../ alakot már az URL-elemző elintézi (dokumentálva, nem az őr érdeme)',
  () => kapuval(async (kapu) => {
    const v = await keres(kapu.port, '/../kulcs.json', { fejlecek: jelszoval });
    return v.allapot !== 200 && !v.test.includes('EZ_A_SZEMELYAZONOSSAGOD');
  }));

proba('⛔⛔ …és az ŐR MAGA is fogja, elemző nélkül (a függvényt közvetlenül mérve)', () => {
  return biztonsagosUt('/alap/felulet', '/../kulcs.json') === null
      && biztonsagosUt('/alap/felulet', '/a/b/../../../kulcs.json') === null;
});

proba('⛔ Az útvonal-őr a NULLA BÁJTOT is elutasítja', () => {
  return biztonsagosUt('/alap/felulet', '/index.html\0.png') === null;
});

proba('⭐ Az útvonal-őr a RENDES utat átengedi', () => {
  const ut = biztonsagosUt('/alap/felulet', '/js/kod.js');
  return typeof ut === 'string' && ut.includes('kod.js');
});

proba('⛔ Az útvonal-őr a hibás kódolást is elutasítja (nem találgat)', () => {
  return biztonsagosUt('/alap/felulet', '/%zz') === null;
});

// ===================================
// 4. AZ ŐRÖK SORRENDJE ÉS A KÖTÉS
// ===================================

proba('⭐⭐ AZ ŐRÖK A KEZELŐ ELŐTT futnak — rossz jelszónál a kezelő meg sem hívódik',
  () => kapuval(async (kapu) => {
    const v = await keres(kapu.port, '/api/en', { fejlecek: { 'x-koino-kulcs': 'rossz-jelszo-ami-hosszu-eleg' } });
    return v.allapot === 401;   // ha a kezelő lefutott volna, 500-at kapnánk
  }, { kezelo: async () => { throw new Error('a kezelő meg sem hívódhat'); } }));

proba('⭐⭐ CSAK A HUROK-CÍMRE kötünk — a helyi hálóról nem érhető el',
  () => kapuval(async (kapu) => {
    // Megkeressük a gép saját LAN-címét. Ha nincs (elszigetelt gép), nincs mit mérni.
    const cimek = Object.values(networkInterfaces()).flat()
      .filter((c) => c && c.family === 'IPv4' && !c.internal);
    if (!cimek.length) return true;

    // ⚠️ A próba CSAK akkor bukik, ha a kapcsolat TÉNYLEG létrejön. Az elutasítás és az
    // időtúllépés egyaránt azt jelenti: nem érhető el — tehát ez sosem lehet szeszélyes.
    const elerheto = await new Promise((kesz) => {
      const f = connect({ host: cimek[0].address, port: kapu.port });
      const vege = (eredmeny) => { f.destroy(); kesz(eredmeny); };
      f.setTimeout(700, () => vege(false));
      f.once('connect', () => vege(true));
      f.once('error', () => vege(false));
    });
    return elerheto === false;
  }));

// ===================================
// 5. ⭐⭐ AZ ÍRÁS ŐREI (5.5) — itt már a KULCSOM a tét
// ===================================
//
// ⚠️ Az 5.5-ig minden kérés OLVASÁS volt. Innentől a lap **eseményt írat a kulcsommal**,
// vagyis a tét már nem az adat kiszivárgása, hanem hogy valaki a NEVEMBEN cselekedjen.

/** Egy kérés testtel — az íráshoz. */
function irKeres(port, utvonal, adat, { fejlecek = {}, modszer = 'POST', tipus = 'application/json' } = {}) {
  return new Promise((kesz, hiba) => {
    const test = JSON.stringify(adat ?? {});
    const k = request({
      host: '127.0.0.1', port, path: utvonal, method: modszer,
      headers: {
        ...(tipus ? { 'content-type': tipus } : {}),
        'content-length': Buffer.byteLength(test),
        ...fejlecek
      }
    }, (v) => {
      let valasz = '';
      v.on('data', (d) => { valasz += d; });
      v.on('end', () => kesz({ allapot: v.statusCode, test: valasz }));
    });
    k.on('error', hiba);
    k.end(test);
  });
}

proba('⭐ AZ ÍRÁS átmegy: a test eljut a kezelőhöz', () => kapuval(async (kapu) => {
  const v = await irKeres(kapu.port, '/api/ir', { pont: 42 }, { fejlecek: jelszoval });
  return v.allapot === 200 && JSON.parse(v.test).kapott === 42;
}, { kezelo: async ({ modszer, test }) =>
  modszer === 'POST' ? { adat: { kapott: test?.pont } } : null }));

proba('⛔⛔ IDEGEN LAP NEM ÍRHAT — jó jelszóval sem (Origin-őr)', () => kapuval(async (kapu) => {
  const v = await irKeres(kapu.port, '/api/ir', { pont: 42 },
    { fejlecek: { ...jelszoval, origin: 'https://tamado.example' } });
  return v.allapot === 403;
}, { kezelo: async () => { throw new Error('a kezelő meg sem hívódhat'); } }));

proba('⛔⛔ JELSZÓ NÉLKÜL sem írhat', () => kapuval(async (kapu) => {
  const v = await irKeres(kapu.port, '/api/ir', { pont: 42 });
  return v.allapot === 401;
}, { kezelo: async () => { throw new Error('a kezelő meg sem hívódhat'); } }));

// ⭐⭐ EZ A PRÓBA A LEGKEVÉSBÉ NYILVÁNVALÓ, ÉS A LEGFONTOSABB.
//
// Egy idegen lap `<form>`-mal vagy egyszerű `fetch`-csel küldhetne POST-ot ELŐELLENŐRZÉS
// (preflight) NÉLKÜL — olyankor a böngésző nem kérdez rá előre, csak elküldi. A JSON
// tartalomtípus viszont KÖTELEZŐVÉ teszi az előellenőrzést, amit a kapunk (CORS-fejlécek
// híján) nem enged át. Ezért fogadunk el CSAK `application/json` testet: így a böngésző
// maga állítja meg az idegen írást, még mielőtt ideérne.
proba('⛔⛔ ŰRLAP-SZERŰ ÍRÁS (nem JSON) elutasítva — ez zárja ki az előellenőrzés kerülését',
  () => kapuval(async (kapu) => {
    const v = await irKeres(kapu.port, '/api/ir', { pont: 42 },
      { fejlecek: jelszoval, tipus: 'application/x-www-form-urlencoded' });
    return v.allapot === 415;
  }, { kezelo: async () => { throw new Error('a kezelő meg sem hívódhat'); } }));

proba('⛔ TARTALOMTÍPUS NÉLKÜL sem', () => kapuval(async (kapu) => {
  const v = await irKeres(kapu.port, '/api/ir', { pont: 42 },
    { fejlecek: jelszoval, tipus: null });
  return v.allapot === 415;
}, { kezelo: async () => { throw new Error('a kezelő meg sem hívódhat'); } }));

proba('⛔ ÉRTELMEZHETETLEN TEST: hiba, nem néma elfogadás', () => kapuval(async (kapu) => {
  // Nyers, nem-JSON szöveg JSON tartalomtípussal.
  const v = await new Promise((kesz, hiba) => {
    const k = request({
      host: '127.0.0.1', port: kapu.port, path: '/api/ir', method: 'POST',
      headers: { 'content-type': 'application/json', ...jelszoval }
    }, (r) => {
      let t = ''; r.on('data', (d) => { t += d; }); r.on('end', () => kesz({ allapot: r.statusCode }));
    });
    k.on('error', hiba);
    k.end('{ ez nem json');
  });
  return v.allapot === 413;
}, { kezelo: async () => { throw new Error('a kezelő meg sem hívódhat'); } }));

proba('⛔⛔ A TÚL NAGY TEST elakad — a memória nem tölthető meg', () => kapuval(async (kapu) => {
  const nagy = { szemet: 'x'.repeat(300 * 1024) };     // a korlát 256 KB
  try {
    const v = await irKeres(kapu.port, '/api/ir', nagy, { fejlecek: jelszoval });
    return v.allapot === 413;
  } catch {
    // A kapcsolat megszakítása is helyes viselkedés: nem olvassuk tovább.
    return true;
  }
}, { kezelo: async () => { throw new Error('a kezelő meg sem hívódhat'); } }));

// ===================================
// 6. ⭐ A RÉTEGZÉS — forrás-próba, nem kérés-próba
// ===================================

proba('⭐⭐⭐ A PROGRAM SEHOL NEM IMPORTÁLJA A FELÜLETET (felulet_terv 3. pont, 1. szabály)',
  async () => {
    const jsGyoker = join(dirname(fileURLToPath(import.meta.url)), '..', 'js');

    /** Minden .js fájl a `js/` alatt, a `js/felulet/` KIVÉTELÉVEL. */
    async function fajlok(mappa) {
      const talalt = [];
      for (const bejegyzes of await readdir(mappa, { withFileTypes: true })) {
        const ut = join(mappa, bejegyzes.name);
        if (bejegyzes.isDirectory()) {
          if (bejegyzes.name === 'felulet') continue;      // ő maga a felület
          talalt.push(...await fajlok(ut));
        } else if (bejegyzes.name.endsWith('.js')) {
          talalt.push(ut);
        }
      }
      return talalt;
    }

    for (const ut of await fajlok(jsGyoker)) {
      const forras = await readFile(ut, 'utf8');
      // Csak a VALÓDI import-sorokat nézzük, nem a kommentekben említett neveket.
      for (const sor of forras.split('\n')) {
        const tiszta = sor.trim();
        if (!tiszta.startsWith('import ')) continue;
        if (tiszta.includes('felulet/')) return false;
      }
    }
    return true;
  });

// ===================================
// 7. ⭐⭐ AZ ÖRÖKÖLT KÓD BÁJTRA UGYANAZ (5.3, 5.7) — forrás-próba
// ===================================
//
// ⭐ A koino felülete a prototípusból öröklődik (D22), és ennek az az ÉRTÉKE, hogy a
// fájlok **bájtra ugyanazok**: amit a prototípuson évekig csiszoltak, azt nem írjuk újra,
// és nem csúszik szét a kettő. Az 5.3-ban a kártyák jöttek így, az 5.7-ben a
// szövegszerkesztő.
//
// ⛔ EZT KÖNNYŰ ELVESZÍTENI. Egy „gyors javítás" az örökölt fájlban észrevétlenül
// elszakítja a kettőt, és onnantól a prototípus már nem a forrás, csak egy hasonló kód.
// Ezért méri próba, ami MEGNEVEZI az eltérő fájlt.
//
// ⚠️ AMI SZÁNDÉKOSAN ELTÉR, azt itt soroljuk fel — a lista maga a dokumentáció arról, hogy
// mit kellett a P2P miatt átírni. ⭐ **NÉGY fájl, több ezer sor örökölt kód mellett.**
const SZANDEKOSAN_MAS = [
  'utils/apiHelper.js',        // JWT → a helyi kapu jelszava (D15)
  'utils/authHelper.js',       // a koinóban nincs bejelentkezés (D15)
  'components/kartya/kartyaGyar.js',                 // 5.3: nincs Kategória/GondolatTípus… (majd lett)
  'components/szovegSzerkeszto/FeltoltesKezelo.js'   // 5.7: a képek helye eldöntetlen (D3)
];

// ⭐⭐ A HELYŐRZŐKET NEM LISTÁZZUK, HANEM FELISMERJÜK. Az 5.3 tizenhárom helyőrzőt tett a
// még át nem emelt modálok helyére, és ezek természetesen eltérnek a prototípustól.
//
// ⛔ Ha kézzel sorolnánk fel őket, a lista **elavulna** — és ami rosszabb: amikor egy
// helyőrzőt valódira cserélünk, a fájl némán kimaradna az ellenőrzésből. Így viszont
// **magától** bekerül. *(Épp ez történt az 5.7-ben a `GondolatModal`-lal.)*
const HELYORZO_JELE = "from './helyorzoModal.js'";

proba('⭐⭐ Az ÖRÖKÖLT felület-fájlok BÁJTRA ugyanazok, mint a prototípusban', async () => {
  const gyoker = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const proto = join(gyoker, 'frontend', 'js');
  const mienk = join(gyoker, 'koino', 'felulet', 'js');

  // ⚠️ A `frontend/` NINCS MEG, ha valaki csak a `koino/` mappát másolta át (telefonra —
  // és ez támogatott működés). Olyankor a próba nem bukik, hanem kimarad: *nem tudunk
  // összehasonlítani, de ez nem a felület hibája.*
  try {
    await readdir(proto);
  } catch {
    console.log('kapuProba - a frontend/ nincs meg, az összevetés kimarad');
    return true;
  }

  async function fajlok(hely, eddig = '') {
    const talalt = [];
    for (const b of await readdir(hely, { withFileTypes: true })) {
      const relativ = eddig ? eddig + '/' + b.name : b.name;
      if (b.isDirectory()) talalt.push(...await fajlok(join(hely, b.name), relativ));
      else if (b.name.endsWith('.js')) talalt.push(relativ);
    }
    return talalt;
  }

  for (const relativ of await fajlok(mienk)) {
    if (SZANDEKOSAN_MAS.includes(relativ)) continue;

    let protoForras;
    try {
      protoForras = await readFile(join(proto, relativ), 'utf8');
    } catch {
      continue;    // nincs párja a prototípusban (pl. `terNezet.js`, `helyorzoModal.js`)
    }

    const mienkForras = await readFile(join(mienk, relativ), 'utf8');

    // ⏸️ Még helyőrző — az eltérés itt nem hiba, hanem a hiány jele (D19).
    if (mienkForras.includes(HELYORZO_JELE)) continue;

    if (protoForras !== mienkForras) {
      console.log('kapuProba - ELTÉR a prototípustól: ' + relativ);
      return false;
    }
  }
  return true;
});

proba('⭐ …és a próba NEM VAK: egy örökölt fájl megváltoztatását észreveszi', async () => {
  // ⛔ A fenti próba önmagában akkor is „zöld", ha MINDEN fájlt kihagy (nincs `frontend/`,
  // csupa helyőrző, elgépelt útvonal). Ezért mérjük meg, hogy tényleg **összevet**: egy
  // ismert örökölt fájlt elrontunk a memóriában, és ugyanazzal a szabállyal nézzük.
  const gyoker = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const relativ = 'components/kartya/Kartya.js';

  let proto;
  try {
    proto = await readFile(join(gyoker, 'frontend', 'js', relativ), 'utf8');
  } catch {
    return true;      // nincs `frontend/` — ugyanaz a kimaradás, mint fent
  }

  const mienk = await readFile(join(gyoker, 'koino', 'felulet', 'js', relativ), 'utf8');
  // Ma egyeznek — és egy egyetlen karakternyi eltérésnek látszania kell.
  return proto === mienk
    && proto !== (mienk + '\n// elrontva')
    && !mienk.includes(HELYORZO_JELE)
    && !SZANDEKOSAN_MAS.includes(relativ);
});

export default futtatas;
