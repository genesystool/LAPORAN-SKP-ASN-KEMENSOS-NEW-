import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import app from "./firebase";

const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/drive");
provider.setCustomParameters({ prompt: "select_account" });

let cachedAccessToken: string | null = typeof window !== "undefined" ? localStorage.getItem("gdrive_access_token") : null;
let isSigningIn = false;

export const setDriveAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("gdrive_access_token", token);
    } else {
      localStorage.removeItem("gdrive_access_token");
    }
  }
};

export const getDriveAccessToken = (): string | null => {
  if (!cachedAccessToken && typeof window !== "undefined") {
    cachedAccessToken = localStorage.getItem("gdrive_access_token");
  }
  return cachedAccessToken;
};

export const signInForGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Gagal memperoleh access token dari Google Sign-In.");
    }
    cachedAccessToken = credential.accessToken;
    setDriveAccessToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === "auth/popup-closed-by-user" ||
      error?.code === "auth/cancelled-popup-request"
    ) {
      console.warn("Drive Sign-In cancelled by user:", error.code);
      throw new Error("Proses login Google Drive dibatalkan (pop-up ditutup oleh pengguna). Silakan klik tombol 'Sambungkan' lagi.");
    }

    const errStr = String(error?.message || error?.code || error || "").toLowerCase();
    if (error?.code === "auth/popup-blocked" || errStr.includes("popup-blocked")) {
      throw new Error(
        "Pop-up diblokir oleh browser. Harap izinkan pop-up untuk situs ini (lihat icon di address bar) agar dapat login ke Google Drive."
      );
    } else if (error?.code === "auth/unauthorized-domain" || errStr.includes("unauthorized-domain")) {
      throw new Error(
        "Domain hosting belum diotorisasi di Firebase. Silakan hubungi admin aplikasi."
      );
    }
    throw new Error(error?.message || "Gagal melakukan login ke Google Drive.");
  } finally {
    isSigningIn = false;
  }
};

export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  size?: string;
  iconLink?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  parents?: string[];
}

/**
 * Extract Google Drive Folder ID from a shared link or raw ID string
 */
