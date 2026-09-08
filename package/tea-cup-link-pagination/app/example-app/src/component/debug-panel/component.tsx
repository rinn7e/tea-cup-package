import { cn } from '@rinn7e/tea-cup-prelude'
import {
  Activity,
  Bell,
  Database,
  Layers,
  Radio,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { type JSX, memo } from 'react'

import { type Props } from './type'

export const DebugPanelComponent = ({
  model,
  loadedItemCount,
  activeRoomName,
  activeRoomUnreadCount,
  totalUnreadCount,
  dispatch,
  onSimulateSse,
  onSimulateSseOtherRoom,
  onClearCacheAndReset,
  onHardReload,
  onSimulateRepointBug,
}: Props): JSX.Element => {
  return (
    <aside
      data-component='DebugPanelComponent'
      className='flex h-full w-72 shrink-0 flex-col gap-3 text-slate-200 select-none'
    >
      {/* Controls Card - Dark Scheme */}
      <div className='flex flex-col gap-3 rounded-2xl border border-slate-800/90 bg-slate-900 p-4 shadow-md'>
        {/* Section Title */}
        <div className='flex items-center justify-between border-b border-slate-800 pb-2.5'>
          <span className='flex items-center gap-1.5 text-xs font-bold tracking-tight text-slate-100'>
            <Sliders className='size-3.5 text-indigo-400' />
            Simulation Controls
          </span>
          <span
            data-testid='loaded-count-badge'
            className='rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300'
          >
            {loadedItemCount} chats
          </span>
        </div>

        {/* Network Toggle Button */}
        <div className='space-y-1'>
          <div className='text-[11px] font-semibold text-slate-400'>
            Network Status
          </div>
          <button
            type='button'
            data-testid='network-toggle-btn'
            onClick={() => dispatch({ _tag: 'ToggleNetworkOnline' })}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl border py-1.5 text-xs font-semibold transition-all',
              model.networkOnline
                ? 'border-emerald-800/80 bg-emerald-950/60 text-emerald-300 shadow-2xs hover:bg-emerald-900/50'
                : 'border-rose-800/80 bg-rose-950/60 text-rose-300 hover:bg-rose-900/50',
            )}
          >
            {model.networkOnline ? (
              <>
                <Wifi className='size-3.5 text-emerald-400' />
                <span>Online (Simulated)</span>
              </>
            ) : (
              <>
                <WifiOff className='size-3.5 text-rose-400' />
                <span>Offline Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Latency Selector */}
        <div className='space-y-1'>
          <div className='flex items-center justify-between text-[11px] font-semibold text-slate-400'>
            <span>API Delay Latency</span>
            <span className='font-mono font-bold text-indigo-400'>
              {model.networkLatencyMs}ms
            </span>
          </div>
          <div className='grid grid-cols-4 gap-1.5'>
            {[0, 80, 400, 1200].map((ms) => (
              <button
                key={ms}
                type='button'
                data-testid={`latency-btn-${ms}`}
                onClick={() => dispatch({ _tag: 'SetNetworkLatency', ms })}
                className={cn(
                  'rounded-lg border py-1 font-mono text-[11px] transition-all',
                  model.networkLatencyMs === ms
                    ? 'border-indigo-500 bg-indigo-600/30 font-bold text-indigo-200 shadow-2xs'
                    : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200',
                )}
              >
                {ms === 0 ? '0' : ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
              </button>
            ))}
          </div>
        </div>

        {/* Live SSE Dispatch Actions */}
        <div className='space-y-1.5 border-t border-slate-800 pt-2'>
          <div className='text-[11px] font-semibold text-slate-400'>
            Real-time SSE Stream
          </div>
          <button
            type='button'
            data-testid='simulate-sse-btn'
            onClick={onSimulateSse}
            className='flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950 to-purple-950 py-1.5 text-xs font-bold text-indigo-200 shadow-2xs transition-all hover:from-indigo-900 hover:to-purple-900'
          >
            <Sparkles className='size-3.5 text-indigo-400' />
            <span>
              {activeRoomName
                ? `Simulate SSE in #${activeRoomName}`
                : 'Simulate SSE (General)'}
            </span>
          </button>

          <button
            type='button'
            data-testid='simulate-sse-other-room-btn'
            onClick={onSimulateSseOtherRoom}
            className='flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 py-1.5 text-xs font-semibold text-slate-300 shadow-2xs transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100'
          >
            <Bell className='size-3.5 text-amber-400' />
            <span>Broadcast to Other Room 🔔</span>
          </button>
        </div>

        {/* Cache & First Visit Simulation Actions */}
        <div className='space-y-1.5 border-t border-slate-800 pt-2'>
          <div className='flex items-center justify-between text-[11px] font-semibold text-slate-400'>
            <span className='flex items-center gap-1'>
              <Database className='size-3 text-indigo-400' />
              Cache & Session
            </span>
          </div>

          <button
            type='button'
            data-testid='clear-cache-btn'
            onClick={onClearCacheAndReset}
            className='flex w-full items-center justify-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/50 py-1.5 text-xs font-bold text-rose-300 shadow-2xs transition-all hover:border-rose-700 hover:bg-rose-900/60'
            title='Clear all in-memory cache, reset database, and simulate first visit'
          >
            <RotateCcw className='size-3.5 text-rose-400' />
            <span>Clear Cache & Reset (First Visit)</span>
          </button>

          <button
            type='button'
            data-testid='reload-room-btn'
            onClick={onHardReload}
            className='flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 py-1.5 text-xs font-semibold text-slate-300 shadow-2xs transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100'
            title='Invalidate cache for active room and refetch'
          >
            <RefreshCw className='size-3.5 text-slate-400' />
            <span>
              {activeRoomName
                ? `Hard Reload #${activeRoomName}`
                : 'Hard Reload'}
            </span>
          </button>

          {onSimulateRepointBug && (
            <button
              type='button'
              data-testid='reproduce-des752-btn'
              onClick={onSimulateRepointBug}
              className='flex w-full items-center justify-center gap-2 rounded-xl border border-amber-800/80 bg-amber-950/60 py-1.5 text-xs font-bold text-amber-300 shadow-2xs transition-all hover:border-amber-700 hover:bg-amber-900/60'
              title='Bug #123: Simulates opening cached room with provisional target message-1002 where the API resolves to latest messages'
            >
              <RotateCcw className='size-3.5 text-amber-400' />
              <span>Reproduce Bug #123 🐛</span>
            </button>
          )}
        </div>
      </div>

      {/* Telemetry & Architecture Diagnostics Card - Dark Scheme */}
      <div className='flex flex-1 flex-col gap-2 rounded-2xl border border-slate-800/90 bg-slate-900 p-4 shadow-md'>
        <div className='flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-bold text-slate-100'>
          <span className='flex items-center gap-1.5'>
            <Activity className='size-3.5 text-indigo-400' />
            Stream Diagnostics
          </span>
          {totalUnreadCount > 0 && (
            <span className='rounded-full border border-rose-800/80 bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300'>
              {totalUnreadCount} unread
            </span>
          )}
        </div>

        <div className='space-y-1.5 text-xs'>
          <div className='flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/70 px-2.5 py-1.5'>
            <span className='text-slate-400'>Active Room</span>
            <span className='font-mono font-bold text-slate-200'>
              {activeRoomName ? `#${activeRoomName}` : 'None (Home)'}
            </span>
          </div>

          <div className='flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/70 px-2.5 py-1.5'>
            <span className='text-slate-400'>Room Unread</span>
            <span
              data-testid='active-unread-badge'
              className={cn(
                'font-mono font-bold',
                activeRoomUnreadCount > 0 ? 'text-rose-400' : 'text-slate-400',
              )}
            >
              {activeRoomUnreadCount > 0
                ? `${activeRoomUnreadCount} new chats`
                : 'All caught up ✓'}
            </span>
          </div>

          <div className='flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/70 px-2.5 py-1.5'>
            <span className='text-slate-400'>Scroll Anchor</span>
            <span className='inline-flex items-center gap-1 font-semibold text-emerald-400'>
              <Radio className='size-2.5 animate-pulse text-emerald-400' />
              Local-First
            </span>
          </div>

          <div className='flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/70 px-2.5 py-1.5'>
            <span className='text-slate-400'>Shift Compensation</span>
            <span className='font-mono font-semibold text-indigo-300'>
              ΔHeight Anchor
            </span>
          </div>

          <div className='flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/70 px-2.5 py-1.5'>
            <span className='text-slate-400'>Pattern</span>
            <span className='inline-flex items-center gap-1 font-medium text-slate-300'>
              <Layers className='size-3 text-slate-500' />
              Elm TEA Pure
            </span>
          </div>
        </div>

        <div className='mt-auto rounded-xl border border-indigo-900/60 bg-indigo-950/40 p-2.5 text-[11px] leading-relaxed text-indigo-200/90'>
          <strong className='font-semibold text-indigo-300'>
            Local-First Guarantee:
          </strong>{' '}
          Incoming SSE events & background revalidations will never jerk the
          active viewport.
        </div>
      </div>
    </aside>
  )
}

export const DebugPanelMemo = memo(DebugPanelComponent)
