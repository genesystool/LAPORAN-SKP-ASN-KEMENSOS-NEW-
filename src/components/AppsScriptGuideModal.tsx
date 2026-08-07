import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  FileCode,
  ExternalLink,
  HelpCircle,
  AlertTriangle,
  Code,
  CheckCircle,
} from "lucide-react";

interface AppsScriptGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (type: "success" | "error" | "info" | "warning", title: string) => void;
}

export const APPS_SCRIPT_CODE = `// Jalankan fungsi ini 1x di Editor Google Apps Script jika muncul 'Access denied: DriveApp'
function testDriveAccess() {
  var rootFolder = DriveApp.getRootFolder();
  Logger.log("Izin Google Drive Aktif! Root Folder ID: " + rootFolder.getId());
  return "Otorisasi Google Drive Berhasil!";
}

function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (pErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var action = data.action || "uploadFile";

    // Action: List Files inside Folder
    if (action === "listFiles") {
      var targetFolderId = data.folderId || "root";
      var f = (targetFolderId && targetFolderId !== "root" && targetFolderId !== "shared") 
        ? DriveApp.getFolderById(targetFolderId) 
        : DriveApp.getRootFolder();
      var filesIterator = f.getFiles();
      var filesList = [];
      while (filesIterator.hasNext()) {
        var item = filesIterator.next();
        filesList.push({
          id: item.getId(),
          name: item.getName(),
          mimeType: item.getMimeType(),
          webViewLink: item.getUrl(),
          createdTime: item.getDateCreated().toISOString(),
          size: item.getSize()
        });
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        files: filesList
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Action: List Subfolders inside Folder
    if (action === "listFolders") {
      var targetFolderId = data.parentId || "root";
      var f = (targetFolderId && targetFolderId !== "root" && targetFolderId !== "shared") 
        ? DriveApp.getFolderById(targetFolderId) 
        : DriveApp.getRootFolder();
      var foldersIterator = f.getFolders();
      var foldersList = [];
      while (foldersIterator.hasNext()) {
        var folderItem = foldersIterator.next();
        foldersList.push({
          id: folderItem.getId(),
          name: folderItem.getName()
        });
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        folders: foldersList
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Action: Upload File (Default)
    var fileName = data.filename || data.fileName || "Laporan_SKP.pdf";
    var folderId = data.folderId || "root";
    var base64Data = data.fileData || data.base64Data;
    var mimeType = data.mimeType || "application/pdf";
    
    if (!base64Data) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Data file Base64 tidak ditemukan dalam payload request"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (base64Data.indexOf(",") > -1) {
      base64Data = base64Data.split(",")[1];
    }
    
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    var folder;
    if (folderId && folderId !== "root" && folderId !== "shared") {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (err) {
        folder = DriveApp.getRootFolder();
      }
    } else {
      folder = DriveApp.getRootFolder();
    }
    
    var file = folder.createFile(blob);
    
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingErr) {
      // Ignored if domain policy restricts public sharing
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Google Apps Script Webhook SKP Online Active").setMimeType(ContentService.MimeType.TEXT);
};`;

