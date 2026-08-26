// backend/tools/retegEllenorzes.js

// Felelősség: az ADAT-OSZTÁLYOZÁS (H6) ellenőrzése — végigmegy az összes Mongoose
// modellen, és megmutatja, hogy melyik mező melyik RÉTEGBE tartozik, illetve mely
// mezők maradtak BESOROLATLANUL.
//
// Miért kell (H6, Fázis 2 Szakasz 0): a besorolás a `docs/adat_osztalyozas.md`-ben él
// emberi olvasatként, a kódban pedig séma-opcióként (`reteg`, `szemelyes`). Két helyen
// tárolt tudás mindig szétcsúszik — hacsak nincs valami, ami észreveszi. Ez az a valami:
// egy ÚJ MEZŐ, amit valaki besorolás nélkül vesz fel, itt azonnal látszik.
//
// A besorolás a működésre SEMMILYEN hatással nincs: a Mongoose az ismeretlen
// séma-opciókat megőrzi, de nem használja. Ez az eszköz is csak OLVAS — adatbázis-
// kapcsolatot sem nyit (a séma-definíció önmagában elég hozzá).
//
// Használat:
//   node backend/tools/retegEllenorzes.js          → összefoglaló + a besorolatlanok
//   node backend/tools/retegEllenorzes.js --mind   → minden mező felsorolása rétegenként
//
// Kilépési kód: 0 = minden mező besorolva, 1 = van besorolatlan (így CI-ben is használható)
//
// Használják: a fejlesztő kézzel; hivatkozik rá a docs/adat_osztalyozas.md.

const fs = require('fs');
const path = require('path');

// ===================================
// ÁLLANDÓK
// ===================================

// A modellek mappája (ehhez a fájlhoz képest: ../models)
const MODELL_MAPPA = path.join(__dirname, '..', 'models');

// Az öt érvényes réteg (docs/adat_osztalyozas.md). Más érték HIBA.
const ERVENYES_RETEGEK = ['mag', 'lanc', 'tartalom', 'szamitott', 'helyi'];

// Rövid emlékeztető a rétegekhez — a kimenetben segít, hogy ne kelljen a doksit nyitni
const RETEG_LEIRAS = {
  mag:       'tartós mag — az elfelejtése maga a csalás (D14)',
  lanc:      'saját aláírt eseménylánc — nem kell globális egyetértés (D17)',
  tartalom:  'tudatpont-replikált, elfelejthető (D3/D14)',
  szamitott: 'determinisztikusan újraszámolható — nem igazságforrás (D17)',
  helyi:     'soha nem hagyja el a szervert/készüléket'
};

// A Mongoose által AUTOMATIKUSAN létrehozott mezők: ezeket nem mi definiáljuk,
// ezért nem tudunk rájuk mező-szintű opciót tenni. Rájuk a séma-szintű
// `retegAlapertelmezes` opció vonatkozik (lásd a modellek séma-opcióit).
const AUTOMATIKUS_MEZOK = ['_id', 'createdAt', 'updatedAt'];

// Amit egyáltalán nem vizsgálunk (a Mongoose belső verzió-számlálója)
const KIHAGYOTT_MEZOK = ['__v'];

// ===================================
// SEGÉDFÜGGVÉNYEK
// ===================================

// ----- A MODELLEK BETÖLTÉSE -----
// Az export lehet MODELL (van .schema) vagy önmagában egy SÉMA (al-sémák, pl.
// szerkesztoResz.js) — mindkettőt kezeljük.
// @returns {Array<{fajl: string, sema: Object}>}
function modellekBetoltese() {
  console.log('retegEllenorzes.modellekBetoltese - KEZDÉS', { mappa: MODELL_MAPPA });

  const fajlok = fs.readdirSync(MODELL_MAPPA).filter((f) => f.endsWith('.js'));
  const eredmeny = [];

  for (const fajl of fajlok) {
    const exportalt = require(path.join(MODELL_MAPPA, fajl));
    // Modell esetén az .schema-t, séma-export esetén magát az objektumot használjuk
    const sema = exportalt && exportalt.schema
      ? exportalt.schema
      : (exportalt && typeof exportalt.eachPath === 'function' ? exportalt : null);

    if (!sema) {
      console.log('  ⚠️  kihagyva (nem séma és nem modell):', fajl);
      continue;
    }

    eredmeny.push({ fajl, sema });
  }

  console.log('retegEllenorzes.modellekBetoltese - VÉGE', { darab: eredmeny.length });
  return eredmeny;
}

