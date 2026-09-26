// koino/meres/tarsakProba.js

// Felelősség: bizonyítani, hogy a TÁRS-LISTA azt csinálja, amiért a D33 létrehozta.
//
// ⭐ MIT KELL ITT BIZONYÍTANI? Nem azt, hogy „működik a hálózat" — azt a csereProba és a
// vizsgaProba méri. Hanem azt az EGY dolgot, amiért az A. lépés megszületett:
//
//   ⭐ EGY TÁRS BUKÁSA NEM DÖNTI EL A KÖRT.
//
// A régi `csere <cím>` parancsnál egyetlen elérhetetlen cím az egész műveletet elbuktatta.
// Ez pontosan a 2. szabály megsértése volt („semmi ne múljon egyetlen címen"). Az alábbi
// próbák közül a legfontosabb az, amelyik ELRONTJA az első társat, és megnézi, hogy a
// többi attól még megkapja-e az eseményeket.
//
// ⚠️ HÁLÓZAT NÉLKÜL MÉRÜNK. A kör könyvelése (`kopogasMegfigyelesei`) a kapu eredményeit
// kapja KÍVÜLRŐL, ezért itt kézzel írt eredményekkel dolgozunk: van, amelyik sikerült, van,
// amelyik nem. Így a logika portok és két folyamat nélkül mérhető.
//
// Futtatás: node koino/meres/mind.js tarsak

import { probaGyujtemeny } from './probaFuttato.js';
import {
  tarsHozzaadasa, tarsTorlese, tarsakSorrendje, kopogasMegfigyelesei, megfigyelesekRavezetese,
  cimNormalizalasa, sajatCimE, sajatCimekKiszurese,
  szeletCimMegjegyzese, szeletCimei, szeletJegyzekTakaritasa,
  SZELET_CIM_ELEVULES, SZELET_CIM_KORLAT,
  udpCimMegjegyzese, udpCimek, udpCimekBeolvasztasa, udpJegyzekTakaritasa,
  UDP_CIM_ELEVULES, UDP_CIM_KORLAT
} from '../js/csere/tarsak.js';

const { proba, futtatas } = probaGyujtemeny('A társ-lista próbája');

// ===================================
// A LISTA KEZELÉSE
// ===================================

proba('Az üres listára fel lehet venni egy társat', () => {
  const lista = tarsHozzaadasa([], { hoszt: '2001:db8::1', port: 7373 });
  return lista.length === 1 && lista[0].hoszt === '2001:db8::1' && lista[0].port === 7373;
});

proba('Ugyanaz a társ NEM kerül fel kétszer', () => {
  let lista = tarsHozzaadasa([], { hoszt: '2001:db8::1', port: 7373 });
  lista = tarsHozzaadasa(lista, { hoszt: '2001:db8::1', port: 7373 });
  return lista.length === 1;
});

proba('A cím kis-nagybetűje nem számít (az IPv6-ot kétféleképp is szokás írni)', () => {
  let lista = tarsHozzaadasa([], { hoszt: '2001:DB8::AB', port: 7373 });
  lista = tarsHozzaadasa(lista, { hoszt: '2001:db8::ab', port: 7373 });
  return lista.length === 1;
});

proba('Ugyanaz a cím MÁS PORTON külön társ (két példány egy gépen)', () => {
  let lista = tarsHozzaadasa([], { hoszt: '127.0.0.1', port: 7373 });
  lista = tarsHozzaadasa(lista, { hoszt: '127.0.0.1', port: 7374 });
  return lista.length === 2;
});

proba('Az ismételt felvétel FRISSÍTI a nevet (az emberi címke javítható)', () => {
  let lista = tarsHozzaadasa([], { hoszt: 'a', port: 1, nev: 'telefon' });
  lista = tarsHozzaadasa(lista, { hoszt: 'a', port: 1, nev: 'Csaba telefonja' });
  return lista.length === 1 && lista[0].nev === 'Csaba telefonja';
});

proba('A rossz port hibát dob (nem megy némán a listára)', () => {
  for (const rossz of [0, 70000, 1.5, 'hetven', null]) {
    let dobott = false;
    try { tarsHozzaadasa([], { hoszt: 'a', port: rossz }); } catch { dobott = true; }
    if (!dobott) return false;
  }
  return true;
});

