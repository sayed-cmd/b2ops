import { useState } from 'react'
import { useProposeChanges } from '@/hooks/useRequests'
import { Button, Textarea, Label } from '@/components/ui'
import { formatTime, cn } from '@/lib/utils'
import { X, ArrowRight } from 'lucide-react'
import type { Request, RequestField, CategoryField } from '@/types'

interface Props {
  request: Request
  fields: RequestField[]
  onClose: () => void
}

export function ProposeChangesModal({ request, fields, onClose }: Props) {
  const { mutate: propose, isPending } = useProposeChanges()
  const categoryFields: CategoryField[] = request.category?.fields ?? []

  // Only fields editable by reviewer or both
  const editableFields = categoryFields.filter(
    (f) => f.editable_by === 'reviewer' || f.editable_by === 'both'
  )

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    editableFields.forEach((f) => {
      const existing = fields.find((rf) => rf.field_key === f.key)
      init[f.key] = existing?.current_value ?? ''
    })
    return init
  })
  const [comment, setComment] = useState('')

  const handleSubmit = () => {
    const changed = editableFields
      .map((f) => {
        const existing = fields.find((rf) => rf.field_key === f.key)
        const old = existing?.current_value ?? ''
        const newVal = values[f.key] ?? ''
        return old !== newVal ? { key: f.key, label: f.label, old_value: old, new_value: newVal } : null
      })
      .filter(Boolean) as { key: string; label: string; old_value: string; new_value: string }[]

    if (!changed.length) {
      alert('No changes detected.')
      return
    }

    propose({ request_id: request.id, changed_fields: changed, comment }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Propose Changes</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{request.req_id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-medium text-amber-800">
              Modify the fields below to propose alternative values. The creator team will review your proposal before acceptance.
            </p>
          </div>

          {editableFields.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No editable fields configured for this category.</p>
          ) : (
            <div className="space-y-4">
              {editableFields
                .sort((a, b) => a.display_order - b.display_order)
                .map((f) => {
                  const original = fields.find((rf) => rf.field_key === f.key)?.current_value ?? ''
                  const changed = values[f.key] !== original
                  return (
                    <div key={f.key} className={cn('space-y-1.5 p-3 rounded-xl border transition-colors', changed ? 'border-amber-300 bg-amber-50/50' : 'border-slate-100')}>
                      <Label className={changed ? 'text-amber-700' : ''}>
                        {f.label}
                        {changed && <span className="ml-2 text-[10px] font-bold text-amber-600 uppercase">Modified</span>}
                      </Label>
                      {original && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                          <span className="line-through">{formatTime(original)}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className={cn('font-semibold', changed ? 'text-amber-700' : 'text-slate-400')}>
                            {formatTime(values[f.key]) || 'empty'}
                          </span>
                        </div>
                      )}
                      <FieldInput
                        field={f}
                        value={values[f.key] ?? ''}
                        onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                      />
                    </div>
                  )
                })}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Comment / Reason *</Label>
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Explain why you're proposing these changes..."
              className="text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant="warning"
            loading={isPending}
            disabled={!comment.trim() || editableFields.length === 0}
            onClick={handleSubmit}
          >
            Submit Proposal
          </Button>
        </div>
      </div>
    </div>
  )
}

function FieldInput({ field, value, onChange }: { field: CategoryField; value: string; onChange: (v: string) => void }) {
  const base = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-9'

  if (field.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="">Select...</option>
        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    )
  }
  return (
    <input
      type={field.type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={base}
    />
  )
}
