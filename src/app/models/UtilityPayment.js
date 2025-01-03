import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true }
});

const SubcategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  companies: [CompanySchema] // Embed the companies array using the Company schema
});

const UtilitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  subcategories: [SubcategorySchema] // Embed the subcategories array using the Subcategory schema
});

const Utility = mongoose.model('Utility', UtilitySchema);
export default Utility;