export function extractDriveFolderId(input?: string | null): string | null {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();
  if (trimmed === "root" || trimmed === "shared") return trimmed;

  // Match /folders/FOLDER_ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // Match /d/FOLDER_OR_FILE_ID
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) {
    return dMatch[1];
  }

  // Match ?id=FOLDER_ID or &id=FOLDER_ID or open?id=FOLDER_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // If raw ID string (alphanumeric, -, _, length >= 5, no slashes, colons, or spaces)
  if (!trimmed.includes("/") && !trimmed.includes(":") && !trimmed.includes(" ") && /^[a-zA-Z0-9_-]{5,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Clean and resolve any Google Drive folder ID or link into a valid folder ID string
 */
export function cleanDriveFolderId(input?: string | null): string {
  if (!input || !input.trim()) return "root";
  const trimmed = input.trim();
  if (trimmed === "root" || trimmed === "shared") return trimmed;
  const extracted = extractDriveFolderId(trimmed);
  return extracted || "root";
}

/**
 * Build a valid, clickable browser URL to open the Google Drive folder in a new tab
 */
export function getDriveFolderUrl(input?: string | null): string {
  let target = input ? input.trim() : "";
  if (!target) return "https://drive.google.com/drive/my-drive";
  if (target === "root") return "https://drive.google.com/drive/my-drive";
  if (target === "shared") return "https://drive.google.com/drive/shared-with-me";

  const extracted = extractDriveFolderId(target);
  if (extracted && extracted !== "root" && extracted !== "shared") {
    return `https://drive.google.com/drive/folders/${extracted}`;
  }

  if (target.startsWith("http://") || target.startsWith("https://")) {
    return target;
  }

  return "https://drive.google.com/drive/my-drive";
}

/**
 * Fetch metadata for a specific Google Drive folder ID
 */
export async function getDriveFolderDetails(
  folderId: string,
  customToken?: string
): Promise<DriveFolder> {
  let token = customToken || cachedAccessToken;
  if (!token) {
    return { id: folderId, name: "Folder Target Drive" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,parents&supportsAllDrives=true`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        setDriveAccessToken(null);
      }
      return { id: folderId, name: "Folder Target Drive" };
    }

    const data: DriveFolder = await response.json();
    return data;
  } catch {
    return { id: folderId, name: "Folder Target Drive" };
  }
}

/**
 * List folders inside a specific parent folder or search across Google Drive
 */
export async function listDriveFolders(
  parentId: string = "root",
  searchQueryOrOptions?:
    | string
    | {
        searchQuery?: string;
        sharedWithMe?: boolean;
        customToken?: string;
        webhookUrl?: string;
      },
  sharedWithMeParam: boolean = false,
  customTokenParam?: string,
  webhookUrlParam?: string
): Promise<DriveFolder[]> {
  let searchQuery = "";
  let sharedWithMe = false;
  let customToken: string | undefined = undefined;
  let webhookUrl: string | undefined = undefined;

  if (typeof searchQueryOrOptions === "object" && searchQueryOrOptions !== null) {
    searchQuery = searchQueryOrOptions.searchQuery || "";
    sharedWithMe = !!searchQueryOrOptions.sharedWithMe;
    customToken = searchQueryOrOptions.customToken;
    webhookUrl = searchQueryOrOptions.webhookUrl;
  } else {
    const str2: string = typeof searchQueryOrOptions === "string" ? searchQueryOrOptions : "";
    if (str2.startsWith("http://") || str2.startsWith("https://")) {
      webhookUrl = str2;
    } else if (str2.startsWith("ya29.") || str2.length > 30) {
      customToken = str2;
    } else {
      searchQuery = str2;
    }
    sharedWithMe = sharedWithMeParam;
    customToken = customToken || customTokenParam;
    webhookUrl = webhookUrl || webhookUrlParam;
  }

  const activeWebhook = (
    webhookUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("laporan_skp_apps_script_url") : null) ||
    ""
  ).trim();

  if (activeWebhook) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(activeWebhook, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "listFolders", parentId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json && (json.status === "success" || Array.isArray(json.folders)) && Array.isArray(json.folders)) {
          return json.folders;
        }
      }
    } catch {
      // ignore webhook folder list failure
    }
  }

  let token = customToken || cachedAccessToken;
  if (!token) {
    return [];
  }

  try {
    let query = "";
    if (searchQuery && searchQuery.trim().length > 0) {
      const escapedSearch = searchQuery.replace(/'/g, "\\'");
      query = `name contains '${escapedSearch}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    } else if (sharedWithMe) {
      query = `sharedWithMe = true and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    } else {
      query = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name,parents)&pageSize=1000&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 401) {
        setDriveAccessToken(null);
        console.warn("Drive API Notice (Folders): 401 Unauthorized - Expired token cleared.");
        return [];
      }
      if (response.status === 403 || response.status === 404) {
        console.warn(`Drive API Notice (Folders): ${response.status} - Folder not accessible`);
      } else {
        console.error("Drive API Error (Folders):", response.status, err);
      }
      return [];
    }

    const data = await response.json();
    return data.files || [];
  } catch (err) {
    return [];
  }
}

/**
 * List files inside a specific folder in Google Drive
 */
export async function listDriveFiles(
  folderId: string = "root",
  customToken?: string,
  webhookUrl?: string
): Promise<DriveFile[]> {
  const activeWebhook = (
    webhookUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("laporan_skp_apps_script_url") : null) ||
    ""
  ).trim();

  // 1. Try listing via Webhook first if URL is configured (works on external hosting)
  if (activeWebhook) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(activeWebhook, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "listFiles", folderId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && json.status === "success" && Array.isArray(json.files)) {
          return json.files;
        }
      }
    } catch (e) {
      console.warn("Webhook listFiles failed, falling back to Drive API:", e);
    }
  }

  // 2. Drive OAuth API Fallback
  let token = customToken || cachedAccessToken;
  if (!token) {
    return [];
  }

  const query = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,webViewLink,webContentLink,createdTime,size,iconLink)&pageSize=1000&orderBy=createdTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 401) {
        setDriveAccessToken(null);
        console.warn("Drive API Notice (Files): 401 Unauthorized - Expired token cleared.");
        return [];
      }
      if (response.status === 403 || response.status === 404) {
        console.warn(`Drive API Notice (Files): ${response.status} - Folder not accessible`);
      } else {
        console.error("Drive API Error (Files):", response.status, err);
      }
      return [];
    }

    const data = await response.json();
    return data.files || [];
  } catch (err) {
    console.warn("Error fetching drive files:", err);
    throw err;
  }
}

/**
 * Create a new folder or sub-folder in Google Drive
 */
export async function createDriveFolder(
  folderName: string,
  parentId: string = "root",
  customToken?: string
): Promise<DriveFolder> {
  const targetParentId = cleanDriveFolderId(parentId);
  let token = customToken || cachedAccessToken;
  if (!token) {
    throw new Error("Sesi Google Drive belum aktif. Silakan klik 'Sambungkan Google Drive' terlebih dahulu.");
  }

  const metadata: any = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (targetParentId && targetParentId !== "root") {
    metadata.parents = [targetParentId];
  } else if (targetParentId === "root") {
    metadata.parents = ["root"];
  }

  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,name,parents&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 401) {
      console.warn("Create Drive Folder: Unauthorized (401)");
      setDriveAccessToken(null);
      throw new Error("Sesi Google Drive telah berakhir. Silakan klik 'Sambungkan Google Drive' untuk login ulang.");
    }
    
    if (response.status === 403 && errorText.includes("insufficientParentPermissions")) {
      console.warn("Create Drive Folder: Insufficient parent permissions (403)");
      throw new Error("Anda tidak memiliki izin (akses edit) untuk membuat folder di dalam folder ini.");
    }

    console.error("Create Drive Folder error:", response.status, errorText);
    throw new Error(`Gagal membuat folder di Google Drive (${response.status})`);
  }

  const newFolder: DriveFolder = await response.json();
  return newFolder;
}

/**
 * Upload a PDF blob directly via Google Apps Script Webhook URL (Bebas Blokir, No OAuth Popup needed)
 */
export async function uploadPdfViaAppsScriptWebhook(
  pdfBlob: Blob,
  fileName: string,
  folderId: string = "root",
  webhookUrl?: string,
  onProgress?: (percent: number, statusMessage: string) => void
): Promise<DriveUploadResult> {
  let url = (
    webhookUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("laporan_skp_apps_script_url") : null) ||
    ""
  ).trim();

  if (!url) {
    throw new Error("URL Webhook Google Apps Script belum dikonfigurasi.");
  }

  // Normalize protocol
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  // Validate domain - ensure it is a Google Apps Script URL, not a Vercel/website domain
  if (!url.includes("script.google.com")) {
    throw new Error(
      `URL '${url}' BUKAN URL Google Apps Script yang valid!\n\n` +
      `URL Apps Script harus berawalan 'https://script.google.com/macros/s/.../exec'.\n` +
      `Mohon tidak memasukkan domain website Vercel (seperti laporanskp.vercel.app). Silakan gunakan URL Web App dari Google Apps Script di Google Drive.`
    );
  }

  onProgress?.(55, "Mengkonversi file PDF ke format data...");

  // Convert Blob to Base64
  const reader = new FileReader();
  const base64Data = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result ? result.split(",")[1] : "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(pdfBlob);
  });

  const targetFolderId = cleanDriveFolderId(folderId);

  onProgress?.(65, "Mengirim file ke Google Apps Script Webhook...");

  const payload = JSON.stringify({
    action: "uploadFile",
    filename: fileName,
    fileName: fileName,
    folderId: targetFolderId,
    fileData: base64Data,
    mimeType: "application/pdf",
    base64Data: base64Data,
  });

  // Attempt 1: Direct client-side fetch (supports 302 redirects cleanly)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout limit

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payload,
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseText = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(responseText);
    } catch {
      // If client fetch returned non-JSON HTML (like Google login/error), throws to try proxy or give error
      if (
        responseText.includes("Google Drive") ||
        responseText.includes("doctype html") ||
        responseText.includes("<!DOCTYPE")
      ) {
        throw new Error(
          "Koneksi Google Apps Script gagal. Pastikan Web App disetel dengan Akses: 'Siapa saja (Anyone)' dan Dipublikasikan Ulang (New Version)."
        );
      }
    }

    if (json?.status === "success" || json?.fileUrl || json?.fileId) {
      onProgress?.(100, "Upload berhasil!");
      return {
        id: json.fileId || "webhook-" + Date.now(),
        name: json.fileName || fileName,
        webViewLink: json.fileUrl || getDriveFolderUrl(targetFolderId),
      };
    }

    if (json?.message) {
      throw new Error(`Google Apps Script Error: ${json.message}`);
    }
  } catch (clientErr: any) {
    console.warn("Direct client fetch to Webhook failed, attempting backend server proxy fallback...", clientErr);
    
    // Attempt 2: Server-side proxy fallback (Bypasses all client browser CORS & hosting restrictions)
    try {
      onProgress?.(80, "Menggunakan server proxy untuk mengunggah...");
      const proxyController = new AbortController();
      const proxyTimeoutId = setTimeout(() => proxyController.abort(), 20000);

      const proxyRes = await fetch("/api/upload-drive-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: url,
          fileName: fileName,
          folderId: targetFolderId,
          base64Data: base64Data,
          mimeType: "application/pdf",
        }),
        signal: proxyController.signal,
      });
      clearTimeout(proxyTimeoutId);

      const contentType = proxyRes.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // If static hosting returned 404 HTML page instead of JSON API response
        throw new Error(clientErr?.message || "Koneksi ke Webhook Apps Script gagal/timeout. Pastikan izin Web App 'Siapa saja' (Anyone).");
      }

      const proxyJson = await proxyRes.json();
      if (proxyRes.ok && (proxyJson.status === "success" || proxyJson.fileUrl || proxyJson.fileId)) {
        onProgress?.(100, "Upload berhasil via Proxy!");
        return {
          id: proxyJson.fileId || "webhook-" + Date.now(),
          name: proxyJson.fileName || fileName,
          webViewLink: proxyJson.fileUrl || getDriveFolderUrl(targetFolderId),
        };
      }

      if (proxyJson?.error) {
        throw new Error(proxyJson.error);
      }
    } catch (proxyErr: any) {
      console.error("Proxy upload fallback failed:", proxyErr);
      // Re-throw initial client error if proxy also fails or is unavailable
      throw new Error(
        proxyErr?.message || clientErr?.message || "Gagal mengunggah file via Webhook Apps Script."
      );
    }
  }

  throw new Error("Gagal mengunggah file via Webhook Apps Script.");
}

/**
 * Upload a PDF blob to Google Drive (tries Apps Script Webhook first if configured, or direct OAuth API token)
 */
export async function uploadPdfToDrive(
  pdfBlob: Blob,
  fileName: string,
  folderId?: string,
  customToken?: string,
  webhookUrl?: string,
  onProgress?: (percent: number, statusMessage: string) => void
): Promise<DriveUploadResult> {
  const targetFolderId = cleanDriveFolderId(folderId);
  const activeWebhook =
    webhookUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("laporan_skp_apps_script_url") : null);

  // 1. Try Apps Script Webhook first if available (works 100% on any hosting without OAuth popup restrictions)
  if (activeWebhook && activeWebhook.trim()) {
    try {
      return await uploadPdfViaAppsScriptWebhook(
        pdfBlob,
        fileName,
        targetFolderId,
        activeWebhook,
        onProgress
      );
    } catch (webhookErr: any) {
      console.warn("Apps Script Webhook Upload failed, attempting OAuth API token fallback:", webhookErr);
      let token = customToken || cachedAccessToken;
      if (!token) {
        throw new Error(
          `Gagal Upload via Webhook Apps Script: ${webhookErr?.message || webhookErr}`
        );
      }
    }
  }

  // 2. Direct OAuth API Upload
  let token = customToken || cachedAccessToken;

  if (!token) {
    throw new Error(
      "Sesi Google Drive belum aktif dan Webhook Apps Script belum terpasang. Silakan isi URL Webhook Apps Script atau Login Google Drive."
    );
  }

  const buildMultipartBody = (targetParent?: string): { body: Blob; boundary: string } => {
    const metadata: any = {
      name: fileName,
      mimeType: "application/pdf",
    };
    if (targetParent && targetParent !== "root") {
      metadata.parents = [targetParent];
    }
    
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    
    const metadataStr = delimiter + 
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" + 
      JSON.stringify(metadata);
      
    const fileHeader = delimiter + 
      "Content-Type: application/pdf\r\n" +
      "Content-Transfer-Encoding: binary\r\n\r\n";
      
    const blobBody = new Blob(
      [metadataStr, fileHeader, pdfBlob, closeDelimiter],
      { type: `multipart/related; boundary=${boundary}` }
    );
    
    return { body: blobBody, boundary };
  };

  const attemptUploadWithXHR = (parentFolder?: string): Promise<{ ok: boolean; status: number; text: string; json?: any }> => {
    return new Promise((resolve) => {
      const { body, boundary } = buildMultipartBody(parentFolder);
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true",
        true
      );
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Content-Type", `multipart/related; boundary=${boundary}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const uploadPct = Math.round((event.loaded / event.total) * 100);
          const overallPct = 60 + Math.round((event.loaded / event.total) * 35);
          onProgress?.(overallPct, `Mengunggah ke Google Drive (${uploadPct}%)...`);
        }
      };

      xhr.onload = () => {
        onProgress?.(95, "Memproses respon Google Drive...");
        let parsedJson: any = null;
        try {
          parsedJson = JSON.parse(xhr.responseText);
        } catch {
          // Ignore
        }
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          text: xhr.responseText,
          json: parsedJson,
        });
      };

      xhr.onerror = () => {
        resolve({
          ok: false,
          status: 0,
          text: "Gagal terhubung ke Google Drive API.",
        });
      };

      onProgress?.(60, "Menghubungkan ke Google Drive...");
      xhr.send(body);
    });
  };

  let response = await attemptUploadWithXHR(targetFolderId);

  if (!response.ok) {
    const errorText = response.text;

    if (response.status === 401) {
      setDriveAccessToken(null);
      throw new Error(
        "Sesi Google Drive telah berakhir. Silakan login ulang atau gunakan Webhook Apps Script (Bebas Blokir Hosting)."
      );
    }

    // Check for insufficient permissions on target folder (403/404)
    const isPermissionError =
      response.status === 403 ||
      response.status === 404 ||
      errorText.includes("insufficientParentPermissions") ||
      errorText.includes("Insufficient permissions");

    if (isPermissionError && targetFolderId && targetFolderId !== "root") {
      console.warn(
        "Insufficient permissions or invalid target folder. Attempting fallback upload to My Drive Root..."
      );
      onProgress?.(65, "Mencoba fallback ke Drive Utama...");
      const fallbackResponse = await attemptUploadWithXHR("root");
      if (fallbackResponse.ok && fallbackResponse.json) {
        const result: DriveUploadResult = fallbackResponse.json;
        onProgress?.(100, "Upload berhasil!");
        return {
          ...result,
          webViewLink: result.webViewLink || getDriveFolderUrl("root"),
          name: `${result.name} (Tersimpan di My Drive Utama - Folder Target Read-Only)`,
        };
      }
      throw new Error(
        "Folder Google Drive Target tidak memberikan izin Akses Tulis (Edit) kepada Anda (Read-Only). Silakan gunakan Webhook Apps Script atau minta izin Edit dari Pemilik Folder."
      );
    }

    if (isPermissionError) {
      throw new Error(
        "Izin Google Drive tidak mencukupi untuk membuat file. Pastikan akun Anda memiliki akses Tulis pada folder tersebut."
      );
    }

    console.error("Google Drive Upload API error:", errorText);
    throw new Error(
      `Gagal mengunggah ke Google Drive (${response.status}): ${response.text}`
    );
  }

  const result: DriveUploadResult = response.json || {};
  if (!result.webViewLink) {
    result.webViewLink = getDriveFolderUrl(targetFolderId);
  }
  onProgress?.(100, "Upload berhasil!");
  return result;
}
