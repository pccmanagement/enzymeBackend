const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const paymentRoute = require("./routes/payments");
const userRoute = require("./routes/user");
const adminRoute = require("./routes/admin");
const testRoutes = require("./routes/test")
const newsBulletinRoutes = require('./routes/newsBulletin');
const subscriptionRoutes = require('./routes/subscription');
const platformFeeRoutes = require('./routes/platformFee');


const bodyParser = require("body-parser");


require('./db');


// Initialize App
const app = express();

// Setting up environment variables
dotenv.config();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Middlewares
app.use(express.json());

// Configure CORS
const corsOptions = {
  origin: '*', // Allow all origins (for development). For production, specify your domains
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Routing
app.use("/api/payment", paymentRoute);
app.use("/api/user", userRoute);
app.use("/api/admin", adminRoute);
app.use('/api/test', testRoutes);
app.use('/api/newsBulletin', newsBulletinRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/platform-fee', platformFeeRoutes);


// Listening App
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Listening on port ${port}`));
