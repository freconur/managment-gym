/**
 * Script de corrección de datos para Firebase Firestore.
 * 
 * Este script busca documentos en la colección:
 * /ubicaciones/468dFRtCNao49Ld9GeCm/asistencias
 * que tengan el campo 'company' igual a 'APTIM' y los actualiza a 'aptim'.
 * 
 * Ejecución: node scripts/fix-aptim-data.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, writeBatch, doc } = require('firebase/firestore');

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

async function corregirDatos() {
    console.log('>>> Iniciando proceso de corrección de datos...');
    
    // Referencia a la subcolección de asistencias
    const asistenciasRef = collection(db, 'ubicaciones', '468dFRtCNao49Ld9GeCm', 'asistencias');
    
    // Query para filtrar documentos con company "APTIM"
    const q = query(asistenciasRef, where('company', '==', 'APTIM'));

    try {
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            console.log('--- No se encontraron documentos con company === "APTIM" ---');
            return;
        }

        console.log(`>>> Encontrados ${snapshot.size} documentos. Preparando actualización en lote (batch)...`);
        
        const batch = writeBatch(db);
        
        snapshot.forEach((documento) => {
            const docRef = doc(db, 'ubicaciones', '468dFRtCNao49Ld9GeCm', 'asistencias', documento.id);
            batch.update(docRef, { company: 'aptim' });
            console.log(`    [*] Marcado para actualizar: ${documento.id}`);
        });

        // Ejecutar el lote
        await batch.commit();
        
        console.log('---------------------------------------------------------');
        console.log('>>> ¡ÉXITO! Todos los registros han sido actualizados a "aptim".');
        console.log('---------------------------------------------------------');

    } catch (error) {
        console.error('!!! Error durante la ejecución del script:', error);
    } finally {
        // En scripts de Node.js a veces es necesario forzar la salida si hay listeners activos
        process.exit(0);
    }
}

// Ejecutar el script
corregirDatos();
