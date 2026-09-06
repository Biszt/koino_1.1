// frontend/js/components/szovegSzerkeszto/eszkoztar/Eszkoztar.js

// Az Eszkoztar osztály felelőssége:
// - A három sáv példányosítása és összekötése
// - Publikus API biztosítása a SzovegSzerkeszto.js felé
// - A három sáv DOM elemeinek összerakása egy konténerbe

// Sáv osztályok importálása
import BlokktipusSav from './BlokktipusSav.js';
import KozosEszkozokSav from './KozosEszkozokSav/KozosEszkozokSav.js';
import TipusFuggoEszkozokSav from './TipusFuggoEszkozokSav/TipusFuggoEszkozokSav.js';

class Eszkoztar {

// =============================================
// KONSTRUKTOR
// =============================================
// @param {Object} callbacks - Összes esemény visszahívó a SzovegSzerkeszto-től
// --- Típus sáv ---
// @param {Function} callbacks.onTipusValtas - Blokk típus váltásakor (ujTipus)
// --- Közös sáv ---
// @param {Function} callbacks.onVisszavon - Visszavonás
// @param {Function} callbacks.onIsmet - Ismét
// @param {Function} callbacks.onUjBlokk - Új blokk hozzáadása
// @param {Function} callbacks.onTorles - Aktív blokk törlése
// @param {Function} callbacks.onFel - Blokk felfelé mozgatása
// @param {Function} callbacks.onLe - Blokk lefelé mozgatása
// @param {Function} callbacks.onMeretez - Méretezés
// --- Típusfüggő sáv ---
// @param {Function} callbacks.onFelkover - Szöveg félkövér toggle
// @param {Function} callbacks.onDolt - Szöveg dőlt toggle
// @param {Function} callbacks.onAlahuzas - Szöveg aláhúzás toggle
// @param {Function} callbacks.onMeret - Szöveg méretváltás (meret)
// @param {Function} callbacks.onSzin - Szöveg szín (szin)
// @param {Function} callbacks.onIgazitas - Szöveg igazítás (igazitas)
// @param {Function} callbacks.onKepFeltoltes - Kép feltöltés indítása
// @param {Function} callbacks.onPrintScreenBeillesztes - Vágólapról kép beillesztése
// @param {Function} callbacks.onFajlFeltoltes - Fájl feltöltés indítása
// @param {Function} callbacks.onLinkUrlSzerkesztes - Link URL szerkesztés (ujUrl)
// @param {Function} callbacks.onLinkFeliratSzerkesztes - Link felirat szerkesztés (ujFelirat)
// @param {Function} callbacks.onEntitasBeallitasa - Entitás beállítása (entitasId, entitasTipus)
// --- Oldal navigáció ---
// @param {Function} callbacks.onOldalNavigacioHozzaadasa - Fülsáv létrehozásakor (fulekSzama)
constructor(callbacks) {
console.log('Eszkoztar.constructor - KEZDÉS', { callbacks });

// Callbackek eltárolása — az allapotFrissites-ben is kell
this.callbacks = callbacks;

// --- SÁVOK PÉLDÁNYOSÍTÁSA ---

// 1. Felső sáv — blokk típus választó + oldal navigáció gomb
// MÓDOSÍTVA: átadjuk az onOldalNavigacioHozzaadasa callbacket is
this.blokktipusSav = new BlokktipusSav(
{
  onTipusValtas: callbacks.onTipusValtas,
  onOldalNavigacioHozzaadasa: callbacks.onOldalNavigacioHozzaadasa || null,
},
'szoveg' // alapértelmezett típus
);

// 2. Középső sáv — közös eszközök
this.kozosEszkozokSav = new KozosEszkozokSav({
onVisszavon: callbacks.onVisszavon,
onIsmet: callbacks.onIsmet,
onUjBlokk: callbacks.onUjBlokk,
onTorles: callbacks.onTorles,
onFel: callbacks.onFel,
onLe: callbacks.onLe,
onMeretez: callbacks.onMeretez,
});

// 3. Alsó sáv — típusfüggő eszközök
this.tipusFuggoEszkozokSav = new TipusFuggoEszkozokSav({
onFelkover: callbacks.onFelkover,
onDolt: callbacks.onDolt,
onAlahuzas: callbacks.onAlahuzas,
onMeret: callbacks.onMeret,
onSzin: callbacks.onSzin,
onSzinTorles: callbacks.onSzinTorles,
onIgazitas: callbacks.onIgazitas,
onBetumeretValtozas: callbacks.onBetumeretValtozas,
onKepFeltoltes: callbacks.onKepFeltoltes,
onPrintScreenBeillesztes: callbacks.onPrintScreenBeillesztes,
onFajlFeltoltes: callbacks.onFajlFeltoltes,
onLinkUrlSzerkesztes: callbacks.onLinkUrlSzerkesztes,
onLinkFeliratSzerkesztes: callbacks.onLinkFeliratSzerkesztes,
onEntitasBeallitasa: callbacks.onEntitasBeallitasa,
});

// DOM elem referencia — letrehozas() után töltődik fel
this.elem = null;

console.log('Eszkoztar.constructor - VÉGE');
}

// =============================================
// DOM ELEM LÉTREHOZÁSA
// =============================================
// Összerakja a három sáv DOM elemeit egy konténerbe
// @returns {HTMLElement} A kész eszköztár div eleme
letrehozas() {
console.log('Eszkoztar.letrehozas - KEZDÉS');

// Fő konténer
const kontener = document.createElement('div');
kontener.className = 'eszkoztar';

// 1. sáv — típusok (felső)
kontener.appendChild(this.blokktipusSav.letrehozas());

// 2. sáv — közös eszközök (középső)
kontener.appendChild(this.kozosEszkozokSav.letrehozas());

// 3. sáv — típusfüggő eszközök (alsó)
kontener.appendChild(this.tipusFuggoEszkozokSav.letrehozas());

// Elem referencia eltárolása
this.elem = kontener;

// Indulásnál a szöveg típus panelját mutatjuk
this.tipusFuggoEszkozokSav.panelValtas('szoveg');

console.log('Eszkoztar.letrehozas - VÉGE');
return kontener;
}

// =============================================
// PUBLIKUS API - TELJES ÁLLAPOT FRISSÍTÉSE
// =============================================
// A SzovegSzerkeszto hívja meg, amikor az aktív blokk megváltozik
// (fókuszváltás, típusváltás, gondolat változás)
// @param {Object} blokk - Az aktív blokk adatobjektuma a BlokkListából
// @param {Object} kozosAllapot - A közös sáv gombjainak állapota
// @param {boolean} kozosAllapot.visszavonLehetseges
// @param {boolean} kozosAllapot.ismetLehetseges
// @param {boolean} kozosAllapot.felLehetseges
// @param {boolean} kozosAllapot.leLehetseges
// @param {boolean} kozosAllapot.torlesLehetseges
// @param {Object|null} aktualisFormatas - Szöveg blokknál a kurzor formázási állapota
allapotFrissites(blokk, kozosAllapot, aktualisFormatas = null) {
console.log('Eszkoztar.allapotFrissites - KEZDÉS', { blokkId: blokk?.id, tipus: blokk?.tipus, kozosAllapot });

if (!blokk) return;

// 1. Felső sáv frissítése — aktív típus kiemelése
this.blokktipusSav.tipusFrissitese(blokk.tipus);

// 2. Középső sáv frissítése — gombok engedélyezése/tiltása
this.kozosEszkozokSav.allapotFrissites(kozosAllapot);

// 3. Alsó sáv frissítése — panel váltás és eszközök frissítése
// Az aktualisFormatas szöveg típusnál tartalmazza a kurzor formázási állapotát
this.tipusFuggoEszkozokSav.panelValtas(blokk.tipus);
this.tipusFuggoEszkozokSav.eszkozokFrissitese(blokk, aktualisFormatas);

console.log('Eszkoztar.allapotFrissites - VÉGE', { blokkId: blokk?.id });
}

}

export default Eszkoztar;