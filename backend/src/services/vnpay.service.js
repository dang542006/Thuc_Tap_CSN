import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const configured = () => Boolean(env.VNPAY_TMN_CODE && env.VNPAY_HASH_SECRET && env.VNPAY_RETURN_URL);
const encode = (value) => encodeURIComponent(String(value)).replace(/%20/g, '+');
const canonicalQuery = (params) => Object.keys(params).sort().map((key) => `${encode(key)}=${encode(params[key])}`).join('&');
const sign = (value) => createHmac('sha512', env.VNPAY_HASH_SECRET).update(value, 'utf8').digest('hex');

function verify(params) {
  const received = String(params.vnp_SecureHash ?? '');
  if (!/^[a-f\d]{128}$/i.test(received)) return false;
  const clean = Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType'));
  const expected = sign(canonicalQuery(clean));
  return timingSafeEqual(Buffer.from(received.toLowerCase(), 'hex'), Buffer.from(expected, 'hex'));
}

function dateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

export const vnpayService = {
  isConfigured: configured,
  createPaymentUrl(order, ipAddress = '127.0.0.1') {
    if (!configured()) throw new AppError('Thanh toán VNPAY chưa được cấu hình. Hãy bổ sung thông tin kết nối VNPAY.', 503, 'VNPAY_NOT_CONFIGURED');
    const params = {
      vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: env.VNPAY_TMN_CODE,
      vnp_Amount: String(Math.round(Number(order.total) * 100)), vnp_CurrCode: 'VND',
      vnp_TxnRef: order.orderNumber, vnp_OrderInfo: `Thanh toan don hang ${order.orderNumber}`,
      vnp_OrderType: 'other', vnp_Locale: 'vn', vnp_ReturnUrl: env.VNPAY_RETURN_URL,
      vnp_IpAddr: String(ipAddress).replace(/^::ffff:/, '').slice(0, 45),
      vnp_CreateDate: dateStamp(),
    };
    const query = canonicalQuery(params);
    return `${env.VNPAY_URL}?${query}&vnp_SecureHash=${sign(query)}`;
  },
  verifyCallback: verify,
};
