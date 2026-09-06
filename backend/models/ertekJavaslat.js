// backend/models/ertekJavaslat.js

// ===================================
// MONGOOSE IMPORTÁLÁSA
// ===================================
// Mongoose - MongoDB adatbázis kezelésre szolgáló library
const mongoose = require('mongoose');

// ===================================
// TÁMOGATOTT ENTITÁSTÍPUSOK
// ===================================
// Az érték javaslat rendszer ezekre az entitásokra működik. Korábban CSAK
// gondolatra volt kötve; mostantól kategóriára és gondolattípusra is.
const ENTITAS_TIPUSOK = ['Gondolat', 'Kategoria', 'GondolatTipus'];

// ===================================
// ÉRTÉK JAVASLAT SÉMA DEFINÍCIÓJA
// ===================================
// Egyéni eemberi érték javaslatok tárolása egy entitás küszöbértékeihez
const ertekJavaslatSchema = new mongoose.Schema({

  // ----- ENTITÁS AZONOSÍTÓ -----
  // Melyik entitáshoz tartozik ez az érték javaslat (gondolat / kategória / gondolattípus).
  // A refPath miatt a populate a helyes modellt tölti be az entitasTipus alapján.
  entitasId: {
    reteg: 'lanc',  // H6
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    refPath: 'entitasTipus',               // Polimorf referencia (az entitasTipus dönti el a modellt)
    required: true                         // Kötelező mező
  },

  // ----- ENTITÁS TÍPUSA -----
  // Meghatározza, melyik kollekcióra mutat az entitasId.
  entitasTipus: {
    reteg: 'lanc',  // H6
    type: String,             // Szöveges típus
    enum: ENTITAS_TIPUSOK,    // Csak a támogatott típusok engedélyezettek
    required: true,           // Kötelező mező
    default: 'Gondolat'       // Visszafelé kompatibilis alapérték
  },

  // ----- EMBER AZONOSÍTÓ -----
  // Ki adta ezt az érték javaslatot
  eemberId: {
    reteg: 'lanc',  // H6
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    ref: 'eEmber', // Referencia a eEmber modellre
    required: true // Kötelező mező
  },

  // -----ÉRTÉK ERTEK JAVASLAT ELFOGADÁSI KÜSZÖB-----
  // eEmber által javasolt érték (51-100)
  javaslatElfogadasiKuszob: {
    reteg: 'lanc',  // H6
    type: Number, // Szám típus
    required: true, // Kötelező mező
    min: 51, // Minimum érték: 51
    max: 100, // Maximum érték: 100
    validate: {
      validator: Number.isInteger, // Ellenőrzi, hogy egész szám-e
      message: 'Az érték javaslat elfogadási küszöbnek egész számnak kell lennie'
    }
  },

  // ----- RÉSZVÉTELI ARÁNY KÜSZÖB ERTEK JAVASLAT -----
  // eEmber által javasolt érték (0-100)
  reszveteliAranyKuszob: {
    reteg: 'lanc',  // H6
    type: Number, // Szám típus
    required: true, // Kötelező mező
    min: 0, // Minimum érték: 0
    max: 100, // Maximum érték: 100
    validate: {
      validator: Number.isInteger, // Ellenőrzi, hogy egész szám-e
      message: 'A részvételi arány küszöbnek egész számnak kell lennie'
    }
  },

  // ----- MINIMUM DÖNTÉSI IDŐ ERTEK JAVASLAT -----
  // eEmber által javasolt alsó határ másodpercben (0-31536000)
  minimumDontesiIdo: {
    reteg: 'lanc',  // H6
    type: Number, // Szám típus
    required: true, // Kötelező mező
    default: 0, // Alapértelmezett: 0 mp (azonnali végrehajtás lehetséges)
    min: 0, // Minimum érték: 0 mp
    validate: {
      validator: Number.isInteger, // Ellenőrzi, hogy egész szám-e
      message: 'A minimum döntési időnek egész számnak kell lennie'
    }
  },

  // ----- MAXIMUM DÖNTÉSI IDŐ ERTEK JAVASLAT -----
  // eEmber által javasolt felső határ másodpercben (0-315360000)
  maximumDontesiIdo: {
    reteg: 'lanc',  // H6
    type: Number, // Szám típus
    required: true, // Kötelező mező
    default: 31536000, // Alapértelmezett: 31536000 mp (1 év)
    min: 0, // Minimum érték: 0 mp
    max: 315360000, // Maximum érték: 315360000 mp (10 év)
    validate: {
      validator: Number.isInteger, // Ellenőrzi, hogy egész szám-e
      message: 'A maximum döntési időnek egész számnak kell lennie'
    }
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor az érték javaslat először létrejött
  letrehozva: {
    reteg: 'lanc',  // H6
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  },

  // ----- MÓDOSÍTÁS DÁTUMA -----
  // Amikor a eember utoljára módosította az érték javaslatát
  modositva: {
    reteg: 'lanc',  // H6
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  }
});

// ===================================
// INDEXEK LÉTREHOZÁSA
// ===================================

// Compound index - egy eember csak egyszer javasolhat egy entitáshoz
// Ez biztosítja, hogy ne legyen duplikált rekord
ertekJavaslatSchema.index(
  { entitasId: 1, entitasTipus: 1, eemberId: 1 },
  { unique: true } // Egyedi constraint
);

// Entitás index - gyors lekérdezés egy entitás összes érték javaslatához
ertekJavaslatSchema.index({ entitasId: 1, entitasTipus: 1 });

// eEmberId index - gyors lekérdezés egy eember összes érték javaslatához
ertekJavaslatSchema.index({ eemberId: 1 });

// ===================================
// PRE-SAVE HOOK
// ===================================

// Módosítás dátumának automatikus frissítése mentés előtt
ertekJavaslatSchema.pre('save', function(next) {
  // Ha ez egy módosítás (nem új dokumentum)
  if (!this.isNew) {
    this.modositva = new Date(); // Frissítjük a módosítás dátumát
  }
  next(); // Továbblépés a mentéshez
});
// ===== H6 — ADAT-OSZTÁLYOZÁS: ALAPÉRTELMEZETT RÉTEG =====
// A mezők a saját `reteg` opciójukban hordozzák a besorolásukat (lásd fentebb).
// A Mongoose által AUTOMATIKUSAN felvett mezőkre (_id, createdAt, updatedAt) viszont
// nem tudunk mező-opciót tenni — rájuk ez az alapértelmezés vonatkozik.
// A működésre nincs hatása: a Mongoose ezt az opciót megőrzi, de nem használja.
// Magyarázat és a teljes besorolás: docs/adat_osztalyozas.md (H6 híd-feladat).
ertekJavaslatSchema.options.retegAlapertelmezes = 'lanc';

// ===================================
// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// ===================================

// A model a séma alapján létrehozott adatbázis kollekció
const ErtekJavaslat = mongoose.model('ErtekJavaslat', ertekJavaslatSchema);

// A támogatott típusokat is exportáljuk, hogy a service/controller hivatkozhasson rá
ErtekJavaslat.ENTITAS_TIPUSOK = ENTITAS_TIPUSOK;

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = ErtekJavaslat;
