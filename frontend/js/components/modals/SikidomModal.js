// frontend/js/components/modals/SikidomModal.js

// ===== IMPORTOK =====
import Modal from './Modal.js';
import { apiGet } from '../../utils/apiHelper.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import { sikidomLeiro, TIPUS_FORMA } from '../../utils/sikidomFormak.js';
import { gyerekRelativSugar, gyokerRelativSugar, SZINT_OSZTO }
  from '../../utils/sikidomMeret.js';
import { pakolas } from '../../utils/sikidomPakolas.js';
import { szuloKeretben, horgonyValtasNezet, kepernyore, horgonyValtasSzukseges }
  from '../../utils/sikidomHorgony.js';
import { kartyaLetrehozasa } from '../kartya/kartyaGyar.js';

// A kártya SAJÁT modáljainak (javaslat, tudatpont, részletek…) konténere. NEM
// lehet ugyanaz, mint a Síkidom nézeté: a Modal felülírja a konténere tartalmát,
// tehát a kártya egy modálja kilőné alóla a nézetet. Ugyanaz a minta, mint a
// HozzajarulokModal / MeghivoModal al-modaljainál.
const ALMODAL_KONTENER_ID = 'almodal-kontener';

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
// Ez EGYETLEN szám, amivel a nézet sűrűsége hangolható: nagyobb érték =
// levegősebb, kevesebb síkidom; kisebb = zsúfoltabb, több apró.
const MIN_KEP_ATMERO = 24;

// Egyszerre ennyi lekérés futhat
const EGYIDEJU_BETOLTES = 3;

// Biztonsági plafon egy képkockára
const MAX_RAJZOLT = 4000;

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
// A munkát így a láthatósági küszöb (MIN_KEP_ATMERO) és a kapacitás korlátozza,
// mindkettő a MÉRETBŐL, nem a képernyő-pozícióból.
//
// `true`-ra állítva visszajön a korábbi viselkedés (a képernyő +
// LATOMEZO_TARTALEK arányú keretén kívüliek kimaradnak).
const KEPERNYON_KIVULIEK_ELTUNTETESE = false;

// ===== AZ ÁGAK ELENGEDÉSE A MEMÓRIÁBÓL (külön kérdés!) =====
// Ez KORÁBBAN ugyanaz a kapcsoló volt, mint a fenti — pedig két külön dologról
// szól. Csaba döntése arra vonatkozott, hogy a RAJZOLÁS ne hagyjon ki semmit;
// azzal viszont a memória-takarítás is némán megszűnt (`_takaritas` első sora).
//
// A KÖVETKEZMÉNY, amivel számolni kell: a csomópont-tár így MONOTON NŐ, elengedési
// út nincs. Egy hosszú, mélyre nagyító munkamenet minden lerakott csomópontot
// megtart, és a `_lathatoLista` képkockánként végig is olvassa őket. A
// `BETOLTESI_MELYSEG = 4` ezt a növekedést 16-szorosára gyorsította.
//
// `false` marad (a mai viselkedés), de mostantól KÜLÖN kapcsolható: ha a nézet
// hosszú használat után belassul, ez az első hely, ahol nézni kell. Bekapcsolva a
// régóta nem látott ágak gyerekei elengedődnek (a helyük NEM vész el: a szülő
// „még nem töltöttük be" állapotba áll vissza, és újra letöltődik).
const AGAK_ELENGEDESE = false;

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
// A letöltés így sem szalad el: a `BETOLTESI_TARTALEK` fék továbbra is a
// várólista TERÜLETÉHEZ méri, mennyit érdemes még kérni.
//
// HANGOLÁS: nagyobb érték = mélyebb előretöltés (több hálózat, kisebb mag),
// 1 = a korábbi viselkedés.
const BETOLTESI_MELYSEG = 4;

// Ekkora látszó ÁTMÉRŐ fölött írjuk ki a címet. Nagyobb, mint a láthatósági
// küszöb: egy síkidom előbb látszik, és csak nagyobbra nőve kap feliratot.
const CIMKE_MIN_ATMERO = 48;

// ===== A CÍMKE: KÁRTYA, SORTÖRÉS, HELY (a koino_1.0 titlecards.js mintájára) =====
// A koino_1.0 három dolgot csinált jobban a felirattal, mindhármat átvesszük:
//
//  1. TÖBB SORBA TÖRDEL, valódi szélesség-méréssel (`measureText`), szóhatáron —
//     nem 24 karakternél vág el „…"-tal.
//  2. FÉLIG ÁTTETSZŐ, LEKEREKÍTETT KÁRTYÁT tesz a szöveg alá. Ez bármilyen
//     háttéren olvasható marad; a korábbi fehér kontúr (`strokeText`) zsúfolt
//     képen elmosódott.
//  3. NEM A KÖZÉPPONTBA teszi, hanem fölé (`sugár × CIMKE_FELETT_ARANY`).
//     Ez nálunk már nem szépészeti kérdés: `URES_MAG = false` óta a középpontban
//     a LEGKISEBB GYEREK ül, tehát a középre írt felirat rátakart.
const CIMKE_MAX_SOR = 3;            // ennél több sorba nem tördelünk (az utolsó „…"-t kap)
const CIMKE_FELETT_ARANY = 0.6;     // a kártya közepe ennyiszer a sugárral a középpont FÖLÖTT
const CIMKE_SOR_SZELESSEG = 1.3;    // a sor legnagyobb szélessége a sugár arányában
const CIMKE_HATTER = 'rgba(255, 255, 255, 0.78)';

// ===== MELLÉK-IKONOK: KATEGÓRIA ÉS TARTALOMTÍPUS =====
// A síkidom FORMÁJA az entitástípust mutatja (kör / háromszög / …), a SZÍNE
// ugyanazt — de arról, hogy egy Tartalom MELYIK kategóriába tartozik és milyen
// TÍPUSÚ, eddig semmi nem árulkodott. A koino_1.0 ezt a kategória SZÍNÉVEL és a
// típus FORMÁJÁVAL oldotta meg; nálunk ez nem járható, mert a színek és a formák
// száma korlátozott, az ikonoké viszont nem (Csaba, 2026-08-08).
//
// Ezért a Struktúra nézet mintáját követjük: a felirat alatt egy sorban a
// kategória-ikonok BALRA, a tartalomtípus ikonja JOBBRA.
const IKON_MIN_ATMERO = 96;         // ekkora látszó átmérő alatt nincs mellék-ikon
const IKON_ALATT_ARANY = 0.5;       // az ikon-sor a középpont ALATT, a sugár arányában
const IKON_SUGAR_ARANY = 0.10;      // egy ikon sugara a síkidom sugarának arányában
const IKON_MAX_SUGAR = 22;          // de ennél nagyobbra nem nő (a nagy szülőkön ne uralkodjon)
const IKON_MAX_DARAB = 4;           // legfeljebb ennyi ikon fér ki egy síkidomra

// ===== ELHALVÁNYODÁS: A TÚLNŐTT SÍKIDOM ÁTADJA A HELYET =====
// A koino_1.0 `calculateOpacity`-je: ahogy egy síkidom túlnő a képernyőn, a
// kitöltése fokozatosan eltűnik. Nálunk ez azért is kell, mert a KERET eddig
// végig átlátszatlan maradt — egy óriásira nagyított szülő kontúrja egyszerűen
// átvágott a képernyőn.
//
// A küszöböket a KÉPERNYŐHÖZ mérjük, nem fix képpontban (a 1.0 fix 4000-et
// használt, ami telefonon és 4K-n mást jelent). Egységük: a képernyő kisebbik
// oldala. A horgonyváltás a képernyő KÉTSZERES átmérőjénél történik, azaz
// 1,0-s sugárnál — a halványodás tehát pont ott kezdődik, ahol a síkidom
// „körénk zárul", és 3,0-nál ér véget.
const HALVANYODAS_KEZDET = 1.0;
const HALVANYODAS_VEGE = 3.0;
const HALVANYODAS_MARADEK = 0.06;   // teljesen sosem tűnik el: ennyi marad a keretből

