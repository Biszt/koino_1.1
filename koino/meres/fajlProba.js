// koino/meres/fajlProba.js — a TARTALOM-CÍMZETT FÁJLTÁR önpróbája (Szakasz 5 / 5.7)

// Mit bizonyít ez a lap?
//
// ⭐⭐ HOGY A NÉV MAGA A BIZONYÍTÉK. A koino a fájlt a **lenyomatával** nevezi meg, és
// olvasáskor **újra lenyomatolja** — ha nem egyezik, nem adja ki. *A csatornát nem kell
// megbízhatóvá tenni* (3. szabály): ma ez a lemez, holnap a hálózat.
//
// ⛔ ÉS HOGY A TÍPUS A BÁJTOKBÓL JÖN, nem a kliens szavából. Ha a lap mondhatná meg,
// valaki HTML-t tölthetne fel `text/html`-ként, és a koino **a saját origin-jéről**
// szolgálná ki — vagyis a feltöltött kód hozzáférne mindenhez, amit a lap elér.

import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fajlBlobTarolo, fajlTipus, FAJL_KORLAT } from '../js/tar/fajlTar.js';
import { bajtLenyomat } from '../js/esemeny/kanonikusAlak.js';

import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A FÁJLTÁR — tartalom-címzett (Szakasz 5 / 5.7)');

const KOINO = 'proba';

/** Eldobható fájltár. */
async function ujTar() {
  const hely = await mkdtemp(join(tmpdir(), 'koino-fajl-'));
  return { hely, tar: fajlBlobTarolo(KOINO, hely) };
}

/** Egy valódi, érvényes 1×1 PNG. */
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

// ===================================
// 1. ⭐ A NÉV A LENYOMAT
// ===================================

proba('⭐⭐ A fájl NEVE a lenyomata — és visszaolvasva ugyanazok a bájtok', async () => {
  const { tar } = await ujTar();
  const { lenyomat, meret } = await tar.ir(PNG);

  // ⭐ A név nem véletlen azonosító: a TARTALOMBÓL számolható, bárki által.
  const magunktol = await bajtLenyomat(PNG);

  const vissza = await tar.olvas(lenyomat);
  return lenyomat === magunktol && meret === PNG.length
    && vissza !== null && Buffer.from(vissza).equals(Buffer.from(PNG));
});

proba('⭐ UGYANAZ a tartalom kétszer = EGY fájl a lemezen (a duplikátum elnyelődik)', async () => {
  const { tar } = await ujTar();
  const a = await tar.ir(PNG);
  const b = await tar.ir(PNG);

  // ⭐ Ugyanaz az érv, mint az `esemenyMentese`-nél: azonos név = azonos tartalom.
  return a.lenyomat === b.lenyomat && a.mar === false && b.mar === true
    && (await tar.lista()).length === 1;
});

proba('⛔ Egy MÁSIK tartalom MÁSIK nevet kap (egyetlen bájt is elég)', async () => {
  const { tar } = await ujTar();
  const masik = new Uint8Array(PNG);
  masik[masik.length - 1] ^= 0xff;                   // egyetlen bájt

  const a = await tar.ir(PNG);
  const b = await tar.ir(masik);
  return a.lenyomat !== b.lenyomat && (await tar.lista()).length === 2;
});

// ===================================
// 2. ⛔⛔ AZ ELLENŐRZÉS — a lap legfontosabb próbája
// ===================================

proba('⛔⛔ A MEGRONTOTT fájlt NEM adja ki — a név már nem illik a tartalomra', async () => {
  const { hely, tar } = await ujTar();
  const { lenyomat } = await tar.ir(PNG);

  // ⚠️ Ez ma a lemez romlása; holnap ugyanez lesz a HÁLÓZATRÓL jött hamisítvány.
  const ut = join(hely, KOINO, 'fajlok', lenyomat);
  await writeFile(ut, Buffer.concat([Buffer.from(await readFile(ut)), Buffer.from('ROMLOTT')]));

  // ⛔ A `van` még igazat mond (ott a fájl), de az `olvas` nem adja ki.
  return (await tar.van(lenyomat)) === true && (await tar.olvas(lenyomat)) === null;
});

proba('⛔ ISMERETLEN lenyomat: null, nem hiba (D19 — hiány, nem vád)', async () => {
  const { tar } = await ujTar();
  return (await tar.olvas('A'.repeat(43))) === null && (await tar.van('A'.repeat(43))) === false;
});

// ⛔⛔ EGY 43 KARAKTER HOSSZÚ, DE ÉRVÉNYTELEN NÉV — ez buktatta le a részleges fájl őrét.
// ⚠️ Pontosan 43, mert a régi őr CSAK A HOSSZT nézte; az alábbi lista minden más eleme
// „rossz hosszú" volt, ezért a rés fölött mind átment.
const HOSSZU_DE_ROSSZ = '../'.repeat(12) + 'kulcsok';        // 43 karakter

