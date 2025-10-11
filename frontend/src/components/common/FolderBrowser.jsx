import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Paper,
  Chip,
  CircularProgress,
  Breadcrumbs,
  Link,
} from "@mui/material";
import {
  Folder,
  FolderOpen,
  Image as ImageIcon,
  NavigateNext,
} from "@mui/icons-material";
import { useApi } from "../../utils/api.js";

function FolderBrowser({ onFolderSelect }) {
  const [folders, setFolders] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { makeRequest } = useApi();

  // Fetch folders on mount
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

  // Build folder tree structure
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

  // Get current level folders
  const getCurrentLevelFolders = () => {
    const tree = buildFolderTree();
    let current = tree;
    
    currentPath.forEach((pathPart) => {
      if (current[pathPart]) {
        current = current[pathPart].children;
      }
    });
    
    return Object.values(current);
  };

  const handleFolderClick = (folder) => {
    setCurrentPath([...currentPath, folder.name]);
    if (onFolderSelect) {
      onFolderSelect(folder.path);
    }
  };

  const handleBreadcrumbClick = (index) => {
    setCurrentPath(currentPath.slice(0, index));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (folders.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          No folders uploaded yet. Upload a folder to see it here.
        </Typography>
      </Box>
    );
  }

  const currentFolders = getCurrentLevelFolders();

  return (
    <Paper variant="outlined">
      {/* Breadcrumb Navigation */}
      <Box p={2} bgcolor="grey.50" borderBottom={1} borderColor="divider">
        <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
          <Link
            component="button"
            variant="body2"
            onClick={() => setCurrentPath([])}
            sx={{ cursor: "pointer" }}
          >
            Root
          </Link>
          {currentPath.map((part, index) => (
            <Link
              key={index}
              component="button"
              variant="body2"
              onClick={() => handleBreadcrumbClick(index + 1)}
              sx={{ cursor: "pointer" }}
            >
              {part}
            </Link>
          ))}
        </Breadcrumbs>
      </Box>

      {/* Folder List */}
      <List>
        {currentFolders.length === 0 ? (
          <ListItem>
            <ListItemText
              primary="No folders at this level"
              secondary="Navigate back or upload more folders"
            />
          </ListItem>
        ) : (
          currentFolders.map((folder) => (
            <ListItemButton
              key={folder.path}
              onClick={() => handleFolderClick(folder)}
            >
              <ListItemIcon>
                {folder.isLeaf ? <ImageIcon color="primary" /> : <Folder color="action" />}
              </ListItemIcon>
              <ListItemText
                primary={folder.name}
                secondary={folder.isLeaf ? "View images" : "Subfolder"}
              />
            </ListItemButton>
          ))
        )}
      </List>
    </Paper>
  );
}

export default FolderBrowser;