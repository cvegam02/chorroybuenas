import { FaChevronRight } from 'react-icons/fa';
import type { AdminUserRow } from '../../repositories/AdminRepository';
import { lastActivityLabel, paidLabel, signupDate, userDisplayName, userInitial } from '../../utils/adminUsers';

interface AdminUsersTableProps {
  rows: AdminUserRow[];
  selectedId: string | null;
  /** Abre la ficha del usuario (US A2). */
  onSelect: (user: AdminUserRow) => void;
}

/** Tabla de la pestaña Usuarios: usuario, alta, saldo, lo comprado y última actividad (FEAT-45, decisión 6). */
export const AdminUsersTable = ({ rows, selectedId, onSelect }: AdminUsersTableProps) => (
  <div className="admin-sales__table-box">
    <table className="admin-sales__table">
      <thead>
        <tr>
          <th scope="col">Usuario</th>
          <th scope="col">Se registró</th>
          <th scope="col">Saldo</th>
          <th scope="col">Ha comprado</th>
          <th scope="col">Última actividad</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((user) => (
          <tr
            key={user.user_id}
            className={`admin-sales__row${selectedId === user.user_id ? ' admin-sales__row--selected' : ''}`}
            onClick={() => onSelect(user)}
          >
            <td data-label="Usuario">
              <span className="admin-users__person">
                <span className="admin-users__avatar" aria-hidden="true">
                  {userInitial(user)}
                </span>
                <span>
                  <span className="admin-sales__main">{userDisplayName(user)}</span>
                  {user.full_name && user.email && <span className="admin-sales__muted">{user.email}</span>}
                </span>
              </span>
            </td>
            <td data-label="Se registró">{signupDate(user.created_at)}</td>
            <td data-label="Saldo">
              {user.balance} {user.balance === 1 ? 'token' : 'tokens'}
            </td>
            <td data-label="Ha comprado">{paidLabel(user.paid_cents)}</td>
            <td data-label="Última actividad">
              <span className="admin-sales__state">
                <span className="admin-sales__muted">{lastActivityLabel(user.last_activity_at)}</span>
                <button
                  type="button"
                  className="admin-sales__open"
                  aria-label={`Ver la ficha de ${userDisplayName(user)}`}
                  aria-expanded={selectedId === user.user_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(user);
                  }}
                >
                  <FaChevronRight aria-hidden="true" />
                </button>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