// ----- EGY SÉMA MEZŐINEK BESOROLÁSA -----
// Végigmegy a séma összes útvonalán, és minden mezőről eldönti, besorolt-e.
// @param {Object} sema - Mongoose séma
// @param {string} fajl - a fájl neve (a jelentéshez)
// @returns {{besoroltak: Array, besorolatlanok: Array, hibasak: Array}}
function semaBesorolasa(sema, fajl) {
  const besoroltak = [];
  const besorolatlanok = [];
  const hibasak = [];

  // A séma-szintű alapértelmezés az automatikus mezőkre (_id, createdAt, updatedAt)
  const alapertelmezes = sema.options ? sema.options.retegAlapertelmezes : undefined;

  sema.eachPath((utvonal, tipus) => {
    if (KIHAGYOTT_MEZOK.includes(utvonal)) return;

    const opciok = tipus.options || {};
    const automatikus = AUTOMATIKUS_MEZOK.includes(utvonal);

    // ----- TÖMB-ELEMEN JELÖLT MEZŐ -----
    // Ha a mező tömb-literállal készült (`mezo: [{ ... }]`), a `reteg` opciót az
    // ELEM definíciója hordozza — a Mongoose ezt a "caster"-ben tartja.
    const casterReteg = tipus.caster && tipus.caster.options
      ? tipus.caster.options.reteg
      : undefined;

    // ----- MAP ÉRTÉKTÍPUS (`mezo.$*`) -----
    // Egy Map-mezőnél a Mongoose felvesz egy `.$*` útvonalat is (az ÉRTÉKEK típusa).
    // Ezt nem tudjuk külön jelölni, és nem is kell: a szülő mező besorolása érvényes rá.
    let szuloReteg;
    if (utvonal.endsWith('.$*')) {
      const szuloUtvonal = utvonal.slice(0, -3);
      const szuloTipus = sema.path(szuloUtvonal);
      szuloReteg = szuloTipus && szuloTipus.options ? szuloTipus.options.reteg : undefined;
    }

    // A mező saját besorolása, vagy — sorrendben — a tömb-elemé, a Map-szülőé,
    // illetve automatikus mezőnél a séma alapértelmezése
    const reteg = opciok.reteg !== undefined
      ? opciok.reteg
      : (casterReteg !== undefined
        ? casterReteg
        : (szuloReteg !== undefined
          ? szuloReteg
          : (automatikus ? alapertelmezes : undefined)));

    const bejegyzes = {
      fajl,
      utvonal,
      reteg,
      szemelyes: opciok.szemelyes === true,
      oroklott: opciok.reteg === undefined
    };

    if (reteg === undefined) {
      besorolatlanok.push(bejegyzes);
    } else if (!ERVENYES_RETEGEK.includes(reteg)) {
      hibasak.push(bejegyzes);
    } else {
      besoroltak.push(bejegyzes);
    }
  });

  return { besoroltak, besorolatlanok, hibasak };
}

// ===================================
// FŐ FUTÁS
// ===================================

