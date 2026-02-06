import { useAuth } from "@/features/context/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect } from "react";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                // Not logged in -> Redirect to login
                router.push("/login");
            } else if ((!userProfile || !userProfile.isActive) && router.pathname !== "/unauthorized") {
                // Logged in but not active (or profile missing) -> Redirect to unauthorized
                router.push("/unauthorized");
            }
            // If user is active (isActive: true), do nothing, let content render
        }
    }, [user, userProfile, loading, router]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#f3f4f6'
            }}>
                <p>Cargando...</p>
            </div>
        );
    }

    // If not logged in or not active, we render nothing while redirecting (or effectively nothing)
    if (!user) return null;
    if (!userProfile || !userProfile.isActive) return null;

    return <>{children}</>;
};

export default ProtectedRoute;
