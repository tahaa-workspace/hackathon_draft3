import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  Users,
  KeyRound,
  Mail,
  User,
  ShieldCheck,
  FileText,
  Eye,
  Loader2,
  Upload,
  LockKeyhole,
  CheckCircle2,
  Clock3,
  Landmark,
  CreditCard,
  FolderOpen,
  MessageSquareMore,
} from 'lucide-react';

import Navbar from '../components/Navbar';

import {
  useAuth,
} from '../context/AuthContext';

import {
  getAdditionalClaimFile,
  getClaimInformationRequests,
  getMyLegacyClaims,
  submitAdditionalClaimInformation,
  submitLegacyClaim,
  getLawyersForSelection,
  selectClaimLawyer,
} from '../services/legacyService';


const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

const RECORD_TABS = [
  ['ALL', 'All'],
  ['ASSET', 'Assets'],
  ['LIABILITY', 'Liabilities'],
  ['GENERAL', 'General'],
];


function Row({
  Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-center gap-3 border-b border-ink-100 py-3 last:border-0">

      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
        <Icon size={16} />
      </div>

      <div>

        <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
          {label}
        </div>

        <div className="text-sm font-semibold text-ink-800">
          {value}
        </div>

      </div>

    </div>
  );
}


function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Date(
    value
  ).toLocaleString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}


function statusLabel(status) {
  const map = {
    UNDER_ADMIN_REVIEW:
      'Under Admin Review',

    LEGACY_ACCESS_REQUESTED:
      'Admin Verified - Awaiting Lawyer Selection',

    UNDER_LAWYER_REVIEW:
      'Under Lawyer Review',

    MORE_INFORMATION_REQUIRED:
      'Additional Information Required',

    APPROVED_INFORMATION_RELEASED:
      'Approved - Information Released',

    REJECTED_PLATFORM_CLAIM:
      'Rejected Platform Claim',
  };

  return map[status] || status;
}


function recordTypeLabel(type) {
  if (
    type === 'ASSET'
  ) {
    return 'Asset';
  }

  if (
    type === 'LIABILITY'
  ) {
    return 'Liability';
  }

  return 'General';
}


function fileIsValid(file) {
  return (
    file &&
    ALLOWED_TYPES.includes(
      file.type
    ) &&
    file.size <=
      MAX_FILE_SIZE
  );
}


