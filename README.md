# expressBookReviews — Online Book Review Application

Node.js and Express REST API using the original starter book data.

## Features
- Retrieve all books and search by ISBN, author or title.
- Retrieve book reviews.
- Register and log in using hashed passwords.
- Session authentication with signed, expiring JWTs.
- Add, modify and delete only the authenticated user's reviews.
- Four Axios methods using async/await or Promise callbacks.
- Verified concurrent public requests.

## Run
cd final_project
npm install
npm start

Default port: 8800.

## Submission
See submission_evidence/SUBMISSION_GUIDE.txt.

## Lab storage
Users, sessions and review changes are stored in memory and reset
when the server restarts. The original booksdb.js remains unchanged.
