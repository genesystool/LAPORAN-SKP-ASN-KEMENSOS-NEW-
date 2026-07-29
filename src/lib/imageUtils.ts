/**
 * Compress image file to Data URL with strict size constraint (< 80KB by default for Firestore 1MB doc limits)
 */
export function compressImageFile(file: File, maxKB = 80): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      compressBase64Image(rawDataUrl, maxKB)
        .then(resolve)
        .catch(() => resolve(rawDataUrl));
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Re-compress an existing Base64 Data URL to fit strictly under maxKB (default 80KB)
 */
export function compressBase64Image(dataUrl: string, maxKB = 80): Promise<string> {
  return new Promise((resolve) => {
    // Target byte size in string characters (base64 string length)
    const targetLength = maxKB * 1024;
    if (!dataUrl || dataUrl.length <= targetLength) {
      return resolve(dataUrl);
    }

    let resolved = false;
    const safeResolve = (res: string) => {
      if (!resolved) {
        resolved = true;
        resolve(res);
      }
    };

    // Safety fallback timeout after 2 seconds
    const timeout = setTimeout(() => {
      safeResolve(dataUrl);
    }, 2000);

    const img = new Image();

    img.onload = () => {
      clearTimeout(timeout);
      try {
        let maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const processCanvas = (w: number, h: number): string => {
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(10, w);
          canvas.height = Math.max(10, h);

          const ctx = canvas.getContext("2d");
          if (!ctx) return dataUrl;

          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          let quality = 0.75;
          let result = canvas.toDataURL("image/jpeg", quality);

          while (result.length > targetLength && quality > 0.15) {
            quality -= 0.1;
            result = canvas.toDataURL("image/jpeg", quality);
          }

          // If still exceeds target, scale down canvas dimensions
          if (result.length > targetLength && w > 150 && h > 150) {
            return processCanvas(Math.round(w * 0.75), Math.round(h * 0.75));
          }

          return result;
        };

        const compressed = processCanvas(width, height);
        safeResolve(compressed);
      } catch (e) {
        safeResolve(dataUrl);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      safeResolve(dataUrl);
    };

    // ALWAYS set src AFTER onload and onerror are registered!
    img.src = dataUrl;
  });
}

/**
 * Auto calculate Indonesian day name from YYYY-MM-DD date
 */
export function getIndonesianDayName(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[date.getDay()];
}

/**
 * Format date string (YYYY-MM-DD) to Indonesian format (e.g., 21 Juli 2026)
 */
export function formatIndonesianDate(dateString: string): string {
  if (!dateString) return "-";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day} ${monthNames[monthIdx]} ${year}`;
  }
  return dateString;
}
