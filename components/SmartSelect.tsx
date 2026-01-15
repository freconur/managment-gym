import React, { useState, useEffect, useRef } from 'react';
import styles from './SmartSelect.module.css';

interface Option {
    id: string;
    nombre: string;
}

interface SmartSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    name?: string;
    required?: boolean;
    className?: string; // To inherit input styles
}

export const SmartSelect: React.FC<SmartSelectProps> = ({
    options,
    value,
    onChange,
    placeholder,
    name,
    required,
    className
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState<Option[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync search term with incoming value if it matches an option
    useEffect(() => {
        if (value) {
            // If value is set externally (e.g. edit mode), display it
            setSearchTerm(value);
        } else {
            setSearchTerm('');
        }
    }, [value]);

    useEffect(() => {
        const normalize = (str: string) =>
            str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const query = normalize(searchTerm);
        const queryWords = query.split(/\s+/).filter(Boolean);

        const filtered = options.filter(opt => {
            const normalizedOpt = normalize(opt.nombre);
            // "Smart" logic: every word in query must exist in option
            return queryWords.every(word => normalizedOpt.includes(word));
        });

        // Limit results to avoid massive lists
        setFilteredOptions(filtered.slice(0, 10));
    }, [searchTerm, options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // If user typed something but didn't select, we might want to revert or accept?
                // Standard combobox behavior: if valid option not picked, maybe clear or keep text?
                // For now, let's keep text but if it's not a valid option, user must handle "value" logic.
                // Since parent manages 'value', we just close. 
                // However, to ensure consistency, if the typed text perfectly matches an option, we trigger select.
                // If not, we might leave it or reset to 'value'. 
                // Let's reset search term to 'value' if closed without selection to avoid data mismatch.
                if (value) setSearchTerm(value);
                else setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value]);

    const handleSelect = (option: Option) => {
        setSearchTerm(option.nombre);
        onChange(option.nombre);
        setIsOpen(false);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
        // On focus, if we have a value, maybe clear it to allow search? 
        // Or select all text? Native behavior is best left alone usually, but selecting all helps.
        // For this requirement, "allow filter" implies typing.
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
        // If user clears input, treat as clearing value
        if (e.target.value === '') {
            onChange('');
        }
        // Note: We don't call onChange with partial text to prevent setting invalid IDs/Names 
        // unless free-text is allowed. Requirement implies "selecting" from companies.
        // So we only call onChange when an option is clicked (or perfect match).
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <input
                type="text"
                name={name}
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder={placeholder}
                required={required}
                className={className}
                autoComplete="off"
            />
            {isOpen && filteredOptions.length > 0 && (
                <ul className={styles.optionsList}>
                    {filteredOptions.length === 0 ? (
                        <li className={styles.noResults}>No se encontraron resultados</li>
                    ) : (
                        filteredOptions.map(opt => (
                            <li
                                key={opt.id}
                                onClick={() => handleSelect(opt)}
                                className={styles.optionItem}
                            >
                                {opt.nombre}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};
