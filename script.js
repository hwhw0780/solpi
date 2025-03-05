// Mining Constants and Variables
const BASE_MINING_RATE = 0.005; // USDT per minute
const MIN_STAKE_AMOUNT = 100000; // Minimum SOLPI required
const RATE_MULTIPLIER = 0.01; // USDT addition per 10M SOLPI staked
const POWER_INCREMENT = 0.025; // Mining power increase per captcha solve (changed from 0.05)

let totalMined = parseFloat(localStorage.getItem('totalMined')) || 0;
let stakedAmount = parseInt(localStorage.getItem('stakedAmount')) || 0;
let currentMiningRate = BASE_MINING_RATE;
let currentCaptchaCode = '';
let miningPower = parseFloat(localStorage.getItem('miningPower')) || 1.0;
let canvas = null;

// DOM Elements
const boostButton = document.getElementById('boostButton');
const captchaModal = document.getElementById('captchaModal');
const miningPowerElement = document.getElementById('mining-power');
const countdownElement = document.getElementById('countdown');
const captchaChallenge = document.getElementById('captchaChallenge');
const captchaInput = document.getElementById('captchaInput');

// Boost State
let boostEndTime = localStorage.getItem('boostEndTime');
let boostActive = false;
let boostDuration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// World Map Data
const countries = [
    // North America
    { name: 'United States', x: 80, y: 100 },
    { name: 'Canada', x: 75, y: 80 },
    { name: 'Mexico', x: 70, y: 120 },
    
    // South America
    { name: 'Brazil', x: 110, y: 160 },
    { name: 'Argentina', x: 100, y: 180 },
    { name: 'Chile', x: 95, y: 175 },
    { name: 'Colombia', x: 90, y: 140 },
    
    // Europe
    { name: 'United Kingdom', x: 120, y: 90 },
    { name: 'France', x: 125, y: 100 },
    { name: 'Germany', x: 130, y: 95 },
    { name: 'Spain', x: 115, y: 105 },
    { name: 'Italy', x: 130, y: 105 },
    { name: 'Poland', x: 135, y: 92 },
    { name: 'Sweden', x: 130, y: 80 },
    
    // Asia
    { name: 'Russia', x: 160, y: 85 },
    { name: 'China', x: 180, y: 110 },
    { name: 'Japan', x: 200, y: 105 },
    { name: 'South Korea', x: 190, y: 108 },
    { name: 'India', x: 165, y: 120 },
    { name: 'Thailand', x: 175, y: 125 },
    { name: 'Vietnam', x: 180, y: 128 },
    { name: 'Indonesia', x: 180, y: 150 },
    
    // Oceania
    { name: 'Australia', x: 190, y: 170 },
    { name: 'New Zealand', x: 205, y: 180 },
    
    // Africa
    { name: 'South Africa', x: 135, y: 170 },
    { name: 'Egypt', x: 140, y: 120 },
    { name: 'Nigeria', x: 125, y: 135 },
    { name: 'Kenya', x: 145, y: 140 },
    { name: 'Morocco', x: 115, y: 115 }
];

const worldNodes = countries.map(country => ({
    x: country.x,
    y: country.y
}));

const captchaSolveMessages = [
    'solved an image recognition captcha',
    'completed a text verification task',
    'verified a street sign captcha',
    'solved a mathematical captcha',
    'completed an audio verification task'
];

// AI Learning Activities
const aiActivities = [
    'Training image recognition',
    'Processing natural language',
    'Analyzing patterns',
    'Learning new data',
    'Optimizing algorithms',
    'Solving complex problems',
    'Improving accuracy',
    'Detecting anomalies',
    'Enhancing security'
];

// Captcha Types
const CAPTCHA_TYPES = {
    TEXT: 'text',
    MATH: 'math'
};

let currentCaptchaType = '';

// Mining Functions
const updateTotalMined = () => {
    const miningRate = BASE_MINING_RATE * miningPower;
    totalMined += miningRate;
    localStorage.setItem('totalMined', totalMined.toString());
    document.getElementById('mining-rate').textContent = (0.005).toFixed(3);
    document.getElementById('actual-mining-rate').textContent = miningRate.toFixed(3);
    document.getElementById('total-mined').textContent = totalMined.toFixed(3) + ' USDT';
};

