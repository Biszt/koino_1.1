// koino/meres/felszabaditasProba.js — AZ ELAKADT TUDATPONT FELSZABADÍTÁSA (2026-09-07)

// Mit bizonyít ez a lap?
//
// ⛔⛔ Csaba kérdéséből született: *„ha nem veszi vissza a pontját, akkor az entitás hogyan
// törlődik, hiszen rajta van a készülékén tudatponttal?"* — a gondolat törlődik (az eltűnés
// SZÁMÍTÁS), de a pont a keretben marad, mert aláírni csak a gazdája tud.
//
// ⭐ A készülék ezt magától elvégzi — de **megülepedés után** (Csaba döntése), mert egy
// késve érkező, de határidőn belüli szavazat még visszafordíthatja a törlést. ⭐⭐ És a
// megülepedést **BULIKBAN** mérjük, nem időben: az idő múlása semmit nem bizonyít, a
// csere-kör viszont azt méri, ami történik — hogy beszéltem másokkal, és nem hoztak újat.

import { allapotSzamitasa, szetosztottPontok, elakadtPontok } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { szerkesztesiEgyezmenyekAlkalmazasa } from '../js/allapot/szerkesztesiVegrehajtas.js';
import { felszabaditasiTerv, felszabaditoLepesek, felszabaditas, buliVolt, ujJegyzet,
         lancokIgazoljak, MEGULEPEDES_BULIK } from '../js/allapot/felszabaditas.js';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('AZ ELAKADT PONT FELSZABADÍTÁSA');

const KEZDET = Date.UTC(2026, 0, 1);
const KESOBB = KEZDET + 30 * 24 * 3600 * 1000;
const KUSZOBOK = {
  elfogadasiKuszob: 51, reszveteliKuszob: 0,
  minimumDontesiIdo: 3600, maximumDontesiIdo: 7200
};

// ===================================
// SEGÉDEK
// ===================================

/** Egy gondolat 100 ponttal + egy elfogadott törlési javaslat. */
async function torlesEset({ szavazat = 'Tamogat', masodikGondolat = false } = {}) {
  const gazda = await ujEember();
  const esemenyek = [];

  const g = await gazda.tesz('GondolatLetrehozas', { cim: 'TÖRLENDŐ', meret: 10 }, KEZDET);
  esemenyek.push(g);
  esemenyek.push(await gazda.tesz('TudatpontRendezes',
    { entitas: g.azonosito, pont: 100, kiosztva: 100 }, KEZDET));
  esemenyek.push(await gazda.tesz('ErtekJavaslat',
    { entitas: g.azonosito, ertekek: KUSZOBOK }, KEZDET));

  // Elhagyható MÁSODIK gondolat, hogy a bemondott összeg ne triviálisan nulla legyen.
  let masodik = null;
  if (masodikGondolat) {
    masodik = await gazda.tesz('GondolatLetrehozas', { cim: 'MARAD', meret: 10 }, KEZDET);
    esemenyek.push(masodik);
    esemenyek.push(await gazda.tesz('TudatpontRendezes',
      { entitas: masodik.azonosito, pont: 40, kiosztva: 140 }, KEZDET));
  }

  const j = await gazda.tesz('Javaslat', {
    fajta: 'szerkesztesi',
    erintettek: [{ entitas: g.azonosito, muvelet: 'Torles', valtozas: null }]
  }, KEZDET + 1000);
  esemenyek.push(j);
  esemenyek.push(await gazda.tesz('Szavazat',
    { javaslat: j.azonosito, szavazat }, KEZDET + 2000));

  return { esemenyek, gondolat: g, masodik, javaslat: j, gazda };
}

/** A három fázis — ugyanaz, amit a `koino.js` és a `pakli.js` futtat. */
async function kep(esemenyek, most = KESOBB) {
  const allapot = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, most);
  await szerkesztesiEgyezmenyekAlkalmazasa(allapot, javaslatok);
  return allapot;
}

