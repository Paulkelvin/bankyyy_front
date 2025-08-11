// src/pages/ProfilePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx'; // Ensure updateUserContext is exported and available
import api from '../services/api.js';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Textarea from '../components/Textarea.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card.jsx';
import { Alert, AlertDescription, AlertTitle } from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';

const ProfilePage = ({ onBackToDashboard }) => {
    // Destructure necessary functions/state from auth context
    const { user, token, logout, updateUserContext } = useAuth(); // Make sure updateUserContext is included

    // State for profile display
    const [profileData, setProfileData] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState(null);

    // State for updating profile info form
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);
    const [infoUpdateError, setInfoUpdateError] = useState(null);
    const [infoUpdateSuccess, setInfoUpdateSuccess] = useState(null);

    // State for changing password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [passwordUpdateError, setPasswordUpdateError] = useState(null);
    const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(null);

    // State for deleting profile
    const [isDeletingProfile, setIsDeletingProfile] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmDeleteText, setConfirmDeleteText] = useState('');

    // Fetch profile data
    const fetchProfile = useCallback(async () => {
        if (!token) {
            console.warn("fetchProfile: No token found, skipping fetch.");
            setIsLoadingProfile(false); // Stop loading if no token
            setProfileError("Authentication token not found. Please log in again."); // Set an error
            return;
         }
        setIsLoadingProfile(true); setProfileError(null);
        try {
            // Use the specific profile API endpoint
            const response = await api.getUserProfile();
            // Adjust based on your actual API response structure
             // Assuming api.getUserProfile returns the user object directly or within a 'data' field
             const userData = response.data || response; // Adjust if necessary
             if (userData && userData._id) {
                 setProfileData(userData);
                 setEditName(userData.name || '');
                 setEditPhone(userData.phoneNumber || '');
                 setEditAddress(userData.address || '');
                 console.log("Profile fetched successfully:", userData);
            } else {
                 console.error("Fetch profile response invalid:", response);
                 throw new Error("Failed to fetch profile data: Invalid response.");
            }
        } catch (error) {
            console.error("Fetch profile error:", error);
            setProfileError(error.message || "Could not load profile.");
            if (error.status === 401) { // Handle unauthorized by logging out
                logout();
            }
        } finally {
            setIsLoadingProfile(false);
        }
    }, [token, logout]); // Include logout in dependencies

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]); // Run fetchProfile when it changes (or on mount)

    // Handle profile info update
    const handleUpdateInfo = async (e) => {
        e.preventDefault();
        const currentProfile = profileData || {};
        const nameChanged = editName.trim() !== (currentProfile.name || '');
        const phoneChanged = editPhone.trim() !== (currentProfile.phoneNumber || '');
        const addressChanged = editAddress.trim() !== (currentProfile.address || '');

        // Check if anything actually changed
        if (!nameChanged && !phoneChanged && !addressChanged) {
            setInfoUpdateError("No changes detected.");
            setInfoUpdateSuccess(null); // Clear success message
            setTimeout(() => setInfoUpdateError(null), 3000);
            return;
        }
        setIsUpdatingInfo(true); setInfoUpdateError(null); setInfoUpdateSuccess(null);
        const dataToUpdate = {
            name: editName.trim(),
            phoneNumber: editPhone.trim(),
            address: editAddress.trim()
        };

        try {
            // Call API to update profile
            const response = await api.updateUserProfile(dataToUpdate);
            console.log("Update profile response:", JSON.stringify(response)); // Log the full response

            // Assuming response structure is { success: true, message: "...", data: { updatedUserObject } }
            if (response && response.data && response.data._id) { // Check for necessary data
                const updatedUserData = response.data;

                // 1. Update local display state with the data returned from the API
                setProfileData(updatedUserData);

                // 2. Update shared AuthContext state
                if (updateUserContext) {
                    console.log("Calling updateUserContext with:", updatedUserData);
                    updateUserContext(updatedUserData); // *** Ensure this line is active ***
                } else {
                    console.warn("updateUserContext function not found in useAuth context!");
                }

                // 3. Show success message
                setInfoUpdateSuccess(response.message || "Profile updated successfully!");
                setTimeout(() => setInfoUpdateSuccess(null), 3000); // Clear message after delay

                // 4. Optional: Reset edit fields to match newly saved data (can prevent accidental resubmits)
                // setEditName(updatedUserData.name || '');
                // setEditPhone(updatedUserData.phoneNumber || '');
                // setEditAddress(updatedUserData.address || '');

            } else {
                // Handle cases where API call might succeed (status 200) but not return expected data
                console.error("Update profile API response missing data:", response);
                throw new Error(response?.message || "Failed to update profile: Invalid server response.");
            }
        } catch (error) {
            console.error("Update profile info error:", error);
            setInfoUpdateError(error.data?.message || error.message || "Could not update profile information."); // Prefer backend error message if available
            if (error.status === 401) { // Handle unauthorized during update
                logout();
            }
        } finally {
            setIsUpdatingInfo(false);
        }
    };

    // Handle password change (Placeholder - needs implementation in Step 5)
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordUpdateError(null); setPasswordUpdateSuccess(null);
        if (!currentPassword || !newPassword || !confirmPassword) { setPasswordUpdateError("Please fill in all password fields."); return; }
        if (newPassword !== confirmPassword) { setPasswordUpdateError("New passwords do not match."); return; }
        if (newPassword.length < 6) { setPasswordUpdateError("New password must be at least 6 characters."); return; }

        setIsUpdatingPassword(true);
        // --- TODO: Replace with actual API call ---
        console.warn("Password change API call not implemented yet!");
        // try {
        //     await api.changePassword({ currentPassword, newPassword });
        //     setPasswordUpdateSuccess("Password updated successfully!");
        //     setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        //     setTimeout(() => setPasswordUpdateSuccess(null), 3000);
        // } catch (error) {
        //     console.error("Change password error:", error);
        //     setPasswordUpdateError(error.data?.message || error.message || "Could not update password.");
        //     if (error.status === 401) { setPasswordUpdateError("Incorrect current password.");}
        // } finally {
        //     setIsUpdatingPassword(false);
        // }
         // --- END TODO ---

         // Simulate delay for placeholder
         await new Promise(resolve => setTimeout(resolve, 1000));
         setIsUpdatingPassword(false);
         setPasswordUpdateError("Password change not implemented yet."); // Placeholder error
    };

    // Handle profile deletion
    const handleDeleteProfile = async (e) => {
        e.preventDefault();
        if (confirmDeleteText !== 'DELETE') {
            setDeleteError('Please type DELETE to confirm');
            return;
        }

        setIsDeletingProfile(true);
        setDeleteError(null);

        try {
            await api.deleteProfile();
            // Call logout to clear the session
            logout();
        } catch (error) {
            console.error("Delete profile error:", error);
            setDeleteError(error.message || "Failed to delete profile. Please try again.");
            setIsDeletingProfile(false);
        }
    };

    // --- Render Logic ---
    if (isLoadingProfile) { return <div className="container mx-auto p-6 flex justify-center items-center min-h-[300px]"><Spinner /> Loading Profile...</div>; }
    // Show error and back button if profile loading failed
    if (profileError) { return ( <div className="container mx-auto p-6"> <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{profileError}</AlertDescription></Alert> <Button onClick={onBackToDashboard} variant="outline" className="mt-4">Back to Dashboard</Button> </div> ); }
    // Handle case where data might still be null after loading without specific error
    if (!profileData) { return <div className="container mx-auto p-6 text-center">Could not load profile data. Please try again later or contact support. <Button onClick={onBackToDashboard} variant="outline" className="mt-4">Back to Dashboard</Button></div>; }

    // Recalculate if info changed based on trimmed values before render
    const infoChanged = editName.trim() !== (profileData.name || '') || editPhone.trim() !== (profileData.phoneNumber || '') || editAddress.trim() !== (profileData.address || '');

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-8">
            {/* Back Button */}
            <Button onClick={onBackToDashboard} variant="outline" size="sm"> &larr; Back to Dashboard </Button>
            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">User Profile</h1>

            {/* Personal Information Card (uses profileData for display) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <p><strong className="font-medium text-gray-600 w-28 inline-block">Username:</strong> {profileData.username || profileData.name}</p>
                    <p><strong className="font-medium text-gray-600 w-28 inline-block">Full Name:</strong> {profileData.fullName || profileData.name}</p>
                    <p><strong className="font-medium text-gray-600 w-28 inline-block">Email:</strong> {profileData.email}</p>
                    <p><strong className="font-medium text-gray-600 w-28 inline-block">Phone:</strong> {profileData.phoneNumber || <span className="italic text-gray-400">Not Set</span>}</p>
                    <p><strong className="font-medium text-gray-600 w-28 inline-block">Address:</strong> {profileData.address || <span className="italic text-gray-400">Not Set</span>}</p>
                </CardContent>
            </Card>

            {/* Update Information Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Update Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdateInfo} className="space-y-4">
                        {infoUpdateError && <Alert variant="destructive"><AlertTitle>Update Failed</AlertTitle><AlertDescription>{infoUpdateError}</AlertDescription></Alert>}
                        {infoUpdateSuccess && <Alert variant="success"><AlertTitle>Success</AlertTitle><AlertDescription>{infoUpdateSuccess}</AlertDescription></Alert>}
                        {/* Input fields using edit* state */}
                        {/* Username and Full Name are read-only */}
                        <div className="space-y-1">
                            <label htmlFor="edit-username" className="text-sm font-medium text-gray-700">Username</label>
                            <Input id="edit-username" type="text" value={profileData.username || profileData.name} readOnly disabled />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="edit-fullName" className="text-sm font-medium text-gray-700">Full Name</label>
                            <Input id="edit-fullName" type="text" value={profileData.fullName || profileData.name} readOnly disabled />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">Phone Number</label>
                            <Input id="edit-phone" type="tel" placeholder="e.g., +1234567890" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} disabled={isUpdatingInfo} />
                        </div>
                         <div className="space-y-1">
                            <label htmlFor="edit-address" className="text-sm font-medium text-gray-700">Address</label>
                            <Textarea id="edit-address" rows={3} placeholder="123 Main St, Anytown USA" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} disabled={isUpdatingInfo} />
                        </div>
                        {/* Disable button if processing or if no changes were made */}
                        <Button type="submit" className="w-full sm:w-auto" disabled={isUpdatingInfo || !infoChanged}>
                            {isUpdatingInfo ? <><Spinner size="sm" className="mr-2"/> Saving...</> : 'Save Changes'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Change Password
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        {passwordUpdateError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{passwordUpdateError}</AlertDescription></Alert>}
                        {passwordUpdateSuccess && <Alert variant="success"><AlertTitle>Success</AlertTitle><AlertDescription>{passwordUpdateSuccess}</AlertDescription></Alert>}
                        {/* Password fields */}
                        <div className="space-y-1">
                            <label htmlFor="current-password" className="text-sm font-medium text-gray-700">Current Password</label>
                            <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isUpdatingPassword} />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="new-password" className="text-sm font-medium text-gray-700">New Password</label>
                            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={isUpdatingPassword} />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">Confirm New Password</label>
                            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isUpdatingPassword} />
                        </div>
                        <Button type="submit" className="w-full sm:w-auto" disabled={isUpdatingPassword}>
                            {isUpdatingPassword ? <><Spinner size="sm" className="mr-2"/> Updating...</> : 'Update Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Delete Profile Card */}
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="flex items-center text-red-600">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Profile
                    </CardTitle>
                    <CardDescription className="text-red-600">
                        Warning: This action cannot be undone. All your data will be permanently deleted.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!showDeleteConfirm ? (
                        <Button 
                            variant="destructive" 
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeletingProfile}
                        >
                            Delete My Profile
                        </Button>
                    ) : (
                        <form onSubmit={handleDeleteProfile} className="space-y-4">
                            {deleteError && (
                                <Alert variant="destructive">
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{deleteError}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <p className="text-sm text-gray-600">
                                    To confirm deletion, please type <span className="font-mono font-bold">DELETE</span> below:
                                </p>
                                <Input
                                    type="text"
                                    value={confirmDeleteText}
                                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                                    placeholder="Type DELETE to confirm"
                                    disabled={isDeletingProfile}
                                />
                            </div>
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setConfirmDeleteText('');
                                        setDeleteError(null);
                                    }}
                                    disabled={isDeletingProfile}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={isDeletingProfile || confirmDeleteText !== 'DELETE'}
                                >
                                    {isDeletingProfile ? (
                                        <><Spinner size="sm" className="mr-2"/> Deleting...</>
                                    ) : (
                                        'Confirm Deletion'
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfilePage;