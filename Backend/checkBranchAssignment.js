// Backend/checkBranchAssignments.js
// Run this script to diagnose branch assignment issues

require('dotenv').config({ path: './.env' });
const sequelize = require('./src/config/db');
const Branch = require('./src/models/Branch');
const User = require('./src/models/user');

async function checkAssignments() {
    try {
        await sequelize.sync();
        
        console.log('\n📋 Checking Branch Assignments...\n');
        
        // Get all admins
        const admins = await User.findAll({ where: { role: 'admin', status: 'approved' } });
        console.log(`Found ${admins.length} approved admin(s):\n`);
        
        for (const admin of admins) {
            console.log(`Admin: ${admin.name} (ID: ${admin.id}, Type: ${typeof admin.id})`);
            
            // Check if they have a branch
            const branch = await Branch.findOne({ where: { adminId: admin.id } });
            
            if (branch) {
                console.log(`  ✅ Assigned to: ${branch.name} (Branch ID: ${branch.id})`);
                console.log(`     AdminId in Branch: ${branch.adminId} (Type: ${typeof branch.adminId})`);
            } else {
                console.log(`  ❌ NOT ASSIGNED to any branch`);
            }
            console.log('');
        }
        
        // Show all branches
        const branches = await Branch.findAll();
        console.log(`\n🏢 All Branches (${branches.length}):\n`);
        
        for (const branch of branches) {
            console.log(`Branch: ${branch.name} (ID: ${branch.id})`);
            console.log(`  AdminId: ${branch.adminId} (Type: ${typeof branch.adminId})`);
            
            if (branch.adminId) {
                const assignedAdmin = await User.findByPk(branch.adminId);
                if (assignedAdmin) {
                    console.log(`  ✅ Assigned to: ${assignedAdmin.name} (${assignedAdmin.email})`);
                } else {
                    console.log(`  ⚠️  WARNING: AdminId ${branch.adminId} does not match any user!`);
                }
            } else {
                console.log(`  ⚠️  No admin assigned`);
            }
            console.log('');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAssignments();