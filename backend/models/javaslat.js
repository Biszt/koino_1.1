// backend/models/javaslat.js

// ===================================
// MONGOOSE IMPORTÁLÁSA
// ===================================
// Mongoose - MongoDB adatbázis kezelésre szolgáló library
const mongoose = require('mongoose');

// ===================================
// JAVASLAT SCHEMA DEFINIÁLÁSA
// ===================================
// A Schema meghatározza a javaslat adatszerkezetét és validációs szabályokat
const javaslatSchema = new mongoose.Schema({

  // ===================================
  // ----- JAVASLAT TÍPUSA -----
  // ===================================
  javaslatTipus: {
    type: String,                                                          // Szöveges típus
    required: true,                                                        // Kötelező mező
    enum: ['Torles', 'Modositas', 'Egyesites', 'Athelyezes', 'Csomag'],   // Engedélyezett értékek
    trim: true                                                             // Levágja a felesleges szóközöket
  },

  // ===================================
  // ----- ÉRINTETT ENTITÁSOK (TÖMB) -----
  // ===================================
  // Egy vagy több entitás, amelyekre a javaslat vonatkozik
  erintettEntitasok: {
    type: [
      {
        // Entitás MongoDB ObjectId-ja
        entitasId: {
          type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
          required: true                         // Kötelező mező
        },
        // Entitás típusa (melyik model/kollekció)
        entitasTipus: {
          type: String,                                          // Szöveges típus
          required: true,                                        // Kötelező mező
          enum: ['Tartalom', 'Kategoria', 'TartalomTipus'],     // Engedélyezett típusok
          trim: true
        },
        // Művelet típusa ezen az entitáson
        muvelet: {
          type: String,                                                    // Szöveges típus
          required: true,                                                  // Kötelező mező
          enum: ['Torles', 'Modositas', 'Egyesites', 'Athelyezes'],       // Engedélyezett műveletek
          trim: true
        },
        // Módosítási adatok (ha Modositas vagy Athelyezes művelet)
        // Object típus: befogadja a szövegszerkesztő JSON tömbjét is (pl. szoveg mező)
        modositasAdatok: {
          type: Object,   // Objektum típus - Mixed-ként viselkedik, bármit elfogad
          default: {}     // Alapértelmezett: üres objektum
        }
      }
    ],
    // Validáció: legalább 1 érintett entitás kell
    validate: {
      validator: function(value) {
        return value && value.length > 0;
      },
      message: 'Legalább egy érintett entitás megadása kötelező'
    }
  },

  // ----- SZÜLŐ ENTITÁS AZONOSÍTÓ -----
  // Melyik entitás alatt jött létre ez a javaslat. A javaslat MINDIG az
  // érintett entitás gyereke (a service töredékenként állítja be), ezért
  // kötelező. A szülő típusa polimorf: Tartalom / Kategoria / TartalomTipus.
  szuloId: {
    type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
    refPath: 'szuloTipus',                  // Polimorf referencia (a szuloTipus dönti el a modellt)
    required: true                          // KÖTELEZŐ mező - a javaslat mindig az érintett entitás gyereke
    // Index: lásd javaslatSchema.index({ szuloId: 1 }) lejjebb
  },

  // ----- SZÜLŐ TÍPUSA -----
  // Az érintett entitás típusa (a javaslat annak a gyereke).
  szuloTipus: {
    type: String,                                     // Szöveges típus
    default: 'Tartalom',                              // Alapértelmezett: Tartalom
    enum: ['Tartalom', 'Kategoria', 'TartalomTipus']  // Az érték-rendszerrel azonos entitástípusok
  },

  // ----- EGYEZMÉNY TÁRHELY AZONOSÍTÓ -----
  // Hol jön létre az EGYEZMÉNY, ha a javaslatot elfogadják (nem a javaslat
  // helye!). Típusonként a service vezeti le (Törlés → érintett szülője,
  // Módosítás/Áthelyezés → érintett entitás, Egyesítés → placeholder → új entitás).
  // Egyesítésnél a placeholder id kerül ide, a valódira a végrehajtás frissíti.
  egyezmenyTarhelyId: {
    type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
    refPath: 'egyezmenyTarhelyTipus',       // Polimorf referencia
    // NULL IS MEGENGEDETT minden típusnál (required: false). A kötelezőséget NEM a
    // séma dönti el: a Csomag javaslatnál a service (javaslatService) kényszeríti ki,
    // hogy a létrehozó válasszon tárhelyet; minden más esetben az egyezmenyTarhelyId
    // lehet null (pl. amikor nincs megadva, vagy a levezetés null-t ad).
    required: false,
    default: null   // Alapértelmezett: null
    // Index: lásd javaslatSchema.index({ egyezmenyTarhelyId: 1 }) lejjebb
  },

  // ----- EGYEZMÉNY TÁRHELY TÍPUSA -----
  // Az egyezmenyTarhelyId entitásának típusa (polimorf egyezmény-elhelyezéshez).
  egyezmenyTarhelyTipus: {
    type: String,
    default: 'Tartalom',
    enum: ['Tartalom', 'Kategoria', 'TartalomTipus']
  },

  // ----- TÖREDÉK JAVASLAT METAADATOK -----
  toredekCsoportId: {
    type: mongoose.Schema.Types.ObjectId,   // Töredék csoport azonosító
    required: false,                        // Csak akkor van értéke, ha töredék javaslat
    default: null                           // Alapértelmezett: nincs csoport
  }, // Egy logikai javaslat összes töredéke ugyanazt az értéket kapja

  toredekSorszam: {
    type: Number,       // A töredék pozíciója: 1, 2, ..., N
    required: false,    // Nem kötelező – régi javaslatoknál hiányozhat
    default: null,      // Ha nincs beállítva, null lesz
    min: 1              // Legalább 1 a sorszám
  }, // Pl. 1/6 esetén ez az 1-es lesz

  toredekDarab: {
    type: Number,       // Hány töredék tartozik a csoportba összesen
    required: false,    // Nem kötelező – régi javaslatoknál hiányozhat
    default: null,      // Ha nincs csoport, akkor null
    min: 1              // Legalább 1 (egy elemű csoport is lehet elvileg)
  }, // Pl. 1/6 esetén ez a 6-os lesz

  // ===================================
  // ----- Egyesites SPECIÁLIS ADATOK -----
  // ===================================
  // Csak Egyesites típusú javaslat esetén használatos
  egyesitesAdatok: {
    // Az új entitás típusa (ami létrejön az egyesítésből)
    ujEntitasTipus: {
      type: String,                                          // Szöveges típus
      enum: ['Tartalom', 'Kategoria', 'TartalomTipus'],     // Engedélyezett típusok
      required: function() {
        // Csak akkor kötelező, ha Egyesites típus
        return this.javaslatTipus === 'Egyesites';
      }
    },
    // Az új entitás adatai (mezők: nev, leiras, stb.)
    // Object típus: befogadja a szövegszerkesztő JSON tömbjét is
    ujEntitasAdatok: {
      type: Object,   // Objektum típus - Mixed-ként viselkedik, bármit elfogad
      required: function() {
        // Csak akkor kötelező, ha Egyesites típus
        return this.javaslatTipus === 'Egyesites';
      }
    },
    // Forrás entitások ID-i (amelyek egyesülnek)
    forrasEntitasok: [
      {
        type: mongoose.Schema.Types.ObjectId // MongoDB ObjectId típus
      }
    ]
  },

  // ===================================
  // ----- LÉTREHOZÓ eEmber -----
  // ===================================
  letrehozo: {
    type: mongoose.Schema.Types.ObjectId,   // MongoDB ObjectId típus
    ref: 'eEmber',                          // Referencia a eEmber modellre
    required: true                          // Kötelező mező
  },

  // ===================================
  // ----- INDOKLÁS -----
  // ===================================
  // A javaslat gazdag szöveges indoklása - miért szükséges ez a javaslat
  // MÓDOSÍTVA: String helyett Mixed típus, mert a SzovegSzerkeszto
  // komponens egy JSON blokkokból álló tömböt tárol ide
  indoklas: {
    type: mongoose.Schema.Types.Mixed,  // Vegyes típus: JSON tömböt fogad a szövegszerkesztőtől
    required: true,                     // KÖTELEZŐ – az indoklás megadása kötelező (de nincs min. karakter)
    default: null                       // Alapértelmezett: null (a service üres indoklásnál előbb dob)
  },

  // ===================================
  // ----- STÁTUSZ -----
  // ===================================
  // A javaslat jelenlegi állapota
  statusz: {
    type: String,                                         // Szöveges típus
    enum: ['Aktiv', 'Elfogadva', 'Elvetve', 'Hiba'],     // Engedélyezett értékek
    default: 'Aktiv'                                      // Alapértelmezett: Aktiv
  },

  // ===================================
  // ----- LÉTREHOZÁS DÁTUMA -----
  // ===================================
  letrehozva: {
    type: Date,         // Dátum típus
    default: Date.now   // Alapértelmezett: jelenlegi időpont
  },

  // ===================================
  // ----- HATÁLYBA LÉPÉS IDEJE -----
  // ===================================
  // Mikor lép hatályba a javaslat (számított érték)
  hatalybaLepesIdeje: {
    type: Date,     // Dátum típus
    default: null   // Alapértelmezett: nincs beállítva
  },

  // ===================================
  // ----- UTOLSÓ SZÁMÍTÁS IDŐPONTJA -----
  // ===================================
  // Mikor történt utoljára a BM, HI, stb. újraszámítása
  utolsoSzamitas: {
    type: Date,         // Dátum típus
    default: Date.now   // Alapértelmezett: jelenlegi időpont
  },

  // ----- ÉRTÉKEK ELAVULTAK JELZŐ -----
  // Jelzi, hogy a számított értékek elavultak-e (hisztogram vagy szavazat változás miatt)
  // A cron job vagy részletes lekérés fogja frissíteni
  ertekekElavultak: {
    type: Boolean,  // Boolean típus
    default: false  // Alapértelmezett: false (nem elavult)
  },

  // ===================================
  // ----- SZÁMÍTOTT ÉRTÉKEK (CACHE) -----
  // ===================================
  // Ezek az értékek minden szavazat után újraszámolódnak
  // Cache-elve vannak a gyorsabb lekérdezéshez

  // Érintett entitásokon lévő tudatpont tulajdonosok száma
  // Egyesített halmaz - egyedi eEmberek
  entitasokTudatpontTulajdonosokSzama: {
    type: Number,   // Számérték típus
    default: 0      // Alapértelmezett: 0
  },

  // Részvevő tudatpont tulajdonosok száma
  // Akik mind a javaslaton, mind valamelyik érintett entitáson is vannak
  resztvevoTudatpontTulajdonosokSzama: {
    type: Number,   // Számérték típus
    default: 0      // Alapértelmezett: 0
  },

  // Javaslat támogatóinak száma
  javaslatTamogatoinakSzama: {
    type: Number,   // Számérték típus
    default: 0      // Alapértelmezett: 0
  },

  // Javaslat ellenzőinek száma
  javaslatEllenzoinekSzama: {
    type: Number,   // Számérték típus
    default: 0      // Alapértelmezett: 0
  },

  // Javaslat tartózkodóinak száma
  javaslatTartozkodoinakSzama: {
    type: Number,   // Szám típus
    default: 0,     // Alapértelmezett: 0 tartózkodó
    min: 0          // Minimum érték: nem lehet negatív
  },

  // Részvételi arány - százalékban (RA)
  // RA = resztvevoTudatpontTulajdonosokSzama / entitasokTudatpontTulajdonosokSzama * 100
  reszveteliArany: {
    type: Number,   // Számérték típus
    default: 0,     // Alapértelmezett: 0
    min: 0,         // Minimum érték: 0
    max: 100        // Maximum érték: 100
  },

  // Támogatottsági arány - százalékban
  // TA = javaslatTamogatoinakSzama / resztvevoTudatpontTulajdonosokSzama * 100
  tamogatotsagiArany: {
    type: Number,   // Számérték típus
    default: 0,     // Alapértelmezett: 0
    min: 0,         // Minimum érték: 0
    max: 100        // Maximum érték: 100
  },

  // Ellenzői arány - százalékban
  // EA = javaslatEllenzoinekSzama / resztvevoTudatpontTulajdonosokSzama * 100
  ellenzoiArany: {
    type: Number,   // Számérték típus
    default: 0,     // Alapértelmezett: 0
    min: 0,         // Minimum érték: 0
    max: 100        // Maximum érték: 100
  },

  // Tartózkodói arány - százalékban (MODELL A – tiszta szelet)
  // TartA = javaslatTartozkodoinakSzama / resztvevoTudatpontTulajdonosokSzama * 100
  // A támogatottsági + ellenzői + tartózkodói arány együtt MINDIG 100%.
  tartozkodoiArany: {
    type: Number,   // Számérték típus
    default: 0,     // Alapértelmezett: 0
    min: 0,         // Minimum érték: 0
    max: 100        // Maximum érték: 100
  },

  // Bizonyossági mutató (BM)
  // BM = ( | TA − EA | + RA ) / 2   – a tartózkodás csökkenti a TA és EA különbségét,
  // így az egyértelműséget is (több tartózkodó → alacsonyabb bizonyosság → hosszabb döntési idő)
  bizonyossagiMutato: {
    type: Number,   // Számérték típus
    default: 0,     // Alapértelmezett: 0
    min: 0,         // Minimum érték: 0
    max: 100        // Maximum érték: 100
  },

  // Hatályba lépési idő másodpercben (HI)
  // HI = 31_536_000 * (1 - BM/100)^5
  dontesiIdo: {
    type: Number,       // Számérték típus (másodperc)
    default: 31536000   // Alapértelmezett: 1 év (maximum)
  }

});

