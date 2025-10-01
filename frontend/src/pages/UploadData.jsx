import React, { useState } from "react";
import Button from "@mui/material/Button";
import { CloudUpload } from "@mui/icons-material";  
import { styled } from "@mui/material/styles";
import { useApi } from "../utils/api.js";

// Define VisuallyHiddenInput manually
const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

function UploadData() {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const { makeRequest } = useApi();

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setError(null);

    const uploaded = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("file_type", file.type.startsWith("image") ? "image" : "video");
      // Optional: add latitude/longitude if needed
      // formData.append("latitude", 12.34);
      // formData.append("longitude", 56.78);

      try {
        const res = await makeRequest("media/upload", {
          method: "POST",
          body: formData, // important: do NOT set Content-Type manually
        });
        uploaded.push(res);
      } catch (err) {
        console.error("Upload error:", err);
        setError(err.message || "Upload failed");
      }
    }

    setUploadedFiles(uploaded);
    setIsUploading(false);
    setFiles([]); // clear selected files
  };

  return (
    <div>
      <Button
        component="label"
        variant="contained"
        startIcon={<CloudUpload />}
        disabled={isUploading}
      >
        Select Files
        <VisuallyHiddenInput
          type="file"
          onChange={handleFileSelect}
          multiple
        />
      </Button>

      <Button
        onClick={uploadFiles}
        variant="outlined"
        disabled={files.length === 0 || isUploading}
        style={{ marginLeft: "10px" }}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </Button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <ul>
        {files.map((file, index) => (
          <li key={index}>{file.name}</li>
        ))}
      </ul>

      <h3>Uploaded Files:</h3>
      <ul>
        {uploadedFiles.map((file, index) => (
          <li key={index}>
            {file.file_url} ({file.file_type})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UploadData;
