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
      try {
        // 1) Request presigned URL from the server
        const mimeType = file.type || (file.name.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream')
        const presignResp = await makeRequest(`media/presign?file_name=${encodeURIComponent(file.name)}&file_type=${encodeURIComponent(mimeType)}`, {
          method: 'GET'
        })

        const uploadUrl = presignResp.upload_url
        const fileUrl = presignResp.file_url

        // 2) PUT the file bytes directly to S3 using the presigned URL
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType
          },
          body: file,
        })
        if (!putRes.ok) {
          const errText = await putRes.text().catch(() => putRes.statusText)
          throw new Error(`S3 upload failed: ${putRes.status} ${errText}`)
        }

        // 3) Tell our backend to create the DB record (store file_url)
        const res = await makeRequest('media', {
          method: 'POST',
          body: JSON.stringify({ file_url: fileUrl, file_type: file.type.startsWith('image') ? 'image' : 'video' })
        })
        uploaded.push(res)
      } catch (err) {
        console.error('Upload error:', err)
        setError(err.message || 'Upload failed')
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
