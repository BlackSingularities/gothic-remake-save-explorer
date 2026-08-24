import { Coins, X } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../components/Modal'
import { TabPanelState } from '../../../components/Tabs'
import { useAsyncResource } from '../../../lib/hooks'
import type { TraderDetail, TraderSummary } from '../../../types'

function TraderDetailPanel({ trader, onClose }: { trader: TraderDetail; onClose: () => void }) {
  return (
    <div className="npc-detail-panel">
      <div className="npc-detail-panel__head">
        <h4>{trader.name}</h4>
        <button className="icon-button" onClick={onClose} aria-label="Zamknij"><X size={16} /></button>
      </div>
      <div className="inventory-list inventory-list--compact">
        {trader.items.map((item) => (
          <div key={item.id}>
            <span className="item-count">{item.count}</span>
            <div>
              <strong>{item.name}</strong>
              {item.count !== item.defaultCount && (
                <small>{item.count > item.defaultCount ? `+${item.count - item.defaultCount} od gracza` : `sprzedane: ${item.defaultCount - item.count}`}</small>
              )}
            </div>
          </div>
        ))}
        {!trader.items.length && <div className="inline-empty">Pusty stok</div>}
      </div>
    </div>
  )
}

export function TradersTab({ filePath }: { filePath: string }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const traders = useAsyncResource<TraderSummary[]>(window.gothic ? () => window.gothic!.listTraders(filePath) : null, [filePath])
  const detail = useAsyncResource<TraderDetail>(
    selectedIndex !== null && window.gothic ? () => window.gothic!.traderDetail(filePath, selectedIndex) : null,
    [filePath, selectedIndex],
  )

  return (
    <div className="deep-tab-panel">
      <TabPanelState loading={traders.loading} error={traders.error} empty={!traders.loading && !traders.data?.length} emptyLabel="Brak handlarzy w tym zapisie" />
      {selectedIndex !== null && (
        <Modal onClose={() => setSelectedIndex(null)}>
          <TabPanelState loading={detail.loading} error={detail.error} />
          {detail.data && <TraderDetailPanel trader={detail.data} onClose={() => setSelectedIndex(null)} />}
        </Modal>
      )}
      {traders.data && traders.data.length > 0 && (
        <div className="trader-list">
          {traders.data.map((trader) => (
            <button key={trader.index} className="trader-row" onClick={() => setSelectedIndex(trader.index)}>
              <strong>{trader.name}</strong>
              <span><Coins size={13} /> {trader.ore}</span>
              <span>{trader.itemCount} pozycji</span>
              {trader.traded && <b>HANDLOWANO</b>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
