import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { ApiFailure } from './api.tsx'

/** CMP-13 photo slot; missing or broken imagery keeps the layout (EX-12). */
export function Photo({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken)
    return (
      <div className={`photo photo-missing ${className}`} role="img" aria-label={`${alt}: photo coming soon`}>
        <span>Photo coming soon</span>
      </div>
    )
  return <img className={`photo ${className}`} src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} />
}

/** CMP-06 quantity control with visible bounds. */
export function Quantity(props: { label: string; value: number; max: number; busy?: boolean; onChange(value: number): void }) {
  const { label, value, max, busy, onChange } = props
  return (
    <div className="quantity" role="group" aria-label={`Quantity for ${label}`} aria-busy={busy}>
      <button type="button" aria-label={`Decrease quantity of ${label}`} disabled={busy || value <= 1} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={`Increase quantity of ${label}`} disabled={busy || value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

export function Loading() {
  return (
    <p className="muted" role="status">
      Loading…
    </p>
  )
}

/** EX-01/EX-13 style failure with retry, never a blank page. */
export function LoadError({ error, onRetry }: { error: ApiFailure; onRetry(): void }) {
  return (
    <div className="notice notice-error" role="alert">
      <strong>{error.status === 0 ? 'Connection problem' : 'Could not load this page'}</strong>
      <span>{error.message}</span>
      <button type="button" className="btn" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

const LABELS: Record<string, string> = {
  partially_refunded: 'Partially refunded',
  in_progress: 'In progress',
  succeeded: 'Demo paid',
}

/** CMP-09 status badge: always text, color is secondary. */
export function StatusBadge({ status }: { status: string }) {
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
  return <span className={`badge badge-${status}`}>{label}</span>
}

/**
 * CMP-11 confirmation dialog on the native <dialog> element (focus trap, Escape and focus return
 * come from the platform). Cancel never commits; the action shows a busy state.
 */
export function ConfirmDialog(props: {
  open: boolean
  title: string
  children: ReactNode
  actionLabel: string
  busyLabel: string
  destructive?: boolean
  reasonLabel?: string
  error?: string | null
  busy?: boolean
  onConfirm(reason: string): void
  onClose(): void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // Several dialogs can exist on one page (one per shop order): ids must be unique.
  const titleId = useId()
  const [reason, setReason] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (props.open && !dialog.open) {
      setReason('')
      dialog.showModal()
    }
    if (!props.open && dialog.open) dialog.close()
  }, [props.open])

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} onClose={props.onClose}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          props.onConfirm(reason.trim())
        }}
      >
        <h2 id={titleId}>{props.title}</h2>
        <div className="dialog-body">{props.children}</div>
        {props.reasonLabel && (
          <label className="field">
            <span>{props.reasonLabel}</span>
            <textarea value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
          </label>
        )}
        {props.error && (
          <p className="notice notice-error" role="alert">
            {props.error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={props.onClose} disabled={props.busy}>
            Keep order
          </button>
          <button type="submit" className={`btn ${props.destructive ? 'btn-danger' : 'btn-primary'}`} disabled={props.busy}>
            {props.busy ? props.busyLabel : props.actionLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
