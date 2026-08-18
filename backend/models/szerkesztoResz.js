// backend/models/szerkesztoResz.js

// ===================================
// SZERKESZTŐ AL-SÉMA (közös rész)
// ===================================
// Felelősség: egyetlen szerkesztő-bejegyzés szerkezetének leírása egy entitáson
//   (tartalom / kategória / tartalomtípus).
// Használják: models/tartalom.js, models/kategoria.js, models/tartalomTipus.js
//
// Miért közös fájl? Mert három modell is UGYANEZT a szerkezetet használja,
// és ha külön-külön másolnánk be, a másolatok idővel szétcsúszhatnának.
// Egy forrás → mindhárom modell ugyanazt kapja.
//
// Fogalom: egy entitásnak TÖBB szerkesztője lehet:
//   - az eredeti létrehozó, ÉS
//   - mindenki, akinek elfogadott MÓDOSÍTÁSI javaslata ténylegesen módosította az entitást.

const mongoose = require('mongoose');

// ===================================
// AL-SÉMA DEFINIÁLÁSA
// ===================================
// _id: false → a beágyazott elemekhez ne generáljon külön _id-t (nincs rá szükség)
const szerkesztoResz = new mongoose.Schema({

  // ----- AZ E-EMBER -----
  // Ki ez a szerkesztő. null = TÖRÖLT e-ember (az entitás közösségi, megmarad).
  eemberId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    ref: 'eEmber',                         // Referencia az eEmber modellre
    default: null                          // null = törölt e-ember
  },

  // ----- ÁLLAPOT (a név színe ebből jön) -----
  // Hogyan szavazott ez a szerkesztő az UTOLJÁRA elfogadott módosításnál:
  //   Tamogatja    → zöld  (támogatta a módosítást)
  //   Ellenzi      → piros (ellenezte a módosítást)
  //   Tartozkodik  → fekete (tartózkodott)
  //   NemSzavazott → fekete (nem vett részt a szavazáson)
  // A Tartozkodik és a NemSzavazott KÜLÖN tárolódik (későbbi finomításhoz),
  // de a megjelenítésben mindkettő fekete.
  allapot: {
    type: String,                                              // Szöveges típus
    enum: ['Tamogatja', 'Ellenzi', 'Tartozkodik', 'NemSzavazott'],
    default: 'Tamogatja'                                       // Alap: támogatja (pl. a friss létrehozó)
  },

  // ----- EREDETI LÉTREHOZÓ JELÖLŐ -----
  // true = ez az e-ember hozta létre eredetileg az entitást.
  // Miért kell külön jelölő? Mert a lista sorrendje idővel átrendeződik
  // (a legutolsó szerkesztő kerül a 0. helyre), így pusztán a pozícióból
  // nem lehetne megbízhatóan megmondani, ki az eredeti létrehozó — pedig
  // a KÖZVETLEN szerkesztési jog (PATCH) csak őt illeti meg.
  eredeti: {
    type: Boolean,   // Igaz/hamis típus
    default: false   // Alap: nem az eredeti létrehozó
  }

}, { _id: false });

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = szerkesztoResz;
