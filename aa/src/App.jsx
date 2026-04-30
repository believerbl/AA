import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";

// Utility to load the Razorpay script safely in React
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function App() {
  const { user } = useUser(); // Grab the logged-in user from Clerk
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  // --- Check if the user has already paid ---
  useEffect(() => {
    const checkUserAccess = async () => {
      if (user?.primaryEmailAddress?.emailAddress) {
        setIsCheckingAccess(true);
        try {
          const response = await fetch('https://aa-jt42.onrender.com/check-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.primaryEmailAddress.emailAddress }),
          });
          const data = await response.json();
          if (data.hasAccess) {
            setHasAccess(true);
          }
        } catch (error) {
          console.error("Error checking access:", error);
        } finally {
          setIsCheckingAccess(false);
        }
      }
    };

    checkUserAccess();
  }, [user]);

  const handlePayment = async () => {
    setIsProcessing(true);
    const res = await loadRazorpayScript();

    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      setIsProcessing(false);
      return;
    }

    try {
      const orderResponse = await fetch('https://aa-jt42.onrender.com/create-order', { method: 'POST' });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(`Backend refused to create order (Status ${orderResponse.status}). Message: ${errorText}`);
      }

      const orderData = await orderResponse.json();

      if (!orderData || !orderData.id) {
        throw new Error("Backend responded, but failed to return a valid Order ID.");
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ATS Auditor",
        description: "Resume Roast via AI",
        order_id: orderData.id,
        handler: async function (response) {
          // Verify payment AND save email to database
          const verifyResponse = await fetch('https://aa-jt42.onrender.com/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              email: user.primaryEmailAddress.emailAddress // Pass the email to the backend!
            }),
          });

          const verifyData = await verifyResponse.json();

          if (verifyData.success) {
            // INSTANT UNLOCK! No refresh needed.
            setHasAccess(true); 
          } else {
            alert('Payment verification failed!');
          }
        },
        theme: { color: "#10b981" }
      };

      const paymentObject = new window.Razorpay(options);
      
      paymentObject.on('payment.failed', function (response){
        console.error("Razorpay UI Error:", response.error.description);
      });

      paymentObject.open();

    } catch (error) {
      console.error("Payment Flow Error:", error);
      alert("Order Creation Failed: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6 selection:bg-emerald-500/30 relative">
      
      <div className="absolute top-6 right-6">
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>

      <div className="max-w-3xl w-full text-center space-y-10">
        
        <div className="space-y-4">
          <div className="inline-block px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-sm text-emerald-400 font-mono mb-4">
            v1.0.0 | Built for Summer internships
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500">
            Pass the ATS Bot.<br />
            <span className="text-emerald-400">Land the Interview.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Stop guessing why you are getting auto-rejected. Paste your resume and the job description. Our ruthless AI audits your text and exposes the exact missing keywords holding you back.
          </p>
        </div>

        <div className="space-y-5 pt-4">
          
          <SignedOut>
            <SignInButton mode="modal">
              <button className="w-full sm:w-auto bg-white hover:bg-gray-200 text-black font-bold text-xl py-4 px-12 rounded-xl transition-all duration-200 shadow-lg mx-auto flex items-center justify-center">
                <span className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Sign in to Continue
                </span>
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            {isCheckingAccess ? (
              <div className="text-gray-400 font-mono animate-pulse">Checking access status...</div>
            ) : hasAccess ? (
              
              /* --- THE ACTUAL APP UI: REDIRECT TO OPAL --- */
              <div className="bg-emerald-900/30 border border-emerald-500/50 rounded-xl p-8 md:p-12 text-center space-y-6 animate-[fadeIn_0.5s_ease-in-out] shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-emerald-400 tracking-tight">Access Granted</h2>
                  <p className="text-lg text-gray-300 max-w-lg mx-auto">
                    Your lifetime license is active. You are now ready to bypass the ATS and land the interview.
                  </p>
                </div>
                <div className="relative z-10 pt-4">
                  <button 
                    onClick={() => window.location.href = "https://opal.google/app/12ouLSuvDjMOPvBXtfZNR572U3TOUzNeS"} 
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xl py-4 px-12 rounded-xl transition-all duration-200 transform shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 mx-auto"
                  >
                    Launch ATS Auditor
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </button>
                </div>
              </div>

            ) : (
              
              /* --- THE PAYWALL UI --- */
              <>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-black text-white">₹2</span>
                  <span className="text-gray-500 font-medium">/ Lifetime Access</span>
                </div>
                
                <button 
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className={`w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xl py-4 px-12 rounded-xl transition-all duration-200 transform shadow-[0_0_20px_rgba(16,185,129,0.25)] ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'} mx-auto`}
                >
                  {isProcessing ? "Connecting to UPI..." : "Unlock Lifetime Access"}
                </button>
                
                <p className="text-xs text-gray-600 font-mono flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  Secured by Razorpay • Instant access upon payment
                </p>
              </>
            )}
          </SignedIn>

        </div>
      </div>
      
      <div className="pt-12 pb-4 flex flex-wrap gap-6 text-xs text-gray-600 justify-center font-mono">
        <span className="cursor-pointer hover:text-emerald-400">Terms & Conditions</span>
        <span className="cursor-pointer hover:text-emerald-400">Privacy Policy</span>
        <span className="cursor-pointer hover:text-emerald-400">Cancellation & Refund Policy</span>
        <span className="cursor-pointer hover:text-emerald-400">Contact Us</span>
      </div>
    </div>
  )
}