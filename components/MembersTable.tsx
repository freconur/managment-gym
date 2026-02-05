import React, { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { FaEdit, FaTrash, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from '@/pages/members/Members.module.css';

import { Member, Company } from '@/features/types/types';
import PinModal from './PinModal';

interface MembersTableProps {
    members: Member[];
    empresas: Company[];
    isLoading: boolean;
    onEdit: (member: Member) => void;
    onDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 20;

export const MembersTable: React.FC<MembersTableProps> = ({
    members,
    empresas,
    isLoading,
    onEdit,
    onDelete
}) => {
    const [filterEmpresa, setFilterEmpresa] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // PIN Security State
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'EDIT' | 'DELETE', payload: any } | null>(null);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterEmpresa, searchTerm]);

    const handleActionRequest = (type: 'EDIT' | 'DELETE', payload: any) => {
        setPendingAction({ type, payload });
        setIsPinModalOpen(true);
    };

    const handlePinSuccess = () => {
        if (!pendingAction) return;

        if (pendingAction.type === 'EDIT') {
            onEdit(pendingAction.payload);
        } else if (pendingAction.type === 'DELETE') {
            onDelete(pendingAction.payload);
        }

        setPendingAction(null);
    };

    const filteredMembers = members.filter(member => {
        const matchesEmpresa = filterEmpresa ? member.empresa === filterEmpresa : true;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' ||
            member.nombre.toLowerCase().includes(searchLower) ||
            member.apellidos.toLowerCase().includes(searchLower) ||
            member.dni.includes(searchLower); // Fixed: ensure includes is used on string

        return matchesEmpresa && matchesSearch;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedMembers = filteredMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    return (
        <div className={styles.tableContainer}>
            <div className={styles.searchBarContainer} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por DNI, Nombre o Apellidos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.625rem 0.625rem 0.625rem 2.75rem',
                            borderRadius: '0.75rem',
                            border: '1px solid var(--border-glass)',
                            fontSize: '0.95rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                    />
                </div>
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead className={styles.thead}>
                        <tr>
                            <th className={styles.th}>Foto</th>
                            <th className={styles.th}>DNI</th>
                            <th className={styles.th}>Nombre Completo</th>
                            <th className={styles.th}>Área</th>
                            <th className={styles.th}>Cargo</th>
                            <th className={styles.th}>Sexo</th>
                            <th className={styles.th}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <span>Empresa</span>
                                    <select
                                        value={filterEmpresa}
                                        onChange={(e) => setFilterEmpresa(e.target.value)}
                                        className={styles.filterSelect}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="">Todas</option>
                                        {empresas.map(emp => (
                                            <option key={emp.id} value={emp.nombre}>{emp.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </th>
                            <th className={`${styles.th} ${styles.tdActions}`}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className={styles.emptyState}>Cargando usuarios...</td>
                            </tr>
                        ) : filteredMembers.length === 0 ? (
                            <tr>
                                <td colSpan={8} className={styles.emptyState}>No hay usuarios registrados.</td>
                            </tr>
                        ) : (
                            paginatedMembers.map((member) => (
                                <tr key={member.id} className={styles.tr}>
                                    <td className={styles.td}>
                                        {member.fotoUrl ? (
                                            <NextImage
                                                src={member.fotoUrl}
                                                alt={member.nombre}
                                                width={40}
                                                height={40}
                                                className={styles.previewImage}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className={styles.avatarPlaceholder}>
                                                N/A
                                            </div>
                                        )}
                                    </td>
                                    <td className={`${styles.td} ${styles.tdDni}`}>{member.dni}</td>
                                    <td className={`${styles.td} ${styles.tdName}`}>{member.nombre} {member.apellidos}</td>
                                    <td className={styles.td}>
                                        {member.area ? (
                                            <span className={`${styles.badge} ${styles.badgeArea}`}>{member.area}</span>
                                        ) : '-'}
                                    </td>
                                    <td className={styles.td}>
                                        {member.cargo ? (
                                            <span className={`${styles.badge} ${styles.badgeCargo}`}>{member.cargo}</span>
                                        ) : '-'}
                                    </td>
                                    <td className={`${styles.td} ${styles.tdSex}`}>{member.sexo}</td>
                                    <td className={styles.td}>
                                        <span className={`${styles.badge} ${styles.badgeCompany}`}>{member.empresa}</span>
                                    </td>
                                    <td className={`${styles.td} ${styles.tdActions}`}>
                                        <div className={styles.actionButtonsContainer}>
                                            <button
                                                onClick={() => handleActionRequest('EDIT', member)}
                                                className={styles.editButton}
                                                title="Editar (Requiere PIN)"
                                            >
                                                <FaEdit size={14} />
                                            </button>
                                            <button
                                                onClick={() => member.id && handleActionRequest('DELETE', member.id)}
                                                className={styles.deleteButton}
                                                title="Eliminar (Requiere PIN)"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {!isLoading && filteredMembers.length > 0 && (
                <div className={styles.paginationContainer} style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    borderTop: '1px solid var(--border-glass)'
                }}>
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className={styles.paginationButton}
                        style={{
                            background: 'none',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '0.5rem',
                            padding: '0.5rem',
                            color: 'var(--text-primary)',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <FaChevronLeft />
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Página {currentPage} de {totalPages} ({filteredMembers.length} registros)
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className={styles.paginationButton}
                        style={{
                            background: 'none',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '0.5rem',
                            padding: '0.5rem',
                            color: 'var(--text-primary)',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}

            <PinModal
                isOpen={isPinModalOpen}
                onClose={() => {
                    setIsPinModalOpen(false);
                    setPendingAction(null);
                }}
                onSuccess={handlePinSuccess}
                title={pendingAction?.type === 'DELETE' ? 'PIN para Eliminar' : 'PIN para Editar'}
            />
        </div>
    );
};
