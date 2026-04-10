require('dotenv').config();
const mongoose = require('mongoose');
const { getMongoUri } = require('../lib/get-mongo-uri');
const Admin = require('../models/Admin');

async function createAdmin() {
  try {
    const uri = getMongoUri();
    if (!uri) {
      throw new Error('Set MONGODB_URI or MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST in .env');
    }
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Admin details
    const email = 'admin@kutagjej.com';
    const password = 'admin123';
    const firstName = 'Admin';
    const lastName = 'User';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      console.log('Admin with this email already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('ID:', existingAdmin._id);
      process.exit(0);
    }

    // Create admin
    const admin = new Admin({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: 'admin',
    });

    await admin.save();
    console.log('Admin created successfully!');
    console.log('Email:', admin.email);
    console.log('Password:', password);
    console.log('ID:', admin._id);
    console.log('\nYou can now login with:');
    console.log('Email: admin@kutagjej.com');
    console.log('Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();

