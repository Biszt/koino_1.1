// backend/services/sikidomService.js

// ===== SÍKIDOM SERVICE =====
// Felelősség: a Síkidom nézet backend-adatai.
//
// A betöltés KÜSZÖB-VEZÉRELT, NEM lapozó. A nézetben egy síkidom akkor látszik,
// ha a képernyőn mért átmérője elér egy minimumot; ebből a méret-képlet
// megfordításával a kliens pontosan kiszámolja, MEKKORA TUDATPONT kell hozzá:
//
//   pontKüszöb = 20 × szülőPont × ( minimumÁtmérő / (2 × szülőKépernyőSugár) )²
//
// Így nem „a következő 60"-at kérjük, hanem „mindent, ami eléri ezt a küszöböt".
// Nagyításkor a küszöb folyamatosan süllyed, és mindig pontosan azok az entitások
// érkeznek, amelyek épp láthatóvá váltak — nincs önkényes lap-határ, és nem
// keletkezik törés a betöltött adagok között.
//
// A KURZOR (kurzorPont + kurzorId) mondja meg, meddig jutottunk. A rendezés
// döntője az `_id`, ezért a kurzor is arra épül — így azonos pontszámú testvérek
// sem maradnak ki és nem is duplázódnak.
//
// Használja: sikidomController.

// --- IMPORTÁLÁSOK ---
const hierarchikusAllokaciRepository = require('../repositories/hierarchikusTudatpontAllokaciRepository');
const { entitasCimekFeltoltese } = require('./ertesitesService');
// A MELLÉK-IKONOK a Struktúra nézettel KÖZÖS forrásból jönnek (nem másoljuk a
// logikát): Tartalomnál a kategóriák + a tartalomtípus ikonja, Javaslatnál és
// Egyezménynél a művelet-típus. Típusonként EGY csoportos lekérdezés, nincs N+1.
const strukturaService = require('./strukturaService');

// Biztonsági darab-plafon EGY kérésre. NEM ez az elsődleges szabály (azt a küszöb
// adja) — csak azért van, hogy egy szélsőségesen alacsony küszöb se robbantson.
const MAX_DARAB = 300;

