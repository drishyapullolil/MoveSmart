import axios from "axios";

/**
 * Ensures Razorpay SDK script is loaded dynamically into the DOM
 */
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Utility to process payments using Razorpay and verify signatures on backend database
 * @param {Object} params
 * @param {number} params.amount Amount to charge (in INR)
 * @param {string} [params.description] Payment description
 * @param {string} [params.userEmail] Customer email
 * @param {string} [params.userName] Customer name
 * @param {string} [params.userPhone] Customer phone
 * @param {string} [params.userId] User ID for DB tracking
 * @param {string} [params.paymentType] 'topup' | 'wallet' | 'card_application' | 'bus_booking'
 * @param {string} [params.tagId] RFID tag or card number for top-up
 * @param {Function} [params.onSuccess] Callback on successful payment verification
 * @param {Function} [params.onError] Callback on payment failure or cancellation
 */
export async function processRazorpayPayment({
  amount,
  description = "MoveSmart Transit Payment",
  userEmail = "",
  userName = "MoveSmart User",
  userPhone = "",
  userId = "",
  paymentType = "wallet",
  tagId = "",
  onSuccess = () => {},
  onError = () => {},
}) {
  try {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded || !window.Razorpay) {
      const errorMsg = "Razorpay SDK failed to load. Please check your internet connection.";
      alert(errorMsg);
      onError(new Error(errorMsg));
      return;
    }

    // Determine backend order endpoint
    const orderEndpoint = paymentType === "topup" ? "/api/rfid/create-razorpay-order" : "/api/wallet/create-razorpay-order";
    const verifyEndpoint = paymentType === "topup" ? "/api/rfid/verify-razorpay-payment" : "/api/wallet/verify-razorpay-payment";

    // 1. Create order on backend
    let orderRes;
    try {
      orderRes = await axios.post(orderEndpoint, {
        amount: Number(amount),
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      });
    } catch (err) {
      // Fallback to wallet endpoint if rfid endpoint fails or vice versa
      const fallbackEndpoint = orderEndpoint.includes("wallet") ? "/api/rfid/create-razorpay-order" : "/api/wallet/create-razorpay-order";
      orderRes = await axios.post(fallbackEndpoint, {
        amount: Number(amount),
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      });
    }

    const { orderId, keyId, currency } = orderRes.data;

    // 2. Configure Razorpay modal options
    const options = {
      key: keyId || "rzp_test_TI0yMfx2wp1cnE",
      amount: Math.round(Number(amount) * 100),
      currency: currency || "INR",
      name: "MoveSmart Nol Transit",
      description: description,
      image: "/logo.png",
      order_id: orderId,
      prefill: {
        name: userName,
        email: userEmail,
        contact: userPhone,
      },
      theme: {
        color: "#2e1065", // MoveSmart Purple/Navy theme
      },
      handler: async function (response) {
        try {
          // 3. Verify signature on backend & persist transaction into MongoDB
          let verifyRes;
          try {
            verifyRes = await axios.post(verifyEndpoint, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentType,
              tagId,
              userId,
              email: userEmail,
              amount: Number(amount),
              description,
            });
          } catch (vErr) {
            const fallbackVerify = verifyEndpoint.includes("wallet") ? "/api/rfid/verify-razorpay-payment" : "/api/wallet/verify-razorpay-payment";
            verifyRes = await axios.post(fallbackVerify, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentType,
              tagId,
              userId,
              email: userEmail,
              amount: Number(amount),
              description,
            });
          }

          if (verifyRes.data.success || verifyRes.data.transaction) {
            onSuccess(verifyRes.data);
          } else {
            onError(new Error(verifyRes.data.message || "Payment verification failed"));
          }
        } catch (verifyErr) {
          console.error("Payment Verification Error:", verifyErr);
          const errorMsg = verifyErr.response?.data?.message || verifyErr.response?.data?.error || "Failed to verify Razorpay payment";
          onError(new Error(errorMsg));
        }
      },
      modal: {
        ondismiss: function () {
          console.log("Razorpay modal dismissed by user");
          onError(new Error("Payment cancelled by user"));
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      console.error("Payment Failed Event:", response.error);
      onError(new Error(response.error?.description || "Payment failed"));
    });

    rzp.open();
  } catch (err) {
    console.error("Razorpay Order Creation Failed:", err);
    const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Unable to initiate payment";
    onError(new Error(msg));
  }
}
