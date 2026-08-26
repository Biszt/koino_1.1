// backend/models/tartalom.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// A szerkesztő-elem közös al-sémája (eemberId + allapot + eredeti)
const szerkesztoResz = require('./szerkesztoResz');

// A különválás-elem közös al-sémája (testverId + agSzerep + forrás-javaslat/egyezmény)
const kulonvalasResz = require('./kulonvalasResz');

// ===== TARTALOM SÉMA DEFINIÁLÁSA =====
// A Schema meghatározza a tartalom adatszerkezetét és validációs szabályokat
const tartalomSchema = new mongoose.Schema({

// ----- CÍM MEZŐ -----
// A tartalom címe (kötelező)
cim: {
  reteg: 'tartalom',  // H6
    type: String,       // Szöveges típus
    required: true,     // Kötelező mező
    trim: true          // Levágja a felesleges szóközöket elejéről és végéről
},

// ----- SZÖVEG MEZŐ -----
// A tartalom gazdag szöveges tartalma (opcionális)
// MÓDOSÍTVA: String helyett Mixed típus, mert a SzovegSzerkeszto
// komponens egy JSON blokkokból álló tömböt tárol ide
szoveg: {
  reteg: 'tartalom',  // H6
    type: mongoose.Schema.Types.Mixed, // Vegyes típus: JSON tömböt fogad a szövegszerkesztőtől
    required: false,                   // Nem kötelező mező
    default: null                      // Alapértelmezett érték: null (üres string helyett)
},

// ----- TARTALOM TÍPUS AZONOSÍTÓ -----
// Referencia a TartalomTipus modellre (pl. poszt, komment, stb.)
tartalomTipusId: {
  reteg: 'tartalom',  // H6
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    ref: 'TartalomTipus',                 // Referencia a TartalomTipus modellre
    required: false                        // Nem kötelező mező
},

// ----- KATEGÓRIA AZONOSÍTÓK (MAXIMUM 3) -----
// Tömb, amely maximum 3 kategória referenciát tárolhat
kategoriaIds: {
  reteg: 'tartalom',  // H6
    type: [{                                  // ObjectId tömb típus
        type: mongoose.Schema.Types.ObjectId, // Tömb elemek típusa: ObjectId
        ref: 'Kategoria'                      // Referencia a Kategoria modellre
    }],
    default: [],     // Alapértelmezett: üres tömb
    validate: {      // Egyéni validáció
        validator: function(kategoriak) {
            // 1. Maximum 3 kategória lehet
            if (kategoriak.length > 3) {
                return false;
            }
            // 2. Ellenőrizzük, hogy nincsenek duplikációk
            const egyediKategoriak = new Set(kategoriak.map(k => k.toString()));
            return egyediKategoriak.size === kategoriak.length;
        },
        message: 'Maximum 3 különböző kategória rendelhető egy tartalomhoz.'
    }
},

// ----- SZÜLŐ TARTALOM AZONOSÍTÓ -----
// MÓDOSÍTVA: Bármelyik entitástípus lehet szülő – Tartalom, Javaslat, Egyezmény,
// valamint Kategória és Tartalomtípus is (az „Új tartalom létrehozása ebből”
// menüpont mind az öt kártyatípusról ágaztathat).
szuloId: {
  reteg: 'tartalom',  // H6
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus - bármilyen entitás lehet
    default: null                          // Alapértelmezett: nincs szülő (főtartalom)
},

// ----- SZÜLŐ TÍPUSA -----
szuloTipus: {
  reteg: 'tartalom',  // H6
    type: String,                                                          // Szöveges típus
    enum: ['Tartalom', 'Javaslat', 'Egyezmeny', 'Kategoria', 'TartalomTipus'], // Engedélyezett értékek
    default: null,                                                         // Alapértelmezett: nincs szülő típus
    validate: {
        validator: function(value) {
            // A szuloId értékének meghatározása a kontextustól függ:
            // - dokumentum mentésekor (save/create) a this maga a dokumentum
            // - findByIdAndUpdate + runValidators esetén a this a query,
            //   ilyenkor az update objektumból kell kiolvasni a szuloId-t
            let szuloIdErtek;

            if (this && typeof this.getUpdate === 'function') {
                // Update validátor: a query update objektumából olvasunk
                const frissites = this.getUpdate() || {};
                const setMezok = frissites.$set || frissites;

                if (!('szuloId' in setMezok)) {
                    // Ha az update nem tartalmazza a szuloId-t, a konzisztencia
                    // itt nem ellenőrizhető megbízhatóan — engedjük tovább
                    return true;
                }
                szuloIdErtek = setMezok.szuloId;
            } else {
                // Dokumentum validátor: közvetlenül a dokumentumból olvasunk
                szuloIdErtek = this.szuloId;
            }

            // Ha van szuloId, akkor szuloTipus kötelező
            if (szuloIdErtek && !value) {
                return false;
            }
            // Ha nincs szuloId, akkor szuloTipus nem lehet
            if (!szuloIdErtek && value) {
                return false;
            }
            return true;
        },
        message: 'A szuloId és szuloTipus mezők konzisztenciája sérült. Ha van szuloId, akkor szuloTipus is kötelező, és fordítva.'
    }
},

// ----- SZERKESZTŐK -----
// Kik szerkesztették ezt a tartalmat. Egy tartalomnak TÖBB szerkesztője lehet:
// az eredeti létrehozó + mindenki, akinek elfogadott MÓDOSÍTÁSI javaslata
// ténylegesen módosította a tartalmat.
// Sorrend: időrendben VISSZAFELÉ — a 0. elem a LEGUTOLSÓ szerkesztő,
// a lista vége felé az eredeti létrehozó (kivéve ha ő módosított utoljára).
// (A régi egyszeres `letrehozo` mező helyére lépett.)
szerkesztok: {
  reteg: 'lanc',  // H6
    type: [szerkesztoResz],   // A közös szerkesztő al-séma tömbje
    default: []               // Alap: üres tömb
},

// ----- KÜLÖNVÁLÁSOK -----
// Ha ez a tartalom valamikor kettévált (vagy egy szétválásból született), itt
// vannak a testvér-ágai — eseményenként egy bejegyzés. Üres tömb = ez a tartalom
// még sosem vált szét, és nem is szétválásból származik (a legtöbb tartalom ilyen).
//
// Egy szétváláskor MINDKÉT entitás kap egy bejegyzést, egymásra mutatva; az elem
// `agSzerep` mezője mondja meg, melyik oldalon állunk (főág vagy különvált ág).
// A mező szerkezetét és a fogalmat a models/kulonvalasResz.js írja le.
//
// FIGYELEM: ezt a mezőt ma még SEMMI nem tölti fel — a szétosztás motorja külön
// lépésben épül (docs/fejlesztesi_terv.md „Különválás — megvalósítási terv").
// Ez a lépés csak a HELYET készíti elő.
kulonvalasok: {
  reteg: 'tartalom',  // H6
    type: [kulonvalasResz],   // A közös különválás al-séma tömbje
    default: []               // Alap: üres tömb (nincs testvér-ág)
},

// ----- LÉTREHOZÁS DÁTUMA -----
// Amikor a tartalom létrejött
letrehozva: {
  reteg: 'tartalom',  // H6
    type: Date,         // Dátum típus
    default: Date.now   // Alapértelmezett: jelenlegi időpont
},

// ----- UTOLSÓ (TARTALMI) MÓDOSÍTÁS DÁTUMA -----
// A cím/szöveg LEGUTÓBBI tartalmi módosítása egy elfogadott Módosítás-egyezmény
// által. Létrehozáskor = letrehozva; CSAK tartalmi módosítás (Modositas) frissíti,
// áthelyezés/egyesítés/tudatpont NEM. A kártya ezt a dátumot mutatja (a „létrehozás
// VAGY utolsó módosítás" egyetlen mezővel lefedve); a gyerek↔szülő összevetés ebből
// dönti el, elavulhat-e a gyerek (piros = régebbi, zöld = újabb).
modositva: {
  reteg: 'tartalom',  // H6
    type: Date,
    default: Date.now
}

});

