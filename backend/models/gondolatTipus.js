// backend/models/gondolatTipus.js

// Mongoose importálása - MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// A szerkesztő-elem közös al-sémája (eemberId + allapot + eredeti)
const szerkesztoResz = require('./szerkesztoResz');

// GONDOLAT TÍPUS SÉMA DEFINÍCIÓJA
// A Schema meghatározza a gondolat típus adatszerkezetét és validációs szabályokat
// Pl.: poszt, komment, esemény, kérdés, stb.
const gondolatTipusSchema = new mongoose.Schema({

  // ----- NÉV MEZŐ -----
  // A gondolat típus neve (kötelező)
  nev: {
    reteg: 'gondolat',  // H6
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező
    trim: true,             // Levágja a felesleges szóközöket elejéről és végéről
    minlength: 2,           // Minimum 2 karakter hosszú
    maxlength: 50           // Maximum 50 karakter hosszú
  },

  // ----- LEÍRÁS MEZŐ -----
  // A gondolat típus gazdag szöveges leírása (opcionális)
  // MÓDOSÍTVA: String helyett Mixed típus, mert a SzovegSzerkeszto
  // komponens egy JSON blokkokból álló tömböt tárol ide
  leiras: {
    reteg: 'gondolat',  // H6
    type: mongoose.Schema.Types.Mixed, // Vegyes típus: JSON tömböt fogad a szövegszerkesztőtől
    required: false,                   // Nem kötelező mező
    default: null                      // Alapértelmezett érték: null (üres string helyett)
  },

  // ----- IKON ÚTVONAL MEZŐ -----
  // A feltöltött ikon fájl elérési útvonala (kötelező)
  // Pl.: 'uploads/icons/icon-1234567890-987654321.png'
  ikon: {
    reteg: 'gondolat',  // H6
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező - minden típusnak kell legyen ikonja
    trim: true              // Levágja a felesleges szóközöket
  },

  // ----- SZÜLŐ AZONOSÍTÓ MEZŐ -----
  // Melyik entitás a közvetlen szülője ennek a gondolat típusnak (opcionális)
  // Lehet null, ha ez egy gyökér gondolat típus (nincs szülője)
  // Bármilyen entitás lehet a szülő: Gondolat, Kategoria, GondolatTipus, Javaslat, Egyezmeny
  szuloId: {
    reteg: 'gondolat',  // H6
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    default: null                          // Alapértelmezetten nincs szülő (gyökér elem)
  },

  // ----- SZÜLŐ TÍPUSA MEZŐ -----
  // Meghatározza, hogy a szuloId melyik kollekciára mutat
  // Kötelező, ha szuloId meg van adva - különben null
  szuloTipus: {
    reteg: 'gondolat',  // H6
    type: String,           // Szöveges típus
    enum: [                 // Csak ezek az értékek engedélyezettek
      'Gondolat',
      'Kategoria',
      'GondolatTipus',
      'Javaslat',
      'Egyezmeny',
      null                  // Null értéket is elfogad (gyökér elem esetén)
    ],
    default: null           // Alapértelmezetten nincs szülő típus
  },

  // ----- SZERKESZTŐK -----
  // Kik szerkesztették ezt a gondolattípust. Egy gondolattípusnak TÖBB szerkesztője
  // lehet: az eredeti létrehozó + mindenki, akinek elfogadott MÓDOSÍTÁSI javaslata
  // ténylegesen módosította a gondolattípust.
  // Sorrend: időrendben VISSZAFELÉ — a 0. elem a LEGUTOLSÓ szerkesztő.
  // (A régi egyszeres `letrehozo` mező helyére lépett.)
  szerkesztok: {
    reteg: 'lanc',  // H6
    type: [szerkesztoResz],   // A közös szerkesztő al-séma tömbje
    default: []               // Alap: üres tömb
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor a gondolat típus létrejött
  letrehozva: {
    reteg: 'gondolat',  // H6
    type: Date,             // Dátum típus
    default: Date.now       // Alapértelmezett: jelenlegi időpont
  },

  // ----- UTOLSÓ (TARTALMI) MÓDOSÍTÁS DÁTUMA -----
  // A név/leírás LEGUTÓBBI tartalmi módosítása egy elfogadott Módosítás-egyezmény
  // által. Létrehozáskor = letrehozva; CSAK tartalmi módosítás (Modositas) frissíti,
  // áthelyezés/egyesítés/tudatpont NEM. A kártya ezt mutatja, a gyerek↔szülő
  // összevetés ebből dönti el, elavulhat-e a gyerek (piros = régebbi, zöld = újabb).
  modositva: {
    reteg: 'gondolat',  // H6
    type: Date,
    default: Date.now
  }

});

// INDEXEK LÉTREHOZÁSA
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Név indexelése - gyors név szerinti keresés és egyediség ellenőrzés
gondolatTipusSchema.index({ nev: 1 });

// Szerkesztő indexelése - gyors keresés "mely gondolattípusokat szerkesztette egy e-ember"
gondolatTipusSchema.index({ 'szerkesztok.eemberId': 1 });

// Létrehozás dátuma indexelése - időrendi rendezéshez
gondolatTipusSchema.index({ letrehozva: -1 });

// SzuloId indexelése - gyors keresés szülő alapján (hierarchia lekérdezésekhez)
gondolatTipusSchema.index({ szuloId: 1 });

// SzuloTipus indexelése - gyors keresés szülő típus alapján
gondolatTipusSchema.index({ szuloTipus: 1 });
// ===== H6 — ADAT-OSZTÁLYOZÁS: ALAPÉRTELMEZETT RÉTEG =====
// A mezők a saját `reteg` opciójukban hordozzák a besorolásukat (lásd fentebb).
// A Mongoose által AUTOMATIKUSAN felvett mezőkre (_id, createdAt, updatedAt) viszont
// nem tudunk mező-opciót tenni — rájuk ez az alapértelmezés vonatkozik.
// A működésre nincs hatása: a Mongoose ezt az opciót megőrzi, de nem használja.
// Magyarázat és a teljes besorolás: docs/adat_osztalyozas.md (H6 híd-feladat).
gondolatTipusSchema.options.retegAlapertelmezes = 'gondolat';

// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// A model a séma alapján létrehozott adatbázis kollekció
const GondolatTipus = mongoose.model('GondolatTipus', gondolatTipusSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = GondolatTipus;