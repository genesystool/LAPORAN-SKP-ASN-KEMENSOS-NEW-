import express from "express";
import { GoogleGenAI } from "@google/genai";

export const app = express();

app.use(express.json({ limit: "50mb" }));

// Google Drive Apps Script Upload Proxy (Guarantees bypass of browser CORS & hosting restrictions)
app.post("/api/upload-drive-webhook", async (req, res) => {
  try {
    const { webhookUrl, fileName, folderId, base64Data, mimeType } = req.body;
    if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.trim()) {
      return res.status(400).json({ error: "URL Webhook Google Apps Script belum diisi." });
    }
    if (!base64Data || typeof base64Data !== "string") {
      return res.status(400).json({ error: "Data file Base64 tidak ditemukan." });
    }

    let url = webhookUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    if (!url.includes("script.google.com")) {
      return res.status(400).json({
        error: "URL Webhook tidak valid. URL Apps Script harus berawalan 'https://script.google.com/macros/s/.../exec'.",
      });
    }

    // Clean base64 string if data URL prefix exists
    let cleanBase64 = base64Data;
    if (cleanBase64.indexOf(",") > -1) {
      cleanBase64 = cleanBase64.split(",")[1];
    }

    const payload = JSON.stringify({
      action: "uploadFile",
      filename: fileName || "Laporan_SKP.pdf",
      fileName: fileName || "Laporan_SKP.pdf",
      folderId: folderId || "root",
      fileData: cleanBase64,
      mimeType: mimeType || "application/pdf",
      base64Data: cleanBase64,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payload,
      redirect: "follow",
    });

    const text = await response.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      if (
        text.includes("Google Drive") ||
        text.includes("doctype html") ||
        text.includes("<!DOCTYPE")
      ) {
        return res.status(502).json({
          error:
            "Koneksi Google Apps Script gagal. Pastikan Web App disetel dengan Akses: 'Siapa saja (Anyone)' dan Publikasikan Ulang Versi Baru (New Version).",
        });
      }
      return res.status(502).json({
        error: "Respon dari Google Apps Script tidak valid. Pastikan URL Webhook benar.",
      });
    }

    if (json?.status === "success" || json?.fileUrl || json?.fileId) {
      return res.json({
        status: "success",
        fileId: json.fileId || "webhook-" + Date.now(),
        fileName: json.fileName || fileName,
        fileUrl: json.fileUrl,
      });
    }

    if (json?.message) {
      return res.status(400).json({ error: `Google Apps Script Error: ${json.message}` });
    }

    return res.status(500).json({ error: "Gagal mengunggah file via Webhook Apps Script." });
  } catch (err: any) {
    console.error("Upload Drive Webhook Proxy Error:", err);
    return res.status(500).json({
      error: err?.message || "Gagal terhubung ke URL Webhook Apps Script. Periksa koneksi internet Anda.",
    });
  }
});

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "RHK Generator API", firebaseConfigured: true });
});

// AI Narrative Generator for Kegiatan Harian (Isi & Hasil) with Style support
app.post("/api/generate-ai", async (req, res) => {
  try {
    const { keyword, style = "formal" } = req.body;
    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return res.status(400).json({ error: "Kata kunci tidak boleh kosong" });
    }

    let styleInstruction = "Sangat formal, komprehensif, dan baku sesuai tata bahasa birokrasi pemerintahan Indonesia (EYD/PUEBI).";
    if (style === "ringkas") {
      styleInstruction = "Singkat, padat, langsung pada inti poin utama, to-the-point tanpa kalimat berbelit-belit.";
    } else if (style === "teknis") {
      styleInstruction = "Teknis operasional, analitis, menyertakan istilah teknis spesifik, metrik/indikator capaian, dan langkah prosedural.";
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Anda adalah asisten ahli pembuat laporan kinerja ASN / Birokrasi pemerintahan Indonesia. 
Tugas Anda adalah mengembangkan kata kunci berikut: "${keyword.trim()}" menjadi narasi kegiatan harian untuk 'Isi Kegiatan' dan 'Hasil Kegiatan'.
Gaya penulisan yang diminta: ${styleInstruction}

KEMBALIKAN HANYA FORMAT JSON SBB (tanpa markdown backticks, tanpa kata pengantar):
{
  "isi": "Narasi pelaksanaan kegiatan...",
  "hasil": "Narasi hasil dan capaian kegiatan..."
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
        });

        const rawText = response.text || "";
        let cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").trim();
        if (cleaned.endsWith("```")) {
          cleaned = cleaned.slice(0, -3).trim();
        }

        try {
          const parsed = JSON.parse(cleaned);
          if (parsed.isi && parsed.hasil) {
            return res.json({ isi: parsed.isi, hasil: parsed.hasil });
          }
        } catch {
          // Fallthrough to standard text wrap if JSON parse fails
        }
      } catch (genError) {
        console.warn("Gemini API call failed, falling back to smart template:", genError);
      }
    }

    // Fallback smart generator if API key is missing or fails
    const kw = keyword.trim();
    let fallbackIsi = "";
    let fallbackHasil = "";

    if (style === "ringkas") {
      fallbackIsi = `Melaksanakan ${kw} secara langsung sesuai prosedur kerja yang berlaku, meliputi persiapan, koordinasi, dan pelaksanaan teknis.`;
      fallbackHasil = `Tercapainya target ${kw} secara baik, tepat waktu, serta tersusunnya catatan evaluasi pelaksanaan.`;
    } else if (style === "teknis") {
      fallbackIsi = `Melakukan verifikasi teknis dan eksekusi operasional terkait ${kw}. Tahapan mencakup: 1) Pemeriksaan instrumen & kelengkapan; 2) Pengujian/pendampingan lapangan; 3) Analisis data hasil pelaksanaan.`;
      fallbackHasil = `Indikator teknis ${kw} terpenuhi 100%, data terverifikasi secara presisi, dan dokumen berita acara telah diterbitkan.`;
    } else {
      fallbackIsi = `Telah dilaksanakan kegiatan ${kw} sesuai dengan petunjuk teknis dan rencana kerja harian. Pelaksanaan diawali dengan koordinasi bersama pihak terkait, penyiapan dokumen pendukung, penyampaian materi/substansi kegiatan, serta pendampingan langsung secara berkesinambungan untuk memastikan seluruh alur tugas berjalan secara efektif, efisien, dan transparan sesuai dengan standar operasional prosedur (SOP) birokrasi pemerintahan.`;
      fallbackHasil = `Tercapainya sasaran pelaksanaan ${kw} dengan hasil optimal. Terkumpulnya data dan informasi pendukung secara lengkap, tersusunnya rekapitulasi pelaksanaan tugas, serta terciptanya koordinasi yang harmonis antar instansi/pihak terkait untuk mendukung capaian Indikator Kinerja Utama (IKU) organisasi secara akuntabel.`;
    }

    return res.json({ isi: fallbackIsi, hasil: fallbackHasil });
  } catch (err: any) {
    console.error("AI Endpoint Error:", err);
    return res.status(500).json({ error: "Gagal memproses AI generator" });
  }
});

