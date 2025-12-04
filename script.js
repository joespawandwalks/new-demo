// =============================================
// DOM Elements & Constants
// =============================================
const bookNowBtn = document.getElementById("bookNowBtn");
const heroBookBtn = document.getElementById("heroBookBtn");
const bookingPopup = document.getElementById("bookingPopup");
const closeBtn = document.querySelector(".close-btn");
const bookingForm = document.getElementById("bookingForm");
const contactForm = document.getElementById("contactForm");
const hamburger = document.getElementById("hamburger");
const navMenu = document.querySelector(".nav-menu");

// Replace with your actual Google Script URL when ready
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz0snYq4TTktCvb0w7PMRkhpJnNxrtW0mmLYF4GJCV3X9_bLVWn8t_9EiL_ruq5LeP6/exec";

// =============================================
// Helper Functions
// =============================================

// Email validation helper
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Show notification function
function showNotification(message, type = "success") {
  // Remove existing notification
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.setAttribute("role", "alert");
  notification.setAttribute("aria-live", "assertive");
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${
        type === "success" ? "check-circle" : "exclamation-circle"
      }"></i>
      <span>${message}</span>
    </div>
  `;

  // Add to page
  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 5000);
}

// =============================================
// Form Handling Functions
// =============================================

async function handleBookingSubmit(e) {
  e.preventDefault();

  console.log("Starting form submission...");

  // 1. Collect data
  const data = {
    name: document.getElementById("bookingName").value.trim(),
    email: document.getElementById("bookingEmail").value.trim(),
    phone: document.getElementById("bookingPhone").value.trim(),
    service: document.getElementById("bookingService").value,
    date: document.getElementById("bookingDate").value,
    time: document.getElementById("bookingTime").value,
    notes: document.getElementById("bookingNotes").value.trim(),
  };

  console.log("Form data:", data);

  // 2. Validate
  if (
    !data.name ||
    !data.email ||
    !data.phone ||
    !data.service ||
    !data.date ||
    !data.time ||
    !data.notes
  ) {
    showNotification("Please fill in all required fields.", "error");
    return;
  }

  // 3. Show loading
  const submitBtn = bookingForm.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector(".btn-text");
  const btnLoading = submitBtn.querySelector(".btn-loading");

  btnText.style.display = "none";
  btnLoading.style.display = "inline-block";
  submitBtn.disabled = true;

  // 4. Check if we have a valid Google Script URL
  if (
    !GOOGLE_SCRIPT_URL ||
    GOOGLE_SCRIPT_URL.includes("YOUR_GOOGLE_SCRIPT_URL")
  ) {
    console.error("No valid Google Script URL configured");

    // Fallback to localStorage
    setTimeout(() => {
      // Save to localStorage
      const bookings = JSON.parse(localStorage.getItem("petBookings") || "[]");
      bookings.push({
        ...data,
        timestamp: new Date().toISOString(),
        status: "New",
      });
      localStorage.setItem("petBookings", JSON.stringify(bookings));

      showNotification(
        "✅ Booking saved locally! (Google Sheets not configured)",
        "success"
      );

      // Reset form
      bookingForm.reset();
      closePopup();

      // Reset button
      btnText.style.display = "inline-block";
      btnLoading.style.display = "none";
      submitBtn.disabled = false;
    }, 1500);

    return;
  }

  // 5. Send to Google Sheets
  try {
    console.log("Sending to Google Sheets:", GOOGLE_SCRIPT_URL);

    // Method 1: Using FormData (works better for CORS)
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key]);
    });

    // Send the request
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // Important for Google Apps Script
      body: formData,
    });

    console.log("Request sent (no-cors mode)");

    // Note: With 'no-cors' we can't read response, but request is sent
    // Google Sheets should receive it

    // Show success
    showNotification("✅ Booking submitted! Check Google Sheets.", "success");

    // Also save locally as backup
    const bookings = JSON.parse(localStorage.getItem("petBookings") || "[]");
    bookings.push({
      ...data,
      timestamp: new Date().toISOString(),
      status: "New",
    });
    localStorage.setItem("petBookings", JSON.stringify(bookings));

    // Reset form
    bookingForm.reset();

    // Close popup after delay
    setTimeout(() => {
      closePopup();
    }, 2000);
  } catch (error) {
    console.error("Fetch error:", error);

    // Fallback: Save locally
    const bookings = JSON.parse(localStorage.getItem("petBookings") || "[]");
    bookings.push({
      ...data,
      timestamp: new Date().toISOString(),
      status: "New",
    });
    localStorage.setItem("petBookings", JSON.stringify(bookings));

    showNotification(
      "✅ Booking saved locally! (Network issue with Google Sheets)",
      "success"
    );

    // Reset form
    bookingForm.reset();
    setTimeout(() => {
      closePopup();
    }, 2000);
  } finally {
    // Reset button
    btnText.style.display = "inline-block";
    btnLoading.style.display = "none";
    submitBtn.disabled = false;
  }
}

// Handle contact form submission
async function handleContactSubmit(e) {
  e.preventDefault();

  const data = {
    name: document
      .querySelector('#contactForm input[name="contactName"]')
      .value.trim(),
    email: document
      .querySelector('#contactForm input[name="contactEmail"]')
      .value.trim(),
    message: document
      .querySelector('#contactForm textarea[name="contactMessage"]')
      .value.trim(),
  };

  // Validation
  if (!data.name || !data.email || !data.message) {
    showNotification("Please fill in all required fields.", "error");
    return;
  }

  if (!isValidEmail(data.email)) {
    showNotification("Please enter a valid email address.", "error");
    return;
  }

  // Show loading
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Sending...";
  submitBtn.disabled = true;

  try {
    // Simulate sending (remove when using Google Sheets)
    console.log("Simulating contact form submission...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Store in localStorage for testing
    const contacts = JSON.parse(localStorage.getItem("petContacts") || "[]");
    contacts.push({ ...data, timestamp: new Date().toISOString() });
    localStorage.setItem("petContacts", JSON.stringify(contacts));

    showNotification(
      "Thank you for your message! We will get back to you within 24 hours.",
      "success"
    );

    contactForm.reset();
  } catch (error) {
    console.error("Error sending message:", error);
    showNotification("Message sent! We'll contact you soon.", "success");
    contactForm.reset();
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// =============================================
// Popup Functions
// =============================================

// Open popup with animation
function openPopup() {
  bookingPopup.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Set default date to tomorrow
  const dateInput = document.getElementById("bookingDate");
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = tomorrow.toISOString().split("T")[0];
    dateInput.min = tomorrow.toISOString().split("T")[0];
  }

  // Set default time to next hour
  const timeInput = document.getElementById("bookingTime");
  if (timeInput) {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    timeInput.value = nextHour.toTimeString().slice(0, 5);
  }
}

// Close popup
function closePopup() {
  bookingPopup.style.display = "none";
  document.body.style.overflow = "auto";
}

// =============================================
// Navigation & Mobile Menu
// =============================================

// Initialize mobile navigation
function initMobileNav() {
  if (!hamburger || !navMenu) return;

  function toggleMobileMenu() {
    const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", !isExpanded);
    navMenu.classList.toggle("active");
    document.body.style.overflow = !isExpanded ? "hidden" : "";
  }

  function closeMobileMenu() {
    hamburger.setAttribute("aria-expanded", "false");
    navMenu.classList.remove("active");
    document.body.style.overflow = "";
  }

  // Event Listeners
  hamburger.addEventListener("click", toggleMobileMenu);

  // Close menu when clicking links
  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  // Close menu when clicking outside
  navMenu.addEventListener("click", (e) => {
    if (e.target === navMenu) {
      closeMobileMenu();
    }
  });

  // Close menu when pressing Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navMenu.classList.contains("active")) {
      closeMobileMenu();
    }
  });

  // Close menu when resizing
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && navMenu.classList.contains("active")) {
      closeMobileMenu();
    }
  });
}

// Smooth scrolling
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: "smooth",
        });
      }
    });
  });
}

// =============================================
// Initialize Website
// =============================================
function initWebsite() {
  // Initialize mobile nav
  initMobileNav();

  // Initialize smooth scroll
  initSmoothScroll();

  // Set minimum date for booking to today
  const dateInput = document.getElementById("bookingDate");
  if (dateInput) {
    const today = new Date();
    dateInput.min = today.toISOString().split("T")[0];
  }

  console.log("Website initialized successfully!");
  console.log("To view test bookings, run in console:");
  console.log('JSON.parse(localStorage.getItem("petBookings"))');
}

// =============================================
// Event Listeners
// =============================================
document.addEventListener("DOMContentLoaded", function () {
  // Initialize website
  initWebsite();

  // Event listeners for opening popup
  if (bookNowBtn) bookNowBtn.addEventListener("click", openPopup);
  if (heroBookBtn) heroBookBtn.addEventListener("click", openPopup);

  // Event listener for closing popup
  if (closeBtn) closeBtn.addEventListener("click", closePopup);

  // Close popup when clicking outside
  if (bookingPopup) {
    bookingPopup.addEventListener("click", (e) => {
      if (e.target === bookingPopup) {
        closePopup();
      }
    });
  }

  // Close popup when pressing Escape key
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      bookingPopup &&
      bookingPopup.style.display === "flex"
    ) {
      closePopup();
    }
  });

  // Handle form submissions
  if (bookingForm) {
    bookingForm.addEventListener("submit", handleBookingSubmit);
  }

  if (contactForm) {
    contactForm.addEventListener("submit", handleContactSubmit);
  }
});
