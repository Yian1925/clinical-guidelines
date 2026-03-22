import { useEffect, useRef, useState } from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';

interface UploadFileModalProps {
  open: boolean;
  onClose: () => void;
}

const SUPPORTED_TYPES = 'RIS、BIB、PDF、doc、csv、xlsx';

export default function UploadFileModal({ open, onClose }: UploadFileModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useModalDialog(open, onClose);
  const dragDepthRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) {
      dragDepthRef.current = 0;
      setDragOver(false);
    }
  }, [open]);

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
      <div
        ref={modalRef}
        className="modal upload-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-upload-file-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="modal-upload-file-title">添加本地文件</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">
          <div
            className={`upload-drop-zone${dragOver ? ' upload-drop-zone--drag' : ''}`}
            onClick={handleDropZoneClick}
            onDragEnter={(e) => {
              e.preventDefault();
              dragDepthRef.current += 1;
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              dragDepthRef.current -= 1;
              if (dragDepthRef.current <= 0) {
                dragDepthRef.current = 0;
                setDragOver(false);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              dragDepthRef.current = 0;
              setDragOver(false);
              const files = e.dataTransfer.files;
              if (files?.length) {
                // TODO: handle dropped files
              }
            }}
          >
            <p className="upload-drop-text">点击选择文件，或拖拽到此处</p>
            <p className="upload-drop-hint">支持格式：{SUPPORTED_TYPES}</p>
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
