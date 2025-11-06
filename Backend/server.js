// --- FINAL UPDATED CODE for Backend/server.js ---

require('dotenv').config({ path: './src/.env' });
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const sequelize = require('./src/config/db');

// Models and Associations (No Change)
const User = require('./src/models/user');
const Branch = require('./src/models/Branch');
const Appointment = require('./src/models/Appointment');
User.hasMany(Appointment, { foreignKey: 'userId' });
Appointment.belongsTo(User, { foreignKey: 'userId' });
Branch.hasMany(Appointment, { foreignKey: 'branchId' });
Appointment.belongsTo(Branch, { foreignKey: 'branchId' });
// A User (if they are an admin) can be associated with one Branch
User.hasOne(Branch, { foreignKey: 'adminId' });
// A Branch belongs to one Admin User
Branch.belongsTo(User, { as: 'admin', foreignKey: 'adminId' });

// Initialize App and Server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all connections
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// --- ✅ NEW CHANGE: Make 'io' globally accessible to routes ---
// Hum 'io' object ko har request (req) ke saath attach kar denge.
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes (No Change)
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const branchRoutes = require('./src/routes/branchRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/appointments', appointmentRoutes);

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Start Server and DB
const PORT = process.env.PORT || 5000;
sequelize.sync({ force: false })
  .then(() => {
    console.log('✅ Database connected & models synced!');
    server.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
  });