/**
 * Script de normalización de datos de miembros para Firebase Firestore.
 * 
 * Este script busca todos los documentos en la colección:
 * /ubicaciones/ID_ENVIRONMENT/members
 * Normaliza los campos: cargo, empresa, area, nombre, apellidos a MINÚSCULAS.
 * 
 * Ejecución: node scripts/normalize-members-data.js
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

async function normalizeMembersData() {
    console.log(`>>> Iniciando normalización de datos de miembros para: ${ID_ENVIRONMENT}...`);
    
    const membersRef = collection(db, 'ubicaciones', ID_ENVIRONMENT, 'members');

    try {
        const snapshot = await getDocs(membersRef);
        
        if (snapshot.empty) {
            console.log(`--- No se encontraron miembros en la ubicación "${ID_ENVIRONMENT}" ---`);
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

            // Campos a normalizar
            const fieldsToNormalize = ['cargo', 'empresa', 'area', 'nombre', 'apellidos'];

            fieldsToNormalize.forEach(field => {
                const value = data[field];
                
                // Si el valor es una cadena, normalizar
                if (typeof value === 'string' && value.length > 0) {
                    const normalized = value.trim().toLowerCase();
                    if (normalized !== value) {
                        updates[field] = normalized;
                        needsUpdate = true;
                    }
                } else if (value === null && field === 'area') {
                    // Si es null y es area, lo dejamos así (o podríamos forzarlo a '' si se prefiere)
                    // Por ahora, solo normalizamos si hay contenido.
                }
            });

            if (needsUpdate) {
                const docRef = doc(db, 'ubicaciones', ID_ENVIRONMENT, 'members', documento.id);
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
            if (countInBatch === 450) { // Un poco menos de 500 por seguridad
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
        console.log(`>>> PROCESO FINALIZADO`);
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
normalizeMembersData();
