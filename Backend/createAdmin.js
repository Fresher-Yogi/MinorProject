require('dotenv').config({ path: './src/.env' });
const bcrypt = require('bcryptjs');
const sequelize = require('./src/config/db');
const User = require('./src/models/user');

async function createSuperAdmin() {
    try {
        await sequelize.sync();
        
        const email = 'admin@admin.com';
        const password = 'admin123';
        
        const existingAdmin = await User.findOne({ where: { email } });
        if (existingAdmin) {
            // If user exists, ensure their role is 'superadmin'
            if (existingAdmin.role !== 'superadmin') {
                existingAdmin.role = 'superadmin';
                existingAdmin.status = 'approved';
                await existingAdmin.save();
                console.log(`✅ User ${email} already existed and has been updated to Super Admin.`);
            } else {
                console.log('⚠️  Super Admin user already exists!');
            }
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 Email:', email);
            console.log('🔒 Password: admin123');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            process.exit(0);
            return;
        }
        
        // If user does not exist, create them
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await User.create({
            name: 'Super Admin',
            email: email,
            password: hashedPassword,
            role: 'superadmin', // This is the key change
            status: 'approved'
        });
        
        console.log('✅ Super Admin user created successfully!');
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

createSuperAdmin();