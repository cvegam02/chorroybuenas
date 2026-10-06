# Profile Editing in Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline profile editing to the Dashboard hero: clickable avatar upload, inline name editing, and a Change Password modal (email-only users).

**Architecture:** All changes are contained within the Dashboard hero section and AuthContext. No new route is needed. `AuthContext` gains `updateProfile` and `uploadAvatar` methods. A new `ChangePasswordModal` component handles password changes for email users. The Navbar already reads from `user.user_metadata` so it updates automatically after profile saves.

**Tech Stack:** React 18, TypeScript, Supabase JS v2, react-icons, react-i18next, CSS modules (project uses plain CSS files per component).

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/contexts/AuthContext.tsx` |
| Modify | `src/components/Dashboard/Dashboard.tsx` |
| Modify | `src/components/Dashboard/Dashboard.css` |
| Create | `src/components/Dashboard/ChangePasswordModal.tsx` |
| Create | `src/components/Dashboard/ChangePasswordModal.css` |
| Modify | `src/locales/es/translation.json` |
| Modify | `src/locales/en/translation.json` |

---

## Task 1 — Add `updateProfile` and `uploadAvatar` to AuthContext

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Add the two new methods to `AuthContextType`**

In `src/contexts/AuthContext.tsx`, update the interface:

```typescript
interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAdmin: boolean;
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
```

- [ ] **Step 2: Implement `updateProfile` inside `AuthProvider`**

Add this function inside `AuthProvider`, before the `return` statement (after `clearRecovery`):

```typescript
const updateProfile = async (updates: { fullName?: string; avatarUrl?: string }): Promise<void> => {
    const data: Record<string, string> = {};
    if (updates.fullName !== undefined) data.full_name = updates.fullName;
    if (updates.avatarUrl !== undefined) data.avatar_url = updates.avatarUrl;
    const { data: result, error } = await supabase.auth.updateUser({ data });
    if (error) throw error;
    if (result.user) setUser(result.user);
};
```

- [ ] **Step 3: Implement `uploadAvatar` inside `AuthProvider`**

Add this function directly after `updateProfile`:

```typescript
const uploadAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('NOT_LOGGED_IN');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `avatars/${user.id}/avatar_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
        .from('card-images')
        .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;
    const { data } = await supabase.storage
        .from('card-images')
        .createSignedUrl(path, 31536000);
    if (!data?.signedUrl) throw new Error('Could not get avatar URL');
    return data.signedUrl;
};
```

- [ ] **Step 4: Expose the new methods in the context value**

In the `AuthContext.Provider` value object, add `updateProfile` and `uploadAvatar`:

```typescript
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
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/cvega/Documentos/Projects/Loteria/chorroybuenas
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: add updateProfile and uploadAvatar to AuthContext"
```

---

## Task 2 — Add translation keys

**Files:**
- Modify: `src/locales/es/translation.json`
- Modify: `src/locales/en/translation.json`

- [ ] **Step 1: Add Spanish keys to `dashboard` section**

In `src/locales/es/translation.json`, inside the `"dashboard"` object, add after `"tokensSpentInLoteria"`:

```json
"changePassword": "Cambiar contraseña",
"editNamePlaceholder": "Tu nombre",
"avatarUploadError": "No se pudo actualizar la foto. Intenta de nuevo.",
"nameUpdateError": "No se pudo guardar el nombre. Intenta de nuevo.",
"changePasswordModal": {
  "title": "Cambiar contraseña",
  "description": "Elige una nueva contraseña para tu cuenta.",
  "newPassword": "Nueva contraseña",
  "confirmPassword": "Confirmar nueva contraseña",
  "save": "Guardar contraseña",
  "success": "Contraseña actualizada correctamente.",
  "successCta": "Listo"
}
```

- [ ] **Step 2: Add English keys to `dashboard` section**

In `src/locales/en/translation.json`, inside the `"dashboard"` object, add after `"tokensSpentInLoteria"`:

```json
"changePassword": "Change password",
"editNamePlaceholder": "Your name",
"avatarUploadError": "Could not update photo. Please try again.",
"nameUpdateError": "Could not save name. Please try again.",
"changePasswordModal": {
  "title": "Change password",
  "description": "Choose a new password for your account.",
  "newPassword": "New password",
  "confirmPassword": "Confirm new password",
  "save": "Save password",
  "success": "Password updated successfully.",
  "successCta": "Done"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/locales/es/translation.json src/locales/en/translation.json
git commit -m "feat: add profile editing translation keys"
```

