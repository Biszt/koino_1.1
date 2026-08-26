// backend/models/kulonvalasResz.js

// ===================================
// KÜLÖNVÁLÁS AL-SÉMA (közös rész)
// ===================================
// Felelősség: EGYETLEN különválás-esemény leírása egy entitás szemszögéből —
//   „ki a testvér-ágam, és melyik döntés kapcsán váltunk szét".
// Használják: models/tartalom.js (később kategória / tartalomtípus is, ha odáig
//   kiterjesztjük — ezért van külön fájlban, a szerkesztoResz.js mintájára).
//
// ===== A FOGALOM =====
// Egy módosítási javaslat lezárásakor MINDKÉT oldal viheti magával, amit akart:
//   - a javaslatot ELFOGADTÁK → az ELLENZŐK válhatnak külön, a RÉGI tartalommal,
//   - a javaslatot ELVETETTÉK → a TÁMOGATÓK válhatnak külön, a MÓDOSÍTOTT tartalommal.
// A szándékot a szavazatra tett `kulonvalasIgeny` jelöli (lásd models/szavazat.js).
// Részletes modell és döntések: docs/fejlesztesi_terv.md „Különválás" szakaszai.
//
// ===== MIÉRT TÖMB, ÉS NEM EGYETLEN OBJEKTUM? =====
// Egy entitás ÉLETE SORÁN TÖBBSZÖR is szétválhat: a különvált ágra ugyanúgy lehet
// később javaslatot tenni, és az is szétválhat. Minden szétválás külön esemény,
// saját forrás-javaslattal és saját testvérrel. Ha most egyetlen objektumot
// tárolnánk, a második szétválás felülírná az elsőt — vagy adatbázis-átalakítás
// kellene hozzá. A tömb ezt előre megoldja: egy elemmel pontosan úgy viselkedik,
// mint egy objektum.
//
// ===== MINDKÉT OLDALRA RÁKERÜL =====
// A szétváláskor MINDKÉT entitás kap egy-egy ilyen bejegyzést, egymásra mutatva.
// Az `agSzerep` mondja meg, melyik oldalon állunk (lásd ott).

const mongoose = require('mongoose');

// ===================================
// AL-SÉMA DEFINIÁLÁSA
// ===================================
// _id: false → a beágyazott elemekhez ne generáljon külön _id-t (nincs rá szükség)
const kulonvalasResz = new mongoose.Schema({

  // ----- A TESTVÉR-ÁG -----
  // A másik entitás, amivel ez a szétválás összeköt. Ide mutat a kártya
  // „Másik ág" fülének entitás-hivatkozása.
  testverId: {
    reteg: 'tartalom',  // H6
    type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
    required: true                          // Testvér nélkül nincs értelme a bejegyzésnek
  },

  // ----- A TESTVÉR TÍPUSA -----
  // Polimorf: ma mindig 'Tartalom' (az első kör csak tartalomra terjed ki),
  // de a mező készen áll a kategória / tartalomtípus különválásra is.
  testverTipus: {
    reteg: 'tartalom',  // H6
    type: String,                                        // Szöveges típus
    enum: ['Tartalom', 'Kategoria', 'TartalomTipus'],    // Engedélyezett típusok
    default: 'Tartalom'                                  // Alapértelmezett: tartalom
  },

  // ----- MELYIK OLDALON ÁLLUNK -----
  //   'foag'      → ez az entitás a FŐÁG: ő tartotta meg az EREDETI azonosítót,
  //                 itt maradtak a tartózkodók és a passzív tudatpont-tulajdonosok.
  //   'kulonvalt' → ez az entitás a KÜLÖNVÁLT ág: a szétváláskor jött létre.
  // (9. döntés: az azonosító mindig a főágé — elfogadott javaslatnál tehát a RÉGI
  // tartalom kap új azonosítót, pedig tartalmilag ő a folytonos.)
  //
  // NYELVI SZABÁLY: sehol nem beszélünk „győztesről" és „vesztesről" — csak
  // főágról és különválókról. Senki nem veszít, csak külön útra lép.
  agSzerep: {
    reteg: 'tartalom',  // H6
    type: String,                      // Szöveges típus
    enum: ['foag', 'kulonvalt'],       // Csak e két érték engedélyezett
    required: true                     // Enélkül nem tudnánk, melyik oldalt nézzük
  },

  // ----- A KIVÁLTÓ JAVASLAT -----
  // Melyik módosítási javaslat lezárása hozta létre ezt a szétválást.
  // MINDIG ki van töltve — elvetett javaslatnál ez az egyetlen horgony, mert
  // olyankor egyezmény NEM születik (az egyezmény kizárólag elfogadott javaslat
  // eredménye). Az elvetett javaslat entitásként megmarad `Elvetve` státusszal.
  forrasJavaslatId: {
    reteg: 'tartalom',  // H6
    type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
    ref: 'Javaslat',                        // Referencia a Javaslat modellre
    required: true                          // Kötelező: mindig van kiváltó javaslat
  },

  // ----- A KIVÁLTÓ EGYEZMÉNY -----
  // Csak akkor van kitöltve, ha a javaslatot ELFOGADTÁK (ilyenkor születik egyezmény).
  // Elvetett javaslatnál null — ilyenkor a forrasJavaslatId a hivatkozási pont.
  forrasEgyezmenyId: {
    reteg: 'tartalom',  // H6
    type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
    ref: 'Egyezmeny',                       // Referencia az Egyezmeny modellre
    default: null                           // Alapértelmezett: nincs (elvetett ág)
  },

  // ----- A SZÉTVÁLÁS IDŐPONTJA -----
  // Mikor vált szét a két ág. A kártya „Másik ág" fülén ezt mutatjuk meg.
  kulonvalasIdeje: {
    reteg: 'tartalom',  // H6
    type: Date,          // Dátum típus
    default: Date.now    // Alapértelmezett: a bejegyzés keletkezésének ideje
  }

}, { _id: false });

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = kulonvalasResz;
