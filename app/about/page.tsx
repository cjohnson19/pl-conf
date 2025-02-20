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

      <h2 className="mt-8">FAQ</h2>

      <h4 className="mt-4">
        Can we add <i>X</i> event?
      </h4>

      <p className="mt-2">
        Yes! Contact me or create an issue on GitHub and I&apos;ll add it as
        soon as I get the chance. To make it as quick as possible create a pull
        request with the event.
      </p>

      <h4 className="mt-4">Why should I use this site?</h4>

      <p className="mt-2">
        If you keep track of mailing lists / event websites, there really is
        little to no reason to use this website. Stick with your normal workflow
        if it works for you!
      </p>

      <h4 className="mt-4">How do I know this information is accurate?</h4>

      <p className="mt-2">
        You should <b>always</b> check the linked website to confirm the dates
        listed here. However, every day{" "}
        <a href="https://github.com/cjohnson19/pl-conf/tree/main/drift-lambda">
          I check the websites
        </a>{" "}
        to see if any of their content has changed. If something changes, I
        should know about it within a day and be able to update the site.
      </p>

      <h4 className="mt-4">Are these questions really frequently asked?</h4>

      <p className="mt-2">
        No, but I like to pretend they would be!
      </p>
    </div>
  );
}
