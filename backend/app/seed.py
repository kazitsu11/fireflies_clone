"""Seed the database with realistic demo meetings.

Run with:  python -m app.seed   (idempotent: wipes everything, then reseeds)

Design notes
------------
* Transcript timestamps are spread across a per-meeting span that is always
  shorter than ``SAMPLE_AUDIO_DURATION_SECONDS``. The frontend plays a single
  static ``/sample-audio.mp3`` for every meeting; bounding all timestamps below
  the audio length means every transcript line / chapter / action item maps to
  a real, seekable position so the player seek-bar lines up.
* Each segment gets a sequential ``idx`` (0,1,2…) so ordering is deterministic.
* Chapter and action-item ``start_ms`` are taken from a real segment's
  ``start_ms`` (referenced by segment index), never invented.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from .database import Base, SessionLocal, engine
from .models import (
    ActionItem,
    Keyword,
    Meeting,
    Participant,
    Summary,
    SummaryChapter,
    TranscriptSegment,
    User,
)

# The static sample audio (added under frontend/public in the frontend phase)
# is expected to be at least this long. Every seeded timestamp stays under it.
SAMPLE_AUDIO_DURATION_SECONDS = 600
AUDIO_MS = SAMPLE_AUDIO_DURATION_SECONDS * 1000
AUDIO_URL = "/sample-audio.mp3"

# Rough spoken-pace weight per line; scaled per meeting to fill its span.
_MS_PER_WORD = 350


# --------------------------------------------------------------------------- #
# Meeting specs
# --------------------------------------------------------------------------- #
MEETINGS: list[dict] = [
    {
        "title": "Q3 Product Roadmap Sync",
        "description": "Cross-functional alignment on Q3 priorities: onboarding, analytics, and enterprise readiness.",
        "days_ago": 2,
        "span_ms": 560_000,
        "participants": [
            ("Sarah Chen", "sarah@fireflies.local", "Speaker 1"),
            ("Tom Reyes", "tom@fireflies.local", "Speaker 2"),
            ("Priya Patel", "priya@fireflies.local", "Speaker 3"),
            ("Maya Singh", "maya@fireflies.local", "Speaker 4"),
        ],
        "dialogue": [
            ("Sarah Chen", "Morning everyone, let's kick off the Q3 roadmap sync. Big agenda today."),
            ("Sarah Chen", "The three themes I want to land are onboarding, analytics, and enterprise readiness."),
            ("Tom Reyes", "Sounds good. The onboarding redesign is basically done on the engineering side."),
            ("Tom Reyes", "We shipped the new flow to fifty percent of users last Thursday."),
            ("Priya Patel", "And early signals look strong. Activation is up about twelve percent in the test cohort."),
            ("Maya Singh", "I can confirm that. Day-one activation went from forty-one to forty-six percent."),
            ("Sarah Chen", "That's fantastic. Let's plan to roll it out to a hundred percent next week."),
            ("Tom Reyes", "Agreed. I'll coordinate the full rollout with the platform team."),
            ("Sarah Chen", "Great. Moving on to analytics. This is the big new bet for Q3."),
            ("Priya Patel", "The dashboard concepts are ready for review. I'll share the Figma after this."),
            ("Maya Singh", "From a data side, we need to define the core metrics before we build anything."),
            ("Sarah Chen", "Right. Maya, can you own the metrics spec? Let's get it done this week."),
            ("Maya Singh", "Yes, I'll draft the analytics metrics spec by Friday."),
            ("Tom Reyes", "One concern: the events pipeline isn't fully instrumented yet."),
            ("Tom Reyes", "We'll need about two sprints to get clean event data flowing."),
            ("Sarah Chen", "Noted. Let's treat instrumentation as a dependency for the dashboard."),
            ("Priya Patel", "I'll design around placeholder data so we don't block on the pipeline."),
            ("Sarah Chen", "Perfect. Third theme: enterprise readiness, meaning SSO and audit logs."),
            ("Tom Reyes", "SSO is scoped. SAML support is the main lift, roughly three weeks."),
            ("Sarah Chen", "Do we have a customer driving the SSO requirement?"),
            ("Maya Singh", "Yes, two enterprise deals are gated on SSO according to the sales team."),
            ("Sarah Chen", "That's enough to prioritize it. Tom, let's start SSO next sprint."),
            ("Tom Reyes", "Will do. I'll write the technical design doc for SSO this week."),
            ("Priya Patel", "Should audit logs be in the same release as SSO?"),
            ("Sarah Chen", "Let's decouple them. SSO first, audit logs as a fast follow."),
            ("Maya Singh", "Makes sense. I'll make sure the audit events are captured even if the UI lags."),
            ("Sarah Chen", "Good thinking. Let's talk timeline risks before we wrap."),
            ("Tom Reyes", "The main risk is the analytics pipeline. If it slips, the dashboard slips."),
            ("Priya Patel", "And we're a designer short until the new hire starts in August."),
            ("Sarah Chen", "I'll raise the headcount risk with leadership and see if we can pull in a contractor."),
            ("Maya Singh", "One more thing, we should set up a weekly metrics review once analytics ships."),
            ("Sarah Chen", "Love it. Let's add that to the calendar for Q3."),
            ("Sarah Chen", "Okay, action items are clear. Thanks everyone, great session."),
            ("Tom Reyes", "Thanks all. I'll send the rollout plan by end of day."),
        ],
        "keywords": ["Onboarding", "Analytics", "Enterprise", "SSO", "Roadmap", "Activation"],
        "overview": (
            "A Q3 planning sync covering three priorities — finishing the onboarding redesign "
            "(now driving a ~12% activation lift), kicking off the new analytics dashboard, and "
            "starting enterprise readiness led by SSO. The team aligned on a full onboarding "
            "rollout, defining analytics metrics before building, and sequencing SSO ahead of "
            "audit logs, while flagging the events pipeline and design headcount as the top risks."
        ),
        "chapters": [
            {"title": "Onboarding rollout", "seg": 2, "bullets": [
                "New flow shipped to 50% of users", "Activation up ~12% in the test cohort",
                "Plan full rollout to 100% next week"]},
            {"title": "Analytics dashboard", "seg": 8, "bullets": [
                "Dashboard concepts ready for review", "Metrics spec needed before build",
                "Events pipeline is a dependency (~2 sprints)"]},
            {"title": "Enterprise readiness & SSO", "seg": 17, "bullets": [
                "SAML SSO scoped at ~3 weeks", "Two enterprise deals gated on SSO",
                "Audit logs as a fast follow"]},
            {"title": "Risks & next steps", "seg": 26, "bullets": [
                "Analytics pipeline is the top timeline risk",
                "Design team is one person short until August",
                "Weekly metrics review once analytics ships"]},
        ],
        "action_items": [
            {"text": "Coordinate the full onboarding rollout to 100% of users", "assignee": "Tom Reyes", "seg": 7, "completed": False},
            {"text": "Draft the analytics metrics spec by Friday", "assignee": "Maya Singh", "seg": 12, "completed": False},
            {"text": "Write the SSO technical design doc", "assignee": "Tom Reyes", "seg": 22, "completed": False},
            {"text": "Raise the design headcount risk with leadership", "assignee": "Sarah Chen", "seg": 29, "completed": False},
            {"text": "Send the onboarding rollout plan by end of day", "assignee": "Tom Reyes", "seg": 33, "completed": True},
        ],
    },
    {
        "title": "Acme Corp — Sales Discovery Call",
        "description": "Discovery call with Acme's operations team to understand their reporting workflow and pain points.",
        "days_ago": 4,
        "span_ms": 470_000,
        "participants": [
            ("Daniel Brooks", "daniel@fireflies.local", "Speaker 1"),
            ("Rachel Kim", "rachel@fireflies.local", "Speaker 2"),
            ("Mark Davis", "mark@acme.example", "Speaker 3"),
            ("Lena Ortiz", "lena@acme.example", "Speaker 4"),
        ],
        "dialogue": [
            ("Daniel Brooks", "Hi Mark, Lena, thanks for making time. Excited to learn about Acme's workflow."),
            ("Mark Davis", "Happy to. We've been struggling with manual reporting and it's eating our team's time."),
            ("Daniel Brooks", "That's a common pain. Can you walk me through how reporting works today?"),
            ("Lena Ortiz", "Sure. Every Monday I pull data from three systems and stitch it together in spreadsheets."),
            ("Lena Ortiz", "It takes me almost a full day, and errors creep in constantly."),
            ("Mark Davis", "And by the time leadership sees it, the numbers are already stale."),
            ("Daniel Brooks", "Got it. So the core issue is manual consolidation and timeliness."),
            ("Rachel Kim", "How many data sources are we talking about, and what are they?"),
            ("Lena Ortiz", "Three main ones, our CRM, the billing system, and a support tool."),
            ("Rachel Kim", "All three have APIs we integrate with today, so that's good news."),
            ("Mark Davis", "That's encouraging. Integration was our biggest worry."),
            ("Daniel Brooks", "What does success look like for you twelve months from now?"),
            ("Mark Davis", "Honestly, real-time dashboards and zero manual spreadsheet work."),
            ("Lena Ortiz", "And alerts when a metric goes off track, so we're not reacting late."),
            ("Rachel Kim", "Our platform does both. Let me show a quick example of automated alerts."),
            ("Rachel Kim", "Here you can configure thresholds and route alerts to Slack or email."),
            ("Mark Davis", "That's exactly what we need. How long does a typical rollout take?"),
            ("Daniel Brooks", "For your setup, I'd estimate four to six weeks to full production."),
            ("Mark Davis", "And what about pricing? We need to justify this to finance."),
            ("Daniel Brooks", "Pricing scales with data volume and seats. I'll send a tailored quote this week."),
            ("Lena Ortiz", "Can we get a trial environment to test with our actual data?"),
            ("Rachel Kim", "Absolutely. I'll set up a sandbox connected to a sample of your CRM data."),
            ("Mark Davis", "Who from your side would support us during onboarding?"),
            ("Daniel Brooks", "You'd get a dedicated success manager plus Rachel for technical setup."),
            ("Mark Davis", "Good. The decision will involve our CFO, so timing matters."),
            ("Daniel Brooks", "Understood. What's your ideal timeline for making a decision?"),
            ("Mark Davis", "We'd like to decide before the end of next month."),
            ("Daniel Brooks", "That works. I'll follow up with the quote and trial details by Friday."),
            ("Rachel Kim", "And I'll prepare the sandbox so you can start testing early next week."),
            ("Mark Davis", "Perfect. This has been really helpful, looking forward to next steps."),
            ("Daniel Brooks", "Likewise, thanks Mark and Lena. We'll be in touch shortly."),
        ],
        "keywords": ["Reporting", "Integration", "Dashboards", "Pricing", "Trial", "Onboarding"],
        "overview": (
            "A discovery call with Acme's operations team uncovering heavy manual reporting pain — "
            "nearly a full day each week consolidating CRM, billing, and support data into "
            "spreadsheets. The prospect wants real-time dashboards and proactive alerts; all three "
            "sources have APIs, rollout is estimated at 4–6 weeks, and next steps are a tailored "
            "quote and a sandbox trial ahead of a decision by the end of next month."
        ),
        "chapters": [
            {"title": "Current reporting pain", "seg": 3, "bullets": [
                "Manual weekly consolidation across 3 systems",
                "Takes nearly a full day with frequent errors",
                "Numbers are stale by the time leadership sees them"]},
            {"title": "Desired outcomes", "seg": 11, "bullets": [
                "Real-time dashboards, no spreadsheets", "Threshold-based alerts to Slack/email",
                "All sources have APIs to integrate"]},
            {"title": "Rollout, pricing & next steps", "seg": 17, "bullets": [
                "4–6 week rollout estimate", "Tailored quote to follow",
                "Sandbox trial with real data; decision by end of next month"]},
        ],
        "action_items": [
            {"text": "Send Acme a tailored pricing quote", "assignee": "Daniel Brooks", "seg": 19, "completed": False},
            {"text": "Set up a sandbox trial with sample CRM data", "assignee": "Rachel Kim", "seg": 21, "completed": False},
            {"text": "Follow up with quote and trial details by Friday", "assignee": "Daniel Brooks", "seg": 27, "completed": False},
        ],
    },
    {
        "title": "Weekly Engineering Standup",
        "description": "Quick status sync across backend, frontend, and platform; surface blockers and dependencies.",
        "days_ago": 1,
        "span_ms": 430_000,
        "participants": [
            ("Jordan Lee", "jordan@fireflies.local", "Speaker 1"),
            ("Alex Park", "alex@fireflies.local", "Speaker 2"),
            ("Sofia Russo", "sofia@fireflies.local", "Speaker 3"),
            ("Raj Mehta", "raj@fireflies.local", "Speaker 4"),
        ],
        "dialogue": [
            ("Jordan Lee", "Morning team, let's do a quick standup. Alex, want to start?"),
            ("Alex Park", "Sure. Yesterday I finished the transcript parser refactor and merged it."),
            ("Alex Park", "Today I'm picking up the search endpoint. No blockers right now."),
            ("Jordan Lee", "Nice. Is the parser change backward compatible?"),
            ("Alex Park", "Yes, existing uploads still work. I added tests for the VTT edge cases."),
            ("Sofia Russo", "On my side, I shipped the meetings dashboard skeleton yesterday."),
            ("Sofia Russo", "Today I'll wire up the loading skeletons and the empty state."),
            ("Sofia Russo", "I do have one blocker, I need the final list API response shape."),
            ("Alex Park", "I can send you that this morning. It's basically locked."),
            ("Jordan Lee", "Great, let's unblock Sofia first thing. Raj, how about you?"),
            ("Raj Mehta", "I've been on the CI pipeline. The flaky test issue should be fixed now."),
            ("Raj Mehta", "I'll monitor it today and confirm the failure rate drops."),
            ("Jordan Lee", "Thanks, the flakiness was slowing everyone down."),
            ("Raj Mehta", "Also, I want to upgrade our Postgres version next sprint, heads up."),
            ("Jordan Lee", "Let's discuss that in planning. Any risk to current work?"),
            ("Raj Mehta", "Minimal, but I'll write a migration plan to be safe."),
            ("Sofia Russo", "Quick question, are we supporting dark mode in version one?"),
            ("Jordan Lee", "It's a stretch goal. Get the core flows solid first."),
            ("Alex Park", "Agreed, dark mode can be a fast follow."),
            ("Jordan Lee", "Any cross-team dependencies I should know about?"),
            ("Sofia Russo", "Design owes us the final notepad layout, I'll ping Priya."),
            ("Alex Park", "And I'm waiting on the summarizer interface from the services team."),
            ("Jordan Lee", "I'll chase both today so we're not blocked tomorrow."),
            ("Raj Mehta", "One more, staging was down briefly last night, now resolved."),
            ("Jordan Lee", "Thanks for handling that. Let's keep an eye on it."),
            ("Alex Park", "Should we add an alert for staging downtime?"),
            ("Raj Mehta", "Good idea, I'll set up a basic uptime alert this week."),
            ("Jordan Lee", "Perfect. Anything else? No? Great, short and sweet today."),
            ("Jordan Lee", "Reminder: sprint planning is tomorrow at ten. Come with estimates."),
            ("Sofia Russo", "Will do. Thanks everyone."),
        ],
        "keywords": ["Standup", "Parser", "Search", "CI", "Migration", "Blockers"],
        "overview": (
            "A fast weekly standup. The transcript parser refactor merged with new VTT tests, the "
            "dashboard skeleton shipped (blocked only on the final list API shape), and CI "
            "flakiness appears resolved with monitoring underway. The team deferred dark mode to a "
            "fast follow, flagged a Postgres upgrade for next sprint, and assigned follow-ups on "
            "unblocking frontend and adding staging uptime alerts."
        ),
        "chapters": [
            {"title": "Backend & search", "seg": 1, "bullets": [
                "Parser refactor merged, backward compatible", "VTT edge cases covered by tests",
                "Search endpoint started, no blockers"]},
            {"title": "Frontend progress & blocker", "seg": 5, "bullets": [
                "Dashboard skeleton shipped", "Loading skeletons and empty state next",
                "Blocked on final list API response shape"]},
            {"title": "Platform & CI", "seg": 10, "bullets": [
                "Flaky test fix in monitoring", "Postgres upgrade proposed for next sprint",
                "Staging downtime resolved overnight"]},
        ],
        "action_items": [
            {"text": "Send Sofia the final meetings list API response shape", "assignee": "Alex Park", "seg": 8, "completed": True},
            {"text": "Confirm the CI failure rate drops after the flaky-test fix", "assignee": "Raj Mehta", "seg": 11, "completed": False},
            {"text": "Write a Postgres migration plan", "assignee": "Raj Mehta", "seg": 15, "completed": False},
            {"text": "Set up a staging uptime alert", "assignee": "Raj Mehta", "seg": 26, "completed": False},
        ],
    },
    {
        "title": "Design Review — Mobile Onboarding",
        "description": "Review of the streamlined mobile onboarding flow, backed by usability research.",
        "days_ago": 6,
        "span_ms": 540_000,
        "participants": [
            ("Priya Patel", "priya@fireflies.local", "Speaker 1"),
            ("Sarah Chen", "sarah@fireflies.local", "Speaker 2"),
            ("Chris Nolan", "chris@fireflies.local", "Speaker 3"),
            ("Nina Berg", "nina@fireflies.local", "Speaker 4"),
        ],
        "dialogue": [
            ("Priya Patel", "Welcome to the mobile onboarding design review. Chris will walk us through the flow."),
            ("Chris Nolan", "Thanks. The goal was to cut onboarding from seven steps down to four."),
            ("Chris Nolan", "Here's the new first screen, a single value prop and one primary action."),
            ("Sarah Chen", "I love how clean that is. The old screen had way too much text."),
            ("Nina Berg", "Our research backed this up. Users dropped off when we asked for too much upfront."),
            ("Chris Nolan", "Exactly. So we defer account details until after the first success moment."),
            ("Sarah Chen", "What's the first success moment in this flow?"),
            ("Chris Nolan", "Creating their first meeting summary. They see value before signing up fully."),
            ("Nina Berg", "In testing, that reordering improved completion by about eighteen percent."),
            ("Priya Patel", "That's a strong result. Chris, walk us through the permissions screen."),
            ("Chris Nolan", "We ask for microphone access only when it's actually needed, with context."),
            ("Sarah Chen", "Good. Just-in-time permissions always convert better than upfront walls."),
            ("Nina Berg", "One concern from testing, the permission copy confused a few users."),
            ("Chris Nolan", "I can revise that copy to be more concrete about why we need access."),
            ("Priya Patel", "Please do. Clarity there directly affects our activation numbers."),
            ("Sarah Chen", "How does this flow handle users who deny the permission?"),
            ("Chris Nolan", "There's a graceful fallback, they can upload a transcript instead."),
            ("Nina Berg", "Nice, that matches what power users told us they wanted anyway."),
            ("Priya Patel", "Let's talk visual consistency. The buttons differ slightly across screens."),
            ("Chris Nolan", "Good catch. I'll align everything to the design system components."),
            ("Sarah Chen", "What about accessibility, contrast and tap targets?"),
            ("Chris Nolan", "Tap targets are all at least forty-four points. I'll double-check contrast ratios."),
            ("Nina Berg", "I'd suggest one more round of testing on the revised permission copy."),
            ("Priya Patel", "Agreed. Nina, can you schedule five usability sessions next week?"),
            ("Nina Berg", "Yes, I'll recruit participants and run sessions by Thursday."),
            ("Sarah Chen", "When can engineering start building this?"),
            ("Priya Patel", "Once the copy and visual fixes land, probably early next week."),
            ("Chris Nolan", "I'll have the updated mockups and specs ready by Monday."),
            ("Sarah Chen", "Excellent work, Chris. This is a big improvement."),
            ("Priya Patel", "Agreed. Thanks everyone, let's reconvene after the next test round."),
        ],
        "keywords": ["Onboarding", "Mobile", "Permissions", "Accessibility", "Usability", "Activation"],
        "overview": (
            "A design review of the streamlined mobile onboarding, cut from seven steps to four by "
            "deferring account details until after the first success moment — a change research "
            "shows improved completion ~18%. The team aligned on just-in-time microphone "
            "permissions with a transcript-upload fallback, and queued revisions to permission "
            "copy, visual consistency, and accessibility before another usability round and handoff."
        ),
        "chapters": [
            {"title": "Streamlined flow", "seg": 1, "bullets": [
                "Seven steps reduced to four", "Account details deferred past first success",
                "~18% completion lift in testing"]},
            {"title": "Permissions & fallback", "seg": 10, "bullets": [
                "Just-in-time microphone permission", "Confusing copy to be revised",
                "Graceful transcript-upload fallback on deny"]},
            {"title": "Polish & next steps", "seg": 18, "bullets": [
                "Align buttons to the design system", "Verify contrast and 44pt tap targets",
                "Another usability round before handoff"]},
        ],
        "action_items": [
            {"text": "Revise the microphone permission copy to be more concrete", "assignee": "Chris Nolan", "seg": 13, "completed": False},
            {"text": "Align buttons to the design system components", "assignee": "Chris Nolan", "seg": 19, "completed": False},
            {"text": "Schedule and run five usability sessions by Thursday", "assignee": "Nina Berg", "seg": 24, "completed": False},
            {"text": "Deliver updated mockups and specs by Monday", "assignee": "Chris Nolan", "seg": 27, "completed": False},
        ],
    },
    {
        "title": "Customer Success QBR — Globex",
        "description": "Quarterly business review with Globex: adoption, friction, renewal, and expansion.",
        "days_ago": 9,
        "span_ms": 585_000,
        "participants": [
            ("Elena Vasquez", "elena@fireflies.local", "Speaker 1"),
            ("Tom Reyes", "tom@fireflies.local", "Speaker 2"),
            ("Karen Wright", "karen@globex.example", "Speaker 3"),
            ("Phil Adams", "phil@globex.example", "Speaker 4"),
        ],
        "dialogue": [
            ("Elena Vasquez", "Welcome to the quarterly business review, Karen, Phil. Let's look at the last quarter."),
            ("Elena Vasquez", "Overall adoption is up, monthly active users grew from a hundred and twenty to a hundred and eighty."),
            ("Karen Wright", "That matches what we're seeing internally. The team has really embraced it."),
            ("Tom Reyes", "That's a fifty percent increase. Congratulations, that's a strong quarter."),
            ("Phil Adams", "The integration with our CRM has been stable since the last update."),
            ("Elena Vasquez", "Glad to hear it. Any friction points we should address?"),
            ("Karen Wright", "Reporting is the main one. Building custom reports still feels clunky."),
            ("Phil Adams", "And exporting large datasets occasionally times out."),
            ("Elena Vasquez", "Thank you, that's useful. Let me note the export timeout as a priority."),
            ("Tom Reyes", "We actually have a performance fix for exports shipping next month."),
            ("Phil Adams", "That's great news. Will it require any changes on our side?"),
            ("Tom Reyes", "No, it's server-side. You'll just notice exports getting faster."),
            ("Karen Wright", "What about the custom report builder? That's a bigger ask."),
            ("Elena Vasquez", "It's on the roadmap for next quarter. I'll share the timeline after this."),
            ("Karen Wright", "Appreciated. My team would love to beta test it when it's ready."),
            ("Elena Vasquez", "I'll add Globex to the beta list for the report builder."),
            ("Tom Reyes", "Let's talk about your renewal, which is coming up in ninety days."),
            ("Karen Wright", "Yes, we're happy overall. The value has been clear this year."),
            ("Tom Reyes", "Wonderful. I'll prepare a renewal proposal with your usage trends."),
            ("Karen Wright", "We're also considering adding seats for the analytics team."),
            ("Elena Vasquez", "That's exciting. How many additional seats are you thinking?"),
            ("Karen Wright", "Probably ten to fifteen, depending on budget approval."),
            ("Tom Reyes", "I'll include a volume option for the extra seats in the proposal."),
            ("Phil Adams", "One more request, can we get training for the new team members?"),
            ("Elena Vasquez", "Absolutely. I'll schedule an onboarding training session for your new users."),
            ("Karen Wright", "Perfect. That would smooth the expansion a lot."),
            ("Elena Vasquez", "Let's also set quarterly goals. What's the top priority for next quarter?"),
            ("Karen Wright", "Getting the analytics team fully ramped and using custom reports."),
            ("Elena Vasquez", "Great, we'll align our support around that goal."),
            ("Tom Reyes", "I'll follow up with the renewal proposal and seat options by next week."),
            ("Karen Wright", "Thank you both. This has been a productive review."),
            ("Elena Vasquez", "Thank you, Karen and Phil. We're thrilled with Globex's progress."),
        ],
        "keywords": ["Adoption", "Renewal", "Reporting", "Exports", "Expansion", "Training"],
        "overview": (
            "A QBR with Globex showing strong momentum — monthly active users up 50% (120 to 180) "
            "and a stable CRM integration. Key friction was reporting: a clunky custom report "
            "builder (roadmapped next quarter, with Globex joining the beta) and export timeouts "
            "(a server-side fix ships next month). With renewal in 90 days, the customer is "
            "expanding by 10–15 analytics seats, prompting a renewal proposal and onboarding training."
        ),
        "chapters": [
            {"title": "Adoption & health", "seg": 1, "bullets": [
                "MAU grew 120 to 180 (+50%)", "Strong internal embrace",
                "CRM integration stable"]},
            {"title": "Friction & fixes", "seg": 6, "bullets": [
                "Custom report builder feels clunky", "Export timeouts on large datasets",
                "Server-side export fix ships next month"]},
            {"title": "Renewal & expansion", "seg": 16, "bullets": [
                "Renewal due in 90 days", "Adding 10–15 analytics seats",
                "Onboarding training for new users"]},
        ],
        "action_items": [
            {"text": "Share the custom report builder roadmap timeline", "assignee": "Elena Vasquez", "seg": 13, "completed": True},
            {"text": "Add Globex to the report builder beta list", "assignee": "Elena Vasquez", "seg": 15, "completed": False},
            {"text": "Prepare a renewal proposal with usage trends and seat options", "assignee": "Tom Reyes", "seg": 18, "completed": False},
            {"text": "Schedule onboarding training for new Globex users", "assignee": "Elena Vasquez", "seg": 24, "completed": False},
            {"text": "Follow up with the renewal proposal and seat options next week", "assignee": "Tom Reyes", "seg": 29, "completed": False},
        ],
    },
]


# --------------------------------------------------------------------------- #
# Build helpers
# --------------------------------------------------------------------------- #
def _segment_starts(dialogue: list[tuple[str, str]], span_ms: int) -> list[int]:
    """Distribute lines across `span_ms` weighted by word count.

    Returns one start_ms per line, strictly increasing and all < span_ms.
    """
    weights = [max(1500, len(text.split()) * _MS_PER_WORD) for _, text in dialogue]
    total = sum(weights) or 1
    scale = span_ms / total
    starts: list[int] = []
    clock = 0
    for w in weights:
        starts.append(clock)
        clock += max(1, int(w * scale))
    return starts


def _build_meeting(db, spec: dict, organizer: User, now: datetime) -> Meeting:
    dialogue = spec["dialogue"]
    starts = _segment_starts(dialogue, spec["span_ms"])
    ends = [starts[i + 1] for i in range(len(starts) - 1)] + [spec["span_ms"]]

    meeting = Meeting(
        title=spec["title"],
        description=spec["description"],
        date=now - timedelta(days=spec["days_ago"]),
        duration_seconds=ends[-1] // 1000,
        audio_url=AUDIO_URL,
        language="en",
        organizer_id=organizer.id,
    )
    for name, email, label in spec["participants"]:
        meeting.participants.append(
            Participant(name=name, email=email, speaker_label=label)
        )
    for i, (speaker, text) in enumerate(dialogue):
        meeting.segments.append(
            TranscriptSegment(
                speaker=speaker, start_ms=starts[i], end_ms=ends[i], text=text, idx=i
            )
        )

    summary = Summary(overview=spec["overview"], generated_by="seed")
    for ci, ch in enumerate(spec["chapters"]):
        summary.chapters.append(
            SummaryChapter(
                title=ch["title"],
                bullets_json=json.dumps(ch["bullets"]),
                start_ms=starts[ch["seg"]],
                idx=ci,
            )
        )
    meeting.summary = summary

    for term in spec["keywords"]:
        meeting.keywords.append(Keyword(term=term))
    for ai in spec["action_items"]:
        meeting.action_items.append(
            ActionItem(
                text=ai["text"],
                assignee=ai["assignee"],
                start_ms=starts[ai["seg"]],
                completed=ai["completed"],
            )
        )

    db.add(meeting)
    return meeting


def _wipe(db) -> None:
    """Delete everything in child-before-parent order (idempotent reseed)."""
    for model in (
        ActionItem,
        Keyword,
        SummaryChapter,
        Summary,
        TranscriptSegment,
        Participant,
        Meeting,
        User,
    ):
        db.query(model).delete()
    db.commit()


def run() -> None:
    # Ensure tables exist even on a fresh DB (e.g. seeding on deploy boot).
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        _wipe(db)
        organizer = User(name="Demo User", email="demo@fireflies.local")
        db.add(organizer)
        db.flush()

        now = datetime.now(timezone.utc)
        for spec in MEETINGS:
            meeting = _build_meeting(db, spec, organizer, now)
            assert max(s.start_ms for s in meeting.segments) < AUDIO_MS, (
                f"{spec['title']}: a segment start exceeds sample audio duration"
            )
        db.commit()

        print(f"Seeded {len(MEETINGS)} meetings:")
        for spec in MEETINGS:
            print(
                f"  - {spec['title']}  "
                f"({len(spec['dialogue'])} segments, span {spec['span_ms'] // 1000}s, "
                f"{len(spec['action_items'])} action items)"
            )
    finally:
        db.close()


if __name__ == "__main__":
    run()
