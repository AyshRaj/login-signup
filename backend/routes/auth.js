import express from "express";
import User from "../models/User.js";
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
      return res.status(200).json({ message: "Email verified successfully" });
    }

    if (!token) {
      return res.status(400).json({ message: "Invalid or expired link" });
    }

    user.verified = true;
    await user.save();
    await token.deleteOne();

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

export default router;