proba('A cím nélküli társ hibát dob', () => {
  try { tarsHozzaadasa([], { port: 7373 }); return false; } catch { return true; }
});

proba('A törlés levesz — és csak azt az egyet', () => {
  let lista = tarsHozzaadasa([], { hoszt: 'a', port: 1 });
  lista = tarsHozzaadasa(lista, { hoszt: 'b', port: 1 });
  const { lista: maradt, torolt } = tarsTorlese(lista, 'a', 1);
  return torolt === 1 && maradt.length === 1 && maradt[0].hoszt === 'b';
});

proba('A nem létező társ törlése nem hiba, csak nem történik semmi', () => {
  const lista = tarsHozzaadasa([], { hoszt: 'a', port: 1 });
  const { lista: maradt, torolt } = tarsTorlese(lista, 'nincs-ilyen', 1);
  return torolt === 0 && maradt.length === 1;
});

proba('A felvétel NEM írja át a kapott listát (a régi változatlan marad)', () => {
  const eredeti = tarsHozzaadasa([], { hoszt: 'a', port: 1 });
  tarsHozzaadasa(eredeti, { hoszt: 'b', port: 1 });
  return eredeti.length === 1;
});

// ===================================
// A SORREND
// ===================================

proba('Akivel SIKERÜLT, az elöl van — a legfrissebb legelöl', () => {
  const lista = [
    { hoszt: 'regi', port: 1, utoljara: 1000, sikertelen: 0 },
    { hoszt: 'friss', port: 1, utoljara: 9000, sikertelen: 0 },
    { hoszt: 'sose', port: 1, utoljara: null, sikertelen: 0 }
  ];
  const sorrend = tarsakSorrendje(lista).map((t) => t.hoszt);
  return sorrend[0] === 'friss' && sorrend[1] === 'regi';
});

proba('A még nem próbált társ ELŐBBRE jön, mint a sokszor bukott', () => {
  const lista = [
    { hoszt: 'bukott', port: 1, utoljara: null, sikertelen: 9 },
    { hoszt: 'ismeretlen', port: 1, utoljara: null, sikertelen: 0 }
  ];
  return tarsakSorrendje(lista)[0].hoszt === 'ismeretlen';
});

proba('⭐ A sokszor bukott társ NEM esik ki — csak hátrébb kerül', () => {
  // A hálózat változik: aki hetekig elérhetetlen volt, holnap visszajöhet. A koino nem
  // felejt el senkit magától — törölni csak kézzel lehet (4. szabály).
  const lista = [
    { hoszt: 'bukott', port: 1, utoljara: null, sikertelen: 999 },
    { hoszt: 'jo', port: 1, utoljara: 5000, sikertelen: 0 }
  ];
  const sorrend = tarsakSorrendje(lista);
  return sorrend.length === 2 && sorrend[1].hoszt === 'bukott';
});

proba('A rendezés NEM írja át az eredeti listát', () => {
  const lista = [
    { hoszt: 'a', port: 1, utoljara: null, sikertelen: 5 },
    { hoszt: 'b', port: 1, utoljara: 9000, sikertelen: 0 }
  ];
  tarsakSorrendje(lista);
  return lista[0].hoszt === 'a';
});

// ===================================
// A KÖR KÖNYVELÉSE — a kopogás eredményéből (D69/2, 2026-09-26)
// ===================================
//
// ⚠️ ITT ÁLLT 2026-09-26-IG TIZENKÉT PRÓBA A `korbeCsere`-RŐL (a lista egymás utáni
// végighívása, a TCP-kör). A D69/2 óta a kör a kapun fut, minden célra egyszerre (a kapu
// próbái: `udpKapuProba.js`; a teljes kör: `parancssorProba.js`). ⭐ Ami ebből a rétegből
// maradt, az a KÖNYVELÉS — és a lényeg ugyanaz: EGY TÁRS BUKÁSA NEM DÖNTI EL A KÖRT.

/** Egy kopogás-eredmény a kapu alakjában: a `cel` az, amire kopogtunk. */
const eredmeny = (hoszt, port, ok, felelt = null) => ({
  cel: { cim: hoszt, port },
  cim: felelt?.cim ?? hoszt, port: felelt?.port ?? port, ok
});

