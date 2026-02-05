import { useState } from 'react';
import { useWalletStore } from '../store';
import { ArrowLeft, Plus, Edit2, Trash2, Check, Copy, Send } from 'lucide-react';

interface AddressBookProps {
  onBack: () => void;
  onSendTo?: (address: string) => void;
}

export default function AddressBook({ onBack, onSendTo }: AddressBookProps) {
  const { contacts, addContact, updateContact, deleteContact } = useWalletStore();
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setAddress('');
    setError('');
    setEditId(null);
    setMode('list');
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!address.trim() || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Invalid address format');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await addContact(name.trim(), address.trim());
      resetForm();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!address.trim() || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Invalid address format');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await updateContact(editId, name.trim(), address.trim());
      resetForm();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this contact?')) {
      try {
        await deleteContact(id);
      } catch (e) {
        console.error('Failed to delete contact:', e);
      }
    }
  };

  const startEdit = (contact: { id: string; name: string; address: string }) => {
    setEditId(contact.id);
    setName(contact.name);
    setAddress(contact.address);
    setMode('edit');
  };

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  // Add/Edit form
  if (mode === 'add' || mode === 'edit') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50 p-4">
        <div className="max-w-sm mx-auto">
          <button
            onClick={resetForm}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6">
              {mode === 'add' ? 'Add Contact' : 'Edit Contact'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contact name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none font-mono text-sm"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                onClick={mode === 'add' ? handleAdd : handleUpdate}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Saving...' : mode === 'add' ? 'Add Contact' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Contact list
  return (
    <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50 p-4">
      <div className="max-w-sm mx-auto">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Address Book</h2>
            <span className="text-sm text-gray-500">{contacts.length} contacts</span>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No contacts yet</p>
              <button
                onClick={() => setMode('add')}
                className="inline-flex items-center gap-2 text-qfc-600 hover:text-qfc-700"
              >
                <Plus className="w-5 h-5" />
                Add your first contact
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{contact.name}</p>
                      <p className="text-xs text-gray-500 font-mono truncate">
                        {formatAddress(contact.address)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => copyAddress(contact.address)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Copy address"
                      >
                        {copied === contact.address ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      {onSendTo && (
                        <button
                          onClick={() => onSendTo(contact.address)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Send to this address"
                        >
                          <Send className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(contact)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="p-2 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {contacts.length > 0 && (
            <button
              onClick={() => setMode('add')}
              className="w-full mt-4 py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Contact
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
