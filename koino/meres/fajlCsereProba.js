// koino/meres/fajlCsereProba.js — a KÉZI ÚT önpróbája (4. szabály)

// Mit bizonyít ez a lap?
//
// ⛔⛔ A 4. SZABÁLYT: *„Legyen mindig kézi út… Ha egy funkció csak online tud működni, az
// fojtópont."* A koinónak öt hálózati útja volt és egy sem kézi — itt azt mérjük, hogy
// mostantól **hálózat nélkül is átvihető egy esemény**, és hogy az átvitel **ellenőrzött**.
//
// ⭐⭐ ÉS A LEGFONTOSABBAT: hogy a FÁJL SEM KAP ENGEDÉKENYEBB KAPUT (3. szabály). Egy
// pendrive-ról jött esemény pontosan annyira gyanús, mint egy hálózatról jött — sőt,
// a fájlt bárki átírhatja egy szövegszerkesztővel, mielőtt odaadja. A hamisítványnak itt
// is el kell buknia, ugyanazon a kapun.

import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { kivitelSzovege, behozatalSzovegbol } from '../js/csere/fajlCsere.js';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A KÉZI ÚT — fájlba vinni, fájlból hozni (4. szabály)');

const KOINO = 'proba';

// ===================================
// SEGÉDEK
// ===================================

/** Eldobható tár egy e-emberrel. */
async function ujKoino(koino = KOINO) {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-fajl-'));
  const tar = await esemenyTarNyitasa(koino, mappa);
  const ki = await ujEember(koino);
  return { tar, ki };
}

/** Egy gondolat + a tudatpontja (enélkül nem is létezne — D14). */
async function gondolat(tar, ki, cim, pont = 100) {
  const e = await ki.tesz('GondolatLetrehozas', { cim, meret: 10, szulo: null });
  await esemenyMentese(tar, e);
  const p = await ki.tesz('TudatpontRendezes', { entitas: e.azonosito, pont });
  await esemenyMentese(tar, p);
  return e.azonosito;
}

// ===================================
// 1. AZ ÁTVITEL
// ===================================

proba('⭐⭐ A KÉZI ÚT: az egyik készülék kiviszi, a másik behozza — hálózat nélkül', async () => {
  const { tar: egyik, ki: anna } = await ujKoino();
  const azonosito = await gondolat(egyik, anna, 'Közös kút');

  const { tar: masik } = await ujKoino();          // ÜRES készülék, soha nem beszéltek
  const { szoveg, darab } = await kivitelSzovege(egyik, KOINO);
  const e = await behozatalSzovegbol(masik, KOINO, szoveg);

  // A másik készülék most már ismeri a gondolatot — pusztán egy fájlból.
  const nala = await koinoEsemenyei(masik, KOINO);
  return darab === 2 && e.uj === 2 && e.marMegvolt === 0
    && nala.some((x) => x.azonosito === azonosito);
});

proba('⭐ UGYANAZT a fájlt kétszer behozni nem csinál semmit (a duplikátum elnyelődik)', async () => {
  const { tar: egyik, ki: anna } = await ujKoino();
  await gondolat(egyik, anna, 'Kerítés');

  const { tar: masik } = await ujKoino();
  const { szoveg } = await kivitelSzovege(egyik, KOINO);

  const elso = await behozatalSzovegbol(masik, KOINO, szoveg);
  const masodik = await behozatalSzovegbol(masik, KOINO, szoveg);

  return elso.uj === 2 && masodik.uj === 0 && masodik.marMegvolt === 2;
});

// ===================================
// 2. ⛔⛔ A FÁJL SEM KAP ENGEDÉKENYEBB KAPUT (3. szabály)
// ===================================

proba('⛔⛔ A FÁJLBAN ÁTÍRT esemény ELBUKIK a kapun — a többi bemegy', async () => {
  const { tar: egyik, ki: anna } = await ujKoino();
  await gondolat(egyik, anna, 'Közös kút');

  const { tar: masik } = await ujKoino();
  const { szoveg } = await kivitelSzovege(egyik, KOINO);

  // ⚠️ Pontosan az, amit egy szövegszerkesztővel bárki megtehet: átírja a címet.
  const hamis = szoveg.replace('Közös kút', 'Közös kút MIENK');
  const e = await behozatalSzovegbol(masik, KOINO, hamis);

  // A meghamisított esemény elutasítva, a tudatpont-esemény (érintetlen) bement.
  return e.elutasitva.length === 1 && e.uj === 1
    && /lenyomat/.test(e.elutasitva[0].ok);
});

proba('⛔ MÁSIK KOINO eseményeit nem vesszük be — és megnevezzük, hányat (D19)', async () => {
  const { tar: idegenTar, ki: idegen } = await ujKoino('masik-koino');
  await gondolat(idegenTar, idegen, 'Idegen gondolat');

  const { tar: sajatTar } = await ujKoino();
  const { szoveg } = await kivitelSzovege(idegenTar, 'masik-koino');
  const e = await behozatalSzovegbol(sajatTar, KOINO, szoveg);

  // ⚠️ Nem elég, hogy „nem rontotta el az állapotot": be sem kerülhet a mappánkba,
  // különben egy hazug fél korlátlanul tölthetné a lemezünket (`csere.js`).
  return e.idegen === 2 && e.uj === 0 && (await koinoEsemenyei(sajatTar, KOINO)).length === 0;
});

