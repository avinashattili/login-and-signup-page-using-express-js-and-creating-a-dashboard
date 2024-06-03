const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const dotenv = require('dotenv');
const axios = require('axios');
dotenv.config();

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'w5H8VbNtF5KzTzrE3gR9U2sW2P7uA6cC',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.redirect('/signup'); 
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRef = db.collection('users').doc(email);
    const doc = await userRef.get();
    if (doc.exists) {
      return res.send('User already exists. Try with another email.');
    }
    const hashedPassword = await bcrypt.hash(password,10);
    await userRef.set({ email, password: hashedPassword });
    res.redirect('/login');
  } catch (error) {
    res.send('Error creating user');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRef = db.collection('users').doc(email);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.send('No such user. Please Signup!!!');
    }
    const userData = doc.data();
    const passwordMatch = await bcrypt.compare(password, userData.password);
    if (!passwordMatch) {
      return res.send('Incorrect password. Please Try again');
    }
    req.session.user = email;
    res.redirect('/dashboard');
  } catch (error) {
    res.send('Error logging in');
  }
});

const requireAuth = (req,res,next)=>{
  if(!req.session.user){
    return res.redirect('/login');
  }
  next();
};

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const city = req.query.city || '';
    const weatherApiKey = '40b5de2fed766ea768724beed5fb3dbd';
    
    let weatherData;
    if (city) {
      const weatherApiUrl = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${weatherApiKey}&units=metric`;
      const weatherResponse = await axios.get(weatherApiUrl);
      weatherData = weatherResponse.data;
    }
    const userEmail = req.session.user;
    res.render('dashboard', { cityName: city, weatherData,userEmail });
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.send('Error fetching weather data');
  }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
