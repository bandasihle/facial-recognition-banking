const { useState, useEffect } = React;

// --- Styles for ATM Interface (Inline for simplicity or added to CSS later) ---
// We will rely mostly on global styles but add some specific ones here if needed?
// Actually, let's use the existing CSS classes as much as possible to keep consistency.

/* 
  Mock Data Handling:
  The 'user' prop passed to ATMContainer will be the starting point.
  We will maintain 'local' state for the session.
*/

const ATMContainer = ({ user, onLogout }) => {
    const [currentUser, setCurrentUser] = useState(user);
    const [currentScreen, setCurrentScreen] = useState('MAIN_MENU'); // MAIN_MENU, WITHDRAW, DEPOSIT, TRANSFER, BALANCE, HISTORY
    const [message, setMessage] = useState(null); // For success/error toasts

    // Helper to format currency
    const formatCurrency = (val) => {
        // Remove non-numeric chars for calculation if string
        let numId = val;
        if (typeof val === 'string') {
            numId = parseFloat(val.replace(/[^0-9.-]+/g, ""));
        }
        return `R ${numId.toFixed(2)}`;
    };

    // Helper to parse balance string to number
    const parseBalance = (balStr) => {
        if (typeof balStr === 'number') return balStr;
        return parseFloat(balStr.replace(/[^0-9.-]+/g, ""));
    };

    const updateBalance = (amount, type, description) => {
        const currentBal = parseBalance(currentUser.balance);
        let newBal = currentBal;

        if (type === 'credit') {
            newBal += amount;
        } else if (type === 'debit') {
            if (currentBal < amount) return false; // Insufficient funds
            newBal -= amount;
        }

        const newTransaction = {
            title: description,
            date: 'Just now',
            amount: (type === 'credit' ? '+ ' : '- ') + formatCurrency(amount)
        };

        const updatedUser = {
            ...currentUser,
            balance: formatCurrency(newBal),
            transactions: [newTransaction, ...currentUser.transactions]
        };

        setCurrentUser(updatedUser);
        // Sync back to global/local storage if needed (optional for prototype)
        return true;
    };

    const renderScreen = () => {
        switch (currentScreen) {
            case 'MAIN_MENU':
                return <MainMenu
                    user={currentUser}
                    onNavigate={setCurrentScreen}
                    onLogout={onLogout}
                />;
            case 'WITHDRAW':
                return <WithdrawScreen
                    balance={parseBalance(currentUser.balance)}
                    onConfirm={(amount) => {
                        const success = updateBalance(amount, 'debit', 'Cash Withdrawal');
                        if (success) {
                            setMessage(`Successfully withdrew R${amount}`);
                            setCurrentScreen('MAIN_MENU');
                        } else {
                            setMessage('Insufficient funds!');
                        }
                    }}
                    onBack={() => setCurrentScreen('MAIN_MENU')}
                />;
            case 'DEPOSIT':
                return <DepositScreen
                    onConfirm={(amount) => {
                        updateBalance(amount, 'credit', 'Cash Deposit');
                        setMessage(`Successfully deposited R${amount}`);
                        setCurrentScreen('MAIN_MENU');
                    }}
                    onBack={() => setCurrentScreen('MAIN_MENU')}
                />;
            case 'TRANSFER':
                return <TransferScreen
                    balance={parseBalance(currentUser.balance)}
                    onConfirm={(amount, beneficiary) => {
                        const success = updateBalance(amount, 'debit', `Transfer to ${beneficiary}`);
                        if (success) {
                            setMessage(`Transferred R${amount} to ${beneficiary}`);
                            setCurrentScreen('MAIN_MENU');
                        } else {
                            setMessage('Insufficient funds!');
                        }
                    }}
                    onBack={() => setCurrentScreen('MAIN_MENU')}
                />;
            case 'BALANCE':
                return <BalanceScreen
                    user={currentUser}
                    onBack={() => setCurrentScreen('MAIN_MENU')}
                />;
            case 'HISTORY':
                return <HistoryScreen
                    transactions={currentUser.transactions}
                    onBack={() => setCurrentScreen('MAIN_MENU')}
                />;
            default:
                return <div>Unknown Screen</div>;
        }
    };

    return (
        <div className="atm-interface" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="atm-header dashboard-header">
                <h2>SecureBank ATM</h2>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{currentUser.name}</div>
            </div>

            <div className="atm-screen-container" style={{ flex: 1, position: 'relative' }}>
                {message && (
                    <div className="atm-toast" style={{
                        position: 'absolute', top: 0, left: 0, width: '100%',
                        padding: '1rem', background: 'var(--success)', color: '#000',
                        zIndex: 10, borderRadius: '8px', textAlign: 'center',
                        animation: 'fadeInOut 3s forwards'
                    }}>
                        {message}
                        {/* Auto hide message after 3s */}
                        {setTimeout(() => setMessage(null), 3000) && ""}
                    </div>
                )}
                {renderScreen()}
            </div>
        </div>
    );
};

// --- Components ---

const MainMenu = ({ user, onNavigate, onLogout }) => {
    const menuItems = [
        { label: 'Check Balance', action: () => onNavigate('BALANCE'), icon: '💰' },
        { label: 'Withdraw Cash', action: () => onNavigate('WITHDRAW'), icon: '🏧' },
        { label: 'Deposit Funds', action: () => onNavigate('DEPOSIT'), icon: '📥' },
        { label: 'Transfer', action: () => onNavigate('TRANSFER'), icon: '➡️' },
        { label: 'Recent History', action: () => onNavigate('HISTORY'), icon: '📜' },
    ];

    return (
        <div className="main-menu" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', height: '100%', alignContent: 'center' }}>
            {menuItems.map((item, idx) => (
                <button key={idx} onClick={item.action} className="btn primary" style={{
                    height: '100px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
                }}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</span>
                    {item.label}
                </button>
            ))}
            <button onClick={onLogout} className="btn secondary" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                Return Card / Logout
            </button>
        </div>
    );
};

