// backend/models/eember.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// ===== EMBER SÉMA DEFINIÁLÁSA =====
// A Schema meghatározza az adatszerkezetet és validációs szabályokat
const eemberSchema = new mongoose.Schema({

// ----- EMBERNÉV MEZŐ -----
eemberNev: { 
  type: String,       // Szöveges típus
  required: true,     // Kötelező mező 
  unique: true,       // Egyedi érték 
  trim: true,         // Levágja a felesleges szóközöket elejéről és végéről
  minlength: 3,       // Minimum 3 karakter hosszú
  maxlength: 30       // Maximum 30 karakter hosszú
},

// ----- EMAIL MEZŐ -----
email: { 
  type: String,       // Szöveges típus
  required: true,     // Kötelező mező 
  unique: true,       // Egyedi érték 
  trim: true,         // Levágja a felesleges szóközöket
  lowercase: true     // Automatikusan kisbetűssé alakítja
},

// ----- JELSZÓ MEZŐ -----
jelszo: { 
  type: String,       // Szöveges típus
  required: true,     // Kötelező mező 
  minlength: 6        // Minimum 6 karakter hosszú 
},

// ----- NÉV MEZŐ -----
// A eember valódi neve 
nev: { 
  type: String,       // Szöveges típus
  required: true,     // Kötelező mező
  trim: true          // Levágja a felesleges szóközöket
},

// ----- LOKÁCIÓ BEÁGYAZOTT OBJEKTUM -----
// Földrajzi elhelyezkedés tárolása (3 szintű: ország/régió/település)
lokacio: {
  orszag: {           // Ország mező
    type: String,     // Szöveges típus
    required: true    // Kötelező mező
  },
  regio: {            // Régió/megye mező
    type: String,     // Szöveges típus
    required: true    // Kötelező mező
  },
  telepules: {        // Település/város mező
    type: String,     // Szöveges típus
    required: true    // Kötelező mező
  }
},

// ----- TUDATPONTOK -----
// A eember tudatpontjainak száma
// Regisztrációkor minden eember 10.000 tudatpontot kap
tudatpontok: {
  type: Number,       // Szám típus
  default: 10000,     // Alapértelmezett érték: 10.000 tudatpont
  min: 0             // Minimum érték: nem lehet negatív
},

// ----- LÉTREHOZÁS DÁTUMA -----
// Amikor a eember regisztrált
letrehozva: { 
  type: Date,         // Dátum típus
  default: Date.now   // Alapértelmezett: jelenlegi időpont
},

// ----- UTOLSÓ BEJELENTKEZÉS -----
// Amikor a eember utoljára bejelentkezett
utolsoBejelentkezes: {
  type: Date,         // Dátum típus
  default: null       // Alapértelmezett: null (még nem jelentkezett be)
},

// ----- GLOBÁLIS ÉRTESÍTÉSI ALAPBEÁLLÍTÁS -----
// A fő menüs „Értesítési beállítások" tárolása: mely eseménytípusokról kér az
// e-ember ALAPBÓL értesítést. Ez a cascade LEGVÉGSŐ visszaesése – akkor érvényes,
// ha sem a csomóponton, sem a felmenőkön nincs saját beállítás (opt-in rendszer).
// Ugyanaz a 7 típus, mint az ErtesitesiBeallitas modellben (szinkronban tartandó).
ertesitesiAlapbeallitas: {
  ertesitesTipusok: {
    type: [String],
    enum: {
      values: [
        'ujJavaslat',
        'javaslatElfogadas',
        'javaslatElvetve',
        'szavazatErkezett',
        'szavazasiHatarido',
        'tudatpontValtozas',
        'ujGyerekEntitas',
      ],
      message: 'Érvénytelen értesítési típus: {VALUE}',
    },
    default: [],
  },
  // Tudatpont-változási küszöbök a globális szinten is (ugyanúgy, mint csomóponti beállításnál):
  // négy független küszöb (saját/össz bázis × direkt/százalék mérték), "VAGY" logikával.
  tudatpontKuszobok: {
    sajatDirekt:   { type: Number, min: 1, default: null },
    sajatSzazalek: { type: Number, min: 1, max: 100, default: null },
    osszDirekt:    { type: Number, min: 1, default: null },
    osszSzazalek:  { type: Number, min: 1, max: 100, default: null },
  },
  // TUDATPONT-TULAJDONOSSÁGI SZŰRŐ globális szinten: ha true, csak akkor jön értesítés,
  // ha az esemény entitásán van saját tudatpont (Egyezmeny-eseményre nem vonatkozik).
  // Ugyanaz a szabály, mint a csomóponti beállításban (ertesitesiBeallitas.tudatpontSzuro).
  tudatpontSzuro: {
    type: Boolean,
    default: false,
  },
}

});

// ===== INDEX: GLOBÁLIS ÉRTESÍTÉS-FELIRATKOZÓK GYORS LEKÉRÉSÉHEZ =====
// Az értesítés-küldés címzett-feloldása lekéri, kik iratkoztak fel GLOBÁLISAN egy adott
// eseménytípusra (ertesitesiAlapbeallitas.ertesitesTipusok tartalmazza a típust). Index
// nélkül ez teljes kollekció-olvasás lenne minden eseménynél.
eemberSchema.index({ 'ertesitesiAlapbeallitas.ertesitesTipusok': 1 });

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
// A model a séma alapján létrehozott adatbázis kollekció
// 'eEmber' = model neve, eemberSchema = séma definíció
const eEmber = mongoose.model('eEmber', eemberSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = eEmber;