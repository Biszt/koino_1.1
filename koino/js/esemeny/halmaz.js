// koino/js/esemeny/halmaz.js

// Felelősség: AZ AZONOSÍTÓ-HALMAZ — a rendezése és a lenyomata EGYETLEN helyen (D73, D74).
//
// ===== ⭐ MIÉRT KÜLÖN FÁJL =====
//
// Két hely számol ugyanarról a halmazról lenyomatot: a tár (`szeletLenyomata` — egy szelet
// összes eseménye) és a tartomány-egyeztetés (`csere/tartomany.js` — a szelet egy tartománya).
// Ha a kettő külön írná le a szabályt, egy nap némán szétcsúszna: a teljes tartomány lenyomata
// nem egyezne a szeletével, és két gép, ami ugyanazt tudja, eltérést látna. *(Két sorrend, amelyek
// egymás tükörképei, EGY forrásból jöjjenek — ez a tanulság már egyszer megtérült.)*
//
// ===== A SZABÁLY =====
//
// · A halmaz az azonosítók ismétlés nélküli, RENDEZETT listája. A rendezés a JavaScript
//   alapértelmezett összehasonlítása (UTF-16 kódegységek szerint) — az azonosítók base64url
//   jelek (ASCII), tehát ez bájt-sorrend is, és minden gépen ugyanaz.
// · ⭐ A lenyomat (D74): a rendezett lista KANONIKUS lenyomata — egy hash, nem összeg. Ütközést
//   csak a hash feltörésével lehetne gyártani; az összeadó lenyomatnál egy sok eseményt aláíró fél
//   kiszámíthatna két különböző halmazt ugyanazzal az összeggel.
//
// Használják: tar/fajlTar.js (szeletLenyomata), csere/tartomany.js.

import { lenyomat } from './kanonikusAlak.js';

/**
 * Azonosítókból rendezett, ismétlés nélküli halmaz.
 * @param {Iterable<string>} azonositok
 * @returns {Array<string>}
 */
export function rendezettHalmaz(azonositok) {
  return [...new Set(azonositok)].sort();
}

/**
 * Egy RENDEZETT halmaz lenyomata (43 karakter). ⚠️ A bemenetnek már rendezettnek és ismétlés
 * nélkülinek kell lennie (`rendezettHalmaz`) — a hívók egy rendezett lista szeleteit adják, és a
 * rendezés itt O(n log n) munka volna minden tartományra.
 * @param {Array<string>} rendezett
 * @returns {Promise<string>}
 */
export function halmazLenyomata(rendezett) {
  return lenyomat(rendezett);
}
