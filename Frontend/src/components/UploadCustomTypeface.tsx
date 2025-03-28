import { useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileDetails {
  name: string;
  size: string;
  file: File;
}

const UploadCustomTypeface = () => {
  const [file, setFile] = useState<FileDetails | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile({
        name: selectedFile.name,
        size: (selectedFile.size / 1024).toFixed(1),
        file: selectedFile,
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
  });

  const handleFileUpload = () => {
    console.log("Uploaded file: ", file);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">Upload Resume</h2>
      <div
        {...getRootProps()}
        className={`border-2 ${
          isDragActive ? "border-blue-500" : "border-gray-300"
        } border-dashed p-4 rounded-lg text-center mb-4 cursor-pointer`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-sm text-blue-500">Drop your file here...</p>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Drag and drop your resume file to upload
            </p>
            <p className="text-sm text-gray-500">
              Upload in PDF, DOC, or DOCX format
            </p>
          </>
        )}
      </div>

      {file && (
        <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold">📄</span>
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-gray-500">{file.size} KB</p>
            </div>
          </div>
          <button
            className="text-red-500 text-sm"
            onClick={() => setFile(null)}
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
          onClick={() => setFile(null)}
        >
          Cancel
        </button>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
          onClick={handleFileUpload}
          disabled={!file}
        >
          Upload Resume
        </button>
      </div>
    </div>
  );
};

export default UploadCustomTypeface;
