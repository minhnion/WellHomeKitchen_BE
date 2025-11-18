import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

fileSchema.index(
  { name: 'text', originalName: 'text' }, 
);


const File = mongoose.model("File", fileSchema);

export default File;
