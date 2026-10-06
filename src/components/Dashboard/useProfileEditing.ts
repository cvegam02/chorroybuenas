import { useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { logger } from '../../utils/logger';

interface UseProfileEditingDeps {
  updateProfile: (updates: { fullName?: string; avatarPath?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  t: TFunction;
}

/** Edición del nombre y del avatar del usuario en el Dashboard. */
export function useProfileEditing({ updateProfile, uploadAvatar, t }: UseProfileEditingDeps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => avatarInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const avatarPath = await uploadAvatar(file);
      await updateProfile({ avatarPath });
    } catch (err) {
      logger.error('Error uploading avatar:', err);
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
      logger.error('Error saving name:', err);
      alert(t('dashboard.nameUpdateError'));
    } finally {
      setIsSavingName(false);
    }
  };

  const startNameEdit = (currentName: string) => {
    setNameValue(currentName);
    setIsEditingName(true);
  };

  return {
    isEditingName,
    setIsEditingName,
    nameValue,
    setNameValue,
    isSavingName,
    isUploadingAvatar,
    avatarInputRef,
    handleAvatarClick,
    handleAvatarChange,
    handleNameSave,
    startNameEdit,
  };
}
