// Mining Constants and Variables
const BASE_MINING_RATE = 10;
let totalMined = 0;
let currentCaptchaCode = '';
let miningPower = parseFloat(localStorage.getItem('miningPower')) || 1.0;

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

// Mining Functions
const updateTotalMined = () => {
    const miningRate = BASE_MINING_RATE * miningPower;
    totalMined += miningRate;
    document.getElementById('mining-rate').textContent = miningRate.toFixed(2);
    document.getElementById('total-mined').textContent = totalMined.toFixed(2) + ' SPI';
};

// Particle Animation
const createParticle = () => {
    const particles = document.getElementById('particles');
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random position within the circle
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 80;
    const x = 100 + radius * Math.cos(angle);
    const y = 100 + radius * Math.sin(angle);
    
    particle.style.left = x + '%';
    particle.style.top = y + '%';
    
    particles.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
    }, 1500);
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

function displayCaptcha() {
    currentCaptchaCode = generateCaptchaCode();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 60;

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    for (let i = 0; i < currentCaptchaCode.length; i++) {
        const x = (canvas.width / 6) * (i + 0.5);
        const y = canvas.height / 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.4);
        ctx.fillText(currentCaptchaCode[i], 0, 0);
        ctx.restore();
    }

    // Clear previous content and add new canvas
    captchaChallenge.innerHTML = '';
    captchaChallenge.appendChild(canvas);
}

function refreshCaptcha() {
    displayCaptcha();
    captchaInput.value = '';
}

function verifyCaptcha() {
    const userInput = captchaInput.value.toUpperCase();
    if (userInput === currentCaptchaCode) {
        closeCaptchaModal();
        // Increase mining power by 0.1
        miningPower += 0.1;
        localStorage.setItem('miningPower', miningPower.toString());
        
        const endTime = new Date().getTime() + (2 * 60 * 60 * 1000); // 2 hours
        activateBoost(endTime);
        localStorage.setItem('boostEndTime', endTime.toString());
        
        // Update display
        miningPowerElement.textContent = miningPower.toFixed(1) + 'x';
    } else {
        alert('Incorrect code. Please try again.');
        refreshCaptcha();
        captchaInput.value = '';
    }
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

    countdownElement.textContent = `Boost ends in: ${hours}h ${minutes}m ${seconds}s`;
    return timeLeft;
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize mining power display
    miningPowerElement.textContent = miningPower.toFixed(1) + 'x';
    
    // Initialize mining rate display
    document.getElementById('mining-rate').textContent = (BASE_MINING_RATE * miningPower).toFixed(2);

    // Initialize mining update interval
    setInterval(updateTotalMined, 60000);

    // Initialize particle creation interval
    setInterval(createParticle, 200);

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