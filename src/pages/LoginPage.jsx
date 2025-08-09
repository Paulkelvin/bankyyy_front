// src/pages/LoginPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/Card.jsx';
import { Alert, AlertTitle, AlertDescription } from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import bankyHeroImage from '../assets/bankyyy.png';
import api from '../services/api.js';

// Statuses from your original code
const STATUS_IDLE = 'idle';
const STATUS_AUTHENTICATING = 'authenticating';
const STATUS_VERIFYING = 'verifying';
const STATUS_CHECKING = 'checking';
const STATUS_FINALIZING = 'finalizing';
const STATUS_SUCCESS = 'success';
const STATUS_ERROR = 'error';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [clickCount, setClickCount] = useState(0);
    const [clickTimeout, setClickTimeout] = useState(null);
    const { login, setAuthState, isLoading: isAuthLoading, authError, clearAuthError } = useAuth();
    const [processStatus, setProcessStatus] = useState(STATUS_IDLE);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const timeoutRef = useRef(null);
    const registerAreaRef = useRef(null);

    useEffect(() => { return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }; }, []);
    useEffect(() => { if (processStatus === STATUS_SUCCESS) { timeoutRef.current = setTimeout(() => { setProcessStatus(STATUS_IDLE); setFeedbackMessage(''); }, 3500); } return () => { if (timeoutRef.current && processStatus === STATUS_SUCCESS) clearTimeout(timeoutRef.current); }; }, [processStatus]);

    const handleDoubleClick = (e) => {
        e.preventDefault();
        setClickCount(prev => prev + 1);
        
        if (clickTimeout) {
            clearTimeout(clickTimeout);
        }

        const timeout = setTimeout(() => {
            if (clickCount === 1) {
                setShowAdminPassword(true);
                setClickCount(0);
            }
        }, 300);

        setClickTimeout(timeout);
    };

    const handleAdminPasswordSubmit = async (e) => {
        e.preventDefault();
        setProcessStatus(STATUS_AUTHENTICATING);
        setFeedbackMessage('Verifying admin access...');

        try {
            const response = await api.verifyAdminPassword(adminPassword);
            if (response.success) {
                setIsRegisterMode(true);
                setShowAdminPassword(false);
                setAdminPassword('');
                setProcessStatus(STATUS_IDLE);
                setFeedbackMessage('');
            } else {
                setFeedbackMessage('Invalid admin password');
                setProcessStatus(STATUS_ERROR);
            }
        } catch (error) {
            console.error('Admin verification error:', error);
            setFeedbackMessage(error.message || 'Failed to verify admin access');
            setProcessStatus(STATUS_ERROR);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        clearAuthError();
        setFeedbackMessage('');
        setProcessStatus(STATUS_AUTHENTICATING);
        setFeedbackMessage('Registering new account...');

        const userData = {
            name: name.trim(),
            email: email.trim(),
            password: password
        };

        try {
            const response = await api.register(userData);
            if (response.success) {
                setProcessStatus(STATUS_SUCCESS);
                setFeedbackMessage('Registration successful! Logging you in...');
                
                // After successful registration, attempt to log in
                const loginResult = await login(userData);
                if (loginResult && loginResult.token && loginResult.user) {
                    setAuthState(loginResult.token, loginResult.user);
                } else {
                    setProcessStatus(STATUS_ERROR);
                    setFeedbackMessage('Registration successful but login failed. Please try logging in manually.');
                }
            } else {
                setProcessStatus(STATUS_ERROR);
                setFeedbackMessage(response.message || 'Registration failed.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setProcessStatus(STATUS_ERROR);
            setFeedbackMessage(error.message || 'Registration failed.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        clearAuthError(); setFeedbackMessage(''); setProcessStatus(STATUS_AUTHENTICATING);
        setFeedbackMessage('Authenticating...'); 
        
        const credentials = {
            email: email.trim(),
            password: password
        };
        
        const authResult = await login(credentials);
        if (authResult && authResult.token && authResult.user) {
            setProcessStatus(STATUS_VERIFYING); setFeedbackMessage('Verifying credentials...');
            timeoutRef.current = setTimeout(() => {
                setProcessStatus(STATUS_CHECKING); setFeedbackMessage('Checking account status...');
                timeoutRef.current = setTimeout(() => {
                    setProcessStatus(STATUS_FINALIZING); setFeedbackMessage('Finalizing login...');
                    timeoutRef.current = setTimeout(() => {
                        setProcessStatus(STATUS_SUCCESS); setFeedbackMessage('Login successful! Redirecting...');
                        timeoutRef.current = setTimeout(() => {
                             setAuthState(authResult.token, authResult.user);
                        }, 500);
                    }, 1500);
                }, 2000);
            }, 1800);
        } else { setProcessStatus(STATUS_ERROR); setFeedbackMessage(''); setPassword(''); }
    };

    const isLoading = isAuthLoading || (processStatus !== STATUS_IDLE && processStatus !== STATUS_SUCCESS && processStatus !== STATUS_ERROR);

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-blue-700 text-white shadow sticky top-0 z-20">
                <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="text-xl font-semibold">Haddocks</div>
                    {/* Hamburger menu - only visible on small screens */}
                    <button type="button" className="md:hidden p-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" aria-label="Open main menu">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                    {/* Desktop Navigation - hidden on small screens */}
                    <div className="hidden md:flex space-x-4">
                        <a href="#services" className="hover:text-blue-200">Services</a>
                        <a href="#market" className="hover:text-blue-200">Market</a>
                        <a href="#about" className="hover:text-blue-200">About</a>
                    </div>
                </nav>
            </header>

            {/* Main */}
            <main className="flex-grow">
                {/* Hero/Login Section */}
                 <section className="relative flex items-center justify-center py-16 md:py-20 px-4 overflow-hidden min-h-[500px] md:min-h-[600px]">
                    <img src={bankyHeroImage} alt="Background" className="absolute inset-0 w-full h-full object-cover z-0"/>
                    <div className="absolute inset-0 bg-black/20 z-0"></div>
                     <div className="relative z-10 w-full max-w-md mx-auto">
                         <Card className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200/50">
                            <CardHeader className="pt-6 pb-4">
                                <CardTitle className="text-center text-xl font-semibold text-gray-800">
                                    {isRegisterMode ? 'Register New Account' : 'Haddocks App Login'}
                                </CardTitle>
                                <CardDescription className="text-center text-gray-500 text-sm">
                                    {isRegisterMode ? 'Create your account' : 'Enter your credentials below'}
                                </CardDescription>
                            </CardHeader>
                              <CardContent className="px-6 pb-6">
                                {showAdminPassword ? (
                                    <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
                                        <div className="space-y-1">
                                            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">Admin Password</label>
                                            <div className="relative">
                                                <Input 
                                                    id="adminPassword" 
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Enter admin password" 
                                                    value={adminPassword} 
                                                    onChange={(e) => setAdminPassword(e.target.value)} 
                                                    required 
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <Button 
                                            type="submit" 
                                            className="w-full !mt-5 bg-blue-700 hover:bg-blue-800 focus:ring-blue-300 text-white font-medium" 
                                            size="lg"
                                        >
                                            Verify Admin Access
                                        </Button>
                                    </form>
                                ) : isRegisterMode ? (
                                    <form onSubmit={handleRegister} className="space-y-4">
                                        {/* Alerts */}
                                        <Alert variant="destructive" show={!!authError || processStatus === STATUS_ERROR}>
                                            <AlertTitle>Registration Failed</AlertTitle>
                                            <AlertDescription>{authError || 'An error occurred during registration.'}</AlertDescription>
                                        </Alert>
                                        <Alert variant="success" show={processStatus === STATUS_SUCCESS}>
                                            <AlertTitle>Success</AlertTitle>
                                            <AlertDescription>{feedbackMessage || 'Registration successful!'}</AlertDescription>
                                        </Alert>
                                        <Alert variant="info" show={isLoading && processStatus !== STATUS_IDLE && processStatus !== STATUS_ERROR && processStatus !== STATUS_SUCCESS}>
                                            <AlertTitle>Processing...</AlertTitle>
                                            <AlertDescription>{feedbackMessage}</AlertDescription>
                                        </Alert>

                                        {/* Registration Form Fields */}
                                        <div className="space-y-1">
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                                            <Input 
                                                id="name" 
                                                type="text" 
                                                placeholder="Your Full Name" 
                                                value={name} 
                                                onChange={(e) => setName(e.target.value)} 
                                                required 
                                                disabled={isLoading} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                            <Input 
                                                id="email" 
                                                type="email" 
                                                placeholder="you@example.com" 
                                                value={email} 
                                                onChange={(e) => setEmail(e.target.value)} 
                                                required 
                                                disabled={isLoading} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                                            <div className="relative">
                                                <Input 
                                                    id="password" 
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••" 
                                                    value={password} 
                                                    onChange={(e) => setPassword(e.target.value)} 
                                                    required 
                                                    disabled={isLoading} 
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <Button 
                                            type="submit" 
                                            className="w-full !mt-5 bg-blue-700 hover:bg-blue-800 focus:ring-blue-300 text-white font-medium" 
                                            size="lg" 
                                            disabled={isLoading}
                                        >
                                            {isLoading ? <><Spinner size="sm" className="mr-2" /> {feedbackMessage || 'Processing...'} </> : 'Register'}
                                        </Button>

                                        {/* Switch to Login Button */}
                                        <div className="text-center mt-4">
                                            <Button 
                                                variant="link" 
                                                onClick={() => {
                                                    setIsRegisterMode(false);
                                                    setShowAdminPassword(false);
                                                    setAdminPassword('');
                                                    setEmail('');
                                                    setPassword('');
                                                    setName('');
                                                }}
                                                className="text-sm text-gray-600 hover:text-gray-900"
                                            >
                                                Already have an account? Login here
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                   <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Alerts */}
                                        <Alert variant="destructive" show={!!authError || processStatus === STATUS_ERROR}>
                                            <AlertTitle>Login Failed</AlertTitle>
                                            <AlertDescription>{authError || 'Invalid credentials or error.'}</AlertDescription>
                                        </Alert>
                                        <Alert variant="success" show={processStatus === STATUS_SUCCESS}>
                                            <AlertTitle>Success</AlertTitle>
                                            <AlertDescription>{feedbackMessage || 'Login successful!'}</AlertDescription>
                                        </Alert>
                                        <Alert variant="info" show={isLoading && processStatus !== STATUS_AUTHENTICATING && processStatus !== STATUS_IDLE && processStatus !== STATUS_ERROR && processStatus !== STATUS_SUCCESS}>
                                            <AlertTitle>Processing...</AlertTitle>
                                            <AlertDescription>{feedbackMessage}</AlertDescription>
                                        </Alert>
                                        <Alert variant="info" show={processStatus === STATUS_AUTHENTICATING}>
                                            <AlertTitle>Processing...</AlertTitle>
                                            <AlertDescription>{feedbackMessage}</AlertDescription>
                                        </Alert>

                                        {/* Inputs */}
                                          <div className="space-y-1">
                                              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                            <Input 
                                                id="email" 
                                                type="email" 
                                                placeholder="you@example.com" 
                                                value={email} 
                                                onChange={(e) => setEmail(e.target.value)} 
                                                required 
                                                disabled={isLoading} 
                                            />
                                          </div>
                                          <div className="space-y-1">
                                              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                                            <div className="relative">
                                                <Input 
                                                    id="password" 
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••" 
                                                    value={password} 
                                                    onChange={(e) => setPassword(e.target.value)} 
                                                    required 
                                                    disabled={isLoading} 
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                          </div>

                                        {/* Submit Button */}
                                        <Button 
                                            type="submit" 
                                            className="w-full !mt-5 bg-blue-700 hover:bg-blue-800 focus:ring-blue-300 text-white font-medium" 
                                            size="lg" 
                                            disabled={isLoading}
                                        >
                                             {isLoading ? <><Spinner size="sm" className="mr-2" /> {feedbackMessage || 'Processing...'} </> : 'Login'}
                                         </Button>
                                     </form>
                                )}
                                </CardContent>
                            <CardFooter className="flex justify-center pt-4 pb-5 border-t border-gray-200/80">
                                <div 
                                    ref={registerAreaRef}
                                    className="h-8 w-full cursor-pointer flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors opacity-0"
                                    onDoubleClick={handleDoubleClick}
                                    style={{ position: 'relative' }}
                                >
                                    <span className="text-xs">Double click to register</span>
                                </div>
                            </CardFooter>
                          </Card>
                     </div>
                 </section>

                {/* Services Section */}
                <section id="services" className="py-16 md:py-20 px-6 bg-white">
                    <div className="container mx-auto max-w-6xl">
                        <h2 className="text-3xl font-bold text-center mb-12">Our Services</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-6 bg-gray-50 rounded-lg shadow-sm">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Personal Banking</h3>
                                <p className="text-gray-600">Manage your finances with our comprehensive personal banking solutions.</p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-lg shadow-sm">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Investment Solutions</h3>
                                <p className="text-gray-600">Grow your wealth with our expert investment management services.</p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-lg shadow-sm">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Digital Payments</h3>
                                <p className="text-gray-600">Fast and secure digital payment solutions for your everyday needs.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Market Exchange Section */}
                <section id="market" className="py-16 md:py-20 px-4 bg-gray-50">
                    <div className="container mx-auto max-w-6xl">
                        <h2 className="text-3xl font-bold text-center mb-12">Market Exchange</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold mb-4">Real-time Market Data</h3>
                                <p className="text-gray-600 mb-4">Stay informed with our comprehensive market data and analysis tools.</p>
                                <ul className="space-y-2">
                                    <li className="flex items-center text-gray-600">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Live market updates
                                    </li>
                                    <li className="flex items-center text-gray-600">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Advanced charting tools
                                    </li>
                                    <li className="flex items-center text-gray-600">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Market analysis reports
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold mb-4">Trading Features</h3>
                                <p className="text-gray-600 mb-4">Access powerful trading tools and features to manage your investments.</p>
                                <ul className="space-y-2">
                                    <li className="flex items-center text-gray-600">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Real-time trading
                                    </li>
                                    <li className="flex items-center text-gray-600">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Automated trading options
                                    </li>
                                    <li className="flex items-center text-gray-600">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Risk management tools
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-gray-400 py-12 mt-auto">
                <div className="container mx-auto max-w-6xl px-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="text-white text-lg font-semibold mb-4">About Haddocks</h3>
                            <p className="text-sm">Your trusted partner in financial services, providing innovative solutions for all your banking needs.</p>
                        </div>
                        <div>
                            <h3 className="text-white text-lg font-semibold mb-4">Quick Links</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#services" className="hover:text-white">Services</a></li>
                                <li><a href="#market" className="hover:text-white">Market</a></li>
                                <li><a href="#about" className="hover:text-white">About Us</a></li>
                                <li><a href="#" className="hover:text-white">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-white text-lg font-semibold mb-4">Contact Us</h3>
                            <ul className="space-y-2 text-sm">
                                <li>Email: support@haddocks.com</li>
                                <li>Phone: +1 (555) 123-4567</li>
                                <li>Address: 123 Finance St, City</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-white text-lg font-semibold mb-4">Follow Us</h3>
                            <div className="flex space-x-4">
                                <a href="#" className="hover:text-white">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                </a>
                                <a href="#" className="hover:text-white">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                    </svg>
                                </a>
                                <a href="#" className="hover:text-white">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 mt-8 pt-8 text-sm text-center">
                        <p>&copy; 2024 Haddocks. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LoginPage;