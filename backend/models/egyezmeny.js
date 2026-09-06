// backend/models/egyezmeny.js

// =====================================================
// MONGOOSE IMPORTÁLÁSA
// =====================================================
// Mongoose - MongoDB adatbázis kezelésre szolgáló library
const mongoose = require('mongoose');

// =====================================================
// EGYEZMÉNY SCHEMA DEFINIÁLÁSA
// =====================================================
// A Schema meghatározza az egyezmény adatszerkezetét és validációs szabályokat
const egyezmenySchema = new mongoose.Schema({

  // ----- JAVASLAT REFERENCIA -----
  // Az eredeti javaslat, amely végrehajtásra került
  javaslatId: {
    reteg: 'gondolat',  // H6
    type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
    ref: 'Javaslat',                        // Referencia a Javaslat modellre
    required: true                          // Kötelező mező
    // Index: lásd egyezmenySchema.index({ javaslatId: 1 }) lejjebb
  },

  // Melyik gondolat alatt van ez az egyezmény
  // A javaslat egyezmenyTarhelyId mezőjéből származik.
  // MÓDOSÍTVA: lehet null is — ha a tárhely entitást éppen a végrehajtott
  // (Törlés) javaslat törölte és annak nem volt szülője, az egyezmény
  // gyökér elemként jön létre (átveszi a törölt entitás helyét)
  szuloId: {
    reteg: 'gondolat',  // H6
    type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
    refPath: 'szuloTipus',                  // Polimorf referencia (Gondolat/Kategoria/GondolatTipus)
    required: false,                        // Gyökér egyezménynél null
    default: null                           // Alapértelmezett: nincs szülő
    // Index: lásd egyezmenySchema.index({ szuloId: 1 }) lejjebb
  },

  // ----- SZÜLŐ TÍPUSA -----
  // Az egyezmény szülőjének típusa; gyökér egyezménynél null.
  szuloTipus: {
    reteg: 'gondolat',  // H6
    type: String,                                           // Szöveges típus
    default: 'Gondolat',                                    // Alapértelmezett: Gondolat
    enum: ['Gondolat', 'Kategoria', 'GondolatTipus', null]  // Polimorf, vagy null (gyökér egyezmény)
  },

  // ----- JAVASLAT TÍPUSA (SNAPSHOT) -----
  // A javaslat típusa végrehajtáskor
  javaslatTipus: {
    reteg: 'gondolat',  // H6
    type: String,                                                          // Szöveges típus
    required: true,                                                        // Kötelező mező
    enum: ['Torles', 'Modositas', 'Egyesites', 'Athelyezes', 'Csomag'],   // Engedélyezett értékek
    trim: true                                                             // Levágja a felesleges szóközöket
  },

  // ----- ÉRINTETT ENTITÁSOK (SNAPSHOT) -----
  // A javaslat által érintett entitások végrehajtáskor
  erintettEntitasok: {
    reteg: 'gondolat',  // H6
    type: [
      {
        // Entitás MongoDB ObjectId-ja
        entitasId: {
          type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
          required: true                           // Kötelező mező
        },
        // Entitás típusa (melyik model/kollekció)
        entitasTipus: {
          type: String,                                        // Szöveges típus
          required: true,                                      // Kötelező mező
          enum: ['Gondolat', 'Kategoria', 'GondolatTipus'],   // Engedélyezett típusok
          trim: true
        },
        // Művelet típusa ezen az entitáson
        muvelet: {
          type: String,                                                  // Szöveges típus
          required: true,                                                // Kötelező mező
          enum: ['Torles', 'Modositas', 'Egyesites', 'Athelyezes'],     // Engedélyezett műveletek
          trim: true
        }
      }
    ],
    required: true,   // Kötelező mező
    validate: {
      validator: function(value) {
        return value && value.length > 0; // Legalább 1 entitás kell
      },
      message: 'Legalább egy érintett entitás megadása kötelező'
    }
  },

  // ----- INDOKLÁS (SNAPSHOT) -----
  // A javaslat gazdag szöveges indoklása végrehajtáskor
  // MÓDOSÍTVA: String helyett Mixed típus, mert a SzovegSzerkeszto
  // komponens egy JSON blokkokból álló tömböt tárol ide
  indoklas: {
    reteg: 'gondolat',  // H6
    type: mongoose.Schema.Types.Mixed,  // Vegyes típus: JSON tömböt fogad a szövegszerkesztőtől
    required: true,                     // Kötelező mező
    default: null                       // Alapértelmezett: null
  },

  // ----- LÉTREHOZÓ EMBER -----
  // Az eredeti javaslat létrehozója
  letrehozo: {
    reteg: 'lanc',  // H6
    type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
    ref: 'eEmber',                          // Referencia a eEmber modellre
    default: null                           // null = TÖRÖLT e-ember (az egyezmény közösségi, megmarad)
    // Index: lásd egyezmenySchema.index({ letrehozo: 1 }) lejjebb
  },

  // ----- VÉGREHAJTÁS IDŐPONTJA -----
  // Mikor lett végrehajtva a javaslat és létrehozva az egyezmény
  vegrehajtva: {
    reteg: 'szamitott',  // H6
    type: Date,         // Dátum típus
    required: true,     // Kötelező mező
    default: Date.now,  // Alapértelmezett: jelenlegi időpont
    index: true         // Index az időrendi kereséshez
  },

  // ----- VÉGREHAJTÁSI EREDMÉNY -----
  // A végrehajtás kimenetele (részletes eredmény objektum)
  vegrehajatasEredmeny: {
    reteg: 'szamitott',  // H6
    type: Object,   // Objektum típus - flexibilis struktúra
    required: true, // Kötelező mező
    default: {}     // Alapértelmezett: üres objektum
  },

  // ----- SZAVAZÁSI SNAPSHOT ADATOK -----
  // Támogatók száma végrehajtáskor
  tamogatokSzama: {
    reteg: 'gondolat',  // H6
    type: Number,   // Számérték típus
    required: true, // Kötelező mező
    min: 0,         // Minimum érték
    default: 0      // Alapértelmezett: 0
  },

  // Ellenzők száma végrehajtáskor
  ellenzokSzama: {
    reteg: 'gondolat',  // H6
    type: Number,   // Számérték típus
    required: true, // Kötelező mező
    min: 0,         // Minimum érték
    default: 0      // Alapértelmezett: 0
  },

  // Tartózkodók száma végrehajtáskor
  tartozkodokSzama: {
    reteg: 'gondolat',  // H6
    type: Number,   // Számérték típus
    required: true, // Kötelező mező
    min: 0,         // Minimum érték
    default: 0      // Alapértelmezett: 0
  },

  // Részvételi arány % végrehajtáskor
  reszveteliArany: {
    reteg: 'gondolat',  // H6
    type: Number,   // Számérték típus
    required: true, // Kötelező mező
    min: 0,         // Minimum érték
    max: 100,       // Maximum érték
    default: 0      // Alapértelmezett: 0
  },

  // Támogatottsági arány % végrehajtáskor (MODELL A – tiszta szelet: támogatók/szavazók)
  tamogatotsagiArany: {
    reteg: 'gondolat',  // H6
    type: Number,   // Számérték típus
    required: true, // Kötelező mező
    min: 0,         // Minimum érték
    max: 100,       // Maximum érték
    default: 0      // Alapértelmezett: 0
  },

  // Ellenzői arány % végrehajtáskor (MODELL A – tiszta szelet: ellenzők/szavazók)
  ellenzoiArany: {
    reteg: 'gondolat',  // H6
    type: Number,   // Számérték típus
    min: 0,         // Minimum érték
    max: 100,       // Maximum érték
    default: 0      // Alapértelmezett: 0
  },

  // Tartózkodói arány % végrehajtáskor (MODELL A – tiszta szelet: tartózkodók/szavazók)
  // A támogatottsági + ellenzői + tartózkodói arány együtt 100%.
  tartozkodoiArany: {
    reteg: 'gondolat',  // H6
    type: Number,   // Számérték típus
    min: 0,         // Minimum érték
    max: 100,       // Maximum érték
    default: 0      // Alapértelmezett: 0
  },

  // Bizonyossági mutató végrehajtáskor
  bizonyossagiMutato: {
    reteg: 'gondolat',  // H6
    type: Number,   // Számérték típus
    required: true, // Kötelező mező
    min: 0,         // Minimum érték
    max: 100,       // Maximum érték
    default: 0      // Alapértelmezett: 0
  },

  // ----- EGYESÍTÉS SPECIFIKUS ADATOK (SNAPSHOT) -----
  // Csak "Egyesites" típusú javaslat esetén van kitöltve
  egyesitesAdatok: {
    // Az új entitás típusa, ami létrejött az egyesítésből
    ujEntitasTipus: {
      reteg: 'gondolat',  // H6
      type: String,                                        // Szöveges típus
      enum: ['Gondolat', 'Kategoria', 'GondolatTipus'],   // Engedélyezett típusok
      required: function() {
        // Csak akkor kötelező, ha Egyesites típus
        return this.javaslatTipus === 'Egyesites';
      }
    },
    // Az új entitás ObjectId-ja
    ujEntitasId: {
      reteg: 'gondolat',  // H6
      type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
      required: function() {
        // Csak akkor kötelező, ha Egyesites típus
        return this.javaslatTipus === 'Egyesites';
      }
    },
    // Az új entitás adatai (snapshot)
    // Object típus: befogadja a szövegszerkesztő JSON tömbjét is
    ujEntitasAdatok: {
      reteg: 'gondolat',  // H6
      type: Object,   // Objektum típus - Mixed-ként viselkedik, bármit elfogad
      required: function() {
        // Csak akkor kötelező, ha Egyesites típus
        return this.javaslatTipus === 'Egyesites';
      }
    },
    // Forrás entitások ID-i, amelyek egyesültek
    forrasEntitasok: {
      reteg: 'gondolat',  // H6
      type: [mongoose.Schema.Types.ObjectId],   // MongoDB ObjectId tömb
      default: []                               // Alapértelmezett: üres tömb
    }
  },

  // ----- MÓDOSÍTÁS SPECIFIKUS ADATOK (SNAPSHOT) -----
  // Csak "Modositas" típusú javaslat esetén van kitöltve
  // Object típus: befogadja a szövegszerkesztő JSON tömbjét is (pl. szoveg mező módosításakor)
  modositasAdatok: {
    reteg: 'gondolat',  // H6
    type: Object,   // Objektum típus - flexibilis struktúra
    default: {}     // Alapértelmezett: üres objektum
  }

}, {
  // Automatikus timestamps: createdAt, updatedAt mezők hozzáadása
  timestamps: true
});

