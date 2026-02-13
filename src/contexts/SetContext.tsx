import React, { createContext, useContext, useState, useEffect } from 'react';
import type { LoteriaSet } from '../repositories/SetRepository';
import { SetRepository } from '../repositories/SetRepository';
import { useAuth } from './AuthContext';

interface SetContextType {
    /** Set activo para cartas y tableros (solo usuario logueado). */
    currentSetId: string | null;
    setCurrentSetId: (id: string | null) => void;
    /** Lista de sets del usuario (vacía si invitado). */
    sets: LoteriaSet[];
    setSets: React.Dispatch<React.SetStateAction<LoteriaSet[]>>;
    /** Recarga los sets desde el servidor (p. ej. tras crear uno nuevo). */
    refreshSets: () => Promise<void>;
}

const SetContext = createContext<SetContextType | undefined>(undefined);

export const SetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading: authLoading } = useAuth();
    const [currentSetId, setCurrentSetId] = useState<string | null>(null);
    const [sets, setSets] = useState<LoteriaSet[]>([]);

    const refreshSets = React.useCallback(async () => {
        if (authLoading) return;
        if (!user) {
            setSets([]);
            setCurrentSetId(null);
            return;
        }
        try {
            const data = await SetRepository.getOrCreateDefaultSet(user.id);
            setSets(data);
            setCurrentSetId((prev) => (prev && data.some((s) => s.id === prev) ? prev : data[0]?.id ?? null));
        } catch (e) {
            console.error('Error loading sets:', e);
        }
    }, [user, authLoading]);

    useEffect(() => {
        refreshSets();
    }, [refreshSets]);

    return (
        <SetContext.Provider value={{ currentSetId, setCurrentSetId, sets, setSets, refreshSets }}>
            {children}
        </SetContext.Provider>
    );
};

export const useSetContext = (): SetContextType => {
    const ctx = useContext(SetContext);
    if (ctx === undefined) throw new Error('useSetContext must be used within SetProvider');
    return ctx;
};
