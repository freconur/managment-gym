import React from 'react';
import { useTheme } from '@/features/context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';
import styles from './ThemeToggle.module.css';

export const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            className={styles.toggle}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
        >
            <div className={`${styles.iconContainer} ${theme === 'dark' ? styles.dark : styles.light}`}>
                {theme === 'light' ? <FaSun className={styles.sun} /> : <FaMoon className={styles.moon} />}
            </div>
        </button>
    );
};
