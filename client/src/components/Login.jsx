import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

const Login = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
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
                        <h2>{isRegister ? "Create Account" : "Welcome Back"}</h2>
                        <p>{isRegister ? "Join the digital governance platform." : "Sign in to continue."}</p>
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
                        {isRegister ? "Already have an account?" : "Don't have an account?"}
                        <span onClick={() => setIsRegister(!isRegister)} style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                            {isRegister ? "Login" : "Register"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
