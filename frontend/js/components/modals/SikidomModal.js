// frontend/js/components/modals/SikidomModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import { gyerekRelativSugar, gyokerRelativSugar,
         gyerekPontKuszob, gyokerPontKuszob, SZINT_OSZTO }
  from '../../utils/sikidomMeret.js';
import { pakolas, pakolasiSorrend, frissebbElol } from '../../utils/sikidomPakolas.js';
import { szuloKeretben, horgonyValtasNezet, kepernyore, horgonyValtasSzukseges,
         keretbenCsomopont }
  from '../../utils/sikidomHorgony.js';
import { SikidomRajzolo, TOVABBI_FELIRAT_MIN_SUGAR } from '../../utils/sikidomRajzolo.js';
import { visszaszedes, osSopres, kiparkolas, visszahozatal, takaritas,
         reszfaTorlese, meretekUjramerese }
  from '../../utils/sikidomTar.js';
import { gorgoSzorzo, kifeleHatarolas, befeleHatarolas, gesztusAllapot, ZOOM_LEPES }
  from '../../utils/sikidomNagyitas.js';
import SikidomKartyaPanel from './SikidomKartyaPanel.js';

// ===== HANGOLÓ ÁLLANDÓK =====

// A virtuális legfelső csomópont azonosítója. Nem entitás és sosem rajzoljuk ki —
// csak keretet ad a gyökér-entitásoknak, hogy a fa egységes legyen.
const VILAG = 'vilag';

// Biztonsági darab-plafon EGY kérésre. NEM ez szabályozza a betöltést — azt a
// tudatpont-küszöb teszi (lásd _pontKuszob) —, csak azért van, hogy egy nagyon
// alacsony küszöb se hozzon le egyszerre túl sokat.
const KERES_PLAFON = 150;

// ===== LÁTHATÓSÁGI KÜSZÖB: MINIMUM KÉPERNYŐ-ÁTMÉRŐ =====
// Egy síkidom CSAK akkor jelenik meg, ha a képernyőn mért ÁTMÉRŐJE eléri ezt a
// képpont-értéket. Ez a nézet alaptörvénye (terv 14. pont): a láthatóságot a
// minimum-átmérő dönti el, NEM egy fix darabszám — a látható síkidomok száma a
// képernyő befogadóképességéből KÖVETKEZIK.
//
// Miért így: egy néhány képpontos folt nem hordoz információt (nincs rajta
// felirat, nem lehet rákoppintani), viszont zsúfolttá teszi a képet és
// fölöslegesen terheli a rajzolást. Ami ez alatt van, azért kell BENAGYÍTANI —
// és mivel a gyerek mindig kisebb a szülőjénél ÉS a szülőn belül van, a küszöb
// alá esett síkidom teljes részfája is levágható.
//
// ⚠️ 2026-08-09 ÓTA EZ MÁR NEM A LÁTHATÓSÁG KAPUJA. A megjelenést az ÜRES MAG
// dönti el (`MAG_ATMERO_ARANY`), mert a méret-küszöb versenyfutást okozott a
// nagyítással. Ez a szám mostantól KIZÁRÓLAG a LETÖLTÉST vezérli: `_pontKuszob`
// ebből számolja, mekkora tudatpont fölött érdemes egy testvért lehozni egy
// nem-fókusz csomópontnál. (A fókusz küszöb nélkül tölt — lásd ELORETOLTES_DARAB.)
const MIN_KEP_ATMERO = 24;

// Egyszerre ennyi lekérés futhat
const EGYIDEJU_BETOLTES = 3;

// Biztonsági plafon egy képkockára. 2026-08-09-én 4000-ről emelve: a méret-küszöb
// megszűntével az illesztett nézetben a 11 143 síkidomból ~10 200 rajzolandó (a
// többit a mag rejti). A plafon így valóban csak vészfék, nem napi korlát.
const MAX_RAJZOLT = 30000;

// Ennyi szinttel a horgony FÖLÖTT kezdjük a bejárást (hogy a környezet is látsszon)
const FELFELE_SZINTEK = 3;

// ===== KIKAPCSOLVA: A KÉPERNYŐN KÍVÜLIEK ELTÜNTETÉSE =====
// Csaba döntése (2026-08-06): „ne tüntessen el semmit azért, mert kilóg a
// képernyőből."
//
// `false` esetén a látómező SEHOL nem zár ki semmit:
//   - a rajzolás nem hagy ki csomópontot (és nem vágja le a részfáját);
//   - a takarítás nem enged el ágakat a memóriából.
// (Az újrapakolás amúgy sem fagyaszt be semmit pozíció alapján: ott a méret
// szerinti SOR és a képernyő KAPACITÁSA dönt — lásd `_kepernyoKapacitas`.)
//
// A munkát így az ÜRES MAG (`MAG_ATMERO_ARANY`) és a `MAX_RAJZOLT` vészfék
// korlátozza — nem a képernyő-pozíció.
//
// `true`-ra állítva visszajön a korábbi viselkedés (a képernyő +
// LATOMEZO_TARTALEK arányú keretén kívüliek kimaradnak).
const KEPERNYON_KIVULIEK_ELTUNTETESE = false;

// Az ágak elengedésének kapcsolója (`AGAK_ELENGEDESE`) a fenti kapcsoló PÁRJA, de
// két külön dologról szólnak: az egyik a rajzolást szűri, a másik a memóriát
// takarítja. A tár-kezeléssel együtt a `sikidomTar.js`-be költözött (2026-08-11).

// Reális pakolási sűrűség: a kör-pakolás a rendelkezésre álló területnek ekkora
// hányadát tölti ki. (Azonos körök elméleti maximuma 0,9069; vegyes méreteknél a
// MÉRT érték nálunk 0,41–0,53 — lásd a tervben a 105 gyökéren végzett mérést.
// A 0,7 óvatosan a kettő közé esik: nem enged túl sokat, de nem is fog vissza.)
const PAKOLASI_SURUSEG = 0.7;

// A képernyőn kívül ekkora tartalékot hagyunk (a képernyő méretének arányában).
// Csak akkor számít, ha a fenti kapcsoló `true`.
const LATOMEZO_TARTALEK = 0.5;

// ===== A LETÖLTÉS VÉGE IS A KAPACITÁS =====
// A képernyő kapacitása eddig CSAK a lerakást korlátozta, a letöltést nem: azt
// egyedül a tudatpont-küszöb vezérelte. Mély nagyításnál viszont a küszöb annyira
// lesüllyed, hogy — a saját mérésünk szerint — akár 739 909 testvér kerül fölé, és
// a nézet mindet letöltötte, 150-esével (kb. 4900 kérés), majd mind ott ült a
// várólistán. A jelölt-gyűjtés és a rendezés onnantól több százezer elemen futott
// képernyőnyi eredményért.
//
// A JAVÍTÁS: ugyanaz a két vágás vezérli a letöltést is, mint a megjelenítést.
// Amíg a várólistán már legalább ennyiszer annyi FRISS anyag vár, mint amennyi a
// képernyőre fér, addig nem kérünk többet — a soron következőket a kurzor őrzi,
// onnan bármikor folytatható.
//
// Miért 2-szeres: egy zoom-lépés (×1,2) a látszó területet ~1,44-szeresére növeli,
// tehát a kétszeres puffer egy teljes lépést kiszolgál letöltés nélkül.
// HASZNÁLATON KÍVÜL 2026-08-09 óta: a letöltés fékje az ELORETOLTES_DARAB
// (darabszám) lett, mert a területalapú fék részleges pakolást engedett volna.
// A konstans megmarad, mert a KÉPERNYŐNKÉNTI visszaszedéshez újra kelleni fog.
const BETOLTESI_TARTALEK = 2;

// ===== MÉLYEBBRE TÖLTÜNK, MINT AMIT RAJZOLUNK =====
// A letöltési küszöb eddig PONTOSAN a láthatósági küszöb volt: mindig csak azt
// hoztuk le, ami épp láthatóvá vált. A farok így közvetlenül a küszöb alatt várt,
// és csak további nagyításra jött — közben a fenntartott mag a képernyőn nőtt.
// Csaba tünete (2026-08-09): „rakja le őket, de nem olyan tempóban, hogy kitöltse
// a folyton növő üres magot."
//
// Mostantól a letöltési küszöböt a láthatósági küszöb ENNYIED részéből számoljuk.
// Mivel a küszöb a méret NÉGYZETÉVEL arányos, a 4-es osztó 16-szor több testvért
// enged be — a farok jóval a láthatóvá válás ELŐTT megérkezik és helyet kap,
// tehát a `T_hátra` (és vele a mag) magától lefogy.
//
// MIÉRT NEM VESZÜNK EL EGYSZERŰEN A MAGBÓL: mérve (2026-08-09) a tartalék
// elvétele hat beállításból ötben MEGFORDÍTOTTA a rendet (a méret-tizedek
// 0,4064 → 0,1446 lettek). A magot nem elvenni kell, hanem FELESLEGESSÉ tenni.
//
// A letöltés így sem szalad el: a gyűjtés határa az `ELORETOLTES_DARAB`
// (2026-08-09 óta; korábban a `BETOLTESI_TARTALEK` területalapú féke).
//
// HANGOLÁS: nagyobb érték = mélyebb előretöltés (több hálózat, kisebb mag),
// 1 = a korábbi viselkedés.
const BETOLTESI_MELYSEG = 4;

// ===== A RAJZOLÁS ÁLLANDÓI: MÁSHOL VANNAK =====
// A címke, a mellék-ikonok, az elhalványodás és az apró síkidomok olcsó útja a
// `sikidomRajzolo.js`-be költözött az őket használó kóddal együtt (2026-08-11).
// Ebben a fájlban csak az maradt, ami a nézet MŰKÖDÉSÉT szabályozza — a
// megjelenés hangolása ott van.

// ===== AZ ÜRES MAG: A LÁTHATÓSÁG KAPUJA (Csaba, 2026-08-09) =====
// A mag ÁTMÉRŐJE a képernyő KISEBBIK oldalának ekkora hányada. Szándékosan
// arányban, nem fix képpontban: Csaba kérése szerint „mindenféle méretű monitoron
// jó legyen" — 800 képpont magas ablakon ez 96 px átmérő (48 px sugár), telefonon
// arányosan kisebb.
//
// EZ A NÉZET FŐ HANGOLÓ SZÁMA. Nagyobb érték = nagyobb üres közép, kevesebb, de
// nagyobb síkidom; kisebb érték = tömörebb, zsúfoltabb kép.
const MAG_ATMERO_ARANY = 0.12;

// Az ÜRES MAG szaggatott jelölése: ekkora látszó ÁTMÉRŐ alatt nem rajzoljuk ki
// (nem látszana, csak zajt csinálna)
const MAG_MIN_ATMERO = 10;

// A „további tartalmak" ajánlat küszöbét (`TOVABBI_FELIRAT_MIN_SUGAR`) a
// `sikidomRajzolo.js` tartja: ott dől el, kirajzoljuk-e a feliratot, és a
// koppintás-találat (`_ajanlatKoppintas`) ugyanabból a számból dolgozik.

// ===== RÉSZLETESSÉGI FOKOZAT: A POZICIONÁLÁSI KERET (Csaba, 2026-08-11) =====
// „Az egyszerre pozicionált síkidomokat is 1/20-ára kell venni az eggyel lejjebbi
// hierarchia szinten." Vagyis a keret ugyanazzal a hányaddal fogy lefelé, amivel a
// terület: a horgony 5 000 gyereket rak le, egy szinttel lejjebb 250, két szinttel
// lejjebb 12, azon túl semmit.
//
// SZÁNDÉKOSAN LEVEZETETT, nem beírt szám: ha az adag (`ELORETOLTES_DARAB`) változik,
// a lépcső magától követi. 5000 → 250 → 12 → 0.
//
// MELYIK 250-ET (Csaba döntése): a LEGNAGYOBBAKAT, mert azok számítanak — nem a
// kanonikus sorrend elejét. Ennek ára, hogy szintváltáskor, amikor a keret 5 000-re
// bővül, ezek ELMOZDULNAK: hiányzott alóluk az összes kisebb testvér. Ez tervezett.
// Csaba szava: „nem tudjuk megúszni az újrapakolást, csak ritkítani" — végtelen
// testvérrel másképp nem is lehet.
function pozicionalasiKeret(melyseg) {
  if (!(melyseg >= 0)) return ELORETOLTES_DARAB;          // a horgony fölött nincs szűkítés
  return Math.floor(ELORETOLTES_DARAB / Math.pow(SZINT_OSZTO, melyseg));
}

// ===== A MEGTARTÁSI FOLYOSÓ (Csaba, 2026-08-11 — a koino_1.0 nyomán) =====
// Csaba mérése: a 49. szinten állva a tár 5 094 csomópont volt, és ebből 5 040 a
// GYÖKÉR — a tár 99%-a olyan síkidom, ami 49 szinttel a látómezőn kívül van. A
// VILÁG-nál a visszaszedés 60 elemnél megállt, mert a `_visszaszedes` csak a
// horgony SZÜLŐJÉNÉL dolgozik: amint a horgony lelépett a 0. szintről, a VILÁG
// már nem volt „a horgony szülője", és ott soha többé nem takarított senki.
//
// A KOINO_1.0 MEGOLDÁSA (`calculators.populateProcessedContents`, hierarchikus ág):
// a munkakészletet szintváltáskor egy FOLYOSÓRA szűkíti — nagyszülő (testvérek
// nélkül), a nagyszülő gyerekei, az aktív csomópont testvérei és azok gyerekei,
// plusz az aktív ág 3 szint mélyen. Minden más kimarad.
//
// ⚠️ KÉT TENGELY, KÉT KÜLÖN SZABÁLY. Csaba szava: „az 1.1-nek se méret szerint kell
// hogy végezze a hierarchikus visszaszedést, hanem mélység szerint, adott entitást
// figyelembe véve." Pontosan így:
//   - MÉLYSÉG (ez az állandó) — mely SZINTEK maradnak egyáltalán. A folyosón kívül
//     minden megy, mérettől függetlenül.
//   - MÉRET (`VISSZASZEDES_ATMERO_ARANY`) — egy szinten BELÜL hány testvér marad.
//     Ezt nem váltja ki a mélység: egy szülő alatt 5 000 (távlatilag több millió)
//     testvér lehet, azok mind ugyanolyan mélyen vannak. A koino_1.0-ban ez nem volt
//     kérdés, mert ott a folyosón belül MINDEN testvér megmaradt.
//
// MIÉRT 6 ÉS NEM 2 (Csaba választása): a koino_1.0 folyosója a nagyszülőig ér, ami
// a legnagyobb memória-nyereséget adja, de minden egyes kifelé lépésnél
// visszaállítást kíván. Hat szinttel a szokásos ki-be nagyítgatás a folyosón belül
// marad, a nyereség viszont gyakorlatilag ugyanaz (5 040 → néhány száz).
//
// MAGA A FOLYOSÓ-SZÁM (`FOLYOSO_SZINT`) és a hozzá tartozó ős-söprés a
// `sikidomTar.js`-ben van — ez a fájl csak megrendeli a munkát.

// Ennyi képkockánként takarítunk (a látómezőn kívülre került ágak elengedése)
const TAKARITAS_KEPKOCKANKENT = 180;

// ===== A PAKOLÁSI MAG: JELZÉS, NEM FOGLALÁS (Csaba, 2026-08-10) =====
// ⚠️ KÉT KÜLÖN FOGALOM — SOHA NE KEVERD ŐKET:
//
//   1. KIJELZŐ-MAG (`MAG_ATMERO_ARANY`, fentebb) — a KÉPERNYŐHÖZ fixált, állandó
//      képpont-méretű kör. CSAK azt szabályozza, mi rajzolódik ki; a pakoló mit sem
//      tud róla. Nagyításkor adat-térben zsugorodik — ezért bukkannak elő belőle
//      sorra a síkidomok, ahogy közelítesz.
//
//   2. PAKOLÁSI MAG (ez itt) — VALÓDI lyuk az adat-térben: a pakoló üresen hagyja a
//      közepet. NEM zsugorodik nagyításkor, tehát bármilyen mélységben üres marad.
//      Ez ad tiszta helyet a „további tartalmak" feliratnak, és önmagában is jelzi,
//      hogy van még le nem töltött testvér.
//
// MIÉRT NEM A HÁTRALÉVŐ TUDATPONTBÓL MÉRETEZZÜK (Csaba, 2026-08-10):
// a 2026-08-08-i modell a mag sugarát a még hely nélküli testvérekből számolta
// (`_magSugar`: c = √(T_hátra / (20 · P_szülő · σ))). Az FOGLALÁS volt: helyet
// tartott fenn, hogy a később érkezők ne szorítsák kifelé a már lerakottakat.
// Két okból esik el:
//   - VÉGTELEN testvérnél `T_hátra` sem korlátos, tehát a mag sem — vagyis épp
//     abban az esetben mond csődöt, amiért az egészet csináljuk;
//   - a foglalás egyetlen célja a már lerakottak védelme volt. Mivel a következő
//     adag betöltésekor MINDENT újrapakolunk, nincs mit megvédeni.
//
// AMIT EZ A SZÁM VALÓJÁBAN ELDÖNT: milyen mélyre kell nagyítani, mielőtt a nézet
// felajánlja a következő adagot. A felirat akkor jelenik meg, amikor a KIJELZŐ-MAG
// belezsugorodott ebbe a lyukba (vagyis már egyetlen síkidomot sem takar el).
// NAGYOBB lyuk = hamarabb ajánl, kevesebb nagyítás után; KISEBB = mélyebbre kell menni érte.
//
// A MÉRTÉKEGYSÉG a LEGKISEBB lerakandó testvér sugara — így a lyuk azzal együtt
// skálázódik, amit épp nézel, és nem függ attól, hány szinttel vagyunk lejjebb.
// HANGOLÁS: ez az ELSŐ beállítás; a böngészős teszten dől el, nagyobb kell-e.
const PAKOLASI_MAG_ARANY = 6;

