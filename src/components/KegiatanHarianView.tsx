import React, { useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import JSZip from "jszip";
import { RichTextEditor } from "./RichTextEditor";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import {
  KegiatanHarian,
  Petugas,
  RencanaBulanan,
  RencanaHarian,
  LaporanTemplate,
  ToastMessage,
  AppSettings,
  ModulP2K2,
} from "../types";
import {
  compressImageFile,
  compressBase64Image,
  getIndonesianDayName,
  formatIndonesianDate,
} from "../lib/imageUtils";

// Helper function to render clean formatted HTML or plain text without raw tags or squished lines
const renderFormattedContent = (content: string | undefined | null) => {
  if (!content || content.trim() === "" || content === "-") {
    return <span className="text-slate-500 italic font-serif">-</span>;
  }
  const trimmed = content.trim();
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return (
      <div
        className="prose max-w-none text-slate-900 leading-relaxed font-serif text-inherit [&_*]:font-serif [&_*]:text-inherit [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:list-disc [&>ul]:pl-5 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_p]:text-inherit [&_li]:text-inherit [&_span]:text-inherit [&_div]:text-inherit [&_strong]:font-bold"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  return (
    <div className="whitespace-pre-line leading-relaxed font-serif text-slate-900 text-inherit">
      {trimmed}
    </div>
  );
};
import {
  Plus,
  Search,
  Filter,
  Printer,
  Copy,
  Edit2,
  Trash2,
  Upload,
  Download,
  Sparkles,
  CloudUpload,
  X,
  RotateCcw,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  CheckSquare,
  Square,
  ShieldAlert,
  Users,
  BookOpen,
  Check,
  Lock,
  FileText,
} from "lucide-react";

interface KegiatanHarianViewProps {
  currentUser: Petugas;
  kegiatanList: KegiatanHarian[];
  rencanaBulananList: RencanaBulanan[];
  rencanaHarianList: RencanaHarian[];
  laporanList?: LaporanTemplate[];
  petugasList?: Petugas[];
  modulP2k2List?: ModulP2K2[];
  isLicensed: boolean;
  limitReached: boolean;
  appSettings?: AppSettings;
  onSaveKegiatan: (data: Omit<KegiatanHarian, "id">, id?: string) => Promise<boolean>;
  onDeleteKegiatan: (id: string) => Promise<boolean>;
  onPrintReport: (kegiatan: KegiatanHarian) => void;
  onPrintReportList?: (kegiatanList: KegiatanHarian[]) => void;
  addToast: (type: ToastMessage["type"], title: string) => void;
  onNavigateToLisensi: () => void;
}

export const KegiatanHarianView: React.FC<KegiatanHarianViewProps> = ({
  currentUser,
  kegiatanList,
  rencanaBulananList,
  rencanaHarianList,
  laporanList = [],
  petugasList = [],
  modulP2k2List = [],
  isLicensed,
  limitReached,
  appSettings,
  onSaveKegiatan,
  onDeleteKegiatan,
  onPrintReport,
  onPrintReportList,
  addToast,
  onNavigateToLisensi,
}) => {
  const isAdmin = currentUser.level === "ADMIN";

  // Feature Permissions for non-admin
  const permissions = appSettings?.feature_permissions || {};
  const isAddDisabled = !isAdmin && !!permissions.disableUserAdd;
  const isEditDisabled = !isAdmin && !!permissions.disableUserEdit;
  const isDeleteDisabled = !isAdmin && !!permissions.disableUserDelete;
  const isPrintPdfDisabled = !isAdmin && !!permissions.disableUserPrintPdf;

  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [editId, setEditId] = useState<string | null>(null);

  // Filters
  const [tglAwal, setTglAwal] = useState("");
  const [tglAkhir, setTglAkhir] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Checkbox Selection for Manual Bulk Delete (Admin)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Admin Auto/Mass Delete Modal State
  const [showAdminDeleteModal, setShowAdminDeleteModal] = useState(false);
  const [adminDeleteTab, setAdminDeleteTab] = useState<"month" | "range">("month");
  const [adminDeleteMonth, setAdminDeleteMonth] = useState<string>(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [adminDeleteYear, setAdminDeleteYear] = useState<string>(
    String(new Date().getFullYear())
  );
  const [adminDeleteStartDate, setAdminDeleteStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [adminDeleteEndDate, setAdminDeleteEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [adminDeletePetugasId, setAdminDeletePetugasId] = useState<string>("ALL");
  const [isMassDeleting, setIsMassDeleting] = useState<boolean>(false);

  // Form states
  const [formTanggal, setFormTanggal] = useState("");
  const [formHari, setFormHari] = useState("");
  const [formWaktu, setFormWaktu] = useState("08:00 - 12:00 WIB");
  const [formTempat, setFormTempat] = useState("");
  const [formDesa, setFormDesa] = useState("");
  const [formRbId, setFormRbId] = useState("");
  const [formRhId, setFormRhId] = useState("");
  const [formModulP2k2Id, setFormModulP2k2Id] = useState("");
  const [formSesiP2k2List, setFormSesiP2k2List] = useState<string[]>([]);
  const [formIsi, setFormIsi] = useState("");
  const [formHasil, setFormHasil] = useState("");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);

  // Format P2K2 Text with Aligned Colons (Supports Multiple Sessions)
  const formatP2K2Text = (
    mod: ModulP2K2,
    selectedSesiList: { text: string; index: number }[]
  ) => {
    if (selectedSesiList.length === 0) {
      return `Pelaksanaan Kegiatan P2K2: ${mod.nama_modul} (${mod.kode_modul})`;
    }

    const parsedSessions = selectedSesiList.map(({ text, index }) => {
      let sessionLabel = "";
      let sessionTitle = text.trim();

      if (text.includes(":")) {
        const parts = text.split(":");
        sessionLabel = parts[0].trim();
        sessionTitle = parts.slice(1).join(":").trim();
      } else if (text.toLowerCase().startsWith("sesi")) {
        const spaceIdx = text.indexOf(" ");
        if (spaceIdx !== -1) {
          sessionLabel = text.substring(0, spaceIdx).trim();
          sessionTitle = text.substring(spaceIdx + 1).trim();
        }
      }

      if (!sessionLabel) {
        sessionLabel = `Sesi ${index + 1}`;
      }

      return { sessionLabel, sessionTitle };
    });

    // Calculate max label length among "Modul" and all selected session labels
    let maxLen = "Modul".length;
    parsedSessions.forEach((s) => {
      if (s.sessionLabel.length > maxLen) {
        maxLen = s.sessionLabel.length;
      }
    });

    const modulLabelPadded = "Modul".padEnd(maxLen, " ");
    const line1 = `Pelaksanaan Kegiatan P2K2 sesuai dengan ketentuan: `;
    const line2 = `${modulLabelPadded} : ${mod.nama_modul} (${mod.kode_modul})`;

    const sessionLines = parsedSessions.map((s) => {
      const sessionLabelPadded = s.sessionLabel.padEnd(maxLen, " ");
      return `${sessionLabelPadded} : ${s.sessionTitle}`;
    });

    return `${line1}\n${line2}\n${sessionLines.join("\n")}`;
  };

  // AI Assistant state
  const [aiKeyword, setAiKeyword] = useState("");
  const [aiStyle, setAiStyle] = useState<"formal" | "ringkas" | "teknis">("formal");
  const [aiLoading, setAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image Popup Modal
  const [popupImage, setPopupImage] = useState<string | null>(null);

  // Delete Confirm Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // CSV Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthOptions = [
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  const hariOptions = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
  ];

  // Auto handle date change -> set Indonesian Day
  const handleTanggalChange = (val: string) => {
    setFormTanggal(val);
    const dayName = getIndonesianDayName(val);
    if (dayName) {
      setFormHari(dayName);
    }
  };

  // Helper to find activities matching the Admin Auto-Delete criteria
  const getMatchingAutoDeleteKegiatan = () => {
    return kegiatanList.filter((item) => {
      // Petugas filter
      if (adminDeletePetugasId !== "ALL") {
        const p = petugasList.find((x) => x.id === adminDeletePetugasId);
        const matchP =
          item.petugas_id === adminDeletePetugasId ||
          (p && item.petugas_id === p.id) ||
          (p && item.petugas_id === p.nip);
        if (!matchP) return false;
      }

      if (adminDeleteTab === "month") {
        const prefix = `${adminDeleteYear}-${adminDeleteMonth}`;
        return item.tanggal.startsWith(prefix);
      } else {
        if (!adminDeleteStartDate || !adminDeleteEndDate) return false;
        return item.tanggal >= adminDeleteStartDate && item.tanggal <= adminDeleteEndDate;
      }
    });
  };

  // Execute Batch Delete (for manually checked rows)
  const handleExecuteBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchDeleting(true);
    let countSuccess = 0;
    try {
      for (const id of selectedIds) {
        const ok = await onDeleteKegiatan(id);
        if (ok) countSuccess++;
      }
      addToast("success", `Berhasil menghapus ${countSuccess} kegiatan harian.`);
      setSelectedIds([]);
      setShowBatchDeleteModal(false);
    } catch (err) {
      console.error("Batch delete error:", err);
      addToast("error", "Gagal menghapus beberapa data kegiatan.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Execute Auto/Mass Delete (for month/date range filter)
  const handleExecuteMassDelete = async () => {
    const matching = getMatchingAutoDeleteKegiatan();
    if (matching.length === 0) {
      addToast("warning", "Tidak ada data kegiatan yang cocok untuk dihapus.");
      return;
    }

    setIsMassDeleting(true);
    let countSuccess = 0;
    try {
      for (const item of matching) {
        const ok = await onDeleteKegiatan(item.id);
        if (ok) countSuccess++;
      }
      addToast("success", `Penghapusan otomatis selesai! ${countSuccess} kegiatan harian berhasil dihapus.`);
      setShowAdminDeleteModal(false);
    } catch (err) {
      console.error("Mass delete error:", err);
      addToast("error", "Gagal melakukan penghapusan otomatis.");
    } finally {
      setIsMassDeleting(false);
    }
  };

  // Filtered Kegiatan List
  const filteredKegiatan = kegiatanList.filter((item) => {
    // User role scoping
    if (
      currentUser.level !== "ADMIN" &&
      item.petugas_id !== currentUser.id &&
      item.petugas_id !== currentUser.nip
    ) {
      return false;
    }

    // Date range filter
    if (tglAwal && item.tanggal < tglAwal) return false;
    if (tglAkhir && item.tanggal > tglAkhir) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTempat = item.tempat?.toLowerCase().includes(q);
      const matchDesa = item.desa?.toLowerCase().includes(q);
      const matchIsi = item.isi_kegiatan?.toLowerCase().includes(q);
      if (!matchTempat && !matchDesa && !matchIsi) return false;
    }

    return true;
  });

  // Open Form for Add
  const handleOpenAdd = () => {
    if (isAddDisabled) {
      addToast("warning", "Fitur Tambah Kegiatan baru telah dinonaktifkan oleh Admin.");
      return;
    }

    if (limitReached) {
      addToast(
        "error",
        "Batas trial (5 kegiatan) telah tercapai! Silakan aktivasi lisensi."
      );
      onNavigateToLisensi();
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    setIsSubmitting(false);
    setEditId(null);
    setFormTanggal(todayStr);
    setFormHari(getIndonesianDayName(todayStr) || "Senin");
    setFormWaktu("08:00 - 12:00 WIB");
    setFormTempat("");
    setFormDesa("");
    setFormRbId(rencanaBulananList[0]?.id || "");
    setFormRhId("");
    setFormModulP2k2Id("");
    setFormSesiP2k2List([]);
    setFormIsi("");
    setFormHasil("");
    setFormPhotos([]);
    setAiKeyword("");
    setViewMode("form");
  };

  // Open Form for Copy
  const handleOpenCopy = (item: KegiatanHarian) => {
    if (isAddDisabled) {
      addToast("warning", "Fitur Tambah Kegiatan baru telah dinonaktifkan oleh Admin.");
      return;
    }

    if (limitReached) {
      addToast(
        "error",
        "Batas trial (5 kegiatan) telah tercapai! Silakan aktivasi lisensi."
      );
      onNavigateToLisensi();
      return;
    }

    setIsSubmitting(false);
    setEditId(null);
    setFormTanggal(item.tanggal);
    setFormHari(item.haritglkegiatan);
    setFormWaktu(item.waktu);
    setFormTempat(item.tempat);
    setFormDesa(item.desa);
    setFormRbId(item.rencana_bulanan_id);
    setFormRhId(item.rencana_harian_id);
    setFormModulP2k2Id(item.modul_p2k2_id || "");
    setFormSesiP2k2List([]);
    setFormIsi(item.isi_kegiatan);
    setFormHasil(item.hasil);
    setFormPhotos([]); // Photos not copied as requested
    setAiKeyword("");
    addToast(
      "info",
      "Data disalin. Silakan sesuaikan dan simpan sebagai kegiatan baru."
    );
    setViewMode("form");
  };

  // Open Form for Edit
  const handleOpenEdit = (item: KegiatanHarian) => {
    if (isEditDisabled) {
      addToast("warning", "Fitur Edit Kegiatan telah dinonaktifkan oleh Admin.");
      return;
    }

    setIsSubmitting(false);
    setEditId(item.id);
    setFormTanggal(item.tanggal);
    setFormHari(item.haritglkegiatan);
    setFormWaktu(item.waktu);
    setFormTempat(item.tempat);
    setFormDesa(item.desa);
    setFormRbId(item.rencana_bulanan_id);
    setFormRhId(item.rencana_harian_id);
    setFormModulP2k2Id(item.modul_p2k2_id || "");
    setFormSesiP2k2List([]);
    setFormIsi(item.isi_kegiatan);
    setFormHasil(item.hasil);
    setFormPhotos(item.foto_kegiatan1 || []);
    setAiKeyword("");
    setViewMode("form");
  };

  // Handle Photo File Upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        try {
          const compressed = await compressImageFile(file, 80);
          newPhotos.push(compressed);
        } catch (err) {
          console.error("Compression failed:", err);
        }
      }
    }

    setFormPhotos((prev) => [...prev, ...newPhotos]);
    addToast("success", `${newPhotos.length} foto berhasil ditambahkan!`);
  };

  // Remove Photo
  const handleRemovePhoto = (idx: number) => {
    setFormPhotos((prev) => prev.filter((_, i) => i !== idx));
    addToast("info", "Foto dihapus");
  };

  // Handle Generate AI Narrative
  const handleGenerateAI = async () => {
    if (!aiKeyword.trim()) {
      addToast("warning", "Masukkan kata kunci terlebih dahulu!");
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch("/api/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: aiKeyword.trim(), style: aiStyle }),
      });

      if (!res.ok) throw new Error("Gagal menghubungi server AI");

      const data = await res.json();
      if (data.isi && data.hasil) {
        setFormIsi(data.isi);
        setFormHasil(data.hasil);
        addToast("success", `Narasi laporan (${aiStyle.toUpperCase()}) berhasil dibuat oleh AI!`);
      }
    } catch (err) {
      console.error(err);
      addToast("error", "Gagal memproses AI. Coba kata kunci lain.");
    } finally {
      setAiLoading(false);
    }
  };

  // Save Form Submit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTanggal || !formHari || !formRbId) {
      addToast("warning", "Lengkapi kolom Tanggal, Hari, dan Rencana Bulanan!");
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure all photos in formPhotos are compressed strictly under 80KB each
      const compressedPhotos = await Promise.all(
        formPhotos.map((photo) => compressBase64Image(photo, 80))
      );

      const payload: Omit<KegiatanHarian, "id"> = {
        tanggal: formTanggal,
        haritglkegiatan: formHari,
        waktu: formWaktu,
        tempat: formTempat,
        desa: formDesa,
        rencana_bulanan_id: formRbId,
        rencana_harian_id: formRhId,
        modul_p2k2_id: formModulP2k2Id || "",
        isi_kegiatan: formIsi,
        hasil: formHasil,
        foto_kegiatan1: compressedPhotos,
        petugas_id: currentUser.id,
        createdAt: new Date().toISOString(),
      };

      const success = await onSaveKegiatan(payload, editId || undefined);
      if (success) {
        addToast(
          "success",
          editId ? "Kegiatan berhasil diperbarui" : "Kegiatan berhasil disimpan"
        );
        // Reset filters so newly saved item is immediately visible
        setTglAwal("");
        setTglAkhir("");
        setSearchQuery("");
        setViewMode("list");
      } else {
        addToast("error", "Gagal menyimpan kegiatan. Coba periksa kembali data Anda.");
      }
    } catch (err) {
      console.error(err);
      addToast("error", "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Excel / CSV
  const handleExportExcel = () => {
    if (filteredKegiatan.length === 0) {
      addToast("warning", "Tidak ada data untuk diekspor!");
      return;
    }

    let csvContent =
      "data:text/csv;charset=utf-8,No,Tanggal,Hari,Waktu,Tempat,Desa,Isi Kegiatan,Hasil\n";
    filteredKegiatan.forEach((item, idx) => {
      const cleanIsi = `"${(item.isi_kegiatan || "").replace(/"/g, '""')}"`;
      const cleanHasil = `"${(item.hasil || "").replace(/"/g, '""')}"`;
      csvContent += `${idx + 1},${item.tanggal},${item.haritglkegiatan},${item.waktu},${item.tempat},${item.desa},${cleanIsi},${cleanHasil}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Kegiatan_Harian_${currentUser.nip}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("success", "File CSV berhasil diunduh");
  };

  // Export All / Selected Kegiatan to PDF directly using official report format bundled into ZIP
  const [isGeneratingPdfAll, setIsGeneratingPdfAll] = useState(false);
  const [pdfExportProgressText, setPdfExportProgressText] = useState("");

  const handleExportAllPdf = async () => {
    const itemsToExport =
      selectedIds.length > 0
        ? filteredKegiatan.filter((item) => selectedIds.includes(item.id))
        : filteredKegiatan;

    if (itemsToExport.length === 0) {
      addToast("warning", "Tidak ada data kegiatan untuk diekspor ke PDF!");
      return;
    }

    setIsGeneratingPdfAll(true);
    setPdfExportProgressText(`Menyiapkan ${itemsToExport.length} file...`);

    // Brief delay to ensure DOM elements are ready for rendering
    await new Promise((resolve) => setTimeout(resolve, 350));

    try {
      const zip = new JSZip();
      const usedFileNames = new Set<string>();
      const rhkCounters = new Map<string, number>();

      for (let i = 0; i < itemsToExport.length; i++) {
        const kegItem = itemsToExport[i];
        setPdfExportProgressText(`Proses ${i + 1}/${itemsToExport.length}...`);

        const element = document.getElementById(`export-single-paper-${kegItem.id}`);
        if (!element) continue;

        const parentRb = rencanaBulananList.find((rb) => rb.id === kegItem.rencana_bulanan_id);
        const parentRh = rencanaHarianList.find((rh) => rh.id === kegItem.rencana_harian_id);

        const noRb = parentRb ? String(parentRb.no_rhk ?? "").trim() : "";
        const noRh = parentRh ? String(parentRh.norhkharian ?? "").trim() : "";

        // Track sequence counter per distinct RHK group
        const rhkKey = `${kegItem.rencana_bulanan_id || noRb}__${kegItem.rencana_harian_id || noRh}`;
        const noUrut = (rhkCounters.get(rhkKey) || 0) + 1;
        rhkCounters.set(rhkKey, noUrut);

        // Determine RHK Label (e.g. RHK. 8.1.1 - showing RHK Bulanan 8, RHK Harian 1, no urut 1)

        let rhkLabel = "RHK";
        if (noRb && noRh) {
          rhkLabel = `RHK. ${noRb}.${noRh}.${noUrut}`;
        } else if (noRb) {
          rhkLabel = `RHK. ${noRb}.${noUrut}`;
        } else if (noRh) {
          rhkLabel = `RHK.${noRh}.${noUrut}`;
        } else {
          rhkLabel = `RHK.${noUrut}`;
        }

        // Determine Date (DD-MM-YYYY)
        let tglFormatted = "01-01-2026";
        if (kegItem.tanggal) {
          const parts = kegItem.tanggal.split("-");
          if (parts.length === 3 && parts[0].length === 4) {
            tglFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else {
            tglFormatted = kegItem.tanggal.replace(/[/\\?%*:|"<>]/g, "-");
          }
        }

        const baseFileName = `${rhkLabel} - ${tglFormatted}.pdf`.replace(/[/\\?%*:|"<>]/g, "_");
        let fileName = baseFileName;
        let counter = 1;
        while (usedFileNames.has(fileName)) {
          const nameWithoutExt = baseFileName.replace(/\.pdf$/i, "");
          fileName = `${nameWithoutExt} (${counter}).pdf`;
          counter++;
        }
        usedFileNames.add(fileName);

        const opt = {
          margin: [10, 10, 10, 10] as [number, number, number, number],
          filename: fileName,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: 718, // 190mm in px at 96dpi is ~718px
            onclone: (clonedDoc: Document) => {
              clonedDoc.documentElement.classList.remove("dark");
              clonedDoc.body.classList.remove("dark");
              clonedDoc.documentElement.style.backgroundColor = "#ffffff";
              clonedDoc.body.style.backgroundColor = "#ffffff";

              const images = Array.from(clonedDoc.querySelectorAll("img"));
              images.forEach((img) => {
                if (img.src && !img.src.startsWith("data:")) {
                  img.crossOrigin = "anonymous";
                }
              });

              const styleTags = Array.from(clonedDoc.querySelectorAll("style"));
              styleTags.forEach((styleTag) => {
                if (styleTag.textContent && styleTag.textContent.includes("oklch")) {
                  let css = styleTag.textContent;
                  css = css.replace(/(--tw-[a-z0-9-]*:\s*)[^;]*oklch\([^)]+\)/gi, "$1rgba(0,0,0,0)");
                  css = css.replace(/oklch\(([^)]+)\)/gi, "rgba(15, 23, 42, 0.8)");
                  styleTag.textContent = css;
                }
              });

              // Only avoid breaking inside signature or specific photo items
              const avoidEls = clonedDoc.querySelectorAll(".signature-box, .photo-item, .prevent-break");
              avoidEls.forEach((el) => {
                const htmlEl = el as HTMLElement;
                htmlEl.style.breakInside = "avoid";
                htmlEl.style.pageBreakInside = "avoid";
              });
            },
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
          pagebreak: {
            mode: ["css", "legacy"],
            before: ".break-before-page",
            avoid: [".signature-box", ".photo-item", ".prevent-break"],
          },
        };

        try {
          const pdfBlob: Blob = await html2pdf().set(opt).from(element).output("blob");
          if (pdfBlob && pdfBlob.size > 0) {
            zip.file(fileName, pdfBlob);
          }
        } catch (itemErr) {
          console.error(`Gagal membuat PDF untuk ${fileName}:`, itemErr);
          try {
            const fallbackOpt = {
              ...opt,
              html2canvas: { ...opt.html2canvas, scale: 1 },
            };
            const pdfBlob: Blob = await html2pdf().set(fallbackOpt).from(element).output("blob");
            if (pdfBlob && pdfBlob.size > 0) {
              zip.file(fileName, pdfBlob);
            }
          } catch (fallbackErr) {
            console.error(`Fallback PDF gagal untuk ${fileName}:`, fallbackErr);
          }
        }

        // Brief delay between renders to prevent canvas memory bottlenecks
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setPdfExportProgressText("Mengemas file ZIP...");
      const zipBlob = await zip.generateAsync(
        {
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          setPdfExportProgressText(`Mengemas ZIP (${Math.round(metadata.percent)}%)...`);
        }
      );

      const zipFileName = `Rekap_Laporan_Kegiatan_${currentUser.nip || "ASN"}_${new Date().toISOString().split("T")[0]}.zip`;

      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = zipFileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      }, 20000);

      addToast(
        "success",
        `Berhasil mengunduh ZIP (${itemsToExport.length} file PDF laporan resmi)!`
      );
    } catch (err) {
      console.error("Export PDF ZIP Error:", err);
      addToast("error", "Gagal mengunduh file ZIP laporan kegiatan.");
    } finally {
      setIsGeneratingPdfAll(false);
      setPdfExportProgressText("");
    }
  };

  // Available Rencana Harian dropdown filtered by selected Rencana Bulanan
  const filteredRencanaHarian = rencanaHarianList.filter(
    (rh) => rh.rencana_kerja_bulanan_id === formRbId
  );
  const selectedRb = rencanaBulananList.find((rb) => rb.id === formRbId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {viewMode === "form"
              ? editId
                ? "Edit Kegiatan Harian"
                : "Tambah / Salin Kegiatan Harian"
              : "Daftar Kegiatan Harian"}
          </h1>
          <p className="text-xs text-slate-500">
            Pencatatan Aktivitas Kinerja ASN dan Dokumentasi Lapangan
          </p>
        </div>

        {viewMode === "list" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Admin Auto/Mass Delete Button */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminDeleteModal(true)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Hapus Otomatis kegiatan harian berdasarkan Bulan / Rentang Tanggal (Fitur Admin)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Otomatis / Massal</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>

            {/* Export All to PDF Button */}
            <button
              onClick={handleExportAllPdf}
              disabled={isGeneratingPdfAll}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-md text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Ekspor seluruh kegiatan harian (atau hasil filter) ke format PDF Laporan Resmi dalam 1 file ZIP"
            >
              {isGeneratingPdfAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{pdfExportProgressText || "Mengekspor PDF..."}</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Export All ke ZIP (PDF)</span>
                </>
              )}
            </button>

            {limitReached ? (
              <button
                onClick={onNavigateToLisensi}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Limit Trial (Aktivasi)
              </button>
            ) : isAddDisabled ? (
              <button
                disabled
                className="px-4 py-2 bg-slate-200 text-slate-500 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed border border-slate-300"
                title="Fitur Tambah Kegiatan dinonaktifkan oleh Admin"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Tambah Kegiatan (Nonaktif)
              </button>
            ) : (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Tambah Kegiatan
              </button>
            )}
          </div>
        )}
      </div>

      {/* FORM VIEW */}
      {viewMode === "form" ? (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
          <form onSubmit={handleSubmitForm} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formTanggal}
                  onChange={(e) => handleTanggalChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hari <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formHari}
                  onChange={(e) => setFormHari(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">- Pilih Hari -</option>
                  {hariOptions.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Waktu Pelaksanaan
                </label>
                <input
                  type="text"
                  value={formWaktu}
                  onChange={(e) => setFormWaktu(e.target.value)}
                  placeholder="Contoh: 08:30 - 12:00 WIB"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tempat
                </label>
                <input
                  type="text"
                  value={formTempat}
                  onChange={(e) => setFormTempat(e.target.value)}
                  placeholder="Contoh: Kantor Desa / Balai Pertemuan"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Desa / Kelurahan
                </label>
                <input
                  type="text"
                  value={formDesa}
                  onChange={(e) => setFormDesa(e.target.value)}
                  placeholder="Contoh: Kualasimpang"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rencana Bulanan (RHK Bulanan) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formRbId}
                  onChange={(e) => {
                    const newRbId = e.target.value;
                    setFormRbId(newRbId);
                    setFormRhId("");
                    const newRb = rencanaBulananList.find((r) => r.id === newRbId);
                    if (newRb?.no_rhk !== 2) {
                      setFormModulP2k2Id("");
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">- Pilih Rencana Bulanan -</option>
                  {rencanaBulananList.map((rb) => (
                    <option key={rb.id} value={rb.id}>
                      RHK {rb.no_rhk} - {rb.rencana_kerja.slice(0, 70)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rencana Harian (Relasi RHK Harian)
                </label>
                <select
                  value={formRhId}
                  onChange={(e) => setFormRhId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">- Pilih Rencana Harian -</option>
                  {filteredRencanaHarian.map((rh) => (
                    <option key={rh.id} value={rh.id}>
                      No. {rh.norhkharian} - {rh.rencana_harian.slice(0, 80)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Master Modul P2K2 Selection for RHK 2 */}
              {selectedRb?.no_rhk === 2 && (
                <div className="md:col-span-2 bg-indigo-50/80 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Pilih Modul & Sesi P2K2 (RHK 2)
                    </label>
                    <span className="text-[10px] bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded-full">
                      FDS / P2K2 PKH
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      1. Pilih Modul P2K2:
                    </label>
                    <select
                      value={formModulP2k2Id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormModulP2k2Id(val);
                        setFormSesiP2k2List([]);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Pilih Modul P2K2 Database --</option>
                      {modulP2k2List.map((m) => {
                        const lines = m.materi_sesi
                          ? m.materi_sesi.split("\n").filter((s) => s.trim().length > 0)
                          : [];
                        const actualSesi = lines.length > 0 ? lines.length : (m.jumlah_sesi || 1);
                        return (
                          <option key={m.id} value={m.id}>
                            {m.kode_modul} - {m.nama_modul} ({actualSesi} Sesi)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {formModulP2k2Id && (() => {
                    const selectedMod = modulP2k2List.find((m) => m.id === formModulP2k2Id);
                    if (!selectedMod) return null;

                    const sessionLines = selectedMod.materi_sesi
                      ? selectedMod.materi_sesi
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : [selectedMod.deskripsi || "Sesi 1: Pelaksanaan P2K2"];

                    const handleToggleSesi = (sesiText: string) => {
                      let nextList: string[];
                      if (formSesiP2k2List.includes(sesiText)) {
                        nextList = formSesiP2k2List.filter((s) => s !== sesiText);
                      } else {
                        nextList = [...formSesiP2k2List, sesiText];
                      }
                      setFormSesiP2k2List(nextList);

                      const selectedItems = sessionLines
                        .map((line, index) => ({ text: line, index }))
                        .filter((item) => nextList.includes(item.text));

                      const formatted = formatP2K2Text(selectedMod, selectedItems);
                      setFormIsi(formatted);
                    };

                    const handleSelectAllSesi = () => {
                      setFormSesiP2k2List(sessionLines);
                      const selectedItems = sessionLines.map((line, index) => ({
                        text: line,
                        index,
                      }));
                      const formatted = formatP2K2Text(selectedMod, selectedItems);
                      setFormIsi(formatted);
                    };

                    const handleClearAllSesi = () => {
                      setFormSesiP2k2List([]);
                      setFormIsi(
                        `Pelaksanaan Kegiatan P2K2: ${selectedMod.nama_modul} (${selectedMod.kode_modul})`
                      );
                    };

                    return (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900 text-xs space-y-3">
                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                          <span>{selectedMod.nama_modul}</span>
                        </div>

                        {/* Session Selection Header & Controls */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">
                              2. Pilih Sesi Pembelajaran (Dapat Memilih Lebih Dari 1):
                            </label>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Terpilih: <strong className="text-indigo-600 dark:text-indigo-400">{formSesiP2k2List.length}</strong> dari {sessionLines.length} Sesi
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={handleSelectAllSesi}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold transition-colors"
                            >
                              Pilih Semua
                            </button>
                            <button
                              type="button"
                              onClick={handleClearAllSesi}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold transition-colors"
                            >
                              Reset
                            </button>
                          </div>
                        </div>

                        {/* Interactive Session Checkbox Badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {sessionLines.map((sesi, idx) => {
                            const isSelected = formSesiP2k2List.includes(sesi);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleToggleSesi(sesi)}
                                className={`p-2.5 rounded-lg border text-left text-[11px] transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold"
                                    : "bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                <div className="flex items-start gap-2 min-w-0">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-white shrink-0 mt-0.5" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                  )}
                                  <span className="line-clamp-2">
                                    {sesi.includes(":") ? sesi : `Sesi ${idx + 1}: ${sesi}`}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Drag and Drop Photo Upload Section */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Dokumentasi Foto Kegiatan (Multi Upload Drag & Drop)
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <CloudUpload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  Drag & Drop foto di sini atau <span className="text-blue-600">klik untuk pilih</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Foto dikompres otomatis dibawah 200KB. format JPG/PNG.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Photos Preview */}
              {formPhotos.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {formPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={photo}
                        alt={`Dokumentasi ${idx}`}
                        className="w-20 h-20 object-cover rounded-lg border border-slate-300 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition-colors"
                        title="Hapus Foto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gemini AI Generator Box */}
            <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>AI Assistant Narasi Laporan</span>
                </div>
                <span className="text-[10px] text-amber-300/80 bg-amber-900/30 px-2 py-0.5 rounded-full border border-amber-700/40">
                  Powered by Gemini AI
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Ketik kata kunci singkat kegiatan Anda (misal: "Rapat koordinasi evaluasi verifikasi data PKH") lalu pilih gaya penulisan & klik Generate AI.
              </p>

              {/* Style Selector Pills */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-400">Gaya Penulisan:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAiStyle("formal")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      aiStyle === "formal"
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Formal (Birokrasi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiStyle("ringkas")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      aiStyle === "ringkas"
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Ringkas (To-The-Point)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiStyle("teknis")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      aiStyle === "teknis"
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Teknis (Analitis)
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={aiKeyword}
                  onChange={(e) => setAiKeyword(e.target.value)}
                  placeholder="Ketik kata kunci kegiatan..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={handleGenerateAI}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiLoading ? "Generasi AI..." : "Generate AI"}
                </button>
              </div>
            </div>

            {/* Rich Text Editor for Isi Kegiatan */}
            <RichTextEditor
              label="Isi Kegiatan (WYSIWYG Rich Text)"
              value={formIsi}
              onChange={setFormIsi}
              placeholder="Deskripsi rinci pelaksanaan kegiatan..."
              minHeight="140px"
            />

            {/* Rich Text Editor for Hasil Capaian */}
            <RichTextEditor
              label="Hasil Capaian (WYSIWYG Rich Text)"
              value={formHasil}
              onChange={setFormHasil}
              placeholder="Capaian dan hasil yang diperoleh dari kegiatan..."
              minHeight="140px"
            />

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-md text-xs shadow-sm transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Data...</span>
                  </>
                ) : editId ? (
                  "Update Kegiatan"
                ) : (
                  "Simpan Kegiatan Baru"
                )}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-md text-xs transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-4">
          {/* Filter Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Filter Tanggal & Pencarian</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Tanggal Awal
                </label>
                <input
                  type="date"
                  value={tglAwal}
                  onChange={(e) => setTglAwal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={tglAkhir}
                  onChange={(e) => setTglAkhir(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Cari Tempat / Isi
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Kata kunci..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 pl-8 pr-2.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setTglAwal("");
                    setTglAkhir("");
                    setSearchQuery("");
                  }}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Filter
                </button>
              </div>
            </div>
          </div>

          {/* Batch Selection Action Bar */}
          {selectedIds.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-indigo-900 text-xs font-bold">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <span>Terpilih {selectedIds.length} kegiatan harian</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
                >
                  Batal Pilih
                </button>
                <button
                  type="button"
                  onClick={handleExportAllPdf}
                  disabled={isGeneratingPdfAll}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  {isGeneratingPdfAll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{pdfExportProgressText || "Proses PDF..."}</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5 text-indigo-200" />
                      <span>Export PDF ({selectedIds.length} Terpilih)</span>
                    </>
                  )}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowBatchDeleteModal(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus {selectedIds.length} Terpilih</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Table Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">
                Total: {filteredKegiatan.length} Record Data
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredKegiatan.length > 0 &&
                          filteredKegiatan.every((k) => selectedIds.includes(k.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredKegiatan.map((k) => k.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        title="Pilih Semua"
                      />
                    </th>
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3 w-32">Aksi</th>
                    <th className="py-3 px-3 w-32">Hari / Tanggal</th>
                    <th className="py-3 px-3 w-36">Waktu & Tempat</th>
                    <th className="py-3 px-3">RHK & Description</th>
                    <th className="py-3 px-3 w-32">Foto Documentation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKegiatan.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Belum ada data kegiatan harian.
                      </td>
                    </tr>
                  ) : (
                    filteredKegiatan.map((item, idx) => {
                      const rbObj = rencanaBulananList.find(
                        (rb) => rb.id === item.rencana_bulanan_id
                      );
                      const rhObj = rencanaHarianList.find(
                        (rh) => rh.id === item.rencana_harian_id
                      );

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds((prev) => [...prev, item.id]);
                                } else {
                                  setSelectedIds((prev) =>
                                    prev.filter((id) => id !== item.id)
                                  );
                                }
                              }}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1">
                              {!isPrintPdfDisabled && (
                                <button
                                  onClick={() => onPrintReport(item)}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                                  title="Cetak Laporan PDF"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isAddDisabled && (
                                <button
                                  onClick={() => handleOpenCopy(item)}
                                  className="p-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-colors"
                                  title="Salin Data"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}

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
                                  className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">
                              {item.haritglkegiatan}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {formatIndonesianDate(item.tanggal)}
                            </span>
                          </td>

                          <td className="py-3 px-3 space-y-1">
                            <p className="text-[11px] text-slate-800 font-medium">
                              {item.waktu || "-"}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {item.tempat} {item.desa ? `(${item.desa})` : ""}
                            </p>
                          </td>

                          <td className="py-3 px-3 space-y-1">
                            {rbObj && (
                              <p className="text-[11px] font-semibold text-blue-700">
                                RHK {rbObj.no_rhk}: {rbObj.rencana_kerja}
                              </p>
                            )}
                            {item.modul_p2k2_id && (() => {
                              const mObj = modulP2k2List.find((m) => m.id === item.modul_p2k2_id);
                              if (!mObj) return null;
                              return (
                                <div className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                                  <BookOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                  <span>{mObj.kode_modul}: {mObj.nama_modul}</span>
                                </div>
                              );
                            })()}
                            <p className="text-xs text-slate-800 line-clamp-2">
                              {(() => {
                                if (!item.isi_kegiatan) return "-";
                                const doc = new DOMParser().parseFromString(item.isi_kegiatan, "text/html");
                                return doc.body.textContent || item.isi_kegiatan;
                              })()}
                            </p>
                          </td>

                          <td className="py-3 px-3">
                            {item.foto_kegiatan1 && item.foto_kegiatan1.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.foto_kegiatan1.map((foto, fIdx) => (
                                  <img
                                    key={fIdx}
                                    src={foto}
                                    alt="thumb"
                                    onClick={() => setPopupImage(foto)}
                                    className="w-8 h-8 object-cover rounded-md border border-slate-300 cursor-pointer hover:scale-110 transition-transform"
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                No photo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Photo Modal */}
      {popupImage && (
        <div
          onClick={() => setPopupImage(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={popupImage}
              alt="Preview Full"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPopupImage(null)}
              className="absolute -top-3 -right-3 bg-red-600 text-white p-2 rounded-full shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Single Item) */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmId}
        title="Konfirmasi Hapus Kegiatan"
        message="Apakah Anda yakin ingin menghapus data kegiatan harian ini? Dokumen & foto lampiran terkait akan terhapus."
        confirmLabel="Hapus Kegiatan"
        isLoading={isDeleting}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          const id = deleteConfirmId;
          setIsDeleting(true);
          try {
            const ok = await onDeleteKegiatan(id);
            if (ok) {
              addToast("success", "Kegiatan berhasil dihapus");
            } else {
              addToast("error", "Gagal menghapus kegiatan");
            }
          } catch (err) {
            addToast("error", "Gagal menghapus kegiatan");
          } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
          }
        }}
      />

      {/* Batch Delete Confirmation Modal (Manual Selected Items) */}
      <ConfirmDeleteModal
        isOpen={showBatchDeleteModal}
        title={`Konfirmasi Hapus ${selectedIds.length} Kegiatan Terpilih`}
        message={`Apakah Anda yakin ingin menghapus ${selectedIds.length} kegiatan harian yang telah dicentang secara permanen? Data yang telah dihapus tidak dapat dikembalikan.`}
        confirmLabel={`Hapus ${selectedIds.length} Kegiatan`}
        isLoading={isBatchDeleting}
        onClose={() => setShowBatchDeleteModal(false)}
        onConfirm={handleExecuteBatchDelete}
      />

      {/* Admin Auto / Mass Delete Modal */}
      {showAdminDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    Hapus Otomatis / Massal Kegiatan Harian
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fitur Admin untuk menghapus kegiatan berdasarkan Bulan atau Rentang Tanggal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAdminDeleteTab("month")}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  adminDeleteTab === "month"
                    ? "bg-white text-rose-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Berdasarkan Bulan</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminDeleteTab("range")}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  adminDeleteTab === "range"
                    ? "bg-white text-rose-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Rentang Tanggal</span>
              </button>
            </div>

            {/* Petugas Filter Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filter Petugas / User
              </label>
              <select
                value={adminDeletePetugasId}
                onChange={(e) => setAdminDeletePetugasId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-800"
              >
                <option value="ALL">-- Semua Petugas --</option>
                {petugasList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} ({p.nip}) - {p.jabatan}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode 1: Month & Year */}
            {adminDeleteTab === "month" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bulan
                  </label>
                  <select
                    value={adminDeleteMonth}
                    onChange={(e) => setAdminDeleteMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-800"
                  >
                    {monthOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun
                  </label>
                  <input
                    type="number"
                    value={adminDeleteYear}
                    onChange={(e) => setAdminDeleteYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-800"
                    placeholder="2026"
                  />
                </div>
              </div>
            )}

            {/* Mode 2: Date Range */}
            {adminDeleteTab === "range" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={adminDeleteStartDate}
                    onChange={(e) => setAdminDeleteStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={adminDeleteEndDate}
                    onChange={(e) => setAdminDeleteEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Match Summary Banner */}
            {(() => {
              const matchingCount = getMatchingAutoDeleteKegiatan().length;
              return (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    matchingCount > 0
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${matchingCount > 0 ? "text-rose-600" : "text-slate-400"}`} />
                    <span>
                      Ditemukan <strong className="font-bold underline">{matchingCount} kegiatan harian</strong> yang cocok dengan kriteria filter.
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isMassDeleting}
                onClick={() => setShowAdminDeleteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isMassDeleting || getMatchingAutoDeleteKegiatan().length === 0}
                onClick={handleExecuteMassDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-colors"
              >
                {isMassDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Penghapusan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus ({getMatchingAutoDeleteKegiatan().length}) Kegiatan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Container for Bulk PDF Export in Official Report Format */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0 overflow-hidden">
        <div
          id="export-all-pdf-paper"
          className="w-[210mm] bg-white text-slate-900 p-[12mm] font-serif text-[11pt] leading-relaxed"
          style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
        >
          {(selectedIds.length > 0
            ? filteredKegiatan.filter((item) => selectedIds.includes(item.id))
            : filteredKegiatan
          ).map((kegItem, kegIdx) => {
            const parentRb = rencanaBulananList.find((rb) => rb.id === kegItem.rencana_bulanan_id);
            const parentRh = rencanaHarianList.find((rh) => rh.id === kegItem.rencana_harian_id);
            const officer = (petugasList || []).find((p) => p.id === kegItem.petugas_id) || currentUser;
            const lapTemplate = (laporanList || []).find(
              (l) => l.nomor_rhk === parentRb?.no_rhk && l.petugas_id === officer.id
            );

            const rkTitle = parentRb?.rencana_kerja || "PELAKSANAAN TUGAS OPERASIONAL";
            const formattedDate = kegItem.tanggal ? formatIndonesianDate(kegItem.tanggal) : "-";
            const hariTanggalStr = `${kegItem.haritglkegiatan || ""}, ${formattedDate}`.trim();
            const tempatStr = `${kegItem.tempat ? `di ${kegItem.tempat} ` : ""}${
              kegItem.desa ? `desa ${kegItem.desa}` : ""
            }`.trim() || "-";

            const itemUmum =
              lapTemplate?.umum ||
              "Laporan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas operasional ASN dalam rangka meningkatkan akuntabilitas dan efektivitas pelayanan publik.";
            const itemMaksud =
              lapTemplate?.maksud_tujuan ||
              "Maksud kegiatan ini adalah untuk memastikan seluruh tahapan pendampingan berjalan sesuai standar operasional baku dan mencapai target kinerja yang ditetapkan.";
            const itemRuang =
              lapTemplate?.ruang_lingkup ||
              "Ruang lingkup laporan meliputi persiapan administrasi, koordinasi instansi, serta verifikasi lapangan di wilayah kerja.";
            const itemDasar =
              lapTemplate?.dasar ||
              "1. Peraturan Menteri tentang Standar Pelayanan Operasional.\n2. Surat Perintah Tugas Kepala Dinas/Instansi.";
            const itemSimpulan =
              lapTemplate?.simpulan ||
              "Kegiatan pendampingan telah terlaksana dengan lancar dan memberikan kontribusi positif bagi indikator kinerja organisasi.";
            const itemPenutup =
              lapTemplate?.penutup ||
              "Demikian laporan pelaksanaan kegiatan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.";

            const userNama = officer.nama || currentUser.nama || "-";
            const userNip = officer.nip || currentUser.nip || "-";
            const userTtd = officer.scan_ttd || currentUser.scan_ttd || "";
            const tempatDibuat = officer.tempat_dibuat || "Kualasimpang";

            const itemPhotos = kegItem.foto_kegiatan1 || [];
            const itemPhotoChunks: string[][] = [];
            for (let i = 0; i < itemPhotos.length; i += 2) {
              itemPhotoChunks.push(itemPhotos.slice(i, i + 2));
            }

            const effectiveKopMode = appSettings?.kop_mode || "auto";
            const kopMarginTop = appSettings?.kop_margin_top ?? 0;
            const kopMarginBottom = appSettings?.kop_margin_bottom ?? 0;

            return (
              <div
                key={kegItem.id || kegIdx}
                id={`export-single-paper-${kegItem.id}`}
                className="w-[190mm] max-w-[190mm] bg-white text-slate-900 px-3 py-2 font-serif text-[10.5pt] leading-relaxed mb-10 box-border overflow-hidden"
                style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
              >
                {/* Kop Surat Header */}
                <div style={{ marginTop: `${kopMarginTop}mm`, marginBottom: `${kopMarginBottom}mm` }}>
                  {effectiveKopMode === "image" && appSettings?.kop_surat_url ? (
                    <div className="mb-6 text-center">
                      <img
                        src={appSettings.kop_surat_url}
                        alt="Kop Surat Official"
                        className="w-full max-h-36 object-contain mx-auto border-b-4 border-double border-black pb-2"
                      />
                    </div>
                  ) : (
                    <div className="border-b-4 border-double border-black pb-4 mb-6 text-center">
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-[10px] bg-slate-100 uppercase tracking-widest shrink-0">
                          KEMENSOS
                        </div>
                        <div>
                          <h2 className="text-sm md:text-base font-extrabold tracking-wider uppercase text-slate-900">
                            {appSettings?.instansi_header || "KEMENTERIAN SOSIAL REPUBLIK INDONESIA"}
                          </h2>
                          <p className="text-xs font-serif italic text-slate-700">
                            {appSettings?.sub_header || "Direktorat Jenderal Pemberdayaan Sosial / Dinas Sosial"}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            {appSettings?.alamat_header || "Jl. Salemba Raya No. 28, Jakarta Pusat / Kantor Wilayah Daerah"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Title Section */}
                <div className="text-center my-6 space-y-1">
                  <h3 className="font-bold uppercase tracking-wide text-slate-900">
                    LAPORAN TENTANG
                  </h3>
                  <h3 className="font-bold uppercase underline tracking-wide text-slate-900">
                    {rkTitle}
                  </h3>
                </div>

                {/* Report Body */}
                <div className="space-y-6 text-justify">
                  {/* Section I */}
                  <div className="report-block mb-5">
                    <h4 className="font-bold mb-1.5 uppercase text-slate-900">I. PENDAHULUAN</h4>
                    <div className="pl-4 space-y-2.5">
                      <div>
                        <p className="font-bold text-slate-900 mb-0.5">1. Umum</p>
                        <div className="pl-1">{renderFormattedContent(itemUmum)}</div>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 mb-0.5">2. Maksud dan Tujuan</p>
                        <div className="pl-1">{renderFormattedContent(itemMaksud)}</div>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 mb-0.5">3. Ruang Lingkup</p>
                        <div className="pl-1">{renderFormattedContent(itemRuang)}</div>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 mb-0.5">4. Dasar</p>
                        <div className="pl-1">{renderFormattedContent(itemDasar)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Section II */}
                  <div className="report-block mb-5">
                    <h4 className="font-bold mb-1.5 uppercase text-slate-900">II. PELAKSANAAN KEGIATAN</h4>
                    <div className="pl-4 space-y-2.5">
                      <div>
                        {renderFormattedContent(kegItem.isi_kegiatan)}
                      </div>
                      <p className="pt-1 font-semibold text-slate-900">Jam dan Tanggal Kegiatan dilaksanakan pada jadwal berikut:</p>
                      <table className="w-full max-w-md ml-2 font-serif text-inherit border-collapse">
                        <tbody>
                          <tr>
                            <td className="w-32 py-1 font-semibold align-top text-slate-900">Hari / Tanggal</td>
                            <td className="py-1 align-top text-slate-900">: {hariTanggalStr}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold align-top text-slate-900">Waktu</td>
                            <td className="py-1 align-top text-slate-900">: {kegItem.waktu || "-"}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold align-top text-slate-900">Tempat Kegiatan</td>
                            <td className="py-1 align-top text-slate-900">: {tempatStr}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section III */}
                  <div className="report-block mb-5">
                    <h4 className="font-bold mb-1.5 uppercase text-slate-900">III. HASIL YANG DICAPAI</h4>
                    <div className="pl-4">
                      {renderFormattedContent(kegItem.hasil)}
                    </div>
                  </div>

                  {/* Section IV */}
                  <div className="report-block mb-5">
                    <h4 className="font-bold mb-1.5 uppercase text-slate-900">IV. SIMPULAN DAN SARAN</h4>
                    <div className="pl-4">
                      {renderFormattedContent(itemSimpulan)}
                    </div>
                  </div>

                  {/* Section V */}
                  <div className="report-block mb-5">
                    <h4 className="font-bold mb-1.5 uppercase text-slate-900">V. PENUTUP</h4>
                    <div className="pl-4">
                      {renderFormattedContent(itemPenutup)}
                    </div>
                  </div>
                </div>

                {/* Signature Box */}
                <div
                  className="signature-box mt-10 flex justify-end break-inside-avoid page-break-inside-avoid"
                  style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                >
                  <div
                    className="w-64 font-serif text-inherit space-y-1 break-inside-avoid page-break-inside-avoid"
                    style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                  >
                    <p>Dibuat di : {tempatDibuat}</p>
                    <p>Pada Tanggal : {formattedDate}</p>
                    <p className="font-semibold pt-1">Penata Layanan Operasional</p>

                    <div className="h-20 flex items-center py-1">
                      {userTtd ? (
                        <img src={userTtd} alt="TTD" className="h-16 object-contain" />
                      ) : (
                        <div className="h-16" />
                      )}
                    </div>

                    <p className="font-bold underline text-inherit">{userNama}</p>
                    <p className="font-serif text-inherit">NIP. {userNip}</p>
                  </div>
                </div>

                {/* Photos Annex */}
                {itemPhotoChunks.length > 0 && (
                  <div className="mt-12">
                    {itemPhotoChunks.map((chunk, pageIndex) => (
                      <div
                        key={pageIndex}
                        className="pt-8 border-t border-slate-300 break-before-page page-break-before break-inside-avoid page-break-inside-avoid"
                        style={{
                          breakBefore: "page",
                          pageBreakBefore: "always",
                          breakInside: "avoid",
                          pageBreakInside: "avoid",
                          marginTop: pageIndex > 0 ? "2rem" : undefined,
                        }}
                      >
                        <h3 className="text-center font-bold text-sm uppercase mb-6 text-slate-900">
                          LAMPIRAN DOKUMENTASI KEGIATAN{" "}
                          {itemPhotoChunks.length > 1 ? `(HALAMAN ${pageIndex + 1})` : ""}
                        </h3>
                        <div className="flex flex-col space-y-6 items-center">
                          {chunk.map((foto, idxWithinChunk) => {
                            const globalIdx = pageIndex * 2 + idxWithinChunk;
                            return (
                              <div
                                key={globalIdx}
                                className="text-center space-y-2 w-full max-w-lg break-inside-avoid page-break-inside-avoid"
                                style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                              >
                                <img
                                  src={foto}
                                  alt={`Dokumentasi ${globalIdx + 1}`}
                                  className="max-w-full max-h-[360px] w-auto h-auto object-contain rounded-md border border-slate-300 shadow-2xs mx-auto bg-slate-50"
                                />
                                <p className="text-[11px] text-slate-700 font-serif italic font-medium">
                                  Dokumentasi {globalIdx + 1}: {kegItem.tempat || "Lokasi Kegiatan"}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
