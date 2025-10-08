import express from "express";
import User from "../models/User.js";
import  CategoryModel from "../models/category.js";
import SubCategoryModel from "../models/subcategory.js";
import Token from "../models/Token.js";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

// REGISTER
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: "Please fill all fields" });

  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ username, email, password });

    // create verification token
    const token = await new Token({
      userId: user._id,
      token: crypto.randomBytes(32).toString("hex"),
    }).save();

    // send verification email
    const url = `http://localhost:5173/verify/${user._id}/${token.token}`;
    await sendEmail(
      user.email,
      "Verify Email",
      `Click this link to verify your email: ${url}`
    );

    res.status(201).json({
      message:
        "Registration successful, please check your email to verify your account",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/verify/:id/:token", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(400).json({ message: "Invalid link" });

    let token = await Token.findOne({
      userId: user._id,
      token: req.params.token,
    });

    if (!token && user.verified) {
      console.log(`✅ User already verified: ${user.email}`);
      return res.status(200).json({ message: "Email already verified" });
    }

    if (!token) {
      return res.status(400).json({ message: "Invalid or expired link" });
    }

    user.verified = true;
    console.log(` Verifying user: ${user.email}`); // <-- Added this line
    await user.save();
    await token.deleteOne();

    console.log(` User verified successfully: ${user.email}`); // <-- Added this line

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Please fill all fields" });

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });

    if (!user.verified)
      return res
        .status(401)
        .json({ message: "Please verify your email before login" });

    const token = generateToken(user._id);
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET ME
router.get("/me", protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    verified: req.user.verified,
  });
});

// FORGOT PASSWORD - SEND RESET EMAIL
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    let token = await Token.findOne({ userId: user._id });
    if (token) await token.deleteOne(); // remove existing

    token = await new Token({
      userId: user._id,
      token: crypto.randomBytes(32).toString("hex"),
    }).save();

    const resetUrl = `http://localhost:5173/reset-password/${user._id}/${token.token}`;
    await sendEmail(
      user.email,
      "Reset Password",
      `Click here to reset your password: ${resetUrl}`
    );

    res.status(200).json({ message: "Password reset link sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// Add this route in your existing `auth.js` file

router.post("/reset-password/:id/:token", async (req, res) => {
  const { password } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(400).json({ message: "Invalid link or user" });

    const token = await Token.findOne({
      userId: user._id,
      token: req.params.token,
    });

    if (!token) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = password;
    user.markModified("password"); // ✅ Force pre-save hook to trigger
    await user.save();
    await token.deleteOne();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



// Create 
router.post("/post", async (req, res) => {
  try {
    const data = new CategoryModel({
      cat_id: req.body.cat_id,
      cat_name: req.body.cat_name
    });

    const saved = await data.save();
    res.json({ message: " Category saved successfully", saved });
  } catch (err) {
    res.status(500).json({ message: " Error saving category", error: err });
  }
});

// Fetch 
router.get("/fetchall", async (req, res) => {
  try {
    const all = await CategoryModel.find();
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: " Error fetching categories" });
  }
});

// Fetch Single Category
router.get("/fetch/:cat_id", async (req, res) => {
  try {
    const record = await CategoryModel.findOne({ cat_id: req.params.cat_id });
    if (!record) return res.status(404).json({ message: "Category not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: " Fetch error" });
  }
});

// Update 
router.put("/update/:cat_id", async (req, res) => {
  try {
    const updated = await CategoryModel.findOneAndUpdate(
      { cat_id: req.params.cat_id },
      { $set: { cat_name: req.body.cat_name } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Category not found" });
    res.json({ message: " Category updated", updated });
  } catch (err) {
    res.status(500).json({ message: " Update error" });
  }
});

// Delete 
router.delete("/del/:cat_id", async (req, res) => {
  try {
    const deleted = await CategoryModel.findOneAndDelete({ cat_id: req.params.cat_id });
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    res.json({ message: " Category deleted", deleted });
  } catch (err) {
    res.status(500).json({ message: " Delete error" });
  }
});

router.post("/sub-post", async (req, res) => {
  try {
    const data = new SubCategoryModel({
      sub_id: req.body.sub_id,
      sub_name: req.body.sub_name,
      cat_id: req.body.cat_id 
    });

    const saved = await data.save();
    res.json({ message: " Subcategory saved successfully", saved });
  } catch (err) {
    res.status(500).json({ message: " Error saving subcategory", error: err });
  }
});

router.get("/sub-fetchall", async (req, res) => {
  try {
    const all = await SubCategoryModel.find();
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: " Error fetching subcategories" });
  }
});

// Fetch Single Subcategory
router.get("/sub-fetch/:sub_id", async (req, res) => {
  try {
    const record = await SubCategoryModel.findOne({ sub_id: req.params.sub_id });
    if (!record) return res.status(404).json({ message: "Subcategory not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: " Fetch error" });
  }
});

// Update Subcategory
router.put("/sub-update/:sub_id", async (req, res) => {
  try {
    const updated = await SubCategoryModel.findOneAndUpdate(
      { sub_id: req.params.sub_id },
      { $set: { sub_name: req.body.sub_name, cat_id: req.body.cat_id } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Subcategory not found" });
    res.json({ message: " Subcategory updated", updated });
  } catch (err) {
    res.status(500).json({ message: " Update error" });
  }
});

// Delete Subcategory
router.delete("/sub-del/:sub_id", async (req, res) => {
  try {
    const deleted = await SubCategoryModel.findOneAndDelete({ sub_id: req.params.sub_id });
    if (!deleted) return res.status(404).json({ message: "Subcategory not found" });
    res.json({ message: " Subcategory deleted", deleted });
  } catch (err) {
    res.status(500).json({ message: " Delete error" });
  }
});

// join 
router.get("/join/:cat_id", async (req, res) => {
  try {
    const catId = parseInt(req.params.cat_id);

    const data = await SubCategoryModel.aggregate([
      { $match: { cat_id: catId } },
      {
        $lookup: {
          from: "cat_cols",
          localField: "cat_id",
          foreignField: "cat_id",
          as: "cat"
        }
      },
      { $unwind: "$cat" },
      {
        $project: {
          _id: 0,
          cat_id: 1,
          cat_name: "$cat.cat_name",
          sub_id: 1,
          sub_name: 1
        }
      }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Join error", error: err });
  }
});

export default router;