// ===== HÁNY TESTVÉR POZÍCIÓJÁT SZÁMOLJUK KI ELŐRE (Csaba, 2026-08-09) =====
// „csak a pozíciók kiszámítása legyen meg előre, mondjuk 10000, de a megjelenítés
// ugyanúgy használja a min területet, és a maximum területet."
//
// A pozíció-számítás tehát MÉLYEBBRE megy, mint a rajzolás: egy szülő alatt ennyi
// testvér helyét számoljuk ki, függetlenül attól, hogy közülük hány látszik.
//
// MIÉRT PONT ENNYI (mérve, 2026-08-09):
//   - a pakolás nem korlát: 10 000 síkidom ~70 ms, 128 000 ~850 ms (~145 000/s);
//   - a LETÖLTÉS a szűk keresztmetszet: ~12 600 testvér/s meleg dev adatbázison,
//     hálózat nélkül — interneten reálisan ~6 500/s. 10 000 tehát nagyjából
//     másfél-két másodperc hálózat, ami belefér a 3 másodperces megnyitási keretbe.
//
// 2026-08-11-en 10 000 → 5 000 (Csaba): egy adag így nagyjából FÉL MÁSODPERC
// hálózat internetes sebességgel, tehát a megnyitás és minden egyes lapozás is
// észrevehetően gyorsabb. A szám kettős szerepű — ez az ELSŐ adag mérete ÉS a
// „további tartalmak" koppintásával kért következő adagé is (`betoltesiPlafon`
// növekménye) —, tehát a lapozás lépésköze is feleződik: több, de fürgébb lépés.
// A `MEGTARTOTT_DARAB` (12 000) érintetlen marad: az vészfék, nem lépésköz, és
// most még nagyobb a ráhagyása az adag fölött.
const ELORETOLTES_DARAB = 5_000;

// ===== MÉRET SZERINTI VISSZASZEDÉS: A `sikidomTar.js`-BEN =====
// A két szabály (`VISSZASZEDES_ATMERO_ARANY`, `MEGTARTOTT_DARAB`) és a hozzájuk
// tartozó, mérésekkel szerzett magyarázat a tár-modulban van — ott is használják.
// Ez a fájl csak megrendeli a visszaszedést a nagyítás végén.

// A nagyítás „végét" ennyi eseménymentes ezredmásodperc jelenti. Nagyítás KÖZBEN
// szándékosan nem pakolunk: a kép így nem ugrál a görgetés alatt, és nem is
// számolunk fölöslegesen minden képkockán.
const ZOOM_VEGE_MS = 140;

// MEGJEGYZÉS: itt állt az `UJRAPAKOLASI_TARTALEK` — az újrapakolás hatóköre,
// amikor még a látómezőbe benyúló köröket pakoltuk újra, a kívül esőket pedig
// „befagyasztottuk". 2026-08-08 óta MINDEN lerakott síkidom helye végleges, tehát
// nincs se hatókör, se fagyasztási varrat: az `_ujrapakolas` csak az újakat rakja
// le, a régiek akadályként vesznek részt. A konstansra nincs többé szükség.

// ===== A NAGYÍTÁS SZÁMTANA: A `sikidomNagyitas.js`-BEN =====
// A +/− gombok lépése (`ZOOM_LEPES`), a görgő érzékenysége (`GORGO_EGYSEG_*`), a
// két nagyítási határ (`KIFELE_HATAR`, `BEFELE_HATAR`) és a levezetésük a
// nagyítás-modulba került (2026-08-11) — ott tiszta számítás, tehát Node-ból is
// mérhető. Ez a fájl csak alkalmazza a kapott szorzót a nézetre.

// ===== AZ ILLESZTÉS ARÁNYA =====
// A teljes kiterjedés a képernyő kisebbik oldalának ennyiszeresére illeszkedjen —
// SUGÁRBAN értve, tehát az ÁTMÉRŐ ennek a kétszerese. 0,45 → a spirál a rövidebb
// oldal 90%-át tölti ki, marad egy kis perem.
//
// Eddig két helyen volt beégetve ugyanez a szám (`_kezdoNezetBecslese`,
// `_alaphelyzet`); mostantól a kezdő fázis lezárása is ehhez méri, elférünk-e.
const ILLESZTESI_ARANY = 0.45;

// ===== AZ ILLESZTÉS ANIMÁCIÓJA =====
// A koino_1.0 `fitZoom`-ja 750 ms-os átmenettel állt rá az új nézetre; a miénk
// eddig UGROTT. Animálva látszik, honnan hová kerültünk — ez a térbeli
// tájékozódás miatt számít. (750 ms hosszúnak bizonyult egy gombnyomáshoz.)
const ILLESZTES_MS = 420;

// A kezdő fázis (zárolt nézet) leghosszabb ideje. Ennyi után mindenképpen
// feloldjuk, akkor is, ha a letöltés elakadt — a nézet nem fagyhat be.
// Mérve: 10 405 gyökér letöltése + pakolása bőven ezen belül van.
const KEZDO_FAZIS_HATARIDO_MS = 20000;

// A koppintás és a húzás határa képpontban (a koino_1.0-ban 7 — a miénk 5 volt,
// és érintőképernyőn a szándékos koppintás is gyakran „húzásnak" számított)
const KATTINTAS_KUSZOB = 7;

// ===== SÍKIDOM NÉZET MODAL =====
// Felelősség: a Síkidom nézet — minden entitás egy síkidom, a TERÜLETE arányos a
// hierarchikus össztudatpontjával, a leszármazottak a szülőn BELÜL helyezkednek el.
//
// A három SZÁMÍTÓ tartóoszlop (mind külön, DOM-független modulban):
//   - sikidomMeret.js    → tudatpont → sugár (terület-arányosan, szintenként /20)
//   - sikidomPakolas.js  → háromszögeléses kör-pakolás üres maggal
//   - sikidomHorgony.js  → korlátlan nagyítás horgonyváltással (nincs pislogás)
//
// A MEGJELENÍTÉS pedig a negyedik modulban:
//   - sikidomRajzolo.js  → formák, feliratok, mellék-ikonok, üres mag a vásznon
//
// EZ A FÁJL AZT KÖTI ÖSSZE, AMI KÖZTÜK VAN: a betöltést, a csomópont-tárat, a
// nézet állapotát és a vezérlést. Ami tiszta számítás vagy tiszta rajzolás, az
// nem itt a helye.
//
// A BETÖLTÉS KÉPERNYŐ-VEZÉRELT, nem a fa bejárása vezérli: egy síkidom gyerekeit
// akkor kérjük le, amikor a KÉPERNYŐN elég nagyra nőtt. Ami a látómezőn (+50%)
// kívülre kerül, azt elengedjük. Így soha nem töltünk le többet, mint ami látszik.
//
// A LETÖLTÉS ÉS A LERAKÁS KÜLÖN LÉPÉS (2026-08-05 óta):
//   - a letöltött, de még le nem rakott testvérek a csomópont `varolista`-ján
//     várakoznak (csökkenő tudatpont szerint);
//   - az elrendezésről a NAGYÍTÁS VÉGÉN futó `_ujrapakolas` dönt.
//
// AZ ELRENDEZÉS KÉT SZABÁLYA (Csaba modellje, 2026-08-08):
//   1. EGY LERAKOTT SÍKIDOM SOHA NEM MOZDUL. A már lerakottak akadályként
//      (`kornyezet`) vesznek részt, nem pakolandóként — csak az újakat rakjuk le.
//   2. A KÖZÉPEN FENNTARTOTT MAG a HÁTRALÉVŐ TUDATPONTBÓL számolódik
//      (`_magSugar`), nem a képernyőből. Ez tartja fenn a helyet a később
//      érkezőknek — enélkül kifelé szorulnának, és felborulna a rend.
// Ebből következik a nézet képe: a legkisebbek a mag körül, a nagyobbak kifelé.
//
// Miért fér el mindig minden: a gyerekek együttes területe legfeljebb a szülő
// területének 1/20-a (a hierarchikus össztudatpont miatt), tehát hússzoros a
// tartalék — egy tömör újrapakolás sosem ütközhet a szülő peremébe.
//
// A hatókör azért szűkül a látómezőre, hogy a munka KORLÁTOS legyen: mérve
// egyszerre legfeljebb ~600 testvér látszik, akár 600, akár 12 000 van összesen.
// Ami nem fér be, az a várólistán MARAD — a modell soha nem zsugorít, tehát
// entitás nem tud némán elveszni (a régi, mag-becslős modellben ez volt a hiba).
//
// Rajzolás: egyetlen Canvas. Elemenkénti DOM-mal több ezer síkidomnál akadozna a
// folyamatos nagyítás; a koppintás-találatot ezért számítással keressük.
// Használja: a fő menü „Síkidom nézet" pontja (foOldal.js).
class SikidomModal {

