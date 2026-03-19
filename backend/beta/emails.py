APP_URL = "https://munchnow.vercel.app"
FEEDBACK_URL = "https://forms.gle/aC3rm4aqNSk9YFNe9"

ACCEPTANCE_SUBJECT = "You're in - Welcome to the MunchNow Beta!"


def _escape_html(value: str | None) -> str:
    text = (value or "there").strip()
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )


def _button(href: str, label: str, secondary: bool = False) -> str:
    background = "#161616" if secondary else "#6B7FFF"
    border = "#2b2b2b" if secondary else "#6B7FFF"
    text_color = "#ffffff"
    return (
        f'<a href="{href}" '
        f'style="display:inline-block;padding:14px 18px;border-radius:12px;'
        f'border:1px solid {border};background:{background};color:{text_color};'
        f'font-size:15px;font-weight:700;text-decoration:none;">{label}</a>'
    )


def _button_row() -> str:
    return f"""
        <div style="margin:0 0 24px 0;">
          {_button(APP_URL, "Open MunchNow")}
          <span style="display:inline-block;width:10px;height:10px;"></span>
          {_button(FEEDBACK_URL, "Share Feedback", secondary=True)}
        </div>
    """


def _section(label: str, body_html: str) -> str:
    return f"""
        <div style="margin:0 0 22px 0;padding:18px;border:1px solid #242424;border-radius:14px;background:#101010;">
          <p style="margin:0 0 10px 0;color:#6B7FFF;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">{label}</p>
          {body_html}
        </div>
    """


def _render_email_html(title: str, intro: str, body_html: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#0f0f0f;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="margin:0 auto;max-width:640px;padding:32px 20px;">
      <div style="border:1px solid #242424;border-radius:18px;background-color:#141414;padding:32px 24px;">
        <p style="margin:0 0 12px 0;color:#6B7FFF;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">MunchNow</p>
        <h1 style="margin:0 0 14px 0;font-size:30px;line-height:1.15;color:#ffffff;">{title}</h1>
        <p style="margin:0 0 22px 0;font-size:16px;line-height:1.7;color:#f5f5f5;">{intro}</p>
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
    intro = (
        f"Hi {safe_name}, welcome to the MunchNow beta - and thanks for joining early."
    )
    body_html = f"""
        {_button_row()}
        {_section(
            "What MunchNow Is For",
            """
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">
            Sometimes you're hungry, but figuring out what to eat takes way longer than it should. Too many options, too much scrolling, too much back and forth.
          </p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#f5f5f5;">
            MunchNow is meant to make that easier by helping you decide where to eat faster.
          </p>
            """,
        )}
        {_section(
            "How To Use It",
            """
          <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">1. Open MunchNow when you're deciding where to eat.</p>
          <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">2. Browse the places shown.</p>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">3. Vote honestly using Worth it / Mid / Skip.</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#f5f5f5;">
            The best way to test MunchNow is to use it in real decision moments: when you're choosing lunch or dinner, with friends, between classes, or just tired of the same options.
          </p>
            """,
        )}
        {_section(
            "Add To Home Screen",
            """
          <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">If you use an iPhone, open MunchNow in Safari and:</p>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">1. Tap Share</p>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">2. Tap Add to Home Screen</p>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">3. Rename it to MunchNow if needed</p>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">4. Tap Add</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#f5f5f5;">
            That makes it much easier to reopen quickly when you're actually hungry.
          </p>
            """,
        )}
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">
          We'll check in again around Day 3, Day 7, and Day 30. You can also share feedback anytime through the feedback form.
        </p>
        {_button_row()}
        <p style="margin:0;font-size:15px;line-height:1.7;color:#f5f5f5;">
          Thanks again for helping shape MunchNow early.
        </p>
    """
    return {
        "subject": ACCEPTANCE_SUBJECT,
        "html": _render_email_html(
            "Welcome to the MunchNow beta",
            intro,
            body_html,
        ),
    }


def feedback_email(name: str, stage: str) -> dict:
    safe_name = _escape_html(name)
    stage_map = {
        "day3": {
            "subject": "3 days in - how's MunchNow feeling?",
            "title": "First impressions",
            "intro": f"Hi {safe_name}, you've had a few days with MunchNow now, so we wanted to check in.",
            "body": """
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">
                  At this stage, we're mostly looking for first impressions - what feels useful, what feels confusing, and whether the app makes sense in real food decision moments.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#f5f5f5;">
                  We'd especially love to know what your favorite part has been so far, what feels confusing or broken, and what would make you want to use it again.
                </p>
            """,
        },
        "day7": {
            "subject": "One week with MunchNow - tell us everything",
            "title": "One week in",
            "intro": f"Hi {safe_name}, you've had about a week with MunchNow now, which means your feedback is a lot more valuable at this point.",
            "body": """
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">
                  We'd love to know how it's holding up in real situations - whether it actually helps when you're deciding where to eat, what feels strong, and what still needs work.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#f5f5f5;">
                  At this stage, we'd especially love to hear what feels genuinely useful, what feels weak or awkward, what would make you use MunchNow more often, and whether you'd recommend it to a friend.
                </p>
            """,
        },
        "day30": {
            "subject": "30 days of MunchNow - your feedback matters most now",
            "title": "Most important check-in",
            "intro": f"Hi {safe_name}, you've had the fullest view of MunchNow now, so this is our most important check-in.",
            "body": """
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#f5f5f5;">
                  At this point, your feedback helps us understand what should stay, what should improve, and what needs to change if MunchNow is going to become something people keep coming back to.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#f5f5f5;">
                  We'd especially love to know what has been most useful, what has not been working well, what would make this something you'd keep using, and whether you'd tell a friend to try it.
                </p>
            """,
        },
    }
    if stage not in stage_map:
        raise ValueError(f"Unsupported feedback stage: {stage}")

    content = stage_map[stage]
    body_html = f"""
        {_button_row()}
        {_section("Check-In", content["body"])}
        <p style="margin:0;font-size:15px;line-height:1.7;color:#f5f5f5;">
          Thanks again for helping us build this in a better direction.
        </p>
    """
    return {
        "subject": content["subject"],
        "html": _render_email_html(content["title"], content["intro"], body_html),
    }
