// koino/koino.js

// Felelősség: a koino parancssori arca — ezzel lehet KÉZZEL végigjátszani a teljes kört
// egyetlen készüléken, böngésző nélkül.
//
// ⭐ MIÉRT NEM BÖNGÉSZŐ? (D29, Csaba döntése 2026-08-28) Mert a böngésző korlátai nem a
// koino korlátai: egy lap nem tud portot nyitni, nem fogad kapcsolatot, elrejti a saját
// címeit, és bezáráskor eltűnik. A koino önálló program; a böngésző legfeljebb egy kliens
// lehet később.
//
// ⚠️ EZ NEM A KOINO FELÜLETE. Ez fejlesztői eszköz, ugyanúgy, ahogy a korábbi böngészős
// nézet is az volt: a modell kipróbálására való. A valódi felület a prototípus
// pakli-nézetéből öröklődik (D22, docs/felulet_terv.md), amikor a modell megállapodott.
//
// Használat:
//   node koino/koino.js                          — mi az állapot
//   node koino/koino.js kulcs                    — ki vagyok, hol a kulcsom
//   node koino/koino.js koino "A koino neve" [leírás] [nyilt]  — koino létrehozása (alapból ZÁRT, D89/2)
//   node koino/koino.js gondolat "Cím" "szöveg"  — új gondolat (+100 tudatpont)
//   node koino/koino.js pont <azonosító> <pont> [passziv]
//   node koino/koino.js javaslat <azonosító> "Új cím" ["indoklás"]
//   node koino/koino.js torol <azonosító> ["indoklás"]
//   node koino/koino.js athelyez <mit> <hova|gyoker> ["indoklás"]
//   node koino/koino.js egyesit <az1>,<az2>[,...] "Egyesített cím" ["indoklás"]
//   node koino/koino.js belep [alapítás]          — ⭐ a SAJÁT azonosság-szeletem
//   node koino/koino.js meghiv <horgony>          — ⭐ 1. lépcső: tagság
//   node koino/koino.js felhatalmaz <horgony>     — ⭐ rábízom a tanúsítást (D60)
//   node koino/koino.js tanusit <horgony>         — ⭐ 2. lépcső: pénztárca (D11)
//   node koino/koino.js bemutatkoz <horgony>      — ⭐ találkoztunk (D62)
//   node koino/koino.js visszavon <horgony>       — ⭐ a felhatalmazás visszavétele
//   node koino/koino.js lattam                    — ⭐ buli-elismerés (D61)
//   node koino/koino.js altalanos "Az álláspont" <hely> ["indoklás"]  — ÁLTALÁNOS javaslat
//   node koino/koino.js allast <egyezmény> csatlakozik|tiltakozik|utkozik [másik] [indoklás]
//   node koino/koino.js felszabadit [buli]
//   node koino/koino.js szavaz <javaslat> tamogat|ellenez|tartozkodik [kulonag]
//   node koino/koino.js mentes <fájl>            — a kulcs kimentése
//   node koino/koino.js visszatolt <fájl>        — …és a visszahozása egy másik készüléken
//   node koino/koino.js orjarat [perc] [port]    — ⭐ a készülék MAGÁTÓL dolgozik
//   node koino/koino.js figyel [port]            — UDP-kaput nyit: fogadja a cserét
//   node koino/koino.js csere                    — csere MINDEN társsal (a lista szerint)
//   node koino/koino.js csere <cím> [port]       — csere egy megadott készülékkel
//                                                  ⭐ 2026-09-26 óta MIND UDP-n (D69/2)
//   node koino/koino.js tarsak                   — kik a társaim, és mikor sikerült
//   node koino/koino.js tars <cím> [port] [név]  — társ felvétele
//   node koino/koino.js tars torol <cím> [port]  — társ levétele
//   node koino/koino.js ujjlenyomat [napok]      — „ugyanazt látjuk-e?" két készüléken
//   node koino/koino.js ujjlenyomat kiment <fájl> [napok]    — ⭐ …és ha NEM, MIBEN?
//   node koino/koino.js ujjlenyomat osszevet <fájl> [napok]    a kézi út (4. szabály)
//   node koino/koino.js tukor <cím> [port]       — ⭐ kívülről hogy látszom UDP-n? (STUN helyett)
//   node koino/koino.js cimek                    — a saját címeim (a csere-hez)
//   node koino/koino.js kapu [port] [fe80::…]    — megkéri a routert, nyisson UDP-kaput
//   node koino/koino.js hozd <azonosító>         — EGY entitás elhozása (böngésző-lekérés)
//   node koino/koino.js cimjegyzek [hirdet|keres|gyoker|hirdetes]  — ⭐ D91: a DHT-n hirdetett címjegyzék
//   node koino/koino.js kerelem fejlecek|torzs <az> [cím] [port]   — ⭐ D92: a kérelem (fejlécek mintákkal, törzs)
//   node koino/koino.js csomag [javaslat]        — ⭐ D85 T3: a lezárt, több érintettes döntés csomagja
//   node koino/koino.js kiszolgalas [mindent|alap] — ⭐ D83/2, D95/1: a nagy szeleteket is egészében tartom?
//   node koino/koino.js osszegzes                — ⭐ D95/1: a lezárási összegzések (kiadás, és a kapott ellenőrzöttek)
//   node koino/koino.js pajzsfuro <cím> <port> [helyi port]  — ⭐ a rés: csere ÉS fájlok
//   node koino/koino.js kulsoport [port]         — kívülről melyik portomat látják?
//   node koino/koino.js felfedez [mp] [port]     — ki van még ezen a wifin?
//   node koino/koino.js tabla [kiir|olvas]       — ⭐ A HIRDETŐTÁBLA: a kötéseim, az új
//                                                  címem kiírása, a némák megkeresése
//   node koino/koino.js ter [rendezés] [irány]   — a BELÉPŐ TÉR: a koinók, amiket ismerek
//   node koino/koino.js fajlok                   — mely képek/fájlok hiányoznak
//   node koino/koino.js felulet [port]           — a felület a böngészőnek (helyi kapu)
//   node koino/koino.js kivisz <fájl> [hatókör] · behoz <fájl>   — a KÉZI ÚT (4. szabály)
//   node koino/koino.js ertek <az> <elfogadási%> <részvételi%> <min mp> <max mp>
//   node koino/koino.js kategoria <név> [ikon] [leírás] · gondolattipus <név> …
//
// ⚠️ EZ A LISTA 2026-09-14-IG ELAVULT VOLT: tizenkét meglévő parancsot nem említett.
// *A teljes, mindig érvényes lista a fájl végén, az ismeretlen parancs ágán van.*
// ⚠️ És 2026-09-21-ig a FÁJL VÉGI lista is hiányos volt: a `tabla` parancs kimaradt belőle
// (42 `case`, 41 felsorolva). *A 4. szabály szerint egy kézi út, amit a program nem kínál,
// nincs is — ezért ÚJ PARANCSNÁL mindkét listát vezesd át.*
//
// Bárhol, ahol azonosítót kér, elég a RÖVIDÍTÉSE is (mint a gitben).
//
// ===== KÉT KÉSZÜLÉK EGY GÉPEN (Szakasz 2 / 1. lépés) =====
//
// A `KOINO_ADAT` változóval két külön „készülék" játszható el ugyanazon a gépen:
//
//   1. ablak:  KOINO_ADAT=./adat-A node koino/koino.js figyel 7373
//   2. ablak:  KOINO_ADAT=./adat-B node koino/koino.js csere 127.0.0.1 7373
//
// A két mappának saját kulcsa van, tehát valóban két e-ember — nem ugyanaz kétszer.

import { writeFile, readFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomInt } from 'node:crypto';
import { dirname, join } from 'node:path';

import {
  esemenyTarNyitasa, kulcsTarolo, tarsakTarolo, szeletJegyzekTarolo, udpCimTarolo,
  tablaKulcsTarolo, kotesTarolo,
  felszabaditasTarolo, alapHely,
  ismertKoinok,
  // ⭐ A FÁJLOK (5.7): tartalom-címzett tár — a név a lenyomat.
  fajlBlobTarolo, fajlTipus, FAJL_KORLAT, fajlJegyzekTarolo, memoriaBlobTarolo,
  // ⭐ D78: a lánc-gyökér gyorsítótára (a napló csúcsai és a kiosztás).
  lancTarolo,
  // ⭐ D95/1: az összegzések helyi jegyzéke (a nagy szelet gyökere, a lezárási összegzések).
  osszegzesTarolo,
  // ⭐ D95/2: a függő tagságok helyi jegyzéke.
  tagsagFuggoTarolo,
  // ⭐ D95/3: a csak küldő út kézbesítési jegyzéke.
  kezbesitesTarolo,
  // ⭐ D97/1: a közös halmaz helyi tára.
  halmazTarolo,
  // ⭐ D98/1 (F): a társankénti emlékezet helyi tára.
  emlekezetTarolo,
  // ⭐ D98/2–3: a lánc-ellenőrzés helyi tára.
  lancEllenorzesTarolo,
  // ⭐ D110: a társaktól tanult mélység helyi jegyzéke.
  melysegTarolo,
  // ⭐ D101 ⑥: a postafiók és az értesítési beállítások helyi tára
  ertesitesTarolo,
  // ⭐ Az alsó sáv (2026-10-15): a csere állapota a lapnak
  csereAllapotTarolo,
  // ⭐ D112 ① (F3): a fájl-tár kerete — a nem vállalt törzs átmeneti
  FAJL_ATMENETI_KORLAT, FAJL_FRISS, fajlTakaritasTerve
} from './js/tar/fajlTar.js';
// ⭐ Az alsó sáv (2026-10-15): mikor cserélt utoljára a készülék, és mikor jön a következő kör (helyi feljegyzés)
import { csereAllapotAlakja, korKezdete, korVege, csereFeljegyzese, csereAllapotKepe } from './js/csere/csereAllapot.js';
// ⭐⭐ D101 ⑥: az értesítés-réteg — a postafiók a készüléken, két pillanatkép különbségéből
import {
  beallitasokAlakja, ervenyesBeallitas, beallitasMentese, globalisMentese, ertesitesekSzamitasa,
  postafiokAlakja, postafiokBovitese, postafiokLapja, olvasottnakJelol, olvasatlanTerkep, keszulekErtesitesei
} from './js/allapot/ertesites.js';
// ⭐ D103: a készülék saját értesítése (az operációs rendszer felé — npm-csomag nélkül, cserélhető)
import { keszulekErtesitese } from './js/felulet/eszkozErtesites.js';
import { naploFrissitese } from './js/csere/kozosHalmaz.js';
// ⭐ D97/2: a raj a körben (69. mérés: a változott szeletek tartói sorban, aztán a forgatás).
import { rajKorAllapot, valtozottFeljegyzese, rajKorCeljai } from './js/csere/rajKor.js';
// ⭐ D70: koinónként és készülékenként EGY folyamat fűz a tárhoz — az író.
import { iroTarNyitasa } from './js/tar/iro.js';
import {
  kulcsparBiztositasa, nyilvanosKulcsSzovegesen, rovidAzonosito, kulcsparKimentese, kulcsparLeirasa,
  // ⭐ A KÉZI ÚT MÁSIK FELE (2026-09-15): eddig csak KIMENTENI lehetett a kulcsot.
  kulcsparVisszatoltese
} from './js/kulcs/kulcsTar.js';
import { koinoEsemenyei, sajatLancEsemenyei, esemenyLekerese, esemenyMentese, entitasEsemenyei } from './js/tar/esemenyTar.js';
// ⭐ B/2: a szelet-kulcs (az előléptetéshez).
import { szelet, esemenyEllenorzese, bejelentesHelyei, azonositoAlaku } from './js/esemeny/esemeny.js';
import { allapotSzamitasa, szetosztottPontok, elakadtPontok } from './js/allapot/allapotSzamitas.js';
import { ALLASPONT_MUVELET } from './js/allapot/szabalyok.js';
import { javaslatokSzamitasa, sajatSzavazat } from './js/allapot/javaslatSzamitas.js';
import { szerkesztesiEgyezmenyekAlkalmazasa } from './js/allapot/szerkesztesiVegrehajtas.js';
import { felszabaditas, buliVolt, MEGULEPEDES_BULIK } from './js/allapot/felszabaditas.js';
// ⭐ B/1–B/2: a vállalás és az átmeneti tár (D75, D86, D90).
import { vallalasSzamitasa } from './js/allapot/vallalas.js';
// ⭐⭐ D91: a címjegyzék (G) — a vakított témák, a gyökér-darab, a hirdetés üteme.
import {
  cimjegyzekTema, hirdetendoTemak, gyokerDarabTemaja, sajatGyokerDarabjai, HIRDETES_KOZ,
  keszulekKopogtatoTemaja, temaKopogtatoja, figyelendoKopogtatok,
  // ⭐ D95/4: a gyökér darabjai a cserében.
  gyokerDarabja, gyokerMelysegBecslese, gyokerDarabKulcsai, gyokerDarabKulcsa, gyokerDarabBol, GYOKER_DARAB_CEL,
  // ⭐ D106: a darab-szám a koinó saját határáig (a gyökér-lenyomat, BigInt).
  gyokerLenyomata, darabbaEsik, GYOKER_MAX_MELYSEG,
  // ⭐ A kereső-réteg ⑤: a hely darabja a régió mélységén.
  lenyomatDarabja
} from './js/csere/cimjegyzek.js';
// ⭐⭐ D92/1: a függő kérelmek (a cím nélküli kérés — a kopogtatás).
import {
  ujNyilvantartas, nyilvantartasAlakja, kerelemFelvetele, lejartakKivetele, tarshozIllo, tarshozIllok, kerelemLezarasa, probalkozas,
  ujraProbalhato,
  fuggoCelok, fuggoKopogtatok
} from './js/csere/fuggoKerelmek.js';
import { atmenetiTarNyitasa, ketTarBemenete, ketTarNezet } from './js/tar/atmenetiTar.js';
import {
  keresoTarNyitasa, bejegyzesBefogadasa, bejegyzesekEpitese, bejegyzesSzerzoi, bejegyzesAlakja, KERESO_KORLAT, TIPP_VALASZ
} from './js/tar/keresoTar.js';
import { tarsMelysegeFeljegyzese, tanultMelyseg, ervenyesMelyseg, melysegJegyzekAlakja } from './js/csere/melysegTanulas.js';
import { megujitasKeszitese, csomagTulajdonosai } from './js/tar/keresoMegujitas.js';
// ⭐⭐ A kereső-réteg ⑤: a kérdés tiszta számításai.
import {
  kerdesTerve, kerdesHelye, helyTalalatai, talalatokEllenorzese, osztottMinta, KERESES_TALALAT_KORLAT
} from './js/csere/kereses.js';
// ⭐⭐ D107 L4 (④c): a felajánlás tiszta számításai.
import {
  regioCsoportok, felajanlandok, felajanlottakFeljegyzese, osztodasokFeljegyzese, megujitasUjrahasznalhato, megujitasFeljegyzese,
  felajanlasJegyzekAlakja, uresFelajanlasJegyzek, regiobaEsoBejegyzes, FELAJANLAS_KORLAT
} from './js/csere/felajanlas.js';
import {
  keszulekKeresoHelye, keresoMelysegBecslese, keresoRegioKulcsai, keresoRegioBol, keresoRegioTemaja, sajatKeresoRegioi,
  regiobaEsik, bejegyzesHelye, osztodasMelysege, KERESO_FIOK_CEL, keresoRegioKulcsa, cimIllik
} from './js/csere/keresoReteg.js';
import {
  koinoLetrehozasa, gondolatLetrehozasa, kategoriaLetrehozasa, gondolatTipusLetrehozasa, tudatpontRendezese, ertekJavaslat,
  javaslatLetrehozasa, szavazas, allasfoglalas, TUDATPONT_KERET,
  // ⭐ A SZAKASZ 4 HÉT MŰVELETE (2026-09-12) — eddig egyik sem volt elérhető kézzel.
  belepes, meghivas, felhatalmazas, tanusitas, bemutatkozas, lattam, felhatalmazasVisszavonasa,
  // ⭐ D82: az észlelt ellentmondások bejelentése (ismétlés nélkül).
  ellentmondasokBejelentese,
  // ⭐ D85 T3: a lezárt, több érintettes döntések csomagja (a (B): a töredék szeletébe).
  dontesiCsomagokKiadasa,
  // ⭐ D93: a profil és a tagsági csomag.
  profilMegadasa, tagsagiCsomagKiadasa,
  // ⭐ D94: a 2. lépcső bemondása (a szúrópróba ezt követi).
  lepcsoBemondasKiadasa,
  // ⭐ D95/1: a nagy szelet teljes tartója kiadja a lezárt döntések összegzését.
  lezarasiOsszegzesKiadasa
} from './js/muveletek.js';
import { tagE, tanusithatE, lepcso2E, ujIdentitasNezet, tagsagiEsemenyekGyujtese } from './js/allapot/identitas.js';
// ⭐ D93/3: a zárt koinó kapuja — a tagság tiszta számítása és a tagsági csomag ellenőrzése.
import { tagsagiIndex, szerzoTagsaga, tagsagiCsomagEllenorzese, TAGSAGI_CSOMAG, LANC_TIPUSOK } from './js/allapot/tagsag.js';
// ⭐ D95/1, D95/3: a két fokú vállalás — a fokok, a szerepek a cserében, és a lezárási összegzés.
import { szeletFokai, KETFOK_KUSZOB, KETFOK_VISSZA } from './js/allapot/ketFok.js';
import { osszegzoKerdo, teljesTarto, sajatKuldo, kuldoFogado, KULDES_ELETTARTAM } from './js/allapot/osszegzoTartas.js';
import { lezarasiOsszegzesEpitese, LEZARASI_OSSZEGZES } from './js/allapot/lezarasiOsszegzes.js';
// ⭐ D95/2: a tagsági kísérők — akinek a tagságát nem tudom, annak a csomagját a cserében kérem.
import { tagsagKerdo, tagsagiKiserok } from './js/allapot/tagsagKisero.js';
import { TAGSAG_KELL } from './js/allapot/szabalyok.js';
import { beolvasztas } from './js/csere/csere.js';
// ⭐ D82: az észlelő — a beérkezett események körül bizonyítható ellentmondások.
import { ellentmondasokKeresese } from './js/allapot/eszlelo.js';
// ⭐ D98/2–4: a lánc-ellenőrzés a cserében (az A hátralévői).
import {
  lancKerdesek, lancValaszokFeldolgozasa, lancKiszolgalo, lancTarsFeljegyzese, lancTarsSzerzoje, lancEllenorzesAllasa
} from './js/allapot/lancEllenorzes.js';
import { megbizasAllapota, tanusitoiTorlodas, bemutatkozasok, onalloSzalak } from './js/allapot/jelzesek.js';
import { szeletParok, egyeztetettEsemenyek } from './js/csere/szeletEgyeztetes.js';
import { halmazLenyomata } from './js/esemeny/halmaz.js';
// ⭐ A BELÉPŐ TÉR (5.6): a koinók FÖLÖTTI nézet — a D25 tere.
import { terKartyai } from './js/allapot/ter.js';
// ⭐ MELY FÁJLOKRA VAN SZÜKSÉGEM? — a szállítás első fele (a felderítés).
import { fajlIgenyek, lenyomatUrlbol } from './js/allapot/fajlIgeny.js';
import {
  felderitesBeallitasa, uresFelderitesJegyzek, felderitesJegyzekAlakja, ujFelderites, felderitesLepese, elevultFelderitesek,
  felderitesTorlese, GYOKER_AG, FELDERITES_ALAP, FELDERITES_HATAR
} from './js/allapot/felderites.js';
import {
  kerelemOsszeallitasa, ritkasagSzerint, birtoklasBeolvasztasa, birtoklasTakaritasa,
  valaszOsszeallitasa as fajlValaszOsszeallitasa
} from './js/csere/fajlKerelem.js';
// ⭐⭐ A TÖBB FORRÁSBÓL EGY FÁJL (D68 / 6.) a UDP-n (D114, 2026-10-19): a D69/2 óta (nincs TCP) a fájl a randevún jön —
// a közös munka-jegyzék (`kozosMunkaJegyzek`) teszi egy letöltéssé, ha egyszerre több tartótól jön; a bukott lezárás tanulsága
// (`romlottJegyzes`, `valaszthatoForrasok`, `romlottFelejtes` — 29/c), a türelem a forrásokból (`turelemForrasokbol` — D68/2),
// és a befejezetlen fájlok további tartói a kör céljai közé (`aktivForrasok` — T2 (B)).
import {
  kozosMunkaJegyzek, aktivForrasok, turelemForrasokbol, valaszthatoForrasok, romlottJegyzes, romlottFelejtes
} from './js/csere/fajlAtvitel.js';
// ⭐ A KÉZI ÚT (4. szabály): fájlba vinni és fájlból hozni — ugyanazon a kapun, mint a hálózat.
import { kivitelSzovege, behozatalSzovegbol } from './js/csere/fajlCsere.js';
import {
  tarsHozzaadasa, tarsTorlese, tarsakSorrendje, megfigyelesekRavezetese, kopogasMegfigyelesei,
  sajatCimekKiszurese, sajatCimE,
  szeletCimMegjegyzese, szeletCimei, szeletJegyzekTakaritasa, rajTippekBeolvasztasa, rajAjanlat,
  // ⭐ A FRISS UDP-CÍMEK (2026-09-18): külön jegyzék, mert percekig él, nem hetekig.
  udpCimMegjegyzese, udpCimek, udpCimekBeolvasztasa, udpJegyzekTakaritasa, UDP_CIM_ELEVULES
} from './js/csere/tarsak.js';
import { pajzsfuras, kulsoCim } from './js/csere/pajzsfuro.js';
// ⭐ AZ ÁLLANDÓ UDP-KAPU (D69/3, 2026-09-25): egy foglalat a teljes futásra — az őrjárat ezen kopog.
import { udpKapuNyitasa } from './js/csere/udpKapu.js';
// ⭐⭐ A TÁBLA-KULCS ÉS A KÖTÉSEK (2026-09-20): a kötést a tábla-kulcs azonosítja, nem a
// cím — mert épp a cím az, ami elromlik.
import { ujTablaKulcs, nyilvanosResz, ervenyesTablaKulcs } from './js/csere/tablaKulcs.js';
import { szovegFeloldasa, szovegDarabbol, szovegHivatkozasE } from './js/esemeny/szovegDarab.js';
import {
  talalkozasFeljegyzese, kopogasCeljai, jegyzekTakaritasa, kotesek as kotesLista,
  tablanKeresendok, kotesCimei
} from './js/csere/kotesek.js';
// ⭐⭐⭐ A HIRDETŐTÁBLA (2026-09-20): a leszakadt készülék KIFELÉ írja ki az új címét, a
// társai KIFELÉ olvassák ki. A tábla ma a BitTorrent DHT — de cserélhető (2. szabály).
import { cimBejegyzes, cimBejegyzesbol, tarsRekesze } from './js/csere/tabla.js';
import {
  dhtKliens, ALAP_BELEPOK, gepekHirdetese, gepekBeolvasztasa
} from './js/csere/dht.js';
import { kapuNyitasa, ALAP_PORT as FELULET_PORT } from './js/felulet/kapu.js';
import {
  pakliOldal, ujPakliNezet, entitasSzovege, entitasTudatpontja, entitasReszletei, entitasKuszobei,
  kuszobokBefele,
  hianyzoFelmenok,
  // ⭐ A ház (D100): a hierarchikus pakli.
  pakliHierarchia,
  // ⭐ D101: a Tudatpontok modál listája.
  sajatHozzarendelesek,
  // ⭐ D101 ③: a Struktúra nézet.
  strukturaDarabszam, strukturaLap,
  // ⭐ D112 ③: a felderítés állása (a Struktúra sorrendje a háttérben).
  felderitesAllasa,
  // ⭐ D101 ④: a Síkidom nézet.
  sikidomGyerekek, sikidomOslanc,
  // ⭐ D101 ⑤: a Keresés (a helyi alja).
  keresesHelyben,
  // ⭐ D101 ⑥: az értesítések pillanatképe.
  ertesitesiKep,
  // ⭐ Az alsó sáv (2026-10-15): a készüléken ismert entitások száma típusonként.
  helyiStatisztika
} from './js/allapot/pakli.js';
// ⭐ A RANDEVÚ (2026-09-14): a csere ÉS a fájlok is átmennek az átfúrt résen.
// ⭐ És a szelet-kérés is a résen (D69/2): a `hozd` 2026-09-26 óta ezen megy.
import {
  csereUdpResen, fajlRandevu, szeletUdpResen, kezfogasUdpResen, kerelemUdpResen, kerelemSorozatUdpResen, valaszUdpResen
} from './js/csere/udpVonal.js';
// ⭐⭐ D92: a kérelem (az alapkérdések) és az össz-pont.
import {
  fejlecekValasza, fejlecKepe, mintakValasza, mintaKeres, fejlecekEllenorzese, torzsLenyomatai, kerelemAlakja, tovabbiUgras, UGRAS_MAX,
  SOROZAT_KORLAT
} from './js/csere/kerelem.js';
import { reszfaKarbantarto, osszPontokSzamitasa, RESZFA_HOSSZ, RESZFA_DARAB } from './js/allapot/osszPont.js';
// ⭐⭐ D109 (KK2–KK5): a kiszolgálási keret könyvelése (mennyit dolgoztam másoknak az utóbbi órában, kinek)
import {
  ujKeret, keretHatara, keretFeljegyzes, keretItelete, keretAllasa, tarsKulcsa, tarsOsztalya, keretKotesE, KERET_ALAP,
  KERET_MINDENT, KESOBB_MIN, KOTES_MIN_KOR
} from './js/csere/kiszolgalasiKeret.js';
import { GYOKER_KULCS } from './js/csere/szeletEgyeztetes.js';
// ⭐ D89/1: a kézfogás hitelesítése — a tábla-kulcs aláírja a kézfogás átiratát.
import { kezfogasAlairasa, szemelyesKezfogasAlairasa } from './js/csere/titkositas.js';
import { helyiFelfedezes, felfedezoValaszolo } from './js/csere/helyiFelfedezes.js';
import { sajatIPv6, pcpKapuKerese, upnpKorkerdes } from './js/csere/kapunyitas.js';
import {
  allapotUjjlenyomata, allapotOsszefoglaloja, elteresek, ujjlenyomatLap, ujjlenyomatLapBol
} from './js/allapot/osszehasonlitas.js';

// ===== ÁLLANDÓK =====

const KOINO = process.env.KOINO_AZONOSITO ?? 'sajat';
const KEZDO_PONT = 100;
const NAP = 86400 * 1000;
const ALAP_PORT = 7373;

// ⛔⛔ ITT ELŐSZÖR EGY BEÉGETETT `MENET_KORLAT = 5` ÁLLT — és a 9. szabály elkapta.
//
// Csaba kérdése (*„ez akkor most azt jelenti, hogy a mostani rendszer nem skálázható
// végtelenig?"*) egy valódi hiányt talált: a terjedés ALAKJA logaritmikus, de egy beégetett
// plafon a mérettel **nem nő**. ⭐ Mérve (30. mérés, menet-szakasz), a legjobb esetben —
// mindenki ébren, egy ablakban:
//
//   |  készülék | társ | menet |
//   |   100 000 |   14 |   5,0 |  épp a határon
//   | 1 000 000 |   14 |   6,0 |  ⛔ az 5 KEVÉS
//   |     1 000 |    3 |   7,8 |  ⛔ ritka gráfon már EZERNÉL kevés
//   |   100 000 |    3 |  12,3 |  ⛔
//
// ⭐⭐ A JAVÍTÁS: a korlát ne SZÁM legyen, hanem maga az ABLAK. A menetek addig futnak,
// amíg van újdonság ÉS még tart az ablak (a következő percfordulóig). Ettől
//
//   · a korlát a **mérettel együtt nő** — ahány menet belefér, annyi fut;
//   · a **rosszindulat ellen ugyanúgy véd** (az ablak véges, tehát a ciklus véges);
//   · és **nincs benne varázsszám**: az ablak hosszát az e-ember úgyis megadja (`perc`).
//
// *Ugyanaz az elv, mint a türelemnél (28. mérés): a határt ne találjuk ki, hanem abból
// következzen, ami amúgy is adott.*
//
// ⚠️ A `MENET_PLAFON` csak a legvégső szelep — ha valaki nulla percet ad meg, az ablak
// nem korlátoz. *Nem állapot-befolyásoló állandó (D66).*
const MENET_PLAFON = 1000;

// A napló alapból néma (a koino minden metódusa naplóz) — KOINO_NAPLO=1 bekapcsolja
const naplo = console.log;
if (!process.env.KOINO_NAPLO) { console.log = () => {}; console.warn = () => {}; }
const kiir = (szoveg = '') => process.stdout.write(szoveg + '\n');

const SZIN = process.stdout.isTTY
  ? { jo: '\x1b[32m', nem: '\x1b[31m', halvany: '\x1b[90m', vastag: '\x1b[1m', vege: '\x1b[0m' }
  : { jo: '', nem: '', halvany: '', vastag: '', vege: '' };

// ===================================
// INDULÁS: kulcs + tár
// ===================================

const tarolo = kulcsTarolo();

// ===================================
// ⛔⛔ A VISSZATÖLTÉS AZ EGYETLEN PARANCS, AMI A KULCS-BIZTOSÍTÁS ELŐTT FUT
// ===================================
//
// ⚠️ MIÉRT ITT, ÉS NEM A TÖBBI PARANCS KÖZÖTT (mérve, 2026-09-15): a `kulcsparBiztositasa`
// minden induláskor lefut, a `switch (parancs)` viszont csak jóval később. Vagyis aki a
// mentett kulcsával akart visszatérni, ELŐBB kapott egy vadonatúj azonosságot, és ezt
// olvasta: *„Új kulcs készült — ez mostantól a személyazonosságod."*
//
// ⭐ Igaz mondat a lehető legrosszabb pillanatban: pont azt állítja, amit az e-ember épp
// meg akar előzni. Ugyanaz a csapda, mint az `Allaspont`-nál és a `fajlok` feliratánál —
// *ahol a szöveg mást mond, mint a szándék, ott valaki a szöveget hiszi el.*
//
// Ezért a visszatöltés a kulcs SZÜLETÉSE ELŐTT dől el, és utána kilépünk: ez a parancs
// nem a koinóval dolgozik, hanem magával a személyazonossággal.
const [parancs, ...ervek] = process.argv.slice(2);

if (parancs === 'visszatolt') {
  try {
    const honnan = ervek[0];
    if (!honnan) {
      throw new Error('Melyik fájlból? node koino/koino.js visszatolt <fájl> [felulir]');
    }
    // ⭐ A `felulir` KIMONDOTT engedély (a koino mintája: `belep [alapítás]`,
    // `szavaz … kulonag`) — a programnak nincs interaktív kérdése, és ez jó így: egy
    // igen/nem kérdésre könnyebb gépiesen rábólintani, mint kiírni, mit akarsz.
    const felulir = ervek.includes('felulir');
    const fajlTartalom = await readFile(honnan, 'utf8');

    const eredmeny = await kulcsparVisszatoltese(tarolo, fajlTartalom, { felulir });

    kiir(SZIN.vastag + 'A kulcs visszatöltve — ez mostantól a személyazonosságod.'
      + SZIN.vege);
    kiir('  ' + rovidAzonosito(eredmeny.azonosito));
    kiir(SZIN.halvany + '  A kulcs helye: ' + tarolo.fajl + SZIN.vege);
    if (eredmeny.elhagyott) {
      // ⛔ D19: ha eldobtunk valamit, azt KIMONDJUK — akkor is, ha kérték.
      kiir(SZIN.nem + '  ⚠ A korábbi kulcs ELVESZETT: '
        + rovidAzonosito(eredmeny.elhagyott) + SZIN.vege);
    }
    kiir(SZIN.halvany + 'Az események a te lépéseiddel folytatódnak; amit ezzel a kulccsal'
      + ' írtál alá, az újra a tiéd.' + SZIN.vege);
    process.exit(0);
  } catch (hiba) {
    kiir(SZIN.nem + 'Nem sikerült: ' + hiba.message + SZIN.vege);
    if (process.env.KOINO_NAPLO) naplo(hiba);
    process.exit(1);
  }
}

const { kulcspar, ujE } = await kulcsparBiztositasa(tarolo);
const szerzo = await nyilvanosKulcsSzovegesen(kulcspar.publicKey);

/**
 * ⛔⛔ EGY KOINÓ TÁRA AZ ÍRÓ MÖGÖTT (D70, 2026-09-26). Egy készüléken több folyamat dolgozik
 * ugyanazon a táron (az őrjárat, a második ablak parancsa, a felület) — a fájlhoz közülük
 * mindig CSAK EGY fűz: az író. Aki nem az, átadja neki az eseményt; ha nincs élő író, ő lesz.
 * *A lánc vége így egyetlen helyen dől el — a saját láncunk nem ágazhat el két ablak miatt.*
 */
async function koinoTaraNyitasa(koino) {
  return iroTarNyitasa(await esemenyTarNyitasa(koino), {
    mappa: join(alapHely(), koino),
    jelez: (e) => console.log('író', e)
  });
}

const tar = await koinoTaraNyitasa(KOINO);
// ⭐⭐ B/2 (D75): AZ ÁTMENETI TÁR — amit csak láttam (a `hozd` válasza): eldobható, a legrégebben megnézett megy.
const atmeneti = await atmenetiTarNyitasa(KOINO, join(alapHely(), KOINO));
// ⭐⭐ D107 L1 (a kereső-réteg ③): A KERESŐ-TÁR — a régióm bejegyzései; puha állapot, a koinó állapotába NEM számít
// (a csomagok pont-eseményei más gondolatokról szólnak — `keresoTar.js`).
// ⭐ ④b (K3): a tagság-ellenőrző a tagsági kérdező (lent) — a nem tudott szerző a függő tagság-kérdések közé is felkerül, és a
// következő csere tagsági köre elhozza a csomagját (D95/2).
const keresoTar = await keresoTarNyitasa(KOINO, join(alapHely(), KOINO), { tagE: (sz) => tagsagKerdes.tagE(sz) });

/**
 * ⭐ Az ÁTMENETI tár mint cél (a `hozd`, a függő szelet-kérelem): ami a TARTÓS táramban már megvan (pl. a szelettel jött
 * tagsági kísérő — a koinó születése, egy lánc), azt nem mentjük oda még egyszer. Ugyanaz a három művelet, amit az
 * `esemenyMentese` kér (`esemeny`, `sorszamSzerint`, `hozzafuz`) — a „megvan-e?” mindkét tárból.
 */
const atmenetiCel = {
  esemeny: async (az) => (await tar.esemeny(az)) ?? atmeneti.esemeny(az),
  sorszamSzerint: (sz, n) => atmeneti.sorszamSzerint(sz, n),
  hozzafuz: (e) => atmeneti.hozzafuz(e)
};

// ===================================
// ⭐⭐ A KERESŐ-RÉTEG ③ — a régióim és a saját bejegyzéseim
// ===================================

/**
 * ⭐ A kereső-régióim: a mélység a nálam lévő bejegyzések helyéből (a gyökér-darab mintája — `keresoMelysegBecslese`), a
 * régiók a tábla-aláíróm helyén, a mélység ±1 szintjén (`keresoReteg.js`). ⏸️ K10: egy új készülék mélysége így 0 — a
 * kereső-átvizsgálás 12. szakasza (Csabáé).
 */
async function keresoRegioim() {
  const alairo = (await tablaKulcsBiztositasa()).alairoNyilvanos;
  const cel = Number(process.env.KOINO_KERESO_REGIO_CEL) > 0 ? Number(process.env.KOINO_KERESO_REGIO_CEL) : undefined;
  const { melyseg: sajat, becsles } = keresoMelysegBecslese(keresoTar.helyek(), keszulekKeresoHelye(alairo), cel);
  // ⭐⭐ D110: a társaktól tanult mélység — csak mélyebbre (a friss társak mediánja − 1).
  const tanult = await tanultMelysegem('k');
  const melyseg = ervenyesMelyseg(sajat, tanult);
  const kulcsok = keresoRegioKulcsai(alairo, melyseg);
  return { melyseg, sajat, tanult, becsles, regiok: kulcsok.map((kulcs) => ({ kulcs, ...keresoRegioBol(kulcs) })) };
}

// ===================================
// ⭐⭐ D110: A TANULT MÉLYSÉG — a társak bemondásából (`melysegTanulas.js`)
// ===================================

/** A tanult mélység egy fajtára (`g` a gyökér-darab, `k` a kereső-régió) — vagy null. */
async function tanultMelysegem(fajta) {
  return tanultMelyseg(melysegJegyzekAlakja(await melysegTarolo(KOINO).olvas()), { fajta });
}

/** Egy társ bemondott mélységeinek feljegyzése (a csere után — a tábla-aláírója alatt). */
async function tarsMelysegeiFeljegyzese(alairo, m) {
  if (typeof alairo !== 'string' || !m) return;
  const t = melysegTarolo(KOINO);
  let j = melysegJegyzekAlakja(await t.olvas());
  if (Number.isInteger(m.g)) j = tarsMelysegeFeljegyzese(j, { fajta: 'g', tars: alairo, melyseg: m.g });
  if (Number.isInteger(m.k)) j = tarsMelysegeFeljegyzese(j, { fajta: 'k', tars: alairo, melyseg: m.k });
  try { await t.ir(j); } catch { /* nem végzetes */ }
}

/**
 * ⭐ A felajánlás KÉZI útja (4. szabály — a ④ automatikus felajánlása előtt): a gondolataim bejegyzései (ahol nekem is
 * pontom van), ha legalább két tulajdonosuk van (K3). A pont-események a NYERTESEK (az állapot főkönyvéből — a szabály-réteg
 * csak a tag pontját számolja, D93/1), a cím a MAI cím: ha egy elfogadott javaslat adta, a javaslattal együtt (K9); ha a mai
 * címet adó javaslatot nem találom, a gondolat kimarad (amit nem tudok igazolni, azt nem ajánlom fel).
 * @returns {Promise<Array<Object>>}
 */
async function sajatBejegyzesek(allapot) {
  const v = await sajatVallalasa(allapot);
  // ⭐ ④c: a megújításomat újrahasznosítom, amíg érvényes a mai csomagra és nem esedékes (különben minden kör új aláírás —
  // új azonosító — újra-felajánlás); a jegyzék helyi (`felajanlasok.json`).
  let jegyzek = await felajanlasJegyzekOlvasasa();
  let jegyzekValtozott = false;
  const pontjai = new Map();               // entitás → a nyertes pont-események azonosítói
  for (const [kulcs, az] of allapot.pontEsemenyek ?? []) {
    const ent = kulcs.slice(kulcs.lastIndexOf('|') + 1);
    if (!pontjai.has(ent)) pontjai.set(ent, []);
    pontjai.get(ent).push(az);
  }
  const esemenyIde = async (az) => (await tar.esemeny(az)) ?? (await atmeneti.esemeny(az));
  const ki = [];
  for (const [g, p] of v.pontok) {
    if (!(p > 0)) continue;
    const szuletes = await esemenyIde(g);
    if (szuletes?.tipus !== 'GondolatLetrehozas') continue;
    const pontEsemenyek = [];
    for (const az of pontjai.get(g) ?? []) {
      const e = await esemenyIde(az);
      if (e) pontEsemenyek.push(e);
    }
    let javaslat = null;
    const maiCim = allapot.entitasok.get(g)?.cim;
    if (typeof maiCim === 'string' && maiCim !== szuletes.adat?.cim) {
      javaslat = (await tar.bejelentesek(g)).find((e) => e.tipus === 'Javaslat' && Array.isArray(e.adat?.erintettek)
        && e.adat.erintettek.some((x) => x?.entitas === g && x?.valtozas?.cim === maiCim)) ?? null;
      if (!javaslat) continue;
    }
    // ⭐ D107 L3 (④a): a megújításom — ha a csomag tulajdonosai közt vagyok (különben a tartó elvetné).
    const megujitas = (esemenyek) => {
      if (!csomagTulajdonosai(esemenyek, g).includes(szerzo)) return null;
      const regi = megujitasUjrahasznalhato({ koino: KOINO, g, esemenyek, szerzo, regi: jegyzek.megujitasok[g] ?? null });
      if (regi) return regi;
      const m = megujitasKeszitese(szemelyesJwk, szerzo, { koino: KOINO, g, esemenyek });
      jegyzek = megujitasFeljegyzese(jegyzek, g, m);
      jegyzekValtozott = true;
      return m;
    };
    ki.push(...bejegyzesekEpitese({ szuletes, javaslat, pontEsemenyek, megujitas }));
  }
  if (jegyzekValtozott) await felajanlasJegyzekIrasa(jegyzek);
  return ki;
}

// ===================================
// ⭐⭐ D107 L4 (④c): A FELAJÁNLÁS — a gondolataim bejegyzései a régió tartóinak
// ===================================

// ===================================
// ⭐⭐ A KERESŐ-RÉTEG ⑤: A KÉRDÉS — a kérdező
// ===================================

/**
 * ⭐ Egy hely válaszának feldolgozása (3. szabály — a tartó szava nem bizonyíték): a kísérők a kapun (csak a lánc-típus és a
 * csomag, a tartós tárba — gondolat nem lesz belőlük), a találatok alakja, tartalma, a kérdésre illés és a hely
 * (`talalatokEllenorzese`); a szerzők TAGSÁGA a saját tudásomból (a kísérőkkel együtt — K3); a csomag eseményei az ÁTMENETI
 * tárba (ugyanazon a kapun: amit csak láttam — a kártya így megnyitható). @returns {Promise<{jok: Array, tagsagNelkul: number}>}
 */
async function keresesValaszFeldolgozasa(kerdes, hely, v) {
  const kiseroBe = (v.kiserok ?? []).filter((e) => e && typeof e === 'object' && e.koino === KOINO
    && (e.tipus === TAGSAGI_CSOMAG || LANC_TIPUSOK.has(e.tipus)));
  if (kiseroBe.length) await beolvasztas(tar, kiseroBe, KOINO);
  const ellenorzott = talalatokEllenorzese(v.talalatok, { kerdes, koino: KOINO, hely });
  const jok = [];
  let tagsagNelkul = 0;
  for (const t of ellenorzott) {
    let mind = true;
    for (const sz of bejegyzesSzerzoi(t.b)) if ((await tagsagKerdes.tagE(sz)) !== true) mind = false;
    if (!mind) { tagsagNelkul++; continue; }
    const r = await beolvasztas(atmenetiCel, t.b.esemenyek, KOINO);
    if (r.elutasitva?.length) continue;          // egy csomag-esemény nem ment át a kapun — a találat nem áll meg
    // ⭐ D111 (K11): a tartó-tipp — a felajánló készülék(ek) tábla-aláírója; a gondolat többi részét (szöveg, gyerekek) a
    // függő kérelem ezen keresztül kéri (a készülék kopogtató témáján — `fuggoKerelemFelvetele`).
    const tippek = Array.isArray(v.tippek?.[t.g]) ? v.tippek[t.g] : [];
    if (tippek.length) { t.tippek = tippek; await tartoTippekFeljegyzese(t.g, tippek); }
    jok.push(t);
  }
  return { jok, tagsagNelkul };
}

// ===================================
// ⭐⭐ D111 (K11): A KÉRDEZŐ TARTÓ-TIPPJEI — a keresésből jött „ki tartja” (cím nélkül)
// ===================================
//
// A keresés a gondolat bejegyzését hozza (a születés, a tulajdonosok pontjai); a többi részéhez (a szöveg, a gyerekek) a
// SZELETÉNEK tartója kell, és alapbeállítással semmi nem adja meg (a szelet DHT-hirdetése a D91/3 szerint alapból 0). A
// kereső tartó ezért a találattal azt is megmondja, melyik KÉSZÜLÉK ajánlotta fel (a tábla-aláírója — a felajánló a
// tulajdonos, tehát a szeletet vállalásból tartja). Helyi feljegyzés, nem terjed — ⛔ a raj-jegyzékbe NEM kerül (ott a
// tartók ellenőrzött cseréből állnak, címmel; ez csak tipp: a hamis tipp elérhetetlenség, nem hamisítás — D6).
const TARTO_TIPP_KORLAT = 256;
const TARTO_TIPP_ELETTARTAM = 7 * 24 * 3600 * 1000;
const tartoTippFajl = () => join(alapHely(), KOINO, 'tartotippek.json');
const TABLA_ALAIRO_MINTA = /^[A-Za-z0-9_-]{43}$/;
async function tartoTippekOlvasasa() {
  try {
    const x = JSON.parse(await readFile(tartoTippFajl(), 'utf8'));
    return x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  } catch { return {}; }
}
async function tartoTippekFeljegyzese(g, alairok) {
  const jok = [...new Set(alairok.filter((a) => typeof a === 'string' && TABLA_ALAIRO_MINTA.test(a)))].slice(0, TIPP_VALASZ);
  if (!jok.length) return;
  const j = await tartoTippekOlvasasa();
  const most = Date.now();
  const regi = Array.isArray(j[g]) ? j[g].filter((x) => x && !jok.includes(x.a)) : [];
  delete j[g];
  j[g] = [...jok.map((a) => ({ a, t: most })), ...regi].slice(0, TIPP_VALASZ);
  const kulcsok = Object.keys(j);
  for (const k of kulcsok.slice(0, Math.max(0, kulcsok.length - TARTO_TIPP_KORLAT))) delete j[k];
  try {
    await mkdir(dirname(tartoTippFajl()), { recursive: true });
    await writeFile(tartoTippFajl(), JSON.stringify(j), 'utf8');
  } catch { /* nem végzetes — a tipp csak segít */ }
}
/** Egy gondolat (szelet) tartó-tippjei — a friss (7 napnál nem régebbi) tábla-aláírók. */
async function tartoTippjei(g) {
  const j = await tartoTippekOlvasasa();
  const hatar = Date.now() - TARTO_TIPP_ELETTARTAM;
  return (Array.isArray(j[g]) ? j[g] : []).filter((x) => typeof x?.a === 'string' && TABLA_ALAIRO_MINTA.test(x.a) && x.t > hatar)
    .map((x) => x.a);
}

/**
 * ⭐⭐ A KÉRDÉS: a terv szerint (a leghosszabb szótól) helyről helyre; egy hely tartóit a DHT-n keresem (a régió témáján — a
 * mélységem a D110 szerint), vagy ha a hívó címet ad, ott kérdezek. Egy nem osztódott fiók válasza teljes — ott megállok; az
 * osztódott fiókból mintát kérek (`OSZTOTT_MINTA` darab), és a következő szóra lépek. ⭐ K9: ha a gondolatot ismerem, a
 * valódi, számított címével is szűrök. ⭐ A kereső-réteg ⑦b: a NAT mögötti tartóhoz a kérdés közvetlenül nem jut el — ha a
 * DHT-n talált tartók közül egy sem felelt, és a hívó kéri (`fuggo` — a felület), a kérdés FÜGGŐ KÉRELEM lesz (a célok a
 * tartók, a kopogtató a régió témájának párja): az őrjárat viszi tovább, a találat az átmeneti tárba jön.
 * @returns {Promise<{talalatok: Array, kerdezett: number, valaszolt: number, minta: boolean, tagsagNelkul: number, fuggoben: number}>}
 */
async function kereses(kerdes, { cim = null, port = null, fuggo = false } = {}) {
  const terv = kerdesTerve(kerdes);
  const talalatok = new Map();
  let kerdezett = 0, valaszolt = 0, minta = false, tagsagNelkul = 0, fuggoben = 0;
  const melyseg = (await keresoRegioim()).melyseg;
  const sajatGep = await sajatOsszesCim();
  const kp = await kapuPortja();
  const azonossag = await azonossagBeallitasa();
  /** Egy hely megkérdezése a tartóinál; @returns {Promise<Object|null>} az első jó válasz */
  const helyKerdezese = async (szo, s, darab) => {
    const hely = kerdesHelye(szo.kulcs, s, darab);
    const regioKulcs = keresoRegioKulcsa(melyseg, lenyomatDarabja(hely, melyseg));
    let celok = [];
    if (cim && port) celok = [{ cim, port }];
    else {
      const kliens = await tablaKliens();
      try {
        celok = (await kliens.tarsakKeresese(keresoRegioTemaja(KOINO, melyseg, lenyomatDarabja(hely, melyseg)))).tarsak
          .filter((t) => !(sajatCimE(t.cim, sajatGep) && Number(t.port) === kp)).slice(0, 4);
        await dhtIsmertekMentese(kliens);
      } catch { celok = []; } finally { kliens.bezar(); }
    }
    if (!celok.length) return null;
    kerdezett += celok.length;
    const k = { fajta: 'kereses', kulcs: regioKulcs, k: szo.kulcs, s, darab: darab.toString(16), kerdes, n: KERESES_TALALAT_KORLAT };
    const { kapu } = await keziKapuNyitasa((halo, t) => kerelemUdpResen(halo, t.cim, t.port, KOINO, k, { ...azonossag }));
    let kor;
    try {
      kor = await kapu.kopog(celok.map((c) => ({ cim: c.cim, port: Number(c.port) })), { idokorlat: KEZI_KOPOGAS_MS });
    } finally {
      kapu.zar();
    }
    let elso = null;
    for (const e of kor.eredmenyek) {
      if (!e.ok || !e.eredmeny?.kereses) continue;
      valaszolt++;
      const f = await keresesValaszFeldolgozasa(kerdes, hely, e.eredmeny.kereses);
      tagsagNelkul += f.tagsagNelkul;
      for (const t of f.jok) { const regi = talalatok.get(t.g); if (!regi || regi.frissesseg < t.frissesseg) talalatok.set(t.g, t); }
      elso ??= e.eredmeny.kereses;
    }
    if (!elso && fuggo && !cim) {
      await keresesFuggoFelvetele({ k: szo.kulcs, s, darab: darab.toString(16), kerdes }, melyseg,
        celok.map((c) => ({ hoszt: c.cim, port: Number(c.port) })));
      fuggoben++;
    }
    return elso;
  };
  for (const szo of terv) {
    const v = await helyKerdezese(szo, 0, 0n);
    if (!v) continue;
    if (!v.osztodott) break;                          // egy nem osztódott fiók válasza teljes
    minta = true;
    for (const d of osztottMinta(v.osztodott, () => randomInt(0, 2 ** 31) / 2 ** 31)) await helyKerdezese(szo, v.osztodott, d);
  }
  // ⭐ K9: ha a gondolatot ismerem (a két tárból), a valódi, számított címével szűrök.
  const { allapot } = await kepetKeszit();
  const ki = [...talalatok.values()].filter((t) => {
    const valodi = allapot.entitasok.get(t.g)?.cim;
    return typeof valodi !== 'string' || cimIllik(valodi, kerdes);
  }).sort((a, b) => b.frissesseg - a.frissesseg);
  return { talalatok: ki, kerdezett, valaszolt, minta, tagsagNelkul, fuggoben };
}

/**
 * ⭐ A kereső-réteg ⑦b: egy kérdés-hely FÜGGŐ KÉRELEMKÉNT (a kérdés is a kérelem része — `fuggoKerelmek.js` `ker`): a célok
 * a régió DHT-n talált tartói (ha vannak), a kopogtató a régió témájának párja — a tartó a címjegyzék-körében ott látja,
 * hogy kérnek tőle, és felém kopog (a NAT mögött is). ⛔ Önmagunkat nem kérdezzük.
 */
async function keresesFuggoFelvetele(ker, melyseg, celok = []) {
  const hely = kerdesHelye(ker.k, ker.s, BigInt('0x' + ker.darab));
  const regioDarab = lenyomatDarabja(hely, melyseg);
  const sajatGep = await sajatOsszesCim();
  const kp = await kapuPortja();
  const r = kerelemFelvetele(await kerelmekOlvasasa(), { fajta: 'kereses', kulcs: keresoRegioKulcsa(melyseg, regioDarab), ker,
    n: KERESES_TALALAT_KORLAT, celok: celok.filter((c) => !(sajatCimE(c.hoszt, sajatGep) && Number(c.port) === kp)),
    kopogtatok: [{ fajta: 'kereso', kulcs: melyseg + ':' + regioDarab.toString(16) }] }, Date.now(), randomUUID());
  await kerelmekIrasa(r.nyilvantartas);
  return r;
}

/**
 * ⭐ A kereső-réteg ⑦b: egy kérdés állása a függő kérelmekben — hány hely függ még, és a `ota` óta lezártakból hány találat
 * jött (a kész napló összegzéséből). @returns {Promise<{fuggo: number, megjott: number, talalat: number}>}
 */
async function keresesFuggoAllasa(kerdes, ota = 0) {
  const ny = await kerelmekOlvasasa();
  const fuggo = (ny?.fuggo ?? []).filter((x) => x.fajta === 'kereses' && x.ker?.kerdes === kerdes).length;
  let megjott = 0, talalat = 0;
  for (const x of ny?.kesz ?? []) {
    if (x.fajta !== 'kereses' || x.ker?.kerdes !== kerdes || (x.ido ?? 0) < ota) continue;
    const m = /^megjött: (\d+) találat/.exec(String(x.eredmeny));
    if (m) { megjott++; talalat += Number(m[1]); }
  }
  return { fuggo, megjott, talalat };
}

// ===================================
// ⭐⭐ A KERESŐ-RÉTEG ⑦: A HÁLÓZATI KERESÉS A FELÜLETNEK — a háttérben
// ===================================
//
// A lap nem várhat a hálózatra (a tartók felkutatása és a kérdés másodpercek): a `/api/kereses` a helyi találatokkal azonnal
// felel, és a háttérben elindítja a hálózati kérdést (kérdésenként egyszerre egyet; a kész eredmény két percig él). A
// találatok az átmeneti tárba kerülnek (`keresesValaszFeldolgozasa`), így a lap következő kérdésére a HELYI listában is ott
// vannak — a modál bájtra változatlan rajzolója rajzolja ki őket, külön kód nélkül. A `betoltes` jel szól a lapnak, hogy
// kérdezzen újra (`koinoModalok.js`).

const halozatiKeresesek = new Map();      // a normalizált kérdés → { kulcs, fut, kesz, kezdet, ido, eredmeny, hiba }
const HALOZATI_KERESES_ELETTARTAM = 2 * 60 * 1000;

/** A kérdés normalizált alakja (a háttérbeli keresés és a függő kérelmek kulcsa) — null, ha nincs mit keresni. */
function halozatiKerdes(q) {
  const kulcs = String(q ?? '').normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
  return kulcs && kerdesTerve(kulcs).length ? kulcs : null;
}

async function halozatiKereses(q) {
  const kulcs = halozatiKerdes(q);
  if (!kulcs) return null;
  let x = halozatiKeresesek.get(kulcs);
  if (x && (x.fut || Date.now() - x.ido < HALOZATI_KERESES_ELETTARTAM)) return x;
  // ⭐ ⑦b: amíg a kérdés függő kérelemként az őrjáratnál van, nem kérdezünk újra (az viszi tovább).
  if (x && (await keresesFuggoAllasa(kulcs)).fuggo > 0) return x;
  if (halozatiKeresesek.get(kulcs)?.fut) return halozatiKeresesek.get(kulcs);
  x = { kulcs, fut: true, kesz: false, kezdet: Date.now(), ido: Date.now(), eredmeny: null, hiba: null };
  halozatiKeresesek.delete(kulcs);
  halozatiKeresesek.set(kulcs, x);
  while (halozatiKeresesek.size > 64) halozatiKeresesek.delete(halozatiKeresesek.keys().next().value);
  kereses(kulcs, { fuggo: true }).then((r) => { x.eredmeny = r; }).catch((h) => { x.hiba = h.message; })
    .finally(() => { x.fut = false; x.kesz = true; x.ido = Date.now(); });
  return x;
}

const felajanlasFajl = () => join(alapHely(), KOINO, 'felajanlasok.json');
async function felajanlasJegyzekOlvasasa() {
  try { return felajanlasJegyzekAlakja(JSON.parse(await readFile(felajanlasFajl(), 'utf8'))); } catch { return uresFelajanlasJegyzek(); }
}
async function felajanlasJegyzekIrasa(j) {
  try {
    await mkdir(dirname(felajanlasFajl()), { recursive: true });
    await writeFile(felajanlasFajl(), JSON.stringify(j), 'utf8');
  } catch { /* nem végzetes */ }
}

/** A bejegyzések szerzőinek tagsági kísérői (a felajánlás terhe — a tartó ezekből ellenőrzi a tagságot, K3). */
async function bejegyzesekKiseroi(lista) {
  const szerzok = [...new Set(lista.flatMap((b) => bejegyzesSzerzoi(b)))];
  return szerzok.length ? tagsagiKiserok(tar, KOINO, szerzok, { koinoSzuletes: await koinoSzuletese(), szerzoKorlat: 256 }) : [];
}

/**
 * A felajánlás régiónként: a gondolataim bejegyzései (a kimondott osztódások szerinti mélységgel) a régióm mélységén
 * csoportosítva (D110 — a társaktól tanult mélységgel). @param {boolean} [csakUj] - csak a még fel nem ajánlottak
 * @returns {Promise<{jegyzek: Object, melyseg: number, csoportok: Map}>}
 */
async function felajanlasCsoportjai(csakUj = true) {
  const { allapot } = await kepetKeszit();
  const lista = await sajatBejegyzesek(allapot);
  const jegyzek = await felajanlasJegyzekOlvasasa();
  const melyseg = (await keresoRegioim()).melyseg;
  const csoportok = regioCsoportok(lista, melyseg, jegyzek.osztodasok);
  if (csakUj) {
    for (const [kulcs, c] of [...csoportok.entries()]) {
      c.bejegyzesek = felajanlandok(c.bejegyzesek, jegyzek);
      if (!c.bejegyzesek.length) csoportok.delete(kulcs);
    }
  }
  return { jegyzek, melyseg, csoportok };
}

/** Egy felajánlás eredményének feljegyzése: a felajánlottak (ha a tartó kiszolgálta) és a kimondott osztódások. */
async function felajanlasEredmenye(elkuldott, valasz) {
  let j = await felajanlasJegyzekOlvasasa();
  if (valasz) {
    j = osztodasokFeljegyzese(j, valasz.osztodott, elkuldott);
    // ⚠️ Az osztódott fiók bejegyzése NEM „felajánlott” — a mélyebb darab régiójába még viszem.
    const osztottK = new Set(valasz.osztodott.map((o) => o.k));
    j = felajanlottakFeljegyzese(j, elkuldott.filter((b) => !osztottK.has(b.k)));
  }
  await felajanlasJegyzekIrasa(j);
}

/**
 * ⭐ Az őrjárat (és a paraméter nélküli `kereso felajanl`) felajánló köre — egy DHT-munkamenetben: a még fel nem ajánlott
 * bejegyzéseim régiónként; a régió témáján a tartók (a hirdetőik), és egy FÜGGŐ KÉRELEM régiónként (a célok a hirdetők, a
 * kopogtató a régió témájának párja — ha a tartót közvetlenül nem érem el, ő a párján lát, és felém kopog). Egy körben
 * legfeljebb `FELAJANLAS_REGIO_KORLAT` régió. @returns {Promise<{regiok: number, celok: number}>}
 */
const FELAJANLAS_REGIO_KORLAT = 8;
async function felajanlasKor(kliens) {
  const { csoportok } = await felajanlasCsoportjai(true);
  if (!csoportok.size) return { regiok: 0, celok: 0 };
  // ⛔ Önmagunkat nem kérdezzük (a saját régiónkat mi is hirdetjük — a gép címe + a futó kapu portja, 42. mérés).
  const sajatGep = await sajatOsszesCim();
  const kp = await kapuPortja();
  let ny = await kerelmekOlvasasa();
  let regiok = 0, celokDb = 0;
  for (const [kulcs, c] of [...csoportok.entries()].slice(0, FELAJANLAS_REGIO_KORLAT)) {
    const tema = keresoRegioTemaja(KOINO, c.melyseg, c.darab);
    let celok = [];
    try {
      celok = (await kliens.tarsakKeresese(tema)).tarsak
        .filter((t) => !(sajatCimE(t.cim, sajatGep) && Number(t.port) === kp))
        .slice(0, 6).map((t) => ({ hoszt: t.cim, port: t.port }));
    } catch { celok = []; }
    const r = kerelemFelvetele(ny, { fajta: 'felajanlas', kulcs, celok,
      kopogtatok: [{ fajta: 'kereso', kulcs: c.melyseg + ':' + c.darab.toString(16) }] }, Date.now(), randomUUID());
    ny = r.nyilvantartas;
    regiok++;
    celokDb += celok.length;
  }
  await kerelmekIrasa(ny);
  return { regiok, celok: celokDb };
}

/**
 * ⭐ D107 L3 (④a, a ⑥ magja): a kereső-tár tömörítése — a lejárt bejegyzés és a régióimon (a legsekélyebb szintjükön) kívül
 * eső kiesik. Az őrjárat óránként egyszer hívja. @returns {Promise<number>} hány esett ki
 */
const KERESO_TOMORITES_KOZ = 3600 * 1000;

async function keresoTarTomoritese() {
  await keresoTar.frissit();
  const r = await keresoRegioim();
  const legsekelyebb = r.regiok[0];
  return keresoTar.tomorites((b, hely) => !legsekelyebb || regiobaEsik(hely, legsekelyebb.melyseg, legsekelyebb.darab));
}

/**
 * ⭐ B/1 (D75, D86, D90): A VÁLLALÁSOM — mely szeleteket tartom tartósan (a saját láncomból: a tudatpontos
 * szeleteim, az azonosság-szeletem, és a koinó születése).
 */
async function sajatVallalasa(allapot) {
  const lanc = (await sajatLancEsemenyei(tar, szerzo)).filter((e) => e.koino === KOINO);
  return vallalasSzamitasa(lanc, { koinoSzuletes: allapot?.koino?.azonosito ?? null, ...kifutasBeallitas() });
}

/**
 * ⭐ D104: a kifutás hossza (a pont levétele után ennyi ideig tartom még a szeletet — `vallalas.js` `KIFUTAS`, 24 óra). A
 * próbák a környezetből állíthatják (`KOINO_KIFUTAS`, ms; 0: nincs kifutás — a rontás-próba).
 */
function kifutasBeallitas() {
  const n = Number.parseInt(process.env.KOINO_KIFUTAS ?? '', 10);
  return Number.isInteger(n) && n >= 0 ? { kifutas: n } : {};
}

/**
 * ⭐ B/2: AZ ELŐLÉPTETÉS — ami az átmeneti tárban van, de már VÁLLALOM (pontot tettem rá), az átkerül a
 * tartós tárba (ugyanazon a kapun át), és az átmenetiből elmegy. Enélkül a vállalt szelet teste az
 * eldobható tárban maradna, és a korlát miatt kieshetne. ⭐ Olcsó: csak az átmeneti szeleteit veti össze a
 * vállalással (a saját láncom bejárása) — minden parancs indulásakor és az őrjárat minden körében fut.
 * @returns {Promise<number>} hány szelet lépett elő
 */
async function atmenetiElolepetese() {
  const kulcsok = atmeneti.szeletek().map((s) => s.kulcs);
  if (!kulcsok.length) return 0;
  const v = await sajatVallalasa(null);
  let db = 0;
  for (const k of kulcsok) {
    if (!v.szeletek.has(k)) continue;
    for (const e of atmeneti.mind().filter((x) => szelet(x) === k)) await esemenyMentese(tar, e);
    await atmeneti.elhagy(k);
    db++;
  }
  return db;
}

// ⭐ Az elakadt tudatpontok órája — HELYI feljegyzés, nem esemény (3. szabály).
const felszabaditasJegyzet = felszabaditasTarolo();

// ⭐ D72: a műveletek a szöveget KÜLÖN DARABKÉNT a fájl-tárba írják (ahol a képek is) — innen kapják.
const kornyezet = { koino: KOINO, kulcspar, szerzo, tar, darabTar: fajlBlobTarolo(KOINO), lancTarolo: lancTarolo(KOINO) };

if (ujE) {
  kiir(SZIN.vastag + 'Új kulcs készült — ez mostantól a személyazonosságod.' + SZIN.vege);
  kiir('  ' + rovidAzonosito(szerzo));
  kiir(SZIN.halvany + '  A kulcs helye: ' + tarolo.fajl + SZIN.vege);
  kiir(SZIN.halvany + '  Mentsd el: node koino/koino.js mentes <fájl>' + SZIN.vege);
  kiir();
}

// ===================================
// SEGÉD: AZONOSÍTÓ-RÖVIDÍTÉS FELOLDÁSA
// ===================================

/**
 * Egy rövidített azonosítót teljesre egészít ki (mint a git).
 * @param {string} toredek
 * @param {Iterable<string>} lehetosegek
 * @returns {string}
 */
/**
 * Egy gondolat szövege OLVASHATÓAN a parancssorban.
 *
 * ⚠️ A SZÖVEG KÉTFÉLE ALAKÚ LEHET, és ez nem rendetlenség, hanem történet. A `gondolat`
 * parancs egyszerű **szöveget** ad (egy sor a parancssorból), a szerkesztő viszont
 * **blokkok tömbjét** (5.7) — ugyanaz a mező, két alak. *A prototípusban is így van
 * (`szoveg[].tartalom`), tehát nem mi vezettük be.*
 *
 * ⛔ Enélkül a parancssor `[object Object]`-et írt ki a lapról létrehozott gondolatokra —
 * mérve, az 5.7 első körében. *A felület és a kéz ugyanazt az adatot nézi; ha az egyik
 * nem érti, az nem a másik hibája, hanem a közös alaké.*
 */
function szovegKifele(szoveg) {
  if (typeof szoveg === 'string') return szoveg;
  if (!Array.isArray(szoveg)) return '(ismeretlen alakú szöveg)';

  return szoveg.map((blokk) => {
    if (typeof blokk?.tartalom === 'string') return blokk.tartalom;
    // A nem szöveges blokkokat megnevezzük — nem hallgatjuk el, és nem is hazudunk
    // szöveget oda, ahol kép vagy fájl van (D19).
    if (blokk?.tipus) return '[' + blokk.tipus + ']';
    return '[?]';
  }).filter((s) => s !== '').join(' ');
}

function feloldas(toredek, lehetosegek) {
  const talalatok = [...lehetosegek].filter((a) => a.startsWith(toredek));
  if (talalatok.length === 1) return talalatok[0];
  if (talalatok.length === 0) throw new Error('Nincs ilyen azonosító: ' + toredek);
  throw new Error('Több azonosító is illik ide (' + talalatok.length + ') — írj többet belőle.');
}

// ===================================
// ⭐⭐ AZ IDENTITÁS KÉZI ÚTJA (2026-09-12) — a 4. szabály pótlása
// ===================================
//
// ⛔⛔ EGY MÁSIK SESSION KÓD-ÁTNÉZÉSE TALÁLTA: a Szakasz 4 teljes gépezete (két lépcsős
// beléptetés, kontraszt-jelzés, visszavonás — D54–D63, **52 önpróbával bizonyítva**)
// megépült, zöld volt, és **senki nem érte el**. Mérve: a `muveletek.js` tizenhat műveletet
// exportál, a `koino.js` kilencet importált; az `identitas.js` és a `jelzesek.js` egyetlen
// importálója a **saját próbája** volt.
//
// ⚠️ Ez ugyanaz a hiba, mint az `altalanos`-nál (2026-09-10), csak nagyobb léptékben — és a
// legélesebb következménye: **a visszavonás elérhetetlen volt.** A CLAUDE.md szerint *„nem a
// kapu véd, hanem hogy a rossz tanúsító elveszíti a szerepét"* — épp ezt nem tudta kimondani
// senki.

/**
 * A SAJÁT HORGONYOM: az én `Belepes` eseményem ebben a koinóban.
 *
 * ⭐ Minden rólam szóló esemény (meghívás, felhatalmazás, tanúsítás) erre a szeletre mutat,
 * és minden általam kiadott állítás **magával hozza** a horgonyomat (`sajatBelepes`) — hogy
 * az ellenőrzés mutató-követés legyen, ne keresés. Ezért a parancsoknak **nem kell beírni**:
 * a saját láncomból kiolvassuk.
 *
 * ⚠️ Az ALAPÍTÓ kivétel: neki a `KoinoLetrehozas` a horgonya (ő a rekurzió alapesete).
 */
async function sajatHorgonyom() {
  const lanc = await sajatLancEsemenyei(tar, szerzo);
  const belepesem = lanc.find((e) => e.koino === KOINO && e.tipus === 'Belepes');
  if (belepesem) return belepesem.azonosito;

  const alapitasom = lanc.find((e) => e.koino === KOINO && e.tipus === 'KoinoLetrehozas');
  if (alapitasom) return alapitasom.azonosito;
  return null;
}

/** Minden `Belepes`/`KoinoLetrehozas` horgony ebben a koinóban — a rövid azonosító feloldásához. */
async function horgonyok() {
  const esemenyek = await koinoEsemenyei(tar, KOINO);
  return esemenyek
    .filter((e) => e.tipus === 'Belepes' || e.tipus === 'KoinoLetrehozas')
    .map((e) => e.azonosito);
}

/**
 * Egy MÁSIK ember horgonyából kiolvassa, KI ő — és összeállítja az állítás adatait.
 *
 * ⭐ Miért elég a horgony? Mert a `kit` (a nyilvános kulcs) **kiszámítható belőle**: a horgony
 * egy aláírt esemény, aminek a szerzője maga a másik ember. Ha kézzel kellene mindkettőt
 * beírni, **el lehetne rontani** — és egy idegen szeletébe tett állítás nem számít.
 * *Amit le lehet vezetni, azt ne kelljen bemondani.*
 */
async function allitasAdatai(horgonyToredek) {
  if (!horgonyToredek) throw new Error('Melyik horgonyra? (a másik ember `belep`-jének azonosítója)');
  const horgonya = feloldas(horgonyToredek, await horgonyok());

  const horgonyEsemeny = await esemenyLekerese(tar, horgonya);
  if (!horgonyEsemeny) throw new Error('Nem ismerem ezt a horgonyt: ' + horgonyToredek);

  const sajatBelepes = await sajatHorgonyom();
  if (!sajatBelepes) {
    throw new Error('Előbb neked is be kell lépned ebbe a koinóba: node koino/koino.js belep');
  }
  return { kit: horgonyEsemeny.szerzo, horgonya, sajatBelepes };
}

/**
 * ⭐ D93/5: ha a koinó profilt vár, a meghívott LEGUTÓBBI profiljának lenyomata (a meghívás ezt tanúsítja); ha a
 * koinó nem vár, null. Ha várna, de a meghívottnak nincs profilja, hibát mond (mit kérj tőle).
 */
async function meghivottProfilja(adatok) {
  const { allapot } = await kepetKeszit();
  const mezok = allapot.koino?.profil ?? [];
  if (!mezok.length) return null;
  const profilok = (await entitasEsemenyei(tar, KOINO, adatok.horgonya))
    .filter((e) => e.tipus === 'Profil' && e.szerzo === adatok.kit)
    .sort((a, b) => b.sorszam - a.sorszam);
  if (!profilok.length) {
    throw new Error('A koinó profilt vár (' + mezok.join(', ') + '), a meghívottnak még nincs — kérd meg:'
      + '\n  node koino/koino.js profil ' + mezok.map((m) => m + '=...').join(' ') + '\n  és cseréljetek (vagy kivisz/behoz).');
  }
  return profilok[0].adat.lenyomat;
}

/** ⭐ D93/1: figyelmeztetés, ha a saját eseményem a tagságom miatt nem számít (D19: nem vád, hiány). */
async function tagsagFigyelmeztetes() {
  const h = await sajatHorgonyom();
  const r = h ? await tagE(tar, KOINO, h) : { igen: false, ok: 'még nincs belépésed' };
  if (r.igen) return;
  kiir(SZIN.nem + '⚠️ Nem vagy (ellenőrzött) tag — ez az eseményed NEM számít a döntésben, amíg nem kapsz meghívást'
    + ' (D93/1).' + SZIN.vege + SZIN.halvany + ' ' + r.ok + (h ? '' : ' · node koino/koino.js belep') + SZIN.vege);
}

/**
 * ⭐⭐ A FÁJL-RÉSZ EGY CSERE-KÖRHÖZ (5.7 / a szállítás).
 *
 * Két dolgot ad a cserének: **mit kérdezek** (a hiányzó fájljaim korlátos listája) és
 * **mit válaszolok** (a kérdezettek közül mi van meg nálam).
 *
 * ⚠️ A KÉRELEM ÖSSZEÁLLÍTÁSA ÁLLAPOT-SZÁMÍTÁS, tehát nem ingyen van — de **körönként
 * egyszer** fut, nem társanként: egyszer állítjuk össze, és mindenkinek ugyanazt adjuk.
 *
 * @returns {Promise<{kerelem: Array<string>|null, valasz: Function, olvas: Function}>}
 */
/**
 * ⭐ D72: egy szöveg-darab olvasója a fájl-igényhez — a darab bájtjaiból a szöveg (ha megvan).
 * ⚠️ A fájl-tár olvasása ellenőrzi a lenyomatot; egy sérült darab hiánynak számít, nem szövegnek.
 */
function szovegOlvasoKeszites(blob) {
  return async (lenyomat) => {
    const bajtok = await blob.olvas(lenyomat);
    if (!bajtok) return null;
    try { return szovegDarabbol(bajtok); } catch { return null; }
  };
}

/**
 * ⭐ D72: egy randevún megérkezett fájlból kiderülhet, hogy más fájlok is kellenek — ha a fájl
 * egy SZÖVEG-DARAB, a benne hivatkozott (nálunk még hiányzó) képek. Így a kép ugyanabban a
 * randevúban jön, mint a szöveg, nem egy bulival később.
 * ⚠️ Csak az lehet szöveg-darab, ami JSON-szöveggel vagy -tömbbel kezdődik (`"` vagy `[`);
 * egy kép bájtjait nem próbáljuk szövegként olvasni.
 * ⛔ Legfeljebb `hany`-at ad (a randevú kérés-kerete, `fajlRandevu`): amint megvan, nem járjuk
 * tovább a darabot — a többi a következő körben igény lesz.
 */
function szovegKepeiKeresre(blob) {
  return async (lenyomat, hany = Infinity) => {
    if (hany <= 0) return [];
    const bajtok = await blob.olvas(lenyomat);
    if (!bajtok || (bajtok[0] !== 0x5b && bajtok[0] !== 0x22)) return [];
    let szoveg;
    try { szoveg = szovegDarabbol(bajtok); } catch { return []; }
    if (!Array.isArray(szoveg)) return [];
    const kellenek = [];
    for (const blokk of szoveg) {
      if (kellenek.length >= hany) break;
      const l = lenyomatUrlbol(blokk?.url);
      if (l && !kellenek.includes(l) && !(await blob.van(l))) kellenek.push(l);
    }
    return kellenek;
  };
}

// ===================================
// ⭐⭐ D112 ① (F3): A FÁJL-TÁR KERETE — a nem vállalt törzs (szöveg-darab, fájl) átmeneti
// ===================================
//
// A törzs a fájl-tárba kerül (a csere randevúja, a törzs-kérelem — a lap, később a felderítés), és eddig ott is maradt,
// akkor is, ha az entitást nem vállalom. Most: ami nem VÉDETT — a vállalt entitások törzse (a pont, a saját létrehozás, a
// vállalás kifutása — `fajlIgenyek` `vallaltLenyomatok`), a profil-darabok, és a friss (`FAJL_FRISS`) —, az együtt
// legfeljebb `FAJL_ATMENETI_KORLAT`; fölötte a legrégebben érintett megy (a felület a megmutatott fájlt megérinti). A
// „mindent” készülék (D83/2) mindent tart. A tartalom-címzés miatt bármikor újra elhozható. Ritkítva fut
// (`FAJL_TAKARITAS_KOZ`): az őrjárat körében és a törzs-kérelem után; a `tomorit` kényszeríti. A próbák:
// `KOINO_FAJL_ATMENETI` (bájt), `KOINO_FAJL_FRISS` (ms).
const FAJL_TAKARITAS_KOZ = 10 * 60 * 1000;
let utolsoFajlTakaritas = 0;
const kornyezetSzam = (nev, alap) => (process.env[nev] !== undefined && Number(process.env[nev]) >= 0 ? Number(process.env[nev]) : alap);

/** @returns {Promise<null|{torolt: number, felszabadult: number, atmenetiMeret: number, mindent?: boolean, terv?: Object}>} */
async function fajlTarTakaritasa({ kenyszer = false, proba = false } = {}) {
  if (!kenyszer && Date.now() - utolsoFajlTakaritas < FAJL_TAKARITAS_KOZ) return null;
  utolsoFajlTakaritas = Date.now();
  if ((await kiszolgalasBeallitas()).mindent) return { torolt: 0, felszabadult: 0, atmenetiMeret: 0, mindent: true };
  const blob = fajlBlobTarolo(KOINO);
  const { allapot, javaslatok, esemenyek } = await kepetKeszit();
  const vallalas = await sajatVallalasa(allapot);
  // ⭐ D112 ④: a felderítés RÖGZÍTETT entitásainak törzse is védett (a felderítés saját keretében számol, nem itt).
  await atmeneti.frissit();
  const rogzitett = atmeneti.rogzitettKulcsok?.() ?? new Set();
  const { vallaltLenyomatok } = await fajlIgenyek(allapot, (l) => blob.van(l), {
    szerzo, javaslatok, szovegOlvas: szovegOlvasoKeszites(blob),
    vallaltE: (e) => !!e && ((e.hozzajarulok?.get(szerzo)?.pont ?? 0) > 0 || e.szerzo === szerzo || vallalas.szeletek.has(e.azonosito)
      || rogzitett.has(e.azonosito))
  });
  const vedett = new Set(vallaltLenyomatok);
  for (const e of esemenyek ?? []) if (e?.tipus === 'Profil' && typeof e.adat?.lenyomat === 'string') vedett.add(e.adat.lenyomat);
  const terv = fajlTakaritasTerve(await blob.allapot(), { vedett,
    korlat: kornyezetSzam('KOINO_FAJL_ATMENETI', FAJL_ATMENETI_KORLAT), friss: kornyezetSzam('KOINO_FAJL_FRISS', FAJL_FRISS) });
  if (proba) return { torolt: 0, felszabadult: terv.felszabadul, atmenetiMeret: terv.atmenetiMeret, terv };
  let torolt = 0;
  for (const l of terv.torlendo) if (await blob.torol(l)) torolt++;
  return { torolt, felszabadult: terv.felszabadul, atmenetiMeret: terv.atmenetiMeret };
}

async function fajlResz() {
  const blob = fajlBlobTarolo(KOINO);
  const megvanE = (l) => blob.van(l);
  // ⭐⭐ D84/1 (a bekapcsolás): A TÖRZS KORLÁTJA — a szöveg-darabot és a fájlokat alapból csak a VÁLLALT entitásaimra szolgálom
  // ki (amire pontot tettem); a „mindent” beállítás (D83/2) mindent kiad. Az eseményeket kiszolgálja, akinél megvannak — a
  // törzs a vállalóé. ⚠️ Ha a vállalás nem állt össze, semmit nem adunk ki (alapból), nem mindent.
  const mindent = (await kiszolgalasBeallitas()).mindent;
  let kiadhato = mindent ? null : new Set();

  let kerelem = [];
  try {
    const { allapot, javaslatok } = await kepetKeszit();
    const jegyzo = fajlJegyzekTarolo(KOINO);
    // ⭐ D72: a szöveg-darabok és a javaslatok új szövege is igény; a meglévő szöveg képei is.
    const { hianyzok, vallaltLenyomatok } = await fajlIgenyek(allapot, megvanE,
      { szerzo, javaslatok, szovegOlvas: szovegOlvasoKeszites(blob) });
    if (!mindent) kiadhato = vallaltLenyomatok;
    // ⭐ A RITKÁBBAT ELŐBB (Csaba döntése) — a jelzés a korábbi bulikból már megvan.
    kerelem = kerelemOsszeallitasa(ritkasagSzerint(hianyzok, await jegyzo.olvas()));
  } catch (hiba) {
    // ⚠️ A fájl-réteg hibája NE döntse el az esemény-cserét — a két réteg külön él (D3).
    console.warn('fajlResz - a kérelem nem állt össze', { hiba: hiba.message });
  }

  return {
    // ⚠️ A `valasz` MINDIG megvan (ez a képesség), a `kerelem` lehet üres — a
    // szimmetria a képességen múlik, nem azon, hogy épp van-e mit kérnem.
    kerelem: kerelem.length ? kerelem : null,
    valasz: (kertek) => fajlValaszOsszeallitasa(kertek, async (l) => (!kiadhato || kiadhato.has(l)) && megvanE(l)),
    // ⭐ ÉS A BÁJTOK KISZOLGÁLÁSA (5.7 / B): a cserét kezdeményező fél is forrás lehet — D84/1: csak a kiadható.
    olvas: (lenyomat) => (!kiadhato || kiadhato.has(lenyomat) ? blob.olvas(lenyomat) : null)
  };
}

// ⚠️ ITT ÁLLT 2026-09-26-IG A `fajlokElhozasa` ÉS A `fajlAtvitelKiirasa`: a kör UTÁN, TCP-n
// hozták el a hiányzó fájlokat, több forrásból egyszerre (D68). ⛔ A D69/2 óta nincs TCP a
// készülékek között — a fájl a résen jön, a randevún (`resMunkaKeszito`); a több forrás a D114 óta ott (lent).

// ⭐⭐ D114 (T1): A KÖZÖS MUNKA-JEGYZÉK — a folyamat minden fájl-hozatala (a randevú, a kérelem törzse) ezen át: ugyanaz a
// fájl két tartótól egy munkamegosztáson jön (a 79. mérés: e nélkül minden szelet kétszer, ×1,0), és itt áll a „3 egyidejű
// átvitel” (Csaba, 2026-09-13).
const fajlMunkak = kozosMunkaJegyzek();

// ⚠️ A birtoklás jegyzetét a folyamat párhuzamos munkái írják (a kör minden társával egyszerre): az olvasás–írás sorban megy,
// különben két munka egymás hírét írná felül.
let fajlJegyzetSor = Promise.resolve();
function fajlJegyzetModositasa(fn) {
  const kesz = fajlJegyzetSor.then(async () => {
    const jegyzo = fajlJegyzekTarolo(KOINO);
    await jegyzo.ir(birtoklasTakaritasa(fn(await jegyzo.olvas())));
  });
  fajlJegyzetSor = kesz.catch(() => {});
  return kesz;
}

/**
 * Amit a cserén a fájlokról tanultunk, azt elrakjuk — **helyi feljegyzés** (3. szabály):
 * sosem terjed, és csak azt mondja meg, **kitől érdemes kérni**.
 * ⭐ D114 (T5): a társ neve a hitelesített tábla-aláírója (ha van), mellette a címe — az aktív gyűjtés ezen hívja fel.
 */
async function fajlTanulsag(tarsNeve, fajlokNala, cim = null) {
  if (!Array.isArray(fajlokNala) || !fajlokNala.length) return 0;
  await fajlJegyzetModositasa((j) => birtoklasBeolvasztasa(j, tarsNeve, fajlokNala, Date.now(), cim));
  return fajlokNala.length;
}

/**
 * ⭐ D114 (T2 (B)): a kör fájl-forrás céljai — a befejezetlen letöltések (a részleges mappa; a méretet az első szelet mondja
 * meg, tehát ami így maradt, több szeletes), a ritkább előbb (kevesebb ismert tartó), és a jegyzetből a körben még nem
 * szereplő, nem romlott, címmel ismert tartóik (`aktivForrasok`).
 * @param {Array<{alairo?: string}>} celok - a kör eddigi céljai
 * @returns {Promise<Array<{alairo: string, cim: string, port: number, lenyomat: string}>>}
 */
async function aktivFajlForrasCeljai(celok) {
  const blob = fajlBlobTarolo(KOINO);
  const befejezetlen = [];
  for (const l of (await blob.reszlegesLenyomatok()).slice(0, 256)) if (!(await blob.van(l))) befejezetlen.push(l);
  if (!befejezetlen.length) return [];
  const jegyzet = await fajlJegyzekTarolo(KOINO).olvas();
  const tartok = (l) => Object.keys(jegyzet[l]?.tarsak ?? {}).length;
  befejezetlen.sort((a, b) => tartok(a) - tartok(b) || (a < b ? -1 : 1));
  return aktivForrasok(befejezetlen, jegyzet, new Set(celok.map((c) => c.alairo).filter(Boolean)));
}

/**
 * ⭐ D114 (T3–T4): a randevú forrás-tudása egy társról — a birtoklás jegyzetéből.
 *   · `valaszthato` — kérjük-e ezt a fájlt ettől a társtól: ha tőle (is) romlottan jött, és van más, ismert, nem bukott
 *     tartója, nem (29/c); ha nincs, felejtünk (egy bukás nem zárhatja el végleg az utat);
 *   · `turelem` — a fájl ismert tartóinak számából (D68/2: egy forrásnál kitartunk, sokkal nem);
 *   · `eredmeny` — a megjött fájl jegyzete törlődik (a tanulság tárgytalan, a birtokosai sem kellenek már); a romlott
 *     lezárás a próbálkozás MINDEN adóját feljegyzi ehhez a fájlhoz (nem rangsor: fájlonként, és nem vád).
 */
function fajlForrasTudas(tarsNeve) {
  return {
    async valaszthato(lenyomat) {
      const elem = (await fajlJegyzekTarolo(KOINO).olvas())[lenyomat];
      if (!elem?.romlott?.[tarsNeve]) return true;
      return valaszthatoForrasok(Object.keys(elem.tarsak ?? {}), elem.romlott).includes(tarsNeve)
        || !Object.keys(elem.tarsak ?? {}).some((t) => t !== tarsNeve && !elem.romlott[t]);
    },
    async turelem(lenyomat) {
      const elem = (await fajlJegyzekTarolo(KOINO).olvas())[lenyomat];
      return turelemForrasokbol(Object.keys(elem?.tarsak ?? {}).length);
    },
    async eredmeny(lenyomat, e, adok) {
      if (e?.kesz) {
        await fajlJegyzetModositasa((j) => { const uj = { ...romlottFelejtes(j, lenyomat) }; delete uj[lenyomat]; return uj; });
      } else if (e?.romlott && Array.isArray(adok) && adok.length) {
        await fajlJegyzetModositasa((j) => romlottJegyzes(j, lenyomat, adok));
      }
    }
  };
}

/**
 * A jelenlegi állapot és a javaslatok, adott időpontra.
 *
 * ⚠️ A TÁR ÉS A KOINO PARAMÉTER (5.6). Alapból az indításkori — így a parancssor minden
 * hívása változatlan maradt —, de a **felület** átadja az ÉPP AKTÍV koinóét, mert ott
 * futás közben lehet váltani. *Enélkül a lap a tér másik koinóján is az indításkori
 * állapotot számolná: némán rossz adatot mutatna, nem hibát.*
 */
/**
 * ⭐ D85/5: egy javaslat-entitás DÖNTÉSÉNEK azonosítója — a töredéké a csoportja (a `Javaslat`
 * esemény), minden másé önmaga. A felület a kártya azonosítóját küldi; a döntés a csoporté.
 */
function dontesAzonositoja(allapot, azonosito) {
  return allapot.entitasok.get(azonosito)?.toredek?.csoport ?? azonosito;
}

async function kepetKeszit(napokMulva = 0, melyikTar = tar, melyikKoino = KOINO) {
  // ⭐ B/2: a két tárból (az átmeneti csak a saját koinónké — a belépő tér más koinóinál nincs).
  const { esemenyek, csakAtmeneti } = await ketTarBemenete(melyikTar, melyikTar === tar ? atmeneti : null,
    melyikKoino);
  // ⭐ A szigorú (b) alatt (D97): amit nem tartok, annak a pontjai ismeretlenek — a D14 nem tüntetheti el (72. mérés).
  // ⚠️ A VÁLLALÁSBÓL (a saját láncomból), nem a részvételi halmazból: az utóbbi a töredékekhez maga is ezt a képet kéri.
  let vallalt = null;
  if (melyikTar === tar && melyikKoino === KOINO) {
    try { if (!(await kiszolgalasBeallitas()).mindent) vallalt = (await ketFokAllapota()).vallalas.szeletek; }
    catch { vallalt = null; }
  }
  const allapot = allapotSzamitasa(esemenyek, { csakAtmeneti, ...(vallalt ? { nemTartott: (az) => !vallalt.has(az) } : {}) });
  // ⭐ D95/1: a nagy szeletű részek döntése az ellenőrzött lezárási összegzésekből (az összegző tartónál).
  const osszegzesek = melyikTar === tar ? await ellenorzottOsszegzesek() : new Map();
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, Date.now() + napokMulva * NAP, { osszegzesek });

  // ⭐ A HARMADIK FÁZIS (2026-09-06): az elfogadott szerkesztési egyezményeket RÁVEZETJÜK az
  // entitásokra. ⚠️ Eddig ez hiányzott: a javaslat elfogadódott, az egyezmény megszületett,
  // a gondolat címe mégis a régi maradt. A `pakli.js` ugyanezt a három fázist futtatja —
  // így a parancssor és a lap **ugyanazt** mondja.
  await szerkesztesiEgyezmenyekAlkalmazasa(allapot, javaslatok);

  return { esemenyek, allapot, javaslatok };
}

// ===================================
// ⭐⭐ AZ ELAKADT TUDATPONT FELSZABADÍTÁSA
// ===================================

/**
 * A készülék MAGÁTÓL visszaveszi a pontot a törölt gondolatokról — megülepedés után.
 *
 * ⭐ MIÉRT SZABAD EZT A KÉSZÜLÉKNEK? Mert a koino **az én készülékemen fut, az én
 * kulcsommal**: nem más ír alá helyettem, hanem a saját készülékem könyvel. A `javaslat`
 * parancs ma is aláír egy második eseményt magától (a tudatpontot a javaslatra).
 *
 * ⚠️ ÉS AMIÉRT NEM AZONNAL: egy késve érkező, de határidőn belüli szavazat még
 * visszafordíthatja a törlést — ilyenkor a gondolat a pontom NÉLKÜL térne vissza.
 * Részletek és próbák: `js/allapot/felszabaditas.js`.
 *
 * @param {boolean} [hangos] - írja-e ki, mit tett
 * @returns {Promise<number>} hány pontot szabadított fel
 */
async function elakadtPontokFelszabaditasa(hangos = false, kellBuli = MEGULEPEDES_BULIK,
                                          sikeresTarsak = 0) {
  const { allapot } = await kepetKeszit();

  // ⭐ ELŐBB A BULI, AZTÁN A TERV. Ha ez a hívás egy csere-kör után jött, és felelt valaki,
  // az egy bulival több — a terv már ezzel számol.
  const jegyzet = buliVolt(await felszabaditasJegyzet.olvas(), sikeresTarsak);
  const terv = felszabaditas(allapot, szerzo, jegyzet, kellBuli);

  // A feljegyzést AKKOR is írjuk, ha még nincs mit felszabadítani — a számláló ilyenkor indul.
  await felszabaditasJegyzet.ir(terv.jegyzet);

  // ⭐ A BEMONDOTT ÖSSZEGET NEM MI ADJUK: a `tudatpontRendezese` a SAJÁT LÁNCBÓL számolja
  // (`sajatKiosztott`) — épp azért, hogy ne csúszhasson el attól, amit az ellenőrző számol.
  // A `felszabaditoLepesek` ugyanezt az aritmetikát mondja ki tisztán, a felület kedvéért.
  let osszesen = 0;
  for (const tetel of terv.feloldhato) {
    await tudatpontRendezese(kornyezet, tetel.entitas, 0);
    osszesen += tetel.pont;
  }

  if (hangos && osszesen > 0) {
    kiir(SZIN.halvany + '↩ ' + osszesen + ' tudatpont felszabadult törölt gondolatokról ('
      + terv.lepesek.length + ' db) — a keretedbe visszakerült.' + SZIN.vege);
  }
  if (hangos && terv.varakozok.length) {
    const v = terv.varakozok[0];
    kiir(SZIN.halvany + '⏳ ' + terv.varakozok.reduce((s, x) => s + x.pont, 0)
      + ' tudatpont törölt gondolaton áll — ' + v.tisztaBulik + '/' + v.kell
      + ' buli telt el azóta; ha nem jön újabb hír, magától felszabadul.' + SZIN.vege);
  }
  return osszesen;
}

// ===================================
// A PARANCSOK
// ===================================

// ⚠️ A `parancs` és az `ervek` FELJEBB dől el (az indulásnál), mert a `visszatolt`-nak a
// kulcs születése ELŐTT kell döntenie — lásd az ottani indoklást.

/** Ezrelék → olvasható százalék. */
const szazalek = (ezrelek) => (ezrelek / 10).toFixed(1).replace('.0', '') + '%';

// ⭐ MENNYI ADAT MENT EL? (D35) A csere ára befogadási kérdés: egy mobilos e-embernek a
// számláján jelenik meg. Ezért minden csere kiírja — ami nem látszik, azt nem lehet
// olcsóvá tenni.
// Az őrjárat sorai elé — hogy utólag látszódjon, mikor mi történt.
const ora = () => new Date().toLocaleTimeString('hu-HU');

// ⭐ NYOMOZATI SEGÉD A PAJZSFÚRÓHOZ (Csaba kérése: a sikertelen próbálkozás is mondjon
// valamit). Egy hibakód önmagában semmit nem jelent annak, aki nem hálózatos — de
// mindegyik MÁS következő lépést jelent, ezért érdemes kimondani.
const HIBA_MAGYARAZAT = {
  ENETUNREACH: 'nincs útvonal — EZEN a hálózaton nincs IPv6-kapcsolat (a csomag el sem indult)',
  EHOSTUNREACH: 'van útvonal, de a cél gép nem érhető el',
  ECONNREFUSED: '⭐ VALAKI VÁLASZOLT (elutasítással) — tehát a csomagunk ODAÉRT!',
  ETIMEDOUT: 'némán eldobták — ez tűzfalra vall (a csomag elindult, de nem jött válasz)',
  EADDRINUSE: 'a helyi port foglalt a SAJÁT gépünkön (fut még egy korábbi fúró?)',
  EACCES: 'a rendszer nem engedi ezt a portot használni',
  EPERM: 'a rendszer nem engedi ezt a portot használni',
  EADDRNOTAVAIL: 'ez a helyi cím nem létezik ezen a gépen'
};

const hibaMagyarazat = (ok) => {
  for (const [kod, szoveg] of Object.entries(HIBA_MAGYARAZAT)) {
    if (String(ok).includes(kod)) return szoveg;
  }
  if (String(ok).includes('nem válaszolt')) return HIBA_MAGYARAZAT.ETIMEDOUT;
  return null;
};

/** A saját globális IPv6-címeink — a fúró elé és a bukások mellé. */
async function sajatGlobalisCimek() {
  const halozat = (await import('node:os')).networkInterfaces();
  const cimek = [];
  for (const lista of Object.values(halozat)) {
    for (const cim of lista ?? []) {
      if (cim.internal || cim.family !== 'IPv6') continue;
      const eleje = cim.address[0];
      if (eleje === '2' || eleje === '3') cimek.push(cim.address);
    }
  }
  return cimek;
}

// ⚠️ A TERJEDŐ TCP-CÍMJEGYZÉK (D36–D38, a `hirdetendoCimek`) 2026-09-26 óta nincs: a
// társ-lista TCP-címeit hirdette a cserén. ⭐ A D69/2 óta a címek terjesztése a friss
// UDP-jegyzéké (lent) — ugyanaz a munka, egy gépezettel. *Egy problémára két gépezet: az
// egyik előbb-utóbb kimarad valahonnan.*

// ===================================
// ⭐⭐ A FRISS UDP-CÍMEK — a cím-elévülés válasza (2026-09-18)
// ===================================
//
// ⛔ A BAJ, MÉRVE (31. mérés): a külső UDP-port csendben elévül — a telefon 150 mp-et
// túlélt, 330-at nem —, tehát egy bulin bemondott cím a következő bulira ROSSZ lehet.
// ⭐ A VÁLASZ (Csaba, 2026-09-18): a friss címek MINDEN cserén terjednek, tehát nem azt
// kell elérni, akivel dolgunk van, hanem BÁRKIT — ő továbbviszi.
//
// ⚠️ AZ ELÉVÜLÉS A HÍVÓÉ, NEM VARÁZSSZÁM (9. szabály): az őrjárat a SAJÁT ablakát adja át.

/** A friss UDP-címek a vonalra kész alakban (a kor másodpercben utazik). */
async function frissUdpCimek(jegyzekTarolo, elevules = UDP_CIM_ELEVULES) {
  return udpCimek(await jegyzekTarolo.olvas(), Date.now(), elevules);
}

/** A cserén kapott friss címeket felvesszük — a kort a SAJÁT óránkhoz kötve. */
async function udpCimeketTanul(jegyzekTarolo, kapott, elevules = UDP_CIM_ELEVULES) {
  if (!kapott?.length) return 0;
  const most = Date.now();
  // ⭐ EGY LÉPÉSBEN (2026-09-21): a külön `olvas()` + `ir()` páros egy egyidejű írást
  // ELVESZÍTHET — mérve. A `modosit` fájlonkénti sorba állítja a műveletet.
  let elotteHossz = 0;
  const utana = await jegyzekTarolo.modosit((elotte) => {
    elotteHossz = elotte.length;
    return udpJegyzekTakaritasa(
      udpCimekBeolvasztasa(elotte, kapott, most, elevules), most, elevules);
  });
  return Math.max(0, utana.length - elotteHossz);
}

// ===================================
// ⭐⭐ A TÁBLA-KULCS ÉS A KÖTÉSEK (2026-09-20)
// ===================================

/**
 * A készülék tábla-kulcsa — ha még nincs, most születik.
 *
 * ⛔⛔ EZ NEM AZ AZONOSSÁGOD (D6). A `kulcs.json` azt mondja meg, KI vagy; ez azt, hogy
 * hol érhető el ez a KÉSZÜLÉK. *Aki a hirdetőtáblát figyeli, ne tudja a címeidet a
 * személyedhez kötni.*
 */
async function tablaKulcsBiztositasa() {
  const tarolo = tablaKulcsTarolo();
  const meglevo = await tarolo.olvas();
  if (meglevo?.alairoNyilvanos && meglevo?.titkositoNyilvanos) return meglevo;

  const uj = await ujTablaKulcs();
  await tarolo.ir(uj);
  return uj;
}

/**
 * Egy sikeres találkozás feljegyzése a kötés-jegyzékbe.
 *
 * ⚠️ A CÍM CSAK JELÖLT: azt jegyezzük fel, ahol az imént elértük. Ha ez TCP-cím volt, a
 * következő bulin egy kopogás (~60 bájt) kideríti, hogy UDP-n is ott van-e. *Olcsóbb
 * megpróbálni, mint elfelejteni valakit, akivel az előbb beszéltünk.*
 *
 * @returns {Promise<boolean>} feljegyeztük-e
 */
/** A saját tábla-kulcsunk aláíró fele — csak a már létező kulcsot jegyezzük meg. */
let sajatTablaAlairo = null;
async function sajatTablaAlairoja() {
  if (sajatTablaAlairo) return sajatTablaAlairo;
  try { sajatTablaAlairo = (await tablaKulcsTarolo().olvas())?.alairoNyilvanos ?? null; } catch { /* még nincs */ }
  return sajatTablaAlairo;
}

async function kotesFeljegyzese(tarolo, kapottTablaKulcs, cim) {
  if (!ervenyesTablaKulcs(kapottTablaKulcs)) return false;
  // ⛔ SAJÁT MAGUNKKAL NEM KÖTÜNK (42. mérés): ha a társlistán a saját címünk áll, a hívás
  // önmagunkhoz fut be, és a „társ" tábla-kulcsa a miénk. Egy ilyen kötés minden körben
  // táblaolvasást és kopogást ér — és semmit nem hoz.
  if (kapottTablaKulcs.alairo === await sajatTablaAlairoja()) return false;
  const most = Date.now();
  // ⭐ EGY LÉPÉSBEN (2026-09-21): az őrjárat a postaláda-ágból ÉS a kör-ágból is jegyez
  // találkozást, és a kettő egyszerre futhat — a külön `olvas()` + `ir()` páros ilyenkor
  // az egyik kötést csendben eldobná.
  await tarolo.modosit((jegyzek) =>
    jegyzekTakaritasa(talalkozasFeljegyzese(jegyzek, kapottTablaKulcs, cim, most)));
  return true;
}

// ===================================
// ⭐⭐⭐ A HIRDETŐTÁBLA — kiírás és kiolvasás (2026-09-20)
// ===================================
//
// ⚠️ A TÁBLA SEGÉDESZKÖZ, NEM ELŐFELTÉTEL (2. szabály): ha a DHT nem elérhető, a koino
// ugyanúgy működik — csak a leszakadt társ visszatalálása lassul (marad a kézi `tars`
// és a helyi felfedezés). Ezért minden hiba itt **feljegyzés, nem összeomlás**.

/** A megismert DHT-gépek — a belépő csak kurbli, utána a saját emlékezetünkből indulunk. */
function dhtGyorsitotar() {
  return join(alapHely(), 'dht-csomopontok.json');
}

async function dhtIsmertek() {
  try { return JSON.parse(await readFile(dhtGyorsitotar(), 'utf8')); } catch { return []; }
}

/** Amit a TÁRSTÓL kaptunk: néhány DHT-gép, beolvasztva a saját jegyzékünkbe. */
async function dhtGepeketTanul(kapott) {
  if (!kapott?.length) return 0;
  try {
    const elotte = await dhtIsmertek();
    const utana = gepekBeolvasztasa(elotte, kapott);
    if (utana.length === elotte.length) return 0;
    await writeFile(dhtGyorsitotar(), JSON.stringify(utana));
    return utana.length - elotte.length;
  } catch (hiba) {
    console.warn('a kapott DHT-gépek beolvasztása nem sikerült', { ok: hiba.message });
    return 0;
  }
}

async function dhtIsmertekMentese(kliens) {
  try {
    const osszes = new Map((await dhtIsmertek()).map((c) => [c.cim + ':' + c.port, c]));
    // ⛔⛔ A `Map.set` NEM MOZGATJA HÁTRA a meglévő kulcsot (2026-09-21, átnézésből): puszta
    // `set` mellett egy most felelt, régóta ismert gép a lista ELEJÉN maradt, és a
    // `slice(-300)` épp őt dobta ki — egy egyszer látott, azóta néma gép helyett.
    // *A felirat „a legutóbb felelt 300"-at ígért, a kód a „legrégebben ELŐSZÖR látottat"
    // dobta.* ⭐ A törlés + újra-beszúrás hátraviszi, és ettől lesz a felirat igaz.
    for (const c of kliens.ismertCsomopontok()) {
      const kulcs = c.cim + ':' + c.port;
      osszes.delete(kulcs);
      osszes.set(kulcs, c);
    }
    // ⛔ Korlátos (9. szabály): a legutóbb FELELT 300 marad.
    await writeFile(dhtGyorsitotar(), JSON.stringify([...osszes.values()].slice(-300)));
  } catch (hiba) {
    console.warn('a DHT-gépek mentése nem sikerült', { ok: hiba.message });
  }
}

/** Egy tábla-kliens, a saját emlékezetünkkel — a belépőket csak tartaléknak hívjuk. */
async function tablaKliens() {
  const ismertek = await dhtIsmertek();
  const env = process.env.KOINO_DHT_BELEPOK;
  const belepok = env === undefined ? ALAP_BELEPOK
    : (env === 'nincs' || env === '' ? [] : env.split(',').map((s) => s.trim()).filter(Boolean));
  return dhtKliens({ belepok, ismertek });
}

// ===================================
// ⭐⭐ D91/3: A CÍMJEGYZÉK HIRDETÉSE ÉS KERESÉSE (a BitTorrent-DHT-n, vakított témával)
// ===================================
//
// Minden készülék a saját gyökér-darabját hirdeti (egy téma, ~20 percenként — az 58. mérés szerint a háló 30–60
// perc alatt felejt), a vállalt szeletei közül pedig csak annyit, amennyit a KÉSZÜLÉKENKÉNTI beállítás enged
// (`cimjegyzek.json`, alapból 0). Keresni bárki kereshet. ⚠️ Segédeszköz, nem előfeltétel (2. szabály): ha a
// DHT nem elérhető, a fa és a raj (D91/1) ugyanúgy működik.

/** Egy kopogtató (aki tőlem kér) ennyi ideig marad a kopogás-céljaim közt (D92/1). */
const KOPOGTATO_ELEVULES = 30 * 60 * 1000;

/** A szeletenkénti hirdetés felső korlátja (egy készüléken is — a 6. szabály). */
const SZELET_HIRDETES_KORLAT = 50;

function cimjegyzekBeallitasFajl() {
  return join(alapHely(), 'cimjegyzek.json');
}

/** A készülékenkénti beállítás (helyi, nem esemény, nem terjed — D83/2 mintája). */
async function cimjegyzekBeallitas() {
  try {
    const b = JSON.parse(await readFile(cimjegyzekBeallitasFajl(), 'utf8'));
    const n = Number.isInteger(b?.szeletHirdetes) && b.szeletHirdetes >= 0 ? b.szeletHirdetes : 0;
    return { szeletHirdetes: Math.min(n, SZELET_HIRDETES_KORLAT) };
  } catch {
    return { szeletHirdetes: 0 };
  }
}


// ⭐⭐ D95/4: A GYÖKÉR MÉLYSÉGE — a saját darabomból becsülve (`cimjegyzek.js` `gyokerMelysegBecslese`): a szigorú (b) alatt
// senki nem látja az egész gyökeret. EGY FORRÁS a cserének (a darab-részvétel) és a DHT-hirdetésnek (a gyökér-darab
// témája) — különben a készülék mást hirdetne, mint amiben részt vesz. A gyökér változata szerint gyorsítótárazva.
// ⚠️ A próbák a darab célméretét a környezetből kicsinyítik (`KOINO_GYOKER_DARAB_CEL`).
const GYOKER_CEL = Number(process.env.KOINO_GYOKER_DARAB_CEL) > 0 ? Number(process.env.KOINO_GYOKER_DARAB_CEL) : GYOKER_DARAB_CEL;
let gyokerBecslesEmlek = null;

/** @returns {Promise<{melyseg: number, becsles: number, alairo: string, darabok: Set<string>}>} */
async function gyokerMelysegem() {
  const alairo = (await tablaKulcsBiztositasa()).alairoNyilvanos;
  const valtozat = tar.szeletValtozata('') + '|' + alairo;
  if (gyokerBecslesEmlek?.valtozat === valtozat) return gyokerMelysegTanulva(gyokerBecslesEmlek.b);
  const szuletesek = (await tar.bejelentesek('')).filter((e) => e.koino === KOINO).map((e) => gyokerLenyomata(e.azonosito));
  const { melyseg, becsles } = gyokerMelysegBecslese(szuletesek, gyokerLenyomata('keszulek|' + alairo), GYOKER_CEL);
  const b = { melyseg, becsles, alairo, darabok: new Set(gyokerDarabKulcsai(alairo, melyseg)) };
  gyokerBecslesEmlek = { valtozat, b };
  return gyokerMelysegTanulva(b);
}

/**
 * ⭐⭐ D110: a gyökér-darab mélysége a társaktól tanulva is — csak mélyebbre. A saját becslés gyorsítótárban (a gyökér
 * változata szerint), a tanult a jegyzékből (egy kis fájl).
 */
async function gyokerMelysegTanulva(b) {
  const tanult = await tanultMelysegem('g');
  const melyseg = ervenyesMelyseg(b.melyseg, tanult);
  if (melyseg === b.melyseg) return { ...b, sajat: b.melyseg, tanult };
  return { ...b, melyseg, sajat: b.melyseg, tanult, darabok: new Set(gyokerDarabKulcsai(b.alairo, melyseg)) };
}

/**
 * ⭐ D95/4: a csak küldő út kulcsai — a saját legfelső szintű gondolatom születése a gyökér-darabja alatt is felajánlható
 * (a mélységem szerint): ha nem a saját darabomba esik, csak így jut el a darab tartóihoz.
 * ⛔ D101 ⑥ (lelet — az értesítések bekötés-próbája mérte): és a BEJELENTÉSI HELYEIN is (`bejelentesHelyei`: a születés a
 * szülőnél, a javaslat az érintettjeinél, a szavazat a bizonyítéka kulcsainál). Eddig csak a saját szeletén ment: ha valaki
 * egy olyan gondolat alá írt, amelynek a szeletét nem tartja, a gyerek születése a szülő tartójához soha nem ért el (a
 * szülő szeletében, ahová bejelentődik, nem vett részt) — a szigorú (b) alatt egy válasz nem jutott el ahhoz, akinek szólt.
 */
function kuldoKulcsai(gy) {
  return (e) => {
    const ki = [e.entitas ?? e.azonosito];
    if (e.tipus === 'GondolatLetrehozas' && !e.adat?.szulo) ki.push(gyokerDarabKulcsa(gy.melyseg, gyokerDarabja(e.azonosito, gy.melyseg)));
    // a gyökér ('') nem szelet: oda a gyökér-darab viszi (fent)
    for (const h of bejelentesHelyei(e)) if (h !== '' && !ki.includes(h)) ki.push(h);
    return ki;
  };
}

/** Amit ez a készülék hirdet: a gyökér-darabja és (a beállítás szerint) néhány vállalt szelete. */
async function sajatHirdetendoTemak() {
  const { allapot } = await kepetKeszit();
  const v = await sajatVallalasa(allapot);
  const tablaKulcs = await tablaKulcsBiztositasa();
  const vallalt = [...v.pontok.entries()].filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const gy = await gyokerMelysegem();
  const { szeletHirdetes } = await cimjegyzekBeallitas();
  const temak = hirdetendoTemak({ koino: KOINO, alairo: tablaKulcs.alairoNyilvanos, legfelsoDarab: gy.becsles,
    melyseg: gy.melyseg, vallaltSzeletek: vallalt, szeletHirdetes });
  // ⭐⭐ D107 L2 (a kereső-réteg ③c): a kereső-régióm témája is — a régió tartói ezen találják meg egymást (és a ④-ben a
  // felajánló is). Vakított, mint a többi (a koinó a só — D91).
  const kr = await keresoRegioim();
  const [kd] = sajatKeresoRegioi(tablaKulcs.alairoNyilvanos, kr.melyseg, 1);
  temak.push({ fajta: 'kereso', kulcs: kr.melyseg + ':' + kd.toString(16), tema: keresoRegioTemaja(KOINO, kr.melyseg, kd) });
  return { temak, legfelso: gy.becsles, melyseg: gy.melyseg, sajatMelyseg: gy.sajat, tanultMelyseg: gy.tanult, szeletHirdetes };
}

/** Hirdetés most — a megadott (külső) porttal. */
async function cimjegyzekHirdetese(port) {
  const { temak } = await sajatHirdetendoTemak();
  const kliens = await tablaKliens();
  try {
    const eredmeny = [];
    for (const t of temak) {
      const be = await kliens.bejelent(t.tema, port);
      eredmeny.push({ fajta: t.fajta, kulcs: t.kulcs, tarolta: be.tarolta, probalt: be.probalt });
    }
    await dhtIsmertekMentese(kliens);
    return { eredmeny, forgalom: kliens.forgalom() };
  } finally {
    kliens.bezar();
  }
}

/** Egy kopogtató téma (a nyilvántartás alakjából): a készüléké, vagy egy hirdetett téma párja. */
function kopogtatoTemaBuffer(k) {
  return k.fajta === 'keszulek' ? keszulekKopogtatoTemaja(KOINO, k.kulcs) : temaKopogtatoja(KOINO, k.fajta, k.kulcs);
}

/**
 * ⭐⭐ D91/3 + D92/1: AZ ŐRJÁRAT CÍMJEGYZÉK-KÖRE — egy DHT-munkamenetben: (1) a hirdetés (a gyökér-darabom, és a
 * beállítás szerinti szeletek); (2) a RÁNÉZÉS a kopogtató témáimra (a készülékemé és minden hirdetett témám párjáé) —
 * akik ott bejelentették a címüket, azok kérnek tőlem, és a következő körben feléjük is kopogok; (3) a függő
 * kérelmeim kopogtató témáin az ÚJRA-BEJELENTÉS (a háló 30–60 perc alatt felejt — 58. mérés).
 * @returns {Promise<{eredmeny: Array, kopogtatok: Array<{cim: string, port: number}>, bejelentve: number, forgalom: Object}>}
 */
/** ⭐ D107 L2 (③c): egy címjegyzék-körben legfeljebb ennyi régió-társat veszünk a kör céljai közé. */
const REGIO_TARS_KORLAT = 4;

async function cimjegyzekKor(port) {
  const { temak } = await sajatHirdetendoTemak();
  const tablaKulcs = await tablaKulcsBiztositasa();
  const kliens = await tablaKliens();
  try {
    const eredmeny = [];
    for (const t of temak) {
      const be = await kliens.bejelent(t.tema, port);
      eredmeny.push({ fajta: t.fajta, kulcs: t.kulcs, tarolta: be.tarolta, probalt: be.probalt });
    }
    const kopogtatok = new Map();
    for (const f of figyelendoKopogtatok({ koino: KOINO, alairo: tablaKulcs.alairoNyilvanos, hirdetett: temak })) {
      const k = await kliens.tarsakKeresese(f.tema);
      for (const t of k.tarsak) kopogtatok.set(t.cim + ':' + t.port, { cim: t.cim, port: t.port });
    }
    // ⭐⭐ D107 L2 (③c): a régióm TÖBBI TARTÓJA — a régió témáján (név nélküli címek; a kör céljai közé kerülnek, mint a
    // kopogtatók). Mindkét fél megtalálja a másikat, ezért a buliban egymásra kopognak (D33) — kopogtató pár nem kell.
    const regioTarsak = new Map();
    for (const t of temak.filter((x) => x.fajta === 'kereso')) {
      const k = await kliens.tarsakKeresese(t.tema);
      for (const x of k.tarsak.slice(0, REGIO_TARS_KORLAT)) regioTarsak.set(x.cim + ':' + x.port, { cim: x.cim, port: x.port });
    }
    // ⭐⭐ D107 L4 (④c): a felajánlás — a még fel nem ajánlott bejegyzéseim régiónként függő kérelembe (a régió témájának
    // hirdetői a célok); a kopogtatóikat lent, a többivel együtt jelentem be.
    let felajanlas = { regiok: 0, celok: 0 };
    try { felajanlas = await felajanlasKor(kliens); } catch (hiba) { console.warn('a felajánlás most nem ment', { ok: hiba.message }); }
    let bejelentve = 0;
    const bejelentett = [];
    for (const k of fuggoKopogtatok(await kerelmekOlvasasa())) {
      const be = await kliens.bejelent(kopogtatoTemaBuffer(k), port);
      bejelentett.push(k.fajta + ':' + k.kulcs);
      if (be.tarolta > 0) bejelentve++;
    }
    await dhtIsmertekMentese(kliens);
    return { eredmeny, kopogtatok: [...kopogtatok.values()], regioTarsak: [...regioTarsak.values()], bejelentve, bejelentett,
      felajanlas, forgalom: kliens.forgalom() };
  } finally {
    kliens.bezar();
  }
}

/** Kik hirdették a témát — címek, név nélkül; bizalom nem jár velük (3. szabály). */
async function cimjegyzekKeresese(tema) {
  const kliens = await tablaKliens();
  try {
    const k = await kliens.tarsakKeresese(tema);
    await dhtIsmertekMentese(kliens);
    return k.tarsak;
  } finally {
    kliens.bezar();
  }
}

/**
 * „Itt az új címem" — kiírjuk MINDEN kötésünk rekeszébe.
 *
 * ⭐ Eseményre, nem órára (Csaba döntése): csak akkor írunk, ha a címünk MEGVÁLTOZOTT.
 * *Egy nyugodt napon a tábla forgalma nulla.*
 */
async function tablaraKiiras(sajatKulcs, kotesJegyzek, cim, naplo = () => {}) {
  const celok = kotesLista(kotesJegyzek, 5).filter((k) => k.titkosito && k.alairo);
  if (!celok.length || !cim?.hoszt) return { kiirt: 0, tarolta: 0 };

  const kliens = await tablaKliens();
  try {
    let kiirt = 0, tarolta = 0;
    for (const k of celok) {
      try {
        const bejegyzes = await cimBejegyzes(sajatKulcs,
          { alairo: k.alairo, titkosito: k.titkosito }, cim);
        const e = await kliens.kozzetesz(bejegyzes);
        kiirt++;
        tarolta += e.tarolta ?? 0;
        naplo({ mi: 'KIIRVA', tars: k.alairo.slice(0, 8), tarolta: e.tarolta });
      } catch (hiba) {
        naplo({ mi: 'KIIRAS-BUKOTT', tars: k.alairo.slice(0, 8), ok: hiba.message });
      }
    }
    await dhtIsmertekMentese(kliens);
    return { kiirt, tarolta };
  } finally {
    kliens.bezar();
  }
}

/**
 * „Hol van most a társam?" — a NÉMA kötések rekeszét olvassuk ki.
 *
 * @returns {Promise<Array<{alairo: string, hoszt: string, port: number}>>}
 */
async function tablarolOlvasas(sajatKulcs, nemak, naplo = () => {}) {
  if (!nemak.length) return [];

  const kliens = await tablaKliens();
  try {
    const talaltak = [];
    for (const k of nemak) {
      if (!k.titkosito || !k.alairo) continue;
      try {
        const rekesz = await tarsRekesze(sajatKulcs, { alairo: k.alairo, titkosito: k.titkosito });
        const e = await kliens.keres(rekesz.kulcs, rekesz.so);
        if (!e.legjobb) {
          // ⛔⛔ A „NINCS RAJTA" ÉS A „NEM TUDTAM MEGNÉZNI" KÉT KÜLÖN DOLOG (40. mérés,
          // 2026-09-24). Terepen egy mobilnet nélküli telefon azt írta, hogy *„egy néma
          // társ nincs a táblán"* — pedig egyetlen DHT-gép sem felelt neki. ⭐ Ha senki nem
          // felelt, a keresés nem mondhat semmit a rekeszről: az a hálózat híre, nem a
          // társé (D19). *Ugyanaz a hibafajta, mint a `felfedez` „már ismerős" felirata.*
          const kerdes = e.kereses?.kerdes ?? 0;
          const valasz = e.kereses?.valasz ?? 0;
          naplo({ mi: valasz ? 'NINCS-A-TABLAN' : 'TABLA-NEM-ELERHETO',
            tars: k.alairo.slice(0, 8), kerdes, valasz });
          continue;
        }
        const ertek = Buffer.from(e.legjobb.ertek).toString('utf8');
        const cim = await cimBejegyzesbol(sajatKulcs,
          { alairo: k.alairo, titkosito: k.titkosito }, ertek);
        if (!cim) { naplo({ mi: 'OLVASHATATLAN', tars: k.alairo.slice(0, 8) }); continue; }
        talaltak.push({ alairo: k.alairo, titkosito: k.titkosito, ...cim });
        // ⚠️ A `mikor` a TÁRS órája — tájékoztatás, nem döntés (lásd `tabla.js`): a címet
        // frissként jegyezzük be akkor is, ha a bejegyzés órákkal ezelőtti.
        naplo({ mi: 'MEGVAN-A-TABLAN', tars: k.alairo.slice(0, 8),
          hoszt: cim.hoszt, port: cim.port, mikor: cim.mikor });
      } catch (hiba) {
        naplo({ mi: 'OLVASAS-BUKOTT', tars: k.alairo.slice(0, 8), ok: hiba.message });
      }
    }
    await dhtIsmertekMentese(kliens);
    return talaltak;
  } finally {
    kliens.bezar();
  }
}

// ===================================
// ⭐⭐⭐ A BULI UDP-ÁGA (2026-09-20)
// ===================================
//
// ⛔⛔ MIÉRT KELL, ÉS MIÉRT ÉPP MOST: a 36/d. mérés szerint **a mobil NAT nem engedi be az
// idegent** — rést csak a KÖLCSÖNÖS kopogás nyit. Egy csak-mobilos közösségben tehát a
// „nyitva tartom a kaput" (postaláda) senkinek nem elég: a kapcsolatot **mindkét félnek
// egyszerre** kell kezdeményeznie. Ezt adja a buli (percfordulós ablak, 30. mérés).
//
// ⭐ EGY FOGLALAT, TÖBB TÁRS — mert a NAT-leképezés a foglalathoz tartozik: így egyetlen
// külső címünk van, amit mindenkinek bemondhatunk (és később a hirdetőtáblára kiírhatunk).
//
// ⚠️⚠️ A KOPOGÁS ADAT-ÁRA (D35) — és ezért nem kopogunk az egész ablakon át: egy kopogás
// ~60 bájt, egy „nincs újdonság" csere-kör 334. ⭐ **A korlát ebből következik, nem
// tippből:** annyit kopogunk, amennyi nagyságrendben belefér EGY csere-kör árába — a
// terepmérés szerint amúgy is **190 ms** (17.) és **76 ms** (19.) alatt megnyílik a rés,
// ha a másik fél ott van. *Aki nincs ott, azt nem a kitartás hozza vissza, hanem a
// következő buli.*
const KOPOGAS_ARA_KORONKENT = 6;      // kopogás/társ — ~360 bájt, egy csere-kör nagyságrendje
// ⭐ A kopogás saját üteme (80. mérés): ha a kör legfeljebb ennyivel csúszott túl a saját ablaka végén, a következő kör
// azonnal indul (a társ a fordulótól még `KOPOGAS_ARA_KORONKENT` mp-ig kopog) — nem a következő percfordulón.
const ABLAK_KESES_TURES = 3000;

// ⭐ Ablakonként ennyi ISMERETLEN bekopogót veszünk fel célnak (2026-09-25). Nem varázsszám,
// hanem a kötés-korlát (legfeljebb 5 kötés, jellemzően 3) nagyságrendje: annyi társ lehet,
// akinek nálunk nincs kopogható címe. *Egy idegen se kösse le a foglalatot végtelen munkával.*
const BEKOPOGO_KORLAT = 3;

/**
 * ⭐ A TELEFON ÉBREN TARTÁSA (42. mérés, 2026-09-25).
 *
 * ⛔ MIÉRT: a szomszéd wifijén a telefon körei 15–20 percesek lettek (14:08 → 14:27 →
 * 14:42), miközben a laptopé percre pontos maradt. Az Android a zsebben, sötét képernyővel
 * altatja a Termuxot — és egy alvó őrjárat nem kopog, nem ír a táblára, nem cserél. A
 * kézi „Acquire wakelock" gomb megoldja, de **elfelejthető** (a 40. és a 42. mérésen is).
 * ⭐ Ezért Termuxban az őrjárat maga kéri (`termux-wake-lock`), és kilépéskor elengedi.
 * ⚠️ Ha nem sikerül, kimondjuk (D19) — a kézi út marad. `KOINO_EBRENTARTAS=nem` kikapcsolja.
 *
 * @returns {Promise<{termux: boolean, kert: boolean}>}
 */
async function ebrenTartas() {
  const termux = Boolean(process.env.TERMUX_VERSION) || /com\.termux/.test(process.env.PREFIX ?? '');
  if (!termux || process.env.KOINO_EBRENTARTAS === 'nem') return { termux, kert: false };
  const { spawn, spawnSync } = await import('node:child_process');
  const sikerult = await new Promise((kesz) => {
    const folyamat = spawn('termux-wake-lock', [], { stdio: 'ignore' });
    folyamat.on('error', () => kesz(false));
    folyamat.on('exit', (kod) => kesz(kod === 0));
  });
  if (sikerult) {
    const elenged = () => {
      try { spawnSync('termux-wake-unlock', [], { stdio: 'ignore' }); } catch { /* már nincs mit */ }
    };
    process.once('exit', elenged);
    for (const jel of ['SIGINT', 'SIGTERM']) {
      process.once(jel, () => { elenged(); process.exit(130); });
    }
  }
  return { termux, kert: sikerult };
}

/**
 * A tükör (STUN-kiszolgáló), amitől a saját külső címünket kérdezzük — `KOINO_TUKOR=cím:port`.
 *
 * ⭐ Ugyanaz az elv, mint a `KOINO_DHT_BELEPOK`-nál: a segédeszköz cserélhető (2. szabály) —
 * ha egy hálózat a megszokott tükröt tiltja, egy másikat meg lehet adni. És ettől mérhető
 * próbában is, mi történik, ha a tükör NEM felel (40. mérés).
 * Beállítás nélkül a `kulsoCimFoglalaton` alapértéke szól.
 */
function tukorBeallitas() {
  const env = process.env.KOINO_TUKOR;
  if (!env) return {};
  const hatar = env.lastIndexOf(':');
  const port = parseInt(env.slice(hatar + 1), 10);
  if (hatar <= 0 || !Number.isInteger(port)) return {};
  return { tukorSzerver: env.slice(0, hatar).replace(/^\[|\]$/g, ''), tukorPort: port };
}

// ⭐ A BULI UDP-ÁGA 2026-09-25 óta az ÁLLANDÓ UDP-KAPUN fut (`js/csere/udpKapu.js`, D69/3):
// egyetlen foglalat a teljes futásra. A résen végzett munka (csere + fájl-randevú) az őrjárat
// `resMunka` függvénye — ott érhető el a körönként frissülő állapot (fájl-kérelem, hirdetett
// címek, a saját külső címünk). *A régi `udpBuli` körönként nyitott és zárt foglalatot; a 42.
// mérés mutatta meg, mibe kerül ez: „nyitva van, de nem szolgál ki".*

/**
 * Egy friss külső UDP-cím feljegyzése a NÉVTELEN jegyzékbe — erre kopogunk a következő bulin.
 *
 * ⚠️ 2026-09-21-ig ezt a függvényt `sajatUdpCimJegyzese`-nek hívták, és a fejléce azt írta,
 * hogy *„a SAJÁT külső UDP-címünk"* — ⛔ közben a tábla-ág a TÁRS címét írja be vele.
 * ⭐ A jegyzék szándékosan névtelen (nem mondja meg, melyik cím kié), tehát a működés
 * helyes volt; a NÉV hazudott. *A párja a `frissUdpCimek` — az olvas, ez ír.*
 */
async function frissUdpCimJegyzese(jegyzekTarolo, cim, port, elevules = UDP_CIM_ELEVULES) {
  if (!cim || !Number.isInteger(port)) return;
  const most = Date.now();
  // ⛔⛔ ITT BUKOTT KI AZ ELVESZETT ÍRÁS (2026-09-21): a saját külső címünket KÉT forrásból
  // tanuljuk meg — a tükörtől és a TÁRSTÓL (`latlak`) —, és a kettő ezredmásodpercen belül
  // érkezhet. A régi, külön `olvas()` + `ir()` páros ilyenkor az egyiket eldobta. ⭐ A
  // társtól tanult cím a fontosabb: a CLAUDE.md szerint *„a végleges tükör a társ"*.
  await jegyzekTarolo.modosit((lista) =>
    udpJegyzekTakaritasa(udpCimMegjegyzese(lista, cim, port, most), most, elevules));
}

/**
 * A készülék ÖSSZES saját címe — ehhez mérjük, mi a „mi vagyunk".
 *
 * ⚠️ MIÉRT AZ ÖSSZES, ÉS NEM CSAK A TÜKÖR? Mert egy készüléknek több címe van (IPv4 a
 * wifin, több IPv6, esetleg vezetékes), és a társak BÁRMELYIKET hirdethetik rólunk.
 * Mérve (2026-08-30): a laptop saját IPv6-címe így került a listájára, majd a cserén
 * TOVÁBB is terjedt a telefonra — a tükör (IPv4) alapján szűrő ezt nem fogta meg.
 *
 * ⛔⛔ ÉS A TÜKÖR 2026-09-22 ÓTA NINCS BENNE EBBEN A LISTÁBAN. Ezek a címek a saját
 * GÉPÜNKÉI — rajtuk senki mással nem osztozunk, tehát a port nem számít. A tükör-cím
 * (amit NAT mögül mutatunk kifelé) MÁS: azon egy háztartás, CGNAT alatt idegenek ezrei
 * osztoznak, és csak a port különbözteti meg őket. *Egy listába téve a kettőt, a port
 * kérdése eldönthetetlen volt: vagy az IPv6-unk csúszott át, vagy a szomszéd esett ki.*
 * A tükröt ezért a `sajatCimekKiszurese` kapja külön, cím+port párként.
 */
async function sajatOsszesCim() {
  const halozat = (await import('node:os')).networkInterfaces();
  const cimek = [];
  for (const lista of Object.values(halozat)) {
    for (const cim of lista ?? []) cimek.push(cim.address);
  }
  return cimek;
}

/**
 * A cserén kapott címeket felvesszük a listánkra — de sosem írjuk felül a sajátunkat.
 *
 * ⚠️ ÉS ÖNMAGUNKAT SEM VESSZÜK FEL. A társak MINKET is hirdetnek egymásnak — ez így
 * helyes, sőt ez a terjedő címjegyzék lényege (D36–D39) —, de a HÍVÁSI listára a saját
 * címünk nem való: a készülék önmagát hívogatná minden körben.
 *
 * ⭐ KÉT KÜLÖN DOLOG, ami eddig egy fájlban élt: „kit hívjak" (ez a lista) és „kiről
 * meséljek" (a hirdetés). A sajátunkat TOVÁBBRA IS elmondjuk másoknak — csak nem hívjuk.
 *
 * ⭐⭐ ÉS MEGMONDJA, MIT SZŰRT KI — HÁROM SZÁM, NEM EGY (2026-09-22). A kapott címek
 * háromfelé mennek, és a három **különböző dolgot jelent**: ÚJ társ · **már ismerős** ·
 * ⛔ **a SAJÁT címünk**. ⚠️ A `felfedez` korábban a második kettőt egybemosta, és
 * mindkettőre azt írta, hogy *„már ismerős volt"* — a terepen (39. mérés) ez tíz percnyi
 * rossz diagnózist okozott. *A réteg mindig is megmondta (`kihagyott`); a hívó dobta el.*
 *
 * ⛔⛔ ÉS A TÜKÖR CÍM+PORT PÁRKÉNT SZŰR (2026-09-22, Csaba döntése — a „B" út). Korábban
 * a tükör-címet beolvasztottuk a gép saját címei közé, és ott a port nem számított — így
 * **minden velünk egy NAT-on lévő társ kiesett**: a testvér-telefon (D22) és CGNAT alatt
 * egy vadidegen társ is, akinek a helyi felfedezés nem tartalék útja. *A NAT mögött a
 * címen osztozunk; csak a port mondja meg, ki kicsoda.*
 *
 * @param {Object} tarolo
 * @param {Array} kapott
 * @param {{cim: string, port: number}} [sajat] - aminek a másik LÁT minket (a tükör)
 * @returns {Promise<{hozzajott: number, ismeros: number, mienk: number}>}
 */
async function kapottCimekBeolvasztasa(tarolo, kapott, sajat = null) {
  if (!kapott?.length) return { hozzajott: 0, ismeros: 0, mienk: 0 };
  const { cimek: idegenek, kihagyott } =
    sajatCimekKiszurese(kapott, await sajatOsszesCim(), sajat);

  // ⭐⭐ AZ ŐR A RÉTEGBEN (2026-09-21, kiterjesztve a társ-listára 2026-09-22): a
  // beolvas → módosít → kiír egyetlen oszthatatlan lépés, különben két egyidejű tanulás
  // közül az egyik némán elvész.
  let hozzajott = 0;
  await tarolo.modosit((lista) => {
    const elotte = lista.length;
    let uj = lista;
    for (const c of idegenek) {
      try { uj = tarsHozzaadasa(uj, { hoszt: c.hoszt, port: c.port }); } catch { /* rossz cím: kihagyjuk */ }
    }
    hozzajott = uj.length - elotte;
    return uj;
  });
  return { hozzajott, ismeros: idegenek.length - hozzajott, mienk: kihagyott };
}

// ===================================
// ⭐⭐⭐ A RÉSEN VÉGZETT MUNKA — EGY GÉPEZET, MINDEN ÚTNAK (D69/2, 2026-09-26)
// ===================================
//
// ⛔ MIÉRT KÖZÖS: 2026-09-26-ig a résen végzett munka az őrjárat belsejében élt (`resMunka`),
// a `figyel` és a kézi `csere` pedig TCP-n dolgozott, saját tanulási ágakkal. A D69/2 óta
// nincs TCP a készülékek között — tehát MINDEN út a kapun megy, és mind ugyanazt a munkát
// kell elvégezze: csere, kötés, tanulás (saját cím · UDP-címek · DHT-gépek · fájl-tanulság),
// fájl-randevú. *Egy problémára egy gépezet — a három ág eddig háromszor tanulta ugyanazt,
// és a napló kilencszer felsorolja, mi lesz az ilyenből.*

/**
 * A munka állapota: amit a résen végzett munka olvas, és amit a hívó (az őrjárat köre)
 * közben frissít. *Egy doboz, nem változók szétszórva — így a munka bármikor futhat.*
 *
 * @param {Object} beallitas
 * @param {number} [beallitas.udpElevules] - meddig friss egy UDP-cím (az őrjárat az ablakát adja)
 * @returns {Promise<Object>}
 */
async function resAllapotKeszites({ udpElevules = UDP_CIM_ELEVULES } = {}) {
  const udpTarolo = udpCimTarolo();
  const sajatTablaKulcsTeljes = await tablaKulcsBiztositasa();
  return {
    udpTarolo, udpElevules,
    kotesTar: kotesTarolo(),
    sajatTablaKulcsTeljes,
    sajatTablaKulcs: nyilvanosResz(sajatTablaKulcsTeljes),
    frissUdp: await frissUdpCimek(udpTarolo, udpElevules),
    hirdetendoDhtGepek: gepekHirdetese(await dhtIsmertek()),
    // ⭐ A SAJÁT KÜLSŐ UDP-CÍMÜNK, ahogy legutóbb mértük — az őrjárat tölti ki.
    sajatKulsoUdp: null,
    // ⭐ A kör fájl-része (körönként egyszer állítjuk össze); `null` = a munka maga számolja.
    korFajlok: null,
    // ⚠️ ÁLLANDÓ-E A KAPU PORTJA? Ha a kézi parancs a rendszer adta portra szorult (mert az
    // alap-portot egy futó őrjárat fogja), a társtól tanult saját címünk ÁLÉ: azt a portot a
    // parancs végén elengedjük. Ilyenkor nem jegyezzük fel — különben halott címet terjesztene.
    allando: true,
    // ⭐ D97/2: a raj a körben — a változott szeletek és a forgatás (memória; az őrjárat életében).
    rajKor: rajKorAllapot()
  };
}

/**
 * ⭐ D97/2: a kör raj-céljai — a szigorú (b) alatt (a „mindent” módban nem kell: ott minden társsal mindent egyeztetek).
 * Előbb a saját új eseményeim szeleteit is a változottak közé veszem (a láncom vége óta), aztán a `rajKor.js` dönt.
 * @returns {Promise<Array<{hoszt: string, port: number, alairo: string|null}>>}
 */
async function rajKorCeljaim(res) {
  const kf = await ketFokAllapota();
  const reszvetel = await reszvetelHalmazom(kf);
  if (!reszvetel) return [];
  const lanc = (await sajatLancEsemenyei(tar, szerzo)).filter((e) => e.koino === KOINO);
  const utolso = lanc.length ? lanc[lanc.length - 1].sorszam : 0;
  if (res.rajKor.sajatUtolso !== null && utolso > res.rajKor.sajatUtolso) {
    valtozottFeljegyzese(res.rajKor, lanc.filter((e) => e.sorszam > res.rajKor.sajatUtolso).map((e) => szelet(e))
      .filter((k) => reszvetel.has(k)));
  }
  res.rajKor.sajatUtolso = utolso;
  const sajatAlairo = res.sajatTablaKulcs?.alairo ?? null;
  // ⭐ D107 L2 (③c): a kereső-régióim is a raj kör szeletei közé (a forgatás és a változott régió tartói).
  const szeletek = new Set([...reszvetel, ...(await keresoRegioim()).regiok.map((r) => r.kulcs)]);
  return rajKorCeljai(res.rajKor, { szeletek, jegyzek: await szeletJegyzekTarolo().olvas(),
    kizart: (c) => !!sajatAlairo && c.alairo === sajatAlairo });
}

/**
 * A résen végzett munka — ezt kapja az állandó UDP-kapu (`udpKapuNyitasa`), bármelyik út nyitja.
 *
 * @param {Object} allapot - a `resAllapotKeszites` doboza
 * @returns {(halo: Object, tars: {cim: string, port: number}) => Promise<Object>}
 */
/**
 * ⭐⭐ AZ ÉSZLELÉS ÉS A BEJELENTÉS (D82 sorrend ①) — a most beérkezett események körül: amit a nálunk
 * lévő eseményekből be lehet bizonyítani, azt bejelentjük a vádolt azonosság-szeletébe (ismétlés
 * nélkül). A csere, a kézi út (`behoz`) és az `ellenoriz` parancs közös útja.
 * ⚠️ A hibája nem dönti el a kört: az észlelés kényelem, nem előfeltétel (a kézi `ellenoriz` pótolja).
 *
 * @param {Array<string>} azonositok
 * @returns {Promise<{leletek: number, bejelentve: number, marVolt: number, nincsHorgony: number}>}
 */
async function eszlelesEsBejelentes(azonositok) {
  try {
    const esemenyek = [];
    for (const a of azonositok ?? []) {
      const e = await tar.esemeny(a);
      if (e) esemenyek.push(e);
    }
    const leletek = await ellentmondasokKeresese(tar, KOINO, esemenyek);
    if (!leletek.length) return { leletek: 0, bejelentve: 0, marVolt: 0, nincsHorgony: 0 };
    const b = await ellentmondasokBejelentese(kornyezet, leletek);
    if (b.bejelentve) {
      kiir(SZIN.nem + '  ⚠ ' + b.bejelentve + ' bizonyított ellentmondást jelentettem be (D80/D82)' + SZIN.vege
        + SZIN.halvany + (b.nincsHorgony ? ' · ' + b.nincsHorgony + ' vádoltnak nincs nálunk horgonya' : '') + SZIN.vege);
    }
    return { leletek: leletek.length, ...b };
  } catch (hiba) {
    console.warn('eszlelesEsBejelentes - nem sikerült (a kör megy tovább)', { hiba: hiba.message });
    return { leletek: 0, bejelentve: 0, marVolt: 0, nincsHorgony: 0 };
  }
}

// ===================================
// ⭐⭐ D98/2–4: A LÁNC-ELLENŐRZÉS A CSERÉBEN (az A hátralévői)
// ===================================
//
// A szigorú (b) alatt egy szerző teljes láncát csak ő tartja: a csere végén a társ láncáról (és a most kapott események
// szerzőiéről) kérdezünk (`lancEllenorzes.js`), és ha a válaszból bizonyíték lesz (elágazás, negatív levél), bejelentjük
// a vádolt azonosság-szeletébe — ugyanazon az úton, mint az észlelő leleteit. A hallgatás nem vád: függőben marad.

/**
 * ⭐ A ház (D100): a tartott (vállalt) szeleteim — vagy null, ha „mindent” módban minden szeletet tartok. A lap ezzel
 * számolja a D14-et és a hierarchikus pakli forrás-jelöléseit (`pakli.js`).
 */
async function tartottSzeleteim() {
  try {
    if ((await kiszolgalasBeallitas()).mindent) return null;
    return (await ketFokAllapota()).vallalas.szeletek;
  } catch {
    return null;
  }
}

/**
 * ⭐⭐ D92/1: EGY FÜGGŐ KÉRELEM FELVÉTELE — a `kerelem` parancs (cím nélkül) és a felület (D100, H1) közös útja: a célok a
 * G tartói (a raj, készülék-azonosítóval; ha `dht`, a DHT hirdetői is) és az induló címek; a kopogtató témák (a készüléké, a
 * szeleté vagy a gyökér darabjaié). ⛔ Önmagunkat nem kérdezzük. ⭐ A felület `dht: false`-szal hívja: a DHT-n keresni és
 * jelentkezni az őrjárat címjegyzék-köre úgyis megteszi (új függőnél azonnal) — egy lapletöltés ne kerüljön KB-okba.
 * @param {{fajta: string, kulcs: string, n?: number, m?: boolean, utan?: {p: number, az: string}}} k
 * @param {{cimek?: Array<Object>, dht?: boolean}} [b]
 * @returns {Promise<{r: Object, kopogtatok: Array<Object>, kp: number}>}
 */
async function fuggoKerelemFelvetele(k, { cimek = null, dht = false } = {}) {
  const induloCelok = [...(cimek ?? tarsakSorrendje(await tarsakTarolo().olvas()).map((c) => ({ hoszt: c.hoszt, port: Number(c.port) })))];
  const celok = [];
  const kopogtatok = [];
  if (k.kulcs !== GYOKER_KULCS) {
    // ⭐ D102 (J4): X tartói közül ELŐRE az, aki X ágából a legtöbbet tartja (a raj-jegyzékből) — az ő legjobb-először
    // válasza hozza a legtöbb szintet. A rang a lista sorrendje (`tarshozIllo` ebből választ).
    const jegyzek = await szeletJegyzekTarolo().olvas();
    const tartoi = szeletCimei(jegyzek, k.kulcs);
    const agban = await agSzeleteiTartonkent(jegyzek, k.kulcs, tartoi);
    tartoi.sort((a, b) => (agban.get(b.alairo) ?? 0) - (agban.get(a.alairo) ?? 0));
    for (const c of tartoi) {
      celok.push({ hoszt: c.hoszt, port: Number(c.port), ...(c.alairo ? { alairo: c.alairo } : {}) });
      if (c.alairo) kopogtatok.push({ fajta: 'keszulek', kulcs: c.alairo });
    }
    // ⭐ D111 (K11): a keresésből jött TARTÓ-TIPP — a felajánló (tulajdonos) készüléke; címe nincs, a saját kopogtató
    // témáján jelentkezünk (a D92 fő útja): a címjegyzék-körében meglát, és felém kopog — a NAT mögött is.
    const sajatTabla = (await tablaKulcsBiztositasa()).alairoNyilvanos;
    for (const a of await tartoTippjei(k.kulcs)) {
      if (a !== sajatTabla && !kopogtatok.some((x) => x.fajta === 'keszulek' && x.kulcs === a)) kopogtatok.push({ fajta: 'keszulek', kulcs: a });
    }
    kopogtatok.push({ fajta: 'szelet', kulcs: k.kulcs });
    if (dht) {
      try {
        for (const t of await cimjegyzekKeresese(cimjegyzekTema(KOINO, 'szelet', k.kulcs))) celok.push({ hoszt: t.cim, port: t.port });
      } catch { /* a DHT segédeszköz */ }
    }
  } else {
    // A gyökér: a darab a saját tudásomból (egy friss készüléknél 0), és a szomszédos mélységek (D91/3).
    const m = (await gyokerMelysegem()).melyseg;
    const darabok = [[m, 0], ...(m > 0 ? [[m - 1, 0]] : []), ...(m < GYOKER_MAX_MELYSEG ? [[m + 1, 0], [m + 1, 1]] : [])];
    for (const [mm, dd] of darabok) {
      kopogtatok.push({ fajta: 'gyoker', kulcs: mm + ':' + dd });
      if (dht) {
        try {
          for (const t of await cimjegyzekKeresese(gyokerDarabTemaja(KOINO, mm, dd))) celok.push({ hoszt: t.cim, port: t.port });
        } catch { /* a DHT segédeszköz */ }
      }
    }
  }
  // Az induló címek a raj tartói UTÁN (a raj tartója biztosan tartja X-et; az induló cím nem feltétlenül).
  celok.push(...induloCelok);
  // ⛔ ÖNMAGUNKAT NEM KÉRDEZZÜK: a saját gyökér-darabunkat mi is hirdetjük, a DHT a mi címünket is visszaadja
  // (a gép címe + a futó kapu portja — a 42. mérés tanulsága: a készülék önmagát hívogatta).
  const sajatGep = await sajatOsszesCim();
  const kp = await kapuPortja();
  const idegenCelok = celok.filter((c) => !(sajatCimE(c.hoszt, sajatGep) && Number(c.port) === kp));
  const r = kerelemFelvetele(await kerelmekOlvasasa(), { fajta: k.fajta, kulcs: k.kulcs, n: k.n ?? 20, m: k.m === true,
    ...(k.utan ? { utan: k.utan } : {}), hatter: k.hatter === true, celok: idegenCelok, kopogtatok }, Date.now(), randomUUID());
  await kerelmekIrasa(r.nyilvantartas);
  return { r, kopogtatok, kp };
}

/**
 * ⭐ D102 (J4): X tartói közül ki mennyit tart X ÁGÁBÓL — a raj-jegyzék szerint, az ág ismert szeletein (X és a helyben
 * ismert leszármazottai, legfeljebb `AG_SZAMLALAS_KORLAT` — a 9. szabály: a terhe korlátos).
 * @returns {Promise<Map<string, number>>} tábla-aláíró → hány ág-szeletnél tartóként jegyezve
 */
const AG_SZAMLALAS_KORLAT = 500;
async function agSzeleteiTartonkent(jegyzek, kulcs, tartoi) {
  const ki = new Map();
  const keresett = new Set(tartoi.map((c) => c.alairo).filter(Boolean));
  if (!keresett.size) return ki;
  let entitasok;
  try { entitasok = (await kepetKeszit()).allapot.entitasok; } catch { return ki; }
  const gyerekek = new Map();
  for (const e of entitasok.values()) {
    if (!e.szulo) continue;
    if (!gyerekek.has(e.szulo)) gyerekek.set(e.szulo, []);
    gyerekek.get(e.szulo).push(e.azonosito);
  }
  const sor = [kulcs];
  const latott = new Set(sor);
  for (let i = 0; i < sor.length && i < AG_SZAMLALAS_KORLAT; i++) {
    for (const c of szeletCimei(jegyzek, sor[i])) if (c.alairo && keresett.has(c.alairo)) ki.set(c.alairo, (ki.get(c.alairo) ?? 0) + 1);
    for (const g of gyerekek.get(sor[i]) ?? []) if (!latott.has(g)) { latott.add(g); sor.push(g); }
  }
  return ki;
}

/**
 * ⭐⭐ A HÁZ (D100, H1): a lap hiányzó részeinek elkérése — legfeljebb `LAP_KERES_KORLAT` függő kérelem egy lekéréskor (a
 * függők jegyzéke korlátos — 16 —, egy lap ne töltse meg), az őrjárat hozza. Visszaadja, hány függ még ezekből (a lap
 * addig „betöltés…”-t mutat, és újrakérdez).
 * @param {Array<{fajta: string, kulcs: string, d?: number}>} hianyzik - a `pakliHierarchia` listája
 */
// ⭐ D102: 16 (a bejáró előre kér — a 74. mérés; a függők korlátja 64).
const LAP_KERES_KORLAT = 16;

/**
 * ⭐ D101: a lapos pakli megjegyzése — a lista határa (M2) és az ág-szűrés tudás-határa (D19); a lap az állapot-sorba írja.
 * @param {{nemEldontheto: number}} oldal - a `pakliOldal` válasza
 * @param {{fuggo: number, celos: number}} keres - a `lapHianyzoinakElkerese` válasza
 * @param {boolean} szigoru - a szigorú (b) alatt („alap” kiszolgálás) — a lista ilyenkor a koinó töredéke
 * @returns {string|null}
 */
/**
 * ⭐ D101 ③: a Struktúra megjegyzése — mire épül a fa (a készüléken ismert rész, a keret), meddig biztos a sorrend, és
 * mit kértem el (D19, M2). A lap a folyamatjelző és a súgó alá írja (`koinoModalok.js`).
 */
/**
 * ⭐ D101 ④: a Síkidom megjegyzése — EGY mondat a nézet egészéről (nem síkidomonként: a lap a vászon tetejére írja). A
 * gyerekek válaszán: mire épül a nézet, és ha kérés úton van a hiányzóért, hogy magától megjelenik; az ős-lánc válaszán:
 * ha egy felmenő nincs meg (D19, M2).
 */
function sikidomMegjegyzes(r, allas) {
  if (Array.isArray(r.oslanc)) {
    return r.oslanc.length && !r.teljesLanc
      ? 'A felmenői közül nem ismerek mindet — elkértem; addig a legfelső ismert felmenőtől látszik.' : null;
  }
  if (r.mindentTart && allas.fuggo === 0) return null;
  return 'A síkidom a készülékeden ismert részből épül' + (allas.fuggo > 0
    ? ' — ' + allas.fuggo + ' kérés úton van a hiányzó ágakért; ' + (allas.celos > 0
      ? 'ami megjön, magától megjelenik.' : 'a tartóikat keresem.')
    : '.');
}

/**
 * ⭐ D101 ⑤: a Keresés megjegyzése — hol kerestem (a készüléken ismert entitások címében); ⭐ a kereső-réteg ⑦: a hálózati
 * keresés állása (`h` — fut, kész: hány tartót kérdeztem, hány felelt, hány találat jött) és a NAT mögötti tartókhoz függő
 * kérelemként ment kérdés (`fa` — `keresesFuggoAllasa`; és hogy az őrjárat fut-e, ami viszi); ág-szűrésnél, hánynál nem
 * tudom eldönteni, hogy az ágban van-e (D19, M2). Üres kérdésre nincs mit mondani.
 */
function keresesMegjegyzes(r, keres, h = null, fa = null, orjaratFut = true) {
  if (r.ismert === 0 && !r.talalatok.length && r.nemEldontheto === 0 && !h) return null;
  const reszek = ['A keresés a készülékeden ismert ' + r.ismert + ' entitás címében keresett' + (h ? '' : '.')];
  // ⭐ A kereső-réteg ⑦: a hálózati keresés állása (a háttérben fut; a találatai az átmeneti tárba, onnan a helyi listába).
  if (h?.fut) reszek[0] += ' — és a hálózaton is keresem (a kereső-réteg)…';
  else if (h?.kesz) {
    const e = h.eredmeny;
    if (h.hiba || !e) reszek[0] += '; a hálózati keresés most nem sikerült' + (h.hiba ? ': ' + h.hiba : '') + '.';
    else if (!e.kerdezett) reszek[0] += '; a hálózaton most nem találtam a kérdéshez tartót (a régió tartói nem hirdetnek).';
    else if (!e.valaszolt) reszek[0] += '; a hálózaton ' + e.kerdezett + ' tartót kérdeztem, egy sem válaszolt (NAT mögött lehetnek).';
    else {
      reszek[0] += '; a hálózatról ' + e.talalatok.length + ' találat jött (a kereső-réteg, ' + e.valaszolt + ' tartótól'
        + (e.minta ? '; a szó nagyon gyakori — a válasz minta' : '') + ').';
      if (e.tagsagNelkul) reszek.push(e.tagsagNelkul + ' hálózati találatot kihagytam: a szerzők tagsága nem ellenőrizhető.');
    }
    // ⭐ ⑦b: a NAT mögötti tartókhoz a kérdés függő kérelemként ment (az őrjárat viszi tovább).
    if (fa?.megjott) reszek.push('Az őrjárat a NAT mögötti tartóktól ' + fa.talalat + ' találatot hozott.');
    if (fa?.fuggo) {
      reszek.push(orjaratFut
        ? 'A kérdést az őrjárat viszi tovább a NAT mögötti tartókhoz (' + fa.fuggo + ' hely) — a válasz percek múlva is jöhet; ez az ablak addig figyel.'
        : 'A kérdés a NAT mögötti tartókhoz függő kérelemként vár (' + fa.fuggo + ' hely) — de az őrjárat nem fut, így most nem megy tovább.');
    }
  }
  if (r.nemEldontheto > 0) {
    reszek.push(r.nemEldontheto + ' találatról nem tudom eldönteni, ebben az ágban van-e (egy felmenője nincs meg)'
      + (keres.fuggo > 0 ? ' — elkértem.' : '.'));
  }
  return reszek.join(' ');
}

// ===================================
// ⭐⭐ D101 ⑥: A POSTAFIÓK — a készüléken, két pillanatkép különbségéből (`ertesites.js`)
// ===================================
//
// A felület ÉS az őrjárat számol (D103 óta — hogy zárt lapnál is jöjjön a készülék értesítése): a felület a postafiók
// kérdésére mindig, a kártyák számlálójához legfeljebb fél percenként; az őrjárat percenként legfeljebb egyszer. ⛔ A
// műveletek egy folyamaton belül SORBAN mennek (`postafiokSor`), a folyamatok közt egy ZÁR alatt (`ertesitesTarolo` `zar`):
// egy olvasott-jelölés különben elveszhetne egy közben futó (másik folyamatbeli) számolás írása alatt.

/** A kártyák számlálója legfeljebb ennyi időnként számol újra (a postafiók kérdése mindig). */
const POSTAFIOK_SZAMLALO_SZUNET = 30 * 1000;
/** ⭐ D103: az őrjárat legfeljebb ennyi időnként számolja a postafiókot (a készülék értesítéséhez). */
const POSTAFIOK_ORJARAT_SZUNET = 60 * 1000;
let postafiokSor = Promise.resolve();

/** Egy postafiók-művelet a sor végére és a koinó zárja alá (a hibája nem akasztja meg a többit). */
function postafiokMuvelet(koino, fn) {
  const fut = postafiokSor.then(() => ertesitesTarolo(koino).zar(fn), () => ertesitesTarolo(koino).zar(fn));
  postafiokSor = fut.catch(() => {});
  return fut;
}

/**
 * ⭐ A postafiók frissítése: a mostani pillanatkép az előzőhöz képest (az első az alapvonal — semmit nem jelez), az új
 * tételek a postafiók elejére. ⭐ D103: és a készülék értesítése a globális beállítás szerint (`keszulekErtesitesei` — mit
 * kell jelezni; a kiküldés a zár UTÁN megy, a hibája feljegyezve). Visszaadja a postafiókot és a kép entitásait.
 * @param {Object} k - { tar, koino, nezet, bemondasok, szerzo, szunet }
 */
async function postafiokFrissitese({ tar: t, koino, nezet, bemondasok: b, szerzo: en, szunet = 0 }) {
  const ki = await postafiokMuvelet(koino, async () => {
    const tarolo = ertesitesTarolo(koino);
    const pf = postafiokAlakja(await tarolo.postafiokOlvas());
    const most = Date.now();
    if (szunet > 0 && pf.kep && most - (pf.frissitve ?? 0) < szunet) return { pf, entitasok: null, uzenetek: [] };
    const beallitasok = beallitasokAlakja(await tarolo.beallitasOlvas());
    const { kep, entitasok } = await ertesitesiKep(t, koino, { szerzo: en, nezet, bemondasok: b, most });
    const ujak = ertesitesekSzamitasa(pf.kep, kep, { beallitasok, entitasok, en, most });
    const uj = postafiokBovitese(pf, ujak, kep, most);
    const k = keszulekErtesitesei(ujak, beallitasok.globalis, uj.kezbesites, most, (az) => entitasok.get(az)?.cim ?? null);
    uj.kezbesites = k.kezbesites;
    await tarolo.postafiokIr(uj);
    return { pf: uj, entitasok, uzenetek: k.uzenetek };
  });
  if (ki.uzenetek?.length) {
    const r = await keszulekErtesitese(ki.uzenetek);
    ki.kuldve = r.kuldve;
    if ((r.hiba ?? null) !== (ki.pf.kezbesites?.hiba ?? null)) {
      await postafiokModositasa(koino, (pf) => { pf.kezbesites = { ...pf.kezbesites, hiba: r.hiba }; });
      ki.pf.kezbesites = { ...ki.pf.kezbesites, hiba: r.hiba };
    }
  }
  return ki;
}

/** Egy olvasott-jelölés vagy törlés a postafiókban (sorban és zár alatt). @returns {Promise<any>} a `fn` eredménye */
async function postafiokModositasa(koino, fn) {
  return postafiokMuvelet(koino, async () => {
    const tarolo = ertesitesTarolo(koino);
    const pf = postafiokAlakja(await tarolo.postafiokOlvas());
    const eredmeny = fn(pf);
    await tarolo.postafiokIr(pf);
    return eredmeny;
  });
}

/** ⭐ D103: az őrjárat köre — a postafiók és a készülék értesítése (percenként legfeljebb egyszer). */
let orjaratNezete = null;

// ===================================
// ⭐⭐ D112 ③: A FELDERÍTÉS — a háttérben futó, rögzített Struktúra (D108/1)
// ===================================
//
// Egy felderítés egy ág egyszeri pillanatképe: az ág legjobb K csomópontja (a Struktúra sorrendje, legfeljebb d szint
// mélyen — `pakli.js` `felderitesAllasa`), az átmeneti tárba, RÖGZÍTVE (`atmenetiTar.js` `rogzites` — a böngészés nem söpri
// ki, a bemondott össz-pontjai is megmaradnak: `korlatosBemondasok`). Az őrjárat körönként lép (`felderitesKor`): a látható
// csomópontok szeleteit rögzíti, a hiányzót függő kérelemként elkéri — HÁTTÉR-kérésként (F6: egy társnál a lap kérései
// előbb mennek), körönként legfeljebb a beállított számot, és csak ha a függő kérelmek közt van hely a lapnak is
// (`FELDERITES_FUGGO_HATAR`). Kész, ha a sorrend az első K-ig biztos; megáll a beállított méretnél; 30 nap után a
// rögzítése feloldódik. A jegyzék helyi (`<koino>/felderitesek.json`).
const FELDERITES_FUGGO_HATAR = 48;
/** ⭐ Egy függő kérelem ugyanannál a társnál legfeljebb ennyi időnként próbálkozik újra (a próbák: `KOINO_KERELEM_UJRAPROBA` ms). */
const KERELEM_UJRAPROBA = kornyezetSzam('KOINO_KERELEM_UJRAPROBA', 2 * 60 * 1000);
const felderitesFajl = () => join(alapHely(), KOINO, 'felderitesek.json');
async function felderitesJegyzekOlvasasa() {
  try { return felderitesJegyzekAlakja(JSON.parse(await readFile(felderitesFajl(), 'utf8'))); } catch { return uresFelderitesJegyzek(); }
}
async function felderitesJegyzekIrasa(j) {
  await mkdir(dirname(felderitesFajl()), { recursive: true });
  const ideiglenes = felderitesFajl() + '.' + process.pid + '.uj';
  await writeFile(ideiglenes, JSON.stringify(felderitesJegyzekAlakja(j)), 'utf8');
  await rename(ideiglenes, felderitesFajl());
}

/**
 * ⭐ A felderítés köre (az őrjárat minden körében, és a `felderites` parancs indításkor): az elévültek feloldása, és minden
 * futó felderítés egy lépése. @returns {Promise<{fut: number, kert: number, lezart: string[]}>}
 */
async function felderitesKor() {
  let j = await felderitesJegyzekOlvasasa();
  const most = Date.now();
  let valtozott = false;
  for (const az of elevultFelderitesek(j, most)) {
    await atmeneti.rogzitesFeloldasa(az);
    j = felderitesTorlese(j, az);
    valtozott = true;
  }
  const futok = j.felderitesek.filter((f) => f.allapot === 'fut');
  if (!futok.length) {
    if (valtozott) await felderitesJegyzekIrasa(j);
    return { fut: 0, kert: 0, lezart: [] };
  }
  await atmeneti.frissit();
  orjaratNezete ??= ujPakliNezet({ osszegzesek: ellenorzottOsszegzesek, tartott: tartottSzeleteim });
  let hely = Math.max(0, FELDERITES_FUGGO_HATAR - ((await kerelmekOlvasasa())?.fuggo?.length ?? 0));
  let kert = 0;
  const lezart = [];
  for (const f of futok) {
    const a = await felderitesAllasa(ketTarNezet(tar, atmeneti), KOINO, { agazat: f.ag === GYOKER_AG ? null : f.ag, keret: f.k,
      maxMelyseg: f.melyseg, nezet: orjaratNezete, bemondasok: await bemondasok(), fejlecTudas: await fejlecTudas() });
    // A rögzítés: a látható csomópontok szeletei (és maga az ág, ha az átmenetiben van) — ami még nincs meg, azt a
    // következő kör rögzíti, amikor megjött.
    await atmeneti.rogzites([...a.latszik, ...(f.ag !== GYOKER_AG ? [f.ag] : [])], f.az);
    let bajt = atmeneti.rogzitesAllasa(f.az).bajt;
    // ⭐ D112 ④: A TÖRZS-FÁZIS — a látható csomópontok szöveg-darabja és fájljai (csak a vállaló adja — D84/1); ami megvan,
    // a felderítés méretébe számít (és a fájl-tár takarítása védettnek látja — a rögzítés miatt).
    // ⚠️ A törzs állását a fejléc-fázisban is számoljuk (ha a törzs kell): amikor a fejlécek elkészülnek, a törzs-kérések UGYANABBAN
    // a körben indulnak — különben a következő kör cseréje (a randevú) előbb hozná, és a felderítés egy kört várna (mérve).
    let torzsHianyzik = null;
    const torzsKerendo = [];
    if (f.torzs) {
      const blob = fajlBlobTarolo(KOINO);
      const meretek = new Map((await blob.allapot()).map((x) => [x.lenyomat, x.meret]));
      for (const az of a.latszik) {
        const e = a.entitasok.get(az);
        if (!e) continue;
        let hianyzik = false;
        for (const l of await torzsLenyomatai(e, (x) => blob.olvas(x))) {
          if (meretek.has(l)) bajt += meretek.get(l); else hianyzik = true;
        }
        if (hianyzik) torzsKerendo.push({ fajta: 'torzs', kulcs: az });
      }
      torzsHianyzik = torzsKerendo.length;
    }
    const { f: uj, kerj } = felderitesLepese(f, { ismert: a.ismert, latszik: a.latszik.length, biztos: a.biztos,
      hianyzik: a.hianyzik.length, agIsmert: a.agIsmert, bajt, torzsHianyzik, agOsszes: a.agOsszes,
      agOsszesLegalabb: a.agOsszesLegalabb }, most);
    const db = Math.min(kerj, hely);
    // ⚠️ Ha az ág gyökere még nem ismert, a bejáró csak a GYEREKEIT kéri (a fejléc-kérdés X alatt felel) — magát az ágat a
    // szelete hozza (különben a felderítés soha nem lenne kész).
    const kerendok = uj.fazis === 'torzs' ? torzsKerendo
      : (a.agIsmert ? a.hianyzik : [{ fajta: 'szelet', kulcs: f.ag }, ...a.hianyzik]);
    if (db > 0 && kerendok.length) {
      const r = await lapHianyzoinakElkerese(kerendok, { korlat: db, hatter: true });
      uj.kerelmek += r.kert;
      kert += r.kert;
      hely -= r.kert;
    }
    if (uj.allapot !== 'fut') lezart.push(uj.az);
    j.felderitesek = j.felderitesek.map((x) => (x.az === uj.az ? uj : x));
  }
  await felderitesJegyzekIrasa(j);
  return { fut: futok.length - lezart.length, kert, lezart };
}
async function orjaratErtesitesei() {
  orjaratNezete ??= ujPakliNezet({ osszegzesek: ellenorzottOsszegzesek, tartott: tartottSzeleteim });
  return postafiokFrissitese({ tar: ketTarNezet(tar, atmeneti), koino: KOINO, nezet: orjaratNezete,
    bemondasok: await bemondasok(), szerzo, szunet: POSTAFIOK_ORJARAT_SZUNET });
}

/**
 * ⭐ D101 ⑥: a postafiók megjegyzése — hol számolódik, és mit nem tudhat (D19, M3/A). A szigorú (b) alatt csak abból, amit
 * a készülék tart.
 */
function postafiokMegjegyzes(szigoru) {
  return 'A postafiókod a készülékeden számolódik, abból, ami ide megérkezett'
    + (szigoru ? ' — csak ahol tudatpontod van (amit a készüléked tart); egy mélyebb ágról, ahol nincs pontod, nem tudok.' : '.');
}

/** Hány fejléc- és szelet-kérelem vár (és hánynak van célja) — a nézetek megjegyzéséhez. */
async function fuggoKerelmekAllasa() {
  const f = ((await kerelmekOlvasasa())?.fuggo ?? []).filter((x) => x.fajta === 'fejlecek' || x.fajta === 'szelet');
  return { fuggo: f.length, celos: f.filter((x) => (x.celok ?? []).length > 0).length };
}

function strukturaMegjegyzes(d, keres) {
  const elkertem = keres.fuggo > 0 ? (keres.celos > 0 ? ' — elkértem, az őrjárat hozza (nyisd meg újra később).'
    : ' — elkértem, a tartóit keresem.') : '.';
  const reszek = ['A fa a készülékeden ismert részből épül: ' + d.ismert + ' entitás'
    + (d.ismert > d.latszik ? ', ebből a legerősebb ' + d.latszik + ' látszik (keret: ' + d.keret + ')' : '') + '.'];
  if (d.biztos < d.latszik) {
    // ⭐ (Csaba, 2026-10-23: „(B) Az első 200-at”): a Struktúra magától csak az első `kerHatar`-ig kér — ezen túl a felderítést
    // ajánlja (a „+N” jelek mutatják, hol van még).
    const tovabb = Number.isInteger(d.kerHatar) && d.biztos >= d.kerHatar
      ? ' — a Struktúra magától az első ' + d.kerHatar + '-ig kér; a többit egy felderítés hozza el (a kártya menüjéből, vagy a'
        + ' fő menü „Az egész koinó felderítése…” pontjából), a „+N” jelek mutatják, hol van még.'
      : elkertem;
    reszek.push((d.biztos > 0 ? 'Az első ' + d.biztos + ' biztos; utána hiányozhat egy-egy ág, amit még nem ismerek'
      : 'Még hiányozhat egy-egy ág, amit nem ismerek') + tovabb);
  } else if (d.hianyzik.some((h) => h.fajta === 'fejlecek')) {
    reszek.push('A fa folytatódhat azzal, amit még nem ismerek' + elkertem);
  }
  if (d.nemEldontheto > 0) {
    reszek.push(d.nemEldontheto + ' entitásról nem tudom eldönteni, ebben az ágban van-e (egy felmenője nincs meg).');
  }
  return reszek.join(' ');
}

function laposMegjegyzes(oldal, keres, szigoru) {
  const reszek = [];
  // ⭐ D102: az ágazati pont szerint csökkenő sor biztos előtagja — utána még hiányozhat, amit nem ismerek.
  const elkertem = keres.fuggo > 0 ? (keres.celos > 0 ? ' — elkértem, az őrjárat hozza.' : ' — elkértem, a tartóit keresem.') : '.';
  if (Number.isInteger(oldal.biztos) && oldal.biztos < oldal.osszes) {
    reszek.push((oldal.biztos > 0 ? 'Az első ' + oldal.biztos + ' biztos sorrendben; utána még hiányozhat, amit nem ismerek'
      : 'A sorrend még nem biztos: bármelyik elé kerülhet, amit még nem ismerek') + elkertem);
  } else if (Number.isInteger(oldal.biztos) && oldal.hianyzik?.some((h) => h.fajta === 'fejlecek')) {
    // ⭐ Amit látok, az biztos sorrendben áll — de a sor folytatódhat azzal, amit még nem ismerek (a bejáró elkérte).
    reszek.push('Amit látsz, az biztos sorrendben áll, de a sor folytatódhat azzal, amit még nem ismerek' + elkertem);
  }
  // ⭐ D101/M2: a lapos rendezés (az időrend, a saját pont, a növekvő irány — és amíg a bejáró nincs meg, az ágazati is)
  // a HELYBEN ismert entitásokból áll. A szigorú (b) alatt ez a koinó töredéke — kimondjuk, végleges alakként.
  if (szigoru) reszek.push('A lista a készülékeden ismert entitásokból áll — ami nincs ezen a készüléken, abban nem.');
  if (oldal.nemEldontheto > 0) {
    reszek.push(oldal.nemEldontheto + ' entitásról nem tudom eldönteni, ebben az ágban van-e: egy felmenője nincs meg '
      + 'ezen a készüléken' + (keres.fuggo > 0 ? (keres.celos > 0 ? ' — elkértem, az őrjárat hozza'
        : ' — elkértem, a tartóit keresem') : '') + '.');
  }
  return reszek.length ? reszek.join(' ') : null;
}

/**
 * ⭐ D101: a Tudatpontok modál megjegyzése — a tudás határa (D19), a lap a lista alá írja (`koinoModalok.js`).
 * @param {{data: Array, osszes: number, nemEldontheto: number}} lista - a `sajatHozzarendelesek` válasza
 * @param {{fuggo: number, celos: number}} keres - a `lapHianyzoinakElkerese` válasza
 * @returns {string|null} null, ha nincs mit mondani
 */
function hozzarendelesMegjegyzes(lista, keres) {
  const reszek = [];
  if (lista.nemEldontheto > 0) {
    reszek.push(lista.nemEldontheto + ' hozzárendelésedről még nem tudom eldönteni, ebben az ágban van-e: egy '
      + 'felmenője nincs meg ezen a készüléken'
      + (keres.fuggo > 0 ? (keres.celos > 0 ? ' — elkértem, az őrjárat hozza (nyisd meg újra később)'
        : ' — elkértem, a tartóit keresem') : '') + '.');
  }
  if (lista.osszes > lista.data.length) {
    reszek.push('A legutóbb rendezett ' + lista.data.length + ' látszik, összesen ' + lista.osszes + ' van.');
  }
  return reszek.length ? reszek.join(' ') : null;
}
// ⭐ Amit a kérelem nemrég elhozott, azt ennyi ideig nem kérjük újra (a nem tartott ág gyerekeit a lekérdezés soha nem
// tekinti BIZTOSNAK — e nélkül a lap minden lekérésnél újra kérne, és örökké „betöltés”-t mutatna; próba mérte).
const LAP_FRISSESSEG = 10 * 60 * 1000;
async function lapHianyzoinakElkerese(hianyzik, { korlat = LAP_KERES_KORLAT, hatter = false } = {}) {
  const kertek = [];
  const eddig = await kerelmekOlvasasa();
  // ⭐ D102: a folytatás (`utan`) külön kérelem — a nemrég elhozott ELEJE nem tiltja a folytatást.
  const nemregKesz = (fajta, kulcs, utan) => (eddig?.kesz ?? []).some((x) => x.fajta === fajta && x.kulcs === kulcs
    && (x.utan?.az ?? null) === (utan?.az ?? null)
    && String(x.eredmeny).startsWith('megjött') && Date.now() - (x.ido ?? 0) < LAP_FRISSESSEG);
  for (const h of (Array.isArray(hianyzik) ? hianyzik : []).slice(0, korlat)) {
    const kulcs = h.kulcs === '' ? GYOKER_KULCS : h.kulcs;
    if (nemregKesz(h.fajta, kulcs, h.utan)) continue;
    const k = { fajta: h.fajta, kulcs, n: 50, m: h.m === true, ...(h.utan ? { utan: h.utan } : {}), ...(hatter ? { hatter: true } : {}) };
    try { await fuggoKerelemFelvetele(k, { dht: false }); kertek.push(h); }
    catch (hiba) { console.warn('a lap kérelme nem vehető fel', { ok: hiba.message }); }
  }
  const ny = await kerelmekOlvasasa();
  const fuggok = (ny?.fuggo ?? []).filter((x) => kertek.some((h) => x.fajta === h.fajta && x.kulcs === (h.kulcs === '' ? GYOKER_KULCS : h.kulcs)
    && (x.utan?.az ?? null) === (h.utan?.az ?? null)));
  // ⭐ Van-e kitől kérni (egy ismert tartó vagy induló cím)? Ha nincs, a kérelem csak kopogtat (a G témáin) — a lap ezt
  // kimondja, nem ígér „betöltést”, ami egy társ nélküli készüléken soha nem érkezne meg.
  // ⭐ D111: a tartó-tipp (a készülék kopogtató témája) is „kitől” — a tipp készüléke a címjegyzék-körében felém kopog.
  const celos = fuggok.filter((x) => (x.celok ?? []).length > 0 || (x.kopogtatok ?? []).some((k) => k.fajta === 'keszulek')).length;
  return { kert: kertek.length, fuggo: fuggok.length, celos };
}

let lancKiszolgaloPeldany = null;
/** A lánc-kör kiszolgálója (folyamatonként egy — a részfa-gyorsítótára így megmarad). */
function lancKiszolgaloja() {
  lancKiszolgaloPeldany ??= lancKiszolgalo({ tar, koino: KOINO });
  return lancKiszolgaloPeldany;
}

/** A kérdéseim egy cserében: a társ ismert szerzői kulcsa elöl, aztán a most kapott események szerzői. */
async function lancKerdeseim(ujak, tarsAlairo) {
  const tarolo = lancEllenorzesTarolo(KOINO);
  const jeloltek = [];
  const ismert = tarsAlairo ? await lancTarsSzerzoje(tarolo, tarsAlairo) : null;
  if (ismert) jeloltek.push(ismert);
  for (const az of Array.isArray(ujak) ? ujak.slice(0, 512) : []) {
    const e = await tar.esemeny(az);
    if (typeof e?.szerzo === 'string') jeloltek.push(e.szerzo);
  }
  return lancKerdesek({ tar, koino: KOINO, tarolo, sajat: szerzo }, jeloltek);
}

/** A válaszok feldolgozása és a bizonyítékok bejelentése (ismétlés nélkül — `ellentmondasokBejelentese`). */
async function lancValaszokFogadasa(kerdesek, valaszok) {
  const r = await lancValaszokFeldolgozasa({ tar, koino: KOINO, tarolo: lancEllenorzesTarolo(KOINO) }, kerdesek, valaszok);
  if (r.leletek.length) {
    const b = await ellentmondasokBejelentese(kornyezet, r.leletek);
    if (b.bejelentve) {
      kiir(SZIN.nem + '  ⚠ a lánc-ellenőrzés ' + b.bejelentve + ' bizonyított ellentmondást talált és jelentett be (D98, D82/D80)'
        + SZIN.vege + SZIN.halvany + (b.nincsHorgony ? ' · ' + b.nincsHorgony + ' vádoltnak nincs nálunk horgonya' : '') + SZIN.vege);
    }
    return { ...r, ...b };
  }
  return r;
}

// ===================================
// ⭐⭐ D92: A KÉRELEM KISZOLGÁLÁSA ÉS A BEMONDOTT ÖSSZ-PONTOK
// ===================================
//
// A tartó a kapu munkájában szolgálja ki a kérelmet (a `parbeszed` a kívülről kapott kiszolgálót hívja — a vonal
// semmit nem tud a koinóról). A fejlécek a két tárból számolt állapotból jönnek; a részfa-fák egy folyamatonként
// megmaradó karbantartóban élnek (a fa egy változása < 1 ms, a nulláról építés nagy részfánál másodpercek — 62.
// mérés). ⛔ A törzset csak a vállalt szeletre adjuk, és csak azt, ami tényleg megvan (D84/1).

const kerelemKarbantarto = reszfaKarbantarto();

/** A bemondott össz-pontok helye (helyi gyorsítótár, nem esemény, nem terjed). */
function bemondasFajl() {
  return join(alapHely(), KOINO, 'osszpontok.json');
}
const BEMONDAS_KORLAT = kornyezetSzam('KOINO_BEMONDAS_KORLAT', 10000);

/**
 * ⭐ A bemondott össz-pontok a számításnak — a fájlbeliek, és D95/1 óta az összegezve tartott (nagy) szeleteim ellenőrzött
 * gyökere (`osszegzett` jellel: a szelet tartott, de csak összegezve — `osszPont.js`). ⚠️ Ez utóbbi nem kerül a fájlba.
 */
async function bemondasok() {
  const m = await bemondasokFajlbol();
  const t = await osszegzesTarolo(KOINO).olvas();
  for (const [k, x] of Object.entries(t.szeletek)) {
    if (x?.fok === 'osszegzo' && Number.isSafeInteger(x.osszPont) && x.osszPont >= 0) {
      // ⭐ D116: a tárolt gyökér a darabot is hozza (a D116 előtti egy összegű gyökér nem — akkor „nem tudom”).
      const ad = x.gyoker?.o?.length === RESZFA_HOSSZ ? x.gyoker.o[RESZFA_DARAB] : null;
      m.set(k, { osszPont: x.osszPont, ido: x.ellenorizve ?? 0, ellenorzott: true, osszegzett: true,
        ...(Number.isSafeInteger(ad) && ad >= 0 ? { alatta: ad } : {}) });
    }
  }
  return m;
}

/** A bemondott össz-pontok a fájlból: azonosító → { osszPont, ido, ellenorzott }. */
async function bemondasokFajlbol() {
  try {
    const b = JSON.parse(await readFile(bemondasFajl(), 'utf8'));
    return new Map(Object.entries(b && typeof b === 'object' ? b : {})
      .filter(([, x]) => x && Number.isSafeInteger(x.osszPont) && x.osszPont >= 0));
  } catch {
    return new Map();
  }
}

/** Új bemondások beírása (a legrégebbiek esnek ki a korlátnál). */
async function bemondasokBeirasa(ujak) {
  if (!ujak.size) return;
  const m = await bemondasokFajlbol();
  for (const [az, x] of ujak) { m.delete(az); m.set(az, x); }
  await writeFile(bemondasFajl(), JSON.stringify(Object.fromEntries(korlatosBemondasok(m))), 'utf8');
}

/**
 * ⭐ D112 ② (F2): a bemondások és a fejléc-tudás korlátja (`BEMONDAS_KORLAT`, a legrégebbi esik ki) a RÖGZÍTETT
 * (felderített) entitásokét megtartja — különben egy későbbi böngészés a pillanatkép össz-pontjait kiszorítaná, és a kártyái
 * „? pont”-tal maradnának.
 */
function korlatosBemondasok(m) {
  const rogzitettek = atmeneti.rogzitettKulcsok?.() ?? new Set();
  const lista = [...m.entries()].sort((a, b) => (a[1].ido ?? 0) - (b[1].ido ?? 0));
  const rog = lista.filter(([az]) => rogzitettek.has(az));
  const tobbi = lista.filter(([az]) => !rogzitettek.has(az));
  return [...tobbi.slice(Math.max(0, tobbi.length - Math.max(0, BEMONDAS_KORLAT - rog.length))), ...rog];
}

/** Egy esemény a két tárból (a tartósból, aztán az átmenetiből). */
async function esemenyKetTarbol(az) {
  return (await esemenyLekerese(tar, az)) ?? (await atmeneti.esemeny(az)) ?? null;
}

/**
 * ⭐ D92/1: hol figyel a futó kapu (az őrjáraté vagy a postaládáé) — a kopogtató témán EZT a portot jelentjük be, mert
 * a kopogásra a kapu felel, nem a kézi parancs. Helyi feljegyzés; ha nincs (vagy hibás), az alapport.
 */
function kapuFajl() {
  return join(alapHely(), KOINO, 'kapu.json');
}
async function kapuPortjaFeljegyzese(kapuPort) {
  try { await writeFile(kapuFajl(), JSON.stringify({ port: kapuPort, ido: Date.now() }), 'utf8'); } catch { /* nem végzetes */ }
}
async function kapuPortja() {
  try {
    const p = JSON.parse(await readFile(kapuFajl(), 'utf8'))?.port;
    return Number.isInteger(p) && p > 0 && p < 65536 ? p : ALAP_PORT;
  } catch {
    return ALAP_PORT;
  }
}

/**
 * ⭐ AZ ALSÓ SÁV (Csaba, 2026-10-15): a csere állapota a lapnak (`csereAllapot.js`) — az őrjárat köre és az utolsó csere,
 * egy helyi feljegyzésben (`<koino>/csere.json`). Folyamatonként egy tároló (a módosítások sorban mennek).
 */
const csereAllapotTarolok = new Map();
function csereAllapota(koino = KOINO) {
  if (!csereAllapotTarolok.has(koino)) csereAllapotTarolok.set(koino, csereAllapotTarolo(koino, alapHely(), csereAllapotAlakja));
  return csereAllapotTarolok.get(koino);
}

/** A függő kérelmek nyilvántartása (`fuggoKerelmek.js` — helyi, nem esemény). */
function kerelmekFajl() {
  return join(alapHely(), KOINO, 'kerelmek.json');
}
async function kerelmekOlvasasa() {
  try { return nyilvantartasAlakja(JSON.parse(await readFile(kerelmekFajl(), 'utf8'))); } catch { return ujNyilvantartas(); }
}
async function kerelmekIrasa(ny) {
  await writeFile(kerelmekFajl(), JSON.stringify(ny), 'utf8');
}

/**
 * ⭐ A FEJLÉC-VÁLASZ FELDOLGOZÁSA — a parancs és az őrjárat közös útja: az ellenőrzés (`fejlecekEllenorzese`), ami
 * átment, annak létrehozója és a minták pont-eseményei az ÁTMENETI tárba (ugyanazon a kapun — 3. szabály), az
 * össz-pontja a bemondások közé.
 * @returns {Promise<{e: Object, tetelek: Array, jok: number, bevett: number}>}
 */
async function fejlecValaszFeldolgozasa(r) {
  // ⭐ D102: a folytatás tételeinek szülője egy KORÁBBI oldalon állhat — amit a két tárban már ismerek, oda illesztem.
  let ismertek = new Map();
  try { ismertek = (await kepetKeszit()).allapot.entitasok; } catch { /* a kép nélkül csak a válaszon belül illeszt */ }
  const e = await fejlecekEllenorzese({ valasz: r.valasz, kert: r.kert, mintak: r.mintak, esemenyek: r.esemenyek,
    ismert: (az) => ismertek.has(az) });
  const tetelek = Array.isArray(r.valasz?.lista) ? r.valasz.lista : [];
  const ujBemondasok = new Map();
  const ujTudas = new Map();
  // ⭐ D102: A LEVÁGÁS HATÁRA. Ha a lista kifogyott (`teljes`), a válaszoló tartott csomópontjainak (és a kérdezettnek, ha
  // tartja) minden gyereke benne van; ha nem, a kimaradtak mind az utolsó (rendben lévő) tétel UTÁN jönnének a sorrendben.
  const rendben = tetelek.filter((t) => e.tetelek.get(t.az)?.rendben);
  const utolso = rendben.at(-1);
  const levag = r.valasz?.teljes === true && rendben.length === tetelek.length ? 'teljes'
    : (utolso ? { p: utolso.osszPont, az: utolso.az } : null);
  let bevett = 0, jok = 0;
  for (const t of rendben) {
    const ered = e.tetelek.get(t.az);
    jok++;
    const m = await esemenyMentese(atmeneti, t.letrehozo);
    if (m.mentve && !m.marMegvolt) bevett++;
    // ⭐ D116: az alatta lévők száma is (és ha a tartó maga sem tudta pontosan — `adb`); a darab-minták száma, ha volt.
    ujBemondasok.set(t.az, { osszPont: t.osszPont, ido: Date.now(), ellenorzott: ered.mintazott ? ered.minta.ellenorzott : 0,
      ...(Number.isSafeInteger(ered.ad) ? { alatta: ered.ad, ...(ered.adb ? { alattaBizonytalan: ered.adb } : {}),
        ...(ered.mintazott && ered.minta.darabEllenorzott ? { alattaEllenorzott: ered.minta.darabEllenorzott } : {}) } : {}) });
    // ⭐ J2: a gyerekszám (csak ha a válaszoló tartja), és vele a levágás — ⚠️ a levágás a tétel gyerekeire CSAK mély
    // válaszban igaz (ott a válaszoló a tartott tételek gyerekeit is bejárta); egy szinten csak a kérdezettre.
    if (Number.isSafeInteger(ered.gy)) {
      ujTudas.set(t.az, { gy: ered.gy, ...(levag && r.valasz?.m === true ? { levag } : {}), ido: Date.now() });
    }
  }
  // A kérdezett maga: a gyerekszáma (ha a válaszoló tartja) és a levágás — a folytatás innen tudja, hol tart.
  const kulcs = r.valasz?.kulcs;
  if (typeof kulcs === 'string' && (Number.isSafeInteger(r.valasz?.gy) || levag) && rendben.length === tetelek.length) {
    // ⭐ D116: és a kérdezett alatt lévők száma (a gyökérnél: a koinó, amennyit a tartó ismer) — a felderítés „N / összes”-éhez.
    const ad = Number.isSafeInteger(r.valasz.ad) && r.valasz.ad >= 0 ? r.valasz.ad : null;
    ujTudas.set(kulcs, { ...(Number.isSafeInteger(r.valasz.gy) ? { gy: r.valasz.gy } : {}), ...(levag ? { levag } : {}),
      ...(ad !== null ? { ad, ...(Number.isSafeInteger(r.valasz.adb) && r.valasz.adb > 0 ? { adb: r.valasz.adb } : {}) } : {}),
      m: r.valasz.m === true, ido: Date.now() });
  }
  // ⛔ D116: csak a pont-események — a darab-minták gyerekeinek születése BIZONYÍTÉK, nem tudás: ha a tárba kerülne, a gyerek
  // „ismert” lenne pont és fejléc nélkül (a felderítetlen rész kisebbnek látszana, és a bejáró egy csomópontot teljesnek
  // venne, aminek a gyerekei össz-pontját nem ismeri — a D102 biztos előtagja hibásan nőne). A bekötés-próba mérte.
  for (const pe of r.esemenyek) {
    if (pe?.tipus !== 'TudatpontRendezes') continue;
    const m = await esemenyMentese(atmeneti, pe);
    if (m.mentve && !m.marMegvolt) bevett++;
  }
  await bemondasokBeirasa(ujBemondasok);
  await fejlecTudasBeirasa(ujTudas);
  return { e, tetelek, jok, bevett };
}

// ===================================
// ⭐ D102: A FEJLÉC-TUDÁS — mit tudok egy csomópont gyerekeiről (a gyerekszám és a levágás határa)
// ===================================
//
// Helyi feljegyzés (nem esemény, nem terjed — 3. szabály), mint a bemondott össz-pontok: a bejáró (`pakli.js`) ebből tudja,
// mikor ismeri egy csomópont összes gyerekét (a helyben ismert gyerekek száma ≥ a bemondott gyerekszám), és ha nem,
// mekkora lehet egy még nem ismert gyerek (a levágás határa). Korlátos, mint a bemondások.
function fejlecTudasFajl() {
  return join(alapHely(), KOINO, 'fejlectudas.json');
}
/** A fejléc-tudás: azonosító (vagy `GYOKER_KULCS`) → { gy?, levag?: 'teljes' | { p, az }, m?, ido }. */
async function fejlecTudas() {
  try {
    const b = JSON.parse(await readFile(fejlecTudasFajl(), 'utf8'));
    return new Map(Object.entries(b && typeof b === 'object' ? b : {}).filter(([, x]) => x && typeof x === 'object'));
  } catch {
    return new Map();
  }
}
async function fejlecTudasBeirasa(ujak) {
  if (!ujak.size) return;
  const m = await fejlecTudas();
  for (const [az, x] of ujak) { m.delete(az); m.set(az, x); }
  await writeFile(fejlecTudasFajl(), JSON.stringify(Object.fromEntries(korlatosBemondasok(m))), 'utf8');
}

/**
 * ⭐⭐ D92/1: A FÜGGŐ KÉRELEM MUNKÁJA — a rés megnyílt egy társsal, akitől egy függő kérelmet várunk (a célja ő, vagy
 * egy ismeretlen bekopogó, miközben kopogtatunk). A csere helyett a kérelem fut; ha megjött, a kérelem lezárul, ha
 * nem, a próbálkozás feljegyződik (és ezt a társat ezzel a kérelemmel `KERELEM_UJRAPROBA` ideig nem kérdezzük újra).
 */
async function fuggoKerelemMunkaja(allapot, halo, tars, fk) {
  allapot.kerelemProbaltak.set(fk.az + '|' + tars.cim + ':' + tars.port, Date.now());
  // ⭐ D92/3: a kérő UGRAS_MAX-ot küld (és az azonosítót) — így a társ, ha nem tartja, továbbadhatja.
  const tovabb = { az: fk.az, htl: UGRAS_MAX };
  const k = { fajta: fk.fajta, kulcs: fk.kulcs, n: fk.n, m: fk.m === true, ...(fk.utan ? { utan: fk.utan } : {}), ...tovabb };
  const vege = { uj: 0, kuldott: 0, korok: 1, bajt: 0, alairo: null, kerelem: fk.fajta };
  let r;
  // ⭐ D107 L4 (④c): a felajánlás terhe a küldés pillanatában (a mai bejegyzéseim, a mai megújítással), a régió csoportjából.
  let felajanlott = null;
  if (fk.fajta === 'felajanlas') {
    const { csoportok } = await felajanlasCsoportjai(false);
    felajanlott = (csoportok.get(fk.kulcs)?.bejegyzesek ?? []).slice(0, FELAJANLAS_KORLAT);
    if (!felajanlott.length) {
      await kerelmekIrasa(kerelemLezarasa(await kerelmekOlvasasa(), fk.az, 'nincs mit felajánlani', Date.now()));
      return vege;
    }
  }
  try {
    r = fk.fajta === 'szelet'
      ? await szeletUdpResen(halo, tars.cim, tars.port, atmenetiCel, KOINO, fk.kulcs, { tovabb, ...await azonossagBeallitasa() })
      : fk.fajta === 'felajanlas'
      ? await kerelemUdpResen(halo, tars.cim, tars.port, KOINO,
        { fajta: 'felajanlas', kulcs: fk.kulcs, bejegyzesek: felajanlott, kiserok: await bejegyzesekKiseroi(felajanlott) },
        { ...await azonossagBeallitasa() })
      // ⭐ A kereső-réteg ⑦b: a kérdés a NAT mögötti tartóhoz (a hely és a kérdés a függő kérelemből).
      : fk.fajta === 'kereses'
      ? await kerelemUdpResen(halo, tars.cim, tars.port, KOINO,
        { fajta: 'kereses', kulcs: fk.kulcs, ...fk.ker, n: KERESES_TALALAT_KORLAT }, { ...await azonossagBeallitasa() })
      : await kerelemUdpResen(halo, tars.cim, tars.port, KOINO, k, {
        ...await azonossagBeallitasa(),
        mintaValaszto: (valasz) => mintaKeres(valasz),
        megvan: (await kepetKeszit()).esemenyek.map((e) => e.azonosito).slice(-5000),
        blob: fajlBlobTarolo(KOINO), korlat: FAJL_KORLAT,
        // ⭐ D114 (T1): a törzs fájljai a közös munkán (ha egy randevú épp ugyanazt hozza, csatlakozunk).
        kozosMunka: fajlMunkak, forras: tars.cim + ':' + tars.port });
  } catch (hiba) {
    kiir(SZIN.halvany + '  · ' + ora() + ' ' + tars.cim + ':' + tars.port + ' — a függő kérelem nem ment át: ' + hiba.message + SZIN.vege);
    await kerelmekIrasa(probalkozas(await kerelmekOlvasasa(), fk.az));
    return vege;
  }
  if (felajanlott) r.felajanlott = felajanlott;
  vege.uj = await fuggoEredmenyFeldolgozasa(fk, r, tars);
  vege.bajt = (r.bajtKuldott ?? 0) + (r.bajtKapott ?? 0);
  return vege;
}

/**
 * Egy függő kérelem eredménye — a lezárás vagy a próbálkozás, és a kiírás (az egyes és a sorozatos munka közös útja).
 * @returns {Promise<number>} hány új esemény jött
 */
async function fuggoEredmenyFeldolgozasa(fk, r, tars) {
  let siker = false, osszegzes = '', uj = 0;
  if (fk.fajta === 'szelet') { siker = (r.kapott ?? 0) > 0; uj = r.uj ?? 0; osszegzes = (r.kapott ?? 0) + ' esemény'; }
  else if (fk.fajta === 'fejlecek' && r.kiszolgalta) {
    const f = await fejlecValaszFeldolgozasa(r);
    // ⭐ A ház (D100): az ÜRES, de kiszolgált válasz is válasz — az entitásnak nincs (ismert) gyereke. ⛔ Ha jöttek tételek,
    // de egy sem állta ki az ellenőrzést, az nem siker (a következő tartó próbálkozik).
    siker = f.jok > 0 || f.tetelek.length === 0; uj = f.bevett; osszegzes = f.jok + ' fejléc';
  } else if (fk.fajta === 'torzs' && r.kiszolgalta) {
    const megjott = r.fajlok.filter((x) => x.kesz).length;
    siker = megjott > 0; osszegzes = megjott + ' fájl';
    // ⭐ D112 ①: a nem vállalt törzs a fájl-tár keretén belül (ritkítva; a most érkezett friss, nem megy).
    try { await fajlTarTakaritasa(); } catch { /* a takarítás hibája nem dönti el a kérelmet */ }
  } else if (fk.fajta === 'kereses' && r.kiszolgalta && r.kereses) {
    // ⭐ A kereső-réteg ⑦b: ugyanaz az ellenőrzés, mint a közvetlen kérdésnél (a kísérők a kapun, a tagság, az átmeneti tár);
    // az osztódott fiók mintáját újabb függő kérelemként (a mélyebb hely régiójának párján) kérem.
    const ker = fk.ker;
    const f = await keresesValaszFeldolgozasa(ker.kerdes, kerdesHelye(ker.k, ker.s, BigInt('0x' + ker.darab)), r.kereses);
    if (r.kereses.osztodott > ker.s) {
      const melyseg = (await keresoRegioim()).melyseg;
      for (const d of osztottMinta(r.kereses.osztodott, () => randomInt(0, 2 ** 31) / 2 ** 31)) {
        await keresesFuggoFelvetele({ k: ker.k, s: r.kereses.osztodott, darab: d.toString(16), kerdes: ker.kerdes }, melyseg);
      }
    }
    siker = true;
    osszegzes = f.jok.length + ' találat' + (f.tagsagNelkul ? ' (' + f.tagsagNelkul + ' kihagyva: a tagság nem ellenőrizhető)' : '');
  } else if (fk.fajta === 'felajanlas' && r.kiszolgalta && r.felajanlas) {
    // ⭐ D107 L4 (④c): a tartó felvette (vagy már tudta) — feljegyzem; az osztódott fiókot a mélyebb darab régiójába viszem.
    await felajanlasEredmenye(r.felajanlott ?? [], r.felajanlas);
    siker = true;
    osszegzes = r.felajanlas.felvett + ' bejegyzést vett fel' + (r.felajanlas.osztodott.length ? ', ' + r.felajanlas.osztodott.length
      + ' fiók osztódott' : '');
  }
  if (!siker && r.kesobb) {
    // ⭐ D109 (KK6): a tartó kiszolgálási kerete most nem enged — nem az ő hibája, és nem elbukott próbálkozás: addig nem
    // hívjuk, a kérelem a raj másik tartójánál próbálkozik.
    kesobbFeljegyzese(tars, r.kesobb);
    kiir(SZIN.halvany + '  ⏸ ' + ora() + ' függő kérelem (' + fk.fajta + ' ' + fk.kulcs.slice(0, 8) + '…) ' + tars.cim + ':'
      + tars.port + ' — a tartó most nem szolgál ki (a kiszolgálási kerete betelt), ' + r.kesobb + ' mp múlva újra' + SZIN.vege);
    return uj;
  }
  if (!siker && r.atvette) {
    // ⭐ A társ nem tartja, de továbbadja — a válasz később, `VALASZ`-ként jön (D87: lépésenként).
    kiir(SZIN.halvany + '  ↪ ' + ora() + ' függő kérelem (' + fk.fajta + ' ' + fk.kulcs.slice(0, 8) + '…) ' + tars.cim + ':'
      + tars.port + ' — nem tartja, de továbbadja; a válasz később jön' + SZIN.vege);
    await kerelmekIrasa(probalkozas(await kerelmekOlvasasa(), fk.az));
    return uj;
  }
  const ny = await kerelmekOlvasasa();
  await kerelmekIrasa(siker ? kerelemLezarasa(ny, fk.az, 'megjött: ' + osszegzes + ' (' + tars.cim + ':' + tars.port + ')', Date.now())
    : probalkozas(ny, fk.az));
  kiir((siker ? SZIN.jo + '  ✓ ' : SZIN.halvany + '  · ') + ora() + ' függő kérelem (' + fk.fajta + ' '
    + fk.kulcs.slice(0, 8) + '…) ' + tars.cim + ':' + tars.port + ' — ' + (siker ? 'megjött: ' + osszegzes : 'nem szolgálta ki')
    + SZIN.vege);
  return uj;
}

/**
 * ⭐⭐ D102 (J3): A FÜGGŐ KÉRELMEK SOROZATA egy társnál — a fejléc- és törzs-kérelmek, amelyek hozzá szólnak (rang
 * szerint, legfeljebb `SOROZAT_KORLAT`), EGY védett résen, egy kapcsolaton, egymás után. A 74. mérés pótlása: egy jól
 * ellátott tartónál (a kis, családi koinó) a kapcsolatonkénti egy kérelem mindent sorba állított.
 */
async function fuggoKerelemSorozatMunkaja(allapot, halo, tars, fks) {
  for (const fk of fks) allapot.kerelemProbaltak.set(fk.az + '|' + tars.cim + ':' + tars.port, Date.now());
  const kerelmek = fks.map((fk) => ({ fajta: fk.fajta, kulcs: fk.kulcs, n: fk.n, m: fk.m === true,
    ...(fk.utan ? { utan: fk.utan } : {}), az: fk.az, htl: UGRAS_MAX }));
  const vege = { uj: 0, kuldott: 0, korok: 1, bajt: 0, alairo: null, kerelem: 'sorozat:' + fks.length };
  let eredmenyek;
  try {
    eredmenyek = await kerelemSorozatUdpResen(halo, tars.cim, tars.port, KOINO, kerelmek, {
      ...await azonossagBeallitasa(),
      mintaValaszto: (valasz) => mintaKeres(valasz),
      megvan: (await kepetKeszit()).esemenyek.map((e) => e.azonosito).slice(-5000),
      blob: fajlBlobTarolo(KOINO), korlat: FAJL_KORLAT,
      kozosMunka: fajlMunkak, forras: tars.cim + ':' + tars.port });
  } catch (hiba) {
    kiir(SZIN.halvany + '  · ' + ora() + ' ' + tars.cim + ':' + tars.port + ' — a kérelem-sorozat (' + fks.length + ') nem ment át: '
      + hiba.message + SZIN.vege);
    let ny = await kerelmekOlvasasa();
    for (const fk of fks) ny = probalkozas(ny, fk.az);
    await kerelmekIrasa(ny);
    return vege;
  }
  for (let i = 0; i < fks.length; i++) {
    const r = eredmenyek[i];
    // A meg sem kérdezett (a sorozat egy tiltásnál megállt): próbálkozás, a következő tartónál újra.
    if (!r) { await kerelmekIrasa(probalkozas(await kerelmekOlvasasa(), fks[i].az)); continue; }
    vege.uj += await fuggoEredmenyFeldolgozasa(fks[i], r, tars);
  }
  const utolso = eredmenyek.at(-1);
  vege.bajt = (utolso?.bajtKuldott ?? 0) + (utolso?.bajtKapott ?? 0);
  return vege;
}

// ===================================
// ⭐⭐ D92/1 (c), D92/2–3: A TOVÁBBADÁS — a kötés-hálón, 2–3 ugrásig
// ===================================
//
// Aki egy továbbadható kérelmet nem tud kiszolgálni, ÁTVESZI (ha a Freenet-féle számláló enged, és nem kapta már meg —
// azonosító: nincs kétszeres továbbadás), a saját munkáiban továbbadja, és a választ annak viszi vissza, akitől kapta
// (`VALASZ`, lépésenként — D87). ⛔ K2: mindez CSAK A MEMÓRIÁBAN, időkorláttal és darabkorláttal; a válasz nem kerül a
// tárba, és senkinek más nem szolgáljuk ki. ⚠️ A továbbadott fejlécnél a szúrópróba nem megy (az interaktív — a
// kérdező a gyökerek után választ): ott a létrehozó események aláírása ellenőrizhető, az össz-pont bemondás marad.

const TOVABBITAS_KORLAT = 32;
const TOVABBITAS_ELEVULES = 15 * 60 * 1000;
const tovabbitasok = new Map();     // az → { fajta, kulcs, n, d, htl, honnan, lejar, kuldtuk: Set, valasz }

function tovabbitasokTakaritasa() {
  for (const [az, t] of tovabbitasok) if (t.lejar < Date.now()) tovabbitasok.delete(az);
}

/** A VÁLASZ tartalma egy kérelem-eredményből (a továbbító ezt viszi vissza). */
function valaszTartalma(fajta, r, blob) {
  if (fajta === 'szelet') return { esemenyek: r.esemenyek ?? [] };
  if (fajta === 'fejlecek') return { valasz: r.valasz ?? null, esemenyek: r.esemenyek ?? [] };
  return { fajlok: (blob?.mind() ?? []).map((f) => ({ lenyomat: f.lenyomat, adat: Buffer.from(f.bajtok).toString('base64') })) };
}

/**
 * ⭐ A VÁLASZ FOGADÁSA (a `parbeszed` hívja): ha a SAJÁT függő kérelmem válasza, feldolgozom (a kapun át, az átmeneti
 * tárba); ha egy általam továbbadotté, megőrzöm a visszaútra (csak a memóriában).
 */
async function valaszFogadasa(v, honnan) {
  const ny = await kerelmekOlvasasa();
  const sajat = ny.fuggo.find((x) => x.az === v.az);
  if (sajat) {
    let osszegzes = '';
    if (v.fajta === 'szelet') {
      let uj = 0;
      for (const e of v.esemenyek) { const m = await esemenyMentese(atmeneti, e); if (m.mentve && !m.marMegvolt) uj++; }
      osszegzes = v.esemenyek.length + ' esemény (' + uj + ' új)';
    } else if (v.fajta === 'fejlecek' && v.valasz) {
      const f = await fejlecValaszFeldolgozasa({ valasz: v.valasz, kert: {}, mintak: {}, esemenyek: v.esemenyek });
      osszegzes = f.jok + ' fejléc (bemondás — továbbadva nincs szúrópróba)';
    } else if (v.fajta === 'torzs') {
      const blob = fajlBlobTarolo(KOINO);
      let jo = 0;
      for (const f of v.fajlok) {
        const bajtok = new Uint8Array(Buffer.from(f.adat, 'base64'));
        // ⛔ A NÉV A BIZONYÍTÉK: a bájtok lenyomata az legyen, aminek mondják (különben nem kerül be).
        try { const r = await blob.ir(bajtok); if (r.lenyomat === f.lenyomat) jo++; } catch { /* túl nagy */ }
      }
      osszegzes = jo + ' fájl';
    }
    await kerelmekIrasa(kerelemLezarasa(ny, sajat.az, 'megjött továbbadva: ' + osszegzes + ' (' + honnan.cim + ':' + honnan.port + ')',
      Date.now()));
    kiir(SZIN.jo + '  ✓ ' + ora() + ' függő kérelem (' + sajat.fajta + ' ' + sajat.kulcs.slice(0, 8) + '…) — megjött TOVÁBBADVA: '
      + osszegzes + SZIN.vege);
    return true;
  }
  const t = tovabbitasok.get(v.az);
  if (t && !t.valasz && v.fajta === t.fajta && v.kulcs === t.kulcs) {
    t.valasz = { esemenyek: v.esemenyek, valasz: v.valasz, fajlok: v.fajlok };
    kiir(SZIN.halvany + '  ↩ ' + ora() + ' továbbadott kérelem válasza megjött — visszaviszem annak, akitől kaptam' + SZIN.vege);
    return true;
  }
  return false;
}

/** ⭐ A kérelem-kiszolgáló: a fejlécek (mintákkal) és a törzs — a `parbeszed` hívja. */
// ===================================
// ⭐⭐ D109 (KK2–KK6): A KISZOLGÁLÁSI KERET — folyamatonként egy
// ===================================
//
// ⭐ KK6, a kérő oldala: aki „később”-t mondott, azt a kör (és a függő kérelem) addig nem hívja — a raj más tartójához
// fordulunk. Helyi, a memóriában, korlátos.
const kesobbTarsak = new Map();     // 'cím:port' → meddig ne hívjuk
function kesobbFeljegyzese(tars, mp) {
  if (!tars?.cim) return;
  kesobbTarsak.delete(tars.cim + ':' + tars.port);
  kesobbTarsak.set(tars.cim + ':' + tars.port, Date.now() + Math.max(KESOBB_MIN, Number.isInteger(mp) ? mp : KESOBB_MIN) * 1000);
  while (kesobbTarsak.size > 256) kesobbTarsak.delete(kesobbTarsak.keys().next().value);
}
function kesobbHivando(cim, port) {
  const ig = kesobbTarsak.get(cim + ':' + port);
  if (!ig) return true;
  if (ig <= Date.now()) { kesobbTarsak.delete(cim + ':' + port); return true; }
  return false;
}
//
// A valódi védelem a kiszolgálónál van (D108): minden kérés előtt az ítélet (`keretItelete`), utána a könyvelés (a kiküldött
// bájt és egy kérés). A határ a beállításból: „alap” 20 MB + 600 kérés, „mindent” 100 MB + 3000 óránként (KK5); a próbák a
// környezetből szűkíthetik (`KOINO_KERET` = „bájt,kérés”). Az osztály (KK4): a KÖTÉSEM (a tábla-kulcsa a kötés-jegyzékemben
// — a saját cserém, nem kerül a keret alá), egy bizonyított TAG (zárt koinóban), különben IDEGEN.

let kiszolgalasiKeretPeldany = null;
const keretKiirva = new Map();      // társ → mikor írtuk ki utoljára, hogy „később” (a napló ne teljen meg)

async function kiszolgalasiKeretHatara() {
  const k = String(process.env.KOINO_KERET ?? '').split(',').map((x) => Number.parseInt(x, 10));
  if (k.length === 2 && k.every((x) => Number.isInteger(x) && x > 0)) return { bajt: k[0], keres: k[1] };
  const b = await kiszolgalasBeallitas();
  return b.keret ?? (b.mindent ? KERET_MINDENT : KERET_ALAP);
}

// ⭐ D109 (⑤): a keret ÁLLÁSA fájlban is (`<koino>/keret.json`) — a keret a kiszolgáló folyamat memóriájában él, a
// `kiszolgalas` parancs (és később a felderítés panelje) innen látja, mennyit vitt el az elmúlt óra. Minden feljegyzés után,
// de egyszerre egy írás: ha közben új jött, a futó írás után még egyszer (így a fájl a legutolsót mutatja, és az írások
// száma a kiszolgált kérésekével korlátos — a keret maga fogja meg).
const keretFajl = () => join(alapHely(), KOINO, 'keret.json');
let keretIrasFut = false;
let keretIrasKell = false;
async function keretAllasIrasa(keret) {
  keretIrasKell = true;
  if (keretIrasFut) return;
  keretIrasFut = true;
  try {
    while (keretIrasKell) {
      keretIrasKell = false;
      try {
        await mkdir(dirname(keretFajl()), { recursive: true });
        await writeFile(keretFajl(), JSON.stringify({ ...keretAllasa(keret), ido: Date.now(), pid: process.pid }), 'utf8');
      } catch { /* nem végzetes */ }
    }
  } finally {
    keretIrasFut = false;
  }
}

async function kiszolgalasiKeretem() {
  const hatar = await kiszolgalasiKeretHatara();
  if (!kiszolgalasiKeretPeldany) kiszolgalasiKeretPeldany = ujKeret(hatar);
  else keretHatara(kiszolgalasiKeretPeldany, hatar);
  return kiszolgalasiKeretPeldany;
}

/**
 * A társ osztálya a keretben: a KÖTÉSEM, egy bizonyított tag, vagy idegen. ⛔ A kötés a három LEGRENDSZERESEBB a jegyzékből
 * (`kotesek.js` `kotesek` — a találkozások száma szerint), nem a jegyzék bármely tagja (abban a legutóbbi öt találkozás
 * áll — egy idegen egyetlen csere után bekerülne), és csak ha a rendszeresség meg is van (`keretKotesE`: ≥ 3 találkozás,
 * az első ≥ egy keretnyi ideje). Így legfeljebb három társ cserél keret nélkül, és azok a rendszeresek (D108: a saját
 * cserém). A próbák a kor-feltételt a környezetből szűkíthetik (`KOINO_KERET_KOTES_KOR`, mp).
 */
async function keretOsztalya({ tabla = null, tag = false }) {
  if (tabla) {
    const k = Number.parseInt(process.env.KOINO_KERET_KOTES_KOR ?? '', 10);
    const minKor = Number.isInteger(k) && k >= 0 ? k * 1000 : KOTES_MIN_KOR;
    try {
      const kotes = kotesLista(await kotesTarolo().olvas()).find((x) => x.alairo === tabla);
      if (keretKotesE(kotes, { minKor })) return 'kotes';
    } catch { /* nincs jegyzék */ }
  }
  return tarsOsztalya({ tag });
}

/**
 * ⭐ KK3: a társ kulcsa EGY HELYEN (a kérelem és a csere ugyanazt a számlálót kapja): zárt koinóban a SZEMÉLY (a kérelemben
 * bizonyított, vagy a cserében a tábla-kulcsához megjegyzett — `azonossagok.json`, a zárt kapu tölti), egyébként a
 * TÁBLA-KULCS, végső esetben a cím. ⚠️ Nyílt koinóban a személyes aláírás nem tagság — ott a tábla-kulcs a kulcs (különben a
 * kérelem a személy, a csere a tábla-kulcs alatt számolna, és ugyanaz a társ két külön keretet kapna — mérve).
 */
async function keretTarsa(t) {
  const szuletes = await koinoSzuletese();
  const zart = !!szuletes && szuletes.adat?.zart !== false;
  let szemely = null;
  if (zart) {
    szemely = t.szemely ?? null;
    if (!szemely && typeof t.tabla === 'string') {
      const k = (await azonossagokOlvasasa())[t.tabla];
      if (k && typeof k.sz === 'string') szemely = k.sz;
    }
  }
  return tarsKulcsa({ szemely, tabla: t.tabla ?? null, cim: t.cim ?? null });
}

/** A vonalnak (`parbeszed` — `beallitas.kiszolgalasiKeret`): az ítélet és a könyvelés. A vonal a számokat nem ismeri. */
function kiszolgalasiKeretKapcsolo() {
  return {
    async itelet(t) {
      const keret = await kiszolgalasiKeretem();
      const tars = await keretTarsa(t);
      const osztaly = await keretOsztalya(t);
      const it = keretItelete(keret, { tars, osztaly });
      if (!it.szabad && Date.now() - (keretKiirva.get(tars) ?? 0) > 10 * 60 * 1000) {
        keretKiirva.set(tars, Date.now());
        while (keretKiirva.size > 256) keretKiirva.delete(keretKiirva.keys().next().value);
        kiir(SZIN.halvany + '  ⏸ ' + ora() + ' a kiszolgálási keret most nem enged (' + it.ok + ', ' + osztaly + ') — „később”, '
          + it.kesobb + ' mp' + SZIN.vege);
      }
      return { ...it, tars, osztaly };
    },
    async feljegyez(t) {
      const keret = await kiszolgalasiKeretem();
      keretFeljegyzes(keret, { tars: await keretTarsa(t), osztaly: await keretOsztalya(t), bajt: t.bajt ?? 0, keres: t.keres ?? 0 });
      await keretAllasIrasa(keret);
    }
  };
}

// ===================================
// ⭐⭐ D109 (KK1): A KISZOLGÁLÓ KÉPE — egy kérés ára ne nőjön a tárral
// ===================================
//
// A 76. mérés: minden fejléc-kérelem a TELJES állapotot újraszámolta (`kepetKeszit`), és a válasz maga is a teljes
// entitás-halmazon számolt össz-pontot és gyerek-jegyzéket — egy „mindent” tartónál 125 000 eseménynél ~1,1 s CPU
// kérésenként. ⭐ Itt egyszer számol: a kép (az állapot, a tartott-kérdés, a bemondások, és a fejléc-válasz képe —
// `fejlecKepe`) addig él, amíg a tár állása, az átmeneti tár változása, a vállalás és a bemondások nem változnak, és
// legfeljebb `KISZOLGALO_KEP_ELETTARTAM`-ig (a döntés lezárása idő kérdése — egy lejárt határidő a képet is elavítja).
// Így egy kérés ára a válasz hosszával arányos; a teljes újraszámolás változásonként egyszer történik, nem kérésenként.
// ⚠️ Csak a kiszolgálás használja (a kérelem fejléc- és törzs-útja); a többi hívó a mai `kepetKeszit`-et kéri.

const KISZOLGALO_KEP_ELETTARTAM = 60 * 1000;
let kiszolgaloKepEmlek = null;

/** A bemondások jele (darab, összeg, a legfrissebb idő) — ha egy bemondás változik, a kép is újra készül. */
function bemondasJele(m) {
  let osszeg = 0, ido = 0;
  for (const x of m.values()) { osszeg += x?.osszPont ?? 0; ido = Math.max(ido, x?.ido ?? 0); }
  return m.size + ':' + osszeg + ':' + ido;
}

/**
 * @returns {Promise<{allapot: Object, tartott: Function, bemondasok: Map, fejlec: Object}>}
 */
async function kiszolgaloKepe() {
  await tar.frissit?.();
  await atmeneti.frissit?.();
  const a = tar.allas?.() ?? { n: -1, g: -1 };
  const tartottak = await tartottSzeleteim();
  const bem = await bemondasok();
  const jel = a.n + ':' + a.g + '|' + (atmeneti.valtozas?.() ?? -1) + '|' + (tartottak ? tartottak.size : 'm') + '|'
    + bemondasJele(bem);
  const most = Date.now();
  if (kiszolgaloKepEmlek && kiszolgaloKepEmlek.jel === jel && most - kiszolgaloKepEmlek.ido < KISZOLGALO_KEP_ELETTARTAM) {
    return kiszolgaloKepEmlek;
  }
  const { allapot } = await kepetKeszit();
  // ⭐ A ház (D100): tartom-e az entitást (akkor a gyerekeit teljesen ismerem — az üres lista is válasz). A gyökeret csak
  // „mindent” módban tartom egészében. ⭐ D102: ugyanez dönti el, hol jár be mélyen a válasz (J1), és kinek mondom be a
  // gyerekszámát (J2).
  const tartott = (az) => (az === GYOKER_KULCS ? !tartottak : (tartottak ? tartottak.has(az) : allapot.entitasok.has(az)));
  const fejlec = fejlecKepe(allapot, osszPontokSzamitasa(allapot.entitasok, bem, (az) => tartott(az)));
  kiszolgaloKepEmlek = { jel, ido: most, allapot, tartott, bemondasok: bem, fejlec };
  return kiszolgaloKepEmlek;
}

function kerelemKiszolgaloja() {
  return {
    /** ⭐ D75/3 (a bekapcsolás): a szelet a két tárból — amit csak láttam (az átmenetiben), azt is kiszolgálom. */
    async szelet(kulcs) {
      return egyeztetettEsemenyek(ketTarNezet(tar, atmeneti), KOINO, kulcs);
    },
    /** ⭐ D95/2: a szelet döntési eseményei szerzőinek tagsági kísérői (a `hozd` és a kérelem kérőjének). */
    async kiserok(esemenyek) {
      return tagsagiKiserok(tar, KOINO, [...new Set(esemenyek.filter((e) => TAGSAG_KELL.has(e.tipus)).map((e) => e.szerzo))],
        { koinoSzuletes: await koinoSzuletese(), szerzoKorlat: 64, korlat: 1024 });
    },
    /**
     * ⭐⭐ D107 L4 (④c): A FELAJÁNLÁS — a tulajdonos bejegyzései a régióimba: előbb a szerzők tagsági kísérői (csak a lánc-típusú
     * események és a csomagok, ugyanazon a kapun), aztán a bejegyzések a kereső-tár kapuján (csak ami a régióimba esik); és az
     * OSZTÓDÁS (K7): ahol egy hely nálam lévő része meghaladja a célt, kimondom a mélyebb darabot.
     */
    /**
     * ⭐⭐ A kereső-réteg ⑤: A KÉRDÉS — a kért hely (a fiók, az osztódás, a darab) indexelt bejegyzései közül a teljes kérdésre
     * illők (a legfrissebbek elöl), a szerzőik tagsági kísérőivel, a hely méretével, és ha a cél fölött van, az osztódással.
     * ⚠️ A próbák a kísérőket visszatarthatják (`KOINO_KERESES_KISEROK=0` — a kérdező tagság-ellenőrzésének rontás-próbája).
     */
    async kereses(k) {
      await keresoTar.frissit();
      const hely = kerdesHelye(k.k, k.s, BigInt('0x' + k.darab));
      const talalatok = helyTalalatai(keresoTar.helyBejegyzesei(hely), { kerdes: k.kerdes, n: k.n, koino: KOINO });
      const meret = keresoTar.helyMerete(hely);
      const cel = Number(process.env.KOINO_KERESO_FIOK_CEL) > 0 ? Number(process.env.KOINO_KERESO_FIOK_CEL) : KERESO_FIOK_CEL;
      const t = osztodasMelysege(meret, cel);
      const kiserok = process.env.KOINO_KERESES_KISEROK === '0' ? [] : await bejegyzesekKiseroi(talalatok);
      // ⭐ D111 (K11): gondolatonként a tartó-tippek (a felajánló készülékek tábla-aláírója, cím nélkül) — a kérdező így
      // éri el a gondolat többi részét. A próbák visszatarthatják (`KOINO_KERESES_TIPPEK=0` — a bekötés rontás-próbája).
      const tippek = {};
      if (process.env.KOINO_KERESES_TIPPEK !== '0') {
        for (const b of talalatok) {
          if (tippek[b.g]) continue;
          const t2 = (await keresoTar.tippek(b.g)).slice(0, TIPP_VALASZ).map((x) => x.a);
          if (t2.length) tippek[b.g] = t2;
        }
      }
      return { talalatok, kiserok: kiserok.slice(0, 1024), meret, osztodott: t > 0 ? k.s + t : null, tippek };
    },
    async felajanlas(k, { tabla = null } = {}) {
      await keresoTar.frissit();
      const kr = await keresoRegioim();
      const kiseroBe = (k.kiserok ?? []).filter((e) => e && typeof e === 'object' && e.koino === KOINO
        && (e.tipus === TAGSAGI_CSOMAG || LANC_TIPUSOK.has(e.tipus)));
      if (kiseroBe.length) await beolvasztas(tar, kiseroBe, KOINO);
      let felvett = 0, fuggo = 0, megvolt = 0, elutasitott = 0;
      const helyek = new Map();
      const gondolatok = new Set();
      for (const nyers of (k.bejegyzesek ?? []).slice(0, FELAJANLAS_KORLAT)) {
        const b = bejegyzesAlakja(nyers);
        if (!b || !regiobaEsoBejegyzes(b, kr.regiok)) { elutasitott++; continue; }
        const r = await bejegyzesBefogadasa(keresoTar, b);
        if (r.uj) { felvett++; if (r.fuggo) fuggo++; } else if (r.azonosito) megvolt++; else { elutasitott++; continue; }
        gondolatok.add(b.g);
        const hely = bejegyzesHelye(b.k, b.g, b.s);
        helyek.set(b.k + '|' + b.s + '|' + hely, { k: b.k, s: b.s, hely });
      }
      // ⭐ D111 (K11): a felajánló készüléke (a kérelem ELLENŐRZÖTT tábla-kulcsa) tartó-tipp a gondolatai mellé.
      if (tabla) for (const g of gondolatok) await keresoTar.tippFeljegyzese(g, [tabla]);
      const cel = Number(process.env.KOINO_KERESO_FIOK_CEL) > 0 ? Number(process.env.KOINO_KERESO_FIOK_CEL) : KERESO_FIOK_CEL;
      const osztodott = [];
      for (const x of helyek.values()) {
        const t = osztodasMelysege(keresoTar.helyMerete(x.hely), cel);
        if (t > 0) osztodott.push({ k: x.k, s: x.s + t });
      }
      if (felvett) kiir(SZIN.halvany + '  🔍 ' + ora() + ' felajánlás: ' + felvett + ' új kereső-bejegyzés a régiómba'
        + (fuggo ? ' (' + fuggo + ' függő)' : '') + (osztodott.length ? ' · ' + osztodott.length + ' fiók osztódott' : '') + SZIN.vege);
      return { felvett, fuggo, megvolt, elutasitott, osztodott };
    },
    async fejlecek(k) {
      // ⭐ D109 (KK1): a kiszolgáló képe a gyorsítótárból (a tartott-kérdés és a fejléc-kép is) — egy kérés ára a lista hossza.
      const { allapot, tartott, bemondasok: bem, fejlec } = await kiszolgaloKepe();
      const tartja = tartott(k.kulcs);
      const { valasz, fak, letrehozoAz, listazott } = await fejlecekValasza({ allapot, kulcs: k.kulcs, n: k.n, m: k.m === true,
        utan: k.utan ?? null, tartott, karbantarto: kerelemKarbantarto, esemenyOlvas: esemenyKetTarbol, bemondasok: bem, kep: fejlec });
      return { valasz, tartja,
        mintak: (kert, megvan) => mintakValasza({ fak, kert, megvan, esemenyOlvas: esemenyKetTarbol, letrehozoAz, listazott }) };
    },
    /** ⭐ D92/1 (c): átveszem-e továbbadásra? (nem kaptam már meg, a számláló enged, van hely) */
    async atvesz(k, honnan) {
      tovabbitasokTakaritasa();
      if (tovabbitasok.has(k.az) || tovabbitasok.size >= TOVABBITAS_KORLAT) return false;
      if ((await kerelmekOlvasasa()).fuggo.some((x) => x.az === k.az)) return false;     // a saját kérelmem jött vissza
      const htl = tovabbiUgras(k.htl);
      if (htl <= 0) return false;
      tovabbitasok.set(k.az, { fajta: k.fajta, kulcs: k.kulcs, n: k.n, m: k.m === true, ...(k.utan ? { utan: k.utan } : {}), htl, honnan,
        lejar: Date.now() + TOVABBITAS_ELEVULES, kuldtuk: new Set([honnan.cim + ':' + honnan.port]), valasz: null });
      kiir(SZIN.halvany + '  ↪ ' + ora() + ' kérelmet vettem át továbbadásra (' + k.fajta + ' ' + k.kulcs.slice(0, 8) + '…)' + SZIN.vege);
      return true;
    },
    async torzs(k, { maradekBajt = Infinity } = {}) {
      const { allapot } = await kiszolgaloKepe();
      const v = await sajatVallalasa(allapot);
      if (!v.szeletek.has(k.kulcs)) return [];
      const blob = fajlBlobTarolo(KOINO);
      const ki = [];
      // ⭐ D109 (KK6): a fájlok a keret maradékáig (a base64 miatt a fájl ~4/3-a utazik) — a többire „később”.
      let osszeg = 0;
      let kimaradt = false;
      for (const l of await torzsLenyomatai(allapot.entitasok.get(k.kulcs), (x) => blob.olvas(x))) {
        if (!(await blob.van(l))) continue;
        if (Number.isFinite(maradekBajt)) {
          const bajtok = await blob.olvas(l);
          const ara = Math.ceil((bajtok?.length ?? 0) * 4 / 3) + 200;
          if (osszeg + ara > maradekBajt) { kimaradt = true; continue; }
          osszeg += ara;
        }
        ki.push(l);
      }
      return kimaradt ? { lenyomatok: ki, kesobb: KESOBB_MIN } : ki;
    }
  };
}

// ===================================
// ⭐⭐ D95/1, D95/3: A KÉT FOKÚ VÁLLALÁS — a nagy szelet összegezve, a saját eseményeim a csak küldő úton
// ===================================
//
// A vállalt szelet KICSI → egészében tartom (a csere halmazként egyezteti); NAGY (a küszöb fölött) → csak összegezve: a
// gyökér és a minták, a rá vonatkozó lezárási összegzések, és a saját eseményeim (`ketFok.js`, `osszegzoTartas.js`). A
// „mindent” beállítású készülék (D83/2 — helyi) mindent egészében tart: ő az önkéntes, aki a nagy szelet döntéseit összegzi.
// ⚠️ A küszöböt a próbák a környezetből kicsinyítik (`KOINO_KETFOK_KUSZOB`, `KOINO_KETFOK_VISSZA`).

const KETFOK = {
  kuszob: Number(process.env.KOINO_KETFOK_KUSZOB) > 0 ? Number(process.env.KOINO_KETFOK_KUSZOB) : KETFOK_KUSZOB,
  vissza: Number(process.env.KOINO_KETFOK_VISSZA) > 0 ? Number(process.env.KOINO_KETFOK_VISSZA) : KETFOK_VISSZA
};
/** A lezárási összegzések építői (a lezárás bemenete befagyott — egyszer épül; korlátos). */
const lezarasEpitoGyorsitotar = new Map();
const kiszolgalasFajl = () => join(alapHely(), KOINO, 'kiszolgalas.json');

/** ⭐ D83/2: a készülékenkénti kiszolgálási beállítás (helyi, nem esemény, nem terjed). */
async function kiszolgalasBeallitas() {
  try {
    const j = JSON.parse(await readFile(kiszolgalasFajl(), 'utf8'));
    // ⭐ D109 (⑤): a kiszolgálási keret saját határa (ha az e-ember megadta — különben az alap / „mindent” kiinduló száma).
    const keret = j?.keret && Number.isInteger(j.keret.bajt) && j.keret.bajt > 0 && Number.isInteger(j.keret.keres) && j.keret.keres > 0
      ? { bajt: j.keret.bajt, keres: j.keret.keres } : null;
    return { mindent: j?.mindent === true, keret };
  } catch {
    // ⚠️ Ha a készüléken nincs beállítás, a környezet adhat alapértéket (`KOINO_KISZOLGALAS` = mindent | alap) — a
    // parancssor-próbák így futnak a „mindent” (a mai, mindent egyeztető) módban; a szigorú esetek kifejezetten „alap”-pal.
    return { mindent: process.env.KOINO_KISZOLGALAS === 'mindent' };
  }
}

// ===================================
// ⭐⭐ A BEKAPCSOLÁS (D97, a bekapcsolás átvizsgálásának 7. pontja): A RÉSZVÉTEL A VÁLLALÁSBÓL
// ===================================
//
// A szigorú (b): a csere csak abban vesz részt, amit vállalok — a pozitív pontú szeleteimben (a javaslatok és a töredékek
// is), az azonosság-szeletemben; ⛔ a koinó születésének SZELETÉBEN csak az alapító (D96 — az esemény mindenkihez eljut a
// vonal születés-kulcsán); az összegzett nagy szeletben nem (a két fokú vállalás); és a töredék-részvétel (D85 T3): a
// töredék-szelet, amelyik érintettjét vállalom, és amelyik saját része valamikor igent mondott. A gyökér a darabjaival
// megy (D95/4). A „mindent” beállítás (D83/2) részvétele „minden” (null) — a mai mód. A tár eseményszáma szerint
// gyorsítótárazva (a töredék-részvételhez a javaslatok állapota kell).
let reszvetelEmlek = null;

/** @returns {Promise<Set<string>|null>} a részvételi halmazom (null = „minden”) */
async function reszvetelHalmazom(kf) {
  if ((await kiszolgalasBeallitas()).mindent) return null;
  const fokJel = [...kf.fokok].filter(([, f]) => f === 'osszegzo').map(([k]) => k).sort().join(',');
  const valtozat = (tar.mutatoAllapota?.()?.esemeny ?? 0) + '|' + kf.vallalas.szeletek.size + '|' + fokJel;
  if (reszvetelEmlek?.valtozat === valtozat) return reszvetelEmlek.p;
  const p = new Set();
  for (const k of kf.vallalas.szeletek) {
    if (kf.fokok.get(k) === 'osszegzo') continue;
    if (k === kf.vallalas.koinoSzuletes && !kf.vallalas.azonossag.includes(k)) continue;
    p.add(k);
  }
  // ⭐ A töredék-részvétel (D85 T3): a töredékek a javaslatok számított entitásai, a saját érintettjük gyerekei.
  const { allapot, javaslatok } = await kepetKeszit();
  for (const e of allapot.entitasok.values()) {
    if (!e.toredek?.csoport || !e.szulo || !p.has(e.szulo)) continue;
    const resz = javaslatok.get(e.toredek.csoport)?.reszek?.find((r) => r.entitas === e.szulo);
    if (resz?.valahaTeljesult) p.add(e.azonosito);
  }
  reszvetelEmlek = { valtozat, p };
  return p;
}

/** A vállalt szeletek foka (a változást a tárolóba írja), és a jegyzék (szelet → az ismert eseményszám). */
async function ketFokAllapota(allapot = null) {
  // ⚠️ A teljes állapot nélkül (a csere minden munkájában fut): a koinó születését a tagsági láncom adja.
  const szuletes = allapot?.koino?.azonosito ?? (await koinoSzuletese())?.azonosito ?? null;
  const vallalas = vallalasSzamitasa((await sajatLancEsemenyei(tar, szerzo)).filter((e) => e.koino === KOINO),
    { koinoSzuletes: szuletes, ...kifutasBeallitas() });
  const tarolo = osszegzesTarolo(KOINO);
  const t = await tarolo.olvas();
  const jegyzek = new Map((await tar.szeletek()).map((x) => [x.szelet, x.db + x.bejelentes]));
  const meretek = new Map();
  for (const k of vallalas.szeletek) {
    meretek.set(k, Math.max(jegyzek.get(k) ?? 0, t.szeletek[k]?.fok === 'osszegzo' ? (t.szeletek[k].darab ?? 0) : 0));
  }
  const fokok = szeletFokai({ szeletek: vallalas.szeletek, meretek,
    mindigTeljes: [...vallalas.azonossag, vallalas.koinoSzuletes].filter(Boolean),
    elozo: new Map(Object.entries(t.szeletek).map(([k, x]) => [k, x?.fok])),
    mindent: (await kiszolgalasBeallitas()).mindent, kuszob: KETFOK.kuszob, vissza: KETFOK.vissza });
  let valtozott = false;
  for (const [k, f] of fokok) {
    if ((t.szeletek[k]?.fok ?? 'teljes') !== f) { t.szeletek[k] = { ...(t.szeletek[k] ?? {}), fok: f }; valtozott = true; }
  }
  if (valtozott) await tarolo.ir(t);
  return { fokok, vallalas, jegyzek, tarolo };
}

// ===================================
// ⭐⭐ D75/1, D73 (a bekapcsolás): A VISSZAVETT VÁLLALÁS ÉS A TÁR TÖMÖRÍTÉSE
// ===================================
//
// A szigorú (b) alatt a tartós tár a vállalásomat tartja; ami kiesett belőle (a visszavont pontú szelet, az összegezve
// tartott nagy szelet idegen eseményei), az az ÁTMENETI tárba kerül — a tartós tár ritka újraírásával (mint a `git gc`;
// `fajlTar.js` `ujrairas`, csak az író). MARAD: a saját eseményeim (D86/2), a koinó születése, a részvételi halmazom
// szeleteinek eseményei és a hozzájuk bejelentettek, a vállalt szeletek születése, a gyökér-darabjaim születései, a
// tagsági láncok (a kísérők), és a lezárási összegzések a javaslataikkal. ⛔ Az összegzett szeletből csak akkor veszünk
// ki, ha az ellenőrzött gyökere megvan — különben a két fokú vállalás mérete leesne, a szelet teljesre váltana, és a csere
// mindent visszahozna. A „mindent” beállítás nem tömörít.

const TOMORITES_KOZ = 24 * 3600 * 1000;
const tomoritesFajl = () => join(alapHely(), KOINO, 'tomorites.json');

/** A megtartás szabálya (null: „mindent” — nincs tömörítés). */
async function tomoritesSzabalya() {
  const kf = await ketFokAllapota();
  const p = await reszvetelHalmazom(kf);
  if (!p) return null;
  const gy = await gyokerMelysegem();
  const darabok = [...gy.darabok].map(gyokerDarabBol).filter(Boolean);
  const szuletes = await koinoSzuletese();
  const t = await osszegzesTarolo(KOINO).olvas();
  const lezarasJavaslatok = new Set(Object.keys(t.lezarasok).map((k) => k.split('|')[0]));
  const osszegzettKesz = (k) => t.szeletek[k]?.fok === 'osszegzo' && !!t.szeletek[k]?.gyoker;
  return (e) => {
    if (e.koino !== KOINO || e.szerzo === szerzo) return true;
    if (szuletes && e.azonosito === szuletes.azonosito) return true;
    const s = szelet(e);
    if (p.has(s) || kf.vallalas.szeletek.has(e.azonosito)) return true;
    if (kf.vallalas.szeletek.has(s) && !osszegzettKesz(s)) return true;
    const helyek = bejelentesHelyei(e);
    if (helyek.some((k) => p.has(k))) return true;
    if (helyek.includes('')) {
      const h = gyokerLenyomata(e.azonosito);
      if (darabok.some((d) => darabbaEsik(h, d.melyseg, d.darab))) return true;
    }
    if (LANC_TIPUSOK.has(e.tipus) || e.tipus === TAGSAGI_CSOMAG) return true;
    if (e.tipus === LEZARASI_OSSZEGZES || lezarasJavaslatok.has(e.azonosito)) return true;
    return false;
  };
}

/**
 * A tömörítés: a tartós tárból kivett események az átmenetibe (D75/1). ⛔ Csak az író (ha nem az, és most senki nem az,
 * azzá válik; ha más az író — pl. a futó őrjárat —, ő végzi a saját körében).
 * @param {{proba?: boolean}} [b] - `proba`: csak számol, nem ír
 * @returns {Promise<{ok: string, megtartva?: number, kivett?: number}>}
 */
async function tomoritesFuttatasa({ proba = false } = {}) {
  const megtart = await tomoritesSzabalya();
  if (!megtart) return { ok: '„mindent” beállítás — nincs tömörítés' };
  if (proba) {
    const mind = await koinoEsemenyei(tar, KOINO);
    const kivett = mind.filter((e) => !megtart(e)).length;
    return { ok: 'próba', megtartva: mind.length - kivett, kivett };
  }
  if (!tar.iroE?.() && !(await tar.iroLeszek?.())) return { ok: 'egy másik folyamat az író — a tömörítést az ő köre végzi' };
  const r = await tar.tomorites(megtart);
  let atkerult = 0;
  for (const e of r.kivett) {
    try { await esemenyMentese(atmeneti, e); atkerult++; } catch { /* az átmeneti tár eldobható */ }
  }
  try { await writeFile(tomoritesFajl(), JSON.stringify({ utolso: Date.now(), kivett: r.kivett.length }), 'utf8'); } catch { /* nem végzetes */ }
  return { ok: 'kész', megtartva: r.megtartva, kivett: r.kivett.length, atkerult };
}

/** Az őrjárat: naponta egyszer (a „mindent” módban soha). */
async function tomoritesEsedekesE() {
  try { return Date.now() - (JSON.parse(await readFile(tomoritesFajl(), 'utf8'))?.utolso ?? 0) >= TOMORITES_KOZ; }
  catch { return true; }
}

/**
 * Az ellenőrzött lezárási összegzések a döntés-számításnak ('javaslat|entitás' → { osszegzes, allas }) — ⚠️ csak a MOST
 * összegezve tartott szeletekéi: ahol a szeletet (újra) egészében tartom, a teljes bemenet dönt.
 */
async function ellenorzottOsszegzesek() {
  const t = await osszegzesTarolo(KOINO).olvas();
  return new Map(Object.entries(t.lezarasok)
    .filter(([k, x]) => x?.osszegzes && x?.allas && t.szeletek[k.split('|')[1]]?.fok === 'osszegzo')
    .map(([k, x]) => [k, { osszegzes: x.osszegzes, allas: x.allas }]));
}

/** ⭐ A csere beállításai a két fokú vállaláshoz és a csak küldő részvételhez (a `parbeszed` hívja őket). */
async function ketFokBeallitasai(allapot = null) {
  const kf = await ketFokAllapota(allapot);
  const osszegzok = async () => [...kf.fokok].filter(([, f]) => f === 'osszegzo').map(([k]) => k);
  const kerdo = osszegzoKerdo({ tarolo: kf.tarolo, szeletek: osszegzok,
    // A minták szerzőinek tagsága a táramból (D95/2): ha nem derül ki, „nem ellenőrizhető” (nem hiba — D19), és a szerző a
    // függők közé kerül — ugyanennek a cserének a tagsági köre kéri a csomagját.
    tagE: (sz) => tagsagKerdes.tagE(sz),
    esemenyMentes: (e) => esemenyMentese(tar, e) });
  let kepEmlek = null;
  const tarto = teljesTarto({
    teljesE: async (k) => kf.fokok.get(k) !== 'osszegzo' && (kf.jegyzek.get(k) ?? 0) > 0,
    // A kép a munkán belül egyszer készül (a minták ugyanarra a gyökérre jönnek, amit bemondtunk).
    kep: async () => {
      if (!kepEmlek) {
        const { allapot: a } = await kepetKeszit();
        kepEmlek = { allapot: a, szamitok: a.szamitok, bemondasok: await bemondasok() };
      }
      return kepEmlek;
    },
    karbantarto: kerelemKarbantarto,
    esemenyOlvas: (az) => esemenyLekerese(tar, az),
    lezarasiEsemenyek: async (k) => (await tar.bejelentesek(k)).filter((e) => e.tipus === LEZARASI_OSSZEGZES),
    epitoGyorsitotar: lezarasEpitoGyorsitotar
  });
  if (lezarasEpitoGyorsitotar.size > 256) lezarasEpitoGyorsitotar.clear();
  // ⭐ D95/3: a csak küldő út minden olyan szeletre, amit nem egyeztetek halmazként (nem vállalom, vagy csak összegezve
  // tartom) — a még nem kézbesített, friss saját eseményeimmel.
  // ⭐ D95/4: a gyökér-darabjaim is egészében tartott „szeletek” (a csak küldő út ott nem kell, és ott fogadok).
  const gy = await gyokerMelysegem();
  // ⭐ A bekapcsolás: a részvételi halmazom (null = „minden” — akkor a vállalt, nem összegzett szelet).
  const reszvetel = await reszvetelHalmazom(kf);
  const egeszbenTartom = async (k) => (gyokerDarabBol(k) ? gy.darabok.has(k)
    : reszvetel ? reszvetel.has(k) : kf.vallalas.szeletek.has(k) && kf.fokok.get(k) !== 'osszegzo');
  const kuldo = sajatKuldo({ tar, koino: KOINO, szerzo, halmazkent: egeszbenTartom, kulcsai: kuldoKulcsai(gy),
    kezbesitett: async () => new Set(Object.keys((await kezbesitesTarolo(KOINO).olvas()).kezbesitve)) });
  const fogado = kuldoFogado({ tar, fogadhato: egeszbenTartom });
  return {
    // ⭐⭐ A BEKAPCSOLÁS: csak a részvételi halmazomban (a „mindent” beállítással mindenben, az összegzett kivételével).
    reszvesz: (k) => (reszvetel ? reszvetel.has(k) : kf.fokok.get(k) !== 'osszegzo'),
    // ⭐ D95/4: a gyökér darabonként (a vonal a mélységből és a tábla-aláíróból számolja a darabjaimat).
    gyokerMelyseg: gy.melyseg,
    // ⭐⭐ D97/1: a közös halmaz — a társak halmazát a tábla-aláírójuk alatt jegyezzük meg (`halmazok.json`); a nyitó
    // lenyomat a két részvételi halmaz metszetén fut.
    reszvetelHalmaz: async () => reszvetel,
    halmazTar: halmazTarolo(KOINO, alapHely(), naploFrissitese),
    // ⭐⭐ D98/1 (F): a társankénti emlékezet — a csere végén a tárom állása a társ alatt (`emlekezet.json`); a következő
    // cserén csak a változott közös szeletekről szólunk (az első szint helyett — 70. mérés).
    emlekezetTar: emlekezetTarolo(KOINO, alapHely()),
    // ⭐⭐ D98/2–4: A LÁNC-KÖR — a szerzők lánca a cserében (`lancEllenorzes.js`): a saját kulcsom (a társ ebből tudja, kit
    // kérdezzen), a kérdéseim (a társ ismert szerzői kulcsa és a most kapott események szerzői), a válaszom (a saját — és
    // „mindent” módban a nálam épen meglévő — láncokról), és a válaszok feldolgozása (a bizonyíték bejelentése).
    sajatSzerzo: szerzo,
    lancKerdesek: (ujak, tarsAlairo) => lancKerdeseim(ujak, tarsAlairo),
    lancValasz: (kerdesek) => lancKiszolgaloja().valasz(kerdesek),
    lancFogadas: (kerdesek, valaszok) => lancValaszokFogadasa(kerdesek, valaszok),
    lancTars: (alairo, sz) => lancTarsFeljegyzese(lancEllenorzesTarolo(KOINO), alairo, sz),
    // ⭐ D96: a koinó születése mint ESEMÉNY — mindenkihez eljut (a szelete csak az alapítóé).
    koinoSzuletes: await koinoSzuletese(),
    osszegzoSzeletek: kerdo.lista, osszegzesMintaKerdesek: kerdo.mintaKerdesek, osszegzesFogadas: kerdo.fogadas,
    osszegzesValasz: tarto.valasz, osszegzesMintak: tarto.mintak,
    kuldoSzeletek: (szabad) => kuldo.lista(szabad), kuldoKerem: fogado.kerem
  };
}

/**
 * ⭐ D95/3: a csak küldő úton kézbesített saját eseményeim feljegyzése (többé nem ajánlom fel őket). A régi bejegyzések
 * kiesnek — a felajánlás amúgy is csak a `KULDES_ELETTARTAM`-nál frissebb eseményekre megy.
 * @param {Array<string>} azonositok
 */
async function kezbesitesFeljegyzese(azonositok) {
  if (!Array.isArray(azonositok) || !azonositok.length) return;
  const tarolo = kezbesitesTarolo(KOINO);
  const t = await tarolo.olvas();
  const most = Date.now();
  for (const az of azonositok) if (typeof az === 'string') t.kezbesitve[az] = most;
  for (const [az, mikor] of Object.entries(t.kezbesitve)) if (!(most - mikor < KULDES_ELETTARTAM)) delete t.kezbesitve[az];
  await tarolo.ir(t);
}

/**
 * ⭐ D95/1: a NAGY szelet teljes tartója (az önkéntes) kiadja a lezárt döntések összegzését — érintettenként egyszer.
 * @returns {Promise<number>} hányat adott ki
 */
async function lezarasiOsszegzesekKiadasa() {
  // ⭐ Olcsó előszűrő: ha egyetlen nagy szeletet sem tartok egészében (a „mindent” nélkül ez a rendes eset), nincs mit adni.
  const elo = await ketFokAllapota();
  if (![...elo.fokok].some(([k, f]) => f === 'teljes' && (elo.jegyzek.get(k) ?? 0) > KETFOK.kuszob)) return 0;
  const { allapot, javaslatok } = await kepetKeszit();
  const kf = await ketFokAllapota(allapot);
  const kiadott = new Set((await sajatLancEsemenyei(tar, szerzo))
    .filter((e) => e.koino === KOINO && e.tipus === LEZARASI_OSSZEGZES)
    .map((e) => e.adat?.javaslat + '|' + e.adat?.entitas));
  let db = 0;
  for (const [az, j] of javaslatok) {
    if (j.statusz !== 'elfogadva' && j.statusz !== 'elvetve') continue;
    for (const k of new Set((j.reszek ?? []).map((r) => r.entitas))) {
      if (kf.fokok.get(k) === 'osszegzo' || (kf.jegyzek.get(k) ?? 0) <= KETFOK.kuszob || kiadott.has(az + '|' + k)) continue;
      const je = await esemenyLekerese(tar, az);
      const ep = je ? await lezarasiOsszegzesEpitese(allapot.szamitok, je, k) : null;
      if (!ep) continue;
      await lezarasiOsszegzesKiadasa(kornyezet, ep.osszegzes);
      kiadott.add(az + '|' + k);
      db++;
    }
  }
  return db;
}

// ===================================
// ⭐⭐ D93/3: A ZÁRT KOINÓ KAPUJA — a személy a kézfogásban
// ===================================
//
// A zárt koinó tartalmát a készülék csak (ellenőrzött) tagnak adja ki. A tag a kézfogásban bizonyítja magát: a
// SZEMÉLYES kulcsával aláírja a kézfogás átiratát (a koinóval együtt) és megnevezi a horgonyát; ha nálunk nem
// ellenőrizhető, a tagsági csomagját is küldi (D93/2 — a lánca az alapítóig, önmagában ellenőrizhető). Aki nem tag (vagy
// nem ellenőrizhető), annak csak a koinó születése, a SAJÁT azonosság-szelete és a MIÉNK jár — a belépéshez ennyi kell (a
// meghívása az ő szeletébe kerül; a mi láncunkat a bizonyításhoz úgyis odaadjuk). Nyílt koinóban nincs kapu.
// ⭐ A tábla-kulcs és a személy kötését megjegyezzük: akit egyszer így láttunk, a következő cserén nem kell újra
// bizonyítania — a hétköznapi csere nem drágul (6. szabály). ⚠️ Helyi feljegyzés, nem terjed, és korlátos.

/** A személyes kulcs titkos fele (JWK) — a kézfogás aláírásához, szinkron (`node:crypto`). */
const szemelyesJwk = (await kulcsparLeirasa(kulcspar)).privatKulcs;
const AZONOSSAG_KORLAT = 256;
const azonossagFajl = () => join(alapHely(), KOINO, 'azonossagok.json');
/** Akit a folyamat életében tagnak láttunk (szerző → igaz) — a tagság nem vész el. */
const tagEmlek = new Map();
let koinoSzuletesEmlek = null;

async function azonossagokOlvasasa() {
  try {
    const j = JSON.parse(await readFile(azonossagFajl(), 'utf8'));
    return j && typeof j === 'object' && !Array.isArray(j) ? j : {};
  } catch {
    return {};
  }
}

/** A tábla-kulcs (aláírója) ↔ személy kötés megjegyzése — a legutóbb látott `AZONOSSAG_KORLAT` darab marad. */
async function azonossagKotese(alairo, sz, h) {
  const j = await azonossagokOlvasasa();
  if (j[alairo]?.sz === sz && j[alairo]?.h === h) return;
  j[alairo] = { sz, h, ido: Date.now() };
  const lista = Object.entries(j).sort((a, b) => (b[1]?.ido ?? 0) - (a[1]?.ido ?? 0)).slice(0, AZONOSSAG_KORLAT);
  try { await writeFile(azonossagFajl(), JSON.stringify(Object.fromEntries(lista)), 'utf8'); } catch { /* nem végzetes */ }
}

/**
 * A koinó születése (`KoinoLetrehozas`) — a kapu ebből tudja, zárt-e, és ez a megengedett szeletek egyike. A saját
 * tagsági láncom végén van (a terhe a láncom hossza, nem a koinó mérete); ha még nem vagyok tag, a táramban keresem
 * (a nem tag készülék tára kicsi: a zárt koinó csak a születést és az azonosság-szeleteket adja neki).
 */
async function koinoSzuletese() {
  if (koinoSzuletesEmlek?.esemeny) return koinoSzuletesEmlek.esemeny;
  // ⚠️ A „nincs” is emlék (10 percig): a táras keresés drága, és a születés ritkán érkezik. ⛔ DE CSAK AMÍG A TÁR NEM
  // VÁLTOZOTT (2026-10-09, a 72. mérés terepen): a hosszan futó őrjárat különben a cserében megkapott születést 10 percig
  // nem vette figyelembe — a társ minden körben újraküldte (~6 KB körönként).
  const most = tar.allas?.()?.n ?? null;
  if (koinoSzuletesEmlek && Date.now() - koinoSzuletesEmlek.ido < 600_000 && koinoSzuletesEmlek.n === most) return null;
  let k = null;
  const h = await sajatHorgonyom();
  if (h) {
    const lanc = await tagsagiEsemenyekGyujtese(tar, KOINO, h);
    k = lanc.find((e) => e.tipus === 'KoinoLetrehozas')
      ?? lanc.flatMap((e) => (e.tipus === TAGSAGI_CSOMAG && Array.isArray(e.adat?.lanc) ? e.adat.lanc : []))
        .find((e) => e?.tipus === 'KoinoLetrehozas' && e.koino === KOINO)
      ?? null;
  }
  if (!k) k = (await koinoEsemenyei(tar, KOINO)).find((e) => e.tipus === 'KoinoLetrehozas') ?? null;
  koinoSzuletesEmlek = { esemeny: k, ido: Date.now(), n: tar.allas?.()?.n ?? null };
  return k;
}

/**
 * ⭐⭐ A KAPU ÍTÉLETE (a vonal hívja: a nyitás után a tábla-kulccsal, a bizonyítás után a személlyel és a csomaggal).
 * ⭐ D109 (KK5): a `tag` jel CSAK akkor igaz, ha a társ tagságát ellenőriztük — a kiszolgálási keret ebből tesz különbséget
 * az ismert tag és az idegen között. ⛔ A `szabad` nem tagság: nyílt koinóban mindenki szabad (mérve — a keret így mindenkit
 * tagnak vett, és az idegenek felének a korlátja soha nem fogott).
 * @returns {Promise<{szabad: boolean, tag?: boolean, kell?: boolean, szeletek?: Array<string>, ok: string}>}
 */
async function tarsKapuja({ tabla = null, ki = null, csomag = null } = {}) {
  const szuletes = await koinoSzuletese();
  // ⭐ Nyílt koinóban nincs kapu. ⚠️ És ha a koinó születését nem ismerjük, nincs mit betartatnunk: egy tag mindig ismeri
  // (a tagsági lánca végén van), tehát ilyenkor a készülék vagy még nem tag (a saját belépésén kívül nincs mit adnia),
  // vagy egy születés nélküli, régi koinót tart — azt nem zárhatjuk be utólag úgy, hogy senki ne kaphasson belőle.
  if (!szuletes) return { szabad: true, ok: 'a koinó születése ismeretlen' };
  if (szuletes.adat?.zart === false) {
    // ⭐ D109 (KK5): nyílt koinóban is ismert tag, akit a kérelemben bizonyított személye és a nálam lévő lánca igazol
    // (csomagot itt nem kérünk — a kapu nem zár; a cserében személy nincs, ott a tábla-kulcs számít).
    // ⛔ A tag-kérdés hibája itt nem zárhat be egy nyílt koinót — csak a „tag” jel marad el.
    const tag = ki ? await tagsagItelete(ki).then((r) => r.igen, () => false) : false;
    return { szabad: true, ok: 'nyílt koinó', tag };
  }
  // A társ személye: a most bizonyított, vagy a tábla-kulcsához kötött.
  let szemely = ki;
  if (!szemely && typeof tabla?.alairo === 'string') {
    const k = (await azonossagokOlvasasa())[tabla.alairo];
    if (k && typeof k.sz === 'string') szemely = { sz: k.sz, h: typeof k.h === 'string' ? k.h : null };
  }
  const sajatH = await sajatHorgonyom();
  const szeletek = [...new Set([szuletes?.azonosito, szemely?.h, sajatH].filter((x) => typeof x === 'string'))];
  if (!szemely) return { szabad: false, kell: true, szeletek, ok: 'ismeretlen társ' };
  if (ki && typeof tabla?.alairo === 'string') await azonossagKotese(tabla.alairo, ki.sz, ki.h ?? null);
  const r = await tagsagItelete(szemely, csomag);
  if (r.igen) return { szabad: true, tag: true, ok: r.ok };
  // ⭐ Ha csomagot még nem láttunk tőle, kérjük (a következő kör, vagy a kérelemben a `KELL`).
  return { szabad: false, kell: !csomag, szeletek, ok: r.ok };
}

/**
 * Tag-e a társ (a személye, a horgonyával)? A láncát a táramból gyűjtöm (a horgonyától), és ha hozott csomagot, azzal együtt.
 * ⛔ A koinó születése (a MIÉNK) az első: egy hamis koinó-létrehozás a csomagban így nem ad tagságot; és a szerző horgonyai
 * közül csak az számít, amit ő maga írt alá (`szerzoTagsaga`) — más horgonyát megnevezni nem elég. Az igazolt tagot
 * megjegyzi (`tagEmlek`).
 * @returns {Promise<{igen: boolean, ok: string}>}
 */
async function tagsagItelete(szemely, csomag = null) {
  if (!szemely || typeof szemely.sz !== 'string') return { igen: false, ok: 'nincs személy' };
  if (tagEmlek.has(szemely.sz)) return { igen: true, ok: 'tag' };
  const szuletes = await koinoSzuletese();
  const lista = szuletes ? [szuletes] : [];
  if (typeof szemely.h === 'string') lista.push(...await tagsagiEsemenyekGyujtese(tar, KOINO, szemely.h));
  if (csomag && csomag.tipus === TAGSAGI_CSOMAG && csomag.szerzo === szemely.sz && csomag.koino === KOINO
    && (await esemenyEllenorzese(csomag)).rendben && (await tagsagiCsomagEllenorzese(csomag)).rendben) {
    lista.push(csomag);
  }
  const r = szerzoTagsaga(tagsagiIndex(lista, KOINO), szemely.sz);
  if (r.igen) tagEmlek.set(szemely.sz, true);
  return { igen: !!r.igen, ok: r.ok };
}

/** A tagsági csomagom a bizonyításhoz — ha tag vagyok és még nincs (vagy rövidebb láncot kaptam), most adom ki. */
async function sajatTagsagiCsomagja() {
  const h = await sajatHorgonyom();
  if (!h) return null;
  const r = await tagsagiCsomagKiadasa(kornyezet).catch(() => null);
  if (r?.esemeny) return r.esemeny;
  const sajat = (await entitasEsemenyei(tar, KOINO, h))
    .filter((e) => e.tipus === TAGSAGI_CSOMAG && e.szerzo === szerzo)
    .sort((a, b) => b.sorszam - a.sorszam);
  return sajat[0] ?? null;
}

/**
 * ⭐ A SZEMÉLYEM A MUNKÁHOZ: a személyes aláíró (a rés-réteg hívja a kézfogás átiratával), a tagsági csomagom és a kapu.
 * Minden munka (csere, szelet, kérelem) ezt viszi.
 */
async function azonossagBeallitasa() {
  const h = await sajatHorgonyom();
  // ⭐ D109 (KK3): a tábla-kulcs is — a kérelemben a kiszolgáló ebből tudja, hogy a kötése vagyok-e (a kiszolgálási kerethez).
  const tabla = await tablaKulcsBiztositasa();
  return {
    tablaKulcs: nyilvanosResz(tabla),
    tablaAlairo: (atirat) => kezfogasAlairasa(tabla, atirat),
    szemelyesAlairo: (atirat) => ({ sz: szerzo, ...(h ? { h } : {}),
      a: szemelyesKezfogasAlairasa(szemelyesJwk, KOINO, atirat) }),
    tagsagiCsomag: sajatTagsagiCsomagja,
    zartKapu: tarsKapuja
  };
}

/**
 * ⭐⭐ D95/2: A TAGSÁGI KÍSÉRŐK — akinek a tagságát a vállalt szeleteimben nem tudom, annak a csomagját a cserében kérem
 * (`tagsagKisero.js`); a kapott csomag ugyanazon a kapun megy be. A jegyzék (`tagsagfuggo.json`) helyi, korlátos, lejár.
 * ⭐ Az `ismert` a kapu tag-emléke: amit az egyik bizonyított, azt a másik is tudja.
 */
const tagsagKerdes = tagsagKerdo({ tar, koino: KOINO, tarolo: tagsagFuggoTarolo(KOINO), koinoSzuletes: koinoSzuletese,
  mentes: (lista) => beolvasztas(tar, lista, KOINO), ismert: tagEmlek, sajatSzerzo: szerzo });

/** A csere beállításai a tagsági kísérőkhöz (a `parbeszed` hívja őket). */
function tagsagBeallitasai() {
  return {
    tagsagFuggo: () => tagsagKerdes.fuggoDarab(),
    tagsagKerdesek: (ujak) => tagsagKerdes.kerdesek(ujak),
    tagsagValasz: async (szerzok) => tagsagiKiserok(tar, KOINO, szerzok, { koinoSzuletes: await koinoSzuletese() }),
    tagsagFogadas: (esemenyek, kert) => tagsagKerdes.fogadas(esemenyek, kert)
  };
}

// ===================================
// ⭐⭐ D99 (a D71 (iii) — Csaba: „legyen az (A)”, 2026-10-10): TÁRSANKÉNT EGY CSERE A FÉL KÖRÖN BELÜL, HA NINCS ÚJDONSÁGOM
// ===================================
//
// Terepen (72. mérés) egy társpár között percenként KÉT csere ment (mindkét gép a saját körében hívta a másikat — ~6,5 MB/nap
// „nincs újdonságra”), és ha a két kör egy másodpercre járt egymástól, a második csere az első végébe csúszott, és 10 mp-re
// elakadt. ⭐ A szabály: ha egy társsal a legutóbbi fél körön belül már lement egy sikeres csere (bárki kezdte), és azóta
// NÁLAM nem változott semmi (a társankénti emlékezet feljegyzése óta a táramba nem került esemény — D98/1), a saját körömben
// nem hívom. Akinek van mondanivalója, az hív (a 47. mérés: így a hír nem lassul). ⚠️ Csak a tábla-aláíróval ismert társra
// (kötés, raj); a névtelen cím (friss, induló) a régi módon.

/** Tábla-aláíró → a legutóbbi sikeres csere vége (a folyamat memóriájában; újraindításkor üres — akkor a régi mód). */
const utolsoCsereTarssal = new Map();

/** Kihagyható-e a társ ebben a körben (D99)? */
async function csereKihagyhato(alairo, felKor) {
  if (typeof alairo !== 'string') return false;
  const ido = utolsoCsereTarssal.get(alairo);
  if (!ido || Date.now() - ido > felKor) return false;
  try {
    const f = await emlekezetTarolo(KOINO, alapHely()).olvas(alairo);
    const a = tar.allas?.();
    if (!f || !a || f.g !== a.g || !Number.isSafeInteger(f.n) || f.n > a.n) return false;
    // ⭐ Egyetlen új esemény is „van mondanivalóm” (a korlát 0: a tár vége óta egy sem).
    return !!tar.valtozottSzeletek?.(f.n, 0);
  } catch {
    return false;
  }
}

function resMunkaKeszito(allapot) {
  return async (nyersHalo, tars) => {
    // ⭐⭐ D89/1: EGY KÉZFOGÁS A MUNKA ELEJÉN — a csere és a randevú ugyanazon a VÉDETT résen megy (a
    // kézfogás munkánként egy; az egyszeri kulcs a munka végén elvész).
    const halo = await kezfogasUdpResen(nyersHalo, tars.cim, tars.port);
    try {
      return await resMunka(allapot, halo, tars);
    } finally {
      halo.zar();
    }
  };
}

/** A munka a VÉDETT résen (`resMunkaKeszito`): csere, kötés, tanulás, randevú. */
function resMunka(allapot, halo, tars) {
  return (async () => {
    // ⛔⛔ ÉS A TÁR IS FRISS (2026-09-26, 43. mérés): amit a futás közben MÁSIK folyamat írt
    // (a második ablak `gondolat` parancsa, a felület), azt is adjuk tovább. Enélkül a futó
    // őrjárat négy körön át „küldtem 0"-t mondott egy percekkel korábban írt gondolatra.
    await tar.frissit?.();
    // ⭐⭐ D92/1 (c): VÁLASZT VISZEK VISSZA ennek a társnak? (aki tőlem kérte — lehet a kérdező vagy egy továbbító)
    tovabbitasokTakaritasa();
    for (const [az, t] of tovabbitasok) {
      if (!t.valasz || t.honnan.cim !== tars.cim || Number(t.honnan.port) !== Number(tars.port)) continue;
      try {
        await valaszUdpResen(halo, tars.cim, tars.port, KOINO, { az, fajta: t.fajta, kulcs: t.kulcs, ...t.valasz });
        tovabbitasok.delete(az);
        kiir(SZIN.halvany + '  ↩ ' + ora() + ' ' + tars.cim + ':' + tars.port + ' — a továbbadott kérelem válaszát visszavittem'
          + SZIN.vege);
      } catch (hiba) {
        kiir(SZIN.halvany + '  · ' + ora() + ' a válasz visszavitele nem sikerült: ' + hiba.message + SZIN.vege);
      }
      return { uj: 0, kuldott: 0, korok: 1, bajt: 0, alairo: null, valaszVisszavive: az };
    }
    // ⭐⭐ D92/1 (c): TOVÁBBADOK egy átvett kérelmet ennek a társnak? (akitől jött, annak nem; akinek már adtam, annak sem)
    for (const [az, t] of tovabbitasok) {
      const kulcs = tars.cim + ':' + tars.port;
      if (t.valasz || t.kuldtuk.has(kulcs)) continue;
      t.kuldtuk.add(kulcs);
      const tovabb = { az, htl: t.htl };
      const memoria = t.fajta === 'torzs' ? memoriaBlobTarolo() : null;
      try {
        const r = t.fajta === 'szelet'
          ? await szeletUdpResen(halo, tars.cim, tars.port, null, KOINO, t.kulcs, { tovabb, ...await azonossagBeallitasa() })
          : await kerelemUdpResen(halo, tars.cim, tars.port, KOINO, { fajta: t.fajta, kulcs: t.kulcs, n: t.n, m: t.m === true,
            ...(t.utan ? { utan: t.utan } : {}), ...tovabb },
            { ...await azonossagBeallitasa(), mintaValaszto: (valasz) => mintaKeres(valasz), blob: memoria, korlat: FAJL_KORLAT });
        const kiszolgalta = t.fajta === 'szelet' ? (r.kapott ?? 0) > 0
          : r.kiszolgalta && (t.fajta !== 'torzs' || (memoria?.mind().length ?? 0) > 0)
            && (t.fajta !== 'fejlecek' || (r.valasz?.lista?.length ?? 0) > 0);
        if (kiszolgalta) {
          t.valasz = valaszTartalma(t.fajta, r, memoria);
          kiir(SZIN.halvany + '  ↪ ' + ora() + ' ' + kulcs + ' kiszolgálta a továbbadott kérelmet — visszaviszem' + SZIN.vege);
        } else if (r.atvette) {
          kiir(SZIN.halvany + '  ↪ ' + ora() + ' ' + kulcs + ' tovább adja a kérelmet' + SZIN.vege);
        }
      } catch (hiba) {
        kiir(SZIN.halvany + '  · ' + ora() + ' a továbbadás nem sikerült: ' + hiba.message + SZIN.vege);
      }
      return { uj: 0, kuldott: 0, korok: 1, bajt: 0, alairo: null, tovabbadva: az };
    }
    // ⭐⭐ D92/1: FÜGGŐ KÉRELEM ehhez a társhoz? — a célja ez a cím, vagy egy ismeretlen bekopogó, miközben
    // kopogtatunk (a tartó a kopogtató témáján látta, hogy kérünk tőle). Akkor a csere helyett a kérelem fut.
    {
      // ⚠️ (2026-10-19, a ⑦b próba megnevezett bukása): a „már próbáltuk” jel IDŐRE szól, nem a futás végéig — egy
      // átmenetileg néma tartó (épp indul, terhelt: „a másik fél nem válaszol”) különben a kérelem lejáratáig (két óra) nem
      // kapna újra esélyt ettől a futó őrjárattól. Ugyanazt a társat ugyanazzal a kérelemmel legfeljebb kétpercenként.
      allapot.kerelemProbaltak ??= new Map();
      const ny = await kerelmekOlvasasa();
      const nemProbalt = (x) => ujraProbalhato(allapot.kerelemProbaltak, x.az + '|' + tars.cim + ':' + tars.port, Date.now(),
        KERELEM_UJRAPROBA);
      // ⭐ D102 (J4): a társ azt viszi, amelyiknek a céllistáján ő áll a legelöl (a már próbáltakat kihagyva).
      let fk = tarshozIllo(ny, tars.cim, tars.port, (x) => !nemProbalt(x));
      // ⭐ D102 (J3): ha több fejléc- vagy törzs-kérelem is hozzá szól, egy SOROZATBAN megy (egy kapcsolaton).
      const sorozatba = (x) => x.fajta === 'fejlecek' || x.fajta === 'torzs';
      if (fk && sorozatba(fk)) {
        const sorozat = tarshozIllok(ny, tars.cim, tars.port, (x) => !nemProbalt(x) || !sorozatba(x), SOROZAT_KORLAT);
        if (sorozat.length > 1) return await fuggoKerelemSorozatMunkaja(allapot, halo, tars, sorozat);
      }
      // ⭐ A ház (D100): a „miközben kopogtatunk” pontosan — a kérelem egy kopogtató témáján TÉNYLEG jelentkeztünk (az
      // őrjárat címjegyzék-köre: `bejelentettKopogtatok`). A lap magától ír be kérelmet; e nélkül minden új bekopogó (egy
      // csatlakozó készülék kézi cseréje is) a csere helyett egy kérelmet kapna, amit nem tud kiszolgálni (mérve).
      const kopogtattunk = (x) => x.kopogtatok.some((k) => allapot.bejelentettKopogtatok?.has(k.fajta + ':' + k.kulcs));
      if (!fk && tars.bekopogo) fk = ny.fuggo.find((x) => kopogtattunk(x) && nemProbalt(x)) ?? null;
      if (fk) return await fuggoKerelemMunkaja(allapot, halo, tars, fk);
    }
    // ⭐ A FRISS LISTA MINDEN MUNKA ELEJÉN: a postaláda hosszan fut, és a jegyzék elévül.
    allapot.frissUdp = await frissUdpCimek(allapot.udpTarolo, allapot.udpElevules);
    const fajlok = allapot.korFajlok ?? await fajlResz();
    // ⭐ MEGJEGYEZZÜK, MIT KÉRHETNEK TŐLÜNK: ha semmit, a randevú kiszolgáló fázisát
    // nem kell kivárni (a társ sem fog kérni — ugyanezt a listát látja).
    let adhatok = 0;
    // ⭐⭐ D91: A RAJ — a csere előtt a vállalásom és a jegyzékem: az eltérő szeletek közül a vállaltakat mondom
    // be, néhány ismert tartójukkal (a megnézettet soha — D75/3).
    const rajVallalas = await sajatVallalasa(null);
    const rajJegyzek = await szeletJegyzekTarolo().olvas();
    const uzenetMeres = process.env.KOINO_UZENETMERES === '1' ? new Map() : null;
    // ⭐⭐ D107 L2 (a kereső-réteg ③b): a kereső-régióim a cserében — a kereső-tárat más folyamat is írhatja (a kézi
    // `kereso behoz`), ezért előbb beolvassuk, amit azóta hozzáfűztek.
    await keresoTar.frissit();
    const keresoRegioimMost = await keresoRegioim();
    const keresoMelysegem = keresoRegioimMost.melyseg;
    const keresoKulcsaim = new Set(keresoRegioimMost.regiok.map((r) => r.kulcs));
    let csere;
    try {
    csere = await csereUdpResen(halo, tars.cim, tars.port, tar, KOINO, {
      // ⭐⭐ D93/3: a személyem (a kézfogás átiratára), a tagsági csomagom és a zárt koinó kapuja.
      ...await azonossagBeallitasa(),
      // ⭐⭐ D95/1, D95/3: a két fokú vállalás (a nagy szelet összegezve) és a csak küldő részvétel.
      ...await ketFokBeallitasai(),
      // ⭐⭐ D95/2: a szerzők tagsági kísérői.
      ...tagsagBeallitasai(),
      raj: (kulcsok) => {
        // ⭐ D107 L2 (③c): a kereső-régióimat is vállalom (a társ tartónak jegyez — a raj kör ebből keres fel).
        const vallal = kulcsok.filter((k) => rajVallalas.szeletek.has(k) || keresoKulcsaim.has(k));
        return { vallal, tippek: rajAjanlat(rajJegyzek, vallal) };
      },
      udpCimek: allapot.frissUdp,
      sajatUdpCim: allapot.sajatKulsoUdp
        ? { hoszt: allapot.sajatKulsoUdp.cim, port: allapot.sajatKulsoUdp.port } : null,
      tablaKulcs: allapot.sajatTablaKulcs,
      // ⭐ D89/1: a tábla-kulcs a kézfogásra tett aláírásával utazik (ettől nem bemondás).
      tablaAlairo: allapot.sajatTablaKulcsTeljes
        ? (atirat) => kezfogasAlairasa(allapot.sajatTablaKulcsTeljes, atirat) : null,
      dhtGepek: allapot.hirdetendoDhtGepek,
      // ⭐⭐ D92: a kérelem (fejlécek, törzs) kiszolgálása — ha a társ ezzel nyit; és a továbbadott kérelem válasza.
      kerelemKiszolgalo: kerelemKiszolgaloja(),
      // ⭐⭐ D109: a kiszolgálási keret (az ítélet és a könyvelés kérésenként).
      kiszolgalasiKeret: kiszolgalasiKeretKapcsolo(),
      // ⭐⭐ D107 L2: a kereső-régióim (a NYITÁS `kd` jele, a régió egyeztetése, a `BEJEGYZES` átadás).
      keresoTar,
      keresoMelyseg: keresoMelysegem,
      valaszFogado: valaszFogadasa,
      fajlKerelem: fajlok.kerelem,
      fajlValasz: async (kertek) => {
        const van = await fajlok.valasz(kertek);
        adhatok += Array.isArray(van) ? van.length : 0;
        return van;
      },
      fajlOlvas: fajlok.olvas,
      // ⭐ A terepi mérés műszere (`KOINO_UZENETMERES=1`): a SAJÁT kiküldött üzeneteim nyílt bájtjai típusonként.
      ...(uzenetMeres ? { uzenetMeres } : {})
    });
    } catch (hiba) {
      // ⭐ D109 (KK6): a társ kiszolgálási kerete most nem enged — nem hiba, és nem találkozás (kötés sem lesz belőle).
      if (hiba?.kod !== 'KESOBB') throw hiba;
      kiir(SZIN.halvany + '  ⏸ ' + ora() + ' ' + tars.cim + ':' + tars.port + ' most nem szolgál ki (a kiszolgálási kerete betelt)'
        + (hiba.kesobb ? ' — ' + hiba.kesobb + ' mp múlva' : '') + SZIN.vege);
      kesobbFeljegyzese(tars, hiba.kesobb);
      return { uj: 0, kuldott: 0, korok: 1, bajt: 0, alairo: null, kesobb: hiba.kesobb ?? null };
    }
    // ⭐⭐ D110: a társ bemondott mélységei (a NYITÁS jeleiből — hitelesített tábla-kulccsal) a tanult mélységhez.
    if (csere.tarsMelysegei && ervenyesTablaKulcs(csere.kapottTablaKulcs)) {
      await tarsMelysegeiFeljegyzese(csere.kapottTablaKulcs.alairo, csere.tarsMelysegei);
    }
    // ⭐ D109 (KK6): MI mondtunk „később”-t (a kiszolgálási keretünk nem enged) — nem találkozás: se kötés, se raj, se tanulás.
    if (csere.kesobbMondtam) {
      return { uj: 0, kuldott: 0, korok: 1, bajt: (csere.bajtKuldott ?? 0) + (csere.bajtKapott ?? 0), alairo: null,
        kesobbMondtam: csere.kesobbMondtam };
    }
    const bajt = (csere.bajtKuldott ?? 0) + (csere.bajtKapott ?? 0);
    // ⭐ D95/3: amit egy tartó a csak küldő úton átvett (vagy már tudott), azt többé nem ajánlom fel.
    await kezbesitesFeljegyzese(csere.kezbesitve);
    // ⭐⭐ KIVEL DOLGOZTUNK? (D71) — a társ tábla-aláírója, ha érvényes tábla-kulcsot hozott. A
    // kopogás-kör ebből erősíti meg (vagy veti el) a hozzárendelést: a cím csak feltevés, ez a név.
    const alairo = ervenyesTablaKulcs(csere.kapottTablaKulcs) ? csere.kapottTablaKulcs.alairo : null;
    const alap = { uj: csere.uj ?? 0, kuldott: csere.kuldott ?? 0, korok: csere.korok ?? 0,
      bajt, masKoino: csere.masKoino ?? null, kivulrolIgyLatszom: csere.kivulrolIgyLatszom ?? null,
      szeletKiszolgalva: csere.szeletKiszolgalva ?? null, alairo };

    // ⚠️ MÁSIK KOINO: nincs miről beszélni, és tanulni sem tanulunk tőle — kimondjuk (D19).
    if (csere.masKoino) {
      kiir(SZIN.halvany + '  · ' + ora() + ' ' + tars.cim + ':' + tars.port + ' — MÁSIK koinóé ('
        + csere.masKoino + '), nem cseréltünk' + SZIN.vege);
      return alap;
    }
    // ⭐ Ha a társ csak EGY szeletet kért (`hozd`), az nem csere — nincs mit tanulni belőle.
    if (csere.szeletKiszolgalva) {
      kiir(SZIN.halvany + '  · ' + ora() + ' ' + tars.cim + ':' + tars.port
        + ' egy szeletet kért tőlem (' + csere.kuldott + ' esemény)' + SZIN.vege);
      return alap;
    }
    // ⭐ D92: egy kérelem (fejlécek, törzs) — szintén nem csere. ⛔ A ki NEM szolgált kérelem sem (tiltott, „később”, ismeretlen
    // fajta): mérve — a „később”-t kapott kérelem után a munka cserét könyvelt (az alsó sáv „csere”-ideje, a keret egy
    // csere-tétele, a D99 ideje).
    if (csere.kerelemKiszolgalva) {
      kiir(SZIN.halvany + '  · ' + ora() + ' ' + tars.cim + ':' + tars.port + ' kérelem: '
        + csere.kerelemKiszolgalva.fajta + ' (' + String(csere.kerelemKiszolgalva.kulcs).slice(0, 8) + '…)' + SZIN.vege);
      return { ...alap, kerelemKiszolgalva: csere.kerelemKiszolgalva };
    }
    if (csere.kerelem) {
      kiir(SZIN.halvany + '  · ' + ora() + ' ' + tars.cim + ':' + tars.port + ' kérelem — nem szolgáltam ki ('
        + (csere.kerelemTiltva ? 'zárt koinó, nem tag' : csere.kerelemKesobb ? '„később”, a kiszolgálási keret' : 'nincs mit adnom')
        + ')' + SZIN.vege);
      return { ...alap, kerelemKiszolgalva: null };
    }

    // ⭐ D99: a sikeres csere ideje a társ tábla-aláírója alatt (a kör ebből tudja, hogy ebben a fél körben már beszéltünk).
    if (alairo) utolsoCsereTarssal.set(alairo, Date.now());
    // ⭐ Az alsó sáv (2026-10-15): a lap ebből mondja ki a csere idejét, és ha újat hozott, frissül (a bekopogó cseréje is).
    await csereAllapota().modosit((a) => csereFeljegyzese(a, { uj: alap.uj, kuldott: alap.kuldott, most: Date.now() }));
    // ⭐ D109 (KK4): a csere is kiszolgálás — a kiküldött bájtok a társ osztálya szerint könyvelődnek (a kötés csak könyvelődik).
    await kiszolgalasiKeretKapcsolo().feljegyez({ tabla: alairo, cim: tars.cim, bajt: csere.bajtKuldott ?? 0, keres: 1 });
    // ⭐ ④b: ha a csere tagsági köre szerzők tagságát hozta, a függő kereső-bejegyzések az indexbe kerülhetnek.
    if (keresoTar.fuggoDarab()) await keresoTar.fuggokFrissitese();
    if (csere.ujBejegyzesek) {
      kiir(SZIN.halvany + '  🔍 ' + ora() + ' ' + csere.ujBejegyzesek + ' új kereső-bejegyzés a régiómba (' + tars.cim + ':'
        + tars.port + ')' + SZIN.vege);
      // ⭐ D97/2: a régióm VÁLTOZOTT — a raj kör a régió többi tartóját is sorra felkeresi.
      if (allapot.rajKor) valtozottFeljegyzese(allapot.rajKor, [...keresoKulcsaim]);
    }
    if (csere.keretMiattKimaradt) {
      kiir(SZIN.halvany + '  ⏸ ' + ora() + ' ' + csere.keretMiattKimaradt + ' eseményt a kiszolgálási keret miatt most nem küldtem'
        + ' (a következő csere folytatja)' + SZIN.vege);
    }
    kiir(SZIN.jo + '  ✓ ' + ora() + ' csere a résen ' + tars.cim + ':' + tars.port
      + SZIN.vege + SZIN.halvany + ' — ' + alap.uj + ' új esemény, küldtem '
      + alap.kuldott + ' (' + alap.korok + ' kör, '
      + adatMennyiseg({ bajtKuldott: bajt }) + ')' + SZIN.vege);
    if (uzenetMeres?.size) {
      kiir(SZIN.halvany + '      (nyíltan küldtem: ' + [...uzenetMeres.entries()].sort((x, y) => y[1] - x[1])
        .map(([k, b]) => k + ' ' + b + ' B').join(', ') + ')' + SZIN.vege);
    }

    // ⭐ D95/2: a tagsági kísérők köre — kimondjuk, ha valakinek a tagsága most derült ki.
    if (csere.tagsagEredmeny?.megtudott) {
      kiir(SZIN.halvany + '  🪪 ' + ora() + ' ' + csere.tagsagEredmeny.megtudott + ' szerző tagsága kiderült (a tagsági csomagjából)'
        + (csere.tagsagEredmeny.fuggo ? ' · ' + csere.tagsagEredmeny.fuggo + ' még függőben' : '') + SZIN.vege);
    }

    // ⭐ D82: amit most kaptunk, annak a környékén keresünk bizonyítható ellentmondást.
    if (alap.uj > 0) await eszlelesEsBejelentes(csere.ujAzonositok);

    // ⭐ D97/2: amit most kaptunk, abban a szeletben VÁLTOZÁS van — a raj tartóit a következő körökben sorra felkeressük.
    if (alap.uj > 0 && allapot.rajKor) {
      const szeletek = [];
      for (const az of (csere.ujAzonositok ?? []).slice(0, 4096)) { const e = await tar.esemeny(az); if (e) szeletek.push(szelet(e)); }
      valtozottFeljegyzese(allapot.rajKor, szeletek);
    }

    // ⭐⭐ ÉS ITT SZÜLETIK A KÖTÉS: akivel összeértünk, azt feljegyezzük a tábla-kulcsa
    // alatt — a cím változhat, ez nem. *A kötés nem megállapodás, hanem tény.*
    await kotesFeljegyzese(allapot.kotesTar, csere.kapottTablaKulcs,
      { hoszt: tars.cim, port: tars.port });

    // ⭐⭐ D91: A RAJ TANULSÁGA — a társ tartó azokra a szeletekre, amiket ő vállal ÉS engem is érdekelnek
    // (vállalom, vagy az átmeneti táramban van); a tippjeit a saját vállalt szeleteimhez olvasztom be. A társ
    // neve a hitelesített tábla-aláírója (D89/1) — név nélkül, csak készülék (D6).
    if (csere.kapottRaj) {
      const atmenetiKulcsok = new Set(atmeneti.szeletek().map((x) => x.kulcs));
      const tarsAlairo = ervenyesTablaKulcs(csere.kapottTablaKulcs) ? csere.kapottTablaKulcs.alairo : null;
      let j = await szeletJegyzekTarolo().olvas();
      let valtozott = false;
      for (const k of csere.kapottRaj.vallal) {
        if (rajVallalas.szeletek.has(k) || atmenetiKulcsok.has(k) || keresoKulcsaim.has(k)) {
          j = szeletCimMegjegyzese(j, k, tars.cim, tars.port, Date.now(), tarsAlairo);
          valtozott = true;
        }
      }
      for (const [k, tippek] of Object.entries(csere.kapottRaj.tippek)) {
        if (rajVallalas.szeletek.has(k)) { j = rajTippekBeolvasztasa(j, k, tippek); valtozott = true; }
      }
      if (valtozott) await szeletJegyzekTarolo().ir(szeletJegyzekTakaritasa(j));
    }

    // ⭐⭐ A LEGJOBB FORRÁS A SAJÁT CÍMÜNKRE A TÁRS (Csaba, 2026-09-17): nem egy tükör
    // mondja meg, hanem az, akivel épp beszélünk — arról a résről, ami tényleg él.
    // ⚠️ Csak ha a kapu portja állandó (lásd `allando`).
    if (csere.kivulrolIgyLatszom && allapot.allando) {
      await frissUdpCimJegyzese(allapot.udpTarolo,
        csere.kivulrolIgyLatszom.cim, csere.kivulrolIgyLatszom.port, allapot.udpElevules);
    }
    const udpTanult = await udpCimeketTanul(allapot.udpTarolo, csere.kapottUdpCimek,
      allapot.udpElevules);
    if (await dhtGepeketTanul(csere.kapottDhtGepek)) {
      allapot.hirdetendoDhtGepek = gepekHirdetese(await dhtIsmertek());
    }
    const kerhetok = Array.isArray(csere.fajlokNala) ? csere.fajlokNala : [];
    // ⭐ D114 (T5): a társ neve a jegyzetben a hitelesített tábla-aláírója — a mobil NAT portja foglalatonként más.
    const fajlForras = (ervenyesTablaKulcs(csere.kapottTablaKulcs) ? csere.kapottTablaKulcs.alairo : null)
      ?? (tars.cim + ':' + tars.port);
    const fajlTanult = kerhetok.length
      ? await fajlTanulsag(fajlForras, kerhetok, tars.cim + ':' + tars.port) : 0;
    allapot.frissUdp = await frissUdpCimek(allapot.udpTarolo, allapot.udpElevules);
    if (udpTanult || fajlTanult) {
      kiir(SZIN.halvany + '    '
        + [udpTanult ? '+' + udpTanult + ' friss UDP-cím' : null,
          fajlTanult ? fajlTanult + ' fájlról tudom meg, hogy nála megvan' : null]
          .filter(Boolean).join(' · ') + SZIN.vege);
    }

    // ⭐ ÉS A BÁJTOK IS A RÉSEN JÖNNEK — épp ezért van a randevú (5.7).
    const randevu = await fajlRandevu(halo, tars.cim, tars.port, {
      sajatCim: csere.kivulrolIgyLatszom
        ? csere.kivulrolIgyLatszom.cim + ':' + csere.kivulrolIgyLatszom.port
        : null,
      kerhetok,
      blob: fajlBlobTarolo(KOINO),
      tar, koino: KOINO,
      // ⛔ D93/3: a zárt koinó nem szabad társának fájlt nem adunk.
      fajlOlvas: csere.tarsKorlatozva ? null : (lenyomat) => fajlBlobTarolo(KOINO).olvas(lenyomat),
      korlat: FAJL_KORLAT,
      kiszolgalasKell: !csere.tarsKorlatozva && adhatok > 0,
      ujKerhetok: szovegKepeiKeresre(fajlBlobTarolo(KOINO)),
      // ⭐ D114: a közös munka (több forrás egy fájlra), ennek a társnak a neve, és a forrás-tudás.
      kozosMunka: fajlMunkak, forras: fajlForras, fajlForrasok: fajlForrasTudas(fajlForras),
      // ⭐ D109 (KK4): a fájl is kiszolgálás — a kiküldött bájtok a kereten (eddig csak a csere könyvelődött).
      kiszolgalasiKeret: kiszolgalasiKeretKapcsolo(), keretTars: { tabla: alairo, cim: tars.cim }
    });
    // ⭐ D109 (KK6): ha a tartó a fájlra „később”-t mondott, a kör addig nem hívja.
    if (randevu.kesobb) kesobbFeljegyzese(tars, randevu.kesobb);
    if (randevu.kesz || randevu.kiszolgalt || randevu.bukott) {
      kiir(SZIN.jo + '  ✓ ' + ora() + ' fájlok a résen: ' + randevu.kesz
        + ' megjött' + (randevu.bajt ? ' (' + adatMennyiseg({ bajtKuldott: randevu.bajt }) + ')' : '')
        + ', ' + randevu.kiszolgalt + ' elment'
        + (randevu.bukott ? ', ' + randevu.bukott + ' nem jött át' : '')
        // ⭐ A korlát miatt kimaradtat kimondjuk (D19) — nem veszett el, a következő kör hozza.
        + (randevu.korlatElerve ? ' · a többi a következő körben (kérés-korlát)' : '') + SZIN.vege);
    }
    return { ...alap, fajlMegjott: randevu.kesz ?? 0 };
  })();
}

/**
 * A kapu jelzései a naplóba — minden út ugyanúgy mondja ki, mi történik a kapun (D19).
 */
function kapuJelzesKiiro() {
  return (e) => {
    if (e.mi === 'ATFURVA') {
      kiir(SZIN.jo + '  ⭐ ' + ora() + ' rés nyílt: ' + e.cim + ':' + e.port + SZIN.vege
        + (e.eltelt === null ? '' : SZIN.halvany + ' (' + e.eltelt + ' ms)' + SZIN.vege));
    }
    // ⭐ A bekopogót is megnevezzük: terepen ebből látszik, hogy a rés melyik
    // oldalról indult, és hogy a másik fél ismert-e minket.
    if (e.mi === 'BEKOPOGO-CEL') {
      kiir(SZIN.halvany + '  · ' + ora() + ' ismeretlen kopogott be (' + e.cim + ':'
        + e.port + ') — visszakopogok, és vele is cserélek' + SZIN.vege);
    }
    if (e.mi === 'BEKOPOGO-ELUTASITVA') {
      kiir(SZIN.halvany + '  · ' + ora() + ' ismeretlen kopogott be (' + e.cim + ':'
        + e.port + '), de most annyi bekopogóval dolgozom, amennyit vállalok — később'
        + SZIN.vege);
    }
    // ⛔⛔ A RÉS MEGNYÍLT, DE A MUNKA RAJTA ELBUKOTT — ezt 2026-09-25-ig SEMMI nem mondta
    // ki (41. mérés). *Két mobil között csak ez az út van.*
    if (e.mi === 'ATFURT-MUNKA-BUKOTT') {
      kiir(SZIN.nem + '  ✗ ' + ora() + ' rés nyílt (' + e.cim + ':' + e.port
        + '), de a csere a résen elbukott: ' + e.ok + SZIN.vege);
    }
    // ⭐⭐ D71: A PORTVÁLTÁS CSAK FELTEVÉS — a tábla-kulcs dönt (44. mérés). Terepen ebből látszik
    // a mobil NAT portváltása is, és az is, ha egy azonos IP-jű MÁS készülék jelentkezett.
    if (e.mi === 'PORTVALTAS-MEGEROSITVE') {
      kiir(SZIN.jo + '  ⭐ ' + ora() + ' egy kötésem új porton jelentkezett (' + e.cim + ':' + e.port
        + ', eddig ' + e.cel + ') — a tábla-kulcsa megerősítette' + SZIN.vege);
    }
    if (e.mi === 'MAS-JELENTKEZETT') {
      kiir(SZIN.halvany + '  · ' + ora() + ' ' + e.cim + ':' + e.port + ' nem az a kötésem, akit a '
        + e.cel + ' címen vártam (más a tábla-kulcsa) — őt hívom tovább' + SZIN.vege);
    }
    if (e.mi === 'MAS-FELELT') {
      kiir(SZIN.halvany + '  · ' + ora() + ' a ' + e.cim + ':' + e.port + ' címen most MÁS felel, nem a'
        + ' kötésem (más a tábla-kulcsa) — ott nem értem el' + SZIN.vege);
    }
    if (e.mi === 'FOGLALT') {
      kiir(SZIN.halvany + '  · ' + ora() + ' ' + e.cim + ':' + e.port + ' foglalt — épp'
        + ' egy korábbi munkán dolgozik velem; újra kopogok' + SZIN.vege);
    }
    // ⚠️ A UDP-kapu ma IPv4-es: egy IPv6-os célt nem hallgatunk el, kimondjuk (D19).
    if (e.mi === 'CEL-KIHAGYVA') {
      kiir(SZIN.nem + '  ✗ ' + ora() + ' ' + e.cim + ' kihagyva: ' + e.ok + SZIN.vege);
    }
    if (e.mi === 'JEGYZEK-TELE') {
      kiir(SZIN.nem + '  ✗ ' + ora() + ' a kapu társ-jegyzéke tele (' + e.korlat
        + ') — új idegen feladónak most nem felelek' + SZIN.vege);
    }
    if (e.mi === 'KAPU-HIBA') {
      kiir(SZIN.nem + '  ✗ ' + ora() + ' a UDP-kapu hibát jelzett: ' + e.ok + SZIN.vege);
    }
  };
}

// ⭐ Egy kézi parancs ennyi ideig kopog a célra (ms). A kézi út nem ablakhoz kötött, de véges:
// ha a túloldal 10 mp alatt nem felel, nincs ott (vagy a portása nem enged be — D19).
const KEZI_KOPOGAS_MS = 10000;

/**
 * ⭐ A KÉZI PARANCSOK KAPUJA (D69/2): egy UDP-kapu a parancs idejére.
 *
 * ⭐ AZ ALAP-PORTON NYÍLIK, HA SZABAD: így a túloldal ugyanazt a címet jegyzi fel rólunk,
 * amin a készülék őrjárata is hallgat — a kézi csere után a kötés címe tartós. ⚠️ Ha egy
 * őrjárat vagy postaláda már fogja a portot, a rendszer adta portra lépünk (`allando: false`).
 *
 * @param {Function} munka - a résen végzendő munka
 * @returns {Promise<{kapu: Object, allando: boolean}>}
 */
async function keziKapuNyitasa(munka) {
  // ⚠️ Idegen bekopogót a kézi kapu nem szolgál ki (0): a parancs a végén bezárja a kaput,
  // és egy félbehagyott munka rosszabb, mint egy őszinte „foglalt".
  const beallitas = { munka, bekopogoKorlat: 0, jelez: kapuJelzesKiiro() };
  try {
    return { kapu: await udpKapuNyitasa({ ...beallitas, port: ALAP_PORT }), allando: true };
  } catch (hiba) {
    if (hiba.code !== 'EADDRINUSE') throw hiba;
    return { kapu: await udpKapuNyitasa({ ...beallitas, port: 0 }), allando: false };
  }
}

/**
 * ⭐ KÉZI CSERE A KAPUN (D69/2) — a `csere` és a `tukor` közös útja: kapu a parancs idejére,
 * kopogás a célokra, a munka a közös gépezet (`resMunkaKeszito`), a végén zárás.
 *
 * @param {Array<{hoszt: string, port: number}>} celok
 * @returns {Promise<{kor: Object, allando: boolean, kapuPort: number}>}
 */
async function keziCsere(celok) {
  const res = await resAllapotKeszites();
  const { kapu, allando } = await keziKapuNyitasa(resMunkaKeszito(res));
  res.allando = allando;
  try {
    // ⭐ EGYSZER állítjuk össze a fájl-kérelmet, és minden társnak ugyanazt adjuk.
    res.korFajlok = await fajlResz();
    const kor = await kapu.kopog(celok.map((c) => ({ cim: c.hoszt, port: c.port })),
      { idokorlat: KEZI_KOPOGAS_MS });
    return { kor, allando, kapuPort: kapu.port };
  } finally {
    kapu.zar();
  }
}

/**
 * Egy kézi kopogás bukásának szövege — MI történt, nem csak az, hogy „nem sikerült" (D19).
 * ⚠️ A „nem felelt" nem vád: a túloldalon nem fut koino, vagy a portása nem enged be.
 */
function keziHibaSzovege(e, cim, port) {
  const hol = cim + ':' + port;
  if (!e) return 'Erre a címre nem tudok kopogni (' + hol + ') — a UDP-kapu ma IPv4-es';
  if (e.hiba === 'nem felelt') {
    return 'A társ nem felelt ' + (KEZI_KOPOGAS_MS / 1000) + ' mp alatt (' + hol + ') — nem fut'
      + ' ott koino, vagy a portása nem enged be (NAT mögött a `pajzsfuro` az út, mindkét oldalon)';
  }
  if (e.hiba === 'foglalt') return 'A társ foglalt volt (' + hol + ') — egy korábbi munkán dolgozik velem';
  return 'A csere nem sikerült (' + hol + '): ' + e.hiba;
}

// ⭐ A kopogás könyvelése a `tarsak.js`-ben él (`kopogasMegfigyelesei`) — próbával mérve.

const adatMennyiseg = (eredmeny) => {
  const bajt = (eredmeny.bajtKuldott ?? 0) + (eredmeny.bajtKapott ?? 0);
  return bajt < 1024 ? bajt + ' bájt' : (bajt / 1024).toFixed(1) + ' KB';
};

async function allapotKiirasa(napokMulva) {
  const { allapot, javaslatok, esemenyek } = await kepetKeszit(napokMulva);
  const vallalas = await sajatVallalasa(allapot);

  if (!allapot.koino.nev) {
    kiir('Még nincs koinód. Hozd létre:');
    kiir('  node koino/koino.js koino "A koino neve"');
    return;
  }

  kiir(SZIN.vastag + allapot.koino.nev + SZIN.vege
    + SZIN.halvany + '   (' + (allapot.koino.zart === false ? 'nyílt' : 'zárt') + ' · te: '
    + rovidAzonosito(szerzo) + ')' + SZIN.vege);
  kiir(SZIN.halvany + 'tudatpontjaid: ' + szetosztottPontok(allapot, szerzo) + ' / ' + TUDATPONT_KERET
    + ' · eseményeid: ' + (await sajatLancEsemenyei(tar, szerzo)).length
    + ' · esemény összesen: ' + esemenyek.length
    + (napokMulva ? ' · NÉZET: ' + napokMulva + ' nap múlva' : '') + SZIN.vege);

  // ----- ⭐⭐ AZ AZONOSSÁG (2026-09-12) -----
  //
  // ⛔ Eddig SEHOL nem látszott: a két lépcsős beléptető kiszámolt mindent, de az állapot
  // egy szót sem szólt róla. ⚠️ A CLAUDE.md szerint *„a gépi segítség értéke az
  // ÉSZREVÉTELBEN van, nem a döntésben"* — az észrevételhez viszont **látszania kell**.
  //
  // ⭐ HÁROM KÉRDÉS, ugyanazzal a vázzal (D56): TAG ← meghívás · TANÚSÍTHAT ← felhatalmazás ·
  // 2. LÉPCSŐS ← tanúsítás. ⚠️ A „nem" kétféle: **nincs meg** vagy **nem ellenőrizhető** (a
  // lánc egy része hiányzik) — és ezt a kettőt sosem mossuk össze (D19).
  const sajatBelepes = await sajatHorgonyom();
  kiir();
  kiir(SZIN.vastag + 'AZONOSSÁG' + SZIN.vege);
  if (!sajatBelepes) {
    kiir(SZIN.halvany + '  Még nincs horgonyod ebben a koinóban: node koino/koino.js belep'
      + SZIN.vege);
  } else {
    const nezet = ujIdentitasNezet();
    const kerdesek = [
      ['tag', await tagE(tar, KOINO, sajatBelepes, nezet), '1. lépcső: minden mehet'],
      ['tanúsíthat', await tanusithatE(tar, KOINO, sajatBelepes, nezet), 'a tanúsítás megbízása'],
      ['2. lépcsős', await lepcso2E(tar, KOINO, sajatBelepes, nezet), 'a pénztárca (D11)']
    ];
    kiir('  ' + SZIN.halvany + 'horgonyod: ' + sajatBelepes.slice(0, 8) + SZIN.vege);
    for (const [nev, valasz, mire] of kerdesek) {
      // ⚠️ Három jel, nem kettő: ✔ igen · ✘ nem · ? nem ellenőrizhető (hiány, nem vád).
      const jel = valasz.igen ? SZIN.jo + '✔' : (valasz.ellenorizheto ? SZIN.nem + '✘' : SZIN.halvany + '?');
      kiir('  ' + jel + SZIN.vege + ' ' + nev.padEnd(12)
        + SZIN.halvany + valasz.ok + ' — ' + mire + SZIN.vege);
    }

    // ⭐ MEGBÍZÁS, NEM PONTSZÁM (D60): „hányan bízták rá a tanúsítást" — soha nem
    // „becsületesség: N". A különbség nem szépészeti: egy jellem-szám hírnév-rendszerré
    // romlik (D18/1, D49/b), ez viszont TÉNY, és nem rólam szól, hanem arról, amit MÁSOK tettek.
    const megbizas = await megbizasAllapota(tar, KOINO, sajatBelepes);
    kiir('  ' + SZIN.halvany + megbizas.felhatalmazasok + '-en bízták rád a tanúsítást'
      + (megbizas.visszavontak ? ' (' + megbizas.visszavontak + ' visszavonva)' : '')
      + ' · ' + megbizas.tanusitasok + ' tanúsításod van'
      + (megbizas.ellenorizheto ? '' : ' · ⚠️ nem ellenőrizhető') + SZIN.vege);

    // ⭐⭐ A BEMUTATKOZÁSOK — KÖLCSÖNÖSEN, VAGY SEHOGY (D62, bekötve 2026-09-22).
    //
    // ⛔ A `bemutatkoz` parancs eddig is kiírta, hogy *„csak KÖLCSÖNÖSEN számít"* — de
    // hogy a kölcsönösség TELJESÜLT-e, azt a program sehol nem mondta meg. A számítás
    // megvolt (7 önpróbával), **éles hívó nélkül**. *Egy feltétel, amiről hallgatunk,
    // nem feltétel, csak felirat.*
    //
    // ⚠️ ÉS A FÜGGŐBEN LÉVŐT KÜLÖN NEVEZZÜK MEG (D19): az egyoldalú bemutatkozás nem
    // hiba és nem vád — a másik fél még nem ért ide. *De tudni kell róla, különben az
    // ember azt hiszi, elintézte.*
    //
    // ⛔ ÉS A „NEM ELLENŐRIZHETŐ" KÜLÖN SOR (2026-09-23): ilyenkor a számítás 0/0-t ad,
    // tehát a számok szerinti feltétel mögé téve ez a felirat SOHA nem jelent meg —
    // épp arról hallgatott, amiről szólnia kellett. *A „nincs" és a „nem tudjuk" nem
    // ugyanaz (D19).*
    const talalkozasok = await bemutatkozasok(tar, KOINO, sajatBelepes);
    if (!talalkozasok.ellenorizheto) {
      kiir('  ' + SZIN.halvany + 'bemutatkozásaid: ⚠️ nem ellenőrizhető' + SZIN.vege);
    } else if (talalkozasok.kolcsonos || talalkozasok.egyoldalu) {
      // ⭐⭐ A FÜGGŐBEN LÉVŐ KÉT IRÁNYA KÜLÖN (2026-09-23): ami RÁM vár, az teendő; ami a
      // MÁSIKRA, az csak tény. *Egy összeg a kettőből nem mondja meg, kell-e lépnem.*
      kiir('  ' + SZIN.halvany + talalkozasok.kolcsonos + ' kölcsönös bemutatkozásod van'
        + (talalkozasok.radVar ? ' · ' + talalkozasok.radVar + ' FÜGGŐBEN, rád vár' : '')
        + (talalkozasok.masikraVar
          ? ' · ' + talalkozasok.masikraVar + ' FÜGGŐBEN, a másik félre vár' : '')
        + SZIN.vege);
      // ⭐ A kézi út kéznél (4. szabály): amit viszonozhatok, azt parancsként mondjuk meg.
      // ⚠️ Csak ELLENŐRZÖTT horgonyra (lásd a `bemutatkozasok` fejlécét) — ha találkoztatok.
      for (const h of talalkozasok.radVarHorgonyok) {
        kiir('    ' + SZIN.halvany + 'ha találkoztatok, viszonozd: node koino/koino.js bemutatkoz '
          + h.slice(0, 8) + SZIN.vege);
      }
    }

    // ⭐⭐⭐ A VALÓDI VÉDELEM: a kontraszt-jelzés. *„Hány olyan embert tanúsítottál, akinek
    // nincs önálló élete a közösségben?"* — a becsületes alapvonal 0,3, a megvett tanúsítóé
    // több száz. ⛔ Ez SOHA nem ítél: szám, nem vád, és a döntés-réteg nem is látja.
    const torlodas = await tanusitoiTorlodas(tar, KOINO, sajatBelepes);
    if (torlodas.tanusitott) {
      kiir('  ' + SZIN.halvany + 'akiket tanúsítottál: ' + torlodas.tanusitott
        + ' · ebből önálló élet nélkül: ' + torlodas.magukbanAllok
        + (torlodas.ellenorizheto ? '' : ' · ⚠️ nem ellenőrizhető') + SZIN.vege);
      kiir('  ' + SZIN.halvany + '⚠️ Ez SZÁM, nem ítélet — a koino bejelent, nem bíráskodik (D19).'
        + SZIN.vege);
    }
  }

  // ----- ⭐ ELAKADT TUDATPONT (2026-09-07) -----
  // A törölt gondolatra tett pontom a keretemben marad, amíg vissza nem veszem. ⚠️ Ezt
  // KI KELL ÍRNI, különben a szám (`tudatpontjaid`) érthetetlen: „miért van 300-am
  // kiosztva, ha csak két gondolatot látok?" *A koino bejelent, nem hallgat (D19).*
  const elakadt = elakadtPontok(allapot, szerzo);
  if (elakadt.length) {
    const osszeg = elakadt.reduce((s, e) => s + e.pont, 0);
    kiir(SZIN.halvany + '↩ ebből ' + osszeg + ' pont törölt gondolaton áll ('
      + elakadt.length + ' db) — a készülék magától visszaveszi, vagy: felszabadit'
      + SZIN.vege);
  }

  // ----- ELLENTMONDÁSOK (D19: bejelent, nem büntet) -----
  if (allapot.ellentmondasok.length || allapot.idoEllentmondasok.length || allapot.kivetelek.length) {
    kiir();
    if (allapot.ellentmondasok.length) {
      kiir(SZIN.nem + '⚠ ' + allapot.ellentmondasok.length + ' elágazás (két aláírás ugyanarról a pontról)' + SZIN.vege);
    }
    if (allapot.idoEllentmondasok.length) {
      kiir(SZIN.nem + '⚠ ' + allapot.idoEllentmondasok.length + ' visszafelé lépő idő a saját láncban' + SZIN.vege);
    }
    for (const k of allapot.kivetelek) {
      kiir(SZIN.nem + '⚠ nem számít: ' + k.tipus + ' — ' + k.ok + SZIN.vege);
    }
  }
  // ⭐ D93/1: ami a szerzője tagsága miatt vár (nem vád — a bizonyíték hiányzik; amint megjön, számít).
  if (allapot.tagsagFuggoben?.length) {
    const szerzok = new Set(allapot.tagsagFuggoben.map((k) => k.szerzo));
    kiir(SZIN.halvany + '⏳ ' + allapot.tagsagFuggoben.length + ' esemény nem számít, amíg a szerzője tagsága nem'
      + ' ellenőrizhető (' + szerzok.size + ' szerző' + (szerzok.has(szerzo) ? ', köztük te' : '') + ' — D93/1)' + SZIN.vege);
  }

  // ----- GONDOLATOK -----
  kiir();
  kiir(SZIN.vastag + 'GONDOLATOK' + SZIN.vege);
  if (allapot.entitasok.size === 0) {
    kiir(SZIN.halvany + '  (még nincs)' + SZIN.vege);
  }
  // A MEGJELENÍTÉS sorrendje: a legtöbb tudatpontot kapott elöl (holtversenynél az
  // azonosító dönt, hogy két gép ugyanazt lássa). ⚠️ Ez a felület döntése, nem a
  // számításé — az állapot maga determinisztikus sorrendben áll elő (allapotSzamitas.js).
  const rangsor = [...allapot.entitasok.values()].sort((a, b) =>
    b.osszesPont - a.osszesPont || (a.azonosito < b.azonosito ? -1 : 1));

  for (const e of rangsor) {
    const sajat = e.hozzajarulok.get(szerzo)?.pont ?? 0;
    kiir('  ' + SZIN.halvany + e.azonosito.slice(0, 8) + SZIN.vege + '  ' + e.cim);
    kiir('      ' + SZIN.halvany + e.meret + ' bájt · összes pont: ' + e.osszesPont
      + ' · a tiéd: ' + sajat + ' · hozzájárulók: ' + e.hozzajarulok.size
      // ⭐ B/1–B/2 (D75/4): amit nem vállalok, az „nem tartod”; ami csak az átmenetiben van, és a pontjait
      // nem ismerem, az nem tűnt el (a D14 csak a tartósra vonatkozik) — kimondjuk.
      + (e.pontokIsmeretlenek ? ' · ⚠ a pontjai ismeretlenek (nem tartom a szeletét — csak a születését láttam)' : '')
      + (vallalas.szeletek.has(e.azonosito) ? '' : ' · nem tartod') + SZIN.vege);
    if (e.szoveg) {
      // ⭐ D72: a szöveg külön darab lehet — a fájl-tárból oldjuk fel; ha még nincs meg, kimondjuk.
      const f = await szovegFeloldasa(e.szoveg, (lenyomat) => fajlBlobTarolo(KOINO).olvas(lenyomat));
      kiir('      ' + SZIN.halvany + (f.hianyzik
        ? '(a szöveg még nem érkezett meg — külön darab: ' + f.lenyomat.slice(0, 8) + '…)'
        : szovegKifele(f.szoveg)) + SZIN.vege);
    }
  }

  // ----- JAVASLATOK -----
  //
  // ⭐⭐ KÉT FEJLÉC, mert KÉT FAJTA VAN (D27, és a CLAUDE.md névszabálya: „a javaslat szó
  // önmagában gyűjtőnév"). A számok és a rész-sorok ugyanazok — a **gépezet ugyanaz** —,
  // csak a következmény más, ezért egy rajzoló szolgálja ki mindkettőt.
  const folyamatban = [...javaslatok.values()];
  const javaslatKiirasa = (j) => {
    const kik = j.erintettek ?? [];
    const szin = j.statusz === 'elfogadva' ? SZIN.jo : j.statusz === 'elvetve' ? SZIN.nem : '';
    // ⭐ D85 T3: a „nem ismert” két szó (és nem hajtódik végre semmi — D19).
    const felirat = j.statusz === 'nemIsmert' ? 'NEM ISMERT' : j.statusz.toUpperCase();
    kiir('  ' + SZIN.halvany + j.azonosito.slice(0, 8) + SZIN.vege
      + '  ' + szin + felirat + SZIN.vege
      + '  ' + (kik.length > 1 ? kik.length + ' entitás' : j.muvelet + ': „' + (j.valtozas?.cim ?? '—') + '"'));
    // ⭐⭐ MINDEN ÉRINTETT SORONKÉNT, A SAJÁT DÖNTÉSÉVEL — a művelet entitásonkénti, ÉS a
    // döntés is: minden résznek teljesítenie kell a SAJÁT küszöbeit (töredék-modell).
    // Ezért nem lehet egyetlen sorral összefoglalni; a rész-sorok mutatják meg, MELYIK
    // rész buktatja el az egészet.
    for (const r of (j.reszek ?? [])) {
      // ⭐ D85 T3: a nem ismert rész jele „?” — a számai a nálunk lévő töredékből jönnek, nem a döntésből.
      const jel = r.ismert === false ? SZIN.halvany + '?' : r.kuszobTeljesul ? SZIN.jo + '✔' : SZIN.nem + '✘';
      // ⚠️ KÉTFÉLE HIÁNY, KÉTFÉLE SZÓ: amit ismertünk és eltűnt (törlés vagy felejtés),
      // az „már nincs"; amiről sosem hallottunk, az „ismeretlen". A kettő összemosása
      // pont azt a különbséget tüntetné el, amit a D19 véd.
      const cel = allapot.entitasok.get(r.entitas)?.cim
        ?? (allapot.elfelejtettek.includes(r.entitas) ? '— már nincs —' : 'ismeretlen');
      kiir('      ' + SZIN.halvany + '↳ ' + jel + SZIN.vege + SZIN.halvany + ' ' + r.muvelet + ': '
        + '„' + cel + '"'
        + (r.valtozas?.cim ? ' → „' + r.valtozas.cim + '"' : '')
        + '  👍 ' + r.tamogatok + ' 👎 ' + r.ellenzok + ' 🤷 ' + r.tartozkodok
        + ' (' + r.szavazok + '/' + r.nevezo + ')'
        + ' · ' + szazalek(r.tamogatottsagEzrelek) + SZIN.vege);
    }
    // ⭐ D85 T3: ha a döntés nem ismert, kimondjuk, miért — és ha az ismert rész(ek) egyszer sem mondtak
    // igent, azt is: akkor az entitás biztosan nem változott (az ÉS miatt), csak a címke kérdéses.
    if (j.ismeretlenReszek?.length) {
      const ismertek = (j.reszek ?? []).filter((r) => r.ismert);
      kiir('      ' + SZIN.halvany + j.ismeretlenReszek.length + ' rész bemenetét nem ismerem'
        + ' (a döntési csomag hozza el, vagy a szelete)'
        + (ismertek.length && !ismertek.some((r) => r.valahaTeljesult)
          ? ' · az ismert rész eddig nem mondott igent' : '') + SZIN.vege);
    }
    kiir('      ' + SZIN.halvany
      + 'bizonyosság ' + szazalek(j.bizonyossagiMutato) + SZIN.vege);
    kiir('      ' + SZIN.halvany + (j.statusz === 'folyamatban' ? 'zárul: ' : 'lezárult: ')
      + new Date(j.lezarasIdeje).toLocaleString('hu-HU')
      + ' (döntési idő ' + Math.round(j.dontesiIdo / 3600) + ' óra)'
      + (j.kesoiSzavazatok ? ' · ' + j.kesoiSzavazatok + ' késői szavazat nem számít' : '')
      + SZIN.vege);
    const enyem = sajatSzavazat(allapot.szamitok, j.azonosito, szerzo);
    if (enyem) kiir('      ' + SZIN.halvany + 'a szavazatod: ' + enyem + SZIN.vege);
  };

  const szerkesztesiek = folyamatban.filter((j) => j.fajta !== 'altalanos');
  const altalanosak = folyamatban.filter((j) => j.fajta === 'altalanos');

  kiir();
  kiir(SZIN.vastag + 'SZERKESZTÉSI JAVASLATOK' + SZIN.vege);
  if (!szerkesztesiek.length) kiir(SZIN.halvany + '  (még nincs)' + SZIN.vege);
  for (const j of szerkesztesiek) javaslatKiirasa(j);

  // ⭐⭐⭐ ÁLTALÁNOS JAVASLATOK (D27) — a közösség álláspontja. ⚠️ Ha elfogadják, **semmi
  // nem hajtódik végre**; az egyezmény MAGA az álláspont, és él tovább (állásfoglalások).
  if (altalanosak.length) {
    kiir();
    kiir(SZIN.vastag + 'ÁLTALÁNOS JAVASLATOK' + SZIN.vege);
    for (const j of altalanosak) javaslatKiirasa(j);
  }

  // ----- ⭐ KÜLÖNVÁLÁSOK (2026-09-08) -----
  // *„Aki elmegy, viszi a súlyát."* Ez nem mellékes esemény: egy gondolat kettévált, és
  // mindkét ág él tovább. ⚠️ Ki kell írni, különben a pakliban csak egy „új" gondolat
  // bukkanna fel magyarázat nélkül.
  if (allapot.kulonvalasok?.length) {
    kiir();
    kiir(SZIN.vastag + 'KÜLÖNVÁLÁSOK' + SZIN.vege);
    for (const kv of allapot.kulonvalasok) {
      const foag = allapot.entitasok.get(kv.foag);
      const ag = allapot.entitasok.get(kv.kulonvaltAg);
      kiir('  ⑂ ' + SZIN.halvany + kv.foag.slice(0, 8) + SZIN.vege
        + ' „' + (foag?.cim ?? '—') + '"'
        + SZIN.halvany + '  ⟶  ' + SZIN.vege
        + SZIN.halvany + kv.kulonvaltAg.slice(0, 8) + SZIN.vege
        + ' „' + (ag?.cim ?? '—') + '"');
      kiir('      ' + SZIN.halvany + kv.atvittEmberek + ' ember vitte a régi változatot, '
        + kv.atvittPontok + ' tudatponttal' + SZIN.vege);
    }
  }

  // ----- EGYEZMÉNYEK -----
  const egyezmenyKiirasa = (j) => {
    const e = j.egyezmeny;
    const p = e.pillanatkep;
    const kik = e.erintettek ?? [];
    kiir('  ' + SZIN.jo + '📜 '
      + (kik.length > 1
        ? kik.map((r) => r.muvelet + ' „' + (allapot.entitasok.get(r.entitas)?.cim
            ?? (allapot.elfelejtettek.includes(r.entitas) ? '— már nincs —' : '?')) + '"').join(' + ')
        : e.muvelet + ': „' + (e.valtozas?.cim ?? '—') + '"') + SZIN.vege);
    kiir('      ' + SZIN.halvany + j.azonosito.slice(0, 8)
      + ' · megszületett: ' + new Date(e.megszuletett).toLocaleString('hu-HU')
      + ' · ' + p.tamogatok + '/' + p.szavazok + ' támogató (' + szazalek(p.tamogatottsagEzrelek) + ')'
      + ' · részvétel ' + szazalek(p.reszveteliEzrelek) + SZIN.vege);

    // ⭐⭐ A HATÁLY — csak az ÁLTALÁNOSNÁL van (D27). *A TÉNY örök (fent, a pillanatképben),
    // a HATÁLY viszont ÉL: hányan állnak mögötte MOST.* ⚠️ Enélkül az `allast` parancs
    // eredménye sehol nem látszana — a koino pedig **bejelent, nem hallgat** (D19).
    if (e.hataly) {
      const h = e.hataly;
      kiir('      ' + SZIN.halvany + 'hatály MOST: ' + SZIN.vege
        + SZIN.jo + '🤝 ' + h.csatlakozok.length + SZIN.vege + SZIN.halvany + ' csatlakozó · ' + SZIN.vege
        + SZIN.nem + '✋ ' + h.tiltakozok.length + SZIN.vege + SZIN.halvany + ' tiltakozó' + SZIN.vege
        + (h.utkozesek.length
          ? SZIN.halvany + ' · ⚡ ' + h.utkozesek.length + ' ütközés-jelölés' + SZIN.vege
          : ''));
      for (const u of h.utkozesek) {
        kiir('        ' + SZIN.halvany + '⚡ ütközik ezzel: ' + (u.masik ?? '?').slice(0, 8)
          + (u.indoklas ? ' — ' + u.indoklas : '') + SZIN.vege);
      }
      kiir('      ' + SZIN.halvany + '⚠️ Ebből semmi nem következik automatikusan (D27/6) — '
        + 'csak látszik, hányan állnak mögötte.' + SZIN.vege);
    }
  };

  const szerkesztesiEgyezmenyek = szerkesztesiek.filter((j) => j.egyezmeny);
  const altalanosEgyezmenyek = altalanosak.filter((j) => j.egyezmeny);

  kiir();
  kiir(SZIN.vastag + 'SZERKESZTÉSI EGYEZMÉNYEK' + SZIN.vege);
  if (!szerkesztesiEgyezmenyek.length) {
    kiir(SZIN.halvany + '  (még nincs — akkor születik, ha egy szerkesztési javaslatot elfogadnak)' + SZIN.vege);
  }
  for (const j of szerkesztesiEgyezmenyek) egyezmenyKiirasa(j);

  if (altalanosEgyezmenyek.length) {
    kiir();
    kiir(SZIN.vastag + 'ÁLTALÁNOS EGYEZMÉNYEK' + SZIN.vege);
    for (const j of altalanosEgyezmenyek) egyezmenyKiirasa(j);
    kiir(SZIN.halvany + '  Állást foglalni: node koino/koino.js allast <egyezmény> '
      + 'csatlakozik|tiltakozik|utkozik' + SZIN.vege);
  }
}

try {
  // ⭐ B/2: a vállalttá vált átmeneti szeletek a tartós tárba (pl. ha az előző parancs pontot tett rájuk).
  await atmenetiElolepetese();
  switch (parancs) {

    case undefined:
    case 'allapot': {
      // Előre nézés: `allapot 3` = mi lesz 3 nap múlva (a döntési idő napokban mérhető)
      await allapotKiirasa(parseInt(ervek[0], 10) || 0);
      break;
    }

    case 'kulcs': {
      kiir('Az azonosságod (a nyilvános kulcsod):');
      kiir('  ' + szerzo);
      kiir(SZIN.halvany + 'A kulcs fájlja: ' + tarolo.fajl + SZIN.vege);
      kiir(SZIN.halvany + 'Az adat helye:  ' + alapHely() + SZIN.vege);
      break;
    }

    case 'mentes': {
      const hova = ervek[0];
      if (!hova) throw new Error('Hova mentsem? node koino/koino.js mentes <fájl>');
      await writeFile(hova, await kulcsparKimentese(kulcspar), 'utf8');
      kiir('Elmentve: ' + hova);
      kiir(SZIN.nem + 'Aki ezt a fájlt megszerzi, a nevedben tud aláírni. Őrizd biztos helyen.' + SZIN.vege);
      // ⭐ ÉS MEGMONDJUK, MIRE JÓ. Egy mentés, amiről nem tudod, hogyan hozható vissza,
      // nem mentés, hanem hamis biztonságérzet — a visszatöltés parancsa 2026-09-15-ig
      // hiányzott is, pedig a réteg tudta.
      kiir(SZIN.halvany + 'Visszahozni így lehet — egy ÚJ készüléken, mielőtt bármi mást'
        + ' csinálnál rajta:' + SZIN.vege);
      kiir(SZIN.halvany + '  node koino/koino.js visszatolt ' + hova + SZIN.vege);
      break;
    }

    // ===================================
    // ⛔⛔ A KÉZI ÚT: FÁJLBA VINNI, FÁJLBÓL HOZNI (4. szabály)
    // ===================================
    //
    // *„Ha egy funkció csak online tud működni, az fojtópont."* A koinónak eddig öt
    // hálózati útja volt és **egy sem** kézi — a kézi út az adat-fájl másolása volt, amit
    // nem a program kínált, és ami semmit nem ellenőrzött.
    //
    // ⭐ A kivitt fájl alakja UGYANAZ, mint a táré (`esemenyek.jsonl`), tehát a lemásolt
    // adat-fájl is behozható — a régi kézi út nem veszett el, hanem ellenőrzötté vált.

    case 'kivisz': {
      const hova = ervek[0];
      if (!hova) {
        throw new Error('Hova vigyem? node koino/koino.js kivisz <fájl> [mind|sajat|<azonosító>]');
      }

      const { szoveg, darab, hatokor, bajt, szovegDarabok, hianyzoDarabok, kiserok } = await kivitelSzovege(
        tar, KOINO, {
          hatokor: ervek[1] ?? 'mind',
          szerzo,
          // ⭐ D72: a szöveg külön darab — a kézi út azt is viszi.
          darabOlvas: (lenyomat) => fajlBlobTarolo(KOINO).olvas(lenyomat),
          // ⭐ D95/2: egy entitás kivitele a döntési események szerzőinek tagsági kísérőit is viszi (a csere párja —
          // 4. szabály): a túloldalon a pontjaik és szavazataik csak így számítanak.
          kiserok: async (esemenyek) => tagsagiKiserok(tar, KOINO,
            [...new Set(esemenyek.filter((e) => TAGSAG_KELL.has(e.tipus)).map((e) => e.szerzo))],
            { koinoSzuletes: await koinoSzuletese(), szerzoKorlat: 256, korlat: 4096, bajtKorlat: Infinity })
        });

      if (darab === 0) {
        // ⚠️ NEM ÍRUNK ÜRES FÁJLT ÉS NEM HALLGATUNK: ha semmi nem jött ki, azt a hatókör
        // magyarázza (elgépelt azonosító, üres lánc) — mondjuk meg, ne kelljen kitalálni.
        kiir(SZIN.nem + 'Nincs mit kivinni ebben a hatókörben: ' + hatokor + SZIN.vege);
        break;
      }

      await writeFile(hova, szoveg, 'utf8');
      kiir('Kivíve: ' + hova);
      kiir('  ' + darab + ' esemény · ' + szovegDarabok + ' szöveg-darab · ' + bajt + ' bájt · hatókör: '
        + hatokor + (kiserok ? ' · ebből ' + kiserok + ' tagsági kísérő (a szerzők tagsága — D95/2)' : ''));
      // ⚠️ Amit nálunk sincs meg, azt nem visszük — és kimondjuk (D19).
      if (hianyzoDarabok) {
        kiir(SZIN.nem + '  ' + hianyzoDarabok + ' szöveg-darab nálam sincs meg — a fájlban csak a'
          + ' hivatkozása utazik' + SZIN.vege);
      }
      kiir(SZIN.halvany
        + 'Vidd át bárhogyan (pendrive, e-mail, üzenet), és ott: behoz <fájl>.' + SZIN.vege);
      // ⚠️ A 6. SZABÁLY az ADAT-csomagra kemény — ezért mondjuk meg a bájtot, és ezért
      // van hatóköre a kivitelnek. A „saját lánc" a D21 ~1 KB/fő újjáépítési magja.
      if (hatokor === 'mind') {
        kiir(SZIN.halvany
          + 'Csak a saját láncod: kivisz <fájl> sajat — egy entitásé: kivisz <fájl> <azonosító>'
          + SZIN.vege);
      }
      break;
    }

    case 'csomag': {
      // ===== ⭐⭐ D85 T3: A DÖNTÉSI CSOMAG KIADÁSA =====
      //
      // Egy több érintettes javaslat (egyesítés, csomag) döntéséhez a G1 tartóinak a G2-es rész bemenete
      // is kell (az ÉS és a közös lezárás miatt). A lezárás után ez egy aláírt csomagban jut el — a (B)
      // szerint a rész TÖREDÉKÉNEK szeletébe, és csak az, ami onnan hiányzik. Az őrjárat a SAJÁT
      // javaslataimra magától kiadja; ezzel a paranccsal bárki kiadhatja (vagy pótolhatja), akinél a
      // bemenet megvan. Ismételhető: ha már minden ott van, nem ír semmit.
      const { kiadva, javaslatok } = await dontesiCsomagokKiadasa(kornyezet, { javaslat: ervek[0] ?? null });
      if (!javaslatok) {
        kiir(SZIN.halvany + (ervek[0]
          ? 'Ehhez a javaslathoz most nem jár csomag (nincs meg, nem számít, egy érintettes, vagy még nyitva).'
          : 'Nincs lezárt, több érintettes javaslat.') + SZIN.vege);
        break;
      }
      const esemenyDarab = kiadva.reduce((n, e) => n + e.adat.esemenyek.length - 1, 0);
      kiir((kiadva.length ? SZIN.jo : SZIN.halvany) + javaslatok + ' lezárt döntés · ' + kiadva.length
        + ' új csomag (' + esemenyDarab + ' esemény a töredékekbe)' + SZIN.vege
        + (kiadva.length ? '' : SZIN.halvany + ' — minden ott van már' + SZIN.vege));
      break;
    }

    case 'felderites': {
      // ===== ⭐⭐ D112 ③: A FELDERÍTÉS — egy ág egyszeri pillanatképe (D108/1) =====
      //
      // node koino/koino.js felderites                                — a felderítések és az állásuk
      // node koino/koino.js felderites <ág|gyoker> [K] [mélység|-] [torzs] [MB]  — új (vagy újra) — az őrjárat viszi
      // node koino/koino.js felderites torol <azonosító>              — a rögzítés feloldása, ki a jegyzékből
      const al = ervek[0];
      if (al === 'torol') {
        const j = await felderitesJegyzekOlvasasa();
        const f = j.felderitesek.find((x) => x.az === ervek[1] || x.az.startsWith(ervek[1] ?? '\u0000'));
        if (!f) throw new Error('Nincs ilyen felderítés: ' + (ervek[1] ?? '(add meg az azonosítóját)'));
        await atmeneti.rogzitesFeloldasa(f.az);
        await felderitesJegyzekIrasa(felderitesTorlese(j, f.az));
        kiir('Felderítés törölve: ' + f.az + SZIN.halvany + ' — a pillanatképe a böngészés kiszorításába került vissza' + SZIN.vege);
        break;
      }
      if (al) {
        let ag = GYOKER_AG;
        if (al !== GYOKER_AG) {
          const { allapot } = await kepetKeszit();
          try { ag = feloldas(al, allapot.entitasok.keys()); } catch (hiba) {
            if (/^[A-Za-z0-9_-]{43}$/.test(al)) ag = al; else throw hiba;
          }
        }
        const k = parseInt(ervek[1], 10);
        const melyseg = parseInt(ervek[2], 10);
        const mb = parseInt(ervek[4], 10);
        const { jegyzek, felderites: f, ujra } = ujFelderites(await felderitesJegyzekOlvasasa(), {
          ag, k: Number.isInteger(k) ? k : undefined, melyseg: Number.isInteger(melyseg) ? melyseg : undefined,
          torzs: ervek[3] === 'torzs', mb: Number.isInteger(mb) ? mb : undefined }, Date.now(), 'f-' + randomUUID().slice(0, 8));
        await felderitesJegyzekIrasa(jegyzek);
        const kor = await felderitesKor();
        kiir(SZIN.vastag + (ujra ? 'ÚJRAFELDERÍTÉS: ' : 'FELDERÍTÉS: ') + SZIN.vege + (ag === GYOKER_AG ? 'az egész koinó' : ag.slice(0, 12) + '…')
          + ' — a legjobb ' + f.k + (f.melyseg !== null ? ', legfeljebb ' + f.melyseg + ' szint' : '') + ', ' + (f.torzs ? 'a törzzsel' : 'csak fejléc')
          + ', ' + f.mb + ' MB, körönként ' + f.keresKor + ' kérés (' + f.az + ')');
        kiir(SZIN.halvany + '  ' + kor.kert + ' kérés indult; az őrjárat viszi tovább (az állás: node koino/koino.js felderites).'
          + ' Pillanatkép: nem frissül, értesítést nem ad — a követés eszköze a tudatpont.' + SZIN.vege);
        break;
      }
      const j = await felderitesJegyzekOlvasasa();
      kiir(SZIN.vastag + 'FELDERÍTÉSEK: ' + j.felderitesek.length + SZIN.vege + SZIN.halvany + '  (pillanatképek — az alapérték: K = '
        + FELDERITES_ALAP.k + ', ' + FELDERITES_ALAP.mb + ' MB; egyszerre ≤ ' + FELDERITES_HATAR.aktiv + ' fut)' + SZIN.vege);
      const allapotNeve = { fut: 'fut', kesz: 'kész', keret: 'megállt (méret)', elakadt: 'elakadt', megallitva: 'megállítva' };
      const fazisNeve = (f) => (f.allapot === 'fut' && f.torzs ? (f.fazis === 'torzs' ? ' (a törzs: ' + (f.torzsHianyzik ?? '?')
        + ' csomópontnak hiányzik)' : ' (a fejlécek)') : '');
      for (const f of j.felderitesek) {
        const r = atmeneti.rogzitesAllasa(f.az);
        kiir('  ' + f.az + '  ' + (f.ag === GYOKER_AG ? 'az egész koinó' : f.ag.slice(0, 12) + '…') + '  ' + allapotNeve[f.allapot]
          + fazisNeve(f)
          + ' · ' + f.latszik + '/' + f.k + ' csomópont (biztos ' + f.biztos + ') · ' + r.szeletek + ' szelet rögzítve, '
          + adatMennyiseg({ bajtKuldott: r.bajt }) + ' / ' + f.mb + ' MB · ' + f.kerelmek + ' kérés'
          + (f.ok ? SZIN.halvany + ' — ' + f.ok + SZIN.vege : ''));
      }
      break;
    }

    case 'tomorit': {
      // ===== ⭐ D75/1, D73: A TÁR TÖMÖRÍTÉSE — ami kiesett a vállalásomból, az átmeneti tárba =====
      // node koino/koino.js tomorit [proba]
      const r = await tomoritesFuttatasa({ proba: ervek[0] === 'proba' });
      if (r.ok === 'próba') {
        kiir('Tömörítés (próba): ' + r.megtartva + ' esemény marad a tartós tárban, ' + r.kivett + ' kerülne az átmenetibe');
      } else if (r.ok === 'kész') {
        kiir(SZIN.jo + 'Tömörítve: ' + r.megtartva + ' esemény maradt a tartós tárban, ' + r.kivett + ' az átmenetibe került'
          + SZIN.vege + SZIN.halvany + ' (D75/1 — amit nem vállalok, azt csak láttam)' + SZIN.vege);
      } else {
        kiir(SZIN.halvany + 'Nincs tömörítés: ' + r.ok + SZIN.vege);
      }
      // ⭐ D112 ① (F3): és a fájl-tár kerete — a nem vállalt törzs (a legrégebben érintett) a keret fölött kiesik.
      const ft = await fajlTarTakaritasa({ kenyszer: true, proba: ervek[0] === 'proba' });
      if (ft?.mindent) kiir(SZIN.halvany + 'Fájl-tár: a „mindent” készülék mindent tart.' + SZIN.vege);
      else if (ft) {
        kiir('Fájl-tár: a nem vállalt törzs ' + adatMennyiseg({ bajtKuldott: ft.atmenetiMeret }) + ' (a keret '
          + adatMennyiseg({ bajtKuldott: kornyezetSzam('KOINO_FAJL_ATMENETI', FAJL_ATMENETI_KORLAT) }) + ')'
          + (ervek[0] === 'proba' ? ' — ' + ft.terv.torlendo.length + ' fájl esne ki'
            : ft.torolt ? ' — ' + SZIN.jo + ft.torolt + ' fájl kiesett' + SZIN.vege + ' (' + adatMennyiseg({ bajtKuldott: ft.felszabadult })
              + ', újra elhozható)' : ''));
      }
      break;
    }

    case 'kereso': {
      // ===== ⭐⭐ A KERESŐ-TÁR (D107 L1 — a kereső-réteg ③): mit tartok a régióimban, és a kézi út (4. szabály) =====
      //
      // `kereso` — a régióim és a bejegyzéseim · `kereso felajanl <fájl>` — a gondolataim bejegyzései fájlba (a ④ előtt ez a
      // felajánlás útja) · `kereso behoz <fájl>` — bejegyzések fájlból, UGYANAZON A KAPUN · `kereso kivisz <fájl>` — a
      // kereső-táram fájlba (egy másik tartónak — a ③b cseréjének kézi párja).
      const al = ervek[0] ?? '';
      const fajlNeve = ervek[1];
      // ⭐ ④b: a fájl a szerzők TAGSÁGI KÍSÉRŐIT is viszi (`{ kisero: esemény }` sorok — a csomagjuk, vagy a tagsági láncuk,
      // D95/2): a befogadó ezekből ellenőrzi a tagságukat (K3), különben a bejegyzés nála függő maradna.
      // ⭐ D111 (K11): és a TARTÓ-TIPPEKET (`{ tipp: { g, t: [{ a, t }] } }` sorok — a felajánlónál a saját készüléke).
      const sorokba = async (lista, tippForras) => {
        const szerzok = [...new Set(lista.flatMap((b) => bejegyzesSzerzoi(b)))];
        const kiserok = szerzok.length ? await tagsagiKiserok(tar, KOINO, szerzok,
          { koinoSzuletes: await koinoSzuletese(), szerzoKorlat: 256, korlat: 4096, bajtKorlat: Infinity }) : [];
        const tippSorok = [];
        for (const g of new Set(lista.map((b) => b.g))) {
          const t = await tippForras(g);
          if (t.length) tippSorok.push(JSON.stringify({ tipp: { g, t } }));
        }
        return { szoveg: [...lista.map((b) => JSON.stringify(b)), ...kiserok.map((e) => JSON.stringify({ kisero: e })), ...tippSorok]
          .map((x) => x + '\n').join(''), kiserok: kiserok.length };
      };
      const sajatTippForras = async () => [{ a: (await tablaKulcsBiztositasa()).alairoNyilvanos, t: Date.now() }];
      if (al === 'kivisz') {
        if (!fajlNeve) throw new Error('Hova írjam? node koino/koino.js kereso kivisz <fájl>');
        const lista = keresoTar.bejegyzesek();
        const f = await sorokba(lista, (g) => keresoTar.tippek(g));
        await writeFile(fajlNeve, f.szoveg, 'utf8');
        kiir('Kivittem a kereső-táram ' + lista.length + ' bejegyzését (' + f.kiserok + ' tagsági kísérővel): ' + fajlNeve);
        break;
      }
      if (al === 'felajanl' && ervek[1] && Number.isInteger(Number(ervek[2]))) {
        // ⭐ D107 L4 (④c): KÖZVETLENÜL egy tartónak (`kereso felajanl <cím> <port>`) — minden bejegyzésem egy kérelemben (≤ 64;
        // a tartó azt veszi fel, ami a régióiba esik), a kísérőkkel; az osztódást feljegyzem.
        const { csoportok } = await felajanlasCsoportjai(false);
        const lista = [...csoportok.values()].flatMap((c) => c.bejegyzesek).slice(0, FELAJANLAS_KORLAT);
        if (!lista.length) { kiir('Nincs mit felajánlanom (nincs legalább két tulajdonosú gondolatom).'); break; }
        const kiserok = await bejegyzesekKiseroi(lista);
        const azonossag = await azonossagBeallitasa();
        const { kapu } = await keziKapuNyitasa((halo, t) => kerelemUdpResen(halo, t.cim, t.port, KOINO,
          { fajta: 'felajanlas', kulcs: GYOKER_KULCS, bejegyzesek: lista, kiserok }, { ...azonossag }));
        let kor;
        try {
          kor = await kapu.kopog([{ cim: ervek[1], port: Number(ervek[2]) }], { idokorlat: KEZI_KOPOGAS_MS });
        } finally {
          kapu.zar();
        }
        const siker = kor.eredmenyek.find((e) => e.ok && e.eredmeny?.felajanlas);
        if (!siker) {
          const kesobb = kor.eredmenyek.find((e) => e.ok && e.eredmeny?.kesobb);
          kiir(kesobb ? SZIN.halvany + '⏸ A tartó most nem szolgál ki (a kiszolgálási kerete betelt) — ' + kesobb.eredmeny.kesobb
            + ' mp múlva újra.' + SZIN.vege : SZIN.nem + 'A tartó nem vette át a felajánlást' + SZIN.vege);
          break;
        }
        const v = siker.eredmeny.felajanlas;
        await felajanlasEredmenye(lista, v);
        kiir('Felajánlva: ' + lista.length + ' bejegyzés (' + kiserok.length + ' tagsági kísérővel) → ' + ervek[1] + ':' + ervek[2]);
        kiir('  ' + SZIN.jo + v.felvett + ' felvett' + SZIN.vege + ' (' + v.fuggo + ' függő) · ' + v.megvolt + ' már megvolt · '
          + v.elutasitott + ' elutasítva (nem a régiójába esik, vagy hibás)'
          + (v.osztodott.length ? ' · ' + SZIN.vastag + v.osztodott.length + ' fiók osztódott' + SZIN.vege + ' ('
            + v.osztodott.map((o) => o.k + '→' + o.s).join(', ') + ') — a következő felajánlás a mélyebb darabba viszi' : ''));
        break;
      }
      if (al === 'felajanl' && !fajlNeve) {
        // ⭐ D107 L4 (④c): AUTOMATIKUSAN — a régiók tartóit a DHT-n keresem, és függő kérelmeket veszek fel (az őrjárat viszi).
        const kliens = await tablaKliens();
        let r;
        try {
          r = await felajanlasKor(kliens);
          const kp = await kapuPortja();
          if (kp) {
            for (const k of fuggoKopogtatok(await kerelmekOlvasasa())) {
              try { await kliens.bejelent(kopogtatoTemaBuffer(k), kp); } catch { /* segédeszköz */ }
            }
          }
          await dhtIsmertekMentese(kliens);
        } finally {
          kliens.bezar();
        }
        kiir('Felajánlás: ' + r.regiok + ' régió, ' + r.celok + ' tartó a DHT-n' + SZIN.halvany
          + ' — függő kérelmekként; az őrjárat a következő buliban viszi (az állás: node koino/koino.js kerelem)' + SZIN.vege);
        break;
      }
      if (al === 'felajanl') {
        if (!fajlNeve) throw new Error('Hova írjam? node koino/koino.js kereso felajanl <fájl>');
        const { allapot } = await kepetKeszit();
        const lista = await sajatBejegyzesek(allapot);
        const f = await sorokba(lista, sajatTippForras);
        await writeFile(fajlNeve, f.szoveg, 'utf8');
        kiir('A gondolataim ' + lista.length + ' bejegyzése (a legalább két tulajdonosúaké, a cím minden kulcsa alatt; ' + f.kiserok
          + ' tagsági kísérővel): ' + fajlNeve + SZIN.halvany + ' — a kereső tartói `kereso behoz`-zal veszik fel' + SZIN.vege);
        break;
      }
      if (al === 'behoz') {
        if (!fajlNeve) throw new Error('Honnan hozzam? node koino/koino.js kereso behoz <fájl>');
        const sorok = (await readFile(fajlNeve, 'utf8')).split('\n').filter((x) => x.trim());
        let uj = 0, megvolt = 0, fuggo = 0;
        const elutasitva = [];
        const bejegyzesek = [];
        const kiserok = [];
        const tippSorok = [];
        for (const [i, sor] of sorok.entries()) {
          let j;
          try { j = JSON.parse(sor); } catch { elutasitva.push({ sor: i + 1, ok: 'nem értelmezhető' }); continue; }
          if (j && typeof j === 'object' && j.kisero && typeof j.kisero === 'object') kiserok.push(j.kisero);
          else if (j && typeof j === 'object' && j.tipp && typeof j.tipp === 'object') tippSorok.push(j.tipp);
          else bejegyzesek.push({ sor: i + 1, b: j });
        }
        // ⭐ ④b: előbb a tagsági kísérők — CSAK a lánc-típusú események és a tagsági csomagok, ugyanazon a kapun (a tartós tárba;
        // a koinó állapotában gondolat nem lesz belőlük).
        const kiseroBe = kiserok.filter((e) => e.koino === KOINO && (e.tipus === TAGSAGI_CSOMAG || LANC_TIPUSOK.has(e.tipus)));
        const k = kiseroBe.length ? await beolvasztas(tar, kiseroBe, KOINO) : { uj: 0 };
        for (const x of bejegyzesek) {
          const r = await bejegyzesBefogadasa(keresoTar, x.b);
          if (r.uj) { uj++; if (r.fuggo) fuggo++; }
          else if (r.azonosito) megvolt++;
          else elutasitva.push({ sor: x.sor, ok: r.ok });
        }
        const emelt = await keresoTar.fuggokFrissitese();
        // ⭐ D111: a tartó-tippek — csak a nálam lévő gondolatokhoz (puha, ellenőrizetlen tipp).
        const nalam = new Set(keresoTar.bejegyzesek().map((b) => b.g));
        for (const t of tippSorok.slice(0, 4096)) if (typeof t.g === 'string' && nalam.has(t.g)) await keresoTar.tippFeljegyzese(t.g, t.t);
        kiir('Behozva a kereső-tárba: ' + fajlNeve);
        kiir('  ' + SZIN.jo + uj + ' új bejegyzés' + SZIN.vege + ' · ' + megvolt + ' már megvolt (vagy van frissebb) · '
          + kiserok.length + ' tagsági kísérő (' + k.uj + ' új esemény) · ' + sorok.length + ' sor a fájlban');
        if (fuggo - emelt > 0 || emelt) {
          kiir(SZIN.halvany + '  ' + Math.max(0, fuggo - emelt) + ' függő (a szerzők tagsága még nem ellenőrzött — K3)'
            + (emelt ? ' · ' + emelt + ' az indexbe emelve' : '') + SZIN.vege);
        }
        if (elutasitva.length) {
          kiir(SZIN.nem + '  ' + elutasitva.length + ' bejegyzés ELUTASÍTVA:' + SZIN.vege);
          for (const el of elutasitva.slice(0, 5)) kiir(SZIN.halvany + '    ' + el.sor + '. sor: ' + el.ok + SZIN.vege);
        }
        break;
      }
      if (al === 'keres') {
        // ⭐⭐ A kereső-réteg ⑤: A KÉRDÉS — `kereso keres "<kérdés>" [cím port]` (cím nélkül a DHT-n keresem a tartókat).
        const kerdes = ervek[1];
        if (!kerdes || !kerdesTerve(kerdes).length) throw new Error('Mit keressek? node koino/koino.js kereso keres "<legalább 3 betűs szó>" [cím port]');
        const r = await kereses(kerdes, ervek[2] && Number.isInteger(Number(ervek[3])) ? { cim: ervek[2], port: Number(ervek[3]) } : {});
        kiir(SZIN.vastag + 'KERESÉS a hálózaton: „' + kerdes + '”' + SZIN.vege + SZIN.halvany + ' — ' + r.kerdezett + ' tartót kérdeztem, '
          + r.valaszolt + ' válaszolt' + (r.minta ? ' · a fiók osztódott: a válasz MINTA (K7)' : '') + SZIN.vege);
        for (const t of r.talalatok) {
          kiir('  ' + rovidAzonosito(t.g) + '  ' + t.cim + (t.cimForrasa === 'javaslat' ? SZIN.halvany + '  (javasolt cím — K9)' + SZIN.vege : '')
            + (t.tippek?.length ? SZIN.halvany + '  · ' + t.tippek.length + ' tartó-tipp (a részletei a kopogtatással jönnek)' + SZIN.vege : ''));
        }
        kiir((r.talalatok.length ? SZIN.jo + r.talalatok.length + ' találat' + SZIN.vege : SZIN.halvany + 'nincs találat' + SZIN.vege)
          + (r.tagsagNelkul ? SZIN.halvany + ' · ' + r.tagsagNelkul + ' kihagyva: a szerzők tagsága nem ellenőrizhető (K3)' + SZIN.vege : '')
          + SZIN.halvany + ' — a találatok az átmeneti tárban (a kártya megnyitható)' + SZIN.vege);
        break;
      }
      if (al) throw new Error('Mit tegyek? node koino/koino.js kereso [felajanl [<fájl> | <cím> <port>] | keres "<kérdés>" [cím port] | behoz <fájl> | kivisz <fájl>]');
      const r = await keresoRegioim();
      const kb = (x) => (x / 1024).toFixed(1).replace('.', ',') + ' KB';
      await keresoTar.fuggokFrissitese();
      const fuggoDb = keresoTar.fuggoDarab();
      kiir(SZIN.vastag + 'KERESŐ-TÁR: ' + keresoTar.darab() + ' bejegyzés (' + (keresoTar.darab() - fuggoDb) + ' az indexben'
        + (fuggoDb ? ' · ' + fuggoDb + ' függő — a szerzők tagsága még nem ellenőrzött' : '') + '), ' + kb(keresoTar.meret())
        + SZIN.vege + SZIN.halvany
        + ' (a korlát ' + Math.round(KERESO_KORLAT / 1024 / 1024) + ' MB; puha állapot — a koinó állapotába nem számít)' + SZIN.vege);
      kiir('  a régióim (' + r.melyseg + '. mélység' + (r.tanult && r.melyseg > r.sajat
        ? ' — a társaimtól tanulva (' + r.tanult.tarsak + ' friss társ mediánja ' + r.tanult.median + '; a saját becslésem '
          + r.sajat + ')' : '') + '; a saját becslés ~' + r.becsles + ' bejegyzés a koinóban):');
      for (const g of r.regiok) {
        kiir('    ' + g.melyseg + ':' + g.darab.toString(16) + ' — ' + keresoTar.regioHalmaza(g.melyseg, g.darab).length + ' bejegyzés');
      }
      kiir(SZIN.halvany + '  a régió tartói a cserében egyeztetnek (a közös régiójukat); ⏸ a felajánlás ma a kézi úton megy'
        + ' (kereso felajanl → kereso behoz), a hirdetés és a raj a ③c-ben' + SZIN.vege);
      break;
    }

    case 'kiszolgalas': {
      // ===== ⭐ D83/2: A KÉSZÜLÉKENKÉNTI KISZOLGÁLÁS — „mindent” vagy az alap (helyi beállítás, nem esemény) =====
      // node koino/koino.js kiszolgalas [mindent|alap]
      // ⭐ D95/1: a „mindent” beállítású készülék a nagy szeleteket is EGÉSZÉBEN tartja (ő az önkéntes, aki a többinek
      // összegzi őket); az alap a küszöb fölött összegezve tart.
      // ⭐ D109 (⑤): `kiszolgalas keret <MB> <kérés>` — a kiszolgálási keret óránként (a „mindent” / alap kiinduló száma
      // helyett); `kiszolgalas keret alap` — vissza a kiinduló számra.
      const regiBeallitas = await kiszolgalasBeallitas();
      const iras = async (j) => {
        await mkdir(dirname(kiszolgalasFajl()), { recursive: true });
        await writeFile(kiszolgalasFajl(), JSON.stringify(j), 'utf8');
      };
      if (ervek[0] === 'mindent' || ervek[0] === 'alap') {
        await iras({ mindent: ervek[0] === 'mindent', ...(regiBeallitas.keret ? { keret: regiBeallitas.keret } : {}) });
      } else if (ervek[0] === 'keret') {
        if (ervek[1] === 'alap') {
          await iras({ mindent: regiBeallitas.mindent });
        } else {
          const mb = Number.parseFloat(String(ervek[1] ?? '').replace(',', '.'));
          const keres = Number.parseInt(ervek[2] ?? '', 10);
          if (!(mb > 0) || !(keres > 0)) throw new Error('Mekkora legyen a keret? node koino/koino.js kiszolgalas keret <MB> <kérés> (óránként) — vagy: keret alap');
          await iras({ mindent: regiBeallitas.mindent, keret: { bajt: Math.round(mb * 1024 * 1024), keres } });
        }
      } else if (ervek[0]) {
        throw new Error('Mit állítsak? node koino/koino.js kiszolgalas [mindent|alap|keret <MB> <kérés>|keret alap]');
      }
      const b = await kiszolgalasBeallitas();
      kiir('Kiszolgálás: ' + (b.mindent ? SZIN.jo + '„mindent”' + SZIN.vege
        + SZIN.halvany + ' — a nagy szeleteket is egészében tartom, és a lezárt döntéseikről összegzést adok' + SZIN.vege
        : 'alap' + SZIN.halvany + ' — csak abban veszek részt, amit vállalok (a szigorú (b)); a ' + KETFOK.kuszob
          + ' eseménynél nagyobb vállalt szeletet összegezve tartom' + SZIN.vege));
      const h = await kiszolgalasiKeretHatara();
      const mbSzoveg = (x) => (x / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
      kiir('A kiszolgálási keret: óránként ' + mbSzoveg(h.bajt) + ' és ' + h.keres + ' kérés' + SZIN.halvany
        + (b.keret ? ' (saját beállítás)' : ' (a kiinduló szám)') + ' — egy társ legfeljebb a negyedét, az idegenek együtt legfeljebb'
        + ' a felét vihetik; a kötéseim cseréje nem kerül alá (D109)' + SZIN.vege);
      try {
        const a = JSON.parse(await readFile(keretFajl(), 'utf8'));
        const kor = Math.round((Date.now() - (a.ido ?? 0)) / 60000);
        kiir(SZIN.halvany + '  az elmúlt órában (' + (kor < 1 ? 'most' : kor + ' perce') + ' írva): mások ' + mbSzoveg(a.osszes?.bajt ?? 0)
          + ' és ' + (a.osszes?.keres ?? 0) + ' kérés (ebből idegen ' + mbSzoveg(a.idegen?.bajt ?? 0) + ', ' + (a.idegen?.keres ?? 0)
          + ' kérés) · a kötéseim ' + mbSzoveg(a.kotes?.bajt ?? 0) + ', ' + (a.kotes?.keres ?? 0) + ' kérés' + SZIN.vege);
      } catch {
        kiir(SZIN.halvany + '  (még nincs feljegyzés — a kiszolgálást az őrjárat vagy a postaláda könyveli)' + SZIN.vege);
      }
      break;
    }

    case 'osszegzes': {
      // ===== ⭐ D95/1: A LEZÁRÁSI ÖSSZEGZÉSEK — kiadás (a nagy szelet teljes tartójaként) és a kapott, ellenőrzöttek =====
      // node koino/koino.js osszegzes
      // Az őrjárat magától kiadja; ezzel kézzel is (ismételhető: érintettenként egyszer ad).
      const db = await lezarasiOsszegzesekKiadasa();
      const t = await osszegzesTarolo(KOINO).olvas();
      const kapott = Object.entries(t.lezarasok);
      kiir((db ? SZIN.jo : SZIN.halvany) + db + ' új lezárási összegzés kiadva' + SZIN.vege
        + SZIN.halvany + ' · ' + kapott.length + ' ellenőrzött összegzés a tárolóban' + SZIN.vege);
      for (const [k, x] of kapott) {
        const [j, e] = k.split('|');
        kiir('  ' + SZIN.halvany + j.slice(0, 8) + '… → ' + e.slice(0, 8) + '…' + SZIN.vege + '  '
          + (x.allas?.kuszobTeljesul ? SZIN.jo + 'teljesült' : SZIN.nem + 'nem teljesült') + SZIN.vege
          + SZIN.halvany + ' · ' + (x.osszegzes?.szamok?.tamogatok ?? '?') + ' támogató, '
          + (x.osszegzes?.szamok?.ellenzok ?? '?') + ' ellenző · lezárva ' + new Date(x.osszegzes?.lezaras ?? 0)
            .toLocaleString('hu-HU') + SZIN.vege);
      }
      break;
    }

    // ⭐⭐ D82: A KÉZI ÉSZLELÉS — a TÁR MINDEN eseménye körül (a kézi út párja az automatikusnak).
    case 'ellenoriz': {
      const osszes = (await koinoEsemenyei(tar, KOINO)).map((x) => x.azonosito);
      const e = await eszlelesEsBejelentes(osszes);
      kiir('Ellenőrizve: ' + osszes.length + ' esemény · ' + e.leletek + ' bizonyítható ellentmondás · '
        + e.bejelentve + ' új bejelentés · ' + e.marVolt + ' már be volt jelentve'
        + (e.nincsHorgony ? ' · ' + e.nincsHorgony + ' vádoltnak nincs nálunk horgonya' : ''));
      // ⭐ D98/2–3: a lánc-ellenőrzés állása (a cserében kérdeztük a szerzőket). ⚠️ A függés NEM vád (D19): a szerző
      // még nem igazolta (nem találkoztunk, vagy nem felelt) — ami ellentmondott, az már bejelentés lett.
      const lancok = await lancEllenorzesAllasa(lancEllenorzesTarolo(KOINO));
      if (lancok.length) {
        const fuggok = lancok.filter((x) => x.fuggoOta !== null);
        const legregebbi = fuggok.length ? Math.min(...fuggok.map((x) => x.fuggoOta)) : null;
        kiir('Lánc-ellenőrzés (D98): ' + lancok.filter((x) => x.ellenorzott !== null && x.fuggoOta === null).length
          + ' szerző lánca ellenőrizve · ' + fuggok.length + ' függőben'
          + (legregebbi ? SZIN.halvany + ' (a legrégebbi ' + Math.floor((Date.now() - legregebbi) / 86400000)
            + ' napja — nem vád: még nem igazolta)' + SZIN.vege : ''));
      }
      break;
    }

    case 'behoz': {
      const honnan = ervek[0];
      if (!honnan) throw new Error('Honnan hozzam? node koino/koino.js behoz <fájl>');

      const szoveg = await readFile(honnan, 'utf8');
      const e = await behozatalSzovegbol(tar, KOINO, szoveg, {
        // ⭐ D72: a szöveg-darabok a fájl-tárba (a lenyomatuk ellenőrzése után).
        darabIr: (bajtok) => fajlBlobTarolo(KOINO).ir(bajtok)
      });

      kiir('Behozva: ' + honnan);
      // ⭐ D82: a kézi úton jöttek környékén is keresünk (ugyanaz, mint a csere után).
      if (e.uj > 0) await eszlelesEsBejelentes(e.ujAzonositok);
      kiir('  ' + SZIN.jo + e.uj + ' új esemény' + SZIN.vege
        + ' · ' + e.marMegvolt + ' már megvolt · ' + e.szovegDarabok + ' szöveg-darab · '
        + e.sorok + ' sor a fájlban');
      if (e.hibasDarabok?.length) {
        kiir(SZIN.nem + '  ' + e.hibasDarabok.length + ' szöveg-darab NEM az, aminek a neve mondja'
          + ' — kihagyva' + SZIN.vege);
      }

      // ⭐⭐ ÉS AMIT NEM HALLGATUNK EL (D19). Mind a négy lista MEGNEVEZI, mi történt —
      // különben a „behozva" szó elfedné, hogy a fájl fele ki sem nyílt.
      if (e.idegen > 0) {
        kiir(SZIN.nem + '  ' + e.idegen + ' esemény MÁSIK koinóé — kihagyva.' + SZIN.vege);
      }
      if (e.hibasSorok.length > 0) {
        kiir(SZIN.nem + '  ' + e.hibasSorok.length + ' sor nem volt értelmezhető:' + SZIN.vege);
        for (const h of e.hibasSorok.slice(0, 5)) {
          kiir(SZIN.halvany + '    ' + h.sorszam + '. sor: ' + h.eleje + '…' + SZIN.vege);
        }
      }
      if (e.elutasitva.length > 0) {
        kiir(SZIN.nem + '  ' + e.elutasitva.length + ' esemény ELUTASÍTVA a kapunál:' + SZIN.vege);
        for (const el of e.elutasitva.slice(0, 5)) {
          kiir(SZIN.halvany + '    ' + rovidAzonosito(el.azonosito) + ': ' + el.ok + SZIN.vege);
        }
      }
      // ⚠️ AZ ELÁGAZÁS NEM HIBA, HANEM BIZONYÍTÉK (D17/D19): valaki két eseményt írt alá
      // ugyanarról a pontról. Mindkettő bent marad — együtt ők a bizonyíték.
      if (e.elagazasok.length > 0) {
        kiir(SZIN.nem + '  ⚠️ ' + e.elagazasok.length
          + ' ELÁGAZÁS derült ki (valaki két eseményt írt alá ugyanarról a pontról):' + SZIN.vege);
        for (const ag of e.elagazasok.slice(0, 5)) {
          kiir(SZIN.halvany + '    ' + rovidAzonosito(ag.szerzo)
            + ' · ' + ag.sorszam + '. esemény' + SZIN.vege);
        }
      }
      break;
    }

    case 'koino': {
      const nev = ervek[0];
      if (!nev) throw new Error('Mi legyen a koino neve?');
      // ⭐ D89/2: alapból ZÁRT; a nyílthoz ki kell mondani: koino "név" [leírás] nyilt
      const tobbi = ervek.slice(1);
      const nyilt = tobbi.includes('nyilt');
      // ⭐ D93/5: profil=nev,telepules — a koinó kötelező profil-mezői (a meghívás csak a profil lenyomatával érvényes).
      const profilErv = tobbi.find((x) => x.startsWith('profil='));
      const profil = profilErv ? profilErv.slice(7).split(',').map((m) => m.trim()).filter(Boolean) : [];
      await koinoLetrehozasa(kornyezet, nev, tobbi.find((x) => x !== 'nyilt' && !x.startsWith('profil=')), undefined,
        { zart: !nyilt, profil });
      if (profil.length) kiir(SZIN.halvany + 'Kötelező profil-mezők: ' + profil.join(', ') + ' (a meghívó tanúsítja — D28/2)' + SZIN.vege);
      kiir('A koino létrejött: ' + nev + (nyilt ? ' (NYÍLT — bárki olvashatja, aki eljut egy tagjához)'
        : ' (ZÁRT — a tartalmát csak tagnak adjuk ki; a betartatás az identitás-lépéssel jön)'));
      break;
    }

    // ===================================
    // ⭐ A BELÉPŐ TÉR (5.6) — a koinók, amiket ez a készülék ismer
    // ===================================
    //
    // ⭐ A 4. SZABÁLY: a parancs a funkcióval EGYÜTT jön, nem utána. Kétszer is megtörtént
    // már (2026-09-10, 09-12), hogy egy megépült réteghez nem vezetett kézi út.

    // ===================================
    // ⭐ MELY FÁJLOK HIÁNYOZNAK? (5.7 / a szállítás első fele)
    // ===================================
    //
    // ⭐ A 4. SZABÁLY: a parancs a funkcióval EGYÜTT jön. És itt külön haszna is van —
    // *ez az egyetlen hely, ahol ma LÁTNI lehet, mi hiányzik a készülékről.*

    // ===== ⭐⭐⭐ A HIRDETŐTÁBLA KÉZI ÚTJA (2026-09-20, 4. szabály) =====
    //
    // ⛔ MIÉRT KELL KÉZI ÚT: *„minden automatikus cseréhez tartozzon kézi út"* — enélkül a
    // tábla egy doboz lenne, amibe nem látunk bele. ⭐ Így megnézhető, mi van a rekeszben,
    // és kiírható a cím akkor is, ha az őrjárat épp nem fut.
    case 'tabla': {
      const mit = (ervek[0] ?? 'allapot').toLowerCase();
      const kulcs = await tablaKulcsBiztositasa();
      const kotesTar = kotesTarolo();
      const jegyzek = await kotesTar.olvas();

      kiir(SZIN.vastag + 'A HIRDETŐTÁBLA' + SZIN.vege + SZIN.halvany
        + '   (a rekeszem neve: ' + kulcs.alairoNyilvanos.slice(0, 12) + '… — ⛔ NEM az'
        + ' azonosságod)' + SZIN.vege);
      kiir(SZIN.halvany + '  ' + jegyzek.length + ' kötés a jegyzékben' + SZIN.vege);
      kiir();

      if (mit === 'kiir') {
        // A címet a hívó adja meg, vagy a saját friss jegyzékünkből vesszük.
        const hoszt = ervek[1];
        const port = parseInt(ervek[2], 10);
        let cim = hoszt && Number.isInteger(port) ? { hoszt, port } : null;
        if (!cim) {
          const frissek = await frissUdpCimek(udpCimTarolo());
          cim = frissek.length ? { hoszt: frissek[0].hoszt, port: frissek[0].port } : null;
        }
        if (!cim) {
          kiir(SZIN.nem + '⚠ Nincs mit kiírni: nem tudom a külső UDP-címemet.' + SZIN.vege);
          kiir(SZIN.halvany + '  Fúrj egyet (`pajzsfuro`), vagy add meg kézzel:'
            + ' tabla kiir <cím> <port>' + SZIN.vege);
          break;
        }
        kiir(SZIN.halvany + '  Kiírom: ' + cim.hoszt + ':' + cim.port + SZIN.vege);
        const e = await tablaraKiiras(kulcs, jegyzek, cim, (esemeny) => {
          if (esemeny.mi === 'KIIRVA') {
            kiir(SZIN.jo + '  ✓ ' + esemeny.tars + '… rekeszébe ('
              + esemeny.tarolta + ' tároló gép)' + SZIN.vege);
          }
          if (esemeny.mi === 'KIIRAS-BUKOTT') {
            kiir(SZIN.nem + '  ✗ ' + esemeny.tars + '…: ' + esemeny.ok + SZIN.vege);
          }
        });
        kiir();
        kiir(e.kiirt ? SZIN.jo + '⭐ ' + e.kiirt + ' rekeszbe kiírva' + SZIN.vege
          : SZIN.nem + '⚠ Egyetlen rekeszbe sem sikerült kiírni' + SZIN.vege);
        break;
      }

      if (mit === 'olvas') {
        if (!jegyzek.length) {
          kiir(SZIN.halvany + 'Nincs kötésem — nincs kinek a rekeszét megnézni.' + SZIN.vege);
          kiir(SZIN.halvany + 'A kötés a bulin születik: `orjarat`.' + SZIN.vege);
          break;
        }
        const talaltak = await tablarolOlvasas(kulcs, kotesLista(jegyzek, 5), (esemeny) => {
          if (esemeny.mi === 'MEGVAN-A-TABLAN') {
            kiir(SZIN.jo + '  ⭐ ' + esemeny.tars + '… → ' + esemeny.hoszt + ':'
              + esemeny.port + SZIN.vege);
          }
          if (esemeny.mi === 'NINCS-A-TABLAN') {
            kiir(SZIN.halvany + '  · ' + esemeny.tars + '… nincs a táblán (nem írt ki'
              + ' semmit, vagy már elévült — ' + esemeny.valasz + ' DHT-gép felelt)' + SZIN.vege);
          }
          if (esemeny.mi === 'TABLA-NEM-ELERHETO') {
            kiir(SZIN.nem + '  ✗ ' + esemeny.tars + '…: a tábla NEM ÉRHETŐ EL ('
              + esemeny.kerdes + ' kérdés, egyik DHT-gép sem felelt) — nem tudom, kint'
              + ' van-e' + SZIN.vege);
          }
          if (esemeny.mi === 'OLVASAS-BUKOTT') {
            kiir(SZIN.nem + '  ✗ ' + esemeny.tars + '…: az olvasás elbukott ('
              + esemeny.ok + ')' + SZIN.vege);
          }
          if (esemeny.mi === 'OLVASHATATLAN') {
            kiir(SZIN.nem + '  ✗ ' + esemeny.tars + '… bejegyzése nem bontható ki'
              + SZIN.vege);
          }
        });
        kiir();
        kiir(SZIN.halvany + talaltak.length + ' társ címe jött meg a tábláról' + SZIN.vege);
        break;
      }

      // ===== `tabla` (állapot) =====
      for (const k of kotesLista(jegyzek, 5)) {
        const kor = Math.round((Date.now() - (k.utoljara ?? 0)) / 1000);
        // ⭐ A kötés ÖSSZES ismert címe (D71 (ii)) — a legutóbbi elöl: terepen ebből látszik, hogy
        // a gép tudja-e, hogy a helyi és a nyilvános út ugyanaz a társ.
        const cimek = kotesCimei(k).map((c) => c.hoszt + ':' + c.port);
        kiir('  ' + k.alairo.slice(0, 12) + '…' + SZIN.halvany
          + '  ' + (cimek.length ? cimek.join(' · ') : '?')
          + ' · ' + k.talalkozasok + ' találkozás · ' + kor + ' mp-e hallottam'
          + SZIN.vege);
      }
      if (!jegyzek.length) {
        kiir(SZIN.halvany + '  (még nincs kötés — a bulin születik: `orjarat`)' + SZIN.vege);
      }
      kiir();
      kiir(SZIN.halvany + 'Kiírás:  node koino/koino.js tabla kiir [cím] [port]' + SZIN.vege);
      kiir(SZIN.halvany + 'Olvasás: node koino/koino.js tabla olvas' + SZIN.vege);
      break;
    }

    case 'fajlok': {
      const { allapot, javaslatok } = await kepetKeszit();
      const blob = fajlBlobTarolo(KOINO);
      const { hianyzok: nyersHianyzok, megvan, osszes } = await fajlIgenyek(allapot,
        (l) => blob.van(l), { szerzo, javaslatok, szovegOlvas: szovegOlvasoKeszites(blob) });

      // ⭐ A RITKÁBBAT ELŐBB (Csaba döntése) — és a `birtokosok` szám innentől látszik is.
      const jegyzet = await fajlJegyzekTarolo(KOINO).olvas();
      const hianyzok = ritkasagSzerint(nyersHianyzok, jegyzet);

      kiir(SZIN.vastag + 'FÁJLOK' + SZIN.vege
        + '  (' + megvan + ' / ' + osszes + ' megvan)');

      if (!osszes) {
        kiir(SZIN.halvany + '  Ebben a koinóban még nincs kép vagy fájl.' + SZIN.vege);
        break;
      }
      if (!hianyzok.length) {
        kiir(SZIN.jo + '  Minden hivatkozott fájl megvan ezen a készüléken.' + SZIN.vege);
        break;
      }

      kiir();
      kiir(SZIN.nem + '  ' + hianyzok.length + ' fájl hiányzik:' + SZIN.vege);
      for (const h of hianyzok) {
        // ⭐ A TUDATPONT TÁROLÁSI VÁLLALÁS IS (D3): amire pontot tettem, az az ÉN dolgom.
        const jel = h.vallaltam ? SZIN.nem + '!' : SZIN.halvany + '·';
        const cimek = h.entitasok
          .map((a) => allapot.entitasok.get(a)?.cim ?? a.slice(0, 8))
          .join(', ');
        // ⭐ KITŐL LEHET KÉRNI? — amit a bulikon tanultunk (helyi feljegyzés, 3. szabály).
        // ⚠️ A NULLA NEM VÁD, hanem hiány: lehet, hogy csak még nem kérdeztünk rá senkitől.
        const hol = h.birtokosok > 0
          ? SZIN.jo + h.birtokosok + ' társnál megvan' + SZIN.vege
          : SZIN.halvany + 'még nem tudom, kinél van meg' + SZIN.vege;
        kiir('  ' + jel + SZIN.vege + ' ' + h.lenyomat.slice(0, 12) + '…'
          + SZIN.halvany + '  ' + cimek + SZIN.vege + '  — ' + hol);
      }
      kiir();
      kiir(SZIN.halvany
        + '  ! = tudatpontot tettél rá, tehát VÁLLALTAD a tárolását (D3)' + SZIN.vege);
      // ⚠️ A HIÁNY NEM HIBA (D19) — megmondjuk azt is, miért van, és mi lesz vele.
      //
      // ⛔ EZ A SZÖVEG 2026-09-15-IG HAZUDOTT: azt írta, hogy *„a bájtok szállítása még nem
      // épült meg"* — pedig 2026-09-13 óta megvan (felderítés → kérelem → átvitel →
      // randevú), és az őrjárat azóta magától is elhozza. *Ugyanaz a csapda, amit az
      // `Allaspont`-nál kimondtunk: ahol egy felirat mást mond, mint amit a kód tesz, ott
      // előbb-utóbb valaki a feliratot hiszi el.*
      kiir(SZIN.halvany
        + '  A bájtok a következő bulikon megérkeznek (a felderítés egy körrel előbb jár),'
        + SZIN.vege);
      kiir(SZIN.halvany
        + '  vagy magától: node koino/koino.js orjarat.  Kézi út: a koino-adat/' + KOINO
        + '/fajlok/ mappa másolása.' + SZIN.vege);
      break;
    }

    case 'ter': {
      const { kartyak, koinok, csakAmitIsmerunk } = await terKartyai(alapHely(), {
        szerzo,
        rendezes: ervek[0] || undefined,
        irany: ervek[1] || undefined
      });

      kiir(SZIN.vastag + 'A BELÉPŐ TÉR' + SZIN.vege + '  (' + koinok + ' koino)');

      // ⛔⛔ A HATÁR KIMONDVA (D19). A kereső-réteg nélkül ez nem a világ összes koinója —
      // és a hallgatás itt teljességet ígérne, amit nem tudunk tartani.
      if (csakAmitIsmerunk) {
        kiir(SZIN.halvany
          + 'Csak amit EZ A KÉSZÜLÉK ismer — idegen koinók böngészéséhez kereső-réteg kell.'
          + SZIN.vege);
      }
      kiir();

      for (const k of kartyak) {
        // ⚠️ A név hiányozhat: ha az eseményeket fájlból hoztam be, lehet, hogy a koino
        // gondolatait ismerem, a SZÜLETÉSÉT nem. Nem találunk ki nevet (D19).
        const nev = k.nev ?? SZIN.halvany + '(nem ismerem a születését)' + SZIN.vege;
        const jel = k.enTagVagyok ? SZIN.jo + '✔' : SZIN.halvany + '·';
        kiir('  ' + jel + SZIN.vege + ' ' + nev
          + SZIN.halvany + '   [' + k.azonosito + ']' + SZIN.vege);

        // ⭐⭐ HÁROM SZÁM, NEM EGY — a létszám SÚLYA a különbségükben van. Egy koino, ahol
        // 900-an beléptek, de csak 12-nek van visszavezethető meghívási lánca, ránézésre
        // más, mint ahol 900-ból 900.
        let sor = '      ' + k.tagok + ' tag';
        if (k.nemEllenorizhetok > 0) sor += ' · ' + k.nemEllenorizhetok + ' nem ellenőrizhető';
        sor += ' · ' + k.belepok + ' belépő · ' + k.esemenyek + ' esemény';
        kiir(SZIN.halvany + sor + SZIN.vege);

        if (k.letrehozva) {
          kiir(SZIN.halvany + '      létrehozva: ' + new Date(k.letrehozva).toLocaleString('hu-HU')
            + ' (a szerző órája)' + SZIN.vege);
        }
        if (!k.enTagVagyok) {
          kiir(SZIN.halvany + '      ' + k.miert + SZIN.vege);
        }
      }

      if (koinok === 0) {
        kiir(SZIN.halvany + '  Még egy koinót sem ismersz. Indíts egyet: koino <név>'
          + SZIN.vege);
      }
      break;
    }

    // ===================================
    // KATEGÓRIA ÉS GONDOLATTÍPUS (5.4)
    // ===================================
    //
    // ⭐ A 4. SZABÁLY: amit a lapon meg lehet csinálni, azt a parancssorból is. Ha a
    // böngésző egyszer nem elérhető, a koino ettől még teljes.
    case 'kategoria':
    case 'gondolattipus': {
      const [nev, ikon, leiras] = ervek;
      if (!nev) throw new Error('Mi legyen a neve?');

      const kategoriaE = parancs === 'kategoria';
      const esemeny = await (kategoriaE ? kategoriaLetrehozasa : gondolatTipusLetrehozasa)(
        kornyezet, { nev, ikon, leiras });

      // ⭐ Tudatpont nélkül ez sem létezne (D14) — ugyanaz a szabály, mint a gondolatnál.
      const { allapot } = await kepetKeszit();
      await tudatpontRendezese(kornyezet, esemeny.azonosito, KEZDO_PONT, 'aktiv',
        szetosztottPontok(allapot, szerzo));

      kiir((kategoriaE ? 'Kategória' : 'Gondolattípus') + ' létrejött: '
        + esemeny.azonosito.slice(0, 8) + '  ' + (ikon ? ikon + ' ' : '') + '„' + nev + '"');
      kiir(SZIN.halvany + 'Az ikon lehet emoji vagy kép-cím; mindkettőt kezeli a kártya.'
        + SZIN.vege);
      break;
    }

    case 'gondolat': {
      const [cim, szoveg, tipusToredek, ...kategoriaToredekek] = ervek;
      if (!cim) throw new Error('Mi legyen a gondolat címe?');

      // ⭐ A besorolás elhagyható, és rövidítéssel is megadható — mint minden azonosító.
      let gondolatTipus = null;
      const kategoriak = [];
      if (tipusToredek || kategoriaToredekek.length) {
        const { allapot: kep } = await kepetKeszit();
        const besorolasok = [...kep.entitasok.values()]
          .filter((e) => e.tipus === 'Kategoria' || e.tipus === 'GondolatTipus')
          .map((e) => e.azonosito);

        if (tipusToredek) gondolatTipus = feloldas(tipusToredek, besorolasok);
        for (const t of kategoriaToredekek) kategoriak.push(feloldas(t, besorolasok));
      }

      const esemeny = await gondolatLetrehozasa(kornyezet,
        { cim, szoveg, gondolatTipus, kategoriak });
      // Rögtön tudatpontot is rendelünk hozzá — enélkül nem is létezne (D14)
      const { allapot } = await kepetKeszit();
      await tudatpontRendezese(kornyezet, esemeny.azonosito, KEZDO_PONT, 'aktiv',
        szetosztottPontok(allapot, szerzo));

      kiir('Létrejött: ' + esemeny.azonosito.slice(0, 8) + '  „' + cim + '"');
      kiir(SZIN.halvany + 'Kapott ' + KEZDO_PONT + ' tudatpontot tőled — enélkül a koino elfelejtené.' + SZIN.vege);
      break;
    }

    case 'pont': {
      const { allapot } = await kepetKeszit();
      const azonosito = feloldas(ervek[0] ?? '', allapot.entitasok.keys());
      const pont = parseInt(ervek[1], 10);
      if (!Number.isInteger(pont)) throw new Error('Hány tudatpontot rendelsz hozzá?');
      const szerep = ervek[2] === 'passziv' ? 'passziv' : 'aktiv';

      let masholt = 0;
      for (const e of allapot.entitasok.values()) {
        if (e.azonosito !== azonosito) masholt += e.hozzajarulok.get(szerzo)?.pont ?? 0;
      }
      await tudatpontRendezese(kornyezet, azonosito, pont, szerep, masholt);
      kiir(pont === 0
        ? 'Elvetted a tudatpontodat. Ha senki másnak nincs rajta, a gondolat eltűnik.'
        : 'Tudatpont beállítva: ' + pont + ' (' + szerep + ')');
      await tagsagFigyelmeztetes();   // ⭐ D93/1
      break;
    }

    // ⭐ HÁROM PARANCS, EGY ÚT. A `javaslat`, a `torol` és az `athelyez` ugyanazt teszi —
    // csak a MŰVELET más az érintetten. ⚠️ A 4. szabály miatt kell mindháromnak kézi út:
    // ami csak a felületről indítható, az fojtópont.
    // ⭐ A KÉZI ÚT a felszabadításhoz (4. szabály): ami magától megy, azt kézzel is
    // el lehessen indítani — és lássam, mi van még várakozáson.
    // ⭐ A KÜSZÖBÖK KÉZI ÚTJA (4. szabály). ⚠️ Ez eddig HIÁNYZOTT: az érték javaslatot
    // csak a felület tudta beadni (`POST /api/ertekJavaslat`) — vagyis a küszöb-állítás
    // böngésző-függő volt, pedig *„ha egy funkció csak online tud működni, az fojtópont"*.
    // A hiányra a felszabadítás próbája világított rá: rövid döntési időt akartam
    // beállítani, és nem volt mivel.
    case 'ertek': {
      const { allapot } = await kepetKeszit();
      const entitas = feloldas(ervek[0] ?? '', allapot.entitasok.keys());

      const szam = (ertek, nev) => {
        const n = Number(ertek);
        if (!Number.isInteger(n) || n < 0) throw new Error(nev + ': egész szám kell (kaptam: ' + ertek + ')');
        return n;
      };
      if (ervek.length < 5) {
        throw new Error('ertek <azonosító> <elfogadási%> <részvételi%> <min mp> <max mp>');
      }

      const ertekek = {
        elfogadasiKuszob: szam(ervek[1], 'elfogadási küszöb'),
        reszveteliKuszob: szam(ervek[2], 'részvételi küszöb'),
        minimumDontesiIdo: szam(ervek[3], 'minimum döntési idő'),
        maximumDontesiIdo: szam(ervek[4], 'maximum döntési idő')
      };
      if (ertekek.maximumDontesiIdo < ertekek.minimumDontesiIdo) {
        throw new Error('A maximum döntési idő nem lehet kisebb a minimumnál.');
      }

      await ertekJavaslat(kornyezet, entitas, ertekek);
      kiir('Érték javaslat beadva: ' + rovidAzonosito(entitas));
      kiir(SZIN.halvany + '⚠️ Ez JAVASLAT, nem parancs: az érvényes küszöb a tulajdonosok '
        + 'érték javaslatainak MEDIÁNJA (D4).' + SZIN.vege);
      break;
    }

    // ⭐⭐ ÁLLÁSFOGLALÁS egy ÁLTALÁNOS egyezményről (D27). A tény örök, a hatály él.
    case 'allast': {
      const { javaslatok } = await kepetKeszit();
      const egyezmeny = feloldas(ervek[0] ?? '', javaslatok.keys());
      const allas = (ervek[1] ?? '').toLowerCase();
      if (!['csatlakozik', 'tiltakozik', 'utkozik'].includes(allas)) {
        throw new Error('Milyen állás? csatlakozik | tiltakozik | utkozik');
      }
      const masik = allas === 'utkozik'
        ? feloldas(ervek[2] ?? '', javaslatok.keys())
        : null;

      await allasfoglalas(kornyezet, egyezmeny, allas, { masik, indoklas: ervek[3] ?? null });
      kiir('Állásfoglalás rögzítve: ' + allas + SZIN.halvany
        + ' (bármikor megváltoztathatod, az utolsó számít)' + SZIN.vege);
      kiir(SZIN.halvany + '⚠️ Ebből semmi nem következik automatikusan — csak LÁTSZIK, '
        + 'hányan állnak mögötte most.' + SZIN.vege);
      break;
    }

    case 'felszabadit': {
      // ⭐ A KÉZI ÚT TÜRELMETLENEBB LEHET, ÉS EZ SZÁNDÉKOS: az automata azért vár néhány
      // bulit, mert nem tudhatja, megérkezett-e már minden szavazat. Aki KIMONDJA, hogy
      // most, az tudja, mit vállal — ezért a buli-szám itt megadható (0 = azonnal).
      const kert = ervek[0] === undefined ? null : parseInt(ervek[0], 10);
      const kellBuli = kert === null || Number.isNaN(kert) ? MEGULEPEDES_BULIK : Math.max(0, kert);
      const felszabadult = await elakadtPontokFelszabaditasa(true, kellBuli);
      if (!felszabadult) {
        kiir(SZIN.halvany + 'Most nincs felszabadítható pont.'
          + (kert === null ? ' (Türelmetlenül: felszabadit 0)' : '') + SZIN.vege);
      }
      break;
    }

    // ===================================
    // ⭐⭐ A SZAKASZ 4 HÉT PARANCSA (2026-09-12) — a kézi út, 4. szabály
    // ===================================

    // ⭐ BELÉPÉS: megnyitom a saját azonosság-szeletemet. Ez még NEM tagság — csak annyit
    // mond: „ide szeretnék tartozni." A tagság ebből és a kapott meghívásokból SZÁMÍTÓDIK.
    case 'belep': {
      const meglevo = await sajatHorgonyom();
      if (meglevo) {
        kiir('Már van horgonyod ebben a koinóban: ' + meglevo.slice(0, 8));
        kiir(SZIN.halvany + 'A teljes azonosítója (ezt add meg annak, aki behív):' + SZIN.vege);
        kiir('  ' + meglevo);
        break;
      }
      // ⭐ Az alapító a `KoinoLetrehozas`-ára hivatkozik — ő a rekurzió alapesete (D56).
      const e = await belepes(kornyezet, ervek[0]);
      kiir('Beléptél — a horgonyod: ' + e.azonosito.slice(0, 8));
      kiir(SZIN.halvany + 'A teljes azonosítója (ezt add meg annak, aki behív):' + SZIN.vege);
      kiir('  ' + e.azonosito);
      kiir(SZIN.halvany + '⚠️ Ez még NEM tagság: ahhoz kell egy meghívás egy tagtól.' + SZIN.vege);
      break;
    }

    // ⭐ A NÉGY ÁLLÍTÁS MÁSRÓL — ugyanaz az alak (`allitokRola`), más a jelentés.
    // ⚠️ Mindegyik a MÁSIK szeletébe kerül, és hozza a saját horgonyomat.
    case 'meghiv':
    case 'felhatalmaz':
    case 'tanusit':
    case 'bemutatkoz':
    case 'visszavon': {
      const adatok = await allitasAdatai(ervek[0]);
      // ⭐ D93/5: a meghívás a meghívott profiljának lenyomatát is tanúsítja (ha a koinó profilt vár).
      if (parancs === 'meghiv') {
        const profil = await meghivottProfilja(adatok);
        if (profil) adatok.profil = profil;
      }

      const muvelet = {
        meghiv: meghivas,
        felhatalmaz: felhatalmazas,
        tanusit: tanusitas,
        bemutatkoz: bemutatkozas,
        visszavon: felhatalmazasVisszavonasa
      }[parancs];

      await muvelet(kornyezet, adatok);

      const mondat = {
        meghiv: 'Meghívtad — ezzel az 1. lépcsőn (tagság) segítetted át.',
        felhatalmaz: 'Rábíztad a tanúsítást (D60: MEGBÍZÁS, nem pontszám).',
        tanusit: 'Tanúsítottad: „létező, külön ember" — ez a 2. lépcső (pénztárca, D11).',
        bemutatkoz: 'Feljegyezted, hogy találkoztatok (D62: csak KÖLCSÖNÖSEN számít).',
        visszavon: 'Visszavontad a felhatalmazásodat — ez CSAK ELŐRE hat (D47).'
      }[parancs];
      kiir(mondat + ' (' + adatok.horgonya.slice(0, 8) + ')');

      if (parancs === 'tanusit') {
        kiir(SZIN.halvany + '⚠️ A tanúsítás állítás a MÚLTRÓL — nem vonható vissza (D46). '
          + 'Amit vissza lehet venni, az a felhatalmazás.' + SZIN.vege);
      }
      if (parancs === 'visszavon') {
        kiir(SZIN.halvany + 'A már kiadott tanúsításai érvényben maradnak (D47) — különben '
          + 'néhány ember összebeszélve tömegektől venné el a pénztárcát.' + SZIN.vege);
      }
      break;
    }

    // ⭐⭐ „ESZERINT LÁTOK" — a buli-elismerés (D61). A saját láncomban van sorrend, ezért
    // minden KÉSŐBBI eseményem bizonyíthatóan ezután keletkezett — globális óra nélkül.
    case 'lattam': {
      const sajatBelepes = await sajatHorgonyom();
      if (!sajatBelepes) throw new Error('Előbb lépj be: node koino/koino.js belep');
      await lattam(kornyezet, sajatBelepes);
      kiir('Elismerted, meddig látsz a saját szeletedben.');
      kiir(SZIN.halvany + 'Aki SOHA nem ír alá ilyet, nem szeg szabályt — de kilóg a '
        + 'ritmusból, és ezt a jelzés mutatja, nem a szabály (D19).' + SZIN.vege);
      break;
    }

    // ⭐⭐⭐ ÁLTALÁNOS JAVASLAT (D27) — a KÖZÖSSÉG ÁLLÁSPONTJA, nem entitás-változtatás.
    //
    // ⚠️⚠️ EZ EGY 4. SZABÁLY-HIÁNY VOLT (megtalálva 2026-09-10, kód-átnézéssel): megépült az
    // általános egyezmény élő hatálya és az `allast` parancs, de **nem volt mivel létrehozni
    // azt az egyezményt, amiről állást lehet foglalni** — a `koino.js` mindkét javaslat-útja
    // beégetve `fajta: 'szerkesztesi'`-t küldött. *„Legyen mindig kézi út."*
    //
    // ⛔ A HELY KÖTELEZŐ, és ez nem szigor, hanem a D27/4: **a hely határozza meg a
    // hatókört** — az foglalhat állást, akinek tudatpontja van azon az entitáson, ami alatt
    // az egyezmény áll, vagy annak bármely leszármazottján. Hely nélkül nem lenne kör, aki
    // dönt róla; a javaslat szülője amúgy is az érintett entitás.
    case 'altalanos': {
      const { allapot } = await kepetKeszit();
      const cim = ervek[0];
      if (!cim) throw new Error('Mi az álláspont? altalanos <cím> <hely> [indoklás]');
      if (!ervek[1]) {
        throw new Error('Hol álljon? (azonosító) — a hely határozza meg, kik dönthetnek '
          + 'róla és kik foglalhatnak állást (D27/4).');
      }
      const hely = feloldas(ervek[1], allapot.entitasok.keys());

      const e = await javaslatLetrehozasa(kornyezet, {
        fajta: 'altalanos',
        erintettek: [{ entitas: hely, muvelet: ALLASPONT_MUVELET, valtozas: { cim } }],
        indoklas: ervek[2] ?? null,
        // ⭐ A javaslat is entitás (D27/5) — a kezdő pontot a művelet teszi fel, a szavazat előtt (D85).
        pont: KEZDO_PONT
      });

      kiir('Általános javaslat beadva: ' + e.azonosito.slice(0, 8));
      kiir(SZIN.halvany + 'Helye: „' + (allapot.entitasok.get(hely)?.cim ?? '?')
        + '" — innen örökli a szavazói kört és a küszöbeit.' + SZIN.vege);
      kiir(SZIN.halvany + '⚠️ Ha elfogadják, SEMMI nem hajtódik végre — az egyezmény MAGA '
        + 'az álláspont, és ÉL: csatlakozni, tiltakozni, ütközést jelölni lehet hozzá.'
        + SZIN.vege);
      kiir(SZIN.halvany + 'Most szavazhatsz rá: node koino/koino.js szavaz '
        + e.azonosito.slice(0, 8) + ' tamogat' + SZIN.vege);
      break;
    }

    case 'javaslat':
    case 'torol':
    case 'egyesit':
    case 'athelyez': {
      const { allapot } = await kepetKeszit();

      // ⭐⭐ AZ EGYESÍTÉS AZ EGYETLEN, AMI TÖBB ENTITÁST NEVEZ MEG — vesszővel elválasztva.
      // ⚠️ Az ELSŐ a különleges: ő az, aki a többit BEOLVASZTJA (megtartja az azonosítóját,
      // és ő veszi fel az egyesített címet). Csaba döntése, 2026-09-07.
      if (parancs === 'egyesit') {
        const azonositok = (ervek[0] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
        if (azonositok.length < 2) throw new Error('Melyik kettőt (vagy többet) egyesítsük? <az1>,<az2>');
        const ujCim = ervek[1];
        if (!ujCim) throw new Error('Mi legyen az egyesített gondolat címe?');

        const feloldva = azonositok.map((a) => feloldas(a, allapot.entitasok.keys()));
        const e = await javaslatLetrehozasa(kornyezet, {
          fajta: 'szerkesztesi',
          erintettek: feloldva.map((entitas, i) => ({
            entitas, muvelet: 'Egyesites', valtozas: i === 0 ? { cim: ujCim } : null
          })),
          indoklas: ervek[2] ?? null,
          // ⭐ D85/5: több érintettnél a kezdő pont a TÖREDÉKEKRE oszlik (a művelet teszi fel).
          pont: KEZDO_PONT
        });

        kiir('Szerkesztési javaslat beadva (Egyesites, ' + feloldva.length + ' forrás): '
          + e.azonosito.slice(0, 8));
        kiir(SZIN.halvany + 'Ha elfogadják, az ELSŐ gondolat („'
          + (allapot.entitasok.get(feloldva[0])?.cim ?? '?') + '") olvasztja be a többit — '
          + 'megtartja az azonosítóját, és a rá mutató hivatkozások megmaradnak.' + SZIN.vege);
        kiir(SZIN.halvany + 'Most szavazhatsz rá: node koino/koino.js szavaz '
          + e.azonosito.slice(0, 8) + ' tamogat' + SZIN.vege);
        break;
      }

      const erintett = feloldas(ervek[0] ?? '', allapot.entitasok.keys());

      let muvelet, valtozas, indoklas;
      if (parancs === 'javaslat') {
        if (!ervek[1]) throw new Error('Mi legyen az új cím?');
        muvelet = 'Modositas';
        valtozas = { cim: ervek[1] };
        indoklas = ervek[2] ?? null;
      } else if (parancs === 'torol') {
        muvelet = 'Torles';
        valtozas = null;
        indoklas = ervek[1] ?? null;
      } else {
        // ⭐ A „gyoker" szó a gyökérre helyezést jelenti — a `null` szülőt a parancssorban
        // nem lehet leírni, és az üres érv félreérthető lenne.
        const hova = ervek[1];
        if (!hova) throw new Error('Hova helyezzük? (azonosító vagy „gyoker")');
        muvelet = 'Athelyezes';
        valtozas = { szulo: hova === 'gyoker' ? null : feloldas(hova, allapot.entitasok.keys()) };
        indoklas = ervek[2] ?? null;
      }

      const e = await javaslatLetrehozasa(kornyezet, {
        fajta: 'szerkesztesi',
        erintettek: [{ entitas: erintett, muvelet, valtozas }],
        indoklas,
        // ⭐ A JAVASLAT IS ENTITÁS (Csaba, 2026-09-06) — tudatpont nélkül a D14 szerint NEM
        // LÉTEZNE. A pontot a művelet teszi fel, a támogató szavazat ELŐTT (D85).
        pont: KEZDO_PONT
      });

      kiir('Szerkesztési javaslat beadva (' + muvelet + '): ' + e.azonosito.slice(0, 8));
      kiir(SZIN.halvany + 'Kapott ' + KEZDO_PONT + ' tudatpontot tőled — a javaslat is '
        + 'entitás, enélkül a koino elfelejtené.' + SZIN.vege);
      if (muvelet === 'Torles') {
        // ⚠️ A KÉZI ÚT KIMONDVA: a koino nem veheti vissza más nevében a pontokat.
        kiir(SZIN.halvany + 'Ha elfogadják, a gondolat megszűnik létezni — a rátett '
          + 'tudatpontodat te magad veheted vissza: pont <azonosító> 0' + SZIN.vege);
      }
      kiir(SZIN.halvany + 'Most szavazhatsz rá: node koino/koino.js szavaz '
        + e.azonosito.slice(0, 8) + ' tamogat' + SZIN.vege);
      break;
    }

    case 'szavaz': {
      const { javaslatok } = await kepetKeszit();
      const javaslat = feloldas(ervek[0] ?? '', javaslatok.keys());
      const valasztas = { tamogat: 'Tamogat', ellenez: 'Ellenez', tartozkodik: 'Tartozkodik' }[
        (ervek[1] ?? '').toLowerCase()];
      if (!valasztas) throw new Error('Hogyan szavazol? tamogat | ellenez | tartozkodik');

      // ⭐⭐ A KÜLÖNVÁLÁSI IGÉNY: „ha a döntés nem a te álláspontodat követi, kérsz külön
      // ágat?" ⛔ Tartózkodásnál a művelet úgyis hamisra állítja — egy helyen dől el.
      const kulonAg = (ervek[2] ?? '').toLowerCase() === 'kulonag';

      await szavazas(kornyezet, javaslat, valasztas, kulonAg);
      kiir('Szavazat leadva: ' + valasztas + SZIN.halvany
        + ' (bármikor megváltoztathatod, az utolsó számít)' + SZIN.vege);
      if (kulonAg && valasztas !== 'Tartozkodik') {
        kiir(SZIN.halvany + '⑂ Külön ágat kértél: ha a döntés ellened megy, a SAJÁT '
          + 'változatoddal léphetsz külön ágra — a tudatpontoddal együtt.' + SZIN.vege);
      } else if (kulonAg) {
        kiir(SZIN.halvany + '⚠️ Tartózkodásnál nincs külön ág: aki nem foglal állást, '
          + 'a főágon marad.' + SZIN.vege);
      }
      await tagsagFigyelmeztetes();   // ⭐ D93/1
      break;
    }

    case 'kapu': {
      // ⭐ Megkérdezi a routert, hajlandó-e MAGÁTÓL beengedni a kapcsolatot. Ha igen, nem
      // kell kézzel szabályt írni a router felületén — ami a legtöbb e-embernek úgyis
      // leküzdhetetlen akadály lenne.
      // ⚠️ SEGÉDESZKÖZ, NEM ELŐFELTÉTEL: ha a router nemet mond, a koino ugyanúgy működik.
      const port = parseInt(ervek[0], 10) || ALAP_PORT;
      const atjaro = ervek[1];
      const en = sajatIPv6();

      if (!en) {
        kiir(SZIN.nem + 'Nincs globális IPv6-címed — így nincs mit kinyittatni.' + SZIN.vege);
        break;
      }
      kiir(SZIN.halvany + 'A saját címed: ' + en.cim + '  (' + en.kartya + ')' + SZIN.vege);

      if (!atjaro) {
        kiir();
        kiir('Add meg a router helyi IPv6-címét is:');
        kiir('  node koino/koino.js kapu ' + port + ' fe80::…');
        kiir(SZIN.halvany + 'Windowson így kérdezhető le:' + SZIN.vege);
        kiir(SZIN.halvany + '  Get-NetRoute -DestinationPrefix ::/0 | Select NextHop' + SZIN.vege);
        break;
      }

      // ----- MI VAN A HÁLÓZATON? Mindhárom szabványt megkérdezzük -----
      const upnp = await upnpKorkerdes();
      kiir();
      kiir(SZIN.vastag + 'UPnP' + SZIN.vege);
      if (!upnp.talalt) {
        kiir('  ✗ nincs UPnP-átjáró a hálózaton');
      } else {
        kiir('  ✓ van átjáró' + SZIN.halvany + ' — ' + (upnp.szolgaltatasok?.length ?? 0)
          + ' szolgáltatás' + SZIN.vege);
        kiir(upnp.ipv6Tuzfal
          ? SZIN.jo + '  ✓ TUD IPv6 tűzfal-rést nyitni' + SZIN.vege
          : SZIN.nem + '  ✗ nincs IPv6 tűzfal-vezérlés (WANIPv6FirewallControl)' + SZIN.vege);
      }

      kiir();
      kiir(SZIN.vastag + 'PCP' + SZIN.vege);
      const eredmeny = await pcpKapuKerese({
        atjaro, szakasz: en.szakasz, sajatCim: en.cim, port
      });

      if (eredmeny.sikeres) {
        kiir(SZIN.jo + '✓ A router kinyitotta a ' + (eredmeny.port ?? port) + '-es UDP-kaput'
          + SZIN.vege + SZIN.halvany + ' — ' + eredmeny.elettartam + ' másodpercre' + SZIN.vege);
        // ⚠️ KIMONDJUK A HATÁRT (D19): a rés IPv6-os, a koino UDP-kapuja ma IPv4-es — amíg a
        // kapu IPv6-ot is nem hall, ezen a résen nem jön forgalom (D69/2, 2026-09-26).
        kiir(SZIN.nem + '⚠ A koino UDP-kapuja ma még IPv4-es — ezen az IPv6-os résen addig nem'
          + ' jön forgalom, amíg a kapu IPv6-ot is nem hall.' + SZIN.vege);
      } else {
        kiir(SZIN.nem + '✗ Nem sikerült: ' + eredmeny.ok + SZIN.vege);
        kiir();
        kiir(SZIN.halvany + 'Ez nem baj — a koino enélkül is működik, csak nem tud kaput' + SZIN.vege);
        kiir(SZIN.halvany + 'nyitni. Ilyenkor TE kezdeményezel kifelé (csere), vagy kézzel' + SZIN.vege);
        kiir(SZIN.halvany + 'nyitsz portot a routeren.' + SZIN.vege);
      }
      break;
    }

    case 'cimek': {
      // ⭐ MIÉRT KELL EZ? Hogy tudd, milyen címet adj meg a másik készüléknek. (A Szakasz 2 /
      // 4. lépésénél ez még a GLOBÁLIS IPv6 volt — a D69/2 óta a kapu IPv4-es.) Androidon a szokásos
      // rendszer-parancsok (`ip addr`) nem mindig adnak választ, mert a rendszer korlátozza
      // őket; a program viszont a SAJÁT címeit mindig ismeri.
      //
      // ⚠️ Ez NEM a nyilvános cím felderítése. IPv6-nál nincs is rá szükség (nincs NAT):
      // a globális cím maga a nyilvános cím. Épp ezt a mérést akarjuk elvégezni.
      const halozat = (await import('node:os')).networkInterfaces();
      const csoportok = { globalis: [], helyi: [], negyes: [] };

      for (const [nev, cimek] of Object.entries(halozat)) {
        for (const cim of cimek ?? []) {
          if (cim.internal) continue;
          if (cim.family === 'IPv6') {
            const eleje = cim.address.slice(0, 2).toLowerCase();
            const globalisE = eleje.startsWith('2') || eleje.startsWith('3');
            (globalisE ? csoportok.globalis : csoportok.helyi).push({ nev, cim: cim.address });
          } else {
            csoportok.negyes.push({ nev, cim: cim.address });
          }
        }
      }

      // ⚠️ 2026-09-26 ÓTA AZ IPv4 ÁLL ELÖL (D69/2): a koino UDP-kapuja ma IPv4-es, tehát a
      // társ az IPv4-címen éri el — a wifin a helyi címen, NAT mögül a külsőn (azt a
      // `kulsoport` vagy a `tukor` mondja meg). Az IPv6-címek tájékoztatásul maradnak.
      kiir(SZIN.vastag + 'HELYI HÁLÓZAT (IPv4)' + SZIN.vege + SZIN.halvany
        + '   ← egy wifin EZT add meg a másik készüléknek' + SZIN.vege);
      if (!csoportok.negyes.length) kiir(SZIN.nem + '  (nincs)' + SZIN.vege);
      for (const { nev, cim } of csoportok.negyes) {
        kiir('  ' + cim + SZIN.halvany + '   (' + nev + ')' + SZIN.vege);
      }

      kiir();
      kiir(SZIN.halvany + 'Globális IPv6: '
        + (csoportok.globalis.map((c) => c.cim).join(', ') || '—')
        + ' (a UDP-kapu ma IPv4-es — IPv6-on még nem ér el senki)' + SZIN.vege);
      kiir(SZIN.halvany + 'Csak-link IPv6 (fe80…, nem használható kívülről): '
        + csoportok.helyi.length + ' db' + SZIN.vege);
      kiir(SZIN.halvany + 'Két hálózat között a KÜLSŐ címed kell: node koino/koino.js kulsoport'
        + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'A másik készüléken:  node koino/koino.js csere <a fenti cím> 7373'
        + SZIN.vege);
      break;
    }

    case 'ujjlenyomat': {
      // ⭐ „Ugyanazt látjuk-e?" — két készülék EGYETLEN SZÖVEG összehasonlításával.
      // Ez kell majd a Szakasz 2 / 4. lépéséhez, ahol nincs közös program, ami összevesse
      // a két gépet: a két ujjlenyomatot szemmel is össze lehet olvasni.
      //
      // ===== ⭐⭐⭐ ÉS HA NEM EGYEZIK? — A KÉZI ÚT (2026-09-21) =====
      //
      // ⛔ Eddig itt ért véget: megtudtad, hogy eltértek, de azt nem, hogy MIBEN. Az
      // `elteresek` (osszehasonlitas.js) ezt végig tudta — **egyetlen éles hívó nélkül**.
      // ⭐ A hiányzó darab az ÁTVITEL volt: az összevetéshez a másik gép összefoglalója
      // kell. A vonalra nem tesszük (6. szabály), a 4. szabály útja viszont ingyen van:
      //
      //   A gépen:      node koino/koino.js ujjlenyomat kiment lap.json
      //   …átviszed (pendrive, e-mail, bármi — nem titok, de a te adatod)
      //   A másikon:    node koino/koino.js ujjlenyomat osszevet lap.json
      //
      // ⚠️ FEJLESZTŐI MŰSZER, nem koino-funkció: az összefoglaló MINDEN entitást tartalmaz
      // (a `betolt()` alakja), tehát a koino mai méretéig használható — a 9. szabály
      // szerint ez nem a végleges válasz, csak láthatóvá teszi, ami eddig is így volt.
      const alparancs = (ervek[0] ?? '').toLowerCase();

      if (alparancs === 'kiment' || alparancs === 'osszevet') {
        const fajl = ervek[1];
        if (!fajl) {
          kiir(SZIN.nem + 'Melyik fájlba/fájlból? ' + SZIN.vege
            + 'ujjlenyomat ' + alparancs + ' <fájl> [napok]');
          break;
        }
        // ⚠️ A NAPOK ITT IS SZÁMÍT: a lap egy PILLANATRA szól. Ha a másik gépen más
        // értékkel futtatod, jogosan mást kapsz — ezért a lap hordozza is.
        const napokMulva = parseInt(ervek[2], 10) || 0;
        const pillanat = Date.now();
        const { allapot, javaslatok } = await kepetKeszit(napokMulva);

        if (alparancs === 'kiment') {
          const lapSzoveg = await ujjlenyomatLap(allapot, javaslatok,
            { koino: KOINO, szerzo, pillanat, napokMulva });
          await writeFile(fajl, lapSzoveg, 'utf8');

          kiir(SZIN.jo + '✓ A lap kiírva: ' + fajl + SZIN.vege);
          kiir(SZIN.halvany + '  ' + lapSzoveg.length + ' bájt · ' + allapot.entitasok.size
            + ' entitás · ' + javaslatok.size + ' javaslat' + SZIN.vege);
          kiir(SZIN.halvany + '  ujjlenyomat: '
            + await allapotUjjlenyomata(allapot, javaslatok) + SZIN.vege);
          kiir();
          kiir(SZIN.halvany + 'A másik készüléken:  node koino/koino.js ujjlenyomat osszevet '
            + fajl + (napokMulva ? ' ' + napokMulva : '') + SZIN.vege);
          break;
        }

        // ----- ÖSSZEVETÉS -----
        const lap = await ujjlenyomatLapBol(await readFile(fajl, 'utf8'));

        // ⛔ ELSŐ ŐR: ugyanarról a koinóról beszélünk-e? *Két különböző koino állapota
        // nem „eltér", hanem nincs is mihez hasonlítani* — ugyanaz az elv, mint a csere
        // `LENYOMAT`-jánál, ami idegen koinónál azonnal, tisztán véget ér.
        if (lap.koino && lap.koino !== KOINO) {
          kiir(SZIN.nem + '⛔ Ez a lap MÁSIK koinóról szól: ' + lap.koino + SZIN.vege);
          kiir(SZIN.halvany + '  Ez a készülék most ebben van: ' + KOINO + SZIN.vege);
          break;
        }

        const mienk = allapotOsszefoglaloja(allapot, javaslatok);
        const eltero = elteresek(mienk, lap.osszefoglalo);

        kiir(SZIN.vastag + 'ÖSSZEVETÉS' + SZIN.vege + SZIN.halvany + '   (' + fajl + ')'
          + SZIN.vege);
        kiir(SZIN.halvany + '  ő: ' + (lap.szerzo ? rovidAzonosito(lap.szerzo) : '—')
          + ' · én: ' + rovidAzonosito(szerzo) + SZIN.vege);

        // ⚠️⚠️ AZ IDŐ-RÉS KIMONDVA (D19), MÉG MIELŐTT AZ EREDMÉNYT ELHINNÉD: az állapot
        // ujjlenyomata időfüggő. Ha a két lap percekkel eltérő pillanatra készült, egy
        // közben lezárult döntés ELTÉRÉSNEK látszik, pedig mindkét gép jól számol.
        // *Egy műszer, ami nem mondja meg a saját hibahatárát, félrevezet.*
        const resMp = Math.round(Math.abs(pillanat - (lap.pillanat ?? pillanat)) / 1000);
        if (lap.napokMulva !== napokMulva) {
          kiir(SZIN.nem + '  ⚠ MÁS IDŐPONTRA készült: ő ' + (lap.napokMulva ?? 0)
            + ' nap múlvára, te ' + napokMulva + '-ra — az eltérés ettől is lehet.'
            + SZIN.vege);
        } else if (resMp > 60) {
          kiir(SZIN.halvany + '  ⚠ A két lap ' + resMp
            + ' másodperc különbséggel készült — egy közben lezárult döntés eltérésnek'
            + ' látszik. Ha gyanús, futtassátok újra egyszerre.' + SZIN.vege);
        }
        kiir();

        if (!eltero.length) {
          kiir(SZIN.jo + '✓ UGYANAZT LÁTJUK — mind a ' + Object.keys(mienk).length
            + ' szakasz egyezik.' + SZIN.vege);
          break;
        }

        kiir(SZIN.nem + '⛔ ELTÉRÜNK — ' + eltero.length + ' szakaszban:' + SZIN.vege);
        for (const szakasz of eltero) {
          // ⭐ Nem csak a szakasz nevét mondjuk, hanem a MÉRETÉT is a két oldalon: a
          // „nálam 12, nála 11 entitás" rögtön megmondja, hogy hiányzó eseményről van-e
          // szó (azt a csere megoldja), vagy másképp SZÁMOLUNK (az komolyabb).
          const meret = (ertek) => (Array.isArray(ertek) ? ertek.length + ' elem'
            : ertek === undefined ? 'HIÁNYZIK (más program-változat?)' : 'eltérő tartalom');
          kiir('  · ' + szakasz + SZIN.halvany + '   nálam: ' + meret(mienk[szakasz])
            + ' · nála: ' + meret(lap.osszefoglalo[szakasz]) + SZIN.vege);
        }
        kiir();
        kiir(SZIN.halvany + 'Ha a TUDÁS tér el (nem ugyanazokat az eseményeket ismeritek),'
          + ' egy csere kiegyenlíti. Ha a tudás egyezik és az állapot mégsem, az a'
          + ' komoly eset: más programot futtattok (D66).' + SZIN.vege);
        break;
      }

      const napokMulva = parseInt(ervek[0], 10) || 0;
      const { allapot, javaslatok } = await kepetKeszit(napokMulva);
      // ⭐ 2026-09-27 ÓTA (a C 7–8. pontja): a TUDÁS a csere NYITÓ lenyomata — a szeletek
      // „szelet:lenyomat" párjainak lenyomata. Pontosan ezt veti össze a csere: ha a kettőé egyezik,
      // egyetlen nyitás-csere a kör. *(Előtte a szerzőnkénti ÁLLÁS lenyomata volt.)*
      const parok = await szeletParok(tar, KOINO);

      kiir(SZIN.vastag + 'TUDÁS' + SZIN.vege + SZIN.halvany
        + '     (mely eseményeket ismerem — ezt egyenlíti ki a csere)' + SZIN.vege);
      kiir('  ' + await halmazLenyomata(parok));
      kiir(SZIN.halvany + '  ' + parok.length + ' szelet · '
        + (await koinoEsemenyei(tar, KOINO)).length + ' esemény' + SZIN.vege);

      kiir();
      kiir(SZIN.vastag + 'ÁLLAPOT' + SZIN.vege + SZIN.halvany
        + '   (ami ebből következik — ennek is egyeznie kell)' + SZIN.vege);
      kiir('  ' + await allapotUjjlenyomata(allapot, javaslatok));
      kiir(SZIN.halvany + '  ' + allapot.entitasok.size + ' entitás · '
        + javaslatok.size + ' javaslat' + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + '⚠ Az ÁLLAPOT ujjlenyomata IDŐFÜGGŐ (a döntések lezárulnak),'
        + ' ezért csak azonos pillanatra hasonlítható össze.' + SZIN.vege);
      // ⭐ ÉS HA NEM EGYEZIK: a kézi út megmondja, MIBEN. *Egy műszer, ami csak „nem"-et
      // mond, félkész — a parancsnak magának kell elárulnia, hol a folytatás.*
      kiir(SZIN.halvany + '  Ha a másikéval nem egyezik:  ujjlenyomat kiment lap.json'
        + '  →  a másik gépen:  ujjlenyomat osszevet lap.json' + SZIN.vege);
      break;
    }

    // ===== A CSERE: két készülék között (Szakasz 2) =====

    case 'figyel': {
      // ===== A POSTALÁDA-SZEREP (D34) — 2026-09-26 óta az állandó UDP-kapun (D69/2) =====
      //
      // ⭐ AKI FOGADNI TUD, AZ POSTALÁDA. Nem élő továbbító: nem kell egyszerre online
      // tartania két felet (ez a TURN drágasága, és a koino épp ezt úszhatja meg). Elég,
      // ha ÁTVESZI, ELTÁROLJA, és a következő beszélgetésnél TOVÁBBADJA.
      //
      // ⭐ A KAPU A RÉGI TCP-KAPU HELYÉN: bármikor felel a kopogásra, a bekopogóra visszakopog,
      // és vele ugyanazt a munkát végzi, mint az őrjárat (`resMunkaKeszito`). ⚠️ Ő maga nem
      // kopog senkire — ezért kívülről csak az éri el, aki átjut a portásán: a wifin bárki,
      // nyilvános címen bárki, NAT mögött az, akire ő is kiszólt (vagy akinek a `kapu`
      // paranccsal állandó szabályt kért a routertől).
      const port = parseInt(ervek[0], 10) || ALAP_PORT;
      // ⭐ D70: a postaláda a futása végéig tartja az író-szerepet, ha most senki nem író —
      // a kézi parancsok ilyenkor NEKI adják át az eseményt, és a lánc vége egy helyen dől el.
      await tar.iroLeszek();
      const res = await resAllapotKeszites();
      const kapu = await udpKapuNyitasa({
        port, munka: resMunkaKeszito(res), bekopogoKorlat: BEKOPOGO_KORLAT,
        jelez: kapuJelzesKiiro()
      });
      await kapuPortjaFeljegyzese(kapu.port);

      // ⭐ ÉS FELELÜNK A HELYI KIÁLTÁSOKRA (F. lépés). Aki ugyanezen a wifin a `felfedez`-t
      // futtatja, cím beírása nélkül megtalál minket. ⚠️ Nem kiáltunk magunktól, csak
      // válaszolunk — és ha nem megy, a postaláda ettől még dolgozik.
      const valaszolo = await felfedezoValaszolo({ koino: KOINO, sajatPort: kapu.port });

      kiir(SZIN.vastag + 'POSTALÁDA' + SZIN.vege + SZIN.halvany
        + '   (a UDP-kapu nyitva a ' + kapu.port + '-es porton)' + SZIN.vege);
      kiir(valaszolo.mukodik
        ? SZIN.halvany + 'A helyi hálózaton felfedezhető vagyok (felfedez)' + SZIN.vege
        : SZIN.halvany + '⚠ A helyi felfedezésre nem tudok felelni — a kézi `tars` út marad'
          + SZIN.vege);
      kiir(SZIN.halvany + 'Te: ' + rovidAzonosito(szerzo) + ' · adat: ' + alapHely() + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'Amit ez a készülék csinál: átveszi mások eseményeit, eltárolja,'
        + SZIN.vege);
      kiir(SZIN.halvany + 'és a következő beszélgetésnél továbbadja — így két olyan e-ember'
        + SZIN.vege);
      kiir(SZIN.halvany + 'is elér egymáshoz, akik egymást közvetlenül nem érik el.' + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'A másik készüléken: node koino/koino.js csere <ez a cím> '
        + kapu.port + SZIN.vege);
      kiir(SZIN.halvany + 'Kilépés: Ctrl+C' + SZIN.vege);
      // Nem lépünk ki: a nyitott kapu életben tartja a folyamatot.
      break;
    }

    case 'cimjegyzek': {
      // ===== ⭐⭐ D91/3: A CÍMJEGYZÉK — mit hirdetek a DHT-n, és ki tartja, amit keresek =====
      //
      // A fő út a fa és a raj (a csere viszi); ez a hash-elhelyezés: a saját gyökér-darabom (mindig) és a
      // beállítás szerinti néhány vállalt szeletem. ⚠️ Segédeszköz (2. szabály), a cím név nélküli (D6).
      const mit = ervek[0] ?? '';
      if (mit === 'hirdetes') {
        const n = parseInt(ervek[1], 10);
        if (!Number.isInteger(n) || n < 0) {
          throw new Error('Hány vállalt szeletet hirdessen ez a készülék? (0 = csak a gyökér-darabot)'
            + '\n  node koino/koino.js cimjegyzek hirdetes <0..' + SZELET_HIRDETES_KORLAT + '>');
        }
        const ertek = Math.min(n, SZELET_HIRDETES_KORLAT);
        await writeFile(cimjegyzekBeallitasFajl(), JSON.stringify({ szeletHirdetes: ertek }), 'utf8');
        kiir(SZIN.jo + '✓ ez a készülék ' + (ertek ? ertek + ' vállalt szeletet is hirdet' : 'csak a gyökér-darabját hirdeti')
          + SZIN.vege + SZIN.halvany + '  (helyi beállítás — nem esemény, nem terjed; egy téma ~0,65 MB/nap)'
          + SZIN.vege);
        break;
      }
      if (mit === 'hirdet') {
        const port = parseInt(ervek[1], 10) || ALAP_PORT;
        const h = await cimjegyzekHirdetese(port);
        kiir(SZIN.vastag + 'HIRDETÉS a DHT-n (port ' + port + ')' + SZIN.vege);
        for (const e of h.eredmeny) {
          kiir('  ' + (e.tarolta > 0 ? SZIN.jo + '✓' : SZIN.nem + '✗') + SZIN.vege + ' ' + e.fajta + ' '
            + (e.fajta === 'szelet' ? e.kulcs.slice(0, 12) + '…' : e.kulcs) + SZIN.halvany + '  · ' + e.tarolta
            + '/' + e.probalt + ' gép tárolta' + SZIN.vege);
        }
        if (!h.eredmeny.some((e) => e.probalt > 0)) {
          kiir(SZIN.nem + '  A DHT most nem érhető el — egyetlen gép sem felelt (ez nem azt jelenti, hogy senki nem'
            + ' tárolná).' + SZIN.vege);
        }
        kiir(SZIN.halvany + '  forgalom: ' + ((h.forgalom.ki + h.forgalom.be) / 1024).toFixed(1) + ' KB' + SZIN.vege);
        break;
      }
      if (mit === 'keres' || mit === 'gyoker') {
        // A keresendő témák: egy szelet, vagy a gyökér egy darabja (a szomszédos mélységekkel együtt — a
        // mélység a legfelső szintű gondolatok számából jön, és ez két gépen eltérhet).
        let probak;
        if (mit === 'keres') {
          const az = ervek[1];
          if (!az) throw new Error('Melyik szelet tartóit keressem?\n  node koino/koino.js cimjegyzek keres <azonosító>');
          probak = [{ cimke: 'szelet ' + az.slice(0, 12) + '…', tema: cimjegyzekTema(KOINO, 'szelet', az) }];
        } else {
          const m = (await gyokerMelysegem()).melyseg;
          const sajat = sajatGyokerDarabjai((await tablaKulcsBiztositasa()).alairoNyilvanos, m, 1)[0];
          // ⭐ D106: a darab száma BigInt (a mélység a koinó saját határáig mehet — `GYOKER_MAX_MELYSEG`).
          const d = ervek[1] === undefined ? sajat : /^\d+$/.test(ervek[1]) ? BigInt(ervek[1]) : -1n;
          const darabSzam = 1n << BigInt(m);
          if (d < 0n || d >= darabSzam) {
            throw new Error('A gyökér-darab sorszáma 0 és ' + (darabSzam - 1n) + ' között (mélység: ' + m + ')');
          }
          const parok = [[m, d]];
          if (m > 0) parok.push([m - 1, d >> 1n]);
          if (m < GYOKER_MAX_MELYSEG) parok.push([m + 1, d * 2n], [m + 1, d * 2n + 1n]);
          probak = parok.map(([mm, dd]) => ({ cimke: 'gyökér ' + mm + ':' + dd, tema: gyokerDarabTemaja(KOINO, mm, dd) }));
        }
        kiir(SZIN.vastag + 'KERESÉS a DHT-n' + SZIN.vege);
        for (const pr of probak) {
          const tarsak = await cimjegyzekKeresese(pr.tema);
          kiir('  ' + pr.cimke + ': ' + (tarsak.length ? SZIN.jo + tarsak.length + ' hirdető' + SZIN.vege
            : SZIN.halvany + 'senki' + SZIN.vege));
          for (const t of tarsak) kiir('    ' + t.cim + ' ' + t.port);
          if (tarsak.length) break;
        }
        kiir(SZIN.halvany + '  (a cím csak jelölt: név nélküli, bizalom nem jár vele — a csere kapuja dönt)' + SZIN.vege);
        break;
      }
      if (mit) throw new Error('Ismeretlen: cimjegyzek ' + mit
        + '\n  node koino/koino.js cimjegyzek [hirdet [port] | keres <azonosító> | gyoker [darab] | hirdetes <n>]');
      const { temak, legfelso, melyseg: gyM, sajatMelyseg: gyS, tanultMelyseg: gyT, szeletHirdetes } = await sajatHirdetendoTemak();
      kiir(SZIN.vastag + 'CÍMJEGYZÉK (D91)' + SZIN.vege + SZIN.halvany + '  — a fő út a fa és a raj; ez a DHT-rész'
        + SZIN.vege);
      kiir('  legfelső szintű gondolatok (becslés a darabomból — D95/4): ' + legfelso + ' → a gyökér-darab mélysége: ' + gyM
        + (gyT && gyM > gyS ? ' (a társaimtól tanulva — D110: ' + gyT.tarsak + ' friss társ mediánja ' + gyT.median
          + '; a saját becslésem ' + gyS + ')' : ''));
      kiir('  szeletenkénti hirdetés (helyi beállítás): ' + szeletHirdetes);
      kiir('  amit ' + Math.round(HIRDETES_KOZ / 60000) + ' percenként hirdetek (az őrjárat):');
      for (const t of temak) {
        kiir('    ' + t.fajta + ' ' + (t.fajta === 'szelet' ? t.kulcs.slice(0, 12) + '…' : t.kulcs));
      }
      break;
    }

    case 'kerelem': {
      // ===== ⭐⭐ D92/6: A KÉRELEM — fejlécek (mintákkal ellenőrizve) vagy törzs, egy társtól =====
      //
      // node koino/koino.js kerelem fejlecek <azonosító|gyoker> [cím] [port] [n] [d]
      // node koino/koino.js kerelem torzs <azonosító> [cím] [port]
      // node koino/koino.js kerelem                       — a függő és a kész kérelmek
      // ⭐ Ami jön, ugyanazon a kapun megy be (3. szabály), az ÁTMENETI tárba (B/2); a bemondott össz-pont a helyi
      // gyorsítótárba (a nem tartott entitások rendezéséhez). ⭐⭐ D92/1: CÍM NÉLKÜL a kérelem FÜGGŐ lesz — a tartóit a
      // G adja (a raj, a DHT), a kopogtató témáikon bejelentkezünk, és az őrjárat a következő buliban kéri.
      if (!ervek[0]) {
        const ny = lejartakKivetele(await kerelmekOlvasasa(), Date.now());
        await kerelmekIrasa(ny);
        kiir(SZIN.vastag + 'FÜGGŐ KÉRELMEK: ' + ny.fuggo.length + SZIN.vege + SZIN.halvany
          + '  (az őrjárat a célokra kopog; a tartók a kopogtató témáikon látják, hogy kérünk)' + SZIN.vege);
        for (const x of ny.fuggo) {
          kiir('  ' + x.fajta + ' ' + (x.kulcs === GYOKER_KULCS ? 'gyökér' : x.kulcs.slice(0, 12) + '…') + SZIN.halvany + '  · '
            + x.celok.length + ' cél · ' + x.kopogtatok.length + ' kopogtató téma · ' + x.probalt + ' próba · '
            + new Date(x.ido).toLocaleTimeString('hu-HU') + SZIN.vege);
        }
        kiir(SZIN.vastag + 'KÉSZ (legutóbbiak): ' + ny.kesz.length + SZIN.vege);
        for (const x of ny.kesz.slice(-10)) {
          kiir('  ' + x.fajta + ' ' + (x.kulcs === GYOKER_KULCS ? 'gyökér' : String(x.kulcs).slice(0, 12) + '…') + SZIN.halvany
            + '  · ' + x.eredmeny + ' · ' + new Date(x.ido).toLocaleTimeString('hu-HU') + SZIN.vege);
        }
        break;
      }
      const fajta = ervek[0];
      const kulcsErv = ervek[1];
      const kulcs = kulcsErv === 'gyoker' ? GYOKER_KULCS : kulcsErv;
      // ⭐ D102: az 5. érv `mely` (vagy `m`, `1`) — a tartó maga jár be (a régi `d` helyett).
      const k = kerelemAlakja({ fajta, kulcs, n: parseInt(ervek[4], 10), m: ['mely', 'm', '1'].includes(String(ervek[5] ?? '')) });
      // ⚠️ A szelet címmel a `hozd` (az közvetlen); cím NÉLKÜL a szelet is függő kérelem lehet (továbbadható — D92/1 (c)).
      if (!k || (k.fajta === 'szelet' && ervek[2])) {
        throw new Error('Mit kérjek, és miről?'
          + '\n  node koino/koino.js kerelem fejlecek <azonosító|gyoker> [cím] [port] [n] [mely]'
          + '\n  node koino/koino.js kerelem torzs <azonosító> [cím] [port]'
          + '\n  node koino/koino.js kerelem szelet <azonosító>   (cím nélkül: függő, továbbadható)'
          + '\n  (egy szelet eseményei egy címről: node koino/koino.js hozd <azonosító> <cím> [port])');
      }
      const cimek = ervek[2]
        ? [{ hoszt: ervek[2], port: parseInt(ervek[3], 10) || ALAP_PORT }]
        : tarsakSorrendje(await tarsakTarolo().olvas()).map((c) => ({ hoszt: c.hoszt, port: Number(c.port) }));
      if (!ervek[2]) {
        // ===== ⭐⭐ D92/1: CÍM NÉLKÜL — a függő kérelem a G tartóival, és a kopogtatás =====
        // A célok: a raj (a tartók készülék-azonosítóval — a kopogtató témájuk ebből számítható), a DHT hirdetői (csak
        // cím — nekik a hirdetett téma párján jelentkezünk), és az induló címek. ⚠️ A port a futó kapué (`kapu.json`,
        // különben az alapport): a kopogásra az őrjárat felel — és a saját körében újra be is jelenti magát.
        const { r, kopogtatok, kp } = await fuggoKerelemFelvetele(k, { cimek, dht: true });
        // A kopogtató témákon most is bejelentkezünk (az őrjárat ~20 percenként megismétli).
        let bejelentve = 0;
        try {
          const kliens = await tablaKliens();
          try {
            for (const kt of kopogtatok) if ((await kliens.bejelent(kopogtatoTemaBuffer(kt), kp)).tarolta > 0) bejelentve++;
            await dhtIsmertekMentese(kliens);
          } finally { kliens.bezar(); }
        } catch { /* a DHT segédeszköz */ }
        const fuggo = r.nyilvantartas.fuggo.find((x) => x.az === r.az);
        kiir(SZIN.vastag + 'FÜGGŐ KÉRELEM: ' + k.fajta + ' ' + (k.kulcs === GYOKER_KULCS ? 'a gyökér' : k.kulcs.slice(0, 12) + '…')
          + SZIN.vege + SZIN.halvany + (r.uj ? '' : '  (már függött — kiegészítve)') + SZIN.vege);
        kiir('  ' + fuggo.celok.length + ' cél · ' + fuggo.kopogtatok.length + ' kopogtató téma (' + bejelentve
          + ' helyen jelentkeztem a DHT-n)');
        kiir(SZIN.halvany + '  Az őrjárat a következő buliban kéri; a tartó a kopogtató témáján látja, hogy kérünk, és ő is'
          + ' kopog. Az állás: node koino/koino.js kerelem' + SZIN.vege);
        break;
      }
      const megvan = k.fajta === 'fejlecek' ? (await kepetKeszit()).esemenyek.map((e) => e.azonosito).slice(-5000) : [];
      const azonossag = await azonossagBeallitasa();
      const { kapu } = await keziKapuNyitasa((halo, t) => kerelemUdpResen(halo, t.cim, t.port, KOINO, k, {
        ...azonossag,
        mintaValaszto: (valasz) => mintaKeres(valasz), megvan,
        blob: fajlBlobTarolo(KOINO), korlat: FAJL_KORLAT,
        kozosMunka: fajlMunkak, forras: t.cim + ':' + t.port
      }));
      let kor;
      try {
        kor = await kapu.kopog(cimek.map((c) => ({ cim: c.hoszt, port: c.port })), { idokorlat: KEZI_KOPOGAS_MS });
      } finally {
        kapu.zar();
      }
      const siker = kor.eredmenyek.find((e) => e.ok && e.eredmeny?.kiszolgalta);
      for (const e of kor.eredmenyek) if (!e.ok) kiir(SZIN.halvany + '  · ' + e.cel.cim + ' ' + e.cel.port + ' — ' + e.hiba + SZIN.vege);
      if (!siker) {
        // ⭐ D109 (KK6): a tartó kerete most nem enged — ezt kimondja (nem „nem tartja”).
        const kesobb = kor.eredmenyek.find((e) => e.ok && e.eredmeny?.kesobb);
        if (kesobb) {
          kiir(SZIN.halvany + '⏸ A tartó most nem szolgál ki (a kiszolgálási kerete betelt) — próbáld újra '
            + kesobb.eredmeny.kesobb + ' mp múlva, vagy egy másik tartónál.' + SZIN.vege);
          break;
        }
        kiir(SZIN.nem + 'Senki nem szolgálta ki a kérelmet' + SZIN.vege + SZIN.halvany
          + ' (nem érhető el, vagy nem tartja — kívülről a kettő nem különböztethető meg).' + SZIN.vege);
        break;
      }
      const r = siker.eredmeny;
      const adat = adatMennyiseg({ bajtKuldott: (r.bajtKuldott ?? 0) + (r.bajtKapott ?? 0) });

      if (k.fajta === 'torzs') {
        const megjott = r.fajlok.filter((f) => f.kesz).length;
        kiir(SZIN.vastag + 'TÖRZS: ' + kulcs.slice(0, 12) + '…' + SZIN.vege + SZIN.halvany + '  (' + siker.cim + ', ' + adat + ')'
          + SZIN.vege);
        if (!r.lenyomatok.length) {
          kiir(SZIN.nem + '  A társ nem adta ki a törzset' + SZIN.vege + SZIN.halvany
            + ' (D84/1: csak a vállaló adja — ő nem vállalja, vagy nincs meg nála).' + SZIN.vege);
        } else {
          kiir('  ' + megjott + '/' + r.lenyomatok.length + ' fájl megvan' + SZIN.halvany
            + (r.fajlok.some((f) => f.megvolt) ? ' (ebből ' + r.fajlok.filter((f) => f.megvolt).length + ' már megvolt)' : '')
            + SZIN.vege);
        }
        // ⭐ D112 ①: a nem vállalt törzs a fájl-tár keretén belül (a most érkezett friss, nem megy).
        try { await fajlTarTakaritasa(); } catch { /* nem dönti el a kérelmet */ }
        break;
      }

      // ----- FEJLÉCEK: az ellenőrzés, és ami átment, az átmeneti tárba + a bemondások közé (a közös út) -----
      const { e, bevett } = await fejlecValaszFeldolgozasa(r);

      kiir(SZIN.vastag + 'FEJLÉCEK: ' + (kulcs === GYOKER_KULCS ? 'a gyökér' : kulcs.slice(0, 12) + '…') + SZIN.vege
        + SZIN.halvany + '  (' + siker.cim + ', ' + adat + ' · ' + bevett + ' esemény az átmeneti tárba)' + SZIN.vege);
      const sor = (t, behuz) => {
        const ered = e.tetelek.get(t.az);
        const jel = !ered?.rendben ? SZIN.nem + '✗ ' + (ered?.ok ?? 'hibás') + SZIN.vege
          // ⭐ D116: az ellenőrzött minták a pont-eseményesek ÉS a darab-minták (a gyerek születésével) együtt
          : ered.mintazott ? SZIN.jo + '✓ ellenőrizve (' + (ered.minta.ellenorzott + (ered.minta.darabEllenorzott ?? 0))
            + ' minta)' + SZIN.vege
            : SZIN.halvany + (t.forras === 'bemondott' ? 'bemondás (a tartója sem tartja)' : 'bemondás') + SZIN.vege;
        const cim = t.letrehozo?.adat?.cim ?? (t.letrehozo?.tipus === 'Javaslat' ? '(javaslat)' : '');
        // ⭐ D116: és hány entitás van alatta (a tartó szerint; „+”, ha ő maga sem tudja pontosan)
        kiir(behuz + SZIN.halvany + t.az.slice(0, 8) + SZIN.vege + '  ' + cim + SZIN.halvany + '  · össz-pont ' + t.osszPont
          + (Number.isSafeInteger(t.ad) ? ' · alatta ' + t.ad + (t.adb ? '+' : '') : '')
          + (t.felkerult ? ' · felkerült' : '') + SZIN.vege + '  ' + jel);
      };
      // ⭐ D102: egy lista, össz-pont szerint csökkenően; a mélyebb tételt a szülője alá húzzuk be.
      const melyseg = new Map([[kulcs, 0]]);
      for (const t of r.valasz?.lista ?? []) {
        const mm = (melyseg.get(t.sz ?? GYOKER_KULCS) ?? 0) + 1;
        melyseg.set(t.az, mm);
        sor(t, '  ' + '    '.repeat(Math.max(0, mm - 1)));
      }
      if (r.valasz && r.valasz.teljes === false) {
        kiir(SZIN.halvany + '  … a lista folytatható (a következő az utolsó tétel után jönne)' + SZIN.vege);
      }
      if (e.hibas) kiir(SZIN.nem + '  ' + e.hibas + ' tétel nem ment át az ellenőrzésen — nem vettük be.' + SZIN.vege);
      break;
    }

    case 'profil': {
      // ===== ⭐⭐ D93/5: A PROFIL (D28 a D88 alakjában) — a darab sózva a fájl-tárba, az esemény csak a lenyomatot =====
      // node koino/koino.js profil nev="Kovács Anna" telepules=Pécs
      const mezok = {};
      for (const e of ervek) {
        const i = e.indexOf('=');
        if (i > 0) mezok[e.slice(0, i)] = e.slice(i + 1);
      }
      const { allapot } = await kepetKeszit();
      const varja = allapot.koino?.profil ?? [];
      const hianyzik = varja.filter((m) => !mezok[m]);
      if (!Object.keys(mezok).length || hianyzik.length) {
        throw new Error('Mit írjak a profilodba?' + (varja.length ? ' (a koinó ezeket várja: ' + varja.join(', ') + ')' : '')
          + '\n  node koino/koino.js profil ' + (varja.length ? varja : ['nev']).map((m) => m + '=...').join(' '));
      }
      const e = await profilMegadasa(kornyezet, mezok);
      kiir('A profilod megvan — a lenyomata: ' + e.adat.lenyomat.slice(0, 12) + '…');
      kiir(SZIN.halvany + 'Az esemény csak a sózott lenyomatot hordozza (D88); a név és a település a fájl-táradban él,'
        + ' és törölhető. A meghívód ezt a lenyomatot tanúsítja (D28/2).' + SZIN.vege);
      break;
    }

    case 'tagsag': {
      // ===== ⭐⭐ D93: A TAGSÁGOM — a láncom mélysége, és a tagsági csomag kiadása (a saját azonosság-szeletembe) =====
      const h = await sajatHorgonyom();
      if (!h) { kiir(SZIN.nem + 'Még nincs belépésed: node koino/koino.js belep' + SZIN.vege); break; }
      const r = await tagE(tar, KOINO, h);
      kiir((r.igen ? SZIN.jo + '✔ tag' : (r.ellenorizheto ? SZIN.nem + '✘ nem tag' : SZIN.halvany + '? nem ellenőrizhető'))
        + SZIN.vege + SZIN.halvany + '  ' + r.ok + SZIN.vege);
      if (r.igen) {
        const c = await tagsagiCsomagKiadasa(kornyezet);
        kiir(SZIN.halvany + '  tagsági csomag: ' + c.ok + (c.kiadva ? ' — a saját azonosság-szeletedben; aki elkéri, az ősök'
          + ' szeletei nélkül is ellenőrizhet (D93/2)' : '') + SZIN.vege);
      }
      // ⭐ D94: ha 2. lépcsős vagyok, a tanúsításaim bemondása (a szúrópróba csak a bemondottat követi).
      const l = await lepcso2E(tar, KOINO, h);
      if (l.igen) {
        const b = await lepcsoBemondasKiadasa(kornyezet);
        kiir(SZIN.halvany + '  2. lépcső: ' + l.ok + ' · bemondás: ' + b.ok + SZIN.vege);
      }
      // ⭐ D95/2: akiknek a tagságát a szeleteimben még nem tudom (a cserében kérem a csomagjukat).
      const fuggo = await tagsagKerdes.fuggoDarab();
      if (fuggo) kiir(SZIN.halvany + '  ' + fuggo + ' szerző tagsága függőben — a következő cserében kérem a csomagjukat' + SZIN.vege);
      break;
    }

    case 'jelzes': {
      // ===== ⭐⭐ D93/6 (E6): A KONTRASZT-JELZÉS KÉRÉSRE — bárkiről, a szeleteiből =====
      // node koino/koino.js jelzes [horgony]
      // Aki a felhatalmazásáról dönt, ebből látja, kiket tanúsított, és azoknak van-e önálló életük — a tanúsító
      // azonosság-szeletéből (a hozzá bejelentett tanúsításai) és a tanúsítottak szeleteiből. Ami nincs meg, azt
      // megnevezi (a `hozd` elhozza). ⛔ SZÁM, nem ítélet (D19, D46): a döntés emberi.
      const nezoTar = ketTarNezet(tar, atmeneti);
      let h = null;
      if (ervek[0] && /^[A-Za-z0-9_-]{43}$/.test(ervek[0])) h = ervek[0];
      else if (ervek[0]) h = feloldas(ervek[0], await horgonyok());
      else h = await sajatHorgonyom();
      if (!h) throw new Error('Kiről? node koino/koino.js jelzes <horgony> (vagy belep, és a sajátodról)');
      const szal = await onalloSzalak(nezoTar, KOINO, h);
      kiir(SZIN.vastag + 'JELZÉS' + SZIN.vege + SZIN.halvany + '   ' + h.slice(0, 8) + '…' + SZIN.vege);
      if (!szal.ellenorizheto) {
        kiir(SZIN.halvany + '  ? nem ellenőrizhető — a horgonya nincs meg: node koino/koino.js hozd ' + h + SZIN.vege);
        break;
      }
      kiir('  önálló szálai: ' + szal.osszes + SZIN.halvany + '  (róla: ' + szal.rolam + ' · tőle: ' + szal.tole
        + ' · kölcsönös bemutatkozás: ' + szal.bemutatkozas + ') · legalább ' + szal.aktivitas + ' eseménye' + SZIN.vege);
      const m = await megbizasAllapota(nezoTar, KOINO, h);
      kiir('  megbízás: ' + m.felhatalmazasok + '-en bízták rá a tanúsítást' + SZIN.halvany
        + (m.visszavontak ? ' (' + m.visszavontak + ' visszavonva)' : '') + ' · ' + m.tanusitasok + ' tanúsítást adott · '
        + m.elismeresek + ' buli-elismerés' + SZIN.vege);
      const t = await tanusitoiTorlodas(nezoTar, KOINO, h);
      if (t.tanusitott) {
        kiir('  akiket tanúsított: ' + t.tanusitott + ' · ebből önálló élet nélkül: ' + t.magukbanAllok
          + (t.hianyzoSzeletek.length ? SZIN.halvany + ' · ' + t.hianyzoSzeletek.length + ' szelete hiányzik (nem számolva):'
            + SZIN.vege : ''));
        for (const az of t.hianyzoSzeletek.slice(0, 5)) {
          kiir('    ' + SZIN.halvany + 'node koino/koino.js hozd ' + az + SZIN.vege);
        }
        if (t.hianyzoSzeletek.length > 5) kiir('    ' + SZIN.halvany + '… és még ' + (t.hianyzoSzeletek.length - 5) + SZIN.vege);
      }
      kiir(SZIN.halvany + '  ⚠️ Ez SZÁM, nem ítélet — a koino bejelent, nem bíráskodik (D19); a megbízásról ember dönt (D46).'
        + SZIN.vege);
      break;
    }

    case 'vallalas': {
      // ===== ⭐ B/1–B/2: MIT TARTOK — a vállalásom és az átmeneti tár (4. szabály: bele lehet látni) =====
      const { allapot } = await kepetKeszit();
      const v = await sajatVallalasa(allapot);
      const pontosak = [...v.pontok.entries()].filter(([, p]) => p > 0);
      // ⭐ D95/1: a két fok — melyiket tartom egészében, melyiket összegezve.
      const kf = await ketFokAllapota(allapot);
      const osszT = await kf.tarolo.olvas();
      const osszegzoDb = [...kf.fokok.values()].filter((f) => f === 'osszegzo').length;
      // ⭐ D97: a részvételem a cserében (a szigorú (b) — vagy „mindent”).
      const reszvetel = await reszvetelHalmazom(kf);
      kiir(SZIN.vastag + 'VÁLLALOM (tartós tár): ' + v.szeletek.size + ' szelet' + SZIN.vege);
      kiir(SZIN.halvany + '  ' + pontosak.length + ' tudatpontos · ' + v.azonossag.length + ' azonosság-szelet'
        + (v.koinoSzuletes ? ' · a koinó születése' : '')
        + (v.kifuto.size ? ' · ' + v.kifuto.size + ' kifutó (a pontomat levettem, de még követem — D104)' : '')
        + ' · ' + osszegzoDb + ' összegezve (nagy, a küszöb: '
        + KETFOK.kuszob + ' esemény)' + ((await kiszolgalasBeallitas()).mindent ? ' · „mindent” beállítás (D83/2)' : '')
        + SZIN.vege);
      kiir(SZIN.halvany + '  a cserében: ' + (reszvetel ? reszvetel.size + ' szeletben veszek részt (a szigorú (b) — D97)'
        : 'mindenben részt veszek („mindent”)') + SZIN.vege);
      for (const [az, p] of pontosak.sort((a, b) => b[1] - a[1])) {
        const o = kf.fokok.get(az) === 'osszegzo' ? osszT.szeletek[az] : null;
        kiir('  ' + SZIN.halvany + az.slice(0, 8) + SZIN.vege + '  ' + (allapot.entitasok.get(az)?.cim ?? '(ismeretlen)')
          + SZIN.halvany + '  · ' + p + ' pont'
          + (kf.fokok.get(az) === 'osszegzo'
            ? ' · összegezve' + (o?.gyoker ? ' (ellenőrzött gyökér: ' + o.osszPont + ' össz-pont, ' + o.darab + ' levél)'
              : ' (még nincs ellenőrzött gyökér)')
            : ' · ' + (kf.jegyzek.get(az) ?? 0) + ' esemény')
          + SZIN.vege);
      }
      // ⭐ D104: a kifutó szeletek — meddig követem még őket.
      for (const [az, lejar] of [...v.kifuto.entries()].sort((a, b) => a[1] - b[1])) {
        kiir('  ' + SZIN.halvany + az.slice(0, 8) + SZIN.vege + '  ' + (allapot.entitasok.get(az)?.cim ?? '(már nem látszik)')
          + SZIN.halvany + '  · kifut: a pontomat levettem, még követem eddig: ' + new Date(lejar).toLocaleString('hu-HU')
          + SZIN.vege);
      }
      // ⭐ D95/3: a saját eseményeim a nem egészében tartott szeletekben, amiket még egy tartó sem vett át (csak küldő út).
      const gyV = await gyokerMelysegem();
      const varo = await (sajatKuldo({ tar, koino: KOINO, szerzo, kulcsai: kuldoKulcsai(gyV),
        halmazkent: async (k) => (gyokerDarabBol(k) ? gyV.darabok.has(k) : v.szeletek.has(k) && kf.fokok.get(k) !== 'osszegzo'),
        kezbesitett: async () => new Set(Object.keys((await kezbesitesTarolo(KOINO).olvas()).kezbesitve)) })).lista();
      const varoDb = varo.reduce((n, x) => n + x.sajat.length, 0);
      if (varoDb) {
        kiir(SZIN.halvany + '  ' + varoDb + ' saját eseményem vár kézbesítésre ' + varo.length + ' szeletben (amit nem tartok'
          + ' egészében — a cserében felajánlom, amíg egy tartó át nem veszi; D95/3)' + SZIN.vege);
      }
      const atm = atmeneti.szeletek().sort((a, b) => (b.megnezve ?? 0) - (a.megnezve ?? 0));
      kiir();
      kiir(SZIN.vastag + 'ÁTMENETI TÁR (csak láttam — eldobható): ' + atm.length + ' szelet, '
        + (atmeneti.meret() / 1024).toFixed(1) + ' KB' + SZIN.vege);
      for (const s of atm) {
        kiir('  ' + SZIN.halvany + (s.kulcs || '(gyökér)').slice(0, 8) + SZIN.vege + '  '
          + (allapot.entitasok.get(s.kulcs)?.cim ?? '(nem gondolat-szelet)') + SZIN.halvany + '  · ' + s.darab
          + ' esemény · megnézve: ' + (s.megnezve ? new Date(s.megnezve).toLocaleString('hu-HU') : '—') + SZIN.vege);
      }
      break;
    }

    case 'tarsak': {
      // ⭐ D33: nem az a kérdés, hogy egy adott gépet elérünk-e, hanem hogy a hálózat
      // összefüggő marad-e. ⭐ A D69/2 óta ez az INDULÓ CÍMEK listája: amit te adtál meg
      // (`tars`) vagy a helyi felfedezés talált — az első találkozáshoz. Más készüléktől
      // tanult cím nem kerül ide (azt a friss UDP-jegyzék és a kötések viszik).
      const tarolo = tarsakTarolo();
      const lista = tarsakSorrendje(await tarolo.olvas());

      kiir(SZIN.vastag + 'TÁRSAK' + SZIN.vege + SZIN.halvany
        + '   (az induló címeid — ezekre kopog a `csere` és az őrjárat, UDP-n)' + SZIN.vege);
      if (!lista.length) {
        kiir(SZIN.halvany + '  (üres) — vegyél fel egyet: node koino/koino.js tars <cím> [port] [név]'
          + SZIN.vege);
      }
      // ⭐ MEGJELÖLJÜK A SAJÁT CÍMÜNKET. Az új kód már nem TANULJA meg magát, de a régebben
      // felvett bejegyzés ott marad — és magától nem tűnik el (4. szabály: törölni csak
      // kézzel lehet). Enélkül a gazdájának esélye sincs észrevenni, hogy a készülék
      // minden körben önmagát hívogatja.
      const sajatak = await sajatOsszesCim();
      let sajatDb = 0;

      for (const t of lista) {
        const mienk = sajatCimE(t.hoszt, sajatak);
        if (mienk) sajatDb++;
        const allapotSzoveg = t.utoljara
          ? SZIN.jo + 'sikerült ' + new Date(t.utoljara).toLocaleString('hu-HU') + SZIN.vege
          : (t.sikertelen
            ? SZIN.nem + t.sikertelen + '× nem sikerült' + SZIN.vege
            : SZIN.halvany + 'még nem próbáltuk' + SZIN.vege);
        kiir('  ' + t.hoszt + ' ' + t.port
          + (t.nev ? SZIN.halvany + '  „' + t.nev + '"' + SZIN.vege : '')
          + '  ' + allapotSzoveg
          + (mienk ? SZIN.nem + '  ⚠ EZ TE VAGY' + SZIN.vege : ''));
      }

      if (sajatDb) {
        kiir();
        kiir(SZIN.nem + '⚠ ' + sajatDb + ' bejegyzés a SAJÁT címed — a készülék önmagát hívja.'
          + SZIN.vege);
        kiir(SZIN.halvany + '  Levétel: node koino/koino.js tars torol <cím> <port>' + SZIN.vege);
      }
      kiir();
      kiir(SZIN.halvany + 'A fájl kézzel is szerkeszthető: ' + tarolo.fajl + SZIN.vege);
      break;
    }

    case 'tars': {
      // ⚠️ MINDEN ÍRÁS A `modosit()`-ON ÁT (2026-09-23) — a kézi utak is. Ma külön
      // folyamatban futnak, tehát a sor nem véd itt semmit; ⭐ de *ha a hívóra bíznánk,
      // az egyik út megtenné, a másik elfelejtené* — és egy későbbi átszervezés csendben
      // egy folyamatba hozhatja őket az őrjárattal.
      const tarolo = tarsakTarolo();

      if (ervek[0] === 'torol') {
        const cim = ervek[1];
        if (!cim) throw new Error('Kit vegyek le? node koino/koino.js tars torol <cím> [port]');
        const port = parseInt(ervek[2], 10) || ALAP_PORT;
        let torolt = 0;
        await tarolo.modosit((lista) => {
          const eredmeny = tarsTorlese(lista, cim, port);
          torolt = eredmeny.torolt;
          return eredmeny.lista;
        });
        kiir(torolt
          ? SZIN.jo + 'Levéve: ' + cim + ' ' + port + SZIN.vege
          : SZIN.nem + 'Nem volt a listán: ' + cim + ' ' + port + SZIN.vege);
        break;
      }

      const cim = ervek[0];
      if (!cim) throw new Error('Kit vegyek fel? node koino/koino.js tars <cím> [port] [név]');
      const port = parseInt(ervek[1], 10) || ALAP_PORT;

      // ⚠️ SZÓLUNK, HA MAGADAT VESZED FEL. Így csúszott be a hiba, ami napokig ott ült:
      // a laptop saját IPv6-címe felkerült a listára, és a készülék minden körben ÖNMAGÁVAL
      // cserélt (707 bájt, 0 esemény) — sőt a lista élére került, mert mindig „sikerült".
      // ⭐ Nem TILTJUK, csak szólunk: lehet, hogy szándékos (két példány egy gépen, más
      // adat-mappával). A tiltás itt hazugság lenne, a hallgatás viszont csapda.
      if (sajatCimE(cim, await sajatOsszesCim())) {
        kiir(SZIN.nem + '⚠ Ez a SAJÁT címed.' + SZIN.vege);
        kiir(SZIN.halvany + '  A készülék így önmagát fogja hívogatni minden körben.'
          + SZIN.vege);
        kiir(SZIN.halvany + '  (Ha két példányt futtatsz egy gépen külön KOINO_ADAT-tal,'
          + SZIN.vege);
        kiir(SZIN.halvany + '   akkor ez rendben van — akkor a PORT különbözteti meg őket.)'
          + SZIN.vege);
      }

      await tarolo.modosit((lista) => tarsHozzaadasa(lista, { hoszt: cim, port, nev: ervek[2] }));
      kiir(SZIN.jo + 'Felvéve: ' + cim + ' ' + port + (ervek[2] ? ' („' + ervek[2] + '")' : '')
        + SZIN.vege);
      kiir(SZIN.halvany + 'Csere mindenkivel: node koino/koino.js csere' + SZIN.vege);
      break;
    }

    case 'orjarat': {
      // ===== A KÉSZÜLÉK MAGÁTÓL DOLGOZIK =====
      //
      // ⭐ MIÉRT KELL? Csaba vette észre: eddig MINDEN csere kézi indítású volt — pedig a
      // D33 egész terve arra épül, hogy a készülékek maguktól, időnként végigpróbálják a
      // társaikat. Egy koino-készüléknek nem szabad arra várnia, hogy valaki parancsot
      // gépeljen be.
      //
      // Két dolgot csinál egyszerre, mert egy valódi készülék is ezt teszi:
      //   1. NYITVA TARTJA A KAPUT (postaláda, D34) — aki tud, az bekopoghat,
      //   2. IDŐNKÉNT KISZÓL mindenkinek, akit ismer (D33).
      //
      // ⭐⭐ 2026-09-26 ÓTA MINDKETTŐ EGYETLEN UDP-KAPUN (D69/2, Csaba döntése): nincs TCP-kör
      // és nincs TCP-postaláda. *A kettősség drága volt — két címjegyzék, két kör, két
      // hibahely —, és a TCP-kör ELREJTETTE a UDP-út hibáját (40. mérés).*
      //
      // ⚠️ EZ NEM „folyamatos kapcsolat" (5. szabály). A készülék a kör végén elenged
      // mindent, és alszik a következőig. Épp ez a különbség a postaláda és az élő
      // továbbító között.
      //
      // ⭐ ÉS EZÉRT KELLETT ELŐBB A B. LÉPÉS: egy „nincs újdonság" kör 931 bájt, tehát
      // sűrűn is mehet anélkül, hogy egy mobilos e-ember számláját megterhelné (D35).
      const perc = parseFloat(ervek[0]) || 5;
      const port = parseInt(ervek[1], 10) || ALAP_PORT;
      // ⭐ AZ INDULÓ CÍMEK (D69/2): amit a `tars` és a `felfedez` vett fel — az első találkozáshoz.
      const tarolo = tarsakTarolo();
      // ⭐⭐ A FRISS UDP-CÍMEK ELÉVÜLÉSE MAGA AZ ABLAK (2026-09-18): ha az e-ember 2 perces
      // bulit kér, a cím 2 percig érdekes. *Nincs varázsszám (9. szabály): a határ abból
      // következik, ami amúgy is adott.*
      const udpElevules = Math.max(60000, Math.round(perc * 60 * 1000));
      // ⭐ A RÉSEN VÉGZETT MUNKA ÁLLAPOTA — a kör frissíti, a munka olvassa (`resMunkaKeszito`).
      // Benne a tábla-kulcs (⛔ nem az azonosságunk, D6), a kötések és a friss UDP-címek.
      const res = await resAllapotKeszites({ udpElevules });
      const kotesTar = res.kotesTar;
      const udpTarolo = res.udpTarolo;
      const sajatTablaKulcsTeljes = res.sajatTablaKulcsTeljes;
      // ⛔ A SAJÁT MAGUNKKAL KÖTÖTT KÖTÉS KIESIK (42. mérés, 2026-09-25): a telefon a
      // társlistáján álló SAJÁT címét is felhívta, és a „társ" tábla-kulcsa a sajátja volt —
      // a kötés-jegyzékbe így önmaga került, és minden körben önmagát kereste a táblán.
      // ⭐ Az új kötés ilyet már nem jegyez fel (`kotesFeljegyzese`); a régit itt takarítjuk.
      await kotesTar.modosit((jegyzek) =>
        jegyzek.filter((k) => k.alairo !== sajatTablaKulcsTeljes.alairoNyilvanos));
      // ⭐ Amit utoljára kiírtunk a táblára — ebből tudjuk, hogy VÁLTOZOTT-e a címünk.
      let tablaraKiirtCim = null;
      // ⚠️ Bukik-e most a külső cím mérése? Csak a VÁLTOZÁST írjuk ki (40. mérés): egy
      // mobilnet nélküli telefonon körönként ugyanaz a sor csak zaj volna.
      let sajatCimMeresBukik = false;
      // ⭐ D91/3: mikor hirdettük utoljára a címjegyzéket, és fut-e épp (a hirdetés nem tartja fel a kört).
      let utolsoHirdetes = 0;
      let hirdetesFut = null;
      // ⭐ A KOPOGÁS SAJÁT ÜTEME (80. mérés): a tábla és a házimunka háttér-munkája (egyszerre egy), és hány kör óta fut.
      let hatterMunka = null;
      let hatterKimaradt = 0;

      // ===== ⭐⭐⭐ AZ ÁLLANDÓ UDP-KAPU (D69/3, 2026-09-25) — és 2026-09-26 óta AZ EGYETLEN =====
      //
      // ⛔ Eddig minden kör új foglalatot nyitott és zárt — ebből lett a 42. mérés „nyitva van,
      // de nem szolgál ki" esete, a 41. mérés egyidejűségi kényszere, és a körönként változó
      // külső port. ⭐ Most EGY foglalat szolgál a teljes futásra: a kopogásra bármikor felel,
      // a bekopogóval munka indul, és társanként egyszerre egy munka fut (lásd `udpKapu.js`).
      // ⭐ D70: az őrjárat a futása végéig tartja az író-szerepet, ha most senki nem író —
      // a kézi parancsok ilyenkor NEKI adják át az eseményt, és a lánc vége egy helyen dől el.
      await tar.iroLeszek();
      const kapu = await udpKapuNyitasa({
        port,
        munka: resMunkaKeszito(res),
        bekopogoKorlat: BEKOPOGO_KORLAT,
        jelez: kapuJelzesKiiro()
      });
      await kapuPortjaFeljegyzese(kapu.port);

      // ⭐ Felelünk a helyi kiáltásokra is (F. lépés) — így egy ugyanezen a wifin induló
      // készülék cím beírása nélkül megtalál. Nem kiáltunk magunktól.
      const orValaszolo = await felfedezoValaszolo({ koino: KOINO, sajatPort: kapu.port });

      kiir(SZIN.vastag + 'ŐRJÁRAT' + SZIN.vege + SZIN.halvany
        + '   (UDP-kapu nyitva a ' + kapu.port + '-en · kör ' + perc + ' percenként'
        + (orValaszolo.mukodik ? ' · helyben felfedezhető' : '') + ')' + SZIN.vege);
      kiir(SZIN.halvany + 'Te: ' + rovidAzonosito(szerzo) + ' · koino: ' + KOINO + SZIN.vege);
      kiir(SZIN.halvany + 'Kilépés: Ctrl+C' + SZIN.vege);
      // ⭐ A telefon ne aludjon el közben (42. mérés) — lásd `ebrenTartas`.
      const ebren = await ebrenTartas();
      if (ebren.termux) {
        kiir(ebren.kert
          ? SZIN.halvany + 'Ébren tartást kértem (termux-wake-lock) — a telefon sötét képernyővel'
            + ' is dolgozik; kilépéskor elengedem.' + SZIN.vege
          : SZIN.nem + '✗ Az ébren tartás nem sikerült — kapcsold be kézzel: a Termux'
            + ' értesítésében „Acquire wakelock".' + SZIN.vege);
      }
      kiir();

      // Vég nélküli kör. Az induló címeket MINDEN körben újraolvassuk, hogy egy közben
      // felvett társ azonnal beleférjen (a `tars` parancs egy másik ablakban futhat).
      for (;;) {
        const induloLista = await tarolo.olvas();
        let sikeresEbbenAKorben = 0;    // ⭐ hányan feleltek — ettől lesz a körből BULI
        // ⭐ Az alsó sáv (2026-10-15): a kör eredménye a lapnak (hány címre kopogtunk, hány új esemény jött).
        let korCelok = 0, korUj = 0;
        await csereAllapota().modosit((a) => korKezdete(a, { perc, port: kapu.port, most: Date.now() }));

        // ⭐⭐⭐ AZ ABLAK VÉGE: ebből jön a menetek korlátja ÉS a kopogásé is (30. mérés).
        const kozMs = Math.max(1, Math.round(perc * 60 * 1000));
        const korKezdetIdo = Date.now();
        const ablakVege = Math.ceil((korKezdetIdo + 1) / kozMs) * kozMs;

        // ===== ⭐⭐⭐ KIRE KOPOGUNK? — HÁROM FORRÁS, EGY KAPU (D69/2) =====
        //
        // ⭐ A KÖTÉSEK ELŐL: az ő utolsó ismert címük akkor is megvan, ha a névtelen
        // jegyzékből már elévült (31. mérés: a leképezés percek alatt elhal). *A kötés épp
        // ezért nem címhez kötődik, hanem tábla-kulcshoz.* Utánuk a FRISS UDP-CÍMEK
        // (a kötésen kívüli találkozás tartja egyben a hálót, 34. mérés), végül az INDULÓ
        // CÍMEK — a te listád, az első találkozáshoz.
        //
        // ⛔⛔ A SAJÁT MAGUNK KISZŰRÉSE CÍM **ÉS** PORT EGYÜTT (2026-09-20, próbából): a
        // hurok-címen a két készülék ugyanazt az IP-t használja — és ez nem próba-műtermék:
        // **két telefon ugyanazon a wifin ugyanazt a külső IP-t mutatja**, csak a portjuk más.
        // ⛔ ÉS ÖNMAGUNKAT NEM HÍVJUK (42. mérés): a telefon társlistáján a SAJÁT wifis címe
        // állt, és minden körben felhívta — „bejött valaki" lett belőle, önmagától.
        const sajatCimek = await sajatOsszesCim();
        res.frissUdp = await frissUdpCimek(udpTarolo, udpElevules);
        const kotesJegyzek = await kotesTar.olvas();
        const celok = [];
        const volt = new Set();
        // ⭐ A kötés célja a VÁRT TÁRSAT is hordozza (D71): a kör a munka végén ebből tudja, hogy
        // tényleg őt érte-e el. A friss és az induló cím névtelen.
        const felvesz = (hoszt, cport, alairo = null) => {
          if (!hoszt || !Number.isInteger(cport)) return;
          const kulcs = hoszt + ':' + cport;
          if (volt.has(kulcs)) return;
          volt.add(kulcs);
          celok.push({ hoszt, port: cport, alairo });
        };
        for (const c of kopogasCeljai(kotesJegyzek, res.frissUdp)) felvesz(c.cim, c.port, c.alairo);
        // ⭐⭐ D97/2: A RAJ A KÖRBEN — a szigorú (b) alatt a vállalt szeleteim tartói (előbb a változottaké, aztán a forgatás).
        try {
          for (const c of await rajKorCeljaim(res)) felvesz(c.hoszt, c.port, c.alairo);
        } catch (hiba) { console.warn('a raj-célok összeállítása nem sikerült', { ok: hiba.message }); }
        // ⭐⭐ D114 (T2 (B) — Csaba: „Aktívan, korlátosan”): a BEFEJEZETLEN (több szeletes) hiányzó fájlok további ismert
        // tartói — körönként legfeljebb kettő, egy fájlhoz a körben lévőkkel együtt legfeljebb három. A randevújuk a közös
        // munkán ugyanazt a fájlt hozza: a fájl több forrásból jön, és a teher a tartók között oszlik meg.
        const fajlForrasCelok = new Set();
        try {
          const aktiv = await aktivFajlForrasCeljai(celok);
          for (const c of aktiv) { felvesz(c.cim, c.port, c.alairo); fajlForrasCelok.add(c.alairo); }
          if (aktiv.length) {
            kiir(SZIN.halvany + '  · ' + ora() + ' ' + aktiv.length + ' fájl-forrást is hívok — egy befejezetlen fájl további'
              + ' tartói (D114)' + SZIN.vege);
          }
        } catch (hiba) { console.warn('a fájl-források összeállítása nem sikerült', { ok: hiba.message }); }
        // ⭐ Az induló címek NEM esnek a kopogás-korlát alá: a listát te töltöd, rövid marad.
        for (const t of induloLista) felvesz(t.hoszt, Number(t.port));
        // ⭐⭐ D92/1: a FÜGGŐ KÉRELMEIM céljai (a tartók, akiktől kérek) — és a KOPOGTATÓK (akik a kopogtató
        // témáimon jelezték, hogy tőlem kérnek): mindkét fél kopog, így a rés két NAT között is megnyílik.
        {
          const ny = lejartakKivetele(await kerelmekOlvasasa(), Date.now());
          await kerelmekIrasa(ny);
          for (const c of fuggoCelok(ny)) felvesz(c.hoszt, c.port, c.alairo ?? null);
          // ⭐ D92/1 (c): akinek egy továbbadott kérelem válaszát viszem vissza.
          tovabbitasokTakaritasa();
          for (const t of tovabbitasok.values()) if (t.valasz) felvesz(t.honnan.cim, Number(t.honnan.port));
          for (const [kulcs, k] of res.kopogtatok ?? new Map()) {
            if (k.lejar < Date.now()) { res.kopogtatok.delete(kulcs); continue; }
            felvesz(k.cim, k.port);
          }
        }
        // ⭐⭐ D99: akivel a legutóbbi fél körön belül már cseréltünk, és azóta nincs újdonságom, azt most nem hívom.
        tar.frissit?.();
        let kihagyott = 0;
        for (let i = celok.length - 1; i >= 0; i--) {
          // ⚠️ D114: a fájl-forrást a fájl miatt hívjuk, nem az újdonságért — a D99 kihagyása rá nem vonatkozik.
          if (fajlForrasCelok.has(celok[i].alairo)) continue;
          if (await csereKihagyhato(celok[i].alairo, kozMs / 2)) { celok.splice(i, 1); kihagyott++; }
        }
        if (kihagyott) {
          kiir(SZIN.halvany + '  · ' + ora() + ' ' + kihagyott + ' társat most nem hívok — ebben a fél körben már cseréltünk, és'
            + ' azóta nincs újdonságom (D99)' + SZIN.vege);
        }
        // ⭐ D109 (KK6): aki „később”-t mondott (a kiszolgálási kerete betelt), azt addig nem hívjuk.
        for (let i = celok.length - 1; i >= 0; i--) if (!kesobbHivando(celok[i].hoszt, celok[i].port)) celok.splice(i, 1);
        const udpCelok = celok.filter((c) => {
          // A saját, épp mért külső címünk — pontos pár szerint.
          if (res.sajatKulsoUdp && sajatCimE(c.hoszt, [res.sajatKulsoUdp.cim])
            && c.port === res.sajatKulsoUdp.port) return false;
          // A saját gépünk valamelyik címe + a SAJÁT kapu-portunk = mi magunk vagyunk.
          if (sajatCimE(c.hoszt, sajatCimek) && c.port === port) return false;
          return true;
        });

        if (!udpCelok.length) {
          if (!kihagyott) {
            kiir(SZIN.halvany + '  ' + ora() + ' nincs kire kopognom (se kötés, se friss cím,'
              + ' se induló cím) — csak a kaput tartom nyitva' + SZIN.vege);
          }
        } else {
          // ⭐ A résen végzett munka EBBŐL a körből dolgozik — a bekopogóké is.
          res.korFajlok = await fajlResz();
          // ⭐ A kopogás ára korlátos (D35), de az ABLAKON soha nem lóg túl.
          const kopogasIdo = () => Math.max(0, Math.min(KOPOGAS_ARA_KORONKENT * 1000,
            ablakVege - Date.now()));

          // ⭐ A SAJÁT KÜLSŐ CÍMÜNK — EZEN az állandó foglalaton mérve, tehát ez a mondható
          // szám, és a futás alatt nem változik foglalatcserétől. ⚠️ A hurok-címen nincs mit
          // mérni: ha minden cél a saját gépen van, a tükör-kérdés a hálózatra menne feleslegesen.
          const csakHelyben = udpCelok.every((c) => /^127\./.test(c.hoszt) || c.hoszt === '::1');
          const meres = csakHelyben ? Promise.resolve() : kapu.sajatCim(tukorBeallitas()).then(
            (cim) => {
              frissUdpCimJegyzese(udpTarolo, cim.cim, cim.port, udpElevules)
                .catch((hiba) => console.warn('a saját UDP-cím feljegyzése nem sikerült',
                  { ok: hiba.message }));
              res.sajatKulsoUdp = { cim: cim.cim, port: cim.port };
              if (sajatCimMeresBukik) {
                sajatCimMeresBukik = false;
                kiir(SZIN.jo + '  · ' + ora() + ' a saját külső címem mérése újra megy: '
                  + cim.cim + ':' + cim.port + SZIN.vege);
              }
            },
            // ⛔⛔ A KIMARADT LÉPÉS MEGNEVEZI MAGÁT (40. mérés): e nélkül a tábla-írás
            // csendben elmaradt, és a társ csak a RÉGI címünket találta meg.
            (hiba) => {
              if (sajatCimMeresBukik) return;
              sajatCimMeresBukik = true;
              kiir(SZIN.nem + '  ✗ ' + ora() + ' nem tudom megmérni a saját külső címemet ('
                + hiba.message + ') — amíg ez így van, új címet sem írhatok a táblára' + SZIN.vege);
            });

          // ===== ⭐⭐⭐ A KÖR ISMÉTLŐDIK, AMÍG VAN ÚJDONSÁG (a buli 3. darabja, 30. mérés) =====
          //
          // ⛔ MIÉRT: egy menet alatt a hír **egy lépést** tesz a láncban — amit az egyik
          // társtól kaptam, arról a többi még nem tud. ⭐ Ha újra kopogunk azokra, akikkel a
          // munka sikerült, a tudás az ablakon belül **nemzedékenként** terjed.
          //
          // ⭐⭐ MÉRVE (30. mérés): **az ismétlés ÖNMAGÁBAN semmit nem ér** (8,9 → 8,6 perc), az
          // **igazítással együtt viszont ×30** (8,9 → 0,3 perc), ritka gráfon pedig a működés
          // feltétele. *Egyik a másik előfeltétele — nem két javítás, hanem egy szerkezet két fele.*
          //
          // ⭐ 2026-09-26 ÓTA A KAPUN (D69/2): a társ kapuja bármikor fogad — ha épp a korábbi
          // munkánkon dolgozik, `FOGLALT`-at mond, és a kopogás addig ismétlődik.
          //
          // ⚠️ HÁROM OK ÁLLÍTHATJA MEG, ÉS MINDHÁROM MÁST MOND:
          //   · nincs újdonság → **készen vagyunk** (a szokásos eset: EGY menet);
          //   · elfogyott az ablak → a következő buli folytatja (a méret-független korlát);
          //   · a plafon → a legvégső szelep, ha valaki nulla ablakot adott meg.
          const sikeresCimek = new Set();
          let menetek = 0, osszesUj = 0, elso = null;
          let menetCeljai = udpCelok;
          for (;;) {
            menetek++;
            const udp = await kapu.kopog(menetCeljai.map((c) => ({ cim: c.hoszt, port: c.port,
              alairo: c.alairo ?? null })),
              { idokorlat: kopogasIdo() });
            if (!elso) { elso = udp; await meres; }
            const sikeresek = udp.eredmenyek.filter((e) => e.ok);
            for (const e of sikeresek) sikeresCimek.add(e.cim + ':' + e.port);
            const uj = sikeresek.reduce((o, e) => o + (e.eredmeny?.uj ?? 0), 0);
            osszesUj += uj;
            if (!uj || !sikeresek.length || Date.now() >= ablakVege
              || menetek >= MENET_PLAFON) break;
            // ⭐ Az ismételt menet már tudja, kivel beszélt — a munka aláíróját viszi tovább (D71).
            menetCeljai = sikeresek.map((e) => ({ hoszt: e.cim, port: e.port,
              alairo: e.eredmeny?.alairo ?? null }));
          }
          // ⭐⭐ A BULI MÉRCÉJE: ahány KÜLÖNBÖZŐ társsal ebben a körben végigment a munka.
          // ⛔ 2026-09-26-ig itt egy hiba ült: a UDP-sikereket a TCP-kör száma FELÜLÍRTA, tehát
          // egy csak-UDP-s kör „néma" körnek számított a felszabadításnál.
          sikeresEbbenAKorben = sikeresCimek.size;
          korCelok = elso.celok;
          korUj = osszesUj;

          // ⭐ A KÖNYVELÉS: az induló címek közül ki felelt, ki nem — csak az ELSŐ menetből
          // (a többi menet csak az ott sikereseket ismételte). ⚠️ A `modosit()`-on át, és
          // RÁVEZETVE, nem ráírva (2026-09-22): amit a kéz közben felvett, az megmarad.
          const megfigyelesek = kopogasMegfigyelesei(induloLista, elso.eredmenyek);
          if (megfigyelesek.length) {
            await tarolo.modosit((friss) => megfigyelesekRavezetese(friss, megfigyelesek));
          }

          if (elso.sikeres) {
            kiir(SZIN.jo + '  ✓ ' + ora() + ' ' + sikeresEbbenAKorben + '/' + elso.celok
              + ' társ' + SZIN.vege + SZIN.halvany + ' — ' + osszesUj + ' új esemény'
              + (menetek > 1 ? ', ' + menetek + ' menet' : '') + SZIN.vege);
          } else if (elso.celok) {
            // ⚠️ A HIÁNYT IS KIMONDJUK (D19) — és pontosan: a nem nyílt rés, a megnyílt, de
            // elbukott csere, és a „foglalt" (a társ épp egy korábbi munkán dolgozik velünk)
            // három különböző dolog (41. mérés).
            kiir(SZIN.halvany + '  · ' + ora() + ' ' + elso.celok + ' címre kopogtam, '
              + (elso.atfurt
                ? elso.atfurt + ' rés nyílt meg, de a csere egyiken sem ment végig'
                : elso.foglalt
                  ? elso.foglalt + ' társ foglalt volt (egy korábbi munkán dolgozik velem)'
                  : 'egyik rés sem nyílt meg') + SZIN.vege);
          }
        }

        // ⭐ Az alsó sáv (2026-10-15): a kör CSERE része kész — a lap innen a következő ablakot mutatja, nem „csere most”-ot
        // (a tábla, a címjegyzék és a házimunka még tart, de az már nem csere). A kör végén a feljegyzés újra frissül.
        {
          const korUtan = Date.now() + (Number.parseInt(process.env.KOINO_ORAELTOLAS ?? '0', 10) || 0);
          const kovetkezo = Math.ceil((korUtan + 1) / kozMs) * kozMs - (korUtan - Date.now());
          await csereAllapota().modosit((a) => korVege(a, { perc, port: kapu.port, kovetkezo,
            sikeres: sikeresEbbenAKorben, celok: korCelok, uj: korUj, most: Date.now() }));
        }

        // ===== ⭐⭐⭐ A KOPOGÁS SAJÁT ÜTEME (41., 45., 80. mérés — 2026-10-19) =====
        //
        // ⛔ MI VOLT A BAJ: a tábla (DHT-művelet — egy néma kötés keresése 4–22 mp, az új cím kiírása akár 68 mp) és a
        // házimunka a kopogás UTÁN, SORBAN futott — és ha túlnyúlt a következő percfordulón, az az ablak KIMARADT (41.: a kör
        // 90–97 mp, a kopogás csak minden második percben; 45.: egy 68 mp-es tábla-írás egy egész ablakot elvitt). A rés pedig
        // csak EGYIDEJŰ kopogásra nyílik (36/d): két készülék, ha az egyik páros, a másik páratlan percben kopog, soha nem
        // találkozik — és épp akkor, amikor a legnagyobb szükség van rá (hálózatváltás után a társ néma, ettől hosszú a kör).
        //
        // ⭐ MOSTANTÓL A HÁTTÉRBEN, EGYSZERRE EGY: a tábla és a házimunka egy háttér-munka, a kör nem várja meg — a
        // következő percfordulón a kopogás akkor is indul, ha a háttér még dolgozik (ilyenkor a HÁTTÉR köre marad ki, nem a
        // kopogás). *Ami egyidejűséget kíván, az az óra szerint megy; ami nem, az ráér.* ⚠️ A háttér a kör eredményét
        // (`sikeresEbbenAKorben` — a felszabadításhoz) a saját körétől kapja; amit a tábla talál, az a következő kör céljai
        // közé kerül (`res.frissUdp`, a kötések).
        if (hatterMunka) {
          hatterKimaradt++;
        } else {
          if (hatterKimaradt) {
            kiir(SZIN.halvany + '  · ' + ora() + ' a háttér (tábla, házimunka) ' + hatterKimaradt
              + ' körön át dolgozott — a kopogás közben a percfordulón ment (80. mérés)' + SZIN.vege);
            hatterKimaradt = 0;
          }
          hatterMunka = (async () => {
            // ⭐ A MÉRÉS KAPCSOLÓJA (80. mérés): `KOINO_HATTER_KESLELTETES` (ms) egy lassú hátteret utánoz (terepen egy 68 mp-es
            // tábla-írás — 45. mérés) — a próba ezzel méri, hogy a kopogás nem várja meg. Élesben 0.
            const kesleltetes = Number.parseInt(process.env.KOINO_HATTER_KESLELTETES ?? '0', 10) || 0;
            if (kesleltetes > 0) await new Promise((t) => setTimeout(t, kesleltetes));
            // ===== ⭐⭐⭐ A HIRDETŐTÁBLA (2026-09-20) =====
            //
            // ⛔ MIÉRT A KÖR VÉGÉN: a kopogásnak a percfordulóra kell esnie (36/d: rést csak a
            // KÖLCSÖNÖS kopogás nyit), a tábla viszont ráér — a DHT-művelet ~20 mp, az ablak 5
            // perc. *Ami egyidejűséget kíván, az megy elöl; ami nem, az utána.*
            try {
              const kotesJegyzekMost = await kotesTar.olvas();

              // (1) OLVASÁS: akiről egy ablak óta nem hallottunk, azt a tábláról keressük — ⭐ a régóta hallgatót visszalépő
              // ütemben (72. mérés: percenként keresett egy rég eltűnt kötést, a mobilneten).
              const nemak = tablanKeresendok(kotesJegyzekMost, kozMs);
              if (nemak.length) {
                const talaltak = await tablarolOlvasas(sajatTablaKulcsTeljes, nemak, (e) => {
                  if (e.mi === 'MEGVAN-A-TABLAN') {
                    // ⚠️ A kor a TÁRS órájából jön (idegen óra), ezért csak tájékoztatás —
                    // a címet frissként jegyezzük be, mert a táblán a MOSTANI címe áll.
                    const perce = e.mikor ? Math.round((Date.now() - e.mikor) / 60000) : null;
                    kiir(SZIN.jo + '  ⭐ ' + ora() + ' a táblán megvan egy néma társ új címe: '
                      + e.hoszt + ':' + e.port + SZIN.vege
                      + (perce === null ? ''
                        : SZIN.halvany + ' (az ő órája szerint ' + perce + ' perce írta ki)'
                          + SZIN.vege));
                  }
                  // ⭐ A TÁRSAT IS MEGNEVEZZÜK (40. mérés): két néma kötésnél a napló eddig
                  // nem mondta meg, melyikük hiányzik — utólag kellett kikövetkeztetni.
                  if (e.mi === 'NINCS-A-TABLAN') {
                    kiir(SZIN.halvany + '  · ' + ora() + ' egy néma társ (' + e.tars
                      + '…) nincs a táblán (' + e.valasz + ' DHT-gép felelt)' + SZIN.vege);
                  }
                  // ⛔⛔ ÉS HA SENKI NEM FELELT, AZ NEM „NINCS A TÁBLÁN" (40. mérés).
                  if (e.mi === 'TABLA-NEM-ELERHETO') {
                    kiir(SZIN.nem + '  ✗ ' + ora() + ' a tábla NEM ÉRHETŐ EL (' + e.kerdes
                      + ' kérdés, egyik DHT-gép sem felelt) — nem tudom, hol van ' + e.tars
                      + '…' + SZIN.vege);
                  }
                  if (e.mi === 'OLVASAS-BUKOTT') {
                    kiir(SZIN.nem + '  ✗ ' + ora() + ' a táblaolvasás elbukott (' + e.tars
                      + '…: ' + e.ok + ')' + SZIN.vege);
                  }
                });
                // ⭐ A TALÁLT CÍM A FRISS JEGYZÉKBE KERÜL — a következő buli már rá kopog.
                for (const t of talaltak) {
                  await frissUdpCimJegyzese(udpTarolo, t.hoszt, t.port, udpElevules);
                  await kotesFeljegyzese(kotesTar, { alairo: t.alairo, titkosito: t.titkosito },
                    { hoszt: t.hoszt, port: t.port });
                }
                if (talaltak.length) res.frissUdp = await frissUdpCimek(udpTarolo, udpElevules);
              }

              // (2) ÍRÁS: csak akkor, ha a CÍMÜNK MEGVÁLTOZOTT (Csaba: eseményre, nem órára).
              const mostiCim = res.sajatKulsoUdp
                ? { hoszt: res.sajatKulsoUdp.cim, port: res.sajatKulsoUdp.port } : null;
              const valtozott = mostiCim && (!tablaraKiirtCim
                || tablaraKiirtCim.hoszt !== mostiCim.hoszt || tablaraKiirtCim.port !== mostiCim.port);
              if (valtozott) {
                const e = await tablaraKiiras(sajatTablaKulcsTeljes,
                  await kotesTar.olvas(), mostiCim);
                // ⭐ A 2026-09-21-i nyitott kérdés („a 0 tárolós kiírás is kiírtnak számít, és
                // nincs újrapróbálkozás") a 42. mérésen mért kárt okozott — lent javítva.
                // ⛔⛔ A NYITOTT KÉRDÉS MEGVÁLASZOLVA — A MÉRÉS DÖNTÖTT (42. mérés, 2026-09-25).
                // A telefon a szomszéd wifijén kiírta az új címét, de **0 tároló** vette át (a
                // DHT abban a percben nem felelt). A program ezt kiírtnak vette, és nem próbálta
                // újra — a laptop 2 és fél órán át a RÉGI címét olvasta, és a rés meg sem nyílt.
                // ⭐ Ezért kiírtnak csak az számít, amit legalább EGY tároló átvett; a 0 tárolós
                // kiírást a következő kör újra megpróbálja. *Egy kiírás, amit senki nem őriz, nem
                // kiírás.*
                if (e.kiirt && e.tarolta > 0) {
                  tablaraKiirtCim = mostiCim;
                  kiir(SZIN.jo + '  ⭐ ' + ora() + ' az új címemet kiírtam a táblára ('
                    + e.kiirt + ' társ rekeszébe, ' + e.tarolta + ' tároló)' + SZIN.vege);
                } else if (e.kiirt) {
                  kiir(SZIN.nem + '  ✗ ' + ora() + ' az új címem kiírása nem ért célba: egyetlen'
                    + ' DHT-gép sem vette át — a következő körben újra próbálom' + SZIN.vege);
                }
              }
            } catch (hiba) {
              // ⚠️ A TÁBLA SEGÉDESZKÖZ (2. szabály): ha nem megy, a koino megy tovább.
              kiir(SZIN.halvany + '  · ' + ora() + ' a tábla most nem elérhető ('
                + hiba.message + ')' + SZIN.vege);
            }

            // ⚠️ A BÁJTOK 2026-09-26 ÓTA A RÉSEN JÖNNEK, a munkán belül (randevú): a kör utáni
            // TCP-s elhozás kikerült (D69/2). *A buli után fenntartott kapcsolat (Csaba,
            // 2026-09-12) most maga a rés — ugyanazon a foglalaton, amin a csere ment.*

            // ⭐⭐ D91/3: A CÍMJEGYZÉK HIRDETÉSE — ~20 percenként (a háló 30–60 perc alatt felejt, 58. mérés): a saját
            // gyökér-darabom, és a beállítás szerint néhány vállalt szeletem. ⚠️ Segédeszköz: a hibája nem dönti el a kört.
            // ⚠️ A HÁTTÉRBEN: egy bejelentés 7–17 mp (58. mérés) — a kört nem tarthatja fel, és egyszerre egy fut.
            // ⭐ D92/1: ha egy függő kérelem kopogtató témáján még nem jelentkeztünk, nem várunk 20 percet.
            if (!hirdetesFut) {
              const kellene = fuggoKopogtatok(await kerelmekOlvasasa()).map((k) => k.fajta + ':' + k.kulcs);
              if (kellene.some((k) => !(res.bejelentettKopogtatok ?? new Set()).has(k))) utolsoHirdetes = 0;
            }
            if (!hirdetesFut && Date.now() - utolsoHirdetes >= HIRDETES_KOZ) {
              utolsoHirdetes = Date.now();
              hirdetesFut = cimjegyzekKor(res.sajatKulsoUdp?.port ?? port)
                .then((h) => {
                  // ⚠️ A „nem értem el a DHT-t" és a „senki nem tárolta" két külön dolog (a 40. mérés tanulsága).
                  const tarolt = h.eredmeny.filter((e) => e.tarolta > 0).length;
                  const elerte = h.eredmeny.some((e) => e.probalt > 0);
                  kiir(SZIN.halvany + '  📇 ' + ora() + ' címjegyzék: ' + (elerte
                    ? tarolt + '/' + h.eredmeny.length + ' téma a DHT-n (' + ((h.forgalom.ki + h.forgalom.be) / 1024)
                      .toFixed(1) + ' KB)'
                    : 'a DHT most nem érhető el (egyetlen gép sem felelt) — a raj ettől még működik') + SZIN.vege);
                  // ⭐⭐ D92/1: akik a kopogtató témáimon jelezték, hogy tőlem kérnek — a következő körökben feléjük is
                  // kopogok (30 percig). A saját címemet kihagyom.
                  res.bejelentettKopogtatok = new Set(h.bejelentett);
                  res.kopogtatok ??= new Map();
                  const sajat = res.sajatKulsoUdp ? res.sajatKulsoUdp.cim + ':' + res.sajatKulsoUdp.port : null;
                  let ujKopogtato = 0;
                  for (const k of h.kopogtatok) {
                    const kulcs = k.cim + ':' + k.port;
                    if (kulcs === sajat || ((/^127\./.test(k.cim) || k.cim === '::1') && k.port === port)) continue;
                    if (!res.kopogtatok.has(kulcs)) ujKopogtato++;
                    res.kopogtatok.set(kulcs, { cim: k.cim, port: k.port, lejar: Date.now() + KOPOGTATO_ELEVULES });
                  }
                  if (ujKopogtato || h.bejelentve) {
                    kiir(SZIN.halvany + '  🚪 ' + ora() + ' kopogtatás: ' + (ujKopogtato ? ujKopogtato + ' kérő vár rám' : '')
                      + (ujKopogtato && h.bejelentve ? ' · ' : '') + (h.bejelentve ? h.bejelentve + ' tartónál jelentkeztem' : '')
                      + SZIN.vege);
                  }
                  // ⭐ D107 L2 (③c): a régióm többi tartója ugyanígy a kör céljai közé (a csere a közös régiót egyezteti).
                  // ⛔ A kopogtatók UTÁN (mérve — a D92/1 kopogtatás-próba): ha előbb jön, egy kérő, aki a régiómnak is
                  // tartója, már ismertnek látszik, és a „kérő vár rám” jelzés elmarad.
                  let ujRegioTars = 0;
                  for (const k of h.regioTarsak ?? []) {
                    const kulcs = k.cim + ':' + k.port;
                    if (kulcs === sajat || ((/^127\./.test(k.cim) || k.cim === '::1') && k.port === port)) continue;
                    if (!res.kopogtatok.has(kulcs)) ujRegioTars++;
                    res.kopogtatok.set(kulcs, { cim: k.cim, port: k.port, lejar: Date.now() + KOPOGTATO_ELEVULES });
                  }
                  if (ujRegioTars) {
                    kiir(SZIN.halvany + '  🔍 ' + ora() + ' a kereső-régióm ' + ujRegioTars + ' további tartója a DHT-n — a kör'
                      + ' céljai közé' + SZIN.vege);
                  }
                })
                .catch((hiba) => {
                  kiir(SZIN.halvany + '  ⚠ a címjegyzék hirdetése most nem sikerült: ' + hiba.message + SZIN.vege);
                })
                .finally(() => { hirdetesFut = null; });
            }

            // ⭐⭐ ÉS A HÁZTARTÁS: az elakadt tudatpontok visszavétele (2026-09-07).
            // A készülék magától könyvel — de csak megülepedés után, mert egy késve érkező,
            // határidőn belüli szavazat még visszafordíthatja a törlést. ⚠️ A csere UTÁN
            // fut, nem előtte: így a friss események már beleszámítanak a döntésbe.
            try {
              // ⭐ A KÖR EREDMÉNYE DÖNTI EL, HOGY VOLT-E BULI: ha egyetlen társ sem felelt, ez
              // a kör nem bizonyít semmit — a néma kör nem buli.
              await elakadtPontokFelszabaditasa(true, MEGULEPEDES_BULIK, sikeresEbbenAKorben);
            } catch (hiba) {
              // Best-effort: a könyvelés hibája NE akassza meg az őrjáratot.
              kiir(SZIN.halvany + '  ⚠ a felszabadítás most nem sikerült: ' + hiba.message + SZIN.vege);
            }

            // ⭐ B/2: az előléptetés (ami az átmenetiben van, de már vállalom) — körönként.
            try { await atmenetiElolepetese(); } catch (hiba) {
              kiir(SZIN.halvany + '  ⚠ az előléptetés most nem sikerült: ' + hiba.message + SZIN.vege);
            }

            // ⭐⭐ D85 T3: A SAJÁT LEZÁRT, TÖBB ÉRINTETTES JAVASLATAIM DÖNTÉSI CSOMAGJA (a (B): a töredékekbe).
            // ⚠️ A csere UTÁN, mint a felszabadítás: a friss események már beleszámítanak. Ismételhető — ha
            // minden ott van már, nem ír semmit.
            try {
              // ⭐ D93/2: a tagsági csomagom (ha tag lettem, vagy rövidebb láncot kaptam) — a saját azonosság-szeletembe.
              try {
                const tc = await tagsagiCsomagKiadasa(kornyezet);
                if (tc.kiadva) kiir(SZIN.halvany + '  🪪 ' + ora() + ' tagsági csomag kiadva (' + tc.melyseg + '. szint)' + SZIN.vege);
                // ⭐ D94: a 2. lépcső bemondása (ha 2. lépcsős lettem, vagy új érvényes tanúsítást kaptam).
                const lb = await lepcsoBemondasKiadasa(kornyezet);
                if (lb.kiadva) kiir(SZIN.halvany + '  🪪 ' + ora() + ' 2. lépcső-bemondás: ' + lb.ok + SZIN.vege);
              } catch (hiba) { console.warn('a tagsági csomag kiadása nem sikerült', { ok: hiba.message }); }
              const { kiadva } = await dontesiCsomagokKiadasa(kornyezet, { csakSajat: true });
              if (kiadva.length) {
                kiir(SZIN.halvany + '  📦 ' + ora() + ' ' + kiadva.length + ' döntési csomag a töredékekbe'
                  + ' (a lezárt, több érintettes javaslataimhoz)' + SZIN.vege);
              }
              // ⭐ D95/1: a nagy szelet teljes tartójaként (a „mindent” beállítással) a lezárt döntések összegzése.
              const lo = await lezarasiOsszegzesekKiadasa();
              if (lo) kiir(SZIN.halvany + '  📦 ' + ora() + ' ' + lo + ' lezárási összegzés a nagy szeletű döntésekhez' + SZIN.vege);
              // ⭐ D75/1, D73: naponta egyszer a tár tömörítése (a szigorú (b) alatt; csak az író — az őrjárat az).
              if (tar.iroE?.() && await tomoritesEsedekesE()) {
                const t = await tomoritesFuttatasa();
                if (t.kivett) kiir(SZIN.halvany + '  🗜 ' + ora() + ' tömörítés: ' + t.kivett + ' esemény az átmeneti tárba (amit már nem vállalok)' + SZIN.vege);
              }
              // ⭐ D107 L3 (④a, a ⑥ magja): óránként a kereső-tár tömörítése (a lejárt és a régióimon kívül eső kiesik).
              if (Date.now() - (res.keresoTomorites ?? 0) >= KERESO_TOMORITES_KOZ) {
                res.keresoTomorites = Date.now();
                const kt = await keresoTarTomoritese();
                if (kt) kiir(SZIN.halvany + '  🗜 ' + ora() + ' kereső-tár: ' + kt + ' bejegyzés kiesett (lejárt, vagy a régióimon kívül)' + SZIN.vege);
              }
              // ⭐ D112 ③: a felderítés köre — a futó felderítések egy lépése (rögzítés, háttér-kérések).
              try {
                const fk = await felderitesKor();
                if (fk.kert || fk.lezart.length) {
                  kiir(SZIN.halvany + '  📷 ' + ora() + ' felderítés: ' + (fk.kert ? fk.kert + ' kérés' : '')
                    + (fk.kert && fk.lezart.length ? ' · ' : '') + (fk.lezart.length ? fk.lezart.length + ' lezárult' : '') + SZIN.vege);
                }
              } catch (hiba) { console.warn('a felderítés köre most nem ment', { ok: hiba.message }); }
              // ⭐ D112 ① (F3): a fájl-tár kerete (ritkítva — `FAJL_TAKARITAS_KOZ`).
              try {
                const ft = await fajlTarTakaritasa();
                if (ft?.torolt) kiir(SZIN.halvany + '  🗜 ' + ora() + ' fájl-tár: ' + ft.torolt + ' nem vállalt fájl kiesett ('
                  + adatMennyiseg({ bajtKuldott: ft.felszabadult }) + ' — újra elhozható)' + SZIN.vege);
              } catch (hiba) { console.warn('a fájl-tár takarítása most nem ment', { ok: hiba.message }); }
              // ⭐ D103: a postafiók és a készülék saját értesítése (zárt lapnál is — a felülettel zár alatt váltják egymást).
              try {
                const e = await orjaratErtesitesei();
                if (e.kuldve) kiir(SZIN.halvany + '  🔔 ' + ora() + ' ' + e.kuldve + ' értesítés a készüléken' + SZIN.vege);
              } catch (hiba) { console.warn('a postafiók most nem számolható', { ok: hiba.message }); }
            } catch (hiba) {
              kiir(SZIN.halvany + '  ⚠ a döntési csomag most nem ment ki: ' + hiba.message + SZIN.vege);
            }
          })()
            .catch((hiba) => kiir(SZIN.halvany + '  ⚠ a háttér (tábla, házimunka) most nem ment végig: ' + hiba.message + SZIN.vege))
            .finally(() => { hatterMunka = null; });
        }

        // ===== ⭐⭐⭐ A KÖVETKEZŐ ABLAK A FAL ÓRÁJÁHOZ IGAZODIK (a buli 1. darabja) =====
        //
        // ⛔ MI VOLT A BAJ: a `setTimeout(perc * 60 * 1000)` a kör UTÁN indult, tehát az
        // ébredés fázisát az szabta meg, **ki mikor kapcsolta be a készülékét** — és a kör
        // ideje minden alkalommal hozzáadódott. Két készülék így csak véletlenül találkozott.
        //
        // ⭐ A MEGOLDÁS ÜZENETVÁLTÁS NÉLKÜL MŰKÖDIK: mindenki ugyanahhoz a **külső ponthoz**
        // igazodik — az epoch szerinti percfordulóhoz. Nem kell megbeszélni, nem kell
        // jelzőpont (2. szabály), és nincs „ki az óra" kérdés. *Ugyanaz a szerkezet, amit
        // az `ebredesProba.js res` üzemmódja már mér: „a fal órájához igazított ablakok".*
        //
        // ⭐⭐ MÉRVE (30. mérés): **ritka gráfon (3 társ) ez a működés feltétele** — igazítás
        // nélkül a hír a futások 97%-ában SOHA nem ért körbe, és ahol igen, ott 10 óra alatt.
        // Sűrű gráfon (14 társ) „csak" gyorsítás, mert ott a sodródás elvégzi helyette —
        // ⚠️ *lassan és kiszámíthatatlanul, amire a randevú nem építhet.*
        //
        // ⚠️ AZ ÓRÁRA TÁMASZKODUNK, ÉS EZT KIMONDJUK: ha két készülék órája percekkel eltér,
        // az ablakaik nem fednek át. A koino ettől nem romlik el (a sodródás marad, mint ma),
        // csak nem élvezi az igazítás hasznát — *romlás, nem törés* (D19).
        // (a `kozMs` a kör elején számolódott — ugyanaz az ütem szabja meg az ablakot
        //  és az alvást; két külön számítás előbb-utóbb szétcsúszna)
        // ⭐ A MÉRÉS KAPCSOLÓJA (72. mérés): `KOINO_ORAELTOLAS` (ms) egy elcsúszott órát utánoz — terepen a telefon órája
        // ~1 mp-cel tért el, és a két kör ettől ütközött. Élesben 0.
        const oraEltolas = Number.parseInt(process.env.KOINO_ORAELTOLAS ?? '0', 10) || 0;
        const most = Date.now() + oraEltolas;
        // ⛔⛔ A KOPOGÁS SAJÁT ÜTEME, 2. rész (80. mérés): ha a kör a saját ablaka végén ÉPP túlcsúszott a percfordulón (a
        // kopogás az ablak végéig tart — egy fordulóhoz közel induló első kör, vagy egy forgalmas kör ismételt menetei), az a
        // forduló eddig elveszett: a következő ablak a következő percre esett. ⭐ Ha a csúszás kicsi (≤ `ABLAK_KESES_TURES`, az
        // ablak felénél nem több), azonnal indulunk — a társ kopogása a fordulótól még másodpercekig tart, a rés még nyílhat.
        const sajatAblakVege = Math.ceil((korKezdetIdo + oraEltolas + 1) / kozMs) * kozMs;
        const keses = most - sajatAblakVege;
        const kovetkezoAblak = keses < 0 ? sajatAblakVege
          : keses <= Math.min(ABLAK_KESES_TURES, kozMs / 2) ? most
          : Math.ceil((most + 1) / kozMs) * kozMs;
        // ⭐ Az alsó sáv (2026-10-15): a kör vége és a következő ablak (a saját óránkon — a lap ugyanezen a gépen fut).
        await csereAllapota().modosit((a) => korVege(a, { perc, port: kapu.port, kovetkezo: kovetkezoAblak - oraEltolas,
          sikeres: sikeresEbbenAKorben, celok: korCelok, uj: korUj, most: Date.now() }));
        await new Promise((teljesites) => setTimeout(teljesites, Math.max(0, kovetkezoAblak - (Date.now() + oraEltolas))));
      }
      // ide nem jutunk el; a kaput a folyamat vége zárja
    }

    case 'felfedez': {
      // ===== HELYI FELFEDEZÉS (F. lépés) — „ki van még ezen a wifin?" =====
      //
      // ⭐ MIT VÁLT KI? A kézi cím-beírást. Egy háztartáson belül fölösleges címeket
      // olvasgatni: a két készülék ugyanazon a hálózaton van, elég egy kiáltás.
      //
      // ⚠️ KÉNYELEM, NEM ELŐFELTÉTEL (2. és 4. szabály). Ha a wifi tiltja a kliensek közti
      // forgalmat, ez üres kézzel tér vissza — és a koino ugyanúgy működik tovább a `tars`
      // paranccsal. Ezért nem is fut magától: külön parancs, te indítod.
      const masodperc = parseFloat(ervek[0]) || 2;
      const sajatPort = parseInt(ervek[1], 10) || ALAP_PORT;
      const tarolo = tarsakTarolo();

      kiir(SZIN.vastag + 'HELYI FELFEDEZÉS' + SZIN.vege + SZIN.halvany
        + '   (kiáltok a hálózatra, és ' + masodperc + ' mp-ig hallgatózom)' + SZIN.vege);
      kiir(SZIN.halvany + 'Azt hirdetem, hogy a ' + sajatPort + '-on hallgatok · koino: '
        + KOINO + SZIN.vege);
      kiir();

      const eredmeny = await helyiFelfedezes({
        koino: KOINO, sajatPort, idokorlat: masodperc * 1000,
        esemenyre: (e) => {
          if (e.mi === 'KIALTOTTAM') {
            kiir(SZIN.halvany + '  → kikiáltottam ide: ' + e.cel + SZIN.vege);
          } else if (e.mi === 'KIALTAS-BUKOTT') {
            kiir(SZIN.nem + '  ✗ ide nem ment ki (' + e.cel + '): ' + e.ok + SZIN.vege);
          } else if ((e.mi === 'KOPOGOK-ERKEZETT' || e.mi === 'ITT-VAGYOK-ERKEZETT') && e.uj) {
            // ⚠️ CSAK AZ ÚJAT ÍRJUK KI. Ugyanaz a készülék többször is felel (a kiáltást
            // ismételjük, és a válasz több úton jön) — mérve: EGY laptop 18 sort írt a
            // telefon képernyőjére. Az információ ettől nem lett több.
            kiir(SZIN.jo + '  ← ' + e.tars.hoszt + ':' + e.tars.port + SZIN.vege
              + SZIN.halvany + ' (' + e.mi.replace('-ERKEZETT', '') + ')' + SZIN.vege);
          } else if (e.mi === 'ELDOBVA' && e.ok === 'mas-koino') {
            kiir(SZIN.halvany + '  · ' + e.honnan + ' — MÁSIK koino, nem ránk tartozik'
              + SZIN.vege);
          }
        }
      });

      kiir();
      if (!eredmeny.tarsak.length) {
        kiir(SZIN.nem + '✗ Nem találtam senkit ' + eredmeny.eltelt + ' ms alatt.' + SZIN.vege);
        // ⚠️ MŰSZER, NEM VIGASZ: a néma eredménynek több oka lehet, és a különbség számít.
        kiir(SZIN.halvany + '  Ez háromfélét jelenthet, és nem mindegy, melyiket:'
          + SZIN.vege);
        kiir(SZIN.halvany + '   · nem fut másik koino ezen a hálózaton (ez a leggyakoribb);'
          + SZIN.vege);
        kiir(SZIN.halvany + '   · fut, de MÁSIK koinóé — akkor fentebb kiírtam volna;'
          + SZIN.vege);
        kiir(SZIN.halvany + '   · a wifi tiltja a kliensek közti forgalmat (vendéghálózat,'
          + SZIN.vege);
        kiir(SZIN.halvany + '     „AP isolation") — ilyenkor a kézi út marad: tars <cím> <port>'
          + SZIN.vege);
        if (!eredmeny.kialtasok) {
          kiir(SZIN.nem + '  ⚠ Egyetlen kiáltás sem ment ki — a hálózat már itt megállított.'
            + SZIN.vege);
        }
        break;
      }

      kiir(SZIN.jo + '⭐ ' + eredmeny.tarsak.length + ' készüléket találtam '
        + eredmeny.eltelt + ' ms alatt.' + SZIN.vege
        + SZIN.halvany + ' (' + eredmeny.kialtasok + ' kiáltás, '
        + eredmeny.kapottUzenetek + ' válasz)' + SZIN.vege);

      // ⭐ ÉS FEL IS ÍRJUK ŐKET — különben a felfedezés csak látvány lenne. Ez ugyanaz a
      // kapu, mint a terjedő címjegyzéké: cím kerül a listára, nem bizalom (3. szabály).
      const felirat = await kapottCimekBeolvasztasa(tarolo, eredmeny.tarsak);
      // ⭐⭐ HÁROM DOLOG, HÁROM SZÓ (2026-09-22). A felirat korábban mindenre, ami nem
      // volt új, azt mondta: *„már ismerős volt"* — ⛔ holott a leggyakoribb eset a
      // hálózaton az, hogy **magunkat találtuk meg** (a `felfedez` a saját kiáltásunkra
      // érkező választ is látja). A 39. mérés terepen ezen bukott el tíz percre.
      const reszletek = [
        felirat.ismeros ? felirat.ismeros + ' már ismerős volt' : null,
        felirat.mienk ? felirat.mienk + '-et kiszűrtem, mert a SAJÁT címem' : null
      ].filter(Boolean);
      kiir(SZIN.jo + '  + ' + felirat.hozzajott + ' új társ a listán' + SZIN.vege
        + SZIN.halvany + (reszletek.length ? ' (' + reszletek.join(' · ') + ')' : '')
        + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'Most már mehet: node koino/koino.js csere' + SZIN.vege);
      break;
    }

    case 'tukor': {
      // ===== „KÍVÜLRŐL HOGY LÁTSZOM?" =====
      //
      // ⭐ MIÉRT KELL? Mert IPv4-en a router ÁTÍRJA a portot, tehát a készülék NEM ISMERI
      // a saját külső címét — így nem tudja megmondani a másiknak, hova kopogjon. Ezt
      // szokás STUN-nal megtudni.
      //
      // ⭐ DE ITT NINCS KÜLÖN SZOLGÁLTATÁS: bármelyik társ, akivel a kapun összeérünk, a
      // csere első üzenetében visszamondja, honnan lát. Bárki lehet tükör — tehát nem múlik
      // egyetlen címen (2. szabály), és semmilyen bizalom nem következik belőle (3. szabály):
      // ez megfigyelés, nem igazság.
      //
      // ⛔⛔ 2026-09-26 ÓTA UDP-N (D69/2) — és ez nem formaság: a router a UDP-nek és a
      // TCP-nek KÜLÖN leképezést ad (egy futáson belül UDP 39471, TCP 63495). A régi, TCP-s
      // tükör tehát olyan számot mondott, amire a UDP-kapun senki nem kopoghatott.
      const cim = ervek[0];
      if (!cim) throw new Error('Kitől kérdezzem meg? node koino/koino.js tukor <cím> [port]');
      const port = parseInt(ervek[1], 10) || ALAP_PORT;

      const { kor, kapuPort } = await keziCsere([{ hoszt: cim, port }]);
      const e = kor.eredmenyek[0];
      if (!e?.ok) throw new Error(keziHibaSzovege(e, cim, port));

      kiir(SZIN.vastag + 'KÍVÜLRŐL ÍGY LÁTSZOL (UDP-n)' + SZIN.vege);
      const lat = e.eredmeny?.kivulrolIgyLatszom;
      if (lat) {
        kiir('  ' + SZIN.jo + lat.cim + '  port: ' + lat.port + SZIN.vege);
        kiir(SZIN.halvany + '  (ezt látta rólad ' + cim + ', a helyi ' + kapuPort
          + '-es portodról)' + SZIN.vege);
        if (lat.port !== kapuPort) {
          kiir(SZIN.halvany + '⚠ A port nem a helyi portod — a router átírta. Ezt a külső'
            + ' portot kell megadni a másiknak.' + SZIN.vege);
        }
      } else {
        kiir(SZIN.nem + '  (nem mondta meg — régi verziót futtat a másik oldal?)' + SZIN.vege);
      }
      break;
    }

    case 'kulsoport': {
      // ===== MILYEN CÍMEN ÉS PORTON LÁTSZOM KÍVÜLRŐL? =====
      //
      // ⭐ MIÉRT KELL? Mérve a fejlesztő vonalán: a helyi 7373 kívülről az 51967-esen
      // látszik. Ha a másik a 7373-ra kopog, ott NINCS SEMMI — ezért nem ért célba
      // egyetlen csomag sem. IPv6-on ez a lépés nem létezik (nincs port-átírás).
      //
      // ⚠️ Segédeszköz, nem előfeltétel (D38): a kiszolgáló paraméter, tehát cserélhető,
      // és bizalom nem jár vele — egy portszámot mond, nem igazságot.
      const helyiPort = parseInt(ervek[0], 10) || ALAP_PORT;
      const szerver = ervek[1];
      const szerverPort = parseInt(ervek[2], 10) || undefined;

      const elso = await kulsoCim(helyiPort, szerver, szerverPort);
      kiir(SZIN.vastag + 'KÍVÜLRŐL ÍGY LÁTSZOL' + SZIN.vege);
      kiir('  ' + SZIN.jo + elso.cim + ':' + elso.port + SZIN.vege
        + SZIN.halvany + '   (a helyi ' + helyiPort + '-esről)' + SZIN.vege);
      kiir();

      if (elso.port === helyiPort) {
        kiir(SZIN.jo + '⭐ A PORT MEGMARADT — a másik a ' + helyiPort + '-esre kopoghat.'
          + SZIN.vege);
      } else {
        kiir(SZIN.nem + '⚠ A PORT ÁTÍRVA (' + helyiPort + ' → ' + elso.port + ')'
          + SZIN.vege);
        kiir(SZIN.halvany + '  Ez normális IPv4-en. A másiknak a KÜLSŐ portra kell'
          + ' kopognia:' + SZIN.vege);
        kiir('  ' + SZIN.vastag + 'node koino/koino.js pajzsfuro ' + elso.cim + ' '
          + elso.port + ' ' + ALAP_PORT + SZIN.vege);
      }
      break;
    }

    case 'pajzsfuro': {
      // ===== PAJZSFÚRÁS (E. lépés) =====
      //
      // ⭐ A NÉV CSABÁTÓL: nem kívülről törünk át semmit, hanem MINDKÉT OLDAL BELÜLRŐL
      // fúr — a saját routerén nyit rést, kifelé indulva —, és a két rés a közepén
      // találkozik. Ezért pajzsfúró, nem „lyukfúró".
      //
      // ⚠️ VÉG NÉLKÜL FÚR (2026-08-29, Csaba észrevétele nyomán). Az első változat 60
      // másodperc után feladta — de a két oldal nem indul egyszerre, és eddig SOHA nem
      // futott mindkettőn egyszerre. Ha viszont mindkettő folyamatosan fúr, az átfedés
      // előbb-utóbb garantált, közös óra nélkül is. Leállítani Ctrl+C-vel lehet.
      const cim = ervek[0];
      if (!cim) {
        throw new Error('Kihez kopogjak?'
          + '\n  node koino/koino.js pajzsfuro <cím> <távoli port> [helyi port]');
      }
      const port = parseInt(ervek[1], 10) || ALAP_PORT;
      // ⚠️ A HELYI ÉS A TÁVOLI PORT KÜLÖNBÖZHET — és IPv4-en általában KÜLÖNBÖZIK is,
      // mert a NAT átírja. A helyi portot MI választjuk (ezen fogadunk), a távolit a
      // másik KÜLSŐ portja adja (oda kopogunk). A `kulsoport` parancs mondja meg.
      const helyiPort = parseInt(ervek[2], 10) || ALAP_PORT;

      // ⚠️ ITT ÁLLT 2026-09-26-IG A TCP-VÁLTOZAT (`pajzsfuro <cím> <port> tcp`, 17–19. mérés). A
      // D69/2 óta nincs TCP a készülékek között: a TCP-fúrás a router célfüggetlenségén állt,
      // a UDP a foglalat-modellen (Csaba döntése, 2026-09-13 és 2026-09-25).

      kiir(SZIN.vastag + 'PAJZSFÚRÓ' + SZIN.vege + SZIN.halvany
        + '   (a helyi ' + helyiPort + '-esről a ' + cim + ':' + port
        + '-re, másodpercenként)' + SZIN.vege);
      kiir(SZIN.halvany + 'A másik készüléken UGYANEZT kell futtatni, a te címedre.'
        + SZIN.vege);
      kiir(SZIN.halvany + 'Vég nélkül fúr, amíg össze nem ér. Kilépés: Ctrl+C' + SZIN.vege);
      kiir();

      const eredmeny = await pajzsfuras(helyiPort, cim, port, {
        idokorlat: 0,                 // 0 = vég nélkül
        tartsdNyitva: true,           // siker után a résen AZONNAL cserélünk
        utana: (e) => {
          // ⚠️ MŰSZER A NÉMA NEM-ESEMÉNYRE. Az első változat CSAK a sikeres kopogást írta
          // ki — ezért amikor a telefonon a küldés elbukott, a képernyő egyszerűen ÜRES
          // maradt, és órákig azt hihettük volna, hogy „fúr". Ami nem történik meg, azt
          // is ki kell írni, különben nem mérés, csak remény.
          if (e.mi === 'INDUL') {
            kiir(SZIN.halvany + '  ' + ora() + ' a fúró elindult (' + e.port + '-es port)'
              + SZIN.vege);
          }
          // ⭐ EZ A SZÁM AZ, AMIT BE KELL MONDANI A MÁSIKNAK — és mostantól ANNAK a
          // foglalatnak a portja, ami tényleg fúr. A `kulsoport` parancs külön foglalatot
          // nyit, tehát MÁS portot mérhet; 2026-08-30-án csak a NAT jóindulatán múlt,
          // hogy a bemondott szám stimmelt.
          if (e.mi === 'SAJAT-KULSO-CIM') {
            // ⭐ FELJEGYEZZÜK A SAJÁT FRISS UDP-CÍMÜNKET (2026-09-18) — innentől ez terjed
            // a cserén, és ettől tud egy társ a KÖVETKEZŐ bulin ide kopogni.
            // ⚠️ Csak a fúró foglalatáé érvényes: a leképezés a foglalathoz tartozik.
            frissUdpCimJegyzese(udpCimTarolo(), e.cim, e.port)
              .catch((hiba) => console.warn('a saját UDP-cím feljegyzése nem sikerült',
                { ok: hiba.message }));
            kiir(SZIN.jo + '  ⭐ KÍVÜLRŐL ÍGY LÁTSZOM: ' + e.cim + ':' + e.port + SZIN.vege);
            kiir(SZIN.vastag + '     EZT MONDD BE A MÁSIKNAK:' + SZIN.vege + SZIN.halvany
              + ' node koino/koino.js pajzsfuro ' + e.cim + ' ' + e.port + ' 7373'
              + SZIN.vege);
          }
          if (e.mi === 'SAJAT-CIM-NEM-MEGY') {
            // ⚠️ Nem végzetes: a fúrás megy tovább, csak nem tudjuk kiírni a számot.
            kiir(SZIN.halvany + '  (a saját külső címemet nem tudtam megmérni: '
              + e.ok + ')' + SZIN.vege);
          }
          if (e.mi === 'KULDES-BUKOTT' && e.hanyadik % 15 === 1) {
            kiir(SZIN.nem + '  ' + ora() + ' ✗ a KÜLDÉS bukott (' + e.hanyadik + '.): '
              + e.ok + SZIN.vege);
            kiir(SZIN.halvany + '    A csomag el sem indult — ez NEM a másik fél hibája.'
              + SZIN.vege);
          }
          if (e.mi === 'HIBA') {
            kiir(SZIN.nem + '  ' + ora() + ' ✗ hiba: ' + e.ok + SZIN.vege);
          }
          // 15 másodpercenként egy sor — hogy látszódjon, hogy él, de ne árassza el.
          if (e.mi === 'KOPOGTAM' && e.hanyadik % 15 === 1) {
            kiir(SZIN.halvany + '  ' + ora() + ' … fúrok (' + e.hanyadik + '. kopogás)'
              + SZIN.vege);
          }
          if (e.mi === 'KOPOG-ERKEZETT') {
            kiir(SZIN.jo + '  ← MEGJÖTT AZ Ő KOPOGÁSA (' + e.honnan + ')' + SZIN.vege);
          }
          if (e.mi === 'HALLAK-ERKEZETT') {
            kiir(SZIN.jo + '  ✓ ŐK IS HALLANAK MINKET (' + e.honnan + ')' + SZIN.vege);
          }
        }
      });

      kiir();
      if (eredmeny.mindketIrany) {
        kiir(SZIN.jo + '⭐ A PAJZS ÁTFÚRVA — mindkét irány működik.' + SZIN.vege);
        kiir(SZIN.halvany + '  ' + eredmeny.kuldott + ' kopogás, ' + eredmeny.kapott
          + ' válasz, ' + eredmeny.eltelt + ' ms alatt' + SZIN.vege);

        // ⭐ ÉS ITT A JUTALOM: a megnyílt résen AZONNAL megy a csere. Ugyanaz a
        // `parbeszed` fut, mint az őrjárat kapuján — csak a foglalat más (1. szabály).
        kiir();
        kiir(SZIN.vastag + 'CSERE A RÉSEN' + SZIN.vege);
        // ⚠️ A TCP-CÍMJEGYZÉK (`hirdetettCimek`) 2026-09-26 óta nem utazik (D69/2): a
        // címeket a friss UDP-jegyzék terjeszti.
        const fajlok = await fajlResz();
        const csere = await csereUdpResen(eredmeny.halo, cim, port, tar, KOINO, {
          ...await azonossagBeallitasa(),
          // ⭐⭐ A FÁJL-KÖR A RÉSEN IS MEGY (5.7) — enélkül nem tudnánk meg, mi van nála.
          fajlKerelem: fajlok.kerelem,
          fajlValasz: fajlok.valasz,
          fajlOlvas: fajlok.olvas
        });

        kiir(SZIN.jo + '  ✓ kaptam ' + csere.uj + ' új eseményt, küldtem ' + csere.kuldott
          + SZIN.vege + SZIN.halvany + ' (' + csere.korok + ' kör, '
          + adatMennyiseg({ bajtKuldott: csere.bajtKuldott, bajtKapott: csere.bajtKapott })
          + ')' + SZIN.vege);
        if (csere.kivulrolIgyLatszom) {
          // ⭐⭐ EZ A LEGJOBB FORRÁS A SAJÁT CÍMÜNKRE: nem egy tükör mondja, hanem a TÁRS,
          // arról a résről, amin épp beszélünk (2026-09-18). *A végleges tükör a társ.*
          await frissUdpCimJegyzese(udpCimTarolo(),
            csere.kivulrolIgyLatszom.cim, csere.kivulrolIgyLatszom.port);
          kiir(SZIN.halvany + '  Kívülről így látszol: ' + csere.kivulrolIgyLatszom.cim
            + ':' + csere.kivulrolIgyLatszom.port + SZIN.vege);
        }

        // ===== ⭐⭐⭐ ÉS A BÁJTOK IS ÁTJÖNNEK A RÉSEN (2026-09-14) =====
        //
        // ⛔ EDDIG ITT AZONNAL BEZÁRTUK A FOGLALATOT. A `fajlUdpResen` 2026-09-13 óta kész
        // volt és mérve is — de **egyetlen éles hívó nélkül**: a fájlokat csak a
        // `fajlokElhozasa` hozta, az pedig TCP-t nyit. *Vagyis épp abban a helyzetben, amiért
        // a pajzsfúrás létezik (két zárt router), a kép soha nem jött át.*
        //
        // ⭐ A CSERE MONDJA MEG, MIT LEHET KÉRNI TŐLE: a fájl-kör válasza (`fajlokNala`) az
        // a lista, amit kértem és nála megvan. *Nem kell új kérdezősködés — ugyanaz az elv,
        // mint az `ALLAS`-nál.*
        const kerhetok = Array.isArray(csere.fajlokNala) ? csere.fajlokNala : [];
        const fajlForras = (ervenyesTablaKulcs(csere.kapottTablaKulcs) ? csere.kapottTablaKulcs.alairo : null) ?? (cim + ':' + port);
        if (kerhetok.length) {
          await fajlTanulsag(fajlForras, kerhetok, cim + ':' + port);
        }

        kiir();
        kiir(SZIN.vastag + 'FÁJLOK A RÉSEN' + SZIN.vege + SZIN.halvany
          + '   (' + kerhetok.length + ' kérhető tőle)' + SZIN.vege);

        const randevu = await fajlRandevu(eredmeny.halo, cim, port, {
          // ⭐ A SZEREPHEZ A SAJÁT KÜLSŐ CÍMEM KELL — és azt épp az imént mondta meg a csere.
          sajatCim: csere.kivulrolIgyLatszom
            ? csere.kivulrolIgyLatszom.cim + ':' + csere.kivulrolIgyLatszom.port
            : null,
          kerhetok,
          blob: fajlBlobTarolo(KOINO),
          tar, koino: KOINO,
          // ⛔ D93/3: a zárt koinó nem szabad társának fájlt nem adunk.
          fajlOlvas: csere.tarsKorlatozva ? null : (lenyomat) => fajlBlobTarolo(KOINO).olvas(lenyomat),
          korlat: FAJL_KORLAT,
          ujKerhetok: szovegKepeiKeresre(fajlBlobTarolo(KOINO)),
          // ⭐ D114: a közös munka és a forrás-tudás a kézi csere randevúján is.
          kozosMunka: fajlMunkak, forras: fajlForras, fajlForrasok: fajlForrasTudas(fajlForras),
          kiszolgalasiKeret: kiszolgalasiKeretKapcsolo(),
          keretTars: { tabla: ervenyesTablaKulcs(csere.kapottTablaKulcs) ? csere.kapottTablaKulcs.alairo : null, cim },
          utana: (e) => {
            if (e.mi === 'SZEREP' && e.szerep === 'nem-tudom') {
              // ⚠️ A HIÁNYT KIMONDJUK (D19) — különben csak annyi látszana, hogy „nem jött".
              kiir(SZIN.nem + '  ⚠ Nem tudom, melyikünk kérdezzen előbb' + SZIN.vege
                + SZIN.halvany + ' (a társ nem mondta meg, hogyan lát kívülről) —'
                + ' ezért csak kiszolgálok.' + SZIN.vege);
            }
            if (e.mi === 'MEGJOTT') {
              kiir(SZIN.jo + '  ✓ megjött egy fájl' + SZIN.vege + SZIN.halvany
                + ' (' + adatMennyiseg({ bajtKuldott: e.bajt }) + ')' + SZIN.vege);
            }
            if (e.mi === 'NEM-JOTT') {
              kiir(SZIN.halvany + '  · egy fájl nem jött át: ' + (e.ok ?? 'ismeretlen ok')
                + SZIN.vege);
            }
          }
        });

        if (randevu.kesz || randevu.bukott || randevu.kiszolgalt) {
          kiir(SZIN.halvany + '  ' + randevu.kesz + ' megérkezett · ' + randevu.bukott
            + ' nem sikerült · ' + randevu.kiszolgalt + ' fájlt adtam neki'
            + (randevu.korlatElerve ? ' · a többi a következő körben (kérés-korlát)' : '')
            + SZIN.vege);
        }

        // ⛔ A FOGLALATOT CSAK MOST ZÁRJUK — a fájlok utolsó szelete után.
        eredmeny.halo.close();
      } else if (eredmeny.sikerult) {
        // ⚠️ FÉL SIKER: az ő csomagjai átjönnek, a mieink nem. Ez is mérés, nem hiba.
        kiir(SZIN.nem + '⚠ FÉL SIKER: az ő kopogása átjött, a miénk nem.' + SZIN.vege);
        kiir(SZIN.halvany + '  Vagyis a MI routerünk enged befelé, az övék nem.' + SZIN.vege);
      } else {
        kiir(SZIN.nem + '✗ Nem jött át semmi (' + eredmeny.kuldott + ' kopogás, '
          + eredmeny.eltelt + ' ms).' + SZIN.vege);
        kiir(SZIN.halvany + '  Vagy nem futott a másik oldalon, vagy mindkét router zár.'
          + SZIN.vege);
      }
      break;
    }

    case 'hozd': {
      // ===== ⭐ BÖNGÉSZŐ-LEKÉRÉS: „add ide EZT az egy entitást" =====
      //
      // ⭐ MIÉRT KELL, HA VAN CSERE? Csaba észrevétele: *„böngészés közben az összes
      // entitásnak elérhetőnek kell lennie."* A rendes csere MINDENT áthoz, amit a másik
      // tud és mi nem — böngészéskor viszont EGYETLEN entitás kell, most azonnal. A
      // periodikus csere erre elvileg alkalmatlan: hiába ér körbe minden esemény öt perc
      // alatt, ha egy nem tárolt entitást akarok megnyitni.
      //
      // ⭐ 2026-09-26 ÓTA A KAPUN (D69/2): minden jelöltre EGYSZERRE kopogunk, és akinél
      // megnyílik a rés, attól kérjük a szeletet (`szeletUdpResen`). ⚠️ A túloldalon a
      // rendes csere-munka áll — az első üzenetünkből látja, hogy csak egy szeletet kérünk.
      const entitas = ervek[0];
      if (!entitas) {
        throw new Error('Melyik entitást hozzam?'
          + '\n  node koino/koino.js hozd <azonosító> [cím] [port]');
      }

      const jegyzekTarolo = szeletJegyzekTarolo();
      const tarolo = tarsakTarolo();

      // ----- KIT KÉRDEZZÜNK MEG? -----
      // 1. akit megadtak · 2. akinél KORÁBBAN LÁTTUK ezt az entitást · 3. az induló címek
      let cimek;
      if (ervek[1]) {
        cimek = [{ hoszt: ervek[1], port: parseInt(ervek[2], 10) || ALAP_PORT }];
      } else {
        const jegyzek = await jegyzekTarolo.olvas();
        const ismertek = szeletCimei(jegyzek, entitas);
        const tarsak = tarsakSorrendje(await tarolo.olvas());
        // ⭐ D91/3: ha a raj nem ismer tartót, a KÖZVETLEN KERESÉS a DHT-n (gyorsító, elhagyható — ~3 KB):
        // akik ezt a szeletet hirdetik (a vakított témán). ⚠️ Bizalom nem jár vele (3. szabály).
        let dhtTalalt = [];
        if (!ismertek.length) {
          try {
            dhtTalalt = (await cimjegyzekKeresese(cimjegyzekTema(KOINO, 'szelet', entitas)))
              .map((t) => ({ hoszt: t.cim, port: t.port }));
          } catch { /* a DHT segédeszköz: ha nem elérhető, a társak maradnak */ }
          if (dhtTalalt.length) {
            kiir(SZIN.halvany + '  📇 a DHT-n ' + dhtTalalt.length + ' hirdető ennél a szeletnél' + SZIN.vege);
          }
        }
        // A szelet-jegyzék ELÖL: ott biztosan megvolt egyszer; utána a hirdetők, végül az induló címek.
        const volt = new Set();
        cimek = [...ismertek, ...dhtTalalt, ...tarsak]
          .map((c) => ({ hoszt: c.hoszt, port: Number(c.port) }))
          .filter((c) => !volt.has(c.hoszt + ':' + c.port) && volt.add(c.hoszt + ':' + c.port));
      }

      if (!cimek.length) {
        kiir(SZIN.nem + 'Nincs kit megkérdezni.' + SZIN.vege);
        kiir(SZIN.halvany + 'Adj meg egy címet, vagy vegyél fel társat: node koino/koino.js tars <cím>'
          + SZIN.vege);
        break;
      }

      kiir(SZIN.vastag + 'HOZOM: ' + entitas.slice(0, 12) + '…' + SZIN.vege
        + SZIN.halvany + '   (' + cimek.length + ' címre kopogok egyszerre)' + SZIN.vege);

      // ⭐⭐ B/2 (D75): amit nem vállalok, az az ÁTMENETI tárba kerül (eldobható) — ugyanazon a kapun át.
      const vallalas = await sajatVallalasa((await kepetKeszit()).allapot);
      const celTar = vallalas.szeletek.has(entitas) ? tar : atmenetiCel;
      const azonossag = await azonossagBeallitasa();
      const { kapu } = await keziKapuNyitasa((halo, t) =>
        szeletUdpResen(halo, t.cim, t.port, celTar, KOINO, entitas, azonossag));
      let kor;
      try {
        kor = await kapu.kopog(cimek.map((c) => ({ cim: c.hoszt, port: c.port })),
          { idokorlat: KEZI_KOPOGAS_MS });
      } finally {
        kapu.zar();
      }

      // ⚠️ EGY ELÉRHETETLEN CÍM NEM HIBA, HANEM A NORMÁLIS MŰKÖDÉS (D33) — megnevezzük, megyünk tovább.
      let siker = null;
      for (const e of kor.eredmenyek) {
        if (e.ok && !siker) {
          siker = { ...e.eredmeny, cim: { hoszt: e.cim, port: e.port } };
          kiir(SZIN.jo + '  ✓ ' + e.cim + ' — ' + e.eredmeny.kapott + ' esemény, ebből ÚJ: '
            + e.eredmeny.uj + SZIN.vege + SZIN.halvany + ' (' + adatMennyiseg(e.eredmeny) + ')'
            + SZIN.vege);
        } else if (!e.ok) {
          kiir(SZIN.halvany + '  · ' + e.cel.cim + ' ' + e.cel.port + ' — ' + e.hiba + SZIN.vege);
        }
      }

      if (!siker) {
        // ⭐ EZ NEM HIBA, HANEM ÁLLAPOT (D21 mintája): „jelenleg nem elérhető". A koino
        // bejelent, nem bíráskodik (D19).
        kiir();
        kiir(SZIN.nem + 'Ez az entitás JELENLEG NEM ELÉRHETŐ.' + SZIN.vege);
        kiir(SZIN.halvany + 'Vagy senki sem tartja már (D14: ami senkinek nem kell, elfelejtődik),'
          + ' vagy a tartói épp alszanak. Kívülről a kettő nem különböztethető meg.' + SZIN.vege);
        break;
      }

      // ⭐ B/2: hova került — és a megnézése (a „megnézett” ettől marad tovább az átmeneti tárban).
      if (celTar === atmenetiCel) {
        await atmeneti.megnezve(entitas);
        kiir(SZIN.halvany + '  → az átmeneti tárba (nem vállalod — ha kell a hely, ez megy el elsőként,'
          + ' ha rég nem nézted meg)' + SZIN.vege);
      }

      // ----- ⭐ MEGJEGYEZZÜK, KINÉL VOLT MEG -----
      // Név nélkül: csak cím, port és idő (D6). A döntéshez soha nem kell KONKRÉT embert
      // elérni, csak valakit, akinél megvan.
      if (siker.kapott > 0) {
        const jegyzek = await jegyzekTarolo.olvas();
        await jegyzekTarolo.ir(szeletJegyzekTakaritasa(
          szeletCimMegjegyzese(jegyzek, entitas, siker.cim.hoszt, siker.cim.port)
        ));
      }

      kiir();
      kiir(SZIN.halvany + 'Az állapot: node koino/koino.js' + SZIN.vege);
      break;
    }

    case 'csere': {
      // ⭐ 2026-09-26 ÓTA A KAPUN (D69/2): a kézi csere ugyanazt a munkát végzi, mint az
      // őrjárat és a postaláda (`resMunkaKeszito`) — csere, kötés, tanulás, fájl-randevú.
      // *Ami csak az őrjáratban megy, arról nem tudjuk, hogy kézzel is működik-e — és fordítva.*
      const tarolo = tarsakTarolo();
      const kezdet = Date.now();

      // ===== EGY MEGADOTT CÍM =====
      // Marad, mert kell: az első társat valahonnan meg kell adni (kézzel átvitt címmel),
      // és a mérésekhez is ez a legrövidebb út. ⚠️ NAT mögött csak akkor megy át, ha a
      // másik is kopog ránk (vagy a wifin vagytok) — két idegen router között a
      // `pajzsfuro` az út, mindkét oldalon.
      if (ervek[0]) {
        const cim = ervek[0];
        const port = parseInt(ervek[1], 10) || ALAP_PORT;
        const { kor, allando, kapuPort } = await keziCsere([{ hoszt: cim, port }]);
        const e = kor.eredmenyek[0];
        if (!e?.ok) throw new Error(keziHibaSzovege(e, cim, port));
        const eredmeny = e.eredmeny;

        // ⚠️ MÁSIK KOINO: ez NEM hiba, csak nincs miről beszélni. Ki kell mondani, mert
        // különben a „kaptam 0, küldtem 0" úgy néz ki, mintha minden rendben lenne.
        if (eredmeny.masKoino) {
          kiir(SZIN.nem + 'Ez a készülék egy MÁSIK koinóé: ' + eredmeny.masKoino + SZIN.vege);
          kiir(SZIN.halvany + 'A tiéd: ' + KOINO + ' — nem cseréltünk semmit, és ez így helyes.'
            + SZIN.vege);
          kiir(SZIN.halvany + 'Ha ugyanabban a koinóban akartok lenni, a KOINO_AZONOSITO'
            + ' változónak kell egyeznie.' + SZIN.vege);
          break;
        }

        kiir(SZIN.jo + 'Csere kész' + SZIN.vege + SZIN.halvany
          + ' — kaptam ' + eredmeny.uj + ' új eseményt, küldtem ' + eredmeny.kuldott
          + ' (' + eredmeny.korok + ' kör, ' + (Date.now() - kezdet) + ' ms, '
          + adatMennyiseg({ bajtKuldott: eredmeny.bajt }) + ')' + SZIN.vege);
        if (!allando) {
          kiir(SZIN.halvany + '  (a ' + ALAP_PORT + '-es portot egy futó őrjárat vagy postaláda'
            + ' fogja — a ' + kapuPort + '-esről kopogtam)' + SZIN.vege);
        }

        // Akivel egyszer sikerült, azt megjegyezzük — különben minden cserénél újra kézzel
        // kellene beírni a címet. ⚠️ A `modosit()`-on át, mint a lista minden más írása.
        let volt = false;
        await tarolo.modosit((lista) => {
          volt = lista.some((t) => t.hoszt.toLowerCase() === cim.toLowerCase()
            && Number(t.port) === port);
          return tarsHozzaadasa(lista, { hoszt: cim, port }).map((t) =>
            (t.hoszt.toLowerCase() === cim.toLowerCase() && Number(t.port) === port)
              ? { ...t, utoljara: Date.now(), sikertelen: 0 } : t);
        });
        if (!volt) kiir(SZIN.halvany + 'Felvettem a társak közé (levenni: tars torol '
          + cim + ' ' + port + ')' + SZIN.vege);

        kiir(SZIN.halvany + 'Az állapot: node koino/koino.js' + SZIN.vege);
        break;
      }

      // ===== MINDENKI A LISTÁRÓL — egyszerre, a kapun =====
      const lista = await tarolo.olvas();
      if (!lista.length) {
        throw new Error('Nincs egyetlen társ sem. Vegyél fel egyet:'
          + '\n  node koino/koino.js tars <cím> [port] [név]'
          + '\nvagy adj meg most egy címet:  node koino/koino.js csere <cím> [port]');
      }

      kiir(SZIN.vastag + 'CSERE ' + lista.length + ' társsal' + SZIN.vege);

      const { kor } = await keziCsere(lista.map((t) => ({ hoszt: t.hoszt, port: Number(t.port) })));
      const nevek = new Map(lista.map((t) => [t.hoszt + ':' + Number(t.port), t.nev]));
      let osszUj = 0, osszKuldott = 0, osszBajt = 0;
      for (const e of kor.eredmenyek) {
        const nev = nevek.get(e.cel.cim + ':' + e.cel.port);
        const cimke = nev ? nev : e.cel.cim + ' ' + e.cel.port;
        if (e.ok && e.eredmeny?.masKoino) {
          kiir(SZIN.halvany + '  · ' + cimke + ' — egy MÁSIK koinóé (' + e.eredmeny.masKoino
            + '), nincs mit cserélni' + SZIN.vege);
          continue;
        }
        if (e.ok) {
          osszUj += e.eredmeny.uj; osszKuldott += e.eredmeny.kuldott; osszBajt += e.eredmeny.bajt;
          kiir(SZIN.jo + '  ✓ ' + cimke + SZIN.vege + SZIN.halvany
            + ' — kaptam ' + e.eredmeny.uj + ', küldtem ' + e.eredmeny.kuldott
            + ' (' + e.eredmeny.korok + ' kör, ' + adatMennyiseg({ bajtKuldott: e.eredmeny.bajt })
            + ')' + SZIN.vege);
        } else {
          kiir(SZIN.halvany + '  · ' + cimke + ' — nem érhető el: ' + e.hiba + SZIN.vege);
        }
      }
      // ⭐ A KÖR MEGFIGYELÉSEI A FRISS LISTÁRA — ugyanaz az őr, mint az őrjáratnál.
      // ⚠️ *Ha a hívóra bíznánk, az egyik út megtenné, a másik elfelejtené.*
      await tarolo.modosit((friss) =>
        megfigyelesekRavezetese(friss, kopogasMegfigyelesei(lista, kor.eredmenyek)));

      kiir();
      // ⚠️ A NULLA SIKER SEM HIBA: a koino ettől még működik, csak most nem terjedt.
      // Ezért nem `throw`, és ezért nem 1-es kilépési kód (2. szabály).
      kiir((kor.sikeres ? SZIN.jo : SZIN.nem) + kor.sikeres + '/' + kor.eredmenyek.length
        + ' társ vette fel' + SZIN.vege + SZIN.halvany
        + ' — összesen ' + osszUj + ' új esemény, ' + osszKuldott + ' küldött'
        + ' (' + (Date.now() - kezdet) + ' ms, ' + adatMennyiseg({ bajtKuldott: osszBajt })
        + ')' + SZIN.vege);
      if (!kor.sikeres) {
        kiir(SZIN.halvany + 'Egy társ sem válaszolt. Ez nem hiba — később újra megy;'
          + ' addig is minden művelet mehet tovább helyben.' + SZIN.vege);
      }

      kiir(SZIN.halvany + 'Az állapot: node koino/koino.js' + SZIN.vege);
      break;
    }

    // ===================================
    // A FELÜLET (Szakasz 5 / 5.1) — a helyi kapu
    // ===================================
    //
    // ⚠️ NE KEVERD a `kapu` paranccsal: az a ROUTERT kéri meg, hogy engedjen be kívülről;
    // ez itt a SAJÁT GÉPEN nyit egy ajtót a böngészőnek. A kettőnek semmi köze egymáshoz.
    //
    // ⭐ A 4. SZABÁLY ITT LÁTSZIK: ez a parancs KÉNYELEM. Amit a lapon meg lehet csinálni,
    // azt a parancssorból is meg lehet — ha a böngésző egyszer nem elérhető, a koino
    // ugyanúgy működik, csak kevésbé kényelmesen.
    case 'felulet': {
      const port = parseInt(ervek[0], 10) || FELULET_PORT;

      // ⭐ A KEZELŐ ITT SZÜLETIK, NEM A KAPUBAN. A kapu semmit nem tud a koinóról; a
      // domain-tudás mind ezen az egy függvényen megy át. Ez tartja a nyilat
      // „felület → program" irányba (felulet_terv 3. pont).
      //
      // ⏸️ MA KÉT VÉGPONT VAN (5.1: `en`, 5.2: `pakli`). A többi a `szakasz5_terv.md`
      // térképe szerint jön — de a LÉNYEG már itt eldőlt: a lap SOSE kérhet „mindent".
      //
      // ===================================
      // ⭐⭐ A FELÜLET AKTÍV KOINÓJA (5.6) — futás közben váltható
      // ===================================
      //
      // ⛔ A PARANCSSOR EGY KOINÓRA SZÓL, A FELÜLET NEM. Egy `node koino.js gondolat …`
      // hívás egyetlen koinóban dolgozik, és ez helyes: a `KOINO_AZONOSITO` indításkor
      // eldől. A **belépő tér** viszont a koinók FÖLÖTT áll — a lap onnan lép be az
      // egyikbe, majd vissza, majd egy másikba, **újraindítás nélkül**.
      //
      // ⭐ Ezért tart a felület koinónként egy **nyitott állapotot**: saját tár, saját
      // környezet (az íráshoz) és saját pakli-nézet. ⚠️ A **kulcs közös** — a D15 szerint a
      // személyazonosság a készüléké, nem a koinóé; a *tagság* az, ami koino-helyi.
      //
      // ⚠️ A pakli-nézet KOINÓNKÉNT külön: a horgony „az első N esemény" képe, és az
      // eseményhalmaz koinónként más. Egy közös nézet a váltás után **másik koino képét**
      // adná vissza a gyorsítótárból.
      // ⭐ D70: a felület a futása végéig tartja az író-szerepet, ha most senki nem író.
      await tar.iroLeszek();
      const nyitottKoinok = new Map();
      let aktivKoino = KOINO;

      async function aktivAllapot() {
        if (!nyitottKoinok.has(aktivKoino)) {
          // Az indításkori koino tárát nem nyitjuk meg másodszor.
          // ⭐ D70: a másik koinó tára is az író mögött — a felület ott is csak átad.
          const t = aktivKoino === KOINO ? tar : await koinoTaraNyitasa(aktivKoino);
          // ⭐ A felület is a futása végéig tartja az író-szerepet (ha most senki nem író).
          await t.iroLeszek();
          nyitottKoinok.set(aktivKoino, {
            koino: aktivKoino,
            tar: t,
            kornyezet: { koino: aktivKoino, kulcspar, szerzo, tar: t, darabTar: fajlBlobTarolo(aktivKoino), lancTarolo: lancTarolo(aktivKoino) },
            // ⭐ D95/1: a lap is az ellenőrzött lezárási összegzésekből dönt (az indításkori koinóé — azé van tárolója).
            // ⭐ A ház (D100): a szigorú (b) alatt a lap is csak a tartott szeletre alkalmazza a D14-et (72. mérés).
            pakliNezet: ujPakliNezet(aktivKoino === KOINO ? { osszegzesek: ellenorzottOsszegzesek, tartott: tartottSzeleteim } : {})
          });
        }
        return nyitottKoinok.get(aktivKoino);
      }

      // ⭐ B/2: az átmeneti tár az INDÍTÁSKORI koinóé — a kezelő árnyékolja a `tar` nevet, ezért itt jegyezzük meg.
      const sajatKoinoTara = tar;
      const kezelo = async ({ modszer, utvonal, kereses, test }) => {

        // ⚠️⚠️ SZÁNDÉKOS ÁRNYÉKOLÁS, és ez a kulcsa az egésznek. A kezelő MINDEN sora az
        // **aktív** koinóra vonatkozik, nem az indításkorira — a nevek viszont ugyanazok
        // maradnak, ezért egyetlen végpont kódját sem kellett átírni a váltás miatt.
        // *(A `kepetKeszit` a kivétel: annak paraméterként adjuk át, mert modul szintű.)*
        const aktiv = await aktivAllapot();
        const tar = aktiv.tar;
        const KOINO = aktiv.koino;
        const kornyezet = aktiv.kornyezet;
        const pakliNezet = aktiv.pakliNezet;
        // ⭐ B/2: az olvasók (a pakli) a két tár nézetét kapják — a saját koinónknál az átmeneti tár is látszik.
        const sajatKoino = tar === sajatKoinoTara;
        const olvasoTar = sajatKoino ? ketTarNezet(tar, atmeneti) : tar;

        // ===================================
        // ⭐⭐ ÍRÁS (5.5) — itt születik esemény a lapról
        // ===================================
        //
        // ⚠️ MINDEN ÍRÁS EGY MŰVELET a `js/muveletek.js`-ből, ami EGY ALÁÍRT ESEMÉNYT hoz
        // létre. Nincs „mentés az adatbázisba", és a felület nem kerülhet meg semmit: az
        // esemény ugyanazon az `esemenyMentese` kapun megy be, mint a hálózatról érkező
        // (3. szabály). ⭐ A szabályokat a SZÁMÍTÁS őrzi — ha a lap szabálysértőt küld, az
        // esemény létrejön, de nem fog számítani. *A felület nem véd, és nem is kell.*
        // ===================================
        // ⭐⭐ D101 ⑥: AZ ÉRTESÍTÉSEK — a postafiók és a beállítások (helyi feljegyzés, nem esemény)
        // ===================================
        //
        // A prototípus útvonalai és alakja (`ErtesitesekModal`, `ErtesitesiBeallitasModal`, a kártyák számlálója). Itt
        // nincs szerver, ami írna: a postafiókot a készülék számolja (`postafiokFrissitese`), a beállítás helyi fájl.
        if (utvonal === '/api/ertesitesek' || utvonal.startsWith('/api/ertesitesek/')
          || utvonal === '/api/ertesitesi-beallitasok' || utvonal.startsWith('/api/ertesitesi-beallitasok/')) {
          if (!sajatKoino) return { adat: { success: true, adatok: { ertesitesek: [], osszes: 0, olvasatlan: 0, lapokSzama: 0 } } };
          const kozos = { tar: olvasoTar, koino: KOINO, nezet: pakliNezet, bemondasok: await bemondasok(), szerzo };
          const tarolo = ertesitesTarolo(KOINO);
          const reszek = utvonal.split('/').slice(2);           // ['ertesitesek', …] | ['ertesitesi-beallitasok', …]
          let szigoru = false;
          try { szigoru = !(await kiszolgalasBeallitas()).mindent; } catch { szigoru = false; }

          if (reszek[0] === 'ertesitesek') {
            if (modszer === 'GET' && reszek.length === 1) {
              const { pf, entitasok } = await postafiokFrissitese(kozos);
              const lap = postafiokLapja(pf, { lap: parseInt(kereses.get('lap'), 10), lapMeret: parseInt(kereses.get('lapMeret'), 10),
                agazat: kereses.get('agEntitasId') || null });
              lap.ertesitesek = lap.ertesitesek.map((t) => ({ ...t, entitasCim: entitasok?.get(t.entitasId)?.cim ?? null }));
              return { adat: { success: true, adatok: lap, koinoMegjegyzes: postafiokMegjegyzes(szigoru) } };
            }
            if (modszer === 'GET' && reszek[1] === 'olvasatlan-szam') {
              const { pf } = await postafiokFrissitese({ ...kozos, szunet: POSTAFIOK_SZAMLALO_SZUNET });
              return { adat: { success: true, adatok: { olvasatlan: pf.tetelek.filter((t) => !t.olvasva).length } } };
            }
            if (modszer === 'PATCH' && reszek[1] === 'mind-olvasott') {
              const db = await postafiokModositasa(KOINO, (pf) => olvasottnakJelol(pf, { agazat: kereses.get('agEntitasId') || null }));
              return { adat: { success: true, adatok: { modositottDarab: db } } };
            }
            if (modszer === 'PATCH' && reszek[2] === 'olvasott' && reszek[1]) {
              const t = await postafiokModositasa(KOINO, (pf) => {
                olvasottnakJelol(pf, { id: reszek[1] });
                return pf.tetelek.find((x) => x._id === reszek[1]) ?? null;
              });
              return t ? { adat: { success: true, adatok: t } } : { allapot: 404, adat: { success: false, message: 'Az értesítés nem található' } };
            }
            if (modszer === 'DELETE' && reszek.length === 2) {
              const t = await postafiokModositasa(KOINO, (pf) => {
                const i = pf.tetelek.findIndex((x) => x._id === reszek[1]);
                return i < 0 ? null : pf.tetelek.splice(i, 1)[0];
              });
              return t ? { adat: { success: true, adatok: t } } : { allapot: 404, adat: { success: false, message: 'Az értesítés nem található' } };
            }
          } else {
            const beallitasok = beallitasokAlakja(await tarolo.beallitasOlvas());
            if (reszek[1] === 'globalis') {
              if (modszer === 'PUT') {
                const uj = globalisMentese(beallitasok, test ?? {});
                await tarolo.beallitasIr(uj);
                return { adat: { success: true, adatok: uj.globalis } };
              }
              if (modszer === 'GET') {
                const pf = postafiokAlakja(await tarolo.postafiokOlvas());
                return { adat: { success: true, adatok: beallitasok.globalis,
                  koinoMegjegyzes: 'A koinóban a levél helyett a készüléked saját értesítése jön (felugró értesítés — D103):'
                    + ' ugyanazokról, amiket kipipáltál, amikor a koino fut (a felület vagy az őrjárat).'
                    + (pf.kezbesites.hiba ? ' ⚠️ Legutóbb nem sikerült: ' + pf.kezbesites.hiba + '.' : '') } };
              }
            }
            if (modszer === 'GET' && reszek.length === 1) {
              return { adat: { success: true, adatok: Object.values(beallitasok.entitasok).map((b) => ({ ...b, _id: b.entitasId })) } };
            }
            if (modszer === 'PUT' && reszek.length === 1) {
              const az = typeof test?.entitasId === 'string' ? test.entitasId : '';
              if (!azonositoAlaku(az)) return { allapot: 400, adat: { success: false, message: 'Hiányzó vagy hibás entitás azonosító' } };
              const uj = beallitasMentese(beallitasok, az, test);
              await tarolo.beallitasIr(uj);
              return { adat: { success: true, adatok: { ...uj.entitasok[az], _id: az } } };
            }
            if (modszer === 'GET' && (reszek[1] === 'ervenyes' || reszek[1] === 'entitas') && reszek[3]) {
              const az = decodeURIComponent(reszek[3]);
              if (reszek[1] === 'entitas') {
                const b = beallitasok.entitasok[az];
                return { adat: { success: true, adatok: b ? { ...b, _id: az } : null } };
              }
              const { entitasok } = await ertesitesiKep(olvasoTar, KOINO, { szerzo, nezet: pakliNezet, bemondasok: kozos.bemondasok });
              return { adat: { success: true, adatok: ervenyesBeallitas(beallitasok, entitasok, az) } };
            }
            if (modszer === 'DELETE' && reszek.length === 2) {
              const az = decodeURIComponent(reszek[1]);
              if (!beallitasok.entitasok[az]) return { allapot: 404, adat: { success: false, message: 'A beállítás nem található' } };
              delete beallitasok.entitasok[az];
              await tarolo.beallitasIr(beallitasok);
              return { adat: { success: true, adatok: { _id: az } } };
            }
          }
          return { allapot: 404, adat: { success: false, message: 'ismeretlen értesítés-útvonal' } };
        }

        if (modszer === 'POST' || modszer === 'PUT' || modszer === 'PATCH') {

          // ===================================
          // ⭐⭐ D112 ⑤: A FELDERÍTÉS — indítás (vagy újra) és törlés a lapról
          // ===================================
          //
          // A lap csak kéri (7. szabály): a beállítás határait a program szabja (`felderites.js`), a felderítést az őrjárat
          // végzi; itt az első lépés fut (a kérések felvétele). Csak a saját (az indításkori) koinóban.
          if (utvonal === '/api/felderites' || utvonal === '/api/felderites/torol') {
            if (!sajatKoino) return { allapot: 400, adat: { hiba: 'Felderíteni csak a saját koinódban lehet.' } };
            try {
              if (utvonal === '/api/felderites/torol') {
                const j = await felderitesJegyzekOlvasasa();
                const f = j.felderitesek.find((x) => x.az === test?.az);
                if (!f) return { allapot: 404, adat: { hiba: 'Nincs ilyen felderítés.' } };
                await atmeneti.rogzitesFeloldasa(f.az);
                await felderitesJegyzekIrasa(felderitesTorlese(j, f.az));
                return { adat: { success: true, torolve: f.az } };
              }
              const szam = (v) => (Number.isInteger(v) ? v : undefined);
              const { jegyzek, felderites: f, ujra } = ujFelderites(await felderitesJegyzekOlvasasa(), {
                ag: test?.ag, k: szam(test?.k), melyseg: szam(test?.melyseg), torzs: test?.torzs === true, mb: szam(test?.mb)
              }, Date.now(), 'f-' + randomUUID().slice(0, 8));
              await felderitesJegyzekIrasa(jegyzek);
              const kor = await felderitesKor();
              return { adat: { success: true, felderites: f, ujra, kert: kor.kert } };
            } catch (hiba) {
              return { allapot: 400, adat: { hiba: hiba.message } };
            }
          }

          // ===================================
          // ⭐⭐ FÁJL FELTÖLTÉSE (5.7) — a tartalom-címzett tárba
          // ===================================
          //
          // ⚠️ BASE64 EGY JSON TESTBEN, NEM `multipart/form-data` — és ez szándékos.
          // Az 5.5 harmadik őre szerint a kapu **csak `application/json` testet** fogad el,
          // mert a JSON tartalomtípus **kötelezővé teszi** a böngésző előellenőrzését, amit
          // a kapunk nem enged át — *így a böngésző maga állítja meg az idegen írást.*
          // ⛔ Egy `multipart` feltöltés ezt az őrt kerülné meg; a base64 ára (+33% egy
          // HELYI kérésen, hálózat nélkül) ennél sokkal olcsóbb.
          //
          // ⭐ A VÁLASZ `{ url }`, mert az örökölt `FeltoltesKezelo` ezt várja — és az `url`
          // a fájl LENYOMATÁRA mutat, ami egyben az ellenőrzés kulcsa is.
          if (utvonal === '/api/feltoltes/kep' || utvonal === '/api/feltoltes/fajl') {
            const { adat: base64, nev } = test ?? {};
            if (typeof base64 !== 'string' || !base64) {
              return { allapot: 400, adat: { hiba: 'nincs mit feltölteni' } };
            }

            let bajtok;
            try {
              bajtok = new Uint8Array(Buffer.from(base64, 'base64'));
            } catch {
              return { allapot: 400, adat: { hiba: 'a fájl nem értelmezhető' } };
            }

            try {
              const { lenyomat, meret, mar } = await fajlBlobTarolo(KOINO).ir(bajtok);
              return {
                adat: {
                  // ⭐ A NÉV A LENYOMAT — ugyanaz a kép kétszer beszúrva EGY fájl a lemezen.
                  url: '/api/fajl/' + lenyomat,
                  lenyomat, meret, mar,
                  nev: typeof nev === 'string' ? nev : null
                }
              };
            } catch (hiba) {
              // ⚠️ A méret-korlát ŐSZINTE hiba, nem néma csonkítás.
              return { allapot: 413, adat: { hiba: hiba.message } };
            }
          }

          // ----- ⭐⭐ KOINO-VÁLTÁS (5.6) — belépés a térről egy koinóba -----
          //
          // ⚠️ EZ NEM ÍR ESEMÉNYT, és ez fontos. A D15 szerint nincs bejelentkezés: a
          // személyazonosság a készülék kulcsa, ami MINDEN koinóban ugyanaz. Amit itt
          // váltunk, az csak annyi: **melyik koinót nézi most ez a lap**. Semmi nem terjed,
          // semmi nem dől el tőle a koinóban (3. szabály).
          //
          // ⛔ CSAK LÉTEZŐRE VÁLTHATUNK. Az `esemenyTarNyitasa` LÉTREHOZNÁ a mappát, ha nem
          // létezik — vagyis egy elgépelt név némán új, üres koinót csinálna a téren.
          if (utvonal === '/api/ter/valt') {
            const kert = test?.koino;
            if (typeof kert !== 'string' || !kert) {
              return { allapot: 400, adat: { hiba: 'melyik koinóra váltsak?' } };
            }
            const ismertek = await ismertKoinok(alapHely());
            if (!ismertek.includes(kert)) {
              return { allapot: 404, adat: { hiba:
                'Ezt a koinót nem ismeri ez a készülék: ' + kert
                + ' — a téren csak azok szerepelnek, amiknek megvan az adata.' } };
            }

            aktivKoino = kert;
            return { adat: { data: { aktiv: aktivKoino } } };
          }

          // ===================================
          // ⭐⭐ GONDOLAT LÉTREHOZÁSA A LAPRÓL (5.7)
          // ===================================
          //
          // ⛔ EDDIG EZ A LAPRÓL NEM MENT. A pakli mutatta a gondolatokat, de újat csak a
          // parancssorból lehetett létrehozni — a `GondolatModal` a szövegszerkesztőre várt,
          // az pedig az 5.7-re. *A 4. szabály fordítottja: itt a kéz volt meg, a lap nem.*
          //
          // ⭐ HÁROM ALÁÍRT ESEMÉNY, nem egy „mentés". A prototípusban egy POST hozta létre
          // a gondolatot, a kezdő tudatpontot és a küszöbeit; a koinóban ez **három külön
          // esemény**, mert három külön állítás — és mindegyik ugyanazon az
          // `esemenyMentese` kapun megy be (3. szabály).
          if (utvonal === '/api/gondolat') {
            const { cim, szoveg, gondolatTipusId, kategoriaIds, szuloId, kezdoTudatpont } = test ?? {};
            if (typeof cim !== 'string' || !cim.trim()) {
              return { allapot: 400, adat: { hiba: 'Mi legyen a gondolat címe?' } };
            }

            // 1. A GONDOLAT
            const esemeny = await gondolatLetrehozasa(kornyezet, {
              cim: cim.trim(),
              // ⚠️ A szerkesztő BLOKKOK tömbjét adja, nem szöveget — a koino ezt tárolja
              // (`szoveg[].tartalom`), ahogy a prototípus is.
              szoveg: Array.isArray(szoveg) && szoveg.length ? szoveg : null,
              szulo: typeof szuloId === 'string' ? szuloId : null,
              gondolatTipus: typeof gondolatTipusId === 'string' ? gondolatTipusId : null,
              kategoriak: Array.isArray(kategoriaIds) ? kategoriaIds : []
            });

            // 2. A KEZDŐ TUDATPONT — ⛔ enélkül a koino EL IS FELEJTENÉ (D14).
            const pont = Number.isInteger(kezdoTudatpont) && kezdoTudatpont > 0
              ? kezdoTudatpont : KEZDO_PONT;
            const { allapot } = await kepetKeszit(0, tar, KOINO);
            await tudatpontRendezese(kornyezet, esemeny.azonosito, pont, 'aktiv',
              szetosztottPontok(allapot, szerzo));

            // 3. A KÜSZÖBÖK — csak ha a lap küldött. ⚠️ A medián (D4) egyetlen beadott
            // javaslattal is értelmes: a létrehozóé lesz az első szavazat a küszöbökről.
            const ertekek = kuszobokBefele(test);
            if (ertekek) await ertekJavaslat(kornyezet, esemeny.azonosito, ertekek);

            pakliNezet.horgony = null;      // a kép elavult
            return { adat: { data: { _id: esemeny.azonosito, cim: cim.trim() } } };
          }

          // ===================================
          // ⭐ D101 (az I. csoport): KATEGÓRIA ÉS GONDOLATTÍPUS LÉTREHOZÁSA A LAPRÓL
          // ===================================
          //
          // ⛔ EDDIG EZ CSAK A PARANCSSORBÓL MENT (`kategoria`, `gondolattipus`) — a művelet kész volt
          // (`besorolasLetrehozasa`: szülővel, a leírás szöveg-darabként, ikonnal), a kapun nem volt írási útja.
          // ⭐ Ugyanaz a három aláírt esemény, mint a gondolatnál: a létrehozás, a kezdő tudatpont (D14), és ha a lap
          // küldte, a küszöbök. A rakomány a prototípus modáljaié (`KategoriaModal`, `GondolatTipusModal` — bájtra
          // változatlanul): a `FormData`-t a lap JSON-ra fordította (`apiHelper.js` `formDataJsonna`), az ikon a
          // feltöltésen át a fájl lenyomat-címe lett; minden mező szöveg, a számokat itt olvassuk ki.
          if (utvonal === '/api/kategoria' || utvonal === '/api/gondolatTipus') {
            const kategoriaE = utvonal === '/api/kategoria';
            const { nev, leiras, ikon, kezdoTudatpont, szuloId } = test ?? {};
            if (typeof nev !== 'string' || !nev.trim()) {
              return { allapot: 400, adat: { hiba: 'Mi legyen a neve?' } };
            }
            // A leírás a szerkesztő BLOKK-tömbje, szövegként (a FormData csak szöveget visz).
            let blokkok = null;
            if (typeof leiras === 'string' && leiras.trim()) {
              try { blokkok = JSON.parse(leiras); } catch { blokkok = null; }
            } else if (Array.isArray(leiras)) blokkok = leiras;
            if (!Array.isArray(blokkok) || !blokkok.length) blokkok = null;

            let esemeny;
            try {
              esemeny = await (kategoriaE ? kategoriaLetrehozasa : gondolatTipusLetrehozasa)(kornyezet, {
                nev: nev.trim(),
                leiras: blokkok,
                ikon: typeof ikon === 'string' && ikon.trim() ? ikon.trim() : null,
                // ⭐ Alkategória: a szülő a kategória-kártyáé. A gondolattípusnak nincs szülője (a prototípusban sem).
                szulo: kategoriaE && typeof szuloId === 'string' && szuloId ? szuloId : null
              });
            } catch (hiba) {
              return { allapot: 400, adat: { hiba: hiba.message } };
            }

            // ⛔ A KEZDŐ TUDATPONT — enélkül a koino el is felejtené (D14).
            const kert = parseInt(kezdoTudatpont, 10);
            const pont = Number.isInteger(kert) && kert > 0 ? kert : KEZDO_PONT;
            const { allapot } = await kepetKeszit(0, tar, KOINO);
            await tudatpontRendezese(kornyezet, esemeny.azonosito, pont, 'aktiv', szetosztottPontok(allapot, szerzo));

            // A KÜSZÖBÖK — a FormData szövegként hozta őket; a kanonikus alak csak egész számot tűr.
            const egeszek = { ...test };
            for (const n of ['javaslatElfogadasiKuszob', 'reszveteliAranyKuszob', 'minimumDontesiIdo', 'maximumDontesiIdo']) {
              if (typeof egeszek[n] === 'string' && /^\d+$/.test(egeszek[n].trim())) egeszek[n] = parseInt(egeszek[n], 10);
            }
            const ertekek = kuszobokBefele(egeszek);
            if (ertekek) await ertekJavaslat(kornyezet, esemeny.azonosito, ertekek);

            pakliNezet.horgony = null;      // a kép elavult
            // A prototípus válaszának alakja (a modál az `onSiker`-nek adja tovább).
            const letrejott = { _id: esemeny.azonosito, id: esemeny.azonosito, nev: nev.trim(), ikon: esemeny.adat?.ikon ?? null };
            return { adat: { success: true, ...(kategoriaE ? { kategoria: letrejott } : { gondolatTipus: letrejott }) } };
          }

          // ===================================
          // ⭐⭐⭐ SZERKESZTÉSI JAVASLAT A LAPRÓL (5.8) — a `JavaslatModal` végpontja
          // ===================================
          //
          // ⛔ EDDIG A LAPRÓL CSAK SZAVAZNI LEHETETT, javasolni nem. A gépezet mögötte
          // teljes volt (négy művelet, töredék-modell, különválás, egyesítés) — csak a
          // felület hiányzott. *Ugyanaz a fajta rés, mint az „Új gondolat" volt.*
          //
          // ⚠️ A RAKOMÁNY A PROTOTÍPUS ALAKJA (`erintettEntitasok`, `modositasAdatok`), mert
          // az örökölt modal így küldi — a fordítás ITT történik, egy helyen. *A hívó a
          // régi; a válasz alkalmazkodik hozzá, nem fordítva.*
          if (utvonal === '/api/javaslat') {
            const { erintettEntitasok, indoklas, kezdoTudatpont } = test ?? {};
            if (!Array.isArray(erintettEntitasok) || !erintettEntitasok.length) {
              return { allapot: 400, adat: { hiba: 'melyik entitást érinti a javaslat?' } };
            }

            // ----- A FORDÍTÁS: a prototípus alakja → a koino `erintettek`-je -----
            const erintettek = [];
            for (const r of erintettEntitasok) {
              if (typeof r?.entitasId !== 'string') {
                return { allapot: 400, adat: { hiba: 'egy érintett entitásnak nincs azonosítója' } };
              }
              const muvelet = r.muvelet ?? 'Modositas';
              const m = r.modositasAdatok ?? {};

              let valtozas = null;
              if (muvelet === 'Modositas') {
                valtozas = {};
                // ⚠️ A koinóban a név MINDEN típusnál a `cim` (5.4) — a modal a
                // gondolatnál `cim`-et, egyébként `nev`-et küld.
                const ujCim = typeof m.cim === 'string' ? m.cim : m.nev;
                if (typeof ujCim === 'string' && ujCim.trim()) valtozas.cim = ujCim.trim();
                // ⭐ A szöveg BLOKK-TÖMB a szerkesztőből (5.7) — a végrehajtás ezt is érti.
                if (Array.isArray(m.szoveg)) valtozas.szoveg = m.szoveg.length ? m.szoveg : null;
                if (!Object.keys(valtozas).length) {
                  return { allapot: 400, adat: { hiba: 'a módosítás nem nevezett meg mezőt' } };
                }
              } else if (muvelet === 'Athelyezes') {
                // ⚠️ A gyökérre helyezés `null` — nem hiányzó mező, hanem kimondott érték.
                valtozas = { szulo: typeof m.ujSzuloId === 'string' ? m.ujSzuloId : null };
              } else if (muvelet === 'Egyesites') {
                // ⭐ Az ELSŐ érintett viszi a nevet (a többi beleolvad) — lásd `egyesit`.
                const ujCim = test?.egyesitesAdatok?.ujEntitasAdatok?.cim
                  ?? test?.egyesitesAdatok?.ujEntitasAdatok?.nev;
                valtozas = (erintettek.length === 0 && typeof ujCim === 'string' && ujCim.trim())
                  ? { cim: ujCim.trim() } : null;
              }

              erintettek.push({ entitas: r.entitasId, muvelet, valtozas });
            }

            // ⚠️ AZ `egyezmenyTarhelyId`-T SZÁNDÉKOSAN NEM HASZNÁLJUK. A prototípusban külön
            // meg kellett mondani, hova kerül az egyezmény; a koinóban ez **következmény**:
            // az egyezmény azonosítója AZONOS a javaslatéval (D17), a javaslat szülője
            // pedig az érintett entitás. *A jó szerkezet elvette a mező dolgát.*

            let e;
            try {
              // ⛔ A JAVASLAT IS ENTITÁS — tudatpont nélkül a koino elfelejtené (D14). A kezdő
              // pontot a művelet teszi fel, a szavazat előtt; több érintettnél a töredékekre oszlik (D85).
              e = await javaslatLetrehozasa(kornyezet, {
                erintettek,
                indoklas: (Array.isArray(indoklas) && indoklas.length) ? indoklas : null,
                fajta: 'szerkesztesi',
                pont: Number.isInteger(kezdoTudatpont) && kezdoTudatpont > 0 ? kezdoTudatpont : KEZDO_PONT
              });
            } catch (hiba) {
              return { allapot: 400, adat: { hiba: hiba.message } };
            }

            pakliNezet.horgony = null;
            // ⭐ A modal `eredmeny?.javaslat`-ot olvas — a válasz ehhez igazodik.
            return { adat: { javaslat: { _id: e.azonosito } } };
          }

          // ===================================
          // ⭐⭐ A SZERKESZTÉS: JAVASLAT, NEM KÖZVETLEN ÁTÍRÁS
          // ===================================
          //
          // ⚠️⚠️ EZT ELŐSZÖR ELRONTOTTAM (Csaba helyreigazítása, 2026-09-12). Azt hittem, a
          // prototípusban a szerző **közvetlenül** átírhatta a gondolatát, és ezért a
          // végpontot őszinte 400-zal zártam le. ⭐ **A prototípusban is javaslat →
          // egyezmény mentén megy a szerkesztés** — csak ha a szerző az EGYETLEN
          // tudatpont-tulajdonos, akkor 100% támogatottság mellett **azonnal megtörténik**.
          //
          // ⭐ Vagyis nincs itt kivétel és nincs külön út: ugyanaz a gépezet fut, csak
          // egytagú választókörrel. *A modell nem szigorúbb a prototípusnál — a látszólagos
          // szigor az én hibám volt.*
          //
          // ⚠️ AMI NEM AZONNAL LESZ: a `minimumDontesiIdo`. Ha a gondolatnak nincs 0-s
          // minimuma, a saját szerkesztésed is kivárja azt az időt — a koino alapértéke
          // **1 nap**, a prototípusé **0** volt. *(Ez egy nyitott különbség, és nem itt
          // dől el: az `ALAP_KUSZOBOK` a hat állapot-befolyásoló állandó egyike — D66.)*
          if (modszer === 'PATCH' && utvonal.startsWith('/api/gondolat/')) {
            const azonosito = utvonal.split('/')[3];
            const { cim, szoveg } = test ?? {};
            if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik gondolatot?' } };

            const valtozas = {};
            if (typeof cim === 'string' && cim.trim()) valtozas.cim = cim.trim();
            if (Array.isArray(szoveg)) valtozas.szoveg = szoveg.length ? szoveg : null;
            if (!Object.keys(valtozas).length) {
              return { allapot: 400, adat: { hiba: 'mi változzon a gondolaton?' } };
            }

            // ⭐ A javaslattevő TÁMOGATÓ SZAVAZATÁT a művelet maga adja le
            // (`muveletek.js`) — enélkül a saját szerkesztésed 0%-kal, ELVETVE zárna.
            // ⛔ A JAVASLAT IS ENTITÁS (2026-09-06), tehát tudatpont nélkül a koino elfelejtené
            // (D14) — a kezdő pontot a művelet teszi fel, a szavazat előtt (D85).
            const e = await javaslatLetrehozasa(kornyezet, {
              erintett: azonosito, muvelet: 'Modositas', valtozas, fajta: 'szerkesztesi',
              pont: KEZDO_PONT
            });

            pakliNezet.horgony = null;
            return { adat: { data: { _id: e.azonosito, javaslat: true } } };
          }

          // ----- TUDATPONT-RENDEZÉS -----
          if (utvonal === '/api/tudatpont/hozzarendeles') {
            const { entitasId, pontok, szerep } = test ?? {};
            if (typeof entitasId !== 'string' || !Number.isInteger(pontok)) {
              return { allapot: 400, adat: { hiba: 'melyik entitásra hány tudatpont?' } };
            }

            // ⭐ A D42 BEMONDOTT ÖSSZEGE: a művelet a saját láncból számolja, de a
            // jelenlegi képet meg kell kapnia — ezért kell a friss állapot.
            const { allapot } = await kepetKeszit(0, tar, KOINO);
            await tudatpontRendezese(kornyezet, entitasId, pontok,
              szerep === 'passziv' ? 'passziv' : 'aktiv', szetosztottPontok(allapot, szerzo));

            pakliNezet.horgony = null;      // a kép elavult: a következő kérés újraszámol
            return { adat: { data: { entitasId, pontok } } };
          }

          // ----- RÉSZVÉTELI SZEREP -----
          if (utvonal.startsWith('/api/tudatpont/szerep/')) {
            const azonosito = utvonal.split('/')[5];
            const szerep = test?.szerep === 'passziv' ? 'passziv' : 'aktiv';
            if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitáson?' } };

            // ⚠️ A szerep-váltás NEM nyúl a pontokhoz: a jelenlegit írjuk vissza, csak más
            // szereppel. Ezért kell kiolvasni, mennyi van most rajta.
            const { allapot } = await kepetKeszit(0, tar, KOINO);
            const entitas = allapot.entitasok.get(azonosito);
            const mostani = entitas?.hozzajarulok.get(szerzo)?.pont ?? 0;
            if (mostani <= 0) {
              return { allapot: 400, adat: { hiba: 'nincs tudatpontod ezen az entitáson' } };
            }

            await tudatpontRendezese(kornyezet, azonosito, mostani, szerep,
              szetosztottPontok(allapot, szerzo));

            pakliNezet.horgony = null;
            return { adat: { data: { entitasId: azonosito, szerep } } };
          }

          // ----- ÉRTÉK JAVASLAT (küszöbök) -----
          if (utvonal === '/api/ertekJavaslat') {
            const { entitasId, ...ertekek } = test ?? {};
            if (typeof entitasId !== 'string') {
              return { allapot: 400, adat: { hiba: 'melyik entitás küszöbei?' } };
            }
            // ⚠️ A prototípus `entitasTipus`-t is küld; a koinóban az azonosító elég.
            delete ertekek.entitasTipus;

            // ⛔⛔ D101 (2026-10-11, mérve): eddig a lap mezői FORDÍTÁS NÉLKÜL kerültek az eseménybe — a prototípus nevei
            // (`javaslatElfogadasiKuszob`, `reszveteliAranyKuszob`) a számításnak ismeretlenek, így a lapon beállított
            // elfogadási és részvételi küszöb némán elveszett (csak a két idő ment át, mert annak a neve egyezik).
            // ⭐ Most a közös fordítón át, és a hiányos négyes nem lesz esemény (egy félkész javaslat rosszabb a semminél).
            // ⚠️ A már kiírt régi események ugyanígy olvasódnak tovább (egy tárolt esemény más olvasata két készülék
            // állapotát hasítaná szét — D66); aki így adta be, az újra beadhatja.
            const belso = kuszobokBefele(ertekek);
            if (!belso) {
              return { allapot: 400, adat: { hiba: 'A négy küszöb (elfogadási, részvételi, minimum és maximum döntési idő) '
                + 'mind kell, egész számként.' } };
            }
            await ertekJavaslat(kornyezet, entitasId, belso);
            pakliNezet.horgony = null;
            return { adat: { data: { entitasId } } };
          }

          // ----- ⭐ SZAVAZAT (5.5) — ezzel zárul be a kör a felületen -----
          if (utvonal === '/api/javaslat/szavazat') {
            const { javaslatId, szavazatTipus, kulonvalasIgeny } = test ?? {};
            if (typeof javaslatId !== 'string'
                || !['Tamogat', 'Ellenez', 'Tartozkodik'].includes(szavazatTipus)) {
              return { allapot: 400, adat: { hiba: 'melyik javaslatra hogyan szavazol?' } };
            }
            // ⚠️⚠️ A kulonvalasIgeny MOST ELVESZIK — de NEM azért, mert nincs megfelelője.
            // *(2026-09-06-án ezt írtam ide, és tévedtem.)*
            //
            // A KÜLÖNVÁLÁS a prototípus egyik legkidolgozottabb mechanizmusa
            // (`megismeres/18-kulonvalas.md` + `javaslatVegrehajtasiService.js` 3.A–3.E):
            // aki ellenezte a javaslatot ÉS kérte a külön ágat, az a döntés után a saját
            // álláspontja szerinti változattal él tovább — **a tudatpontjait és az érték
            // javaslatait is magával viszi**. ⭐ *„Aki elmegy, viszi a súlyát."*
            //
            // ⛔ A koinóban ez MÉG NINCS MEGÉPÍTVE (leltár: `docs/javaslat_atultetes.md`
            // 2.1). Amíg nincs, a szavazat nem hordozza a kérést — de ez **hiány, nem
            // döntés**. A régi megjegyzés azt sugallta, hogy a kérdés le van zárva.

            // ⭐ D85/5: a töredék-kártya a SAJÁT azonosítóját küldi, a szavazat viszont a CSOPORTRA
            // (a javaslatra) szól — a döntés ott van, és egy szavazat minden jogosult részre számít.
            const { allapot: kepMost } = await kepetKeszit(0, tar, KOINO);
            const csoport = dontesAzonositoja(kepMost, javaslatId);
            await szavazas(kornyezet, csoport, szavazatTipus, kulonvalasIgeny === true);
            pakliNezet.horgony = null;
            return { adat: { data: { javaslatId, szavazatTipus } } };
          }

          return { allapot: 404, adat: { hiba: 'nincs ilyen írás-végpont' } };
        }

        // ⛔ A SZAVAZAT VISSZAVONÁSA — a koinóban NINCS ilyen művelet, és ez döntés (5.4).
        //
        // A meggondolást az „utolsó nyer" fedi (szavazz újra), a semleges állást pedig a
        // Tartozkodik. Egy harmadik, „mégsem szavaztam" állapot csak a részvételi arányt
        // tenné kétértelművé. ⚠️ A prototípus gombja megmaradt a fülön — ezért NEM némán
        // nyeljük el, hanem megmondjuk, mit tegyen helyette.
        if (modszer === 'DELETE' && utvonal === '/api/javaslat/szavazat') {
          return { allapot: 400, adat: { hiba:
            'A koinóban a szavazat nem vonható vissza, csak megváltoztatható. '
            + 'Ha nem akarsz állást foglalni: szavazz Tartózkodom-ra.' } };
        }

        if (modszer !== 'GET') return { allapot: 405, adat: { hiba: 'nem támogatott művelet' } };

        // ⭐ D112 ⑤: a felderítések és az állásuk (a rögzített rész mérete az átmeneti tárból), és a beállítás határai.
        if (utvonal === '/api/felderitesek') {
          if (!sajatKoino) return { adat: { felderitesek: [], alap: FELDERITES_ALAP, hatar: FELDERITES_HATAR } };
          await atmeneti.frissit();
          const j = await felderitesJegyzekOlvasasa();
          const { allapot } = await kepetKeszit();
          return { adat: {
            felderitesek: j.felderitesek.map((f) => ({ ...f, agCim: f.ag === GYOKER_AG ? null : (allapot.entitasok.get(f.ag)?.cim ?? null),
              rogzitettSzelet: atmeneti.rogzitesAllasa(f.az).szeletek })).reverse(),
            alap: FELDERITES_ALAP, hatar: FELDERITES_HATAR } };
        }

        if (utvonal === '/api/en') {
          // Ki vagyok? Ez O(1): a helyi kulcs, számítás nélkül.
          return { adat: { azonosito: szerzo, rovid: rovidAzonosito(szerzo), koino: KOINO } };
        }

        // ===================================
        // ⭐⭐ A BELÉPŐ TÉR (5.6) — a koinók FÖLÖTTI nézet
        // ===================================
        //
        // ⚠️ EZ AZ EGYETLEN VÉGPONT, AMI NEM EGY KOINÓRÓL SZÓL. Ezért nem az aktív tárat
        // kapja, hanem az **adat-mappát** — a tér a mappák fölött lát.
        if (utvonal === '/api/ter') {
          try {
            const ter = await terKartyai(alapHely(), {
              szerzo,
              rendezes: kereses.get('rendezes') ?? undefined,
              irany: kereses.get('irany') ?? undefined
            });
            // ⭐ A lap tudni akarja, MELYIK koinóban áll éppen — a tér ebből emeli ki az
            // aktív kártyát.
            return { adat: { ...ter, aktiv: aktivKoino } };
          } catch (hiba) {
            return { allapot: 400, adat: { hiba: hiba.message } };
          }
        }

        // ⭐⭐ A LAP HORGONYA — ezt hozza vissza minden kártya-kérés (2026-09-12).
        //
        // A lap a `/api/pakli` válaszából kapja (`horgony` + `most`), és visszaadja, amikor
        // egy kártya részleteit kéri. ⛔ Enélkül a kártya a MOSTANI állapotból számolna,
        // vagyis **átlépné a lap horgonyát**: mást mondana, mint a lista, amiből
        // megnyitották — és a gyorsítótár sem találna, tehát minden kattintás újraszámolná
        // az egész koinót.
        //
        // ⚠️ A szemetet nem „javítjuk ki" némán: ami nem egész szám, az nincs (a `lapKepe`
        // olyankor a mostani állapotot adja — a parancssornak és a többi kliensnek ez a jó).
        const horgonyPar = parseInt(kereses.get('horgony'), 10);
        const mostPar = parseInt(kereses.get('most'), 10);
        const lapHorgonya = {
          horgony: Number.isInteger(horgonyPar) ? horgonyPar : undefined,
          most: Number.isInteger(mostPar) ? mostPar : undefined
        };

        // ⛔⛔ A PAKLI — EGY OLDAL, SOHA NEM AZ EGÉSZ (9. szabály).
        // A `darab` felülről korlátos, a lapozás kurzoros, a szövegek nincsenek benne.
        // ===================================
        // ⭐⭐ A HÁZ (D100): A HIERARCHIKUS PAKLI — „láncos-testvéres”, és a hiányzó részek elkérése (H1)
        // ===================================
        //
        // A kiválasztott köré a felmenők, a bogár és a testvérek, a helyi tudásból (`pakli.js` `pakliHierarchia`); amit nem
        // tudunk (a nem tartott ágak gyerekei, a gyökér szintje, egy ismeretlen felmenő, a megnyitott kártya szövege), azt
        // függő kérelemként beírjuk — az őrjárat hozza —, és a válasz `betoltes` jele mondja meg a lapnak, hogy érdemes
        // újrakérdeznie. ⚠️ A hálózathoz a felület nem nyúl (H1/A): egy kapu van, az őrjáraté.
        // ===================================
        // ⭐⭐ D101 ③: A STRUKTÚRA NÉZET — a fa a legerősebb ágaktól kifelé, egy keretig (a bejáró sorrendjéből)
        // ===================================
        //
        // A prototípus útvonalai és alakja (`StrukturaModal`, M5/A): a darabszám (`{ osszesDarab, agDarab }`) és a lapok
        // (`{ sorok, kovetkezoKurzor }`). ⚠️ A modál a lapokat nyers `fetch`-csel kéri (`Authorization: Bearer` — a kapu
        // elfogadja). A darabszámnál a hiányzót a ház útján elkérjük, és kimondjuk, mire épül a fa (D101/M2).
        // ===================================
        // ⭐⭐ D101 ④: A SÍKIDOM NÉZET — egy szülő gyerekei egy küszöb fölött (kurzorral), és az ős-lánc
        // ===================================
        //
        // A prototípus útvonalai és alakja (`SikidomModal`, M5/A). ⚠️ A kép mindig a tár mai vége (a lap horgonyát nem
        // vesszük át): a nézet újrakérdez, és a közben megjött gyerekeket látnia kell. A hiányzót a ház útján elkérjük, és
        // kimondjuk, mire épül a nézet (D101/M2); a `betoltes` jel mondja meg a lapnak, hogy érdemes újrakérdezni.
        if (utvonal === '/api/sikidom/gyerekek' || utvonal === '/api/sikidom/oslanc') {
          const kozos = { szerzo, nezet: pakliNezet,
            bemondasok: sajatKoino ? await bemondasok() : new Map(),
            fejlecTudas: sajatKoino ? await fejlecTudas() : new Map() };
          const szam = (x) => { const n = parseFloat(x); return Number.isFinite(n) ? n : null; };
          let r;
          if (utvonal === '/api/sikidom/gyerekek') {
            const kurzorPont = szam(kereses.get('kurzorPont'));
            r = await sikidomGyerekek(olvasoTar, KOINO, { ...kozos,
              szulo: kereses.get('szulo') || null,
              minPont: szam(kereses.get('minPont')) ?? 0,
              kurzor: kurzorPont !== null && kereses.get('kurzorId') ? { pont: kurzorPont, id: kereses.get('kurzorId') } : null,
              darab: parseInt(kereses.get('darab'), 10),
              osszesKell: kereses.get('osszesKell') !== '0' });
          } else {
            if (!kereses.get('entitas')) return { allapot: 400, adat: { success: false, message: 'Hiányzó entitás azonosító' } };
            r = await sikidomOslanc(olvasoTar, KOINO, { ...kozos, entitas: kereses.get('entitas') });
          }
          const keres = sajatKoino && r.hianyzik.length ? await lapHianyzoinakElkerese(r.hianyzik)
            : { kert: 0, fuggo: 0, celos: 0 };
          return { adat: { success: true, ...r, betoltes: keres.fuggo > 0, kitolKerni: keres.celos,
            koinoMegjegyzes: sikidomMegjegyzes(r, sajatKoino ? await fuggoKerelmekAllasa() : { fuggo: 0, celos: 0 }) } };
        }

        if (utvonal === '/api/struktura/darabszam') {
          const d = await strukturaDarabszam(olvasoTar, KOINO, {
            szerzo, nezet: pakliNezet, agazat: kereses.get('agEntitasId') || null,
            bemondasok: sajatKoino ? await bemondasok() : new Map(),
            fejlecTudas: sajatKoino ? await fejlecTudas() : new Map()
          });
          const keres = sajatKoino && d.hianyzik.length ? await lapHianyzoinakElkerese(d.hianyzik)
            : { kert: 0, fuggo: 0, celos: 0 };
          return { adat: { ...d, betoltes: keres.fuggo > 0, kitolKerni: keres.celos,
            koinoMegjegyzes: strukturaMegjegyzes(d, keres) } };
        }
        if (utvonal === '/api/struktura') {
          const lapMeret = parseInt(kereses.get('lapMeret'), 10);
          try {
            return { adat: await strukturaLap(olvasoTar, KOINO, {
              szerzo, nezet: pakliNezet, agazat: kereses.get('agEntitasId') || null,
              kurzor: kereses.get('kurzor') || undefined,
              lapMeret: Number.isInteger(lapMeret) ? lapMeret : undefined,
              bemondasok: sajatKoino ? await bemondasok() : new Map(),
              fejlecTudas: sajatKoino ? await fejlecTudas() : new Map()
            }) };
          } catch (hiba) {
            return { allapot: 400, adat: { hiba: hiba.message } };
          }
        }

        /** ⭐ D101 ⑥: a kártyák számlálója — a postafiók (legfeljebb fél percenként újraszámolva) olvasatlanjai entitásonként. */
        async function kartyaSzamlalo() {
          try {
            const { pf } = await postafiokFrissitese({ tar: olvasoTar, koino: KOINO, nezet: pakliNezet,
              bemondasok: await bemondasok(), szerzo, szunet: POSTAFIOK_SZAMLALO_SZUNET });
            return olvasatlanTerkep(pf);
          } catch (hiba) {
            console.warn('a kártyák számlálója nem számolható', { ok: hiba.message });
            return new Map();
          }
        }

        if (utvonal === '/api/pakli/hierarchikus') {
          const h = await pakliHierarchia(olvasoTar, aktivKoino, {
            entitas: kereses.get('entitas') || null,
            szerzo,
            nezet: pakliNezet,
            bemondasok: aktivKoino === KOINO ? await bemondasok() : new Map(),
            // ⭐ D116: a bemondott gyerekszámok — a kártyák „még nem ismert” jeléhez
            fejlecTudas: aktivKoino === KOINO ? await fejlecTudas() : new Map(),
            darabOlvas: (lenyomat) => fajlBlobTarolo(aktivKoino).olvas(lenyomat)
          });
          const keres = aktivKoino === KOINO && h.hianyzik.length ? await lapHianyzoinakElkerese(h.hianyzik)
            : { kert: 0, fuggo: 0, celos: 0 };
          // ⭐ D101 ⑥: a kártyák számlálója — az ága alatti olvasatlan értesítések (a postafiók ős-láncaiból)
          const olvasatlan = sajatKoino ? await kartyaSzamlalo() : new Map();
          // ⭐ D112 ⑤: és ha egy felderítés pillanatképe (rögzítve) — mikor (a kártya „📷” jele)
          const szamlal = (lista) => (lista ?? []).map((k) => ({ ...k, olvasatlanErtesitesek: olvasatlan.get(k.azonosito) ?? 0,
            ...(sajatKoino && atmeneti.rogzitesIdeje?.(k.azonosito) ? { rogzitve: atmeneti.rogzitesIdeje(k.azonosito) } : {}) }));
          return { adat: { ...h, pakli: szamlal(h.pakli), testverek: szamlal(h.testverek),
            betoltes: keres.fuggo > 0, kitolKerni: keres.celos, kertKerelmek: keres.kert } };
        }

        if (utvonal === '/api/pakli') {
          const darab = parseInt(kereses.get('darab'), 10);
          try {
            const oldal = await pakliOldal(olvasoTar, KOINO, {
              rendezes: kereses.get('rendezes') ?? undefined,
              irany: kereses.get('irany') ?? undefined,
              kurzor: kereses.get('kurzor') ?? undefined,
              darab: Number.isInteger(darab) ? darab : undefined,
              szerzo,          // ⭐ hogy a kártya a SAJÁT tudatpontodat is mutathassa
              nezet: pakliNezet,
              // ⭐ D72: a javaslat-kártyák szöveg-hivatkozása innen oldódik fel
              darabOlvas: (lenyomat) => fajlBlobTarolo(KOINO).olvas(lenyomat),
              // ⭐ D92/5: a nem tartott entitások bemondott össz-pontja (a kérelmek válaszaiból)
              bemondasok: await bemondasok(),
              // ⭐ D101: a kártya menüjének Rendezése — csak az ág
              agazat: kereses.get('agazat') || undefined,
              // ⭐ D102: a bejáróhoz — mit tudok a csomópontok gyerekeiről (a gyerekszám és a levágás)
              fejlecTudas: sajatKoino ? await fejlecTudas() : new Map()
            });
            // ⭐ D101: az ág-szűréshez hiányzó felmenőket a ház útján elkérjük; és kimondjuk a lista határát (M2).
            const keres = sajatKoino && oldal.hianyzik.length ? await lapHianyzoinakElkerese(oldal.hianyzik)
              : { kert: 0, fuggo: 0, celos: 0 };
            let szigoru = false;
            try { szigoru = sajatKoino && !(await kiszolgalasBeallitas()).mindent; } catch { szigoru = false; }
            const olvasatlan = sajatKoino ? await kartyaSzamlalo() : new Map();
            return { adat: { ...oldal,
              kartyak: (oldal.kartyak ?? []).map((k) => ({ ...k, olvasatlanErtesitesek: olvasatlan.get(k.azonosito) ?? 0 })),
              betoltes: keres.fuggo > 0, kitolKerni: keres.celos,
              koinoMegjegyzes: laposMegjegyzes(oldal, keres, szigoru && !Number.isInteger(oldal.biztos)) } };
          } catch (hiba) {
            // ⚠️ A rossz KÉRÉS nem a program hibája — 400, és mondjuk meg, mi a baj.
            return { allapot: 400, adat: { hiba: hiba.message } };
          }
        }

        // ===================================
        // ⭐ A BESOROLÁSOK LISTÁJA (5.7) — a GondolatModal lenyílóihoz
        // ===================================
        //
        // ⚠️ A VÁLASZ A PROTOTÍPUS ALAKJÁT BESZÉLI (`_id`, `nev`, `szuloId`), mert az
        // örökölt modal így olvassa — ugyanaz a döntés, mint a tudatpont-végpontnál (5.5):
        // *a hívó a régi; a válasz alkalmazkodik hozzá, nem fordítva.* ⭐ A koinóban a név
        // a `cim` mezőben van (5.4), a fordítás itt történik, egy helyen.
        //
        // ⚠️⚠️ ÉS EGY ŐSZINTE KORLÁT: ez a két lista **teljes**, nem lapozott. Egy lenyíló
        // menü ma ilyen — de ez ugyanaz az alak, amit a 9. szabály tilt, csak kicsiben.
        // Amíg a besorolások száma egy koinón belül kicsi, ez rendben van; ha egyszer nem
        // lesz az, ide **kereső** kell (Szakasz 6), nem nagyobb lista.
        if (utvonal === '/api/gondolatTipus' || utvonal === '/api/kategoria') {
          const kategoriaE = utvonal === '/api/kategoria';
          const keresett = kategoriaE ? 'Kategoria' : 'GondolatTipus';

          const { allapot } = await kepetKeszit(0, tar, KOINO);
          const lista = [...allapot.entitasok.values()]
            .filter((e) => e.tipus === keresett)
            .map((e) => ({
              _id: e.azonosito,
              nev: e.cim,                  // ⭐ a koinóban `cim`; a modal `nev`-et olvas
              ikon: e.ikon ?? null,
              szuloId: e.szulo ?? null     // a kategória-fa behúzásához
            }))
            .sort((a, b) => (a.nev ?? '') < (b.nev ?? '') ? -1 : 1);

          return { adat: kategoriaE ? { kategoriak: lista } : { gondolatTipusok: lista } };
        }

        // ===================================
        // ⭐⭐ EGY FÁJL KISZOLGÁLÁSA (5.7) — a lenyomata alapján
        // ===================================
        //
        // ⭐ A NÉV MAGA A BIZONYÍTÉK: a tár **újra lenyomatolja** a bájtokat olvasáskor, és
        // ha nem egyeznek, nem adja ki őket. *A csatornát nem kell megbízhatóvá tenni*
        // (3. szabály) — ez ma a lemez, holnap a hálózat.
        //
        // ⚠️ A HIÁNY ITT NEM HIBA (D19): egy kép **csak azon a készüléken van meg, ahol
        // beszúrták**, amíg a tartalmi réteg szállítása meg nem épül. A 404 tehát azt
        // mondja: *„ezt a fájlt nem ismerem"* — nem azt, hogy nem létezik.
        if (utvonal.startsWith('/api/fajl/')) {
          const lenyomat = utvonal.slice('/api/fajl/'.length);

          let bajtok;
          try {
            bajtok = await fajlBlobTarolo(KOINO).olvas(decodeURIComponent(lenyomat));
          } catch (hiba) {
            return { allapot: 400, adat: { hiba: hiba.message } };
          }
          if (!bajtok) {
            return { allapot: 404, adat: { hiba: 'ezt a fájlt nem ismeri ez a készülék' } };
          }
          // ⭐ D112 ① (F3): a megmutatott fájl megérintése — a fájl-tár keretében a legrégebben érintett megy előbb.
          await fajlBlobTarolo(KOINO).erintes(decodeURIComponent(lenyomat));

          // ⛔ A típus a BÁJTOKBÓL, nem a kérésből — lásd `fajlTipus`.
          return { nyers: Buffer.from(bajtok), tipus: fajlTipus(bajtok) };
        }

        // ===================================
        // ⚠️ ENTITÁS-KERESÉS (5.8) — a JavaslatModal mezőihez
        // ===================================
        //
        // ⛔⛔ EZ A KERESŐ-RÉTEG (Szakasz 6) ELŐFUTÁRA, ÉS SZÁNDÉKOSAN KICSI. Az áthelyezés
        // („hova?") és az egyesítés („mivel?") nem megy anélkül, hogy meg tudnám nevezni a
        // másik entitást — azt pedig keresni kell.
        //
        // ⚠️ A MAI MEGVALÓSÍTÁS VÉGIGNÉZ MINDEN ENTITÁST, és ezt kimondjuk: ez ugyanaz a
        // korlát, ami a `koinoEsemenyei` mögött áll. ⭐ De az ILLESZTÉS már milliárdos:
        // a hívó **kifejezést és korlátot** ad, nem „mindent" — tehát a kereső-réteg
        // (ami hálózatot is kíván, és elhagyható) **a hívó változtatása nélkül** léphet a
        // helyére. *Pontosan úgy, ahogy a 3.2-ben a tár-illesztő.*
        // ===================================
        // ⭐⭐ D101 ⑤: A KERESÉS — a helyi alja (M4): a készüléken ismert entitások címében, ág-szűrve
        // ===================================
        //
        // A prototípus útvonala és alakja (`KeresesModal`, `EntitasKeresoMezo`): `q`, `tipusok`, `limit` (típusonként,
        // alapból 10, legfeljebb 50), `agEntitasId`. ⛔ A TALÁLAT-SZÁM FELÜLRŐL KORLÁTOS — egy kereső, ami „mindent” adhat
        // vissza, nem kereső. A két tárból keres (amit tartok és amit láttam), és kimondja, hogy a hálózati keresés (a
        // kereső-réteg) még nincs; ág-szűrésnél a hiányzó felmenőt elkéri (D19, M2).
        if (utvonal === '/api/kereses') {
          const limit = parseInt(kereses.get('limit'), 10);
          // ⭐ A kereső-réteg ⑦: a hálózati keresés a háttérben (kérdésenként egyszerre egy); a találatai az átmeneti tárba
          // kerülnek, így a lap újrakérdezésére (a `betoltes` jel) a helyi listában is ott vannak.
          const halozat = sajatKoino ? await halozatiKereses(kereses.get('q')) : null;
          // ⭐ ⑦b: a kérdés függő kérelmei (a NAT mögötti tartókhoz — az őrjárat viszi): amíg függnek, a lap figyel.
          const fa = halozat && !halozat.fut ? await keresesFuggoAllasa(halozat.kulcs, halozat.kezdet) : null;
          const orjaratFut = fa?.fuggo ? csereAllapotKepe(await csereAllapota(KOINO).olvas(), Date.now()).orjarat.fut : true;
          const r = await keresesHelyben(olvasoTar, KOINO, {
            q: kereses.get('q') ?? '',
            tipusok: (kereses.get('tipusok') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
            limit: Number.isInteger(limit) ? limit : undefined,
            agazat: kereses.get('agEntitasId') || null,
            nezet: pakliNezet,
            bemondasok: sajatKoino ? await bemondasok() : new Map()
          });
          const keres = sajatKoino && r.hianyzik.length ? await lapHianyzoinakElkerese(r.hianyzik)
            : { kert: 0, fuggo: 0, celos: 0 };
          return { adat: { talalatok: r.talalatok, ismert: r.ismert, nemEldontheto: r.nemEldontheto,
            betoltes: keres.fuggo > 0 || !!halozat?.fut || (fa?.fuggo > 0 && orjaratFut),
            koinoMegjegyzes: keresesMegjegyzes(r, keres, halozat, fa, orjaratFut) } };
        }

        // ⭐ EGY entitás szövege (5.3). A lista szándékosan nem hozza (9. szabály), ezért
        // a kártya külön kéri el — kártyánként, amikor tényleg kell.
        if (utvonal.startsWith('/api/pakli/szoveg/')) {
          const reszek = utvonal.split('/');            // ['', 'api', 'pakli', 'szoveg', tipus, id]
          const azonosito = reszek[5];
          if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitás szövege?' } };

          const talalat = await entitasSzovege(olvasoTar, KOINO, decodeURIComponent(azonosito),
            { ...lapHorgonya, nezet: pakliNezet,
              darabOlvas: (lenyomat) => fajlBlobTarolo(KOINO).olvas(lenyomat) });
          if (!talalat) return { allapot: 404, adat: { hiba: 'nincs ilyen entitás' } };
          return { adat: talalat };
        }

        // ⭐ EGY entitás tudatpont-képe — a kártya ebből dönti el, hogy a tudatpont-függő
        // menüpontok elérhetők-e (aki nem tett rá pontot, nem tehet rá javaslatot sem).
        if (utvonal.startsWith('/api/tudatpont/entitas/')) {
          const reszek = utvonal.split('/');       // ['', 'api', 'tudatpont', 'entitas', tipus, id]
          const azonosito = reszek[5];
          if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitás?' } };

          const talalat = await entitasTudatpontja(olvasoTar, KOINO, decodeURIComponent(azonosito),
            { ...lapHorgonya, szerzo, nezet: pakliNezet });
          if (!talalat) return { allapot: 404, adat: { hiba: 'nincs ilyen entitás' } };
          return { adat: talalat };
        }

        // ----- ⭐ A SAJÁT SZAVAZATOM (5.5) — a SzavazasFul kéri megnyitáskor -----
        if (utvonal.startsWith('/api/javaslat/') && utvonal.endsWith('/sajat-szavazat')) {
          const javaslatId = utvonal.split('/')[3];

          // ⚠️ EGYSZER kérjük el a képet, nem kétszer. A `kepetKeszit` **teljes**
          // állapot-számítás (nincs mögötte gyorsítótár), és 2026-09-12-ig ez a kezelő
          // kétszer hívta meg — ugyanarra a kérdésre, ugyanabban a kérésben.
          const { allapot: kep, javaslatok } = await kepetKeszit(0, tar, KOINO);
          // ⭐ D85/5: töredék-kártyáról a csoport szavazatát kérdezzük.
          const csoport = dontesAzonositoja(kep, javaslatId);
          if (!javaslatok.has(csoport)) {
            return { allapot: 404, adat: { hiba: 'nincs ilyen javaslat' } };
          }
          // ⚠️ NULL, ha még nem szavaztam — a fül ebből tudja, hogy egyik gomb sem aktív.
          //
          // ⭐ A koinóban a szavazat SOSEM tűnik el, csak felülíródik („az utolsó nyer"),
          // ezért a `sajatSzavazat` mindig a jelenlegi állásomat adja — nem kell külön
          // nyilvántartás róla.
          const enyem = sajatSzavazat(kep.szamitok, csoport, szerzo);
          return { adat: { data: enyem ? { szavazatTipus: enyem } : null } };
        }

        // ----- HIÁNYZÓ FELMENŐK (5.5) — a TudatpontModal kéri megnyitáskor -----
        if (utvonal.startsWith('/api/tudatpont/hianyzo-felmenok/')) {
          const azonosito = utvonal.split('/')[5];
          if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitás felmenői?' } };

          const talalat = await hianyzoFelmenok(olvasoTar, KOINO, decodeURIComponent(azonosito),
            { ...lapHorgonya, szerzo, nezet: pakliNezet });
          if (!talalat) return { allapot: 404, adat: { hiba: 'nincs ilyen entitás' } };
          return { adat: talalat };
        }

        // ===================================
        // ⭐ D101 (az I. csoport): A TUDATPONTOK MODÁL — a saját aktív hozzárendeléseim, és a saját adataim
        // ===================================
        //
        // ⭐ A prototípus útvonalai és alakja (`TudatpontokModal`, M5/A): a lista a SAJÁT láncomból (`pakli.js`
        // `sajatHozzarendelesek`), ág-szűrve a felmenő-láncon (`agHelyzete`). Ha egy felmenő nincs meg, a tétel „nem
        // eldönthető” — a hiányzó felmenőt a ház útján elkérjük (függő kérelem, az őrjárat hozza).
        if (utvonal === '/api/tudatpont/aktiv-hozzarendelesek') {
          const limit = parseInt(kereses.get('limit'), 10);
          const lista = await sajatHozzarendelesek(olvasoTar, KOINO, {
            ...lapHorgonya, szerzo, nezet: pakliNezet,
            ag: kereses.get('agEntitasId') || null,
            limit: Number.isInteger(limit) ? limit : undefined
          });
          const keres = sajatKoino && lista.hianyzik.length ? await lapHianyzoinakElkerese(lista.hianyzik)
            : { kert: 0, fuggo: 0, celos: 0 };
          return { adat: { success: true, ...lista, betoltes: keres.fuggo > 0, kitolKerni: keres.celos,
            koinoMegjegyzes: hozzarendelesMegjegyzes(lista, keres) } };
        }

        // ⭐ A prototípus `eember/sajat-adatok`-ja: a Tudatpontok fejléce a szabad pontot olvassa belőle. ⚠️ Ami a
        // prototípusban fiók-adat volt (e-mail, valódi név, lokáció), az itt nincs (D15: nincs fiók) — null, nem kitalált.
        if (utvonal === '/api/eember/sajat-adatok') {
          const lista = await sajatHozzarendelesek(olvasoTar, KOINO, { ...lapHorgonya, szerzo, nezet: pakliNezet, limit: 1 });
          return { adat: {
            success: true, eemberNev: rovidAzonosito(szerzo), nev: null, email: null, emailMegerositve: false,
            lokacio: null, tudatpontok: lista.szabad
          } };
        }

        // ===================================
        // ⭐ AZ ALSÓ SÁV (Csaba, 2026-10-15) — a prototípus statisztikája és a csere állapota
        // ===================================
        //
        // ⛔ A prototípus `platform/statisztika`-ja a PLATFORM számait adta (hány e-ember, hány gondolat). A koinó egészét
        // senki nem számolja meg (9. szabály: egy készülék terhe nem függhet a koinó méretétől) — itt a KÉSZÜLÉKEN ismert
        // rész számai állnak, a prototípus alakjában, és a program kimondja, mit jelentenek.
        if (utvonal === '/api/platform/statisztika') {
          const st = await helyiStatisztika(olvasoTar, KOINO, { ...lapHorgonya, nezet: pakliNezet });
          return { adat: { success: true, ...st,
            koinoMegjegyzes: 'A készüléken ismert rész: a koinó egészét senki nem számolja meg — az e-emberek száma azoké, '
              + 'akiknek eseménye nálam van.' } };
        }
        // ⭐ A csere állapota: a lap ebből mondja ki, mikor cserélt utoljára a készülék és mikor jön a következő kör — és ha
        // egy csere újat hozott, csendben frissül. Az őrjárat írja (egy másik folyamat — `csereAllapot.js`).
        if (utvonal === '/api/csere-allapot') {
          const kep = csereAllapotKepe(await csereAllapota(KOINO).olvas(), Date.now());
          return { adat: { success: true, adatok: { ...kep, most: Date.now() } } };
        }

        // ----- EGY ENTITÁS RÉSZLETEI (5.5) — a ReszletekModal kéri -----
        // ⚠️ A prototípus típusonként külön útvonalat használ
        // (/api/gondolat/:id/reszletek, /api/kategoria/:id/reszletek, …). A koinóban az
        // azonosító egyértelmű, tehát a típus-előtagot nem is nézzük — de az útvonal
        // alakját megtartjuk, hogy az örökölt modal változatlanul működjön.
        if (utvonal.endsWith('/reszletek') && !utvonal.startsWith('/api/ertekJavaslat/')) {
          const reszek = utvonal.split('/');       // ['', 'api', <tipus>, <id>, 'reszletek']
          const azonosito = reszek[3];
          if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitás?' } };

          // ⭐ B/2: a megnyitott kártya „megnézett” — ha az átmeneti tárban van, ettől marad tovább.
          if (sajatKoino) await atmeneti.megnezve(decodeURIComponent(azonosito));
          const talalat = await entitasReszletei(olvasoTar, KOINO, decodeURIComponent(azonosito),
            { ...lapHorgonya, szerzo, nezet: pakliNezet,
              darabOlvas: (lenyomat) => fajlBlobTarolo(KOINO).olvas(lenyomat), bemondasok: await bemondasok() });
          if (!talalat) return { allapot: 404, adat: { hiba: 'nincs ilyen entitás' } };
          return { adat: talalat };
        }

        // ----- A KÜSZÖBÖK (5.5) — az ErtekJavaslatModal és a ReszletekModal kéri -----
        if (utvonal.startsWith('/api/ertekJavaslat/reszletek/')
            || utvonal.startsWith('/api/ertekJavaslat/aktualis/')) {
          const reszek = utvonal.split('/');       // ['', 'api', 'ertekJavaslat', <mi>, <tipus>, <id>]
          const azonosito = reszek[5];
          if (!azonosito) return { allapot: 400, adat: { hiba: 'melyik entitás küszöbei?' } };

          const talalat = await entitasKuszobei(olvasoTar, KOINO, decodeURIComponent(azonosito),
            { ...lapHorgonya, szerzo, nezet: pakliNezet });
          if (!talalat) return { allapot: 404, adat: { hiba: 'nincs ilyen entitás' } };
          return { adat: talalat };
        }

        return null;   // nincs ilyen végpont → a kapu 404-et ad
      };

      // ⭐⭐ A FÁJL-FELTÖLTÉS NAGYOBB TESTET KÍVÁN (5.7). A kapu alapértelmezése 256 KB —
      // egy szavazatnak bőven elég, egy képnek nem. ⚠️ A base64 miatt a test ~4/3-a a
      // fájlnak, és hagyunk egy kis fejléc-tartalékot.
      //
      // ⛔ A JSON-ŐR ÉRINTETLEN: a nagyobb test is `application/json` kell hogy legyen,
      // tehát az 5.5 harmadik őre (a böngésző előellenőrzése) továbbra is véd.
      const feltoltesKorlat = Math.ceil(FAJL_KORLAT * 4 / 3) + 64 * 1024;

      const felulet = await kapuNyitasa({
        testKorlat: (ut) => ut.startsWith('/api/feltoltes/') ? feltoltesKorlat : undefined,
        // ⛔⛔ EGYETLEN JELSZÓ-MENTES ÚT: a fájl-kiszolgálás. Egy `<img src>` nem küld
        // fejlécet, a címébe pedig **tilos** jelszót tenni — az a cím a gondolat
        // ESEMÉNYÉBEN van eltárolva, tehát a jelszó a láncra kerülne és szétterjedne.
        // ⭐ Helyébe a **lenyomat** lép jogosultságként: 43 karakter, kitalálhatatlan, és
        // aki nem látta az eseményt (ahhoz jelszó kell), nem tudja, mit kérjen.
        jelszoMentes: (ut) => ut.startsWith('/api/fajl/'),
        // ⚠️ A program MELLETT lakik a felület, nem a futtatás helyén — különben másik
        // mappából indítva üres lapot adnánk. (`fileURLToPath`: Windowson is helyes út.)
        mappa: join(dirname(fileURLToPath(import.meta.url)), 'felulet'),
        kezelo,
        port
      });

      kiir(SZIN.vastag + 'A felület fut. Nyisd meg ezt a címet:' + SZIN.vege);
      kiir('  ' + SZIN.jo + felulet.cim + SZIN.vege);
      kiir(SZIN.halvany + 'A jelszó minden indításkor ÚJ, és sehol nincs eltárolva.' + SZIN.vege);
      kiir(SZIN.halvany + 'Csak erről a gépről érhető el (127.0.0.1). Kilépés: Ctrl+C' + SZIN.vege);

      process.on('SIGINT', async () => {
        kiir('\nA felület bezárt.');
        await felulet.zar();
        process.exit(0);
      });
      await new Promise(() => {});   // fut, amíg meg nem szakítják
      break;
    }

    default:
      kiir('Ismeretlen parancs: ' + parancs);
      kiir('Használat: allapot [napok] · kulcs · mentes <fájl> · visszatolt <fájl> [felulir]');
    kiir('           koino <név> [leírás] [nyilt] · gondolat <cím> [szöveg]');
      kiir('           pont <azonosító> <pont> [passziv] · javaslat <azonosító> <új cím> [indoklás]');
      kiir('           torol <azonosító> [indoklás] · athelyez <mit> <hova|gyoker> [indoklás]');
      kiir('           egyesit <az1>,<az2>[,...] <egyesített cím> [indoklás]');
      kiir('           ertek <azonosító> <elfogadási%> <részvételi%> <min mp> <max mp>');
      kiir('           belep [alapítás] · meghiv|felhatalmaz|tanusit|bemutatkoz|visszavon <horgony>');
      kiir('           lattam   (az AZONOSSÁG szakasz mutatja, hol tartasz)');
      kiir('           altalanos <álláspont> <hely> [indoklás]  (ÁLTALÁNOS javaslat — D27)');
      kiir('           allast <egyezmény> csatlakozik|tiltakozik|utkozik [másik] [indoklás]');
      kiir('           felszabadit [buli]  (a törölt gondolatokra tett pontod visszavétele)');
      kiir('           szavaz <javaslat> tamogat|ellenez|tartozkodik [kulonag]');
      kiir('           kivisz <fájl> [mind|sajat|<azonosító>] · behoz <fájl>   (a KÉZI ÚT)');
      kiir('           kereso [felajanl <fájl> | behoz <fájl> | kivisz <fájl>]   (a KERESŐ-TÁR — a kereső-réteg ③)');
      kiir('           ter [letrehozva|eloszorLattam|nev] [csokkeno|novekvo]  (A BELÉPŐ TÉR)');
      kiir('           fajlok   (mely képek/fájlok hiányoznak erről a készülékről)');
      kiir('           orjarat [perc] [port] · figyel [port] · csere [cím] [port]   (mind UDP-n)');
      kiir('           hozd <azonosító> [cím] [port]   (EGY entitás elhozása)');
      kiir('           cimjegyzek [hirdet [port] | keres <az> | gyoker [darab] | hirdetes <n>]   (D91 — a DHT-n)');
      kiir('           kerelem fejlecek <az|gyoker> [cím] [port] [n] [d] · kerelem torzs <az> [cím] [port]   (D92)');
      kiir('           profil nev=... [telepules=...] · tagsag   (D93: a profil, a tagságom és a tagsági csomag; D94: a 2. lépcső bemondása)');
      kiir('           jelzes [horgony]   (D93/6: a kontraszt-jelzés kérésre — kiket tanúsított, van-e önálló életük)');
      kiir('           csomag [javaslat]   (a lezárt, több érintettes döntés csomagja — D85 T3)');
      kiir('           kiszolgalas [mindent|alap] · osszegzes   (D95/1: a két fokú vállalás — a nagy szelet összegezve)');
      kiir('           pajzsfuro <cím> [port] [helyi port] · tukor <cím> [port] · kulsoport [port]');
      kiir('           felfedez [mp] [port] · ujjlenyomat [napok] · cimek · kapu');
      kiir('           ujjlenyomat kiment|osszevet <fájl> [napok]   (…és MIBEN térünk el)');
      kiir('           tabla [kiir [cím] [port] | olvas]   (A HIRDETŐTÁBLA — a kötéseim)');
      kiir('           kategoria <név> [ikon] [leírás] · gondolattipus <név> [ikon] [leírás]');
      kiir('           gondolat <cím> [szöveg] [típus] [kategória...] · felulet [port]');
      kiir('           tarsak · tars <cím> [port] [név] · tars torol <cím> [port]');
      process.exit(2);
  }
} catch (hiba) {
  kiir(SZIN.nem + 'Nem sikerült: ' + hiba.message + SZIN.vege);
  if (process.env.KOINO_NAPLO) naplo(hiba);
  process.exit(1);
}
