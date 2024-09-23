const cassandra = require('cassandra-driver');
const bcrypt = require('bcrypt'); // For password hashing
const jwt = require("jsonwebtoken");

const client = new cassandra.Client({
  contactPoints: ['localhost'], // Replace with your Cassandra contact points
  localDataCenter: 'datacenter1', // Your data center
  keyspace: 'stock_trading' // Your Cassandra keyspace
});

const SALT_ROUNDS = 10; // Number of rounds for hashing passwords
const JWT_SECRET = 'piyush'; // Use a strong secret key
const JWT_EXPIRES_IN = '1h'; // Token expiration (1 hour)

// Function to handle user signup
exports.signup = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    // Validate input fields
    if (!name || !email || !username || !password) {
      return res.status(400).json({
        status: "Error",
        message: "All fields are required"
      });
    }

    // Check if the username already exists
    const checkQuery = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    const checkParams = [username];
    const checkResult = await client.execute(checkQuery, checkParams, { prepare: true });

    if (checkResult.rowLength > 0) {
      return res.status(400).json({
        status: "Error",
        message: "Username already exists"
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert new user into the users table
    const query = `INSERT INTO users (user_id, name, email, username, password)
                   VALUES (uuid(), ?, ?, ?, ?)`;
    const params = [name, email, username, hashedPassword];

    await client.execute(query, params, { prepare: true });

    // Respond with success
    res.status(201).json({
      status: "Success",
      message: "User created successfully"
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      status: "Error",
      message: "Failed to create user",
      error: error.message
    });
  }
};

// Function to handle user login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if both fields are provided
    if (!username || !password) {
      return res.status(400).json({
        status: "Error",
        message: "Username and password are required"
      });
    }

    // Check if the username exists in the database
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

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "Error",
        message: "Invalid username or password"
      });
    }
    console.log(user)
    console.log(user.user_id)

    // Generate a JWT token
    const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Set the JWT token in an HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 3600000 // 1 hour
    });

    // Respond with success
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
