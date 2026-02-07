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

    // Batch Action
    onBatchUpdateCompany?: (memberIds: string[], targetCompany: string) => void;
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
    onSearchChange,
    onBatchUpdateCompany
}) => {
    // Local filter state...
    const [filterEmpresa, setFilterEmpresa] = useState('');
    // const [searchTerm, setSearchTerm] = useState(''); // REPLACED BY PROP

    // NOTE: searchTerm and filters work on the CURRENT PAGE data only in this implementation
    // If you need to search globally, that requires a backend search query change.

    // PIN Security State


    // Selection state for bulk update
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [targetBatchCompany, setTargetBatchCompany] = useState('');
    // Local pagination state
    const [localCurrentPage, setLocalCurrentPage] = useState(1);

    // Member-derived company list
    const memberCompanies = Array.from(new Set(members.map(m => m.empresa).filter(Boolean))).sort();
    const [filterMemberCompany, setFilterMemberCompany] = useState('');

    // Reset page when filters change
    useEffect(() => {
        setLocalCurrentPage(1);
    }, [filterEmpresa, filterMemberCompany, searchTerm]);

    const handleActionRequest = (type: 'EDIT' | 'DELETE', payload: any) => {
        if (type === 'EDIT') {
            onEdit(payload);
        } else if (type === 'DELETE') {
            // Defer to parent's delete handling which usually has a confirm check
            onDelete(payload);
        }
    };

    const filteredMembers = members.filter(member => {
        const matchesEmpresa = filterEmpresa ? member.empresa?.toLowerCase() === filterEmpresa.toLowerCase() : true;
        const matchesMemberCompany = filterMemberCompany ? member.empresa?.toLowerCase() === filterMemberCompany.toLowerCase() : true;
        const searchLower = searchTerm.toLowerCase();

        // Client-side search (since we have all members)
        const matchesSearch = searchTerm === '' ||
            member.dni.includes(searchLower) || // DNI Match
            member.nombre.toLowerCase().includes(searchLower) || // Name Match
            member.apellidos.toLowerCase().includes(searchLower); // Surname Match

        return matchesEmpresa && matchesMemberCompany && matchesSearch;
    });

    // Client-Side Pagination Logic
    const totalFiltered = filteredMembers.length;
    const totalPagesCalc = Math.ceil(totalFiltered / ITEMS_PER_PAGE) || 1;

    // Ensure current page is valid
    if (localCurrentPage > totalPagesCalc && totalPagesCalc > 0) {
        setLocalCurrentPage(totalPagesCalc);
    }

    const startIndex = (localCurrentPage - 1) * ITEMS_PER_PAGE;
    const paginatedMembers = filteredMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleNextPageLocal = () => {
        if (localCurrentPage < totalPagesCalc) {
            setLocalCurrentPage(prev => prev + 1);
        }
    };

    const handlePrevPageLocal = () => {
        if (localCurrentPage > 1) {
            setLocalCurrentPage(prev => prev - 1);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = filteredMembers.map(m => m.id).filter((id): id is string => !!id);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBatchUpdate = () => {
        if (targetBatchCompany && onBatchUpdateCompany) {
            onBatchUpdateCompany(Array.from(selectedIds), targetBatchCompany);
            setSelectedIds(new Set()); // Reset selection after update
        }
    };

    return (
        <div className={styles.tableContainer}>
            <div className={styles.searchBarContainer} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por DNI, Nombre..."
                        value={searchTerm}
                        onChange={(e) => {
                            // Client-side search allows text too for names
                            const val = e.target.value;
                            if (onSearchChange) onSearchChange(val);
                        }}
                        // maxLength={8} // Removed to allow names
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {selectedIds.size} seleccionados
                    </span>
                    {selectedIds.size > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select
                                value={targetBatchCompany}
                                onChange={(e) => setTargetBatchCompany(e.target.value)}
                                className={styles.filterSelect}
                                style={{ width: '200px' }}
                            >
                                <option value="">Cambiar empresa a...</option>
                                {empresas.map(emp => (
                                    <option key={emp.id} value={emp.nombre}>{emp.nombre}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleBatchUpdate}
                                disabled={!targetBatchCompany}
                                className={styles.actionButton}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    cursor: targetBatchCompany ? 'pointer' : 'not-allowed',
                                    opacity: targetBatchCompany ? 1 : 0.6
                                }}
                            >
                                Actualizar
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead className={styles.thead}>
                        <tr>
                            <th className={styles.th}>
                                <input
                                    type="checkbox"
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    checked={filteredMembers.length > 0 && selectedIds.size === filteredMembers.length}
                                    style={{ cursor: 'pointer' }}
                                />
                            </th>
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
                                        style={{ marginBottom: '5px' }}
                                    >
                                        <option value="">Empresas (Registradas)</option>
                                        {empresas.map(emp => (
                                            <option key={emp.id} value={emp.nombre}>{emp.nombre}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={filterMemberCompany}
                                        onChange={(e) => setFilterMemberCompany(e.target.value)}
                                        className={styles.filterSelect}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="">Empresas (Todas)</option>
                                        {memberCompanies.map((emp, idx) => (
                                            <option key={idx} value={emp}>{emp}</option>
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
                                <tr key={member.id} className={`${styles.tr} ${member.id && selectedIds.has(member.id) ? styles.selectedRow : ''}`}>
                                    <td className={styles.td}>
                                        <input
                                            type="checkbox"
                                            checked={!!member.id && selectedIds.has(member.id)}
                                            onChange={(e) => member.id && handleSelectOne(member.id, e.target.checked)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td className={styles.td}>{startIndex + index + 1}</td>
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

            {
                totalFiltered > ITEMS_PER_PAGE && (
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
                                onClick={handlePrevPageLocal}
                                disabled={localCurrentPage === 1}
                                className={styles.paginationButton}
                                style={{
                                    background: 'none',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '0.5rem',
                                    padding: '0.5rem',
                                    color: 'var(--text-primary)',
                                    cursor: (localCurrentPage === 1) ? 'not-allowed' : 'pointer',
                                    opacity: (localCurrentPage === 1) ? 0.5 : 1,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <FaChevronLeft />
                            </button>

                            <div style={{ textAlign: 'center' }}>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                                    Página {localCurrentPage} de {totalPagesCalc}
                                </span>
                            </div>

                            <button
                                onClick={handleNextPageLocal}
                                disabled={localCurrentPage === totalPagesCalc}
                                className={styles.paginationButton}
                                style={{
                                    background: 'none',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '0.5rem',
                                    padding: '0.5rem',
                                    color: 'var(--text-primary)',
                                    cursor: (localCurrentPage === totalPagesCalc) ? 'not-allowed' : 'pointer',
                                    opacity: (localCurrentPage === totalPagesCalc) ? 0.5 : 1,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Mostrando {paginatedMembers.length} de {totalFiltered} resultados (Total General: {members.length})
                            </span>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
