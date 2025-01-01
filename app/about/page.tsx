import Link from "next/link";

export default async function About() {
  return (
    <>
      <p>
        I wanted to find a site which aggregated conferences and workshops in
        PL, but didn&apos;t find one that seemed maintained enough for my
        liking. I figured I would throw together a quick site to do this, and
        here we are. There is still more to be done, which I&apos;ll get to
        soon.
      </p>

      <p className="mt-4">
        The site is open source and can be found on{" "}
        <Link
          href="https://github.com/cjohnson19/pl-conf"
          className="underline underline-offset-3"
        >
          GitHub
        </Link>
        . Feel free to make a PR with any changes to the event list in the{" "}
        <code>data/conf.yaml</code> file.
      </p>

      <ul>
        <li>Add tags to events</li>
        <li>
          Add to calendar functionality (Google Calendar, Outlook, ICal, etc.)
        </li>
      </ul>

      <p>
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
    </>
  );
}
