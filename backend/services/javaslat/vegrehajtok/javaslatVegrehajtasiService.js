// backend/services/javaslat/vegrehajtok/javaslatVegrehajtasiService.js

// =====================================================
// IMPORTOK
// =====================================================
// Végrehajtó stratégiák importálása
const TorlesiVegrehajto = require('./torlesiVegrehajto');
const ModositasiVegrehajto = require('./modositasiVegrehajto');
const EgyesitesiVegrehajto = require('./egyesitesiVegrehajto');
const AthelyezesiVegrehajto = require('./athelyezesiVegrehajto');
const CsomagVegrehajto = require('./csomagVegrehajto');

// Egyezmény szolgáltatás importálása
const EgyezmenyService = require('../../egyezmenyService');

// =====================================================
// JAVASLAT VÉGREHAJTÁSI SERVICE OSZTÁLY
// =====================================================
// Ez az osztály koordinálja a javaslatok végrehajtást
// Felelősség: Végrehajtó stratégia kiválasztása, egyezmény létrehozás koordinálás
class JavaslatVegrehajtasiService {

// ----- JAVASLAT VÉGREHAJTÁSA -----
/**
* Javaslat végrehajtása típus szerint
* Kiválasztja a megfelelő végrehajtót és meghívja
* MÓDOSÍTVA: képes töredék csoporttal is dolgozni (javaslat tömb esetén)
* Tömb esetén megvizsgálja, hogy Egyesítéses vagy Csomag csoport-e a töredékcsoport
* @param {Object|Array} javaslatVagyToredekek - Egy javaslat objektum VAGY ugyanahhoz a csoporthoz tartozó töredék javaslatok tömbje
* @returns {Promise} Végrehajtás eredménye
* @throws {Error} Ha ismeretlen javaslat típus vagy végrehajtási hiba
*/
async javaslatVegrehajtasa(javaslatVagyToredekek) { // A javaslat vagy töredék csoport végrehajtását végző metódus kezdete
console.log('javaslatVegrehajtasa() - KEZDÉS', { // Kezdő log a bemenet típusáról
tipus: Array.isArray(javaslatVagyToredekek) ? 'TÖMB' : 'EGYEDI', // Megnézzük, hogy tömb vagy egyedi objektum érkezett-e
darab: Array.isArray(javaslatVagyToredekek) ? javaslatVagyToredekek.length : 1 // Logoljuk, hogy hány elemet kaptunk
}); // Kezdő log vége

let javaslat = null; // Ebbe a változóba kerül a végrehajtónak átadott normalizált javaslat objektum
let eredetiToredekek = []; // Ebben a tömbben megőrizzük az eredeti töredékeket, ha tömb érkezett
let tudatpontToredekJavaslatIdk = []; // Ebben a tömbben tároljuk a tudatpont átrendezéshez szükséges összes forrás javaslat azonosítót

if (Array.isArray(javaslatVagyToredekek)) { // Ha tömb érkezett, akkor töredék csoportot kell összevonni

if (javaslatVagyToredekek.length === 0) { // Ellenőrizzük, hogy a tömb nem üres-e
throw new Error('javaslatVegrehajtasa: üres töredék lista'); // Üres tömb esetén hibát dobunk
} // Üres tömb ellenőrzés vége

eredetiToredekek = javaslatVagyToredekek; // Elmentjük az eredeti töredék tömböt későbbi felhasználásra

const elso = javaslatVagyToredekek[0]; // Az első töredéket kivesszük alapadat forrásnak

if (!elso.javaslatTipus) { // Ellenőrizzük, hogy az első töredéken van-e javaslat típus
throw new Error('javaslatVegrehajtasa: töredék csoport első elemének nincs javaslatTipus mezője'); // Ha nincs javaslat típus, hibát dobunk
} // Javaslat típus ellenőrzés vége

// =====================================================
// TÖREDÉKCSOPORT TÍPUSÁNAK MEGHATÁROZÁSA
// =====================================================
// A töredékek típusát az egyes töredékek tényleges javaslatTipus mezőjéből
// határozzuk meg - NEM állítjuk fixen 'Csomag'-ra.
// Két lehetséges eset:
//   1. Egyesítéses csoport: minden töredék javaslatTipusa 'Egyesites'
//   2. Csomag csoport: a töredékek javaslatTipusa Modositas / Torles / Athelyezes (vegyes)

const elsoJavaslatTipus = elso.javaslatTipus; // Kiolvasuk az első töredék tényleges típusát

console.log('javaslatVegrehajtasa() - Töredékcsoport típus meghatározása - KEZDÉS', { // Logoljuk a típus meghatározás indulását
elsoJavaslatTipus, // Az első töredék típusa
toredekCsoportId: elso.toredekCsoportId || null // A töredékcsoport azonosítója
}); // Típus meghatározás kezdő log vége

let csoportJavaslatTipus; // Ebben a változóban tároljuk az összevont csoport tényleges típusát

if (elsoJavaslatTipus === 'Egyesites') { // Ha az első töredék típusa Egyesítés

// Biztonsági ellenőrzés: minden töredéknek ugyanolyan típusúnak kell lennie
// Nem keveredhet Egyesítés más típussal egy csoporton belül
const mindEgyesites = javaslatVagyToredekek.every( // Megvizsgáljuk, hogy minden töredék Egyesítés típusú-e
(toredek) => toredek.javaslatTipus === 'Egyesites' // Feltétel: a töredék típusa Egyesítés
); // every() hívás vége

if (!mindEgyesites) { // Ha nem minden töredék Egyesítés típusú
throw new Error( // Hibát dobunk, mert inkonzisztens a töredékcsoport
'javaslatVegrehajtasa: inkonzisztens töredékcsoport - Egyesítéses csoportban nem Egyesítés típusú töredék található' // Részletes hibaüzenet
); // Hiba dobás vége
} // Inkonzisztencia ellenőrzés vége

csoportJavaslatTipus = 'Egyesites'; // Az összevont csoport típusa: Egyesítés

} else { // Ha az első töredék típusa nem Egyesítés, akkor Csomag csoportról van szó

csoportJavaslatTipus = 'Csomag'; // Az összevont csoport típusa: Csomag (vegyes műveletek)

} // Töredékcsoport típus meghatározás vége

console.log('javaslatVegrehajtasa() - Töredékcsoport típus meghatározása - VÉGE', { // Logoljuk a típus meghatározás eredményét
elsoJavaslatTipus, // Az első töredék tényleges típusa
csoportJavaslatTipus, // A végül meghatározott csoport típus
toredekDb: javaslatVagyToredekek.length // A töredékek darabszáma
}); // Típus meghatározás záró log vége

const osszesErintettEntitas = []; // Ebben a tömbben gyűjtjük össze az összes töredék összes érintett entitását

for (const toredek of javaslatVagyToredekek) { // Végigmegyünk az összes töredéken
if (Array.isArray(toredek.erintettEntitasok)) { // Csak akkor dolgozunk vele, ha az erintettEntitasok tényleg tömb
for (const entitas of toredek.erintettEntitasok) { // Végigmegyünk az aktuális töredék entitásain
osszesErintettEntitas.push(entitas); // Hozzáadjuk az aktuális entitást az összevont listához
} // Az aktuális töredék összes entitását hozzáadtuk
} // Az aktuális töredék entitás listájának kezelése vége
} // Az összes töredék feldolgozása vége

console.log('javaslatVegrehajtasa() - Töredék csoport összevonása', { // Logoljuk az összevonás eredményét
toredekCsoportId: elso.toredekCsoportId || null, // Logoljuk a közös töredék csoport azonosítót
eredetiToredekDb: javaslatVagyToredekek.length, // Logoljuk az eredeti töredékek darabszámát
osszesErintettEntitasDb: osszesErintettEntitas.length // Logoljuk az összesített érintett entitások darabszámát
}); // Összevonási log vége

javaslat = { // Létrehozzuk az összevont javaslat objektumot a végrehajtó számára
_id: elso._id, // Technikai azonosítónak továbbra is az első töredék azonosítóját használjuk
javaslatTipus: csoportJavaslatTipus, // JAVÍTVA: a tényleges csoport típust állítjuk be (Egyesites vagy Csomag)
erintettEntitasok: osszesErintettEntitas, // Az összes érintett entitást egy tömbben adjuk tovább
letrehozo: elso.letrehozo, // A létrehozó eembert az első töredékből vesszük át
indoklas: elso.indoklas, // Az indoklást az első töredékből vesszük át
szuloId: elso.szuloId, // A szülő azonosítót technikai okból az első töredékből vesszük át
szuloTipus: elso.szuloTipus, // A szülő típusát az első töredékből vesszük át
egyezmenyTarhelyId: elso.egyezmenyTarhelyId, // Az egyezmény tárhely azonosítót az első töredékből vesszük át
toredekCsoportId: elso.toredekCsoportId || null, // A töredék csoport azonosítót is átadjuk
egyesitesAdatok: elso.egyesitesAdatok || null, // Az egyesítés adatait az első töredékből vesszük át (minden töredékben ugyanaz van)
modositasAdatok: elso.modositasAdatok || null, // A módosítás adatait kompatibilitás miatt átadjuk
athelyezesAdatok: elso.athelyezesAdatok || null, // Az áthelyezés adatait kompatibilitás miatt átadjuk
csomagAdatok: elso.csomagAdatok || null, // A csomag adatait kompatibilitás miatt átadjuk
eredetiToredekJavaslatok: eredetiToredekek // Átadjuk az eredeti töredék javaslatokat is későbbi csoportos logikához
}; // Az összevont javaslat objektum vége

tudatpontToredekJavaslatIdk = eredetiToredekek.map( // Összegyűjtjük az összes eredeti töredék javaslat azonosítóját
(toredek) => (toredek._id || toredek.id).toString() // Minden töredék azonosítóját stringgé alakítjuk
).filter(Boolean); // Kiszűrjük az esetlegesen üres értékeket

console.log('javaslatVegrehajtasa() - Specifikus adatok átmásolva', { // Logoljuk az összevont objektum fontos mezőit
javaslatId: javaslat._id, // Logoljuk a technikai javaslat azonosítót
javaslatTipus: javaslat.javaslatTipus, // Logoljuk a végrehajtásra kerülő javaslat típust
vanEgyesitesAdatok: !!javaslat.egyesitesAdatok, // Logoljuk, hogy van-e egyesítés adat
vanModositasAdatok: !!javaslat.modositasAdatok, // Logoljuk, hogy van-e módosítás adat
vanAthelyezesAdatok: !!javaslat.athelyezesAdatok, // Logoljuk, hogy van-e áthelyezés adat
vanCsomagAdatok: !!javaslat.csomagAdatok, // Logoljuk, hogy van-e csomag adat
eredetiToredekDb: eredetiToredekek.length // Logoljuk az eredeti töredékek számát
}); // Specifikus adatok log vége

} else { // Ha nem tömb érkezett, akkor nincs szükség összevonásra
javaslat = javaslatVagyToredekek; // Az eredeti javaslat objektumot használjuk közvetlenül
tudatpontToredekJavaslatIdk = [String(javaslat?._id || javaslat?.id)].filter(Boolean); // Egyedi javaslat esetén egy elemű listába tesszük a javaslat azonosítóját
} // Bemenet normalizálás vége

if (!javaslat) { // Ellenőrizzük, hogy biztosan létrejött-e a normalizált javaslat objektum
throw new Error('A javaslat objektum megadása kötelező'); // Ha nem, hibát dobunk
} // Javaslat objektum ellenőrzés vége

console.log('javaslatVegrehajtasa() - NORMALIZÁLT BEMENET', { // Logoljuk a normalizált bemenet fő adatait
javaslatId: javaslat._id, // A javaslat technikai azonosítója
tipus: javaslat.javaslatTipus, // A normalizált javaslat típusa
erintettEntitasokDb: Array.isArray(javaslat.erintettEntitasok) ? javaslat.erintettEntitasok.length : 0, // Az érintett entitások darabszáma
toredekCsoportId: javaslat.toredekCsoportId || null, // A töredék csoport azonosítója, ha van
tudatpontToredekJavaslatIdk: tudatpontToredekJavaslatIdk // A tudatpont átrendezés forrás javaslat azonosító listája
}); // Normalizált bemenet log vége

if (!javaslat.javaslatTipus) { // Ellenőrizzük, hogy a normalizált javaslaton van-e típus
throw new Error('A javaslat típusa nincs megadva'); // Hiányzó típus esetén hibát dobunk
} // Javaslat típus ellenőrzés vége

let vegrehajto = null; // Ebben a változóban tároljuk a kiválasztott végrehajtót

switch (javaslat.javaslatTipus) { // A javaslat típusa alapján kiválasztjuk a megfelelő végrehajtót
case 'Torles': // Ha a típus Torles
vegrehajto = TorlesiVegrehajto; // A törlési végrehajtót állítjuk be
break; // Kilépünk a switch adott ágából
case 'Modositas': // Ha a típus Modositas
vegrehajto = ModositasiVegrehajto; // A módosítási végrehajtót állítjuk be
break; // Kilépünk a switch adott ágából
case 'Egyesites': // Ha a típus Egyesites (egyedi javaslat VAGY Egyesítéses töredékcsoport)
vegrehajto = EgyesitesiVegrehajto; // Az egyesítési végrehajtót állítjuk be
break; // Kilépünk a switch adott ágából
case 'Athelyezes': // Ha a típus Athelyezes
vegrehajto = AthelyezesiVegrehajto; // Az áthelyezési végrehajtót állítjuk be
break; // Kilépünk a switch adott ágából
case 'Csomag': // Ha a típus Csomag (vegyes műveletek töredékcsoportja)
vegrehajto = CsomagVegrehajto; // A csomag végrehajtót állítjuk be
break; // Kilépünk a switch adott ágából
default: // Ha egyik ismert típus sem illeszkedik
throw new Error(`Ismeretlen javaslat típus: ${javaslat.javaslatTipus}`); // Ismeretlen típus esetén hibát dobunk
} // A switch szerkezet vége

console.log('javaslatVegrehajtasa() - Végrehajtó kiválasztva', { // Logoljuk a kiválasztott végrehajtót
javaslatTipus: javaslat.javaslatTipus, // A javaslat típusa
vegrehajtoNev: vegrehajto?.constructor?.name || 'IsmeretlenVegrehajto' // A kiválasztott végrehajtó osztály neve
}); // Végrehajtó kiválasztási log vége

console.log('javaslatVegrehajtasa >>>>>>>>>>>>>>>>>>>>>>>>> vegrehajto.vegrehajtas', { // Logoljuk a végrehajtó hívásának indítását
javaslatId: javaslat._id, // Logoljuk a javaslat azonosítóját
javaslatTipus: javaslat.javaslatTipus // Logoljuk a javaslat típusát
}); // Végrehajtó hívás előtti log vége

const vegrehajatasEredmeny = await vegrehajto.vegrehajtas(javaslat); // Meghívjuk a kiválasztott végrehajtót a normalizált javaslattal

console.log('javaslatVegrehajtasa() - Végrehajtás eredménye', { // Logoljuk a végrehajtás eredményének főbb adatait
javaslatId: javaslat._id, // Logoljuk a javaslat azonosítóját
javaslatTipus: javaslat.javaslatTipus, // Logoljuk a javaslat típusát
vegrehajatasEredmeny // Logoljuk a teljes végrehajtási eredményt
}); // Végrehajtási eredmény log vége

console.log('Egyezmény létrehozása...'); // Logoljuk, hogy indul az egyezmény létrehozása

console.log('javaslatVegrehajtasa >>>>>>>>>>>>>>>>>>>>>>>>>> EgyezmenyService.egyezmenyLetrehozasa', { // Logoljuk az egyezmény létrehozásának indítását
javaslatId: javaslat._id, // Logoljuk a javaslat azonosítóját
javaslatTipus: javaslat.javaslatTipus, // Logoljuk a javaslat típusát
toredekCsoportId: javaslat.toredekCsoportId || null // Logoljuk a töredék csoport azonosítót
}); // Egyezmény létrehozás előtti log vége

const egyezmeny = await EgyezmenyService.egyezmenyLetrehozasa( // Meghívjuk az egyezmény létrehozását
javaslat, // Átadjuk a végrehajtott javaslat snapshotját
vegrehajatasEredmeny // Átadjuk a végrehajtás eredményét is
); // Egyezmény létrehozás vége

console.log('Egyezmény létrehozva:', egyezmeny._id); // Logoljuk a létrejött egyezmény azonosítóját

console.log('Tudatpontok átrendezése javaslat→egyezmény...'); // Logoljuk, hogy indul a tudatpontok átrendezése

if (tudatpontToredekJavaslatIdk.length === 0) { // Ellenőrizzük, hogy biztosan van-e legalább egy forrás javaslat azonosító
throw new Error('A tudatpontok átrendezéséhez nem található forrás javaslat azonosító'); // Ha nincs forrás azonosító, hibát dobunk
} // Forrás javaslat azonosító lista ellenőrzés vége

console.log('javaslatVegrehajtasa >>>>>>>>>>>>>>>>>>>>>>>>>>>> EgyezmenyService.tudatpontokAtrendezeseJavaslatrolEgyezmenyre', { // Logoljuk a tudatpont átrendezés indítását
tudatpontToredekJavaslatIdk: tudatpontToredekJavaslatIdk, // Logoljuk az összes forrás javaslat azonosítót
egyezmenyId: egyezmeny._id.toString() // Logoljuk a cél egyezmény azonosítóját
}); // Tudatpont átrendezés előtti log vége

const tudatpontEredmeny = await EgyezmenyService.tudatpontokAtrendezeseJavaslatrolEgyezmenyre( // Meghívjuk a tudatpontok átrendezését
tudatpontToredekJavaslatIdk, // Átadjuk az összes forrás javaslat azonosítót
egyezmeny._id.toString() // Átadjuk az egyezmény azonosítóját stringként
); // Tudatpont átrendezés vége

console.log('Tudatpontok átrendezve:', { // Logoljuk a tudatpont átrendezés eredményét
atkoltoztetettPontok: tudatpontEredmeny.tamogatok.atkoltoztetettPontok, // Logoljuk az átköltöztetett támogató pontokat
visszaosztottPontok: tudatpontEredmeny.ellenzokEsTartozkodok.visszaosztottPontok // Logoljuk a visszaosztott pontokat
}); // Tudatpont átrendezés log vége

const eredmeny = { // Összeállítjuk a visszaadandó eredmény objektumot
siker: true, // Jelezzük, hogy sikeres volt a végrehajtás
javaslatId: javaslat._id, // Visszaadjuk a technikai javaslat azonosítót
tipus: javaslat.javaslatTipus, // Visszaadjuk a normalizált javaslat típust
vegrehajatasEredmeny: vegrehajatasEredmeny, // Visszaadjuk a végrehajtó eredményét
egyezmeny: { // Egyezmény részobjektum kezdete
id: egyezmeny._id, // Az egyezmény azonosítója
vegrehajtva: egyezmeny.vegrehajtva // Az egyezmény végrehajtott állapota
}, // Egyezmény részobjektum vége
tudatpontok: tudatpontEredmeny // Visszaadjuk a tudatpont átrendezés eredményét
}; // Eredmény objektum vége

console.log('<<<<<<<<<<<<<<<<<<<<<<< javaslatVegrehajtasa', { // Záró log a teljes eredményről
eredmeny: eredmeny // Logoljuk a visszaadandó eredmény objektumot
}); // Záró log vége

return eredmeny; // Visszaadjuk a végrehajtás összesített eredményét
} // A javaslatVegrehajtasa metódus vége

}

// =====================================================
// EXPORTÁLÁS
// =====================================================
// Service osztály singleton példány exportálása
module.exports = new JavaslatVegrehajtasiService();