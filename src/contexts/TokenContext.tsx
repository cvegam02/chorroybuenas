import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { TokenRepository } from '../repositories/TokenRepository';

interface TokenContextType {
    /** Balance de tokens del usuario (null si no cargado o invitado). */
    balance: number | null;
    /** Vuelve a cargar el balance desde el servidor (p. ej. tras gastar tokens). */
    refreshBalance: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [balance, setBalance] = useState<number | null>(null);

    const refreshBalance = useCallback(async () => {
        if (!user) {
            setBalance(null);
            return;
        }
        try {
            const b = await TokenRepository.getBalance(user.id);
            setBalance(b);
        } catch (e) {
            console.error('Error fetching token balance:', e);
        }
    }, [user]);

    useEffect(() => {
        refreshBalance();
    }, [refreshBalance]);

    return (
        <TokenContext.Provider value={{ balance, refreshBalance }}>
            {children}
        </TokenContext.Provider>
    );
};

export const useTokenBalance = (): TokenContextType => {
    const ctx = useContext(TokenContext);
    if (ctx === undefined) throw new Error('useTokenBalance must be used within a TokenProvider');
    return ctx;
};
