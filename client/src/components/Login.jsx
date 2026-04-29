import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

const Login = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState(""); // [NEW]
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
        const API_URL = "http://localhost:5000";

        try {
            const res = await axios.post(`${API_URL}${endpoint}`, { email, password, fullName });
            if (isRegister) {
                alert("Registration Successful! Please Login.");
                setIsRegister(false);
            } else {
                if (isAdminLogin && res.data.role !== 'admin') {
                    setError("Unauthorized: Not an Admin account.");
                    setLoading(false);
                    return;
                }
                if (!isAdminLogin && res.data.role === 'admin') {
                    setError("Admins must login through the Admin portal.");
                    setLoading(false);
                    return;
                }
                // Login success
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("user", JSON.stringify(res.data));
                onLogin(res.data);
            }
        } catch (err) {
            setError(err.response?.data || "An error occurred");
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-left">
                <div className="login-brand-icon">🏛️</div>
                <h1>E-Governance</h1>
                <h2>Portal</h2>
            </div>
            <div className="login-right">
                <div className="login-box">
                    <div className="login-header">
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <button className={`login-tab ${!isAdminLogin && !isRegister ? 'active' : ''}`} onClick={() => { setIsAdminLogin(false); setIsRegister(false); }} style={{ background: 'transparent', border: 'none', borderBottom: !isAdminLogin && !isRegister ? '2px solid var(--primary)' : 'none', fontWeight: 'bold', cursor: 'pointer', paddingBottom: '0.5rem', color: !isAdminLogin && !isRegister ? 'var(--primary)' : 'var(--text-secondary)' }}>Citizen Login</button>
                            <button className={`login-tab ${isAdminLogin ? 'active' : ''}`} onClick={() => { setIsAdminLogin(true); setIsRegister(false); }} style={{ background: 'transparent', border: 'none', borderBottom: isAdminLogin ? '2px solid var(--primary)' : 'none', fontWeight: 'bold', cursor: 'pointer', paddingBottom: '0.5rem', color: isAdminLogin ? 'var(--primary)' : 'var(--text-secondary)' }}>Admin Login</button>
                        </div>
                        <h2>{isRegister ? "Create Account" : (isAdminLogin ? "Admin Sign In" : "Welcome Back")}</h2>
                        <p>{isRegister ? "Join the digital governance platform." : (isAdminLogin ? "Sign in to the Admin Dashboard." : "Sign in to continue.")}</p>
                    </div>
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                className="login-input"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        {isRegister && (
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    className="login-input"
                                    type="text"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                className="login-input"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? "Processing..." : (isRegister ? "Sign Up" : "Sign In")}
                        </button>
                    </form>
                    <div className="login-footer">
                        {isRegister ? "Already have an account?" : (isAdminLogin ? "Looking for Citizen Portal?" : "Don't have an account?")}
                        <span onClick={() => { if(isAdminLogin) { setIsAdminLogin(false); } else { setIsRegister(!isRegister); } }} style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                            {isRegister ? "Login" : (isAdminLogin ? "Citizen Login" : "Register")}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
