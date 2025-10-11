import React, { useState, useEffect } from "react";
import { Folder, Image as ImageIcon, ChevronRight, Home } from "lucide-react";
import { useApi } from "../../utils/api.js";

function FolderBrowser({ onFolderSelect }) {
  const [folders, setFolders] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { makeRequest } = useApi();

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await makeRequest("media/folders");
      setFolders(response.folders || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching folders:", err);
      setError("Failed to load folders");
    } finally {
      setLoading(false);
    }
  };

  const buildFolderTree = () => {
    const tree = {};
    folders.forEach((folderPath) => {
      const parts = folderPath.split("/");
      let current = tree;
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, index + 1).join("/"),
            children: {},
            isLeaf: index === parts.length - 1,
          };
        }
        current = current[part].children;
      });
    });
    return tree;
  };

  const getCurrentLevelFolders = () => {
    const tree = buildFolderTree();
    let current = tree;
    currentPath.forEach((pathPart) => {
      if (current[pathPart]) current = current[pathPart].children;
    });
    return Object.values(current);
  };

  const handleFolderClick = (folder) => {
    setCurrentPath([...currentPath, folder.name]);
    if (onFolderSelect) onFolderSelect(folder.path);
  };

  const handleBreadcrumbClick = (index) => {
    setCurrentPath(currentPath.slice(0, index));
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64 bg-emerald-50 rounded-xl shadow-inner">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
      </div>
    );

  if (error)
    return (
      <div className="p-4 text-red-700 bg-red-50 rounded-lg border border-red-200">
        {error}
      </div>
    );

  if (folders.length === 0)
    return (
      <div className="text-center py-10 text-gray-600 bg-amber-50 rounded-xl shadow-sm">
        <p className="text-lg font-medium">No folders uploaded yet.</p>
        <p className="text-sm text-gray-500">Upload a folder to see it here.</p>
      </div>
    );

  const currentFolders = getCurrentLevelFolders();

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Breadcrumb Navigation */}
      <div className="bg-gradient-to-r from-green-900 to-green-700 text-amber-100 px-4 py-3 flex items-center gap-2 text-sm font-medium">
        <button
          onClick={() => setCurrentPath([])}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <Home className="w-4 h-4" /> Root
        </button>
        {currentPath.map((part, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="w-4 h-4 opacity-70" />
            <button
              onClick={() => handleBreadcrumbClick(index + 1)}
              className="hover:text-white transition-colors"
            >
              {part}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Folder List */}
      <ul className="divide-y divide-amber-200">
        {currentFolders.length === 0 ? (
          <li className="px-6 py-4 text-gray-600 italic text-center">
            No folders at this level — navigate back or upload more folders.
          </li>
        ) : (
          currentFolders.map((folder) => (
            <li
              key={folder.path}
              onClick={() => handleFolderClick(folder)}
              className="flex items-center gap-3 px-6 py-3 hover:bg-green-100 cursor-pointer transition-all duration-150"
            >
              <div className="flex-shrink-0">
                {folder.isLeaf ? (
                  <ImageIcon className="w-6 h-6 text-amber-700" />
                ) : (
                  <Folder className="w-6 h-6 text-green-800" />
                )}
              </div>
              <div>
                <p className="font-medium text-green-900">{folder.name}</p>
                <p className="text-xs text-gray-500">
                  {folder.isLeaf ? "View images" : "Subfolder"}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default FolderBrowser;
    