// Enhanced Particle Animation
const createParticle = (e = null) => {
    const particles = document.querySelector('.mining-particles');
    
    if (e) {
        // Create burst effect on click
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const angle = (i / 8) * Math.PI * 2;
            const velocity = 2;
            const radius = 60;
            
            const startX = e.offsetX;
            const startY = e.offsetY;
            const endX = startX + Math.cos(angle) * radius;
            const endY = startY + Math.sin(angle) * radius;
            
            particle.style.left = `${startX}px`;
            particle.style.top = `${startY}px`;
            particle.style.setProperty('--x', `${(endX - startX) * velocity}px`);
            particle.style.setProperty('--y', `${(endY - startY) * velocity}px`);
            
            particles.appendChild(particle);
            setTimeout(() => particle.remove(), 2000);
        }
    } else if (worldNodes && worldNodes.length > 0) {
        // Create ambient particles
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const startNode = worldNodes[Math.floor(Math.random() * worldNodes.length)];
        const endNode = worldNodes[Math.floor(Math.random() * worldNodes.length)];
        
        particle.style.left = `${startNode.x * 2.4}px`;
        particle.style.top = `${startNode.y * 2.4}px`;
        particle.style.setProperty('--x', `${(endNode.x - startNode.x) * 2.4}px`);
        particle.style.setProperty('--y', `${(endNode.y - startNode.y) * 2.4}px`);
        
        particles.appendChild(particle);
        setTimeout(() => particle.remove(), 2000);
    }
};

// Captcha Functions
function generateCaptchaCode() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function generateMathProblem() {
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2, answer;

    switch (operation) {
        case '+':
            num1 = Math.floor(Math.random() * 50);
            num2 = Math.floor(Math.random() * 50);
            answer = num1 + num2;
            break;
        case '-':
            num1 = Math.floor(Math.random() * 50) + 50; // Ensure positive result
            num2 = Math.floor(Math.random() * num1);
            answer = num1 - num2;
            break;
        case '*':
            num1 = Math.floor(Math.random() * 12);
            num2 = Math.floor(Math.random() * 12);
            answer = num1 * num2;
            break;
    }

    return {
        problem: `${num1} ${operation} ${num2}`,
        answer: answer.toString()
    };
}

function displayCaptcha() {
    // Clear previous canvas if exists
    const existingCanvas = captchaChallenge.querySelector('canvas');
    if (existingCanvas) {
        existingCanvas.remove();
    }

    // Create new canvas
    canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 60;

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Randomly select captcha type
    const types = Object.values(CAPTCHA_TYPES);
    currentCaptchaType = types[Math.floor(Math.random() * types.length)];
    
    captchaChallenge.appendChild(canvas);

    switch (currentCaptchaType) {
        case CAPTCHA_TYPES.TEXT:
            currentCaptchaCode = generateCaptchaCode();
            displayTextCaptcha(ctx, currentCaptchaCode);
            captchaInput.placeholder = 'Enter the code above';
            break;
            
        case CAPTCHA_TYPES.MATH:
            const mathProblem = generateMathProblem();
            currentCaptchaCode = mathProblem.answer;
            displayMathCaptcha(ctx, mathProblem.problem);
            captchaInput.placeholder = 'Enter the answer';
            break;
    }
}

