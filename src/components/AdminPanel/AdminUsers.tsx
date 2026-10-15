import { useEffect, useState } from 'react';
import { AdminRepository } from '../../repositories/AdminRepository';
import { usersSummary } from '../../utils/adminUsers';
import type { PeriodSelection } from './AdminPeriodPicker';
import { AdminTokenGifts } from './AdminTokenGifts';
import { AdminUsersList } from './AdminUsersList';
import './AdminSales.css';
import './AdminUsers.css';

type UsersSection = 'usuarios' | 'regalos';

const SECTIONS: { id: UsersSection; label: string }[] = [
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'regalos', label: 'Regalos de tokens' },
];

/** Con qué se abre la pestaña desde otra: Ventas trae un correo; el Resumen, el periodo de los regalos. */
export interface UsersPreset {
  section: UsersSection;
  search?: string;
  /** Usuario cuya ficha llega abierta (US A5). */
  openUserId?: string;
  giftsSelection?: PeriodSelection;
}

interface AdminUsersProps {
  /** Nulo al entrar desde el menú: sub-pestaña Usuarios, sin buscar. */
  preset: UsersPreset | null;
  /** «Ver sus compras en Ventas» desde la ficha (US A5). */
  onOpenSales: (email: string, createdAt: string) => void;
}

/** Pestaña Usuarios (FEAT-45): antes Balances. Dos sub-pestañas, Usuarios y Regalos de tokens. */
export const AdminUsers = ({ preset, onOpenSales }: AdminUsersProps) => {
  const [section, setSection] = useState<UsersSection>(preset?.section ?? 'usuarios');
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    Promise.all([AdminRepository.getUsersCount('', ''), AdminRepository.getUsersCount('', 'new_this_month')]).then(
      ([total, fresh]) => {
        if (current && total != null && fresh != null) setSummary(usersSummary(total, fresh));
      },
    );
    return () => {
      current = false;
    };
  }, []);

  return (
    <div className="admin-sales">
      <header className="admin-sales__header">
        <div>
          <h2 className="admin-sales__title">Usuarios</h2>
          {summary && <p className="admin-sales__subtitle">{summary}</p>}
        </div>
      </header>

      <div className="admin-users__tabs" role="tablist" aria-label="Secciones">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`admin-users-tab-${s.id}`}
            aria-selected={section === s.id}
            aria-controls="admin-users-panel"
            className={`admin-users__tab${section === s.id ? ' admin-users__tab--active' : ''}`}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div
        id="admin-users-panel"
        role="tabpanel"
        aria-labelledby={`admin-users-tab-${section}`}
        className="admin-users__panel"
      >
        {section === 'usuarios' ? (
          <AdminUsersList
            initialSearch={preset?.search ?? ''}
            initialUserId={preset?.openUserId ?? null}
            onOpenSales={onOpenSales}
          />
        ) : (
          <AdminTokenGifts initialSelection={preset?.giftsSelection} />
        )}
      </div>
    </div>
  );
};
