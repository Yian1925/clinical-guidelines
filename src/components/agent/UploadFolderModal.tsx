import { useEffect, useRef, useState } from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';

interface UploadFolderModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadFolderModal({ open, onClose }: UploadFolderModalProps) {
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

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      // TODO: handle selected folder
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
        aria-labelledby="modal-upload-folder-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="modal-upload-folder-title">添加文件夹</h3>
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
              const items = e.dataTransfer.items;
              if (items?.length) {
                // TODO: handle dropped folder
              }
            }}
          >
            <p className="upload-drop-text">点击选择文件夹，或拖拽到此处</p>
            <p className="upload-drop-hint">将包含该文件夹内的全部文件</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            {...({ webkitdirectory: true } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={handleFolderChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
