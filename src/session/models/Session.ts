import { Schema, model, Document, Types } from 'mongoose';
import { ISession } from '../interfaces/ISession';

const sessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  {
    timestamps: true,
  }
);

// Create TTL index for automatic expiration
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Add a pre-save hook to ensure sessionId is set
sessionSchema.pre<ISession>('save', function (next) {
  if (!this.sessionId) {
    this.sessionId = new Types.ObjectId().toHexString();
  }
  next();
});

export const Session = model<ISession & Document>('Session', sessionSchema);
