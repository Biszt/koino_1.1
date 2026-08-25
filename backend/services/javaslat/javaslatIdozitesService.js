// backend/services/javaslat/javaslatIdozitesService.js

// === IMPORTOK ===
// Repository importálása
const JavaslatRepository = require('../../repositories/javaslatRepository');

// Szolgáltatások importálása
const JavaslatVegrehajtasiService = require('./vegrehajtok/javaslatVegrehajtasiService');
const ErtekSzamitasService = require('../ertekSzamitasService'); // ÚJ IMPORT
const ErtesitesService = require('../ertesitesService'); // Javaslat lezárásakor értesítjük a figyelőket

// Különválás ELVETÉS után: a TÁMOGATÓK vihetik magukkal a módosított állapotot
// (docs/fejlesztesi_terv.md „Különválás" szakaszai, 5. lépés)
const KulonvalasService = require('../kulonvalasService');
const SzavazatRepository = require('../../repositories/szavazatRepository');
const TartalomRepository = require('../../repositories/tartalomRepository');

// === JAVASLAT IDŐZÍTÉS SERVICE OSZTÁLY ===
// Ez az osztály felelős a javaslatok időzítési logikájáért
// Felelősség: Hatályba lépés, végrehajtás ellenőrzése
class JavaslatIdozitesService {

  // ----- KÜLÖNVÁLÁS ELVETETT MÓDOSÍTÁS UTÁN -----
  /**
   * A TÁMOGATÓK különválása egy ELVETETT módosítási javaslat után.
   *
   * ===== A SZIMMETRIA MÁSIK FELE =====
   * Elfogadásnál az ELLENZŐK viszik a RÉGI állapotot (lásd javaslatVegrehajtasiService).
   * Elvetésnél tükörképe: a főágon minden marad a régiben, és aki TÁMOGATTA a módosítást
   * ÉS kérte a külön ágat, az elviszi magával a MÓDOSÍTOTT állapotot egy új ágra.
   * Így mindkét oldal azt viszi, amit akart — akkor is, ha a javaslat megbukott.
   *
   * ===== A HORGONY: MAGA A JAVASLAT (A döntés, 2026-08-25) =====
   * Elvetéskor NEM születik egyezmény (az egyezmény kizárólag elfogadott javaslat
   * eredménye). Az elvetett javaslat viszont entitásként ott marad a fán `Elvetve`
   * státusszal, benne a teljes szavazási eredménnyel — ő a különvált ág horgonya.
   * A `forrasEgyezmenyId` ezért itt mindig null.
   *
   * ===== A MÓDOSÍTOTT ÁLLAPOTOT ÖSSZE KELL RAKNI =====
   * Elfogadásnál készen kaptuk a régi állapotot (`regiAdatok` pillanatkép). Itt nincs
   * ilyen: a módosítás VÉGRE SEM HAJTÓDOTT. A módosított állapotot tehát nekünk kell
   * előállítani: a tartalom MOSTANI cím/szöveg mezőire ráterítjük a javaslat
   * `modositasAdatok` mezőit. (Ha a javaslat csak a címet változtatta volna, a szöveg
   * a mostani marad — pontosan az az állapot, ami elfogadás esetén létrejött volna.)
   *
   * @param {Array} javaslatok - a most ELVETETT (töredék) javaslatok
   * @returns {Promise<Object|null>} Összegzés, vagy null ha nem volt különválás
   */
  async _kulonvalasokElvetesUtan(javaslatok) {
    console.log('_kulonvalasokElvetesUtan - KEZDÉS', { javaslatokSzama: javaslatok?.length ?? 0 });

    const kulonvalasok = [];   // A sikeres szétválások
    const kihagyottak = [];    // Amit szándékosan kihagytunk (indokkal)
    const hibak = [];          // Amit meg akartunk csinálni, de nem sikerült

    for (const javaslat of (javaslatok ?? [])) {
      // ----- 1. HATÓKÖR: CSAK MÓDOSÍTÁS -----
      // Törlésnél/áthelyezésnél/egyesítésnél nincs „módosított állapot", amit vinni lehetne.
      if (javaslat.javaslatTipus !== 'Modositas') continue;

      const javaslatId = (javaslat._id ?? javaslat.id).toString();

      // ----- 2. KIK VÁLNAK KÜLÖN? -----
      // A TÁMOGATÓK közül azok, akik kérték a külön ágat.
      // FIGYELEM: a javaslattevő automatikus „Támogat" szavazata alapból NEM kér külön
      // ágat — ha a beadó tartalék-ágat szeretne, azt külön be kell pipálnia.
      const szavazatok = await SzavazatRepository.findByJavaslatId(javaslatId);

      const kulonvalokIdk = szavazatok
        .filter((sz) => sz.szavazatTipus === 'Tamogat' && sz.kulonvalasIgeny === true)
        .map((sz) => (sz.eemberId?._id ?? sz.eemberId).toString());

      console.log('_kulonvalasokElvetesUtan - Különválók a javaslaton', {
        javaslatId,
        szavazatokSzama: szavazatok.length,
        kulonvalokSzama: kulonvalokIdk.length
      });

      if (kulonvalokIdk.length === 0) continue;   // A gyakori eset: senki nem kért külön ágat

      // ----- 3. ENTITÁSONKÉNT A SZÉTVÁLASZTÁS -----
      for (const erintett of (javaslat.erintettEntitasok ?? [])) {
        const entitasId = erintett.entitasId.toString();

        // Az első kör csak tartalomra terjed ki (C döntés)
        if (erintett.entitasTipus !== 'Tartalom') {
          kihagyottak.push({ entitasId, ok: `Nem Tartalom (${erintett.entitasTipus})` });
          continue;
        }

        // Van-e egyáltalán módosítási adat? (Enélkül nincs „másik állapot".)
        const modositasAdatok = erintett.modositasAdatok ?? {};
        if (Object.keys(modositasAdatok).length === 0) {
          kihagyottak.push({ entitasId, ok: 'Nincs módosítási adat' });
          continue;
        }

        // A MÓDOSÍTOTT állapot összerakása: a mostani tartalomra ráterítjük a javaslatot
        const jelenlegi = await TartalomRepository.findById(entitasId);
        if (!jelenlegi) {
          kihagyottak.push({ entitasId, ok: 'A tartalom időközben megszűnt' });
          continue;
        }

        const modositottAllapot = {
          cim:    modositasAdatok.cim    !== undefined ? modositasAdatok.cim    : jelenlegi.cim,
          szoveg: modositasAdatok.szoveg !== undefined ? modositasAdatok.szoveg : (jelenlegi.szoveg ?? null)
        };

        try {
          console.log('_kulonvalasokElvetesUtan >>>>> KulonvalasService.kulonvalasVegrehajtasa', {
            entitasId,
            kulonvalokSzama: kulonvalokIdk.length
          });

          const eredmeny = await KulonvalasService.kulonvalasVegrehajtasa({
            forrasEntitasId: entitasId,
            forrasEntitasTipus: 'Tartalom',
            kulonvaloEemberIdk: kulonvalokIdk,
            ujAgAdatok: modositottAllapot,   // A támogatók a MÓDOSÍTOTT állapotot viszik
            forrasJavaslatId: javaslatId,    // A horgony: maga az elvetett javaslat
            forrasEgyezmenyId: null,         // Elvetéskor nincs egyezmény
            // A szerkesztő-nevek színéhez az ÁG szempontjából (7. döntés):
            // itt a TÁMOGATÓK válnak külön, tehát ezen az ágon ők a „zöldek".
            szavazatok: szavazatok,
            kulonvaloOldalSzavazata: 'Tamogat'
          });

          kulonvalasok.push({
            foagId: entitasId,
            kulonvaltAgId: eredmeny.kulonvaltAg.id,
            atvittEmberekSzama: eredmeny.atvittEmberekSzama,
            atvittPontok: eredmeny.atvittPontokOsszesen,
            leszarmazottak: eredmeny.leszarmazottak
          });

        } catch (hiba) {
          // A „nincs mit átvinni" nem valódi hiba (pl. a támogató időközben elvette a
          // pontját az entitásról) — kihagyásként naplózzuk, hogy ne riogasson.
          if (hiba.message.includes('nincs tudatpontja')) {
            kihagyottak.push({ entitasId, ok: hiba.message });
          } else {
            console.error('_kulonvalasokElvetesUtan - HIBA egy entitás szétválasztásánál', {
              entitasId, hiba: hiba.message
            });
            hibak.push({ entitasId, hiba: hiba.message });
          }
        }
      }
    }

    if (kulonvalasok.length === 0 && kihagyottak.length === 0 && hibak.length === 0) {
      console.log('_kulonvalasokElvetesUtan - VÉGE (senki nem kért külön ágat)');
      return null;
    }

    const osszegzes = {
      szetvalasztottEntitasok: kulonvalasok.length,
      kulonvalasok,
      kihagyottak,
      hibak
    };

    console.log('_kulonvalasokElvetesUtan - VÉGE', osszegzes);
    return osszegzes;
  }

