import { useRef } from 'react';

interface UploadFileModalProps {
  open: boolean;
  onClose: () => void;
}

const SUPPORTED_TYPES = 'RIS、BIB、PDF、doc、csv、xlsx';

export default function UploadFileModal({ open, onClose }: UploadFileModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDropZoneClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      // TODO: handle selected files
    }
    e.target.value = '';
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop upload-modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>导入本地文件</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">
          <div
            className="upload-drop-zone"
            onClick={handleDropZoneClick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = e.dataTransfer.files;
              if (files?.length) {
                // TODO: handle dropped files
              }
            }}
          >
            <p className="upload-drop-text">点击选择文件或拖拽到此处</p>
            <p className="upload-drop-hint">支持: {SUPPORTED_TYPES}</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".ris,.bib,.pdf,.doc,.docx,.csv,.xlsx"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
