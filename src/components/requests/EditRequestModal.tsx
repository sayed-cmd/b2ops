import { useState } from 'react'
import { useUpdateRequest } from '@/hooks/useRequests'
import { useHubs } from '@/hooks/useData'
import { Button, Input, Select, Textarea, Label } from '@/components/ui'
import { X } from 'lucide-react'
import type { Request, RequestField, CategoryField, RequestPriority } from '@/types'

interface Props { request: Request; fields: RequestField[]; onClose: () => void }

export function EditRequestModal({ request, fields, onClose }: Props) {
  const { mutate: updateRequest, isPending } = useUpdateRequest()
  const { data: hubs = [] } = useHubs()
  const categoryFields: CategoryField[] = request.category?.fields ?? []

  const [form, setForm] = useState({
    title: request.title,
    priority: request.priority,
    hub_id: request.hub_id ?? '',
    merchant_name: request.merchant_name,
    description: request.description ?? '',
  })
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    fields.forEach((f) => { init[f.field_key] = f.current_value })
    return init
  })
  const [reason, setReason] = useState('')

  const handleSubmit = () => {
    if (!reason.trim()) return
    updateRequest({
      requestId: request.id,
      updates: { ...form, hub_id: form.hub_id || undefined },
      fields: categoryFields.map((f) => ({ key: f.key, label: f.label, value: fieldValues[f.key] ?? '' })),
      comment: reason,
    }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Request</h2>
            <p className="text-xs text-slate-400 font-mono">{request.req_id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as RequestPriority })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hub</Label>
              <Select value={form.hub_id} onChange={(e) => setForm({ ...form, hub_id: e.target.value })}>
                <option value="">No hub</option>
                {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Merchant Name</Label>
            <Input value={form.merchant_name} onChange={(e) => setForm({ ...form, merchant_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {categoryFields.length > 0 && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Field Values</p>
              <div className="grid grid-cols-2 gap-3">
                {categoryFields.sort((a, b) => a.display_order - b.display_order).map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    {f.type === 'select' ? (
                      <Select value={fieldValues[f.key] ?? ''} onChange={(e) => setFieldValues({ ...fieldValues, [f.key]: e.target.value })}>
                        <option value="">Select...</option>
                        {f.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </Select>
                    ) : (
                      <Input type={f.type} value={fieldValues[f.key] ?? ''} onChange={(e) => setFieldValues({ ...fieldValues, [f.key]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5 p-4 bg-orange-50 border border-orange-100 rounded-xl">
            <Label className="text-orange-700">Reason for Update *</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you making these changes?" className="text-sm border-orange-200 focus:ring-orange-400" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button variant="brand" loading={isPending} disabled={!reason.trim()} onClick={handleSubmit}>Save Changes</Button>
        </div>
      </div>
    </div>
  )
}
