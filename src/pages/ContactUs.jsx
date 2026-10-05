import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeHelp,
  CheckCircle2,
  Clock3,
  FileHeart,
  Gavel,
  Headphones,
  LifeBuoy,
  Loader2,
  Mail,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Wrench,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../components/ProtectedRoute";
import LandingNavbar from "../components/landing/LandingNavbar";
import ScrollToTopButton from "../components/landing/ScrollToTopButton";
import { submitContactMessage } from "../services/contactService";

import "../styles/landing.css";
import "../styles/contact.css";

const CATEGORIES = [
  { value: "GENERAL", label: "General Enquiry" },
  { value: "ACCOUNT_SUPPORT", label: "Account Support" },
  { value: "BENEFICIARY_SUPPORT", label: "Beneficiary Support" },
  { value: "LEGACY_CLAIM_SUPPORT", label: "Legacy Claim Support" },
  { value: "LEGAL_ADVISOR", label: "Legal Advisor Enquiry" },
  { value: "TECHNICAL", label: "Technical Issue" },
];

const SUPPORT_AREAS = [
  {
    icon: UserRoundCheck,
    title: "Account & Verification",
    text: "Questions about registration, account access, identity verification or profile details.",
  },
  {
    icon: FileHeart,
    title: "Beneficiary & Legacy Claims",
    text: "Help with beneficiary access, claim submissions and additional information requests.",
  },
  {
    icon: Gavel,
    title: "Legal Advisor Enquiries",
    text: "Questions related to legal-review workflows and approved legal advisor participation.",
  },
  {
    icon: Wrench,
    title: "Technical Support",
    text: "Report a feature issue, upload problem, access error or other technical difficulty.",
  },
];

const FAQS = [
  {
    q: "Can I use this form for an urgent legacy claim?",
    a: "Use the Legacy Claim workflow inside the Beneficiary dashboard for formal claim submissions. This contact form is for support and enquiries.",
  },
  {
    q: "Should I attach Aadhaar or other sensitive documents here?",
    a: "No. Do not send identity documents or confidential vault records through the contact form. Use the secure upload areas inside the platform.",
  },
  {
    q: "Will my message be stored?",
    a: "Yes. Contact enquiries are stored in the platform database so the support team can track and respond to them.",
  },
];

