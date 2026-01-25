const video = document.getElementById('video');
const loginBtn = document.getElementById('login-btn');
const statusMsg = document.getElementById('status-message');
const cameraOverlay = document.getElementById('camera-overlay');
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const cameraContainer = document.querySelector('.camera-container');
const registerView = document.getElementById('register-view');
const registerBtn = document.getElementById('register-btn');
const regNameInput = document.getElementById('reg-name');
const regStatusMsg = document.getElementById('reg-status-message');
const goToRegisterBtn = document.getElementById('go-to-register-btn');
const backToLoginBtn = document.getElementById('back-to-login-btn');
const regCameraPlaceholder = document.getElementById('register-camera-placeholder');

// Configuration
const THRESHOLD = 0.6;
const MODELS_URI = './models';

// Synthetic User Data
const USERS = [
    {
        id: 'user1',
        name: 'Alex Mercer',
        imagePath: './faces/user1.jpg',
        balance: 'R 18,540.00',
        transactions: [
            { title: 'Woolworths Food', date: 'Today', amount: '- R 450.00' },
            { title: 'Salary Deposit', date: 'Yesterday', amount: '+ R 25,000.00' },
            { title: 'Uber Ride', date: 'Yesterday', amount: '- R 120.00' }
        ],
        descriptor: null
    },
    {
        id: 'user2',
        name: 'Sarah Jenkins',
        imagePath: './faces/user2.jpg',
        balance: 'R 142,800.50',
        transactions: [
            { title: 'Investec Transfer', date: 'Today', amount: '+ R 50,000.00' },
            { title: 'Takealot Order', date: '2 days ago', amount: '- R 1,299.00' },
            { title: 'Virgin Active', date: '3 days ago', amount: '- R 850.00' }
        ],
        descriptor: null
    },
    {
        id: 'user3',
        name: 'Bafana Makua',
        imagePath: './faces/user3.jpg',
        balance: 'R 5,250.00',
        transactions: [
            { title: 'Account Opening Bonus', date: 'Today', amount: '+ R 5,000.00' },
            { title: 'First Deposit', date: 'Today', amount: '+ R 250.00' }
        ],
        descriptor: null
    }
];


// Helper: Convert Float32Array to Array for JSON storage
function serializeDescriptor(descriptor) {
    return Array.from(descriptor);
}

// Helper: Convert Array back to Float32Array
function deserializeDescriptor(array) {
    return new Float32Array(array);
}

// 0. Load Data setup
function loadStoredUsers() {
    const stored = localStorage.getItem('securebank_users');
    if (stored) {
        try {
            const parsedUsers = JSON.parse(stored);
            parsedUsers.forEach(u => {
                // Check if user already exists (by ID) to avoid duplicates if re-merging
                if (!USERS.find(existing => existing.id === u.id)) {
                    u.descriptor = deserializeDescriptor(u.descriptor);
                    USERS.push(u);
                }
            });
            console.log('Loaded users from storage:', USERS.length);
        } catch (e) {
            console.error('Failed to load stored users', e);
        }
    }
}

// 1. Initialization
async function init() {
    try {
        statusMsg.innerText = 'Loading AI models...';

        // Load models
        const modelPromises = [
            faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URI),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URI),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URI)
        ];

        await Promise.all(modelPromises);
        statusMsg.innerText = 'Models loaded. Processing face database...';

        // Load reference faces
        statusMsg.innerText = 'Analyzing face database...';
        await loadReferenceFaces();

        // Load stored users
        loadStoredUsers();

        statusMsg.innerText = 'Starting camera...';
        await startCamera();

        statusMsg.innerText = 'Ready. Position face in frame.';
        loginBtn.disabled = false;
        registerBtn.disabled = false;

        loginBtn.addEventListener('click', attemptLogin);

        // Event Listeners for Registration
        goToRegisterBtn.addEventListener('click', showRegisterView);
        backToLoginBtn.addEventListener('click', showLoginView);
        registerBtn.addEventListener('click', attemptRegistration);

    } catch (err) {
        console.error('Initialization error:', err);
        statusMsg.innerText = 'Error initializing: ' + err.message;
        statusMsg.style.color = 'var(--danger)';
    }
}

// 2. Load Reference Faces
async function loadReferenceFaces() {
    const promises = USERS.map(async (user) => {
        try {
            const img = await faceapi.fetchImage(user.imagePath);
            const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                user.descriptor = detections.descriptor;
                console.log(`Loaded descriptor for ${user.name}`);
            } else {
                console.warn(`No face detected in ${user.imagePath}`);
            }
        } catch (err) {
            console.error(`Failed to load ${user.imagePath}:`, err);
        }
    });

    await Promise.all(promises);
}

// 3. Camera Setup
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;

        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });
    } catch (err) {
        statusMsg.innerText = 'Camera permission denied or unavailable.';
        statusMsg.style.color = 'var(--danger)';
        throw err;
    }
}

// 4. Login Logic
async function attemptLogin() {
    if (video.paused || video.ended) return;

    statusMsg.innerText = 'Scanning...';
    loginBtn.disabled = true;
    cameraContainer.classList.add('scanning');
    cameraContainer.classList.remove('success', 'error');

    // Artificial delay for "scanning" feel
    await new Promise(r => setTimeout(r, 800));

    try {
        // Detect face
        // Use TinyFaceDetectorOptions for better performance/compatibility
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            handleLoginFail('No face detected. Please look at the camera.');
            return;
        }

        // Match against database
        const match = findBestMatch(detection.descriptor);

        if (match) {
            handleLoginSuccess(match);
        } else {
            handleLoginFail('Face not recognized. Access denied.');
        }

    } catch (err) {
        console.error('Login error:', err);
        handleLoginFail('Processing error. Try again.');
    }
}

