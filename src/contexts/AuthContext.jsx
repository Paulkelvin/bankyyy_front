// src/contexts/AuthContext.jsx
import React, { useState, createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api.js'; // Import the API service

// Create the context
const AuthContext = createContext(null);

// Create the provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // For login/register API calls
    const [authError, setAuthError] = useState(null);
    const [logoutStatus, setLogoutStatus] = useState('idle'); // idle, processing, success
    const [logoutMessage, setLogoutMessage] = useState('');

    // Effect to initialize state from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');
        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                // console.log("AuthContext: Initial state loaded from localStorage.");
            } catch (e) {
                // console.error("AuthContext: Failed to parse stored user", e);
                localStorage.removeItem('authUser'); localStorage.removeItem('authToken');
            }
        } else {
            // console.log("AuthContext: No initial state found in localStorage.");
        }
    }, []); // Run only once

    // Login function (returns data for LoginPage to handle)
    const login = useCallback(async (credentials) => {
        setIsLoading(true); setAuthError(null);
        let data;
        try {
            // console.log("AuthContext: Calling api.login...");
            data = await api.login(credentials);
            // console.log("AuthContext: api.login call completed. Received data:", data);

            if (data && data.token && data.user) {
                // console.log("AuthContext: Login successful, returning token and user.");
                return { token: data.token, user: data.user }; // Return data for LoginPage to handle
            } else {
                 // console.warn("AuthContext: Login API response missing token or user.", data);
                 throw new Error(data?.message || 'Login failed: Invalid response structure from server.');
            }
        } catch (error) {
            // console.error("AuthContext: Login API call failed:", error);
            let specificError = error.message || 'Login failed.';
            if (error.status === 401) { specificError = 'Invalid email or password.'; }
            else if (error.isNetworkError) { specificError = 'Network error. Unable to reach server.'; }
            else if (error.message?.includes('Invalid response structure')) { specificError = error.message; }
            setAuthError(specificError);
            localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
            setToken(null); setUser(null);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Register function (sets state directly)
    const register = useCallback(async (userData) => {
        setIsLoading(true); setAuthError(null);
        try {
            const data = await api.register(userData);
            if (data.token && data.user) {
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('authUser', JSON.stringify(data.user));
                return { token: data.token, user: data.user };
            } else { throw new Error(data.message || 'Registration failed: Invalid response.'); }
        } catch (error) {
            if (error.status === 409 || error.message?.includes('Duplicate') || error.message?.includes('already exists')) {
                 setAuthError('Registration failed: Email or username already exists.');
            } else {
                 setAuthError(error.message || 'Registration failed.');
            }
            localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
            setToken(null); setUser(null);
            return false;
        } finally { setIsLoading(false); }
    }, []);

    // Function called by LoginPage to set state after successful login API call
    const setAuthState = useCallback((newToken, newUser) => {
         // console.log("AuthContext: setAuthState called.");
         setToken(newToken);
         setUser(newUser);
         localStorage.setItem('authToken', newToken);
         localStorage.setItem('authUser', JSON.stringify(newUser));
    }, []);

     // --- NEW: Function to update user state and storage after profile update ---
    const updateUserContext = useCallback((updatedUserData) => {
        // updatedUserData should be the user object returned from the PUT /api/users/profile call
        if (updatedUserData && updatedUserData._id) {
            // Merge the updated data with the existing user state
            // Ensures fields not returned by the update API (like maybe roles or other flags) are kept
            const mergedUser = { ...user, ...updatedUserData };
             // console.log("AuthContext: Updating user state with:", mergedUser);
            setUser(mergedUser); // Update state
            localStorage.setItem('authUser', JSON.stringify(mergedUser)); // Update localStorage
        } else {
             // console.warn("AuthContext: updateUserContext called with invalid data", updatedUserData);
        }
    }, [user]); // Depends on 'user' state so the merge uses the latest data
    // --- END NEW FUNCTION ---

    // Logout function
    const logout = useCallback(() => {
        setLogoutStatus('processing'); setLogoutMessage('Logging out...');
        // console.log("AuthContext: Logout initiated.");
        setTimeout(() => {
            // Logging simulation removed for clean code
            setLogoutMessage('Clearing session...'); // console.log("AuthContext: Clearing local session state...");
            setTimeout(() => {
                setUser(null); setToken(null);
                localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
                setLogoutStatus('success'); setLogoutMessage('Logged out successfully.');
                // console.log("AuthContext: Local session cleared. Logout complete.");
                setTimeout(() => { setLogoutStatus('idle'); setLogoutMessage(''); }, 1500);
            }, 700);
        }, 800);
    }, []);

    // Memoize the context value
    const value = useMemo(() => ({
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading, // Login/Register loading
        authError,
        login,
        register,
        logout,
        setAuthState, // Used by LoginPage
        updateUserContext, // <-- Export the new function for ProfilePage
        clearAuthError: () => setAuthError(null),
        isLoggingOut: logoutStatus === 'processing',
        logoutMsg: logoutMessage
    }), [
        user, token, isLoading, authError, login, register, logout, setAuthState,
        updateUserContext, // <-- Add dependency here
        logoutStatus, logoutMessage
    ]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined || context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};