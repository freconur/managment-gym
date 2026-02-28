/**
 * Script de normalización de género para miembros en Firestore.
 * 
 * Este script filtra los miembros que tienen sexo === 'HOMBRE'
 * y lo cambia a 'Hombre' para mantener la consistencia.
 * 
 * Ubicación: /ubicaciones/Qh2a5eT8yqGiZHAR8LK7/members
 * 
 * Ejecución: node scripts/fix-sex-format.js
 */

const { initializeApp } = require('firebase/app');
const { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    writeBatch, 
    doc 
} = require('firebase/firestore');

// ID de la ubicación
const ID = 'KzxpcYkHgHUpjFmWTThR';

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

async function normalizarSexo() {
    console.log(`>>> Iniciando normalización de sexo ('HOMBRE' -> 'Hombre') para la ubicación: ${ID}...`);
    
    // Referencia con filtro
    const membersRef = collection(db, 'ubicaciones', ID, 'members');
    const q = query(membersRef, where('sexo', '==', 'HOMBRE'));

    try {
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            console.log('--- No se encontraron miembros con sexo "HOMBRE" ---');
            return;
        }

        console.log(`>>> Encontrados ${snapshot.size} miembros con "HOMBRE". Procesando actualizaciones...`);
        
        let batch = writeBatch(db);
        let count = 0;
        let totalUpdated = 0;

        for (const documento of snapshot.docs) {
            const docRef = doc(db, 'ubicaciones', ID, 'members', documento.id);
            
            batch.update(docRef, { sexo: 'Hombre' });

            const data = documento.data();
            console.log(`    [*] Preparado: "${data.nombre || ''} ${data.apellidos || ''}" | HOMBRE -> Hombre`);
            
            count++;
            totalUpdated++;

            // Manejo de lotes de hasta 500 documentos
            if (count === 500) {
                await batch.commit();
                console.log('>>> Batch de 500 documentos procesado exitosamente.');
                batch = writeBatch(db);
                count = 0;
            }
        }

        // Ejecutar las operaciones restantes
        if (count > 0) {
            await batch.commit();
        }
        
        console.log('---------------------------------------------------------');
        console.log(`>>> ¡ÉXITO! Se actualizaron ${totalUpdated} registros.`);
        console.log('---------------------------------------------------------');

    } catch (error) {
        console.error('!!! Error durante la ejecución del script:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar el script
normalizarSexo();