// ===================================
// 1. AZ ÓRA INDUL
// ===================================

proba('⭐⭐ AZ ELSŐ LÁTÁSKOR CSAK A SZÁMLÁLÓ INDUL EL — még nem szabadítunk fel', async () => {
  const e = await torlesEset();
  const a = await kep(e.esemenyek);

  const terv = felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet());

  return terv.feloldhato.length === 0
    && terv.varakozok.length === 1
    && terv.varakozok[0].pont === 100
    && terv.varakozok[0].tisztaBulik === 0
    && terv.jegyzet.tetelek[e.gondolat.azonosito].ota === 0;
});

proba('⭐⭐ ELÉG BULI UTÁN felszabadítható — és a bulit a CSERE adja, nem az óra', async () => {
  const e = await torlesEset();
  const a = await kep(e.esemenyek);

  // Az első látás, majd MEGULEPEDES_BULIK darab csere-kör, amiben felelt valaki.
  let jegyzet = felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet()).jegyzet;
  for (let i = 0; i < MEGULEPEDES_BULIK; i++) jegyzet = buliVolt(jegyzet, 1);

  const terv = felszabaditasiTerv(a, e.gazda.szerzo, jegyzet);
  return terv.feloldhato.length === 1
    && terv.feloldhato[0].entitas === e.gondolat.azonosito
    && terv.feloldhato[0].pont === 100
    && terv.varakozok.length === 0;
});

proba('⛔⛔ A NÉMA KÖR NEM BULI — akire senki nem felelt, az nem ért körbe', async () => {
  // ⚠️ Ez a lényeg: attól, hogy elindítottam egy kört, még nem beszéltem senkivel.
  const e = await torlesEset();
  const a = await kep(e.esemenyek);

  let jegyzet = felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet()).jegyzet;
  for (let i = 0; i < MEGULEPEDES_BULIK * 5; i++) jegyzet = buliVolt(jegyzet, 0);  // senki nem felelt

  return felszabaditasiTerv(a, e.gazda.szerzo, jegyzet).feloldhato.length === 0;
});

proba('⛔ EGGYEL KEVESEBB BULI még nem elég — a próba nem vak', async () => {
  const e = await torlesEset();
  const a = await kep(e.esemenyek);

  let jegyzet = felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet()).jegyzet;
  for (let i = 0; i < MEGULEPEDES_BULIK - 1; i++) jegyzet = buliVolt(jegyzet, 1);

  const terv = felszabaditasiTerv(a, e.gazda.szerzo, jegyzet);
  return terv.feloldhato.length === 0
    && terv.varakozok.length === 1
    && terv.varakozok[0].tisztaBulik === MEGULEPEDES_BULIK - 1;
});

// ===================================
// 2. ⛔⛔ AMIT A MEGÜLEPEDÉS VÉD
// ===================================

proba('⛔⛔ HA A DÖNTÉS VISSZAFORDUL, AZ ÓRA ÚJRAINDUL — és nem szabadítunk fel', async () => {
  // ⚠️ EZ A LÉNYEG. A koino szerint „a késve MEGÉRKEZŐ, de a határidőn belüli időbélyegű
  // szavazat jogosan módosítja az eredményt" — tehát egy törlés VISSZA IS FORDULHAT.
  // Ha addigra már felszabadítottunk volna, a gondolat a pontom NÉLKÜL térne vissza.
  const e = await torlesEset();
  const a1 = await kep(e.esemenyek);

  // A számláló elindult: láttuk töröltnek, és volt utána elég buli is.
  let jegyzet = felszabaditasiTerv(a1, e.gazda.szerzo, ujJegyzet()).jegyzet;
  for (let i = 0; i < MEGULEPEDES_BULIK; i++) jegyzet = buliVolt(jegyzet, 1);

  // Most megérkezik egy addig HIÁNYZÓ, határidőn belüli ELLENSZAVAZAT (más embertől).
  const ellenzo = await ujEember();
  const pont = await ellenzo.tesz('TudatpontRendezes',
    { entitas: e.gondolat.azonosito, pont: 200, kiosztva: 200 }, KEZDET);
  const ellen = await ellenzo.tesz('Szavazat',
    { javaslat: e.javaslat.azonosito, szavazat: 'Ellenez' }, KEZDET + 2500);

  const a2 = await kep([...e.esemenyek, pont, ellen]);
  const terv = felszabaditasiTerv(a2, e.gazda.szerzo, jegyzet);

  return a2.entitasok.has(e.gondolat.azonosito) === true      // ⭐ a gondolat visszatért
    && terv.feloldhato.length === 0                           // ⭐ …és a pontom vele
    && terv.jegyzet.tetelek[e.gondolat.azonosito] === undefined;   // a számláló kikerült
});

