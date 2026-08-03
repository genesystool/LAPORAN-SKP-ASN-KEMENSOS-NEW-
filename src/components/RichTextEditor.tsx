import React, { useRef, useEffect, useState } from "react";
import {
  Type,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RemoveFormatting,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Palette,
  Table,
  Plus,
  Trash2,
  X,
  Check,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  label?: string;
  required?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Ketik teks di sini...",
  minHeight = "120px",
  className = "",
  label,
  required = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Table modal state
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableBorderWidth, setTableBorderWidth] = useState("1px");
  const [tableWidth, setTableWidth] = useState("100%");
  const [tableRowHeight, setTableRowHeight] = useState("Auto");
  const [hasHeaderRow, setHasHeaderRow] = useState(true);

  // Track active table cell when user clicks/keys inside table
  const [activeTableCell, setActiveTableCell] = useState<HTMLTableCellElement | null>(null);

  // Sync value to innerHTML when value changes externally (e.g., AI generate or form reset)
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === "<br>" ? "" : html);
    }
    checkActiveTableCell();
  };

  const checkActiveTableCell = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setActiveTableCell(null);
      return;
    }
    let node: Node | null = sel.getRangeAt(0).startContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeName === "TD" || node.nodeName === "TH") {
        setActiveTableCell(node as HTMLTableCellElement);
        return;
      }
      node = node.parentNode;
    }
    setActiveTableCell(null);
  };

  const execCommand = (command: string, arg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput();
  };

  // Table insertion helper
  const handleInsertTable = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rows = Math.max(1, Math.min(20, tableRows));
    const cols = Math.max(1, Math.min(10, tableCols));

    const borderStyle = tableBorderWidth === "0px" ? "none" : `${tableBorderWidth} solid #cbd5e1`;
    const wVal = tableWidth === "Auto" ? "auto" : tableWidth;
    const hStyle = tableRowHeight === "Auto" ? "" : `height: ${tableRowHeight};`;

    let html = `<table style="width: ${wVal}; border-collapse: collapse; margin: 8px 0; border: ${borderStyle}; font-size: 12px;">`;
    if (hasHeaderRow) {
      html += `<thead><tr style="background-color: #f1f5f9;">`;
      for (let c = 1; c <= cols; c++) {
        html += `<th style="border: ${borderStyle}; padding: 6px 10px; ${hStyle} font-weight: 600; text-align: left; background-color: #f1f5f9;">Header ${c}</th>`;
      }
      html += `</tr></thead>`;
    }
    html += `<tbody>`;
    const bodyRows = hasHeaderRow ? Math.max(1, rows - 1) : rows;
    for (let r = 1; r <= bodyRows; r++) {
      html += `<tr>`;
      for (let c = 1; c <= cols; c++) {
        html += `<td style="border: ${borderStyle}; padding: 6px 10px; ${hStyle}">Isi ${r}.${c}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table><p><br></p>`;

    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand("insertHTML", false, html);
    handleInput();
    setShowTableModal(false);
  };

  // Active table live formatting
  const updateActiveTableBorder = (borderWidth: string) => {
    if (!activeTableCell) return;
    const table = activeTableCell.closest("table");
    if (!table) return;
    const borderStyle = borderWidth === "0px" ? "none" : `${borderWidth} solid #cbd5e1`;
    table.style.border = borderStyle;
    const cells = table.querySelectorAll("td, th");
    cells.forEach((c) => {
      (c as HTMLElement).style.border = borderStyle;
    });
    handleInput();
  };

  const updateActiveTableWidth = (width: string) => {
    if (!activeTableCell) return;
    const table = activeTableCell.closest("table");
    if (!table) return;
    table.style.width = width === "Auto" ? "auto" : width;
    handleInput();
  };

  const updateActiveTableCellHeight = (height: string) => {
    if (!activeTableCell) return;
    const table = activeTableCell.closest("table");
    if (!table) return;
    const cells = table.querySelectorAll("td, th");
    cells.forEach((c) => {
      (c as HTMLElement).style.height = height === "Auto" ? "auto" : height;
    });
    handleInput();
  };

  // Table manipulation handlers
  const addRowAbove = () => {
    if (!activeTableCell) return;
    const tr = activeTableCell.closest("tr");
    if (!tr) return;
    const newTr = tr.cloneNode(true) as HTMLTableRowElement;
    Array.from(newTr.children).forEach((cell) => {
      cell.textContent = "Data Baru";
    });
    tr.before(newTr);
    handleInput();
  };

  const addRowBelow = () => {
    if (!activeTableCell) return;
    const tr = activeTableCell.closest("tr");
    if (!tr) return;
    const newTr = tr.cloneNode(true) as HTMLTableRowElement;
    Array.from(newTr.children).forEach((cell) => {
      cell.textContent = "Data Baru";
    });
    tr.after(newTr);
    handleInput();
  };

  const deleteRow = () => {
    if (!activeTableCell) return;
    const tr = activeTableCell.closest("tr");
    const table = activeTableCell.closest("table");
    if (!tr || !table) return;
    if (table.rows.length <= 1) {
      table.remove();
      setActiveTableCell(null);
    } else {
      tr.remove();
    }
    handleInput();
  };

  const addColumnLeft = () => {
    if (!activeTableCell) return;
    const colIdx = activeTableCell.cellIndex;
    const table = activeTableCell.closest("table");
    if (!table) return;
    (Array.from(table.rows) as HTMLTableRowElement[]).forEach((row) => {
      const isHeader = row.parentElement?.tagName === "THEAD" || row.firstElementChild?.tagName === "TH";
      const newCell = document.createElement(isHeader ? "th" : "td");
      newCell.style.border = "1px solid #cbd5e1";
      newCell.style.padding = "6px 10px";
      if (isHeader) {
        newCell.style.fontWeight = "600";
        newCell.style.backgroundColor = "#f1f5f9";
        newCell.textContent = "Header Baru";
      } else {
        newCell.textContent = "Data Baru";
      }
      const refCell = row.cells[colIdx];
      if (refCell) row.insertBefore(newCell, refCell);
      else row.appendChild(newCell);
    });
    handleInput();
  };

  const addColumnRight = () => {
    if (!activeTableCell) return;
    const colIdx = activeTableCell.cellIndex;
    const table = activeTableCell.closest("table");
    if (!table) return;
    (Array.from(table.rows) as HTMLTableRowElement[]).forEach((row) => {
      const isHeader = row.parentElement?.tagName === "THEAD" || row.firstElementChild?.tagName === "TH";
      const newCell = document.createElement(isHeader ? "th" : "td");
      newCell.style.border = "1px solid #cbd5e1";
      newCell.style.padding = "6px 10px";
      if (isHeader) {
        newCell.style.fontWeight = "600";
        newCell.style.backgroundColor = "#f1f5f9";
        newCell.textContent = "Header Baru";
      } else {
        newCell.textContent = "Data Baru";
      }
      const refCell = row.cells[colIdx];
      if (refCell && refCell.nextSibling) row.insertBefore(newCell, refCell.nextSibling);
      else row.appendChild(newCell);
    });
    handleInput();
  };

  const deleteColumn = () => {
    if (!activeTableCell) return;
    const colIdx = activeTableCell.cellIndex;
    const table = activeTableCell.closest("table");
    if (!table) return;
    (Array.from(table.rows) as HTMLTableRowElement[]).forEach((row) => {
      if (row.cells[colIdx]) row.cells[colIdx].remove();
    });
    if (!table.rows[0] || table.rows[0].cells.length === 0) {
      table.remove();
      setActiveTableCell(null);
    }
    handleInput();
  };

  const deleteTable = () => {
    if (!activeTableCell) return;
    const table = activeTableCell.closest("table");
    if (table) table.remove();
    setActiveTableCell(null);
    handleInput();
  };

  const colors = [
    { name: "Default (Gelap)", value: "#1e293b" },
    { name: "Biru Resmi", value: "#1d4ed8" },
    { name: "Hijau Sukses", value: "#15803d" },
    { name: "Merah Peringatan", value: "#b91c1c" },
    { name: "Abu-abu Muted", value: "#64748b" },
  ];

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={`bg-white border rounded-xl overflow-hidden transition-all shadow-2xs ${
          isFocused
            ? "border-sky-500 ring-2 ring-sky-100"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        {/* CKEditor-Style Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-2 py-1.5 flex flex-wrap items-center gap-1 text-slate-700 select-none">
          {/* Font Type Dropdown */}
          <div className="flex items-center gap-1">
            <Type className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-0.5" />
            <select
              onChange={(e) => {
                if (e.target.value) {
                  execCommand("fontName", e.target.value);
                }
              }}
              defaultValue="Times New Roman"
              style={{ color: "#000000" }}
              className="px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs max-w-[130px] sm:max-w-none truncate"
              title="Jenis Font (Font Type)"
            >
              <option value="Times New Roman">Times New Roman (Serif)</option>
              <option value="Arial">Arial (Sans-Serif)</option>
              <option value="Calibri">Calibri</option>
              <option value="Georgia">Georgia</option>
              <option value="Garamond">Garamond</option>
              <option value="Courier New">Courier New (Monospace)</option>
              <option value="Tahoma">Tahoma</option>
              <option value="Verdana">Verdana</option>
            </select>
          </div>

          {/* Font Size Dropdown */}
          <div className="flex items-center gap-1">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  execCommand("fontSize", e.target.value);
                }
              }}
              defaultValue="3"
              style={{ color: "#000000" }}
              className="px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
              title="Ukuran Font (Font Size)"
            >
              <option value="1">8pt (10px)</option>
              <option value="2">10pt (12px)</option>
              <option value="3">11pt (14px - Standar)</option>
              <option value="4">12pt (16px - Sedang)</option>
              <option value="5">14pt (18px - Sub-Judul)</option>
              <option value="6">18pt (24px - Judul)</option>
              <option value="7">24pt (36px - Besar)</option>
            </select>
          </div>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Text Style Commands */}
          <button
            type="button"
            onClick={() => execCommand("bold")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Tebal (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("italic")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Miring (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("underline")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Garis Bawah (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => execCommand("insertUnorderedList")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Daftar Simbol (Bullet List)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("insertOrderedList")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Daftar Angka (Numbered List)"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => execCommand("justifyLeft")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Rata Kiri"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("justifyCenter")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Rata Tengah"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("justifyRight")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Rata Kanan"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("justifyFull")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Rata Kiri Kanan (Justify)"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<h3>")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700 text-xs font-bold"
            title="Judul Kecil (Sub-Heading)"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<h2>")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700 text-xs font-bold"
            title="Judul Utama"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<p>")}
            className="px-2 py-0.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700 text-[11px] font-semibold"
            title="Paragraf Biasa"
          >
            Paragraf
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* TABLE INSERT BUTTON */}
          <button
            type="button"
            onClick={() => setShowTableModal(true)}
            className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shadow-2xs"
            title="Sisipkan Tabel Baru"
          >
            <Table className="w-3.5 h-3.5 text-amber-700" />
            <span>Tabel</span>
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Color Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700 flex items-center gap-1"
              title="Warna Teks"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            {showColorPicker && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-lg rounded-xl p-2 z-20 w-36 space-y-1">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      execCommand("foreColor", c.value);
                      setShowColorPicker(false);
                    }}
                    className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded text-[11px] font-medium flex items-center gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-slate-300 inline-block shrink-0"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Undo / Redo / Clear */}
          <button
            type="button"
            onClick={() => execCommand("undo")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Urungkan (Undo)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("redo")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Ulangi (Redo)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCommand("removeFormat")}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            title="Hapus Format Teks"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ACTIVE TABLE CONTROL BAR */}
        {activeTableCell && (
          <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex flex-wrap items-center gap-1.5 text-xs text-amber-950">
            <span className="font-bold flex items-center gap-1 text-amber-800 shrink-0 mr-1">
              <Table className="w-3.5 h-3.5" /> Editor Tabel:
            </span>
            <button
              type="button"
              onClick={addRowAbove}
              className="px-2 py-0.5 bg-white hover:bg-amber-100 border border-amber-300 rounded text-[11px] font-semibold text-slate-800 transition-colors"
              title="Tambah Baris di Atas"
            >
              + Baris Atas
            </button>
            <button
              type="button"
              onClick={addRowBelow}
              className="px-2 py-0.5 bg-white hover:bg-amber-100 border border-amber-300 rounded text-[11px] font-semibold text-slate-800 transition-colors"
              title="Tambah Baris di Bawah"
            >
              + Baris Bawah
            </button>
            <button
              type="button"
              onClick={deleteRow}
              className="px-2 py-0.5 bg-white hover:bg-red-50 border border-red-300 rounded text-[11px] font-semibold text-red-600 transition-colors"
              title="Hapus Baris Ini"
            >
              - Hapus Baris
            </button>

            <div className="w-px h-3 bg-amber-300 mx-0.5" />

            <button
              type="button"
              onClick={addColumnLeft}
              className="px-2 py-0.5 bg-white hover:bg-amber-100 border border-amber-300 rounded text-[11px] font-semibold text-slate-800 transition-colors"
              title="Tambah Kolom di Kiri"
            >
              + Kolom Kiri
            </button>
            <button
              type="button"
              onClick={addColumnRight}
              className="px-2 py-0.5 bg-white hover:bg-amber-100 border border-amber-300 rounded text-[11px] font-semibold text-slate-800 transition-colors"
              title="Tambah Kolom di Kanan"
            >
              + Kolom Kanan
            </button>
            <button
              type="button"
              onClick={deleteColumn}
              className="px-2 py-0.5 bg-white hover:bg-red-50 border border-red-300 rounded text-[11px] font-semibold text-red-600 transition-colors"
              title="Hapus Kolom Ini"
            >
              - Hapus Kolom
            </button>

            <div className="w-px h-3 bg-amber-300 mx-0.5" />

            {/* Quick styling for active table */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="font-medium text-amber-900">Garis:</span>
              <select
                onChange={(e) => updateActiveTableBorder(e.target.value)}
                defaultValue="1px"
                style={{ color: "#0f172a" }}
                className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-[11px] text-slate-900 font-medium focus:outline-none"
              >
                <option value="1px">1px (Tipis)</option>
                <option value="2px">2px (Sedang)</option>
                <option value="3px">3px (Tebal)</option>
                <option value="4px">4px (S.Tebal)</option>
                <option value="0px">0px (Tanpa Garis)</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <span className="font-medium text-amber-900">Lebar:</span>
              <select
                onChange={(e) => updateActiveTableWidth(e.target.value)}
                defaultValue="100%"
                style={{ color: "#0f172a" }}
                className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-[11px] text-slate-900 font-medium focus:outline-none"
              >
                <option value="100%">100% (Penuh)</option>
                <option value="75%">75%</option>
                <option value="50%">50%</option>
                <option value="Auto">Auto</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <span className="font-medium text-amber-900">Tinggi:</span>
              <select
                onChange={(e) => updateActiveTableCellHeight(e.target.value)}
                defaultValue="Auto"
                style={{ color: "#0f172a" }}
                className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-[11px] text-slate-900 font-medium focus:outline-none"
              >
                <option value="Auto">Auto</option>
                <option value="28px">28px (Padat)</option>
                <option value="36px">36px (Sedang)</option>
                <option value="48px">48px (Tinggi)</option>
                <option value="60px">60px (S.Tinggi)</option>
              </select>
            </div>

            <div className="w-px h-3 bg-amber-300 mx-0.5" />

            <button
              type="button"
              onClick={deleteTable}
              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
              title="Hapus Seluruh Tabel"
            >
              <Trash2 className="w-3 h-3" /> Hapus Tabel
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="relative p-3">
          {(!value || value === "<br>" || value.trim() === "") && (
            <div className="absolute top-3 left-3 text-slate-400 text-xs pointer-events-none italic">
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onClick={checkActiveTableCell}
            onKeyUp={checkActiveTableCell}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              setShowColorPicker(false);
            }}
            style={{ minHeight }}
            className="outline-none text-xs text-slate-800 leading-relaxed max-w-none prose prose-slate focus:outline-none [&_table]:border-collapse [&_table]:my-2 [&_th]:bg-slate-100 [&_th]:font-semibold"
          />
        </div>
      </div>

      {/* MODAL / DIALOG INPUT TABEL */}
      {showTableModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl relative animate-fadeIn">
            <button
              type="button"
              onClick={() => setShowTableModal(false)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Sisipkan Tabel Baru</h3>
                <p className="text-[11px] text-slate-500">Pengaturan ukuran, garis & tata letak tabel</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Baris
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={tableRows}
                    onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                    style={{ color: "#020f1c" }}
                    className="w-full px-3 py-1.5 text-xs text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Kolom
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={tableCols}
                    onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                    style={{ color: "#030c17" }}
                    className="w-full px-3 py-1.5 text-xs text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tebal Garis
                  </label>
                  <select
                    value={tableBorderWidth}
                    onChange={(e) => setTableBorderWidth(e.target.value)}
                    style={{ color: "#000000" }}
                    className="w-full px-2 py-1.5 text-xs text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  >
                    <option value="1px">1px (Tipis)</option>
                    <option value="2px">2px (Sedang)</option>
                    <option value="3px">3px (Tebal)</option>
                    <option value="4px">4px (S.Tebal)</option>
                    <option value="0px">0px (Tanpa Garis)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Lebar Tabel
                  </label>
                  <select
                    value={tableWidth}
                    onChange={(e) => setTableWidth(e.target.value)}
                    style={{ color: "#01050a" }}
                    className="w-full px-2 py-1.5 text-xs text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  >
                    <option value="100%">100% (Penuh)</option>
                    <option value="75%">75%</option>
                    <option value="50%">50%</option>
                    <option value="Auto">Auto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tinggi Baris
                  </label>
                  <select
                    value={tableRowHeight}
                    onChange={(e) => setTableRowHeight(e.target.value)}
                    style={{ color: "#010306" }}
                    className="w-full px-2 py-1.5 text-xs text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  >
                    <option value="Auto">Auto</option>
                    <option value="28px">28px (Padat)</option>
                    <option value="36px">36px (Sedang)</option>
                    <option value="48px">48px (Tinggi)</option>
                    <option value="60px">60px (S.Tinggi)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasHeaderRow}
                  onChange={(e) => setHasHeaderRow(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-medium text-slate-700">
                  Gunakan Baris Header (Judul Kolom)
                </span>
              </label>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleInsertTable}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Sisipkan Tabel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
