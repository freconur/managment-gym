/**
 * Script de normalización de datos de miembros para Firebase Firestore.
 * 
 * Este script busca todos los documentos en la colección:
 * /ubicaciones/468dFRtCNao49Ld9GeCm/members
 * y convierte las propiedades 'nombre', 'apellidos' y 'empresa' a minúsculas.
 * 
 * Ejecución: node scripts/lowercase-members-data.js
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

async function normalizarMiembros() {
    console.log(`>>> Iniciando normalización de miembros para la ubicación: ${ID}...`);
    
    // Ruta dinámica según el ID constante
    const membersRef = collection(db, 'ubicaciones', ID, 'members');

    try {
        const snapshot = await getDocs(membersRef);
        
        if (snapshot.empty) {
            console.log('--- No se encontraron miembros en esta ubicación ---');
            return;
        }

        console.log(`>>> Encontrados ${snapshot.size} miembros. Procesando actualizaciones...`);
        
        let batch = writeBatch(db);
        let count = 0;
        let totalUpdated = 0;

        for (const documento of snapshot.docs) {
            const data = documento.data();
            
            // Valores originales
            const nombre = data.nombre || '';
            const apellidos = data.apellidos || '';
            const empresa = data.empresa || '';

            // Valores en minúsculas
            const nombreLower = nombre.toLowerCase();
            const apellidosLower = apellidos.toLowerCase();
            const empresaLower = empresa.toLowerCase();

            // Solo actualizar si algo ha cambiado
            if (nombre !== nombreLower || apellidos !== apellidosLower || empresa !== empresaLower) {
                const docRef = doc(db, 'ubicaciones', ID, 'members', documento.id);
                
                batch.update(docRef, { 
                    nombre: nombreLower,
                    apellidos: apellidosLower,
                    empresa: empresaLower
                });

                console.log(`    [*] Preparado: "${nombre} ${apellidos}" [${empresa}] -> "${nombreLower} ${apellidosLower}" [${empresaLower}]`);
                
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
        console.log(`>>> ¡ÉXITO! Se actualizaron ${totalUpdated} registros de miembros.`);
        console.log('---------------------------------------------------------');

    } catch (error) {
        console.error('!!! Error durante la ejecución del script:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar el script
normalizarMiembros();