// ===================================
// INDEXEK LÉTREHOZÁSA
// ===================================
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Státusz indexelése - gyors szűrés státusz szerint (pl. Aktiv javaslatok)
javaslatSchema.index({ statusz: 1 });

// Létrehozó indexelése - gyors keresés eEmber javaslatai alapján
javaslatSchema.index({ letrehozo: 1 });

// Hatályba lépés ideje indexelése - Cron job-hoz szükséges
// Gyors keresés a hatályba lépendő javaslatok között
javaslatSchema.index({ hatalybaLepesIdeje: 1 });

// Érintett entitások indexelése - gyors keresés entitás szerint
// Compound index: entitasId + entitasTipus
javaslatSchema.index({
  'erintettEntitasok.entitasId': 1,
  'erintettEntitasok.entitasTipus': 1
});

// Létrehozás dátuma indexelése - legújabb javaslatok rendezéséhez
javaslatSchema.index({ letrehozva: -1 });

// szuloId indexelése
// Gyors keresés: "Egy tartalom alatti összes javaslat"
javaslatSchema.index({ szuloId: 1 });

// Compound index: szuloId + statusz
// Gyors keresés: "Egy tartalom aktív javaslatai"
javaslatSchema.index({ szuloId: 1, statusz: 1 });

// Compound index: szuloId + létrehozva
// Gyors keresés: "Egy tartalom legújabb javaslatai"
javaslatSchema.index({ szuloId: 1, letrehozva: -1 });

