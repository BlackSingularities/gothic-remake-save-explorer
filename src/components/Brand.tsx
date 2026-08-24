import { Flame } from 'lucide-react'

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <div className={`colony-mark${small ? ' colony-mark--small' : ''}`} aria-hidden="true">
      <span className="colony-mark__ring" />
      <Flame size={small ? 17 : 23} strokeWidth={1.6} />
    </div>
  )
}

export function StatusDot({ active = true }: { active?: boolean }) {
  return (
    <span className={`status-dot${active ? ' status-dot--active' : ''}`}>
      <span />
    </span>
  )
}
