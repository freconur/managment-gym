const XLSX = require('xlsx');
const path = require('path');

// Quantity > 500 to test batching
const COUNT = 652;
const OUTPUT_FILE = path.join(__dirname, '../public/test_members_652.xlsx');

const data = [];
for (let i = 1; i <= COUNT; i++) {
    const dni = 10000000 + i; // 8 digits
    data.push({
        dni: dni.toString(),
        apellidos: `Apellido${i}`,
        nombres: `Nombre${i}`,
        empresa: 'Empresa Test',
        sexo: i % 2 === 0 ? 'M' : 'F',
        area: 'Area Test',
        cargo: 'Cargo Test'
    });
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, "Members");

XLSX.writeFile(wb, OUTPUT_FILE);

console.log(`Generated ${OUTPUT_FILE} with ${COUNT} records.`);
