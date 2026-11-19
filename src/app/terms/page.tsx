import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { LEGAL_IS_DRAFT } from '@/components/legal/legal-config';
import { Fill, FillEmail, LegalDocument, type LegalSection } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Terms of Service · Kandidatex',
  description:
    'The terms for using Kandidatex: accounts, the subscription plan, your responsibilities to candidates, how AI flags should be used, and liability.',
  alternates: { canonical: '/terms' },
  // Kept out of search results until every legal detail is filled in.
  robots: LEGAL_IS_DRAFT ? { index: false, follow: true } : undefined,
};

const SECTIONS: LegalSection[] = [
  {
    id: 'agreement',
    title: 'About these terms',
    body: (
      <>
        <p>
          These terms are an agreement between you and <Fill field="companyLegalName" />, <Fill field="registeredAddress" />{' '}
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;), for the use of Kandidatex (the &ldquo;Service&rdquo;). By creating
          an account, buying a plan or joining an interview, you agree to them.
        </p>
        <p>
          If you use the Service for an organisation, you confirm that you are authorised to accept these terms for it, and
          &ldquo;you&rdquo; includes that organisation. These terms are an electronic record under the Information
          Technology Act, 2000 and don&rsquo;t need a physical or digital signature.
        </p>
        <p>
          Our <Link href="/privacy">Privacy Policy</Link> explains how we handle personal data and forms part of these
          terms.
        </p>
      </>
    ),
  },
  {
    id: 'service',
    title: 'The Service',
    body: (
      <>
        <p>Kandidatex helps interviewers see a candidate&rsquo;s screen during a remote interview. It lets you:</p>
        <ul>
          <li>create an interview and share a joining link with the candidate;</li>
          <li>
            watch, live, the candidate&rsquo;s phone or second-device camera pointed at their laptop screen, with status
            readings for screen visibility, lighting, stability and network;
          </li>
          <li>
            have an AI vision model name the application on screen at random moments, with an alert and a saved screenshot
            when an AI assistant appears;
          </li>
          <li>record sessions, and review the event timeline, an AI-written summary and a full report afterwards.</li>
        </ul>
        <p>
          We may improve or change features over time. If a change materially reduces what your paid plan includes, we
          will tell you in advance.
        </p>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts',
    body: (
      <ul>
        <li>You must be at least 18 years old and able to enter a binding contract to create an account.</li>
        <li>Give accurate registration details and keep them up to date.</li>
        <li>
          Keep your password secret. You are responsible for activity on your account. Tell us straight away at{' '}
          <FillEmail field="contactEmail" /> if you think it has been misused.
        </li>
      </ul>
    ),
  },
  {
    id: 'plan',
    title: 'Plan, payment and renewal',
    body: (
      <>
        <ul>
          <li>
            The Service is sold as a monthly subscription. The plan name, price and number of monitored interviews per
            month are shown on our <Link href="/#pricing">pricing section</Link> and at checkout. The price at checkout is
            what you pay. <Fill field="taxNote" />
          </li>
          <li>
            Payments are processed by Razorpay, under Razorpay&rsquo;s terms. We don&rsquo;t see or store your card or
            UPI details.
          </li>
          <li>Your subscription renews each month and is charged automatically until you cancel.</li>
          <li>
            Each interview you create uses one interview from your monthly allowance. Unused interviews don&rsquo;t carry
            over. The count resets when your plan renews. Once the allowance is used up, you can&rsquo;t create new
            interviews until it resets.
          </li>
          <li>
            You can cancel <Fill field="cancellationMethod" />. After you cancel, your plan keeps working until the end of
            the period you&rsquo;ve paid for, and isn&rsquo;t renewed.
          </li>
          <li>
            <strong>Refunds:</strong> <Fill field="refundPolicy" />
          </li>
          <li>
            We may change the price. We will tell you at least <Fill field="priceChangeNotice" /> before a new price
            applies to your renewal, so you can cancel first if you prefer.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'your-responsibilities',
    title: 'Your responsibilities to candidates',
    body: (
      <>
        <p>
          You decide to monitor an interview, so you are responsible for doing it lawfully and fairly. For candidate data,
          you are the Data Fiduciary under the Digital Personal Data Protection Act, 2023, and we process that data for
          you. In particular, you agree to:
        </p>
        <ul>
          <li>
            tell candidates in advance that the interview will be monitored, and use the Service only for candidates who
            have given consent on the joining page;
          </li>
          <li>
            comply with all laws that apply to you, including data protection, employment and recording-consent laws in
            every place your candidates are;
          </li>
          <li>
            not monitor anyone under 18 unless you have verifiable consent from their parent or lawful guardian;
          </li>
          <li>
            use recordings, screenshots, timelines and summaries only to assess the interview they came from, and keep
            them confidential;
          </li>
          <li>respond to candidates who ask to access, correct or erase their data, with our help where needed;</li>
          <li>
            treat candidates fairly, including by giving them a chance to explain anything flagged before you make a
            decision based on it.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'ai-flags',
    title: 'AI readings and flags',
    body: (
      <>
        <p>
          AI readings are aids for a human reviewer. They can be wrong, and they can miss things. In particular:
        </p>
        <ul>
          <li>
            the application name, category and confidence level are the model&rsquo;s estimate from a single camera
            frame, and depend on camera angle, lighting and focus;
          </li>
          <li>
            the Service only sees what is in the camera&rsquo;s view. It can&rsquo;t see other devices, other people,
            audio prompts, or anything off-screen, and it doesn&rsquo;t check the screen continuously;
          </li>
          <li>
            &ldquo;Review recommended&rdquo; means a person should look. It is not a finding that a candidate cheated or
            broke any rule.
          </li>
          <li>AI summaries are written from alert text and may leave out context.</li>
        </ul>
        <p>
          <strong>
            You must not make a hiring decision, or any other decision that significantly affects a candidate, based only
            on an AI reading or summary.
          </strong>{' '}
          A person must review the underlying evidence first.
        </p>
      </>
    ),
  },
  {
    id: 'candidates',
    title: 'If you are a candidate',
    body: (
      <>
        <p>
          You can use the joining page without an account. By joining, you agree to use the Service honestly and only for
          the interview you were invited to, and not to interfere with the camera feed or the Service.
        </p>
        <p>
          Your consent is voluntary. You can decline, or leave at any time by closing the page. Questions about how your
          interview is assessed should go to the organisation that invited you. Our{' '}
          <Link href="/privacy#candidates">Privacy Policy</Link> explains your rights over your data.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You must not:</p>
        <ul>
          <li>use the Service to watch or record anyone without their knowledge and consent, or for anything other than interviews;</li>
          <li>use the Service for anything unlawful, harmful, discriminatory or deceptive;</li>
          <li>try to get into accounts, interviews or data that aren&rsquo;t yours, or get around security or usage limits;</li>
          <li>copy, reverse engineer or resell the Service, except where the law expressly allows it;</li>
          <li>overload, disrupt, or probe the Service, or send malware or automated traffic to it.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'content',
    title: 'Your data and our software',
    body: (
      <>
        <p>
          You keep all rights in the interview data you create through the Service. You give us permission to host, process
          and transmit it only as needed to provide the Service to you and as our Privacy Policy describes.
        </p>
        <p>
          We own the Service, including its software, design and brand. These terms give you a limited, non-exclusive,
          non-transferable right to use it during your subscription. Feedback you send us may be used to improve the
          Service, without any obligation to you.
        </p>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-party services',
    body: (
      <p>
        The Service relies on other providers, such as Microsoft Azure for hosting and storage, LiveKit for live video,
        AI model providers, and Razorpay for payments. Their services are governed by their own terms. We aren&rsquo;t
        responsible for their outages or failures, though we choose them with care.
      </p>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and disclaimers',
    body: (
      <>
        <p>
          We work to keep the Service running reliably, but we don&rsquo;t promise it will be uninterrupted or error-free.
          Live sessions depend on the candidate&rsquo;s device, camera and internet connection, which we don&rsquo;t
          control. We may pause the Service for maintenance.
        </p>
        <p>
          To the extent the law allows, the Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
          warranties of any kind, including any warranty that it will detect every use of AI or other assistance during an
          interview.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <>
        <p>To the extent the law allows:</p>
        <ul>
          <li>
            we are not liable for indirect, incidental, special or consequential losses, or for loss of profits, revenue,
            data or goodwill, or for hiring decisions made using the Service;
          </li>
          <li>
            our total liability arising from these terms or the Service is limited to the fees you paid us in the{' '}
            <Fill field="liabilityCapPeriod" /> before the event giving rise to the claim.
          </li>
        </ul>
        <p>Nothing in these terms limits liability that can&rsquo;t be limited by law.</p>
      </>
    ),
  },
  {
    id: 'indemnity',
    title: 'Indemnity',
    body: (
      <p>
        You agree to compensate us for losses and reasonable costs arising from a claim by a third party, including a
        candidate or a regulator, that results from your breach of these terms or your unlawful use of the Service,
        including monitoring a candidate without a lawful basis.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Suspension and termination',
    body: (
      <>
        <p>
          You can stop using the Service and close your account at any time by contacting us at{' '}
          <FillEmail field="contactEmail" />.
        </p>
        <p>
          We may suspend or close your account if you seriously or repeatedly break these terms, if you don&rsquo;t pay, or
          if the law requires it. Where reasonable, we will warn you first and give you a chance to fix the problem.
        </p>
        <p>
          When an account is closed, your data is handled as described in the retention section of our{' '}
          <Link href="/privacy#retention">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Governing law and disputes',
    body: (
      <p>
        These terms are governed by the laws of India. Before going to court, please contact us so we can try to resolve
        the issue informally. If that fails, the courts at <Fill field="governingCity" /> have exclusive jurisdiction.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        We may update these terms. We will post the new version here with a new effective date, and email account holders
        about significant changes before they take effect. If you keep using the Service after that, you accept the new
        terms. If you don&rsquo;t agree, you can cancel before they apply.
      </p>
    ),
  },
  {
    id: 'general',
    title: 'General',
    body: (
      <ul>
        <li>These terms, with the Privacy Policy, are the whole agreement between us about the Service.</li>
        <li>If part of these terms can&rsquo;t be enforced, the rest still applies.</li>
        <li>If we don&rsquo;t enforce a right straight away, we haven&rsquo;t given it up.</li>
        <li>You can&rsquo;t transfer these terms without our consent. We may transfer them as part of a sale or reorganisation of our business.</li>
        <li>
          We aren&rsquo;t responsible for delays or failures caused by events beyond our reasonable control, such as
          network or power outages, natural disasters or government action.
        </li>
      </ul>
    ),
  },
  {
    id: 'contact',
    title: 'Grievances and contact',
    body: (
      <>
        <p>For questions about these terms, or to raise a grievance, contact:</p>
        <div className="legal-callout">
          <p>
            <strong>
              <Fill field="grievanceOfficerName" />
            </strong>
            <br />
            Grievance Officer, <Fill field="companyLegalName" />
            <br />
            <Fill field="registeredAddress" />
            <br />
            Email: <FillEmail field="grievanceOfficerEmail" />
          </p>
        </div>
        <p>
          General enquiries: <FillEmail field="contactEmail" />
        </p>
      </>
    ),
  },
];

export default async function TermsPage() {
  const signedIn = (await cookies()).has('im_session');
  return (
    <LegalDocument
      signedIn={signedIn}
      title="Terms of Service"
      related={{ href: '/privacy', label: 'Privacy Policy' }}
      sections={SECTIONS}
      intro={
        <p>
          These terms set out how Kandidatex may be used, what we provide, and what we expect from interviewers and
          candidates. We&rsquo;ve kept them as plain as we can. Please read them before you use the Service.
        </p>
      }
    />
  );
}