proba('A siker feljegyződik, és a bukás-számláló NULLÁZÓDIK', () => {
  const lista = [{ hoszt: 'a', port: 1, utoljara: null, sikertelen: 7 }];
  const m = kopogasMegfigyelesei(lista, [eredmeny('a', 1, true)], 12345);
  return m.length === 1 && m[0].utoljara === 12345 && m[0].sikertelen === 0;
});

proba('⭐ A KIHAGYOTT cím nem megfigyelés (D71 (ii)) — se siker, se kudarc: a számláló érintetlen', () => {
  // ⭐ A társat a csoport egy másik címén értük el, erre a címre rá sem kopogtunk. Ha ez kudarcnak
  // számítana, egy élő, de épp más úton elért cím bukás-számlálója nőne — alaptalanul.
  const lista = [{ hoszt: 'a', port: 1, utoljara: 5000, sikertelen: 2 }];
  const m = kopogasMegfigyelesei(lista, [{ ...eredmeny('a', 1, false), kihagyva: true }], 9999);
  return m.length === 0;
});

proba('A bukás NÖVELI a számlálót, de az utolsó sikert nem törli', () => {
  const lista = [{ hoszt: 'a', port: 1, utoljara: 5000, sikertelen: 2 }];
  const m = kopogasMegfigyelesei(lista, [eredmeny('a', 1, false)], 9999);
  return m[0].sikertelen === 3 && m[0].utoljara === 5000;
});

proba('⭐⭐ EGY TÁRS BUKÁSA NEM DÖNTI EL A KÖRT — a többi sikere feljegyződik', () => {
  const lista = [
    { hoszt: 'halott', port: 1, utoljara: null, sikertelen: 0 },
    { hoszt: 'elo1', port: 1, utoljara: null, sikertelen: 0 },
    { hoszt: 'elo2', port: 1, utoljara: null, sikertelen: 0 }
  ];
  const m = kopogasMegfigyelesei(lista,
    [eredmeny('halott', 1, false), eredmeny('elo1', 1, true), eredmeny('elo2', 1, true)], 7);
  const szerint = new Map(m.map((t) => [t.hoszt, t]));
  return m.length === 3
    && szerint.get('halott').sikertelen === 1
    && szerint.get('elo1').utoljara === 7 && szerint.get('elo2').utoljara === 7;
});

proba('⭐ CSAK A LISTÁRÓL JÖTT CÉLOKAT könyveli — a kötések és a friss címek nem ide tartoznak', () => {
  // ⚠️ A kapu a kötésekre és a friss UDP-címekre is kopog; azok könyvelése a saját
  // jegyzékükben van. *Egy friss cím sikere nem kerülhet fel a te listádra.*
  const lista = [{ hoszt: 'a', port: 1 }];
  const m = kopogasMegfigyelesei(lista, [eredmeny('a', 1, true), eredmeny('kotes', 9, true)], 7);
  return m.length === 1 && m[0].hoszt === 'a';
});

proba('⭐ A PORTVÁLTÁS a CÉLHOZ kötődik — a listás bejegyzés frissül, nem egy új', () => {
  // ⚠️ A mobil NAT portot válthat (32. mérés): a társ más portról felel. A könyvelés azt a
  // bejegyzést frissíti, AMIBŐL a kopogás indult.
  const lista = [{ hoszt: '10.0.0.5', port: 7373, sikertelen: 2 }];
  const m = kopogasMegfigyelesei(lista,
    [eredmeny('10.0.0.5', 7373, true, { cim: '10.0.0.5', port: 41000 })], 7);
  return m.length === 1 && m[0].port === 7373 && m[0].utoljara === 7 && m[0].sikertelen === 0;
});

proba('Üres eredménnyel nincs megfigyelés (és nem is dob)', () =>
  kopogasMegfigyelesei([{ hoszt: 'a', port: 1 }], []).length === 0
  && kopogasMegfigyelesei([], undefined).length === 0);

