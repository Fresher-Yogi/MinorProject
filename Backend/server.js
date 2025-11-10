// --- COMPLETE & UPDATED CODE for Backend/server.js ---
// This version reflects the new data model based on your SRS.

require('dotenv').config({ path: './src/.env' });
require('./src/utils/notificationService'); 
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const sequelize = require('./src/config/db');

// =================================================================
// ✅ 1. IMPORT ALL MODELS (NEW & EXISTING)
// =================================================================
const User = require('./src/models/user');
const Branch = require('./src/models/Branch');
const Appointment = require('./src/models/Appointment');
const Category = require('./src/models/Category'); // <-- NEW
const Service = require('./src/models/Service');   // <-- NEW


// =================================================================
// ✅ 2. DEFINE ALL MODEL ASSOCIATIONS
// =================================================================

// --- A) NEW ASSOCIATIONS FOR THE REFACTORED SERVICE MODEL ---

// A Category has many Services (e.g., "Healthcare" category has "Cardiology", "Dental" services)
Category.hasMany(Service, { foreignKey: 'categoryId' });
Service.belongsTo(Category, { foreignKey: 'categoryId' });

// A Branch can offer many Services, and a Service can be offered at many Branches.
// This is a Many-to-Many relationship, which requires a "through" table (join table).
// Sequelize will automatically create a 'BranchServices' table for us to manage these links.
Branch.belongsToMany(Service, { through: 'BranchServices' });
Service.belongsToMany(Branch, { through: 'BranchServices' });

// A Service can have many Appointments.
Service.hasMany(Appointment, { foreignKey: 'serviceId' });
Appointment.belongsTo(Service, { foreignKey: 'serviceId' });


// --- B) KEEP EXISTING, STILL-VALID ASSOCIATIONS ---

// A User can have many Appointments.
User.hasMany(Appointment, { foreignKey: 'userId' });
Appointment.belongsTo(User, { foreignKey: 'userId' });

// A Branch can have many Appointments.
Branch.hasMany(Appointment, { foreignKey: 'branchId' });
Appointment.belongsTo(Branch, { foreignKey: 'branchId' });

// A User (if they are an admin) can be associated with one Branch.
// A User (if they are an admin) can be associated with one Branch.
User.hasOne(Branch, { foreignKey: 'adminId' });
Branch.belongsTo(User, { as: 'admin', foreignKey: 'adminId' }); // <-- CORRECTED


// =================================================================
// ✅ 3. INITIALIZE APP, SERVER, AND MIDDLEWARE (No Change Here)
// =================================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Make 'io' globally accessible to all routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Standard Middleware
app.use(cors());
app.use(express.json());


// =================================================================
// ✅ 4. DEFINE AND USE ALL ROUTES
// =================================================================

// --- A) IMPORT EXISTING AND NEW ROUTE FILES ---
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const branchRoutes = require('./src/routes/branchRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes'); // <-- NEW (For managing Categories)
const serviceRoutes = require('./src/routes/serviceRoutes');   // <-- NEW (For managing Services)

// --- B) TELL EXPRESS TO USE THE ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/categories', categoryRoutes); // <-- NEW
app.use('/api/services', serviceRoutes);     // <-- NEW


// =================================================================
// ✅ 5. SOCKET.IO AND SERVER START LOGIC (No Change Here)
// =================================================================
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

// IMPORTANT: For development, use { force: true } ONE TIME to drop old tables
// and create the new schema. Then change it back to { force: false }.
// WARNING: { force: true } WILL DELETE ALL YOUR EXISTING DATA.
sequelize.sync({ force: false })
  .then(() => {
    console.log('✅ Database connected & models synced!');
    server.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
  });