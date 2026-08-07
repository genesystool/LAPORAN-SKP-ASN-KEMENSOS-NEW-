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
  HelpCircle,
  FileCode,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { AppsScriptGuideModal } from "./AppsScriptGuideModal";
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
    return <span className="text-slate-500 italic font-serif">-</span>;
  }

  const trimmed = content.trim();

  // If content contains HTML tags (e.g., <p>, <br>, <strong> from RichTextEditor)
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return (
      <div
        className="prose max-w-none text-slate-900 leading-relaxed font-serif text-inherit [&_*]:font-serif [&_*]:text-inherit [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:list-disc [&>ul]:pl-5 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_p]:text-inherit [&_li]:text-inherit [&_span]:text-inherit [&_div]:text-inherit [&_strong]:font-bold"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }

  // Fallback for plain text: preserve linebreaks nicely
  return <div className="whitespace-pre-line leading-relaxed font-serif text-slate-900 text-inherit">{trimmed}</div>;
};

interface PrintReportViewProps {
  kegiatan?: KegiatanHarian | null;
  kegiatanList?: KegiatanHarian[] | null;
  petugas: Petugas | null;
  rencanaBulanan?: RencanaBulanan | null;
  rencanaBulananList?: RencanaBulanan[];
  rencanaHarian?: RencanaHarian | null;
  rencanaHarianList?: RencanaHarian[];
  laporanTemplate?: LaporanTemplate | null;
  laporanList?: LaporanTemplate[];
  petugasList?: Petugas[];
  appSettings?: AppSettings;
  onSaveAppSettings?: (settings: Partial<AppSettings>) => Promise<boolean>;
  onUpdateProfile?: (updated: Partial<Petugas>) => Promise<boolean>;
  onBack: () => void;
  addToast?: (type: "success" | "error" | "info" | "warning", title: string) => void;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  kegiatan,
  kegiatanList,
  petugas,
  rencanaBulanan,
  rencanaBulananList,
  rencanaHarian,
  rencanaHarianList,
  laporanTemplate,
  laporanList,
  petugasList,
  appSettings = {} as AppSettings,
  onSaveAppSettings,
  onUpdateProfile,
  onBack,
  addToast = (_type, _title) => {},
}) => {
  const isAdmin = petugas?.level === "ADMIN";
  const permissions = appSettings?.feature_permissions || {};
  const isUploadDriveDisabled = !isAdmin && !!permissions.disableUserUploadDrive;

  // Normalized items to render
  const itemsToRender: KegiatanHarian[] = React.useMemo(() => {
    if (kegiatanList && kegiatanList.length > 0) return kegiatanList;
    if (kegiatan) return [kegiatan];
    return [];
  }, [kegiatanList, kegiatan]);

  const activeKegiatan = itemsToRender[0] || ({} as KegiatanHarian);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string>("");
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [driveUploadSuccess, setDriveUploadSuccess] = useState<DriveUploadResult | null>(null);
  const [driveUploadError, setDriveUploadError] = useState<string | null>(null);
  const [showSettingsToolbar, setShowSettingsToolbar] = useState(true);

  // PDF Viewer Modal & Inline State
  const [activePreviewTab, setActivePreviewTab] = useState<"html" | "pdf">("html");
  const [showPdfViewerModal, setShowPdfViewerModal] = useState(false);
  const [pdfPageDataUrls, setPdfPageDataUrls] = useState<string[]>([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("");
  const [pdfViewerMode, setPdfViewerMode] = useState<"iframe" | "cards">("iframe");
  const [isPdfViewerLoading, setIsPdfViewerLoading] = useState(false);
  const [pdfViewerZoom, setPdfViewerZoom] = useState<number>(100);

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

  // Helper function to generate clean export filename
  const getExportFileName = () => {
    if (itemsToRender.length > 1) {
      return `Rekap_Laporan_Kegiatan_${userNip}_${new Date().toISOString().split("T")[0]}.pdf`;
    }
    const activeRh =
      rencanaHarian ||
      (rencanaHarianList
        ? rencanaHarianList.find((rh) => rh.id === activeKegiatan.rencana_harian_id)
        : null);

    const activeRb =
      rencanaBulanan ||
      (rencanaBulananList
        ? rencanaBulananList.find((rb) => rb.id === activeKegiatan.rencana_bulanan_id)
        : null);

    const rhkBulananNo = activeRb?.no_rhk ?? laporanTemplate?.nomor_rhk ?? 1;
    const rhkHarianNo = activeRh?.norhkharian ?? null;

    let noUrut = 1;
    if (kegiatanList && kegiatanList.length > 0 && activeKegiatan) {
      const sameRhkItems = kegiatanList.filter(
        (k) =>
          k.rencana_bulanan_id === activeKegiatan.rencana_bulanan_id &&
          k.rencana_harian_id === activeKegiatan.rencana_harian_id
      );
      const idx = sameRhkItems.findIndex((k) => k.id === activeKegiatan.id);
      if (idx !== -1) {
        noUrut = idx + 1;
      }
    }

    let rhkString = `RHK. ${rhkBulananNo}.${noUrut}`;
    if (rhkHarianNo !== null && rhkHarianNo !== undefined) {
      rhkString = `RHK. ${rhkBulananNo}.${rhkHarianNo}.${noUrut}`;
    }

    let dateStr = activeKegiatan.tanggal || "";

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
      paper.style.padding = "0";
      paper.style.margin = "0 auto";
      paper.style.zoom = "1";
      paper.style.transform = "none";
      paper.classList.remove("p-6", "p-8", "p-12", "md:p-8", "md:p-14", "md:p-20", "shadow-2xl");

      const kopWrapper = paper.firstElementChild as HTMLElement;
      if (kopWrapper) {
        kopWrapper.style.boxSizing = "border-box";
      }
    }

    const reportBlocks = clonedDoc.querySelectorAll(".signature-box, .photo-item, .prevent-break");
    reportBlocks.forEach((block) => {
      const htmlBlock = block as HTMLElement;
      htmlBlock.style.breakInside = "avoid";
      htmlBlock.style.pageBreakInside = "avoid";
    });
  };

  // Helper to generate real PDF Blob URL using html2pdf
  const generatePdfBlobUrl = async (): Promise<string> => {
    const element = document.getElementById("report-paper");
    if (!element) return "";

    let pdfMargin: [number, number, number, number] = [14.73, 15, 12, 15];
    if (marginPreset === "compact") pdfMargin = [14.73, 8, 8, 8];
    if (marginPreset === "wide") pdfMargin = [14.73, 20, 18, 20];

    let pdfFormat: string | [number, number] = "a4";
    if (paperSize === "letter") pdfFormat = "letter";
    if (paperSize === "folio") pdfFormat = [215, 330];

    const opt = {
      margin: pdfMargin,
      filename: getExportFileName(),
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
      pagebreak: { mode: ["css", "legacy"] },
    };

    try {
      const pdfBlob = await html2pdf().set(opt).from(element).output("blob");
      if (pdfBlob) {
        return URL.createObjectURL(pdfBlob);
      }
    } catch (err) {
      console.error("PDF Blob generation error:", err);
    }
    return "";
  };

  // Helper to generate rendered PDF page images with current paper settings via lightweight HTML2Canvas engine
  const generatePdfPageImagesForViewer = async (): Promise<string[]> => {
    const element = document.getElementById("report-paper");
    if (!element) return [];

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: Document) => {
          sanitizeCanvasForExport(clonedDoc);
        },
      });

      if (!canvas) return [];

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate A4/Letter/Folio page height aspect ratio in pixels
      const a4Ratio = paperSize === "letter" ? 279.4 / 215.9 : paperSize === "folio" ? 330 / 215 : 297 / 210;
      const pageHeightInPx = Math.floor(imgWidth * a4Ratio);

      const pageImages: string[] = [];
      let currentY = 0;

      while (currentY < imgHeight) {
        const sliceH = Math.min(pageHeightInPx, imgHeight - currentY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = imgWidth;
        pageCanvas.height = pageHeightInPx;
        const ctx = pageCanvas.getContext("2d");

        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, imgWidth, pageHeightInPx);
          ctx.drawImage(
            canvas,
            0,
            currentY,
            imgWidth,
            sliceH,
            0,
            0,
            imgWidth,
            sliceH
          );
          pageImages.push(pageCanvas.toDataURL("image/png"));
        }

        currentY += pageHeightInPx;
      }

      return pageImages.length > 0 ? pageImages : [canvas.toDataURL("image/png")];
    } catch (err) {
      console.error("Direct HTML2Canvas PDF Preview rendering error:", err);
      return [];
    }
  };

  const handleOpenPdfViewer = async () => {
    setActivePreviewTab("pdf");
    setIsPdfViewerLoading(true);
    try {
      const [blobUrl, pageImages] = await Promise.all([
        generatePdfBlobUrl(),
        generatePdfPageImagesForViewer(),
      ]);

      if (blobUrl) {
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(blobUrl);
      }
      if (pageImages && pageImages.length > 0) {
        setPdfPageDataUrls(pageImages);
      }

      if (!blobUrl && (!pageImages || pageImages.length === 0)) {
        addToast("error", "Gagal menggenerate file PDF untuk preview.");
      }
    } catch (err) {
      console.error("Failed to generate PDF for viewer:", err);
      addToast("error", "Terjadi kesalahan saat memproses preview PDF.");
    } finally {
      setIsPdfViewerLoading(false);
    }
  };

  const handleRefreshPdfViewer = async () => {
    setIsPdfViewerLoading(true);
    try {
      const [blobUrl, pageImages] = await Promise.all([
        generatePdfBlobUrl(),
        generatePdfPageImagesForViewer(),
      ]);
      if (blobUrl) {
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(blobUrl);
      }
      if (pageImages && pageImages.length > 0) {
        setPdfPageDataUrls(pageImages);
      }
    } catch (err) {
      console.error("Refresh PDF Viewer failed:", err);
    } finally {
      setIsPdfViewerLoading(false);
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
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Export error:", err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Editable Word Document (.doc) Download handler
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  const handleDownloadDoc = () => {
    const element = document.getElementById("report-paper");
    if (!element) return;

    setIsGeneratingDoc(true);
    try {
      const clone = element.cloneNode(true) as HTMLElement;

      // 1. Reset zoom and container styles on clone for Word
      clone.style.zoom = "1";
      clone.style.transform = "none";
      clone.style.width = "100%";
      clone.style.maxWidth = "680px";
      clone.style.margin = "0 auto";
      clone.style.padding = "0";

      // 2. Clean up interactive/print-hidden elements & buttons
      const unneeded = clone.querySelectorAll(".print\\:hidden, script, .no-print, button");
      unneeded.forEach((el) => el.remove());

      // 3. Process Kop Surat Image to fit page precisely
      const kopImg = clone.querySelector('img[alt*="Kop Surat"], img[alt*="Kop"]');
      if (kopImg) {
        kopImg.setAttribute("width", "680");
        (kopImg as HTMLElement).style.cssText =
          "width: 100%; max-width: 680px; height: auto; max-height: 120px; object-fit: contain; display: block; margin: 0 auto 12px auto;";
      }

      // 4. Process TTD (Signature) Image
      const ttdImg = clone.querySelector('img[alt*="TTD"]');
      if (ttdImg) {
        ttdImg.setAttribute("width", "160");
        (ttdImg as HTMLElement).style.cssText =
          "width: 160px; max-height: 65px; object-fit: contain; display: block;";
      }

      // 5. Replace Signature Box Flex layout with Word-compatible 2-column table
      const sigContainers = clone.querySelectorAll('.mt-10.flex, div[class*="mt-10"]');
      sigContainers.forEach((sigBox) => {
        const table = document.createElement("table");
        table.className = "no-border";
        table.style.cssText =
          "width: 100%; margin-top: 30px; border: none; border-collapse: collapse; page-break-inside: avoid;";

        const tr = document.createElement("tr");
        const tdLeft = document.createElement("td");
        tdLeft.style.cssText = "width: 55%; border: none; padding: 0;";

        const tdRight = document.createElement("td");
        tdRight.style.cssText =
          "width: 45%; border: none; padding: 0; text-align: left; font-size: 11pt; font-family: 'Times New Roman', serif;";

        while (sigBox.firstChild) {
          tdRight.appendChild(sigBox.firstChild);
        }

        tr.appendChild(tdLeft);
        tr.appendChild(tdRight);
        table.appendChild(tr);

        sigBox.parentNode?.replaceChild(table, sigBox);
      });

      // 6. Process Photo Annex Images & Page Breaks precisely
      const photoAnnexes = clone.querySelectorAll(
        '.break-before-page, div[style*="breakBefore"], div[style*="pageBreakBefore"]'
      );
      photoAnnexes.forEach((annex) => {
        (annex as HTMLElement).style.cssText =
          "page-break-before: always; mso-break-type: section-break; margin-top: 30px; padding-top: 20px;";
      });

      const photoImgs = clone.querySelectorAll('img[alt*="Dokumentasi"]');
      photoImgs.forEach((img) => {
        (img as HTMLElement).style.cssText =
          "width: auto; max-width: 100%; height: auto; max-height: 320px; object-fit: contain; display: block; margin: 0 auto 10px auto; border: 1px solid #999999; border-radius: 4px;";
      });

      // 7. Format Tables (Pelaksanaan Kegiatan, Data Tables)
      const tables = clone.querySelectorAll("table");
      tables.forEach((tbl) => {
        if (!tbl.classList.contains("no-border")) {
          (tbl as HTMLElement).style.cssText =
            "width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px;";
          const cells = tbl.querySelectorAll("td, th");
          cells.forEach((cell) => {
            const el = cell as HTMLElement;
            if (!el.style.border || el.style.border === "none") {
              el.style.border = "1px solid #000000";
            }
            el.style.padding = "5px 8px";
            el.style.fontSize = "10.5pt";
            el.style.fontFamily = "'Times New Roman', serif";
            el.style.verticalAlign = "top";
          });
        }
      });

      // 8. Ensure Headings & Paragraphs retain Times New Roman & proper spacing in Word
      const headings = clone.querySelectorAll("h1, h2, h3, h4, h5, h6");
      headings.forEach((h) => {
        (h as HTMLElement).style.fontFamily = "'Times New Roman', serif";
        (h as HTMLElement).style.color = "#000000";
      });

      const paragraphs = clone.querySelectorAll("p, div, li");
      paragraphs.forEach((p) => {
        const el = p as HTMLElement;
        if (!el.style.fontFamily) {
          el.style.fontFamily = "'Times New Roman', serif";
        }
      });

      const fileNamePdf = getExportFileName();
      const fileNameDoc = fileNamePdf.replace(/\.pdf$/i, ".doc");

      const innerHtml = clone.innerHTML;

      // HTML Document Structure optimized for Microsoft Word / WPS Office / Google Docs
      const wordDocumentHtml = `<html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Laporan SKP</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![if]-->
  <style>
    @page Section1 {
      size: 210mm 297mm; /* A4 */
      margin: 15mm 15mm 15mm 15mm;
      mso-header-margin: 10mm;
      mso-footer-margin: 10mm;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: 'Times New Roman', 'Arial', serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #000000;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    h1, h2, h3, h4, h5 {
      font-family: 'Times New Roman', serif;
      color: #000000;
      margin-top: 6pt;
      margin-bottom: 4pt;
    }
    p {
      margin: 0 0 4pt 0;
      line-height: 1.35;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      width: 100%;
    }
    th, td {
      font-family: 'Times New Roman', serif;
      font-size: 10.5pt;
      vertical-align: top;
    }
    .no-border, .no-border td, .no-border th {
      border: none !important;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .underline { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="Section1" style="width: 100%; max-width: 680px; margin: 0 auto; background-color: #ffffff;">
    ${innerHtml}
  </div>
</body>
</html>`;

      const blob = new Blob(["\ufeff" + wordDocumentHtml], {
        type: "application/msword;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileNameDoc;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast("success", `File Word (.doc) berhasil diunduh: ${fileNameDoc}`);
    } catch (err) {
      console.error("Doc Export error:", err);
      addToast("error", "Gagal mengunduh file laporan format Word (.doc)");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // Google Drive Folder Selector & Shared Link State
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showInlineDriveTree, setShowInlineDriveTree] = useState(true);

  // Helper function to resolve current officer's private drive link (STRICTLY PRIVATE PER PETUGAS)
  const getPetugasPrivateDriveLink = (p?: Petugas | null) => {
    if (!p || !p.id) return "";
    const fromProfile = p.drive_link ? p.drive_link.trim() : "";
    const fromLocal = localStorage.getItem(`laporan_skp_drive_link_${p.id}`);
    return fromProfile || (fromLocal ? fromLocal.trim() : "") || "";
  };

  const [sharedDriveLink, setSharedDriveLink] = useState<string>(() => {
    return getPetugasPrivateDriveLink(petugas);
  });

  // Keep sharedDriveLink STRICTLY synced with current petugas profile - MUST NOT bleed across users
  useEffect(() => {
    const activeLink = getPetugasPrivateDriveLink(petugas);
    setSharedDriveLink(activeLink);

    const extractedId = activeLink ? extractDriveFolderId(activeLink) : null;
    if (extractedId) {
      setDriveFolderStack([{ id: extractedId, name: "Folder Target Laporan" }]);
      getDriveFolderDetails(extractedId, manualToken || undefined)
        .then((details) => {
          if (details?.name && details.name !== "Folder Target Drive") {
            setDriveFolderStack([{ id: extractedId, name: details.name }]);
          }
        })
        .catch(() => {});
    } else {
      setDriveFolderStack([{ id: "root", name: "Drive Utama (Root)" }]);
    }
  }, [petugas?.id, petugas?.drive_link]);

  // Helper to get target Google Drive folder web URL
  const getDriveFolderUrl = (folderIdOverride?: string) => {
    const targetId = folderIdOverride || currentFolder?.id;
    if (targetId && targetId !== "root" && targetId !== "shared") {
      return `https://drive.google.com/drive/folders/${targetId}`;
    }
    const savedLink = sharedDriveLink.trim() || getPetugasPrivateDriveLink(petugas);

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
    return (
      (typeof window !== "undefined" ? localStorage.getItem("laporan_skp_apps_script_url") : "") ||
      appSettings?.apps_script_url ||
      ""
    );
  });
  const [isAppsScriptSaved, setIsAppsScriptSaved] = useState(false);
  const [showAppsScriptCode, setShowAppsScriptCode] = useState(false);
  const [showAppsScriptGuideModal, setShowAppsScriptGuideModal] = useState(false);

  useEffect(() => {
    if (appSettings?.apps_script_url !== undefined) {
      setAppsScriptUrl(appSettings.apps_script_url || "");
      if (typeof window !== "undefined") {
        if (appSettings.apps_script_url) {
          localStorage.setItem("laporan_skp_apps_script_url", appSettings.apps_script_url);
        } else {
          localStorage.removeItem("laporan_skp_apps_script_url");
        }
      }
    }
  }, [appSettings?.apps_script_url]);

  const handleSaveAppsScriptUrl = async (url: string) => {
    const trimmed = url.trim();
    setAppsScriptUrl(trimmed);
    if (typeof window !== "undefined") {
      if (trimmed) {
        localStorage.setItem("laporan_skp_apps_script_url", trimmed);
      } else {
        localStorage.removeItem("laporan_skp_apps_script_url");
      }
    }
    if (onSaveAppSettings) {
      await onSaveAppSettings({ apps_script_url: trimmed });
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
      const savedLink = sharedDriveLink.trim() || getPetugasPrivateDriveLink(petugas);
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

        const savedLink = sharedDriveLink.trim() || getPetugasPrivateDriveLink(petugas);
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
    setIsUploadingDrive(false);
    setIsGeneratingPdf(false);

    const savedLink = getPetugasPrivateDriveLink(petugas);
    setSharedDriveLink(savedLink);

    const extractedId = savedLink ? extractDriveFolderId(savedLink) : null;
    if (extractedId) {
      setDriveFolderStack([{ id: extractedId, name: "Folder Target" }]);
      fetchFolders(extractedId, "", false);
      handleLoadFolderFiles(extractedId);

      getDriveFolderDetails(extractedId, manualToken || undefined)
        .then((details) => {
          if (details?.name && details.name !== "Folder Target Drive") {
            setDriveFolderStack([{ id: extractedId, name: details.name }]);
          }
        })
        .catch(() => {});
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

    try {
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
        pagebreak: { mode: ["css", "legacy"] },
      };

      let targetFolderId = currentFolder.id;
      if (targetFolderId === "root" || targetFolderId === "shared") {
        const savedLink = sharedDriveLink.trim() || getPetugasPrivateDriveLink(petugas);
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
      let uploadErrorMsg: string | null = null;

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
          uploadErrorMsg = bgErr?.message || "Gagal mengunggah file ke Google Drive.";
          setDriveUploadError(uploadErrorMsg);
        }
      } else {
        uploadErrorMsg =
          "Token Google Drive atau Webhook Apps Script belum diisi. Silakan isi URL Webhook Apps Script atau Login Google Drive.";
        setDriveUploadError(uploadErrorMsg);
      }

      if (backgroundUploadResult) {
        setUploadProgress(100);
        setUploadStatusMessage("Upload Berhasil Selesai!");
        await new Promise((res) => setTimeout(res, 600));

        const finalDriveUrl = backgroundUploadResult?.webViewLink || targetFolderUrl;
        setDriveUploadSuccess({
          id: backgroundUploadResult?.id || "direct-export-" + Date.now(),
          name: fileName,
          webViewLink: finalDriveUrl,
        });
        setShowDriveModal(true);
        addToast("success", "File PDF berhasil tersimpan di Google Drive!");
      } else {
        setUploadProgress(100);
        setUploadStatusMessage("Gagal Upload ke Google Drive");
        await new Promise((res) => setTimeout(res, 400));
        const failMsg = uploadErrorMsg || "Gagal mengunggah file ke Google Drive.";
        addToast("error", failMsg);
        setShowDriveModal(true);
      }
    } catch (err: any) {
      console.error("Critical error during execute upload to drive:", err);
      setDriveUploadError(err?.message || "Terjadi kesalahan yang tidak terduga saat upload.");
      setShowDriveModal(true);
    } finally {
      setIsUploadingDrive(false);
      handleLoadFolderFiles();
    }
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
              onClick={handleOpenPdfViewer}
              disabled={isGeneratingPdf || isPdfViewerLoading || isGeneratingDoc}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
              title="Buka Preview PDF dengan tampilan PDF Viewer"
            >
              {isPdfViewerLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Membuka PDF...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-indigo-200" /> Preview PDF Viewer
                </>
              )}
            </button>

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
              disabled={isGeneratingPdf || isGeneratingDoc || isUploadingDrive}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              title="Unduh Laporan dalam format PDF"
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

            <button
              onClick={handleDownloadDoc}
              disabled={isGeneratingPdf || isGeneratingDoc || isUploadingDrive}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              title="Unduh Laporan Format Word (.doc) yang dapat diedit di MS Word / Google Docs"
            >
              {isGeneratingDoc ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Memproses .DOC...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Download .DOC (Editable)
                </>
              )}
            </button>


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

        {/* Google Drive Target Folder Panel on Initial Preview Page */}
        {!isUploadDriveDisabled && (
          <div className="bg-sky-50/90 border border-sky-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <CloudUpload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                    Folder Google Drive Target Laporan
                  </h4>
                  <p className="text-[11px] text-sky-800 font-medium">
                    Laporan SKP akan tersimpan otomatis ke Folder Google Drive petugas ini.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {sharedDriveLink.trim() ? (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1 border border-emerald-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Folder Target Aktif
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg flex items-center gap-1 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Folder Belum Set
                  </span>
                )}
              </div>
            </div>

            {/* Folder Link Input & Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
              <div className="md:col-span-8 flex gap-2">
                <input
                  type="text"
                  value={sharedDriveLink}
                  onChange={(e) => setSharedDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="flex-1 bg-white border border-sky-300 rounded-xl px-3 py-2 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleApplySharedLink()}
                  disabled={isApplyingSharedLink}
                  className="px-3.5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  title="Simpan Link Folder Google Drive"
                >
                  {isApplyingSharedLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan</span>
                </button>
              </div>

              <div className="md:col-span-4 flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleOpenDirectDriveFolder}
                  className="flex-1 md:flex-initial px-3 py-2 bg-white hover:bg-sky-100/80 text-sky-800 border border-sky-300 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                  title="Buka Folder Google Drive di Tab Baru"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                  <span>Buka Folder</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowInlineDriveTree(!showInlineDriveTree)}
                  className="flex-1 md:flex-initial px-3 py-2 bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                  title="Tampilkan / Sembunyikan Pohon Folder Google Drive"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-sky-700" />
                  <span>{showInlineDriveTree ? "Sembunyikan Pohon Folder" : "Struktur Folder Drive"}</span>
                </button>
              </div>
            </div>

            {/* Embedded Directory Tree View on Main Preview Page */}
            {showInlineDriveTree && (
              <div className="bg-white border border-sky-200 rounded-2xl p-3.5 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-sky-600 fill-sky-100" />
                    <span>Struktur Direktori Google Drive (Pilih Folder Target):</span>
                  </span>
                  <span className="text-[11px] text-slate-500 italic">
                    Klik <strong className="text-sky-700">[+]</strong> untuk ekspand, klik nama folder untuk memilih langsung
                  </span>
                </div>

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
            )}

            {/* Active Folder Target Name & Primary Direct Upload Button */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-3 border-t border-sky-200/60">
              <div className="text-xs text-slate-700 font-medium">
                {currentFolder?.name && currentFolder.id !== "root" ? (
                  <span className="flex items-center gap-1 text-sky-900 font-bold">
                    <Folder className="w-4 h-4 text-sky-600 fill-sky-100 shrink-0" />
                    Target: <span className="underline">{currentFolder.name}</span>
                  </span>
                ) : (
                  <span className="text-slate-600 italic">
                    * Tempelkan link folder Google Drive petugas di atas agar file PDF otomatis tersimpan rapi.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleExecuteUploadToDrive}
                disabled={isGeneratingPdf || isUploadingDrive}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 disabled:from-sky-400 disabled:to-blue-400 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
              >
                {isUploadingDrive ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-sky-200" />
                    <span>Sedang Mengunggah ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4.5 h-4.5 text-sky-100" />
                    <span>UNGGAH LAPORAN PDF KE GOOGLE DRIVE</span>
                  </>
                )}
              </button>
            </div>

            {/* Upload Progress Status Bar if active */}
            {isUploadingDrive && (
              <div className="bg-white border border-sky-200 rounded-xl p-3 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                  <span>{uploadStatusMessage || "Memproses file..."}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-sky-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadingDrive(false);
                      setIsGeneratingPdf(false);
                    }}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    Batal Proses
                  </button>
                </div>
              </div>
            )}
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

      {/* Mode Switcher Tabs (HTML Paper vs Google PDF Viewer) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-200/90 p-1.5 rounded-2xl border border-slate-300 shadow-xs print:hidden">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActivePreviewTab("html")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activePreviewTab === "html"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-extrabold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Tampilan Kertas (HTML / Print)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (pdfPageDataUrls.length === 0) {
                handleOpenPdfViewer();
              } else {
                setActivePreviewTab("pdf");
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activePreviewTab === "pdf"
                ? "bg-indigo-600 text-white shadow-md font-extrabold"
                : "text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
            }`}
          >
            <Eye className="w-4 h-4 text-indigo-300" />
            <span>Preview PDF Viewer Engine</span>
            {pdfPageDataUrls.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-indigo-800 text-indigo-100 rounded-full font-mono">
                {pdfPageDataUrls.length} hal
              </span>
            )}
          </button>
        </div>

        {activePreviewTab === "pdf" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPdfViewerModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Buka dalam Modal Fullscreen"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              <span>Buka Modal Fullscreen</span>
            </button>
          </div>
        )}
      </div>

      {/* INLINE GOOGLE PDF VIEWER CONTAINER */}
      {activePreviewTab === "pdf" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200 print:hidden my-2">
          {/* Top Toolbar (Google PDF Viewer Style) */}
          <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-200">
            {/* Left Title & Badge */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs md:text-sm text-slate-100">
                    PDF Viewer Engine
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-md border border-emerald-500/30 font-semibold">
                    Live Rendering
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Pratinjau tampilan PDF persis hasil ekspor sebelum diunggah / dicetak
                </p>
              </div>
            </div>

            {/* Middle Zoom & Navigation Controls */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                type="button"
                onClick={() => setPdfViewerZoom((prev) => Math.max(50, prev - 15))}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <select
                value={pdfViewerZoom}
                onChange={(e) => setPdfViewerZoom(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded px-2 py-1 focus:outline-none"
              >
                <option value={50}>50%</option>
                <option value={75}>75%</option>
                <option value={100}>100% (Fit Width)</option>
                <option value={125}>125%</option>
                <option value={150}>150%</option>
                <option value={200}>200%</option>
              </select>

              <button
                type="button"
                onClick={() => setPdfViewerZoom((prev) => Math.min(200, prev + 15))}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={handleRefreshPdfViewer}
                disabled={isPdfViewerLoading}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer"
                title="Perbarui Preview PDF"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPdfViewerLoading ? "animate-spin text-sky-400" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>

              {!isUploadDriveDisabled && (
                <button
                  type="button"
                  onClick={handleExecuteUploadToDrive}
                  disabled={isUploadingDrive || isGeneratingPdf}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  {isUploadingDrive ? (
                    <Loader2 className="w-4 h-4 animate-spin text-sky-200" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  <span>{isUploadingDrive ? "Uploading..." : "Upload Ke Drive"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Viewer Body Canvas */}
          <div className="bg-slate-950 relative overflow-y-auto overflow-x-auto p-4 md:p-8 flex flex-col items-center gap-6 scrollbar-thin min-h-[450px]">
            {isPdfViewerLoading ? (
              <div className="flex flex-col items-center justify-center my-auto p-12 text-center text-slate-300 space-y-3">
                <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner relative">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-100">Menyiapkan PDF Viewer...</h4>
                  <p className="text-xs text-slate-400">
                    Mengonversi format teks baris demi baris, margins, dan foto dokumentasi
                  </p>
                </div>
              </div>
            ) : pdfPageDataUrls.length > 0 ? (
              <div
                className="flex flex-col items-center gap-6 transition-all duration-200"
                style={{
                  transform: `scale(${pdfViewerZoom / 100})`,
                  transformOrigin: "top center",
                }}
              >
                {pdfPageDataUrls.map((dataUrl, idx) => (
                  <div
                    key={idx}
                    className="relative bg-white shadow-2xl rounded-xs border border-slate-700 overflow-hidden group"
                  >
                    <img
                      src={dataUrl}
                      alt={`Halaman ${idx + 1}`}
                      className="block max-w-full h-auto"
                    />
                    <div className="absolute top-3 right-3 bg-slate-900/90 text-slate-100 text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-md border border-slate-700/80 backdrop-blur-xs flex items-center gap-1.5 pointer-events-none">
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      <span>Halaman {idx + 1} dari {pdfPageDataUrls.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-xs flex flex-col items-center justify-center my-12 gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <p>Belum ada preview PDF yang dibuat. Klik tombol Refresh untuk memuat.</p>
                <button
                  type="button"
                  onClick={handleRefreshPdfViewer}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-md"
                >
                  Generate PDF Viewer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Document Paper Container */}
      <div
        id="report-paper"
        style={{
          zoom: `${effectiveScalePercent}%`,
          transformOrigin: "top center",
        }}
        className={`w-full bg-white shadow-2xl origin-top ${getPaperDimensionsClass()} ${getMarginClass()} ${getFontScaleClass()} text-slate-900 font-serif print:p-0 print:shadow-none print:max-w-none print:w-full transition-all duration-200 ${
          activePreviewTab === "pdf" ? "hidden print:block" : ""
        }`}
      >
        {itemsToRender.map((kegItem, kegIdx) => {
          const parentRb =
            (rencanaBulananList || []).find((rb) => rb.id === kegItem.rencana_bulanan_id) ||
            (kegItem.id === kegiatan?.id ? rencanaBulanan : null);

          const parentRh =
            (rencanaHarianList || []).find((rh) => rh.id === kegItem.rencana_harian_id) ||
            (kegItem.id === kegiatan?.id ? rencanaHarian : null);

          const lapTemplate =
            (laporanList || []).find((l) => l.nomor_rhk === parentRb?.no_rhk) ||
            (kegItem.id === kegiatan?.id ? laporanTemplate : null);

          const rkTitle = parentRb?.rencana_kerja || "PELAKSANAAN TUGAS OPERASIONAL";
          const formattedDate = formatIndonesianDate(kegItem.tanggal);
          const hariTanggalStr = `${kegItem.haritglkegiatan}, ${formattedDate}`;
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

          // Chunk photos for this item
          const itemPhotos = kegItem.foto_kegiatan1 || [];
          const itemPhotoChunks: string[][] = [];
          for (let i = 0; i < itemPhotos.length; i += 2) {
            itemPhotoChunks.push(itemPhotos.slice(i, i + 2));
          }

          return (
            <div
              key={kegItem.id || kegIdx}
              className={kegIdx > 0 ? "pt-10 border-t-2 border-slate-900 break-before-page page-break-before" : ""}
              style={kegIdx > 0 ? { breakBefore: "page", pageBreakBefore: "always" } : undefined}
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
                    <div>{renderFormattedContent(kegItem.isi_kegiatan)}</div>
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
                className="mt-10 flex justify-end break-inside-avoid page-break-inside-avoid"
                style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
              >
                <div
                  className="w-64 font-serif text-inherit space-y-1 break-inside-avoid page-break-inside-avoid"
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

                  <p className="font-bold underline text-inherit">{userNama}</p>
                  <p className="font-serif text-inherit">NIP. {userNip}</p>
                </div>
              </div>

              {/* Page Break for Photos Annex - Max 2 photos per page */}
              {showPhotos && itemPhotoChunks.length > 0 && (
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
                      <h3 className="text-center font-bold text-sm uppercase mb-6">
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
                <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                  <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-lg mb-1">Menyimpan Laporan...</h4>
                  <p className="text-slate-500 text-xs max-w-xs mb-3">
                    Sedang memproses dokumen PDF dan mengunggahnya ke Google Drive Anda. Mohon tunggu sebentar.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadingDrive(false);
                      setIsGeneratingPdf(false);
                    }}
                    className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    Batal / Unfreeze Modal
                  </button>
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
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF Langsung Ke Komputer</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadDoc}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Unduh .DOC (Editable Word)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAppsScriptGuideModal(true)}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Lihat Panduan & Kode Apps Script</span>
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

                {/* Section 1B: Apps Script Webhook URL Config (Admin Only) */}
                {isAdmin && (
                  <div className="p-4 bg-purple-50/90 border border-purple-200 rounded-2xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <FileCode className="w-4 h-4 text-purple-600" />
                        <span>Apps Script Webhook URL (Khusus Admin):</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAppsScriptGuideModal(true)}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Petunjuk &amp; Kode</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={appsScriptUrl}
                          onChange={(e) => setAppsScriptUrl(e.target.value)}
                          placeholder="https://script.google.com/macros/s/.../exec"
                          className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveAppsScriptUrl(appsScriptUrl)}
                          className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Webhook</span>
                        </button>
                        {appsScriptUrl.trim() ? (
                          <button
                            type="button"
                            title="Hapus / Reset Webhook"
                            onClick={() => {
                              setAppsScriptUrl("");
                              handleSaveAppsScriptUrl("");
                            }}
                            className="px-2.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center shrink-0 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>

                      {isAppsScriptSaved && (
                        <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 animate-in fade-in">
                          <Check className="w-3.5 h-3.5" /> URL Webhook berhasil diperbarui oleh Admin!
                        </p>
                      )}

                      <p className="text-[10.5px] text-purple-900 font-medium">
                        * Admin dapat mengubah, mengganti, atau memperbarui URL Webhook kapan saja jika ada pembaruan versi di Google Apps Script.
                      </p>

                      {/* Realtime URL warning if user pasted Vercel or non-Apps Script URL */}
                      {appsScriptUrl.trim() && !appsScriptUrl.includes("script.google.com") && (
                        <div className="p-2.5 bg-rose-100 border border-rose-300 text-rose-950 rounded-xl text-[11px] space-y-1 animate-in fade-in">
                          <div className="flex items-start gap-1.5 font-bold text-rose-900">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <span>Peringatan: URL Webhook Tidak Valid!</span>
                          </div>
                          <p className="text-[10.5px] leading-relaxed text-rose-900">
                            URL <code className="bg-rose-200 text-rose-950 px-1 py-0.5 rounded font-mono font-bold">{appsScriptUrl}</code> bukan URL Google Apps Script. Jangan masukkan domain Vercel / website.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowAppsScriptGuideModal(true)}
                            className="mt-1 text-[11px] font-extrabold text-purple-800 underline flex items-center gap-1 hover:text-purple-950 cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Klik di sini untuk melihat Panduan &amp; Kode Apps Script yang benar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
      {/* Google PDF Viewer Modal */}
      {showPdfViewerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex flex-col p-2 md:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-full max-w-6xl w-full mx-auto overflow-hidden">
            {/* Top Toolbar (Google Docs / Google PDF Viewer Style) */}
            <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-200">
              {/* Left Title & Badge */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg border border-rose-500/20 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-100 truncate max-w-xs md:max-w-md">
                      {getExportFileName()}
                    </h3>
                    <span className="text-[10px] bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1 shrink-0">
                      <Eye className="w-3 h-3 text-sky-400" /> PDF Viewer
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Preview tampilan PDF resmi ({paperSize.toUpperCase()} • {marginPreset} margin)
                  </p>
                </div>
              </div>

              {/* Middle Controls (Zoom & Refresh) */}
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPdfViewerZoom((prev) => Math.max(50, prev - 15))}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <select
                  value={pdfViewerZoom}
                  onChange={(e) => setPdfViewerZoom(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded px-2 py-1 focus:outline-none"
                >
                  <option value={50}>50%</option>
                  <option value={75}>75%</option>
                  <option value={100}>100% (Fit Width)</option>
                  <option value={125}>125%</option>
                  <option value={150}>150%</option>
                  <option value={200}>200%</option>
                </select>

                <button
                  type="button"
                  onClick={() => setPdfViewerZoom((prev) => Math.min(200, prev + 15))}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-slate-700 mx-1" />

                <button
                  type="button"
                  onClick={handleRefreshPdfViewer}
                  disabled={isPdfViewerLoading}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded flex items-center gap-1 transition-colors"
                  title="Perbarui Preview PDF"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPdfViewerLoading ? "animate-spin text-sky-400" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                  title="Cetak Laporan"
                >
                  <Printer className="w-4 h-4 text-slate-300" />
                  <span className="hidden sm:inline">Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  title="Unduh PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                {!isUploadDriveDisabled && (
                  <button
                    type="button"
                    onClick={handleExecuteUploadToDrive}
                    disabled={isUploadingDrive || isGeneratingPdf}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    title="Upload Langsung Ke Google Drive"
                  >
                    {isUploadingDrive ? (
                      <Loader2 className="w-4 h-4 animate-spin text-sky-200" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                    <span>{isUploadingDrive ? "Uploading..." : "Upload Ke Drive"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPdfViewerModal(false)}
                  className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-colors ml-1 cursor-pointer"
                  title="Tutup Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Target Google Drive Sub-Bar in PDF Modal */}
            {!isUploadDriveDisabled && (
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CloudUpload className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="font-semibold text-slate-200 shrink-0">Folder Drive Target:</span>
                  <input
                    type="text"
                    value={sharedDriveLink}
                    onChange={(e) => setSharedDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="flex-1 max-w-md bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 font-mono text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplySharedLink()}
                    disabled={isApplyingSharedLink}
                    className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {isApplyingSharedLink ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    <span>Set Folder</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenDriveModal}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                    <span>Pohon Folder Drive</span>
                  </button>
                </div>
              </div>
            )}

            {/* Viewer Body Canvas */}
            <div className="flex-1 bg-slate-950 relative overflow-y-auto overflow-x-auto p-4 md:p-8 flex flex-col items-center gap-6 scrollbar-thin">
              {isPdfViewerLoading ? (
                <div className="flex flex-col items-center justify-center my-auto p-8 text-center text-slate-300 space-y-3">
                  <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner relative">
                    <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-100">Menyiapkan Google PDF Viewer...</h4>
                    <p className="text-xs text-slate-400">
                      Mengonversi format teks baris demi baris, margins, dan foto dokumentasi
                    </p>
                  </div>
                </div>
              ) : pdfPageDataUrls.length > 0 ? (
                <div
                  className="flex flex-col items-center gap-6 transition-all duration-200"
                  style={{
                    transform: `scale(${pdfViewerZoom / 100})`,
                    transformOrigin: "top center",
                  }}
                >
                  {pdfPageDataUrls.map((dataUrl, idx) => (
                    <div
                      key={idx}
                      className="relative bg-white shadow-2xl rounded-xs border border-slate-700 overflow-hidden group"
                    >
                      <img
                        src={dataUrl}
                        alt={`Halaman ${idx + 1}`}
                        className="block max-w-full h-auto"
                      />
                      <div className="absolute top-3 right-3 bg-slate-900/90 text-slate-100 text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-md border border-slate-700/80 backdrop-blur-xs flex items-center gap-1.5 pointer-events-none">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        <span>Halaman {idx + 1} dari {pdfPageDataUrls.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-xs flex flex-col items-center justify-center my-auto gap-3">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <p>Gagal memuat preview PDF. Silakan coba klik tombol Refresh.</p>
                  <button
                    type="button"
                    onClick={handleRefreshPdfViewer}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition-colors"
                  >
                    Refresh Preview
                  </button>
                </div>
              )}
            </div>

            {/* Modal Bottom Footer / Hint */}
            <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                PDF Viewer Engine • {pdfPageDataUrls.length} Halaman ({paperSize.toUpperCase()})
              </span>
              <button
                type="button"
                onClick={() => setShowPdfViewerModal(false)}
                className="text-slate-300 hover:text-white font-semibold underline cursor-pointer"
              >
                Tutup Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apps Script Guide & Code Modal */}
      <AppsScriptGuideModal
        isOpen={showAppsScriptGuideModal}
        onClose={() => setShowAppsScriptGuideModal(false)}
        addToast={addToast}
      />
    </div>
  );
};