// AI Template Laporan Generator (Generates full template fields)
app.post("/api/generate-template-ai", async (req, res) => {
  try {
    const { keyword, nomorRhk, style = "formal" } = req.body;
    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return res.status(400).json({ error: "Kata kunci tidak boleh kosong" });
    }

    let styleInstruction = "Sangat formal, komprehensif, dan baku sesuai tata bahasa birokrasi pemerintahan Indonesia (EYD/PUEBI).";
    if (style === "ringkas") {
      styleInstruction = "Singkat, padat, langsung pada poin utama tanpa kata-kata klise berlebihan.";
    } else if (style === "teknis") {
      styleInstruction = "Teknis operasional, analitis, fokus pada instrumen, metrik, dan dasar regulasi teknis.";
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Anda adalah pakar penyusun dokumen laporan resmi birokrasi pemerintahan Indonesia.
Buatkan draft narasi lengkap untuk 'Template Laporan Resmi' (RHK ${nomorRhk || 1}) berdasarkan kata kunci/topik berikut: "${keyword.trim()}".
Gaya penulisan: ${styleInstruction}

Hasilkan 6 narasi berikut dalam JSON (tanpa markdown backticks, tanpa teks pendahuluan):
{
  "umum": "Narasi latar belakang/gambaran umum tugas...",
  "maksudTujuan": "Narasi maksud dan tujuan pelaksanaan...",
  "ruangLingkup": "Narasi ruang lingkup kegiatan...",
  "dasar": "1. Landasan regulasi/Peraturan terkait...\\n2. Surat Tugas/Perintah Kepala Instansi...",
  "simpulan": "Narasi simpulan capaian dan saran rekomendasi...",
  "penutup": "Narasi penutup laporan resmi..."
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
        });

        const rawText = response.text || "";
        let cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").trim();
        if (cleaned.endsWith("```")) {
          cleaned = cleaned.slice(0, -3).trim();
        }

        try {
          const parsed = JSON.parse(cleaned);
          if (
            parsed.umum &&
            parsed.maksudTujuan &&
            parsed.ruangLingkup &&
            parsed.dasar &&
            parsed.simpulan &&
            parsed.penutup
          ) {
            return res.json(parsed);
          }
        } catch {
          // Fallthrough to fallback
        }
      } catch (genError) {
        console.warn("Gemini API call failed for template generator, using fallback:", genError);
      }
    }

    // Smart Fallback
    const kw = keyword.trim();
    return res.json({
      umum: `Laporan ini disusun sebagai pertanggungjawaban pelaksanaan tugas operasional ASN terkait ${kw} dalam rangka mendukung indikator kinerja instansi secara transparan dan akuntabel.`,
      maksudTujuan: `Maksud dan tujuan kegiatan ini adalah untuk merealisasikan sasaran kerja ${kw} dengan standar mutu pelayanan yang tinggi dan meminimalisir kendala teknis di lapangan.`,
      ruangLingkup: `Ruang lingkup pelaksanaan meliputi perencanaan awal, koordinasi administratif, eksekusi teknis ${kw}, serta penyusunan berkas evaluasi dan pelaporan.`,
      dasar: `1. Peraturan Perundang-undangan dan Petunjuk Teknis Instansi Terkait.\n2. Surat Perintah Tugas/Rencana Kinerja Tahunan Organisasi.`,
      simpulan: `Pelaksanaan ${kw} telah terselenggara dengan hasil memuaskan dan mencapai target indikator keberhasilan yang dipersyaratkan.`,
      penutup: `Demikian laporan pelaksanaan kegiatan ini dibuat dengan penuh rasa tanggung jawab untuk digunakan sebagai bahan pertimbangan pimpinan.`,
    });
  } catch (err: any) {
    console.error("Template AI Generator Error:", err);
    return res.status(500).json({ error: "Gagal memproses AI Template Generator" });
  }
});
