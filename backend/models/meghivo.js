// backend/models/meghivo.js

// Felelősség: a MEGHÍVÓ entitás Mongoose sémája.
// A meghívásos regisztráció (bizalmi háló v1) alapja: egy meglévő e-ember
// meghívót bocsát ki, és ezzel TANÚSÍTJA, hogy a meghívott valódi, még nem
// regisztrált személy. A meghívó kódját a kibocsátó maga juttatja el a
// meghívottnak (a rendszer nem tárol adatot a még nem regisztrált személyről!).
// V1-DÖNTÉS (2026-07-18, Csaba): NINCS darabszám-korlát és NINCS lejárat —
// a korlátozás később közösségi döntés tárgya lehet (fazis2 N4).
// Használják: meghivoRepository, meghivoService, eemberService (regisztráció).

// ===== MONGOOSE IMPORTÁLÁSA =====
const mongoose = require('mongoose');

// ===== MEGHÍVÓ SÉMA DEFINIÁLÁSA =====
const meghivoSchema = new mongoose.Schema({

  // ----- KIBOCSÁTÓ E-EMBER -----
  // Aki a meghívót létrehozta — ő a tanúsító is (bizalmi gráf első éle)
  kibocsatoEemberId: {
    type: mongoose.Schema.Types.ObjectId,  // Hivatkozás egy e-emberre
    ref: 'eEmber',                          // Az eEmber kollekcióra mutat
    required: true                          // Kötelező: meghívó nincs kibocsátó nélkül
  },

  // ----- MEGHÍVÓ KÓD -----
  // Egyedi, véletlen kód (formátum: XXXX-XXXX-XXXX), ezt adja meg a
  // regisztráló. A kódot a meghivoService generálja.
  kod: {
    type: String,
    required: true,
    unique: true,       // Két meghívónak nem lehet azonos kódja
    uppercase: true,    // Egységesen nagybetűs tárolás (a regisztráló kis betűvel is beírhatja)
    trim: true
  },

  // ----- TANÚSÍTÁS -----
  // A kibocsátó nyilatkozata a létrehozáskor: „a meghívott valódi személy,
  // és tudtommal még nem regisztrált". Kötelezően true — a service enélkül
  // nem enged meghívót létrehozni (D1 döntés: a meghívás = tanúsítás v1-ben).
  tanusitva: {
    type: Boolean,
    required: true
  },

  // ----- STÁTUSZ -----
  // Aktiv:       kiadott, még felhasználható kód
  // Felhasznalt: valaki ezzel a kóddal már regisztrált
  // Visszavont:  a kibocsátó felhasználás előtt visszavonta (pl. rossz kézbe került)
  statusz: {
    type: String,
    enum: {
      values: ['Aktiv', 'Felhasznalt', 'Visszavont'],
      message: 'Érvénytelen meghívó státusz: {VALUE}'
    },
    default: 'Aktiv'
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  letrehozva: {
    type: Date,
    default: Date.now
  },

  // ----- FELHASZNÁLÁS ADATAI -----
  // Csak akkor kap értéket, amikor valaki a kóddal regisztrál
  felhasznalva: {
    type: Date,
    default: null
  },
  felhasznaloEemberId: {
    type: mongoose.Schema.Types.ObjectId,  // A kóddal regisztrált új e-ember
    ref: 'eEmber',
    default: null
  }

});

// ===== INDEX: SAJÁT MEGHÍVÓK GYORS LISTÁZÁSÁHOZ =====
// A „Meghívóim" lista a kibocsátó szerint kérdez le (kod-ra a unique index már van)
meghivoSchema.index({ kibocsatoEemberId: 1, letrehozva: -1 });

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
const Meghivo = mongoose.model('Meghivo', meghivoSchema);

module.exports = Meghivo;
