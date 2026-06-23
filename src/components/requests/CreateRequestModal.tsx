import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/store/auth'
import { useCreateRequest } from '@/hooks/useRequests'
import { useCategories, useHubs, useMerchantSuggestions } from '@/hooks/useData'
import { Button, Input, Select, Textarea, Label } from '@/components/ui'
import { cn } from '@/lib/utils'
import { X, ChevronDown } from 'lucide-react'
import type { CategoryField, RequestPriority } from '@/types'

interface Props { onClose: () => void }

export function CreateRequestModal({ onClose }: Props) {
  const { user } = useAuth()
  const { mutate: createRequest, isPending } = useCreateRequest()
  const { data: categories = [] } = useCategories(user?.team_id || undefined)
  const { data: hubs = [] } = useHubs()

  const [form, setForm] = useState({
    title: '',
    category_id: '',
    priority: 'medium' as RequestPriority,
    hub_id: '',
    merchant_name: '',
    description: '',
  })
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [merchantSearch, setMerchantSearch] = useState('')
  const [showMerchantSuggestions, setShowMerchantSuggestions] = useState(false)

  const { data: merchantSuggestions = [] } = useMerchantSuggestions(merchantSearch)
  const selectedCategory = categories.find((c) => c.id === form.category_id)
  const categoryFields: CategoryField[] = selectedCategory?.fields ?? []

  useEffect(() => {
    setFieldValues({})
  }, [form.category_id])

  const setField = (key: string, val: string) =>
    setFieldValues((prev) => ({ ...prev, [key]: val }))

  const handleSubmit = (isDraft: boolean) => {
    const fields = categoryFields.map((f) => ({
      key: f.key,
      label: f.label,
      value: fieldValues[f.key] || '',
    }))
    createRequest(
      {
        title: form.title || `${selectedCategory?.name} — ${form.merchant_name}`,
        category_id: form.category_id,
        priority: form.priority,
        hub_id: form.hub_id || null,
        merchant_name: form.merchant_name,
        description: form.description,
        fields,
        is_draft: isDraft,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New Requisition</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user?.team?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Row 1: Category + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority *</Label>
              <Select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as RequestPriority })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
          </div>

          {/* Row 2: Merchant + Hub */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 relative">
              <Label>Merchant Name *</Label>
              <Input
                value={form.merchant_name}
                onChange={(e) => {
                  setForm({ ...form, merchant_name: e.target.value })
                  setMerchantSearch(e.target.value)
                  setShowMerchantSuggestions(true)
                }}
                onBlur={() => setTimeout(() => setShowMerchantSuggestions(false), 150)}
                placeholder="Merchant name or ID..."
                required
              />
              {showMerchantSuggestions && merchantSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                  {merchantSuggestions.map((s) => (
                    <button
                      key={s}
                      onMouseDown={() => {
                        setForm({ ...form, merchant_name: s })
                        setShowMerchantSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Responsible Hub</Label>
              <Select
                value={form.hub_id}
                onChange={(e) => setForm({ ...form, hub_id: e.target.value })}
              >
                <option value="">Select hub...</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description / Notes</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Any additional context or instructions..."
            />
          </div>

          {/* Dynamic Category Fields */}
          {categoryFields.length > 0 && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {selectedCategory?.name} Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoryFields
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((f) => (
                    <DynamicField
                      key={f.key}
                      field={f}
                      value={fieldValues[f.key] || ''}
                      onChange={(val) => setField(f.key, val)}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <Button variant="ghost" onClick={() => handleSubmit(true)} disabled={isPending || !form.category_id}>
            Save as Draft
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button
              variant="brand"
              loading={isPending}
              onClick={() => handleSubmit(false)}
              disabled={!form.category_id || !form.merchant_name}
            >
              Submit Request
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Dynamic Field Renderer ───────────────────────────────────────────────────
function DynamicField({
  field, value, onChange,
}: {
  field: CategoryField
  value: string
  onChange: (val: string) => void
}) {
  const baseClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
  const label = (
    <Label>
      {field.label} {field.required && <span className="text-red-500">*</span>}
    </Label>
  )

  if (field.type === 'select') {
    return (
      <div className="space-y-1.5">
        {label}
        <select
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseClass, 'h-9 cursor-pointer')}
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-1.5 sm:col-span-2">
        {label}
        <textarea
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={2}
          className={cn(baseClass, 'resize-none')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {label}
      <input
        type={field.type}
        required={field.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={cn(baseClass, 'h-9')}
      />
    </div>
  )
}
