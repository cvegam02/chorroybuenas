import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaEnvelope, FaLock, FaTimes, FaUserPlus, FaSignInAlt, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import './EmailAuthModal.css';

interface EmailAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'signup';
}

export const EmailAuthModal: React.FC<EmailAuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
    const { t } = useTranslation();
    const { signInWithEmail, signUpWithEmail, resetPasswordForEmail } = useAuth();
    const [isLogin, setIsLogin] = useState(initialMode === 'login');
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
    const [signUpSuccess, setSignUpSuccess] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setIsLogin(initialMode === 'login');
            setIsForgotPassword(false);
            setForgotPasswordSent(false);
            setSignUpSuccess(false);
            setError(null);
            setShowPassword(false);
            setShowConfirmPassword(false);
        }
    }, [isOpen, initialMode]);

    if (!isOpen) return null;

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email.trim()) {
            setError(t('common.auth.errors.invalidEmail'));
            return;
        }
        setIsLoading(true);
        try {
            await resetPasswordForEmail(email.trim());
            setForgotPasswordSent(true);
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.message || t('common.auth.errors.authFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isLogin && password !== confirmPassword) {
            setError(t('common.auth.errors.passwordMismatch'));
            return;
        }

        setIsLoading(true);
        try {
            if (isLogin) {
                await signInWithEmail(email, password);
                onClose();
            } else {
                await signUpWithEmail(email, password, {
                    full_name: fullName.trim() || undefined
                });
                setSignUpSuccess(true);
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            if (err.message?.includes('invalid_credentials')) {
                setError(t('common.auth.errors.authFailed'));
            } else if (err.message?.includes('User already registered')) {
                setError(t('common.auth.errors.emailTaken'));
            } else {
                setError(err.message || t('common.auth.errors.authFailed'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const modalContent = (
        <div className="email-auth-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="email-auth-modal__content">
                <button className="email-auth-modal__close" onClick={onClose}>
                    <FaTimes />
                </button>

                <div className="email-auth-modal__header">
                    <div className="email-auth-modal__icon-circle">
                        {isForgotPassword ? <FaLock /> : (isLogin ? <FaSignInAlt /> : <FaUserPlus />)}
                    </div>
                    <h2>
                        {isForgotPassword
                            ? t('common.auth.forgotPasswordTitle')
                            : (isLogin ? t('common.auth.titleLogin') : t('common.auth.titleSignUp'))}
                    </h2>
                    <p>
                        {isForgotPassword
                            ? t('common.auth.forgotPasswordDescription')
                            : (isLogin ? t('common.auth.welcomeBack') : t('common.auth.joinToSave'))}
                    </p>
                </div>

                {isForgotPassword ? (
                    forgotPasswordSent ? (
                        <div className="email-auth-modal__form">
                            <div className="email-auth-modal__success">{t('common.auth.forgotPasswordSent')}</div>
                            <button
                                type="button"
                                className="email-auth-modal__submit"
                                onClick={() => {
                                    setIsForgotPassword(false);
                                    setForgotPasswordSent(false);
                                }}
                            >
                                {t('common.auth.backToLogin')}
                            </button>
                        </div>
                    ) : (
                        <form className="email-auth-modal__form" onSubmit={handleForgotSubmit}>
                            {error && <div className="email-auth-modal__error">{error}</div>}
                            <div className="email-auth-modal__input-group">
                                <label htmlFor="forgot-email">{t('common.email')}</label>
                                <div className="email-auth-modal__input-wrapper">
                                    <FaEnvelope className="email-auth-modal__input-icon" />
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('common.auth.emailPlaceholder')}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="email-auth-modal__submit" disabled={isLoading}>
                                {isLoading ? t('common.loading') : t('common.auth.sendResetLink')}
                            </button>
                            <button
                                type="button"
                                className="email-auth-modal__toggle"
                                onClick={() => { setIsForgotPassword(false); setError(null); }}
                            >
                                {t('common.auth.backToLogin')}
                            </button>
                        </form>
                    )
                ) : signUpSuccess ? (
                        <div className="email-auth-modal__form">
                            <div className="email-auth-modal__success">{t('common.auth.signUpConfirmationMessage')}</div>
                            <button
                                type="button"
                                className="email-auth-modal__submit"
                                onClick={() => {
                                    setSignUpSuccess(false);
                                    onClose();
                                }}
                            >
                                {t('common.auth.signUpConfirmationButton')}
                            </button>
                        </div>
                    ) : (
                <form className="email-auth-modal__form" onSubmit={handleSubmit}>
                    {error && <div className="email-auth-modal__error">{error}</div>}

                    {!isLogin && (
                        <div className="email-auth-modal__input-group">
                            <label htmlFor="fullName">{t('common.auth.fullName')}</label>
                            <div className="email-auth-modal__input-wrapper">
                                <FaUser className="email-auth-modal__input-icon" />
                                <input
                                    id="fullName"
                                    type="text"
                                    autoComplete="name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder={t('common.auth.fullName')}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}

                    <div className="email-auth-modal__input-group">
                        <label htmlFor="email">{t('common.email')}</label>
                        <div className="email-auth-modal__input-wrapper">
                            <FaEnvelope className="email-auth-modal__input-icon" />
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('common.auth.emailPlaceholder')}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="email-auth-modal__input-group">
                        <label htmlFor="password">{t('common.password')}</label>
                        <div className="email-auth-modal__input-wrapper email-auth-modal__input-wrapper--password">
                            <FaLock className="email-auth-modal__input-icon" />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                disabled={isLoading}
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="email-auth-modal__password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? t('common.auth.hidePassword') : t('common.auth.showPassword')}
                                tabIndex={-1}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    {!isLogin && (
                        <div className="email-auth-modal__input-group">
                            <label htmlFor="confirmPassword">{t('common.auth.confirmPassword')}</label>
                            <div className="email-auth-modal__input-wrapper email-auth-modal__input-wrapper--password">
                                <FaLock className="email-auth-modal__input-icon" />
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="email-auth-modal__password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? t('common.auth.hidePassword') : t('common.auth.showPassword')}
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="email-auth-modal__submit"
                        disabled={isLoading}
                    >
                        {isLoading
                            ? t('common.loading')
                            : (isLogin ? t('common.auth.titleLogin') : t('common.auth.titleSignUp'))}
                    </button>
                </form>
                )}

                {!isForgotPassword && !signUpSuccess && (
                <div className="email-auth-modal__footer">
                    <button
                        className="email-auth-modal__toggle"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                        }}
                    >
                        {isLogin ? t('common.auth.noAccount') : t('common.auth.hasAccount')}
                    </button>
                    {isLogin && (
                        <button
                            type="button"
                            className="email-auth-modal__forgot-link"
                            onClick={() => { setIsForgotPassword(true); setError(null); }}
                        >
                            {t('common.auth.forgotPassword')}
                        </button>
                    )}
                </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
