// backend/models/kategoria.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// A szerkesztő-elem közös al-sémája (eemberId + allapot + eredeti)
const szerkesztoResz = require('./szerkesztoResz');

// ===== KATEGÓRIA SÉMA DEFINIÁLÁSA =====
const kategoriaSchema = new mongoose.Schema({

  // ----- NÉV MEZŐ -----
  // A kategória neve (kötelező, egyedi)
  nev: {
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező
    unique: true,           // Egyedi érték - nem lehet két azonos nevű kategória
    trim: true,             // Levágja a felesleges szóközöket
    minlength: 2,           // Minimum 2 karakter hosszú
    maxlength: 50           // Maximum 50 karakter hosszú
  },

  // ----- LEÍRÁS MEZŐ -----
  // A kategória gazdag szöveges leírása (opcionális)
  // MÓDOSÍTVA: String helyett Mixed típus, mert a SzovegSzerkeszto
  // komponens egy JSON blokkokból álló tömböt tárol ide
  leiras: {
    type: mongoose.Schema.Types.Mixed, // Vegyes típus: JSON tömböt fogad a szövegszerkesztőtől
    required: false,                   // Nem kötelező mező
    default: null                      // Alapértelmezett érték: null (üres string helyett)
  },

  // ----- IKON MEZŐ -----
  // A feltöltött ikon fájl elérési útvonala (kötelező)
  // Pl: '/uploads/icons/kategoria-1234567890-987654321.png'
  // VÁLTOZÁS: a korábbi 'szin' (hexadecimális színkód) mező
  // helyett most 'ikon' (fájl útvonal) mező szerepel,
  // hogy egységes legyen a TartalomTipus modellel
  ikon: {
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező - minden kategóriának kell legyen ikonja
    trim: true              // Levágja a felesleges szóközöket
  },

  // ----- SZÜLŐ AZONOSÍTÓ MEZŐ -----
  // Melyik kategória a közvetlen szülője ennek a kategóriának (opcionális)
  // Lehet null, ha ez egy gyökér kategória (nincs szülője)
  // DOMAIN-SZABÁLY: egy kategória szülője CSAK MÁSIK KATEGÓRIA lehet
  // (alkategória-hierarchia). Ezért a szuloId mindig egy Kategoria _id-ra mutat,
  // vagy null (gyökér). Lásd a szuloTipus enumját is.
  szuloId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    default: null                          // Alapértelmezetten nincs szülő (gyökér elem)
  },

  // ----- SZÜLŐ TÍPUSA MEZŐ -----
  // Meghatározza, hogy a szuloId melyik kollekciára mutat.
  // DOMAIN-SZABÁLY: kategória szülője csak Kategoria lehet → az enum SZŰKÍTVE
  // (2026-07-22). Korábban minden entitástípus szerepelt itt, de az a
  // kategória-hierarchia előtti, téves feltevés volt. Kötelező, ha szuloId
  // meg van adva — különben null (gyökér kategória).
  szuloTipus: {
    type: String,           // Szöveges típus
    enum: [                 // Csak ezek az értékek engedélyezettek
      'Kategoria',          // Egyetlen megengedett szülő-típus (alkategória)
      null                  // Null értéket is elfogad (gyökér elem esetén)
    ],
    default: null           // Alapértelmezetten nincs szülő típus
  },

  // ----- SZERKESZTŐK -----
  // Kik szerkesztették ezt a kategóriát. Egy kategóriának TÖBB szerkesztője lehet:
  // az eredeti létrehozó + mindenki, akinek elfogadott MÓDOSÍTÁSI javaslata
  // ténylegesen módosította a kategóriát.
  // Sorrend: időrendben VISSZAFELÉ — a 0. elem a LEGUTOLSÓ szerkesztő.
  // (A régi egyszeres `letrehozo` mező helyére lépett.)
  szerkesztok: {
    type: [szerkesztoResz],   // A közös szerkesztő al-séma tömbje
    default: []               // Alap: üres tömb
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor a kategória létrejött
  letrehozva: {
    type: Date,             // Dátum típus
    default: Date.now       // Alapértelmezett: jelenlegi időpont
  }

});

// ===== INDEXEK LÉTREHOZÁSA =====
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Szerkesztő indexelése - gyors keresés "mely kategóriákat szerkesztette egy e-ember"
kategoriaSchema.index({ 'szerkesztok.eemberId': 1 });

// Létrehozás dátuma indexelése - gyors időrendi rendezés
kategoriaSchema.index({ letrehozva: -1 });

// SzuloId indexelése - gyors keresés szülő alapján (hierarchia lekérdezésekhez)
kategoriaSchema.index({ szuloId: 1 });

// SzuloTipus indexelése - gyors keresés szülő típus alapján
kategoriaSchema.index({ szuloTipus: 1 });

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
const Kategoria = mongoose.model('Kategoria', kategoriaSchema);

module.exports = Kategoria;