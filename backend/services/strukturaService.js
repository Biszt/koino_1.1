// backend/services/strukturaService.js

// ===== TÉRKÉP SERVICE =====
// Felelősség: a Struktúra nézet (teljes képernyős, interaktív fa-nézet) backend-adatai.
//   1. darabszamLekerese  — az entitások összdarabszáma (és ág-szűrésnél az ág
//      darabszáma) az ELŐZETES kijelzéshez ("N entitás — elkészíted?").
//   2. lapLekerese        — a fa LAPOZOTT lekérése (kurzoros, _id szerint); a fát a
//      frontend építi fel a lapos sorokból. A lapozás adja a letöltési
//      folyamatjelzőt és a megszakíthatóságot (a kliens egyszerűen nem kér többet).
//      ÁG-MÓDBAN (agEntitasId) CSAK a részfát lapozza (skálázható osLanc-szűrés),
//      így a kliens nem a teljes fát tölti le egyetlen ág megjelenítéséhez.
// Adatforrás: a hierarchikusTudatpontAllokacio kollekció — ebben MINDEN entitás
// (mind az 5 típus) benne van szülő-kapcsolattal és hierarchikus ponttal.
// Címek: az ertesitesService közös entitasCimekFeltoltese segédje (a 3 cím-viselő
// típusra; Javaslat/Egyezmény → null, a frontend típus-feliratot mutat).
// Használja: strukturaController.

// --- IMPORTÁLÁSOK ---
const hierarchikusAllokaciRepository = require('../repositories/hierarchikusTudatpontAllokaciRepository');
const { entitasCimekFeltoltese } = require('./ertesitesService');
// A mellék-ikonokhoz (Struktúra nézet közeli nézet): a Tartalom típusa/kategóriái, illetve
// a Javaslat/Egyezmény művelet-típusa a forrás-kollekciókból.
const Tartalom = require('../models/tartalom');
const Kategoria = require('../models/kategoria');
const TartalomTipus = require('../models/tartalomTipus');
const Javaslat = require('../models/javaslat');
const Egyezmeny = require('../models/egyezmeny');

// Egy lap maximális mérete — ennél többet egy kérésre nem adunk
const MAX_LAP_MERET = 2000;

