import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { connectWallet, getContract, switchNetwork } from '../utils/web3';
import axios from 'axios';
import '../App.css';

const Dashboard = ({ user, onLogout }) => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [role, setRole] = useState(null); // 0: Citizen, 1: Admin
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState("0");
    const [networkName, setNetworkName] = useState("Unknown");
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'assets', 'requests'
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Recovery State
    const [connectionError, setConnectionError] = useState(null); // 'MISSING_CONTRACT' | 'NETWORK_ERROR'
    const [repairing, setRepairing] = useState(false);

    // Blockchain Registration State
    const [isRegisteredOnChain, setIsRegisteredOnChain] = useState(false); // [FIX] Default to false until verified

    // Theme
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    // Data
    const [lands, setLands] = useState([]);
    const [allLands, setAllLands] = useState([]); // [NEW] Store all lands
    const [showAllLands, setShowAllLands] = useState(false); // [NEW] Toggle state
    const [fundRequests, setFundRequests] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [stats, setStats] = useState({ totalLands: 0, totalRequests: 0, myLands: 0 });
    const [transactions, setTransactions] = useState([]); // [NEW] History

    // Forms
    const [location, setLocation] = useState("");
    const [area, setArea] = useState("");
    const [landDocument, setLandDocument] = useState(null);
    const [fundPurpose, setFundPurpose] = useState("");
    const [fundAmount, setFundAmount] = useState("");

    const AI_API = "http://127.0.0.1:8000";

    // AI Insights & Chat
    const [aiInsights, setAiInsights] = useState({ suggestions: [], notifications: [] });
    const [chatMessages, setChatMessages] = useState([
        { sender: 'bot', text: "Hello! I'm your E-Governance Assistant. How can I help you today?" }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        const fetchBalance = async () => {
            if (account && window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const bal = await provider.getBalance(account);
                setBalance(ethers.formatEther(bal));

                const net = await provider.getNetwork();
                setNetworkName(net.name === 'unknown' ? `Localhost (${net.chainId})` : net.name);
            }
        };
        fetchBalance();
        // Poll balance every 5 seconds
        const interval = setInterval(fetchBalance, 5000);
        return () => clearInterval(interval);
    }, [account]);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const res = await axios.get(`${AI_API}/insights`);
                setAiInsights(res.data);
            } catch (err) {
                console.error("Failed to load AI insights", err);
            }
        };
        fetchInsights();
        // Poll every 30 seconds for updates
        const interval = setInterval(fetchInsights, 30000);
        return () => clearInterval(interval);
    }, []);

    const connect = async () => {
        try {
            const { signer, address, provider } = await connectWallet();
            setAccount(address);

            const bal = await provider.getBalance(address);
            setBalance(ethers.formatEther(bal));

            const net = await provider.getNetwork();
            setNetworkName(net.name === 'unknown' ? `Localhost (${net.chainId})` : net.name);

            if (net.chainId.toString() !== "31337" && net.chainId.toString() !== "1337") {
                await switchNetwork();
            }

            // [FIX] Fetch Data IMMEDIATELY (MongoDB source of truth)
            // Pass null for contract initially directly to avoid dependency on contract connection success
            await fetchData(null, address);

            try {
                const contractInstance = await getContract(signer);

                // [FIX] Verify contract exists on-chain
                const code = await provider.getCode(contractInstance.target);
                if (code === "0x") {
                    console.warn("Contract not found at address " + contractInstance.target);
                    // Contract Code Missing -> Blockchain Reset Detected
                    setConnectionError('MISSING_CONTRACT');
                    setContract(null);
                    setIsRegisteredOnChain(false);
                    return;
                }

                // If code found, clear error
                setConnectionError(null);

                setContract(contractInstance);

                const userStruct = await contractInstance.users(address);
                console.log("Blockchain User Struct:", userStruct);

                // Check if registered
                if (!userStruct.isRegistered) {
                    console.warn("User not registered on blockchain!");
                    setIsRegisteredOnChain(false);
                    setRole(0); // Default to Citizen view if not registered
                } else {
                    setIsRegisteredOnChain(true);
                    setRole(Number(userStruct.role));
                }

                // If contract connected successfully, fetch again to include blockchain-specific data (Request Funds)
                fetchData(contractInstance, address);

            } catch (bcErr) {
                console.warn("Blockchain connection error (Chain might be reset):", bcErr);
                // alert("Failed to connect to Smart Contract. Check console for details.");
                setIsRegisteredOnChain(false); // Assume not registered if we can't check
            }

        } catch (err) {
            console.error("Connection Error:", err);
        }
    };

    const fetchData = async (contractInstance, userAddress) => {
        try {
            if (!contractInstance) return;

            // FETCH LANDS FROM BLOCKCHAIN
            const lCount = await contractInstance.landCount();
            console.log("Blockchain Land Count:", Number(lCount));
            const blockchainLands = [];

            for (let i = 1; i <= Number(lCount); i++) {
                const land = await contractInstance.lands(i);
                console.log(`Land #${i}:`, land);
                // struct Land { id, location, area, owner, status }
                blockchainLands.push({
                    landId: land.id,
                    location: land.location,
                    area: land.area,
                    owner: land.owner,
                    status: Number(land.status) // 0: Pending, 1: Approved, 2: Rejected
                });
            }
            console.log("All Fetched Lands:", blockchainLands);
            setAllLands(blockchainLands);

            const myChainLands = blockchainLands.filter(l => l.owner && l.owner.toLowerCase() === userAddress.toLowerCase());
            console.log("My Lands Filtered:", myChainLands);
            setLands(myChainLands);

            // Fetch History from Events (Basic Implementation)
            // Fetch History from Events
            try {
                // Ensure we query from the beginning of the chain (since it's reset often)
                const filter = contractInstance.filters.LandRegistered(null, userAddress);
                const events = await contractInstance.queryFilter(filter, 0); // Start from block 0

                console.log("Raw Events Found:", events);
                const history = events.map(e => ({
                    type: 'LAND_REGISTRATION',
                    details: `Registered land at ID #${e.args[0]}`,
                    user: userAddress,
                    status: 'Success',
                    createdAt: (new Date()).toISOString() // In a real app, fetch block timestamp
                })).reverse();
                setTransactions(history);
            } catch (histErr) {
                console.warn("Error fetching history:", histErr);
            }

            // Fetch Requests
            let reqCount = 0;
            try {
                reqCount = await contractInstance.fundRequestCount();
                const loadedReqs = [];
                const myReqs = [];
                for (let i = 1; i <= Number(reqCount) && i <= 20; i++) {
                    const req = await contractInstance.getFundRequest(i);
                    loadedReqs.push(req);
                    if (req.requester.toLowerCase() === userAddress.toLowerCase()) {
                        myReqs.push(req);
                    }
                }
                setFundRequests(loadedReqs);
                setMyRequests(myReqs);
            } catch (reqErr) {
                console.warn("Error fetching requests:", reqErr);
            }

            // Always update stats with what we have
            setStats({ totalLands: blockchainLands.length, totalRequests: Number(reqCount), myLands: myChainLands.length });

        } catch (error) {
            console.error("Error fetching data from blockchain:", error);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const { signer } = await connectWallet();
            const contractInstance = await getContract(signer);
            setContract(contractInstance);
            await fetchData(contractInstance, account);
        } catch (err) {
            console.error("Refresh failed:", err);
        }
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleRegisterLand = async () => {
        if (!contract) return;

        // [FIX] Check if contract exists on-chain before sending tx
        let code = '0x';
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            code = await provider.getCode(contract.target);
        } catch (e) {
            console.error("Failed to check contract code:", e);
        }

        if (code === '0x') {
            alert("Error: Contract not deployed. Please waiting for auto-repair or restart.");
            return;
        }

        setLoading(true);
        try {
            const tx = await contract.registerLand(location, Number(area));
            console.log("Transaction Sent:", tx.hash);
            await tx.wait();
            console.log("Transaction Mined");

            if (landDocument) {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const base64String = reader.result;
                        const lCount = await contract.landCount();
                        localStorage.setItem('land_doc_' + Number(lCount), base64String);
                    } catch (e) {
                        alert("Ownership Document too large to save in local storage! Try a smaller image.");
                    }
                };
                reader.readAsDataURL(landDocument);
            }

            // [NEW] Send registry request to the backend
            try {
                await axios.post('http://localhost:5000/api/land/add', {
                    location: location,
                    area: Number(area),
                    owner: account,
                    status: 0,
                    transactionHash: tx.hash
                });
                
                await axios.post('http://localhost:5000/api/transaction/add', {
                    type: 'LAND_REGISTRATION',
                    details: `Registered land at ${location}`,
                    user: account,
                    status: 'Success',
                    transactionHash: tx.hash
                });
                console.log("Registry request sent to backend successfully.");
            } catch (err) {
                console.error("Failed to send registry request to backend:", err);
                alert("Blockchain registration succeeded, but failed to sync with backend database.");
            }

            alert(`Land Registered Successfully!\nTx Hash: ${tx.hash}`);
            fetchData(contract, account);
            setLocation(""); setArea(""); setLandDocument(null);
        } catch (err) {
            console.error("Registration Error:", err);
            alert("Error: " + err.message);
            // Check for Nonce Error
            if (err.message.includes("Nonce too high") || err.message.includes("nonce")) {
                alert("⚠️ METAMASK ERROR DETECTED ⚠️\n\nYour MetaMask wallet is out of sync with the new blockchain.\n\nPLEASE FIX:\n1. Open MetaMask\n2. Go to Settings > Advanced\n3. Click 'Clear Activity Tab Data'\n4. Try again.");
            }

            // [NEW] Log failed transaction
            try {
                await axios.post('http://localhost:5000/api/transaction/add', {
                    type: 'LAND_REGISTRATION',
                    details: `Failed registration at ${location}`,
                    user: account,
                    status: 'Failed',
                    error: err.reason || err.message
                });
            } catch (e) {
                console.error("Could not log failed transaction", e);
            }

            fetchData(contract, account);
        }
        setLoading(false);
    };

    const handleRegisterOnBlockchain = async () => {
        if (!contract) {
            alert("Blockchain not connected! Please check your network and try refreshing or reconnecting.");
            return;
        }
        setLoading(true);
        try {
            console.log("Registering on blockchain with:", user.fullName);
            const userRole = user?.role === 'admin' ? 1 : 0;
            const tx = await contract.registerUser(user.fullName || "Unknown", userRole, "email-hash-placeholder");
            await tx.wait();

            alert("Successfully Registered on Blockchain!");
            setIsRegisteredOnChain(true);

            // Refetch role and data
            const userStruct = await contract.users(account);
            setRole(Number(userStruct.role));
            if (Number(userStruct.role) === 1) setActiveTab('admin');
            fetchData(contract, account);

        } catch (err) {
            console.error("Blockchain Registration Failed:", err);
            alert("Registration Failed: " + (err.reason || err.message));
        }
        setLoading(false);
    };

    const handleRequestFunds = async () => {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.requestFunds(fundPurpose, Number(fundAmount));
            await tx.wait();
            alert("Fund Request Submitted!");
            fetchData(contract, account);
            setFundPurpose(""); setFundAmount("");
        } catch (err) { alert("Error: " + err.message); }
        setLoading(false);
    };



    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        const userMsg = { sender: 'user', text: chatInput };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput("");
        setChatLoading(true);

        try {
            // Call ML Engine Chat API
            const res = await axios.post(`${AI_API}/chat`, { message: userMsg.text });
            const botMsg = { sender: 'bot', text: res.data.response };
            setChatMessages(prev => [...prev, botMsg]);
        } catch (err) {
            console.error("Chat Error:", err);
            const errorMsg = { sender: 'bot', text: "Sorry, I'm having trouble connecting to the AI engine right now." };
            setChatMessages(prev => [...prev, errorMsg]);
        }
        setChatLoading(false);
    };

    // --- COMPONENT RENDER ---

    const handleRepair = async () => {
        setRepairing(true);
        try {
            await axios.post('http://localhost:5000/api/admin/redeploy');
            alert("Contract Redeployed! Reloading...");
            window.location.reload();
        } catch (e) {
            alert("Repair Failed: " + e.message + "\n\nTry running 'npx hardhat run scripts/deploy.js --network localhost' manually.");
        }
        setRepairing(false);
    };

    if (connectionError === 'MISSING_CONTRACT') {
        return (
            <div className="login-container">
                <div className="login-box" style={{ textAlign: 'center', padding: '2rem' }}>
                    <h2 style={{ color: 'var(--danger)' }}>⚠️ Blockchain Reset Detected</h2>
                    <p>The local blockchain was restarted, but the Smart Contract is missing.</p>

                    <button className="login-btn" onClick={handleRepair} disabled={repairing} style={{ marginTop: '1rem', background: 'var(--primary)' }}>
                        {repairing ? "Repairing..." : "🛠️ Auto-Repair (Redeploy Contract)"}
                    </button>

                    <p style={{ fontSize: '0.8rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                        Or run this manually in terminal:<br />
                        <code>npx hardhat run scripts/deploy.js --network localhost</code>
                    </p>
                </div>
            </div>
        );
    }

    if (!account) {
        return (
            <div className="login-container">
                <div className="login-left">
                    <div className="login-brand-icon">🏛️</div>
                    <h1>E-Governance</h1>
                    <h2>Portal</h2>
                </div>
                <div className="login-right">
                    <div className="login-box">
                        <div className="login-header"><h2>Authentication</h2><p>Connect your wallet to access.</p></div>
                        <div className="login-form">
                            <button className="login-btn" onClick={connect} style={{ marginTop: '1rem' }}>🦊 Connect MetaMask</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header"><h1>E-Gov</h1></div>
                <ul className="nav-menu">
                    <li className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} title="Overview">📊</li>
                    <li className={`nav-item ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => setActiveTab('assets')} title="Land Registry">🌍</li>
                    <li className={`nav-item ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')} title="Support">🤝</li>

                </ul>
            </aside>

            <main className="main-content">
                {/* Top Nav */}
                <div className="top-bar" style={{ justifyContent: 'space-between' }}>
                    {/* Left: Logo */}
                    <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                        <div style={{ width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>🏛️</div>
                        <span>E-Governance</span>
                    </div>

                    {/* Right: Search & Actions */}
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>

                        {!isRegisteredOnChain && (
                            <button
                                onClick={handleRegisterOnBlockchain}
                                disabled={loading}
                                style={{ background: 'var(--danger)', color: 'white', animation: 'pulse 2s infinite' }}
                            >
                                {loading ? "Registering..." : "⚠️ Register on Blockchain"}
                            </button>
                        )}

                        <div className="search-bar" style={{ width: '300px' }}>
                            <input type="text" className="search-input" placeholder="Search..." style={{ margin: 0 }} />
                        </div>

                        <button className="secondary" onClick={() => alert("Feature Coming Soon")} style={{ whiteSpace: 'nowrap' }}>+ New Request</button>
                        <button onClick={handleRefresh} disabled={loading || isRefreshing} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '0.5rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'inline-block', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span> Refresh Data
                        </button>

                        <button onClick={toggleTheme} style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '1.2rem' }}>
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '1rem', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Balance</span>
                            <span style={{ fontWeight: 'bold' }}>{parseFloat(balance).toFixed(4)} ETH</span>
                        </div>

                        <div className="user-info">
                            <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{user?.fullName || (role === 1 ? "Admin User" : "Citizen User")}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{account.slice(0, 6)}...{account.slice(-4)}</div>
                                <button onClick={onLogout} style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', marginTop: '0.2rem', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}>Logout</button>
                            </div>
                            <div style={{ width: '40px', height: '40px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                        </div>
                    </div>
                </div>

                {/* CRM Split Layout */}
                <div className="crm-container">
                    <div className="crm-main">
                        <div className="crm-tabs">
                            <div className={`crm-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</div>
                            <div className={`crm-tab ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => setActiveTab('assets')}>Assets</div>
                            <div className={`crm-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</div>
                            <div className={`crm-tab ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>Requests</div>

                        </div>

                        {/* Content Switching */}
                        {activeTab === 'overview' && (
                            <div className="grid">
                                <div className="card">
                                    <h3>Total Assets</h3>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{stats.totalLands}</p>
                                    <p style={{ color: 'var(--text-secondary)' }}>Registered Properties</p>
                                </div>
                                <div className="card">
                                    <h3>My Assets</h3>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{stats.myLands}</p>
                                    <p style={{ color: 'var(--text-secondary)' }}>Owned by You</p>
                                </div>
                                <div className="card">
                                    <h3>Pending Requests</h3>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{fundRequests.length}</p>
                                    <p style={{ color: 'var(--text-secondary)' }}>Awaiting Approval</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'assets' && (
                            <div>
                                <div className="card">
                                    <h2>Register New Land</h2>
                                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Location Name</label>
                                            <input type="text" placeholder="Enter location name" value={location} onChange={e => setLocation(e.target.value)} style={{ width: '100%', marginBottom: 0 }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Area (sq ft)</label>
                                            <input type="number" placeholder="Enter area in sq ft" value={area} onChange={e => setArea(e.target.value)} style={{ width: '100%', marginBottom: 0 }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ownership Document (Optional)</label>
                                            <input type="file" onChange={e => setLandDocument(e.target.files[0])} style={{ width: '100%', marginBottom: 0, padding: '0.65rem 1rem' }} />
                                        </div>
                                    </div>
                                    <button style={{ marginTop: '1rem', opacity: isRegisteredOnChain ? 1 : 0.5, cursor: isRegisteredOnChain ? 'pointer' : 'not-allowed' }} onClick={handleRegisterLand} disabled={loading || !isRegisteredOnChain}>
                                        {loading ? "Processing..." : isRegisteredOnChain ? "Register Land" : "⚠️ Register on Blockchain First"}
                                    </button>
                                    {!isRegisteredOnChain && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>You must register your identity on the blockchain (top right button) before registering land.</p>}
                                </div>
                                <h3>
                                    {showAllLands ? "All Registered Lands" : "My Assets"}
                                    <button
                                        onClick={() => setShowAllLands(!showAllLands)}
                                        style={{ fontSize: '0.8rem', marginLeft: '1rem', padding: '0.2rem 0.5rem' }}
                                    >
                                        {showAllLands ? "Show My Assets" : "Show All Lands"}
                                    </button>
                                </h3>
                                {(showAllLands ? allLands : lands).map((l, i) => (
                                    <div key={i} className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <strong>{l.location}</strong>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span className={`status-badge ${l.status === 1 ? 'status-approved' : l.status === 2 ? 'status-rejected' : 'status-pending'}`}>
                                                    {l.status === 0 ? "Pending" : l.status === 1 ? "Approved" : "Rejected"}
                                                </span>
                                                <span className="status-badge" style={{ background: '#e2e8f0', color: '#1e293b' }}>{l.area.toString()} sq ft</span>
                                                <span style={{ fontSize: '1.2rem' }}>{l.status === 1 ? '✅' : l.status === 2 ? '❌' : '⏳'}</span>
                                            </div>
                                        </div>
                                        <small style={{ color: 'var(--text-secondary)' }}>ID: #{l.landId?.toString()}</small>
                                        {showAllLands && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                                Owner: {l.owner.slice(0, 6)}...{l.owner.slice(-4)}
                                                {l.owner.toLowerCase() === account.toLowerCase() && " (You)"}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div>
                                <h3>Transaction History</h3>
                                {transactions.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No transactions found.</p> : (
                                    transactions.map((tx, i) => (
                                        <div key={i} className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{tx.type.replace('_', ' ')}</strong>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{tx.details}</span>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{new Date(tx.createdAt).toLocaleString()}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span className={`status-badge ${tx.status === 'Success' ? 'status-approved' : 'status-rejected'}`}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'support' && (
                            <div>
                                <div className="card">
                                    <h2>Request Aid</h2>
                                    <input type="text" placeholder="Purpose" value={fundPurpose} onChange={e => setFundPurpose(e.target.value)} />
                                    <input type="number" placeholder="Amount" value={fundAmount} onChange={e => setFundAmount(e.target.value)} style={{ marginTop: '1rem' }} />
                                    <button style={{ marginTop: '1rem' }} onClick={handleRequestFunds} disabled={loading}>Submit Request</button>
                                </div>
                                <h3>My History</h3>
                                {myRequests.map((r, i) => (
                                    <div key={i} className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <strong>{r.purpose}</strong>
                                            <span>${r.amount.toString()}</span>
                                        </div>
                                        <span className={`status-badge ${r.approved ? 'status-approved' : 'status-pending'}`}>{r.approved ? "Approved" : "Pending"}</span>
                                    </div>
                                ))}
                            </div>
                        )}



                    </div>

                    <div className="crm-side" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <div style={{ width: '60px', height: '60px', background: '#e0f2f1', borderRadius: '50%', margin: '0 auto 0.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                            </div>
                            <h3>AI Assistant</h3>
                        </div>

                        {/* Chat Area */}
                        <div className="chat-window" style={{
                            flex: 1,
                            background: 'var(--background)',
                            borderRadius: '12px',
                            padding: '1rem',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.8rem',
                            marginBottom: '1rem',
                            maxHeight: '400px'
                        }}>
                            {chatMessages.map((msg, i) => (
                                <div key={i} style={{
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    background: msg.sender === 'user' ? 'var(--primary)' : 'var(--surface)',
                                    color: msg.sender === 'user' ? 'white' : 'var(--text-main)',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '12px',
                                    maxWidth: '85%',
                                    fontSize: '0.9rem',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    borderBottomRightRadius: msg.sender === 'user' ? '2px' : '12px',
                                    borderBottomLeftRadius: msg.sender === 'bot' ? '2px' : '12px'
                                }}>
                                    {msg.text}
                                </div>
                            ))}
                            {chatLoading && (
                                <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                    Typing...
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                placeholder="Ask me anything..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                style={{ flex: 1, marginBottom: 0 }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={chatLoading}
                                style={{ padding: '0 1rem', marginBottom: 0 }}
                            >
                                ➤
                            </button>
                        </div>

                        <div className="card" style={{ background: 'var(--background)', border: 'none', marginTop: '2rem', padding: '1rem' }}>
                            <h4 style={{ marginTop: 0, fontSize: '0.9rem' }}>💡 Quick Suggestions</h4>
                            {aiInsights.suggestions.length > 0 ? (
                                <ul style={{ fontSize: '0.8rem', paddingLeft: '1rem' }}>
                                    {aiInsights.suggestions.slice(0, 2).map((s, i) => (
                                        <li key={i} style={{ background: 'transparent', padding: '0.3rem 0', cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setChatInput(s)}>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p style={{ fontSize: '0.7rem' }}>Analyzing...</p>}
                        </div>
                    </div>
                </div>
            </main >
        </div >
    );
};

export default Dashboard;
