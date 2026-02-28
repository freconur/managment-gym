/**
 * Script de reparación para corregir el campo 'createdAt' en los miembros.
 * 
 * 1. Renombra 'createdAd' (typo) a 'createdAt'.
 * 2. Asegura que todos los miembros tengan 'createdAt' (si falta, usa 'updatedAt' o la fecha actual).
 * 
 * Ejecución: node scripts/fix-members-created-at.js
 */

const { initializeApp } = require('firebase/app');
const { 
    getFirestore, 
    collection, 
    getDocs, 
    writeBatch, 
    doc, 
    deleteField,
    serverTimestamp,
    query,
    limit
} = require('firebase/firestore');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB4hGAeFU5-o2deKdktNwoDKmYMJUZqBY4",
  authDomain: "gym-managment-10c42.firebaseapp.com",
  projectId: "gym-managment-10c42",
  storageBucket: "gym-managment-10c42.firebasestorage.app",
  messagingSenderId: "450500386725",
  appId: "1:450500386725:web:2007b44910b90e108c124c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function repairMembers() {
    console.log('>>> Iniciando reparación de miembros...');
    
    try {
        // 1. Obtener todas las ubicaciones
        const ubicacionesSnap = await getDocs(collection(db, 'ubicaciones'));
        console.log(`>>> Encontradas ${ubicacionesSnap.size} ubicaciones.`);

        for (const ubicacionDoc of ubicacionesSnap.docs) {
            console.log(`--- Procesando ubicación: ${ubicacionDoc.id} (${ubicacionDoc.data().name}) ---`);
            const membersRef = collection(db, 'ubicaciones', ubicacionDoc.id, 'members');
            await processCollection(membersRef);
        }

        // 2. Procesar también la colección global de members por si acaso
        console.log('--- Procesando colección global de members ---');
        await processCollection(collection(db, 'members'));

        console.log('>>> ¡PROCESO FINALIZADO CON ÉXITO! <<<');

    } catch (error) {
        console.error('!!! Error general:', error);
    } finally {
        process.exit(0);
    }
}

async function processCollection(colRef) {
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
        console.log('    (Colección vacía)');
        return;
    }

    let batch = writeBatch(db);
    let count = 0;
    let bCount = 0;

    for (const d of snapshot.docs) {
        const data = d.data();
        let needsUpdate = false;
        const updates = {};

        // Caso 1: Tiene el typo 'createdAd'
        if (data.createdAd) {
            console.log(`    [*] Corrigiendo typo en member: ${d.id}`);
            updates.createdAt = data.createdAd;
            const { deleteField } = require('firebase/firestore');
            updates.createdAd = deleteField();
            needsUpdate = true;
        } 
        
        // Caso 2: Falta 'createdAt' completamente
        if (!data.createdAt && !data.createdAd) {
            console.log(`    [*] Agregando createdAt faltante en member: ${d.id}`);
            updates.createdAt = data.updatedAt || serverTimestamp();
            needsUpdate = true;
        }

        if (needsUpdate) {
            batch.update(d.ref, updates);
            count++;
            bCount++;

            if (bCount >= 450) {
                console.log('    [Batch] Enviando lote...');
                await batch.commit();
                batch = writeBatch(db);
                bCount = 0;
            }
        }
    }

    if (bCount > 0) {
        console.log('    [Batch] Enviando lote final...');
        await batch.commit();
    }
    console.log(`    >>> Se actualizaron ${count} miembros en esta colección.`);
}

repairMembers();
