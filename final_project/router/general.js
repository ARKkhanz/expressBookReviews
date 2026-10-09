const express = require('express');
const axios = require('axios');
const books = require('./booksdb.js');
const { registerUser } = require('./auth_users.js');
const { PORT } = require('../config.js');

const public_users = express.Router();


// Retrieve the original book data asynchronously through Axios.
// The data endpoint is read-only and cannot recurse into these public routes.
const dataURL = `http://127.0.0.1:${PORT}/data/books`;

// Task 10: Async/await retrieves the complete book catalogue.
async function getAllBooks() {
  const response = await axios.get(dataURL, { proxy: false, timeout: 5000 });
  return response.data;
}

// Task 11: A Promise callback selects the requested ISBN.
function getBooksByISBN(isbn) {
  return axios.get(dataURL, { proxy: false, timeout: 5000 })
    .then(response => {
      const book = response.data[isbn];
      if (!book) {
        throw { response: { status: 404, data: { message: 'Book not found.' } } };
      }
      return book;
    });
}

// Task 12: Async/await retrieves and filters books by author.
// Keep ISBN keys so multiple books by the same author are returned.
async function getBooksByAuthor(author) {
  const response = await axios.get(dataURL, { proxy: false, timeout: 5000 });
  const matches = Object.fromEntries(
    Object.entries(response.data).filter(([, book]) =>
      book.author.toLowerCase() === author.toLowerCase()
    )
  );
  if (!Object.keys(matches).length) {
    throw { response: { status: 404, data: { message: 'No books found for this author.' } } };
  }
  return matches;
}

// Task 13: Async/await retrieves and filters books by title.
async function getBooksByTitle(title) {
  const response = await axios.get(dataURL, { proxy: false, timeout: 5000 });
  const matches = Object.fromEntries(
    Object.entries(response.data).filter(([, book]) =>
      book.title.toLowerCase() === title.toLowerCase()
    )
  );
  if (!Object.keys(matches).length) {
    throw { response: { status: 404, data: { message: 'No books found for this title.' } } };
  }
  return matches;
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
