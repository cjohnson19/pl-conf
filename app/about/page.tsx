import Link from "next/link";

export default async function About() {
  return (
    <div className="px-11">
      <p>
        I wanted to find a site which aggregated conferences and workshops in
        PL, but didn&apos;t find one that seemed maintained enough for my
        liking. I figured I would throw together a quick site to do this, and
        here we are. There is still more to be done, which I&apos;ll get to
        soon.
      </p>

      <p className="mt-4">
        This site stores none of your information and collects no analytics.
        Information about your favorite and hidden events are stored locally in
        your browser.
      </p>

      <p className="mt-4">
        The site is open source and can be found on{" "}
        <Link
          href="https://github.com/cjohnson19/pl-conf"
          className="underline underline-offset-3"
        >
          GitHub
        </Link>
        . Feel free to make a PR with any changes to the events in the{" "}
        <code>data</code> folder. I welcome any feature requests and would be
        grateful if you made an issue on the GitHub page.
      </p>

      <p className="mt-4">
        Some of the most immediate features in the pipeline include:
      </p>

      <ul className="mt-2">
        <li>Add tags to events</li>
        <li>Filtering by tags</li>
        <li>Filtering by year</li>
        <li>Include description for events</li>
      </ul>

      <p className="mt-4">
        If you have any suggestions or feedback, feel free to reach out to me.
        You can find my contact information on my personal site,{" "}
        <Link
          href="https://chasej.dev"
          className="underline underline-offset-3"
        >
          chasej.dev
        </Link>
        .
      </p>
    </div>
  );
}