proba('⭐ Egy ÉRTELMEZHETETLEN sor nem állítja meg a többit — megnevezve jelenik meg (D19)', async () => {
  const { tar: egyik, ki: anna } = await ujKoino();
  await gondolat(egyik, anna, 'Kerítés');

  const { tar: masik } = await ujKoino();
  const { szoveg } = await kivitelSzovege(egyik, KOINO);

  // Egy odakevert jegyzet-sor a fájl közepén — ez a valóságos eset, nem a kitalált.
  const sorok = szoveg.trimEnd().split('\n');
  const kevert = [sorok[0], 'ez itt egy jegyzet, nem esemény', sorok[1]].join('\n') + '\n';

  const e = await behozatalSzovegbol(masik, KOINO, kevert);
  return e.uj === 2 && e.hibasSorok.length === 1 && e.hibasSorok[0].sorszam === 2;
});

proba('⛔ Az ÜRES fájl nem hiba, csak nem történik semmi', async () => {
  const { tar } = await ujKoino();
  const e = await behozatalSzovegbol(tar, KOINO, '');
  return e.sorok === 0 && e.uj === 0 && e.hibasSorok.length === 0 && e.elutasitva.length === 0;
});

// ===================================
// 3. ⭐ EGY FORMÁTUM, NEM KETTŐ
// ===================================

proba('⭐⭐ A kivitel alakja BÁJTRA a tár alakja — a másolt esemenyek.jsonl behozható', async () => {
  const { tar: egyik, ki: anna } = await ujKoino();
  await gondolat(egyik, anna, 'Közös kút');

  const { szoveg } = await kivitelSzovege(egyik, KOINO);

  // ⛔⛔ A TÁR SAJÁT FÁJLJA, NYERSEN — és BÁJTRA összevetve. Ha a két alak elcsúszna (egy
  // behúzott JSON, egy fejléc-sor, egy más sorvég), a régi kézi út — az adat-fájl
  // lemásolása — **némán** megszűnne. Ezért nem elég azt mérni, hogy „működik".
  const nyers = await readFile(egyik.fajl, 'utf8');

  return nyers === szoveg && szoveg.endsWith('\n');
});

// ===================================
// 4. ⚠️ A HATÓKÖR — a 6. szabály miatt
// ===================================

proba('⭐ A SAJÁT LÁNC külön kivihető (a D21 újjáépítési magja)', async () => {
  const { tar, ki: anna } = await ujKoino();
  const bela = await ujEember(KOINO);

  await gondolat(tar, anna, 'Anna gondolata');
  const belae = await bela.tesz('GondolatLetrehozas', { cim: 'Béla gondolata', meret: 10, szulo: null });
  await esemenyMentese(tar, belae);

  const mind = await kivitelSzovege(tar, KOINO);
  const sajat = await kivitelSzovege(tar, KOINO, { hatokor: 'sajat', szerzo: anna.szerzo });

  // ⭐ A saját lánc KISEBB — és pontosan annyi, amennyit én írtam alá.
  return mind.darab === 3 && sajat.darab === 2 && sajat.bajt < mind.bajt
    && sajat.szoveg.trimEnd().split('\n')
      .every((s) => JSON.parse(s).szerzo === anna.szerzo);
});

proba('⭐ EGY ENTITÁS szelete külön kivihető', async () => {
  const { tar, ki: anna } = await ujKoino();
  const egyik = await gondolat(tar, anna, 'Közös kút');
  await gondolat(tar, anna, 'Kerítés');

  const szelet = await kivitelSzovege(tar, KOINO, { hatokor: egyik });

  // A létrehozás + a rá tett tudatpont: kettő, és MIND a kút szeletéhez tartozik.
  return szelet.darab === 2 && szelet.szoveg.trimEnd().split('\n')
    .every((s) => { const e = JSON.parse(s); return (e.entitas ?? e.azonosito) === egyik; });
});

proba('⛔ A „sajat" hatókör szerző NÉLKÜL megmondja, mi hiányzik — nem csendben üresel', async () => {
  const { tar } = await ujKoino();
  try {
    await kivitelSzovege(tar, KOINO, { hatokor: 'sajat' });
    return false;                                  // nem lett volna szabad idáig jutnia
  } catch (hiba) {
    return /kulcs|szerző/i.test(hiba.message);
  }
});

proba('⛔ ISMERETLEN azonosító hatókörnél ÜRES a kivitel — nem az egész tár', async () => {
  const { tar, ki: anna } = await ujKoino();
  await gondolat(tar, anna, 'Közös kút');

  // ⚠️ EZ A PRÓBA A CSENDES VISSZAESÉST FOGJA MEG: ha egy elgépelt azonosító „mindet"
  // jelentene, a 6. szabály szerinti szűkítés bármikor észrevétlenül kikapcsolódhatna.
  const semmi = await kivitelSzovege(tar, KOINO, { hatokor: 'nincs-ilyen-azonosito' });
  return semmi.darab === 0;
});

export default futtatas;

// Önállóan is futtatható: node koino/meres/fajlCsereProba.js
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('fajlCsereProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