// ===================================
// ⛔⛔⛔ A KÖR MEGFIGYELÉSEI A FRISS LISTÁRA (2026-09-22)
// ===================================
//
// ⛔ MIÉRT SZÜLETETT: az őrjárat a kör eleji listát írta ki a kör végén, és ezzel
// elsöpörte, amit egy másik ág közben írt (mérve: a napló „+1 cím"-et írt, a lemezen
// mégsem volt ott). ⭐ A válasz nem zárolás, hanem szerkezet: a kör csak MEGFIGYEL, a friss
// listára pedig RÁVEZETÜNK. *2026-09-26 óta a megfigyelés a kopogásból jön.*

proba('⭐⭐ A MEGFIGYELÉS RÁSZÁLL A FRISS SORRA — a megfigyelés-mezők átjönnek', () => {
  const m = kopogasMegfigyelesei([{ hoszt: 'a', port: 1, utoljara: null, sikertelen: 3 }],
    [eredmeny('a', 1, true)], 12345);
  // A friss lemezkép: ugyanaz a társ, de közben a kéz NEVET adott neki.
  const friss = [{ hoszt: 'a', port: 1, utoljara: null, sikertelen: 3, nev: 'Anna gépe' }];
  const uj = megfigyelesekRavezetese(friss, m);

  return uj.length === 1
    && uj[0].utoljara === 12345        // a kör megfigyelése átjött
    && uj[0].sikertelen === 0
    && uj[0].nev === 'Anna gépe';      // ⭐ …és a frissen írt mezőt NEM tapostuk le
});

proba('⛔⛔ A KÖR ALATT FELVETT ÚJ TÁRS MEGMARAD — ez az elveszett írás magja', () => {
  const m = kopogasMegfigyelesei([{ hoszt: 'regi', port: 1 }], [eredmeny('regi', 1, true)], 7);
  // Közben a kéz (`tars`) felvett egy címet:
  const friss = [{ hoszt: 'regi', port: 1 }, { hoszt: 'kozben-felvett', port: 2 }];
  const uj = megfigyelesekRavezetese(friss, m);

  return uj.length === 2
    && uj.some((t) => t.hoszt === 'kozben-felvett')
    && uj.find((t) => t.hoszt === 'regi').utoljara === 7;
});

proba('⛔ AMIT A KÉZ LEVETT, AZT A KÖR NEM TÁMASZTJA FEL', () => {
  // ⚠️ A `tars torol` kimondott emberi tett; a megfigyelés csak a kör mellékterméke.
  // *Egy sorrend-frissítés nem hozhat vissza valakit, akit szándékosan levettünk.*
  const m = kopogasMegfigyelesei([{ hoszt: 'a', port: 1 }, { hoszt: 'torolt', port: 2 }],
    [eredmeny('a', 1, true), eredmeny('torolt', 2, true)], 7);
  const uj = megfigyelesekRavezetese([{ hoszt: 'a', port: 1 }], m);
  return uj.length === 1 && uj[0].hoszt === 'a';
});

proba('⛔ A SIKERTELEN KÖR NEM TÖRLI a frissen szerzett sikert', () => {
  // ⚠️ AZ ESET: a kör indulásakor a társsal még sose sikerült, és most sem sikerül — a
  // megfigyelés `utoljara`-ja tehát ÜRES. Közben viszont egy másik ágon (a postaláda) épp
  // sikerült vele beszélni, és a friss soron már ott az idő.
  // *Egy üres érték ráírása TÖRÖLNÉ a frissen szerzett sikert.*
  const m = kopogasMegfigyelesei([{ hoszt: 'a', port: 1 }], [eredmeny('a', 1, false)]);
  const uj = megfigyelesekRavezetese([{ hoszt: 'a', port: 1, utoljara: 999 }], m);
  return uj[0].utoljara === 999 && uj[0].sikertelen === 1;
});

proba('⛔ …és egy RÉGI siker-időt sem ír a frissebbre (2026-09-23)', () => {
  // ⛔ AZ ESET: a társsal a kör ELŐTT már sikerült (5000), most nem sikerül — a
  // megfigyelés tehát a kör eleji 5000-et viszi tovább. Közben egy másik ágon újra
  // sikerült (9000). *A régi idő ráírása a frissebb sikert tüntetné el.*
  const m = kopogasMegfigyelesei([{ hoszt: 'a', port: 1, utoljara: 5000, sikertelen: 2 }],
    [eredmeny('a', 1, false)]);
  const uj = megfigyelesekRavezetese([{ hoszt: 'a', port: 1, utoljara: 9000, sikertelen: 0 }], m);
  return uj[0].utoljara === 9000 && uj[0].sikertelen === 3;
});

