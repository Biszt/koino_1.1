// backend/services/kulonvalasService.js

// ===================================
// KÜLÖNVÁLÁS SERVICE
// ===================================
// Felelősség: egy lezárt módosítási döntés után KETTÉVÁLASZTANI egy tartalmat —
//   a főágra és a különvált ágra —, és a tudatpontokat a két ág között SZÉTOSZTANI.
// Használják: (később) a javaslatVegrehajtasiService és a javaslatIdozitesService;
//   most még csak a fejlesztői próba-eszköz (tools/kulonvalasProba.js).
//
// ===== MIÉRT NEM JAVASLAT-VÉGREHAJTÓ? =====
// A `vegrehajtok/` mappa lakói egy-egy javaslat-TÍPUS végrehajtói (Törlés, Módosítás,
// Egyesítés, Áthelyezés, Csomag). A különválás NEM javaslat-típus: nincs olyan, hogy
// „különválási javaslat". Ez egy MÁR MEGSZÜLETETT döntés utóhatása, ami elfogadás és
// elvetés esetén EGYARÁNT bekövetkezhet. Ezért önálló service, a gyökér-mappában.
//
// ===== A SZABÁLY, AMIBŐL MINDEN KÖVETKEZIK =====
//   „Minden kapcsolódó entitás oda kerül, ahol tudatpontja van annak, aki különválik."
// A művelet tehát NEM másolás, hanem SZÉTOSZTÁS a súlyok mentén.
// A teljes modell és a döntések: docs/fejlesztesi_terv.md „Különválás" szakaszai.
//
// ===== A MŰVELET KÉT FELE =====
//  3/a: a GYÖKÉR szétválasztása — az érintett tartalom kettéválik, és a különválók
//       tudatpontjai átkerülnek az új ágra.
//  3/b: a LESZÁRMAZOTTAK szétosztása — minden leszármazottnál három kimenet lehet
//       (marad / átköltözik / megkettőződik), az egységes szabály szerint.
//
// ===== HATÓKÖR: CSAK TARTALOM =====
// A bejárás kizárólag TARTALOM-leszármazottakat oszt szét (C döntés). Az entitás alatt
// élő javaslatok és egyezmények a helyükön maradnak: a javaslat egy FOLYAMATBAN lévő
// döntés (mozgatása félbevágná), az egyezmény pedig a `tudatpontHozzarendeles`
// entitás-típus enumjának hiánya miatt még nem mozgatható biztonságosan.
//
// ===== NINCS ADATBÁZIS-TRANZAKCIÓ =====
// A MongoDB itt önálló példányként fut (nem replikahalmaz), ezért valódi tranzakció
// nincs. Ha a művelet félbeszakad, tudatpont NEM vész el (a forrásról levett pont
// visszakerül az e-emberhez), de a szétválás félkész maradhat. Ezért minden lépés
// naplózva van, és a sorrend úgy van megválasztva, hogy a legkevésbé visszafordíthatatlan
// dolog történjen a legkésőbb.

// ===== IMPORTOK =====

// Repository-k
const TartalomRepository = require('../repositories/tartalomRepository');
const TudatpontRepository = require('../repositories/tudatpontRepository');
// A pakli-fa (hierarchikus) allokáció — a leszármazottak átkötéséhez
const HierarchikusTudatpontAllokaciRepository = require('../repositories/hierarchikusTudatpontAllokaciRepository');
// Érték javaslatok — a különválók sajátjai átvándorolnak az új ágra (8. döntés)
const ErtekJavaslatRepository = require('../repositories/ertekJavaslatRepository');

// Service-ek
const TartalomService = require('./tartalomService');
const TudatpontService = require('./tudatpontService');
// Hierarchikus pont-újraszámítás és ős-lánc karbantartás az átkötések után
const HierarchikusFrissitesService = require('./hierarchikusFrissitesService');
const OsLancKarbantartoService = require('./osLancKarbantartoService');
// Küszöb-hisztogram karbantartása az érték javaslatok mozgatásakor
const ErtekSzamitasService = require('./ertekSzamitasService');

// ===================================
// KÜLÖNVÁLÁS SERVICE OSZTÁLY
// ===================================
class KulonvalasService {

