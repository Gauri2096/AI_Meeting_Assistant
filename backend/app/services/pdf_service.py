from alembic import autogenerate
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
)
from datetime import datetime
import re

PDF_DIR = Path("generated_reports_pdf")
PDF_DIR.mkdir(exist_ok=True)


def _section_title(text: str) -> Paragraph:
    return Paragraph(
        text,
        ParagraphStyle(
            name="SectionHeading",
            fontName="Times-Bold",
            fontSize=14,
            spaceAfter=10,
            spaceBefore=14,
        ),
    )


def _body(text: str) -> Paragraph:
    return Paragraph(
        text,
        ParagraphStyle(
            name="Body",
            fontName="Times-Roman",
            fontSize=11,
            leading=18,
        ),
    )


def _bullet_list(items: list[str]):
    elements = []

    if not items:
        elements.append(_body("None"))
        return elements

    for item in items:
        elements.append(
            Paragraph(
                f"• {item}",
                ParagraphStyle(
                    name="Bullet",
                    fontName="Times-Roman",
                    fontSize=11,
                    leftIndent=20,
                    leading=18,
                ),
            )
        )

    return elements


def generate_meeting_pdf(
    meeting,
    intelligence,
) -> str:
    """
    Creates a PDF from approved meeting intelligence.

    Returns:
        generated_pdfs/{meeting_id}.pdf
    """

    print(f"[PDF SERVICE] Starting PDF generation for meeting ID: {getattr(meeting, 'id', 'N/A')}, Title: '{meeting.title}'")

    safe_title = re.sub(
        r'[^a-zA-Z0-9_\- ]',
        '',
        meeting.title,
    ).strip()

    safe_title = safe_title.replace(" ", "_")

    meeting_date = (
        meeting.created_at.strftime("%Y-%m-%d")
        if meeting.created_at
        else datetime.utcnow().strftime("%Y-%m-%d")
    )

    filename = f"{safe_title}_{meeting_date}.pdf"

    pdf_path = PDF_DIR / filename
    print(f"[PDF SERVICE] Resolved target PDF filename: '{filename}' at path: '{pdf_path.resolve()}'")

    doc = SimpleDocTemplate(
        str(pdf_path),
        title=meeting.title,
    )

    elements = []

    print("[PDF SERVICE] Building PDF document elements hierarchy...")
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        name="Title",
        parent=styles["Title"],
        fontName="Times-Bold",
        fontSize=20,
    )

    print("[PDF SERVICE] Appending Title and Metadata header elements...")
    elements.append(
        Paragraph(
            "MeetIntel Report",
            title_style,
        )
    )

    elements.append(Spacer(1, 12))

    elements.append(
        _body(f"<b>Meeting Title:</b> {meeting.title}")
    )

    elements.append(
        _body(
            f"<b>Organiser:</b> {meeting.organiser_email or 'N/A'}"
        )
    )

    elements.append(
        _body(
            f"<b>Duration:</b> {meeting.duration_seconds or 0} seconds"
        )
    )

    elements.append(
        _body(
            f"<b>Status:</b> Approved"
        )
    )

    elements.append(Spacer(1, 20))

    # SUMMARY
    print("[PDF SERVICE] Appending Executive Summary section...")
    elements.append(
        _section_title("Executive Summary")
    )

    elements.append(
        _body(
            intelligence.summary or "No summary available."
        )
    )

    # DECISIONS
    print(f"[PDF SERVICE] Appending Key Decisions section ({len(intelligence.decisions or [])} items)...")
    elements.append(
        _section_title("Key Decisions")
    )

    elements.extend(
        _bullet_list(
            intelligence.decisions or []
        )
    )

    # TOPICS
    topics = intelligence.topics_discussed or []
    print(f"[PDF SERVICE] Appending Topics Discussed section ({len(topics)} items)...")
    elements.append(
        _section_title("Topics Discussed")
    )

    if not topics:
        elements.append(_body("No topics discussed identified."))

    else:
        for idx, item in enumerate(topics, start=1):

            topic = item.get("topic", "Unknown")
            discussion = item.get("discussion", "")

            elements.append(
                _body(
                    f"""
                    <b>{idx}.</b>
                    {topic}<br/>
                    <b>Discussion:</b> {discussion}<br/>
                    """
                )
            )

    # RISKS
    print(f"[PDF SERVICE] Appending Risks & Concerns section ({len(intelligence.risks_and_concerns or [])} items)...")
    elements.append(
        _section_title("Risks & Concerns")
    )

    elements.extend(
        _bullet_list(
            intelligence.risks_and_concerns or []
        )
    )

    # ACTION ITEMS
    action_items = intelligence.action_items or []
    print(f"[PDF SERVICE] Appending Action Items section ({len(action_items)} items)...")
    elements.append(
        _section_title("Action Items")
    )

    if not action_items:
        elements.append(_body("No action items identified."))

    else:
        for idx, item in enumerate(action_items, start=1):

            owner = item.get("owner", "Unknown")
            task = item.get("description", "")
            due_date = item.get("due_date", "Not specified")

            elements.append(
                _body(
                    f"""
                    <b>{idx}.</b>
                    {task}<br/>
                    <b>Owner:</b> {owner}<br/>
                    <b>Due Date:</b> {due_date}
                    """
                )
            )

    # QUOTES
    quotes = intelligence.notable_quotes or []
    print(f"[PDF SERVICE] Appending Notable Quotes section ({len(quotes)} items)...")
    elements.append(
        _section_title("Notable Quotes")
    )

    if not quotes:
        elements.append(_body("No notable quotes identified."))

    else:
        for idx, item in enumerate(quotes, start=1):

            speaker = item.get("speaker", "Unknown")
            quote = item.get("quote", "")

            elements.append(
                _body(
                    f"""
                    <b>{idx}.</b>
                    "{quote}"<br/>
                    <b>Speaker:</b> {speaker}
                    """
                )
            )


    elements.append(Spacer(1, 30))

    elements.append(
        Paragraph(
            "Generated automatically by MeetIntel",
            ParagraphStyle(
                name="Footer",
                fontName="Times-Italic",
                fontSize=9,
                textColor=colors.grey,
            ),
        )
    )

    print(f"[PDF SERVICE] Invoking ReportLab SimpleDocTemplate.build() with {len(elements)} flowable elements...")
    try:
        doc.build(elements)
        print(f"[PDF SERVICE] PDF generation successful. Saved to: '{pdf_path.resolve()}'")
    except Exception as e:
        print(f"[PDF SERVICE] ERROR during ReportLab PDF build: {str(e)}")
        raise e

    return str(pdf_path)