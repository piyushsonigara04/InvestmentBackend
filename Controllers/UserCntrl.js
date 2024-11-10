const cassandra = require('cassandra-driver');
const bcrypt = require('bcrypt'); 
const jwt = require("jsonwebtoken");

const client = new cassandra.Client({
  contactPoints: ['localhost'], 
  localDataCenter: 'datacenter1', 
  keyspace: 'stock_trading' 
});

const SALT_ROUNDS = 10; 
const JWT_SECRET = 'piyush'; 
const JWT_EXPIRES_IN = '1h'; 

exports.signup = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({
        status: "Error",
        message: "All fields are required"
      });
    }

    const checkQuery = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    const checkParams = [username];
    const checkResult = await client.execute(checkQuery, checkParams, { prepare: true });

    if (checkResult.rowLength > 0) {
      return res.status(400).json({
        status: "Error",
        message: "Username already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const query = `INSERT INTO users (user_id, name, email, username, password)
                   VALUES (uuid(), ?, ?, ?, ?)`;
    const params = [name, email, username, hashedPassword];

    await client.execute(query, params, { prepare: true });

    res.status(201).json({
      status: "Success",
      message: "User created successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Failed to create user",
      error: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: "Error",
        message: "Username and password are required"
      });
    }

    const query = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    const params = [username];
    const result = await client.execute(query, params, { prepare: true });

    if (result.rowLength === 0) {
      return res.status(401).json({
        status: "Error",
        message: "Invalid username or password"
      });
    }

    const user = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "Error",
        message: "Invalid username or password"
      });
    }
    console.log(user)
    console.log(user.user_id)

    const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 3600000 
    });

    res.status(200).json({
      status: "Success",
      message: "Login successful"
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Login failed",
      error: error.message
    });
  }
};

exports.logout = (req, res) => {
  try {
    res.clearCookie('token');

    res.status(200).json({
      status: "Success",
      message: "Logout successful"
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Logout failed",
      error: error.message
    });
  }
};