proba('⛔⛔ HA A DÖNTÉS JELE VÁLTOZIK, A SZÁMLÁLÓ NULLÁRÓL INDUL', async () => {
  // ⚠️ A törlés áll, de egy késve érkező szavazat ÁTÍRJA a lezárás idejét — vagyis nem
  // ugyanaz a döntés áll megülepedve, mint amire a bulikat számoltuk. *Nem a bulik
  // gyűlnek, hanem a MOSTANI döntés melletti bulik.*
  const e = await torlesEset();
  const a1 = await kep(e.esemenyek);

  let jegyzet = felszabaditasiTerv(a1, e.gazda.szerzo, ujJegyzet()).jegyzet;
  for (let i = 0; i < MEGULEPEDES_BULIK; i++) jegyzet = buliVolt(jegyzet, 1);

  // Egy TÁMOGATÓ szavazat érkezik későn: a törlés marad, de a bizonyosság — és vele a
  // lezárás ideje — más lesz.
  const tamogato = await ujEember();
  const pont = await tamogato.tesz('TudatpontRendezes',
    { entitas: e.gondolat.azonosito, pont: 10, kiosztva: 10 }, KEZDET);
  const igen = await tamogato.tesz('Szavazat',
    { javaslat: e.javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2500);

  const a2 = await kep([...e.esemenyek, pont, igen]);
  const regiAllas = elakadtPontok(a1, e.gazda.szerzo)[0].allas;
  const ujAllas = elakadtPontok(a2, e.gazda.szerzo)[0].allas;
  const terv = felszabaditasiTerv(a2, e.gazda.szerzo, jegyzet);

  return regiAllas !== ujAllas                    // ⭐ a döntés jele tényleg más lett
    && terv.feloldhato.length === 0               // ⭐ …ezért nem szabadítunk fel
    && terv.varakozok[0].tisztaBulik === 0;       // …a számláló nulláról indul
});

proba('⛔ AZ ELVETETT törlésnél nincs mit felszabadítani', async () => {
  const e = await torlesEset({ szavazat: 'Ellenez' });
  const a = await kep(e.esemenyek);
  return elakadtPontok(a, e.gazda.szerzo).length === 0
    && felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet()).varakozok.length === 0;
});

proba('⭐ A GAZDA MAGÁTÓL IS VISSZAVEHETI — akkor a jegyzetből is kikerül', async () => {
  const e = await torlesEset();
  const a1 = await kep(e.esemenyek);
  let jegyzet = felszabaditasiTerv(a1, e.gazda.szerzo, ujJegyzet()).jegyzet;
  for (let i = 0; i < MEGULEPEDES_BULIK; i++) jegyzet = buliVolt(jegyzet, 1);

  // A kézi út (4. szabály): saját kézzel veszi vissza.
  const vissza = await e.gazda.tesz('TudatpontRendezes',
    { entitas: e.gondolat.azonosito, pont: 0, kiosztva: 0 }, KESOBB);

  const a2 = await kep([...e.esemenyek, vissza]);
  const terv = felszabaditasiTerv(a2, e.gazda.szerzo, jegyzet);

  return terv.feloldhato.length === 0
    && terv.jegyzet.tetelek[e.gondolat.azonosito] === undefined
    && szetosztottPontok(a2, e.gazda.szerzo) === 0;
});

