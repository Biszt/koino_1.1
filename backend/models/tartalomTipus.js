// backend/models/tartalomTipus.js

// Mongoose importálása - MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// A szerkesztő-elem közös al-sémája (eemberId + allapot + eredeti)
const szerkesztoResz = require('./szerkesztoResz');

// TARTALOM TÍPUS SÉMA DEFINÍCIÓJA
// A Schema meghatározza a tartalom típus adatszerkezetét és validációs szabályokat
// Pl.: poszt, komment, esemény, kérdés, stb.
const tartalomTipusSchema = new mongoose.Schema({

  // ----- NÉV MEZŐ -----
  // A tartalom típus neve (kötelező)
  nev: {
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező
    trim: true,             // Levágja a felesleges szóközöket elejéről és végéről
    minlength: 2,           // Minimum 2 karakter hosszú
    maxlength: 50           // Maximum 50 karakter hosszú
  },

  // ----- LEÍRÁS MEZŐ -----
  // A tartalom típus gazdag szöveges leírása (opcionális)
  // MÓDOSÍTVA: String helyett Mixed típus, mert a SzovegSzerkeszto
  // komponens egy JSON blokkokból álló tömböt tárol ide
  leiras: {
    type: mongoose.Schema.Types.Mixed, // Vegyes típus: JSON tömböt fogad a szövegszerkesztőtől
    required: false,                   // Nem kötelező mező
    default: null                      // Alapértelmezett érték: null (üres string helyett)
  },

  // ----- IKON ÚTVONAL MEZŐ -----
  // A feltöltött ikon fájl elérési útvonala (kötelező)
  // Pl.: 'uploads/icons/icon-1234567890-987654321.png'
  ikon: {
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező - minden típusnak kell legyen ikonja
    trim: true              // Levágja a felesleges szóközöket
  },

  // ----- SZÜLŐ AZONOSÍTÓ MEZŐ -----
  // Melyik entitás a közvetlen szülője ennek a tartalom típusnak (opcionális)
  // Lehet null, ha ez egy gyökér tartalom típus (nincs szülője)
  // Bármilyen entitás lehet a szülő: Tartalom, Kategoria, TartalomTipus, Javaslat, Egyezmeny
  szuloId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    default: null                          // Alapértelmezetten nincs szülő (gyökér elem)
  },

  // ----- SZÜLŐ TÍPUSA MEZŐ -----
  // Meghatározza, hogy a szuloId melyik kollekciára mutat
  // Kötelező, ha szuloId meg van adva - különben null
  szuloTipus: {
    type: String,           // Szöveges típus
    enum: [                 // Csak ezek az értékek engedélyezettek
      'Tartalom',
      'Kategoria',
      'TartalomTipus',
      'Javaslat',
      'Egyezmeny',
      null                  // Null értéket is elfogad (gyökér elem esetén)
    ],
    default: null           // Alapértelmezetten nincs szülő típus
  },

  // ----- SZERKESZTŐK -----
  // Kik szerkesztették ezt a tartalomtípust. Egy tartalomtípusnak TÖBB szerkesztője
  // lehet: az eredeti létrehozó + mindenki, akinek elfogadott MÓDOSÍTÁSI javaslata
  // ténylegesen módosította a tartalomtípust.
  // Sorrend: időrendben VISSZAFELÉ — a 0. elem a LEGUTOLSÓ szerkesztő.
  // (A régi egyszeres `letrehozo` mező helyére lépett.)
  szerkesztok: {
    type: [szerkesztoResz],   // A közös szerkesztő al-séma tömbje
    default: []               // Alap: üres tömb
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor a tartalom típus létrejött
  letrehozva: {
    type: Date,             // Dátum típus
    default: Date.now       // Alapértelmezett: jelenlegi időpont
  },

  // ----- UTOLSÓ (TARTALMI) MÓDOSÍTÁS DÁTUMA -----
  // A név/leírás LEGUTÓBBI tartalmi módosítása egy elfogadott Módosítás-egyezmény
  // által. Létrehozáskor = letrehozva; CSAK tartalmi módosítás (Modositas) frissíti,
  // áthelyezés/egyesítés/tudatpont NEM. A kártya ezt mutatja, a gyerek↔szülő
  // összevetés ebből dönti el, elavulhat-e a gyerek (piros = régebbi, zöld = újabb).
  modositva: {
    type: Date,
    default: Date.now
  }

});

// INDEXEK LÉTREHOZÁSA
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Név indexelése - gyors név szerinti keresés és egyediség ellenőrzés
tartalomTipusSchema.index({ nev: 1 });

// Szerkesztő indexelése - gyors keresés "mely tartalomtípusokat szerkesztette egy e-ember"
tartalomTipusSchema.index({ 'szerkesztok.eemberId': 1 });

// Létrehozás dátuma indexelése - időrendi rendezéshez
tartalomTipusSchema.index({ letrehozva: -1 });

// SzuloId indexelése - gyors keresés szülő alapján (hierarchia lekérdezésekhez)
tartalomTipusSchema.index({ szuloId: 1 });

// SzuloTipus indexelése - gyors keresés szülő típus alapján
tartalomTipusSchema.index({ szuloTipus: 1 });

// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// A model a séma alapján létrehozott adatbázis kollekció
const TartalomTipus = mongoose.model('TartalomTipus', tartalomTipusSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = TartalomTipus;