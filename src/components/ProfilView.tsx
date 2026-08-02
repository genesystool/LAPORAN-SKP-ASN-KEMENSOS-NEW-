import React, { useState, useEffect } from "react";
import { Petugas, ToastMessage } from "../types";
import { compressImageFile } from "../lib/imageUtils";
import { User, Key, Save, Camera, FileCheck, Loader2, Cloud, Link as LinkIcon } from "lucide-react";

interface ProfilViewProps {
  currentUser: Petugas;
  onUpdateProfile: (updated: Partial<Petugas>) => Promise<boolean>;
  addToast: (type: ToastMessage["type"], title: string) => void;
}

export const ProfilView: React.FC<ProfilViewProps> = ({
  currentUser,
  onUpdateProfile,
  addToast,
}) => {
  const [nama, setNama] = useState(currentUser.nama);
  const [password, setPassword] = useState("");
  const [foto, setFoto] = useState(currentUser.foto || "");
  const [scanTtd, setScanTtd] = useState(currentUser.scan_ttd || "");
  const [tempatDibuat, setTempatDibuat] = useState(currentUser.tempat_dibuat || "Aceh Tamiang");
  const [driveLink, setDriveLink] = useState(
    currentUser.drive_link ||
      (currentUser.id ? localStorage.getItem(`laporan_skp_drive_link_${currentUser.id}`) : null) ||
      ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever currentUser changes to guarantee privacy per logged-in user
  useEffect(() => {
    setNama(currentUser.nama);
    setFoto(currentUser.foto || "");
    setScanTtd(currentUser.scan_ttd || "");
    setTempatDibuat(currentUser.tempat_dibuat || "Aceh Tamiang");
    const link =
      currentUser.drive_link ||
      (currentUser.id ? localStorage.getItem(`laporan_skp_drive_link_${currentUser.id}`) : null) ||
      "";
    setDriveLink(link);
  }, [currentUser.id, currentUser.drive_link, currentUser.nama, currentUser.foto, currentUser.scan_ttd, currentUser.tempat_dibuat]);

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const compressed = await compressImageFile(e.target.files[0], 150);
        setFoto(compressed);
        addToast("success", "Foto profil siap disimpan");
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
        addToast("success", "Scan TTD siap disimpan");
      } catch (err) {
        addToast("error", "Gagal memproses TTD");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      addToast("warning", "Nama lengkap tidak boleh kosong!");
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanDriveLink = driveLink.trim();
      const payload: Partial<Petugas> = {
        nama: nama.trim(),
        foto,
        scan_ttd: scanTtd,
        tempat_dibuat: tempatDibuat.trim() || "Aceh Tamiang",
        drive_link: cleanDriveLink,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      // Local storage backup strictly bound to current user ID
      if (currentUser?.id) {
        if (cleanDriveLink) {
          localStorage.setItem(`laporan_skp_drive_link_${currentUser.id}`, cleanDriveLink);
        } else {
          localStorage.removeItem(`laporan_skp_drive_link_${currentUser.id}`);
        }
      }

      const ok = await onUpdateProfile(payload);
      if (ok) {
        addToast("success", "Profil berhasil diperbarui!");
        setPassword("");
      } else {
        addToast("error", "Gagal mengupdate profil");
      }
    } catch (err) {
      addToast("error", "Gagal mengupdate profil");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Profil Saya</h1>
        <p className="text-xs text-slate-500">
          Pengaturan Informasi Akun, Kata Sandi, dan Tanda Tangan Digital
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 text-center space-y-4">
          <div className="relative inline-block mx-auto">
            {foto ? (
              <img
                src={foto}
                alt={nama}
                className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md mx-auto">
                {nama.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-800">{currentUser.nama}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">NIP: {currentUser.nip}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-full text-[10px]">
              Aksens: {currentUser.level}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 text-left text-xs text-slate-600 space-y-2">
            <p className="flex justify-between">
              <span>Status Akun:</span>
              <span className="font-bold text-emerald-600">{currentUser.status}</span>
            </p>
            <p className="flex justify-between">
              <span>Scan TTD:</span>
              <span className="font-bold">
                {scanTtd ? "Tersedia" : "Belum diupload"}
              </span>
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Edit Data Profil & Password
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP (Username)
              </label>
              <input
                type="text"
                disabled
                value={currentUser.nip}
                className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-500 font-mono"
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
                Tempat Dibuat Laporan (misal: Aceh Tamiang)
              </label>
              <input
                type="text"
                value={tempatDibuat}
                onChange={(e) => setTempatDibuat(e.target.value)}
                placeholder="Aceh Tamiang"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-sky-600" />
                <span>Link Shared Google Drive Pribadi (Folder Target Export PDF):</span>
              </label>
              <input
                type="text"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="Paste link: https://drive.google.com/drive/folders/1A2B3C..."
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-500">
                Aplikasi akan membaca folder di link Google Drive ini dan menyimpan PDF Laporan Harian Anda secara otomatis ke lokasi tersebut.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password Baru
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kosongkan jika tidak ingin mengubah password"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Update Foto Diri
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Update Scan Tanda Tangan (TTD Digital)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleTtdChange}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {scanTtd && (
                <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg inline-block">
                  <p className="text-[10px] text-slate-400 mb-1">Preview TTD:</p>
                  <img src={scanTtd} alt="TTD" className="h-12 object-contain" />
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
