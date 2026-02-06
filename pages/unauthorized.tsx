import React from "react";
import { useAuth } from "@/features/context/AuthContext";
import { useRouter } from "next/router";

const Unauthorized = () => {
    const { logout, userProfile } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push("/login"); // Redirect to login after logout
    };

    React.useEffect(() => {
        if (userProfile?.isActive) {
            router.push("/");
        }
    }, [userProfile, router]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f3f4f6',
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                maxWidth: '500px',
                width: '100%',
                textAlign: 'center'
            }}>
                <h1 style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                    Acceso Restringido
                </h1>
                <p style={{ color: '#4b5563', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    Hola <strong>{userProfile?.name || userProfile?.email}</strong>.
                    Tu cuenta ha sido creada, pero aún no tienes persmisos para acceder al sistema.
                    <br /><br />
                    Por favor, contacta al administrador para que active tu cuenta.
                </p>
                <button
                    onClick={handleLogout}
                    style={{
                        backgroundColor: '#4b5563',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '1rem',
                        cursor: 'pointer'
                    }}
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
};

export default Unauthorized;
