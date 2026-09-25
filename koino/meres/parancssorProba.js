// koino/meres/parancssorProba.js

// Felelősség: bizonyítani, hogy A KÉZI ÚT TÉNYLEG MEGVAN — a parancssorból, végig.
//
// ===== ⛔⛔ MIÉRT SZÜLETETT EZ A FÁJL (2026-09-10) =====
//
// Egy kód-átnézés talált egy 4. szabály-hiányt: megépült az **általános egyezmény** élő
// hatálya és az `allast` parancs, de **nem volt mivel létrehozni azt az egyezményt**,
// amiről állást lehetett volna foglalni — a `koino.js` mindkét javaslat-útja beégetve
// `fajta: 'szerkesztesi'`-t küldött. A könyvtár-réteg tudta; a kéz nem érte el.
//
// ⚠️ ÉS EZT EGYETLEN MEGLÉVŐ PRÓBA SEM VETTE ÉSZRE, mert mind a **modulokat** hívja
// közvetlenül. *Amit csak a modul-próba mér, arról nem tudjuk, hogy elérhető-e kézzel.*
// A 4. szabály viszont épp az elérhetőségről szól: *„Legyen mindig kézi út."*
//
// ⭐ Ezért ez a lap MÁSHOGY mér: **külön folyamatban indítja a `koino.js`-t**, egy
// eldobható adat-mappával (`KOINO_ADAT`), és a **kimenetét** olvassa — pontosan úgy, ahogy
// egy ember ülne le elé. Lassabb, mint a többi próba (folyamat-indítás), ezért kevés van
// belőle: csak a **teljes körök**, amiknek kézzel végigjárhatónak kell lenniük.

import { probaGyujtemeny } from './probaFuttato.js';
import { execFile, spawn } from 'node:child_process';
// ⭐ A `cp` a TÖBB FORRÁS próbájához kell: ugyanaz a fájl két készüléken (D68 / 6.).
import { mkdtemp, rm, readFile, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// ⭐ A néma DHT-gép és a néma tükör próbájához (40. mérés): egy foglalat, ami hall, de nem felel.
import { createSocket } from 'node:dgram';

const { proba, futtatas } = probaGyujtemeny('A KÉZI ÚT — a parancssor végigjárása (4. szabály)');

// A `koino.js` a `meres/` mappához képest egy szinttel feljebb van.
const KOINO_JS = new URL('../koino.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/**
 * Egy `koino.js` parancs lefuttatása külön folyamatban.
 *
 * ⚠️ A KIMENETET adja vissza, nem az állapotot — ez a lényeg: azt mérjük, amit egy ember
 * LÁT, nem azt, amit a modul tud.
 */
function fut(hely, ...ervek) {
  // ⭐ AZ UTOLSÓ ÉRV LEHET KÖRNYEZET is (2026-09-20): a tábla-próbának meg kell mondani,
  // melyik (hamis) DHT-belépőt használja. *Nem új gépezet: egy objektum a lista végén.*
  const kornyezet = (ervek.length && typeof ervek[ervek.length - 1] === 'object')
    ? ervek.pop() : {};
  return new Promise((teljesul, elakad) => {
    execFile(
      process.execPath, [KOINO_JS, ...ervek],
      { env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', ...kornyezet },
        timeout: 30000 },
      (hiba, kimenet, hibaKimenet) => {
        if (hiba && !kimenet) return elakad(new Error(hiba.message + ' | ' + hibaKimenet));
        teljesul(kimenet + hibaKimenet);
      }
    );
  });
}

/** Egy eldobható „készülék": saját kulcs, saját adat-mappa. */
async function ujKeszulek() {
  return mkdtemp(join(tmpdir(), 'koino-parancssor-'));
}

/** A kiírt 8 karakteres azonosító kiszedése egy sorból. */
function azonosito(kimenet, elozmeny) {
  const sor = kimenet.split('\n').find((s) => s.includes(elozmeny));
  const talalat = sor && sor.match(/([A-Za-z0-9_-]{8})/g);
  return talalat ? talalat[talalat.length - 1] : null;
}

const varj = (mp) => new Promise((t) => setTimeout(t, mp));

/** A kiírt TELJES (43 karakteres) azonosító — a horgonyokhoz. */
function teljesAzonosito(kimenet) {
  const talalat = kimenet.match(/[A-Za-z0-9_-]{43}/g);
  return talalat ? talalat[talalat.length - 1] : null;
}

/**
 * EGY CSERE-KÖR két készülék között: `figyel` az egyik oldalon, `csere` a másikon.
 *
 * ⚠️ A figyelőt a kör végén LEÁLLÍTJUK, és várunk is utána — mérve derült ki, hogy amíg a
 * figyelő fut, ugyanarra az adat-mappára indított másik parancs nem feltétlenül látja a
 * frissen érkezett eseményeket. *(Ugyanaz a fajta ütközés, mint két párhuzamos `mind.js`.)*
 */
async function csereKor(gazda, vendeg, port) {
  const figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
    env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' },
    stdio: 'ignore'
  });
  try {
    await varj(2000);
    await fut(vendeg, 'csere', '127.0.0.1', String(port));
    await varj(1000);
  } finally {
    figyelo.kill();
    await varj(1000);
  }
}

// ===================================
// ⭐⭐⭐ AZ ÁLTALÁNOS KÖR: javaslat → egyezmény → állásfoglalás
// ===================================

proba('⭐⭐⭐ AZ ÁLTALÁNOS JAVASLAT KÉZI ÚTJA: altalanos → szavaz → allast', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');

    const g = await fut(hely, 'gondolat', 'A TÉMA');
    const gondolat = azonosito(g, 'Létrejött:');
    if (!gondolat) return false;

    // ⭐ RÖGZÍTETT DÖNTÉSI IDŐ: a min és a max ugyanaz, tehát a lezárás pillanata nem függ
    // a bizonyossági mutatótól. *A próba ne a véletlenen múljon.*
    await fut(hely, 'ertek', gondolat, '51', '0', '3', '3');

    const a = await fut(hely, 'altalanos', 'FOGADJUK EL EZT AZ ELVET', gondolat, 'mert így jó');
    const javaslat = azonosito(a, 'Általános javaslat beadva:');
    if (!javaslat) return false;

    await fut(hely, 'szavaz', javaslat, 'tamogat');

    // Megvárjuk a lezárást (döntési idő 3 mp), hogy megszülethessen az egyezmény.
    await varj(3500);

    await fut(hely, 'allast', javaslat, 'csatlakozik');
    const kep = await fut(hely, 'allapot');

    return kep.includes('ÁLTALÁNOS JAVASLATOK')
      && kep.includes('ÁLTALÁNOS EGYEZMÉNYEK')
      && kep.includes('FOGADJUK EL EZT AZ ELVET')
      && /hatály MOST/.test(kep)
      && /🤝 1/.test(kep);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔ Az ÁLTALÁNOS javaslat nem kerül a SZERKESZTÉSI fejléc alá (D27 névszabály)', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');
    const gondolat = azonosito(await fut(hely, 'gondolat', 'A TÉMA'), 'Létrejött:');
    await fut(hely, 'altalanos', 'AZ ÁLLÁSPONT', gondolat);
    const kep = await fut(hely, 'allapot');

    // ⚠️ AZ ÁLLÁSPONT CÍME HÁROMSZOR IS ELŐFORDUL a képen: a GONDOLATOK szakaszban is
    // (a javaslat entitás, D27/5), és a saját fejléce alatt. Ezért nem az ELSŐ
    // előfordulást nézzük, hanem azt, hogy a **két fejléc közé** ne essen egy sem.
    const sorok = kep.split('\n');
    const szerkesztesi = sorok.findIndex((s) => s.includes('SZERKESZTÉSI JAVASLATOK'));
    const altalanos = sorok.findIndex((s) => s.includes('ÁLTALÁNOS JAVASLATOK'));
    if (szerkesztesi < 0 || altalanos <= szerkesztesi) return false;

    const szerkesztesiSzakasz = sorok.slice(szerkesztesi, altalanos);
    const altalanosSzakasz = sorok.slice(altalanos);
    return !szerkesztesiSzakasz.some((s) => s.includes('AZ ÁLLÁSPONT'))
      && altalanosSzakasz.some((s) => s.includes('AZ ÁLLÁSPONT'));
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔ A hely KÖTELEZŐ — nélküle nincs kör, aki dönt róla (D27/4)', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');
    const kimenet = await fut(hely, 'altalanos', 'AZ ÁLLÁSPONT');
    return /Hol álljon/.test(kimenet);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐ ÉS A SZERKESZTÉSI KÖR IS — hogy a fenti ne legyen egyedi
// ===================================