// Az ÜRES MAG szaggatott jelölése: ekkora látszó ÁTMÉRŐ alatt nem rajzoljuk ki
// (nem látszana, csak zajt csinálna)
const MAG_MIN_ATMERO = 10;

// A gyökér-szint üres magjába ekkora sugár fölött írjuk ki a „nagyíts befelé" súgót
const MAG_FELIRAT_MIN_SUGAR = 62;

// Ennyi képkockánként takarítunk (a látómezőn kívülre került ágak elengedése)
const TAKARITAS_KEPKOCKANKENT = 180;

// Ennyi képkockán át nem látott ág gyerekeit engedjük el
const ELENGEDES_TURELEM = 240;

// ===== A MAG SŰRŰSÉGE (σ) — A NÉZET MÁSODIK HANGOLÓ SZÁMA =====
// A középső üresség NEM a képernyőből jön, hanem a HÁTRALÉVŐ TUDATPONTBÓL:
//
//     c = √( T_hátra / (20 · P_szülő · σ) )        — lásd `_magSugar`
//
// A σ azt mondja meg, mekkora pakolási sűrűséggel számolunk, amikor helyet
// tartunk fenn a még hely nélküli testvéreknek. KISEBB σ = NAGYOBB, óvatosabb mag.
//
// MIÉRT ÓVATOS A 0,5: utánaszámolva egy teljes GYŰRŰ a felszabaduló hely
// π/4 ≈ 78,5%-át tölti ki, a vegyes méretekre MÉRT pakolási sűrűség pedig
// 0,41–0,53. A 0,5-tel tehát ~1,57-szer akkora magot tartunk fenn, mint a
// szigorúan szükséges — Csaba kérése szerint „inkább maradjon üres belső rész,
// mint hogy elfogyjon a belső tér" (2026-08-08).
//
// HANGOLÁS: ha a nézetben túl nagy a lyuk, EMELD (0,6–0,7); ha a később érkezők
// kifelé szorulnak, CSÖKKENTSD. A `sikidomPakolasProba.mjs` 7. paramétere ugyanez.
const MAG_SURUSEG = 0.5;


// ===== ÜRES MAG: KI / BE =====
// `true` → a középen fenntartott hely a HÁTRALÉVŐ TUDATPONTBÓL számolódik
//          (`_magSugar`), és a peremén bukkannak elő a később érkezők.
// `false` → nincs fenntartott hely; csak összehasonlításhoz.
//
// ÁLLÁS 2026-08-08 (Csaba döntése): KELL A MAG — mert ez a nézet
// STABILITÁSÁNAK a kulcsa, nem díszítés.
//
// Az előzmény: 2026-08-06-án `false`-ra állt, mert a mérés a mag nélküli
// változatot mutatta tömörebbnek (52,7% kitöltöttség / 4,08 átlagos érintés,
// szemben a maggal futó 48,7% / 3,01-gyel, 105 valódi gyökéren). Akkor még nem
// tudtuk, MIT fizetünk érte.
//
// A számla 2026-08-08-án érkezett meg: mag nélkül minden újrapakolás az EGÉSZ
// elrendezést újraszámolta, mert az új — az eddigieknél kisebb — testvérek a
// méret szerinti sor ELEJÉRE kerülnek, és onnantól minden utánuk következő
// síkidom új helyre ugrik. Csaba tünete: „amikor közelítek, máshová kerülnek a
// síkidomok, és így nehéz ráközelíteni egy szélsőre, mert mindig elugrál,
// kb. kergetni kell."
//
// EGY KÉPERNYŐHÖZ KÖTÖTT mag ezt viszont NEM oldotta meg (2026-08-08, mérve és
// böngészőben is látva): állandó képpont-méret mellett a mag adat-térben
// zsugorodik, függetlenül attól, hány testvér van még hátra — így a később
// érkezőknek nem maradt hely, és a pakoló a pót-horgonyokra kényszerült, azok
// pedig a LEGKÜLSŐ körök. Az eredmény kifelé fűződő „kígyó" lett.
//
// Ezért jön a mag mostantól az ADATBÓL: annyi helyet tartunk fenn, amennyi a még
// hely nélküli testvéreknek KELL. Lásd `_magSugar` és `MAG_SURUSEG`.
const URES_MAG = true;

// A nagyítás „végét" ennyi eseménymentes ezredmásodperc jelenti. Nagyítás KÖZBEN
// szándékosan nem pakolunk: a kép így nem ugrál a görgetés alatt, és nem is
// számolunk fölöslegesen minden képkockán.
const ZOOM_VEGE_MS = 140;

// MEGJEGYZÉS: itt állt az `UJRAPAKOLASI_TARTALEK` — az újrapakolás hatóköre,
// amikor még a látómezőbe benyúló köröket pakoltuk újra, a kívül esőket pedig
// „befagyasztottuk". 2026-08-08 óta MINDEN lerakott síkidom helye végleges, tehát
// nincs se hatókör, se fagyasztási varrat: az `_ujrapakolas` csak az újakat rakja
// le, a régiek akadályként vesznek részt. A konstansra nincs többé szükség.

// A +/− GOMBOK egy kattintásának nagyítása. A görgő NEM ezt használja — lásd alább.
const ZOOM_LEPES = 1.2;

// ===== A GÖRGŐ ÉRZÉKENYSÉGE (a koino_1.0 D3-as viselkedése) =====
// Eddig egy görgetés-esemény FIX 1,2-szeres ugrást adott, akármekkora volt.
// Ez érintőpadon rossz: ott egy finom mozdulat is sok apró eseményt küld
// (deltaY = 1–4), amiből így 1,2-szeres ugrások sorozata lett — a kép elszaladt.
//
// A koino_1.0 a D3 alapértelmezését használta (`d3.zoom`, 7.8.5), ami a delta
// NAGYSÁGÁVAL arányos:  szorzó = 2^(−deltaY × egység).
// Egy „kattanós" egérgörgő deltaY-ja 100 → 2^0,2 ≈ 1,149-szeres lépés;
// egy finom érintőpad-mozdulaté 3 → 2^0,006 ≈ 1,004 — vagyis simán, folytonosan.
//
// Az egységek a D3 `wheelDelta`-jából: képpont / sor / oldal görgetési módhoz.
// EZ A FŐ HANGOLÓ SZÁM (érintőpad kétujjas görgetése, egérgörgő):
//   0,001 → egy egérgörgő-kattanás ×1,07 · 0,002 → ×1,15 · 0,003 → ×1,23
//   0,004 → ×1,32 · 0,005 → ×1,41 (két kattanás = kétszeres nagyítás)
const GORGO_EGYSEG_KEPPONT = 0.002;   // deltaMode 0 — képpont (érintőpad, modern egér)

// deltaMode 1 — SOROKBAN görgető böngésző (Windowson jellemzően a Firefox
// egérgörgője: deltaY = 3). Szándékosan a képpontos egység 100/3-szorosa, hogy
// egy egérgörgő-kattanás MINDEN böngészőben ugyanakkorát nagyítson. (A D3
// alapértéke itt 0,05 volt, amitől a Firefox érezhetően lassabban nagyított.)
const GORGO_EGYSEG_SOR     = GORGO_EGYSEG_KEPPONT * 100 / 3;

// deltaMode 2 — OLDALANKÉNT görgető (ritka)
const GORGO_EGYSEG_OLDAL   = 1;

// ÉRINTŐPAD-CSIPPENTÉS. A böngészők `ctrlKey = true`-val küldik, és sokkal
// KISEBB delta-értékekkel, mint a kétujjas görgetést — a görgetés egységével a
// csippentés alig mozdítaná a képet. Ha a csippentés lomhának érződik, EZT emeld.
//
// 0,010 → 0,012 (Csaba, 2026-08-08): 20%-kal érzékenyebb, mert lomha volt.
const GORGO_EGYSEG_CSIPPENTES = 0.012;