// =====================================================
// INDEXEK LÉTREHOZÁSA
// =====================================================
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Javaslat ID indexelése - gyors keresés javaslat alapján
egyezmenySchema.index({ javaslatId: 1 });

// Létrehozó indexelése - gyors keresés eember alapján
egyezmenySchema.index({ letrehozo: 1 });

// Végrehajtás dátuma indexelése - időrendi rendezés
egyezmenySchema.index({ vegrehajtva: -1 }); // Csökkenő sorrend - legújabbak előre

// Javaslat típus indexelése - szűrés típus szerint
egyezmenySchema.index({ javaslatTipus: 1 });

// Compound index - létrehozó + végrehajtás dátum
egyezmenySchema.index({ letrehozo: 1, vegrehajtva: -1 });

// Compound index: gyors keresés érintett entitás alapján
egyezmenySchema.index({
  'erintettEntitasok.entitasId': 1,
  'erintettEntitasok.entitasTipus': 1
});

// szuloId indexelése
// Gyors keresés: "Egy gondolat alatti összes egyezmény"
egyezmenySchema.index({ szuloId: 1 });

// Compound index: szuloId + vegrehajtva
// Gyors keresés: "Egy gondolat legújabb egyezményei"
egyezmenySchema.index({ szuloId: 1, vegrehajtva: -1 });
// ===== H6 — ADAT-OSZTÁLYOZÁS: ALAPÉRTELMEZETT RÉTEG =====
// A mezők a saját `reteg` opciójukban hordozzák a besorolásukat (lásd fentebb).
// A Mongoose által AUTOMATIKUSAN felvett mezőkre (_id, createdAt, updatedAt) viszont
// nem tudunk mező-opciót tenni — rájuk ez az alapértelmezés vonatkozik.
// A működésre nincs hatása: a Mongoose ezt az opciót megőrzi, de nem használja.
// Magyarázat és a teljes besorolás: docs/adat_osztalyozas.md (H6 híd-feladat).
egyezmenySchema.options.retegAlapertelmezes = 'gondolat';

// =====================================================
// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// =====================================================
// A model a schema alapján létrehozott adatbázis kollekció
const Egyezmeny = mongoose.model('Egyezmeny', egyezmenySchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = Egyezmeny;