// src/services/api.js

// Configuration
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment 
    ? '/api'  // Use proxy in development
    : import.meta.env.VITE_API_URL || 'https://bankyyy.onrender.com/api';  // Use env variable or fallback

// Add a global logout handler (to be set by AuthContext)
let globalLogoutHandler = null;

export function setApiLogoutHandler(logoutFn) {
    globalLogoutHandler = logoutFn;
}

// API Service Object
const api = {
    // Central request helper function (cleaned up)
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = localStorage.getItem('authToken');

        // console.log(`API Request: ${options.method || 'GET'} ${url}`); // Keep basic log
        if (options.body) {
            // console.log('Request Body:', options.body);
        }

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // console.log('Request Headers:', headers);

        try {
            const response = await fetch(url, { 
                ...options, 
                headers,
                credentials: 'include',
                mode: 'cors'
            });

            // console.log('Response Status:', response.status);
            // console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

            if (response.status === 204) {
                // console.log(`API Request Success: ${options.method || 'GET'} ${url} (Status: 204 No Content)`);
                return null;
            }

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                 try {
                    data = await response.json();
                    // console.log('Response Data:', data);
                 } catch (jsonError) {
                    // console.error('API JSON Parse Error:', jsonError, 'Status:', response.status, 'URL:', url);
                    const parseError = new Error('Failed to parse server JSON response.');
                    parseError.status = response.status;
                    throw parseError;
                 }
            } else {
                const responseText = await response.text();
                // console.log('Response Text:', responseText);
                if(response.ok) {
                    data = { message: responseText || `Received status ${response.status} with non-JSON body.` };
                } else {
                    data = { _rawText: responseText };
                }
            }

            if (!response.ok) {
                const errorMessage = data?.message 
                    || data?._rawText 
                    || `HTTP error! status: ${response.status}`;
                // console.error('Error Response:', {
                //     status: response.status,
                //     statusText: response.statusText,
                //     headers: Object.fromEntries(response.headers.entries()),
                //     data: data
                // });
                const error = new Error(errorMessage);
                error.status = response.status;
                error.data = data;
                // --- Global 401/403 handler ---
                if ((error.status === 401 || error.status === 403) && typeof globalLogoutHandler === 'function') {
                    globalLogoutHandler();
                }
                throw error;
            }
            // console.log(`API Request Success: ${options.method || 'GET'} ${url} (Status: ${response.status})`);
            return data;

        } catch (error) {
            if (!error.status) {
                 // console.error(`API Request Network/Processing FAIL: ${options.method || 'GET'} ${url}. Error:`, error);
            }
            if (error.status) { throw error; }
            if (error instanceof TypeError) {
                 const networkError = new Error('Network error: Could not connect to the server.');
                 networkError.isNetworkError = true;
                 throw networkError;
            }
            const unexpectedError = new Error(error.message || 'An unexpected error occurred during the API request.');
            throw unexpectedError;
        }
    },

    // --- Authentication ---
    async login(credentials) { 
        // Ensure credentials are properly formatted
        const formattedCredentials = {
            email: credentials.email.trim().toLowerCase(),
            password: credentials.password
        };
        // console.log('Login credentials:', formattedCredentials);
        
        // First, test the API connection
        try {
            // console.log('Testing API connection...');
            await this.testConnection();
        } catch (error) {
            // console.error('API connection test failed:', error);
        }

        return this.request('/auth/login', { 
            method: 'POST', 
            body: JSON.stringify(formattedCredentials)
        }); 
    },

    // Test API connection
    async testConnection() {
        return this.request('/health', { method: 'GET' });
    },

    // Verify admin password
    async verifyAdminPassword(password) {
        return this.request('/auth/verify-admin', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
    },

    register(userData) { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }); },

    // --- User Profile ---
    getUserProfile() { return this.request('/users/profile'); },
    updateUserProfile(profileData) { return this.request('/users/profile', { method: 'PUT', body: JSON.stringify(profileData) }); },
    deleteProfile() { return this.request('/users/profile', { method: 'DELETE' }); },
    // TODO: Add changePassword API call here later
    // changePassword(passwordData) { return this.request('/auth/change-password', { method: 'PUT', body: JSON.stringify(passwordData) }); },


    // --- Accounts ---
    getAccounts() { return this.request('/accounts'); },
    createAccount(accountData) { return this.request('/accounts', { method: 'POST', body: JSON.stringify(accountData) }); },
    deleteAccount(accountId) { return this.request(`/accounts/${accountId}`, { method: 'DELETE' }); },
    renameAccount(accountId, accountNickname) { return this.request(`/accounts/${accountId}/rename`, { method: 'PUT', body: JSON.stringify({ accountNickname }) }); },

    // --- Transactions (Read) ---
    getTransactions() { return this.request('/transactions'); },
    getTransactionsForAccount(accountId) { return this.request(`/transactions/account/${accountId}`); }, // Assuming endpoint is correct

    // --- Transactions (Create - Deposit/Withdrawal - No OTP) ---
    createTransaction(transactionData) { return this.request('/transactions', { method: 'POST', body: JSON.stringify(transactionData) }); },

    // --- OTP Transfer Flow ---
    initiateTransfer(transferDetails) {
        // transferDetails should include: { transferType, fromAccountId, toAccountId?, recipientAccountNumber?, amount, description? }
        return this.request('/transactions/transfer/initiate', {
            method: 'POST',
            body: JSON.stringify(transferDetails)
        });
    },
    executeTransfer(detailsWithOtp) {
         // detailsWithOtp should include: { transferType, fromAccountId, toAccountId?, recipientAccountNumber?, amount, description?, otp }
        return this.request('/transactions/transfer/execute', {
            method: 'POST',
            body: JSON.stringify(detailsWithOtp)
        });
    },
    // --- End OTP Transfer Flow ---

    // --- Transactions (Delete All) ---
    deleteAllTransactions() { return this.request('/transactions/all', { method: 'DELETE' }); },


    // --- Old Direct Transfer Functions (Commented Out - Use OTP flow) ---
    // transfer(transferData) {
    //     console.warn("Deprecated API call: api.transfer used. Use OTP flow.");
    //     return this.request('/transactions/transfer', { method: 'POST', body: JSON.stringify(transferData) });
    // },
    // transferToExternalAccount(transferData) {
    //     console.warn("Deprecated API call: api.transferToExternalAccount used. Use OTP flow.");
    //     return this.request('/transactions/external-transfer', { method: 'POST', body: JSON.stringify(transferData) });
    // },
    // ------------------------------------------------------------------

};

export default api;
