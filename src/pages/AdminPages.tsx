import { useState } from 'react'
import { useUsers, useUpdateUser, useTeams, useUpsertTeam, useHubs, useUpsertHub, useAllCategories, useUpsertCategory, useDeleteCategory } from '@/hooks/useData'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Avatar, EmptyState, Skeleton, Label, Textarea } from '@/components/ui'
import { Plus, Edit2, Trash2, X, Check, UserCheck, UserX, Building2, Tag, Users } from 'lucide-react'
import type { User, Team, Hub, Category, CategoryField, FieldType, EditableBy } from '@/types'

// ─── Users Admin ──────────────────────────────────────────────────────────────
export function AdminUsersPage() {
  const { data: users = [], isLoading } = useUsers()
  const { data: teams = [] } = useTeams()
  const { mutate: updateUser, isPending } = useUpdateUser()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<User>>({})

  const startEdit = (u: User) => { setEditingId(u.id); setEditForm({ role: u.role, team_id: u.team_id ?? '', is_active: u.is_active }) }
  const saveEdit = () => {
    if (!editingId) return
    updateUser({ id: editingId, ...editForm }, { onSuccess: () => setEditingId(null) })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500">{users.length} users registered</p>
      </div>
      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['User', 'Email', 'Team', 'Role', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatar_url} name={u.name} size="sm" />
                          <span className="font-semibold text-slate-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">{u.email}</td>
                      <td className="py-3 pr-4">
                        {editingId === u.id ? (
                          <Select className="h-8 text-xs" value={editForm.team_id ?? ''} onChange={(e) => setEditForm({ ...editForm, team_id: e.target.value || null })}>
                            <option value="">No team</option>
                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </Select>
                        ) : <span className="text-slate-600">{u.team?.name ?? '—'}</span>}
                      </td>
                      <td className="py-3 pr-4">
                        {editingId === u.id ? (
                          <Select className="h-8 text-xs" value={editForm.role ?? 'agent'} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as User['role'] })}>
                            <option value="agent">Agent</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </Select>
                        ) : (
                          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {editingId === u.id ? (
                          <Select className="h-8 text-xs" value={editForm.is_active ? 'true' : 'false'} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'true' })}>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </Select>
                        ) : (
                          <span className={`flex items-center gap-1 text-xs font-semibold ${u.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                            {u.is_active ? <><UserCheck className="h-3.5 w-3.5" /> Active</> : <><UserX className="h-3.5 w-3.5" /> Inactive</>}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {editingId === u.id ? (
                          <div className="flex gap-1">
                            <Button size="icon-sm" variant="success" loading={isPending} onClick={saveEdit}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="icon-sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        ) : (
                          <Button size="icon-sm" variant="ghost" onClick={() => startEdit(u)}><Edit2 className="h-3.5 w-3.5 text-slate-400" /></Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Teams Admin ──────────────────────────────────────────────────────────────
export function AdminTeamsPage() {
  const { data: teams = [], isLoading } = useTeams()
  const { mutate: upsertTeam, isPending } = useUpsertTeam()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<Team> & { group_emails_str?: string }>({ name: '', group_emails_str: '' })

  const save = () => {
    const emails = (form.group_emails_str || '').split(',').map((e) => e.trim()).filter(Boolean)
    upsertTeam({ id: form.id, name: form.name, group_emails: emails }, { onSuccess: () => { setShowForm(false); setForm({ name: '', group_emails_str: '' }) } })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teams</h1>
          <p className="text-sm text-slate-500">{teams.length} teams configured</p>
        </div>
        <Button variant="brand" onClick={() => { setForm({ name: '', group_emails_str: '' }); setShowForm(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Team
        </Button>
      </div>

      {showForm && (
        <Card className="border-blue-200">
          <CardHeader><CardTitle>{form.id ? 'Edit Team' : 'New Team'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Team Name *</Label>
              <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Business Team" />
            </div>
            <div className="space-y-1.5">
              <Label>Group Emails (comma-separated) *</Label>
              <Input value={form.group_emails_str ?? ''} onChange={(e) => setForm({ ...form, group_emails_str: e.target.value })} placeholder="ops@company.com, ops-hub@company.com" />
              <p className="text-xs text-slate-400">Multiple emails separated by commas. All will receive notifications.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="brand" loading={isPending} onClick={save} disabled={!form.name}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />) :
          teams.length === 0 ? <EmptyState icon={<Users className="h-6 w-6" />} title="No teams yet" /> :
          teams.map((t) => (
            <Card key={t.id} className="hover:border-slate-300 transition-colors">
              <CardContent className="pt-4 pb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-800">{t.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {t.group_emails.map((e) => (
                      <span key={e} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-md px-2 py-0.5 font-mono">{e}</span>
                    ))}
                  </div>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => {
                  setForm({ ...t, group_emails_str: t.group_emails.join(', ') })
                  setShowForm(true)
                }}><Edit2 className="h-3.5 w-3.5 text-slate-400" /></Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}

// ─── Hubs Admin ───────────────────────────────────────────────────────────────
export function AdminHubsPage() {
  const { data: hubs = [], isLoading } = useHubs()
  const { mutate: upsertHub, isPending } = useUpsertHub()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<Hub>>({ name: '', email: '', region: '' })

  const save = () => {
    upsertHub(form, { onSuccess: () => { setShowForm(false); setForm({ name: '', email: '', region: '' }) } })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Hubs</h1><p className="text-sm text-slate-500">{hubs.length} hubs</p></div>
        <Button variant="brand" onClick={() => { setForm({ name: '', email: '', region: '' }); setShowForm(true) }} className="gap-2"><Plus className="h-4 w-4" /> Add Hub</Button>
      </div>

      {showForm && (
        <Card className="border-blue-200">
          <CardHeader><CardTitle>{form.id ? 'Edit Hub' : 'New Hub'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Hub Name *</Label><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sonargaon Hub" /></div>
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hub@company.com" /></div>
            </div>
            <div className="space-y-1.5"><Label>Region</Label><Input value={form.region ?? ''} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Dhaka" /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="brand" loading={isPending} onClick={save} disabled={!form.name || !form.email}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />) :
          hubs.map((h) => (
            <Card key={h.id} className="hover:border-slate-300 transition-colors">
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-slate-100 rounded-lg flex items-center justify-center"><Building2 className="h-4 w-4 text-slate-400" /></div>
                  <div>
                    <p className="font-semibold text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-400">{h.email} {h.region && `· ${h.region}`}</p>
                  </div>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => { setForm(h); setShowForm(true) }}><Edit2 className="h-3.5 w-3.5 text-slate-400" /></Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}

// ─── Categories Admin ─────────────────────────────────────────────────────────
const FIELD_TYPES: FieldType[] = ['text', 'number', 'date', 'time', 'select', 'textarea']

export function AdminCategoriesPage() {
  const { data: categories = [], isLoading } = useAllCategories()
  const { data: teams = [] } = useTeams()
  const { mutate: upsertCategory, isPending } = useUpsertCategory()
  const { mutate: deleteCategory } = useDeleteCategory()
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null)

  const saveCategory = () => {
    if (!editingCat) return
    upsertCategory(editingCat as Category, { onSuccess: () => setEditingCat(null) })
  }

  const addField = () => {
    const newField: CategoryField = {
      key: `field_${Date.now()}`, label: '', type: 'text',
      required: false, editable_by: 'creator', display_order: (editingCat?.fields?.length ?? 0) + 1,
    }
    setEditingCat({ ...editingCat, fields: [...(editingCat?.fields ?? []), newField] })
  }

  const updateField = (idx: number, patch: Partial<CategoryField>) => {
    const fields = [...(editingCat?.fields ?? [])]
    fields[idx] = { ...fields[idx], ...patch }
    setEditingCat({ ...editingCat, fields })
  }

  const removeField = (idx: number) => {
    const fields = [...(editingCat?.fields ?? [])]
    fields.splice(idx, 1)
    setEditingCat({ ...editingCat, fields })
  }

  if (editingCat !== null) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setEditingCat(null)} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"><X className="h-4 w-4" /> Cancel</button>
          <h1 className="text-xl font-bold text-slate-900">{editingCat.id ? 'Edit Category' : 'New Category'}</h1>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Category Name *</Label><Input value={editingCat.name ?? ''} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} placeholder="Slot Booking" /></div>
              <div className="space-y-1.5">
                <Label>Team *</Label>
                <Select value={editingCat.team_id ?? ''} onChange={(e) => setEditingCat({ ...editingCat, team_id: e.target.value })}>
                  <option value="">Select team...</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>SLA (hours)</Label>
              <Input type="number" value={editingCat.sla_hours ?? 24} onChange={(e) => setEditingCat({ ...editingCat, sla_hours: Number(e.target.value) })} min={1} />
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800">Dynamic Fields</h2>
            <Button variant="outline" size="sm" onClick={addField} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Field</Button>
          </div>
          <div className="space-y-3">
            {(editingCat.fields ?? []).map((f, idx) => (
              <Card key={f.key} className="border-slate-200">
                <CardContent className="pt-4 pb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Label *</Label>
                      <Input value={f.label} onChange={(e) => updateField(idx, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="Pickup Time" />
                    </div>
                    <div className="space-y-1">
                      <Label>Key (auto)</Label>
                      <Input value={f.key} onChange={(e) => updateField(idx, { key: e.target.value })} placeholder="pickup_time" className="font-mono text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <Select value={f.type} onChange={(e) => updateField(idx, { type: e.target.value as FieldType })}>
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Editable By</Label>
                      <Select value={f.editable_by} onChange={(e) => updateField(idx, { editable_by: e.target.value as EditableBy })}>
                        <option value="creator">Creator</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="both">Both</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Order</Label>
                      <Input type="number" value={f.display_order} onChange={(e) => updateField(idx, { display_order: Number(e.target.value) })} min={1} />
                    </div>
                  </div>
                  {f.type === 'select' && (
                    <div className="space-y-1">
                      <Label>Options (comma-separated)</Label>
                      <Input value={(f.options ?? []).join(', ')} onChange={(e) => updateField(idx, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })} placeholder="Option A, Option B, Option C" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={f.required} onChange={(e) => updateField(idx, { required: e.target.checked })} className="rounded" />
                      Required field
                    </label>
                    <Button size="icon-sm" variant="ghost" onClick={() => removeField(idx)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(editingCat.fields ?? []).length === 0 && (
              <div className="text-center py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                No fields yet. Click "Add Field" to start.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setEditingCat(null)}>Cancel</Button>
          <Button variant="brand" loading={isPending} onClick={saveCategory} disabled={!editingCat.name || !editingCat.team_id}>Save Category</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Categories</h1><p className="text-sm text-slate-500">{categories.length} categories</p></div>
        <Button variant="brand" onClick={() => setEditingCat({ name: '', fields: [], sla_hours: 24, is_active: true })} className="gap-2"><Plus className="h-4 w-4" /> New Category</Button>
      </div>
      <div className="space-y-3">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />) :
          categories.length === 0 ? <EmptyState icon={<Tag className="h-6 w-6" />} title="No categories yet" /> :
          categories.map((c) => (
            <Card key={c.id} className={`hover:border-slate-300 transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{c.team?.name}</span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">SLA: {c.sla_hours}h</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{(c.fields ?? []).length} fields configured</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditingCat(c)}><Edit2 className="h-3.5 w-3.5 text-slate-400" /></Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => deleteCategory(c.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