proba('⭐ Megfigyelés nélkül a friss lista VÁLTOZATLAN (nincs kárt okozó üres írás)', () => {
  const friss = [{ hoszt: 'a', port: 1, nev: 'x' }];
  return megfigyelesekRavezetese(friss, []) === friss
    && megfigyelesekRavezetese(friss, undefined) === friss;
});

// ===== ÖNMAGUNK KISZŰRÉSE — hogy a készülék ne hívogassa saját magát =====
//
// ⚠️ MÉRÉSBŐL SZÜLETETT (2026-08-30). A fejlesztő laptopja minden körben ÖNMAGÁVAL cserélt
// (707 bájt, 0 esemény), mert a saját IPv6-címe rákerült a társ-listára — és mivel a hívás
// mindig „sikerült", a rendezés a lista ÉLÉRE tette, a valódi társ elé. A cserén tovább is
// terjedt: a telefon is megörökölte.

proba('A cím-alak normalizálva: kis/nagybetű és zóna-utótag nem különböztet meg', () => {
  return cimNormalizalasa('2001:AB::1') === '2001:ab::1'
    && cimNormalizalasa('fe80::1%eth0') === 'fe80::1'
    && cimNormalizalasa('  192.168.1.5 ') === '192.168.1.5';
});

proba('⭐ Az IPv4-be ágyazott IPv6-alak UGYANAZ a gép', () => {
  // A foglalat hol `192.168.1.5`-öt, hol `::ffff:192.168.1.5`-öt ad vissza ugyanarra.
  return cimNormalizalasa('::ffff:192.168.1.5') === '192.168.1.5';
});

proba('⭐⭐ A SAJÁT CÍMÜNK nem kerül a hívási listára — PORTTÓL FÜGGETLENÜL', () => {
  // ⚠️ A port szándékosan nem számít: magunkat semmilyen porton nem hívjuk. Egy korábbi,
  // szűkebb szűrő cím+port párost hasonlított, és az IPv6-os saját cím átcsúszott rajta.
  const sajat = ['192.168.1.134', '2001:4c4d:25cb:b200:7395:e583:5de6:5a1a'];
  return sajatCimE('192.168.1.134', sajat)
    && sajatCimE('2001:4C4D:25CB:B200:7395:E583:5DE6:5A1A', sajat)   // nagybetűvel is
    && !sajatCimE('192.168.1.99', sajat);
});

proba('⭐⭐ A kapott címekből a sajátunk kiesik, az idegen bennmarad', () => {
  const kapott = [
    { hoszt: '2001:4c4d:25cb:b200:7395:e583:5de6:5a1a', port: 7373 },   // mi vagyunk
    { hoszt: '192.168.1.134', port: 9999 },                              // mi, más porton
    { hoszt: '192.168.1.50', port: 7373 }                                // valódi társ
  ];
  const { cimek, kihagyott } = sajatCimekKiszurese(kapott,
    ['192.168.1.134', '2001:4c4d:25cb:b200:7395:e583:5de6:5a1a']);
  return kihagyott === 2 && cimek.length === 1 && cimek[0].hoszt === '192.168.1.50';
});

proba('Ha nem tudjuk a saját címeinket, semmit nem szűrünk ki (nem találgatunk)', () => {
  const kapott = [{ hoszt: '192.168.1.50', port: 7373 }];
  return sajatCimekKiszurese(kapott, []).cimek.length === 1
    && sajatCimekKiszurese(kapott).cimek.length === 1;
});

// ===================================
// ⛔⛔ A NAT MÖGÖTTI TÁRS — a tükör cím+port párként szűr (2026-09-22, Csaba „B" döntése)
// ===================================
//
// ⛔ A BAJ: a NAT miatt egy egész háztartás EGYETLEN külső címet mutat, és a készülékeket
// csak a PORT különbözteti meg; mobilon (CGNAT) ez több ezer idegen előfizetőre is igaz.
// Amíg a tükör-címet puszta cím szerint szűrtük, minden velünk egy NAT-on lévő társ
// **láthatatlan volt** — a testvér-telefon (D22) és egy CGNAT alatti vadidegen is.

