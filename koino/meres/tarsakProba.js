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
// ⚠️ HÁLÓZAT NÉLKÜL MÉRÜNK. A `korbeCsere` a cserét végző függvényt KÍVÜLRŐL kapja, ezért
// itt hamis cserékkel dolgozunk: van, amelyik sikerül, van, amelyik dob. Így a kör-logika
// TCP, portok és két folyamat nélkül mérhető — és nem is a hálózatot akarjuk mérni.
//
// Futtatás: node koino/meres/mind.js tarsak

import { probaGyujtemeny } from './probaFuttato.js';
import { tarsHozzaadasa, tarsTorlese, tarsakSorrendje, korbeCsere } from '../js/csere/tarsak.js';

const { proba, futtatas } = probaGyujtemeny('A társ-lista próbája');

// ===== SEGÉD: hamis csere, ami mindig sikerül, és feljegyzi, kivel hívták meg =====
function sikeresCsere(naplo) {
  return async (tars) => {
    naplo.push(tars.hoszt);
    return { uj: 1, kuldott: 2, korok: 3 };
  };
}

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
// A KÖR — ez a lépés lényege
// ===================================

proba('A kör mindenkivel megpróbálja a cserét', async () => {
  const megszolitva = [];
  const lista = [{ hoszt: 'a', port: 1 }, { hoszt: 'b', port: 1 }, { hoszt: 'c', port: 1 }];
  const kor = await korbeCsere(lista, sikeresCsere(megszolitva));
  return megszolitva.length === 3 && kor.sikeres === 3;
});

proba('⭐⭐ EGY TÁRS BUKÁSA NEM DÖNTI EL A KÖRT — a többivel megvan a csere', async () => {
  // Ez az a próba, amiért az egész A. lépés megszületett. A régi `csere <cím>` itt
  // elszállt volna, és a másik két társ SOHA nem kapja meg az eseményeket.
  const megszolitva = [];
  const lista = [
    { hoszt: 'halott', port: 1, utoljara: null, sikertelen: 0 },
    { hoszt: 'elo1', port: 1, utoljara: null, sikertelen: 0 },
    { hoszt: 'elo2', port: 1, utoljara: null, sikertelen: 0 }
  ];

  const kor = await korbeCsere(lista, async (t) => {
    if (t.hoszt === 'halott') throw new Error('ECONNREFUSED');
    megszolitva.push(t.hoszt);
    return { uj: 2, kuldott: 1, korok: 2 };
  });

  return megszolitva.length === 2          // a két élő társ megkapta
    && kor.sikeres === 2
    && kor.eredmenyek.length === 3         // a halottat is megpróbáltuk
    && kor.uj === 4;                       // 2 + 2 új esemény
});

proba('⭐ A NULLA SIKER sem dob hibát — csak nem terjedt semmi', async () => {
  // A koino ettől még működik: helyben minden művelet mehet tovább.
  const kor = await korbeCsere(
    [{ hoszt: 'a', port: 1 }, { hoszt: 'b', port: 1 }],
    async () => { throw new Error('nincs hálózat'); }
  );
  return kor.sikeres === 0 && kor.eredmenyek.length === 2 && kor.uj === 0;
});

proba('A bukás OKA megmarad (a hibaüzenet kiírható)', async () => {
  const kor = await korbeCsere([{ hoszt: 'a', port: 1 }], async () => {
    throw new Error('ECONNREFUSED');
  });
  return kor.eredmenyek[0].sikerult === false && kor.eredmenyek[0].hiba === 'ECONNREFUSED';
});

proba('A siker feljegyződik, és a bukás-számláló NULLÁZÓDIK', async () => {
  const lista = [{ hoszt: 'a', port: 1, utoljara: null, sikertelen: 7 }];
  const kor = await korbeCsere(lista, sikeresCsere([]), { most: 12345 });
  return kor.lista[0].utoljara === 12345 && kor.lista[0].sikertelen === 0;
});

proba('A bukás NÖVELI a számlálót, de az utolsó sikert nem törli', async () => {
  const lista = [{ hoszt: 'a', port: 1, utoljara: 5000, sikertelen: 2 }];
  const kor = await korbeCsere(lista, async () => { throw new Error('x'); });
  return kor.lista[0].sikertelen === 3 && kor.lista[0].utoljara === 5000;
});

proba('⭐ A kör a SORREND szerint megy: a legutóbb sikeres társ az első', async () => {
  const megszolitva = [];
  const lista = [
    { hoszt: 'hatul', port: 1, utoljara: null, sikertelen: 4 },
    { hoszt: 'elol', port: 1, utoljara: 9999, sikertelen: 0 }
  ];
  await korbeCsere(lista, sikeresCsere(megszolitva));
  return megszolitva[0] === 'elol';
});

proba('A `legfeljebb` korlátoz — a csere ára befogadási kérdés (D35)', async () => {
  const megszolitva = [];
  const lista = [
    { hoszt: 'a', port: 1, utoljara: 3, sikertelen: 0 },
    { hoszt: 'b', port: 1, utoljara: 2, sikertelen: 0 },
    { hoszt: 'c', port: 1, utoljara: 1, sikertelen: 0 }
  ];
  const kor = await korbeCsere(lista, sikeresCsere(megszolitva), { legfeljebb: 2 });
  return megszolitva.length === 2 && kor.eredmenyek.length === 2;
});

proba('⭐ A korlát miatt KIMARADT társ adata változatlan marad', async () => {
  const lista = [
    { hoszt: 'sorra-kerul', port: 1, utoljara: 9, sikertelen: 0 },
    { hoszt: 'kimarad', port: 1, utoljara: null, sikertelen: 3 }
  ];
  const kor = await korbeCsere(lista, sikeresCsere([]), { legfeljebb: 1 });
  const kimaradt = kor.lista.find((t) => t.hoszt === 'kimarad');
  return kor.lista.length === 2 && kimaradt.sikertelen === 3 && kimaradt.utoljara === null;
});

proba('Az ÜRES listával a kör nem csinál semmit (és nem is dob)', async () => {
  const kor = await korbeCsere([], sikeresCsere([]));
  return kor.sikeres === 0 && kor.eredmenyek.length === 0 && kor.lista.length === 0;
});

proba('A kör ÖSSZEGZI, mennyi eseményt kaptunk és küldtünk', async () => {
  const kor = await korbeCsere(
    [{ hoszt: 'a', port: 1 }, { hoszt: 'b', port: 1 }],
    async () => ({ uj: 3, kuldott: 5, korok: 2 })
  );
  return kor.uj === 6 && kor.kuldott === 10;
});

proba('A kör ÖSSZEGZI az ADATFORGALMAT is (D35 — ez a mobilos számlája)', async () => {
  const kor = await korbeCsere(
    [{ hoszt: 'a', port: 1 }, { hoszt: 'b', port: 1 }],
    async () => ({ uj: 0, kuldott: 0, korok: 1, bajtKuldott: 79, bajtKapott: 79 })
  );
  return kor.bajt === 316;
});

export default futtatas;