proba('⭐ A SZERKESZTÉSI kör kézi útja: javaslat → szavaz → az új cím látszik', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');
    const gondolat = azonosito(await fut(hely, 'gondolat', 'EREDETI CÍM'), 'Létrejött:');
    await fut(hely, 'ertek', gondolat, '51', '0', '3', '3');

    const javaslat = azonosito(
      await fut(hely, 'javaslat', gondolat, 'ÚJ CÍM'),
      'Szerkesztési javaslat beadva'
    );
    if (!javaslat) return false;

    await fut(hely, 'szavaz', javaslat, 'tamogat');
    await varj(3500);

    const kep = await fut(hely, 'allapot');
    // ⭐ A HARMADIK FÁZIS bizonyítéka a parancssorból: az entitás címe tényleg átíródott.
    return kep.includes('ÚJ CÍM') && kep.includes('SZERKESZTÉSI EGYEZMÉNYEK');
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ A SZAKASZ 4 KÉZI ÚTJA — az identitás (2026-09-12)
// ===================================
//
// ⛔⛔ MIÉRT SZÜLETETT: a két lépcsős beléptető (D54–D63) **52 önpróbával** megépült, zöld
// volt — és **senki nem érte el**. A `koino.js` a `muveletek.js` tizenhat műveletéből
// kilencet importált; az `identitas.js` és a `jelzesek.js` egyetlen importálója a **saját
// próbája** volt. *Modul-próbával ezt nem lehet elkapni: azok épp a modult hívják.*

proba('⭐⭐⭐ A TELJES IDENTITÁS-KÖR KÉZZEL: belep → csere → meghiv → csere → TAG', async () => {
  const alapito = await ujKeszulek();
  const ujonc = await ujKeszulek();
  try {
    await fut(alapito, 'koino', 'Próba koinó');

    // ⭐ Az újonc MEGNYITJA a saját azonosság-szeletét. Ez még NEM tagság.
    const horgony = teljesAzonosito(await fut(ujonc, 'belep'));
    if (!horgony) return false;

    // Az alapítónak meg kell ismernie az újonc horgonyát — ez a csere dolga.
    // ⚠️ És az újonc is csak ezután ismeri a koinót: addig az állapot a fejlécnél
    // visszafordul, tehát a „még nem tag" képet CSAK a csere után lehet felvenni.
    await csereKor(alapito, ujonc, 7931);

    const elotte = await fut(ujonc, 'allapot');
    if (!/✘ tag/.test(elotte)) return false;      // a kiindulás: ismeri a koinót, de nem tag

    await fut(alapito, 'meghiv', horgony);
    await csereKor(alapito, ujonc, 7932);

    const utana = await fut(ujonc, 'allapot');
    // ⭐ A BIZONYÍTÉK: ugyanaz a készülék, ugyanaz a parancs — más válasz.
    return /✔ tag/.test(utana) && /tag hívta be/.test(utana);
  } finally {
    await rm(alapito, { recursive: true, force: true });
    await rm(ujonc, { recursive: true, force: true });
  }
});

proba('⭐ AZ AZONOSSÁG LÁTSZIK az állapotban — és a „nem" INDOKOLT (D19)', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');
    const kep = await fut(hely, 'allapot');
    // ⭐ Az alapító mindhárom kérdésre igen — ő a rekurzió alapesete (D56).
    return kep.includes('AZONOSSÁG')
      && /✔ tag/.test(kep) && /✔ tanúsíthat/.test(kep) && /✔ 2\. lépcsős/.test(kep)
      && /bízták rád a tanúsítást/.test(kep);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔ HORGONY NÉLKÜL nem lehet állítani másról — a művelet megnevezi, mi hiányzik', async () => {
  const hely = await ujKeszulek();
  try {
    // ⚠️ Szándékosan NINCS `koino` és NINCS `belep`: nincs saját horgony.
    const kimenet = await fut(hely, 'meghiv', 'akarmi');
    return /Nincs ilyen azonosító|horgony/i.test(kimenet);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ A „MEGBÍZÁS, NEM PONTSZÁM" (D60) a kiírásban is így jelenik meg', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');
    const kep = await fut(hely, 'allapot');
    // ⛔ Soha nem „becsületesség: N" — a jellem-szám hírnév-rendszerré romlana (D18/1, D49/b).
    return /bízták rád a tanúsítást/.test(kep) && !/becsületesség/i.test(kep);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⛔⛔ A KÉZI ÚT HÁLÓZAT NÉLKÜL: kivisz → behoz (4. szabály)
// ===================================
//
// ⭐ EZ A PRÓBA A SZABÁLY MAGA. A 4. szabály azt mondja, minden automatikus cseréhez
// tartozzon fájlba mentés / fájlból olvasás — *„ha egy funkció csak online tud működni,
// az fojtópont"*. A modul-próba (`fajlCsereProba.js`) azt méri, hogy a **könyvtár** tudja;
// ez azt, hogy a **kéz is eléri**. A kettő nem ugyanaz: 2026-09-10-én és 09-12-én is
// pontosan ez a különbség rejtett el egy egész megépült réteget.
//
// ⚠️ Itt SEMMILYEN hálózat nincs: nincs `figyel`, nincs `csere`, nincs port. Két külön
// adat-mappa, és egy fájl közöttük — ennyi.

proba('⭐⭐⭐ A KÉZI ÚT HÁLÓZAT NÉLKÜL: kivisz → behoz, és a másik gép LÁTJA a gondolatot', async () => {
  const egyik = await ujKeszulek();
  const masik = await ujKeszulek();
  const fajl = join(egyik, 'atvitel.jsonl');
  try {
    await fut(egyik, 'koino', 'Próba koinó');
    await fut(egyik, 'gondolat', 'KÖZÖS KÚT');

    const ki = await fut(egyik, 'kivisz', fajl);
    if (!/Kivíve/.test(ki)) return false;

    // ⛔ A MÁSIK KÉSZÜLÉK SOHA NEM BESZÉLT AZ ELSŐVEL. Csak ezt az egy fájlt kapta meg.
    const be = await fut(masik, 'behoz', fajl);
    if (!/új esemény/.test(be)) return false;

    // ⭐ És a bizonyíték nem a „behozva" szó, hanem hogy az ÁLLAPOTÁBAN ott a gondolat.
    const kep = await fut(masik, 'allapot');
    return /KÖZÖS KÚT/.test(kep);
  } finally {
    await rm(egyik, { recursive: true, force: true });
    await rm(masik, { recursive: true, force: true });
  }
});

proba('⛔⛔ A FÁJLBAN ÁTÍRT gondolat nem jut be — a parancs KIMONDJA, hogy elutasította', async () => {
  const egyik = await ujKeszulek();
  const masik = await ujKeszulek();
  const fajl = join(egyik, 'atvitel.jsonl');
  const hamis = join(egyik, 'hamis.jsonl');
  try {
    await fut(egyik, 'koino', 'Próba koinó');
    await fut(egyik, 'gondolat', 'KÖZÖS KÚT');
    await fut(egyik, 'kivisz', fajl);

    // ⚠️ Amit egy szövegszerkesztővel bárki megtehet, mielőtt továbbadja a pendrive-ot.
    const szoveg = await readFile(fajl, 'utf8');
    await writeFile(hamis, szoveg.replace('KÖZÖS KÚT', 'AZ ÉN KUTAM'), 'utf8');

    const be = await fut(masik, 'behoz', hamis);
    const kep = await fut(masik, 'allapot');

    // A kimenet megnevezi az elutasítást (D19), és a hamis cím sehol nem jelenik meg.
    return /ELUTASÍTVA/.test(be) && !/AZ ÉN KUTAM/.test(kep);
  } finally {
    await rm(egyik, { recursive: true, force: true });
    await rm(masik, { recursive: true, force: true });
  }
});

// ===================================
// ⭐ A BELÉPŐ TÉR KÉZI ÚTJA (5.6)
// ===================================

proba('⭐⭐ A BELÉPŐ TÉR KÉZZEL: két koino egy készüléken, mindkettő megjelenik', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Falukozosseg');
    // ⚠️ A második koino MÁS azonosítóval — ettől lesz két mappa egy készüléken.
    await new Promise((teljesul, elakad) => {
      execFile(process.execPath, [KOINO_JS, 'koino', 'Kozossegi kert'],
        { env: { ...process.env, KOINO_ADAT: hely, KOINO_AZONOSITO: 'kert', KOINO_NAPLO: '' },
          timeout: 30000 },
        (hiba, ki, hibaKi) => (hiba && !ki) ? elakad(new Error(hiba.message)) : teljesul(ki + hibaKi));
    });

    const ter = await fut(hely, 'ter');

    // ⛔ A HATÁR KIMONDVA (D19) — enélkül a lap némán teljességet ígérne.
    return /Falukozosseg/.test(ter) && /Kozossegi kert/.test(ter)
      && /2 koino/.test(ter) && /EZ A KÉSZÜLÉK ismer/.test(ter);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ A tér HÁROM SZÁMOT mutat, nem egyet — a létszám súlya látszik', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Falukozosseg');
    const ter = await fut(hely, 'ter');
    // ⛔ Sosem puszta „létszám: N" — a tag/belépő kettőse az, amitől a szám ér valamit.
    return /tag/.test(ter) && /belépő/.test(ter);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ A TÉR A FELÜLETEN (5.6) — és a KOINO-VÁLTÁS
// ===================================
//
// ⛔⛔ EZ A SZAKASZ 5.6 SZERKEZETI ÁLLÍTÁSA, ezért méri próba. A parancssor egy koinóra
// szól (a `KOINO_AZONOSITO` indításkor eldől), a felület viszont a koinók FÖLÖTT áll: a
// lap belép az egyikbe, majd egy másikba, **újraindítás nélkül**.
//
// ⚠️ Modul-próba ezt nem tudja megfogni: a végpontok a `koino.js` egy záródásában élnek,
// nem exportált függvényben. Ezért indul itt valódi kiszolgáló, és megy rá valódi kérés.

/** Elindít egy `felulet` kiszolgálót, és visszaadja a címét + a jelszavát. */
async function feluletet(hely, port) {
  const folyamat = spawn(process.execPath, [KOINO_JS, 'felulet', String(port)], {
    env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // A jelszót a kiírt címből olvassuk ki — ugyanúgy, ahogy egy ember tenné.
  let kimenet = '';
  const kulcs = await new Promise((teljesul, elakad) => {
    const ido = setTimeout(() => elakad(new Error('a felület nem indult el: ' + kimenet)), 15000);
    folyamat.stdout.on('data', (d) => {
      kimenet += d;
      const talalat = kimenet.match(/kulcs=([A-Za-z0-9_-]+)/);
      if (talalat) { clearTimeout(ido); teljesul(talalat[1]); }
    });
  });

  const hiv = async (utvonal, beallitas = {}) => {
    const valasz = await fetch('http://127.0.0.1:' + port + utvonal, {
      ...beallitas,
      headers: { 'Content-Type': 'application/json', 'X-Koino-Kulcs': kulcs, ...beallitas.headers }
    });
    return { allapot: valasz.status, adat: await valasz.json() };
  };

  return { folyamat, hiv };
}

proba('⭐⭐⭐ A FELÜLET KOINÓT VÁLT: a tér egy MÁSIK koino pakliját hozza', async () => {
  const hely = await ujKeszulek();
  let kiszolgalo = null;
  try {
    // Két koino egy készüléken, mindkettőben egy-egy gondolattal.
    await fut(hely, 'koino', 'Falukozosseg');
    await fut(hely, 'gondolat', 'KOZOS KUT');
    const masik = { ...process.env, KOINO_ADAT: hely, KOINO_AZONOSITO: 'kert', KOINO_NAPLO: '' };
    for (const ervek of [['koino', 'Kozossegi kert'], ['gondolat', 'PALANTA TERV']]) {
      await new Promise((teljesul, elakad) => {
        execFile(process.execPath, [KOINO_JS, ...ervek], { env: masik, timeout: 30000 },
          (hiba, ki, hibaKi) => (hiba && !ki) ? elakad(new Error(hiba.message)) : teljesul(ki + hibaKi));
      });
    }

    kiszolgalo = await feluletet(hely, 7481);
    const { hiv } = kiszolgalo;

    // ----- A TÉR LÁTJA MINDKETTŐT, és KIMONDJA a határát -----
    const ter = await hiv('/api/ter');
    if (ter.adat.koinok !== 2 || ter.adat.csakAmitIsmerunk !== true) return false;
    if (ter.adat.aktiv !== 'sajat') return false;

    // ----- AZ INDULÓ KOINO PAKLIJA -----
    const elso = await hiv('/api/pakli?darab=5');
    if (!elso.adat.kartyak.some((k) => k.cim === 'KOZOS KUT')) return false;

    // ----- ⭐ VÁLTÁS — és a pakli MÁSIK koinóé lesz -----
    const valt = await hiv('/api/ter/valt',
      { method: 'POST', body: JSON.stringify({ koino: 'kert' }) });
    if (valt.adat?.data?.aktiv !== 'kert') return false;

    const masodik = await hiv('/api/pakli?darab=5');
    // ⛔ EZ A LÉNYEG: más koino, más pakli — ugyanabban a folyamatban.
    return masodik.adat.kartyak.some((k) => k.cim === 'PALANTA TERV')
      && !masodik.adat.kartyak.some((k) => k.cim === 'KOZOS KUT');
  } finally {
    if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔ NEM LÉTEZŐ koinóra nem lehet váltani — és az állapot nem mozdul', async () => {
  const hely = await ujKeszulek();
  let kiszolgalo = null;
  try {
    await fut(hely, 'koino', 'Falukozosseg');
    await fut(hely, 'gondolat', 'KOZOS KUT');

    kiszolgalo = await feluletet(hely, 7482);
    const { hiv } = kiszolgalo;

    // ⛔ Az `esemenyTarNyitasa` LÉTREHOZNÁ a mappát — egy elgépelt név némán új, üres
    // koinót csinálna a téren. Ezért őr van előtte.
    const rossz = await hiv('/api/ter/valt',
      { method: 'POST', body: JSON.stringify({ koino: 'nincs-ilyen' }) });
    if (rossz.allapot !== 404) return false;

    // A tér továbbra is EGY koinót ismer, és a pakli a régi.
    const ter = await hiv('/api/ter');
    const pakli = await hiv('/api/pakli?darab=5');
    return ter.adat.koinok === 1 && ter.adat.aktiv === 'sajat'
      && pakli.adat.kartyak.some((k) => k.cim === 'KOZOS KUT');
  } finally {
    if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ GONDOLAT LÉTREHOZÁSA A LAPRÓL (5.7)
// ===================================
//
// ⛔ EDDIG EZ A LAPRÓL NEM MENT: a `GondolatModal` a szövegszerkesztőre várt, az pedig az
// 5.7-re. A parancssor tudta, a lap nem — *a 4. szabály fordítottja.*
//
// ⚠️ A szerkesztő BLOKKOK tömbjét adja, nem szöveget. Ez ugyanaz a mező, két alakban
// (a prototípusban is: `szoveg[].tartalom`), és a próba MINDKETTŐT méri — mert az első
// körben pont ez bukott meg: a parancssor `[object Object]`-et írt ki a lapról jött
// gondolatra.

proba('⭐⭐⭐ A LAP LÉTREHOZ EGY GONDOLATOT — BLOKKOS szöveggel, és a kéz is OLVASSA', async () => {
  const hely = await ujKeszulek();
  let kiszolgalo = null;
  try {
    await fut(hely, 'koino', 'Próba koinó');
    kiszolgalo = await feluletet(hely, 7483);
    const { hiv } = kiszolgalo;

    const valasz = await hiv('/api/gondolat', {
      method: 'POST',
      body: JSON.stringify({
        cim: 'A FALU KUTJA',
        // Pontosan az az alak, amit a `SzovegSzerkeszto.getTartalom()` ad.
        szoveg: [{ id: 'blokk-1', tipus: 'szoveg', tartalom: 'Közös ügy.' }],
        kezdoTudatpont: 40
      })
    });
    if (valasz.allapot !== 200 || !valasz.adat?.data?._id) return false;

    // ----- A LAPON LÁTSZIK -----
    const pakli = await hiv('/api/pakli?darab=5');
    const kartya = pakli.adat.kartyak.find((k) => k.cim === 'A FALU KUTJA');
    if (!kartya || kartya.osszesPont !== 40) return false;

    // ----- ⭐ ÉS A KÉZ IS OLVASSA (nem `[object Object]`) -----
    const kep = await fut(hely, 'allapot');
    return /A FALU KUTJA/.test(kep) && /Közös ügy\./.test(kep) && !/object Object/.test(kep);
  } finally {
    if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

// ⭐⭐⭐ CSABA HELYREIGAZÍTÁSA (2026-09-12) — és ez a próba őrzi.
//
// ⚠️ Elsőre azt hittem, a prototípusban a szerző KÖZVETLENÜL átírhatta a gondolatát, és
// ezért a `PATCH`-et őszinte 400-zal zártam le. ⛔ **Tévedés:** a prototípusban is
// javaslat → egyezmény mentén megy a szerkesztés — csak ha a szerző az EGYETLEN
// tudatpont-tulajdonos, akkor **100% támogatottság mellett azonnal megtörténik**.
//
// ⭐ A 100% viszont NEM jön magától: a prototípus a javaslat létrehozásakor
// **automatikusan lead egy támogató szavazatot** (`javaslatService.js:635`). A koino ezt
// nem tette — és emiatt a saját szerkesztésem **0 szavazattal, ELVETVE** zárult. *Ez a
// próba pontosan azt a kört méri, ami eddig az ellenkezőjét adta.*

proba('⭐⭐⭐ A SAJÁT SZERKESZTÉSEM AZONNAL HATÁLYBA LÉP — egyetlen tulajdonosként, 100%-kal',
  async () => {
    const hely = await ujKeszulek();
    let kiszolgalo = null;
    try {
      await fut(hely, 'koino', 'Próba koinó');
      kiszolgalo = await feluletet(hely, 7484);
      const { hiv } = kiszolgalo;

      // ⚠️ NULLA döntési idővel, hogy tényleg AZONNAL dőljön el — a koino alapértéke 1 nap.
      const uj = await hiv('/api/gondolat', {
        method: 'POST',
        body: JSON.stringify({
          cim: 'EREDETI CÍM',
          javaslatElfogadasiKuszob: 51, reszveteliAranyKuszob: 0,
          aktualMinimumDontesiIdo: 0, aktualMaximumDontesiIdo: 0
        })
      });
      const id = uj.adat.data._id;

      // ⭐ A szerkesztés JAVASLATOT ír — nem utasítjuk vissza, és nem is írjuk át közvetlenül.
      const patch = await hiv('/api/gondolat/' + id,
        { method: 'PATCH', body: JSON.stringify({ cim: 'ÁTÍRT CÍM' }) });
      if (patch.allapot !== 200 || patch.adat?.data?.javaslat !== true) return false;

      // ⛔⛔ ÉS A LÉNYEG: mivel egyedül vagyok tulajdonos, az egyezmény AZONNAL megszületik,
      // és a gondolat címe MÁR AZ ÚJ.
      const kep = await fut(hely, 'allapot');
      return /ÁTÍRT CÍM/.test(kep) && /ELFOGADVA/.test(kep);
    } finally {
      if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
      await rm(hely, { recursive: true, force: true });
    }
  });

proba('⭐ A besorolás-lenyílók a koino NEVEIT adják (a `cim` → `nev` fordítás egy helyen van)',
  async () => {
    const hely = await ujKeszulek();
    let kiszolgalo = null;
    try {
      await fut(hely, 'koino', 'Próba koinó');
      await fut(hely, 'gondolattipus', 'Kérdés', '❓');
      await fut(hely, 'kategoria', 'Környezet', '🌿');

      kiszolgalo = await feluletet(hely, 7485);
      const { hiv } = kiszolgalo;

      const tipusok = await hiv('/api/gondolatTipus');
      const kategoriak = await hiv('/api/kategoria');

      // ⚠️ A koinóban a név a `cim` mezőben van (5.4); az örökölt modal `nev`-et olvas.
      return tipusok.adat.gondolatTipusok.some((t) => t.nev === 'Kérdés' && t._id)
        && kategoriak.adat.kategoriak.some((k) => k.nev === 'Környezet' && k._id);
    } finally {
      if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
      await rm(hely, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐⭐ SZERKESZTÉSI JAVASLAT A LAPRÓL (5.8)
// ===================================
//
// ⛔ EDDIG A LAPRÓL CSAK SZAVAZNI LEHETETT, javasolni nem — a gépezet teljes volt, a
// felület hiányzott. *Ugyanaz a fajta rés, mint az „Új gondolat".*
//
// ⚠️ ÉS EGY VALÓDI HIBÁT IS TALÁLT EZ A MUNKA: a végrehajtás a `szoveg`-et **csak
// szövegként** fogadta el, a szerkesztő viszont **blokk-tömböt** ad — a módosítás lefutott,
// a cím átíródott, a szöveg pedig **némán a régi maradt**. Ez a próba mindkettőt méri.

proba('⭐⭐⭐ MÓDOSÍTÁSI JAVASLAT A LAPRÓL: a cím ÉS a blokkos szöveg is hatályba lép',
  async () => {
    const hely = await ujKeszulek();
    let kiszolgalo = null;
    try {
      await fut(hely, 'koino', 'Próba koinó');
      kiszolgalo = await feluletet(hely, 7486);
      const { hiv } = kiszolgalo;

      // Nulla döntési idővel, hogy egytulajdonosként azonnal eldőljön.
      const uj = await hiv('/api/gondolat', {
        method: 'POST',
        body: JSON.stringify({
          cim: 'EREDETI CÍM',
          javaslatElfogadasiKuszob: 51, reszveteliAranyKuszob: 0,
          aktualMinimumDontesiIdo: 0, aktualMaximumDontesiIdo: 0
        })
      });
      const id = uj.adat.data._id;

      const javaslat = await hiv('/api/javaslat', {
        method: 'POST',
        body: JSON.stringify({
          javaslatTipus: 'Modositas',
          erintettEntitasok: [{
            entitasId: id, entitasTipus: 'Gondolat', muvelet: 'Modositas',
            modositasAdatok: {
              cim: 'ÁTÍRT CÍM',
              // ⭐ Pontosan az az alak, amit a `SzovegSzerkeszto.getTartalom()` ad.
              szoveg: [{ id: 'b1', tipus: 'szoveg', tartalom: 'ÚJ BLOKKOS SZÖVEG' }]
            }
          }],
          indoklas: [{ id: 'i1', tipus: 'szoveg', tartalom: 'Pontosítás.' }],
          kezdoTudatpont: 30
        })
      });
      if (javaslat.allapot !== 200 || !javaslat.adat?.javaslat?._id) return false;

      const kep = await fut(hely, 'allapot');
      // ⛔ MINDKETTŐ kell: a cím ÉS a szöveg. A szöveg volt az, ami némán kiesett.
      return /ELFOGADVA/.test(kep) && /ÁTÍRT CÍM/.test(kep) && /ÚJ BLOKKOS SZÖVEG/.test(kep);
    } finally {
      if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
      await rm(hely, { recursive: true, force: true });
    }
  });

proba('⭐ ÁTHELYEZÉSI javaslat a lapról — és a gyökérre helyezés is (`null` szülő)', async () => {
  const hely = await ujKeszulek();
  let kiszolgalo = null;
  try {
    await fut(hely, 'koino', 'Próba koinó');
    kiszolgalo = await feluletet(hely, 7487);
    const { hiv } = kiszolgalo;

    const gyors = {
      javaslatElfogadasiKuszob: 51, reszveteliAranyKuszob: 0,
      aktualMinimumDontesiIdo: 0, aktualMaximumDontesiIdo: 0
    };
    const szulo = await hiv('/api/gondolat',
      { method: 'POST', body: JSON.stringify({ cim: 'A SZÜLŐ', ...gyors }) });
    const gyerek = await hiv('/api/gondolat',
      { method: 'POST', body: JSON.stringify({ cim: 'A GYEREK', ...gyors }) });

    const javaslat = await hiv('/api/javaslat', {
      method: 'POST',
      body: JSON.stringify({
        javaslatTipus: 'Athelyezes',
        erintettEntitasok: [{
          entitasId: gyerek.adat.data._id, entitasTipus: 'Gondolat', muvelet: 'Athelyezes',
          modositasAdatok: { ujSzuloId: szulo.adat.data._id }
        }],
        indoklas: [{ id: 'i1', tipus: 'szoveg', tartalom: 'Oda tartozik.' }]
      })
    });
    if (javaslat.allapot !== 200) return false;

    // ⭐ A hierarchikus rendezésben a gyerek a szülője alá kerül.
    const oldal = await hiv('/api/pakli?darab=10&rendezes=hierarchikus');
    const k = oldal.adat.kartyak.find((x) => x.cim === 'A GYEREK');
    return k?.szulo === szulo.adat.data._id;
  } finally {
    if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ A KERESÉS megtalálja az entitást — és a találat-szám FELÜLRŐL KORLÁTOS', async () => {
  const hely = await ujKeszulek();
  let kiszolgalo = null;
  try {
    await fut(hely, 'koino', 'Próba koinó');
    kiszolgalo = await feluletet(hely, 7488);
    const { hiv } = kiszolgalo;

    // ⚠️ Több entitás, mint a korlát — különben a próba VAK lenne (ugyanaz a tanulság,
    // mint a pakli `MAX_DARAB`-jánál: a korlátot csak fölötte lehet mérni).
    for (let i = 0; i < 25; i++) {
      await hiv('/api/gondolat',
        { method: 'POST', body: JSON.stringify({ cim: 'KERESHETŐ ' + i, kezdoTudatpont: 10 }) });
    }

    const talalt = await hiv('/api/kereses?q=' + encodeURIComponent('KERESHETŐ'));
    const semmi = await hiv('/api/kereses?q=' + encodeURIComponent('nincs-ilyen-sehol'));
    const ures = await hiv('/api/kereses?q=');

    return talalt.adat.talalatok.length === 20        // KERESES_KORLAT
      && talalt.adat.talalatok.every((t) => t.entitasId && t.entitasTipus && t.cim)
      && semmi.adat.talalatok.length === 0
      && ures.adat.talalatok.length === 0;
  } finally {
    if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐⭐ A FÁJL-KÉRELEM EGY VALÓDI BULIN (5.7 / a szállítás)
// ===================================
//
// ⛔⛔ EZ A PRÓBA EGY VALÓDI PROTOKOLL-HIBÁT FOGOTT MEG, amit modul-próba nem talált
// volna meg. Elsőre a fájl-kör feltétele a **saját** kérelem meglétéhez kötődött — a
// figyelő (akinek nincs kérelme) tehát **küldött, de nem olvasott**, és az üzenet bent
// maradt a sorban. ⚠️ A hiba NEM a fájl-rétegnél jelentkezett, hanem később:
// *„Várt üzenet: CIMEK, érkezett: FAJLOK"*.
//
// ⭐ **Egy protokoll-lépés feltétele csak olyan dolog lehet, amit MINDKÉT fél ugyanúgy
// lát** — itt a két képesség-jelzés együtt.
//
// ⚠️ ÉS EGY TULAJDONSÁG, AMI A MÉRÉSBŐL DERÜLT KI: a fájl-felderítés **egy bulival
// később** jár, mint az esemény-csere — hiszen nem lehet olyan fájlról kérdezni, amiről
// még nem tudom, hogy létezik. *Ez nem hiba, hanem a sorrend következménye.*

proba('⭐⭐⭐ A BULIN KIDERÜL, KINÉL VAN MEG a hiányzó fájl', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7521;
  let figyelo = null;
  let felulet = null;
  try {
    await fut(gazda, 'koino', 'Próba koinó');

    // ----- A gazda feltölt egy képet, és készít hozzá egy gondolatot -----
    felulet = await feluletet(gazda, 7522);
    const png = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
      + '0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
    const fel = await felulet.hiv('/api/feltoltes/kep',
      { method: 'POST', body: JSON.stringify({ adat: png.toString('base64') }) });
    await felulet.hiv('/api/gondolat', {
      method: 'POST',
      body: JSON.stringify({
        cim: 'KÉPES GONDOLAT', kezdoTudatpont: 50,
        szoveg: [{ id: 'b1', tipus: 'kep', url: fel.adat.url }]
      })
    });
    felulet.folyamat.kill(); felulet = null; await varj(500);

    // ----- A vendég kétszer cserél -----
    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2000);

    // ⚠️ AZ ELSŐ KÖRBEN a vendég még nem tud a képről (az események most érkeznek).
    const elso = await fut(vendeg, 'csere', '127.0.0.1', String(port));
    if (!/kaptam \d+ új eseményt/.test(elso)) return false;

    // ⭐ A MÁSODIK KÖRBEN már kérdez — és megtudja, hogy a gazdánál megvan.
    //
    // ⚠️ EZ A PRÓBA A FELDERÍTÉST méri, nem az átvitelt: azt, hogy a **bulin kiderül**,
    // kinél van meg. *(Korábban azt is állította, hogy a fájl hiányzó MARAD — és amikor az
    // átvitel megépült, ez helyesen bukott. A próba a tárgyához igazodott, nem fordítva.)*
    const masodik = await fut(vendeg, 'csere', '127.0.0.1', String(port));
    return /fájlról tudom meg, hogy nála megvan/.test(masodik);
  } finally {
    if (felulet) felulet.folyamat.kill();
    if (figyelo) { figyelo.kill(); await varj(1000); }
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

proba('⛔ A fájl-kör NEM akasztja meg a rendes cserét (a két réteg külön él — D3)', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7523;
  let figyelo = null;
  try {
    await fut(gazda, 'koino', 'Próba koinó');
    await fut(gazda, 'gondolat', 'KÉP NÉLKÜLI GONDOLAT');

    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2000);

    // ⚠️ Fájl SEHOL nincs — a csere-körnek ettől ugyanúgy végig kell mennie, és a
    // MÁSODIK körnek is (ahol a fájl-kérdés elhangzana, ha lenne mit kérdezni).
    await fut(vendeg, 'csere', '127.0.0.1', String(port));
    const masodik = await fut(vendeg, 'csere', '127.0.0.1', String(port));

    const kep = await fut(vendeg, 'allapot');
    return /Csere kész/.test(masodik) && /KÉP NÉLKÜLI GONDOLAT/.test(kep);
  } finally {
    if (figyelo) { figyelo.kill(); await varj(1000); }
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐⭐ A BÁJTOK MEGÉRKEZNEK (5.7 / B) — a teljes kör két készüléken
// ===================================
//
// ⭐ EZ A SZÁLLÍTÁS VÉGE: felderítés a bulin → kérelem → a bájtok. A fájl **több
// szeletben** jön (64 KB-onként), és a lezárás **újra lenyomatol** — csak akkor kerül a
// végleges nevére, ha a bájtok azt adják ki.
//
// ⚠️ EGY MÉRÉSI CSAPDA, AMI ENGEM IS BECSAPOTT: a birtoklás-jegyzet a társat
// `hoszt:port` alakban jegyzi meg. Ha a próba minden körben MÁS porton indítja a
// figyelőt, a jegyzet a **régi** portot őrzi, és az átvitel egy halott címre megy.
// *Ezért fut ez a próba végig EGYETLEN porton.*

proba('⭐⭐⭐ A KÉP MEGÉRKEZIK A MÁSIK KÉSZÜLÉKRE — több szeletben, bájtra azonosan',
  async () => {
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const port = 7541;
    let figyelo = null;
    let felulet = null;
    try {
      await fut(gazda, 'koino', 'Próba koinó');

      // ----- Egy TÖBB SZELETNYI kép (150 KB ≈ 3 szelet) -----
      felulet = await feluletet(gazda, 7542);
      const fej = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
      const kep = Buffer.concat([fej, Buffer.alloc(150 * 1024, 7),
        Buffer.from('0000000049454e44ae426082', 'hex')]);

      const fel = await felulet.hiv('/api/feltoltes/kep',
        { method: 'POST', body: JSON.stringify({ adat: kep.toString('base64') }) });
      await felulet.hiv('/api/gondolat', {
        method: 'POST',
        body: JSON.stringify({
          cim: 'NAGY KÉPES GONDOLAT', kezdoTudatpont: 50,
          szoveg: [{ id: 'b1', tipus: 'kep', url: fel.adat.url }]
        })
      });
      felulet.folyamat.kill(); felulet = null; await varj(500);

      figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
        env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(2000);

      // 1. kör: az események · 2. kör: a kérdés, majd A BÁJTOK
      await fut(vendeg, 'csere', '127.0.0.1', String(port));
      const masodik = await fut(vendeg, 'csere', '127.0.0.1', String(port));
      if (!/1 fájl megérkezett/.test(masodik)) return false;

      // ⭐ ÉS A TÜRELEM IS LÁTSZIK (D68): *„annyit küzdünk, amennyit az alternatíva hiánya
      // indokol"*. ⚠️ Itt EGY forrás van, tehát a teljes türelem jár — hogy a szám tényleg
      // **el is jut a vonalig**, azt a következő próba méri (viselkedéssel, nem kiírással).
      if (!/türelem: 30\.0 mp · 1 forrás/.test(masodik)) return false;

      // ⭐ ÉS A LÉNYEG: a vendégnél megvan, és BÁJTRA ugyanaz.
      const fajlok = await fut(vendeg, 'fajlok');
      const nala = await readFile(
        join(vendeg, 'sajat', 'fajlok', fel.adat.lenyomat));

      return /1 \/ 1 megvan/.test(fajlok)
        && Buffer.from(nala).equals(kep);
    } finally {
      if (felulet) felulet.folyamat.kill();
      if (figyelo) { figyelo.kill(); await varj(1000); }
      await rm(gazda, { recursive: true, force: true });
      await rm(vendeg, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔⛔ …ÉS AZ ŐRJÁRAT IS ELHOZZA — KÉZ NÉLKÜL (2026-09-14)
// ===================================
//
// ⛔ EZ A PRÓBA EGY VALÓDI HIÁNY MIATT SZÜLETETT, amit egy átnézés talált: a fenti próba
// **kézzel gépelt `csere` parancsot** használ — és mérve, az őrjárat (a CLAUDE.md szerint
// „a valódi üzemmód") a `csereVonalon` **hetedik paraméterét nem adta át**, a kör után
// pedig nem hozta el a bájtokat. *Vagyis a fájl-szállítás teljes lánca csak akkor futott,
// ha valaki odaült a géphez.*
//
// ⚠️ ÉS A LÉNYEG: EZT EGYETLEN MEGLÉVŐ PRÓBA SEM VETTE ÉSZRE — a fenti kép-próba is zöld
// volt végig, mert kézzel cserélt. *Amit csak kézi paranccsal mérünk, arról nem tudjuk,
// hogy magától is megtörténik-e.*
//
// ⚠️ KÉT KÖR KELL: a fájl-felderítés **egy bulival később jár**, mint az esemény-csere —
// nem lehet olyan fájlról kérdezni, amiről még nem tudom, hogy létezik. Ezért fut az
// őrjárat rövid (3 mp-es) körökkel, és ezért várunk többet egy körnél.

proba('⭐⭐⭐ AZ ŐRJÁRAT MAGÁTÓL ELHOZZA A KÉPET — kézi parancs nélkül', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7546;
  let figyelo = null, felulet = null, orjarat = null;
  try {
    await fut(gazda, 'koino', 'Próba koinó');

    // Egy egyszeletnyi kép — a több szeletet a fenti próba méri.
    felulet = await feluletet(gazda, 7547);
    const fej = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
    const kep = Buffer.concat([fej, Buffer.alloc(20 * 1024, 11),
      Buffer.from('0000000049454e44ae426082', 'hex')]);

    const fel = await felulet.hiv('/api/feltoltes/kep',
      { method: 'POST', body: JSON.stringify({ adat: kep.toString('base64') }) });
    await felulet.hiv('/api/gondolat', {
      method: 'POST',
      body: JSON.stringify({
        cim: 'ŐRJÁRATOS KÉPES GONDOLAT', kezdoTudatpont: 50,
        szoveg: [{ id: 'b1', tipus: 'kep', url: fel.adat.url }]
      })
    });
    felulet.folyamat.kill(); felulet = null; await varj(500);

    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2000);

    // A vendég egyetlen kézi tette: felveszi a társat. ⭐ Innentől kéz nem érinti.
    await fut(vendeg, 'tars', '127.0.0.1', String(port));

    let kimenet = '';
    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.05', '7548'], {
      env: { ...process.env, KOINO_ADAT: vendeg, KOINO_NAPLO: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    orjarat.stdout.on('data', (d) => { kimenet += d; });
    orjarat.stderr.on('data', (d) => { kimenet += d; });

    await varj(14000);                       // ~4 kör: az elsőn az események, utána a fájl
    orjarat.kill(); orjarat = null;
    await varj(1000);

    if (!/fájl megérkezett/.test(kimenet)) return false;

    // ⭐ ÉS A LÉNYEG: a vendégnél megvan, BÁJTRA ugyanaz — magától.
    const nala = await readFile(join(vendeg, 'sajat', 'fajlok', fel.adat.lenyomat));
    return Buffer.from(nala).equals(kep);
  } finally {
    if (felulet) felulet.folyamat.kill();
    if (orjarat) orjarat.kill();
    if (figyelo) { figyelo.kill(); await varj(1000); }
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ===================================
// ⛔⛔ ÉS A TÜRELEM TÉNYLEG ELJUT A VONALIG — VISELKEDÉSSEL MÉRVE (D68, 2026-09-15)
// ===================================
//
// ⚠️⚠️ AZ ELSŐ PRÓBÁM VAK VOLT, ÉS A RONTÁS-PRÓBA BUKTATTA LE: a kiírt „türelem: 30,0 mp"
// sort néztem, az viszont a **kiszámolt** értékből jön — a bekötést kivéve (a `tcpNyito`
// harmadik paraméterét elhagyva) a kiírás **változatlan maradt**. *Azt mértem, hogy
// kiszámoltuk, nem azt, hogy használjuk.* **Hetedszer ugyanaz a szabály.**
//
// ⭐ EZ A PRÓBA VISELKEDÉST MÉR: egy **nem válaszoló** társtól kérünk fájlt, és megnézzük,
// **mennyi idő múlva adjuk fel**. Hat forrás → a türelem az alsó korlát (5 mp), tehát a
// bukásnak ~5–6 másodperc alatt meg kell jönnie. ⛔ Ha a türelem nem jutna el a vonalig, a
// vonal alapértéke (30 mp) szólna — és ez a próba időkorlátjába ütközne.

proba('⛔⛔ A TÜRELEM ELJUT A VONALIG: hat forrásnál 5 mp alatt feladjuk', async () => {
  const hely = await ujKeszulek();
  const port = 7551;
  let figyelo = null;
  try {
    await fut(hely, 'koino', 'Próba koinó');

    // ⭐ EGY HIÁNYZÓ FÁJL-HIVATKOZÁS, felület nélkül: a besorolás IKONJA is lehet kép (5.4).
    const hamisLenyomat = 'Zt' + 'a'.repeat(41);          // 43 karakter, sosem létezett
    await fut(hely, 'kategoria', 'Képes kategória', '/api/fajl/' + hamisLenyomat);

    // ⭐ HAT FORRÁS a birtoklás-jegyzetben — mind NEM VÁLASZOLÓ cím (nem routolható).
    // *A jegyzet helyi feljegyzés (3. szabály), tehát nyugodtan írható kézzel.*
    const tarsak = {};
    for (let i = 1; i <= 6; i++) tarsak['10.255.255.' + i + ':7373'] = { mikor: Date.now() };
    await writeFile(join(hely, 'sajat', 'fajlbirtoklas.json'),
      JSON.stringify({ [hamisLenyomat]: { tarsak } }), 'utf8');

    // ⚠️ A csere maga EGY ÉLŐ (üres) társsal fut, hogy gyorsan lezáruljon — így a mért idő
    // gyakorlatilag a fájl-átvitel türelme. *A halott címek csak a fájl-jegyzetben vannak.*
    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: await ujKeszulek(), KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(1500);

    const kezd = Date.now();
    const kimenet = await fut(hely, 'csere', '127.0.0.1', String(port));
    const eltelt = Date.now() - kezd;

    // ⭐ A KIÍRÁS a hat forrást és az 5 mp-es türelmet mondja…
    if (!/türelem: 5\.0 mp · 6 forrás/.test(kimenet)) return false;
    // ⛔ …ÉS A VISELKEDÉS IS: ~5 mp körül feladtuk, nem 30-nál. *Ez a sor buktatja a
    // bekötés kivételét — a kiírás önmagában nem, mert az a KISZÁMOLT értéket mutatja.*
    return eltelt > 3000 && eltelt < 20000;
  } finally {
    if (figyelo) { figyelo.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⛔⛔ A KULCS KÉZI ÚTJA — ODA ÉS VISSZA (2026-09-15)
// ===================================
//
// Egy átnézés talált egy 4. szabály-hiányt, ugyanabból a fajtából, mint 2026-09-10-én: a
// `kulcsparVisszatoltese` MEGÉPÜLT és működött, de **egyetlen hívója sem volt** — se éles
// út, se próba. A program az első indításkor azt mondta: *„Mentsd el"* — és a mentett
// fájlt nem lehetett visszahozni vele.
//
// ⛔ És a mérés rosszabbat mutatott a puszta hiánynál: a `kulcsparBiztositasa` MINDEN
// parancs előtt lefut, tehát aki a mentett kulcsával próbálkozott, előbb kapott egy
// vadonatúj azonosságot — és ezt olvasta: *„Új kulcs készült — ez mostantól a
// személyazonosságod."* Igaz mondat a lehető legrosszabb pillanatban.

proba('⭐⭐⭐ A MENTETT KULCS VISSZAHOZHATÓ — és közben NEM születik új azonosság', async () => {
  const regi = await ujKeszulek();
  const uj = await ujKeszulek();
  const mentesFajl = join(regi, 'kulcsom.json');

  try {
    // 1. Az „elveszett" készülék azonossága, és a mentés.
    const eredeti = teljesAzonosito(await fut(regi, 'kulcs'));
    await fut(regi, 'mentes', mentesFajl);

    // 2. Az ÚJ készülék — mint egy frissen vett telefon.
    const vissza = await fut(uj, 'visszatolt', mentesFajl);

    // ⛔ EZ A SOR BUKTATJA A KORAI ÁG KIVÉTELÉT: ha a visszatöltés a kulcs-biztosítás
    // UTÁN futna, itt ott állna az „Új kulcs készült" — és a mentés hiába jött volna.
    if (vissza.includes('Új kulcs készült')) return false;
    if (!vissza.includes('visszatöltve')) return false;

    // 3. ⭐ A BIZONYÍTÉK: a készülék MOSTANTÓL ugyanaz az e-ember.
    const mostani = teljesAzonosito(await fut(uj, 'kulcs'));
    return eredeti !== null && mostani === eredeti;
  } finally {
    await rm(regi, { recursive: true, force: true });
    await rm(uj, { recursive: true, force: true });
  }
});

proba('⛔ MEGLÉVŐ azonosságot csak KIMONDOTT engedéllyel ír felül — és megmondja, mit dob el',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const mentesFajl = join(egyik, 'kulcsom.json');

    try {
      const hozott = teljesAzonosito(await fut(egyik, 'kulcs'));
      await fut(egyik, 'mentes', mentesFajl);

      // A másik készüléknek MÁR VAN azonossága — ez a veszélyes eset.
      const sajat = teljesAzonosito(await fut(masik, 'kulcs'));

      // a) Engedély nélkül: megtagadja, és a régi marad.
      const tiltas = await fut(masik, 'visszatolt', mentesFajl);
      if (!tiltas.includes('MÁR VAN kulcs')) return false;
      if (teljesAzonosito(await fut(masik, 'kulcs')) !== sajat) return false;

      // b) Kimondott engedéllyel: megtörténik, ÉS kimondja, mi veszett el (D19).
      const csere = await fut(masik, 'visszatolt', mentesFajl, 'felulir');
      if (!csere.includes('ELVESZETT')) return false;

      return teljesAzonosito(await fut(masik, 'kulcs')) === hozott && hozott !== sajat;
    } finally {
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐⭐ TÖBB FORRÁSBÓL EGY FÁJL — ÉLESBEN (D68 / 6., 2026-09-15)
// ===================================

proba('⭐⭐⭐ KÉT FORRÁSBÓL JÖN EGY KÉP — és a bájtok NEM sokszorozódnak meg', async () => {
  // ⛔⛔ EZ A BEKÖTÉS PRÓBÁJA, ÉS VISELKEDÉST MÉR, NEM FELIRATOT. A 28. mérés vak próbája
  // épp az volt, hogy a **kiírt** számot néztem — az a kiszámolt értékből jön, tehát a
  // bekötés kivételekor sem változik.
  //
  // ⭐ ITT A JEL A `bajt` OSZLOP: munkamegosztás nélkül **mindkét ág a TELJES fájlt
  // hozná**, és a mennyiség megkétszereződne. *A duplikáció mérhető; az ígéret nem.*
  const gazda = await ujKeszulek();
  const masolat = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const portA = 7561;
  const portB = 7562;
  let figyeloA = null, figyeloB = null, felulet = null;

  try {
    await fut(gazda, 'koino', 'Két forrás koinó');

    // ----- Egy TÖBB SZELETNYI kép (300 KB ≈ 5 szelet) -----
    felulet = await feluletet(gazda, 7563);
    const fej = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
    const kep = Buffer.concat([fej, Buffer.alloc(300 * 1024, 11),
      Buffer.from('0000000049454e44ae426082', 'hex')]);

    const fel = await felulet.hiv('/api/feltoltes/kep',
      { method: 'POST', body: JSON.stringify({ adat: kep.toString('base64') }) });
    await felulet.hiv('/api/gondolat', {
      method: 'POST',
      body: JSON.stringify({
        cim: 'KÉT FORRÁSBÓL', kezdoTudatpont: 50,
        szoveg: [{ id: 'b1', tipus: 'kep', url: fel.adat.url }]
      })
    });
    felulet.folyamat.kill(); felulet = null; await varj(500);

    // ⭐ A MÁSODIK FORRÁS: ugyanaz a készülék lemásolva — ugyanaz a fájl két helyen.
    // *A koinóban ez a szokásos: a lenyomat a név, tehát ugyanaz a tartalom mindenkinél
    // ugyanazt az azonosítót kapja.*
    await cp(gazda, masolat, { recursive: true });

    figyeloA = spawn(process.execPath, [KOINO_JS, 'figyel', String(portA)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    figyeloB = spawn(process.execPath, [KOINO_JS, 'figyel', String(portB)], {
      env: { ...process.env, KOINO_ADAT: masolat, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2000);

    // ⭐ MINDKÉT TÁRS A LISTÁRA — így EGY kör mindkettőtől megkérdezi, kinél van meg,
    // és a kör utáni fájl-átvitel már KÉT forrást lát.
    await fut(vendeg, 'tars', '127.0.0.1', String(portA));
    await fut(vendeg, 'tars', '127.0.0.1', String(portB));

    await fut(vendeg, 'csere');            // 1. kör: az események
    const masodik = await fut(vendeg, 'csere');   // 2. kör: a kérdés, majd A BÁJTOK

    if (!/1 fájl megérkezett/.test(masodik)) return false;

    // ⛔⛔ A DÖNTŐ SOR: mennyi bájt jött? A kép 300 KB — munkamegosztás nélkül 600 lenne.
    const mennyi = masodik.match(/1 fájl megérkezett[^(]*\(([\d.]+) KB/);
    if (!mennyi) return false;
    const kb = parseFloat(mennyi[1]);
    if (!(kb > 250 && kb < 450)) return false;

    // ⭐ És a kép BÁJTRA ugyanaz, egyetlen darabból összerakva.
    const nala = await readFile(join(vendeg, 'sajat', 'fajlok', fel.adat.lenyomat));
    return Buffer.from(nala).equals(kep)
      && /párhuzamosan 2 forrásból/.test(masodik);
  } finally {
    if (felulet) felulet.folyamat.kill();
    if (figyeloA) figyeloA.kill();
    if (figyeloB) figyeloB.kill();
    await varj(1000);
    for (const m of [gazda, masolat, vendeg]) {
      await rm(m, { recursive: true, force: true });
    }
  }
});

// ===================================
// ⭐⭐⭐ A ROSSZ SZELET: HAMIS BÁJT UTÁN MÁS FORRÁSHOZ FORDULUNK (D68 / 6.)
// ===================================
//
// ⛔⛔ EGY VALÓDI KOINO NEM TUD HAMIS BÁJTOT ADNI: a kiszolgáló `blob.olvas`-a **újra
// lenyomatol**, tehát a megrontott fájlt ki sem adja. ⭐ *Ez jó hír, de épp ezért a támadót
// külön meg kell írni:* egy hamis kiszolgáló, ami a fájl-protokollt beszéli, és szemetet
// küld. Így mérhető az éles út — nem utánzattal, hanem valódi `csere` paranccsal.

/** Egy hamis forrás: a `FAJLKEREK`-re rossz bájtokat ad, `vege: true`-val. */
async function hamisForras(meret) {
  const { createServer } = await import('node:net');
  const kapcsolatok = [];
  const kiszolgalo = createServer((k) => {
    kapcsolatok.push(k);
    let puffer = '';
    k.setEncoding('utf8');
    k.on('error', () => {});
    k.on('data', (d) => {
      puffer += d;
      let vege;
      while ((vege = puffer.indexOf('\n')) !== -1) {
        const sor = puffer.slice(0, vege);
        puffer = puffer.slice(vege + 1);
        let uzenet;
        try { uzenet = JSON.parse(sor); } catch { continue; }
        if (uzenet.uzenet !== 'FAJLKEREK') continue;
        // ⛔ A HAMISÍTÁS: a kért eltolásra küldünk, de MÁS bájtokat.
        k.write(JSON.stringify({
          uzenet: 'FAJLSZELET', lenyomat: uzenet.lenyomat, eltolas: uzenet.eltolas,
          adat: Buffer.alloc(meret, 66).toString('base64'), teljes: meret, vege: true
        }) + '\n');
      }
    });
  });
  await new Promise((t) => kiszolgalo.listen(0, '127.0.0.1', t));
  return {
    port: kiszolgalo.address().port,
    zar: () => { for (const k of kapcsolatok) k.destroy(); kiszolgalo.close(); }
  };
}

proba('⭐⭐⭐ HAMIS BÁJT UTÁN MÁS FORRÁSSAL PRÓBÁLJUK — és a kép megjön', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7571;
  let figyelo = null, felulet = null, hamis = null, ures = null;

  try {
    await fut(gazda, 'koino', 'Rossz szelet koinó');

    // ----- Egy kép, ami EGY szeletnél kisebb (hogy a hamis forrás egy üzenettel végezzen) -----
    felulet = await feluletet(gazda, 7572);
    const fej = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
    const kep = Buffer.concat([fej, Buffer.alloc(20 * 1024, 5),
      Buffer.from('0000000049454e44ae426082', 'hex')]);

    const fel = await felulet.hiv('/api/feltoltes/kep',
      { method: 'POST', body: JSON.stringify({ adat: kep.toString('base64') }) });
    await felulet.hiv('/api/gondolat', {
      method: 'POST',
      body: JSON.stringify({
        cim: 'ROSSZ SZELET', kezdoTudatpont: 50,
        szoveg: [{ id: 'b1', tipus: 'kep', url: fel.adat.url }]
      })
    });
    felulet.folyamat.kill(); felulet = null; await varj(500);

    // ⭐ AZ ESEMÉNYEK HÁLÓZAT NÉLKÜL mennek át (4. szabály) — így a vendég ismeri a képet,
    // de a bájtjai nincsenek meg neki.
    const vittFajl = join(gazda, 'atvitel.jsonl');
    await fut(gazda, 'kivisz', vittFajl, 'mind');
    await fut(vendeg, 'behoz', vittFajl);

    // A JÓ forrás (valódi koino) és a HAMIS (kézzel írt kiszolgáló).
    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    hamis = await hamisForras(kep.length);
    await varj(1500);

    // ⭐ A BIRTOKLÁS-JEGYZET: MINDKETTŐNÉL „megvan" — a vendég nem tudja, melyik hazudik.
    // *A jegyzet helyi feljegyzés (3. szabály), tehát nyugodtan írható kézzel.*
    const jegyzetUt = join(vendeg, 'sajat', 'fajlbirtoklas.json');
    await writeFile(jegyzetUt, JSON.stringify({
      [fel.adat.lenyomat]: {
        tarsak: {
          ['127.0.0.1:' + hamis.port]: { mikor: Date.now() },
          ['127.0.0.1:' + port]: { mikor: Date.now() }
        }
      }
    }), 'utf8');

    // ⚠️ Egy ÉLŐ, üres társ kell, hogy a `csere` kör lefusson (a fájl-átvitel a kör UTÁN megy).
    ures = spawn(process.execPath, [KOINO_JS, 'figyel', '7573'], {
      env: { ...process.env, KOINO_ADAT: await ujKeszulek(), KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(1200);

    // ===== 1. KÖR: a hamis forrás is sorra kerül → a lezárás elbukik =====
    await fut(vendeg, 'csere', '127.0.0.1', '7573');

    // ⛔ A DÖNTŐ ELLENŐRZÉS: a jegyzetben megjelent a bukás — és PONTOSAN azoknál, akik
    // részt vettek. *Ez a bekötés bizonyítéka: a réteg tudása eljutott a lemezre.*
    const utana = JSON.parse(await readFile(jegyzetUt, 'utf8'));
    const romlott = utana[fel.adat.lenyomat]?.romlott ?? {};
    if (!Object.keys(romlott).length) return false;

    // ===== 2. KÖR: a bukott forrást KERÜLJÜK → a jó forrástól megjön =====
    for (let i = 0; i < 3; i++) {
      await fut(vendeg, 'csere', '127.0.0.1', '7573');
      const nala = await readFile(join(vendeg, 'sajat', 'fajlok', fel.adat.lenyomat))
        .catch(() => null);
      if (nala && Buffer.from(nala).equals(kep)) {
        // ⭐ ÉS A FELEJTÉS: amint a fájl megvan, a tanulság tárgytalan.
        const vegul = JSON.parse(await readFile(jegyzetUt, 'utf8'));
        return vegul[fel.adat.lenyomat]?.romlott === undefined;
      }
    }
    return false;
  } finally {
    if (felulet) felulet.folyamat.kill();
    if (figyelo) figyelo.kill();
    if (ures) ures.kill();
    if (hamis) hamis.zar();
    await varj(1000);
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐⭐ A BULI: AZ ÖSSZEHANGOLT ABLAK ÉS AZ ISMÉTELT MENET (30. mérés, 2026-09-15)
// ===================================

proba('⭐⭐ AZ ŐRJÁRAT A FAL ÓRÁJÁHOZ IGAZODIK — nem az indítás pillanatához', async () => {
  // ⛔ MIT MÉR: a `setTimeout(perc * 60 * 1000)` korábban a kör UTÁN indult, tehát az
  // ébredés fázisát az szabta meg, ki mikor kapcsolta be a készülékét. ⭐ Két készülék így
  // csak véletlenül találkozott — a 30. mérés szerint ritka gráfon a futások 97%-ában SOHA.
  //
  // ⭐⭐ ÉS EZ VISELKEDÉS, NEM FELIRAT: 6 másodperces ütemnél az igazított körök az epoch
  // szerinti 6 mp-es rácson kezdődnek, tehát a kiírt másodperc **osztható hattal**.
  // *Igazítás nélkül a fázist az indítás adná — egyenletesen szórna a hat érték között.*
  const hely = await ujKeszulek();
  let orjarat = null;
  try {
    await fut(hely, 'koino', 'Buli koinó');

    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', '7591'], {
      env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '' }
    });

    let kimenet = '';
    orjarat.stdout.on('data', (d) => { kimenet += d; });

    // ⚠️ Az indítást SZÁNDÉKOSAN nem igazítjuk: a próba épp azt méri, hogy a program
    // igazít, akkor is, ha a rács közepén indult.
    await varj(26000);

    // A kör-sorok időbélyege: „· HH:MM:SS nincs társ a listán…" (nincs társ, ez elég).
    const masodpercek = [...kimenet.matchAll(/(\d{1,2}):(\d{2}):(\d{2})/g)]
      .map((m) => parseInt(m[3], 10));

    // Az ELSŐ kör az indításkor fut (még nem igazítva) — azt kihagyjuk.
    const kesobbiek = masodpercek.slice(1);
    if (kesobbiek.length < 2) return false;

    // ⭐ A DÖNTŐ ÁLLÍTÁS: a későbbi körök a 6 mp-es rácson vannak.
    // ⚠️ Egy másodperc türelemmel, mert a kiírás a kör VÉGÉN történik.
    const raconVan = kesobbiek.filter((mp) => mp % 6 <= 1).length;
    return raconVan === kesobbiek.length;
  } finally {
    if (orjarat) orjarat.kill();
    await varj(500);
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐⭐⭐ A KÖR ISMÉTLŐDIK, AMÍG VAN ÚJDONSÁG — a hír EGY ablakon belül tovább ér',
  async () => {
    // ⛔ MIT MÉR: egy menet alatt a hír egy lépést tesz a láncban. ⭐ A társ-listán a
    // SORREND dönt: ha a hír forrása a lista VÉGÉN van, egy menetnél a lista elején álló
    // társ **csak a következő ablakban** tudná meg. Ismételt menetnél ugyanabban.
    //
    // ⭐⭐ A forgatókönyv: az őrjárat listáján előbb a NÉMA (aki majd megkapja), utána a
    // FORRÁS. Egy menet: néma (semmi) → forrás (megkapjuk). Két menet: néma (ÁTADJUK!).
    const orjaratHely = await ujKeszulek();
    const forrasHely = await ujKeszulek();
    const celHely = await ujKeszulek();
    let forras = null, cel = null, orjarat = null;

    try {
      // Közös koino: az eseményeket hálózat nélkül visszük át (4. szabály).
      await fut(forrasHely, 'koino', 'Ismételt menet');
      const vitt = join(forrasHely, 'alap.jsonl');
      await fut(forrasHely, 'kivisz', vitt, 'mind');
      await fut(orjaratHely, 'behoz', vitt);
      await fut(celHely, 'behoz', vitt);

      // ⭐ AZ ÚJDONSÁG: csak a forrásnál van meg.
      await fut(forrasHely, 'gondolat', 'AZ ISMÉTELT MENET HÍRE');

      forras = spawn(process.execPath, [KOINO_JS, 'figyel', '7593'], {
        env: { ...process.env, KOINO_ADAT: forrasHely, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      cel = spawn(process.execPath, [KOINO_JS, 'figyel', '7594'], {
        env: { ...process.env, KOINO_ADAT: celHely, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(1500);

      // ⛔ A SORREND A LÉNYEG: előbb a CÉL (neki nincs mit adnia), utána a FORRÁS.
      await fut(orjaratHely, 'tars', '127.0.0.1', '7594');
      await fut(orjaratHely, 'tars', '127.0.0.1', '7593');

      // ⛔⛔ EZ A VÁRAKOZÁS EGY VAK PRÓBÁT JAVÍT KI (2026-09-15). Az első változat rögtön
      // indította az őrjáratot, és a rontás-próba **nem buktatta** — mert az őrjárat azóta
      // a **percfordulóhoz igazít**, tehát a második ablak akár 2 másodperc múlva is
      // jöhetett. ⚠️ Két kör futott a 12 másodpercben, és a hír a MÁSODIK körben jutott át:
      // *a próba az igazítást mérte, nem az ismétlést.*
      //
      // ⭐ A javítás: a percforduló UTÁN indítunk, tehát a következő ablak ~60 mp-re van —
      // a próba idejébe biztosan EGY kör fér. *Amit mérni akarunk, azt egyedül kell hagyni.*
      const percHatra = 60000 - (Date.now() % 60000);
      await varj(percHatra + 500);

      // ⚠️ EGY PERCES ütem: ha csak egy menet futna, a cél a következő körig — vagyis a
      // próba ideje alatt SOHA — nem tudná meg. *Ez teszi a mérést élessé.*
      orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '1', '7592'], {
        env: { ...process.env, KOINO_ADAT: orjaratHely, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(12000);
      orjarat.kill(); orjarat = null;
      await varj(500);

      // ⭐ A BIZONYÍTÉK: a CÉL készülék állapotában ott a hír — egyetlen ablakból.
      const allapot = await fut(celHely, 'allapot');
      return /AZ ISMÉTELT MENET HÍRE/.test(allapot);
    } finally {
      if (orjarat) orjarat.kill();
      if (forras) forras.kill();
      if (cel) cel.kill();
      await varj(800);
      for (const m of [orjaratHely, forrasHely, celHely]) {
        await rm(m, { recursive: true, force: true });
      }
    }
  });

// ===================================
// ⭐⭐ A FRISS UDP-CÍM BEKÖTÉSE — VISELKEDÉST MÉRÜNK (2026-09-18)
// ===================================
//
// ⛔⛔ MIÉRT KELLETT EZ A PRÓBA, ÉS HOGYAN DERÜLT KI? Egy kód-átnézés (másik session,
// 2026-09-18) kivágta MIND A NÉGY éles bekötési pontot — az őrjárat cseréjét, a postaláda
// hirdetését, a kézi cserét és a saját cím feljegyzését —, és **mind a négyszer 624/624
// maradt zöld**. Megismételve: a rontás után is zöld. ⭐ *A `tarsak.js` függvényeit őrizte
// próba; azt, hogy a PROGRAM használja őket, semmi.*
//
// ⚠️ Ugyanaz az alak, amit a napló nyolcszor felsorol — és pontosan az, amit a 28. mérés
// tanulsága kimond: **a próba viselkedést mérjen, ne kiírt számot.**
//
// A mérés alakja: két készülék, két folyamat, valódi `figyel` + `csere`. Az egyikbe
// **kézzel** beírunk egy friss UDP-címet (ez a 4. szabály kézi útja — a jegyzék sima JSON),
// a másiknak pedig ott kell lennie a cserénél. *Nem kiírás, hanem a másik gép lemeze.*

proba('⭐⭐ A FRISS UDP-CÍM ÁTKERÜL A MÁSIK KÉSZÜLÉKRE (a bekötés próbája)', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7451;

  await fut(gazda, 'koino', 'Cim proba');

  // A gazda jegyzékébe kézzel írunk egy FRISS címet — mintha az imént fúrt volna.
  await writeFile(join(gazda, 'udpcimek.json'), JSON.stringify({
    cimek: [{ hoszt: '203.0.113.77', port: 41777, mikor: Date.now() }]
  }), 'utf8');

  await csereKor(gazda, vendeg, port);

  // ⭐ A BIZONYÍTÉK A VENDÉG LEMEZÉN VAN: a cím átkerült-e a saját jegyzékébe?
  let jegyzek = [];
  try {
    jegyzek = JSON.parse(await readFile(join(vendeg, 'udpcimek.json'), 'utf8')).cimek ?? [];
  } catch { return false; }

  return jegyzek.some((c) => c.hoszt === '203.0.113.77' && c.port === 41777
    // ⚠️ És a KORÁT a saját óránkhoz kötötte: a bejegyzés ideje a MI időnk, nem az övé.
    && Number.isInteger(c.mikor) && Math.abs(Date.now() - c.mikor) < 60000);
});

// ⚠️ ÉS AZ ELÉVÜLT CÍM NEM TERJED. *Enélkül a jegyzék halott címeket hordana szét, és a
// következő buli azokra kopogna — ez a 31. mérés leletének gyakorlati fele.*
proba('⛔ Az ELÉVÜLT cím NEM kerül át (a jegyzék nem terjeszt halott címet)', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7452;

  await fut(gazda, 'koino', 'Cim proba 2');

  // Két cím: az egyik friss, a másik RÉG elévült (két órája).
  await writeFile(join(gazda, 'udpcimek.json'), JSON.stringify({
    cimek: [
      { hoszt: '203.0.113.88', port: 41888, mikor: Date.now() },
      { hoszt: '203.0.113.99', port: 41999, mikor: Date.now() - 2 * 3600 * 1000 }
    ]
  }), 'utf8');

  await csereKor(gazda, vendeg, port);

  let jegyzek = [];
  try {
    jegyzek = JSON.parse(await readFile(join(vendeg, 'udpcimek.json'), 'utf8')).cimek ?? [];
  } catch { return false; }

  return jegyzek.some((c) => c.hoszt === '203.0.113.88')
    && !jegyzek.some((c) => c.hoszt === '203.0.113.99');
});

// ===================================
// ⭐⭐⭐ AZ ŐRJÁRAT UDP-ÁGA (2026-09-20) — A KOPOGÁSSAL TALÁLKOZÁS
// ===================================
//
// ⛔⛔ MIT MÉR, ÉS MIÉRT EZ A LEGFONTOSABB PRÓBA ITT: a 36/d. terepmérés szerint **idegent
// a mobil NAT nem enged be** — rést csak a KÖLCSÖNÖS kopogás nyit. Vagyis egy csak-mobilos
// közösségben a kapu nyitva tartása (postaláda) senkinek nem elég.
//
// ⭐ A próba ezért SZÁNDÉKOSAN NEM AD TÁRS-LISTÁT egyik készüléknek sem: a társ-listás
// (TCP) út el sem indulhat. Az egyetlen út a friss UDP-cím + a kopogás.
// ⭐⭐ És VISELKEDÉST mér, nem feliratot: a hírnek a MÁSIK KÉSZÜLÉK ÁLLAPOTÁBAN kell
// megjelennie.

proba('⭐⭐⭐ AZ ŐRJÁRAT KOPOGÁSSAL TALÁL ÖSSZE — társ-lista NÉLKÜL, friss UDP-címből',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const A = 7461, B = 7462;
    let egyikOr = null, masikOr = null;

    try {
      // Közös koino, hálózat nélkül (4. szabály).
      await fut(egyik, 'koino', 'Kopogos buli');
      const vitt = join(egyik, 'alap.jsonl');
      await fut(egyik, 'kivisz', vitt, 'mind');
      await fut(masik, 'behoz', vitt);

      // ⭐ AZ ÚJDONSÁG CSAK AZ EGYIKNÉL VAN.
      await fut(egyik, 'gondolat', 'A KOPOGÁSSAL ÉRKEZETT HÍR');

      // ⭐ EGYMÁS FRISS UDP-CÍME — és SEMMI MÁS. Nincs `tars`, nincs társ-lista.
      const jegyzek = (hova, mihez) => writeFile(join(hova, 'udpcimek.json'),
        JSON.stringify({ cimek: [{ hoszt: '127.0.0.1', port: mihez, mikor: Date.now() }] }),
        'utf8');
      await jegyzek(egyik, B);
      await jegyzek(masik, A);

      // ⚠️ EGYSZERRE indítjuk — mert épp ez a lényeg: a rés a KÖLCSÖNÖS kopogásra nyílik.
      egyikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(A)], {
        env: { ...process.env, KOINO_ADAT: egyik, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      masikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(B)], {
        env: { ...process.env, KOINO_ADAT: masik, KOINO_NAPLO: '' }, stdio: 'ignore'
      });

      await varj(20000);
      egyikOr.kill(); egyikOr = null;
      masikOr.kill(); masikOr = null;
      await varj(700);

      // ⭐ A BIZONYÍTÉK A MÁSIK KÉSZÜLÉK LEMEZÉN: megvan-e a hír, kézi parancs nélkül?
      const allapot = await fut(masik, 'allapot');
      return /A KOPOGÁSSAL ÉRKEZETT HÍR/.test(allapot);
    } finally {
      if (egyikOr) egyikOr.kill();
      if (masikOr) masikOr.kill();
      await varj(800);
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔⛔ AZ EGYOLDALÚ RÉS (2026-09-25 — a 40. mérés hibája, itthon reprodukálva)
// ===================================
//
// ⛔ A TEREPI HELYZET: az egyik telefon ismerte a másik címét és kopogott rá; a másik a
// bekopogóval csak TCP-n találkozott, ezért a kötésében az első címe PORT NÉLKÜL állt, és
// arra sosem kopogott vissza. A rés megnyílt (a másik visszaszólt), de nála csere nem
// indult — az első fél cseréje 10 mp múlva elbukott, és a napló ezt elhallgatta.
// ⚠️ A régi próba (fent) ezt nem látta: ott MINDKÉT fél ismerte a másikat.
//
// ⚠️ A „MÁSIK" célja itt SZÁNDÉKOSAN nem a hurok-cím: a fúró az azonos CÍMRŐL, más portról
// érkező kopogót a már ismert célnak veszi (a mobil portváltása miatt) — ha minden cím
// 127.0.0.1 volna, a hiba el sem jönne elő. Ezért egy nem routolható cím (10.255.255.9),
// és egy néma helyi tükör, hogy a mérés ne a valódi hálózatot hívja.

proba('⛔⛔⛔ AZ EGYOLDALÚ RÉS IS CSERÉT HOZ — aki bekopog, azzal a másik is cserél',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const A = 7621, B = 7622;
    const tukor = await nemaFoglalat();
    let egyikOr = null, masikOr = null;

    try {
      await fut(egyik, 'koino', 'Egyoldalu res');
      const vitt = join(egyik, 'alap.jsonl');
      await fut(egyik, 'kivisz', vitt, 'mind');
      await fut(masik, 'behoz', vitt);
      await fut(egyik, 'gondolat', 'AZ EGYOLDALU RESEN ATJOTT HIR');

      // ⭐ CSAK AZ EGYIK ISMERI A MÁSIKAT. A másiknak egy MÁS című (halott) célja van,
      // hogy a kopogási ablaka egyáltalán megnyíljon — mint a 40. mérésen.
      const jegyzek = (hova, hoszt, port) => writeFile(join(hova, 'udpcimek.json'),
        JSON.stringify({ cimek: [{ hoszt, port, mikor: Date.now() }] }), 'utf8');
      await jegyzek(egyik, '127.0.0.1', B);
      await jegyzek(masik, '10.255.255.9', 7373);

      const kornyezet = { ...process.env, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs',
        KOINO_TUKOR: '127.0.0.1:' + tukor.address().port };
      let masikKimenet = '';
      egyikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(A)], {
        env: { ...kornyezet, KOINO_ADAT: egyik }, stdio: 'ignore'
      });
      masikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(B)], {
        env: { ...kornyezet, KOINO_ADAT: masik }, stdio: ['ignore', 'pipe', 'pipe']
      });
      masikOr.stdout.on('data', (d) => { masikKimenet += d; });

      await varj(26000);
      egyikOr.kill(); egyikOr = null;
      masikOr.kill(); masikOr = null;
      await varj(700);

      const allapot = await fut(masik, 'allapot');
      let kotesek = [];
      try { kotesek = JSON.parse(await readFile(join(masik, 'kotesek.json'), 'utf8')).kotesek; } catch { /* nincs */ }

      return /AZ EGYOLDALU RESEN ATJOTT HIR/.test(allapot)
        // ⭐ …és a napló MEGNEVEZI, hogy ismeretlen kopogott be (terepen ebből látszik, honnan indult)
        && /ismeretlen kopogott be \(127\.0\.0\.1:7621\)/.test(masikKimenet)
        // ⭐ …és a kötés mostantól PORTOT is tud: a következő körtől magától kopog vissza.
        && kotesek.some((k) => k.port === A);
    } finally {
      if (egyikOr) egyikOr.kill();
      if (masikOr) masikOr.kill();
      tukor.close();
      await varj(800);
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔ A 42. MÉRÉS HÁROM JAVÍTÁSA (2026-09-25)
// ===================================

/** Egy STUN-válasz (XOR-MAPPED-ADDRESS, IPv4) — a hamis tükörnek. */
function stunValasz(cim, port) {
  const suti = [0x21, 0x12, 0xA4, 0x42];
  const ertek = Buffer.alloc(8);
  ertek[1] = 0x01;
  ertek.writeUInt16BE(port ^ 0x2112, 2);
  cim.split('.').map(Number).forEach((b, i) => { ertek[4 + i] = b ^ suti[i]; });
  const fej = Buffer.alloc(20);
  fej.writeUInt16BE(0x0101, 0);
  fej.writeUInt16BE(4 + ertek.length, 2);
  fej.writeUInt32BE(0x2112A442, 4);
  const attr = Buffer.alloc(4);
  attr.writeUInt16BE(0x0020, 0);
  attr.writeUInt16BE(ertek.length, 2);
  return Buffer.concat([fej, attr, ertek]);
}

proba('⛔⛔ A 0 TÁROLÓS KIÍRÁS NEM „KIÍRT" — a következő kör újra próbálja, és kimondja',
  async () => {
    // ⛔ A TEREPI HELYZET (42. mérés): a telefon új címét 0 tároló vette át, a program ezt
    // kiírtnak vette, és 2 és fél órán át nem próbálta újra — a társ a RÉGI címét olvasta.
    // ⭐ Itt a tükör hamis, de VALÓDI STUN-választ ad (tehát megvan a saját külső cím), a
    // DHT viszont néma: a kiírás soha nem ér célba. Minden körben újra kell próbálni.
    const { ujTablaKulcs, nyilvanosResz } = await import('../js/csere/tablaKulcs.js');
    const hely = await ujKeszulek();
    const tukor = await nemaFoglalat();
    tukor.on('message', (adat, felado) => {
      if (adat.length >= 20 && adat.readUInt16BE(0) === 0x0001) {
        tukor.send(stunValasz('203.0.113.9', 40000), felado.port, felado.address);
      }
    });
    const dht = await nemaFoglalat();
    let orjarat = null;

    try {
      await fut(hely, 'koino', 'Ujra kiiras');
      // Egy kötés, amelynek a rekeszébe írni kell — egy dokumentációs címmel, hogy a fúró
      // mérje a külső címet (csak nem-helyi célnál teszi).
      await writeFile(join(hely, 'kotesek.json'), JSON.stringify({
        kotesek: [{ ...nyilvanosResz(await ujTablaKulcs()), hoszt: '192.0.2.1', port: 7373,
          utoljara: Date.now(), talalkozasok: 3, eloszor: Date.now() }]
      }), 'utf8');

      let kimenet = '';
      orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', '7631'], {
        env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '',
          KOINO_TUKOR: '127.0.0.1:' + tukor.address().port,
          KOINO_DHT_BELEPOK: '127.0.0.1:' + dht.address().port },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      orjarat.stdout.on('data', (d) => { kimenet += d; });
      await varj(32000);

      const probak = (kimenet.match(/az új címem kiírása nem ért célba/g) ?? []).length;
      return probak >= 2 && !/az új címemet kiírtam a táblára/.test(kimenet);
    } finally {
      if (orjarat) orjarat.kill();
      tukor.close();
      dht.close();
      await varj(700);
      await rm(hely, { recursive: true, force: true });
    }
  });

proba('⛔ A SAJÁT MAGUNKKAL KÖTÖTT RÉGI KÖTÉS INDULÁSKOR KIESIK', async () => {
  const { ujTablaKulcs, nyilvanosResz } = await import('../js/csere/tablaKulcs.js');
  const hely = await ujKeszulek();
  let orjarat = null;
  try {
    await fut(hely, 'koino', 'Sajat kotes');
    const sajat = await ujTablaKulcs();
    await writeFile(join(hely, 'tabla-kulcs.json'), JSON.stringify(sajat), 'utf8');
    // A terepi állapot: a jegyzékben SAJÁT magunk (és egy valódi társ, akit meg kell tartani).
    const tars = nyilvanosResz(await ujTablaKulcs());
    await writeFile(join(hely, 'kotesek.json'), JSON.stringify({
      kotesek: [
        { ...nyilvanosResz(sajat), hoszt: '127.0.0.1', port: 7635, utoljara: Date.now(), talalkozasok: 2, eloszor: Date.now() },
        { ...tars, hoszt: '127.0.0.1', port: 7699, utoljara: Date.now(), talalkozasok: 2, eloszor: Date.now() }
      ]
    }), 'utf8');

    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', '7635'], {
      env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' },
      stdio: 'ignore'
    });
    await varj(4000);
    orjarat.kill(); orjarat = null;
    await varj(500);

    const kotesek = JSON.parse(await readFile(join(hely, 'kotesek.json'), 'utf8')).kotesek;
    return !kotesek.some((k) => k.alairo === sajat.alairoNyilvanos)
      && kotesek.some((k) => k.alairo === tars.alairo);
  } finally {
    if (orjarat) orjarat.kill();
    await varj(300);
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔ A TÁRSLISTÁN ÁLLÓ SAJÁT CÍMÜNKET NEM HÍVJUK — és kötés sem lesz belőle', async () => {
  // ⛔ A TEREPI HELYZET (42. mérés): a telefon a saját wifis címét is felhívta; a napló
  // „bejött valaki"-t írt önmagától, és a jegyzékbe önmaga került.
  const hely = await ujKeszulek();
  const port = 7633;
  let orjarat = null;
  try {
    await fut(hely, 'koino', 'Sajat cim');
    await fut(hely, 'tars', '127.0.0.1', String(port));

    let kimenet = '';
    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', String(port)], {
      env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    orjarat.stdout.on('data', (d) => { kimenet += d; });
    await varj(9000);
    orjarat.kill(); orjarat = null;
    await varj(500);

    let kotesek = [];
    try { kotesek = JSON.parse(await readFile(join(hely, 'kotesek.json'), 'utf8')).kotesek; } catch { /* nincs */ }
    const sajat = JSON.parse(await readFile(join(hely, 'tabla-kulcs.json'), 'utf8'));
    return /nincs társ a listán/.test(kimenet) && !/bejött valaki/.test(kimenet)
      && !kotesek.some((k) => k.alairo === sajat.alairoNyilvanos);
  } finally {
    if (orjarat) orjarat.kill();
    await varj(300);
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ TERMUXBAN AZ ŐRJÁRAT MAGA KÉRI AZ ÉBREN TARTÁST — és kimondja, ha nem sikerül', async () => {
  // ⛔ A TEREPI HELYZET (42. mérés): a telefon körei a zsebben 15–20 percesek lettek. ⭐ Itt a
  // Termuxot a környezet jelzi, a `termux-wake-lock` parancs viszont NINCS a keresési úton —
  // tehát a kérésnek el kell buknia, és ezt ki kell mondania. Termuxon kívül meg sem próbálja.
  const hely = await ujKeszulek();
  const ures = await ujKeszulek();
  const futtat = async (env, port) => {
    let kimenet = '';
    const p = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', String(port)], {
      env, stdio: ['ignore', 'pipe', 'pipe']
    });
    p.stdout.on('data', (d) => { kimenet += d; });
    await varj(3000);
    p.kill();
    await varj(400);
    return kimenet;
  };
  try {
    await fut(hely, 'koino', 'Ebren');
    const alap = { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' };
    delete alap.TERMUX_VERSION;
    const termuxban = await futtat({ ...alap, TERMUX_VERSION: 'proba', PATH: ures, Path: ures }, 7637);
    const kivul = await futtat({ ...alap, PREFIX: '' }, 7638);
    return /Az ébren tartás nem sikerült/.test(termuxban)
      && !/ébren tartás/i.test(kivul);
  } finally {
    await rm(hely, { recursive: true, force: true });
    await rm(ures, { recursive: true, force: true });
  }
});

proba('⛔⛔ HA A RÉS MEGNYÍLIK, DE A CSERE RAJTA ELBUKIK, A NAPLÓ KIMONDJA — nem „rés sem nyílt"',
  async () => {
    // ⛔ MIT MÉR: a 40. mérésen a napló a megnyílt rés után azt írta, hogy „egyik rés sem
    // nyílt meg" — az összegző sor a sikeres CSERÉKET számolta, és a résen futó csere
    // hibáját az őrjárat eldobta. ⭐ Itt egy HAMIS társ a kopogásra visszaszól, de cserélni
    // nem hajlandó (mint egy régebbi változat, vagy akinek közben bezárult az ablaka).
    const hely = await ujKeszulek();
    const A = 7623;
    const hamis = createSocket('udp4');
    await new Promise((kesz) => hamis.bind(0, '127.0.0.1', kesz));
    hamis.on('message', (adat, felado) => {
      let u = {};
      try { u = JSON.parse(adat.toString('utf8')); } catch { return; }
      if (u.uzenet === 'KOPOG') {
        hamis.send(JSON.stringify({ uzenet: 'HALLAK', tol: 'hamis-tars' }), felado.port, felado.address);
      }
    });
    let orjarat = null;

    try {
      await fut(hely, 'koino', 'Buko res');
      await writeFile(join(hely, 'udpcimek.json'), JSON.stringify({
        cimek: [{ hoszt: '127.0.0.1', port: hamis.address().port, mikor: Date.now() }]
      }), 'utf8');

      let kimenet = '';
      orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(A)], {
        env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      orjarat.stdout.on('data', (d) => { kimenet += d; });

      // ⚠️ A résen a csere 10 mp várakozás után adja fel — ennyi kell, és egy kis ráhagyás.
      await varj(17000);

      return /rés nyílt \(127\.0\.0\.1:\d+\), de a csere a résen elbukott: A másik fél nem válaszol/.test(kimenet)
        && /1 rés nyílt meg, de a csere egyiken sem ment végig/.test(kimenet)
        && !/egyik rés sem nyílt meg/.test(kimenet);
    } finally {
      if (orjarat) orjarat.kill();
      hamis.close();
      await varj(700);
      await rm(hely, { recursive: true, force: true });
    }
  });

proba('⭐⭐ A KÖTÉS MEGSZÜLETIK A BULIN — a társ TÁBLA-KULCSA alatt, nem a címe alatt',
  async () => {
    // ⛔ MIT MÉR: a kötés-jegyzék a valódi üzemmódban épül-e. ⭐ És hogy a társat a
    // TÁBLA-KULCSA azonosítja — mert a cím az, ami holnap elromlik.
    // ⚠️ A bizonyíték a MÁSIK készülék lemezén van: az ő tábla-kulcsa szerepel-e nálunk.
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const A = 7463, B = 7464;
    let egyikOr = null, masikOr = null;

    try {
      await fut(egyik, 'koino', 'Kotes proba');
      const vitt = join(egyik, 'alap.jsonl');
      await fut(egyik, 'kivisz', vitt, 'mind');
      await fut(masik, 'behoz', vitt);

      const jegyzek = (hova, mihez) => writeFile(join(hova, 'udpcimek.json'),
        JSON.stringify({ cimek: [{ hoszt: '127.0.0.1', port: mihez, mikor: Date.now() }] }),
        'utf8');
      await jegyzek(egyik, B);
      await jegyzek(masik, A);

      egyikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(A)], {
        env: { ...process.env, KOINO_ADAT: egyik, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      masikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(B)], {
        env: { ...process.env, KOINO_ADAT: masik, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(14000);
      egyikOr.kill(); egyikOr = null;
      masikOr.kill(); masikOr = null;
      await varj(700);

      const olvas = async (hely, mit) => {
        try { return JSON.parse(await readFile(join(hely, mit), 'utf8')); } catch { return null; }
      };
      const egyikKulcs = await olvas(egyik, 'tabla-kulcs.json');
      const masikKulcs = await olvas(masik, 'tabla-kulcs.json');
      const egyikKotes = (await olvas(egyik, 'kotesek.json'))?.kotesek ?? [];
      const masikKotes = (await olvas(masik, 'kotesek.json'))?.kotesek ?? [];

      return !!egyikKulcs && !!masikKulcs
        // ⭐ MINDKETTŐ A MÁSIK TÁBLA-KULCSÁT JEGYEZTE FEL.
        && egyikKotes.some((k) => k.alairo === masikKulcs.alairoNyilvanos)
        && masikKotes.some((k) => k.alairo === egyikKulcs.alairoNyilvanos)
        // ⛔⛔ ÉS A TÁBLA-KULCS NEM AZ AZONOSSÁG: a mentett kulcs-fájlban semmi köze
        // a `kulcs.json`-hoz. *Ha valaki egyszer összevonná a kettőt, ez buktat.*
        && egyikKulcs.alairoNyilvanos
          !== (await olvas(egyik, 'kulcs.json'))?.nyilvanos
        // ⭐ És a cím is ott van, amire kopogni lehet.
        && egyikKotes.some((k) => k.hoszt === '127.0.0.1' && k.port === B);
    } finally {
      if (egyikOr) egyikOr.kill();
      if (masikOr) masikOr.kill();
      await varj(800);
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐⭐ A HIRDETŐTÁBLA BEKÖTÉSE (2026-09-20)
// ===================================
//
// ⛔⛔ MIT MÉR: hogy a `tabla` PARANCS tényleg kiír és kiolvas — vagyis hogy a réteg nem
// csak megépült, hanem a kéz el is éri (4. szabály). ⭐ És hogy a lánc VÉGIG megy: kulcs →
// közös titok → titkosítás → aláírás → DHT → vissza.
//
// ⚠️ HAMIS DHT-N, NEM AZ IGAZIN: egy próba, ami a valódi hálózatot hívná, a hálózat
// hangulatát mérné, nem a kódot. *Az igazi DHT-n külön terepmérés fut (37.).*

proba('⭐⭐⭐ A TÁBLA PARANCSA KIÍR ÉS KIOLVAS — a lánc végigmegy (hamis DHT-n)',
  async () => {
    const { hamisHalozat } = await import('./dhtProba.js');
    const { ujTablaKulcs, nyilvanosResz } = await import('../js/csere/tablaKulcs.js');

    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const halo = await hamisHalozat(12);

    try {
      // Két tábla-kulcs, és mindkét oldal ismeri a másikat — ez a KÖTÉS (kézi úton
      // felírva: a jegyzék sima JSON, 4. szabály).
      const egyikK = await ujTablaKulcs();
      const masikK = await ujTablaKulcs();
      await writeFile(join(egyik, 'tabla-kulcs.json'), JSON.stringify(egyikK), 'utf8');
      await writeFile(join(masik, 'tabla-kulcs.json'), JSON.stringify(masikK), 'utf8');

      const kotes = (mienk, ove) => JSON.stringify({
        kotesek: [{ ...nyilvanosResz(ove), hoszt: '10.0.0.1', port: 7373,
          utoljara: Date.now(), talalkozasok: 3, eloszor: Date.now() }]
      });
      await writeFile(join(egyik, 'kotesek.json'), kotes(egyikK, masikK), 'utf8');
      await writeFile(join(masik, 'kotesek.json'), kotes(masikK, egyikK), 'utf8');

      const belepo = halo.belepo(0);
      const kornyezet = { KOINO_DHT_BELEPOK: belepo };

      // (1) Az egyik KIÍRJA az új címét a másik rekeszébe.
      const kiiras = await fut(egyik, 'tabla', 'kiir', '203.0.113.7', '41777', kornyezet);
      // (2) A másik KIOLVASSA — és a címnek meg kell jelennie.
      const olvasas = await fut(masik, 'tabla', 'olvas', kornyezet);

      return /1 rekeszbe kiírva/.test(kiiras)
        && /203\.0\.113\.7:41777/.test(olvasas);
    } finally {
      halo.bezar();
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔ A „NINCS A TÁBLÁN" ÉS A „NEM ÉRTEM EL A TÁBLÁT" KÉT KÜLÖN DOLOG (40. mérés, 2026-09-24)
// ===================================
//
// ⛔ MIÉRT SZÜLETETT: terepen egy telefon mobilnet NÉLKÜL azt írta, hogy *„egy néma társ nincs
// a táblán"* — pedig egyetlen DHT-gép sem felelt neki. A társ közben kint volt (a másik
// telefon mindvégig megtalálta). *A felirat a hálózat hírét a társ hírének adta ki.*
//
// ⭐ A PRÓBA KÉT ÁGA, hogy ne legyen vak: egy NÉMA DHT-gép mellett a tábla „nem érhető el",
// egy ÉLŐ (hamis) DHT-n viszont, ahova senki nem írt, a társ tényleg „nincs a táblán".

async function nemaFoglalat() {
  // Hall, de soha nem felel — mint egy mobilnet nélküli telefonnak az egész internet.
  const halo = createSocket('udp4');
  await new Promise((kesz) => halo.bind(0, '127.0.0.1', kesz));
  return halo;
}

proba('⛔⛔ HA EGYETLEN DHT-GÉP SEM FELEL, A TÁBLA „NEM ÉRHETŐ EL" — nem „nincs rajta"',
  async () => {
    const { hamisHalozat } = await import('./dhtProba.js');
    const { ujTablaKulcs, nyilvanosResz } = await import('../js/csere/tablaKulcs.js');

    const hely = await ujKeszulek();
    const nema = await nemaFoglalat();
    const halo = await hamisHalozat(12);

    try {
      const sajat = await ujTablaKulcs();
      const tars = await ujTablaKulcs();
      await writeFile(join(hely, 'tabla-kulcs.json'), JSON.stringify(sajat), 'utf8');
      await writeFile(join(hely, 'kotesek.json'), JSON.stringify({
        kotesek: [{ ...nyilvanosResz(tars), hoszt: '10.0.0.1', port: 7373,
          utoljara: Date.now(), talalkozasok: 3, eloszor: Date.now() }]
      }), 'utf8');

      // (1) NÉMA háló: a kérdések kimennek, válasz nem jön.
      const nemaBan = await fut(hely, 'tabla', 'olvas',
        { KOINO_DHT_BELEPOK: '127.0.0.1:' + nema.address().port });
      // (2) ÉLŐ háló, üres rekesszel: itt a „nincs a táblán" az igazság.
      const eloben = await fut(hely, 'tabla', 'olvas', { KOINO_DHT_BELEPOK: halo.belepo(0) });

      return /NEM ÉRHETŐ EL/.test(nemaBan) && !/nincs a táblán/.test(nemaBan)
        && /nincs a táblán/.test(eloben) && !/NEM ÉRHETŐ EL/.test(eloben);
    } finally {
      nema.close();
      halo.bezar();
      await rm(hely, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔ AZ ŐRJÁRAT SZÓL, HA NEM TUDJA MEGMÉRNI A SAJÁT KÜLSŐ CÍMÉT (40. mérés, 2026-09-24)
// ===================================
//
// ⛔ MIÉRT SZÜLETETT: a mobilnet nélküli telefon nem tudta megmérni a külső címét, ezért nem
// írt ki új címet a táblára — a társ csak a RÉGIT találta meg. ⛔ És a napló erről egy szót
// sem szólt: a jelzés (`SAJAT-CIM-NEM-MEGY`) a fúróból kijött, az őrjárat eldobta.
//
// ⭐ A TÜKÖR ITT EGY NÉMA HELYI FOGLALAT (`KOINO_TUKOR`), tehát a próba nem a valódi hálózat
// hangulatát méri. ⚠️ A kopogás célja egy dokumentációs cím (192.0.2.1, RFC 5737): csak
// nem-helyi célnál mér a fúró külső címet — ez a feltétele, hogy a mérés egyáltalán
// elinduljon. A DHT kikapcsolva, a kötés FRISS (nem néma), így táblaolvasás sem indul.

proba('⛔⛔ AZ ŐRJÁRAT MEGNEVEZI, HA NEM TUDJA MEGMÉRNI A KÜLSŐ CÍMÉT — és csak egyszer',
  async () => {
    const { ujTablaKulcs, nyilvanosResz } = await import('../js/csere/tablaKulcs.js');

    const hely = await ujKeszulek();
    const tukor = await nemaFoglalat();
    let orjarat = null;

    try {
      await fut(hely, 'koino', 'Tukor proba');
      const tars = await ujTablaKulcs();
      await writeFile(join(hely, 'kotesek.json'), JSON.stringify({
        kotesek: [{ ...nyilvanosResz(tars), hoszt: '192.0.2.1', port: 7373,
          utoljara: Date.now(), talalkozasok: 3, eloszor: Date.now() }]
      }), 'utf8');

      let kimenet = '';
      orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', '7597'], {
        env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '',
          KOINO_TUKOR: '127.0.0.1:' + tukor.address().port, KOINO_DHT_BELEPOK: 'nincs' },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      orjarat.stdout.on('data', (d) => { kimenet += d; });

      // ⚠️ A tükör 5 mp-ig vár a válaszra, egy kör 6 mp — két-három kör elég, hogy kiderüljön,
      // hogy a sor MEGJELENIK, és hogy NEM ismétlődik körönként.
      await varj(20000);

      const sorok = kimenet.match(/nem tudom megmérni a saját külső címemet/g) ?? [];
      return sorok.length === 1 && /STUN-kiszolgáló nem válaszolt/.test(kimenet);
    } finally {
      if (orjarat) orjarat.kill();
      tukor.close();
      await varj(500);
      await rm(hely, { recursive: true, force: true });
    }
  });

proba('⭐⭐ A MEGISMERT DHT-GÉPEK ÁTKERÜLNEK A TÁRSHOZ (a belépő csak kurbli)',
  async () => {
    // ⛔ MIT MÉR: Csaba (c) döntését — a csere adjon át néhány DHT-gépet, hogy egy friss
    // telepítés az első buli után NE függjön a közismert belépőktől (36. mérés: ők
    // korlátoznak). ⭐ A bizonyíték a MÁSIK készülék lemezén van.
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const port = 7465;

    await fut(gazda, 'koino', 'Dht gep proba');

    // A gazda jegyzékébe kézzel írunk két gépet (a jegyzék sima JSON — 4. szabály).
    await writeFile(join(gazda, 'dht-csomopontok.json'), JSON.stringify([
      { cim: '203.0.113.50', port: 6881, id: 'aabb' },
      { cim: '203.0.113.51', port: 6882, id: 'ccdd' }
    ]), 'utf8');

    await csereKor(gazda, vendeg, port);

    let jegyzek = [];
    try {
      jegyzek = JSON.parse(await readFile(join(vendeg, 'dht-csomopontok.json'), 'utf8'));
    } catch { return false; }

    return jegyzek.some((g) => g.cim === '203.0.113.51' && g.port === 6882)
      // ⚠️ És a BEMONDOTT gépnek nincs `id`-je: az csak a saját megfigyelésünkből lehet.
      && jegyzek.every((g) => g.cim !== '203.0.113.51' || g.id === null);
  });

// ⛔⛔ ÉS A HARMADIK PRÓBA AZ ŐRJÁRATÉ — mert a fenti kettő NEM fedi le.
//
// *Ezt a saját rontás-próbám mutatta meg (2026-09-18): kivágtam az őrjárat hirdetését, és a
// fenti két próba ZÖLD maradt — mert azok a `figyel` parancsot használják, az pedig másik
// ág.* ⭐ Az őrjárat a „valódi üzemmód": ha ott nem terjed a cím, akkor élesben nem terjed.
//
// Ez a próba MINDKÉT irányt méri egy menetben: a vendég őrjárata megtanulja a gazda friss
// címét (a kör-ág beolvasztása), ÉS a gazda megtanulja a vendégét (a kör-ág hirdetése).
proba('⭐⭐⭐ AZ ŐRJÁRAT is terjeszti a friss címet — MINDKÉT irányban', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7453;
  let figyelo = null, orjarat = null;

  try {
    await fut(gazda, 'koino', 'Orjarat cim proba');

    // Mindkét készülék jegyzékébe egy-egy friss cím (a kézi út: sima JSON).
    await writeFile(join(gazda, 'udpcimek.json'), JSON.stringify({
      cimek: [{ hoszt: '198.51.100.11', port: 41011, mikor: Date.now() }]
    }), 'utf8');
    await writeFile(join(vendeg, 'udpcimek.json'), JSON.stringify({
      cimek: [{ hoszt: '198.51.100.22', port: 41022, mikor: Date.now() }]
    }), 'utf8');

    // A vendég ismerje a gazdát — az őrjárat a társ-listát járja körbe.
    await fut(vendeg, 'tars', '127.0.0.1', String(port), 'A gazda');

    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(1500);

    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.05', '7454'], {
      env: { ...process.env, KOINO_ADAT: vendeg, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(8000);                      // néhány kör: a 0,05 perc = 3 másodperces ütem
    orjarat.kill(); orjarat = null;
    figyelo.kill(); figyelo = null;
    await varj(1000);

    const jegyzek = async (hely) => {
      try {
        return JSON.parse(await readFile(join(hely, 'udpcimek.json'), 'utf8')).cimek ?? [];
      } catch { return []; }
    };
    const vendegE = await jegyzek(vendeg);
    const gazdaE = await jegyzek(gazda);

    // ⭐ A BIZONYÍTÉK: mindkét lemezen ott a MÁSIK címe. *Nem kiírás, hanem fájl.*
    return vendegE.some((c) => c.hoszt === '198.51.100.11')
      && gazdaE.some((c) => c.hoszt === '198.51.100.22');
  } finally {
    if (orjarat) orjarat.kill();
    if (figyelo) { figyelo.kill(); await varj(1000); }
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ⚠️ ÉS EGY NEGYEDIK, mert a harmadik SEM fedte le az őrjárat POSTALÁDA-ágát.
//
// *A rontás-próba megint pontosabb volt nálam: kivágtam az őrjárat postaláda-hirdetését, és
// a fenti három próba zöld maradt — mert ott az őrjárat a HÍVÓ, nem a fogadó.* ⭐ Itt tehát
// az őrjáratnak **nincs egyetlen társa sem** (a kör-ág el sem indul), és a másik készülék
// kopog be hozzá: így csak a postaláda-ág maradhat.
proba('⭐⭐ Az őrjárat POSTALÁDA-ága is hirdeti a friss címet', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  let orjarat = null;

  try {
    await fut(vendeg, 'koino', 'Postalada cim proba');
    await writeFile(join(vendeg, 'udpcimek.json'), JSON.stringify({
      cimek: [{ hoszt: '198.51.100.33', port: 41033, mikor: Date.now() }]
    }), 'utf8');

    // ⚠️ A vendégnek NINCS társa — tehát a kör-ág nem futhat, csak a kapu.
    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.05', '7455'], {
      env: { ...process.env, KOINO_ADAT: vendeg, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2000);
    await fut(gazda, 'csere', '127.0.0.1', '7455');
    await varj(1000);
    orjarat.kill(); orjarat = null;
    await varj(500);

    let jegyzek = [];
    try {
      jegyzek = JSON.parse(await readFile(join(gazda, 'udpcimek.json'), 'utf8')).cimek ?? [];
    } catch { return false; }
    return jegyzek.some((c) => c.hoszt === '198.51.100.33' && c.port === 41033);
  } finally {
    if (orjarat) orjarat.kill();
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ⭐⭐⭐ ÉS AZ ÖTÖDIK: A SAJÁT FRISS CÍMÜNK FELJEGYZÉSE — a rés két oldalán.
//
// ⛔ MIÉRT KELL KÜLÖN? Mert ez a jegyzék EGYETLEN valódi forrása: a többi bejegyzést
// másoktól kapjuk, ezt viszont MAGUNKRÓL tudjuk meg — és e nélkül a társ soha nem tudná
// meg, hova kopogjon nekünk. *A rontás-próba szerint eddig ezt sem mérte semmi.*
//
// ⚠️ A rés itt a hurok-címen nyílik (két folyamat, két helyi port) — NAT nélkül, tehát a
// „külső" cím a 127.0.0.1 lesz. A mérés tárgya nem a NAT, hanem hogy a `latlak`-ból tanult
// cím **a lemezre kerül-e**.
proba('⭐⭐⭐ A SAJÁT friss címünket a rés után feljegyezzük', async () => {
  const egyik = await ujKeszulek();
  const masik = await ujKeszulek();
  let a = null, b = null;

  // ⚠️⚠️ A FÚRÓK KIMENETÉT ELTESSZÜK (2026-09-21) — korábban `stdio: 'ignore'` volt, tehát
  // ha a próba bukott, **semmit nem tudtunk arról, mi történt a résen**. ⛔ És ez a próba
  // SZESZÉLYES: ugyanazon a kódon hol zöld, hol piros. *Egy néma bukás nem lelet, hanem
  // találgatásra hívás* — a 25. mérés tanulsága: a legrosszabb hiba a nem-esemény.
  const naplok = { a: '', b: '' };
  const figyel = (folyamat, kulcs) => {
    folyamat.stdout.on('data', (d) => { naplok[kulcs] += d; });
    folyamat.stderr.on('data', (d) => { naplok[kulcs] += d; });
  };

  try {
    await fut(egyik, 'koino', 'Res cim proba');

    a = spawn(process.execPath, [KOINO_JS, 'pajzsfuro', '127.0.0.1', '7457', '7456'], {
      env: { ...process.env, KOINO_ADAT: egyik, KOINO_NAPLO: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    figyel(a, 'a');
    b = spawn(process.execPath, [KOINO_JS, 'pajzsfuro', '127.0.0.1', '7456', '7457'], {
      env: { ...process.env, KOINO_ADAT: masik, KOINO_NAPLO: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    figyel(b, 'b');
    await varj(9000);                       // fúrás + csere + a fájl-randevú vége
    a.kill(); a = null; b.kill(); b = null;
    await varj(500);

    const jegyzek = async (hely) => {
      try {
        return JSON.parse(await readFile(join(hely, 'udpcimek.json'), 'utf8')).cimek ?? [];
      } catch { return []; }
    };
    // ⭐ Mindkét oldalnak fel kell jegyeznie, amit a MÁSIK látott belőle.
    const egyikE = await jegyzek(egyik);
    const masikE = await jegyzek(masik);
    const rendben = egyikE.some((c) => c.port === 7456) && masikE.some((c) => c.port === 7457);

    // ⚠️ ÉS HA BUKIK, MEGNEVEZI MAGÁT (D19): mi került a két jegyzékbe, és mit mondott a
    // két fúró. *Ebből derül ki, hogy a RÉS nem nyílt-e meg, vagy megnyílt, de a cím nem
    // jutott a lemezre — a kettő teljesen más hiba.*
    if (!rendben) {
      const rovid = (sz) => sz.replace(/\s+/g, ' ').trim().slice(-400);
      throw new Error('a saját friss cím nem került a lemezre — '
        + 'egyik jegyzéke: ' + JSON.stringify(egyikE) + ' · '
        + 'másik jegyzéke: ' + JSON.stringify(masikE)
        + ' ||| A fúró (egyik): ' + rovid(naplok.a)
        + ' ||| A fúró (másik): ' + rovid(naplok.b));
    }
    return true;
  } finally {
    if (a) a.kill();
    if (b) b.kill();
    await varj(500);
    await rm(egyik, { recursive: true, force: true });
    await rm(masik, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐⭐ A KÉZI ÚT AZ ÖSSZEVETÉSHEZ (2026-09-21)
// ===================================
//
// ⛔⛔ MIT MÉR, ÉS MIÉRT ÉPP PARANCSSORBÓL: az `elteresek` (osszehasonlitas.js) megépült,
// próba őrizte — és **egyetlen éles hívója sem volt**. Vagyis a parancs, ami azért van,
// hogy két készülék összevethesse magát, csak annyit mondott, hogy „nem egyezik"; azt
// nem, hogy MIBEN. *Ugyanaz az alak, mint a Szakasz 4-nél és a fájl-szállításnál: a
// réteg tudta, a kéz nem érte el.* ⭐ Ezért ez a próba NEM a függvényt hívja, hanem a
// PARANCSOT — külön folyamatban, két készülékkel, ahogy egy ember használná.

proba('⭐⭐⭐ ujjlenyomat kiment → osszevet: MEGNEVEZI az eltérést, csere után pedig egyezést mond',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const lap = join(egyik, 'lap.json');
    try {
      await fut(egyik, 'koino', 'Vizsga koinó');
      await fut(masik, 'koino', 'Vizsga koinó');

      // ⭐ Két KÜLÖNBÖZŐ gondolat a két gépen — tehát az `entitasok` szakasznak el KELL térnie.
      await fut(egyik, 'gondolat', 'CSAK AZ EGYIKEN');
      await fut(masik, 'gondolat', 'CSAK A MÁSIKON');

      await fut(egyik, 'ujjlenyomat', 'kiment', lap);
      const elteres = await fut(masik, 'ujjlenyomat', 'osszevet', lap);

      // ⛔ A LÉNYEG: nem elég, hogy nemet mond — meg kell NEVEZNIE a szakaszt.
      const megnevezte = elteres.includes('ELTÉRÜNK') && elteres.includes('entitasok');

      // ----- ÉS A MÁSIK IRÁNY: csere után UGYANAZT látjuk -----
      // ⚠️ Egy műszer, ami mindig eltérést kiált, ugyanolyan használhatatlan, mint
      // amelyik mindig egyezést. *A próba mindkét választ megköveteli.*
      await csereKor(egyik, masik, 7941);
      await fut(egyik, 'ujjlenyomat', 'kiment', lap);
      const egyezes = await fut(masik, 'ujjlenyomat', 'osszevet', lap);

      // ⛔ ÉS AZ ÁTÍRT LAP: a másik gépen sem „kicsit más állapot", hanem hiba.
      const atirt = join(egyik, 'lap-atirt.json');
      await writeFile(atirt,
        (await readFile(lap, 'utf8')).replace('CSAK AZ EGYIKEN', 'ÁTÍRT CÍM'), 'utf8');
      const hamis = await fut(masik, 'ujjlenyomat', 'osszevet', atirt);

      return megnevezte
        && egyezes.includes('UGYANAZT LÁTJUK')
        && hamis.includes('NEM a saját ujjlenyomatát');
    } finally {
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔⛔ AZ ELVESZETT ÍRÁS A TÁRS-LISTÁN (2026-09-22)
// ===================================

proba('⛔⛔ A KÖR ALATT TANULT CÍM TÚLÉLI A KÖR VÉGÉT — nincs elveszett írás', async () => {
  // ⛔ MIT MÉR, ÉS MIÉRT NEM MODUL-PRÓBA: az őrjárat a társ-listát a kör ELEJÉN olvasta
  // és a kör VÉGÉN írta ki egészben. Közben a **postaláda-ág** egy bekopogótól új címet
  // tanult — a kör végi írás azt **csendben elsöpörte**. ⭐ A két ág csak az ÉLES
  // őrjáratban fut egyszerre; modul-próbával ez elvileg sem fogható meg.
  //
  // ⭐⭐ ÉS VISELKEDÉST MÉR, NEM FELIRATOT: a napló a hibás kóddal is kiírta, hogy
  // „+1 cím" — a bizonyíték a **lemez**, vagyis hogy a cím a kör után is ott van.
  //
  // ⚠️ A KÖRT SZÁNDÉKOSAN LASSÍTJUK: egy nem válaszoló társ a listán 10 másodpercig
  // várat. *Enélkül a kör hamarabb lezárul, mint hogy a bekopogó megérkezne — és a
  // próba vakon zöld lenne.*
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  let orjarat = null;
  try {
    await fut(gazda, 'koino', 'Elveszett írás');
    await csereKor(gazda, vendeg, 7951);              // a vendég megismeri a koinót

    await fut(gazda, 'tars', '10.255.255.1', '7999', 'nema');   // ettől lassú a kör
    await fut(vendeg, 'tars', '10.9.9.9', '9999', 'hirdetett'); // ezt fogja hirdetni

    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.5', '7952'], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2500);                                  // a kör már fut, a némára vár
    await fut(vendeg, 'csere', '127.0.0.1', '7952');   // ⭐ bekopogunk KÖZBEN

    const tarsakat = async () => {
      try {
        const adat = JSON.parse(await readFile(join(gazda, 'tarsak.json'), 'utf8'));
        return (Array.isArray(adat) ? adat : (adat.tarsak ?? [])).map((t) => t.hoszt);
      } catch { return []; }
    };

    // ⚠️ ELŐBB A VAKSÁG-PRÓBA: ha meg sem tanulta, akkor nem ezt mértük.
    if (!(await tarsakat()).includes('10.9.9.9')) return false;

    await varj(12000);                                 // megvárjuk, hogy a kör LEZÁRULJON
    return (await tarsakat()).includes('10.9.9.9');    // ⭐ a bizonyíték: még ott van
  } finally {
    if (orjarat) orjarat.kill();
    await varj(500);
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ A BEMUTATKOZÁS KÖLCSÖNÖSSÉGE LÁTSZIK (D62, bekötve 2026-09-22)
// ===================================

proba('⭐⭐ A BEMUTATKOZÁS ÁLLÁSA LÁTSZIK: előbb FÜGGŐBEN, a válasz után KÖLCSÖNÖS',
  async () => {
    // ⛔ MIT MÉR: a `bemutatkozasok()` számítás **hét önpróbával** megépült, és a
    // `koino.js` nem importálta. A `bemutatkoz` parancs kiírta, hogy *„csak KÖLCSÖNÖSEN
    // számít"* — de hogy teljesült-e, azt semmi nem mondta meg.
    //
    // ⭐ A BIZONYÍTÉK KÉT KÉP KÜLÖNBSÉGE: ugyanaz a parancs, ugyanaz a készülék, és a
    // másik fél válasza után MÁS a válasz. *Egy szám, ami sosem változik, nem jelzés.*
    const anna = await ujKeszulek();
    const bela = await ujKeszulek();
    try {
      await fut(anna, 'koino', 'Bemutatkozás koinó');
      const annaHorgony = teljesAzonosito(await fut(anna, 'belep', 'alapitas'));
      const belaHorgony = teljesAzonosito(await fut(bela, 'belep'));
      if (!annaHorgony || !belaHorgony) return false;

      await csereKor(anna, bela, 7953);
      await fut(anna, 'meghiv', belaHorgony);
      await csereKor(anna, bela, 7954);

      // ----- 1. EGYOLDALÚ: Anna bemutatkozik, Béla még nem -----
      await fut(anna, 'bemutatkoz', belaHorgony);
      const egyoldaluan = await fut(anna, 'allapot');
      if (!/FÜGGŐBEN/.test(egyoldaluan)) return false;
      if (!/0 kölcsönös bemutatkozásod van/.test(egyoldaluan)) return false;
      // ⭐⭐ A KÉT IRÁNY KÜLÖN (2026-09-23): Annának nincs teendője, ő Bélára vár…
      if (!/1 FÜGGŐBEN, a másik félre vár/.test(egyoldaluan)) return false;
      if (/rád vár|viszonozd/.test(egyoldaluan)) return false;

      // …Bélánál viszont ugyanez RÁ vár, és a program megmondja, mit futtasson.
      await csereKor(anna, bela, 7956);
      const belanal = await fut(bela, 'allapot');
      if (!/1 FÜGGŐBEN, rád vár/.test(belanal)) return false;
      if (!belanal.includes('viszonozd: node koino/koino.js bemutatkoz ' + annaHorgony.slice(0, 8))) {
        return false;
      }

      // ----- 2. KÖLCSÖNÖS: Béla viszonozza — ⭐ épp a javasolt RÖVID horgonnyal -----
      await fut(bela, 'bemutatkoz', annaHorgony.slice(0, 8));
      await csereKor(bela, anna, 7955);

      const kolcsonosen = await fut(anna, 'allapot');
      // ⭐ A DÖNTŐ SOR: 1 kölcsönös, és a „függőben" eltűnt.
      return /1 kölcsönös bemutatkozásod van/.test(kolcsonosen)
        && !/FÜGGŐBEN/.test(kolcsonosen);
    } finally {
      await rm(anna, { recursive: true, force: true });
      await rm(bela, { recursive: true, force: true });
    }
  });

export default futtatas;

// Önállóan is futtatható: node koino/meres/parancssorProba.js
if (process.argv[1] && process.argv[1].endsWith('parancssorProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
