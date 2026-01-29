import React from 'react';
import NextImage from 'next/image';
import { FaCamera, FaEdit, FaSave, FaSpinner, FaTimes, FaUserPlus } from 'react-icons/fa';
import styles from './MembersForm.module.css';
import { Member, Company, Area, Cargo } from '@/features/types/types';
import { SmartSelect } from './SmartSelect';

interface MembersFormProps {
    isOpen: boolean;
    onClose: () => void;
    formData: Member;
    isEditing: boolean;
    isSubmitting: boolean;
    previewUrl: string | null;
    empresas: Company[];
    areas: Area[];
    cargos: Cargo[];
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    onOpenCompanyModal: () => void;
    onOpenAreaModal: () => void;
    onOpenCargoModal: () => void;
}

export const MembersForm: React.FC<MembersFormProps> = ({
    formData,
    isEditing,
    isSubmitting,
    previewUrl,
    empresas,
    areas,
    cargos,
    onInputChange,
    onImageChange,
    onSubmit,
    onCancel,
    onOpenCompanyModal,
    onOpenAreaModal,
    onOpenCargoModal,
    isOpen,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid var(--border-glass)'
                }}>
                    <h2 className={styles.formTitle} style={{ margin: 0, color: 'var(--text-primary)' }}>
                        {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h2>
                    <button onClick={onClose} style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center'
                    }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <FaTimes size={20} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className={styles.form}>
                    <div className={styles.requiredWarning}>
                        <FaUserPlus />
                        <span>Todos los campos son obligatorios, excepto la foto.</span>
                    </div>

                    <div>
                        <label htmlFor="dni" className={styles.label}>
                            DNI <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="number"
                            id="dni"
                            name="dni"
                            value={formData.dni}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.length > 8) return; // Prevent more than 8
                                onInputChange(e);
                            }}
                            onKeyDown={(e) => {
                                // Block invalid chars for DNI
                                if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            onBlur={(e) => {
                                // Optional logic if needed, but required handles empty
                            }}
                            placeholder="8 dígitos"
                            required
                            className={styles.input}
                        />
                    </div>

                    <div>
                        <label className={styles.label}>Foto</label>
                        <div className={styles.photoUploadContainer}>
                            {previewUrl && (
                                <NextImage
                                    src={previewUrl}
                                    alt="Vista previa"
                                    width={48}
                                    height={48}
                                    className={styles.previewImage}
                                    loading="lazy"
                                />
                            )}
                            <label className={styles.uploadLabel}>
                                <FaCamera />
                                <span>Seleccionar o tomar foto</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={onImageChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>
                        <p className={styles.uploadHelpText}>Máximo 100kb</p>
                    </div>

                    <div>
                        <label htmlFor="nombre" className={styles.label}>
                            Nombre <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="text"
                            id="nombre"
                            name="nombre"
                            value={formData.nombre}
                            onChange={onInputChange}
                            required
                            className={styles.input}
                        />
                    </div>
                    <div>
                        <label htmlFor="apellidos" className={styles.label}>
                            Apellidos <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="text"
                            id="apellidos"
                            name="apellidos"
                            value={formData.apellidos}
                            onChange={onInputChange}
                            required
                            className={styles.input}
                        />
                    </div>
                    <div>
                        <label htmlFor="empresa" className={styles.label}>
                            Empresa <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.companySelectGroup}>
                            <SmartSelect
                                options={empresas}
                                value={formData.empresa}
                                onChange={(val) => {
                                    // Simulate generic event for compatibility
                                    onInputChange({ target: { name: 'empresa', value: val } } as any);
                                }}
                                name="empresa"
                                placeholder="Buscar empresa..."
                                className={`${styles.input} ${styles.companyInput}`}
                                required
                            />
                            <button
                                type="button"
                                onClick={onOpenCompanyModal}
                                className={styles.manageCompanyBtn}
                                title="Gestionar Empresas"
                            >
                                <FaEdit />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="area" className={styles.label}>
                            Área <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.companySelectGroup}>
                            <SmartSelect
                                options={areas}
                                value={formData.area || ''}
                                onChange={(val) => {
                                    onInputChange({ target: { name: 'area', value: val } } as any);
                                }}
                                name="area"
                                placeholder="Buscar área..."
                                className={`${styles.input} ${styles.companyInput}`}
                                required
                            />
                            <button
                                type="button"
                                onClick={onOpenAreaModal}
                                className={styles.manageCompanyBtn}
                                title="Gestionar Áreas"
                            >
                                <FaEdit />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="cargo" className={styles.label}>
                            Cargo <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.companySelectGroup}>
                            <SmartSelect
                                options={cargos}
                                value={formData.cargo || ''}
                                onChange={(val) => {
                                    onInputChange({ target: { name: 'cargo', value: val } } as any);
                                }}
                                name="cargo"
                                placeholder="Buscar cargo..."
                                className={`${styles.input} ${styles.companyInput}`}
                                required
                            />
                            <button
                                type="button"
                                onClick={onOpenCargoModal}
                                className={styles.manageCompanyBtn}
                                title="Gestionar Cargos"
                            >
                                <FaEdit />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="sexo" className={styles.label}>
                            Sexo <span className={styles.required}>*</span>
                        </label>
                        <select
                            id="sexo"
                            name="sexo"
                            value={formData.sexo}
                            onChange={onInputChange}
                            required
                            className={styles.input}
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Hombre">Hombre</option>
                            <option value="Mujer">Mujer</option>
                        </select>
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="submit"
                            className={`${styles.submitButton} ${isEditing ? styles.submitBtnAmber : styles.submitBtnBlue} ${isSubmitting ? styles.submitBtnDisabled : ''}`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <FaSpinner className={styles.spinAnimation} />
                                    {isEditing ? 'Actualizando...' : 'Guardando...'}
                                </>
                            ) : (
                                <>
                                    {isEditing ? <FaSave /> : <FaUserPlus />}
                                    {isEditing ? 'Actualizar' : 'Agregar'}
                                </>
                            )}
                        </button>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className={styles.cancelButton}
                                title="Cancelar"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div >
    );
};