proba('⭐⭐⭐ A VELÜNK EGY NAT-ON LÉVŐ TÁRS BEKERÜL — ugyanaz a cím, MÁS port', () => {
  const kapott = [
    { hoszt: '31.46.250.22', port: 31573 },   // ⭐ a testvér-telefon (vagy egy CGNAT-társ)
    { hoszt: '31.46.250.22', port: 7373 }     // ⛔ MI magunk: a pontos pár
  ];
  const { cimek, kihagyott } = sajatCimekKiszurese(kapott,
    ['192.168.1.134'],                        // a gépünk LAN-címe — ez NEM a külső cím
    { cim: '31.46.250.22', port: 7373 });     // a tükör: így látnak minket kívülről

  return kihagyott === 1
    && cimek.length === 1
    && cimek[0].port === 31573;
});

proba('⛔ …de ÖNMAGUNKAT továbbra sem hívjuk: a pontos cím+port pár kiesik', () => {
  const kapott = [{ hoszt: '31.46.250.22', port: 7373 }];
  return sajatCimekKiszurese(kapott, [], { cim: '31.46.250.22', port: 7373 })
    .cimek.length === 0;
});

proba('⛔⛔ ÉS A 2026-08-30-I TANULSÁG MEGMARAD: az INTERFÉSZ-cím portostul kiesik', () => {
  // ⚠️ EZ AZ, AMI MIATT A KÉT FORRÁS SZÉTVÁLIK. A saját IPv6-címünket CSAK az
  // interfész-lista fogja meg — a tükör IPv4-et mond, tehát a cím+port pár sosem
  // illeszkedne rá. *Ha egyetlen szabályt használnánk, az egyik eset mindig elromlana.*
  const kapott = [
    { hoszt: '2001:4c4d:25cb:b200:7395:e583:5de6:5a1a', port: 55555 },  // mi, röpke porton
    { hoszt: '192.168.1.134', port: 9999 }                              // mi, más porton
  ];
  const { cimek } = sajatCimekKiszurese(kapott,
    ['192.168.1.134', '2001:4c4d:25cb:b200:7395:e583:5de6:5a1a'],
    { cim: '31.46.250.22', port: 7373 });
  return cimek.length === 0;
});

proba('⚠️ Tükör PORT nélkül nem szűr a tükör-ág (nem találgatunk egy fél párból)', () => {
  // ⛔ Egy port nélküli tükörrel a régi, cím-alapú viselkedéshez esnénk vissza — épp ahhoz,
  // amit ez a javítás megszüntetett. *Inkább egy fölösleges hívás, mint egy kiesett társ.*
  const kapott = [{ hoszt: '31.46.250.22', port: 7373 }];
  return sajatCimekKiszurese(kapott, [], { cim: '31.46.250.22' }).cimek.length === 1;
});

// ===================================
// ⭐ A SZELET-CÍMJEGYZÉK — „kinél van ez az entitás?"
// ===================================
//
// Csaba észrevételéből: *„böngészés közben az összes entitásnak elérhetőnek kell lennie,
// vagy pontosan tudnunk kell, hogy az entitások hol vannak."* A társ-lista erre nem elég:
// az azt mondja meg, KIKKEL beszélünk, nem azt, hogy KINÉL VAN egy adott gondolat.

proba('Megjegyzett szelet-cím visszakérdezhető', () => {
  let j = [];
  j = szeletCimMegjegyzese(j, 'E-1', '192.168.1.50', 7373, 1000);
  const cimek = szeletCimei(j, 'E-1', 2000);
  return cimek.length === 1 && cimek[0].hoszt === '192.168.1.50' && cimek[0].port === 7373;
});

proba('MÁSIK entitás címét nem adja vissza', () => {
  let j = [];
  j = szeletCimMegjegyzese(j, 'E-1', '192.168.1.50', 7373, 1000);
  return szeletCimei(j, 'E-2', 2000).length === 0;
});