  // ===================================
  // A GYÖKÉR SZÉTVÁLASZTÁSA
  // ===================================
  /**
   * Egy tartalom kettéválasztása: a különválók viszik a saját tudatpontjukat egy ÚJ ágra.
   *
   * @param {Object} parameterek
   * @param {string} parameterek.forrasEntitasId    - A szétváló (fő)ág azonosítója
   * @param {string} [parameterek.forrasEntitasTipus='Tartalom'] - Egyelőre CSAK 'Tartalom'
   * @param {Array<string>} parameterek.kulonvaloEemberIdk - Kik válnak külön
   * @param {Object} parameterek.ujAgAdatok         - { cim, szoveg } — amit a különválók visznek
   * @param {string} parameterek.forrasJavaslatId   - A kiváltó javaslat (mindig kell)
   * @param {string} [parameterek.forrasEgyezmenyId=null] - A kiváltó egyezmény (csak elfogadásnál)
   * @param {Array} [parameterek.szavazatok=[]] - A kiváltó javaslat szavazatai (a szerkesztő-állapotokhoz)
   * @param {string|null} [parameterek.kulonvaloOldalSzavazata=null] - 'Ellenez' | 'Tamogat':
   *        MELYIK oldal válik külön. Ebből dől el, kinek a neve zöld és kinek piros az új ágon.
   * @returns {Promise<Object>} A szétválás eredménye (mérhető számokkal)
   */
  async kulonvalasVegrehajtasa({
    forrasEntitasId,
    forrasEntitasTipus = 'Tartalom',
    kulonvaloEemberIdk,
    ujAgAdatok,
    forrasJavaslatId,
    forrasEgyezmenyId = null,
    szavazatok = [],
    kulonvaloOldalSzavazata = null
  }) {
    console.log('kulonvalasVegrehajtasa - KEZDÉS', {
      forrasEntitasId,
      forrasEntitasTipus,
      kulonvalokSzama: Array.isArray(kulonvaloEemberIdk) ? kulonvaloEemberIdk.length : 0,
      forrasJavaslatId,
      forrasEgyezmenyId
    });

    // ============================================================
    // ===== 1. LÉPÉS - BEMENET ELLENŐRZÉSE =====
    // ============================================================

    if (!forrasEntitasId) {
      throw new Error('A forrás entitás azonosítója kötelező');
    }

    // Az első kör hatóköre: CSAK tartalom (C döntés, 2026-08-25). A kategória és a
    // tartalomtípus különválása külön kör — ott saját hierarchia-szabályok vannak.
    if (forrasEntitasTipus !== 'Tartalom') {
      throw new Error(`A különválás egyelőre csak Tartalom entitásra működik (kapott: ${forrasEntitasTipus})`);
    }

    if (!Array.isArray(kulonvaloEemberIdk) || kulonvaloEemberIdk.length === 0) {
      throw new Error('Legalább egy különváló e-ember megadása kötelező');
    }

    if (!forrasJavaslatId) {
      throw new Error('A kiváltó javaslat azonosítója kötelező (ez a különvált ág horgonya)');
    }

    if (!ujAgAdatok || !ujAgAdatok.cim || !String(ujAgAdatok.cim).trim()) {
      throw new Error('Az új ág adatai (legalább a cím) kötelezők');
    }

    // ============================================================
    // ===== 2. LÉPÉS - A FORRÁS TARTALOM BETÖLTÉSE =====
    // ============================================================
    // A szülőt, a kategóriákat és a típust az új ág is átveszi: a két ág TESTVÉR
    // lesz a fában (ugyanaz a szülő), hiszen ugyanannak a tartalomnak a két útja.

    console.log('kulonvalasVegrehajtasa >>>>> TartalomRepository.findById', { forrasEntitasId });
    const forrasTartalom = await TartalomRepository.findById(forrasEntitasId);

    if (!forrasTartalom) {
      throw new Error(`A forrás tartalom nem található: ${forrasEntitasId}`);
    }

    // ============================================================
    // ===== 3. LÉPÉS - KI MENNYI PONTOT VISZ? (CSAK LEKÉRDEZÉS) =====
    // ============================================================
    // Fontos: MIELŐTT bármit módosítanánk, felmérjük a teljes képet. Ugyanaz az elv,
    // mint az egyesítésnél: előbb összesítünk, aztán nyúlunk hozzá bármihez.

    console.log('kulonvalasVegrehajtasa >>>>> TudatpontRepository.findHozzarendelesekByEntitasNyers', {
      forrasEntitasId
    });

    const osszesHozzarendeles = await TudatpontRepository.findHozzarendelesekByEntitasNyers(
      forrasEntitasId,
      'Tartalom',
      999999,  // Nagy limit - az ÖSSZES tudatpont-tulajdonos kell
      0
    );

    // A különválók halmaza (gyors kereséshez)
    const kulonvalokHalmaz = new Set(kulonvaloEemberIdk.map((id) => id.toString()));

    // Szétválogatjuk: ki megy, ki marad
    const viszik = [];   // [{ eemberIdStr, pontok }] — a különválók, akiknek VAN pontja
    let maradoPontok = 0;   // Ami a főágon marad (a nem-különválóké)
    let vittPontokOsszesen = 0;

    for (const hozzarendeles of osszesHozzarendeles) {
      const eemberIdStr = hozzarendeles.eemberId.toString();
      const pontok = hozzarendeles.tudatPontok;

      if (kulonvalokHalmaz.has(eemberIdStr)) {
        viszik.push({ eemberIdStr, pontok });
        vittPontokOsszesen += pontok;
      } else {
        maradoPontok += pontok;
      }
    }

    // Determinisztikus sorrend: legtöbb pont előre, egyenlőségnél az azonosító dönt.
    // MIÉRT KELL KIMONDANI? Mert az első elem lesz az „alapító" (lásd 5. lépés), és
    // adatbázis-sorrendre bízva ugyanaz a bemenet MÁS eredményt adhatna futásonként.
    viszik.sort((a, b) => {
      if (b.pontok !== a.pontok) return b.pontok - a.pontok;
      return a.eemberIdStr.localeCompare(b.eemberIdStr);
    });

    console.log('kulonvalasVegrehajtasa - Felmérés kész', {
      osszesTulajdonos: osszesHozzarendeles.length,
      kulonvalokAkiknekVanPontja: viszik.length,
      vittPontokOsszesen,
      maradoPontok
    });

    // ----- 3.A - VAN-E EGYÁLTALÁN MIT SZÉTVÁLASZTANI? -----
    if (viszik.length === 0) {
      throw new Error('Egyetlen különválónak sincs tudatpontja ezen a tartalmon — nincs mit átvinni');
    }

    // ----- 3.B - A FŐÁG NEM ESHET 0-RA -----
    // Ez nem óvatoskodás, hanem a modell ellenőrzése: szavazni CSAK az tud, akinek van
    // pontja az érintett entitáson, a döntés győztes oldalán pedig szükségszerűen van
    // szavazó. Ha tehát a főág mégis 0-ra esne, az azt jelenti, hogy a hívó rosszul
    // állította össze a különválók listáját — jobb hangosan elakadni, mint némán
    // törölni a főágat (a 0-pontos entitás automatikusan törlődik).
    if (maradoPontok === 0) {
      throw new Error(
        'A főág 0 tudatpontra esne — ez valódi szavazásból nem következhet be. ' +
        'A különválók listája valószínűleg hibás (mindenki szerepel benne).'
      );
    }

    // ============================================================
    // ===== 4. LÉPÉS - AZ ALAPÍTÓ KIVÁLASZTÁSA =====
    // ============================================================
    // Az új tartalom létrehozásához KELL egy létrehozó, mégpedig legalább 1 tudatponttal
    // (TartalomService.tartalomLetrehozasa megköveteli). Az „alapító" a legtöbb pontot
    // vivő különváló. Ez technikai szerep: nem ad neki többletjogot a döntésekben —
    // szavazásnál mindenki egyenlő.

    const alapito = viszik[0];
    const tobbiek = viszik.slice(1);

    console.log('kulonvalasVegrehajtasa - Alapító kiválasztva', {
      alapitoId: alapito.eemberIdStr,
      alapitoPontjai: alapito.pontok,
      tobbiekSzama: tobbiek.length
    });

    // ============================================================
    // ===== 5. LÉPÉS - AZ ALAPÍTÓ PONTJÁNAK LEVÉTELE A FORRÁSRÓL =====
    // ============================================================
    // KÉNYSZERŰ SORREND: az új tartalom létrehozásához az alapítónak SZABAD pontja kell.
    // A pont viszont most a forráson ül. Előbb tehát le kell venni onnan (ilyenkor
    // visszakerül az e-ember egyenlegére), és csak utána lehet az új ágra tenni.
    // Ugyanezt a kényszert kezeli az egyesítési végrehajtó is (4. → 5. lépés).
    //
    // Ha a következő lépés (létrehozás) elhasalna, a pont NEM vész el: az alapítónál
    // marad, szabadon. A szétválás ilyenkor nem történik meg — ez a legkevésbé rossz
    // félbeszakadás.

    console.log('kulonvalasVegrehajtasa >>>>> TudatpontService.tudatpontHozzarendelese (alapító, forrás nullázás)', {
      eemberId: alapito.eemberIdStr,
      forrasEntitasId
    });

    await TudatpontService.tudatpontHozzarendelese(
      alapito.eemberIdStr,
      forrasEntitasId,
      'Tartalom',
      0   // 0 = visszavonás → a pont visszakerül az e-emberhez
    );

    // ============================================================
    // ===== 6. LÉPÉS - AZ ÚJ ÁG LÉTREHOZÁSA =====
    // ============================================================
    // Az új tartalom a forrás TESTVÉRE lesz (ugyanaz a szülő), és átveszi a forrás
    // besorolását (kategóriák, tartalomtípus). A CÍM és a SZÖVEG viszont az, amit a
    // különválók visznek magukkal — elfogadott javaslatnál a RÉGI, elvetettnél a
    // MÓDOSÍTOTT állapot.
    //
    // KÜSZÖBÉRTÉKEK: az új ág egyelőre az ALAPÉRTELMEZETT küszöbökkel indul. A
    // különválók saját érték javaslatainak átvitele külön lépés (a terv 6. lépése) —
    // ott derül ki, hogy a `tartalomLetrehozasa` által az alapítónak létrehozott
    // kezdő érték javaslatot FRISSÍTENI kell majd, nem újat létrehozni mellé.

    const ujAgLetrehozasiAdatok = {
      cim: String(ujAgAdatok.cim).trim(),
      szoveg: ujAgAdatok.szoveg !== undefined ? ujAgAdatok.szoveg : null,
      szuloId: forrasTartalom.szuloId ?? null,
      szuloTipus: forrasTartalom.szuloTipus ?? null,
      tartalomTipusId: forrasTartalom.tartalomTipusId ?? null,
      // A findById populate-eli a kategóriákat, ezért lehet objektum is — csak az ID kell
      kategoriaIds: (forrasTartalom.kategoriaIds ?? []).map((k) => (k?._id ?? k).toString())
    };

    console.log('kulonvalasVegrehajtasa >>>>> TartalomService.tartalomLetrehozasa', {
      cim: ujAgLetrehozasiAdatok.cim,
      szuloId: ujAgLetrehozasiAdatok.szuloId,
      alapitoPontjai: alapito.pontok
    });

    const ujAg = await TartalomService.tartalomLetrehozasa(
      ujAgLetrehozasiAdatok,
      alapito.eemberIdStr,
      alapito.pontok
    );

    if (!ujAg) {
      throw new Error('A különvált ág létrehozása sikertelen');
    }

    console.log('kulonvalasVegrehajtasa - Új ág létrejött', {
      ujAgId: ujAg._id.toString(),
      alapitoPontjai: alapito.pontok
    });

    // ============================================================
    // ===== 7. LÉPÉS - A TÖBBI KÜLÖNVÁLÓ PONTJÁNAK ÁTVITELE =====
    // ============================================================
    // Fejenként KÉT lépés, ebben a sorrendben: levétel a forrásról (a pont visszakerül
    // hozzá), majd feltétel az új ágra. Fordítva nem menne — nem lenne szabad pontja.
    //
    // A tudatpont ÁTKERÜL, nem duplázódik (1. döntés): a rendszerben lévő összes pont
    // változatlan marad, csak máshol áll. A próba-eszköz ezt le is méri.

    const atvittEmberek = [];
    const atvitelHibak = [];

    for (const kulonvalo of tobbiek) {
      try {
        console.log('kulonvalasVegrehajtasa >>>>> TudatpontService.tudatpontHozzarendelese (forrás nullázás)', {
          eemberId: kulonvalo.eemberIdStr,
          pontok: kulonvalo.pontok
        });

        await TudatpontService.tudatpontHozzarendelese(
          kulonvalo.eemberIdStr,
          forrasEntitasId,
          'Tartalom',
          0   // Levétel a főágról
        );

        console.log('kulonvalasVegrehajtasa >>>>> TudatpontService.tudatpontHozzarendelese (új ágra)', {
          eemberId: kulonvalo.eemberIdStr,
          ujAgId: ujAg._id.toString(),
          pontok: kulonvalo.pontok
        });

        await TudatpontService.tudatpontHozzarendelese(
          kulonvalo.eemberIdStr,
          ujAg._id.toString(),
          'Tartalom',
          kulonvalo.pontok   // Ugyanannyi pont az új ágon
        );

        atvittEmberek.push({ eemberId: kulonvalo.eemberIdStr, pontok: kulonvalo.pontok });

      } catch (hiba) {
        // Egy e-ember hibája ne akassza meg a többiek átvitelét — de RÖGZÍTJÜK.
        // Ilyenkor az ő pontja szabadon marad nála (nem vész el), csak nem került
        // fel az új ágra. Ugyanezt a mintát követi az egyesítési végrehajtó is.
        console.error('kulonvalasVegrehajtasa - HIBA egy különváló átvitelénél', {
          eemberId: kulonvalo.eemberIdStr,
          hiba: hiba.message
        });
        atvitelHibak.push({ eemberId: kulonvalo.eemberIdStr, pontok: kulonvalo.pontok, hiba: hiba.message });
      }
    }

    // Az alapító pontja már fent van (a létrehozáskor került oda)
    const ujAgOsszPontja = alapito.pontok + atvittEmberek.reduce((ossz, e) => ossz + e.pontok, 0);

    console.log('kulonvalasVegrehajtasa - Pontok átvive', {
      ujAgOsszPontja,
      atvittEmberekSzama: atvittEmberek.length + 1,   // +1 az alapító
      hibakSzama: atvitelHibak.length
    });

    // ============================================================
    // ===== 7/0. LÉPÉS - A SZERKESZTŐK ÁTVITELE (7. döntés) =====
    // ============================================================
    // A tartalmat alakító emberek az új ágon is szerkesztők maradnak — de az ÁG
    // SZEMPONTJÁBÓL nézve. Lásd a metódus magyarázatát.

    const ujSzerkesztok = this._szerkesztokOsszeallitasa(
      forrasTartalom.szerkesztok ?? [],
      alapito.eemberIdStr,
      szavazatok,
      kulonvaloOldalSzavazata
    );

    if (ujSzerkesztok.length > 0) {
      console.log('kulonvalasVegrehajtasa >>>>> TartalomRepository.updateById (szerkesztők)', {
        ujAgId: ujAg._id.toString(),
        szerkesztokSzama: ujSzerkesztok.length
      });
      await TartalomRepository.updateById(ujAg._id, { szerkesztok: ujSzerkesztok });
    }

    // ============================================================
    // ===== 7/a. LÉPÉS - AZ ÉRTÉK JAVASLATOK ÁTVÁNDORLÁSA =====
    // ============================================================
    // A különválók saját érték javaslatai (a küszöb-elképzeléseik) átkerülnek az új ágra.
    // Ezért van a pont-átvitel UTÁN: érték javaslatot csak az adhat, akinek van tudatpontja
    // az entitáson — a jogosultságot az ErtekSzamitasService ellenőrzi is.

    const ertekJavaslatEredmeny = await this._ertekJavaslatokAtvitele(
      forrasEntitasId.toString(),
      ujAg._id.toString(),
      viszik.map((v) => v.eemberIdStr)
    );

    // ============================================================
    // ===== 7/b. LÉPÉS - A LESZÁRMAZOTTAK SZÉTOSZTÁSA =====
    // ============================================================
    // Ez a 3/b rész: a fa nem „megkettőződik", hanem SZÉTVÁLIK a súlyok mentén.
    // Külön metódusban, mert önmagában is egy teljes bejárás — lásd ott.

    const leszarmazottEredmeny = await this._leszarmazottakSzetosztasa({
      forrasGyokerId: forrasEntitasId.toString(),
      ujGyokerId: ujAg._id.toString(),
      kulonvalokHalmaz
    });

    // ============================================================
    // ===== 8. LÉPÉS - A KÉT ÁG ÖSSZEKÖTÉSE =====
    // ============================================================
    // MINDKÉT oldalra bejegyzés kerül, egymásra mutatva (6. döntés): a szétválás nem
    // marad nyomtalan, és a két ág később ÚJRA EGYESÍTHETŐ a meglévő egyesítési
    // javaslattal. Az `agSzerep` mondja meg, melyik oldalon áll az adott entitás:
    // a FŐÁG az, aki megtartotta az EREDETI azonosítót (9. döntés).
    //
    // Ez a legkevésbé kritikus lépés (csak nyilvántartás), ezért van a legvégén: ha
    // elhasalna, a pontok akkor is a helyükön vannak.

    const kulonvalasIdeje = new Date();

    console.log('kulonvalasVegrehajtasa >>>>> TartalomRepository.kulonvalasHozzaadasa (főág)', {
      foagId: forrasEntitasId,
      testverId: ujAg._id.toString()
    });

    await TartalomRepository.kulonvalasHozzaadasa(forrasEntitasId, {
      testverId: ujAg._id,
      testverTipus: 'Tartalom',
      agSzerep: 'foag',            // Ő tartotta meg az eredeti azonosítót
      forrasJavaslatId,
      forrasEgyezmenyId,
      kulonvalasIdeje
    });

    console.log('kulonvalasVegrehajtasa >>>>> TartalomRepository.kulonvalasHozzaadasa (különvált ág)', {
      kulonvaltAgId: ujAg._id.toString(),
      testverId: forrasEntitasId
    });

    await TartalomRepository.kulonvalasHozzaadasa(ujAg._id, {
      testverId: forrasTartalom._id,
      testverTipus: 'Tartalom',
      agSzerep: 'kulonvalt',       // Ő a szétváláskor jött létre
      forrasJavaslatId,
      forrasEgyezmenyId,
      kulonvalasIdeje
    });

    // ============================================================
    // ===== 9. LÉPÉS - EREDMÉNY VISSZAADÁSA =====
    // ============================================================

    const eredmeny = {
      siker: true,
      foag: {
        id: forrasEntitasId.toString(),
        cim: forrasTartalom.cim,
        megmaradtPontok: maradoPontok
      },
      kulonvaltAg: {
        id: ujAg._id.toString(),
        cim: ujAg.cim,
        osszPont: ujAgOsszPontja
      },
      alapito: { eemberId: alapito.eemberIdStr, pontok: alapito.pontok },
      atvittEmberekSzama: atvittEmberek.length + 1,   // +1 az alapító
      atvittPontokOsszesen: ujAgOsszPontja,
      atvitelHibak,
      ertekJavaslatok: ertekJavaslatEredmeny,
      leszarmazottak: leszarmazottEredmeny
    };

    console.log('kulonvalasVegrehajtasa - VÉGE', { eredmeny });

    return eredmeny;
  }

