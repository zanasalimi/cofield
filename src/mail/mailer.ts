/**
 * Outbound email.
 *
 * There is no SMTP account behind this project, so the transport is simulated:
 * messages are written to the server log in the shape a real one would take,
 * and that is where a verification code appears while developing. The seam is
 * the point. `sendMail` is the only thing the rest of the app calls, so wiring
 * a real provider later means replacing one function, not chasing call sites.
 *
 * Server-only. Never import from a client component: a mail transport belongs
 * nowhere near the browser bundle.
 */

export interface Mail {
  to: string;
  subject: string;
  /** Plain text. A real transport would carry an HTML part alongside it. */
  body: string;
}

export interface MailTransport {
  send(mail: Mail): Promise<void>;
}

/**
 * Prints the message instead of sending it. Deliberately loud and deliberately
 * marked, so nobody reads a code out of a production log and assumes mail is
 * configured.
 */
const consoleTransport: MailTransport = {
  async send(mail) {
    const line = "=".repeat(62);
    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        line,
        "  SIMULATED EMAIL (no SMTP configured, nothing was delivered)",
        line,
        `  To:      ${mail.to}`,
        `  Subject: ${mail.subject}`,
        "",
        mail.body
          .trim()
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n"),
        line,
        "",
      ].join("\n"),
    );
  },
};

let transport: MailTransport = consoleTransport;

/** Swap the transport, for a real provider or for a test that asserts on mail. */
export function setMailTransport(next: MailTransport): void {
  transport = next;
}

export async function sendMail(mail: Mail): Promise<void> {
  await transport.send(mail);
}

export function verificationEmail(name: string, code: string): Omit<Mail, "to"> {
  const first = name.trim().split(/\s+/)[0] || "there";
  return {
    subject: `${code} is your Cofield code`,
    body: `Hi ${first},

Your verification code is:

    ${code}

It expires in 15 minutes. If you did not create a Cofield account, you can
ignore this email and nothing will happen.`,
  };
}