// --- SÍKIDOM SERVICE OSZTÁLY ---
class SikidomService {

// ----- GYEREKEK EGY TUDATPONT-KÜSZÖB FÖLÖTT -----
/**
* Egy szülő azon gyerekei, amelyek elérik a megadott tudatpont-küszöböt,
* pont szerint csökkenő sorrendben.
*
* @param {string|null} szuloId - a szülő azonosítója; null/üres → a GYÖKEREK
* @param {number} minPont - a kliens által számolt tudatpont-küszöb
* @param {number|null} kurzorPont - meddig jutottunk (a legutóbbi sor pontja)
* @param {string|null} kurzorId - meddig jutottunk (a legutóbbi sor `_id`-ja)
* @param {number} darab - biztonsági darab-plafon
* @param {boolean} osszesKell - kérjük-e az ÖSSZES gyerek együttes pontját
* @returns {Promise<Object>} { gyerekek, osszesGyerekPont, kurzor, vanTovabb }
*/
async gyerekekLekerese(szuloId = null, minPont = 0, kurzorPont = null, kurzorId = null, darab = MAX_DARAB, osszesKell = true) {
  console.log('SikidomService.gyerekekLekerese - KEZDÉS', {
    szuloId, minPont, kurzorPont, kurzorId, darab, osszesKell
  });

  const plafon = Math.max(1, Math.min(darab, MAX_DARAB));
  const kuszob = Math.max(0, minPont);

  // EGGYEL többet kérünk: ha megjön a plusz egy, akkor a küszöb fölött van még
  // több, mint amennyi a plafonba fér (a kliens ilyenkor újra kér, kurzorral).
  const sorok = await hierarchikusAllokaciRepository.findGyerekekKuszobFolott(
    szuloId ?? null, kuszob, kurzorPont, kurzorId, plafon + 1
  );

  const vanTovabb = sorok.length > plafon;
  const adag = vanTovabb ? sorok.slice(0, plafon) : sorok;

  // Az ÖSSZES gyerek együttes pontja — ebből tudja a kliens, maradt-e még
  // le nem töltött testvér (összes − a már betöltöttek = ami még hátravan).
  //
  // CSAK KÉRÉSRE SZÁMOLJUK. Ez egy `$group` aggregáció a szülő MINDEN gyerekére:
  // egy milliós ágnál kérésenként végigolvasná az egészet, a kliens viszont
  // 150-esével kér — az több ezer teljes végigolvasás ugyanazért az egy számért.
  // A kliens ezért csak az ELSŐ kérésnél kéri el (`osszesKell=0` a többinél), és
  // utána a saját másolatát használja. Nem kérés esetén `null` megy vissza, amit
  // a kliens `??`-tal átugrik — a korábbi értéke marad érvényben.
  const osszesGyerekPont = osszesKell
    ? await hierarchikusAllokaciRepository.gyerekekOsszPontja(szuloId ?? null)
    : null;

  if (adag.length === 0) {
    console.log('SikidomService.gyerekekLekerese - VÉGE (a küszöb fölött nincs több)');
    return { gyerekek: [], osszesGyerekPont, kurzor: null, vanTovabb: false };
  }

  // Kinek van SAJÁT gyereke? Egyetlen lekérdezéssel az egész adagra (nincs N+1)
  const gyerekesIdk = await hierarchikusAllokaciRepository.melyikSzulonekVanGyereke(
    adag.map(sor => sor.entitasId)
  );
  const gyerekesHalmaz = new Set(gyerekesIdk.map(id => id.toString()));

  // Címek feltöltése (típusonként EGY csoportos lekérdezés). A cím-nélküli
  // típusoknál (Javaslat, Egyezmény) az entitasCim null marad.
  const cimmel = await entitasCimekFeltoltese(adag);

  // Mellék-ikonok: a síkidom FORMÁJA az entitástípust mutatja (kör/háromszög/…),
  // az IKONOK pedig azt, amit a forma nem tud — melyik kategóriába tartozik és
  // milyen típusú. A színek és formák száma korlátozott, az ikonoké nem.
  const mellekIkonok = await strukturaService.mellekIkonokFeltoltese(adag);

  const gyerekek = cimmel.map(sor => {
    const mellek = mellekIkonok.get(`${sor.entitasTipus}:${sor.entitasId.toString()}`) ?? {};

    return {
      entitasId: sor.entitasId,
      entitasTipus: sor.entitasTipus,
      cim: sor.entitasCim ?? null,
      hierarchikusOsszesPont: sor.hierarchikusOsszesPont ?? 0,
      vanGyereke: gyerekesHalmaz.has(sor.entitasId.toString()),

      // HOLTVERSENY-DÖNTŐ (Csaba, 2026-08-11). Azonos pontnál a LÉTREHOZÁS DÁTUMA
      // dönt, ugyanúgy, ahogy a Pakli sorolja be az egyenlő testvéreket
      // (`testverRendezes.js`). A Síkidom nézetben a FRISSEBB számít „kisebbnek",
      // tehát ő kerül beljebb — így marad igaz a nézet alapszabálya: ami később
      // érkezik, az beljebb való. (Az allokáció létrehozási ideje, mint a Pakliban.)
      letrehozva: sor.letrehozva ?? null,

      // { ikon, nev } objektumok; az `ikon` feltöltött kép-URL VAGY emoji
      kategoriaIkonok: mellek.kategoriaIkonok ?? [],
      tipusIkon:       mellek.tipusIkon ?? null,
      javaslatTipus:   mellek.javaslatTipus ?? null
    };
  });

  // A kurzor a KÖVETKEZŐ kéréshez: az utolsó visszaadott sor helye a rendezésben
  const utolso = adag[adag.length - 1];
  const kurzor = {
    pont: utolso.hierarchikusOsszesPont ?? 0,
    id: utolso._id.toString()
  };

  console.log('SikidomService.gyerekekLekerese - VÉGE', {
    visszaadottDarab: gyerekek.length,
    osszesGyerekPont,
    vanTovabb
  });

  return { gyerekek, osszesGyerekPont, kurzor, vanTovabb };
}

// ----- EGY ENTITÁS ŐS-LÁNCA (A NÉZET ÁG-GYÖKÉRTŐL INDÍTÁSÁHOZ) -----
/**
* A horgony entitás ős-lánca: ELŐL az entitás maga, majd a szülője, ... a gyökérig.
* A Síkidom nézet a kártya-menüből így nyílik meg egy ágon: a horgony fölé fel kell
* fűzni az ősöket, hogy a környezet (szülők) is látsszon (a méretezéshez kell a
* szülők pontja).
*
* Ugyanabban a formában adja vissza az elemeket, mint a `gyerekekLekerese` — így a
* kliens ugyanazzal a `_ujCsomopont`-tal építi fel őket. A `legerosebbGyokerPont`
* külön jön: a LEGFELSŐ ős (a gyökér) méretét a VILÁG-hoz képest ebből számolja a
* kliens (`gyokerRelativSugar`), ugyanúgy, ahogy a rendes gyökér-szinten.
*
* @param {string} entitasId - a horgony entitás azonosítója
* @returns {Promise<Object>} { oslanc: [saját, szülő, ..., gyökér], legerosebbGyokerPont }
*/
async osLancLekerese(entitasId) {
  console.log('SikidomService.osLancLekerese - KEZDÉS', { entitasId });

  const sorok = await hierarchikusAllokaciRepository.findOsLancEntitasok(entitasId);
  if (sorok.length === 0) {
    console.log('SikidomService.osLancLekerese - VÉGE (nincs lánc)');
    return { oslanc: [], legerosebbGyokerPont: 0 };
  }

  // Kinek van SAJÁT gyereke? (a gerinc minden tagjának van — kivéve talán a
  // horgony —, de EGY lekérdezéssel az egész láncra, nincs N+1)
  const gyerekesIdk = await hierarchikusAllokaciRepository.melyikSzulonekVanGyereke(
    sorok.map(sor => sor.entitasId)
  );
  const gyerekesHalmaz = new Set(gyerekesIdk.map(id => id.toString()));

  // Cím + mellék-ikonok — UGYANAZ a közös forrás, mint a gyerekeknél
  const cimmel = await entitasCimekFeltoltese(sorok);
  const mellekIkonok = await strukturaService.mellekIkonokFeltoltese(sorok);

  const oslanc = cimmel.map(sor => {
    const mellek = mellekIkonok.get(`${sor.entitasTipus}:${sor.entitasId.toString()}`) ?? {};
    return {
      entitasId: sor.entitasId,
      entitasTipus: sor.entitasTipus,
      cim: sor.entitasCim ?? null,
      hierarchikusOsszesPont: sor.hierarchikusOsszesPont ?? 0,
      vanGyereke: gyerekesHalmaz.has(sor.entitasId.toString()),
      letrehozva: sor.letrehozva ?? null,
      kategoriaIkonok: mellek.kategoriaIkonok ?? [],
      tipusIkon:       mellek.tipusIkon ?? null,
      javaslatTipus:   mellek.javaslatTipus ?? null
    };
  });

  // A legerősebb GYÖKÉR pontja: a legfelső ős méretét a VILÁG-hoz ebből számolja a
  // kliens. A gyerek-lekérés null szülővel, egyetlen sorral megadja (pont szerint
  // csökkenő az első = a legerősebb gyökér).
  const legerosebbGyokerSor = await hierarchikusAllokaciRepository.findGyerekekKuszobFolott(
    null, 0, null, null, 1
  );
  const legerosebbGyokerPont = legerosebbGyokerSor[0]?.hierarchikusOsszesPont ?? 0;

  console.log('SikidomService.osLancLekerese - VÉGE', {
    lancHossz: oslanc.length, legerosebbGyokerPont
  });

  return { oslanc, legerosebbGyokerPont };
}

}

// --- EXPORTÁLÁS - SINGLETON példány ---
module.exports = new SikidomService();