// ===== KIFELÉ NAGYÍTÁS ALSÓ HATÁRA =====
// Befelé a nagyítás KORLÁTLAN (ezért van a horgonyváltás). Kifelé viszont a
// VILÁG szintnél elfogy a hierarchia: a horgony nem tud tovább fölfelé lépni, és
// ha tovább kicsinyítesz, minden a láthatósági küszöb alá esik — üres képernyő,
// amiből csak az „illesztés" gomb hoz vissza. A koino_1.0-ban ezt a D3
// `scaleExtent` fogta meg; nálunk az illesztési nagyítás töredékében húzzuk meg.
const KIFELE_HATAR = 0.25;          // az illesztési skála negyedénél megáll

// ===== AZ ILLESZTÉS ANIMÁCIÓJA =====
// A koino_1.0 `fitZoom`-ja 750 ms-os átmenettel állt rá az új nézetre; a miénk
// eddig UGROTT. Animálva látszik, honnan hová kerültünk — ez a térbeli
// tájékozódás miatt számít. (750 ms hosszúnak bizonyult egy gombnyomáshoz.)
const ILLESZTES_MS = 420;

// A koppintás és a húzás határa képpontban (a koino_1.0-ban 7 — a miénk 5 volt,
// és érintőképernyőn a szándékos koppintás is gyakran „húzásnak" számított)
const KATTINTAS_KUSZOB = 7;