  // ===================================
  // PRIVÁT - A SZERKESZTŐK ÖSSZEÁLLÍTÁSA AZ ÚJ ÁGON (7. döntés)
  // ===================================
  /**
   * A forrás szerkesztő-listájából felépíti a különvált ág szerkesztő-listáját.
   *
   * ===== A DÖNTÉS =====
   * „A szerkesztők átkerülnek, és a MEGLÉVŐ szín-szabály jelzi az egyet nem értést."
   * Vagyis: aki alakította a tartalmat, az új ágon is szerkesztő — de a neve az ÁG
   * SZEMPONTJÁBÓL kap színt. Nem kellett új mechanizmus: a `szerkesztok[].allapot`
   * és a ReszletekModal szín-logikája változatlan marad.
   *
   * ===== MIT JELENT „AZ ÁG SZEMPONTJÁBÓL"? =====
   * A zöld név azt jelenti: ez az ember EGYETÉRT azzal, ami ezen az ágon áll.
   * A különvált ág a döntés MÁSIK kimenetét viszi, ezért itt az számít zöldnek,
   * aki a KÜLÖNVÁLÓKKAL azonosan szavazott:
   *   - elfogadott javaslatnál a különválók az ELLENZŐK → az ellenzők zöldek, a
   *     támogatók pirosak ezen az ágon (pontosan a 7. döntés példája),
   *   - elvetett javaslatnál a különválók a TÁMOGATÓK → fordítva. Ugyanaz a szabály.
   *
   * ===== MIÉRT NEM ELÉG EGYSZERŰEN „MEGFORDÍTANI" A FORRÁS ÁLLAPOTAIT? =====
   * Mert a forráson tárolt `allapot` az UTOLJÁRA ELFOGADOTT módosításra vonatkozik.
   * Elvetésnél viszont épp az a lényeg, hogy MOST nem született elfogadás — a forrás
   * állapotai tehát egy KORÁBBI, más döntésről szólnak, azok megfordítása értelmetlen
   * lenne. Ezért mindig EBBŐL a javaslatból, a szavazatokból számolunk.
   *
   * ===== A KÖZVETLEN SZERKESZTÉSI JOG (`eredeti`) =====
   * Az új ág entitását ténylegesen az ALAPÍTÓ hozta létre, ezért az `eredeti: true`
   * (és vele a közvetlen szerkesztési jog) az övé — nem a forrás eredeti létrehozójáé,
   * aki lehet, hogy nem is lépett át erre az ágra.
   *
   * @param {Array} forrasSzerkesztok - a forrás `szerkesztok` tömbje
   * @param {string} alapitoId - az új ág alapítója
   * @param {Array} szavazatok - a kiváltó javaslat szavazatai
   * @param {string|null} kulonvaloOldal - 'Ellenez' | 'Tamogat' (melyik oldal vált külön)
   * @returns {Array} az új ág szerkesztő-listája
   */
  _szerkesztokOsszeallitasa(forrasSzerkesztok, alapitoId, szavazatok, kulonvaloOldal) {
    console.log('_szerkesztokOsszeallitasa - KEZDÉS', {
      forrasSzerkesztokSzama: forrasSzerkesztok.length,
      alapitoId,
      szavazatokSzama: szavazatok.length,
      kulonvaloOldal
    });

    // Szavazat-térkép: eemberId → szavazatTipus
    const szavazatTerkep = new Map();
    for (const sz of szavazatok) {
      const id = (sz.eemberId?._id ?? sz.eemberId)?.toString();
      if (id) szavazatTerkep.set(id, sz.szavazatTipus);
    }

    // Egy e-ember állapota EZEN az ágon
    const allapotAgSzerint = (eemberIdStr) => {
      // Ha nincs honnan tudni (pl. próba-eszközből hívva), semleges állapot
      if (!kulonvaloOldal) return 'NemSzavazott';

      const szavazat = szavazatTerkep.get(eemberIdStr);
      if (!szavazat) return 'NemSzavazott';
      if (szavazat === 'Tartozkodik') return 'Tartozkodik';

      // Aki a különválókkal azonosan szavazott, az EGYETÉRT ezzel az ággal
      return szavazat === kulonvaloOldal ? 'Tamogatja' : 'Ellenzi';
    };

    const ujLista = [];

    // ----- 1. AZ ALAPÍTÓ A LISTA ÉLÉRE -----
    // Ő hozta létre ezt az entitást → övé a közvetlen szerkesztési jog.
    // Zöld: definíció szerint egyetért ezzel az ággal (ő vitte ide).
    ujLista.push({ eemberId: alapitoId, allapot: 'Tamogatja', eredeti: true });

    // ----- 2. A TÖBBI SZERKESZTŐ, ÁG-SZEMPONTÚ ÁLLAPOTTAL -----
    for (const szerkeszto of forrasSzerkesztok) {
      const id = (szerkeszto.eemberId?._id ?? szerkeszto.eemberId)?.toString();
      if (!id) continue;                 // törölt e-ember — nem visszük át
      if (id === alapitoId) continue;    // az alapító már bent van

      ujLista.push({
        eemberId: id,
        allapot: allapotAgSzerint(id),
        eredeti: false                   // az `eredeti` jog ezen az ágon az alapítóé
      });
    }

    console.log('_szerkesztokOsszeallitasa - VÉGE', { ujListaSzama: ujLista.length });
    return ujLista;
  }