// ===== INDEXEK LÉTREHOZÁSA =====
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Tartalom típus indexelése - gyors szűrés típus szerint
tartalomSchema.index({ tartalomTipusId: 1 });

// Szülő tartalom indexelése - gyors lekérdezés válaszok/kommentek esetén
tartalomSchema.index({ szuloId: 1 });

// Gyors keresés: "Egy javaslat alatti összes tartalom"
tartalomSchema.index({ szuloId: 1, szuloTipus: 1 });

// Szerkesztő indexelése - gyors keresés "mely tartalmakat szerkesztette egy e-ember"
tartalomSchema.index({ 'szerkesztok.eemberId': 1 });

// Testvér-ág indexelése - gyors keresés "melyik tartalom mutat erre az entitásra"
// Használat: a másik ág felől visszakeresés (pl. törléskor a testvér bejegyzésének
// karbantartása), és a szétválás-láncok bejárása. Ritka lekérdezés, de index nélkül
// teljes kollekció-bejárás lenne — több millió entitásra tervezünk.
tartalomSchema.index({ 'kulonvalasok.testverId': 1 });

// Kategória indexelése - gyors kategória szerinti szűrés (tömb elemek indexelése)
tartalomSchema.index({ kategoriaIds: 1 });
// ===== H6 — ADAT-OSZTÁLYOZÁS: ALAPÉRTELMEZETT RÉTEG =====
// A mezők a saját `reteg` opciójukban hordozzák a besorolásukat (lásd fentebb).
// A Mongoose által AUTOMATIKUSAN felvett mezőkre (_id, createdAt, updatedAt) viszont
// nem tudunk mező-opciót tenni — rájuk ez az alapértelmezés vonatkozik.
// A működésre nincs hatása: a Mongoose ezt az opciót megőrzi, de nem használja.
// Magyarázat és a teljes besorolás: docs/adat_osztalyozas.md (H6 híd-feladat).
tartalomSchema.options.retegAlapertelmezes = 'tartalom';

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
// A model a séma alapján létrehozott adatbázis kollekció
// 'Tartalom' = model neve, tartalomSchema = séma definíció
const Tartalom = mongoose.model('Tartalom', tartalomSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = Tartalom;