function findBestMatch(queryDescriptor) {
    let bestMatch = null;
    let minDistance = 1.0;

    for (const user of USERS) {
        if (!user.descriptor) continue;

        const distance = faceapi.euclideanDistance(queryDescriptor, user.descriptor);
        console.log(`Distance to ${user.name}: ${distance}`);

        if (distance < THRESHOLD && distance < minDistance) {
            minDistance = distance;
            bestMatch = user;
        }
    }

    return bestMatch;
}

function handleLoginSuccess(user) {
    statusMsg.innerText = `Verified: ${user.name}`;
    statusMsg.style.color = 'var(--success)';
    cameraContainer.classList.remove('scanning');
    cameraContainer.classList.add('success');

    setTimeout(() => {
        showDashboard(user);
    }, 1000);
}

function handleLoginFail(message) {
    statusMsg.innerText = message;
    statusMsg.style.color = 'var(--danger)';
    cameraContainer.classList.remove('scanning');
    cameraContainer.classList.add('error');
    loginBtn.disabled = false;

    setTimeout(() => {
        cameraContainer.classList.remove('error');
    }, 2000);
}

// 5. Registration Logic (New)
async function registerGuest() {
    if (video.paused || video.ended) return;

    statusMsg.innerText = 'Capturing guest face...';
    registerBtn.disabled = true;
    loginBtn.disabled = true;

    try {
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            handleLoginFail('No face detected. Try again.');
            registerBtn.disabled = false;
            return;
        }

        // Add to USERS
        USERS.push({
            id: 'guest-' + Date.now(),
            name: 'Guest User',
            imagePath: '', // No stored image needed for guest runtime
            balance: 'R 0.00',
            transactions: [],
            descriptor: detection.descriptor
        });

        statusMsg.innerText = 'Guest Registered! Login to continue.';
        statusMsg.style.color = 'var(--success)';

        // Re-enable buttons
        setTimeout(() => {
            statusMsg.innerText = 'Ready. Position face in frame.';
            statusMsg.style.color = 'var(--text-muted)';
            registerBtn.disabled = false;
            loginBtn.disabled = false;
        }, 2000);

    } catch (err) {
        console.error('Registration error:', err);
        handleLoginFail('Error registering. Try again.');
        registerBtn.disabled = false;
    }
}

// 6. Dashboard Logic
function showDashboard(user) {
    // Switch views
    loginView.classList.replace('active', 'hidden');
    dashboardView.classList.replace('hidden', 'active');

    // Mount React ATM
    if (window.mountATM) {
        window.mountATM(user);
    } else {
        console.error("ATM Interface (atm.jsx) not loaded.");
    }
}

// 7. View Toggle Functions
function showRegisterView() {
    loginView.classList.replace('active', 'hidden');
    registerView.classList.replace('hidden', 'active');
    regStatusMsg.innerText = 'Position face to register';
}

function showLoginView() {
    registerView.classList.replace('active', 'hidden');
    loginView.classList.replace('hidden', 'active');
    statusMsg.innerText = 'Ready. Position face in frame.';
    statusMsg.style.color = 'var(--text-muted)';
}

// 8. Registration Logic
async function attemptRegistration() {
    if (video.paused || video.ended) return;

    const name = regNameInput.value.trim();
    if (!name) {
        regStatusMsg.innerText = 'Please enter your name first.';
        regStatusMsg.style.color = 'var(--danger)';
        return;
    }

    regStatusMsg.innerText = 'Capturing face...';
    registerBtn.disabled = true;

    try {
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            regStatusMsg.innerText = 'No face detected. Try again.';
            regStatusMsg.style.color = 'var(--danger)';
            registerBtn.disabled = false;
            return;
        }

        // Add new user
        const newUser = {
            id: 'user-' + Date.now(),
            name: name,
            imagePath: '',
            balance: 'R 1,000.00',
            transactions: [{ title: 'Welcome Bonus', date: 'Today', amount: '+ R 1,000.00' }],
            descriptor: detection.descriptor
        };

        USERS.push(newUser);

        // Save to localStorage
        const storedUsers = JSON.parse(localStorage.getItem('securebank_users') || '[]');
        storedUsers.push({
            ...newUser,
            descriptor: serializeDescriptor(newUser.descriptor)
        });
        localStorage.setItem('securebank_users', JSON.stringify(storedUsers));

        regStatusMsg.innerText = `Welcome, ${name}! You can now login.`;
        regStatusMsg.style.color = 'var(--success)';

        setTimeout(() => {
            showLoginView();
            regNameInput.value = '';
            registerBtn.disabled = false;
        }, 2000);

    } catch (err) {
        console.error('Registration error:', err);
        regStatusMsg.innerText = 'Error registering. Try again.';
        regStatusMsg.style.color = 'var(--danger)';
        registerBtn.disabled = false;
    }
}

// Logout handler removed - logout is now handled by React ATM via page reload

// Start
// Only run init if not in test mode
if (typeof window.IS_TEST_ENV === 'undefined') {
    init();
}
