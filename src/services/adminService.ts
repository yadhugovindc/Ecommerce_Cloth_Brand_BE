import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { User } from '../models/User';

export async function getDashboardStats() {
  const [productCount, orderCount, customerCount, revenueAgg, recentOrders] =
    await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
    ]);

  return {
    stats: {
      productCount,
      orderCount,
      customerCount,
      revenue: revenueAgg[0]?.total || 0,
    },
    recentOrders,
  };
}