import { useCallback, useState } from 'react';
import { Check, Save, MapPin, Pencil, Trash2 } from 'lucide-react';
import PageState from '../components/PageState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { profileService } from '../services/profileService.js';
import { getErrorMessage, unwrapData } from '../utils/apiData.js';

export default function ProfilePage() {
  const load = useCallback(() => profileService.get(), []);
  const loadAddresses = useCallback(() => profileService.listAddresses(), []);
  const { data, loading, error, reload } = useApi(load);
  const addressState = useApi(loadAddresses);
  const { refreshUser } = useAuth();
  const user = data?.user ?? data;
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileMessage, setProfileMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [addressForm, setAddressForm] = useState(null);
  const [addressBusy, setAddressBusy] = useState(false);
  const [addressMessage, setAddressMessage] = useState(null);
  const addresses = addressState.data?.items ?? addressState.data?.data?.items ?? [];

  function profileValue(key) { return profile?.[key] ?? user?.[key] ?? ''; }
  async function saveProfile(event) {
    event.preventDefault(); setBusy(true); setProfileMessage(null);
    try {
      const payload = {
        name: profileValue('name').trim(),
        email: profileValue('email').trim(),
        phone: profileValue('phone').trim() || null,
        address: profileValue('address').trim() || null,
      };
      await profileService.update(payload);
      await Promise.all([reload(), refreshUser()]);
      setProfile(null); setProfileMessage({ type: 'success', text: 'Thông tin cá nhân đã được cập nhật.' });
    } catch (requestError) { setProfileMessage({ type: 'error', text: getErrorMessage(requestError) }); }
    finally { setBusy(false); }
  }
  async function savePassword(event) {
    event.preventDefault(); setBusy(true); setPasswordMessage(null);
    if (password.newPassword !== password.confirmPassword) {
      setBusy(false); setPasswordMessage({ type: 'error', text: 'Mật khẩu xác nhận chưa khớp.' }); return;
    }
    try {
      unwrapData(await profileService.changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword }));
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage({ type: 'success', text: 'Mật khẩu đã được thay đổi.' });
    } catch (requestError) { setPasswordMessage({ type: 'error', text: getErrorMessage(requestError) }); }
    finally { setBusy(false); }
  }
  async function saveAddress(event) {
    event.preventDefault(); setAddressBusy(true); setAddressMessage(null);
    const { id, ...payload } = addressForm;
    try {
      if (id) await profileService.updateAddress(id, payload);
      else await profileService.createAddress(payload);
      await addressState.reload(); setAddressForm(null);
      setAddressMessage({ type: 'success', text: 'Địa chỉ nhận hàng đã được lưu.' });
    } catch (requestError) { setAddressMessage({ type: 'error', text: getErrorMessage(requestError) }); }
    finally { setAddressBusy(false); }
  }
  async function removeAddress(item) {
    if (!window.confirm(`Xóa địa chỉ nhận hàng “${item.fullAddress}”?`)) return;
    setAddressMessage(null);
    try { await profileService.deleteAddress(item.id); await addressState.reload(); setAddressMessage({ type: 'success', text: 'Đã xóa địa chỉ nhận hàng.' }); }
    catch (requestError) { setAddressMessage({ type: 'error', text: getErrorMessage(requestError) }); }
  }
  async function makeDefault(item) {
    setAddressMessage(null);
    try { await profileService.setDefaultAddress(item.id); await addressState.reload(); }
    catch (requestError) { setAddressMessage({ type: 'error', text: getErrorMessage(requestError) }); }
  }

  return <div className="shell page-shell"><div className="screen-title"><div><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h1>Thông tin cá nhân</h1><p className="screen-description">Quản lý thông tin liên hệ và bảo mật tài khoản TechStore.</p></div></div>
    <PageState loading={loading} error={error} empty={!loading && !error && !user ? 'Không tìm thấy hồ sơ.' : null}>{user && <><div className="profile-page-grid"><form className="panel form-stack profile-edit-form" onSubmit={saveProfile}><div className="profile-heading"><div className="profile-avatar">{user.name?.slice(0, 1) || 'T'}</div><div><p className="eyebrow">HỒ SƠ THÀNH VIÊN</p><h2>{user.name}</h2><span>{user.email}</span></div></div><h3>Thông tin liên hệ</h3><label>Họ và tên<input required minLength="2" maxLength="120" value={profileValue('name')} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></label><label>Email<input required type="email" maxLength="254" value={profileValue('email')} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} /></label><label>Số điện thoại<input maxLength="30" value={profileValue('phone')} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></label><label>Địa chỉ<textarea rows="3" maxLength="500" value={profileValue('address')} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} /></label>{profileMessage && <p className={profileMessage.type === 'success' ? 'inline-success' : 'inline-error'}>{profileMessage.type === 'success' && <Check size={15} />}{profileMessage.text}</p>}<button className="button button-primary" disabled={busy}><Save size={16} /> Lưu hồ sơ</button><div className="profile-membership-info"><span><strong>{user.points ?? 0}</strong> điểm</span><span><strong>{user.membershipLevel || 'BRONZE'}</strong> hạng thành viên</span></div></form>
      <form className="panel form-stack password-form" onSubmit={savePassword}><p className="eyebrow">BẢO MẬT</p><h2>Đổi mật khẩu</h2><p className="muted">Dùng mật khẩu dài và khó đoán để bảo vệ tài khoản.</p><label>Mật khẩu hiện tại<input required type="password" autoComplete="current-password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} /></label><label>Mật khẩu mới<input required minLength="8" type="password" autoComplete="new-password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} /></label><label>Xác nhận mật khẩu mới<input required minLength="8" type="password" autoComplete="new-password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} /></label>{passwordMessage && <p className={passwordMessage.type === 'success' ? 'inline-success' : 'inline-error'}>{passwordMessage.type === 'success' && <Check size={15} />}{passwordMessage.text}</p>}<button className="button button-outline" disabled={busy}>Cập nhật mật khẩu</button></form></div>
      <section className="panel address-book"><div className="address-book-heading"><div><p className="eyebrow">SỔ ĐỊA CHỈ</p><h2>Địa chỉ nhận hàng</h2></div><button className="button button-outline" type="button" onClick={() => setAddressForm({ receiverName: user.name || '', phoneNumber: user.phone || '', fullAddress: '', addressType: 'HOME', defaultAddress: addresses.length === 0 })}>Thêm địa chỉ</button></div>
        <PageState loading={addressState.loading} error={addressState.error} empty={!addressState.loading && !addressState.error && !addresses.length ? 'Bạn chưa lưu địa chỉ nhận hàng nào.' : null}>{addresses.map((item) => <article className="saved-address" key={item.id}><div><div className="saved-address-title"><MapPin size={16} /><strong>{item.receiverName}</strong><span>{item.addressType}</span>{item.defaultAddress && <b>Mặc định</b>}</div><p>{item.phoneNumber}</p><p>{item.fullAddress}</p></div><div className="saved-address-actions">{!item.defaultAddress && <button type="button" onClick={() => makeDefault(item)}>Đặt mặc định</button>}<button type="button" onClick={() => setAddressForm({ ...item })}><Pencil size={14} /> Sửa</button><button type="button" onClick={() => removeAddress(item)}><Trash2 size={14} /> Xóa</button></div></article>)}</PageState>
        {addressMessage && <p className={addressMessage.type === 'success' ? 'inline-success' : 'inline-error'} role="status">{addressMessage.text}</p>}
        {addressForm && <form className="form-stack address-form" onSubmit={saveAddress}><h3>{addressForm.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h3><label>Người nhận<input required minLength="2" maxLength="120" value={addressForm.receiverName} onChange={(e) => setAddressForm({ ...addressForm, receiverName: e.target.value })} /></label><label>Số điện thoại<input required minLength="7" maxLength="30" value={addressForm.phoneNumber} onChange={(e) => setAddressForm({ ...addressForm, phoneNumber: e.target.value })} /></label><label>Địa chỉ đầy đủ<textarea required minLength="8" maxLength="500" rows="3" value={addressForm.fullAddress} onChange={(e) => setAddressForm({ ...addressForm, fullAddress: e.target.value })} /></label><label>Loại địa chỉ<input required maxLength="40" value={addressForm.addressType} onChange={(e) => setAddressForm({ ...addressForm, addressType: e.target.value })} placeholder="Nhà riêng, Công ty…" /></label><label className="address-default-control"><input type="checkbox" checked={Boolean(addressForm.defaultAddress)} onChange={(e) => setAddressForm({ ...addressForm, defaultAddress: e.target.checked })} /> Đặt làm địa chỉ mặc định</label><div className="modal-actions"><button className="button button-outline" type="button" onClick={() => setAddressForm(null)}>Hủy</button><button className="button button-primary" disabled={addressBusy}>{addressBusy ? 'Đang lưu…' : 'Lưu địa chỉ'}</button></div></form>}
      </section></>}</PageState>
  </div>;
}
