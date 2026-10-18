import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../lib/apiClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MapWrapper } from '../../components/map/MapWrapper';
import { Store, Phone, ShieldCheck, ArrowRight, CheckCircle2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<'phone' | 'otp' | 'shopkeeper-setup' | 'pending'>('phone');
  const [phone, setPhone] = useState('+919888888881');
  const [role, setRole] = useState<'customer' | 'shopkeeper' | 'admin'>('customer');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  // Shopkeeper onboarding form state
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('Brigade Road, Bangalore');
  const [shopCoords, setShopCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  });

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    let interval: any;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await apiClient.post('/auth/send-otp', { phone, role });
      setStep('otp');
      setResendTimer(60);
      setOtpDigits(['', '', '', '', '', '']);

      if (data.otp) {
        setReceivedOtp(data.otp);
        toast.success(`Real OTP generated: ${data.otp}`, {
          duration: 15000,
          description: `SMS dispatched to ${phone}. Enter this 6-digit code.`,
        });
      } else {
        toast.success(`Verification code dispatched via SMS to ${phone}!`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      // Paste handling
      const pasted = val.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pasted.forEach((d, i) => {
        newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await apiClient.post('/auth/verify-otp', {
        phone,
        otp,
        role,
      });

      const { user, accessToken, refreshToken } = data;

      // Check if user has shop or needs shop registration
      const meRes = await apiClient.get('/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userShops = meRes.data.shops || [];
      const primaryShop = userShops.length > 0 ? userShops[0] : null;

      setAuth(user, accessToken, refreshToken, primaryShop);
      toast.success(`Welcome back, ${user.name}!`);

      if (user.role === 'shopkeeper') {
        if (!primaryShop) {
          setStep('shopkeeper-setup');
        } else if (primaryShop.status === 'pending') {
          setStep('pending');
        } else {
          navigate('/shopkeeper/inventory');
        }
      } else if (user.role === 'admin') {
        navigate('/admin/shops');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName) {
      toast.error('Shop name is required');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await apiClient.post('/shops', {
        name: shopName,
        phone,
        address: shopAddress,
        lat: shopCoords.lat,
        lng: shopCoords.lng,
        delivery_available: true,
      });

      toast.success('Shop registered successfully!');
      setStep('pending');
    } catch (err: any) {
      toast.error(err.message || 'Failed to register shop');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-8 pb-16">
      {/* Brand header */}
      <div className="text-center space-y-2 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-teal mx-auto shadow-teal-glow">
          <Store className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-brand-heading">
          Near<span className="text-brand-teal">Stock</span> Access
        </h2>
        <p className="text-xs text-brand-body">
          Phone-first hyperlocal inventory intelligence
        </p>
      </div>

      {step === 'phone' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSendOtp} className="space-y-4">
            {/* Role Picker Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-brand-muted tracking-wider">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2 bg-brand-bg p-1 rounded-2xl border border-brand-border text-xs font-semibold">
                {(['customer', 'shopkeeper', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      if (r === 'admin') setPhone('+919999999999');
                      else if (r === 'shopkeeper') setPhone('+919888888881');
                      else setPhone('+919777777771');
                    }}
                    className={`py-2 rounded-xl capitalize transition-all ${
                      role === r
                        ? 'bg-brand-teal text-[#07110f] shadow-sm'
                        : 'text-brand-muted hover:text-brand-heading'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Mobile Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98888 88881"
              icon={<Phone className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Send Verification OTP
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="text-[11px] text-brand-muted text-center pt-2 border-t border-brand-border-subtle">
            Real SMS OTP verification active. Enter your actual phone number to receive your 6-digit code.
          </div>
        </Card>
      )}

      {step === 'otp' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-brand-heading">Verify 6-Digit Code</h3>
            <p className="text-xs text-brand-muted">
              Sent to <span className="text-brand-teal font-mono font-semibold">{phone}</span>
            </p>
            {receivedOtp && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const digits = receivedOtp.slice(0, 6).split('');
                    setOtpDigits(digits);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-brand-teal/15 text-brand-teal border border-brand-teal/30 hover:bg-brand-teal/25 transition-all"
                >
                  <span>Code received: <strong className="tracking-widest">{receivedOtp}</strong></span>
                  <span className="underline ml-1">Autofill</span>
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex items-center justify-between gap-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputsRef.current[idx] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-12 h-14 bg-brand-bg border border-brand-border rounded-xl text-center text-xl font-mono font-bold text-brand-teal focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Verify & Proceed
            </Button>

            <div className="flex items-center justify-between text-xs text-brand-muted">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="hover:text-brand-heading"
              >
                Change number
              </button>

              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={() => handleSendOtp()}
                className="text-brand-teal disabled:text-brand-muted hover:underline"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {step === 'shopkeeper-setup' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-brand-heading">Register Your Store</h3>
            <p className="text-xs text-brand-muted">
              Provide your shop location and business details for customer discovery
            </p>
          </div>

          <form onSubmit={handleRegisterShop} className="space-y-4">
            <Input
              label="Store Name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Sharma Grocery & Dairy"
              required
            />

            <Input
              label="Store Address"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              placeholder="12 Commercial Street, Bangalore"
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-brand-muted tracking-wider">
                Pin Location on Map (Click to set)
              </label>
              <div className="h-48 rounded-2xl overflow-hidden border border-brand-border">
                <MapWrapper
                  center={[shopCoords.lat, shopCoords.lng]}
                  zoom={14}
                  isPicker
                  onPickLocation={(lat, lng) => setShopCoords({ lat, lng })}
                  className="h-full"
                />
              </div>
              <p className="text-[10px] text-brand-muted">
                Lat: {shopCoords.lat.toFixed(4)}, Lng: {shopCoords.lng.toFixed(4)}
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4"
              isLoading={isLoading}
            >
              Submit for Admin Approval
            </Button>
          </form>
        </Card>
      )}

      {step === 'pending' && (
        <Card className="p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-400/10 text-amber-300 flex items-center justify-center mx-auto border border-amber-400/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-brand-heading">Registration Submitted</h3>
          <p className="text-xs text-brand-body leading-relaxed max-w-sm mx-auto">
            Your shop is currently in <strong>Pending Admin Review</strong> status. Once approved, your products and inventory will immediately become live in local customer searches.
          </p>
          <Button
            variant="secondary"
            size="md"
            className="w-full mt-2"
            onClick={() => navigate('/shopkeeper/inventory')}
          >
            Continue to Shopkeeper Dashboard
          </Button>
        </Card>
      )}
    </div>
  );
};

