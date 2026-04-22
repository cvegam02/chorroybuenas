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
    /** Updates full_name and/or avatar_url in user_metadata. */
    updateProfile: (updates: { fullName?: string; avatarUrl?: string }) => Promise<void>;
    /** Uploads a File to the card-images bucket under avatars/{userId}/ and returns a 1-year signed URL. */
    uploadAvatar: (file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
};

const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

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

    const updateProfile = async (updates: { fullName?: string; avatarUrl?: string }): Promise<void> => {
        if (updates.fullName === undefined && updates.avatarUrl === undefined) return;
        const data: Record<string, string> = {};
        if (updates.fullName !== undefined) data.full_name = updates.fullName;
        if (updates.avatarUrl !== undefined) data.avatar_url = updates.avatarUrl;
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
            .from('card-images')
            .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) throw uploadError;
        const { data } = await supabase.storage
            .from('card-images')
            .createSignedUrl(path, ONE_YEAR_IN_SECONDS);
        if (!data?.signedUrl) throw new Error('Could not get avatar URL');
        return data.signedUrl;
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
