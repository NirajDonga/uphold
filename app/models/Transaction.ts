import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
    type: "topup" | "transfer" | "withdraw";
    amountPaise: number;
    currency: string;
    fromUserId?: any; // Using any to allow both string ID and populated User object
    toUserId?: any; // Using any to allow both string ID and populated User object
    status: "pending" | "success" | "failed" | "processed";
    meta?: {
        message?: string;
        [key: string]: any;
    };
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    type: { type: String, enum: ["topup", "transfer", "withdraw"], required: true },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ["pending", "success", "failed", "processed"], default: "success" },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default (mongoose.models.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>("Transaction", TransactionSchema);
