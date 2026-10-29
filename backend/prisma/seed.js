import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.BOOKSHOP_SEED_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error('Set BOOKSHOP_SEED_PASSWORD to a value of at least 12 characters before seeding.');
  }

  const password = await bcrypt.hash(seedPassword, 12);

  const [laptops, components, peripherals] = await Promise.all([
    prisma.category.upsert({ where: { slug: 'laptop' }, update: {}, create: { name: 'Laptop', slug: 'laptop', description: 'Laptop học tập, văn phòng, lập trình và gaming' } }),
    prisma.category.upsert({ where: { slug: 'linh-kien' }, update: {}, create: { name: 'Linh kiện máy tính', slug: 'linh-kien', description: 'CPU, RAM, SSD, VGA và linh kiện PC' } }),
    prisma.category.upsert({ where: { slug: 'phu-kien' }, update: {}, create: { name: 'Phụ kiện', slug: 'phu-kien', description: 'Chuột, bàn phím và phụ kiện công nghệ' } }),
  ]);
  // Retire only the three exact legacy sample books; order/review history and all other catalog rows remain intact.
  await prisma.book.updateMany({
    where: { slug: { in: ['nha-gia-kim', 'dung-lua-chon-an-nhan-khi-con-tre', 'clean-code'] } },
    data: { status: 'INACTIVE' },
  });
  await prisma.category.updateMany({ where: { slug: { in: ['van-hoc', 'ky-nang'] } }, data: { status: 'INACTIVE' } });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bookshop.local' },
    update: { name: 'TechStore Admin', password, role: 'ADMIN', status: 'ACTIVE' },
    create: {
      name: 'TechStore Admin', email: 'admin@bookshop.local', password,
      role: 'ADMIN', status: 'ACTIVE', cart: { create: {} },
    },
  });

  const [customer, secondCustomer] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'lan.nguyen@bookshop.local' },
      update: { name: 'Nguyễn Hoàng Lan', password, role: 'CUSTOMER' },
      create: {
        name: 'Nguyễn Hoàng Lan', email: 'lan.nguyen@bookshop.local', password,
        phone: '0900000001', address: 'Quận 1, TP. Hồ Chí Minh', points: 180,
        membershipLevel: 'SILVER', cart: { create: {} },
      },
    }),
    prisma.user.upsert({
      where: { email: 'minh.tran@bookshop.local' },
      update: { name: 'Trần Quốc Minh', password, role: 'CUSTOMER' },
      create: {
        name: 'Trần Quốc Minh', email: 'minh.tran@bookshop.local', password,
        phone: '0900000002', address: 'Quận Bình Thạnh, TP. Hồ Chí Minh',
        cart: { create: {} },
      },
    }),
  ]);

  for (const [level, name, minPoints] of [
    ['BRONZE', 'Đồng', 0], ['SILVER', 'Bạc', 100], ['GOLD', 'Vàng', 500], ['PLATINUM', 'Bạch kim', 1500],
  ]) {
    await prisma.membership.upsert({
      where: { level }, update: { name, minPoints },
      create: { level, name, minPoints },
    });
  }

  const books = await Promise.all([
    prisma.book.upsert({ where: { slug: 'thinkpad-e14-gen-6' }, update: {}, create: {
      title: 'Lenovo ThinkPad E14 Gen 6', slug: 'thinkpad-e14-gen-6', author: 'Lenovo', brand: 'Lenovo',
      specifications: { CPU: 'Intel Core Ultra 5 125U', RAM: '16GB DDR5', SSD: '512GB NVMe', display: '14 inch WUXGA' },
      description: 'Laptop bền bỉ cho học tập, văn phòng và lập trình.', price: '21990000', stock: 12, categoryId: laptops.id,
    } }),
    prisma.book.upsert({ where: { slug: 'logitech-g102-lightsync' }, update: {}, create: {
      title: 'Logitech G102 LIGHTSYNC', slug: 'logitech-g102-lightsync', author: 'Logitech', brand: 'Logitech',
      specifications: { sensor: '8000 DPI', buttons: '6 nút lập trình', connection: 'USB' },
      description: 'Chuột gaming có dây với cảm biến chính xác và đèn LIGHTSYNC RGB.', price: '499000', stock: 30, categoryId: peripherals.id,
    } }),
    prisma.book.upsert({ where: { slug: 'kingston-fury-beast-16gb-ddr5' }, update: {}, create: {
      title: 'Kingston FURY Beast 16GB DDR5', slug: 'kingston-fury-beast-16gb-ddr5', author: 'Kingston', brand: 'Kingston',
      specifications: { capacity: '16GB (1 x 16GB)', type: 'DDR5', speed: '5600 MT/s', formFactor: 'DIMM' },
      description: 'Thanh RAM DDR5 cho PC, phù hợp nâng cấp hệ thống làm việc và chơi game.', price: '1390000', stock: 24, categoryId: components.id,
    } }),
  ]);

  const [alchemist, cleanCode] = books;
  const deliveredOrder = await prisma.order.upsert({
    where: { orderNumber: 'BS-SEED-0001' }, update: {},
    create: {
      orderNumber: 'BS-SEED-0001', userId: customer.id,
      subtotal: '23380000', discount: '0', shippingFee: '0', total: '23380000',
      shippingAddress: customer.address, receiverPhone: customer.phone, paymentMethod: 'COD', paymentStatus: 'PAID',
      orderStatus: 'DELIVERED',
      statusHistory: { create: [
        { status: 'PENDING', description: 'Đơn hàng đã được tạo và đang chờ xác nhận.' },
        { status: 'CONFIRMED', description: 'Đơn hàng đã được xác nhận.' },
        { status: 'PROCESSING', description: 'Đơn hàng đang được chuẩn bị.' },
        { status: 'SHIPPING', description: 'Đơn hàng đang trên đường giao.' },
        { status: 'DELIVERED', description: 'Đơn hàng đã giao thành công.' },
      ] },
      items: { create: [
        { bookId: alchemist.id, title: alchemist.title, quantity: 1, unitPrice: '21990000', subtotal: '21990000' },
        { bookId: cleanCode.id, title: cleanCode.title, quantity: 1, unitPrice: '1390000', subtotal: '1390000' },
      ] },
    },
  });

  await prisma.order.upsert({
    where: { orderNumber: 'BS-SEED-0002' }, update: {},
    create: {
      orderNumber: 'BS-SEED-0002', userId: secondCustomer.id,
      subtotal: '21990000', discount: '0', shippingFee: '0', total: '21990000',
      shippingAddress: secondCustomer.address, receiverPhone: secondCustomer.phone, paymentMethod: 'VNPAY',
      paymentStatus: 'PENDING', orderStatus: 'PENDING',
      statusHistory: { create: { status: 'PENDING', description: 'Đơn hàng đã được tạo và đang chờ xác nhận.' } },
      items: { create: [{
        bookId: alchemist.id, title: alchemist.title, quantity: 1,
        unitPrice: '21990000', subtotal: '21990000',
      }] },
    },
  });

  await prisma.review.upsert({
    where: { userId_bookId: { userId: customer.id, bookId: alchemist.id } },
    update: {},
    create: {
      userId: customer.id, bookId: alchemist.id, rating: 5,
      comment: 'Laptop gọn nhẹ, cấu hình phù hợp cho học tập và lập trình.',
    },
  });

  await prisma.review.upsert({
    where: { userId_bookId: { userId: customer.id, bookId: cleanCode.id } },
    update: {},
    create: {
      userId: customer.id, bookId: cleanCode.id, rating: 4,
      comment: 'Thanh RAM DDR5 hoạt động ổn định, dễ nâng cấp.',
    },
  });

  console.info(`Seed completed (admin: ${admin.email}; customers: ${customer.email}, ${secondCustomer.email})`);
}

main()
  .catch((error) => {
    console.error('BookShop seed failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
