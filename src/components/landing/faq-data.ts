/** FAQ copy, shared by the accordion and the page's FAQPage structured data. */
export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Does the candidate need to install anything?',
    answer:
      'No. The candidate opens the joining link in a browser on their phone or a second device. There’s no app or extension to install.',
  },
  {
    question: 'Is the candidate told they’re being monitored?',
    answer:
      'Yes. The candidate gives consent on the joining page before anything starts. Nothing is captured until they agree.',
  },
  {
    question: 'Do you use face recognition?',
    answer:
      'No. There’s no face detection or recognition. The camera points at the candidate’s laptop screen, and the AI only looks at what’s on that screen.',
  },
  {
    question: 'Does a flag mean the candidate cheated?',
    answer:
      'No. A flag means something on screen, such as an AI assistant, deserves a human look. Every alert says “review recommended”, and the decision is always yours.',
  },
  {
    question: 'Which apps can the AI recognise, and how often does it check?',
    answer:
      'At random moments 1–10 seconds apart, an AI vision model names the application on screen, for example VS Code, Chrome, Terminal, ChatGPT, Claude, Gemini or Copilot. If an AI assistant appears, you get a popup and the frame is saved as a screenshot alert.',
  },
  {
    question: 'Are screenshots sent to the AI that writes the summary?',
    answer:
      'No. The post-interview summary is written from alert text only. Screenshots are never sent to the model.',
  },
  {
    question: 'Who can see screenshots and recordings?',
    answer:
      'Only the interview’s owner, or an admin. Screenshots and recordings are kept in private storage.',
  },
  {
    question: 'What happens when I use all 100 interviews?',
    answer:
      'You can’t create new interviews until your monthly count resets. The plan renews monthly, and the count starts again at 100 each month.',
  },
];
