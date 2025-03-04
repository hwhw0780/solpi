// Mining Constants and Variables
const MINING_RATE = 10;
let totalMined = 0;

// DOM Elements
const boostButton = document.getElementById('boostButton');
const captchaModal = document.getElementById('captchaModal');
const miningPowerElement = document.getElementById('mining-power');
const countdownElement = document.getElementById('countdown');

// Boost State
let boostEndTime = localStorage.getItem('boostEndTime');
let boostActive = false;

// Mining Functions
const updateTotalMined = () => {
    totalMined += MINING_RATE;
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
    miningPowerElement.textContent = '1.1x';
    updateCountdown(endTime);

    const countdownInterval = setInterval(() => {
        const remaining = updateCountdown(endTime);
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            deactivateBoost();
        }
    }, 1000);
}

function deactivateBoost() {
    boostActive = false;
    boostButton.disabled = false;
    miningPowerElement.textContent = '1x';
    countdownElement.textContent = '';
    localStorage.removeItem('boostEndTime');
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

function closeCaptchaModal() {
    captchaModal.style.display = 'none';
    grecaptcha.reset();
}

async function onCaptchaSuccess(token) {
    try {
        // In a production environment, you would verify the token with your server
        // using the secret key: 6LcgFekqAAAAAC8yYr5VDdoy0SSHEIHTABo7rKJ5
        // For now, we'll proceed with the boost
        closeCaptchaModal();
        const endTime = new Date().getTime() + (2 * 60 * 60 * 1000); // 2 hours
        activateBoost(endTime);
        localStorage.setItem('boostEndTime', endTime.toString());
    } catch (error) {
        console.error('Error verifying captcha:', error);
        alert('Failed to verify captcha. Please try again.');
        grecaptcha.reset();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
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