  // ===================================
  // PRIVÁT - AZ ÉRTÉK JAVASLATOK ÁTVITELE (8. döntés)
  // ===================================
  /**
   * A különválók saját ÉRTÉK JAVASLATAI átvándorolnak a forrásról az új ágra.
   *
   * ===== MIÉRT KELL EZT KÜLÖN KEZELNI? =====
   * Az egységes szabály („minden oda kerül, ahol tudatpontja van a különválónak") érték
   * javaslatra NEM alkalmazható, mert érték javaslatra nem lehet tudatpontot tenni (a
   * `tudatpontHozzarendeles` entitás-típusai: Tartalom / Kategoria / TartalomTipus /
   * Javaslat). Ezért mondtuk ki külön (8. döntés): aki elmegy, viszi a magáét.
   *
   * ===== A KÜSZÖBÖK MINDKÉT ÁGON ÚJRASZÁMOLÓDNAK =====
   * A tartalom tényleges küszöbei az érték javaslatok MEDIÁNJAI. Ha valaki elviszi a
   * sajátját, mindkét oldal küszöbe elmozdulhat — ezért a forrás hisztogramjából ki kell
   * VONNI (`hisztogramCsokkentese`), az új ágon pedig be kell írni.
   *
   * ===== AZ ALAPÍTÓ KÜLÖN ESETE =====
   * A `tartalomLetrehozasa` az alapítónak MÁR létrehozott egy érték javaslatot az ÚJ ágon,
   * ALAPÉRTELMEZETT küszöbökkel. Ezért a célon `ertekJavaslatLetrehozasaVagyModositasa`-t
   * hívunk (createOrUpdate): az alapítónál FELÜLÍRJA az alapértelmezettet a sajátjával,
   * a többieknél újat hoz létre. Így nem keletkezik két sor ugyanattól az e-embertől.
   *
   * @param {string} forrasEntitasId - a főág
   * @param {string} ujAgId - a különvált ág
   * @param {Array<string>} kulonvalokIdk - a különválók azonosítói
   * @returns {Promise<Object>} összegzés
   */
  async _ertekJavaslatokAtvitele(forrasEntitasId, ujAgId, kulonvalokIdk) {
    console.log('_ertekJavaslatokAtvitele - KEZDÉS', {
      forrasEntitasId, ujAgId, kulonvalokSzama: kulonvalokIdk.length
    });

    let atvitt = 0;        // Hány érték javaslat vándorolt át
    let nemVoltNekik = 0;  // Hányan nem adtak érték javaslatot a forráson
    const hibak = [];

    for (const eemberIdStr of kulonvalokIdk) {
      try {
        // ----- 1. VAN-E EGYÁLTALÁN ÉRTÉK JAVASLATA A FORRÁSON? -----
        const regi = await ErtekJavaslatRepository.findByeEmberAndEntitas(
          eemberIdStr, forrasEntitasId, 'Tartalom'
        );

        if (!regi) {
          nemVoltNekik++;
          continue;   // Nem adott érték javaslatot — nincs mit vinni
        }

        // A négy küszöb elmentése, MIELŐTT törölnénk a sort
        const ertekek = {
          javaslatElfogadasiKuszob: regi.javaslatElfogadasiKuszob,
          reszveteliAranyKuszob:    regi.reszveteliAranyKuszob,
          minimumDontesiIdo:        regi.minimumDontesiIdo,
          maximumDontesiIdo:        regi.maximumDontesiIdo
        };

        // ----- 2. LEVÉTEL A FORRÁSRÓL (sor + hisztogram) -----
        console.log('_ertekJavaslatokAtvitele >>>>> ErtekJavaslatRepository.deleteByeEmberAndEntitas', {
          eemberIdStr, forrasEntitasId
        });
        await ErtekJavaslatRepository.deleteByeEmberAndEntitas(eemberIdStr, forrasEntitasId, 'Tartalom');

        // A hisztogramból is ki kell vonni, különben a főág küszöbe olyan véleményt is
        // számolna, ami már nem tartozik hozzá
        await ErtekSzamitasService.hisztogramCsokkentese(forrasEntitasId, 'Tartalom', ertekek);

        // ----- 3. FELTÉTEL AZ ÚJ ÁGRA -----
        // A createOrUpdate miatt az alapító alapértelmezett sora FELÜLÍRÓDIK, nem duplázódik
        console.log('_ertekJavaslatokAtvitele >>>>> ErtekSzamitasService.ertekJavaslatLetrehozasaVagyModositasa', {
          eemberIdStr, ujAgId
        });
        await ErtekSzamitasService.ertekJavaslatLetrehozasaVagyModositasa(
          eemberIdStr,
          ujAgId,
          'Tartalom',
          ertekek.javaslatElfogadasiKuszob,
          ertekek.reszveteliAranyKuszob,
          ertekek.minimumDontesiIdo,
          ertekek.maximumDontesiIdo
        );

        atvitt++;

      } catch (hiba) {
        // Egy e-ember érték javaslatának hibája ne akassza meg a többit. A küszöb
        // ilyenkor az ALAPÉRTELMEZETTRE áll az új ágon — ez a 8. döntés szerinti
        // elfogadható kimenet, nem adatvesztés.
        console.error('_ertekJavaslatokAtvitele - HIBA egy érték javaslat átvitelénél', {
          eemberIdStr, hiba: hiba.message
        });
        hibak.push({ eemberId: eemberIdStr, hiba: hiba.message });
      }
    }

    const eredmeny = { atvitt, nemVoltNekik, hibak };
    console.log('_ertekJavaslatokAtvitele - VÉGE', eredmeny);
    return eredmeny;
  }

