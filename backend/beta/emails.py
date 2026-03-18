ACCEPTANCE_SUBJECT = "\U0001f389 You're in \u2014 Welcome to the MunchNow Beta!"


def _escape_html(value: str | None) -> str:
    text = (value or "there").strip()
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )


def _render_email_html(title: str, intro: str, body_html: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#0f0f0f;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="margin:0 auto;max-width:640px;padding:32px 20px;">
      <div style="border:1px solid #242424;border-radius:16px;background-color:#141414;padding:32px 24px;">
        <p style="margin:0 0 12px 0;color:#6B7FFF;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">MunchNow Beta</p>
        <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.2;color:#ffffff;">{title}</h1>
        <p style="margin:0 0 20px 0;font-size:16px;line-height:1.7;color:#f5f5f5;">{intro}</p>
        {body_html}
        <p style="margin:28px 0 0 0;font-size:15px;line-height:1.7;color:#f5f5f5;">
          The MunchNow Team
        </p>
      </div>
    </div>
  </body>
</html>
"""


def acceptance_email(name: str) -> dict:
    safe_name = _escape_html(name)
    intro = f"Hi {safe_name}, you're officially in the MunchNow beta."
    body_html = """
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">
          Over the next few weeks, use MunchNow when you're deciding where to eat, vote honestly using Worth it / Mid / Skip, and share any issues, bugs, or ideas you notice along the way.
        </p>
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">
          We'll check in again at Day 3, Day 7, and Day 30 to hear how things are going.
        </p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#f5f5f5;">
          You can reply directly to this email anytime with thoughts, rough feedback, or bug reports.
        </p>
    """
    return {
        "subject": ACCEPTANCE_SUBJECT,
        "html": _render_email_html("Welcome to the beta", intro, body_html),
    }


def feedback_email(name: str, stage: str) -> dict:
    safe_name = _escape_html(name)
    stage_map = {
        "day3": {
            "subject": "3 days in — how's MunchNow feeling?",
            "title": "Early impressions",
            "intro": f"Hi {safe_name}, you've had a few days with MunchNow and we'd love the first honest read on how it's feeling so far.",
        },
        "day7": {
            "subject": "One week with MunchNow — tell us everything",
            "title": "One week in",
            "intro": f"Hi {safe_name}, by now you've probably used MunchNow in a few real food decisions, so this is the right moment for blunt feedback.",
        },
        "day30": {
            "subject": "30 days of MunchNow — your feedback matters most now",
            "title": "30-day check-in",
            "intro": f"Hi {safe_name}, this is our most important beta check-in because long-term usage tells us what actually sticks and what still needs work.",
        },
    }
    if stage not in stage_map:
        raise ValueError(f"Unsupported feedback stage: {stage}")

    content = stage_map[stage]
    body_html = """
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">
          Just reply directly to this email. No survey, no form, just whatever's top of mind.
        </p>
        <div style="margin:0;padding:18px 18px 4px 18px;border:1px solid #242424;border-radius:12px;background-color:#101010;">
          <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#6B7FFF;font-weight:700;">A few things we'd love to hear:</p>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">1. What's your favorite thing about MunchNow so far?</p>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">2. What's confusing or broken?</p>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">3. What would make you use it more?</p>
          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">4. Would you tell a friend to try it?</p>
        </div>
    """
    return {
        "subject": content["subject"],
        "html": _render_email_html(content["title"], content["intro"], body_html),
    }

