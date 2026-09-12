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
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  return new Promise((teljesul, elakad) => {
    execFile(
      process.execPath, [KOINO_JS, ...ervek],
      { env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '' }, timeout: 30000 },
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

export default futtatas;

// Önállóan is futtatható: node koino/meres/parancssorProba.js
if (process.argv[1] && process.argv[1].endsWith('parancssorProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