  // ----- ÉRTESÍTÉS: JAVASLAT LEZÁRÁSA (elfogadás / elvetés) -----
  // Egy vagy több (töredék) javaslatra kiküldi a lezárás-értesítést az érintett
  // entitás(ok) FIGYELŐINEK. Rendszer-esemény (cron) → nincs cselekvő. BEST-EFFORT:
  // az értesítés-hiba nem akaszthatja meg a lezárási folyamatot.
  // @param {Array} javaslatok    - a lezárt (töredék) javaslatok
  // @param {string} tipus        - 'javaslatElfogadas' | 'javaslatElvetve'
  // @param {string|null} egyezmenyId - elfogadásnál a keletkezett egyezmény azonosítója
  async _lezarasErtesites(javaslatok, tipus, egyezmenyId = null) {
    for (const jav of javaslatok) {
      const erintett = jav.erintettEntitasok?.[0]; // A töredék érintett entitása
      if (!erintett) continue; // Biztonsági kihagyás
      try {
        await ErtesitesService.ertesitesKuldes(
          erintett.entitasId,
          erintett.entitasTipus,
          tipus,
          {
            javaslatId: jav._id,
            javaslatTipus: jav.javaslatTipus,
            egyezmenyId,
            toredekCsoportId: jav.toredekCsoportId
          },
          null // rendszer-esemény (cron) – nincs cselekvő, akit kihagynánk
        );
      } catch (ertesitesHiba) {
        console.error('_lezarasErtesites - ertesites HIBA (nem blokkolo)', { hiba: ertesitesHiba.message });
      }
    }
  }

  // ----- ÉRTESÍTÉS: SZAVAZÁSI HATÁRIDŐ KÖZELEG (cron hívja percenként) -----
  // A dormant szavazasiHatarido típus élesítése (2026-07-18): ha egy aktív javaslat
  // hatályba lépési ideje KÖZEL van, az érintett entitás figyelői értesítést kapnak,
  // hogy még szavazhassanak. „Közel" = a hátralévő idő legfeljebb a teljes döntési
  // idő 25%-a, de legfeljebb 24 óra (rövid döntési időnél arányos, hosszúnál nem
  // szól hetekkel előre). Duplikátum-védelem: a hataridoErtesitesElkuldve jelző —
  // egy javaslatra csak EGYSZER megy ki. FIGYELEM: a cron percenként fut, ezért
  // nagyon rövid (1-2 perces) döntési időnél az értesítés lemaradhat — ez vállalt
  // korlát. BEST-EFFORT: hiba nem akasztja meg a cron többi munkáját.
  async hataridoErtesitesekKuldese() {
    console.log('JavaslatIdozitesService.hataridoErtesitesekKuldese - KEZDÉS');

    const jeloltek = await JavaslatRepository.findHataridoErtesitesreVarok();
    const most = Date.now();
    const MAX_ELORE_MS = 24 * 60 * 60 * 1000; // legfeljebb 24 órával előre

    let kuldott = 0;
    for (const javaslat of jeloltek) {
      const hatralevoMs = new Date(javaslat.hatalybaLepesIdeje).getTime() - most;

      // Már lejárt (a végrehajtás-ellenőrzés úgyis lezárja) → nem küldünk
      if (hatralevoMs <= 0) continue;

      // A küszöb: a döntési idő 25%-a, de legfeljebb 24 óra
      const kuszobMs = Math.min((javaslat.dontesiIdo ?? 0) * 1000 * 0.25, MAX_ELORE_MS);
      if (hatralevoMs > kuszobMs) continue; // még nincs elég közel

      const erintett = javaslat.erintettEntitasok?.[0];
      if (!erintett) continue;

      try {
        await ErtesitesService.ertesitesKuldes(
          erintett.entitasId,
          erintett.entitasTipus,
          'szavazasiHatarido',
          {
            javaslatId: javaslat._id,
            javaslatTipus: javaslat.javaslatTipus,
            hatalybaLepesIdeje: javaslat.hatalybaLepesIdeje
          },
          null // rendszer-esemény (cron) – nincs cselekvő
        );
        // Csak sikeres küldés után jelöljük elküldöttnek
        await JavaslatRepository.setHataridoErtesitesElkuldve(javaslat._id);
        kuldott++;
      } catch (ertesitesHiba) {
        console.error('hataridoErtesitesekKuldese - ertesites HIBA (nem blokkolo)', {
          javaslatId: javaslat._id,
          hiba: ertesitesHiba.message
        });
      }
    }

    console.log('JavaslatIdozitesService.hataridoErtesitesekKuldese - VÉGE', {
      jelolt: jeloltek.length,
      kuldott
    });
    return kuldott;
  }