// ===================================
// 3. ⭐ A BEMONDOTT ÖSSZEG (D42)
// ===================================

proba('⭐⭐ A FELSZABADÍTÓ LÉPÉS BEMONDOTT ÖSSZEGE HELYES — enélkül a saját eseményem bukna', async () => {
  const e = await torlesEset({ masodikGondolat: true });
  const a = await kep(e.esemenyek);

  let jegyzet = felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet()).jegyzet;
  for (let i = 0; i < MEGULEPEDES_BULIK; i++) jegyzet = buliVolt(jegyzet, 1);
  const teljes = felszabaditas(a, e.gazda.szerzo, jegyzet);

  // 100 (törölt) + 40 (marad) = 140 van kiosztva; a felszabadítás után 40 marad.
  return szetosztottPontok(a, e.gazda.szerzo) === 140
    && teljes.lepesek.length === 1
    && teljes.lepesek[0].pont === 0
    && teljes.lepesek[0].kiosztva === 40;
});

proba('⭐⭐ ÉS A KÉSZÜLÉK ESEMÉNYE TÉNYLEG ÁTMEGY A SZABÁLY-RÉTEGEN', async () => {
  // ⛔ Ez a próba a valódi tétel: a bemondott összeg ellenőrizhető a saját láncból. Ha
  // elcsúszna, a szabály-réteg kivételnek venné („a bemondott összeg ellentmond…").
  const e = await torlesEset({ masodikGondolat: true });
  const a = await kep(e.esemenyek);

  let jegyzet = felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet()).jegyzet;
  for (let i = 0; i < MEGULEPEDES_BULIK; i++) jegyzet = buliVolt(jegyzet, 1);
  const teljes = felszabaditas(a, e.gazda.szerzo, jegyzet);

  const esemenyek = [...e.esemenyek];
  for (const lepes of teljes.lepesek) {
    esemenyek.push(await e.gazda.tesz('TudatpontRendezes',
      { entitas: lepes.entitas, pont: lepes.pont, kiosztva: lepes.kiosztva },
      KESOBB + 1000));
  }

  const utana = await kep(esemenyek);
  return utana.kivetelek.length === 0
    && szetosztottPontok(utana, e.gazda.szerzo) === 40
    && elakadtPontok(utana, e.gazda.szerzo).length === 0;
});

proba('⭐ TÖBB ELAKADT PONT: a bemondott összeg lépésenként csökken', async () => {
  // Két törölt gondolat egyszerre — a második lépés bemondása már az elsőt is tükrözi.
  const lepesek = felszabaditoLepesek(
    [{ entitas: 'a', pont: 30 }, { entitas: 'b', pont: 20 }], 100);

  return lepesek.length === 2
    && lepesek[0].kiosztva === 70
    && lepesek[1].kiosztva === 50;
});


// ===================================
// 4. ⭐⭐⭐ A BIZONYÍTÉK: A LÁNCOK VÉGE
// ===================================
//
// A mérés (eredmenyek.md 13.) megcáfolta a buli-számot mint fő jelet: az a HÁLÓZAT
// terjedési idejét méri, nem azt, hogy a döntésben érintett emberek megszólaltak-e.
// ⭐ A jobb jel: ismerem-e MINDEN jogosult szavazó láncát a lezárás UTÁNI pontig.

proba('⭐⭐⭐ HA MINDEN GAZDA LÁNCÁT ISMEREM A LEZÁRÁS UTÁNIG: azonnal, buli nélkül', async () => {
  const e = await torlesEset();

  // A gazda a lezárás UTÁN is aláír valamit — ettől tudjuk, hogy a láncát idáig látjuk.
  // ⭐ Innentől egy határidőn belüli szavazata VISSZAFELÉ LÉPŐ IDŐ lenne a saját láncában.
  const kesobbi = await e.gazda.tesz('GondolatLetrehozas',
    { cim: 'VALAMI KÉSŐBB', meret: 10 }, KESOBB);

  const a = await kep([...e.esemenyek, kesobbi]);
  const terv = felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet());   // NULLA buli

  return terv.feloldhato.length === 1
    && terv.feloldhato[0].indok === 'lancok'
    && terv.feloldhato[0].tisztaBulik === 0
    && terv.varakozok.length === 0;
});

