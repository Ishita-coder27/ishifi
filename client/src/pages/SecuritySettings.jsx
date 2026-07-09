import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { Button, Field, Modal, Skeleton, stagger, useToast } from "../components/ui";
import { api } from "../lib/api";

export default function SecuritySettings() {
  const toast = useToast();
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyCode, setVerifyCode] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const status = await api.get("/api/auth/2fa/status");
      setTwoFactorStatus(status);
    } catch (e) {
      console.error("Failed to load 2FA status:", e);
    } finally {
      setLoading(false);
    }
  };

  const initiate2FA = async () => {
    try {
      const setup = await api.post("/api/auth/2fa/setup");
      setTwoFactorSetup(setup);
      setShowModal(true);
    } catch (e) {
      toast.error("Setup failed", ` ${e.message}`);
    }
  };

  const verify2FA = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast.error("Invalid code", " Please enter a 6-digit code");
      return;
    }
    try {
      await api.post("/api/auth/2fa/enable", { code: verifyCode });
      toast.success("2FA enabled", " Your account is now more secure");
      setShowModal(false);
      setVerifyCode("");
      loadStatus();
    } catch (e) {
      toast.error("Verification failed", ` ${e.message}`);
    }
  };

  const disable2FA = async () => {
    if (window.confirm("Are you sure? This will disable 2FA.")) {
      try {
        await api.post("/api/auth/2fa/disable");
        toast.success("2FA disabled", " You can re-enable it anytime");
        loadStatus();
      } catch (e) {
        toast.error("Failed", ` ${e.message}`);
      }
    }
  };

  if (loading) {
    return <Skeleton h={400} />;
  }

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>Security Settings</h2>
          <div className="sub">Protect your IshiFi account</div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="check" size={24} style={{ color: twoFactorStatus?.enabled ? "var(--good)" : "var(--muted)" }} />
            <div>
              <b style={{ fontSize: 16 }}>Two-Factor Authentication</b>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {twoFactorStatus?.enabled ? "Enabled via TOTP" : "Not enabled yet"}
              </div>
            </div>
          </div>
          {!twoFactorStatus?.enabled ? (
            <Button magnetic onClick={initiate2FA}>Enable 2FA</Button>
          ) : (
            <Button variant="danger" onClick={disable2FA}>Disable 2FA</Button>
          )}
        </div>

        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
          Two-factor authentication adds an extra layer of security. After entering your password, you'll need to provide a code from an authenticator app.
        </div>
      </motion.div>

      {/* Sessions Management */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 24 }}>
        <b style={{ fontSize: 16, display: "block", marginBottom: 12 }}>Active Sessions</b>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          View and manage devices where you're logged in. You can sign out remotely from any device.
        </div>
        <Button variant="soft" style={{ marginTop: 12 }}>View all sessions</Button>
      </motion.div>

      {/* Security Tips */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ background: "var(--surface-2)" }}>
        <b style={{ fontSize: 15, display: "block", marginBottom: 10 }}>Security Tips</b>
        <ul style={{ fontSize: 12, color: "var(--muted)", marginLeft: 20, lineHeight: 1.8 }}>
          <li>Use a strong, unique password</li>
          <li>Enable two-factor authentication (2FA)</li>
          <li>Review your active sessions regularly</li>
          <li>Never share your recovery codes</li>
          <li>Update your recovery email address</li>
        </ul>
      </motion.div>

      {/* 2FA Setup Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Set up Two-Factor Authentication">
        {twoFactorSetup ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
            </div>

            {twoFactorSetup.qr_code && (
              <img src={twoFactorSetup.qr_code} alt="2FA QR Code" style={{ maxWidth: "100%", borderRadius: 12 }} />
            )}

            <Field label="Verification Code">
              <input
                className="input"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                style={{ textAlign: "center", fontSize: 20, letterSpacing: "0.2em" }}
              />
            </Field>

            {twoFactorSetup.backup_codes && (
              <div style={{ padding: 12, background: "var(--surface-2)", borderRadius: 10 }}>
                <b style={{ fontSize: 12, color: "var(--warn)", display: "block", marginBottom: 8 }}>Save your backup codes</b>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {twoFactorSetup.backup_codes.map((code, i) => (
                    <div key={i} style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-2)" }}>
                      {code}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-2)", marginTop: 8 }}>
                  Store these in a safe place. Use them if you lose access to your authenticator app.
                </div>
              </div>
            )}

            <Button onClick={verify2FA} style={{ marginTop: 8 }}>Verify and Enable</Button>
          </div>
        ) : (
          <Skeleton h={200} />
        )}
      </Modal>
    </motion.div>
  );
}