 // === SEGÉDFÜGGVÉNYEK ===

 // ----- ÉRINTETT ENTITÁSOK KÜSZÖBÉRTÉKEINEK LEKÉRÉSE -----
 /**
   * Érintett entitások küszöbértékeinek átlagolása.
   * JAVÍTÁS (2026-07-18): korábban csak a "Tartalom" típusú érintetteket vette
   * figyelembe, ezért kategórián/tartalomtípuson tett javaslat a SAJÁT beállított
   * küszöbei helyett az alapértelmezett 51%/0%-kal dőlt el. Az érték-rendszer
   * (aktulisErtekekLekerese) entitás-polimorf, ezért mostantól MINDHÁROM
   * érték-képes típus (Tartalom, Kategoria, TartalomTipus) beleszámít.
   * Ha egyik sincs az érintettek között, alapértelmezett értékeket ad vissza.
   * @param {Array} erintettEntitasok - Érintett entitások tömbje
   * @returns {Promise<Object>} Átlagolt küszöbértékek
   */
 async erintettEntitasokKuszobertekenekLekerese(erintettEntitasok) {
   console.log('("=================================== erintettEntitasokKuszobertekenekLekerese', {
     osszesErintett: erintettEntitasok.length
   });

   // 1. LÉPÉS - Az érték-képes típusú entitások kiszűrése (van/lehet hisztogramjuk)
   const ERTEK_KEPES_TIPUSOK = ['Tartalom', 'Kategoria', 'TartalomTipus'];
   const ertekKepesek = erintettEntitasok.filter(e => ERTEK_KEPES_TIPUSOK.includes(e.entitasTipus));
   console.log('Érték-képes érintettek száma:', ertekKepesek.length);

   // Ha nincs érték-képes entitás az érintettek között, alapértelmezett értékeket adunk vissza
   if (ertekKepesek.length === 0) {
     console.log('Nincs érték-képes entitás az érintettek között, alapértelmezett értékek visszaadása');
     return {
       aktualJavaslatElfogadasiKuszob: 51, // Alapértelmezett minimum
       aktualReszveteliAranyKuszob: 0 // Alapértelmezett 0% (nincs küszöb)
     };
   }

   // 2. LÉPÉS - Minden érintett entitás küszöbértékeinek lekérése
   let osszegErtekJavaslatKuszob = 0;
   let osszegReszveteliKuszob = 0;

   for (const entitas of ertekKepesek) {

     console.log("erintettEntitasokKuszobertekenekLekerese >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ErtekSzamitasService.aktulisErtekekLekerese");

     const ertekek = await ErtekSzamitasService.aktulisErtekekLekerese(entitas.entitasId, entitas.entitasTipus);

     console.log('Entitás értékei:', {
       entitasId: entitas.entitasId,
       entitasTipus: entitas.entitasTipus,
       javaslatElfogadasiKuszob: ertekek.javaslatElfogadasiKuszob,
       reszveteliAranyKuszob: ertekek.reszveteliAranyKuszob
     });

     osszegErtekJavaslatKuszob += ertekek.javaslatElfogadasiKuszob;
     osszegReszveteliKuszob += ertekek.reszveteliAranyKuszob;
   }

   // 3. LÉPÉS - Átlagolás és kerekítés
   const atlagErtekJavaslatKuszob = Math.round(osszegErtekJavaslatKuszob / ertekKepesek.length);
   const atlagReszveteliKuszob = Math.round(osszegReszveteliKuszob / ertekKepesek.length);

   console.log('("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< erintettEntitasokKuszobertekenekLekerese', {
     aktualJavaslatElfogadasiKuszob: atlagErtekJavaslatKuszob,
     aktualReszveteliAranyKuszob: atlagReszveteliKuszob
   });

   return {
     aktualJavaslatElfogadasiKuszob: atlagErtekJavaslatKuszob,
     aktualReszveteliAranyKuszob: atlagReszveteliKuszob
   };
 }

