import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { mockSessions, MockSession } from '../../mocks/mockData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

export const SecurityPage: React.FC = () => {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<MockSession[]>(mockSessions);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  // Phone number update state
  const [newPhone, setNewPhone] = useState('');
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revoke other devices
  const handleLogoutOtherDevices = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setSessions((prev) => prev.filter((s) => s.is_current));
      setIsSubmitting(false);
      setIsLogoutModalOpen(false);
      toast.success('All other devices have been logged out successfully');
    }, 600);
  };

  // Revoke single session
  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success('Device session revoked');
  };

  // Phone update handlers
  const handleSendPhoneOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone || newPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setPhoneStep('otp');
      toast.info('Verification OTP sent to your new phone number');
    }, 500);
  };

  const handleVerifyPhoneOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '123456' && otpCode.length !== 6) {
      toast.error('Invalid OTP. Use master OTP 123456');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsPhoneModalOpen(false);
      setPhoneStep('input');
      setNewPhone('');
      setOtpCode('');
      toast.success('Phone number updated successfully');
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-brand-heading flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-brand-teal" />
          Security & Active Sessions
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Monitor your active devices, manage login sessions, and secure your account credentials.
        </p>
      </div>

      {/* Account Security Overview Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-semibold text-brand-heading">
                Mobile Number Authentication
              </div>
              <div className="text-xs text-brand-muted mt-0.5">
                Current Number:{' '}
                <span className="font-mono text-brand-heading font-medium">
                  {user?.phone || '+91 98888 11111'}
                </span>{' '}
                (Verified OTP Auth)
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPhoneStep('input');
              setIsPhoneModalOpen(true);
            }}
          >
            Change Phone Number
          </Button>
        </div>
      </Card>

      {/* Active Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-heading">Active Devices & Sessions</h2>
            <p className="text-xs text-brand-muted">
              These devices are currently signed in to your NearStock account.
            </p>
          </div>

          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Log Out Other Devices
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {sessions.map((sess) => (
            <Card
              key={sess.id}
              className={`p-4 transition-all ${
                sess.is_current ? 'border-brand-teal/40 bg-brand-surface/70' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center text-brand-teal flex-shrink-0">
                    {sess.device.includes('iPhone') || sess.device.includes('Android') ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Laptop className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-brand-heading text-sm">{sess.device}</span>
                      {sess.is_current && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                          Current Device
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-brand-muted mt-1 font-mono">
                      <span>{sess.browser}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {sess.location} ({sess.ip})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {sess.last_active}
                      </span>
                    </div>
                  </div>
                </div>

                {!sess.is_current && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 self-start sm:self-center"
                    onClick={() => handleRevokeSession(sess.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Security Activity Audit Log */}
      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold text-brand-heading flex items-center gap-2">
          <History className="w-4 h-4 text-brand-teal" />
          Recent Security Activity
        </h3>

        <div className="space-y-3">
          {[
            {
              action: 'Signed in with OTP verification',
              location: 'Bangalore, India',
              ip: '103.21.144.10',
              time: 'Just now',
              status: 'success',
            },
            {
              action: 'Session refreshed via token exchange',
              location: 'Bangalore, India',
              ip: '103.21.144.10',
              time: '15 minutes ago',
              status: 'success',
            },
            {
              action: 'Signed in from mobile app',
              location: 'Bangalore, India',
              ip: '103.21.144.88',
              time: '2 hours ago',
              status: 'success',
            },
            {
              action: 'Failed OTP attempt (rate limit triggered)',
              location: 'Mumbai, India',
              ip: '49.36.12.19',
              time: '2 days ago',
              status: 'warning',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between py-2.5 border-b border-brand-border/50 last:border-0 text-xs"
            >
              <div className="flex items-start gap-2.5">
                {item.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-teal mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className="font-medium text-brand-body">{item.action}</div>
                  <div className="text-brand-muted font-mono mt-0.5">
                    {item.location} • IP {item.ip}
                  </div>
                </div>
              </div>
              <div className="text-brand-muted font-mono whitespace-nowrap ml-4">{item.time}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal: Confirm Logout Other Devices */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Log Out Other Devices?"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-muted">
            This will immediately invalidate all active access and refresh tokens on every device
            except for this current browser window. Any open sessions will need to re-authenticate
            with OTP.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsLogoutModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
              loading={isSubmitting}
              onClick={handleLogoutOtherDevices}
            >
              Confirm Log Out
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Change Phone Number */}
      <Modal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        title="Change Phone Number"
      >
        {phoneStep === 'input' ? (
          <form onSubmit={handleSendPhoneOtp} className="space-y-4">
            <p className="text-sm text-brand-muted">
              Enter your new 10-digit mobile number. We will send a 6-digit one-time password to
              verify ownership.
            </p>

            <Input
              label="New Mobile Number"
              placeholder="+91 98765 43210"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              required
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" onClick={() => setIsPhoneModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Send Verification OTP
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
            <p className="text-sm text-brand-muted">
              Enter the 6-digit code sent to <span className="text-brand-heading">{newPhone}</span>.
              (Dev master OTP: <code className="text-brand-teal">123456</code>).
            </p>

            <Input
              label="6-Digit OTP"
              placeholder="123456"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="text-center font-mono text-lg tracking-widest"
              required
            />

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setPhoneStep('input')}
              >
                Back
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Verify & Update
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
export default SecurityPage;

