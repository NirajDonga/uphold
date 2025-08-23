import mongoose, { Schema } from "mongoose";

const AccountSchema = new Schema(
  {
    userId: { type: String, required: true, index: true, unique: true },
    balancePaise: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Account || mongoose.model("Account", AccountSchema);


