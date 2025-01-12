# PL Conferences

This project tries to list all the conferences and workshops that are related to
programming languages. The hope is to create a centralized place where people
can find information about upcoming events.

## Features

- Important dates and deadlines listed along with reference
- Links to the event website
- Daily automated checks for any updated information
- Search and filtering by event type and name
- Calendar event export

## Upcoming Features

- [ ] Event tags
- [ ] Filter out TBD events
- [ ] Sort by date
- [ ] Submission links

## Contributing

Edit `data/conf.yaml` with the conference details. Through an abuse of notation,
`&` denotes that the ordering of the fields does not matter.

```
Entry ::= Name 
        & Abbreviation 
        & Type 
        & Date?
        & Location? 
        & Website? 
        & ImportantDates? 
        & Tags? 
        & LastUpdated;

Name ::= {
  name: STR
};
Abbreviation ::= {
  abbreviation: STR
};
Type ::= {
  type: "conference" | "workshop"
};
Date ::= {
  date: {
    { start: MaybeDate }
    & 
    { end: MaybeDate }
  }
};
Location ::= {
  location: STR
};
Website ::= {
  url: URL
};
ImportantDates ::= {
  importantDates: {
      abstract?: DATE
    & submission?: DATE
    & notification?: DATE
    & camera-ready?: DATE
    & registration?: DATE
    & conditional-acceptance?: DATE
    & revisions?: DATE
    & rebuttal?: DATE
  }
  importantDateUrl: URL
};
Tags ::= {
  tags: [STR]
};
LastUpdated ::= {
  lastUpdated: DATE
};

MaybeDate ::= DATE | "TBD"
DATE ::= [0-9]{4}-[0-9]{2}-[0-9]{2}
URL ::= Javascript URL (https://url.spec.whatwg.org/#url)
```