  // ===================================
  // PRIVÁT - A LESZÁRMAZOTTAK SZÉTOSZTÁSA (3/b)
  // ===================================
  /**
   * A forrás alatti TARTALOM-részfa szétosztása a két ág között.
   *
   * ===== AZ EGYSÉGES SZABÁLY =====
   * Minden leszármazottnál azt nézzük, KIKNEK van rajta tudatpontja:
   *   - csak a különválóknak      → ÁTKÖLTÖZIK (átkötjük az új ág alá; megtartja az
   *                                 azonosítóját, a gyerekeit és a történetét),
   *   - mindkét oldalnak          → MEGKETTŐZŐDIK (másolat az új ágra, a különválók
   *                                 pontjai oda kerülnek át),
   *   - a különválóknak semmi     → MARAD, ahol van.
   *
   * ===== A KÉT „LEGKÖZELEBBI ŐS" SZABÁLY =====
   * A köztes szintek NEM másolódnak üresen, ezért két nyilvántartást vezetünk:
   *   - az ÚJ ágon: melyik a legközelebbi átkerült ős (ide kapcsolódik, ami átmegy) — 3. döntés;
   *   - az EREDETI ágon: melyik a legközelebbi MEGMARADT ős (ide kapcsolódik, ami marad,
   *     ha a szülője elköltözött) — ugyanennek a tükörképe (Csaba döntése, 2026-08-25).
   * A rendszer egyébként is pontosan így viselkedik törléskor: a gyerekek a nagyszülőhöz
   * kerülnek (`entitasTorleseEllenorzese`).
   *
   * ===== MIÉRT KÉT MENETBEN? =====
   * ELŐBB felmérünk (ki hova tartozik), CSAK AZUTÁN módosítunk. Ha menet közben
   * mozgatnánk a pontokat, a `tudatpontHozzarendelese(..., 0)` a 0-ra esett entitást
   * AZONNAL törölné, és a gyerekeit a nagyszülőhöz kötné — a bejárás alól kifutna a fa.
   * (Ugyanezt a leckét őrzi az egyesítési végrehajtó 3.5 lépése.)
   *
   * @param {Object} p
   * @param {string} p.forrasGyokerId - a szétvált tartalom (főág)
   * @param {string} p.ujGyokerId - a különvált ág gyökere
   * @param {Set<string>} p.kulonvalokHalmaz - a különváló e-emberek azonosítói
   * @returns {Promise<Object>} a szétosztás összegzése
   */
  async _leszarmazottakSzetosztasa({ forrasGyokerId, ujGyokerId, kulonvalokHalmaz }) {
    console.log('_leszarmazottakSzetosztasa - KEZDÉS', { forrasGyokerId, ujGyokerId });

    // ============================================================
    // ===== ELSŐ MENET: FELMÉRÉS (SEMMIT NEM MÓDOSÍTUNK) =====
    // ============================================================
    // Szélességi bejárás, hogy a SZÜLŐK MINDIG a gyerekeik ELŐTT kerüljenek sorra —
    // a második menet erre épül (a gyerek csak akkor tudja, hova kerül, ha a szülője
    // sorsa már eldőlt).

    const felmertek = [];                      // BFS sorrendben
    const sorban = [forrasGyokerId];           // a feldolgozandó szülők sora
    const bejartak = new Set([forrasGyokerId]); // kör-védelem (sérült adat ellen)
    let lepesVedelem = 0;

    while (sorban.length > 0 && lepesVedelem < 10000) {
      lepesVedelem++;
      const aktualisSzuloId = sorban.shift();

      const gyerekek = await TartalomRepository.findBySzuloId(aktualisSzuloId, 'Tartalom');

      for (const gyerek of gyerekek) {
        const gyerekId = gyerek._id.toString();

        // Kör-védelem: ha egy entitás önmaga (vagy egy őse) alá kerülne, megállunk
        if (bejartak.has(gyerekId)) {
          console.warn('_leszarmazottakSzetosztasa - KÖRKÖRÖS HIVATKOZÁS, kihagyva', { gyerekId });
          continue;
        }
        bejartak.add(gyerekId);

        // Ki mennyi pontot tart ezen a leszármazotton?
        const hozzarendelesek = await TudatpontRepository.findHozzarendelesekByEntitasNyers(
          gyerekId, 'Tartalom', 999999, 0
        );

        const viszik = [];
        let maradoPont = 0;

        for (const h of hozzarendelesek) {
          const eemberIdStr = h.eemberId.toString();
          if (kulonvalokHalmaz.has(eemberIdStr)) {
            viszik.push({ eemberIdStr, pontok: h.tudatPontok });
          } else {
            maradoPont += h.tudatPontok;
          }
        }

        // Ugyanaz a determinisztikus sorrend, mint a gyökérnél (az első lesz az alapító)
        viszik.sort((a, b) => {
          if (b.pontok !== a.pontok) return b.pontok - a.pontok;
          return a.eemberIdStr.localeCompare(b.eemberIdStr);
        });

        // A három kimenet
        let kimenet;
        if (viszik.length === 0) {
          kimenet = 'marad';        // a különválóknak nincs itt pontja
        } else if (maradoPont === 0) {
          kimenet = 'koltozik';     // CSAK a különválóknak van pontja
        } else {
          kimenet = 'masolat';      // mindkét oldalnak van
        }

        felmertek.push({
          id: gyerekId,
          szuloId: aktualisSzuloId,
          cim: gyerek.cim,
          szoveg: gyerek.szoveg ?? null,
          tartalomTipusId: gyerek.tartalomTipusId ? (gyerek.tartalomTipusId._id ?? gyerek.tartalomTipusId).toString() : null,
          kategoriaIds: (gyerek.kategoriaIds ?? []).map((k) => (k?._id ?? k).toString()),
          kimenet,
          viszik,
          maradoPont
        });

        sorban.push(gyerekId);
      }
    }

    console.log('_leszarmazottakSzetosztasa - Felmérés kész', {
      leszarmazottakSzama: felmertek.length,
      marad:     felmertek.filter((e) => e.kimenet === 'marad').length,
      koltozik:  felmertek.filter((e) => e.kimenet === 'koltozik').length,
      masolat:   felmertek.filter((e) => e.kimenet === 'masolat').length
    });

    // Ha nincs leszármazott, nincs mit tenni
    if (felmertek.length === 0) {
      console.log('_leszarmazottakSzetosztasa - VÉGE (nincs leszármazott)');
      return { leszarmazottakSzama: 0, marad: 0, koltozott: 0, masolt: 0, hibak: [] };
    }

    // ============================================================
    // ===== MÁSODIK MENET: VÉGREHAJTÁS =====
    // ============================================================
    // A két „legközelebbi ős" nyilvántartás. A gyökér mindkettőben önmaga párja:
    // az új ágon az új gyökér, az eredeti ágon a forrás gyökér.
    const ujAgSzuloje = new Map([[forrasGyokerId, ujGyokerId]]);
    const foagSzuloje = new Map([[forrasGyokerId, forrasGyokerId]]);

    // Azok a szülők, akiknek a hierarchikus összege elromolhatott (átkötés miatt).
    // A pont-MOZGATÁS magától frissíti a láncot; az ÁTKÖTÉS viszont nem, azt nekünk kell.
    const ujraszamolandok = new Set();

    const hibak = [];
    let koltozott = 0;
    let masolt = 0;
    let maradtEsAtkotve = 0;

    for (const elem of felmertek) {
      // Hova kerülne az ÚJ ágon, és hol maradna az EREDETI ágon?
      const ujSzulo = ujAgSzuloje.get(elem.szuloId) ?? ujGyokerId;
      const maradoSzulo = foagSzuloje.get(elem.szuloId) ?? forrasGyokerId;

      try {

        // ----- (1) MARAD -----
        if (elem.kimenet === 'marad') {
          // Ha a szülője elköltözött, ez az entitás árván maradna — ilyenkor a
          // legközelebbi MEGMARADT ősre kötjük át (Csaba döntése, 2026-08-25).
          if (elem.szuloId !== maradoSzulo) {
            console.log('_leszarmazottakSzetosztasa - MARAD, de árva lett → átkötés', {
              id: elem.id, regiSzulo: elem.szuloId, ujSzulo: maradoSzulo
            });
            await this._entitasAtkotese(elem.id, maradoSzulo);
            ujraszamolandok.add(elem.szuloId);
            ujraszamolandok.add(maradoSzulo);
            maradtEsAtkotve++;
          }

          ujAgSzuloje.set(elem.id, ujSzulo);   // nincs párja az új ágon
          foagSzuloje.set(elem.id, elem.id);   // ő maga marad, tehát ő a következő horgony
          continue;
        }

        // ----- (2) ÁTKÖLTÖZIK -----
        // Nincs pont-mozgatás: az entitás a pontjaival EGYÜTT vándorol át. Csak a
        // szülője változik — a doksiban, a pakli-fában és az ős-láncban.
        if (elem.kimenet === 'koltozik') {
          console.log('_leszarmazottakSzetosztasa - ÁTKÖLTÖZIK', {
            id: elem.id, cim: elem.cim, regiSzulo: elem.szuloId, ujSzulo
          });

          await this._entitasAtkotese(elem.id, ujSzulo);
          ujraszamolandok.add(elem.szuloId);
          ujraszamolandok.add(ujSzulo);
          koltozott++;

          ujAgSzuloje.set(elem.id, elem.id);       // innentől ő a horgony az új ágon
          foagSzuloje.set(elem.id, maradoSzulo);   // az eredeti ágon már nincs itt
          continue;
        }

        // ----- (3) MEGKETTŐZŐDIK -----
        // Mindkét oldalnak van rajta pontja, ezért mindkét ágon kell egy példány.
        // Az eredeti megmarad (a maradók pontjaival), az új ágra másolat készül,
        // és a különválók pontjai ODA kerülnek át.
        console.log('_leszarmazottakSzetosztasa - MEGKETTŐZŐDIK', {
          id: elem.id, cim: elem.cim, viszikSzama: elem.viszik.length, maradoPont: elem.maradoPont
        });

        const alapito = elem.viszik[0];
        const tobbiek = elem.viszik.slice(1);

        // Ugyanaz a kényszerű sorrend, mint a gyökérnél: előbb levétel, aztán létrehozás
        await TudatpontService.tudatpontHozzarendelese(alapito.eemberIdStr, elem.id, 'Tartalom', 0);

        const masolat = await TartalomService.tartalomLetrehozasa(
          {
            cim: elem.cim,
            szoveg: elem.szoveg,
            szuloId: ujSzulo,
            szuloTipus: 'Tartalom',
            tartalomTipusId: elem.tartalomTipusId,
            kategoriaIds: elem.kategoriaIds
          },
          alapito.eemberIdStr,
          alapito.pontok
        );

        for (const kulonvalo of tobbiek) {
          await TudatpontService.tudatpontHozzarendelese(kulonvalo.eemberIdStr, elem.id, 'Tartalom', 0);
          await TudatpontService.tudatpontHozzarendelese(
            kulonvalo.eemberIdStr, masolat._id.toString(), 'Tartalom', kulonvalo.pontok
          );
        }

        // A különválók érték javaslatai is átvándorolnak a másolatra (8. döntés).
        // (Az ÁTKÖLTÖZŐ entitásoknál erre nincs szükség: ott az entitás azonosítója
        // változatlan, tehát az érték javaslatai magától vele mennek.)
        await this._ertekJavaslatokAtvitele(
          elem.id,
          masolat._id.toString(),
          elem.viszik.map((v) => v.eemberIdStr)
        );

        masolt++;
        ujAgSzuloje.set(elem.id, masolat._id.toString());  // a másolat a horgony az új ágon
        foagSzuloje.set(elem.id, elem.id);                 // az eredeti is megmaradt

      } catch (hiba) {
        // Egy leszármazott hibája ne akassza meg a többit — de rögzítjük, és a
        // horgonyokat a BIZTONSÁGOS irányba állítjuk (marad minden a helyén).
        console.error('_leszarmazottakSzetosztasa - HIBA egy leszármazottnál', {
          id: elem.id, kimenet: elem.kimenet, hiba: hiba.message
        });
        hibak.push({ id: elem.id, cim: elem.cim, kimenet: elem.kimenet, hiba: hiba.message });

        ujAgSzuloje.set(elem.id, ujSzulo);
        foagSzuloje.set(elem.id, elem.id);
      }
    }

    // ============================================================
    // ===== HARMADIK MENET: HIERARCHIKUS PONTOK HELYREÁLLÍTÁSA =====
    // ============================================================
    // Az ÁTKÖTÉS nem mozgat pontot, ezért a szülő-láncok összegei elavultak lettek:
    // a régi szülő fölött csökkenniük kell, az új szülő fölött nőniük. Mélyebbről
    // indulunk felfelé (fordított BFS-sorrend), hogy mire egy szülőre kerül a sor,
    // a gyerekei már frissek legyenek.

    if (ujraszamolandok.size > 0) {
      console.log('_leszarmazottakSzetosztasa - Hierarchikus újraszámítás', {
        erintettSzulok: ujraszamolandok.size
      });

      // MÉLYSÉG SZERINT, A LEGMÉLYEBBTŐL FELFELÉ.
      // Miért nem elég a felmérés fordított sorrendje? Mert az érintettek között ÚJONNAN
      // LÉTREJÖTT másolatok is vannak (azok alá is költözhetett gyerek), és azok nem
      // szerepelnek a felmért listában. Ha kihagynánk őket, a fölöttük lévő gyökér az ő
      // ELAVULT összegükkel számolna — pont ezt mérte ki a próba 2026-08-25-én
      // (3 pont eltűnt: a másolat alá költözött unoka súlya).
      const melysegek = [];
      for (const id of ujraszamolandok) {
        melysegek.push({ id, melyseg: await this._melysegLekerese(id) });
      }
      melysegek.sort((a, b) => b.melyseg - a.melyseg);   // legmélyebb előre

      for (const m of melysegek) {
        await this._hierarchiaPontokFelfele(m.id, 'Tartalom');
      }

      // A két gyökér a végén (ők vannak legfelül)
      await this._hierarchiaPontokFelfele(forrasGyokerId, 'Tartalom');
      await this._hierarchiaPontokFelfele(ujGyokerId, 'Tartalom');
    }

    const eredmeny = {
      leszarmazottakSzama: felmertek.length,
      marad: felmertek.filter((e) => e.kimenet === 'marad').length,
      maradtEsAtkotve,
      koltozott,
      masolt,
      hibak
    };

    console.log('_leszarmazottakSzetosztasa - VÉGE', eredmeny);
    return eredmeny;
  }

