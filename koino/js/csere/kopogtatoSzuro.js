// koino/js/csere/kopogtatoSzuro.js

// Felelősség: ⭐⭐ M3 (a) — A KOPOGTATÓK KUDARC-SZÁMLÁLÓJA (a belépő megtalálása; docs/belepo_megtalalasa_atvizsgalas.md 4., 7.).
//
// ⛔ A LELET (2026-11-04 terep, 87. mérés): a BEP 5 témákon (a készülék kopogtató témája, a hirdetett témák párjai, a kereső-régió)
// a DHT szinte csak ZAJT ad — a bejelentést figyelő gépek bármilyen témára a saját címüket adják vissza, és a meghívó minden körben
// ezekre is kopogott (a „kérő vár rám” is őket számolta). ⭐ B3 (Csaba, 2026-11-04 — a mérés után: „csak a kudarc-számláló”): amelyik
// kopogtató címen 3 egymás utáni kör után sem nyílik rés, azt 6 óráig nem hívjuk, és a „kérő vár rám” sem számolja.
//
// ⚠️ A meghívó rekeszéből (M8 — BEP 44, a meghívó titkával aláírt és titkosított) jött cím NEM esik a számláló alá: azt a belépő
// maga írta ki, és ha épp nem érhető el (alszik, hálózatot vált), napokig is keresni kell (a meghívó egy hónapig él). Ha egy
// tiltott cím a rekeszből újra jön, a tiltás feloldódik.
//
// A kopogtatók jegyzéke a hívóé (a munka-állapot \`kopogtatok\` térképe: „cím:port” → { cim, port, lejar, forras, kudarc }); itt csak
// a könyvelés tiszta része van. A tiltások jegyzéke korlátos (9. szabály). Hálózatot nem importál. Használja: koino.js, a próbák.

/** Ennyi egymás utáni sikertelen kör után tiltjuk a kopogtató címet. */
export const KOPOGTATO_KUDARC_HATAR = 3;
/** Ennyi ideig nem hívjuk a tiltott címet. */
export const KOPOGTATO_TILTAS = 6 * 3600 * 1000;
/** Legfeljebb ennyi tiltott címet jegyzünk (a legrégebben lejáró esik ki). */
export const TILTAS_KORLAT = 1024;

/** A rekeszből (M8) jött cím forrása — a számláló nem vonatkozik rá. */
export const REKESZ_FORRAS = 'rekesz';

/**
 * Tiltott-e most a cím (a lejárt tiltást közben kitakarítja).
 * @param {Map<string, number>} tiltott - „cím:port” → a tiltás vége
 * @param {string} kulcs
 * @param {number} most
 */
export function tiltottE(tiltott, kulcs, most) {
  const vege = tiltott.get(kulcs);
  if (vege === undefined) return false;
  if (vege <= most) { tiltott.delete(kulcs); return false; }
  return true;
}

/**
 * Egy kopogtató felvétele vagy frissítése (a DHT-ról újra jött cím a kudarc-számlálóját megtartja — különben a 20 percenkénti
 * ránézés mindig nullázná). A tiltott, nem rekeszből jött címet nem veszi fel.
 * @param {Map<string, Object>} kopogtatok
 * @param {Map<string, number>} tiltott
 * @param {{cim: string, port: number, lejar: number, forras?: string}} k
 * @param {number} most
 * @returns {'uj'|'frissitve'|'tiltott'}
 */
export function kopogtatoFelvetele(kopogtatok, tiltott, { cim, port, lejar, forras = 'dht' }, most) {
  const kulcs = cim + ':' + port;
  if (forras === REKESZ_FORRAS) tiltott.delete(kulcs);
  else if (tiltottE(tiltott, kulcs, most)) return 'tiltott';
  const regi = kopogtatok.get(kulcs);
  // a rekesz forrása erősebb: ha egyszer onnan jött, onnan is marad (a számláló nem vonatkozik rá)
  const f = regi?.forras === REKESZ_FORRAS ? REKESZ_FORRAS : forras;
  kopogtatok.set(kulcs, { cim, port, lejar: Math.max(lejar, regi?.lejar ?? 0), forras: f, kudarc: f === REKESZ_FORRAS ? 0 : regi?.kudarc ?? 0 });
  return regi ? 'frissitve' : 'uj';
}

/**
 * ⭐ A kör első menetének eredményei a kopogtatókra: a sikeres cím számlálója nullázódik, a sikertelené nő; aki eléri a határt, kiesik
 * a kopogtatók közül, és 6 órára tiltott lesz. A kihagyott cím (a társat másik címén értük el) nem megfigyelés.
 * @param {Map<string, Object>} kopogtatok
 * @param {Map<string, number>} tiltott
 * @param {Array<{cel?: {cim: string, port: number}, ok?: boolean, kihagyva?: boolean}>} eredmenyek
 * @param {number} most
 * @returns {Array<string>} az újonnan tiltott címek
 */
export function kopogtatoEredmenyek(kopogtatok, tiltott, eredmenyek, most) {
  const tiltva = [];
  for (const e of eredmenyek ?? []) {
    if (!e?.cel || e.kihagyva) continue;
    const kulcs = e.cel.cim + ':' + e.cel.port;
    const k = kopogtatok.get(kulcs);
    if (!k || k.forras === REKESZ_FORRAS) continue;
    if (e.ok) { k.kudarc = 0; continue; }
    k.kudarc = (k.kudarc ?? 0) + 1;
    if (k.kudarc >= KOPOGTATO_KUDARC_HATAR) {
      kopogtatok.delete(kulcs);
      tiltott.set(kulcs, most + KOPOGTATO_TILTAS);
      tiltva.push(kulcs);
    }
  }
  // korlátos: a legkorábban lejáró tiltás esik ki
  if (tiltott.size > TILTAS_KORLAT) {
    const sor = [...tiltott.entries()].sort((a, b) => a[1] - b[1]);
    for (const [kulcs] of sor.slice(0, tiltott.size - TILTAS_KORLAT)) tiltott.delete(kulcs);
  }
  return tiltva;
}
