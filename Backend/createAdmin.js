require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('./src/config/db');
const User = require('./src/models/user');

async function createAdmin() {
    try {
        await sequelize.sync();
        
        const email = 'admin@admin.com';
        const password = 'admin123';
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ where: { email } });
        if (existingAdmin) {
            console.log('⚠️  Admin already exists!');
            console.log('Email:', email);
            console.log('Password: admin123');
            process.exit(0);
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await User.create({
            name: 'Admin User',
            email: email,
            password: hashedPassword,
            role: 'admin',
            status: 'approved'
        });
        
        console.log('✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', email);
        console.log('🔒 Password: admin123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createAdmin();