require('dotenv').config();
const express = require('express');
const cors = require('cors');// 1. Import the database connection

const app = express();

connectDB();

// --- MIDDLEWARE ---

app.use(cors());


app.use(express.json());


// --- ROUTES ---
//  API endpoints


// A simple test route 
app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users')); 
app.use('/api/groups', require('./routes/groups'));
app.use('/api/channels', require('./routes/channels'));


// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
