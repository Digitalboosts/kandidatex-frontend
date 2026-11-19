import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LEGAL_IS_DRAFT } from '@/components/legal/legal-config';
import { Fill, FillEmail, LegalDocument, type LegalSection } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Privacy Policy · Kandidatex',
  description:
    'What Kandidatex collects from interviewers and candidates, why, who can see it, how long it is kept and how to exercise your rights.',
  alternates: { canonical: '/privacy' },
  // Kept out of search results until every legal detail is filled in.
  robots: LEGAL_IS_DRAFT ? { index: false, follow: true } : undefined,
};

const SECTIONS: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are and our role',
    body: (
      <>
        <p>
          Kandidatex is operated by <Fill field="companyLegalName" />, <Fill field="registeredAddress" /> (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;). This policy explains how we handle personal data under India&rsquo;s Digital Personal Data
          Protection Act, 2023 (&ldquo;DPDP Act&rdquo;), the Information Technology Act, 2000 and the rules made under them.
        </p>
        <p>Our role depends on whose data it is:</p>
        <ul>
          <li>
            <strong>Interviewers and account holders.</strong> For your account and billing details, we decide why and
            how they are processed, so we are the Data Fiduciary.
          </li>
          <li>
            <strong>Candidates.</strong> The organisation that invites you to an interview decides to monitor it and what
            to do with the results. That organisation is the Data Fiduciary for your interview data. We process it on its
            behalf, as its Data Processor, and only to run the service it has asked for. Our joining page collects your
            consent for the organisation before monitoring starts.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <h3>From interviewers and account holders</h3>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address and password, which you give us when you
            register.
          </li>
          <li>
            <strong>Interview details you create:</strong> each interview&rsquo;s title, the candidate&rsquo;s name and an
            optional scheduled time.
          </li>
          <li>
            <strong>Billing records:</strong> payments are handled by Razorpay. You enter card or UPI details in
            Razorpay&rsquo;s own checkout window, and we never see or store them. We receive and keep the payment ID,
            subscription ID, amount, status and payment method type.
          </li>
        </ul>

        <h3>From candidates</h3>
        <ul>
          <li>
            <strong>Joining details:</strong> the interview ID and your name, which you enter on the joining page, and
            your consent.
          </li>
          <li>
            <strong>Live camera and microphone:</strong> while the session runs, the camera and microphone of the device
            you join from are streamed live to the interviewer. You point the camera at your laptop screen, so it
            captures what is on that screen. A live stream is not stored unless the interviewer records it.
          </li>
          <li>
            <strong>Recordings:</strong> if the interviewer selects Record, the camera video and microphone audio are
            saved as a recording.
          </li>
          <li>
            <strong>Screen analysis frames:</strong> at random moments during the session, roughly 1 to 10 seconds apart,
            a still frame from the camera feed is sent to an AI vision model, which names the application on screen (for
            example a code editor, a browser or an AI assistant). Frames flagged as &ldquo;review recommended&rdquo; are
            saved as screenshot alerts. Other frames are not stored by us.
          </li>
          <li>
            <strong>Setup measurements:</strong> the calibration checks (framing, lighting, focus and stability) run on
            your device. Only the resulting measurements are sent to us, not the calibration images.
          </li>
          <li>
            <strong>Event timeline:</strong> a record of what happened in the session, such as when you joined or left,
            when the screen left the camera&rsquo;s view, which application was detected, connection quality, and when a
            review was recommended.
          </li>
          <li>
            <strong>AI summary:</strong> after the interview, a short written summary of the alerts.
          </li>
        </ul>

        <h3>From everyone</h3>
        <ul>
          <li>
            <strong>Technical data:</strong> your IP address and basic request details, which we use to keep the service
            secure, for example to limit repeated sign-in, registration and joining attempts.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'what-we-dont-do',
    title: 'What we don’t do',
    body: (
      <ul>
        <li>We don&rsquo;t use face detection, face recognition, or any other biometric identification.</li>
        <li>We don&rsquo;t track eye movement or analyse a candidate&rsquo;s behaviour or expressions.</li>
        <li>We don&rsquo;t sell personal data or use it for advertising.</li>
        <li>We don&rsquo;t use advertising or third-party analytics cookies.</li>
        <li>
          We don&rsquo;t label anyone as cheating. Every flag says &ldquo;review recommended&rdquo;, and a person decides
          what it means.
        </li>
      </ul>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How we use information',
    body: (
      <>
        <ul>
          <li>To create and secure your account and sign you in.</li>
          <li>To run interviews: connect the candidate, stream the camera feed live and show status to the interviewer.</li>
          <li>To identify the application on screen and alert the interviewer when something should be reviewed.</li>
          <li>To save recordings, screenshots, the timeline and the summary so the interviewer can review them later.</li>
          <li>To take payments, manage your subscription and count the interviews in your plan.</li>
          <li>To keep the service secure, prevent abuse and fix problems.</li>
          <li>To meet our legal obligations, such as tax and accounting records.</li>
        </ul>
        <p>
          We process candidate data on the basis of the consent given on the joining page. We process account and billing
          data with your consent and for the legitimate uses the DPDP Act allows, such as when you give us information for
          a specific purpose, like running your account. You can withdraw consent at any time (see{' '}
          <a href="#your-rights">Your rights</a>), though this won&rsquo;t affect processing that has already happened.
        </p>
      </>
    ),
  },
  {
    id: 'ai',
    title: 'How AI is used',
    body: (
      <>
        <p>We use AI models for two tasks, and nothing else:</p>
        <ul>
          <li>
            <strong>Naming the application on screen.</strong> Still frames from the camera feed are sent to an AI vision
            model provided by <Fill field="aiVisionProvider" />. It returns the application&rsquo;s name, its category and
            a confidence level.
          </li>
          <li>
            <strong>Writing the post-interview summary.</strong> The summary is written by a model provided by{' '}
            <Fill field="aiSummaryProvider" />, from the <em>text</em> of the alerts only. Screenshots and recordings are
            never sent to this model.
          </li>
        </ul>
        <p>
          AI readings can be wrong. They are prompts for a person to look, not decisions. No decision about a candidate is
          made by Kandidatex automatically.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: (
      <>
        <p>We use one cookie, and only because the service can&rsquo;t work without it:</p>
        <table>
          <thead>
            <tr>
              <th scope="col">Cookie</th>
              <th scope="col">Purpose</th>
              <th scope="col">Lasts</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>im_session</code>
              </td>
              <td>Keeps an interviewer signed in. It can&rsquo;t be read by page scripts.</td>
              <td>8 hours, or until you sign out</td>
            </tr>
          </tbody>
        </table>
        <p>
          Candidates don&rsquo;t get a cookie. Their access to an interview is held in the open browser tab only, and
          ends when the tab is closed. Razorpay&rsquo;s checkout window may set its own cookies, under Razorpay&rsquo;s
          privacy policy.
        </p>
      </>
    ),
  },
  {
    id: 'who-can-see',
    title: 'Who can see your data',
    body: (
      <ul>
        <li>
          <strong>The interviewer who owns the interview</strong> can watch the live session and see its recordings,
          screenshots, timeline and summary.
        </li>
        <li>
          <strong>Our authorised administrators</strong> can access interviews where needed for support, security or
          legal compliance.
        </li>
        <li>
          <strong>Service providers</strong> listed below process data for us under contract, only to provide their
          service.
        </li>
        <li>
          <strong>Authorities,</strong> where the law requires us to share data, for example under a valid court order.
        </li>
      </ul>
    ),
  },
  {
    id: 'service-providers',
    title: 'Service providers',
    body: (
      <table>
        <thead>
          <tr>
            <th scope="col">Provider</th>
            <th scope="col">What they do for us</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Microsoft Azure</td>
            <td>Hosts the service and stores recordings and screenshots in private storage.</td>
          </tr>
          <tr>
            <td>LiveKit</td>
            <td>
              Relays the live camera and microphone stream. Hosting: <Fill field="liveVideoHosting" />.
            </td>
          </tr>
          <tr>
            <td>
              <Fill field="aiVisionProvider" />
            </td>
            <td>Names the application on screen from still frames.</td>
          </tr>
          <tr>
            <td>
              <Fill field="aiSummaryProvider" />
            </td>
            <td>Writes the post-interview summary from alert text.</td>
          </tr>
          <tr>
            <td>Razorpay</td>
            <td>Processes payments and subscriptions.</td>
          </tr>
        </tbody>
      </table>
    ),
  },
  {
    id: 'storage-location',
    title: 'Where data is stored',
    body: (
      <p>
        Data is stored with <Fill field="dataRegion" />. Some service providers may process data outside India. When
        they do, we only transfer data as the DPDP Act permits, and we require them to protect it.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep data',
    body: (
      <>
        <table>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Kept for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Recordings</td>
              <td>
                <Fill field="recordingRetention" />
              </td>
            </tr>
            <tr>
              <td>Screenshot alerts</td>
              <td>
                <Fill field="screenshotRetention" />
              </td>
            </tr>
            <tr>
              <td>Event timeline and AI summary</td>
              <td>
                <Fill field="timelineRetention" />
              </td>
            </tr>
            <tr>
              <td>Account details</td>
              <td>
                While your account is open, then <Fill field="closedAccountRetention" />
              </td>
            </tr>
            <tr>
              <td>Billing records</td>
              <td>As long as tax and accounting laws require</td>
            </tr>
          </tbody>
        </table>
        <p>
          Live streams are not stored unless recorded. Screen analysis frames that aren&rsquo;t flagged are not stored by
          us. When the retention period ends, we delete the data or make it anonymous, unless the law requires us to keep
          it longer.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'How we protect data',
    body: (
      <>
        <ul>
          <li>The service runs over encrypted HTTPS connections.</li>
          <li>Interviewer sessions use a cookie that page scripts can&rsquo;t read, and signing out ends every session.</li>
          <li>
            Recordings and screenshots are kept in private storage. They are only served to a signed-in interviewer who
            owns the interview, or to an administrator, never through a public link.
          </li>
          <li>A candidate&rsquo;s access works for one interview only, expires after 4 hours and ends with the interview.</li>
          <li>Sign-in, registration and joining are rate limited to slow down abuse.</li>
        </ul>
        <p>
          No system is perfectly secure. If a breach affects your personal data, we will inform you and the Data
          Protection Board of India as the law requires.
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <p>Under the DPDP Act, you can:</p>
        <ul>
          <li>Ask for a summary of the personal data we hold about you and how we process it.</li>
          <li>Ask us to correct, complete, update or erase your personal data.</li>
          <li>Withdraw your consent. We will stop the processing that depends on it.</li>
          <li>Nominate someone to exercise your rights if you die or become unable to.</li>
          <li>Raise a grievance with us, and if you are not satisfied, complain to the Data Protection Board of India.</li>
        </ul>
        <p>
          To use any of these rights, email <FillEmail field="contactEmail" />. We may need to confirm your identity first.
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
          Monitoring only starts after you give consent on the joining page. You can decline, and you can leave a session
          at any time by closing the page. The organisation that invited you decides how your interview data is used, so
          please send requests about your interview to them first.
        </p>
        <p>
          If you can&rsquo;t reach them, write to us at <FillEmail field="contactEmail" /> with the interview ID. We will
          pass your request to the organisation, and help them respond.
        </p>
        <div className="legal-callout">
          <p>
            <strong>Tip:</strong> before the session, close anything on your laptop you don&rsquo;t want the camera to
            capture, such as personal messages, other tabs or notifications.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        Kandidatex is meant for adults. We don&rsquo;t knowingly process personal data of anyone under 18 without
        verifiable consent from a parent or lawful guardian. If you believe a child&rsquo;s data has been processed without
        it, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We may update this policy as the service or the law changes. We will post the new version here with a new
        effective date, and tell account holders by email about significant changes before they take effect.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Grievance Officer and contact',
    body: (
      <>
        <p>For questions, requests or complaints about your personal data, contact our Grievance Officer:</p>
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
        <p>We will acknowledge your grievance and respond within the time the law requires.</p>
      </>
    ),
  },
];

export default async function PrivacyPage() {
  const signedIn = (await cookies()).has('im_session');
  return (
    <LegalDocument
      signedIn={signedIn}
      title="Privacy Policy"
      related={{ href: '/terms', label: 'Terms of Service' }}
      sections={SECTIONS}
      intro={
        <p>
          Kandidatex lets an interviewer see a candidate&rsquo;s laptop screen through a phone camera during a
          remote interview. That means handling personal data with care. This policy explains, in plain language, what we
          collect, why, who can see it and the choices you have.
        </p>
      }
    />
  );
}
