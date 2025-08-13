// src/components/dashboard/TransactionHistory.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../Card.jsx';
import { Alert, AlertTitle, AlertDescription } from '../Alert.jsx';
import Spinner from '../Spinner.jsx';
import Button from '../Button.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import api from '../../services/api.js';

const TransactionHistory = ({ transactions, isLoading, error, accounts, filterAccountId, onShowAll }) => {
    // --- Hooks MUST be called at the top level, in the same order ---
    const INITIAL_DISPLAY_COUNT = 10;
    const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_COUNT); // Hook 1
    const [filteredAccountDisplay, setFilteredAccountDisplay] = useState(null); // Hook 2

    // Effect to update display info (Hook 3)
    useEffect(() => {
        setDisplayLimit(INITIAL_DISPLAY_COUNT); // Reset pagination on filter change
        if (filterAccountId && Array.isArray(accounts)) {
            const filteredAcc = accounts.find(acc => acc._id === filterAccountId);
            if (filteredAcc) {
                const typeCapitalized = filteredAcc.accountNickname || (filteredAcc.accountType?.charAt(0).toUpperCase() + filteredAcc.accountType?.slice(1) || 'Account');
                setFilteredAccountDisplay(`${typeCapitalized} (${filteredAcc.accountNumber})`);
            } else {
                setFilteredAccountDisplay(`Account ID ending ...${filterAccountId.slice(-4)}`);
            }
        } else {
            setFilteredAccountDisplay(null);
        }
    }, [filterAccountId, accounts]);

    // Calculate filtered transactions using useMemo (Hook 4)
    const filteredTransactions = useMemo(() => {
        const safeTransactions = Array.isArray(transactions) ? transactions : [];
        // console.log("[TransactionHistory] Raw transactions received in prop:", safeTransactions); // Log raw props

        if (!filterAccountId) {
            return safeTransactions;
        }
        // Filter based on accountId. Adjust if incoming transfers use a different field like 'toAccountId' or 'relatedAccountId'.
        return safeTransactions.filter(txn =>
            txn && (
                txn.accountId === filterAccountId
                // Example: || txn.toAccountId === filterAccountId // Uncomment if using toAccountId
                // Example: || (txn.relatedAccountId === accounts.find(a=>a._id === filterAccountId)?.accountNumber && txn.type === 'transfer-in') // If using related string
            )
        );
    }, [transactions, filterAccountId /*, accounts */]); // Add accounts if using it in filter logic

    // Filter out potential nulls/invalid AFTER primary filter
    const validFilteredTransactions = useMemo(() => {
        return filteredTransactions.filter(txn => txn && typeof txn === 'object' && txn._id);
    }, [filteredTransactions]);

    // --- Conditional returns can happen AFTER all hooks have been called ---
    if (isLoading) {
        return <div className="flex justify-center items-center p-4"><Spinner /> Loading transactions...</div>;
    }
    if (error) {
        return <Alert variant="destructive"><AlertTitle>Error Loading History</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }
    // --------------------------------------------------------------------

    // Helper to get account details
    const getAccountDetails = (accountId) => {
        if (!accountId) return 'N/A';
        const account = Array.isArray(accounts) ? accounts.find(acc => acc._id === accountId) : null;
        // Use nickname if available, otherwise format type/number
        return account ? (account.accountNickname || `${account.accountType?.charAt(0).toUpperCase() + account.accountType?.slice(1)} (${account.accountNumber})`) : `ID: ...${accountId.slice(-4)}`;
    };

    // Determine transactions for current page/view
    const transactionsToDisplay = validFilteredTransactions.slice(0, displayLimit);
    const hasMoreTransactions = validFilteredTransactions.length > displayLimit;

    // Pagination handlers
    const handleViewAll = () => setDisplayLimit(validFilteredTransactions.length);
    const handleShowLess = () => setDisplayLimit(INITIAL_DISPLAY_COUNT);

    // Delete on double-click handler
    const handleRowDoubleClick = async (txn) => {
        try {
            const confirmDelete = window.confirm('Delete this transaction? This will adjust the account balance.');
            if (!confirmDelete) return;
            await api.request(`/transactions/${txn._id}`, { method: 'DELETE' });
            // Optimistically remove from local list if parent did not re-fetch
            if (typeof onShowAll === 'function') {
                onShowAll(); // Reuse to trigger parent refresh if wired that way
            } else {
                // Fallback: just alert and recommend a refresh
                alert('Transaction deleted. Please refresh the page to see updates.');
            }
        } catch (e) {
            alert(e?.message || 'Failed to delete transaction');
        }
    };

    // No transactions found message
    if (validFilteredTransactions.length === 0 && !isLoading) {
        return (
            <div className="text-center mt-4 p-4 border rounded bg-white shadow-sm">
                <p className="text-gray-500">
                    {filterAccountId ? `No transactions found for ${filteredAccountDisplay || 'this account'}.` : "No transactions recorded yet."}
                </p>
                {filterAccountId && (
                    <Button onClick={onShowAll} variant="link" size="sm" className="mt-2">Show All Transactions</Button>
                )}
            </div>
        );
    }

    // --- Render Table ---
    return (
        <Card className="mt-6">
            <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <CardTitle className="text-base md:text-lg">
                        {filterAccountId ? `History for ${filteredAccountDisplay || 'Selected Account'}` : 'Recent Transactions (All Accounts)'}
                    </CardTitle>
                    {filterAccountId && (
                        <Button onClick={onShowAll} variant="outline" size="sm">Show All</Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                {/* Conditionally show Account column */}
                                {!filterAccountId && (
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                                )}
                                {/* Show related account info when filtering */}
                                {filterAccountId && (
                                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Related Info</th>
                                )}
                                {/* Swap: Description before Type */}
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">{
                            transactionsToDisplay.map((txn) => {
                                if (!txn) return null; // Skip if txn is null/undefined

                                // --- FIX: Prioritize transactionDate (custom), fallback to createdAt (automatic) ---
                                const displayDate = formatDate(txn.transactionDate || txn.createdAt);
                                // ---------------------------------------------------------------------------------

                                // --- Other calculations ---
                                // Pass the value (expected string from backend) directly to formatCurrency
                                const amountStr = formatCurrency(txn.amount);
                                const balanceAfterStr = formatCurrency(txn.balanceAfter); // formatCurrency handles undefined/null -> N/A

                                // Determine credit/debit based on type for the specific account being viewed
                                let isCredit = false;
                                let isDebit = false;
                                const txnTypeLower = txn.type?.toLowerCase();

                                if (filterAccountId) {
                                    // Viewing a specific account's history
                                    if (txn.accountId === filterAccountId) {
                                        // Transaction originated from this account
                                        if (txnTypeLower === 'deposit' || txnTypeLower === 'transfer-in') isCredit = true;
                                        if (txnTypeLower === 'withdrawal' || txnTypeLower === 'transfer-out') isDebit = true;
                                    } else {
                                         // Transaction involved this account but didn't originate from it (e.g., received transfer)
                                         // This logic depends heavily on how incoming transfers are stored (e.g., using toAccountId)
                                         // Assuming 'transfer-in' type means credit for the accountId listed
                                         if (txnTypeLower === 'transfer-in') isCredit = true;
                                         // Add more conditions if needed based on your schema for incoming transfers
                                    }
                                } else {
                                    // Viewing all transactions - simplify based on type
                                    if (txnTypeLower === 'deposit' || txnTypeLower === 'transfer-in') isCredit = true;
                                    if (txnTypeLower === 'withdrawal' || txnTypeLower === 'transfer-out') isDebit = true;
                                }


                                let relatedInfo = '-';
                                // Calculate relatedInfo based on transfer type and whether filtering
                                if (txnTypeLower?.includes('transfer')) {
                                    if (filterAccountId) {
                                        // Viewing specific account
                                        if (txn.accountId === filterAccountId && txn.relatedAccountId) { // Transfer Out
                                            // Try finding related account by number/ID stored in relatedAccountId
                                            const relatedAcc = Array.isArray(accounts) ? accounts.find(a => a.accountNumber === txn.relatedAccountId || a._id === txn.relatedAccountId) : null;
                                            relatedInfo = `To: ${relatedAcc ? (relatedAcc.accountNickname || `Acc ${relatedAcc.accountNumber}`) : (txn.relatedAccountId || 'External')}`;
                                        } else if (txn.relatedAccountId) { // Transfer In (assuming relatedAccountId stores the sender)
                                            const relatedAcc = Array.isArray(accounts) ? accounts.find(a => a.accountNumber === txn.relatedAccountId || a._id === txn.relatedAccountId) : null;
                                            relatedInfo = `From: ${relatedAcc ? (relatedAcc.accountNickname || `Acc ${relatedAcc.accountNumber}`) : (txn.relatedAccountId || 'External')}`;
                                        }
                                    } else {
                                        // Viewing all accounts - less context for 'related'
                                        relatedInfo = txn.relatedAccountId ? `Rel: ${txn.relatedAccountId}` : '-';
                                    }
                                } else if (txnTypeLower === 'withdrawal' && txn.withdrawalMethod) {
                                     relatedInfo = `Method: ${txn.withdrawalMethod}`;
                                }
                                // -----------------------

                                return (<tr key={txn._id} className="hover:bg-gray-50" onDoubleClick={() => handleRowDoubleClick(txn)}>
                                    {/* Date */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {displayDate}
                                    </td>

                                    {/* Account (only when not filtering) */}
                                    {!filterAccountId && (
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{getAccountDetails(txn.accountId)}</td>
                                    )}
                                    {/* Related Info (only when filtering) */}
                                     {filterAccountId && (
                                         <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-[150px] truncate" title={relatedInfo}>{relatedInfo}</td>
                                     )}

                                    {/* Swap: Description before Type */}
                                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={txn.description}>{txn.description || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">{txn.type?.replace('-', ' ') || 'N/A'}</td>
                                    {/* Amount */}
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                                         isCredit ? 'text-green-600' : (isDebit ? 'text-red-600' : 'text-gray-700') // Color based on credit/debit
                                     }`}>
                                        {/* Show +/- sign based on credit/debit */}
                                        {amountStr !== 'N/A' ? (isCredit ? '+' : (isDebit ? '-' : '')) : ''}{amountStr}
                                     </td>
                                    {/* Balance After */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{balanceAfterStr}</td>
                                </tr>);
                            })
                        }</tbody>
                    </table>
                </div>
                {/* Pagination Buttons */}
                <div className="mt-4 text-center space-x-4">
                    {hasMoreTransactions && <Button onClick={handleViewAll} variant="outline" size="sm"> View All ({validFilteredTransactions.length}) </Button>}
                    {!hasMoreTransactions && validFilteredTransactions.length > INITIAL_DISPLAY_COUNT && <Button onClick={handleShowLess} variant="outline" size="sm"> Show Less </Button>}
                </div>
            </CardContent>
        </Card>
    );
};
export default TransactionHistory;
