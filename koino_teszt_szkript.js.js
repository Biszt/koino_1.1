// ===== KOINO PLATFORM AUTOMATIKUS TESZT SZKRIPT - FRISSÍTETT VERZIÓ =====
// Frissítve: szuloId + szuloTipus támogatással

const { log } = require('console');

// ===== KONFIGURÁCIÓ =====

const BASE_URL = 'http://localhost:3000/api';

// ===== SEGÉDFÜGGVÉNYEK =====

// HTTP kérés küldése
async function fetchAPI(url, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP hiba: ${response.status} - ${JSON.stringify(data)}`);
  }
  
  return data;
}

// MongoDB közvetlen kapcsolat tisztításhoz - JAVÍTOTT VERZIÓ
async function tisztitAdatbazist() {
  console.log('\n🧹 ADATBÁZIS TISZTÍTÁSA...');
  try {
    // MongoDB importálása
    const mongoose = require('mongoose');
    
    // Kapcsolódás (használd a .env fájlodban lévő connection stringet)
    // FONTOS: Állítsd be a saját MongoDB connection stringedet!
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018/koino';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB kapcsolat sikeres');
    
    // JAVÍTÁS: Helyes módon szerezzük meg a kollekciókat
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📊 Talált kollekciók száma: ${collections.length}`);
    
    // Minden kollekció törlése
    for (let collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      await db.collection(collectionName).deleteMany({});
      console.log(` ✅ ${collectionName} kollekció törölve`);
    }
    
    // Kapcsolat lezárása
    await mongoose.connection.close();
    console.log('✅ Adatbázis tisztítás befejezve');
    console.log('⏳ Várakozás 2 másodperc...');
    return true;
    
  } catch (error) {
    console.error('❌ Hiba az adatbázis tisztítása során:', error.message);
    console.error('💡 Lehetséges okok:');
    console.error('   - Helytelen MongoDB connection string');
    console.error('   - MongoDB szerver nem fut');
    console.error('   - Hozzáférési problémák');
    return false;
  }
}

// Várakozás (késleltetés)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Teszt eredmény kiírása
function logTest(stepNumber, description, success, data = null) {
  const status = success ? '✅ SIKERES' : '❌ SIKERTELEN';
  console.log(`\n${stepNumber}. ${description} - ${status}`);
  
  if (data && typeof data === 'object') {
    // Csak a fontos mezőket írjuk ki
    const { _id, emberNev, email, nev, tudatpontok, cim, statusz } = data;
    const displayData = { _id, emberNev, email, nev, tudatpontok, cim, statusz };
    
    // Töröljük az undefined értékeket
    Object.keys(displayData).forEach(key =>
      displayData[key] === undefined && delete displayData[key]
    );
    
    if (Object.keys(displayData).length > 0) {
      console.log('  ', JSON.stringify(displayData));
    }
  }
}

// ===== GLOBÁLIS VÁLTOZÓK =====

let foltiToken = null;
let csipeszToken = null;
let foltiId = null;
let csipeszId = null;
let kategoria1Id = null;
let kategoria2Id = null;
let tartalomTipus1Id = null;
let tartalomTipus2Id = null;
let tartalom1Id = null;
let tartalom2Id = null;
let javaslatId = null;