   // === HATÁLYBA LÉPÉSI IDŐ BEÁLLÍTÁSA === // Metódus fejléc komment
  /** // JSDoc kezdete
   * Hatályba lépési időpont kiszámítása és beállítása // Leírás
   * Töredék csoport esetén közös hatályba lépési időt állít be minden töredékre // Leírás
   * @param {string} javaslatId - A javaslat ID-ja // Paraméter leírás
   * @returns {Promise<Object>} A frissített javaslat // Visszatérési érték leírás
   * @throws {Error} Ha a javaslat nem található // Hibaleírás
   */ // JSDoc vége
  async hatalybaLepesiIdoBeallitasa(javaslatId) { // Metódus kezdete
    console.log('("=================================== hatalybaLepesiIdoBeallitasa', { // Kezdő log
      javaslatId: javaslatId // Javaslat azonosító logolása
    }); // Kezdő log vége

    const javaslat = await JavaslatRepository.findById(javaslatId); // Lekérjük a javaslatot az adatbázisból

    if (!javaslat) { // Ellenőrizzük, hogy létezik-e a javaslat
      throw new Error('A javaslat nem található'); // Hiba dobása, ha nincs ilyen javaslat
    } // Létezés ellenőrzés vége

    console.log('hatalybaLepesiIdoBeallitasa - Lekért javaslat', { // Részletes log a lekért javaslatról
      javaslatId: javaslat._id, // Javaslat azonosító
      toredekCsoportId: javaslat.toredekCsoportId || null, // Töredék csoport azonosító
      dontesiIdo: javaslat.dontesiIdo, // Saját döntési idő
      letrehozva: javaslat.letrehozva // Saját létrehozási idő
    }); // Részletes log vége

    if (javaslat.toredekCsoportId) { // Ha a javaslat töredék csoporthoz tartozik
      console.log('hatalybaLepesiIdoBeallitasa - Töredék csoportos közös időzítés indul', { // Log a csoportos ág elején
        javaslatId: javaslat._id, // Aktuális javaslat azonosító
        toredekCsoportId: javaslat.toredekCsoportId // Töredék csoport azonosító
      }); // Csoportos ág log vége

      const kozosIdozitesiAdatok = await this.toredekCsoportKozosIdozitesiAdataiLekerese(javaslat.toredekCsoportId); // Lekérjük a csoport közös időzítési adatait

      const hozzaadandoMs = kozosIdozitesiAdatok.kozosDontesiIdo * 1000; // A közös (MAX) döntési időt milliszekundumba alakítjuk

      const kozosHatalybaLepesIdeje = new Date(kozosIdozitesiAdatok.kozosLetrehozasIdeje.getTime() + hozzaadandoMs); // Kiszámoljuk a közös hatályba lépési időt

      console.log('hatalybaLepesiIdoBeallitasa - Közös hatályba lépési idő számolva', { // Log a közös eredményről
        toredekCsoportId: javaslat.toredekCsoportId, // Töredék csoport azonosító
        kozosDontesiIdo: kozosIdozitesiAdatok.kozosDontesiIdo, // Közös (MAX) döntési idő
        kozosLetrehozasIdeje: kozosIdozitesiAdatok.kozosLetrehozasIdeje, // Közös alapidő
        kozosHatalybaLepesIdeje: kozosHatalybaLepesIdeje // Közös hatályba lépési idő
      }); // Log vége

      for (const toredekJavaslat of kozosIdozitesiAdatok.toredekJavaslatok) { // Végigmegyünk a teljes töredék csoporton
        console.log('hatalybaLepesiIdoBeallitasa >>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateHatalybaLepesIdeje', { // Frissítés előtti log
          javaslatId: toredekJavaslat._id, // Frissítendő töredék azonosítója
          kozosHatalybaLepesIdeje: kozosHatalybaLepesIdeje // Beállítandó közös idő
        }); // Frissítés előtti log vége

        await JavaslatRepository.updateHatalybaLepesIdeje( // Frissítjük az adott töredék hatályba lépési idejét
          toredekJavaslat._id, // Az aktuális töredék azonosítója
          kozosHatalybaLepesIdeje // Az egységes közös időpont
        ); // Frissítés vége
      } // Töredékcsoport frissítési ciklus vége

      const frissitettJavaslat = await JavaslatRepository.findById(javaslatId); // Újra lekérjük az eredetileg kért javaslatot a friss adatokkal

      console.log('("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< hatalybaLepesiIdoBeallitasa', { // Záró log a csoportos ághoz
        javaslatId: javaslatId, // Eredeti javaslat azonosító
        mod: 'toredekCsoportKozosIdozites', // Jelöljük, hogy csoportos ág futott
        toredekCsoportId: javaslat.toredekCsoportId, // Töredék csoport azonosító
        hatalybaLepesIdeje: frissitettJavaslat.hatalybaLepesIdeje // Végleges közös hatályba lépési idő
      }); // Záró log vége

      return frissitettJavaslat; // Visszaadjuk a frissített javaslatot
    } // Töredék csoportos ág vége

    // Önálló (nem töredékelt) javaslat esetén a saját létrehozási idő és döntési idő alapján számolunk
    console.log('hatalybaLepesiIdoBeallitasa - Önálló javaslat időzítése', { // Log az önálló ág elején
      javaslatId: javaslat._id, // Aktuális javaslat azonosító
      dontesiIdo: javaslat.dontesiIdo, // Saját döntési idő
      letrehozva: javaslat.letrehozva // Saját létrehozási idő
    }); // Önálló ág log vége

    if (typeof javaslat.dontesiIdo !== 'number' || Number.isNaN(javaslat.dontesiIdo)) { // Érvényes döntési idő ellenőrzése
      throw new Error('A javaslatnak nincs érvényes dontesiIdo értéke'); // Hiba dobása érvénytelen döntési időnél
    }

    const sajatHozzaadandoMs = javaslat.dontesiIdo * 1000; // A döntési időt milliszekundumba alakítjuk
    const sajatHatalybaLepesIdeje = new Date(javaslat.letrehozva.getTime() + sajatHozzaadandoMs); // Kiszámoljuk a hatályba lépési időt

    console.log('hatalybaLepesiIdoBeallitasa >>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateHatalybaLepesIdeje (önálló)', { // Frissítés előtti log
      javaslatId: javaslat._id, // Frissítendő javaslat azonosítója
      sajatHatalybaLepesIdeje: sajatHatalybaLepesIdeje // Beállítandó időpont
    }); // Frissítés előtti log vége

    const frissitettOnalloJavaslat = await JavaslatRepository.updateHatalybaLepesIdeje( // Frissítjük a javaslat hatályba lépési idejét
      javaslat._id, // A javaslat azonosítója
      sajatHatalybaLepesIdeje // A kiszámolt időpont
    ); // Frissítés vége

    console.log('("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< hatalybaLepesiIdoBeallitasa', { // Záró log az önálló ághoz
      javaslatId: javaslatId, // Eredeti javaslat azonosító
      mod: 'onallo', // Jelöljük, hogy az önálló ág futott
      hatalybaLepesIdeje: frissitettOnalloJavaslat.hatalybaLepesIdeje // Végleges hatályba lépési idő
    }); // Záró log vége

    return frissitettOnalloJavaslat; // Visszaadjuk a frissített javaslatot
  }
   


