import { useRef } from 'react';

interface UploadFolderModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadFolderModal({ open, onClose }: UploadFolderModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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
      <div className="modal upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>上传文件夹</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">
          <div
            className="upload-drop-zone"
            onClick={handleDropZoneClick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const items = e.dataTransfer.items;
              if (items?.length) {
                // TODO: handle dropped folder
              }
            }}
          >
            <p className="upload-drop-text">点击选择文件夹或拖拽到此处</p>
            <p className="upload-drop-hint">将上传该文件夹内的所有文件</p>
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