proba('⛔ EGY NÉMA GAZDA ELÉG A VÁRAKOZÁSHOZ — és megnevezzük, kire várunk', async () => {
  // Két gazda: az egyik megszólalt a lezárás után, a másik nem.
  const e = await torlesEset();
  const masik = await ujEember();

  const masikPont = await masik.tesz('TudatpontRendezes',
    { entitas: e.gondolat.azonosito, pont: 10, kiosztva: 10 }, KEZDET);
  const kesobbi = await e.gazda.tesz('GondolatLetrehozas',
    { cim: 'VALAMI KÉSŐBB', meret: 10 }, KESOBB);

  const a = await kep([...e.esemenyek, masikPont, kesobbi]);
  const terv = felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet());

  return terv.feloldhato.length === 0
    && terv.varakozok.length === 1
    && terv.varakozok[0].nemaGazdak.length === 1
    && terv.varakozok[0].nemaGazdak[0] === masik.szerzo;
});

proba('⭐ …ÉS HA A NÉMA IS MEGSZÓLAL, azonnal igazolt lesz — a próba nem vak', async () => {
  const e = await torlesEset();
  const masik = await ujEember();

  const masikPont = await masik.tesz('TudatpontRendezes',
    { entitas: e.gondolat.azonosito, pont: 10, kiosztva: 10 }, KEZDET);
  const kesobbi = await e.gazda.tesz('GondolatLetrehozas',
    { cim: 'VALAMI KÉSŐBB', meret: 10 }, KESOBB);
  // ⭐ EGYETLEN különbség az előző próbához képest.
  const masikKesobb = await masik.tesz('GondolatLetrehozas',
    { cim: 'Ő IS SZÓLT', meret: 10 }, KESOBB);

  const a = await kep([...e.esemenyek, masikPont, kesobbi, masikKesobb]);
  const terv = felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet());

  return terv.feloldhato.length === 1 && terv.feloldhato[0].indok === 'lancok';
});

proba('⚠️ A LEZÁRÁS ELŐTTI utolsó esemény NEM igazol — a határ szigorú', async () => {
  const e = await torlesEset();
  const a1 = await kep(e.esemenyek);
  const lezarult = elakadtPontok(a1, e.gazda.szerzo)[0].lezarult;

  // Egy ezredmásodperccel a lezárás ELŐTT — innen még beférne egy szavazat.
  const eppelotte = await e.gazda.tesz('GondolatLetrehozas',
    { cim: 'ÉPP ELŐTTE', meret: 10 }, lezarult - 1);

  const a2 = await kep([...e.esemenyek, eppelotte]);
  return felszabaditasiTerv(a2, e.gazda.szerzo, ujJegyzet()).feloldhato.length === 0;
});

proba('⭐ A KÉT ÚT EGYENÉRTÉKŰ EREDMÉNYT AD, de megmondja, MELYIK alapján', async () => {
  // Ugyanaz az eset: lánc-igazolás nélkül, elég bulival is felszabadul — csak lassabban.
  const e = await torlesEset();
  const a = await kep(e.esemenyek);

  let jegyzet = felszabaditasiTerv(a, e.gazda.szerzo, ujJegyzet()).jegyzet;
  for (let i = 0; i < MEGULEPEDES_BULIK; i++) jegyzet = buliVolt(jegyzet, 1);

  const terv = felszabaditasiTerv(a, e.gazda.szerzo, jegyzet);
  return terv.feloldhato.length === 1 && terv.feloldhato[0].indok === 'bulik';
});

export default futtatas;
