import React, { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  Loader2,
  RefreshCw,
  FolderPlus,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  listDriveFolders,
  listDriveFiles,
  createDriveFolder,
  DriveFolder,
  DriveFile,
} from "../lib/driveService";

export interface DriveTreeNode {
  id: string;
  name: string;
  isExpanded: boolean;
  isLoading: boolean;
  isLoaded: boolean;
  subfolders: DriveTreeNode[];
  files: DriveFile[];
  error?: string;
}

interface DriveTreeViewProps {
  rootFolderId: string;
  rootFolderName: string;
  selectedFolderId: string;
  selectedFolderName: string;
  onSelectFolder: (folderId: string, folderName: string) => void;
  customToken?: string;
  webhookUrl?: string;
  onFolderCreated?: () => void;
}

export const DriveTreeView: React.FC<DriveTreeViewProps> = ({
  rootFolderId,
  rootFolderName,
  selectedFolderId,
  selectedFolderName,
  onSelectFolder,
  customToken,
  webhookUrl,
  onFolderCreated,
}) => {
  const [rootNode, setRootNode] = useState<DriveTreeNode>({
    id: rootFolderId,
    name: rootFolderName,
    isExpanded: true,
    isLoading: false,
    isLoaded: false,
    subfolders: [],
    files: [],
  });

  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);
  const [createSubfolderError, setCreateSubfolderError] = useState<string | null>(null);

  // Helper to update a node in the recursive tree structure
  const updateTreeNode = (
    current: DriveTreeNode,
    targetId: string,
    updater: (node: DriveTreeNode) => DriveTreeNode
  ): DriveTreeNode => {
    if (current.id === targetId) {
      return updater(current);
    }
    return {
      ...current,
      subfolders: current.subfolders.map((child) =>
        updateTreeNode(child, targetId, updater)
      ),
    };
  };

  // Fetch children (folders + files) for a specific node ID
  const fetchNodeChildren = async (folderId: string) => {
    // Set loading state
    setRootNode((prev) =>
      updateTreeNode(prev, folderId, (node) => ({ ...node, isLoading: true }))
    );

    try {
      const [fetchedFolders, fetchedFiles] = await Promise.all([
        listDriveFolders(
          folderId,
          "",
          false,
          customToken || undefined,
          webhookUrl || undefined
        ),
        listDriveFiles(
          folderId,
          customToken || undefined,
          webhookUrl || undefined
        ),
      ]);

      const formattedSubfolders: DriveTreeNode[] = (fetchedFolders || []).map(
        (f) => ({
          id: f.id,
          name: f.name,
          isExpanded: false,
          isLoading: false,
          isLoaded: false,
          subfolders: [],
          files: [],
        })
      );

      setRootNode((prev) =>
        updateTreeNode(prev, folderId, (node) => ({
          ...node,
          isExpanded: true,
          isLoaded: true,
          isLoading: false,
          subfolders: formattedSubfolders,
          files: fetchedFiles || [],
        }))
      );
    } catch (err: any) {
      console.error(`Failed to load children for folder ${folderId}:`, err);
      setRootNode((prev) =>
        updateTreeNode(prev, folderId, (node) => ({ 
          ...node, 
          isLoading: false, 
          isLoaded: true,
          error: err?.message || "Gagal memuat data dari API. Pastikan izin akses folder telah dibagikan." 
        }))
      );
    }
  };

  // Reload root when rootFolderId, rootFolderName, or customToken changes
  useEffect(() => {
    const newRoot: DriveTreeNode = {
      id: rootFolderId,
      name: rootFolderName || "Folder Target Utama",
      isExpanded: true,
      isLoading: false,
      isLoaded: false,
      subfolders: [],
      files: [],
    };
    setRootNode(newRoot);
    fetchNodeChildren(rootFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootFolderId, rootFolderName, customToken]);

  const handleToggleExpand = (node: DriveTreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.isLoaded) {
      fetchNodeChildren(node.id);
    } else {
      setRootNode((prev) =>
        updateTreeNode(prev, node.id, (n) => ({
          ...n,
          isExpanded: !n.isExpanded,
        }))
      );
    }
  };

  const handleSelectFolder = (node: DriveTreeNode) => {
    onSelectFolder(node.id, node.name);
    if (!node.isLoaded) {
      fetchNodeChildren(node.id);
    } else {
      setRootNode((prev) =>
        updateTreeNode(prev, node.id, (n) => ({
          ...n,
          isExpanded: true,
        }))
      );
    }
  };

  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubfolderName.trim()) return;

    setIsCreatingSubfolder(true);
    setCreateSubfolderError(null);

    try {
      const newFolder = await createDriveFolder(
        newSubfolderName.trim(),
        selectedFolderId || rootFolderId,
        customToken || undefined
      );

      setNewSubfolderName("");
      // Refresh the parent node where the subfolder was created
      await fetchNodeChildren(selectedFolderId || rootFolderId);
      if (onFolderCreated) onFolderCreated();
    } catch (err: any) {
      setCreateSubfolderError(
        err?.message || "Gagal membuat sub-folder di Google Drive."
      );
    } finally {
      setIsCreatingSubfolder(false);
    }
  };

  // Recursive component for rendering each node in tree structure
  const renderNode = (node: DriveTreeNode, depth: number = 0) => {
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.subfolders.length > 0 || node.files.length > 0;

    return (
      <div key={node.id} className="select-none font-sans text-xs">
        {/* Node Item Row */}
        <div className="flex items-center gap-1.5 py-1 px-1 rounded-lg hover:bg-slate-100 transition-colors group">
          {/* Toggle square button [+] / [-] */}
          <button
            type="button"
            onClick={(e) => handleToggleExpand(node, e)}
            className="w-4 h-4 border border-slate-400 bg-white hover:bg-slate-200 text-slate-800 text-[11px] font-mono leading-none flex items-center justify-center shrink-0 shadow-2xs rounded-2xs cursor-pointer"
            title={node.isExpanded ? "Tutup Folder" : "Buka Sub-Folder"}
          >
            {node.isLoading ? (
              <Loader2 className="w-2.5 h-2.5 animate-spin text-sky-600" />
            ) : node.isExpanded ? (
              "−"
            ) : (
              "+"
            )}
          </button>

          {/* Folder Icon & Folder Name */}
          <div
            onClick={() => handleSelectFolder(node)}
            className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer flex-1 min-w-0 transition-all ${
              isSelected
                ? "bg-amber-100 text-amber-950 font-bold border border-amber-300 shadow-2xs"
                : "hover:bg-amber-50 text-slate-800"
            }`}
          >
            {node.isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-500 fill-amber-200 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500 fill-amber-200 shrink-0" />
            )}
            <span className="truncate text-xs">{node.name}</span>
            {isSelected && (
              <span className="ml-auto text-[10px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-bold shrink-0 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Target
              </span>
            )}
          </div>
        </div>

        {/* Children Subfolders & Files (when expanded) */}
        {node.isExpanded && (
          <div className="ml-3 pl-3.5 border-l border-dotted border-slate-400 space-y-0.5 pt-0.5">
            {node.isLoading ? (
              <div className="flex items-center gap-2 text-slate-500 py-1 text-[11px]">
                <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
                <span>Memuat isi folder...</span>
              </div>
            ) : node.error ? (
              <div className="text-[11px] text-red-500 py-1 font-sans font-medium px-2 bg-red-50 rounded border border-red-100">
                {node.error}
              </div>
            ) : node.subfolders.length === 0 && node.files.length === 0 ? (
              <div className="text-[11px] text-slate-400 py-1 italic font-mono">
                (folder kosong)
              </div>
            ) : (
              <>
                {/* Render Subfolders */}
                {node.subfolders.map((child) => renderNode(child, depth + 1))}

                {/* Render Files */}
                {node.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 py-1 px-1 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded group/file transition-colors"
                  >
                    {/* Dotted Branch Connector Placeholder */}
                    <div className="w-3.5 border-t border-dotted border-slate-400 shrink-0" />

                    {/* Classic Document Icon matching screenshot */}
                    <div className="w-3.5 h-4 border border-amber-800/60 bg-amber-50/70 rounded-2xs flex flex-col justify-center px-0.5 space-y-0.5 shrink-0 shadow-2xs group-hover/file:border-amber-900">
                      <div className="h-0.5 bg-red-500 w-full rounded-2xs" />
                      <div className="h-0.5 bg-emerald-600 w-2/3 rounded-2xs" />
                      <div className="h-0.5 bg-slate-400 w-4/5 rounded-2xs" />
                    </div>

                    <span className="truncate text-xs flex-1 text-slate-800 font-medium">
                      {file.name}
                    </span>

                    {file.webViewLink && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(file.webViewLink, "_blank", "noopener,noreferrer");
                        }}
                        className="opacity-0 group-hover/file:opacity-100 text-[10px] text-sky-700 hover:underline flex items-center gap-0.5 shrink-0 px-1 bg-white rounded border border-sky-200"
                        title="Buka File di Tab Baru"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> Buka
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Target Folder Banner */}
      <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <FolderOpen className="w-5 h-5 text-amber-600 fill-amber-200 shrink-0" />
          <div className="truncate">
            <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
              Folder Target yang Dipilih:
            </p>
            <p className="font-extrabold text-xs text-amber-950 truncate">
              {selectedFolderName || rootFolderName || "Folder Target"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchNodeChildren(rootFolderId)}
          className="p-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl text-xs flex items-center gap-1 font-bold shrink-0 transition-colors shadow-2xs"
          title="Muat Ulang Struktur Folder Tree"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
          <span>Refresh Tree</span>
        </button>
      </div>

      {/* Directory Tree Card */}
      <div className="p-4 bg-white border border-slate-300 rounded-2xl shadow-inner max-h-72 overflow-y-auto space-y-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 pb-1 border-b border-slate-200 flex items-center justify-between">
          <span>Struktur Direktori Google Drive</span>
          <span className="text-[10px] text-slate-400 font-normal">
            Klik [+] untuk ekspand, klik nama folder untuk pilih
          </span>
        </div>

        {/* Tree Root Render */}
        <div className="space-y-1">{renderNode(rootNode)}</div>
      </div>

      {/* Quick Add Subfolder Form */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
        <form onSubmit={handleCreateSubfolder} className="flex gap-2">
          <input
            type="text"
            value={newSubfolderName}
            onChange={(e) => setNewSubfolderName(e.target.value)}
            placeholder={`Buat sub-folder baru di [${selectedFolderName || "Folder Target"}]...`}
            className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />
          <button
            type="submit"
            disabled={isCreatingSubfolder || !newSubfolderName.trim()}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
          >
            {isCreatingSubfolder ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderPlus className="w-3.5 h-3.5 text-amber-100" />
            )}
            <span>Buat Sub-Folder</span>
          </button>
        </form>

        {createSubfolderError && (
          <p className="text-[11px] text-rose-600 font-semibold px-1">
            ⚠️ {createSubfolderError}
          </p>
        )}
      </div>
    </div>
  );
};