function futtatas() {
  console.log('');
  console.log('===== ADAT-OSZTÁLYOZÁS ELLENŐRZÉSE (H6) =====');
  console.log('A besorolás forrása: docs/adat_osztalyozas.md');
  console.log('');

  const mindenMezoKiirasa = process.argv.includes('--mind');
  const modellek = modellekBetoltese();

  // Gyűjtők az összesítéshez
  const osszesBesorolt = [];
  const osszesBesorolatlan = [];
  const osszesHibas = [];

  for (const { fajl, sema } of modellek) {
    const { besoroltak, besorolatlanok, hibasak } = semaBesorolasa(sema, fajl);
    osszesBesorolt.push(...besoroltak);
    osszesBesorolatlan.push(...besorolatlanok);
    osszesHibas.push(...hibasak);
  }

  const osszesMezo = osszesBesorolt.length + osszesBesorolatlan.length + osszesHibas.length;

  // ----- MINDEN MEZŐ FELSOROLÁSA (csak --mind kapcsolóval) -----
  if (mindenMezoKiirasa) {
    for (const reteg of ERVENYES_RETEGEK) {
      const mezok = osszesBesorolt.filter((m) => m.reteg === reteg);
      console.log('');
      console.log('----- ' + reteg.toUpperCase() + ' (' + mezok.length + ') — ' + RETEG_LEIRAS[reteg] + ' -----');
      for (const m of mezok) {
        const jelolok = (m.szemelyes ? ' [SZEMÉLYES]' : '') + (m.oroklott ? ' (öröklött)' : '');
        console.log('  ' + m.fajl.replace('.js', '') + '.' + m.utvonal + jelolok);
      }
    }
    console.log('');
  }

  // ----- ÖSSZEFOGLALÓ RÉTEGENKÉNT -----
  console.log('----- ÖSSZEFOGLALÓ -----');
  for (const reteg of ERVENYES_RETEGEK) {
    const darab = osszesBesorolt.filter((m) => m.reteg === reteg).length;
    const szazalek = osszesMezo ? Math.round((darab / osszesMezo) * 100) : 0;
    console.log('  ' + reteg.padEnd(10) + darab.toString().padStart(4) + ' mező  (' + szazalek + '%)  — ' + RETEG_LEIRAS[reteg]);
  }

  const szemelyesek = osszesBesorolt.filter((m) => m.szemelyes);
  console.log('');
  console.log('  Ebből SZEMÉLYES (D6): ' + szemelyesek.length + ' mező');
  for (const m of szemelyesek) {
    console.log('    - ' + m.fajl.replace('.js', '') + '.' + m.utvonal + ' (' + m.reteg + ')');
  }

  // ----- HIBÁS BESOROLÁSOK -----
  if (osszesHibas.length) {
    console.log('');
    console.log('❌ ÉRVÉNYTELEN RÉTEG-ÉRTÉK (' + osszesHibas.length + ' mező):');
    console.log('   Érvényes értékek: ' + ERVENYES_RETEGEK.join(', '));
    for (const m of osszesHibas) {
      console.log('    - ' + m.fajl.replace('.js', '') + '.' + m.utvonal + ' → "' + m.reteg + '"');
    }
  }

  // ----- BESOROLATLANOK -----
  console.log('');
  if (osszesBesorolatlan.length === 0) {
    console.log('✅ MINDEN MEZŐ BESOROLVA (' + osszesMezo + ' mező, ' + modellek.length + ' séma)');
  } else {
    console.log('⚠️  BESOROLATLAN MEZŐK (' + osszesBesorolatlan.length + ' / ' + osszesMezo + '):');
    console.log('   Vedd fel a `reteg` opciót a séma-definícióba, és vezesd át a');
    console.log('   docs/adat_osztalyozas.md táblázatába is.');
    console.log('');

    // Fájlonként csoportosítva olvashatóbb
    const fajlonkent = {};
    for (const m of osszesBesorolatlan) {
      if (!fajlonkent[m.fajl]) fajlonkent[m.fajl] = [];
      fajlonkent[m.fajl].push(m.utvonal);
    }
    for (const fajl of Object.keys(fajlonkent)) {
      console.log('  ' + fajl + ':');
      for (const utvonal of fajlonkent[fajl]) {
        console.log('      ' + utvonal);
      }
    }
  }

  console.log('');
  process.exit(osszesBesorolatlan.length === 0 && osszesHibas.length === 0 ? 0 : 1);
}

futtatas();
