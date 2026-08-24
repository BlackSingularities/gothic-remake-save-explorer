export interface ChartSeries {
  id: string
  label: string
  color: string
  points: Array<{ x: number; y: number }>
}

export function MultiLineChart({ series, height = 200 }: { series: ChartSeries[]; height?: number }) {
  const allPoints = series.flatMap((s) => s.points)
  if (!allPoints.length) return <div className="inline-empty">Brak danych do wykresu</div>

  const maxY = Math.max(1, ...allPoints.map((p) => p.y))
  const minY = Math.min(0, ...allPoints.map((p) => p.y))
  const xs = allPoints.map((p) => p.x)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const xSpan = Math.max(1, xMax - xMin)
  const ySpan = Math.max(1, maxY - minY)
  const scaleX = (x: number) => 4 + ((x - xMin) / xSpan) * 92
  const scaleY = (y: number) => 92 - ((y - minY) / ySpan) * 80

  return (
    <div className="line-chart">
      <svg viewBox="0 0 100 96" preserveAspectRatio="none" style={{ height }} role="img" aria-label="Wykres porównawczy">
        {[16, 40, 64, 88].map((y) => <line key={y} x1="4" x2="96" y1={y} y2={y} className="chart-grid" />)}
        {series.map((s) => {
          const points = [...s.points].sort((a, b) => a.x - b.x)
          if (points.length === 1) {
            const cx = scaleX(points[0].x)
            const cy = scaleY(points[0].y)
            return <circle key={s.id} cx={cx} cy={cy} r="1.6" style={{ fill: s.color }} />
          }
          const line = points.map((p) => `${scaleX(p.x)},${scaleY(p.y)}`).join(' ')
          return <polyline key={s.id} points={line} className="chart-line" style={{ stroke: s.color }} vectorEffect="non-scaling-stroke" />
        })}
      </svg>
      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s) => (
            <span key={s.id}><i style={{ background: s.color }} />{s.label}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function BarChart({ bars, height = 170 }: { bars: Array<{ label: string; value: number; color?: string }>; height?: number }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value))
  if (!bars.length) return <div className="inline-empty">Brak danych do wykresu</div>
  return (
    <div className="bar-chart" style={{ height }}>
      {bars.map((bar) => (
        <div className="bar-chart__col" key={bar.label}>
          <div className="bar-chart__track">
            <div className="bar-chart__fill" style={{ height: `${Math.round((bar.value / max) * 100)}%`, background: bar.color }} />
          </div>
          <b>{bar.value}</b>
          <span>{bar.label}</span>
        </div>
      ))}
    </div>
  )
}

export function RadarChart({ axes, size = 230 }: { axes: Array<{ label: string; value: number; max: number }>; size?: number }) {
  if (axes.length < 3) return <BarChart bars={axes.map((axis) => ({ label: axis.label, value: axis.value }))} />
  const center = 50
  const radius = 36
  const angleStep = (Math.PI * 2) / axes.length
  const pointAt = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + index * angleStep
    return { x: center + Math.cos(angle) * radius * ratio, y: center + Math.sin(angle) * radius * ratio }
  }
  const shapePoints = axes.map((axis, i) => {
    const ratio = axis.max > 0 ? Math.min(1, axis.value / axis.max) : 0
    const p = pointAt(i, ratio)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} role="img" aria-label="Wykres radarowy">
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <polygon key={ratio} points={axes.map((_, i) => { const p = pointAt(i, ratio); return `${p.x},${p.y}` }).join(' ')} className="radar-ring" />
      ))}
      {axes.map((axis, i) => {
        const p = pointAt(i, 1)
        return <line key={axis.label} x1={center} y1={center} x2={p.x} y2={p.y} className="radar-axis" />
      })}
      <polygon points={shapePoints} className="radar-shape" />
      {axes.map((axis, i) => {
        const p = pointAt(i, 1.24)
        return <text key={axis.label} x={p.x} y={p.y} className="radar-label" textAnchor="middle">{axis.label}</text>
      })}
    </svg>
  )
}
