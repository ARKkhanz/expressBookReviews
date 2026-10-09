const express = require('express');
const axios = require('axios');
const books = require('./booksdb.js');
const { registerUser } = require('./auth_users.js');
const { PORT } = require('../config.js');

const public_users = express.Router();
const client = axios.create({
  baseURL: `http://127.0.0.1:${PORT}/data`,
  timeout: 5000,
  proxy: false,
});

// Task 10: Retrieve all books using async/await with Axios.
async function getAllBooks() {
  const response = await client.get('/books');
  return response.data;
}

// Task 11: Retrieve a book by ISBN using a Promise callback with Axios.
function getBooksByISBN(isbn) {
  return client.get(`/isbn/${encodeURIComponent(isbn)}`)
    .then(response => response.data);
}

// Task 12: Retrieve books by author using async/await with Axios.
async function getBooksByAuthor(author) {
  const response = await client.get(`/author/${encodeURIComponent(author)}`);
  return response.data;
}

// Task 13: Retrieve books by title using async/await with Axios.
async function getBooksByTitle(title) {
  const response = await client.get(`/title/${encodeURIComponent(title)}`);
  return response.data;
}

function handleRequestError(error, res, next) {
  if (error.response) {
    return res.status(error.response.status).json(error.response.data);
  }
  return next(error);
}

public_users.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string'
        || !username.trim() || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    if (username.length > 100 || password.length > 200
        || ['__proto__', 'constructor', 'prototype'].includes(username)) {
      return res.status(400).json({ message: 'Invalid registration details.' });
    }
    const created = await registerUser(username, password);
    if (!created) {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    return res.status(201).json({
      message: 'User successfully registered.',
      username,
    });
  } catch (error) {
    next(error);
  }
});

public_users.get('/', async (req, res, next) => {
  try {
    return res.json(await getAllBooks());
  } catch (error) {
    return handleRequestError(error, res, next);
  }
});

public_users.get('/isbn/:isbn', async (req, res, next) => {
  try {
    return res.json(await getBooksByISBN(req.params.isbn));
  } catch (error) {
    return handleRequestError(error, res, next);
  }
});

public_users.get('/author/:author', async (req, res, next) => {
  try {
    return res.json(await getBooksByAuthor(req.params.author));
  } catch (error) {
    return handleRequestError(error, res, next);
  }
});

public_users.get('/title/:title', async (req, res, next) => {
  try {
    return res.json(await getBooksByTitle(req.params.title));
  } catch (error) {
    return handleRequestError(error, res, next);
  }
});

public_users.get('/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  if (!Object.keys(book.reviews).length) {
    return res.json({ message: 'No reviews found for this book.' });
  }
  return res.json(book.reviews);
});

module.exports = {
  general: public_users,
  getAllBooks,
  getBooksByISBN,
  getBooksByAuthor,
  getBooksByTitle,
};