const WithdrawScreen = ({ balance, onConfirm, onBack }) => {
    const [customAmount, setCustomAmount] = useState('');
    const presets = [100, 200, 500, 1000, 2000];

    return (
        <div className="screen-content">
            <h3>Select Withdrawal Amount</h3>
            <p className="subtitle">Available: R {balance.toFixed(2)}</p>

            <div className="presets" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1.5rem 0' }}>
                {presets.map(amt => (
                    <button key={amt} className="btn secondary" onClick={() => onConfirm(amt)}>
                        R {amt}
                    </button>
                ))}
            </div>

            <div className="custom-input" style={{ marginBottom: '1rem' }}>
                <input
                    type="number"
                    placeholder="Or enter custom amount"
                    className="input-field"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                />
            </div>

            <div className="btn-group">
                <button
                    className="btn primary"
                    disabled={!customAmount || parseFloat(customAmount) <= 0}
                    onClick={() => onConfirm(parseFloat(customAmount))}
                >
                    Confirm Withdrawal
                </button>
                <button className="btn secondary" onClick={onBack}>Cancel</button>
            </div>
        </div>
    );
};

const DepositScreen = ({ onConfirm, onBack }) => {
    const [amount, setAmount] = useState('');

    return (
        <div className="screen-content">
            <h3>Deposit Cash</h3>
            <p className="subtitle">Please enter the amount to deposit.</p>

            <div style={{ margin: '2rem 0' }}>
                <input
                    type="number"
                    placeholder="Amount (R)"
                    className="input-field"
                    style={{ fontSize: '1.5rem', textAlign: 'center' }}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>

            <div className="btn-group">
                <button
                    className="btn primary"
                    disabled={!amount || parseFloat(amount) <= 0}
                    onClick={() => onConfirm(parseFloat(amount))}
                >
                    Confirm Deposit
                </button>
                <button className="btn secondary" onClick={onBack}>Cancel</button>
            </div>
        </div>
    );
};

const TransferScreen = ({ balance, onConfirm, onBack }) => {
    const [amount, setAmount] = useState('');
    const [beneficiary, setBeneficiary] = useState('');

    return (
        <div className="screen-content">
            <h3>Transfer Funds</h3>
            <p className="subtitle">Available: R {balance.toFixed(2)}</p>

            <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    type="text"
                    placeholder="Beneficiary Name / Account"
                    className="input-field"
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Amount (R)"
                    className="input-field"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>

            <div className="btn-group">
                <button
                    className="btn primary"
                    disabled={!amount || !beneficiary || parseFloat(amount) <= 0}
                    onClick={() => onConfirm(parseFloat(amount), beneficiary)}
                >
                    Send Payment
                </button>
                <button className="btn secondary" onClick={onBack}>Cancel</button>
            </div>
        </div>
    );
};

const BalanceScreen = ({ user, onBack }) => {
    return (
        <div className="screen-content" style={{ textAlign: 'center', paddingTop: '2rem' }}>
            <h3>Current Balance</h3>
            <h1 style={{ fontSize: '3rem', margin: '2rem 0', color: 'var(--primary-color)' }}>
                {/* Ensure balance is displayed correctly whether string or number */}
                {typeof user.balance === 'number' ? `R ${user.balance.toFixed(2)}` : user.balance}
            </h1>
            <div className="account-details" style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>
                <p>Account Holder: {user.name}</p>
                <p>Account Type: Savings Details</p>
            </div>
            <button className="btn primary" onClick={onBack}>Back to Menu</button>
        </div>
    );
};

const HistoryScreen = ({ transactions, onBack }) => {
    return (
        <div className="screen-content" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3>Transaction History</h3>
            <div className="history-list" style={{ flex: 1, overflowY: 'auto', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                {transactions.map((t, idx) => (
                    <div key={idx} className="transaction-item">
                        <div className="t-info">
                            <h5>{t.title}</h5>
                            <span className="t-date">{t.date}</span>
                        </div>
                        <div className={`t-amount ${t.amount.includes('+') ? 'plus' : 'minus'}`}>
                            {t.amount}
                        </div>
                    </div>
                ))}
            </div>
            <button className="btn secondary" onClick={onBack} style={{ marginTop: '1rem' }}>Back</button>
        </div>
    );
};


// --- Mount Function ---
window.mountATM = (user) => {
    const rootEl = document.getElementById('atm-root');
    if (!rootEl) {
        console.error("ATM Root element not found!");
        return;
    }

    // Unmount any existing root (not strictly necessary with this simple flow, but good practice)
    if (window.atmRoot) {
        window.atmRoot.unmount();
    }

    const root = ReactDOM.createRoot(rootEl);
    window.atmRoot = root; // Store for cleanup

    root.render(
        <ATMContainer
            user={user}
            onLogout={() => {
                // Determine how to logout. 
                // We can call a global function or dispatch an event.
                // For now, let's call the button click handler if it exists, or refresh.
                // Or better, interact with DOM.

                // Trigger the hidden logout logic in app.js
                // But app.js logic is bound to #logout-btn click.
                // We can't click it because it's replaced/hidden.
                // So we need to expose a logout function or reload the page for safety.

                window.location.reload(); // Safest "Return Card" simulation
            }}
        />
    );
};
