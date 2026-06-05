'use client';

import { useState } from 'react';
// We use lucide-react icons instead of loading heavy FontAwesome script tags
import { FaFacebook, FaGithub, FaLinkedin } from 'react-icons/fa';
import { FaChrome } from 'react-icons/fa6';
import styles from './authform.module.css';

export default function AuthPage() {
  // State to track whether the signup panel is active
  const [isSignUp, setIsSignUp] = useState(false);

  // Prevent forms from reloading the page on submit
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className={styles.bodyWrapper}>
      {/* Dynamically adds the 'active' class when isSignUp is true */}
      <div className={`${styles.container} ${isSignUp ? styles.active : ''}`} id="container">
        
        {/* --- SIGN UP FORM --- */}
        <div className={`${styles.formContainer} ${styles.signUp}`}>
          <form onSubmit={handleSubmit}>
            <h1>Create Account</h1>
            <div className={styles.socialIcons}>
              <a href="#" className={styles.icon}><FaChrome size={20} /></a>
              <a href="#" className={styles.icon}><FaFacebook size={20} /></a>
              <a href="#" className={styles.icon}><FaGithub size={20} /></a>
              <a href="#" className={styles.icon}><FaLinkedin size={20} /></a>
            </div>
            <span>or use your email for registration</span>
            <input type="text" placeholder="Name" />
            <input type="email" placeholder="Email" />
            <input type="password" placeholder="Password" />
            <button type="submit">Sign Up</button>
          </form>
        </div>

        {/* --- SIGN IN FORM --- */}
        <div className={`${styles.formContainer} ${styles.signIn}`}>
          <form onSubmit={handleSubmit}>
            <h1>Sign In</h1>
            <div className={styles.socialIcons}>
              <a href="#" className={styles.icon}><FaChrome size={20} /></a>
              <a href="#" className={styles.icon}><FaFacebook size={20} /></a>
              <a href="#" className={styles.icon}><FaGithub size={20} /></a>
              <a href="#" className={styles.icon}><FaLinkedin size={20} /></a>
            </div>
            <span>or use your email password</span>
            <input type="email" placeholder="Email" />
            <input type="password" placeholder="Password" />
            <a href="#">Forget Your Password?</a>
            <button type="submit">Sign In</button>
          </form>
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