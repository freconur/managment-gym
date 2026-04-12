import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAuth } from "@/features/context/AuthContext";
import { db } from "@/firebase/firebase.config";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { FaArrowLeft, FaCheck, FaTimes, FaTrash, FaCog, FaPlus, FaSignOutAlt, FaPen, FaShieldAlt } from "react-icons/fa";
import styles from "../../styles/UsersManagement.module.css";

interface UserData {
    uid: string;
    email: string;
    name?: string;
    nombres?: string;
    apellidos?: string;
    dni?: string;
    role: string;
    isActive: boolean;
    createdAt?: string;
}

interface Role {
    id: string;
    name: string;
    isSystem: boolean; // System roles cannot be deleted (e.g. admin)
}

const UsersPage = () => {
    const { userProfile, loading, logout } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    const [roles, setRoles] = useState<Role[]>([]);
    const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");

    // Edit User State
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<UserData | null>(null);
    const [editNombres, setEditNombres] = useState("");
    const [editApellidos, setEditApellidos] = useState("");
    const [editDni, setEditDni] = useState("");
    const [isUpdatingUser, setIsUpdatingUser] = useState(false);
    
    // Global Config State
    const [globalPin, setGlobalPin] = useState("2026");
    const [isEditingPin, setIsEditingPin] = useState(false);
    const [newPinValue, setNewPinValue] = useState("");
    const [isUpdatingPin, setIsUpdatingPin] = useState(false);
    const [showPinRaw, setShowPinRaw] = useState(false);

    useEffect(() => {
        if (!loading) {
            // Security Check: Only admins can access
            if (!userProfile || userProfile.role !== "admin") {
                router.push("/");
                return;
            }

            // Real-time listener
            const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
                const usersList: UserData[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    usersList.push({
                        ...data,
                        uid: doc.id, // Ensure UID is always the document ID from Firestore
                    } as UserData);
                });
                setUsers(usersList);
                setIsLoadingUsers(false);
            });

        }
    }, [loading, userProfile, router]);

    // Roles Management Effect
    useEffect(() => {
        if (!loading && userProfile?.role === "admin") {
            const rolesRef = collection(db, 'roles');
            // Real-time listener for roles
            const unsubscribe = onSnapshot(query(rolesRef, orderBy('name')), async (snapshot) => {
                if (snapshot.empty) {
                    // Seed defaults if empty
                    const defaultRoles = [
                        { name: 'admin', isSystem: true },
                        { name: 'staff', isSystem: false },
                        { name: 'entrenador', isSystem: false }
                    ];

                    for (const role of defaultRoles) {
                        try {
                            // Use name as ID for simplicity and uniqueness check
                            await setDoc(doc(db, 'roles', role.name), role);
                        } catch (e) {
                            console.error("Error seeding role:", role.name, e);
                        }
                    }
                } else {
                    const loadedRoles = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Role));
                    setRoles(loadedRoles);
                }
            });
            return () => unsubscribe();
        }
    }, [loading, userProfile]);

    // Global Config Listener (PIN)
    useEffect(() => {
        if (!loading && userProfile?.role === "admin") {
            const configRef = doc(db, 'configs', 'security');
            const unsubscribe = onSnapshot(configRef, (docSnap) => {
                if (docSnap.exists()) {
                    setGlobalPin(docSnap.data().adminPin || '2026');
                } else {
                    // Initialize if missing
                    setDoc(configRef, { adminPin: '2026', updatedAt: serverTimestamp() });
                }
            });
            return () => unsubscribe();
        }
    }, [loading, userProfile]);

    const handleAddRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;

        const roleId = newRoleName.trim().toLowerCase().replace(/\s+/g, '_');

        try {
            await setDoc(doc(db, 'roles', roleId), {
                name: roleId, // Storing internal name as the ID
                isSystem: false,
                createdAt: serverTimestamp()
            });
            setNewRoleName("");
        } catch (error) {
            console.error("Error adding role:", error);
            alert("Error al agregar rol");
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (roleId === 'admin') {
            alert("No se puede eliminar el rol de administrador");
            return;
        }

        if (confirm(`¿Estás seguro de eliminar el rol '${roleId}'?`)) {
            try {
                await deleteDoc(doc(db, 'roles', roleId));
            } catch (error) {
                console.error("Error deleting role:", error);
                alert("Error al eliminar rol");
            }
        }
    };

    const toggleStatus = async (uid: string, currentStatus: boolean) => {
        try {
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, { isActive: !currentStatus });
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error al actualizar estado");
        }
    };

    const changeRole = async (uid: string, newRole: string) => {
        try {
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, { role: newRole });
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Error al actualizar rol");
        }
    };

    const deleteUser = async (uid: string) => {
        if (confirm("¿Estás seguro de eliminar este usuario? Perderá el acceso permanentemente.")) {
            try {
                const userRef = doc(db, "users", uid);
                await deleteDoc(userRef);
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Error al eliminar usuario");
            }
        }
    }


    const openEditUserModal = (user: UserData) => {
        setUserToEdit(user);
        setEditNombres(user.nombres || "");
        setEditApellidos(user.apellidos || "");
        setEditDni(user.dni || "");
        setIsEditUserModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToEdit) return;

        setIsUpdatingUser(true);
        try {
            const userRef = doc(db, "users", userToEdit.uid);
            await updateDoc(userRef, {
                nombres: editNombres,
                apellidos: editApellidos,
                dni: editDni,
                name: `${editNombres} ${editApellidos}`.trim()
            });
            setIsEditUserModalOpen(false);
            setUserToEdit(null);
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Error al actualizar usuario");
        } finally {
            setIsUpdatingUser(false);
        }
    };

    const handleUpdatePin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPinValue.length !== 4) {
            alert("El PIN debe ser de 4 dígitos");
            return;
        }

        setIsUpdatingPin(true);
        try {
            const configRef = doc(db, 'configs', 'security');
            await updateDoc(configRef, {
                adminPin: newPinValue,
                updatedAt: serverTimestamp(),
                updatedBy: userProfile?.uid
            });
            setIsEditingPin(false);
            setNewPinValue("");
            alert("PIN de seguridad actualizado correctamente");
        } catch (error) {
            console.error("Error updating PIN:", error);
            alert("Error al actualizar PIN");
        } finally {
            setIsUpdatingPin(false);
        }
    };


    if (loading || isLoadingUsers) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
                <p>Cargando gestión de usuarios...</p>
            </div>
        );
    }

    // Double check render block (should be handled by useEffect redirect, but good for flicker prevention)
    if (userProfile?.role !== "admin") return null;

    return (
        <div className={styles.container}>
            <Head>
                <title>Gestión de Usuarios - Gym Management</title>
            </Head>

            <div className={styles.contentWrapper}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <button
                            onClick={() => router.push('/equipment')}
                            className={styles.backButton}
                        >
                            <FaArrowLeft /> Volver
                        </button>
                        <h1 className={styles.headerTitle}>
                            Gestión de Usuarios Del Sistema
                        </h1>
                    </div>

                    <div className={styles.headerActions}>
                        <button
                            onClick={() => setIsEditingPin(true)}
                            className={styles.rolesButton}
                            style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}
                        >
                            <FaShieldAlt /> PIN de Seguridad
                        </button>
                        <button
                            onClick={() => setIsRoleManagerOpen(true)}
                            className={styles.rolesButton}
                        >
                            <FaCog /> Gestionar Roles
                        </button>
                        <button
                            onClick={() => logout()}
                            className={styles.logoutButton}
                            title="Cerrar Sesión"
                        >
                            <FaSignOutAlt />
                        </button>
                    </div>
                </header>

                {/* Desktop View - Table */}
                <div className={`${styles.tableContainer} desktop-table`}>
                    <div className={styles.tableScroll}>
                        <table className={styles.table}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th className={styles.th}>Usuario</th>
                                    <th className={styles.th}>Rol</th>
                                    <th className={styles.th}>Estado</th>
                                    <th className={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.uid} className={styles.tr}>
                                        <td className={styles.td}>
                                            <div className={styles.userInfo}>
                                                <div className={styles.avatar}>
                                                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={styles.userName}>{user.name || "Sin nombre"}</p>
                                                    <p className={styles.userEmail}>{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                                            <select
                                                value={user.role}
                                                onChange={(e) => changeRole(user.uid, e.target.value)}
                                                className={styles.select}
                                            >
                                                {roles.map(role => (
                                                    <option key={role.id} value={role.name}>
                                                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={`${styles.badge} ${user.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                                                {user.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.actions}>
                                                <button
                                                    onClick={() => toggleStatus(user.uid, user.isActive)}
                                                    title={user.isActive ? "Bloquear acceso" : "Aprobar acceso"}
                                                    className={`${styles.actionBtn} ${user.isActive ? styles.btnBlock : styles.btnApprove}`}
                                                >
                                                    {user.isActive ? <FaTimes /> : <FaCheck />}
                                                </button>

                                                <button
                                                    onClick={() => deleteUser(user.uid)}
                                                    title="Eliminar usuario"
                                                    className={`${styles.actionBtn} ${styles.btnDelete}`}
                                                >
                                                    <FaTrash />
                                                </button>

                                                <button
                                                    onClick={() => openEditUserModal(user)}
                                                    title="Editar usuario"
                                                    className={`${styles.actionBtn} ${styles.btnEdit || ''}`}
                                                    style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                                                >
                                                    <FaPen />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile View - Cards */}
                <div className={styles.mobileCards}>
                    {users.map((user) => (
                        <div key={user.uid} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardUser}>
                                    <div className={styles.avatarLarge}>
                                        {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: '600', color: 'var(--text-primary)', margin: 0, fontSize: '1rem' }}>{user.name || "Sin nombre"}</p>
                                        <p className={styles.userEmail}>{user.email}</p>
                                    </div>
                                </div>
                                <span className={`${styles.badge} ${user.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                                    {user.isActive ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>

                            <div className={styles.cardBody}>
                                <div>
                                    <label className={styles.cardLabel}>
                                        Rol Asignado
                                    </label>
                                    <select
                                        value={user.role}
                                        onChange={(e) => changeRole(user.uid, e.target.value)}
                                        className={styles.selectFull}
                                    >
                                        {roles.map(role => (
                                            <option key={role.id} value={role.name}>
                                                {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.cardActions}>
                                    <button
                                        onClick={() => toggleStatus(user.uid, user.isActive)}
                                        className={`${styles.cardActionBtn} ${user.isActive ? styles.btnBlock : styles.btnApprove}`}
                                    >
                                        {user.isActive ? <><FaTimes /> Bloquear</> : <><FaCheck /> Aprobar</>}
                                    </button>

                                    <button
                                        onClick={() => deleteUser(user.uid)}
                                        className={`${styles.cardActionBtn} ${styles.btnDelete}`}
                                    >
                                        <FaTrash /> Eliminar
                                    </button>

                                    <button
                                        onClick={() => openEditUserModal(user)}
                                        className={styles.cardActionBtn}
                                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                                    >
                                        <FaPen /> Editar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div >


            {
                isRoleManagerOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>
                                    Gestionar Roles
                                </h2>
                                <button onClick={() => setIsRoleManagerOpen(false)} className={styles.modalCloseBtn}>
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddRole} className={styles.addRoleForm}>
                                <input
                                    type="text"
                                    placeholder="Nuevo rol..."
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    className={styles.roleInput}
                                />
                                <button
                                    type="submit"
                                    disabled={!newRoleName.trim()}
                                    className={styles.addRoleBtn}
                                >
                                    <FaPlus />
                                </button>
                            </form>

                            <div className={styles.rolesListContainer}>
                                <ul className={styles.rolesList}>
                                    {roles.map(role => (
                                        <li key={role.id} className={styles.roleItem}>
                                            <span className={styles.roleName}>
                                                {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                                {role.isSystem && <span className={styles.systemBadge}>(Sistema)</span>}
                                            </span>

                                            {!role.isSystem && (
                                                <button
                                                    onClick={() => handleDeleteRole(role.id)}
                                                    className={styles.deleteRoleBtn}
                                                    title="Eliminar rol"
                                                >
                                                    <FaTrash size={14} />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit User Modal */}
            {
                isEditUserModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>
                                    Editar Usuario
                                </h2>
                                <button onClick={() => setIsEditUserModalOpen(false)} className={styles.modalCloseBtn}>
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateUser}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                                        Nombres
                                    </label>
                                    <input
                                        type="text"
                                        value={editNombres}
                                        onChange={(e) => setEditNombres(e.target.value)}
                                        className={styles.roleInput}
                                        placeholder="Ej. Juan Carlos"
                                        required
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                                        Apellidos
                                    </label>
                                    <input
                                        type="text"
                                        value={editApellidos}
                                        onChange={(e) => setEditApellidos(e.target.value)}
                                        className={styles.roleInput}
                                        placeholder="Ej. Pérez López"
                                        required
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                                        DNI
                                    </label>
                                    <input
                                        type="text"
                                        value={editDni}
                                        onChange={(e) => setEditDni(e.target.value)}
                                        className={styles.roleInput}
                                        placeholder="Ej. 12345678"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditUserModalOpen(false)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--border-glass)',
                                            background: 'transparent',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUpdatingUser}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.5rem',
                                            border: 'none',
                                            background: isUpdatingUser ? '#93c5fd' : '#3b82f6',
                                            color: 'white',
                                            cursor: isUpdatingUser ? 'not-allowed' : 'pointer',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {isUpdatingUser ? (
                                            <>
                                                <div style={{
                                                    width: '1rem',
                                                    height: '1rem',
                                                    border: '2px solid white',
                                                    borderTopColor: 'transparent',
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite'
                                                }} />
                                                Guardando...
                                            </>
                                        ) : (
                                            'Guardar Cambios'
                                        )}
                                    </button>
                                </div>
                                <style jsx>{`
                                    @keyframes spin {
                                        to { transform: rotate(360deg); }
                                    }
                                `}</style>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* PIN Manager Modal */}
            {
                isEditingPin && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>
                                    PIN de Seguridad Global
                                </h2>
                                <button onClick={() => setIsEditingPin(false)} className={styles.modalCloseBtn}>
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <div className={styles.modalBody} style={{ padding: '1.5rem' }}>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                                    Este PIN es requerido para acciones críticas como eliminar registros de acceso en toda la plataforma.
                                </p>

                                <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>
                                        <span>PIN Actual:</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ color: '#3b82f6', letterSpacing: '0.1em', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                                {showPinRaw ? globalPin : '••••'}
                                            </span>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowPinRaw(!showPinRaw)}
                                                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500' }}
                                            >
                                                {showPinRaw ? "Ocultar" : "Mostrar"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleUpdatePin}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b' }}>
                                            Nuevo PIN (4 dígitos)
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={4}
                                            pattern="\d{4}"
                                            value={newPinValue}
                                            onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                                            className={styles.roleInput}
                                            placeholder="XXXX"
                                            required
                                            style={{ width: '100%', textAlign: 'center', fontSize: '1.75rem', letterSpacing: '0.4em', fontWeight: '800', border: '2px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingPin(false)}
                                            style={{ 
                                                padding: '0.75rem 1rem', 
                                                borderRadius: '0.5rem', 
                                                border: '1px solid #e2e8f0', 
                                                background: 'white',
                                                color: '#64748b',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isUpdatingPin || newPinValue.length !== 4}
                                            style={{ 
                                                padding: '0.75rem 1rem', 
                                                borderRadius: '0.5rem', 
                                                border: 'none', 
                                                background: (isUpdatingPin || newPinValue.length !== 4) ? '#94a3b8' : '#ef4444', 
                                                color: 'white',
                                                fontWeight: '600',
                                                fontSize: '0.875rem',
                                                cursor: (isUpdatingPin || newPinValue.length !== 4) ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <FaShieldAlt size={14} />
                                            {isUpdatingPin ? 'Actualizando...' : 'Guardar Nuevo PIN'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default UsersPage;
