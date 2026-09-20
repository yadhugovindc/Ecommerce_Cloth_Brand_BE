import mongoose from 'mongoose';

export interface Address {
  label: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

const addressSchema = new mongoose.Schema<Address>(
  {
    label: { type: String, default: 'Home' },
    fullName: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

export interface UserDoc extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
  addresses: Address[];
  createdAt: Date;
  updatedAt: Date;
}

export const User = mongoose.model<UserDoc>('User', userSchema);