  // ===================================
  // PRIVÁT - EGY ENTITÁS ÁTKÖTÉSE ÚJ SZÜLŐ ALÁ
  // ===================================
  // HÁROM helyen kell a szülőt átírni, különben a fa szétcsúszik:
  //   (1) az entitás saját dokumentumában (ebből dolgozik a pakli és a kártya),
  //   (2) a hierarchikus (pakli-fa) allokációban (ebből navigál a pont-számítás felfelé),
  //   (3) az ős-láncban, a teljes RÉSZFÁRA (ebből szűr az ág-nézet).
  // Ugyanez a hármas az egyesítési végrehajtó 7. lépésében is.
  // @param {string} entitasId - az átkötendő tartalom
  // @param {string} ujSzuloId - az új szülő (mindig Tartalom ebben a körben)
  async _entitasAtkotese(entitasId, ujSzuloId) {
    console.log('_entitasAtkotese - KEZDÉS', { entitasId, ujSzuloId });

    // (1) Az entitás dokumentuma
    await TartalomRepository.updateById(entitasId, {
      szuloId: ujSzuloId,
      szuloTipus: 'Tartalom'
    });

    // (2) A hierarchikus (pakli-fa) szülő
    await HierarchikusTudatpontAllokaciRepository.updateSzuloId(
      entitasId, 'Tartalom', ujSzuloId, 'Tartalom'
    );

    // (3) Az ős-lánc a teljes részfára — best-effort: a lánc hibája ne akassza meg az
    // átkötést (a hiányzó láncot a `tools/entitasOsLancPotlas.js` pótolni tudja)
    try {
      await OsLancKarbantartoService.reszfaOsLancUjraepitese(entitasId, 'Tartalom');
    } catch (osLancHiba) {
      console.error('_entitasAtkotese - osLanc HIBA (nem blokkoló)', {
        entitasId, hiba: osLancHiba.message
      });
    }

    console.log('_entitasAtkotese - VÉGE', { entitasId, ujSzuloId });
  }

