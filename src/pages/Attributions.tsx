// ┌─────────────────────────────────────────────────────────────────────────┐
// │ DESTINATION (adjust to your routing):                                     │
// │   HONEYCOMB/TheMANUAL.tech/src/pages/Attributions.tsx                      │
// │                                                                           │
// │ WIRING:                                                                   │
// │   1. Add a route:  <Route path="/attributions" element={<Attributions/>}> │
// │   2. Link it from the footer (e.g. "Data Attributions").                  │
// │                                                                           │
// │ NOTE: Self-contained, zero styling deps (inline styles). Restyle to match │
// │ the app theme whenever you like — the SOURCES content is the part that    │
// │ must stay accurate for CC BY 4.0 compliance.                              │
// └─────────────────────────────────────────────────────────────────────────┘

type DataSource = {
  title: string;
  org: string;
  href: string;
  license: string;
  licenseHref: string;
  usage: string;
};

const SOURCES: DataSource[] = [
  {
    title: "United States Cities Database (Basic)",
    org: "SimpleMaps",
    href: "https://simplemaps.com/data/us-cities",
    license: "CC BY 4.0",
    licenseHref: "https://creativecommons.org/licenses/by/4.0/",
    usage:
      "Source for U.S. place names, states, and populations. Filtered to places with population ≥ 1,000 and restructured into The Manual’s geographic taxonomy.",
  },
  {
    title: "GeoNames Geographical Database",
    org: "GeoNames (geonames.org)",
    href: "https://www.geonames.org/",
    license: "CC BY 4.0",
    licenseHref: "https://creativecommons.org/licenses/by/4.0/",
    usage:
      "Source for additional U.S. city names and populations. A subset was selected and restructured into The Manual’s geographic taxonomy.",
  },
];

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "48px 24px 80px",
    color: "#1f2421",
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: 1.6,
  },
  h1: { fontSize: 28, fontWeight: 700, margin: "0 0 8px" },
  intro: { fontSize: 16, color: "#4b524d", margin: "0 0 36px" },
  card: {
    border: "1px solid #ece6d6",
    borderLeft: "4px solid #d6a417",
    borderRadius: 10,
    padding: "20px 22px",
    marginBottom: 18,
    background: "#fffdf8",
  },
  cardTitle: { fontSize: 18, fontWeight: 650, margin: "0 0 2px" },
  org: { fontSize: 14, color: "#6b7269", margin: "0 0 12px" },
  usage: { fontSize: 15, margin: "0 0 14px" },
  metaRow: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" },
  link: {
    fontSize: 14,
    color: "#a9760a",
    textDecoration: "none",
    fontWeight: 600,
  },
  badge: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.3,
    color: "#7a560a",
    background: "#fbf0d2",
    border: "1px solid #ecd9a3",
    borderRadius: 999,
    padding: "3px 10px",
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTop: "1px solid #ece6d6",
    fontSize: 14,
    color: "#6b7269",
  },
};

export default function Attributions() {
  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Data Attributions</h1>
      <p style={styles.intro}>
        The Manual’s geographic index is built in part on open datasets. We’re
        grateful to the projects below and credit them here in accordance with
        their licenses.
      </p>

      {SOURCES.map((s) => (
        <section key={s.title} style={styles.card}>
          <h2 style={styles.cardTitle}>{s.title}</h2>
          <p style={styles.org}>{s.org}</p>
          <p style={styles.usage}>{s.usage}</p>
          <div style={styles.metaRow}>
            <a
              style={styles.link}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              View source ↗
            </a>
            <a
              style={styles.badge as React.CSSProperties}
              href={s.licenseHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.license}
            </a>
          </div>
        </section>
      ))}

      <p style={styles.footer}>
        Both datasets are used under the{" "}
        <a
          style={styles.link}
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Creative Commons Attribution 4.0 International (CC BY 4.0)
        </a>{" "}
        license. Data has been filtered and restructured for use within The
        Manual; the original creators do not endorse this project or its use of
        the data.
      </p>
    </main>
  );
}