// ===== SÍKIDOM NÉZET MODAL =====
// Felelősség: a Síkidom nézet — minden entitás egy síkidom, a TERÜLETE arányos a
// hierarchikus össztudatpontjával, a leszármazottak a szülőn BELÜL helyezkednek el.
//
// A három tartóoszlop (mind külön, DOM-független modulban):
//   - sikidomMeret.js    → tudatpont → sugár (terület-arányosan, szintenként /20)
//   - sikidomPakolas.js  → háromszögeléses kör-pakolás üres maggal
//   - sikidomHorgony.js  → korlátlan nagyítás horgonyváltással (nincs pislogás)
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
    this.rajzolo = null;

    // ----- ADAT -----
    // Csomópont-tár: id → csomópont. Minden csomópont a SZÜLŐJÉHEZ képest tárolja
    // a helyét és a méretét (relX, relY, relR) — ez teszi lehetővé a korlátlan
    // nagyítást (lásd sikidomHorgony.js).
    this._tar = new Map();
    this._horgony = VILAG;

    // Világ → képernyő
    this._nezet = { skala: 1, eltolasX: 0, eltolasY: 0 };

    // ----- ÁLLAPOT -----
    this._kivalasztottId = null;
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

    // MELLÉK-IKON KÉP-TÁR: URL → { kep: Image, kesz: boolean, hibas: boolean }.
    // A Canvas csak betöltött képet tud kirajzolni, ezért egyszer betöltjük és
    // megjegyezzük. Betöltéskor újrarajzolást kérünk — így az ikon „bevillan",
    // de a rajzolás sosem vár rá.
    this._ikonTar = new Map();

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
    this.rajzolo = this.vaszon?.getContext('2d') ?? null;

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
    this._tennivalokFeldolgozasa();
    this._alaphelyzet(false);          // megnyitáskor nincs mit animálni

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
    if (this._illesztesAnimacio) {
      cancelAnimationFrame(this._illesztesAnimacio);
      this._illesztesAnimacio = null;
    }
    this._ikonTar.clear();
    this._kartyaKeres = null;
    this._teljesNezetKikapcsolasa();
    this._tar.clear();

    // A kártya al-modal konténerét is kiürítjük, hogy ne maradjon rejtett
    // modal-DOM a body végén (a HozzajarulokModal mintája)
    const alKontener = document.getElementById(ALMODAL_KONTENER_ID);
    if (alKontener) alKontener.innerHTML = '';
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

      // A várólistán álló FRISS (backendtől most érkezett) testvérek együttes
      // RELATÍV területe: Σ π·relR². Ebből egyetlen szorzással megkapjuk, mennyi
      // képernyő-terület vár lerakásra (`× kepSugar²`) — ez a letöltés fékje
      // (lásd BETOLTESI_TARTALEK). Relatív, ezért nagyítás-független: nem kell
      // képkockánként végigolvasni a listát.
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

  // ===== A MAG SUGARA A HÁTRALÉVŐ TUDATPONTBÓL =====
  // Csaba modellje (2026-08-08). A mag NEM a képernyőhöz igazodik, hanem ahhoz,
  // hogy mennyi testvérnek KELL MÉG hely:
  //
  //   a hely nélküliek együttes területe:  A = π · T_hátra / (20 · P_szülő)
  //   ezt a mag σ sűrűséggel nyeli el:     π · c² · σ = A
  //                                   →    c = √( T_hátra / (20 · P_szülő · σ) )
  //
  // MIÉRT KELL EGYÁLTALÁN: mert a lerakott síkidomok mostantól FIXEK. Ha
  // újrapakolnánk, menet közben lehetne igazítani — így viszont ELŐRE kell helyet
  // tartani a később érkezőknek, különben kifelé szorulnak, és felborul a rend
  // („a legkisebbek középen"). A képernyőhöz kötött, állandó képpont-méretű mag
  // ezt nem tudta: nagyításkor adat-térben zsugorodott, függetlenül attól,
  // mennyi testvér van még hátra.
  //
  // A `T_hátra` azokat számolja, akiknek MÉG NINCS HELYÜK — a le sem töltötteket
  // is. Akit a kapacitás-vágás levett a képernyőről, annak VAN helye (megjegyeztük),
  // ezért ő NEM tartozik ide. Ez nem apróság: a mérőpróbán enélkül a mag nem
  // zsugorodott, és a legkisebbek kerültek LEGKÍVÜLRE (tized-átlagok 0,3042 …
  // 0,2241, vagyis fordítva).
  //
  // A MOST LERAKANDÓ ADAGOT LE KELL VONNI. Ez nem finomítás, hanem a modell
  // helyessége (Csaba mérése, 2026-08-09): a megnyitáskor egyszerre érkezett
  // 150 gyökér, és mi őket egy olyan mag köré pakoltuk, ami MINDEN 405 testvérre
  // volt méretezve. Számokkal: lerakás előtt T_hátra = 17 235 → mag 3,92; utána
  // T_hátra = 592 → mag 0,73. A lyuk tehát 5,4-szer nagyobb lett a kelleténél —
  // és mivel semmi nem mozdul, ÖRÖKRE akkora is maradt. Ez okozta a hatalmas
  // üres közepet, amit semmi nem tudott betölteni.
  //
  // @param {Object} cs - a szülő csomópont
  // @param {number} [mostLerakandoPont=0] - a MOST lerakás alatt álló adag pontja
  // @returns {number} a mag sugara a szülő sugarának egységében
  _magSugar(cs, mostLerakandoPont = 0) {
    if (!URES_MAG) return 0;

    // A mértékegység: a gyökér-szinten a legerősebb gyökér (nincs /20, mert a
    // gyökerek nem egy szinttel lejjebb vannak), egyébként 20 × a szülő pontja.
    const egyseg = cs.id === VILAG
      ? (cs.legerosebbGyerekPont || 0)
      : SZINT_OSZTO * (cs.pont || 0);

    if (!(egyseg > 0)) return 0;

    const hatraPont = Math.max(0,
      (cs.osszesGyerekPont || 0) - (cs.helyezettPont || 0) - Math.max(0, mostLerakandoPont));
    if (hatraPont <= 0) return 0;                 // mindenkinek van már helye

    const sugar = Math.sqrt(hatraPont / (egyseg * MAG_SURUSEG));

    // A VILÁG virtuális (nincs valódi pereme); máshol a mag nem lökheti ki a
    // gyerekeket a szülőből — a mag peremén ülő gyerek `mag + 2·sugár`-ig ér.
    return cs.id === VILAG ? sugar : Math.min(sugar, 1);
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

    // MÉLYEBBRE TÖLTÜNK, MINT AMIT RAJZOLUNK (lásd BETOLTESI_MELYSEG).
    const arany = (MIN_KEP_ATMERO / BETOLTESI_MELYSEG) / (2 * kepSugar);
    const negyzet = arany * arany;

    return cs.id === VILAG
      ? (cs.legerosebbGyerekPont || 0) * negyzet
      : SZINT_OSZTO * (cs.pont || 0) * negyzet;
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
      if (!valasz?.vanTovabb) szulo.betoltottKuszob = Math.max(0, pontKuszob);

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
      if (this._futoBetoltesek <= 0) this._folyamatJelzo(false);

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
    // pakolás sorrend-érzékeny (döntetlennél az azonosító dönt).
    szulo.varolista.sort((a, b) => (b.pont - a.pont) || a.id.localeCompare(b.id));
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
  // Mérve: 100 kör 28 ms, 200 kör 71 ms, 400 kör 307 ms. Ha ez soknak bizonyul,
  // a MIN_KEP_ATMERO növelése csökkenti az egyszerre látható darabszámot.
  //
  // @returns {boolean} változott-e az elrendezés (kell-e újrarajzolni)
  // @param {Object} kep - a csomópont KÉPERNYŐ-adatai; ebből a `kepSugar` kell.
  //   (A `kepX`/`kepY` a látómező-válogatáshoz kellett, ami megszűnt — a lerakott
  //   síkidomok 2026-08-08 óta mind helyben maradnak, nincs mit válogatni.)
  _ujrapakolas(cs, kep) {
    const { kepSugar } = kep || {};
    if (!cs || !(kepSugar > 0)) return false;

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
    // A rajzolást továbbra is a MIN_KEP_ATMERO és a MAX_RAJZOLT korlátozza.
    //
    // MIÉRT NEM KORLÁTOZHATJUK MÉGIS A LERAKÁST: mérve (2026-08-09) a mag
    // képernyő-korlátja mind a négy beállításban MEGFORDÍTOTTA a rendet (a
    // méret-tizedek átlagos középtávolsága 0,6616 → 0,1460 lett a helyes
    // 0,0222 → 0,2241 helyett). Fix helyek mellett a tartalék nem opcionális: ha
    // elvesszük, a később érkezők kifelé szorulnak.

    // ===== A MÁR LERAKOTTAK HELYBEN MARADNAK =====
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
    const allok = [];
    for (const gid of cs.gyerekIdk) {
      const gy = this._tar.get(gid);
      if (!gy) continue;
      allok.push({ id: gy.id, x: gy.relX, y: gy.relY, sugar: gy.relR });
    }

    // AZ ÚJAK: a teljes várólista, sorrendben (csökkenő tudatpont). Nincs se
    // láthatósági, se kapacitás-szűrés — a helyet a mag tartja fenn.
    const ujak = cs.varolista.map(v => ({
      id: v.id,
      sugar: v.relR ?? relSugar(v.pont),
      varo: v
    }));

    if (ujak.length === 0) return false;

    // ===== A MAG: A HÁTRALÉVŐ TUDATPONTBÓL =====
    // Lásd `_magSugar`. Ennyi helyet tartunk fenn középen azoknak, akiknek MÉG
    // NINCS helyük — így a később érkezők befelé férnek, nem kifelé szorulnak.
    //
    // A MOST lerakandó adagot LEVONJUK: ők épp helyet kapnak, tehát nem nekik kell
    // fenntartani. Enélkül az első, nagy adag (150 gyökér) egy ötször akkora mag
    // köré került, mint kellett volna — és ott is ragadt.
    const ujPont = ujak.reduce((s, u) => s + (u.varo?.pont ?? 0), 0);
    const magSugar = this._magSugar(cs, ujPont);

    const eredmeny = pakolas(
      ujak.map(u => ({ id: u.id, sugar: u.sugar })),
      { magSugar, kornyezet: allok }
    );

    // --- AZ EREDMÉNY BEKÖTÉSE ---
    const ujTerkep = new Map(ujak.map(u => [u.id, u.varo]));
    const lerakottIdk = new Set();

    for (const hely of eredmeny.helyek) {
      lerakottIdk.add(hely.id);

      const v = ujTerkep.get(hely.id);    // most került be a várólistáról
      if (!v) continue;

      this._gyerekFelvetele(cs, v, hely.x, hely.y, v.relR ?? relSugar(v.pont));
    }

    // A lerakottak lejönnek a várólistáról — és a letöltési puffer mérőszámából is
    cs.varolista = cs.varolista.filter(v => {
      if (!lerakottIdk.has(v.id)) return true;
      const r = v.relR ?? 0;
      cs.varolistaRelTerulet -= Math.PI * r * r;
      return false;
    });
    cs.varolistaRelTerulet = Math.max(0, cs.varolistaRelTerulet);

    this._meretekUjramerese(cs);

    console.log('SikidomModal._ujrapakolas', {
      csomopont: cs.id,
      helybenMaradt: allok.length,           // ezek NEM mozdultak
      ujonnan: lerakottIdk.size,
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

  // A mag és a külső perem ÚJRAMÉRÉSE a gyerekekből. Nem vezetjük görgetve
  // (a kerekítési hibák halmozódnának) — mindig a tényleges helyekből számoljuk.
  _meretekUjramerese(cs) {
    let mag = Infinity;
    let kulso = 0;

    for (const gid of cs.gyerekIdk) {
      const gy = this._tar.get(gid);
      if (!gy) continue;
      const tavolsag = Math.hypot(gy.relX, gy.relY);
      mag = Math.min(mag, tavolsag - gy.relR);
      kulso = Math.max(kulso, tavolsag + gy.relR);
    }

    cs.magSugarRel = Number.isFinite(mag) ? Math.max(0, mag) : Infinity;
    cs.kulsoSugar = kulso;
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
    this.rajzolo.setTransform(arany, 0, 0, arany, 0, 0);
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
      skala: (this._kepernyoMeret() * 0.45) / becsultKiterjedes,
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
      skala: (this._kepernyoMeret() * 0.45) / kiterjedes,
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
      const dontes = horgonyValtasSzukseges(
        this._nezet, this._kepernyoMeret(), gyerekKeretek, vanSzulo
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
    }

    // 2. Lefelé bejárás, vágásokkal
    const lathatoak = [];
    const betoltendok = [];
    const pakolandok = [];
    const magok = [];
    const sor = [{ id: kiindulo, keret }];

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

      // --- GYEREKEK ÁTVIZSGÁLÁSA ---
      // Itt dől el, mely gyerekek látszanak (LÁTHATÓSÁGI KÜSZÖB). A küszöb
      // alattiakat NEM rajzoljuk és a részfájukat sem járjuk be (a gyerek mindig
      // kisebb a szülőjénél → a részfa levágható). Ilyen csak akkor fordul elő,
      // ha az e-ember KIcsinyített: a lerakott helyeket megtartjuk, hogy
      // visszanagyítva pontosan ugyanaz a kép jöjjön vissza.
      for (const gid of cs.gyerekIdk) {
        const gy = this._tar.get(gid);
        if (!gy) continue;

        const gyKeret = {
          x: elem.keret.x + elem.keret.r * gy.relX,
          y: elem.keret.y + elem.keret.r * gy.relY,
          r: elem.keret.r * gy.relR
        };

        if (this._nezet.skala * gyKeret.r * 2 < MIN_KEP_ATMERO) continue;

        sor.push({ id: gid, keret: gyKeret });
      }

      // --- A KÖZÉPSŐ LYUK ---
      // A szaggatott kör pereme a MÉRT lyuk: a legbelső lerakott testvér belső
      // széle (`magSugarRel`, mérve) — nem a becsült mag, hanem a tényleges.
      //
      // A lyuk annál nagyobb, minél több testvér vár még helyre (`_magSugar` ennyit
      // tart fenn). Ahogy sorra lekerülnek, a lyuk MAGÁTÓL zsugorodik; amikor
      // mindenkinek van helye, eltűnik. Vagyis a lyuk mérete azt mutatja meg, hogy
      // „mennyi van még lejjebb" — pontosan ez volt a szerepe.
      if (cs.gyerekIdk.length > 0 && Number.isFinite(cs.magSugarRel) && cs.magSugarRel > 0) {
        const magKepSugar = kep.kepSugar * cs.magSugarRel;
        if (magKepSugar * 2 >= MAG_MIN_ATMERO) {
          magok.push({
            kepX: kep.kepX,
            kepY: kep.kepY,
            kepSugar: magKepSugar,
            vilag: cs.id === VILAG
          });
        }
      }

      // --- LERAKÁS-IGÉNY ---
      // Egyetlen szabály: van-e még várakozó testvér. A mag mérete NEM lehet
      // kiváltó ok, mert az adatból jön (`_magSugar`), nem a nagyításból — a
      // nagyítás önmagában nem szabadít fel helyet, tehát nincs mit újraosztani.
      if (cs.varolista.length > 0) {
        pakolandok.push({ id: cs.id, kep });
      }

      // --- BETÖLTÉS-IGÉNY: EGYETLEN szabály, a tudatpont-küszöb ---
      // Kiszámoljuk, mekkora tudatpont kell MOST a láthatósághoz. Ha ez lejjebb
      // került, mint ameddig eddig letöltöttünk, és van még be nem töltött gyerek,
      // akkor pontosan azokat kérjük le, amelyek épp láthatóvá váltak. Nincs lap,
      // nincs lap-határ — a küszöb folyamatosan süllyed a nagyítással.
      if (cs.vanGyereke && !cs.betoltesFut) {
        const kuszob = this._pontKuszob(cs, kep.kepSugar);
        const vanMegBetoltetlen = cs.osszesGyerekPont === 0 ||
          cs.betoltottGyerekPont < cs.osszesGyerekPont;

        // A LETÖLTÉS VÉGE IS A KAPACITÁS. A küszöb csak azt mondja meg, MI válna
        // láthatóvá — azt nem, hogy MENNYI fér a képre. Mély nagyításnál a küszöb
        // fölött százezrek is lehetnek; ha mindet lehoznánk, a várólista és vele a
        // jelölt-rendezés is elszállna. Ezért: amíg a várólistán már elég FRISS
        // anyag vár a képernyő kitöltéséhez, addig nem kérünk többet.
        //
        // Semmi nem vész el: a kurzor őrzi, hol tartunk, és amint a puffer lerakás
        // közben leapad, a következő adag pontosan onnan folytatódik.
        const varakozoTerulet = cs.varolistaRelTerulet * kep.kepSugar * kep.kepSugar;
        const kellMegAnyag = varakozoTerulet < this._kepernyoKapacitas() * BETOLTESI_TARTALEK;

        if (vanMegBetoltetlen && kuszob < cs.betoltottKuszob && kellMegAnyag) {
          betoltendok.push({ id: cs.id, kuszob, suly: kep.kepSugar });
        }
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

  // A rajzoló metódusokban SZÁNDÉKOSAN nincs console.log: képkockánként futnak,
  // elárasztanák a naplót.
  //
  // A rajzolás CSAK RAJZOL: nem tölt be és nem pakol. Azt a nagyítás VÉGÉN futó
  // `_tennivalokFeldolgozasa` végzi — így a kép nem ugrál görgetés közben, és nem
  // számolunk fölöslegesen minden képkockán.
  _rajzolas() {
    if (!this.rajzolo || !this._szelesseg) return;

    this._kepkocka++;
    this._horgonyEllenorzes();

    const { lathatoak, magok } = this._lathatoLista();

    const c = this.rajzolo;
    c.clearRect(0, 0, this._szelesseg, this._magassag);

    // A NAGYOKAT előbb, hogy a beágyazott kicsik rájuk kerüljenek
    lathatoak.sort((a, b) => b.kep.kepSugar - a.kep.kepSugar);
    for (const { cs, kep } of lathatoak) this._alakzatRajzolasa(cs, kep);

    // Az üres magok a síkidomok FÖLÖTT, de a feliratok ALATT
    for (const mag of magok) this._uresMagRajzolasa(mag);

    // Feliratok és mellék-ikonok külön menetben, hogy semmi ne takarja őket
    for (const { cs, kep } of lathatoak) this._cimkeRajzolasa(cs, kep);
    for (const { cs, kep } of lathatoak) this._mellekIkonokRajzolasa(cs, kep);

    this._utolsoLathatoak = lathatoak;

    if (this._kepkocka % TAKARITAS_KEPKOCKANKENT === 0) this._takaritas();
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
      if (this._nezet.skala * gy.relR * 2 >= MIN_KEP_ATMERO) rajzolt++;
    }

    // A KÖVETKEZŐ lerakásnál érvényes mag. A `_magSugar` második paramétere
    // TUDATPONT (a most lerakandó adag), nem képpont — ide tehát a várólistán álló
    // testvérek pontja való, pontosan úgy, ahogy az `_ujrapakolas` számolja.
    //
    // (Korábban itt a `kepSugar` állt: a napló pontból vont ki képpontot. Mély
    // nagyításnál a skála a hátralévő pont fölé nő, és a napló `magRel: 0.0000`-t
    // írt ki olyankor is, amikor a mag valójában nagy volt — épp abban a kérdésben
    // félrevezetve, amire ez a napló való.)
    const varoPont = cs.varolista.reduce((s, v) => s + (v.pont ?? 0), 0);
    const magRel = this._magSugar(cs, varoPont);

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
    if (!this.rajzolo || !this._szelesseg) return;

    const { betoltendok, pakolandok } = this._lathatoLista();
    this._allapotNaplo();

    let valtozott = false;
    for (const p of pakolandok) {
      if (this._ujrapakolas(this._tar.get(p.id), p.kep)) valtozott = true;
    }

    // Betöltések indítása (a legnagyobbak előbb)
    betoltendok.sort((a, b) => b.suly - a.suly);
    for (const b of betoltendok) {
      if (this._futoBetoltesek >= EGYIDEJU_BETOLTES) break;
      this._gyerekekBetoltese(b.id, b.kuszob);
    }

    if (valtozott) this._rajzolasKerese();
  }

  _alakzatRajzolasa(cs, kep) {
    const c = this.rajzolo;
    const leiro = sikidomLeiro(cs.entitasTipus);

    c.beginPath();
    if (leiro.forma === 'kor') {
      c.arc(kep.kepX, kep.kepY, kep.kepSugar, 0, Math.PI * 2);
    } else {
      // A sokszöget a pozicionáló körbe írjuk: így sosem lóg ki abból a helyből,
      // amit a pakolás neki szánt (a pakolás mindent körként kezel).
      const kezdo = (leiro.kezdoSzogFok * Math.PI) / 180;
      for (let i = 0; i < leiro.oldalak; i++) {
        const szog = kezdo + (i * 2 * Math.PI) / leiro.oldalak;
        const x = kep.kepX + kep.kepSugar * Math.cos(szog);
        const y = kep.kepY + kep.kepSugar * Math.sin(szog);
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath();
    }

    const aktualis = this.aktualisEntitasId && cs.id === this.aktualisEntitasId;
    const kivalasztott = this._kivalasztottId && cs.id === this._kivalasztottId;

    // Ahogy a síkidom túlnő a képernyőn, átadja a helyet a gyerekeinek: a
    // kitöltése ÉS a kerete is fokozatosan elhalványul (lásd HALVANYODAS_KEZDET).
    const lathatosag = this._halvanyodas(kep.kepSugar);
    if (lathatosag <= 0) return;

    c.fillStyle = leiro.szin;
    c.globalAlpha = (kivalasztott ? 0.38 : (aktualis ? 0.30 : 0.14)) * lathatosag;
    c.fill();

    c.globalAlpha = lathatosag;
    c.strokeStyle = leiro.szin;
    c.lineWidth = (aktualis || kivalasztott) ? 3 : 1.5;
    c.stroke();
    c.globalAlpha = 1;
  }

  // ===== ELHALVÁNYODÁS A MÉRETTEL =====
  // 1-et ad, amíg a síkidom „normál" méretű; onnantól lineárisan csökken, ahogy
  // túlnő a képernyőn. A küszöbök egysége a képernyő KISEBBIK oldala — így
  // telefonon és 4K-n ugyanott történik, amit az e-ember lát.
  //
  // @param {number} kepSugar - a síkidom képernyő-sugara
  // @returns {number} 0 és 1 közötti láthatóság-szorzó
  _halvanyodas(kepSugar) {
    const egyseg = this._kepernyoMeret();
    if (!(egyseg > 0)) return 1;

    const arany = kepSugar / egyseg;
    if (arany <= HALVANYODAS_KEZDET) return 1;

    const hanyad = (arany - HALVANYODAS_KEZDET) / (HALVANYODAS_VEGE - HALVANYODAS_KEZDET);
    return Math.max(HALVANYODAS_MARADEK, 1 - Math.min(1, hanyad));
  }

  // ===== ÜRES MAG RAJZOLÁSA (szaggatott kör) =====
  // A síkidom közepén hagyott hely a MÉG BE NEM TÖLTÖTT, gyengébb testvéreké.
  // Szaggatott vonallal jelöljük, hogy látsszon: itt még van világ, érdemes
  // befelé nagyítani. A gyökér-szint magjába súgó-feliratot is teszünk (ott
  // nincs cím, ami elfoglalná a helyet).
  _uresMagRajzolasa(mag) {
    const c = this.rajzolo;

    c.save();
    c.beginPath();
    c.arc(mag.kepX, mag.kepY, mag.kepSugar, 0, Math.PI * 2);
    c.strokeStyle = this._magSzin();
    c.lineWidth = 1;
    c.setLineDash([5, 5]);
    c.stroke();
    c.restore();

    if (mag.vilag && mag.kepSugar > MAG_FELIRAT_MIN_SUGAR) {
      c.fillStyle = this._magSzin();
      c.font = '12px system-ui, -apple-system, \'Segoe UI\', sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('üres kör', mag.kepX, mag.kepY - 8);
      c.fillText('— nagyíts befelé —', mag.kepX, mag.kepY + 8);
    }
  }

  // A szaggatott kör színe az alkalmazás halvány szövegszínéből (egyszer olvassuk
  // ki, mert a Canvas-nak konkrét szín kell, nem CSS-változó)
  _magSzin() {
    if (!this._magSzinErtek) {
      const ertek = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text-faint').trim();
      this._magSzinErtek = ertek || 'rgba(43, 35, 24, 0.45)';
    }
    return this._magSzinErtek;
  }

  // ===== CÍMKE: KÁRTYA + SORTÖRÉS, A KÖZÉPPONT FÖLÖTT =====
  // Lásd a CIMKE_* állandók magyarázatát: a koino_1.0 titlecards.js három
  // megoldását vesszük át (tördelés, háttérkártya, a középpont fölé helyezés).
  _cimkeRajzolasa(cs, kep) {
    if (kep.kepSugar * 2 < CIMKE_MIN_ATMERO) return;

    // A címke ugyanúgy halványul, mint maga a síkidom — különben egy kifelé
    // eltűnő szülő felirata ott maradna a semmiben.
    const lathatosag = this._halvanyodas(kep.kepSugar);
    if (lathatosag <= HALVANYODAS_MARADEK) return;

    const leiro = sikidomLeiro(cs.entitasTipus);
    const teljes = (cs.cim ?? leiro.nev ?? '').trim();
    if (!teljes) return;

    const c = this.rajzolo;
    const betuMeret = Math.max(11, Math.min(20, kep.kepSugar * 0.28));
    c.font = `${betuMeret.toFixed(0)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    const sorok = this._sortores(teljes, kep.kepSugar * CIMKE_SOR_SZELESSEG);
    if (sorok.length === 0) return;

    // A kártya mérete a TÉNYLEGES szövegből (nem becslésből)
    let sorSzelesseg = 0;
    for (const sor of sorok) sorSzelesseg = Math.max(sorSzelesseg, c.measureText(sor).width);

    const parkany = betuMeret * 0.45;             // belső margó, egyben a lekerekítés sugara
    const sorMagassag = betuMeret * 1.18;
    const kartyaSzelesseg = sorSzelesseg + 2 * parkany;
    const kartyaMagassag = sorok.length * sorMagassag + 2 * parkany * 0.7;

    // A kártya közepe a síkidom középpontja FÖLÖTT — ott már nem takarja a
    // középpontba pakolt legkisebb gyereket.
    const kozepY = kep.kepY - kep.kepSugar * CIMKE_FELETT_ARANY;

    c.save();
    c.globalAlpha = lathatosag;

    c.beginPath();
    this._lekerekitettTeglalap(
      kep.kepX - kartyaSzelesseg / 2, kozepY - kartyaMagassag / 2,
      kartyaSzelesseg, kartyaMagassag, parkany
    );
    c.fillStyle = CIMKE_HATTER;
    c.fill();

    c.fillStyle = '#2b2318';
    const elsoSorY = kozepY - ((sorok.length - 1) * sorMagassag) / 2;
    sorok.forEach((sor, i) => c.fillText(sor, kep.kepX, elsoSorY + i * sorMagassag));

    c.restore();
  }

  // ===== SORTÖRÉS SZÓHATÁRON, MÉRT SZÉLESSÉGGEL =====
  // A hívó már beállította a betűtípust a rajzolón — a mérés ahhoz igazodik.
  // Az utolsó sor „…"-t kap, ha nem fért ki minden. Egyetlen, önmagában is túl
  // hosszú szót nem darabolunk: azt is „…"-sal rövidítjük.
  //
  // @param {string} szoveg
  // @param {number} maxSzelesseg - egy sor legnagyobb szélessége képpontban
  // @returns {string[]} legfeljebb CIMKE_MAX_SOR sor
  _sortores(szoveg, maxSzelesseg) {
    const c = this.rajzolo;
    const szavak = szoveg.split(/\s+/).filter(Boolean);
    const sorok = [];
    let aktualis = '';

    for (const szo of szavak) {
      const proba = aktualis ? `${aktualis} ${szo}` : szo;

      if (c.measureText(proba).width <= maxSzelesseg || !aktualis) {
        aktualis = proba;
        continue;
      }

      sorok.push(aktualis);
      aktualis = szo;

      if (sorok.length === CIMKE_MAX_SOR) break;
    }

    if (sorok.length < CIMKE_MAX_SOR && aktualis) sorok.push(aktualis);

    // Az utolsó sor rövidítése, ha kilóg (vagy mert egyetlen hosszú szó, vagy
    // mert elfogytak a sorok, és még lett volna szöveg)
    const utolso = sorok.length - 1;
    if (utolso >= 0 && c.measureText(sorok[utolso]).width > maxSzelesseg) {
      let rovid = sorok[utolso];
      while (rovid.length > 1 && c.measureText(`${rovid}…`).width > maxSzelesseg) {
        rovid = rovid.slice(0, -1);
      }
      sorok[utolso] = `${rovid}…`;
    }

    return sorok;
  }

  // ===== MELLÉK-IKONOK: KATEGÓRIA (BALRA) + TARTALOMTÍPUS (JOBBRA) =====
  // A forma és a szín az entitástípust mondja meg; ezek az ikonok azt, amit a
  // forma nem tud: melyik kategóriába tartozik és milyen típusú. A Struktúra
  // nézet ugyanezt a rendezést használja, hogy a két nézet egyformán olvasható.
  _mellekIkonokRajzolasa(cs, kep) {
    if (kep.kepSugar * 2 < IKON_MIN_ATMERO) return;

    const lathatosag = this._halvanyodas(kep.kepSugar);
    if (lathatosag <= HALVANYODAS_MARADEK) return;

    // Balra a kategóriák, jobbra a típus — ugyanabban a sorban, középről kifelé
    const balra = (cs.kategoriaIkonok ?? []).filter(k => k?.ikon).slice(0, IKON_MAX_DARAB);
    const jobbra = [];
    if (cs.tipusIkon?.ikon) jobbra.push(cs.tipusIkon);
    if (cs.javaslatTipus) jobbra.push({ ikon: cs.javaslatTipus, nev: cs.javaslatTipus });

    if (balra.length === 0 && jobbra.length === 0) return;

    const sugar = Math.min(IKON_MAX_SUGAR, kep.kepSugar * IKON_SUGAR_ARANY);
    if (sugar < 5) return;                       // ilyen kicsin úgysem lehetne kivenni

    const lepes = sugar * 2.3;
    const y = kep.kepY + kep.kepSugar * IKON_ALATT_ARANY;

    const c = this.rajzolo;
    c.save();
    c.globalAlpha = lathatosag;

    balra.forEach((k, i) => {
      this._egyIkonRajzolasa(kep.kepX - (i + 0.5) * lepes, y, sugar, k.ikon, TIPUS_FORMA.Kategoria.szin);
    });
    jobbra.forEach((t, i) => {
      this._egyIkonRajzolasa(kep.kepX + (i + 0.5) * lepes, y, sugar, t.ikon, TIPUS_FORMA.TartalomTipus.szin);
    });

    c.restore();
  }

  // Egyetlen ikon: világos korong + benne a kép VAGY az emoji.
  // Az `ikonErtek` feltöltött kép URL-je (http…/…) vagy emoji — a Struktúra
  // nézet ugyanezzel a szabállyal dönt.
  _egyIkonRajzolasa(x, y, sugar, ikonErtek, keretSzin) {
    const c = this.rajzolo;

    c.beginPath();
    c.arc(x, y, sugar, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255, 255, 255, 0.9)';
    c.fill();
    c.lineWidth = Math.max(1, sugar * 0.12);
    c.strokeStyle = keretSzin;
    c.stroke();

    const kepE = typeof ikonErtek === 'string' && /^(https?:\/\/|\/)/.test(ikonErtek);

    if (!kepE) {
      c.font = `${(sugar * 1.25).toFixed(0)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#2b2318';
      c.fillText(String(ikonErtek ?? ''), x, y + sugar * 0.05);
      return;
    }

    const bejegyzes = this._ikonKep(ikonErtek);
    if (!bejegyzes?.kesz) return;                // még tölt (vagy hibás) — a korong marad

    // A képet a korongba vágjuk, hogy a nem négyzetes ikonok se lógjanak ki
    c.save();
    c.beginPath();
    c.arc(x, y, sugar - 1, 0, Math.PI * 2);
    c.clip();
    c.drawImage(bejegyzes.kep, x - sugar, y - sugar, sugar * 2, sugar * 2);
    c.restore();
  }

  // ===== IKON-KÉPEK TÁRA =====
  // A Canvas csak BETÖLTÖTT képet tud kirajzolni. Ezért URL-enként egyszer
  // betöltjük, megjegyezzük, és a betöltés végén újrarajzolást kérünk — a
  // rajzolás sosem vár a hálózatra.
  _ikonKep(url) {
    const meglevo = this._ikonTar.get(url);
    if (meglevo) return meglevo;

    const bejegyzes = { kep: new Image(), kesz: false, hibas: false };
    bejegyzes.kep.onload = () => {
      bejegyzes.kesz = true;
      this._rajzolasKerese();
    };
    bejegyzes.kep.onerror = () => {
      bejegyzes.hibas = true;
      console.warn('SikidomModal._ikonKep - az ikon nem tölthető be', { url });
    };
    bejegyzes.kep.src = url;

    this._ikonTar.set(url, bejegyzes);
    return bejegyzes;
  }

  // Lekerekített téglalap útvonala (a Canvas `roundRect`-je még nem mindenhol van meg)
  _lekerekitettTeglalap(x, y, szelesseg, magassag, sugar) {
    const c = this.rajzolo;
    const r = Math.max(0, Math.min(sugar, szelesseg / 2, magassag / 2));

    c.moveTo(x + r, y);
    c.lineTo(x + szelesseg - r, y);
    c.quadraticCurveTo(x + szelesseg, y, x + szelesseg, y + r);
    c.lineTo(x + szelesseg, y + magassag - r);
    c.quadraticCurveTo(x + szelesseg, y + magassag, x + szelesseg - r, y + magassag);
    c.lineTo(x + r, y + magassag);
    c.quadraticCurveTo(x, y + magassag, x, y + magassag - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  _folyamatJelzo(latszik) {
    document.getElementById('sikidom-folyamat')?.toggleAttribute('hidden', !latszik);
  }

  // ===== TAKARÍTÁS =====
  // A régóta nem látott ágak gyerekeit elengedjük, hogy a tár ne nőjön korlátlanul.
  // A horgony ŐSEIT és magát a horgonyt sosem bántjuk — azokra a keret-számításhoz
  // szükség van.
  _takaritas() {
    // KÜLÖN kapcsoló, nem a rajzolás-szűrésé (lásd `AGAK_ELENGEDESE`)
    if (!AGAK_ELENGEDESE) return;

    const vedett = new Set([VILAG]);
    let p = this._horgony;
    while (p && this._tar.has(p)) {
      vedett.add(p);
      p = this._tar.get(p).szuloId;
    }

    let elengedett = 0;
    for (const cs of [...this._tar.values()]) {
      if (vedett.has(cs.id)) continue;
      if (cs.gyerekIdk.length === 0) continue;
      if (this._kepkocka - cs.utoljaraLatva < ELENGEDES_TURELEM) continue;

      elengedett += this._reszfaTorlese(cs);
    }

    if (elengedett > 0) {
      console.log('SikidomModal._takaritas', { elengedett, tarMeret: this._tar.size });
    }
  }

  // Egy csomópont ALATTI részfa törlése a tárból (a csomópont marad)
  _reszfaTorlese(cs) {
    let darab = 0;
    const sor = [...cs.gyerekIdk];
    while (sor.length) {
      const id = sor.pop();
      const gyerek = this._tar.get(id);
      if (!gyerek) continue;
      sor.push(...gyerek.gyerekIdk);
      this._tar.delete(id);
      darab++;
    }

    // A szülő visszaáll „még nem töltöttük be" állapotba
    cs.gyerekIdk = [];
    cs.varolista = [];
    cs.varolistaRelTerulet = 0;
    cs.helyezettIdk = new Set();
    cs.helyezettPont = 0;
    cs.magSugarRel = Infinity;
    cs.kulsoSugar = 0;
    cs.betoltottGyerekPont = 0;
    cs.betoltottKuszob = Infinity;
    cs.kurzorPont = null;
    cs.kurzorId = null;
    return darab;
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

      const egyseg = e.ctrlKey      ? GORGO_EGYSEG_CSIPPENTES
                   : e.deltaMode === 1 ? GORGO_EGYSEG_SOR
                   : e.deltaMode === 2 ? GORGO_EGYSEG_OLDAL
                   : GORGO_EGYSEG_KEPPONT;

      const szorzo = Math.pow(2, -e.deltaY * egyseg);
      if (!(szorzo > 0) || szorzo === 1) return;

      const teglalap = nezetElem.getBoundingClientRect();
      this._zoom(szorzo, e.clientX - teglalap.left, e.clientY - teglalap.top);
    }, { passive: false });
  }

  // ===== A GESZTUS PILLANATNYI ÁLLAPOTA =====
  // Az ÖSSZES lenyomott ujj közül az első kettőt vesszük (három ujjnál sem esik
  // szét a kezelés). Egy ujjnál a „középpont" maga az ujj, a távolság 0 — ilyenkor
  // a hívó nem nagyít, csak mozgat.
  //
  // A koordináták KÉPERNYŐ-koordináták (clientX/Y); a nézet-elemhez viszonyítást
  // a hívó végzi el, ahol szükséges.
  //
  // @returns {{kozepX:number, kozepY:number, tavolsag:number}|null}
  _gesztusMerese() {
    const mutatok = [...this._aktivMutatok.values()];
    if (mutatok.length === 0) return null;

    const [a, b] = mutatok;
    if (!b) return { kozepX: a.x, kozepY: a.y, tavolsag: 0 };

    return {
      kozepX: (a.x + b.x) / 2,
      kozepY: (a.y + b.y) / 2,
      tavolsag: Math.hypot(a.x - b.x, a.y - b.y)
    };
  }

  _zoom(szorzo, kozepX, kozepY) {
    // Bármilyen kézi nagyítás megszakítja a futó illesztés-animációt — különben
    // az visszarántaná a képet az e-ember keze alól.
    if (this._illesztesAnimacio) {
      cancelAnimationFrame(this._illesztesAnimacio);
      this._illesztesAnimacio = null;
    }

    const hatarolt = this._kifeleHatarolas(szorzo);
    if (hatarolt === 1) return;                  // már a határon állunk, nincs mit tenni

    this._nezet.skala *= hatarolt;
    this._nezet.eltolasX = kozepX - (kozepX - this._nezet.eltolasX) * hatarolt;
    this._nezet.eltolasY = kozepY - (kozepY - this._nezet.eltolasY) * hatarolt;
    this._rajzolasKerese();

    // A kép azonnal követi a nagyítást, de az ÚJ síkidomok csak a végén jelennek meg
    this._zoomVegeUtemezes();
  }

  // ===== A KIFELÉ NAGYÍTÁS ALSÓ HATÁRA =====
  // Befelé nincs korlát (arra való a horgonyváltás). Kifelé viszont a VILÁG
  // szintnél elfogy a hierarchia, és tovább kicsinyítve minden a láthatósági
  // küszöb alá esne — üres képernyő. A határt az illesztési nagyításhoz mérjük.
  //
  // Csak a VILÁG horgonynál kell vizsgálni: mélyebbről a `_horgonyEllenorzes`
  // úgyis fölfelé lépteti a horgonyt, amíg ide nem ér.
  //
  // @param {number} szorzo - a kért nagyítás-szorzó
  // @returns {number} a ténylegesen alkalmazható szorzó (1 = nincs mozgás)
  _kifeleHatarolas(szorzo) {
    if (szorzo >= 1) return szorzo;              // befelé sosem korlátozunk
    if (this._horgony !== VILAG) return szorzo;  // van még hova fölfelé lépni
    if (!(this._alapSkala > 0)) return szorzo;   // még nem volt illesztés

    const alsoHatar = this._alapSkala * KIFELE_HATAR;
    if (this._nezet.skala <= alsoHatar) return 1;

    return Math.max(szorzo, alsoHatar / this._nezet.skala);
  }

  _zoomKozeppontra(szorzo) {
    this._zoom(szorzo, (this._szelesseg || 0) / 2, (this._magassag || 0) / 2);
  }

  // ===== KOPPINTÁS =====
  // A találatot számítással keressük (nincs elemenkénti DOM). A LEGKISEBB
  // találat nyer: a beágyazott gyerek van fölül, azt akarta az e-ember.
  _koppintas(kepX, kepY) {
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
    this._kartyaMegjelenitese(talalat.cs.id, talalat.cs.entitasTipus);
  }

  // ===== EGYETLEN KÁRTYA MEGJELENÍTÉSE =====
  // Koppintásra NEM váltunk pakli nézetre — az alsó sáv úgyis ott marad, onnan
  // bármikor át lehet váltani. Csak a megkoppintott entitás kártyáját mutatjuk
  // meg, bezárhatóan; a kártya saját hamburger menüjéből lehet az ADOTT ÁGRA
  // pakli nézetbe váltani („Pakli nézet" menüpont, lásd extraMenuOpciok).
  async _kartyaMegjelenitese(entitasId, entitasTipus) {
    console.log('SikidomModal._kartyaMegjelenitese - KEZDÉS', { entitasId, entitasTipus });

    const panel = document.getElementById('sikidom-kartya-panel');
    const hely = document.getElementById('sikidom-kartya-hely');
    if (!panel || !hely) return;

    hely.innerHTML = '';
    panel.removeAttribute('hidden');

    // Ugyanaz a kérés-jelölő, mint a rajzolásnál: ha közben másra koppintanak,
    // a régi válasz ne írja felül az újabbat
    const kerés = Symbol('kartya');
    this._kartyaKeres = kerés;

    try {
      // A kártya teljes adatait a meglévő pakli-végpont adja (a `kivalasztottEntitas`
      // épp az az elem, amit kértünk) — nem kell hozzá új backend-út.
      const valasz = await apiGet(
        `pakli?entitasId=${encodeURIComponent(entitasId)}&entitasTipus=${encodeURIComponent(entitasTipus)}`,
        this.token
      );
      if (this._kartyaKeres !== kerés) return;

      const entitas = valasz?.kivalasztottEntitas;
      if (!entitas?.entitasId) {
        hely.innerHTML = '<p class="sikidom-modal__betoltes-szoveg">Az adatlap nem tölthető be.</p>';
        return;
      }

      const kartya = kartyaLetrehozasa({
        entitas,
        kivalasztott: true,
        onKivalasztas: () => {},                 // a síkidomban nincs kártya-váltás
        token: this.token,
        modalKontenerAzon: this._alKontenerBiztositasa(),
        ujratoltesCb: () => this._kartyaMegjelenitese(entitasId, entitasTipus),
        onHamburgerMegnyitas: () => {}
      });

      // A NÉZET-FÜGGŐ menüpont: innen lehet az adott ágra pakli nézetbe váltani.
      // (A pakliban ennek nem volna értelme, ezért nem a kártya alap-menüjében van.)
      kartya.extraMenuOpciok = [{
        ikon:       '🃏',
        felirat:    'Pakli nézet',
        elvalaszto: true,
        akcio:      () => this._pakliraValtas(entitasId, entitasTipus)
      }];

      const kartyaDom = await kartya.init();
      if (this._kartyaKeres !== kerés) return;
      if (kartyaDom) hely.appendChild(kartyaDom);

      // A kártya szövege külön végponton érkezik (mint a pakliban)
      this._kartyaSzovegBetoltese(kartya, entitas, kerés);

      console.log('SikidomModal._kartyaMegjelenitese - VÉGE', { entitasId });
    } catch (hiba) {
      console.error('SikidomModal._kartyaMegjelenitese - HIBA', { hiba: hiba.message });
      if (this._kartyaKeres === kerés) {
        hely.innerHTML = '<p class="sikidom-modal__betoltes-szoveg">Az adatlap nem tölthető be.</p>';
      }
    }
  }

  // A kártya szövegtörzse (a pakli külön végponton adja, hogy a lista gyors legyen)
  async _kartyaSzovegBetoltese(kartya, entitas, kerés) {
    try {
      const valasz = await apiGet(
        `pakli/szoveg/${entitas.entitasTipus}/${entitas.entitasId}`, this.token
      );
      if (this._kartyaKeres !== kerés) return;
      if (typeof kartya.bodyFrissitese === 'function') {
        kartya.bodyFrissitese(valasz?.szoveg ?? null);
      }
    } catch (hiba) {
      console.warn('SikidomModal._kartyaSzovegBetoltese - a szöveg nem tölthető be', {
        hiba: hiba.message
      });
      if (typeof kartya.bodyFrissitese === 'function') kartya.bodyFrissitese(null);
    }
  }

  _kartyaBezarasa() {
    console.log('SikidomModal._kartyaBezarasa');
    this._kartyaKeres = null;
    const panel = document.getElementById('sikidom-kartya-panel');
    const hely = document.getElementById('sikidom-kartya-hely');
    panel?.setAttribute('hidden', '');
    if (hely) hely.innerHTML = '';
    this._kivalasztottId = null;
    this._rajzolasKerese();
  }

  // A „Pakli nézet" menüpont: bezárjuk a síkidom nézetet, és a pakli az adott
  // entitásra navigál (ezt a foOldal adja át onEntitasKivalasztas-ként).
  _pakliraValtas(entitasId, entitasTipus) {
    console.log('SikidomModal._pakliraValtas', { entitasId, entitasTipus });
    this._kartyaBezarasa();
    this.bezaras();
    if (typeof this.onEntitasKivalasztas === 'function') {
      this.onEntitasKivalasztas(entitasId.toString(), entitasTipus);
    }
  }

  // A kártya saját modáljainak konténere (a body végén, a nézet fölött)
  _alKontenerBiztositasa() {
    let kontener = document.getElementById(ALMODAL_KONTENER_ID);
    if (!kontener) {
      kontener = document.createElement('div');
      kontener.id = ALMODAL_KONTENER_ID;
      document.body.appendChild(kontener);
    }
    return ALMODAL_KONTENER_ID;
  }
}

// ===== EXPORTÁLÁS =====
export default SikidomModal;