  // ===================================
  // PRIVÁT - EGY ENTITÁS MÉLYSÉGE A FÁBAN
  // ===================================
  // Hány lépésre van a gyökértől? A hierarchikus allokáció szülő-láncán lépdelünk
  // felfelé. A hierarchikus újraszámítás sorrendjéhez kell: a MÉLYEBB entitásokat
  // előbb kell frissíteni, hogy a szülőjük már friss gyerek-összegekkel számoljon.
  // @param {string} entitasId - a vizsgált entitás
  // @returns {Promise<number>} a mélység (0 = gyökér)
  async _melysegLekerese(entitasId) {
    let melyseg = 0;
    let aktId = entitasId;
    let aktTipus = 'Tartalom';
    let lepesVedelem = 0;

    while (aktId && lepesVedelem < 100) {
      lepesVedelem++;
      const allokacio = await HierarchikusTudatpontAllokaciRepository.findByEntitas(aktId, aktTipus);
      if (!allokacio || !allokacio.szuloId) break;   // elértük a gyökeret
      melyseg++;
      aktId = allokacio.szuloId;
      aktTipus = allokacio.szuloTipus || 'Tartalom';
    }

    return melyseg;
  }

  // ===================================
  // PRIVÁT - HIERARCHIKUS PONTOK ÚJRASZÁMÍTÁSA FELFELÉ
  // ===================================
  // Az adott entitástól a gyökérig újraszámítja a hierarchikus összegeket.
  // (Az egyesítési végrehajtó azonos nevű segédje mintájára — ott is átkötés után kell.)
  // @param {string} entitasId - kiinduló entitás
  // @param {string} entitasTipus - kiinduló entitás típusa
  async _hierarchiaPontokFelfele(entitasId, entitasTipus) {
    console.log('_hierarchiaPontokFelfele - KEZDÉS', { entitasId, entitasTipus });

    let aktId = entitasId;
    let aktTipus = entitasTipus;
    let lepesVedelem = 0;

    while (aktId && lepesVedelem < 100) {
      lepesVedelem++;
      try {
        await HierarchikusFrissitesService.frissitEgyHierarchikusAllokacio(aktId, aktTipus);
      } catch (hiba) {
        console.warn('_hierarchiaPontokFelfele - újraszámítási hiba, lánc megszakítva', {
          aktId, hiba: hiba.message
        });
        break;
      }

      const allokacio = await HierarchikusTudatpontAllokaciRepository.findByEntitas(aktId, aktTipus);
      if (!allokacio || !allokacio.szuloId) break;   // elértük a gyökeret

      aktId = allokacio.szuloId;
      aktTipus = allokacio.szuloTipus || 'Tartalom';
    }

    console.log('_hierarchiaPontokFelfele - VÉGE', { lepesek: lepesVedelem });
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
// Service osztály singleton példány exportálása
module.exports = new KulonvalasService();