// --- TÉRKÉP SERVICE OSZTÁLY ---
class StrukturaService {

// ----- DARABSZÁM LEKÉRÉSE -----
/**
* Az entitások összdarabszáma, ág-szűrésnél az ág darabszáma is.
* Az ág darabszámát EGYETLEN indexelt lekérdezés adja az osLanc-szűrésen
* (repository.countAg) — skálázható, több millió entitásnál is (nincs N-körös BFS).
* @param {string|null} agEntitasId - opcionális ág-gyökér entitás azonosítója
* @returns {Promise<Object>} { osszesDarab, agDarab } (agDarab csak ág-szűrésnél)
*/
async darabszamLekerese(agEntitasId = null) {
  console.log('StrukturaService.darabszamLekerese - KEZDÉS', { agEntitasId });

  const osszesDarab = await hierarchikusAllokaciRepository.countOsszes();

  // ÁG-DARABSZÁM (skálázható): a részfa méretét EGYETLEN indexelt lekérdezéssel
  // számoljuk az osLanc-szűrésen (countAg) — a régi szintenkénti BFS (N-körös,
  // több millió entitásnál nem tartható) helyett. A gyökér önmaga is beleszámít.
  const agDarab = agEntitasId
    ? await hierarchikusAllokaciRepository.countAg(agEntitasId)
    : null;

  console.log('StrukturaService.darabszamLekerese - VÉGE', { osszesDarab, agDarab });
  return { osszesDarab, agDarab };
}

// ----- LAP LEKÉRÉSE -----
/**
* A teljes fa egy lapja kurzoros lapozással, címekkel feltöltve.
* A sorok _id szerint növekvő sorrendben jönnek; a válasz kovetkezoKurzor
* mezője a lap utolsó sorának _id-ja (null, ha nincs több lap).
* @param {string|null} kurzorId - az előző lap utolsó sorának _id-ja (null = első lap)
* @param {number} lapMeret - kért lapméret (a MAX_LAP_MERET-re vágva)
* @param {string|null} agEntitasId - opcionális ág-gyökér: csak ennek a részfáját lapozza
* @returns {Promise<Object>} { sorok, kovetkezoKurzor }
*/
async lapLekerese(kurzorId = null, lapMeret = MAX_LAP_MERET, agEntitasId = null) {
  console.log('StrukturaService.lapLekerese - KEZDÉS', { kurzorId, lapMeret, agEntitasId });

  const limit = Math.min(Math.max(1, lapMeret), MAX_LAP_MERET);
  const nyersSorok = await hierarchikusAllokaciRepository.findStrukturaLap(kurzorId, limit, agEntitasId);

  // Címek feltöltése típusonként EGY csoportos lekérdezéssel (közös segéd).
  // A segéd entitasCim mezőt tesz minden sorra (Javaslat/Egyezmény → null).
  const cimmelFeltoltott = await entitasCimekFeltoltese(nyersSorok);

  // Mellék-ikonok (a Struktúra nézet közeli nézetéhez): kulcs `${tipus}:${id}` → adatok
  const mellekIkonMap = await this.mellekIkonokFeltoltese(nyersSorok);

  // Szűk válasz-sorok: csak amire a fa-rajzolásnak szüksége van
  const sorok = cimmelFeltoltott.map(sor => {
    const mellek = mellekIkonMap.get(`${sor.entitasTipus}:${sor.entitasId}`) ?? {};
    return {
      lapKurzor:              sor._id,
      entitasId:              sor.entitasId,
      entitasTipus:           sor.entitasTipus,
      szuloId:                sor.szuloId ?? null,
      hierarchikusOsszesPont: sor.hierarchikusOsszesPont ?? 0,
      letrehozva:             sor.letrehozva ?? null,
      cim:                    sor.entitasCim ?? null,
      // Mellék-ikonok: Tartalomnál a kategóriák (bal) + tartalomtípus (jobb),
      // Javaslat/Egyezménynél a művelet-típus (jobb). Máshol üres/null.
      kategoriaIkonok:        mellek.kategoriaIkonok ?? [],
      tipusIkon:              mellek.tipusIkon ?? null,
      javaslatTipus:          mellek.javaslatTipus ?? null
    };
  });

  // Kurzor a következő laphoz: a lap utolsó sorának _id-ja.
  // Ha a lap NEM telt meg, biztosan nincs több sor → null.
  const kovetkezoKurzor = sorok.length === limit
    ? sorok[sorok.length - 1].lapKurzor
    : null;

  console.log('StrukturaService.lapLekerese - VÉGE', {
    sorokSzama: sorok.length,
    vanKovetkezoLap: !!kovetkezoKurzor
  });

  return { sorok, kovetkezoKurzor };
}

// ----- MELLÉK-IKONOK FELTÖLTÉSE -----
/**
* A Struktúra nézet közeli nézetének mellék-ikonjaihoz gyűjti össze — típusonként EGY-EGY
* csoportos lekérdezéssel, N+1 nélkül — az entitások extra adatait:
*   - Tartalom → a tartalomtípusa ({nev, ikon}) és a kategóriái ([{nev, ikon}]);
*   - Javaslat / Egyezmény → a művelet-típusa (javaslatTipus enum);
*   - Kategória / Tartalomtípus → semmi (nincs mellék-ikonjuk).
* Az `ikon` mező emoji VAGY feltöltött kép-URL is lehet — a frontend dönti el.
* @param {Array} sorok - a hierarchikus sorok ({ entitasId, entitasTipus, ... })
* @returns {Promise<Map>} kulcs `${entitasTipus}:${entitasId}` → { tipusIkon, kategoriaIkonok, javaslatTipus }
*/
async mellekIkonokFeltoltese(sorok) {
  console.log('StrukturaService.mellekIkonokFeltoltese - KEZDÉS', { sorokSzama: sorok.length });

  // Entitás-azonosítók típusonként
  const tartalomIdk  = [];
  const javaslatIdk  = [];
  const egyezmenyIdk = [];
  for (const sor of sorok) {
    if (sor.entitasTipus === 'Tartalom')       tartalomIdk.push(sor.entitasId);
    else if (sor.entitasTipus === 'Javaslat')  javaslatIdk.push(sor.entitasId);
    else if (sor.entitasTipus === 'Egyezmeny') egyezmenyIdk.push(sor.entitasId);
  }

  // A Tartalmak típus- és kategória-hivatkozásai (a további lekérdezésekhez)
  const tartalmak = tartalomIdk.length
    ? await Tartalom.find({ _id: { $in: tartalomIdk } }).select('tartalomTipusId kategoriaIds').lean()
    : [];

  const tipusIdk     = new Set();
  const kategoriaIdk = new Set();
  for (const t of tartalmak) {
    if (t.tartalomTipusId) tipusIdk.add(t.tartalomTipusId.toString());
    for (const k of (t.kategoriaIds ?? [])) kategoriaIdk.add(k.toString());
  }

  // Minden hivatkozott adat EGY-EGY csoportos lekérdezéssel, párhuzamosan
  const [tipusok, kategoriak, javaslatok, egyezmenyek] = await Promise.all([
    tipusIdk.size     ? TartalomTipus.find({ _id: { $in: [...tipusIdk] } }).select('nev ikon').lean() : [],
    kategoriaIdk.size ? Kategoria.find({ _id: { $in: [...kategoriaIdk] } }).select('nev ikon').lean() : [],
    javaslatIdk.length  ? Javaslat.find({ _id: { $in: javaslatIdk } }).select('javaslatTipus').lean() : [],
    egyezmenyIdk.length ? Egyezmeny.find({ _id: { $in: egyezmenyIdk } }).select('javaslatTipus').lean() : []
  ]);

  // Gyors kikeresők
  const tipusMap     = new Map(tipusok.map(x => [x._id.toString(), { nev: x.nev ?? '', ikon: x.ikon ?? null }]));
  const kategoriaMap = new Map(kategoriak.map(x => [x._id.toString(), { nev: x.nev ?? '', ikon: x.ikon ?? null }]));
  const tartalomMap  = new Map(tartalmak.map(t => [t._id.toString(), t]));
  const javaslatMap  = new Map(javaslatok.map(j => [j._id.toString(), j.javaslatTipus ?? null]));
  const egyezmenyMap = new Map(egyezmenyek.map(e => [e._id.toString(), e.javaslatTipus ?? null]));

  // Eredmény-térkép összeállítása
  const eredmeny = new Map();
  for (const sor of sorok) {
    const id = sor.entitasId.toString();

    if (sor.entitasTipus === 'Tartalom') {
      const t = tartalomMap.get(id);
      const tipusIkon = t?.tartalomTipusId ? (tipusMap.get(t.tartalomTipusId.toString()) ?? null) : null;
      const kategoriaIkonok = (t?.kategoriaIds ?? [])
        .map(k => kategoriaMap.get(k.toString()))
        .filter(Boolean);
      eredmeny.set(`Tartalom:${id}`, { tipusIkon, kategoriaIkonok, javaslatTipus: null });

    } else if (sor.entitasTipus === 'Javaslat') {
      eredmeny.set(`Javaslat:${id}`, { tipusIkon: null, kategoriaIkonok: [], javaslatTipus: javaslatMap.get(id) ?? null });

    } else if (sor.entitasTipus === 'Egyezmeny') {
      eredmeny.set(`Egyezmeny:${id}`, { tipusIkon: null, kategoriaIkonok: [], javaslatTipus: egyezmenyMap.get(id) ?? null });
    }
    // Kategória / Tartalomtípus: nincs mellék-ikon
  }

  console.log('StrukturaService.mellekIkonokFeltoltese - VÉGE', {
    tartalom: tartalomIdk.length, javaslat: javaslatIdk.length, egyezmeny: egyezmenyIdk.length
  });
  return eredmeny;
}

}

// --- EXPORTÁLÁS - SINGLETON példány ---
module.exports = new StrukturaService();
