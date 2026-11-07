"""
CodeMate AI — Razorpay Payment Endpoints
Handles order creation, signature verification, webhook intake, and payment audit history.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.payment import (
    CreateOrderRequest,
    CreateOrderResponse,
    PaymentHistoryItem,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    WebhookProcessingResult,
)
from app.services.payment_service import PaymentService
from app.services.subscription_service import SubscriptionService
from app.services.entitlement_service import get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_payment_order(
    payload: CreateOrderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a server-calculated Razorpay order for the selected plan.
    Client-supplied pricing is strictly disallowed.
    Supports promotional discount coupons.
    """
    return await PaymentService.create_order(
        db, user, payload.plan_id, coupon_code=payload.coupon_code
    )


@router.post("/verify", response_model=VerifyPaymentResponse)
async def verify_payment_signature(
    payload: VerifyPaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verifies payment signature using server-side Razorpay secret and activates subscription.
    """
    updated_sub = await PaymentService.verify_payment(
        db=db,
        user=user,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
        plan_id=payload.plan_id,
    )
    return VerifyPaymentResponse(
        success=True,
        message="Payment verified successfully. Subscription activated.",
        subscription=updated_sub,
    )


@router.post("/webhook", response_model=WebhookProcessingResult)
async def handle_razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_razorpay_signature: Optional[str] = Header(default=None, alias="X-Razorpay-Signature"),
):
    """
    Ingests and processes Razorpay webhooks idempotently with raw HMAC signature verification.
    """
    raw_body = await request.body()
    return await PaymentService.process_webhook(db, raw_body, x_razorpay_signature)


@router.get("/history", response_model=List[PaymentHistoryItem])
async def get_payment_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves payment history for the authenticated user."""
    payments = await PaymentService.list_payments(db, user.id)
    return payments


@router.get("/checkout", response_class=HTMLResponse)
async def serve_razorpay_checkout(
    plan_id: str = Query(..., description="Target Subscription Plan ID"),
    order_id: Optional[str] = Query(None, description="Razorpay Order ID"),
    coupon_code: Optional[str] = Query(None, description="Promotional Coupon Code"),
    token: Optional[str] = Query(None, description="User JWT Access Token"),
    db: AsyncSession = Depends(get_db),
):
    """
    Serves the MV3-compliant browser checkout page.
    Loads official Razorpay Checkout SDK (UPI, Cards, NetBanking) and triggers payment verification.
    """
    from app.services.promo_service import PromoService
    import uuid

    plan = await SubscriptionService.get_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    order_id = order_id or f"order_{uuid.uuid4().hex[:14]}"
    key_id = settings.RAZORPAY_KEY_ID or "rzp_test_codemate_sandbox"
    is_sandbox = settings.ENVIRONMENT != "production" and (not settings.RAZORPAY_KEY_ID or settings.RAZORPAY_KEY_ID.startswith("rzp_test_codemate_sandbox"))

    # Determine anchoring and coupon discount
    anchor_price = 99 if plan.id == "core_daily" else 199 if plan.id == "autopilot_daily" else plan.price // 100
    final_price_paise = plan.price
    coupon_msg = ""
    if coupon_code:
        try:
            promo_model = await PromoService.get_promo_model(db, coupon_code)
            val = PromoService.validate_code(coupon_code, plan.price, promo_model=promo_model, target_plan_id=plan.id)
            final_price_paise = val["final_price"]
            coupon_msg = f'<div class="text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded">Promo {val["code"]} applied: {val["discount_percent"]}% OFF</div>'
        except Exception:
            pass

    price_display = f"₹{final_price_paise / 100:.0f}"
    anchor_display = f"₹{anchor_price}"

    html = f"""<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeMate AI — Secure Checkout ({plan.name})</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    @keyframes pulseGlow {{
      0%, 100% {{ box-shadow: 0 0 25px rgba(99, 102, 241, 0.25); }}
      50% {{ box-shadow: 0 0 45px rgba(99, 102, 241, 0.45); }}
    }}
  </style>
</head>
<body class="min-h-screen bg-[#070b14] text-slate-100 font-sans flex items-center justify-center p-4">
  <div class="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-5">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-indigo-500/30">
        ⚡
      </div>
      <div>
        <h1 class="text-base font-bold text-white">CodeMate AI Subscription</h1>
        <p class="text-xs text-slate-400">Secure Razorpay Payment Gateway</p>
      </div>
    </div>

    <div class="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <div>
          <span class="font-semibold text-slate-200 text-sm block">{plan.name}</span>
          <span class="text-[10px] text-slate-400 font-bold">1 Day Pass • 1 Registered Device</span>
        </div>
        <div class="text-right">
          <span class="text-xs text-slate-500 line-through mr-1.5">{anchor_display}</span>
          <span class="text-lg font-bold text-emerald-400">{price_display}</span>
        </div>
      </div>
      {coupon_msg}
      <p class="text-xs text-slate-400">{plan.description}</p>
      <div class="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
        <span>⚡ {plan.ai_usage_limit} AI Requests / day</span>
        <span>📱 {plan.device_limit} Device Sync</span>
        <span>🔒 {plan.concurrent_session_limit} Concurrent Session</span>
        <span>✨ All AI Capabilities</span>
      </div>
    </div>

    <div id="checkoutStatus" class="flex flex-col gap-3">
      <button id="payBtn" onclick="launchRazorpay()" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2">
        <span>Pay {price_display} with Razorpay</span>
      </button>

      {f'''
      <div class="pt-2 border-t border-slate-800/60 flex flex-col gap-1.5">
        <span class="text-[10px] text-slate-500 text-center uppercase tracking-wider">Sandbox Test Mode Active</span>
        <button onclick="simulateSandboxSuccess()" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl font-semibold text-xs transition-colors cursor-pointer">
          Simulate Successful Sandbox Payment
        </button>
      </div>
      ''' if is_sandbox else ''}
    </div>

    <div id="successCard" class="hidden p-5 bg-emerald-950/30 border border-emerald-500/50 rounded-xl text-center flex flex-col items-center gap-2.5">
      <div class="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">✓</div>
      <h2 class="text-base font-bold text-emerald-300">Subscription Activated!</h2>
      <p class="text-xs text-slate-300">Your account has been upgraded to <strong>{plan.name}</strong>. You can now close this tab and continue using CodeMate AI in your Chrome extension.</p>
      <button onclick="window.close()" class="mt-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-semibold transition-colors">
        Close Tab
      </button>
    </div>

    <div id="errorCard" class="hidden p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 text-center"></div>

    <p class="text-[11px] text-slate-500 text-center">
      Payments processed via 256-bit encrypted SSL on Razorpay. Supports UPI, Cards, NetBanking, and Wallets.
    </p>
  </div>

  <script>
    const orderId = "{order_id}";
    const planId = "{plan_id}";
    const keyId = "{key_id}";
    const amount = {plan.price};
    const userToken = "{token or ''}";

    function showSuccess() {{
      document.getElementById('checkoutStatus').classList.add('hidden');
      document.getElementById('errorCard').classList.add('hidden');
      document.getElementById('successCard').classList.remove('hidden');
    }}

    function showError(msg) {{
      const el = document.getElementById('errorCard');
      el.textContent = msg;
      el.classList.remove('hidden');
    }}

    async function verifySignature(paymentId, signature) {{
      try {{
        const headers = {{ 'Content-Type': 'application/json' }};
        if (userToken) headers['Authorization'] = 'Bearer ' + userToken;

        const res = await fetch('/api/payments/verify', {{
          method: 'POST',
          headers,
          body: JSON.stringify({{
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
            plan_id: planId
          }})
        }});

        const data = await res.json();
        if (res.ok) {{
          showSuccess();
        }} else {{
          showError(data.detail || 'Payment verification failed.');
        }}
      }} catch (err) {{
        showError('Network error connecting to verification server: ' + err.message);
      }}
    }}

    function launchRazorpay() {{
      if (typeof Razorpay === 'undefined') {{
        showError('Razorpay SDK failed to load. Check your internet connection.');
        return;
      }}

      const options = {{
        key: keyId,
        amount: amount,
        currency: "INR",
        name: "CodeMate AI",
        description: "{plan.name} Subscription",
        order_id: orderId,
        theme: {{ color: "#4f46e5" }},
        handler: function (response) {{
          verifySignature(response.razorpay_payment_id, response.razorpay_signature);
        }}
      }};

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {{
        showError('Payment failed: ' + (response.error.description || 'Transaction declined.'));
      }});
      rzp.open();
    }}

    function simulateSandboxSuccess() {{
      const fakePayId = "pay_sandbox_" + Math.random().toString(36).substring(2, 9);
      verifySignature(fakePayId, "sandbox_test_signature_valid");
    }}
  </script>
</body>
</html>"""
    return HTMLResponse(content=html)

