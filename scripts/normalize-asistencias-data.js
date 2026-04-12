/**
 * Script de normalización de datos de ASISTENCIAS para Firebase Firestore.
 * 
 * Este script busca todos los documentos en la colección:
 * /ubicaciones/ID_ENVIRONMENT/asistencias
 * Normaliza los campos: company, area, cargo, memberName a MINÚSCULAS.
 * 
 * Ejecución: node scripts/normalize-asistencias-data.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');

// =========================================================================
// CONFIGURACIÓN: Cambia el ID_ENVIRONMENT por el id de la ubicación deseada
// =========================================================================
const ID_ENVIRONMENT = 'Qh2a5eT8yqGiZHAR8LK7'; 

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB4hGAeFU5-o2deKdktNwoDKmYMJUZqBY4",
  authDomain: "gym-managment-10c42.firebaseapp.com",
  projectId: "gym-managment-10c42",
  storageBucket: "gym-managment-10c42.firebasestorage.app",
  messagingSenderId: "450500386725",
  appId: "1:450500386725:web:2007b44910b90e108c124c"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function normalizeAsistenciasData() {
    console.log(`>>> Iniciando normalización de datos de ASISTENCIAS para: ${ID_ENVIRONMENT}...`);
    
    const asistenciasRef = collection(db, 'ubicaciones', ID_ENVIRONMENT, 'asistencias');

    try {
        const snapshot = await getDocs(asistenciasRef);
        
        if (snapshot.empty) {
            console.log(`--- No se encontraron asistencias en la ubicación "${ID_ENVIRONMENT}" ---`);
            return;
        }

        console.log(`>>> Encontrados ${snapshot.size} documentos. Analizando campos...`);
        
        let batch = writeBatch(db);
        let countInBatch = 0;
        let totalProcessed = 0;
        let totalUpdated = 0;

        for (const documento of snapshot.docs) {
            const data = documento.data();
            const updates = {};
            let needsUpdate = false;

            // Campos a normalizar para asistencias
            const fieldsToNormalize = ['company', 'area', 'cargo', 'memberName'];

            fieldsToNormalize.forEach(field => {
                const value = data[field];
                
                // Si el valor es una cadena, normalizar
                if (typeof value === 'string' && value.length > 0) {
                    const normalized = value.trim().toLowerCase();
                    if (normalized !== value) {
                        updates[field] = normalized;
                        needsUpdate = true;
                    }
                }
            });

            if (needsUpdate) {
                const docRef = doc(db, 'ubicaciones', ID_ENVIRONMENT, 'asistencias', documento.id);
                batch.update(docRef, updates);
                
                console.log(`[*] Marcado para actualizar: ID ${documento.id}`);
                Object.keys(updates).forEach(f => {
                    console.log(`    - ${f}: "${data[f]}" -> "${updates[f]}"`);
                });

                countInBatch++;
                totalUpdated++;
            }

            totalProcessed++;

            // Manejo de lotes de hasta 500 documentos
            if (countInBatch === 450) { 
                console.log('>>> Committing batch de actualizaciones...');
                await batch.commit();
                batch = writeBatch(db);
                countInBatch = 0;
            }
        }

        // Ejecutar las operaciones restantes
        if (countInBatch > 0) {
            await batch.commit();
        }
        
        console.log('\n---------------------------------------------------------');
        console.log(`>>> PROCESO FINALIZADO (ASISTENCIAS)`);
        console.log(`>>> Total documentos revisados: ${totalProcessed}`);
        console.log(`>>> Total documentos actualizados: ${totalUpdated}`);
        console.log('---------------------------------------------------------');

    } catch (error) {
        console.error('!!! Error durante la ejecución del script:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar el script
normalizeAsistenciasData();
