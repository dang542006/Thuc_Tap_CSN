import { useEffect, useState } from 'react';
import { deleteAdminBookImage, resolveBookImageUrl, uploadAdminBookImage } from '../../services/adminBookImageService.js';
import './BookImageUpload.css';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function BookImageUpload({ bookId, value, onChange, disabled = false }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return undefined;
    }
    const localUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(localUrl);
    return () => URL.revokeObjectURL(localUrl);
  }, [selectedFile]);

  const chooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    setError('');
    setSuccess('');
    setProgress(0);
    if (!file) return setSelectedFile(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Ảnh phải có dung lượng tối đa 5 MB.');
      event.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const upload = async () => {
    if (!bookId) return setError('Hãy lưu sản phẩm trước khi tải ảnh lên.');
    if (!selectedFile) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await uploadAdminBookImage(bookId, selectedFile, setProgress);
      onChange?.(result.imageUrl || result.book?.image || '');
      setSelectedFile(null);
      setProgress(100);
      setSuccess('Ảnh sản phẩm đã được cập nhật.');
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!bookId) return setError('Hãy lưu sản phẩm trước khi xóa ảnh.');
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await deleteAdminBookImage(bookId);
      onChange?.('');
      setSelectedFile(null);
      setSuccess('Đã xóa ảnh sản phẩm.');
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || 'Không thể xóa ảnh. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const image = previewUrl || resolveBookImageUrl(value);

  return (
    <section className="book-image-upload" aria-label="Ảnh sản phẩm">
      <div className="book-image-upload__preview">
        {image ? <img src={image} alt="Xem trước ảnh sản phẩm" /> : <span>Chưa có ảnh sản phẩm</span>}
      </div>
      <div className="book-image-upload__controls">
        <label>
          Chọn ảnh
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={chooseFile} disabled={busy || disabled} />
        </label>
        <small>JPG, PNG hoặc WEBP · tối đa 5 MB</small>
        {selectedFile && <button type="button" onClick={upload} disabled={busy || disabled}>{busy ? `Đang tải ${progress}%` : 'Tải ảnh lên'}</button>}
        {value && <button type="button" onClick={remove} disabled={busy || disabled}>Xóa ảnh</button>}
        {busy && <progress max="100" value={progress} aria-label="Tiến độ tải ảnh" />}
        {error && <p role="alert" className="book-image-upload__error">{error}</p>}
        {success && <p role="status" className="book-image-upload__success">{success}</p>}
      </div>
    </section>
  );
}
