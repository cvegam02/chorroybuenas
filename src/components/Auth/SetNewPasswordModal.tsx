import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaLock, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import './SetNewPasswordModal.css';

export const SetNewPasswordModal: React.FC = () => {
    const { t } = useTranslation();
    const { recoverySession, updatePassword, clearRecovery } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!recoverySession) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) {
            setError(t('common.auth.errors.passwordMismatch'));
            return;
        }
        if (password.length < 6) {
            setError(t('common.auth.errors.weakPassword'));
            return;
        }
        setIsLoading(true);
        try {
            await updatePassword(password);
            setSuccess(true);
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message || t('common.auth.errors.authFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const modalContent = (
        <div className="set-password-modal" onClick={(e) => e.target === e.currentTarget && clearRecovery()}>
            <div className="set-password-modal__content">
                <button className="set-password-modal__close" onClick={clearRecovery}>
                    <FaTimes />
                </button>
                <div className="set-password-modal__header">
                    <div className="set-password-modal__icon-circle">
                        <FaLock />
                    </div>
                    <h2>{t('common.auth.setNewPasswordTitle')}</h2>
                    <p>{t('common.auth.setNewPasswordDescription')}</p>
                </div>
                {success ? (
                    <div className="set-password-modal__form">
                        <div className="set-password-modal__success">{t('common.auth.passwordUpdated')}</div>
                        <button type="button" className="set-password-modal__submit" onClick={clearRecovery}>
                            {t('common.auth.continue')}
                        </button>
                    </div>
                ) : (
                    <form className="set-password-modal__form" onSubmit={handleSubmit}>
                        {error && <div className="set-password-modal__error">{error}</div>}
                        <div className="set-password-modal__input-group">
                            <label htmlFor="new-password">{t('common.auth.newPassword')}</label>
                            <div className="set-password-modal__input-wrapper">
                                <FaLock className="set-password-modal__input-icon" />
                                <input
                                    id="new-password"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    minLength={6}
                                />
                            </div>
                        </div>
                        <div className="set-password-modal__input-group">
                            <label htmlFor="confirm-new-password">{t('common.auth.confirmPassword')}</label>
                            <div className="set-password-modal__input-wrapper">
                                <FaLock className="set-password-modal__input-icon" />
                                <input
                                    id="confirm-new-password"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    minLength={6}
                                />
                            </div>
                        </div>
                        <button type="submit" className="set-password-modal__submit" disabled={isLoading}>
                            {isLoading ? t('common.loading') : t('common.auth.saveNewPassword')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
