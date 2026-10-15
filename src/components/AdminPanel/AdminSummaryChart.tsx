import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AIService } from '../../services/AIService';
import { MAX_CHART_DAYS, dailyMoney, type DailyMoney, type DailyTotals } from '../../utils/adminSummary';

// Colores de la paleta (src/index.css); SVG los acepta como variables de CSS.
const REVENUE_COLOR = 'var(--color-primary)';
const AI_COLOR = 'var(--color-ai)';
// Ancho mínimo por día: con muchos días la gráfica se recorre de lado en lugar de apretarse.
const DAY_WIDTH = 28;

const formatPesos = (pesos: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(pesos);

const formatAxisPesos = (pesos: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 })
    .format(pesos);

// Los días son de Hermosillo: se muestran tal cual, sin pasar por la hora del navegador.
const formatDay = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('es-MX', { ...options, timeZone: 'UTC' });
const shortDay = (day: string) => formatDay(day, { day: 'numeric', month: 'short' });
const longDay = (day: string) => formatDay(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

interface SummaryChartProps {
  /** undefined mientras carga; null si el periodo es demasiado largo para dibujarlo. */
  daily: DailyTotals[] | null | undefined;
  usdPerMxn: number;
}

export const SummaryChart = ({ daily, usdPerMxn }: SummaryChartProps) => {
  const series = daily ? dailyMoney(daily, AIService.COST_PER_IMAGE, usdPerMxn) : [];

  return (
    <section className="admin-summary__card admin-summary__chart" aria-labelledby="admin-summary-chart">
      <div className="admin-summary__card-top">
        <h3 id="admin-summary-chart" className="admin-summary__chart-title">Ingresos contra gasto en IA, por día</h3>
        <ul className="admin-summary__legend">
          <li><span className="admin-summary__legend-key admin-summary__legend-key--revenue" aria-hidden="true" />Ingresos</li>
          <li><span className="admin-summary__legend-key admin-summary__legend-key--ai" aria-hidden="true" />Gasto en IA</li>
        </ul>
      </div>
      {daily === undefined ? (
        <p className="admin-summary__detail">Cargando…</p>
      ) : daily === null ? (
        <p className="admin-summary__detail">
          La gráfica muestra hasta {MAX_CHART_DAYS} días. Elige un periodo más corto para verla.
        </p>
      ) : (
        <>
          <div className="admin-summary__chart-scroll">
            <div style={{ minWidth: series.length * DAY_WIDTH, height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={shortDay}
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border-dark)' }}
                    minTickGap={12}
                  />
                  <YAxis
                    tickFormatter={formatAxisPesos}
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-bg-subtle)' }}
                    labelFormatter={(day) => longDay(String(day))}
                    formatter={(value, name) => [formatPesos(Number(value ?? 0)), String(name)]}
                    contentStyle={{ fontSize: '13px', padding: '8px 12px', borderRadius: 8 }}
                  />
                  <Bar dataKey="revenue" name="Ingresos" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="aiCost" name="Gasto en IA" fill={AI_COLOR} radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <DailyTable series={series} />
        </>
      )}
    </section>
  );
};

const DailyTable = ({ series }: { series: DailyMoney[] }) => (
  <details className="admin-summary__table">
    <summary>Ver los números por día</summary>
    <div className="admin-summary__table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Ingresos</th>
            <th scope="col">Gasto en IA</th>
          </tr>
        </thead>
        <tbody>
          {series.map((d) => (
            <tr key={d.day}>
              <th scope="row">{shortDay(d.day)}</th>
              <td>{formatPesos(d.revenue)}</td>
              <td>{formatPesos(d.aiCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </details>
);
