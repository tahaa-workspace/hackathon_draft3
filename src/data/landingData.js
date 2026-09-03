import {
  FileSearch,
  FolderLock,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
  UserRoundCheck,
  Users,
  Fingerprint,
  Cloud,
  Database,
} from "lucide-react";

export const problems = [
  {
    number: "01",
    icon: FileSearch,
    title: "Scattered information",
    text: "Important documents are often spread across devices, cloud accounts, emails and physical files.",
  },
  {
    number: "02",
    icon: FolderLock,
    title: "No structured access plan",
    text: "Families may know information exists but still have no reliable way to locate or access it.",
  },
  {
    number: "03",
    icon: KeyRound,
    title: "Over-sharing risk",
    text: "Sharing an entire drive can expose unrelated private documents that were never meant for that person.",
  },
  {
    number: "04",
    icon: Users,
    title: "No digital legacy workflow",
    text: "Traditional storage tools focus on files, not ownership, beneficiaries and controlled legacy access.",
  },
];

export const features = [
  {
    icon: LockKeyhole,
    title: "Secure Document Vault",
    description:
      "Organize important personal, financial, legal and property documents inside one protected digital vault.",
    tone: "blue",
  },
  {
    icon: Users,
    title: "Trusted Beneficiaries",
    description:
      "Create beneficiary accounts for the people you trust without making your information public.",
    tone: "violet",
  },
  {
    icon: UserRoundCheck,
    title: "Document-Level Access",
    description:
      "Choose exactly which beneficiary can access each document. Adding someone never exposes the entire vault.",
    tone: "cyan",
  },
  {
    icon: UserCheck,
    title: "Verified Owners",
    description:
      "Owner registrations can pass through an administrator verification process before activation.",
    tone: "green",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Security",
    description:
      "Separate Owner, Beneficiary and Administrator permissions protect sensitive platform actions.",
    tone: "amber",
  },
  {
    icon: Fingerprint,
    title: "Protected Authentication",
    description:
      "JWT authentication, password hashing and guarded routes protect access across the application.",
    tone: "rose",
  },
];

export const steps = [
  {
    number: "01",
    title: "Create your account",
    description:
      "Register as an Owner and provide the information required for verification.",
  },
  {
    number: "02",
    title: "Get verified",
    description:
      "The Administrator reviews the registration before the Owner account becomes active.",
  },
  {
    number: "03",
    title: "Build your vault",
    description:
      "Upload and organize important documents securely in one place.",
  },
  {
    number: "04",
    title: "Control access",
    description:
      "Create beneficiaries and choose exactly which documents each person can access.",
  },
];

export const securityPoints = [
  {
    icon: Fingerprint,
    title: "Authentication layer",
    description: "JWT-protected user sessions and guarded API routes.",
  },
  {
    icon: ShieldCheck,
    title: "Authorization layer",
    description: "Role checks and document-level permission validation.",
  },
  {
    icon: Database,
    title: "Structured data",
    description: "MongoDB stores users, metadata and access relationships.",
  },
  {
    icon: Cloud,
    title: "Protected file storage",
    description: "Uploaded files are handled separately from application data.",
  },
];
