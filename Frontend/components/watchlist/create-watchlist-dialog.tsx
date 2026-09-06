"use client"

import { useEffect, useState } from "react"
import { Modal } from "./modal"

type CreateWatchlistDialogProps = {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => void
}

export function CreateWatchlistDialog({ open, onClose, onCreate }: CreateWatchlistDialogProps) {
  const [name, setName] = useState("")

  useEffect(() => {
    if (!open) setName("")
  }, [open])

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Create watchlist">
      <label className="mb-2 block text-[11px] uppercase tracking-wider text-muted-foreground">
        Watchlist name
      </label>
      {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) submit()
        }}
        placeholder="e.g. My Long-Term Bets"
        className="w-full rounded-md border border-border bg-input/40 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
      />

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create
        </button>
      </div>
    </Modal>
  )
}
