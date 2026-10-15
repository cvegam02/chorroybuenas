import type { ReactNode } from 'react';
import { AIService } from '../../services/AIService';
import {
  percentChange,
  summaryMoney,
  type DailyTotals,
  type DashboardPending,
  type DashboardSummary,
} from '../../utils/adminSummary';
import type { SaleKind, SaleStatusFilter } from '../../utils/adminSales';
import type { PeriodSelection } from './AdminPeriodPicker';

/** Pestañas del panel a las que lleva una tarjeta del Resumen. */
export type SummaryTargetTab = 'ventas' | 'uso-ia' | 'balances';

/** Filtro con el que una tarjeta abre Ventas (US A5); el periodo lo pone el Resumen si no viene. */
export interface SummarySalesFilter {
  kind?: '' | SaleKind;
  status?: SaleStatusFilter;
  selection?: PeriodSelection;
}

export type OpenSummaryTab = (tab: SummaryTargetTab, sales?: SummarySalesFilter) => void;

export interface SummaryData {
  totals: DashboardSummary;
  previous: DashboardSummary;
  /** Nulo si el periodo es demasiado largo para la gráfica. */
  daily: DailyTotals[] | null;
  pending: DashboardPending;
  usdPerMxn: number;
}

const formatPesos = (cents: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(cents / 100);

const formatUsd = (usd: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', currencyDisplay: 'code', maximumFractionDigits: 0 })
    .format(usd);

const formatCount = (value: number) => value.toLocaleString('es-MX');
const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`;

/** Cambio contra el periodo anterior: undefined mientras carga, null sin datos previos. */
type Change = number | null | undefined;

const ChangeBadge = ({ change }: { change: Change }) => {
  if (change === undefined) return null;
  if (change === null) return <span className="admin-summary__change">sin datos previos</span>;
  const label = `${change > 0 ? '↑' : change < 0 ? '↓' : '='} ${Math.abs(change)} %`;
  const modifier = change > 0 ? ' admin-summary__change--up' : change < 0 ? ' admin-summary__change--down' : '';
  return (
    <span className={`admin-summary__change${modifier}`} title="vs. periodo anterior">
      {label}
      <span className="admin-summary__sr-only"> vs. periodo anterior</span>
    </span>
  );
};

interface SummaryCardProps {
  label: string;
  value: string;
  detail: string;
  change?: Change;
  onOpen?: () => void;
  highlight?: boolean;
  small?: boolean;
}

const SummaryCard = ({ label, value, detail, change, onOpen, highlight = false, small = false }: SummaryCardProps) => {
  const className = `admin-summary__card${highlight ? ' admin-summary__card--highlight' : ''}${
    onOpen ? ' admin-summary__card--link' : ''
  }`;
  const content = (
    <>
      <span className="admin-summary__card-top">
        <span className="admin-summary__label">{label}</span>
        <ChangeBadge change={change} />
      </span>
      <span
        className={`admin-summary__value${small ? ' admin-summary__value--small' : ''}${
          highlight ? ' admin-summary__value--highlight' : ''
        }`}
      >
        {value}
      </span>
      <span className="admin-summary__detail">{detail}</span>
    </>
  );
  return onOpen ? (
    <button type="button" className={className} onClick={onOpen}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
};

const SummarySection = ({ id, title, loading, children }: { id: string; title: string; loading: boolean; children: ReactNode }) => (
  <section aria-labelledby={id}>
    <h3 id={id} className="admin-summary__section-title">{title}</h3>
    <div className={`admin-summary__grid${loading ? ' admin-summary__grid--loading' : ''}`} aria-busy={loading}>
      {children}
    </div>
  </section>
);

interface SummarySectionsProps {
  data: SummaryData | null;
  loading: boolean;
  onOpenTab: OpenSummaryTab;
}

export const SummarySections = ({ data, loading, onOpenTab }: SummarySectionsProps) => {
  const ready = loading ? null : data;
  const t = ready?.totals ?? null;
  const p = ready?.previous ?? null;
  const money = ready ? summaryMoney(ready.totals, AIService.COST_PER_IMAGE, ready.usdPerMxn) : null;
  const previousMoney = ready ? summaryMoney(ready.previous, AIService.COST_PER_IMAGE, ready.usdPerMxn) : null;
  const value = (text: string) => (t ? text : '…');
  const change = (current: number | null | undefined, previous: number | null | undefined): Change =>
    ready ? (current == null || previous == null ? null : percentChange(current, previous)) : undefined;
  const open = (tab: SummaryTargetTab, sales?: SummarySalesFilter) => () => onOpenTab(tab, sales);

  return (
    <>
      <SummarySection id="admin-summary-money" title="Dinero" loading={loading}>
        <SummaryCard
          label="Ingresos"
          value={value(money ? formatPesos(money.revenueCents) : '')}
          detail={t
            ? `Tokens ${formatPesos(t.tokensRevenueCents)} · Temáticas ${formatPesos(t.seasonalRevenueCents)}`
            : 'Tokens y temáticas'}
          change={change(money?.revenueCents, previousMoney?.revenueCents)}
          onOpen={open('ventas', { status: 'approved' })}
        />
        <SummaryCard
          label="Gasto en IA"
          value={value(money?.aiCostCents != null ? formatPesos(money.aiCostCents) : '—')}
          detail={t
            ? `${plural(t.aiImages, 'imagen', 'imágenes')} · ≈ ${formatUsd(t.aiImages * AIService.COST_PER_IMAGE)}`
            : 'Imágenes transformadas'}
          change={change(t?.aiImages, p?.aiImages)}
          onOpen={open('uso-ia')}
        />
        <SummaryCard
          label="Ganancia"
          highlight
          value={value(money?.profitCents != null ? formatPesos(money.profitCents) : '—')}
          detail="Ingresos − gasto en IA. No descuenta la comisión de Mercado Pago."
          change={change(money?.profitCents, previousMoney?.profitCents)}
        />
      </SummarySection>

      <SummarySection id="admin-summary-people" title="Gente" loading={loading}>
        <SummaryCard
          label="Usuarios nuevos"
          small
          value={value(t ? formatCount(t.newUsers) : '')}
          detail="Cuentas creadas en el periodo"
          change={change(t?.newUsers, p?.newUsers)}
          onOpen={open('balances')}
        />
        <SummaryCard
          label="Compraron"
          small
          value={value(t ? formatCount(t.buyers) : '')}
          detail={t ? `${formatCount(t.firstTimeBuyers)} por primera vez` : 'Personas con una compra aprobada'}
          change={change(t?.buyers, p?.buyers)}
          onOpen={open('ventas', { status: 'approved' })}
        />
        <SummaryCard
          label="Usaron la IA"
          small
          value={value(t ? formatCount(t.aiUsers) : '')}
          detail="Transformaron al menos una foto"
          change={change(t?.aiUsers, p?.aiUsers)}
          onOpen={open('uso-ia')}
        />
      </SummarySection>

      <SummarySection id="admin-summary-sales" title="Ventas" loading={loading}>
        <SummaryCard
          label="Compras de tokens"
          small
          value={value(t ? formatCount(t.tokenPurchases) : '')}
          detail={t ? plural(t.tokensSold, 'token vendido', 'tokens vendidos') : 'Tokens vendidos'}
          change={change(t?.tokenPurchases, p?.tokenPurchases)}
          onOpen={open('ventas', { kind: 'tokens', status: 'approved' })}
        />
        <SummaryCard
          label="Loterías temáticas"
          small
          value={value(t ? formatCount(t.seasonalSales) : '')}
          detail={t ? `${formatPesos(t.seasonalRevenueCents)} en ventas` : 'Ventas del periodo'}
          change={change(t?.seasonalSales, p?.seasonalSales)}
          onOpen={open('ventas', { kind: 'seasonal', status: 'approved' })}
        />
        <TopSellersCard totals={t} />
      </SummarySection>
    </>
  );
};

const TopSellersCard = ({ totals }: { totals: DashboardSummary | null }) => {
  const rows = totals
    ? [
        totals.topPack && {
          name: `Pack de ${formatCount(totals.topPack.baseTokens)} tokens`,
          sales: totals.topPack.sales,
        },
        totals.topLoteria && { name: totals.topLoteria.name, sales: totals.topLoteria.sales },
      ].filter((row): row is { name: string; sales: number } => Boolean(row))
    : [];

  return (
    <div className="admin-summary__card">
      <span className="admin-summary__label">Lo más vendido</span>
      {!totals ? (
        <span className="admin-summary__detail">…</span>
      ) : rows.length === 0 ? (
        <span className="admin-summary__detail">No hubo ventas en este periodo.</span>
      ) : (
        <ul className="admin-summary__top-list">
          {rows.map((row) => (
            <li key={row.name} className="admin-summary__top-item">
              <strong>{row.name}</strong>
              <span className="admin-summary__detail">{plural(row.sales, 'venta', 'ventas')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
