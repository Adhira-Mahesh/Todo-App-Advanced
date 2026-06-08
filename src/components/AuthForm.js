'use client';
import { registerUser , loginUser, requestPasswordReset, verifyResetCodeAndResetPassword } from '@/app/auth/actions'; // Import server actions
import { useState } from 'react';
// We use lucide-react icons instead of loading heavy FontAwesome script tags
import { FaFacebook, FaGithub, FaLinkedin } from 'react-icons/fa';
import { FaChrome } from 'react-icons/fa6';
import styles from './authform.module.css';

export default function AuthPage() {
  // State to track whether the signup panel is active
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');

  const handleRequestReset = async (event) => {
    event.preventDefault();
    setMessage('');
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');
    if (!email) {
      setMessage('❌ Email is required');
      return;
    }
    setResetEmail(email);
    const result = await requestPasswordReset(email);
    if (result.error) {
      setMessage(`❌ ${result.error}`);
    } else {
      setMessage(`✅ ${result.success}`);
      setResetStep(2);
    }
  };

  const handleVerifyReset = async (event) => {
    event.preventDefault();
    setMessage('');
    const formData = new FormData(event.currentTarget);
    const code = formData.get('code');
    const newPassword = formData.get('password');
    if (!code || !newPassword) {
      setMessage('❌ Code and Password are required');
      return;
    }
    const result = await verifyResetCodeAndResetPassword(resetEmail, code, newPassword);
    if (result.error) {
      setMessage(`❌ ${result.error}`);
    } else {
      setMessage(`✅ ${result.success}`);
      setIsForgotPassword(false);
      setResetStep(1);
      setResetEmail('');
    }
  };

  // Prevent forms from reloading the page on submit
const handleSignUpSubmit = async (event) => {
    event.preventDefault();
      console.log("Signup button clicked");
    const formData = new FormData(event.currentTarget);
    
    console.log("Calling registerUser...");
const result = await registerUser(formData);
console.log("Result:", result);
    
    if (result.error) {
      setMessage(`❌ ${result.error}`);
    } else {
      setMessage(`✅ ${result.success}`);
      // Optional: switch to login panel after successful registration
      setIsSignUp(false); 
    }
  };
  const handleLoginSubmit = async (event) => {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);

  const result = await loginUser(formData);

  if (result.error) {
    setMessage(`❌ ${result.error}`);
  } else {
    setMessage(`✅ ${result.success}`);
  }
};

  return (
    <div className={styles.bodyWrapper}>
      {/* Dynamically adds the 'active' class when isSignUp is true */}
      <div className={`${styles.container} ${isSignUp ? styles.active : ''}`} id="container">
        
        {/* --- SIGN UP FORM --- */}
        <div className={`${styles.formContainer} ${styles.signUp}`}>
          <form onSubmit={handleSignUpSubmit}>
            <h1>Create Account</h1>
            <div className={styles.socialIcons}>
              <a href="#" className={styles.icon}><FaChrome size={20} /></a>
              <a href="#" className={styles.icon}><FaFacebook size={20} /></a>
              <a href="#" className={styles.icon}><FaGithub size={20} /></a>
              <a href="#" className={styles.icon}><FaLinkedin size={20} /></a>
            </div>
            <span>or use your email for registration</span>
         <input
  type="text"
  name="name"
  placeholder="Name"
/>

<input
  type="email"
  name="email"
  placeholder="Email"
/>

<input
  type="password"
  name="password"
  placeholder="Password"
/>
            <button type="submit">Sign Up</button>
            {message && (
  <p style={{ color: 'red', marginTop: '10px' }}>
    {message}
  </p>
)}
          </form>
        </div>

        {/* --- SIGN IN FORM --- */}
        <div className={`${styles.formContainer} ${styles.signIn}`}>
          {isForgotPassword ? (
            resetStep === 1 ? (
              <form onSubmit={handleRequestReset}>
                <h1 style={{ marginBottom: '10px' }}>Forgot Password</h1>
                <span style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginBottom: '10px', display: 'block' }}>
                  Enter email to receive a 6-digit password reset code.
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                />
                <button type="submit">Send Code</button>
                <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(false); setMessage(''); }} style={{ marginTop: '15px', textDecoration: 'underline' }}>Back to Sign In</a>
                {message && (
                  <p style={{ marginTop: '10px', fontSize: '12px', color: message.startsWith('✅') ? 'green' : 'red' }}>
                    {message}
                  </p>
                )}
              </form>
            ) : (
              <form onSubmit={handleVerifyReset}>
                <h1 style={{ marginBottom: '10px' }}>Reset Password</h1>
                <span style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginBottom: '10px', display: 'block' }}>
                  Check server console for code. Enter the code and a new password.
                </span>
                <input
                  type="text"
                  name="code"
                  placeholder="6-digit Code"
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="New Password"
                  required
                />
                <button type="submit">Reset Password</button>
                <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(false); setResetStep(1); setMessage(''); }} style={{ marginTop: '15px', textDecoration: 'underline' }}>Back to Sign In</a>
                {message && (
                  <p style={{ marginTop: '10px', fontSize: '12px', color: message.startsWith('✅') ? 'green' : 'red' }}>
                    {message}
                  </p>
                )}
              </form>
            )
          ) : (
            <form onSubmit={handleLoginSubmit}>
              <h1>Sign In</h1>
              <div className={styles.socialIcons}>
                <a href="#" className={styles.icon}><FaChrome size={20} /></a>
                <a href="#" className={styles.icon}><FaFacebook size={20} /></a>
                <a href="#" className={styles.icon}><FaGithub size={20} /></a>
                <a href="#" className={styles.icon}><FaLinkedin size={20} /></a>
              </div>
              <span>or use your email password</span>

              <input
                type="email"
                name="email"
                placeholder="Email"
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
              />
              <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); setResetStep(1); setMessage(''); }}>Forget Your Password?</a>
              <button type="submit" onClick={() => setIsSignUp(false)}>Sign In</button>

              {message && (
                <p style={{ marginTop: '10px', color: message.startsWith('✅') ? 'green' : 'red' }}>
                  {message}
                </p>
              )}
            </form>
          )}
        </div>

        {/* --- TOGGLE SLIDING OVERLAY --- */}
        <div className={styles.toggleContainer}>
          <div className={styles.toggle}>
            
            {/* Left Panel (Shows when Sign Up is open, offers to toggle to Sign In) */}
            <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
              <h1>Welcome Back!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button className={styles.hidden} id="login" onClick={() => setIsSignUp(false)}>
                Sign In
              </button>
            </div>

            {/* Right Panel (Shows when Sign In is open, offers to toggle to Sign Up) */}
            <div className={`${styles.togglePanel} ${styles.toggleRight}`}>
              <h1>Hello, Friend!</h1>
              <p>Register with your personal details to use all of site features</p>
              <button className={styles.hidden} id="register" onClick={() => setIsSignUp(true)}>
                Sign Up
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}