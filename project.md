Project Clawppy: AI WhatsApp Tutor for Indian Students
1. Project Overview
1.1 What is Clawppy?

Clawppy is an AI-powered teaching assistant that lives inside WhatsApp. It helps Indian students (Grades 9–12, NEET) learn actively, not just get answers. It detects what a student truly understands, identifies false confidence, and uses the Feynman technique to lock in learning.
1.2 Why WhatsApp?

    500M+ Indians use WhatsApp

    Zero app install friction

    Students already live there

    Internet is cheap, phones are basic

1.3 Core Philosophy

No answer-first, ever.
Clawppy teaches through:

    Socratic questioning

    Confidence calibration

    Spaced repetition

    Feynman explanations

2. Product Goals
2.1 Primary Goals

    Students cannot bypass learning to get answers

    Knowledge map is accurate and useful

    Students return daily (streak lock-in)

    Monetization feels valuable, not forced

2.2 Success Metrics
Metric	Target
Daily Active Users	>60% of signups
Questions answered per user/day	>15
Feynman challenge completion rate	>70%
False confidence detection accuracy	>80%
Free → Pro conversion	>5%
3. Technical Architecture
3.1 Stack Overview
Layer	Technology	Why
Messaging	Twilio WhatsApp API	Official, legal, reliable
Backend	Cloudflare Workers	Free tier, serverless, auto-scaling
Database	Cloudflare KV	Key-value storage for user state
AI / LLM	Google Gemini API (or Claude)	High reasoning, good Hindi/English mix
Payments	Razorpay / Cashfree UPI	Indian-friendly, easy webhooks
3.2 Data Flow
text

Student → WhatsApp → Twilio Webhook → Cloudflare Worker
                                              ↓
                                      Cloudflare KV
                                      (user state, knowledge map)
                                              ↓
                                      Gemini API
                                      (teaching, evaluation)
                                              ↓
                                      Twilio → WhatsApp → Student

3.3 Hosting & Costs
Service	Free Tier	Paid Tier (Scale)
Cloudflare Workers	100k requests/day	$5/month for 10M
Twilio WhatsApp	₹0.15/message	Same rate
Gemini API	60 req/min free	₹0.05/1k tokens
Cloudflare KV	1GB free	$0.50/GB

Estimated cost for first 1,000 users: ~₹2,000/month
4. Feature Breakdown
4.1 Core Teaching Features
4.1.1 Socratic Questioning (No Direct Answers)

What it does:
When a student asks a question, Clawppy never answers directly. Instead, it asks:

    What do you already know about this?

    Where are you stuck exactly?

    Try explaining your current understanding first.

How it works:

    Detect intent (question vs command vs casual)

    If question → trigger Socratic flow

    Store user's attempt before revealing explanation

Why it matters:
Students cannot copy-paste answers. They must engage.
4.1.2 Confidence Calibration

What it does:
After teaching a small concept, Clawppy asks:
"Rate your understanding from 1–10."

Then immediately gives a 3-question quiz.

Detection logic:

    High self-rating (7+) + low score (<50%) = False Confidence (critical)

    Low self-rating (≤3) + high score (>70%) = Underconfident Mastery

Why it matters:
Most students don't know what they don't know. Clawppy finds the gaps for them.
4.1.3 Knowledge Map (Text-Based)

What it does:
A simple text dashboard showing:

    ✅ Mastered topics (score >85%)

    🟡 In progress (score 50–84%)

    🔴 Needs attention (score <50%)

    🎭 False confidence detected

How it's stored:
Cloudflare KV stores for each user:
json

{
  "topic_name": {
    "status": "struggling | mastered | unconscious_incompetence",
    "confidence": 0.85,
    "actualScore": 45,
    "lastReviewed": "timestamp",
    "nextReview": "timestamp"
  }
}

Why it matters:
Students see exactly what to fix. False confidence section creates urgency.
4.1.4 Spaced Repetition Reviews

What it does:
When a student opens Clawppy, it first checks if any topic is due for review (based on last review date and mastery score).

Review schedule:
Mastery Score	Next Review
>85%	7 days
60–85%	3 days
<60%	1 day
False confidence	Immediately

Why it matters:
Learning sticks. Students don't forget.
4.1.5 Feynman Technique Evaluation

