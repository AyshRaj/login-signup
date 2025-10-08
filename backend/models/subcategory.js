import mongoose from "mongoose";


const SubCategorySchema = new mongoose.Schema({
  sub_id: Number,
  sub_name: String,
  cat_id: Number 
});

const SubCategoryModel = mongoose.model("SUB_COL", SubCategorySchema);

export default SubCategoryModel;