proba('⭐ NÉV NINCS BENNE — csak cím, port és idő (D6)', () => {
  let j = [];
  j = szeletCimMegjegyzese(j, 'E-1', '192.168.1.50', 7373, 1000);
  const mezok = Object.keys(j[0]).sort().join(',');
  // Ha ide valaha bekerülne egy `szerzo` vagy `nev` mező, ez a próba bukik — és jó, hogy
  // bukik: a `tulajdonos → cím` pár PROFIL lenne.
  return mezok === 'entitas,hoszt,mikor,port';
});

proba('Ugyanaz a cím kétszer: EGYSZER szerepel, a FRISS idővel', () => {
  let j = [];
  j = szeletCimMegjegyzese(j, 'E-1', '192.168.1.50', 7373, 1000);
  j = szeletCimMegjegyzese(j, 'E-1', '192.168.1.50', 7373, 5000);
  const cimek = szeletCimei(j, 'E-1', 6000);
  return j.length === 1 && cimek.length === 1 && cimek[0].mikor === 5000;
});

proba('⚠️ AZ ELÉVÜLT CÍM NEM JÖN VISSZA — a cím múlandó körülmény, nem igazság', () => {
  let j = [];
  j = szeletCimMegjegyzese(j, 'E-1', '192.168.1.50', 7373, 0);
  const regen = szeletCimei(j, 'E-1', SZELET_CIM_ELEVULES + 1);
  const meg = szeletCimei(j, 'E-1', SZELET_CIM_ELEVULES - 1);
  return regen.length === 0 && meg.length === 1;
});

proba('A LEGFRISSEBB cím van elöl', () => {
  let j = [];
  j = szeletCimMegjegyzese(j, 'E-1', '10.0.0.1', 7373, 1000);
  j = szeletCimMegjegyzese(j, 'E-1', '10.0.0.2', 7373, 3000);
  j = szeletCimMegjegyzese(j, 'E-1', '10.0.0.3', 7373, 2000);
  return szeletCimei(j, 'E-1', 4000).map((c) => c.hoszt).join(',') === '10.0.0.2,10.0.0.3,10.0.0.1';
});

proba('⭐ Az IPv4-be ágyazott IPv6-alak UGYANAZ a cím itt is', () => {
  let j = [];
  j = szeletCimMegjegyzese(j, 'E-1', '192.168.1.50', 7373, 1000);
  j = szeletCimMegjegyzese(j, 'E-1', '::ffff:192.168.1.50', 7373, 2000);
  // Ha ezt nem ismerné fel, KÉT bejegyzés lenne ugyanarra a gépre.
  return j.length === 1 && szeletCimei(j, 'E-1', 3000)[0].mikor === 2000;
});

proba('Az érvénytelen cím vagy port nem kerül be', () => {
  let j = [];
  j = szeletCimMegjegyzese(j, 'E-1', '', 7373, 1000);
  j = szeletCimMegjegyzese(j, 'E-1', '10.0.0.1', 0, 1000);
  j = szeletCimMegjegyzese(j, 'E-1', '10.0.0.1', 99999, 1000);
  return j.length === 0;
});

proba('A takarítás kidobja az elévülteket, a friss megmarad', () => {
  let j = [];
  j = szeletCimMegjegyzese(j, 'E-1', '10.0.0.1', 7373, 0);
  j = szeletCimMegjegyzese(j, 'E-1', '10.0.0.2', 7373, SZELET_CIM_ELEVULES);
  const tiszta = szeletJegyzekTakaritasa(j, SZELET_CIM_ELEVULES + 1);
  return tiszta.length === 1 && tiszta[0].hoszt === '10.0.0.2';
});

proba('⚠️ A jegyzék NEM hízik korlátlanul: szeletenként legfeljebb a korlát marad', () => {
  let j = [];
  for (let i = 0; i < SZELET_CIM_KORLAT + 10; i++) {
    j = szeletCimMegjegyzese(j, 'E-1', '10.0.0.' + i, 7373, 1000 + i);
  }
  const tiszta = szeletJegyzekTakaritasa(j, 2000);
  return j.length === SZELET_CIM_KORLAT + 10 && tiszta.length === SZELET_CIM_KORLAT
    // A legfrissebbek maradnak meg.
    && tiszta[0].mikor === 1000 + SZELET_CIM_KORLAT + 9;
});