  // @param {string} kontenerAzonosito - a modal konténer div ID-ja
  // @param {Object} beallitasok
  // @param {string} beallitasok.token                  - JWT token (opcionális)
  // @param {string} beallitasok.aktualisEntitasId      - a kiemelt entitás (opcionális)
  // @param {string} beallitasok.cim                    - a modal címe
  // @param {Function} beallitasok.onEntitasKivalasztas - (entitasId, entitasTipus)
  constructor(kontenerAzonosito, beallitasok = {}) {
    console.log('SikidomModal.constructor - KEZDÉS', {
      aktualisEntitasId: beallitasok.aktualisEntitasId
    });

    this.kontenerAzonosito    = kontenerAzonosito;
    this.token                = beallitasok.token ?? tokenLekerese();
    this.cimFelirat           = beallitasok.cim ?? 'Síkidom nézet';
    this.aktualisEntitasId    = beallitasok.aktualisEntitasId
      ? beallitasok.aktualisEntitasId.toString()
      : null;
    this.onEntitasKivalasztas = beallitasok.onEntitasKivalasztas ?? null;

    this.modal = null;
    this.vaszon = null;

    // A vászon 2D kontextusa. Csak a modal DOM-jának felépítése után áll elő
    // (lásd `init`), ezért itt még üres.
    this.kontextus = null;

    // ===== A RAJZOLÁS KÜLÖN MODULBAN (2026-08-11) =====
    // Ez a modal azt számolja ki, MI hol látszik; hogy a képernyőre hogyan kerül
    // rá, az a `sikidomRajzolo.js` dolga. A rajzoló nem ismeri a csomópont-tárat:
    // csomópontot és képernyő-helyet kap, és rajzol.
    this.rajzolo = new SikidomRajzolo({
      // A mellék-ikonok képei a hálózatról jönnek; amikor egy megérkezik, a
      // rajzoló új képkockát kér — a rajzolás sosem vár rá.
      ujrarajzolasKerese: () => this._rajzolasKerese()
    });

    // ===== A KOPPINTOTT ENTITÁS ADATLAPJA (külön modul) =====
    // A panel a saját DOM-jával és a kártya-gyárral dolgozik; a nézetre csak
    // ezen a két visszahíváson át hat.
    this._kartyaPanel = new SikidomKartyaPanel({
      token: this.token,
      // A panel bezárult → a kiválasztás is szűnjön meg, és rajzoljunk újra
      onBezaras: () => {
        this._kivalasztottId = null;
        this._rajzolasKerese();
      },
      // „Pakli nézet": a síkidom nézetet bezárjuk, a pakli az adott entitásra
      // navigál (ezt a foOldal adja át `onEntitasKivalasztas`-ként)
      onPakliraValtas: (entitasId, entitasTipus) => {
        this.bezaras();
        if (typeof this.onEntitasKivalasztas === 'function') {
          this.onEntitasKivalasztas(entitasId.toString(), entitasTipus);
        }
      }
    });

    // ----- ADAT -----
    // Csomópont-tár: id → csomópont. Minden csomópont a SZÜLŐJÉHEZ képest tárolja
    // a helyét és a méretét (relX, relY, relR) — ez teszi lehetővé a korlátlan
    // nagyítást (lásd sikidomHorgony.js).
    this._tar = new Map();
    this._horgony = VILAG;

    // Világ → képernyő
    this._nezet = { skala: 1, eltolasX: 0, eltolasY: 0 };

    // Hozzányúlt-e már az e-ember a nézethez? (Ma csak naplózásra/diagnosztikára;
    // az automatikus illesztést a KEZDŐ FÁZIS zárolása védi, lásd lentebb.)
    this._eemberMozgatott = false;

    // ===== KEZDŐ FÁZIS: A NÉZET ZÁROLVA (Csaba, 2026-08-09) =====
    // „Ameddig nem történt meg a teljes lepakolás és az újraillesztés, addig ne
    // engedjük az e-embernek a mozgatást/zoomolást, hogy ne zavarjon bele."
    //
    // MIÉRT KELL: megnyitáskor a nézet több hullámban tölt, és minden hullám után
    // ÚJRAILLESZT, hogy a teljes spirál látszódjon. Ha közben az e-ember mozgatna,
    // az illesztés kirántaná a kezéből a képet. Ezért amíg a kezdő fázis tart, a
    // gesztusok, a görgő és a +/− gombok nem hatnak; utána végleg feloldódik, és
    // automatikus illesztés soha többé nem történik (csak az „illesztés" gombbal).
    this._kezdoFazis = true;

    // BIZTONSÁGI HATÁRIDŐ: ha a letöltés elakad (hálózati hiba, végtelen várakozás),
    // a zárolás nem ragadhat be — ennyi idő után mindenképpen feloldjuk.
    this._kezdoFazisHatarido = null;

    // ----- ÁLLAPOT -----
    this._kivalasztottId = null;
    // A „további tartalmak" koppintáskor megjelölt síkidom: hol maradt abba az
    // előző lepakolás (`_jeloltId` — végig látszik), és mekkora volt a látszó
    // sugara (`_jeloltHelyzet` — egyszer használatos, a mélység visszaállításához).
    this._jeloltId = null;
    this._jeloltHelyzet = null;
    this._utolsoMagok = [];
    this._futoBetoltesek = 0;
    this._kepkocka = 0;
    this._rajzolasKeres = false;
    // ----- GESZTUS-ÁLLAPOT -----
    // A lenyomott ujjak/egérgombok: pointerId → { x, y } (képernyő-koordináták)
    this._aktivMutatok = new Map();

    // A gesztus ELŐZŐ mérése ({ kozepX, kozepY, tavolsag }) — mindent ehhez
    // képest, INKREMENTÁLISAN számolunk, lásd `_esemenyekBekotese`
    this._gesztusElozo = null;

    // Az összegyűlt elmozdulás és a legtöbb egyszerre lenyomott ujj — a
    // koppintás felismeréséhez (csak végig egy ujj + alig mozdult = koppintás)
    this._gesztusTavolsag = 0;
    this._gesztusMaxUjj = 0;
    this._ablakMeretezoBound = null;
    this._zoomVegeIdozito = null;  // a nagyítás végét figyelő időzítő

    // Az illesztési (alaphelyzet-) nagyítás — ehhez mérjük a kifelé nagyítás
    // alsó határát (KIFELE_HATAR). Amíg nincs első illesztés, nincs korlát.
    this._alapSkala = null;
    this._illesztesAnimacio = null;   // a futó illesztés-animáció azonosítója

    console.log('SikidomModal.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  async init() {
    console.log('SikidomModal.init - KEZDÉS');

    const tartalomHtml = await this._templateBetoltese();
    if (!tartalomHtml) return;

    this.modal = new Modal(this.kontenerAzonosito, {
      cim:      this.cimFelirat,
      tartalom: tartalomHtml,
      meret:    'teljes',
      gombok:   [],
      onBezaras: () => this._takaritasBezaraskor()
    });

    await this.modal.init();

    this.vaszon = document.getElementById('sikidom-vaszon');
    this.kontextus = this.vaszon?.getContext('2d') ?? null;
    this.rajzolo.vaszonBeallitasa(this.kontextus);

    document.getElementById('sikidom-zoom-be-gomb')
      ?.addEventListener('click', () => this._zoomKozeppontra(ZOOM_LEPES));
    document.getElementById('sikidom-zoom-ki-gomb')
      ?.addEventListener('click', () => this._zoomKozeppontra(1 / ZOOM_LEPES));
    document.getElementById('sikidom-illesztes-gomb')
      ?.addEventListener('click', () => this._alaphelyzet());
    document.getElementById('sikidom-kartya-bezar')
      ?.addEventListener('click', () => this._kartyaBezarasa());

    this._esemenyekBekotese();

    console.log('SikidomModal.init - VÉGE');
  }

  async _templateBetoltese() {
    try {
      const valasz = await fetch('./html/components/modals/sikidomModal.html');
      if (!valasz.ok) {
        console.error('SikidomModal._templateBetoltese - HIBA', { statusz: valasz.status });
        return null;
      }
      return await valasz.text();
    } catch (hiba) {
      console.error('SikidomModal._templateBetoltese - kivétel', hiba.message);
      return null;
    }
  }

  // ===== MEGNYITÁS =====
  async megnyitas() {
    console.log('SikidomModal.megnyitas - KEZDÉS');

    this.modal?.megnyitas();
    this._teljesNezetBekapcsolasa();
    this._nezetValtas('betoltes');

    // A virtuális világ-csomópont: a gyökér-entitások szülője
    this._tar.clear();
    this._tar.set(VILAG, this._ujCsomopont({
      id: VILAG, szuloId: null, relX: 0, relY: 0, relR: 1, pont: 0, vanGyereke: true
    }));
    this._horgony = VILAG;

    // Az első adag: még nincs képernyő-méret, ezért küszöb nélkül (a darab-plafonig)
    await this._gyerekekBetoltese(VILAG, 0);

    const vilag = this._tar.get(VILAG);
    if (!vilag.varolista.length && !vilag.gyerekIdk.length) {
      const szoveg = document.getElementById('sikidom-betoltes-szoveg');
      if (szoveg) szoveg.textContent = 'Még nincs megjeleníthető entitás.';
      console.log('SikidomModal.megnyitas - VÉGE (nincs adat)');
      return;
    }

    this._nezetValtas('nezet');
    this._vaszonMeretezese();

    // KÖRKÖRÖSSÉG FELOLDÁSA: a pakoláshoz kell a nagyítás (abból jön a lyuk
    // képpont-mérete), a végleges nagyításhoz viszont a pakolás kiterjedése.
    // Ezért egy DURVA becsléssel indulunk, lepakolunk, majd a MÉRT kiterjedésre
    // igazítunk — és ha az igazítás új helyet nyitott, még egyszer pakolunk.
    this._kezdoNezetBecslese(vilag);

    // A kezdő fázis alatt a nézet ZÁROLVA (lásd `_kezdoFazis`): előbb megérkezik és
    // lepakolódik a teljes készlet, aztán illesztünk, és csak utána nyúlhat hozzá
    // az e-ember. A lezárást a `_tennivalokFeldolgozasa` végzi, amint nyugalom van.
    this._kezdoFazis = true;
    this._folyamatJelzo(true);

    // Ha a letöltés elakadna, a zárolás ne ragadjon be
    if (this._kezdoFazisHatarido) clearTimeout(this._kezdoFazisHatarido);
    this._kezdoFazisHatarido = setTimeout(() => {
      console.warn('SikidomModal - a kezdő fázis időtúllépés miatt oldódik fel', {
        futoBetoltesek: this._futoBetoltesek
      });
      this._kezdoFazisLezarasa();
    }, KEZDO_FAZIS_HATARIDO_MS);

    this._tennivalokFeldolgozasa();
    this._alaphelyzet(false);          // az első illesztés a becsült kiterjedésre

    if (!this._ablakMeretezoBound) {
      this._ablakMeretezoBound = () => {
        this._vaszonMeretezese();
        this._alsoSavMagassagFrissitese();
        this._rajzolasKerese();
        // Más képernyő-méret = más lyuk-igény; ugyanaz a lépés, mint zoom után
        this._zoomVegeUtemezes();
      };
      window.addEventListener('resize', this._ablakMeretezoBound);
    }

    console.log('SikidomModal.megnyitas - VÉGE');
  }

  bezaras() { this.modal?.bezaras(); }

  _takaritasBezaraskor() {
    if (this._ablakMeretezoBound) {
      window.removeEventListener('resize', this._ablakMeretezoBound);
      this._ablakMeretezoBound = null;
    }
    if (this._zoomVegeIdozito) {
      clearTimeout(this._zoomVegeIdozito);
      this._zoomVegeIdozito = null;
    }
    if (this._kezdoFazisHatarido) {
      clearTimeout(this._kezdoFazisHatarido);
      this._kezdoFazisHatarido = null;
    }
    if (this._illesztesAnimacio) {
      cancelAnimationFrame(this._illesztesAnimacio);
      this._illesztesAnimacio = null;
    }
    this.rajzolo.ikonTarUrites();
    this._kartyaPanel.takaritas();
    this._teljesNezetKikapcsolasa();
    this._tar.clear();
  }

  // ===== ALSÓ SÁV LÁTHATÓSÁGA (a Struktúra nézet mintájára) =====
  // A teljes képernyős nézet alatt is látsszon és használható maradjon a főoldal
  // alsó sávja — így az e-ember a menüből át tud váltani pakli nézetre. A
  // vonatkozó CSS-szabályok a strukturaModal.css-ben élnek, és minden
  // .modal-panel--teljes nézetre érvényesek.
  _teljesNezetBekapcsolasa() {
    document.body.classList.add('teljes-nezet-nyitva');
    this._alsoSavMagassagFrissitese();
  }

  _teljesNezetKikapcsolasa() {
    document.body.classList.remove('teljes-nezet-nyitva');
  }

  _alsoSavMagassagFrissitese() {
    const alsoSav = document.querySelector('.also-sav');
    const magassag = alsoSav ? alsoSav.offsetHeight : 56;
    document.documentElement.style.setProperty('--alsosav-magassag', `${magassag}px`);
  }

  _nezetValtas(melyik) {
    document.getElementById('sikidom-betoltes')?.toggleAttribute('hidden', melyik !== 'betoltes');
    document.getElementById('sikidom-nezet')?.toggleAttribute('hidden', melyik !== 'nezet');
  }

  // ===== CSOMÓPONT LÉTREHOZÁSA =====
  _ujCsomopont(adatok) {
    return {
      id: adatok.id,
      entitasTipus: adatok.entitasTipus ?? null,
      cim: adatok.cim ?? null,
      pont: adatok.pont ?? 0,
      vanGyereke: adatok.vanGyereke ?? false,
      szuloId: adatok.szuloId ?? null,

      // HOLTVERSENY-DÖNTŐ: azonos méretnél a frissebb a „kisebb" (`frissebbElol`).
      // A lerakott csomópontnak is tudnia kell, mert minden újrapakolásnál újra
      // részt vesz a rendezésben.
      letrehozva: adatok.letrehozva ?? null,

      // Mellék-ikonok: { ikon, nev } objektumok (az `ikon` kép-URL vagy emoji).
      // A síkidom formája/színe csak az ENTITÁSTÍPUST mutatja — a kategóriát és
      // a tartalomtípust ezek az ikonok hordozzák.
      kategoriaIkonok: adatok.kategoriaIkonok ?? [],
      tipusIkon: adatok.tipusIkon ?? null,
      javaslatTipus: adatok.javaslatTipus ?? null,

      // A SZÜLŐ sugarának egységében
      relX: adatok.relX ?? 0,
      relY: adatok.relY ?? 0,
      relR: adatok.relR ?? 1,

      // A LERAKOTT gyerekek (van helyük, rajzolhatók)
      gyerekIdk: [],

      // A LETÖLTÖTT, de még LE NEM RAKOTT testvérek, csökkenő tudatpont szerint.
      // Innen veszünk, amikor a nagyítás helyet szabadít fel a lyukban. Ami itt
      // várakozik, az nem veszett el — csak még nincs akkora hely, ahol látszana.
      varolista: [],

      // A várólistán álló testvérek együttes RELATÍV területe: Σ π·relR².
      // Egyetlen szorzással megadja, mennyi képernyő-terület vár lerakásra
      // (`× kepSugar²`). A letöltés fékjeként 2026-08-09 óta NEM használjuk (azt
      // az `ELORETOLTES_DARAB` végzi), de a képernyőnkénti visszaszedéshez kell.
      //
      // A kapacitás-vágás által VISSZADOBOTT testvérek szándékosan NEM számítanak
      // bele: azok a sor VÉGÉRŐL estek le (túl nagyok), és ha beszámítanának,
      // örökre elzárnák a még hiányzó KICSIK letöltését.
      varolistaRelTerulet: 0,

      // A középső üresség MÉRT sugara a saját keretében (a pakoló adja vissza).
      // Amíg nincs lerakott gyerek, végtelen = „az egész belseje üres".
      magSugarRel: Infinity,

      // A legkülső gyerek pereme a saját keretében (a `_meretekUjramerese` méri).
      // A beágyazási invariáns ellenőrzéséhez és a kezdő nagyításhoz kell.
      kulsoSugar: 0,

      // Akinek MÁR VAN helye — akkor is, ha a kapacitás épp levette a képernyőről.
      // A mag CSAK azoknak tart fenn helyet, akiknek még nincs (lásd `_magSugar`).
      helyezettIdk: new Set(),
      helyezettPont: 0,

      betoltottGyerekPont: 0,     // a már LETÖLTÖTT gyerekek össz-pontja
      // Meddig töltöttünk le: a legutóbb kért tudatpont-küszöb, és a kurzor
      // (hol tartunk a rangsorban). Nincs lap és nincs „hányadik oldal".
      betoltottKuszob: Infinity,

      // A VISSZASZEDETT testvérek: van adatuk (pont, cím), de nincs HELYÜK és
      // nincs részfájuk. A kanonikus sorrend végéről kerültek le, ezért
      // visszatéréskor az előtag-stabilitás miatt pontosan a régi helyükre állnak
      // vissza. Csökkenő méret szerint áll (a legelöl a legnagyobb: ő ment el
      // utoljára, és ő jön vissza először).
      visszaszedettek: [],

      // PARKOLT-E EZ A SZINT (lásd `_osSopres`)? Ha igen, a `visszaszedettek` a
      // sorrend KÖZEPÉRŐL is tartalmaz elemeket, tehát a készlet hiányos —
      // ilyenkor PAKOLNI TILOS, amíg a `_kiparkolas` egyben vissza nem adta.
      parkolt: false,

      // A pozicionálási keret őrszemének állapota (lásd `_ujrapakolas`): mekkora
      // kerettel és mekkora várólistával dolgoztunk utoljára.
      utolsoKeret: -1,
      utolsoVarolistaDarab: -1,

      // MINDEN gyerek letöltve? A `betoltottGyerekPont >= osszesGyerekPont`
      // összehasonlítás lebegőpontos összegekre épül, tehát sosem szabad rá
      // egyedül bízni: ha egy hajszállal alatta ragad, a fókusz-csomópont (aminek
      // a küszöbe 0) VÉGTELEN sok üres kérést indítana. Ezt a jelzőt a backend
      // egyértelmű válasza állítja be (`vanTovabb === false` nulla küszöbnél).
      mindenLetoltve: false,

      // ===== A LAPOZÁS PLAFONJA (Csaba, 2026-08-11) =====
      // Ennyi testvért töltünk le ELŐRE, kérés nélkül. A „további tartalmak"
      // koppintás EMELI ezt egy újabb adaggal — így jelenítünk meg tetszőlegesen
      // sok testvért anélkül, hogy az első megnyitás lassú lenne.
      betoltesiPlafon: ELORETOLTES_DARAB,
      // Az e-ember KÉRTE a következő adagot: onnantól úgy töltünk, mint a
      // horgonynak (küszöb nélkül, a rangsor elejétől a kurzoron át).
      tovabbiKert: false,

      kurzorPont: null,
      kurzorId: null,
      osszesGyerekPont: 0,        // a backend adja: az ÖSSZES gyerek együttes pontja
      betoltesFut: false,
      legerosebbGyerekPont: 0,    // a gyökér-szint mértékegységéhez
      utoljaraLatva: 0
    };
  }

  // ===== EGY GYEREK RELATÍV SUGARA (a szülő sugara = 1) =====
  // EGY helyen, mert két külön ponton is kell: a várólistára fűzéskor (ott
  // rögzítjük az elem `relR`-jét) és az újrapakoláskor (ott áll össze a méret
  // szerinti sor). A kettőnek BIZTOSAN ugyanazt kell adnia, különben a sor
  // sorrendje és a lerakás sorrendje elválna egymástól.
  //
  // A gyökér-szinten nincs közös szülő, ezért a LEGERŐSEBB gyökérhez viszonyítunk
  // (és nincs /20, mert a gyökerek nem egy szinttel lejjebb vannak).
  _relSugar(cs, pont) {
    return cs.id === VILAG
      ? gyokerRelativSugar(pont, cs.legerosebbGyerekPont)
      : gyerekRelativSugar(pont, cs.pont);
  }

  // ===== VAN MÉG LE NEM TÖLTÖTT TESTVÉR? =====
  // EGY helyen, mert két külön kérdés függ tőle: kell-e még betöltés (`_rajzolas`),
  // és kell-e pakolási mag (`_pakolasiMagSugar`). A kettőnek BIZTOSAN ugyanazt kell
  // mondania — különben a lyuk akkor is ott maradna, amikor már mindenki megérkezett,
  // vagy fordítva: eltűnne, pedig van még.
  //
  // A `mindenLetoltve` a backend egyértelmű válaszából jön (`vanTovabb === false`);
  // a pont-összehasonlítás lebegőpontos összegekre épül, ezért önmagában sosem elég.
  // ===== A LEGNAGYOBB GYEREK RELATÍV SUGARA =====
  // A szülő sugarának egységében, a MÁR LERAKOTTAK és a VÁRÓLISTÁN állók közül.
  // Ebből dől el, hogy egy szint egyáltalán elkezdjen-e pozicionálni (lásd a
  // `pakolandok` melletti magyarázatot): ha a legnagyobb testvér sem érné el a
  // minimum méretet, fölösleges helyet számolni bárkinek.
  //
  // CIKLUSSAL, nem `Math.max(...tomb)`-bel: ötezres sornál a szórás-operátor
  // túlcsordítaná a hívási vermet.
  _legnagyobbGyerekRelR(cs) {
    let legnagyobb = 0;
    for (const gid of cs.gyerekIdk) {
      const gy = this._tar.get(gid);
      if (gy && gy.relR > legnagyobb) legnagyobb = gy.relR;
    }
    for (const v of cs.varolista) {
      const r = v.relR ?? 0;
      if (r > legnagyobb) legnagyobb = r;
    }
    return legnagyobb;
  }

  // ===== VAN MÉG NEM POZICIONÁLT TESTVÉR? =====
  // Csaba, 2026-08-11: „a pakolási üres mag és a képernyő-fix üres mag más, de
  // ezeknek csak EGYSZERRE kell létezniük, mert ugyanaz a feltételük: legyen még
  // nem pozicionált testvér. Ha már pozicionálva van az utolsó testvér is, akkor
  // használjuk a minimum méretet."
  //
  // ⚠️ EZ TÁGABB, MINT A „NINCS MÉG LETÖLTVE". Egy testvér lehet letöltve, mégis
  // pozicionálatlan — három okból:
  //   - a VÁRÓLISTÁN áll (megjött, de még nem kapott helyet);
  //   - VISSZASZEDTÜK vagy PARKOL (van adata, de nincs helye);
  //   - a POZICIONÁLÁSI KERETEN kívülre esett (lásd `pozicionalasiKeret`).
  // A várólista és a visszaszedettek mindhárom esetet lefedik.
  //
  // @param {Object} cs - a szülő csomópont
  // @returns {boolean}
  _vanNemPozicionaltTestver(cs) {
    if (!cs) return false;
    if (cs.varolista.length > 0) return true;
    if (cs.visszaszedettek.length > 0) return true;
    return this._vanMegBetoltetlen(cs);
  }

  _vanMegBetoltetlen(cs) {
    if (cs.mindenLetoltve) return false;
    return cs.osszesGyerekPont === 0 || cs.betoltottGyerekPont < cs.osszesGyerekPont;
  }

  // ===== A PAKOLÁSI MAG SUGARA =====
  // Lásd `PAKOLASI_MAG_ARANY`. NEM foglalás: nem a hátralévő tudatpontból számol,
  // hanem a legkisebb lerakandó testvér sugarának állandó többszöröse.
  //
  // Ha MINDEN testvér letöltve, 0-t ad — ilyenkor a pakoló a legkisebb síkidomot a
  // KÖZÉPPONTBA teszi (lásd `sikidomPakolas.pakolas`), és a közép üressége megszűnik:
  // ez maga az üzenet, hogy nincs több tartalom.
  //
  // @param {Object} cs - a szülő csomópont
  // @param {Array} mind - a most lerakandó teljes sor [{ id, sugar }]
  // @returns {number} a lyuk sugara a szülő sugarának egységében
  _pakolasiMagSugar(cs, mind) {
    if (!this._vanMegBetoltetlen(cs)) return 0;

    // A legkisebb ÉS a legnagyobb sugár — CIKLUSSAL, nem `Math.min(...tomb)`-bel:
    // tízezres sorozatnál a szórás-operátor túlcsordítaná a hívási vermet.
    let legkisebb = Infinity;
    let legnagyobb = 0;
    for (const m of mind) {
      if (!(m.sugar > 0)) continue;
      if (m.sugar < legkisebb) legkisebb = m.sugar;
      if (m.sugar > legnagyobb) legnagyobb = m.sugar;
    }
    if (!Number.isFinite(legkisebb)) return 0;

    const sugar = legkisebb * PAKOLASI_MAG_ARANY;

    // A VILÁG virtuális: nincs valódi pereme, oda bármekkora lyuk fér.
    if (cs.id === VILAG) return sugar;

    // Máshol a BEÁGYAZÁS nem sérülhet: a lyuk peremén ülő LEGNAGYOBB gyerek
    // `mag + 2·sugár`-ig ér, és ennek a szülőn belül kell maradnia. (Az `_ujrapakolas`
    // külön ellenőrzi is — ez a felső határ épp azt a hibát előzi meg.)
    return Math.min(sugar, Math.max(0, 1 - 2 * legnagyobb));
  }

  // ===== EGY GYEREK FELVÉTELE A TÁRBA, ADOTT HELYRE =====
  // Egy helyen, mert két útvonalon is történik: frissen lepakolt testvérnél és a
  // kapacitás-vágásból visszatérőnél (ő a MEGJEGYZETT helyére kerül vissza).
  //
  // Itt könyveljük a `helyezettPont`-ot is: egy testvér pontja CSAK ELŐSZÖR
  // számít bele, mert a hely azután is az övé marad, ha a kapacitás épp leveszi
  // a képernyőről.
  _gyerekFelvetele(cs, v, relX, relY, relR) {
    if (!cs.helyezettIdk.has(v.id)) {
      cs.helyezettIdk.add(v.id);
      cs.helyezettPont += v.pont ?? 0;
    }

    this._tar.set(v.id, this._ujCsomopont({
      id: v.id,
      entitasTipus: v.entitasTipus,
      cim: v.cim,
      pont: v.pont,
      letrehozva: v.letrehozva ?? null,
      vanGyereke: v.vanGyereke,
      kategoriaIkonok: v.kategoriaIkonok,
      tipusIkon: v.tipusIkon,
      javaslatTipus: v.javaslatTipus,
      szuloId: cs.id,
      relX, relY, relR
    }));
    cs.gyerekIdk.push(v.id);
  }

  // MEGJEGYZÉS: itt állt a `_vedettIdk()` — a horgonyt és őseit védte a
  // kapacitás-vágástól, mert az kitörölte a csomópontokat a tárból, és ha a
  // horgony esett ki, a vászon kiürült. A vágás 2026-08-09 óta CSAK a rajzolást
  // korlátozza, tárból nem töröl semmit, ezért a védelemre nincs többé szükség.
  // (Ha valaha visszakerül olyan lépés, ami csomópontot töröl, ezt vissza kell hozni.)

  // ===== A BETÖLTÉSI KÜSZÖB TUDATPONTBAN =====
  // A méret-képlet megfordítása. Egy gyerek képernyő-átmérője:
  //     2 · szülőKépernyőSugár · √( gyerekPont / (20 · szülőPont) )
  // Ez akkor éri el a `d` átmérőt, ha
  //     gyerekPont ≥ 20 · szülőPont · ( d / (2 · szülőKépernyőSugár) )²
  //
  // A `d` NEM a láthatósági küszöb, hanem annak `BETOLTESI_MELYSEG`-ed része:
  // mélyebbre töltünk, mint amit rajzolunk, hogy a farok a láthatóvá válás ELŐTT
  // megérkezzen és helyet kapjon (különben a fenntartott mag nem tud lefogyni).
  //
  // Ez a nézet betöltésének EGYETLEN szabálya: nem „a következő 60"-at kérjük,
  // hanem pontosan azt, ami elér eddig a méretig. A gyökér-szinten nincs szülő-pont,
  // ott a LEGERŐSEBB gyökér a mértékegység (és nincs /20, mert a gyökerek nem egy
  // szinttel lejjebb vannak).
  //
  // @param {Object} cs - a szülő csomópont
  // @param {number} kepSugar - a szülő pillanatnyi képernyő-sugara
  // @returns {number} a szükséges minimum tudatpont
  _pontKuszob(cs, kepSugar) {
    if (!(kepSugar > 0)) return Infinity;

    // MÉLYEBBRE TÖLTÜNK, MINT AMIT RAJZOLUNK (lásd BETOLTESI_MELYSEG): a
    // legkisebb ÉRDEMES méret a szülő sugarának arányában.
    const relSugar = (MIN_KEP_ATMERO / BETOLTESI_MELYSEG) / (2 * kepSugar);

    // A méret-modul megfordítása — így a két irány sosem csúszhat el egymástól
    return cs.id === VILAG
      ? gyokerPontKuszob(relSugar, cs.legerosebbGyerekPont || 0)
      : gyerekPontKuszob(relSugar, cs.pont || 0);
  }

  // ===== GYEREKEK BETÖLTÉSE EGY KÜSZÖBIG =====
  // Lekéri azokat a gyerekeket, amelyek elérik a küszöböt és még nincsenek meg
  // (a kurzor mondja meg, hol tartunk), és a VÁRÓLISTÁRA teszi őket.
  //
  // Ez a metódus CSAK LETÖLT — nem helyez el semmit. A lerakás külön lépés
  // (`_ujrapakolas`), ami a nagyítás végén fut. A kettő szétválasztása azért
  // kell, mert a letöltés a tudatpont-küszöbtől függ, a lerakás viszont a
  // középső lyuk pillanatnyi képernyő-méretétől — más ütemben mozognak.
  async _gyerekekBetoltese(szuloId, pontKuszob) {
    const szulo = this._tar.get(szuloId);
    if (!szulo || szulo.betoltesFut) return;
    if (this._futoBetoltesek >= EGYIDEJU_BETOLTES) return;

    console.log('SikidomModal._gyerekekBetoltese - KEZDÉS', {
      szuloId, pontKuszob: Math.round(pontKuszob)
    });

    szulo.betoltesFut = true;
    this._futoBetoltesek++;
    this._folyamatJelzo(true);

    try {
      const reszek = [];
      if (szuloId !== VILAG) reszek.push(`szulo=${encodeURIComponent(szuloId)}`);
      reszek.push(`minPont=${Math.max(0, pontKuszob)}`);
      if (szulo.kurzorPont != null && szulo.kurzorId) {
        reszek.push(`kurzorPont=${szulo.kurzorPont}`);
        reszek.push(`kurzorId=${encodeURIComponent(szulo.kurzorId)}`);
      }
      reszek.push(`darab=${KERES_PLAFON}`);

      // Az ÖSSZES gyerek együttes pontját CSAK az ELSŐ kérésnél kérjük el. A
      // backendnek ehhez a szülő minden gyerekét össze kell adnia (aggregáció),
      // ami egy milliós ágnál kérésenként végigolvasná az egészet. Az érték egy
      // munkamenet alatt gyakorlatilag állandó — elég egyszer megkérdezni.
      if (szulo.osszesGyerekPont > 0) reszek.push('osszesKell=0');

      const valasz = await apiGet(`sikidom/gyerekek?${reszek.join('&')}`, this.token);

      const gyerekek = valasz?.gyerekek ?? [];
      szulo.osszesGyerekPont = valasz?.osszesGyerekPont ?? szulo.osszesGyerekPont ?? 0;

      if (valasz?.kurzor) {
        szulo.kurzorPont = valasz.kurzor.pont;
        szulo.kurzorId = valasz.kurzor.id;
      }

      // A küszöböt csak akkor jegyezzük be teljesítettként, ha az adag NEM
      // vágódott le a darab-plafonon — különben a küszöbig még van hátra, és a
      // következő képkockán a kurzortól folytatjuk.
      if (!valasz?.vanTovabb) {
        szulo.betoltottKuszob = Math.max(0, pontKuszob);
        // Nulla küszöbnél a „nincs több" azt jelenti: EGYÁLTALÁN nincs több
        if (pontKuszob <= 0) szulo.mindenLetoltve = true;
      }

      if (gyerekek.length > 0) this._varolistaraFuzes(szulo, gyerekek);

      console.log('SikidomModal._gyerekekBetoltese - VÉGE', {
        szuloId, kapott: gyerekek.length, vanTovabb: !!valasz?.vanTovabb,
        varolista: szulo.varolista.length
      });
    } catch (hiba) {
      console.error('SikidomModal._gyerekekBetoltese - HIBA', { szuloId, hiba: hiba.message });
      // Ne próbálkozzunk vég nélkül ugyanezzel a küszöbbel
      szulo.betoltottKuszob = Math.max(0, pontKuszob);
    } finally {
      szulo.betoltesFut = false;
      this._futoBetoltesek--;
      // A kezdő fázisban végig látszik a jelző — ott a zárolás miatt fontos, hogy
      // az e-ember lássa: dolgozunk, nem fagyott meg.
      if (this._futoBetoltesek <= 0 && !this._kezdoFazis) this._folyamatJelzo(false);

      // A friss adag azért érkezett, mert az e-ember befelé nagyított és megállt —
      // tehát most rögtön le is akarjuk rakni belőle, ami elfér.
      this._tennivalokFeldolgozasa();
      this._rajzolasKerese();
    }
  }

  // ===== A LETÖLTÖTT ADAG A VÁRÓLISTÁRA =====
  // Csak eltárol; a lerakásról az `_ujrapakolas` dönt. A `betoltottGyerekPont`
  // a LETÖLTÖTT (nem a lerakott) mennyiséget követi — ebből tudjuk, kell-e még
  // kérni a backendtől.
  _varolistaraFuzes(szulo, gyerekek) {
    // A gyökér-szintnek nincs szülő-pontja, ezért a LEGERŐSEBB gyökérhez
    // viszonyítunk. Az az első adag 0. eleme — a rangsor eleje sosem változik,
    // tehát a mértékegység sem mozdul a további adagok betöltésekor.
    if (szulo.id === VILAG && !szulo.legerosebbGyerekPont && gyerekek.length) {
      szulo.legerosebbGyerekPont = gyerekek[0].hierarchikusOsszesPont ?? 0;
    }

    for (const gy of gyerekek) {
      const pont = gy.hierarchikusOsszesPont ?? 0;

      // A relatív sugarat MOST számoljuk ki, egyszer: nagyítás-független érték,
      // és így a letöltési puffer mérőszáma (`varolistaRelTerulet`) is
      // karbantartható anélkül, hogy képkockánként végigolvasnánk a listát.
      const relR = this._relSugar(szulo, pont);

      szulo.varolista.push({
        id: gy.entitasId.toString(),
        entitasTipus: gy.entitasTipus,
        cim: gy.cim,
        pont,
        relR,
        // A HOLTVERSENY-DÖNTŐ (Csaba, 2026-08-11): azonos méretnél a frissebb a
        // „kisebb", tehát ő kerül beljebb. Lásd `frissebbElol` a pakolóban.
        letrehozva: gy.letrehozva ?? null,
        vanGyereke: gy.vanGyereke,
        kategoriaIkonok: gy.kategoriaIkonok ?? [],
        tipusIkon: gy.tipusIkon ?? null,
        javaslatTipus: gy.javaslatTipus ?? null
      });

      szulo.betoltottGyerekPont += pont;
      szulo.varolistaRelTerulet += Math.PI * relR * relR;
    }

    // A backend csökkenő pont szerint ad, a kurzor pedig folytatólagos — az
    // összefűzött lista tehát már rendezett. Védelemből mégis rendezünk, mert a
    // pakolás sorrend-érzékeny.
    //
    // A LETÖLTÉSI sorrend a PAKOLÁSI pontos tükörképe: pont csökkenő, és
    // holtversenynél a RÉGEBBI előrébb (a `frissebbElol` fordítottja) — így a
    // legfrissebb érkezik utoljára, és ő kerül a legbeljebb. Ez a nézet
    // alapszabálya: ami később érkezik, az beljebb való.
    szulo.varolista.sort((a, b) => (b.pont - a.pont) || frissebbElol(b, a));
  }

  // ===== A LERAKÁS =====
  // A nézet elrendező lépése. NEM újrapakolás: a már lerakottak helye VÉGLEGES,
  // csak az újakat helyezzük el közéjük.
  //
  // MIÉRT ÍGY:
  //   - A pakolás sorrend-érzékeny (növekvő méret szerint, a legkisebb középre).
  //     Ha mindent újrapakolnánk, egyetlen új — az eddigieknél kisebb — testvér a
  //     sor ELEJÉRE kerülne, és onnantól minden utána következő síkidom új helyre
  //     ugrana. Emiatt volt lehetetlen ráközelíteni egy szélső síkidomra.
  //   - A helyet a MAG tartja fenn a később érkezőknek (`_magSugar`), a hátralévő
  //     tudatpontból. A kapacitás-vágásból visszatérő síkidom pedig a MEGJEGYZETT
  //     helyére kerül vissza — nem újként, a mag peremére.
  //   - A szülő nem tud „megtelni": a gyerekek együttes területe legfeljebb a
  //     szülő 1/20-a (a hierarchikus össztudatpont miatt), tehát hússzoros a tartalék.
  //
  // Mérve (2026-08-09): 2 000 síkidom 15–20 ms, 10 000 kb. 70 ms, 128 000 kb.
  // 850 ms — nagyjából lineárisan, nulla átfedéssel.
  //
  // @returns {boolean} változott-e az elrendezés (kell-e újrarajzolni)
  // @param {Object} kep - a csomópont KÉPERNYŐ-adatai; ebből a `kepSugar` kell.
  //   (A `kepX`/`kepY` a látómező-válogatáshoz kellett, ami megszűnt — a lerakott
  //   síkidomok 2026-08-08 óta mind helyben maradnak, nincs mit válogatni.)
  // @param {number} melyseg - a csomópont mélysége a HORGONYHOZ képest. Ebből jön a
  //   pozicionálási keret (lásd `pozicionalasiKeret`).
  _ujrapakolas(cs, kep, melyseg = 0) {
    const { kepSugar } = kep || {};
    if (!cs || !(kepSugar > 0)) return false;

    // ŐRSZEM: parkolt szinten a készlet a sorrend közepén is hiányos (lásd
    // `_osSopres`), ezért a pakolás rossz helyeket adna. A `_kiparkolas` adja
    // vissza egyben, mielőtt ez a szint újra sorra kerülne.
    if (cs.parkolt) return false;

    const vilagSzint = cs.id === VILAG;
    if (!((vilagSzint ? cs.legerosebbGyerekPont : cs.pont) > 0)) return false;


    const relSugar = (pont) => this._relSugar(cs, pont);

    // ===== A LERAKÁS ÉS A MEGJELENÍTÉS SZÉT VAN VÁLASZTVA =====
    // Csaba döntése (2026-08-09). Korábban a képernyő KAPACITÁSA döntötte el, ki
    // kap egyáltalán helyet: ami nem fért a képre, azt levettük a tárból.
    //
    // EZ ÖRDÖGI KÖRT CSINÁLT. Közelítéskor a síkidomok képernyő-területe nő, tehát
    // a vágás egyre többet dobott le — azok pedig nem kaptak helyet, tehát bent
    // maradtak a HÁTRALÉVŐK között, amitől a mag (`_magSugar`) tovább nőtt.
    // Csaba tünete: „ahogy közelítek, a belső mag a képernyőhöz képest folyamatosan
    // nő, és előbb-utóbb csak az üres magot látom." Minél jobban közelítettél,
    // annál kevesebb került le, és annál nagyobb lett az üres közép.
    //
    // AZ ÚJ SZABÁLY: a kapacitás azt dönti el, mit RAJZOLUNK KI — nem azt, ki kap
    // helyet. Egy hely kiosztása néhány szám, nem kerül rajzolási időbe. Így:
    //   - minden letöltött testvér AZONNAL helyet kap;
    //   - a `T_hátra` már csak a LE NEM TÖLTÖTTEKET jelenti;
    //   - közelítéskor a tudatpont-küszöb süllyed → több töltődik le → mind helyet
    //     kap → a MAG MAGÁTÓL ZSUGORODIK. A közelítés fogyasztja a magot, nem növeli.
    // A rajzolást 2026-08-09 óta az ÜRES MAG és a `MAX_RAJZOLT` vészfék korlátozza.
    //
    // MIÉRT NEM KORLÁTOZHATJUK MÉGIS A LERAKÁST: mérve (2026-08-09) a mag
    // képernyő-korlátja mind a négy beállításban MEGFORDÍTOTTA a rendet (a
    // méret-tizedek átlagos középtávolsága 0,6616 → 0,1460 lett a helyes
    // 0,0222 → 0,2241 helyett). Fix helyek mellett a tartalék nem opcionális: ha
    // elvesszük, a később érkezők kifelé szorulnak.

    // ===== 2026-08-09 ÓTA: EGYETLEN, TELJES PAKOLÁS, BENTRŐL KIFELÉ =====
    // Csaba modellje. Nincs mag és nincs befagyasztott környezet: MINDEN ismert
    // testvért (a már lerakottakat ÉS a várólistát) egyetlen menetben, növekvő
    // méret szerint rakunk le — a legkisebb a középpontba, onnan kifelé.
    //
    // MIÉRT LEHET EZT: mert a kifelé építkezés az ív-számítással GYORS. Mérve
    // (2026-08-09): 2 000 síkidom 15–20 ms, 10 000 kb. 70 ms, 128 000 kb. 850 ms —
    // nagyjából lineárisan, nulla átfedéssel, még extrém méret-ugrásoknál is.
    // Nem kell tehát a helyeket „megőrizni": olcsóbb újraszámolni.
    //
    // MIT ADUNK FEL: a „lerakott síkidom soha nem mozdul" ígéretet. Ha új, az
    // eddigieknél KISEBB testvér érkezik, az a sor elejére kerül, és a kép
    // átrendeződik. Ezt az `ELORETOLTES_DARAB` teszi ritkává: 5 000 testvér
    // helyét előre kiszámoljuk, tehát a nagyítás sokáig nem hoz újat.
    //
    // MIÉRT NEM TARTHATJUK MEG MÉGIS A RÉGI HELYEKET: mert akkor az új, kisebb
    // testvéreknek a KÖZÉPPONT kellene, ami már foglalt — kifelé szorulnának.
    // Mérve pontosan ez történt: a méret-tizedek 2,59 · 2,46 · 2,32 · … lettek,
    // vagyis a legkisebbek kerültek legkívülre.

    // ===== A MÁR LERAKOTTAK HELYBEN MARADNAK (2026-08-09-ig) =====
    // Ez a nézet STABILITÁSÁNAK alapja (Csaba, 2026-08-08). Korábban minden
    // újrapakolásnál MINDENT újrarendeztünk, és mivel a pakolás sorrend-érzékeny
    // (növekvő méret szerint, a legkisebb középre), egyetlen új — az eddigieknél
    // KISEBB — testvér a sor ELEJÉRE került, és onnantól minden utána következő
    // síkidom új helyre ugrott.
    //
    // A tünet: befelé közelítve a kép átrendeződött, és egy szélső síkidomra
    // gyakorlatilag lehetetlen volt ráközelíteni — mindig elugrott, kergetni kellett.
    //
    // A MEGOLDÁS: a már lerakottak KÖRNYEZETKÉNT (akadályként) vesznek részt, nem
    // pakolandóként — így a helyük NEM változik. Csak az újakat rakjuk le, a mag
    // pereme mentén. Pontosan erre való a pakoló `kornyezet` és `magSugar`
    // paramétere — eddig üresen hagytuk mindkettőt.
    // MINDEN ISMERT TESTVÉR egy listába: a már lerakottak (őket ÁTHELYEZZÜK) és a
    // várólistán állók (ők most kapnak helyet). A pakoló rendezi őket növekvő
    // méret szerint — a sorrendet nem itt döntjük el.
    const mind = [];

    for (const gid of cs.gyerekIdk) {
      const gy = this._tar.get(gid);
      if (!gy) continue;
      mind.push({ id: gy.id, sugar: gy.relR, letrehozva: gy.letrehozva ?? null, csomopont: gy });
    }

    for (const v of cs.varolista) {
      mind.push({
        id: v.id,
        sugar: v.relR ?? relSugar(v.pont),
        letrehozva: v.letrehozva ?? null,
        varo: v
      });
    }

    if (mind.length === 0) return false;

    // Ha nincs új, és a régiek már le vannak rakva, nincs mit tenni — a pakolás
    // determinisztikus, tehát pontosan ugyanazt adná vissza. (Enélkül minden
    // zoom-lépés végén fölöslegesen újraszámolnánk az egészet.)
    if (cs.varolista.length === 0) return false;

    // ===== A POZICIONÁLÁSI KERET: A LEGNAGYOBBAK KAPNAK HELYET =====
    // Lásd `pozicionalasiKeret`. A horgony 5 000-et rak le, egy szinttel lejjebb
    // 250-et, két szinttel lejjebb 12-t — a keret ugyanazzal a hányaddal fogy,
    // amivel a terület.
    //
    // ⚠️ A KERETEN KÍVÜLIEK VISSZAKERÜLNEK A VÁRÓLISTÁRA, és a `gyerekIdk`-ból is
    // kiesnek. Ez azért kötelező, mert a pakolás a kiválasztott halmazt EGÉSZKÉNT
    // kezeli: ha a keretből kimaradókat a régi helyükön hagynánk, a most lerakottak
    // ÁTFEDNÉNEK velük. Így viszont a keret bővülésekor (szintváltáskor) a
    // várólistáról mind visszatérnek, és egyetlen menetben pakolódnak újra.
    const keretDarab = pozicionalasiKeret(melyseg);

    // ŐRSZEM A FÖLÖSLEGES KÖRÖZÉS ELLEN: ha a keret miatt marad tartósan valami a
    // várólistán, a `varolista.length > 0` önmagában minden zoom-lépés végén
    // újrapakolást kérne — pedig a pakolás determinisztikus, tehát ugyanazt adná.
    // Csak akkor dolgozunk, ha a KERET változott (szintváltás) vagy ÚJ anyag jött.
    if (keretDarab === cs.utolsoKeret && cs.varolista.length === cs.utolsoVarolistaDarab) {
      return false;
    }

    let pakolando = mind;
    let keretenKivul = [];

    if (mind.length > keretDarab) {
      // A LEGNAGYOBBAKAT tartjuk meg (Csaba döntése): a kanonikus sorrend VÉGÉT.
      const rendezett = [...mind].sort((a, b) => pakolasiSorrend(
        { id: a.id, sugar: a.sugar, letrehozva: a.letrehozva },
        { id: b.id, sugar: b.sugar, letrehozva: b.letrehozva }
      ));
      keretenKivul = rendezett.slice(0, rendezett.length - keretDarab);
      pakolando = rendezett.slice(rendezett.length - keretDarab);
    }

    // ===== A PAKOLÁSI MAG: JELZÉS, HOGY VAN MÉG =====
    // Lásd `PAKOLASI_MAG_ARANY`. Ez NEM a régi, foglalásos mag: nem a hátralévő
    // tudatpontból méretezzük (az végtelen testvérnél végtelen lenne), hanem a
    // legkisebb lerakandó testvér sugarának állandó többszöröse.
    //
    // Ha már minden testvér letöltve, 0 — ilyenkor a pakoló a legkisebbet a
    // KÖZÉPPONTBA teszi, és a közép nem üres többé: ez maga az üzenet, hogy
    // nincs több tartalom.
    //
    // NINCS KÖRNYEZET: üres lapra pakolunk. A következő adag betöltésekor is így
    // lesz — az egész elrendezés újraépül, ezért nincs mit „megvédeni".
    const magSugar = this._pakolasiMagSugar(cs, pakolando);

    const eredmeny = pakolas(
      pakolando.map(m => ({ id: m.id, sugar: m.sugar, letrehozva: m.letrehozva })),
      { magSugar, kornyezet: [] }
    );

    // --- AZ EREDMÉNY BEKÖTÉSE ---
    // A már meglévő csomópontnak CSAK a helyét írjuk át (a leszármazottai a
    // SZÜLŐJÜKHÖZ képest vannak tárolva, tehát a teljes részfa vele mozog — nem
    // kell hozzányúlni). Az újakat felvesszük a tárba.
    const terkep = new Map(pakolando.map(m => [m.id, m]));
    let athelyezett = 0;
    let ujonnan = 0;

    for (const hely of eredmeny.helyek) {
      const m = terkep.get(hely.id);
      if (!m) continue;

      if (m.csomopont) {
        m.csomopont.relX = hely.x;
        m.csomopont.relY = hely.y;
        athelyezett++;
      } else if (m.varo) {
        this._gyerekFelvetele(cs, m.varo, hely.x, hely.y, m.sugar);
        ujonnan++;
      }
    }

    // ===== A KERETEN KÍVÜLIEK VISSZA A VÁRÓLISTÁRA =====
    // Aki nem fért a keretbe, az NEM maradhat lerakva: a most lepakoltak
    // átfednének vele. Az adata megmarad, tehát a keret bővülésekor (szintváltás)
    // újra helyet kap — letöltés nélkül.
    const varolistaraVissza = [];
    let keretbolKiesett = 0;

    for (const m of keretenKivul) {
      if (m.csomopont) {
        const gy = m.csomopont;
        this._reszfaTorlese(gy);
        this._tar.delete(gy.id);
        cs.helyezettIdk.delete(gy.id);
        cs.helyezettPont = Math.max(0, cs.helyezettPont - (gy.pont ?? 0));
        varolistaraVissza.push({
          id: gy.id, entitasTipus: gy.entitasTipus, cim: gy.cim, pont: gy.pont,
          relR: gy.relR, letrehozva: gy.letrehozva, vanGyereke: gy.vanGyereke,
          kategoriaIkonok: gy.kategoriaIkonok, tipusIkon: gy.tipusIkon,
          javaslatTipus: gy.javaslatTipus
        });
        keretbolKiesett++;
      }
      // aki `varo` volt, az úgyis a várólistán marad (lásd a szűrést lentebb)
    }

    if (keretbolKiesett > 0) {
      cs.gyerekIdk = cs.gyerekIdk.filter(id => this._tar.has(id));
    }

    // A várólistán marad, amit a pakoló nem tudott lerakni, ÉS ami a kereten kívülre
    // esett (a pakoló azt nem is látta)
    const lerakatlan = new Set(eredmeny.lerakatlanIdk);
    const keretenKivuliVaroIdk = new Set(keretenKivul.filter(m => m.varo).map(m => m.id));
    cs.varolista = cs.varolista.filter(v => lerakatlan.has(v.id) || keretenKivuliVaroIdk.has(v.id));
    if (varolistaraVissza.length > 0) cs.varolista.push(...varolistaraVissza);

    // Az őrszem állapota: mivel dolgoztunk most (lásd fentebb)
    cs.utolsoKeret = keretDarab;
    cs.utolsoVarolistaDarab = cs.varolista.length;
    cs.varolistaRelTerulet = cs.varolista
      .reduce((s, v) => s + Math.PI * (v.relR ?? 0) * (v.relR ?? 0), 0);

    this._meretekUjramerese(cs);

    console.log('SikidomModal._ujrapakolas', {
      csomopont: cs.id,
      athelyezett,                           // a már meglévők ÚJ helyre kerültek
      ujonnan,
      lerakatlan: eredmeny.lerakatlanIdk.length,
      varolistan: cs.varolista.length,
      magSugar: magSugar.toFixed(4),
      magKeppont: Math.round(cs.magSugarRel * kepSugar * 2),
      kulsoSugar: cs.kulsoSugar.toFixed(4),
      horgonySzint: this._horgonySzint()
    });

    // A beágyazási invariánst ITT is őrizzük: a konzolban azonnal látszódjon, ha
    // egy gyerek a szülőjén kívülre kerül. (Ez a hiba 2026-08-06-án épp egy
    // konzolos képernyőképről derült ki — ne kelljen legközelebb kitalálni.)
    if (!vilagSzint && cs.kulsoSugar > 1.000001) {
      console.error('SikidomModal._ujrapakolas - BEÁGYAZÁS SÉRÜL: gyerek a szülőn kívül', {
        csomopont: cs.id, kulsoSugar: cs.kulsoSugar, magSugar, kepSugar
      });
    }

    return true;
  }

  // ===== HÁROM ÁTJÁRÓ A TÁR-MODULHOZ =====
  // A tár-kezelés a `sikidomTar.js`-ben él (2026-08-11). Ez a három metódus
  // SZÁNDÉKOSAN maradt itt, vékony átjáróként: kizárólag az `_ujrapakolas` és a
  // `_lathatoLista` hívja őket, azt a két metódust pedig érintetlenül akarjuk
  // hagyni — ők hordozzák a nézet összes méréssel szerzett szabályát. Egy átjáró
  // olcsóbb, mint hozzájuk nyúlni.

  // A mag és a külső perem ÚJRAMÉRÉSE a gyerekekből. Nem vezetjük görgetve
  // (a kerekítési hibák halmozódnának) — mindig a tényleges helyekből számoljuk.
  _meretekUjramerese(cs) {
    meretekUjramerese(this._tar, cs);
  }

  // Egy csomópont ALATTI részfa törlése a tárból (a csomópont marad)
  _reszfaTorlese(cs) {
    return reszfaTorlese(this._tar, cs);
  }

  // A visszaszedettek visszahozatala kicsinyítéskor
  _visszahozatal(cs, kepSugar) {
    return visszahozatal(cs, kepSugar, this._kepernyoMeret());
  }

  // ===== VÁSZON MÉRETEZÉSE =====
  _vaszonMeretezese() {
    const nezetElem = document.getElementById('sikidom-nezet');
    if (!nezetElem || !this.vaszon) return;

    const arany = window.devicePixelRatio || 1;
    this._szelesseg = nezetElem.clientWidth;
    this._magassag = nezetElem.clientHeight;

    this.vaszon.width = Math.max(1, Math.round(this._szelesseg * arany));
    this.vaszon.height = Math.max(1, Math.round(this._magassag * arany));
    this.kontextus.setTransform(arany, 0, 0, arany, 0, 0);
  }

  _kepernyoMeret() {
    return Math.min(this._szelesseg || 1, this._magassag || 1);
  }

  // ===== A KÉPERNYŐ KAPACITÁSA (képpont-TERÜLETBEN) =====
  // Mennyi síkidom-terület fér el egyszerre? Ez az EGYETLEN dolog, ami a munkát
  // korlátozza, amióta a képernyőn kívüliek eltüntetése ki van kapcsolva — és
  // pont ezért nem szabad becslésnek lennie.
  //
  // A síkidomok NEM fedik át egymást, tehát a területük összege legfeljebb akkora
  // lehet, mint a rajzolt mező (a képernyő + LATOMEZO_TARTALEK arányú kerete),
  // szorozva egy reális pakolási sűrűséggel.
  //
  // MIÉRT TERÜLET, ÉS NEM DARABSZÁM: egy darabszám-plafon a legrosszabb esetet
  // (csupa minimum-méretű síkidom) feltételezné, és 4K-n 73 000-et engedne —
  // pedig néhány nagy síkidom ugyanennyi helyet foglal. A terület magától
  // igazodik a méret-keverékhez.
  //
  // FONTOS: ez a KÉPERNYŐ méretétől függ, NEM a testvérek számától. Millió vagy
  // milliárd testvérnél ugyanannyi — ez teszi kezelhetővé a nagy állományt.
  // HASZNÁLATON KÍVÜL 2026-08-09 óta (a letöltést a darabszám fékezi) — de ez a
  // MEGJELENÍTÉS korlátjának alapja lesz: „a darabszám (képernyőnkénti) korlátos
  // visszaszedés" (Csaba, 2026-08-09).
  _kepernyoKapacitas() {
    const keret = 1 + 2 * LATOMEZO_TARTALEK;
    const mezoTerulet = (this._szelesseg || 1) * keret * (this._magassag || 1) * keret;
    return mezoTerulet * PAKOLASI_SURUSEG;
  }

  // ===== MELYIK HIERARCHIA-SZINTET NÉZZÜK ÉPPEN? =====
  // Csaba kérése (2026-08-06): „amikor beleközelítenek egy entitásba, azt a
  // programnak érzékelnie kell; a koino_1.0 ezt már tudta." A nézet ezt a
  // HORGONNYAL érzékeli: a `_horgonyEllenorzes` nagyításkor lefelé, kicsinyítéskor
  // fölfelé lépteti, a képernyő-kép közben változatlan marad.
  //
  // Ez a metódus teszi a tudást KIOLVASHATÓVÁ: hányadik szinten állunk a
  // gyökerektől számolva (a VILÁG = -1, a gyökerek = 0, a gyerekeik = 1 …).
  // Erre épülhet később a szint kiírása vagy a szinthez kötött viselkedés.
  _horgonySzint() {
    let szint = 0;
    let id = this._horgony;

    for (let lepes = 0; lepes < 64; lepes++) {
      if (id === VILAG) return szint - 1;
      const cs = this._tar.get(id);
      if (!cs || !cs.szuloId) return szint;
      id = cs.szuloId;
      szint++;
    }
    return szint;
  }

  // ===== ALAPHELYZET =====
  // ===== KEZDŐ NÉZET BECSLÉSE (csak az első pakolás elindításához) =====
  // A gyökerek együttes TERÜLETE a legerősebb gyökér egységében: Σpont /
  // legerősebbPont. Ebből egy laza (0,5-es) kitöltéssel becsülhető a kiterjedés.
  // Ez SEHOL nem befolyásolja a végleges képet — az `_alaphelyzet` a MÉRT
  // kiterjedésre igazít utána —, csak arra kell, hogy a legelső pakolásnak
  // legyen mihez viszonyítania a lyuk képpont-méretét.
  _kezdoNezetBecslese(vilag) {
    const osszes = vilag.varolista.reduce((s, v) => s + v.pont, 0);
    const egyseg = vilag.legerosebbGyerekPont || 1;
    const becsultKiterjedes = Math.max(1, Math.sqrt(osszes / egyseg / 0.5));

    this._horgony = VILAG;
    this._nezet = {
      skala: (this._kepernyoMeret() * ILLESZTESI_ARANY) / becsultKiterjedes,
      eltolasX: (this._szelesseg || 0) / 2,
      eltolasY: (this._magassag || 0) / 2
    };

    console.log('SikidomModal._kezdoNezetBecslese', {
      gyokerek: vilag.varolista.length, becsultKiterjedes: becsultKiterjedes.toFixed(2)
    });
  }

  // @param {boolean} animalt - átmenettel álljunk-e rá (a megnyitáskor NEM:
  //   ott nincs honnan animálni, csak villogást okozna)
  _alaphelyzet(animalt = true) {
    console.log('SikidomModal._alaphelyzet - KEZDÉS', { animalt });

    this._horgony = VILAG;

    // A gyökér-szint tényleges kiterjedéséhez igazítunk, hogy az egész beférjen
    const kiterjedes = this._tar.get(VILAG)?.kulsoSugar || 1;

    const cel = {
      skala: (this._kepernyoMeret() * ILLESZTESI_ARANY) / kiterjedes,
      eltolasX: (this._szelesseg || 0) / 2,
      eltolasY: (this._magassag || 0) / 2
    };

    // Innentől van mihez mérni a kifelé nagyítás alsó határát
    this._alapSkala = cel.skala;

    if (animalt) {
      this._nezetAnimacio(cel, () => this._tennivalokFeldolgozasa());
    } else {
      this._nezet = cel;
      this._rajzolasKerese();
      // Az új nagyítás új lyuk-méretet jelent — hátha most még befér valami
      this._tennivalokFeldolgozasa();
    }

    console.log('SikidomModal._alaphelyzet - VÉGE');
  }

  // ===== AZ ÜRES MAG SUGARA KÉPPONTBAN =====
  // A képernyő kisebbik oldalának arányában (lásd `MAG_ATMERO_ARANY`), hogy
  // telefonon és nagy monitoron is ugyanúgy nézzen ki. Egyetlen helyen számoljuk,
  // mert három dolog függ tőle, és MIND a háromnak ugyanazt kell látnia:
  // a láthatóság, a részfa-metszés és a szaggatott kör kirajzolása.
  //
  // ===== SZINTENKÉNT ZSUGORODIK (Csaba, 2026-08-11) =====
  // „A hierarchia szintenkénti képernyő-fix üres magot is 1/20 méretre kell szabni."
  // UGYANAZZAL A HÁNYADDAL, amivel a síkidomok: a `SZINT_OSZTO` TERÜLETET oszt,
  // tehát a SUGÁR szintenként √20 ≈ 4,47-szeresével csökken. Enélkül a mag a
  // mélyebb szinteken aránytalanul nagy lenne — ott minden síkidom 4,47-szer
  // kisebb, a mag viszont változatlan maradt volna, és mindent elrejtene.
  //
  // A `melyseg` a HORGONYHOZ mért mélység. A horgony fölött (negatív) nem
  // nagyítjuk a magot — ott a 0. szint mérete a helyes.
  //
  // @param {number} melyseg - a csomópont mélysége a horgonyhoz képest
  _magSugarKeppontban(melyseg = 0) {
    const alap = (this._kepernyoMeret() * MAG_ATMERO_ARANY) / 2;
    const szint = Math.max(0, melyseg);
    return alap / Math.pow(Math.sqrt(SZINT_OSZTO), szint);
  }

  // ===== KELL-E MÉG ILLESZTENI? =====
  // Összeveti a mostani nagyítást azzal, amit a MÉRT kiterjedés kívánna. Amíg a
  // kettő érdemben eltér, a kezdő fázis nem zárulhat le — különben a spirál egy
  // része kilógna a képből (Csaba, 2026-08-09: „nem fért bele a teljes spirál").
  //
  // 1%-os tűrés: a lebegőpontos hajszálnyi eltérés miatt ne illesszünk örökké.
  _kezdoIllesztesKell() {
    const kiterjedes = this._tar.get(VILAG)?.kulsoSugar || 0;
    if (!(kiterjedes > 0)) return false;          // még nincs mit illeszteni

    const celSkala = (this._kepernyoMeret() * ILLESZTESI_ARANY) / kiterjedes;
    if (!(celSkala > 0) || !(this._nezet.skala > 0)) return false;

    return Math.abs(celSkala / this._nezet.skala - 1) > 0.01;
  }

  // ===== A KEZDŐ FÁZIS LEZÁRÁSA =====
  // Innentől az e-emberé a nézet: a gesztusok élnek, és automatikus illesztés
  // soha többé nem történik (csak az „illesztés" gombbal).
  _kezdoFazisLezarasa() {
    if (!this._kezdoFazis) return;

    this._kezdoFazis = false;
    if (this._kezdoFazisHatarido) {
      clearTimeout(this._kezdoFazisHatarido);
      this._kezdoFazisHatarido = null;
    }
    this._folyamatJelzo(false);

    const vilag = this._tar.get(VILAG);
    console.log('SikidomModal - KEZDŐ FÁZIS LEZÁRVA', {
      lerakott: vilag?.gyerekIdk.length ?? 0,
      kiterjedes: (vilag?.kulsoSugar ?? 0).toFixed(4),
      skala: this._nezet.skala.toFixed(4),
      kepernyoMeret: Math.round(this._kepernyoMeret())
    });
  }

  // ===== NÉZET-ÁTMENET (a koino_1.0 fitZoom-jának megfelelője) =====
  // A nagyítást MÉRTANI közepekkel interpoláljuk (a `skala` logaritmusán), mert a
  // nagyítás szorzó jellegű: lineárisan interpolálva a mozgás az elején rohanna,
  // a végén kúszna. Az eltolás lineáris, koszinuszos lágyítással.
  //
  // A horgony az animáció alatt is helyben marad (a `_rajzolas` úgyis ellenőrzi),
  // és mivel a horgonyváltás nem mozdítja a képet, az átmenet zökkenőmentes.
  //
  // @param {Object} cel - a cél-nézet { skala, eltolasX, eltolasY }
  // @param {Function} [kesz] - a végén meghívandó visszahívás
  _nezetAnimacio(cel, kesz) {
    if (this._illesztesAnimacio) cancelAnimationFrame(this._illesztesAnimacio);

    const kezdet = { ...this._nezet };
    const indulas = performance.now();

    // Ha a kiindulás értelmetlen (0 vagy negatív skála), ugorjunk azonnal
    if (!(kezdet.skala > 0) || !(cel.skala > 0)) {
      this._nezet = { ...cel };
      this._rajzolasKerese();
      kesz?.();
      return;
    }

    const lnKezdet = Math.log(kezdet.skala);
    const lnCel = Math.log(cel.skala);

    const lepes = (most) => {
      const t = Math.min(1, (most - indulas) / ILLESZTES_MS);
      const lagy = 0.5 - Math.cos(Math.PI * t) / 2;   // easeInOutSine

      this._nezet = {
        skala:    Math.exp(lnKezdet + (lnCel - lnKezdet) * lagy),
        eltolasX: kezdet.eltolasX + (cel.eltolasX - kezdet.eltolasX) * lagy,
        eltolasY: kezdet.eltolasY + (cel.eltolasY - kezdet.eltolasY) * lagy
      };
      this._rajzolasKerese();

      if (t < 1) {
        this._illesztesAnimacio = requestAnimationFrame(lepes);
        return;
      }

      this._illesztesAnimacio = null;
      this._nezet = { ...cel };     // pontosan a célon álljunk meg
      this._rajzolasKerese();
      kesz?.();
    };

    this._illesztesAnimacio = requestAnimationFrame(lepes);
  }

  // ===== HORGONYVÁLTÁS =====
  // Ha a nagyítás elmélyült, áthelyezzük a horgonyt — a képernyő-kép közben
  // változatlan marad (lásd sikidomHorgony.js). Egyetlen képkockán belül több
  // szintet is léphetünk (gyors görgetésnél).
  _horgonyEllenorzes() {
    for (let lepes = 0; lepes < 8; lepes++) {
      const cs = this._tar.get(this._horgony);
      if (!cs) break;

      const gyerekKeretek = cs.gyerekIdk
        .map(gid => this._tar.get(gid))
        .filter(Boolean)
        .map(gy => ({ id: gy.id, keret: { x: gy.relX, y: gy.relY, r: gy.relR } }));

      const vanSzulo = !!(cs.szuloId && this._tar.has(cs.szuloId));

      // A KÉPERNYŐ KÖZEPE — a lefelé váltás második feltételéhez (lásd
      // `horgonyValtasSzukseges`): csak abba a gyerekbe lépünk le, amelyiken
      // a képernyő közepe RAJTA van, vagyis amelyikbe tényleg belenagyítottak.
      const kepKozep = {
        x: (this._szelesseg || 0) / 2,
        y: (this._magassag || 0) / 2
      };

      const dontes = horgonyValtasSzukseges(
        this._nezet, this._kepernyoMeret(), gyerekKeretek, vanSzulo, kepKozep
      );
      if (!dontes) break;

      if (dontes.irany === 'le') {
        const gy = this._tar.get(dontes.gyerekId);
        this._nezet = horgonyValtasNezet(this._nezet, { x: gy.relX, y: gy.relY, r: gy.relR });
        this._horgony = gy.id;
      } else {
        const szKeret = szuloKeretben(this._tar, this._horgony);
        if (!szKeret) break;
        this._nezet = horgonyValtasNezet(this._nezet, szKeret);
        this._horgony = cs.szuloId;
      }
    }
  }

  // ===== LÁTHATÓ CSOMÓPONTOK =====
  // Bejárás a horgony fölött néhány szinttel kezdve, lefelé. A vágás KÉTSZERESEN
  // is helyes: a gyerek mindig kisebb a szülőjénél ÉS a szülőn belül van, ezért ha
  // a szülő túl kicsi vagy a látómezőn kívül esik, a leszármazottai is — a részfa
  // ott bátran levágható.
  _lathatoLista() {
    // 1. Kiindulás: néhány szinttel a horgony fölött (hogy a környezet is látsszon)
    let kiindulo = this._horgony;
    let keret = { x: 0, y: 0, r: 1 };

    // Hány szintet léptünk FÖLFELÉ? Ebből tudjuk a kiinduló csomópont mélységét a
    // horgonyhoz képest (negatív), és onnantól a bejárás szintenként növeli. A
    // mélységre a részletességi fokozat épül: a pozicionálási keret és a mag mérete.
    let felfeleLepes = 0;

    for (let i = 0; i < FELFELE_SZINTEK; i++) {
      const cs = this._tar.get(kiindulo);
      if (!cs || !cs.szuloId || !this._tar.has(cs.szuloId)) break;
      const sz = szuloKeretben(this._tar, kiindulo);
      if (!sz) break;
      keret = {
        x: keret.x + keret.r * sz.x,
        y: keret.y + keret.r * sz.y,
        r: keret.r * sz.r
      };
      kiindulo = cs.szuloId;
      felfeleLepes++;
    }

    // 2. Lefelé bejárás, vágásokkal
    const lathatoak = [];
    const betoltendok = [];
    const pakolandok = [];
    const magok = [];
    const sor = [{ id: kiindulo, keret, melyseg: -felfeleLepes }];

    while (sor.length > 0 && lathatoak.length < MAX_RAJZOLT) {
      const elem = sor.shift();
      const cs = this._tar.get(elem.id);
      if (!cs) continue;

      const kep = kepernyore(this._nezet, elem.keret);

      // A kiinduló csomópontot mindig kibontjuk (ő a bejárás gyökere)
      const kiindulopont = elem.id === kiindulo;

      if (!kiindulopont && !this._latomezobenVan(kep)) continue;

      if (cs.id !== VILAG) {
        lathatoak.push({ cs, kep });
        cs.utoljaraLatva = this._kepkocka;
      }

      // --- GYEREKEK ÁTVIZSGÁLÁSA: AZ ÜRES MAG DÖNT, NEM A MÉRET ---
      // Csaba modellje (2026-08-09). Korábban itt egy MÉRET-küszöb állt: egy
      // síkidom akkor látszott, ha a képernyőn elért 24 képpontot. Ezzel az volt a
      // baj, hogy nagyításkor VERSENYFUTÁS indult — a középső üresség azonnal
      // tágult, a benne lévők viszont csak fokozatosan nőttek a küszöb fölé, és
      // ezt a versenyt a nagyítás nyerte. Csaba szava: „a nagyítás gyorsabban
      // történik, mint ahogy betöltenék az űrt az előbukkanó síkidomok."
      //
      // MOSTANTÓL a HELY dönt: a szülő közepén van egy KÉPPONTBAN ÁLLANDÓ üres mag,
      // és ami azon kívülre esik, az látszik — MÉRETTŐL FÜGGETLENÜL. Mivel a mag
      // képpontban nem változik, nagyításkor sem tud tágulni: nincs miért futni.
      //
      // ⚠️ EZ CSAK RAJZOLÁSI SZABÁLY. A helyek továbbra is egyben, előre, bentről
      // kifelé számolódnak — a pakoló mit sem tud a magról. Ezért nem hozza vissza
      // a 2026-08-08-i mag bajait (nem szorítja kifelé a később érkezőket).
      //
      // A REJTÉS SZABÁLYA: a KÖZÉPPONT esik-e a magba (Csaba választása) — így a
      // mag pereme szaggatott, a síkidomok félig belelógnak, az előbukkanás
      // folyamatos. EGY KIKÖTÉSSEL: aki már NAGYOBB a magnál, az akkor is látszik,
      // ha a közepén ül. Enélkül a legbelső síkidom — ami épp a középpontban van —
      // sosem bukkanna elő, akármekkorára nő.
      // A mag mérete ANNAK a szintnek szól, amelyik épp a képernyőt uralja: a
      // horgony gyerekeinél a teljes méret (31 px), egy szinttel lejjebb ennek
      // √20-ad része. Ezért a SZÜLŐ mélységével számolunk, nem a gyerekekével.
      const magSugarPx = this._magSugarKeppontban(elem.melyseg);
      let magonKivuli = 0;              // hány gyerek látszik a magon kívül
      let magbanRejtett = 0;            // hány gyereket TAKAR EL a kijelző-mag

      // ===== A VALÓDI ÜRESSÉG KÉPPONTBAN (nem a kijelző-mag!) =====
      // Csaba, 2026-08-11: „a képernyő-fix mag zsugorodása ne legyen hatással a
      // szövegre és a koppintásra." A kijelző-mag képpontban állandó, ezért befelé
      // nagyítva ADAT-TÉRBEN zsugorodik, és egy ponton BELECSÚSZIK a pakolási lyukba.
      // Ha a feliratot ahhoz kötnénk, egy apró körbe szorulna egy hatalmas üres
      // közép kellős közepén.
      //
      // Ezért mindent, amit az e-ember LÁT és amire KOPPINT, a MÉRT ürességhez
      // kötünk: `magSugarRel` a legbelső síkidom pereméig mért lyuk, ami a pakolási
      // magból ered, és nagyítással EGYÜTT NŐ. A kettő közül a nagyobbik a helyes:
      // az a kör, amin belül tényleg nem látszik semmi.
      const mertUresPx = Number.isFinite(cs.magSugarRel)
        ? this._nezet.skala * elem.keret.r * cs.magSugarRel
        : 0;
      const uresSugarPx = Math.max(magSugarPx, mertUresPx);

      // ===== A KIJELZŐ-MAGNAK CSAK AKKOR VAN DOLGA, HA VÁRUNK MÉG VALAMIRE =====
      // Csaba, 2026-08-11: „a képernyőre fixált üres mag akkor is megvan, amikor az
      // összes testvér lent van az adott horgonyponttól. Ettől még az egy entitásos
      // síkidomokban is csak akkor bukkan elő a gyerek, ha a szaggatott kör kisebb
      // lesz nála."
      //
      // Igaza volt. A rejtési szabály eddig FELTÉTEL NÉLKÜL futott: sosem kérdezte
      // meg, maradt-e még le nem töltött testvér. Egy láncszemnél viszont az
      // egyetlen gyerek a szülő PONTOS középpontjába kerül (nincs pakolási lyuk,
      // mert nincs mire várni), tehát `tavolsagPx = 0` — és így a kijelző-mag
      // elrejtette, amíg túl nem nőtte a ~31 képpontos kört. Fölösleges késleltetés.
      //
      // MIÉRT VAN EGYÁLTALÁN A KIJELZŐ-MAG (2026-08-09): hogy nagyításkor ne legyen
      // VERSENYFUTÁS — a középső üresség ne tudjon gyorsabban tágulni, mint ahogy az
      // előbukkanó síkidomok kitöltik. Ha viszont MÁR MINDEN testvér lent van, nincs
      // mivel versenyezni: nem jön több síkidom, tehát nincs mit elrejteni.
      //
      // Ez egyben helyreállítja a 2026-08-10-i modell ígéretét is: „ha nincs több
      // le nem töltött testvér → nincs lyuk, és a legkisebb síkidom a középpontban,
      // LÁTHATÓAN. Ez maga az üzenet, hogy nincs több tartalom." Eddig ezt a
      // pakolás teljesítette, a rajzolás viszont elrontotta.
      //
      // (Csaba felvetése, hogy a gyökereknél maradt betöltetlen tartalom „öröklődött
      // volna tovább a többi horgonyon": ez nem így van — a feltétel csomópontonként
      // külön dől el, nincs átöröklés. Az ok kizárólag az volt, hogy a rejtési
      // szabály meg sem kérdezte.)
      //
      // ===== KÉT ÜZEMMÓD (Csaba, 2026-08-11) =====
      //   A) VAN még nem pozicionált testvér → van pakolási lyuk ÉS van kijelző-mag,
      //      és a MAG dönti el, mi látszik (a középpont beleesik-e).
      //   B) MINDEN pozicionálva → nincs egyik mag sem, és a MINIMUM MÉRET dönt.
      // A kettő együtt jön és együtt megy: ugyanaz a feltételük.
      const magnakVanDolga = this._vanNemPozicionaltTestver(cs);

      for (const gid of cs.gyerekIdk) {
        const gy = this._tar.get(gid);
        if (!gy) continue;

        const gyKeret = {
          x: elem.keret.x + elem.keret.r * gy.relX,
          y: elem.keret.y + elem.keret.r * gy.relY,
          r: elem.keret.r * gy.relR
        };

        // A gyerek helye és mérete a SZÜLŐ középpontjához mérve, képpontban
        const tavolsagPx = this._nezet.skala * elem.keret.r * Math.hypot(gy.relX, gy.relY);
        const gyerekSugarPx = this._nezet.skala * gyKeret.r;

        // A magban ülő, a magnál kisebb síkidomot nem rajzoljuk — és a részfáját
        // sem járjuk be (a gyerekei nála is kisebbek, és rajta belül vannak)
        //
        // ⚠️ EGY KIVÉTEL: A MEGJELÖLT MINDIG LÁTSZIK (Csaba, 2026-08-11).
        // A lapozás után a megjelöltet a képernyő KÖZEPÉRE állítjuk — ha közben az
        // utolsó adag is megérkezett, akkor nincs több pakolási lyuk, tehát a
        // megjelölt a szülő PONTOS középpontjába kerül. Ott viszont pont rajta ül a
        // kijelző-mag, és elrejtené: az e-ember egy fehér foltot látna a megjelölt és
        // a határjelölő gyűrű helyén. Mérve 2026-08-11-én: kijelző-mag 27,7 px,
        // a megjelölt 7,4 px — biztosan elrejtve.
        //
        // Ez ugyanaz a szabály, mint a feliratnál és a koppintásnál: a képernyőhöz
        // kötött mag nem szólhat bele abba, amit szándékosan mutatunk.
        if (magnakVanDolga) {
          // --- A) A MAG DÖNT ---
          if (gid !== this._jeloltId &&
              tavolsagPx < magSugarPx && gyerekSugarPx <= magSugarPx) {
            magbanRejtett++;
            continue;
          }
        } else {
          // --- B) A MINIMUM MÉRET DÖNT (Csaba, 2026-08-11) ---
          // Ha már mindenki helyet kapott, nincs mire várni, tehát nincs mag sem.
          // Ilyenkor az dönt, hogy a síkidom egyáltalán LÁTHATÓ-e: a minimum méret
          // KÉPERNYŐ-ÁLLANDÓ, és SZÁNDÉKOSAN nem osztjuk 20-szal szintenként —
          // Csaba szava: „a minimum méret átível a hierarchia szinteken".
          //
          // ⚠️ A HORGONY SZINTJÉN NEM SZŰRÜNK (Csaba, 2026-08-11, böngészős próba
          // után): „a horgony szintjén még se használjuk a minimum méret korlátot a
          // megjelenítéshez." Ez az a szint, ami a képernyőt uralja — ott MINDEN
          // testvér látszik, akármilyen apró. A minimum méret csak a MÉLYEBB
          // szinteken szűr, ahol amúgy is csak ízelítőt mutatunk (250, majd 12).
          //
          // Enélkül a horgony gyenge testvérei eltűnnének, pedig épp azt a szintet
          // nézed — és a mai adatban a gyökerek nagy része egypontos, tehát szinte
          // az egész mező eltűnt volna.
          const minMeretSzur = elem.melyseg > 0;
          if (minMeretSzur && gid !== this._jeloltId &&
              2 * gyerekSugarPx < MIN_KEP_ATMERO) continue;
        }

        magonKivuli++;

        sor.push({ id: gid, keret: gyKeret, melyseg: elem.melyseg + 1 });
      }

      // --- A KÖZÉPSŐ LYUK: A FIX MAG ---
      // 2026-08-09 óta ez NEM a mért üresség (`magSugarRel`), hanem a rajzolási
      // szabály maga: az a képpontban állandó kör, amin belül nem mutatunk
      // síkidomot. Így amit az e-ember lát, pontosan az, ami a szabály — nem egy
      // külön számított, esetleg eltérő kör.
      //
      // Csak akkor rajzoljuk ki, ha a szülőnek VAN a magon kívül eső gyereke:
      // különben egy üres csomópont közepére is odakerülne a szaggatott kör.
      // A SZAGGATOTT KÖR IS CSAK AKKOR, HA VÁRUNK MÉG VALAMIRE (Csaba, 2026-08-11).
      // Ugyanaz az indok, mint a rejtésnél: ha minden testvér lent van, a közép nem
      // „üres, mert még jön valami", hanem egyszerűen ott ül a legkisebb síkidom.
      // Ilyenkor a szaggatott kör félrevezető — azt ígérné, hogy van még mit várni.
      if (magonKivuli > 0 && magnakVanDolga) {
        if (magSugarPx * 2 >= MAG_MIN_ATMERO) {
          // ===== A „TOVÁBBI TARTALMAK" AJÁNLAT FELTÉTELE (Csaba, 2026-08-10) =====
          // „amikor a legbelső, már pozicionált síkidom is előbukkant" — ezt nem kell
          // külön nyilvántartani: pontosan azt jelenti, hogy a KIJELZŐ-MAG már
          // EGYETLEN síkidomot sem takar el (`magbanRejtett === 0`). Ilyenkor a
          // közepén már csak a PAKOLÁSI LYUK van, tehát befelé nagyítva sem jönne elő
          // több — a következő adagot le kell tölteni.
          //
          // ⚠️ A FELTÉTEL MONOTON: befelé nagyítva egyre kevesebbet takar a kijelző-mag,
          // tehát ami egyszer megjelent, az NEM tűnhet el a további nagyítástól
          // (Csaba, 2026-08-11). Ezért NINCS benne horgony-feltétel: a horgony
          // nagyításkor lejjebb lép, és az ajánlat ettől eltűnt volna a szem elől.
          // Zaj nem lesz belőle — a „senki sincs elrejtve" állapotot egyszerre nagyon
          // kevés csomópont teljesíti, és mindegyik ajánlat a SAJÁT közepén ül, tehát
          // a koppintási célok akkor sem esnek egybe, ha többen is látszanak.
          const tovabbiTartalom = magbanRejtett === 0 && this._vanMegBetoltetlen(cs);

          magok.push({
            kepX: kep.kepX,
            kepY: kep.kepY,
            kepSugar: magSugarPx,          // a KIJELZŐ-mag — csak a régi súgóhoz kell
            vilag: cs.id === VILAG,
            tovabbiTartalom,
            uresSugarPx: uresSugarPx,
            // A koppintáshoz: melyik csomópont ajánlata ez, és mekkora a csomópont
            // képernyő-sugara (ebből számoljuk a megjelölt testvér látszó méretét).
            csomopontId: cs.id,
            szuloKepSugar: this._nezet.skala * elem.keret.r
          });
        }
      }

      // ===== BETÖLTÉS-IGÉNY: A FÓKUSZ MINDENT KAP, A TÖBBI CSAK A KÜSZÖBIG =====
      // Csaba modellje (2026-08-09): „a pozíciók kiszámítása legyen meg előre,
      // mondjuk 10000, de a megjelenítés ugyanúgy használja a min területet."
      // Vagyis a POZÍCIÓ-SZÁMÍTÁS nem függhet a láthatóságtól — az csak rajzolási
      // kérdés. Ha a letöltést a láthatósági küszöb vezérli, akkor adagokban
      // érkezik minden, és minden adagnál újrapakolunk: mérve 3000 testvérnél az
      // első körben 73 jött le 3000 helyett, és 10-szer rendeződött át a kép.
      //
      // MIÉRT NEM KAP MINDENKI MÉLY ELŐRETÖLTÉST: mert egyszerre sok csomópont
      // látszik. Ha mindegyiknek 10 000 gyereket kérnénk le, 100 látható
      // csomópontnál egymillió sor lenne — miközben egy 24 képpontos síkidom
      // gyerekei úgyis 5 képpont alatt maradnának, tehát láthatatlanok.
      //
      // A SZABÁLY: a HORGONY — az a csomópont, amibe épp belenagyítottál, és ami
      // a képernyőt kitölti — a küszöbtől függetlenül megkapja az `ELORETOLTES_DARAB`
      // testvérét, egyben. Mindenki más marad a küszöb-vezérelt betöltésnél, ami
      // magától a mérethez skálázódik.
      //
      // A LERAKÁS-IGÉNY IS ITT DŐL EL: csak akkor pakolunk, ha a gyűjtés VÉGE.
      let kellBetoltes = false;

      if (cs.vanGyereke && !cs.betoltesFut) {
        // A KÉRÉSRE töltő csomópont ugyanúgy viselkedik, mint a horgony: küszöb
        // nélkül, a kurzortól folytatva kapja a következő adagot (Csaba, 2026-08-11).
        // ===== A KERET VEZÉRLI A BETÖLTÉST IS (Csaba, 2026-08-11) =====
        // Csaba böngészős találata: „minden közelítéskor újrarendezi, pedig elvileg
        // pozicionált 250-et, és csak horgonyváltáskor kellett volna újrapakolni."
        //
        // MÉRVE (2026-08-11): a mező VÁLTOZATLAN mélységben (m1) egy másodpercen
        // belül kétszer pakolt újra — `gy 36→54`, majd `gy 54→78` —, pedig 78 messze
        // a 250-es kereten belül van. Az ok: a keret eddig CSAK a pakolást
        // korlátozta, a betöltést nem. A betöltés küszöb-vezérelt maradt, tehát
        // közelítés közben a küszöb süllyedt, újabb adag érkezett, és MINDEN érkezés
        // újrapakolta az egész csomópontot. A keret sosem telt be — a szám nem
        // korlátozott, a csordogálás viszont folyamatosan újrarendezett.
        //
        // A SZABÁLY MÁSIK FELE tehát: a keretnyi testvért EGYSZERRE kell megszerezni.
        // Egy szint, amint a legnagyobb testvére elérné a minimum méretet, küszöb
        // NÉLKÜL kéri le a keretnyi testvért — pontosan úgy, ahogy a horgony teszi —,
        // és utána nem tölt többet, amíg a horgony nem vált. Egy szint életében így
        // egy betöltés és egy pakolás van, nem tucatnyi.
        const keretnyiKell = elem.melyseg > 0 &&
          2 * kep.kepSugar * this._legnagyobbGyerekRelR(cs) >= MIN_KEP_ATMERO;

        const fokuszban = cs.id === this._horgony || cs.tovabbiKert || keretnyiKell;

        // A fókuszban lévőnek NINCS küszöbe: a rangsor elejétől kérünk mindent,
        // amíg az előretöltési korlátot el nem érjük.
        const kuszob = fokuszban ? 0 : this._pontKuszob(cs, kep.kepSugar);

        // Ugyanaz a kérdés, mint amitől a PAKOLÁSI MAG léte függ — ezért közös
        // segédből jön (`_vanMegBetoltetlen`), nem két külön másolatból.
        const vanMegBetoltetlen = this._vanMegBetoltetlen(cs);

        // ===== A LETÖLTÉS FÉKJE: DARABSZÁM, NEM TERÜLET (2026-08-09) =====
        // Itt korábban a TERÜLET-ALAPÚ fék állt (`BETOLTESI_TARTALEK`): amíg a
        // várólistán elég friss anyag várt a képernyő kitöltéséhez, nem kértünk
        // többet. Az új modellben ez ÁRTANA — ha a fék megállítaná a gyűjtést, a
        // lerakás-igény azonnal teljesülne, és RÉSZLEGESEN pakolnánk. Mérve épp ez
        // borítja fel a rendet (a méret-tizedek 2,59 · 2,46 · 2,32 · … lesznek).
        const mennyiVanMar = cs.gyerekIdk.length + cs.varolista.length;

        // EGY KOPPINTÁS = EGY ADAG. Amint a kért adag megérkezett (elértük a
        // plafont), a kérés-mód lezárul, és a következő adaghoz új koppintás kell.
        // Enélkül a csomópont VÉGLEG küszöb nélküli maradna: a méret szerinti
        // visszaszedés bármikor a plafon alá viheti a darabszámot, és onnantól
        // magától lapozna tovább — pedig ez az e-ember döntése.
        if (cs.tovabbiKert && mennyiVanMar >= cs.betoltesiPlafon) cs.tovabbiKert = false;

        // A plafon már NEM az állandó, hanem a csomópont sajátja: a „további
        // tartalmak" koppintás adagonként emeli (lásd `betoltesiPlafon`).
        //
        // A MÉLYEBB SZINTEKEN a POZICIONÁLÁSI KERET a szűkebb plafon: fölösleges
        // 5 000-et letölteni oda, ahol úgyis csak 250 (vagy 12) kap helyet. A kettő
        // közül a kisebbik érvényes — így a szint egyetlen menetben megkapja a
        // keretnyi testvért, és utána MEGÁLL.
        const plafon = Math.min(cs.betoltesiPlafon, pozicionalasiKeret(elem.melyseg));

        kellBetoltes = vanMegBetoltetlen && mennyiVanMar < plafon &&
          (fokuszban || kuszob < cs.betoltottKuszob);

        if (kellBetoltes) {
          betoltendok.push({ id: cs.id, kuszob, suly: kep.kepSugar });
        }
      }

      // --- LERAKÁS-IGÉNY: CSAK A GYŰJTÉS VÉGÉN ---
      // Ez a nézet legfontosabb időzítése (Csaba modellje, 2026-08-09). Amíg jön
      // még anyag, NEM pakolunk: előbb összegyűjtjük, amit a küszöb és az
      // előretöltési korlát enged, és csak azután rakjuk le, EGYETLEN menetben.
      //
      // MIÉRT: mag nélkül, adagonként pakolva a rend teljesen felborul — a
      // második adag (csupa kisebb) a középpontba kívánkozna, de ott már ül az
      // első adag, tehát kifelé szorul. Mérve a méret-tizedek 2,59 · 2,46 · 2,32
      // · … lettek, vagyis a legkisebbek kerültek legkívülre. Egyszerre pakolva
      // ugyanez az adat 0,094 · 0,179 · 0,267 · … — tökéletesen monoton.
      //
      // A `betoltesFut` is kizáró ok: egy éppen úton lévő adag pont az a „kisebb
      // testvér", akinek a középpont kellene.
      // --- VISSZAHOZATAL: kicsinyítéskor a visszaszedettek újra beférnek ---
      // A várólistára kerülnek, tehát a lentebbi lerakás-igény veszi fel őket.
      if (cs.visszaszedettek.length > 0) this._visszahozatal(cs, kep.kepSugar);

      // ===== EGY SZINT CSAK AKKOR KEZD POZICIONÁLNI, HA MÁR LÁTSZANA =====
      // Csaba, 2026-08-11: „az egy hierarchia szinttel lejjebbi gyerekek akkor
      // pozicionáljanak csak, ha a legnagyobb testvér eléri a minimum méretet."
      // Enélkül a mélyebb szintek fölöslegesen pakolnának olyan síkidomokat, amiket
      // úgysem rajzolunk ki — és minden újabb adagnál újra.
      //
      // A HORGONY (és a fölötte lévők) KIVÉTEL: ott mindig pakolunk, mert az a
      // szint tölti ki a képernyőt.
      const legnagyobbGyerekPx = 2 * kep.kepSugar * this._legnagyobbGyerekRelR(cs);
      const eleriAMinimumot = elem.melyseg <= 0 || legnagyobbGyerekPx >= MIN_KEP_ATMERO;

      if (cs.varolista.length > 0 && !cs.betoltesFut && !kellBetoltes && eleriAMinimumot) {
        pakolandok.push({ id: cs.id, kep, melyseg: elem.melyseg });
      }
    }

    return { lathatoak, betoltendok, magok, pakolandok };
  }

  // A látómező a képernyő + LATOMEZO_TARTALEK arányú keret. Ami ezen kívül esik,
  // azt nem rajzoljuk (és a takarítás előbb-utóbb el is engedi).
  //
  // KIKAPCSOLVA (KEPERNYON_KIVULIEK_ELTUNTETESE = false): mindig igazat adunk,
  // tehát semmi nem marad ki a képernyő-pozíciója miatt.
  _latomezobenVan(kep) {
    if (!KEPERNYON_KIVULIEK_ELTUNTETESE) return true;

    const tx = this._szelesseg * LATOMEZO_TARTALEK;
    const ty = this._magassag * LATOMEZO_TARTALEK;
    const bal = -tx, jobb = this._szelesseg + tx;
    const fent = -ty, lent = this._magassag + ty;

    const legkozelebbiX = Math.max(bal, Math.min(jobb, kep.kepX));
    const legkozelebbiY = Math.max(fent, Math.min(lent, kep.kepY));
    const tavolsag = Math.hypot(kep.kepX - legkozelebbiX, kep.kepY - legkozelebbiY);
    return tavolsag <= kep.kepSugar;
  }

  // ===== RAJZOLÁS =====
  _rajzolasKerese() {
    if (this._rajzolasKeres) return;
    this._rajzolasKeres = true;
    requestAnimationFrame(() => {
      this._rajzolasKeres = false;
      this._rajzolas();
    });
  }

  // A rajzolás CSAK RAJZOL: nem tölt be és nem pakol. Azt a nagyítás VÉGÉN futó
  // `_tennivalokFeldolgozasa` végzi — így a kép nem ugrál görgetés közben, és nem
  // számolunk fölöslegesen minden képkockán.
  //
  // Maga a rajzolás a `sikidomRajzolo.js`-ben van; itt csak a MENETEK SORRENDJE
  // dől el (a Canvas nem ismer z-indexet: ami később kerül fel, az van fölül).
  // A képkockánként változó állapotot EGYSZER adjuk át, a menetek előtt.
  _rajzolas() {
    if (!this.kontextus || !this._szelesseg) return;

    this._kepkocka++;
    this._horgonyEllenorzes();

    const { lathatoak, magok } = this._lathatoLista();

    const c = this.kontextus;
    c.clearRect(0, 0, this._szelesseg, this._magassag);

    this.rajzolo.kepkockaKezdese({
      kepernyoMeret:  this._kepernyoMeret(),
      aktualisId:     this.aktualisEntitasId,
      kivalasztottId: this._kivalasztottId,
      jeloltId:       this._jeloltId
    });

    // A NAGYOKAT előbb, hogy a beágyazott kicsik rájuk kerüljenek
    lathatoak.sort((a, b) => b.kep.kepSugar - a.kep.kepSugar);
    for (const { cs, kep } of lathatoak) this.rajzolo.alakzatRajzolasa(cs, kep);

    // Az üres magok a síkidomok FÖLÖTT, de a feliratok ALATT
    for (const mag of magok) this.rajzolo.uresMagRajzolasa(mag);

    // Feliratok és mellék-ikonok külön menetben, hogy semmi ne takarja őket
    for (const { cs, kep } of lathatoak) this.rajzolo.cimkeRajzolasa(cs, kep);
    for (const { cs, kep } of lathatoak) this.rajzolo.mellekIkonokRajzolasa(cs, kep);

    // A határjelölő MINDEN fölé: ő mutatja, hol maradt abba az előző lepakolás
    if (this._jeloltId) {
      for (const { cs, kep } of lathatoak) this.rajzolo.hatarjeloloRajzolasa(cs, kep);
    }

    this._utolsoLathatoak = lathatoak;
    // A koppintás ebből dönti el, hogy „további tartalmak"-ra kattintottak-e
    this._utolsoMagok = magok;

    if (this._kepkocka % TAKARITAS_KEPKOCKANKENT === 0) {
      takaritas({
        tar: this._tar, horgonyId: this._horgony,
        kepkocka: this._kepkocka, gyokerId: VILAG
      });
    }
  }

  // ===== ÁLLAPOT-NAPLÓ A ZOOM VÉGÉN =====
  // Felelősség: EGYETLEN sorban megmondani, MIÉRT üres a kép közepe. Három
  // versengő magyarázat van, és képernyőképből nem lehet köztük dönteni:
  //
  //   1. „nincs mit lerakni"  → `varolistan` = 0 ÉS `hatra` ≈ 0
  //   2. „le van rakva, csak nem rajzoljuk" → `lerakott` >> `rajzolt`
  //   3. „még nincs letöltve" → `hatra` nagy, `varolistan` = 0
  //
  // A `magKep` / `kepernyoMeret` arány mutatja, mekkora részét foglalja a mag a
  // képernyőnek — ha ez közelítéskor NŐ, a letöltés nem tart lépést a zoommal.
  _allapotNaplo() {
    // CSAK A HORGONYRÓL naplózunk. Korábban itt egy `?? this._tar.get(VILAG)`
    // visszaesés állt, a képernyő-sugarat viszont mindkét ágon a `skala`-nak vette
    // — az pedig CSAK a horgonyra igaz (a horgony kerete definíció szerint 1
    // sugarú). A VILÁG-ra esve tehát rossz számokat írtunk volna ki; inkább nem
    // írunk ki semmit.
    const cs = this._tar.get(this._horgony);
    if (!cs) return;

    // A horgony képernyő-sugara: a kerete 1 sugarú, tehát ez maga a skála
    const kepSugar = this._nezet.skala;

    const osszes = cs.osszesGyerekPont || 0;
    const helyezett = cs.helyezettPont || 0;
    const hatra = Math.max(0, osszes - helyezett);

    // Hány gyereke van lerakva, és ezek közül hányat rajzolunk ki ténylegesen?
    let rajzolt = 0;
    for (const gid of cs.gyerekIdk) {
      const gy = this._tar.get(gid);
      if (!gy) continue;
      // AZ ÚJ SZABÁLY SZERINT: a magon kívül esik-e (a horgony kerete 1 sugarú,
      // tehát a szülő képernyő-sugara maga a skála)
      const tavolsagPx = kepSugar * Math.hypot(gy.relX, gy.relY);
      const gyerekSugarPx = kepSugar * gy.relR;
      const magSugarPx = this._magSugarKeppontban();
      if (!(tavolsagPx < magSugarPx && gyerekSugarPx <= magSugarPx)) rajzolt++;
    }

    // A KÖVETKEZŐ lerakásnál érvényes PAKOLÁSI MAG. Ugyanazt a segédet hívjuk, mint
    // az `_ujrapakolas` — így a napló nem egy külön képlet szerint számol, hanem
    // pontosan azt mutatja, ami a lerakáskor történni fog.
    //
    // A sort a már lerakott gyerekekből ÉS a várólistán állókból rakjuk össze,
    // ugyanúgy, ahogy az `_ujrapakolas` teszi.
    const soruk = [];
    for (const gid of cs.gyerekIdk) {
      const gy = this._tar.get(gid);
      if (gy) soruk.push({ id: gid, sugar: gy.relR });
    }
    for (const v of cs.varolista) soruk.push({ id: v.id, sugar: v.relR ?? 0 });
    const magRel = this._pakolasiMagSugar(cs, soruk);

    // A MÉRT lyuk (amit az e-ember lát) és a SZÁMOLT mag (amit fenntartunk) két
    // külön szám — ha eltérnek, az önmagában is magyarázat.
    const mertMag = Number.isFinite(cs.magSugarRel) ? cs.magSugarRel : null;

    console.log('SikidomModal - ÁLLAPOT', {
      csomopont: cs.id,
      lerakott: cs.gyerekIdk.length,
      rajzolt,                                   // ha << lerakott: túl kicsik
      varolistan: cs.varolista.length,           // ha > 0: a lerakás akadt el
      hatraPont: Math.round(hatra),              // ha nagy: még nincs letöltve
      osszesPont: Math.round(osszes),
      hatraAranya: osszes > 0 ? (hatra / osszes * 100).toFixed(1) + '%' : '–',
      magRel: magRel.toFixed(4),
      magKep: Math.round(magRel * kepSugar * 2),          // a mag ÁTMÉRŐJE képpontban
      mertMagKep: mertMag === null ? '–' : Math.round(mertMag * kepSugar * 2),
      kepernyoMeret: Math.round(this._kepernyoMeret()),
      betoltesFut: cs.betoltesFut,
      betoltottKuszob: Number.isFinite(cs.betoltottKuszob)
        ? cs.betoltottKuszob.toFixed(2) : '∞',
      mostiKuszob: this._pontKuszob(cs, kepSugar).toFixed(2)
    });
  }

  // ===== A NAGYÍTÁS VÉGE =====
  // Minden nagyítás újraindítja az időzítőt; a munka csak akkor indul el, amikor
  // ZOOM_VEGE_MS ideje nem történt semmi. Csaba kérése: „csak a zoom végén
  // reagáljon a program".
  _zoomVegeUtemezes() {
    clearTimeout(this._zoomVegeIdozito);
    this._zoomVegeIdozito = setTimeout(() => {
      this._zoomVegeIdozito = null;
      this._tennivalokFeldolgozasa();
    }, ZOOM_VEGE_MS);
  }

  // ===== TENNIVALÓK: LERAKÁS, MAJD BETÖLTÉS =====
  // Először azt rakjuk le, ami MÁR itt van (a várólistáról) — hátha a nagyítás
  // felszabadított annyi helyet, hogy letöltés nélkül is bővül a kép. Csak utána
  // kérünk újat a backendtől.
  _tennivalokFeldolgozasa() {
    if (!this.kontextus || !this._szelesseg) return;

    // KIPARKOLÁS ELSŐKÉNT: ha kifelé jövet egy parkolt ős visszakerült a
    // folyosóba, a készletét EGYBEN visszaadjuk — még a lerakás előtt, hogy a
    // most következő pakolás már a TELJES sorból dolgozzon (csak úgy kapjuk
    // vissza pontosan a régi helyeket).
    let valtozott = kiparkolas(this._tar, this._horgony);

    const { betoltendok, pakolandok } = this._lathatoLista();
    this._allapotNaplo();

    for (const p of pakolandok) {
      if (this._ujrapakolas(this._tar.get(p.id), p.kep, p.melyseg)) valtozott = true;
    }

    // VISSZASZEDÉS a nagyítás végén: a túlnőtt testvéreket a sorrend végéről
    // elengedjük (részfástul). Ez a lerakás UTÁN fut, hogy a most érkezettek is
    // benne legyenek a mérlegelésben.
    if (visszaszedes({
      tar: this._tar,
      horgonyId: this._horgony,
      nezet: this._nezet,
      kepernyoMeret: this._kepernyoMeret()
    })) valtozott = true;

    // ŐS-SÖPRÉS: a folyosón kívüli szintek elengedése, MÉLYSÉG szerint. A
    // visszaszedés UTÁN fut, hogy a két szabály ne dolgozzon ugyanazon a szinten.
    if (osSopres(this._tar, this._horgony)) valtozott = true;

    // ===== A KEZDŐ FÁZIS LEZÁRÁSA =====
    // Akkor vagyunk készen, ha SEMMI nincs folyamatban: nem fut letöltés, nincs
    // mit kérni, és a nézet már a mért kiterjedésre van illesztve.
    if (this._kezdoFazis) {
      const nyugalom = this._futoBetoltesek === 0 && betoltendok.length === 0;

      if (nyugalom) {
        // Illeszt-e még valamit? Az illesztés megváltoztatja a nagyítást, az pedig
        // új küszöböt jelent — ezért addig ismételjük, amíg a skála be nem áll.
        // (Az `_alaphelyzet` a végén maga hívja újra ezt a metódust.)
        // REKURZIÓ-KORLÁT: az `_alaphelyzet` a végén újra ide hív. Rendes esetben
        // egy-két menet után beáll a skála, de ha az adat menet közben nőne, ne
        // pörögjünk vég nélkül — a zárolás feloldása fontosabb a tökéletes
        // illesztésnél.
        this._illesztesMelyseg = (this._illesztesMelyseg ?? 0) + 1;

        if (this._illesztesMelyseg <= 8 && this._kezdoIllesztesKell()) {
          this._alaphelyzet(false);
          this._illesztesMelyseg--;
          return;
        }
        this._illesztesMelyseg--;

        this._kezdoFazisLezarasa();
      }
    }

    // ===== FÓKUSZ A MEGJELÖLTRE — CSAK AKKOR, HA A TELJES ADAG MEGÉRKEZETT =====
    // Csaba, 2026-08-11: „szeretném, ha a kijelölt síkidom fókuszban lenne a
    // lepakolás után, tehát a képernyő közepén."
    //
    // ⚠️ EZ VOLT AZ ELSŐ VÁLTOZAT HIBÁJA: az `_ujrapakolas`-ban fókuszáltam, az
    // viszont a kért adag alatt SOKSZOR lefut — az adag 150-esével, kb. 67 körben
    // érkezik. Így az ELSŐ 150 után fókuszáltunk, aztán még ~9 850 síkidom jött,
    // mindegyik újrapakolással, és a nézet ott maradt, ahol volt. Csaba tünete:
    // „a teljes spirálon kívülre kerültem."
    //
    // A feltételt SZÁNDÉKOSAN a lapozott csomópontra szűkítjük, nem globális
    // csendet várunk: más csomópontok (pl. a látható gyökerek gyerekei) folyamatosan
    // kérhetnek adatot, és akkor a fókusz sosem következne be.
    //
    // Három dolog kell, mind a LAPOZOTT csomópontra: nem fut rajta letöltés, nem is
    // várunk rá továbbit, és a várólistája üres (minden megérkezett ÉS le van rakva).
    if (this._jeloltHelyzet) {
      const szuloId = this._jeloltHelyzet.szuloId;
      const szulo = this._tar.get(szuloId);
      const varMegRa = betoltendok.some(b => b.id === szuloId);

      if (szulo && !szulo.betoltesFut && !varMegRa && szulo.varolista.length === 0) {
        this._fokuszAMegjeloltre();
      }
    }

    // Betöltések indítása (a legnagyobbak előbb)
    betoltendok.sort((a, b) => b.suly - a.suly);
    for (const b of betoltendok) {
      if (this._futoBetoltesek >= EGYIDEJU_BETOLTES) break;
      this._gyerekekBetoltese(b.id, b.kuszob);
    }

    if (valtozott) this._rajzolasKerese();
  }

  // ===== A MEGJELÖLT SÍKIDOM A KÉPERNYŐ KÖZEPÉRE =====
  // A koppintáskori LÁTSZÓ MÉRETÉBEN — így a mélység sem vész el.
  //
  // A nézetet EXPLICIT állítjuk be a megjelölt keretéből, nem szorozgatjuk: a
  // három szám (`skala`, `eltolasX/Y`) a horgony keretében értendő, ezért a
  // horgonyt is ide állítjuk. Ez önmagában nem mozdít semmit — a nézet utána
  // teljes egészében ebből a keretből számolódik. (Ha a `_horgonyEllenorzes` a
  // következő képkockán tovább lép, az sem baj: a horgonyváltás definíció szerint
  // nem mozdítja a képernyő-képet.)
  _fokuszAMegjeloltre() {
    const { szuloId, id, kepSugarPx } = this._jeloltHelyzet;
    this._jeloltHelyzet = null;          // egyszer használatos: csak a kért adagra

    this._horgony = szuloId;
    const keret = keretbenCsomopont(this._tar, this._horgony, id);
    if (!keret || !(keret.r > 0) || !(kepSugarPx > 0)) return;

    const skala = kepSugarPx / keret.r;
    this._nezet = {
      skala,
      eltolasX: (this._szelesseg || 0) / 2 - skala * keret.x,
      eltolasY: (this._magassag || 0) / 2 - skala * keret.y
    };

    console.log('SikidomModal._fokuszAMegjeloltre', {
      jelolt: id, kepSugar: kepSugarPx.toFixed(1), ujSkala: skala.toFixed(2)
    });

    this._rajzolasKerese();
  }

  _folyamatJelzo(latszik) {
    document.getElementById('sikidom-folyamat')?.toggleAttribute('hidden', !latszik);
  }

  // ===== ESEMÉNYEK =====
  _esemenyekBekotese() {
    const nezetElem = document.getElementById('sikidom-nezet');
    if (!nezetElem) return;

    // ===== GESZTUSOK: EGY UJJ = MOZGATÁS, KÉT UJJ = NAGYÍTÁS **ÉS** MOZGATÁS =====
    // A kezelés INKREMENTÁLIS: minden mozgás-eseménynél az ELŐZŐ állapothoz képest
    // számolunk. Ez azért fontos, mert így az ujjak számának változása magától
    // helyreáll — nem kell külön kezelni, hogy közben fel- vagy letettél egy ujjat.
    //
    // A korábbi, abszolút („kezdőponthoz mért") megoldás két hibát okozott mobilon:
    //   1. KÉT UJJAL NEM LEHETETT MOZGATNI. Csak a távolságuk arányát néztük;
    //      ha az ujjak együtt csúsztak (az arány 1 maradt), a kép meg sem mozdult.
    //   2. CSIPPENTÉS UTÁN AZ OTT MARADT UJJAL NEM LEHETETT MOZGATNI. A húzás
    //      kezdőpontja elavult maradt, amíg minden ujjat fel nem emeltél.
    nezetElem.addEventListener('pointerdown', (e) => {
      if (this._kezdoFazis) return;        // a kezdő fázis alatt a nézet zárolva
      if (e.target.closest('.sikidom-modal__vezerlok')) return;

      // Új gesztus kezdődik, ha eddig egyetlen ujj sem volt a képernyőn
      if (this._aktivMutatok.size === 0) {
        this._gesztusTavolsag = 0;
        this._gesztusMaxUjj = 0;
      }

      this._aktivMutatok.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this._gesztusMaxUjj = Math.max(this._gesztusMaxUjj, this._aktivMutatok.size);
      this._gesztusElozo = this._gesztusMerese();

      nezetElem.setPointerCapture(e.pointerId);
    });

    nezetElem.addEventListener('pointermove', (e) => {
      if (!this._aktivMutatok.has(e.pointerId)) return;
      this._aktivMutatok.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const most = this._gesztusMerese();
      const elozo = this._gesztusElozo;
      if (!most || !elozo) { this._gesztusElozo = most; return; }

      const teglalap = nezetElem.getBoundingClientRect();

      // 1. NAGYÍTÁS — csak ha MOST is és ELŐBB is legalább két ujj volt.
      //    (a gyújtópont az ujjak MOSTANI középpontja)
      //    A gyújtópont az ujjak MOSTANI középpontja: így a kép ott marad a
      //    helyén, ahol az ujjaid fogják.
      if (most.tavolsag > 0 && elozo.tavolsag > 0) {
        const arany = most.tavolsag / elozo.tavolsag;
        if (arany > 0 && arany !== 1) {
          this._zoom(arany, most.kozepX - teglalap.left, most.kozepY - teglalap.top);
        }
      }

      // 2. MOZGATÁS — a középpont elmozdulása. Egy ujjnál ez maga a húzás,
      //    két ujjnál a csippentés melletti eltolás. Ugyanaz a képlet mindkettőre.
      const dx = most.kozepX - elozo.kozepX;
      const dy = most.kozepY - elozo.kozepY;

      if (dx !== 0 || dy !== 0) {
        this._eemberMozgatott = true;
        this._nezet.eltolasX += dx;
        this._nezet.eltolasY += dy;
        this._gesztusTavolsag += Math.abs(dx) + Math.abs(dy);
        this._rajzolasKerese();
      }

      this._gesztusElozo = most;
    });

    const mutatoVege = (e, koppinthat) => {
      // KOPPINTÁS-e? Csak akkor, ha VÉGIG egyetlen ujj volt, és alig mozdult.
      // (A `_gesztusMaxUjj` őrzi, hogy csippentés után az utolsó ujj felemelése
      // ne nyisson meg véletlenül egy adatlapot.)
      const kattintasVolt = koppinthat
        && this._aktivMutatok.size === 1
        && this._gesztusMaxUjj === 1
        && this._gesztusTavolsag <= KATTINTAS_KUSZOB;

      this._aktivMutatok.delete(e.pointerId);

      // A maradék ujjakhoz igazítjuk az alapállapotot — így az ott maradt ujjal
      // AZONNAL tovább lehet mozgatni, ugrás nélkül.
      this._gesztusElozo = this._gesztusMerese();

      // Ha minden ujj felkerült, biztos vége a gesztusnak: nem kell kivárni az
      // időzítőt az újrapakolással.
      if (this._aktivMutatok.size === 0 && this._zoomVegeIdozito) {
        clearTimeout(this._zoomVegeIdozito);
        this._zoomVegeIdozito = null;
        this._tennivalokFeldolgozasa();
      }

      if (!kattintasVolt) return;

      const teglalap = nezetElem.getBoundingClientRect();
      this._koppintas(e.clientX - teglalap.left, e.clientY - teglalap.top);
    };

    nezetElem.addEventListener('pointerup', (e) => mutatoVege(e, true));
    nezetElem.addEventListener('pointercancel', (e) => mutatoVege(e, false));

    // ===== GÖRGŐ ÉS ÉRINTŐPAD-CSIPPENTÉS =====
    // A görgetés mértékével ARÁNYOS nagyítás (lásd GORGO_EGYSEG_*).
    //
    // Az érintőpad CSIPPENTÉSE is ide érkezik, `ctrlKey = true`-val (a böngészők
    // így jelzik) — de sokkal KISEBB delta-értékekkel, mint a kétujjas görgetés.
    // Ugyanazzal az egységgel a csippentés alig mozdítaná a képet, ezért annak
    // külön (nagyobb) egysége van.
    nezetElem.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this._kezdoFazis) return;        // a kezdő fázis alatt a nézet zárolva

      const szorzo = gorgoSzorzo(e);
      if (!(szorzo > 0) || szorzo === 1) return;

      const teglalap = nezetElem.getBoundingClientRect();
      this._zoom(szorzo, e.clientX - teglalap.left, e.clientY - teglalap.top);
    }, { passive: false });
  }

  // A gesztus pillanatnyi állapota a lenyomott ujjakból (a számítás a
  // `sikidomNagyitas.js`-ben — ez csak átadja neki a mutatókat)
  _gesztusMerese() {
    return gesztusAllapot([...this._aktivMutatok.values()]);
  }

  _zoom(szorzo, kozepX, kozepY) {
    if (this._kezdoFazis) return;          // a kezdő fázis alatt a nézet zárolva
    this._eemberMozgatott = true;
    // Bármilyen kézi nagyítás megszakítja a futó illesztés-animációt — különben
    // az visszarántaná a képet az e-ember keze alól.
    if (this._illesztesAnimacio) {
      cancelAnimationFrame(this._illesztesAnimacio);
      this._illesztesAnimacio = null;
    }

    // KÉT HATÁR: kifelé a VILÁG-nál fogy el a hierarchia, befelé pedig akkor, ha a
    // horgonynak nincs mibe lelépnie (lásd `BEFELE_HATAR`). A kettő sosem harap
    // egyszerre — az egyik csak kicsinyítésre, a másik csak nagyításra vonatkozik.
    const hatarolt = befeleHatarolas({
      szorzo: kifeleHatarolas({
        szorzo,
        vilagSzinten: this._horgony === VILAG,
        alapSkala: this._alapSkala,
        skala: this._nezet.skala
      }),
      vanHovaLelepni: this._vanHovaLelepni(),
      kepernyoMeret: this._kepernyoMeret(),
      skala: this._nezet.skala
    });
    if (hatarolt === 1) return;                  // már a határon állunk, nincs mit tenni

    this._nezet.skala *= hatarolt;
    this._nezet.eltolasX = kozepX - (kozepX - this._nezet.eltolasX) * hatarolt;
    this._nezet.eltolasY = kozepY - (kozepY - this._nezet.eltolasY) * hatarolt;
    this._rajzolasKerese();

    // A kép azonnal követi a nagyítást, de az ÚJ síkidomok csak a végén jelennek meg
    this._zoomVegeUtemezes();
  }

  // ===== VAN-E A HORGONYNAK MIBE LELÉPNIE? =====
  // A befelé nagyítás felső határa CSAK akkor él, ha nincs — ilyenkor a
  // horgonyváltás nem tud dolgozni, tehát semmi más nem fogná meg a nagyítást
  // (lásd `BEFELE_HATAR` a nagyítás-modulban). A választ csak innen lehet
  // megadni: ehhez a csomópont-tárat kell ismerni.
  //
  // @returns {boolean} igaz, ha a horgonynak van BETÖLTÖTT gyereke
  _vanHovaLelepni() {
    const cs = this._tar.get(this._horgony);
    if (!cs) return true;                        // ismeretlen horgony: nem korlátozunk

    for (const gid of cs.gyerekIdk) {
      if (this._tar.has(gid)) return true;
    }
    return false;
  }

  _zoomKozeppontra(szorzo) {
    this._zoom(szorzo, (this._szelesseg || 0) / 2, (this._magassag || 0) / 2);
  }

  // ===== KOPPINTÁS A „TOVÁBBI TARTALMAK" AJÁNLATRA =====
  // Felelősség: a következő adag elkérése, ÉS a mélység megőrzése.
  //
  // A MÉLYSÉG MEGŐRZÉSE (Csaba, 2026-08-11): „a betöltés előtt a legkisebb entitást
  // — tehát még a régi lepakolásban — megjelöljük, és annak a területe legyen akkora
  // a következő lepakoláskor is, mint előtte." A HELYE változhat (az újakat középre
  // kapja, ő kifelé kerül), a MÉRETE nem — a szem ezt érzékeli mélységként.
  //
  // Vizuálisan is megjelöljük, mert ez a síkidom eddig (majdnem) középen ült, most
  // pedig valahol a gyűrűben lesz: így látszik, HOL MARADT ABBA az előző lepakolás.
  //
  // @returns {boolean} igaz, ha az ajánlatra koppintottak (a hívó ilyenkor megáll)
  _ajanlatKoppintas(kepX, kepY) {
    const magok = this._utolsoMagok ?? [];

    // A LEGKISEBB ajánlat nyer — ugyanaz a szabály, mint a síkidomoknál: a
    // beágyazott, kisebb cél van „fölül".
    let talalat = null;
    for (const mag of magok) {
      if (!mag.tovabbiTartalom) continue;
      if (mag.uresSugarPx < TOVABBI_FELIRAT_MIN_SUGAR) continue;   // ki sem rajzoltuk
      const tavolsag = Math.hypot(kepX - mag.kepX, kepY - mag.kepY);
      if (tavolsag > mag.uresSugarPx) continue;
      if (!talalat || mag.uresSugarPx < talalat.uresSugarPx) talalat = mag;
    }

    if (!talalat) return false;

    const cs = this._tar.get(talalat.csomopontId);
    if (!cs) return false;

    // --- A MEGJELÖLENDŐ: a jelenlegi lepakolás LEGKISEBBJE ---
    // Ugyanaz a rendezés, mint a pakolóé (növekvő sugár, holtversenynél azonosító),
    // hogy pontosan az legyen megjelölve, amelyik most a legbelső.
    let jelolt = null;
    for (const gid of cs.gyerekIdk) {
      const gy = this._tar.get(gid);
      if (!gy) continue;
      const jobb = !jelolt || pakolasiSorrend(
        { id: gy.id, sugar: gy.relR, letrehozva: gy.letrehozva },
        { id: jelolt.id, sugar: jelolt.relR, letrehozva: jelolt.letrehozva }
      ) < 0;
      if (jobb) jelolt = gy;
    }

    if (jelolt) {
      this._jeloltId = jelolt.id;
      this._jeloltHelyzet = {
        szuloId: cs.id,
        id: jelolt.id,
        // A látszó SUGARA most — ezt kell visszaállítani az újrapakolás után.
        // (A terület a sugár négyzetével arányos, tehát a sugár rögzítése ugyanaz.)
        kepSugarPx: talalat.szuloKepSugar * jelolt.relR
      };
    }

    // --- A KÖVETKEZŐ ADAG ELKÉRÉSE ---
    // A plafon emelése + a „kérésre töltünk" jelző. A kurzor onnan folytatja, ahol
    // abbahagyta, tehát nem töltünk le semmit kétszer.
    cs.betoltesiPlafon += ELORETOLTES_DARAB;
    cs.tovabbiKert = true;

    console.log('SikidomModal._ajanlatKoppintas', {
      csomopont: cs.id,
      ujPlafon: cs.betoltesiPlafon,
      megvan: cs.gyerekIdk.length,
      jelolt: this._jeloltId,
      jeloltKepSugar: this._jeloltHelyzet?.kepSugarPx?.toFixed(1)
    });

    this._folyamatJelzo(true);
    this._tennivalokFeldolgozasa();
    this._rajzolasKerese();
    return true;
  }

  // ===== KOPPINTÁS =====
  // A találatot számítással keressük (nincs elemenkénti DOM). A LEGKISEBB
  // találat nyer: a beágyazott gyerek van fölül, azt akarta az e-ember.
  _koppintas(kepX, kepY) {
    // ===== ELŐBB A „TOVÁBBI TARTALMAK" AJÁNLAT =====
    // Az ajánlat a szülő közepén, a valódi ÜRES körben ül, ahol definíció szerint
    // nincs síkidom — tehát nem vesz el találatot senkitől. Mégis előbb nézzük,
    // mert a szülő síkidoma alatta van, és az elnyelné a koppintást.
    //
    // ⚠️ A CÉL A PAKOLÁSI LYUK, NEM A KIJELZŐ-MAG (Csaba, 2026-08-11): „a
    // képernyő-fix mag zsugorodása ne legyen hatással a szövegre és a koppintásra".
    // Ezért `uresSugarPx` a sugár — ugyanaz, amihez a felirat is igazodik.
    if (this._ajanlatKoppintas(kepX, kepY)) return;

    const lathatoak = this._utolsoLathatoak ?? [];
    let talalat = null;

    for (const { cs, kep } of lathatoak) {
      const tavolsag = Math.hypot(kepX - kep.kepX, kepY - kep.kepY);
      if (tavolsag > kep.kepSugar) continue;
      if (!talalat || kep.kepSugar < talalat.kep.kepSugar) talalat = { cs, kep };
    }

    if (!talalat) {
      // Üres helyre koppintva a kiválasztás és az adatlap is megszűnik
      if (this._kivalasztottId) this._kartyaBezarasa();
      return;
    }

    console.log('SikidomModal._koppintas - találat', {
      entitasId: talalat.cs.id, entitasTipus: talalat.cs.entitasTipus
    });

    this._kivalasztottId = talalat.cs.id;
    this._rajzolasKerese();
    this._kartyaPanel.megjelenites(talalat.cs.id, talalat.cs.entitasTipus);
  }

  // ===== A KÁRTYA-PANEL =====
  // Az adatlap megjelenítése a `SikidomKartyaPanel`-é (külön fájl); innen csak
  // az kell, ami a NÉZETET érinti: a kiválasztás megszűnése és az újrarajzolás.
  _kartyaBezarasa() {
    this._kartyaPanel.bezaras();
  }

}

// ===== EXPORTÁLÁS =====
export default SikidomModal;
