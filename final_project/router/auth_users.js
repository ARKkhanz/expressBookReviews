const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const { JWT_SECRET } = require('../config.js');
const books = require('./booksdb.js');

const scrypt = promisify(crypto.scrypt);
const regd_users = express.Router();
const users = [];
const pendingUsers = new Set();

const isValid = username => users.some(user => user.username === username);

async function registerUser(username, password) {
  if (isValid(username) || pendingUsers.has(username)) return false;
  pendingUsers.add(username);
  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await scrypt(password, salt, 64);
    users.push({ username, salt, passwordHash });
    return true;
  } finally {
    pendingUsers.delete(username);
  }
}

async function authenticatedUser(username, password) {
  const user = users.find(candidate => candidate.username === username);
  if (!user) return false;
  const suppliedHash = await scrypt(password, user.salt, 64);
  return crypto.timingSafeEqual(suppliedHash, user.passwordHash);
}

regd_users.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string'
        || !username.trim() || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    if (!(await authenticatedUser(username, password))) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }
    req.session.regenerate(error => {
      if (error) return next(error);
      const accessToken = jwt.sign({ username }, JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '1h',
      });
      req.session.authorization = { accessToken, username };
      req.session.save(saveError => {
        if (saveError) return next(saveError);
        return res.json({ message: 'Successfully logged in.', username });
      });
    });
  } catch (error) {
    next(error);
  }
});

regd_users.put('/auth/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found.' });

  const review = req.query.review;
  if (typeof review !== 'string' || !review.trim()) {
    return res.status(400).json({ message: 'A non-empty review is required.' });
  }

  const username = req.user.username;
  const existed = Object.prototype.hasOwnProperty.call(book.reviews, username);
  book.reviews[username] = review.trim();

  return res.json({
    message: existed ? 'Review successfully modified.' : 'Review successfully added.',
    isbn: req.params.isbn,
    reviews: book.reviews,
  });
});

regd_users.delete('/auth/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found.' });

  const username = req.user.username;
  if (!Object.prototype.hasOwnProperty.call(book.reviews, username)) {
    return res.status(404).json({ message: 'No review by this user was found.' });
  }

  delete book.reviews[username];
  return res.json({
    message: 'Your review was successfully deleted.',
    isbn: req.params.isbn,
    reviews: book.reviews,
  });
});

module.exports = {
  authenticated: regd_users,
  isValid,
  users,
  registerUser,
  authenticatedUser,
};
