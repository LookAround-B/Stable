import React, { useState, useCallback } from 'react';
import '../styles/ImageUploadWidget.css';

const ImageUploadWidget = ({ onImagesSelected, maxImages = 5, maxSizeMB = 10 }) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [error, setError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  const validateFile = useCallback((file) => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return false;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    return true;
  }, [maxSizeMB]);

  const handleFiles = useCallback((files) => {
    setError('');
    const newImages = [];

    for (let i = 0; i < files.length; i++) {
      if (selectedImages.length + newImages.length >= maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        break;
      }

      const file = files[i];
      if (validateFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newImages.push({
            file,
            preview: e.target.result,
          });

          if (newImages.length === Math.min(files.length, maxImages - selectedImages.length)) {
            const updatedImages = [...selectedImages, ...newImages];
            setSelectedImages(updatedImages);
            onImagesSelected(updatedImages.map((img) => img.file));
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }, [selectedImages, maxImages, validateFile, onImagesSelected]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const { files } = e.dataTransfer;
    handleFiles(files);
  }, [handleFiles]);

  const handleInputChange = (e) => {
    const { files } = e.target;
    handleFiles(files);
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    onImagesSelected(newImages.map((img) => img.file));
  };

  return (
    <div className="image-upload-widget">
      <div
        className={`upload-area ${isDragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleInputChange}
          className="file-input"
          id="image-input"
        />
        <label htmlFor="image-input" className="upload-label">
          <div className="upload-content">
            <p className="upload-text">
              Drag and drop images here or click to select
            </p>
            <p className="upload-hint">
              Max {maxImages} images, {maxSizeMB}MB each
            </p>
          </div>
        </label>
      </div>

      {error && <div className="error-message">{error}</div>}

      {selectedImages.length > 0 && (
        <div className="image-preview-container">
          <p className="preview-title">
            Selected Images ({selectedImages.length}/{maxImages})
          </p>
          <div className="image-previews">
            {selectedImages.map((image, index) => (
              <div key={index} className="image-preview">
                <img src={image.preview} alt={`Preview ${index + 1}`} />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="remove-btn"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadWidget;
