import React, { useState, useEffect } from "react";
import { Petugas, AppSettings } from "../types";
import {
  FileSearch,
  Folder,
  FileText,
  ExternalLink,
  RefreshCw,
  Search,
  Eye,
  Settings,
  AlertTriangle,
  Loader2,
  FolderSearch,
  CheckCircle2,
  Copy,
  Link as LinkIcon,
  HardDrive,
  User,
  ArrowRight,
  Filter,
  Download,
  CloudUpload,
} from "lucide-react";
import {
  listDriveFiles,
  listDriveFolders,
  extractDriveFolderId,
  getDriveFolderUrl,
  getDriveAccessToken,
  setDriveAccessToken,
  getDriveFolderDetails,
  signInForGoogleDrive,
  DriveFile,
  DriveFolder,
} from "../lib/driveService";

interface CekDriveFilesViewProps {
  currentUser: Petugas;
  appSettings: AppSettings;
  petugasList: Petugas[];
  addToast: (type: "success" | "error" | "info" | "warning", title: string) => void;
  onNavigate?: (module: string) => void;
}

export const CekDriveFilesView: React.FC<CekDriveFilesViewProps> = ({
  currentUser,
  appSettings,
  petugasList,
  addToast,
  onNavigate,
}) => {
  // Selected Petugas (defaults to current user or first admin option)
  const [selectedPetugasId, setSelectedPetugasId] = useState<string>(currentUser.id || "");

  // Drive target state
  const [customFolderUrl, setCustomFolderUrl] = useState<string>("");
  const [activeFolderId, setActiveFolderId] = useState<string>("root");
  const [activeFolderName, setActiveFolderName] = useState<string>("Folder Drive Target");

  // Auth / Config state
  const [manualToken, setManualToken] = useState<string>(() => getDriveAccessToken() || "");
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return localStorage.getItem("laporan_skp_apps_script_url") || "";
  });

  // Files & Subfolders state
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [subfolders, setSubfolders] = useState<DriveFolder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Settings UI
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "pdf">("pdf");
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Selected officer drive link
  const selectedPetugas = petugasList.find((p) => p.id === selectedPetugasId) || currentUser;

  // Resolve target folder ID whenever selected officer or custom input changes
  useEffect(() => {
    let rawLink = customFolderUrl.trim();

    if (!rawLink) {
      rawLink =
        selectedPetugas?.drive_link ||
        (selectedPetugas?.id ? localStorage.getItem(`laporan_skp_drive_link_${selectedPetugas.id}`) : null) ||
        localStorage.getItem("laporan_skp_shared_drive_link") ||
        appSettings?.shared_drive_link ||
        "";
    }

    const extractedId = rawLink ? extractDriveFolderId(rawLink) : null;
    const finalFolderId = extractedId || "root";
    setActiveFolderId(finalFolderId);

    if (extractedId) {
      setActiveFolderName(`Folder (${selectedPetugas.nama || "Petugas"})`);
    } else {
      setActiveFolderName("My Drive Utama (Root)");
    }
  }, [selectedPetugasId, customFolderUrl, selectedPetugas, appSettings]);

  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);

  const handleConnectOAuth = async () => {
    setIsConnectingOAuth(true);
    setErrorMsg(null);
    try {
      const authRes = await signInForGoogleDrive();
      if (authRes?.accessToken) {
        setManualToken(authRes.accessToken);
        setDriveAccessToken(authRes.accessToken);
        addToast("success", "Berhasil terhubung ke Google Drive!");
        await handleLoadFiles();
      }
    } catch (err: any) {
      if (!err?.message?.includes("dibatalkan") && err?.code !== "auth/popup-closed-by-user") {
        console.error("OAuth connect error:", err);
        setErrorMsg(err?.message || "Gagal menghubungkan akun Google Drive.");
      }
    } finally {
      setIsConnectingOAuth(false);
    }
  };

  // Load files function
  const handleLoadFiles = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const token = getDriveAccessToken() || manualToken.trim();
    const webhook = appsScriptUrl.trim();

    try {
      // Get folder details if possible
      if (activeFolderId && activeFolderId !== "root" && token) {
        try {
          const details = await getDriveFolderDetails(activeFolderId, token);
          if (details?.name) {
            setActiveFolderName(details.name);
          }
        } catch {
          // ignore folder details fail
        }
      }

      // Fetch files
      const fileList = await listDriveFiles(
        activeFolderId,
        token || undefined,
        webhook || undefined
      );
      setFiles(fileList);

      // Fetch subfolders if available
      try {
        const folderList = await listDriveFolders(
          activeFolderId,
          {
            customToken: token || undefined,
            webhookUrl: webhook || undefined,
          }
        );
        setSubfolders(folderList);
      } catch {
        setSubfolders([]);
      }
    } catch (err: any) {
      console.error("Error loading drive files:", err);
      if (!token && !webhook) {
        setErrorMsg(
          "Folder Google Drive target telah dikonfigurasi. Anda dapat mengklik tombol 'Buka Folder Drive Langsung' di bawah untuk melihat dan mengelola file PDF di Google Drive tanpa memerlukan Token atau Webhook Apps Script."
        );
      } else {
        setErrorMsg(
          err?.message ||
            "Gagal membaca file dari Google Drive. Pastikan Access Token atau Webhook Apps Script telah dikonfigurasi."
        );
      }
      setFiles([]);
      setSubfolders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load files when activeFolderId changes
  useEffect(() => {
    handleLoadFiles();
  }, [activeFolderId]);

  // Save Config
  const handleSaveConfig = () => {
    if (manualToken.trim()) {
      setDriveAccessToken(manualToken.trim());
    } else {
      setDriveAccessToken(null);
    }

    if (appsScriptUrl.trim()) {
      localStorage.setItem("laporan_skp_apps_script_url", appsScriptUrl.trim());
    } else {
      localStorage.removeItem("laporan_skp_apps_script_url");
    }

    setShowConfigModal(false);
    addToast("success", "Pengaturan koneksi Google Drive disimpan!");
    handleLoadFiles();
  };

  // Open Direct Drive Folder
  const handleOpenDirectFolder = () => {
    const driveUrl = getDriveFolderUrl(activeFolderId);
    window.open(driveUrl, "_blank", "noopener,noreferrer");
  };

  // Filter PDF files vs all
  const pdfFiles = files.filter(
    (f) => f.mimeType === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
  );

  const displayFiles = (filterType === "pdf" ? pdfFiles : files).filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast("success", `${label} berhasil disalin!`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-purple-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-400/30 text-purple-300 shrink-0">
              <FileSearch className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                Cek File Google Drive
              </h1>
              <p className="text-xs text-purple-200 mt-0.5 max-w-xl leading-relaxed">
                Mendeteksi folder Google Drive target, menghitung jumlah file PDF laporan SKP, dan membuka atau mengunduh dokumen secara langsung.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleConnectOAuth}
              disabled={isConnectingOAuth}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 border border-emerald-400/40"
              title="Login dengan Google OAuth untuk Akses Drive"
            >
              {isConnectingOAuth ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
              ) : (
                <CloudUpload className="w-4 h-4 text-emerald-200" />
              )}
              <span>{isConnectingOAuth ? "Menghubungkan..." : "Sambungkan Drive"}</span>
            </button>

            <button
              onClick={handleLoadFiles}
              disabled={isLoading}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Muat Ulang</span>
            </button>

            <button
              onClick={handleOpenDirectFolder}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs flex items-center gap-2 border border-slate-700 shadow-md transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4 text-sky-400" />
              <span>Buka Drive</span>
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs flex items-center gap-2 border border-white/20 transition-all"
              title="Pengaturan Access Token & Webhook Drive"
            >
              <Settings className="w-4 h-4 text-purple-300" />
              <span className="hidden sm:inline">Konfigurasi API</span>
            </button>
          </div>
        </div>
      </div>

      {/* Target Folder Selector Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Petugas Selector (If multiple or Admin) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Pilih Target Petugas:</span>
            </label>
            <select
              value={selectedPetugasId}
              onChange={(e) => setSelectedPetugasId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {petugasList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.jabatan || p.nip})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Drive Link / Folder ID Input */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Link / ID Folder Drive Custom (Opsional):</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customFolderUrl}
                onChange={(e) => setCustomFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/1abc... atau ID Folder"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {customFolderUrl && (
                <button
                  type="button"
                  onClick={() => setCustomFolderUrl("")}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card as Requested: Nama Folder | Jumlah File PDF | List File PDF */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl">
              <FolderSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Tabel Cek File Google Drive
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Deteksi otomatis folder, jumlah PDF, dan daftar dokumen lengkap.
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2.5">
            {/* Filter Toggle */}
            <div className="bg-slate-200 dark:bg-slate-700 p-1 rounded-2xl flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType("pdf")}
                className={`px-3 py-1 rounded-xl transition-all ${
                  filterType === "pdf"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Hanya PDF ({pdfFiles.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-3 py-1 rounded-xl transition-all ${
                  filterType === "all"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Semua File ({files.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari file PDF..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3.5 px-5 w-1/4 min-w-[220px]">
                  <div className="flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-amber-500" />
                    <span>Nama Folder</span>
                  </div>
                </th>
                <th className="py-3.5 px-5 w-1/6 min-w-[150px] text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Jumlah File PDF</span>
                  </div>
                </th>
                <th className="py-3.5 px-5 min-w-[320px]">
                  <div className="flex items-center gap-1.5">
                    <FileSearch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>List File PDF & Aksi Buka File</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors align-top">
                {/* 1. Kolom Nama Folder */}
                <td className="p-5 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                        {activeFolderName}
                      </span>
                    </div>
                    <div className="pl-7 space-y-1">
                      <p className="text-[11px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md inline-block border border-purple-200 dark:border-purple-800">
                        ID: {activeFolderId}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pemilik: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedPetugas.nama}</span>
                      </p>
                    </div>
                  </div>

                  {/* Folder Links & Actions */}
                  <div className="pl-7 space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenDirectFolder}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                      <span>Buka Folder di Tab Baru</span>
                    </button>

                    {/* Subfolders list if present */}
                    {subfolders.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Sub-Folder ({subfolders.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {subfolders.map((sf) => (
                            <button
                              key={sf.id}
                              type="button"
                              onClick={() => {
                                setActiveFolderId(sf.id);
                                setActiveFolderName(sf.name);
                              }}
                              className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg text-[10.5px] font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Folder className="w-3 h-3 text-amber-500" />
                              <span className="truncate max-w-[120px]">{sf.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </td>

                {/* 2. Kolom Jumlah File PDF */}
                <td className="p-5 text-center align-top space-y-2">
                  <div className="inline-flex flex-col items-center justify-center p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl min-w-[130px]">
                    <span className="text-2xl md:text-3xl font-black text-purple-700 dark:text-purple-300">
                      {pdfFiles.length}
                    </span>
                    <span className="text-[11px] font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider mt-0.5">
                      File PDF
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                    <p>Total Item: <span className="font-bold text-slate-800 dark:text-slate-200">{files.length} File</span></p>
                    <p>Non-PDF: <span className="font-bold text-slate-800 dark:text-slate-200">{files.length - pdfFiles.length} File</span></p>
                  </div>
                </td>

                {/* 3. Kolom List File PDF & Actions */}
                <td className="p-5 align-top">
                  {isLoading ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                      <Loader2 className="w-7 h-7 animate-spin mx-auto text-purple-600 dark:text-purple-400" />
                      <p className="font-bold text-xs">Membaca daftar file PDF dari Google Drive...</p>
                    </div>
                  ) : errorMsg ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-3">
                      <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold">Informasi Pembacaan API Google Drive:</p>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                            {errorMsg}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleOpenDirectFolder}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka Folder Drive Langsung</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowConfigModal(true)}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5 text-purple-300" />
                          <span>Konfigurasi Token / Webhook</span>
                        </button>
                      </div>
                    </div>
                  ) : displayFiles.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                      <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                        {searchTerm
                          ? `Tidak ditemukan file dengan kata kunci "${searchTerm}"`
                          : "Belum ada file PDF ditemukan di folder ini."}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Anda dapat mengunggah file laporan PDF dari menu <span className="font-bold text-purple-600">Kegiatan Harian &gt; Print Laporan</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {displayFiles.map((file, idx) => {
                        const isPdf =
                          file.mimeType === "application/pdf" ||
                          file.name.toLowerCase().endsWith(".pdf");
                        const fileUrl =
                          file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

                        return (
                          <div
                            key={file.id || idx}
                            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                              isPdf
                                ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-800/60 hover:border-purple-400"
                                : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div
                                className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                                  isPdf
                                    ? "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400"
                                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <FileText className="w-5 h-5" />
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  {isPdf && (
                                    <span className="px-1.5 py-0.2 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 font-extrabold text-[9px] rounded uppercase tracking-wider shrink-0">
                                      PDF
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                                  {file.createdTime && (
                                    <span>
                                      Dibuat: {new Date(file.createdTime).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                  {file.size && (
                                    <span>
                                      Ukuran: {(parseInt(file.size, 10) / 1024).toFixed(1)} KB
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(fileUrl, "Link File PDF")}
                                className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                                title="Salin Link File"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Buka File</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Konfigurasi API / Access Token & Webhook */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-5 bg-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-purple-200" />
                <div>
                  <h3 className="font-bold text-sm">Konfigurasi Akses Google Drive API</h3>
                  <p className="text-[11px] text-purple-200">
                    Atur Access Token atau Apps Script Webhook untuk membaca file.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Google Drive Access Token (Opsional):
                </label>
                <textarea
                  rows={3}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste OAuth2 Access Token (ya29.a0...)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Apps Script Webhook URL (Opsional / Bebas Blokir):
                </label>
                <input
                  type="text"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl text-[11px] text-purple-900 dark:text-purple-200 leading-relaxed">
                <p className="font-bold">Tips Koneksi:</p>
                <p>
                  Jika akun Google Anda tidak memiliki akses OAuth langsung di browser, memasukkan Webhook Google Apps Script akan memungkinkan pembacaan file dan upload otomatis secara langsung tanpa perlu izin tambahan.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
              >
                Simpan & Muat Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