 // === JAVASLAT VÉGREHAJTÁS ELLENŐRZÉSE ===
   /**
    * Egyedi javaslat végrehajtás ellenőrzése
    * Ellenőrzi, hogy a javaslat teljesíti-e a küszöbértékeket
    * @param {ObjectId} javaslatId - Javaslat azonosítója
    * @returns {Promise<Object>} { elfogadva: boolean, ... }
    */
   async javaslatVegrehajtasEllenorzese(javaslatId) {
  console.log('=================================== javaslatVegrehajtasEllenorzese', { 
    javaslatId: javaslatId 
  });

  try {
    // 1. LÉPÉS - JAVASLAT LEKÉRÉSE
    console.log("javaslatVegrehajtasEllenorzese >>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findById: ", {
      javaslatId: javaslatId
    });
    
    const javaslat = await JavaslatRepository.findById(javaslatId);
    if (!javaslat) {
      throw new Error('Javaslat nem található');
    }

    // 2. LÉPÉS - IDŐPONT ÉS STÁTUSZ ELLENŐRZÉS
    const most = new Date();
    const hatalybaLepett = javaslat.hatalybaLepesIdeje <= most;
    const aktiv = javaslat.statusz === 'Aktiv';

    console.log('Időpont és státusz ellenőrzés:', {
      hatalybaLepett,
      aktiv,
      hatalybaLepesIdeje: javaslat.hatalybaLepesIdeje,
      mostaniIdo: most
    });

    if (!hatalybaLepett || !aktiv) {
      console.log('Javaslat még nem léphet hatályba vagy nem aktív');
      return { 
        elfogadva: false, 
        ok: 'Még nem lépett hatályba vagy nem aktív' 
      };
    }

    // 3. LÉPÉS - KÜSZÖBÉRTÉKEK LEKÉRÉSE (MINDEN TÍPUSNÁL UGYANEZ)
    console.log("javaslatVegrehajtasEllenorzese >>>>>>>>>>>>>>>>>>>>>>>>>>> this.erintettEntitasokKuszobertekenekLekerese: ", {
      javaslatTipus: javaslat.javaslatTipus,
      erintettEntitasok: javaslat.erintettEntitasok
    });

    const kuszobok = await this.erintettEntitasokKuszobertekenekLekerese(javaslat.erintettEntitasok);

    // 4. LÉPÉS - KÜSZÖB ELLENŐRZÉS (UNIVERZÁLIS - MINDEN TÍPUSNÁL UGYANEZ)
    const kuszobTeljesul = 
      javaslat.tamogatotsagiArany >= kuszobok.aktualJavaslatElfogadasiKuszob &&
      javaslat.reszveteliArany >= kuszobok.aktualReszveteliAranyKuszob;

    console.log('Küszöbök ellenőrzése:', {
      javaslatTipus: javaslat.javaslatTipus,
      tamogatotsagiArany: javaslat.tamogatotsagiArany,
      aktualJavaslatElfogadasiKuszob: kuszobok.aktualJavaslatElfogadasiKuszob,  // ✅ kuszobok objektumból!
      tamogatottsagTeljesul: javaslat.tamogatotsagiArany >= kuszobok.aktualJavaslatElfogadasiKuszob,
      reszveteliArany: javaslat.reszveteliArany,
      aktualReszveteliAranyKuszob: kuszobok.aktualReszveteliAranyKuszob,  // ✅ kuszobok objektumból!
      reszvételTeljesul: javaslat.reszveteliArany >= kuszobok.aktualReszveteliAranyKuszob,
      kuszobTeljesul: kuszobTeljesul
    });

    let elfogadva = false;
    let ok = '';

    if (kuszobTeljesul) {
      elfogadva = true;
      ok = 'Küszöbök teljesülnek - végrehajtás';
      console.log(`✅ ${javaslat.javaslatTipus} - Küszöbök teljesülnek - javaslat végrehajtása`);
    } else {
      elfogadva = false;
      ok = 'Küszöbök nem teljesülnek - elvetés';
      console.log(`❌ ${javaslat.javaslatTipus} - Küszöbök nem teljesülnek - javaslat elvetése`);
    }

    // 5. LÉPÉS - STÁTUSZ FRISSÍTÉSE ÉS VÉGREHAJTÁS
    if (elfogadva) {
      // ELFOGADVA - Végrehajtás
      console.log("javaslatVegrehajtasEllenorzese >>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateStatusz: ", {
        javaslatId: javaslatId
      }, "Elfogadva");
      
      await JavaslatRepository.updateStatusz(javaslatId, 'Elfogadva');
      
      // Végrehajtó hívása
      console.log("javaslatVegrehajtasEllenorzese >>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatVegrehajtasiService.javaslatVegrehajtasa");
      await JavaslatVegrehajtasiService.javaslatVegrehajtasa(javaslat);
      
    } else {
      // ELVETVE
      console.log("javaslatVegrehajtasEllenorzese >>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateStatusz: ", {
        javaslatId: javaslatId
      }, "Elvetve");

      await JavaslatRepository.updateStatusz(javaslatId, 'Elvetve');

      // KÜLÖNVÁLÁS: aki TÁMOGATTA a módosítást és kérte a külön ágat, elviheti magával a
      // módosított állapotot. Külön try/catch: a döntés (az elvetés) MÁR megtörtént —
      // ha a különválás elhasal, az elvetés attól még érvényes marad.
      try {
        await this._kulonvalasokElvetesUtan([javaslat]);
      } catch (kulonvalasHiba) {
        console.error('javaslatVegrehajtasEllenorzese - KÜLÖNVÁLÁS HIBA (nem blokkoló)', {
          javaslatId, hiba: kulonvalasHiba.message
        });
      }
    }

    // 6. LÉPÉS - EREDMÉNY VISSZAADÁSA
    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< javaslatVegrehajtasEllenorzese: ", {
      elfogadva,
      ok,
      javaslatId
    });
    