What it does:
After a student learns a concept, Clawppy says:
"Explain this to me like I'm 10 years old."

The AI evaluates:

    Is it simple? (no jargon)

    Are core concepts present?

    Are there major errors?

Evaluation result:

    Pass (score >70%) → Mark topic as assessed, update knowledge map

    Fail → Show missing concepts, ask to retry

Why it matters:
This is the highest-leverage learning activity. Students who complete Feynman challenges retain 90% more.
4.2 Engagement Features
4.2.1 Daily Streak System

What it does:
Tracks consecutive days a student interacts with Clawppy.

Free tier: Streak resets if a day is missed
Pro tier: Streak never resets + streak freeze tokens

Why it matters:
Psychological lock-in. Students fear losing streaks more than they value money.
4.2.2 Interactive Buttons

Where to use:

    Daily review reminders (Reply buttons: "Start review" / "Later")

    Topic selection (List messages)

    Payment prompts (CTA buttons)

Limit: Max 3 buttons per message (Twilio limit)

Why it matters:
Buttons increase response rates by 2–3x.
4.2.3 Commands
Command	Function
/map	Show knowledge map
/streak	Show current streak
/review [topic]	Force review a topic
/practice [subject]	Generate practice questions
/reset	Reset knowledge map (rare)
4.3 Monetization Features
4.3.1 Freemium Model
Plan	Price	Features
Free	₹0	10 questions/day, basic map, streak resets
Pro	₹49/month	Unlimited questions, false confidence detection, streak protection, PDF export, priority Feynman evaluation
4.3.2 Exam Packs (One-time)
Pack	Price	Content
JEE Calculus	₹99	500 curated problems with solutions
NEET Biology	₹99	Past year analysis + practice
UPSC Ethics	₹99	Case studies + model answers

How to create: Generate question banks using Gemini + official syllabus. One-time effort, infinite sales.
4.3.3 Parent Dashboard (B2B)
Plan	Price	Features
Parent	₹299/month	Weekly progress reports for 2 students, "Your child struggled with X this week", recommended practice

Why this works: Parents have budgets. Schools have budgets. Students don't.
4.3.4 Payment Flow

    Student types /upgrade

    Clawppy sends Razorpay payment link

    Student pays via UPI

    Webhook updates user status in Cloudflare KV

    Clawppy confirms: "Pro activated! 🎉"

5. User Flows
5.1 First-Time User Flow
text

Student sends "Hi" 
    ↓
Clawppy: "Welcome to Clawppy! I teach via WhatsApp. No direct answers—you'll learn actively. Type /map to start."
    ↓
Student: /map
    ↓
Clawppy: "Your map is empty. Let's fix that. What subject do you want to study first?"
    ↓
Student: "Physics - Newton's Laws"
    ↓
Clawppy: "Great. Before I teach you, tell me: What do you already know about Newton's Laws?"

5.2 Daily Review Flow
text

Student sends any message
    ↓
Clawppy checks due reviews
    ↓
If due review exists:
    "⏰ Review time: Quadratic Equations. You scored 65% last time. Quick question: [question]"
    ↓
Student answers
    ↓
Clawppy evaluates → updates mastery → schedules next review
    ↓
If no due review:
    "No reviews due. Want to learn something new or practice?"

5.3 False Confidence Detection Flow
text

Student asks about Thermodynamics
    ↓
Clawppy checks map: status = "unconscious_incompetence"
    ↓
"⚠️ You previously rated yourself 8/10 but scored 45%. Let's verify first."
    ↓
Quick 2-question check
    ↓
If fails: "You have gaps. Let me explain from basics."
    ↓
After teaching: Feynman challenge

5.4 Payment Flow
text

Student: /upgrade
    ↓
Clawppy: "Pro is ₹49/month. Unlimited reviews, false confidence detection, streak protection. Send 'YES' to get payment link."
    ↓
Student: "YES"
    ↓
Clawppy sends Razorpay link
    ↓
Student pays → webhook → KV updated
    ↓
Clawppy: "✅ Pro activated! Your streak is now protected."

6. Development Roadmap
Phase 1: Foundation (Week 1)

