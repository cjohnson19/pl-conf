/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
/* deno-fmt-ignore-file */
import "sst"
export {}
declare module "sst" {
  export interface Resource {
    "DriftEmail": {
      "configSet": string
      "sender": string
      "type": "sst.aws.Email"
    }
    "DriftFunction": {
      "name": string
      "type": "sst.aws.Function"
    }
    "EventList": {
      "events": {
        "ASL": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "symposium"
          "url": string
        }
        "CADE": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "format": string
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "camera-ready": string
            "notification": string
            "paper": string
            "rebuttal": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "ESOP": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "notification": string
            "paper": string
            "rebuttal": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "FSCD": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "camera-ready": string
            "notification": string
            "paper": string
            "rebuttal": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "FoSSaCS": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "camera-ready": string
            "notification": string
            "paper": string
            "rebuttal": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "HOPE": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "notification": string
            "paper": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "workshop"
          "url": string
        }
        "ICFP": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "camera-ready": string
            "conditional-acceptance": string
            "notification": string
            "paper": string
            "rebuttal": string
            "revisions": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "ICLP": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "notification": string
            "paper": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "ITP": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "camera-ready": string
            "notification": string
            "paper": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "LFMTP": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "format": string
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "notification": string
            "paper": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "workshop"
          "url": string
        }
        "LICS": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "format": string
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "notification": string
            "paper": string
            "rebuttal": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "LOPSTR": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "camera-ready": string
            "notification": string
            "paper": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "symposium"
          "url": string
        }
        "LSFA": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "camera-ready": string
            "notification": string
            "paper": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "symposium"
          "url": string
        }
        "OOPSLA": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "format": string
          "importantDateUrl": string
          "importantDates": {
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "PPDP": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "format": string
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "camera-ready": string
            "notification": string
            "paper": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "SPAA": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "camera-ready": string
            "notification": string
            "paper": string
            "rebuttal": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "symposium"
          "url": string
        }
        "TACT": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "notification": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "workshop"
          "url": string
        }
        "TYPES": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "format": string
          "importantDateUrl": string
          "importantDates": {
            "abstract": string
            "notification": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
        "UNIF": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "camera-ready": string
            "notification": string
            "paper": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "workshop"
          "url": string
        }
        "VMCAI": {
          "abbreviation": string
          "date": {
            "end": string
            "start": string
          }
          "importantDateUrl": string
          "importantDates": {
            "camera-ready": string
            "notification": string
            "paper": string
            "rebuttal": string
          }
          "lastUpdated": string
          "location": string
          "name": string
          "notes": any
          "tags": any
          "type": "conference"
          "url": string
        }
      }
      "type": "sst.sst.Linkable"
    }
    "PLConf": {
      "type": "sst.aws.Nextjs"
      "url": string
    }
    "WebpageBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
  }
}
