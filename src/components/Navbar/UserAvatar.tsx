import { userInitial } from './navLinks';

interface UserAvatarProps {
  avatarUrl: string | null | undefined;
  name: string;
  email: string;
  size?: 'small' | 'large';
}

/** Foto de la cuenta o, si no tiene, su inicial sobre naranja. Decorativo: el nombre va al lado. */
export const UserAvatar = ({ avatarUrl, name, email, size = 'small' }: UserAvatarProps) => {
  const className = `navbar-avatar navbar-avatar--${size}`;
  return avatarUrl ? (
    <img src={avatarUrl} alt="" className={className} />
  ) : (
    <span className={className} aria-hidden="true">
      {userInitial(name, email)}
    </span>
  );
};
