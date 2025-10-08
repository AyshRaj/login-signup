import mongoose from "mongoose";


const CategorySchema = new mongoose.Schema({
  cat_id: Number,
  cat_name: String
});



const CategoryModel = mongoose.model("CAT_COL", CategorySchema);



export default CategoryModel;


