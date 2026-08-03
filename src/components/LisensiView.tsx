import React, { useState, useEffect } from "react";
import { Petugas, Lisensi, AppSettings, ToastMessage, CoffeePackage } from "../types";
import { compressImageFile } from "../lib/imageUtils";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import {
  Key,
  CheckCircle2,
  Lock,
  Unlock,
  Coffee,
  MessageCircle,
  X,
  Clock,
  Sparkles,
  Infinity as InfinityIcon,
  PhoneCall,
  Upload,
  Copy,
  ShieldCheck,
  Building,
  Image as ImageIcon,
  Trash2,
  Search,
  Check,
  RefreshCw,
  Cloud,
  Sliders,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Edit3,
  PlusCircle,
  Printer,
  Info,
  Server,
  Code2,
  Cpu,
  HardDrive,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";

const DEFAULT_COFFEE_PACKAGES: CoffeePackage[] = [
  {
    id: "trial",
    title: "Nyobai Kopi Pahit",
    badge: "Trial / Dasar",
    icon: "coffee",
    descriptionList: [
      "Pemakaian aplikasi dibatasi 5 Laporan",
      "Konsultasi Sambil ngopi (Ya)",
      "Akses standar fitur dasar",
    ],
    priceLabel: "Harga",
    priceValue: "Gratis",
    pricePeriod: "",
    buttonText: "Tanya Kede Kopi",
    popular: false,
    enabled: true,
  },
  {
    id: "langganan",
    title: "Langganan Kopi (Populer)",
    badge: "Paling Populer",
    icon: "clock",
    descriptionList: [
      "Fitur Bebas Ngopi & Laporan",
      "Layanan Ngopi bareng (Ya)",
      "Aktif Akun Sesuai Gelas Kopi",
    ],
    priceLabel: "Harga mulai",
    priceValue: "Seiklasnya",
    pricePeriod: "/bulan",
    buttonText: "Tanya Kede Kopi",
    popular: true,
    enabled: true,
  },
  {
    id: "lifetime",
    title: "Ngopi Unlimited (Lifetime)",
    badge: "Akses Selamanya",
    icon: "infinity",
    descriptionList: [
      "Fitur Unlimited Ngopi Berapa Gelas",
      "Lifetime Ngobrol Sambil Ngopi",
      "Konsultasi & Support Prioritas",
    ],
    priceLabel: "Sekali Bayar",
    priceValue: "Rp 200.000",
    pricePeriod: "/Tahun",
    buttonText: "Tanya Kede Kopi",
    popular: false,
    enabled: true,
  },
];

interface LisensiViewProps {
  currentUser: Petugas;
  isLicensed: boolean;
  kegiatanCount: number;
  petugasList?: Petugas[];
  lisensiList?: Lisensi[];
  appSettings?: AppSettings;
  onActivateLicense: (code: string, targetNip?: string, targetPetugasId?: string) => Promise<boolean>;
  onDeleteLicense?: (id: string) => Promise<boolean>;
  onSaveAppSettings?: (settings: Partial<AppSettings>) => Promise<boolean>;
  addToast: (type: ToastMessage["type"], title: string) => void;
}

export const LisensiView: React.FC<LisensiViewProps> = ({
  currentUser,
  isLicensed,
  kegiatanCount,
  petugasList = [],
  lisensiList = [],
  appSettings = {} as AppSettings,
  onActivateLicense,
  onDeleteLicense,
  onSaveAppSettings,
  addToast,
}) => {
  const isAdmin = currentUser.level === "ADMIN";

  // Active Tab
  const [activeTab, setActiveTab] = useState<"user" | "keygen" | "kop" | "fitur" | "versi" | "kopi">("user");

  const [showContactModal, setShowContactModal] = useState(false);

  // Keygen State (Admin)
  const [selectedPetugasId, setSelectedPetugasId] = useState<string>("");
  const [generatedKey, setGeneratedKey] = useState<string>("");
  const [keySearch, setKeySearch] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [revokeConfirm, setRevokeConfirm] = useState<{ id: string; nama: string } | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Kop Surat State (Admin)
  const [kopMode, setKopMode] = useState<"image" | "text">(appSettings.kop_mode || "text");
  const [kopUrl, setKopUrl] = useState<string>(appSettings.kop_surat_url || "");
  const [instansiHeader, setInstansiHeader] = useState<string>(
    appSettings.instansi_header || "KEMENTERIAN SOSIAL REPUBLIK INDONESIA"
  );
  const [subHeader, setSubHeader] = useState<string>(
    appSettings.sub_header || "Direktorat Jenderal Pemberdayaan Sosial / Dinas Sosial"
  );
  const [alamatHeader, setAlamatHeader] = useState<string>(
    appSettings.alamat_header || "Jl. Salemba Raya No. 28, Jakarta Pusat / Kantor Wilayah Daerah"
  );
  const [isSavingKop, setIsSavingKop] = useState(false);

  // Feature Permissions State (Admin)
  const [disableUserAdd, setDisableUserAdd] = useState<boolean>(
    !!appSettings.feature_permissions?.disableUserAdd
  );
  const [disableUserEdit, setDisableUserEdit] = useState<boolean>(
    !!appSettings.feature_permissions?.disableUserEdit
  );
  const [disableUserDelete, setDisableUserDelete] = useState<boolean>(
    !!appSettings.feature_permissions?.disableUserDelete
  );
  const [disableUserPrintPdf, setDisableUserPrintPdf] = useState<boolean>(
    !!appSettings.feature_permissions?.disableUserPrintPdf
  );
  const [disableUserUploadDrive, setDisableUserUploadDrive] = useState<boolean>(
    !!appSettings.feature_permissions?.disableUserUploadDrive
  );
  const [disableUserCopyTemplate, setDisableUserCopyTemplate] = useState<boolean>(
    !!appSettings.feature_permissions?.disableUserCopyTemplate
  );
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Coffee Packages State (Admin Configurable & Show/Hide Toggle)
  const [showCoffeePackages, setShowCoffeePackages] = useState<boolean>(
    appSettings.show_coffee_packages !== false
  );
  const [coffeePackages, setCoffeePackages] = useState<CoffeePackage[]>(() => {
    if (appSettings.coffee_packages && appSettings.coffee_packages.length > 0) {
      return appSettings.coffee_packages;
    }
    return DEFAULT_COFFEE_PACKAGES;
  });
  const [editingPackage, setEditingPackage] = useState<CoffeePackage | null>(null);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [isSavingCoffeeSettings, setIsSavingCoffeeSettings] = useState(false);
  const [newFeatureText, setNewFeatureText] = useState("");

  useEffect(() => {
    if (appSettings) {
      if (appSettings.kop_mode) setKopMode(appSettings.kop_mode);
      if (appSettings.kop_surat_url) setKopUrl(appSettings.kop_surat_url);
      if (appSettings.instansi_header) setInstansiHeader(appSettings.instansi_header);
      if (appSettings.sub_header) setSubHeader(appSettings.sub_header);
      if (appSettings.alamat_header) setAlamatHeader(appSettings.alamat_header);

      if (appSettings.feature_permissions) {
        setDisableUserAdd(!!appSettings.feature_permissions.disableUserAdd);
        setDisableUserEdit(!!appSettings.feature_permissions.disableUserEdit);
        setDisableUserDelete(!!appSettings.feature_permissions.disableUserDelete);
        setDisableUserPrintPdf(!!appSettings.feature_permissions.disableUserPrintPdf);
        setDisableUserUploadDrive(!!appSettings.feature_permissions.disableUserUploadDrive);
        setDisableUserCopyTemplate(!!appSettings.feature_permissions.disableUserCopyTemplate);
      }

      if (appSettings.show_coffee_packages !== undefined) {
        setShowCoffeePackages(appSettings.show_coffee_packages);
      }
      if (appSettings.coffee_packages && appSettings.coffee_packages.length > 0) {
        setCoffeePackages(appSettings.coffee_packages);
      }
    }
  }, [appSettings]);

  // Generate Keygen Code for selected officer
  const handleGenerateKeygen = (petugasObj?: Petugas) => {
    const target = petugasObj || petugasList.find((p) => p.id === selectedPetugasId) || currentUser;
    if (!target) {
      addToast("warning", "Pilih petugas terlebih dahulu!");
      return;
    }

    // Generate Key pattern: RHKPRO-{NIP}-{RandomHash}
    const cleanNip = target.nip.replace(/\s+/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `RHKPRO-${cleanNip}-${randomSuffix}`;
    setGeneratedKey(code);
    setCopiedKey(false);
  };

  // Admin Direct Activation for an officer
  const handleAdminDirectActivate = async (p: Petugas, customCode?: string) => {
    const cleanNip = p.nip.replace(/\s+/g, "");
    const codeToUse = customCode || generatedKey || `RHKPRO-${cleanNip}`;
    const ok = await onActivateLicense(codeToUse, p.nip, p.id);
    if (ok) {
      addToast("success", `Petugas ${p.nama} (${p.nip}) berhasil diaktivasi PRO!`);
    } else {
      addToast("error", "Gagal melakukan aktivasi!");
    }
  };

  // Revoke License
  const handleRevokeLicense = async (lisensiId: string, pNama: string) => {
    if (!onDeleteLicense) return;
    setRevokeConfirm({ id: lisensiId, nama: pNama });
  };

  // Copy Key to Clipboard
  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopiedKey(true);
    addToast("success", "Kode Keygen berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Upload Kop Surat Image File
  const handleKopFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImageFile(file, 300);
      setKopUrl(compressedBase64);
      setKopMode("image");
      addToast("success", "Gambar Kop Surat berhasil diupload! Klik Simpan Pengaturan.");
    } catch (err) {
      console.error(err);
      addToast("error", "Gagal memproses file gambar kop!");
    }
  };

  // Save Kop Settings
  const handleSaveKopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveAppSettings) return;

    setIsSavingKop(true);
    try {
      const ok = await onSaveAppSettings({
        kop_mode: kopMode,
        kop_surat_url: kopUrl,
        instansi_header: instansiHeader,
        sub_header: subHeader,
        alamat_header: alamatHeader,
      });
      if (ok) {
        addToast("success", "Pengaturan Kop Surat berhasil disimpan & diperbarui untuk semua petugas!");
      } else {
        addToast("error", "Gagal menyimpan pengaturan Kop Surat!");
      }
    } finally {
      setIsSavingKop(false);
    }
  };

  // Save Feature Permissions Settings (Admin)
  const handleSaveFeaturePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveAppSettings) return;

    setIsSavingPermissions(true);
    try {
      const ok = await onSaveAppSettings({
        feature_permissions: {
          disableUserAdd,
          disableUserEdit,
          disableUserDelete,
          disableUserPrintPdf,
          disableUserUploadDrive,
          disableUserCopyTemplate,
        },
      });
      if (ok) {
        addToast("success", "Pengaturan kontrol tombol user berhasil disimpan & langsung berlaku!");
      } else {
        addToast("error", "Gagal menyimpan pengaturan kontrol tombol!");
      }
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Save Coffee Settings (Toggle show/hide & package list)
  const handleSaveCoffeeSettings = async (
    updatedShow?: boolean,
    updatedPackages?: CoffeePackage[]
  ) => {
    if (!onSaveAppSettings) return;

    const showVal = updatedShow !== undefined ? updatedShow : showCoffeePackages;
    const pkgList = updatedPackages || coffeePackages;

    setIsSavingCoffeeSettings(true);
    try {
      const ok = await onSaveAppSettings({
        show_coffee_packages: showVal,
        coffee_packages: pkgList,
      });
      if (ok) {
        addToast("success", "Pengaturan Paket Bayarin Kopi berhasil disimpan!");
      } else {
        addToast("error", "Gagal menyimpan pengaturan Paket Kopi!");
      }
    } finally {
      setIsSavingCoffeeSettings(false);
    }
  };

  const handleSavePackageModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;

    let updatedList: CoffeePackage[];
    const exists = coffeePackages.some((p) => p.id === editingPackage.id);

    if (exists) {
      updatedList = coffeePackages.map((p) => (p.id === editingPackage.id ? editingPackage : p));
    } else {
      updatedList = [...coffeePackages, editingPackage];
    }

    setCoffeePackages(updatedList);
    setIsEditingModalOpen(false);
    setEditingPackage(null);

    await handleSaveCoffeeSettings(showCoffeePackages, updatedList);
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus paket kopi ini?")) return;
    const updatedList = coffeePackages.filter((p) => p.id !== id);
    setCoffeePackages(updatedList);
    await handleSaveCoffeeSettings(showCoffeePackages, updatedList);
  };

  const handleResetDefaultPackages = async () => {
    if (!confirm("Kembalikan paket kopi ke susunan standar bawaan?")) return;
    setCoffeePackages(DEFAULT_COFFEE_PACKAGES);
    await handleSaveCoffeeSettings(showCoffeePackages, DEFAULT_COFFEE_PACKAGES);
  };

  // Filtered Petugas for Keygen Table
  const filteredPetugas = petugasList.filter(
    (p) =>
      p.nama.toLowerCase().includes(keySearch.toLowerCase()) ||
      p.nip.toLowerCase().includes(keySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Lisensi, Keygen & Kop Surat</h1>
          <p className="text-xs text-slate-500">
            Aktivasi Lisensi Petugas, Tool Keygen Admin, Pengaturan Kop Surat, dan Kontrol Akses Tombol User
          </p>
        </div>

        {/* Tab Navigation for Admin */}
        {isAdmin && (
          <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1 text-xs font-semibold shrink-0 flex-wrap">
            <button
              onClick={() => setActiveTab("user")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "user" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Key className="w-3.5 h-3.5 text-blue-600" /> Status Lisensi
            </button>
            <button
              onClick={() => setActiveTab("keygen")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "keygen" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Keygen Admin
            </button>
            <button
              onClick={() => setActiveTab("kop")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "kop" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building className="w-3.5 h-3.5 text-emerald-600" /> Kop Surat
            </button>
            <button
              onClick={() => setActiveTab("fitur")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "fitur" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Kontrol Tombol User
            </button>
            <button
              onClick={() => setActiveTab("kopi")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "kopi" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-amber-600" /> Paket Kopi
            </button>
            <button
              onClick={() => setActiveTab("versi")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "versi" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Info className="w-3.5 h-3.5 text-cyan-600" /> Info Versi &amp; Sistem
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: USER STATUS & PRICING */}
      {activeTab === "user" && (
        <div className="space-y-6">
          {/* Status Box */}
          <div
            className={`bg-white rounded-xl shadow-xs border p-6 text-center ${
              isLicensed ? "border-emerald-300 bg-emerald-50/30" : "border-amber-300 bg-amber-50/30"
            }`}
          >
            {isLicensed ? (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Aplikasi Berlisensi Resmi (Pro)</h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Terima kasih! Akun NIP <span className="font-mono font-bold">{currentUser.nip}</span> telah diaktivasi dan siap digunakan tanpa batasan jumlah kegiatan.
                </p>
                <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  Status: Aktif Selamanya (Unlimited / Pro)
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Versi Trial (Terbatas)</h2>
                <p className="text-xs text-slate-600">
                  Anda saat ini berada pada mode trial dengan batasan maksimal 5 kegiatan harian. Total saat ini:{" "}
                  <span className="font-bold text-amber-700">{kegiatanCount} / 5</span> kegiatan.
                </p>

                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-2 text-left">
                  <p className="text-xs font-semibold text-amber-900">
                    Aktivasi Lisensi Resmi (Pro)
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Aktivasi lisensi aplikasi dikelola sepenuhnya oleh <strong>Admin Aplikasi</strong>. Silakan hubungi Admin dengan menyertakan NIP Anda (<strong>{currentUser.nip}</strong>) untuk mengaktifkan lisensi Pro akun Anda.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Section (Paket Bayarin Kopi) */}
          {(!showCoffeePackages && !isAdmin) ? null : (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {showCoffeePackages === false && isAdmin && (
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Pilihan Paket Bayarin Kopi saat ini <strong>DISEMBUNYIKAN</strong> dari tampilan petugas biasa.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowCoffeePackages(true);
                      handleSaveCoffeeSettings(true, coffeePackages);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors text-xs whitespace-nowrap self-start sm:self-auto shadow-xs"
                  >
                    Tampilkan ke User
                  </button>
                </div>
              )}

              {(showCoffeePackages || isAdmin) && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Coffee className="w-5 h-5 text-amber-600" />
                        Pilihan Paket Bayarin Kopi
                      </h2>
                      <p className="text-xs text-slate-500">
                        Pilih paket yang sesuai untuk membuka akses penuh tanpa batas
                      </p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => setActiveTab("kopi")}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto border border-indigo-200"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        Kelola Paket (Admin)
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {coffeePackages
                      .filter((pkg) => pkg.enabled !== false)
                      .map((pkg) => {
                        const IconComp =
                          pkg.icon === "clock"
                            ? Clock
                            : pkg.icon === "infinity"
                            ? InfinityIcon
                            : pkg.icon === "sparkles"
                            ? Sparkles
                            : Coffee;

                        return (
                          <div
                            key={pkg.id}
                            className={`bg-white rounded-2xl shadow-md border overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-200 relative ${
                              pkg.popular
                                ? "border-blue-500 shadow-blue-100"
                                : "border-slate-200"
                            }`}
                          >
                            {pkg.popular && (
                              <div className="bg-blue-600 text-white text-[11px] font-bold py-1.5 px-3 text-center uppercase tracking-wider flex items-center justify-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" /> {pkg.badge || "Langganan Kopi (Populer)"}
                              </div>
                            )}
                            {!pkg.popular && (
                              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 text-center text-white font-bold text-xs uppercase tracking-wide">
                                {pkg.title}
                              </div>
                            )}

                            <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                              <div className="space-y-4">
                                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                                  <IconComp className="w-8 h-8" />
                                </div>
                                {pkg.popular && (
                                  <h3 className="text-base font-extrabold text-slate-800 text-center">
                                    {pkg.title}
                                  </h3>
                                )}
                                <ul className="space-y-2 text-xs text-slate-600">
                                  {pkg.descriptionList.map((desc, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                      <span>{desc}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="text-center pt-4 border-t border-slate-100">
                                {pkg.priceLabel && (
                                  <p className="text-[11px] text-slate-400">{pkg.priceLabel}</p>
                                )}
                                <p className="text-xl font-extrabold text-slate-800">
                                  {pkg.priceValue}{" "}
                                  {pkg.pricePeriod && (
                                    <span className="text-xs font-normal text-slate-500">
                                      {pkg.pricePeriod}
                                    </span>
                                  )}
                                </p>
                                <button
                                  onClick={() => {
                                    if (pkg.contactUrl) {
                                      window.open(pkg.contactUrl, "_blank");
                                    } else {
                                      setShowContactModal(true);
                                    }
                                  }}
                                  className={`w-full mt-4 py-2.5 font-semibold rounded-full text-xs shadow-xs transition-colors ${
                                    pkg.popular
                                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                                      : "bg-slate-800 hover:bg-slate-900 text-white"
                                  }`}
                                >
                                  {pkg.buttonText || "Tanya Kede Kopi"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KEYGEN ADMIN */}
      {isAdmin && activeTab === "keygen" && (
        <div className="space-y-6">
          {/* Key Generator Box */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/50 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Generator Kode Aktivasi (Keygen Admin)</h2>
                <p className="text-xs text-slate-400">
                  Pilih petugas atau masukkan NIP untuk menghasilkan kode lisensi aktivasi resmi
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300">Pilih Petugas Target:</label>
                <select
                  value={selectedPetugasId}
                  onChange={(e) => {
                    setSelectedPetugasId(e.target.value);
                    const p = petugasList.find((x) => x.id === e.target.value);
                    if (p) handleGenerateKeygen(p);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih Petugas / Officer --</option>
                  {petugasList.map((p) => {
                    const cleanPNip = p.nip.replace(/\s+/g, "");
                    const isPPro = lisensiList.some(
                      (l) =>
                        (l.petugas_id === p.id || l.nip === p.nip) &&
                        l.kode &&
                        cleanPNip !== "" &&
                        (l.kode === `RHKPRO-${cleanPNip}` || l.kode.startsWith(`RHKPRO-${cleanPNip}-`))
                    );
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nama} - NIP: {p.nip} ({isPPro ? "PRO" : "TRIAL"})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => handleGenerateKeygen()}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <RefreshCw className="w-4 h-4" /> Generate Keygen
                </button>
              </div>
            </div>

            {/* Generated Code Result Box */}
            {generatedKey && (
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                  Kode Lisensi Aktivasi Terbentuk:
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm font-extrabold text-amber-400 tracking-wider select-all">
                    {generatedKey}
                  </div>
                  <button
                    onClick={handleCopyKey}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shrink-0"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedKey ? "Tersalin!" : "Salin Kode"}
                  </button>

                  {selectedPetugasId && (
                    <button
                      onClick={() => {
                        const targetP = petugasList.find((p) => p.id === selectedPetugasId);
                        if (targetP) handleAdminDirectActivate(targetP, generatedKey);
                      }}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Aktivasi Langsung
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Officers Table & License Management */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Daftar Status Lisensi Seluruh Petugas</h3>
                <p className="text-xs text-slate-500">Kelola dan aktifkan lisensi petugas secara instan</p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={keySearch}
                  onChange={(e) => setKeySearch(e.target.value)}
                  placeholder="Cari nama / NIP..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Petugas</th>
                    <th className="py-2.5 px-3">NIP</th>
                    <th className="py-2.5 px-3">Status Lisensi</th>
                    <th className="py-2.5 px-3">Kode Lisensi Active</th>
                    <th className="py-2.5 px-3 text-right">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPetugas.map((p) => {
                    const cleanPNip = p.nip.replace(/\s+/g, "");
                    const activeLic = lisensiList.find(
                      (l) =>
                        (l.petugas_id === p.id || l.nip === p.nip) &&
                        l.kode &&
                        cleanPNip !== "" &&
                        (l.kode === `RHKPRO-${cleanPNip}` || l.kode.startsWith(`RHKPRO-${cleanPNip}-`))
                    );
                    const isPPro = !!activeLic;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {p.nama}
                          {p.level === "ADMIN" && (
                            <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                              ADMIN
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">{p.nip}</td>
                        <td className="py-3 px-3">
                          {isPPro ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PRO (Aktif)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
                              <Lock className="w-3 h-3 text-amber-600" /> TRIAL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          {activeLic ? activeLic.kode : "-"}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          {!isPPro ? (
                            <button
                              onClick={() => handleAdminDirectActivate(p)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-colors"
                            >
                              + Aktivasi Pro
                            </button>
                          ) : (
                            <button
                              onClick={() => activeLic && handleRevokeLicense(activeLic.id, p.nama)}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-[11px] transition-colors"
                            >
                              Cabut Lisensi
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPetugas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Tidak ada petugas ditemukan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UPLOAD KOP SURAT ADMIN */}
      {isAdmin && activeTab === "kop" && (
        <form onSubmit={handleSaveKopSettings} className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Pengaturan Kop Surat Laporan Resmi</h2>
                <p className="text-xs text-slate-500">
                  Upload gambar Kop Surat instansi atau gunakan format header teks standar untuk seluruh laporan petugas
                </p>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Format Tampilan Kop Surat:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-4 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                    kopMode === "image"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="kopMode"
                    value="image"
                    checked={kopMode === "image"}
                    onChange={() => setKopMode("image")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-600" /> Gunakan Gambar Kop Surat Uploaded
                    </p>
                    <p className="text-[10px] text-slate-500">Menampilkan gambar logo/header hasil upload</p>
                  </div>
                </label>

                <label
                  className={`p-4 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                    kopMode === "text"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="kopMode"
                    value="text"
                    checked={kopMode === "text"}
                    onChange={() => setKopMode("text")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-600" /> Gunakan Teks Kop Tulis
                    </p>
                    <p className="text-[10px] text-slate-500">Menampilkan format teks resmi & double line border</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Image Kop Upload Box */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-700">Upload File Gambar Kop Surat:</label>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 border-2 border-dashed border-slate-300 rounded-xl">
                {kopUrl ? (
                  <div className="relative group w-full sm:w-auto shrink-0">
                    <img
                      src={kopUrl}
                      alt="Uploaded Kop Surat"
                      className="h-20 max-w-full object-contain border border-slate-200 rounded-md bg-white p-1 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setKopUrl("")}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 transition-colors"
                      title="Hapus Gambar Kop"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-400 shrink-0">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs font-semibold text-slate-800">
                    {kopUrl ? "Gambar Kop Terpasang" : "Belum ada gambar Kop Surat"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Format yang didukung: PNG, JPG, JPEG (rekomendasi rasio horizontal lebar 210mm)
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5" /> Pilih File Gambar...
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleKopFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Header Text Settings */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-500">
                Pengaturan Teks Header Kop (Format Standar)
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Nama Instansi / Kementerian (Baris Utama):</label>
                  <input
                    type="text"
                    value={instansiHeader}
                    onChange={(e) => setInstansiHeader(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Sub Header / Direktorat / Dinas:</label>
                  <input
                    type="text"
                    value={subHeader}
                    onChange={(e) => setSubHeader(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Alamat / Telepon / Email Instansi:</label>
                  <input
                    type="text"
                    value={alamatHeader}
                    onChange={(e) => setAlamatHeader(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    <span>Link Folder Google Drive Target (Tersimpan Per Akun User):</span>
                  </label>
                  <p className="text-[11px] text-slate-600">
                    Lokasi ekspor Google Drive tersimpan secara terisolasi untuk masing-masing user yang login. Setiap petugas/admin dapat mengatur link folder Google Drive miliknya sendiri di menu <strong>Profil Saya</strong> atau pada dialog saat mencetak laporan.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700">Pratinjau Kop Surat Laporan:</label>
              <div className="p-6 bg-white border border-slate-300 rounded-xl shadow-inner font-serif text-slate-900 text-center">
                {kopMode === "image" && kopUrl ? (
                  <div className="flex justify-center">
                    <img src={kopUrl} alt="Preview Kop Surat" className="max-h-28 object-contain" />
                  </div>
                ) : (
                  <div className="border-b-4 border-double border-black pb-3">
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-12 h-12 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-[10px] bg-slate-100 uppercase tracking-widest shrink-0">
                        LOGOI
                      </div>
                      <div>
                        <h2 className="text-sm font-extrabold uppercase tracking-wider">{instansiHeader}</h2>
                        <p className="text-xs italic">{subHeader}</p>
                        <p className="text-[10px] text-slate-600">{alamatHeader}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingKop}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSavingKop ? "Menyimpan..." : "Simpan Pengaturan Kop Surat"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: KONTROL TOMBOL & FITUR USER (ADMIN ONLY) */}
      {activeTab === "fitur" && isAdmin && (
        <form onSubmit={handleSaveFeaturePermissions} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>Pengaturan Kontrol Tombol & Akses User (Level USER)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Atur visibilitas dan hak akses tombol (Hapus, Edit, Tambah, Cetak, Drive) yang tampil pada layar seluruh akun ber-level <strong>USER</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDisableUserAdd(true);
                  setDisableUserEdit(true);
                  setDisableUserDelete(true);
                  setDisableUserPrintPdf(true);
                  setDisableUserUploadDrive(true);
                  setDisableUserCopyTemplate(true);
                  addToast("info", "Semua tombol aksi user diset NONAKTIF. Klik Simpan untuk memperbarui.");
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Matikan Semua Tombol</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisableUserAdd(false);
                  setDisableUserEdit(false);
                  setDisableUserDelete(false);
                  setDisableUserPrintPdf(false);
                  setDisableUserUploadDrive(false);
                  setDisableUserCopyTemplate(false);
                  addToast("info", "Semua tombol aksi user diset AKTIF. Klik Simpan untuk memperbarui.");
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Aktifkan Semua (Default)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Control 1: Tombol Hapus */}
            <div className={`p-4 rounded-xl border transition-all ${disableUserDelete ? "bg-rose-50/50 border-rose-200" : "bg-slate-50/70 border-slate-200 hover:border-slate-300"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${disableUserDelete ? "bg-rose-100 text-rose-700" : "bg-red-100 text-red-700"}`}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Tombol Hapus Data</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Mengontrol tombol Hapus di Kegiatan Harian, Template Laporan, dan Master RHK.
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {disableUserDelete ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-extrabold border border-rose-300">
                          <Lock className="w-3 h-3" /> DINONAKTIFKAN (User Tidak Bisa Hapus)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold border border-emerald-300">
                          <Check className="w-3 h-3" /> AKTIF (User Boleh Hapus)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisableUserDelete(!disableUserDelete)}
                  className="shrink-0 p-1 rounded-lg focus:outline-none"
                >
                  {disableUserDelete ? (
                    <ToggleRight className="w-9 h-9 text-rose-600" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Control 2: Tombol Edit */}
            <div className={`p-4 rounded-xl border transition-all ${disableUserEdit ? "bg-rose-50/50 border-rose-200" : "bg-slate-50/70 border-slate-200 hover:border-slate-300"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${disableUserEdit ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Tombol Edit Data</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Mengontrol tombol Edit di Kegiatan Harian, Template Laporan, dan Master RHK.
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {disableUserEdit ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-extrabold border border-rose-300">
                          <Lock className="w-3 h-3" /> DINONAKTIFKAN (User Tidak Bisa Edit)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold border border-emerald-300">
                          <Check className="w-3 h-3" /> AKTIF (User Boleh Edit)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisableUserEdit(!disableUserEdit)}
                  className="shrink-0 p-1 rounded-lg focus:outline-none"
                >
                  {disableUserEdit ? (
                    <ToggleRight className="w-9 h-9 text-rose-600" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Control 3: Tombol Tambah / Input Baru */}
            <div className={`p-4 rounded-xl border transition-all ${disableUserAdd ? "bg-rose-50/50 border-rose-200" : "bg-slate-50/70 border-slate-200 hover:border-slate-300"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${disableUserAdd ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Tombol Input / Tambah Data Baru</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Mengontrol tombol "+ Input Laporan Baru", "+ Buat Template", dan "+ Tambah RHK".
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {disableUserAdd ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-extrabold border border-rose-300">
                          <Lock className="w-3 h-3" /> DINONAKTIFKAN (Input Baru Ditutup)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold border border-emerald-300">
                          <Check className="w-3 h-3" /> AKTIF (User Boleh Input Data Baru)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisableUserAdd(!disableUserAdd)}
                  className="shrink-0 p-1 rounded-lg focus:outline-none"
                >
                  {disableUserAdd ? (
                    <ToggleRight className="w-9 h-9 text-rose-600" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Control 4: Tombol Cetak / Export PDF */}
            <div className={`p-4 rounded-xl border transition-all ${disableUserPrintPdf ? "bg-rose-50/50 border-rose-200" : "bg-slate-50/70 border-slate-200 hover:border-slate-300"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${disableUserPrintPdf ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"}`}>
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Tombol Cetak / Export PDF</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Mengontrol tombol Cetak Laporan PDF pada daftar Kegiatan Harian.
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {disableUserPrintPdf ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-extrabold border border-rose-300">
                          <Lock className="w-3 h-3" /> DINONAKTIFKAN (User Tidak Bisa Cetak)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold border border-emerald-300">
                          <Check className="w-3 h-3" /> AKTIF (User Boleh Cetak PDF)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisableUserPrintPdf(!disableUserPrintPdf)}
                  className="shrink-0 p-1 rounded-lg focus:outline-none"
                >
                  {disableUserPrintPdf ? (
                    <ToggleRight className="w-9 h-9 text-rose-600" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Control 5: Tombol Simpan/Upload Google Drive */}
            <div className={`p-4 rounded-xl border transition-all ${disableUserUploadDrive ? "bg-rose-50/50 border-rose-200" : "bg-slate-50/70 border-slate-200 hover:border-slate-300"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${disableUserUploadDrive ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"}`}>
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Tombol Simpan / Upload Google Drive</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Mengontrol tombol Simpan PDF ke Folder Google Drive pada modal pratinjau cetak.
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {disableUserUploadDrive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-extrabold border border-rose-300">
                          <Lock className="w-3 h-3" /> DINONAKTIFKAN (User Tidak Bisa Upload Drive)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold border border-emerald-300">
                          <Check className="w-3 h-3" /> AKTIF (User Boleh Upload Drive)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisableUserUploadDrive(!disableUserUploadDrive)}
                  className="shrink-0 p-1 rounded-lg focus:outline-none"
                >
                  {disableUserUploadDrive ? (
                    <ToggleRight className="w-9 h-9 text-rose-600" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Control 6: Tombol Salin Template Laporan */}
            <div className={`p-4 rounded-xl border transition-all ${disableUserCopyTemplate ? "bg-rose-50/50 border-rose-200" : "bg-slate-50/70 border-slate-200 hover:border-slate-300"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${disableUserCopyTemplate ? "bg-rose-100 text-rose-700" : "bg-purple-100 text-purple-700"}`}>
                    <Copy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Tombol Salin Template Laporan</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Mengontrol tombol "Salin ke Saya" pada tab Semua Template User.
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {disableUserCopyTemplate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-extrabold border border-rose-300">
                          <Lock className="w-3 h-3" /> DINONAKTIFKAN (User Tidak Bisa Salin Template)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold border border-emerald-300">
                          <Check className="w-3 h-3" /> AKTIF (User Boleh Salin Template)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisableUserCopyTemplate(!disableUserCopyTemplate)}
                  className="shrink-0 p-1 rounded-lg focus:outline-none"
                >
                  {disableUserCopyTemplate ? (
                    <ToggleRight className="w-9 h-9 text-rose-600" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 space-y-1">
              <p className="font-bold">Informasi Kebijakan Hak Akses Admin:</p>
              <p className="leading-relaxed">
                Pengaturan di atas <strong>hanya membatasi pengguna ber-level USER</strong>. Sebagai ADMIN (<strong>{currentUser.nama}</strong>), Anda tetap memiliki akses penuh tanpa batasan untuk menambah, mengedit, menghapus, mencetak, dan mengelola seluruh data sistem.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingPermissions}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSavingPermissions ? "Menyimpan..." : "Simpan Pengaturan Kontrol Tombol"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: INFORMASI VERSI & SISTEM (ADMIN ONLY) */}
      {activeTab === "versi" && isAdmin && (
        <div className="space-y-6 animate-in fade-in">
          {/* Main Version Hero Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/60 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shrink-0">
                  SKP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-white tracking-tight">Laporan SKP Online</h2>
                    <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black rounded-full text-[10px] tracking-wide uppercase">
                      v2.6.0
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Sistem Manajemen Laporan Kinerja ASN &amp; SKP Harian • <span className="text-amber-400 font-semibold">Develop By Genesystool</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-xl text-right shrink-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status Lisensi Admin</p>
                <p className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Akses Administrator Penuh
                </p>
              </div>
            </div>
          </div>

          {/* Grid Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* System Spec Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Spesifikasi Engine Aplikasi</h3>
                  <p className="text-[10px] text-slate-500">Informasi stack &amp; runtime</p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs">
                <li className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Nama Aplikasi:</span>
                  <span className="font-bold text-slate-800">Laporan SKP Online</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Versi Rilis:</span>
                  <span className="font-mono font-bold text-indigo-600">v2.6.0 (FireLink)</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Frontend Stack:</span>
                  <span className="font-semibold text-slate-700">React 18 + Vite (TS)</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Styling Framework:</span>
                  <span className="font-semibold text-slate-700">Tailwind CSS (Day/Night)</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Backend Server:</span>
                  <span className="font-semibold text-slate-700">Express.js Node API</span>
                </li>
                <li className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Database Realtime:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5" /> Firebase Firestore
                  </span>
                </li>
              </ul>
            </div>

            {/* App Statistics Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Statistik Data Sistem</h3>
                  <p className="text-[10px] text-slate-500">Ringkasan database terdaftar</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-500 font-medium">Total Petugas</p>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{petugasList.length}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <p className="text-[10px] text-emerald-700 font-medium">Lisensi Pro Aktif</p>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">{lisensiList.length}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center col-span-2">
                  <p className="text-[10px] text-indigo-700 font-medium">Kegiatan Harian Pengguna Saat Ini</p>
                  <p className="text-lg font-black text-indigo-800 mt-0.5">{kegiatanCount} Laporan</p>
                </div>
              </div>

              <div className="p-3 bg-slate-100/80 rounded-xl text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" /> Metode Enkripsi Lisensi:
                </p>
                <p className="text-[10px] font-mono text-slate-500">Token Hash NIP: RHKPRO-[NIP_PETUGAS]</p>
              </div>
            </div>

            {/* Developer & Contact Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Pengembang &amp; Dukungan</h3>
                  <p className="text-[10px] text-slate-500">Tim pengembang resmi</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Developer Official</p>
                  <p className="font-extrabold text-slate-800 text-sm">Genesystool</p>
                  <p className="text-[11px] text-slate-500">Spesialis Aplikasi Laporan SKP &amp; Kinerja ASN</p>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Layanan Kontak &amp; Support Admin</p>
                  <p className="font-bold text-emerald-900 text-sm font-mono">085270444156 (WhatsApp)</p>
                  <a
                    href="https://wa.me/6285270444156"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors shadow-2xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Hubungi Genesystool
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Release Notes Feature List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Daftar Fitur &amp; Pembaruan Utama Versi 2.6</h3>
                <p className="text-xs text-slate-500">Rincian modul baru yang ditambahkan pada versi v2.6.0</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" /> Mode Otomatis Siang/Malam
                </p>
                <p className="text-[11px] text-slate-500">
                  Otomatis beralih Mode Terang (06:00–18:00) dan Mode Gelap (18:00–06:00) sesuai waktu lokal.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-sky-600" /> Folder Google Drive per Account
                </p>
                <p className="text-[11px] text-slate-500">
                  Penyimpanan link folder target Google Drive terisolasi aman per masing-masing akun petugas/admin.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-600" /> Kontrol Tombol Aksi User
                </p>
                <p className="text-[11px] text-slate-500">
                  Admin dapat mengunci/membuka tombol Hapus, Edit, Input Baru, Cetak, Drive, dan Salin Template untuk User.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" /> Generator Keygen NIP
                </p>
                <p className="text-[11px] text-slate-500">
                  Admin dapat secara instan membuat dan mengaktifkan lisensi Pro petugas berbasis NIP.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-purple-600" /> Kop Surat Resmi Instansi
                </p>
                <p className="text-[11px] text-slate-500">
                  Mendukung Kop Gambar Uploaded dan Kop Teks Resmi Kementerian/Dinas untuk cetakan PDF.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-rose-600" /> Backup &amp; Restore JSON
                </p>
                <p className="text-[11px] text-slate-500">
                  Dukungan ekspor snapshot penuh database dan impor pemulihan data aplikasi secara aman.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PAKET KOPI (ADMIN) */}
      {isAdmin && activeTab === "kopi" && (
        <div className="space-y-6">
          {/* Top Switch Banner */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-slate-800">
                  Pengaturan Tampilan Paket Bayarin Kopi
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Atur apakah blok paket bayarin kopi ditampilkan di halaman lisensi atau disembunyikan seluruhnya dari user.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCoffeePackages}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setShowCoffeePackages(val);
                    handleSaveCoffeeSettings(val, coffeePackages);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                <span className="ml-3 text-xs font-bold text-slate-800">
                  {showCoffeePackages ? "Ditampilkan (ON)" : "Disembunyikan (OFF)"}
                </span>
              </label>

              <button
                onClick={handleResetDefaultPackages}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                title="Kembalikan ke paket bawaan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Default
              </button>
            </div>
          </div>

          {/* Action Header & Package Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Daftar Paket Kopi Tersedia ({coffeePackages.length})</span>
              </h3>
              <button
                onClick={() => {
                  setEditingPackage({
                    id: `kopi_${Date.now()}`,
                    title: "Paket Kopi Kustom",
                    badge: "Spesial",
                    icon: "coffee",
                    descriptionList: ["Akses fitur penuh", "Dukungan konsultasi"],
                    priceLabel: "Harga",
                    priceValue: "Rp 50.000",
                    pricePeriod: "/bulan",
                    buttonText: "Tanya Kede Kopi",
                    popular: false,
                    enabled: true,
                  });
                  setIsEditingModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Tambah Paket Baru
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {coffeePackages.map((pkg) => {
                const IconComp =
                  pkg.icon === "clock"
                    ? Clock
                    : pkg.icon === "infinity"
                    ? InfinityIcon
                    : pkg.icon === "sparkles"
                    ? Sparkles
                    : Coffee;

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-2xl shadow-xs border p-5 flex flex-col justify-between space-y-4 relative ${
                      pkg.enabled === false ? "opacity-60 bg-slate-50 border-dashed border-slate-300" : "border-slate-200"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            pkg.enabled === false
                              ? "bg-slate-200 text-slate-600"
                              : pkg.popular
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {pkg.enabled === false ? "Nonaktif" : pkg.badge || "Paket"}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingPackage(pkg);
                              setIsEditingModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-lg transition-colors"
                            title="Edit Paket"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Hapus Paket"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{pkg.title}</h4>
                          <p className="text-xs text-indigo-700 font-extrabold">
                            {pkg.priceValue} <span className="font-normal text-slate-500">{pkg.pricePeriod}</span>
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        {pkg.descriptionList.map((desc, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="truncate">{desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Tombol: <strong>{pkg.buttonText}</strong></span>
                      <button
                        onClick={async () => {
                          const updated = coffeePackages.map((p) =>
                            p.id === pkg.id ? { ...p, enabled: p.enabled === false ? true : false } : p
                          );
                          setCoffeePackages(updated);
                          await handleSaveCoffeeSettings(showCoffeePackages, updated);
                        }}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                          pkg.enabled === false
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {pkg.enabled === false ? "Aktifkan" : "Sembunyikan"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Coffee Package Modal */}
      {isEditingModalOpen && editingPackage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => {
                setIsEditingModalOpen(false);
                setEditingPackage(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {coffeePackages.some((p) => p.id === editingPackage.id)
                    ? "Edit Paket Bayarin Kopi"
                    : "Tambah Paket Bayarin Kopi Baru"}
                </h3>
                <p className="text-xs text-slate-500">
                  Ubah rincian judul, harga, dan fitur pendukung paket kopi
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePackageModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Paket Kopi
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPackage.title}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, title: e.target.value })
                    }
                    placeholder="Contoh: Langganan Kopi"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Label Sub-Judul / Badge
                  </label>
                  <input
                    type="text"
                    value={editingPackage.badge || ""}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, badge: e.target.value })
                    }
                    placeholder="Contoh: Paling Populer"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Label Harga
                  </label>
                  <input
                    type="text"
                    value={editingPackage.priceLabel || ""}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, priceLabel: e.target.value })
                    }
                    placeholder="Contoh: Harga mulai"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nominal / Nilai Harga
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPackage.priceValue}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, priceValue: e.target.value })
                    }
                    placeholder="Contoh: Seiklasnya / Rp 50.000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satuan Periode
                  </label>
                  <input
                    type="text"
                    value={editingPackage.pricePeriod || ""}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, pricePeriod: e.target.value })
                    }
                    placeholder="Contoh: /bulan"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teks Tombol Aksi
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPackage.buttonText}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, buttonText: e.target.value })
                    }
                    placeholder="Contoh: Tanya Kede Kopi"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ikon Paket
                  </label>
                  <select
                    value={editingPackage.icon || "coffee"}
                    onChange={(e) =>
                      setEditingPackage({
                        ...editingPackage,
                        icon: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="coffee">Coffee / Cangkir</option>
                    <option value="clock">Clock / Jam Waktu</option>
                    <option value="infinity">Infinity / Tanpa Batas</option>
                    <option value="sparkles">Sparkles / Bintang</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Link Kontak / WA (Opsional)
                </label>
                <input
                  type="url"
                  value={editingPackage.contactUrl || ""}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, contactUrl: e.target.value })
                  }
                  placeholder="Contoh: https://wa.me/6285270444156?text=Halo%20Admin"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Feature List Editor */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">
                  Rincian Fitur / Keterangan
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {editingPackage.descriptionList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const updated = [...editingPackage.descriptionList];
                          updated[idx] = e.target.value;
                          setEditingPackage({ ...editingPackage, descriptionList: updated });
                        }}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingPackage.descriptionList.filter((_, i) => i !== idx);
                          setEditingPackage({ ...editingPackage, descriptionList: updated });
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newFeatureText.trim()) {
                          setEditingPackage({
                            ...editingPackage,
                            descriptionList: [
                              ...editingPackage.descriptionList,
                              newFeatureText.trim(),
                            ],
                          });
                          setNewFeatureText("");
                        }
                      }
                    }}
                    placeholder="Tambah poin fitur baru..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newFeatureText.trim()) {
                        setEditingPackage({
                          ...editingPackage,
                          descriptionList: [
                            ...editingPackage.descriptionList,
                            newFeatureText.trim(),
                          ],
                        });
                        setNewFeatureText("");
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingPackage.popular}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, popular: e.target.checked })
                    }
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-slate-700">
                    Tandai Sebagai "Paling Populer"
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPackage.enabled !== false}
                    onChange={(e) =>
                      setEditingPackage({ ...editingPackage, enabled: e.target.checked })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-slate-700">Status Aktif</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingModalOpen(false);
                    setEditingPackage(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Simpan Paket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <MessageCircle className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800">Hubungi Pusat Layanan</h3>
              <p className="text-xs text-slate-500 mt-1">
                Untuk detail informasi, konsultasi, dan pembelian lisensi NIP, silakan hubungi kami via WhatsApp:
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Nomor WhatsApp Admin</p>
              <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-0.5">
                085270444156
              </p>
            </div>

            <a
              href="https://wa.me/6285270444156"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <PhoneCall className="w-4 h-4" /> Chat WhatsApp Sekarang
            </a>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      <ConfirmDeleteModal
        isOpen={!!revokeConfirm}
        title="Cabut Akses Lisensi Pro"
        message={`Apakah Anda yakin ingin mencabut lisensi PRO dari ${revokeConfirm?.nama || "petugas ini"}?`}
        confirmLabel="Ya, Cabut Lisensi"
        isLoading={isRevoking}
        onClose={() => setRevokeConfirm(null)}
        onConfirm={async () => {
          if (!revokeConfirm || !onDeleteLicense) return;
          const { id, nama } = revokeConfirm;
          setIsRevoking(true);
          try {
            const ok = await onDeleteLicense(id);
            if (ok) {
              addToast("info", `Lisensi ${nama} telah berhasil dicabut.`);
            } else {
              addToast("error", "Gagal mencabut lisensi.");
            }
          } catch (err) {
            addToast("error", "Gagal mencabut lisensi.");
          } finally {
            setIsRevoking(false);
            setRevokeConfirm(null);
          }
        }}
      />
    </div>
  );
};