---

## Task 3 — Create ChangePasswordModal

**Files:**
- Create: `src/components/Dashboard/ChangePasswordModal.tsx`
- Create: `src/components/Dashboard/ChangePasswordModal.css`

- [ ] **Step 1: Create `ChangePasswordModal.tsx`**

```typescript
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

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
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
        <div className="change-password-modal" onClick={e => e.target === e.currentTarget && handleClose()}>
            <div className="change-password-modal__content">
                <button className="change-password-modal__close" onClick={handleClose} aria-label={t('common.close')}>
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
```

- [ ] **Step 2: Create `ChangePasswordModal.css`**

```css
.change-password-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.change-password-modal__content {
  background: var(--color-bg-primary, #fff);
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 400px;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.change-password-modal__close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted, #888);
  font-size: 18px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
}

.change-password-modal__close:hover {
  color: var(--color-text, #333);
  background: var(--color-bg-secondary, #f5f5f5);
}

.change-password-modal__header {
  text-align: center;
  margin-bottom: 24px;
}

.change-password-modal__icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary, #e63946);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin: 0 auto 16px;
}

.change-password-modal__header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--color-text, #1a1a2e);
}

.change-password-modal__header p {
  font-size: 0.9rem;
  color: var(--color-text-muted, #666);
  margin: 0;
}

.change-password-modal__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.change-password-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.change-password-modal__field label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #333);
}

.change-password-modal__input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.change-password-modal__input-icon {
  position: absolute;
  left: 12px;
  color: var(--color-text-muted, #888);
  font-size: 14px;
  pointer-events: none;
}

.change-password-modal__input-wrapper input {
  width: 100%;
  padding: 10px 40px 10px 36px;
  border: 1.5px solid var(--color-border, #ddd);
  border-radius: 8px;
  font-size: 0.95rem;
  background: var(--color-bg-primary, #fff);
  color: var(--color-text, #333);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.change-password-modal__input-wrapper input:focus {
  border-color: var(--color-primary, #e63946);
}

.change-password-modal__eye {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted, #888);
  font-size: 15px;
  padding: 4px;
  display: flex;
  align-items: center;
}

.change-password-modal__eye:hover {
  color: var(--color-text, #333);
}

.change-password-modal__error {
  background: #fff0f0;
  border: 1px solid #ffc0c0;
  color: #c0392b;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.875rem;
}

.change-password-modal__success {
  background: #f0fff4;
  border: 1px solid #a8e6c0;
  color: #1e7e34;
  border-radius: 8px;
  padding: 14px;
  font-size: 0.9rem;
  text-align: center;
}

.change-password-modal__submit {
  padding: 12px;
  background: var(--color-primary, #e63946);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.change-password-modal__submit:hover:not(:disabled) {
  background: var(--color-primary-dark, #c0303a);
}

.change-password-modal__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/cvega/Documentos/Projects/Loteria/chorroybuenas
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard/ChangePasswordModal.tsx src/components/Dashboard/ChangePasswordModal.css
git commit -m "feat: add ChangePasswordModal component"
```

---

## Task 4 — Update Dashboard hero with profile editing

**Files:**
- Modify: `src/components/Dashboard/Dashboard.tsx`

- [ ] **Step 1: Add new imports at the top of `Dashboard.tsx`**

Add to the existing import block:

```typescript
import { FaCamera, FaCheck, FaTimes as FaTimesIcon } from 'react-icons/fa';
import { ChangePasswordModal } from './ChangePasswordModal';
```

Also add `useRef` to the existing React import if not already there:
```typescript
import { useEffect, useState, useRef } from 'react';
```

And destructure `updateProfile` and `uploadAvatar` from `useAuth`:
```typescript
const { user, isLoading: authLoading, updateProfile, uploadAvatar } = useAuth();
```

- [ ] **Step 2: Add new state variables after the existing state declarations**

After the existing `const [isCreatingSet, setIsCreatingSet] = useState(false);` line, add:

```typescript
const [isEditingName, setIsEditingName] = useState(false);
const [nameValue, setNameValue] = useState('');
const [isSavingName, setIsSavingName] = useState(false);
const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
const avatarInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 3: Add handler functions before the `return` statement**

Add these handlers directly above the `return (` line of the component:

```typescript
const handleAvatarClick = () => avatarInputRef.current?.click();

const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setIsUploadingAvatar(true);
  try {
    const avatarUrl = await uploadAvatar(file);
    await updateProfile({ avatarUrl });
  } catch (err) {
    console.error('Error uploading avatar:', err);
    alert(t('dashboard.avatarUploadError'));
  } finally {
    setIsUploadingAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }
};

