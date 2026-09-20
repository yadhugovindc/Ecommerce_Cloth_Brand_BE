import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    size: { type: String, default: '' },
    color: { type: String, default: '' },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

export interface CartItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  size: string;
  color: string;
}

export interface CartDoc extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export const Cart = mongoose.model<CartDoc>('Cart', cartSchema);