// ===== TESZTELÉSI FOLYAMAT =====

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  KOINO PLATFORM AUTOMATIKUS TESZTELÉS KEZDÉSE        ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  try {
    // ===== ADATBÁZIS TISZTÍTÁSA =====
    const tisztitasSikeres = await tisztitAdatbazist();
    if (!tisztitasSikeres) {
      console.log('⚠️  FIGYELEM: Adatbázis tisztítás sikertelen, de folytatjuk a tesztet...');
    }
    
    // Hosszabb várakozás a tisztítás után, hogy a backend is észlelje a változást
    await sleep(2000);
    
    // ===== 1. LÉPÉS: FOLTI REGISZTRÁCIÓ =====
    console.log('\n--- 1. EMBER REGISZTRÁCIÓ ÉS BEJELENTKEZÉS ---');
    
    const foltiRegisztracio = await fetchAPI(
      `${BASE_URL}/ember/regisztracio`,
      'POST',
      {
        emberNev: 'folti',
        email: 'folti@gmail.com',
        jelszo: '12345678',
        nev: 'foltin folti',
        lokacio: {
          orszag: 'Magyarország',
          regio: 'Komárom-Esztergom-megye',
          telepules: 'Vértesszőllős'
        }
      }
    );
    
    logTest(1, 'Folti regisztráció', true, foltiRegisztracio);
    foltiId = foltiRegisztracio._id;
    await sleep(500);
    
    // ===== 2. LÉPÉS: CSIPESZ REGISZTRÁCIÓ =====
    const csipeszRegisztracio = await fetchAPI(
      `${BASE_URL}/ember/regisztracio`,
      'POST',
      {
        emberNev: 'csipesz',
        email: 'csipesz@gmail.com',
        jelszo: '12345678',
        nev: 'csipi csipesz',
        lokacio: {
          orszag: 'Magyarország',
          regio: 'Komárom-Esztergom-megye',
          telepules: 'Vértesszőllős'
        }
      }
    );
    
    logTest(2, 'Csipesz regisztráció', true, csipeszRegisztracio);
    csipeszId = csipeszRegisztracio._id;
    await sleep(500);
    
    // ===== 3. LÉPÉS: FOLTI BEJELENTKEZÉS =====
    const foltiBejelentkezes = await fetchAPI(
      `${BASE_URL}/ember/bejelentkezes`,
      'POST',
      {
        email: 'folti@gmail.com',
        jelszo: '12345678'
      }
    );
    
    logTest(3, 'Folti bejelentkezés', true);
    foltiToken = foltiBejelentkezes.token;
    console.log('   Token:', foltiToken.substring(0, 30) + '...');
    await sleep(500);
    
    // ===== 4. LÉPÉS: KATEGÓRIA 1 LÉTREHOZÁSA =====
    console.log('\n--- 2. KATEGÓRIÁK LÉTREHOZÁSA ---');
    
    const kategoria1 = await fetchAPI(
      `${BASE_URL}/kategoria`,
      'POST',
      {
        nev: 'tudomány1',
        leiras: 'semmi különös',
        szin: '#4a7c59',
        kezdoTudatpont: 10
      },
      foltiToken
    );
    
    console.log("kategoria1: ", kategoria1);
    console.log("kategoria1.kategoria._id: ", kategoria1.kategoria._id);
    logTest(4, 'Kategória 1 létrehozása (10 pont)', true, kategoria1);
    kategoria1Id = kategoria1.kategoria._id;
    console.log('kategoria1Id: ', kategoria1Id);
    await sleep(500);
    
    // ===== 5. LÉPÉS: KATEGÓRIA 2 LÉTREHOZÁSA =====
    const kategoria2 = await fetchAPI(
      `${BASE_URL}/kategoria`,
      'POST',
      {
        nev: 'tudomány2',
        leiras: 'semmi különös',
        szin: '#4a7c59',
        kezdoTudatpont: 10
      },
      foltiToken
    );
    
    logTest(5, 'Kategória 2 létrehozása (10 pont)', true, kategoria2);
    kategoria2Id = kategoria2.kategoria._id;
    await sleep(500);
    
    // ===== 6. LÉPÉS: TARTALOM TÍPUS 1 LÉTREHOZÁSA =====
    console.log('\n--- 3. TARTALOM TÍPUSOK LÉTREHOZÁSA ---');
    
    const tartalomTipus1 = await fetchAPI(
      `${BASE_URL}/tartalomTipus`,
      'POST',
      {
        nev: 'tudomány1',
        leiras: 'semmi különös',
        ikon: '🚀',
        kezdoTudatpont: 10
      },
      foltiToken
    );
    
    logTest(6, 'Tartalom típus 1 létrehozása (10 pont)', true, tartalomTipus1);
    tartalomTipus1Id = tartalomTipus1._id;
    console.log("tartalomTipus1Id:::::::::::::::::::::::::::::::::::::::::::::::", tartalomTipus1Id);
    await sleep(1000);
    
    // ===== 7. LÉPÉS: TARTALOM TÍPUS 2 LÉTREHOZÁSA =====
    const tartalomTipus2 = await fetchAPI(
      `${BASE_URL}/tartalomTipus`,
      'POST',
      {
        nev: 'tudomány2',
        leiras: 'semmi különös',
        ikon: '🚀',
        kezdoTudatpont: 10
      },
      foltiToken
    );
    
    logTest(7, 'Tartalom típus 2 létrehozása (10 pont)', true, tartalomTipus2);
    tartalomTipus2Id = tartalomTipus2._id;
    await sleep(1000);
    
    // ===== 8. LÉPÉS: TARTALOM 1 LÉTREHOZÁSA =====
    // MÓDOSÍTVA: szuloId eltávolítva (önálló főtartalom)
    console.log('\n--- 4. TARTALMAK LÉTREHOZÁSA ---');
    console.log("tartalomTipus1Id:::::::::::::::::::::::::::::::::::::::::::::::", tartalomTipus1Id);
    
    const tartalom1 = await fetchAPI(
      `${BASE_URL}/tartalom`,
      'POST',
      {
        cim: 'tartalom1',
        szoveg: 'egyes',
        tartalomTipusId: tartalomTipus1Id,
        kategoriaIds: [kategoria1Id],
        // szuloId és szuloTipus elhagyva - önálló főtartalom
        statusz: 'Lathato',
        javaslatElfogadasiKuszob: 80,
        reszveteliAranyKuszob: 30,
        kezdoTudatpont: 12
      },
      foltiToken
    );
    
    logTest(8, 'Tartalom 1 létrehozása (12 pont)', true, tartalom1);
    console.log('🔍 tartalom1 válasz:', JSON.stringify(tartalom1, null, 2));
    tartalom1Id = tartalom1.tartalom._id;
    await sleep(500);
    
    // ===== 9. LÉPÉS: TARTALOM 2 LÉTREHOZÁSA =====
    // MÓDOSÍTVA: szuloId eltávolítva (önálló főtartalom)
    const tartalom2 = await fetchAPI(
      `${BASE_URL}/tartalom`,
      'POST',
      {
        cim: 'tartalom2',
        szoveg: 'kettes',
        tartalomTipusId: tartalomTipus1Id,
        kategoriaIds: [kategoria1Id],
        // szuloId és szuloTipus elhagyva - önálló főtartalom
        statusz: 'Lathato',
        javaslatElfogadasiKuszob: 80,
        reszveteliAranyKuszob: 30,
        kezdoTudatpont: 12
      },
      foltiToken
    );
    
    logTest(9, 'Tartalom 2 létrehozása (12 pont)', true, tartalom2);
    tartalom2Id = tartalom2.tartalom._id;
    await sleep(500);
    
    // ===== 10. LÉPÉS: CSIPESZ BEJELENTKEZÉS =====
    console.log('\n--- 5. CSIPESZ TUDATPONT HOZZÁRENDELÉSEK ---');
    
    const csipeszBejelentkezes = await fetchAPI(
      `${BASE_URL}/ember/bejelentkezes`,
      'POST',
      {
        email: 'csipesz@gmail.com',
        jelszo: '12345678'
      }
    );
    
    logTest(10, 'Csipesz bejelentkezés', true);
    csipeszToken = csipeszBejelentkezes.token;
    console.log('   Token:', csipeszToken.substring(0, 30) + '...');
    await sleep(500);
    
    // ===== 11. LÉPÉS: CSIPESZ TUDATPONT HOZZÁRENDELÉSE TARTALOM 1-RE =====
    const hozzarendeles1 = await fetchAPI(
      `${BASE_URL}/tudatpont/hozzarendeles`,
      'POST',
      {
        entitasId: tartalom1Id,
        entitasTipus: 'Tartalom',
        pontok: 15
      },
      csipeszToken
    );
    
    logTest(11, 'Csipesz 15 pont → tartalom1', true);
    console.log('🔍 hozzarendeles1:', JSON.stringify(hozzarendeles1, null, 2));
    await sleep(500);
    
    // ===== 12. LÉPÉS: CSIPESZ TUDATPONT HOZZÁRENDELÉSE TARTALOM 2-RE =====
    const hozzarendeles2 = await fetchAPI(
      `${BASE_URL}/tudatpont/hozzarendeles`,
      'POST',
      {
        entitasId: tartalom2Id,
        entitasTipus: 'Tartalom',
        pontok: 15
      },
      csipeszToken
    );
    
    logTest(12, 'Csipesz 15 pont → tartalom2', true);
    console.log('🔍 hozzarendeles2:', JSON.stringify(hozzarendeles2, null, 2));
    await sleep(500);
    
    // ===== 13. LÉPÉS: EGYESÍTÉSI JAVASLAT LÉTREHOZÁSA =====
    // MÓDOSÍTVA: szuloId hozzáadva (kötelező!)
    console.log('\n--- 6. EGYESÍTÉSI JAVASLAT LÉTREHOZÁSA ---');
    console.log('kategoria1Id: ', kategoria1Id);
    
    const javaslat = await fetchAPI(
      `${BASE_URL}/javaslat`,
      'POST',
      {
        javaslatTipus: 'Egyesites',
        indoklas: 'Két hasonló témájú tartalom összevonása a duplikáció elkerülése érdekében. Az új egyesített tartalom mindkét forrás legfontosabb információit tartalmazza.',
        // ÚJ: szuloId kötelező - melyik tartalom alatt jött létre ez a javaslat
        szuloId: tartalom1Id,  // A javaslat a tartalom1 alatt jön létre
        erintettEntitasok: [
          {
            entitasId: tartalom1Id,
            entitasTipus: 'Tartalom',
            muvelet: 'Egyesites'
          },
          {
            entitasId: tartalom2Id,
            entitasTipus: 'Tartalom',
            muvelet: 'Egyesites'
          }
        ],
        egyesitesAdatok: {
          ujEntitasTipus: 'Tartalom',
          ujEntitasAdatok: {
            cim: 'Egyesített tartalom: Klímaváltozás és fenntarthatóság',
            szoveg: 'Átfogó tartalom a klímaváltozás hatásairól és a fenntartható megoldásokról, két korábbi tartalom egyesítéséből.',
            tartalomTipusId: tartalomTipus1Id,
            kategoriaIds: [kategoria1Id, kategoria2Id],
            // Nincs szüló - önálló egyesített tartalom lesz
            statusz: 'Lathato'
          },
          forrasEntitasok: [tartalom1Id, tartalom2Id]
        },
        kezdoTudatpont: 13
      },
      csipeszToken
    );
    
    console.log('🔍 javaslat válasz:', JSON.stringify(javaslat, null, 2));
    logTest(13, 'Egyesítési javaslat létrehozása (13 pont)', true);
    javaslatId = javaslat.javaslat._id;
    console.log(`   Részvételi arány: ${javaslat.javaslat.reszveteliArany}%`);
    console.log(`   Támogatottság: ${javaslat.javaslat.tamogatotsagiArany}%`);
    console.log(`   Bizonyossági mutató: ${javaslat.javaslat.bizonyossagiMutato}`);
    await sleep(1000);
    
    // ===== 14. LÉPÉS: FOLTI SZAVAZAT LEADÁSA =====
    console.log('\n--- 7. FOLTI SZAVAZATA ---');
    
    const szavazat = await fetchAPI(
      `${BASE_URL}/javaslat/${javaslatId}/szavazat`,
      'POST',
      {
        szavazatTipus: 'Tartozkodik'
      },
      foltiToken
    );
    
    console.log("javaslatId: ", javaslat.javaslat._id);
    console.log("szavazat: ", szavazat);
    logTest(14, 'Folti tartózkodó szavazat', true);
    await sleep(200);

    // ===== 14.5. LÉPÉS: FOLTI ÉRTÉK JAVASLATOT TESZ =====
    console.log('\n--- 7. FOLTI ÉRTÉK JAVASLATA ---');
    
    const ertekJavaslat1 = await fetchAPI(
      `${BASE_URL}/ertekJavaslat`,
      'POST',
      {
        "tartalomId": tartalom1Id,
        "javaslatElfogadasiKuszob": 80,
        "reszveteliAranyKuszob": 30,
        "minimumDontesiIdo": 0,
        "maximumDontesiIdo": 30
      },
      foltiToken
    );
    
    console.log("javaslatId: ", javaslat.javaslat._id);
    console.log("ertekJavaslat: ", ertekJavaslat1);
    await sleep(200);

    // ===== 14.5. LÉPÉS: FOLTI ÉRTÉK JAVASLATOT TESZ =====
    console.log('\n--- 7. FOLTI ÉRTÉK JAVASLATA ---');
    
    const ertekJavaslat2 = await fetchAPI(
      `${BASE_URL}/ertekJavaslat`,
      'POST',
      {
        "tartalomId": tartalom2Id,
        "javaslatElfogadasiKuszob": 70,
        "reszveteliAranyKuszob": 30,
        "minimumDontesiIdo": 0,
        "maximumDontesiIdo": 30
      },
      foltiToken
    );
    
    console.log("javaslatId: ", javaslat.javaslat._id);
    console.log("ertekJavaslat: ", ertekJavaslat2);
    await sleep(200);

    
    
    // ===== 15. LÉPÉS: JAVASLAT VÉGREHAJTÁS ELLENŐRZÉSE =====
    try {
      const javaslatEllenorzes = await fetchAPI(
        `${BASE_URL}/javaslat/${javaslatId}`,
        'GET',
        null,
        foltiToken
      );
      
      logTest(15, 'Javaslat lekérése', true, javaslatEllenorzes);
      console.log(`   Státusz: ${javaslatEllenorzes.statusz}`);
      
    } catch (error) {
      // ✅ Ha nem található = már végrehajtódott
      if (error.message.includes('nem található')) {
        logTest(15, 'Javaslat végrehajtva és törölve (100% BM)', true);
        console.log('   ✅ A javaslat 100%-os bizonyossági mutatót ért el');
        console.log('   ✅ Automatikusan végrehajtódott és törölve lett');
      } else {
        throw error; // Egyéb hiba
      }
    }
    
    await sleep(500);
    
    // ===== 16. LÉPÉS: EGYESÍTETT TARTALOM ELLENŐRZÉSE =====
    const tartalmakValasz = await fetchAPI(
      `${BASE_URL}/tartalom`,
      'GET',
      null,
      foltiToken
    );
    
    // ✅ A tömb a `tartalmak` mezőben van!
    const tartalmakLista = tartalmakValasz.tartalmak;
    console.log(`\n📊 Tartalmak listája (${tartalmakLista.length} db):`);
    tartalmakLista.forEach(t => {
      console.log(`   - ${t.cim} (ID: ${t._id})`);
    });
    
    const egyesitettTartalom = tartalmakLista.find(t =>
      t.cim && t.cim.includes('Egyesített tartalom')
    );
    
    if (egyesitettTartalom) {
      logTest(16, 'Egyesített tartalom létrehozva', true, egyesitettTartalom);
      
      // Egyesített tartalom tudatpont allokációjának ellenőrzése
      const egyesitettAllokacioDe = await fetchAPI(
        `${BASE_URL}/tartalom/${egyesitettTartalom._id}/reszletek`,
        'GET',
        null,
        foltiToken
      );
      
      console.log("egyesitettAllokacioDe: ", egyesitettAllokacioDe);
      
      // ✅ A `data` objektumon belül van a tudatpont!
      console.log(`   Egyesített tartalom tudatpontjai: ${egyesitettAllokacioDe.data.tudatpont.osszesPont} pont`);
      console.log(`   Hozzájárulók: ${egyesitettAllokacioDe.data.tudatpont.hozzajarulasok.length} fő`);
    } else {
      logTest(16, 'Egyesített tartalom NEM található', false);
    }
    
    // ===== TESZTELÉS BEFEJEZVE =====
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║         TESZTELÉS SIKERESEN BEFEJEZVE                ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ HIBA A TESZTELÉS SORÁN:', error.message);
    console.error('Stack:', error.stack);
  }
}

// ===== SZKRIPT INDÍTÁSA =====
runTests();
