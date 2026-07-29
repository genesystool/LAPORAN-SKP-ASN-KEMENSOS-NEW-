import React, { useState } from "react";
import { Petugas, ModulP2K2, ToastMessage, AppSettings } from "../types";
import {
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Search,
  ExternalLink,
  Copy,
  Check,
  Layers,
  FileText,
  Lock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  ListTree,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface MasterP2K2ViewProps {
  currentUser?: Petugas;
  appSettings?: AppSettings;
  list: ModulP2K2[];
  onSave: (data: Omit<ModulP2K2, "id">, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  addToast: (type: ToastMessage["type"], title: string) => void;
}

export const MasterP2K2View: React.FC<MasterP2K2ViewProps> = ({
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

  const [searchTerm, setSearchTerm] = useState("");

  // Hierarchy View State
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  const toggleCategoryCollapse = (catName: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const toggleModuleCollapse = (modId: string) => {
    setCollapsedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const handleExpandAllHierarchy = () => {
    setCollapsedCategories({});
    setCollapsedModules({});
  };

  const handleCollapseAllHierarchy = () => {
    setCollapsedCategories({ root: true });
    const mods: Record<string, boolean> = {};
    list.forEach((m) => {
      mods[m.id] = true;
    });
    setCollapsedModules(mods);
  };

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [kodeModul, setKodeModul] = useState("");
  const [namaModul, setNamaModul] = useState("");
  const [jumlahSesi, setJumlahSesi] = useState<number>(1);
  const [deskripsi, setDeskripsi] = useState("");
  const [materiSesi, setMateriSesi] = useState("");
  const [linkMateri, setLinkMateri] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    if (isAddDisabled) {
      addToast("warning", "Fitur Tambah Modul P2K2 telah dinonaktifkan oleh Admin.");
      return;
    }
    setIsSubmitting(false);
    setEditId(null);
    setKodeModul(`M${list.length + 1}`);
    setNamaModul("");
    setJumlahSesi(1);
    setDeskripsi("");
    setMateriSesi("");
    setLinkMateri("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: ModulP2K2) => {
    if (isEditDisabled) {
      addToast("warning", "Fitur Edit Modul P2K2 telah dinonaktifkan oleh Admin.");
      return;
    }
    setIsSubmitting(false);
    setEditId(item.id);
    setKodeModul(item.kode_modul);
    setNamaModul(item.nama_modul);
    const lines = item.materi_sesi
      ? item.materi_sesi.split("\n").filter((s) => s.trim().length > 0)
      : [];
    setJumlahSesi(lines.length > 0 ? lines.length : (item.jumlah_sesi || 1));
    setDeskripsi(item.deskripsi || "");
    setMateriSesi(item.materi_sesi || "");
    setLinkMateri(item.link_materi || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaModul.trim()) {
      addToast("warning", "Isi Nama Modul P2K2 terlebih dahulu!");
      return;
    }

    const lines = materiSesi.trim()
      ? materiSesi.trim().split("\n").filter((s) => s.trim().length > 0)
      : [];
    const computedSesi = lines.length > 0 ? lines.length : (Number(jumlahSesi) || 1);

    setIsSubmitting(true);
    try {
      const success = await onSave(
        {
          kode_modul: kodeModul.trim().toUpperCase() || `M${list.length + 1}`,
          nama_modul: namaModul.trim(),
          jumlah_sesi: computedSesi,
          deskripsi: deskripsi.trim(),
          materi_sesi: materiSesi.trim(),
          link_materi: linkMateri.trim(),
          createdAt: new Date().toISOString(),
        },
        editId || undefined
      );

      if (success) {
        addToast("success", editId ? "Data Modul P2K2 berhasil diupdate" : "Modul P2K2 berhasil disimpan");
        setIsFormOpen(false);
      } else {
        addToast("error", "Gagal menyimpan Modul P2K2");
      }
    } catch (err) {
      addToast("error", "Gagal menyimpan Modul P2K2");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyMateri = (item: ModulP2K2) => {
    const textToCopy = `${item.nama_modul}\nJumlah Sesi: ${item.jumlah_sesi}\nDeskripsi: ${item.deskripsi}\n\nDaftar Sesi/Materi:\n${item.materi_sesi || "-"}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    addToast("info", "Detail Modul P2K2 telah disalin ke clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter List
  const filteredList = list.filter((item) => {
    return (
      item.nama_modul.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kode_modul.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.materi_sesi && item.materi_sesi.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const totalSesiAll = list.reduce((acc, curr) => {
    const lines = curr.materi_sesi
      ? curr.materi_sesi.split("\n").filter((s) => s.trim().length > 0)
      : [];
    return acc + (lines.length > 0 ? lines.length : (curr.jumlah_sesi || 1));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Master Modul P2K2
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pertemuan Peningkatan Kemampuan Keluarga (P2K2 / Family Development Session - FDS PKH)
          </p>
        </div>

        {isAddDisabled ? (
          <button
            disabled
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-not-allowed border border-slate-300 dark:border-slate-700"
            title="Fitur Tambah Modul dinonaktifkan oleh Admin"
          >
            <Lock className="w-4 h-4 text-slate-400" /> Tambah Modul P2K2 (Nonaktif)
          </button>
        ) : (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Modul P2K2
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Total Modul P2K2
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100">
              {list.length} <span className="text-xs font-normal text-slate-400">Modul</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Total Sesi Pembelajaran
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100">
              {totalSesiAll} <span className="text-xs font-normal text-slate-400">Sesi</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Program Panduan
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              PKH Kementerian Sosial RI
            </div>
          </div>
        </div>
      </div>

      {/* Search and Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari modul, kode, atau materi sesi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Hierarchy Controls */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleExpandAllHierarchy}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
              title="Buka Semua Node Hirarki"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Buka Semua</span>
            </button>
            <button
              type="button"
              onClick={handleCollapseAllHierarchy}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
              title="Tutup Semua Node Hirarki"
            >
              <Minimize2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Tutup Semua</span>
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {editId ? "Edit Modul P2K2" : "Tambah Modul P2K2 Baru"}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Modul <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: M1, M2"
                    value={kodeModul}
                    onChange={(e) => setKodeModul(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Sesi
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={jumlahSesi}
                    onChange={(e) => setJumlahSesi(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Modul P2K2 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Modul 1: Pengasuhan dan Pendidikan Anak"
                  value={namaModul}
                  onChange={(e) => setNamaModul(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Tujuan Modul
                </label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan singkat tujuan dan ruang lingkup modul..."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Daftar Sesi & Topik Pembelajaran (Pisahkan per baris)
                </label>
                <textarea
                  rows={4}
                  placeholder="Sesi 1: Menjadi Orang Tua yang Lebih Baik&#10;Sesi 2: Memahami Perilaku Anak&#10;Sesi 3: Memahami Cara Anak Usia Dini Belajar"
                  value={materiSesi}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMateriSesi(val);
                    const lines = val.split("\n").filter((s) => s.trim().length > 0);
                    if (lines.length > 0) {
                      setJumlahSesi(lines.length);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link Bahan Ajar / Modul Drive (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={linkMateri}
                  onChange={(e) => setLinkMateri(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Modul"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content: Tree View or Grid View */}
      {filteredList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            Belum ada Modul P2K2
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {searchTerm
              ? "Tidak ada modul yang cocok dengan kata kunci pencarian Anda."
              : "Belum ada data modul P2K2 dalam sistem. Klik tombol Tambah untuk membuat modul baru."}
          </p>
          {!isAddDisabled && !searchTerm && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Tambah Modul Pertama
            </button>
          )}
        </div>
      ) : (
        /* ================= HIERARCHICAL TREE VIEW ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ListTree className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
                Struktur Hirarki Modul P2K2 (Program PKH ➔ Modul ➔ Sesi Pembelajaran)
              </h2>
            </div>
            <span className="text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 font-mono">
              {filteredList.length} Modul • {totalSesiAll} Sesi
            </span>
          </div>

          <div className="space-y-3">
            {/* Level 1 Node: Root Folder 'Modul P2K2 Program PKH' */}
            <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl overflow-hidden transition-all bg-indigo-50/30 dark:bg-slate-900/50">
              <div
                onClick={() => setCollapsedCategories((prev) => ({ ...prev, root: !prev.root }))}
                className="p-3.5 bg-indigo-100/70 dark:bg-slate-800/90 hover:bg-indigo-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-between gap-3 select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    className="p-1 text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 rounded-md transition-transform"
                  >
                    {collapsedCategories.root ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {collapsedCategories.root ? (
                    <Folder className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  ) : (
                    <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}

                  <span className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-100 truncate uppercase tracking-wide">
                    Modul P2K2 Program PKH
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-extrabold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 font-mono">
                    {filteredList.length} Modul • {totalSesiAll} Sesi
                  </span>
                </div>
              </div>

              {/* Level 2: Modul Items under Modul P2K2 Program PKH */}
              {!collapsedCategories.root && (
                <div className="p-3 sm:p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-indigo-200 dark:border-slate-800">
                  {filteredList.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2 pl-6">
                      Tidak ada modul ditemukan.
                    </div>
                  ) : (
                    filteredList.map((modul, modIdx) => {
                      const isModCollapsed = !!collapsedModules[modul.id];
                      const sessionLines = modul.materi_sesi
                        ? modul.materi_sesi
                            .split("\n")
                            .filter((s) => s.trim().length > 0)
                        : [];

                      const actualSesi = sessionLines.length > 0 ? sessionLines.length : (modul.jumlah_sesi || 1);

                      const modNum = modul.kode_modul
                        ? modul.kode_modul.replace(/\D/g, "") || (modIdx + 1)
                        : modIdx + 1;

                      return (
                        <div
                          key={modul.id}
                          className="border border-indigo-100 dark:border-indigo-900/60 rounded-xl p-3 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-2"
                        >
                          {/* Modul Item Header (MODUL X: Nama Modul) */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div
                              className="flex items-center gap-2 cursor-pointer flex-1"
                              onClick={() => toggleModuleCollapse(modul.id)}
                            >
                              <button
                                type="button"
                                className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400"
                              >
                                {isModCollapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>

                              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 font-mono text-[11px] uppercase">
                                  MODUL {modNum}
                                </span>
                                <span>:</span>
                                <span className="hover:text-indigo-600 dark:hover:text-indigo-400">
                                  {modul.nama_modul}
                                </span>
                              </div>
                            </div>

                            {/* Modul Actions */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800 w-full sm:w-auto justify-end">
                              <span className="text-[10px] font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 mr-1">
                                {actualSesi} Sesi
                              </span>

                              {modul.link_materi && (
                                <a
                                  href={modul.link_materi}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                                  title="Buka Drive Bahan Ajar"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <button
                                onClick={() => handleCopyMateri(modul)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Salin Rincian Modul"
                              >
                                {copiedId === modul.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {!isEditDisabled && (
                                <button
                                  onClick={() => handleOpenEdit(modul)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Edit Modul"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isDeleteDisabled && (
                                <button
                                  onClick={() => setDeleteConfirmId(modul.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Hapus Modul"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Level 3: Session Bullet List */}
                          {!isModCollapsed && (
                            <div className="pt-2 ml-3 sm:ml-6 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-1">
                              {sessionLines.length === 0 ? (
                                <div className="text-[11px] text-slate-400 italic">
                                  Belum ada rincian sesi ditulis.
                                </div>
                              ) : (
                                sessionLines.map((sesiText, sIdx) => {
                                  const displayText = sesiText.trim().startsWith("-")
                                    ? sesiText.trim()
                                    : `- ${sesiText.trim()}`;
                                  return (
                                    <div
                                      key={sIdx}
                                      className="text-xs font-mono text-slate-700 dark:text-slate-300 py-0.5 leading-relaxed"
                                    >
                                      {displayText}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmId}
        title="Hapus Modul P2K2"
        message="Apakah Anda yakin ingin menghapus data Modul P2K2 ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus Modul"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          setIsDeleting(true);
          try {
            const success = await onDelete(deleteConfirmId);
            if (success) {
              addToast("success", "Modul P2K2 berhasil dihapus");
            } else {
              addToast("error", "Gagal menghapus Modul P2K2");
            }
          } catch (err) {
            addToast("error", "Gagal menghapus Modul P2K2");
          } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
          }
        }}
        onClose={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};