const handleNameSave = async () => {
  const trimmed = nameValue.trim();
  if (!trimmed) return;
  setIsSavingName(true);
  try {
    await updateProfile({ fullName: trimmed });
    setIsEditingName(false);
  } catch (err) {
    console.error('Error saving name:', err);
    alert(t('dashboard.nameUpdateError'));
  } finally {
    setIsSavingName(false);
  }
};

const handleNameEditStart = () => {
  setNameValue(displayName);
  setIsEditingName(true);
};
```

- [ ] **Step 4: Replace the hero profile section JSX**

Find and replace the existing `<div className="dashboard__hero-profile">` block (lines 150–173 in the original file):

Replace this:
```tsx
<div className="dashboard__hero-profile">
  {user.user_metadata?.avatar_url ? (
    <img
      src={user.user_metadata.avatar_url}
      alt=""
      className="dashboard__hero-avatar"
    />
  ) : (
    <div className="dashboard__hero-avatar-placeholder">
      <FaUser />
    </div>
  )}
  <div className="dashboard__hero-greeting">
    <span className="dashboard__hero-badge">
      <FaStar />
      {t('dashboard.welcomeBack')}
    </span>
    <h1 className="dashboard__hero-title">
      {t('dashboard.welcome', { name: displayName })}
    </h1>
    <p className="dashboard__hero-email">{user.email}</p>
  </div>
</div>
```

With this:
```tsx
<div className="dashboard__hero-profile">
  {/* Clickable avatar */}
  <button
    className="dashboard__hero-avatar-wrapper"
    onClick={handleAvatarClick}
    disabled={isUploadingAvatar}
    aria-label="Cambiar foto de perfil"
    type="button"
  >
    {isUploadingAvatar ? (
      <div className="dashboard__hero-avatar-placeholder">
        <div className="dashboard__spinner dashboard__spinner--small" />
      </div>
    ) : user.user_metadata?.avatar_url ? (
      <img
        src={user.user_metadata.avatar_url}
        alt=""
        className="dashboard__hero-avatar"
      />
    ) : (
      <div className="dashboard__hero-avatar-placeholder">
        <FaUser />
      </div>
    )}
    <div className="dashboard__hero-avatar-overlay" aria-hidden="true">
      <FaCamera />
    </div>
  </button>
  <input
    ref={avatarInputRef}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    style={{ display: 'none' }}
    onChange={handleAvatarChange}
  />

  <div className="dashboard__hero-greeting">
    <span className="dashboard__hero-badge">
      <FaStar />
      {t('dashboard.welcomeBack')}
    </span>

    {/* Inline name editing */}
    {isEditingName ? (
      <div className="dashboard__hero-name-edit">
        <input
          className="dashboard__hero-name-input"
          value={nameValue}
          onChange={e => setNameValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleNameSave();
            if (e.key === 'Escape') setIsEditingName(false);
          }}
          placeholder={t('dashboard.editNamePlaceholder')}
          maxLength={60}
          autoFocus
          disabled={isSavingName}
        />
        <button
          type="button"
          className="dashboard__hero-name-btn dashboard__hero-name-btn--save"
          onClick={handleNameSave}
          disabled={isSavingName}
          aria-label="Guardar nombre"
        >
          <FaCheck />
        </button>
        <button
          type="button"
          className="dashboard__hero-name-btn dashboard__hero-name-btn--cancel"
          onClick={() => setIsEditingName(false)}
          disabled={isSavingName}
          aria-label="Cancelar"
        >
          <FaTimesIcon />
        </button>
      </div>
    ) : (
      <h1 className="dashboard__hero-title">
        {t('dashboard.welcome', { name: displayName })}
        <button
          type="button"
          className="dashboard__hero-name-edit-trigger"
          onClick={handleNameEditStart}
          aria-label="Editar nombre"
        >
          <FaPencilAlt />
        </button>
      </h1>
    )}

    <p className="dashboard__hero-email">{user.email}</p>

    {/* Password change — only for email-authenticated users */}
    {user.app_metadata?.provider === 'email' && (
      <button
        type="button"
        className="dashboard__hero-change-password"
        onClick={() => setIsChangePasswordOpen(true)}
      >
        {t('dashboard.changePassword')}
      </button>
    )}
  </div>
