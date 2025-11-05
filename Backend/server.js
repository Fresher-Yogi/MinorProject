// --- FINAL CORRECTED CODE for Backend/server.js ---

require('dotenv').config({ path: './src/.env' }); // Tell dotenv where to find the .env file
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- FIX #1: Correct path to db.js from outside src ---
const sequelize = require('./src/config/db');

// --- FIX #2: Correct paths to models from outside src ---
const User = require('./src/models/user');
const Branch = require('./src/models/Branch');
const Appointment = require('./src/models/Appointment');

// --- 2. DEFINE MODEL ASSOCIATIONS (No changes here) ---
User.hasMany(Appointment, { foreignKey: 'userId' });
Appointment.belongsTo(User, { foreignKey: 'userId' });
Branch.hasMany(Appointment, { foreignKey: 'branchId' });
Appointment.belongsTo(Branch, { foreignKey: 'branchId' });

// --- 3. INITIALIZE APP AND SERVER ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// --- 4. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- FIX #3: Correct paths to routes from outside src ---
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const branchRoutes = require('./src/routes/branchRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/appointments', appointmentRoutes);

// --- 6. SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
  console.log('✅ A user connected via Socket.IO');
  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

// --- 7. START SERVER AND CONNECT DB ---
const PORT = process.env.PORT || 5000;

sequelize.sync({ force: false })
  .then(() => {
    console.log('✅ Database connected & models synced!');
    server.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
  });