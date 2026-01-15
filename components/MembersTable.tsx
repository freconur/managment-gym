import React, { useState } from 'react';
import NextImage from 'next/image';
import { FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import styles from '@/pages/members/Members.module.css';

import { Member, Company } from '@/features/types/types';

interface MembersTableProps {
    members: Member[];
    empresas: Company[];
    isLoading: boolean;
    onEdit: (member: Member) => void;
    onDelete: (id: string) => void;
}

export const MembersTable: React.FC<MembersTableProps> = ({
    members,
    empresas,
    isLoading,
    onEdit,
    onDelete
}) => {
    const [filterEmpresa, setFilterEmpresa] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMembers = members.filter(member => {
        const matchesEmpresa = filterEmpresa ? member.empresa === filterEmpresa : true;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' ||
            member.nombre.toLowerCase().includes(searchLower) ||
            member.apellidos.toLowerCase().includes(searchLower) ||
            member.dni.includes(searchTerm);

        return matchesEmpresa && matchesSearch;
    });

    return (
        <div className={styles.tableContainer}>
            <div className={styles.searchBarContainer} style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Buscar por DNI, Nombre o Apellidos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #d1d5db',
                            fontSize: '0.95rem'
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
                                        style={{
                                            padding: '4px',
                                            borderRadius: '4px',
                                            border: 'none',
                                            fontSize: '0.8em',
                                            color: '#333',
                                            fontWeight: 'normal'
                                        }}
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
                        ) : members.length === 0 ? (
                            <tr>
                                <td colSpan={8} className={styles.emptyState}>No hay usuarios registrados.</td>
                            </tr>
                        ) : (
                            filteredMembers.map((member) => (
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
                                    <td className={styles.td}>{member.area || '-'}</td>
                                    <td className={styles.td}>{member.cargo || '-'}</td>
                                    <td className={`${styles.td} ${styles.tdSex}`}>{member.sexo}</td>
                                    <td className={`${styles.td} ${styles.tdCompany}`}>{member.empresa}</td>
                                    <td className={`${styles.td} ${styles.tdActions}`}>
                                        <div className={styles.actionButtonsContainer}>
                                            <button
                                                onClick={() => onEdit(member)}
                                                className={styles.editButton}
                                                title="Editar"
                                            >
                                                <FaEdit size={14} />
                                            </button>
                                            <button
                                                onClick={() => member.id && onDelete(member.id)}
                                                className={styles.deleteButton}
                                                title="Eliminar"
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
        </div>
    );
};