function displayTextCaptcha(ctx, code) {
    // Add noise (dots)
    for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`;
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }

    // Add lines
    for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }

    // Add text
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#00FFA3';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add each character with slight rotation
    for (let i = 0; i < code.length; i++) {
        const x = (canvas.width / 6) * (i + 0.5);
        const y = canvas.height / 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.4);
        ctx.fillText(code[i], 0, 0);
        ctx.restore();
    }
}

function displayMathCaptcha(ctx, problem) {
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#00FFA3';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(problem, canvas.width / 2, canvas.height / 2);
}

function verifyCaptcha() {
    let isCorrect = false;
    
    switch (currentCaptchaType) {
        case CAPTCHA_TYPES.TEXT:
            isCorrect = captchaInput.value.toUpperCase() === currentCaptchaCode;
            break;
            
        case CAPTCHA_TYPES.MATH:
            isCorrect = captchaInput.value === currentCaptchaCode;
            break;
    }

    if (isCorrect) {
        closeCaptchaModal();
        // Permanently increase mining power
        miningPower += POWER_INCREMENT;
        localStorage.setItem('miningPower', miningPower.toString());
        
        // Set new boost duration
        const now = new Date().getTime();
        const newEndTime = now + boostDuration; // Always 2 hours from now
        
        activateBoost(newEndTime);
        localStorage.setItem('boostEndTime', newEndTime.toString());
        
        // Update mining power display with 4 decimal points
        miningPowerElement.textContent = miningPower.toFixed(4) + 'x';
        
        // Update mining rate display to reflect new power
        updateMiningRate();
    } else {
        alert('Incorrect. Please try again.');
        refreshCaptcha();
    }
}

function refreshCaptcha() {
    displayCaptcha();
    captchaInput.value = '';
}

function closeCaptchaModal() {
    captchaModal.style.display = 'none';
    captchaInput.value = '';
}

// Boost Functions
function checkExistingBoost() {
    if (boostEndTime) {
        const now = new Date().getTime();
        if (now < parseInt(boostEndTime)) {
            activateBoost(parseInt(boostEndTime));
        } else {
            localStorage.removeItem('boostEndTime');
            // Don't reset mining power when boost expires
            boostButton.disabled = false;
        }
    }
}

function activateBoost(endTime) {
    boostActive = true;
    boostButton.disabled = true;
    updateCountdown(endTime);

    const countdownInterval = setInterval(() => {
        const remaining = updateCountdown(endTime);
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            enableBoostButton();
        }
    }, 1000);
}

function enableBoostButton() {
    boostActive = false;
    boostButton.disabled = false;
    countdownElement.textContent = '';
    // Don't reset mining power when boost expires
}

function updateCountdown(endTime) {
    const now = new Date().getTime();
    const timeLeft = endTime - now;

    if (timeLeft <= 0) {
        countdownElement.textContent = '';
        return 0;
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    countdownElement.textContent = `Solve again in: ${hours}h ${minutes}m ${seconds}s`;
    return timeLeft;
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// World Map Functions
function createWorldMapAnimation() {
    const miningCircle = document.querySelector('.mining-circle');
    const worldMap = document.createElement('div');
    worldMap.className = 'world-map';
    miningCircle.appendChild(worldMap);

    // Create initial country nodes
    countries.forEach(country => {
        const node = document.createElement('div');
        node.className = 'country-node';
        node.style.left = `${country.x}px`;
        node.style.top = `${country.y}px`;
        worldMap.appendChild(node);
    });

    // Start showing random captcha solve activities
    // Random interval between 5-10 seconds
    setInterval(() => {
        const country = countries[Math.floor(Math.random() * countries.length)];
        const message = captchaSolveMessages[Math.floor(Math.random() * captchaSolveMessages.length)];
        showCaptchaSolveActivity(country, message, worldMap);
    }, Math.floor(Math.random() * 5000) + 5000); // Random interval between 5000-10000ms
}

function showCaptchaSolveActivity(country, message, worldMap) {
    // Create pulse effect
    const pulse = document.createElement('div');
    pulse.className = 'country-pulse';
    pulse.style.left = `${country.x}px`;
    pulse.style.top = `${country.y}px`;
    worldMap.appendChild(pulse);

    // Create connection to center
    const connection = document.createElement('div');
    connection.className = 'country-connection';
    const centerX = 120;
    const centerY = 120;
    const dx = centerX - country.x;
    const dy = centerY - country.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const distance = Math.sqrt(dx * dx + dy * dy);

    connection.style.width = `${distance}px`;
    connection.style.left = `${country.x}px`;
    connection.style.top = `${country.y}px`;
    connection.style.setProperty('--angle', `${angle}deg`);
    worldMap.appendChild(connection);

    // Show activity message
    const indicator = document.createElement('div');
    indicator.className = 'activity-indicator';
    indicator.innerHTML = `<span class="country-name">${country.name}</span><span class="activity-message">${message}</span>`;
    indicator.style.left = `${country.x}px`;
    indicator.style.top = `${country.y}px`;
    worldMap.appendChild(indicator);

    // Clean up elements after animation
    setTimeout(() => {
        pulse.remove();
        connection.remove();
        indicator.remove();
    }, 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize world map animation
    createWorldMapAnimation();
    
    // Initialize mining power display
    miningPowerElement.textContent = miningPower.toFixed(1) + 'x';
    
    // Initialize mining rate display with fixed base rate
    document.getElementById('mining-rate').textContent = (0.005).toFixed(3);
    
    // Initialize actual mining rate display
    const actualRate = BASE_MINING_RATE * miningPower;
    document.getElementById('actual-mining-rate').textContent = actualRate.toFixed(3);
    
    // Initialize mining update interval
    setInterval(updateTotalMined, 60000);
    
    // Create particles less frequently to avoid overwhelming
    setInterval(() => createParticle(), 2000);
    
    // Add click interaction to mining circle
    const miningCircle = document.querySelector('.mining-circle');
    miningCircle.addEventListener('click', (e) => {
        createParticle(e);
        
        // Add temporary pulse effect
        miningCircle.style.transform = 'scale(0.95)';
        setTimeout(() => {
            miningCircle.style.transform = '';
        }, 150);
    });
    
    // Initialize boost status
    checkExistingBoost();

    // Add click handlers
    boostButton.addEventListener('click', () => {
        if (!boostActive) {
            captchaModal.style.display = 'flex';
            displayCaptcha();
        }
    });

    // Modal click outside to close
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Connect wallet button handler
    document.querySelector('.connect-wallet').addEventListener('click', () => {
        alert('Wallet connection feature coming soon!');
    });
});

// Mining update interval
function updateMining() {
    totalMined += currentMiningRate * miningPower;
    localStorage.setItem('totalMined', totalMined.toString());
    updateDisplays();
    
    // Sync with server every minute
    const username = localStorage.getItem('telegramUsername');
    if (username) {
        syncWithServer(username);
    }
}

// Update mining rate based on staked amount
function updateMiningRate() {
    // Display base rate (always 0.005)
    document.getElementById('mining-rate').textContent = (0.005).toFixed(3);
    
    // Calculate and display actual mining rate with multipliers
    const actualRate = BASE_MINING_RATE * miningPower;
    document.getElementById('actual-mining-rate').textContent = actualRate.toFixed(3);
}

// Update all displays
function updateDisplays() {
    document.getElementById('total-mined').textContent = totalMined.toFixed(3) + ' USDT';
    document.getElementById('staked-amount').textContent = stakedAmount.toLocaleString() + ' SOLPI';
    document.getElementById('mining-rate').textContent = (0.005).toFixed(3);
    document.getElementById('mining-power').textContent = miningPower.toFixed(4) + 'x';
    document.getElementById('solpiBalance').textContent = '0 SOLPI';
    document.getElementById('usdtBalance').textContent = totalMined.toFixed(3) + ' USDT';
}

// Calculator Functions
function showCalculator() {
    document.getElementById('calculatorModal').style.display = 'flex';
}

function closeCalculator() {
    document.getElementById('calculatorModal').style.display = 'none';
}

function calculateReturns() {
    const amount = parseInt(document.getElementById('solpiAmount').value);
    if (isNaN(amount) || amount < MIN_STAKE_AMOUNT) {
        alert('Please enter a valid amount (minimum 100,000 SOLPI)');
        return;
    }

    const baseRateAddition = Math.floor(amount / 10000000) * RATE_MULTIPLIER;
    const totalRate = BASE_MINING_RATE + baseRateAddition;
    const dailyRate = totalRate * 60 * 24;

    document.getElementById('baseRateAddition').textContent = 
        baseRateAddition.toFixed(3) + ' USDT';
    document.getElementById('usdtPerMinute').textContent = 
        totalRate.toFixed(3) + ' USDT';
    document.getElementById('usdtPerDay').textContent = 
        dailyRate.toFixed(3) + ' USDT';
}

// Deposit Functions
function showDepositDialog() {
    document.getElementById('depositModal').style.display = 'flex';
}

function closeDepositDialog() {
    document.getElementById('depositModal').style.display = 'none';
}

function confirmDeposit() {
    const amount = parseInt(document.getElementById('depositAmount').value);
    if (isNaN(amount) || amount < MIN_STAKE_AMOUNT) {
        alert('Please enter a valid amount (minimum 100,000 SOLPI)');
        return;
    }

    // Here you would typically interact with the wallet and smart contract
    // For now, we'll just update the UI
    stakedAmount += amount;
    localStorage.setItem('stakedAmount', stakedAmount);
    updateMiningRate();
    updateDisplays();
    closeDepositDialog();
}

// Withdraw Functions
function showWithdrawDialog() {
    document.getElementById('withdrawModal').style.display = 'flex';
}

function closeWithdrawDialog() {
    document.getElementById('withdrawModal').style.display = 'none';
}

function confirmWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    if (isNaN(amount) || amount <= 0 || amount > totalMined) {
        alert('Please enter a valid amount to withdraw');
        return;
    }

    // Here you would typically interact with the wallet and smart contract
    // For now, we'll just update the UI
    totalMined -= amount;
    localStorage.setItem('totalMined', totalMined.toString());
    updateDisplays();
    closeWithdrawDialog();
}

// Function to sync with server
async function syncWithServer(username) {
    try {
        const response = await fetch(`/api/user/${username}/mining`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                totalMined: totalMined
            })
        });
        if (!response.ok) {
            console.error('Error syncing with server');
        }
    } catch (error) {
        console.error('Error syncing with server:', error);
    }
}

// Function to load user data from server
async function loadUserData(username) {
    try {
        const response = await fetch(`/api/user/${username}`);
        if (response.ok) {
            const userData = await response.json();
            totalMined = parseFloat(userData.totalMined) || 0;
            miningPower = parseFloat(userData.miningPower) || 1.0;
            localStorage.setItem('totalMined', totalMined.toString());
            localStorage.setItem('miningPower', miningPower.toString());
            updateDisplays();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Initialize username display immediately
const username = getUrlParameter('u');
if (username) {
    document.querySelector('.username').textContent = username; // Remove @ symbol
    localStorage.setItem('telegramUsername', username);
}

// Initialize mining data
async function initializeMiningData() {
    const username = getUrlParameter('u');
    if (username) {
        document.querySelector('.username').textContent = username; // Remove @ symbol
        localStorage.setItem('telegramUsername', username);
        try {
            await loadUserData(username);
        } catch (error) {
            console.error('Error loading user data:', error);
            totalMined = parseFloat(localStorage.getItem('totalMined')) || 0;
        }
    } else {
        const storedUsername = localStorage.getItem('telegramUsername');
        if (storedUsername) {
            document.querySelector('.username').textContent = storedUsername; // Remove @ symbol
            try {
                await loadUserData(storedUsername);
            } catch (error) {
                console.error('Error loading user data:', error);
                totalMined = parseFloat(localStorage.getItem('totalMined')) || 0;
            }
        } else {
            document.querySelector('.username').textContent = 'Not Connected';
            totalMined = parseFloat(localStorage.getItem('totalMined')) || 0;
        }
    }
    updateDisplays();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize username display again in case the DOM wasn't ready earlier
    const username = getUrlParameter('u');
    if (username) {
        document.querySelector('.username').textContent = username; // Remove @ symbol
    }
    
    initializeMiningData();
    setInterval(updateMining, 60000); // Update mining rewards every minute

    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Connect wallet button handler
    document.querySelector('.connect-wallet').addEventListener('click', () => {
        alert('Wallet connection feature coming soon!');
    });
}); 