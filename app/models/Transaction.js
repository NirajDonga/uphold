import mongoose, { Schema } from "mongoose";

const TransactionSchema = new Schema(
  {
    type: { type: String, enum: ["topup", "transfer", "withdraw"], required: true },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    fromUserId: { type: String },
    toUserId: { type: String },
    status: { type: String, enum: ["pending", "success", "failed", "processed"], default: "success" },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);


