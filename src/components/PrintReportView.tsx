import React, { useState, useEffect } from "react";
import { DriveTreeView } from "./DriveTreeView";
import {
  KegiatanHarian,
  LaporanTemplate,
  Petugas,
  RencanaBulanan,
  RencanaHarian,
  AppSettings,
} from "../types";
import { formatIndonesianDate } from "../lib/imageUtils";
import {
  Printer,
  Key,
  ArrowLeft,
  Download,
  Loader2,
  Settings,
  FileText,
  Sliders,
  Maximize2,
  Image as ImageIcon,
  Building,
  EyeOff,
  CloudUpload,
  ExternalLink,
  CheckCircle,
  Folder,
  FolderPlus,
  ChevronRight,
  FolderOpen,
  X,
  RefreshCw,
  Search,
  AlertTriangle,
  Link as LinkIcon,
  Check,
  FileSearch,
  FileCheck,
  Eye,
  FolderSearch,
} from "lucide-react";
// @ts-ignore
import html2pdf from "html2pdf.js";
import {
  uploadPdfToDrive,
  listDriveFolders,
  listDriveFiles,
  createDriveFolder,
  getDriveAccessToken,
  setDriveAccessToken,
  signInForGoogleDrive,
  extractDriveFolderId,
  getDriveFolderDetails,
  getDriveFolderUrl,
  DriveUploadResult,
  DriveFolder,
  DriveFile,
} from "../lib/driveService";

