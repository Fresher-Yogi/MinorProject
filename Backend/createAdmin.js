require('dotenv').config({ path: '../../../.env' });
const bcrypt = require('bcryptjs');
const sequelize = require('./src/config/db');
const User = require('./src/models/user');

async function createSuperAdmin() {
    try {
        await sequelize.sync();
        
        const email = 'admin@admin.com.com';
        const password = 'admin123';
        
        const existingAdmin = await User.findOne({ where: { email } });
        if (existingAdmin) {
            console.log('⚠️  Super Admin already exists!');
            console.log('📧 Email:', email);
            console.log('🔒 Password: admin123');
            process.exit(0);
            return;
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await User.create({
            name: 'Super Admin',
            email: email,
            password: hashedPassword,
            role: 'superadmin',
            status: 'approved'
        });
        
        console.log('✅ Super Admin created!');
        console.log('📧 Email:', email);
        console.log('🔒 Password: admin123');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createSuperAdmin();