    return {
      elfogadva,
      ok,
      javaslatId
    };

  } catch (error) {
    console.error('❌ Hiba a javaslat végrehajtás ellenőrzése során:', error);
    throw error;
  }
}

  // === TÖREDÉK CSOPORT VÉGREHAJTÁS ELLENŐRZÉSE ===
  /**
   * Töredék csoport végrehajtás ellenőrzése
   * A csoport csak akkor elfogadott, ha MINDEN töredék teljesíti a saját küszöbeit
   * @param {Array} javaslatok - Ugyanahhoz a toredekCsoportId-hoz tartozó javaslatok tömbje
   * @returns {Promise<Object>} { elfogadva: boolean, ok: string, csoportId, javaslatok }
   */
  async toredekCsoportVegrehajtasEllenorzese(javaslatok) {
    // Log metódus kezdete
    console.log('=================================== toredekCsoportVegrehajtasEllenorzese', {
      javaslatokDb: javaslatok.length,
      toredekCsoportId: javaslatok[0]?.toredekCsoportId || null
    }); // Itt logoljuk a csoport méretét és azonosítóját

    // 1. LÉPÉS - ALAP ELLENŐRZÉSEK
    if (!javaslatok || javaslatok.length === 0) {
      // Ha üres tömb érkezik, az logikai hiba a hívó oldalon
      throw new Error('toredekCsoportVegrehajtasEllenorzese: üres javaslat lista'); // Hiba dobása
    } // Van legalább egy javaslat

    // Közös csoport azonosító meghatározása
    const toredekCsoportId = javaslatok[0].toredekCsoportId || null; // Első javaslat csoport ID-ja

    // 2. LÉPÉS - MINDEN TÖREDÉK ELLENŐRZÉSE
    let mindenElfogadva = true; // Kezdetben feltételezzük, hogy minden töredék teljesíti a küszöböt
    const reszletesEredmenyek = []; // Ide gyűjtjük az egyes töredékek eredményét

    for (const javaslat of javaslatok) {
      // 2.1 - IDŐPONT ÉS STÁTUSZ ELLENŐRZÉSE TÖREDÉKRE
      const most = new Date(); // Aktuális idő
      const hatalybaLepett = javaslat.hatalybaLepesIdeje <= most; // Hatályba lépett-e
      const aktiv = javaslat.statusz === 'Aktiv'; // Aktív-e a javaslat

      console.log('Töredék időpont és státusz ellenőrzés:', {
        javaslatId: javaslat._id,
        hatalybaLepett,
        aktiv,
        hatalybaLepesIdeje: javaslat.hatalybaLepesIdeje,
        mostaniIdo: most
      }); // Logoljuk az állapotot

      if (!hatalybaLepett || !aktiv) {
        // Ha egy töredék még nem lépett hatályba vagy nem aktív, a csoport nem dönthető el
        console.log('Töredék még nem léphet hatályba vagy nem aktív - csoport nem elfogadható', {
          javaslatId: javaslat._id
        }); // Log üzenet

        mindenElfogadva = false; // A csoport nem teljes
        reszletesEredmenyek.push({
          javaslatId: javaslat._id,
          elfogadva: false,
          ok: 'Még nem lépett hatályba vagy nem aktív'
        }); // Eredmény rögzítése

        continue; // Továbblépünk a következő töredékre
      } // Időpont és státusz rendben

      // 2.2 - KÜSZÖBÉRTÉKEK LEKÉRÉSE TÖREDÉKRE
      console.log('Töredék küszöbértékek lekérése:', {
        javaslatId: javaslat._id,
        erintettEntitasok: javaslat.erintettEntitasok
      }); // Logoljuk a hívást

      const kuszobok = await this.erintettEntitasokKuszobertekenekLekerese(
        javaslat.erintettEntitasok
      ); // Lekérjük az érintett entitások küszöbeit

      // 2.3 - KÜSZÖB ELLENŐRZÉS TÖREDÉKRE
      const kuszobTeljesul =
        javaslat.tamogatotsagiArany >= kuszobok.aktualJavaslatElfogadasiKuszob &&
        javaslat.reszveteliArany >= kuszobok.aktualReszveteliAranyKuszob; // Mindkét küszöbnek teljesülnie kell

      console.log('Töredék küszöbök ellenőrzése:', {
        javaslatId: javaslat._id,
        tamogatotsagiArany: javaslat.tamogatotsagiArany,
        aktualJavaslatElfogadasiKuszob: kuszobok.aktualJavaslatElfogadasiKuszob,
        reszveteliArany: javaslat.reszveteliArany,
        aktualReszveteliAranyKuszob: kuszobok.aktualReszveteliAranyKuszob,
        kuszobTeljesul
      }); // Logoljuk az ellenőrzés eredményét

      if (!kuszobTeljesul) {
        // Ha egy töredék nem teljesíti a küszöböket, az egész csoport elbukik
        mindenElfogadva = false; // A csoport nem elfogadható
      } // Csoport állapot frissítése

      reszletesEredmenyek.push({
        javaslatId: javaslat._id,
        elfogadva: kuszobTeljesul,
        ok: kuszobTeljesul
          ? 'Küszöbök teljesülnek'
          : 'Küszöbök nem teljesülnek'
      }); // Eredmény rögzítése
    } // Minden töredéken végigmentünk

    // 3. LÉPÉS - STÁTUSZOK FRISSÍTÉSE CSOPORTSZINTEN
    if (mindenElfogadva) {
      // Ha minden töredék teljesítette a küszöböt, a csoport Elfogadva
      console.log('Töredék csoport ELFOGADVA - minden töredék teljesítette a küszöböket', {
        toredekCsoportId
      }); // Log üzenet

      // Minden töredék státuszának frissítése Elfogadva értékre
      for (const javaslat of javaslatok) {
        await JavaslatRepository.updateStatusz(javaslat._id, 'Elfogadva'); // Státusz frissítése
      } // Minden töredéket Elfogadva-ra állítottunk

      return {
        elfogadva: true,
        ok: 'Minden töredék teljesítette a küszöböket - csoport elfogadva',
        toredekCsoportId,
        reszletesEredmenyek
      }; // Csoport elfogadva eredmény
    } else {
      // Ha bármelyik töredék elbukott, az egész csoport Elvetve
      console.log('Töredék csoport ELVETVE - legalább egy töredék nem teljesítette a küszöböket', {
        toredekCsoportId
      }); // Log üzenet

      // Minden töredék státuszának frissítése Elvetve értékre
      for (const javaslat of javaslatok) {
        await JavaslatRepository.updateStatusz(javaslat._id, 'Elvetve'); // Státusz frissítése
      } // Minden töredéket Elvetve-re állítottunk

      // KÜLÖNVÁLÁS: töredékenként, mert minden töredéknek saját szavazatai és saját
      // érintett entitása van. Külön try/catch — a csoport elvetése már megtörtént.
      try {
        await this._kulonvalasokElvetesUtan(javaslatok);
      } catch (kulonvalasHiba) {
        console.error('toredekCsoportVegrehajtasEllenorzese - KÜLÖNVÁLÁS HIBA (nem blokkoló)', {
          toredekCsoportId, hiba: kulonvalasHiba.message
        });
      }

      return {
        elfogadva: false,
        ok: 'Legalább egy töredék nem teljesítette a küszöböket - csoport elvetve',
        toredekCsoportId,
        reszletesEredmenyek
      }; // Csoport elvetve eredmény
    } // Csoport döntés ágak vége
  } // toredekCsoportVegrehajtasEllenorzese metódus vége


 // === HATÁLYBA LÉPENDŐ JAVASLATOK LEKÉRÉSE ===
 /**
   * Hatályba lépendő javaslatok lekérése - Cron job-hoz
   * Státusz: Elfogadva és hatályba lépési idő <= most
   * @returns {Promise<Array>} Hatályba lépendő javaslatok tömb
   */
 async hatalybaLependoJavaslatokLekerese() {
   console.log('("=================================== hatalybaLependoJavaslatokLekerese');
   
   // Repository hívás - hatályba lépendő javaslatok
   console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findHatalybaLependok ");
   
   const javaslatok = await JavaslatRepository.findHatalybaLependok();
   
   console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< hatalybaLependoJavaslatokLekerese", {
     javaslatok: javaslatok
   });
   return javaslatok;
 }

   // === TÖREDÉK CSOPORT KÖZÖS IDŐZÍTÉSI ADATAINAK LEKÉRÉSE === // Új segédfüggvény fejléc komment
  /** // JSDoc kezdete
   * Töredék csoport közös időzítési adatainak lekérése // Leírás
   * A csoport összes töredékének dontesiIdo értékét átlagolja // Leírás
   * A csoport legkorábbi létrehozási idejét használja közös alapidőnek // Leírás
   * @param {string|ObjectId} toredekCsoportId - Töredék csoport azonosító // Paraméter leírás
   * @returns {Promise<Object>} Közös időzítési adatok // Visszatérési érték leírás
   */ // JSDoc vége
  async toredekCsoportKozosIdozitesiAdataiLekerese(toredekCsoportId) { // Új metódus kezdete
    console.log('=================================== toredekCsoportKozosIdozitesiAdataiLekerese', { // Kezdő log
      toredekCsoportId: toredekCsoportId // Bemeneti érték logolása
    }); // Kezdő log vége

    if (!toredekCsoportId) { // Ellenőrizzük, hogy van-e csoport azonosító
      throw new Error('A töredék csoport azonosító megadása kötelező'); // Hiba dobása hiányzó azonosítónál
    } // Csoport azonosító ellenőrzés vége

    console.log('toredekCsoportKozosIdozitesiAdataiLekerese >>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findByToredekCsoportId', { // Repository hívás előtti log
      toredekCsoportId: toredekCsoportId // Szűrő logolása
    }); // Repository hívás előtti log vége

    // FONTOS: a findByToredekCsoportId a HELYES, csoportra szűrő lekérdezés.
    // (A korábbi findAll({toredekCsoportId}) NEM szűrt — a findAll nem ismeri ezt a
    //  kulcsot —, így a DB ÖSSZES javaslatán számolt; ez hibás közös időt adott.)
    const toredekJavaslatok = await JavaslatRepository.findByToredekCsoportId(toredekCsoportId); // A csoport aktív töredékei

    if (!toredekJavaslatok || toredekJavaslatok.length === 0) { // Ellenőrizzük, hogy kaptunk-e töredékeket
      throw new Error('A töredék csoport javaslatai nem találhatók'); // Hiba dobása, ha nincs találat
    } // Találat ellenőrzés vége

    const ervenyesDontesiIdok = toredekJavaslatok // Az összes töredékből kinyerjük az érvényes döntési időket
      .map(javaslat => javaslat.dontesiIdo) // Képezünk egy tömböt csak a döntési időkből
      .filter(dontesiIdo => typeof dontesiIdo === 'number' && !Number.isNaN(dontesiIdo)); // Csak a szám típusú döntési időket tartjuk meg

    if (ervenyesDontesiIdok.length === 0) { // Ellenőrizzük, hogy maradt-e használható döntési idő
      throw new Error('A töredék csoportban nincs érvényes dontesiIdo érték'); // Hiba dobása, ha nincs érvényes döntési idő
    } // Érvényes döntési idő ellenőrzés vége

    // EGYSÉGES DÖNTÉSI IDŐ = a töredékek döntési idejének MAXIMUMA.
    // A leglassabb (legbizonytalanabb) töredék diktálja a csoport zárását: mivel
    // ÉS-szabály szerint MINDEN töredéknek külön át kell mennie, a csoport ne
    // záruljon, amíg a legkevésbé egyértelmű töredék is meg nem érik a döntésre.
    // Ráadásul a maximum automatikusan tiszteletben tartja minden töredék saját
    // minimum döntési idejét (a max ≥ minden egyes töredék dontesiIdo-ja ≥ annak minimuma).
    const kozosDontesiIdo = Math.max(...ervenyesDontesiIdok); // A csoport egységes döntési ideje

    const letrehozasIdopontok = toredekJavaslatok.map(javaslat => javaslat.letrehozva.getTime()); // Minden töredék létrehozási idejét timestampre alakítjuk

    const legkorabbiLetrehozasTimestamp = Math.min(...letrehozasIdopontok); // Meghatározzuk a csoport legkorábbi létrehozási idejét

    const kozosLetrehozasIdeje = new Date(legkorabbiLetrehozasTimestamp); // Dátum objektummá alakítjuk a közös kezdőidőt

    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< toredekCsoportKozosIdozitesiAdataiLekerese', { // Záró log
      toredekCsoportId: toredekCsoportId, // Csoport azonosító logolása
      toredekDb: toredekJavaslatok.length, // Töredékek száma
      ervenyesDontesiIdok: ervenyesDontesiIdok, // Felhasznált döntési idők
      kozosDontesiIdo: kozosDontesiIdo, // Kiszámolt közös (MAX) döntési idő
      kozosLetrehozasIdeje: kozosLetrehozasIdeje // Közös kezdőidő logolása
    }); // Záró log vége

    return { // Visszaadjuk a közös időzítési adatokat
      toredekJavaslatok: toredekJavaslatok, // A csoport összes töredéke
      kozosDontesiIdo: kozosDontesiIdo, // Közös (MAX) döntési idő
      kozosLetrehozasIdeje: kozosLetrehozasIdeje // Közös alap létrehozási idő
    }; // Visszatérési objektum vége
  } // Metódus vége


   // === TÖMEGES VÉGREHAJTÁS ELLENŐRZÉS ===

  /**
   * Tömeges végrehajtás ellenőrzés - Cron job-hoz
   * Végignézi az összes hatályba lépendő javaslatot
   * ÚJ: Töredék csoport szintű döntés - minden töredéknek teljesítenie kell a küszöböket
   * @returns {Promise<Object>} Végrehajtás statisztika
   */
  async tomegesVegrehajtasEllenorzes() {
    console.log('=================================== tomegesVegrehajtasEllenorzes::'); // Log metódus kezdete

    // === 1. LÉPÉS: ELAVULT JAVASLATOK FRISSÍTÉSE ===
    console.log('Elavult javaslatok frissítése...'); // Log üzenet

    const JavaslatService = require('./javaslatService'); // Circular import elkerülése

    console.log('tomegesVegrehajtasEllenorzes >>>>>>>>>>>>>>>>>>>>>>>>> JavaslatService.elavultJavaslatokFrissitese'); // Log a hívás előtt

    const frissitesiEredmeny = await JavaslatService.elavultJavaslatokFrissitese(); // Elavult javaslatok frissítése

    console.log('Frissítési eredmény:', frissitesiEredmeny); // Log az eredményről

    // === 2. LÉPÉS: HATÁLYBA LÉPENDŐ JAVASLATOK LEKÉRÉSE ===
    console.log('tomegesVegrehajtasEllenorzes >>>>>>>>>>>>>>>>>>>>>>>>>>> this.hatalybaLependoJavaslatokLekerese'); // Log a hívás előtt

    const javaslatok = await this.hatalybaLependoJavaslatokLekerese(); // Lekérjük a hatályba lépő javaslatokat

    // Statisztika objektum inicializálása
    const eredmenyek = {
      osszesen: javaslatok.length, // Összes hatályba lépő javaslat
      csoportok: 0,               // Érintett töredék csoportok száma
      egyediJavaslatok: 0,        // Olyan javaslatok, amik nem töredékek
      vegrehajtva: 0,             // Végrehajtott javaslatok száma
      elvetve: 0,                 // Elvetett javaslatok száma
      hibak: []                   // Hibák listája
    }; // Statisztika objektum

    // === 3. LÉPÉS: JAVASLATOK CSOPORTOSÍTÁSA TÖREDÉK CSOPORT ALAPJÁN ===
    const csoportokMap = new Map(); // Map a töredék csoportokhoz
    const egyediJavaslatok = [];    // Tömb az olyan javaslatokhoz, amiknek nincs toredekCsoportId-juk

    for (const javaslat of javaslatok) {
      if (javaslat.toredekCsoportId) {
        // Ha van töredék csoport ID, csoportba tesszük
        const kulcs = javaslat.toredekCsoportId.toString(); // String kulcs a Map-hez

        if (!csoportokMap.has(kulcs)) {
          // Ha még nincs ilyen csoport, létrehozzuk
          csoportokMap.set(kulcs, []); // Üres tömb inicializálása
        } // Csoport inicializálása

        csoportokMap.get(kulcs).push(javaslat); // Hozzáadjuk a javaslatot a csoporthoz
      } else {
        // Ha nincs töredék csoport ID, egyedi javaslatként kezeljük
        egyediJavaslatok.push(javaslat); // Hozzáadjuk az egyedi javaslatokhoz
      }
    } // Csoportosítás vége

    eredmenyek.csoportok = csoportokMap.size;      // Érintett töredék csoportok száma
    eredmenyek.egyediJavaslatok = egyediJavaslatok.length; // Egyedi javaslatok száma

    console.log('tomegesVegrehajtasEllenorzes - Csoportosítás eredménye:', {
      csoportokSzama: eredmenyek.csoportok,
      egyediJavaslatokSzama: eredmenyek.egyediJavaslatok
    }); // Logoljuk az összegzést

        // === 4. LÉPÉS: TÖREDÉK CSOPORTOK VÉGREHAJTÁS ELLENŐRZÉSE ===
    for (const [kulcs, csoportJavaslatok] of csoportokMap.entries()) {
      try {
        // Csoportos ellenőrzés
        const csoportEredmeny = await this.toredekCsoportVegrehajtasEllenorzese(
          csoportJavaslatok
        ); // Csoport ellenőrzése

        if (csoportEredmeny.elfogadva) {
          // ✅ CSOPORT ELFOGADOTT: minden töredék teljesítette a küszöböket
          console.log('Töredék csoport végrehajtásra kerül:', {
            toredekCsoportId: kulcs,
            toradekDb: csoportJavaslatok.length
          }); // Log üzenet

          // EGYEDÜL ESZERRE hívjuk meg a végrehajtást a teljes csoport tömbbel
          console.log('tomegesVegrehajtasEllenorzes >>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatVegrehajtasiService.javaslatVegrehajtasa (CSOPORT)'); // Log a hívás előtt

          const vegrehajtasiEredmeny = await JavaslatVegrehajtasiService.javaslatVegrehajtasa(
            csoportJavaslatok  // A teljes töredék javaslatok tömbje átadása!
          ); // Végrehajtás hívása teljes csoportszinten

          console.log('Csoport végrehajtás eredménye:', {
            javaslatId: vegrehajtasiEredmeny.javaslatId,
            egyezmenyId: vegrehajtasiEredmeny.egyezmeny?.id
          }); // Logoljuk a végrehajtás eredményét

          eredmenyek.vegrehajtva += csoportJavaslatok.length; // Statisztika frissítése

          // ÉRTESÍTÉS: a csoport ELFOGADVA → minden érintett entitás figyelőinek
          await this._lezarasErtesites(csoportJavaslatok, 'javaslatElfogadas', vegrehajtasiEredmeny.egyezmeny?.id);
        } else {
          // ❌ CSOPORT ELVETVE: legalább egy töredék elbukott
          console.log('Töredék csoport elvetve:', {
            toredekCsoportId: kulcs,
            toradekDb: csoportJavaslatok.length,
            reszletesEredmenyek: csoportEredmeny.reszletesEredmenyek
          }); // Log üzenet részletekkel

          eredmenyek.elvetve += csoportJavaslatok.length; // Statisztika frissítése

          // ÉRTESÍTÉS: a csoport ELVETVE → minden érintett entitás figyelőinek
          await this._lezarasErtesites(csoportJavaslatok, 'javaslatElvetve');
        }
      } catch (error) {
        // Hiba esetén rögzítjük, de folytatjuk a többi csoporttal
        console.error('Hiba töredék csoport feldolgozása közben:', {
          toredekCsoportId: kulcs,
          hiba: error.message
        }); // Hibát logoljuk

        for (const javaslat of csoportJavaslatok) {
          eredmenyek.elvetve++; // Minden érintett javaslatot elvetettnek tekintünk
          eredmenyek.hibak.push({
            javaslatId: javaslat._id,
            hiba: error.message
          }); // Hibát rögzítjük
        }
      }
    } // Minden csoportot feldolgoztunk


    // === 5. LÉPÉS: EGYEDI JAVASLATOK ELLENŐRZÉSE (NEM TÖREDÉKEK) ===
    for (const javaslat of egyediJavaslatok) {
      try {
        // Eredeti egyedi ellenőrzés használata
        const vegrehajtas = await this.javaslatVegrehajtasEllenorzese(javaslat._id); // Egyedi javaslat ellenőrzése

        if (vegrehajtas && vegrehajtas.elfogadva) {
          eredmenyek.vegrehajtva++; // Elfogadott javaslat
          // ÉRTESÍTÉS: egyedi javaslat ELFOGADVA
          await this._lezarasErtesites([javaslat], 'javaslatElfogadas');
        } else {
          eredmenyek.elvetve++; // Elvetett javaslat
          // ÉRTESÍTÉS: egyedi javaslat ELVETVE
          await this._lezarasErtesites([javaslat], 'javaslatElvetve');
        }
      } catch (error) {
        // Hiba esetén rögzítjük, de folytatjuk a többi javaslattal
        eredmenyek.elvetve++; // Elvetettnek tekintjük
        eredmenyek.hibak.push({
          javaslatId: javaslat._id,
          hiba: error.message
        }); // Hibát rögzítjük
      }
    } // Egyedi javaslatok feldolgozása vége

    console.log('<<<<<<<<<<<<<<<<<<<<<<<< tomegesVegrehajtasEllenorzes=====Eredmény:', {
      eredmenyek
    }); // Logoljuk az összesített eredményt

    return eredmenyek; // Visszaadjuk a statisztikát
  } // tomegesVegrehajtasEllenorzes metódus vége


}

// === EXPORTÁLÁS ===
// Service osztály singleton példány exportálása
module.exports = new JavaslatIdozitesService();
