import React, { useState } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase/firebase.config';
import { Member } from '@/features/types/types';
import styles from './InactiveMembersFilter.module.css';
import { FaUserClock, FaSpinner, FaTrash, FaExclamationTriangle, FaBuilding, FaIdCard, FaUserTag } from 'react-icons/fa';


interface InactiveMembersFilterProps {
    locationId?: string;
}

export const InactiveMembersFilter: React.FC<InactiveMembersFilterProps> = ({ locationId }) => {
    const [inactivePeriod, setInactivePeriod] = useState<number | null>(null); // 1, 2, or 3 months
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const getCollectionPath = () => {
        if (locationId) {
            return collection(db, 'ubicaciones', locationId, 'members');
        }
        return collection(db, 'members');
    };

    const fetchInactiveMembers = async (months: number) => {
        setLoading(true);
        setInactivePeriod(months);
        try {
            // Calculate threshold date
            const now = new Date();
            const thresholdDate = new Date();
            thresholdDate.setMonth(now.getMonth() - months);
            // Reset to start of day (00:00:00) so anyone who accessed ON that day is considered Active (>= threshold)
            // Anyone before that day (e.g. Dec 14) is Inactive (< threshold)
            thresholdDate.setHours(0, 0, 0, 0);

            const q = query(
                getCollectionPath(),
                where('lastAccess', '<', Timestamp.fromDate(thresholdDate)),
                orderBy('lastAccess', 'desc')
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Member[];

            // Note: This query assumes 'lastAccess' exists. 
            // Members without 'lastAccess' won't be returned by inequality query on that field.
            // If we want "Never accessed", we'd need a separate query or client-side filter.
            // For now, let's stick to "Has accessed but not in X months".

            setMembers(data);
        } catch (error) {
            console.error("Error fetching inactive members:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar a ${name}? Esta acción no se puede deshacer.`)) return;

        try {
            await deleteDoc(doc(getCollectionPath(), id));
            setMembers(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error("Error deleting member:", error);
            alert("Error al eliminar miembro.");
        }
    };

    const handleDeleteAll = async () => {
        if (members.length === 0) return;
        const confirmed = confirm(
            `⚠️ PELIGRO ⚠️\n\n¿Estás seguro de eliminar a TODOS los ${members.length} miembros listados?\n\nEsta acción eliminará permanentemente estos usuarios inactivos.`
        );
        if (!confirmed) return;

        setDeleting(true);
        try {
            // Firestore batches allow up to 500 ops. We handle chunks if needed.
            const chunkArray = (arr: Member[], size: number) => {
                const chunks = [];
                for (let i = 0; i < arr.length; i += size) {
                    chunks.push(arr.slice(i, i + size));
                }
                return chunks;
            };

            const batches = chunkArray(members, 450); // safe limit

            for (const chunk of batches) {
                const batch = writeBatch(db);
                chunk.forEach(member => {
                    if (member.id) {
                        const ref = doc(getCollectionPath(), member.id);
                        batch.delete(ref);
                    }
                });
                await batch.commit();
            }

            setMembers([]);
            alert("Se han eliminado todos los usuarios inactivos listados.");

        } catch (error) {
            console.error("Error deleting all members:", error);
            alert("Ocurrió un error al intentar eliminar a todos.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}><FaUserClock /> Miembros Inactivos</h3>
            </div>

            <div className={styles.buttons}>
                <button
                    className={`${styles.filterBtn} ${inactivePeriod === 3 ? styles.active : ''}`}
                    onClick={() => fetchInactiveMembers(3)}
                >
                    3 Meses
                </button>
            </div>

            <div className={styles.results}>
                {loading ? (
                    <div className={styles.loading}><FaSpinner className={styles.spin} /> Cargando...</div>
                ) : inactivePeriod && (
                    <>
                        <div className={styles.resultsHeader}>
                            <p className={styles.count}>Resultados: <strong>{members.length}</strong> miembros</p>
                            {members.length > 0 && (
                                <button
                                    className={styles.deleteAllBtn}
                                    onClick={handleDeleteAll}
                                    disabled={deleting}
                                >
                                    {deleting ? <FaSpinner className={styles.spin} /> : <FaExclamationTriangle />}
                                    {' '}Eliminar Todos
                                </button>
                            )}
                        </div>

                        <div className={styles.list}>
                            {members.map(member => (
                                <div key={member.id} className={styles.cardItem}>
                                    <div className={styles.cardHeader}>
                                        <span className={styles.name}>{member.nombre} {member.apellidos}</span>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => member.id && handleDelete(member.id, member.nombre)}
                                            title="Eliminar usuario"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>

                                    <div className={styles.cardDetails}>
                                        <div className={styles.detailRow}>
                                            <FaIdCard className={styles.icon} />
                                            <span><strong>DNI:</strong> {member.dni}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <FaUserTag className={styles.icon} />
                                            <span><strong>Sexo:</strong> {member.sexo}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <FaBuilding className={styles.icon} />
                                            <span><strong>Empresa:</strong> {member.empresa}</span>
                                        </div>
                                        {(member.area || member.cargo) && (
                                            <div className={styles.detailChips}>
                                                {member.area && <span className={styles.chipAttr}>{member.area}</span>}
                                                {member.cargo && <span className={styles.chipAttr}>{member.cargo}</span>}
                                            </div>
                                        )}
                                        <div className={styles.dateRow}>
                                            <span>
                                                {member.lastAccess
                                                    ? `Último acceso: ${member.lastAccess.toDate().toLocaleDateString()}`
                                                    : 'Sin registro de acceso'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