export default function BeneficiaryDashboard() {
  const {
    user,
    token,
  } = useAuth();

  const navigate =
    useNavigate();


  /*
  |--------------------------------------------------------------------------
  | DOCUMENT STATE
  |--------------------------------------------------------------------------
  */

  const [
    documents,
    setDocuments,
  ] = useState([]);

  const [
    documentsLoading,
    setDocumentsLoading,
  ] = useState(true);

  const [
    documentError,
    setDocumentError,
  ] = useState('');


  /*
  |--------------------------------------------------------------------------
  | LEGACY CLAIM STATE
  |--------------------------------------------------------------------------
  */

  const [
    claims,
    setClaims,
  ] = useState([]);

  const [
    claimsLoading,
    setClaimsLoading,
  ] = useState(true);

  const [
    claimError,
    setClaimError,
  ] = useState('');

  const [
    claimSubmitting,
    setClaimSubmitting,
  ] = useState(false);


  /*
  |--------------------------------------------------------------------------
  | RECORD FILTER
  |--------------------------------------------------------------------------
  */

  const [
    recordTab,
    setRecordTab,
  ] = useState('ALL');


  /*
  |--------------------------------------------------------------------------
  | INITIAL CLAIM FORM
  |--------------------------------------------------------------------------
  */

  const [
    identityProofType,
    setIdentityProofType,
  ] = useState(
    'AADHAAR'
  );

  const [
    deathCertificate,
    setDeathCertificate,
  ] = useState(null);

  const [
    identityProof,
    setIdentityProof,
  ] = useState(null);

  const [
    supportingDocument,
    setSupportingDocument,
  ] = useState(null);

  const [
    remarks,
    setRemarks,
  ] = useState('');


  /*
  |--------------------------------------------------------------------------
  | ADDITIONAL INFORMATION
  |--------------------------------------------------------------------------
  */

  const [
    additionalFiles,
    setAdditionalFiles,
  ] = useState([]);

  const [
    responseMessage,
    setResponseMessage,
  ] = useState('');

  const [
    additionalSubmitting,
    setAdditionalSubmitting,
  ] = useState(false);


  /*
  |--------------------------------------------------------------------------
  | LAWYER SELECTION
  |--------------------------------------------------------------------------
  */

  const [
    lawyers,
    setLawyers,
  ] = useState([]);

  const [
    lawyersLoading,
    setLawyersLoading,
  ] = useState(false);

  const [
    selectedLawyerId,
    setSelectedLawyerId,
  ] = useState('');

  const [
    selectingLawyer,
    setSelectingLawyer,
  ] = useState(false);


  /*
  |--------------------------------------------------------------------------
  | LOAD ASSIGNED DOCUMENTS
  |--------------------------------------------------------------------------
  */

  const loadAssignedDocuments =
    useCallback(
      async () => {

        if (!token) {
          setDocumentsLoading(
            false
          );

          return;
        }

        setDocumentsLoading(
          true
        );

        try {

          setDocumentError('');

          const response =
            await fetch(
              '/api/documents/assigned-to-me',
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.message ||
              'Failed to fetch assigned records.'
            );
          }

          setDocuments(
            data.documents ||
            []
          );

        } catch (error) {

          setDocumentError(
            error.message ||
            'Failed to fetch assigned records.'
          );

        } finally {

          setDocumentsLoading(
            false
          );

        }
      },
      [token]
    );


  /*
  |--------------------------------------------------------------------------
  | LOAD CLAIMS
  |--------------------------------------------------------------------------
  */

  const loadClaims =
    useCallback(
      async () => {

        setClaimsLoading(
          true
        );

        try {

          setClaimError('');

          const data =
            await getMyLegacyClaims();

          const enriched =
            await Promise.all(
              data.map(
                async (
                  claim
                ) => ({
                  ...claim,

                  informationRequests:
                    await getClaimInformationRequests(
                      claim.id
                    ).catch(
                      () => []
                    ),
                })
              )
            );

          setClaims(
            enriched
          );

        } catch (error) {

          setClaimError(
            error.message ||
            'Unable to load Legacy Access Claims.'
          );

        } finally {

          setClaimsLoading(
            false
          );

        }
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    loadAssignedDocuments();
    loadClaims();

  }, [
    loadAssignedDocuments,
    loadClaims,
  ]);


  /*
  |--------------------------------------------------------------------------
  | ACTIVE CLAIM
  |--------------------------------------------------------------------------
  */

  const activeClaim =
    claims[0] ||
    null;

  const pendingInformationRequest =
    activeClaim
      ?.informationRequests
      ?.slice()
      .reverse()
      .find(
        (
          item
        ) =>
          item.status ===
          'PENDING'
      ) ||
    null;

  const hasReleasedClaim =
    claims.some(
      (
        claim
      ) =>
        claim.status ===
        'APPROVED_INFORMATION_RELEASED'
    );


  /*
  |--------------------------------------------------------------------------
  | LOAD LAWYERS
  |--------------------------------------------------------------------------
  */

  const loadLawyers =
    useCallback(
      async () => {

        setLawyersLoading(
          true
        );

        try {

          setClaimError('');

          const data =
            await getLawyersForSelection();

          setLawyers(
            data || []
          );

        } catch (error) {

          setClaimError(
            error.message ||
            'Unable to load Lawyers.'
          );

        } finally {

          setLawyersLoading(
            false
          );

        }
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | LOAD LAWYERS AFTER ADMIN APPROVAL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    if (
      activeClaim?.status ===
      'LEGACY_ACCESS_REQUESTED'
    ) {
      loadLawyers();
    }

  }, [
    activeClaim?.status,
    loadLawyers,
  ]);


  /*
  |--------------------------------------------------------------------------
  | RECORD STATISTICS
  |--------------------------------------------------------------------------
  */

  const recordStats =
    useMemo(
      () => ({
        total:
          documents.length,

        assets:
          documents.filter(
            (
              document
            ) =>
              document.recordType ===
              'ASSET'
          ).length,

        liabilities:
          documents.filter(
            (
              document
            ) =>
              document.recordType ===
              'LIABILITY'
          ).length,

        general:
          documents.filter(
            (
              document
            ) =>
              (
                document.recordType ||
                'GENERAL'
              ) ===
              'GENERAL'
          ).length,
      }),
      [documents]
    );


  const visibleDocuments =
    useMemo(
      () =>
        recordTab ===
        'ALL'
          ? documents
          : documents.filter(
              (
                document
              ) =>
                (
                  document.recordType ||
                  'GENERAL'
                ) ===
                recordTab
            ),
      [
        documents,
        recordTab,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | SUBMIT INITIAL CLAIM
  |--------------------------------------------------------------------------
  */

  const handleSubmitClaim =
    async (
      event
    ) => {

      event.preventDefault();

      setClaimError('');

      if (
        !fileIsValid(
          deathCertificate
        ) ||
        !fileIsValid(
          identityProof
        )
      ) {

        setClaimError(
          'Death certificate and identity proof must be PDF, JPG/JPEG, or PNG files up to 10 MB each.'
        );

        return;
      }

      if (
        supportingDocument &&
        !fileIsValid(
          supportingDocument
        )
      ) {

        setClaimError(
          'Supporting document must be PDF, JPG/JPEG, or PNG and no larger than 10 MB.'
        );

        return;
      }

      setClaimSubmitting(
        true
      );

      try {

        await submitLegacyClaim({
          identityProofType,
          deathCertificate,
          identityProof,
          supportingDocument,
          remarks,
        });

        setDeathCertificate(
          null
        );

        setIdentityProof(
          null
        );

        setSupportingDocument(
          null
        );

        setRemarks('');

        await loadClaims();

      } catch (error) {

        setClaimError(
          error.message
        );

      } finally {

        setClaimSubmitting(
          false
        );

      }
    };


  /*
  |--------------------------------------------------------------------------
  | SELECT LAWYER
  |--------------------------------------------------------------------------
  */

  const handleSelectLawyer =
    async () => {

      setClaimError('');

      if (!activeClaim) {

        setClaimError(
          'Legacy Claim could not be found.'
        );

        return;
      }

      if (
        !selectedLawyerId
      ) {

        setClaimError(
          'Please select an available Lawyer.'
        );

        return;
      }

      const selectedLawyer =
        lawyers.find(
          (
            lawyer
          ) =>
            lawyer.id ===
            selectedLawyerId
        );

      if (
        !selectedLawyer
      ) {

        setClaimError(
          'Selected Lawyer could not be found.'
        );

        return;
      }

      if (
        selectedLawyer.isAvailable ===
        false
      ) {

        setClaimError(
          'This Lawyer is currently unavailable. Please select another Lawyer.'
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Select ${selectedLawyer.name} to review your Legacy Access Claim?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      setSelectingLawyer(
        true
      );

      try {

        await selectClaimLawyer(
          activeClaim.id,
          selectedLawyerId
        );

        setSelectedLawyerId(
          ''
        );

        await loadClaims();

      } catch (error) {

        setClaimError(
          error.message ||
          'Unable to select Lawyer.'
        );

      } finally {

        setSelectingLawyer(
          false
        );

      }
    };


  /*
  |--------------------------------------------------------------------------
  | SUBMIT ADDITIONAL INFORMATION
  |--------------------------------------------------------------------------
  */

  const handleAdditionalSubmit =
    async (
      event
    ) => {

      event.preventDefault();

      setClaimError('');

      if (
        !activeClaim ||
        !pendingInformationRequest
      ) {

        setClaimError(
          'No pending additional information request was found.'
        );

        return;
      }

      if (
        additionalFiles.length ===
        0
      ) {

        setClaimError(
          'Upload at least one requested document.'
        );

        return;
      }

      if (
        additionalFiles.find(
          (
            file
          ) =>
            !fileIsValid(
              file
            )
        )
      ) {

        setClaimError(
          'Every additional document must be PDF, JPG/JPEG, or PNG and no larger than 10 MB.'
        );

        return;
      }

      setAdditionalSubmitting(
        true
      );

      try {

        await submitAdditionalClaimInformation(
          activeClaim.id,
          {
            files:
              additionalFiles,

            responseMessage,
          }
        );

        setAdditionalFiles(
          []
        );

        setResponseMessage(
          ''
        );

        await loadClaims();

      } catch (error) {

        setClaimError(
          error.message
        );

      } finally {

        setAdditionalSubmitting(
          false
        );

      }
    };


  /*
  |--------------------------------------------------------------------------
  | OPEN ADDITIONAL EVIDENCE
  |--------------------------------------------------------------------------
  */

  const openAdditionalEvidence =
    async (
      claimId,
      requestId,
      fileIndex
    ) => {

      try {

        setClaimError('');

        const blob =
          await getAdditionalClaimFile(
            claimId,
            requestId,
            fileIndex
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const popup =
          window.open(
            url,
            '_blank',
            'noopener,noreferrer'
          );

        if (!popup) {

          URL.revokeObjectURL(
            url
          );

          throw new Error(
            'The browser blocked the document window. Please allow pop-ups for this site.'
          );

        }

        setTimeout(
          () =>
            URL.revokeObjectURL(
              url
            ),
          60000
        );

      } catch (error) {

        setClaimError(
          error.message ||
          'Unable to open additional evidence.'
        );

      }
    };


  /*
  |--------------------------------------------------------------------------
  | VIEW RELEASED DOCUMENT
  |--------------------------------------------------------------------------
  */

  const viewDocument =
    async (
      documentId
    ) => {

      try {

        setDocumentError('');

        const response =
          await fetch(
            `/api/documents/${documentId}/access`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (
          !response.ok
        ) {

          let message =
            'Unable to access record.';

          try {

            const data =
              await response.json();

            message =
              data.message ||
              message;

          } catch {
            // Response can be binary.
          }

          throw new Error(
            message
          );
        }

        const blob =
          await response.blob();

        const url =
          URL.createObjectURL(
            blob
          );

        window.open(
          url,
          '_blank'
        );

        setTimeout(
          () =>
            URL.revokeObjectURL(
              url
            ),
          60000
        );

      } catch (error) {

        setDocumentError(
          error.message ||
          'Unable to access record.'
        );

      }
    };


  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-ink-50">

      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">


        {/* PAGE HEADER */}

        <div className="mb-6 flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">

            <Users
              size={20}
            />

          </div>

          <div>

            <h1 className="text-2xl font-semibold text-ink-900">
              Beneficiary dashboard
            </h1>

            <p className="text-sm text-ink-500">
              Welcome, {user?.name}.
            </p>

          </div>

        </div>


        <div className="grid gap-6 lg:grid-cols-3">


          {/* ACCOUNT */}

          <div className="card lg:col-span-1">

            <div className="flex items-center gap-2 text-brand-700">

              <ShieldCheck
                size={18}
              />

              <h2 className="text-base font-semibold">
                Your account
              </h2>

            </div>

            <p className="mt-1 text-sm text-ink-500">
              This linked account establishes the
              pre-existing Owner-Beneficiary relationship.
            </p>

            <div className="mt-5">

              <Row
                Icon={User}
                label="Name"
                value={
                  user?.name
                }
              />

              <Row
                Icon={User}
                label="Username"
                value={`@${user?.username}`}
              />

              <Row
                Icon={Mail}
                label="Email"
                value={
                  user?.email
                }
              />

            </div>

            {user?.mustChangePassword && (

              <div className="alert-info mt-5">
                You must change your initial password
                before this account is fully usable.
              </div>

            )}

            <button
              type="button"

              onClick={() =>
                navigate(
                  '/change-password'
                )
              }

              className="btn-primary mt-6"
            >

              <KeyRound
                size={16}
              />

              Change password

            </button>

          </div>


          {/* LEGACY CLAIM */}

          <div className="card lg:col-span-2">

            <div className="flex items-center gap-2 text-brand-700">

              <Clock3
                size={18}
              />

              <h2 className="text-base font-semibold">
                Legacy Access Claim
              </h2>

            </div>

            <p className="mt-1 text-sm text-ink-500">
              Submit the required evidence for Admin verification.
              After Admin approval, select an available Lawyer.
              The Lawyer may request additional evidence before
              making the final decision.
            </p>


            {claimError && (

              <div className="alert-error mt-4">
                {claimError}
              </div>

            )}


            {claimsLoading ? (

              <div className="flex items-center gap-2 py-8 text-sm text-ink-500">

                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Loading claim status…

              </div>

            ) : activeClaim &&
              activeClaim.status !==
              'REJECTED_PLATFORM_CLAIM' ? (

              <div className="mt-5 space-y-4">


                {/* CLAIM STATUS */}

                <div className="rounded-2xl border border-ink-100 bg-ink-50 p-5">

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                        Current status
                      </p>

                      <p className="mt-1 font-semibold text-ink-900">
                        {
                          statusLabel(
                            activeClaim.status
                          )
                        }
                      </p>

                      <p className="mt-1 text-xs text-ink-500">
                        Submitted{' '}
                        {
                          formatDate(
                            activeClaim.createdAt
                          )
                        }
                      </p>

                    </div>


                    {activeClaim.status ===
                    'APPROVED_INFORMATION_RELEASED' ? (

                      <CheckCircle2
                        className="text-green-600"
                        size={24}
                      />

                    ) : (

                      <LockKeyhole
                        className="text-amber-600"
                        size={24}
                      />

                    )}

                  </div>


                  {activeClaim
                    .adminReview
                    ?.remarks && (

                    <p className="mt-4 text-sm text-ink-600">

                      <span className="font-semibold">
                        Admin remarks:
                      </span>{' '}

                      {
                        activeClaim
                          .adminReview
                          .remarks
                      }

                    </p>

                  )}


                  {activeClaim
                    .lawyerReview
                    ?.remarks && (

                    <p className="mt-2 text-sm text-ink-600">

                      <span className="font-semibold">
                        Lawyer remarks:
                      </span>{' '}

                      {
                        activeClaim
                          .lawyerReview
                          .remarks
                      }

                    </p>

                  )}


                  {activeClaim.assignedLawyer && (

                    <p className="mt-2 text-sm text-ink-600">

                      Assigned Lawyer:{' '}

                      <span className="font-semibold">
                        {
                          activeClaim
                            .assignedLawyer
                            .name
                        }
                      </span>

                    </p>

                  )}

                </div>


                {/* LAWYER SELECTION - ONLY ONCE */}

                {activeClaim.status ===
                  'LEGACY_ACCESS_REQUESTED' && (

                  <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">

                    <div className="flex items-center gap-2">

                      <CheckCircle2
                        size={18}
                        className="text-green-600"
                      />

                      <h3 className="font-semibold text-blue-900">
                        Admin Verification Completed
                      </h3>

                    </div>

                    <p className="mt-2 text-sm text-blue-700">
                      Your initial Legacy Claim documents
                      have passed Admin review. Select an
                      available Lawyer for final review.
                    </p>


                    {lawyersLoading ? (

                      <div className="mt-5 flex items-center gap-2 text-sm text-ink-500">

                        <Loader2
                          size={16}
                          className="animate-spin"
                        />

                        Loading Lawyers…

                      </div>

                    ) : lawyers.length ===
                      0 ? (

                      <div className="mt-5 rounded-xl border border-dashed border-blue-200 bg-white p-5 text-center">

                        <p className="text-sm font-semibold text-ink-700">
                          No Lawyers registered
                        </p>

                        <p className="mt-1 text-xs text-ink-500">
                          No approved Lawyers are currently registered on the platform.
                        </p>

                      </div>

                    ) : (

                      <div className="mt-5 grid gap-3">

                        {lawyers.map(
                          (
                            lawyer
                          ) => {

                            const available =
                              lawyer.isAvailable !==
                              false;

                            const selected =
                              selectedLawyerId ===
                              lawyer.id;

                            return (

                              <button
                                key={
                                  lawyer.id
                                }

                                type="button"

                                disabled={
                                  !available ||
                                  selectingLawyer
                                }

                                onClick={() =>
                                  setSelectedLawyerId(
                                    lawyer.id
                                  )
                                }

                                className={`
                                  flex w-full items-center
                                  justify-between gap-4
                                  rounded-xl border
                                  bg-white p-4
                                  text-left transition

                                  ${
                                    selected
                                      ? 'border-brand-400 ring-2 ring-brand-100'
                                      : 'border-ink-100'
                                  }

                                  ${
                                    available
                                      ? 'hover:border-brand-300 hover:shadow-sm'
                                      : 'cursor-not-allowed opacity-60'
                                  }
                                `}
                              >

                                <div className="flex min-w-0 items-center gap-3">


                                  {/* GREEN / RED DOT */}

                                  <span
                                    className={`
                                      h-3.5
                                      w-3.5
                                      shrink-0
                                      rounded-full

                                      ${
                                        available
                                          ? 'bg-green-500'
                                          : 'bg-red-500'
                                      }
                                    `}
                                  />


                                  <div className="min-w-0">

                                    <p className="truncate font-semibold text-ink-900">
                                      {
                                        lawyer.name
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-ink-500">

                                      {
                                        lawyer.city ||
                                        'City not provided'
                                      }

                                      {
                                        lawyer.state
                                          ? `, ${lawyer.state}`
                                          : ''
                                      }

                                    </p>

                                    <p className="mt-1 text-xs text-ink-400">

                                      Enrollment:{' '}

                                      {
                                        lawyer.enrollmentNumber ||
                                        'Not provided'
                                      }

                                    </p>

                                    {lawyer
                                      .stateBarCouncil && (

                                      <p className="mt-1 text-xs text-ink-400">
                                        {
                                          lawyer
                                            .stateBarCouncil
                                        }
                                      </p>

                                    )}

                                  </div>

                                </div>


                                <span
                                  className={`
                                    shrink-0
                                    rounded-full
                                    px-2.5
                                    py-1
                                    text-xs
                                    font-semibold

                                    ${
                                      available
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-red-50 text-red-700'
                                    }
                                  `}
                                >

                                  {
                                    available
                                      ? 'Available'
                                      : 'Unavailable'
                                  }

                                </span>

                              </button>

                            );
                          }
                        )}

                      </div>

                    )}


                    {selectedLawyerId && (

                      <button
                        type="button"

                        onClick={
                          handleSelectLawyer
                        }

                        disabled={
                          selectingLawyer
                        }

                        className="btn-primary mt-5"
                      >

                        {selectingLawyer ? (

                          <Loader2
                            size={16}
                            className="animate-spin"
                          />

                        ) : (

                          <ShieldCheck
                            size={16}
                          />

                        )}

                        {
                          selectingLawyer
                            ? 'Assigning Lawyer…'
                            : 'Confirm Lawyer Selection'
                        }

                      </button>

                    )}

                  </div>

                )}


                {/* ADDITIONAL INFO REQUESTED BY LAWYER */}

                {activeClaim.status ===
                  'MORE_INFORMATION_REQUIRED' &&
                  pendingInformationRequest && (

                  <form
                    onSubmit={
                      handleAdditionalSubmit
                    }

                    className="rounded-2xl border border-orange-200 bg-orange-50 p-5"
                  >

                    <div className="flex items-center gap-2 text-orange-800">

                      <MessageSquareMore
                        size={18}
                      />

                      <h3 className="font-semibold">
                        Additional Information Required
                      </h3>

                    </div>


                    <p className="mt-2 text-sm text-orange-900">

                      <span className="font-semibold">
                        Requested by Lawyer:
                      </span>{' '}

                      {
                        pendingInformationRequest
                          .message
                      }

                    </p>


                    <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-orange-300 bg-white p-4">

                      <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">

                        <Upload
                          size={15}
                        />

                        Upload requested documents

                      </div>

                      <p className="mt-2 text-xs text-ink-500">

                        {
                          additionalFiles.length >
                          0
                            ? `${additionalFiles.length} file(s) selected`
                            : 'Select up to 5 PDF/JPG/PNG files, 10 MB each'
                        }

                      </p>

                      <input
                        type="file"
                        multiple

                        accept="application/pdf,image/jpeg,image/png"

                        className="sr-only"

                        onChange={(event) =>
                          setAdditionalFiles(
                            Array.from(
                              event.target
                                .files ||
                              []
                            ).slice(
                              0,
                              5
                            )
                          )
                        }
                      />

                    </label>


                    {additionalFiles.length >
                      0 && (

                      <div className="mt-2 space-y-1">

                        {additionalFiles.map(
                          (
                            file
                          ) => (

                            <p
                              key={`${file.name}-${file.size}`}
                              className="truncate text-xs text-ink-600"
                            >
                              • {file.name}
                            </p>

                          )
                        )}

                      </div>

                    )}


                    <label className="mt-4 block text-sm font-medium text-ink-700">

                      Response / note
                      (optional)

                      <textarea
                        value={
                          responseMessage
                        }

                        onChange={(event) =>
                          setResponseMessage(
                            event.target
                              .value
                          )
                        }

                        className="field-input mt-1 min-h-24"

                        placeholder="Explain what you have uploaded"
                      />

                    </label>


                    <button
                      type="submit"

                      className="btn-primary mt-4"

                      disabled={
                        additionalSubmitting
                      }
                    >

                      {additionalSubmitting ? (

                        <Loader2
                          size={16}
                          className="animate-spin"
                        />

                      ) : (

                        <Upload
                          size={16}
                        />

                      )}

                      {
                        additionalSubmitting
                          ? 'Submitting additional evidence…'
                          : 'Submit Additional Information'
                      }

                    </button>

                  </form>

                )}


                {/* INFORMATION REQUEST HISTORY */}

                {activeClaim
                  .informationRequests
                  ?.length >
                  0 && (

                  <div className="rounded-2xl border border-ink-100 bg-white p-5">

                    <h3 className="text-sm font-semibold text-ink-800">
                      Information request history
                    </h3>


                    <div className="mt-3 space-y-3">

                      {activeClaim
                        .informationRequests
                        .map(
                          (
                            request
                          ) => (

                            <div
                              key={
                                request.id
                              }

                              className="rounded-xl border border-ink-100 p-3 text-sm"
                            >

                              <p className="font-semibold text-ink-800">
                                Lawyer request
                              </p>

                              <p className="mt-1 text-ink-600">
                                {
                                  request.message
                                }
                              </p>

                              <p className="mt-1 text-xs text-ink-400">

                                {
                                  request.status ===
                                  'SUBMITTED'
                                    ? `Submitted ${formatDate(
                                        request.respondedAt
                                      )}`
                                    : 'Waiting for your response'
                                }

                              </p>


                              {request.responseMessage && (

                                <p className="mt-2 text-ink-600">

                                  <span className="font-semibold">
                                    Your response:
                                  </span>{' '}

                                  {
                                    request
                                      .responseMessage
                                  }

                                </p>

                              )}


                              {request
                                .additionalDocuments
                                ?.length >
                                0 && (

                                <div className="mt-2 flex flex-wrap gap-2">

                                  {request
                                    .additionalDocuments
                                    .map(
                                      (
                                        file
                                      ) => (

                                        <button
                                          key={`${request.id}-${file.index}`}

                                          type="button"

                                          onClick={() =>
                                            openAdditionalEvidence(
                                              activeClaim.id,
                                              request.id,
                                              file.index
                                            )
                                          }

                                          className="btn-secondary"
                                        >

                                          <Eye
                                            size={14}
                                          />

                                          {
                                            file
                                              .originalName
                                          }

                                        </button>

                                      )
                                    )}

                                </div>

                              )}

                            </div>

                          )
                        )}

                    </div>

                  </div>

                )}

              </div>

            ) : (

              /* INITIAL CLAIM FORM */

              <form
                onSubmit={
                  handleSubmitClaim
                }

                className="mt-5 space-y-4"
              >

                <div className="grid gap-4 sm:grid-cols-2">

                  <label className="text-sm font-medium text-ink-700">

                    Identity proof type

                    <select
                      value={
                        identityProofType
                      }

                      onChange={(event) =>
                        setIdentityProofType(
                          event.target
                            .value
                        )
                      }

                      className="field-input mt-1"
                    >

                      <option value="AADHAAR">
                        Aadhaar / Masked Aadhaar
                      </option>

                      <option value="PASSPORT">
                        Passport
                      </option>

                      <option value="DRIVING_LICENCE">
                        Driving Licence
                      </option>

                      <option value="VOTER_ID">
                        Voter ID
                      </option>

                      <option value="OTHER">
                        Other
                      </option>

                    </select>

                  </label>


                  <label className="text-sm font-medium text-ink-700">

                    Remarks
                    (optional)

                    <input
                      value={
                        remarks
                      }

                      onChange={(event) =>
                        setRemarks(
                          event.target
                            .value
                        )
                      }

                      className="field-input mt-1"

                      placeholder="Anything relevant to the claim"
                    />

                  </label>

                </div>


                <div className="grid gap-4 md:grid-cols-3">

                  {[
                    [
                      'Death certificate',
                      deathCertificate,
                      setDeathCertificate,
                      true,
                    ],

                    [
                      'Identity proof',
                      identityProof,
                      setIdentityProof,
                      true,
                    ],

                    [
                      'Supporting document',
                      supportingDocument,
                      setSupportingDocument,
                      false,
                    ],
                  ].map(
                    ([
                      label,
                      file,
                      setter,
                      required,
                    ]) => (

                      <label
                        key={
                          label
                        }

                        className="cursor-pointer rounded-xl border border-dashed border-ink-200 bg-white p-4 hover:border-brand-300"
                      >

                        <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">

                          <Upload
                            size={15}
                          />

                          {label}

                          {
                            required
                              ? ' *'
                              : ''
                          }

                        </div>

                        <p className="mt-2 truncate text-xs text-ink-500">

                          {
                            file?.name ||
                            'PDF/JPG/PNG up to 10 MB'
                          }

                        </p>

                        <input
                          type="file"

                          accept="application/pdf,image/jpeg,image/png"

                          className="sr-only"

                          required={
                            required
                          }

                          onChange={(event) =>
                            setter(
                              event.target
                                .files?.[0] ||
                              null
                            )
                          }
                        />

                      </label>

                    )
                  )}

                </div>


                <button
                  type="submit"

                  className="btn-primary"

                  disabled={
                    claimSubmitting
                  }
                >

                  {claimSubmitting ? (

                    <Loader2
                      size={16}
                      className="animate-spin"
                    />

                  ) : (

                    <ShieldCheck
                      size={16}
                    />

                  )}

                  {
                    claimSubmitting
                      ? 'Submitting claim…'
                      : 'Request Legacy Access'
                  }

                </button>

              </form>

            )}

          </div>

        </div>


        {/* RELEASED VAULT */}

        <div className="card mt-6">

          <div className="flex items-center gap-2 text-brand-700">

            {hasReleasedClaim ? (

              <FolderOpen
                size={18}
              />

            ) : (

              <LockKeyhole
                size={18}
              />

            )}

            <h2 className="text-base font-semibold">
              Released Vault Information
            </h2>

          </div>


          <p className="mt-1 text-sm text-ink-500">
            Assets, liabilities and general records remain
            locked until final Lawyer approval. Only records
            explicitly assigned by the Owner are released.
          </p>


          {hasReleasedClaim && (

            <>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">

                <div className="rounded-xl border border-ink-100 p-3">

                  <Landmark
                    size={17}
                    className="text-brand-600"
                  />

                  <p className="mt-2 text-xs text-ink-400">
                    Assets
                  </p>

                  <p className="text-xl font-bold text-ink-900">
                    {
                      recordStats.assets
                    }
                  </p>

                </div>


                <div className="rounded-xl border border-ink-100 p-3">

                  <CreditCard
                    size={17}
                    className="text-brand-600"
                  />

                  <p className="mt-2 text-xs text-ink-400">
                    Liabilities
                  </p>

                  <p className="text-xl font-bold text-ink-900">
                    {
                      recordStats.liabilities
                    }
                  </p>

                </div>


                <div className="rounded-xl border border-ink-100 p-3">

                  <FileText
                    size={17}
                    className="text-brand-600"
                  />

                  <p className="mt-2 text-xs text-ink-400">
                    General
                  </p>

                  <p className="text-xl font-bold text-ink-900">
                    {
                      recordStats.general
                    }
                  </p>

                </div>


                <div className="rounded-xl border border-ink-100 p-3">

                  <FolderOpen
                    size={17}
                    className="text-brand-600"
                  />

                  <p className="mt-2 text-xs text-ink-400">
                    Total
                  </p>

                  <p className="text-xl font-bold text-ink-900">
                    {
                      recordStats.total
                    }
                  </p>

                </div>

              </div>


              <div className="mt-4 flex flex-wrap gap-2">

                {RECORD_TABS.map(
                  ([
                    value,
                    label,
                  ]) => (

                    <button
                      key={
                        value
                      }

                      type="button"

                      onClick={() =>
                        setRecordTab(
                          value
                        )
                      }

                      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                        recordTab ===
                        value
                          ? 'bg-brand-600 text-white'
                          : 'border border-ink-100 bg-white text-ink-600'
                      }`}
                    >

                      {label}

                    </button>

                  )
                )}

              </div>

            </>

          )}


          {documentError && (

            <div className="alert-error mt-4">
              {documentError}
            </div>

          )}


          {documentsLoading ? (

            <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">

              <Loader2
                size={16}
                className="animate-spin"
              />

              Loading released records...

            </div>

          ) : visibleDocuments.length ===
            0 ? (

            <div className="py-10 text-center">

              <LockKeyhole
                size={28}
                className="mx-auto text-ink-300"
              />

              <p className="mt-2 text-sm text-ink-500">

                {
                  hasReleasedClaim
                    ? 'No released records in this section.'
                    : 'Vault information is locked until final Lawyer approval.'
                }

              </p>

            </div>

          ) : (

            <ul className="mt-4 grid gap-3 md:grid-cols-2">

              {visibleDocuments.map(
                (
                  document
                ) => (

                  <li
                    key={
                      document.id
                    }

                    className="rounded-xl border border-ink-100 p-4"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <p className="truncate font-semibold text-ink-800">
                            {
                              document.title
                            }
                          </p>

                          <span className="badge bg-brand-50 text-brand-700">
                            {
                              recordTypeLabel(
                                document.recordType
                              )
                            }
                          </span>

                        </div>

                        <p className="text-sm text-ink-500">
                          {
                            document.category
                          }
                        </p>

                      </div>


                      <button
                        type="button"

                        onClick={() =>
                          viewDocument(
                            document.id
                          )
                        }

                        className="btn-secondary shrink-0"
                      >

                        <Eye
                          size={15}
                        />

                        View

                      </button>

                    </div>

                  </li>

                )
              )}

            </ul>

          )}

        </div>

      </main>

    </div>
  );
} 