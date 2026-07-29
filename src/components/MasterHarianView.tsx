import React, { useState } from "react";
import { Petugas, RencanaBulanan, RencanaHarian, ToastMessage, AppSettings } from "../types";
import { Plus, Edit2, Trash2, Loader2, Lock } from "lucide-react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface MasterHarianViewProps {
  currentUser?: Petugas;
  appSettings?: AppSettings;
  list: RencanaHarian[];
  rencanaBulananList: RencanaBulanan[];
  onSave: (data: Omit<RencanaHarian, "id">, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  addToast: (type: ToastMessage["type"], title: string) => void;
}

export const MasterHarianView: React.FC<MasterHarianViewProps> = ({
  currentUser,
  appSettings,
  list,
  rencanaBulananList,
  onSave,
  onDelete,
  addToast,
}) => {
  const isAdmin = currentUser?.level === "ADMIN";
  const permissions = appSettings?.feature_permissions || {};
  const isAddDisabled = !isAdmin && !!permissions.disableUserAdd;
  const isEditDisabled = !isAdmin && !!permissions.disableUserEdit;
  const isDeleteDisabled = !isAdmin && !!permissions.disableUserDelete;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [norhkharian, setNorhkharian] = useState<number>(1);
  const [rencanaHarian, setRencanaHarian] = useState("");
  const [rbId, setRbId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenAdd = () => {
    if (isAddDisabled) {
      addToast("warning", "Fitur Tambah RHK Harian telah dinonaktifkan oleh Admin.");
      return;
    }
    setIsSubmitting(false);
    setEditId(null);
    setNorhkharian(list.length + 1);
    setRencanaHarian("");
    setRbId(rencanaBulananList[0]?.id || "");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: RencanaHarian) => {
    if (isEditDisabled) {
      addToast("warning", "Fitur Edit RHK Harian telah dinonaktifkan oleh Admin.");
      return;
    }
    setIsSubmitting(false);
    setEditId(item.id);
    setNorhkharian(item.norhkharian);
    setRencanaHarian(item.rencana_harian);
    setRbId(item.rencana_kerja_bulanan_id || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rencanaHarian.trim()) {
      addToast("warning", "Isi deskripsi rencana harian!");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave(
        {
          norhkharian: Number(norhkharian),
          rencana_harian: rencanaHarian.trim(),
          rencana_kerja_bulanan_id: rbId,
          createdAt: new Date().toISOString(),
        },
        editId || undefined
      );

      if (success) {
        addToast("success", editId ? "RHK Harian berhasil diupdate" : "RHK Harian berhasil disimpan");
        setIsFormOpen(false);
      } else {
        addToast("error", "Gagal menyimpan RHK Harian");
      }
    } catch (err) {
      addToast("error", "Gagal menyimpan RHK Harian");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Rencana Kerja Harian</h1>
          <p className="text-xs text-slate-500">
            Sub-Kegiatan dan Rencana Kerja Harian Berdasarkan RHK Bulanan
          </p>
        </div>

        {isAddDisabled ? (
          <button
            disabled
            className="px-4 py-2 bg-slate-200 text-slate-500 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed border border-slate-300"
            title="Fitur Tambah RHK Harian dinonaktifkan oleh Admin"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" /> Tambah RHK Harian (Nonaktif)
          </button>
        ) : (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah RHK Harian
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 animate-in fade-in duration-150">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {editId ? "Edit Rencana Harian" : "Tambah Rencana Harian"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No RHK Harian
                </label>
                <input
                  type="number"
                  required
                  value={norhkharian}
                  onChange={(e) => setNorhkharian(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relasi Rencana Bulanan
                </label>
                <select
                  value={rbId}
                  onChange={(e) => setRbId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">- Tidak Terkait / Standalone -</option>
                  {rencanaBulananList.map((rb) => (
                    <option key={rb.id} value={rb.id}>
                      RHK {rb.no_rhk}: {rb.rencana_kerja.slice(0, 60)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deskripsi Rencana Kerja Harian
              </label>
              <textarea
                rows={3}
                required
                value={rencanaHarian}
                onChange={(e) => setRencanaHarian(e.target.value)}
                placeholder="Tuliskan ulasan rinci rencana harian..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg text-xs shadow-xs flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  "Simpan"
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-32">No RHK Harian</th>
                <th className="py-3 px-3">Rencana Harian</th>
                <th className="py-3 px-3 w-64">Relasi RHK Bulanan</th>
                <th className="py-3 px-3 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Belum ada Rencana Harian.
                  </td>
                </tr>
              ) : (
                list.map((item, idx) => {
                  const parentRb = rencanaBulananList.find(
                    (rb) => rb.id === item.rencana_kerja_bulanan_id
                  );
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        No. {item.norhkharian}
                      </td>
                      <td className="py-3 px-3 text-slate-800 leading-relaxed font-medium">
                        {item.rencana_harian}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {parentRb ? (
                          <span className="text-blue-700 font-medium">
                            RHK {parentRb.no_rhk}: {parentRb.rencana_kerja.slice(0, 40)}...
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Tidak ada</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isEditDisabled && (
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isDeleteDisabled && (
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmId}
        title="Konfirmasi Hapus RHK Harian"
        message="Apakah Anda yakin ingin menghapus data RHK Harian ini?"
        confirmLabel="Hapus RHK Harian"
        isLoading={isDeleting}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          const id = deleteConfirmId;
          setIsDeleting(true);
          try {
            const ok = await onDelete(id);
            if (ok) {
              addToast("success", "RHK Harian berhasil dihapus");
            } else {
              addToast("error", "Gagal menghapus RHK Harian");
            }
          } catch (err) {
            addToast("error", "Gagal menghapus RHK Harian");
          } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
          }
        }}
      />
    </div>
  );
};
