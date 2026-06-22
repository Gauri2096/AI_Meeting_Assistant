from app.api.routes.meetings import process_transcript_only
from pprint import pprint
from app.agents.graph import run_extraction_agent
from app.api.routes.meetings import process_transcript_only
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, get_db
from app.models.meeting import Meeting
transcript_text = '''
John: Alright, let's get started. First thing, CRM migration. We discussed moving it to AWS last month but nothing has happened yet.

Sarah: Yeah, mostly because we were waiting on the infrastructure team's estimate.

Mike: I actually got that estimate yesterday.

John: Oh, okay. What does it look like?

Mike: Roughly two weeks of work if we dedicate one engineer full-time.

Sarah: That's not too bad.

John: Then I don't see a reason to delay it further.

Mike: The only thing is downtime. We still haven't figured out the cutover plan.

Sarah: Could we do it over a weekend?

Mike: Probably.

John: Let's assume weekend migration for now.

Sarah: Fine by me.

John: Okay, so decision one: proceed with AWS migration this month.

Mike: Hold on. This month or next month?

John: Good point. Next month is probably safer.

Sarah: Yeah, next month.

John: Okay, next month then.

---

Sarah: Second item. Customer onboarding delays.

Mike: That's getting worse.

Sarah: We have a backlog of almost 400 requests.

John: Four hundred?

Sarah: Around that.

Mike: Most of them are stuck waiting for document verification.

John: Is that a staffing issue or a process issue?

Sarah: Both honestly.

Mike: We could automate part of it.

John: How much effort?

Mike: Maybe a week.

Sarah: Assuming no surprises.

John: Alright, let's investigate automation.

Sarah: Investigate or commit?

John: Investigate first.

Mike: Makes sense.

---

John: Any update on the security audit?

Sarah: Not much.

Mike: The external auditors pushed the review by two weeks.

John: Again?

Mike: Apparently one of their senior reviewers is unavailable.

Sarah: That's the third delay.

John: Does that impact compliance deadlines?

Sarah: It might.

Mike: Not immediately.

John: I want visibility on that risk.

Sarah: I'll keep tracking it.

---

Mike: Also, customer complaints have increased.

John: Related to onboarding?

Mike: Mostly.

Sarah: Some are about portal performance too.

John: Is the portal actually slower?

Mike: We don't know yet.

Sarah: Engineering hasn't finished the investigation.

John: Let's not speculate then.

---

Sarah: By the way, who owns the migration plan?

Mike: I thought Sarah did.

Sarah: I can do it.

John: Great. Sarah owns the migration plan.

Sarah: Okay.

John: When can you have a draft?

Sarah: Maybe July 15.

Mike: That's reasonable.

John: Let's lock that in.

---

Mike: One concern though.

John: Go ahead.

Mike: If the migration slips, it could overlap with the audit work.

Sarah: That's true.

John: Good catch.

Mike: Resource contention could become a problem.

Sarah: Especially if engineering has to support both.

John: Add that to the risk register.

---

John: Anything else?

Sarah: Nothing from me.

Mike: Same here.

John: Alright.
'''
db=SessionLocal()
meeting = (
    db.query(Meeting)
    .filter(
        Meeting.id ==
        "05b699a2-219e-4ae3-9aed-1a24b21d104e"
    )
    .first()
)

print(meeting)

speaker_map = {
    "SPEAKER_00": "John",
    "SPEAKER_01": "Sarah",
    "SPEAKER_02": "Mike"
}

result = process_transcript_only(
    meeting_id=meeting.id,
    transcript_text=transcript_text,
    speaker_map=speaker_map
)
