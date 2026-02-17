/**
 * Script de normalización de nombres de empresas para Firebase Firestore.
 * 
 * Este script busca todos los documentos en la colección:
 * /empresas
 * y convierte la propiedad 'nombre' a minúsculas.
 * 
 * Ejecución: node scripts/lowercase-company-names.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');

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

async function normalizarNombresEmpresas() {
    console.log('>>> Iniciando normalización de nombres de empresas...');
    
    const empresasRef = collection(db, 'empresas');

    try {
        const snapshot = await getDocs(empresasRef);
        
        if (snapshot.empty) {
            console.log('--- No se encontraron empresas en la colección ---');
            return;
        }

        console.log(`>>> Encontradas ${snapshot.size} empresas. Procesando actualizaciones...`);
        
        let batch = writeBatch(db);
        let count = 0;
        let totalUpdated = 0;

        for (const documento of snapshot.docs) {
            const data = documento.data();
            const nombreOriginal = data.nombre || '';
            const nombreMinusculas = nombreOriginal.toLowerCase();

            // Solo actualizar si el nombre ha cambiado
            if (nombreOriginal !== nombreMinusculas) {
                const docRef = doc(db, 'empresas', documento.id);
                batch.update(docRef, { nombre: nombreMinusculas });
                console.log(`    [*] Preparado: "${nombreOriginal}" -> "${nombreMinusculas}" (${documento.id})`);
                count++;
                totalUpdated++;
            }

            // Firestore tiene un límite de 500 operaciones por batch
            if (count === 500) {
                await batch.commit();
                console.log('>>> Batch de 500 documentos completado.');
                batch = writeBatch(db);
                count = 0;
            }
        }

        // Committear el resto de las operaciones si existen
        if (count > 0) {
            await batch.commit();
        }
        
        console.log('---------------------------------------------------------');
        console.log(`>>> ¡ÉXITO! Se actualizaron ${totalUpdated} empresas a minúsculas.`);
        console.log('---------------------------------------------------------');

    } catch (error) {
        console.error('!!! Error durante la ejecución del script:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar el script
normalizarNombresEmpresas();
