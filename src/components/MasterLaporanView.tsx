import React, { useState } from "react";
import { LaporanTemplate, Petugas, RencanaBulanan, ToastMessage, AppSettings } from "../types";
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  Loader2,
  Sparkles,
  Copy,
  Users,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Square,
  Search,
  Lock,
} from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface MasterLaporanViewProps {
  currentUser: Petugas;
  list: LaporanTemplate[];
  rencanaBulananList: RencanaBulanan[];
  petugasList: Petugas[];
  appSettings?: AppSettings;
  onSave: (data: Omit<LaporanTemplate, "id">, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  addToast: (type: ToastMessage["type"], title: string) => void;
}

export const MasterLaporanView: React.FC<MasterLaporanViewProps> = ({
  currentUser,
  list,
  rencanaBulananList,
  petugasList = [],
  appSettings,
  onSave,
  onDelete,
  addToast,
}) => {
  const isAdmin = currentUser.level === "ADMIN";

  // Feature permissions for non-admin
  const permissions = appSettings?.feature_permissions || {};
  const isAddDisabled = !isAdmin && !!permissions.disableUserAdd;
  const isEditDisabled = !isAdmin && !!permissions.disableUserEdit;
  const isDeleteDisabled = !isAdmin && !!permissions.disableUserDelete;
  const isCopyTemplateDisabled = !isAdmin && !!permissions.disableUserCopyTemplate;
  const [viewTab, setViewTab] = useState<"mine" | "all">("mine");
  const [filterUserSearch, setFilterUserSearch] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [nomorRhk, setNomorRhk] = useState<number>(1);
  const [umum, setUmum] = useState("");
  const [maksudTujuan, setMaksudTujuan] = useState("");
  const [ruangLingkup, setRuangLingkup] = useState("");
  const [dasar, setDasar] = useState("");
  const [simpulan, setSimpulan] = useState("");
  const [penutup, setPenutup] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // AI Generator state
  const [aiKeyword, setAiKeyword] = useState("");
  const [aiStyle, setAiStyle] = useState<"formal" | "ringkas" | "teknis">("formal");
  const [aiLoading, setAiLoading] = useState(false);

  // Copy Template Modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [sourcePetugasId, setSourcePetugasId] = useState<string>("");
  const [targetPetugasId, setTargetPetugasId] = useState<string>(currentUser.id);
  const [selectedRhkToCopy, setSelectedRhkToCopy] = useState<number[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [isCopying, setIsCopying] = useState<boolean>(false);

  // Helper to get templates belonging to a specific petugas
  const getPetugasTemplates = (pId: string) => {
    const p = petugasList.find((item) => item.id === pId || item.nip === pId);
    const cleanNip = p?.nip ? p.nip.replace(/\s+/g, "") : "";
    return list.filter(
      (item) =>
        item.petugas_id === pId ||
        (p && item.petugas_id === p.id) ||
        (p && item.petugas_id === p.nip) ||
        (cleanNip !== "" && item.petugas_id === cleanNip)
    );
  };

  const handleGenerateTemplateAI = async () => {
    if (!aiKeyword.trim()) {
      addToast("warning", "Masukkan kata kunci topik template laporan terlebih dahulu!");
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch("/api/generate-template-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: aiKeyword.trim(),
          nomorRhk,
          style: aiStyle,
        }),
      });

      if (!res.ok) throw new Error("Gagal menghubungi AI Generator");

      const data = await res.json();
      if (data.umum) setUmum(data.umum);
      if (data.maksudTujuan) setMaksudTujuan(data.maksudTujuan);
      if (data.ruangLingkup) setRuangLingkup(data.ruangLingkup);
      if (data.dasar) setDasar(data.dasar);
      if (data.simpulan) setSimpulan(data.simpulan);
      if (data.penutup) setPenutup(data.penutup);

      addToast("success", `Template Laporan RHK ${nomorRhk} (${aiStyle.toUpperCase()}) berhasil dibuat oleh AI!`);
    } catch (err) {
      console.error(err);
      addToast("error", "Gagal membuat template AI. Coba kata kunci lain.");
    } finally {
      setAiLoading(false);
    }
  };

  // RHK numbers supported: 1 to 9
  const ALL_RHK_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Filter templates so user ONLY sees templates created by themselves
  const cleanNip = currentUser.nip ? currentUser.nip.replace(/\s+/g, "") : "";
  const myTemplates = list.filter(
    (item) =>
      item.petugas_id === currentUser.id ||
      item.petugas_id === currentUser.nip ||
      (cleanNip !== "" && item.petugas_id === cleanNip)
  );

  // Set of RHK numbers that already have templates created
  const usedRhkSet = new Set(myTemplates.map((item) => Number(item.nomor_rhk)));

  // List of unused RHK numbers (1..9)
  const unusedRhkList = ALL_RHK_NUMBERS.filter((no) => !usedRhkSet.has(no));

  const handleOpenAdd = () => {
    if (isAddDisabled) {
      addToast("warning", "Fitur Tambah Template Laporan telah dinonaktifkan oleh Admin.");
      return;
    }

    if (unusedRhkList.length === 0) {
      addToast(
        "warning",
        "Semua RHK (RHK 1 s.d. RHK 9) sudah memiliki template laporan. Tidak dapat menambah template lagi."
      );
      return;
    }

    setIsSubmitting(false);
    setEditId(null);
    setNomorRhk(unusedRhkList[0]);
    setUmum("Laporan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas operasional ASN dalam rangka meningkatkan akuntabilitas dan efektivitas pelayanan publik.");
    setMaksudTujuan("Maksud kegiatan ini adalah untuk memastikan seluruh tahapan pendampingan berjalan sesuai standar operasional baku dan mencapai target kinerja yang ditetapkan.");
    setRuangLingkup("Ruang lingkup laporan meliputi persiapan administrasi, koordinasi instansi, serta verifikasi lapangan di wilayah kerja.");
    setDasar("1. Peraturan Menteri tentang Standar Pelayanan Operasional.\n2. Surat Perintah Tugas Kepala Dinas/Instansi.");
    setSimpulan("Kegiatan pendampingan telah terlaksana dengan lancar dan memberikan kontribusi positif bagi indikator kinerja organisasi.");
    setPenutup("Demikian laporan pelaksanaan kegiatan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: LaporanTemplate) => {
    if (isEditDisabled) {
      addToast("warning", "Fitur Edit Template Laporan telah dinonaktifkan oleh Admin.");
      return;
    }

    setIsSubmitting(false);
    setEditId(item.id);
    setNomorRhk(item.nomor_rhk);
    setUmum(item.umum);
    setMaksudTujuan(item.maksud_tujuan);
    setRuangLingkup(item.ruang_lingkup);
    setDasar(item.dasar);
    setSimpulan(item.simpulan);
    setPenutup(item.penutup);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double check uniqueness if adding new template
    if (!editId && usedRhkSet.has(Number(nomorRhk))) {
      addToast("error", `Template Laporan untuk RHK ${nomorRhk} sudah ada. Pilih RHK lain.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave(
        {
          nomor_rhk: Number(nomorRhk),
          petugas_id: currentUser.id,
          umum,
          maksud_tujuan: maksudTujuan,
          ruang_lingkup: ruangLingkup,
          dasar,
          kegiatan: "",
          hasil_capaian: "",
          simpulan,
          penutup,
          createdAt: new Date().toISOString(),
        },
        editId || undefined
      );

      if (success) {
        addToast("success", editId ? "Template laporan diupdate" : "Template laporan berhasil disimpan");
        setIsFormOpen(false);
      } else {
        addToast("error", "Gagal menyimpan template laporan. Coba lagi.");
      }
    } catch (err) {
      console.error(err);
      addToast("error", "Gagal menyimpan template laporan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick single-template copy to currentUser
  const handleQuickCopySingleTemplate = async (template: LaporanTemplate) => {
    if (isCopyTemplateDisabled) {
      addToast("warning", "Fitur Salin Template Laporan telah dinonaktifkan oleh Admin.");
      return;
    }

    const rhkNo = Number(template.nomor_rhk);
    const existing = myTemplates.find((t) => Number(t.nomor_rhk) === rhkNo);

    try {
      if (existing) {
        if (!window.confirm(`Anda sudah memiliki Template RHK ${rhkNo}. Yakin ingin menimpanya dengan template ini?`)) {
          return;
        }
      }

      const ok = await onSave(
        {
          nomor_rhk: rhkNo,
          petugas_id: currentUser.id,
          umum: template.umum,
          maksud_tujuan: template.maksud_tujuan,
          ruang_lingkup: template.ruang_lingkup,
          dasar: template.dasar,
          kegiatan: template.kegiatan || "",
          hasil_capaian: template.hasil_capaian || "",
          simpulan: template.simpulan,
          penutup: template.penutup,
          createdAt: new Date().toISOString(),
        },
        existing ? existing.id : undefined
      );

      if (ok) {
        addToast("success", `Template RHK ${rhkNo} berhasil disalin ke akun Anda!`);
      } else {
        addToast("error", "Gagal menyalin template.");
      }
    } catch (err) {
      console.error(err);
      addToast("error", "Gagal menyalin template laporan.");
    }
  };

  // Batch copy process from source user to target user
  const handleExecuteCopyTemplates = async () => {
    if (!isAdmin) {
      addToast("error", "Akses ditolak. Fitur salin template hanya tersedia untuk akun Admin.");
      return;
    }

    if (!sourcePetugasId || !targetPetugasId) {
      addToast("warning", "Pilih user sumber dan user tujuan terlebih dahulu.");
      return;
    }
    if (sourcePetugasId === targetPetugasId) {
      addToast("warning", "User sumber dan user tujuan tidak boleh sama.");
      return;
    }
    if (selectedRhkToCopy.length === 0) {
      addToast("warning", "Pilih minimal satu template RHK yang ingin disalin.");
      return;
    }

    setIsCopying(true);
    try {
      const sourceTemplates = getPetugasTemplates(sourcePetugasId);
      const targetTemplates = getPetugasTemplates(targetPetugasId);

      let copiedCount = 0;

      for (const rhkNo of selectedRhkToCopy) {
        const srcTpl = sourceTemplates.find((t) => Number(t.nomor_rhk) === rhkNo);
        if (!srcTpl) continue;

        const existingTargetTpl = targetTemplates.find((t) => Number(t.nomor_rhk) === rhkNo);

        if (existingTargetTpl) {
          if (overwriteExisting) {
            await onSave(
              {
                nomor_rhk: Number(rhkNo),
                petugas_id: targetPetugasId,
                umum: srcTpl.umum,
                maksud_tujuan: srcTpl.maksud_tujuan,
                ruang_lingkup: srcTpl.ruang_lingkup,
                dasar: srcTpl.dasar,
                kegiatan: srcTpl.kegiatan || "",
                hasil_capaian: srcTpl.hasil_capaian || "",
                simpulan: srcTpl.simpulan,
                penutup: srcTpl.penutup,
                createdAt: new Date().toISOString(),
              },
              existingTargetTpl.id
            );
            copiedCount++;
          }
        } else {
          await onSave({
            nomor_rhk: Number(rhkNo),
            petugas_id: targetPetugasId,
            umum: srcTpl.umum,
            maksud_tujuan: srcTpl.maksud_tujuan,
            ruang_lingkup: srcTpl.ruang_lingkup,
            dasar: srcTpl.dasar,
            kegiatan: srcTpl.kegiatan || "",
            hasil_capaian: srcTpl.hasil_capaian || "",
            simpulan: srcTpl.simpulan,
            penutup: srcTpl.penutup,
            createdAt: new Date().toISOString(),
          });
          copiedCount++;
        }
      }

      const targetUser = petugasList.find((p) => p.id === targetPetugasId);
      addToast("success", `Berhasil menyalin ${copiedCount} template laporan ke ${targetUser?.nama || "user tujuan"}!`);
      setIsCopyModalOpen(false);
    } catch (err) {
      console.error("Copy template error:", err);
      addToast("error", "Gagal menyalin template laporan.");
    } finally {
      setIsCopying(false);
    }
  };

  // Open copy modal setup
  const handleOpenCopyModal = () => {
    if (!isAdmin) {
      addToast("error", "Akses ditolak. Fitur salin template hanya tersedia untuk akun Admin.");
      return;
    }

    // Pick first other user with templates as default source
    const otherWithTpls = petugasList.find(
      (p) => p.id !== currentUser.id && getPetugasTemplates(p.id).length > 0
    );
    const initialSource = otherWithTpls ? otherWithTpls.id : petugasList[0]?.id || "";
    setSourcePetugasId(initialSource);
    setTargetPetugasId(currentUser.id);

    const initialTpls = getPetugasTemplates(initialSource);
    setSelectedRhkToCopy(initialTpls.map((t) => Number(t.nomor_rhk)));
    setIsCopyModalOpen(true);
  };

  // Selectable RHK options
  const selectableRhkOptions = editId
    ? Array.from(new Set([Number(nomorRhk), ...unusedRhkList])).sort((a, b) => a - b)
    : unusedRhkList;

  // Filtered all templates for tab "all"
  const allTemplatesFiltered = list.filter((t) => {
    if (!filterUserSearch.trim()) return true;
    const q = filterUserSearch.toLowerCase();
    const owner = petugasList.find((p) => p.id === t.petugas_id || p.nip === t.petugas_id);
    return (
      owner?.nama.toLowerCase().includes(q) ||
      owner?.nip.toLowerCase().includes(q) ||
      t.maksud_tujuan.toLowerCase().includes(q) ||
      `rhk ${t.nomor_rhk}`.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">
              Template Laporan Resmi (Pendahuluan & Penutup)
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {myTemplates.length} / 9 RHK
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Pengaturan Narasi Standar Laporan Resmi Pemerintahan / Dinas (Salin atau Buat Template per RHK 1-9)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Template from another user Button - Admin Only */}
          {isAdmin && (
            <button
              onClick={handleOpenCopyModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
              title="Salin koleksi template laporan dari/ke user lain (Fitur Admin)"
            >
              <Copy className="w-4 h-4" />
              <span>Salin Template User Lain</span>
            </button>
          )}

          {/* Add Template Button */}
          <button
            onClick={handleOpenAdd}
            disabled={unusedRhkList.length === 0}
            className={`px-3.5 py-2 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors ${
              unusedRhkList.length === 0
                ? "bg-slate-400 cursor-not-allowed opacity-70"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            title={unusedRhkList.length === 0 ? "Semua 9 RHK sudah memiliki template" : "Tambah Template Laporan Baru"}
          >
            <Plus className="w-4 h-4" />
            {unusedRhkList.length === 0 ? "Template RHK 1-9 Sudah Lengkap" : "Tambah Template Baru"}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewTab("mine")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewTab === "mine" || !isAdmin
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Template Saya ({myTemplates.length})
          </button>

          {isAdmin && (
            <button
              onClick={() => setViewTab("all")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewTab === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua Template User ({list.length})
            </button>
          )}
        </div>

        {isAdmin && viewTab === "all" && (
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterUserSearch}
              onChange={(e) => setFilterUserSearch(e.target.value)}
              placeholder="Cari nama petugas / RHK..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Form Drawer / Form Card */}
      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {editId ? "Edit Template Laporan" : "Tambah Template Laporan Baru"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor RHK Terkait
                </label>
                <select
                  value={nomorRhk}
                  onChange={(e) => setNomorRhk(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  {selectableRhkOptions.map((no) => {
                    const matchedRb = rencanaBulananList.find((rb) => rb.no_rhk === no);
                    return (
                      <option key={no} value={no}>
                        RHK {no} {matchedRb ? `- ${matchedRb.rencana_kerja.slice(0, 50)}...` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pembuat Template
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser.nama}
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-600 font-medium"
                />
              </div>
            </div>

            {/* Gemini AI Template Generator Box */}
            <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>AI Generator Template Laporan RHK {nomorRhk}</span>
                </div>
                <span className="text-[10px] text-sky-300/80 bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-800/40 font-medium">
                  Gemini AI
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Masukkan topik/kata kunci utama tugas Anda. AI akan otomatis membuat draft narasi lengkap untuk bagian Umum, Maksud & Tujuan, Ruang Lingkup, Dasar Hukum, Simpulan, dan Penutup.
              </p>

              {/* Style selection */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[11px] font-semibold text-slate-400">Style Penulisan:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAiStyle("formal")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      aiStyle === "formal"
                        ? "bg-sky-500 text-slate-950 shadow-xs"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Formal (Resmi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiStyle("ringkas")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      aiStyle === "ringkas"
                        ? "bg-sky-500 text-slate-950 shadow-xs"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Ringkas (Padat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiStyle("teknis")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      aiStyle === "teknis"
                        ? "bg-sky-500 text-slate-950 shadow-xs"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Teknis (Spesifik)
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={aiKeyword}
                  onChange={(e) => setAiKeyword(e.target.value)}
                  placeholder="Contoh: Pengawasan & pendampingan implementasi kurikulum merdeka..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={handleGenerateTemplateAI}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiLoading ? "Membuat Template..." : "Generate Template AI"}
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <RichTextEditor
                label="I. Pendahuluan - 1. Umum"
                value={umum}
                onChange={setUmum}
                placeholder="Latar belakang & gambaran umum..."
                minHeight="80px"
              />

              <RichTextEditor
                label="I. Pendahuluan - 2. Maksud dan Tujuan"
                value={maksudTujuan}
                onChange={setMaksudTujuan}
                placeholder="Maksud dan tujuan kegiatan..."
                minHeight="80px"
              />

              <RichTextEditor
                label="I. Pendahuluan - 3. Ruang Lingkup"
                value={ruangLingkup}
                onChange={setRuangLingkup}
                placeholder="Ruang lingkup kegiatan..."
                minHeight="80px"
              />

              <RichTextEditor
                label="I. Pendahuluan - 4. Dasar Hukum / Dasar Tugas"
                value={dasar}
                onChange={setDasar}
                placeholder="Peraturan/Surat Perintah Tugas..."
                minHeight="80px"
              />

              <RichTextEditor
                label="IV. Simpulan dan Saran"
                value={simpulan}
                onChange={setSimpulan}
                placeholder="Simpulan capaian & saran..."
                minHeight="80px"
              />

              <RichTextEditor
                label="V. Penutup"
                value={penutup}
                onChange={setPenutup}
                placeholder="Kalimat penutup laporan resmi..."
                minHeight="80px"
              />
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

      {/* Table Section */}
      {viewTab === "mine" ? (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-3 w-28">No RHK</th>
                  <th className="py-3 px-3">Maksud & Tujuan</th>
                  <th className="py-3 px-3">Dasar Hukum</th>
                  <th className="py-3 px-3 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Belum ada Template Laporan milik Anda ({currentUser.nama}).
                    </td>
                  </tr>
                ) : (
                  myTemplates.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-700">
                        RHK {item.nomor_rhk}
                      </td>
                      <td className="py-3 px-3 text-slate-800 line-clamp-2">
                        {item.maksud_tujuan}
                      </td>
                      <td className="py-3 px-3 text-slate-600 line-clamp-2">
                        {item.dasar}
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
                          {(!isDeleteDisabled || isAdmin) && (
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
      ) : (
        /* ALL USERS TAB */
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-3 w-40">Pembuat / User</th>
                  <th className="py-3 px-3 w-24">RHK</th>
                  <th className="py-3 px-3">Maksud & Tujuan</th>
                  <th className="py-3 px-3 w-44 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allTemplatesFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tidak ada template laporan ditemukan.
                    </td>
                  </tr>
                ) : (
                  allTemplatesFiltered.map((item, idx) => {
                    const owner = petugasList.find(
                      (p) => p.id === item.petugas_id || p.nip === item.petugas_id
                    );
                    const isMine =
                      item.petugas_id === currentUser.id ||
                      item.petugas_id === currentUser.nip;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">
                            {owner ? owner.nama : item.petugas_id}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {owner?.nip ? `NIP: ${owner.nip}` : "Sistem"}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-indigo-600">
                          RHK {item.nomor_rhk}
                        </td>
                        <td className="py-3 px-3 text-slate-700 line-clamp-2">
                          {item.maksud_tujuan}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isMine ? (
                              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                                Milik Anda
                              </span>
                            ) : !isCopyTemplateDisabled ? (
                              <button
                                onClick={() => handleQuickCopySingleTemplate(item)}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors"
                                title="Salin template ini ke akun Anda"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Salin</span>
                              </button>
                            ) : null}
                            {(!isDeleteDisabled || isAdmin) && (
                              <button
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                                title="Hapus Template"
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
      )}

      {/* COPY TEMPLATE MODAL */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Salin Template Laporan Antar User
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Duplikasi koleksi template dari satu petugas ke petugas lainnya.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Source & Target Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Pilih User Sumber (Asal Template):
                </label>
                <select
                  value={sourcePetugasId}
                  onChange={(e) => {
                    const newSource = e.target.value;
                    setSourcePetugasId(newSource);
                    const tpls = getPetugasTemplates(newSource);
                    setSelectedRhkToCopy(tpls.map((t) => Number(t.nomor_rhk)));
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih User Sumber --</option>
                  {petugasList.map((p) => {
                    const tCount = getPetugasTemplates(p.id).length;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({tCount} Template)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  2. Pilih User Tujuan (Penerima):
                </label>
                <select
                  value={targetPetugasId}
                  onChange={(e) => setTargetPetugasId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                >
                  {petugasList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} {p.id === currentUser.id ? "(Saya)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of Templates Available in Source User */}
            {sourcePetugasId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Pilih Template RHK yang Ingin Disalin:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allSrc = getPetugasTemplates(sourcePetugasId).map((t) => Number(t.nomor_rhk));
                      if (selectedRhkToCopy.length === allSrc.length) {
                        setSelectedRhkToCopy([]);
                      } else {
                        setSelectedRhkToCopy(allSrc);
                      }
                    }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Pilih Semua / Batal
                  </button>
                </div>

                {getPetugasTemplates(sourcePetugasId).length === 0 ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                    User sumber ini belum memiliki template laporan resmi.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                    {getPetugasTemplates(sourcePetugasId).map((tpl) => {
                      const rhkNo = Number(tpl.nomor_rhk);
                      const isChecked = selectedRhkToCopy.includes(rhkNo);
                      const targetAlreadyHas = getPetugasTemplates(targetPetugasId).some(
                        (t) => Number(t.nomor_rhk) === rhkNo
                      );

                      return (
                        <label
                          key={tpl.id}
                          className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isChecked
                              ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRhkToCopy((prev) => [...prev, rhkNo]);
                              } else {
                                setSelectedRhkToCopy((prev) => prev.filter((n) => n !== rhkNo));
                              }
                            }}
                            className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                RHK {rhkNo}
                              </span>
                              {targetAlreadyHas && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                  Akan Menimpa Template Lama
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {tpl.maksud_tujuan}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Overwrite Checkbox */}
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    Timpa jika target user sudah memiliki template untuk RHK yang sama
                  </span>
                </label>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteCopyTemplates}
                disabled={isCopying || selectedRhkToCopy.length === 0}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5"
              >
                {isCopying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyalin...</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Proses Salin Template</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmId}
        title="Konfirmasi Hapus Template"
        message="Apakah Anda yakin ingin menghapus template laporan resmi ini?"
        confirmLabel="Hapus Template"
        isLoading={isDeleting}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          const id = deleteConfirmId;
          setIsDeleting(true);
          try {
            const ok = await onDelete(id);
            if (ok) {
              addToast("success", "Template laporan berhasil dihapus");
            } else {
              addToast("error", "Gagal menghapus template laporan");
            }
          } catch (err) {
            addToast("error", "Gagal menghapus template laporan");
          } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
          }
        }}
      />
    </div>
  );
};

