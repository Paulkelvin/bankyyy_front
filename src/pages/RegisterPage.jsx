// src/pages/RegisterPage.jsx
import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useAuth } from '../contexts/AuthContext.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/Card.jsx';
import { Alert, AlertTitle, AlertDescription } from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import { sleep } from '../utils/helpers.js'; // Assuming sleep exists (though not used in this version)

// Define constants for processing states
const STATUS_IDLE = 'idle';
const STATUS_REGISTERING = 'registering';
const STATUS_VALIDATING = 'validating';
const STATUS_CREATING = 'creating';
const STATUS_GENERATING_TOKEN = 'generating_token';
const STATUS_SUCCESS = 'success';
const STATUS_ERROR = 'error';

const RegisterPage = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Get register function and state from context
  // Note: register in AuthContext currently sets state immediately.
  // For simulation, we might adjust AuthContext or handle differently here.
  // Let's assume for now register *also* just returns true/false like login.
  // We'll need to adjust AuthContext.register if needed.
  const { register, setAuthState, isLoading: isAuthLoading, authError, clearAuthError } = useAuth(); // Assuming register returns data and we use setAuthState

  const [processStatus, setProcessStatus] = useState(STATUS_IDLE);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const timeoutRef = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

   // Effect to clear SUCCESS status after a delay
  useEffect(() => {
      if (processStatus === STATUS_SUCCESS) {
          timeoutRef.current = setTimeout(() => {
              setProcessStatus(prevStatus => prevStatus === STATUS_SUCCESS ? STATUS_IDLE : prevStatus);
              setFeedbackMessage('');
              // Navigation happens via App.jsx reacting to isAuthenticated
          }, 2500); // Duration success message stays
      }
      return () => { if (timeoutRef.current && processStatus === STATUS_SUCCESS) clearTimeout(timeoutRef.current); };
  }, [processStatus]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    clearAuthError();
    setFeedbackMessage('');
    setProcessStatus(STATUS_REGISTERING); // Initial status
    setFeedbackMessage('Submitting registration...');

    // --- ADJUSTMENT NEEDED ---
    // Assuming `register` from useAuth is modified like `login` to return data or false
    // If `register` still sets state directly, this simulation won't work correctly.
    // We proceed assuming `register` returns `{ token, user }` or `false`.
    const registrationResult = await register({ name, email, password }); // This call needs modification in AuthContext

    if (registrationResult) { // If API call succeeded (needs adjustment in AuthContext)
        console.log("Registration API successful, starting simulation...");
        setProcessStatus(STATUS_VALIDATING);
        setFeedbackMessage('Validating input...');
        timeoutRef.current = setTimeout(() => {
            setProcessStatus(STATUS_CREATING);
            setFeedbackMessage('Creating user record...');
            timeoutRef.current = setTimeout(() => {
                setProcessStatus(STATUS_GENERATING_TOKEN);
                setFeedbackMessage('Generating security token...');
                timeoutRef.current = setTimeout(() => {
                    setProcessStatus(STATUS_SUCCESS);
                    setFeedbackMessage('Registration successful! Logging you in...');
                    // Now set the auth state after simulation
                     timeoutRef.current = setTimeout(() => {
                        // Check if registrationResult has the expected data
                        if (registrationResult.token && registrationResult.user) {
                            setAuthState(registrationResult.token, registrationResult.user);
                        } else {
                            // Handle unexpected case where result is true but data missing
                            console.error("Registration simulation succeeded but token/user data missing");
                            setProcessStatus(STATUS_ERROR); // Fallback to error
                            setFeedbackMessage("Registration completed but failed to log in automatically.");
                        }
                    }, 500); // Short delay after success message

                }, 1200); // Delay before success
            }, 1500); // Delay before token gen
        }, 1000); // Delay before creating user
    } else {
        // Registration API failed (authError is set in context)
        console.log("Registration API failed.");
        setProcessStatus(STATUS_ERROR); // Use local status or rely on authError
        setFeedbackMessage(''); // Clear local message
    }
  };

  // Determine loading state
  const isLoading = isAuthLoading || (processStatus !== STATUS_IDLE && processStatus !== STATUS_SUCCESS && processStatus !== STATUS_ERROR);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Register New Account</CardTitle>
          <CardDescription>Create your new account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
             <Alert variant="destructive" show={!!authError || processStatus === STATUS_ERROR}>
               <AlertTitle>Registration Failed</AlertTitle>
               <AlertDescription>{authError || 'An error occurred during registration.'}</AlertDescription>
             </Alert>
             <Alert variant="success" show={processStatus === STATUS_SUCCESS}>
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{feedbackMessage}</AlertDescription>
             </Alert>
            {/* Inputs */}
            <div className="space-y-2"> <label htmlFor="name">Name</label> <Input id="name" type="text" placeholder="Your Full Name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading}/> </div>
            <div className="space-y-2"> <label htmlFor="email">Email</label> <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading}/> </div>
            <div className="space-y-2"> <label htmlFor="password">Password</label> <Input id="password" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} disabled={isLoading}/> </div>
            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? ( <><Spinner className="mr-2" /> {feedbackMessage || 'Processing...'} </> ) : ( 'Create Account' )}
            </Button>
          </form>
        </CardContent>
         <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Button variant="link" className="p-0 h-auto text-blue-600" onClick={onSwitchToLogin} disabled={isLoading}>
              Login here
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterPage;
