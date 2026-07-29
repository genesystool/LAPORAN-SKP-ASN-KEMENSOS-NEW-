import React, { useState } from "react";
import { Petugas, ToastMessage } from "../types";
import { compressImageFile } from "../lib/imageUtils";
import { UserPlus, Edit2, Trash2, ShieldCheck, User, Loader2 } from "lucide-react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface MasterPetugasViewProps {
  list: Petugas[];
  onSave: (data: Omit<Petugas, "id">, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  addToast: (type: ToastMessage["type"], title: string) => void;
}

export const MasterPetugasView: React.FC<MasterPetugasViewProps> = ({
  list,
  onSave,
  onDelete,
  addToast,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [nip, setNip] = useState("");
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<Petugas["level"]>("USER");
  const [status, setStatus] = useState<Petugas["status"]>("AKTIF");
  const [foto, setFoto] = useState("");
  const [scanTtd, setScanTtd] = useState("");
  const [tempatDibuat, setTempatDibuat] = useState("Aceh Tamiang");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenAdd = () => {
    setIsSubmitting(false);
    setEditId(null);
    setNip("");
    setNama("");
    setPassword("");
    setLevel("USER");
    setStatus("AKTIF");
    setFoto("");
    setScanTtd("");
    setTempatDibuat("Aceh Tamiang");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Petugas) => {
    setIsSubmitting(false);
    setEditId(item.id);
    setNip(item.nip);
    setNama(item.nama);
    setPassword(""); // Keep blank if unchanged
    setLevel(item.level);
    setStatus(item.status);
    setFoto(item.foto || "");
    setScanTtd(item.scan_ttd || "");
    setTempatDibuat(item.tempat_dibuat || "Aceh Tamiang");
    setIsFormOpen(true);
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const compressed = await compressImageFile(e.target.files[0], 150);
        setFoto(compressed);
        addToast("success", "Foto profil berhasil diproses");
      } catch (err) {
        addToast("error", "Gagal memproses foto");
      }
    }
  };

  const handleTtdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const compressed = await compressImageFile(e.target.files[0], 150);
        setScanTtd(compressed);
        addToast("success", "Scan TTD berhasil diproses");
      } catch (err) {
        addToast("error", "Gagal memproses TTD");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nip.trim() || !nama.trim()) {
      addToast("warning", "NIP dan Nama Wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Omit<Petugas, "id"> = {
        nip: nip.trim(),
        nama: nama.trim(),
        level,
        status,
        foto,
        scan_ttd: scanTtd,
        tempat_dibuat: tempatDibuat.trim() || "Aceh Tamiang",
        createdAt: new Date().toISOString(),
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      const success = await onSave(payload, editId || undefined);
      if (success) {
        addToast("success", editId ? "Data Petugas berhasil diupdate" : "Petugas baru berhasil disimpan");
        setIsFormOpen(false);
      } else {
        addToast("error", "Gagal menyimpan data petugas");
      }
    } catch (err) {
      addToast("error", "Gagal menyimpan data petugas");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manajemen Data Petugas</h1>
          <p className="text-xs text-slate-500">
            Kelola Akun Pegawai, Akses Level Admin/User, dan Scan TTD
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Tambah Petugas
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 animate-in fade-in duration-150">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {editId ? "Edit Petugas" : "Tambah Petugas Baru"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP (Username)
                </label>
                <input
                  type="text"
                  required
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password {editId ? "(Kosongkan jika tak diubah)" : ""}
                </label>
                <input
                  type="password"
                  required={!editId}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editId ? "••••••••" : "Password"}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hak Akses Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Petugas["level"])}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USER">USER (Petugas Operasional)</option>
                  <option value="ADMIN">ADMIN (Administrator Full)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Akun
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Petugas["status"])}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AKTIF">AKTIF</option>
                  <option value="TIDAK">TIDAK AKTIF</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tempat Laporan Dibuat (Dibuat di:)
                </label>
                <input
                  type="text"
                  value={tempatDibuat}
                  onChange={(e) => setTempatDibuat(e.target.value)}
                  placeholder="Contoh: Aceh Tamiang"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Foto Profil
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {foto && (
                  <img
                    src={foto}
                    alt="Preview Foto"
                    className="w-12 h-12 object-cover rounded-full border border-slate-300 mt-2"
                  />
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Scan Tanda Tangan (TTD)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleTtdChange}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {scanTtd && (
                  <img
                    src={scanTtd}
                    alt="Preview TTD"
                    className="h-12 object-contain border border-slate-200 p-1 rounded-md mt-2 bg-white"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
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
                <th className="py-3 px-3 w-36">NIP (Username)</th>
                <th className="py-3 px-3">Nama Lengkap</th>
                <th className="py-3 px-3 w-24">Level</th>
                <th className="py-3 px-3 w-24">Status</th>
                <th className="py-3 px-3 w-28">Foto & TTD</th>
                <th className="py-3 px-3 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 text-center font-bold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {item.nip}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    {item.nama}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.level === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.level}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === "AKTIF"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {item.foto ? (
                        <img
                          src={item.foto}
                          alt="Foto"
                          className="w-7 h-7 rounded-full object-cover border border-slate-300"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-[10px]">
                          ?
                        </div>
                      )}
                      {item.scan_ttd && (
                        <img
                          src={item.scan_ttd}
                          alt="TTD"
                          className="h-6 object-contain border border-slate-200 rounded-sm bg-white p-0.5"
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmId}
        title="Konfirmasi Hapus Akun Petugas"
        message="Apakah Anda yakin ingin menghapus data akun petugas ini?"
        confirmLabel="Hapus Petugas"
        isLoading={isDeleting}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          const id = deleteConfirmId;
          setIsDeleting(true);
          try {
            const ok = await onDelete(id);
            if (ok) {
              addToast("success", "Petugas berhasil dihapus");
            } else {
              addToast("error", "Gagal menghapus petugas");
            }
          } catch (err) {
            addToast("error", "Gagal menghapus petugas");
          } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
          }
        }}
      />
    </div>
  );
};
