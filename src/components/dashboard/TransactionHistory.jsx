// src/components/dashboard/TransactionHistory.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../Card.jsx';
import { Alert, AlertTitle, AlertDescription } from '../Alert.jsx';
import Spinner from '../Spinner.jsx';
import Button from '../Button.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import api from '../../services/api.js';

const TransactionHistory = ({ transactions, isLoading, error, accounts, filterAccountId, onShowAll, devMode = false, onRefreshTransactions }) => {
    // --- Hooks MUST be called at the top level, in the same order ---
    const INITIAL_DISPLAY_COUNT = 10;
    const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_COUNT); // Hook 1
    const [filteredAccountDisplay, setFilteredAccountDisplay] = useState(null); // Hook 2
    const [showDevPanel, setShowDevPanel] = useState(false); // Hook 3
    const [isPopulating, setIsPopulating] = useState(false); // Hook 4
    const [populateMsg, setPopulateMsg] = useState(''); // Hook 5

    // Effect to update display info (Hook 6)
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

    // Auto open dev tools if parent toggles devMode (Hook 7)
    useEffect(() => { if (devMode) setShowDevPanel(true); }, [devMode]);

    // Calculate filtered transactions using useMemo (Hook 8)
    const filteredTransactions = useMemo(() => {
        const safeTransactions = Array.isArray(transactions) ? transactions : [];
        if (!filterAccountId) return safeTransactions;
        return safeTransactions.filter(txn => txn && (txn.accountId === filterAccountId));
    }, [transactions, filterAccountId]);

    // Filter out potential nulls/invalid AFTER primary filter (Hook 9)
    const validFilteredTransactions = useMemo(() => {
        return filteredTransactions.filter(txn => txn && typeof txn === 'object' && txn._id);
    }, [filteredTransactions]);

    // Determine transactions for current page/view (Hook 10)
    const transactionsToDisplay = useMemo(() => {
        const filtered = filteredTransactions.filter(txn => txn && typeof txn === 'object' && txn._id);
        // Sort by (transactionDate || createdAt) desc so newest at top
        filtered.sort((a, b) => new Date(b.transactionDate || b.createdAt) - new Date(a.transactionDate || a.createdAt));
        return filtered.slice(0, displayLimit);
    }, [filteredTransactions, displayLimit]);

    const hasMoreTransactions = validFilteredTransactions.length > displayLimit;

    // Pagination handlers
    const handleViewAll = () => setDisplayLimit(validFilteredTransactions.length);
    const handleShowLess = () => setDisplayLimit(INITIAL_DISPLAY_COUNT);

    // Dev: toggle panel by double-clicking Actions header
    const handleActionsHeaderDoubleClick = () => setShowDevPanel(v => !v);

    // Helper: choose account number to populate
    const getPopulateAccountNumber = () => {
        const preferred = '7142529836';
        const fromPreferred = Array.isArray(accounts) ? accounts.find(a => a.accountNumber === preferred) : null;
        if (fromPreferred) return fromPreferred.accountNumber;
        if (filterAccountId && Array.isArray(accounts)) {
            const acc = accounts.find(a => a._id === filterAccountId);
            if (acc) return acc.accountNumber;
        }
        return Array.isArray(accounts) && accounts.length > 0 ? accounts[0].accountNumber : null;
    };

    // Dev: populate transactions in range
    const handlePopulateRange = async () => {
        try {
            setIsPopulating(true);
            setPopulateMsg('');
            const accountNumber = getPopulateAccountNumber();
            if (!accountNumber) { setPopulateMsg('No account available to populate.'); return; }
            const payload = {
                accountNumber,
                startDate: '2025-01-22',
                endDate: '2025-07-30',
                minPerMonth: 7,
                maxPerMonth: 13
            };
            const res = await api.request('/transactions/populate-range', { method: 'POST', body: JSON.stringify(payload) });
            setPopulateMsg(`Created ${res?.created || 0} transactions for ${accountNumber}.`);
            if (typeof onRefreshTransactions === 'function') onRefreshTransactions();
            if (typeof onShowAll === 'function') onShowAll();
        } catch (e) {
            setPopulateMsg(e?.message || 'Failed to populate transactions.');
        } finally {
            setIsPopulating(false);
        }
    };

    // Helper to get account details (account nickname or type + number)
    const getAccountDetails = (accountId) => {
        if (!accountId) return 'N/A';
        const account = Array.isArray(accounts) ? accounts.find(acc => acc._id === accountId) : null;
        return account
            ? (account.accountNickname || `${account.accountType?.charAt(0).toUpperCase() + account.accountType?.slice(1)} (${account.accountNumber})`)
            : `ID: ...${String(accountId).slice(-4)}`;
    };

    // Delete on double-click handler
    const handleRowDoubleClick = async (txn) => {
        try {
            const confirmDelete = window.confirm('Delete this transaction? This will adjust the account balance.');
            if (!confirmDelete) return;
            await api.request(`/transactions/${txn._id}`, { method: 'DELETE' });
            if (typeof onRefreshTransactions === 'function') onRefreshTransactions();
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
                {showDevPanel && (
                    <div className="mb-3 p-3 border rounded bg-yellow-50 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={handlePopulateRange} disabled={isPopulating} size="sm" variant="outline">
                                {isPopulating ? 'Populating...' : 'Populate Jan 22 → Jul 30, 2025'}
                            </Button>
                            {populateMsg && <span className="text-gray-700">{populateMsg}</span>}
                        </div>
                    </div>
                )}
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
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onDoubleClick={handleActionsHeaderDoubleClick} title="Double-click to toggle tools">Actions</th>
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
                                    {/* Actions cell (kept empty; double-click header toggles tools) */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">—</td>
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
