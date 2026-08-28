// koino/meres/naplo.js

// Felelősség: a napló elnémítása a próbák futtatása alatt.
//
// A koino minden metódusa naplóz (fejlesztői konvenció) — ez a böngésző konzoljában
// hasznos volt, a terminálban viszont elnyomná magát az eredményt. A napló nem tűnik el,
// csak alapból nem látszik:
//
//   KOINO_NAPLO=1 node koino/meres/mind.js
//
// ⚠️ MIÉRT KÜLÖN FÁJL? Mert a JavaScriptben az `import` sorok ELŐBB futnak le, mint a
// modul törzse. Ha az elnémítás a `mind.js` törzsében állna, a próba-fájlok betöltéskori
// naplója már kiömlött volna. Így viszont ez a modul fut le elsőként — elég, hogy a
// `mind.js` legelső importja legyen.

if (!process.env.KOINO_NAPLO) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}

/** Közvetlen kiírás a kimenetre — ezt az elnémítás nem érinti. */
export const kiir = (szoveg) => process.stdout.write(szoveg + '\n');
