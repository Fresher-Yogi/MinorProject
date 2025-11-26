// --- COMPLETE & UPDATED CODE for Backend/server.js ---
// THIS IS THE FINAL PRODUCTION VERSION (runs reminder job at 9 AM daily)
require('dotenv').config();

require('./Backend/src/utils/notificationService'); 
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const sequelize = require('./Backend/src/config/db');
const cron = require('node-cron');
const { sendAppointmentReminders } = require('./Backend/src/utils/reminderJob'); 

// =================================================================
// 1. IMPORT ALL MODELS 
// =================================================================
const User = require('./Backend/src/models/user');
const Branch = require('./Backend/src/models/Branch');
const Appointment = require('./Backend/src/models/Appointment');
const Category = require('./Backend/src/models/Category');
const Service = require('./Backend/src/models/Service');


// =================================================================
// 2. DEFINE ALL MODEL ASSOCIATIONS
// =================================================================
Category.hasMany(Service, { foreignKey: 'categoryId' });
Service.belongsTo(Category, { foreignKey: 'categoryId' });

Branch.belongsToMany(Service, { through: 'BranchServices' });
Service.belongsToMany(Branch, { through: 'BranchServices' });

Service.hasMany(Appointment, { foreignKey: 'serviceId' });
Appointment.belongsTo(Service, { foreignKey: 'serviceId' });

User.hasMany(Appointment, { foreignKey: 'userId' });
Appointment.belongsTo(User, { foreignKey: 'userId' });

Branch.hasMany(Appointment, { foreignKey: 'branchId' });
Appointment.belongsTo(Branch, { foreignKey: 'branchId' });

User.hasOne(Branch, { foreignKey: 'adminId' });
Branch.belongsTo(User, { as: 'admin', foreignKey: 'adminId' }); 


// =================================================================
// 3. INITIALIZE APP, SERVER, AND MIDDLEWARE
// =================================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use(cors());
app.use(express.json());


// =================================================================
// 4. DEFINE AND USE ALL ROUTES
// =================================================================
const authRoutes = require('./Backend/src/routes/authRoutes');
const userRoutes = require('./Backend/src/routes/userRoutes');
const branchRoutes = require('./Backend/src/routes/branchRoutes');
const appointmentRoutes = require('./Backend/src/routes/appointmentRoutes');
const categoryRoutes = require('./Backend/src/routes/categoryRoutes');
const serviceRoutes = require('./Backend/src/routes/serviceRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services', serviceRoutes);


// =================================================================
// 5. SOCKET.IO AND SERVER START LOGIC
// =================================================================
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database connected & models synced!');
    server.listen(PORT, () => console.log(`🚀 Server is running on port http://localhost:${PORT}`));

    // =================================================================
    // ✅ SCHEDULE THE REMINDER JOB
    // =================================================================
    
    // This cron job will run every day at 9:00 AM server time.
    cron.schedule('0 9 * * *', () => {
        sendAppointmentReminders();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata" // Set your server's timezone
    });

    console.log('⏰ Appointment reminder job scheduled to run every day at 9:00 AM.');

    // The testing job is now commented out.
    // cron.schedule('* * * * *', () => {
    //   console.log('--- Running Test Reminder Job (Every Minute) ---');
    //   sendAppointmentReminders();
    // });

  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
  });