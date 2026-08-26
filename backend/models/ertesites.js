// backend/models/Ertesites.js

// A mongoose könyvtár importálása, ami a MongoDB-vel való kommunikációt kezeli
const mongoose = require('mongoose');

// Az engedélyezett értesítési típusok – ugyanaz a lista, mint az ErtesitesiBeallitas modellben
// Fontos, hogy ez a két lista mindig szinkronban legyen egymással
const ERTESITES_TIPUSOK = [
  'ujJavaslat',          // Új javaslat érkezett az entitásra
  'javaslatElfogadas',   // Javaslat végrehajtódott
  'javaslatElvetve',     // Javaslat nem lépett hatályba
  'szavazatErkezett',    // Valaki szavazott egy javaslatra
  'szavazasiHatarido',   // Szavazási határidő közeleg
  'tudatpontValtozas',   // Tudatpont elmozdulás történt az entitáson
  'ujGyerekEntitas',     // Új gyerek entitás jött létre az entitás alatt
  'kuszobValtozas',      // Az entitás érvényes küszöbértékei (mediánjai) változtak (V2)
];

// Az engedélyezett entitás típusok – szintén azonos az ErtesitesiBeallitas modellel
const ENTITAS_TIPUSOK = ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat', 'Egyezmeny'];

// Az Ertesites séma definiálása
// Minden rekord egy konkrét, már kiküldött értesítést jelent egy adott eEmbernek
const ertesitesSchema = new mongoose.Schema(
  {
    // Az eEmber azonosítója, akinek ez az értesítés szól
    eEmberId: {
      reteg: 'helyi',  // H6
      type: mongoose.Schema.Types.ObjectId,
      ref: 'eEmber',
      required: [true, 'Az eEmber azonosítója kötelező'],
    },

    // Az értesítés típusa – megmondja, mi történt
    tipus: {
      reteg: 'helyi',  // H6
      type: String,
      enum: {
        values: ERTESITES_TIPUSOK,
        message: 'Érvénytelen értesítési típus: {VALUE}',
      },
      required: [true, 'Az értesítés típusa kötelező'],
    },

    // Annak az entitásnak az azonosítója, amelyen az esemény történt
    entitasId: {
      reteg: 'helyi',  // H6
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Az entitás azonosítója kötelező'],
      // Nincs 'ref', mert különböző típusú entitásokra mutathat
    },

    // Az entitás típusa – megmondja, melyik kollekcióban keressük az entitasId-t
    entitasTipus: {
      reteg: 'helyi',  // H6
      type: String,
      enum: {
        values: ENTITAS_TIPUSOK,
        message: 'Érvénytelen entitás típus: {VALUE}',
      },
      required: [true, 'Az entitás típusa kötelező'],
    },

    // ===== ŐS-LÁNC =====
    // Az esemény entitásának teljes ős-lánca a fa gyökeréig, a keletkezés PILLANATÁBAN.
    // Az ELSŐ elem mindig maga az esemény entitása (entitasId + entitasTipus),
    // utána sorban a szülő, nagyszülő... egészen a gyökérig.
    // Célja: részfa-szűrés egyetlen lekérdezéssel — "minden értesítés, ami az X entitás
    // alatt (vagy magán X-en) történt" = { 'osLanc.entitasId': X }.
    // Ezt használja majd: a kártya-badge (A2) és az ág-szűrt kártya-postafiók (A3).
    osLanc: {
      reteg: 'helyi',  // H6
      type: [
        {
          _id: false, // Az al-dokumentumoknak nem kell saját _id
          entitasId: { type: mongoose.Schema.Types.ObjectId, required: true },
          entitasTipus: {
            type: String,
            enum: {
              values: ENTITAS_TIPUSOK,
              message: 'Érvénytelen entitás típus az ős-láncban: {VALUE}',
            },
            required: true,
          },
        },
      ],
      default: [],
    },

    // Esemény-specifikus adatok szabad formátumban
    // Pl. ujJavaslat esetén: { javaslatId: ObjectId, javaslatTipus: 'modositas' }
    // Pl. tudatpontValtozas esetén: { regiErtek: 5, ujErtek: 8, valtozas: 3 }
    // Pl. javaslatElfogadas esetén: { javaslatId: ObjectId }
    // Mixed típus: bármilyen objektumot tárolhat, nincs séma-kötöttsége
    adatok: {
      reteg: 'helyi',  // H6
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Alapból üres objektum
    },

    // Olvasott állapot – false: olvasatlan (piros pont), true: már látta az eEmber
    olvasva: {
      reteg: 'helyi',  // H6
      type: Boolean,
      default: false, // Minden új értesítés olvasatlanként jön létre
    },

    // Az olvasás időpontja – null amíg nem olvasta el
    olvasvaIdopont: {
      reteg: 'helyi',  // H6
      type: Date,
      default: null,
    },

    // ===== KIMENT-E MÁR LEVÉLBEN? =====
    // Az e-mailes kézbesítés nyilvántartása. Két dologra kell:
    //   - AZONNALI módban: ne menjen ki kétszer ugyanaz (pl. újrapróbálkozásnál),
    //   - ÖSSZEFOGLALÓ módban (5. lépés): ebből tudjuk, mi kerüljön a következő
    //     összefoglalóba — minden, ami még nem ment ki.
    // Ha az e-ember nem kér e-mailes értesítést, ez a mező egyszerűen false marad.
    emailKikuldve: {
      reteg: 'helyi',  // H6
      type: Boolean,
      default: false,
    },
  },
  {
    // timestamps: true automatikusan kezeli a createdAt és updatedAt mezőket
    // createdAt = az értesítés kiküldésének időpontja
    timestamps: true,
  }
);

