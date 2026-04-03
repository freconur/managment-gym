/**
 * Script de actualización de área de miembros para Firebase Firestore.
 * 
 * Este script busca todos los documentos en la colección:
 * /ubicaciones/ID/members
 * filtrando por la constante AREA y actualizando su propiedad 'area' por la constante NUEVA_AREA.
 * 
 * Ejecución: node scripts/update-area.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc, query, where } = require('firebase/firestore');

// ID Constante (El id dinámico de tu ubicación)
const ID = 'KzxpcYkHgHUpjFmWTThR'; // Ej: 'Qh2a5eT8yqGiZHAR8LK7'

// Áreas
const AREA = 'SECURITY'; 
const NUEVA_AREA = 'security';

// Configuración extraída de tu anterior script local
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

async function updateArea() {
    console.log(`>>> Iniciando actualización de área en miembros para la ubicación: ${ID}...`);
    
    // Referencia y Query a la colección con el filtro solicitado
    const membersRef = collection(db, 'ubicaciones', ID, 'members');
    const q = query(membersRef, where("area", "==", AREA));

    try {
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            console.log(`--- No se encontraron miembros con el área "${AREA}" en esta ubicación ---`);
            return;
        }

        console.log(`>>> Encontrados ${snapshot.size} miembros con el área "${AREA}". Procesando actualizaciones a "${NUEVA_AREA}"...`);
        
        let batch = writeBatch(db);
        let count = 0;
        let totalUpdated = 0;

        for (const documento of snapshot.docs) {
            const docRef = doc(db, 'ubicaciones', ID, 'members', documento.id);
            
            batch.update(docRef, { 
                area: NUEVA_AREA
            });

            console.log(`    [*] Preparado: Documento ${documento.id} - Área: "${AREA}" -> "${NUEVA_AREA}"`);
            
            count++;
            totalUpdated++;

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
        console.log(`>>> ¡ÉXITO! Se actualizaron ${totalUpdated} registros de miembros al área "${NUEVA_AREA}".`);
        console.log('---------------------------------------------------------');

    } catch (error) {
        console.error('!!! Error durante la ejecución del script:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar el script
updateArea();
