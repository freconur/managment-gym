import React, { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { FaEdit, FaTrash, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from '@/pages/members/Members.module.css';

import { Member, Company } from '@/features/types/types';


interface MembersTableProps {
    members: Member[];
    empresas: Company[];
    isLoading: boolean;
    onEdit: (member: Member) => void;
    onDelete: (id: string) => void;
    onLoadMore?: () => void; // Deprecated
    hasMore?: boolean; // Deprecated
    loadingMore?: boolean; // Deprecated

    // New Pagination Props
    currentPage?: number;
    totalPages?: number;
    totalMembers?: number;
    onNextPage?: () => void;
    onPrevPage?: () => void;
    isPaginating?: boolean;

    // Search Props
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
}

const ITEMS_PER_PAGE = 20;

export const MembersTable: React.FC<MembersTableProps> = ({
    members,
    empresas,
    isLoading,
    onEdit,
    onDelete,
    onLoadMore,
    hasMore,
    loadingMore,
    currentPage = 1,
    totalPages = 1,
    totalMembers = 0,
    onNextPage,
    onPrevPage,
    isPaginating,
    searchTerm = '',
    onSearchChange
}) => {
    // Local filter state...
    const [filterEmpresa, setFilterEmpresa] = useState('');
    // const [searchTerm, setSearchTerm] = useState(''); // REPLACED BY PROP

    // NOTE: searchTerm and filters work on the CURRENT PAGE data only in this implementation
    // If you need to search globally, that requires a backend search query change.

    // PIN Security State


    // Reset page when filters change
    // useEffect(() => {
    //     setCurrentPage(1);
    // }, [filterEmpresa, searchTerm]);

    const handleActionRequest = (type: 'EDIT' | 'DELETE', payload: any) => {
        if (type === 'EDIT') {
            onEdit(payload);
        } else if (type === 'DELETE') {
            // Defer to parent's delete handling which usually has a confirm check
            onDelete(payload);
        }
    };

    const filteredMembers = members.filter(member => {
        const matchesEmpresa = filterEmpresa ? member.empresa === filterEmpresa : true;
        // const searchLower = searchTerm.toLowerCase();
        // const matchesSearch = searchTerm === '' ||
        //     member.nombre.toLowerCase().includes(searchLower) ||
        //     member.apellidos.toLowerCase().includes(searchLower) ||
        //     member.dni.includes(searchLower); // Client-side search disabled

        // We only filter by company locally now, as search is server-side
        return matchesEmpresa;
    });

    // Pagination Logic Removed (Server-side handled by parent)
    const paginatedMembers = filteredMembers; // Use all filtered members directly

    return (
        <div className={styles.tableContainer}>
            <div className={styles.searchBarContainer} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por DNI..."
                        value={searchTerm}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, ''); // Only numbers
                            if (onSearchChange) onSearchChange(val);
                        }}
                        maxLength={8}
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
                            <th className={styles.th}>N°</th>
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
                                <td colSpan={9} className={styles.emptyState}>Cargando usuarios...</td>
                            </tr>
                        ) : filteredMembers.length === 0 ? (
                            <tr>
                                <td colSpan={9} className={styles.emptyState}>No hay usuarios registrados.</td>
                            </tr>
                        ) : (
                            paginatedMembers.map((member, index) => (
                                <tr key={member.id} className={styles.tr}>
                                    <td className={styles.td}>{index + 1}</td>
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

            {/* Numbered Pagination Control */}
            {onNextPage && onPrevPage && (
                <div className={styles.paginationContainer} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    borderTop: '1px solid var(--border-glass)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={onPrevPage}
                            disabled={currentPage === 1 || isPaginating}
                            className={styles.paginationButton}
                            style={{
                                background: 'none',
                                border: '1px solid var(--border-glass)',
                                borderRadius: '0.5rem',
                                padding: '0.5rem',
                                color: 'var(--text-primary)',
                                cursor: (currentPage === 1 || isPaginating) ? 'not-allowed' : 'pointer',
                                opacity: (currentPage === 1 || isPaginating) ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <FaChevronLeft />
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                                Página {currentPage} de {totalPages || 1}
                            </span>
                            {isPaginating && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#3b82f6' }}>Cargando...</span>}
                        </div>

                        <button
                            onClick={onNextPage}
                            disabled={currentPage === totalPages || isPaginating}
                            className={styles.paginationButton}
                            style={{
                                background: 'none',
                                border: '1px solid var(--border-glass)',
                                borderRadius: '0.5rem',
                                padding: '0.5rem',
                                color: 'var(--text-primary)',
                                cursor: (currentPage === totalPages || isPaginating) ? 'not-allowed' : 'pointer',
                                opacity: (currentPage === totalPages || isPaginating) ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Total Miembros: {totalMembers}
                        </span>
                    </div>
                </div>
            )}


        </div>
    );
};
