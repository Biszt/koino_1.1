// backend/utils/emailTokenHelper.js

// =============================================
// E-MAIL TOKEN SEGÉD — véletlen token előállítása és lenyomatolása
// =============================================
//
// Felelősség: a levélbe kerülő, egyszer használatos hivatkozás-tokenek technikai
// kezelése. Két függvény, mindkettő a Node beépített `crypto` moduljával dolgozik
// (nincs hozzá új npm csomag).
//
// ===== MIÉRT ÍGY =====
// A tokennek KITALÁLHATATLANNAK kell lennie, mert aki eltalálja, az idegen fiókba
// léphet be (jelszó-helyreállításnál) vagy idegen címet igazolhat. Ezért:
//
//  - 32 bájt VALÓDI VÉLETLEN a `crypto.randomBytes`-ból. Ez kriptográfiai minőségű
//    forrás — NEM a Math.random(), ami kiszámítható és sosem való biztonsági célra.
//    32 bájt = 256 bit: ennyi lehetőséget végigpróbálni gyakorlatilag lehetetlen.
//  - `base64url` kódolás: a sima base64 tartalmaz `+`, `/` és `=` karaktereket, amiket
//    az URL-ben külön kódolni kellene (és a levelezőprogramok elronthatnák a linket).
//    A base64url ezeket `-` és `_` karakterekre cseréli, a `=` kitöltést elhagyja.
//  - Tároláskor SHA-256 lenyomat (lásd models/emailToken.js magyarázatát).
//
// Használják: emailMegerositesService (2. lépés), jelszoHelyreallitasService (3. lépés)
// =============================================

const crypto = require('crypto');

// ===== ÚJ TOKEN ELŐÁLLÍTÁSA =====
// Visszaad egy nyers tokent (ez megy a levélbe) és a lenyomatát (ez megy az adatbázisba).
// A nyers tokent SEHOL nem tároljuk és nem naplózzuk — a kiküldés után elvész.
// @returns {Object} { token, tokenHash }
function ujToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: lenyomat(token) };
}

// ===== EGY TOKEN LENYOMATA =====
// Beváltáskor a beérkező nyers tokenre hívjuk, és a kapott lenyomattal keresünk
// az adatbázisban.
// @param {string} token - a nyers token
// @returns {string} SHA-256 lenyomat hexadecimálisan
function lenyomat(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// ===== LEJÁRATI IDŐPONT SZÁMÍTÁSA =====
// @param {number} percek - hány perc múlva járjon le
// @returns {Date} a lejárat időpontja
function lejaratPercMulva(percek) {
  return new Date(Date.now() + percek * 60 * 1000);
}

// ===== EXPORTÁLÁS =====
module.exports = { ujToken, lenyomat, lejaratPercMulva };
