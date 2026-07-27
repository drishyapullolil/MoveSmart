import axios from "axios";

/**
 * Utility to process payments using Razorpay
 * @param {Object} params
 * @param {number} params.amount Amount to charge (in INR/AED units)
 * @param {string} params.description Payment description
 * @param {string} [params.userEmail] Customer email
 * @param {string} [params.userName] Customer name
 * @param {string} [params.userPhone] Customer phone
 * @param {string} [params.paymentType] 'topup' | 'wallet' | 'card_application'
 * @param {string} [params.tagId] RFID tag or card number for top-up
 * @param {Function} params.onSuccess Callback on successful payment verification
 * @param {Function} params.onError Callback on payment failure or cancellation
 */
export async function processRazorpayPayment({
  amount,
  description = "MoveSmart Transit Payment",
  userEmail = "",
  userName = "MoveSmart User",
  userPhone = "",
  paymentType = "topup",
  tagId = "",
  onSuccess = () => {},
  onError = () => {},
}) {
  try {
    // 1. Create order on backend
    const orderRes = await axios.post("/api/rfid/create-razorpay-order", {
      amount: Number(amount),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    const { orderId, keyId, currency } = orderRes.data;

    if (!window.Razorpay) {
      alert("Razorpay SDK failed to load. Please check your internet connection.");
      onError(new Error("Razorpay SDK not loaded"));
      return;
    }

    // 2. Configure Razorpay modal options
    const options = {
      key: keyId || "rzp_test_TI0yMfx2wp1cnE",
      amount: Math.round(Number(amount) * 100),
      currency: currency || "INR",
      name: "MoveSmart Transit",
      description: description,
      image: "/logo.png",
      order_id: orderId,
      prefill: {
        name: userName,
        email: userEmail,
        contact: userPhone,
      },
      theme: {
        color: "#052C65", // MoveSmart Navy Blue accent
      },
      handler: async function (response) {
        try {
          // 3. Verify signature on backend
          const verifyRes = await axios.post("/api/rfid/verify-razorpay-payment", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            paymentType,
            tagId,
            amount: Number(amount),
          });

          if (verifyRes.data.success) {
            onSuccess(verifyRes.data);
          } else {
            onError(new Error(verifyRes.data.message || "Payment verification failed"));
          }
        } catch (verifyErr) {
          console.error("Payment Verification Error:", verifyErr);
          const errorMsg = verifyErr.response?.data?.message || "Failed to verify Razorpay payment";
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
      onError(new Error(response.error.description || "Payment failed"));
    });

    rzp.open();
  } catch (err) {
    console.error("Razorpay Order Creation Failed:", err);
    const msg = err.response?.data?.message || err.message || "Unable to initiate payment";
    onError(new Error(msg));
  }
}
