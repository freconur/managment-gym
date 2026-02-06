import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase/firebase.config";
import { useRouter } from "next/router";
import { useAuth } from "@/features/context/AuthContext";
import { doc, getDoc, setDoc, getCountFromServer, collection } from "firebase/firestore";
import { FcGoogle } from "react-icons/fc";
import { FaDumbbell, FaExclamationCircle } from "react-icons/fa";
import styles from "@/styles/Login.module.css";
import Head from "next/head";

const Login = () => {

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { user } = useAuth();

    // Redirect if already logged in
    if (user) {
        router.push("/");
        return null;
    }

    const handleGoogleLogin = async () => {
        setError("");
        setIsLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user document exists
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnapshot = await getDoc(userDocRef);

            if (!userDocSnapshot.exists()) {
                // Bootstrap Logic: Check if there are ANY users in the system
                const usersCollection = collection(db, "users");
                const snapshot = await getCountFromServer(usersCollection);
                const userCount = snapshot.data().count;

                // First user ever -> Admin & Active. Others -> Staff & Inactive.
                const isFirstUser = userCount === 0;

                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName,
                    role: isFirstUser ? "admin" : "staff",
                    isActive: isFirstUser, // True if first user, false otherwise
                    createdAt: new Date().toISOString()
                });
            }

            // AuthContext will pick up the changes/login status automatically
            router.push("/");

        } catch (err: any) {
            console.error(err);
            setError("Error al iniciar sesión con Google.");
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className={styles.container}>
            <Head>
                <title>Iniciar Sesión - Management Gym</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logoContainer}>
                        <FaDumbbell className={styles.logoIcon} />
                    </div>
                    <h2 className={styles.title}>
                        Bienvenido
                    </h2>
                    <p className={styles.subtitle}>
                        Administración de Gimnasio
                    </p>
                </div>

                {error && (
                    <div className={styles.errorMessage}>
                        <FaExclamationCircle />
                        {error}
                    </div>
                )}

                <div className={styles.formSection}>
                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className={styles.googleButton}
                        disabled={isLoading}
                    >
                        <FcGoogle size={24} />
                        Continuar con Google
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
