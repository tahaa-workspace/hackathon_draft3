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
    text: "Traditional storage tools focus on files, not user-to-user allocations, claim verification and controlled legacy access.",
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
    title: "Trusted Legacy Recipients",
    description:
      "Allocate selected documents to trusted existing users without making your information public.",
    tone: "violet",
  },
  {
    icon: UserRoundCheck,
    title: "Document-Level Access",
    description:
      "Choose exactly which recipient can receive each document. An allocation never exposes the entire vault.",
    tone: "cyan",
  },
  {
    icon: UserCheck,
    title: "Verified Users",
    description:
      "User registrations pass through email verification and administrator review before activation.",
    tone: "green",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Security",
    description:
      "USER, ADMIN and LAWYER roles combine with resource-level ownership and allocation checks to protect sensitive actions.",
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
      "Create one user account and provide the information required for verification.",
  },
  {
    number: "02",
    title: "Get verified",
    description:
      "Verify your email and complete Administrator review before the account becomes active.",
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
      "Allocate selected documents to existing users and keep each allocation locked behind its claim workflow."
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
