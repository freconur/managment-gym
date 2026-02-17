/**
 * Script de normalización de datos de asistencias para Firebase Firestore.
 * 
 * Este script busca todos los documentos en la colección:
 * /ubicaciones/468dFRtCNao49Ld9GeCm/asistencias
 * y convierte las propiedades 'memberName' y 'company' a minúsculas.
 * 
 * Ejecución: node scripts/lowercase-asistencias-data.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');

// ID constante solicitado
const ID = 'Qh2a5eT8yqGiZHAR8LK7';

// Configuración extraída de firebase/firebase.config.ts
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

async function normalizarAsistencias() {
    console.log(`>>> Iniciando normalización de asistencias para la ubicación: ${ID}...`);
    
    // Ruta dinámica según el ID constante
    const asistenciasRef = collection(db, 'ubicaciones', ID, 'asistencias');

    try {
        const snapshot = await getDocs(asistenciasRef);
        
        if (snapshot.empty) {
            console.log('--- No se encontraron asistencias en esta ubicación ---');
            return;
        }

        console.log(`>>> Encontrados ${snapshot.size} documentos. Procesando actualizaciones...`);
        
        let batch = writeBatch(db);
        let count = 0;
        let totalUpdated = 0;

        for (const documento of snapshot.docs) {
            const data = documento.data();
            
            // Valores originales
            const memberName = data.memberName || '';
            const company = data.company || '';

            // Valores en minúsculas
            const memberNameLower = memberName.toLowerCase();
            const companyLower = company.toLowerCase();

            // Solo actualizar si algo ha cambiado
            if (memberName !== memberNameLower || company !== companyLower) {
                const docRef = doc(db, 'ubicaciones', ID, 'asistencias', documento.id);
                
                batch.update(docRef, { 
                    memberName: memberNameLower,
                    company: companyLower
                });

                console.log(`    [*] Preparado: "${memberName}" [${company}] -> "${memberNameLower}" [${companyLower}]`);
                
                count++;
                totalUpdated++;
            }

            // Manejo de lotes de hasta 500 documentos (requerimiento de Firestore)
            if (count === 500) {
                await batch.commit();
                console.log('>>> Batch de 500 documentos procesado exitosamente.');
                batch = writeBatch(db);
                count = 0;
            }
        }

        // Ejecutar las operaciones restantes en el último batch
        if (count > 0) {
            await batch.commit();
        }
        
        console.log('---------------------------------------------------------');
        console.log(`>>> ¡ÉXITO! Se actualizaron ${totalUpdated} registros de asistencias.`);
        console.log('---------------------------------------------------------');

    } catch (error) {
        console.error('!!! Error durante la ejecución del script:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar el script
normalizarAsistencias();
