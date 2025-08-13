// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';
import Button from '../components/Button.jsx';
import { Alert, AlertTitle, AlertDescription } from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
// Import all dashboard components
import CreateAccountForm from '../components/dashboard/CreateAccountForm.jsx';
import TransactionForm from '../components/dashboard/TransactionForm.jsx';
import UnifiedTransferForm from '../components/dashboard/UnifiedTransferForm.jsx';
import AccountList from '../components/dashboard/AccountList.jsx';
import TransactionHistory from '../components/dashboard/TransactionHistory.jsx';

const DashboardPage = ({ onNavigateToProfile }) => {
    // --- State Variables ---
    const { user, logout, isLoggingOut, logoutMsg } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
    const [accountError, setAccountError] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
    const [transactionError, setTransactionError] = useState(null);
    // State for action form visibility
    const [actionHeaderClicks, setActionHeaderClicks] = useState(0);
    const [showDepositWithdrawalForms, setShowDepositWithdrawalForms] = useState(false);
    // State for Transaction History Filter
    const [historyFilterAccountId, setHistoryFilterAccountId] = useState(null);
    // Optional: State for success/error messages shown at the top level
    const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });
    // Add state for delete transactions panel feedback
    const [isDeletingTransactions, setIsDeletingTransactions] = useState(false);
    const [deleteTxFeedback, setDeleteTxFeedback] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


    // --- Data Fetching Callbacks ---
    const fetchTransactions = useCallback(async () => {
        // Keep existing fetch logic, ensure errors are handled/set
        const logPrefix = ">>> fetchTransactions:"; /* ... */ setIsLoadingTransactions(true); setTransactionError(null);
        try { const responseData = await api.getTransactions(); if (Array.isArray(responseData)) { setTransactions(responseData); } else { /* handle error */ setTransactions([]); throw new Error("Invalid response format."); } } catch (error) { console.error(`${logPrefix} Error:`, error); setTransactionError(error.message || "Could not load history."); setTransactions([]); } finally { setIsLoadingTransactions(false); }
    }, []);

    const fetchAccounts = useCallback(async () => {
        // Keep existing fetch logic, ensure errors are handled/set
         const logPrefix = ">>> fetchAccounts:"; /* ... */ setIsLoadingAccounts(true); setAccountError(null);
         try { const response = await api.getAccounts(); if (response && response.success && Array.isArray(response.data)) { setAccounts(response.data); } else { /* handle error */ setAccounts([]); throw new Error(response?.message || "Failed to fetch accounts."); } } catch (error) { console.error(`${logPrefix} Error:`, error); setAccountError(error.message || "Could not load accounts."); setAccounts([]); } finally { setIsLoadingAccounts(false); }
    }, []);

    // --- Effects ---
    useEffect(() => {
        // console.log("DashboardPage initial useEffect running...");
        fetchAccounts();
        fetchTransactions();
    }, [fetchAccounts, fetchTransactions]); // Dependencies


    // --- Handlers ---

    // Generic handler for actions causing data refresh
     const handleActionSuccess = useCallback((message = 'Action successful!', shouldRefetch = true) => {
        setGlobalMessage({ type: 'success', text: message });
        if (shouldRefetch) {
            fetchAccounts();
            fetchTransactions();
        }
        setTimeout(() => setGlobalMessage({ type: '', text: '' }), 4000);
     }, [fetchAccounts, fetchTransactions]); // Dependencies

     // Specific handler for account rename success
     const handleAccountRenamed = useCallback(() => {
         // console.log("Account rename successful, calling refresh...");
         handleActionSuccess('Account renamed successfully!'); // Use generic handler with specific message
     }, [handleActionSuccess]); // Dependency

     // Handler for account deletion success
      const handleAccountDeleted = useCallback(() => {
         // console.log("Account delete successful, calling refresh...");
         handleActionSuccess('Account deleted successfully!'); // Use generic handler
         setHistoryFilterAccountId(null); // Clear filter if the filtered account was deleted
     }, [handleActionSuccess]);

    // Action Header Click Handler (for showing D/W forms)
    const handleActionHeaderClick = () => {
        const newClickCount = actionHeaderClicks + 1;
        setActionHeaderClicks(newClickCount);
        if (newClickCount >= 2) { setShowDepositWithdrawalForms(true); }
    };

    // Transaction History Filter Handlers
    const handleViewTransactions = useCallback((accountId) => {
        setHistoryFilterAccountId(accountId);
        // Optional: scrollIntoView
    }, []);

    const handleShowAllTransactions = useCallback(() => {
        setHistoryFilterAccountId(null);
    }, []);

    // Optimistic balance update for transfers
    const handleOptimisticBalanceUpdate = (fromAccountId, toAccountId, amount, transferType) => {
        setAccounts(prevAccounts => prevAccounts.map(acc => {
            if (acc._id === fromAccountId) {
                // Subtract from sender
                return { ...acc, balance: parseFloat(acc.balance) - parseFloat(amount) };
            }
            if (transferType === 'internal' && acc._id === toAccountId) {
                // Add to receiver (for internal transfers)
                return { ...acc, balance: parseFloat(acc.balance) + parseFloat(amount) };
            }
            return acc;
        }));
    };

    // Optimistic transaction add for transfers
    const handleOptimisticTransactionAdd = (newTransaction) => {
        setTransactions(prev => [newTransaction, ...prev]);
    };

    // --- Render Logic ---
    // console.log('Rendering DashboardPage with State:', { isLoadingAccounts, isLoadingTransactions, accountError, transactionError, accountsCount: accounts.length, transactionsCount: transactions.length, showDepositWithdrawalForms, historyFilterAccountId });

    return (
        <div className="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
            {/* Header Section */}
            <header className="flex flex-wrap justify-between items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                     <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Welcome, {user?.username || user?.name || 'User'}!</h1>
                     <Button onClick={onNavigateToProfile} variant="secondary" size="sm" disabled={isLoggingOut}> View Profile </Button>
                </div>
                <Button onClick={logout} variant="outline" size="sm" disabled={isLoggingOut} className="min-w-[80px]">
                     {isLoggingOut ? (<><Spinner size="sm" className="mr-2" /> {logoutMsg || 'Processing...'}</>) : ('Logout')}
                </Button>
            </header>

             {/* Global Success/Error Alert */}
             {globalMessage.text && (
                 <div className="mb-4">
                     <Alert variant={globalMessage.type === 'success' ? 'default' : 'destructive'}>
                         <AlertDescription>{globalMessage.text}</AlertDescription>
                     </Alert>
                 </div>
            )}


            {/* Main Content Grid */}
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <section className="lg:col-span-2 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> Your Accounts
                        </h2>
                        {/* Pass all necessary handlers to AccountList */}
                        <AccountList
                            accounts={accounts}
                            isLoading={isLoadingAccounts}
                            error={accountError}
                            onViewTransactions={handleViewTransactions}
                            onAccountDeleted={handleAccountDeleted} // Use specific delete handler
                            onAccountRenamed={handleAccountRenamed} // Pass the rename handler
                        />
                    </div>
                    <div id="transaction-history-section">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center">
                             <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> Transaction History
                        </h2>
                        <TransactionHistory
                            transactions={transactions}
                            isLoading={isLoadingTransactions}
                            error={transactionError}
                            accounts={accounts}
                            filterAccountId={historyFilterAccountId}
                            onShowAll={handleShowAllTransactions}
                            devMode={showDepositWithdrawalForms}
                            onRefreshTransactions={fetchTransactions}
                        />
                    </div>
                </section>

                {/* Right Column (Actions Sidebar) */}
                <aside className="lg:col-span-1 space-y-6">
                    <button type="button" onClick={handleActionHeaderClick} className="flex items-center text-lg font-semibold text-gray-700 mb-4 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-1 py-0.5 w-full text-left">
                        <svg className="w-5 h-5 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Actions
                        {!showDepositWithdrawalForms}
                    </button>

                    {isLoadingAccounts ? (<div className="flex justify-center items-center p-4 text-gray-500"><Spinner className="mr-2" /> Loading actions...</div>)
                        : accountError ? (<Alert variant="destructive"><AlertTitle>Cannot Load Actions</AlertTitle><AlertDescription>{accountError}</AlertDescription></Alert>)
                            : accounts.length === 0 ? (<Alert><AlertTitle>No Accounts</AlertTitle><AlertDescription>Create an account first.</AlertDescription></Alert>)
                                : (
                                    <div className="space-y-6">
                                        {showDepositWithdrawalForms && (
                                            <>
                                                <TransactionForm title="Deposit" accounts={accounts} transactionType="deposit" onTransactionSuccess={() => handleActionSuccess('Deposit successful!')} />
                                                <TransactionForm title="Withdrawal" accounts={accounts} transactionType="withdrawal" onTransactionSuccess={() => handleActionSuccess('Withdrawal successful!')} />
                                                <CreateAccountForm onAccountCreated={() => handleActionSuccess('Account created successfully!')} />
                                                {/* New Delete Transactions Panel */}
                                                <div className="bg-white border border-red-200 rounded-lg p-4 mt-4">
                                                    <h3 className="text-lg font-semibold text-red-600 mb-2 flex items-center">
                                                        <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        Delete All Transaction History
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mb-2">This will permanently delete all your transaction history. Your accounts and balances will remain, but your transaction list will be empty (like a new account).</p>
                                                    {deleteTxFeedback && (
                                                        <Alert variant={deleteTxFeedback.startsWith('Success') ? 'success' : 'destructive'} className="mb-2">
                                                            <AlertTitle>{deleteTxFeedback.startsWith('Success') ? 'Success' : 'Error'}</AlertTitle>
                                                            <AlertDescription>{deleteTxFeedback}</AlertDescription>
                                                        </Alert>
                                                    )}
                                                    {showDeleteConfirm ? (
                                                        <div className="flex flex-col gap-2 mt-2">
                                                            <p className="text-sm text-red-500">Are you sure? This cannot be undone.</p>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="destructive"
                                                                    onClick={async () => {
                                                                        setIsDeletingTransactions(true);
                                                                        setDeleteTxFeedback('');
                                                                        try {
                                                                            const res = await api.deleteAllTransactions();
                                                                            setDeleteTxFeedback('Success: All transactions deleted.');
                                                                            setShowDeleteConfirm(false);
                                                                            fetchTransactions(); // Refresh transaction list
                                                                        } catch (err) {
                                                                            setDeleteTxFeedback('Error: ' + (err.message || 'Failed to delete transactions.'));
                                                                        } finally {
                                                                            setIsDeletingTransactions(false);
                                                                        }
                                                                    }}
                                                                    disabled={isDeletingTransactions}
                                                                >
                                                                    {isDeletingTransactions ? 'Deleting...' : 'Yes, Delete All'}
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => setShowDeleteConfirm(false)}
                                                                    disabled={isDeletingTransactions}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="destructive"
                                                            onClick={() => { setShowDeleteConfirm(true); setDeleteTxFeedback(''); }}
                                                            disabled={isDeletingTransactions}
                                                        >
                                                            Delete All Transactions
                                                        </Button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        <UnifiedTransferForm
                                            accounts={accounts}
                                            onTransferSuccess={handleActionSuccess}
                                            onOptimisticBalanceUpdate={handleOptimisticBalanceUpdate}
                                            onOptimisticTransactionAdd={handleOptimisticTransactionAdd}
                                        />
                                    </div>
                                )}
                </aside>
            </main>
        </div>
    );
};

export default DashboardPage;