// INDEX 1: Egy eEmber olvasatlan értesítéseinek gyors lekéréséhez
// Ez a leggyakoribb lekérdezés: "hány olvasatlan értesítésem van?"
ertesitesSchema.index({ eEmberId: 1, olvasva: 1 });

// INDEX 2: Egy eEmber összes értesítése időrendben (postafiók nézet)
// A -1 a createdAt-nél csökkenő sorrendet jelent (legújabb elöl)
ertesitesSchema.index({ eEmberId: 1, createdAt: -1 });

// INDEX 3: Egy konkrét entitáshoz kapcsolódó összes értesítés lekéréséhez
// Pl. ha törölni kell egy entitást, és az összes kapcsolódó értesítést is törölni kell
ertesitesSchema.index({ entitasId: 1, entitasTipus: 1 });

// INDEX 4: Részfa-szűréshez — egy eEmber olvasatlan értesítései egy adott entitás ága alatt.
// A tömb-mezőre tett index ún. "multikey index": a lánc MINDEN elemére keresést gyorsít,
// így a { eEmberId, olvasva, 'osLanc.entitasId': X } lekérdezés (kártya-badge) indexből fut.
ertesitesSchema.index({ eEmberId: 1, olvasva: 1, 'osLanc.entitasId': 1 });

// INDEX 5: E-mailben még ki nem küldött értesítések egy eEmberhez.
// Használat: az összefoglaló-küldő (5. lépés) ezzel gyűjti össze, mi kerüljön a
// következő levélbe. Az időrend a levélen belüli sorrendhez kell.
ertesitesSchema.index({ eEmberId: 1, emailKikuldve: 1, createdAt: 1 });
// ===== H6 — ADAT-OSZTÁLYOZÁS: ALAPÉRTELMEZETT RÉTEG =====
// A mezők a saját `reteg` opciójukban hordozzák a besorolásukat (lásd fentebb).
// A Mongoose által AUTOMATIKUSAN felvett mezőkre (_id, createdAt, updatedAt) viszont
// nem tudunk mező-opciót tenni — rájuk ez az alapértelmezés vonatkozik.
// A működésre nincs hatása: a Mongoose ezt az opciót megőrzi, de nem használja.
// Magyarázat és a teljes besorolás: docs/adat_osztalyozas.md (H6 híd-feladat).
ertesitesSchema.options.retegAlapertelmezes = 'helyi';

// A modell exportálása
// Az első paraméter ('Ertesites') lesz a MongoDB kollekció neve (kisbetűsítve: ertesites)
module.exports = mongoose.model('Ertesites', ertesitesSchema);