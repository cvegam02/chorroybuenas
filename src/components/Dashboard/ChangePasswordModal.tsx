import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaLock, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
    const { t } = useTranslation();
    const { updatePassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setPassword('');
        setConfirmPassword('');
        setError(null);
        setSuccess(false);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password.length < 6) {
            setError(t('common.auth.errors.weakPassword'));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('common.auth.errors.passwordMismatch'));
            return;
        }
        setIsLoading(true);
        try {
            await updatePassword(password);
            setSuccess(true);
            setPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('common.auth.errors.authFailed');
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const content = (
        <div
            className="change-password-modal"
            onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="change-password-modal__content">
                <button
                    className="change-password-modal__close"
                    onClick={handleClose}
                    aria-label={t('common.close')}
                    type="button"
                >
                    <FaTimes />
                </button>
                <div className="change-password-modal__header">
                    <div className="change-password-modal__icon-circle">
                        <FaLock />
                    </div>
                    <h2>{t('dashboard.changePasswordModal.title')}</h2>
                    <p>{t('dashboard.changePasswordModal.description')}</p>
                </div>

                {success ? (
                    <div className="change-password-modal__body">
                        <div className="change-password-modal__success">
                            {t('dashboard.changePasswordModal.success')}
                        </div>
                        <button type="button" className="change-password-modal__submit" onClick={handleClose}>
                            {t('dashboard.changePasswordModal.successCta')}
                        </button>
                    </div>
                ) : (
                    <form className="change-password-modal__body" onSubmit={handleSubmit}>
                        {error && <div className="change-password-modal__error">{error}</div>}
                        <div className="change-password-modal__field">
                            <label htmlFor="cp-new-password">{t('dashboard.changePasswordModal.newPassword')}</label>
                            <div className="change-password-modal__input-wrapper">
                                <FaLock className="change-password-modal__input-icon" />
                                <input
                                    id="cp-new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    minLength={6}
                                    required
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="change-password-modal__eye"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? t('common.auth.hidePassword') : t('common.auth.showPassword')}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>
                        <div className="change-password-modal__field">
                            <label htmlFor="cp-confirm-password">{t('dashboard.changePasswordModal.confirmPassword')}</label>
                            <div className="change-password-modal__input-wrapper">
                                <FaLock className="change-password-modal__input-icon" />
                                <input
                                    id="cp-confirm-password"
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    minLength={6}
                                    required
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="change-password-modal__eye"
                                    onClick={() => setShowConfirm(v => !v)}
                                    aria-label={showConfirm ? t('common.auth.hidePassword') : t('common.auth.showPassword')}
                                >
                                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="change-password-modal__submit" disabled={isLoading}>
                            {isLoading ? t('common.loading') : t('dashboard.changePasswordModal.save')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
};