</div>
```

- [ ] **Step 5: Add `ChangePasswordModal` at the bottom of the component's JSX**

Inside the `return (...)` block, just before the closing `</div>` of the main `dashboard` div, add:

```tsx
<ChangePasswordModal
  isOpen={isChangePasswordOpen}
  onClose={() => setIsChangePasswordOpen(false)}
/>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /home/cvega/Documentos/Projects/Loteria/chorroybuenas
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Dashboard/Dashboard.tsx
git commit -m "feat: add inline name edit, avatar upload, and password change to dashboard hero"
```

---

## Task 5 — Add CSS for new profile editing elements

**Files:**
- Modify: `src/components/Dashboard/Dashboard.css`

- [ ] **Step 1: Add new CSS rules at the end of `Dashboard.css`**

Append the following block at the very end of the file:

```css
/* ============================================
   HERO — PROFILE EDITING
   ============================================ */

/* Clickable avatar wrapper */
.dashboard__hero-avatar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  border-radius: 50%;
  flex-shrink: 0;
}

.dashboard__hero-avatar-wrapper:disabled {
  cursor: not-allowed;
}

/* Camera overlay (shown on hover) */
.dashboard__hero-avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.dashboard__hero-avatar-wrapper:hover .dashboard__hero-avatar-overlay,
.dashboard__hero-avatar-wrapper:focus-visible .dashboard__hero-avatar-overlay {
  opacity: 1;
}

/* Inline name editing row */
.dashboard__hero-name-edit {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.dashboard__hero-name-input {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  color: #fff;
  font-size: 1.4rem;
  font-weight: 700;
  padding: 4px 10px;
  outline: none;
  max-width: 280px;
  font-family: inherit;
}

.dashboard__hero-name-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.dashboard__hero-name-input:focus {
  border-color: #fff;
  background: rgba(255, 255, 255, 0.25);
}

.dashboard__hero-name-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 14px;
  transition: background 0.2s;
  flex-shrink: 0;
}

.dashboard__hero-name-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.35);
}

.dashboard__hero-name-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dashboard__hero-name-btn--save {
  background: rgba(40, 167, 69, 0.5);
}

.dashboard__hero-name-btn--save:hover:not(:disabled) {
  background: rgba(40, 167, 69, 0.7);
}

/* Pencil icon trigger next to name */
.dashboard__hero-name-edit-trigger {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  padding: 4px 6px;
  margin-left: 8px;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
  vertical-align: middle;
}

.dashboard__hero-name-edit-trigger:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

/* Change password link */
.dashboard__hero-change-password {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  padding: 0;
  margin-top: 4px;
  text-decoration: underline;
  font-family: inherit;
  transition: color 0.2s;
}

.dashboard__hero-change-password:hover {
  color: #fff;
}

/* Responsive: name input on mobile */
@media (max-width: 600px) {
  .dashboard__hero-name-input {
    font-size: 1.1rem;
    max-width: 200px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Dashboard/Dashboard.css
git commit -m "feat: add CSS for profile editing elements in dashboard hero"
```

---

## Task 6 — Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd /home/cvega/Documentos/Projects/Loteria/chorroybuenas
npm run dev
```

- [ ] **Step 2: Verify avatar upload**
  - Log in with an email account
  - Go to `/dashboard`
  - Hover over the avatar — a camera icon overlay should appear
  - Click the avatar — a file picker should open
  - Select a JPG/PNG — a spinner should appear, then the new photo should display
  - Reload the page — the new avatar should persist

- [ ] **Step 3: Verify inline name editing**
  - Click the pencil icon next to the greeting title
  - The title turns into an editable input
  - Edit the name and press Enter (or click the checkmark)
  - The title updates in place
  - Reload — the updated name persists
  - Press Escape to cancel without saving — works correctly

- [ ] **Step 4: Verify Change Password modal**
  - Log in with an email account (not Google)
  - Go to `/dashboard`
  - A "Cambiar contraseña" link appears below the email
  - Click it — the modal opens with two password fields and eye-toggle icons
  - Enter mismatched passwords — error appears
  - Enter a valid new password — success message appears, modal closes on click
  - Log in with a Google account — the "Cambiar contraseña" link does NOT appear

- [ ] **Step 5: Final commit (if anything was adjusted during verification)**

```bash
git add -p
git commit -m "fix: profile editing adjustments after manual verification"
```
