# Facial Recognition Banking

A banking prototype where you log in with your face instead of a PIN. The camera checks your face in the browser and, if it matches a registered customer, opens an ATM-style account screen.

> **Demo only.** All customers, balances and faces are made up. Nothing leaves the browser: there is no server and no real bank connection.

## What it does

- **Face login:** detects your face from the webcam and compares it with each registered customer. A match within the distance threshold (0.6) logs you in.
- **Sign up:** registers a new customer from a live capture of your face.
- **ATM screen:** check your balance, withdraw, deposit, transfer and view transaction history, all in Rand.
- **Demo customers:** three built-in accounts with sample balances and transactions.

## How it works

| Part | Tech |
|---|---|
| Face detection and matching | [face-api.js](https://github.com/justadudewhohacks/face-api.js): tiny face detector, 68-point landmarks, 128-number face descriptors |
| App logic | Plain JavaScript (`app.js`) |
| ATM screen | React 18 (`atm.jsx`, compiled in the browser with Babel) |
| Storage | The browser's localStorage, for customers who sign up |

When the page opens it loads the models from `models/` and works out a face descriptor for each demo customer from their photo in `faces/`. At login it takes a descriptor from the webcam and picks the closest customer by Euclidean distance.

## Run it locally

The camera and model files need the page served over `http://localhost`, not opened as a file.

```sh
npx serve .
# or
python -m http.server 8000
```

Open the address it prints, allow camera access, and click **Login with Face** or **Sign Up**.

`tests.html` runs the login and sign-up logic with stand-in face data, no camera needed.

## Project layout

```
index.html     login, sign-up and dashboard views
app.js         face models, matching, login and registration
atm.jsx        React ATM screen
styles.css     styles
face-api.min.js
models/        face-api.js model weights
faces/         photos of the demo customers
tests.html     browser tests
```

## Limits

A webcam match is not secure enough for a real bank. A printed photo or a video can fool it, because there is no liveness check. Registered faces are stored unencrypted in the browser.
