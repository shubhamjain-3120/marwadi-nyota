const services = [
  {
    number: "01",
    title: "Lead capture and routing",
    text: "Send forms, ads, calls, chats, and inbound requests into the right GHL pipeline, owner, and follow-up path within seconds.",
  },
  {
    number: "02",
    title: "Missed-call recovery",
    text: "Trigger SMS, email, task creation, voicemail tagging, and rep alerts so high-intent leads are contacted before they cool down.",
  },
  {
    number: "03",
    title: "CRM and pipeline hygiene",
    text: "Deduplicate records, normalize fields, update stages, enrich contacts, and keep Make.com scenarios readable for your team.",
  },
  {
    number: "04",
    title: "Quote, invoice, and payment flows",
    text: "Move won deals into invoices, payment links, Xero records, client folders, and internal handoff tasks without manual copy-paste.",
  },
  {
    number: "05",
    title: "Ops dashboards and alerts",
    text: "Track bottlenecks, failed automations, lead response speed, booked calls, revenue movement, and owner-level follow-through.",
  },
  {
    number: "06",
    title: "Automation repair and cleanup",
    text: "Replace brittle Zapier or Make.com spaghetti with modular, documented scenarios that survive real users and messy data.",
  },
];

const packages = [
  {
    title: "Automation Audit",
    text: "Map your current lead flow, find leaks, and identify the fastest wins.",
    bullets: ["Scenario and CRM review", "Lead-response gap analysis", "Prioritized automation plan"],
  },
  {
    title: "Sales Pipeline Build",
    text: "Design and launch a complete Make.com sales automation system.",
    bullets: ["Lead capture and routing", "GHL pipeline and task automation", "Testing, documentation, and handoff"],
    featured: true,
  },
  {
    title: "Ongoing Automation Partner",
    text: "Keep improving your systems as campaigns, tools, and offers change.",
    bullets: ["New scenario builds", "Monitoring and fixes", "Monthly optimization backlog"],
  },
];

const process = [
  ["Map the revenue flow", "We trace every lead source, decision point, owner, field, and handoff."],
  ["Build in Make.com", "I create modular scenarios with clear filters, routers, retries, and logs."],
  ["Test the ugly cases", "We validate duplicates, missing data, failures, delays, and handoff gaps."],
  ["Launch and hand over", "Your team gets a clean system, simple docs, and a clear next-step backlog."],
];

export default function App() {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Home">
          <span className="brand-mark">SJ</span>
          <span>Make Systems</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#services">Services</a>
          <a href="#proof">Proof</a>
          <a href="#process">Process</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="header-cta" href="#contact">Book a build</a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Make.com automation specialist for sales teams</p>
            <h1>End-to-end sales automations that close deals while you sleep.</h1>
            <p className="hero-text">
              I build Make.com and GoHighLevel systems that catch every lead, follow up instantly,
              route work cleanly, and turn messy sales operations into reliable pipelines your team
              can actually maintain.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#contact">Plan my automation</a>
              <a className="button secondary" href="#services">See what I build</a>
            </div>
            <dl className="hero-stats" aria-label="Client outcomes">
              <div>
                <dt>14 to 3 days</dt>
                <dd>sales cycle reduced</dd>
              </div>
              <div>
                <dt>20%</dt>
                <dd>missed-call leads recovered</dd>
              </div>
              <div>
                <dt>200%</dt>
                <dd>support capacity increase</dd>
              </div>
            </dl>
          </div>

          <div className="hero-visual" aria-label="Make.com automation workflow preview">
            <img
              src="/assets/make-automation-workflow.svg"
              alt="Workflow showing leads moving through Make.com to GHL, CRM, invoices, and follow-up"
            />
          </div>
        </section>

        <section className="logo-strip" aria-label="Automation platforms">
          <span>Make.com</span>
          <span>GoHighLevel</span>
          <span>Airtable</span>
          <span>Monday.com</span>
          <span>Xero</span>
          <span>Zapier</span>
        </section>

        <section id="services" className="section">
          <div className="section-heading">
            <p className="eyebrow">What I automate</p>
            <h2>Make.com scenarios built for real-world sales ops.</h2>
            <p>
              Clean pipelines, fast response times, and edge cases handled before they become lost
              revenue.
            </p>
          </div>

          <div className="service-grid">
            {services.map((service) => (
              <article className="service-card" key={service.title}>
                <span className="card-number">{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="proof" className="proof-section">
          <div className="proof-copy">
            <p className="eyebrow">Why clients hire me</p>
            <h2>Not just happy-path automation.</h2>
            <p>
              Businesses rarely lose deals because the lead was bad. They lose them through slow
              follow-up, broken handoffs, duplicate records, missing alerts, and manual steps that
              quietly stack up.
            </p>
            <p>
              I design Make.com workflows around those rough edges: retries, fallbacks, logging,
              ownership rules, naming conventions, and simple documentation so the system can be
              maintained after launch.
            </p>
          </div>
          <div className="proof-list">
            <div>
              <strong>Built for messy inputs</strong>
              <span>Bad phone formats, duplicate contacts, blank fields, late webhooks.</span>
            </div>
            <div>
              <strong>Built for sales speed</strong>
              <span>Instant routing, nudges, reminders, and recovery loops.</span>
            </div>
            <div>
              <strong>Built to maintain</strong>
              <span>Clear scenario names, notes, test paths, and failure alerts.</span>
            </div>
          </div>
        </section>

        <section className="section packages-section">
          <div className="section-heading">
            <p className="eyebrow">Engagements</p>
            <h2>Choose the level of Make.com help you need.</h2>
          </div>

          <div className="package-grid">
            {packages.map((item) => (
              <article className={item.featured ? "package featured" : "package"} key={item.title}>
                {item.featured && <div className="badge">Most requested</div>}
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <ul>
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="process-section">
          <div className="section-heading">
            <p className="eyebrow">How it works</p>
            <h2>A practical build process without automation theater.</h2>
          </div>
          <div className="timeline">
            {process.map(([title, text], index) => (
              <div key={title}>
                <span>{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="contact-section">
          <div>
            <p className="eyebrow">Ready to stop losing warm leads?</p>
            <h2>
              Send me your current sales flow. I will show you what Make.com should automate first.
            </h2>
          </div>
          <div className="contact-panel">
            <a
              className="button primary full"
              href="mailto:hello@vivahapp.shop?subject=Make.com%20automation%20build%20request"
            >
              Email project brief
            </a>
            <p>
              Include your tools, lead sources, current bottleneck, and the first workflow you want
              off your team&apos;s plate.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Shubham Jain - Mumbai, India</span>
        <span>Make.com - GoHighLevel - Sales automation</span>
      </footer>
    </>
  );
}