export const AppsScriptGuideModal: React.FC<AppsScriptGuideModalProps> = ({
  isOpen,
  onClose,
  addToast,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setIsCopied(true);
      addToast("success", "Kode Apps Script berhasil disalin ke clipboard!");
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      addToast("error", "Gagal menyalin kode. Silakan salin secara manual.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
              <FileCode className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Panduan Webhook Google Apps Script</h3>
              <p className="text-xs text-purple-200">
                Langkah membuat Webhook Upload PDF ke Google Drive (Bebas Blokir Hosting/Vercel)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 text-purple-100 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300 flex-1">
          {/* Important Warning Banner regarding Vercel domain */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>PERHATIAN PENTING Mengenai URL Webhook:</span>
            </div>
            <p className="text-[11.5px] text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>JANGAN memasukkan domain Vercel (seperti <code className="bg-amber-200 dark:bg-amber-800 px-1 py-0.5 rounded font-mono">laporanskp.vercel.app</code>)</strong> sebagai Webhook! Domain Vercel adalah alamat website aplikasi ini, bukan server Google Drive.
            </p>
            <p className="text-[11.5px] text-amber-900 dark:text-amber-200 leading-relaxed">
              URL Webhook yang benar adalah URL yang didapatkan dari <strong>Google Apps Script</strong> di Google Drive, yang selalu diawali dengan:
              <br />
              <code className="bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 px-2 py-0.5 rounded font-mono font-bold block mt-1 break-all">
                https://script.google.com/macros/s/.../exec
              </code>
            </p>
          </div>

          {/* Step by step guide */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-600" />
              <span>Langkah-Langkah Pembuatan Webhook Google Apps Script:</span>
            </h4>

            <ol className="space-y-2.5 pl-1 list-decimal list-inside text-slate-700 dark:text-slate-300 leading-relaxed">
              <li className="pl-1">
                Buka situs Google Apps Script:{" "}
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                >
                  script.google.com <ExternalLink className="w-3 h-3" />
                </a>{" "}
                (atau Buka Google Drive &gt; Klik tombol <strong>Baru</strong> &gt; <strong>Lainnya</strong> &gt; <strong>Google Apps Script</strong>).
              </li>

              <li className="pl-1">
                Hapus seluruh kode contoh bawaan di editor <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold">Code.gs</code>.
              </li>

              <li className="pl-1">
                Klik tombol <strong>"Salin Kode Apps Script"</strong> di bawah ini, lalu <strong>Paste (Tempel)</strong> ke dalam editor Google Apps Script.
              </li>

              <li className="pl-1">
                Klik tombol biru <strong>Terapkan (Deploy)</strong> di kanan atas &gt; Pilih <strong>Penerapan Baru (New deployment)</strong>.
              </li>

              <li className="pl-1">
                Klik ikon Roda Gigi (Pilih jenis) &gt; Pilih <strong>Aplikasi Web (Web App)</strong>.
              </li>

              <li className="pl-1 bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1">
                <p className="font-bold text-purple-900 dark:text-purple-200">
                  Atur Konfigurasi Wajib:
                </p>
                <p>
                  • <strong>Jalankan sebagai (Execute as)</strong>: Setel ke <strong>Saya (Me)</strong> [Email Google Anda].
                </p>
                <p>
                  • <strong>Yang memiliki akses (Who has access)</strong>: Setel ke <strong>Siapa saja (Anyone)</strong>. <span className="text-rose-600 font-bold dark:text-rose-400">(SANGAT PENTING!)</span>
                </p>
              </li>

              <li className="pl-1">
                Klik <strong>Terapkan (Deploy)</strong> &gt; Klik <strong>Izin Akses (Authorize Access)</strong> &gt; Pilih Akun Google Anda &gt; Klik <strong>Lanjutan (Advanced)</strong> &gt; Klik <strong>Buka Project (Go to project)</strong> &gt; Klik <strong>Izinkan (Allow)</strong>.
              </li>

              <li className="pl-1">
                Salin <strong>URL Aplikasi Web (Web App URL)</strong> yang dihasilkan (berakhiran <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-purple-600 dark:text-purple-400">/exec</code>).
              </li>

              <li className="pl-1">
                Tempelkan URL tersebut ke kolom <strong>Apps Script Webhook URL</strong> di aplikasi ini, lalu klik <strong>Simpan Pengaturan</strong>.
              </li>
            </ol>
          </div>

          {/* Copyable Code Block */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-purple-600" />
                <span>Kode Google Apps Script (Code.gs):</span>
              </label>

              <button
                type="button"
                onClick={handleCopyCode}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  isCopied
                    ? "bg-emerald-600 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kode Apps Script</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-purple-300 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800 leading-relaxed shadow-inner select-all">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Admin dapat memperbarui atau mengubah URL Webhook kapan saja di aplikasi</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