proba('⛔⛔ ÉRVÉNYTELEN lenyomat-alak ELAKAD — az útvonal-támadás ellen', async () => {
  const { tar } = await ujTar();
  // ⚠️ A név KÍVÜLRŐL is jön (a lap kéri le), tehát a `..` és a `/` nem csúszhat át.
  const rosszak = ['../../kulcs.json', 'a/b', '..', '', 'rovid', 'A'.repeat(44), HOSSZU_DE_ROSSZ];
  if (HOSSZU_DE_ROSSZ.length !== 43) return false;    // ⚠️ a próba maga is mérhető legyen

  for (const rossz of rosszak) {
    try {
      await tar.olvas(rossz);
      return false;                                  // nem lett volna szabad idáig jutnia
    } catch (hiba) {
      if (!/lenyomat/i.test(hiba.message)) return false;
    }
  }
  return true;
});

proba('⛔⛔⛔ A RÉSZLEGES FÁJL NÉGY MŰVELETE IS ELAKAD a rossz néven — nem csak az `olvas`',
  async () => {
    // ⚠️⚠️ EZT A PRÓBÁT EGY ÁTNÉZÉS KÉNYSZERÍTETTE KI (2026-09-13). A `reszlegesUtja` csak
    // a HOSSZT nézte, a mintát nem — így a 43 karakteres `../…/kulcsok` átcsúszott, és a
    // `reszlegesHozzafuz` `mkdir` + `appendFile`-lal **írt is volna** a mappán kívülre.
    // ⭐ Nem volt elérhető (a `fajlIgeny.js` mintája horgonyzott), de az őr mást mondott,
    // mint amit tett. *A próba azért kell, hogy a rés ne nyílhasson újra észrevétlenül.*
    const { tar } = await ujTar();

    // ⛔ Mind a NÉGY részleges művelet — a takarítás (`reszlegesEldobas`) is, mert a
    // hallgatólagos `catch` ott is elnyelné a hibát, ha a név belül ellenőrződne (D19).
    const muveletek = [
      () => tar.reszlegesMeret(HOSSZU_DE_ROSSZ),
      () => tar.reszlegesHozzafuz(HOSSZU_DE_ROSSZ, new Uint8Array([1, 2, 3])),
      () => tar.reszlegesLezaras(HOSSZU_DE_ROSSZ),
      () => tar.reszlegesEldobas(HOSSZU_DE_ROSSZ)
    ];

    for (const muvelet of muveletek) {
      try {
        await muvelet();
        return false;                                // ⛔ némán átment: ez volt a rés
      } catch (hiba) {
        if (!/lenyomat/i.test(hiba.message)) return false;
      }
    }
    return true;
  });

proba('⭐ …és az ÉRVÉNYES néven a részleges út továbbra is megy (a próba nem mindenre mond nemet)',
  async () => {
    // ⚠️ A fenti próba önmagában akkor is zöld lenne, ha MINDEN nevet elutasítanánk.
    // Ez a párja méri, hogy a szigorítás a jó nevet nem fogta meg.
    const { tar } = await ujTar();
    const lenyomat = await bajtLenyomat(PNG);

    const eleje = PNG.subarray(0, 30);
    const vege = PNG.subarray(30);

    if ((await tar.reszlegesMeret(lenyomat)) !== 0) return false;
    await tar.reszlegesHozzafuz(lenyomat, eleje);
    if ((await tar.reszlegesMeret(lenyomat)) !== eleje.length) return false;
    await tar.reszlegesHozzafuz(lenyomat, vege);

    const lezaras = await tar.reszlegesLezaras(lenyomat);
    const vissza = await tar.olvas(lenyomat);
    return lezaras.rendben === true
      && vissza !== null && Buffer.from(vissza).equals(Buffer.from(PNG));
  });

proba('⛔ A TÚL NAGY fájl elakad — és megmondja, mekkora a határ', async () => {
  const { tar } = await ujTar();
  try {
    await tar.ir(new Uint8Array(FAJL_KORLAT + 1));
    return false;
  } catch (hiba) {
    return /túl nagy/i.test(hiba.message) && hiba.message.includes(String(FAJL_KORLAT));
  }
});

// ===================================
// 3. ⛔⛔ A TÍPUS A BÁJTOKBÓL
// ===================================

proba('⭐ A képtípus a BÁJTOKBÓL derül ki, nem a kliens szavából', async () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
  const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  return fajlTipus(PNG) === 'image/png'
    && fajlTipus(jpeg) === 'image/jpeg'
    && fajlTipus(gif) === 'image/gif';
});

proba('⛔⛔ HTML-t nem szolgálunk ki `text/html`-ként — ez XSS lenne a saját origin-ünkön',
  async () => {
    const html = new TextEncoder().encode('<script>alert(1)</script>');
    // ⭐ Ismeretlen alak → letöltendő bináris. A `nosniff` fejléccel együtt ez azt jelenti,
    // hogy a böngésző SEM fogja futtatni.
    return fajlTipus(html) === 'application/octet-stream';
  });

proba('⛔ Az ÜRES fájl sem lesz semmiféle képtípus', async () => {
  return fajlTipus(new Uint8Array(0)) === 'application/octet-stream';
});

export default futtatas;

// Önállóan is futtatható: node koino/meres/fajlProba.js
if (process.argv[1] && process.argv[1].endsWith('fajlProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