// egyezmenyTarhelyId indexelése
// Gyors keresés: Melyik javaslatok egyezményei kerülnek egy adott tartalomba
javaslatSchema.index({ egyezmenyTarhelyId: 1 });

// Töredék csoport index
javaslatSchema.index({
  toredekCsoportId: 1,   // Töredék csoport szerinti gyors keresés
  statusz: 1             // Gyakori, hogy csak Aktiv / Elfogadva kell
});

// ===================================
// MONGOOSE MIDDLEWARE-EK
// ===================================

// ----- PRE SAVE MIDDLEWARE -----
// Futtatás előtt: javaslat mentése
javaslatSchema.pre('save', function(next) { // Mentés előtti middleware kezdete

  // Log a pre-save elején
  console.log('javaslatSchema.preSave - KEZDÉS', {
    javaslatTipus: this.javaslatTipus,                        // Aktuális javaslat típusa
    erintettEntitasokSzama: this.erintettEntitasok?.length,   // Érintett entitások száma
    toredekCsoportId: this.toredekCsoportId                   // Töredék csoport azonosító (ha van)
  });

  // A szülő (szuloId) kötelezőségét a séma `required: true` kényszeríti ki;
  // a javaslatot a service mindig az érintett entitás gyerekeként hozza létre,
  // ezért itt külön ellenőrzés nem kell (a régi, „szülő tartalom kötelező"
  // üzenet félrevezető is volt, mert a szülő nem csak Tartalom lehet).

  // Az indoklás megadása OPCIONÁLIS (nincs kötelezőség és nincs minimum
  // karakter-követelmény) – ezért itt nem ellenőrizzük a meglétét. Ha nincs
  // megadva, a mező default null marad.

  // VALIDÁCIÓ - Egyesites típus validálása
  if (this.javaslatTipus === 'Egyesites') { // Csak Egyesites típusnál fusson le

    // Ellenőrzés: legalább 1 érintett entitás kell
    if (!this.erintettEntitasok || this.erintettEntitasok.length < 1) {
      return next(new Error('Egyesites típushoz legalább 1 érintett entitás szükséges'));
    }

    // Ellenőrzés: egyesitesAdatok kitöltöttség
    if (!this.egyesitesAdatok || !this.egyesitesAdatok.ujEntitasAdatok) {
      return next(new Error('Egyesites esetén az egyesitesAdatok megadása kötelező'));
    }

  } // Egyesites validáció blokkjának vége

  // VALIDÁCIÓ - Csomag típus validálása
  if (this.javaslatTipus === 'Csomag') { // Csak Csomag típusnál fusson le

    // Ellenőrzés: legalább 2 művelet kell
    if (!this.erintettEntitasok || this.erintettEntitasok.length < 2) {
      return next(new Error('Csomag típushoz legalább 2 művelet szükséges'));
    }

    // Ellenőrzés: ne legyen Egyesites művelet
    const vanEgyesites = this.erintettEntitasok.some(
      (entitas) => entitas.muvelet === 'Egyesites'
    );

    if (vanEgyesites) {
      return next(new Error('Csomag típusban nem lehet Egyesites művelet, használd az Egyesites típust'));
    }

  } // Csomag validáció blokkjának vége

  // Log a pre-save végén
  console.log('javaslatSchema.preSave - VÉGE', {
    javaslatTipus: this.javaslatTipus,  // Javaslat típusa a végén
    sikeresValidacio: true              // Jelöljük, hogy a validáció sikeres volt
  });

  next(); // Folytatás a mentéssel, ha minden rendben volt
}); // pre('save') middleware vége

// ===================================
// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// ===================================
// A model a schema alapján létrehozott adatbázis kollekció
const Javaslat = mongoose.model('Javaslat', javaslatSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = Javaslat;