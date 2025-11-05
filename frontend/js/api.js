const API_URL = 'http://localhost:5000/api';

// Register User
async function registerUser(name, email, password, phone) {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone })
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      return { success: true, data };
    }
    return { success: false, message: data.message };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// Login User
async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      return { success: true, data };
    }
    return { success: false, message: data.message };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// Get Branches
async function getBranches() {
  try {
    const response = await fetch(`${API_URL}/branches`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
}