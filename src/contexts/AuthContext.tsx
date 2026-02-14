import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { SyncService } from '../services/SyncService';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    /** true si el usuario está en admin_users; false si no está logueado o no es admin */
    isAdmin: boolean;
    /** Set when user landed from password reset link; show "set new password" UI until cleared */
    recoverySession: Session | null;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, metadata?: { full_name?: string }) => Promise<void>;
    signOut: () => Promise<void>;
    resetPasswordForEmail: (email: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    clearRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [recoverySession, setRecoverySession] = useState<Session | null>(null);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setIsLoading(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (event === 'PASSWORD_RECOVERY' && session) {
                setRecoverySession(session);
            }
            if (event === 'SIGNED_IN' && session?.user) {
                SyncService.syncLocalDataToCloud(session.user.id);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) {
            setIsAdmin(false);
            return;
        }
        const checkAdmin = async () => {
            const { data, error } = await supabase.rpc('is_admin');
            if (!error && data === true) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, [user]);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        });
        if (error) throw error;
    };

    const signInWithEmail = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
    };

    const signUpWithEmail = async (email: string, password: string, metadata?: { full_name?: string }) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: metadata?.full_name ? { data: { full_name: metadata.full_name } } : undefined
        });
        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setRecoverySession(null);
    };

    const resetPasswordForEmail = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/`
        });
        if (error) throw error;
    };

    const updatePassword = async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        /* Recovery is cleared when user dismisses the success state in SetNewPasswordModal */
    };

    const clearRecovery = () => setRecoverySession(null);

    return (
        <AuthContext.Provider value={{
            user,
            session,
            isLoading,
            isAdmin,
            recoverySession,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            resetPasswordForEmail,
            updatePassword,
            clearRecovery
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
