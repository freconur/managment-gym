import React, { useState } from 'react';
import styles from './ImportMembersModal.module.css';
import { FaFileExcel, FaTimes, FaUpload, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaInfoCircle, FaDownload } from 'react-icons/fa';
import { read, utils } from 'xlsx';
import { writeBatch, doc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '@/firebase/firebase.config';

interface ImportMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId?: string;
}

interface ParsedMember {
    dni: string;
    nombre: string;
    apellidos: string;
    empresa: string;
    area: string | null;
    cargo: string | null;
    sexo: string;
}

interface InvalidRecord {
    row: number;
    data: any;
    reason: string;
}

export const ImportMembersModal: React.FC<ImportMembersModalProps> = ({ isOpen, onClose, locationId }) => {
    const [step, setStep] = useState<'instructions' | 'preview' | 'importing' | 'success'>('instructions');
    const [validRecords, setValidRecords] = useState<ParsedMember[]>([]);
    const [invalidRecords, setInvalidRecords] = useState<InvalidRecord[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

    if (!isOpen) return null;

    const resetState = () => {
        setStep('instructions');
        setValidRecords([]);
        setInvalidRecords([]);
        setIsProcessing(false);
        setImportProgress(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = utils.sheet_to_json(worksheet) as any[];

            if (jsonData.length === 0) {
                alert('El archivo está vacío.');
                setIsProcessing(false);
                return;
            }

            const valid: ParsedMember[] = [];
            const invalid: InvalidRecord[] = [];

            jsonData.forEach((row, index) => {
                const rowNum = index + 2; // +2 because Excel is 1-indexed and has header
                const reasons: string[] = [];

                // 1. Check required fields presence
                if (!row.dni) reasons.push('Falta DNI');
                if (!row.apellidos) reasons.push('Faltan Apellidos');
                if (!row.nombres && !row.nombre) reasons.push('Falta Nombre');
                if (!row.empresa) reasons.push('Falta Empresa');
                if (!row.sexo) reasons.push('Falta Sexo');

                // 2. Data Validation
                let dniStr = '';
                if (row.dni) {
                    dniStr = String(row.dni).trim();
                    if (!/^\d{8}$/.test(dniStr)) {
                        reasons.push('DNI debe tener 8 dígitos numéricos');
                    }
                }

                if (reasons.length > 0) {
                    invalid.push({
                        row: rowNum,
                        data: row,
                        reason: reasons.join(', ')
                    });
                } else {
                    valid.push({
                        dni: dniStr,
                        nombre: String(row.nombres || row.nombre).trim(),
                        apellidos: String(row.apellidos).trim(),
                        empresa: String(row.empresa).trim(),
                        area: row.area ? String(row.area).trim() : null,
                        cargo: row.cargo ? String(row.cargo).trim() : null,
                        sexo: String(row.sexo).trim()
                    });
                }
            });

            setValidRecords(valid);
            setInvalidRecords(invalid);
            setStep('preview');

        } catch (error) {
            console.error("Error al procesar excel:", error);
            alert("Error al leer el archivo. Asegúrese de que sea un Excel válido.");
        } finally {
            setIsProcessing(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleImportConfirm = async () => {
        if (validRecords.length === 0) return;

        setStep('importing');
        const BATCH_SIZE = 450;
        const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE);
        setImportProgress({ current: 0, total: totalBatches });

        try {
            const membersCol = locationId
                ? collection(db, 'ubicaciones', locationId, 'members')
                : collection(db, 'members');

            for (let i = 0; i < totalBatches; i++) {
                setImportProgress({ current: i + 1, total: totalBatches });
                const batch = writeBatch(db);
                const start = i * BATCH_SIZE;
                const end = start + BATCH_SIZE;
                const chunk = validRecords.slice(start, end);

                chunk.forEach(member => {
                    const docRef = doc(membersCol, member.dni);
                    batch.set(docRef, {
                        ...member,
                        fotoUrl: null,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                });

                await batch.commit();
            }

            setStep('success');
        } catch (error) {
            console.error("Error importing to firestore:", error);
            alert("Ocurrió un error al guardar los datos.");
            setStep('preview');
        } finally {
            setImportProgress(null);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <FaFileExcel style={{ color: '#10b981' }} />
                        Importar desde Excel
                    </h2>
                    <button onClick={handleClose} className={styles.closeButton}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    {step === 'instructions' && (
                        <div className={styles.instructionsContainer}>
                            <div className={styles.iconWrapper}>
                                <FaUpload />
                            </div>
                            <h3 className={styles.instructionTitle}>Sube tu archivo de usuarios</h3>
                            <p className={styles.instructionText}>
                                El archivo debe ser formato <strong>.xlsx</strong> o <strong>.xls</strong> y contener las siguientes columnas en la primera fila.
                            </p>

                            <div className={styles.requirementsList}>
                                <h4>
                                    <FaInfoCircle />
                                    Columnas Requeridas
                                </h4>
                                <div className={styles.columnsList}>
                                    <span className={`${styles.columnTag} ${styles.columnRequired}`}>dni</span>
                                    <span className={`${styles.columnTag} ${styles.columnRequired}`}>apellidos</span>
                                    <span className={`${styles.columnTag} ${styles.columnRequired}`}>nombres</span>
                                    <span className={`${styles.columnTag} ${styles.columnRequired}`}>empresa</span>
                                    <span className={`${styles.columnTag} ${styles.columnRequired}`}>sexo</span>
                                    <span className={styles.columnTag}>area</span>
                                    <span className={styles.columnTag}>cargo</span>
                                </div>

                                <div className={styles.noteBox}>
                                    <FaExclamationTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                                    <span>
                                        <strong>Importante:</strong> La columna <code>dni</code> debe contener exactamente <strong>8 dígitos numéricos</strong>. Las filas que no cumplan este requisito serán rechazadas.
                                    </span>
                                </div>
                            </div>

                            <div className={styles.exampleImageContainer}>
                                <h5 className={styles.exampleTitle}>Ejemplo de Formato:</h5>
                                <img
                                    src="/excel_template_example.png"
                                    alt="Ejemplo de estructura Excel"
                                    className={styles.exampleImage}
                                />
                            </div>

                            <div className={styles.uploadArea}>
                                <label className={styles.fileInputLabel}>
                                    {isProcessing ? (
                                        <>
                                            <FaSpinner className={styles.spinAnimation} size={32} color="#3b82f6" />
                                            <span style={{ color: '#64748b', fontWeight: 500 }}>Procesando archivo...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '1.1rem' }}>Click para seleccionar archivo</span>
                                            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>o arrastra y suelta aquí</span>
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls"
                                                onChange={handleFileUpload}
                                                style={{ display: 'none' }}
                                                disabled={isProcessing}
                                            />
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className={styles.previewContainer}>
                            <div className={styles.previewSummary}>
                                <div className={`${styles.summaryCard} ${styles.summaryValid}`}>
                                    <div className={styles.countLarge}>{validRecords.length}</div>
                                    <div className={styles.countLabel}>Registros Válidos</div>
                                    <FaCheckCircle size={24} />
                                </div>
                                <div className={`${styles.summaryCard} ${styles.summaryInvalid}`}>
                                    <div className={styles.countLarge}>{invalidRecords.length}</div>
                                    <div className={styles.countLabel}>Errores Encontrados</div>
                                    <FaExclamationTriangle size={24} />
                                </div>
                            </div>

                            {invalidRecords.length > 0 && (
                                <>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#b91c1c' }}>Detalle de Errores</h4>
                                    <div className={styles.tableContainer}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '80px' }}>Fila #</th>
                                                    <th>Datos (Referencia)</th>
                                                    <th>Motivo del Error</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invalidRecords.map((rec, idx) => (
                                                    <tr key={idx} className={styles.rowInvalid}>
                                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{rec.row}</td>
                                                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                                            {rec.data.dni || '-'} | {rec.data.nombres || '-'} {rec.data.apellidos || '-'}
                                                        </td>
                                                        <td>
                                                            <span className={styles.errorBadge}>{rec.reason}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}

                            {validRecords.length > 0 && invalidRecords.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#166534', backgroundColor: '#f0fdf4', borderRadius: '0.75rem' }}>
                                    <FaCheckCircle size={48} style={{ marginBottom: '1rem' }} />
                                    <h3 style={{ margin: '0 0 0.5rem 0' }}>¡Todo listo!</h3>
                                    <p style={{ margin: 0 }}>El archivo ha sido validado correctamente. {validRecords.length} usuarios listos para importar.</p>
                                </div>
                            )}

                            {validRecords.length === 0 && invalidRecords.length > 0 && (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#b91c1c' }}>
                                    <p>No hay registros válidos para importar. Por favor corrige el archivo e intenta nuevamente.</p>
                                </div>
                            )}

                        </div>
                    )}

                    {step === 'importing' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem' }}>
                            <FaSpinner size={64} className={styles.spinAnimation} color="#3b82f6" />
                            <h3 style={{ fontSize: '1.5rem', color: '#1e293b' }}>
                                {importProgress
                                    ? `Importando lote ${importProgress.current} de ${importProgress.total}...`
                                    : 'Guardando usuarios...'}
                            </h3>
                            <p style={{ color: '#64748b' }}>Esto puede tomar unos segundos.</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: '3rem' }}>
                                <FaCheckCircle />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', color: '#1e293b' }}>¡Importación Exitosa!</h3>
                            <p style={{ color: '#64748b' }}>Se han agregado <strong>{validRecords.length}</strong> nuevos usuarios correctamente.</p>
                            <button onClick={handleClose} className={`${styles.button} ${styles.buttonPrimary}`}>
                                Cerrar
                            </button>
                        </div>
                    )}
                </div>

                {step === 'preview' && (
                    <div className={styles.footer}>
                        <button onClick={() => setStep('instructions')} className={`${styles.button} ${styles.buttonSecondary}`}>
                            Atrás / Cargar otro
                        </button>
                        {validRecords.length > 0 && (
                            <button onClick={handleImportConfirm} className={`${styles.button} ${styles.buttonSuccess}`}>
                                <FaUpload />
                                {invalidRecords.length > 0 ? `Importar ${validRecords.length} válidos` : 'Importar Todos'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
