import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMembers } from '../hooks/useMembers';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addMember, updateMember, deleteMember, getMember } from '../firebase/firestore';
import { ImageUpload } from '../components/ImageUpload';
import { validateMember } from '../services/validation';
import { getFullName, getGenerationNumber } from '../utils/helpers';
import type { FamilyMember, MemberFormData } from '../types';

const emptyForm: MemberFormData = {
  firstName: '',
  lastName: '',
  gender: 'Male',
  birthDate: '',
  deathDate: '',
  isLiving: true,
  fatherId: '',
  motherId: '',
  spouseIds: [],
  phone: '',
  email: '',
  address: '',
  occupation: '',
  education: '',
  notes: '',
};

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { members, loading, stats, getChildren } = useMembers();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState<MemberFormData>(emptyForm);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'add' | 'list'>('add');

  useEffect(() => {
    if (editId) {
      getMember(editId).then((m) => {
        if (m) {
          setEditingMember(m);
          setForm({
            firstName: m.firstName,
            lastName: m.lastName,
            gender: m.gender,
            birthDate: m.birthDate,
            deathDate: m.deathDate,
            isLiving: m.isLiving,
            fatherId: m.fatherId,
            motherId: m.motherId,
            spouseIds: m.spouseIds,
            phone: m.phone,
            email: m.email,
            address: m.address,
            occupation: m.occupation,
            education: m.education,
            notes: m.notes,
          });
          setTab('add');
        }
      });
    }
  }, [editId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingMember(null);
    setErrors([]);
    setSearchParams({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validationErrors = validateMember(form, members, editingMember?.id);
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((err) => err.message));
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      if (editingMember) {
        await updateMember(editingMember.id, form);
        showToast(`${form.firstName} ${form.lastName} updated.`, 'success');
      } else {
        const id = await addMember(form, user.uid);
        showToast(`${form.firstName} ${form.lastName} added.`, 'success');
      }
      resetForm();
    } catch (err: unknown) {
      const error = err as { message?: string };
      showToast(error.message || 'Failed to save member.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: FamilyMember) => {
    if (!confirm(`Delete ${member.firstName} ${member.lastName}? This cannot be undone.`)) return;

    const childCount = getChildren(member.id).length;
    if (childCount > 0) {
      if (!confirm(`This person has ${childCount} children. They will become unlinked. Continue?`)) return;
    }

    try {
      await deleteMember(member.id);
      showToast(`${member.firstName} ${member.lastName} deleted.`, 'success');
    } catch (err: unknown) {
      const error = err as { message?: string };
      showToast(error.message || 'Failed to delete member.', 'error');
    }
  };

  const editMember = (member: FamilyMember) => {
    setEditingMember(member);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      gender: member.gender,
      birthDate: member.birthDate,
      deathDate: member.deathDate,
      isLiving: member.isLiving,
      fatherId: member.fatherId,
      motherId: member.motherId,
      spouseIds: member.spouseIds,
      phone: member.phone,
      email: member.email,
      address: member.address,
      occupation: member.occupation,
      education: member.education,
      notes: member.notes,
    });
    setTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      m.occupation?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-white/10 bg-white/5">
          <div className="text-2xl font-bold text-white">{stats.totalMembers}</div>
          <div className="text-xs text-gray-400 mt-0.5">Total Members</div>
        </div>
        <div className="p-4 rounded-lg border border-white/10 bg-white/5">
          <div className="text-2xl font-bold text-green-400">{stats.livingCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">Living</div>
        </div>
        <div className="p-4 rounded-lg border border-white/10 bg-white/5">
          <div className="text-2xl font-bold text-gray-400">{stats.deceasedCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">Deceased</div>
        </div>
        <div className="p-4 rounded-lg border border-white/10 bg-white/5">
          <div className="text-2xl font-bold text-purple-400">{stats.totalGenerations}</div>
          <div className="text-xs text-gray-400 mt-0.5">Generations</div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-white/10">
        <button
          onClick={() => setTab('add')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
            tab === 'add'
              ? 'text-purple-300 border-purple-500'
              : 'text-gray-400 border-transparent hover:text-gray-200'
          }`}
        >
          {editingMember ? 'Edit Member' : 'Add Member'}
        </button>
        <button
          onClick={() => setTab('list')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
            tab === 'list'
              ? 'text-purple-300 border-purple-500'
              : 'text-gray-400 border-transparent hover:text-gray-200'
          }`}
        >
          Manage Members ({members.length})
        </button>
      </div>

      {tab === 'add' && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-6">
          {editingMember && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-purple-300">
                Editing: {editingMember.firstName} {editingMember.lastName}
              </p>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {editingMember && (
            <ImageUpload
              memberId={editingMember.id}
              currentPhoto={editingMember.photo}
              onPhotoChange={(url) => {
                setEditingMember({ ...editingMember, photo: url });
              }}
            />
          )}

          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              {errors.map((err, i) => (
                <p key={i} className="text-sm text-red-300">{err}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">First Name *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Last Name *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as 'Male' | 'Female' | 'Other' })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isLiving}
                  onChange={(e) => setForm({ ...form, isLiving: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-purple-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
              <span className="text-sm text-gray-300">Living</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Date of Birth</label>
              <input
                type="text"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                placeholder="e.g. 15 Mar 1985"
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Date of Death</label>
              <input
                type="text"
                value={form.deathDate}
                onChange={(e) => setForm({ ...form, deathDate: e.target.value })}
                disabled={form.isLiving}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50 disabled:opacity-30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Father</label>
              <select
                value={form.fatherId}
                onChange={(e) => setForm({ ...form, fatherId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              >
                <option value="">Select father</option>
                {members
                  .filter((m) => m.gender === 'Male' && m.id !== editingMember?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Mother</label>
              <select
                value={form.motherId}
                onChange={(e) => setForm({ ...form, motherId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              >
                <option value="">Select mother</option>
                {members
                  .filter((m) => m.gender === 'Female' && m.id !== editingMember?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Spouse(s)</label>
              <select
                multiple
                value={form.spouseIds}
                onChange={(e) =>
                  setForm({
                    ...form,
                    spouseIds: Array.from(e.target.selectedOptions, (o) => o.value),
                  })
                }
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50 min-h-[80px]"
              >
                {members
                  .filter((m) => m.id !== editingMember?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Occupation</label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Education</label>
              <input
                type="text"
                value={form.education}
                onChange={(e) => setForm({ ...form, education: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50 resize-vertical"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-teal-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : editingMember ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      )}

      {tab === 'list' && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <input
            type="search"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
          />

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {m.photo ? (
                    <img src={m.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {m.firstName[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {m.firstName} {m.lastName}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {m.occupation || 'Family Member'} {m.birthDate && `\u00b7 ${m.birthDate}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {m.isLiving ? (
                    <span className="w-2 h-2 rounded-full bg-green-400" title="Living" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-500" title="Deceased" />
                  )}
                  <button
                    onClick={() => editMember(m)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {filteredMembers.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">No members found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
