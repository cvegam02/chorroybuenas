import React, { createContext, useContext, useEffect, useState } from 'react';
import { googleRedirectUrl } from '../utils/authRedirect';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { SyncService } from '../services/SyncService';
import { AVATAR_BUCKET } from '../utils/avatar';
import { EMAIL_ALREADY_REGISTERED_MESSAGE, isEmailAlreadyRegistered } from '../utils/signUpResult';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    /** true si el usuario está en admin_users; false si no está logueado o no es admin */
    isAdmin: boolean;
    /** Set when user landed from password reset link; show "set new password" UI until cleared */
    recoverySession: Session | null;
    /** `returnPath`: ruta del sitio a la que se regresa; sin ella, Mi cuenta. */
    signInWithGoogle: (returnPath?: string) => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, metadata?: { full_name?: string }) => Promise<void>;
    signOut: () => Promise<void>;
    resetPasswordForEmail: (email: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    clearRecovery: () => void;
    /** Actualiza full_name y/o avatar_path en user_metadata. */
    updateProfile: (updates: { fullName?: string; avatarPath?: string }) => Promise<void>;
    /** Sube el avatar a la carpeta del usuario en el bucket privado y devuelve su ruta (no una URL). */
    uploadAvatar: (file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
};

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

    const signInWithGoogle = async (returnPath?: string) => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: googleRedirectUrl(window.location.origin, returnPath)
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
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: metadata?.full_name ? { data: { full_name: metadata.full_name } } : undefined
        });
        if (error) throw error;
        if (isEmailAlreadyRegistered(data.user)) throw new Error(EMAIL_ALREADY_REGISTERED_MESSAGE);
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

    const updateProfile = async (updates: { fullName?: string; avatarPath?: string }): Promise<void> => {
        if (updates.fullName === undefined && updates.avatarPath === undefined) return;
        const data: Record<string, string> = {};
        if (updates.fullName !== undefined) data.full_name = updates.fullName;
        if (updates.avatarPath !== undefined) data.avatar_path = updates.avatarPath;
        const { data: result, error } = await supabase.auth.updateUser({ data });
        if (error) throw error;
        if (result.user) setUser(result.user);
    };

    const uploadAvatar = async (file: File): Promise<string> => {
        if (!user) throw new Error('NOT_LOGGED_IN');
        const ext = ALLOWED_AVATAR_TYPES[file.type];
        if (!ext) throw new Error('INVALID_FILE_TYPE');
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) throw uploadError;
        // Se guarda la ruta; la URL firmada (de vida corta) se genera al mostrar: ver useAvatarUrl.
        return path;
    };

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
            clearRecovery,
            updateProfile,
            uploadAvatar,
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
