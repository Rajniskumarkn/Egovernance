import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { connectWallet, getContract, switchNetwork } from '../utils/web3';
import axios from 'axios';
import '../App.css';

const AdminDashboard = ({ user, onLogout }) => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState("0");
    const [networkName, setNetworkName] = useState("Unknown");
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'land_requests', 'fund_requests'
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Theme
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    // Data
    const [allLands, setAllLands] = useState([]);
    const [fundRequests, setFundRequests] = useState([]);
    const [stats, setStats] = useState({ totalLands: 0, totalRequests: 0, pendingLands: 0, pendingFunds: 0 });

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
        const interval = setInterval(fetchBalance, 5000);
        return () => clearInterval(interval);
    }, [account]);

    const connect = async () => {
        try {
            const { signer, address, provider } = await connectWallet();
            setAccount(address);
            
            if ((await provider.getNetwork()).chainId.toString() !== "31337") {
                await switchNetwork();
            }

            try {
                const contractInstance = await getContract(signer);
                setContract(contractInstance);

                const userStruct = await contractInstance.users(address);
                setRole(Number(userStruct.role));

                fetchData(contractInstance, address);
            } catch (bcErr) {
                console.warn("Blockchain connection error:", bcErr);
            }
        } catch (err) {
            console.error("Connection Error:", err);
        }
    };

    const fetchData = async (contractInstance, userAddress) => {
        try {
            if (!contractInstance) return;

            // Fetch Lands
            const lCount = await contractInstance.landCount();
            const blockchainLands = [];
            for (let i = 1; i <= Number(lCount); i++) {
                const land = await contractInstance.lands(i);
                blockchainLands.push({
                    landId: land.id,
                    location: land.location,
                    area: land.area,
                    owner: land.owner,
                    status: Number(land.status)
                });
            }
            setAllLands(blockchainLands);

            // Fetch Fund Requests
            let reqCount = await contractInstance.fundRequestCount();
            const loadedReqs = [];
            for (let i = 1; i <= Number(reqCount); i++) {
                const req = await contractInstance.getFundRequest(i);
                loadedReqs.push(req);
            }
            setFundRequests(loadedReqs);

            // Update Stats
            setStats({
                totalLands: blockchainLands.length,
                pendingLands: blockchainLands.filter(l => l.status === 0).length,
                totalRequests: Number(reqCount),
                pendingFunds: loadedReqs.filter(r => !r.approved).length
            });

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

    const handleRegisterOnBlockchain = async () => {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.registerUser(user.fullName || "Admin", 1, "email-hash");
            await tx.wait();
            alert("Registered as Admin on Blockchain!");
            fetchData(contract, account);
            const userStruct = await contract.users(account);
            setRole(Number(userStruct.role));
        } catch (err) {
            alert("Registration Failed: " + err.message);
        }
        setLoading(false);
    };

    const handleApproveLand = async (id) => {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.approveLand(id);
            await tx.wait();
            localStorage.removeItem('land_doc_' + id);
            alert("Land Approved!");
            fetchData(contract, account);
        } catch (err) { alert("Error: " + err.message); }
        setLoading(false);
    };

    const handleRejectLand = async (id) => {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.rejectLand(id);
            await tx.wait();
            localStorage.removeItem('land_doc_' + id);
            alert("Land Rejected!");
            fetchData(contract, account);
        } catch (err) { alert("Error: " + err.message); }
        setLoading(false);
    };

    const handleApproveFund = async (id) => {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.approveFundRequest(id);
            await tx.wait();
            alert("Fund Approved!");
            fetchData(contract, account);
        } catch (err) { alert("Error: " + err.message); }
        setLoading(false);
    };

    if (!account) {
        return (
            <div className="login-container">
                <div className="login-left" style={{ background: 'var(--secondary)' }}>
                    <div className="login-brand-icon">🛡️</div>
                    <h1>E-Governance</h1>
                    <h2>Admin Portal</h2>
                </div>
                <div className="login-right">
                    <div className="login-box">
                        <div className="login-header"><h2>Admin Authentication</h2><p>Connect wallet to access system requests.</p></div>
                        <div className="login-form">
                            <button className="login-btn" onClick={connect} style={{ marginTop: '1rem', background: 'var(--secondary)' }}>🦊 Connect MetaMask</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header"><h1 style={{ color: 'var(--secondary)' }}>Admin</h1></div>
                <ul className="nav-menu">
                    <li className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} title="System Overview">📊</li>
                    <li className={`nav-item ${activeTab === 'land_requests' ? 'active' : ''}`} onClick={() => setActiveTab('land_requests')} title="Land Registrations">🌍</li>
                    <li className={`nav-item ${activeTab === 'fund_requests' ? 'active' : ''}`} onClick={() => setActiveTab('fund_requests')} title="Fund Aid">💰</li>
                </ul>
            </aside>

            <main className="main-content" style={{ width: '100%', maxWidth: '100%' }}>
                <div className="top-bar" style={{ justifyContent: 'space-between' }}>
                    <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                        <div style={{ width: '36px', height: '36px', background: 'var(--secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>🛡️</div>
                        <span>Admin Control Center</span>
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        {role !== 1 && (
                            <button onClick={handleRegisterOnBlockchain} disabled={loading} style={{ background: 'var(--danger)', color: 'white', animation: 'pulse 2s infinite' }}>
                                {loading ? "Registering..." : "⚠️ Initialize Admin on Chain"}
                            </button>
                        )}
                        <button onClick={handleRefresh} disabled={loading || isRefreshing} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '0.5rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'inline-block', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span> Refresh Data
                        </button>
                        <button onClick={toggleTheme} style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '1.2rem' }}>
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>
                        <div className="user-info">
                            <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{user?.fullName || "System Admin"}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{account.slice(0, 6)}...{account.slice(-4)}</div>
                                <button onClick={onLogout} style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', marginTop: '0.2rem', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}>Logout</button>
                            </div>
                            <div style={{ width: '40px', height: '40px', background: 'var(--secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>🛡️</div>
                        </div>
                    </div>
                </div>

                <div className="crm-container" style={{ padding: '1rem 2rem' }}>
                    {activeTab === 'overview' && (
                        <div>
                            <h2>System Overview</h2>
                            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '2rem' }}>
                                <div className="card">
                                    <h3>Pending Lands</h3>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0', color: 'var(--warning)' }}>{stats.pendingLands}</p>
                                </div>
                                <div className="card">
                                    <h3>Pending Funds</h3>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0', color: 'var(--warning)' }}>{stats.pendingFunds}</p>
                                </div>
                                <div className="card">
                                    <h3>Total Lands Registered</h3>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{stats.totalLands}</p>
                                </div>
                                <div className="card">
                                    <h3>Total Fund Requests</h3>
                                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{stats.totalRequests}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'land_requests' && (
                        <div>
                            <h2>Land Registration Requests</h2>
                            <div style={{ marginTop: '2rem' }}>
                                {allLands.filter(l => l.status === 0).length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No pending land requests.</p> : allLands.filter(l => l.status === 0).map((l, i) => (
                                    <div key={i} className="card" style={{ padding: '1.5rem', marginBottom: '1rem', borderLeft: '4px solid var(--warning)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong style={{ fontSize: '1.2rem' }}>{l.location}</strong>
                                                <div style={{ margin: '0.5rem 0' }}>
                                                    <span className="status-badge" style={{ background: '#e2e8f0', color: '#1e293b' }}>{l.area.toString()} sq ft</span>
                                                    <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Owner: {l.owner}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                {localStorage.getItem('land_doc_' + l.landId) && (
                                                    <button style={{ background: 'var(--secondary)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => {
                                                        const docData = localStorage.getItem('land_doc_' + l.landId);
                                                        const newWindow = window.open();
                                                        if (newWindow) {
                                                            newWindow.document.write(`<iframe src="${docData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                        }
                                                    }}>📄 View Doc</button>
                                                )}
                                                <button style={{ background: role === 1 ? 'var(--success)' : 'var(--text-secondary)' }} onClick={() => handleApproveLand(l.landId)} disabled={loading || role !== 1}>{role === 1 ? 'Approve' : 'Admin Only'}</button>
                                                <button style={{ background: role === 1 ? 'var(--danger)' : 'var(--text-secondary)' }} onClick={() => handleRejectLand(l.landId)} disabled={loading || role !== 1}>{role === 1 ? 'Reject' : 'Admin Only'}</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <h3 style={{ marginTop: '3rem' }}>Actioned Requests</h3>
                            {allLands.filter(l => l.status !== 0).map((l, i) => (
                                <div key={i} className="card" style={{ padding: '1rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{l.location} ({l.area.toString()} sq ft)</span>
                                        <span className={`status-badge ${l.status === 1 ? 'status-approved' : 'status-rejected'}`}>
                                            {l.status === 1 ? "Approved" : "Rejected"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'fund_requests' && (
                        <div>
                            <h2>Fund Aid Requests</h2>
                            <div style={{ marginTop: '2rem' }}>
                                {fundRequests.filter(req => !req.approved).length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No pending fund requests.</p> : fundRequests.filter(req => !req.approved).map((req, i) => (
                                    <div key={i} className="card" style={{ padding: '1.5rem', marginBottom: '1rem', borderLeft: '4px solid var(--warning)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong style={{ fontSize: '1.2rem' }}>{req.purpose}</strong>
                                                <div style={{ margin: '0.5rem 0' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Requester: {req.requester}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--success)' }}>${req.amount.toString()}</span>
                                                <button style={{ background: role === 1 ? 'var(--primary)' : 'var(--text-secondary)' }} onClick={() => handleApproveFund(req.id)} disabled={loading || role !== 1}>{role === 1 ? 'Approve Funds' : 'Admin Only'}</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <h3 style={{ marginTop: '3rem' }}>Approved Funds</h3>
                            {fundRequests.filter(req => req.approved).map((req, i) => (
                                <div key={i} className="card" style={{ padding: '1rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{req.purpose} - ${req.amount.toString()}</span>
                                        <span className="status-badge status-approved">Approved</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
