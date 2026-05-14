import Link from "next/link";

export default async function About() {
  return (
    <article className="mx-auto max-w-[640px] px-5 pb-24 pt-14 md:px-8">
      <p className="label-cap mb-3">About</p>
      <p className="mb-10 font-display text-[32px] font-normal leading-[1.2] tracking-[-0.01em] text-ink">
        A small, open-source aggregator for programming-language conferences.
      </p>

      <div className="space-y-5 text-[15px] leading-[1.7] text-ink-2">
        <p>
          I wanted a site that aggregated conferences and workshops in PL but
          couldn&apos;t find one that seemed maintained enough for my liking. So
          I threw this together. There&apos;s still more to do, which I&apos;ll
          get to soon.
        </p>
        <p>
          This site stores none of your information and collects no analytics.
          Your starred and hidden events are kept locally in your browser.
        </p>
        <p>
          The source lives on{" "}
          <Link
            href="https://github.com/cjohnson19/pl-conf"
            className="text-ink underline underline-offset-[3px]"
          >
            GitHub
          </Link>
          . PRs against the <code className="font-mono text-ink">data</code>{" "}
          folder are welcome — so are issues for features or corrections.
        </p>
        <p>
          For anything else, you can find my contact info at{" "}
          <Link
            href="https://chasej.dev"
            className="text-ink underline underline-offset-[3px]"
          >
            chasej.dev
          </Link>
          .
        </p>
      </div>

      <hr className="my-14 border-rule" />

      <section>
        <p className="label-cap mb-3">FAQ</p>
        <h2 className="mb-8 font-display text-[28px] font-normal leading-[1.15] tracking-[-0.01em] text-ink normal-case">
          Questions
        </h2>

        <dl className="space-y-7">
          <FaqItem
            q={
              <>
                Can we add <em className="not-italic font-medium">X</em> event?
              </>
            }
          >
            Yes. Open an issue on GitHub and I&apos;ll add it when I get the
            chance — or open a PR adding it to the data.
          </FaqItem>

          <FaqItem q="Why should I use this site?">
            If you already keep up with mailing lists and event websites, there
            isn&apos;t much reason to. Stick with what works for you.
          </FaqItem>

          <FaqItem q="How do I know this information is accurate?">
            You should <b className="font-medium text-ink">always</b> check the
            linked website to confirm dates. That said, every day a{" "}
            <Link
              href="https://github.com/cjohnson19/pl-conf/tree/main/packages/functions/drift/index.ts"
              className="text-ink underline underline-offset-[3px]"
            >
              small job
            </Link>{" "}
            checks each conference site for changes, so drift usually gets
            caught within a day.
          </FaqItem>
        </dl>
      </section>
    </article>
  );
}

function FaqItem({
  q,
  children,
}: {
  q: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="mb-1.5 text-[15px] font-semibold tracking-[-0.005em] text-ink">
        {q}
      </dt>
      <dd className="text-[14px] leading-[1.65] text-ink-2">{children}</dd>
    </div>
  );
}