Goal: Working bot that can answer (with Socratic method)

    Set up Twilio WhatsApp Business number

    Create Cloudflare Worker project

    Implement basic webhook receiver

    Connect Gemini API

    Build simple Socratic flow (no direct answers)

    Deploy and test with 5 friends

Success criteria: Bot responds, doesn't give direct answers
Phase 2: Knowledge Engine (Week 2)

Goal: Knowledge map + confidence calibration

    Set up Cloudflare KV

    Design knowledge map data structure

    Implement confidence calibration (self-rating → quiz)

    Build false confidence detection logic

    Create /map command (text-based dashboard)

    Store all user interactions in KV

Success criteria: Knowledge map updates correctly after teaching
Phase 3: Learning Systems (Week 3)

Goal: Spaced repetition + Feynman evaluation

    Implement spaced repetition scheduler

    Build due review check on every message

    Create Feynman challenge prompt

    Integrate Gemini for Feynman evaluation (scoring + feedback)

    Update knowledge map after Feynman pass/fail

    Add review command: /review [topic]

Success criteria: Student can complete full teach → review → Feynman cycle
Phase 4: Engagement (Week 4)

Goal: Streaks + interactive buttons

    Implement streak tracking (daily resets at midnight IST)

    Add streak display in /map and /streak

    Implement interactive reply buttons (Twilio)

    Add list messages for topic selection

    Build reminder system (optional: scheduled messages)

Success criteria: Streak survives 7 days of testing
Phase 5: Monetization (Week 5)

Goal: Payments + Pro features

    Set up Razorpay account and API keys

    Create payment link generation in Worker

    Build webhook handler for payment confirmation

    Implement Pro feature flags (unlimited, streak protection)

    Create exam packs (generate using Gemini)

    Add /upgrade command and payment flow

Success criteria: User can pay and instantly get Pro access
Phase 6: Polish & Launch (Week 6)

Goal: Production-ready

    Add rate limiting (prevent abuse)

    Add input sanitization (prevent prompt injection)

    Add Hindi/English mixed language support

    Write user documentation (simple PDF)

    Create landing page (optional but recommended)

    Launch to 100 beta users (school WhatsApp groups)

Success criteria: 100 users, <5% error rate, positive feedback
7. Risks & Mitigation
Risk	Probability	Impact	Mitigation
Twilio bans number	Low	High	Use official WhatsApp Business API, follow rate limits, no spam
Gemini costs spike	Medium	Medium	Set hard token limits per request, daily caps per user
Students hate Socratic method	Medium	High	Add optional "Explain directly" button for Pro users only
False confidence detection fails	Medium	High	Test with real students, refine prompts, add manual override
Serverless cold starts	Low	Low	Cloudflare Workers are fast (~5ms)
Payment webhook fails	Low	Medium	Implement retry logic + manual fallback (/verify-payment)
8. Launch Strategy
8.1 Beta Launch (100 users)

    Reach out to 5 local tuition teachers

    Offer free Pro access for 1 month to their students

    Collect feedback on teaching flow

    Fix false confidence detection accuracy

8.2 Public Launch

    WhatsApp groups for JEE/NEET (ask admins for permission)

    Instagram Reel: "This bot won't give you answers. And that's why it works."

    Referral system: Invite 3 friends → 1 week free Pro

8.3 Pricing (Final)
Plan	Price	Target
Free	₹0	All users
Pro Monthly	₹49	Serious students
Pro Yearly	₹499 (save 15%)	Committed learners
Exam Pack	₹99 one-time	Specific exam prep
Parent	₹299/month	Parents of 2 students
9. Success Checklist (Before Launch)

    Bot responds under 3 seconds

    No direct answers in free tier

    Knowledge map updates correctly

    False confidence detection works on test data

    Streak survives 7 days

    Feynman evaluation gives useful feedback

    Payment flow works end-to-end (₹1 test transaction)

    Rate limiting prevents abuse

    Hindi + English mixed language works

    10 beta users used it for 5 days

10. Future Features (V2)

    Voice notes support (student sends audio explanation)

    Group mode (teacher + students in one group)

    NCERT PDF ingestion (upload textbook, bot teaches from it)

    Mock tests with timed conditions

    Leaderboard (anonymous, by streaks)

    WhatsApp Channels integration for daily tips
