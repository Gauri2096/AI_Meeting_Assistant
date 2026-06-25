from app.core.database import SessionLocal
from app.models.meeting import Meeting
from app.models.user import User


def backfill_meeting_owners():
    db = SessionLocal()

    try:
        meetings = db.query(Meeting).all()

        updated_count = 0
        skipped_count = 0

        for meeting in meetings:

            # Skip already populated records
            if meeting.created_by_user_id:
                continue

            if not meeting.organiser_email:
                skipped_count += 1
                continue

            user = (
                db.query(User)
                .filter(
                    User.email == meeting.organiser_email
                )
                .first()
            )

            if not user:
                print(
                    f"Skipping meeting {meeting.id} "
                    f"(no user found for {meeting.organiser_email})"
                )
                skipped_count += 1
                continue

            meeting.created_by_user_id = user.id
            updated_count += 1

        db.commit()

        print("\nBackfill Complete")
        print(f"Updated: {updated_count}")
        print(f"Skipped: {skipped_count}")

    except Exception as e:
        db.rollback()
        raise e

    finally:
        db.close()


if __name__ == "__main__":
    backfill_meeting_owners()