const initialForm = {
  name: "",
  email: "",
  category: "GENERAL",
  subject: "",
  message: "",
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

export default function ContactUs() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user.name || "",
      email: current.email || user.email || "",
    }));
  }, [user]);

  const goToDashboard = () => {
    if (user) navigate(homeForRole(user.role));
  };

  const handlePrimaryAction = () => {
    if (isAuthenticated && user) {
      goToDashboard();
      return;
    }
    navigate("/register");
  };

  const selectedCategory = useMemo(
    () => CATEGORIES.find((item) => item.value === form.category)?.label,
    [form.category]
  );

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(null);

    if (!form.name.trim() || !form.email.trim() || !form.category || !form.subject.trim() || !form.message.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.subject.trim().length < 3) {
      setError("Please enter a more descriptive subject.");
      return;
    }

    if (form.message.trim().length < 10) {
      setError("Please provide a little more detail in your message.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });

      setSuccess({ message: result.message, referenceId: result.referenceId });
      setForm((current) => ({
        ...initialForm,
        name: user?.name || current.name,
        email: user?.email || current.email,
      }));
    } catch (err) {
      setError(err.message || "Unable to send your message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-shell contact-page">
      <LandingNavbar
        user={user}
        isAuthenticated={isAuthenticated}
        onHome={() => navigate("/")}
        onSignIn={() => navigate("/login")}
        onRegister={() => navigate("/register")}
        onDashboard={goToDashboard}
      />

      <main>
        <section className="contact-hero">
          <div className="contact-hero-grid" />
          <div className="contact-hero-glow contact-hero-glow-left" />
          <div className="contact-hero-glow contact-hero-glow-right" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pb-20 lg:pt-36">
            <div className="contact-hero-layout">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.55 }}>
                <div className="contact-breadcrumb">
                  <button type="button" onClick={() => navigate("/")}>Home</button>
                  <span>/</span>
                  <span>Contact Us</span>
                </div>

                <div className="landing-kicker mt-8">
                  <MessageSquareText size={13} />
                  Contact NextGen Vault
                </div>

                <h1 className="mt-6 text-4xl font-bold leading-tight tracking-[-0.04em] text-ink-950 sm:text-5xl lg:text-6xl">
                  Need help with
                  <span className="landing-gradient-text"> your digital legacy?</span>
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-8 text-ink-500 sm:text-lg">
                  Whether you have a question about your account, beneficiary access,
                  a legacy claim or a technical issue, send us a message and our team can review it.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96, x: 25 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.65, delay: 0.12 }}
                className="contact-hero-panel"
              >
                <div className="contact-hero-panel-icon"><LifeBuoy size={28} /></div>
                <p className="contact-hero-panel-kicker">Support that respects privacy</p>
                <h2>Ask questions without exposing your vault.</h2>
                <p>
                  Never include passwords, Aadhaar numbers, death certificates,
                  confidential vault records or other sensitive documents in a contact message.
                </p>

                <div className="contact-hero-points">
                  <span><ShieldCheck size={16} /> Secure platform guidance</span>
                  <span><Clock3 size={16} /> Enquiries tracked with a reference ID</span>
                  <span><Headphones size={16} /> Multiple support categories</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="contact-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="contact-main-grid">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="contact-form-card"
              >
                <div className="contact-form-heading">
                  <div>
                    <p className="contact-card-kicker">Send a message</p>
                    <h2>How can we help?</h2>
                  </div>
                  <div className="contact-form-heading-icon"><Mail size={21} /></div>
                </div>

                {error && <div className="contact-alert contact-alert-error">{error}</div>}

                {success && (
                  <div className="contact-alert contact-alert-success">
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>{success.message}</strong>
                      {success.referenceId && <p>Reference: <span>{success.referenceId}</span></p>}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="contact-two-column">
                    <label>
                      <span>Full Name *</span>
                      <input type="text" value={form.name} onChange={update("name")} maxLength={100} placeholder="Your full name" autoComplete="name" required />
                    </label>
                    <label>
                      <span>Email Address *</span>
                      <input type="email" value={form.email} onChange={update("email")} maxLength={160} placeholder="you@example.com" autoComplete="email" required />
                    </label>
                  </div>

                  <label>
                    <span>Category *</span>
                    <select value={form.category} onChange={update("category")} required>
                      {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <small>Selected: {selectedCategory}</small>
                  </label>

                  <label>
                    <span>Subject *</span>
                    <input type="text" value={form.subject} onChange={update("subject")} maxLength={180} placeholder="Briefly describe what you need help with" required />
                  </label>

                  <label>
                    <div className="contact-field-row">
                      <span>Message *</span>
                      <small>{form.message.length}/3000</small>
                    </div>
                    <textarea value={form.message} onChange={update("message")} maxLength={3000} rows={7} placeholder="Tell us what happened, what you expected and any non-sensitive details that can help us understand the issue." required />
                  </label>

                  <div className="contact-form-footer">
                    <p>Please do not include passwords or identity-document numbers.</p>
                    <button type="submit" className="contact-submit-button" disabled={submitting}>
                      {submitting ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                      {submitting ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </form>
              </motion.div>

              <div className="contact-support-column">
                <div className="contact-support-heading">
                  <div className="landing-kicker"><Sparkles size={13} />Support Areas</div>
                  <h2>Choose the right path.</h2>
                  <p>
                    Formal actions should stay inside their secure platform workflow.
                    Use Contact Us when you need guidance or support.
                  </p>
                </div>

                <div className="contact-support-list">
                  {SUPPORT_AREAS.map(({ icon: Icon, title, text }, index) => (
                    <motion.article
                      key={title}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, amount: 0.2 }}
                      variants={fadeUp}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="contact-support-card"
                    >
                      <div className="contact-support-icon"><Icon size={19} /></div>
                      <div><h3>{title}</h3><p>{text}</p></div>
                    </motion.article>
                  ))}
                </div>

                <div className="contact-privacy-note">
                  <BadgeHelp size={18} />
                  <div>
                    <strong>Need to submit documents?</strong>
                    <p>Use the appropriate secure dashboard upload instead of this contact form.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="contact-section contact-faq-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="contact-section-heading">
              <div className="landing-kicker"><BadgeHelp size={13} />Before You Send</div>
              <h2>Common contact questions.</h2>
            </div>

            <div className="contact-faq-grid">
              {FAQS.map((item, index) => (
                <motion.article
                  key={item.q}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={fadeUp}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  className="contact-faq-card"
                >
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section pt-0">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="contact-cta">
              <div>
                <p className="contact-cta-kicker">Ready to prepare your legacy?</p>
                <h2>Organize important records before they become someone else&apos;s uncertainty.</h2>
              </div>
              <button type="button" onClick={handlePrimaryAction} className="contact-cta-button">
                {isAuthenticated ? "Go to Dashboard" : "Create Account"}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-white/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <button type="button" onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-ink-100">
              <img src="/nextgen-vault-logo.png" alt="NextGen Vault" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-900">NextGen Vault</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">Digital Legacy Management</p>
            </div>
          </button>

          <div className="flex items-center gap-5 text-xs text-ink-400">
            <button type="button" onClick={() => navigate("/about")} className="transition hover:text-brand-700">About Us</button>
            <span>Secure Legacy Management Platform</span>
          </div>
        </div>
      </footer>

      <ScrollToTopButton />
    </div>
  );
}