// Helper function to render clean formatted HTML or plain text without raw tags or squished lines
const renderFormattedContent = (content: string | undefined | null) => {
  if (!content || content.trim() === "" || content === "-") {
    return <span className="text-slate-500 italic">-</span>;
  }

  const trimmed = content.trim();

  // If content contains HTML tags (e.g., <p>, <br>, <strong> from RichTextEditor)
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return (
      <div
        className="prose prose-sm max-w-none text-slate-900 leading-relaxed font-serif [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:list-disc [&>ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }

  // Fallback for plain text: preserve linebreaks nicely
  return <div className="whitespace-pre-line leading-relaxed font-serif text-slate-900">{trimmed}</div>;
};

interface PrintReportViewProps {
  kegiatan: KegiatanHarian;
  petugas: Petugas | null;
  rencanaBulanan: RencanaBulanan | null;
  rencanaHarian?: RencanaHarian | null;
  rencanaHarianList?: RencanaHarian[];
  laporanTemplate: LaporanTemplate | null;
  appSettings?: AppSettings;
  onSaveAppSettings?: (settings: Partial<AppSettings>) => Promise<boolean>;
  onUpdateProfile?: (updated: Partial<Petugas>) => Promise<boolean>;
  onBack: () => void;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  kegiatan,
  petugas,
  rencanaBulanan,
  rencanaHarian,
  rencanaHarianList,
  laporanTemplate,
  appSettings = {} as AppSettings,
  onSaveAppSettings,
  onUpdateProfile,
  onBack,
}) => {
  const isAdmin = petugas?.level === "ADMIN";
  const permissions = appSettings?.feature_permissions || {};
  const isUploadDriveDisabled = !isAdmin && !!permissions.disableUserUploadDrive;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string>("");
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [driveUploadSuccess, setDriveUploadSuccess] = useState<DriveUploadResult | null>(null);
  const [driveUploadError, setDriveUploadError] = useState<string | null>(null);
  const [showSettingsToolbar, setShowSettingsToolbar] = useState(true);

  // Paper & Layout Customization State
  const [paperSize, setPaperSize] = useState<"a4" | "letter" | "folio">("a4");
  const [marginPreset, setMarginPreset] = useState<"compact" | "normal" | "wide">("normal");
  const [fontScale, setFontScale] = useState<"xs" | "sm" | "base">("sm");
  const [kopDisplay, setKopDisplay] = useState<"auto" | "image" | "text" | "hidden">("auto");
  const [kopMarginTop, setKopMarginTop] = useState<number>(appSettings?.kop_margin_top ?? 0);
  const [kopMarginBottom, setKopMarginBottom] = useState<number>(appSettings?.kop_margin_bottom ?? 0);
  const [showPhotos, setShowPhotos] = useState<boolean>(true);
  const [scaleOption, setScaleOption] = useState<string>("100");
  const [customScale, setCustomScale] = useState<number>(100);

  const effectiveScalePercent =
    scaleOption === "custom"
      ? Math.max(30, Math.min(200, customScale || 100))
      : Number(scaleOption) || 100;

  // Chunk photos into max 2 photos per page
  const photoChunks = React.useMemo(() => {
    const photos = kegiatan.foto_kegiatan1 || [];
    const chunks: string[][] = [];
    for (let i = 0; i < photos.length; i += 2) {
      chunks.push(photos.slice(i, i + 2));
    }
    return chunks;
  }, [kegiatan.foto_kegiatan1]);

  const rkTitle = rencanaBulanan?.rencana_kerja || "PELAKSANAAN TUGAS OPERASIONAL";
  const userNama = petugas?.nama || "Siti Nurhaliza, S.STP";
  const userNip = petugas?.nip || "1995050512345678";
  const userTtd = petugas?.scan_ttd || "";
  const tempatDibuatLaporan = petugas?.tempat_dibuat?.trim() || "Aceh Tamiang";

  const umum =
    laporanTemplate?.umum ||
    "Laporan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas operasional ASN dalam rangka meningkatkan akuntabilitas dan efektivitas pelayanan publik.";
  const maksud =
    laporanTemplate?.maksud_tujuan ||
    "Maksud kegiatan ini adalah untuk memastikan seluruh tahapan pendampingan berjalan sesuai standar operasional baku dan mencapai target kinerja yang ditetapkan.";
  const ruang =
    laporanTemplate?.ruang_lingkup ||
    "Ruang lingkup laporan meliputi persiapan administrasi, koordinasi instansi, serta verifikasi lapangan di wilayah kerja.";
  const dasar =
    laporanTemplate?.dasar ||
    "1. Peraturan Menteri tentang Standar Pelayanan Operasional.\n2. Surat Perintah Tugas Kepala Dinas/Instansi.";
  const simpulan =
    laporanTemplate?.simpulan ||
    "Kegiatan pendampingan telah terlaksana dengan lancar dan memberikan kontribusi positif bagi indikator kinerja organisasi.";
  const penutup =
    laporanTemplate?.penutup ||
    "Demikian laporan pelaksanaan kegiatan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.";

  const formattedDate = formatIndonesianDate(kegiatan.tanggal);
  const hariTanggalStr = `${kegiatan.haritglkegiatan}, ${formattedDate}`;

  const tempatStr = `${kegiatan.tempat ? `di ${kegiatan.tempat} ` : ""}${
    kegiatan.desa ? `desa ${kegiatan.desa}` : ""
  }`.trim() || "-";

  // Determine Kop Mode to render
  const effectiveKopMode = (() => {
    if (kopDisplay === "hidden") return "hidden";
    if (kopDisplay === "image") return "image";
    if (kopDisplay === "text") return "text";
    // Auto mode
    if (appSettings.kop_mode === "image" && appSettings.kop_surat_url) {
      return "image";
    }
    return "text";
  })();

  // Paper Container Width & Padding Styles based on Settings
  const getPaperDimensionsClass = () => {
    switch (paperSize) {
      case "letter":
        return "max-w-[215.9mm] min-h-[279.4mm]";
      case "folio":
        return "max-w-[215mm] min-h-[330mm]";
      case "a4":
      default:
        return "max-w-[210mm] min-h-[297mm]";
    }
  };

  const getMarginClass = () => {
    switch (marginPreset) {
      case "compact":
        return "p-6 md:p-8";
      case "wide":
        return "p-12 md:p-20";
      case "normal":
      default:
        return "p-8 md:p-14";
    }
  };

  const getFontScaleClass = () => {
    switch (fontScale) {
      case "xs":
        return "text-[11px] leading-relaxed";
      case "base":
        return "text-sm leading-relaxed";
      case "sm":
      default:
        return "text-xs leading-relaxed";
    }
  };

  // Helper function to generate clean export filename following RHK Bulanan.RHK Harian and report date (e.g. RHK 1.2 - 24-07-2026.pdf)
  const getExportFileName = () => {
    const activeRh =
      rencanaHarian ||
      (rencanaHarianList
        ? rencanaHarianList.find((rh) => rh.id === kegiatan.rencana_harian_id)
        : null);

    const rhkBulananNo = rencanaBulanan?.no_rhk ?? laporanTemplate?.nomor_rhk ?? 1;
    const rhkHarianNo = activeRh?.norhkharian ?? null;

    let rhkString = `RHK ${rhkBulananNo}`;
    if (rhkHarianNo !== null && rhkHarianNo !== undefined) {
      rhkString = `RHK ${rhkBulananNo}.${rhkHarianNo}`;
    }

    let dateStr = kegiatan.tanggal || "";

    // Convert YYYY-MM-DD to DD-MM-YYYY if needed
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [yyyy, mm, dd] = dateStr.split("-");
      dateStr = `${dd}-${mm}-${yyyy}`;
    }

    const rawName = `${rhkString} - ${dateStr || "Laporan"}`;
    return `${rawName.replace(/[/\\?%*:|"<>]/g, "-").trim()}.pdf`;
  };

  // Helper function to sanitize canvas styles for PDF export (strips dark mode overrides, fixes oklch color parsing for html2canvas, resets zoom & clears canvas shadows)
  const sanitizeCanvasForExport = (clonedDoc: Document) => {
    clonedDoc.documentElement.classList.remove("dark");
    clonedDoc.body.classList.remove("dark");
    clonedDoc.documentElement.style.backgroundColor = "#ffffff";
    clonedDoc.documentElement.style.color = "#0f172a";
    clonedDoc.body.style.backgroundColor = "#ffffff";
    clonedDoc.body.style.color = "#0f172a";
    clonedDoc.body.style.margin = "0";
    clonedDoc.body.style.padding = "0";

    // 1. Convert/Remove oklch color functions in all <style> tags to prevent html2canvas parser crash
    const styleTags = Array.from(clonedDoc.querySelectorAll("style"));
    styleTags.forEach((styleTag) => {
      if (styleTag.textContent && styleTag.textContent.includes("oklch")) {
        let css = styleTag.textContent;
        // Replace oklch in shadow / ring variables with transparent
        css = css.replace(/(--tw-[a-z0-9-]*:\s*)[^;]*oklch\([^)]+\)/gi, "$1rgba(0,0,0,0)");
        // Convert any remaining oklch(L C H / A) to valid rgb/rgba
        css = css.replace(/oklch\(([^)]+)\)/gi, (match, inner) => {
          try {
            const parts = inner.trim().split(/[\s\/]+/).filter(Boolean);
            if (parts.length >= 1) {
              let lStr = parts[0];
              let l = parseFloat(lStr);
              if (lStr.endsWith("%")) l = l / 100;

              let alpha = 1;
              if (parts.length >= 4) {
                let aStr = parts[3];
                alpha = parseFloat(aStr);
                if (aStr.endsWith("%")) alpha = alpha / 100;
              }

              const v = Math.min(255, Math.max(0, Math.round(l * 255)));
              if (alpha < 1) {
                return `rgba(${v}, ${v}, ${v}, ${alpha})`;
              }
              return `rgb(${v}, ${v}, ${v})`;
            }
          } catch {
            // ignore
          }
          return "rgba(15, 23, 42, 0.8)";
        });
        styleTag.textContent = css;
      }
    });

    // 2. Strip heavy box shadows and sanitize inline styles on cloned elements
    const allElements = clonedDoc.querySelectorAll("*");
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.classList) {
        htmlEl.classList.remove(
          "dark",
          "shadow-2xl",
          "shadow-xl",
          "shadow-lg",
          "shadow-md",
          "shadow-sm",
          "shadow"
        );
      }
      if (htmlEl.style) {
        htmlEl.style.boxShadow = "none";
      }
      const styleAttr = htmlEl.getAttribute("style");
      if (styleAttr && styleAttr.includes("oklch")) {
        htmlEl.setAttribute("style", styleAttr.replace(/oklch\([^)]+\)/gi, "rgba(15, 23, 42, 0.8)"));
      }
    });

    const paper = clonedDoc.getElementById("report-paper");
    if (paper) {
      paper.style.boxShadow = "none";
      paper.style.border = "none";
      paper.style.outline = "none";
      paper.style.backgroundColor = "#ffffff";
      paper.style.color = "#0f172a";
      paper.style.margin = "0 auto";
      paper.style.zoom = "1";
      paper.style.transform = "none";

      // Adjust page 1 top margin offset:
      // Base top margin for PDF page 2+ is 0.58 in (14.73 mm).
      // Shift page 1 top Kop element up by 11.17 mm (0.44 in) so page 1 top margin is 0.14 in (3.56 mm).
      const kopWrapper = paper.firstElementChild as HTMLElement;
      if (kopWrapper) {
        const currentTopMargin = parseFloat(kopWrapper.style.marginTop || "0");
        kopWrapper.style.marginTop = `${currentTopMargin - 11.17}mm`;
      }
    }
  };

  // PDF Download handler mapping current paper settings
  const handleDownloadPdf = async () => {
    const element = document.getElementById("report-paper");
    if (!element) return;

    setIsGeneratingPdf(true);
    try {
      const fileName = getExportFileName();

      // Dynamic PDF margin mm mapping (Page 2+ top margin = 0.58 in / 14.73 mm)
      let pdfMargin: [number, number, number, number] = [14.73, 15, 12, 15];
      if (marginPreset === "compact") pdfMargin = [14.73, 8, 8, 8];
      if (marginPreset === "wide") pdfMargin = [14.73, 20, 18, 20];

      // Dynamic PDF format mapping
      let pdfFormat: string | [number, number] = "a4";
      if (paperSize === "letter") pdfFormat = "letter";
      if (paperSize === "folio") pdfFormat = [215, 330];

      const opt = {
        margin: pdfMargin,
        filename: fileName,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          onclone: (clonedDoc: Document) => {
            sanitizeCanvasForExport(clonedDoc);
          },
        },
        jsPDF: { unit: "mm", format: pdfFormat, orientation: "portrait" as const },
        pagebreak: { mode: ["css", "legacy", "avoid-all"] },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Export error:", err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Google Drive Folder Selector & Shared Link State
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [sharedDriveLink, setSharedDriveLink] = useState<string>(() => {
    return (
      petugas?.drive_link ||
      (petugas?.id ? localStorage.getItem(`laporan_skp_drive_link_${petugas.id}`) : null) ||
      localStorage.getItem("laporan_skp_shared_drive_link") ||
      appSettings?.shared_drive_link ||
      ""
    );
  });

  // Keep sharedDriveLink synced with petugas profile and appSettings
  useEffect(() => {
    const savedLink =
      petugas?.drive_link ||
      (petugas?.id ? localStorage.getItem(`laporan_skp_drive_link_${petugas.id}`) : null) ||
      localStorage.getItem("laporan_skp_shared_drive_link") ||
      appSettings?.shared_drive_link ||
      "";
    if (savedLink) {
      setSharedDriveLink((prev) => (prev ? prev : savedLink));
    }
  }, [petugas, appSettings]);

  // Helper to get target Google Drive folder web URL
  const getDriveFolderUrl = (folderIdOverride?: string) => {
    const targetId = folderIdOverride || currentFolder?.id;
    if (targetId && targetId !== "root" && targetId !== "shared") {
      return `https://drive.google.com/drive/folders/${targetId}`;
    }
    const savedLink =
      sharedDriveLink.trim() ||
      petugas?.drive_link ||
      (petugas?.id ? localStorage.getItem(`laporan_skp_drive_link_${petugas.id}`) : null) ||
      localStorage.getItem("laporan_skp_shared_drive_link") ||
      appSettings?.shared_drive_link ||
      "";

    if (savedLink) {
      if (savedLink.startsWith("http://") || savedLink.startsWith("https://")) {
        return savedLink;
      }
      const extractedId = extractDriveFolderId(savedLink);
      if (extractedId) {
        return `https://drive.google.com/drive/folders/${extractedId}`;
      }
    }
    return "https://drive.google.com/drive/my-drive";
  };

  const handleDownloadAndOpenDrive = async () => {
    await handleDownloadPdf();
    setShowDriveModal(true);
  };

  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return (typeof window !== "undefined" ? localStorage.getItem("laporan_skp_apps_script_url") : "") || "";
  });
  const [isAppsScriptSaved, setIsAppsScriptSaved] = useState(false);
  const [showAppsScriptCode, setShowAppsScriptCode] = useState(false);

  const handleSaveAppsScriptUrl = (url: string) => {
    const trimmed = url.trim();
    setAppsScriptUrl(trimmed);
    if (typeof window !== "undefined") {
      if (trimmed) {
        localStorage.setItem("laporan_skp_apps_script_url", trimmed);
      } else {
        localStorage.removeItem("laporan_skp_apps_script_url");
      }
    }
    setIsAppsScriptSaved(true);
    setTimeout(() => setIsAppsScriptSaved(false), 3000);
  };

  const [manualToken, setManualToken] = useState<string>(() => {
    return (typeof window !== "undefined" ? localStorage.getItem("gdrive_access_token") : "") || "";
  });
  const [isTokenSaved, setIsTokenSaved] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenTestStatus, setTokenTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveManualToken = (newToken: string) => {
    const trimmed = newToken.trim();
    setManualToken(trimmed);
    setDriveAccessToken(trimmed || null);
    setIsTokenSaved(true);
    setTimeout(() => setIsTokenSaved(false), 3000);
  };

  const handleTestToken = async (tokenToTest?: string) => {
    const activeToken = (tokenToTest !== undefined ? tokenToTest : manualToken || getDriveAccessToken() || "").trim();
    if (!activeToken) {
      setTokenTestStatus({
        success: false,
        message: "Token masih kosong. Tempelkan token terlebih dahulu.",
      });
      return;
    }

    setIsTestingToken(true);
    setTokenTestStatus(null);
    try {
      await listDriveFolders("root", "", false, activeToken);
      setDriveAccessToken(activeToken);
      setTokenTestStatus({
        success: true,
        message: "Token Aktif & Valid! Google Drive siap digunakan.",
      });
    } catch (err: any) {
      setTokenTestStatus({
        success: false,
        message: `Token Tidak Valid / Expired (${err?.message || "Gagal koneksi"}).`,
      });
    } finally {
      setIsTestingToken(false);
    }
  };

  const [isApplyingSharedLink, setIsApplyingSharedLink] = useState(false);
  
  // States for "Cek File Google Drive"
  const [showCheckFilesModal, setShowCheckFilesModal] = useState(false);
  const [driveFileList, setDriveFileList] = useState<DriveFile[]>([]);
  const [isLoadingFileList, setIsLoadingFileList] = useState(false);
  const [fileFetchError, setFileFetchError] = useState<string | null>(null);
  const [fileSearchFilter, setFileSearchFilter] = useState("");

  const getTargetDriveFolderId = () => {
    let targetFolderId = currentFolder?.id || "root";
    if (targetFolderId === "root" || targetFolderId === "shared") {
      const savedLink =
        sharedDriveLink.trim() ||
        petugas?.drive_link ||
        (petugas?.id ? localStorage.getItem(`laporan_skp_drive_link_${petugas.id}`) : null) ||
        localStorage.getItem("laporan_skp_shared_drive_link") ||
        appSettings?.shared_drive_link ||
        "";
      const extractedId = savedLink ? extractDriveFolderId(savedLink) : null;
      if (extractedId) targetFolderId = extractedId;
    }
    return targetFolderId;
  };

  const handleOpenDirectDriveFolder = () => {
    const targetFolderId = getTargetDriveFolderId();
    const folderUrl = getDriveFolderUrl(targetFolderId);
    window.open(folderUrl, "_blank");
  };

  const handleLoadFolderFiles = async (folderIdOverride?: string) => {
    setIsLoadingFileList(true);
    setFileFetchError(null);

    const targetFolderId = folderIdOverride || getTargetDriveFolderId();
    const token = getDriveAccessToken() || manualToken.trim();

    try {
      const files = await listDriveFiles(
        targetFolderId,
        token || undefined,
        appsScriptUrl.trim() || undefined
      );
      setDriveFileList(files);
    } catch (err: any) {
      console.error("Load drive files error:", err);
      setFileFetchError(
        err?.message ||
          "Gagal membaca daftar file dari Google Drive. Pastikan Token / Webhook aktif atau buka folder secara langsung."
      );
    } finally {
      setIsLoadingFileList(false);
    }
  };

  const handleOpenCheckFilesModal = () => {
    setShowCheckFilesModal(true);
    handleLoadFolderFiles();
  };
  const [driveFolderStack, setDriveFolderStack] = useState<Array<{ id: string; name: string }>>([
    { id: "root", name: "Drive Utama (Root)" },
  ]);
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [driveSearchQuery, setDriveSearchQuery] = useState("");
  const [folderTab, setFolderTab] = useState<"link" | "my-drive" | "shared-with-me">("link");

  const currentFolder = driveFolderStack[driveFolderStack.length - 1];

  const fetchFolders = async (folderId: string, search?: string, isShared: boolean = false) => {
    const token = getDriveAccessToken() || manualToken.trim();
    const webhook = appsScriptUrl.trim() || localStorage.getItem("laporan_skp_apps_script_url") || "";

    setIsLoadingFolders(true);
    setDriveUploadError(null);
    try {
      const folders = await listDriveFolders(folderId, search, isShared, token || undefined, webhook || undefined);
      setDriveFolders(folders || []);
    } catch (err: any) {
      console.error("Error fetching Drive folders:", err);
      setDriveFolders([]);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleApplySharedLink = async (customLink?: string) => {
    const linkToUse = (customLink !== undefined ? customLink : sharedDriveLink).trim();
    if (!linkToUse) {
      setDriveUploadError("Masukkan link shared Google Drive terlebih dahulu.");
      return;
    }

    const folderId = extractDriveFolderId(linkToUse);
    if (!folderId) {
      setDriveUploadError(
        "Link Google Drive tidak valid. Pastikan format link shared folder Google Drive benar (contoh: https://drive.google.com/drive/folders/...)"
      );
      return;
    }

    setIsApplyingSharedLink(true);
    setDriveUploadError(null);

    if (petugas?.id) {
      localStorage.setItem(`laporan_skp_drive_link_${petugas.id}`, linkToUse);
      if (onUpdateProfile) {
        onUpdateProfile({ drive_link: linkToUse });
      }
    }
    localStorage.setItem("laporan_skp_shared_drive_link", linkToUse);
    setSharedDriveLink(linkToUse);

    try {
      const details = await getDriveFolderDetails(folderId, manualToken || undefined);
      const folderName = details?.name && details.name !== "Folder Target Drive" ? details.name : "Folder Target";
      setDriveFolderStack([{ id: folderId, name: folderName }]);
    } catch {
      setDriveFolderStack([{ id: folderId, name: "Folder Target" }]);
    }

    await fetchFolders(folderId, "", false);
    handleLoadFolderFiles(folderId);
    setIsApplyingSharedLink(false);
  };

  const handleConnectDrive = async () => {
    try {
      const authRes = await signInForGoogleDrive();
      
      setIsLoadingFolders(true);
      setDriveUploadError(null);
      setTokenTestStatus(null);
      
      if (authRes?.accessToken) {
        setManualToken(authRes.accessToken);
        setDriveAccessToken(authRes.accessToken);
        setIsTokenSaved(true);
        setTimeout(() => setIsTokenSaved(false), 3000);

        setTokenTestStatus({
          success: true,
          message: "Token Berhasil Diperoleh & Tersimpan Otomatis!",
        });

        const savedLink =
          sharedDriveLink.trim() ||
          petugas?.drive_link ||
          (petugas?.id ? localStorage.getItem(`laporan_skp_drive_link_${petugas.id}`) : null) ||
          localStorage.getItem("laporan_skp_shared_drive_link") ||
          appSettings?.shared_drive_link ||
          "";
        if (savedLink) {
          setSharedDriveLink(savedLink);
        }
        const extractedId = savedLink ? extractDriveFolderId(savedLink) : null;
        if (extractedId) {
          await handleApplySharedLink(savedLink);
        } else {
          await fetchFolders("root", "", false);
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("dibatalkan") || err?.code === "auth/popup-closed-by-user") {
        console.warn("Connect Google Drive login cancelled:", err?.message);
      } else {
        console.error("Connect Google Drive error:", err);
      }
      setDriveUploadError(err?.message || "Gagal menghubungkan Google Drive.");
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleOpenDriveModal = async () => {
    setShowDriveModal(true);
    setDriveSearchQuery("");
    setDriveUploadError(null);

    const savedLink =
      sharedDriveLink.trim() ||
      petugas?.drive_link ||
      (petugas?.id ? localStorage.getItem(`laporan_skp_drive_link_${petugas.id}`) : null) ||
      localStorage.getItem("laporan_skp_shared_drive_link") ||
      appSettings?.shared_drive_link ||
      "";

    if (savedLink && savedLink !== sharedDriveLink) {
      setSharedDriveLink(savedLink);
    }

    const extractedId = savedLink ? extractDriveFolderId(savedLink) : null;
    if (extractedId) {
      try {
        const details = await getDriveFolderDetails(extractedId, manualToken || undefined);
        const folderName = details?.name && details.name !== "Folder Target Drive" ? details.name : "Folder Target";
        setDriveFolderStack([{ id: extractedId, name: folderName }]);
      } catch {
        setDriveFolderStack([{ id: extractedId, name: "Folder Target" }]);
      }
      fetchFolders(extractedId, "", false);
      handleLoadFolderFiles(extractedId);
    } else {
      setDriveFolderStack([{ id: "root", name: "Drive Utama (Root)" }]);
      fetchFolders("root", "", false);
      handleLoadFolderFiles("root");
    }
  };

  const handleSearchFolders = (query: string) => {
    setDriveSearchQuery(query);
    fetchFolders(currentFolder.id, query, folderTab === "shared-with-me");
  };

  const handleSwitchTab = (tab: "my-drive" | "shared-with-me") => {
    setFolderTab(tab);
    setDriveSearchQuery("");
    if (tab === "shared-with-me") {
      setDriveFolderStack([{ id: "shared", name: "Dibagikan dengan Saya" }]);
      fetchFolders("shared", "", true);
    } else {
      setDriveFolderStack([{ id: "root", name: "Drive Utama (Root)" }]);
      fetchFolders("root", "", false);
    }
  };

  const handleNavigateToFolder = (folder: DriveFolder) => {
    const nextStack = [...driveFolderStack, { id: folder.id, name: folder.name }];
    setDriveFolderStack(nextStack);
    setDriveSearchQuery("");
    fetchFolders(folder.id, "", folderTab === "shared-with-me");
    handleLoadFolderFiles(folder.id);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const nextStack = driveFolderStack.slice(0, index + 1);
    setDriveFolderStack(nextStack);
    setDriveSearchQuery("");
    const targetFolder = nextStack[nextStack.length - 1];
    fetchFolders(targetFolder.id, "", folderTab === "shared-with-me");
    handleLoadFolderFiles(targetFolder.id);
  };

  const handleCreateSubFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const createdFolder = await createDriveFolder(newFolderName.trim(), currentFolder.id);
      setNewFolderName("");
      await fetchFolders(currentFolder.id, "", folderTab === "shared-with-me");
      handleNavigateToFolder(createdFolder);
    } catch (err: any) {
      alert(err?.message || "Gagal membuat folder baru di Google Drive.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleExecuteUploadToDrive = async () => {
    const element = document.getElementById("report-paper");
    if (!element) return;

    setIsUploadingDrive(true);
    setUploadProgress(5);
    setUploadStatusMessage("Mempersiapkan dokumen laporan...");
    setDriveUploadSuccess(null);
    setDriveUploadError(null);

    const fileName = getExportFileName();
    setUploadFileName(fileName);

    let pdfMargin: [number, number, number, number] = [14.73, 15, 12, 15];
    if (marginPreset === "compact") pdfMargin = [14.73, 8, 8, 8];
    if (marginPreset === "wide") pdfMargin = [14.73, 20, 18, 20];

    let pdfFormat: string | [number, number] = "a4";
    if (paperSize === "letter") pdfFormat = "letter";
    if (paperSize === "folio") pdfFormat = [215, 330];

    const opt = {
      margin: pdfMargin,
      filename: fileName,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: Document) => {
          sanitizeCanvasForExport(clonedDoc);
        },
      },
      jsPDF: { unit: "mm", format: pdfFormat, orientation: "portrait" as const },
      pagebreak: { mode: ["css", "legacy", "avoid-all"] },
    };

    let targetFolderId = currentFolder.id;
    if (targetFolderId === "root" || targetFolderId === "shared") {
      const savedLink =
        sharedDriveLink.trim() ||
        petugas?.drive_link ||
        (petugas?.id ? localStorage.getItem(`laporan_skp_drive_link_${petugas.id}`) : null) ||
        localStorage.getItem("laporan_skp_shared_drive_link") ||
        appSettings?.shared_drive_link ||
        "";
      const extractedId = savedLink ? extractDriveFolderId(savedLink) : null;
      if (extractedId) targetFolderId = extractedId;
    }

    // Resolve target folder URL based on configured link or ID
    const targetFolderUrl = getDriveFolderUrl(targetFolderId);

    const webhookUrl = (
      appsScriptUrl ||
      localStorage.getItem("laporan_skp_apps_script_url") ||
      appSettings?.apps_script_url ||
      ""
    ).trim();

    const token = getDriveAccessToken() || manualToken.trim();

    // Stage 1: Rendering PDF
    setUploadProgress(15);
    setUploadStatusMessage("Mengonversi foto & tata letak laporan...");

    let pdfBlob: Blob | null = null;
    try {
      setUploadProgress(30);
      setUploadStatusMessage("Membuat file PDF standar...");
      pdfBlob = await html2pdf().set(opt).from(element).output("blob");
      setUploadProgress(50);
      setUploadStatusMessage("PDF berhasil dibuat, mengunduh salinan lokal...");

      if (pdfBlob) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      }
    } catch (saveErr) {
      console.warn("Local PDF generation notice:", saveErr);
    }

    // Stage 2: Direct API / Webhook upload if credentials exist
    let backgroundUploadResult = null;
    if (pdfBlob && (token || webhookUrl)) {
      try {
        setUploadProgress(60);
        setUploadStatusMessage("Menghubungkan & mengunggah ke Google Drive...");
        backgroundUploadResult = await uploadPdfToDrive(
          pdfBlob,
          fileName,
          targetFolderId,
          token || undefined,
          webhookUrl || undefined,
          (percent, message) => {
            setUploadProgress(percent);
            setUploadStatusMessage(message);
          }
        );
      } catch (bgErr: any) {
        console.warn("Direct upload notice:", bgErr);
        setDriveUploadError(bgErr?.message || "Gagal mengunggah file ke Google Drive.");
      }
    } else {
      setDriveUploadError(
        "Token Google Drive atau Webhook Apps Script belum diisi. Silakan isi URL Webhook Apps Script atau Login Google Drive."
      );
    }

    setUploadProgress(100);
    setUploadStatusMessage("Upload Berhasil Selesai!");

    // Smooth delay so user can observe 100% completion status
    await new Promise((res) => setTimeout(res, 600));

    // Resolve web link & display inside application modal
    const finalDriveUrl = backgroundUploadResult?.webViewLink || targetFolderUrl;

    if (backgroundUploadResult) {
      setDriveUploadSuccess({
        id: backgroundUploadResult?.id || "direct-export-" + Date.now(),
        name: fileName,
        webViewLink: finalDriveUrl,
      });
      setShowDriveModal(true);
    }

    setIsUploadingDrive(false);
    handleLoadFolderFiles();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-3 md:p-8 flex flex-col items-center justify-start print:bg-white print:p-0">
      {/* Top Action & Settings Toolbar (Hidden on Print) */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 p-4 mb-6 space-y-4 print:hidden">
        {/* Top Header Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Aplikasi
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSettingsToolbar(!showSettingsToolbar)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                showSettingsToolbar
                  ? "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Settings className="w-4 h-4 text-amber-600" /> Setting Kertas
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isUploadingDrive}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Memproses PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download PDF
                </>
              )}
            </button>

            {!isUploadDriveDisabled && (
              <button
                onClick={handleOpenDriveModal}
                disabled={isGeneratingPdf || isUploadingDrive}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                title="Upload Laporan ke Google Drive via folder link"
              >
                <CloudUpload className="w-4 h-4 text-sky-100" />
                <span>Upload Laporan ke Google Drive</span>
              </button>
            )}
          </div>
        </div>

        {/* Google Drive Upload Feedback Banner */}
        {driveUploadSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Berhasil Diunggah ke Google Drive!</p>
                <p className="text-[11px] text-emerald-700">
                  File: <span className="font-mono font-semibold">{driveUploadSuccess.name}</span>
                </p>
              </div>
            </div>
            {driveUploadSuccess.webViewLink && (
              <button
                type="button"
                onClick={handleOpenDriveModal}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 transition-colors text-[11px]"
              >
                <FolderOpen className="w-3.5 h-3.5 text-emerald-100" /> Buka Modal Drive
              </button>
            )}
          </div>
        )}

        {driveUploadError && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-3.5 flex items-center justify-between text-xs text-red-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-600">Error:</span>
              <span>{driveUploadError}</span>
            </div>
            <button
              onClick={() => setDriveUploadError(null)}
              className="text-red-700 hover:text-red-900 font-bold px-2 py-0.5 rounded"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Paper Layout Customization Panel */}
        {showSettingsToolbar && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Sliders className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold text-slate-800">Pengaturan Preview & Cetak Kertas Laporan</h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              {/* Paper Size */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 text-[11px]">Ukuran Kertas:</label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="a4">A4 (210 x 297 mm)</option>
                  <option value="folio">F4 / Folio (215 x 330 mm)</option>
                  <option value="letter">Letter (215.9 x 279.4 mm)</option>
                </select>
              </div>

              {/* Margin Preset */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 text-[11px]">Margin Kertas:</label>
                <select
                  value={marginPreset}
                  onChange={(e) => setMarginPreset(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="compact">Sempit (Compact)</option>
                  <option value="normal">Standar (Normal)</option>
                  <option value="wide">Lebar (Wide)</option>
                </select>
              </div>

              {/* Font Scale */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 text-[11px]">Ukuran Font Teks:</label>
                <select
                  value={fontScale}
                  onChange={(e) => setFontScale(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="xs">Kecil (11px)</option>
                  <option value="sm">Sedang (12px - Default)</option>
                  <option value="base">Besar (14px)</option>
                </select>
              </div>

              {/* Scale (%) Option */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 text-[11px]">Skala Cetak / Scale (%):</label>
                <div className="flex gap-1">
                  <select
                    value={scaleOption}
                    onChange={(e) => setScaleOption(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="100">100% (Default)</option>
                    <option value="110">110%</option>
                    <option value="120">120%</option>
                    <option value="95">95%</option>
                    <option value="90">90%</option>
                    <option value="85">85%</option>
                    <option value="80">80%</option>
                    <option value="75">75%</option>
                    <option value="custom">Custom (%)</option>
                  </select>
                  {scaleOption === "custom" && (
                    <input
                      type="number"
                      min={30}
                      max={200}
                      value={customScale}
                      onChange={(e) => setCustomScale(Number(e.target.value))}
                      className="w-16 bg-white border border-slate-300 rounded-lg px-1.5 py-1.5 font-bold text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="%"
                    />
                  )}
                </div>
              </div>

              {/* Kop Display Mode */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 text-[11px]">Tampilan Kop Surat:</label>
                <select
                  value={kopDisplay}
                  onChange={(e) => setKopDisplay(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="auto">Otomatis (Setting Admin)</option>
                  <option value="image">Gambar Kop Uploaded</option>
                  <option value="text">Teks Kop Resmi</option>
                  <option value="hidden">Sembunyikan Kop</option>
                </select>
              </div>

              {/* Margin Atas Kop Surat (Naik/Turun) */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 text-[11px] flex items-center justify-between">
                  <span>Margin Atas Kop:</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    {kopMarginTop > 0 ? `+${kopMarginTop}` : kopMarginTop} mm
                  </span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setKopMarginTop((prev) => Math.max(-30, prev - 2))}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 font-bold rounded text-slate-700 text-xs"
                    title="Naikkan Kop Surat"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={kopMarginTop}
                    onChange={(e) => setKopMarginTop(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-1 py-1 font-bold text-center text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => setKopMarginTop((prev) => Math.min(100, prev + 2))}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 font-bold rounded text-slate-700 text-xs"
                    title="Turunkan Kop Surat"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Margin Bawah Kop Surat (Jarak ke Judul) */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 text-[11px] flex items-center justify-between">
                  <span>Margin Bawah Kop:</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    {kopMarginBottom > 0 ? `+${kopMarginBottom}` : kopMarginBottom} mm
                  </span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setKopMarginBottom((prev) => Math.max(-30, prev - 2))}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 font-bold rounded text-slate-700 text-xs"
                    title="Kurangi Jarak Bawah Kop"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={kopMarginBottom}
                    onChange={(e) => setKopMarginBottom(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-1 py-1 font-bold text-center text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => setKopMarginBottom((prev) => Math.min(100, prev + 2))}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 font-bold rounded text-slate-700 text-xs"
                    title="Tambah Jarak Bawah Kop"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Toggle Photos Checkbox & Save Default Margin Button */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={showPhotos}
                  onChange={(e) => setShowPhotos(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                Tampilkan Lampiran Foto Dokumentasi Kegiatan
              </label>

              <div className="flex items-center gap-2">
                {onSaveAppSettings && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await onSaveAppSettings({
                        kop_margin_top: kopMarginTop,
                        kop_margin_bottom: kopMarginBottom,
                      });
                      if (ok) {
                        alert("Margin Kop Surat (Atas & Bawah) berhasil disimpan sebagai default!");
                      }
                    }}
                    className="text-[11px] px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Simpan Margin Kop Default
                  </button>
                )}
                <p className="text-[10px] text-slate-400 italic">
                  *Posisi Kop Surat & margin disesuaikan otomatis saat PDF / Cetak
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Official Document Paper Container */}
      <div
        id="report-paper"
        style={{
          zoom: `${effectiveScalePercent}%`,
          transformOrigin: "top center",
        }}
        className={`w-full bg-white shadow-2xl origin-top ${getPaperDimensionsClass()} ${getMarginClass()} ${getFontScaleClass()} text-slate-900 font-serif print:p-0 print:shadow-none print:max-w-none print:w-full transition-all duration-200`}
      >
        {/* Kop Surat Section Wrapper with dynamic Margin Top & Bottom */}
        <div style={{ marginTop: `${kopMarginTop}mm`, marginBottom: `${kopMarginBottom}mm` }} className="transition-all duration-150">
          {effectiveKopMode === "image" && appSettings.kop_surat_url && (
            <div className="mb-6 text-center">
              <img
                src={appSettings.kop_surat_url}
                alt="Kop Surat Official"
                className="w-full max-h-36 object-contain mx-auto border-b-4 border-double border-black pb-2"
              />
            </div>
          )}

          {effectiveKopMode === "text" && (
            <div className="border-b-4 border-double border-black pb-4 mb-6 text-center">
              <div className="flex items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-[10px] bg-slate-100 uppercase tracking-widest shrink-0">
                  KEMENSOS
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-extrabold tracking-wider uppercase text-slate-900">
                    {appSettings.instansi_header || "KEMENTERIAN SOSIAL REPUBLIK INDONESIA"}
                  </h2>
                  <p className="text-xs font-serif italic text-slate-700">
                    {appSettings.sub_header || "Direktorat Jenderal Pemberdayaan Sosial / Dinas Sosial"}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {appSettings.alamat_header || "Jl. Salemba Raya No. 28, Jakarta Pusat / Kantor Wilayah Daerah"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Title Section */}
        <div className="text-center my-6 space-y-1">
          <h3 className="font-bold uppercase tracking-wide">
            LAPORAN TENTANG
          </h3>
          <h3 className="font-bold uppercase underline tracking-wide">
            {rkTitle}
          </h3>
        </div>

        {/* Report Content */}
        <div className="space-y-6 text-justify">
          {/* Section I */}
          <div className="report-block break-inside-avoid page-break-inside-avoid mb-5">
            <h4 className="font-bold mb-1.5 uppercase text-slate-900">I. PENDAHULUAN</h4>
            <div className="pl-4 space-y-2.5">
              <div>
                <p className="font-bold text-slate-900 mb-0.5">1. Umum</p>
                <div className="pl-1">{renderFormattedContent(umum)}</div>
              </div>
              <div>
                <p className="font-bold text-slate-900 mb-0.5">2. Maksud dan Tujuan</p>
                <div className="pl-1">{renderFormattedContent(maksud)}</div>
              </div>
              <div>
                <p className="font-bold text-slate-900 mb-0.5">3. Ruang Lingkup</p>
                <div className="pl-1">{renderFormattedContent(ruang)}</div>
              </div>
              <div>
                <p className="font-bold text-slate-900 mb-0.5">4. Dasar</p>
                <div className="pl-1">{renderFormattedContent(dasar)}</div>
              </div>
            </div>
          </div>

          {/* Section II */}
          <div className="report-block break-inside-avoid page-break-inside-avoid mb-5">
            <h4 className="font-bold mb-1.5 uppercase text-slate-900">II. PELAKSANAAN KEGIATAN</h4>
            <div className="pl-4 space-y-2.5">
              <div>{renderFormattedContent(kegiatan.isi_kegiatan)}</div>
              <p className="pt-1 font-semibold text-slate-900">Jam dan Tanggal Kegiatan dilaksanakan pada jadwal berikut:</p>
              <table className="w-full max-w-md ml-2 font-serif text-xs border-collapse">
                <tbody>
                  <tr>
                    <td className="w-32 py-1 font-semibold align-top text-slate-900">Hari / Tanggal</td>
                    <td className="py-1 align-top text-slate-900">: {hariTanggalStr}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold align-top text-slate-900">Waktu</td>
                    <td className="py-1 align-top text-slate-900">: {kegiatan.waktu || "-"}</td>
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
          <div className="report-block break-inside-avoid page-break-inside-avoid mb-5">
            <h4 className="font-bold mb-1.5 uppercase text-slate-900">III. HASIL YANG DICAPAI</h4>
            <div className="pl-4">
              {renderFormattedContent(kegiatan.hasil)}
            </div>
          </div>

          {/* Section IV */}
          <div className="report-block break-inside-avoid page-break-inside-avoid mb-5">
            <h4 className="font-bold mb-1.5 uppercase text-slate-900">IV. SIMPULAN DAN SARAN</h4>
            <div className="pl-4">
              {renderFormattedContent(simpulan)}
            </div>
          </div>

          {/* Section V */}
          <div className="report-block break-inside-avoid page-break-inside-avoid mb-5">
            <h4 className="font-bold mb-1.5 uppercase text-slate-900">V. PENUTUP</h4>
            <div className="pl-4">
              {renderFormattedContent(penutup)}
            </div>
          </div>
        </div>

        {/* Signature Box */}
        <div
          className="mt-10 flex justify-end break-inside-avoid page-break-inside-avoid"
          style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
        >
          <div
            className="w-64 text-xs space-y-1 break-inside-avoid page-break-inside-avoid"
            style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            <p>Dibuat di : {tempatDibuatLaporan}</p>
            <p>Pada Tanggal : {formattedDate}</p>
            <p className="font-semibold pt-1">Penata Layanan Operasional</p>

            <div className="h-20 flex items-center py-1">
              {userTtd ? (
                <img src={userTtd} alt="TTD" className="h-16 object-contain" />
              ) : (
                <div className="h-16" />
              )}
            </div>

            <p className="font-bold underline text-sm">{userNama}</p>
            <p className="font-mono text-[11px]">NIP. {userNip}</p>
          </div>
        </div>

        {/* Page Break for Photos Annex - Max 2 photos per page */}
        {showPhotos && photoChunks.length > 0 && (
          <div className="mt-12">
            {photoChunks.map((chunk, pageIndex) => (
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
                <h3 className="text-center font-bold text-sm uppercase mb-6">
                  LAMPIRAN DOKUMENTASI KEGIATAN{" "}
                  {photoChunks.length > 1 ? `(HALAMAN ${pageIndex + 1})` : ""}
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
                          className="w-full h-64 object-cover rounded-md border border-slate-300 shadow-2xs mx-auto"
                        />
                        <p className="text-[11px] text-slate-700 font-serif italic font-medium">
                          Dokumentasi {globalIdx + 1}: {kegiatan.tempat || "Lokasi Kegiatan"}
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

      {/* Google Drive Folder Selector Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CloudUpload className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-sm">Folder Google Drive Laporan</h3>
                  <p className="text-[11px] text-slate-400">
                    Navigasi struktur folder & upload PDF langsung ke Google Drive
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Key className="w-4 h-4" />
                  <span>Sambungkan Drive (OAuth)</span>
                </button>
                <button
                  onClick={() => setShowDriveModal(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs relative">
              {/* Full overlay loading animation during upload */}
              {(isUploadingDrive || isGeneratingPdf) && (
                <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                  <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-lg mb-1">Menyimpan Laporan...</h4>
                  <p className="text-slate-500 text-xs max-w-xs">
                    Sedang memproses dokumen PDF dan mengunggahnya ke Google Drive Anda. Mohon tunggu sebentar.
                  </p>
                </div>
              )}

              {/* Success Alert */}
              {driveUploadSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-emerald-900">
                        PDF Berhasil Diunggah ke Google Drive!
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        File: <strong>{driveUploadSuccess.name}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {driveUploadError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2.5 font-medium whitespace-pre-line text-xs">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">{driveUploadError}</div>
                  </div>

                  {/* Direct 1-Click Alternative Button */}
                  <div className="pt-2 border-t border-rose-200/80 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadAndOpenDrive}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF Langsung</span>
                    </button>
                  </div>
                </div>
              )}

              {/* EXPLORER SUB-FOLDER MODE */}
              <div className="space-y-4">
                {/* Section 1: Input Google Drive Target Link & Masuk Button */}
                <div className="p-4 bg-sky-50/90 border border-sky-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                      <LinkIcon className="w-4 h-4 text-sky-600" />
                      <span>Link Folder Google Drive Target:</span>
                    </label>
                    {sharedDriveLink && extractDriveFolderId(sharedDriveLink) && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Link Terhubung
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sharedDriveLink}
                      onChange={(e) => setSharedDriveLink(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplySharedLink();
                        }
                      }}
                      placeholder="Paste link folder Google Drive di sini (misal: https://drive.google.com/drive/folders/...)"
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplySharedLink()}
                      disabled={isApplyingSharedLink || !sharedDriveLink.trim()}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
                    >
                      {isApplyingSharedLink ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FolderOpen className="w-3.5 h-3.5 text-sky-200" />
                      )}
                      <span>Masuk</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                    <span>Folder ID: <code className="bg-sky-100 text-sky-900 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">{extractDriveFolderId(sharedDriveLink) || "root"}</code></span>
                  </div>
                </div>

                {/* Section 2: Directory Tree View Component matching screenshot */}
                <DriveTreeView
                  rootFolderId={driveFolderStack[0]?.id || "root"}
                  rootFolderName={driveFolderStack[0]?.name || "Folder Target Drive"}
                  selectedFolderId={currentFolder?.id || driveFolderStack[0]?.id || "root"}
                  selectedFolderName={currentFolder?.name || "Folder Target"}
                  onSelectFolder={(id, name) => {
                    const rootFolder = driveFolderStack[0] || { id: "root", name: "Drive Utama (Root)" };
                    if (id === rootFolder.id) {
                      setDriveFolderStack([rootFolder]);
                    } else {
                      setDriveFolderStack([rootFolder, { id, name }]);
                    }
                  }}
                  customToken={manualToken || getDriveAccessToken() || ""}
                  webhookUrl={appsScriptUrl}
                  onFolderCreated={() => {
                    fetchFolders(currentFolder.id, "", false);
                  }}
                />

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowDriveModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleExecuteUploadToDrive}
                disabled={isUploadingDrive || isGeneratingPdf}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-colors"
              >
                {isUploadingDrive || isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sedang Memproses...
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4" /> Simpan PDF ke Folder Ini
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cek File Google Drive */}
      {showCheckFilesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSearch className="w-5 h-5 text-purple-200" />
                <div>
                  <h3 className="font-bold text-sm">Cek File Google Drive (Folder Target)</h3>
                  <p className="text-[11px] text-purple-200">
                    Mendeteksi folder target dan membaca daftar file PDF yang tersimpan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckFilesModal(false)}
                className="p-1 rounded-full hover:bg-purple-600 text-purple-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Target Folder Info Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Folder Target Aktif:</span>
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-bold text-xs text-slate-800">
                      ID: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-[11px] font-mono text-purple-900">{getTargetDriveFolderId()}</code>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenDirectDriveFolder}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>Buka Folder di Drive</span>
                </button>
              </div>

              {/* Statistics & Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3">
                  <div className="p-2.5 bg-purple-600 text-white rounded-xl">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase">Jumlah File PDF</span>
                    <h4 className="text-base font-extrabold text-purple-950">
                      {driveFileList.filter((f) => f.mimeType === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")).length} File PDF
                    </h4>
                  </div>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl flex items-center gap-3">
                  <div className="p-2.5 bg-sky-600 text-white rounded-xl">
                    <FolderSearch className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-sky-700 uppercase">Total File dalam Folder</span>
                    <h4 className="text-base font-extrabold text-sky-950">{driveFileList.length} File</h4>
                  </div>
                </div>
              </div>

              {/* Search & Refresh Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={fileSearchFilter}
                    onChange={(e) => setFileSearchFilter(e.target.value)}
                    placeholder="Cari nama file PDF..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLoadFolderFiles}
                  disabled={isLoadingFileList}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFileList ? "animate-spin" : ""}`} />
                  <span>Muat Ulang</span>
                </button>
              </div>

              {/* File List Section */}
              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  Daftar File PDF & Dokumen:
                </h4>

                {isLoadingFileList ? (
                  <div className="p-8 text-center text-slate-500 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    <p className="font-semibold text-xs">Membaca file dari Google Drive...</p>
                  </div>
                ) : fileFetchError ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                    <div className="flex items-start gap-2 text-amber-900 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">Tidak dapat membaca file via API secara langsung:</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">{fileFetchError}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleOpenDirectDriveFolder}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Folder Drive Langsung (Bebas Blokir)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCheckFilesModal(false);
                          setShowDriveModal(true);
                        }}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-sky-400" />
                        <span>Isi Token Drive / Webhook</span>
                      </button>
                    </div>
                  </div>
                ) : driveFileList.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700 text-xs">Belum ada file terdeteksi di folder ini</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Anda dapat mengunggah file laporan PDF menggunakan tombol <span className="font-bold text-sky-600">"Upload Direct ke Drive"</span>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {driveFileList
                      .filter((f) => f.name.toLowerCase().includes(fileSearchFilter.toLowerCase()))
                      .map((file) => {
                        const isPdf =
                          file.mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                        const fileUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
                        return (
                          <div
                            key={file.id}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                              isPdf
                                ? "bg-red-50/40 border-red-200/80 hover:border-red-300"
                                : "bg-slate-50 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`p-2 rounded-xl shrink-0 ${
                                  isPdf ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs text-slate-800 truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-0.5">
                                  {isPdf && (
                                    <span className="font-bold text-red-600 bg-red-100 px-1.5 py-0.2 rounded text-[9.5px]">
                                      PDF
                                    </span>
                                  )}
                                  {file.createdTime && (
                                    <span>
                                      {new Date(file.createdTime).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                  {file.size && (
                                    <span>• {(parseInt(file.size, 10) / 1024).toFixed(1)} KB</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Buka File</span>
                            </a>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleOpenDirectDriveFolder}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                <span>Buka Google Drive</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCheckFilesModal(false)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal Progress Upload ke Google Drive */}
      {isUploadingDrive && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center border border-sky-100 relative overflow-hidden">
            {/* Background Glow Accent */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-200/50 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-200/50 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Animated Icon Header */}
              <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner relative">
                <CloudUpload className="w-8 h-8 animate-bounce text-sky-600" />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                </div>
              </div>

              <h3 className="text-base font-extrabold text-slate-800 mb-1">
                Mengunggah ke Google Drive
              </h3>
              
              {uploadFileName && (
                <p className="text-xs text-slate-500 font-medium max-w-xs truncate mb-4 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  📄 {uploadFileName}
                </p>
              )}

              {/* Percentage Badge */}
              <div className="flex items-baseline justify-center gap-1 my-1">
                <span className="text-4xl font-black tracking-tight text-sky-600">
                  {uploadProgress}
                </span>
                <span className="text-lg font-extrabold text-sky-500">%</span>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-3.5 mb-3 overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                <div
                  className="bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600 h-2.5 rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
                />
              </div>

              {/* Status Message */}
              <p className="text-xs font-semibold text-slate-600 min-h-[1.25rem] flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 shrink-0" />
                <span>{uploadStatusMessage || "Memproses..."}</span>
              </p>

              <div className="mt-5 text-[11px] text-slate-400 italic">
                Mohon tunggu hingga proses selesai...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
