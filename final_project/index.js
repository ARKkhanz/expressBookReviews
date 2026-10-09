const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { PORT, JWT_SECRET, SESSION_SECRET } = require('./config.js');
const books = require('./router/booksdb.js');
const customer_routes = require('./router/auth_users.js').authenticated;
const genl_routes = require('./router/general.js').general;

const app = express();
app.disable('x-powered-by');
app.set('json spaces', 2);
app.use(express.json({ limit: '16kb' }));

app.use('/customer', session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000,
  },
}));

app.use('/customer/auth', (req, res, next) => {
  const authorization = req.session.authorization;
  if (!authorization) {
    return res.status(401).json({ message: 'Please log in first.' });
  }
  try {
    const decoded = jwt.verify(authorization.accessToken, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    if (decoded.username !== authorization.username) {
      return res.status(401).json({ message: 'Invalid session.' });
    }
    req.user = { username: decoded.username };
    return next();
  } catch {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }
});

// Data routes supply the original book data to the Axios methods.
// They are read-only and do not invoke the public routes recursively.
app.get('/data/books', (req, res) => res.json(books));

app.get('/data/isbn/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  return book
    ? res.json(book)
    : res.status(404).json({ message: 'Book not found.' });
});

function matchingBooks(field, value) {
  return Object.fromEntries(
    Object.entries(books).filter(([, book]) =>
      book[field].toLowerCase() === value.toLowerCase()
    )
  );
}

app.get('/data/author/:author', (req, res) => {
  const matches = matchingBooks('author', req.params.author);
  return Object.keys(matches).length
    ? res.json(matches)
    : res.status(404).json({ message: 'No books found for this author.' });
});

app.get('/data/title/:title', (req, res) => {
  const matches = matchingBooks('title', req.params.title);
  return Object.keys(matches).length
    ? res.json(matches)
    : res.status(404).json({ message: 'No books found for this title.' });
});

app.use('/customer', customer_routes);
app.use('/', genl_routes);

app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON request body.' });
  }
  console.error(error.message);
  return res.status(500).json({ message: 'An internal server error occurred.' });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`Book Review server running on port ${PORT}`)
  );
}

module.exports = app;
