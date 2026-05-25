import Link from 'next/link';

export default function LandingPage() {
  return (
    <div>
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link href="/landing" className="brand">
            <span className="brand-mark" aria-hidden />
            <span>LumenAI</span>
          </Link>
          <nav className="lp-nav-links">
            <a href="#product">Product</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#docs">Docs</a>
          </nav>
          <div className="lp-nav-cta">
            <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link href="/" className="btn btn-primary btn-sm">Open app →</Link>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <span className="eyebrow-badge">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--success)',
              boxShadow: '0 0 8px var(--success)',
              display: 'inline-block',
            }}
          />
          v0.4 — streaming traces are live
        </span>
        <h1>
          Observability for the things that <em>actually</em> answer.
        </h1>
        <p className="lede">
          LumenAI captures every inference your app makes — model, latency, tokens, cost, errors —
          and ships it to a database you own. One SDK, one ingestion endpoint, no sampling tricks.
        </p>
        <div className="lp-ctas">
          <Link href="/login" className="btn btn-primary">Open the demo →</Link>
          <a href="#features" className="btn btn-ghost">Read the SDK docs</a>
        </div>
        <div className="lp-meta">
          <span><strong>3-line</strong> install</span>
          <span><strong>OpenAI · Anthropic · Gemini · Grok</strong> supported</span>
          <span><strong>~12 ms</strong> overhead per call</span>
        </div>
      </section>

      <div className="lp-strip">
        <div className="lp-strip-inner">
          <div className="lp-strip-item">
            <div className="big"><em>12</em> ms</div>
            <div className="sm">median sdk overhead</div>
          </div>
          <div className="lp-strip-item">
            <div className="big"><em>4</em> providers</div>
            <div className="sm">openai · anthropic · gemini · grok</div>
          </div>
          <div className="lp-strip-item">
            <div className="big"><em>100</em>%</div>
            <div className="sm">capture rate, no sampling</div>
          </div>
          <div className="lp-strip-item">
            <div className="big"><em>0</em> vendor lock</div>
            <div className="sm">postgres · clickhouse · your db</div>
          </div>
        </div>
      </div>

      <section className="lp-section" id="features">
        <div className="lp-section-head">
          <div className="eyebrow">what you get</div>
          <h2>
            Everything you need to <em>understand</em> what your models are doing.
          </h2>
          <p>No magic, no hosted black box. A typed schema, an ingestion API, and a UI that respects engineers&apos; time.</p>
        </div>

        <div className="lp-features">
          <div className="lp-feature">
            <div>
              <div className="icon-tile">/01</div>
              <h3>Multi-provider</h3>
              <p>One log shape across OpenAI, Anthropic, Gemini, Grok, DeepSeek, and self-hosted endpoints. Switch models without losing history.</p>
            </div>
          </div>
          <div className="lp-feature">
            <div>
              <div className="icon-tile">/02</div>
              <h3>Streaming-aware</h3>
              <p>Captures first-token latency, inter-token jitter, and total time-to-completion as distinct metrics — not one blurry &quot;duration&quot;.</p>
            </div>
          </div>
          <div className="lp-feature">
            <div>
              <div className="icon-tile">/03</div>
              <h3>Real-time dashboards</h3>
              <p>p50 / p95 / p99 latency, throughput, error rate, token spend — refreshed every second, queryable by model, project, or user.</p>
            </div>
          </div>
          <div className="lp-feature">
            <div>
              <div className="icon-tile">/04</div>
              <h3>Conversation replay</h3>
              <p>List, search, and resume any multi-turn conversation. Cancel runaway sessions. Inspect every request → response with full token attribution.</p>
            </div>
          </div>
          <div className="lp-feature">
            <div>
              <div className="icon-tile">/05</div>
              <h3>PII redaction</h3>
              <p>Configurable scrubbers run before logs leave the SDK. Emails, phone numbers, credit cards, and custom regex — never see the wire.</p>
            </div>
          </div>
          <div className="lp-feature">
            <div>
              <div className="icon-tile">/06</div>
              <h3>Event-based</h3>
              <p>Ingestion is just a queue. Subscribers tail it for alerting, evals, fine-tune dataset capture, or routing to your warehouse.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-cta-inner">
          <h2>
            Stop guessing what your <em>models</em> are doing.
          </h2>
          <p>Open the demo workspace — a working chatbot, dashboard, and conversation explorer, all wired to the SDK.</p>
          <div className="ctas">
            <Link href="/login" className="btn btn-primary">Open the demo →</Link>
            <a href="#docs" className="btn btn-ghost">Read the docs</a>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="left">© 2026 LumenAI · built with care</div>
          <nav>
            <a href="#docs">Docs</a>
            <a href="#features">Features</a>
            <Link href="/login">Sign in</Link>
            <Link href="/">App</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