// ===== ⭐⭐ A FRISS UDP-CÍMEK (2026-09-18) — a cím-elévülés válasza =====
//
// ⛔ MIT KELL ITT BIZONYÍTANI? Nem azt, hogy „terjed a cím" — azt a vonal próbája méri.
// Hanem azt a HÁRMAT, amiért ez a jegyzék külön él a társ-listától:
//   1. a KOR utazik, nem időbélyeg (idegen órában nem bízunk);
//   2. az ELÉVÜLT cím nem kerül be és nem is terjed tovább;
//   3. a jegyzék NEM hízik korlátlanul.

proba('A kor a SAJÁT óránkhoz kötődik — nem az idegen időbélyegéhez', () => {
  // A társ azt mondja: „ezt a címet 30 másodperce mértük". Nálunk épp 1 000 000 az óra.
  const jegyzek = udpCimekBeolvasztasa([], [{ hoszt: '10.0.0.7', port: 41000, kor: 30 }],
    1000000);
  // A bejegyzés ideje a MI óránkon: most − 30 mp.
  return jegyzek.length === 1 && jegyzek[0].mikor === 1000000 - 30000;
});

proba('⛔ Az elévülésnél régebbi címet be sem vesszük', () => {
  const kor = Math.round(UDP_CIM_ELEVULES / 1000) + 1;      // egy másodperccel túl öreg
  const jegyzek = udpCimekBeolvasztasa([], [{ hoszt: '10.0.0.7', port: 41000, kor }], 1000000);
  return jegyzek.length === 0;
});

proba('A hibás bejegyzést kihagyjuk (nincs kor, rossz port, nem szám)', () => {
  const jegyzek = udpCimekBeolvasztasa([], [
    { hoszt: '10.0.0.1', port: 41000 },                       // nincs kor
    { hoszt: '10.0.0.2', port: 0, kor: 5 },                   // rossz port
    { hoszt: '10.0.0.3', port: 41000, kor: -5 },              // visszafelé lépő kor
    { hoszt: 42, port: 41000, kor: 5 }                        // nem szöveg
  ], 1000000);
  return jegyzek.length === 0;
});

proba('⭐ A kifelé menő lista KOR-t ad, másodpercben, a legfrissebbel elöl', () => {
  let j = [];
  j = udpCimMegjegyzese(j, '10.0.0.1', 41000, 100000);        // régebbi
  j = udpCimMegjegyzese(j, '10.0.0.2', 41001, 160000);        // frissebb
  const kifele = udpCimek(j, 200000);
  return kifele.length === 2
    && kifele[0].hoszt === '10.0.0.2' && kifele[0].kor === 40
    && kifele[1].kor === 100
    // ⚠️ Időbélyeg SOHA nem megy ki: azt a másik órája nem tudná értelmezni.
    && kifele.every((c) => c.mikor === undefined);
});

proba('⛔ Az elévült cím nem is terjed tovább', () => {
  let j = [];
  j = udpCimMegjegyzese(j, '10.0.0.1', 41000, 0);
  return udpCimek(j, UDP_CIM_ELEVULES + 1).length === 0;
});

proba('Ugyanaz a cím csak egyszer szerepel — a friss idő felülírja', () => {
  let j = [];
  j = udpCimMegjegyzese(j, '10.0.0.1', 41000, 1000);
  j = udpCimMegjegyzese(j, '10.0.0.1', 41000, 5000);
  return j.length === 1 && j[0].mikor === 5000;
});

proba('⚠️ A jegyzék NEM hízik korlátlanul: a takarítás a korlátig vág', () => {
  let j = [];
  for (let i = 0; i < UDP_CIM_KORLAT + 5; i++) j = udpCimMegjegyzese(j, '10.0.0.' + i, 41000, 1000 + i);
  const tiszta = udpJegyzekTakaritasa(j, 2000);
  return j.length === UDP_CIM_KORLAT + 5 && tiszta.length === UDP_CIM_KORLAT
    && tiszta[0].mikor === 1000 + UDP_CIM_KORLAT + 4;       // a legfrissebb elöl
});

export default futtatas;
