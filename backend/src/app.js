const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const careUserRoutes = require('./routes/careUserRoutes');
const routineRoutes = require('./routes/routineRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const emergencyContactRoutes = require('./routes/emergencyContactRoutes');
const sosRoutes = require('./routes/sosRoutes');
const communicationRoutes = require('./routes/communicationRoutes');
const favouriteRoutes = require('./routes/favouriteRoutes');
const situationRoutes = require('./routes/situationRoutes');
const activityRoutes = require('./routes/activityRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());

const origins = (config.security.corsOrigin || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: origins.length ? origins : true,
  credentials: true,
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/care-users', careUserRoutes);
app.use('/api/v1/routines', routineRoutes);
app.use('/api/v1/medicines', medicineRoutes);
app.use('/api/v1/emergency-contacts', emergencyContactRoutes);
app.use('/api/v1/sos', sosRoutes);
app.use('/api/v1/communication-items', communicationRoutes);
app.use('/api/v1/favourites', favouriteRoutes);
app.use('/api/v1/situations', situationRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/devices', deviceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
