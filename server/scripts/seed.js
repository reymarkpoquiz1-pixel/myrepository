require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const seedUsers = async () => {
  try {
    await connectDB();
    
    console.log('Seeding database...');
    
    // Clear existing users
    await User.deleteMany({});
    
    // Create demo users
    const users = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@council.gov',
        password: 'admin123',
        role: 'admin',
        isActive: true
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'councilor@council.gov',
        password: 'councilor123',
        role: 'councilor',
        isActive: true
      },
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@council.gov',
        password: 'councilor123',
        role: 'councilor',
        isActive: true
      },
      {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@council.gov',
        password: 'councilor123',
        role: 'councilor',
        isActive: true
      }
    ];
    
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`Created ${user.role}: ${user.email}`);
    }
    
    console.log('Database seeded successfully!');
    console.log('\nDemo Credentials:');
    console.log('Admin: admin@council.gov / admin123');
    console.log('Councilor: councilor@council.gov / councilor123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedUsers();