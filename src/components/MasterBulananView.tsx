import React, { useState } from "react";
import { Petugas, RencanaBulanan, ToastMessage, AppSettings } from "../types";
import { Plus, Edit2, Trash2, CalendarDays, Loader2, Lock } from "lucide-react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface MasterBulananViewProps {
  currentUser?: Petugas;
  appSettings?: AppSettings;
  list: RencanaBulanan[];
  onSave: (data: Omit<RencanaBulanan, "id">, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  addToast: (type: ToastMessage["type"], title: string) => void;
}

export const MasterBulananView: React.FC<MasterBulananViewProps> = ({
  currentUser,
  appSettings,
  list,
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
  const [noRhk, setNoRhk] = useState<number>(1);
  const [rencanaKerja, setRencanaKerja] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenAdd = () => {
    if (isAddDisabled) {
      addToast("warning", "Fitur Tambah RHK Bulanan telah dinonaktifkan oleh Admin.");
      return;
    }
    setIsSubmitting(false);
    setEditId(null);
    setNoRhk(list.length + 1);
    setRencanaKerja("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: RencanaBulanan) => {
    if (isEditDisabled) {
      addToast("warning", "Fitur Edit RHK Bulanan telah dinonaktifkan oleh Admin.");
      return;
    }
    setIsSubmitting(false);
    setEditId(item.id);
    setNoRhk(item.no_rhk);
    setRencanaKerja(item.rencana_kerja);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rencanaKerja.trim()) {
      addToast("warning", "Tuliskan rencana kerja bulanan!");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave(
        {
          no_rhk: Number(noRhk),
          rencana_kerja: rencanaKerja.trim(),
          createdAt: new Date().toISOString(),
        },
        editId || undefined
      );

      if (success) {
        addToast("success", editId ? "Data RHK berhasil diupdate" : "Data RHK berhasil disimpan");
        setIsFormOpen(false);
      } else {
        addToast("error", "Gagal menyimpan RHK Bulanan");
      }
    } catch (err) {
      addToast("error", "Gagal menyimpan RHK Bulanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Rencana Kerja Bulanan (RHK Bulanan)
          </h1>
          <p className="text-xs text-slate-500">
            Master Data Indikator Kinerja Hasil Kerja Bulanan
          </p>
        </div>

        {isAddDisabled ? (
          <button
            disabled
            className="px-4 py-2 bg-slate-200 text-slate-500 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed border border-slate-300"
            title="Fitur Tambah RHK Bulanan dinonaktifkan oleh Admin"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" /> Tambah RHK Bulanan (Nonaktif)
          </button>
        ) : (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah RHK Bulanan
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 animate-in fade-in duration-150">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {editId ? "Edit Rencana Bulanan" : "Tambah Rencana Bulanan"}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor RHK
              </label>
              <input
                type="number"
                required
                value={noRhk}
                onChange={(e) => setNoRhk(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deskripsi Rencana Kerja Bulanan
              </label>
              <textarea
                rows={3}
                required
                value={rencanaKerja}
                onChange={(e) => setRencanaKerja(e.target.value)}
                placeholder="Tuliskan sasaran dan deskripsi RHK Bulanan..."
                className="w-full bg-slate-50 border border-slate-300 rounded-md p-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-md text-xs shadow-xs flex items-center gap-1.5"
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
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-md text-xs"
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
                <th className="py-3 px-3 w-28">No RHK</th>
                <th className="py-3 px-3">Rencana Kerja Bulanan</th>
                <th className="py-3 px-3 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Belum ada Rencana Bulanan.
                  </td>
                </tr>
              ) : (
                list.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 font-extrabold text-blue-700">
                      RHK {item.no_rhk}
                    </td>
                    <td className="py-3 px-3 text-slate-800 font-medium leading-relaxed">
                      {item.rencana_kerja}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmId}
        title="Konfirmasi Hapus RHK Bulanan"
        message="Apakah Anda yakin ingin menghapus data RHK Bulanan ini?"
        confirmLabel="Hapus RHK Bulanan"
        isLoading={isDeleting}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          const id = deleteConfirmId;
          setIsDeleting(true);
          try {
            const ok = await onDelete(id);
            if (ok) {
              addToast("success", "Data RHK Bulanan berhasil dihapus");
            } else {
              addToast("error", "Gagal menghapus data RHK Bulanan");
            }
          } catch (err) {
            addToast("error", "Gagal menghapus data RHK Bulanan");
          } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
          }
        }}
      />
    </div>
  );
};
